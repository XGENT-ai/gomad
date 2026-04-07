# Architecture

**Analysis Date:** 2026-04-07

## Pattern Overview

**Overall:** Modular Content Distribution System with CLI Orchestration

mobmad is a Node.js-based CLI tool that packages curated BMAD-METHOD skills, agents, rules, hooks, and commands as a self-contained, installable BMAD external module. The architecture supports three independent but coordinated workflows: curation (interactive selection), packaging (manifest generation), and installation (deployment with rollback).

**Key Characteristics:**
- **Preset-based configuration** - Predefined skill bundles (full, full-stack, lean, enterprise, etc.) with inheritance and extension
- **Immutable operations** - All catalog operations read from immutable YAML sources, generate lockfiles, never mutate catalogs in place
- **Centralized data layer** - Single source of truth via catalog YAML files (skills, agents, commands, hooks)
- **Two-phase installation** - Separation of curation (interactive selection) from installation (file copying and backups)
- **Manifest tracking** - Timestamped backups and installation manifests enable safe rollback

## Layers

**CLI Entry Point:**
- Purpose: Parse commands, delegate to tools, handle user feedback
- Location: `bin/mobmad-cli.js`
- Contains: Commander command definitions, option parsing, action dispatching
- Depends on: `tools/` modules for implementation
- Used by: User terminal, CI/CD systems

**Data Layer (Catalogs):**
- Purpose: Define available skills, agents, commands, hooks and preset configurations
- Location: `catalog/` directory
  - `catalog/skills.yaml` - 142 skills with name, description, category, default_include
  - `catalog/agents.yaml` - 48 agents (33 global, 15 BMAD-specific) with scope
  - `catalog/commands.yaml` - 70 commands with descriptions
  - `catalog/hooks.yaml` - 36 hooks with type (PreToolUse, PostToolUse, Stop)
  - `catalog/presets.yaml` - 6 preset bundles with inheritance and extension rules
- Contains: Metadata objects, preset definitions, dependencies
- Depends on: None (pure data)
- Used by: All tools for selection, validation, and manifest generation

**Selection/Curation Layer:**
- Purpose: Interactive user selection of skills, agents, hooks from catalogs
- Location: `tools/curator.js`
- Contains:
  - `loadCatalog()` - Parse YAML catalogs
  - `resolvePreset()` - Recursive preset resolution with inheritance and extension
  - `interactiveSelection()` - @clack/prompts UI for toggling individual items
  - `writeLockfile()` - Persist selections to `mobmad.lock.yaml`
- Depends on: `catalog/`, `yaml` package, `@clack/prompts` UI
- Used by: CLI `curate` command

**Packaging Layer:**
- Purpose: Generate BMAD-compatible skill manifests and copy skills into module
- Location: `tools/package-skills.js`
- Contains:
  - `parseSkillMd()` - Extract frontmatter and metadata from SKILL.md files
  - `packageSkill()` - Copy skill dir, create bmad-skill-manifest.yaml
  - `packageSkills()` - Batch process all selected skills from lockfile
- Depends on: `~/.claude/skills/` source, catalog metadata, `src/module/skills/` target
- Used by: CLI `package` command

**Synchronization Layer:**
- Purpose: Mirror selected content from `~/.claude/` into project `global/` for packaging
- Location: `tools/sync-upstream.js`
- Contains:
  - `resolvePreset()` - Determine which items to sync based on lockfile
  - `syncAssets()` - Copy rules, hooks, agents, commands from `~/.claude/` to `global/`
- Depends on: Lockfile selections, upstream `~/.claude/` directories
- Used by: CLI `sync` command

**Installation Layer:**
- Purpose: Deploy curated content to `~/.claude/` with backup and manifest tracking
- Location: `tools/global-installer.js`
- Contains:
  - `backupDir()` - Create timestamped backup before overwriting
  - `collectFiles()` - Recursively collect file paths for manifest
  - `installFiles()` - Copy files from source to target with mkdirSync
  - `install()` - Main flow: load lockfile → backup existing → copy assets → write manifest
  - `uninstallGlobal()` - Restore from timestamped backup
  - `status()` - Display installed manifest
- Depends on: `global/` source, `~/.claude/` target, lockfile
- Used by: CLI `install`, `update`, `uninstall`, `status` commands

**Module Definition:**
- Purpose: Define BMAD module metadata and installation configuration
- Location: `src/module/module.yaml`
- Contains: Module code (`mob`), description, configuration prompts (skill_preset, install_global_assets), post-install notes
- Used by: BMAD framework during module resolution

**Module Registry:**
- Purpose: Register all packaged skills for BMAD help system
- Location: `src/module/module-help.csv`
- Contains: Per-skill entries with menu codes, descriptions, phase assignments, output locations
- Used by: `bmad-help` command for skill discoverability

**Testing Layer:**
- Purpose: Validate catalog integrity, preset resolution, module structure, installation flow
- Location: `test/test-*.js` files
- Contains:
  - `test-catalogs.js` - 9 tests for catalog format, required fields, uniqueness
  - `test-presets.js` - 8 tests for preset resolution and cross-references
  - `test-module.js` - 6 tests for module.yaml and CSV format
  - `test-installation.js` - 7 tests for curation → packaging → installation flow
- Depends on: Node.js built-in `test` module, catalogs, tools
- Used by: `npm test` runner (35 tests total, ~600ms)

## Data Flow

**Curation → Lockfile Flow:**

1. User invokes `mobmad curate` or `mobmad install`
2. `curator.js` loads `catalog/presets.yaml`, `skills.yaml`, `agents.yaml`, `commands.yaml`, `hooks.yaml`
3. If preset specified: `resolvePreset()` recursively merges preset selections (handling inheritance, additional_*, include_all)
4. Interactive UI presents toggles for each skill/agent/command/hook
5. User confirms selection
6. `writeLockfile()` persists selections to `mobmad.lock.yaml` with selections array per asset type

**Packaging Flow:**

1. User invokes `mobmad package`
2. `package-skills.js` reads lockfile to get selected skills
3. For each skill:
   - Load source from `~/.claude/skills/{name}/`
   - Parse SKILL.md frontmatter for name/description
   - Copy entire directory to `src/module/skills/{name}/`
   - Generate `bmad-skill-manifest.yaml` with canonicalId (`mob-{name}`), module (`mob`), metadata
4. Output: skill directories under `src/module/skills/` ready for BMAD installation

**Synchronization Flow:**

1. User runs `mobmad sync` to populate `global/` from user's `~/.claude/`
2. `sync-upstream.js` reads lockfile
3. For each asset type (rules, commands, hooks, agents):
   - Read selected items from lockfile
   - Copy from `~/.claude/{type}/` to `global/{type}/`
4. Output: `global/` populated with user's selected upstream content, ready for packaging into module

**Installation Flow:**

1. User invokes `mobmad install` or `mobmad update`
2. `global-installer.js` reads `mobmad.lock.yaml` to determine what was selected
3. For each asset directory in `global/` (rules, commands, hooks, agents):
   - Call `backupDir()` to create timestamped backup of existing `~/.claude/{type}/`
   - Call `installFiles()` to copy from `global/{type}/` to `~/.claude/{type}/`
   - Collect file paths for manifest
4. Write `.mobmad-manifest.yaml` to `~/.claude/` listing all installed files with timestamps
5. Display post-install notes
6. Uninstall flow: restore from timestamped backup, clean up manifest

**Module Installation (via BMAD):**

1. User runs `npx bmad-method install --modules mob` or selects mob during BMAD setup
2. BMAD framework:
   - Reads `src/module/module.yaml` for configuration
   - Prompts for skill_preset and install_global_assets using module.yaml config
   - Executes mobmad install internally
   - Skills in `src/module/skills/` are installed as BMAD-compatible modules
   - Module entries from `module-help.csv` appear in `bmad-help` system

**State Management:**

- **Transient state**: Current curation UI state (in memory during interactive session)
- **Persistent state**: 
  - `mobmad.lock.yaml` - User's last selection (skills, agents, commands, hooks arrays)
  - `~/.claude/.mobmad-manifest.yaml` - Installation manifest with file paths and timestamps
  - Timestamped backups: `~/.claude/rules.mobmad-backup-2026-04-07T13-51-30`, etc.

## Key Abstractions

**Preset:**
- Purpose: Named bundle of skills, agents, commands, hooks with inheritance
- Examples: `full`, `full-stack`, `lean`, `enterprise`, `bmad-enhanced`
- Pattern: YAML object with optional `extend` field for inheritance, `include_all` boolean, arrays of item names, `additional_*` fields for merging

**Catalog Entry:**
- Purpose: Metadata for a single skill/agent/command/hook
- Examples: `{ name: "coding-standards", description: "...", category: "language", default_include: true }`
- Pattern: Flat object with required name, description, and type-specific fields (scope for agents, type for hooks)

**Skill Module:**
- Purpose: Encapsulation of a packaged skill with BMAD manifest
- Location: `src/module/skills/{name}/`
- Contents: SKILL.md (with frontmatter), bmad-skill-manifest.yaml, content files
- Pattern: Directory matching `{name}` with manifest defining canonicalId, module, metadata

**Installation Manifest:**
- Purpose: Audit trail of what was installed, when, and where for safe rollback
- Location: `~/.claude/.mobmad-manifest.yaml`
- Pattern: YAML with asset_type sections listing file paths and installation timestamps

## Entry Points

**CLI (mobmad-cli.js):**
- Location: `bin/mobmad-cli.js`
- Triggers: `npm run curate`, `npx mobmad install`, user terminal invocation
- Responsibilities: 
  - Parse command (install, curate, package, sync, status, update, uninstall, mcp)
  - Extract options (--preset, --global-only, --yes, --global)
  - Dispatch to appropriate tool module
  - Display results and post-install notes

**BMAD Module (module.yaml):**
- Location: `src/module/module.yaml`
- Triggers: `npx bmad-method install --modules mob` or BMAD framework during setup
- Responsibilities:
  - Define module code (`mob`), name, description
  - Configure interactive prompts for skill_preset and install_global_assets
  - Set post-install messages based on user choices

**NPM Scripts:**
- `npm test` - Run test suite (35 tests)
- `npm run curate` - Interactive skill/agent/hook selection
- `npm run lint` - Run ESLint

## Error Handling

**Strategy:** Fail fast with descriptive messages, roll back on critical failures

**Patterns:**

1. **Catalog Loading Errors:**
   - If YAML parse fails: throw Error with file path
   - If required fields missing: throw Error listing missing field + entry name
   - Example: `throw new Error('Unknown preset: ${presetName}')`

2. **Installation Errors:**
   - If target directory cannot be created: catch mkdirSync error, wrap with context
   - If file copy fails: log failed paths, continue with next file (partial install captured in manifest)
   - If backup fails: warn user, proceed anyway (manifest will show backupPath: null)

3. **Selection Errors:**
   - If selected skill/agent doesn't exist in catalog: throw Error (invalid lockfile or catalog mismatch)
   - If preset references missing items: throw Error (corrupt preset definition)

4. **Manifest Errors:**
   - If `.mobmad-manifest.yaml` corrupt: warn, start fresh (no safe rollback available)
   - If backup path doesn't exist during uninstall: warn, skip restore (files already gone)

## Cross-Cutting Concerns

**Logging:** 
- Uses `chalk` for colored terminal output (success in green, error in red, info in cyan)
- Patterns: `console.log(chalk.green('✓ Installed...'))`, `console.error(chalk.red('✗ Error...'))`
- No persistent logs (all console to stdout/stderr)

**Validation:**
- Catalogs validated via tests: required fields (name, description, category, default_include)
- Presets validated via tests: item references exist in catalog
- Module structure validated: module.yaml has code, skills have SKILL.md + manifest
- All validation in test suite, no runtime schema checking (fail at test time, not install time)

**Authentication:**
- No authentication in mobmad itself
- MCP server credentials (API keys) are explicitly NOT auto-installed
- User must manually enable MCP configs via `mobmad mcp enable <name>`

**Immutability:**
- All catalog operations read-only (no modification to `.yaml` files)
- Selections stored in separate lockfile, never merge into catalogs
- Skill directories copied, never symlinked (independent instances per install)
- Backups created before any overwrite operation

---

*Architecture analysis: 2026-04-07*
