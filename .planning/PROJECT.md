# GoMad

## Current Milestone: v1.2 — Agent-as-Command & Coding-Agent PRD Refinement

**Goal:** Convert `gm-agent-*` skills into `/gm:agent-*` slash commands, make installs portable and upgrade-safe, and refocus PRD/product-brief artifacts on coding-agent consumers instead of human founders.

**Target features:**

- Agent → slash-command migration (7 `gm-agent-*` personas → `.claude/commands/gm/agent-*.md`, invoked as `/gm:agent-*`)
- Reference sweep across source / docs / tests / manifests to replace `gm-agent-*` with `gm:agent-*`
- Copy-only installer (symlink mode removed; installed output survives `git clone` to another workspace)
- Install tracking + upgrade cleanup via `_gomad/_config/files-manifest.csv` (old files listed in prior manifest are cleaned before a re-install writes new files)
- PRD + product-brief refinement for coding-agent consumers — drop human-founder framing (time windows, "why now?", business/operational metrics); amplify aggressive vision + MVP scope; sharpen dev-ready requirements

## What This Is

GoMad (GOMAD Orchestration Method for Agile Development) is a hard fork of [BMAD Method](https://github.com/bmad-code-org/BMAD-METHOD) — an agentic workflow framework for AI-driven software development. v1.1 shipped the fork pivot: renamed package, slim codebase, full credit + legal posture, bilingual docs, published as `@xgent-ai/gomad@1.1.0` on npm. v1.2 refactors the agent-invocation surface, hardens the installer for portable git-clone workflows, and retunes upstream planning artifacts so they read like dev-ready specs for coding agents rather than pitches for human product leads.

## Core Value

A lean, properly-credited fork of BMAD Method that we own end-to-end and can extend with our own agents/skills, without dragging along the parts of BMAD we don't use.

## Requirements

### Validated

<!-- Shipped and confirmed valuable. -->

- ✓ **Package identity** (`@xgent-ai/gomad@1.1.0` on npm, `gomad` bin, scoped public publish) — v1.1
- ✓ **Full rename** (~41 `bmad-*` → `gm-*` skills, `bmm-skills/` → `gomad-skills/`, manifest prefix drop, CLI entry rename, content sweep) — v1.1
- ✓ **Slim-down** (ExternalModuleManager removed, dead translations deleted) — v1.1
- ✓ **Credit & legal** (LICENSE byte-identical BMAD + GoMad block, TRADEMARK nominative fair use, CONTRIBUTORS preserved, canonical disclaimer reused) — v1.1
- ✓ **Branding** (hand-authored GoMad ASCII CLI banner, Wordmark + favicon regenerated) — v1.1
- ✓ **Bilingual docs** (README + README_CN + docs site landing pages, en + zh-cn only) — v1.1
- ✓ **Release** (`@xgent-ai/gomad@1.1.0` published, v1.0.0 deprecated with redirect, v1.1.0 tagged on main) — v1.1
- ✓ **Verification** (quality gate, tarball check, E2E fresh-install all green; no `bmad` residuals) — v1.1

### Active

<!-- Milestone 2 (v1.2): Agent-as-Command & Coding-Agent PRD Refinement. See .planning/REQUIREMENTS.md for REQ-ID detail. -->

- [ ] **CMD**: The 7 `gm-agent-*` personas (analyst, tech-writer, pm, ux-designer, architect, sm, dev) are installed as `.claude/commands/gm/agent-*.md` and invoked as `/gm:agent-*` slash commands
- [ ] **REF**: Every `gm-agent-*` reference across source (`gomad-skills/`, `core-skills/`, `tools/installer/`), docs (README, README_CN, docs/, website), tests + fixtures, and manifests is updated to the `gm:agent-*` command form
- [ ] **INSTALL**: Installer is copy-only (symlink mode removed), writes `_gomad/_config/files-manifest.csv` tracking every installed path, and cleans files listed in the prior manifest before writing new ones on re-install / upgrade
- [ ] **PRD**: `gm-create-prd` and `gm-product-brief` are retuned for coding-agent consumers — time-window estimation / "why now?" challenge / business-operational metrics removed; aggressive vision + MVP scope amplified; requirements clarity, feature boundaries, and dev-ready acceptance criteria sharpened

### Deferred (beyond v1.2)

<!-- Previously aspirational; not in current milestone. -->

- **CUSTOM-01**: New gomad-specific agents added to `src/gomad-skills/` or `src/core-skills/`
- **CUSTOM-02**: New gomad-specific skills integrated into the `1-analysis` → `4-implementation` workflow
- **CUSTOM-03**: Agent/skill documentation and installer support for new additions

### Out of Scope

<!-- Explicit boundaries. Each carries reasoning to prevent re-adding. -->

- **Touching `bmad-method` on npm** — That package is owned by BMAD's authors (`bmadcode`, `muratkeremozcan`, `alex_verk`). We do nothing to it. Ever.
- **Reworking bmm workflow internals** — `1-analysis` / `2-plan-workflows` / `3-solutioning` / `4-implementation` stay structurally as-is. Behavioral changes are scope violations without explicit justification.
- **GSD integration into the gomad distribution** — `.claude/get-shit-done/` is our dev tooling for building gomad, not part of the shipped product. Likely permanently out of scope.
- **Reworking or unpublishing `@xgent-ai/gomad@1.0.0`** — Deprecated, not removed. No retroactive rewrite.
- **Tracking BMAD upstream changes** — GoMad is a hard fork, not a continuously-merged downstream. No auto-sync from BMAD's `main`.
- **GitHub Pages deployment** — CNAME set to `gomad.xgent.ai`; actual deploy deferred until project stabilizes.

## Context

**Shipped state (2026-04-18).** `@xgent-ai/gomad@1.1.0` is live on npm with `latest` dist-tag. `@xgent-ai/gomad@1.0.0` is deprecated with redirect message "Use @xgent-ai/gomad@latest instead." `v1.1.0` tag on main; `next` merged to main. Tarball ships 320 files via `files` allowlist; 52 `gm-*` skill directories loadable in fresh install.

**Codebase state.**

- Package: `@xgent-ai/gomad` on npm, public scoped.
- Source: `src/gomad-skills/` (four-phase workflow modules) + `src/core-skills/` (shared infrastructure skills). All skills use the `gm-*` prefix.
- CLI: `tools/installer/gomad-cli.js` is the single entry point, exposing the `gomad` command.
- Manifests: `skill-manifest.yaml` and `manifest.json` (no `bmad-` prefix).
- Website: Astro under-construction one-pager at `gomad.xgent.ai`.
- Tech stack: Node.js / JavaScript (CommonJS, `require()`-based loading), inherited from BMAD.
- Docs: English default + `zh-cn/` Chinese translation.

**Upstream relationship.** GoMad is a hard fork of BMAD Method (<https://github.com/bmad-code-org/BMAD-METHOD>), MIT-licensed by Brian (BMad) Madison. Credit preserved legally (MIT license byte-identical in LICENSE) and ethically (non-affiliation disclaimer, nominative fair use of BMAD trademark, BMAD contributors preserved in CONTRIBUTORS.md).

**npm reality check.**

- `@xgent-ai/gomad` owned by us (Rockie / xgent-ai). v1.0.0 deprecated. v1.1.0 is `latest`.
- `bmad-method` owned by BMAD's authors. We have no rights and will never touch it on npm.

**Audience.** Internal — xgent-ai team using gomad to drive AI-assisted development. Public discoverability is secondary; correctness and credit are primary.

## Constraints

- **License**: BMAD's MIT license preserved byte-identical. GoMad additions are also MIT, appended below a horizontal rule in the same `LICENSE` file.
- **Casing**: The case-preserving display form is "GoMad" (not "Gomad"). Lowercase `gomad` for package names, paths, and CLI commands. Uppercase `GOMAD` for the acronym expansion only.
- **Trademark**: "BMAD" is a trademark of BMad Code, LLC. We use it only via nominative fair use (in attribution sentences). The skill rename (`bmad-*` → `gm-*`) is a trademark-safety requirement, not just cosmetic.
- **Tech stack**: Node.js / JavaScript (CommonJS, `require()`-based loading), inherited from BMAD.
- **Scope discipline**: Future milestone work should stay focused; mixing structural changes with new-feature work dilutes both.
- **npm publish mechanics**: Trusted publishing via GitHub Actions OIDC preferred; otherwise granular access token with "Bypass 2FA" enabled (classic automation tokens revoked Dec 2025).

## Key Decisions

| Decision                                                                                                                                | Rationale                                                                                                              | Outcome                                                  |
| --------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| Fork BMAD Method instead of contribute upstream                                                                                         | Our needs diverge from BMAD's roadmap; we want full ownership of agent/skill direction                                 | ✓ Good (v1.1 shipped)                                    |
| Hard-pivot `@xgent-ai/gomad` package on npm                                                                                             | v1.0.0 had ~no users; reusing name cleaner than abandoning it                                                          | ✓ Good (v1.1 shipped, v1.0 deprecated with no fallout)   |
| Version `1.1.0` (not `2.0.0`)                                                                                                           | User chose minor bump despite major-pivot semantics; v1.0 had effectively no users so blast radius is near-zero        | ✓ Good                                                   |
| Skill prefix: `gm-*` (not `gomad-*`)                                                                                                    | Shorter; less verbose in command invocations and file paths                                                            | ✓ Good                                                   |
| Top-level dir `bmm-skills/` → `gomad-skills/`                                                                                           | Full `gomad` at module level, short `gm-` only for individual skill names                                              | ✓ Good                                                   |
| Manifest filenames: drop `bmad-` prefix entirely (`skill-manifest.yaml`, `manifest.json`)                                               | Directory namespace already provides scoping; cleanest                                                                 | ✓ Good                                                   |
| `package.json author`: `Rockie Guo <rockie@kitmi.com.au>` only; BMAD attribution lives in LICENSE/README                                | Avoids confusing npm registry metadata; credit handled where users actually look                                       | ✓ Good                                                   |
| `LICENSE` strategy: append GoMad block to BMAD's MIT, single file, no `NOTICE`                                                          | OpenTofu/HashiCorp precedent; NOTICE is Apache-2.0 not MIT                                                             | ✓ Good                                                   |
| Casing: "GoMad" (not "Gomad") as display form                                                                                           | Matches the G-O-Mad acronym feel; lowercase `gomad` for paths/CLI, `GOMAD` for acronym expansion only                  | ✓ Good                                                   |
| Drop `tools/installer/external-official-modules.yaml` + consumer code entirely                                                          | We are not a frontend for BMAD's external modules ecosystem                                                            | ✓ Good                                                   |
| Drop `docs/cs/`, `docs/fr/`, `docs/vi-vn/`; keep default (en) + `zh-cn/` only                                                           | Same EN+CN policy as README; no maintainer for the others                                                              | ✓ Good                                                   |
| Deprecate `@xgent-ai/gomad@1.0.0` (not `bmad-method`)                                                                                   | v1.0.0 was a Claude Code skills installer — wrong product direction                                                    | ✓ Good (deprecated 2026-04-18)                           |
| Domain `gomad.xgent.ai`                                                                                                                 | xgent-ai subdomain; GitHub Pages deploy deferred until project stabilizes                                              | — Pending deploy                                         |
| Keep `core-skills/` (rename only)                                                                                                       | It's the foundation bmm workflows depend on, not "BMad builder" cruft                                                  | ✓ Good                                                   |
| Defer all new agents/skills to milestone 2                                                                                              | Keeps v1.1 diff focused on rename/credit; clean baseline for future work                                               | ✓ Good                                                   |
| Canonical non-affiliation disclaimer established as single source of truth, reused verbatim across LICENSE/TRADEMARK/README/README_CN   | Prevents drift across legal surfaces                                                                                   | ✓ Good                                                   |
| CLI banner via hand-authored GoMad ASCII in `cli-utils.js displayLogo()`, no figlet dep                                                 | One less runtime dep; static banner is stable enough to hand-author                                                    | ✓ Good                                                   |
| E2E test verifies tarball structurally (not via interactive `gomad install`)                                                            | Avoids `@clack/prompts` hang in non-TTY test environment                                                               | ✓ Good                                                   |
| Launcher-form slash commands (not self-contained) — `.claude/commands/gm/agent-*.md` is a thin stub loading persona from `_gomad/gomad/agents/*.md` at runtime | Preserves `SKILL.md` as single source of truth (persona body extracted at install time per D-06); no hand-authored duplication; Claude Code sees rich metadata via launcher body | — Contract set in Phase 5; extractor lands in Phase 6    |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):

1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):

1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---

*Last updated: 2026-04-20 after Phase 7 (upgrade safety — manifest-driven cleanup) complete — INSTALL-05/06/07/08/09 closed; `buildCleanupPlan` + `executeCleanupPlan` + `--dry-run` shipped with snapshot-before-remove, realpath containment, v1.1 legacy cleanup, `docs/upgrade-recovery.md`, and 223 Phase 7 assertions green*
