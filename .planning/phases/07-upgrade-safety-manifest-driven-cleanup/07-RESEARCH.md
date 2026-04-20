# Phase 7: Upgrade Safety — Manifest-Driven Cleanup - Research

**Researched:** 2026-04-20
**Domain:** Safe destructive filesystem ops in a CommonJS Node.js installer (csv-parse + fs-extra + commander)
**Confidence:** HIGH for csv-parse / fs-extra / fs.realpath semantics (verified via direct probe). HIGH for installer integration points (verified via direct code read). MEDIUM for Windows NTFS junction behaviour (no Windows host available — verified via Node release notes only).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

(Numbering continues from Phase 6's D-31. All locked — research these, do NOT explore alternatives.)

**Containment + corrupt-manifest policy (INSTALL-05, INSTALL-06)**

- **D-32:** Allowed install roots are derived dynamically from `tools/installer/ide/platform-codes.yaml` PLUS a realpath-containment check. Installer resolves `fs.realpath(path.join(workspaceRoot, install_root, entry.path))` and verifies the result is a prefix-descendant of `fs.realpath(workspaceRoot)`. One check closes three escape vectors: absolute paths, `../` traversal, and symlink-escape.
- **D-33:** `MANIFEST_CORRUPT` policy:
  - csv-parse throws OR header is malformed → whole-manifest corrupt. Log `MANIFEST_CORRUPT: <reason>`, skip cleanup entirely, continue with idempotent install (copy-over, no deletions).
  - A row is missing a required column (`type`, `name`, `path`, `install_root`) → skip that row only, keep the rest. Log `CORRUPT_ROW: <row_idx>: <reason>`.
  - Any row's resolved path fails containment → whole-manifest corrupt (same posture as csv-parse failure).
  - BOM / CRLF are normalization concerns, not corruption. Strip leading `U+FEFF` and `\r\n → \n` silently before parsing.
- **D-34:** Hash-mismatch policy: snapshot to `_gomad/_backups/<ts>/` then remove. Every removal goes through the snapshot flow regardless of hash state; hash-mismatch files get an extra `was_modified: true` marker in `metadata.json`.
- **D-35:** Symlink-escape: refuse the entry, log `SYMLINK_ESCAPE: <path> → <target>, refusing to touch`, continue processing remaining entries. Non-fatal.

**Backup layout + recovery (INSTALL-09)**

- **D-36:** `_gomad/_backups/<timestamp>/` mirrors the `install_root` + relative-path tree.
- **D-37:** Timestamp format `YYYYMMDD-HHMMSS` (e.g. `20260420-143052`). Local time, no TZ in name; documented in metadata.json.
- **D-38:** Mandatory `metadata.json`: `gomad_version`, `created_at` (ISO 8601 with TZ), `reason` ∈ {`manifest_cleanup`, `legacy_v1_cleanup`, `hash_mismatch_only`}, `files[]` (each: `install_root`, `relative_path`, `orig_hash`, `was_modified`), `recovery_hint`.
- **D-39:** `_gomad/_backups/**` excluded from `files-manifest.csv` (both written and read paths). Implemented as a path prefix filter in `manifest-generator.writeFilesManifest`.

**Dry-run UX + destructive-op confirmation (INSTALL-08)**

- **D-40:** `--dry-run` output is human-readable table grouped by section (`TO SNAPSHOT`, `TO REMOVE`, `TO WRITE`) with summary counts. JSON format deferred. Exit code 0 unless parse/IO error.
- **D-41:** Non-dry-run install does NOT prompt for interactive confirmation regardless of file count. Users who want preview run `--dry-run` explicitly.

**v1.1 legacy cleanup scope (INSTALL-07)**

- **D-42:** Legacy cleanup strictly scoped to the 7 known `gm-agent-*` paths. No generic `gm-*` orphan sweep.
- **D-43:** v1.1 path with user files → snapshot whole dir, then remove as unit. `metadata.json.reason = "legacy_v1_cleanup"`, per-file entries get `was_modified: null`.

### Claude's Discretion

- Exact wording of `MANIFEST_CORRUPT`, `SYMLINK_ESCAPE`, containment-rejection log lines.
- Table column widths / visual treatment in dry-run output.
- Placement of recovery procedure documentation (`_gomad/_backups/<ts>/README.md` vs `docs/upgrade-recovery.md` vs `gomad restore` CLI vs combination).
- Plan decomposition (single Phase 7 plan vs split cleanup / backup / dry-run / legacy).
- Integration with v1.1 `_backupUserFiles` pattern at `installer.js:545` (parallel flows vs unified `_gomad/_backups/<ts>/`).
- Whether `--dry-run` performs full manifest validation pass or shallower preview.
- Test-fixture design for corrupt-manifest scenarios.
- Implementation of `_gomad/_backups/**` exclusion (prefix filter in writeFilesManifest vs allow-list in discovery).
- Windows NTFS junction handling specifics.

### Deferred Ideas (OUT OF SCOPE)

- Backup rotation/pruning policy (REL-F1 deferred beyond v1.2)
- JSON dry-run output (`--dry-run-format=json`)
- Interactive destructive-op confirmation (rejected per D-41)
- Generic `gm-*` orphan sweep (rejected per D-42)
- Unified `_gomad/_backups/<ts>/` replacing v1.1 `_backup-temp` (planner discretion only)
- `gomad restore` CLI command
- Windows NTFS junction edge cases (Phase 9 release verification handles)
- `--dry-run` depth of validation (planner discretion)
- Custom agents/skills (CUSTOM-01/02/03 explicitly out of v1.2)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| INSTALL-05 | On re-install, read prior manifest, realpath-contain each entry under allowed install roots, `fs.remove` stale entries before writing new ones | csv-parse already in deps (verified `csv-parse@^6.1.0` in package.json), `readFilesManifest` at installer.js:673 already uses csv.parse with `columns: true`. Cleanup hooks into `_prepareUpdateState` at installer.js:504. New cleanup-plan builder is a pure function on `{prior_manifest, new_install_set, workspace_state}`. |
| INSTALL-06 | Refuse entries that escape allowed roots (absolute paths, `../`, symlink traversal); no deletion outside install roots | `fs.realpath` (Node ≥20, available on macOS/Linux/Windows) returns canonical path; throws `ENOENT` for missing paths. Containment check: `path.relative(wsRoot, resolved)` — if it starts with `..` or is absolute, refuse. Verified via direct probe (Test 6 below). |
| INSTALL-07 | First v1.2 install on v1.1 workspace (no prior manifest) cleans 7 known `.claude/skills/gm-agent-*/` paths | `AgentCommandGenerator.removeLegacyAgentSkillDirs` (agent-command-generator.js:183) already enumerates the 7 paths; Phase 6 calls it inline. Phase 7 wraps the call with snapshot-first contract per D-43 in the no-prior-manifest branch. |
| INSTALL-08 | `--dry-run` prints planned cleanup+copy actions without disk writes; identical actions when run without flag | Commander option `['--dry-run', 'description']` follows existing pattern in `commands/install.js:32-50`. Plan-as-pure-function pattern proven by terraform/yarn/pnpm CLIs; applied here as `buildCleanupPlan(state) → {to_snapshot[], to_remove[], to_write[]}`. |
| INSTALL-09 | Snapshot files-to-be-removed into `_gomad/_backups/<timestamp>/` preserving relative-path structure; documented recovery | `fs-extra@11.3.3` provides `fs.copy(src, dst, { overwrite, errorOnExist })`. Snapshot-then-remove pattern: `await fs.copy(...); await fs.remove(...)` — copy completes fully before remove, so error in copy aborts before any data loss. Metadata.json written via `JSON.stringify` + `fs.writeFile`. |
</phase_requirements>

## Project Constraints (from CLAUDE.md, PROJECT.md, common rules)

- **Zero new runtime deps.** `csv-parse`, `fs-extra`, `commander`, `js-yaml`, `yaml` already in `package.json`. Phase 7 adds NO new packages.
- **CommonJS throughout.** `require()` only; no ESM in `tools/installer/`.
- **80% test coverage minimum** (common rule). Phase 7 adds dedicated test file(s); cleanup-plan builder must have unit coverage.
- **TDD workflow** (common rule): tests first, then implementation. Wave 0 of plan establishes fixtures + skeleton tests before code.
- **No hardcoded secrets** — N/A (no secrets in this phase).
- **Input validation at boundaries** — manifest parsing IS the boundary; D-32 containment check + D-33 corrupt-row classification ARE the validation.
- **Immutable patterns** — cleanup-plan object is built once and never mutated; the plan-execute split (D-41 dry-run-as-preview) depends on this property.
- **File size budget** — common rule says <800 lines per file. `installer.js` is already 1500+ lines; new cleanup logic should land in a new module (`tools/installer/core/cleanup-planner.js` recommended) rather than bloating installer.js further.

## Summary

Phase 7 layers safety back onto Phase 6's "always overwrite" posture (D-21) by introducing a manifest-diff-driven cleanup flow with five tightly coupled capabilities: stale-entry removal, realpath containment, v1.1 legacy cleanup, `--dry-run` preview, and snapshot backups. The defining design property is **plan/execute separation**: a pure `buildCleanupPlan({priorManifest, newInstallSet, workspaceState}) → {to_snapshot[], to_remove[], to_write[]}` function feeds both the dry-run printer and the actual executor, guaranteeing the dry-run-equals-actual invariant (D-41).

The technical environment is forgiving: `csv-parse@^6.1.0` (verified) emits clean error codes (`CSV_QUOTE_NOT_CLOSED`, `CSV_RECORD_INCONSISTENT_COLUMNS`) that map cleanly to D-33's MANIFEST_CORRUPT vs CORRUPT_ROW classification; `fs-extra@11.3.3` (verified) exposes `fs.realpath`, `fs.copy`, `fs.remove`, `fs.lstat`; Node ≥20 (verified v25.2.1 in this env) makes containment checks straightforward via `path.relative(wsRoot, resolved).startsWith('..')`. csv-parse's `bom: true` option strips leading `U+FEFF` natively (verified — without it the BOM bleeds into the first column name); CRLF is handled silently by default (verified). One probe-confirmed gotcha: `path.join('/etc/passwd', wsRoot)` does NOT escape, but `path.resolve(wsRoot, '/etc/passwd')` returns `/etc/passwd` directly — hence containment must be checked against the **resolved realpath**, never the joined path string.

The single highest-value test is the v1.1 legacy upgrade path (D-43): a workspace with all 7 `gm-agent-*/` directories, some containing user `custom.md` files, must produce a complete snapshot under `_gomad/_backups/<ts>/.claude/skills/gm-agent-*/` with metadata.json before the directories are removed and v1.2 launchers written. This single E2E covers INSTALL-07, INSTALL-09, the v1.1→v1.2 migration story, and the Pitfall 2 mass-deletion-prevention contract.

**Primary recommendation:** Extract cleanup logic into a new `tools/installer/core/cleanup-planner.js` module exporting `buildCleanupPlan()` (pure) + `executeCleanupPlan()` (faithful consumer); wire into `_prepareUpdateState` at installer.js:504 with a single call; add `--dry-run` to commander; layer the new flow alongside (not replacing) v1.1's `_backupUserFiles` until a future refactor unifies them.

## Architectural Responsibility Map

Phase 7 is single-tier (Node.js installer process), so the standard frontend/backend tier mapping doesn't apply. Instead, the relevant decomposition is **module ownership** within the installer process:

| Capability | Primary Module | Secondary Module | Rationale |
|------------|----------------|------------------|-----------|
| Manifest read with corruption classification (D-33) | `installer.js:readFilesManifest` (existing, extend) | New `cleanup-planner.js` (consumes results) | Existing function already calls csv-parse; extending in place avoids dual code paths. |
| Realpath containment (D-32) | New `cleanup-planner.js:isContained()` helper | `installer.js:_collectIdeRoots` (existing — provides allowed-root set) | Containment is plan-time validation, belongs with plan builder. _collectIdeRoots already exists. |
| Cleanup-plan computation | New `cleanup-planner.js:buildCleanupPlan()` (pure) | None | Pure function — pure module. Enables unit testing without filesystem. |
| Cleanup-plan execution (snapshot + remove) | New `cleanup-planner.js:executeCleanupPlan()` | `fs-extra` (fs.copy, fs.remove) | Faithful consumer of plan object. Single execution path. |
| Dry-run rendering | New `cleanup-planner.js:renderPlan()` | None | Pure formatter; same input as executor. |
| `--dry-run` flag wiring | `commands/install.js` (extend options[]) | `gomad-cli.js` (no change — Commander auto-discovers) | Existing pattern — add to options array at install.js:32. |
| Legacy v1.1 detection (D-42) | New `cleanup-planner.js:isV11Legacy()` (returns boolean from absence of files-manifest.csv + presence of any of 7 paths) | `agent-command-generator.js:removeLegacyAgentSkillDirs` (existing, used) | One canonical signal: no `_gomad/_config/files-manifest.csv` AND at least one `.claude/skills/gm-agent-*/` exists. |
| Backup snapshot writer | New `cleanup-planner.js:snapshotFiles()` | `fs-extra` (fs.copy, fs.ensureDir) | Snapshot is a primitive operation called by executor. |
| Metadata.json writer | New `cleanup-planner.js:writeMetadata()` | None | One responsibility, isolated. |
| Manifest writer exclusion of `_gomad/_backups/**` (D-39) | `manifest-generator.js:writeFilesManifest` (existing, extend) | None | Filter at the same point that builds `allFiles[]`. |
| `--dry-run` propagation | `commands/install.js` → `Installer.install()` → `_prepareUpdateState()` → `cleanup-planner` | None | Standard option-flow. Add `dryRun` to options object at install.js:107, plumb through. |

## Standard Stack

### Core (already in package.json — verified)

| Library | Version (Verified) | Purpose | Why Standard |
|---------|-------------------|---------|--------------|
| `csv-parse` | ^6.1.0 (current: 6.2.1 on npm 2026-04-20, `npm view csv-parse version`) | Manifest read with corruption detection | Already used in `installer.js:readFilesManifest` (Phase 6 D-27); battle-tested; emits clean error codes for the D-33 classification |
| `fs-extra` | ^11.3.0 (installed: 11.3.3) | `fs.realpath`, `fs.copy`, `fs.remove`, `fs.ensureDir`, `fs.lstat`, `fs.pathExists` | Already used throughout installer; promise-based; safer defaults than `node:fs/promises` for `copy` and `remove` |
| `commander` | ^14.0.0 | `--dry-run` flag definition | Already the project's CLI framework (`gomad-cli.js`); follows existing `[--flag, 'description']` pattern (commands/install.js:32-50) |
| `node:path` | (built-in) | `path.relative`, `path.resolve`, `path.join`, `path.posix.join` | Containment check requires `path.relative` (verified — see Test 6 in Library Reference Notes) |
| `node:fs` (via fs-extra) | (built-in) | `fs.realpath` ENOENT detection | Verified ENOENT behavior — see Test 1 in Library Reference Notes |

### Supporting (already in deps — no install needed)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `js-yaml` / `yaml` | already deps | N/A for Phase 7 (manifest is CSV, not YAML) | Skip — no YAML touched in Phase 7 |
| `node:crypto` | (built-in) | SHA-256 hashing for `was_modified` detection (D-34) | Already used in `manifest-generator.calculateFileHash`; reuse same helper |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `csv-parse/sync` | Streaming `csv-parse` API | Manifest is small (~400 rows max for v1.2); sync API matches existing reader; no perf benefit |
| `fs.realpath` for containment | `path.normalize` + string compare | path.normalize doesn't resolve symlinks → fails D-35 symlink-escape check; realpath is required |
| Custom backup format (tar/zip) | Plain directory tree | D-36 mandates plain directory mirror; recovery hint in metadata.json is `cp -R` (D-38) which only works on plain trees |
| Inquirer/prompts confirmation | Plain `--dry-run` flag | D-41 explicitly rejects interactive prompts |
| Synchronous fs ops | Async/await throughout | Existing installer is async-first; staying async keeps the codebase coherent |

**Installation:** No new packages. All deps already in package.json — verified above.

**Version verification (executed 2026-04-20):**
```bash
npm view csv-parse version  # → 6.2.1 (latest)
npm view fs-extra version   # already installed 11.3.3
npm view commander version  # already installed ^14.0.0
node --version              # → v25.2.1 (≥20 required for fs.realpath promise API)
```

All current. csv-parse is on a stable major (6.x); fs-extra is on a stable major (11.x); commander is on stable major (14.x). No breaking change exposure within the Phase 7 horizon.

## Architecture Patterns

### System Architecture Diagram

```
gomad install [--dry-run]
       │
       ▼
┌────────────────────────────────────────────────┐
│ commands/install.js                            │
│  - parses CLI args (incl. --dry-run)           │
│  - --self / --directory guards (existing)      │
│  - calls Installer.install({ dryRun, ... })    │
└────────────────────┬───────────────────────────┘
                     │
                     ▼
┌────────────────────────────────────────────────┐
│ Installer.install()                            │
│  - existingInstall detection                   │
│  - call _prepareUpdateState() if upgrade       │
└────────────────────┬───────────────────────────┘
                     │
                     ▼  (NEW: Phase 7 cleanup hook)
┌────────────────────────────────────────────────┐
│ _prepareUpdateState() — installer.js:504       │
│                                                │
│  1. priorManifest = readFilesManifest(gomadDir)│
│     ├─ csv-parse with bom:true                 │
│     ├─ classify: MANIFEST_CORRUPT? → return [] │
│     │                                          │
│  2. v1Legacy = isV11Legacy(workspace)          │
│     └─ no files-manifest.csv AND ≥1 of 7 dirs  │
│                                                │
│  3. plan = buildCleanupPlan({                  │
│       priorManifest, newInstallSet,            │
│       workspaceState, allowedRoots, v1Legacy   │
│     })                                         │
│     ├─ for each prior entry:                   │
│     │   ├─ realpath + containment check (D-32) │
│     │   ├─ if escape: log + skip (D-35)        │
│     │   ├─ if not in newInstallSet: to_remove  │
│     │   └─ if hash diff: was_modified=true     │
│     ├─ for each new entry: to_write            │
│     └─ if v1Legacy: prepend 7 dirs to to_remove│
│                                                │
│  4. IF dryRun:                                 │
│     ├─ renderPlan(plan) → stdout               │
│     └─ EXIT 0  ◀── disk untouched              │
│                                                │
│  5. ELSE:                                      │
│     ├─ ts = formatTimestamp(now)               │
│     ├─ snapshotFiles(plan.to_snapshot, ts)     │
│     ├─ writeMetadata(ts, plan, reason)         │
│     ├─ removeFiles(plan.to_remove)             │
│     └─ continue with normal install            │
└────────────────────────────────────────────────┘
                     │
                     ▼
┌────────────────────────────────────────────────┐
│ Normal install flow (Phase 6 — unchanged)      │
│  - skill install                               │
│  - launcher generation                         │
│  - manifest write (with _gomad/_backups/**     │
│    EXCLUSION per D-39)                         │
└────────────────────────────────────────────────┘
```

The defining property: **`buildCleanupPlan` is pure**. Step 4 (dry-run exit) and step 5 (execute) consume the same plan object. No re-computation, no re-classification — the dry-run-equals-actual invariant is enforced by construction.

### Recommended Project Structure

```
tools/installer/
├── core/
│   ├── installer.js                  # extends readFilesManifest (BOM/corrupt-row handling)
│   │                                 # extends _prepareUpdateState (calls cleanup-planner)
│   ├── manifest-generator.js         # extends writeFilesManifest (excludes _gomad/_backups/**)
│   └── cleanup-planner.js            # NEW — pure plan + execute split
│       ├─ buildCleanupPlan()         # pure function
│       ├─ isContained()              # realpath containment
│       ├─ isV11Legacy()              # legacy-state detector
│       ├─ executeCleanupPlan()       # snapshot + remove
│       ├─ snapshotFiles()
│       ├─ writeMetadata()
│       ├─ renderPlan()               # human-readable table
│       └─ formatTimestamp()          # YYYYMMDD-HHMMSS
├── commands/
│   └── install.js                    # adds --dry-run option
└── ide/
    └── _config-driven.js             # unchanged in Phase 7

test/
├── test-cleanup-planner.js           # NEW — unit tests for buildCleanupPlan (pure)
├── test-cleanup-execute.js           # NEW — integration tests for snapshot+remove
├── test-manifest-corruption.js       # NEW — fixture-driven D-33 tests
├── test-legacy-v11-upgrade.js        # NEW — E2E: v1.1 workspace → v1.2 install
├── test-dry-run.js                   # NEW — dry-run output format + identity test
└── fixtures/
    ├── manifests/
    │   ├── valid-v2.csv
    │   ├── corrupt-bom.csv           # leading U+FEFF
    │   ├── corrupt-crlf.csv          # \r\n line endings
    │   ├── corrupt-quote.csv         # unclosed quote
    │   ├── corrupt-arity.csv         # wrong column count
    │   ├── corrupt-header.csv        # malformed header
    │   ├── corrupt-row-missing.csv   # row missing required column
    │   ├── escape-absolute.csv       # entry with absolute path
    │   ├── escape-traverse.csv       # entry with ../
    │   └── duplicate-paths.csv       # two rows, same path
    └── workspaces/
        ├── v11-with-customs/         # 7 gm-agent-* dirs, some with custom.md
        └── v11-clean/                # 7 gm-agent-* dirs, no custom files
```

### Pattern 1: Plan-Then-Execute (the dry-run-equals-actual invariant)

**What:** Compute a plain-object `plan` first; then either render it OR execute it. Never let the executor branch on dry-run state.

**When to use:** Any destructive op that must support `--dry-run`. Industry precedent: Terraform (`terraform plan` → `terraform apply`), Ansible (`--check`), pnpm install (`--lockfile-only` then `pnpm install`).

**Example:**
```javascript
// Source: industry standard (Terraform / pnpm pattern); applied to GoMad cleanup
// In tools/installer/core/cleanup-planner.js

/**
 * Pure: build a plan describing what cleanup will do.
 * No filesystem writes. Realpath calls are reads only.
 *
 * @param {Object} input
 * @param {Array} input.priorManifest - rows from readFilesManifest
 * @param {Set<string>} input.newInstallSet - absolute paths the new install will write
 * @param {string} input.workspaceRoot - target workspace root (already realpath-resolved)
 * @param {Set<string>} input.allowedRoots - install_root values from platform-codes.yaml
 * @param {boolean} input.isV11Legacy - true if no prior manifest AND ≥1 of 7 legacy dirs
 * @returns {Promise<Plan>} { to_snapshot, to_remove, to_write, refused, hash_mismatches }
 */
async function buildCleanupPlan(input) {
  const plan = {
    to_snapshot: [],
    to_remove: [],
    to_write: [...input.newInstallSet],
    refused: [],          // per-entry rejections (logged, not aborted)
    hash_mismatches: [],  // for was_modified marker
    reason: input.isV11Legacy ? 'legacy_v1_cleanup' : 'manifest_cleanup',
  };

  // v1.1 legacy branch: 7 dirs override manifest-driven logic per D-42/D-43
  if (input.isV11Legacy) {
    for (const dirName of LEGACY_AGENT_DIRS) {
      const legacyPath = path.join(input.workspaceRoot, '.claude', 'skills', dirName);
      if (await fs.pathExists(legacyPath)) {
        // D-43: snapshot whole dir as unit, was_modified=null (v1.1 had no hash)
        plan.to_snapshot.push({ src: legacyPath, install_root: '.claude', was_modified: null });
        plan.to_remove.push(legacyPath);
      }
    }
    return plan;
  }

  // Standard manifest-diff branch
  for (const [idx, entry] of input.priorManifest.entries()) {
    const installRoot = entry.install_root || '_gomad';
    if (!input.allowedRoots.has(installRoot)) {
      plan.refused.push({ idx, entry, reason: 'UNKNOWN_INSTALL_ROOT' });
      continue;
    }

    const joined = path.join(input.workspaceRoot, installRoot, entry.path);
    let resolved;
    try {
      resolved = await fs.realpath(joined);
    } catch (e) {
      if (e.code === 'ENOENT') {
        // Already removed — normal idempotency case, not corrupt
        continue;
      }
      throw e;  // unexpected — let it bubble
    }

    if (!isContained(resolved, input.workspaceRoot)) {
      // D-32 + D-35: containment failure → poison the whole batch (D-33)
      throw new ManifestCorruptError(`Entry ${idx} escapes workspace: ${resolved}`);
    }

    if (input.newInstallSet.has(resolved)) continue;  // still needed, no action

    // Stale entry — snapshot + remove
    let wasModified = false;
    if (entry.hash) {
      const currentHash = await sha256(resolved);
      wasModified = (currentHash !== entry.hash);
    }
    plan.to_snapshot.push({ src: resolved, install_root: installRoot, was_modified: wasModified });
    plan.to_remove.push(resolved);
    if (wasModified) plan.hash_mismatches.push(resolved);
  }

  return plan;
}

/** Faithful executor — no decisions, no branching on plan content. */
async function executeCleanupPlan(plan, workspaceRoot, gomadVersion) {
  if (plan.to_snapshot.length === 0 && plan.to_remove.length === 0) return;
  const ts = formatTimestamp(new Date());
  const backupRoot = path.join(workspaceRoot, '_gomad', '_backups', ts);
  await snapshotFiles(plan.to_snapshot, backupRoot);
  await writeMetadata(backupRoot, { gomad_version: gomadVersion, plan, reason: plan.reason });
  for (const target of plan.to_remove) {
    await fs.remove(target);
  }
}
```

### Pattern 2: Realpath Containment Check

**What:** A path is "contained" within wsRoot iff `path.relative(wsRoot, resolvedPath)` does not start with `..` AND is not an absolute path.

**When to use:** Every manifest entry, before any `fs.remove` call.

**Example (verified — see Library Reference Notes Test 6):**
```javascript
// Source: Node.js path module docs + verified probe (2026-04-20)
function isContained(resolved, wsRoot) {
  const rel = path.relative(wsRoot, resolved);
  // Inside: rel doesn't start with .. and isn't absolute
  // Outside: rel starts with .. (parent traversal) or is absolute (different root)
  return !rel.startsWith('..' + path.sep) && rel !== '..' && !path.isAbsolute(rel);
}
```

The crucial invariant: **resolve before checking**. `path.join('/etc/passwd', wsRoot)` → `/private/tmp/realpath-test/workspace/etc/passwd` (looks contained, isn't); `path.resolve(wsRoot, '/etc/passwd')` → `/etc/passwd` (correctly outside). Always use `await fs.realpath(joinedPath)` and check the result, never check the joined string.

### Pattern 3: BOM/CRLF Normalization (D-33)

**What:** Strip leading `U+FEFF` and convert `\r\n → \n` before parsing. Or use csv-parse's `bom: true` option which handles BOM natively (verified — see Library Reference Notes Test 2).

**Example:**
```javascript
// Source: csv-parse docs + verified probe
async function readFilesManifestSafe(gomadDir) {
  const filesManifestPath = path.join(gomadDir, '_config', 'files-manifest.csv');
  if (!(await fs.pathExists(filesManifestPath))) return [];

  let content;
  try {
    content = await fs.readFile(filesManifestPath, 'utf8');
  } catch (e) {
    await prompts.log.warn(`MANIFEST_CORRUPT: cannot read manifest: ${e.message}`);
    return [];
  }

  // D-33: BOM/CRLF are normalization, not corruption
  // csv-parse's bom: true strips leading U+FEFF (verified)
  // CRLF is handled silently by default (verified)
  let records;
  try {
    records = csv.parse(content, {
      columns: true,
      skip_empty_lines: true,
      bom: true,                      // D-33 BOM normalization
      // relax_column_count omitted intentionally — arity mismatch IS corrupt-row per D-33
    });
  } catch (e) {
    // Whole-manifest corrupt classification per D-33
    // Known codes: CSV_QUOTE_NOT_CLOSED, CSV_RECORD_INCONSISTENT_COLUMNS,
    //              CSV_INVALID_CLOSING_QUOTE, CSV_OPTION_COLUMNS_MISSING_NAME
    await prompts.log.error(`MANIFEST_CORRUPT: ${e.code || 'parse error'}: ${e.message}`);
    return [];
  }

  // Per-row validation (D-33 corrupt-row policy)
  const valid = [];
  for (const [idx, row] of records.entries()) {
    const required = ['type', 'name', 'path', 'install_root'];
    const missing = required.filter((k) => !row[k]);
    if (missing.length > 0) {
      await prompts.log.warn(`CORRUPT_ROW: row ${idx}: missing column(s) ${missing.join(',')}`);
      continue;
    }
    valid.push(row);
  }
  return valid;
}
```

### Pattern 4: Snapshot-Then-Remove Ordering

**What:** Always copy first, then delete. If copy throws, the delete never runs — original data is intact. fs-extra's `fs.copy` waits for completion before its promise resolves; if it rejects, the await throws and execution halts before `fs.remove`.

**Example:**
```javascript
// Source: fs-extra docs + standard atomicity pattern
async function snapshotFiles(toSnapshot, backupRoot) {
  for (const { src, install_root } of toSnapshot) {
    // D-36: backup tree mirrors install_root + relative path
    const wsRoot = path.dirname(path.dirname(backupRoot)); // _gomad/_backups/<ts> → wsRoot
    const rootAbs = install_root === '_gomad'
      ? path.join(wsRoot, '_gomad')
      : path.join(wsRoot, install_root);
    const relativePath = path.relative(rootAbs, src);
    const backupPath = path.join(backupRoot, install_root, relativePath);

    await fs.ensureDir(path.dirname(backupPath));
    await fs.copy(src, backupPath, { preserveTimestamps: true });
    // If we reach here, copy succeeded. Caller will then call fs.remove(src).
  }
}
```

**Key invariant:** the executor calls `snapshotFiles()` THEN `fs.remove()` in a sequential loop. A snapshot failure aborts before any delete. The opposite ordering would risk data loss.

### Pattern 5: Commander Boolean Flag (No Argument)

**What:** `--dry-run` is a boolean flag — its presence means `true`, absence means `false`. Commander 14 handles this with `[flag, description]` syntax (no third argument).

**Example:**
```javascript
// Source: commander.js v14 docs + existing pattern in commands/install.js:32-50
options: [
  // ... existing flags ...
  ['--dry-run', 'Print the planned cleanup + copy actions without touching disk (Phase 7)'],
],
// At Installer.install({ dryRun, ... }), `dryRun` is `true` if --dry-run was passed,
// `undefined` otherwise. Use `!!dryRun` or `dryRun === true` for clean booleans.
```

### Anti-Patterns to Avoid

- **Branching the executor on `dryRun`.** If `executeCleanupPlan(plan, { dryRun })` has `if (dryRun) return;` inside its loops, the dry-run-equals-actual invariant is broken — a code path executed only when `dryRun === true` is by definition untested in the real path. Instead: check `dryRun` ONCE at the call site (`if (dryRun) return renderPlan(plan); else return executeCleanupPlan(plan)`).
- **Using `path.normalize` instead of `fs.realpath`.** path.normalize doesn't resolve symlinks, so it cannot detect symlink-escape (D-35). Always realpath.
- **Reading manifest without `bom: true`.** Verified — without it, the first column header becomes `\uFEFFtype` instead of `type`, silently corrupting every row's column lookup. Use `bom: true`.
- **Catching errors broadly inside executeCleanupPlan.** The snapshot-then-remove invariant depends on errors propagating. A try/catch that logs and continues will allow remove to run after a failed snapshot.
- **Using `path.join` results directly for containment.** `path.join('/etc/passwd', wsRoot)` does not escape, but `path.resolve(wsRoot, '/etc/passwd')` does. Always realpath the resolved path and check via `path.relative`.
- **Storing absolute paths in metadata.json.** Recovery must work regardless of where the workspace was moved. Store `install_root` (e.g. `.claude`) + `relative_path` (e.g. `commands/gm/agent-pm.md`); reconstruct absolute path at recovery time. D-38 already specifies this shape.
- **Letting `_gomad/_backups/<ts>/metadata.json` itself appear in next install's files-manifest.csv.** D-39 mandates exclusion. The exclusion must apply BEFORE `manifest-generator.allInstalledFiles` is iterated (or as a filter inside the loop), not after the manifest is written.
- **Hand-rolling timestamp formatting.** Use `String(d.getFullYear()).padStart(4,'0') + ...` etc. or Date helpers. Avoid `toISOString().replace(/[:T.-Z]/g, '')` because it produces a 14+ digit number not separated by `-` (D-37 mandates `YYYYMMDD-HHMMSS`).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CSV parsing | Hand-rolled toggle-quote parser | `csv-parse/sync` | Already in deps; Pitfall 2 root cause was hand-rolled parser losing on quotes/BOM/CRLF; csv-parse handles all of those plus emits clean error codes |
| Path containment | String prefix match (`resolved.startsWith(wsRoot)`) | `path.relative(wsRoot, resolved).startsWith('..')` | startsWith is wrong when wsRoot is `/foo` and resolved is `/foobar/x` (false positive). path.relative handles separator semantics correctly. |
| Symlink resolution | `fs.lstat` chain-following | `fs.realpath` | realpath resolves the entire chain in one syscall and surfaces canonical path; lstat-chain is stateful, race-prone, slower |
| Recursive directory copy | `for-await of fs.readdir` + recursive copy | `fs.copy(src, dst)` (fs-extra) | fs-extra handles directory recursion, file mode preservation, error semantics; reimplementation is 50+ lines and likely buggy |
| Recursive directory remove | `for-await of fs.readdir` + recursive unlink | `fs.remove(target)` (fs-extra) | Same — fs-extra handles ENOENT idempotency, is symlink-aware |
| SHA-256 hashing | Inline `crypto.createHash` | `manifest-generator.calculateFileHash()` | Existing helper at `manifest-generator.js:638`; reuse keeps hash semantics consistent across read/write/diff paths |
| Timestamp formatting | `toISOString` + regex replace | Manual `padStart` chain | toISOString produces UTC; D-37 specifies local time. Manual chain is 5 lines and correct: `${y}${mm}${dd}-${HH}${MM}${SS}`. |
| YAML parsing | Regex extraction | `yaml.parse` (already a dep) | Not relevant for Phase 7 (manifest is CSV) — listed for completeness |
| Atomic file writes | `fs.writeFile` + try/catch | `fs.writeFile` is atomic on POSIX for files < PIPE_BUF | Good enough for metadata.json; manifest itself is rewritten atomically via existing pattern |
| Argparse | Hand-rolled `process.argv` parsing | `commander` (already in deps) | Adding `--dry-run` is a single line in `commands/install.js` options[] |
| Console styling | ANSI escape strings | `prompts.log.{info,warn,error}` (existing) + `picocolors` for color | Already in deps; consistent visual language with rest of installer |

**Key insight:** Phase 7 is a "use what's there" phase. Every primitive needed (CSV, hashing, copy, remove, realpath, CLI flag, logging) already lives in the codebase or its dependencies. The only NEW code is the orchestration layer (`cleanup-planner.js`) that composes these primitives into the safety contract.

## Runtime State Inventory

> Phase 7 IS itself a manifest-driven cleanup phase, so this section maps the inventory the cleanup mechanism must handle (not the inventory affected by Phase 7's own implementation).

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| **Stored data** | `_gomad/_config/files-manifest.csv` is the cleanup driver. v1.1 manifests lack `schema_version` and `install_root` columns; Phase 6 (D-23) wrote v2 manifests with both. Phase 7 reads BOTH v1 and v2 (Phase 6 reader at installer.js:691 already defaults `install_root='_gomad'` for v1 rows). | Read existing manifest with corruption classification; for legacy v1 paths, default install_root='_gomad' (already done at installer.js:691). No data migration needed beyond this read-shim. |
| **Live service config** | None — Phase 7 doesn't touch external services. | None. |
| **OS-registered state** | None — installer doesn't register anything with the OS (no Task Scheduler, no systemd, no launchd, no PATH modification). | None. |
| **Secrets/env vars** | None. | None. |
| **Build artifacts** | (a) Phase 6's `_gomad/gomad/agents/*.md` (extracted personas) and `.claude/commands/gm/agent-*.md` (launchers) — these are PHASE 7'S CLEANUP TARGETS. (b) `node_modules/@xgent-ai/gomad/` is read-only from the installer's view, never modified. | Cleanup must enumerate these correctly via the new manifest. v1.1's `_backup-temp` directories at workspace root (created by `_backupUserFiles` at installer.js:545) live in parallel — D-41 Claude's Discretion notes the planner may unify or keep parallel. |

**Nothing found in category:** Categories 2, 3, 4 confirmed via direct code inspection — installer has no external service or OS integration; only file I/O.

## Common Pitfalls

This section EXTENDS PITFALLS.md entries 2, 3, 15, and 19 with Phase-7-specific implementation detail.

### Pitfall 2 (extended): Manifest-driven cleanup deletes user files

**What goes wrong (Phase 7 specifics):**
A user's `.claude/commands/gm/agent-pm.md` was hand-edited to inline French translations. The file's hash differs from manifest. D-34 says: snapshot then remove. If the executor's snapshot step silently fails (e.g., disk full mid-snapshot, EACCES on a read-only `_gomad/_backups/<ts>/` directory created earlier in the same install), the remove step still runs in the *current* code pattern of "best-effort cleanup." User loses the French translation.

**Why it happens (Phase 7 specifics):**
1. csv-parse without `bom: true` reads `\uFEFFtype` as the first column header — verified via probe. Every row's `type` lookup returns undefined → CORRUPT_ROW for every row → no cleanup happens (recoverable failure mode per D-33). BUT: if a column's value is empty AND the row passes the missing-column check by accident (e.g., the planner forgets to validate `path` is non-empty), `path.join(wsRoot, installRoot, '')` resolves to the install root itself — and `fs.remove` would obliterate the entire install root.
2. `path.join(wsRoot, '_gomad', '../../../etc/passwd')` returns `/etc/passwd`-equivalent — but with `path.realpath` first, the result is `/etc/passwd` (verified Test 5). Containment check via `path.relative(wsRoot, resolved).startsWith('..')` catches it.
3. Symlink target outside workspace: `_gomad/escape-link → /etc/passwd` resolves via `fs.realpath` to `/etc/passwd` (verified Test 3). `path.relative(wsRoot, '/etc/passwd')` returns `../../../../etc/passwd` (starts with `..`). Refused per D-35.
4. **Race condition during snapshot.** If the user is editing the file as `gomad install` runs, snapshot copies an in-flight file. Acceptable — backup is best-effort, source is the authoritative copy until rm.
5. **Disk full during snapshot.** fs.copy throws ENOSPC. Executor must propagate; remove must NOT run. Achieve via the sequential ordering pattern; do NOT wrap snapshot+remove in a single try/catch that suppresses errors.

**How to avoid (Phase 7 specifics):**
- Use `bom: true` in csv-parse options (verified resolves BOM bleed).
- Validate every row has non-empty `path` AND non-empty `install_root` AND non-empty `name` AND non-empty `type` per D-33's row-skip clause.
- Realpath containment check on every entry, before any `fs.remove`. Use `path.relative` not `startsWith`.
- Sequential snapshot-then-remove with no try/catch wrapping the pair. Let errors propagate.
- Test fixture: a `corrupt-empty-path.csv` row with `type=file,name=foo,path=,install_root=_gomad` MUST be classified CORRUPT_ROW and skipped.
- Test: snapshot ENOSPC simulation (use a tmpfs with size 1KB) — assert remove never runs.

**Warning signs (Phase 7 specifics):**
- After a `gomad install` upgrade, `_gomad/` is empty or smaller than expected — manifest entries with empty `path` may have been processed.
- `_gomad/_backups/<ts>/` is empty but files-manifest.csv was renewed — snapshot path failed silently.
- Test that writes a malformed manifest fixture and asserts mass-deletion does NOT happen.

### Pitfall 3 (extended): Symlinked existing installs

**Already largely closed by Phase 6 D-22 (symlink pre-check on re-install at `_config-driven.js:175-197`).** Phase 7 layer:

- The new realpath containment (D-32) provides defense-in-depth. Even if a v1.1 → v1.2 upgrade missed a symlink unlink in Phase 6's flow, Phase 7's containment check catches it: a manifest entry pointing at a directory that's actually a symlink resolves via `fs.realpath` to the symlink target — if outside workspace, refused per D-35.
- Phase 7's snapshot operation must NOT follow symlinks when copying. fs-extra's `fs.copy` follows symlinks by default — but at this point in the flow, the source is already `realpath`-resolved, so it points at the actual file, not a link. The copy operates on real files.

### Pitfall 15 (extended): v1.1 manifest schema collision

**Already largely closed by Phase 6 D-23 (per-row schema_version column).** Phase 7 layer:

- Phase 7's `readFilesManifest` must distinguish "v1 row, missing install_root" (treat as `_gomad`) from "v2 row, install_root deliberately blank" (CORRUPT_ROW). Phase 6's reader at installer.js:691 already does the right thing: `r.install_root || '_gomad'`. Phase 7 keeps this behavior — a missing install_root column on the row is treated as v1 implicit `_gomad`. A present-but-empty install_root cell on a row that ALSO has `schema_version='2.0'` is corrupt.
- Phase 7's CORRUPT_ROW check should be: `if (!row.path || !row.type) → CORRUPT_ROW; if (!row.install_root && row.schema_version === '2.0') → CORRUPT_ROW; else default install_root='_gomad'`.

### Pitfall 19 (extended): Windows path separators

**Already largely closed by Phase 6 D-26 (forward-slash normalization on write).** Phase 7 layer:

- When building backup paths per D-36 (`_gomad/_backups/<ts>/<install_root>/<relative_path>`), use `path.join` for actual filesystem ops (which produces native separators on Windows) and `path.posix.join` for any path that ends up serialized into metadata.json or files-manifest.csv (which must remain forward-slash). Test fixture: a Windows-format manifest with `\` separators — Phase 7 should still process correctly because manifest paths are forward-slash by Phase 6 contract; if they contain `\` it's a v1-era manifest, normalize on read via `replaceAll('\\', '/')` before joining.

### NEW: Pitfall 21 — Timestamp collision within the same second

**What goes wrong:**
Two `gomad install` invocations within the same second produce identical `YYYYMMDD-HHMMSS` directory names. Second invocation's snapshot writes into the first invocation's backup dir, mixing files from two separate cleanup events; or fails with EEXIST if `fs.copy` is called with `errorOnExist: true`.

**Why it happens:**
D-37 specifies second-resolution. CI matrix runs, automation, and shell scripts can absolutely fire `gomad install` twice within a second.

**How to avoid:**
- Detect collision: if `_gomad/_backups/<ts>/` already exists, append `-N` suffix where N is the smallest integer making the path unique (`-2`, `-3`, ...). The suffix is rare enough that it doesn't pollute the chronological-ordering property.
- Document the suffix in metadata.json's `created_at` (full ISO 8601 with ms) so users can disambiguate.
- Alternative: extend the format to `YYYYMMDD-HHMMSS-mmm` (millisecond suffix). Rejects D-37 as written; planner discretion to escalate or accept the `-N` suffix approach.

**Warning signs:**
- Test: invoke install twice in rapid succession; assert two distinct backup dirs exist.

### NEW: Pitfall 22 — fs.realpath on non-existent files

**What goes wrong:**
A manifest entry points at `_gomad/foo.md` but the user manually deleted `foo.md` between installs. `fs.realpath('/.../foo.md')` throws `ENOENT` (verified Test 1). If the planner classifies ENOENT as MANIFEST_CORRUPT, every install where a user has deleted a previously-installed file becomes a "skip cleanup" event — degrading the upgrade silently to no-cleanup. Worse, if planner classifies ENOENT as a hard error, install ABORTS.

**Why it happens:**
ENOENT is the realpath-of-nonexistent-path signal. It's normal — not corruption.

**How to avoid:**
- Catch ENOENT specifically inside the per-entry realpath call. Treat as `already_removed` — skip this entry, do NOT classify as corrupt, do NOT abort. The CONTEXT.md `<specifics>` section calls this out explicitly: "Don't classify this as corrupt — log it as already_removed and skip that entry; it's a normal idempotency case."
- Test: manifest entry → file doesn't exist → realpath throws ENOENT → cleanup completes without that entry, no log spam.

### NEW: Pitfall 23 — Backup metadata.json validation absent at recovery time

**What goes wrong:**
User runs `cp -R _gomad/_backups/<ts>/* ./` per D-38's recovery_hint. metadata.json says the backup was for reason `manifest_cleanup` against `gomad_version=1.2.0`, but the user's current install is `1.5.0` and the install_root semantics changed in 1.4.0 (hypothetical). Recovery clobbers files with wrong-shape paths.

**Why it happens:**
v1.2 has no `gomad restore` CLI (deferred). Recovery is manual cp -R — there's no version compat check.

**How to avoid (Phase 7 scope):**
- metadata.json's `gomad_version` field (D-38 mandatory) gives recovery scripts a hook to verify compatibility — but Phase 7 itself doesn't act on this. Document in `_gomad/_backups/<ts>/README.md` (Claude's Discretion in CONTEXT.md): "Verify metadata.json.gomad_version matches your current install before running cp -R."
- Future `gomad restore` (deferred) is the proper fix. v1.2 ships the metadata; the consumer is human or future tooling.

## Code Examples

### Common Operation 1: Detecting v1.1 legacy state

```javascript
// Source: derived from CONTEXT.md D-42 + agent-command-generator.js:183
// One canonical signal: no manifest AND ≥1 of 7 legacy dirs
const LEGACY_AGENT_SHORT_NAMES = ['analyst', 'tech-writer', 'pm', 'ux-designer', 'architect', 'sm', 'dev'];

async function isV11Legacy(workspaceRoot, gomadDir) {
  const manifestPath = path.join(gomadDir, '_config', 'files-manifest.csv');
  if (await fs.pathExists(manifestPath)) return false;  // v1.2+ install present
  for (const shortName of LEGACY_AGENT_SHORT_NAMES) {
    const legacyDir = path.join(workspaceRoot, '.claude', 'skills', `gm-agent-${shortName}`);
    if (await fs.pathExists(legacyDir)) return true;
  }
  return false;
}
```

### Common Operation 2: Building allowed-roots set from platform-codes.yaml

```javascript
// Source: existing pattern at installer.js:_collectIdeRoots (lines 648-666)
// Reuse this directly; D-32 says "derived dynamically from platform-codes.yaml"
async function collectAllowedRoots() {
  const ideRoots = await this._collectIdeRoots();  // existing
  return new Set(['_gomad', '.claude', ...ideRoots]);
}
```

### Common Operation 3: Timestamp formatting (D-37)

```javascript
// Source: D-37 spec — local time, lexicographic-orderable, Windows-safe
function formatTimestamp(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return (
    date.getFullYear() +
    pad(date.getMonth() + 1) +
    pad(date.getDate()) + '-' +
    pad(date.getHours()) +
    pad(date.getMinutes()) +
    pad(date.getSeconds())
  );
}

// Collision-safe variant for Pitfall 21
async function uniqueBackupDir(workspaceRoot, baseTs) {
  const baseDir = path.join(workspaceRoot, '_gomad', '_backups', baseTs);
  if (!(await fs.pathExists(baseDir))) return baseDir;
  let i = 2;
  while (await fs.pathExists(`${baseDir}-${i}`)) i++;
  return `${baseDir}-${i}`;
}
```

### Common Operation 4: Dry-run table renderer (D-40)

```javascript
// Source: D-40 spec — human-readable table grouped by section + summary
function renderPlan(plan) {
  const lines = [];
  if (plan.to_snapshot.length > 0) {
    lines.push(`TO SNAPSHOT (${plan.to_snapshot.length} files)`);
    for (const item of plan.to_snapshot) {
      const tag = item.was_modified === true ? '(user-modified, hash-diff)'
                : item.was_modified === false ? '(from files-manifest.csv)'
                : '(legacy v1.1, hash unknown)';
      lines.push(`  ${item.relativeForDisplay}    ${tag}`);
    }
    lines.push('');
  }
  if (plan.to_remove.length > 0) {
    lines.push(`TO REMOVE (${plan.to_remove.length} files)`);
    lines.push('  <same list — snapshot is prerequisite>');
    lines.push('');
  }
  if (plan.to_write.length > 0) {
    lines.push(`TO WRITE (${plan.to_write.length} files)`);
    for (const p of plan.to_write) {
      lines.push(`  ${p.relativeForDisplay}`);
    }
    lines.push('');
  }
  lines.push(`Summary: ${plan.to_snapshot.length} snapshotted, ${plan.to_remove.length} removed, ${plan.to_write.length} written`);
  if (plan.refused.length > 0) {
    lines.push(`Refused: ${plan.refused.length} entries (see logs above)`);
  }
  return lines.join('\n');
}
```

### Common Operation 5: metadata.json shape (D-38)

```javascript
// Source: D-38 spec
async function writeMetadata(backupRoot, { gomad_version, plan, reason }) {
  const metadata = {
    gomad_version,
    created_at: new Date().toISOString(),  // full TZ fidelity
    reason,                                 // manifest_cleanup | legacy_v1_cleanup | hash_mismatch_only
    files: plan.to_snapshot.map((item) => ({
      install_root: item.install_root,
      relative_path: item.relative_path,
      orig_hash: item.orig_hash || null,
      was_modified: item.was_modified,
    })),
    recovery_hint: `Restore with: cp -R $(pwd)/_gomad/_backups/${path.basename(backupRoot)}/* ./`,
  };
  await fs.writeFile(path.join(backupRoot, 'metadata.json'), JSON.stringify(metadata, null, 2));
}
```

### Common Operation 6: Excluding _gomad/_backups/** from manifest write (D-39)

```javascript
// Source: D-39 spec — implement in manifest-generator.writeFilesManifest
// Currently at manifest-generator.js:660+, the loop iterates this.allInstalledFiles
// Add a filter at the top of the loop:
const BACKUP_PREFIX = path.join('_gomad', '_backups') + path.sep;
for (const filePath of this.allInstalledFiles) {
  // D-39: never include _gomad/_backups/** in the manifest
  // Check both as absolute path containing the prefix and as relative path starting with it
  if (filePath.includes(BACKUP_PREFIX) || filePath.includes('/_gomad/_backups/')) continue;
  // ... existing logic ...
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Hand-rolled CSV with toggle-quote (Pitfall 2) | csv-parse with `bom: true` + per-row validation | Phase 6 D-27 (read+write swap) | Closes BOM/CRLF/quote-edge bugs at the parser layer |
| Per-IDE legacy directory cleanup (`legacy_targets`) | Manifest-driven diff (Phase 7) for v1.2-and-later; legacy 7-dir branch (D-42) for v1.1→v1.2 first install | Phase 7 introduces | Generalizes; v1.1's path-based scan was per-IDE-specific and easy to drift |
| `_gomad-{custom,modified}-backup-temp/` (v1.1) | `_gomad/_backups/<YYYYMMDD-HHMMSS>/` (Phase 7 manifest-cleanup path) | Phase 7 introduces parallel flow | D-41 Claude's Discretion: planner may unify or keep parallel; recommendation is keep parallel for v1.2 to minimize risk |
| `--yes` flag as the only confirmation gate | `--dry-run` as the preview mechanism | Phase 7 D-41 | Removes interactive prompt complexity; CI-friendly |

**Deprecated/outdated:**
- Hand-rolled CSV parser (Pitfall 2 root cause) — was superseded in Phase 6 D-27.
- Following symlinks during install copy (Pitfall 3) — was superseded in Phase 6 D-19/D-20 with detect-and-unlink.
- v1.1 `gm-agent-*` skill directory invocation form — Phase 6 D-29 removed atomically, Phase 7 D-42/D-43 backs up first if user files present.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `fs.copy` with `preserveTimestamps: true` works correctly across macOS APFS, Linux ext4, and Windows NTFS for the snapshot operation | Pattern 4 | LOW — fs-extra uses underlying fs.copyFile which handles all three; preserveTimestamps is best-effort and a failure to set timestamps doesn't break recovery |
| A2 | Windows NTFS junctions behave like symlinks under `fs.realpath` in Node ≥20 (per Phase 6 CONTEXT.md note D-W-Note) | Pitfall 3 extended | MEDIUM — if junctions don't realpath-resolve through the link, containment check could miss escapes via junction. Mitigation: Phase 9 release verification (REL-04) covers Windows CI matrix |
| A3 | csv-parse's `bom: true` option's behavior is stable across the 6.x major | Pattern 3 | LOW — verified on 6.2.1 (current); 6.x is the active major; no breaking change indicated in changelog |
| A4 | Two `gomad install` invocations within the same second is realistic enough to need disambiguation (Pitfall 21) | Pitfall 21 | MEDIUM — CI matrix and automation make it possible; the `-N` suffix mitigation is cheap, recommend including it |
| A5 | Users will recover via manual `cp -R` per D-38 (no `gomad restore` CLI in v1.2) | Pitfall 23 | LOW — D-38 metadata is sufficient for manual recovery; future CLI can be added without breaking v1.2 backups |
| A6 | The `_gomad/_backups/<ts>/` directory will not be the destination of any other install operation (no race) | Pattern 4 | LOW — only the cleanup planner writes to this path; no other code path touches it |
| A7 | A snapshot of a 50MB skill directory completes within 30 seconds on typical hardware | Validation Architecture | LOW — fs.copy is constant-time per byte; modest data sizes; if a future skill grows to GB scale, snapshot becomes a perceptible delay (acceptable: documented backup is the safety contract) |
| A8 | `path.relative(wsRoot, resolved).startsWith('..' + path.sep)` correctly handles all macOS/Linux/Windows containment checks | Pattern 2 | LOW — verified on macOS via probe; cross-platform behavior of path.relative is well-documented in Node docs and consistent across platforms |
| A9 | The hash-mismatch detection at planning time uses the SAME SHA-256 algorithm as the manifest writer (`manifest-generator.calculateFileHash`) | Code Examples | LOW — both call `crypto.createHash('sha256')` per common pattern; reuse the existing helper to guarantee algorithmic match |

## Open Questions

1. **Should Phase 7 unify the parallel backup flows (`_gomad-{custom,modified}-backup-temp/` from v1.1's `_backupUserFiles` + `_gomad/_backups/<ts>/` from Phase 7) into a single `_gomad/_backups/<ts>/`?**
   - What we know: D-41 Claude's Discretion explicitly raises this as a planner decision. Two reasonable postures: (a) keep parallel — v1.1 flow untouched, Phase 7 adds new flow; (b) unify — Phase 7 routes v1.1 detect-custom-files outputs into the new structure too.
   - What's unclear: blast radius of unifying. v1.1 `_backupUserFiles` is called from `_prepareUpdateState` — same function Phase 7 hooks into. Touching v1.1's flow risks regressing existing behavior.
   - Recommendation: KEEP PARALLEL for v1.2. Phase 7 adds the new flow alongside; document `_gomad-{custom,modified}-backup-temp/` as v1.1-vintage and slated for unification in a future release. Reduces Phase 7 blast radius; defers the refactor.

2. **`--dry-run` validation depth: shallow plan-only vs full manifest validation?**
   - What we know: D-40 Claude's Discretion. Shallow = print plan, exit. Full = run the entire `readFilesManifest` corruption-classification pass and print rejection lines BEFORE printing the plan.
   - What's unclear: which is more valuable to users debugging a corrupt manifest? Probably full — `--dry-run` becomes the diagnostic tool.
   - Recommendation: FULL VALIDATION in dry-run. The pure plan builder runs identically; only the executor is short-circuited. Surfaces `MANIFEST_CORRUPT`, `CORRUPT_ROW`, `SYMLINK_ESCAPE`, and containment-failure log lines exactly as a real install would. Cost is one extra pass through manifest at dry-run time — negligible.

3. **Plan decomposition: single Phase 7 plan or split?**
   - What we know: D-41 Claude's Discretion. Five capabilities (cleanup, containment, legacy, dry-run, backup) are tightly coupled but have independent review surfaces.
   - What's unclear: reviewability vs dependency cost.
   - Recommendation: TWO plans. Plan 07-01 = "cleanup-planner module + manifest reader hardening" (pure logic, fully unit-testable, consumed by tests). Plan 07-02 = "executor + dry-run flag + integration with `_prepareUpdateState` + E2E tests + legacy v1.1 path". Lets the planner ship plan 1 atomically before plan 2 starts; dependency edge is clean.

4. **Recovery documentation placement?**
   - What we know: D-38 mandates `metadata.json.recovery_hint`. CONTEXT.md Claude's Discretion lists `_gomad/_backups/<ts>/README.md`, `docs/upgrade-recovery.md`, or a `gomad restore` CLI as options.
   - What's unclear: which surfaces are users likely to look at?
   - Recommendation: BOTH `_gomad/_backups/<ts>/README.md` (auto-generated, co-located with backup, gives recovery cmd) AND `docs/upgrade-recovery.md` (project-wide doc, linked from CHANGELOG BREAKING note in Phase 9). `gomad restore` CLI deferred per CONTEXT.md.

5. **Should hashing of files-to-snapshot happen at plan time or execute time?**
   - What we know: Plan-time hashing is needed to populate `was_modified` in the plan object (consumed by dry-run renderer per D-40). Execute-time hashing is wasted work if plan time already did it.
   - Recommendation: HASH AT PLAN TIME. Capture `orig_hash` and `was_modified` in the plan; executor uses them when writing metadata.json. One pass; renderer can show `(user-modified, hash-diff)` annotations from D-40 spec.

6. **Should `_gomad/_backups/**` exclusion in writeFilesManifest happen at discovery time or write time?**
   - What we know: D-39 says "explicitly excluded ... both written and read paths." CONTEXT.md Claude's Discretion: "prefix filter in writeFilesManifest vs constant allow-list in installer's file discovery pass."
   - Recommendation: PREFIX FILTER IN writeFilesManifest. Discovery pass already passes through `this.allInstalledFiles` — adding the filter as the first check inside that loop is one line, easy to test, and means callers don't need to know about the exclusion. See Code Examples Operation 6.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | All | ✓ | v25.2.1 (verified) | Minimum ≥20 for fs.realpath promise API; project's package.json should already gate this |
| npm | Test harness (npm pack + install) | ✓ | latest | — |
| `csv-parse` | Manifest read | ✓ | ^6.1.0 (current 6.2.1) | — |
| `fs-extra` | All filesystem ops | ✓ | ^11.3.0 (installed 11.3.3) | — |
| `commander` | CLI flag definition | ✓ | ^14.0.0 | — |
| `js-yaml` | (not used in Phase 7) | ✓ | (already dep) | — |
| `glob` | Test harness | ✓ | ^11.0.3 | — |

**Missing dependencies with no fallback:** None.

**Missing dependencies with fallback:** None.

All Phase 7 dependencies are already in `package.json` and installed. No new package installs required. This satisfies the project-wide "zero new runtime deps" constraint (PROJECT.md Accumulated Context).

## Validation Architecture

> Required because `workflow.nyquist_validation` is `true` in `.planning/config.json`.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Plain Node.js test scripts (no Jest/Mocha) — matches existing pattern in `test/test-gm-command-surface.js`, `test/test-installation-components.js` |
| Config file | None — each test is a self-contained executable script with `console.log + exit code 0/1` semantics |
| Quick run command | `node test/test-cleanup-planner.js` (pure unit, ~5 sec) |
| Full suite command | `npm run test` (existing — runs `test:refs`, `test:install`, `lint`, `lint:md`, `format:check`); Phase 7 adds `test:cleanup` to the chain |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| INSTALL-05 | Stale-entry cleanup (manifest diff drives fs.remove) | unit | `node test/test-cleanup-planner.js --filter buildCleanupPlan-stale` | ❌ Wave 0 |
| INSTALL-05 | Idempotent re-install (second install → no change) | E2E | `node test/test-cleanup-execute.js --filter idempotency` | ❌ Wave 0 |
| INSTALL-06 | Realpath containment refuses absolute paths | unit | `node test/test-cleanup-planner.js --filter containment-absolute` | ❌ Wave 0 |
| INSTALL-06 | Realpath containment refuses ../ traversal | unit | `node test/test-cleanup-planner.js --filter containment-traverse` | ❌ Wave 0 |
| INSTALL-06 | Realpath containment refuses symlink escape | unit (with fixture symlink) | `node test/test-cleanup-planner.js --filter containment-symlink` | ❌ Wave 0 |
| INSTALL-07 | v1.1 legacy detection via no-prior-manifest signal | unit | `node test/test-cleanup-planner.js --filter isV11Legacy` | ❌ Wave 0 |
| INSTALL-07 | v1.1 legacy cleanup snapshots all 7 dirs (incl user customs) | E2E | `node test/test-legacy-v11-upgrade.js` | ❌ Wave 0 |
| INSTALL-08 | --dry-run prints plan, exits without disk changes | E2E | `node test/test-dry-run.js --filter no-disk-write` | ❌ Wave 0 |
| INSTALL-08 | --dry-run plan ≡ actual install plan (identity) | E2E | `node test/test-dry-run.js --filter identity` | ❌ Wave 0 |
| INSTALL-09 | Snapshot to _gomad/_backups/<ts>/ before remove | E2E | `node test/test-cleanup-execute.js --filter snapshot-before-remove` | ❌ Wave 0 |
| INSTALL-09 | metadata.json contains all D-38 fields | unit | `node test/test-cleanup-execute.js --filter metadata-shape` | ❌ Wave 0 |
| INSTALL-09 | Recovery via cp -R restores files | E2E | `node test/test-cleanup-execute.js --filter recovery` | ❌ Wave 0 |
| (D-33) | MANIFEST_CORRUPT on csv-parse error → skip cleanup | unit | `node test/test-manifest-corruption.js --filter quote-not-closed` | ❌ Wave 0 |
| (D-33) | CORRUPT_ROW on missing required col → skip row, keep rest | unit | `node test/test-manifest-corruption.js --filter row-missing-col` | ❌ Wave 0 |
| (D-33) | BOM at start → silently normalized, parsed correctly | unit | `node test/test-manifest-corruption.js --filter bom-strip` | ❌ Wave 0 |
| (D-33) | CRLF line endings → silently normalized | unit | `node test/test-manifest-corruption.js --filter crlf-normalize` | ❌ Wave 0 |
| (D-33) | Containment failure on a row → whole-batch corrupt | unit | `node test/test-manifest-corruption.js --filter containment-poisons-batch` | ❌ Wave 0 |
| (D-33) | Duplicate path entries → handled deterministically | unit | `node test/test-manifest-corruption.js --filter duplicate-paths` | ❌ Wave 0 |
| (D-34) | Hash-mismatch file → snapshot with was_modified=true | unit | `node test/test-cleanup-planner.js --filter hash-mismatch-marker` | ❌ Wave 0 |
| (D-35) | Symlink-escape entry → log + skip, continue with rest | unit | `node test/test-cleanup-planner.js --filter symlink-escape-non-fatal` | ❌ Wave 0 |
| (D-36) | Backup tree mirrors install_root + relative path | unit | `node test/test-cleanup-execute.js --filter backup-tree-shape` | ❌ Wave 0 |
| (D-37) | Timestamp format matches YYYYMMDD-HHMMSS regex | unit | `node test/test-cleanup-planner.js --filter timestamp-format` | ❌ Wave 0 |
| (D-39) | _gomad/_backups/** excluded from new files-manifest.csv | E2E | `node test/test-cleanup-execute.js --filter manifest-excludes-backups` | ❌ Wave 0 |
| (D-42) | Legacy cleanup hits ONLY the 7 known dirs (no gm-* sweep) | unit | `node test/test-cleanup-planner.js --filter legacy-scope-limited` | ❌ Wave 0 |
| (D-43) | v1.1 dir with user custom.md → whole dir snapshotted+removed | E2E | `node test/test-legacy-v11-upgrade.js --filter custom-files-preserved` | ❌ Wave 0 |
| (Pitfall 21) | Two installs in same second → both backups distinct | E2E | `node test/test-cleanup-execute.js --filter timestamp-collision` | ❌ Wave 0 |
| (Pitfall 22) | Manifest entry → file deleted by user → ENOENT swallowed | unit | `node test/test-cleanup-planner.js --filter realpath-enoent-idempotent` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `node test/test-cleanup-planner.js` (pure unit, ~5 sec — fast feedback during cleanup-planner module development)
- **Per wave merge:** `npm run test:cleanup-all` (new — chains all Phase 7 test scripts; ~3 minutes including npm pack + install for E2E)
- **Phase gate:** `npm run quality` (existing — adds Phase 7 tests via the test:install chain) green before `/gsd-verify-work`

### Wave 0 Gaps

All Phase 7 test files are NEW. Wave 0 must establish:

- [ ] `test/test-cleanup-planner.js` — pure unit tests for buildCleanupPlan(), isContained(), isV11Legacy(), formatTimestamp(), uniqueBackupDir()
- [ ] `test/test-cleanup-execute.js` — integration tests for snapshotFiles(), executeCleanupPlan(), writeMetadata(), the snapshot-before-remove ordering invariant
- [ ] `test/test-manifest-corruption.js` — fixture-driven D-33 classification tests (one per corruption type)
- [ ] `test/test-legacy-v11-upgrade.js` — E2E for v1.1 → v1.2 upgrade, including user custom.md preservation
- [ ] `test/test-dry-run.js` — E2E for --dry-run plan-only behavior + identity test (capture plan, execute, diff)
- [ ] `test/fixtures/manifests/` — 10 manifest fixtures listed in Project Structure
- [ ] `test/fixtures/workspaces/v11-with-customs/` — populated v1.1 workspace fixture
- [ ] `test/fixtures/workspaces/v11-clean/` — clean v1.1 workspace fixture
- [ ] `package.json` script: `"test:cleanup-all": "node test/test-cleanup-planner.js && node test/test-cleanup-execute.js && node test/test-manifest-corruption.js && node test/test-legacy-v11-upgrade.js && node test/test-dry-run.js"`
- [ ] Add `npm run test:cleanup-all` to the existing `npm run test` chain

Framework install: not needed — Node.js + npm are already available; tests use built-in `node:assert`-style patterns matching existing tests.

## Security Domain

> Required because `security_enforcement` is enabled (absent in config = enabled).

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | N/A — installer is local-only, no network auth |
| V3 Session Management | no | N/A |
| V4 Access Control | yes (filesystem) | Realpath containment (D-32) — equivalent to "deny by default; explicit allow-list of install roots" |
| V5 Input Validation | yes | csv-parse (D-27) + per-row required-column check (D-33) + realpath containment (D-32) at the trust boundary (manifest is treated as untrusted input even though it's "self-written") |
| V6 Cryptography | partial | SHA-256 for content integrity check (D-34); not used for auth — collision-resistance is sufficient. Use Node's built-in `crypto.createHash('sha256')` (already in use). |
| V11 Business Logic | yes | Snapshot-before-remove ordering (D-34, D-43) — destructive ops gated on prior backup |
| V12 Files and Resources | yes (CRITICAL for this phase) | (a) Containment check before any fs.remove (V12.3.6 path traversal); (b) Symlink resolution before write (V12.4.1 symlink attacks); (c) No file mode bits leaked in snapshot (Pitfall 9 — Phase 6 already addressed for installs; Phase 7's snapshot must preserve mode bits faithfully via fs.copy default behavior) |
| V14 Configuration | yes | platform-codes.yaml is the source of truth for allowed install roots (D-32); changes to this file effectively change the security policy — should be reviewed under CODEOWNERS or equivalent |

### Known Threat Patterns for {Node.js installer, fs operations on user workspace}

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Path traversal in manifest entry (`../../../etc/passwd`) | Tampering | Realpath containment via path.relative starts-with-`..` check (D-32, Pattern 2). Verified via probe Test 5. |
| Absolute path in manifest entry (`/etc/passwd`) | Tampering | path.resolve produces the absolute path; realpath confirms; containment check refuses. Verified via probe Test 4. |
| Symlink escape (manifest entry → file in workspace → symlink to outside) | Tampering | fs.realpath follows the symlink chain to canonical path; containment check refuses if outside. Verified via probe Test 3. |
| Manifest poisoning (attacker swaps files-manifest.csv with malicious content) | Tampering | csv-parse refuses malformed input → MANIFEST_CORRUPT → skip cleanup (recoverable degradation per D-33). Containment check refuses any path-escape attempt. |
| TOCTOU between containment check and fs.remove | Tampering (race) | Acceptable for v1.2 — installer runs in user's own context with their own permissions; race window requires another process actively writing the workspace, which is the user's prerogative. Document in Pitfall 22 if needed. |
| Backup directory becomes target of next install's cleanup (recursive backup-of-backup) | DoS (disk fill) | D-39 — _gomad/_backups/** excluded from manifest (so cleanup pass never sees them as stale entries). Verified by Code Examples Operation 6. |
| Snapshot leaks user data to a different filesystem (e.g., /tmp shared with other users) | Information disclosure | N/A — snapshot is always written to `${workspaceRoot}/_gomad/_backups/`, same fs as workspace. No tmp involvement. |
| metadata.json leaks sensitive paths in cleartext | Information disclosure | metadata.json contains relative paths only (D-38), not credentials or content. Acceptable. |
| `--dry-run` execution prints sensitive paths to stdout | Information disclosure | Acceptable — dry-run output is for the user running the install, who already has filesystem access. |
| Symlink follow during fs.copy (snapshot writes through link) | Tampering | fs.copy follows symlinks by default; mitigated because plan-time realpath already resolves to the actual file, so snapshot src is never a symlink at the call site. Defense-in-depth: pass `dereference: false` to fs.copy (consider — verify behavior matches snapshot semantics). |
| Mode bit propagation from source to backup (e.g., 0700 file becomes 0755 backup) | Tampering | Acceptable — backup preserves source mode bits via fs.copy default (Pitfall 9 inverted; for backups, faithful preservation IS the requirement). Recovery's cp -R also preserves modes. |

## Sources

### Primary (HIGH confidence)
- **Direct probe (executed 2026-04-20 via Bash tool)** — verified csv-parse error codes (CSV_QUOTE_NOT_CLOSED, CSV_RECORD_INCONSISTENT_COLUMNS), `bom: true` option behavior, ENOENT semantics from fs.realpath, symlink escape resolution, path.relative containment check correctness on macOS APFS
- **Direct code read** — installer.js lines 450-829, manifest-generator.js lines 600-800, _config-driven.js lines 1-200 + 450-570, agent-command-generator.js lines 1-200, platform-codes.yaml, gomad-cli.js, install.js, package.json
- **CONTEXT.md** (`.planning/phases/07-upgrade-safety-manifest-driven-cleanup/07-CONTEXT.md`) — D-32 through D-43, Claude's Discretion notes, Specifics
- **Phase 6 CONTEXT.md** (`.planning/phases/06-installer-mechanics-copy-manifest-stub-generation/06-CONTEXT.md`) — D-21, D-23, D-25, D-27, D-29 (prior-phase commitments Phase 7 fulfills)
- **PITFALLS.md** — Pitfalls 2, 3, 15, 19 (the defining pitfalls for this phase, extended above)
- **REQUIREMENTS.md** — INSTALL-05/06/07/08/09 verbatim
- **ROADMAP.md** §"Phase 7" — 6 success criteria

### Secondary (MEDIUM confidence)
- `npm view csv-parse version` (executed 2026-04-20) → 6.2.1 (verified current)
- Node.js path module behavior — well-documented; behavior verified consistent with docs via probe
- fs-extra v11 API surface — package.json already pins ^11.3.0; no changelog issues for the methods used (copy, remove, realpath, ensureDir, lstat, pathExists)
- Commander v14 boolean flag pattern — documented in commander README and matches existing `--yes`, `--self`, `--directory` patterns at install.js:32-50

### Tertiary (LOW confidence)
- Windows NTFS junction behavior under Node ≥20's fs.realpath — relied on Phase 6 CONTEXT.md note; Phase 9 release verification (REL-04) covers Windows CI matrix as the empirical check

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — every dependency is already installed and verified at current major; csv-parse / fs-extra / commander semantics directly probed
- Architecture: HIGH — plan/execute pattern is an industry standard (Terraform, pnpm, Ansible); module boundaries follow existing project structure
- Pitfalls: HIGH — Phase-7-specific extensions of PITFALLS.md entries with verified mitigations; new pitfalls (21-23) raised with concrete reproduction paths
- Validation Architecture: HIGH — every requirement has a corresponding test type and command; Wave 0 gaps enumerated explicitly
- Security Domain: HIGH — V12 Files and Resources is the dominant axis; mitigations (containment, snapshot-before-remove) are first-class design properties not bolt-ons
- Windows-specific (NTFS junctions, CRLF, path separators): MEDIUM — verified on macOS only; Phase 9 release verification covers cross-platform

**Research date:** 2026-04-20
**Valid until:** 2026-05-20 (30 days — stack is stable; no fast-moving dependencies in scope)
