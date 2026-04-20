# Phase 7: Upgrade Safety — Manifest-Driven Cleanup - Pattern Map

**Mapped:** 2026-04-20
**Files analyzed:** 11 (6 new, 5 modified)
**Analogs found:** 11 / 11

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `tools/installer/core/cleanup-planner.js` **(NEW)** | service (pure plan builder + executor) | transform + file-I/O | `tools/installer/ide/shared/agent-command-generator.js` | role-match (existing helper that wraps fs-extra destructive ops with primitive-composition + exports testable pure fragments) |
| `tools/installer/core/installer.js` **(MODIFY)** — `readFilesManifest` L673 | utility (CSV reader → records) | request-response / file-I/O | `tools/installer/core/installer.js:readFilesManifest` (self — extend existing) + `tools/installer/ide/_config-driven.js:installVerbatimSkills` L162 (sibling csv-parse consumer) | exact — extending in place |
| `tools/installer/core/installer.js` **(MODIFY)** — `_prepareUpdateState` L504 | controller (orchestrates upgrade flow) | event-driven / pipeline | `tools/installer/core/installer.js:_prepareUpdateState` (self — insert cleanup step) | exact — extending in place |
| `tools/installer/core/installer.js` **(MODIFY)** — `_backupUserFiles` L545 | service (filesystem snapshot) | file-I/O / batch | `_backupUserFiles` itself (parallel new flow per D-41 — KEEP PARALLEL per RESEARCH.md open question #1) | exact |
| `tools/installer/core/manifest-generator.js` **(MODIFY)** — `writeFilesManifest` L650 | utility (CSV writer) | transform / file-I/O | `writeFilesManifest` (self — add prefix-exclusion filter at top of `allInstalledFiles` loop) | exact — extending in place |
| `tools/installer/gomad-cli.js` + `tools/installer/commands/install.js` **(MODIFY)** — add `--dry-run` | config (Commander flag wiring) | request-response | `commands/install.js:options[]` flags (`--self`, `--yes`, `--directory`) | exact pattern match |
| `tools/installer/ide/platform-codes.yaml` **(READ-ONLY consumer)** — `_collectIdeRoots` reader | config (data source) | request-response | `tools/installer/core/installer.js:_collectIdeRoots` L648 | exact — **reuse as-is** |
| `test/test-manifest-cleanup.js` **(NEW)** | test (install-smoke + corruption fixtures) | event-driven | `test/test-gm-command-surface.js` + `test/test-installer-self-install-guard.js` | exact (harness pattern match) |
| `test/fixtures/phase-07/*.csv` **(NEW)** | test fixtures | static data | `test/fixtures/…` (new — no precedent; pattern established by `test-installer-self-install-guard.js` mkdtempSync fixture builders) | role-match |
| `test/fixtures/phase-07/legacy-v1.1-workspace/` **(NEW)** | test fixture (workspace tree) | static data | `test-installer-self-install-guard.js` L63-66 (builds synthetic `src/gomad-skills/` tree at test runtime via `fs.ensureDirSync`) | role-match |
| `docs/upgrade-recovery.md` **(NEW)** | documentation | N/A | No existing analog in `/docs` of equivalent scope — see "No Analog Found" section | — |
| `_gomad/_backups/<ts>/README.md` **(NEW, auto-generated)** | documentation (runtime artifact) | transform | `writeMetadata` in `cleanup-planner.js` (written adjacent to metadata.json) | derived pattern |

## Pattern Assignments

### `tools/installer/core/cleanup-planner.js` (NEW — service, transform + file-I/O)

**Analog:** `tools/installer/ide/shared/agent-command-generator.js` (closest existing service-style helper that orchestrates fs-extra primitives and exports testable class/function exports)

**Module scaffolding pattern** (agent-command-generator.js:1-14):
```javascript
const path = require('node:path');
const fs = require('fs-extra');
// NOTE: cleanup-planner.js will ALSO need:
const csv = require('csv-parse/sync');        // D-33 reader (if helper)
const crypto = require('node:crypto');         // SHA-256 for was_modified (D-34)
const prompts = require('../prompts');         // logging facade
```

**Static-data constant pattern** (agent-command-generator.js:14+):
```javascript
class AgentCommandGenerator {
  static AGENT_SOURCES = [
    { shortName: 'analyst', dir: '1-analysis/gm-agent-analyst', purpose: '...' },
    { shortName: 'tech-writer', dir: '1-analysis/gm-agent-tech-writer', purpose: '...' },
    // 7 total entries
  ];
}
```
→ **cleanup-planner.js MUST re-use these 7 `shortName`s** (D-42 source of truth — 7 legacy paths). Do NOT duplicate the list; import `AgentCommandGenerator.AGENT_SOURCES` and map `.shortName` to build `.claude/skills/gm-agent-${shortName}/` paths.

**Primitive-composition pattern** (agent-command-generator.js:183-194 — `removeLegacyAgentSkillDirs`):
```javascript
async removeLegacyAgentSkillDirs(workspaceRoot) {
  const legacyBase = path.join(workspaceRoot, '.claude', 'skills');
  const removed = [];
  for (const { shortName } of AgentCommandGenerator.AGENT_SOURCES) {
    const legacyDir = path.join(legacyBase, `gm-agent-${shortName}`);
    if (await fs.pathExists(legacyDir)) {
      await fs.remove(legacyDir);
      removed.push(legacyDir);
    }
  }
  return removed;
}
```
→ Phase 7 wraps this with snapshot-first semantics per D-43. The fs-extra primitives (`pathExists`, `remove`, `ensureDir`, `copy`) stay identical; the executor composes `copy` THEN `remove` sequentially with no try/catch between them (RESEARCH.md Pattern 4 invariant — snapshot failure aborts before delete).

**Realpath containment pattern** (`_config-driven.js:508` — existing usage):
```javascript
const resolvedProject = await fs.realpath(path.resolve(projectDir));
```
→ Copy this idiom exactly for the containment helper. Per RESEARCH.md Pattern 2:
```javascript
function isContained(resolved, wsRoot) {
  const rel = path.relative(wsRoot, resolved);
  return !rel.startsWith('..' + path.sep) && rel !== '..' && !path.isAbsolute(rel);
}
```
Containment check uses the resolved (realpath'd) path, NEVER the joined path string.

**ENOENT tolerance for realpath on deleted files** (RESEARCH.md Pitfall 22):
```javascript
try {
  resolved = await fs.realpath(joined);
} catch (e) {
  if (e.code === 'ENOENT') continue;  // user manually deleted — normal idempotency
  throw e;                             // unexpected; propagate
}
```

---

### `tools/installer/core/installer.js:readFilesManifest` (MODIFY — utility, request-response / file-I/O)

**Analog:** Existing function at line 673 (extending in place) + `_config-driven.js:installVerbatimSkills` L162-173 (sibling csv-parse consumer, shows current project's csv-parse invocation pattern).

**Current read idiom** (installer.js:679-703 — baseline):
```javascript
try {
  const content = await fs.readFile(filesManifestPath, 'utf8');
  const records = csv.parse(content, {
    columns: true,
    skip_empty_lines: true,
  });
  const workspaceRoot = path.dirname(gomadDir);
  return records.map((r) => {
    const installRoot = r.install_root || '_gomad';
    const rootPath = installRoot === '_gomad' ? gomadDir : path.join(workspaceRoot, installRoot);
    return {
      type: r.type, name: r.name, module: r.module, path: r.path,
      hash: r.hash || null,
      schema_version: r.schema_version || null,
      install_root: installRoot,
      absolutePath: path.join(rootPath, r.path || ''),
    };
  });
} catch (error) {
  await prompts.log.warn('Could not read files-manifest.csv: ' + error.message);
  return [];
}
```

**Phase 7 required extensions (D-33):**

1. Add `bom: true` to csv.parse options (RESEARCH.md Pattern 3 — verified via probe; without it `\uFEFFtype` becomes first column header).
2. Distinguish `MANIFEST_CORRUPT` (whole-manifest) vs `CORRUPT_ROW` (per-row):
   - csv.parse throw → `prompts.log.error('MANIFEST_CORRUPT: ' + e.code + ': ' + e.message)` → return `[]`
   - Per-row missing required column (`type`, `name`, `path`, `install_root`) → `prompts.log.warn('CORRUPT_ROW: row ' + idx + ': missing column(s) ' + missing.join(','))` → skip that row, keep the rest
3. CRLF is handled silently by csv-parse default (verified); no extra normalization needed.

**Reference template from RESEARCH.md Pattern 3** (lines 397-442) — use verbatim as implementation blueprint.

---

### `tools/installer/core/installer.js:_prepareUpdateState` (MODIFY — controller, event-driven pipeline)

**Analog:** Existing function at line 504 (extending in place).

**Current flow** (installer.js:504-535):
```javascript
async _prepareUpdateState(paths, config, existingInstall, officialModules) {
  const existingFilesManifest = await this.readFilesManifest(paths.gomadDir);
  const { customFiles, modifiedFiles } = await this.detectCustomFiles(paths.gomadDir, existingFilesManifest);

  // ... preserve core config ...

  await this._scanCachedCustomModules(paths);
  const backupDirs = await this._backupUserFiles(paths, customFiles, modifiedFiles);

  return { customFiles, modifiedFiles, tempBackupDir: ..., tempModifiedBackupDir: ... };
}
```

**Phase 7 insertion point (per RESEARCH.md System Architecture Diagram):**

Insert between `readFilesManifest` and `detectCustomFiles` (v1.1 parallel flow is preserved per D-41 recommendation — KEEP PARALLEL for v1.2):
```javascript
// Phase 7: compute cleanup plan (pure — no disk writes)
const allowedRoots = new Set(['_gomad', '.claude', ...(await this._collectIdeRoots())]);
const isV11 = await cleanupPlanner.isV11Legacy(paths.projectRoot, paths.gomadDir);
const plan = await cleanupPlanner.buildCleanupPlan({
  priorManifest: existingFilesManifest,
  newInstallSet: /* computed */,
  workspaceRoot: paths.projectRoot,
  allowedRoots,
  isV11Legacy: isV11,
});

// Phase 7: --dry-run short-circuit (BEFORE disk writes)
if (config.dryRun) {
  await prompts.log.info(cleanupPlanner.renderPlan(plan));
  process.exit(0);
}

// Phase 7: snapshot-then-remove (D-34, D-36, D-38)
await cleanupPlanner.executeCleanupPlan(plan, paths.projectRoot, GOMAD_VERSION);
```

**Exact exit point** (per CONTEXT.md integration point): AFTER the cleanup-plan is computed and the new install-set is known, BUT BEFORE any `fs.copy` / `fs.remove` is called. This is the natural seam between `_prepareUpdateState` returning and `_installAndConfigure` starting.

---

### `tools/installer/core/installer.js:_backupUserFiles` (COORDINATE — service, file-I/O)

**Analog:** Existing function at line 545 (KEEP PARALLEL per D-41 Claude's Discretion + RESEARCH.md Open Question #1 recommendation).

**Existing pattern to PRESERVE** (installer.js:549-572):
```javascript
if (customFiles.length > 0) {
  tempBackupDir = path.join(paths.projectRoot, '_gomad-custom-backup-temp');
  await fs.ensureDir(tempBackupDir);
  for (const customFile of customFiles) {
    const relativePath = path.relative(paths.gomadDir, customFile);
    const backupPath = path.join(tempBackupDir, relativePath);
    await fs.ensureDir(path.dirname(backupPath));
    await fs.copy(customFile, backupPath);
  }
}
```

**Phase 7 contract:** Do NOT modify this function. Phase 7's `_gomad/_backups/<ts>/` flow runs alongside, not through, `_backupUserFiles`. Rationale: unifying the two flows has larger blast radius than v1.2's risk tolerance (RESEARCH.md Open Question #1). The copy-with-ensureDir idiom IS reused by `cleanup-planner.snapshotFiles()` (pattern-match, not call).

**Copy-with-ensureDir idiom to REPLICATE in cleanup-planner.snapshotFiles:**
```javascript
await fs.ensureDir(path.dirname(backupPath));
await fs.copy(src, backupPath, { preserveTimestamps: true });
```

---

### `tools/installer/core/manifest-generator.js:writeFilesManifest` (MODIFY — utility, transform)

**Analog:** Existing function at line 650 (extending in place).

**Insertion point for D-39 exclusion filter** (manifest-generator.js:673-674 — inside the `for (const filePath of this.allInstalledFiles)` loop):
```javascript
for (const filePath of this.allInstalledFiles) {
  // D-39: never include _gomad/_backups/** in the manifest
  // (prevents recursive backup-of-backup AND prevents next cleanup pass
  //  from marking old backups as "stale" and deleting them)
  const BACKUP_PREFIX_POSIX = '/_gomad/_backups/';
  const BACKUP_PREFIX_NATIVE = path.join('_gomad', '_backups') + path.sep;
  if (filePath.includes(BACKUP_PREFIX_POSIX) || filePath.includes(BACKUP_PREFIX_NATIVE)) {
    continue;
  }

  // Determine install_root by checking which standard root the path falls under.
  const absFilePath = path.resolve(filePath);
  // ... existing logic ...
}
```

**Rationale:** Filter at the loop top means excluded paths never produce a manifest row. Symmetric check for both POSIX (`/`) and native (`\` on Windows) separators per Phase 6 D-26 and RESEARCH.md Pitfall 19.

---

### `tools/installer/commands/install.js` — `--dry-run` flag wiring (MODIFY — config, request-response)

**Analog:** Existing `options[]` array at commands/install.js:33-52 (exact pattern match).

**Current Commander option pattern** (commands/install.js:47-51):
```javascript
options: [
  ['-d, --debug', 'Enable debug output for manifest generation'],
  ['--directory <path>', 'Installation directory (default: current directory)'],
  // ...
  ['-y, --yes', 'Accept all defaults and skip prompts where possible'],
  [
    '--self',
    'Permit install into the gomad source repo itself (bypasses the self-install guard). Use only when intentionally re-seeding local dev output.',
  ],
],
```

**Phase 7 addition** (append to `options[]`):
```javascript
[
  '--dry-run',
  'Print the planned cleanup + copy actions (TO SNAPSHOT / TO REMOVE / TO WRITE) without touching disk (Phase 7 D-40).',
],
```

**Propagation pattern** (commands/install.js:53-89 — `action: async (options) => { ... }`):

The flag's value lands on the `options` object passed to `action`. `dryRun` (Commander auto-camelCases `--dry-run` to `dryRun`) is `true` if flag present, `undefined` otherwise. Plumb through:
```javascript
// commands/install.js — extend the prompts bypass + install call
const config = await ui.promptInstall(options);         // pass options through
config.dryRun = !!options.dryRun;                        // explicit boolean
// ...
const result = await installer.install(config);
```

**No change required to `gomad-cli.js`** — Commander auto-discovers options from `cmd.options[]` at lines 97-99:
```javascript
for (const option of cmd.options || []) {
  command.option(...option);
}
```

---

### `tools/installer/ide/platform-codes.yaml` (READ-ONLY CONSUMER — config, data source)

**Analog:** `tools/installer/core/installer.js:_collectIdeRoots` at line 648 (**reuse as-is, do NOT reimplement**).

**Existing function — use verbatim as the allowed-roots source:**
```javascript
async _collectIdeRoots() {
  const { loadPlatformCodes } = require('../ide/platform-codes');
  const platformConfig = await loadPlatformCodes();
  const roots = new Set();
  for (const platformInfo of Object.values(platformConfig.platforms || {})) {
    const installer = platformInfo?.installer;
    if (!installer) continue;
    for (const key of ['target_dir', 'launcher_target_dir']) {
      const value = installer[key];
      if (typeof value !== 'string' || !value) continue;
      const leading = value.split('/')[0].split(path.sep)[0];
      if (leading && leading !== '~' && !leading.startsWith('..')) {
        roots.add(leading);
      }
    }
  }
  return [...roots].sort();
}
```

**Phase 7 usage** (per RESEARCH.md Common Operation 2 — apply as pattern):
```javascript
// In cleanup-planner.buildCleanupPlan or in _prepareUpdateState before calling it:
const allowedRoots = new Set(['_gomad', '.claude', ...(await this._collectIdeRoots())]);
// '.claude' is always included for backward compat (matches manifest-generator.js:670 idiom).
// '_gomad' is always included because that's the internal-root sentinel value.
```

**No schema change to platform-codes.yaml.** D-32 specifies "derived dynamically from platform-codes.yaml" — the YAML is unchanged; only the reader's **consumer** (cleanup-planner containment check) is new.

---

### `test/test-manifest-cleanup.js` (NEW — test, event-driven)

**Analog:** `test/test-gm-command-surface.js` (install-smoke harness) + `test/test-installer-self-install-guard.js` (fixture builder pattern).

**Harness scaffolding from `test-gm-command-surface.js` (lines 26-42, 172-212):**
```javascript
const path = require('node:path');
const os = require('node:os');
const { execSync } = require('node:child_process');
const fs = require('fs-extra');
const yaml = require('js-yaml');
const { globSync } = require('glob');

const colors = {
  reset: '\u001B[0m', green: '\u001B[32m', red: '\u001B[31m',
  yellow: '\u001B[33m', cyan: '\u001B[36m', dim: '\u001B[2m',
};
let passed = 0;
let failed = 0;
function assert(condition, testName, errorMessage = '') { /* ... */ }

const REPO_ROOT = path.resolve(__dirname, '..');
```

**`npm pack` + tempdir + `gomad install --yes --directory` pattern** (test-gm-command-surface.js:174-211):
```javascript
const packOutput = execSync('npm pack', { cwd: REPO_ROOT, encoding: 'utf8', timeout: 60_000 }).trim();
const tarballName = packOutput.split('\n').pop().trim();
tarballPath = path.join(REPO_ROOT, tarballName);

installTempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gomad-cleanup-install-'));
execSync('npm init -y', { cwd: installTempDir, stdio: 'pipe', timeout: 30_000 });
execSync(`npm install "${tarballPath}"`, { cwd: installTempDir, stdio: 'pipe', timeout: 120_000 });

const gomadBin = path.join(installTempDir, 'node_modules', '.bin', 'gomad');
execSync(`"${gomadBin}" install --yes --directory "${installTempDir}" --tools claude-code`, {
  cwd: installTempDir, stdio: 'pipe', timeout: 180_000,
});
```

**Fixture-builder pattern from `test-installer-self-install-guard.js` (lines 63-69):**
```javascript
fixtureGomadRepo = fs.mkdtempSync(path.join(os.tmpdir(), 'gomad-guard-fixture-repo-'));
fs.ensureDirSync(path.join(fixtureGomadRepo, 'src', 'gomad-skills'));
// Populate fixture with files mimicking target state
fs.ensureDirSync(path.join(fixtureGomadRepo, 'src', 'gomad-skills', '1-analysis', 'gm-agent-analyst'));
```

**Phase 7 required test scenarios (per CONTEXT.md specifics + RESEARCH.md recommendation):**

| Scenario | Build from | Assertion |
|----------|-----------|-----------|
| v1.1 legacy workspace → v1.2 install (THE test) | Synthetic tempdir with 7 `.claude/skills/gm-agent-*/` dirs, some with `custom.md` | `_gomad/_backups/<ts>/.claude/skills/gm-agent-*/custom.md` exists; 7 legacy dirs removed; metadata.json present with `reason: "legacy_v1_cleanup"` |
| MANIFEST_CORRUPT fixture | `test/fixtures/phase-07/corrupt-quote.csv` with unclosed quote | `log.error` emits `MANIFEST_CORRUPT`; no deletions occur; new install proceeds |
| CORRUPT_ROW fixture | `test/fixtures/phase-07/corrupt-row-missing.csv` with row missing `path` | `log.warn` emits `CORRUPT_ROW: row N`; other rows still processed |
| Containment escape fixture | `test/fixtures/phase-07/escape-traverse.csv` with `../../../etc` | Whole manifest rejected as `MANIFEST_CORRUPT`; no deletions |
| Idempotent second install | Run `gomad install` twice | Second invocation produces zero disk change (manifest-diff empty) |
| `--dry-run` identity | Dry-run + real install on same initial state | Both print identical "TO SNAPSHOT / TO REMOVE / TO WRITE" counts; dry-run disk untouched |

**Negative-fixture self-test pattern** (test-gm-command-surface.js:106-164 — establishes the assertion shape) — Phase 7 tests should have analog negative fixtures (e.g., a fixture that SHOULD be detected as corrupt, asserting the detection logic itself fires).

---

### `test/fixtures/phase-07/*.csv` (NEW — test fixtures, static data)

**Analog:** No pre-existing fixtures/ directory. Pattern established by runtime `fs.ensureDirSync` builders in `test-installer-self-install-guard.js`.

**Recommended layout** (per RESEARCH.md Recommended Project Structure):
```
test/fixtures/phase-07/
├── manifests/
│   ├── valid-v2.csv               # golden positive fixture
│   ├── corrupt-bom.csv            # leading U+FEFF (D-33 normalization — MUST still parse)
│   ├── corrupt-crlf.csv           # \r\n line endings (D-33 normalization — MUST still parse)
│   ├── corrupt-quote.csv          # unclosed quote → MANIFEST_CORRUPT
│   ├── corrupt-arity.csv          # wrong column count → MANIFEST_CORRUPT
│   ├── corrupt-header.csv         # malformed header → MANIFEST_CORRUPT
│   ├── corrupt-row-missing.csv    # row missing required column → CORRUPT_ROW
│   ├── corrupt-empty-path.csv     # row with empty `path` value → CORRUPT_ROW (Pitfall 2 guard)
│   ├── escape-absolute.csv        # entry with absolute path → MANIFEST_CORRUPT (containment)
│   ├── escape-traverse.csv        # entry with `../` → MANIFEST_CORRUPT (containment)
│   └── duplicate-paths.csv        # two rows, same path (edge case — should not double-delete)
└── legacy-v1.1-workspace/         # synthetic tree for E2E test
    ├── .claude/skills/gm-agent-analyst/SKILL.md
    ├── .claude/skills/gm-agent-pm/custom.md   # user-added file (D-43 recovery case)
    └── ... (7 agents total)
```

**CSV header for valid fixtures** — MUST match manifest-generator.js:658 exactly:
```
type,name,module,path,hash,schema_version,install_root
```

---

### `docs/upgrade-recovery.md` (NEW — documentation)

**Analog:** See "No Analog Found" — no equivalent `/docs` file exists in the repo of comparable scope. Use RESEARCH.md Open Question #4 recommendation + Common Operation 5 metadata shape as template.

**Content outline** (derived from D-36 + D-38 + recovery_hint):
1. What `_gomad/_backups/<YYYYMMDD-HHMMSS>/` contains and why
2. `metadata.json` schema and how to interpret `reason` field
3. Recovery procedure: `cp -R $(pwd)/_gomad/_backups/<ts>/* ./`
4. Version compat warning (Pitfall 23) — check `metadata.json.gomad_version` matches current install
5. Pruning note (REL-F1 deferred — user-managed for v1.2)

---

### `_gomad/_backups/<ts>/README.md` (NEW, auto-generated — runtime documentation)

**Analog:** Written by `cleanup-planner.writeMetadata` adjacent to `metadata.json` (pattern from RESEARCH.md Common Operation 5).

**Content template** (produced at execution time inside `cleanup-planner.executeCleanupPlan`):
```markdown
# GoMad Upgrade Backup — <YYYYMMDD-HHMMSS>

This directory was created by `gomad install` (v<version>) on <ISO timestamp>.

## What's here

- `metadata.json` — machine-readable backup manifest (see `files[]` for file list)
- `<install_root>/...` — snapshots of files that were removed during upgrade

## How to restore

```bash
cp -R $(pwd)/_gomad/_backups/<ts>/* ./
```

Exclude `metadata.json` and this README if you only want the file content back:

```bash
rsync -a --exclude=metadata.json --exclude=README.md \
  $(pwd)/_gomad/_backups/<ts>/ ./
```

See `docs/upgrade-recovery.md` in the gomad package for full documentation.
```

## Shared Patterns

### Logging Facade (used by every new/modified file)
**Source:** `tools/installer/prompts.js` (via `const prompts = require('../prompts')`)
**Apply to:** `cleanup-planner.js`, extensions to `installer.js`, `manifest-generator.js`

Concrete usage templates (from installer.js:705, 521, 1327):
```javascript
// Error — fatal enough that cleanup is skipped; installer continues without cleanup
await prompts.log.error('MANIFEST_CORRUPT: ' + e.code + ': ' + e.message);

// Warn — non-fatal per-entry rejection; installer continues with other entries
await prompts.log.warn('CORRUPT_ROW: row ' + idx + ': missing column(s) ' + missing.join(','));
await prompts.log.warn('SYMLINK_ESCAPE: ' + resolved + ' → ' + target + ', refusing to touch');

// Info — snapshot summary, dry-run output, progress messages
await prompts.log.info(`Snapshotted ${count} files to _gomad/_backups/${ts}/`);
await prompts.log.info(renderedPlan);  // dry-run table output
```

**Mapping to D-33/D-35 semantics:**
- `log.error` → MANIFEST_CORRUPT (whole-manifest skip-cleanup signal)
- `log.warn` → CORRUPT_ROW / SYMLINK_ESCAPE (per-entry, non-fatal)
- `log.info` → snapshot / dry-run / progress

### CSV Parsing (csv-parse/sync) — D-33 Extension
**Source:** `tools/installer/core/installer.js:681`, `tools/installer/ide/_config-driven.js:170`, `tools/installer/core/manifest-generator.js:5`
**Apply to:** All manifest read paths in Phase 7

```javascript
const csv = require('csv-parse/sync');
// ...
const records = csv.parse(content, {
  columns: true,
  skip_empty_lines: true,
  bom: true,          // NEW in Phase 7 per D-33 — strip leading U+FEFF
  // NOTE: do NOT set relax_column_count — arity mismatch IS corrupt-row per D-33
});
```

### SHA-256 Hashing (`was_modified` detection — D-34)
**Source:** `tools/installer/core/manifest-generator.js:638` (`calculateFileHash`)
**Apply to:** `cleanup-planner.buildCleanupPlan` hash-mismatch detection

```javascript
async calculateFileHash(filePath) {
  try {
    const content = await fs.readFile(filePath);
    return crypto.createHash('sha256').update(content).digest('hex');
  } catch {
    return '';
  }
}
```

**REUSE, don't reimplement:** Import `ManifestGenerator` and call `new ManifestGenerator().calculateFileHash(path)`. Guarantees algorithmic match between read and write paths (RESEARCH.md Assumption A9).

### Path Normalization (forward-slash for manifest storage — Phase 6 D-26)
**Source:** `tools/installer/core/manifest-generator.js:690, 720` (`.replaceAll('\\', '/')`)
**Apply to:** Any path written to `metadata.json.files[].relative_path` or `files-manifest.csv`

```javascript
// Filesystem op — native separator
const backupPath = path.join(backupRoot, install_root, relativePath);
await fs.ensureDir(path.dirname(backupPath));
await fs.copy(src, backupPath);

// Serialized to JSON/CSV — forward-slash normalized
const serializedPath = relativePath.replaceAll('\\', '/');
metadata.files.push({ install_root, relative_path: serializedPath, ... });
```

### Realpath + Containment Check (D-32)
**Source:** `tools/installer/ide/_config-driven.js:508` (existing `fs.realpath` usage)
**Apply to:** Every manifest entry BEFORE any `fs.remove` call in `cleanup-planner`

```javascript
// Resolve the path first
const joined = path.join(workspaceRoot, installRoot, entry.path);
let resolved;
try {
  resolved = await fs.realpath(joined);
} catch (e) {
  if (e.code === 'ENOENT') continue;   // already removed — normal idempotency
  throw e;
}

// Then check containment
if (!isContained(resolved, workspaceRoot)) {
  throw new ManifestCorruptError('Entry escapes workspace: ' + resolved);
}
```

Never check containment on `path.join` output directly — `path.join('/etc/passwd', wsRoot)` does NOT escape but `path.resolve(wsRoot, '/etc/passwd')` returns `/etc/passwd`. The realpath-then-relative approach is the only correct form.

### Test Harness Boilerplate
**Source:** `test/test-gm-command-surface.js:34-60`, `test/test-installer-self-install-guard.js:18-56`
**Apply to:** `test/test-manifest-cleanup.js`

```javascript
const colors = { /* ANSI codes */ };
let passed = 0, failed = 0;
function assert(condition, testName, errorMessage = '') {
  if (condition) { console.log(`${colors.green}\u2713${colors.reset} ${testName}`); passed++; }
  else { console.log(`${colors.red}\u2717${colors.reset} ${testName}`); failed++; }
}
// ... at end:
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
```

### Commander Boolean Flag (`--dry-run`)
**Source:** `tools/installer/commands/install.js:47` (`--yes` existing pattern)
**Apply to:** `commands/install.js` options[]

```javascript
// Existing flag pattern (no argument placeholder = boolean):
['-y, --yes', 'Accept all defaults and skip prompts where possible'],

// Phase 7 addition:
['--dry-run', 'Print planned cleanup + copy actions without touching disk (Phase 7 D-40)'],
```

Commander 14 auto-camelCases the flag name: `--dry-run` → `options.dryRun`. Auto-discovered by `gomad-cli.js:97-99` loop. No changes to `gomad-cli.js` needed.

### Legacy Path Removal (D-42, D-43)
**Source:** `tools/installer/ide/shared/agent-command-generator.js:183-194` (`removeLegacyAgentSkillDirs`) + `tools/installer/ide/_config-driven.js:131-135` (caller)
**Apply to:** `cleanup-planner.isV11Legacy` and snapshot-first branch of executor

```javascript
// SOURCE OF TRUTH: AgentCommandGenerator.AGENT_SOURCES (7 entries)
const LEGACY_AGENT_SHORT_NAMES = AgentCommandGenerator.AGENT_SOURCES.map((a) => a.shortName);

async function isV11Legacy(workspaceRoot, gomadDir) {
  const manifestPath = path.join(gomadDir, '_config', 'files-manifest.csv');
  if (await fs.pathExists(manifestPath)) return false;
  for (const shortName of LEGACY_AGENT_SHORT_NAMES) {
    const legacyDir = path.join(workspaceRoot, '.claude', 'skills', `gm-agent-${shortName}`);
    if (await fs.pathExists(legacyDir)) return true;
  }
  return false;
}
```

## No Analog Found

| File | Role | Data Flow | Reason / Fallback |
|------|------|-----------|-------------------|
| `docs/upgrade-recovery.md` | documentation | N/A | Project has no existing `/docs/*.md` of comparable runtime-recovery scope. Fallback: use D-38 metadata shape (RESEARCH.md Common Operation 5) + recovery_hint as the template. Planner writes from scratch. |
| `_gomad/_backups/<ts>/README.md` | runtime documentation | transform | Auto-generated artifact has no precedent. Fallback: generate in `cleanup-planner.writeMetadata()` alongside `metadata.json` using the content template in the Pattern Assignments section above. |
| `test/fixtures/phase-07/` directory | static test data | N/A | No pre-existing `test/fixtures/` directory. Fallback: use `test-installer-self-install-guard.js` runtime fixture-builder pattern (fs.mkdtempSync + fs.ensureDirSync), OR commit static `.csv` files to `test/fixtures/phase-07/manifests/` for CI reproducibility. RESEARCH.md recommends the latter for corrupt-manifest fixtures (bit-exact BOM/CRLF needs a static file). |

## Metadata

**Analog search scope:**
- `tools/installer/core/**` (installer.js, manifest-generator.js, manifest.js, config.js, install-paths.js, existing-install.js)
- `tools/installer/ide/**` (_config-driven.js, platform-codes.yaml, shared/agent-command-generator.js)
- `tools/installer/commands/**` (install.js — Commander options pattern)
- `tools/installer/gomad-cli.js` (Commander auto-discovery loop)
- `test/test-gm-command-surface.js`, `test/test-installer-self-install-guard.js` (harness patterns)
- `tools/installer/prompts.js` (logging facade — referenced via existing usages)

**Files scanned:** ~15 source files + 2 test files via Read/Grep.

**Pattern extraction date:** 2026-04-20

**Key cross-cutting insight:** Phase 7 is almost entirely composition of existing primitives. Every library function needed (csv-parse with corruption handling, fs.realpath for containment, fs.copy-then-remove for snapshot-then-delete, Commander flag registration, prompts.log facade, SHA-256 hashing, platform-codes.yaml root derivation) has an exact analog already in the codebase. The NEW module (`cleanup-planner.js`) is a pure-logic orchestration layer — `buildCleanupPlan` (pure) + `executeCleanupPlan` (faithful consumer) — composing those existing primitives to implement the dry-run-equals-actual invariant per D-41 and the snapshot-then-remove safety contract per D-34/D-36/D-38.
