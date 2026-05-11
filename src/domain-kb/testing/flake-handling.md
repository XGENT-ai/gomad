---
name: flake-handling
description: Diagnose, classify, and fix flaky tests in CI without masking real bugs.
license: MIT
last_reviewed: 2026-05-02
---

# Flaky Test Handling

**When to use:** A test fails intermittently in CI, you are tempted to add a `sleep()` or retry decorator as a quick fix, or you need to decide whether a failing test is genuinely flaky, outdated, or masking a real bug. Trigger phrases: "test is flaky", "passes locally fails in CI", "intermittent failure", "retry on failure", "add sleep to fix", "flakey test", "non-deterministic test", "CI green but fails sometimes".

## Classify before fixing

A test that fails intermittently is not automatically a flaky test. There are three distinct failure classes, each with a different fix:

| Class | Definition | Fix |
|---|---|---|
| Flaky | Test logic is correct; infra or timing is non-deterministic | Harden the assertion strategy (see below) |
| Outdated | Test was correct; behavior it tests has legitimately changed | Update the test to match new behavior |
| Bug | Test is exposing a real defect that surfaces inconsistently | Fix the product code |

**Always classify before touching the test.** Adding a retry loop to a bug class hides the defect.

## Retry policy

Allow exactly **one infrastructure retry** per test run. If the test fails on the retry, it is not flake — stop and diagnose.

- A test that passes on retry but failed initially: flag it as a flake candidate; do not count it as a clean pass.
- A test that fails on the first run and passes on every subsequent re-run in isolation: check for state pollution from a sibling test.
- Never configure per-test retry counts higher than 1. High retry counts mask systematic problems.

## Diagnostics to collect on failure

On a retry failure, collect all of these before investigating:

- Screenshots / DOM snapshot (UI tests).
- Network request log for the test duration.
- Application / service logs from the time window.
- Service health at time of failure (was the target reachable?).
- Timestamps: when the test started, when the assertion fired, when it timed out.

Without these, root-cause analysis is guesswork.

## What NOT to do

- **No arbitrary delays.** `sleep(500)` or `waitForTimeout(2000)` is never a fix; it is a symptom that the assertion strategy is wrong. See [test-fixture-patterns](test-fixture-patterns.md) for correct async handling.
- **No unbounded retry loops.** `while (!condition) { retry() }` turns a failing test into a hanging test.
- **Do not suppress flake in CI config.** Marking a test as `x-flaky: true` / `skip_if_flaky` without a tracking issue is not acceptable.
- **Do not add `--retries=3` globally.** Set it only at the infrastructure level (one retry) and never for individual tests.

## Hardening an actually-flaky test

Once classified as flaky (not outdated, not a bug):

1. Identify the non-determinism source: timing, shared state, external service, random data.
2. For timing issues: replace fixed waits with framework-native polling assertions.
3. For shared state: ensure the test does not depend on execution order; use factory fixtures.
4. For external service instability: consider whether this belongs at unit or integration level instead of e2e.
5. Re-run the test 10 times in isolation to confirm the fix before merging.

## When NOT to apply this process

- Don't apply the retry policy to unit tests. Unit tests must be deterministic; an intermittent unit test is always a bug in the test or the unit.
- Don't collect the full diagnostic suite for a test that has been consistently failing for weeks — that is a broken test, not flake.

## Common failure modes

| Symptom | Root cause | Misdiagnosis to avoid |
|---|---|---|
| Passes locally; fails in CI | Environment difference, not timing | Adding `sleep` to compensate |
| Passes on retry every time | State pollution from previous test | Marking as "acceptable flake" |
| Fails in a specific order only | Implicit ordering dependency between tests | Increasing retry count |
| Intermittent timeout on assertion | No backoff; races under load | Raising the fixed timeout value |
