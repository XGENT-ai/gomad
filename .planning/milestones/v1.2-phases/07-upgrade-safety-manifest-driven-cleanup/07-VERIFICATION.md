---
phase: 07-upgrade-safety-manifest-driven-cleanup
verified: 2026-04-20T11:35:00Z
status: passed
score: 6/6
overrides_applied: 0
---

# Phase 7: Upgrade Safety — Manifest-Driven Cleanup Verification Report

**Phase Goal:** Deliver the single highest-severity change in v1.2 — safe, reversible manifest-driven cleanup that removes stale files on re-install without ever deleting outside allowed install roots. Includes realpath containment, dual-format sniff for v1.1→v1.2 legacy cleanup, optional backup snapshotting, and a `--dry-run` flag so users can preview destructive actions before they happen.
**Verified:** 2026-04-20T11:35:00Z
**Status:** passed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | On re-install with a prior `files-manifest.csv` present, installer removes every stale entry before writing new files; idempotent second `gomad install` produces no change to disk | VERIFIED | `test-legacy-v11-upgrade.js` Test 3: "No new backup created on idempotent re-install" + "Non-config-yaml manifest rows bit-identical on re-install" — 50/50 green |
| 2 | Any manifest entry that fails realpath-containment under allowed install roots is refused with a clear error — absolute paths, `../` traversal, and symlink-escape attempts never touch a file outside the install roots | VERIFIED | `buildCleanupPlan` throws `ManifestCorruptError` (code `CONTAINMENT_FAIL`) on containment failure; `installer.js` catches and logs `MANIFEST_CORRUPT` + skips cleanup. Fixture `escape-traverse.csv` exercises the path. `test-cleanup-planner.js` 70/70 assertions green. `isContained` uses `path.relative` (not `startsWith`) to prevent prefix-collision false positives. |
| 3 | First v1.2 install on a v1.1 workspace detects legacy state and cleans known v1.1 artifact paths (`.claude/skills/gm-agent-*/`) explicitly | VERIFIED | `isV11Legacy()` detects absence of v2 manifest + presence of any of the 7 legacy dirs. `buildCleanupPlan` v11 branch snapshots all 7. `test-legacy-v11-upgrade.js` Test 1 + Test 4 confirm all 7 dirs snapshotted + removed with `reason=legacy_v1_cleanup`. |
| 4 | `gomad install --dry-run` prints the full cleanup + copy plan and exits without touching disk; running without `--dry-run` then performs the identical actions | VERIFIED | `--dry-run` flag declared in `commands/install.js` options[]; `config.dryRun = !!options.dryRun` propagated through `Config`; `_prepareUpdateState` calls `renderPlan` + `process.exit(0)` before any disk write. `test-dry-run.js` 15/15 green: content-addressed tree hash unchanged, TO SNAPSHOT/TO REMOVE/Summary present, `_backups/` not created. Dry-run-equals-actual identity verified across two parallel workspaces. |
| 5 | Before any destructive removal, files-to-be-removed are snapshotted into `_gomad/_backups/<timestamp>/` preserving relative-path structure; a documented recovery procedure restores from the backup | VERIFIED | `executeCleanupPlan` chain: snapshotFiles → writeMetadata → writeBackupReadme → fs.remove (no try/catch — ENOSPC aborts before remove). `docs/upgrade-recovery.md` (104 lines) documents `cp -R` recovery and `metadata.json.gomad_version` compat check. `test-cleanup-execute.js` 55/55 green including mtime preservation, cp-R round-trip byte-match, and snapshot-failure-prevents-remove. |
| 6 | A manifest corrupted with BOM, CRLF, quoted-field edge cases, or malformed rows does NOT cause mass-deletion — installer logs `MANIFEST_CORRUPT`, skips cleanup, and proceeds with idempotent install | VERIFIED | `readFilesManifest` has `bom: true` (BOM normalized silently); csv-parse error → `MANIFEST_CORRUPT` log + return `[]`; per-row missing columns → `CORRUPT_ROW` log + row skipped, rest preserved. IO error → `MANIFEST_CORRUPT` log + return `[]`. `test-manifest-corruption.js` 33/33 green across 11 fixture files. |

**Score: 6/6 truths verified**

---

### Required Artifacts

| Artifact | Min Lines | Actual | Status | Details |
|----------|-----------|--------|--------|---------|
| `tools/installer/core/cleanup-planner.js` | 320 | 513 | VERIFIED | Exports all 12 functions/constants; pure plan builder + executor + renderer confirmed |
| `tools/installer/core/installer.js` | — | — | VERIFIED | `readFilesManifest` hardened with `bom: true`, `MANIFEST_CORRUPT`, `CORRUPT_ROW`; `_prepareUpdateState` wired to `buildCleanupPlan` + `executeCleanupPlan` + dry-run exit |
| `tools/installer/core/manifest-generator.js` | — | — | VERIFIED | `_gomad/_backups/` exclusion present in POSIX, Windows, and native-sep forms |
| `tools/installer/commands/install.js` | — | — | VERIFIED | `--dry-run` option in options[] array; `config.dryRun = !!options.dryRun` propagated |
| `tools/installer/core/config.js` | — | — | VERIFIED | `dryRun` field in constructor + `Config.build` |
| `docs/upgrade-recovery.md` | 50 | 104 | VERIFIED | Documents cp-R recovery, metadata.json schema, gomad_version compat check |
| `test/test-cleanup-planner.js` | 150 | 741 | VERIFIED | 70 assertions, all green |
| `test/test-manifest-corruption.js` | 120 | 264 | VERIFIED | 33 assertions, all green |
| `test/test-cleanup-execute.js` | 180 | 442 | VERIFIED | 55 assertions, all green |
| `test/test-legacy-v11-upgrade.js` | 150 | 296 | VERIFIED | 50 assertions, all green |
| `test/test-dry-run.js` | 100 | 286 | VERIFIED | 15 assertions, all green |
| `test/fixtures/phase-07/manifests/` (11 fixtures) | — | 11 files | VERIFIED | All 11 fixture CSVs present: valid-v2, corrupt-bom, corrupt-crlf, corrupt-quote, corrupt-arity, corrupt-header, corrupt-row-missing, corrupt-empty-path, escape-absolute, escape-traverse, duplicate-paths |
| `package.json` test:cleanup-all | — | — | VERIFIED | Script chains all 5 test files |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `test/test-cleanup-planner.js` | `cleanup-planner.js` | `require('../tools/installer/core/cleanup-planner')` | VERIFIED | Confirmed in test file header and imports |
| `test/test-manifest-corruption.js` | `installer.js:readFilesManifest` | instantiates Installer and calls readFilesManifest with fixture path | VERIFIED | Confirmed — fixture path passed to readFilesManifest |
| `cleanup-planner.js` | `AgentCommandGenerator.AGENT_SOURCES` | `LEGACY_AGENT_SHORT_NAMES = AgentCommandGenerator.AGENT_SOURCES.map(a => a.shortName)` | VERIFIED | Line 41 of cleanup-planner.js |
| `manifest-generator.js:writeFilesManifest` | D-39 backup exclusion | POSIX/Win/native prefix filter at top of allInstalledFiles loop | VERIFIED | Three-form check confirmed; D-39 exclusion tests in test-cleanup-planner.js pass |
| `commands/install.js` | installer options | `config.dryRun = !!options.dryRun` | VERIFIED | Line 78 of install.js |
| `installer.js:_prepareUpdateState` | `cleanup-planner.js:buildCleanupPlan` | require + call before any disk write | VERIFIED | Line 545 of installer.js |
| `installer.js:_prepareUpdateState` | `cleanup-planner.js:executeCleanupPlan` | called when dryRun is falsy AND plan non-empty | VERIFIED | Line 564 of installer.js |
| `installer.js:_prepareUpdateState` | `cleanup-planner.js:renderPlan` | called when dryRun truthy; then process.exit(0) | VERIFIED | Lines 553-556 of installer.js |
| `docs/upgrade-recovery.md` | `_gomad/_backups/<ts>/metadata.json` | documented schema + recovery command | VERIFIED | `cp -R` command present in docs |

---

### Data-Flow Trace (Level 4)

Not applicable — this phase produces CLI tooling and file-system operations, not rendering components. Behavioral verification conducted via test execution instead.

---

### Behavioral Spot-Checks

| Behavior | Result | Status |
|----------|--------|--------|
| test-cleanup-planner.js — 70 assertions (pure logic: isContained, formatTimestamp, isV11Legacy, uniqueBackupDir, buildCleanupPlan, D-39 exclusion) | 70 passed, 0 failed | PASS |
| test-manifest-corruption.js — 33 assertions (BOM, CRLF, quote corruption, per-row CORRUPT_ROW, whole-manifest MANIFEST_CORRUPT) | 33 passed, 0 failed | PASS |
| test-cleanup-execute.js — 55 assertions (executeCleanupPlan, snapshotFiles, writeMetadata, renderPlan, cp-R recovery, timestamp collision) | 55 passed, 0 failed | PASS |
| test-legacy-v11-upgrade.js — 50 assertions (E2E npm-pack harness: v1.1→v1.2 upgrade, custom.md recovery, idempotent re-install, bare 7-dir workspace) | 50 passed, 0 failed | PASS |
| test-dry-run.js — 15 assertions (no-disk-write proof, dry-run-equals-actual identity, fresh-workspace plan) | 15 passed, 0 failed | PASS |

**Total: 223 assertions, 0 failures across 5 test suites**

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| INSTALL-05 | 07-01, 07-02 | Re-install reads prior manifest, realpath-contains each entry, removes stale entries before writing new ones | SATISFIED | `_prepareUpdateState` + `buildCleanupPlan` + `executeCleanupPlan` wired; idempotency verified by test-legacy-v11-upgrade.js Test 3 |
| INSTALL-06 | 07-01 | Entries escaping allowed install roots refused with clear error; no deletion outside install roots | SATISFIED | `isContained` + `ManifestCorruptError(CONTAINMENT_FAIL)` + batch poison posture in `buildCleanupPlan`; fixture `escape-traverse.csv` drives the path |
| INSTALL-07 | 07-02 | First v1.2 install on v1.1 workspace cleans known legacy `.claude/skills/gm-agent-*/` paths | SATISFIED | `isV11Legacy()` + `buildCleanupPlan` v11 branch; test-legacy-v11-upgrade.js Test 1 + Test 4 (50 assertions green) |
| INSTALL-08 | 07-02 | `--dry-run` flag prints planned cleanup + copy actions without touching disk | SATISFIED | `--dry-run` in `commands/install.js` options[]; `config.dryRun` propagation; `_prepareUpdateState` dry-run branch; test-dry-run.js 15/15 green |
| INSTALL-09 | 07-02 | Before destructive cleanup, installer snapshots into `_gomad/_backups/<timestamp>/`; reversible | SATISFIED | `executeCleanupPlan` snapshot-before-remove chain; `writeMetadata` D-38 schema; `docs/upgrade-recovery.md` recovery procedure; test-cleanup-execute.js 55/55 green |

All 5 phase 7 requirement IDs (INSTALL-05 through INSTALL-09) are covered. No orphaned requirements.

---

### Anti-Patterns Found

No blockers or warnings identified. Specific items checked:

- No `TODO/FIXME/PLACEHOLDER` in phase 7 source files.
- No `return null` or `return []` stubs in the cleanup path — the `return []` in `readFilesManifest` is a legitimate corruption-signal sentinel (not a stub), backed by 33 tests confirming the correct classification.
- No `console.log` statements — `prompts.log.*` used throughout.
- No hardcoded empty data in rendering paths.
- `executeCleanupPlan` returns `null` only when `plan.to_snapshot.length === 0 && plan.to_remove.length === 0` — this is correct guard logic, not a stub.

---

### Human Verification Required

None. All success criteria are verifiable programmatically and confirmed green via test execution.

---

### Gaps Summary

No gaps. All 6 success criteria from the ROADMAP are verified against the actual codebase:

1. **Stale-entry cleanup + idempotency**: `buildCleanupPlan` + `executeCleanupPlan` + `newInstallSet` from prior manifest realpaths ensures idempotency. E2E test confirms no new backup on second install.
2. **Realpath containment**: `isContained` uses `path.relative` (not `startsWith`) to block prefix-collision false negatives. Batch-poison posture (`ManifestCorruptError`) refuses the entire manifest on any containment escape.
3. **Legacy v1.1 detection and cleanup**: `isV11Legacy()` + the 7 `LEGACY_AGENT_SHORT_NAMES` from `AgentCommandGenerator.AGENT_SOURCES` (single source of truth). E2E test verifies all 7 dirs snapshotted and removed.
4. **`--dry-run` flag**: Wired from Commander through `Config` into `_prepareUpdateState`. Content-addressed workspace hash proof verifies zero disk writes.
5. **Backup snapshotting + recovery docs**: `executeCleanupPlan` snapshot-before-remove chain with no try/catch (ENOSPC aborts before remove). `docs/upgrade-recovery.md` documents cp-R + version compat check.
6. **Manifest corruption safety**: `bom: true` normalizes BOM silently; csv-parse errors trigger whole-manifest skip (`MANIFEST_CORRUPT`); per-row missing columns trigger row-skip (`CORRUPT_ROW`); IO errors trigger whole-manifest skip. 33 fixture-driven assertions confirm all classification paths.

---

_Verified: 2026-04-20T11:35:00Z_
_Verifier: Claude (gsd-verifier)_
