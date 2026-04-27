# GoMad

## What This Is

GoMad (GOMAD Orchestration Method for Agile Development) is a hard fork of [BMAD Method](https://github.com/bmad-code-org/BMAD-METHOD) — an agentic workflow framework for AI-driven software development. v1.1 shipped the fork pivot: renamed package, slim codebase, full credit + legal posture, bilingual docs, published as `@xgent-ai/gomad@1.1.0` on npm. v1.2 (shipped 2026-04-24, published as `@xgent-ai/gomad@1.2.0`) landed the agent-invocation pivot (7 `gm-agent-*` personas invoked as `/gm:agent-*` launcher-form slash commands), hardened the installer for portable git-clone workflows (copy-only, manifest-driven upgrade cleanup with `--dry-run` + backup snapshots), and retuned `gm-create-prd` / `gm-product-brief` to read like dev-ready specs for coding agents rather than pitches for human product leads. v1.3 (shipped 2026-04-27, published as `@xgent-ai/gomad@1.3.0`) added a story-creation discuss step + hand-rolled domain-knowledge retrieval (`gm-discuss-story` + `gm-domain-skill` + 2 seed KB packs), built out 6 EN + 6 zh-cn docs pages on `gomad.xgent.ai` with build-time auto-injection of agents/skills tables, and relocated the agent install path from `<installRoot>/gomad/agents/` to `<installRoot>/_config/agents/` with manifest-driven backup snapshots and explicit BREAKING callout.

## Core Value

A lean, properly-credited fork of BMAD Method that we own end-to-end and can extend with our own agents/skills, without dragging along the parts of BMAD we don't use.

## Current Milestone — v1.4 (TBD)

**Status:** v1.3 closed 2026-04-27. v1.4 not yet scoped — run `/gsd-new-milestone` to start questioning → research → requirements → roadmap.

Phase numbering continues from Phase 12 (v1.3 ended) → Phase 13 starts v1.4.

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
- ✓ **Agent-as-command migration** (7 `gm-agent-*` personas → `.claude/commands/gm/agent-*.md` launchers, invoked as `/gm:agent-*`; subdirectory namespace verified on current Claude Code; launcher stubs generated at install time from `gm-agent-*/skill-manifest.yaml`; persona body loaded from `_gomad/gomad/agents/*.md` at runtime) — v1.2 (CMD-01..05, 5 reqs)
- ✓ **Reference sweep** (every user-visible `gm-agent-*` reference across source / docs / tests / manifests migrated to `gm:agent-*`; filesystem dirs + `skill-manifest.yaml name:` kept as dash-form for Windows safety; launcher stubs excluded from dev repo via `.gitignore`) — v1.2 (REF-01..05, 5 reqs)
- ✓ **Copy-only installer with manifest-driven upgrade** (symlink mode removed; `files-manifest.csv` v2 schema with `schema_version` + `install_root`, parsed/written via `csv-parse/sync`; stale entries cleaned on re-install with realpath containment under `.claude/` + `_gomad/`; BOM/CRLF-aware rows; corrupt-header → `MANIFEST_CORRUPT` classification; `--dry-run` preview; pre-cleanup backup snapshots under `_gomad/_backups/<timestamp>/`; v1.1→v1.2 legacy cleanup of `.claude/skills/gm-agent-*/`) — v1.2 (INSTALL-01..09, 9 reqs)
- ✓ **Coding-agent-oriented PRD refinement** (`gm-create-prd` steps 02b/02c/03/10 stripped of human-founder framing; residual sweep across 9 other steps; `## Coding-Agent Consumer Mindset` added to `data/prd-purpose.md`; step-09 emits `FR-NN` + Given/When/Then AC + `## Out of Scope` contract; `gm-product-brief` voice aligned with guardrails preserved; downstream skills structurally untouched) — v1.2 (PRD-01..07, 7 reqs)
- ✓ **Release mechanics** (`type: module` factual error in PROJECT.md corrected; CHANGELOG v1.2.0 includes explicit BREAKING callout; tarball verification extended to assert `.claude/commands/gm/` presence + legacy `.claude/skills/gm-agent-*` absence; 97-assertion PRD chain integration test wired into `npm run quality`; `@xgent-ai/gomad@1.2.0` published with `latest` dist-tag; `v1.2.0` tagged on main) — v1.2 (REL-01..06, 6 reqs)
- ✓ **Docs site content authoring** (6 EN pages + 6 zh-cn siblings authored: tutorials/install, tutorials/quick-start, reference/agents, reference/skills, explanation/architecture, how-to/contributing; 53 BMAD-era pages deleted; `docs/index.md` rewritten as gomad landing; `tools/inject-reference-tables.cjs` auto-populates 8 personas + 28 task-skills + 11 core-skills from `src/{gomad,core}-skills/*/SKILL.md` at build time; `tools/validate-doc-links.js` URL-scheme guard; `tools/build-docs.mjs` REPO_URL + llms.txt corrected to v1.3; `npm run docs:build` exits 0 end-to-end and idempotent) — v1.3 Phase 11 (DOCS-01..06, 6 reqs)
- ✓ **DOCS-07 path-sweep linter** (`tools/validate-doc-paths.js` negative-only docs-path linter (76 LOC, zero new deps); `npm run validate:doc-paths` exits 0 on clean tree, 1 on legacy-path leaks; hard allowlist exempts `docs/upgrade-recovery.md` + `docs/zh-cn/upgrade-recovery.md`; wired into `quality` + `prepublishOnly`) — v1.3 Phase 12 (DOCS-07, 1 req)
- ✓ **Story-creation enhancements** (`gm-discuss-story` 5-file task-skill emitting `{{story_key}}-context.md` with 5 locked XML-wrapped sections + per-area checkpoint resume + ≤1500 token cap; `gm-domain-skill` BM25 + Levenshtein retrieval task-skill with 4 mode-branching outputs (file-content / catalog / no-match / typo-fallback), zero new runtime deps; 2 seed KB packs `src/domain-kb/{testing,architecture}/` at 18 files total, `source: original` + `license: MIT` + `last_reviewed`; `tools/validate-kb-licenses.js` IP-cleanliness release gate (7 rules KB-01..KB-07) wired into `npm run quality`; installer `_installDomainKb()` step copying to `<installRoot>/_config/kb/` tracked in `files-manifest.csv` v2; `gm-create-story` SELECTIVE_LOAD auto-detection of context.md + pre-bake of domain KB before story draft; conflict resolution: prompt-wins with visible warning) — v1.3 Phase 10 (STORY-01..12, 12 reqs)
- ✓ **Agent dir relocation** (persona body files relocated `<installRoot>/gomad/agents/` → `<installRoot>/_config/agents/`; single source-of-truth `AGENTS_PERSONA_SUBPATH` constant in `path-utils.js`; writer + launcher template + installer comment swapped; `cleanup-planner.js` v12 branch with `isV12LegacyAgentsDir` predicate snapshots + removes legacy persona files via manifest-driven cleanup with `_gomad/_backups/<timestamp>/` snapshots and `meta.reason: manifest_cleanup`; latent `newInstallSet` derivation bug fixed; `detectCustomFiles` whitelist treats relocated persona `.md` as generated; verbose 4-bullet BREAKING migration banner printed on v1.2→v1.3 upgrade; `docs/upgrade-recovery.md` + zh-cn parity v1.2→v1.3 migration section; `<installRoot>` resolves at install time from user-chosen dir, never hardcoded `_gomad`) — v1.3 Phase 12 (AGENT-01..11, 11 reqs)
- ✓ **v1.3 test matrix expansion** (`test-gm-command-surface.js` Phase C extended with launcher-body positive `_config/agents/` + negative `gomad/agents/` regex per persona; `verify-tarball.js` Phase 4 `checkLegacyAgentPathClean` greps shipped tarball; new E2E tests `test-legacy-v12-upgrade.js` (32 assertions, NETWORK-FREE manual v1.2 synthesis) + `test-v13-agent-relocation.js`; full `quality` matrix wired through `prepublishOnly`) — v1.3 Phase 12 (AGENT-07..10, REL-02, 5 reqs)
- ✓ **v1.3 release** (`CHANGELOG.md` v1.3.0 entry with explicit `### BREAKING CHANGES` section + old-path → new-path migration + backup-recovery cross-reference; `package.json` `prepublishOnly = npm run quality` gate added; `@xgent-ai/gomad@1.3.0` published to npm with `latest` dist-tag; `v1.3.0` annotated tag on `github/main` with BREAKING-callout body; v1.2.0 retained as prior-stable; v1.1.0 retained; v1.0.0 deprecation unchanged) — v1.3 Phase 12 (REL-01, REL-03, REL-04, 3 reqs)

### Active

<!-- v1.4 scope — TBD. Run `/gsd-new-milestone` to populate after questioning. -->

(None — v1.3 closed 2026-04-27. Awaiting v1.4 scoping.)

### Deferred (beyond v1.2)

<!-- Previously aspirational; not in current milestone. -->

- **CUSTOM-01**: New gomad-specific agents added to `src/gomad-skills/` or `src/core-skills/`
- **CUSTOM-02**: New gomad-specific skills integrated into the `1-analysis` → `4-implementation` workflow
- **CUSTOM-03**: Agent/skill documentation and installer support for new additions
- **CMD-F1**: Task-skill → slash-command aliases (e.g. `/gm:create-prd`, `/gm:product-brief`); task skills currently stay as skills only
- **REL-F1**: Backup rotation / pruning policy for `_gomad/_backups/<timestamp>/`; first-pass keeps all snapshots on disk

### Out of Scope

<!-- Explicit boundaries. Each carries reasoning to prevent re-adding. -->

- **Claude Code plugin marketplace (`.claude-plugin/marketplace.json`)** — Dropped 2026-04-24 during v1.3 scoping. User chose `gomad install` CLI as the single distribution path. Stale BMAD-era `marketplace.json` was removed from the repo rather than refreshed. Former Phase 10 (MARKET-01..05) scrapped.
- **Touching `bmad-method` on npm** — That package is owned by BMAD's authors (`bmadcode`, `muratkeremozcan`, `alex_verk`). We do nothing to it. Ever.
- **Reworking bmm workflow internals** — `1-analysis` / `2-plan-workflows` / `3-solutioning` / `4-implementation` stay structurally as-is. Behavioral changes are scope violations without explicit justification.
- **GSD integration into the gomad distribution** — `.claude/get-shit-done/` is our dev tooling for building gomad, not part of the shipped product. Likely permanently out of scope.
- **Reworking or unpublishing `@xgent-ai/gomad@1.0.0`** — Deprecated, not removed. No retroactive rewrite.
- **Tracking BMAD upstream changes** — GoMad is a hard fork, not a continuously-merged downstream. No auto-sync from BMAD's `main`.
- **GitHub Pages deployment** — CNAME set to `gomad.xgent.ai`; actual deploy deferred until project stabilizes.

## Context

**Shipped state (2026-04-24).** `@xgent-ai/gomad@1.2.0` is live on npm with `latest` dist-tag. `v1.1.0` retained as prior stable (not deprecated). `@xgent-ai/gomad@1.0.0` remains deprecated with redirect to `@latest`. `v1.2.0` tag on main. Installer is copy-only with manifest-driven upgrade cleanup (`--dry-run` + backup snapshots under `_gomad/_backups/<timestamp>/`). 7 `gm-agent-*` personas now installed as `/gm:agent-*` launcher-form slash commands under `.claude/commands/gm/`, generated at install time from `gm-agent-*/skill-manifest.yaml`. Filesystem dir names + `skill-manifest.yaml name:` fields keep the dash form (`gm-agent-*`) for Windows-safety; only user-visible references migrated to colon form.

**Codebase state.**

- Package: `@xgent-ai/gomad@1.2.0` on npm, public scoped.
- Source: `src/gomad-skills/` (four-phase workflow modules) + `src/core-skills/` (shared infrastructure skills). All skills use the `gm-*` prefix; 7 agent personas (analyst, tech-writer, pm, ux-designer, architect, sm, dev) live under `gm-agent-*/`.
- CLI: `tools/installer/gomad-cli.js` is the single entry point, exposing the `gomad` command. Installer now copy-only (`fs.copy`, not `fs.ensureSymlink`); tracks every installed path in `_gomad/_config/files-manifest.csv` (v2 schema with `schema_version` + `install_root`, parsed via `csv-parse/sync`); on re-install, cleans stale entries with realpath containment under `.claude/` + `_gomad/`, snapshots pre-cleanup, and offers `--dry-run`.
- Launcher stubs: Generated at install time into target `.claude/commands/gm/agent-*.md`; launchers excluded from dev repo via `.gitignore`. Persona body loaded at runtime from `_gomad/gomad/agents/*.md` (D-06 / launcher-form contract).
- PRD pipeline: `gm-create-prd` and `gm-product-brief` refocused on coding-agent consumers. `data/prd-purpose.md` ships `## Coding-Agent Consumer Mindset`. Step-09 emits FR-NN requirements + Given/When/Then acceptance criteria + `## Out of Scope` section. Structural compatibility preserved with downstream skills (`gm-validate-prd`, `gm-create-architecture`, `gm-create-epics-and-stories`, `gm-check-implementation-readiness`).
- Manifests: `skill-manifest.yaml` and `manifest.json` (no `bmad-` prefix).
- Website: Astro under-construction one-pager at `gomad.xgent.ai`.
- Tech stack: Node.js / JavaScript (CommonJS, `require()`-based loading), inherited from BMAD. Zero new runtime deps added in v1.2.
- Docs: English default + `zh-cn/` Chinese translation. `docs/upgrade-recovery.md` documents backup-restore flow.
- Tests: `test:gm-surface` (3-phase launcher contract: in-repo self-check, negative-fixture, install-smoke), `test:tarball` (extended with `.claude/commands/gm/` presence + `.claude/skills/gm-agent-*` absence assertions), `test/integration/prd-chain/test-prd-chain.js` (97 assertions). All wired into `npm run quality`.

**Upstream relationship.** GoMad is a hard fork of BMAD Method (<https://github.com/bmad-code-org/BMAD-METHOD>), MIT-licensed by Brian (BMad) Madison. Credit preserved legally (MIT license byte-identical in LICENSE) and ethically (non-affiliation disclaimer, nominative fair use of BMAD trademark, BMAD contributors preserved in CONTRIBUTORS.md).

**npm reality check.**

- `@xgent-ai/gomad` owned by us (Rockie / xgent-ai). v1.0.0 deprecated. v1.1.0 prior-stable. v1.2.0 is `latest`.
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
| Launcher-form slash commands (not self-contained) — `.claude/commands/gm/agent-*.md` is a thin stub loading persona from `_gomad/gomad/agents/*.md` at runtime | Preserves `SKILL.md` as single source of truth (persona body extracted at install time per D-06); no hand-authored duplication; Claude Code sees rich metadata via launcher body | ✓ Good (v1.2 shipped; contract set Phase 5, extractor shipped Phase 6) |
| `/gm:agent-*` committed as single user-visible form (no alternative namespace) | Subdirectory namespace verified on current Claude Code; flat-name fallback (`/gm-agent-*`) documented but not built | ✓ Good (v1.2) |
| No Claude Code version floor pinned (D-03)                                                                                               | Claude Code ships essentially daily; handle regressions in a patch release rather than freeze the dependency                             | ✓ Good (v1.2)                                             |
| Filesystem dir names + `skill-manifest.yaml name:` fields keep dash form (`gm-agent-*`), not colon form                                 | Colons aren't Windows-safe in filesystem paths; only user-visible invocation form migrates to colon (`gm:agent-*`)                       | ✓ Good (v1.2)                                             |
| Zero new runtime deps in v1.2 — local `escapeCsv` (3 LOC) instead of `csv-stringify/sync`                                                | Reuses existing `csv-parse/sync` dep symmetrically for read and write; smallest shipped surface                                          | ✓ Good (v1.2)                                             |
| `files-manifest.csv` v2 schema: `schema_version="2.0"` + `install_root="_gomad"` + columns `type,name,module,path,hash`                  | Enables safe v1→v2 evolution; `install_root` lets cleanup realpath-contain deletions; column order appends new fields, preserving backward read-compat | ✓ Good (v1.2)                                             |
| Manifest-driven cleanup containment: realpath resolution → allowed-root prefix check → symlink-escape emits `SYMLINK_ESCAPE` log then throws `ManifestCorruptError` | Symlink traversal is the highest-severity deletion risk; D-33 batch-poison on containment failure is the safe default — no partial deletion outside install roots | ✓ Good (v1.2)                                             |
| Corrupt-header / IO-error classified as `MANIFEST_CORRUPT` (IO_ERROR sub-class); parse-time error = batch abort                          | Structured error classification so the caller's `[]` return is interpretable; cleanup contract surfaces errors rather than silently skipping | ✓ Good (v1.2)                                             |
| Backup snapshots under `_gomad/_backups/<timestamp>/` before destructive cleanup; no rotation policy in v1.2                            | Reversibility first; rotation policy (REL-F1) deferred until real-world snapshot accumulation justifies it                              | — Pending (REL-F1 deferred)                               |
| PRD refinement is strip-only / additive — structural sections consumed by `gm-validate-prd`, `gm-create-architecture`, `gm-create-epics-and-stories`, `gm-check-implementation-readiness` are preserved | Avoids lockstep updates across 4 downstream skills; refactor budget spent on prompt content, not pipeline rewire                        | ✓ Good (v1.2)                                             |
| `gm-create-prd` step-09 emits FR-NN functional requirements + Given/When/Then acceptance criteria + explicit `## Out of Scope` section (D-58) | Machine-verifiable AC + stable REQ-IDs make PRDs consumable by coding agents without human translation                                  | ✓ Good (v1.2)                                             |
| REL-03 enforcement is dual-sided: `test:gm-surface` (installer output shape) + `test:tarball` (shipped tarball shape); both must exit 0 before publish | Installer could produce correct output from broken tarball source, or tarball could be correct but installer could mis-emit — neither alone is sufficient | ✓ Good (v1.2)                                             |
| v1.1.0 retained as prior-stable on npm (not deprecated at v1.2 release)                                                                  | No known v1.1 breakage; deprecation only if real issues emerge                                                                            | ✓ Good (v1.2)                                             |
| v1.3 BREAKING-callout pattern + `prepublishOnly = npm run quality` gate (D-07)                                                           | Reused v1.2 BREAKING-section template for CHANGELOG; added prepublishOnly gate to prevent accidental publish on un-tested state. OIDC migration deferred to v1.4+ (D-06). | ✓ Good (v1.3 shipped 2026-04-27)                          |
| Agent dir relocated `<installRoot>/gomad/agents/` → `<installRoot>/_config/agents/` (agents-only; `gomad/workflows/` and `gomad/data/` stay) | Centralizes user-customizable surface under `_config/`; runtime pointer + cleanup-planner + namespace collision worked through with manifest-driven backup snapshots; `_config/kb/` (Phase 10) proved the greenfield `_config/<subdir>/` pattern before Phase 12's collision-prone path | ✓ Good (v1.3)                                             |
| `prepublishOnly` quality matrix extended to gate on tarball / install / legacy-upgrade tests, NOT `test:orphan-refs` (which is in `npm test` / pre-commit only) | `test:orphan-refs` is a regression-ratchet for new files referencing `gm-agent-*`; pre-commit catches it before commit. `quality` focuses on shippable-tarball correctness and is what `prepublishOnly` re-runs as a defensive last gate. | ✓ Good (v1.3)                                             |
| Test install-smoke harnesses must be hermetic re: outer `npm publish` env (strip `npm_*` from spawned `npm install`)                      | `npm publish --registry=<custom>` exports `npm_config_registry` to subprocesses; nested `npm install` inside `prepublishOnly`-triggered tests would otherwise fetch deps from the custom registry and deadlock. Hermeticity verified during 1.3.0 release. | ✓ Good (v1.3)                                             |

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

*Last updated: 2026-04-27 after v1.3 milestone close — all 34 v1.3 requirements (DOCS-01..07, STORY-01..12, AGENT-01..11, REL-01..04) moved to Validated; MILESTONES.md v1.3 entry authored; ROADMAP.md reorganized with collapsed v1.3 section under `<details>`; REQUIREMENTS.md + ROADMAP.md archived to `milestones/v1.3-{ROADMAP,REQUIREMENTS}.md`. Active section cleared pending v1.4 scoping via `/gsd-new-milestone`. Phase numbering continues from Phase 12 → Phase 13 starts v1.4.*

*Previously: 2026-04-27 after Phase 12 (Agent Dir Relocation + Release) complete — `@xgent-ai/gomad@1.3.0` shipped to npm with `latest` dist-tag; annotated `v1.3.0` tag on github/main with BREAKING-callout body; CHANGELOG v1.3.0 entry + `docs/upgrade-recovery.md` v1.2→v1.3 cross-link in place. Persona body files relocated `<installRoot>/_gomad/gomad/agents/` → `<installRoot>/_gomad/_config/agents/` (agents-only; `gomad/workflows/` and `gomad/data/` unchanged). v1.2 → v1.3 upgrade automated with backup snapshots under `_gomad/_backups/<ts>/` and metadata `reason: manifest_cleanup`. 5 new Key Decisions rows for v1.3 (BREAKING-callout + prepublishOnly gate, agent-dir relocation, prepublishOnly scope vs npm test, hermetic install-smoke env, Phase 10 _config/<subdir>/ pattern proven before Phase 12). Active→Validated migration of remaining v1.3 items + MILESTONES.md v1.3 entry deferred to `/gsd-complete-milestone`.*

*Previously: 2026-04-26 after Phase 11 (Docs Site Content Authoring) complete — DOCS-01..06 moved to Validated; 12 new doc pages authored (6 EN + 6 zh-cn) covering tutorials/install, tutorials/quick-start, reference/agents, reference/skills, explanation/architecture, how-to/contributing; auto-injecting reference-table tooling shipped (`tools/inject-reference-tables.cjs` populating 8 personas + 28 task-skills + 11 core-skills); `npm run docs:build` exits 0 end-to-end with idempotency; 53 BMAD-era doc pages deleted, `tools/build-docs.mjs` REPO_URL + llms.txt cleansed of v1.2-era leaks; "GitHub Pages docs site" workstream removed from Active. Remaining v1.3 active items: 4 (story-creation enhancements x3 + agent dir relocation).*

*Previously: 2026-04-24 after marketplace workstream dropped — v1.3 milestone renamed to "Docs, Story Context & Agent Relocation" (3 workstreams); `.claude-plugin/marketplace.json` removed from the repo; former Phase 10 (MARKET-01..05) moved to Out of Scope; Phases 11/12/13 renumbered to 10/11/12. Active requirements now 5 v1.3 items.*

*Previously: 2026-04-24 after v1.3 milestone scoping — Current Milestone section added for "v1.3 Marketplace, Docs & Story Context" (4 workstreams: marketplace refresh, GH Pages docs site, agent dir relocation, story-creation enhancements); Active requirements populated with 6 v1.3 items; phase numbering continues from Phase 10; zero-new-deps policy reaffirmed; `<installRoot>` explicitly flagged as user-chosen (not hardcoded).*

*Previously: 2026-04-24 after v1.2 milestone close — all 32 v1.2 requirements (CMD-01..05, REF-01..05, INSTALL-01..09, PRD-01..07, REL-01..06) moved to Validated; `@xgent-ai/gomad@1.2.0` shipped on npm with `v1.2.0` tag on main; 13 new Key Decisions rows added for v1.2 (namespace commit, Windows-safe dash form, manifest v2 schema, cleanup containment, PRD strip-only refactor, dual-sided REL-03, v1.1 retained as prior-stable); Launcher-form slash commands row outcome flipped to ✓ Good.*

*Previously: 2026-04-22 after Phase 8 (PRD + product-brief content refinement) complete — PRD-01..PRD-07 closed; founder framing stripped from `gm-create-prd` steps 02b/02c/03/10 + residual sweep of 9 other steps; `## Coding-Agent Consumer Mindset` installed in `data/prd-purpose.md`; FR-NN + Given/When/Then AC + `## Out of Scope` contract emitted by step-09; `gm-product-brief` voice aligned (guardrails preserved); new `test/integration/prd-chain/test-prd-chain.js` (97 assertions) wired into `npm run quality`.*

*2026-04-20 after Phase 7 (upgrade safety — manifest-driven cleanup) complete — INSTALL-05/06/07/08/09 closed; `buildCleanupPlan` + `executeCleanupPlan` + `--dry-run` shipped with snapshot-before-remove, realpath containment, v1.1 legacy cleanup, `docs/upgrade-recovery.md`, and 223 Phase 7 assertions green*
