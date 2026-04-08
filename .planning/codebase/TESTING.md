# Testing Patterns

**Analysis Date:** 2026-04-08

## Test Framework

**Runner:**
- Jest (v30.2.0) installed as dev dependency
- **Note:** No Jest config file found — not currently used in this codebase

**Assertion Library:**
- Custom test helpers using simple assertion functions
- No external assertion library (not needed for current test structure)

**Run Commands:**
```bash
npm test                          # Run all tests (composite: refs, install, lint, markdown)
npm run test:refs                 # Test file reference validation
npm run test:install              # Test installation components
npm run lint                       # ESLint validation
npm run lint:md                    # Markdown linting
npm run format:check              # Prettier format check
npm run quality                   # Full quality gate (format, lint, docs build, tests, validation)
```

## Test File Organization

**Location:**
- Test files in `/test` directory (not co-located with source)
- Custom test scripts: `test/test-*.js`
- Test fixtures in: `test/fixtures/`
- Adversarial review tests in: `test/adversarial-review-tests/`

**Naming:**
- Pattern: `test-[component].js`
- Examples: `test-file-refs-csv.js`, `test-installation-components.js`, `test-workflow-path-regex.js`

**Structure:**
```
test/
├── test-file-refs-csv.js              # CSV reference extraction tests
├── test-installation-components.js    # Installation component unit tests
├── test-install-to-bmad.js           # BMad manifest integration tests
├── test-rehype-plugins.mjs           # Documentation plugin tests
├── test-workflow-path-regex.js       # Workflow path regex tests
├── fixtures/                         # Test data and expected outputs
│   └── file-refs-csv/               # CSV reference fixtures
└── adversarial-review-tests/        # Edge case and stress tests
```

## Test Structure

**Suite Organization:**

Tests use a simple custom framework with a `test()` helper function rather than a formal testing framework.

```javascript
const colors = {
  reset: '\u001B[0m',
  green: '\u001B[32m',
  red: '\u001B[31m',
  cyan: '\u001B[36m',
  dim: '\u001B[2m',
};

let totalTests = 0;
let passedTests = 0;
const failures = [];

function test(name, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  ${colors.green}✓${colors.reset} ${name}`);
  } catch (error) {
    console.log(`  ${colors.red}✗${colors.reset} ${name}`);
    failures.push({ name, message: error.message });
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
```

**Test execution pattern:**
- Tests are Node.js scripts run with `node test/test-file.js`
- Each test file handles its own fixtures and cleanup
- Exit code: 0 = all pass, 1 = failures
- ANSI colored output with ✓ and ✗ symbols

**Pattern from test files:**
```javascript
/**
 * Installation Component Tests
 *
 * Tests individual installation components in isolation:
 * - Agent YAML → XML compilation
 * - Manifest generation
 * - Path resolution
 * - Customization merging
 *
 * These are deterministic unit tests that don't require full installation.
 * Usage: node test/test-installation-components.js
 */

// Setup phase
async function createTestBmadFixture() {
  const fixtureRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'bmad-fixture-'));
  // ... create test directories and files
  return fixtureRoot;
}

// Individual test
function test('should parse SKILL.md frontmatter', () => {
  // Arrange
  const content = fs.readFileSync(skillMdPath, 'utf-8');
  
  // Act
  const meta = parseSkillMd(content);
  
  // Assert
  assert(meta.name === 'test-skill', 'name mismatch');
  assert(meta.description === 'A test', 'description mismatch');
});
```

## Mocking

**Framework:** 
- Manual fixture creation using `fs-extra` for file system operations
- Temporary directories for isolated test environments: `fs.mkdtemp()`
- No external mocking library (fixtures are explicit)

**Patterns:**
```javascript
// Create temporary fixture directories
async function createTestBmadFixture() {
  const fixtureRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'bmad-fixture-'));
  const fixtureDir = path.join(fixtureRoot, '_bmad');
  await fs.ensureDir(fixtureDir);
  
  // Write test manifest
  await fs.writeFile(
    path.join(fixtureDir, '_config', 'skill-manifest.csv'),
    'canonicalId,name,description,module,path,install_to_bmad\n' +
    '"test-skill","test-skill","A test","core","_bmad/core/test-skill/SKILL.md","true"\n'
  );
  
  return fixtureDir;
}

// Test uses fixture
test('should detect installed modules', async () => {
  const fixture = await createTestBmadFixture();
  const result = await ExistingInstall.detect(fixture);
  assert(result.installed === true, 'should detect installation');
  
  // Cleanup
  await fs.remove(path.dirname(fixture));
});
```

**What to Mock:**
- File system operations (use temporary directories and fs-extra)
- Installation directories and configs (create minimal valid structures)
- SKILL.md manifests (minimal frontmatter with name/description)

**What NOT to Mock:**
- Actual parsing logic (test against real parsers like yaml)
- Module/class instantiation (test constructor behavior)
- File system path operations (use real path module)

## Fixtures and Factories

**Test Data:**
- Fixtures are minimal but complete:
  - SKILL.md files with frontmatter: name, description, optional metadata
  - CSV manifest files with required columns only
  - YAML config files with required fields only

**Example fixture factory:**
```javascript
async function createSkillCollisionFixture() {
  const fixtureRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'bmad-skill-collision-'));
  const fixtureDir = path.join(fixtureRoot, '_bmad');
  const configDir = path.join(fixtureDir, '_config');
  await fs.ensureDir(configDir);

  // Minimal agent manifest
  await fs.writeFile(
    path.join(configDir, 'agent-manifest.csv'),
    'name,displayName,title,icon,capabilities,role,identity,communicationStyle,principles,module,path,canonicalId\n' +
    '"bmad-master","BMAD Master","","","","","","","","core","_bmad/core/agents/bmad-master.md","bmad-master"\n'
  );

  return { root: fixtureRoot, bmadDir: fixtureDir };
}
```

**Location:**
- Fixtures created inline in test functions or in helper functions at top of test file
- Temporary fixtures created with `fs.mkdtemp()` and cleaned up after test
- Static fixtures in `test/fixtures/` for reusable test data
- No factory library — simple async factory functions

## Coverage

**Requirements:** 
- No enforced minimum (no `.c8` or coverage config detected)
- Jest installed but not configured

**View Coverage:**
```bash
# Coverage not currently tracked in CI/CD
# Jest would be run with: npm test -- --coverage
```

## Test Types

**Unit Tests:**
- Scope: Individual functions, classes, small components
- Approach: Test parsing, validation, transformation logic
- Examples: CSV reference extraction, manifest generation, config building
- Example: `test-file-refs-csv.js` tests `extractCsvRefs()` function against fixtures

**Integration Tests:**
- Scope: Multi-component flows, installation sequences
- Approach: Use full fixtures simulating real .bmad structure
- Examples: ExistingInstall detection, manifest generation with multiple modules
- Example: `test-installation-components.js` tests full installer workflows

**E2E Tests:**
- Not currently used
- Would test: Full installation from CLI to configured IDE

## Common Patterns

**Test Setup/Teardown:**
```javascript
async function setup() {
  // Create fixtures before test
  const fixture = await createTestBmadFixture();
  return fixture;
}

async function teardown(fixture) {
  // Clean up after test
  await fs.remove(path.dirname(fixture));
}

test('should work', async () => {
  const fixture = await setup();
  try {
    // Test logic
  } finally {
    await teardown(fixture);
  }
});
```

**Assertion Pattern:**
```javascript
function assert(condition, testName, errorMessage = '') {
  if (condition) {
    console.log(`${colors.green}✓${colors.reset} ${testName}`);
    passed++;
  } else {
    console.log(`${colors.red}✗${colors.reset} ${testName}`);
    if (errorMessage) {
      console.log(`  ${colors.dim}${errorMessage}${colors.reset}`);
    }
    failed++;
  }
}
```

**Error Testing:**
```javascript
// Test that error is thrown
test('should throw on missing manifest', () => {
  try {
    const result = ExistingInstall.getVersion(false); // installed=false
    // Should have thrown — if we reach here, test fails
    assert(false, 'expected error not thrown');
  } catch (error) {
    assert(error.message.includes('not available'), 'correct error message');
  }
});

// Test error recovery
test('should gracefully handle missing files', async () => {
  // No file at path
  const result = await readConfig('/nonexistent/path');
  assert(result === null, 'returns null on missing file');
});
```

**Async Testing:**
```javascript
// Tests are async functions with await
test('should detect existing installation', async () => {
  const fixture = await createTestBmadFixture();
  const result = await ExistingInstall.detect(fixture); // awaits
  assert(result.installed === true, 'installation detected');
  await fs.remove(path.dirname(fixture));
});
```

## Test Validation Scripts

**Non-test scripts also present:**
- `test/test-workflow-path-regex.js` - Validates workflow path patterns
- `test/test-rehype-plugins.mjs` - Tests Astro/rehype documentation plugins
- These are run as part of `npm test` composite command

**File validation:**
- `tools/validate-file-refs.js` - Validates cross-file references (supports --strict mode)
- `tools/validate-skills.js` - Validates skill manifest structure
- `tools/validate-doc-links.js` - Validates documentation links
- These are part of quality gate but are not unit tests

---

*Testing analysis: 2026-04-08*
