# Phase 11: Docs Site Content Authoring — Pattern Map

**Mapped:** 2026-04-26
**Files analyzed:** 17 (12 NEW pages + 2 NEW tooling files + 3 REWRITES; cleanup-only deletions excluded from per-file tables — see Cleanup Pattern below)
**Analogs found:** 17 / 17 — every NEW/REWRITE file has a concrete analog except `<!-- AUTO: -->` markers, which are a NEW project pattern documented in §"NEW Pattern" below.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `docs/tutorials/install.md` | content (tutorial) | static-render | `docs/_STYLE_GUIDE.md` §"Tutorial Structure" + `docs/upgrade-recovery.md` (shipped prose page) | role-match (template) + exact (shipped page shape) |
| `docs/tutorials/quick-start.md` | content (tutorial) | static-render | `docs/_STYLE_GUIDE.md` §"Tutorial Structure" + `docs/upgrade-recovery.md` | role-match + exact |
| `docs/how-to/contributing.md` | content (how-to) | static-render | `docs/_STYLE_GUIDE.md` §"How-To Structure" + `CONTRIBUTING.md` (repo-root content source) | role-match + content-source |
| `docs/reference/agents.md` | content (reference + auto-gen marker) | static-render + build-time injection | `docs/upgrade-recovery.md` (reference-style prose) + NEW marker pattern (see §"NEW Pattern") | role-match + new |
| `docs/reference/skills.md` | content (reference + auto-gen marker, grouped) | static-render + build-time injection | `docs/upgrade-recovery.md` + NEW marker pattern | role-match + new |
| `docs/explanation/architecture.md` | content (explanation) | static-render | `docs/_STYLE_GUIDE.md` §"Explanation Structure > General Template" + `docs/upgrade-recovery.md` | role-match + exact |
| `docs/zh-cn/tutorials/install.md` | content (tutorial, zh-CN) | static-render | EN sibling `docs/tutorials/install.md` (same plan/commit, per D-13) | mirror-of-EN |
| `docs/zh-cn/tutorials/quick-start.md` | content (tutorial, zh-CN) | static-render | EN sibling | mirror-of-EN |
| `docs/zh-cn/how-to/contributing.md` | content (how-to, zh-CN) | static-render | EN sibling | mirror-of-EN |
| `docs/zh-cn/reference/agents.md` | content (reference, zh-CN, same markers) | static-render + build-time injection | EN sibling | mirror-of-EN |
| `docs/zh-cn/reference/skills.md` | content (reference, zh-CN, same markers) | static-render + build-time injection | EN sibling | mirror-of-EN |
| `docs/zh-cn/explanation/architecture.md` | content (explanation, zh-CN) | static-render | EN sibling | mirror-of-EN |
| `docs/index.md` (REWRITE) | content (landing) | static-render | current `docs/index.md` (frontmatter shape) + `docs/404.md` (splash candidate) | exact (frontmatter) |
| `docs/zh-cn/index.md` (REWRITE) | content (landing, zh-CN) | static-render | EN sibling `docs/index.md` | mirror-of-EN |
| `docs/roadmap.mdx` + `docs/zh-cn/roadmap.mdx` (REWRITE-OR-DELETE per D-03) | content (pointer) or DELETE | static-render | If kept: `docs/404.md` (minimal frontmatter); if deleted: see Cleanup Pattern + `astro.config.mjs` sidebar removal | role-match or n/a |
| `tools/inject-reference-tables.cjs` (NEW) | utility (build-time tool) | file-I/O + transform (read SKILL.md, mutate docs/reference/*.md between markers) | `tools/validate-skills.js` | exact (CJS, parseFrontmatterMultiline, discoverSkillDirs, exit-code conventions) |
| `tools/__tests__/inject-reference-tables.test.js` (NEW) | test (unit) | request-response (assert) | `test/test-rehype-plugins.mjs` | role-match (existing repo uses `node test/*.{js,mjs}`, no Jest/Vitest) |
| `tools/build-docs.mjs` (PATCH) | utility (orchestrator) | event-driven (pipeline) | `tools/build-docs.mjs` itself, line 455-467 (`checkDocLinks` execSync pattern) | exact (in-file analog) |

> **Note on classification:** "controller / service / model" patterns from typical web apps don't apply here. The repo is a static-site + Node-tooling project. `role` here means {content, utility, test, config}; `data flow` means {static-render, file-I/O, transform, event-driven (pipeline)}.

> **Note on `tools/__tests__/`:** Test placement convention discovery — repo currently puts tests under `/test/test-*.{js,mjs}`, NOT `tools/__tests__/`. The orchestrator-suggested path `tools/__tests__/inject-reference-tables.test.js` does not match repo convention. Recommend planner relocate to `test/test-inject-reference-tables.js` (matches every other repo test). Pattern excerpts below are written for the repo's actual test convention; planner can decide on placement.

---

## Pattern Assignments

### `docs/tutorials/install.md` and `docs/tutorials/quick-start.md` (content, tutorial)

**Analogs:**
- `docs/_STYLE_GUIDE.md` lines 88-119 (Tutorial Structure 15-section template + checklist)
- `docs/upgrade-recovery.md` (shipped reference for prose flow with code blocks, tables, admonitions)

**Frontmatter pattern** (from `docs/upgrade-recovery.md` lines 1-4):
```markdown
---
title: "Upgrade Recovery"
description: How manifest-driven cleanup snapshots work and how to restore from them
---
```

**Phase 11 tutorial frontmatter** (RESEARCH.md Pattern 1, line 491-498):
```markdown
---
title: "Install GoMad"
description: Install @xgent-ai/gomad and run gomad install in 5 minutes.
sidebar:
  order: 1
---
```

**Tutorial structure pattern** (from `docs/_STYLE_GUIDE.md` lines 90-106):
```text
1. Title + Hook (1-2 sentences describing outcome)
2. Version/Module Notice (info or warning admonition) (optional)
3. What You'll Learn (bullet list of outcomes)
4. Prerequisites (info admonition)
5. Quick Path (tip admonition - TL;DR summary)
6. Understanding [Topic] (context before steps)
7. Installation (optional)
8. Step 1 / 9. Step 2 / 10. Step 3
11. What You've Accomplished (summary + folder structure)
12. Quick Reference (skills table)
13. Common Questions (FAQ)
14. Getting Help
15. Key Takeaways (tip admonition)
```

**Admonition pattern** (from `docs/_STYLE_GUIDE.md` lines 24-39):
```markdown
:::tip[Quick Path]
`npx @xgent-ai/gomad install` — accept defaults — done.
:::

:::note[Prerequisites]
Node.js 20+, npm 10+, and an AI IDE (Claude Code, Cursor, etc.).
:::
```

**Code-block pattern for shell commands** (from `docs/upgrade-recovery.md` lines 56-62):
```markdown
From the workspace root:

```bash
cp -R $(pwd)/_gomad/_backups/<YYYYMMDD-HHMMSS>/* ./
```

Replace `<YYYYMMDD-HHMMSS>` with the directory name of the backup you want.
```

**Style guardrails to enforce** (from `docs/_STYLE_GUIDE.md` line 10-20):
- No horizontal rules (`---`) outside frontmatter
- No `####` headers
- No "Related" / "Next:" sections (sidebar handles navigation)
- 8-12 `##` per doc, 2-3 `###` per section
- 1-2 admonitions per section (tutorials may use 3-4 per major section)

---

### `docs/how-to/contributing.md` (content, how-to)

**Analogs:**
- `docs/_STYLE_GUIDE.md` lines 121-141 (How-To Structure template + checklist)
- `CONTRIBUTING.md` at repo root (content source — research note)

**How-To structure** (from `docs/_STYLE_GUIDE.md` lines 123-133):
```text
1. Title + Hook (one sentence: "Use the `X` workflow to...")
2. When to Use This (bullet list of scenarios)
3. When to Skip This (optional)
4. Prerequisites (note admonition)
5. Steps (numbered ### subsections)
6. What You Get (output/artifacts produced)
7. Example (optional)
8. Tips (optional)
9. Next Steps (optional — but per style guide line 14, no "Related/Next:" sections; treat "Next Steps" with caution)
```

**Frontmatter** (RESEARCH.md table line 270):
```markdown
---
title: "Contributing to GoMad"
description: Fork, branch, test, and open a PR — what to run before submitting.
sidebar:
  order: 1
---
```

**Validation gate to mention** (from `package.json` scripts, verified above): `npm run quality` is the documented gate (RESEARCH.md DOCS-05 row).

---

### `docs/reference/agents.md` (content, reference + AUTO marker)

**Analogs:**
- `docs/_STYLE_GUIDE.md` lines 240-248 (Catalog Reference template)
- `docs/upgrade-recovery.md` (shipped reference-style prose page)
- NEW marker pattern (see §"NEW Pattern" below — no existing analog in `docs/`)

**Frontmatter + intro pattern** (RESEARCH.md Pattern 2, lines 285-294):
```markdown
---
title: "Agents Reference"
description: All eight gm-agent-* personas with purpose and slash-command invocation.
sidebar:
  order: 1
---

GoMad ships eight agent personas spanning the four workflow phases. Each is invoked via a `/gm:agent-*` slash command that loads the persona body from `<installRoot>/_config/agents/<shortName>.md` at runtime.

## All personas
```

**Marker block to author into source** (D-06 contract):
```markdown
<!-- AUTO:agents-table-start -->
<!-- This block is auto-generated from src/gomad-skills/*/gm-agent-*/SKILL.md.
     Do not edit between the markers — run `npm run docs:build` to regenerate. -->
<!-- AUTO:agents-table-end -->

## Choosing a persona

Hand-written prose continues here, fully under author control.
```

**Table columns produced by injector** (D-07): `Persona | Slash command | Phase | Purpose` (4 columns).

**Phase derivation** (D-07): from parent dir `src/gomad-skills/N-*/`:
- `1-analysis` → "Analysis"
- `2-plan-workflows` → "Planning"
- `3-solutioning` → "Solutioning"
- `4-implementation` → "Implementation"

**v1.3 path to use in prose** (D-10): `<installRoot>/_config/agents/<shortName>.md` (NOT v1.2's `<installRoot>/gomad/agents/`).

---

### `docs/reference/skills.md` (content, reference + AUTO marker, grouped)

**Analogs:** Same as `agents.md` plus `docs/_STYLE_GUIDE.md` lines 277-285 (Comprehensive Reference Guide template — closest match for "grouped by phase").

**Grouping pattern** (D-08 — five `##` sections):
```markdown
## 1. Analysis
<!-- AUTO:skills-table-analysis-start -->
<!-- AUTO:skills-table-analysis-end -->

## 2. Planning
<!-- AUTO:skills-table-planning-start -->
<!-- AUTO:skills-table-planning-end -->

## 3. Solutioning
<!-- AUTO:skills-table-solutioning-start -->
<!-- AUTO:skills-table-solutioning-end -->

## 4. Implementation
<!-- AUTO:skills-table-implementation-start -->
<!-- AUTO:skills-table-implementation-end -->

## Core
<!-- AUTO:skills-table-core-start -->
<!-- AUTO:skills-table-core-end -->
```

> Marker naming above is illustrative — planner has discretion (CONTEXT D-06 just specifies the start/end pattern; per-section marker names are an implementation detail). Planner could alternatively use a single `<!-- AUTO:skills-table-* -->` block that emits all five sections at once.

**"How to invoke" column phrasing** (D-09): personas show `/gm:agent-<short>`; task-skills + core-skills show "Invoked via the agent that owns it" or similar (D-09 leaves planner discretion — RESEARCH.md "open question 3" recommends single-column "Invoked by").

**Skill-count assertion** (RESEARCH.md A4 + Source-of-Truth Inventory): 8 personas + 28 task-skills + 11 core-skills = 47 total entries when personas are included; 39 when personas live only on `/reference/agents`. CONTEXT.md says "27 skills" — RESEARCH.md flags this discrepancy; injector test asserts exact count by enumeration.

---

### `docs/explanation/architecture.md` (content, explanation)

**Analogs:**
- `docs/_STYLE_GUIDE.md` lines 156-165 (Explanation > General Template)
- `docs/upgrade-recovery.md` (shipped explanation-flavored prose, especially the "How to restore" structured walkthrough)

**Explanation template** (from `docs/_STYLE_GUIDE.md` lines 156-165):
```text
1. Title + Hook (1-2 sentences)
2. Overview/Definition (what it is, why it matters)
3. Key Concepts (### subsections)
4. Comparison Table (optional)
5. When to Use / When Not to Use (optional)
6. Diagram (optional - mermaid, 1 per doc max)
7. Next Steps (optional — but no "Related/Next" per project rule)
```

**Phase 11 content envelope** (DOCS-04, RESEARCH.md): "4-phase workflow + manifest-v2 installer + launcher-form slash commands". Content sources verified: `CHANGELOG.md` v1.2 entry already has shippable prose for launcher-form mechanics.

**Frontmatter:**
```markdown
---
title: "GoMad Architecture"
description: How GoMad's 4-phase workflow, manifest-v2 installer, and launcher slash commands fit together.
sidebar:
  order: 1
---
```

---

### `docs/index.md` (REWRITE — landing page)

**Analog:** Current `docs/index.md` (the file being replaced — its frontmatter shape and overall structure are already correct, only the content references stale BMAD artifacts).

**Frontmatter pattern from current file** (lines 1-4):
```markdown
---
title: GoMad
description: Agentic workflow framework for AI-driven agile development
---
```

**Optional `splash` template** (from `docs/404.md` lines 1-4):
```markdown
---
title: GoMad
template: splash
---
```
> Per RESEARCH.md Pattern 1 table line 274: index.md may use `template: splash` for landing layout. Planner discretion.

**Sections-to-rewrite delta from current** (lines 41-46):
- DELETE links to BMAD-era pages (`./tutorials/getting-started.md`, `./how-to/install-gomad.md`, `./explanation/analysis-phase.md`)
- REPLACE with v1.3 pages (`./tutorials/install.md`, `./tutorials/quick-start.md`, `./reference/agents.md`, `./reference/skills.md`, `./explanation/architecture.md`, `./how-to/contributing.md`)

**Critical link-check constraint** (RESEARCH.md Pitfall 4): `validate-doc-links.js` runs as build gate (step 1 of `build-docs.mjs`). Index links must point only to (a) pages that exist or (b) external URLs. The cleanup commit MUST rewrite `index.md` in the same commit it deletes the BMAD pages, otherwise build breaks.

---

### `docs/roadmap.mdx` (REWRITE-OR-DELETE per D-03)

**If DELETED** (RESEARCH.md "Open Question 1" recommendation):
- Also remove sidebar entry from `website/astro.config.mjs` lines 96-100 (the `slug: 'roadmap'` block) in the same commit, or Starlight warns about a missing slug.
- Same for `docs/zh-cn/roadmap.mdx`.

**If REWRITTEN** as a thin pointer:
- Frontmatter analog: `docs/404.md` (minimal frontmatter)
- Body: single paragraph + link to `https://github.com/xgent-ai/gomad/blob/main/.planning/ROADMAP.md`

> Planner picks. RESEARCH.md recommends DELETE.

---

### `tools/inject-reference-tables.cjs` (NEW — build-time auto-gen tool)

**Analog:** `tools/validate-skills.js` (full file 1-739).

**Imports + project-root pattern** (from `validate-skills.js` lines 30-34):
```javascript
const fs = require('node:fs');
const path = require('node:path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const SRC_DIR = path.join(PROJECT_ROOT, 'src');
```

**Frontmatter parser to REUSE** (from `validate-skills.js` lines 106-151) — exported at line 739:
```javascript
// validate-skills.js line 739:
module.exports = { parseFrontmatter, parseFrontmatterMultiline, validateSkill, discoverSkillDirs };
```

Inject script reuses via:
```javascript
const { parseFrontmatterMultiline } = require('./validate-skills.js');
```

**Why it's safe to require from a sibling** (from `validate-skills.js` lines 699, 738-739): The `if (require.main === module)` guard at line 699 means `main()` does NOT execute when the file is `require()`-d — only the exports surface. `[VERIFIED via Read]`

**Skill-discovery pattern with domain-kb skip** (from `validate-skills.js` lines 190-221):
```javascript
function discoverSkillDirs(rootDirs) {
  const skillDirs = [];

  function walk(dir) {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (entry.name === 'node_modules' || entry.name === '.git') continue;
      // domain-kb/ uses a different SKILL.md contract (KB pack frontmatter:
      // source/license/last_reviewed) validated by tools/validate-kb-licenses.js.
      if (entry.name === 'domain-kb') continue;

      const fullPath = path.join(dir, entry.name);
      const skillMd = path.join(fullPath, 'SKILL.md');

      if (fs.existsSync(skillMd)) {
        skillDirs.push(fullPath);
      }

      // Keep walking into subdirectories to find nested skills
      walk(fullPath);
    }
  }

  for (const rootDir of rootDirs) {
    walk(rootDir);
  }

  return skillDirs.sort();
}
```

> **Critical** (RESEARCH.md Pitfall 6): Inject MUST keep the `entry.name === 'domain-kb' continue;` guard — KB packs use a different `SKILL.md` contract and would corrupt the skills table.

**Table-cell escaping pattern** (from `validate-skills.js` lines 57-59):
```javascript
function escapeTableCell(str) {
  return String(str).replaceAll('|', String.raw`\|`);
}
```

**Safe file read pattern** (from `validate-skills.js` lines 166-180):
```javascript
function safeReadFile(filePath, findings, relFile) {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch (error) {
    findings.push({
      rule: 'READ-ERR',
      title: 'File Read Error',
      severity: 'MEDIUM',
      file: relFile || path.basename(filePath),
      detail: `Cannot read file: ${error.message}`,
      fix: 'Check file permissions and ensure the file exists.',
    });
    return null;
  }
}
```
> Adapt for inject script: throw on error rather than collect findings (no validation report; just propagate failure to halt build).

**Main entry guard pattern** (from `validate-skills.js` line 699):
```javascript
if (require.main === module) {
  // ... CLI handling ...
  process.exit(STRICT && hasHighPlus ? 1 : 0);
}

module.exports = { parseFrontmatter, parseFrontmatterMultiline, validateSkill, discoverSkillDirs };
```

Inject script equivalent:
```javascript
if (require.main === module) main();

module.exports = { injectBetweenMarkers, discoverSkillsRecursive, renderAgentsTable, renderSkillsTable };
```

**`yaml` package usage for `skill-manifest.yaml`** (RESEARCH.md "Open Question 3"): `yaml` is pre-allowed (CONTEXT.md "Established Patterns" line 128). Use it to read `displayName`, `title`, `icon` from `skill-manifest.yaml` for the personas table. Task-skills have no manifest — fallback to SKILL.md `name` only.

**Marker substitution pattern** (RESEARCH.md Pattern 2, lines 358-364):
```javascript
function injectBetweenMarkers(source, startMarker, endMarker, replacement) {
  const startRe = new RegExp(`(<!--\\s*${startMarker}\\s*-->)[\\s\\S]*?(<!--\\s*${endMarker}\\s*-->)`);
  if (!startRe.test(source)) {
    throw new Error(`Markers ${startMarker}/${endMarker} not found — cannot inject.`);
  }
  return source.replace(startRe, `$1\n${replacement}\n$2`);
}
```

**Idempotency contract** (RESEARCH.md line 370 + Pitfall 1): re-running on already-injected source produces byte-identical output. Test must assert this.

---

### `test/test-inject-reference-tables.js` (NEW — recommend this path, not `tools/__tests__/`)

**Analog:** `test/test-rehype-plugins.mjs` lines 1-50 (test framework convention for the repo).

**Header + imports pattern** (from `test/test-rehype-plugins.mjs` lines 1-21):
```javascript
/**
 * Inject Reference Tables Tests
 *
 * Tests for tools/inject-reference-tables.cjs:
 * - parseFrontmatterMultiline reuse via require
 * - discoverPersonas finds exactly 8 personas
 * - discoverSkills returns expected counts per phase
 * - renderAgentsTable column layout (4 columns per D-07)
 * - renderSkillsTable grouping (Analysis/Planning/Solutioning/Implementation/Core per D-08)
 * - injectBetweenMarkers idempotency (re-run produces byte-identical output)
 * - injectBetweenMarkers throws when markers absent
 * - escapeTableCell escapes pipes
 * - domain-kb skip guard
 *
 * Usage: node test/test-inject-reference-tables.js
 */

const path = require('node:path');
const inject = require('../tools/inject-reference-tables.cjs');
```

**Assert helper + colored output** (from `test/test-rehype-plugins.mjs` lines 23-49):
```javascript
const colors = {
  reset: '[0m',
  green: '[32m',
  red: '[31m',
  yellow: '[33m',
  cyan: '[36m',
  dim: '[2m',
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

**Repo test convention:** Tests run as `node test/test-*.{js,mjs}` — no Jest, no Vitest, no `node:test`. Use plain `assert(condition, name)` calls and `process.exit(failed > 0 ? 1 : 0)`. `[VERIFIED via Read of test-rehype-plugins.mjs and grep of package.json scripts]`

> **Test placement note:** RESEARCH.md "Wave 0 Gaps" line 894-898 also mentions `test/test-inject-reference-tables.js`, `test/test-zh-cn-parity.js`, and (optional) `test/test-doc-style.js`. Recommend planner add all three under `test/` to match every other repo test.

---

### `tools/build-docs.mjs` (PATCH — wire in inject step)

**Analog (in-file):** `tools/build-docs.mjs` lines 455-467 (`checkDocLinks` function — the canonical pattern for invoking a CJS sibling tool from this ESM orchestrator).

**Existing execSync pattern to copy** (from `tools/build-docs.mjs` lines 455-467):
```javascript
function checkDocLinks() {
  printHeader('Checking documentation links');

  try {
    execSync('node tools/validate-doc-links.js', {
      cwd: PROJECT_ROOT,
      stdio: 'inherit',
    });
  } catch {
    console.error('\n  [31m✗[0m Link check failed - fix broken links before building\n');
    process.exit(1);
  }
}
```

**Phase 11 add** — new function in same shape:
```javascript
function injectReferenceTables() {
  printHeader('Injecting auto-generated reference tables');

  try {
    execSync('node tools/inject-reference-tables.cjs', {
      cwd: PROJECT_ROOT,
      stdio: 'inherit',
    });
  } catch {
    console.error('\n  [31m✗[0m Reference table injection failed\n');
    process.exit(1);
  }
}
```

**Pipeline insertion point** (RESEARCH.md "Critical ordering" line 185):
- Current `main()` at lines 55-79: `checkDocLinks() → cleanBuildDirectory() → generateArtifacts() → buildAstroSite()`
- New: insert `injectReferenceTables()` BEFORE `checkDocLinks()` at line 70 — because rendered tables contain links the validator must see.

**Edit shape** (modify `main()` at line 70):
```javascript
async function main() {
  // ... platform check + banner (lines 56-67) ...

  // NEW: regenerate auto-gen tables BEFORE link-check
  injectReferenceTables();

  // EXISTING:
  checkDocLinks();
  cleanBuildDirectory();
  // ...
}
```

**`LLM_EXCLUDE_PATTERNS` edit** (Claude's discretion per CONTEXT.md last bullet under §"Claude's Discretion"):

Lines 34-43 currently:
```javascript
const LLM_EXCLUDE_PATTERNS = [
  'changelog',
  'ide-info/',
  'v4-to-v6-upgrade',     // STALE — drop
  'faq',
  'reference/glossary/',
  'explanation/game-dev/', // STALE — drop
  'bmgd/',                  // STALE — drop
];
```

Recommended after cleanup commit (RESEARCH.md "LLM_EXCLUDE_PATTERNS Audit"):
```javascript
const LLM_EXCLUDE_PATTERNS = [
  'changelog',
  'ide-info/',
  'faq',
  'reference/glossary/',
];
```

---

### zh-cn pages (6 files: tutorials/install + quick-start, how-to/contributing, reference/agents + skills, explanation/architecture)

**Analog:** EN sibling page authored in the same plan (per D-13 EN-first sequencing).

**Pattern** (RESEARCH.md Pattern 3, lines 376-388):
```markdown
---
title: "安装 GoMad"
description: 在你的项目中安装 GoMad 的分步指南
sidebar:
  order: 1
---

中文正文…
```

**Translation behavior:**
- Frontmatter `title` and `description` MUST be translated (these surface in sidebar + meta tags).
- `sidebar.order` MUST mirror the EN sibling (so localized sidebar order matches).
- Body prose is translated.
- Code blocks (shell commands, paths, frontmatter examples) stay in English.
- For `reference/agents.md` and `reference/skills.md` — the AUTO marker block stays in English (the injector populates English data; D-14 accepts iterate-and-patch for localized persona names).

**zh-cn parity invariant** (DOCS-06): every file in `docs/{tutorials,how-to,reference,explanation}/` MUST have a matching `docs/zh-cn/<same-path>` (RESEARCH.md Pitfall 2 — fallback to EN looks like a working zh-cn page).

---

## Shared Patterns

### Frontmatter (all content pages)

**Source:** `node_modules/@astrojs/starlight/schema.ts` (Starlight 0.37.5 docsSchema), shipped pages in `docs/`.

**Apply to:** All 12 NEW pages + 2 REWRITES (index, roadmap if kept).

**Required:** `title` (string)
**Recommended:** `description` (string, ~150-160 chars), `sidebar: { order: N }`
**Optional:** `template: splash` (only for landing/index/404), `tableOfContents`, `lastUpdated`, `draft`

**Per-page sidebar.order** (RESEARCH.md table line 268-275):

| Page | order |
|------|-------|
| tutorials/install.md | 1 |
| tutorials/quick-start.md | 2 |
| how-to/contributing.md | 1 (only how-to in v1.3) |
| reference/agents.md | 1 |
| reference/skills.md | 2 |
| explanation/architecture.md | 1 |

### Admonitions (all content pages)

**Source:** `docs/_STYLE_GUIDE.md` lines 22-49.

**Apply to:** All content pages with callouts.

**Syntax:**
```markdown
:::tip[Title]
Shortcuts, best practices
:::

:::note[Title]
Context, definitions, examples, prerequisites
:::

:::caution[Title]
Caveats, potential issues
:::

:::danger[Title]
Critical warnings only — data loss, security issues
:::
```

**Cap:** 1-2 per section (tutorials may use 3-4 per major section). NOT Markdown blockquote callouts.

### v1.3 path references (all content pages mentioning install paths)

**Source:** CONTEXT.md D-10, canonical refs lines 99-103.

**Apply to:** install tutorial, quick-start tutorial, agents reference, architecture explainer, contributing how-to (anywhere persona/skill/manifest paths appear).

**Use:**
- `<installRoot>/_config/agents/<shortName>.md` (NOT `<installRoot>/gomad/agents/`)
- `<installRoot>/_config/kb/<slug>/`
- `<installRoot>/_config/files-manifest.csv`
- `.claude/commands/gm/agent-*.md`

**Anti-pattern** (RESEARCH.md "Anti-Patterns" line 401): never write `<installRoot>/gomad/agents/<x>.md` — that is the v1.2 path. DOCS-07 in Phase 12 catches leaks; Phase 11 should not author them in the first place.

### Style-guide guardrails (all content pages)

**Source:** `docs/_STYLE_GUIDE.md` lines 10-20.

**Apply to:** All NEW + REWRITTEN pages.

**Forbidden:**
- Horizontal rules (`---`) outside frontmatter
- `####` headers (use bold or admonitions)
- "Related" / "Next:" sections (sidebar handles navigation)
- Deeply nested lists
- Code blocks for non-code (use admonitions)
- Bold paragraphs as callouts (use admonitions)

**Budgets:**
- 8-12 `##` per doc
- 2-3 `###` per section
- 1-2 admonitions per section (tutorials: 3-4 per major section)
- Table cells / list items: 1-2 sentences max

### CommonJS tooling convention (new tools)

**Source:** `tools/validate-skills.js`, `tools/fix-doc-links.js`, `tools/validate-file-refs.js` — all `.js` (CJS).

**Apply to:** `tools/inject-reference-tables.cjs`.

**Pattern:**
- `require()` not `import`
- `module.exports = { ... }` at bottom
- `if (require.main === module) main();` guard for CLI entry
- `node:fs`, `node:path`, `node:child_process` imports (Node-prefixed)
- Exit codes: `0` success, `1` validation/operation failure, `2` invalid CLI args

**Note on file extension:** RESEARCH.md "Open Question 2" recommends `.cjs` extension (vs `.js`) to make ESM-vs-CJS explicit since `build-docs.mjs` is ESM. Other repo tools use bare `.js` and rely on default CJS — both work given `package.json` has no `"type": "module"`. Planner discretion; `.cjs` is RESEARCH.md's recommendation and matches CONTEXT.md's referenced file name.

### Cleanup pattern (deletion of 53 BMAD files)

**Source:** D-04 (CONTEXT.md line 23) + RESEARCH.md "Existing BMAD Content Audit" lines 657-723.

**Apply to:** First plan in Phase 11 (cleanup-before-authoring).

**Mechanic:** Plain `git rm` or `fs.rmSync` — no analog needed. Files to delete are statically enumerated in RESEARCH.md (53 paths). No tool authoring required for cleanup.

**Coupled edits in same cleanup commit:**
1. Delete 53 BMAD `.md` files (27 EN + 26 zh-cn).
2. Rewrite `docs/index.md` and `docs/zh-cn/index.md` (otherwise link-check fails — RESEARCH.md Pitfall 4).
3. Rewrite OR delete `docs/roadmap.mdx` and `docs/zh-cn/roadmap.mdx` (D-03).
4. If roadmap deleted: remove `slug: 'roadmap'` block from `website/astro.config.mjs` lines 96-100.
5. (Optional, Claude's discretion): drop stale `LLM_EXCLUDE_PATTERNS` entries in `tools/build-docs.mjs` lines 37, 40, 41.

---

## NEW Pattern: HTML Comment Markers for Build-Time Injection

> **No existing analog in `docs/`.** Verified: `grep '<!--' docs/` returned only references in this Phase 11's own RESEARCH.md, NOT in any actual shipped doc page. This is a NEW pattern introduced by Phase 11 (D-06).

**Pattern format** (CONTEXT.md D-06):
```markdown
<!-- AUTO:agents-table-start -->
[content auto-generated by tools/inject-reference-tables.cjs — do not edit]
<!-- AUTO:agents-table-end -->
```

**Pattern variants** for skills.md (per phase):
- `AUTO:skills-table-start` / `AUTO:skills-table-end` (single-block layout)
- OR per-phase: `AUTO:skills-table-analysis-{start,end}`, etc. (planner discretion per D-08)

**Properties:**
- Markers are visible in source — authors see them; manual edits OUTSIDE markers survive regeneration
- Idempotent — re-running injector twice produces byte-identical output (asserted by test)
- Build-time only — no runtime layer; markers + content are in source `.md`, Astro consumes the post-replacement file
- Carries through to `llms-full.txt` naturally (the post-replacement source IS the canonical artifact)

**Authoring rule** (Anti-Patterns line 402): NEVER hand-edit content between markers — overwritten on next build. Author only OUTSIDE the marker block.

**Implementation regex** (RESEARCH.md Pattern 2 lines 358-364): non-greedy `[\s\S]*?` between marker comments, replace span:
```javascript
const re = new RegExp(`(<!--\\s*${startMarker}\\s*-->)[\\s\\S]*?(<!--\\s*${endMarker}\\s*-->)`);
```

This pattern is novel to this repo. Once shipped, future docs (e.g., `/reference/commands` if added later) can reuse the same injector by adding new marker pairs.

---

## No Analog Found

No file in this phase lacks an analog. The only NEW conceptual pattern (HTML comment marker injection) is documented above with regex + algorithm spec. All other files have either:
- An exact in-repo analog (validate-skills.js, build-docs.mjs `checkDocLinks`, current docs/index.md, docs/upgrade-recovery.md, docs/404.md), OR
- A 1:1 EN-sibling analog (zh-cn pages), OR
- A style-guide template analog (docs/_STYLE_GUIDE.md tutorial / how-to / explanation templates).

---

## Metadata

**Analog search scope:**
- `tools/` — CJS tooling conventions, frontmatter parser, exit codes, build pipeline orchestration
- `docs/` — frontmatter shapes of shipped (KEEP) pages, style-guide templates, marker pattern existence check
- `test/` — repo test convention (no Jest/Vitest; plain `node test/*.js`)
- `website/astro.config.mjs` — Starlight sidebar config, locales config, head meta tags
- `src/gomad-skills/4-implementation/gm-agent-solo-dev/` — sample persona SKILL.md + skill-manifest.yaml frontmatter shape
- `src/core-skills/gm-help/` — sample core-skill SKILL.md frontmatter shape
- `package.json` — npm script naming conventions for `docs:*`, `validate:*`, `test:*`

**Files scanned (Read tool):** 9 — validate-skills.js, build-docs.mjs, _STYLE_GUIDE.md, upgrade-recovery.md, 404.md, index.md, gm-agent-solo-dev/SKILL.md, gm-agent-solo-dev/skill-manifest.yaml, gm-help/SKILL.md, astro.config.mjs, test-rehype-plugins.mjs (partial).

**Files scanned (Grep/Bash):** 4 directory listings, 1 marker-existence search across `docs/`, 1 package.json scripts dump.

**Pattern extraction date:** 2026-04-26.
