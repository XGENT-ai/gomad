/**
 * test/test-codex-syntax-transform.js
 *
 * Quick task 260430-q3c — unit test for the conservative invocation-syntax
 * transform that rewrites `/gm:agent-<short>` → `$gm-agent-<short>` (and
 * bare `gm:agent-<short>` → `gm-agent-<short>`) at install time for IDEs
 * without `launcher_target_dir` (Codex et al.).
 *
 * Style-matched to test/test-statusline-install.js: plain Node, `assert`
 * from node:assert/strict, exit 1 on any assertion failure.
 *
 * Usage: node test/test-codex-syntax-transform.js
 */

const assert = require('node:assert/strict');

const {
  applyInvocationSyntaxTransform,
  resolveInvocationSyntax,
  BUILT_IN_AGENT_SHORTNAMES,
} = require('../tools/installer/ide/shared/invocation-syntax');
const { AgentCommandGenerator } = require('../tools/installer/ide/shared/agent-command-generator');

const colors = {
  reset: '[0m',
  green: '[32m',
  red: '[31m',
  cyan: '[36m',
  dim: '[2m',
};

let passed = 0;
let failed = 0;

function check(name, fn) {
  try {
    fn();
    console.log(`${colors.green}✓${colors.reset} ${name}`);
    passed++;
  } catch (error) {
    console.log(`${colors.red}✗${colors.reset} ${name}`);
    console.log(`  ${colors.dim}${error.message}${colors.reset}`);
    failed++;
  }
}

console.log(`${colors.cyan}========================================`);
console.log('Codex invocation-syntax transform (260430-q3c)');
console.log(`========================================${colors.reset}\n`);

// 1. slash-colon → dollar-dash (single-token shortName)
check('1. /gm:agent-pm in dash mode → $gm-agent-pm', () => {
  assert.equal(applyInvocationSyntaxTransform('Invoke /gm:agent-pm here', 'dash'), 'Invoke $gm-agent-pm here');
});

// 2. multi-char shortName, with trailing punctuation (right \b)
check('2. /gm:agent-tech-writer with trailing period', () => {
  assert.equal(applyInvocationSyntaxTransform('See /gm:agent-tech-writer.', 'dash'), 'See $gm-agent-tech-writer.');
});

// 3. bare colon-form in CSV cell → bare dash form
check('3. bare gm:agent-tech-writer in CSV row → gm-agent-tech-writer', () => {
  assert.equal(applyInvocationSyntaxTransform('agent: gm:agent-tech-writer,col2', 'dash'), 'agent: gm-agent-tech-writer,col2');
});

// 4. unknown shortName — left alone
check('4. /gm:agent-unknown unchanged (not in shortName list)', () => {
  assert.equal(applyInvocationSyntaxTransform('/gm:agent-unknown', 'dash'), '/gm:agent-unknown');
});

// 5. unrelated colon string — left alone
check('5. gm:something-else unchanged', () => {
  assert.equal(applyInvocationSyntaxTransform('See gm:something-else', 'dash'), 'See gm:something-else');
});

// 6. already-dash form — idempotent
check('6. $gm-agent-pm in dash mode is idempotent', () => {
  assert.equal(applyInvocationSyntaxTransform('$gm-agent-pm', 'dash'), '$gm-agent-pm');
});

// 7. colon mode is a no-op
check('7. /gm:agent-pm in colon mode unchanged', () => {
  assert.equal(applyInvocationSyntaxTransform('/gm:agent-pm', 'colon'), '/gm:agent-pm');
});

// 8. longest-first — `solo-dev` matches before `dev`
check('8. /gm:agent-solo-dev resolves whole shortName (longest-first)', () => {
  assert.equal(applyInvocationSyntaxTransform('/gm:agent-solo-dev', 'dash'), '$gm-agent-solo-dev');
});

// 9. right word-boundary — `pm` does NOT match inside `pmx`
check(String.raw`9. /gm:agent-pmx unchanged (right \b prevents pm-prefix match)`, () => {
  assert.equal(applyInvocationSyntaxTransform('/gm:agent-pmx', 'dash'), '/gm:agent-pmx');
});

// 10. resolveInvocationSyntax: explicit colon
check('10. resolveInvocationSyntax({ installer: { invocation_syntax: "colon" } }) === "colon"', () => {
  assert.equal(resolveInvocationSyntax({ installer: { invocation_syntax: 'colon' } }), 'colon');
});

// 11. resolveInvocationSyntax: missing field defaults to dash
check('11. resolveInvocationSyntax({ installer: {} }) === "dash"', () => {
  assert.equal(resolveInvocationSyntax({ installer: {} }), 'dash');
});

// 12. resolveInvocationSyntax: undefined config defensive default
check('12. resolveInvocationSyntax(undefined) === "dash"', () => {
  // eslint-disable-next-line unicorn/no-useless-undefined -- the explicit `undefined` IS the case under test
  assert.equal(resolveInvocationSyntax(undefined), 'dash');
});

// 13. multi-occurrence rewrite — all 4 refs in one body
check('13. multi-line / multi-occurrence: all 4 refs rewritten, surrounding text intact', () => {
  const input = [
    'Step 1. Invoke /gm:agent-pm to draft.',
    'Step 2. Hand off to /gm:agent-architect.',
    'Step 3. Then call /gm:agent-dev or /gm:agent-solo-dev.',
    'Note: this is unrelated text mentioning gm:something-else.',
  ].join('\n');
  const expected = [
    'Step 1. Invoke $gm-agent-pm to draft.',
    'Step 2. Hand off to $gm-agent-architect.',
    'Step 3. Then call $gm-agent-dev or $gm-agent-solo-dev.',
    'Note: this is unrelated text mentioning gm:something-else.',
  ].join('\n');
  assert.equal(applyInvocationSyntaxTransform(input, 'dash'), expected);
});

// 14. drift detector — BUILT_IN_AGENT_SHORTNAMES tracks AGENT_SOURCES
check('14. BUILT_IN_AGENT_SHORTNAMES matches AgentCommandGenerator.AGENT_SOURCES (drift gate)', () => {
  const live = AgentCommandGenerator.AGENT_SOURCES.map((s) => s.shortName);
  assert.deepEqual(BUILT_IN_AGENT_SHORTNAMES, live);
});

console.log(`\n${colors.cyan}========================================${colors.reset}`);
console.log(
  `Total: ${passed + failed}, Passed: ${colors.green}${passed}${colors.reset}, Failed: ${failed > 0 ? colors.red : colors.green}${failed}${colors.reset}`,
);
console.log(`${colors.cyan}========================================${colors.reset}\n`);

if (failed > 0) process.exit(1);
