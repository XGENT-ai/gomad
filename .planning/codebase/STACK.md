# Technology Stack

**Analysis Date:** 2026-04-07

## Languages

**Primary:**
- JavaScript (Node.js) - Core CLI and tools, all executable code

**Secondary:**
- YAML - Configuration and catalog files (skills, agents, commands, hooks, presets)

## Runtime

**Environment:**
- Node.js >= 18.0.0

**Package Manager:**
- npm 8.x+ (inferred from package.json)
- Lockfile: `package-lock.json` present

## Frameworks

**Core CLI:**
- commander 13.1.0 - Command-line interface framework (`bin/mobmad-cli.js`)

**Interactive UI:**
- @clack/prompts 0.9.1 - Terminal UI for interactive selection (`tools/curator.js`)

**Data Processing:**
- yaml 2.7.1 - YAML parsing and stringification for catalog/config files
- fs-extra 11.3.0 - File system utilities for installation and sync operations

**Terminal Output:**
- chalk 5.4.1 - Colored terminal output for install status and messaging

## Key Dependencies

**Critical:**
- commander 13.1.0 - Powers all 7 CLI commands (install, curate, update, status, uninstall, package, sync, mcp)
- yaml 2.7.1 - Parses 5 catalog files (skills.yaml, agents.yaml, commands.yaml, hooks.yaml, presets.yaml) totaling 142+ skills and 48 agents
- @clack/prompts 0.9.1 - Interactive preset and item selection in `tools/curator.js`

**Infrastructure:**
- fs-extra 11.3.0 - Manages file operations for global installation to `~/.claude/` with timestamped backups
- chalk 5.4.1 - User-facing status messages during installation workflow

**Peer Dependency:**
- bmad-method ^6.x - BMAD-METHOD framework (required for module registration and integration)

## Configuration

**Environment:**
- No .env file — no environment variables required for runtime
- Secrets: MCP configs with API keys are explicitly NOT auto-installed (user must opt in via `mobmad mcp enable`)

**Build:**
- No build step — pure JavaScript modules (ESM)
- No transpilation required (Node.js 18+ has native ESM support)

## Installation & Deployment

**Entry Point:**
- `bin/mobmad-cli.js` - CLI executable registered in package.json as `bin.mobmad`
- Installed globally via `npm install -g mobmad` or locally via `npm install`

**Installation Process:**
1. User runs `npx mobmad install [--preset <name>]`
2. Calls `tools/global-installer.js` to install to `~/.claude/`
3. Creates timestamped backups of existing directories
4. Writes manifest to `~/.claude/.mobmad-manifest.yaml` for rollback tracking
5. Optional: Syncs project skills to `src/module/skills/` with BMAD-compatible manifests

**Platform Requirements:**

**Development:**
- Node.js >= 18.0.0
- npm (any recent version)
- BMAD-METHOD v6.x (to test module integration)

**Production:**
- Node.js >= 18.0.0
- ~500MB disk space (~400MB node_modules, rest for skills/agents/rules)
- Write access to `~/.claude/` for global asset installation

## Module System

**ESM Format:**
- All source files use `import` syntax (type: "module" in package.json)
- Uses `fileURLToPath` and `dirname` for __dirname in ESM context

**Exports:**
- CLI commands: Dynamic imports in `bin/mobmad-cli.js` load tools on demand
- Main tools exported as named functions: `curate()`, `install()`, `packageSkills()`, `syncUpstream()`

---

*Stack analysis: 2026-04-07*
