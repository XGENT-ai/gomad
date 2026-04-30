# Changelog

All notable changes to GoMad are documented in this file. This changelog starts
fresh at v1.1.0 and does not include the upstream BMAD Method history. See
[LICENSE](LICENSE) and [README.md](README.md#credits) for the fork's origin.

## [1.3.1] - 2026-04-30

### Summary

Patch release. Adds an `argument-hint` field to the `gm-domain-skill` SKILL.md
frontmatter so callers see the expected `<domain_slug> [query]` signature, and
introduces a developer-side `CLAUDE.md` template with `<!-- gomad:start -->` /
`<!-- gomad:end -->` fence markers so future gomad releases can replace just the
gomad-managed block in each developer's local `CLAUDE.md` without disturbing
custom content outside the fence.

### Added

- `argument-hint: "<domain_slug> [query]"` in
  `src/gomad-skills/4-implementation/gm-domain-skill/SKILL.md` frontmatter —
  surfaces the skill's expected argument shape to callers. Convention follows
  `.claude/commands/gsd/quick.md`: angle brackets for required, square brackets
  for optional.
- Project-root `CLAUDE.md` template containing the gomad behavioral-guidelines
  block (Think Before Coding / Simplicity First / Surgical Changes / Goal-Driven
  Execution) wrapped by `<!-- gomad:start -->` / `<!-- gomad:end -->` fence
  markers. The fence is the upgrade contract: future gomad versions can regex-
  replace the block in each developer's local `CLAUDE.md` while leaving content
  outside the fence intact. `CLAUDE.md` remains gitignored per existing project
  policy (alongside `.ai/*`, `cursor`, `.gemini`) — this is a local developer
  affordance, not a shipped runtime change.

### Changed

- (none)

### Removed

- (none)

## [1.3.0] - 2026-04-27

### Summary

v1.3.0 ships the docs/story-creation/relocation milestone. Persona body files
relocate from `<installRoot>/_gomad/gomad/agents/` to
`<installRoot>/_gomad/_config/agents/`. The `gm-discuss-story` and
`gm-domain-skill` skills land under `4-implementation/`, two seed KB packs
ship at `<installRoot>/_gomad/_config/kb/`, and initial docs content goes
live at `gomad.xgent.ai`. v1.2 → v1.3 upgrades are handled automatically by
the cleanup planner with backup snapshots.

### Added

- `gm-discuss-story` skill (`src/gomad-skills/4-implementation/gm-discuss-story/`) — pre-story context-gathering with locked output sections.
- `gm-domain-skill` (`src/gomad-skills/4-implementation/gm-domain-skill/`) — hand-rolled BM25-style retrieval with Levenshtein typo fallback.
- `src/domain-kb/testing/` and `src/domain-kb/architecture/` — seed KB packs with attribution frontmatter (`source`, `license`, `last_reviewed`).
- `tools/validate-kb-licenses.js` — release gate for KB attribution.
- `tools/validate-doc-paths.js` — DOCS-07 linter forbidding legacy `_gomad/gomad/agents/` paths in shipped docs.
- `tools/verify-tarball.js` Phase 4 — grep-clean for residual `gomad/agents/` references in shipped source (allowlisted via `tools/fixtures/tarball-grep-allowlist.json`).
- `test/test-domain-kb-install.js`, `test/test-legacy-v12-upgrade.js`, `test/test-v13-agent-relocation.js` — new E2E test coverage.
- `prepublishOnly` script gating publish on the full `quality` matrix.
- Initial docs content at `gomad.xgent.ai` (English + Simplified Chinese): tutorials/install, tutorials/quick-start, reference/agents, reference/skills, explanation/architecture, how-to/contributing.
- `docs/upgrade-recovery.md` — new "v1.2 → v1.3 recovery" section with rollback recipe.

### Changed

- Persona body install path: `<installRoot>/_gomad/gomad/agents/<shortName>.md` → `<installRoot>/_gomad/_config/agents/<shortName>.md`.
- Launcher stubs (`/gm:agent-*`) now reference `_gomad/_config/agents/`; regenerated unconditionally on every install.
- `tools/installer/core/cleanup-planner.js` — new `isV12LegacyAgentsDir` detector + parallel branch in `buildCleanupPlan` that snapshots and removes the 8 legacy persona files (reason `manifest_cleanup`).
- `tools/installer/core/installer.js` — `detectCustomFiles` whitelist treats the 8 known persona `.md` files at `_config/agents/` as generated (preserves `.customize.yaml` user-override semantics).
- `npm run quality` matrix extended with `validate:doc-paths`, `test:gm-surface`, `test:tarball`, `test:domain-kb-install`, `test:legacy-v12-upgrade`, `test:v13-agent-relocation`.
- `tools/installer/ide/shared/path-utils.js` — new `AGENTS_PERSONA_SUBPATH` and `LEGACY_AGENTS_PERSONA_SUBPATH` constants as the sole source of truth for the persona subpath.

### Removed

- (none — v1.2 → v1.3 is a relocation, not a removal)

### BREAKING CHANGES

The 8 persona body files have moved from
`<installRoot>/_gomad/gomad/agents/<shortName>.md` to
`<installRoot>/_gomad/_config/agents/<shortName>.md`.

Upgrading from v1.2.0: run `gomad install` in your existing v1.2 workspace.
The installer will:

1. Snapshot the old `_gomad/gomad/agents/` files into
   `_gomad/_backups/<YYYYMMDD-HHMMSS>/_gomad/gomad/agents/`.
2. Remove the old files from `_gomad/gomad/agents/`.
3. Write the new files at `_gomad/_config/agents/<shortName>.md`.
4. Regenerate launcher stubs (`/gm:agent-*`) to point at the new location.

A verbose migration banner prints during the upgrade naming the relocation,
the backup location, and the recovery doc cross-reference.

If `/gm:agent-pm` (or any persona) invocation fails after upgrade, see
[`docs/upgrade-recovery.md`](./docs/upgrade-recovery.md#v12-v13-recovery)
for the rollback recipe (re-pin v1.2 globally → restore from snapshot →
re-run `gomad install`).

If you scripted the literal path `_gomad/gomad/agents/`, update to
`_gomad/_config/agents/`. Your `.customize.yaml` files at `_config/agents/`
are preserved across the upgrade.

## [1.2.0] - 2026-04-23

### Summary

v1.2.0 completes the agent-surface migration: the 7 `gm-agent-*` personas ship
as `/gm:agent-*` slash commands at `.claude/commands/gm/agent-*.md` instead of
`.claude/skills/gm-agent-*/` skills. Installer now copies (never symlinks),
writes a file manifest, and performs manifest-driven cleanup on re-install with
snapshot-then-remove safety. Fresh-install and v1.1→v1.2 upgrade paths are
both covered by automated tests. Verification gates catch `gm-agent-` leakage
in shipped content and install output. PRD + product-brief skills have been
retuned for coding-agent consumers (human-founder framing stripped).

### Added

- `.claude/commands/gm/agent-<name>.md` launcher stubs for the 7 agent
  personas (analyst, tech-writer, pm, ux-designer, architect, sm, dev),
  generated at install time from each `gm-agent-*/skill-manifest.yaml`.
- `_gomad/_config/files-manifest.csv` — manifest v2 schema with
  `schema_version`, `type`, `name`, `module`, `path`, `hash` columns;
  installer reads + writes with `csv-parse`.
- Manifest-driven cleanup on re-install: realpath-contained under `.claude/`
  and `_gomad/` install roots, snapshot-then-remove with backups at
  `_gomad/_backups/<timestamp>/`, `--dry-run` flag for preview.
- First v1.2 install on a v1.1 workspace explicitly cleans legacy
  `.claude/skills/gm-agent-*/` directories.
- `test/test-orphan-refs.js` + `test/fixtures/orphan-refs/allowlist.json`:
  dedicated regression gate for `gm-agent-` reference drift.
- `tools/verify-tarball.js` Phase 3 grep-clean pass for `gm-agent-` residuals
  in shipped content (narrow allowlist at
  `tools/fixtures/tarball-grep-allowlist.json`).
- `test/test-gm-command-surface.js` Phase C: hard assertion on all 7
  `.claude/commands/gm/agent-*.md` launcher files + negative assertion on
  `.claude/skills/gm-agent-*/` absence.

### Changed

- Installer switched from `fs.ensureSymlink` to `fs.copy`; pre-copy
  `fs.lstat` check unlinks pre-existing symlinks to prevent v1.1→v1.2
  source-tree pollution.
- Cross-skill invokes in `gm-sprint-agent/workflow.md` and
  `gm-epic-demo-story/SKILL.md` now reference `/gm:agent-*` slash commands
  instead of `gm-agent-*` skills (dropped "via the Skill tool" clause).
- `src/gomad-skills/module-help.csv` source rows carry user-visible colon
  form (`gm:agent-tech-writer`) directly; installer no longer transforms at
  merge time.
- `gm-create-prd` + `gm-product-brief` content refined for coding-agent
  consumers: human-founder framing (ARR/CAC/LTV/DAU, "why now?",
  go-to-market language, persona demographics) stripped; aggressive vision
  + MVP scope amplified; dev-ready requirements sharpened (stable REQ-IDs,
  machine-verifiable acceptance criteria, explicit out-of-scope).
- `PROJECT.md` line-78 factual correction: installer is CommonJS (not
  `type: module`).

### Removed

- `.claude/skills/gm-agent-*/` skill directories — no longer installed;
  cleaned up on upgrade from v1.1.
- `toUserVisibleAgentId` / `fromUserVisibleAgentId` helpers in
  `tools/installer/core/installer.js` — no-op after source/emit alignment.

### BREAKING CHANGES

The 7 `gm-agent-*` skill personas are no longer installed as
`.claude/skills/gm-agent-*/` skills — they ship as `/gm:agent-*` slash
commands at `.claude/commands/gm/agent-*.md`. Upgrading from v1.1.0: run
`gomad install` to regenerate; the installer auto-removes legacy
`.claude/skills/gm-agent-*/` directories (see Phase 7 upgrade-safety) and
writes the new command stubs. If you scripted `/gm-agent-*` invocations
(pre-v1.2 dash-form), update to `/gm:agent-*` (colon-form).

## [1.1.0] - 2026-04-09

### Summary

v1.1.0 re-bases `@xgent-ai/gomad` as a hard fork of BMAD Method.
`@xgent-ai/gomad@1.0.0` (a Claude Code skills installer, wrong product direction)
is deprecated on npm.

### Added

- Hard fork of BMAD Method as the new baseline for `@xgent-ai/gomad`.
- `gomad` CLI binary at `tools/installer/gomad-cli.js`.
- `src/gomad-skills/` four-phase workflow (1-analysis → 2-plan-workflows →
  3-solutioning → 4-implementation) inherited from BMAD Method.
- `src/core-skills/gm-*` shared infrastructure skills.
- LICENSE with preserved BMAD MIT notice and appended GoMad copyright block.
- TRADEMARK.md with GoMad defensive posture.

### Changed

- Package name: `@xgent-ai/gomad@1.0.0` → `@xgent-ai/gomad@1.1.0`.
- All skill prefixes: `bmad-*` → `gm-*`.
- Module directory: `src/bmm-skills/` → `src/gomad-skills/`.

### Removed

- All BMAD Method upstream changelog entries (v6.2.2 and earlier). Lineage is
  preserved via LICENSE, README Credits, and this entry.
- `banner-bmad-method.png` (no replacement banner).
- `README_VN.md`, `docs/cs/`, `docs/fr/`, `docs/vi-vn/`.
- External modules manifest and consumer code.
- `SECURITY.md`, `AGENTS.md` (BMAD governance boilerplate not retained).

### BREAKING CHANGES

Nothing from `@xgent-ai/gomad@1.0.0` carries forward. v1.1.0 is effectively a
new product reusing the package name. If you installed `@xgent-ai/gomad@1.0.0`,
uninstall it before upgrading.

### Version numbering note

Version numbers reset: BMAD Method's upstream versioning (v6.x) is unrelated to
`@xgent-ai/gomad`'s versioning (1.x). See LICENSE and Credits for origin.
