# GoMad

## What This Is

GoMad (GOMAD Orchestration Method for Agile Development) is a hard fork of [BMAD Method](https://github.com/bmad-code-org/BMAD-METHOD) — an agentic workflow framework for AI-driven software development. v1.1 shipped the fork pivot: renamed package, slim codebase, full credit + legal posture, bilingual docs, published as `@xgent-ai/gomad@1.1.0` on npm. v1.2 (shipped 2026-04-24, published as `@xgent-ai/gomad@1.2.0`) landed the agent-invocation pivot (7 `gm-agent-*` personas now invoked as `/gm:agent-*` launcher-form slash commands), hardened the installer for portable git-clone workflows (copy-only, manifest-driven upgrade cleanup with `--dry-run` + backup snapshots), and retuned `gm-create-prd` / `gm-product-brief` to read like dev-ready specs for coding agents rather than pitches for human product leads.

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
- ✓ **Agent-as-command migration** (7 `gm-agent-*` personas → `.claude/commands/gm/agent-*.md` launchers, invoked as `/gm:agent-*`; subdirectory namespace verified on current Claude Code; launcher stubs generated at install time from `gm-agent-*/skill-manifest.yaml`; persona body loaded from `_gomad/gomad/agents/*.md` at runtime) — v1.2 (CMD-01..05, 5 reqs)
- ✓ **Reference sweep** (every user-visible `gm-agent-*` reference across source / docs / tests / manifests migrated to `gm:agent-*`; filesystem dirs + `skill-manifest.yaml name:` kept as dash-form for Windows safety; launcher stubs excluded from dev repo via `.gitignore`) — v1.2 (REF-01..05, 5 reqs)
- ✓ **Copy-only installer with manifest-driven upgrade** (symlink mode removed; `files-manifest.csv` v2 schema with `schema_version` + `install_root`, parsed/written via `csv-parse/sync`; stale entries cleaned on re-install with realpath containment under `.claude/` + `_gomad/`; BOM/CRLF-aware rows; corrupt-header → `MANIFEST_CORRUPT` classification; `--dry-run` preview; pre-cleanup backup snapshots under `_gomad/_backups/<timestamp>/`; v1.1→v1.2 legacy cleanup of `.claude/skills/gm-agent-*/`) — v1.2 (INSTALL-01..09, 9 reqs)
- ✓ **Coding-agent-oriented PRD refinement** (`gm-create-prd` steps 02b/02c/03/10 stripped of human-founder framing; residual sweep across 9 other steps; `## Coding-Agent Consumer Mindset` added to `data/prd-purpose.md`; step-09 emits `FR-NN` + Given/When/Then AC + `## Out of Scope` contract; `gm-product-brief` voice aligned with guardrails preserved; downstream skills structurally untouched) — v1.2 (PRD-01..07, 7 reqs)
- ✓ **Release mechanics** (`type: module` factual error in PROJECT.md corrected; CHANGELOG v1.2.0 includes explicit BREAKING callout; tarball verification extended to assert `.claude/commands/gm/` presence + legacy `.claude/skills/gm-agent-*` absence; 97-assertion PRD chain integration test wired into `npm run quality`; `@xgent-ai/gomad@1.2.0` published with `latest` dist-tag; `v1.2.0` tagged on main) — v1.2 (REL-01..06, 6 reqs)

### Active

<!-- None active. Next milestone kicks off via /gsd:new-milestone. -->

(None — v1.2 shipped; v1.3 not yet scoped)

### Deferred (beyond v1.2)

<!-- Previously aspirational; not in current milestone. -->

- **CUSTOM-01**: New gomad-specific agents added to `src/gomad-skills/` or `src/core-skills/`
- **CUSTOM-02**: New gomad-specific skills integrated into the `1-analysis` → `4-implementation` workflow
- **CUSTOM-03**: Agent/skill documentation and installer support for new additions
- **CMD-F1**: Task-skill → slash-command aliases (e.g. `/gm:create-prd`, `/gm:product-brief`); task skills currently stay as skills only
- **REL-F1**: Backup rotation / pruning policy for `_gomad/_backups/<timestamp>/`; first-pass keeps all snapshots on disk

### Out of Scope

<!-- Explicit boundaries. Each carries reasoning to prevent re-adding. -->

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

*Last updated: 2026-04-24 after v1.2 milestone close — all 32 v1.2 requirements (CMD-01..05, REF-01..05, INSTALL-01..09, PRD-01..07, REL-01..06) moved to Validated; `@xgent-ai/gomad@1.2.0` shipped on npm with `v1.2.0` tag on main; 13 new Key Decisions rows added for v1.2 (namespace commit, Windows-safe dash form, manifest v2 schema, cleanup containment, PRD strip-only refactor, dual-sided REL-03, v1.1 retained as prior-stable); Launcher-form slash commands row outcome flipped to ✓ Good.*

*Previously: 2026-04-22 after Phase 8 (PRD + product-brief content refinement) complete — PRD-01..PRD-07 closed; founder framing stripped from `gm-create-prd` steps 02b/02c/03/10 + residual sweep of 9 other steps; `## Coding-Agent Consumer Mindset` installed in `data/prd-purpose.md`; FR-NN + Given/When/Then AC + `## Out of Scope` contract emitted by step-09; `gm-product-brief` voice aligned (guardrails preserved); new `test/integration/prd-chain/test-prd-chain.js` (97 assertions) wired into `npm run quality`.*

*2026-04-20 after Phase 7 (upgrade safety — manifest-driven cleanup) complete — INSTALL-05/06/07/08/09 closed; `buildCleanupPlan` + `executeCleanupPlan` + `--dry-run` shipped with snapshot-before-remove, realpath containment, v1.1 legacy cleanup, `docs/upgrade-recovery.md`, and 223 Phase 7 assertions green*
