# Requirements: GoMad v1.2 — Agent-as-Command & Coding-Agent PRD Refinement

**Defined:** 2026-04-18
**Core Value:** A lean, properly-credited fork of BMAD Method that we own end-to-end and can extend with our own agents/skills.

## v1.2 Requirements

### CMD — Agent → Slash Command Migration

- [ ] **CMD-01**: Launcher files `.claude/commands/gm/agent-{analyst,tech-writer,pm,ux-designer,architect,sm,dev}.md` are generated at install time from each `gm-agent-*/skill-manifest.yaml`
- [ ] **CMD-02**: Launcher file frontmatter (`name: gm:agent-*`) resolves as `/gm:agent-*` when invoked from Claude Code (subdirectory → colon namespace)
- [ ] **CMD-03**: Launcher is a thin stub that loads the persona from `_gomad/gomad/agents/*.md` at runtime — not self-contained, not inlined
- [ ] **CMD-04**: `gm-agent-*/` skill directories remain in `src/gomad-skills/` as the source of truth — not moved, not duplicated
- [ ] **CMD-05**: Subdirectory slash-command namespace (`/gm:*`) resolution is verified on current Claude Code before installer changes proceed; a flat-name fallback (`/gm-agent-*`) is documented but not built unless the subdirectory form fails

### INSTALL — Copy-Only Installer with Manifest-Driven Upgrade

- [ ] **INSTALL-01**: Installer always copies (never symlinks); the `fs.ensureSymlink` call in `tools/installer/ide/_config-driven.js` is replaced with `fs.copy`
- [ ] **INSTALL-02**: Before copy, `fs.lstat` checks the destination; any existing symlink is unlinked to prevent source-tree pollution on v1.1→v1.2 upgrade
- [ ] **INSTALL-03**: Installer writes `_gomad/_config/files-manifest.csv` listing every path it created, with a `schema_version` field and columns for `type,name,module,path,hash`
- [ ] **INSTALL-04**: CSV parsing and writing use `csv-parse` (existing dep), not hand-rolled string splitting
- [ ] **INSTALL-05**: On re-install, the installer reads the prior manifest, realpath-contains each entry under allowed install roots (`.claude/` and `_gomad/` under the target workspace), and `fs.remove`s stale entries before writing new ones
- [ ] **INSTALL-06**: Entries that escape allowed install roots (absolute paths, `../`, symlink traversal) are refused with a clear error; no deletion happens outside install roots
- [ ] **INSTALL-07**: First v1.2 install on a v1.1 workspace (no prior manifest present) cleans known legacy v1.1 artifact paths (`.claude/skills/gm-agent-*/`) explicitly
- [ ] **INSTALL-08**: Installer offers a `--dry-run` flag that prints the planned cleanup + copy actions without touching disk
- [ ] **INSTALL-09**: Before destructive cleanup, installer snapshots files-to-be-removed into `_gomad/_backups/<timestamp>/` so the operation is reversible

### REF — Reference Sweep

- [ ] **REF-01**: Every user-visible `gm-agent-*` identifier across source (`gomad-skills/`, `core-skills/`, `tools/installer/`), docs (README, README_CN, `docs/`, website), tests + fixtures, and manifests is updated to the `gm:agent-*` command form
- [ ] **REF-02**: Filesystem directory names (`src/gomad-skills/*/gm-agent-*/`) keep the dash — colons are not Windows-safe; the sweep only updates user-visible references, not filesystem entries
- [ ] **REF-03**: Generated launcher stubs (produced by the installer into a target `.claude/commands/gm/`) are excluded from the dev-repo via `.gitignore` and confirmed absent from `git status`
- [ ] **REF-04**: `manifest-generator.js:parseSkillMd` and any other filesystem-validation code that asserts `skillMeta.name === dirName` is not broken by the sweep
- [ ] **REF-05**: README, README_CN, `docs/` (en + zh-cn), and the Astro website show the new `/gm:agent-*` invocation form in all user-facing examples

### PRD — Coding-Agent-Oriented Content Refinement

- [ ] **PRD-01**: `gm-create-prd/steps-c/` step-02b ("Why now?" challenge), step-02c (exec summary), step-03 (business metrics), and step-10 (operational / nonfunctional metrics portions) have human-founder framing removed
- [ ] **PRD-02**: Remaining `gm-create-prd/steps-c/` files (01, 01b, 04-09, 11, 12) are read through; any other human-founder framing (time-window estimation, go-to-market language, persona demographics) is removed
- [ ] **PRD-03**: `gm-create-prd` content amplifies aggressive vision + MVP scope for coding-agent consumers — since coding agents ship faster than human devs, the prompt pushes scope up, not down
- [ ] **PRD-04**: `gm-create-prd` sharpens dev-ready requirements: feature boundaries, machine-verifiable acceptance criteria, stable REQ-IDs, explicit out-of-scope
- [ ] **PRD-05**: `gm-product-brief` gets a light pass removing parallel human-founder framing; template voice aligned with the refined `gm-create-prd`
- [ ] **PRD-06**: Refinement is strictly additive/stripping — structural sections read by downstream skills (`gm-validate-prd`, `gm-create-architecture`, `gm-create-epics-and-stories`, `gm-check-implementation-readiness`) are preserved
- [ ] **PRD-07**: An integration test confirms a refactored PRD still passes `gm-validate-prd` and produces valid input to `gm-create-architecture` and `gm-create-epics-and-stories`

### REL — Release Mechanics

- [ ] **REL-01**: PROJECT.md line-78 `type: module` factual error is corrected — the installer is CommonJS
- [ ] **REL-02**: CHANGELOG entry for v1.2 includes an explicit BREAKING callout (agent invocation surface change) with upgrade guidance for v1.1-installed users
- [ ] **REL-03**: Tarball verification is extended to assert `.claude/commands/gm/` stub presence and legacy `.claude/skills/gm-agent-*` absence in fresh-install output
- [ ] **REL-04**: `npm run quality`, tarball verification, and E2E fresh-install all exit 0 before publish
- [ ] **REL-05**: `@xgent-ai/gomad@1.2.0` is published to npm with the `latest` dist-tag; `v1.1.0` is kept as a prior stable (no deprecation unless issues emerge)
- [ ] **REL-06**: `v1.2.0` tag is applied on `main`

## Future Requirements

Deferred beyond v1.2. Tracked but not in current roadmap.

### Custom Agents & Skills

- **CUSTOM-01**: New gomad-specific agents added to `src/gomad-skills/` or `src/core-skills/`
- **CUSTOM-02**: New gomad-specific skills integrated into the `1-analysis` → `4-implementation` workflow
- **CUSTOM-03**: Agent/skill documentation and installer support for new additions

### Stretch Command Surface

- **CMD-F1**: Task-skill → slash-command aliases (e.g., `/gm:create-prd`, `/gm:product-brief`) — currently task skills stay as skills only
- **REL-F1**: Backup rotation / pruning policy for `_gomad/_backups/<timestamp>/` — first-pass keeps all snapshots on disk

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature                                                                                                           | Reason                                                                                               |
| ----------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Downstream-skill refactors (`gm-validate-prd`, `gm-create-architecture`, `gm-create-epics-and-stories`, `gm-check-implementation-readiness`) | User decision: PRD refinement is strip-only; downstream skills preserve structural compatibility |
| Task skills becoming slash commands                                                                               | User scoped v1.2 narrowly — only the 7 `gm-agent-*` personas                                         |
| BMAD upstream sync                                                                                                | GoMad is a hard fork, not a continuously-merged downstream (PROJECT.md decision)                     |
| `.claude/skills/` retained for agents                                                                             | Agents explicitly move to `.claude/commands/gm/` only; no dual-publishing                            |
| Touching `bmad-method` on npm                                                                                     | Owned by BMAD's authors (PROJECT.md Out of Scope)                                                    |
| Reworking bmm workflow internals                                                                                  | Structural workflow stays as-is (PROJECT.md Out of Scope)                                            |
| GitHub Pages deployment                                                                                           | Deferred until project stabilizes (PROJECT.md Out of Scope)                                          |
| v1.0.0 rewrite / unpublish                                                                                        | v1.0.0 stays deprecated, not removed (PROJECT.md Out of Scope)                                       |

## Traceability

Which phases cover which requirements. Populated during roadmap creation (2026-04-18).

| Requirement | Phase    | Status  |
| ----------- | -------- | ------- |
| CMD-01      | Phase 6  | Pending |
| CMD-02      | Phase 6  | Pending |
| CMD-03      | Phase 6  | Pending |
| CMD-04      | Phase 6  | Pending |
| CMD-05      | Phase 5  | Pending |
| INSTALL-01  | Phase 6  | Pending |
| INSTALL-02  | Phase 6  | Pending |
| INSTALL-03  | Phase 6  | Pending |
| INSTALL-04  | Phase 6  | Pending |
| INSTALL-05  | Phase 7  | Pending |
| INSTALL-06  | Phase 7  | Pending |
| INSTALL-07  | Phase 7  | Pending |
| INSTALL-08  | Phase 7  | Pending |
| INSTALL-09  | Phase 7  | Pending |
| REF-01      | Phase 9  | Pending |
| REF-02      | Phase 9  | Pending |
| REF-03      | Phase 5  | Pending |
| REF-04      | Phase 9  | Pending |
| REF-05      | Phase 9  | Pending |
| PRD-01      | Phase 8  | Pending |
| PRD-02      | Phase 8  | Pending |
| PRD-03      | Phase 8  | Pending |
| PRD-04      | Phase 8  | Pending |
| PRD-05      | Phase 8  | Pending |
| PRD-06      | Phase 8  | Pending |
| PRD-07      | Phase 8  | Pending |
| REL-01      | Phase 5  | Pending |
| REL-02      | Phase 9  | Pending |
| REL-03      | Phase 9  | Pending |
| REL-04      | Phase 9  | Pending |
| REL-05      | Phase 9  | Pending |
| REL-06      | Phase 9  | Pending |

**Coverage:**

- v1.2 requirements: 32 total
- Mapped to phases: 32 (100%)
- Unmapped: 0

**Per-phase count:**

| Phase   | Name                                             | Requirements | Count |
| ------- | ------------------------------------------------ | ------------ | ----- |
| Phase 5 | Foundations & Command-Surface Validation         | CMD-05, REF-03, REL-01 | 3 |
| Phase 6 | Installer Mechanics — Copy + Manifest + Stubs    | CMD-01, CMD-02, CMD-03, CMD-04, INSTALL-01, INSTALL-02, INSTALL-03, INSTALL-04 | 8 |
| Phase 7 | Upgrade Safety — Manifest-Driven Cleanup         | INSTALL-05, INSTALL-06, INSTALL-07, INSTALL-08, INSTALL-09 | 5 |
| Phase 8 | PRD + Product-Brief Content Refinement           | PRD-01, PRD-02, PRD-03, PRD-04, PRD-05, PRD-06, PRD-07 | 7 |
| Phase 9 | Reference Sweep + Verification + Release         | REF-01, REF-02, REF-04, REF-05, REL-02, REL-03, REL-04, REL-05, REL-06 | 9 |

---

*Requirements defined: 2026-04-18*
*Last updated: 2026-04-18 — traceability populated after ROADMAP.md creation (5 phases, 32/32 mapped)*
