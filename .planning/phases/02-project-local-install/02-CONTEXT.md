# Phase 2: Project-Local Install - Context

**Gathered:** 2026-04-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Retarget all install/uninstall operations from `~/.claude/` (global) to `./.claude/` (project-local). Remove backup/restore system, sync command, and global-only flags. No code path should write gomad assets to the home directory. Reading `~/.claude/` for discovery purposes (e.g., package-skills.js reading available skills) remains allowed.

</domain>

<decisions>
## Implementation Decisions

### Installer Rewrite
- **D-01:** Strip backup/restore system entirely (backupDir, manifest tracking, timestamped backups) — git is the backup for project-local `.claude/`
- **D-02:** Rewrite `tools/global-installer.js` from scratch as `tools/installer.js` — clean ~100-line file with install, uninstall, status functions targeting `./.claude/`
- **D-03:** Rename file from `global-installer.js` to `installer.js` — matches pattern of other tools (curator.js, etc.)

### CLI Command Cleanup
- **D-04:** Remove `sync` command entirely — delete `tools/sync-upstream.js` and the sync command definition from `bin/gomad-cli.js`
- **D-05:** Remove `update` command — users re-run `gomad install` instead. Less surface area.
- **D-06:** Remove all global flags: `--global-only` from install, `--global` from uninstall, `--sync` from install. These are global-path concepts that no longer apply.

### package-skills.js
- **D-07:** Keep package-skills.js and the `package` CLI command — reading `~/.claude/skills/` is acceptable because it's a development/authoring tool discovering system state, not an install-time tool writing to global paths
- **D-08:** The "no global access" rule (INS-02) applies to **writes** of gomad assets only. Reading `~/.claude/` to discover Claude's state is explicitly allowed.

### Source Directory Strategy
- **D-09:** Assets ship bundled in the npm package. `gomad install` copies from the package's source directory to `./.claude/` in the current working directory.
- **D-10:** Rename the `global/` source directory to `assets/` — "global" is misleading now that nothing installs globally
- **D-11:** Install uses merge strategy — copy/overwrite gomad asset files into `./.claude/` without deleting existing non-gomad files. Safe default that preserves user customizations.

### Claude's Discretion
- Internal implementation of the new installer.js (function signatures, error handling flow)
- Order of operations for CLI command removal
- How uninstall identifies "gomad assets" vs user files in `./.claude/` (lockfile-based, pattern-based, etc.)
- Whether to update `global/` references in existing tests atomically with the rename or as a separate step

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` — INS-01 through INS-06 define exact install target requirements; TST-02 and TST-03 define test verification scope

### Phase 1 Context (predecessor)
- `.planning/phases/01-rename/01-CONTEXT.md` — Rename decisions that established the codebase state this phase builds on

### Key Source Files (to modify/remove)
- `tools/global-installer.js` — Primary rewrite target: install/uninstall/status with homedir() references
- `tools/sync-upstream.js` — To be deleted entirely (syncs from ~/.claude/)
- `bin/gomad-cli.js` — CLI command definitions: remove sync, update, global flags
- `tools/package-skills.js` — Kept as-is (reads ~/.claude/skills/ for discovery, not installation)

### Codebase Maps
- `.planning/codebase/ARCHITECTURE.md` — Installation flow documentation, data flow diagrams
- `.planning/codebase/STRUCTURE.md` — Full directory layout including global/ (to be renamed assets/)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `tools/curator.js` — Lockfile reading/writing logic is reusable; the installer needs to read the lockfile to know what to install
- `catalog/` YAML files — Data-driven asset selection remains unchanged; installer just changes the target path
- Preset resolution in curator.js — No changes needed; preset system is independent of install target

### Established Patterns
- Constants at module top (`CLAUDE_DIR`, `LOCKFILE_PATH`) — installer.js will define `CLAUDE_DIR = join(process.cwd(), '.claude')` instead of `join(homedir(), '.claude')`
- Dynamic imports in CLI (`await import('../tools/installer.js')`) — same pattern, new filename
- `collectFiles()` recursive file collector — can be simplified or reused for the merge-copy operation

### Integration Points
- `bin/gomad-cli.js` install command dispatches to `tools/global-installer.js` — must update import path to `tools/installer.js`
- `bin/gomad-cli.js` status/uninstall commands also dispatch to global-installer — same update
- `tools/curator.js` lockfile path uses `LOCKFILE_PATH` from same module — ensure lockfile stays at project root (not inside .claude/)
- Test file `test/test-installation.js` validates the install flow — must be updated for project-local paths

</code_context>

<specifics>
## Specific Ideas

- "No global writes" is the rule, but reading `~/.claude/` is fair game for discovering system state
- Clean break approach: rewrite installer from scratch rather than incremental surgery
- The `global/` to `assets/` rename makes the npm package structure self-documenting

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-project-local-install*
*Context gathered: 2026-04-07*
