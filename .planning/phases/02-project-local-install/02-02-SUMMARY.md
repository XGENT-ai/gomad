---
phase: 02-project-local-install
plan: 02
subsystem: tests
tags: [tests, integration, project-local, verification]

requires:
  - phase: 02-project-local-install
    plan: 01
    provides: tools/installer.js, assets/, simplified CLI
provides:
  - test coverage for project-local install behavior (TST-02, TST-03)
  - test coverage for removed sync/update commands and --global-only flag
  - updated structure assertions matching new tools/ layout
affects: [03-bmad-decoupling]

tech-stack:
  added: []
  patterns:
    - "Source-file string assertions to verify path/usage invariants without runtime side effects"
    - "Negative regex assertions to enforce removed command surface"

key-files:
  created: []
  modified:
    - test/test-installation.js
    - test/test-module.js
  deleted: []

key-decisions:
  - "Verify TST-03 (no homedir) via static source string check rather than runtime mocking — fastest, deterministic, no fs sandbox needed"
  - "Verify TST-02 (process.cwd target) via source string check for the literal CLAUDE_DIR expression"
  - "Use word-boundary regex (\\bsync\\b) on --help output to assert command removal without breaking on substrings like 'syncing'"

patterns-established:
  - "Static source assertions for installer invariants: read tools/installer.js and assert.ok(!src.includes(...))"

requirements-completed: [TST-02, TST-03]

duration: ~6min
completed: 2026-04-07
---

# Phase 02 Plan 02: Test Updates for Project-Local Install Summary

**Updated test/test-installation.js and test/test-module.js to verify project-local install paths, absent removed commands/flags, and the new tools/ file layout**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-04-07T18:10:00Z
- **Completed:** 2026-04-07T18:16:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- `test/test-installation.js` rewritten:
  - Removed obsolete "Integration: sync populates global/" describe block (sync-upstream.js was deleted in 02-01)
  - Removed `install --preset lean --yes --global-only` test (flag no longer exists)
  - Replaced with `install --preset lean --yes` test
  - Help test now also asserts `mcp` is listed and asserts removed commands `sync`/`update` are absent (word-boundary regex)
  - New `Project-local installation` describe block adds three TST-02/TST-03 verification tests:
    - `installer.js does not reference homedir` — checks for `homedir`, `$HOME`, `~/.claude` strings
    - `installer uses process.cwd for CLAUDE_DIR` — asserts literal `join(process.cwd(), '.claude')`
    - `curator writes lockfile to process.cwd` — asserts literal `join(process.cwd(), 'gomad.lock.yaml')`
- `test/test-module.js` tool list updated from `['curator.js', 'global-installer.js', 'sync-upstream.js', 'package-skills.js']` to `['curator.js', 'installer.js', 'package-skills.js']`
- All 37 tests in the suite pass (`node --test`)

## Task Commits

1. **Task 1: Rewrite test-installation.js for project-local verification** — `b09cd6d` (test)
2. **Task 2: Update test-module.js tool list and structure assertions** — `17d3484` (test)

## Files Created/Modified

- `test/test-installation.js` — MODIFIED: removed sync block + global-only test, added Project-local installation block, updated help assertions (+31/-15)
- `test/test-module.js` — MODIFIED: tools array updated to `['curator.js', 'installer.js', 'package-skills.js']` (+1/-1)

## Decisions Made

- **Static source-file assertions over runtime mocking** for TST-02/TST-03: fastest path, no need for fs sandboxes or HOME env overrides, and the assertions document the exact expected expression (`join(process.cwd(), '.claude')`).
- **Word-boundary regex** (`\bsync\b`) for negative help-output assertion to avoid false positives if commander emits text containing "syncing" or "syncs" substrings.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

- The `install --preset lean --yes` test runs the real installer, which writes `./.claude/` inside the worktree. This was a pre-existing behaviour also true of the previous `--global-only` test. Cleaned up by removing `.claude/` after the test run; not gitignored, but only ever touched by tests in PROJECT_ROOT context. Logged for awareness — does not block this plan.

## Verification Results

- `node --test test/test-installation.js` → 9/9 pass (PASS)
- `node --test test/test-module.js` → 12/12 pass (PASS)
- `node --test` (full suite) → 37/37 pass (PASS)
- `grep -r "sync-upstream\|global-installer" test/` → no matches (PASS)
- `grep "global-only" test/test-installation.js` → no matches (PASS)
- `grep "homedir" test/test-installation.js` → only inside the negative assertion (PASS)
- test-installation.js help test asserts absence of `sync` and `update` (PASS)

## User Setup Required

None.

## Next Phase Readiness

- Phase 3 (BMAD decoupling) inherits a clean test surface that already verifies the project-local install contract. When the bmad-method peerDependency is removed, only the assertion on line 78 of test-module.js needs deleting.
- Phase 4 (final test polish) has a working baseline of 37 passing tests to build on.

## Self-Check: PASSED

- `test/test-installation.js` exists: FOUND
- `test/test-module.js` exists: FOUND
- `.planning/phases/02-project-local-install/02-02-SUMMARY.md` exists: FOUND (this file)
- Commit `b09cd6d` exists: FOUND
- Commit `17d3484` exists: FOUND
- `node --test` exit 0: CONFIRMED

---
*Phase: 02-project-local-install*
*Completed: 2026-04-07*
