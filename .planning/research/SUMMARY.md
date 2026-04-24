# Project Research Summary — GoMad v1.3

**Project:** GoMad v1.3 "Marketplace, Docs & Story Context"
**Domain:** CLI installer + skills framework (Node.js/CommonJS, npm `@xgent-ai/gomad`) + static docs site (Astro/Starlight) + Claude Code plugin marketplace
**Researched:** 2026-04-24
**Confidence:** HIGH

## Executive Summary

GoMad v1.3 is a public-surface milestone on top of the shipped v1.2 baseline: four workstreams (marketplace refresh, docs content, agent-dir relocation, story-creation enhancements) that together refresh the project's external face and wire in a story-level context protocol plus a domain-knowledge retrieval primitive. Every workstream is implementable **with zero new runtime dependencies** using already-installed packages (`csv-parse/sync`, `fs-extra`, `glob`, `yaml`, `semver`) plus Node built-ins — this constraint, confirmed across all 4 research docs, is load-bearing and should be re-asserted at every phase gate. Sources are HIGH confidence: Claude Code marketplace schema fetched from `code.claude.com`, Astro/Starlight config verified by direct file reads, every installer touchpoint anchored to a `file:line` in the v1.2 codebase.

Three discoveries overturn assumptions in the PROJECT.md scope and drive the phase ordering. **First:** the docs site is not an "under-construction one-pager" — `.github/workflows/docs.yaml` already auto-deploys a full Starlight site to `gomad.xgent.ai` on every push touching `docs/**`/`website/**`, with Diátaxis structure + i18n + CNAME + auto-gen sidebar. The scoping note "publish manually" must be reconciled with what actually ships. **Second:** `_gomad/_config/agents/` **already exists** — `install-paths.js:22` creates it to hold per-agent `.customize.yaml` override files tracked via `manifest.yaml > agentCustomizations`. Moving persona bodies there without reconciliation triggers the custom-file detector at `installer.js:886-908` to misclassify regenerated personas as user-authored content. **Third:** a latent bug in `installer.js:520-543` — `newInstallSet` is derived from the PRIOR manifest, not the new install's planned outputs. As written, v1.2→v1.3 upgrade would leave orphaned `_gomad/gomad/agents/*.md` files on disk after relocation because the cleanup guard at `cleanup-planner.js:282` skips them. Fixing this is a prerequisite for clean relocation, not optional polish.

The recommended risk posture is: take marketplace refresh first (pure JSON rewrite, low blast radius, independent of all other workstreams, validates our regression harness); run story-creation enhancements in parallel using `_config/kb/` as a greenfield exercise of the `_config/` subdir install pattern; write docs content in whatever phase makes sense EXCEPT don't author path-dependent examples until agent relocation lands; run agent relocation LAST with an exclusive phase lock because it is simultaneously the riskiest change (runtime pointer + cleanup-planner interaction + semantic collision + latent bug fix) and the one with the most downstream test surface. IP/licensing for borrowed KB content is a hard gate — every seed-pack file ships with `source:` + `license:` frontmatter validated by `validate-kb-licenses.js` wired into `npm run quality` BEFORE any content is authored.

## Key Findings

### Recommended Stack

**Zero new runtime deps.** All four workstreams implementable with already-installed packages + Node built-ins. STACK.md explicitly rejected `lunr`/`minisearch`/`fuse.js`/`flexsearch` (domain-KB uses hand-rolled BM25, ~50 LOC), `gh-pages` npm (CI pipeline already shipped), `gray-matter` (regex + `yaml.parse` pattern already established), `ajv`/`zod` (`claude plugin validate .` is the runtime authority).

**Core technologies (no changes):**

- **Node.js ≥20.0.0** — runtime pin unchanged from v1.2.
- **JavaScript (CommonJS, ES2022+)** — locked in v1.2; all new v1.3 installer/test files MUST use `require()`, NOT ESM.
- **`csv-parse/sync@^6.1.0` + hand-rolled `escapeCsv` (3 LOC)** — v1.2 pattern for manifest-v2 read/write.
- **`fs-extra@^11.3.0`** — installer filesystem standard.
- **`yaml@^2.7.0` / `js-yaml`** — YAML parsing; match surrounding file.
- **`glob@^11.0.3`** — directory scanning.
- **`astro@^5.16.0` + `@astrojs/starlight@^0.37.5` + `@astrojs/sitemap@^3.6.0`** — docs stack unchanged; v1.3 fills content.
- **`actions/deploy-pages@v4`** — 2026-canonical GH Pages deploy; already wired.

### Expected Features

**Must have (table stakes for v1.3):**

- Marketplace identity matches package identity — current BMAD-branded file fully stale.
- Three-plugin group structure: `gomad-agents` / `gomad-skills` / `gomad-core`. `strict: false` per entry. `version: 1.3.0` pinned.
- Docs content at `gomad.xgent.ai` (Install / Quick Start / Agents / Skills / Architecture / Contributing + zh-cn parity).
- `_config/agents/` persona location with manifest-v2 cleanup + backup + launcher-stub update + CHANGELOG BREAKING.
- `gm-discuss-story` skill with 5-file mirror of `gm-create-story/`. Locked `{{story_key}}-context.md` section contract.
- `gm-create-story` auto-loads `{{story_key}}-context.md` via `discover-inputs.md` SELECTIVE_LOAD. Missing file = hint, not error.
- `gm-domain-skill` + 2 seed KB packs with canonical format (SKILL.md + reference/ + examples/ + anti-patterns.md).

**Should have (differentiators, P2):**

- Marketplace metadata (`homepage: "https://gomad.xgent.ai"`, `keywords`, `category`).
- Docs skill-reference auto-generation (v1.3 manual `npm run docs:skills`; CI deferred).
- `gm-discuss-story --text` flag for `/rc` remote sessions.
- `gm-discuss-story` checkpoint file.
- `gm-domain-skill` Levenshtein "did you mean" fallback.

**Defer (v1.4+):**

- CI-driven skills auto-gen pipeline; docs versioning; cross-plugin marketplace deps; vector scoring; backup rotation (REL-F1); additional `gm-discuss-story` flags.

### Architecture Approach

The v1.3 surface area fans across four integration points in the v1.2 codebase:

1. **Marketplace refresh (`.claude-plugin/marketplace.json`)** — pure JSON rewrite pointing at `./src/gomad-skills/*/gm-agent-*/` source trees. Zero runtime risk. Independent.
2. **Docs content under `docs/**`** — Starlight content collection already wired (symlinked from `website/src/content/docs`). Purely additive Markdown.
3. **Story-creation (`src/gomad-skills/4-implementation/`)** — adds `gm-discuss-story/` + `gm-domain-skill/` as sibling skills; auto-discovered by `ManifestGenerator.collectSkills` (`manifest-generator.js:181-272`). Adds `_installDomainKb()` step to `installer.js` copying `src/domain-kb/*` → `<gomadDir>/_config/kb/*`. Greenfield path. Patches `gm-create-story/discover-inputs.md` (Option A, most idiomatic).
4. **Agent-dir relocation (`agent-command-generator.js:71` + `agent-command-template.md:16`)** — structural change: (a) resolve `_config/agents/` semantic collision, (b) fix `newInstallSet` bug, (c) update launcher-stub body path, (d) extend tests.

**Runtime invariant:** the path in `agent-command-template.md:16` MUST match the path in `agent-command-generator.js:71`. Two sides of a literal string; drift = silent `/gm:agent-*` runtime failure.

### Critical Pitfalls

1. **`newInstallSet` latent bug blocks clean relocation.** Derived from PRIOR manifest, not new install; cleanup guard at `cleanup-planner.js:282` skips old paths. Result: orphaned `_gomad/gomad/agents/*.md` survive upgrade. Fix required as part of relocation phase.
2. **IP/licensing for seed KB content (CRITICAL).** Every KB file MUST carry `source:` + `license:` frontmatter. `validate-kb-licenses.js` wired into `npm run quality` BEFORE any content authored. GPL content re-authored from scratch.
3. **`_config/agents/` semantic collision.** Directory holds `.customize.yaml` overrides. Three reconciliation options — pick before Phase 13 plan 01.
4. **Path-constant drift across 11 touchpoints.** Introduce `AGENTS_PERSONA_SUBPATH` in `path-utils.js` FIRST, then sweep.
5. **`test-gm-command-surface.js` Phase C blind to body-path drift.** Add body-regex assertion in SAME commit as template change.

## Implications for Roadmap

### Recommended Phase Ordering (Phases 10-13)

Phases 10-12 run in parallel; Phase 13 is LAST with an exclusive phase lock.

### Phase 10 — Marketplace Refresh

**Rationale:** Pure JSON rewrite, zero runtime risk, independent. Ships first to validate test harness + provide regression coverage.

**Delivers:** `.claude-plugin/marketplace.json` with 3 plugins; `test/test-marketplace-schema.js`; optional `tools/generate-marketplace.js`; `npm run test:marketplace` wired into quality.

### Phase 11 — Docs Content Authoring

**Rationale:** Purely additive; Starlight pipeline already LIVE. Parallel with Phase 10. MUST NOT author path-dependent examples until Phase 13 lands.

**Delivers:** `docs/tutorials/install.md`, `docs/tutorials/quick-start.md`, `docs/reference/agents.md`, `docs/reference/skills.md`, `docs/explanation/architecture.md`, `docs/how-to/contributing.md`; `docs/zh-cn/` mirror; `website/public/CNAME` if missing; `SITE_URL` GitHub repo variable; `tools/validate-doc-paths.js` gate.

### Phase 12 — Story-Creation Enhancements

**Rationale:** Additive, zero path conflicts. Exercises `_config/<subdir>/` pattern on greenfield path (`_config/kb/`) as warm-up for Phase 13.

**Delivers (in order):** `validate-kb-licenses.js` gate → `_config/kb/` in `InstallPaths.create()` → `_installDomainKb()` step → 2 seed packs in `src/domain-kb/` with `source:` + `license:` + `last_reviewed:` frontmatter → `gm-discuss-story/` (5-file mirror) → `gm-domain-skill/` → `gm-create-story/discover-inputs.md` SELECTIVE_LOAD patch → workflow.md + template.md patches with precedence rule → `test/test-domain-kb-install.js`.

### Phase 13 — Agent Dir Relocation (LAST, exclusive lock)

**Rationale:** Riskiest change. Simultaneously touches runtime pointer, cleanup-planner, namespace collision, and 11 touchpoints.

**Delivers (strict order):** Extract `AGENTS_PERSONA_SUBPATH` constant → decide collision resolution → fix `newInstallSet` bug → update `agent-command-generator.js:71` + `agent-command-template.md:16` in lockstep → extend `test-gm-command-surface.js` Phase C body-regex → add `test-legacy-v12-upgrade.js` + `test-v13-agent-relocation.js` → extend `verify-tarball.js` Phase 4 → update Phase 11 docs with real paths → CHANGELOG v1.3.0 BREAKING.

### Phase Ordering Rationale

- **Phase 10 first:** independent, low-risk, locks contract before anything else moves.
- **Phase 11 parallel:** content authoring depends only on existing pipeline.
- **Phase 12 parallel:** greenfield `_config/kb/` exercise before collision-prone `_config/agents/`.
- **Phase 13 LAST:** riskiest; needs Phase 10 harness green, Phase 11 docs ready for path update, Phase 12 precedent that `_config/<subdir>/` install works.
- **Release after Phase 13:** `npm run quality` green, CHANGELOG sealed, tarball verified, `npm publish`.

### Research Flags

**Likely need `/gsd-research-phase` before planning:**

- **Phase 13 (agent relocation)** — `newInstallSet` fix choice has cascading `buildCleanupPlan` effects; `_config/agents/` collision resolution affects `detectCustomFiles()`, `manifest.yaml.agentCustomizations[]` hashing, re-install idempotency.
- **Phase 12 (gm-domain-skill integration point)** — ARCHITECTURE recommends `gm-create-story` invocation (pre-bake); PITFALLS 4-K recommends `gm-dev-story` (fresh retrieval). Opposite conclusions — pick with explicit rationale.

**Standard patterns (skip research, direct to planning):** Phase 10, Phase 11.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Context7-equivalent authoritative docs fetched; every installed package version verified. Zero-new-deps decision ironclad. |
| Features | HIGH | Marketplace schema authoritative; `discuss-phase.md` + `gm-create-story/workflow.md` read in full; output contract locked. |
| Architecture | HIGH | Every claim anchored to `file:line` in v1.2 codebase. `newInstallSet` bug surfaced via re-reading `installer.js:520-543` + `cleanup-planner.js:282` together. |
| Pitfalls | HIGH | Grounded in direct reads + v1.1/v1.2 RETROSPECTIVE carry-forward. |

**Overall confidence:** HIGH. All four docs converge on fundamentals.

### Open Questions Requiring User Decision Before Planning

1. **Docs-site auto-deploy vs manual (Phase 11).** PROJECT.md says "publish manually"; `.github/workflows/docs.yaml` ALREADY auto-deploys. Site is LIVE. Decide: (a) leave auto-deploy as-is and treat "publish manually" as "content review before push-to-main" — recommended; OR (b) disable trigger so deploys become explicit `workflow_dispatch`.

2. **`_config/agents/` collision resolution (Phase 13).** Three options:
   - **Option 1:** partition into `_config/agents/personas/<shortName>.md` + `_config/agents/<shortName>.customize.yaml`. Smallest literal-string diff; cleanest namespace.
   - **Option 2:** extend `detectCustomFiles()` to treat matching `.md` as generated, not custom. Smallest detector-code diff; preserves `.customize.yaml` semantics.
   - **Option 3:** relocate `.customize.yaml` to `_config/agent-customizations/`. Largest surface; cleanest long-term. Requires v1.2→v1.3 migration.

3. **Seed KB domain picks (Phase 12).** FEATURES.md suggests `testing` + `architecture`. Alternatives: `react-performance`, `nodejs-async-patterns`, `api-design`. Also: author from scratch vs adapt from MIT-licensed OSS?

## Sources

### Primary (HIGH confidence)

- [Claude Code — plugin-marketplaces](https://code.claude.com/docs/en/plugin-marketplaces)
- [Claude Code — plugins-reference](https://code.claude.com/docs/en/plugins-reference)
- [Astro — Deploy to GitHub Pages](https://docs.astro.build/en/guides/deploy/github/)
- Repo-local reads: `package.json`, `.claude-plugin/marketplace.json`, `tools/installer/core/{installer.js,install-paths.js,manifest-generator.js,cleanup-planner.js}`, `tools/installer/ide/shared/{agent-command-generator.js,path-utils.js}`, `tools/installer/ide/templates/agent-command-template.md`, `website/{astro.config.mjs,src/lib/site-url.mjs}`, `.github/workflows/docs.yaml`, `src/gomad-skills/4-implementation/gm-create-story/*`, `test/test-gm-command-surface.js`, `test/integration/prd-chain/test-prd-chain.js`, `CHANGELOG.md`, `.planning/{PROJECT.md,MILESTONES.md,RETROSPECTIVE.md}`
- `.claude/get-shit-done/workflows/discuss-phase.md` — foundational for `gm-discuss-story`.

### Secondary (MEDIUM confidence)

- [anthropics/claude-plugins-official](https://github.com/anthropics/claude-plugins-official/blob/main/.claude-plugin/marketplace.json)
- [anthropics/skills](https://github.com/anthropics/skills/blob/main/.claude-plugin/marketplace.json)
- [NickCrew/Claude-Cortex](https://github.com/NickCrew/Claude-Cortex)
- [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills/tree/main/skills/react-best-practices)
- [docs.bmad-method.org](https://docs.bmad-method.org/) — Diátaxis IA reference.

### Tertiary (LOW confidence)

- [Okapi BM25 — Wikipedia](https://en.wikipedia.org/wiki/Okapi_BM25)
- [XDG Base Directory Spec](https://specifications.freedesktop.org/basedir-spec/basedir-spec-latest.html)
- [npm folder conventions](https://docs.npmjs.com/cli/v11/configuring-npm/folders/)

---

*Research completed: 2026-04-24*
*Ready for roadmap: yes, with 3 open questions flagged for user decision*
