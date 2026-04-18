# Phase 6: Installer Mechanics — Copy + Manifest + Stub Generation — Pattern Map

**Mapped:** 2026-04-18
**Files analyzed:** 8 (5 modify + 1 new body-template shape + 2 generated-at-install artifact families)
**Analogs found:** 8 / 8 (100% — Phase 6 is a refit, not a greenfield)

---

## File Classification

| File (to create/modify) | Role | Data Flow | Closest Analog | Match Quality |
|-------------------------|------|-----------|----------------|---------------|
| `tools/installer/ide/_config-driven.js` (line 171; +launcher-generator block) | installer orchestrator | event-driven (per-record loop → fs write) | same file (in-place edit) | self-analog (exact) |
| `tools/installer/ide/shared/agent-command-generator.js` (revive + extend) | artifact generator class | transform (yaml+md → md) | same file (in-place edit, template pathway already present) | self-analog (exact) |
| `tools/installer/ide/templates/agent-command-template.md` (extend body per D-16) | md template (frontmatter + prose) | file-IO (template-render) | same file + `.claude/commands/gsd/plan-phase.md` for fenced-yaml-in-body shape | self-analog + structural sibling |
| `tools/installer/ide/platform-codes.yaml` (+`launcher_target_dir`) | static config | declarative YAML | same file (`claude-code.installer` block) | self-analog (exact) |
| `tools/installer/core/installer.js` §`readFilesManifest` (lines 597–651; csv-parse reader) | manifest reader | CSV parse → in-memory records | `_config-driven.js:installVerbatimSkills` lines 143–147; `manifest-generator.js:writeAgentManifest` lines 504–511 | role+data-flow exact |
| `tools/installer/core/manifest-generator.js` §`writeFilesManifest` (lines 584–647; +2 columns, forward-slash, csv-parse-aligned writer) | manifest writer | CSV stringify ← in-memory records | `writeAgentManifest` lines 497–564 (same file) — uses `escapeCsv` helper + explicit header string | role+data-flow exact |
| **New** `_gomad/gomad/agents/<name>.md` (7 extracted files, install-time) | persona doc (full YAML frontmatter + prose body) | file-IO (YAML-serialize + body-copy) | `src/gomad-skills/*/gm-agent-*/SKILL.md` (source) + `src/gomad-skills/*/gm-agent-*/skill-manifest.yaml` (source-of-truth frontmatter) | structural composite |
| **New generated** `.claude/commands/gm/agent-<name>.md` (7 launchers, install-time) | slash-command launcher (frontmatter + fenced YAML + prose) | file-IO (template-render) | `.claude/commands/gsd/plan-phase.md` (structural sibling for shape); `test/test-gm-command-surface.js` fixture (lines 117–126, 133–158) for frontmatter contract | structural sibling (role+data-flow exact) |

---

## Pattern Assignments

### 1. `tools/installer/ide/_config-driven.js` (modify — line 171 copy switch + launcher-generator invocation)

**Analog:** same file (self-analog). The per-record install loop at **lines 149–189** is already the right shape — swap the one `fs.ensureSymlink` call + add the `fs.lstat` pre-check and the post-loop launcher block.

**Imports already in place** (lines 1–7) — no new imports needed for the copy swap:
```javascript
const os = require('node:os');
const path = require('node:path');
const fs = require('fs-extra');
const yaml = require('yaml');
const prompts = require('../prompts');
const csv = require('csv-parse/sync');
const { GOMAD_FOLDER_NAME } = require('./shared/path-utils');
```
Phase 6 will additionally require:
```javascript
const { AgentCommandGenerator } = require('./shared/agent-command-generator');
```

**Existing copy-site shape to patch** (lines 149–173 — the INNER loop body is the change point; `fs.ensureSymlink` → `fs.copy` + `fs.lstat`/`fs.unlink` pre-check):
```javascript
for (const record of records) {
  const canonicalId = record.canonicalId;
  if (!canonicalId) continue;

  const relativePath = record.path.startsWith(gomadPrefix) ? record.path.slice(gomadPrefix.length) : record.path;
  const sourceFile = path.join(gomadDir, relativePath);
  const sourceDir = path.dirname(sourceFile);

  if (!(await fs.pathExists(sourceDir))) continue;

  // Symlink target to source for single source of truth
  const skillDir = path.join(targetPath, canonicalId);
  await fs.remove(skillDir);
  this.skillWriteTracker?.add(canonicalId);

  // Create relative symlink: .claude/skills/{id} → ../../_gomad/{module}/{path}
  const relTarget = path.relative(targetPath, sourceDir);
  await fs.ensureSymlink(relTarget, skillDir);      // ← Phase 6 replaces this
  count++;
}
```

**Pre-existing prompts.log.info/warn usage pattern** — follow this shape for the D-20 "upgrading from symlink" log (line 271 already uses this):
```javascript
await prompts.log.warn(`Found ${gomadFiles.length} stale GOMAD file(s) in ${expanded}. Remove manually: rm ${expanded}/gomad-*`);
```

**Launcher-generator invocation (new block, data-driven per D-31)** — wire AFTER the skill install loop inside `installToTarget` (around line 122, before `printSummary`). Read `launcher_target_dir` from `config` (already the platform `installer` sub-object passed at line 111 destructure):
```javascript
// Pattern shape for the new block (not a direct excerpt — author in plan):
if (config.launcher_target_dir) {
  const generator = new AgentCommandGenerator(this.gomadFolderName);
  // 1. Extract personas from gomad-skills into _gomad/gomad/agents/*.md
  await generator.extractPersonas(sourceTreeRoot, gomadDir);
  // 2. Write launchers to .claude/commands/gm/
  const launcherDir = path.join(projectDir, config.launcher_target_dir);
  const artifacts = await generator.collectAgentArtifacts(gomadDir, [/* modules */]);
  await generator.writeAgentLaunchers(launcherDir, artifacts.artifacts);
}
```

**Notes / deltas:**
- `fs.lstat` is available on `fs-extra` (re-exports `node:fs`). D-22 gates it behind `files-manifest.csv` presence — check exists BEFORE the `for` loop opens.
- The existing `await fs.remove(skillDir)` at line 166 already handles the "regular file" case per D-21 (always overwrite). Keep the existing shape; only the symlink branch is new.
- Source-tree resolution for the extractor: use `getSourcePath('gomad-skills')` from `project-root.js`; this already handles both `npx gomad install` (from node_modules) and local-dev (from repo) per the existing pattern used at `manifest-generator.js:6`.

---

### 2. `tools/installer/ide/shared/agent-command-generator.js` (revive + extend)

**Analog:** same file (the class already exists with the right shape — `collectAgentArtifacts`, `generateLauncherContent`, `writeAgentLaunchers`). Phase 6 adds one method (`extractPersonas`) and revises one (`writeAgentLaunchers` — use `launcher_target_dir` directly, rename files to `agent-<name>.md`).

**Imports (already correct for CommonJS)** — lines 1–3:
```javascript
const path = require('node:path');
const fs = require('fs-extra');
const { toColonPath, toDashPath, customAgentColonName, customAgentDashName, GOMAD_FOLDER_NAME } = require('./path-utils');
```
Phase 6 adds:
```javascript
const yaml = require('yaml');  // for skill-manifest.yaml parsing + frontmatter emission
const { loadSkillManifest } = require('./skill-manifest');  // already used by artifacts.js
```

**Existing constructor pattern** (lines 9–12) — Phase 6 keeps this:
```javascript
constructor(gomadFolderName = GOMAD_FOLDER_NAME) {
  this.templatePath = path.join(__dirname, '../templates/agent-command-template.md');
  this.gomadFolderName = gomadFolderName;
}
```

**Existing `generateLauncherContent` pattern** (lines 70–84) — template-literal replacement; Phase 6 extends this to inject the fenced YAML metadata block per D-16:
```javascript
async generateLauncherContent(agent) {
  const template = await fs.readFile(this.templatePath, 'utf8');
  return template
    .replaceAll('{{name}}', agent.name)
    .replaceAll('{{module}}', agent.module)
    .replaceAll('{{path}}', agentPathInModule)
    .replaceAll('{{description}}', agent.description || `${agent.name} agent`)
    .replaceAll('_gomad', this.gomadFolderName);
}
```

**Existing `writeAgentLaunchers` pattern** (lines 92–107) — Phase 6 retargets via the passed `launcher_target_dir`:
```javascript
async writeAgentLaunchers(baseCommandsDir, artifacts) {
  let writtenCount = 0;
  for (const artifact of artifacts) {
    if (artifact.type === 'agent-launcher') {
      const moduleAgentsDir = path.join(baseCommandsDir, artifact.module, 'agents');  // ← Phase 6 flattens this
      await fs.ensureDir(moduleAgentsDir);
      const launcherPath = path.join(moduleAgentsDir, `${artifact.name}.md`);  // ← Phase 6: `agent-${shortName}.md` directly under baseCommandsDir
      await fs.writeFile(launcherPath, artifact.content);
      writtenCount++;
    }
  }
  return writtenCount;
}
```

**Extractor shape (new method) — derive from `loadSkillManifest` call pattern in `artifacts.js:65`**:
```javascript
// From shared/artifacts.js:65 — analog for how to load skill-manifest.yaml next to a SKILL.md
const skillManifest = await loadSkillManifest(agentDirPath);
```

**Frontmatter-strip pattern to apply** — the SKILL.md frontmatter block to strip is exactly the shape at `src/gomad-skills/*/gm-agent-*/SKILL.md` lines 1–4:
```
---
name: gm-agent-<kind>
description: <one-line description>
---

# <Persona name>
...body...
```
Regex `/^---\n[\s\S]*?\n---\n/` removes it; the remaining body copies verbatim per D-14.

**Notes / deltas:**
- Short-name derivation: strip `gm-agent-` prefix → `analyst`, `tech-writer`, `pm`, `ux-designer`, `architect`, `sm`, `dev`.
- Launcher filename: `agent-<shortName>.md` placed directly in `launcher_target_dir` (NOT under `<module>/agents/` — D-28 splits the namespace to `.claude/commands/gm/`).
- Launcher frontmatter `name:` field must be `gm:agent-<shortName>` (colon form) — this is what `test/test-gm-command-surface.js:93` asserts.
- The existing `writeColonArtifacts` and `writeDashArtifacts` methods (lines 117–159) are legacy and can stay as dead code (Claude's Discretion per deferred ideas).
- The `agent.relativePath` / `agent.path` plumbing from `getAgentsFromBmad` is obsolete for the 7 gm-agent personas — Phase 6's extractor reads directly from `src/gomad-skills/*/gm-agent-*/` and synthesizes the `artifact` objects itself.

---

### 3. `tools/installer/ide/templates/agent-command-template.md` (extend body per D-16)

**Analog:** same file (existing 15-line template) + `.claude/commands/gsd/plan-phase.md` for the structural siblinghood of frontmatter-then-fenced-block-then-prose.

**Existing template shape** (all 15 lines — to EXTEND, not replace):
```markdown
---
name: '{{name}}'
description: '{{description}}'
---

You must fully embody this agent's persona and follow all activation instructions exactly as specified. NEVER break character until given an exit command.

<agent-activation CRITICAL="TRUE">
1. LOAD the FULL agent file from {project-root}/_gomad/{{module}}/agents/{{path}}
2. READ its entire contents - this contains the complete agent persona, menu, and instructions
3. Execute ALL activation steps exactly as written in the agent file
4. Follow the agent's persona and menu system precisely
5. Stay in character throughout the session
</agent-activation>
```

**Phase-6 extension shape (D-16 — fenced YAML metadata block then prose activation)** — insert between line 4 (`---` close of frontmatter) and line 6 (existing `You must fully embody...`):
```markdown
---
name: 'gm:agent-{{shortName}}'
description: '{{title}} ({{displayName}}). {{purpose}}'
---

\`\`\`yaml
displayName: {{displayName}}
title: {{title}}
icon: {{icon}}
capabilities: {{capabilities}}
\`\`\`

You must fully embody this agent's persona and follow all activation instructions exactly as specified. NEVER break character until given an exit command.

<agent-activation CRITICAL="TRUE">
1. LOAD the FULL agent file from {project-root}/_gomad/gomad/agents/{{shortName}}.md
2. READ its entire contents - this contains the complete agent persona, menu, and instructions
3. Execute ALL activation steps exactly as written in the agent file
4. Follow the agent's persona and menu system precisely
5. Stay in character throughout the session
</agent-activation>
```

**Structural sibling — `.claude/commands/gsd/plan-phase.md`** — confirms frontmatter + multi-line YAML list fields + prose body is a valid Claude-Code slash-command shape:
```markdown
---
name: gsd:plan-phase
description: Create detailed phase plan (PLAN.md) with verification loop
argument-hint: "[phase] [--auto] ..."
agent: gsd-planner
allowed-tools:
  - Read
  - Write
  ...
---
<objective>
...
</objective>
```

**Notes / deltas:**
- D-17 specifies the description format: `"<Title> (<displayName>). <one-line purpose>"` — e.g. `"Business Analyst (Mary). Market research, competitive analysis, requirements elicitation."`
- All metadata (`displayName`, `title`, `icon`, `capabilities`) is derived from `skill-manifest.yaml` at generation time per D-18 — the template keeps `{{placeholders}}` and the generator substitutes from the loaded YAML.
- Body directive now points at `_gomad/gomad/agents/{{shortName}}.md` (extracted persona file from D-14), NOT the old `_gomad/{{module}}/agents/{{path}}`.
- The `'{{name}}'` and `'{{description}}'` single-quote wrapping in the existing template preserves YAML-safe rendering when the replacement value contains `:` (like the colon in `gm:agent-pm`).

---

### 4. `tools/installer/ide/platform-codes.yaml` (+`launcher_target_dir` under `claude-code.installer`)

**Analog:** same file — every other platform has an `installer:` sub-block already. Phase 6 adds one new field to the `claude-code` entry only.

**Existing `claude-code` block** (lines 29–35):
```yaml
  claude-code:
    name: "Claude Code"
    preferred: true
    installer:
      legacy_targets:
        - .claude/commands
      target_dir: .claude/skills
```

**Phase-6 shape (add ONE line per D-31)**:
```yaml
  claude-code:
    name: "Claude Code"
    preferred: true
    installer:
      legacy_targets:
        - .claude/commands
      target_dir: .claude/skills
      launcher_target_dir: .claude/commands/gm   # ← NEW (D-31)
```

**Notes / deltas:**
- Field is opt-in — absence in other platforms means `AgentCommandGenerator` is NOT invoked for those IDEs (per D-30).
- Keep 2-space indent + consistent with sibling blocks. No schema migration needed — YAML tolerant of unknown keys.

---

### 5. `tools/installer/core/installer.js` §`readFilesManifest` (lines 597–651; csv-parse reader)

**Analog (same repo, same pattern):** `tools/installer/ide/_config-driven.js:143–147` + `tools/installer/core/manifest-generator.js:504–511` (both already use `csv.parse({columns:true, skip_empty_lines:true})`).

**Analog excerpt — `_config-driven.js:143–147`** (the canonical `csv-parse/sync` read idiom used elsewhere in this repo):
```javascript
const csvContent = await fs.readFile(csvPath, 'utf8');
const records = csv.parse(csvContent, {
  columns: true,
  skip_empty_lines: true,
});
```

**Analog excerpt — `manifest-generator.js:503–511`** (read-modify-preserve-entries pattern — similar to what readFilesManifest does):
```javascript
if (await fs.pathExists(csvPath)) {
  const content = await fs.readFile(csvPath, 'utf8');
  const records = csv.parse(content, {
    columns: true,
    skip_empty_lines: true,
  });
  for (const record of records) {
    existingEntries.set(`${record.module}:${record.name}`, record);
  }
}
```

**Existing hand-rolled parser to REPLACE — `installer.js:608–651`**:
```javascript
try {
  const content = await fs.readFile(filesManifestPath, 'utf8');
  const lines = content.split('\n');
  const files = [];

  for (let i = 1; i < lines.length; i++) {
    // Skip header
    const line = lines[i].trim();
    if (!line) continue;

    // Parse CSV line properly handling quoted values
    const parts = [];
    let current = '';
    let inQuotes = false;

    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        parts.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    parts.push(current); // Add last part

    if (parts.length >= 4) {
      files.push({
        type: parts[0],
        name: parts[1],
        module: parts[2],
        path: parts[3],
        hash: parts[4] || null, // Hash may not exist in old manifests
      });
    }
  }

  return files;
} catch (error) {
  await prompts.log.warn('Could not read files-manifest.csv: ' + error.message);
  return [];
}
```

**Phase-6 shape (apply analog)** — replace lines 608–646 with:
```javascript
try {
  const content = await fs.readFile(filesManifestPath, 'utf8');
  const records = csv.parse(content, {
    columns: true,
    skip_empty_lines: true,
  });
  return records.map((r) => ({
    type: r.type,
    name: r.name,
    module: r.module,
    path: r.path,
    hash: r.hash || null,
    schema_version: r.schema_version || null,  // v1 rows → null (treated as implicit v1 per D-23)
    install_root: r.install_root || '_gomad',  // default per D-25
  }));
} catch (error) {
  await prompts.log.warn('Could not read files-manifest.csv: ' + error.message);
  return [];
}
```

**New import needed at top of installer.js** — check current imports:
```javascript
// Existing at manifest-generator.js:5 — same idiom
const csv = require('csv-parse/sync');
```

**Notes / deltas:**
- `columns: true` makes records property-keyed (no array-index fragility); eliminates the `parts.length >= 4` guard entirely.
- v1 manifests with only 5 columns (`type,name,module,path,hash`) parse cleanly — new v2 columns resolve to `undefined` and are defaulted above per D-23/D-25.
- Error envelope preserved — same `try/catch` + `prompts.log.warn` shape.

---

### 6. `tools/installer/core/manifest-generator.js` §`writeFilesManifest` (lines 584–647; +2 cols + forward-slash + csv-parse-aligned writer)

**Analog (same file, same role):** `writeAgentManifest` at lines 497–564 — already uses an `escapeCsv` helper, explicit column-order header, and a row-join pattern. Phase 6 applies the exact same shape to `writeFilesManifest`.

**Analog excerpt — `writeAgentManifest:497–564`** (canonical CSV-write pattern for this repo):
```javascript
async writeAgentManifest(cfgDir) {
  const csvPath = path.join(cfgDir, 'agent-manifest.csv');
  const escapeCsv = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;

  // ... read-existing-preserve logic ...

  // Create CSV header with persona fields and canonicalId
  let csvContent = 'name,displayName,title,icon,capabilities,role,identity,communicationStyle,principles,module,path,canonicalId\n';

  // ... build allAgents Map ...

  // Write all agents
  for (const [, record] of allAgents) {
    const row = [
      escapeCsv(record.name),
      escapeCsv(record.displayName),
      escapeCsv(record.title),
      // ... more columns ...
      escapeCsv(record.canonicalId),
    ].join(',');
    csvContent += row + '\n';
  }

  await fs.writeFile(csvPath, csvContent);
  return csvPath;
}
```

**Existing `writeFilesManifest` to EXTEND — lines 587–647**:
```javascript
async writeFilesManifest(cfgDir) {
  const csvPath = path.join(cfgDir, 'files-manifest.csv');

  // Create CSV header with hash column
  let csv = 'type,name,module,path,hash\n';  // ← Phase 6: add schema_version,install_root

  const allFiles = [];
  if (this.allInstalledFiles && this.allInstalledFiles.length > 0) {
    for (const filePath of this.allInstalledFiles) {
      // Store paths relative to gomadDir (no folder prefix)
      const relativePath = filePath.replace(this.gomadDir, '').replaceAll('\\', '/').replace(/^\//, '');
      // ↑ ALREADY forward-slash normalized — D-26 pattern is already in place here
      const ext = path.extname(filePath).toLowerCase();
      const fileName = path.basename(filePath, ext);

      const pathParts = relativePath.split('/');
      const module = pathParts.length > 0 ? pathParts[0] : 'unknown';

      const hash = await this.calculateFileHash(filePath);

      allFiles.push({
        type: ext.slice(1) || 'file',
        name: fileName,
        module: module,
        path: relativePath,
        hash: hash,
      });
    }
  } else {
    for (const file of this.files) {
      const relPath = file.path.replace(this.gomadFolderName + '/', '');
      const filePath = path.join(this.gomadDir, relPath);
      const hash = await this.calculateFileHash(filePath);
      allFiles.push({ ...file, path: relPath, hash: hash });
    }
  }

  allFiles.sort((a, b) => {
    if (a.module !== b.module) return a.module.localeCompare(b.module);
    if (a.type !== b.type) return a.type.localeCompare(b.type);
    return a.name.localeCompare(b.name);
  });

  // ✗ Existing row shape (no escape helper, no v2 columns):
  for (const file of allFiles) {
    csv += `"${file.type}","${file.name}","${file.module}","${file.path}","${file.hash}"\n`;
  }

  await fs.writeFile(csvPath, csv);
  return csvPath;
}
```

**Phase-6 shape — align with `writeAgentManifest` escapeCsv idiom + add v2 columns (D-23/D-25/D-26/D-27)**:
```javascript
async writeFilesManifest(cfgDir) {
  const csvPath = path.join(cfgDir, 'files-manifest.csv');
  const escapeCsv = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;  // ← reuse idiom

  // Phase-6 v2 header (D-23/D-25)
  let csvContent = 'type,name,module,path,hash,schema_version,install_root\n';

  const allFiles = [];
  // ... existing allInstalledFiles loop, with one new field on each push ...
  allFiles.push({
    type: ext.slice(1) || 'file',
    name: fileName,
    module: module,
    path: relativePath.replaceAll('\\', '/'),  // ← D-26 redundant-safe normalization
    hash: hash,
    schema_version: '2.0',                      // ← D-24
    install_root: '_gomad',                     // ← D-25 default
  });
  // For IDE-target rows (new per Phase 6 — .claude/commands/gm/agent-*.md):
  //   install_root: '.claude', path: 'commands/gm/agent-<name>.md'

  // ... existing sort ...

  for (const file of allFiles) {
    const row = [
      escapeCsv(file.type),
      escapeCsv(file.name),
      escapeCsv(file.module),
      escapeCsv(file.path),
      escapeCsv(file.hash),
      escapeCsv(file.schema_version),
      escapeCsv(file.install_root),
    ].join(',');
    csvContent += row + '\n';
  }

  await fs.writeFile(csvPath, csvContent);
  return csvPath;
}
```

**Notes / deltas:**
- The `.replaceAll('\\', '/')` at line 599 is ALREADY forward-slash-normalized — D-26 is half-done; just make the normalization explicit on new rows.
- D-27's "`csv-parse/sync` for both read AND write" is literal only for read; `csv-parse` has no stringify — the alignment in practice is the shared `escapeCsv` helper + `columns:true` reader shape (i.e., the reader can consume what this writer emits). If the planner wants strict symmetry, pull `csv-stringify/sync` (sibling package) — note this would be a new runtime dep; prefer keeping `escapeCsv` consistent with `writeAgentManifest` and avoiding new deps per "zero new runtime deps" constraint (CONTEXT.md §specifics).
- New IDE-target rows (launcher files, extracted persona files) must be tracked in `this.allInstalledFiles` by the installer BEFORE `writeFilesManifest` runs — requires plumbing in `_config-driven.js` to push into `installedFiles` (mirror the pattern at `installer.js:555 / 584 / 859 / 1040`).
- `calculateFileHash` at lines 575–582 (`sha256`) works for any absolute path — extend to hash the IDE-target files too.

---

### 7. **New** `_gomad/gomad/agents/<name>.md` (7 files — install-time, not in repo)

**Analog (source composite):**
- Frontmatter shape: `src/gomad-skills/*/gm-agent-*/skill-manifest.yaml` (full YAML — mirrored verbatim per D-15)
- Body shape: `src/gomad-skills/*/gm-agent-*/SKILL.md` with lines 1–4 stripped (D-14)

**Source-of-truth excerpt — `skill-manifest.yaml` (gm-agent-analyst)**:
```yaml
type: agent
name: gm-agent-analyst
displayName: Mary
title: Business Analyst
icon: "📊"
capabilities: "market research, competitive analysis, requirements elicitation, domain expertise"
role: Strategic Business Analyst + Requirements Expert
identity: "Senior analyst with deep expertise..."
communicationStyle: "Speaks with the excitement of a treasure hunter..."
principles: "Channel expert business analysis frameworks..."
module: gomad
```

**Source-of-truth excerpt — `SKILL.md` first 4 lines to STRIP**:
```markdown
---
name: gm-agent-analyst
description: Strategic business analyst and requirements expert. Use when the user asks to talk to Mary or requests the business analyst.
---
```

**Phase-6 extracted-file shape (D-14 + D-15)** — emit at `_gomad/gomad/agents/analyst.md`:
```markdown
---
type: agent
name: gm-agent-analyst
displayName: Mary
title: Business Analyst
icon: "📊"
capabilities: "market research, competitive analysis, requirements elicitation, domain expertise"
role: Strategic Business Analyst + Requirements Expert
identity: "Senior analyst with deep expertise..."
communicationStyle: "Speaks with the excitement of a treasure hunter..."
principles: "Channel expert business analysis frameworks..."
module: gomad
---

# Mary

## Overview

This skill provides a Strategic Business Analyst...
...
[entire SKILL.md body verbatim, lines 5 onward]
```

**Serialization helper to use** — the `yaml.stringify` pattern from `manifest-generator.js:455`:
```javascript
const yamlStr = yaml.stringify(cleanManifest, { /* options */ });
```

**Notes / deltas:**
- Filename `analyst.md` not `gm-agent-analyst.md` — strip the `gm-agent-` prefix per D-31/D-28 naming semantics (launcher filename `agent-analyst.md` pairs with persona file `analyst.md`).
- Frontmatter fence delimiters are the 3-dash YAML convention; `yaml.stringify` emits without the fence so the generator wraps it: `` `---\n${yaml.stringify(manifest)}---\n\n${body}` ``.
- Body is the raw `SKILL.md` with `/^---\n[\s\S]*?\n---\n+/` stripped once (D-14).
- The file is tracked in `installedFiles` so it lands in the Phase-6-v2 manifest with `install_root: '_gomad'` and `path: 'gomad/agents/analyst.md'`.

---

### 8. **New generated** `.claude/commands/gm/agent-<name>.md` (7 launchers — install-time)

**Analog (structural sibling for shape):** `.claude/commands/gsd/plan-phase.md` + `.claude/commands/gsd/discuss-phase.md` — prove that `.claude/commands/<namespace>/<file>.md` with frontmatter `name: <namespace>:<file>` is the resolver pattern (confirmed empirically in Phase 5 per 05-VERIFICATION.md).

**Contract-source excerpt — `test/test-gm-command-surface.js:117–126`** (the good/bad fixture that defines the passing shape):
```javascript
// Good fixture — SHOULD pass the structural check
fs.writeFileSync(
  path.join(negGmDir, 'agent-pm.md'),
  ['---', 'name: gm:agent-pm', 'description: "Project manager persona launcher."', '---', '', 'Body.', ''].join('\n'),
);

// Bad fixture — structural check MUST detect name mismatch
fs.writeFileSync(
  path.join(negGmDir, 'agent-broken.md'),
  ['---', 'name: wrong:name', 'description: "Broken."', '---', '', 'Body.', ''].join('\n'),
);
```

**Contract-assertion excerpt — `test-gm-command-surface.js:91–97`** (what the test demands — the frontmatter contract):
```javascript
const agentName = path.basename(file, '.md').replace(/^agent-/, '');
assert(
  fm && fm.name === `gm:agent-${agentName}`,
  `(A) ${file} frontmatter name matches gm:agent-${agentName}`,
  `Got: ${fm ? fm.name : '<no name>'}`,
);
assert(fm && typeof fm.description === 'string' && fm.description.length > 0, `(A) ${file} has non-empty description`);
```

**Phase-6 launcher shape (per D-16/D-17; rendered from `agent-command-template.md`)** — example for `agent-analyst.md`:
```markdown
---
name: 'gm:agent-analyst'
description: 'Business Analyst (Mary). Market research, competitive analysis, requirements elicitation, domain expertise.'
---

\`\`\`yaml
displayName: Mary
title: Business Analyst
icon: "📊"
capabilities: "market research, competitive analysis, requirements elicitation, domain expertise"
\`\`\`

You must fully embody this agent's persona and follow all activation instructions exactly as specified. NEVER break character until given an exit command.

<agent-activation CRITICAL="TRUE">
1. LOAD the FULL agent file from {project-root}/_gomad/gomad/agents/analyst.md
2. READ its entire contents - this contains the complete agent persona, menu, and instructions
3. Execute ALL activation steps exactly as written in the agent file
4. Follow the agent's persona and menu system precisely
5. Stay in character throughout the session
</agent-activation>
```

**Notes / deltas:**
- 7 agents × filename mapping: `agent-analyst.md`, `agent-tech-writer.md`, `agent-pm.md`, `agent-ux-designer.md`, `agent-architect.md`, `agent-sm.md`, `agent-dev.md`.
- D-18: all 4 metadata fields inside the fenced `yaml` block derive from `skill-manifest.yaml` at generation time — do NOT quote from the extracted persona file.
- Fenced block is a literal markdown code fence (```` ```yaml ... ``` ````), not the frontmatter fence — Claude-Code treats it as prose, but it documents persona metadata for the runtime activation step.
- Tracked in v2 manifest as: `type:md, name:agent-analyst, module:gomad, path:commands/gm/agent-analyst.md, hash:<sha256>, schema_version:2.0, install_root:.claude`.

---

## Shared Patterns

### CSV escape helper (read & write alignment)

**Source:** `tools/installer/core/manifest-generator.js:499` (`writeAgentManifest`)
**Apply to:** `writeFilesManifest` (Phase 6)

```javascript
const escapeCsv = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
```

Used everywhere a CSV cell is emitted. Pairs symmetrically with `csv.parse(content, {columns:true, skip_empty_lines:true})` on the read side.

### csv-parse/sync read idiom

**Source:** `tools/installer/ide/_config-driven.js:143–147` and `tools/installer/core/manifest-generator.js:503–511`
**Apply to:** `installer.js:readFilesManifest` (Phase 6 replaces hand-rolled parser)

```javascript
const content = await fs.readFile(csvPath, 'utf8');
const records = csv.parse(content, {
  columns: true,
  skip_empty_lines: true,
});
for (const record of records) {
  // record.type, record.name, record.module, record.path, record.hash, record.schema_version, record.install_root
}
```

### fs-extra idiom for existence + remove + write

**Source:** `_config-driven.js:164–171, 208–289, 444`
**Apply to:** extractor (`_gomad/gomad/agents/*.md`), launcher-generator (`.claude/commands/gm/agent-*.md`), copy-switch site (line 171).

```javascript
await fs.ensureDir(path.dirname(targetPath));
if (await fs.pathExists(targetPath)) {
  const stat = await fs.lstat(targetPath);
  if (stat.isSymbolicLink()) {
    await prompts.log.warn(`upgrading from symlink: ${targetPath}`);
    await fs.unlink(targetPath);
  }
  // regular-file overwrite via fs.copy / fs.writeFile is idempotent — no pre-remove needed
}
await fs.copy(source, targetPath);  // or fs.writeFile(targetPath, content)
```

### Logging via `prompts.log`

**Source:** `_config-driven.js:86, 200–205, 271, 321, 369, 404`
**Apply to:** every new log line (D-20 "upgrading from symlink", Phase 6 extractor/launcher progress).

Levels: `prompts.log.info(...)`, `prompts.log.message(...)`, `prompts.log.warn(...)`, `prompts.log.success(...)`, `prompts.log.error(...)`.

### `installedFiles` tracking for manifest inclusion

**Source:** `installer.js:265, 266, 555, 584, 859, 1040` + `manifest-generator.js:87, 595`
**Apply to:** extractor output (`_gomad/gomad/agents/*.md`) + launcher output (`.claude/commands/gm/agent-*.md`).

Callback signature (from `installer.js:584`):
```javascript
(filePath) => this.installedFiles.add(filePath)
```

Every new file Phase 6 writes MUST be pushed into `this.installedFiles` so `writeFilesManifest` emits a v2 row with correct `install_root` + `path`.

### `_gomad` folder parameterization

**Source:** `path-utils.js:23` (`GOMAD_FOLDER_NAME = '_gomad'`) + `_config-driven.js:28, 34` (ctor + setter) + `agent-command-generator.js:9–12`
**Apply to:** extractor target path — `path.join(gomadDir, 'gomad', 'agents', `${shortName}.md`)`. Never hard-code `'_gomad'` string — always derive from `this.gomadFolderName` or `path.basename(gomadDir)`.

### Source-tree resolution (for extractor reading `src/gomad-skills/`)

**Source:** `project-root.js:52–70` — `getSourcePath('gomad-skills')` and `getModulePath('gomad')`
**Apply to:** extractor MUST read from source tree, not installed tree.

```javascript
const { getSourcePath } = require('../../project-root');
const skillsRoot = getSourcePath('gomad-skills');
// → <repo-root>/src/gomad-skills or <node_modules>/@xgent-ai/gomad/src/gomad-skills
```

This is the SAME resolution used by `manifest-generator.js:6` — already proven to work for both `npx gomad install` (from node_modules) and `node tools/installer/gomad-cli.js install` (from repo).

### YAML load/stringify

**Source:** `skill-manifest.js:17` (`yaml.parse`) + `manifest-generator.js:455` (`yaml.stringify`)
**Apply to:** extractor (load `skill-manifest.yaml`, emit extracted frontmatter).

```javascript
const yaml = require('yaml');
const parsed = yaml.parse(await fs.readFile(manifestPath, 'utf8'));
const serialized = yaml.stringify(parsed);  // emit as frontmatter body (caller wraps with `---\n...---\n`)
```

---

## No Analog Found

None — every Phase 6 file has a close analog in the repo. Phase 6 is a refit of existing infrastructure (copy-vs-symlink, manifest-schema bump, template-extend, generator-revive), not greenfield.

---

## Metadata

**Analog search scope:**
- `tools/installer/ide/` — `_config-driven.js`, `shared/*.js`, `templates/*.md`, `platform-codes.yaml`
- `tools/installer/core/` — `installer.js`, `manifest-generator.js`
- `tools/installer/` — `project-root.js`, `prompts.js`
- `src/gomad-skills/*/gm-agent-*/` — all 7 SKILL.md + skill-manifest.yaml pairs
- `.claude/commands/gsd/*.md` — launcher-shape sibling
- `test/test-gm-command-surface.js` — contract-source for launcher frontmatter
- `package.json` — dependency surface check (`csv-parse` present; no `csv-stringify`)

**Files scanned:** 14 direct reads + 7 glob results

**Pattern extraction date:** 2026-04-18

**Key conclusions for the planner:**
1. **No new runtime deps.** `csv-parse/sync` (already present) covers the read side; use the existing `escapeCsv` helper from `writeAgentManifest` for symmetric write. Do NOT pull `csv-stringify/sync` — violates the zero-new-deps constraint.
2. **The class already exists.** `AgentCommandGenerator` is already wired; Phase 6 adds ONE method (`extractPersonas`), tweaks `writeAgentLaunchers` naming, and updates the template body. The orchestration seam is `_config-driven.js:installToTarget` after line 121 `printSummary`.
3. **Test contract is already locked.** `test/test-gm-command-surface.js` lines 218–247 codify the exact launcher frontmatter shape. Phase 6 implementation must produce `name: gm:agent-<shortName>` (colon form, NOT `gm-agent-<shortName>` which is the SKILL dir name).
4. **v1 manifest backward-compat is free.** Missing `schema_version` column parses as `undefined` → treat as implicit v1 (D-23). The read-side default (`r.schema_version || null`) preserves this invariant.
5. **Forward-slash normalization is half-done.** Line 599 of `manifest-generator.js` already normalizes to `/` on read; Phase 6 just needs the same idiom on any new IDE-target rows.
