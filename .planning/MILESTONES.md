# Milestones: GoMad

Historical record of shipped versions.

---

## v1.3 — Docs, Story Context & Agent Relocation

**Shipped:** 2026-04-27
**Phases:** 3 | **Plans:** 24 | **Timeline:** 2026-04-24 → 2026-04-27 (~3 days)
**Git range:** 182 commits between `v1.2.0`..`v1.3.0`; 294 files changed (+36,232 / −7,737)
**Git tag:** `v1.3.0` (annotated, BREAKING-callout body) on `github/main`
**npm:** [`@xgent-ai/gomad@1.3.0`](https://www.npmjs.com/package/@xgent-ai/gomad) (`latest`); v1.2.0 retained as prior-stable; v1.1.0 retained; v1.0.0 deprecation unchanged

### Delivered

Enriched the 4-implementation story workflow with a discuss step plus a hand-rolled domain-knowledge retrieval framework (BM25 + Levenshtein, zero new runtime deps), built out initial docs content for `gomad.xgent.ai` (6 EN + 6 zh-cn pages plus `inject-reference-tables.cjs` build-time auto-injection of 8 personas / 28 task-skills / 11 core-skills), and relocated the agent install path from `<installRoot>/gomad/agents/` to `<installRoot>/_config/agents/` with manifest-driven cleanup, v1.2→v1.3 backup snapshots, dual-sided launcher-body regression gates, and explicit BREAKING callout in CHANGELOG.

### Key Accomplishments

1. **Story-creation enhancements** (Phase 10) — Shipped `gm-discuss-story` (5-file skill emitting `{{story_key}}-context.md` with 5 locked XML-wrapped sections), `gm-domain-skill` (4-mode BM25/Levenshtein retrieval, zero new deps), 2 seed KB packs (`testing/` + `architecture/` at 18 files total under `src/domain-kb/`) with `tools/validate-kb-licenses.js` IP-cleanliness release gate (7 rules KB-01..KB-07), installer `_installDomainKb()` step copying to `<installRoot>/_config/kb/` tracked in `files-manifest.csv` v2, and `gm-create-story` SELECTIVE_LOAD auto-detection of context.md + pre-bake of domain KB before story draft.
2. **Docs site content authoring** (Phase 11) — Authored 6 EN pages + 6 zh-cn siblings (tutorials/install, tutorials/quick-start, reference/agents, reference/skills, explanation/architecture, how-to/contributing); deleted 53 BMAD-era pages plus 2 `roadmap.mdx` files; rewrote `docs/index.md` (+ zh-cn mirror) as the v1.3 gomad landing; shipped `tools/inject-reference-tables.cjs` build-time auto-injection of agents (8) / skills (28 task + 11 core) tables from `src/{gomad,core}-skills/*/SKILL.md`; added `validate-doc-links.js` URL-scheme guard + `build-docs.mjs` REPO_URL + `generateLlmsTxt` v1.3 URLs; `npm run docs:build` exits 0 end-to-end with idempotency.
3. **Agent dir relocation** (Phase 12 / AGENT-01..11) — Single source-of-truth `AGENTS_PERSONA_SUBPATH` constant in `path-utils.js` swapped writer + launcher template + installer comment to `_config/agents/`; new v12 branch in `cleanup-planner.js` snapshots + removes legacy `_gomad/gomad/agents/<shortName>.md` files via `isV12LegacyAgentsDir` predicate (fixes latent `newInstallSet` bug); verbose 4-bullet BREAKING migration banner printed by installer; `detectCustomFiles` whitelist treats relocated persona `.md` as generated; `docs/upgrade-recovery.md` + zh-cn parity v1.2→v1.3 migration section; cross-referenced from CHANGELOG BREAKING entry.
4. **Test matrix expansion** (Phase 12 / AGENT-07..10, DOCS-07) — `test-gm-command-surface.js` Phase C extended with launcher-body positive `_config/agents/` + negative `gomad/agents/` regex per persona; `verify-tarball.js` Phase 4 (`checkLegacyAgentPathClean`) greps shipped tarball for legacy-path leaks; new E2E tests `test-legacy-v12-upgrade.js` (32 assertions, NETWORK-FREE manual v1.2 synthesis) and `test-v13-agent-relocation.js` (fresh-install assertion); `tools/validate-doc-paths.js` linter (76 LOC, zero new deps) wired into `npm run quality`.
5. **Release mechanics** (Phase 12 / REL-01..04) — `CHANGELOG.md` v1.3.0 entry with explicit `### BREAKING CHANGES` section documenting agent-dir move + old-path → new-path migration + backup-recovery cross-reference; `package.json` `prepublishOnly = npm run quality` gate added; full `quality` matrix extended (`validate:doc-paths`, `test:inject-reference-tables`, `test:install`, `test:integration`, `test:gm-surface`, `test:tarball`, `test:domain-kb-install`, `test:legacy-v12-upgrade`, `test:v13-agent-relocation`); `@xgent-ai/gomad@1.3.0` published to npm with `latest` dist-tag; `v1.3.0` annotated tag on `github/main` with BREAKING-callout body.

### Requirements: 34/34 complete (100%)

| Category | Count | Phases |
|----------|-------|--------|
| DOCS (docs site content)        | 7  | Phase 11, 12 |
| STORY (story-creation)          | 12 | Phase 10 |
| AGENT (agent dir relocation)    | 11 | Phase 12 |
| REL (release mechanics)         | 4  | Phase 12 |

See [milestones/v1.3-REQUIREMENTS.md](./milestones/v1.3-REQUIREMENTS.md) for full traceability.

### Known deferred items at close: 2

- **Phase 11 UAT** (`11-HUMAN-UAT.md` `status: partial`) — 2 pending scenarios; `npm run docs:build` exit 0 + post-publish smoke cleared the ship gate; carried as acknowledged debt.
- **Phase 11 Verification** (`11-VERIFICATION.md` `status: human_needed`) — functional verification handled via `docs:build` end-to-end + idempotency; human-needed resolution acknowledged at close.

(See STATE.md "Deferred Items" for the full list including v1.1 / v1.2 carry-forwards.)

### Archives

- [milestones/v1.3-ROADMAP.md](./milestones/v1.3-ROADMAP.md) — full phase details
- [milestones/v1.3-REQUIREMENTS.md](./milestones/v1.3-REQUIREMENTS.md) — requirements traceability

---

## v1.2 — Agent-as-Command & Coding-Agent PRD Refinement

**Shipped:** 2026-04-24
**Phases:** 5 | **Plans:** 16 | **Tasks:** 47 | **Timeline:** 2026-04-18 → 2026-04-24 (~6 days)
**Git range:** 133 commits; 235 files changed (+26,575 / −1,756)
**Git tag:** `v1.2.0` (npm release and GSD milestone)
**npm:** [`@xgent-ai/gomad@1.2.0`](https://www.npmjs.com/package/@xgent-ai/gomad) (`latest`); v1.1.0 retained as prior-stable

### Delivered

Converted `gm-agent-*` skills to `/gm:agent-*` launcher-form slash commands, hardened the installer for portable git-clone workflows (copy-only, manifest-driven upgrade cleanup with `--dry-run` + backup snapshots), and retuned `gm-create-prd` / `gm-product-brief` to read like dev-ready specs for coding agents rather than pitches for human product leads.

### Key Accomplishments

1. **Command-surface validation** (Phase 5) — Verified `/gm:*` subdirectory namespace resolves on current Claude Code; shipped `test:gm-surface` CI guard (3-phase: in-repo self-check, negative-fixture self-test, install-smoke) locking launcher contract. Corrected two `type: module` factual errors in PROJECT.md. Added narrow `.gitignore` + `--self`-gated preflight guard preventing installs into the gomad source repo.
2. **Copy-only installer + manifest v2** (Phase 6) — Replaced `fs.ensureSymlink` with `fs.copy` throughout IDE skill install loop; re-install-gated `fs.lstat` unlinks pre-existing v1.1 symlinks. Upgraded `files-manifest.csv` from v1 (5 cols, hand-rolled parser) to v2 (7 cols, `csv-parse/sync`) with `schema_version="2.0"` + `install_root="_gomad"`. Revived `agent-command-generator.js` producing 7 `.claude/commands/gm/agent-*.md` launchers from `gm-agent-*/skill-manifest.yaml` metadata.
3. **Manifest-driven upgrade cleanup** (Phase 7) — Shipped pure `cleanup-planner.js` (`buildCleanupPlan` + `executeCleanupPlan`) with realpath containment under `.claude/` + `_gomad/`, BOM/CRLF-aware row parsing, `MANIFEST_CORRUPT` + `CORRUPT_ROW` classification, symlink-escape pre-throw logging, `--dry-run` flag, pre-cleanup backup snapshots under `_gomad/_backups/<timestamp>/`, v1.1→v1.2 legacy cleanup of `.claude/skills/gm-agent-*/`. Authored `docs/upgrade-recovery.md`. 223 Phase 7 assertions green.
4. **PRD + product-brief coding-agent refinement** (Phase 8) — Stripped human-founder framing from `gm-create-prd` steps 02b/02c/03/10 + residual sweep of 9 other steps. Installed `## Coding-Agent Consumer Mindset` section in `data/prd-purpose.md`. Step-09 now emits `FR-NN` functional requirements + Given/When/Then AC + explicit `## Out of Scope` section. Reworded "expert peer" → "product owner driving a coding-agent-built product" across 4 residual steps. Aligned `gm-product-brief` voice with all canonical guardrails preserved verbatim. Wired deterministic 97-assertion PRD chain integration test into `npm run quality`.
5. **Reference sweep + release** (Phase 9) — Full user-visible `gm-agent-*` → `gm:agent-*` sweep across source / docs (en + zh-cn) / tests / manifests / website; filesystem dir names and `skill-manifest.yaml name:` fields preserved as dash form (Windows-safe). Installed three regression gates (`test:orphan-refs`, `test:gm-surface` Phase C hard assertion, `verify-tarball.js` Phase 3 grep-clean) wired into `npm run quality` + `npm test`. Published `@xgent-ai/gomad@1.2.0` to npm with BREAKING-change callout; `v1.2.0` tag pushed to origin.

### Requirements: 32/32 complete (100%)

| Category | Count | Phases |
|----------|-------|--------|
| CMD (command migration) | 5 | Phase 5, 6 |
| REF (reference sweep)   | 5 | Phase 5, 9 |
| INSTALL (installer)     | 9 | Phase 6, 7 |
| PRD (content refinement) | 7 | Phase 8 |
| REL (release mechanics) | 6 | Phase 5, 9 |

See [milestones/v1.2-REQUIREMENTS.md](./milestones/v1.2-REQUIREMENTS.md) for full traceability.

### Known deferred items at close: 1

- Quick task `260416-j8h-fix-gm-agent-dev-skill` — work shipped 2026-04-16 (commit `1ff1a7b`); audit flagged 'missing' due to metadata frontmatter only (see STATE.md Deferred Items).

### Archives

- [milestones/v1.2-ROADMAP.md](./milestones/v1.2-ROADMAP.md) — full phase details
- [milestones/v1.2-REQUIREMENTS.md](./milestones/v1.2-REQUIREMENTS.md) — requirements traceability

---

## v1.1 — Rename & Rebrand

**Shipped:** 2026-04-18
**Phases:** 4 | **Plans:** 10 | **Timeline:** 2026-04-07 → 2026-04-18 (~12 days)
**Git tag:** `v1.1` (GSD milestone) / `v1.1.0` (npm release)
**npm:** [`@xgent-ai/gomad@1.1.0`](https://www.npmjs.com/package/@xgent-ai/gomad)

### Delivered

Transformed the raw BMAD Method fork into `@xgent-ai/gomad@1.1.0` — a lean, properly-credited, publishable package. `@xgent-ai/gomad@1.0.0` deprecated on npm with redirect to `@latest`.

### Key Accomplishments

1. **Package identity** — Renamed `bmad-method@6.2.2` → `@xgent-ai/gomad@1.1.0`, reset `package.json` metadata, collapsed `bin` to single `gomad` entry, renamed `bmad:*` scripts to `gomad:*`, dropped 3 unused dependencies, deleted dead `rebundle` script.
2. **Full rename** — ~41 `bmad-*` skill directories → `gm-*`, `bmm-skills/` → `gomad-skills/`, manifest prefix drop, CLI entry rename, idempotent content sweep across source/configs/tests/docs/website, test fixtures renamed.
3. **Slim-down** — ExternalModuleManager subsystem removed (3 source files + call sites), Vietnamese README deleted, 3 abandoned doc translations (`docs/cs/`, `docs/fr/`, `docs/vi-vn/`) deleted.
4. **Credit + legal** — `LICENSE` composed with byte-identical BMAD MIT preservation + GoMad copyright + non-affiliation disclaimer; `TRADEMARK.md` rewritten for nominative fair use; `CONTRIBUTORS.md` preserved byte-identical; canonical disclaimer reused verbatim across README/README_CN Credits sections.
5. **Branding + docs** — Hand-authored GoMad ASCII CLI banner (no figlet), `Wordmark.png` + favicon regenerated via committed sharp reproducibility script, Astro website stubbed as under-construction one-pager, bilingual (en + zh-cn) docs landing pages rewritten, 21 Phase 3 invariants all PASS.
6. **Verification + release** — `files` allowlist limits tarball to 320 shipped files, tarball verification script asserts no `bmad`/`bmm` residuals, E2E fresh-install test confirms all 52 `gm-*` skills loadable, `npm run quality` + tarball + E2E all exit 0, published to npm, v1.0.0 deprecated, `v1.1.0` tagged on main.

### Requirements: 36/36 complete (100%)

See [milestones/v1.1-REQUIREMENTS.md](./milestones/v1.1-REQUIREMENTS.md) for full traceability.

### Archives

- [milestones/v1.1-ROADMAP.md](./milestones/v1.1-ROADMAP.md) — full phase details
- [milestones/v1.1-REQUIREMENTS.md](./milestones/v1.1-REQUIREMENTS.md) — requirements traceability

---

*First milestone archived: 2026-04-18 (v1.1)*
*Second milestone archived: 2026-04-24 (v1.2)*
*Third milestone archived: 2026-04-27 (v1.3)*
