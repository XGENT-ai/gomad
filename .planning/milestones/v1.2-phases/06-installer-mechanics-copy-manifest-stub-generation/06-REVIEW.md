---
phase: 06-installer-mechanics-copy-manifest-stub-generation
reviewed: 2026-04-18T00:00:00Z
depth: standard
files_reviewed: 7
files_reviewed_list:
  - tools/installer/ide/_config-driven.js
  - tools/installer/core/installer.js
  - tools/installer/core/manifest-generator.js
  - tools/installer/ide/platform-codes.yaml
  - tools/installer/ide/templates/agent-command-template.md
  - tools/installer/ide/shared/agent-command-generator.js
  - test/test-installation-components.js
findings:
  critical: 0
  warning: 5
  info: 6
  total: 11
status: issues_found
---

# Phase 6: Code Review Report

**Reviewed:** 2026-04-18T00:00:00Z
**Depth:** standard
**Files Reviewed:** 7
**Status:** issues_found

## Summary

Phase 6 delivers three intertwined reworks: (1) copy-only IDE install replacing symlinks, (2) manifest v2 with `schema_version` and `install_root` columns, and (3) a 7-agent launcher + persona generator. The implementation is generally careful — symlink-leftover handling correctly uses `fs.lstat`/`fs.unlink`, CSV writes use proper quoting via `escapeCsv`, CSV reads use `csv-parse/sync` with v1 backward-compat defaults, and the hardcoded `AGENT_SOURCES` array avoids path-traversal risks in the launcher generator.

No critical security vulnerabilities were found. Injection, eval, and hardcoded-secret scans are clean. Traversal risk is limited to a YAML-config-controlled `launcher_target_dir` (low, since that YAML ships with the tool).

The warnings cluster around partial completeness of the v2 `install_root` plumbing: the column is written to `files-manifest.csv` and read back, but only `.claude` is auto-detected on write and `install_root` is ignored on read when reconstructing absolute paths — a latent bug when launcher files get modified. A second notable issue is CRLF-handling in the persona-extraction regex (`_gomad` regressions waiting if a contributor edits `SKILL.md` on Windows), plus a pre-existing but now in-scope bug in `mergeModuleHelpCatalogs` where `agent-manifest.csv` is parsed with naive `split(',')` that breaks on embedded commas in `capabilities`/`role`/`principles` — and the real source manifests contain commas in these fields.

## Critical Issues

_None._

## Warnings

### WR-01: `install_root` from `files-manifest.csv` is never used to reconstruct absolute paths

**File:** `tools/installer/core/installer.js:685-694` (combined with `writeFilesManifest` schema in `tools/installer/core/manifest-generator.js:595`)
**Issue:** `readFilesManifest` reads `install_root` (with `_gomad` as v1 default, line 658), and `writeFilesManifest` emits it per-row. But `detectCustomFiles` builds `installedFilesMap` keyed by `path.join(gomadDir, fileEntry.path)` — always rooted at `gomadDir`, never under `<workspaceRoot>/.claude/`. Any v2 row with `install_root='.claude'` (launcher files in `commands/gm/agent-*.md`) will be mapped to a bogus absolute path (e.g. `_gomad/commands/gm/agent-pm.md`). Those rows therefore never match scanned files, so:
1. A modified launcher file is silently not detected as "modified" (no `.bak` preserved).
2. A launcher absent from the tree is silently not flagged as missing.

Because `scanDirectory` only walks `gomadDir`, the launchers are invisible to update-detection altogether. This is a latent correctness bug that will manifest as soon as users edit launchers and re-run install.

**Fix:**
```js
// installer.js readFilesManifest — resolve absolute paths based on install_root
async readFilesManifest(gomadDir) {
  // ... existing parsing ...
  const workspaceRoot = path.dirname(gomadDir);
  return records.map((r) => {
    const installRoot = r.install_root || '_gomad';
    const rootPath = installRoot === '_gomad' ? gomadDir : path.join(workspaceRoot, installRoot);
    return {
      type: r.type,
      name: r.name,
      module: r.module,
      path: r.path,
      hash: r.hash || null,
      schema_version: r.schema_version || null,
      install_root: installRoot,
      absolutePath: path.join(rootPath, r.path), // add this, use downstream
    };
  });
}

// installer.js detectCustomFiles — use absolutePath if present, else legacy join
for (const fileEntry of existingFilesManifest) {
  if (fileEntry.path) {
    const absolutePath = fileEntry.absolutePath || path.join(gomadDir, fileEntry.path);
    installedFilesMap.set(path.normalize(absolutePath), { ... });
  }
}
```
Also extend `scanDirectory` (or run a second scan) over any root referenced in the manifest, so edits under `.claude/commands/gm/` are actually observed.

---

### WR-02: `install_root` auto-detection in `writeFilesManifest` hard-codes `.claude` only

**File:** `tools/installer/core/manifest-generator.js:603-616`
**Issue:** The comment on lines 592-596 states that `install_root` will be set "explicitly to '.claude' / '.cursor' / etc. by the IDE-target row pushers", but the actual code only matches against `claudeRoot`. Every other IDE's launcher or tracked file will fall through to the `_gomad` default even though its `absFilePath` lives under `.cursor/`, `.opencode/`, etc. No IDE other than `claude-code` currently sets `launcher_target_dir`, so there is no visible breakage today — but this is a foot-gun: adding `launcher_target_dir: .cursor/commands/gm` to `platform-codes.yaml` will silently write those rows with `install_root='_gomad'` and break update-detection (see WR-01).

**Fix:**
```js
// manifest-generator.js writeFilesManifest — derive install_root from any known IDE root
const workspaceRoot = path.dirname(this.gomadDir);
const IDE_ROOTS = ['.claude', '.cursor', '.opencode', '.windsurf', '.kiro', '.qwen',
                   '.augment', '.agent', '.codebuddy', '.crush', '.gemini', '.github',
                   '.iflow', '.agents', '.kilocode', '.ona', '.pi', '.qoder', '.roo',
                   '.rovodev', '.trae'];
let installRoot = '_gomad';
let rootPath = this.gomadDir;
for (const candidate of IDE_ROOTS) {
  const candidatePath = path.join(workspaceRoot, candidate);
  if (absFilePath === candidatePath || absFilePath.startsWith(candidatePath + path.sep)) {
    installRoot = candidate;
    rootPath = candidatePath;
    break;
  }
}
```
A cleaner alternative: pass the list of IDE roots in `options` from `installer.js` (which has access to `config.ides` and the full `platform-codes.yaml` via `ideManager`) rather than hard-coding.

---

### WR-03: Persona extraction regex does not handle CRLF line endings

**File:** `tools/installer/ide/shared/agent-command-generator.js:85-86`
**Issue:** `body = rawSkillMd.replace(/^---\n[\s\S]*?\n---\n+/, '')` matches `\n` literally. A `SKILL.md` saved with CRLF (any Windows contributor editing via a non-LF-normalizing editor, or a git `core.autocrlf=true` checkout that got repacked) will not match — the regex fails silently and the entire frontmatter is kept at the top of the extracted persona file, which will then be re-emitted inside the outer frontmatter block the function writes on line 90. Result: malformed YAML in `_gomad/gomad/agents/<shortName>.md`.

Contrast with `manifest-generator.js:236` which does explicit normalization before matching frontmatter (`.replaceAll('\r\n', '\n').replaceAll('\r', '\n')`).

**Fix:**
```js
const rawSkillMd = await fs.readFile(skillMdPath, 'utf8');
// Normalize line endings before frontmatter strip (matches parseSkillMd behavior)
const normalized = rawSkillMd.replaceAll('\r\n', '\n').replaceAll('\r', '\n');
const body = normalized.replace(/^---\n[\s\S]*?\n---\n+/, '');
```

---

### WR-04: `mergeModuleHelpCatalogs` parses `agent-manifest.csv` with naive `split(',')` — breaks on embedded commas

**File:** `tools/installer/core/installer.js:893-917`
**Issue:** `agent-manifest.csv` is written via `escapeCsv` which correctly quotes fields containing commas. But the reader on lines 896-916 splits each line with `line.split(',')` and strips quotes via `replaceAll('"', '')`. The real source `skill-manifest.yaml` files (e.g. `src/gomad-skills/1-analysis/gm-agent-analyst/skill-manifest.yaml`) have fields like `capabilities: "market research, competitive analysis, requirements elicitation, domain expertise"` with 3 embedded commas. The naive split produces 15+ columns, pushes `icon`/`capabilities`/`role`/etc. out of position, and the downstream `cols[10]` (module) reads whatever happens to land there — almost certainly wrong for every gomad agent.

Symptom: `agentCommand` built on line 908 gets a garbage module segment; `agentInfo.set` keys the map under the wrong name; every row in `gomad-help.csv` produced for an agent-backed workflow ends up with blank `agent-command` / `agent-display-name` / `agent-title`.

This is pre-existing code, but Phase 6's persona extraction now guarantees these agents are always present in the manifest — so the bug is exercised by every fresh install.

**Fix:** Replace the hand-rolled parse with `csv-parse/sync` (already imported at the top of the file):
```js
if (await fs.pathExists(agentManifestPath)) {
  const content = await fs.readFile(agentManifestPath, 'utf8');
  const records = csv.parse(content, { columns: true, skip_empty_lines: true });
  for (const r of records) {
    const agentName = (r.name || '').trim();
    const module = (r.module || '').trim();
    const agentCommand = module ? `gomad:${module}:agent:${agentName}` : `gomad:agent:${agentName}`;
    agentInfo.set(agentName, {
      command: agentCommand,
      displayName: (r.displayName || agentName).trim(),
      title: (r.icon && r.title) ? `${r.icon} ${r.title}` : (r.title || agentName).trim(),
    });
  }
}
```

---

### WR-05: Launcher/persona generators silently stringify `undefined` when manifest fields are missing

**File:** `tools/installer/ide/shared/agent-command-generator.js:105-115` and `127-146`
**Issue:** `generateLauncherContent` calls `template.replaceAll('{{displayName}}', agent.displayName)` with no pre-validation. If the source `skill-manifest.yaml` is missing `displayName`, `title`, `icon`, or `capabilities` (all required per the live examples), JS coerces `undefined` → the literal string `"undefined"` in the rendered launcher. The same applies to `writeAgentLaunchers` (line 139-146) where `manifest.displayName` / `.title` / `.icon` / `.capabilities` flow through unchecked.

Also `extractPersonas` on line 83 calls `yaml.parse` without confirming the result is an object, so a `null` or non-object manifest would produce `yaml.stringify(null)` → `"null\n"` frontmatter, resulting in malformed output.

**Fix:**
```js
async generateLauncherContent(agent) {
  const required = ['shortName', 'displayName', 'title', 'icon', 'capabilities', 'purpose'];
  for (const key of required) {
    if (typeof agent[key] !== 'string' || !agent[key]) {
      throw new Error(`generateLauncherContent: missing or non-string "${key}" for agent ${agent.shortName || '<unknown>'}`);
    }
  }
  // ... existing replacement logic ...
}

// extractPersonas / writeAgentLaunchers — after yaml.parse:
const manifest = yaml.parse(await fs.readFile(manifestPath, 'utf8'));
if (!manifest || typeof manifest !== 'object') {
  throw new Error(`skill-manifest.yaml at ${manifestPath} did not parse to an object`);
}
for (const key of ['displayName', 'title', 'icon', 'capabilities']) {
  if (typeof manifest[key] !== 'string' || !manifest[key]) {
    throw new Error(`skill-manifest.yaml at ${manifestPath} is missing required field "${key}"`);
  }
}
```
Fail-fast here is consistent with the existing `throw new Error` pattern on missing `skill-manifest.yaml` / `SKILL.md` files (lines 76-81).

---

## Info

### IN-01: `fs.copy` does not set `dereference: true` for verbatim skill install

**File:** `tools/installer/ide/_config-driven.js:211`
**Issue:** `await fs.copy(sourceDir, skillDir)` uses fs-extra's default `dereference: false`. If a contributor ever introduces a symlink inside `src/gomad-skills/.../` (or a module source tree), it'll be copied to the target as a symlink, re-introducing exactly the symlink pollution class this phase is trying to eliminate.
**Fix:** Add `{ dereference: true }` to the copy call to guarantee real files in the target:
```js
await fs.copy(sourceDir, skillDir, { dereference: true });
```

---

### IN-02: `removeLegacyAgentSkillDirs` hardcodes `.claude/skills` path

**File:** `tools/installer/ide/shared/agent-command-generator.js:164-175`
**Issue:** The function runs for any IDE with `launcher_target_dir` (see `_config-driven.js:127-135`) but always removes `<workspaceRoot>/.claude/skills/gm-agent-*`. Currently only `claude-code` has `launcher_target_dir` set, so this is correct in practice — but it couples the cleanup target to claude-code while living in a shared module.
**Fix:** Either scope the call by IDE name in `_config-driven.js`, or pass the legacy base path as a parameter derived from the IDE's `target_dir`.

---

### IN-03: `manifest-generator.js` assumes `this.gomadDir` is absolute

**File:** `tools/installer/core/manifest-generator.js:605`
**Issue:** `workspaceRoot = path.dirname(this.gomadDir)`. If a caller ever passes a relative `gomadDir`, `workspaceRoot` becomes `.`, `claudeRoot` becomes `.claude`, and the `startsWith` comparison against absolute `absFilePath` never matches. Current callers in `installer.js` pass an absolute path via `InstallPaths`, so this is latent.
**Fix:** Defensive `path.resolve(this.gomadDir)` at entry of `generateManifests`, or assert it is absolute.

---

### IN-04: Second manifest-refresh pass in `installer.js` has slightly different `preservedModules` derivation

**File:** `tools/installer/core/installer.js:76-87`
**Issue:** The Phase 6 second-pass `generateManifests` call passes `allModulesForManifest` as `preservedModules` directly, whereas the first pass (lines 303-319) computes a separate `modulesForCsvPreserve`. For `isQuickUpdate()` and the `_preserveModules` branch the expressions converge, but the two code blocks duplicate the module-list logic — any future change to one must be mirrored to the other or the second manifest will omit modules the first pass kept.
**Fix:** Extract the `allModulesForManifest` / `modulesForCsvPreserve` computation into a single helper and call it from both sites.

---

### IN-05: "Atomic" legacy-dir removal comment is slightly misleading

**File:** `tools/installer/ide/_config-driven.js:122-132` and `tools/installer/ide/shared/agent-command-generator.js:157-175`
**Issue:** The D-29 comment says "remove legacy v1.1 ... atomically (no overlap window)". In the sequential implementation, if `writeAgentLaunchers` throws after `removeLegacyAgentSkillDirs` succeeded, the system is left with neither the old skills nor the new launchers — a half-applied state. "No overlap window" is accurate; "atomic" is not, since there is no rollback.
**Fix:** Either (a) reword the comment to say "no overlap window" only, or (b) write launchers to a temp dir, remove legacy dirs, then `fs.move` the temp dir into place so a write failure leaves the legacy dirs intact.

---

### IN-06: Template uses `replaceAll` with zero-arg validation

**File:** `tools/installer/ide/shared/agent-command-generator.js:109-115`
**Issue:** `template.replaceAll('{{shortName}}', agent.shortName)` works only because `shortName` comes from the static `AGENT_SOURCES` list. But if any value contains a `$` dollar sign (unlikely but possible in `displayName` / `title` / `capabilities` in future manifests), JavaScript's `String.prototype.replaceAll` with a string pattern treats the replacement as a literal string (no `$&` substitution) — so this is actually safe today. Mentioned as info to document the assumption; no action needed unless the template generator is migrated to `String.prototype.replace` with a regex pattern, in which case `$` would need escaping.

---

_Reviewed: 2026-04-18T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
