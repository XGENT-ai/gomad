# Coding Conventions

**Analysis Date:** 2026-04-07

## Naming Patterns

**Files:**
- PascalCase for utility/module files: `global-installer.js`, `package-skills.js`
- kebab-case for CLI and tool scripts: `mobmad-cli.js`, `curator.js`, `sync-upstream.js`
- Consistent naming structure for utilities: `[purpose]-[type].js`
- Test files use pattern: `test-[feature].js` in `test/` directory

**Functions:**
- camelCase for function names: `resolvePreset()`, `loadCatalog()`, `backupDir()`, `collectFiles()`
- Exported functions use camelCase: `export async function curate()`, `export function syncUpstream()`
- Verb-first naming for functions with side effects: `installFiles()`, `saveManifest()`, `packageSkill()`
- Getter/parser functions: `loadCatalog()`, `loadManifest()`, `parseSkillMd()`

**Variables:**
- camelCase for local variables: `skillCatalog`, `agentCatalog`, `targetDir`, `backupPath`
- Constants (immutable values) in UPPERCASE: `MAX_STDIN`, `CLAUDE_DIR`, `LOCKFILE_PATH`, `PROJECT_ROOT`
- Set and Map operations use plural nouns: `const groups = {}`, `const codes = []`
- Prefix boolean values: `existsSync()`, `default_include`, `install_to_bmad`

**Types:**
- JSDoc parameters documented with @param annotations in utility functions
- Object shape documentation when complex: `@param {{ firstName: string, lastName: string }} user`
- Return type documentation with @returns when it aids clarity
- Generic catalog types extracted: `skills`, `agents`, `commands`, `hooks`

## Code Style

**Formatting:**
- No explicit formatter configured (no `.eslintrc`, `.prettierrc` found)
- Implicit style: 2-space indentation, no semicolons at line ends (optional in modules)
- Import statements grouped: `fs` operations, then path utilities, then npm packages
- Multiline statements indent subsequent lines naturally

**Linting:**
- ESLint available via `npm run lint` but no project-specific config file
- npm script defined in `package.json`: `"lint": "npx eslint ."`

**Module Pattern:**
- ES6 modules (`.js` files with `type: "module"` in `package.json`)
- Top imports: filesystem, path utilities, `fileURLToPath`
- `__filename` and `__dirname` computed from `import.meta.url` in every module
- Immediate constants (paths) computed at module load time

**File Organization:**
- Functions grouped by purpose (load → transform → install → manifest)
- Helper functions before main export
- JSDoc blocks above functions that need clarification
- No class-based patterns observed; functional, procedural approach

## Import Organization

**Order:**
1. Node.js built-ins (`fs`, `path`, `os`, `child_process`)
2. URL/path utilities (`fileURLToPath`, `dirname`)
3. Third-party packages (`commander`, `@clack/prompts`, `yaml`, `chalk`)

**Path Aliases:**
- None detected; all paths use `join(__dirname, ...)` or relative `join(PROJECT_ROOT, ...)`
- Projects compute `PROJECT_ROOT` as `dirname(dirname(__filename))` pattern

**Imports from Sibling Modules:**
- Dynamic imports used for lazy loading tools: `const { install } = await import('../tools/global-installer.js')`
- Only used when functionality is optional or deferred

## Error Handling

**Patterns:**
- Try-catch used for JSON/YAML parsing: `try { parseYaml(...) } catch { return null }`
- Sync operations with error suppression for optional paths: `try { const entries = readdirSync(dir) } catch { return null }`
- Validation-first approach: check `existsSync()` before operations
- Early returns with null on optional failures: `if (!match) return null`
- Explicit error throwing for critical failures: `throw new Error('Unknown preset: ${presetName}')`
- Process stderr used for warning/diagnostic output: `process.stderr.write()`
- Timeout enforcement on spawned processes: `timeout: 30000`, `timeout: 15000`

**Recovery Strategies:**
- Backups created before destructive operations: `backupDir()` creates timestamped backups
- File operations fail-safe: existing targets removed before copy (`rmSync` + `cpSync`)
- Manifest tracking for rollback capability

## Logging

**Framework:** Native console or process.stderr

**Patterns:**
- `console.log()` for status updates: `console.log('Updating mobmad...')`
- `chalk` used for colored output: `chalk.bold()`, `chalk.red()`, `chalk.green()`
- Process stderr for diagnostic logging: `process.stderr.write()` in hooks
- Status line reporting with summaries: counts of files installed
- Warnings logged to stderr, status to stdout (separation of concerns)

**When to Log:**
- Tool initialization and completion: `console.log(chalk.bold('\nmobmad sync...\n'))`
- File counts and summaries: `chalk.green(results)` for success
- Errors and warnings: `chalk.red('No lockfile found')`
- Structured output for CLI readability

## Comments

**When to Comment:**
- JSDoc blocks on exported functions with complex parameters
- Inline comments explaining non-obvious logic (preset resolution, recursive file collection)
- Section dividers for major blocks: `// ── stdin entry point ────────────────────`
- Clarification of purpose above main export function

**JSDoc/TSDoc:**
- Used selectively for functions with parameters or complex return values
- @param and @returns documentation for public functions
- @deprecated or phase notes: `// Phase 6 — not yet implemented`
- Parameter shapes documented with inline type objects in comments

**Documentation Strings:**
- Module-level comments above main export: `/** Interactive skill/agent/hook selector...`
- Purpose and return value documented for major utility functions
- Options documented inline: `@param {object} options - { preset?: string, yes?: boolean }`

## Function Design

**Size:** 
- Functions stay under 50 lines except for main loop functions (resolvePreset, installGlobal)
- Extracted helpers for repeated patterns: `backupDir()`, `collectFiles()`, `installFiles()`
- Utilities organized for readability: parse → validate → transform → write

**Parameters:**
- Single object parameter for options: `function curate(options = {})`
- Destructure from options: `const { preset, yes } = options`
- Spread operators used for immutable updates: `[...base.skills, ...result.skills]`
- Early parameter validation before use

**Return Values:**
- Objects for complex returns: `{ synced: 0 }`, `{ status: 'missing', reason: '...' }`
- Arrays for collections: returned from `collectFiles()`, parsed catalog items
- Null for "not found" cases: `if (!existsSync(...)) return null`
- Promises for async operations: `async function install(options) { ... }`

## Module Design

**Exports:**
- Single main export per module: `export async function curate()`, `export function syncUpstream()`
- Helper functions kept internal (no export) unless reused
- Modules are self-contained tools: curator handles curation, installer handles installation

**Barrel Files:**
- Not used; imports reference specific module paths: `import { curate } from '../tools/curator.js'`
- Top-level entry: `bin/mobmad-cli.js` dynamically imports submodules

## Immutability

**Patterns:**
- Spread operator for set union: `[...new Set([...base.skills, ...result.skills])]`
- Explicit object construction instead of mutation: `{ ...item, updated: true }`
- Array concatenation instead of push: `files.push(...collectFiles(...))`
- Lockfile/manifest written fresh (not mutated in-place)

---

*Convention analysis: 2026-04-07*
