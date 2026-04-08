# GoMad

## What This Is

GoMad (GOMAD Orchestration Method for Agile Development) is a hard fork of [BMAD Method](https://github.com/bmad-code-org/BMAD-METHOD) — an agentic workflow framework for AI-driven software development. We extend BMAD's core agile methodology with our own agents, skills, and integrations while preserving the upstream's proven analysis → plan → solutioning → implementation flow. Distributed on npm as `@xgent-ai/gomad`.

## Core Value

A lean, properly-credited fork of BMAD Method that we own end-to-end and can extend with our own agents/skills, without dragging along the parts of BMAD we don't use.

## Requirements

### Validated

<!-- Shipped and confirmed valuable. -->

(None yet — `@xgent-ai/gomad@1.0.0` shipped under the wrong product direction and is being superseded by v1.1.0.)

### Active

<!-- Milestone 1 (v1.1.0): clean fork + rename + slim down + credit + branding -->

**Package & metadata**
- [ ] **Rename — package.json**: `name` → `@xgent-ai/gomad`, `version` → `1.1.0`, `description` → "GOMAD Orchestration Method for Agile Development", drop `bmad` from `keywords` add `gomad`, `repository.url` → xgent-ai/gomad GitHub URL, `author` → `Rockie Guo <rockie@kitmi.com.au>` (BMAD attribution lives in LICENSE/README, NOT package.json), `main` → `tools/installer/gomad-cli.js`, `bin` → `{ "gomad": "tools/installer/gomad-cli.js" }`, scripts `bmad:install` / `bmad:uninstall` / `install:bmad` → `gomad:install` / `gomad:uninstall` / `install:gomad`, **delete dead `rebundle` script**, ensure `publishConfig: { access: "public" }` is set
- [ ] **Reset deps if needed**: Verify `dependencies` match what BMAD-derived code actually uses (`next` branch already inherits BMAD's deps); remove anything left over from `@xgent-ai/gomad@1.0.0`'s old deps

**File-system rename**
- [ ] **Rename — top-level module**: `src/bmm-skills/` → `src/gomad-skills/`; update all installer paths and module manifests
- [ ] **Rename — skill directories**: All ~41 `bmad-*` skill dirs → `gm-*` (11 in `core-skills/`, 8 in `bmm-skills/1-analysis/`, 6 in `2-plan-workflows/`, 5 in `3-solutioning/`, 11 in `4-implementation/`); update every internal cross-reference, `module-help.csv`, sibling skill references, test fixtures, installer code
- [ ] **Rename — manifest filenames**: `bmad-skill-manifest.yaml` → `skill-manifest.yaml` and `bmad-manifest.json` → `manifest.json` (drop the `bmad-` prefix entirely; directory namespace is sufficient)
- [ ] **Rename — CLI binary**: `tools/installer/bmad-cli.js` → `tools/installer/gomad-cli.js`
- [ ] **Rename — installer artifacts**: `tools/installer/ide/shared/bmad-artifacts.js` → `gomad-artifacts.js` (or just `artifacts.js`)

**Slim down**
- [ ] **Delete external modules manifest + consumer code**: Remove `tools/installer/external-official-modules.yaml` and the consuming code in `tools/installer/modules/external-manager.js` and any external-official references in `tools/installer/modules/official-modules.js`. We are not a frontend for BMAD's external modules ecosystem.
- [ ] **Delete dead bundler reference**: `package.json scripts.rebundle` (folded into rename task above) — `tools/installer/bundlers/` directory does not exist
- [ ] **Verify no builder/web-bundle residue**: Confirm `next` branch refactor (`ad2434b`) actually removed all BMad builder and web bundle source

**Text sweep**
- [ ] **Full content sweep**: All `BMAD`/`BMAD Method`/`BMad`/`bmad-method`/`bmm` occurrences in markdown, YAML, JSON, JS, HTML, CSV → `GoMad`/`GOMAD`/`gomad` (case-preserving: `BMAD Method`→`GoMad`, `BMAD`→`GOMAD`, `BMad`→`GoMad`, lowercase stays lowercase). Excludes: LICENSE (preserved), TRADEMARK.md (rewritten not swept), CHANGELOG history entries (preserved), README/LICENSE attribution sections (managed by Credit tasks below).

**Credit & legal**
- [ ] **LICENSE composition**: Keep BMAD's `LICENSE` byte-identical, append a horizontal rule + GoMad copyright block (`Copyright (c) 2026 Rockie Guo / xgent-ai`). Add explicit "not affiliated with, endorsed by, or sponsored by BMad Code, LLC" disclaimer. NOTE: NO `NOTICE` file — that's an Apache-2.0 convention, not MIT.
- [ ] **README credits section**: Short factual intro sentence ("GoMad is a hard fork of BMAD Method by Brian (BMad) Madison.") + footer `## Credits` section with link to upstream repo and the same disclaimer as LICENSE. Apply to both `README.md` and `README_CN.md`.
- [ ] **TRADEMARK.md rewrite**: Replace BMAD's existing TRADEMARK.md with a GoMad-specific one that (a) makes no claim over the BMAD wordmark, (b) acknowledges BMAD as a trademark of BMad Code LLC via nominative fair use, (c) states whatever (if any) trademark claim xgent-ai wants over "GoMad". BMAD's own TRADEMARK.md explicitly permits forks under different names — we are inside the lines they drew.
- [ ] **Preserve `CONTRIBUTORS.md`**: Keep original BMAD contributors list intact; add a new GoMad contributors section going forward.

**Branding**
- [ ] **Visual assets**: New `banner-gomad.png` (replaces `banner-bmad-method.png`), regenerated `Wordmark.png`, favicon
- [ ] **CLI banner**: Installer/CLI startup banner output rebranded to GoMad

**Docs**
- [ ] **README EN+CN only**: `README.md` (English, default) and `README_CN.md` (Chinese) rewritten with GoMad framing, install commands (`npm install @xgent-ai/gomad`), and credit section. Delete `README_VN.md`.
- [ ] **Drop abandoned doc translations**: Delete `docs/cs/`, `docs/fr/`, `docs/vi-vn/`. Keep `docs/` (default English) and `docs/zh-cn/` only.
- [ ] **CNAME**: Set to `gomad.xgent.ai` (deploy GitHub Pages later when project stabilizes)
- [ ] **Supporting docs sweep**: `CHANGELOG.md` (add v1.1.0 entry framing the pivot from skills-installer to BMAD fork), `CONTRIBUTING.md`, `SECURITY.md`, `AGENTS.md`, `docs/`, `website/` content
- [ ] **Investigate `docs/mobmad-plan.md`**: Possible typo or stale file — review and rename or delete

**Release**
- [ ] **Deprecate `@xgent-ai/gomad@1.0.0`**: Run `npm deprecate "@xgent-ai/gomad@1.0.0" "Superseded by @xgent-ai/gomad@1.1.0 — gomad has been re-architected as a fork of BMAD Method. Run: npm install @xgent-ai/gomad@latest"`
- [ ] **Publish `@xgent-ai/gomad@1.1.0`**: After all rename + verification tasks pass; use trusted publishing via GitHub Actions OIDC OR a granular access token with "Bypass 2FA" enabled (classic automation tokens were revoked Dec 2025); always run `npm pack --dry-run` before publish; use `files` allowlist over `.npmignore`

**Verification**
- [ ] **Quality script green**: `npm run quality` (format:check + lint + lint:md + docs:build + test:install + validate:refs + validate:skills) passes after all rename
- [ ] **Installer end-to-end**: Fresh install of locally-packed `@xgent-ai/gomad@1.1.0` produces a working setup with all `gm-*` skills loadable
- [ ] **Test fixtures updated**: `test/fixtures/file-refs-csv/valid/bmm-style.csv` (and `core-style.csv`) renamed/rewritten and consuming test (`test/test-file-refs-csv.js`) still passes

### Out of Scope

<!-- Explicit boundaries for v1.1. Each carries reasoning to prevent re-adding. -->

- **New gomad-specific agents** — Deferred to milestone 2. v1.1 is rename + slim down only; mixing in new content would muddy the diff and the credit story.
- **New gomad-specific skills** — Same as above.
- **Touching `bmad-method` on npm** — That package is owned by BMAD's authors (`bmadcode`, `muratkeremozcan`, `alex_verk`). We do nothing to it. Ever.
- **BMad builder source code** — Already absent from this repo (lives in a separate bmad-code-org repo). We just delete the *reference* in `external-official-modules.yaml`.
- **Web bundle code** — Already absent from this repo per `next` branch refactor.
- **Reworking bmm workflow internals** — `1-analysis` / `2-plan-workflows` / `3-solutioning` / `4-implementation` stay structurally as-is. Pure rename, no behavioral changes.
- **GSD integration** — The `.claude/get-shit-done/` tooling we use to manage *this* project is NOT part of the gomad distribution. Out of scope for v1.1, and likely permanently.
- **Reworking `@xgent-ai/gomad@1.0.0`** — v1.0.0 (Claude Code skills installer, wrong product direction) is left published as-is and deprecated. No retroactive rewrite or unpublish.
- **Tracking BMAD upstream changes** — GoMad is a hard fork, not a continuously-merged downstream. We do not auto-sync from BMAD's `main`.

## Context

**Backstory.** `@xgent-ai/gomad@1.0.0` was published on npm as a Claude Code skills installer — a completely different product direction we now consider wrong. Rather than evolve from that, we restarted on the `next` branch with `ad2434b refactor: new start for next`, which forked BMAD Method's source and trimmed `src/` down to `bmm-skills/` and `core-skills/`. v1.1.0 builds on that reset and reuses the `@xgent-ai/gomad` package name to hard-pivot the published package into a BMAD-Method fork.

**Upstream relationship.** GoMad is a hard fork of BMAD Method (<https://github.com/bmad-code-org/BMAD-METHOD>), MIT-licensed by Brian (BMad) Madison. We are not tracking upstream changes automatically; BMAD is treated as the seed, not a continuously merged base. Credit must remain prominent — both legally (MIT license preservation) and ethically (BMAD's authors did the original work). BMAD's own `TRADEMARK.md` explicitly permits forks under different names, so our position is on solid ground.

**npm reality check.**
- `@xgent-ai/gomad` is owned by us (Rockie / xgent-ai). v1.0.0 is published. v1.1.0 is the corrective release.
- `bmad-method` is owned by BMAD's authors (`bmadcode`, `muratkeremozcan`, `alex_verk`). We have no rights to it and will never touch it on npm.

**Existing codebase state.**
- `package.json` still says `bmad-method` v6.2.2 in this working tree (because we reset onto BMAD's source) — needs full rename to `@xgent-ai/gomad@1.1.0`.
- `src/bmm-skills/` contains the four-phase workflow modules with ~30 `bmad-*` skills/agents inside.
- `src/core-skills/` contains 11 `bmad-*` shared infrastructure skills (help, brainstorming, shard-doc, party-mode, distillator, review/elicitation) — kept and renamed, not removed.
- `tools/installer/bmad-cli.js` is the CLI entry; `package.json bin` exposes both `bmad` and `bmad-method` commands; `tools/installer/external-official-modules.yaml` lists 4 external BMAD modules the installer can pull in (to be deleted).
- Codebase map exists at `.planning/codebase/`.
- Research artifacts exist at `.planning/research/RENAME_MECHANICS.md` (file-level inventory) and `.planning/research/CREDIT_AND_NPM.md` (credit best-practices + npm publish/deprecate mechanics).

**Audience.** Internal — xgent-ai team using gomad to drive AI-assisted development. Public discoverability is secondary in v1.1; correctness and credit are primary.

## Constraints

- **License**: BMAD's MIT license preserved byte-identical. GoMad additions are also MIT, appended below a horizontal rule in the same `LICENSE` file.
- **Casing**: The case-preserving display form is "GoMad" (not "Gomad"). Lowercase `gomad` for package names, paths, and CLI commands. Uppercase `GOMAD` for the acronym expansion only.
- **Trademark**: "BMAD" is a trademark of BMad Code, LLC. We use it only via nominative fair use (in attribution sentences). The skill rename (`bmad-*` → `gm-*`) is a trademark-safety requirement, not just cosmetic — leaving `bmad-*` IDs in shipped code would be using the wordmark *inside* our product, which goes beyond nominative use.
- **Tech stack**: Node.js / JavaScript (`type: module`), inherited from BMAD. No language change in v1.1.
- **Branch**: All v1.1 work happens on `next`, merged to `main` only when milestone 1 ships.
- **Scope discipline**: v1.1 is rename + slim down + credit + branding. Any new agent/skill work is a scope violation and gets deferred.
- **npm publish mechanics**: Trusted publishing via GitHub Actions OIDC preferred; otherwise granular access token with "Bypass 2FA" enabled (classic automation tokens were revoked Dec 2025).

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Fork BMAD Method instead of contribute upstream | Our needs diverge from BMAD's roadmap; we want full ownership of agent/skill direction | — Pending (validated by shipping v1.1) |
| Hard-pivot `@xgent-ai/gomad` package on npm (rather than new package name) | v1.0.0 had ~no users; reusing name is cleaner than abandoning it; semver bump from 1.0 to 1.1 understated but acceptable for a near-zero-user pivot | — Pending |
| Version `1.1.0` (not `2.0.0`) | User explicitly chose minor bump despite major-pivot semantics; v1.0 had effectively no users so blast radius is near-zero | ✓ Good |
| Skill prefix: `gm-*` (not `gomad-*`) | Shorter; less verbose in command invocations and file paths | ✓ Good |
| Top-level dir `bmm-skills/` → `gomad-skills/` | Full `gomad` at module level, short `gm-` only for individual skill names | ✓ Good |
| Manifest filenames: drop `bmad-` prefix entirely (`skill-manifest.yaml`, `manifest.json`) | Directory namespace already provides scoping; cleanest | ✓ Good |
| `package.json author`: `Rockie Guo <rockie@kitmi.com.au>` only; BMAD attribution lives in LICENSE/README | Avoids confusing npm registry metadata; credit handled where users actually look | ✓ Good |
| `LICENSE` strategy: append GoMad block to BMAD's MIT, single file, no `NOTICE` | OpenTofu/HashiCorp precedent; NOTICE is Apache-2.0 not MIT | ✓ Good |
| Casing: "GoMad" (not "Gomad") as display form | Matches the G-O-Mad acronym feel; lowercase `gomad` for paths/CLI, `GOMAD` for acronym expansion only | ✓ Good |
| Drop `tools/installer/external-official-modules.yaml` + consumer code entirely | We are not a frontend for BMAD's external modules ecosystem | ✓ Good |
| Drop `docs/cs/`, `docs/fr/`, `docs/vi-vn/`; keep default (en) + `zh-cn/` only | Same EN+CN policy as README; no maintainer for the others | ✓ Good |
| Deprecate `@xgent-ai/gomad@1.0.0` (not `bmad-method`) | v1.0.0 was a Claude Code skills installer — wrong product direction; deprecation prevents accidental installs | — Pending |
| Domain `gomad.xgent.ai` | xgent-ai subdomain; GitHub Pages deploy deferred until project stabilizes | — Pending |
| Keep `core-skills/` (rename only) | It's the foundation bmm workflows depend on, not "BMad builder" cruft | ✓ Good |
| Defer all new agents/skills to milestone 2 | Keeps v1.1 diff focused on rename/credit; clean baseline for future work | ✓ Good |

---
*Last updated: 2026-04-08 after rename mechanics scout + credit/npm research*
