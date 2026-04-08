# Rename Mechanics Scout

**Purpose:** Concrete inventory of every place `bmad`/`BMAD`/`BMad`/`bmm` lives in the repo, so plan-phase can chunk the rename work cleanly. Authored by main agent (not a sub-agent) via Grep/Glob scouting.

**Scope reminder (from PROJECT.md):**
- Full text-level rename: `BMAD`/`BMAD Method`/`BMad`/`bmad-method` → `Gomad`/`gomad`
- Skill prefix: `bmad-*` → `gm-*` (individual skills/agents)
- Top-level dir: `src/bmm-skills/` → `src/gomad-skills/`
- Keep `src/core-skills/` (rename internals only)

---

## Summary — 5 things plan-phase needs to know

1. **Skill rename surface is large.** ~41 skill directories carry the `bmad-` prefix (28 inside `bmm-skills/`, 11 inside `core-skills/`, plus 3 nested under `bmm-skills/1-analysis/research/`). All of them need `bmad-` → `gm-` AND every internal cross-reference (`SKILL.md` files, manifest YAMLs, `module-help.csv`, code references in `tools/installer/`) updated to match.

2. **Manifest filename pattern needs renaming too.** Files named `bmad-skill-manifest.yaml` and `bmad-manifest.json` appear inside skill directories — the *filename* itself contains `bmad-`. Plan-phase must decide: rename to `gm-skill-manifest.yaml` / `gm-manifest.json`, or `gomad-skill-manifest.yaml` / `gomad-manifest.json`, or drop the prefix entirely (`skill-manifest.yaml` / `manifest.json`). My recommendation: drop the prefix — the filename being inside a skill directory already provides the namespace.

3. **CLI binary and npm scripts need rename.** `tools/installer/bmad-cli.js` is the entry point. `package.json` exposes two binaries (`bmad`, `bmad-method`) and six `bmad:*` / `install:bmad` scripts — all need updating. Rename file → `tools/installer/gomad-cli.js`; expose `gomad` binary (and consider `gm` shortcut); rename scripts to `gomad:install` etc. Also `tools/installer/ide/shared/bmad-artifacts.js` needs renaming.

4. **Dead bundler reference + missing builder/web-bundle code.**
   - `package.json scripts.rebundle` points to `tools/installer/bundlers/bundle-web.js` — but `tools/installer/bundlers/` **does not exist**. Dead script, safe to remove.
   - No `*builder*` or `*web-bundle*` files found anywhere in `src/`. The prior `next` branch refactor (`ad2434b`) already removed BMad builder and web bundle source code. Slim-down work for these is mostly done — what remains is removing references (like the `rebundle` script) and the external-modules manifest (see #5).
   - **Decision needed:** `tools/installer/external-official-modules.yaml` lists 4+ external BMAD modules (`bmad-builder`, `bmad-creative-intelligence-suite`, `bmad-game-dev-studio`, `bmad-method-test-architecture-enterprise`) that the installer can pull in from separate bmad-code-org repos. Since we don't want to be a frontend for BMAD's external modules, this whole file (and the `tools/installer/modules/external-manager.js` plus `official-modules.js` logic that consumes it) probably gets deleted or emptied. Plan-phase needs to decide.

5. **Multi-language docs scope creep.** `docs/` has 5 language variants: default (en), `cs/`, `fr/`, `vi-vn/`, `zh-cn/`. README is also EN/CN/VN. PROJECT.md decided README = EN+CN only and `README_VN.md` removed. **Open question:** does the same policy extend to `docs/`? Almost certainly yes — `docs/cs/`, `docs/fr/`, `docs/vi-vn/` are abandoned non-English/Chinese translations. Plan-phase should confirm with user, then drop `cs`, `fr`, `vi-vn` doc trees.

---

## 1. Skill Directory Inventory (~41 directories to rename)

### `src/core-skills/` (11)

- `bmad-advanced-elicitation/` → `gm-advanced-elicitation/`
- `bmad-brainstorming/` → `gm-brainstorming/`
- `bmad-distillator/` → `gm-distillator/`
- `bmad-editorial-review-prose/` → `gm-editorial-review-prose/`
- `bmad-editorial-review-structure/` → `gm-editorial-review-structure/`
- `bmad-help/` → `gm-help/`
- `bmad-index-docs/` → `gm-index-docs/`
- `bmad-party-mode/` → `gm-party-mode/`
- `bmad-review-adversarial-general/` → `gm-review-adversarial-general/`
- `bmad-review-edge-case-hunter/` → `gm-review-edge-case-hunter/`
- `bmad-shard-doc/` → `gm-shard-doc/`

### `src/bmm-skills/1-analysis/` (8 — including 3 nested under `research/`)

- `bmad-agent-analyst/`
- `bmad-agent-tech-writer/`
- `bmad-document-project/`
- `bmad-prfaq/`
- `bmad-product-brief/`
- `research/bmad-domain-research/`
- `research/bmad-market-research/`
- `research/bmad-technical-research/`

### `src/bmm-skills/2-plan-workflows/` (6)

- `bmad-agent-pm/`
- `bmad-agent-ux-designer/`
- `bmad-create-prd/`
- `bmad-create-ux-design/`
- `bmad-edit-prd/`
- `bmad-validate-prd/`

### `src/bmm-skills/3-solutioning/` (5)

- `bmad-agent-architect/`
- `bmad-check-implementation-readiness/`
- `bmad-create-architecture/`
- `bmad-create-epics-and-stories/`
- `bmad-generate-project-context/`

### `src/bmm-skills/4-implementation/` (11)

- `bmad-agent-dev/`
- `bmad-checkpoint-preview/`
- `bmad-code-review/`
- `bmad-correct-course/`
- `bmad-create-story/`
- `bmad-dev-story/`
- `bmad-qa-generate-e2e-tests/`
- `bmad-quick-dev/`
- `bmad-retrospective/`
- `bmad-sprint-planning/`
- `bmad-sprint-status/`

**Total: ~41 directories. Plus `src/bmm-skills/` itself → `src/gomad-skills/`.**

Each directory contains `SKILL.md`, optional `bmad-skill-manifest.yaml` or `bmad-manifest.json`, and child files that reference the skill ID. Rename is multi-layer per skill:
- Directory name
- Manifest filename (and `id`/`name` fields inside)
- `SKILL.md` self-references and YAML frontmatter
- Cross-references from sibling skills (e.g., `bmad-create-prd` referencing `bmad-product-brief`)
- `module-help.csv` listings in `core-skills/` and `bmm-skills/`
- Test fixtures referencing skill IDs (e.g., `test/fixtures/file-refs-csv/valid/bmm-style.csv`)
- Installer code (`tools/installer/ide/shared/skill-manifest.js`)

---

## 2. Top-Level File / Path Renames

| Current | New | Notes |
|---|---|---|
| `package.json` `name: "bmad-method"` | `name: "@xgent-ai/gomad"` | Scoped package |
| `package.json` `version: "6.2.2"` | `version: "1.1.0"` | Reset versioning per PROJECT.md |
| `package.json` `description` | "GOMAD Orchestration Method for Agile Development" or similar | Drop "Breakthrough Method..." |
| `package.json` `keywords: [..., "bmad"]` | drop "bmad", add "gomad" | |
| `package.json` `repository.url` | `git+https://github.com/xgent-ai/gomad.git` (or wherever it'll live) | Confirm with user |
| `package.json` `author: "Brian (BMad) Madison"` | **DECISION NEEDED** — change to xgent-ai? Or move to `contributors: []` to preserve credit? My recommendation: `author: "xgent-ai"` + `contributors: [{ name: "Brian (BMad) Madison", url: "https://github.com/bmad-code-org" }]` to preserve BMAD attribution in metadata | |
| `package.json` `main: "tools/installer/bmad-cli.js"` | `tools/installer/gomad-cli.js` | |
| `package.json` `bin: { bmad, bmad-method }` | `bin: { gomad }` (decide on `gm` shortcut) | |
| `package.json` `scripts.bmad:install` | `gomad:install` | |
| `package.json` `scripts.bmad:uninstall` | `gomad:uninstall` | |
| `package.json` `scripts.install:bmad` | `install:gomad` | |
| `package.json` `scripts.rebundle` | **DELETE** — points to non-existent `tools/installer/bundlers/bundle-web.js` | |
| `tools/installer/bmad-cli.js` | `tools/installer/gomad-cli.js` | |
| `tools/installer/ide/shared/bmad-artifacts.js` | `tools/installer/ide/shared/gomad-artifacts.js` (or just `artifacts.js`) | |
| `tools/installer/external-official-modules.yaml` | **DELETE** (along with consumer code) — see Summary #4 | |
| `banner-bmad-method.png` | `banner-gomad.png` | Replace asset |
| `Wordmark.png` | regenerate as gomad wordmark | |
| `CNAME` | content → `gomad.xgent.ai` | |
| `README.md` | rewrite | Default English |
| `README_CN.md` | rewrite | Chinese |
| `README_VN.md` | **DELETE** | Per PROJECT.md |
| `docs/cs/`, `docs/fr/`, `docs/vi-vn/` | **DELETE** (pending confirmation) | See Summary #5 |
| `docs/mobmad-plan.md` | investigate — possible typo (`mob-bmad`?) or stale | |

---

## 3. Text-Sweep Categories (where `bmad`/`BMAD` appears as content, not paths)

These need a careful sed/regex sweep, NOT directory rename. The grep showed ~80+ files mention `bmad`/`BMAD`/`BMad`/`bmm` in content. Categories:

1. **Markdown prose** — `README.md`, `README_CN.md`, `CONTRIBUTING.md`, `CONTRIBUTORS.md`, `SECURITY.md`, `AGENTS.md`, `TRADEMARK.md` (special — see Constraint), `CHANGELOG.md`, all of `docs/`, all skill `SKILL.md` files
2. **YAML/JSON manifests** — `module.yaml`, `module-help.csv`, all `*-skill-manifest.yaml`, `*-manifest.json`, `bmm-skills/module.yaml`, `core-skills/module.yaml`, `tools/installer/install-messages.yaml`, `.coderabbit.yaml`, `.github/ISSUE_TEMPLATE/*.yaml`
3. **JavaScript identifiers/strings** — `tools/installer/**/*.js` (variable names like `bmadCli`, string constants like `'bmad-method'`), `eslint.config.mjs`, `website/src/**/*.{js,astro,ts}`, `test/**/*.js`
4. **Test fixtures** — `test/fixtures/file-refs-csv/valid/bmm-style.csv` and `core-style.csv` — these test the skill ID format, content needs updating
5. **Config files** — `.gitignore`, `.prettierignore`, `.vscode/settings.json` (mentions `bmad` once)
6. **HTML / website** — `website/src/components/Banner.astro`, `website/public/workflow-map-diagram-fr.html`, `website/astro.config.mjs`, `website/src/rehype-markdown-links.js`, `website/src/pages/robots.txt.ts`

**Suggested mechanical approach for plan-phase:**
- Phase 1 wave 1 (mechanical): a single sed-style script that handles case-preserving substitution: `BMAD Method` → `Gomad`, `BMAD` → `GOMAD`, `BMad` → `Gomad`, `bmad-method` → `gomad`, `bmad` → `gomad` (in non-skill-prefix contexts), `bmm` → `gomad` (in non-prefix contexts)
- Phase 1 wave 2 (manual review): fix anything the sweep got wrong (TRADEMARK.md should NOT have BMAD references rewritten — that's the legal context; it should be REWRITTEN as a new gomad TRADEMARK.md but preserve attribution to BMAD's trademark). Skill manifest files where `bmad` is part of an ID need careful rename.

---

## 4. Special-Case Files

### `LICENSE`
Currently: BMAD's MIT license, copyright "Brian (BMad) Madison". **Do not blindly rewrite.** Per credit best-practices research (background agent), the original copyright must be preserved. Probable approach: keep BMAD MIT block as-is, append xgent-ai MIT block below, OR add `LICENSE-BMAD` separately. Background agent will return concrete recommendation.

### `TRADEMARK.md`
Currently asserts BMAD trademark by Brian Madison. Gomad does NOT inherit that trademark. Approach: **rewrite as a new gomad TRADEMARK.md** that (a) asserts no claim over BMAD mark, (b) acknowledges BMAD as a trademark of Brian Madison via nominative use only, (c) makes whatever trademark claim (if any) xgent-ai wants to make over "gomad". User should decide trademark posture.

### `CONTRIBUTORS.md`
Lists original BMAD contributors. **Preserve as-is** as part of credit, then add a new section for gomad contributors going forward.

### `.github/ISSUE_TEMPLATE/`
Bug-report and feature-request templates mention BMAD. Rewrite to gomad framing.

### Test fixtures (`test/fixtures/file-refs-csv/valid/bmm-style.csv`, `core-style.csv`)
These exist specifically to test that the file-reference validator handles bmm-style paths. After rename, "bmm-style" becomes "gomad-style". Fixture filenames AND content both need updating, plus the test that consumes them (`test/test-file-refs-csv.js`).

### `tools/installer/install-messages.yaml`
Localized installer prompt strings. Will contain BMAD branding. Sweep + manual review.

---

## 5. What Plan-Phase Should Do With This

Suggested phase shape (coarse granularity per config):

1. **Phase 1 — Foundation: package, branding, dead-code removal**
   - `package.json` rename (name, version, scripts, bin, main, author/contributors, repo URL)
   - Delete `tools/installer/bundlers/` reference (rebundle script)
   - Delete `tools/installer/external-official-modules.yaml` + consumer code (external-manager.js, official-modules.js consumption logic)
   - Delete `README_VN.md`, `docs/cs/`, `docs/fr/`, `docs/vi-vn/` (pending user confirm)
   - Update `CNAME` to `gomad.xgent.ai`
   - Replace banner/wordmark assets

2. **Phase 2 — Skill rename (file system + manifests)**
   - Rename all ~41 `bmad-*` skill directories to `gm-*`
   - Rename `src/bmm-skills/` → `src/gomad-skills/`
   - Rename manifest files (`bmad-skill-manifest.yaml` → `skill-manifest.yaml` or `gm-skill-manifest.yaml`)
   - Update `module-help.csv` files
   - Update test fixtures
   - Update installer code that consumes these paths

3. **Phase 3 — Text sweep (content)**
   - Run case-preserving sed across markdown, YAML, JS, HTML
   - Manual review for false positives (LICENSE, TRADEMARK, CHANGELOG history entries)
   - Rewrite `LICENSE` per credit research recommendation
   - Rewrite `TRADEMARK.md`
   - Rewrite `README.md` and `README_CN.md` with credit section
   - Add `NOTICE` file if recommended by credit research
   - Update `CHANGELOG.md` with v1.1.0 entry framing the fork

4. **Phase 4 — Verification + release**
   - Run `npm run quality` (format, lint, lint:md, docs:build, test:install, validate:refs, validate:skills) — must be green
   - Smoke-test installer end-to-end against a fresh dir
   - npm publish dry-run for `@xgent-ai/gomad@1.1.0`
   - `npm deprecate bmad-method@"1.0.x"` (after publish)

This is a sketch — gsd-roadmapper will produce the canonical breakdown.

---
*Scout completed 2026-04-08 by main agent*
