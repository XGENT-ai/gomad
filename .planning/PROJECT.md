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
- ✓ 35 unit tests with node --test — existing

### Active

- [x] Rename all references from mobmad to gomad — Validated in Phase 1: Rename
- [x] Change install target from ~/.claude/ (global) to ./.claude/ (project-local) — Validated in Phase 2: Project-Local Install
- [x] Remove BMAD-METHOD peer dependency and module registration system — Validated in Phase 3: BMAD Decoupling
- [x] Keep existing BMAD agents as regular agents (strip BMAD integration layer) — Validated in Phase 3: BMAD Decoupling
- [x] Remove backup/restore system (git is the backup for project-local .claude/) — Validated in Phase 2: Project-Local Install
- [x] Rename mobmad.lock.yaml to gomad.lock.yaml — Validated in Phase 1: Rename
- [x] Rename .mobmad-manifest.yaml to .gomad-manifest.yaml — Validated in Phase 1: Rename
- [x] Remove sync-upstream.js (no longer syncing from ~/.claude/) — Validated in Phase 2: Project-Local Install
- [x] Remove package-skills.js BMAD manifest generation (keep skill copying) — Validated in Phase 3: BMAD Decoupling
- [x] Update all tests to reflect new name and project-local behavior — Validated in Phase 1 and Phase 4
- [x] Publish to public npm as @xgent-ai/gomad — Package configured in Phase 4: Publish and Verify (manual `npm publish` deferred to post-merge)

### Out of Scope

- Global installation to ~/.claude/ — core design change, project-local only
- Template export/import across projects — each project runs `gomad install` independently
- BMAD-METHOD integration — dropping peer dependency entirely
- Backup/restore on install — git handles this for project-local files

## Current State (post-v1.0)

- Standalone Node.js CLI shipped as `@xgent-ai/gomad@1.0.0` (configured for public npm publish; manual `npm publish` deferred until scope ownership confirmed)
- Project-local installer writes to `./.claude/` only — no `~/` or `$HOME` writes anywhere in the codebase
- BMAD-METHOD peer dependency fully removed; former BMAD agents preserved as regular Claude Code agents
- 5 runtime dependencies: `commander`, `@clack/prompts`, `yaml`, `fs-extra`, `chalk`
- 28 tests via `node --test` (~1.5s), including a hermetic E2E publish test that packs the tarball and installs into a throwaway consumer dir
- Documentation set complete: `README.md`, `docs/ARCHITECTURE.md`, `CONFIGURATION.md`, `GETTING-STARTED.md`, `DEVELOPMENT.md`, `TESTING.md`
- Node.js >= 18, ESM modules, no build step

## Next Milestone Goals

To be defined via `/gsd-new-milestone`. Likely candidates:

- Resolve deferred human gates: actual `npm publish` + post-publish smoke test
- README head cleanup (replace stale pre-rebrand content flagged by VERIFY block)
- User feedback iteration based on real consumers

## Constraints

- **Tech stack**: Node.js, keep existing dependencies (commander, @clack/prompts, yaml, fs-extra, chalk)
- **Compatibility**: Must work with Claude Code's .claude/ directory structure
- **Registry**: Publish to public npm as @xgent-ai/gomad
- **No global writes**: Must not write anything to ~/ or $HOME directories

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Drop BMAD-METHOD dependency | Stand alone as gomad, simpler install, no external framework needed | ✓ Implemented in Phase 3 |
| Project-local only (./.claude/) | Users want isolated, reproducible project configs without polluting global state | ✓ Implemented in Phase 2 |
| Keep BMAD agents as regular agents | Agents are useful regardless of BMAD framework | ✓ Implemented in Phase 3 |
| No backup system | Project .claude/ is git-tracked, git provides history | ✓ Implemented in Phase 2 |
| Public npm publish as @xgent-ai/gomad | Standalone tool, broad distribution | ✓ Configured in Phase 4 (manual publish deferred) |

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
*Last updated: 2026-04-08 after v1.0 milestone (MVP — Standalone gomad) shipped*
