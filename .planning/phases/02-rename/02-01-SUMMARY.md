---
phase: 02-rename
plan: 01
subsystem: rename
tags: [rename, fs-migration, cli, installer]
requires: [bmm-skills tree at src/bmm-skills, bmad-cli.js CLI entry, bmad-skill-manifest.yaml reader, bmad-artifacts.js helper, docs/mobmad-plan.md stale artifact]
provides:
  - "src/gomad-skills/ top-level skill tree"
  - "tools/installer/gomad-cli.js CLI entry point"
  - "tools/installer/ide/shared/artifacts.js artifacts helper"
  - "skill-manifest.yaml and manifest.json filename convention"
  - "gm-* prefixed skill directories (41 total)"
affects:
  - "package.json bin/main point at gomad-cli.js"
  - "validate-skills.js NAME_REGEX now requires gm-* prefix"
  - "test/test-installation-components.js and test-install-to-bmad.js fixture filenames"
  - "agent-command-generator.js imports ./artifacts"
tech-stack:
  added: []
  patterns: ["rename-only commits for git blame preservation"]
key-files:
  created:
    - "src/gomad-skills/ (renamed from bmm-skills/)"
    - "tools/installer/gomad-cli.js (renamed from bmad-cli.js)"
    - "tools/installer/ide/shared/artifacts.js (renamed from bmad-artifacts.js)"
  modified:
    - "package.json (bin, main, scripts)"
    - "package-lock.json (bin)"
    - "tools/installer/ide/shared/skill-manifest.js (manifest filename)"
    - "tools/installer/ide/shared/path-utils.js (comment)"
    - "tools/installer/ide/shared/agent-command-generator.js (require path)"
    - "tools/installer/core/manifest-generator.js (comments)"
    - "tools/validate-skills.js (NAME_REGEX, WF_SKIP_SKILLS)"
    - "test/test-installation-components.js (fixture filenames)"
    - "test/test-install-to-bmad.js (fixture filenames)"
    - "47 SKILL.md and skill-manifest.yaml files (name: bmad-* -> gm-*)"
decisions:
  - "Updated validate-skills.js NAME_REGEX from ^bmad- to ^gm- as Rule-1 bug fix — validator was unchangingly enforcing bmad- prefix after the rename"
  - "Updated test fixtures to write skill-manifest.yaml literal — direct cascade from Task 1 skill-manifest.js reader change"
metrics:
  duration_minutes: ~10
  tasks_completed: 4
  commits: 5
  files_renamed: 53
  files_modified: 58
completed_date: "2026-04-08"
---

# Phase 02 Plan 01: Atomic File-system Rename Summary

Atomic filesystem handoff of FS-01 through FS-05: `bmm-skills/` tree rename, ~41 `bmad-*` skill directory renames to `gm-*`, manifest filename prefix drop, CLI entry rename (`bmad-cli.js` -> `gomad-cli.js`), artifacts helper rename, and deletion of `docs/mobmad-plan.md`.

## What Shipped

### Directory and file renames

- `src/bmm-skills/` -> `src/gomad-skills/` (FS-01)
- 11 `src/core-skills/bmad-*` -> `src/core-skills/gm-*` (FS-02 part 1)
- 30 `src/gomad-skills/**/bmad-*` -> `src/gomad-skills/**/gm-*` (FS-02 part 2)
- 6 `bmad-skill-manifest.yaml` -> `skill-manifest.yaml` (FS-03)
- 2 `bmad-manifest.json` -> `manifest.json` (FS-03)
- `tools/installer/bmad-cli.js` -> `tools/installer/gomad-cli.js` (FS-04)
- `tools/installer/ide/shared/bmad-artifacts.js` -> `tools/installer/ide/shared/artifacts.js` (FS-05)
- `docs/mobmad-plan.md` deleted (D-16)

### Reference updates

- `package.json`: `main` and `bin.gomad` now point at `gomad-cli.js`; scripts `gomad:install` / `gomad:uninstall` / `install:gomad` rewritten.
- `package-lock.json`: mirrored `bin.gomad` change.
- `tools/installer/ide/shared/skill-manifest.js`: reads `skill-manifest.yaml` instead of `bmad-skill-manifest.yaml`.
- `tools/installer/ide/shared/agent-command-generator.js`: requires `./artifacts` instead of `./bmad-artifacts`.
- `tools/installer/core/manifest-generator.js` and `path-utils.js`: updated doc comments referencing the old filename.
- 47 `SKILL.md` and `skill-manifest.yaml` files: frontmatter `name:` fields rewritten from `bmad-*` to `gm-*` so `parseSkillMd`'s name/directory-match rule holds.
- `tools/validate-skills.js`: `NAME_REGEX` updated from `^bmad-` to `^gm-`; `WF_SKIP_SKILLS` updated to `gm-agent-tech-writer`.

## Commits

| Task | Subject | SHA |
|------|---------|-----|
| 1 | refactor(02-01): atomic CLI + artifacts + manifest-filename handoff (FS-03/04/05) | `a4614ee` |
| 2 | `refactor(02-01): git mv core-skills/bmad-* to gm-* (FS-02 part 1)` | `b9a724e` |
| 3 | `refactor(02-01): git mv bmm-skills to gomad-skills, bmad-* to gm-*, drop bmad- manifest prefix (FS-01/02/03)` | `a9d5522` |
| 4 | refactor(02-01): update manifest id/name fields to gm-* (FS-02/D-10) | `3b04d3c` |
| 4b | test(02-01): update test fixtures to use skill-manifest.yaml (FS-03 fallout) | `68c01c3` |

Tasks 2 and 3 are pure `git mv` (rename-only) commits so git rename detection preserves `git log --follow` and `git blame` history across the ~41 skill directory renames.

## Plan-level gate state

- `npm run validate:skills` — PASSED (2 LOW findings: pre-existing time-estimate in gm-brainstorming, and gm-create-ux-design having 15 step files)
- `node tools/installer/gomad-cli.js --help` — exits 0
- `node test/test-installation-components.js` — 204/204 tests pass
- `find src -type d -name 'bmad-*'` — 0
- `find src -name 'bmad-skill-manifest.yaml' -o -name 'bmad-manifest.json'` — 0
- `tools/installer/bmad-cli.js`, `tools/installer/ide/shared/bmad-artifacts.js`, `docs/mobmad-plan.md` — all absent

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] validate-skills.js NAME_REGEX hardcoded bmad- prefix**

- **Found during:** Task 4 (manifest id/name update)
- **Issue:** `tools/validate-skills.js` line 45 had `NAME_REGEX = /^bmad-[a-z0-9]+(-[a-z0-9]+)*$/`, which would reject every renamed skill and break `validate:skills`.
- **Fix:** Updated regex to `/^gm-[a-z0-9]+(-[a-z0-9]+)*$/` and updated the `WF_SKIP_SKILLS` set entry `bmad-agent-tech-writer` to `gm-agent-tech-writer`.
- **Files modified:** `tools/validate-skills.js`
- **Commit:** `3b04d3c`

**2. [Rule 2 - Critical functionality] SKILL.md frontmatter name: fields were identifier form, not prose**

- **Found during:** Task 4
- **Issue:** Plan Task 4 language said "only update name if it's identifier form not a human-readable title". Every `SKILL.md` had `name: bmad-<dirname>` which `parseSkillMd` enforces must equal directory basename. Without an update, every renamed skill would fail collection with `SKILL.md name "bmad-foo" does not match directory name "gm-foo"`.
- **Fix:** Bulk-updated 47 SKILL.md and skill-manifest.yaml files via regex `^(name:\s+)bmad-` -> `\1gm-`.
- **Files modified:** 47 files across `src/core-skills/` and `src/gomad-skills/`
- **Commit:** `3b04d3c`

**3. [Rule 3 - Blocking issue] Test fixtures still wrote bmad-skill-manifest.yaml**

- **Found during:** Post-Task-4 pre-commit hook test run
- **Issue:** `test/test-installation-components.js` and `test/test-install-to-bmad.js` contained hardcoded `'bmad-skill-manifest.yaml'` string literals in fixture setup. Task 1 rewired `skill-manifest.js` to read `skill-manifest.yaml`, so one assertion (`Native type:agent SKILL.md dir appears in agents[] for agent metadata`) began failing because the manifest wasn't discovered.
- **Fix:** Replaced all occurrences of `bmad-skill-manifest.yaml` with `skill-manifest.yaml` in both test files.
- **Files modified:** `test/test-installation-components.js`, `test/test-install-to-bmad.js`
- **Commit:** `68c01c3`

### Architectural changes

None — all deviations were inline bug/blocking/correctness fixes.

## Known Stubs

None. All renamed directories, manifests, and reader consumers are fully wired.

## Scope Boundary Notes

- **Out of scope and left alone:** residual `bmad-method` string literal in `gomad-cli.js` (`packageName = 'bmad-method'`, the npm update-check URL), `BMAD Core CLI` description string, and `npx bmad-method install` message strings. These belong to the Plan 02 content sweep and do not affect FS-01..FS-05 acceptance.
- **Out of scope and left alone:** `docs/`, `website/`, `README.md`, `CHANGELOG.md`, `LICENSE`, `TRADEMARK.md` — all owned by later plans.
- **Out of scope and left alone:** `tools/installer/core/installer.js` `docs.bmad-method.org` link, `tools/installer/commands/uninstall.js` `npx bmad-method install` string, `tools/installer/install-messages.yaml` documentation URL — Plan 02 content sweep.

## Self-Check: PASSED

- `tools/installer/gomad-cli.js` exists
- `tools/installer/ide/shared/artifacts.js` exists
- `src/gomad-skills/` exists
- `tools/installer/bmad-cli.js` absent
- `tools/installer/ide/shared/bmad-artifacts.js` absent
- `src/bmm-skills/` absent
- `docs/mobmad-plan.md` absent
- Commits `a4614ee`, `b9a724e`, `a9d5522`, `3b04d3c`, `68c01c3` all present in `git log`
- `npm run validate:skills` exit 0
- `node tools/installer/gomad-cli.js --help` exit 0
- `node test/test-installation-components.js` 204/204 pass
