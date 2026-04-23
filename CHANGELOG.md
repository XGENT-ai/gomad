# Changelog

All notable changes to GoMad are documented in this file. This changelog starts
fresh at v1.1.0 and does not include the upstream BMAD Method history. See
[LICENSE](LICENSE) and [README.md](README.md#credits) for the fork's origin.

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
