# Changelog

All notable changes to GoMad are documented in this file. This changelog starts
fresh at v1.1.0 and does not include the upstream BMAD Method history. See
[LICENSE](LICENSE) and [README.md](README.md#credits) for the fork's origin.

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
