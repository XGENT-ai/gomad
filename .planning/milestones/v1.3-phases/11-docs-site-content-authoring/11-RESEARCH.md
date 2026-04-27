# Phase 11: Docs Site Content Authoring - Research

**Researched:** 2026-04-26
**Domain:** Starlight content authoring + build-time auto-gen tooling + i18n parity
**Confidence:** HIGH (Starlight infra + repo state are directly verified; only the new auto-gen step is novel design)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Inherited BMAD Content Disposition**

- **D-01:** Delete all ~25 inherited BMAD-era pages from `docs/{tutorials,how-to,reference,explanation}/` rather than archiving or leaving alongside.
- **D-02:** Mirror EN disposition in `docs/zh-cn/`. Whatever EN does, zh-cn does in the same plan/commit.
- **D-03:** `docs/index.md` (homepage) and `docs/roadmap.mdx` are in scope for Phase 11. Both currently reference BMAD personas and pre-fork roadmap items. The homepage gets rewritten as the gomad landing page (overview + sidebar pointers); `roadmap.mdx` is rewritten as a thin pointer to current milestone status (or deleted in favor of `.planning/ROADMAP.md` — planner picks, document either way).
- **D-04:** Cleanup happens before authoring, not interleaved. Plan ordering: (1) cleanup plan deletes EN BMAD pages + zh-cn scaffold + handles index/roadmap + leaves `docs/_STYLE_GUIDE.md`, `docs/404.md`, `docs/upgrade-recovery.md` in place; (2-N) authoring plans deliver new pages.

**Reference Pages: Source-of-Truth Posture**

- **D-05:** Hybrid approach — auto-generate the structural tables from `src/gomad-skills/*/SKILL.md` frontmatter at build time; hand-author the narrative prose, intros, and grouping commentary.
- **D-06:** Auto-gen injection mechanism: HTML comment markers in the `.md` source. Authors leave `<!-- AUTO:agents-table-start --> ... <!-- AUTO:agents-table-end -->` (and `<!-- AUTO:skills-table-start -->`) in `reference/agents.md` and `reference/skills.md`. `tools/build-docs.mjs` (or a new sibling step) replaces content between markers before the Astro build emits `build/site/`.
- **D-07:** `/reference/agents` table columns: **Persona name** (e.g., "Barry"), **Slash command** (e.g., `/gm:agent-solo-dev`), **Phase** (Analysis / Planning / Solutioning / Implementation), **Purpose** (from SKILL.md `description:` field). 4 columns. Phase column derived from parent dir (`src/gomad-skills/N-*/`).
- **D-08:** `/reference/skills` grouping: top-level sections mirror the `src/gomad-skills/` structure — "1. Analysis", "2. Planning", "3. Solutioning", "4. Implementation", "Core". Auto-gen table within each section lists the skills in that phase.
- **D-09:** Skills reference must reflect the Phase 10 D-04 contract (task-skills do NOT have `/gm:*` launchers — only `gm-agent-*` personas do). Skills table column for "How to invoke" should not assume slash-command form for everything. Planner picks the safest column phrasing (e.g., "Invoked via the agent that owns it" for task-skills vs `/gm:agent-*` for personas).

**Path Examples & Deploy Timing**

- **D-10:** Author all path references with the **v1.3 layout** (`<installRoot>/_config/agents/`), not the currently-shipped v1.2 layout (`<installRoot>/gomad/agents/`).
- **D-11:** Resolve the divergence by **gating deploy via branch isolation**. All Phase 11 work lands on `docs/v13-content` branch (or equivalent). `docs.yaml` workflow stays untouched — the `push: branches: [main]` trigger is fine because nothing merges to main from this phase. Merge to main happens only after Phase 12 publishes `@xgent-ai/gomad@1.3.0`.
- **D-12:** Path cleanliness is validated by **DOCS-07 in Phase 12** (`tools/validate-doc-paths.js`), not Phase 11. Phase 11 declares "authored to v1.3 spec" without adding its own grep validator.

**zh-cn Translation Strategy**

- **D-13:** Authoring sequence: **EN-first, then translate per page**. Each page has two passes — first the EN page lands and is reviewed; then the zh-cn translation lands.
- **D-14:** **Claude drafts and commits zh-cn translations without human pre-review.** No glossary lock, no post-merge review window. Velocity prioritized over translation quality gating.

### Claude's Discretion

- Exact wording of homepage `docs/index.md` rewrite (within the gomad landing-page brief).
- Whether to delete `docs/roadmap.mdx` outright or rewrite it as a pointer to `.planning/ROADMAP.md` — D-03 lets planner choose.
- Exact filename and placement of the auto-gen build step (new file vs section in existing `tools/build-docs.mjs`).
- Skills table layout details (e.g., whether to show invoke form, the "trigger" code, or both).
- Architecture explainer page structure within `/explanation/architecture` (single page vs. light section structure) — within the spec's "4-phase workflow + manifest-v2 installer + launcher-form slash commands" envelope.
- Tutorial step ordering in `/tutorials/install` and `/tutorials/quick-start` (within DOCS-01 spec).
- Contributing guide section breakdown in `/how-to/contributing` (within DOCS-05 spec).
- Whether to update `tools/build-docs.mjs` `LLM_EXCLUDE_PATTERNS` to drop stale entries (`bmgd/`, `v4-to-v6-upgrade`, `explanation/game-dev/`) as part of the cleanup commit.

### Deferred Ideas (OUT OF SCOPE)

- **Style guide revision** — `docs/_STYLE_GUIDE.md` is FROZEN for this phase. If new authoring runs into style-guide friction, planner can flag for a separate patch.
- **Architecture explainer split into 2-3 subpages** — Considered as a depth-control option; left to Claude's discretion within DOCS-04's "one page" framing.
- **Page count expansion** (e.g., adding `/reference/commands`, `/how-to/upgrade`) — Phase 11 ships exactly the 6 spec'd pages plus index/roadmap rewrites.
- **Auto-deploy posture revisit** (banner, branch protection) — Resolved via D-11 branch isolation; no temporary workflow disable, no preview banner.
- **zh-cn glossary lock** (`docs/_GLOSSARY-zh.md`) — Rejected per D-14.
- **Post-merge zh-cn review window** — Rejected per D-14.
- **Validate-doc-coverage.js** — Deferred in favor of the auto-gen approach (D-05).
- **Path validator** (`tools/validate-doc-paths.js`) — Belongs to Phase 12 (DOCS-07).
- **Symbolic path tokens** (e.g., `<installRoot>/<agentsDir>/`) — Rejected per D-10 in favor of literal v1.3 paths.
- **PROJECT.md "Out of Scope > GitHub Pages deployment" cleanup** — Stale entry. Planner may include in Phase 11 cleanup commit OR flag for milestone-close edit.
- **`tools/build-docs.mjs` LLM_EXCLUDE_PATTERNS cleanup** — Stale BMAD entries; Claude's discretion whether to clean during cleanup commit (D-04 implies leaving for safety unless trivial).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DOCS-01 | User can read install + quick-start tutorials at `gomad.xgent.ai/tutorials/install` and `/tutorials/quick-start` covering `npm install @xgent-ai/gomad` + `gomad install`. | Tutorial-page frontmatter shape verified (Starlight `docsSchema`); existing `docs/tutorials/getting-started.md` provides current-state reference; `_STYLE_GUIDE.md` "Tutorial Structure" template (15 sections) gives the authoring skeleton. README.md confirms `npx @xgent-ai/gomad install` is the canonical entry command. |
| DOCS-02 | User can browse Agents Reference at `/reference/agents` listing all 8 `gm-agent-*` personas. | All 8 persona SKILL.md files verified with consistent `name:` + `description:` frontmatter; `skill-manifest.yaml` adds `displayName` (human name like "Barry"), `title`, `icon`, `capabilities` for richer rendering. Phase derivable from parent dir per D-07. |
| DOCS-03 | User can browse Skills Reference at `/reference/skills` listing all 4-phase + core skills, grouped by workflow layer. | 27 skills enumerated across 4 phase dirs + 11 core skills under `src/core-skills/`. SKILL.md `name:` + `description:` shape consistent across all (verified). 8 of 27 in gomad-skills are `gm-agent-*` (personas, have launchers); 19 are task-skills (no launchers). |
| DOCS-04 | User can read Architecture explainer at `/explanation/architecture` describing 4-phase workflow + manifest-v2 installer + launcher-form slash commands. | `_STYLE_GUIDE.md` "Explanation Structure > General Template" gives skeleton. CHANGELOG v1.2 entry already explains launcher-form mechanics in shippable prose. v1.3 paths per D-10. |
| DOCS-05 | Contributor can read Contributing how-to at `/how-to/contributing` covering fork + PR + test expectations. | `_STYLE_GUIDE.md` "How-To Structure" template. Existing `CONTRIBUTING.md` at repo root is source for content (no docs file currently). `npm run quality` is the documented gate. |
| DOCS-06 | Chinese-speaking user has parity content under `/zh-cn/` for all DOCS-01..05 pages. | Starlight i18n confirmed: `docs/zh-cn/<path>.md` → `/zh-cn/<path>` URL. Locales config in `website/src/lib/locales.mjs` already declares `'zh-cn'` with `lang: 'zh-CN'`. Existing zh-cn scaffold (26 BMAD-era pages) deleted per D-02. Starlight serves EN fallback for missing zh-cn pages — but D-13/D-14 commits to authoring full parity. |
</phase_requirements>

## Summary

Phase 11 ships content into a fully-functional Starlight + GitHub Pages pipeline that has been live since v1.2. The infrastructure is **immutable** for this phase — `website/astro.config.mjs`, `tools/build-docs.mjs` (modulo the new auto-gen step), `.github/workflows/docs.yaml`, and `docs/_STYLE_GUIDE.md` are all locked. Authoring lands in the `docs/` tree (symlinked into `website/src/content/docs`), Starlight autogenerates the sidebar from `docs/{tutorials,how-to,reference,explanation}/`, and the GitHub Pages workflow auto-deploys on push to `main`.

The single piece of new tooling is a build-time auto-gen step that injects rendered tables between HTML comment markers in `docs/reference/agents.md` and `docs/reference/skills.md`. The injector reads `src/gomad-skills/*/SKILL.md` frontmatter (and optionally `skill-manifest.yaml` for richer persona metadata), formats markdown tables, and rewrites the source between markers before Astro consumes it. Pattern: idempotent, marker-bounded substitution; reuse `validate-skills.js`'s frontmatter parser (it already handles multiline YAML correctly). CommonJS `require()` per project convention, zero new deps.

The cleanup pass deletes 53 inherited BMAD-era pages (27 EN + 26 zh-cn) before authoring begins. The deletion list is deterministic — every file under `docs/{tutorials,how-to,reference,explanation}/` and `docs/zh-cn/{tutorials,how-to,reference,explanation}/` goes, with five explicit KEEPs at the docs root. `docs/index.md` and `docs/roadmap.mdx` get rewritten (or roadmap deleted — planner picks per D-03), and their zh-cn siblings get the same treatment.

Branch isolation (D-11) elegantly sidesteps the divergence problem: docs would describe v1.3 paths while npm still ships v1.2. Phase 11 lives on a feature branch and merges to main only after Phase 12 publishes `1.3.0`. Workflow trigger (`push: branches: [main]`) is verified — nothing on the feature branch deploys.

**Primary recommendation:** Plan structure should be (1) cleanup, (2) auto-gen tooling, (3-N) authoring (EN-first per page per D-13, zh-cn translation following). Auto-gen ships before reference-page authoring so the markers can be tested live. zh-cn translation can be folded into each page's plan rather than being a separate Phase-11-zh plan.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Hand-authored prose (tutorials, how-to, explanation) | Markdown source (`docs/`) | — | Static content; Starlight content collection is the only consumer. |
| Auto-generated reference tables | Build-time tool (`tools/`) | Markdown source (`docs/reference/*.md`) | Tool reads source-of-truth (`src/gomad-skills/*/SKILL.md`), writes between markers in `docs/reference/agents.md` + `skills.md`. Astro consumes the post-replacement file. |
| Sidebar generation | Starlight runtime (`website/astro.config.mjs`) | — | Already wired via `autogenerate: { directory: '...' }`. No content-author action needed. |
| i18n routing (`/zh-cn/*`) | Starlight runtime | — | `locales.mjs` already declares `zh-cn` with `lang: 'zh-CN'`. Authors only place files in `docs/zh-cn/<path>.md`. |
| Deploy on push | GitHub Actions (`.github/workflows/docs.yaml`) | — | Locked; triggers on `push: branches: [main]` for `docs/**`, `website/**`, `tools/build-docs.mjs`, `.github/workflows/docs.yaml`. |
| Link validation | Build-time tool (`tools/validate-doc-links.js`) | — | Wired into `build-docs.mjs` step 1; runs before Astro build, fails build on broken internal links. |
| LLM-flat artifact (`llms.txt`, `llms-full.txt`) | Build-time tool (`tools/build-docs.mjs`) | Markdown source (`docs/`) | Hardcoded `LLM_EXCLUDE_PATTERNS` constant in build-docs.mjs filters; `_*` files/dirs excluded automatically. |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@astrojs/starlight` | `^0.37.5` (installed) | Documentation site framework | Already shipped in v1.2; provides Diataxis sidebar autogen, i18n, frontmatter schema, admonitions. `[VERIFIED: ./node_modules/@astrojs/starlight/package.json]` |
| `astro` | `^5.16.0` (installed) | Static site builder | Required by Starlight 0.37.x. `[VERIFIED: package.json]` |
| `@astrojs/sitemap` | `^3.6.0` (installed) | Sitemap generation | Already wired in `astro.config.mjs`; not modified by Phase 11. `[VERIFIED: package.json]` |
| Node.js built-ins (`fs`, `path`) | bundled | File I/O for auto-gen step | Project convention — zero new deps. `[VERIFIED: tools/build-docs.mjs uses fs/path only]` |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| (none new) | — | — | Project policy: zero new runtime deps for v1.3. `validate-skills.js` shows the canonical pattern — hand-rolled frontmatter parser, no `gray-matter` / `js-yaml` / similar. `[VERIFIED: tools/validate-skills.js parseFrontmatterMultiline]` |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| HTML-comment marker substitution (D-06) | MDX component that loads SKILL.md at build time | More "Astro-native" but adds a runtime data-fetching layer + MDX import boundary. D-06 picked because the pattern is portable to llms-full.txt extraction (post-replacement source is the canonical artifact). |
| Hand-rolled frontmatter parser | Add `gray-matter` or `js-yaml` | Violates zero-new-deps policy. `parseFrontmatterMultiline` in `validate-skills.js` already handles the cases we need (multiline `description:`, single-line `name:`). |
| Starlight pages routing for reference pages | Astro `.astro` page components | Loses sidebar autogen integration; requires manually keeping the Reference sidebar group in sync. Markdown + comment markers is far simpler. |

**Installation:** No new packages required. Use existing tooling as-is.

**Version verification:**
```
$ npm view @astrojs/starlight version  → 0.38.4 (latest)
$ npm view astro version               → 6.1.9 (latest)
```
Project pins `@astrojs/starlight ^0.37.5` and `astro ^5.16.0`. Latest releases (0.38.4, 6.1.9) are minor/major ahead but the pipeline is locked for Phase 11 — no upgrade in scope. `[VERIFIED: 2026-04-26 npm view]`

## Architecture Patterns

### System Architecture Diagram

```
                    ┌─────────────────────────────────┐
                    │  src/gomad-skills/*/SKILL.md   │
                    │  src/core-skills/*/SKILL.md    │
                    │  (frontmatter: name + desc)    │
                    └────────────┬────────────────────┘
                                 │ READ at build time
                                 ▼
        ┌────────────────────────────────────────────┐
        │  tools/inject-reference-tables.cjs         │
        │  (NEW — sibling of build-docs.mjs)         │
        │  • Discovers SKILL.md via fs.readdirSync   │
        │  • Parses frontmatter (validate-skills.js  │
        │    pattern)                                 │
        │  • Renders markdown tables                 │
        │  • Writes between AUTO: markers in         │
        │    docs/reference/agents.md + skills.md    │
        └────────────┬───────────────────────────────┘
                     │ MUTATES (idempotent)
                     ▼
        ┌────────────────────────────────────────────┐
        │  docs/reference/agents.md                  │
        │  docs/reference/skills.md                  │
        │  (post-replacement source — authors keep   │
        │   markers in source; rendered tables live  │
        │   between markers in working tree)         │
        └────────────┬───────────────────────────────┘
                     │
                     ▼
        ┌────────────────────────────────────────────┐
        │  tools/build-docs.mjs                      │
        │  ┌──────────────────────────────────────┐  │
        │  │ 1. validate-doc-links.js (gate)     │  │
        │  │ 2. inject-reference-tables (NEW)    │  │  ← inserted here
        │  │ 3. cleanBuildDirectory               │  │
        │  │ 4. generateLlmsTxt + generateLlmsFull│  │
        │  │ 5. runAstroBuild → build/site/      │  │
        │  │ 6. copyArtifactsToSite               │  │
        │  └──────────────────────────────────────┘  │
        └────────────┬───────────────────────────────┘
                     │ on push to main, paths match
                     ▼
        ┌────────────────────────────────────────────┐
        │  .github/workflows/docs.yaml               │
        │  → upload-pages-artifact → deploy-pages    │
        │  → https://gomad.xgent.ai                  │
        └────────────────────────────────────────────┘
```

**Critical ordering:** Inject MUST run **before** link-checking, because the rendered tables contain markdown links that the validator will check. Re-reading build-docs.mjs (line 70): the existing order is link-check → cleanBuild → generateArtifacts → astroBuild. The new step should be inserted **between** `main()` entry and `checkDocLinks()` — i.e., the very first stage. This means: `injectReferenceTables() → checkDocLinks() → cleanBuildDirectory() → generateArtifacts() → buildAstroSite()`.

### Recommended Project Structure
```
docs/
├── _STYLE_GUIDE.md          # KEEP (frozen)
├── 404.md                   # KEEP
├── upgrade-recovery.md      # KEEP (v1.2 backup-restore)
├── index.md                 # REWRITE (gomad landing)
├── roadmap.mdx              # REWRITE or DELETE (D-03 planner picks)
├── tutorials/
│   ├── install.md           # NEW (DOCS-01 pt 1)
│   └── quick-start.md       # NEW (DOCS-01 pt 2)
├── how-to/
│   └── contributing.md      # NEW (DOCS-05)
├── reference/
│   ├── agents.md            # NEW with AUTO: markers (DOCS-02)
│   └── skills.md            # NEW with AUTO: markers (DOCS-03)
├── explanation/
│   └── architecture.md      # NEW (DOCS-04)
└── zh-cn/                   # MIRROR (DOCS-06)
    ├── _STYLE_GUIDE.md      # KEEP
    ├── 404.md               # KEEP
    ├── index.md             # REWRITE
    ├── roadmap.mdx          # REWRITE or DELETE
    ├── tutorials/{install,quick-start}.md
    ├── how-to/contributing.md
    ├── reference/{agents,skills}.md   # NEW with same AUTO: markers
    └── explanation/architecture.md

tools/
├── build-docs.mjs                       # PATCH (insert inject step)
├── inject-reference-tables.cjs          # NEW (auto-gen tool)
└── validate-skills.js                   # READ-ONLY reference (frontmatter parser pattern)

src/gomad-skills/                        # READ-ONLY (auto-gen input)
├── 1-analysis/{gm-agent-*,gm-*}/SKILL.md
├── 2-plan-workflows/{gm-agent-*,gm-*}/SKILL.md
├── 3-solutioning/{gm-agent-*,gm-*}/SKILL.md
└── 4-implementation/{gm-agent-*,gm-*}/SKILL.md

src/core-skills/{gm-*}/SKILL.md          # READ-ONLY (auto-gen input)
```

### Pattern 1: Starlight Page Frontmatter
**What:** Every Starlight markdown page has a typed frontmatter schema.
**When to use:** Every new `.md`/`.mdx` file in `docs/`.
**Example:**
```markdown
---
title: "Install GoMad"
description: Step-by-step guide to installing GoMad in your project
sidebar:
  order: 1
---

Hook sentence here.

## What You'll Learn
...
```

**Authoritative schema (Starlight 0.37.5 `docsSchema`)** `[VERIFIED: ./node_modules/@astrojs/starlight/schema.ts]`:

| Field | Type | Default | Purpose |
|-------|------|---------|---------|
| `title` | string | **required** | Page title (also sidebar label if `sidebar.label` not set) |
| `description` | string | optional, recommended | Meta description (~150-160 chars) |
| `template` | `'doc' \| 'splash'` | `'doc'` | Use `'splash'` for hero/landing layouts |
| `sidebar.order` | number | — | Sort order within autogenerated group (ascending) |
| `sidebar.label` | string | falls back to `title` | Override sidebar text |
| `sidebar.hidden` | boolean | `false` | Exclude from sidebar |
| `sidebar.badge` | string \| object | — | Add a badge (e.g., "New") |
| `tableOfContents` | object | inherits global (`{ minHeadingLevel: 2, maxHeadingLevel: 3 }`) | Override per-page |
| `lastUpdated` | date \| boolean | git history | Override last-updated stamp |
| `prev` / `next` | object | from pagination config | Already disabled globally (`pagination: false`) |
| `pagefind` | boolean | `true` | Disable search indexing for a page |
| `draft` | boolean | `false` | Exclude from production builds |

**Phase 11 page-type guidance:**

| Page | Recommended frontmatter |
|------|-------------------------|
| `tutorials/install.md` | `title`, `description`, `sidebar: { order: 1 }` |
| `tutorials/quick-start.md` | `title`, `description`, `sidebar: { order: 2 }` |
| `how-to/contributing.md` | `title`, `description`, `sidebar: { order: 1 }` (only how-to in v1.3) |
| `reference/agents.md` | `title`, `description`, `sidebar: { order: 1 }` |
| `reference/skills.md` | `title`, `description`, `sidebar: { order: 2 }` |
| `explanation/architecture.md` | `title`, `description`, `sidebar: { order: 1 }` |
| `index.md` | `title`, `description`, optional `template: splash` for landing layout |
| `404.md` | `title`, `template: splash` (already done) |

### Pattern 2: HTML Comment Marker Auto-Gen (D-06)

**What:** Build-time substitution between marker comments in markdown source. Markers stay in source; tables get rewritten on every build.

**When to use:** `docs/reference/agents.md` and `docs/reference/skills.md` only. Manual edits outside markers survive.

**Example source (`docs/reference/agents.md`):**
```markdown
---
title: "Agents Reference"
description: All gm-agent-* personas with purpose and invocation.
sidebar:
  order: 1
---

The 8 agent personas span the four GoMad workflow phases. Each persona is invoked via a `/gm:agent-*` slash command...

## All personas

<!-- AUTO:agents-table-start -->
<!-- This block is auto-generated from src/gomad-skills/*/gm-agent-*/SKILL.md.
     Do not edit between the markers — run `npm run docs:build` to regenerate. -->
| Persona | Slash command | Phase | Purpose |
| --- | --- | --- | --- |
| Mary (Analyst) | `/gm:agent-analyst` | Analysis | Strategic business analyst and requirements expert. Use when... |
| ... |
<!-- AUTO:agents-table-end -->

## Choosing a persona

Hand-written prose continues here, fully under author control.
```

**Injector algorithm (in `tools/inject-reference-tables.cjs`):**

```javascript
const fs = require('node:fs');
const path = require('node:path');

const SKILL_ROOT = path.join(__dirname, '..', 'src', 'gomad-skills');
const CORE_ROOT  = path.join(__dirname, '..', 'src', 'core-skills');
const DOCS_ROOT  = path.join(__dirname, '..', 'docs');

// Reuse parseFrontmatterMultiline pattern from validate-skills.js
// (Copy or require — note validate-skills.js exports it; require it as a CommonJS module.)
const { parseFrontmatterMultiline } = require('./validate-skills.js');

const PHASE_DIRS = ['1-analysis', '2-plan-workflows', '3-solutioning', '4-implementation'];
const PHASE_LABELS = {
  '1-analysis': 'Analysis',
  '2-plan-workflows': 'Planning',
  '3-solutioning': 'Solutioning',
  '4-implementation': 'Implementation',
};

function discoverPersonas() {
  const personas = [];
  for (const phase of PHASE_DIRS) {
    const phaseDir = path.join(SKILL_ROOT, phase);
    if (!fs.existsSync(phaseDir)) continue;
    for (const entry of fs.readdirSync(phaseDir)) {
      if (!entry.startsWith('gm-agent-')) continue;
      const skillMd = path.join(phaseDir, entry, 'SKILL.md');
      if (!fs.existsSync(skillMd)) continue;
      const fm = parseFrontmatterMultiline(fs.readFileSync(skillMd, 'utf-8'));
      // Optional: load skill-manifest.yaml for displayName, title, icon
      personas.push({ phase, name: fm.name, description: fm.description, /* ... */ });
    }
  }
  return personas;
}

function renderAgentsTable(personas) {
  const lines = ['| Persona | Slash command | Phase | Purpose |', '| --- | --- | --- | --- |'];
  for (const p of personas) {
    const shortName = p.name.replace(/^gm-agent-/, '');
    lines.push(`| ${p.displayName} | \`/gm:agent-${shortName}\` | ${PHASE_LABELS[p.phase]} | ${escapeCell(p.description)} |`);
  }
  return lines.join('\n');
}

function injectBetweenMarkers(source, startMarker, endMarker, replacement) {
  const startRe = new RegExp(`(<!--\\s*${startMarker}\\s*-->)[\\s\\S]*?(<!--\\s*${endMarker}\\s*-->)`);
  if (!startRe.test(source)) {
    throw new Error(`Markers ${startMarker}/${endMarker} not found — cannot inject.`);
  }
  return source.replace(startRe, `$1\n${replacement}\n$2`);
}

// Idempotency: re-running on already-injected source produces byte-identical output
// (the regex matches whatever's between the markers and replaces with the freshly-rendered table).
```

**Idempotency check (Wave 0 / acceptance test):** run injector twice; second run produces zero diff against first.

### Pattern 3: Starlight i18n Routing
**What:** `docs/zh-cn/<path>.md` automatically routes to `https://gomad.xgent.ai/zh-cn/<path>` because `locales.mjs` declares `'zh-cn'` with `lang: 'zh-CN'`.

**Fallback behavior (verified):** Starlight serves the **default-locale** content for any page missing in a non-root locale. `[CITED: Context7 /withastro/starlight — guides/i18n.mdx "Starlight supports automatic fallback content for pages that have not yet been translated"]`. So a missing `docs/zh-cn/tutorials/install.md` would render the EN page at `/zh-cn/tutorials/install` rather than 404. Phase 11 commits to full parity per D-13/D-14 — fallback is a safety net, not a strategy.

**Example zh-cn page:** identical frontmatter shape, with `title:` translated:
```markdown
---
title: "安装 GoMad"
description: 在你的项目中安装 GoMad 的分步指南
sidebar:
  order: 1
---

中文正文…
```

### Pattern 4: Starlight Admonitions (project style)

`[VERIFIED: docs/_STYLE_GUIDE.md]` — Use Starlight's `:::tip[Title] / :::note[Title] / :::caution[Title] / :::danger[Title]` syntax. Standard uses:
- `:::note[Prerequisites]` — dependencies before starting
- `:::tip[Quick Path]` — TL;DR at top of tutorials
- `:::caution[Important]` — critical caveats
- `:::danger[Title]` — only for data loss / security

Style guide caps: 1-2 admonitions per section (tutorials may use 3-4 per major section).

### Anti-Patterns to Avoid

- **Authoring with v1.2 paths.** Per D-10, every persona body path reference must be `<installRoot>/_config/agents/<shortName>.md`, not `<installRoot>/gomad/agents/`. Phase 12's DOCS-07 linter will catch leaks but they shouldn't be authored in the first place.
- **Manual edits inside `<!-- AUTO: -->` markers.** Will be overwritten on next build. Authors must edit only **outside** the marker block.
- **Forgetting frontmatter `title:`.** Required by Starlight schema; build will fail. (Pages without descriptions still build but lose meta tags.)
- **Using `####` headers.** Forbidden by `_STYLE_GUIDE.md`; use bold text or admonitions instead.
- **Adding "Related" / "Next:" sections.** Forbidden by style guide — sidebar handles navigation.
- **Adding horizontal rules (`---`) outside frontmatter.** Forbidden by style guide.
- **Editing `LLM_EXCLUDE_PATTERNS` carelessly.** Removing a pattern that's still load-bearing inflates `llms-full.txt`. Stale patterns to consider dropping (Claude's discretion per CONTEXT.md): `bmgd/`, `v4-to-v6-upgrade`, `explanation/game-dev/`. Verify by `grep -r "bmgd\|v4-to-v6-upgrade\|game-dev" docs/` after cleanup — should return zero hits, then it's safe to drop.
- **Touching `.github/workflows/docs.yaml`.** Branch isolation (D-11) means no CI surgery. Verified trigger is `push: branches: [main]` `[VERIFIED: .github/workflows/docs.yaml line 5-6]` — feature-branch pushes do not deploy.
- **Using `gray-matter` / `js-yaml` for the auto-gen step.** Violates zero-new-deps policy. Reuse `parseFrontmatterMultiline` from `validate-skills.js`.
- **Forgetting `module.exports` for the parser when reusing.** `validate-skills.js` line 739 already exports `parseFrontmatterMultiline` — no source changes needed to require it.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Sidebar navigation | Custom sidebar component | Starlight `autogenerate: { directory: '...' }` | Already wired in `astro.config.mjs`; sorts by `sidebar.order` then alphabetically. |
| Locale URL routing | URL-rewrite plugin | Starlight `locales` config in `locales.mjs` | Already wired — `docs/zh-cn/*` → `/zh-cn/*` automatic. |
| Internal link checking | Custom validator | `tools/validate-doc-links.js` (already wired into build-docs.mjs step 1) | Detects broken site-relative links + bad anchors; runs as a build gate. |
| Frontmatter parsing | New YAML lib | Reuse `validate-skills.js` `parseFrontmatterMultiline` (CommonJS export at line 739) | Handles multiline `description:`, single-line `name:`, quote-stripping. Zero deps. |
| Sitemap generation | Custom generator | `@astrojs/sitemap` | Already wired with 404 filter. |
| LLM-flat artifact | Custom extractor | `tools/build-docs.mjs` `generateLlmsFullTxt` | Already runs; new pages auto-included. Just don't put new content under `_*` paths. |
| Last-updated timestamps | Custom git lookup | Starlight `lastUpdated: true` (already set) | Reads git log via `fetch-depth: 0` checkout in workflow. |
| Markdown admonitions / callouts | Custom React/Astro components | Starlight built-in `:::tip[]` / `:::note[]` / `:::caution[]` / `:::danger[]` | Already styled via `customCss: ['./src/styles/custom.css']`. |
| Translation fallback | Custom 404-or-fallback logic | Starlight built-in i18n fallback (default locale serves missing pages) | Built into the framework; no opt-in needed. `[CITED: Starlight i18n.mdx]` |

**Key insight:** Phase 11's only novel logic is the auto-gen step. Everything else — sidebar, i18n, link-check, sitemap, LLM-flat, last-updated — is already shipping infrastructure that the planner must NOT re-wire. Authoring tasks are pure markdown; the auto-gen tool is the single piece of new code.

## Runtime State Inventory

> **Trigger applies:** This phase includes a content cleanup (delete + rewrite) of inherited BMAD-era pages. Inventory follows.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — docs site has no database, no per-user state. Static-site only. | None. |
| Live service config | **GitHub Pages site config** (`gomad.xgent.ai` CNAME / Pages settings) — not in repo. Already correctly pointing to the GitHub Actions deploy. **No action** — branch isolation (D-11) means deploy targets only update on merge to main. | None for Phase 11. |
| OS-registered state | None. No scheduled tasks, no system services, no daemons. | None. |
| Secrets/env vars | `SITE_URL` is a GitHub repo variable used by `docs.yaml` workflow `[VERIFIED: .github/workflows/docs.yaml line 47]`. Used to override astro.config.mjs site computation. **No action** — variable name unchanged; content updates don't affect this. | None. |
| Build artifacts | **`build/` directory** at repo root — recreated by every `npm run docs:build` run; `cleanBuildDirectory()` in build-docs.mjs deletes it before each build. **`build/site/llms.txt` and `build/site/llms-full.txt`** — regenerated each build, will pick up new content automatically. **`docs/reference/agents.md` and `docs/reference/skills.md`** with rendered tables between markers — these are committed source files but get rewritten by the new injector on every build. Verify `git diff` is clean after a build (idempotency contract). | Verify idempotency in Wave 0 acceptance test. |

**The canonical question:** *After every file in the repo is updated, what runtime systems still have the old string cached, stored, or registered?* — **None for Phase 11 content authoring**, because docs are static. The only "runtime" is the rendered Pages site, which is rebuilt from scratch on each deploy.

**One caveat:** `docs/reference/agents.md` and `docs/reference/skills.md` will have **two states** — clean (markers only, no rendered content) immediately after authoring, and populated (markers + table) after running `npm run docs:build`. The planner should decide whether the populated state is committed (preferred, so GH Pages and local diff stay aligned) or whether `.gitignore` excludes the marker-block content (more complex; not recommended). **Recommendation:** Commit the populated state; the build is idempotent so PR diffs stay manageable.

## Common Pitfalls

### Pitfall 1: Marker-injection inserts but doesn't update on subsequent runs
**What goes wrong:** Author runs `npm run docs:build` once, table appears. Author adds a new persona to `src/gomad-skills/`, runs build again — table doesn't update because the injector regex matched only the literal first-time content.
**Why it happens:** Naive implementation does `insertAfter(startMarker, ...)` instead of `replaceBetween(startMarker, endMarker, ...)`.
**How to avoid:** Use a non-greedy `[\s\S]*?` regex anchored on both markers and replace the entire span (see Pattern 2 example). Test idempotency: re-run twice, second run produces byte-identical output.
**Warning signs:** Table content drifts from `src/gomad-skills/` ground truth; manual table edits between markers are NOT clobbered (when they should be).

### Pitfall 2: zh-cn pages 404 on production but render on local dev
**What goes wrong:** Page exists at `docs/tutorials/install.md` but missing at `docs/zh-cn/tutorials/install.md`. Local dev shows EN content at `/zh-cn/tutorials/install` (Starlight fallback). After deploy, user reports "404 on Chinese site" — actually it's rendering EN.
**Why it happens:** Confusion between "404" and "fallback to default locale." Starlight serves EN; user perceives it as broken zh-cn.
**How to avoid:** D-13/D-14 require full parity — every EN page gets a zh-cn sibling in the same plan/commit. Verify by enumerating: every file in `docs/{tutorials,how-to,reference,explanation}/` has a matching `docs/zh-cn/<same-path>`.
**Warning signs:** Build succeeds, links work, but `/zh-cn/<path>` shows English text.

### Pitfall 3: Sidebar items mis-ordered after cleanup
**What goes wrong:** After deleting BMAD pages, the new ones appear in alphabetical order, not the desired DOCS-01..06 order. `install.md` appears after `quick-start.md` because alphabetical sort.
**Why it happens:** Forgot `sidebar.order:` in frontmatter; Starlight falls back to alphabetical-by-slug.
**How to avoid:** Every new page gets `sidebar: { order: N }`. For tutorials: install=1, quick-start=2. For reference: agents=1, skills=2. (Already shown in this research's recommended table.)
**Warning signs:** Local `npm run docs:dev` shows pages in wrong order; reviewer asks "why is install AFTER quick-start?"

### Pitfall 4: Build-docs.mjs link-check fails because new docs link to deleted pages
**What goes wrong:** Cleanup plan deletes `docs/explanation/quick-dev.md`, but `docs/index.md` still links to it (or a new page links to a still-not-yet-authored page).
**Why it happens:** `validate-doc-links.js` runs before Astro build and fails the entire pipeline on dead links. Cleanup pass is intentionally before authoring (D-04), so during the cleanup commit the index.md is the only file referring to anything; if it references deleted pages, build breaks.
**How to avoid:** The cleanup commit MUST also rewrite `docs/index.md` (which it does per D-03). When authoring lands page-by-page, each new page's links should only point to (a) other already-authored pages, or (b) external URLs. Use cross-links to "future" pages sparingly; if needed, rely on relative `./other-tutorial.md` once both exist in the same commit.
**Warning signs:** `npm run docs:build` exits 1 on `validate-doc-links.js` step. Output names the broken link.

### Pitfall 5: Auto-gen tool reads `gm-agent-*` from wrong glob
**What goes wrong:** Injector misses `gm-agent-solo-dev` because it walks only `1-analysis/` through `3-solutioning/`, forgetting `4-implementation/` contains personas too.
**Why it happens:** Eyeballing the dir layout suggests "personas live in early phases, task-skills in 4-implementation." But `gm-agent-dev` (Amelia), `gm-agent-sm` (Bob), and `gm-agent-solo-dev` (Barry) all live under `4-implementation/`.
**How to avoid:** Iterate over **all four** phase dirs and filter by `entry.startsWith('gm-agent-')` — never hardcode persona-phase mapping.
**Warning signs:** Generated table has 5 personas instead of 8. Acceptance test should assert exactly 8 rows.

### Pitfall 6: validate-skills.js excludes `domain-kb/` — can the injector inadvertently include it?
**What goes wrong:** Auto-gen tool walks `src/` recursively and picks up KB packs (which use a different SKILL.md contract: `source:`, `license:`, `last_reviewed:`). Renders garbage rows in the skills table.
**Why it happens:** Copying validate-skills.js's `discoverSkillDirs` without copying the `if (entry.name === 'domain-kb') continue;` guard.
**How to avoid:** Auto-gen tool should walk only `src/gomad-skills/` and `src/core-skills/`, NOT `src/`. Don't recurse into `domain-kb/`. Validated: `validate-skills.js` line 202 has the explicit skip. `[VERIFIED: tools/validate-skills.js line 202]`
**Warning signs:** Generated skills table has rows with empty / weird descriptions matching KB pack frontmatter.

### Pitfall 7: zh-cn frontmatter `description:` mismatches glossary expectations post-D-14
**What goes wrong:** Page A's zh-cn translation calls "agent" 智能体, page B calls it 代理. User notices inconsistency.
**Why it happens:** D-14 explicitly accepts this risk — no glossary lock, no review window.
**How to avoid:** Out of scope for Phase 11 per D-14. If user surfaces it post-merge, fix-forward via patch commits. Suggest the planner note this in plan acceptance criteria (e.g., "zh-cn terminology consistency NOT verified per CONTEXT.md D-14").
**Warning signs:** Bilingual user reads new pages and reports terminology drift.

## Code Examples

### Frontmatter for a tutorial page
```markdown
---
title: "Install GoMad"
description: Install @xgent-ai/gomad and run gomad install in 5 minutes.
sidebar:
  order: 1
---

Install GoMad in your project in five minutes using `npx`.

## What You'll Learn

- Install `@xgent-ai/gomad` from npm
- Run `gomad install` interactively
- Verify the install lands the expected files

:::note[Prerequisites]
Node.js 20+, npm 10+, and an AI IDE (Claude Code, Cursor, etc.).
:::

:::tip[Quick Path]
`npx @xgent-ai/gomad install` — accept defaults — done.
:::

## Step 1: Install via npm

(Source: project README + `_STYLE_GUIDE.md` Tutorial Structure)
```

### Frontmatter for a reference page (with markers)
```markdown
---
title: "Agents Reference"
description: All eight gm-agent-* personas with purpose and slash-command invocation.
sidebar:
  order: 1
---

GoMad ships eight agent personas spanning the four workflow phases. Each is invoked via a `/gm:agent-*` slash command that loads the persona body from `<installRoot>/_config/agents/<shortName>.md` at runtime.

## All personas

<!-- AUTO:agents-table-start -->
<!-- This block is auto-generated. Do not edit between markers; run `npm run docs:build`. -->
<!-- AUTO:agents-table-end -->

## Choosing a persona

(Hand-written prose continues here, fully under author control.)
```

### Auto-gen injector skeleton (`tools/inject-reference-tables.cjs`)
```javascript
// Source: validate-skills.js pattern + Pattern 2 above
const fs = require('node:fs');
const path = require('node:path');
const { parseFrontmatterMultiline } = require('./validate-skills.js');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const PHASE_DIRS = ['1-analysis', '2-plan-workflows', '3-solutioning', '4-implementation'];
const PHASE_LABELS = {
  '1-analysis': 'Analysis',
  '2-plan-workflows': 'Planning',
  '3-solutioning': 'Solutioning',
  '4-implementation': 'Implementation',
};

function discoverSkillsRecursive(rootDir) {
  // Walk rootDir, find every dir containing SKILL.md, return array of {dir, fm}
  // Skip 'domain-kb' (different contract; see validate-skills.js:202).
  // Skip 'node_modules', '.git'.
  // ...
}

function injectBetweenMarkers(source, startMarker, endMarker, replacement) {
  const re = new RegExp(`(<!--\\s*${startMarker}\\s*-->)[\\s\\S]*?(<!--\\s*${endMarker}\\s*-->)`);
  if (!re.test(source)) {
    throw new Error(`Markers ${startMarker}/${endMarker} not found in source.`);
  }
  return source.replace(re, `$1\n${replacement}\n$2`);
}

function main() {
  const personas = []; // [{ phase, dir, fm: { name, description } }]
  // ... discoverSkillsRecursive on src/gomad-skills, filter where dirName.startsWith('gm-agent-')
  if (personas.length !== 8) {
    throw new Error(`Expected 8 personas, found ${personas.length}. Check src/gomad-skills/.`);
  }

  const agentsTable = renderAgentsTable(personas);
  const agentsPath = path.join(PROJECT_ROOT, 'docs', 'reference', 'agents.md');
  const agentsZhPath = path.join(PROJECT_ROOT, 'docs', 'zh-cn', 'reference', 'agents.md');
  for (const p of [agentsPath, agentsZhPath]) {
    if (!fs.existsSync(p)) continue; // zh-cn may not exist on first run
    const original = fs.readFileSync(p, 'utf-8');
    const updated = injectBetweenMarkers(original, 'AUTO:agents-table-start', 'AUTO:agents-table-end', agentsTable);
    if (updated !== original) fs.writeFileSync(p, updated, 'utf-8');
  }

  // Same for skills tables (grouped by phase per D-08).
  // ...
}

if (require.main === module) main();
module.exports = { injectBetweenMarkers, discoverSkillsRecursive };
```

### Wiring into `tools/build-docs.mjs`
```javascript
// Insert at top of main(), BEFORE checkDocLinks().
import { execSync } from 'node:child_process';
// ... existing code ...

async function main() {
  // ... platform check, banner ...

  // NEW: regenerate auto-gen tables BEFORE link-check (because rendered tables may contain links)
  injectReferenceTables();

  // EXISTING:
  checkDocLinks();
  cleanBuildDirectory();
  // ...
}

function injectReferenceTables() {
  printHeader('Injecting auto-generated reference tables');
  execSync('node tools/inject-reference-tables.cjs', {
    cwd: PROJECT_ROOT,
    stdio: 'inherit',
  });
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| BMAD-era docs at `docs/{tutorials,how-to,reference,explanation}/` | Cleanup + rewrite for v1.3 | Phase 11 (this phase) | 53 files deleted (27 EN + 26 zh-cn) + 12 new pages authored (6 EN + 6 zh-cn) + index/roadmap rewrites. |
| Hand-curated agents.md / skills.md | Auto-gen from `src/gomad-skills/*/SKILL.md` via HTML markers | D-05, D-06 (Phase 11) | Drift on the moving-target catalog (8 personas, 27 skills) becomes impossible by construction. Manual prose remains author-controlled. |
| `<installRoot>/gomad/agents/<shortName>.md` (v1.2) | `<installRoot>/_config/agents/<shortName>.md` (v1.3) | Phase 12 (AGENT-01 ships, DOCS-07 enforces) | Phase 11 docs author to v1.3 paths preemptively (D-10); validation by Phase 12. |
| Plugin marketplace (`.claude-plugin/marketplace.json`) | Removed | 2026-04-24 (pre-Phase 11) | `gomad install` CLI is the single distribution path. README/Quick-Start references should NOT mention marketplace. |

**Deprecated/outdated:**
- BMAD persona names (Mary, John, Winston, Amelia, Bob, Sally, Paige in BMAD context): the names persist as gomad personas (verified — same SKILL.md frontmatter), but BMAD module references (BMM, BMB, BMGD) are gone in gomad. New docs MUST NOT mention BMM/BMB/BMGD.
- Trigger codes (e.g., "CP", "VP", "EP" in current `docs/reference/agents.md`): obsolete in gomad's `/gm:agent-*` slash-command surface. Don't carry forward.
- "module / workflow / task" trichotomy from BMAD: simplified in gomad to "skill / persona". Don't reintroduce.

## Project Constraints (from CLAUDE.md)

`./CLAUDE.md` does not exist in the repo `[VERIFIED: 2026-04-26 ls / Read]`. No project-level Claude directives to honor beyond `.planning/STATE.md`, `.planning/PROJECT.md`, `.planning/REQUIREMENTS.md`, `.planning/ROADMAP.md`, and `docs/_STYLE_GUIDE.md`. The style guide acts as the de-facto authoring constraint:

| Rule (from `_STYLE_GUIDE.md`) | Implication for Phase 11 plans |
|-------------------------------|--------------------------------|
| No horizontal rules (`---`) outside frontmatter | Acceptance criteria: grep new pages for stray `\n---\n`; only frontmatter delimiters allowed. |
| No `####` headers | Use bold or admonitions. |
| No "Related" or "Next:" sections | Sidebar handles navigation. |
| 1-2 admonitions per section max (tutorials may use 3-4 per major section) | Reviewer should count. |
| Header budget: 8-12 `##` per doc; 2-3 `###` per section | Acceptance criteria: `grep -c '^## ' new-page.md` ∈ [8, 12]. |
| Diataxis structure | tutorials = learning, how-to = task, reference = info, explanation = understanding. Keep prose appropriate to type. |
| Admonition syntax `:::tip[Title] / :::note[Title] / :::caution[Title] / :::danger[Title]` | Strict — no Markdown blockquote callouts. |

## Existing BMAD Content Audit (D-01, D-02, D-04)

**Files to DELETE (53 total) — exact list:**

EN tutorials (1):
- `docs/tutorials/getting-started.md`

EN how-to (9):
- `docs/how-to/customize-gomad.md`
- `docs/how-to/established-projects.md`
- `docs/how-to/get-answers-about-gomad.md`
- `docs/how-to/install-gomad.md`
- `docs/how-to/non-interactive-installation.md`
- `docs/how-to/project-context.md`
- `docs/how-to/quick-fixes.md`
- `docs/how-to/shard-large-documents.md`
- `docs/how-to/upgrade-to-v6.md`

EN explanation (11):
- `docs/explanation/advanced-elicitation.md`
- `docs/explanation/adversarial-review.md`
- `docs/explanation/analysis-phase.md`
- `docs/explanation/brainstorming.md`
- `docs/explanation/checkpoint-preview.md`
- `docs/explanation/established-projects-faq.md`
- `docs/explanation/party-mode.md`
- `docs/explanation/preventing-agent-conflicts.md`
- `docs/explanation/project-context.md`
- `docs/explanation/quick-dev.md`
- `docs/explanation/why-solutioning-matters.md`

EN reference (6):
- `docs/reference/agents.md`
- `docs/reference/commands.md`
- `docs/reference/core-tools.md`
- `docs/reference/modules.md`
- `docs/reference/testing.md`
- `docs/reference/workflow-map.md`

zh-cn tutorials (1):
- `docs/zh-cn/tutorials/getting-started.md`

zh-cn how-to (9):
- `docs/zh-cn/how-to/customize-gomad.md`
- `docs/zh-cn/how-to/established-projects.md`
- `docs/zh-cn/how-to/get-answers-about-gomad.md`
- `docs/zh-cn/how-to/install-gomad.md`
- `docs/zh-cn/how-to/non-interactive-installation.md`
- `docs/zh-cn/how-to/project-context.md`
- `docs/zh-cn/how-to/quick-fixes.md`
- `docs/zh-cn/how-to/shard-large-documents.md`
- `docs/zh-cn/how-to/upgrade-to-v6.md`

zh-cn explanation (9 — note: zh-cn is missing `analysis-phase.md`, `checkpoint-preview.md` from EN):
- `docs/zh-cn/explanation/advanced-elicitation.md`
- `docs/zh-cn/explanation/adversarial-review.md`
- `docs/zh-cn/explanation/brainstorming.md`
- `docs/zh-cn/explanation/established-projects-faq.md`
- `docs/zh-cn/explanation/party-mode.md`
- `docs/zh-cn/explanation/preventing-agent-conflicts.md`
- `docs/zh-cn/explanation/project-context.md`
- `docs/zh-cn/explanation/quick-dev.md`
- `docs/zh-cn/explanation/why-solutioning-matters.md`

zh-cn reference (6):
- `docs/zh-cn/reference/agents.md`
- `docs/zh-cn/reference/commands.md`
- `docs/zh-cn/reference/core-tools.md`
- `docs/zh-cn/reference/modules.md`
- `docs/zh-cn/reference/testing.md`
- `docs/zh-cn/reference/workflow-map.md`

**Files to REWRITE (4):**
- `docs/index.md` — gomad landing page
- `docs/zh-cn/index.md` — same in Chinese
- `docs/roadmap.mdx` — pointer to `.planning/ROADMAP.md` OR delete (D-03 — planner's call)
- `docs/zh-cn/roadmap.mdx` — same disposition as EN

**Files to KEEP (5 untouched):**
- `docs/_STYLE_GUIDE.md` (frozen per CONTEXT.md "Specifics")
- `docs/zh-cn/_STYLE_GUIDE.md` (frozen, mirror)
- `docs/404.md` (custom 404, layout `splash`)
- `docs/zh-cn/404.md` (custom zh-cn 404)
- `docs/upgrade-recovery.md` (v1.2 manifest-driven cleanup recovery — still relevant)

**Files to CREATE (12 + auto-gen markers):**

EN (6):
- `docs/tutorials/install.md` (DOCS-01 part 1)
- `docs/tutorials/quick-start.md` (DOCS-01 part 2)
- `docs/how-to/contributing.md` (DOCS-05)
- `docs/reference/agents.md` (DOCS-02 — with `<!-- AUTO:agents-table-* -->` markers)
- `docs/reference/skills.md` (DOCS-03 — with `<!-- AUTO:skills-table-* -->` markers)
- `docs/explanation/architecture.md` (DOCS-04)

zh-cn (6 mirror):
- `docs/zh-cn/tutorials/install.md`
- `docs/zh-cn/tutorials/quick-start.md`
- `docs/zh-cn/how-to/contributing.md`
- `docs/zh-cn/reference/agents.md` (same markers; injector populates same table)
- `docs/zh-cn/reference/skills.md`
- `docs/zh-cn/explanation/architecture.md`

**Note:** Reference auto-gen tables are language-agnostic (data is from English SKILL.md frontmatter). The zh-cn pages get the same English-content table between markers. Hand-written prose around the markers IS translated. This matches the user's "iterate-and-patch" stance from D-14 — if persona-name translation is desired later, it's a future patch.

## Source-of-Truth Inventory: SKILL.md Frontmatter Audit

Verified all 8 personas + 19 task-skills + 11 core-skills have consistent frontmatter:

**8 personas** `[VERIFIED: 2026-04-26 read]`:

| Persona dir | `name:` | `description:` (from SKILL.md) | `displayName:` (from skill-manifest.yaml) |
|-------------|---------|-------------------------------|------------------------------------------|
| `1-analysis/gm-agent-analyst` | `gm-agent-analyst` | "Strategic business analyst…Mary" | Mary |
| `1-analysis/gm-agent-tech-writer` | `gm-agent-tech-writer` | "Technical documentation specialist…Paige" | Paige |
| `2-plan-workflows/gm-agent-pm` | `gm-agent-pm` | "Product manager…John" | John |
| `2-plan-workflows/gm-agent-ux-designer` | `gm-agent-ux-designer` | "UX designer…Sally" | Sally |
| `3-solutioning/gm-agent-architect` | `gm-agent-architect` | "System architect…Winston" | Winston |
| `4-implementation/gm-agent-dev` | `gm-agent-dev` | "Senior software engineer…Amelia" | Amelia |
| `4-implementation/gm-agent-sm` | `gm-agent-sm` | "Scrum master…Bob" | Bob |
| `4-implementation/gm-agent-solo-dev` | `gm-agent-solo-dev` | "Elite full-stack developer…Barry" | Barry |

**Task-skills** `[VERIFIED: 2026-04-26 ls + sample reads]` (no `skill-manifest.yaml`, but consistent SKILL.md frontmatter):

- `1-analysis`: gm-document-project, gm-prfaq, gm-product-brief, research/{gm-domain-research, gm-market-research, gm-technical-research}
- `2-plan-workflows`: gm-create-prd, gm-create-ux-design, gm-edit-prd, gm-validate-prd
- `3-solutioning`: gm-check-implementation-readiness, gm-create-architecture, gm-create-epics-and-stories, gm-generate-project-context
- `4-implementation`: gm-checkpoint-preview, gm-code-review, gm-correct-course, gm-create-story, gm-dev-story, gm-discuss-story, gm-domain-skill, gm-epic-demo-story, gm-qa-generate-e2e-tests, gm-quick-dev, gm-retrospective, gm-sprint-agent, gm-sprint-planning, gm-sprint-status

Total task-skills: 6 (analysis) + 4 (plan) + 4 (solutioning) + 14 (implementation) = **28 task-skills**.

Wait — corrects CONTEXT.md statement of "16 task-skills under 4-implementation/": there are actually **14** task-skills under `4-implementation/` (17 total dirs minus 3 personas). And 28 total task-skills across all phases. CONTEXT.md says "27 skills" — discrepancy. **Recommend planner verify by enumeration**, not trust the headline number.

**11 core-skills** `[VERIFIED: 2026-04-26 ls /Users/.../src/core-skills]`:
- gm-advanced-elicitation, gm-brainstorming, gm-distillator, gm-editorial-review-prose, gm-editorial-review-structure, gm-help, gm-index-docs, gm-party-mode, gm-review-adversarial-general, gm-review-edge-case-hunter, gm-shard-doc

Plus `module.yaml` and `module-help.csv` at `src/core-skills/` root (not skills themselves; configuration).

**Grand totals for the auto-gen table:**
- Personas: **8** (assert in injector)
- Task-skills: **28** (verify, don't trust 27)
- Core skills: **11**
- Total skills displayed in `/reference/skills`: **39** (8 personas + 28 task-skills + 11 core, OR 31 task+core if personas are listed separately on /reference/agents)

**D-09 contract recap:** `/gm:agent-*` slash commands exist for the 8 personas only. Task-skills (28) and core-skills (11) are invoked via the agent that owns them, not directly. Skills table column "How to invoke" should encode this:
- For personas: `/gm:agent-<shortName>` (full slash command)
- For task-skills + core-skills: e.g., "Invoked by `gm-agent-pm` (or any persona via skill loader)" — recommend a single column reading "Invoked by" with persona name(s) or "Any persona".

## Branch Isolation Mechanics (D-11) Verification

`[VERIFIED: .github/workflows/docs.yaml]`:
- Trigger: `push: branches: [main]` (line 5-6) + `workflow_dispatch:` (manual)
- Path filter: `docs/**`, `website/**`, `tools/build-docs.mjs`, `.github/workflows/docs.yaml` (lines 7-11)

**Conclusion:** Pushing to `docs/v13-content` (or any branch != `main`) does NOT trigger deploy. Phase 11 PR can sit indefinitely until Phase 12 publishes `1.3.0`, then both phases merge to main coordinated.

**Merge coordination point with Phase 12:** Phase 12's release plan (per ROADMAP.md "Phase 12 plan TBD") MUST include a step "merge `docs/v13-content` to main as part of release". Recommend planner explicitly call this out as a cross-phase dependency in Phase 11 plans.

**No CI surgery in Phase 11.** No `docs.yaml` edits. Verified.

## `tools/build-docs.mjs` `LLM_EXCLUDE_PATTERNS` Audit

Current (line 34-43) `[VERIFIED: tools/build-docs.mjs]`:

```javascript
const LLM_EXCLUDE_PATTERNS = [
  'changelog',
  'ide-info/',
  'v4-to-v6-upgrade',     // STALE — v4-to-v6 is BMAD upgrade content, post-cleanup zero refs
  'faq',
  'reference/glossary/',
  'explanation/game-dev/', // STALE — gomad has no game-dev module
  'bmgd/',                  // STALE — BMM Game Dev module, removed in gomad
];
```

**Stale entries (planner discretion to drop in cleanup commit):** `v4-to-v6-upgrade`, `explanation/game-dev/`, `bmgd/`. Current EN file `docs/how-to/upgrade-to-v6.md` matches `v4-to-v6-upgrade` and is in the delete list — once deleted, the pattern is dead weight.

**KEEP these patterns:**
- `changelog` — `docs/changelog.md` doesn't exist but the pattern is harmless and future-proofing.
- `ide-info/` — same.
- `faq` — covers `docs/explanation/established-projects-faq.md` (in delete list); harmless after deletion.
- `reference/glossary/` — covers a future glossary page; harmless if unused.

**Recommendation:** Drop `v4-to-v6-upgrade`, `explanation/game-dev/`, `bmgd/` in the cleanup commit. They're tied to deleted/never-existing BMAD content. Per CONTEXT.md "Claude's Discretion" item 9 — planner's call.

## Environment Availability

> External dependencies for Phase 11 build pipeline.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js (>= 20) | All build scripts, Astro | ✓ | (per `.nvmrc`, repo-pinned) | — |
| `npm` | dependency install + script runner | ✓ | bundled with Node | — |
| `@astrojs/starlight` | docs site framework | ✓ | 0.37.5 (installed); 0.38.4 latest on npm | — |
| `astro` | site builder | ✓ | 5.16.x (installed); 6.1.9 latest | — |
| Git history (`fetch-depth: 0` in CI) | `lastUpdated:` timestamps | ✓ | configured in `docs.yaml` line 30-32 | — |
| GitHub Pages permissions (`contents:read`, `pages:write`, `id-token:write`) | deploy step | ✓ | configured in `docs.yaml` line 14-17 | — |
| GitHub repo variable `SITE_URL` | astro.config.mjs site override | ✓ (optional) | — | astro.config.mjs falls back to `getSiteUrl()` computation from `GITHUB_REPOSITORY` |

**No new dependencies required.** No Docker, no Python, no system tools beyond Node + Git.

`[VERIFIED: 2026-04-26 ls /Users/rockie/Documents/GitHub/xgent/gomad/node_modules/@astrojs/starlight/package.json → 0.37.5]`
`[VERIFIED: 2026-04-26 npm view @astrojs/starlight version → 0.38.4]`
`[VERIFIED: 2026-04-26 npm view astro version → 6.1.9]`

## Validation Architecture

> `workflow.nyquist_validation: true` in `.planning/config.json` `[VERIFIED]`. This section is required.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | None for prose pages; project uses ad-hoc `node test/*.js` scripts and shell-based `npm run quality`. New auto-gen tool fits the same shape — `node test/test-inject-reference-tables.js`. |
| Config file | None needed (no Jest / Vitest). |
| Quick run command | `npm run docs:build` (~10-30s; runs link-check + inject + Astro build) |
| Full suite command | `npm run quality` (runs `docs:build` + `validate:skills` + `validate:refs` + `lint:md` + others) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DOCS-01 | `/tutorials/install` and `/tutorials/quick-start` render with steps | smoke (build success + page-exists check) | `npm run docs:build && test -f build/site/tutorials/install/index.html && test -f build/site/tutorials/quick-start/index.html` | ❌ Wave 0 (need install.md, quick-start.md to exist) |
| DOCS-02 | `/reference/agents` lists all 8 personas | unit (auto-gen output assertion) | `node test/test-inject-reference-tables.js` — assert generated table has exactly 8 rows, contains all 8 displayNames | ❌ Wave 0 |
| DOCS-03 | `/reference/skills` lists all 4-phase + core skills, grouped | unit | same test — assert skills table has expected count per phase, "Core" section with 11 entries | ❌ Wave 0 |
| DOCS-04 | `/explanation/architecture` page builds and renders 4-phase + manifest-v2 + slash-command content | smoke | `npm run docs:build && test -f build/site/explanation/architecture/index.html` + grep page for required keywords | ❌ Wave 0 |
| DOCS-05 | `/how-to/contributing` builds | smoke | `test -f build/site/how-to/contributing/index.html` | ❌ Wave 0 |
| DOCS-06 | All EN pages have zh-cn siblings | unit | `node test/test-zh-cn-parity.js` — for every file in `docs/{tutorials,how-to,reference,explanation}/`, assert matching `docs/zh-cn/<same-path>` exists | ❌ Wave 0 |
| Auto-gen idempotency | Re-running injector twice produces zero diff | unit | `node tools/inject-reference-tables.cjs && git diff --quiet docs/reference/ && node tools/inject-reference-tables.cjs && git diff --quiet docs/reference/` | ❌ Wave 0 |
| Style guide compliance | No `####`, no stray `---`, header budget | unit | `node test/test-doc-style.js` — grep new pages | ❌ Wave 0 (or rely on `npm run lint:md` if `markdownlint-cli2` rules cover) |
| Link validity | No broken internal links | smoke (already wired in build pipeline) | `npm run docs:validate-links` | ✓ exists |

### Sampling Rate

- **Per task commit:** `npm run docs:build` (the full pipeline runs end-to-end in ~10-30 seconds).
- **Per wave merge:** `npm run quality` (full project gate).
- **Phase gate:** `npm run quality` green; manual visual check of `npx astro dev --root website` localhost render of all 12 new pages + index/roadmap.

### Wave 0 Gaps

- [ ] `tools/inject-reference-tables.cjs` — covers DOCS-02, DOCS-03 auto-gen behavior
- [ ] `test/test-inject-reference-tables.js` — covers persona-count assertion (8), skill-count assertion, idempotency
- [ ] `test/test-zh-cn-parity.js` — covers DOCS-06 mirror invariant
- [ ] (Optional) `test/test-doc-style.js` — header budget, no `####`, no stray `---` — only if `markdownlint-cli2` config doesn't cover. Verify by reading `.markdownlint*.{json,yaml,jsonc}` config first.
- [ ] Marker insertion in source `docs/reference/agents.md` and `docs/reference/skills.md` — must exist before injector can run; cleanup-plan + reference-pages plan dependency.
- [ ] No new test framework needed; existing `node test/*.js` shape suffices.

## Security Domain

> `security_enforcement` is not in `.planning/config.json` (only `workflow.*` keys present). Treating as not-explicitly-disabled but security implications for content-only docs phase are minimal.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Static docs site, no auth surface. |
| V3 Session Management | no | Static. |
| V4 Access Control | no | Public site. |
| V5 Input Validation | partial | Auto-gen tool reads SKILL.md frontmatter — these are project-internal files, not user input. Still: HTML-escape table cell content (markdown pipe `\|` escaping) to avoid table corruption from descriptions containing pipes. |
| V6 Cryptography | no | No secrets in docs site. `SITE_URL` is a public override variable. |

### Known Threat Patterns for Static Docs Site

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Markdown pipe-character corruption in auto-gen tables | Tampering | Escape `\|` in cell content via simple `replace(/\|/g, '\\|')` in `escapeCell()` helper. |
| Path traversal in injector script (reading outside repo) | Tampering | Use `path.join(PROJECT_ROOT, ...)` exclusively; never accept user-controlled path input. The script has no CLI args. |
| Stale BMAD content leaking into llms-full.txt | Tampering | Not a security issue per se but noted: cleanup pass + dropping stale `LLM_EXCLUDE_PATTERNS` entries. |
| Public `gomad.xgent.ai` deploys preview content prematurely | Disclosure | Branch isolation (D-11) — feature branch does NOT deploy. Verified workflow trigger. |

**No new attack surface introduced by Phase 11.** The auto-gen tool reads internal repo files only.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Phase 12's release plan will include a step to merge `docs/v13-content` to `main` as part of `npm publish` | Branch Isolation Mechanics | If forgotten, Phase 11 PR sits forever or merges to main before Phase 12 ships, exposing v1.3 paths in docs while v1.2 is on npm. **Mitigation:** Phase 11 plan should include a "follow-up: notify Phase 12 planner" task or comment in the PR description. `[ASSUMED]` |
| A2 | Drop-stale-LLM_EXCLUDE_PATTERNS in cleanup commit is safe — no remaining BMAD content matches those patterns post-cleanup | LLM_EXCLUDE_PATTERNS Audit | If a stray bmgd/ reference survives cleanup, dropping the pattern would inflate llms-full.txt above the 600k char limit (build fails) or just include junk (warning logged at 500k). **Mitigation:** After cleanup commit, run `npm run docs:build` and confirm the size warning doesn't trigger; OR keep the patterns out of caution. `[ASSUMED — depends on cleanup completeness]` |
| A3 | Re-using `parseFrontmatterMultiline` from `validate-skills.js` via `require('./validate-skills.js')` works in CommonJS without side effects | Code Examples / Pattern 2 | If `validate-skills.js` runs `if (require.main === module) main();` (it does — line 699), requiring it from a sibling won't trigger main() (correct), but the `console.log` of validation output won't fire. Verified safe. **Note:** the export at line 739 is the only contract used. `[VERIFIED: tools/validate-skills.js line 699-739 — main() guarded by require.main check]` |
| A4 | Total task-skills is 28 (not 27 as CONTEXT.md states) and total skills displayed is 39 — verified by enumeration | Source-of-Truth Inventory | If wrong, /reference/skills shows fewer rows than expected. Auto-gen test asserts exact counts; planner should reconfirm by `find src/gomad-skills -name SKILL.md | wc -l` after any source changes. `[VERIFIED 2026-04-26 — count may drift if Phase 10 adds/removes skills]` |
| A5 | zh-cn auto-gen tables can stay in English (data from EN frontmatter) — no per-locale persona-name translation in v1.3 | Existing BMAD Content Audit > zh-cn parity | If user expected localized persona names ("玛丽" instead of "Mary"), zh-cn /reference/agents looks half-translated. **Mitigation:** D-14 explicitly says "iterate-and-patch" — accept if user surfaces it later. `[ASSUMED — interpretation of D-14 + zh-cn page semantics]` |
| A6 | Build-docs.mjs ESM (uses `import`) can call out to a CommonJS injector via `execSync('node tools/inject-reference-tables.cjs')` | Code Examples > Wiring | Verified pattern — same approach used for `validate-doc-links.js` at line 459. `[VERIFIED]` |
| A7 | Style guide rule "No 'Related' / 'Next:' sections" still applies — even though Diataxis tutorials sometimes chain | Project Constraints | If a tutorial chain (install → quick-start) needs in-page "Next: Quick Start" prose, it's forbidden. Sidebar order=1,2 carries the chain. **Mitigation:** rely on sidebar; don't add Next: prose. `[VERIFIED: docs/_STYLE_GUIDE.md line 14]` |

**6 assumptions flagged** — most low-risk; A1 (cross-phase coordination) and A5 (zh-cn translation expectations) are the highest risk to surface for confirmation.

## Open Questions

1. **Should `docs/roadmap.mdx` be deleted or rewritten as a pointer?** (D-03 leaves to planner)
   - What we know: It's currently a BMAD-style roadmap with v1.1-era content. `.planning/ROADMAP.md` is the live source of truth (in repo, not on the deployed docs site).
   - What's unclear: Does the gomad.xgent.ai audience benefit from a public roadmap page, or is GitHub repo browsing sufficient?
   - Recommendation: **Delete** `docs/roadmap.mdx` and `docs/zh-cn/roadmap.mdx`. The Starlight sidebar config in `astro.config.mjs` line 96-100 has an explicit `slug: 'roadmap'` entry — that line must also be removed in the same commit, or Starlight will warn about a missing slug. Smaller surface area; `.planning/ROADMAP.md` lives in git and is one click away on GitHub. **If kept,** rewrite as a single short pointer page that links to `https://github.com/xgent-ai/gomad/blob/main/.planning/ROADMAP.md` and surfaces current milestone status.

2. **Auto-gen tool: separate file or section in `tools/build-docs.mjs`?** (Claude's discretion)
   - What we know: build-docs.mjs is ESM (`.mjs` with `import`); injector should ideally be CommonJS for consistency with other tools (`validate-skills.js`, `validate-file-refs.js`, etc.).
   - What's unclear: whether mixing CJS+ESM via execSync is acceptable.
   - Recommendation: **Separate file `tools/inject-reference-tables.cjs`** (CommonJS), called from build-docs.mjs via `execSync`. Matches the existing pattern (build-docs.mjs already calls `validate-doc-links.js` via execSync at line 459). Cleaner separation; injector can be unit-tested standalone.

3. **Where should the "skill-manifest.yaml" data feed in?** (D-07 for personas)
   - What we know: `displayName:` (e.g., "Barry") lives in `skill-manifest.yaml`, not SKILL.md. SKILL.md `description:` field has the persona name embedded in prose, but it's clean to read it from the manifest.
   - What's unclear: should the injector parse YAML (would need new dep `yaml` — already allowed per CONTEXT.md "no zero-new-deps but `fs-extra`, `glob`, `yaml`, `csv-parse/sync` are pre-allowed") or extract displayName from SKILL.md body via regex (`# Mary` heading)?
   - Recommendation: **Use the `yaml` package** (already available; CONTEXT.md "Established Patterns" line 128 explicitly lists it as allowed). Reads `skill-manifest.yaml`, gets `displayName`. For task-skills (no manifest), there's no displayName — just the skill name. Cleanest.

4. **What's the Phase 11 PR's branch name?** (D-11 says "or equivalent")
   - What we know: CONTEXT.md suggests `docs/v13-content`. `.planning/config.json` `git.phase_branch_template` is `gsd/phase-{phase}-{slug}` → `gsd/phase-11-docs-site-content-authoring`.
   - Recommendation: Use the project's `phase_branch_template` for consistency: `gsd/phase-11-docs-site-content-authoring`. The string identity doesn't matter for the deploy gate (any branch != main blocks deploy); use the project convention.

5. **Should the cleanup commit also remove `docs/zh-cn/_STYLE_GUIDE.md`?**
   - What we know: zh-cn _STYLE_GUIDE.md exists `[VERIFIED]`; mirrors EN _STYLE_GUIDE.md.
   - What's unclear: It's prefixed with `_` so excluded from llms-full.txt and from sidebar. Already valid. Treat as keep.
   - Recommendation: **Keep both `_STYLE_GUIDE.md` files.** They're authoring references, not user-facing content. Deletion adds friction for future zh-cn authors.

## Sources

### Primary (HIGH confidence)
- `tools/build-docs.mjs` (lines 1-468) — full read of build pipeline ordering, link-check wiring, LLM_EXCLUDE_PATTERNS
- `tools/validate-skills.js` (lines 1-740) — frontmatter parser pattern + `require.main === module` guard + `module.exports`
- `tools/validate-doc-links.js` (lines 1-50) — link-check entry point used by build pipeline
- `website/astro.config.mjs` — Starlight integration config, sidebar autogen, i18n locales, custom 404, head meta tags
- `website/src/lib/locales.mjs` — locale config (root for EN, zh-cn for Chinese)
- `node_modules/@astrojs/starlight/schema.ts` — authoritative frontmatter schema (Starlight 0.37.5)
- `.github/workflows/docs.yaml` — deploy trigger and permissions verified
- `docs/_STYLE_GUIDE.md` — frozen authoring rules (header budget, admonition syntax, forbidden patterns)
- `.planning/REQUIREMENTS.md` (lines 13-23) — DOCS-01..06 spec
- `.planning/ROADMAP.md` (lines 71-82) — Phase 11 goal + success criteria
- `.planning/STATE.md` — current execution state
- `src/gomad-skills/*/gm-agent-*/SKILL.md` (all 8) — frontmatter shape verified
- `src/gomad-skills/*/gm-agent-*/skill-manifest.yaml` (all 8) — `displayName` + richer metadata verified
- `src/core-skills/` — directory listing verified, 11 core skills enumerated

### Secondary (MEDIUM confidence)
- Context7 `/withastro/starlight` library (resolved via `npx ctx7@latest library starlight`) — i18n fallback, locale config, frontmatter examples — cross-verified with installed version's schema.ts
- `npm view @astrojs/starlight version` → 0.38.4 (current) vs 0.37.5 (installed) — minor version gap, no breaking changes affecting Phase 11

### Tertiary (LOW confidence)
- (None — all critical claims verified against repo state or Starlight source code in `node_modules/`.)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all components installed and verified locally; Starlight schema read from source
- Architecture (sidebar autogen, i18n, link-check, LLM-flat): HIGH — directly read from `astro.config.mjs`, `locales.mjs`, `build-docs.mjs`
- Auto-gen pattern (D-06): MEDIUM-HIGH — pattern is well-understood (regex marker substitution); idempotency contract is straightforward; only "novel" piece is wiring into build-docs.mjs ordering
- Cleanup target list (D-01, D-02): HIGH — exhaustively enumerated by `find` on `docs/`
- Pitfalls: HIGH — derived from concrete repo reads + Starlight docs
- zh-cn behavior: HIGH — fallback confirmed via Context7 from official Starlight docs
- Skill counts (8 personas, 28 task-skills, 11 core): HIGH — counted by `find` and `ls`. **Note:** CONTEXT.md says "27 skills" — discrepancy with our 28; planner should re-verify.

**Research date:** 2026-04-26
**Valid until:** 2026-05-26 (30 days — Starlight ships rapidly but Phase 11 ships on a feature branch immediately; if delayed past May 26, re-verify Starlight version pin and re-run npm view checks)

---

*Phase 11 research complete. Planner can now create PLAN.md files. Recommended plan ordering:*
*1. Cleanup plan (delete BMAD pages + rewrite index/roadmap + drop stale LLM_EXCLUDE patterns + remove `slug: 'roadmap'` from astro.config.mjs sidebar if roadmap deleted)*
*2. Auto-gen tooling plan (`tools/inject-reference-tables.cjs` + wire into `build-docs.mjs` + Wave 0 tests)*
*3. Reference pages plan (`reference/agents.md` + `reference/skills.md` with markers + zh-cn mirrors)*
*4. Tutorials plan (`tutorials/install.md` + `tutorials/quick-start.md` + zh-cn mirrors)*
*5. Architecture explainer plan (`explanation/architecture.md` + zh-cn mirror)*
*6. Contributing how-to plan (`how-to/contributing.md` + zh-cn mirror)*
*Plans 4/5/6 can run in any order or in parallel; plans 1 and 2 must come first.*
