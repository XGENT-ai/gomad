---
phase: 07-upgrade-safety-manifest-driven-cleanup
plan: 01
subsystem: installer
tags: [csv-parse, fs-extra, manifest, cleanup, realpath, sha256, bom, crlf]

# Dependency graph
requires:
  - phase: 06-installer-mechanics-copy-manifest-stub-generation
    provides: csv-parse manifest read path (D-27), schema_version + install_root columns (D-23/D-25), forward-slash normalization (D-26), calculateFileHash helper, AgentCommandGenerator.AGENT_SOURCES (7 personas)
provides:
  - "Pure plan builder buildCleanupPlan({priorManifest, newInstallSet, workspaceRoot, allowedRoots, isV11Legacy}) → {to_snapshot[], to_remove[], to_write[], refused[], reason}"
  - "Helpers: isContained(resolved, wsRoot), formatTimestamp(date), uniqueBackupDir(workspaceRoot, baseTs), isV11Legacy(workspaceRoot, gomadDir), LEGACY_AGENT_SHORT_NAMES (derived from AgentCommandGenerator.AGENT_SOURCES)"
  - "Custom error: ManifestCorruptError (D-33 poison-batch signal) with codes MANIFEST_CORRUPT and CONTAINMENT_FAIL"
  - "Hardened readFilesManifest with bom: true + per-row required-column validation + structured MANIFEST_CORRUPT/CORRUPT_ROW/IO_ERROR classification"
  - "writeFilesManifest D-39 _gomad/_backups/** prefix exclusion (POSIX + Windows separators)"
  - "Test infrastructure: 11 fixture CSVs under test/fixtures/phase-07/manifests/ + 2 test suites (test-manifest-corruption.js, test-cleanup-planner.js) — 103 assertions total"
affects: [07-02 cleanup executor, 07-02 dry-run renderer, 07-02 E2E v1.1 upgrade test, 07-02 metadata.json writer]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Plan-then-execute split (D-41 dry-run-equals-actual invariant) — pure buildCleanupPlan + faithful executor (07-02)"
    - "Realpath-then-relative containment check (defends against startsWith bug for prefix-collision siblings like /ws-suffix)"
    - "Static prefix-exclusion filter at TOP of allInstalledFiles loop (excluded paths never hit hash compute or install_root detection)"
    - "Single source of truth for static lists (LEGACY_AGENT_SHORT_NAMES derived from AgentCommandGenerator.AGENT_SOURCES — no duplication)"
    - "Fixture-driven corruption tests with monkeypatched prompts.log capture"

key-files:
  created:
    - tools/installer/core/cleanup-planner.js
    - test/fixtures/phase-07/manifests/valid-v2.csv
    - test/fixtures/phase-07/manifests/corrupt-bom.csv
    - test/fixtures/phase-07/manifests/corrupt-crlf.csv
    - test/fixtures/phase-07/manifests/corrupt-quote.csv
    - test/fixtures/phase-07/manifests/corrupt-arity.csv
    - test/fixtures/phase-07/manifests/corrupt-header.csv
    - test/fixtures/phase-07/manifests/corrupt-row-missing.csv
    - test/fixtures/phase-07/manifests/corrupt-empty-path.csv
    - test/fixtures/phase-07/manifests/duplicate-paths.csv
    - test/fixtures/phase-07/manifests/escape-absolute.csv
    - test/fixtures/phase-07/manifests/escape-traverse.csv
    - test/test-manifest-corruption.js
    - test/test-cleanup-planner.js
  modified:
    - tools/installer/core/installer.js (readFilesManifest hardened with BOM, MANIFEST_CORRUPT, CORRUPT_ROW)
    - tools/installer/core/manifest-generator.js (writeFilesManifest D-39 _gomad/_backups exclusion)

key-decisions:
  - "corrupt-header.csv fixture uses an unclosed-quote header (yields CSV_QUOTE_NOT_CLOSED) instead of duplicate column names — csv-parse silently coalesces duplicate columns rather than throwing, so duplicate-name fixtures cannot drive MANIFEST_CORRUPT classification (verified via probe)"
  - "Traverse-escape test uses dynamic ../ depth to land on /etc/passwd (real existing file) rather than a non-existent traversal target — Pitfall 22 ENOENT-skip otherwise short-circuits the containment check before it can fire"
  - "D-39 prefix exclusion checks THREE forms: POSIX literal '/_gomad/_backups/', Windows literal '\\\\_gomad\\\\_backups\\\\', AND runtime-native (path.sep) — defends against separator drift on either platform when a manifest written on the wrong OS gets re-read on the other"
  - "Wrapped fs.readFile failure as MANIFEST_CORRUPT: IO_ERROR (was a generic warn before) — IO failure on the manifest file is a manifest-corrupt signal per D-33 (skip cleanup, idempotent install continues)"

patterns-established:
  - "Pure-logic module exports: pure functions (no fs WRITES) + custom Error subclass + static-data constant derived from canonical source"
  - "Test purity verification: monkeypatch fs.{copy,remove,ensureDir,writeFile,ensureFile} BEFORE calling under-test function, assert call count is 0"
  - "JSDoc safety rule: avoid `*/` token inside comment bodies — escape star-slash sequences (e.g., gm-agent-XXX/ instead of gm-agent-*/)"
  - "Realpath-resolve workspace tempdir via fs.realpathSync BEFORE running containment-sensitive tests on macOS where /tmp → /private/tmp symlink would otherwise produce false-negative containment checks"

requirements-completed: [INSTALL-05, INSTALL-06]

# Metrics
duration: 14min
completed: 2026-04-20
---

# Phase 7 Plan 01: Manifest Cleanup Pure Logic Foundation Summary

**Pure cleanup-planner.js module + hardened readFilesManifest (BOM, MANIFEST_CORRUPT, CORRUPT_ROW) + writeFilesManifest D-39 _gomad/_backups exclusion — 103 fixture-driven test assertions all green.**

## Performance

- **Duration:** 14 min
- **Started:** 2026-04-20T10:31:22Z
- **Completed:** 2026-04-20T10:45:49Z
- **Tasks:** 4
- **Files modified:** 16 (2 source modified, 1 source created, 11 fixtures created, 2 test suites created)

## Accomplishments

- Pure `buildCleanupPlan` function: standard manifest-diff branch (per-entry realpath + isContained + ENOENT-tolerant + UNKNOWN_INSTALL_ROOT refusal + hash-mismatch was_modified marker) AND legacy v1.1 branch (D-42 7-dir snapshot, was_modified=null) — verified zero fs writes via monkeypatch purity test
- Hardened `readFilesManifest` with `bom: true` (silent U+FEFF normalization), structured `MANIFEST_CORRUPT:` log + `[]` return for csv-parse throws, `CORRUPT_ROW: row N: missing column(s) X` log + per-row skip; v1-row compat preserved (missing install_root → implicit `_gomad` only when `schema_version` ≠ `'2.0'`)
- `writeFilesManifest` D-39 `_gomad/_backups/**` prefix-exclusion filter at TOP of allInstalledFiles loop, with symmetric POSIX/Windows/native separator checks (prefix-collision `_backupstemp` correctly INCLUDED)
- 11 deterministic fixture CSVs covering BOM bleed, CRLF, unclosed-quote (CSV_QUOTE_NOT_CLOSED), arity-mismatch (CSV_RECORD_INCONSISTENT_COLUMNS), broken-quote header, missing-required-cell, empty-path, duplicate-paths, absolute-escape, traverse-escape
- 103 test assertions across 2 dedicated test suites (33 manifest-corruption + 70 cleanup-planner including buildCleanupPlan + D-39 exclusion); all existing regressions (test-installer-self-install-guard.js) still green

## Task Commits

Each task was committed atomically:

1. **Task 1: Harden readFilesManifest with BOM + corrupt-row classification (D-33)** — `bd56f2a` (feat)
2. **Task 2: Scaffold cleanup-planner.js with helpers (isContained, formatTimestamp, uniqueBackupDir, isV11Legacy, LEGACY_AGENT_SHORT_NAMES, ManifestCorruptError)** — `8b4646c` (feat)
3. **Task 3: Implement pure buildCleanupPlan (D-32 containment, D-34 was_modified, D-43 legacy branch) + escape fixtures + 37 buildCleanupPlan tests** — `4cd5412` (feat)
4. **Task 4: writeFilesManifest D-39 _gomad/_backups/** exclusion + 8 D-39 tests** — `207540f` (feat)

Plus follow-up:

5. **Lint + format pass (eslint --fix unicorn rules + prettier)** — `c1329b1` (chore)

## Files Created/Modified

### Created
- `tools/installer/core/cleanup-planner.js` — Pure plan builder (`buildCleanupPlan`) + helpers (`isContained`, `isV11Legacy`, `formatTimestamp`, `uniqueBackupDir`) + constant (`LEGACY_AGENT_SHORT_NAMES` derived from `AgentCommandGenerator.AGENT_SOURCES`) + custom error (`ManifestCorruptError`). Zero fs writes (verified by purity test).
- `test/test-manifest-corruption.js` — 33 fixture-driven assertions for `Installer.readFilesManifest` D-33 classification (BOM/CRLF/unclosed-quote/arity/header/missing-row/empty-path/duplicate-paths/valid-v2 + empty-file + missing-file).
- `test/test-cleanup-planner.js` — 70 assertions covering all helpers + buildCleanupPlan (empty/still-needed/stale-hash-match/stale-hash-mismatch/absolute-escape/traverse-escape/symlink-escape/ENOENT/unknown-root/legacy-7-of-7/legacy-3-of-7/purity) + D-39 exclusion (positive cases / exclusion cases / prefix-collision / Windows-separator).
- `test/fixtures/phase-07/manifests/*.csv` (11 files) — Deterministic BOM/CRLF/quote/arity/header/missing/empty/duplicate/escape-absolute/escape-traverse/valid-v2 fixtures for fixture-driven D-33 + D-32 testing.

### Modified
- `tools/installer/core/installer.js` — `readFilesManifest` extended with `bom: true`, MANIFEST_CORRUPT vs CORRUPT_ROW classification, `IO_ERROR` wrapping for `fs.readFile` failures (was generic warn before — Rule 2 missing critical: classify IO failure as manifest-corrupt to feed the skip-cleanup contract uniformly).
- `tools/installer/core/manifest-generator.js` — `writeFilesManifest` extended with D-39 prefix-exclusion filter at top of `allInstalledFiles` loop.

## Decisions Made

- **Used unclosed-quote header for `corrupt-header.csv`** — csv-parse silently coalesces duplicate column names rather than throwing (verified via probe), so the only way to drive `MANIFEST_CORRUPT` from a header malformation is via a parse-time error. Unclosed quote in the header field triggers `CSV_QUOTE_NOT_CLOSED`, which is what the plan's intent ("malformed header → MANIFEST_CORRUPT") requires.
- **Used dynamic `../` depth in traverse-escape test** — `path.join(ws, '_gomad', '../../../etc/passwd')` from a tempdir resolves to a non-existent path far above `ws`, triggering the ENOENT-skip branch (Pitfall 22 normal idempotency) before the containment check fires. To exercise the actual containment failure path, the test calculates traversal depth from the workspace's segment count and lands on the real `/etc/passwd` (must exist for realpath to resolve and reach the containment check).
- **`fs.readFile` failure now wrapped as MANIFEST_CORRUPT: IO_ERROR** — Rule 2 (missing critical functionality). The previous code emitted a generic warn but the cleanup contract requires structured error classification so the caller's `[]` return is interpretable. Reframed as IO_ERROR sub-classification of MANIFEST_CORRUPT.
- **D-39 filter checks THREE separator forms (POSIX, Windows, native)** — On macOS the runtime-native form equals POSIX, so the Windows form provides defensive coverage when a manifest written on Windows is re-read on macOS (or vice versa). The plan called for symmetric checking; making it three-way explicit guarantees no platform-specific blind spot.
- **D-35 SYMLINK_ESCAPE reframed as pre-throw log** — D-35 originally said "non-fatal" for symlink escapes, but D-33 conservatism poisons the batch on containment failure. Resolution: emit the SYMLINK_ESCAPE log line first (so the offending entry is captured even when the batch poison short-circuits), THEN throw ManifestCorruptError. Documented in CONTEXT.md §source_audit and now realized in `buildCleanupPlan` (line ~228 of cleanup-planner.js).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Test expectation for `corrupt-header.csv` — duplicate-column doesn't throw**
- **Found during:** Task 1 (fixture design)
- **Issue:** Plan called for `corrupt-header.csv` to use duplicate column names (e.g., `path,path`) to trigger MANIFEST_CORRUPT. Probe verification showed csv-parse silently coalesces duplicates and uses the last value, NOT throwing.
- **Fix:** Changed fixture to use an unclosed-quote header (`type,"name,module,...`) which produces `CSV_QUOTE_NOT_CLOSED` — same MANIFEST_CORRUPT classification, different mechanism.
- **Files modified:** test/fixtures/phase-07/manifests/corrupt-header.csv
- **Verification:** test-manifest-corruption.js → "malformed-header fixture → emits MANIFEST_CORRUPT: log" passes.
- **Committed in:** bd56f2a (Task 1 commit)

**2. [Rule 1 - Bug] Test expectation for traverse-escape — ENOENT short-circuited containment**
- **Found during:** Task 3 (initial test run with hard-coded `../../../etc/passwd`)
- **Issue:** A traverse path computed by `path.join(ws, '_gomad', '../../../etc/passwd')` from a tempdir like `/private/var/folders/.../gomad-xxx/` resolves to `/private/var/folders/_v/szrk.../etc/passwd` — which does NOT exist, so `fs.realpath` throws ENOENT and `buildCleanupPlan` correctly skips the entry (Pitfall 22 normal idempotency). The containment check never runs.
- **Fix:** Calculate traversal depth dynamically from the workspace's path segment count, then land the path on the real `/etc/passwd` (which exists on POSIX systems and resolves through realpath). Skip the assertion gracefully if `/etc/passwd` is absent (non-POSIX hosts).
- **Files modified:** test/test-cleanup-planner.js (Case F)
- **Verification:** test-cleanup-planner.js → "buildCleanupPlan traverse-escape: throws ManifestCorruptError when traversal lands on /etc/passwd" passes.
- **Committed in:** 4cd5412 (Task 3 commit)

**3. [Rule 1 - Bug] JSDoc `*/` close-comment token inside docstring body**
- **Found during:** Task 2 (cleanup-planner.js initial syntax check)
- **Issue:** The JSDoc text "`.claude/skills/gm-agent-*/` directories" contained the literal `*/` character pair, which prematurely closed the JSDoc block. Subsequent function signature was parsed as code, producing `SyntaxError: Unexpected identifier 'gm'` at the next template-literal `gm-agent-${shortName}`.
- **Fix:** Changed JSDoc text from `gm-agent-*/` to `gm-agent-XXX/` (placeholder character preserves meaning without closing the comment).
- **Files modified:** tools/installer/core/cleanup-planner.js (line 141 docstring)
- **Verification:** `node --check` passes.
- **Committed in:** 8b4646c (Task 2 commit, included in initial scaffolding)

**4. [Rule 2 - Missing critical] `fs.readFile` failure not classified as MANIFEST_CORRUPT**
- **Found during:** Task 1 (review of existing readFilesManifest catch logic)
- **Issue:** Original code had `try { content = await fs.readFile(...) ; ... csv.parse(...); ...} catch { warn; return []; }` — a single try wrapping read + parse with a generic warn. Per D-33, IO failures on the manifest must produce a structured MANIFEST_CORRUPT signal so the cleanup contract's "skip cleanup, continue idempotent install" branch fires uniformly.
- **Fix:** Split into two try/catch blocks. First catches `fs.readFile` failure → `prompts.log.error('MANIFEST_CORRUPT: IO_ERROR: ...')` → return `[]`. Second catches `csv.parse` failure → `prompts.log.error('MANIFEST_CORRUPT: ' + code + ': ...')` → return `[]`. Both paths produce the same structured contract.
- **Files modified:** tools/installer/core/installer.js
- **Verification:** test-manifest-corruption.js empty-file + missing-file tests still pass; classification is now uniform across IO and parse failures.
- **Committed in:** bd56f2a (Task 1 commit)

**5. [Rule 1 - Bug] D-39 filter missed Windows-style backslash separators on POSIX**
- **Found during:** Task 4 (D-39 native-sep test failed on macOS)
- **Issue:** Initial implementation used POSIX literal `/_gomad/_backups/` + runtime-native (`path.sep + '_gomad' + path.sep + '_backups' + path.sep`). On POSIX, both equal the POSIX form. A path `\\ws\\_gomad\\_backups\\meta.json` (Windows-style separator) recorded in the include list would NOT be filtered.
- **Fix:** Added a third explicit Windows-literal check `\\_gomad\\_backups\\`. Now the filter is symmetric across platforms regardless of where the path string was constructed.
- **Files modified:** tools/installer/core/manifest-generator.js
- **Verification:** test-cleanup-planner.js → "D-39 native-sep: backslash _gomad\\_backups\\ path EXCLUDED" passes on POSIX.
- **Committed in:** 207540f (Task 4 commit)

**6. [Rule 1 - Lint quality] eslint --fix + prettier**
- **Found during:** Final overall verification step
- **Issue:** unicorn lint rules surfaced 18 violations across new/modified files (catch-error-name, prefer-string-raw, prefer-string-starts-ends-with, prefer-set-has, prefer-optional-catch-binding, no-negated-condition); prettier flagged 4 files for format drift.
- **Fix:** Ran `npx eslint --fix` and `npx prettier --write` on the 5 modified/created files.
- **Files modified:** tools/installer/core/cleanup-planner.js, tools/installer/core/manifest-generator.js, test/test-cleanup-planner.js, test/test-manifest-corruption.js
- **Verification:** Lint clean (`npx eslint ... --max-warnings=0` exits 0); all 103 test assertions still green; format-check passes.
- **Committed in:** c1329b1 (chore commit, separate from feature commits per repo convention)

---

**Total deviations:** 6 auto-fixed (4 Rule 1 bugs in fixtures/tests/code/lint, 1 Rule 2 missing critical IO classification, 1 Rule 1 syntax fix from JSDoc parsing edge case)
**Impact on plan:** All deviations were either (a) fixture/test-code adjustments required by csv-parse's actual behavior (which the plan acknowledged as "verify by writing the fixture first and running csv-parse"), (b) defensive corrections to the production code that strengthen the D-33/D-39 contracts without changing them, or (c) post-implementation lint+format hygiene. No scope creep, no architectural drift, no missed behaviors.

## Issues Encountered

- **csv-parse silently coalesces duplicate column names** — discovered during fixture probe. The plan's caveat about this very case (lines 275-276 of 07-01-PLAN.md) anticipated it. Resolved by reframing the fixture to use a parse-time error (unclosed-quote header) instead of duplicate-name header.
- **macOS `/tmp` is a symlink to `/private/tmp`** — affects containment tests because `path.relative('/tmp', '/private/tmp/foo')` returns a path starting with `..`. Resolved by `fs.realpathSync(ws)` immediately after `mkdtempSync` in every test that does containment-sensitive checks. Wrapped in a `makeRealWs(prefix)` helper for reuse across cases.
- **JSDoc `*/` close-comment edge case** — `gm-agent-*/` in a docstring closes the comment block prematurely. Resolved by sanitizing to `gm-agent-XXX/`.

## Interface Reference for Plan 07-02 (Executor)

Plan 07-02 will consume the following from `tools/installer/core/cleanup-planner.js`:

### `buildCleanupPlan(input)` — pure
```javascript
const plan = await buildCleanupPlan({
  priorManifest,             // from installer.readFilesManifest (already filtered for CORRUPT_ROW/MANIFEST_CORRUPT)
  newInstallSet,             // Set<string> of realpath-resolved absolute paths the new install will write
  workspaceRoot,             // realpath-resolved workspace root (caller realpaths BEFORE invoking)
  allowedRoots,              // Set<string>, e.g. new Set(['_gomad', '.claude', ...await this._collectIdeRoots()])
  isV11Legacy: bool,         // from cleanupPlanner.isV11Legacy(workspaceRoot, gomadDir)
  manifestGen: optional,     // ManifestGenerator instance for hash compute (defaults to fresh)
});
// Returns:
{
  to_snapshot: [{src: string, install_root: string, relative_path: string, orig_hash: string|null, was_modified: boolean|null}],
  to_remove:   [string],     // absolute realpath entries (matches to_snapshot[].src)
  to_write:    [string],     // [...newInstallSet]
  refused:     [{idx: number|null, entry: object, reason: 'UNKNOWN_INSTALL_ROOT'|'SYMLINK_ESCAPE'}],
  reason:      'manifest_cleanup' | 'legacy_v1_cleanup',
}
// Throws: ManifestCorruptError (with code 'MANIFEST_CORRUPT', message starting 'CONTAINMENT_FAIL: ')
//   when an entry's resolved realpath escapes workspaceRoot (D-33 poison-batch).
```

### Helpers
- `formatTimestamp(date = new Date()) → string` — YYYYMMDD-HHMMSS local-time, 15 chars, /^\d{8}-\d{6}$/
- `uniqueBackupDir(workspaceRoot, baseTs) → Promise<string>` — read-only collision check; returns `${baseTs}-N` for N≥2 if base exists
- `isV11Legacy(workspaceRoot, gomadDir) → Promise<boolean>` — true iff no manifest AND ≥1 of 7 legacy dirs
- `LEGACY_AGENT_SHORT_NAMES` — `['analyst', 'tech-writer', 'pm', 'ux-designer', 'architect', 'sm', 'dev']` derived from `AgentCommandGenerator.AGENT_SOURCES`
- `isContained(resolved, wsRoot) → boolean` — used internally by buildCleanupPlan; exposed for executor's defensive checks

### Error-string contract (referenced by 07-02 tests)
- `MANIFEST_CORRUPT: <code>: <message>` — emitted by readFilesManifest on csv-parse / IO failure (whole-manifest skip-cleanup signal); `<code>` ∈ {`CSV_QUOTE_NOT_CLOSED`, `CSV_RECORD_INCONSISTENT_COLUMNS`, `IO_ERROR`, `PARSE_ERROR`, ...}
- `CORRUPT_ROW: row <N>: missing column(s) <list>` — emitted by readFilesManifest per-row (skip that row, keep rest)
- `SYMLINK_ESCAPE: <joined> → <resolved>, refusing to touch` — emitted by buildCleanupPlan BEFORE throwing ManifestCorruptError on containment failure (logs offending entry even when batch poisons)
- `CONTAINMENT_FAIL: row <N> escapes workspace: <resolved>` — message body of the thrown ManifestCorruptError (caught by 07-02 _prepareUpdateState integration)
- `plan.refused[].reason` ∈ {`UNKNOWN_INSTALL_ROOT`, `SYMLINK_ESCAPE`} — non-throwing entry rejections
- `HASH_MISMATCH` — NOT a log code. Hash mismatch is signaled via `plan.to_snapshot[].was_modified === true` and serialized into metadata.json by 07-02.

### Hash-at-plan-time commitment
`buildCleanupPlan` populates `orig_hash` (from `priorManifest[].hash`) and `was_modified` (computed via `manifestGen.calculateFileHash(resolved) !== orig_hash`) at plan time. The 07-02 executor MUST consume these values verbatim into `metadata.json.files[]` — do NOT re-hash at execute time (single-pass invariant; preserves dry-run-equals-actual since dry-run renderer reads the same `was_modified` markers).

## Test Axis Coverage Scorecard (vs 07-VALIDATION.md)

| Axis | Plan 07-01 Coverage | Notes |
|------|---------------------|-------|
| Manifest corruption (6/6) | ✓ BOM, ✓ CRLF, ✓ malformed header, ✓ missing column, ✓ unclosed quote, ✓ row arity (CSV_RECORD_INCONSISTENT_COLUMNS), ✓ duplicate path | All 6 axes covered + bonus empty-path + empty-file + missing-file |
| Containment escapes (4/4) | ✓ absolute, ✓ ../ traversal (dynamic depth), ✓ symlink to outside, ✓ prefix-collision sibling /ws-suffix (via isContained unit test) | Full coverage |
| Legacy v1.1 (2/4) | ✓ no-manifest detection signal, ✓ isV11Legacy-true-with-3-of-7-dirs, ✓ all-7-dirs build plan | Bare 7-dirs E2E + symlinked-dir + user-custom-file land in 07-02 |
| Idempotency (1/3) | ✓ install → remove file manually → ENOENT tolerance | install-twice + dry-run identity in 07-02 |
| Backup snapshot (1/4) | ✓ backups-excluded-from-new-manifest (D-39 — POSIX + Windows + native + prefix-collision) | metadata.json mandatory, was_modified marker, recovery round-trip in 07-02 |
| Dry-run (1/3) | ✓ buildCleanupPlan() pure (no disk writes — purity test) | Plan rendering + exit-code-0 in 07-02 |
| Windows-specific (1/3) | ✓ path-separator normalization (D-39 native + literal-backslash check) | NTFS junction + long-path deferred to Phase 9 |

## User Setup Required

None — no external service configuration required.

## Self-Check: PASSED

Verified at end of plan:

- ✓ `tools/installer/core/cleanup-planner.js` exists; exports `buildCleanupPlan`, `isContained`, `isV11Legacy`, `formatTimestamp`, `uniqueBackupDir`, `LEGACY_AGENT_SHORT_NAMES`, `ManifestCorruptError` (verified via `node -e` import probe).
- ✓ All 5 task commits present in git log (bd56f2a, 8b4646c, 4cd5412, 207540f, c1329b1).
- ✓ All 11 fixture CSVs present under `test/fixtures/phase-07/manifests/` (verified via `ls`).
- ✓ Both new test suites exit 0: `node test/test-manifest-corruption.js` (33 passed, 0 failed); `node test/test-cleanup-planner.js` (70 passed, 0 failed).
- ✓ Existing `test/test-installer-self-install-guard.js` regression still passes (6/0).
- ✓ Static purity check on cleanup-planner.js: zero fs WRITE code calls (only fs.realpath / fs.pathExists READS).
- ✓ Lint clean: `npx eslint ... --max-warnings=0` exits 0.

## Next Phase Readiness

- Pure-logic foundation complete. Plan 07-02 has a clean, fully-tested API surface to consume — no exploration of behavior needed.
- Plan 07-02's executor (`executeCleanupPlan`) just consumes `plan.to_snapshot`, `plan.to_remove`, and `plan.reason`/`plan.refused` for metadata.json + snapshot + remove sequencing.
- Plan 07-02's dry-run renderer (`renderPlan`) consumes the same plan object identically — dry-run-equals-actual invariant is preserved by construction (purity verified).
- Hash-at-plan-time commitment fixes the executor's contract: it serializes `orig_hash` + `was_modified` from the plan into `metadata.json.files[]` without re-hashing.
- No blockers, no carry-over concerns.

---
*Phase: 07-upgrade-safety-manifest-driven-cleanup*
*Completed: 2026-04-20*
