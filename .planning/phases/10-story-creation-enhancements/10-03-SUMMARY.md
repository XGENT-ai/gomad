---
phase: 10-story-creation-enhancements
plan: 03
subsystem: skill
tags: [gm-discuss-story, task-skill, elicitation, discuss, bmad-dsl]

# Dependency graph
requires:
  - phase: 10-story-creation-enhancements
    provides: context gathered (10-CONTEXT.md) + pattern map (10-PATTERNS.md)
provides:
  - gm-discuss-story skill (5 files under src/gomad-skills/4-implementation/gm-discuss-story/)
  - classic-discuss elicitation pattern adapted to story scope
  - checkpoint-resume contract for interrupted discussions ({{story_key}}-discuss-checkpoint.json)
  - 5-section locked output template for {{story_key}}-context.md
affects:
  - 10-06 (gm-create-story discover-inputs patch to auto-load {{story_key}}-context.md)
  - downstream parsers of context.md (must key on section names, per D-03)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "BMAD <workflow>/<step>/<check>/<action>/<ask> XML-DSL mirrored from gm-create-story"
    - "Classic-discuss elicitation flow (gray-area identify → multi-select → per-area Q&A → transition check → final gate → checkpoint-resume) adapted from .claude/get-shit-done/workflows/discuss-phase.md to story scope"
    - "5 locked XML-wrapped sections (<domain>, <decisions>, <canonical_refs>, <specifics>, <deferred>) — same canonical idiom used by every *-CONTEXT.md under .planning/phases/"
    - "Re-run idempotency contract: Resume/Start fresh (checkpoint only), Update/View/Skip (context.md only), stale-checkpoint auto-delete (both present)"

key-files:
  created:
    - src/gomad-skills/4-implementation/gm-discuss-story/SKILL.md (6 lines)
    - src/gomad-skills/4-implementation/gm-discuss-story/workflow.md (296 lines)
    - src/gomad-skills/4-implementation/gm-discuss-story/template.md (40 lines)
    - src/gomad-skills/4-implementation/gm-discuss-story/checklist.md (61 lines)
    - src/gomad-skills/4-implementation/gm-discuss-story/discover-inputs.md (88 lines — near-verbatim of gm-create-story version per D-01)
  modified: []

key-decisions:
  - "Honored D-01 near-verbatim reuse: discover-inputs.md diverges from gm-create-story version by exactly one line (the SELECTIVE_LOAD example mentions {{story_key}} alongside {{epic_num}})"
  - "Honored D-04 no-token-cap: workflow.md contains 0 matches for token/truncate/compress patterns; conciseness enforced via prose rule 'capture decisions, not discussion transcripts'"
  - "Honored D-03 adaptive mapping: workflow.md step 7 maps gray-area decisions to sections by semantic fit (domain=scope, decisions=answers, canonical_refs=citations, specifics=user ideas, deferred=out-of-scope items) — not a fixed category→section lookup"
  - "Honored D-05/D-06/D-07 re-run state machine: step 2 branches on checkpoint-only vs context.md-only vs both-present, with D-07 edge case auto-deleting stale checkpoint when both exist"

patterns-established:
  - "Task-skill file layout: 5-file mirror of gm-create-story (SKILL.md + workflow.md + template.md + checklist.md + discover-inputs.md) for 4-implementation task-skills that produce a planning artifact"
  - "Per-area checkpoint JSON schema at story scope: story_key + timestamp + areas_completed[] + areas_remaining[] + decisions{} + deferred_ideas[] + canonical_refs[]; deleted on successful final write"
  - "Three-way existing-state detection for re-runs: checkpoint+context (stale, auto-delete) / checkpoint-only (Resume/Start fresh) / context-only (Update/View/Skip) / neither (fresh)"

requirements-completed:
  - STORY-01
  - STORY-02
  - STORY-03

# Metrics
duration: ~30min
completed: 2026-04-25
---

# Phase 10 Plan 03: gm-discuss-story Task-Skill Summary

**Classic-discuss elicitation task-skill that crystallizes gray areas BEFORE gm-create-story runs, emitting {{story_key}}-context.md with 5 locked XML-wrapped sections and per-area checkpoint resume.**

## Performance

- **Duration:** ~30 min
- **Started:** 2026-04-24T16:52:00Z
- **Completed:** 2026-04-24T17:22:00Z
- **Tasks:** 3
- **Files created:** 5

## Accomplishments

- Authored 5-file `gm-discuss-story` task-skill under `src/gomad-skills/4-implementation/` (STORY-02 file-for-file mirror of `gm-create-story/`, minus workflow.md deviations for discuss semantics)
- Implemented the full classic-discuss elicitation pattern from `.claude/get-shit-done/workflows/discuss-phase.md` at story scope (gray-area identification grounded in epics entry → multi-select via `AskUserQuestion multiSelect: true` → per-area ~4-question focused Q&A → transition checks → final gate → checkpoint-resume)
- Locked the 5-section output template (`<domain>`, `<decisions>`, `<canonical_refs>`, `<specifics>`, `<deferred>`) matching the canonical idiom used by every `*-CONTEXT.md` under `.planning/phases/` (STORY-03)
- Encoded D-05/D-06/D-07 re-run idempotency contract in workflow.md step 2 (checkpoint-only → Resume/Start fresh; context-only → Update/View/Skip; both → auto-delete stale checkpoint)
- Verified all 5 files pass `node tools/validate-skills.js --strict` (zero new CRITICAL/HIGH findings) and `markdownlint-cli2` (zero errors)

## Task Commits

Each task was committed atomically:

1. **Task 1: SKILL.md + discover-inputs.md** — `4dfe2aa` (feat)
2. **Task 2: workflow.md** — `9fe91b3` (feat)
3. **Task 3: template.md + checklist.md** — `569c0f2` (feat)

## Files Created/Modified

- `src/gomad-skills/4-implementation/gm-discuss-story/SKILL.md` — Skill manifest (name=gm-discuss-story, description starts with "Use when", body points to workflow.md)
- `src/gomad-skills/4-implementation/gm-discuss-story/workflow.md` — 9-step BMAD DSL workflow implementing classic-discuss elicitation with per-area checkpoint writes and 3-way state detection on re-invocation
- `src/gomad-skills/4-implementation/gm-discuss-story/template.md` — Output template with 5 locked XML-wrapped sections and handlebars content placeholders
- `src/gomad-skills/4-implementation/gm-discuss-story/checklist.md` — Quality validator (structural + content-discipline + scope-discipline + re-run-safety checks)
- `src/gomad-skills/4-implementation/gm-discuss-story/discover-inputs.md` — Input-loader protocol (near-verbatim copy of `gm-create-story/discover-inputs.md` per D-01; single-line edit extends SELECTIVE_LOAD example to include `{{story_key}}`)

## Discuss-Phase Patterns Mirrored

The following `discuss-phase.md` patterns were adapted to story scope inside `workflow.md`:

| Pattern | discuss-phase.md ref | Applied in workflow.md |
|---------|----------------------|------------------------|
| Gray-area identification (grounded, not generic) | lines 560-572 | step 3a — "cite at least one concrete source (AC number, architecture section, UX wireframe)" |
| AskUserQuestion multi-select (no skip/you-decide) | lines 594-620 | step 4 — `multiSelect: true`, `options: [each entry from {{candidate_gray_areas}}]`, explicit note against skip options |
| Per-area Q&A with 2-3 concrete options | — | step 5 — "~4 focused questions with 2-3 concrete options each" + concrete=specific values/file paths/library names |
| "More questions about X, or move to next?" transition | — | step 5 — explicit transition ask between areas |
| Checkpoint JSON schema | lines 917-938 | CHECKPOINT JSON SCHEMA prose block (adapted: `phase/phase_name` → `story_key`) |
| Resume / Start fresh | lines 266-284 | step 2 "only checkpoint exists" branch |
| Update / View / Skip | lines ~258-262 | step 3b |
| Checkpoint cleanup on successful write | line 949 | step 7 — explicit delete |

## Deviations from gm-create-story/ Required

| Deviation | gm-create-story version | gm-discuss-story version | Why |
|-----------|-------------------------|--------------------------|-----|
| `discover-inputs.md` SELECTIVE_LOAD example | `Example: used for epics with {{epic_num}}` | `Examples: epics with {{epic_num}}, story context with {{story_key}}` | D-01 near-verbatim reuse; single-line edit to document the new story-level template variable. |
| `workflow.md` purpose | Story drafting engine (exhaustive artifact analysis → master implementation guide) | Gray-area elicitation engine (probe ambiguity, NOT re-draft PRD content) | STORY-01 — gm-discuss-story is the PRE-story step; different job |
| `workflow.md` elicitation flow | Fully automated (zero user intervention except initial selection) | Interactive (multi-select + per-area Q&A + transition checks + final gate) | D-02 classic-discuss mode requires user-driven gray-area selection |
| `workflow.md` checkpoint contract | No checkpoint (single run) | Per-area checkpoint JSON written after each area + deleted on successful final write | D-05 re-run idempotency |
| `workflow.md` re-invocation handling | Overwrites story file silently | 3-way branch: Resume/Start fresh, Update/View/Skip, stale-checkpoint auto-delete | D-05, D-06, D-07 |
| `template.md` output shape | Story sections (Story / Acceptance Criteria / Tasks / Dev Notes) | 5 locked XML-wrapped sections (domain/decisions/canonical_refs/specifics/deferred) | D-03 + STORY-03; matches canonical `*-CONTEXT.md` idiom under `.planning/phases/` |
| `checklist.md` scope | 358 lines, "competition against original LLM" framing, story-specific categories | 61 lines, simpler validation of 5-section shape + D-04 content discipline | Scope is narrower (no story-drafting guardrails to validate) |
| `workflow.md` output length | Comprehensive (no cap, but exhaustive analysis) | No token cap, no compression, no truncation (D-04) | Explicitly revised by D-04 — prose rule "capture decisions, not discussion transcripts" replaces mechanical length controls |

## Decisions Made

None beyond applying the locked D-01..D-07 decisions captured in `10-CONTEXT.md`. This plan is a faithful encoding of those decisions into the 5 skill files.

## Deviations from Plan

### Non-blocking acceptance-criterion drift (documented, not auto-fixed)

**1. [Rule 1 — Plan text] `grep -c "SELECTIVE_LOAD" discover-inputs.md ≥ 2` contradicts D-01 near-verbatim reuse**

- **Found during:** Task 1 acceptance-criteria sweep
- **Issue:** The Plan's acceptance criterion requires `grep -c "SELECTIVE_LOAD" src/gomad-skills/4-implementation/gm-discuss-story/discover-inputs.md ≥ 2`. The upstream source file `gm-create-story/discover-inputs.md` (which D-01 mandates as the near-verbatim source) contains `SELECTIVE_LOAD` only once (in the heading `#### SELECTIVE_LOAD Strategy`). Meeting the `≥ 2` criterion would require inventing a second occurrence, which violates D-01's "near-verbatim reuse" contract and the `<done>` clause's "differs … by exactly 1 line" requirement.
- **Resolution:** Preserved D-01 contract over the `≥ 2` criterion. The authoritative gates (`<verify><automated>` inline script + `node tools/validate-skills.js --strict` + `<done>` 1-line diff) all pass. The upstream source has the same `= 1` count.
- **Files modified:** None (preserved upstream parity)
- **Verification:** `diff gm-create-story/discover-inputs.md gm-discuss-story/discover-inputs.md` shows exactly 1 changed line; inline verify script exits OK; validate-skills --strict exits 0; lint:md exits 0.
- **Committed in:** 4dfe2aa (Task 1)

**2. [Rule 1 — Plan text] `{{story_key}}-discuss-checkpoint.json ≥ 2` required extra literal references**

- **Found during:** Task 2 acceptance-criteria sweep
- **Issue:** Initial workflow.md used the variable `{{checkpoint_file}}` throughout after a single path declaration, yielding only 1 literal `{{story_key}}-discuss-checkpoint.json` occurrence.
- **Fix:** Added literal-path inline expansions in the CHECKPOINT JSON SCHEMA declaration, step 5 write, and step 7 delete (3 additional literal references). No semantic change — just makes the write/delete paths greppable.
- **Files modified:** src/gomad-skills/4-implementation/gm-discuss-story/workflow.md
- **Verification:** `grep -c "{{story_key}}-discuss-checkpoint.json" workflow.md` = 4
- **Committed in:** 9fe91b3 (Task 2)

**3. [Rule 1 — Tooling] Prettier auto-rewrote `*Example:*` → `_Example:_` in discover-inputs.md**

- **Found during:** Task 1 post-format step
- **Issue:** `npx prettier --write` converted single-asterisk italic markers to underscore form, creating a second line of diff vs gm-create-story/discover-inputs.md (violating the `<done>` clause "differs … by exactly 1 line").
- **Fix:** Reverted the prettier change by restoring `*Example:*`. `package.json` `format:check` only globs `{js,cjs,mjs,json,yaml}` — prettier is NOT the markdown formatter authority here; `markdownlint-cli2` is. lint:md passes with `*Example:*`.
- **Files modified:** src/gomad-skills/4-implementation/gm-discuss-story/discover-inputs.md
- **Verification:** `diff` output shows exactly 1 changed line again; lint:md exits 0.
- **Committed in:** 4dfe2aa (Task 1)

---

**Total deviations:** 3 documented (all Rule 1 type — plan text / tooling friction, not code bugs)
**Impact on plan:** Zero scope creep. All deviations resolved in favor of the plan's own locked decisions (D-01, D-07) and the authoritative `<done>` clauses, not mechanical acceptance-criterion counts.

## Issues Encountered

- None functional. Only the 3 documented deviations above (acceptance-criterion mismatches with upstream sources + prettier/markdownlint authority split).

## Next Phase Readiness

- `gm-discuss-story` skill is self-contained and passes `validate-skills.js --strict` + `markdownlint-cli2` + `test:orphan-refs`.
- `ManifestGenerator.collectSkills` will auto-discover the new directory on next install — no installer code change needed for this plan (per CONTEXT.md §Reusable Assets).
- Downstream Plan 10-06 patches `gm-create-story/discover-inputs.md` to add `{{story_key}}-context.md` as a SELECTIVE_LOAD input. This plan intentionally left that patch to Plan 10-06 to preserve wave-2 isolation; no external references to `gm-discuss-story` exist under `src/gomad-skills/` yet (verified via `grep -rn`).
- Plan 10-04 (parallel, wave 2) owns `gm-domain-skill`; no overlap with this plan's files.

## Self-Check: PASSED

**Files verified present:**

- FOUND: src/gomad-skills/4-implementation/gm-discuss-story/SKILL.md
- FOUND: src/gomad-skills/4-implementation/gm-discuss-story/workflow.md
- FOUND: src/gomad-skills/4-implementation/gm-discuss-story/template.md
- FOUND: src/gomad-skills/4-implementation/gm-discuss-story/checklist.md
- FOUND: src/gomad-skills/4-implementation/gm-discuss-story/discover-inputs.md

**Commits verified present in `git log`:**

- FOUND: 4dfe2aa (Task 1)
- FOUND: 9fe91b3 (Task 2)
- FOUND: 569c0f2 (Task 3)

**Gates verified:**

- FOUND: `node tools/validate-skills.js --strict` exits 0 (2 LOW findings in unrelated pre-existing skills; zero HIGH+)
- FOUND: `npx markdownlint-cli2 "src/gomad-skills/4-implementation/gm-discuss-story/*.md"` exits 0 (0 errors)
- FOUND: `npm run test:orphan-refs` exits 0

---

*Phase: 10-story-creation-enhancements*
*Completed: 2026-04-25*
