---
phase: 12-agent-dir-relocation-release
plan: 01
subsystem: installer
tags: [installer, path-constants, persona-relocation, agent-personas]

# Dependency graph
requires:
  - phase: 09-agent-as-command-migration
    provides: Launcher-form slash command contract; persona body extraction at install time
provides:
  - "AGENTS_PERSONA_SUBPATH constant ('_config/agents') exported from path-utils.js as sole source of truth"
  - "LEGACY_AGENTS_PERSONA_SUBPATH constant ('gomad/agents') for cleanup-planner v12 detector (Plan 02)"
  - "extractPersonas writer now lands persona bodies at <workspaceRoot>/_gomad/_config/agents/<shortName>.md"
  - "Launcher stub template references new {project-root}/_gomad/_config/agents/{{shortName}}.md path"
affects:
  - 12-02 (cleanup-planner needs LEGACY_AGENTS_PERSONA_SUBPATH for v12 detector)
  - 12-03 (detectCustomFiles whitelist consumes AgentCommandGenerator.AGENT_SOURCES shortname list)
  - 12-06 (AGENT-07 Phase C body-regex test verifies template/writer drift)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Single-source path constant (RESEARCH Pattern 3) for persona body subpath"
    - "Atomic co-commit of writer + template + comment (RESEARCH Pitfall 3) — drift = silent runtime failure"
    - "path.posix.join for literal forward-slash form; spread + path.join at call site for cross-platform separator"

key-files:
  created: []
  modified:
    - "tools/installer/ide/shared/path-utils.js — added 2 constants + node:path import + exports"
    - "tools/installer/ide/shared/agent-command-generator.js — extractPersonas writes via constant"
    - "tools/installer/ide/templates/agent-command-template.md — line 16 launcher pointer swap"
    - "tools/installer/core/installer.js — Phase 6 comment block now reflects v1.3+ target"

key-decisions:
  - "Use path.posix.join for AGENTS_PERSONA_SUBPATH literal so forward-slash form is platform-stable; call sites split('/') and re-spread into path.join for native separator on Windows"
  - "Co-commit writer + template + comment in a single git commit per RESEARCH Pitfall 3 — drift between writer (agent-command-generator.js:71) and template (agent-command-template.md:16) is a silent /gm:agent-pm runtime failure"
  - "Add missing 'const path = require(\"node:path\")' import to path-utils.js (Rule 3 deviation — plan assumed it existed but file had no imports)"

patterns-established:
  - "Pattern: AGENTS_PERSONA_SUBPATH constant — every module that needs persona body location MUST destructure the constant from path-utils, never re-derive the literal"
  - "Pattern: Cross-platform path.join with posix-form constant — `path.join(root, ...AGENTS_PERSONA_SUBPATH.split('/'))` produces native separator on Windows while keeping the constant POSIX-formed"

requirements-completed: [AGENT-01, AGENT-02, AGENT-03]

# Metrics
duration: 4min
completed: 2026-04-27
---

# Phase 12 Plan 01: Persona Path Constants & Atomic Writer/Template Swap Summary

**Single source-of-truth `AGENTS_PERSONA_SUBPATH` constant (`_config/agents`) added to path-utils.js; writer + launcher template + installer comment swapped to v1.3 location in one atomic commit — fresh `gomad install` now lands persona bodies at `_gomad/_config/agents/<shortName>.md`.**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-04-27T01:47:21Z
- **Completed:** 2026-04-27T01:51:20Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- `AGENTS_PERSONA_SUBPATH` and `LEGACY_AGENTS_PERSONA_SUBPATH` exported from `path-utils.js` as `path.posix.join`-formed constants (`_config/agents`, `gomad/agents`)
- `extractPersonas()` in `agent-command-generator.js` rewritten to consume the constant via destructured require + `path.join(root, ...AGENTS_PERSONA_SUBPATH.split('/'))` — no string literal at write site
- Launcher stub template (`agent-command-template.md` line 16) now points at `{project-root}/_gomad/_config/agents/{{shortName}}.md`
- `installer.js` Phase 6 comment block updated to reflect v1.3+ target with v1.2-legacy callout
- All three swap edits landed in a single git commit per RESEARCH §Pitfall 3 co-commit rule

## Task Commits

1. **Task 1: Add AGENTS_PERSONA_SUBPATH + LEGACY constants to path-utils** — `453de68` (feat)
2. **Task 2: Swap writer + template + comment to AGENTS_PERSONA_SUBPATH** — `dbb3bc2` (feat, atomic 3-file co-commit)

**Auxiliary:** `e5b6c89` (docs: log pre-existing prettier issue in deferred-items.md)

## Files Created/Modified

- `tools/installer/ide/shared/path-utils.js` — added `node:path` import, `AGENTS_PERSONA_SUBPATH` + `LEGACY_AGENTS_PERSONA_SUBPATH` constants near `GOMAD_FOLDER_NAME`, exported both. JSDoc examples (lines 27, 57-62, 81) preserved byte-for-byte.
- `tools/installer/ide/shared/agent-command-generator.js` — destructured require expanded with `AGENTS_PERSONA_SUBPATH`; `extractPersonas` `outputDir` rewritten to use the constant.
- `tools/installer/ide/templates/agent-command-template.md` — line 16 path swap from `gomad/agents` to `_config/agents` (only path-bearing line in template).
- `tools/installer/core/installer.js` — Phase 6 (D-14/D-15) comment block at lines 296-300 now describes v1.3+ target with explicit "was gomad/agents/ in v1.2" callout.
- `.planning/phases/12-agent-dir-relocation-release/deferred-items.md` — created to log out-of-scope pre-existing prettier issue.

## Decisions Made

- **`path.posix.join` for the constant value** — keeps the literal POSIX form regardless of host OS; call sites split on `/` and re-spread into `path.join` for native-separator output on Windows. Matches the manifest CSV serialization convention at cleanup-planner.js:301 (`relNative.split(path.sep).join('/')`).
- **Co-commit writer + template + comment in Task 2** — RESEARCH §Pitfall 3 hard rule. Drift between the writer site and the template would mean launcher stubs point at a path the writer never created → silent `/gm:agent-pm` runtime failure with no install-time signal. The Phase C body-regex test (AGENT-07, Plan 06) is the eventual safety net but does not run until tests are extended.
- **Add missing `const path = require('node:path')` import to path-utils.js** — the plan stated this import already existed; it did not. The file previously had zero imports because all functions used only string ops. Added the import as a Rule 3 (blocking dependency) deviation so `path.posix.join` resolves at module load time. Tracked under Deviations below.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added missing `const path = require('node:path')` import to path-utils.js**
- **Found during:** Task 1 (Add AGENTS_PERSONA_SUBPATH + LEGACY constants)
- **Issue:** Plan stated "Verify `const path = require('node:path');` is already imported at the top of path-utils.js (it is — confirmed via prior read)" — but the file had no imports at all (verified via `grep "require"` returning empty). Without the import, `AGENTS_PERSONA_SUBPATH = path.posix.join(...)` would throw `ReferenceError: path is not defined` at module load time.
- **Fix:** Added `const path = require('node:path');` between the JSDoc header (line 17) and the `TYPE_SEGMENTS` constant (now at line 19).
- **Files modified:** tools/installer/ide/shared/path-utils.js
- **Verification:** `node -e "const u = require('./tools/installer/ide/shared/path-utils'); console.log(u.AGENTS_PERSONA_SUBPATH);"` outputs `_config/agents` cleanly (no ReferenceError).
- **Committed in:** `453de68` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 3 blocking)
**Impact on plan:** The auto-fix is essential for the constant to load at module init time; required for correctness with zero scope creep. The plan author's stated assumption was simply incorrect — the file had no imports.

## Issues Encountered

- **Pre-existing prettier formatting warning on `tools/installer/ide/templates/agent-command-template.md`** — confirmed pre-existing via `git stash && prettier --check`; exists before plan 12-01 changes. Out-of-scope per Rule 3 scope boundary. Logged to `.planning/phases/12-agent-dir-relocation-release/deferred-items.md` (commit `e5b6c89`). Plan 12-01 acceptance criterion "format:check exits 0" is unsatisfied for this file but the cause predates the plan; the plan's edit (single-line swap on line 16) introduced no formatting changes.

## Confirmations

- **JSDoc examples preserved:** `git diff` on `path-utils.js` shows zero changes to JSDoc lines around 27, 57-62, 81 (the `gomad/agents/pm.md` source-path notation illustrations).
- **Orthogonal touchpoints unchanged:** `git diff tools/installer/ide/shared/artifacts.js` and `git diff tools/installer/core/manifest-generator.js` both empty (these reference the orthogonal `<gomadDir>/agents/` STANDALONE pattern, not the persona body location).
- **Single-commit co-landing of Task 2:** `git log -1 --name-only HEAD~1 --pretty=format:""` lists exactly `tools/installer/core/installer.js`, `tools/installer/ide/shared/agent-command-generator.js`, `tools/installer/ide/templates/agent-command-template.md` (commit `dbb3bc2`).
- **AGENT_SOURCES integrity:** 8 personas still listed (analyst, tech-writer, pm, ux-designer, architect, sm, dev, solo-dev) — `node -e "console.log(require('./tools/installer/ide/shared/agent-command-generator').AgentCommandGenerator.AGENT_SOURCES.length)"` returns `8`.

## Notes for Downstream Plans

- **Plan 12-02 (cleanup-planner):** Now has `LEGACY_AGENTS_PERSONA_SUBPATH = 'gomad/agents'` exported from path-utils.js — wire the v12 detector against this constant instead of a duplicated literal.
- **Plan 12-03 (detectCustomFiles whitelist):** `AgentCommandGenerator.AGENT_SOURCES` is the canonical 8-entry shortname list; consume that for the whitelist instead of re-deriving.
- **Plan 12-06 (AGENT-07 Phase C body-regex test):** The launcher template's literal `{project-root}/_gomad/_config/agents/{{shortName}}.md` is now the regex target — keep the writer in lockstep if the body-regex assertion is added.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Fresh `gomad install` now writes persona bodies to `_gomad/_config/agents/<shortName>.md` and launcher stubs reference that same path. Pipeline is internally consistent.
- v1.2 → v1.3 upgrade path is **not yet handled** — running 12-01 alone on a v1.2 workspace would orphan the legacy `_gomad/gomad/agents/` files (Plan 12-02 adds the cleanup-planner v12 detector for this).
- Plan 12-02 can begin: cleanup-planner integration + banner additions at `installer.js:518-555` are at distinct line ranges from the comment edit at `:299` and merge cleanly.

## Self-Check: PASSED

- File `tools/installer/ide/shared/path-utils.js`: FOUND
- File `tools/installer/ide/shared/agent-command-generator.js`: FOUND
- File `tools/installer/ide/templates/agent-command-template.md`: FOUND
- File `tools/installer/core/installer.js`: FOUND
- File `.planning/phases/12-agent-dir-relocation-release/deferred-items.md`: FOUND
- Commit `453de68` (Task 1): FOUND
- Commit `dbb3bc2` (Task 2 atomic): FOUND
- Commit `e5b6c89` (deferred-items doc): FOUND

---
*Phase: 12-agent-dir-relocation-release*
*Completed: 2026-04-27*
