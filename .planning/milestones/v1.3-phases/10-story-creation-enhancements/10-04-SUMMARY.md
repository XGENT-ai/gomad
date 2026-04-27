---
phase: 10-story-creation-enhancements
plan: 04
subsystem: skill
tags: [skill, task-skill, kb, retrieval, bm25, levenshtein, zero-deps]

# Dependency graph
requires:
  - phase: 10-story-creation-enhancements
    provides: 'src/domain-kb/testing/ and src/domain-kb/architecture/ (Wave 1 plan 10-05 seed KB packs) — the retrieval target for this skill'
provides:
  - 'gm-domain-skill task-skill (SKILL.md + workflow.md + template.md + checklist.md + discover-inputs.md)'
  - 'BM25 retrieval protocol described in prose (hardcoded k1=1.2, b=0.75, NO_MATCH_FLOOR=0.5)'
  - 'Levenshtein edit-distance typo-fallback described in prose (LEVENSHTEIN_MAX=3, halt-not-auto-execute)'
  - '4 output modes (A=file-content, B=catalog, C=no-match, D=pack-not-installed) with template + checklist validation'
affects: [gm-create-story-context-load, gm-discuss-story, install-flow-kb-dir, docs-skills-reference]

# Tech tracking
tech-stack:
  added: [] # Zero new runtime deps — hand-rolled BM25 + Levenshtein in prose
  patterns:
    - 'Task-skill 5-file shape (SKILL.md + workflow.md + template.md + checklist.md + discover-inputs.md) — mirrors gm-create-story / gm-discuss-story'
    - 'BMAD XML-DSL workflow with <workflow>/<step>/<check>/<action>/<output>/<template-output> tags'
    - 'Prose-level algorithm specification (LLM-interpreted; no JS ships) for BM25 and Levenshtein'
    - 'Hardcoded constants with inline rationale (zero config surface per D-10)'
    - 'Mode-branching workflow (Mode A/B/C/D) selected by pack_found × query presence'

key-files:
  created:
    - 'src/gomad-skills/4-implementation/gm-domain-skill/SKILL.md (6 lines)'
    - 'src/gomad-skills/4-implementation/gm-domain-skill/discover-inputs.md (51 lines — 1-input scope, with slug-traversal guard)'
    - 'src/gomad-skills/4-implementation/gm-domain-skill/workflow.md (192 lines — 6 steps, BM25 + Levenshtein prose)'
    - 'src/gomad-skills/4-implementation/gm-domain-skill/template.md (47 lines — 4 output modes)'
    - 'src/gomad-skills/4-implementation/gm-domain-skill/checklist.md (83 lines — Mode A/B/C/D integrity checks)'
    - '.planning/phases/10-story-creation-enhancements/deferred-items.md (tracks pre-existing validate-skills KB-pack finding)'
  modified: []

key-decisions:
  - 'NO_MATCH_FLOOR=0.5 as starting heuristic value — empirical, tune in v1.4+ if seed packs produce false negatives'
  - 'k1=1.2, b=0.75 (standard Okapi defaults from STACK.md section 3) — no deviation from reference'
  - "Tokenization floor at 3 characters (drops noise tokens like 'a', 'an', 'is'); documented in INITIALIZATION + step 4"
  - 'Query-degenerates-to-zero-tokens branch falls through to catalog listing (Mode B) rather than erroring — gives caller actionable output'
  - 'Slug traversal guard added at workflow.md step 1 AND discover-inputs.md step 2 (defense in depth for T-10-04-01/02)'
  - 'BM25 score-tie-break rule: alphabetical by relative path (deterministic; avoids flapping between equivalent hits)'
  - 'Step 6 (Levenshtein) uses D-11 halt-not-auto-execute even at distance 1 — caller MUST re-invoke with corrected slug'

patterns-established:
  - 'Prose-as-spec: Algorithms (BM25 IDF, BM25 scoring, Levenshtein DP) described in English + fenced code-block formulas. LLM interprets and computes at runtime. Zero executable JS ships in the skill itself.'
  - '4-mode task-skill output (file-content / catalog / no-match / pack-not-installed) — reusable pattern for any future retrieval task-skill'
  - 'Per-mode checklist validation — `<action>Before returning, load ./checklist.md and validate...</action>` invoked before each HALT'
  - 'Trust-boundary sealing via discover-inputs.md — slug validation happens before filesystem access, preventing traversal at the earliest possible point'

requirements-completed: [STORY-06, STORY-07]

# Metrics
duration: 8min
completed: 2026-04-24
---

# Phase 10 Plan 04: gm-domain-skill retrieval protocol Summary

**Hand-rolled BM25 + Levenshtein domain-KB retrieval task-skill with 4 mode-branching outputs (file-content / catalog / no-match / typo-fallback), zero new runtime deps, zero config surface.**

## Performance

- **Duration:** 8 min
- **Started:** 2026-04-24T17:32:16Z
- **Completed:** 2026-04-24T17:40:12Z
- **Tasks:** 3
- **Files created:** 5 (one new skill directory) + 1 (deferred-items tracking)

## Accomplishments

- Authored `gm-domain-skill` task-skill as 5-file BMAD XML-DSL bundle ready for auto-discovery by `ManifestGenerator.collectSkills`.
- BM25 ranking described in LLM-interpretable prose with Okapi defaults (`k1=1.2`, `b=0.75`) and a heuristic `NO_MATCH_FLOOR=0.5` — zero executable JS ships.
- Levenshtein "did you mean" fallback with hardcoded `LEVENSHTEIN_MAX=3` and the D-11 halt-not-auto-execute safety rule enforced in prose AND verified by checklist Mode D.
- 4 output modes (file-content / catalog / no-match / pack-not-installed) with handlebars-templated surfaces and per-mode integrity checklist.
- Defense-in-depth slug-traversal guard (T-10-04-01 / T-10-04-02): workflow.md step 1 rejects `/`, `\`, `..`, leading `.` / `_` BEFORE any filesystem read; discover-inputs.md step 2 repeats the check as a belt-and-braces measure.

## Task Commits

Each task was committed atomically (per `--no-verify` worktree convention):

1. **Task 1: SKILL.md + discover-inputs.md** — `2a5b1c7` (feat)
2. **Task 2: workflow.md (BM25 + Levenshtein prose)** — `f56883d` (feat)
3. **Task 3: template.md + checklist.md** — `02d8424` (feat)

## Files Created/Modified

- `src/gomad-skills/4-implementation/gm-domain-skill/SKILL.md` — 6-line manifest. `name: gm-domain-skill`; description starts with "Use when ..."; single-line body delegating to `./workflow.md`.
- `src/gomad-skills/4-implementation/gm-domain-skill/discover-inputs.md` — Scoped 1-input-group loader (the installed KB directory at `<installRoot>/_config/kb/<slug>/`). Implements slug-traversal validation (Step 2) and `pack_found` / `installed_slugs` signaling for the workflow's Mode A/B/C/D branching.
- `src/gomad-skills/4-implementation/gm-domain-skill/workflow.md` — 6 sequential `<step>` blocks. Step 1: input + traversal guard. Step 2: load pack. Step 3: branch. Step 4: BM25 retrieval with IDF + Okapi scoring formulas in fenced code. Step 5: catalog listing in `<relative_path> — <H1 heading>` format. Step 6: Levenshtein DP recurrence + suggestion emit with halt-not-auto-execute.
- `src/gomad-skills/4-implementation/gm-domain-skill/template.md` — 4 output-mode templates (`file_content_response`, `catalog_listing_response`, `no_match_response`, `pack_not_installed_response`) with handlebars placeholders (`{{top_file_content}}`, `{{catalog_lines}}`, `{{domain_slug}}`, `{{did_you_mean_line}}`, `{{installed_slugs_csv}}`, etc.).
- `src/gomad-skills/4-implementation/gm-domain-skill/checklist.md` — Per-mode integrity validation. Mode A: full-file content (not excerpt), single-file (not top-N), score > floor. Mode B: `<path> — <H1>` format, alphabetical, no dropped files. Mode C: verbatim query in output, no weak hit. Mode D: distance ≤ 3 only, NEVER auto-execute, slug-rejection branch.
- `.planning/phases/10-story-creation-enhancements/deferred-items.md` — Tracks a pre-existing validate-skills finding caused by Wave 1's KB packs (see "Deviations" below).

## Decisions Made

- **`NO_MATCH_FLOOR = 0.5`** as the initial heuristic threshold. No empirical seed data was available at plan time; 0.5 is a conservative default for the BM25 score distribution on small packs (~10 files / pack). Tuning deferred to v1.4+ with real usage data.
- **Okapi defaults unchanged** (`k1 = 1.2`, `b = 0.75`) — zero deviation from the STACK.md section 3 reference pseudocode.
- **Query-degenerates-to-zero-tokens** (e.g., caller passes `"a b"` or pure punctuation) falls through to catalog listing (Mode B) rather than erroring. Rationale: the caller still gets actionable output, and the BM25 contract is preserved (we didn't score against an empty query).
- **Defense-in-depth slug validation** — T-10-04-01/02 mitigation is enforced at BOTH workflow.md step 1 AND discover-inputs.md step 2. Either layer alone would suffice, but dual enforcement guarantees no future refactor can accidentally unseat one and silently regress.
- **Tie-break rule in BM25 sorting** — alphabetical by relative path. Deterministic; avoids flapping between equivalent hits across runs.

## Deviations from Plan

### Documented (not auto-fixed) — logged in `deferred-items.md`

**1. [Scope-boundary / pre-existing] `validate-skills.js --strict` fails on Wave 1 KB packs**

- **Found during:** Task 1 verification (`node tools/validate-skills.js --strict`).
- **Issue:** The validator exits 1 with 4 CRITICAL findings — all in `src/domain-kb/architecture/SKILL.md` and `src/domain-kb/testing/SKILL.md` (missing `name` / `description` frontmatter). Those files were created by Wave 1's plan 10-05 and ship intentionally as "pack manifests" (with `source` / `license` / `last_reviewed` frontmatter), NOT skill manifests. The validator's `discoverSkillDirs` treats any directory containing `SKILL.md` as a skill.
- **Scope boundary decision:** Out of scope for 10-04 per `<deviation_rules>`. My new files produce zero new findings in isolation. The pre-existing failure is documented in `.planning/phases/10-story-creation-enhancements/deferred-items.md` with a recommended fix (add `src/domain-kb/**` to `discoverSkillDirs` skip list, OR extend pack SKILL.md with minimal `name`/`description` frontmatter — option 1 preferred).
- **Fix target:** Future plan (plausibly 10-06 install flow validation) or a small follow-up patch ticket.

### Otherwise — plan executed exactly as written

No auto-fixes to plan-task logic; the three tasks shipped with the action bodies planned in 10-04-PLAN.md, and all acceptance-criteria probes passed on the first run (post a prettier whitespace adjustment to the BM25 formula that inadvertently triggered MD037 — resolved in-session by wrapping formulas in fenced code blocks, still within Task 2's initial commit window).

---

**Total deviations:** 0 auto-fixes to implementation. 1 scope-boundary discovery logged to `deferred-items.md`.
**Impact on plan:** None on the plan's deliverables. The deferred-items entry is a follow-up obligation for a later plan.

## Issues Encountered

- **Prettier MD037 interaction with BM25 formula asterisks**: the initial version of workflow.md had the BM25 score formula as `idf[q] * (tf[q][f] * (k1 + 1)) / ...` inside `<action>` tags. Prettier collapsed the block and re-interpreted the `*` chars as emphasis markers, and markdownlint flagged MD037 (spaces inside emphasis markers). Resolved by moving both the IDF and BM25 scoring formulas into fenced code blocks (`\n...\n`) which prettier leaves untouched and markdownlint ignores. Same treatment applied to the Levenshtein DP recurrence. Net effect: improved readability AND lint-clean.

## Threat Model Disposition

- **T-10-04-01 (Tampering / path traversal)**: mitigated via slug-validation guard at workflow.md step 1 + discover-inputs.md step 2. Rejects `/`, `\`, `..`, leading `.` / `_` before filesystem touch.
- **T-10-04-02 (Info disclosure / read outside kb_root)**: mitigated by same guard + restricting all filesystem access to `<installRoot>/_config/kb/<slug>/**/*.md`. Confirmed by workflow.md prose explicitly naming the root.
- **T-10-04-03 (DoS / huge pack)**: accepted per D-12 (seed packs capped at ~10 files). Revisit at v1.4+ if pack count grows.
- **T-10-04-04 (EoP / Levenshtein auto-execute)**: mitigated by D-11 rule — `auto-execute` appears 6× in workflow.md and 4× in checklist.md as an explicit prohibition. Also verified by grep in acceptance criteria.
- **T-10-04-05 (Repudiation / no audit trail)**: accepted — source citation in Mode A output gives caller enough info to log.

## Next Phase Readiness

- `gm-domain-skill` is **auto-discoverable** by `ManifestGenerator.collectSkills` (standard 5-file task-skill layout under `src/gomad-skills/4-implementation/`). No installer changes needed for this plan.
- Ready for Plan 06 (gm-create-story context-load) to consume — that plan will invoke `gm-domain-skill {slug} {query}` inline when the architecture/testing seeds are relevant.
- Ready for Phase 11 docs site to reference as a worked example of the "task-skill with retrieval" pattern.
- **Blocker / follow-up:** `deferred-items.md` entry on validate-skills.js + KB packs. Does not block Plan 06 (validate-skills failures are pre-existing, not caused by 10-04). Should be folded into the next small cleanup ticket.

## Self-Check: PASSED

**Files:**

- FOUND: src/gomad-skills/4-implementation/gm-domain-skill/SKILL.md
- FOUND: src/gomad-skills/4-implementation/gm-domain-skill/workflow.md
- FOUND: src/gomad-skills/4-implementation/gm-domain-skill/template.md
- FOUND: src/gomad-skills/4-implementation/gm-domain-skill/checklist.md
- FOUND: src/gomad-skills/4-implementation/gm-domain-skill/discover-inputs.md

**Commits:**

- FOUND: 2a5b1c7 (Task 1: SKILL.md + discover-inputs.md)
- FOUND: f56883d (Task 2: workflow.md)
- FOUND: 02d8424 (Task 3: template.md + checklist.md)

**Acceptance criteria:** All Task 1, Task 2, Task 3 probes passed (see execution log).
**Lint:** `npm run lint:md -- "src/gomad-skills/4-implementation/gm-domain-skill/*.md"` → 0 errors.
**KB license check:** `npm run validate:kb-licenses` → 0 findings.
**Runtime deps:** `git diff package.json package-lock.json` → no changes.

---

_Phase: 10-story-creation-enhancements_
_Completed: 2026-04-24_
