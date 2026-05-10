# Story {{epic_num}}.{{story_num}}: {{story_title}}

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a {{role}},
I want {{action}},
so that {{benefit}}.

## Acceptance Criteria

1. [Add acceptance criteria from epics/PRD]

## Real-World Verification

**Verification Mode:** `real-world` (default) | `test-only-justified` (refactor / internal-only / doc-change / spike)

**This section is the proof-of-done contract. Mocks-only test passage is NOT acceptance.**
For `real-world` mode (the default for any story that introduces or changes user-observable behavior), the dev agent MUST execute every command/flow below against the real system (real DB, real upstream service, real browser, real network) and paste the actual observed output/screenshot path/log excerpt into "Dev Agent Record → Real-World Verification Evidence" before setting Status to `review`.

For each Acceptance Criterion above, fill at least one row:

| AC# | What a human/operator runs | Against what (real system) | Expected observable result |
|-----|----------------------------|-----------------------------|----------------------------|
| 1   | e.g. `curl -X POST localhost:3000/api/orders -d '{...}'` | local dev server + real Postgres | HTTP 201 + new row visible in `orders` table via `psql` |
| 2   | e.g. open <https://localhost:3000/orders> in browser, click "New" | local dev server + real browser session | new order appears in list within 2s |

Rules:
- Each row MUST name a concrete command, URL, or UI flow — no "verify it works".
- Mocks, stubs, fakes, in-memory replacements, and `console.log` of expected values are NOT acceptable evidence here.
- If a row cannot be satisfied without a real external dependency the dev agent cannot reach (e.g. third-party prod API), the dev agent MUST HALT and report — NOT substitute a mock and declare done.

**Mode `test-only-justified` (escape hatch — must be earned, not defaulted):**
Use ONLY when the story's nature genuinely cannot produce user-observable behavior to verify — e.g. pure refactor with no behavior change, internal type-system tightening, doc-only edit, dependency upgrade with no API change, time-boxed spike. In that case, REPLACE the table above with this block:

```text
Mode: test-only-justified
Why real-world verification does not apply: <one concrete sentence — "this story renames internals; no caller-visible change" / "this story is a doc edit; no runtime"/etc.>
Strongest available verification: <the actual bar — e.g. "full test suite green AND identical behavior on the 3 worked-example flows in <link>", "before/after benchmark within 2%", "manual reading by a second reviewer">
```

The justification line is read by the dev agent and the reviewer. A vague justification ("internal change", "no user impact") is itself a REJECT — it must name *why this specific story* cannot produce real-world evidence.

## Anti-Acceptance (what does NOT count as done)

The following are explicitly NOT acceptance, regardless of test suite color:

- ❌ Unit/integration tests that pass only because dependencies are mocked, stubbed, or replaced with in-memory fakes
- ❌ `console.log` / `print` of an expected value instead of producing it
- ❌ TODO / FIXME / "wire later" comments in code paths reachable by the AC
- ❌ Hardcoded fixture responses returned from a route in lieu of real logic
- ❌ Disabled, skipped, or `.only`'d tests in changed files
- ❌ "Compiles / type-checks" without running against the real system per Real-World Verification above
- ❌ A green CI run when Real-World Verification rows are unfilled

If the dev agent cannot meet the Real-World Verification bar, the correct action is **HALT and report**, not redefine "done". Lowering the bar to fit the implementation is a contract violation.

## Tasks / Subtasks

- [ ] Task 1 (AC: #)
  - [ ] Subtask 1.1
- [ ] Task 2 (AC: #)
  - [ ] Subtask 2.1

## Dev Notes

- Relevant architecture patterns and constraints
- Source tree components to touch
- Testing standards summary

### Project Structure Notes

- Alignment with unified project structure (paths, modules, naming)
- Detected conflicts or variances (with rationale)

### References

- Cite all technical details with source paths and sections, e.g. [Source: docs/<file>.md#Section]

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List

### Real-World Verification Evidence

<!-- Dev agent MUST paste real observed output for each Real-World Verification row before Status=review.
     Format: "AC#1: <command run> → <actual output excerpt>". Empty section blocks Status=review. -->
