<!-- GSD:project-start source:PROJECT.md -->
## Project

**GOMAD**

GOMAD (GOMAD Orchestration Method for Agile Development) is a Node.js CLI tool that curates and installs Claude Code skills, agents, rules, hooks, and commands into a project's `.claude/` directory. It packages 142+ skills, 48 agents, 77 rules, 70 commands, and 36 hooks with interactive selection via presets or individual curation. Previously called "mobmad" and tied to BMAD-METHOD — now being rebranded as a standalone tool with project-local-only installation.

**Core Value:** One command (`npx gomad install`) gives any project a curated, project-local Claude Code environment without touching the user's global config.

### Constraints

- **Tech stack**: Node.js, keep existing dependencies (commander, @clack/prompts, yaml, fs-extra, chalk)
- **Compatibility**: Must work with Claude Code's .claude/ directory structure
- **Registry**: Publish to private npm (not public)
- **No global writes**: Must not write anything to ~/ or $HOME directories
<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->
## Technology Stack

## Languages
- JavaScript (Node.js) - Core CLI and tools, all executable code
- YAML - Configuration and catalog files (skills, agents, commands, hooks, presets)
## Runtime
- Node.js >= 18.0.0
- npm 8.x+ (inferred from package.json)
- Lockfile: `package-lock.json` present
## Frameworks
- commander 13.1.0 - Command-line interface framework (`bin/mobmad-cli.js`)
- @clack/prompts 0.9.1 - Terminal UI for interactive selection (`tools/curator.js`)
- yaml 2.7.1 - YAML parsing and stringification for catalog/config files
- fs-extra 11.3.0 - File system utilities for installation and sync operations
- chalk 5.4.1 - Colored terminal output for install status and messaging
## Key Dependencies
- commander 13.1.0 - Powers all 7 CLI commands (install, curate, update, status, uninstall, package, sync, mcp)
- yaml 2.7.1 - Parses 5 catalog files (skills.yaml, agents.yaml, commands.yaml, hooks.yaml, presets.yaml) totaling 142+ skills and 48 agents
- @clack/prompts 0.9.1 - Interactive preset and item selection in `tools/curator.js`
- fs-extra 11.3.0 - Manages file operations for global installation to `~/.claude/` with timestamped backups
- chalk 5.4.1 - User-facing status messages during installation workflow
- bmad-method ^6.x - BMAD-METHOD framework (required for module registration and integration)
## Configuration
- No .env file — no environment variables required for runtime
- Secrets: MCP configs with API keys are explicitly NOT auto-installed (user must opt in via `mobmad mcp enable`)
- No build step — pure JavaScript modules (ESM)
- No transpilation required (Node.js 18+ has native ESM support)
## Installation & Deployment
- `bin/mobmad-cli.js` - CLI executable registered in package.json as `bin.mobmad`
- Installed globally via `npm install -g mobmad` or locally via `npm install`
- Node.js >= 18.0.0
- npm (any recent version)
- BMAD-METHOD v6.x (to test module integration)
- Node.js >= 18.0.0
- ~500MB disk space (~400MB node_modules, rest for skills/agents/rules)
- Write access to `~/.claude/` for global asset installation
## Module System
- All source files use `import` syntax (type: "module" in package.json)
- Uses `fileURLToPath` and `dirname` for __dirname in ESM context
- CLI commands: Dynamic imports in `bin/mobmad-cli.js` load tools on demand
- Main tools exported as named functions: `curate()`, `install()`, `packageSkills()`, `syncUpstream()`
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

## Naming Patterns
- PascalCase for utility/module files: `global-installer.js`, `package-skills.js`
- kebab-case for CLI and tool scripts: `mobmad-cli.js`, `curator.js`, `sync-upstream.js`
- Consistent naming structure for utilities: `[purpose]-[type].js`
- Test files use pattern: `test-[feature].js` in `test/` directory
- camelCase for function names: `resolvePreset()`, `loadCatalog()`, `backupDir()`, `collectFiles()`
- Exported functions use camelCase: `export async function curate()`, `export function syncUpstream()`
- Verb-first naming for functions with side effects: `installFiles()`, `saveManifest()`, `packageSkill()`
- Getter/parser functions: `loadCatalog()`, `loadManifest()`, `parseSkillMd()`
- camelCase for local variables: `skillCatalog`, `agentCatalog`, `targetDir`, `backupPath`
- Constants (immutable values) in UPPERCASE: `MAX_STDIN`, `CLAUDE_DIR`, `LOCKFILE_PATH`, `PROJECT_ROOT`
- Set and Map operations use plural nouns: `const groups = {}`, `const codes = []`
- Prefix boolean values: `existsSync()`, `default_include`, `install_to_bmad`
- JSDoc parameters documented with @param annotations in utility functions
- Object shape documentation when complex: `@param {{ firstName: string, lastName: string }} user`
- Return type documentation with @returns when it aids clarity
- Generic catalog types extracted: `skills`, `agents`, `commands`, `hooks`
## Code Style
- No explicit formatter configured (no `.eslintrc`, `.prettierrc` found)
- Implicit style: 2-space indentation, no semicolons at line ends (optional in modules)
- Import statements grouped: `fs` operations, then path utilities, then npm packages
- Multiline statements indent subsequent lines naturally
- ESLint available via `npm run lint` but no project-specific config file
- npm script defined in `package.json`: `"lint": "npx eslint ."`
- ES6 modules (`.js` files with `type: "module"` in `package.json`)
- Top imports: filesystem, path utilities, `fileURLToPath`
- `__filename` and `__dirname` computed from `import.meta.url` in every module
- Immediate constants (paths) computed at module load time
- Functions grouped by purpose (load → transform → install → manifest)
- Helper functions before main export
- JSDoc blocks above functions that need clarification
- No class-based patterns observed; functional, procedural approach
## Import Organization
- None detected; all paths use `join(__dirname, ...)` or relative `join(PROJECT_ROOT, ...)`
- Projects compute `PROJECT_ROOT` as `dirname(dirname(__filename))` pattern
- Dynamic imports used for lazy loading tools: `const { install } = await import('../tools/global-installer.js')`
- Only used when functionality is optional or deferred
## Error Handling
- Try-catch used for JSON/YAML parsing: `try { parseYaml(...) } catch { return null }`
- Sync operations with error suppression for optional paths: `try { const entries = readdirSync(dir) } catch { return null }`
- Validation-first approach: check `existsSync()` before operations
- Early returns with null on optional failures: `if (!match) return null`
- Explicit error throwing for critical failures: `throw new Error('Unknown preset: ${presetName}')`
- Process stderr used for warning/diagnostic output: `process.stderr.write()`
- Timeout enforcement on spawned processes: `timeout: 30000`, `timeout: 15000`
- Backups created before destructive operations: `backupDir()` creates timestamped backups
- File operations fail-safe: existing targets removed before copy (`rmSync` + `cpSync`)
- Manifest tracking for rollback capability
## Logging
- `console.log()` for status updates: `console.log('Updating mobmad...')`
- `chalk` used for colored output: `chalk.bold()`, `chalk.red()`, `chalk.green()`
- Process stderr for diagnostic logging: `process.stderr.write()` in hooks
- Status line reporting with summaries: counts of files installed
- Warnings logged to stderr, status to stdout (separation of concerns)
- Tool initialization and completion: `console.log(chalk.bold('\nmobmad sync...\n'))`
- File counts and summaries: `chalk.green(results)` for success
- Errors and warnings: `chalk.red('No lockfile found')`
- Structured output for CLI readability
## Comments
- JSDoc blocks on exported functions with complex parameters
- Inline comments explaining non-obvious logic (preset resolution, recursive file collection)
- Section dividers for major blocks: `// ── stdin entry point ────────────────────`
- Clarification of purpose above main export function
- Used selectively for functions with parameters or complex return values
- @param and @returns documentation for public functions
- @deprecated or phase notes: `// Phase 6 — not yet implemented`
- Parameter shapes documented with inline type objects in comments
- Module-level comments above main export: `/** Interactive skill/agent/hook selector...`
- Purpose and return value documented for major utility functions
- Options documented inline: `@param {object} options - { preset?: string, yes?: boolean }`
## Function Design
- Functions stay under 50 lines except for main loop functions (resolvePreset, installGlobal)
- Extracted helpers for repeated patterns: `backupDir()`, `collectFiles()`, `installFiles()`
- Utilities organized for readability: parse → validate → transform → write
- Single object parameter for options: `function curate(options = {})`
- Destructure from options: `const { preset, yes } = options`
- Spread operators used for immutable updates: `[...base.skills, ...result.skills]`
- Early parameter validation before use
- Objects for complex returns: `{ synced: 0 }`, `{ status: 'missing', reason: '...' }`
- Arrays for collections: returned from `collectFiles()`, parsed catalog items
- Null for "not found" cases: `if (!existsSync(...)) return null`
- Promises for async operations: `async function install(options) { ... }`
## Module Design
- Single main export per module: `export async function curate()`, `export function syncUpstream()`
- Helper functions kept internal (no export) unless reused
- Modules are self-contained tools: curator handles curation, installer handles installation
- Not used; imports reference specific module paths: `import { curate } from '../tools/curator.js'`
- Top-level entry: `bin/mobmad-cli.js` dynamically imports submodules
## Immutability
- Spread operator for set union: `[...new Set([...base.skills, ...result.skills])]`
- Explicit object construction instead of mutation: `{ ...item, updated: true }`
- Array concatenation instead of push: `files.push(...collectFiles(...))`
- Lockfile/manifest written fresh (not mutated in-place)
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

## Pattern Overview
- **Preset-based configuration** - Predefined skill bundles (full, full-stack, lean, enterprise, etc.) with inheritance and extension
- **Immutable operations** - All catalog operations read from immutable YAML sources, generate lockfiles, never mutate catalogs in place
- **Centralized data layer** - Single source of truth via catalog YAML files (skills, agents, commands, hooks)
- **Two-phase installation** - Separation of curation (interactive selection) from installation (file copying and backups)
- **Manifest tracking** - Timestamped backups and installation manifests enable safe rollback
## Layers
- Purpose: Parse commands, delegate to tools, handle user feedback
- Location: `bin/mobmad-cli.js`
- Contains: Commander command definitions, option parsing, action dispatching
- Depends on: `tools/` modules for implementation
- Used by: User terminal, CI/CD systems
- Purpose: Define available skills, agents, commands, hooks and preset configurations
- Location: `catalog/` directory
- Contains: Metadata objects, preset definitions, dependencies
- Depends on: None (pure data)
- Used by: All tools for selection, validation, and manifest generation
- Purpose: Interactive user selection of skills, agents, hooks from catalogs
- Location: `tools/curator.js`
- Contains:
- Depends on: `catalog/`, `yaml` package, `@clack/prompts` UI
- Used by: CLI `curate` command
- Purpose: Generate BMAD-compatible skill manifests and copy skills into module
- Location: `tools/package-skills.js`
- Contains:
- Depends on: `~/.claude/skills/` source, catalog metadata, `src/module/skills/` target
- Used by: CLI `package` command
- Purpose: Mirror selected content from `~/.claude/` into project `global/` for packaging
- Location: `tools/sync-upstream.js`
- Contains:
- Depends on: Lockfile selections, upstream `~/.claude/` directories
- Used by: CLI `sync` command
- Purpose: Deploy curated content to `~/.claude/` with backup and manifest tracking
- Location: `tools/global-installer.js`
- Contains:
- Depends on: `global/` source, `~/.claude/` target, lockfile
- Used by: CLI `install`, `update`, `uninstall`, `status` commands
- Purpose: Define BMAD module metadata and installation configuration
- Location: `src/module/module.yaml`
- Contains: Module code (`mob`), description, configuration prompts (skill_preset, install_global_assets), post-install notes
- Used by: BMAD framework during module resolution
- Purpose: Register all packaged skills for BMAD help system
- Location: `src/module/module-help.csv`
- Contains: Per-skill entries with menu codes, descriptions, phase assignments, output locations
- Used by: `bmad-help` command for skill discoverability
- Purpose: Validate catalog integrity, preset resolution, module structure, installation flow
- Location: `test/test-*.js` files
- Contains:
- Depends on: Node.js built-in `test` module, catalogs, tools
- Used by: `npm test` runner (35 tests total, ~600ms)
## Data Flow
- **Transient state**: Current curation UI state (in memory during interactive session)
- **Persistent state**: 
## Key Abstractions
- Purpose: Named bundle of skills, agents, commands, hooks with inheritance
- Examples: `full`, `full-stack`, `lean`, `enterprise`, `bmad-enhanced`
- Pattern: YAML object with optional `extend` field for inheritance, `include_all` boolean, arrays of item names, `additional_*` fields for merging
- Purpose: Metadata for a single skill/agent/command/hook
- Examples: `{ name: "coding-standards", description: "...", category: "language", default_include: true }`
- Pattern: Flat object with required name, description, and type-specific fields (scope for agents, type for hooks)
- Purpose: Encapsulation of a packaged skill with BMAD manifest
- Location: `src/module/skills/{name}/`
- Contents: SKILL.md (with frontmatter), bmad-skill-manifest.yaml, content files
- Pattern: Directory matching `{name}` with manifest defining canonicalId, module, metadata
- Purpose: Audit trail of what was installed, when, and where for safe rollback
- Location: `~/.claude/.mobmad-manifest.yaml`
- Pattern: YAML with asset_type sections listing file paths and installation timestamps
## Entry Points
- Location: `bin/mobmad-cli.js`
- Triggers: `npm run curate`, `npx mobmad install`, user terminal invocation
- Responsibilities: 
- Location: `src/module/module.yaml`
- Triggers: `npx bmad-method install --modules mob` or BMAD framework during setup
- Responsibilities:
- `npm test` - Run test suite (35 tests)
- `npm run curate` - Interactive skill/agent/hook selection
- `npm run lint` - Run ESLint
## Error Handling
## Cross-Cutting Concerns
- Uses `chalk` for colored terminal output (success in green, error in red, info in cyan)
- Patterns: `console.log(chalk.green('✓ Installed...'))`, `console.error(chalk.red('✗ Error...'))`
- No persistent logs (all console to stdout/stderr)
- Catalogs validated via tests: required fields (name, description, category, default_include)
- Presets validated via tests: item references exist in catalog
- Module structure validated: module.yaml has code, skills have SKILL.md + manifest
- All validation in test suite, no runtime schema checking (fail at test time, not install time)
- No authentication in mobmad itself
- MCP server credentials (API keys) are explicitly NOT auto-installed
- User must manually enable MCP configs via `mobmad mcp enable <name>`
- All catalog operations read-only (no modification to `.yaml` files)
- Selections stored in separate lockfile, never merge into catalogs
- Skill directories copied, never symlinked (independent instances per install)
- Backups created before any overwrite operation
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, or `.github/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
