# Phase 10: Story-Creation Enhancements — Pattern Map

**Mapped:** 2026-04-24
**Files analyzed:** 14 (2 new task-skills × 5 files + 2 KB packs + 2 tool scripts + 4 modifications)
**Analogs found:** 14 / 14 (every target has a direct in-repo analog)

---

## File Classification

| New / Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---------------------|------|-----------|----------------|---------------|
| `src/gomad-skills/4-implementation/gm-discuss-story/SKILL.md` | skill (manifest) | request-response | `src/gomad-skills/4-implementation/gm-create-story/SKILL.md` | exact |
| `src/gomad-skills/4-implementation/gm-discuss-story/workflow.md` | skill (workflow DSL) | event-driven elicitation | `src/gomad-skills/4-implementation/gm-create-story/workflow.md` (structure) + `.claude/get-shit-done/workflows/discuss-phase.md` (elicitation semantics) | hybrid — both are direct analogs |
| `src/gomad-skills/4-implementation/gm-discuss-story/template.md` | skill (template) | transform | `src/gomad-skills/4-implementation/gm-create-story/template.md` | role-match |
| `src/gomad-skills/4-implementation/gm-discuss-story/checklist.md` | skill (validation) | transform | `src/gomad-skills/4-implementation/gm-create-story/checklist.md` | exact |
| `src/gomad-skills/4-implementation/gm-discuss-story/discover-inputs.md` | skill (input-loader) | file-I/O | `src/gomad-skills/4-implementation/gm-create-story/discover-inputs.md` | exact (near-verbatim reuse) |
| `src/gomad-skills/4-implementation/gm-domain-skill/SKILL.md` | skill (manifest) | request-response | `src/gomad-skills/4-implementation/gm-create-story/SKILL.md` | exact |
| `src/gomad-skills/4-implementation/gm-domain-skill/workflow.md` | skill (workflow DSL) | query/search (BM25) | `src/gomad-skills/4-implementation/gm-create-story/workflow.md` | role-match (same DSL; novel query semantics) |
| `src/gomad-skills/4-implementation/gm-domain-skill/template.md` | skill (template) | transform | `src/gomad-skills/4-implementation/gm-create-story/template.md` | role-match |
| `src/gomad-skills/4-implementation/gm-domain-skill/checklist.md` | skill (validation) | transform | `src/gomad-skills/4-implementation/gm-create-story/checklist.md` | role-match (simpler checklist) |
| `src/gomad-skills/4-implementation/gm-domain-skill/discover-inputs.md` | skill (input-loader) | file-I/O | `src/gomad-skills/4-implementation/gm-create-story/discover-inputs.md` | role-match (smaller scope: 1 input, not 4) |
| `src/domain-kb/testing/**` (~10 files) | KB content pack | static content | n/a — new directory | no-analog (see "No Analog Found" below; frontmatter = STORY-08/09 spec) |
| `src/domain-kb/architecture/**` (~10 files) | KB content pack | static content | n/a — new directory | no-analog |
| `tools/validate-kb-licenses.js` | release-gate script | batch validation | `tools/validate-skills.js` | exact (structurally identical: glob → parse frontmatter → assert → exit 1) |
| `test/test-domain-kb-install.js` | test | file-I/O assertion | `test/test-e2e-install.js` + `tools/verify-tarball.js` | hybrid (fresh-install shape + grep-clean style path assertion) |
| `tools/installer/core/installer.js` (MODIFY — add `_installDomainKb()`) | installer method | batch file-copy + CSV manifest | existing `_installOfficialModules` (installer.js:661-687) + `_installCustomModules` (installer.js:693-715) | exact (both already in same file) |
| `tools/installer/core/install-paths.js` (MODIFY — add `_config/kb/`) | config constant | static | existing `agentsDir` / `customCacheDir` pattern (install-paths.js:22-24) | exact |
| `src/gomad-skills/4-implementation/gm-create-story/discover-inputs.md` (MODIFY — add SELECTIVE_LOAD entry) | skill (input-loader) | file-I/O | itself (existing `epics` SELECTIVE_LOAD entry, lines 32-39) | exact |
| `src/gomad-skills/4-implementation/gm-create-story/workflow.md` (MODIFY — invoke `gm-domain-skill`) | skill (workflow DSL) | event-driven | itself (existing step structure) | exact |
| `package.json` (MODIFY — wire `validate-kb-licenses` into `quality`) | config | static | existing `quality` script (package.json:56) wiring `validate:skills` | exact |

---

## Pattern Assignments

### 1. `gm-discuss-story/SKILL.md` (skill manifest, request-response)

**Analog:** `src/gomad-skills/4-implementation/gm-create-story/SKILL.md` (all 6 lines)

**Copy verbatim structure** (lines 1-6):
```yaml
---
name: gm-create-story
description: 'Creates a dedicated story file with all the context the agent will need to implement it later. Use when the user says "create the next story" or "create story [story identifier]"'
---

Follow the instructions in ./workflow.md.
```

**Apply to `gm-discuss-story/SKILL.md`:**
- Frontmatter `name: gm-discuss-story` (matches directory — SKILL-05 rule in `validate-skills.js:45`).
- `description:` must start with **"Use when ..."** per SKILL-06 in `validate-skills.js`.
- Body: single line **`Follow the instructions in ./workflow.md.`** (identical form).

**Validation contract** (from `tools/validate-skills.js:45` + `:318-327`):
- `NAME_REGEX = /^gm-[a-z0-9]+(-[a-z0-9]+)*$/` — name must match.
- `name` must equal directory basename.

Same pattern applies identically to `gm-domain-skill/SKILL.md`.

---

### 2. `gm-discuss-story/workflow.md` (BMAD DSL + classic-discuss elicitation)

This file has TWO analogs — the **DSL shape** comes from gm-create-story; the **behavior semantics** come from discuss-phase.md.

**Analog A (DSL shape):** `src/gomad-skills/4-implementation/gm-create-story/workflow.md`

**Header + INITIALIZATION block pattern** (lines 1-48):
```markdown
# Create Story Workflow

**Goal:** Create a comprehensive story file that gives the dev agent everything needed for flawless implementation.

**Your Role:** [role statement]
- Communicate all responses in {communication_language} and generate all documents in {document_output_language}
...

---

## INITIALIZATION

### Configuration Loading

Load config from `{project-root}/_gomad/agile/config.yaml` and resolve:
- `project_name`, `user_name`
- `communication_language`, `document_output_language`
...

### Paths

- `sprint_status` = `{implementation_artifacts}/sprint-status.yaml`
- `epics_file` = `{planning_artifacts}/epics.md`
...

### Input Files

| Input | Description | Path Pattern(s) | Load Strategy |
|-------|-------------|------------------|---------------|
| prd | PRD (fallback ...) | whole: `{planning_artifacts}/*prd*.md`, sharded: `{planning_artifacts}/*prd*/*.md` | SELECTIVE_LOAD |
...
```

**XML-tag DSL** (workflow.md:52-209):
```xml
<workflow>
<step n="1" goal="Determine target story">
  <check if="{{story_path}} is provided by user ...">
    <action>Parse user-provided story path: extract epic_num, story_num, story_title</action>
    <action>Set {{epic_num}}, {{story_num}}, {{story_key}} from user input</action>
    <action>GOTO step 2a</action>
  </check>

  <action>Check if {{sprint_status}} file exists for auto discover</action>
  <check if="sprint status file does NOT exist">
    <output>🚫 No sprint status file found and no story specified</output>
    <ask>Choose option [1], provide epic-story number, ... [q] to quit:</ask>
    <check if="user chooses 'q'">
      <action>HALT - No work needed</action>
    </check>
    ...
  </check>
</step>

<step n="2" goal="Load and analyze core artifacts">
  <critical>🔬 EXHAUSTIVE ARTIFACT ANALYSIS</critical>
  <action>Read fully and follow `./discover-inputs.md` to load all input files</action>
  <note>Available content: {epics_content}, {prd_content}, ...</note>
...
</workflow>
```

**Artifact load via discover-inputs** (workflow.md:215):
```xml
<action>Read fully and follow `./discover-inputs.md` to load all input files</action>
```

**Template output pattern** (workflow.md:297-338):
```xml
<template-output file="{default_output_file}">story_header</template-output>
<template-output file="{default_output_file}">story_requirements</template-output>
<template-output file="{default_output_file}">developer_context_section</template-output>
<check if="previous story learnings available">
  <template-output file="{default_output_file}">previous_story_intelligence</template-output>
</check>
```

**Final summary step** (workflow.md:346-378) shows the `<action>Validate … against ./checklist.md</action>` → `<action>Save story document</action>` → `<output>` pattern to mirror.

**Analog B (elicitation semantics):** `.claude/get-shit-done/workflows/discuss-phase.md` (classic mode)

**Gray-area identification pattern** (discuss-phase.md:560-572):
```markdown
Example analysis for "Post Feed" phase:
Domain: Displaying posts from followed users
Existing: Card component (src/components/ui/Card.tsx), ...
Gray areas:
- UI: Layout style (cards vs timeline vs grid) — Card component exists with shadow/rounded variants
- UI: Information density (full posts vs previews) — no existing density patterns
- Behavior: Loading pattern — ALREADY DECIDED: infinite scroll (Phase 4)
```

**Multi-select gray-areas question** (discuss-phase.md:594-620):
```markdown
**Otherwise, use AskUserQuestion (multiSelect: true):**
- header: "Discuss"
- question: "Which areas do you want to discuss for [phase name]?"
- options: Generate 3-4 phase-specific gray areas, each with:
  - "[Specific area]" (label) — concrete, not generic
  - [1-2 questions this covers + code context annotation] (description)
  - **Highlight the recommended choice with brief explanation why**

**Do NOT include a "skip" or "you decide" option.** User ran this command to discuss — give them real choices.
```

**Checkpoint JSON schema** (discuss-phase.md:917-938) — copy verbatim for `{{story_key}}-discuss-checkpoint.json`, adapt keys per D-05:
```json
{
  "phase": "{PHASE_NUM}",
  "phase_name": "{phase_name}",
  "timestamp": "{ISO timestamp}",
  "areas_completed": ["Area 1", "Area 2"],
  "areas_remaining": ["Area 3", "Area 4"],
  "decisions": {
    "Area 1": [
      {"question": "...", "answer": "...", "options_presented": ["..."]}
    ]
  },
  "deferred_ideas": ["..."],
  "canonical_refs": ["..."]
}
```

**Checkpoint-resume detection** (discuss-phase.md:266-284):
```markdown
**Check for interrupted discussion checkpoint:**
ls ${phase_dir}/*-DISCUSS-CHECKPOINT.json 2>/dev/null || true

If a checkpoint file exists (previous session was interrupted before CONTEXT.md was written):
- header: "Resume"
- question: "Found interrupted discussion checkpoint ({N} areas completed out of {M}). Resume from where you left off?"
- options:
  - "Resume" — Load checkpoint, skip completed areas, continue discussion
  - "Start fresh" — Delete checkpoint, start discussion from scratch
```

**Update/View/Skip prompt** (discuss-phase.md:258-262 implied pattern — D-06):
```markdown
If "Update": Load existing, continue to analyze_phase
If "View": Display CONTEXT.md, then offer update/skip
If "Skip": Exit workflow
```

**Checkpoint cleanup on successful write** (discuss-phase.md:949):
```markdown
**After write_context completes successfully:** Delete the checkpoint file — the canonical CONTEXT.md now has all decisions.
```

**Deviations required for `gm-discuss-story/workflow.md`:**
- Scope is story-level (single `{{story_key}}` from epics SELECTIVE_LOAD), not phase-level. Use `{planning_artifacts}/{{story_key}}-context.md` as output.
- **No token cap** (D-04): workflow.md prose says "capture decisions, not discussion transcripts" — no counter/trim logic.
- Adaptive section mapping (D-03): gray areas map to sections by content, not a fixed lookup table.
- Edge case D-07 (both checkpoint + context.md): prose rule "context.md takes precedence; auto-delete stale checkpoint before prompting Update/View/Skip."

---

### 3. `gm-discuss-story/discover-inputs.md` (skill input-loader)

**Analog:** `src/gomad-skills/4-implementation/gm-create-story/discover-inputs.md` (entire 89-line file)

**Near-verbatim reuse** — D-01 says "both skills read the same materials." Copy the full protocol (Steps 1-3, FULL_LOAD/SELECTIVE_LOAD/INDEX_GUIDED strategies) unchanged. Only the Input Files table (in workflow.md, not here) differs.

Key excerpt to preserve verbatim (discover-inputs.md:32-39):
```markdown
#### SELECTIVE_LOAD Strategy

Load a specific shard using a template variable. Example: used for epics with `{{epic_num}}`.

1. Check for template variables in the sharded pattern (e.g., `{{epic_num}}`).
2. If the variable is undefined, ask the user for the value OR infer it from context.
3. Resolve the template to a specific file path.
4. Load that specific file.
5. Store in variable: `{pattern_name_content}`.
```

Handle-not-found clause (lines 70-76) is the basis for **D-13's "missing context.md = hint not error"** behavior in gm-create-story:
```markdown
### 2c: Handle Not Found

If no matches were found for either sharded or whole patterns:
1. Set `{pattern_name_content}` to empty string.
2. Note in session: "No {pattern_name} files found" -- this is not an error, just unavailable. Offer the user a chance to provide the file.
```

---

### 4. `gm-discuss-story/template.md` (skill template)

**Analog:** `src/gomad-skills/4-implementation/gm-create-story/template.md` (50 lines)

**Handlebars-style interpolation + section headings** (lines 1-50):
```markdown
# Story {{epic_num}}.{{story_num}}: {{story_title}}

Status: ready-for-dev

<!-- Note: Validation is optional. ... -->

## Story

As a {{role}},
I want {{action}},
so that {{benefit}}.

## Acceptance Criteria

1. [Add acceptance criteria from epics/PRD]

## Tasks / Subtasks

- [ ] Task 1 (AC: #)
  - [ ] Subtask 1.1
...
```

**Deviation for `gm-discuss-story/template.md`:** replace story sections with the 5 locked D-03 sections:
```markdown
# {{story_key}} Context

<domain>
## Story Boundary
{{domain_content}}
</domain>

<decisions>
## Implementation Decisions
{{decisions_content}}
</decisions>

<canonical_refs>
## Canonical References
{{canonical_refs_content}}
</canonical_refs>

<specifics>
## Specific Ideas
{{specifics_content}}
</specifics>

<deferred>
## Deferred Ideas
{{deferred_content}}
</deferred>
```

(The XML-tag-with-heading pattern matches `.planning/phases/10-story-creation-enhancements/10-CONTEXT.md` itself — see its `<domain>`, `<decisions>`, `<canonical_refs>`, `<specifics>`, `<deferred>` blocks. That is the canonical section-wrapper idiom for context.md in this repo.)

---

### 5. `gm-discuss-story/checklist.md` (skill validation)

**Analog:** `src/gomad-skills/4-implementation/gm-create-story/checklist.md` (358 lines)

**Header + mission pattern** (lines 1-30):
```markdown
# 🎯 Story Context Quality Competition Prompt

## **🔥 CRITICAL MISSION: Outperform and Fix the Original Create-Story LLM**

You are an independent quality validator in a **FRESH CONTEXT**. Your mission is to **thoroughly review** a story file that was generated by the create-story workflow and **systematically identify any mistakes, omissions, or disasters** ...
```

**Systematic re-analysis approach** (lines 58-70):
```markdown
## **🔬 SYSTEMATIC RE-ANALYSIS APPROACH**

You will systematically re-do the entire story creation process, but with a critical eye for what the original LLM might have missed:

### **Step 1: Load and Understand the Target**
1. **Load the workflow configuration**: `./workflow.md` for variable inclusion
2. **Load the story file**: `{story_file_path}` (provided by user or discovered)
...
```

**Interactive improvement prompt** (lines 280-298) is the pattern to mirror for a "here are the gaps — apply all/select/none" dialog in `gm-discuss-story/checklist.md`.

**Deviation:** `gm-discuss-story/checklist.md` is simpler — it validates the 5 sections of `{{story_key}}-context.md` are populated and contain decisions (not discussion transcripts per D-04). Drop the story-specific categories (acceptance criteria, dev notes, etc.).

---

### 6. `gm-domain-skill/workflow.md` (BM25 search + Levenshtein suggestion)

**Analog (DSL shell):** `src/gomad-skills/4-implementation/gm-create-story/workflow.md`

Reuse the same `<workflow>/<step>/<check>/<action>/<ask>` XML shell. Novel logic = BM25 scoring + Levenshtein distance is specified in the skill's action/note prose (D-10: hardcoded heuristic constant with inline comment; D-11: `Did you mean: ...?` list-and-halt).

**Analog (path iteration pattern):** `tools/installer/core/manifest-generator.js:190-266` — the recursive walk that skips `.`/`_`-prefixed dirs is the template for "iterate every `.md` under `<installRoot>/_config/kb/<slug>/`":

```javascript
// Recursive walk skipping . and _ prefixed dirs
const walk = async (dir) => {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch (error) {
    if (error.code !== 'ENOENT' && error.code !== 'ENOTDIR') {
      await prompts.log.warn(`Could not read directory ${dir}: ${error.message}. Skipping subtree.`);
    }
    return;
  }
  ...
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (entry.name.startsWith('.') || entry.name.startsWith('_')) continue;
    await walk(path.join(dir, entry.name));
  }
};
```

(Note: `gm-domain-skill/workflow.md` is a markdown skill, not JS. The walk is described in prose. The Node implementation of BM25 lives in `gm-dev-story`/dev-only tooling per research SUMMARY.md — NOT in this phase per STORY-F1 deferral. For Phase 10, the workflow file documents the *protocol*; any execution is by the agent interpreting the instructions.)

---

### 7. `src/domain-kb/testing/**` + `src/domain-kb/architecture/**` (KB content packs)

**Analog (shape for pack):** `src/gomad-skills/4-implementation/gm-create-story/SKILL.md` (for the per-pack `SKILL.md` root) — use the frontmatter + "Follow instructions in ./..." body pattern, but the pack has no workflow.

**Analog (frontmatter contract):** CONTEXT.md §Established Patterns + STORY-08/09.

**Required frontmatter for EVERY KB `.md` file** (per PITFALLS.md §"IP/licensing for seed KB content"):
```yaml
---
source: original
license: MIT
last_reviewed: 2026-04-24
---
```

**Pack shape per D-12 (broad-shallow, ~10 files):**
```
src/domain-kb/testing/
├── SKILL.md              # overview + "when to use this pack"
├── reference/
│   ├── unit-tests.md     # ~200-500 words
│   ├── integration.md
│   ├── e2e.md
│   ├── mocking.md
│   └── coverage.md
├── examples/
│   ├── jest-setup.md
│   └── playwright-e2e.md
└── anti-patterns.md      # common mistakes
```

Same shape for `src/domain-kb/architecture/**`.

**Per-file H1 contract** (for D-09 listing: `<relative_path> — <H1 heading>`):
- Every `.md` MUST have a single `# Title` on line after frontmatter for the catalog listing to work.

---

### 8. `tools/validate-kb-licenses.js` (release gate)

**Analog:** `tools/validate-skills.js` (736 lines)

**Imports + CLI parsing pattern** (validate-skills.js:30-41):
```javascript
const fs = require('node:fs');
const path = require('node:path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const SRC_DIR = path.join(PROJECT_ROOT, 'src');

// --- CLI Parsing ---
const args = process.argv.slice(2);
const STRICT = args.includes('--strict');
const JSON_OUTPUT = args.includes('--json');
```

**Frontmatter parser (reuse; do NOT rewrite)** (validate-skills.js:67-100):
```javascript
function parseFrontmatter(content) {
  const trimmed = content.trimStart();
  if (!trimmed.startsWith('---')) return null;

  let endIndex = trimmed.indexOf('\n---\n', 3);
  if (endIndex === -1) {
    if (trimmed.endsWith('\n---')) {
      endIndex = trimmed.length - 4;
    } else {
      return null;
    }
  }

  const fmBlock = trimmed.slice(3, endIndex).trim();
  if (fmBlock === '') return {};

  const result = {};
  for (const line of fmBlock.split('\n')) {
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) continue;
    if (line[0] === ' ' || line[0] === '\t') continue;
    const key = line.slice(0, colonIndex).trim();
    let value = line.slice(colonIndex + 1).trim();
    if ((value.startsWith("'") && value.endsWith("'")) || (value.startsWith('"') && value.endsWith('"'))) {
      value = value.slice(1, -1);
    }
    result[key] = value;
  }
  return result;
}
```

**Alternative:** `require('yaml')` (already installed — see `tools/validate-file-refs.js:31` and `tools/installer/ui.js:134`):
```javascript
const yaml = require('yaml');
const fm = yaml.parse(fmBlock);
```

CONTEXT.md §Reusable Assets notes `yaml.parse` is the canonical approach for KB validator. Prefer it over the hand-rolled parser since KB frontmatter is small enough to parse with the real library.

**Discovery walk** (validate-skills.js:190-218):
```javascript
function discoverSkillDirs(rootDirs) {
  const skillDirs = [];

  function walk(dir) {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (entry.name === 'node_modules' || entry.name === '.git') continue;

      const fullPath = path.join(dir, entry.name);
      const skillMd = path.join(fullPath, 'SKILL.md');

      if (fs.existsSync(skillMd)) {
        skillDirs.push(fullPath);
      }
      walk(fullPath);
    }
  }

  for (const rootDir of rootDirs) {
    walk(rootDir);
  }
  return skillDirs.sort();
}
```

**Adapt for KB:** scan `src/domain-kb/**/*.md` via `glob` (already installed — `test/test-e2e-install.js:14` uses `const { globSync } = require('glob')`):
```javascript
const { globSync } = require('glob');
const kbFiles = globSync('src/domain-kb/**/*.md', { cwd: PROJECT_ROOT, absolute: true });
```

**Finding/severity structure** (validate-skills.js:256-266):
```javascript
findings.push({
  rule: 'SKILL-01',
  title: 'SKILL.md Must Exist',
  severity: 'CRITICAL',
  file: 'SKILL.md',
  detail: 'SKILL.md not found in skill directory.',
  fix: 'Create SKILL.md as the skill entrypoint.',
});
```

**KB rules to enforce** (map STORY-08/09/10 to rules):
- `KB-01 CRITICAL`: file has YAML frontmatter (`---` start + end).
- `KB-02 CRITICAL`: frontmatter has `source` key.
- `KB-03 CRITICAL`: frontmatter has `license` key.
- `KB-04 CRITICAL`: frontmatter has `last_reviewed` key (ISO date).
- `KB-05 HIGH`: `source` value is in allowlist (`original`, or a URL).
- `KB-06 HIGH`: `license` value is in allowlist (`MIT`, `Apache-2.0`, `BSD-3-Clause`, `CC-BY-4.0`, `CC0-1.0`).
- `KB-07 HIGH`: file has H1 heading after frontmatter (enables D-09 catalog listing).

**Exit-code pattern** (validate-skills.js:696-732):
```javascript
if (require.main === module) {
  // ... run validation ...
  const { output, hasHighPlus } = JSON_OUTPUT ? formatJson(results) : formatHumanReadable(results);
  console.log(output);

  if (STRICT && hasHighPlus) {
    process.exit(1);
  }
}
```

**Deviation for KB validator:** CONTEXT.md says the validator is a **release gate** (must land BEFORE content). Make `process.exit(1)` fire on ANY `CRITICAL` finding without requiring `--strict` (stricter than validate-skills.js). Optional `--strict` upgrades `HIGH` to fail as well.

**GitHub Actions annotation pattern** (validate-skills.js:604-610) — copy verbatim for CI surface:
```javascript
if (process.env.GITHUB_ACTIONS) {
  const absFile = path.join(skillDir, f.file);
  const ghFile = path.relative(PROJECT_ROOT, absFile);
  const line = f.line || 1;
  const level = f.severity === 'LOW' ? 'notice' : 'warning';
  console.log(`::${level} file=${ghFile},line=${line}::${escapeAnnotation(`${f.rule}: ${f.detail}`)}`);
}
```

---

### 9. `test/test-domain-kb-install.js` (grep-clean fresh-install assertion)

**Analog A (fresh-install shape):** `test/test-e2e-install.js` (167 lines) — the pack/install/assert/cleanup harness.

**Imports + assert helper** (test-e2e-install.js:10-43):
```javascript
const path = require('node:path');
const os = require('node:os');
const { execSync } = require('node:child_process');
const fs = require('fs-extra');
const { globSync } = require('glob');

const colors = {
  reset: '[0m',
  green: '[32m',
  red: '[31m',
  ...
};

let passed = 0;
let failed = 0;

function assert(condition, testName, errorMessage = '') {
  if (condition) {
    console.log(`${colors.green}✓${colors.reset} ${testName}`);
    passed++;
  } else {
    console.log(`${colors.red}✗${colors.reset} ${testName}`);
    if (errorMessage) {
      console.log(`  ${colors.dim}${errorMessage}${colors.reset}`);
    }
    failed++;
  }
}
```

**Pack → tempdir → install → verify pattern** (test-e2e-install.js:49-141):
```javascript
const projectRoot = path.resolve(__dirname, '..');
let tarballPath = null;
let tempDir = null;

try {
  // 1. Pack the tarball
  const packOutput = execSync('npm pack', {
    cwd: projectRoot,
    encoding: 'utf8',
    timeout: 60_000,
  }).trim();
  const tarballName = packOutput.split('\n').pop().trim();
  tarballPath = path.join(projectRoot, tarballName);

  // 2. Temp dir
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gomad-e2e-'));

  // 3. Init npm project
  execSync('npm init -y', { cwd: tempDir, ... });

  // 4. Install tarball
  execSync(`npm install "${tarballPath}"`, { cwd: tempDir, ... });

  // 5. Verify structure
  const pkgDir = path.join(tempDir, 'node_modules', '@xgent-ai', 'gomad');
  const srcExists = fs.existsSync(path.join(pkgDir, 'src'));
  assert(srcExists, 'Installed package contains src/ directory');
  ...
} finally {
  // 7. Cleanup
  if (tempDir && fs.existsSync(tempDir)) fs.removeSync(tempDir);
  if (tarballPath && fs.existsSync(tarballPath)) fs.unlinkSync(tarballPath);
}
process.exit(failed > 0 ? 1 : 0);
```

**Analog B (path assertion semantics):** `tools/verify-tarball.js:48-63` — forbidden-paths pattern can be inverted for **required-paths**:

```javascript
// From verify-tarball.js (forbidden pattern — invert for required)
const forbiddenPatterns = [/^\.planning\//, /^test\//, ...];
const failures = [];
for (const filePath of files) {
  for (const pattern of forbiddenPatterns) {
    if (pattern.test(filePath)) {
      failures.push(filePath);
      break;
    }
  }
}
return { passed: failures.length === 0, failures };
```

**Deviation for test-domain-kb-install.js:**
- Instead of `forbiddenPatterns`, use `requiredPatterns` that MUST appear after install:
  - `_config/kb/testing/SKILL.md`
  - `_config/kb/architecture/SKILL.md`
  - At least one file under `_config/kb/testing/reference/`
  - files-manifest.csv contains rows with `install_root="_gomad"` and path starting `_config/kb/`.

**Running an actual installer** — check how `test/test-installation-components.js` bootstraps the installer in-process if a full `npx @xgent-ai/gomad install` is too heavy. Lighter path: call `Installer.install({ directory: tempDir, modules: [...], ides: [...] })` directly.

---

### 10. `tools/installer/core/installer.js` — ADD `_installDomainKb()`

**Analog A:** `_installOfficialModules` (installer.js:661-687):
```javascript
async _installOfficialModules(config, paths, officialModuleIds, addResult, isQuickUpdate, officialModules, ctx) {
  const { message, installedModuleNames } = ctx;

  for (const moduleName of officialModuleIds) {
    if (installedModuleNames.has(moduleName)) continue;
    installedModuleNames.add(moduleName);

    message(`${isQuickUpdate ? 'Updating' : 'Installing'} ${moduleName}...`);

    const moduleConfig = officialModules.moduleConfigs[moduleName] || {};
    await officialModules.install(
      moduleName,
      paths.gomadDir,
      (filePath) => {
        this.installedFiles.add(filePath);   // ← MUST track every copied file here
      },
      {
        skipModuleInstaller: true,
        moduleConfig: moduleConfig,
        installer: this,
        silent: true,
      },
    );

    addResult(`Module: ${moduleName}`, 'ok', isQuickUpdate ? 'updated' : 'installed');
  }
}
```

**KEY PATTERN:** `(filePath) => { this.installedFiles.add(filePath); }` — any new install method MUST add every copied file to `this.installedFiles` so `writeFilesManifest` records it with correct `install_root='_gomad'`.

**Analog B (call-site):** installer.js:222-248 — `_installAndConfigure` orchestration:
```javascript
async _installAndConfigure(config, originalConfig, paths, officialModuleIds, allModules, addResult, officialModules) {
  const isQuickUpdate = config.isQuickUpdate();
  ...
  if (allModules.length > 0) {
    installTasks.push({
      title: isQuickUpdate ? `Updating ${allModules.length} module(s)` : `Installing ${allModules.length} module(s)`,
      task: async (message) => {
        const installedModuleNames = new Set();

        await this._installOfficialModules(config, paths, officialModuleIds, addResult, isQuickUpdate, officialModules, {
          message,
          installedModuleNames,
        });

        await this._installCustomModules(config, paths, addResult, officialModules, {
          message,
          installedModuleNames,
        });

        return `${allModules.length} module(s) ${isQuickUpdate ? 'updated' : 'installed'}`;
      },
    });
  }
  ...
}
```

**Where `_installDomainKb()` slots in** (per CONTEXT.md §"Claude's Discretion"):
- Add a call after `_installOfficialModules` in the same task block (installer.js:236-244) — so KB lands before `_setupIdes` and before manifest generation at line 324-328.

**Sketch for `_installDomainKb()` method (copy the `_installOfficialModules` shape):**
```javascript
async _installDomainKb(paths, addResult, ctx) {
  const { message } = ctx;
  const srcKbDir = path.join(paths.srcDir, 'src', 'domain-kb');
  const destKbDir = path.join(paths.configDir, 'kb');  // _gomad/_config/kb/

  if (!(await fs.pathExists(srcKbDir))) {
    addResult('Domain KB', 'skip', 'no source packs');
    return;
  }

  message('Installing domain-kb packs...');
  await fs.ensureDir(destKbDir);
  await fs.copy(srcKbDir, destKbDir, { overwrite: true });

  // Track every copied .md file so writeFilesManifest records install_root='_gomad'
  const { globSync } = require('glob');
  const copiedFiles = globSync('**/*.md', { cwd: destKbDir, absolute: true });
  for (const filePath of copiedFiles) {
    this.installedFiles.add(filePath);
  }

  addResult('Domain KB', 'ok', `${copiedFiles.length} files installed`);
}
```

**Imports already present at top of installer.js** (installer.js:1-16) — no new imports needed; `fs-extra`, `path`, `glob` (via `manifest-generator.js:3` transitively) are all in scope.

---

### 11. `tools/installer/core/install-paths.js` — ADD `_config/kb/` constant

**Analog:** install-paths.js:21-25 (the existing `configDir` / `agentsDir` declarations):
```javascript
const configDir = path.join(gomadDir, '_config');
const agentsDir = path.join(configDir, 'agents');
const customCacheDir = path.join(configDir, 'custom');
const coreDir = path.join(gomadDir, 'core');
```

**And the ensureWritableDir loop** (install-paths.js:26-34):
```javascript
for (const [dir, label] of [
  [gomadDir, 'gomad directory'],
  [configDir, 'config directory'],
  [agentsDir, 'agents config directory'],
  [customCacheDir, 'custom modules cache'],
  [coreDir, 'core module directory'],
]) {
  await ensureWritableDir(dir, label);
}
```

**Constructor assignment** (install-paths.js:36-47):
```javascript
return new InstallPaths({
  srcDir,
  version,
  projectRoot,
  gomadDir,
  configDir,
  agentsDir,
  customCacheDir,
  coreDir,
  isUpdate,
});
```

**Addition for KB:**
```javascript
const kbDir = path.join(configDir, 'kb');
// ... add to the ensureWritableDir tuple array:
//   [kbDir, 'domain-kb directory'],
// ... add to the constructor props:
//   kbDir,
```

And optionally add a helper accessor mirroring `manifestFile()` (install-paths.js:54-56):
```javascript
kbRoot() { return path.join(this.configDir, 'kb'); }
```

---

### 12. `gm-create-story/discover-inputs.md` — ADD SELECTIVE_LOAD entry (MODIFY)

**Analog:** the existing `epics` SELECTIVE_LOAD entry (workflow.md:46, table row), plus discover-inputs.md's SELECTIVE_LOAD protocol (lines 32-39).

**Add to the workflow.md Input Files table** (workflow.md:41-47), one new row:
```markdown
| story_context | Pre-discussion context captured by gm-discuss-story (optional — missing = hint not error per STORY-04) | whole: `{planning_artifacts}/{{story_key}}-context.md` | SELECTIVE_LOAD |
```

The discover-inputs.md protocol file itself need only be patched to mention `{{story_key}}` as a second example template variable alongside the existing `{{epic_num}}`:

**Current excerpt to update** (discover-inputs.md:34):
```markdown
Load a specific shard using a template variable. Example: used for epics with `{{epic_num}}`.
```

**Patched excerpt:**
```markdown
Load a specific shard using a template variable. Examples: epics with `{{epic_num}}`, story context with `{{story_key}}`.
```

**Handle-not-found is already correct** (discover-inputs.md:70-76) — missing `{{story_key}}-context.md` falls through to empty string, matching STORY-04 "hint not error."

---

### 13. `gm-create-story/workflow.md` — ADD `gm-domain-skill` invocation (MODIFY per D-13, STORY-12)

**Analog:** the existing `<action>Read fully and follow './discover-inputs.md' to load all input files</action>` (workflow.md:215) — same sub-skill invocation shape.

**Insertion point (per D-13):** after `<step n="3" goal="Architecture analysis for developer guardrails">` (ends ~workflow.md:269), before web research (step 4, line 271). After architecture content is loaded and before story draft.

**Sketch of new step (insert between 3 and 4):**
```xml
<step n="3b" goal="Fetch domain KB context (pre-bake)">
  <critical>📚 DOMAIN KB PRE-BAKE — Retrieve relevant reference material from installed KB packs per STORY-12</critical>
  <action>Identify domains relevant to this story from architecture + epics content (e.g., testing, architecture)</action>
  <action>For each relevant domain slug, invoke gm-domain-skill with a focused query derived from story scope</action>
  <note>gm-domain-skill returns a single best-matching .md file's full content (D-08) OR a catalog listing if no query is given (D-09)</note>
  <action>Append returned KB content to in-memory context under a {kb_snippets} variable</action>
  <check if="no match returned">
    <action>Note "No KB match for {domain_slug} / {query}" and proceed without KB snippet</action>
  </check>
</step>
```

**Template-output reference** to thread into the story file (new entry parallel to workflow.md:309):
```xml
<check if="kb snippets returned">
  <template-output file="{default_output_file}">domain_kb_references</template-output>
</check>
```

---

### 14. `package.json` — WIRE `validate-kb-licenses` into `quality` (MODIFY)

**Analog:** the existing scripts block (package.json:52-68):
```json
"lint": "eslint . --ext .js,.cjs,.mjs,.yaml --max-warnings=0",
...
"quality": "npm run format:check && npm run lint && npm run lint:md && npm run docs:build && npm run test:install && npm run test:integration && npm run validate:refs && npm run validate:skills && npm run test:orphan-refs",
"test:install": "node test/test-installation-components.js",
"test:tarball": "node tools/verify-tarball.js",
"validate:skills": "node tools/validate-skills.js --strict"
```

**Add two script entries** (mirror the `validate:skills` shape):
```json
"validate:kb-licenses": "node tools/validate-kb-licenses.js --strict",
"test:domain-kb-install": "node test/test-domain-kb-install.js"
```

**Wire into `quality` — MUST land BEFORE any KB content is committed** (PITFALLS.md §"IP/licensing" is categorical). Insert `validate:kb-licenses` directly after `validate:skills`:
```json
"quality": "... && npm run validate:skills && npm run validate:kb-licenses && npm run test:domain-kb-install && npm run test:orphan-refs",
```

---

## Shared Patterns

### A. CommonJS `require()` Discipline

**Source:** Every `.js` file under `tools/` and `tools/installer/core/`.
**Apply to:** `tools/validate-kb-licenses.js`, `test/test-domain-kb-install.js`, new method in `tools/installer/core/installer.js`.

Concrete evidence — `tools/installer/core/installer.js:1-16` + `tools/validate-skills.js:30-31` + `test/test-e2e-install.js:10-14`:
```javascript
// installer.js
const path = require('node:path');
const fs = require('fs-extra');
const csv = require('csv-parse/sync');

// validate-skills.js
const fs = require('node:fs');
const path = require('node:path');

// test-e2e-install.js
const path = require('node:path');
const os = require('node:os');
const { execSync } = require('node:child_process');
const fs = require('fs-extra');
const { globSync } = require('glob');
```

**Rule (CONTEXT.md §Established Patterns):** MUST use `require()`, MUST NOT use ESM (`import`). Use `node:`-prefixed builtins where available (`node:fs`, `node:path`, `node:child_process`).

---

### B. Zero New Runtime Deps

**Source:** `.planning/research/STACK.md` + CONTEXT.md §Established Patterns.
**Apply to:** All new JS files.

**Already-installed, reusable packages:**
- `fs-extra` — dir copy + `pathExists` (installer.js:2).
- `glob` / `globSync` — pattern discovery (test-e2e-install.js:14, manifest-generator.js imports).
- `csv-parse/sync` — files-manifest.csv read (installer.js:3).
- `yaml` — frontmatter parsing (tools/validate-file-refs.js:31, tools/installer/ui.js:134).
- Node built-ins: `fs`, `path`, `os`, `child_process`, `crypto`.

**Hand-rolled ~50 LOC each (per STACK.md):**
- BM25 scoring in `gm-domain-skill` (not in this phase as runtime JS — documented in workflow.md prose).
- Levenshtein distance (same).

---

### C. CSV Escape Idiom

**Source:** `tools/installer/core/manifest-generator.js:554` (and symmetric at :583, :686).
**Apply to:** Any new code that writes to `files-manifest.csv`, `skill-manifest.csv`, or similar.

```javascript
const escapeCsv = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
```

**Rule:** Always quote every column; escape embedded `"` by doubling (RFC 4180). Symmetric with `csv.parse` reads in installer.js:765-774 using `relax_quotes: false`.

For Phase 10, this is **transitively satisfied**: `_installDomainKb()` only adds files to `this.installedFiles`; the CSV emit happens in the existing `writeFilesManifest` at manifest-generator.js:683-800 which already uses `escapeCsv` correctly and assigns `install_root='_gomad'` automatically to anything under `gomadDir`.

---

### D. Files-Manifest v2 install_root Discipline

**Source:** `tools/installer/core/manifest-generator.js:688-762`.
**Apply to:** `_installDomainKb()` behavior verification in `test/test-domain-kb-install.js`.

```javascript
let csvContent = 'type,name,module,path,hash,schema_version,install_root\n';
...
for (const filePath of this.allInstalledFiles) {
  ...
  let installRoot = '_gomad';
  let rootPath = this.gomadDir;
  for (const candidate of ideRootCandidates) {
    if (absFilePath === candidate.abs || absFilePath.startsWith(candidate.abs + path.sep)) {
      installRoot = candidate.name;
      rootPath = candidate.abs;
      break;
    }
  }
  ...
  allFiles.push({
    type: ext.slice(1) || 'file',
    name: fileName,
    module: module,
    path: relativePath,
    hash: hash,
    schema_version: '2.0',
    install_root: installRoot,
  });
}
```

**Rule:** Any file copied to `<gomadDir>/**` automatically gets `install_root='_gomad'`. Because `_installDomainKb()` writes to `<gomadDir>/_config/kb/`, the existing code path handles manifest emission correctly — **no change needed in manifest-generator.js**.

**Assert in test:** every row under `_config/kb/` has `install_root="_gomad"` and `schema_version="2.0"`.

---

### E. CONTEXT.md Section Wrappers

**Source:** `.planning/phases/10-story-creation-enhancements/10-CONTEXT.md` (itself) + every other `*-CONTEXT.md` under `.planning/phases/`.
**Apply to:** `gm-discuss-story/template.md` output shape (D-03).

The 5 locked sections and their XML wrappers are empirically evidenced by CONTEXT.md's own structure (lines 6-13 `<domain>`, 15-57 `<decisions>`, 59-106 `<canonical_refs>`, 143-152 `<specifics>`, 154-171 `<deferred>`).

---

### F. ANSI Color Output in CLIs / Tests

**Source:** `tools/verify-tarball.js:17-23`, `test/test-e2e-install.js:17-24`.
**Apply to:** `tools/validate-kb-licenses.js`, `test/test-domain-kb-install.js`.

```javascript
const colors = {
  reset: '[0m',
  green: '[32m',
  red: '[31m',
  yellow: '[33m',
  cyan: '[36m',
  dim: '[2m',
};
```

Use `${colors.green}✓${colors.reset}` for pass, `${colors.red}✗${colors.reset}` for fail.

---

### G. Exit-Code Contract

**Source:** `tools/validate-skills.js:696-732`, `test/test-e2e-install.js:166`, `tools/verify-tarball.js:174-176`.
**Apply to:** `tools/validate-kb-licenses.js`, `test/test-domain-kb-install.js`.

```javascript
// End of main module
if (require.main === module) {
  // ... run ...
  process.exit(hasCritical ? 1 : 0);
}
```

**Stricter rule for release gate (KB validator):** exit 1 on ANY `CRITICAL` without `--strict`. STRICT additionally promotes `HIGH` to failing. This differs from validate-skills.js (which treats all violations as advisory unless `--strict`).

---

### H. Frontmatter Regex / YAML Parsing

**Source:** `tools/validate-skills.js:67-100` (hand-rolled) OR `tools/validate-file-refs.js:31` (`yaml` package).
**Apply to:** `tools/validate-kb-licenses.js`.

**Preferred (per CONTEXT.md §Reusable Assets):**
```javascript
const yaml = require('yaml');

function extractFrontmatter(content) {
  const m = content.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return null;
  return yaml.parse(m[1]);
}
```

Real-library parsing (`yaml.parse`) is more robust than the hand-rolled parser and handles multi-line values, arrays, and unusual quoting. Both patterns are present in the codebase — pick `yaml.parse` because KB frontmatter may grow beyond simple `key: value` shapes in v1.4+.

---

## No Analog Found

The two KB packs are content, not code — no existing `src/domain-kb/**` directory exists (`ls src/domain-kb/` is empty). The **frontmatter contract** and **pack shape** are defined by CONTEXT.md §Established Patterns + D-12, not by mining an existing analog.

| File group | Role | Data Flow | Reason |
|------------|------|-----------|--------|
| `src/domain-kb/testing/*.md` | KB content | static | No prior KB pack in repo; shape defined by D-12 (1 SKILL.md + 4-6 reference/*.md + 2-3 examples/*.md + 1 anti-patterns.md); frontmatter defined by STORY-08/09. |
| `src/domain-kb/architecture/*.md` | KB content | static | Same as above. |

**Planner guidance:** Author content freshly (`source: original`, `license: MIT`). Use CONTEXT.md §Established Patterns for frontmatter. Use D-12 for pack shape. Use D-09 H1-heading contract for file structure. Do NOT search the codebase for a "KB analog" — there is none.

---

## Metadata

**Analog search scope:**
- `src/gomad-skills/4-implementation/**` — all 15 skill dirs scanned.
- `tools/**/*.js` — all JS tools scanned.
- `tools/installer/core/**` — full installer core.
- `test/**/*.js` — all test files.
- `.claude/get-shit-done/workflows/discuss-phase.md` — inspiration source per D-02/D-05/D-06.

**Files scanned:** ~35 source files, 8 read in full or relevant range for pattern extraction.

**Key references:**
- `src/gomad-skills/4-implementation/gm-create-story/SKILL.md` (6 lines)
- `src/gomad-skills/4-implementation/gm-create-story/workflow.md` (380 lines, skim + targeted reads)
- `src/gomad-skills/4-implementation/gm-create-story/discover-inputs.md` (89 lines, full)
- `src/gomad-skills/4-implementation/gm-create-story/template.md` (50 lines, full)
- `src/gomad-skills/4-implementation/gm-create-story/checklist.md` (358 lines, header skim)
- `tools/installer/core/install-paths.js` (130 lines, full)
- `tools/installer/core/installer.js` (1942 lines; targeted reads lines 1-70, 220-350, 655-742)
- `tools/installer/core/manifest-generator.js` (874 lines; targeted reads lines 181-272, 540-610, 680-800)
- `tools/validate-skills.js` (736 lines; targeted reads lines 1-218, 590-732)
- `tools/verify-tarball.js` (181 lines, full)
- `test/test-e2e-install.js` (167 lines, full)
- `.claude/get-shit-done/workflows/discuss-phase.md` (1325 lines; targeted reads lines 260-303, 560-650, 905-958)

**Pattern extraction date:** 2026-04-24

---

*Phase: 10-story-creation-enhancements*
*Pattern map complete — ready for planner.*
