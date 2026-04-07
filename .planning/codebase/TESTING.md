# Testing Patterns

**Analysis Date:** 2026-04-07

## Test Framework

**Runner:**
- Node.js native `node:test` module (no external test framework)
- Configuration: `package.json` script `"test": "node --test 'test/test-*.js'"`
- Node.js version requirement: `>= 18.0.0` (native test module available since Node 18.0)

**Assertion Library:**
- `node:assert/strict` — Node.js built-in strict assertions

**Run Commands:**
```bash
npm test                     # Run all tests matching test/test-*.js
npm run lint               # Check code with eslint
```

## Test File Organization

**Location:**
- Tests co-located in dedicated `test/` directory at project root
- Pattern: `test/test-[feature].js` 

**Current Test Files:**
- `test/test-module.js` — BMAD module structure validation
- `test/test-catalogs.js` — Catalog parsing and integrity
- `test/test-installation.js` — Integration tests for CLI and install flow
- `test/test-presets.js` — Preset resolution logic validation

**Naming:**
- Test files prefixed with `test-`
- Directory matches source structure conceptually (module, catalogs, installation, presets)

**File Structure:**
```
test/
├── test-module.js          # Module definition tests
├── test-catalogs.js        # Catalog structure tests
├── test-installation.js    # Integration + CLI tests
└── test-presets.js         # Preset resolution tests
```

## Test Structure

**Suite Organization:**

```javascript
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('Feature name', () => {
  it('should do something specific', () => {
    assert.ok(condition);
  });

  it('should handle error case', () => {
    assert.throws(() => { riskyCode() }, Error);
  });
});
```

**Patterns Observed:**

1. **Setup Pattern (Per-Suite):**
   - Compute shared paths/data at describe level
   - Load catalogs once: `const catalogs = { skills: loadCatalog('skills').skills, ... }`
   - Example from `test-module.js`:
   ```javascript
   describe('BMAD module definition', () => {
     const moduleYamlPath = join(PROJECT_ROOT, 'src', 'module', 'module.yaml');
     
     it('module.yaml exists', () => {
       assert.ok(existsSync(moduleYamlPath));
     });
   });
   ```

2. **No Explicit Teardown:**
   - Tests are stateless (no cleanup needed)
   - Artifacts created during test runs (lockfiles) are explicitly managed across tests
   - Integration tests manage their own setup: `if (existsSync(lockPath)) rmSync(lockPath);`

3. **Assertion Patterns:**
   - `assert.ok(value)` — truthy check
   - `assert.equal(actual, expected)` — strict equality
   - `assert.deepEqual(obj1, obj2)` — deep object comparison
   - `assert.throws(() => fn(), ErrorType)` — exception validation

## Mocking

**Framework:** None detected

**What to Mock:**
- File system operations are NOT mocked; tests use actual files
- Catalogs loaded from real YAML in `catalog/` directory
- Lockfiles created/deleted as integration test side effects

**What NOT to Mock:**
- File system calls — tests validate real file operations
- YAML parsing — tests validate actual catalog structure
- CLI execution via `execSync` in integration tests

**Custom Test Utilities:**

File loading helpers created ad-hoc within tests:
```javascript
function loadCatalog(name) {
  const raw = readFileSync(join(CATALOG_DIR, `${name}.yaml`), 'utf8');
  return parseYaml(raw);
}
```

Duplicate implementations across test files (not extracted to shared helper).

## Fixtures and Factories

**Test Data:**

Fixed data location: `catalog/[skills|agents|commands|hooks|presets].yaml`
- Skills catalog: `catalog/skills.yaml` (100+ entries)
- Agents catalog: `catalog/agents.yaml` (40+ entries)
- Commands catalog: `catalog/commands.yaml` (50+ entries)
- Hooks catalog: `catalog/hooks.yaml` (categorized by type)
- Presets: `catalog/presets.yaml` (6 presets)

Factories create test artifacts programmatically:
```javascript
// From test-installation.js
const { curate } = await import('../tools/curator.js');
const result = await curate({ preset: 'lean', yes: true });
```

**Location:**
- Fixtures in `catalog/` (shared with runtime)
- No separate test data directory; production catalogs are test fixtures
- Integration tests create temporary lockfiles (`mobmad.lock.yaml`) as side effects

## Coverage

**Requirements:** Not enforced

**View Coverage:**
- No coverage tool configured
- Coverage not tracked or reported

**Gaps Observed:**
- No unit tests for pure utility functions (e.g., `groupByCategory()` helper)
- No negative path testing for malformed YAML
- No tests for CLI option parsing edge cases
- Hooks in `global/hooks/` not tested (quality-gate.js, config-protection.js, etc.)

## Test Types

**Unit Tests:**
- Scope: Individual catalog validation and preset resolution logic
- Approach: Load catalogs, validate structure, check invariants
- Examples:
  - `test-catalogs.js`: Validate skill/agent fields exist, categories valid, names unique
  - `test-presets.js`: Resolve preset logic, verify inheritance and merging

**Integration Tests:**
- Scope: CLI commands, end-to-end workflows (curate → package → sync)
- Approach: Use actual CLI via `execSync`, validate side effects on filesystem
- Examples from `test-installation.js`:
  ```javascript
  it('programmatic curate creates correct lockfile', async () => {
    const { curate } = await import('../tools/curator.js');
    const result = await curate({ preset: 'lean', yes: true });
    assert.ok(existsSync(lockPath), 'lockfile should exist');
  });
  ```
- Side effects: Creates lockfiles, generates skill directories, modifies `src/module/skills/`

**E2E Tests:**
- Not used; CLI tested via integration tests with `execSync`
- Critical paths: `install --preset lean --yes`, `status`, `sync`

## Common Patterns

**Async Testing:**

```javascript
describe('Integration: curate + package flow', () => {
  it('programmatic curate creates correct lockfile', async () => {
    const { curate } = await import('../tools/curator.js');
    const result = await curate({ preset: 'lean', yes: true });
    assert.ok(existsSync(lockPath));
  });
});
```

- Async functions tested with `async () => { ... }` test bodies
- Dynamic imports used to load modules under test: `const { curate } = await import(...)`
- No explicit promise chaining; await used directly

**Error Testing:**

```javascript
// From test-presets.js
it('all preset names are valid', () => {
  const expected = ['full', 'full-stack', 'python-only', 'enterprise', 'lean', 'bmad-enhanced'];
  for (const name of expected) {
    assert.ok(presets[name], `preset "${name}" should exist`);
  }
});
```

- Validation errors tested by checking return values: `if (!preset) throw new Error(...)`
- Custom assertion messages provided: `assert.ok(condition, 'message')`
- Edge cases tested: duplicate detection, missing references, invalid categories

**Filesystem Testing:**

```javascript
it('package creates skill directories with manifests', async () => {
  const { packageSkills } = await import('../tools/package-skills.js');
  packageSkills();
  
  const skillsDir = join(PROJECT_ROOT, 'src', 'module', 'skills');
  assert.ok(existsSync(skillsDir));
  
  const dirs = readdirSync(skillsDir);
  assert.ok(dirs.length >= 10);
});
```

- Tests validate side effects on real filesystem
- File existence checked with `existsSync()`
- Directory contents listed with `readdirSync()`
- YAML manifest structure validated: `parseYaml(readFileSync(path))`

## Test Distribution

**Coverage Statistics:**
- Total tests: ~40 test cases across 4 files
- Test file breakdown:
  - `test-module.js`: 100 lines (5 tests)
  - `test-catalogs.js`: 89 lines (9 tests)
  - `test-presets.js`: 134 lines (9 tests)
  - `test-installation.js`: 107 lines (8+ integration tests)

**Untested Modules:**
- `bin/mobmad-cli.js`: Tested indirectly via integration tests, no unit tests
- `global/hooks/*.js`: Not tested (qaulity-gate.js, config-protection.js, etc.)
- Curator UI interactions: `@clack/prompts` usage not tested (only programmatic mode)

---

*Testing analysis: 2026-04-07*
