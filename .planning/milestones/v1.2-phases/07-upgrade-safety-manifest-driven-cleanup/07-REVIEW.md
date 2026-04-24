---
phase: 07-upgrade-safety-manifest-driven-cleanup
reviewed: 2026-04-20T00:00:00Z
depth: standard
files_reviewed: 22
files_reviewed_list:
  - docs/upgrade-recovery.md
  - package.json
  - test/fixtures/phase-07/manifests/corrupt-arity.csv
  - test/fixtures/phase-07/manifests/corrupt-bom.csv
  - test/fixtures/phase-07/manifests/corrupt-crlf.csv
  - test/fixtures/phase-07/manifests/corrupt-empty-path.csv
  - test/fixtures/phase-07/manifests/corrupt-header.csv
  - test/fixtures/phase-07/manifests/corrupt-quote.csv
  - test/fixtures/phase-07/manifests/corrupt-row-missing.csv
  - test/fixtures/phase-07/manifests/duplicate-paths.csv
  - test/fixtures/phase-07/manifests/escape-absolute.csv
  - test/fixtures/phase-07/manifests/escape-traverse.csv
  - test/fixtures/phase-07/manifests/valid-v2.csv
  - test/test-cleanup-execute.js
  - test/test-cleanup-planner.js
  - test/test-dry-run.js
  - test/test-legacy-v11-upgrade.js
  - test/test-manifest-corruption.js
  - tools/installer/commands/install.js
  - tools/installer/core/cleanup-planner.js
  - tools/installer/core/config.js
  - tools/installer/core/installer.js
  - tools/installer/core/manifest-generator.js
findings:
  critical: 0
  warning: 4
  info: 7
  total: 11
status: issues_found
---

# Phase 7: Code Review Report

**Reviewed:** 2026-04-20
**Depth:** standard
**Files Reviewed:** 22 (note: 22 explicit files listed; `installer.js` counted once)
**Status:** issues_found

## Summary

Phase 7 introduces a manifest-driven cleanup pipeline (`cleanup-planner.js`) with a pure
plan-builder, an executor that enforces snapshot-before-remove, dry-run support, and legacy
v1.1 upgrade handling. The implementation is careful and well-documented: the
dry-run-equals-actual invariant (D-41), containment checks (D-32), and poison-batch
posture (D-33) are all covered by thorough unit and end-to-end tests. No critical
security or data-loss issues were found. The findings below are medium-impact
concerns around fixture coverage, error propagation, and a handful of
maintainability smells. None block merge.

Key strengths observed:

- `buildCleanupPlan` is genuinely pure — purity test (Case L) proves zero `fs` writes.
- Snapshot-before-remove invariant is tested both structurally and destructively
  (snapshot-failure case confirms original file survives).
- Fixture coverage for manifest corruption is strong and includes BOM/CRLF/unclosed-quote.

## Warnings

### WR-01: Corrupt-quote fixture may parse silently under csv-parse default relax settings

**File:** `test/fixtures/phase-07/manifests/corrupt-quote.csv:2` and `tools/installer/core/installer.js:766-771`
**Issue:** The fixture has a single unclosed quote: `file,"unclosed,gomad,...`. The
installer invokes `csv.parse` with `{ columns: true, skip_empty_lines: true, bom: true }`
but does NOT set `relax_quotes: false` or `strict: true`. csv-parse v6 default
behaviour may, depending on the exact record shape, emit a row rather than throw —
meaning the MANIFEST_CORRUPT path may not fire as asserted by
`test-manifest-corruption.js:148-156`. The test currently passes on this host, but
the guarantee is implicit in csv-parse version behavior. If csv-parse defaults
change in a future minor release, this fixture could silently start producing a
row (possibly with a corrupted value in the `name` column), and the test would
still pass while the classification contract (D-33) fails.
**Fix:** Either (a) make the parser options explicit and defensive:

```javascript
records = csv.parse(content, {
  columns: true,
  skip_empty_lines: true,
  bom: true,
  relax_quotes: false, // enforce strict RFC 4180 quote balance
  relax_column_count: false, // let arity mismatches throw
});
```

or (b) strengthen the corrupt-quote fixture to force a more deterministic parse
failure (e.g., a truly unterminated quoted field that spans to EOF with no
closing quote). Option (a) is preferred — it pins the contract at the parser
level rather than the fixture level.

### WR-02: `manifest-generator.js` suppresses `fs.readFile` / `fs.readdir` errors silently in multiple places

**File:** `tools/installer/core/manifest-generator.js:192-198, 282-315, 355-362, 461-463, 812-818`
**Issue:** Several functions use `try { ... } catch {}` or `try { ... } catch { return ... }`
patterns that swallow all errors, including I/O failures (EACCES, ENOTDIR) that the
user should know about. Example at line 461-463:

```javascript
} catch {
  // If we can't read existing manifest, continue with defaults
}
```

If the existing manifest.yaml is corrupt or unreadable due to a permission issue,
the installer will silently regenerate it with a fresh installDate — destroying
the original install-date metadata the doc-comment claims to preserve. This
violates the project CLAUDE.md common rule "Never silently swallow errors."
**Fix:** Differentiate ENOENT (expected — file doesn't exist) from other errors:

```javascript
} catch (error) {
  if (error.code !== 'ENOENT') {
    await prompts.log.warn(`Could not read existing manifest.yaml: ${error.message}. Falling back to defaults.`);
  }
  // ENOENT is the normal fresh-install case — silent is correct there.
}
```

Apply the same pattern to `parseSkillMd`, `getAgentsFromDirRecursive` (readdir),
and `_hasSkillMdRecursive`. This keeps the idempotent-install behavior while
surfacing genuine problems to the operator.

### WR-03: `executeCleanupPlan` leaves orphaned partial backup directory on mid-snapshot failure

**File:** `tools/installer/core/cleanup-planner.js:428-442`
**Issue:** `snapshotFiles` iterates sequentially; if the Nth snapshot fails (e.g.,
ENOSPC on item 3 of 7), the first 2 files are already copied into `backupRoot/`,
and `fs.ensureDir(backupRoot)` was called even earlier. The catch boundary at
`installer.js:572-579` only handles `ManifestCorruptError` specifically — other
errors re-throw, leaving `backupRoot/` as an orphaned partial backup on disk.
This is not a data-loss bug (original files intact — that's the D-34 guarantee),
but over time it can pile up half-populated backup dirs that the user sees and
cannot distinguish from valid ones. No `metadata.json` was written, so it's
detectably-orphaned, but there is no cleanup sweep.
**Fix:** Wrap the snapshot portion in a rollback:

```javascript
async function executeCleanupPlan(plan, workspaceRoot, gomadVersion) {
  if (plan.to_snapshot.length === 0 && plan.to_remove.length === 0) return null;
  const baseTs = formatTimestamp(new Date());
  const backupRoot = await uniqueBackupDir(workspaceRoot, baseTs);
  await fs.ensureDir(backupRoot);
  try {
    await snapshotFiles(plan.to_snapshot, backupRoot);
    await writeMetadata(backupRoot, { gomadVersion, plan });
    await writeBackupReadme(backupRoot, { gomadVersion });
  } catch (error) {
    // Roll back: remove the partial backup dir so the user doesn't see
    // orphaned half-snapshots. Original files are still intact because
    // fs.remove loop never ran.
    await fs.remove(backupRoot).catch(() => {}); // best-effort
    throw error;
  }
  for (const target of plan.to_remove) {
    await fs.remove(target);
  }
  return backupRoot;
}
```

Alternatively, write a `.INCOMPLETE` marker file at `backupRoot/` entry, and only
remove it as the final step of the try block — that signals partial-state without
deleting evidence useful for debugging.

### WR-04: Redundant ternary in `buildCleanupPlan` is a maintainability hazard

**File:** `tools/installer/core/cleanup-planner.js:295`
**Issue:**

```javascript
const rootAbs = installRoot === '_gomad' ? path.join(workspaceRoot, '_gomad') : path.join(workspaceRoot, installRoot);
```

Both branches resolve to the same value (when `installRoot === '_gomad'`,
`path.join(workspaceRoot, installRoot)` trivially yields `workspaceRoot/_gomad`).
The ternary suggests the author intended different behavior for the `_gomad` case
but did not implement it — or copied the pattern from elsewhere without
simplification. If a future refactor introduces a legitimate asymmetry (e.g.,
mapping `_gomad` to a different dir), the ternary makes the intent unclear.
**Fix:** Simplify:

```javascript
const rootAbs = path.join(workspaceRoot, installRoot);
```

If the author DID intend a future asymmetry, document it with a comment
pinning the current equivalence (`// both branches are equivalent today; kept
for future-proofing when install_root='_gomad' gets remapped`).

## Info

### IN-01: `isV11Legacy` parameter shadows module-level export of the same name

**File:** `tools/installer/core/cleanup-planner.js:199`
**Issue:** Inside `buildCleanupPlan` the destructure uses `isV11Legacy: v11` to
rename the destructured property so it does not shadow the module-level export
`isV11Legacy`. This works but is subtle — a future reader may not realize the
rename is defensive. The local shadowing is also what motivated the rename.
**Fix:** Add a one-line comment at line 199:

```javascript
// Rename to `v11` to avoid shadowing the exported `isV11Legacy` helper in this scope.
const { priorManifest, newInstallSet, workspaceRoot, allowedRoots, isV11Legacy: v11, manifestGen } = input;
```

### IN-02: `LEGACY_AGENT_SHORT_NAMES` is a `const` array, not a `ReadonlyArray` at runtime

**File:** `tools/installer/core/cleanup-planner.js:41`
**Issue:** The JSDoc declares `@type {ReadonlyArray<string>}` but the array is
mutable (no `Object.freeze`). A caller could mutate `cleanupPlanner.LEGACY_AGENT_SHORT_NAMES`
and poison all subsequent calls in the same process. This is typed as readonly
but not enforced at runtime — "D-42 source of truth" deserves runtime
enforcement.
**Fix:**

```javascript
const LEGACY_AGENT_SHORT_NAMES = Object.freeze(AgentCommandGenerator.AGENT_SOURCES.map((a) => a.shortName));
```

### IN-03: `renderPlan` summary line lies about "N written" when `to_write` came from prior manifest, not new install

**File:** `tools/installer/core/cleanup-planner.js:486-493`
**Issue:** `plan.to_write = [...newInstallSet]` is populated from the PRIOR manifest's
realpath-resolved entries (installer.js:531-543), NOT from a fresh plan of what
will actually be written. On a v1.1 legacy upgrade the prior manifest is empty, so
`to_write=[]`, and the Summary says "0 written" — misleadingly suggesting the
installer won't write anything, when in fact Phase 6 is about to install the full
module tree. Users reading `--dry-run` output may interpret "0 written" as "no-op
install." The comment in `test-dry-run.js:167-178` half-acknowledges this.
**Fix:** Two options:

1. Rename the section header from "TO WRITE" to "TO PRESERVE (still-needed
   manifest entries)" so the semantic is clear.
2. Actually compute the forward-install set (list of files Phase 6 will write)
   and display that as TO WRITE. Option 1 is lower-risk and sufficient for v1.2.

### IN-04: `toUserVisibleAgentId` / `fromUserVisibleAgentId` lack symmetric round-trip test

**File:** `tools/installer/core/manifest-generator.js:35-58`
**Issue:** The two functions are designed to be inverses (`from(to(x)) === x` for
`gm-agent-*` IDs). There is no unit test verifying round-trip identity. A future
refactor of either function could break the invariant silently. The existing
writeAgentManifest logic depends on this round-trip to dedup correctly across
installs.
**Fix:** Add a round-trip unit test — not phase-blocking, but worth an issue:

```javascript
for (const id of ['gm-agent-pm', 'gm-agent-analyst', 'gm-brainstorming', '', null, undefined]) {
  assert(fromUserVisibleAgentId(toUserVisibleAgentId(id)) === (id || ''), `round-trip for ${id}`);
}
```

### IN-05: `_collectIdeRoots` drops roots starting with `~` or `..` silently

**File:** `tools/installer/core/installer.js:735-738`
**Issue:**

```javascript
if (leading && leading !== '~' && !leading.startsWith('..')) {
  roots.add(leading);
}
```

If a `platform-codes.yaml` entry has `target_dir: ~/gomad/launchers` the leading
`~` is silently dropped. No warning is emitted. A YAML author could accidentally
write `~/gomad` thinking it expands, and the manifest-generator's install_root
detection would fall back to `_gomad` — silent mis-classification.
**Fix:** At minimum, log a warn:

```javascript
if (!leading) continue;
if (leading === '~' || leading.startsWith('..')) {
  await prompts.log.warn(`Dropping IDE root '${leading}' from platform-codes.yaml — home-expansion and parent-traversal not supported in target_dir.`);
  continue;
}
roots.add(leading);
```

### IN-06: `executeCleanupPlan` recomputes timestamp at execute time instead of reusing plan-time

**File:** `tools/installer/core/cleanup-planner.js:432`
**Issue:** `const baseTs = formatTimestamp(new Date());` is computed inside the
executor, meaning the backup-dir timestamp reflects EXECUTE time, not PLAN time.
The `metadata.json.created_at` is also set at execute time (line 352). If a
long-running install runs `buildCleanupPlan` at 14:30:00 and `executeCleanupPlan`
at 14:30:02, the timestamps differ. This is a minor observability issue but
breaks the dry-run-equals-actual contract if a user compares the `--dry-run`
Summary (no timestamp emitted) vs. the backup dir basename across back-to-back
runs. Also note `test-cleanup-execute.js` "collision" case relies on the
execute-time timestamp, which is fine — but the contract deserves documentation.
**Fix:** Either pass `baseTs` through the plan object so it is decided once, or
document that the timestamp is ALWAYS execute-time (a 1-line comment above
line 432 would suffice).

### IN-07: `docs/upgrade-recovery.md` timestamp format claim is slightly off

**File:** `docs/upgrade-recovery.md:82`
**Issue:** The doc says "D-37 timestamp format" but the `YYYYMMDD-HHMMSS`
lexicographic ordering depends on local time (per `formatTimestamp`). Two
installs in different DST zones will NOT sort chronologically by basename — they
sort by wall-clock local time only. This is already called out in the
cleanup-planner doc-comment ("Local time only — no timezone in the name"), but
the upgrade-recovery doc implies lexicographic-equals-chronological
unconditionally. Low impact — DST transitions are rare, and the `created_at`
field in metadata.json disambiguates.
**Fix:** Add a one-line note:

```markdown
Each `_gomad/_backups/<YYYYMMDD-HHMMSS>/` directory is sortable chronologically
*within the same timezone* (lexicographic order matches chronological order by
construction of the D-37 timestamp format). For cross-timezone or DST-boundary
disambiguation, use `metadata.json.created_at` which records a full ISO 8601
timestamp including timezone offset.
```

---

_Reviewed: 2026-04-20_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
