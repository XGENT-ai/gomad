# GOMAD

## What This Is

GOMAD (GOMAD Orchestration Method for Agile Development) is a Node.js CLI tool that curates and installs Claude Code skills, agents, rules, hooks, and commands into a project's `.claude/` directory. It packages 142+ skills, 48 agents, 77 rules, 70 commands, and 36 hooks with interactive selection via presets or individual curation. Previously called "mobmad" and tied to BMAD-METHOD — now being rebranded as a standalone tool with project-local-only installation.

## Core Value

One command (`npx gomad install`) gives any project a curated, project-local Claude Code environment without touching the user's global config.

## Requirements

### Validated

- ✓ YAML-based catalog system (skills, agents, commands, hooks, presets) — existing
- ✓ Interactive curation with @clack/prompts — existing
- ✓ Preset-based selection with inheritance — existing
- ✓ Lockfile tracking of selections — existing
- ✓ CLI with commander.js (install, curate, update, status, uninstall, package, sync, mcp) — existing
- ✓ 35 unit tests with vitest — existing

### Active

- [ ] Rename all references from mobmad to gomad (package.json, CLI binary, lock file, manifest, internal code, docs)
- [ ] Change install target from ~/.claude/ (global) to ./.claude/ (project-local)
- [ ] Remove BMAD-METHOD peer dependency and module registration system
- [ ] Keep existing BMAD agents as regular agents (strip BMAD integration layer)
- [ ] Remove backup/restore system (git is the backup for project-local .claude/)
- [ ] Rename mobmad.lock.yaml to gomad.lock.yaml
- [ ] Rename .mobmad-manifest.yaml to .gomad-manifest.yaml
- [ ] Remove sync-upstream.js (no longer syncing from ~/.claude/)
- [ ] Remove package-skills.js BMAD manifest generation (keep skill copying)
- [ ] Update all tests to reflect new name and project-local behavior
- [ ] Publish to private npm registry as gomad

### Out of Scope

- Global installation to ~/.claude/ — core design change, project-local only
- Template export/import across projects — each project runs `gomad install` independently
- BMAD-METHOD integration — dropping peer dependency entirely
- Backup/restore on install — git handles this for project-local files
- Public npm publication — private registry only

## Context

- Existing codebase is functional as mobmad with BMAD-METHOD integration
- The CLI, catalog system, curation UI, and test suite are solid foundations
- Primary changes are: rename, retarget install path, strip BMAD coupling
- The global-installer.js needs the most rework (home dir → project dir, remove backup logic)
- The sync-upstream.js and package-skills.js tools become unnecessary
- Node.js >= 18, ESM modules, no build step

## Constraints

- **Tech stack**: Node.js, keep existing dependencies (commander, @clack/prompts, yaml, fs-extra, chalk)
- **Compatibility**: Must work with Claude Code's .claude/ directory structure
- **Registry**: Publish to private npm (not public)
- **No global writes**: Must not write anything to ~/ or $HOME directories

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Drop BMAD-METHOD dependency | Stand alone as gomad, simpler install, no external framework needed | — Pending |
| Project-local only (./.claude/) | Users want isolated, reproducible project configs without polluting global state | — Pending |
| Keep BMAD agents as regular agents | Agents are useful regardless of BMAD framework | — Pending |
| No backup system | Project .claude/ is git-tracked, git provides history | — Pending |
| Private npm publish | Internal distribution only | — Pending |

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
*Last updated: 2026-04-07 after initialization*
