# Milestones: GoMad

Historical record of shipped versions.

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
