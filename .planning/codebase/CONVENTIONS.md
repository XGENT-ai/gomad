# Coding Conventions

**Analysis Date:** 2026-04-08

## Naming Patterns

**Files:**
- PascalCase for class files: `Installer.js`, `Manifest.js`, `ManifestGenerator.js`
- camelCase for utility/helper files: `prompts.js`, `file-ops.js`, `manifest-generator.js`
- kebab-case for CLI and build scripts: `bmad-cli.js`, `build-docs.mjs`, `fix-doc-links.js`
- snake_case for config/data files: `platform-codes.yaml`, `skill-validator.md`

**Classes:**
- PascalCase for all class names: `Installer`, `Manifest`, `ExistingInstall`, `ManifestGenerator`, `OfficialModules`, `IdeManager`
- Constructor parameters and instance properties use camelCase

**Functions:**
- camelCase for function names: `getClack()`, `handleCancel()`, `detectInstall()`, `cleanForCSV()`
- Private methods prefixed with underscore: `_removeDeselectedModules()`, `_installAndConfigure()`, `_setupIdes()`
- Helper functions defined in call order (callers above callees) per `tools/javascript-conventions.md`

**Variables:**
- camelCase for constants that vary at runtime: `selectedModules`, `customModuleIds`, `manifestPath`
- UPPER_SNAKE_CASE for true constants: `SKIP_DIRS`, `SCAN_EXTENSIONS`, `PROJECT_ROOT_REF`, `INSTALL_ONLY_PATHS`
- Descriptive names for data structures: `manifestData`, `moduleDetails`, `results`, `failures`

**Booleans:**
- Prefix with `is`, `has`, `should`: `isCancel()`, `hasCore`, `shouldFail`
- Examples: `installed`, `hasDetailedModules`, `inQuotes`

## Code Style

**Formatting:**
- Prettier (v3.7.4)
- Config: `prettier.config.mjs`
- Key settings:
  - Print width: 140 characters
  - Tab width: 2 spaces
  - Trailing commas: all
  - Single quotes: true (except YAML and JSON)
  - Arrow function parens: always
  - Line ending: LF only

**Linting:**
- ESLint (v9.33.0)
- Config: `eslint.config.mjs` (flat config)
- Core plugins:
  - `@eslint/js` - Recommended JavaScript rules
  - `eslint-plugin-n` - Node.js rules for CommonJS and ESM
  - `eslint-plugin-unicorn` - Modern best practices
  - `eslint-plugin-yml` - YAML linting
  - `eslint-config-prettier` - Disable conflicting stylistic rules
- Key rules:
  - `no-console`: off (CLI tools allowed to use console)
  - `unicorn/prevent-abbreviations`: off
  - `unicorn/no-null`: off
  - YAML file extension: must be `.yaml` (not `.yml`)
  - YAML quotes: prefer double quotes with avoidEscape enabled
- CLI scripts (`tools/**/*.js`, `test/**/*.js`) have relaxed rules:
  - Module style preferences disabled
  - Unused variables allowed
  - Process.exit allowed
  - Array reduce/callback patterns relaxed

**File formatting by type:**
- `.yaml` files: Prettier formats with singleQuote: false
- `.json` files: Prettier formats with singleQuote: false
- `.cjs` files: Prettier parses as Babel
- `.md` files: Prettier preserves prose wrapping

## Import Organization

**Order:**
1. Node.js built-in modules: `require('node:path')`, `require('node:fs')`
2. Third-party dependencies: `require('commander')`, `require('yaml')`
3. Local modules: `require('./installer')`, `require('../project-root')`
4. Destructured imports grouped together at top

**Path Aliases:**
None configured. Uses relative paths and explicit require statements.

**Module exports:**
- CommonJS pattern: `module.exports = { ClassName };`
- One class per file typically
- Example: `module.exports = { Installer };`

**Require patterns:**
```javascript
const path = require('node:path');
const { ClassName } = require('./relative-path');
const singleExport = require('./module-exporting-default');
```

## Error Handling

**Patterns:**
- Explicit try-catch blocks for risky operations (file I/O, YAML parsing)
- Throw descriptive Error objects: `throw new Error('message')`
- TypeError for type validation: `throw new TypeError('message')`
- Silent failures in low-risk background tasks (e.g., version check): `catch { /* ignore */ }`
- Error context preserved with helpful messages

**Examples from codebase:**
```javascript
// Explicit error handling with context
try {
  const configContent = await fs.readFile(coreConfigPath, 'utf8');
  const config = yaml.parse(configContent);
} catch (error) {
  // Handle with context
}

// Type validation errors
if (!Array.isArray(resolvedIdes)) {
  throw new TypeError('ManifestGenerator expected `options.ides` to be an array.');
}

// Silent failures in non-critical paths
checkForUpdate().catch(() => {
  // Silently ignore errors - version check is best-effort
});
```

## Logging

**Framework:** console (no external logger)

**Patterns:**
- `console.log()` for info/debug output (prefixed with `[DEBUG]` tag when appropriate)
- `console.warn()` for warnings
- `console.error()` for errors
- Chalk library used for colored output in CLI: `chalk.blue()`, `chalk.red()`, `chalk.yellow()`
- Debug mode controlled by env var: `BMAD_DEBUG_MANIFEST === 'true'`

**Examples:**
```javascript
console.log(`[DEBUG] collectSkills: total skills found: ${this.skills.length}`);
console.warn(`Warning: Failed to parse ${dirPath}: ${error.message}`);
console.error(chalk.red(`❌ YAML syntax error in ${filename}:`), error.message);
```

## Comments

**When to Comment:**
- Explain non-obvious algorithmic choices
- Document complex data structure transformations
- Clarify intent when code is terse or uses advanced patterns
- Add context for workarounds or hacks

**JSDoc/TSDoc:**
Used extensively for public methods, class descriptions, and function parameters.

**JSDoc pattern:**
```javascript
/**
 * Description of what the function does
 * @param {type} name - Parameter description
 * @returns {type} Return description
 */
function myFunction(name) { }

/**
 * Class description
 */
class MyClass {
  /**
   * Method description
   * @param {Object} config - Configuration
   * @param {string} config.directory - Target directory
   */
  async myMethod(config) { }
}
```

## Function Design

**Size:** Keep functions under 50 lines (extracted methods when larger)

**Parameters:** 
- Use destructuring for config objects: `async install(originalConfig)`
- Document complex parameters with JSDoc
- Pass objects for multiple related parameters rather than long argument lists

**Return Values:**
- Return immutable copies when appropriate (e.g., Object.freeze for snapshots)
- Return objects with status and detail info: `{ success: true, path: manifestPath }`
- Use early returns for guard clauses

**Example from codebase:**
```javascript
async install(originalConfig) {
  try {
    const config = Config.build(originalConfig);
    const paths = await InstallPaths.create(config);
    // ... rest of logic
  } catch (error) {
    // handle
  }
}
```

## Module Design

**Exports:**
- One class per module file
- Module exports object with class name: `module.exports = { ClassName };`
- Destructure on import: `const { ClassName } = require('./path')`

**Immutability:**
- Use Object.freeze() for immutable snapshots: `Object.freeze(this.modules)`
- Use spread operator for updates where mutation would occur
- Store data structures that won't change during execution as frozen objects

**Example from ExistingInstall class:**
```javascript
constructor({ installed, version, hasCore, modules, ides, customModules }) {
  this.installed = installed;
  this.modules = Object.freeze(modules.map((m) => Object.freeze({ ...m })));
  this.ides = Object.freeze([...ides]);
  Object.freeze(this);
}
```

---

*Convention analysis: 2026-04-08*
