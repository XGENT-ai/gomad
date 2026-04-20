---
phase: 07-upgrade-safety-manifest-driven-cleanup
fixed_at: 2026-04-20T20:00:00Z
review_path: .planning/phases/07-upgrade-safety-manifest-driven-cleanup/07-REVIEW.md
iteration: 1
findings_in_scope: 4
fixed: 4
skipped: 0
status: all_fixed
---

# Phase 7: Code Review Fix Report

**Fixed at:** 2026-04-20
**Source review:** `.planning/phases/07-upgrade-safety-manifest-driven-cleanup/07-REVIEW.md`
**Iteration:** 1

**Summary:**

- Findings in scope: 4 (Critical + Warning; 7 Info findings deferred per scope)
- Fixed: 4
- Skipped: 0

All 4 Warning findings were fixed and verified against the phase 7 test
suite (70 + 58 + 50 + 15 = 193 assertions across `test-cleanup-planner.js`,
`test-cleanup-execute.js`, `test-legacy-v11-upgrade.js`, `test-dry-run.js`)
plus the full `test-manifest-corruption.js` (33 assertions) and
`test-installation-components.js` (205 assertions). All commits were made
through the repo's pre-commit hook stack (eslint, prettier, markdownlint,
format check, install-component tests) without bypass.

## Fixed Issues

### WR-01: Corrupt-quote fixture may parse silently under csv-parse default relax settings

**Files modified:** `tools/installer/core/installer.js`
**Commit:** `dd8996d`
**Applied fix:** Added `relax_quotes: false` and `relax_column_count: false`
to the `csv.parse` options in `readFilesManifest` (line ~767). The review's
preferred option (a) — pin the parser contract — was chosen over option (b)
(strengthen the fixture) because it enforces D-33 corruption classification
at the parser level and is resilient to future csv-parse default drift.

**Verification:**

- `node -c` syntax OK
- `test-manifest-corruption.js`: 33/33 pass (unclosed-quote and wrong-arity
  fixtures still emit MANIFEST_CORRUPT as contracted by D-33)

### WR-02: `manifest-generator.js` suppresses `fs.readFile` / `fs.readdir` errors silently in multiple places

**Files modified:** `tools/installer/core/manifest-generator.js`
**Commit:** `d83d362`
**Applied fix:** Replaced five bare `catch {}` / `catch { return ... }`
blocks with ENOENT-aware handlers that preserve the idempotent-install
silent path (ENOENT/ENOTDIR → silent) while surfacing genuine I/O failures
(EACCES, EIO, EMFILE, ELOOP) and YAML parse errors via
`prompts.log.warn`. Locations patched:

1. `collectSkills` `walk()` → `readdir` (lines 192–203)
2. `parseSkillMd` `readFile` + `yaml.parse` (lines 319–332)
3. `getAgentsFromDirRecursive` → `readdir` (lines 365–375)
4. `writeMainManifest` existing-manifest read (lines 469–480) — the most
   impactful: existing behavior silently regenerated `installDate`
   metadata on read failure, clobbering preserved state. Now warns with
   explicit "installDate and customModules metadata will be regenerated"
5. `_hasSkillMdRecursive` → `readdir` (lines 824–834)

**Verification:**

- `node -c` syntax OK
- `test-installation-components.js`: 205/205 pass (parseSkillMd and skill
  scanner suites exercise the new warn path without regression)

### WR-03: `executeCleanupPlan` leaves orphaned partial backup directory on mid-snapshot failure

**Files modified:** `tools/installer/core/cleanup-planner.js`,
`test/test-cleanup-execute.js`
**Commit:** `a212def`
**Applied fix:** Wrapped the pre-remove phase
(`ensureDir` → `snapshotFiles` → `writeMetadata` → `writeBackupReadme`) in
a try/catch that best-effort removes `backupRoot` on any failure, then
re-throws. Used `.catch(() => {})` on the cleanup remove so it never
masks the original error. D-34 (originals survive) is unchanged because
`fs.remove` loop still runs only after a successful pre-remove phase.

Added a focused test assertion (3 new checks, now 58/55 → 58/58 total)
that:

1. Seeds one real source + one ghost (non-existent) source
2. Forces `snapshotFiles` to succeed on item 0, fail on item 1
3. Asserts executor throws, original real file survives (D-34),
   and `_gomad/_backups/` contains zero entries (rollback swept)

**Verification:**

- `node -c` syntax OK
- `test-cleanup-execute.js`: 58/58 pass (was 55/55 pre-fix)
- All 4 phase 7 test files: 193/193 pass

### WR-04: Redundant ternary in `buildCleanupPlan` is a maintainability hazard

**Files modified:** `tools/installer/core/cleanup-planner.js`
**Commit:** `af234e1`
**Applied fix:** Collapsed
`installRoot === '_gomad' ? path.join(ws, '_gomad') : path.join(ws, installRoot)`
to the single `path.join(workspaceRoot, installRoot)`. Added a comment
pinning the current equivalence and noting that a future asymmetric
remap of `_gomad` should re-introduce the branch with explicit
documentation.

**Verification:**

- `node -c` syntax OK
- `test-cleanup-planner.js`: 70/70 pass (covers both `_gomad` and IDE
  install_root values — equivalence confirmed end-to-end)

## Skipped Issues

None — all 4 in-scope findings were fixed.

---

_Fixed: 2026-04-20_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
