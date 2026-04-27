# Phase 12: Agent Dir Relocation + Release - Pattern Map

**Mapped:** 2026-04-26
**Files analyzed:** 19 (10 modified, 5 new, 4 metadata/docs)
**Analogs found:** 19 / 19 (every file has a strong codebase analog)

---

## File Classification

| New/Modified File | Status | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|--------|------|-----------|----------------|---------------|
| `tools/installer/ide/shared/path-utils.js` | MODIFY | utility (constants) | static export | `tools/installer/ide/shared/path-utils.js:23` (`GOMAD_FOLDER_NAME`) | exact (self-extension) |
| `tools/installer/ide/shared/agent-command-generator.js` | MODIFY | service (extractor/writer) | file-I/O | `agent-command-generator.js:69-110` (`extractPersonas`) | exact (self-extension, line 71) |
| `tools/installer/ide/templates/agent-command-template.md` | MODIFY | template | static text | `tools/installer/ide/templates/agent-command-template.md:16` (current literal) | exact (self-edit) |
| `tools/installer/core/cleanup-planner.js` | MODIFY | service (planner) | transform (pure) | `cleanup-planner.js:148-156` (`isV11Legacy`) + `:210-245` (v11 branch) | exact (parallel branch) |
| `tools/installer/core/installer.js` | MODIFY | controller (orchestrator) | request-response | `installer.js:509-585` (`_prepareUpdateState`) + `:967-973` (`detectCustomFiles` whitelist) | exact (self-extension) |
| `package.json` | MODIFY | config | static manifest | `package.json:53` (`quality` script), `:54` (`test` script) | exact (self-extension) |
| `CHANGELOG.md` | MODIFY | docs | append-only log | `CHANGELOG.md:7-76` (v1.2.0 entry — Summary/Added/Changed/Removed/BREAKING) | exact (self-pattern) |
| `docs/upgrade-recovery.md` | MODIFY | docs | reference | `docs/upgrade-recovery.md:1-107` (existing v1.2 sections) | exact (self-extension) |
| `docs/zh-cn/upgrade-recovery.md` | MODIFY | docs (translation) | reference mirror | `docs/upgrade-recovery.md` | exact (translation parity) |
| `tools/fixtures/tarball-grep-allowlist.json` | MODIFY | config (allowlist) | static data | `tools/fixtures/tarball-grep-allowlist.json:1-86` (existing entries) | exact (self-extension) |
| `tools/verify-tarball.js` | MODIFY | release tooling | batch grep + filter | `verify-tarball.js:98-122` (`checkGmAgentGrepClean`) | exact (parallel phase) |
| `tools/validate-doc-paths.js` | NEW | docs tooling (linter) | batch grep + filter | `tools/validate-doc-links.js:39-62` (`getMarkdownFiles` walker), shape per RESEARCH §Example 2 | role-match (linter, simpler) |
| `test/test-legacy-v12-upgrade.js` | NEW | test (E2E upgrade) | seed → install → assert | `test/test-legacy-v11-upgrade.js` (full file) | exact (clone target) |
| `test/test-v13-agent-relocation.js` | NEW | test (E2E fresh) | install → assert | `test/test-domain-kb-install.js:1-80` (CLI-driven install + assert) | exact (lighter scaffold) |
| `test/test-gm-command-surface.js` | MODIFY | test (surface assertions) | parse + regex | `test/test-gm-command-surface.js:217-241` (Phase C body loop) | exact (self-extension) |
| `.planning/PROJECT.md` | MODIFY | planning state | reference | existing PROJECT.md | exact (self-extension) |
| `.planning/MILESTONES.md` | MODIFY | planning state | reference | existing MILESTONES.md | exact (self-extension) |
| `.planning/STATE.md` | MODIFY | planning state | reference | existing STATE.md | exact (self-extension) |
| (Phase 11 branch merge) | OPS | git operation | merge | n/a — coordination step | n/a |

---

## Pattern Assignments

### `tools/installer/ide/shared/path-utils.js` (utility, static export)

**Analog:** self — extend the existing `GOMAD_FOLDER_NAME` constant block at `path-utils.js:22-23` and the `module.exports` block at `path-utils.js:338-364`.

**Existing constant pattern** (`path-utils.js:22-23`):

```javascript
// GOMAD installation folder name - centralized constant for all installers
const GOMAD_FOLDER_NAME = '_gomad';
```

**Existing exports block** (`path-utils.js:338-364`):

```javascript
module.exports = {
  // New standard (dash-based)
  toDashName,
  toDashPath,
  // ... ~25 more entries ...
  TYPE_SEGMENTS,
  AGENT_SEGMENT,
  GOMAD_FOLDER_NAME,
};
```

**To copy from analog:** add a sibling pair right after `GOMAD_FOLDER_NAME` (per RESEARCH Pattern 3, §Decisions D-05):

```javascript
// v1.3+ persona body location under <installRoot>/_gomad/. Sole source of
// truth — every other module derives from this constant. Pair with
// LEGACY_AGENTS_PERSONA_SUBPATH so cleanup-planner can name the old path.
const AGENTS_PERSONA_SUBPATH = path.posix.join('_config', 'agents');
const LEGACY_AGENTS_PERSONA_SUBPATH = path.posix.join('gomad', 'agents');
```

Then add both names to the existing `module.exports` block alongside `GOMAD_FOLDER_NAME`.

**Why posix-join:** matches the manifest CSV serialization convention (forward-slash, see `cleanup-planner.js:301`); call sites split on `/` and re-join via `path.join` for platform normalization (RESEARCH Pattern 3).

**Do NOT touch:** doc-comment examples at `path-utils.js:27,57-62,81` use `gomad/agents/pm.md` to illustrate the SOURCE-PATH `<module>/<type>/<name>` notation consumed by `toDashPath()` — orthogonal to runtime install layout (CONTEXT D-05, RESEARCH §Anti-Patterns).

---

### `tools/installer/ide/shared/agent-command-generator.js` (service, file-I/O)

**Analog:** self — single literal swap at line 71.

**Imports pattern** (`agent-command-generator.js:1-5`):

```javascript
const path = require('node:path');
const fs = require('fs-extra');
const yaml = require('yaml');
const { toColonPath, toDashPath, customAgentColonName, customAgentDashName, GOMAD_FOLDER_NAME } = require('./path-utils');
const { getSourcePath } = require('../../project-root');
```

**Current write site** (`agent-command-generator.js:69-72`):

```javascript
async extractPersonas(workspaceRoot) {
  const skillsRoot = getSourcePath('gomad-skills');
  const outputDir = path.join(workspaceRoot, this.gomadFolderName, 'gomad', 'agents');
  await fs.ensureDir(outputDir);
```

**To copy from analog (modification):** add `AGENTS_PERSONA_SUBPATH` to the destructured import, then change the literal:

```javascript
const { /* ...existing... */, GOMAD_FOLDER_NAME, AGENTS_PERSONA_SUBPATH } = require('./path-utils');
// ...
const outputDir = path.join(workspaceRoot, this.gomadFolderName, ...AGENTS_PERSONA_SUBPATH.split('/'));
```

**Co-tenant invariant:** `_config/agents/` is already created at install start by `install-paths.js:22` (`agentsDir = path.join(configDir, 'agents')`) — the `fs.ensureDir(outputDir)` call at line 72 becomes a no-op on idempotent re-install (CONTEXT D-03 collision-free with `.customize.yaml`).

**No other touchpoints in this file.** `AGENT_SOURCES` (lines 14-51) is the source of truth for the 8 shortNames — reused by cleanup-planner via `LEGACY_AGENT_SHORT_NAMES`.

---

### `tools/installer/ide/templates/agent-command-template.md` (template, static text)

**Analog:** self — single line edit.

**Current template line 16:**

```markdown
1. LOAD the FULL agent file from {project-root}/_gomad/gomad/agents/{{shortName}}.md
```

**To copy from analog (modification):**

```markdown
1. LOAD the FULL agent file from {project-root}/_gomad/_config/agents/{{shortName}}.md
```

**Critical co-commit rule:** This change MUST land in the SAME commit as `agent-command-generator.js:71`. Drift = silent runtime failure (`/gm:agent-pm` can't find body). Phase C body-regex assertion (AGENT-07) is the safety net (RESEARCH Pitfall 3).

`{project-root}` and `{{shortName}}` are placeholders — DO NOT touch. `_gomad` is the literal `GOMAD_FOLDER_NAME` value (`path-utils.js:23`) and is intentional in the template (CONTEXT D-22 carry-forward).

---

### `tools/installer/core/cleanup-planner.js` (service, transform pure)

**Analog:** self — `isV11Legacy` (`cleanup-planner.js:148-156`) + v11 branch in `buildCleanupPlan` (`:210-245`) form the parallel pattern (CONTEXT D-01, RESEARCH Pattern 1).

**Imports pattern** (`cleanup-planner.js:25-29`):

```javascript
const path = require('node:path');
const fs = require('fs-extra');
const { AgentCommandGenerator } = require('../ide/shared/agent-command-generator');
const { ManifestGenerator } = require('./manifest-generator');
const prompts = require('../prompts');
```

**Detector pattern to mirror** (`cleanup-planner.js:148-156`):

```javascript
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

**To copy from analog (NEW detector — inverse signal: manifest MUST exist):**

```javascript
async function isV12LegacyAgentsDir(workspaceRoot, gomadDir) {
  // Manifest MUST exist — distinguishes v1.2→v1.3 upgrade from v1.1→v1.3.
  const manifestPath = path.join(gomadDir, '_config', 'files-manifest.csv');
  if (!(await fs.pathExists(manifestPath))) return false;
  const legacyAgentsDir = path.join(gomadDir, ...LEGACY_AGENTS_PERSONA_SUBPATH.split('/'));
  if (!(await fs.pathExists(legacyAgentsDir))) return false;
  for (const shortName of LEGACY_AGENT_SHORT_NAMES) {
    if (await fs.pathExists(path.join(legacyAgentsDir, `${shortName}.md`))) return true;
  }
  return false;
}
```

**v11 branch pattern to mirror** (`cleanup-planner.js:210-245` — snapshot-then-remove with realpath + containment):

```javascript
if (v11) {
  for (const shortName of LEGACY_AGENT_SHORT_NAMES) {
    const legacyDir = path.join(workspaceRoot, '.claude', 'skills', `gm-agent-${shortName}`);
    if (!(await fs.pathExists(legacyDir))) continue;

    let resolved;
    try { resolved = await fs.realpath(legacyDir); }
    catch (error) { if (error.code === 'ENOENT') continue; throw error; }

    if (!isContained(resolved, workspaceRoot)) {
      await prompts.log.warn('SYMLINK_ESCAPE: ' + legacyDir + ' → ' + resolved + ', refusing to touch');
      plan.refused.push({ idx: null, entry: { path: legacyDir }, reason: 'SYMLINK_ESCAPE' });
      continue;
    }

    plan.to_snapshot.push({
      src: resolved,
      install_root: '.claude',
      relative_path: path.posix.join('skills', 'gm-agent-' + shortName),
      orig_hash: null,
      was_modified: null,
    });
    plan.to_remove.push(resolved);
  }
  return plan;
}
```

**To copy from analog (NEW v12 branch — manifest IS present, hash IS computable, branch DOES fall through):**

```javascript
if (v12Reloc) {
  // Distinct reason 'manifest_cleanup' (NOT 'legacy_v1_cleanup' — manifest IS present).
  const handledPaths = new Set();  // mark resolved paths so the standard branch skips them
  const legacyAgentsDir = path.join(workspaceRoot, '_gomad', ...LEGACY_AGENTS_PERSONA_SUBPATH.split('/'));
  for (const shortName of LEGACY_AGENT_SHORT_NAMES) {
    const legacyPath = path.join(legacyAgentsDir, `${shortName}.md`);
    if (!(await fs.pathExists(legacyPath))) continue;

    let resolved;
    try { resolved = await fs.realpath(legacyPath); }
    catch (error) { if (error.code === 'ENOENT') continue; throw error; }

    if (!isContained(resolved, workspaceRoot)) {
      await prompts.log.warn('SYMLINK_ESCAPE: ' + legacyPath + ' → ' + resolved + ', refusing to touch');
      plan.refused.push({ idx: null, entry: { path: legacyPath }, reason: 'SYMLINK_ESCAPE' });
      continue;
    }

    // Hash computable — manifest IS present (D-34 was_modified detection).
    const priorEntry = priorManifest.find((e) => (e.absolutePath || '') === resolved);
    const orig_hash = priorEntry?.hash || null;
    let was_modified = null;
    if (orig_hash) {
      const currentHash = await hashGen.calculateFileHash(resolved);
      was_modified = currentHash !== orig_hash;
    }

    plan.to_snapshot.push({
      src: resolved,
      install_root: '_gomad',
      relative_path: path.posix.join(...LEGACY_AGENTS_PERSONA_SUBPATH.split('/'), `${shortName}.md`),
      orig_hash,
      was_modified,
    });
    plan.to_remove.push(resolved);
    handledPaths.add(resolved);
  }
  // FALL THROUGH to standard manifest-diff branch — pass handledPaths so
  // the loop below skips entries we just queued (prevents double-process).
}

// In the standard branch loop, add at top of for-iteration body:
//    if (handledPaths && handledPaths.has(resolved)) continue;
```

**Realpath + containment guard pattern** (`cleanup-planner.js:79-85`, `:259-279`):

```javascript
function isContained(resolved, wsRoot) {
  const rel = path.relative(wsRoot, resolved);
  if (rel === '') return true;
  if (path.isAbsolute(rel)) return false;
  if (rel === '..' || rel.startsWith('..' + path.sep)) return false;
  return true;
}
```

This guard is reused for free — both the new detector and v12 branch above call `fs.realpath` then `isContained` exactly as the v11 branch does (RESEARCH §Architecture: realpath containment v1.2 D-32/D-33).

**Module exports addition** (`cleanup-planner.js:516-529`): add `isV12LegacyAgentsDir` to the exports block alongside `isV11Legacy`.

---

### `tools/installer/core/installer.js` (controller, request-response)

**Analog:** self — `_prepareUpdateState` at lines 509-585 hosts the cleanup-planner integration; `detectCustomFiles` at lines 967-973 hosts the whitelist extension.

**Imports pattern** (`installer.js:1-16`):

```javascript
const path = require('node:path');
const fs = require('fs-extra');
const cleanupPlanner = require('./cleanup-planner');
const { AgentCommandGenerator } = require('../ide/shared/agent-command-generator');
const { GOMAD_FOLDER_NAME } = require('../ide/shared/path-utils');
```

**Cleanup integration site** (`installer.js:518-555`):

```javascript
try {
  const workspaceRoot = await fs.realpath(paths.projectRoot);
  const ideRoots = await this._collectIdeRoots();
  const allowedRoots = new Set(['_gomad', '.claude', ...ideRoots]);
  const isV11 = await cleanupPlanner.isV11Legacy(workspaceRoot, paths.gomadDir);

  // newInstallSet: realpath-resolve every prior manifest entry that still exists on disk.
  const newInstallSet = new Set();
  for (const entry of existingFilesManifest) {
    const installRoot = entry.install_root || '_gomad';
    const joined = entry.absolutePath || path.join(workspaceRoot, installRoot, entry.path || '');
    try {
      const resolved = await fs.realpath(joined);
      newInstallSet.add(resolved);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }

  const plan = await cleanupPlanner.buildCleanupPlan({
    priorManifest: existingFilesManifest,
    newInstallSet,
    workspaceRoot,
    allowedRoots,
    isV11Legacy: isV11,
  });
```

**To copy from analog (modification — add v12 detector call + new input field):**

```javascript
const isV11 = await cleanupPlanner.isV11Legacy(workspaceRoot, paths.gomadDir);
const isV12Reloc = await cleanupPlanner.isV12LegacyAgentsDir(workspaceRoot, paths.gomadDir);

// ... newInstallSet build unchanged ...

const plan = await cleanupPlanner.buildCleanupPlan({
  priorManifest: existingFilesManifest,
  newInstallSet,
  workspaceRoot,
  allowedRoots,
  isV11Legacy: isV11,
  isV12LegacyAgentsDir: isV12Reloc,   // NEW
});
```

**Verbose banner site (CONTEXT D-09):** at the top of the v12 branch — before plan execution but after detection — when `isV12Reloc && !config.dryRun`, emit a banner via the established `prompts.log` + `cli-utils` color pattern (analog: `installer.js:350-358`, `:559`):

```javascript
const color = await prompts.getColor();
await prompts.log.message(color.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
await prompts.log.message(color.cyan('  GoMad v1.3 BREAKING: Agent persona files are relocating'));
// ... 4-bullet body covering: (a) what's moving, (b) backup location,
//     (c) .customize.yaml preservation, (d) recovery doc cross-ref ...
```

**Suppress banner when `config.dryRun`** (CONTEXT D-10) — dry-run already prints planned actions via `cleanupPlanner.renderPlan(plan)` at line 559.

**Custom-file whitelist site** (`installer.js:967-973` — current code with the `_config/` early-`continue` at lines 933-956 already handling most of this):

```javascript
if (!fileInfo) {
  // File not in manifest = custom file
  // EXCEPT: Agent .md files in module folders are generated files, not custom
  // Only treat .md files under _config/agents/ as custom
  if (!(fileName.endsWith('.md') && relativePath.includes('/agents/') && !relativePath.startsWith('_config/'))) {
    customFiles.push(fullPath);
  }
}
```

**To copy from analog (modification, CONTEXT D-03):** extend whitelist to recognize the 8 known persona shortNames at `_config/agents/<shortName>.md` as generated:

```javascript
// Top of detectCustomFiles or just-above-the-conditional:
const PERSONA_SHORTNAMES = AgentCommandGenerator.AGENT_SOURCES.map((a) => a.shortName);

// Extended conditional:
if (!fileInfo) {
  const isModuleAgentMd = fileName.endsWith('.md')
    && relativePath.includes('/agents/')
    && !relativePath.startsWith('_config/');
  const isV13PersonaMd = fileName.endsWith('.md')
    && (relativePath.startsWith('_config/agents/') || relativePath.startsWith('_config\\agents\\'))
    && PERSONA_SHORTNAMES.includes(fileName.replace(/\.md$/, ''));
  if (!isModuleAgentMd && !isV13PersonaMd) {
    customFiles.push(fullPath);
  }
}
```

**`.customize.yaml` user-override preservation** (CONTEXT D-04) — the existing block at `installer.js:933-955` (`relativePath.startsWith('_config/')` → special-case `.customize.yaml` hash compare) is ORTHOGONAL and remains UNTOUCHED. Persona `.md` files match a different filename pattern and never collide.

**Comment touchpoint** (`installer.js:299` — current text):

```javascript
// into _gomad/gomad/agents/<shortName>.md. Runs BEFORE generateManifests so the
```

**To copy from analog (modification):**

```javascript
// into _gomad/_config/agents/<shortName>.md. Runs BEFORE generateManifests so the
```

(Per CONTEXT D-05 sweep list — this is one of the 3 real touchpoints.)

---

### `package.json` (config, static manifest)

**Analog:** self — current `quality` script at line 53 establishes the chain pattern.

**Current pattern** (`package.json:53`):

```json
"quality": "npm run format:check && npm run lint && npm run lint:md && npm run docs:build && npm run test:install && npm run test:integration && npm run validate:refs && npm run validate:skills && npm run test:inject-reference-tables && npm run validate:kb-licenses && npm run test:orphan-refs"
```

**To copy from analog (modification — CONTEXT D-08, RESEARCH §Code Examples Example 1):**

Single fat `quality` script wires the full release-gate matrix. Order matters for fast-fail (cheap checks first, install/E2E last):

```json
"quality": "npm run format:check && npm run lint && npm run lint:md && npm run docs:build && npm run validate:refs && npm run validate:skills && npm run validate:kb-licenses && npm run validate:doc-paths && npm run test:inject-reference-tables && npm run test:orphan-refs && npm run test:install && npm run test:integration && npm run test:gm-surface && npm run test:tarball && npm run test:domain-kb-install && npm run test:legacy-v12-upgrade && npm run test:v13-agent-relocation",

"prepublishOnly": "npm run quality",
"validate:doc-paths": "node tools/validate-doc-paths.js",
"test:legacy-v12-upgrade": "node test/test-legacy-v12-upgrade.js",
"test:v13-agent-relocation": "node test/test-v13-agent-relocation.js",
```

**Version bump:** `"version": "1.2.0"` → `"version": "1.3.0"` (REL-03).

**Bump-AFTER-quality-green rule** (RESEARCH Pitfall 4): if `quality` fails post-bump, the commit is poisoned and must be reverted before publish.

---

### `CHANGELOG.md` (docs, append-only log)

**Analog:** self — v1.2.0 entry at lines 7-76 establishes the BREAKING-section pattern.

**Section structure pattern** (`CHANGELOG.md:7-76`):

```markdown
## [1.2.0] - 2026-04-23

### Summary
<2-3 paragraph narrative — what completed in this release>

### Added
- <new feature or file>
- ...

### Changed
- <modified behavior, with old → new>
- ...

### Removed
- <deleted surfaces>
- ...

### BREAKING CHANGES
<old surface description>. Upgrading from v1.X.0: <action user takes>.
The installer auto-<what installer does>. If you scripted <old API>,
update to <new API>.
```

**To copy from analog (NEW v1.3.0 entry — CONTEXT BREAKING-callout, RESEARCH §Code Examples Example 3):**

Insert a new `## [1.3.0] - 2026-04-XX` section above the v1.2.0 entry. Mirror the 5-section structure verbatim. The BREAKING section MUST:

1. State old path → new path explicitly
2. Describe what installer does automatically (snapshot → remove → write new → regenerate launchers)
3. Direct user to a single command (`gomad install`)
4. Cross-link `docs/upgrade-recovery.md#v12--v13-recovery` for rollback
5. Note `_gomad/gomad/agents/` script-call-site update if any

**Tarball inclusion:** `CHANGELOG.md` is in `package.json` `files:` array (line 35) — it ships in the tarball. AGENT-10 grep allowlist must exempt it.

---

### `docs/upgrade-recovery.md` (docs, reference)

**Analog:** self — current file (lines 1-107) establishes the section structure: backup layout, metadata.json schema, restore commands, version-compat check, identifying which backup, pruning, when no backup is produced.

**Existing pattern** (`docs/upgrade-recovery.md:18-19`):

```markdown
├── _gomad/                 # snapshots of files that were installed under _gomad/
│   └── gomad/agents/pm.md
```

This line legitimately shows `gomad/agents/pm.md` inside the v1.2-era backup-tree example. CONTEXT D-12 + RESEARCH Pitfall 6 say `validate:doc-paths` MUST exempt `docs/upgrade-recovery.md` and `docs/zh-cn/upgrade-recovery.md` from the lint via the allowlist set.

**To copy from analog (modification — AGENT-11):** add a new section after "When backups are NOT produced" (line 99) titled `## v1.2 → v1.3 recovery`:

```markdown
## v1.2 → v1.3 recovery

When upgrading from v1.2.0 to v1.3.0, the installer relocates persona body
files from `_gomad/gomad/agents/<shortName>.md` to
`_gomad/_config/agents/<shortName>.md`. The 8 old files are snapshotted
into `_gomad/_backups/<YYYYMMDD-HHMMSS>/_gomad/gomad/agents/` before removal.

### Rollback to v1.2 layout

If `/gm:agent-*` invocation fails after upgrade, or you need to roll back:

1. `npm install -g @xgent-ai/gomad@1.2.0` (re-pin to v1.2 globally)
2. `cp -R _gomad/_backups/<ts>/_gomad/gomad/agents/ _gomad/gomad/`
3. Re-run `gomad install` (v1.2 will rewrite launcher stubs to point at the
   restored old path)

### Forward recovery

If only the launcher stubs are stale (persona body file is at new location
but `/gm:agent-*` 404s), re-run `gomad install` — `writeAgentLaunchers`
overwrites unconditionally and will regenerate stubs pointing at the v1.3
location.
```

**Heading anchor invariant:** the section heading `v1.2 → v1.3 recovery` slugifies to `v12--v13-recovery` (per `validate-doc-links.js:74-82` `headingToAnchor` semantics — em-dashes / arrows / spaces collapse). The CHANGELOG cross-link MUST use that exact slug.

---

### `docs/zh-cn/upgrade-recovery.md` (docs translation, reference mirror)

**Analog:** `docs/upgrade-recovery.md` (its English source).

**To copy from analog (modification):** translate the new "v1.2 → v1.3 recovery" section into Simplified Chinese, preserving:
- Heading slug semantics (use the same English-anchor-friendly title structure where possible, or update CHANGELOG cross-link if the zh anchor differs)
- Code blocks verbatim (`cp -R`, `gomad install` are not translated)
- Backup-tree example with legacy `gomad/agents/pm.md` literal — same allowlist exemption applies

---

### `tools/fixtures/tarball-grep-allowlist.json` (config, static data)

**Analog:** self — existing 17 entries (lines 1-86) establish the `{ path, reason }` schema for legitimate grep matches.

**Existing entry pattern** (`tarball-grep-allowlist.json:74-77`):

```json
{
  "path": "tools/installer/core/cleanup-planner.js",
  "reason": "Shipped installer module; legacy v1.1 cleanup code referring to .claude/skills/gm-agent-<shortName>/ dirs (D-42, REF-02)."
}
```

**To copy from analog (modification — CONTEXT D-13, AGENT-10):** add NEW entries for the v1.3 Phase 4 grep target (`gomad/agents/`). The existing `cleanup-planner.js` entry needs its reason updated to mention v12 cleanup; new entries needed for any other shipped file that legitimately references `gomad/agents/` (likely just `cleanup-planner.js` and whatever the v12 branch plus comment edits leave behind):

```json
{
  "path": "tools/installer/core/cleanup-planner.js",
  "reason": "Shipped installer module; v1.1 (.claude/skills/gm-agent-*) AND v1.2 (gomad/agents/*) cleanup code legitimately references both legacy paths (D-42 + Phase 12 D-01)."
}
```

**File scope:** allowlist applies to BOTH Phase 3 (`gm-agent-`) and the NEW Phase 4 (`gomad/agents/`) checks if you reuse the same file. RESEARCH suggests Phase 4 may want its OWN allowlist or a category field — planner discretion. Recommended: keep one file with `category: 'gm-agent' | 'gomad-agents'` field so each phase filters its own subset.

---

### `tools/verify-tarball.js` (release tooling, batch grep + filter)

**Analog:** self — `checkGmAgentGrepClean` at lines 98-122 is the parallel pattern for the new Phase 4 (CONTEXT D-13, AGENT-10).

**Imports pattern** (`verify-tarball.js:13-15`):

```javascript
const { execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
```

**Phase 3 pattern to mirror** (`verify-tarball.js:98-122`):

```javascript
function checkGmAgentGrepClean() {
  let grepOutput = '';
  try {
    grepOutput = execSync(
      `grep -rlE "gm-agent-" src/ tools/installer/ ` +
        `--include="*.js" --include="*.yaml" --include="*.md" --include="*.json" --include="*.csv" ` +
        `2>/dev/null`,
      { encoding: 'utf8' },
    );
  } catch {
    return { passed: true, failures: [] };
  }

  const allowlistPath = path.join(__dirname, 'fixtures', 'tarball-grep-allowlist.json');
  const allowlist = fs.existsSync(allowlistPath) ? JSON.parse(fs.readFileSync(allowlistPath, 'utf8')) : [];
  const allowedPaths = new Set(allowlist.map((entry) => entry.path));

  const failures = grepOutput
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .filter((line) => !allowedPaths.has(line));

  return { passed: failures.length === 0, failures };
}
```

**Phase invocation pattern** (`verify-tarball.js:163-171`):

```javascript
console.log(`${colors.cyan}Phase 3: Checking for residual gm-agent- references...${colors.reset}`);
const gmAgentCheck = checkGmAgentGrepClean();
if (gmAgentCheck.passed) {
  console.log(`${colors.green}PASS: no unallowlisted gm-agent- residuals in shipped files${colors.reset}`);
} else {
  hasFailures = true;
  console.log(`${colors.red}FAIL: residual gm-agent- references in: ${gmAgentCheck.failures.join(', ')}${colors.reset}`);
}
```

**To copy from analog (NEW Phase 4):**

```javascript
function checkLegacyAgentPathClean() {
  let grepOutput = '';
  try {
    grepOutput = execSync(
      String.raw`grep -rlE "\bgomad/agents/" src/ tools/installer/ ` +
        `--include="*.js" --include="*.yaml" --include="*.md" --include="*.json" --include="*.csv" ` +
        `2>/dev/null`,
      { encoding: 'utf8' },
    );
  } catch {
    return { passed: true, failures: [] };
  }
  const allowlistPath = path.join(__dirname, 'fixtures', 'tarball-grep-allowlist.json');
  const allowlist = fs.existsSync(allowlistPath) ? JSON.parse(fs.readFileSync(allowlistPath, 'utf8')) : [];
  const allowedPaths = new Set(
    allowlist
      .filter((entry) => !entry.category || entry.category === 'gomad-agents')
      .map((entry) => entry.path),
  );
  const failures = grepOutput
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .filter((line) => !allowedPaths.has(line));
  return { passed: failures.length === 0, failures };
}
```

Insert the Phase 4 invocation block after Phase 3 (line 171), mirroring the same console.log + result pattern. Update the final summary at line 178 to mention Phase 4.

---

### `tools/validate-doc-paths.js` (NEW — docs tooling, batch grep + filter)

**Analog:** `tools/validate-doc-links.js:39-62` (the `getMarkdownFiles` recursive walker) plus the standalone-script main-fn pattern; concrete shape per RESEARCH §Code Examples Example 2.

**Imports + walker pattern from analog** (`validate-doc-links.js:18-21, 39-62`):

```javascript
const fs = require('node:fs');
const path = require('node:path');

const DOCS_ROOT = path.resolve(__dirname, '../docs');

function getMarkdownFiles(dir) {
  const files = [];
  function walk(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.name.startsWith('_')) continue;
      if (entry.isDirectory()) walk(fullPath);
      else if (entry.isFile() && (entry.name.endsWith('.md') || entry.name.endsWith('.mdx'))) files.push(fullPath);
    }
  }
  walk(dir);
  return files;
}
```

**Exit code pattern from analog** (`validate-doc-links.js:415`):

```javascript
process.exit(totalIssues > 0 ? 1 : 0);
```

**To copy from analog (NEW file — CONTEXT D-12, RESEARCH §Code Examples Example 2):**

```javascript
'use strict';
const fs = require('node:fs');
const path = require('node:path');

const DOCS_ROOT = path.resolve(__dirname, '../docs');

// Single canonical legacy path that must NEVER appear in shipped docs.
const FORBIDDEN_PATTERNS = [
  /\b_gomad\/gomad\/agents\b/,
  /\bgomad\/agents\/[a-z-]+\.md\b/,
];

// Allowlist: legitimate v1.2-era references inside backup-tree examples.
// Both English + zh-cn upgrade-recovery.md pages legitimately demonstrate
// the v1.2 backup layout (CONTEXT D-12 negative-only scope).
const ALLOWLIST = new Set([
  'upgrade-recovery.md',
  'zh-cn/upgrade-recovery.md',
]);

function getMarkdownFiles(dir, base = dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('_')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...getMarkdownFiles(full, base));
    else if (/\.(md|mdx)$/.test(entry.name)) out.push(path.relative(base, full));
  }
  return out;
}

function main() {
  const failures = [];
  for (const rel of getMarkdownFiles(DOCS_ROOT)) {
    if (ALLOWLIST.has(rel)) continue;
    const content = fs.readFileSync(path.join(DOCS_ROOT, rel), 'utf8');
    for (const pat of FORBIDDEN_PATTERNS) {
      if (pat.test(content)) failures.push({ file: rel, pattern: pat.source });
    }
  }
  if (failures.length === 0) {
    console.log('OK: no legacy gomad/agents/ paths in shipped docs');
    process.exit(0);
  }
  for (const f of failures) console.error(`FAIL: ${f.file} contains pattern ${f.pattern}`);
  process.exit(1);
}

main();
```

**Scope contract (CONTEXT D-12):** NEGATIVE-only. Lints `docs/` ONLY (NOT `tools/installer/` source — that legitimately references the legacy path for cleanup logic). NOT enforcing positive (no requirement that `_config/agents/` MUST appear).

---

### `test/test-legacy-v12-upgrade.js` (NEW — test, E2E upgrade)

**Analog:** `test/test-legacy-v11-upgrade.js` (full file, 296 lines) — clone target per CONTEXT D-11 and AGENT-08.

**Imports + helper pattern from analog** (`test-legacy-v11-upgrade.js:19-71`):

```javascript
'use strict';
const path = require('node:path');
const os = require('node:os');
const fs = require('fs-extra');
const { execSync } = require('node:child_process');
const crypto = require('node:crypto');

const colors = { reset: '[0m', green: '[32m', red: '[31m', /* ... */ };
let passed = 0;
let failed = 0;
function assert(condition, testName, errorMessage = '') { /* ... */ }

const REPO_ROOT = path.resolve(__dirname, '..');
const LEGACY_AGENTS = ['analyst', 'tech-writer', 'pm', 'ux-designer', 'architect', 'sm', 'dev'];

function packAndInstall(prefix) {
  const packOutput = execSync('npm pack', { cwd: REPO_ROOT, encoding: 'utf8', timeout: 120_000 }).trim();
  const tarballName = packOutput.split('\n').pop().trim();
  const tarballPath = path.join(REPO_ROOT, tarballName);
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  execSync('npm init -y', { cwd: tempDir, stdio: 'pipe', timeout: 30_000 });
  execSync(`npm install "${tarballPath}"`, { cwd: tempDir, stdio: 'pipe', timeout: 180_000 });
  const gomadBin = path.join(tempDir, 'node_modules', '.bin', 'gomad');
  return { tempDir, gomadBin, tarballPath };
}
```

**Seed pattern from analog** (`test-legacy-v11-upgrade.js:78-87`):

```javascript
function seedV11Workspace(tempDir, { includeCustom }) {
  for (const shortName of LEGACY_AGENTS) {
    const dir = path.join(tempDir, '.claude', 'skills', `gm-agent-${shortName}`);
    fs.ensureDirSync(dir);
    fs.writeFileSync(path.join(dir, 'SKILL.md'), `# gm-agent-${shortName} (v1.1)\n`);
  }
}
```

**Assertion patterns from analog** (`test-legacy-v11-upgrade.js:124-184`):

```javascript
const backupsDir = path.join(tempDir, '_gomad', '_backups');
const backupTss = listBackupTimestamps(backupsDir);
assert(backupTss.length === 1, 'Exactly one backup dir created');

const backupRoot = path.join(backupsDir, backupTss[0]);
const meta = JSON.parse(fs.readFileSync(path.join(backupRoot, 'metadata.json'), 'utf8'));
assert(meta.reason === 'legacy_v1_cleanup', 'metadata.reason=legacy_v1_cleanup');
```

**To copy from analog (NEW file — CONTEXT D-11, AGENT-08):**

Same scaffold; key differences:

1. **Constants:** `LEGACY_AGENTS` becomes the 8-entry array (add `solo-dev` — AGENT_SOURCES has 8). Add `LEGACY_AGENTS_DIR_REL = '_gomad/gomad/agents'` and `NEW_AGENTS_DIR_REL = '_gomad/_config/agents'`.

2. **Seed function (CONTEXT D-11 — NETWORK-FREE manual synthesis):** instead of seeding v1.1 `.claude/skills/gm-agent-*/`, hand-craft a v1.2 install state in tempdir:
   ```javascript
   function seedV12Workspace(tempDir) {
     // 1. Create _gomad/_config/files-manifest.csv (v2 schema with 8 persona rows
     //    pointing at _gomad/gomad/agents/<shortName>.md, install_root='_gomad',
     //    schema_version='2.0', valid sha-256 hash for each).
     // 2. Write 8 persona .md files at _gomad/gomad/agents/<shortName>.md
     //    (any non-empty body; SHA must match manifest).
     // 3. Write minimal .claude/commands/gm/agent-<shortName>.md launcher stubs
     //    pointing at the OLD path (so the v1.3 install regenerates them).
   }
   ```
   Use `csv-parse/sync` to read/write manifest CSV (same lib as `installer.js:3` and `manifest-generator.js`); use `crypto.createHash('sha256')` to compute hashes (same as `test-legacy-v11-upgrade.js:94-95`).

3. **Assertions (replace v11 expectations):**
   - `metadata.reason === 'manifest_cleanup'` (NOT `'legacy_v1_cleanup'` — manifest IS present per CONTEXT D-01 v12-branch reason)
   - Old path absent: `!fs.existsSync(path.join(tempDir, '_gomad', 'gomad', 'agents', 'pm.md'))`
   - New path present: `fs.existsSync(path.join(tempDir, '_gomad', '_config', 'agents', 'pm.md'))`
   - Backup populated: `fs.existsSync(path.join(backupRoot, '_gomad', 'gomad', 'agents', 'pm.md'))`
   - All 8 personas snapshotted (loop AGENT_SOURCES)
   - `meta.files[].was_modified` is `true | false` (NOT `null` — manifest IS present per v12-branch hash compute)
   - No orphans: `_gomad/gomad/agents/` either gone OR empty after cleanup
   - Idempotent re-install: no new backup, manifest row count stable (analog `test-legacy-v11-upgrade.js:208-240`)

4. **Reuse `packAndInstall`, `listBackupTimestamps`, `sha256File`, `colors`, `assert` verbatim.**

---

### `test/test-v13-agent-relocation.js` (NEW — test, E2E fresh)

**Analog:** `test/test-domain-kb-install.js:1-80` (CLI-driven install scaffold, lighter than tarball-pack).

**Scaffold pattern from analog** (`test-domain-kb-install.js:24-70`):

```javascript
const path = require('node:path');
const os = require('node:os');
const { execSync } = require('node:child_process');
const fs = require('fs-extra');
const { parse: csvParse } = require('csv-parse/sync');

let passed = 0;
let failed = 0;
function assert(condition, testName, errorMessage = '') { /* ... */ }

const projectRoot = path.resolve(__dirname, '..');
const cliPath = path.join(projectRoot, 'tools', 'installer', 'gomad-cli.js');

function runInstaller(targetDir) {
  execSync(`node "${cliPath}" install --directory "${targetDir}" --modules core --tools none --yes`, {
    cwd: projectRoot, encoding: 'utf8', timeout: 120_000, stdio: 'pipe',
  });
}

function readFilesManifest(gomadDir) {
  const csv = fs.readFileSync(path.join(gomadDir, '_config', 'files-manifest.csv'), 'utf8');
  return csvParse(csv, { columns: true, skip_empty_lines: true, relax_quotes: false });
}
```

**To copy from analog (NEW file — AGENT-09):**

Use the lighter `node tools/installer/gomad-cli.js install --modules core --tools claude-code --yes` invocation (NOT `npm pack`). Note: `--tools claude-code` (NOT `--tools none`) because we need launcher stubs to assert.

Assertions:

```javascript
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gomad-v13-fresh-'));
runInstaller(tempDir);
const gomadDir = path.join(tempDir, '_gomad');

// Per-persona checks across all 8 AGENT_SOURCES
const PERSONAS = ['analyst', 'tech-writer', 'pm', 'ux-designer', 'architect', 'sm', 'dev', 'solo-dev'];
for (const sn of PERSONAS) {
  assert(fs.existsSync(path.join(gomadDir, '_config', 'agents', `${sn}.md`)),
    `_config/agents/${sn}.md exists`);
}

// Negative: no legacy path on fresh install
assert(!fs.existsSync(path.join(gomadDir, 'gomad', 'agents')),
  'gomad/agents/ does not exist on fresh v1.3 install');

// Manifest references new path with install_root='_gomad'
const rows = readFilesManifest(gomadDir);
const personaRows = rows.filter((r) => r.path && r.path.includes('_config/agents/') && r.path.endsWith('.md'));
assert(personaRows.length === 8, `8 persona rows in manifest (got ${personaRows.length})`);
assert(personaRows.every((r) => r.install_root === '_gomad'),
  'all persona rows have install_root="_gomad"');

// Idempotent re-install — no backup created
runInstaller(tempDir);
const backupsDir = path.join(gomadDir, '_backups');
const backups = fs.existsSync(backupsDir) ? fs.readdirSync(backupsDir) : [];
assert(backups.length === 0, 'no backup created on idempotent re-install');
```

---

### `test/test-gm-command-surface.js` (MODIFY — test, parse + regex)

**Analog:** self — Phase C body loop at lines 217-241 hosts the per-persona launcher stub assertion.

**Existing per-persona body parse pattern** (`test-gm-command-surface.js:217-241`):

```javascript
const EXPECTED_AGENTS = ['analyst', 'tech-writer', 'pm', 'ux-designer', 'architect', 'sm', 'dev', 'solo-dev'];
for (const shortName of EXPECTED_AGENTS) {
  const stubPath = path.join(installedGmDir, `agent-${shortName}.md`);
  assert(fs.existsSync(stubPath), `(C) agent-${shortName}.md present in installed output`);
  if (!fs.existsSync(stubPath)) continue;

  const raw = fs.readFileSync(stubPath, 'utf8');
  const match = raw.match(/^---\n([\s\S]*?)\n---/);
  assert(Boolean(match), `(C) agent-${shortName}.md has YAML frontmatter`);
  // ... yaml.load + name + description assertions ...
}
```

**To copy from analog (modification — AGENT-07, RESEARCH Pattern 5):** add launcher-body regex assertions inside the existing for-loop, after the description check at line 240:

```javascript
// AGENT-07: launcher body MUST reference the v1.3 path, NOT the v1.2 legacy path.
const positiveRegex = new RegExp(`/_gomad/_config/agents/${shortName}\\.md`);
const negativeRegex = new RegExp(`/_gomad/gomad/agents/${shortName}\\.md`);
assert(positiveRegex.test(raw),
  `(C) agent-${shortName}.md body references v1.3 _config/agents/ path`);
assert(!negativeRegex.test(raw),
  `(C) agent-${shortName}.md body has NO legacy gomad/agents/ reference`);
```

`raw` is already in scope from line 223. No imports needed; `RegExp` is global.

---

### `.planning/PROJECT.md` / `.planning/MILESTONES.md` / `.planning/STATE.md` (planning state)

**Analog:** existing `PROJECT.md` Key Decisions row pattern; existing MILESTONES checklist; existing STATE.md `Decisions` table.

**To copy from analog (modification — REL-04):** in the same release commit range:
- `PROJECT.md` — add Key Decisions row for v1.3 BREAKING-callout pattern + manual `npm publish + prepublishOnly` gate
- `MILESTONES.md` — mark Phase 12 complete, link to v1.3.0 release
- `STATE.md` — clear Phase 12 exclusive lock, log v1.3.0 release fact

These are mechanical; no code patterns required.

---

## Shared Patterns

### Pattern S1: Realpath + Containment Guard (Cross-Cutting Safety)

**Source:** `tools/installer/core/cleanup-planner.js:79-85` (`isContained`) + `:259-279` (realpath-then-check usage)

**Apply to:** Every new code path in `cleanup-planner.js` v12 branch (already enforced — copy the v11 idiom verbatim). No other files invoke `fs.remove` directly.

**Pattern:**

```javascript
let resolved;
try { resolved = await fs.realpath(joined); }
catch (error) {
  if (error.code === 'ENOENT') continue; // file already gone — idempotent
  throw error;
}
if (!isContained(resolved, workspaceRoot)) {
  await prompts.log.warn('SYMLINK_ESCAPE: ' + joined + ' → ' + resolved + ', refusing to touch');
  plan.refused.push({ idx: null, entry: { path: joined }, reason: 'SYMLINK_ESCAPE' });
  continue;  // OR: throw new ManifestCorruptError(...) for batch-poison
}
```

**Anti-pattern:** Calling `fs.remove(path.join(...))` directly without realpath — bypasses symlink-escape detection (RESEARCH §Anti-Patterns; v1.2 D-32/D-33).

---

### Pattern S2: Source-of-Truth Constant Reuse

**Source:** `tools/installer/core/cleanup-planner.js:41` (`LEGACY_AGENT_SHORT_NAMES = AgentCommandGenerator.AGENT_SOURCES.map((a) => a.shortName)`)

**Apply to:** New v12 branch detector (cleanup-planner.js), `installer.js:967` whitelist (`PERSONA_SHORTNAMES = AgentCommandGenerator.AGENT_SOURCES.map(...)`), `path-utils.js` constants.

**Rule:** Never duplicate the 8-persona shortname list. Always derive from `AgentCommandGenerator.AGENT_SOURCES`. Never duplicate `'_config/agents'` or `'gomad/agents'` literals — always reference `AGENTS_PERSONA_SUBPATH` / `LEGACY_AGENTS_PERSONA_SUBPATH` from `path-utils.js`.

---

### Pattern S3: ENOENT Tolerance for Idempotency

**Source:** `cleanup-planner.js:222-225` (legacy branch), `:264-269` (standard branch), `installer.js:539-546` (newInstallSet build)

**Apply to:** All new fs operations in v12 branch — race conditions (file deleted between `pathExists` and `realpath`) and idempotent re-runs (file already gone) MUST NOT throw.

**Pattern:**

```javascript
try { resolved = await fs.realpath(legacyPath); }
catch (error) {
  if (error.code === 'ENOENT') continue;  // already gone — fine
  throw error;                              // unexpected — propagate
}
```

---

### Pattern S4: Test Result Reporting

**Source:** `test/test-legacy-v11-upgrade.js:36-50` (assert helper, colors), `test/test-domain-kb-install.js:42-53` (same shape)

**Apply to:** Both new tests (`test-legacy-v12-upgrade.js`, `test-v13-agent-relocation.js`).

**Pattern:**

```javascript
let passed = 0;
let failed = 0;
function assert(condition, testName, errorMessage = '') {
  if (condition) { console.log(`${green}✓${reset} ${testName}`); passed++; }
  else { console.log(`${red}✗${reset} ${testName}`); if (errorMessage) console.log(`  ${errorMessage}`); failed++; }
}
// ... assertions ...
process.exit(failed > 0 ? 1 : 0);
```

---

### Pattern S5: Allowlist + Grep-Filter (Tarball + Doc Linters)

**Source:** `tools/verify-tarball.js:111-119` (load + filter), `tools/fixtures/tarball-grep-allowlist.json` (data shape `{path, reason}`)

**Apply to:** `verify-tarball.js` Phase 4, `validate-doc-paths.js` (with hard-coded `ALLOWLIST = new Set([...])` since the doc allowlist is much smaller — only 2 entries).

**Pattern (file-based):**

```javascript
const allowlistPath = path.join(__dirname, 'fixtures', 'tarball-grep-allowlist.json');
const allowlist = fs.existsSync(allowlistPath) ? JSON.parse(fs.readFileSync(allowlistPath, 'utf8')) : [];
const allowedPaths = new Set(allowlist.map((entry) => entry.path));
const failures = grepOutput.split('\n').map((l) => l.trim()).filter((l) => l && !allowedPaths.has(l));
```

---

### Pattern S6: CLI Color + Banner via prompts/cli-utils

**Source:** `installer.js:347-358` (color + log.message pattern), `installer.js:559` (log.info for plan render)

**Apply to:** Verbose v1.3 migration banner (CONTEXT D-09).

**Pattern:**

```javascript
const color = await prompts.getColor();
await prompts.log.message(color.cyan('━━━ banner top ━━━'));
await prompts.log.message(color.yellow('  GoMad v1.3 BREAKING: ...'));
// suppress when config.dryRun (D-10)
```

Available chalk-style methods on `color`: `cyan`, `yellow`, `red`, `green`, `dim` (verified at `installer.js:350-358`).

---

### Pattern S7: NPM Lifecycle Script Composition

**Source:** `package.json:53` (`quality` chain) + `:54` (`test` chain)

**Apply to:** Extended `quality` script + new `prepublishOnly` script.

**Rule:** `&&` chain; cheap fast-fail checks first (format, lint), expensive E2E last (test:legacy-v12-upgrade, test:v13-agent-relocation). `prepublishOnly` is a built-in npm lifecycle — no extra config; auto-runs before `npm publish`.

---

## No Analog Found

| File | Reason |
|------|--------|
| (none) | Every Phase 12 file has a strong codebase analog. Phase 12 is by design 90% reuse + 10% new code (RESEARCH §Don't Hand-Roll "Key insight"). |

---

## Metadata

**Analog search scope:**
- `tools/installer/core/` (cleanup-planner, installer, install-paths, manifest-generator)
- `tools/installer/ide/shared/` (path-utils, agent-command-generator)
- `tools/installer/ide/templates/` (agent-command-template.md)
- `tools/` (verify-tarball, validate-doc-links, fixtures/)
- `test/` (test-legacy-v11-upgrade, test-gm-command-surface, test-domain-kb-install)
- `docs/` (upgrade-recovery.md, zh-cn/upgrade-recovery.md)
- `CHANGELOG.md`, `package.json` (release surface)

**Files scanned:** 19 analog files read in full or in surgically-targeted ranges.

**Pattern extraction date:** 2026-04-26
