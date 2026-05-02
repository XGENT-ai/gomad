---
name: ci-lanes
description: Design CI test lanes for fast PR feedback and full nightly coverage.
license: MIT
last_reviewed: 2026-05-02
---

**When to use:** Setting up a new CI pipeline, deciding which tests belong on the PR check vs. a nightly schedule, or diagnosing a CI suite that is too slow for PR feedback loops. Trigger phrases: "CI is too slow", "what to run on PR", "nightly test suite", "test pipeline design", "smoke tests", "full suite schedule", "PR feedback time", "CI pipeline setup".

## Two-lane model

All test suites should be organized into exactly two lanes:

| Lane | When it runs | Target duration | What it contains |
|---|---|---|---|
| PR smoke | Every push to a PR branch | Under 5 minutes | Unit tests + linting + type-check + critical integration contracts |
| Nightly full | Scheduled nightly on main | No hard target | Full unit + integration + e2e suite at higher iteration counts |

The PR lane must stay under 5 minutes. Above that, developers stop waiting for CI and start merging blind.

## PR smoke lane

Include:
- All unit tests.
- Linting and type-checking.
- A targeted subset of integration tests covering the most critical API contracts (auth, core data paths).

Exclude:
- Full e2e suite — too slow for PR feedback.
- High-iteration property-based runs — save those for nightly.
- Tests that require external services not available in the PR environment.

## Nightly full lane

Include:
- Full unit + integration + e2e suite.
- Property-based tests with higher iteration counts (e.g., 10× the default).
- Any test requiring a production-like environment or live external credentials.

After each nightly run:
- Flag tests that passed on the second attempt but failed initially — these are flake candidates, not clean passes. See [flake-handling](flake-handling.md).
- Track flake rate over time; a rising flake rate is a signal the e2e suite needs hardening.

## When NOT to apply this model

- Don't split into more than two lanes unless the nightly suite regularly exceeds 60 minutes — the overhead of managing three schedules is rarely worth it.
- Don't put unit tests in the nightly-only lane to speed up PR checks; unit tests must run on every PR.
- Don't gate PR merges on nightly lane results — nightly is a signal, not a blocker.

## Common failure modes

| Symptom | Root cause | Fix |
|---|---|---|
| PR lane over 5 minutes | E2E or full integration suite crept in | Audit and move slow tests to nightly |
| Nightly passes; PR lane misses regressions | Critical paths not in smoke subset | Add contract tests for core paths to PR lane |
| Nightly flake rate rising | E2E suite growing without hardening | Review new e2e tests against [test-layering](test-layering.md); move edge cases down |
| Developers ignore CI | PR lane too slow; red is normal | Enforce the 5-minute budget; fix or quarantine chronic failures |
