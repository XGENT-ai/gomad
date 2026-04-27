/**
 * Orphan Reference Regression Gate
 *
 * Fails (exit 1) on any `gm-agent-*` string in the source tree that is not
 * covered by `test/fixtures/orphan-refs/allowlist.json`. Ensures the Phase 9
 * sweep (REF-01) stays landed and that filesystem-path / frontmatter refs
 * (REF-02 / REF-04 invariants) continue to be classified as legitimate.
 *
 * Usage: node test/test-orphan-refs.js
 *        npm run test:orphan-refs
 */

const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');

const colors = {
  reset: '\u001B[0m',
  green: '\u001B[32m',
  red: '\u001B[31m',
  cyan: '\u001B[36m',
  dim: '\u001B[2m',
};

const REPO_ROOT = path.resolve(__dirname, '..');
const ALLOWLIST_PATH = path.join(__dirname, 'fixtures', 'orphan-refs', 'allowlist.json');

let totalTests = 0;
let passedTests = 0;
const failures = [];

function test(name, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  ${colors.green}\u2713${colors.reset} ${name}`);
  } catch (error) {
    console.log(`  ${colors.red}\u2717${colors.reset} ${name}`);
    console.log(`    ${colors.dim}${error.message}${colors.reset}`);
    failures.push({ name, message: error.message });
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function runGrep() {
  // Grep scope per D-67: exclude node_modules, .git, archived planning, milestones.
  // Also exclude .claude (gitignored tooling directory — holds ephemeral runtime
  // state including agent worktrees that snapshot past/parallel working copies)
  // and build/ (gitignored docs build artifact — generated HTML duplicates the
  // gm-agent-* surface from src/ and would double-count every legitimate ref).
  // Include all file types relevant to the user-visible surface (README.md,
  // README_CN.md, docs/, website/ are intentionally IN scope per REF-05 — the
  // gate must bite any future `gm-agent-` regression in user-facing docs).
  let grepOutput = '';
  try {
    grepOutput = execSync(
      `grep -rn 'gm-agent-' . ` +
        `--exclude-dir=node_modules --exclude-dir=.git --exclude-dir=.planning ` +
        `--exclude-dir=.claude --exclude-dir=build ` +
        `--exclude-dir='old-milestone-*' --exclude-dir=dist --exclude-dir=coverage ` +
        `2>/dev/null`,
      { cwd: REPO_ROOT, encoding: 'utf8' },
    );
  } catch {
    return [];
  }
  return grepOutput.split('\n').filter((l) => l.length > 0);
}

function parseHit(hit) {
  // Format: "./path/to/file.ext:NN:matched text"
  const m = hit.match(/^\.\/(.+?):(\d+):(.*)$/);
  if (!m) return null;
  return { relPath: m[1], lineNo: parseInt(m[2], 10), lineText: m[3] };
}

function isAllowlisted(parsed, allowlist) {
  return allowlist.some((entry) => {
    if (entry.path !== parsed.relPath) return false;
    if (!entry.lineContainsPattern) return true;
    const pat = entry.lineContainsPattern;
    if (typeof pat === 'string') return parsed.lineText.includes(pat);
    try {
      return new RegExp(pat).test(parsed.lineText);
    } catch {
      return false;
    }
  });
}

function printContext(parsed) {
  const abs = path.join(REPO_ROOT, parsed.relPath);
  let lines;
  try {
    lines = fs.readFileSync(abs, 'utf8').split('\n');
  } catch (error) {
    console.log(`    ${colors.dim}(could not read file: ${error.message})${colors.reset}`);
    return;
  }
  const start = Math.max(0, parsed.lineNo - 2);
  const end = Math.min(lines.length, parsed.lineNo + 1);
  for (let i = start; i < end; i++) {
    const marker = i + 1 === parsed.lineNo ? `${colors.red}>${colors.reset}` : ' ';
    console.log(`    ${marker} ${i + 1}: ${lines[i]}`);
  }
}

console.log(`${colors.cyan}Orphan Reference Regression Gate (gm-agent-)${colors.reset}`);
console.log(`${colors.dim}Grep scope: repo root, excluding node_modules/.git/.planning/milestones.${colors.reset}\n`);

test('Allowlist fixture parses as JSON array', () => {
  assert(fs.existsSync(ALLOWLIST_PATH), `allowlist missing at ${ALLOWLIST_PATH}`);
  const raw = fs.readFileSync(ALLOWLIST_PATH, 'utf8');
  const parsed = JSON.parse(raw);
  assert(Array.isArray(parsed), 'allowlist must be a JSON array');
  for (const entry of parsed) {
    assert(typeof entry.path === 'string', 'every entry needs a path');
    assert(typeof entry.reason === 'string' && entry.reason.length > 0, 'every entry needs a non-empty reason');
  }
});

const allowlist = JSON.parse(fs.readFileSync(ALLOWLIST_PATH, 'utf8'));
const hits = runGrep();
const unallowlisted = [];

for (const hit of hits) {
  const parsed = parseHit(hit);
  if (!parsed) continue;
  if (!isAllowlisted(parsed, allowlist)) {
    unallowlisted.push({ hit, parsed });
  }
}

test(`Grep output clean: ${hits.length} total hits, 0 unallowlisted`, () => {
  if (unallowlisted.length === 0) return;
  console.log(`\n${colors.red}${unallowlisted.length} unallowlisted hit(s):${colors.reset}`);
  for (const { parsed } of unallowlisted) {
    console.log(`\n  ${colors.red}\u2717${colors.reset} ${parsed.relPath}:${parsed.lineNo}`);
    printContext(parsed);
  }
  throw new Error(`${unallowlisted.length} unallowlisted gm-agent- reference(s) found`);
});

console.log(`\n${colors.cyan}Summary${colors.reset}`);
console.log(`  ${passedTests}/${totalTests} tests passed, ${failures.length} failed`);
console.log(
  `  ${colors.dim}Total grep hits: ${hits.length}, allowlisted: ${hits.length - unallowlisted.length}, unallowlisted: ${unallowlisted.length}${colors.reset}`,
);
process.exit(failures.length > 0 ? 1 : 0);
