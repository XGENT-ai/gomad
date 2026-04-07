---
phase: 01-rename
plan: 01
subsystem: cli
tags: [rename, branding, gomad, cli, catalog, yaml]

# Dependency graph
requires: []
provides:
  - "All source files, catalogs, module files, and docs reference gomad exclusively"
  - "Agent directories use plain descriptive names (analysis/, planning/, research/, review/)"
  - "CLI entry point is bin/gomad-cli.js"
  - "Lock/manifest constants reference gomad names"
affects: [01-02, 02-localize, 03-decouple, 04-tests]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "gomad branding across all source, config, and docs"
    - "Plain agent directory names without framework prefix"

key-files:
  created:
    - bin/gomad-cli.js
    - src/module/agents/analysis/
    - src/module/agents/planning/
    - src/module/agents/research/
    - src/module/agents/review/
    - src/module/agents/skill-manifest.yaml
  modified:
    - package.json
    - tools/global-installer.js
    - tools/curator.js
    - tools/sync-upstream.js
    - tools/package-skills.js
    - catalog/agents.yaml
    - catalog/presets.yaml
    - catalog/skills.yaml
    - catalog/commands.yaml
    - catalog/hooks.yaml
    - src/module/module.yaml
    - src/module/module-help.csv
    - README.md
    - test/test-module.js
    - test/test-installation.js
    - test/test-presets.js

key-decisions:
  - "Strip bmad- prefix from agent dirs to plain names (analysis/ not bmad-analysis/)"
  - "Rename bmad-enhanced preset to enhanced"
  - "Update test assertions alongside source to maintain passing test suite"

patterns-established:
  - "Agent directories named by function: analysis/, planning/, research/, review/"
  - "Lock file: gomad.lock.yaml; manifest: .gomad-manifest.yaml; backup prefix: .gomad-backup-"

requirements-completed: [REN-01, REN-02, REN-03, REN-04, REN-05, REN-06]

# Metrics
duration: 8min
completed: 2026-04-07
---

# Phase 1 Plan 1: Rename Summary

**Complete mobmad-to-gomad rebrand across CLI, package.json, 5 catalogs, module files, 4 agent directories, 14 skill manifests, and all test assertions**

## Performance

- **Duration:** 8 min
- **Started:** 2026-04-07T06:58:13Z
- **Completed:** 2026-04-07T07:06:11Z
- **Tasks:** 2
- **Files modified:** 51 (32 renames + 19 content updates)

## Accomplishments
- Renamed CLI entry point from bin/mobmad-cli.js to bin/gomad-cli.js
- Renamed 4 agent directories stripping bmad- prefix, plus agent manifest and 14 skill manifests
- Updated all string content in source, catalogs, module files, README, and tests to reference gomad
- Zero occurrences of "mobmad" or "bmad-" agent prefix remain in source/config/docs

## Task Commits

Each task was committed atomically:

1. **Task 1: Rename files and directories** - `7e49aa7` (feat)
2. **Task 2: Update all string content** - `075b666` (feat)

## Files Created/Modified
- `bin/gomad-cli.js` - CLI entry point renamed from mobmad-cli.js, updated all string content
- `package.json` - Name, description, bin field, keywords updated to gomad
- `tools/global-installer.js` - Lockfile, manifest, backup path constants updated
- `tools/curator.js` - Lockfile path and UI text updated
- `tools/sync-upstream.js` - Lockfile path and UI text updated
- `tools/package-skills.js` - Lockfile path, UI text, and manifest filename updated
- `catalog/agents.yaml` - 16 agent names stripped of bmad- prefix
- `catalog/presets.yaml` - bmad-enhanced renamed to enhanced, 32 agent refs updated
- `catalog/skills.yaml` - Header comment updated
- `catalog/commands.yaml` - Header comment updated
- `catalog/hooks.yaml` - Header comment updated
- `src/module/module.yaml` - Name, description, preset refs updated
- `src/module/module-help.csv` - Module name updated to GOMAD
- `src/module/agents/skill-manifest.yaml` - 16 agent keys stripped of bmad- prefix
- `README.md` - Complete rewrite for gomad branding
- `test/test-module.js` - Updated assertions for new names/paths
- `test/test-installation.js` - Updated CLI path and lockfile assertions
- `test/test-presets.js` - Updated preset name and agent filter assertions

## Decisions Made
- Updated test files alongside source (Rule 3: auto-fix blocking -- tests would fail referencing old paths/names)
- Renamed module.yaml name from "My Own BMAD" to "GOMAD" and updated module-help.csv module column
- Left peerDependencies bmad-method untouched per plan (Phase 3 scope)
- Left CLAUDE.md untouched (it contains project context/history mentioning old name)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Updated test files referencing old names/paths**
- **Found during:** Task 2 (string content update)
- **Issue:** test-module.js, test-installation.js, and test-presets.js contain assertions for old names (mobmad, bmad-enhanced, bmad-analysis/ dirs, bmad-skill-manifest.yaml) that would cause test failures
- **Fix:** Updated all test assertions to match new names and paths
- **Files modified:** test/test-module.js, test/test-installation.js, test/test-presets.js
- **Verification:** grep confirms zero mobmad/bmad- references in test files
- **Committed in:** 075b666 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Essential for test suite correctness. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All source files reference gomad exclusively
- Ready for Plan 01-02 (test verification) to confirm the test suite passes
- CLAUDE.md still contains old references for project history context (intentional)

---
*Phase: 01-rename*
*Completed: 2026-04-07*

## Self-Check: PASSED
