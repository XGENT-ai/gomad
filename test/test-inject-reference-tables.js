/**
 * Inject Reference Tables Tests
 *
 * Tests for tools/inject-reference-tables.cjs:
 * - parseFrontmatterMultiline reuse via require
 * - discoverPersonas finds exactly 8 personas across all four phase dirs
 * - discoverTaskSkills returns expected count (28) and excludes domain-kb
 * - discoverCoreSkills returns expected count (11)
 * - renderAgentsTable column layout (4 columns per D-07; 8 data rows + header + separator)
 * - renderSkillsTable grouping (Analysis / Planning / Solutioning / Implementation / Core)
 * - injectBetweenMarkers substitution semantics
 * - injectBetweenMarkers throws when markers absent
 * - injectBetweenMarkers idempotency (re-run produces byte-identical output)
 * - escapeTableCell escapes pipe characters (Threat T-11-02-01)
 *
 * Usage: node test/test-inject-reference-tables.js
 */

const path = require('node:path');
const fs = require('node:fs');
const inject = require('../tools/inject-reference-tables.cjs');

// ANSI colors
const colors = {
  reset: '[0m',
  green: '[32m',
  red: '[31m',
  yellow: '[33m',
  cyan: '[36m',
  dim: '[2m',
};

let passed = 0;
let failed = 0;

/**
 * Test helper: Assert condition.
 */
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

// ---------------------------------------------------------------------------
// Test 1: Module loads with expected exports
// ---------------------------------------------------------------------------

function testExportsPresent() {
  const required = [
    'injectBetweenMarkers',
    'discoverPersonas',
    'discoverTaskSkills',
    'discoverCoreSkills',
    'renderAgentsTable',
    'renderSkillsTable',
  ];
  const missing = required.filter((name) => typeof inject[name] !== 'function');
  assert(
    missing.length === 0,
    'tools/inject-reference-tables.cjs exports the expected functions',
    `Missing exports: ${missing.join(', ') || 'none'}`,
  );
}

// ---------------------------------------------------------------------------
// Test 2: discoverPersonas returns exactly 8
// ---------------------------------------------------------------------------

function testPersonaCount() {
  const personas = inject.discoverPersonas();
  assert(
    Array.isArray(personas) && personas.length === 8,
    'discoverPersonas returns exactly 8 entries',
    `Expected 8, got ${Array.isArray(personas) ? personas.length : 'not-an-array'}. ` +
      `Personas: ${(personas || []).map((p) => p && p.name).join(', ')}`,
  );
}

// ---------------------------------------------------------------------------
// Test 3: discoverPersonas covers all four phase dirs (and finds gm-agent-solo-dev under 4-implementation)
// ---------------------------------------------------------------------------

function testPersonaPhaseCoverage() {
  const personas = inject.discoverPersonas();
  const phases = new Set((personas || []).map((p) => p && p.phase));
  const allFour = ['1-analysis', '2-plan-workflows', '3-solutioning', '4-implementation'].every((p) => phases.has(p));
  assert(allFour, 'discoverPersonas covers all four phase dirs', `Phases found: ${[...phases].join(', ')}`);

  const soloDev = (personas || []).find((p) => p && p.name === 'gm-agent-solo-dev');
  assert(
    soloDev !== undefined && soloDev.phase === '4-implementation',
    'discoverPersonas finds gm-agent-solo-dev under 4-implementation (no hardcoded mapping)',
    `solo-dev entry: ${JSON.stringify(soloDev)}`,
  );
}

// ---------------------------------------------------------------------------
// Test 4: discoverTaskSkills returns exactly 28
// ---------------------------------------------------------------------------

function testTaskSkillCount() {
  const taskSkills = inject.discoverTaskSkills();
  assert(
    Array.isArray(taskSkills) && taskSkills.length === 28,
    'discoverTaskSkills returns exactly 28 entries',
    `Expected 28, got ${Array.isArray(taskSkills) ? taskSkills.length : 'not-an-array'}`,
  );
}

// ---------------------------------------------------------------------------
// Test 5: discoverCoreSkills returns exactly 11
// ---------------------------------------------------------------------------

function testCoreSkillCount() {
  const coreSkills = inject.discoverCoreSkills();
  assert(
    Array.isArray(coreSkills) && coreSkills.length === 11,
    'discoverCoreSkills returns exactly 11 entries',
    `Expected 11, got ${Array.isArray(coreSkills) ? coreSkills.length : 'not-an-array'}`,
  );
}

// ---------------------------------------------------------------------------
// Test 6: discoverTaskSkills excludes any directory under src/domain-kb/
// ---------------------------------------------------------------------------

function testNoDomainKb() {
  const taskSkills = inject.discoverTaskSkills() || [];
  const offenders = taskSkills.filter((s) => {
    const dir = (s && s.dir) || '';
    return dir.includes(`${path.sep}domain-kb${path.sep}`) || dir.includes('/domain-kb/');
  });
  assert(
    offenders.length === 0,
    'discoverTaskSkills skips src/domain-kb/ contents',
    `Offending entries: ${offenders.map((o) => o.dir).join(', ')}`,
  );
}

// ---------------------------------------------------------------------------
// Test 7: renderAgentsTable returns 8 data rows + header + separator
// ---------------------------------------------------------------------------

function testRenderAgentsTableShape() {
  const personas = inject.discoverPersonas();
  const rendered = inject.renderAgentsTable(personas);
  const lines = rendered.split('\n').filter((l) => l.trim().startsWith('|'));
  // Expect: 1 header + 1 separator + 8 data rows = 10 table lines
  assert(
    lines.length === 10,
    'renderAgentsTable emits 10 table lines (header + separator + 8 data rows)',
    `Got ${lines.length} pipe-prefixed lines:\n${lines.join('\n')}`,
  );
  // Column count check: header should have 4 columns (D-07)
  const headerCells = lines[0].split('|').filter((c) => c.trim().length > 0);
  assert(
    headerCells.length === 4,
    'renderAgentsTable header has 4 columns (D-07)',
    `Got ${headerCells.length} columns: ${headerCells.join(' | ')}`,
  );
}

// ---------------------------------------------------------------------------
// Test 8: renderSkillsTable groups output across all five sections
// ---------------------------------------------------------------------------

function testRenderSkillsTableSections() {
  const taskSkills = inject.discoverTaskSkills();
  const coreSkills = inject.discoverCoreSkills();
  const sections = inject.renderSkillsTable(taskSkills, coreSkills);
  // Expect either a string containing all five section labels or an object keyed by section
  let combined;
  if (typeof sections === 'string') {
    combined = sections;
  } else if (sections && typeof sections === 'object') {
    combined = Object.values(sections).join('\n\n');
  } else {
    combined = '';
  }
  const labels = ['Analysis', 'Planning', 'Solutioning', 'Implementation', 'Core'];
  const missing = labels.filter((l) => !combined.includes(l));
  assert(
    missing.length === 0,
    'renderSkillsTable output covers all five sections (Analysis/Planning/Solutioning/Implementation/Core)',
    `Missing labels: ${missing.join(', ')}`,
  );
}

// ---------------------------------------------------------------------------
// Test 9: injectBetweenMarkers replaces content between markers
// ---------------------------------------------------------------------------

function testInjectBetweenMarkersReplaces() {
  const before = `prefix\n<!-- AUTO:agents-table-start -->\nold content\n<!-- AUTO:agents-table-end -->\nsuffix`;
  const replaced = inject.injectBetweenMarkers(before, 'AUTO:agents-table-start', 'AUTO:agents-table-end', 'NEW');
  assert(
    replaced.includes('<!-- AUTO:agents-table-start -->\nNEW\n<!-- AUTO:agents-table-end -->'),
    'injectBetweenMarkers substitutes content between markers',
    `Output:\n${replaced}`,
  );
  assert(!replaced.includes('old content'), 'injectBetweenMarkers removes old content between markers', `Output:\n${replaced}`);
}

// ---------------------------------------------------------------------------
// Test 10: injectBetweenMarkers throws when markers absent
// ---------------------------------------------------------------------------

function testInjectThrowsOnMissingMarkers() {
  let threw = false;
  try {
    inject.injectBetweenMarkers('no markers here', 'AUTO:agents-table-start', 'AUTO:agents-table-end', 'NEW');
  } catch {
    threw = true;
  }
  assert(threw, 'injectBetweenMarkers throws when markers absent');
}

// ---------------------------------------------------------------------------
// Test 11: injectBetweenMarkers is idempotent
// ---------------------------------------------------------------------------

function testInjectIdempotent() {
  const before = `prefix\n<!-- AUTO:agents-table-start -->\nold\n<!-- AUTO:agents-table-end -->\nsuffix`;
  const once = inject.injectBetweenMarkers(before, 'AUTO:agents-table-start', 'AUTO:agents-table-end', 'NEW');
  const twice = inject.injectBetweenMarkers(once, 'AUTO:agents-table-start', 'AUTO:agents-table-end', 'NEW');
  assert(once === twice, 'injectBetweenMarkers is idempotent (byte-identical re-run)');
}

// ---------------------------------------------------------------------------
// Test 12: escapeTableCell escapes pipe characters (Threat T-11-02-01)
// ---------------------------------------------------------------------------

function testEscapePipe() {
  // Prefer the dedicated helper if exported; otherwise inspect a rendered table cell.
  if (typeof inject.escapeTableCell === 'function') {
    const escaped = inject.escapeTableCell('a | b');
    assert(escaped.includes('\\|') && !escaped.includes(' | '), 'escapeTableCell escapes pipe characters as \\|', `Got: ${escaped}`);
  } else {
    // Fallback: render a synthetic personas table with a pipe in the description.
    const synthetic = [
      {
        phase: '1-analysis',
        dir: 'synthetic',
        name: 'gm-agent-test',
        shortName: 'test',
        displayName: 'Test',
        description: 'foo | bar',
      },
    ];
    const rendered = inject.renderAgentsTable(synthetic);
    assert(
      rendered.includes('\\|') && !rendered.includes('foo | bar'),
      'rendered cell escapes pipe characters as \\| (escapeTableCell behavior)',
      `Got: ${rendered}`,
    );
  }
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

const tests = [
  testExportsPresent,
  testPersonaCount,
  testPersonaPhaseCoverage,
  testTaskSkillCount,
  testCoreSkillCount,
  testNoDomainKb,
  testRenderAgentsTableShape,
  testRenderSkillsTableSections,
  testInjectBetweenMarkersReplaces,
  testInjectThrowsOnMissingMarkers,
  testInjectIdempotent,
  testEscapePipe,
];

console.log(`${colors.cyan}Inject Reference Tables Tests${colors.reset}`);
console.log('');
for (const t of tests) {
  try {
    t();
  } catch (err) {
    console.log(`${colors.red}✗${colors.reset} ${t.name} threw: ${err.message}`);
    failed++;
  }
}
console.log('');
console.log(`${colors.green}${passed} passed${colors.reset}, ${failed > 0 ? colors.red : colors.dim}${failed} failed${colors.reset}`);

process.exit(failed > 0 ? 1 : 0);
