/**
 * rename-sweep.js unit tests.
 *
 * Verifies the pure `applyMappings()` transformation against the D-05 mapping
 * (longest-first ordering) and the T-02-07 word-anchored `bmm` rule.
 *
 * Usage: node test/test-rename-sweep.js
 * Exit codes: 0 = all tests pass, 1 = failures
 */

'use strict';

const { applyMappings, MAPPINGS, EXCLUDE_FILES } = require('../tools/dev/rename-sweep.js');

const colors = {
  reset: '\u001B[0m',
  green: '\u001B[32m',
  red: '\u001B[31m',
};

let total = 0;
let passed = 0;
const failures = [];

function test(name, fn) {
  total += 1;
  try {
    fn();
    passed += 1;
    console.log(`  ${colors.green}\u2713${colors.reset} ${name}`);
  } catch (error) {
    console.log(`  ${colors.red}\u2717${colors.reset} ${name} — ${error.message}`);
    failures.push({ name, message: error.message });
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message || 'assertEqual'}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function assert(cond, message) {
  if (!cond) {
    throw new Error(message || 'assertion failed');
  }
}

// --- mapping structure ---

test('MAPPINGS lists all six rules in longest-first order', () => {
  const names = MAPPINGS.map((m) => m.name);
  assertEqual(names.length, 6, 'mapping count');
  assertEqual(names[0], 'BMAD Method→GoMad');
  assertEqual(names[1], 'bmad-method→gomad');
  assertEqual(names[2], 'BMad→GoMad');
  assertEqual(names[3], 'BMAD→GOMAD');
  assertEqual(names[4], 'bmad→gomad');
  assertEqual(names[5], 'bmm→gomad (word-anchored)');
});

test('EXCLUDE_FILES contains the Phase 3-owned set (D-06)', () => {
  const required = ['LICENSE', 'CHANGELOG.md', 'TRADEMARK.md', 'CONTRIBUTORS.md', 'README.md', 'README_CN.md'];
  for (const f of required) {
    assert(EXCLUDE_FILES.has(f), `missing exclude entry: ${f}`);
  }
});

// --- D-05 substitution correctness ---

test('"BMAD Method" transforms to "GoMad" (phrase beats BMAD+Method split)', () => {
  const { content } = applyMappings('Welcome to BMAD Method, the agile framework.');
  assertEqual(content, 'Welcome to GoMad, the agile framework.');
});

test('"bmad-method" npm package name transforms to "gomad"', () => {
  const { content } = applyMappings('npm install bmad-method@latest');
  assertEqual(content, 'npm install gomad@latest');
});

test('"BMad" casing variant transforms to "GoMad"', () => {
  const { content } = applyMappings('Built on BMad by Brian.');
  assertEqual(content, 'Built on GoMad by Brian.');
});

test('"BMAD" all-caps transforms to "GOMAD"', () => {
  const { content } = applyMappings('The BMAD acronym.');
  assertEqual(content, 'The GOMAD acronym.');
});

test('lowercase "bmad" transforms to "gomad"', () => {
  const { content } = applyMappings('See tools/installer/bmad-cli.js');
  assertEqual(content, 'See tools/installer/gomad-cli.js');
});

test('"bmad-" prefix in identifier transforms to "gomad-"', () => {
  const { content } = applyMappings('const pkg = "bmad-something";');
  assertEqual(content, 'const pkg = "gomad-something";');
});

// --- T-02-07: word-anchored bmm ---

test('standalone "bmm" transforms to "gomad"', () => {
  const { content } = applyMappings('module bmm uses skills');
  assertEqual(content, 'module gomad uses skills');
});

test('"bmm-skills" identifier segment transforms', () => {
  const { content } = applyMappings('path src/bmm-skills/core');
  assertEqual(content, 'path src/gomad-skills/core');
});

test('"bmm.yaml" filename segment transforms', () => {
  const { content } = applyMappings('load bmm.yaml');
  assertEqual(content, 'load gomad.yaml');
});

test('"_bmm_" underscore-flanked segment transforms (required by D-17 gate)', () => {
  // Per the plan's <behavior> spec ("non-alphanumeric characters") and the
  // D-17 zero-bmm-hit gate, underscore is a segment boundary — `bmad_bmm_pm`
  // (internal slash-command namespace used by agent-command-generator.js)
  // must be fully rewritten. `bmad` runs first, then `_bmm_` rewrites.
  const { content } = applyMappings('const name = "bmad_bmm_pm";');
  assertEqual(content, 'const name = "gomad_gomad_pm";');
});

test('"xbmmx" embedded trigram is NOT rewritten', () => {
  const { content } = applyMappings('token xbmmx is unrelated');
  assertEqual(content, 'token xbmmx is unrelated');
});

test('"bmm3" alphanumeric-followed does NOT match', () => {
  const { content } = applyMappings('flag bmm3 exists');
  assertEqual(content, 'flag bmm3 exists');
});

// --- ordering / longest-first ---

test('"BMAD Method" is replaced before plain BMAD kicks in', () => {
  // If ordering were wrong, we'd get "GOMAD Method" → "GOMAD Method" and leave
  // a stray Method. The phrase rule must bind first.
  const { content } = applyMappings('BMAD Method and BMAD alone');
  assertEqual(content, 'GoMad and GOMAD alone');
});

test('"bmad-method" is replaced before plain bmad kicks in', () => {
  const { content } = applyMappings('bmad-method and bmad alone');
  assertEqual(content, 'gomad and gomad alone');
});

// --- idempotency ---

test('applyMappings is idempotent: second pass is a no-op', () => {
  const input = ['BMAD Method', 'bmad-method', 'BMad', 'BMAD', 'bmad', 'bmm', 'src/bmm-skills/', 'const x = "bmad-cli";'].join('\n');
  const first = applyMappings(input).content;
  const second = applyMappings(first).content;
  assertEqual(second, first, 'idempotency check');
});

// --- reporting ---

console.log('');
console.log(`rename-sweep unit tests: ${passed}/${total} passed`);
if (failures.length > 0) {
  console.log('');
  console.log('Failures:');
  for (const f of failures) {
    console.log(`  - ${f.name}: ${f.message}`);
  }
  process.exit(1);
}
process.exit(0);
