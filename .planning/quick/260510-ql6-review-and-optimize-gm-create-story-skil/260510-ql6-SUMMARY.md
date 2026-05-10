---
quick_task: 260510-ql6
title: Raise the quality bar inside gm-create-story so dev agents cannot self-lower it
status: complete
completed: "2026-05-10"
target_skill: src/gomad-skills/4-implementation/gm-create-story/
files_modified:
  - src/gomad-skills/4-implementation/gm-create-story/template.md
  - src/gomad-skills/4-implementation/gm-create-story/workflow.md
  - src/gomad-skills/4-implementation/gm-create-story/checklist.md
commits:
  - 86c03e9 docs(quick-260510-ql6): add Real-World Verification + Anti-Acceptance to story template
  - 00c683a docs(quick-260510-ql6): wrap bare URL in template example to satisfy MD034
  - bedc7a6 docs(quick-260510-ql6): wire SM workflow to emit anti-mock-only sections
  - 2d8be06 docs(quick-260510-ql6): add SM checklist gate that rejects mock-only stories
---

# Quick Task 260510-ql6: Close mock-only-done loophole in gm-create-story

## Files changed

| File | Lines added | Lines removed |
|------|-------------|---------------|
| `src/gomad-skills/4-implementation/gm-create-story/template.md` | +36 | -0 |
| `src/gomad-skills/4-implementation/gm-create-story/workflow.md` | +6  | -0 |
| `src/gomad-skills/4-implementation/gm-create-story/checklist.md` | +16 | -0 |
| **Total** | **+58** | **−0** |

The bare-URL fix in commit `00c683a` is a 1-line edit (`+1 / −1`) that does not change the net additions count for the skill — it only converts the example URL from bare form to angle-bracketed form within the same row added by `86c03e9`.

## Commits (chronological)

1. `86c03e9` — `docs(quick-260510-ql6): add Real-World Verification + Anti-Acceptance to story template` (Task 1, +36/-0)
2. `00c683a` — `docs(quick-260510-ql6): wrap bare URL in template example to satisfy MD034` (Task 1 lint fix, +1/-1)
3. `bedc7a6` — `docs(quick-260510-ql6): wire SM workflow to emit anti-mock-only sections` (Task 2, +6/-0)
4. `2d8be06` — `docs(quick-260510-ql6): add SM checklist gate that rejects mock-only stories` (Task 3, +16/-0)

## What changed in agent behavior

A story produced by `gm-create-story` now physically cannot be silently satisfied by mock-only test passage. The story format itself (template.md) carries two new mandatory H2 sections — `## Real-World Verification` (a per-AC table demanding a concrete real-system command, URL, or UI flow) and `## Anti-Acceptance` (a verbatim, canonical list of what does NOT count as done: mocked tests, `console.log` placeholders, TODO comments, hardcoded fixtures, skipped tests, type-check-only proofs, green CI without filled rows). The SM workflow (workflow.md step 5) is wired to emit both sections via two new `<template-output>` directives and is bound by two new `<critical>` instructions: every AC must map to a real-system Real-World Verification row, and the Anti-Acceptance list must be copied verbatim. The SM self-validation pass (checklist.md) gains a 7-item REJECT-the-story gate (3.6 Mock-Only Acceptance DISASTERS) that fails any story missing the new sections, with vague rows, with unmapped ACs, or with softened anti-acceptance bullets. A dev agent reading the resulting story can no longer satisfy "done" via mocks because the story file literally names every cheap interpretation as forbidden, and the contract demands a real-system observation pasted into the new `### Real-World Verification Evidence` slot under Dev Agent Record before Status can flip to `review`.

## Deviations from plan

1. **Bare-URL lint fix (commit `00c683a`).** The plan's verbatim text for the Real-World Verification table example contained `https://localhost:3000/orders` as a bare URL. The project's `lint:md` gate (markdownlint MD034 / no-bare-urls) rejected this on the pre-commit run. Per CLAUDE.md item 3 ("Match existing markdown style"), I wrapped the URL with angle brackets `<https://localhost:3000/orders>` in a follow-up commit. Wording and meaning of the example are unchanged — only the markdown syntax was adjusted to comply with the existing project lint rule. I did NOT amend the original Task 1 commit (per `<commit_strategy>` "Always create NEW commits rather than amending").

2. **Checklist Task 3 diff stat: 16 lines added, plan estimated ~18.** The plan-stated estimate of 18 counted a leading and trailing blank line; my surgical insert reused the existing blank line between the previous bullet list and `### **Step 4:`, so the actual diff is +16. Functionally identical, within tolerance of the success criterion ("~55–70 lines added").

3. **No SUMMARY.md per the plan's `<output>` block, but dispatcher prompt required one.** The plan said "no SUMMARY.md is required for a quick task". The dispatcher prompt's `<summary_output>` block explicitly required this file. I followed the dispatcher's instruction (it takes precedence in execution context). The original PLAN.md is unchanged.

## Out-of-scope items respected

- Did NOT touch the duplicate `workflow.md` lines 156–207 (pre-existing dead code, flagged in plan `<out_of_scope>` item 4).
- Did NOT modify `gm-dev-story/`, `gm-code-review/`, `gm-checkpoint-preview/`, or `gm-qa-generate-e2e-tests/` skills.
- Did NOT add a HALT condition in `gm-dev-story/workflow.md` for Real-World Verification Evidence (flagged in plan `<out_of_scope>` item 1 as the highest-priority follow-up quick task).

## Self-Check: PASSED

- All 3 target files exist on disk.
- All 4 commits present on branch `worktree-agent-a1aa0114e3b96847e`.
- All per-task verify criteria pass:
  - Task 1: `grep -c "^## Real-World Verification$" template.md` = 1; `grep -c "^## Anti-Acceptance" template.md` = 1; `grep -c "### Real-World Verification Evidence" template.md` = 1; forbidden-words count = 5 (≥4); section ordering AC@13 → RWV@17 → Anti@34 → Tasks@48.
  - Task 2: `grep -c "real_world_verification" workflow.md` = 1; `grep -c "anti_acceptance" workflow.md` = 1; `grep -c "PROOF-OF-DONE CONTRACT" workflow.md` = 1; `grep -c "Anti-Acceptance.*canonical" workflow.md` = 1; both `<critical>` blocks at lines 305–306 inside step 5 (step 6 starts at line 372).
  - Task 3: `grep -c "Mock-Only Acceptance DISASTERS" checklist.md` = 1; `grep -c "REJECT the story" checklist.md` = 1; ordering 3.5@161 < 3.6@168 < Step 4@184.
- Whole-skill regression: `git diff --stat` shows +58 / −0 across the three files (within plan's ~55–70 target).
- Project full test+lint pipeline (`npm run test`) passes after each commit (205 install tests, 46 statusline, 21 claude-md, 14 codex-syntax, 13 bug1, 9 legacy-id, 7 refs, 2 orphan-refs; eslint clean; markdownlint clean; prettier clean).
