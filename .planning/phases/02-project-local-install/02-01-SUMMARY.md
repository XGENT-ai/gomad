---
phase: 02-project-local-install
plan: 01
subsystem: infra
tags: [cli, installer, project-local, fs, yaml]

requires:
  - phase: 01-rename
    provides: gomad branding, lockfile rename, manifest rename
provides:
  - tools/installer.js targeting ./.claude/ in process.cwd()
  - assets/ source directory (renamed from global/)
  - Simplified CLI with 6 commands and no global flags
  - Manifest-based uninstall (no backup/restore)
  - Project-local lockfile written to process.cwd()
affects: [02-02, 03-bmad-decoupling, 04-tests]

tech-stack:
  added: []
  patterns:
    - "process.cwd() for target paths, __dirname for source assets"
    - "Manifest-tracked uninstall (no recursive .claude/ deletion)"
    - "Merge-copy install strategy (overwrite tracked, preserve user files)"

key-files:
  created:
    - tools/installer.js
  modified:
    - tools/curator.js
    - bin/gomad-cli.js
  deleted:
    - tools/global-installer.js
    - tools/sync-upstream.js
  renamed:
    - global/ -> assets/

key-decisions:
  - "Strip backup/restore entirely; git is the backup for project-local .claude/"
  - "Lockfile lives in process.cwd() so each project tracks its own selections"
  - "Uninstall reads manifest and removes only tracked files; never recursively deletes .claude/"
  - "Install uses merge-copy: overwrites gomad files but preserves user customizations"

patterns-established:
  - "Source vs target separation: __dirname for package assets, process.cwd() for project install target"
  - "Manifest schema: { installed_at, version, files: { rules, commands, hooks, agents } }"
  - "ASSET_DIRS map drives all install/uninstall iteration"

requirements-completed: [INS-01, INS-02, INS-03, INS-04, INS-05, INS-06]

duration: ~15min
completed: 2026-04-07
---

# Phase 02 Plan 01: Project-Local Installer Summary

**Project-local installer rewritten from ~/.claude/ to ./.claude/ with manifest-based uninstall, no backup system, and CLI simplified to 6 commands**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-04-07T09:53:00Z
- **Completed:** 2026-04-07T10:08:32Z
- **Tasks:** 2
- **Files modified:** 96 (3 source edits + 93 file renames)

## Accomplishments

- New `tools/installer.js` (~250 lines) targets `./.claude/` in `process.cwd()` with no homedir references
- Backup/restore system stripped entirely; git provides versioning for project-local files
- Manifest-based uninstall removes only tracked files (no risk of nuking user `.claude/` content)
- Merge-copy install preserves user customizations alongside gomad assets
- `tools/curator.js` lockfile path fixed to write to `process.cwd()` so each project owns its lockfile
- Old `tools/global-installer.js` and `tools/sync-upstream.js` deleted
- `global/` source directory renamed to `assets/` (D-10)
- CLI simplified from 8 to 6 commands: `install`, `curate`, `status`, `uninstall`, `package`, `mcp` (removed `sync` and `update`)
- All `--global` and `--global-only` flags removed
- All CLI imports of `tools/global-installer.js` updated to `tools/installer.js`

## Task Commits

1. **Task 1: Create tools/installer.js and update tools/curator.js lockfile path** - `dcdd28d` (feat)
2. **Task 2: Delete old files, rename global/ to assets/, update CLI commands** - `a7729db` (refactor)

## Files Created/Modified

- `tools/installer.js` - NEW: project-local install/uninstall/status with manifest tracking
- `tools/curator.js` - MODIFIED: lockfile path uses `process.cwd()` instead of `__dirname`
- `bin/gomad-cli.js` - REWRITTEN: 6 commands, no global flags, imports from `tools/installer.js`
- `tools/global-installer.js` - DELETED
- `tools/sync-upstream.js` - DELETED
- `global/` - RENAMED to `assets/` (93 files preserved via `git mv`)

## Decisions Made

- Followed all locked decisions D-01 through D-11 exactly as specified in plan/CONTEXT.
- Status output now displays project-relative path (`relative(process.cwd(), CLAUDE_DIR)`) instead of homedir-relative path.
- Manifest schema simplified: removed `backups` field since no backup system exists.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. All acceptance criteria met on first verification pass.

## Verification Results

- `grep -c homedir tools/installer.js` -> 0 (PASS)
- `grep -c process.cwd tools/installer.js` -> 4 (PASS)
- `grep` for backupDir/backupPath/globalOnly/installProjectModule/bmad in installer.js -> 0 (PASS)
- `tools/curator.js` lockfile line contains `process.cwd()` (PASS)
- `tools/global-installer.js` deleted (PASS)
- `tools/sync-upstream.js` deleted (PASS)
- `assets/` exists with `agents`, `commands`, `hooks`, `rules` subdirs (PASS)
- `global/` no longer exists (PASS)
- `bin/gomad-cli.js` contains 0 references to global-installer/sync-upstream/--global-only/--global (PASS)
- `node bin/gomad-cli.js --help` shows install, curate, status, uninstall, package, mcp -- no sync, no update (PASS)

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 02-02 (test updates) can now reference the new `tools/installer.js` exports and the renamed `assets/` directory.
- Phase 3 (BMAD decoupling) inherits a clean installer surface with no BMAD coupling left in `installer.js` or CLI.
- Skills installation gap remains (acknowledged, deferred to Phase 3 per research).

## Self-Check: PASSED

- `tools/installer.js` exists: FOUND
- `tools/curator.js` exists: FOUND
- `bin/gomad-cli.js` exists: FOUND
- `assets/` directory exists: FOUND
- `tools/global-installer.js` removed: CONFIRMED
- `tools/sync-upstream.js` removed: CONFIRMED
- `global/` removed: CONFIRMED
- Commit `dcdd28d` exists: FOUND
- Commit `a7729db` exists: FOUND

---
*Phase: 02-project-local-install*
*Completed: 2026-04-07*
