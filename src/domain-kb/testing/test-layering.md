---
name: test-layering
description: Choose the right test layer (unit, integration, or e2e) for any test case.
license: MIT
last_reviewed: 2026-05-02
---

# Test Layering

**When to use:** Unsure whether a test should mock its dependencies, hit real services, or drive a full user workflow. Apply before writing tests to avoid false confidence from mocked integration tests or edge cases buried in e2e. Trigger phrases: "should I mock this?", "unit vs integration", "e2e is flaky and slow", "test pyramid", "where does this test belong?", "integration tests passing but prod broke".

## Layer decision table

| Layer | Tests what | Mocks? | Owns edge cases? |
|---|---|---|---|
| Unit | Single function / invariant in isolation | Yes — isolate the unit | Yes — boundary, error, property-based |
| Integration | Component interactions, API contracts, auth, external services | No for infra you own; stub only downstream services you do not own | Partial — error contracts, auth scoping |
| E2E | Real user workflows through the full stack | Never | No — happy path only |

Decision rule: single function with controlled inputs → unit. Crosses a network or process boundary → integration. Drives a workflow a user would actually perform → e2e.

## Unit tests

- **Data-driven table**: parameterize over happy path, boundary, error, and edge cases.
- **Property-based**: fuzz invariants that must hold for all inputs — idempotency, sort stability, roundtrip serialization.
- Derive cases from the public API surface: input types/constraints, output shape, error modes, invariants.
- Mock external I/O. Do not hit networks, filesystems, or databases.

## Integration / contract tests

- **API envelope**: request/response shape, status codes, content types, pagination.
- **Error contract**: error codes, shapes, rate limiting, retry behavior.
- **Auth and scoping**: token validation, role-based access, tenant isolation.
- **Eventual consistency**: poll with a bounded timeout; never use fixed `sleep`.
- Reuse auth state across a suite; avoid per-test login flows.

## E2E tests

- No mocks. Exercise real services, databases, and APIs.
- Happy-path workflows only. Edge cases belong at lower layers.
- **State-tolerant**: never assume a clean slate; tolerate pre-existing data from prior runs.
- **Idempotent**: safe to run repeatedly without cleanup between runs.
- **Flow-oriented**: validate a data path end-to-end rather than isolated assertions.

## Hard rules

- **No test-only hacks in product code.** No `if (process.env.TEST)` branches, no test-specific exports, no backdoors.
- **E2E must not rely on clean state.** If your test fails when pre-existing data is present, the test is wrong.
- **Never invent API signatures, file locations, or line numbers.** Only reference what you have read from the codebase.
- **No fabricated fixtures.** Derive test data from actual schemas, types, or seed data in the repo.

## When NOT to use this layering

- Don't add e2e coverage for a bug that is fully reproducible in a unit test — e2e is expensive.
- Don't write integration tests for pure business logic with no I/O; put those at unit level.
- Don't mock the database in integration tests unless you own the database schema; mock/real divergence has caused production incidents.

## Common failure modes

| Symptom | Root cause | Fix |
|---|---|---|
| Integration tests pass; prod breaks | Mocked infra diverged from real | Replace mocks with real infra |
| E2E suite is slow and brittle | Edge cases crept into e2e | Move them to unit/integration; keep e2e on happy paths |
| Unit tests miss runtime errors | Testing implementation, not contract | Test via public API; derive cases from types/constraints |
| Tests fail on CI but pass locally | E2E assumes clean database / clean environment | Make tests state-tolerant |
| Auth test fragility across tenants | Per-test login flows competing for rate limits | Reuse auth state; authenticate once per suite |
