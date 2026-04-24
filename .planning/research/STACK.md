# Stack Research — v1.3 Marketplace, Docs & Story Context

**Domain:** CLI tool + skills distribution (Node.js, CommonJS) + static docs site (Astro/Starlight) + Claude Code plugin marketplace
**Researched:** 2026-04-24
**Confidence:** HIGH (Context7-equivalent authoritative docs fetched from code.claude.com; existing repo state verified via direct file reads)

**Scope guardrail.** This research is strictly for v1.3 workstreams. v1.1 fork mechanics (package identity, LICENSE, bilingual docs) and v1.2 infrastructure (launcher-form slash commands, copy-only installer, manifest v2, csv-parse/sync pattern) are SHIPPED and NOT re-evaluated. Zero-new-deps policy is load-bearing for v1.2→v1.3 continuity.

---

## TL;DR

**Zero new runtime dependencies for v1.3.** Every workstream is implementable with already-installed packages plus Node built-ins:

1. **marketplace.json refresh** — pure JSON rewrite against the current Claude Code schema; `strict: false` + directory-form skills array.
2. **GitHub Pages docs** — existing `.github/workflows/docs.yaml` already correct; add `website/public/CNAME` + set `SITE_URL` GitHub repo variable. No `gh-pages` npm dep.
3. **Domain-KB retrieval** — hand-rolled BM25 (~50 LOC) over `fs-extra` + `glob`. No `lunr`/`minisearch`/`fuse.js`.
4. **`gm-discuss-story` skill** — mirror `gm-create-story/` structure (SKILL.md + workflow.md + template.md + optional discover-inputs.md). No skill-manifest.yaml needed (that's only for agent skills).
5. **Agent-dir migration test infra** — extend existing `test-gm-command-surface.js` Phase-C pattern + write a new `test-legacy-v12-upgrade.js` by cloning `test-legacy-v11-upgrade.js`. Pure additions in CommonJS using `assert()` + `fs-extra` + `node:child_process.execSync`.

---

## Recommended Stack

### Core Technologies (no changes)

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Node.js | `>=20.0.0` (unchanged) | Runtime | Already pinned in `engines`; v1.2 baseline. v20 LTS has stable `fs.promises`, `node:path`, `node:os`, Array methods used below. |
| JavaScript (CommonJS) | ES2022+ via Node 20 | Module system | v1.2 locked this in. All installer code uses `require()`; do NOT mix ESM into new v1.3 installer/test files. |
| `csv-parse/sync` | `^6.1.0` (installed) | Manifest v2 read/write | Symmetric read (parse) + hand-rolled `escapeCsv` (3 LOC) per v1.2 D. Reuse exactly this pattern for any v1.3 manifest extension. |
| `fs-extra` | `^11.3.0` (installed) | Filesystem ops (copy, ensureDir, pathExists, remove, readFile, writeFile) | v1.2 installer standard. All v1.3 path-move + KB-install code uses this, NOT `node:fs` directly. |
| `yaml` / `js-yaml` | `yaml@^2.7.0` (installed); `js-yaml` transitive | Skill manifest / frontmatter parsing | `yaml@^2.7.0` used in `agent-command-generator.js` (installer); `js-yaml` used in `test-gm-command-surface.js` (tests). Match the surrounding file. |
| `glob` | `^11.0.3` (installed) | Directory scanning | `globSync` used in test harnesses. Reuse for KB file enumeration. |
| `semver` | `^7.6.3` (installed) | Version comparison | Reuse for v1.2→v1.3 upgrade detection if needed. |

### Website Stack (no changes — docs build-out only)

| Technology | Version (installed) | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `astro` | `^5.16.0` | Static site generator | Already configured at `website/astro.config.mjs`; outputs `build/site/`. No replacement for v1.3. |
| `@astrojs/starlight` | `^0.37.5` | Docs theme | Diataxis sidebar already wired (Tutorials / How-To / Explanation / Reference). v1.3 fills content. |
| `@astrojs/sitemap` | `^3.6.0` | Sitemap generation | Already integrated; filters 404 locale pages. No config change. |
| GitHub Actions + `actions/deploy-pages@v4` | existing `.github/workflows/docs.yaml` | GH Pages deploy | **Already correctly set up** — triggers on push to `main` under `docs/**` or `website/**`. The "manual deploy" framing in the milestone brief is resolved by the existing gated push-to-main flow; no `gh-pages` package needed. |

### Supporting Libraries (v1.3 additions — NONE)

**Zero new runtime deps.** Every v1.3 workstream is implementable with already-installed packages + Node built-ins. Per-workstream decisions in the next section.

| Library | Decision | Rationale |
|---------|----------|-----------|
| `lunr`, `minisearch`, `fuse.js`, `flexsearch`, `@wink/nlp` | **REJECT** | Domain-KB retrieval uses hand-rolled BM25 over `fs-extra` + `glob`. None of these are installed; adding violates zero-new-deps. See Workstream 3. |
| `gh-pages` (npm) | **REJECT** | `actions/deploy-pages@v4` already shipped in `.github/workflows/docs.yaml`. |
| `gray-matter` | **REJECT** | Frontmatter extraction already established via `raw.match(/^---\n([\s\S]*?)\n---/)` + `yaml.parse()` / `js-yaml.load()` — pattern lives in `test-gm-command-surface.js:78` and `agent-command-generator.js:98`. |
| `ajv` / `zod` / JSON-schema validator | **DEFER** | `claude plugin validate .` is the runtime authority. CI-side structural check (field-presence + `JSON.parse`) doesn't need a schema library. |

### Development Tools (no changes)

| Tool | Purpose | Notes |
|------|---------|-------|
| `prettier@^3.7.4` | Format check | `format:check` runs on `.{js,cjs,mjs,json,yaml}` — extends to `.claude-plugin/marketplace.json` automatically. |
| `eslint@^9.33.0` | Lint | `.js,.cjs,.mjs,.yaml` coverage unchanged. |
| `markdownlint-cli2@^0.19.1` | Markdown lint | Runs on `**/*.md` — extends to new `gm-discuss-story/` files and `src/domain-kb/*.md` seed packs. |
| `astro dev/build/preview` | Docs workflow | Already scripted in `package.json` (`docs:dev`, `docs:build`, `docs:preview`). |

---

## Workstream-specific breakdowns

### 1. Plugin marketplace refresh — `.claude-plugin/marketplace.json`

**Current state (broken / stale).** Existing file is BMAD-branded (`"name": "bmad-method"`, `"owner": "Brian (BMad) Madison"`, paths under `./src/bmm-skills/`, individual SKILL.md paths per skill). Needs full rewrite.

**Current Claude Code schema (authoritative, 2026-04 fetch).** Source: <https://code.claude.com/docs/en/plugin-marketplaces>.

**Required root fields:**
- `name` — kebab-case identifier. Public-facing (users type `/plugin install foo@<name>`).
- `owner` — object with required `name`, optional `email`.
- `plugins` — array of plugin entries.

**Reserved-name check.** `"gomad"` is NOT on the blocked list (`claude-code-marketplace`, `claude-code-plugins`, `claude-plugins-official`, `anthropic-marketplace`, `anthropic-plugins`, `agent-skills`, `knowledge-work-plugins`, `life-sciences`, plus anti-impersonation patterns). Safe.

**Optional root fields used by v1.3:**
- `metadata.description` — brief description (validator emits warning if missing).
- `metadata.version` — marketplace version string.
- `metadata.pluginRoot` — base dir prefixed to relative plugin sources (optional simplifier).

**Per-plugin entry (required):** `name` (kebab-case), `source` (string starting with `./` for same-repo relative paths, or object for `github`/`url`/`git-subdir`/`npm`).

**Per-plugin entry (optional, relevant for v1.3):**
- `description`, `version`, `author{name,email}`, `homepage`, `repository`, `license`, `keywords`, `category`, `tags`.
- `skills` — string or array of paths to directories that contain `<name>/SKILL.md` subdirs. **NOT** an array of paths to individual SKILL.md files; points at the *parent* dir.
- `commands` — string/array of paths to flat `.md` files or dirs.
- `agents` — string/array of paths to agent `.md` files.
- `strict` — boolean. `true` (default) → `plugin.json` is authority. `false` → marketplace entry IS the definition (no `plugin.json` needed).

**Recommended shape for GoMad v1.3.** Three plugins matching the v1.2 layout (gm-agent-* launchers / gomad-skills workflow / core-skills):

```json
{
  "name": "gomad",
  "owner": { "name": "Rockie Guo", "email": "rockie@kitmi.com.au" },
  "metadata": {
    "description": "GOMAD Orchestration Method for Agile Development — full-lifecycle agentic workflow framework forked from BMAD Method.",
    "version": "1.3.0"
  },
  "plugins": [
    {
      "name": "gomad-agents",
      "source": "./",
      "description": "8 canonical GoMad agent personas (analyst, tech-writer, pm, ux-designer, architect, sm, dev, solo-dev) — invoked as /gm:agent-*.",
      "version": "1.3.0",
      "author": { "name": "Rockie Guo" },
      "license": "MIT",
      "keywords": ["gomad", "agents", "personas"],
      "strict": false,
      "agents": ["./src/gomad-skills/1-analysis/gm-agent-analyst/", "./src/gomad-skills/1-analysis/gm-agent-tech-writer/", "./src/gomad-skills/2-plan-workflows/gm-agent-pm/", "./src/gomad-skills/2-plan-workflows/gm-agent-ux-designer/", "./src/gomad-skills/3-solutioning/gm-agent-architect/", "./src/gomad-skills/4-implementation/gm-agent-sm/", "./src/gomad-skills/4-implementation/gm-agent-dev/", "./src/gomad-skills/4-implementation/gm-agent-solo-dev/"]
    },
    {
      "name": "gomad-skills",
      "source": "./",
      "description": "Full-lifecycle gm-* workflow skills spanning analysis, planning, solutioning, and implementation.",
      "version": "1.3.0",
      "author": { "name": "Rockie Guo" },
      "license": "MIT",
      "keywords": ["gomad", "workflow", "prd", "story", "architecture"],
      "strict": false,
      "skills": ["./src/gomad-skills/1-analysis/", "./src/gomad-skills/2-plan-workflows/", "./src/gomad-skills/3-solutioning/", "./src/gomad-skills/4-implementation/"]
    },
    {
      "name": "gomad-core",
      "source": "./",
      "description": "Core utility skills — brainstorming, elicitation, editorial review, document sharding, indexing, distillator.",
      "version": "1.3.0",
      "author": { "name": "Rockie Guo" },
      "license": "MIT",
      "keywords": ["gomad", "core", "utilities"],
      "strict": false,
      "skills": ["./src/core-skills/"]
    }
  ]
}
```

**Notes on the shape:**
- All three plugins use `"source": "./"` because the marketplace lives in the same repo as the plugin files — the marketplace root IS the repo root.
- `skills` arrays use **directory form** (points at the parent containing `<name>/SKILL.md`), not individual SKILL.md paths. This is cleaner than the current BMAD file's per-skill array.
- `agents` for `gomad-agents` plugin: GoMad agents live inside `src/gomad-skills/<phase>/gm-agent-<name>/` as SKILL-based skills (not plain agent.md files). The marketplace `agents` field expects agent-file paths. **Confirm during Phase 10 whether the Claude Code marketplace accepts directory paths for `agents` the same way `skills` does, or whether a dedicated `agents/` dir with flat `.md` files must be provided.** If flat `.md` required, the installer already produces them at install time under `.claude/commands/gm/agent-*.md` — so in practice `agents` may not be the right field for GoMad's launcher model, and the launcher commands are better exposed via `commands:` or simply discovered by Claude Code from `.claude/commands/` at install time.
- **Fallback if `agents` field shape is wrong for GoMad:** drop the `gomad-agents` plugin from marketplace.json entirely and rely on the installer's existing launcher-stub emission into `.claude/commands/gm/agent-*.md`. The marketplace then distributes skills; launchers come from `gomad install`. **Decide this during Phase 10 implementation.**

**Critical gotchas.**
1. **Paths relative to marketplace root**, not to `.claude-plugin/`. Current BMAD file got this right; preserve.
2. **Paths cannot contain `..`**. Validator error: `plugins[0].source: Path contains ".."`.
3. **Relative paths only work with git-based marketplaces**, not URL-based. Fine for GoMad.
4. **`strict: false` required** — GoMad has no per-plugin `.claude-plugin/plugin.json` files; marketplace entry must be authoritative.
5. **Duplicate plugin `name` across entries** → validator fails with `Duplicate plugin name "x"`. Ensure `gomad-agents`, `gomad-skills`, `gomad-core` are distinct.
6. **kebab-case enforcement** — validator warns on non-kebab-case; Claude.ai sync rejects. All three recommended names comply.

**Version-pin strategy.** Set `"version": "1.3.0"` on every plugin entry (matches `package.json` version). Bump on every GoMad release. Do NOT omit — if omitted, every git commit is a new version and users get plugin re-downloads on every merge to main.

**$schema URL.** No official JSON schema URL published. Validation is via `claude plugin validate .`.

---

### 2. GitHub Pages + Astro @ `gomad.xgent.ai`

**Recommended: keep the existing GitHub Actions deploy.** Nothing to add to the build pipeline; the workflow is already correct 2026 Astro 5.x + GH Pages practice.

**Why not `gh-pages` npm package?** New runtime dep for something already solved by CI. Violates zero-new-deps.

**Why not the manual `docs/` folder approach?** Astro outputs `build/site/`; serving it from `docs/` either requires renaming (naming clash with existing content-source `docs/` dir) or a `gh-pages` branch (more moving parts than the Actions flow). Both worse.

**Required changes for custom subdomain deployment.**

1. **Add `website/public/CNAME`** — file does NOT currently exist (verified via `ls website/public/`).
   ```
   gomad.xgent.ai
   ```
   Astro copies `public/*` verbatim to build output. GitHub Pages reads the CNAME at the output root.

2. **Set `SITE_URL=https://gomad.xgent.ai`** as a GitHub repository variable (Settings → Secrets and variables → Actions → Variables).

   The existing `.github/workflows/docs.yaml:47` already plumbs `vars.SITE_URL` into `SITE_URL` env. And `website/src/lib/site-url.mjs` uses that env value first (preference order: `SITE_URL` → `GITHUB_REPOSITORY` auto-derive → `http://localhost:3000`).

   With `SITE_URL=https://gomad.xgent.ai`:
   - `astro.config.mjs` computes `site: "https://gomad.xgent.ai/"`, `base: "/"`.
   - Exactly what Astro's custom-domain GH Pages guide prescribes.

3. **DNS at the `xgent.ai` registrar.** CNAME record: `gomad` → `<github-username>.github.io` (or apex A records). Not a repo-file change, but flagged to ensure it's not missed.

4. **GitHub Pages source config.** Repo Settings → Pages → Build and deployment → Source = "GitHub Actions" (not "Deploy from a branch"). The `actions/deploy-pages@v4` action requires the Actions source.

**Gotchas.**
- **First HTTPS deploy** with a new CNAME: GitHub Pages provisions Let's Encrypt cert over 5–10 min. Expect a brief window of "your certificate is still being generated" / HTTPS errors.
- **`base: "/"` vs repo-subdir**: With a custom domain, `base` MUST be `/`. The existing `site-url.mjs` + `astro.config.mjs` logic handles this correctly when `SITE_URL` is set.
- **Rehype plugins** (`rehypeMarkdownLinks`, `rehypeBasePaths` in `astro.config.mjs`) rewrite internal links using `base`. No v1.3 change needed.
- **Concurrency in `docs.yaml`** is already set to `cancel-in-progress: false` — intentional, prevents mid-deploy cancellations. Preserve.

**Zero-new-deps compliance: YES.** CNAME file + repo variable only.

**Anti-pick.** `npx gh-pages -d build/site` from laptop — bypasses CI, loses provenance, requires dev-local auth. Existing workflow strictly better.

---

### 3. Domain-KB retrieval — zero-dep grep-style + "more powerful" search

**Requirement recap.** `gm-domain-skill` receives a domain slug, scans `<installRoot>/_config/kb/<slug>/*.md`, returns single best-match file content. Caller is LLM-driven workflow; accuracy needs to beat naive substring but doesn't need full inverted index at scale (seed corpus is 2 packs × handful of files).

**Recommendation: hand-rolled BM25 (k1=1.2, b=0.75) over Node built-ins + `fs-extra` + `glob`.** ~50 LOC.

**Why not `lunr`?** Runtime dep (~30KB, transitive deps); overkill for <1000-file corpora; not installed (confirmed via `package.json` audit); violates zero-new-deps.

**Why not `minisearch` / `fuse.js` / `flexsearch`?** Same zero-new-deps blocker. `fuse.js` is fuzzy-first, which actually underperforms keyword-dominant domain queries (e.g. "React useEffect cleanup" wants exact-term boost, not similarity).

**Why not shell-out to `grep`?** Windows portability — v1.1/v1.2 made Windows-safety load-bearing (dash form for agent dirs, no colon-in-filenames). `grep` is not guaranteed on bare Windows. Also `grep -l` returns unranked matches; ranking IS the problem.

**Algorithm (~50 LOC, CommonJS, zero new deps):**

```javascript
// tools/installer/lib/kb-search.js  (NEW FILE)
const fs = require('fs-extra');
const { globSync } = require('glob');

function tokenize(text) {
  return text.toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length >= 3);
}

/**
 * Return the single best-matching .md file from kbDir for the given query, or null.
 * Uses BM25 (k1=1.2, b=0.75) over token-overlap; ignores tokens <3 chars.
 *
 * @param {string} kbDir - absolute path to <installRoot>/_config/kb/<slug>/
 * @param {string} query - user query
 * @returns {Promise<{path: string, score: number, content: string} | null>}
 */
async function bestMatch(kbDir, query) {
  const files = globSync('*.md', { cwd: kbDir, absolute: true });
  if (files.length === 0) return null;

  const docs = await Promise.all(files.map(async (file) => {
    const content = await fs.readFile(file, 'utf8');
    return { file, content, tokens: tokenize(content) };
  }));
  const avgDocLen = docs.reduce((sum, d) => sum + d.tokens.length, 0) / docs.length;

  const queryTokens = [...new Set(tokenize(query))];
  const N = docs.length;
  const idf = Object.fromEntries(queryTokens.map((q) => {
    const n = docs.filter((d) => d.tokens.includes(q)).length;
    return [q, Math.log(1 + (N - n + 0.5) / (n + 0.5))];
  }));

  const k1 = 1.2;
  const b = 0.75;
  const scored = docs.map((d) => {
    const docLen = d.tokens.length;
    const tf = Object.fromEntries(queryTokens.map((q) => [q, 0]));
    for (const t of d.tokens) if (t in tf) tf[t]++;
    const score = queryTokens.reduce((sum, q) => {
      const f = tf[q];
      if (f === 0) return sum;
      const num = f * (k1 + 1);
      const den = f + k1 * (1 - b + b * (docLen / avgDocLen));
      return sum + idf[q] * (num / den);
    }, 0);
    return { path: d.file, score, content: d.content };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored[0] && scored[0].score > 0 ? scored[0] : null;
}

module.exports = { bestMatch, tokenize };
```

**Complexity / accuracy tradeoffs.**

| Approach | LOC | Accuracy | Speed @ 100 files | Cross-platform | Zero-dep |
|----------|-----|----------|-------------------|----------------|----------|
| Naive substring | ~10 | LOW — no ranking | O(N·M) | YES | YES |
| Word-count scoring | ~20 | MEDIUM — frequency biased toward long docs | O(N·M) | YES | YES |
| **BM25 (recommended)** | ~50 | HIGH — length-normalized, IDF-weighted | O(N·M) + sort | YES | YES |
| `lunr` inverted index | n/a (dep) | HIGH | Faster at scale | YES | **NO** |
| `grep` shell-out | ~5 | LOW — no ranking | PATH-dependent | **NO (Windows)** | YES but grep absent on Windows |

**For corpus <1000 files per domain pack, BM25 hand-roll matches `lunr` quality without a dep.**

**Integration point.** The runtime consumer is Claude Code reading `gm-domain-skill/SKILL.md` + `workflow.md`. The skill describes the retrieval algorithm in prose + worked example, and Claude executes it using its own file-reading tools. The `kb-search.js` implementation is optional "escape hatch" — ship it only if you want an external CLI (`gomad kb-search <slug> <query>`) that the skill can invoke. **Recommended: start with prose-described algorithm in the skill; add the JS helper only if measured needed.**

**Reference knowledge-pack style.** Cited refs —
- <https://github.com/NickCrew/Claude-Cortex/blob/main/skills/react-performance-optimization/SKILL.md>
- <https://github.com/vercel-labs/agent-skills/tree/main/skills/react-best-practices>

— are Claude Code Skills (SKILL.md + supporting `.md` + optional `scripts/`), NOT retrieval frameworks. They inform the *content shape* of seed KB packs under `src/domain-kb/<slug>/*.md`, not retrieval. Pack authors write flat markdown; `gm-domain-skill` does the retrieval.

**Zero-new-deps compliance: YES.** `node:path` + `fs-extra` + `glob` — all in `dependencies`.

---

### 4. `gm-discuss-story` skill structure

**Canonical reference: `gm-create-story/`** — this is the exact structure to mirror.

```
src/gomad-skills/4-implementation/gm-create-story/
├── SKILL.md            (267 bytes — frontmatter + "Follow ./workflow.md" pointer)
├── workflow.md         (19,937 bytes — step-by-step workflow)
├── template.md         (948 bytes — output template with placeholders)
├── checklist.md        (14,349 bytes — post-hoc validation)
└── discover-inputs.md  (3,911 bytes — shared input-discovery protocol)
```

**Key observation: `gm-create-story/` has NO `skill-manifest.yaml`.** Only `gm-agent-*` skills carry `skill-manifest.yaml` — they need `displayName`, `title`, `icon`, `capabilities` for launcher-stub generation per D-17/D-18 (verified in `agent-command-generator.js`). Non-agent workflow skills (`gm-create-story`, `gm-create-prd`, `gm-dev-story`, etc.) use only SKILL.md frontmatter (`name`, `description`). Do NOT add a skill-manifest.yaml to `gm-discuss-story/`.

**Recommended `gm-discuss-story/` layout:**

```
src/gomad-skills/4-implementation/gm-discuss-story/
├── SKILL.md            (frontmatter + pointer to workflow.md)
├── workflow.md         (steps: load epic+story, identify gray areas, elicit, emit {{story_key}}-context.md)
├── template.md         (output template for {{story_key}}-context.md — gray-area checklist, decisions, open questions)
└── discover-inputs.md  (OPTIONAL — can reuse gm-create-story's protocol verbatim via copy, or omit if simpler)
```

**SKILL.md frontmatter (matches gm-create-story shape):**

```markdown
---
name: gm-discuss-story
description: 'Clarifies gray areas for a planned story by writing {planning_artifacts}/{{story_key}}-context.md. Use BEFORE create-story when the story has ambiguous requirements, unresolved design questions, or cross-cutting concerns.'
---

Follow the instructions in ./workflow.md.
```

**Integration with existing `gm-create-story/workflow.md`.** The modification to auto-load `{{story_key}}-context.md` is a minimal additive edit:
- In INITIALIZATION → Paths (around line 32), add:
  ```
  - story_context = {planning_artifacts}/{{story_key}}-context.md (load if exists)
  ```
- In Step 2 or 3, add a `<check if="story_context file exists">` block that injects `{story_context_content}` into the `developer_context_section` template output.

This does NOT violate the PRD chain structural contract (PRD-01..07 target `gm-create-prd`, not `gm-create-story`). The downstream contract for `gm-create-story` is its template output going to `gm-dev-story` — template additions are backward-compatible.

**Zero-new-deps compliance: YES.** Pure markdown + existing workflow engine. No JS changes in the skill.

---

### 5. Agent-dir migration test infra

**Existing patterns to reuse (all zero-new-dep):**

1. **`test/test-gm-command-surface.js` (Phase C install-smoke) — gold standard.**
   - Packs tarball via `npm pack` (line 174–181).
   - Creates tempdir via `fs.mkdtempSync(path.join(os.tmpdir(), 'gomad-gm-surface-install-'))` (line 183).
   - Runs `npm install "<tarball>"` + `gomad install --yes --directory <tempDir> --tools claude-code` (lines 187–206).
   - **Hard-asserts presence**: `EXPECTED_AGENTS` list + `fs.existsSync` per agent (lines 214–240).
   - **Negative-asserts absence of legacy paths**: `LEGACY_AGENTS` loop (lines 244–248).
   - Cleanup in `finally` block.

   **For v1.3 agent-dir relocation**, add a Phase D (or separate test file) that asserts:
   - **Positive:** `<tempDir>/_gomad/_config/agents/<shortName>.md` exists for each of the 8 agents (new v1.3 path).
   - **Negative:** `<tempDir>/_gomad/gomad/agents/<shortName>.md` is ABSENT after a fresh v1.3 install.
   - **Launcher-stub body path:** regex-match the stub body in `.claude/commands/gm/agent-<name>.md` for the new path `{project-root}/_gomad/_config/agents/<shortName>.md` (not the old `_gomad/gomad/agents/…`). The source of this path is `tools/installer/ide/templates/agent-command-template.md:16` — that template must change as part of v1.3.

2. **`test/test-legacy-v11-upgrade.js` — upgrade-test template.**

   Simulates v1.1 install state, runs v1.2 install, verifies cleanup + backup snapshots.

   **For v1.2→v1.3:** clone into `test/test-legacy-v12-upgrade.js`. Seed tempdir with v1.2 shape:
   - `<tempDir>/_gomad/gomad/agents/*.md` (8 persona files).
   - `<tempDir>/_gomad/_config/files-manifest.csv` with v2 schema referencing those old paths.
   - `<tempDir>/.claude/commands/gm/agent-*.md` with launcher bodies pointing at OLD `_gomad/gomad/agents/…`.

   Then run v1.3 install and assert:
   - Old `_gomad/gomad/agents/` dir gone.
   - New `_gomad/_config/agents/` dir populated with 8 files.
   - `_gomad/_backups/<timestamp>/` created, containing pre-move state.
   - `files-manifest.csv` updated to reference the new paths.
   - Launcher stubs in `.claude/commands/gm/agent-*.md` updated to new path.

3. **`test/test-cleanup-execute.js` + `test-cleanup-planner.js` + `test-dry-run.js` + `test-manifest-corruption.js`** — manifest-v2 cleanup plumbing. Reuse unchanged.

   The v1.3 agent-dir move is a special case of manifest-driven cleanup:
   - Old `_gomad/gomad/agents/*.md` paths are "stale" per v1.2 manifest → cleanup removes them.
   - New `_gomad/_config/agents/*.md` paths are fresh → install writes them + adds them to new manifest.
   - Realpath containment in `executeCleanupPlan` already prevents deletion outside `.claude/` + `_gomad/`. The move stays within `_gomad/`, so containment passes unchanged.
   - `SYMLINK_ESCAPE` detection unchanged.

4. **`test/integration/prd-chain/test-prd-chain.js`** — not directly applicable to agent-dir relocation, but the test-assertion pattern (`assert` helper, ANSI colors, fixture-based, <30s, zero LLM calls) is the template for any new v1.3 structural test.

**New test files for v1.3 (all zero-new-dep — reuse `assert()` + `fs-extra` + `node:path` + `node:os` + `node:child_process.execSync`):**

| New test file | Covers |
|---------------|--------|
| `test/test-v13-agent-relocation.js` | Fresh v1.3 install: 8 personas at `_gomad/_config/agents/`, absent from `_gomad/gomad/agents/`. Launcher-stub bodies reference new path. |
| `test/test-legacy-v12-upgrade.js` | v1.2→v1.3 upgrade with pre-seeded v1.2 shape. Backup snapshot created. Old paths cleaned. New paths populated. Manifest updated. Launcher stubs updated. |
| `test/test-domain-kb-install.js` | `src/domain-kb/<slug>/*.md` → `<installRoot>/_config/kb/<slug>/*.md` seeding. Asserts 2 seed packs present after fresh install. Manifest v2 tracks the new kb paths. |
| `test/test-marketplace-schema.js` | `.claude-plugin/marketplace.json` parses as JSON, has `name`/`owner`/`plugins`, `name` not in reserved list, each plugin entry has `name`+`source`, no paths contain `..`, no duplicate plugin names. Complements `claude plugin validate .` for CI-time fast-fail. |

**Wire into `npm run quality` + `npm run test`.** Both already enumerate tests explicitly (`test:gm-surface`, `test:tarball`, etc.). Add new entries to `scripts` in `package.json`; append to `test:cleanup-all` for upgrade/install-shape tests, or as standalone entries for schema/domain-KB.

**Zero-new-deps compliance: YES.** All new tests use only `node:*` + `fs-extra` + `glob` + `js-yaml` — all already installed.

---

## Installation

```bash
# No install-step changes for v1.3.
# Runtime deps unchanged. Dev deps unchanged. Astro/Starlight versions unchanged.
# v1.3 deliverables are pure code+config additions and path moves.
git pull && npm ci
```

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Hand-rolled BM25 (~50 LOC) | `lunr` / `minisearch` / `fuse.js` | Only if domain-KB corpus grows past ~10k files per pack AND scoring needs pluggable stemmers / fuzzy tolerance. v1.3 seed packs are 2 packs × ~5 files — overkill. |
| GitHub Actions deploy (existing `docs.yaml`) | `gh-pages` npm package, manual `docs/` folder, Netlify | Never. Existing workflow is 2026-canonical Astro+GH Pages. |
| Extend `test-gm-command-surface.js` with Phase D OR new `test-v13-agent-relocation.js` | Single path | **Standalone recommended** — keeps v1.2 Phase-C passes decoupled from v1.3 Phase-D failures during migration. |
| `strict: false` marketplace entries | `strict: true` + per-plugin `.claude-plugin/plugin.json` | Use `strict: true` if you need granular per-plugin metadata (different licenses, authors). GoMad is single-owner monorepo → `strict: false` avoids per-plugin manifest proliferation. |
| Mirror `gm-create-story/` for `gm-discuss-story/` | Minimal SKILL.md only | Minimal form is fine for toy skills. `gm-discuss-story` is peer of `gm-create-story` — shape parity aids maintenance and discoverability. |
| Directory-form `skills:` in marketplace.json | Individual per-skill paths (current BMAD shape) | Only use per-skill form if selective exposure is needed (e.g. hiding work-in-progress skills). GoMad ships everything in `src/` — directory form is cleaner. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `lunr` / `minisearch` / `fuse.js` / `flexsearch` | Violates zero-new-deps; overkill for seed-corpus size | Hand-rolled BM25 in `tools/installer/lib/kb-search.js` (~50 LOC) |
| `gh-pages` npm package | Duplicates `actions/deploy-pages@v4` already wired | `.github/workflows/docs.yaml` unchanged; add CNAME + set `SITE_URL` repo var |
| `grep` shell-out for KB search | Not guaranteed on Windows; no ranking | Hand-rolled BM25 over `fs-extra` + `glob` |
| `gray-matter` | Frontmatter pattern already established with regex + `yaml.parse()` | Existing pattern from `test-gm-command-surface.js:78` and `agent-command-generator.js:98` |
| `ajv` / `zod` for marketplace.json schema validation | Heavyweight for a ~50-line JSON file | Structural field-presence checks in `test-marketplace-schema.js` + `claude plugin validate .` as runtime authority |
| Per-skill paths in marketplace.json `skills:` | Verbose; current BMAD shape is the reason we're rewriting | Directory-form `"skills": ["./src/gomad-skills/1-analysis/", …]` with Claude Code auto-discovery of `<name>/SKILL.md` subdirs |
| Hardcoding `<installRoot>` as `_gomad` in v1.3 new code | Violates v1.3 constraint; `_gomad` is default not fixed | Read install-root from config / pass as parameter; `GOMAD_FOLDER_NAME` in `path-utils.js:23` is **default**, not hardcoded requirement |
| Mixing ESM into new v1.3 installer/test code | Codebase is CommonJS; mixing breaks `require()` chains | All new v1.3 files: `const … = require(…)` + `module.exports = …` |
| Per-plugin `.claude-plugin/plugin.json` under `src/` | Extra files to maintain; no cross-plugin divergence to justify | `strict: false` on marketplace entries — marketplace.json is authoritative |
| New `skill-manifest.yaml` for `gm-discuss-story/` | Non-agent workflow skills don't carry manifests (verified: `gm-create-story/` has none) | SKILL.md + workflow.md + template.md only — mirror `gm-create-story/` |
| Renaming / relocating `workflows/` or `data/` under `<installRoot>/gomad/` | v1.3 explicitly scoped to agents-only relocation (milestone brief) | Leave `workflows/` and `data/` under `_gomad/gomad/` untouched; move ONLY agents to `_gomad/_config/agents/` |
| Auto-sync marketplace.json on every commit via CI | v1.3 scope is "public-surface refresh", not automation | Manual bump `version` in each plugin entry at release cut. Automate later if release cadence demands. |

---

## Stack Patterns by Variant

**If `claude plugin validate .` fails during Phase 10 on marketplace.json:**
- Most-likely culprits in order: non-kebab-case plugin names; paths containing `..`; missing `source` field; duplicate plugin names; JSON syntax (extra comma).
- Fix-order: (a) run validator, read exact error; (b) fix one at a time, re-validate; (c) only after validator clean, run `/plugin marketplace add ./` locally and install each plugin.

**If `agents:` field shape in marketplace.json doesn't accept GoMad's directory-per-agent layout:**
- Drop the `gomad-agents` plugin entry entirely — launchers are already emitted by `gomad install` into `.claude/commands/gm/agent-*.md`. Users get agents via the installer, not via the marketplace plugin.
- Alternative: restructure to a dedicated `agents/*.md` flat layout at repo root. But this duplicates content vs the existing `src/gomad-skills/<phase>/gm-agent-*/SKILL.md` tree — not worth it for v1.3.

**If BM25 scoring feels off for concrete domain-KB queries:**
- First-line: tune `k1` (higher → more TF saturation) and `b` (higher → more length normalization).
- Second-line: stop-word filtering — small English stop-list added to `tokenize()` (20 LOC).
- Third-line: bigrams — only if single-token BM25 measurably underperforms. Do NOT pre-optimize.

**If v1.2→v1.3 upgrade needs more than manifest-v2 cleanup can express:**
- Signal: agent-dir move requires writing paths to a NEW location not in v1.2 manifest.
- Handling: `buildCleanupPlan` removes old-path entries; install phase writes new-path entries to a fresh manifest row. Manifest written anew on every install → new rows appear naturally. No schema evolution needed.

**If `SITE_URL` repo variable isn't respected by the CI build:**
- Verify `docs.yaml:47` passes `SITE_URL: ${{ vars.SITE_URL }}` (not `secrets.SITE_URL`). It currently uses `vars.SITE_URL` — correct.
- Verify the variable is set at the repo level (Settings → Secrets and variables → Actions → **Variables** tab), not at the environment level or as a secret.

---

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| `astro@^5.16.0` | `@astrojs/starlight@^0.37.5`, `@astrojs/sitemap@^3.6.0` | Already pinned together in `devDependencies`. No v1.3 bumps. |
| `csv-parse@^6.1.0` | `node@>=20` | Symmetric `parse/sync` for read + hand-rolled `escapeCsv` for write per v1.2 D. |
| `yaml@^2.7.0` + `js-yaml` (transitive via other deps) | `node@>=20` | Use whichever matches surrounding file. |
| `fs-extra@^11.3.0` | `node@>=20` | v11.x requires Node 16+. v1.3 floor remains Node 20. |
| `glob@^11.0.3` | `node@>=20` | v11 dropped Node <20; already matches engine pin. |
| Claude Code marketplace schema | Current as of 2026-04-24 | No version pin on the schema itself; validated via `claude plugin validate .` at installed Claude Code version. Observed spec changes are additive. |
| `actions/deploy-pages@v4` | `actions/upload-pages-artifact@v3`, `actions/checkout@v4`, `actions/setup-node@v4` | Versions already pinned in `.github/workflows/docs.yaml`. Update only if Pages API changes; not in v1.3 scope. |

---

## Sources

- [Claude Code — Create and distribute a plugin marketplace](https://code.claude.com/docs/en/plugin-marketplaces) — marketplace.json schema (root + owner + plugins + entry fields), required vs optional fields, source types, strict mode, reserved names, version resolution — **HIGH confidence, authoritative** (fetched 2026-04-24).
- [Claude Code — Plugins reference](https://code.claude.com/docs/en/plugins-reference) — plugin.json schema, component path fields (`skills`, `commands`, `agents` as string|array), default file locations, path behavior rules — **HIGH confidence, authoritative**.
- [Astro — Deploy to GitHub Pages](https://docs.astro.build/en/guides/deploy/github/) — custom-domain CNAME setup, `site`/`base` config, GitHub Actions as 2026-canonical deploy method — **HIGH confidence, official Astro docs**.
- [anthropics/claude-plugins-official marketplace.json](https://github.com/anthropics/claude-plugins-official/blob/main/.claude-plugin/marketplace.json) — real-world official marketplace example — **MEDIUM confidence, reference-only**.
- [anthropics/skills marketplace.json](https://github.com/anthropics/skills/blob/main/.claude-plugin/marketplace.json) — additional real-world shape — **MEDIUM confidence**.
- Repo-local file reads (direct source inspection, **HIGH confidence**): `package.json`, `.claude-plugin/marketplace.json`, `tools/installer/ide/shared/agent-command-generator.js`, `tools/installer/ide/shared/path-utils.js`, `tools/installer/ide/templates/agent-command-template.md`, `website/astro.config.mjs`, `website/src/lib/site-url.mjs`, `.github/workflows/docs.yaml`, `src/gomad-skills/4-implementation/gm-create-story/` (SKILL.md, workflow.md, template.md, discover-inputs.md), `test/test-gm-command-surface.js`, `test/integration/prd-chain/test-prd-chain.js`.
- [BM25 vs TF-IDF (blog ref)](https://olafuraron.is/blog/bm25vstfidf/) — BM25 parameter tuning intuition (k1, b) — **LOW confidence**, supporting material only.
- [Okapi BM25 — Wikipedia](https://en.wikipedia.org/wiki/Okapi_BM25) — algorithm reference for the hand-rolled implementation — **HIGH confidence**, standard algorithm reference.

---
*Stack research for: GoMad v1.3 Marketplace + GH Pages + Agent Relocation + Story-Context*
*Researched: 2026-04-24*
