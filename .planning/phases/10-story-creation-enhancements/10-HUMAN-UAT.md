---
status: partial
phase: 10-story-creation-enhancements
source: [10-VERIFICATION.md]
started: 2026-04-25T18:05:00Z
updated: 2026-04-25T18:05:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. gm-discuss-story end-to-end UX run (pair-programming)

expected: Developer invokes `gm-discuss-story` for a real story, goes through classic-discuss elicitation (gray-area identification → multi-select → per-area Q&A → transition checks → final gate), produces `{{story_key}}-context.md` with all 5 locked XML sections populated from real gray-area content (not templated placeholders).

result: [pending]

### 2. gm-discuss-story re-run state machine (checkpoint + Update/View/Skip)

expected: Re-invocation with only checkpoint → Resume/Start-fresh prompt appears. Re-invocation with only `context.md` → Update/View/Skip prompt appears. Re-invocation with both → stale checkpoint auto-deleted and Update/View/Skip prompt appears.

result: [pending]

### 3. gm-domain-skill BM25 retrieval against real seed packs

expected: Invocation `gm-domain-skill testing "how do I write an integration test for a DB-backed service?"` returns `reference/integration-tests.md` full content (Mode A). Invocation with no query returns catalog listing (Mode B). Unknown slug `testig` prints `Did you mean: testing, architecture` (Mode D). Below-threshold query returns explicit no-match (Mode C).

result: [pending]

### 4. gm-create-story auto-loads context.md end-to-end

expected: With a pre-existing `{{story_key}}-context.md` and Wave 1-4 changes merged, invoking `gm-create-story` for the same story key produces a story draft that incorporates context.md content alongside PRD/epics/architecture/UX. Missing context.md does not error. No visible warning on user-prompt conflict (D-14).

result: [pending]

### 5. gm-create-story step 3b invokes gm-domain-skill pre-bake

expected: For a story that touches testing or architecture, `gm-create-story` step 3b identifies relevant domain slugs, invokes `gm-domain-skill`, and appends retrieved KB snippets to the story draft under a `domain_kb_references` section.

result: [pending]

## Summary

total: 5
passed: 0
issues: 0
pending: 5
skipped: 0
blocked: 0

## Gaps
