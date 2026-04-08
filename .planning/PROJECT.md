# Gomad

## What This Is

Gomad (GOMAD Orchestration Method for Agile Development) is a fork of [BMAD Method](https://github.com/bmad-code-org/BMAD-METHOD) — an agentic workflow framework for AI-driven software development. We extend BMAD's core agile methodology with our own agents, skills, and integrations while preserving the upstream's proven analysis → plan → solutioning → implementation flow.

## Core Value

A lean, credited fork of BMAD Method that we own end-to-end and can extend with our own agents/skills, without dragging along the parts of BMAD we don't use.

## Requirements

### Validated

<!-- Shipped and confirmed valuable. -->

(None yet — v1.0 shipped in the wrong direction and is being superseded by v1.1 on the `next` branch.)

### Active

<!-- Milestone 1 (v1.1): clean fork + rename + slim down + credit + branding -->

- [ ] **Rename — package & metadata**: `package.json` name → `@xgent-ai/gomad`, version → `1.1.0`, description/keywords/repo URLs updated
- [ ] **Rename — full text sweep**: All occurrences of `BMAD`, `BMAD Method`, `BMad`, `bmad-method` in source, docs, configs, tests, comments → `Gomad` / `gomad` (case-preserving)
- [ ] **Rename — skills**: `core-skills/bmad-*/` directories → `core-skills/gm-*/` (e.g., `bmad-help` → `gm-help`); update all internal references and skill IDs
- [ ] **Rename — module directory**: `src/bmm-skills/` → `src/gomad-skills/`; update installer paths and module manifests
- [ ] **Slim down — verify scope**: Confirm BMad builder and web bundle code/assets are gone (prior `next` branch refactor may already cover this); remove any residue
- [ ] **Credit — attribution**: README "Credits" / "Acknowledgements" section, plus `NOTICE` (or equivalent) crediting BMAD Method as the upstream source under MIT, including link to original repo
- [ ] **Credit — LICENSE**: Preserve original BMAD MIT license + add Gomad copyright line; verify `TRADEMARK.md` posture (BMAD is a trademark — do not infringe)
- [ ] **Branding — visual assets**: New `banner-gomad.png`, `Wordmark.png` (gomad), favicon; remove or replace `banner-bmad-method.png`
- [ ] **Branding — CLI**: Installer/CLI banner output rebranded to gomad
- [ ] **Docs — README**: `README.md` (English, default) and `README_CN.md` (Chinese) rewritten with gomad framing, install commands, and BMAD attribution; `README_VN.md` removed
- [ ] **Docs — domain**: `CNAME` → `gomad.xgent.ai`
- [ ] **Docs — supporting files**: `CHANGELOG.md` (add v1.1.0 entry explaining the pivot), `CONTRIBUTING.md`, `CONTRIBUTORS.md`, `SECURITY.md`, `AGENTS.md`, `docs/` site, `website/` content
- [ ] **Release — deprecate v1.0**: Mark `bmad-method@1.0.x` (or whatever name v1.0 was published under) as deprecated on npm with a pointer to `@xgent-ai/gomad`
- [ ] **Verification — installer end-to-end**: Fresh install of `@xgent-ai/gomad@1.1.0` produces a working setup with all renamed skills loadable
- [ ] **Verification — tests pass**: `npm test` and skill validators (`tools/validate-skills.js`, `validate-doc-links.js`, `validate-file-refs.js`) green after rename

### Out of Scope

<!-- Explicit boundaries for v1.1. Each carries reasoning to prevent re-adding. -->

- **New gomad-specific agents** — Deferred to milestone 2. v1.1 is rename + slim down only; mixing in new content would muddy the diff and the credit story.
- **New gomad-specific skills** — Same as above.
- **BMad builder** — Removed. Was part of upstream BMAD but not needed for our usage.
- **Web bundle** — Removed. Not part of our distribution model.
- **Reworking bmm workflow internals** — `1-analysis` / `2-plan-workflows` / `3-solutioning` / `4-implementation` stay structurally as-is. Pure rename, no behavioral changes.
- **GSD integration** — The `.claude/get-shit-done/` tooling we use to manage *this* project is NOT part of the gomad distribution. Out of scope for v1.1, and likely permanently.
- **Re-publishing v1.0** — v1.0 (wrong direction) is not re-published. v1.0 will be deprecated on npm with a pointer to `@xgent-ai/gomad@1.1.0` (see Active checklist).

## Context

**Backstory.** A previous milestone on `main` shipped `bmad-method` v1.0 in a direction we now consider wrong. Rather than evolve from that, we restarted on the `next` branch with `ad2434b refactor: new start for next`, which already trimmed `src/` down to `bmm-skills/` and `core-skills/`. v1.1.0 builds on that reset.

**Upstream relationship.** Gomad is a hard fork of BMAD Method. We are not tracking upstream changes automatically; BMAD is treated as the seed, not a continuously merged base. Credit must remain prominent — both legally (MIT license preservation) and ethically (BMAD's authors did the original work).

**Existing codebase state.**
- `package.json` still says `bmad-method` v6.2.2 — rename has not started.
- `src/bmm-skills/` contains the four-phase workflow modules.
- `src/core-skills/` contains shared infrastructure skills (`bmad-help`, `bmad-brainstorming`, `bmad-shard-doc`, `bmad-party-mode`, `bmad-distillator`, review/elicitation skills) — these are kept and renamed, not removed.
- `tools/installer/` references will need updating during rename.
- Codebase map exists at `.planning/codebase/` — produced by `/gsd-map-codebase` in a prior session.

**Audience.** Internal — xgent-ai team using gomad to drive AI-assisted development. Public discoverability is secondary in v1.1; correctness and credit are primary.

## Constraints

- **License**: MIT must be preserved — BMAD's original MIT license stays intact. Gomad additions are also MIT.
- **Trademark**: "BMAD" is trademarked by Brian (BMad) Madison. Avoid any use of the BMAD mark in our branding, names, or assets except in attribution context.
- **Tech stack**: Node.js / JavaScript (`type: module`), inherited from BMAD. No language change in v1.1.
- **Branch**: All v1.1 work happens on `next`, merged to `main` only when milestone 1 ships.
- **Scope discipline**: v1.1 is rename + slim down + credit + branding. Any new agent/skill work is a scope violation and gets deferred.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Fork instead of contribute upstream | Our needs diverge from BMAD's roadmap; we want full ownership of agent/skill direction | — Pending (validated by shipping v1.1) |
| Restart on `next` rather than evolve v1.0 | v1.0 went in the wrong direction; clean restart cheaper than refactor | — Pending |
| Package name `@xgent-ai/gomad` | Scoped under our org; avoids name collision with `bmad-method` on npm | — Pending |
| Version starts at 1.1.0 (not 0.1.0 / 1.0.0) | v1.0.0 of the misdirected build was already published; 1.1.0 frames this as a correction, not a new project | — Pending |
| Skill prefix: `gm-*` (not `gomad-*`) | Shorter, less verbose in command invocations and file paths | — Pending |
| Top-level dir `bmm-skills` → `gomad-skills` | Cleanest read; full `gomad` at module level, short `gm-` only for individual skill names | ✓ Good |
| Domain `gomad.xgent.ai` | xgent-ai subdomain now; GitHub Pages deploy deferred until project stabilizes | — Pending |
| Deprecate v1.0 on npm | v1.0 was incomplete and unusable; deprecation prevents accidental installs and points users to 1.1.0 | — Pending |
| README languages: EN (default) + CN only | Drop `README_VN.md` — no maintainer for Vietnamese; EN+CN cover the team | ✓ Good |
| Keep `core-skills/` | It's the foundation bmm workflows depend on, not "BMad builder" cruft | ✓ Good |
| Defer all new agents/skills to milestone 2 | Keeps v1.1 diff focused on rename/credit; clean baseline for future work | — Pending |

---
*Last updated: 2026-04-08 after initial questioning*
