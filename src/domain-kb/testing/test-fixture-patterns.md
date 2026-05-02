---
name: test-fixture-patterns
description: Write reliable, deterministic test fixtures and handle async waits correctly.
license: MIT
last_reviewed: 2026-05-02
---

**When to use:** Setting up test data, choosing between factory functions and shared fixture objects, introducing seeded randomness, implementing polling for async state changes, or running e2e preflight checks. Also applies when you see flaky tests caused by non-deterministic data, cross-test fixture pollution, or `sleep()`/`waitForTimeout()` calls masking timing problems. Trigger phrases: "fixture factory", "seeded faker", "shared test state", "waitForTimeout", "poll until ready", "async assertion", "preflight check", "services not ready", "test data setup".

## Deterministic fixtures

- **Seeded randomness**: use seeded faker or deterministic UUID generators so test runs are reproducible. Never call `Math.random()` or an unseeded generator directly.
- **Factory functions over shared objects**: factory functions produce a fresh instance per call; shared mutable fixtures silently share state across tests.
- **Self-contained**: each fixture carries everything it needs. Cross-test fixture dependencies (test B requires test A's output) make ordering brittle and failures confusing.
- **Derive from real schemas**: base generated data on actual types, database schemas, or seed files in the repo. Never invent plausible-looking values that diverge from the real schema.

```ts
// Good — factory function, seeded
const user = createUser({ seed: 42, role: 'admin' });

// Bad — shared mutable object
const sharedUser = { id: 1, role: 'admin' };  // mutated by test A; breaks test B
```

## Async handling

Never use fixed waits (`sleep`, `waitForTimeout`, `setTimeout`). They make suites slow and still race under load.

| Situation | Do | Do NOT |
|---|---|---|
| Wait for UI element | `await expect(locator).toBeVisible()` (Playwright) | `await page.waitForTimeout(2000)` |
| Wait for API state change | Poll with bounded timeout + exponential backoff | `sleep(3000)` |
| Wait for background job | Poll a status endpoint; fail with message on timeout | Assume it's done after N seconds |

Rules:
- Set an explicit timeout per operation; fail fast with a descriptive message when it expires.
- Bound retry attempts (e.g., max 5 retries with exponential backoff, not infinite).
- Use framework-native waiting (Playwright `expect`, Jest `waitFor`, Go `eventually`) over manual polling loops.
- If you find yourself adding a `sleep`, that is a signal the assertion strategy is wrong.

## E2E preflight checks

Run before the suite, not inside individual tests. Fail the entire run early if the environment is not ready.

1. Verify the target environment is reachable (health endpoint, ping).
2. Confirm required services are running (database, API server, auth provider).
3. Validate test user credentials exist and are functional (a lightweight probe request, not a full login flow).
4. Check for leftover state that could cause false failures — **log it, do not fail on it**. E2E suites must be state-tolerant (see [test-layering](test-layering.md)).

## When NOT to apply these patterns

- Don't add preflight checks to unit tests — they have no external dependencies to probe.
- Don't use seeded randomness when the test explicitly needs non-deterministic behavior (rare; usually a sign the test is testing the wrong thing).
- Don't share fixture state across test files even if it is read-only — import the factory function instead.

## Common failure modes

| Symptom | Root cause | Fix |
|---|---|---|
| Test passes alone; fails in suite | Shared mutable fixture mutated by a sibling test | Use factory functions; isolate fixture state |
| Same test output varies across runs | Unseeded random data generation | Seed the generator; derive from schema |
| Suite hangs on async assertion | No timeout set; waiting forever | Set explicit per-operation timeout |
| Flaky "element not found" in e2e | Fixed `waitForTimeout` races under load | Replace with framework-native `expect().toBeVisible()` |
| Suite fails on missing service | Preflight not run; failure surfaces mid-suite | Add preflight; fail early with clear diagnostics |
