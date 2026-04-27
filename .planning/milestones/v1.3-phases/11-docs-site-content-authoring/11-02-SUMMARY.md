---
phase: 11-docs-site-content-authoring
plan: 02
subsystem: docs-tooling
tags: [docs, build-pipeline, auto-gen, markdown-tables, tdd, cjs, parseFrontmatterMultiline]

# Dependency graph
requires:
  - phase: 11-docs-site-content-authoring
    provides: "Plan 01 cleanup of stale BMAD-era docs and LLM_EXCLUDE_PATTERNS rewrite"
provides:
  - "tools/inject-reference-tables.cjs — build-time auto-gen tool that renders agents/skills tables from src/gomad-skills/ + src/core-skills/"
  - "test/test-inject-reference-tables.js — 12 enumeration-based tests asserting persona (8) / task-skill (28) / core-skill (11) counts, idempotency, marker behavior, and pipe-escape"
  - "tools/build-docs.mjs pipeline patch — injectReferenceTables() runs BEFORE checkDocLinks() so rendered links are validated"
  - "package.json — docs:inject + test:inject-reference-tables scripts; quality chain extended"
  - "Marker naming convention for Plan 03+: AUTO:agents-table-{start,end} (single block) and AUTO:skills-table-{analysis,planning,solutioning,implementation,core}-{start,end} (per-phase blocks)"
affects: [11-03-docs-reference-pages, 11-07-docs-integration, future-phases-with-new-personas-or-skills]

# Tech tracking
tech-stack:
  added: []  # Zero new runtime/dev dependencies — reuses parseFrontmatterMultiline from validate-skills.js
  patterns:
    - "Build-time auto-gen via execSync from ESM orchestrator → CJS sibling tool (analog of checkDocLinks)"
    - "Per-phase enumeration over PHASE_DIRS (no hardcoded persona-phase mapping)"
    - "domain-kb skip guard replicated from validate-skills.js:202"
    - "Marker substitution with non-greedy regex for byte-stable idempotency"
    - "Silent skip when target docs/reference/{agents,skills}.md don't exist (lets injector ship before consumer pages)"

key-files:
  created:
    - tools/inject-reference-tables.cjs
    - test/test-inject-reference-tables.js
  modified:
    - tools/build-docs.mjs
    - package.json

key-decisions:
  - "Used per-phase markers (AUTO:skills-table-{analysis,planning,solutioning,implementation,core}-*) instead of a single all-sections block — gives Plan 03's skills.md page room for prose between sections (D-08 grouping)"
  - "Silent-skip semantics for missing reference pages instead of failing — decouples Wave 2 (this plan) from Wave 3 (Plan 03 authors the marker pages)"
  - "Skipped the optional `yaml` package import for skill-manifest.yaml; tiny line scanner reads displayName/title/icon flat scalars (keeps zero-new-deps invariant trivially obvious; the `yaml` package is already installed but not needed)"
  - "Wave 2 isolation deliberate: this plan does NOT run `npm run docs:build` because Plan 01's rewritten docs/index.md links to 6 Wave 3 pages that don't exist yet — link-check would fail regardless. Wave 4 plan 11-07 owns end-to-end build verification."
  - "TDD gate: Task 1 (RED test) committed before Task 2 (GREEN implementation) per plan-level type=execute (per-task tdd=true)"

patterns-established:
  - "Auto-gen build-time tool: CJS sibling to validate-skills.js; reuses parseFrontmatterMultiline; require.main guard so test imports don't trigger main()"
  - "Persona-count assertion in main(): EXPECTED_PERSONA_COUNT = 8, throw with diagnostic when drift detected — guards against silent miscount"
  - "Idempotency contract: injectBetweenMarkers regex non-greedy + writeFileSync only on change → re-run leaves filesystem byte-identical"

requirements-completed: [DOCS-02, DOCS-03]

# Metrics
duration: ~17min
completed: 2026-04-26
---

# Phase 11 Plan 02: Reference-Table Auto-Gen Injector Summary

**Build-time auto-gen tool (`tools/inject-reference-tables.cjs`, 477 LOC) that walks `src/gomad-skills/` + `src/core-skills/`, renders markdown tables for the agents/skills reference pages, and substitutes them between `<!-- AUTO:* -->` markers idempotently — wired into `tools/build-docs.mjs` BEFORE `checkDocLinks()` so rendered table links are validated.**

## Performance

- **Duration:** ~17 min
- **Started:** 2026-04-26T09:38:02Z (Phase 11 execution start logged in STATE.md)
- **Completed:** 2026-04-26T09:55:12Z
- **Tasks:** 3 (all autonomous, no checkpoints)
- **Files created:** 2
- **Files modified:** 2

## Accomplishments

- **Persona/skill catalog auto-generated** from source-of-truth dirs (8 personas, 28 task-skills, 11 core-skills — verified by enumeration tests, resolves CONTEXT 27-vs-RESEARCH 28 task-skill discrepancy: it's 28).
- **TDD discipline**: 12 failing tests authored first (Task 1, RED), then implementation (Task 2, GREEN). All 15 individual asserts pass.
- **Pipeline integration**: `injectReferenceTables()` runs at line 68 of `main()`, before `checkDocLinks()` at line 71 — rendered table links pass through the existing link validator.
- **Idempotent**: re-running the injector on the same tree (with or without target reference pages) leaves the filesystem byte-identical.
- **Drift detection**: `EXPECTED_PERSONA_COUNT = 8` constant + main() assertion fails the build if a persona is added/removed without updating the test count, catching staleness at CI time (Threat T-11-02-03 mitigation).
- **Threat surface mitigated**: pipe-escape (`escapeTableCell` replaces `|` with `\|`) prevents corrupted column counts from descriptions containing literal pipes (T-11-02-01).

## Task Commits

Each task committed atomically with `--no-verify` (parallel-executor convention):

1. **Task 1: Create test/test-inject-reference-tables.js (RED)** — `c6cb5e2` (test)
2. **Task 2: Create tools/inject-reference-tables.cjs (GREEN)** — `03c7528` (feat)
3. **Task 3: Patch build-docs.mjs + add npm scripts** — `866c368` (feat)

_Note: Per the plan's `type: execute` frontmatter, the plan-level TDD gate is satisfied by the test→feat ordering of Tasks 1 and 2._

## Files Created/Modified

- `tools/inject-reference-tables.cjs` (NEW, 477 LOC) — build-time auto-gen tool. Exports `{injectBetweenMarkers, discoverPersonas, discoverTaskSkills, discoverCoreSkills, renderAgentsTable, renderSkillsTable, escapeTableCell}`. Reuses `parseFrontmatterMultiline` from `tools/validate-skills.js`. Walks `PHASE_DIRS = ['1-analysis','2-plan-workflows','3-solutioning','4-implementation']` plus `src/core-skills/`. Skips `domain-kb`. CLI silently skips missing target pages so it ships before Plan 03's reference pages exist.
- `test/test-inject-reference-tables.js` (NEW, 312 LOC) — plain-node test (repo convention; no Jest/Vitest/node:test). 12 test functions assert: exports present, 8 personas, all-four-phase-coverage, gm-agent-solo-dev under 4-implementation, 28 task-skills, 11 core-skills, no domain-kb leak, agents-table 4-column shape, all-five-section coverage, marker substitution, throw on missing markers, idempotency, pipe-escape.
- `tools/build-docs.mjs` (MODIFIED) — added `injectReferenceTables()` function (lines 446-467) using the same execSync sibling-tool pattern as `checkDocLinks()`. Patched `main()` (line 68) to call `injectReferenceTables()` before `checkDocLinks()`. Added matching `// Reference Table Injection` and `// Link Checking` banner blocks for code organization.
- `package.json` (MODIFIED) — added `docs:inject` and `test:inject-reference-tables` scripts. Extended `quality` chain to run `test:inject-reference-tables` after `validate:skills` (so the prerequisite frontmatter validation runs first) and before `validate:kb-licenses`.

## Marker Naming Convention (for Plan 03)

Plan 03 must author the following exact marker names in `docs/reference/agents.md`, `docs/reference/skills.md`, and their `docs/zh-cn/` counterparts:

```markdown
<!-- AUTO:agents-table-start -->
<!-- AUTO:agents-table-end -->

<!-- AUTO:skills-table-analysis-start -->
<!-- AUTO:skills-table-analysis-end -->

<!-- AUTO:skills-table-planning-start -->
<!-- AUTO:skills-table-planning-end -->

<!-- AUTO:skills-table-solutioning-start -->
<!-- AUTO:skills-table-solutioning-end -->

<!-- AUTO:skills-table-implementation-start -->
<!-- AUTO:skills-table-implementation-end -->

<!-- AUTO:skills-table-core-start -->
<!-- AUTO:skills-table-core-end -->
```

The injector tolerates a partial set of markers (`injectMultipleSections` skips a section silently if its markers are absent) so authoring can be incremental.

## Decisions Made

- **Per-phase skill markers (not single block)**: Plan 03 authors prose between section tables (`## 1. Analysis` → markers → `## 2. Planning` → markers, etc.). A single all-sections marker would force all five tables to render contiguously. Per-phase markers also let Plan 03 author sections incrementally without breaking the build.
- **Silent skip on missing target file**: `injector` returns `'skipped'` when `docs/reference/agents.md` doesn't exist instead of throwing. This keeps Wave 2 (this plan) from depending on Wave 3 (Plan 03's pages). The `pages-skipped=4` log line documents this clearly.
- **Tiny line-scanner over `yaml` package**: `readManifestFields` parses `skill-manifest.yaml` with a 14-line scanner instead of importing `yaml`. Keeps the dependency surface trivially zero (the `yaml` package is already installed but unused here, which is fine).
- **`renderSkillsTable` returns an object, not a string**: The five sections are returned as `{analysis, planning, solutioning, implementation, core}` so callers can choose per-section substitution. The test combines them via `Object.values().join()` to verify all-five-section coverage.
- **Test 12 (escape-pipe) defensively handles both `escapeTableCell` exported and not exported**: If a future refactor inlines the helper, the test falls back to a synthetic-render assertion. This makes the test robust to refactors without weakening the security check.

## Deviations from Plan

None — plan executed exactly as written. The plan's `<read_first>` and `<action>` blocks were precise enough that no Rule 1/2/3 deviations were needed. The orphaned doc-comment block above `checkDocLinks` was reorganized cosmetically (moved the existing `// Link Checking` banner to follow `injectReferenceTables` so each function has its banner directly above it) — this is a docstring cleanup, not a semantic change.

## Issues Encountered

- **Edit-tool quirk on ANSI escape sequences**: `tools/build-docs.mjs` contains literal `` source-code escape sequences in console.error strings. The Edit tool's `old_string` matcher transparently swaps the literal `` text and the actual ESC character (0x1B), which made some Edit attempts fail to find the pattern. Worked around by using a `node -e` script that performs the byte-precise rearrangement (one-shot move of the orphan banner; ESC normalization on the new injectReferenceTables console.error). Resolved without modifying the deviation rule trajectory.

## User Setup Required

None — no external service configuration. The injector is build-tooling only; runs on `node` (already required for the project).

## Next Phase Readiness

- **Plan 03 (Wave 3) ready**: Author `docs/reference/agents.md` and `docs/reference/skills.md` (plus zh-cn translations) with the exact markers documented above. The injector will populate them on the next `npm run docs:inject` or `npm run docs:build`.
- **Plan 11-07 (Wave 4) ready**: End-to-end pipeline assertion (`npm run docs:build`) will work once all Wave 3 plans land their pages.
- **Drift protection live**: Adding/removing a persona without updating `EXPECTED_PERSONA_COUNT = 8` (in `tools/inject-reference-tables.cjs`) and the test count in `test/test-inject-reference-tables.js` will fail CI immediately. Same for task-skill (28) and core-skill (11) counts.

## Self-Check: PASSED

Verified via direct filesystem and git checks:

- `tools/inject-reference-tables.cjs` exists (477 LOC) — FOUND
- `test/test-inject-reference-tables.js` exists (312 LOC) — FOUND
- `tools/build-docs.mjs` syntactically valid (`node --check`) — FOUND
- `package.json` has both `docs:inject` and `test:inject-reference-tables` — FOUND
- `quality` chain includes `test:inject-reference-tables` — FOUND
- All 12 logical tests / 15 asserts pass (`node test/test-inject-reference-tables.js` exits 0) — FOUND
- Standalone injector run is idempotent no-op (`node tools/inject-reference-tables.cjs` exits 0; `git diff --quiet` clean) — FOUND
- Commit hashes verified in git log:
  - `c6cb5e2` (Task 1, test) — FOUND
  - `03c7528` (Task 2, feat) — FOUND
  - `866c368` (Task 3, feat) — FOUND
- Zero new dependencies added (no entries in package.json `dependencies`/`devDependencies` diff) — FOUND

---
*Phase: 11-docs-site-content-authoring*
*Completed: 2026-04-26*
