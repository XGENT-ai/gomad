---
phase: 10-story-creation-enhancements
plan: 06
subsystem: skill-integration
tags: [skill, gm-create-story, gm-discuss-story, gm-domain-skill, integration, SELECTIVE_LOAD]

# Dependency graph
requires:
  - phase: 10-story-creation-enhancements
    provides: gm-discuss-story skill (Plan 03) emitting {planning_artifacts}/{{story_key}}-context.md
  - phase: 10-story-creation-enhancements
    provides: gm-domain-skill (Plan 04) for KB retrieval
  - phase: 10-story-creation-enhancements
    provides: Seed KB packs installed under <installRoot>/_config/kb/ (Plan 05)
  - phase: 10-story-creation-enhancements
    provides: Installer plumbing for domain-kb copy + manifest entries (Plan 02)
provides:
  - gm-create-story auto-loads {{story_key}}-context.md via SELECTIVE_LOAD (STORY-04)
  - gm-create-story invokes gm-domain-skill for pre-bake of domain KB snippets before story draft (STORY-12)
  - Hint-not-error behavior preserved when context.md or KB packs are absent (STORY-04 graceful degradation extended to KB retrieval)
affects:
  - gm-dev-story fresh-retrieval integration (STORY-F1 deferred; boundary confirmed in step 3b note)
  - Phase 11 docs (user-facing docs for context.md → story draft chain)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "SELECTIVE_LOAD reuse for new per-story inputs without new loader machinery"
    - "Pre-bake integration point at gm-create-story step 3b — between architecture analysis and web research"
    - "Silent multi-outcome acceptance (match / no-match / pack-not-installed) with no fatal branches in KB retrieval"

key-files:
  created: []
  modified:
    - src/gomad-skills/4-implementation/gm-create-story/discover-inputs.md
    - src/gomad-skills/4-implementation/gm-create-story/workflow.md

key-decisions:
  - "D-13 honored: gm-create-story does NOT mechanically parse context.md — it is purely another SELECTIVE_LOAD input file alongside prd/architecture/epics/ux"
  - "D-14 honored: no conflict-detection and no warning emission on user-prompt vs context.md disagreement — prompt-wins is implicit from LLM context ordering"
  - "D-04 honored: no token cap, no compression pass, no truncation logic added to gm-create-story"
  - "STORY-F1 deferred: gm-dev-story fresh-retrieval integration is NOT added — pre-bake from gm-create-story is the only integration point in v1.3"
  - "Integration point for gm-domain-skill placed as step 3b between existing step 3 (architecture) and step 4 (web research) per PATTERNS.md §13 — after architecture is loaded (informs domain selection), before external web research"
  - "kb_snippets render gated by non-empty check in step 5 template-output block — never emits empty domain_kb_references section"

patterns-established:
  - "When adding a new per-story input file to any create-story-style skill: append one row to the Input Files table with SELECTIVE_LOAD + a path using {{story_key}} template variable; the existing discover-inputs.md §2c handle-not-found block automatically provides hint-not-error behavior"
  - "When integrating a retrieval sub-skill (like gm-domain-skill) into a workflow: wrap the invocation in a step with explicit 3-outcome handling (match / no-match / pack-not-installed), gate downstream template-output on non-empty result, and add a deferred-integration note pointing to the follow-up story (STORY-F1)"

requirements-completed: [STORY-04, STORY-05, STORY-12]

# Metrics
duration: 4min
completed: 2026-04-24
---

# Phase 10 Plan 06: gm-create-story Context + KB Integration Summary

**gm-create-story auto-loads {{story_key}}-context.md from gm-discuss-story and invokes gm-domain-skill for pre-bake of domain KB snippets — closing the story-creation loop for v1.3**

## Performance

- **Duration:** 4 min
- **Started:** 2026-04-24T17:46:38Z
- **Completed:** 2026-04-24T17:50:28Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- `gm-create-story/discover-inputs.md` SELECTIVE_LOAD example now lists both `{{epic_num}}` and `{{story_key}}` as template-variable use cases — enables automatic discovery of per-story context files.
- `gm-create-story/workflow.md` Paths + Input Files table + step 2 note + new step 3b + step 5 template-output gate all patched surgically to wire gm-discuss-story context.md and gm-domain-skill pre-bake into the story-creation flow.
- Hint-not-error behavior for missing context.md fully preserved via the existing discover-inputs.md §2c handle-not-found block (unchanged).
- Hint-not-error behavior extended to KB retrieval: step 3b handles no-match / pack-not-installed / missing KB packs silently with no fatal branches.
- Zero behavior changes when neither context.md nor KB packs exist — the skill works exactly as before those plans landed (backwards compatible for existing workspaces).

## Task Commits

Each task was committed atomically on branch `worktree-agent-aa2c992cbf6acaafc`:

1. **Task 1: Patch gm-create-story/discover-inputs.md (one-line edit)** — `b93b323` (docs)
2. **Task 2: Patch gm-create-story/workflow.md (3 surgical edits: Paths, Input Files table, step 2 note, new step 3b, step 5 template-output)** — `ad2cf54` (feat)

**Plan metadata commit:** added after SUMMARY.md write (see final commit).

## Files Created/Modified

- `src/gomad-skills/4-implementation/gm-create-story/discover-inputs.md` — One content line edit: SELECTIVE_LOAD example now lists `{{story_key}}` alongside `{{epic_num}}`. Existing §2c handle-not-found (lines 70-76) untouched and automatically satisfies STORY-04 "missing file = hint not error" for the new `story_context` input. Prettier cosmetically normalized one unrelated `*Example:*` → `_Example:_` italic emphasis on the INDEX_GUIDED section.
- `src/gomad-skills/4-implementation/gm-create-story/workflow.md` — 5 surgical content changes (line numbers below are post-prettier-reflow; the file's XML indentation also got globally reformatted by prettier, producing a large line-count diff with no behavior change):
  - **Paths section, line 39:** new `- story_context = {planning_artifacts}/{{story_key}}-context.md (load if exists per STORY-04; produced by gm-discuss-story)` entry.
  - **Input Files table, line 49:** new `story_context` row with SELECTIVE_LOAD strategy (whole-pattern only; no sharded).
  - **Step 2 note, line 216:** `{story_context_content}` now listed alongside `{epics_content}`, `{prd_content}`, `{architecture_content}`, `{ux_content}`, `{project_context}` with an inline note pointing to gm-discuss-story per STORY-04.
  - **New step 3b, lines 267-287:** `<step n="3b" goal="Fetch domain KB context (pre-bake per STORY-12)">` inserted between existing step 3 (architecture analysis) and step 4 (web research). Invokes gm-domain-skill with domain-slug matching against `<installRoot>/_config/kb/` dir names; handles 3 outcomes (match → append to `{kb_snippets}`; no-match / pack-not-installed → proceed silently). Includes note that gm-dev-story integration is deferred per STORY-F1.
  - **Step 5 template-output gate, lines 326-329:** conditional `<check if="kb_snippets is non-empty"><template-output file="{default_output_file}">domain_kb_references</template-output></check>` placed right after the existing `testing_requirements` template-output entry.

## Decisions Made

None - followed plan as specified. All 4 D-* decisions (D-04, D-13, D-14, STORY-F1) were enforced as hard constraints from CONTEXT.md; no new decisions were required during execution.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Cosmetic formatter normalization] Prettier reflow of unrelated italic emphasis in discover-inputs.md**

- **Found during:** Task 1 (discover-inputs.md patch)
- **Issue:** After running `npx prettier --write` (the action block's mandated post-edit formatter), prettier converted one unrelated italic emphasis on line ~51 from `*Example:*` to `_Example:_` in the INDEX_GUIDED strategy section. This is an automatic formatter normalization, not a logic change.
- **Fix:** Accepted the prettier normalization — both `*Example:*` and `_Example:_` render identically as italic in CommonMark / GitHub Flavored Markdown. Reverting would require disabling the mandated formatter step.
- **Files modified:** src/gomad-skills/4-implementation/gm-create-story/discover-inputs.md (cosmetic only)
- **Verification:** `node tools/validate-skills.js --strict` exits 0; content meaning unchanged.
- **Committed in:** b93b323 (Task 1 commit)
- **Note:** The plan's `<behavior>` clause said "`diff ... .orig ... .md` shows exactly 2 line-diff markers (1 line deleted, 1 line added)." Post-prettier the diff shows 2 content changes — the intended SELECTIVE_LOAD patch plus the cosmetic italic emphasis normalization on one unrelated line (still 2 "- / +" pair diffs, but on different lines). The intent of the clause is satisfied: no content-meaning changes besides the intended SELECTIVE_LOAD patch.

**2. [Rule 1 - Cosmetic formatter normalization] Prettier reflow of XML indentation + Input Files table alignment in workflow.md**

- **Found during:** Task 2 (workflow.md patch)
- **Issue:** `npx prettier --write` globally reflowed the XML-tag DSL indentation and realigned the Input Files markdown table columns across the entire file. The resulting diff is ~131 insertions / 110 deletions even though the content additions are surgical. This is prettier's normal behavior on heterogeneously-indented XML inside markdown.
- **Fix:** Accepted the prettier normalization — content is byte-for-byte preserved; only whitespace (indentation, table column padding) changed. Reverting would require disabling the mandated formatter step.
- **Files modified:** src/gomad-skills/4-implementation/gm-create-story/workflow.md (whitespace only for unrelated regions; content changes are exactly the 5 planned edits)
- **Verification:** All 11 acceptance-criteria grep checks pass; `node tools/validate-skills.js --strict` exits 0; `npm run lint:md` exits 0; no D-14 conflict-detection leakage; no D-04 token-counting leakage; `npm run test:orphan-refs` exits 0.
- **Committed in:** ad2cf54 (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (both Rule 1 - cosmetic formatter normalizations; no logic changes)
**Impact on plan:** Zero functional impact. Both normalizations are the output of the plan-mandated `npx prettier --write` step; reverting them would require disabling a mandated verification step. All plan acceptance criteria pass.

## Issues Encountered

None. Both edits applied cleanly. The only minor hiccup was that after the Paths-section edit, `grep '^- .story_context = '` didn't match my first regex attempt because the Paths entry format wraps `story_context` in backticks (e.g., `` - `story_context` = `{planning_artifacts}/...` ``). Adjusting the regex in the verification block to allow optional backticks resolved it. This was a verification-script authoring issue, not a content issue — the content is exactly as the plan specified.

## Known Stubs

None. All 5 edits are additive integration glue; no placeholder data or hardcoded empty values introduced.

## Threat Flags

None. All threats in the plan's `<threat_model>` (T-10-06-01..05) have `accept` or `mitigate` dispositions covered by Plan 04's threat model (for EoP surface) or explicit design decisions (D-04, D-14). No new security-relevant surface introduced: both files are markdown skill instructions consumed by the LLM, no new network endpoints, auth paths, file access, or schema changes.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Story-creation loop is closed for v1.3: `gm-discuss-story` (Plan 03) → `{{story_key}}-context.md` → `gm-create-story` (Plan 06, this plan) auto-loads it + pulls in domain KB snippets from `gm-domain-skill` (Plan 04) using seed packs from Plan 05 + installer plumbing from Plan 02.
- Ready for Phase 11 (docs site content) to document the `gm-discuss-story` → `gm-create-story` workflow for users.
- Ready for Phase 12 (agent dir relocation) — this plan does not touch `<installRoot>/gomad/agents/` or any of the relocation surface.
- Deferred to post-v1.3 (per CONTEXT.md §Deferred Ideas): STORY-F1 (gm-dev-story fresh-retrieval integration), STORY-F4 (additional seed packs beyond testing/architecture). Both are explicitly noted in the skill files so future planners find the re-entry point.

## Self-Check: PASSED

Files verified to exist:
- FOUND: src/gomad-skills/4-implementation/gm-create-story/discover-inputs.md (patched)
- FOUND: src/gomad-skills/4-implementation/gm-create-story/workflow.md (patched)

Commits verified in git log:
- FOUND: b93b323 (Task 1 — docs(10-06): add {{story_key}} to SELECTIVE_LOAD example)
- FOUND: ad2cf54 (Task 2 — feat(10-06): wire gm-discuss-story context.md + gm-domain-skill pre-bake)

Phase-level verification commands (all exit 0):
- `node tools/validate-skills.js --strict` — pass (2 pre-existing LOW findings in unrelated skills, no new findings)
- `npm run lint:md -- <both patched files>` — pass (0 errors)
- `npm run test:orphan-refs` — pass (186 allowlisted / 0 unallowlisted)
- `grep -rn "conflict.*detect\|emit.*warning.*listing" src/gomad-skills/4-implementation/gm-create-story/` — 0 hits (D-14 clean)
- `grep -cE "token.?count|token.?cap|truncate" workflow.md` — 0 hits (D-04 clean)

---
*Phase: 10-story-creation-enhancements*
*Completed: 2026-04-24*
