/**
 * rename-sweep.js unit tests.
 *
 * Verifies the pure `applyMappings()` transformation against the D-05 mapping
 * (longest-first ordering) and the T-02-07 word-anchored rules.
 *
 * NOTE: This file is in the sweep script's IGNORE_GLOBS so it can keep the
 * literal source strings it asserts on. Do not remove that exclusion — the
 * sweep would otherwise turn every fixture into a tautology.
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

test('MAPPINGS lists all seven rules in the expected order', () => {
  const names = MAPPINGS.map((m) => m.name);
  assertEqual(names.length, 7, 'mapping count');
  assertEqual(names[0], 'BMAD Method\u2192GoMad');
  assertEqual(names[1], 'bmad-method\u2192gomad');
  assertEqual(names[2], 'BMad\u2192GoMad');
  assertEqual(names[3], 'BMAD\u2192GOMAD');
  assertEqual(names[4], 'bmad\u2192gomad');
  assertEqual(names[5], 'bmm\u2192gomad (word-anchored)');
  assertEqual(names[6], 'bmm\u2192gomad (camelCase head)');
});

test('EXCLUDE_FILES contains the Phase 3-owned set (D-06)', () => {
  const required = ['LICENSE', 'CHANGELOG.md', 'TRADEMARK.md', 'CONTRIBUTORS.md', 'README.md', 'README_CN.md'];
  for (const f of required) {
    assert(EXCLUDE_FILES.has(f), `missing exclude entry: ${f}`);
  }
});

test('EXCLUDE_FILES contains the attribution-URL surfaces', () => {
  const required = ['docs/roadmap.mdx', 'docs/zh-cn/roadmap.mdx', 'website/src/styles/custom.css'];
  for (const f of required) {
    assert(EXCLUDE_FILES.has(f), `missing attribution exclude: ${f}`);
  }
});

// --- D-05 substitution correctness ---

const BMAD_METHOD = ['B', 'MAD Method'].join('');
const BMAD_DASH = ['b', 'mad-method'].join('');
const BMAD_CAPS = ['B', 'MAD'].join('');
const BMAD_PROPER = ['B', 'Mad'].join('');
const BMAD_LOWER = ['b', 'mad'].join('');
const BMM = ['b', 'mm'].join('');

test('phrase form transforms to "GoMad"', () => {
  const { content } = applyMappings(`Welcome to ${BMAD_METHOD}, the agile framework.`);
  assertEqual(content, 'Welcome to GoMad, the agile framework.');
});

test('npm package name form transforms to "gomad"', () => {
  const { content } = applyMappings(`npm install ${BMAD_DASH}@latest`);
  assertEqual(content, 'npm install gomad@latest');
});

test('mixed-case casing variant transforms to "GoMad"', () => {
  const { content } = applyMappings(`Built on ${BMAD_PROPER} by Brian.`);
  assertEqual(content, 'Built on GoMad by Brian.');
});

test('all-caps form transforms to "GOMAD"', () => {
  const { content } = applyMappings(`The ${BMAD_CAPS} acronym.`);
  assertEqual(content, 'The GOMAD acronym.');
});

test('lowercase form transforms to "gomad"', () => {
  const { content } = applyMappings(`See tools/installer/${BMAD_LOWER}-cli.js`);
  assertEqual(content, 'See tools/installer/gomad-cli.js');
});

test('prefixed identifier transforms cleanly', () => {
  const { content } = applyMappings(`const pkg = "${BMAD_LOWER}-something";`);
  assertEqual(content, 'const pkg = "gomad-something";');
});

// --- T-02-07: word-anchored bmm ---

test('standalone trigram form transforms', () => {
  const { content } = applyMappings(`module ${BMM} uses skills`);
  assertEqual(content, 'module gomad uses skills');
});

test('hyphen-flanked identifier segment transforms', () => {
  const { content } = applyMappings(`path src/${BMM}-skills/core`);
  assertEqual(content, 'path src/gomad-skills/core');
});

test('dot-flanked filename segment transforms', () => {
  const { content } = applyMappings(`load ${BMM}.yaml`);
  assertEqual(content, 'load gomad.yaml');
});

test('underscore-flanked segment transforms (required by D-17 gate)', () => {
  // Underscore is a segment boundary so the internal slash-command namespace
  // rewrites cleanly: first pass rewrites the outer token, second the inner.
  const input = `const name = "${BMAD_LOWER}_${BMM}_pm";`;
  const { content } = applyMappings(input);
  assertEqual(content, 'const name = "gomad_gomad_pm";');
});

test('embedded trigram with letters on both sides is NOT rewritten', () => {
  const needle = `x${BMM}x`;
  const { content } = applyMappings(`token ${needle} is unrelated`);
  assertEqual(content, `token ${needle} is unrelated`);
});

test('trigram followed by digit is NOT rewritten (word-anchor)', () => {
  const needle = `${BMM}3`;
  const { content } = applyMappings(`flag ${needle} exists`);
  assertEqual(content, `flag ${needle} exists`);
});

// --- camelCase bmm (new rule) ---

test('camelCase identifier head rewrites before uppercase letter', () => {
  const input = `const x = ${BMM}Path;`;
  const { content } = applyMappings(input);
  assertEqual(content, 'const x = gomadPath;');
});

test('camelCase rule does not match inside a longer identifier', () => {
  // someBmmPath — the 'B' is uppercase but the preceding 'e' is alphanumeric,
  // so the lookbehind blocks the match. Not a rewrite target.
  const input = `const y = some${'B' + 'mm'}Path;`;
  const { content } = applyMappings(input);
  assertEqual(content, `const y = some${'B' + 'mm'}Path;`);
});

// --- ordering / longest-first ---

test('phrase form is consumed before the bare acronym rule runs', () => {
  const { content } = applyMappings(`${BMAD_METHOD} and ${BMAD_CAPS} alone`);
  assertEqual(content, 'GoMad and GOMAD alone');
});

test('npm-package form is consumed before the bare lowercase rule runs', () => {
  const { content } = applyMappings(`${BMAD_DASH} and ${BMAD_LOWER} alone`);
  assertEqual(content, 'gomad and gomad alone');
});

// --- idempotency ---

test('applyMappings is idempotent: second pass is a no-op', () => {
  const input = [
    BMAD_METHOD,
    BMAD_DASH,
    BMAD_PROPER,
    BMAD_CAPS,
    BMAD_LOWER,
    BMM,
    `src/${BMM}-skills/`,
    `const x = "${BMAD_LOWER}-cli";`,
  ].join('\n');
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
