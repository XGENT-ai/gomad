# Roadmap: GoMad

## Milestones

- ✅ **v1.1 Rename & Rebrand** — Phases 1-4 (shipped 2026-04-18) — see [milestones/v1.1-ROADMAP.md](./milestones/v1.1-ROADMAP.md)
- 🚧 **v1.2 Agent-as-Command & Coding-Agent PRD Refinement** — Phases 5-9 (in progress)

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (5.1, 5.2): Urgent insertions (marked INSERTED) between integers

Decimal phases appear between their surrounding integers in numeric order.

<details>
<summary>✅ v1.1 Rename & Rebrand (Phases 1-4) — SHIPPED 2026-04-18</summary>

- [x] Phase 1: Foundation (2/2 plans) — completed 2026-04
- [x] Phase 2: Rename (3/3 plans) — completed 2026-04
- [x] Phase 3: Credit, Branding & Docs (2/2 plans) — completed 2026-04
- [x] Phase 4: Verification & Release (3/3 plans) — completed 2026-04-18

</details>

### 🚧 v1.2 Agent-as-Command & Coding-Agent PRD Refinement (In Progress)

**Milestone Goal:** Convert `gm-agent-*` skills into `/gm:agent-*` slash commands, make installs portable and upgrade-safe, and refocus PRD/product-brief artifacts on coding-agent consumers instead of human founders.

- [ ] **Phase 5: Foundations & Command-Surface Validation** — De-risk subdirectory namespace resolution, log launcher-pattern decision, fix PROJECT.md factual error, gitignore generated command output before any installer changes proceed
- [ ] **Phase 6: Installer Mechanics — Copy + Manifest + Stub Generation** — Swap symlink→copy, extend files-manifest.csv schema, revive agent-command-generator to produce `.claude/commands/gm/agent-*.md` launchers
- [ ] **Phase 7: Upgrade Safety — Manifest-Driven Cleanup** — Read prior manifest on re-install, realpath-contain each entry, back up + remove stale files, one-time v1.1 legacy path cleanup, dry-run flag
- [ ] **Phase 8: PRD + Product-Brief Content Refinement** — Strip human-founder framing from `gm-create-prd/steps-c/`, light pass on `gm-product-brief`, integration test preserving downstream PRD-pipeline compatibility
- [ ] **Phase 9: Reference Sweep + Verification + Release** — Migrate user-visible `gm-agent-*` → `gm:agent-*`, extend tarball verification, CHANGELOG with BREAKING callout, publish `@xgent-ai/gomad@1.2.0`, tag `v1.2.0`

## Phase Details

### Phase 5: Foundations & Command-Surface Validation
**Goal**: De-risk the load-bearing assumptions of v1.2 — verify `/gm:*` subdirectory namespace resolves on today's Claude Code, lock the launcher-vs-self-contained architecture decision, correct the `type: module` factual error in PROJECT.md, and prevent generated command output from polluting the dev repo — before any installer or content work begins.
**Depends on**: Nothing (first phase of v1.2)
**Requirements**: CMD-05, REF-03, REL-01
**Success Criteria** (what must be TRUE):
  1. A committed verification artifact (test, note, or recording) confirms that a file at `.claude/commands/<ns>/<cmd>.md` with `name: <ns>:<cmd>` frontmatter resolves as `/<ns>:<cmd>` on the current Claude Code version used by the team, OR a documented flat-name fallback plan (`/gm-agent-*`) is in place
  2. The launcher-vs-self-contained decision is logged in PROJECT.md Key Decisions (outcome: launcher — slash command loads persona from `_gomad/gomad/agents/*.md` at runtime, per user decision)
  3. `.gitignore` excludes `.claude/commands/gm/` (and any other installer-generated command paths under the dev repo) while keeping `.claude/commands/gsd/` tracked; `git status` in a clean worktree shows no generated command files
  4. PROJECT.md no longer claims the installer is `type: module` — language corrected to CommonJS with `require()`-based loading
**Plans**: 3 plans
- [x] 05-01-PLAN.md — Verification artifact (05-VERIFICATION.md citing gsd commands) + automated gm-command-surface test (CMD-05)
- [x] 05-02-PLAN.md — .gitignore narrow pattern for .claude/commands/gm/ + installer --self flag and self-install guard with test coverage (REF-03)
- [x] 05-03-PLAN.md — PROJECT.md factual correction (type: module → CommonJS) + launcher-form Key Decisions row (REL-01)

### Phase 6: Installer Mechanics — Copy + Manifest + Stub Generation
**Goal**: Ship the three tightly-coupled installer-internal changes as one coherent unit — copy-only install (unblocks stub generation), extended files-manifest.csv schema with `schema_version` (unblocks cleanup in Phase 7), and revived `agent-command-generator.js` that produces `.claude/commands/gm/agent-*.md` launchers for all 7 personas from existing `gm-agent-*/skill-manifest.yaml` metadata.
**Depends on**: Phase 5
**Requirements**: CMD-01, CMD-02, CMD-03, CMD-04, INSTALL-01, INSTALL-02, INSTALL-03, INSTALL-04
**Success Criteria** (what must be TRUE):
  1. `gomad install` into a fresh workspace produces 7 launcher files at `.claude/commands/gm/agent-{analyst,tech-writer,pm,ux-designer,architect,sm,dev}.md` — each with frontmatter `name: gm:agent-*` + a human-friendly description, each a thin launcher that delegates to `_gomad/gomad/agents/*.md` (not inlined, not self-contained)
  2. Installer uses `fs.copy` (never `fs.ensureSymlink`); `fs.lstat` pre-check unlinks any pre-existing symlink at the destination before copying; post-install `ls -la` on installed skill targets shows real files (`-rw-`), not symlinks (`lrwx`)
  3. `_gomad/_config/files-manifest.csv` exists after install, parses cleanly with `csv-parse` (no hand-rolled splitting), includes a `schema_version` field, and enumerates every installed path with columns `type,name,module,path,hash` — covering both `_gomad/`-internal paths and IDE-target paths (`.claude/commands/gm/*.md`, `.{ide}/skills/*`)
  4. `src/gomad-skills/.../gm-agent-*/` directories remain on disk as the unchanged source of truth (not moved, not duplicated); `manifest-generator.js:parseSkillMd`'s `skillMeta.name === dirName` assertion still passes
  5. Invoking `/gm:agent-pm` on a fresh install loads the John persona from `_gomad/gomad/agents/pm.md` (or equivalent path) and enters persona mode
**Plans**: 3 plans
- [x] 06-01-PLAN.md — Copy-only switch: replace fs.ensureSymlink with fs.copy in _config-driven.js + gated fs.lstat symlink-leftover unlink (INSTALL-01, INSTALL-02)
- [x] 06-02-PLAN.md — Manifest v2 schema: csv-parse/sync reader in installer.js + 7-column writer in manifest-generator.js with schema_version='2.0' + install_root + forward-slash paths (INSTALL-03, INSTALL-04)
- [x] 06-03-PLAN.md — Launcher generator revival: platform-codes.yaml launcher_target_dir + extended template body + AgentCommandGenerator.extractPersonas + writeAgentLaunchers + removeLegacyAgentSkillDirs + wire in installer.js + post-IDE manifest refresh (CMD-01, CMD-02, CMD-03, CMD-04)

### Phase 7: Upgrade Safety — Manifest-Driven Cleanup
**Goal**: Deliver the single highest-severity change in v1.2 — safe, reversible manifest-driven cleanup that removes stale files on re-install without ever deleting outside allowed install roots. Includes realpath containment, dual-format sniff for v1.1→v1.2 legacy cleanup, optional backup snapshotting, and a `--dry-run` flag so users can preview destructive actions before they happen.
**Depends on**: Phase 6 (cleanup has nothing to read until manifest v2 exists)
**Requirements**: INSTALL-05, INSTALL-06, INSTALL-07, INSTALL-08, INSTALL-09
**Success Criteria** (what must be TRUE):
  1. On re-install with a prior `files-manifest.csv` present, installer removes every stale entry (previously-installed path no longer in the new install set) before writing new files; idempotent second `gomad install` produces no change to disk
  2. Any manifest entry that fails realpath-containment under allowed install roots (`.claude/` and `_gomad/` relative to the target workspace) is refused with a clear error — absolute paths, `../` traversal, and symlink-escape attempts never cause a file outside the install roots to be touched
  3. First v1.2 install on a v1.1 workspace (no prior manifest) detects the legacy state and cleans known v1.1 artifact paths (`.claude/skills/gm-agent-*/`) explicitly; no orphan v1.1 skill directories remain after upgrade
  4. `gomad install --dry-run` prints the full cleanup + copy plan (paths to remove, paths to write, count summary) and exits without touching disk; running without `--dry-run` then performs the identical actions
  5. Before any destructive removal, files-to-be-removed are snapshotted into `_gomad/_backups/<timestamp>/` preserving relative-path structure; a documented recovery procedure restores from the backup
  6. A manifest corrupted with BOM, CRLF, quoted-field edge cases, or malformed rows does NOT cause mass-deletion — installer logs `MANIFEST_CORRUPT`, skips cleanup, and proceeds with idempotent install
**Plans**: 2 plans
- [x] 07-01-PLAN.md — Pure cleanup-planner module + manifest reader hardening (BOM/CORRUPT_ROW) + D-39 backup exclusion (INSTALL-05, INSTALL-06)
- [ ] 07-02-PLAN.md — Executor + --dry-run flag + v1.1 legacy cleanup + recovery docs + E2E tests (INSTALL-05, INSTALL-07, INSTALL-08, INSTALL-09)

### Phase 8: PRD + Product-Brief Content Refinement
**Goal**: Retune `gm-create-prd` and `gm-product-brief` for coding-agent consumers — strip human-founder framing (time windows, "why now?", business/operational metrics, persona demographics, go-to-market language), amplify aggressive vision + MVP scope, sharpen dev-ready requirement density (machine-verifiable acceptance criteria, stable REQ-IDs, explicit out-of-scope, feature boundaries). Refinement is strictly additive/stripping — structural sections consumed by `gm-validate-prd`, `gm-create-architecture`, `gm-create-epics-and-stories`, and `gm-check-implementation-readiness` are preserved so the downstream pipeline stays compatible without lockstep updates.
**Depends on**: Nothing within v1.2 (content-only work; parallelizable with Phases 5–7)
**Requirements**: PRD-01, PRD-02, PRD-03, PRD-04, PRD-05, PRD-06, PRD-07
**Success Criteria** (what must be TRUE):
  1. `gm-create-prd/steps-c/` step files 02b, 02c, 03, and 10 have all human-founder framing removed (no "why now?" prompt, no exec-summary-as-stakeholder-pitch, no ARR/CAC/LTV/DAU/retention metric asks, no business SLAs unrelated to code)
  2. The remaining `gm-create-prd/steps-c/` step files (01, 01b, 04, 05, 06, 07, 08, 09, 11, 12) have been read through end-to-end; any residual human-founder framing (time-window estimation, go-to-market language, persona demographics) is removed and documented in the plan's change log
  3. `gm-create-prd` content amplifies aggressive vision + MVP scope for coding-agent consumers (vision: 1-2 declarative sentences; MVP scope: bulleted boundary list; no elevator-pitch hedging) and sharpens dev-ready requirements (each requirement has stable REQ-ID, feature boundaries, machine-verifiable acceptance criteria, explicit out-of-scope)
  4. `gm-product-brief` receives a light pass: voice aligned with refined `gm-create-prd`, lingering human-founder framing in prompts and template stripped, existing scope discipline preserved
  5. An automated integration test runs `gm-create-prd` → `gm-validate-prd` → `gm-create-architecture` → `gm-create-epics-and-stories` on a sample project using the refined skills and all four exit successfully without "missing context" or validator-false-positive failures; `gm-check-implementation-readiness` reports alignment
  6. No changes are made to `gm-validate-prd`, `gm-create-architecture`, `gm-create-epics-and-stories`, or `gm-check-implementation-readiness` skills (structural compatibility preserved as scope-locked decision)
**Plans**: TBD

### Phase 9: Reference Sweep + Verification + Release
**Goal**: Migrate every user-visible `gm-agent-*` reference to the `gm:agent-*` command form across source, docs (en + zh-cn), tests, manifests, and the Astro website — while preserving filesystem directory names and `skill-manifest.yaml` `name:` fields (colons aren't Windows-safe; the `name: gm:agent-*` form lives only in the generated launcher stubs). Extend tarball verification to assert `.claude/commands/gm/` presence and legacy `.claude/skills/gm-agent-*` absence. Ship `@xgent-ai/gomad@1.2.0` with a prominent BREAKING CHANGELOG callout and tag `v1.2.0` on main.
**Depends on**: Phase 6, Phase 7, Phase 8 (all final strings and artifact shapes must be settled before the sweep migrates references to them)
**Requirements**: REF-01, REF-02, REF-04, REF-05, REL-02, REL-03, REL-04, REL-05, REL-06
**Success Criteria** (what must be TRUE):
  1. Every user-visible `gm-agent-*` reference across source (`gomad-skills/`, `core-skills/`, `tools/installer/`), docs (README, README_CN, `docs/en/`, `docs/zh-cn/`, the Astro website), tests + fixtures, and user-visible manifests (`module-help.csv`) is migrated to the `gm:agent-*` command form; historical planning artifacts (`.planning/`, old milestone docs) are left untouched as archived history
  2. Filesystem directory names (`src/gomad-skills/.../gm-agent-*/`) and `skill-manifest.yaml`/`SKILL.md` frontmatter `name: gm-agent-*` fields keep the dash — `manifest-generator.js:parseSkillMd`'s filesystem-validation assertion still passes; `npm run test:refs` is a regression gate that fails on any drift
  3. Tarball verification asserts `.claude/commands/gm/agent-{analyst,tech-writer,pm,ux-designer,architect,sm,dev}.md` present in fresh-install output AND legacy `.claude/skills/gm-agent-*/` absent; `npm run quality`, tarball verification, and E2E fresh-install all exit 0
  4. CHANGELOG entry for v1.2 includes a prominent BREAKING callout (agent invocation surface change: `gm-agent-*` skills → `/gm:agent-*` commands) with concrete upgrade guidance for v1.1-installed users
  5. `@xgent-ai/gomad@1.2.0` is published to npm with the `latest` dist-tag; `v1.1.0` is retained as a prior stable (no deprecation unless issues emerge)
  6. `v1.2.0` tag is applied on `main` and the milestone is marked complete
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 5 → 6 → 7 → 8 → 9. Phase 8 (content) is parallelizable with Phases 6–7 (installer); the roadmap enforces a linear execution to keep a single worker coherent, but `/gsd-plan-phase 8` may be executed out-of-order if desired.

| Phase                                              | Milestone | Plans Complete | Status      | Completed  |
| -------------------------------------------------- | --------- | -------------- | ----------- | ---------- |
| 1. Foundation                                      | v1.1      | 2/2            | Complete    | 2026-04    |
| 2. Rename                                          | v1.1      | 3/3            | Complete    | 2026-04    |
| 3. Credit, Branding & Docs                         | v1.1      | 2/2            | Complete    | 2026-04    |
| 4. Verification & Release                          | v1.1      | 3/3            | Complete    | 2026-04-18 |
| 5. Foundations & Command-Surface Validation        | v1.2      | 0/3            | Not started | -          |
| 6. Installer Mechanics — Copy + Manifest + Stubs   | v1.2      | 0/3            | Not started | -          |
| 7. Upgrade Safety — Manifest-Driven Cleanup        | v1.2      | 0/2            | Not started | -          |
| 8. PRD + Product-Brief Content Refinement          | v1.2      | 0/TBD          | Not started | -          |
| 9. Reference Sweep + Verification + Release        | v1.2      | 0/TBD          | Not started | -          |
