---
phase: 12-agent-dir-relocation-release
plan: 05
subsystem: testing
tags: [tests, e2e, upgrade, fresh-install, idempotency, npm-pack, csv-parse]

# Dependency graph
requires:
  - phase: 12-agent-dir-relocation-release
    plan: 01
    provides: "AGENTS_PERSONA_SUBPATH constant + extractPersonas writer landing personas at _gomad/_config/agents/<shortName>.md (target layout asserted by both tests)"
  - phase: 12-agent-dir-relocation-release
    plan: 02
    provides: "isV12LegacyAgentsDir detector + v12 cleanup branch + top-level meta.reason='manifest_cleanup' (asserted by test-legacy-v12-upgrade.js)"
  - phase: 12-agent-dir-relocation-release
    plan: 03
    provides: "detectCustomFiles whitelist for v1.3 persona .md files (proved by test-v13-agent-relocation.js idempotency assertion — backups.length === 0)"
  - phase: 09-agent-as-command-migration
    provides: "Launcher-form slash command contract (.claude/commands/gm/agent-*.md) + persona body extraction at install time"
provides:
  - "test/test-legacy-v12-upgrade.js — v1.2 → v1.3 upgrade E2E test (clone of v11 pattern per D-11) with NETWORK-FREE manual synthesis of v1.2 install state. 32 assertions including AGENT-01/03/04/06 + idempotent re-install. Top-level meta.reason single-path assertion (Blocker 4 closure)."
  - "test/test-v13-agent-relocation.js — Fresh v1.3 install + idempotency E2E test. 28 assertions including AGENT-01/02/03/05/09. Lighter CLI-driven scaffold (no npm pack)."
affects:
  - 12-06 (existing test-gm-command-surface.js gets the Phase C body-regex extension for AGENT-07; orthogonal to these tests)
  - 12-08 (release commit wires `test:legacy-v12-upgrade` and `test:v13-agent-relocation` npm scripts into package.json + the `quality` gate)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pattern: NETWORK-FREE manual synthesis of legacy install state (D-11) — hand-roll the manifest CSV + persona seed files in tempdir; reuse the project's escapeCsv idiom (mirrors manifest-generator.js:686) instead of adding csv-stringify"
    - "Pattern: TWO test scaffolds for two purposes — (a) full npm pack + npm install harness for upgrade tests that exercise the published bin (mirrors test-legacy-v11-upgrade.js); (b) lighter direct CLI invocation for fresh-install tests (mirrors test-domain-kb-install.js)"
    - "Pattern: SINGLE-PATH assertion on TOP-LEVEL metadata.reason — `meta.reason === 'manifest_cleanup'` with NO per-entry fallback (Blocker 4 closure). writeMetadata at cleanup-planner.js:445-458 emits only top-level reason; per-entry shape is {install_root, relative_path, orig_hash, was_modified} with no reason field."
    - "Pattern: `try/finally` tempdir + tarball cleanup so test failures don't leak /tmp entries"

key-files:
  created:
    - "test/test-legacy-v12-upgrade.js — 302 lines; npm pack + install harness; seedV12Workspace synthesizes v1.2 state (8 persona files + manifest CSV with 7-col v2 schema + 8 launcher stubs at OLD path + optional .customize.yaml); 32 assertions including TOP-LEVEL meta.reason single-path assertion"
    - "test/test-v13-agent-relocation.js — 156 lines; direct gomad-cli.js invocation; first install asserts new-location personas + manifest rows + launcher-stub paths; second install asserts ZERO new backup dirs (proves AGENT-05 whitelist)"
  modified: []

key-decisions:
  - "Manifest CSV columns hand-rolled to match manifest-generator.writeFilesManifest exactly (`type,name,module,path,hash,schema_version,install_root` — 7 cols, schema_version='2.0', install_root='_gomad'). Read from manifest-generator.js:691 to verify before writing the seed."
  - "Top-level `meta.reason === 'manifest_cleanup'` is a SINGLE-PATH assertion with no `||` fallback to `meta.files[].reason`. Verified by reading writeMetadata at cleanup-planner.js:445-458 — the per-entry shape enumerates only `{install_root, relative_path, orig_hash, was_modified}` and silently drops other fields. A `||` fallback would silently green-light a regression where the v12 branch produced the wrong reason value."
  - "v12 upgrade test uses `--tools claude-code` (not `--tools none`) because launcher-stub assertions require `.claude/commands/gm/agent-*.md` to be regenerated. Same flag set used by both tests."
  - "Hand-rolled escapeCsv + writeCsv helpers mirror manifest-generator.js:686 idiom. csv-stringify is NOT a project dep (RESEARCH §'Don't Hand-Roll' exception); csv-parse IS a dep and is reused in test-v13-agent-relocation.js for reading the manifest."
  - "v11 test file is byte-for-byte UNCHANGED — `git diff test/test-legacy-v11-upgrade.js` empty. Confirmed via git status before each commit."
  - "Both test files have ZERO new dependencies — only `node:*`, `fs-extra`, `csv-parse/sync`, `crypto` (built-in)."

patterns-established:
  - "Pattern: NETWORK-FREE legacy install seeding for upgrade E2E tests — hand-craft the manifest CSV + persona seed files + launcher stubs in a tempdir, then run the v(N+1) installer over it. Avoids npm-registry round-trip and version drift between fixture and shipped behavior."
  - "Pattern: Two-scaffold split — full `npm pack` harness for tests where the published bin shape matters (upgrade simulation); direct `node tools/installer/gomad-cli.js` invocation for tests where only installer correctness matters (fresh install). Faster CI when the bin shape is not under test."
  - "Pattern: SINGLE-PATH metadata assertion — when verifying writer output, assert exactly the field the writer emits with no fallback chain. A vacuous OR'd assertion silently green-lights regressions where the writer shape changes."

requirements-completed: [AGENT-08, AGENT-09]

# Metrics
duration: 5min
completed: 2026-04-27
---

# Phase 12 Plan 05: v1.2→v1.3 Upgrade + Fresh-Install E2E Tests Summary

**Two new E2E tests prove the v1.3 agent-dir relocation runtime: `test/test-legacy-v12-upgrade.js` (32 assertions) simulates a v1.2→v1.3 upgrade in a tempdir via npm pack + install with NETWORK-FREE manual synthesis of v1.2 state and asserts top-level `meta.reason === 'manifest_cleanup'` as a single-path with no fallback (Blocker 4 closure); `test/test-v13-agent-relocation.js` (28 assertions) verifies a fresh v1.3 install lands all 8 personas at `_config/agents/`, the manifest references the new path with `install_root='_gomad'`, launcher stubs reference `_config/agents/`, and an idempotent re-install creates ZERO `_gomad/_backups/<ts>/` entries (proves AGENT-05 whitelist).**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-04-27T02:17:49Z
- **Completed:** 2026-04-27T02:22:30Z
- **Tasks:** 2
- **Files created:** 2

## Accomplishments

- `test/test-legacy-v12-upgrade.js` (302 lines, runnable via `node test/test-legacy-v12-upgrade.js`): synthesizes a v1.2 install state in a tempdir (8 persona body files at `_gomad/gomad/agents/<shortName>.md` + hand-crafted v2-schema manifest CSV + 8 launcher stubs pointing at OLD path + optional `.customize.yaml`), runs `gomad install --yes` over it via the npm-pack tarball, then asserts: 8 personas at NEW location, 8 legacy persona files removed, exactly 1 backup dir with all 8 personas snapshotted, **top-level `meta.reason === 'manifest_cleanup'` with NO per-entry fallback (Blocker 4 single-path closure)**, `.customize.yaml` preserved, launcher stubs regenerated to reference `_config/agents/`, and idempotent re-install creates no new backup. **All 32 assertions pass.**
- `test/test-v13-agent-relocation.js` (156 lines, runnable via `node test/test-v13-agent-relocation.js`): runs `node tools/installer/gomad-cli.js install --directory <tempdir> --modules core --tools claude-code --yes` against a fresh tempdir, then asserts: 8 personas at `_gomad/_config/agents/`, NO `_gomad/gomad/agents/` dir, manifest CSV has 8 persona rows with `install_root='_gomad'`, all 8 launcher stubs reference `_config/agents/`, and an immediate second install produces ZERO entries in `_gomad/_backups/`. **All 28 assertions pass.**
- v11 upgrade test (`test/test-legacy-v11-upgrade.js`) byte-for-byte unchanged.
- Both new tests are NETWORK-FREE (D-11), deterministic, hermetic (tempdir-scoped), and clean up tarball + tempdir on success or failure via `try/finally`.
- ZERO new npm dependencies introduced — only `node:path`, `node:os`, `node:child_process`, `node:crypto`, `fs-extra`, and `csv-parse/sync` (existing project deps).
- `npm run test:install` exits 0 (205 passed / 0 failed) — no regression.
- `npx eslint` and `npx prettier --check` exit 0 on both new files.
- package.json NOT modified (Plan 08 wires `test:legacy-v12-upgrade` and `test:v13-agent-relocation` npm scripts into the release commit per Objective scope note).

## Task Commits

1. **Task 1: Create test/test-legacy-v12-upgrade.js (NEW E2E upgrade test)** — `d4f54ff` (test)
2. **Task 2: Create test/test-v13-agent-relocation.js (NEW fresh-install + idempotency test)** — `86b47ce` (test)

## Files Created/Modified

- `test/test-legacy-v12-upgrade.js` (CREATED, 302 lines) — v1.2→v1.3 upgrade E2E test. Reuses v11 pattern: `packAndInstall(prefix)`, `listBackupTimestamps(backupsDir)`, `sha256File(p)`, colors + assert helpers. New: `seedV12Workspace(tempDir, { includeCustomize })` synthesizes v1.2 state with 8 persona seed files + manifest CSV (7-col v2 schema) + 8 launcher stubs at OLD path + optional `.customize.yaml`. Top-level `meta.reason === 'manifest_cleanup'` asserted with no fallback (per Blocker 4 reading of cleanup-planner.js:445-458 writeMetadata). 32 assertions passing.
- `test/test-v13-agent-relocation.js` (CREATED, 156 lines) — Fresh v1.3 install + idempotency E2E test. Lighter scaffold: direct `node tools/installer/gomad-cli.js install --directory <tempdir> --modules core --tools claude-code --yes` (no npm pack). Reuses csv-parse/sync for manifest reading. 28 assertions passing.

## Manifest CSV column verification (Critical Implementation Note 1 closure)

The hand-rolled v1.2 seed manifest in `seedV12Workspace` uses exactly the 7 columns produced by `manifest-generator.writeFilesManifest`:

```
type,name,module,path,hash,schema_version,install_root
```

Verified by reading `tools/installer/core/manifest-generator.js:691` before writing the seed. The seed rows for the 8 personas are: `type=md, name=<shortName>, module=gomad, path=gomad/agents/<shortName>.md, hash=<sha256>, schema_version=2.0, install_root=_gomad`. The v12 detector (`isV12LegacyAgentsDir` at cleanup-planner.js:174-184) requires both manifest + persona files; the seed satisfies both.

## Blocker 4 closure: SINGLE-PATH meta.reason assertion

The test asserts:

```javascript
assert(
  meta.reason === 'manifest_cleanup',
  `(AGENT-04) backup metadata top-level reason === 'manifest_cleanup'`,
  `got ${JSON.stringify(meta.reason)}`,
);
```

**No `||` fallback. No `meta.files[].reason` fallback.** Verified by reading writeMetadata at `cleanup-planner.js:445-458`:

```javascript
async function writeMetadata(backupRoot, { gomadVersion, plan }) {
  const metadata = {
    gomad_version: gomadVersion,
    created_at: new Date().toISOString(),
    reason: plan.reason,                          // ← TOP-LEVEL
    files: plan.to_snapshot.map((item) => ({
      install_root: item.install_root,
      relative_path: item.relative_path,
      orig_hash: item.orig_hash === undefined ? null : item.orig_hash,
      was_modified: item.was_modified === undefined ? null : item.was_modified,
      // ← NO per-entry reason field. Other fields silently dropped.
    })),
    recovery_hint: '...',
  };
}
```

Per-plan acceptance criterion `grep -c "meta.files.*reason" test/test-legacy-v12-upgrade.js` returns 0 — no per-entry fallback present.

## Decisions Made

- **Hand-rolled CSV writer (`escapeCsv` + `writeCsv`)** — mirrors `manifest-generator.js:686` idiom (`escapeCsv = (value) => '"' + String(value ?? '').replaceAll('"', '""') + '"'`). csv-stringify is NOT a project dep and would have been a net-new addition violating the zero-new-deps rule. csv-parse IS a dep and is reused in `test-v13-agent-relocation.js` for reading the manifest.
- **Two scaffold split — npm pack for upgrade test, direct CLI for fresh-install test** — the upgrade test must exercise the published bin shape (the v12 detector + v12 cleanup branch + writer all run through the installed `gomad` binary), so npm pack + npm install + invoke `node_modules/.bin/gomad` is the correct harness. The fresh-install test exercises only installer correctness; using the source-tree CLI directly is faster (~30s vs ~120s for the npm-pack roundtrip) without sacrificing assertion strength.
- **`--tools claude-code` (not `--tools none`)** — both tests need launcher stubs at `.claude/commands/gm/agent-*.md` to be regenerated for AGENT-03 assertions. Verified the flag accepts `claude-code` per `tools/installer/commands/install.js:39` (`'Comma-separated list of tool/IDE IDs to configure (e.g., "claude-code,cursor")'`).
- **`{project-root}` is LITERAL in the launcher stub** — verified by reading `agent-command-generator.js:136-141` (only `{{shortName}}`, `{{displayName}}`, `{{title}}`, `{{icon}}`, `{{capabilities}}`, `{{description}}` are interpolated; `{project-root}` is left literal). The test asserts `stub.includes('/_gomad/_config/agents/pm.md')` which matches the literal text in the regenerated launcher.

## Deviations from Plan

None - plan executed exactly as written.

The plan-driven prettier auto-fix on initial write is normal acceptance-criterion-driven cleanup (line wrap rules), not a deviation. No content changes; only formatting.

---

**Total deviations:** 0 auto-fixed
**Impact on plan:** None — plan executed as written. Both tests were authored exactly per the `<action>` blocks of Tasks 1 and 2.

## Issues Encountered

None — both tests passed end-to-end on first run after prettier auto-format.

The v1.2 manifest CSV column verification (per Critical Implementation Note 1) was performed via direct read of `manifest-generator.js:691` before writing the seed; the column list `type,name,module,path,hash,schema_version,install_root` matched exactly with no surprises.

## Confirmations

- **Acceptance criteria — Task 1 (test-legacy-v12-upgrade.js):**
  - `test -f test/test-legacy-v12-upgrade.js` ✓
  - `node test/test-legacy-v12-upgrade.js` exits 0 (32 passed / 0 failed) ✓
  - `grep -c "isV12LegacyAgentsDir"` → 1 (≥1 required) ✓
  - `grep -c "manifest_cleanup"` → 3 (≥1 required) ✓
  - `grep -c "gm-agent-pm"` → 1 (≥1 required) ✓
  - `grep -c "_config/agents"` → 7 (≥1 required) ✓
  - `grep -Fc "meta.reason === 'manifest_cleanup'"` → 1 (≥1 required) ✓
  - `grep -c "meta.files.*reason"` → 0 (=0 required) ✓
  - `grep -c "seedV12Workspace"` → 2 (≥2 required) ✓
  - `grep -c "LEGACY_AGENTS"` → 6 (≥3 required) ✓
  - `grep -c "solo-dev"` → 1 (≥1 required) ✓
  - `grep -c "process.exit(failed > 0 ? 1 : 0)"` → 1 (=1 required) ✓
  - `wc -l < test/test-legacy-v12-upgrade.js` → 302 (>200 required) ✓
  - Zero new deps grep returns 0 ✓
  - Tempdir cleaned up after run (no `/tmp/gomad-v12-upgrade-*` leakage) ✓
  - `git diff test/test-legacy-v11-upgrade.js` empty (v11 untouched) ✓
  - `npx eslint test/test-legacy-v12-upgrade.js --max-warnings=0` exits 0 ✓
  - `npx prettier --check test/test-legacy-v12-upgrade.js` exits 0 ✓
- **Acceptance criteria — Task 2 (test-v13-agent-relocation.js):**
  - `test -f test/test-v13-agent-relocation.js` ✓
  - `node test/test-v13-agent-relocation.js` exits 0 (28 passed / 0 failed) ✓
  - `grep -c "PERSONAS = \\['analyst'"` → 1 (=1 required) ✓
  - `grep -c "solo-dev"` → 1 (≥1 required) ✓
  - `grep -c "_config/agents"` → 6 (≥4 required) ✓
  - `grep -c "backups.length === 0"` → 1 (≥1 required) ✓
  - `grep -c "process.exit(failed > 0 ? 1 : 0)"` → 1 (=1 required) ✓
  - `grep -c "tools/installer/gomad-cli.js"` → 1 (≥1 required) ✓
  - `wc -l < test/test-v13-agent-relocation.js` → 156 (>80 required) ✓
  - Zero new deps grep returns 0 ✓
  - Tempdir cleaned up after run (no `/tmp/gomad-v13-fresh-*` leakage) ✓
  - `npx eslint test/test-v13-agent-relocation.js --max-warnings=0` exits 0 ✓
  - `npx prettier --check test/test-v13-agent-relocation.js` exits 0 ✓
- **Existing tests still pass:** `npm run test:install` → 205 passed / 0 failed ✓
- **No file deletions in commits:** `git diff --diff-filter=D --name-only HEAD~2 HEAD` returns empty ✓
- **No untracked files left behind:** `git status --short` shows only the new test files staged for commit ✓

## Notes for Downstream Plans

- **Plan 12-06 (AGENT-07 Phase C body-regex test):** Existing `test/test-gm-command-surface.js` gets the Phase C body-regex extension (verifying launcher template/writer drift). Orthogonal to Plan 12-05 — Plan 12-06 does NOT touch the new test files added here.
- **Plan 12-08 (release commit):** Wires the npm scripts into `package.json`:
  - `"test:legacy-v12-upgrade": "node test/test-legacy-v12-upgrade.js"`
  - `"test:v13-agent-relocation": "node test/test-v13-agent-relocation.js"`
  - Add both to `quality` (alongside `prepublishOnly` if used). Keep release-commit semantics atomic (Objective scope note).
- **meta.reason single-path assertion** is the canonical pattern for any future N→N+1 cleanup test — read the writer's exact field shape before writing the assertion. No `||` fallback chains.
- **Manifest CSV column list** must be re-verified against `manifest-generator.writeFilesManifest` if the schema evolves (e.g. new column added in v3). Both tests parse via csv-parse with `columns: true`, so additional columns are tolerated by the read side; the write side (seed in upgrade test) is the brittle one.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- v1.2 → v1.3 upgrade and fresh v1.3 install are both runtime-verified by automated assertions. The end-to-end pipeline from Plans 01-03 is now provably correct on Node + macOS (CI runs both Linux and macOS).
- Plan 12-04 can begin in parallel (orthogonal — `docs/upgrade-recovery.md`).
- Plan 12-06 can begin in parallel (orthogonal — `test-gm-command-surface.js` body-regex extension).
- Plan 12-08 will wire the npm scripts into `package.json` + `quality` gate as part of the release commit.

## Self-Check: PASSED

- File `test/test-legacy-v12-upgrade.js`: FOUND
- File `test/test-v13-agent-relocation.js`: FOUND
- Commit `d4f54ff` (Task 1): FOUND
- Commit `86b47ce` (Task 2): FOUND
- `node test/test-legacy-v12-upgrade.js` end-to-end: 32 passed / 0 failed (VERIFIED via run before commit)
- `node test/test-v13-agent-relocation.js` end-to-end: 28 passed / 0 failed (VERIFIED via run before commit)
- `git diff test/test-legacy-v11-upgrade.js` empty: VERIFIED (v11 byte-for-byte unchanged)
- `npm run test:install` → 205 passed / 0 failed: VERIFIED
- `npx eslint` + `npx prettier --check` clean on both new files: VERIFIED

---
*Phase: 12-agent-dir-relocation-release*
*Completed: 2026-04-27*
