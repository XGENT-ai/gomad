# Phase 2: Project-Local Install - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-07
**Phase:** 02-project-local-install
**Areas discussed:** Installer rewrite scope, CLI flag cleanup, package-skills.js fate, Source directory strategy

---

## Installer Rewrite Scope

### Backup/Restore System

| Option | Description | Selected |
|--------|-------------|----------|
| Strip entirely | Remove backupDir(), manifest tracking, and uninstall-via-restore. Git is the backup. | ✓ |
| Simplify to manifest-only | Keep .gomad-manifest.yaml listing what was installed, but remove timestamped backups. | |
| Keep manifest + confirmation | Keep manifest tracking and add confirmation prompt before overwriting. | |

**User's choice:** Strip entirely
**Notes:** Git handles versioning for project-local files.

### Rewrite Approach

| Option | Description | Selected |
|--------|-------------|----------|
| Rewrite from scratch | New clean file: ~100 lines vs current ~270. | ✓ |
| Gut and adapt | Keep file structure, remove backup code, change CLAUDE_DIR. | |
| You decide | Claude picks the approach. | |

**User's choice:** Rewrite from scratch

### File Naming

| Option | Description | Selected |
|--------|-------------|----------|
| Rename to installer.js | Clean name, matches pattern of other tools. | ✓ |
| Keep global-installer.js | Avoid churn in imports. | |
| Rename to project-installer.js | Explicit about what it does. | |

**User's choice:** Rename to installer.js

---

## CLI Flag Cleanup

### Sync Command

| Option | Description | Selected |
|--------|-------------|----------|
| Remove entirely | Delete sync command and sync-upstream.js. | ✓ |
| Repurpose for team sharing | Repurpose 'sync' to copy .claude/ config between projects. | |
| You decide | Claude handles it. | |

**User's choice:** Remove entirely

### Global Flags

| Option | Description | Selected |
|--------|-------------|----------|
| Remove all global flags | Remove --global-only, --global, --sync. Clean slate. | ✓ |
| Keep --sync, repurpose it | Repurpose --sync to mean 'sync from npm package assets'. | |
| You decide | Claude removes what's meaningless. | |

**User's choice:** Remove all global flags

### Update Command

| Option | Description | Selected |
|--------|-------------|----------|
| Keep update as alias | Users might expect 'gomad update' to work. Thin wrapper. | |
| Remove update command | Just re-run 'gomad install'. Less surface area. | ✓ |
| You decide | Claude picks based on CLI ergonomics. | |

**User's choice:** Remove update command

---

## package-skills.js Fate

### Remove or Keep

| Option | Description | Selected |
|--------|-------------|----------|
| Remove in Phase 2 | It reads from ~/.claude/ which violates INS-02. | |
| Defer to Phase 3 | It's primarily a BMAD concern. | |
| Remove global read, keep packaging | Rewrite to read from local source. | |

**User's choice:** Other — "read from ~/.claude/skills is fair, to know all skills exist in the system"

### Scope Clarification

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, exactly | INS-02 applies to install/uninstall operations only. | ✓ |
| No, all tools must be local | Even package-skills.js should not touch ~/.claude/. | |
| You decide | Claude interprets the requirement scope. | |

**User's choice:** Yes — "no global access applies to gomad related files, we don't install gomad files globally, but we can still have read access to the claude global folder to know the state of claude"

---

## Source Directory Strategy

### Asset Source

| Option | Description | Selected |
|--------|-------------|----------|
| Ship in npm package, copy to ./.claude/ | Assets bundled in gomad npm package. Works with npx. | ✓ |
| Keep global/ as staging | Same flow, target changes. Simple path swap. | |
| Inline assets directly | Generate .claude/ content on the fly from catalog metadata. | |

**User's choice:** Ship in npm package, copy to ./.claude/

### Directory Naming

| Option | Description | Selected |
|--------|-------------|----------|
| Keep global/ for now | Internal implementation detail. | |
| Rename to assets/ | Clearer intent — distributable assets. | ✓ |
| You decide | Claude picks based on clarity vs churn. | |

**User's choice:** Rename to assets/

### Merge Behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Merge (add/overwrite, don't delete) | Copy gomad assets alongside existing user files. Safe default. | ✓ |
| Clean install (replace target dirs) | Delete target dirs before copying. Clean but destructive. | |
| You decide | Claude picks safest approach. | |

**User's choice:** Merge

---

## Claude's Discretion

- Internal implementation of installer.js function signatures and error handling
- Order of operations for CLI command removal
- How uninstall identifies gomad assets vs user files
- Whether to update global/ references atomically or separately

## Deferred Ideas

None — discussion stayed within phase scope
