# Phase 11: Docs Site Content Authoring - Context

**Gathered:** 2026-04-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Author the 6 v1.3 docs pages required by DOCS-01..06 — `/tutorials/install`, `/tutorials/quick-start`, `/reference/agents`, `/reference/skills`, `/explanation/architecture`, `/how-to/contributing` — plus full `/zh-cn/` parity, deployed to `gomad.xgent.ai` via the existing Starlight + GitHub Pages pipeline (`.github/workflows/docs.yaml`, already shipped in v1.2). Includes rewriting the homepage (`docs/index.md`) and `docs/roadmap.mdx` so the live sidebar surfaces only intended content. Includes a cleanup pass that removes the ~25 inherited BMAD-era pages under `docs/{tutorials,how-to,reference,explanation}/` and the parallel `docs/zh-cn/` scaffolding.

Out of this phase: DOCS-07 path validator (`tools/validate-doc-paths.js` ships in Phase 12), the v1.3 npm release itself (Phase 12), agent-dir relocation (Phase 12), search/blog/versioned-docs surfaces, machine-translation pipeline tooling, glossary lock for zh-cn terminology.

</domain>

<decisions>
## Implementation Decisions

### Inherited BMAD Content Disposition

- **D-01:** Delete all ~25 inherited BMAD-era pages from `docs/{tutorials,how-to,reference,explanation}/` rather than archiving or leaving alongside. The Starlight sidebar autogenerates from these directories (`autogenerate: { directory: 'tutorials' }`, etc.), so leaving them produces a confusing live site mixing `gomad-*` and `gm-agent-*` terminology, BMAD persona names (Mary/John/Winston), and BMM module references. Archive-to-`_archive/` was rejected because `build-docs.mjs` already excludes underscore-prefixed paths and we don't expect to salvage BMAD-era prose.
- **D-02:** Mirror EN disposition in `docs/zh-cn/`. Whatever EN does, zh-cn does in the same plan/commit. The current `docs/zh-cn/` tree contains the same English BMAD content as the EN scaffolding (zh-cn translations were never authored beyond the v1.1 README), so deletion is lossless.
- **D-03:** `docs/index.md` (homepage) and `docs/roadmap.mdx` are in scope for Phase 11. Both currently reference BMAD personas and pre-fork roadmap items. The homepage gets rewritten as the gomad landing page (overview + sidebar pointers); `roadmap.mdx` is rewritten as a thin pointer to current milestone status (or deleted in favor of `.planning/ROADMAP.md` — planner picks, document either way).
- **D-04:** Cleanup happens before authoring, not interleaved. Plan ordering: (1) cleanup plan deletes EN BMAD pages + zh-cn scaffold + handles index/roadmap + leaves `docs/_STYLE_GUIDE.md`, `docs/404.md`, `docs/upgrade-recovery.md` in place; (2-N) authoring plans deliver new pages. Cleanup is reversible if we regret a delete; tightly coupling cleanup to authoring would block partial Phase 11 landing.

### Reference Pages: Source-of-Truth Posture

- **D-05:** Hybrid approach — auto-generate the structural tables from `src/gomad-skills/*/SKILL.md` frontmatter at build time; hand-author the narrative prose, intros, and grouping commentary. Avoids drift on the moving-target catalog (8 personas, ~27 skills) while preserving prose quality. Differs from the recommended hand-author + validator option because the user prioritized structural accuracy over coverage policing.
- **D-06:** Auto-gen injection mechanism: HTML comment markers in the `.md` source. Authors leave `<!-- AUTO:agents-table-start --> ... <!-- AUTO:agents-table-end -->` (and `<!-- AUTO:skills-table-start -->`) in `reference/agents.md` and `reference/skills.md`. `tools/build-docs.mjs` (or a new sibling step) replaces content between markers before the Astro build emits `build/site/`. Markers are visible in source; manual edits outside the markers survive regenerations; pattern carries over to LLM-flat output naturally.
- **D-07:** `/reference/agents` table columns: **Persona name** (e.g., "Barry"), **Slash command** (e.g., `/gm:agent-solo-dev`), **Phase** (Analysis / Planning / Solutioning / Implementation), **Purpose** (from SKILL.md `description:` field). 4 columns. Phase column derived from parent dir (`src/gomad-skills/N-*/`).
- **D-08:** `/reference/skills` grouping: top-level sections mirror the `src/gomad-skills/` structure — "1. Analysis", "2. Planning", "3. Solutioning", "4. Implementation", "Core". DOCS-03 spec literally says "grouped by workflow layer". Auto-gen table within each section lists the skills in that phase.
- **D-09:** Skills reference must reflect the Phase 10 D-04 contract (task-skills do NOT have `/gm:*` launchers — only `gm-agent-*` personas do). Skills table column for "How to invoke" should not assume slash-command form for everything. Planner picks the safest column phrasing (e.g., "Invoked via the agent that owns it" for task-skills vs `/gm:agent-*` for personas).

### Path Examples & Deploy Timing

- **D-10:** Author all path references with the **v1.3 layout** (`<installRoot>/_config/agents/`), not the currently-shipped v1.2 layout (`<installRoot>/gomad/agents/`). Implication: live `gomad.xgent.ai` would diverge from shipped npm reality during the Phase 11→12 window.
- **D-11:** Resolve the divergence by **gating deploy via branch isolation**. All Phase 11 work lands on `docs/v13-content` branch (or equivalent). `docs.yaml` workflow stays untouched — the `push: branches: [main]` trigger is fine because nothing merges to main from this phase. Merge to main happens only after Phase 12 publishes `@xgent-ai/gomad@1.3.0`. Practical: Phase 11 ships its own PR; Phase 12's release plan includes the Phase 11 merge as a coordinated step.
- **D-12:** Path cleanliness is validated by **DOCS-07 in Phase 12** (`tools/validate-doc-paths.js`), not Phase 11. Phase 11 declares "authored to v1.3 spec" without adding its own grep validator. Avoids scope creep; Phase 12 already owns the gate.

### zh-cn Translation Strategy

- **D-13:** Authoring sequence: **EN-first, then translate per page**. Each page has two passes — first the EN page lands and is reviewed; then the zh-cn translation lands. Locks technical accuracy (fact-checked in EN) before the translation pass. Co-authoring EN + zh-cn together was rejected to avoid retranslating when EN gets reviewed.
- **D-14:** **Claude drafts and commits zh-cn translations without human pre-review.** No glossary lock, no post-merge review window. Velocity prioritized over translation quality gating. Treats zh-cn as "good enough to ship and iterate" — patches happen only if the user spots an issue post-publish. Risk: terminology drift across pages, brand-voice inconsistency. Accepted because the user is bilingual and can patch fast, and because v1.3 zh-cn audience is small relative to EN.

### Claude's Discretion

- Exact wording of homepage `docs/index.md` rewrite (within the gomad landing-page brief).
- Whether to delete `docs/roadmap.mdx` outright or rewrite it as a pointer to `.planning/ROADMAP.md` — D-03 lets planner choose.
- Exact filename and placement of the auto-gen build step (new file vs section in existing `tools/build-docs.mjs`).
- Skills table layout details (e.g., whether to show invoke form, the "trigger" code, or both).
- Architecture explainer page structure within `/explanation/architecture` (single page vs. light section structure) — within the spec's "4-phase workflow + manifest-v2 installer + launcher-form slash commands" envelope.
- Tutorial step ordering in `/tutorials/install` and `/tutorials/quick-start` (within DOCS-01 spec).
- Contributing guide section breakdown in `/how-to/contributing` (within DOCS-05 spec).
- Whether to update `tools/build-docs.mjs` `LLM_EXCLUDE_PATTERNS` to drop stale entries (`bmgd/`, `v4-to-v6-upgrade`, `explanation/game-dev/`) as part of the cleanup commit.

### Folded Todos

None — no pending todos matched Phase 11 scope (`gsd-sdk query todo.match-phase 11` returned `count: 0`).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents (researcher, planner, executor) MUST read these before planning or implementing.**

### Milestone scope + requirements

- `.planning/PROJECT.md` — Overall project context, v1.3 milestone goal; **note discrepancy:** Active list says "7 `gm-agent-*` personas" but `src/gomad-skills/*/gm-agent-*/` contains 8 (added `gm-agent-solo-dev` Barry). DOCS-02 and ROADMAP correctly say 8. Also note PROJECT.md "GitHub Pages deployment ... actual deploy deferred until project stabilizes" appears stale — pipeline already shipped in v1.2 per ROADMAP.
- `.planning/REQUIREMENTS.md` §"Active" + lines 17-23 (DOCS-01..06) — The 6 locked requirements for this phase. DOCS-07 explicitly belongs to Phase 12.
- `.planning/ROADMAP.md` §"Phase 11: Docs Site Content Authoring" — Goal, depends-on (Phase 12 soft dep via DOCS-07), success criteria.
- `.planning/MILESTONES.md` — v1.3 milestone entry.
- `.planning/phases/10-story-creation-enhancements/10-CONTEXT.md` — Reference for prior-phase decision style; D-04 (task-skills are skill-only, no launcher-form slash commands) directly affects D-09 here.

### Docs site infrastructure (already shipped)

- `website/astro.config.mjs` — Starlight config, sidebar definition (autogenerate by directory), i18n locales config, custom CSS, head tags for LLM discovery, custom 404 routing.
- `website/src/lib/locales.mjs` — Locale config (`root` for EN, `zh-CN` for zh-cn).
- `website/src/content/i18n/zh-CN.json` — Starlight UI string translations for zh-cn (already populated).
- `website/src/content/docs` → symlink to `../../../docs` — single source of truth for content lives in `docs/`.
- `tools/build-docs.mjs` — Build pipeline (link checking → cleanup → llms.txt artifact generation → Astro build); `LLM_EXCLUDE_PATTERNS` constant currently includes some BMAD-era paths that may need cleanup.
- `.github/workflows/docs.yaml` — Auto-deploy on push to `main` for paths matching `docs/**`, `website/**`, `tools/build-docs.mjs`, or `.github/workflows/docs.yaml`. Permissions + concurrency already configured for GitHub Pages.
- `docs/_STYLE_GUIDE.md` — Project documentation conventions (Diataxis structure, Starlight admonition syntax, no `---`, no `####`, header budget 8-12 `##` per doc).
- `docs/404.md` — Custom 404 page (not stale, leave in place).
- `docs/upgrade-recovery.md` — v1.2 backup-restore documentation (not stale, leave in place).

### Source content for auto-gen reference tables

- `src/gomad-skills/*/gm-agent-*/SKILL.md` — 8 persona files (analyst, tech-writer, pm, ux-designer, architect, dev, sm, solo-dev); frontmatter `name:` + `description:` feed the agents table.
- `src/gomad-skills/*/gm-*/skill-manifest.yaml` — Per-skill manifest (16 task-skills under `4-implementation/` plus skills under 1-3); supplements SKILL.md for the skills table.
- `src/core-skills/` — 11 core skills (`gm-advanced-elicitation`, `gm-brainstorming`, `gm-distillator`, `gm-editorial-review-prose`, `gm-editorial-review-structure`, `gm-help`, `gm-index-docs`, `gm-party-mode`, `gm-review-adversarial-general`, `gm-review-edge-case-hunter`, `gm-shard-doc`) plus `module.yaml` and `module-help.csv`.
- `src/gomad-skills/4-implementation/gm-agent-solo-dev/SKILL.md` — Confirms 8th persona ("Barry") that PROJECT.md hasn't yet recorded.

### Validator pattern reference

- `tools/validate-skills.js` — Reference shape for any new build-docs validator (e.g., a coverage validator if we revisit D-05); same loader pattern.
- Phase 12's planned `tools/validate-doc-paths.js` (DOCS-07) — Will validate path canonicalization after Phase 11 ships. Planner does NOT need to author this.

### v1.3 paths to use in docs (D-10)

- `<installRoot>/_config/agents/<shortName>.md` — Persona body location (post-v1.3, pre-v1.3 was `<installRoot>/gomad/agents/`).
- `<installRoot>/_config/kb/<slug>/` — Domain knowledge packs (Phase 10 ships this).
- `<installRoot>/_config/files-manifest.csv` — Install manifest v2 (already at this path in v1.2).
- `.claude/commands/gm/agent-*.md` — Launcher stubs (path unchanged across v1.2 → v1.3).

### Inspiration / pattern docs

- `docs/reference/agents.md` (current state) — Reference for the table shape we're replacing; do NOT use its content (BMAD-era).
- `docs/tutorials/getting-started.md` (current state) — Reference for tutorial-style prose flow; do NOT use its content (13kB of BMAD-era).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- **`docs/` symlinked into `website/src/content/docs/`** — Single source of truth; new pages land in `docs/`, the Starlight sidebar autogenerates from those directories. No content collection schema work needed.
- **Starlight admonition syntax + custom 404 + i18n locales** — All wired in `website/astro.config.mjs`. Authors just write `:::tip[]` / `:::note[]` / `:::caution[]` / `:::danger[]`; locale prefix `/zh-cn/` works via Starlight's default routing.
- **`tools/build-docs.mjs` link checker** — Validates internal markdown links before build; new pages benefit automatically. `LLM_EXCLUDE_PATTERNS` can be updated to drop stale BMAD entries during cleanup.
- **`docs/_STYLE_GUIDE.md`** — Already-authored project conventions; new pages must honor the existing rules (no horizontal rules, header budget, admonition usage). Style guide itself is not in scope for revision in this phase.
- **`.github/workflows/docs.yaml`** — Already set up for auto-deploy on push to `main`; no CI work needed.
- **`gm-agent-*` SKILL.md files** — 8 persona files with consistent frontmatter shape (`name:` + `description:`); auto-gen script can rely on this contract.
- **`tools/validate-skills.js`** — Pattern reference for any new build-docs tooling: load files via glob, parse frontmatter, validate, exit codes for `npm run quality`.

### Established Patterns

- **CommonJS `require()` everywhere in tools/** — locked since v1.2; any new auto-gen build script must follow.
- **Zero new runtime deps (v1.2 → v1.3 carry)** — Use `fs-extra`, `glob`, `yaml`, `csv-parse/sync` (already installed). The auto-gen step uses Node built-ins + `yaml` for SKILL.md frontmatter parsing.
- **Diataxis structure** — `docs/{tutorials,how-to,reference,explanation}/` directories drive Starlight sidebar groups via `autogenerate: { directory: '...' }`.
- **Locale routing** — `docs/zh-cn/<path>.md` automatically becomes `/zh-cn/<path>` on the site; same Diataxis structure inside the locale.
- **Sidebar order via frontmatter** — `sidebar: { order: N }` in page frontmatter controls position within an autogenerated group.
- **HTML comment markers as build-time injection points** — Standard Astro/Starlight pattern; no new framework needed (D-06).
- **Branch-based release coordination** — Phase 11 lands on `docs/v13-content` branch (D-11); Phase 12 release plan owns the merge.

### Integration Points

- **`docs/{tutorials,how-to,reference,explanation}/`** — Cleanup deletes ~25 files; new pages land at known paths (`tutorials/install.md`, `tutorials/quick-start.md`, `reference/agents.md`, `reference/skills.md`, `explanation/architecture.md`, `how-to/contributing.md`).
- **`docs/zh-cn/{tutorials,how-to,reference,explanation}/`** — Mirror EN structure; same 6 file paths under `/zh-cn/`.
- **`docs/index.md`** — Rewrite as the gomad landing page (D-03).
- **`docs/roadmap.mdx`** — Rewrite as pointer to current milestone or delete (D-03; planner picks).
- **`tools/build-docs.mjs`** — New step (or sibling script) for auto-gen table injection (D-06). May also update `LLM_EXCLUDE_PATTERNS` to drop stale entries (`bmgd/`, `v4-to-v6-upgrade`, `explanation/game-dev/`) per Claude's discretion in cleanup commit.
- **`src/gomad-skills/*/SKILL.md`** — Read-only input to the auto-gen step; no source files modified.
- **`docs/_STYLE_GUIDE.md`** — Read-only reference; new pages adhere to existing rules.
- **`.github/workflows/docs.yaml`** — Untouched; deploy gating happens via branch isolation (D-11), not workflow modification.
- **GitHub PR flow** — Phase 11 ships as a single PR off `docs/v13-content`. Merge gated until Phase 12 publishes `@xgent-ai/gomad@1.3.0`.

</code_context>

<specifics>
## Specific Ideas

- **User confirmed bilingual authorship history** — picked "Claude drafts and commits zh-cn without human review" + "Full velocity, no gate" (D-14). Treats zh-cn translation as iterative ship-and-patch rather than gated authoring. Planner should NOT plan a glossary lock, post-publish review checklist, or zh-cn-specific QA step.
- **User explicitly accepted divergence from `--auto`-recommended option for D-05** — picked "Hybrid auto-gen tables + hand-author narrative" instead of the recommended "Hand-author + validator". Signals prioritization of structural accuracy over coverage policing. Auto-gen is the correctness mechanism, not a separate validator.
- **8 personas, not 7** — `gm-agent-solo-dev` ("Barry") was added after PROJECT.md was last updated. Auto-gen makes this irrelevant for the docs themselves but planner should note it for any narrative prose ("the 8 specialized agent personas").
- **Discrepancy between PROJECT.md and live state** — PROJECT.md "deploy deferred until project stabilizes" is stale; the docs.yaml pipeline already auto-deploys. Planner should NOT plan to "wire up the deploy pipeline." Planner SHOULD update PROJECT.md "Out of Scope > GitHub Pages deployment" entry as part of Phase 11 (or flag for milestone-close cleanup).
- **The site already has `meta` tags for `llms.txt` / `llms-full.txt` LLM discovery** — Planner should ensure new content is included in the LLM-flat output (build-docs.mjs handles this; no new work unless content is structured to bypass extraction).
- **Style guide is FROZEN for this phase** — Earlier in discussion the user deferred the style-guide revision question without exploring it. Treat `docs/_STYLE_GUIDE.md` as immutable in Phase 11.

</specifics>

<deferred>
## Deferred Ideas

- **Style guide revision** — Surfaced in discussion but deferred. If new authoring runs into style-guide friction (e.g., "no Related/Next sections" conflicts with Diataxis tutorial chains), planner can flag for a separate patch.
- **Architecture explainer split into 2-3 subpages** — Considered as a depth-control option; left to Claude's discretion within DOCS-04's "one page" framing.
- **Page count expansion (e.g., adding `/reference/commands`, `/how-to/upgrade`)** — Deferred. Phase 11 ships exactly the 6 spec'd pages plus index/roadmap rewrites.
- **Auto-deploy posture revisit (banner, branch protection)** — Resolved via D-11 branch isolation; no temporary workflow disable, no preview banner.
- **zh-cn glossary lock (`docs/_GLOSSARY-zh.md`)** — Considered as zh-cn safety net; rejected per D-14 in favor of full velocity.
- **Post-merge zh-cn review window** — Considered as zh-cn safety net; rejected per D-14.
- **Validate-doc-coverage.js** — Considered as Area 2 scope; deferred in favor of the auto-gen approach (D-05) which makes coverage drift impossible by construction.
- **Path validator (`tools/validate-doc-paths.js`)** — Belongs to Phase 12 (DOCS-07), confirmed by D-12.
- **Symbolic path tokens (e.g., `<installRoot>/<agentsDir>/`)** — Considered for path-layout flexibility; rejected per D-10 in favor of literal v1.3 paths.
- **`gm-dev-story` fresh-retrieval integration for `gm-domain-skill`** — Inherited from Phase 10 deferred list; NOT in Phase 11 scope (no docs to author).
- **PROJECT.md "Out of Scope > GitHub Pages deployment" cleanup** — Stale entry surfaced during scouting; should be removed or updated. Planner may include in Phase 11 cleanup commit OR flag for milestone-close edit.
- **`tools/build-docs.mjs` LLM_EXCLUDE_PATTERNS cleanup** — Stale BMAD entries (`bmgd/`, `v4-to-v6-upgrade`, `explanation/game-dev/`); Claude's discretion whether to clean during cleanup commit (D-04 implies leaving for safety unless trivial).

### Reviewed Todos (not folded)

None — `gsd-sdk query todo.match-phase 11` returned 0 todos. No pending todos matched Phase 11 scope.

</deferred>

---

*Phase: 11-docs-site-content-authoring*
*Context gathered: 2026-04-26*
