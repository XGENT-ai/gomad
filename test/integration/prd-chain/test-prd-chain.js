/**
 * PRD Chain Integration Test
 *
 * Verifies the refined gm-create-prd output shape (Phase 8 SC#5, SC#6, PRD-04..PRD-07):
 *   - Required structural H2 sections present
 *   - FR-NN format (2-digit zero-padded, dash-separated)
 *   - Inline Given/When/Then AC sub-bullets (floor: 2, cap: 4)
 *   - `## Out of Scope` with OOS-NN entries
 *   - Downstream-skill compatibility simulations:
 *       - gm-validate-prd/step-v-12 header scan
 *       - gm-create-epics-and-stories/step-01 "FR1: or similar" FR extraction
 *       - gm-create-architecture/step-02 AC extraction
 *       - gm-check-implementation-readiness/step-01 deterministic-prerequisites check
 *
 * Phase 9 is a negative-fixture self-test: a known-bad in-memory PRD snippet
 * must be rejected by the format checks (Pitfall 6 — prevent overly-permissive regex drift).
 *
 * Deterministic, fast (<30s), CI-safe. Zero LLM calls, zero new deps.
 *
 * Usage: node test/integration/prd-chain/test-prd-chain.js
 */

const path = require('node:path');
const fs = require('fs-extra');
const yaml = require('js-yaml');

// ANSI colors (mirrors test-gm-command-surface.js:33-41)
const colors = {
  reset: '\u001B[0m',
  green: '\u001B[32m',
  red: '\u001B[31m',
  yellow: '\u001B[33m',
  cyan: '\u001B[36m',
  dim: '\u001B[2m',
};

let passed = 0;
let failed = 0;

function assert(condition, testName, errorMessage = '') {
  if (condition) {
    console.log(`${colors.green}\u2713${colors.reset} ${testName}`);
    passed++;
  } else {
    console.log(`${colors.red}\u2717${colors.reset} ${testName}`);
    if (errorMessage) {
      console.log(`  ${colors.dim}${errorMessage}${colors.reset}`);
    }
    failed++;
  }
}

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const FIXTURE_PATH = path.join(__dirname, 'fixture-refined-prd.md');

// Structural contract — step-v-12 header scan
const REQUIRED_SECTIONS = [
  '## Executive Summary',
  '## Success Criteria',
  '## Product Scope',
  '## User Journeys',
  '## Functional Requirements',
  '## Out of Scope',
  '## Non-Functional Requirements',
];

console.log(`\n${colors.cyan}PRD Chain Integration Test${colors.reset}\n`);
console.log(`${colors.dim}Repo root: ${REPO_ROOT}${colors.reset}`);

// ─── Load fixture ────────────────────────────────────────────────────────
assert(fs.existsSync(FIXTURE_PATH), 'Fixture file exists at expected path', `Checked: ${FIXTURE_PATH}`);
if (!fs.existsSync(FIXTURE_PATH)) {
  console.log(`\n${colors.red}Cannot continue without fixture.${colors.reset}\n`);
  process.exit(1);
}

const raw = fs.readFileSync(FIXTURE_PATH, 'utf8');
const fmMatch = raw.match(/^---\n([\s\S]*?)\n---/);
assert(Boolean(fmMatch), 'Fixture has YAML frontmatter');

let frontmatter = {};
try {
  frontmatter = fmMatch ? yaml.load(fmMatch[1]) : {};
  assert(true, 'Fixture frontmatter parses as YAML');
} catch (error) {
  assert(false, 'Fixture frontmatter parses as YAML', error.message);
}

const body = fmMatch ? raw.slice(fmMatch[0].length) : raw;

// ─── Phase 1 — Structural sections (step-v-12 contract) ─────────────────
console.log(`\n${colors.cyan}Phase 1 — Structural sections${colors.reset}`);

for (const header of REQUIRED_SECTIONS) {
  const escaped = header.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
  const headerPattern = new RegExp(`^${escaped}$`, 'gm');
  const matches = body.match(headerPattern) || [];
  assert(matches.length === 1, `${header} present exactly once (found ${matches.length})`);
}

// Section order — Out of Scope MUST sit between Functional and Non-Functional Requirements
const idxFR = body.indexOf('## Functional Requirements');
const idxOOS = body.indexOf('## Out of Scope');
const idxNFR = body.indexOf('## Non-Functional Requirements');
assert(
  idxFR !== -1 && idxOOS > idxFR && idxNFR > idxOOS,
  'Section order: Functional Requirements -> Out of Scope -> Non-Functional Requirements',
  `idxFR=${idxFR}, idxOOS=${idxOOS}, idxNFR=${idxNFR}`,
);

// ─── Phase 2 — FR-NN format (D-44) ──────────────────────────────────────
console.log(`\n${colors.cyan}Phase 2 — FR-NN format${colors.reset}`);

const frMatches = body.match(/^- FR-\d{2}:/gm) || [];
assert(frMatches.length > 0, `Fixture contains at least one FR-NN block (found ${frMatches.length})`);

// Negative guard — legacy formats must be absent
assert(!/^- FR\d+:/m.test(body), 'No legacy unpadded FR format (FR1:, FR2:, ...)');
assert(!/^- FR-\d:(?!\d)/m.test(body), 'No legacy single-digit FR-N format (FR-1:, FR-2:, ...)');

// ─── Phase 3 — AC density + Given/When/Then form (D-45, D-46, D-47) ─────
console.log(`\n${colors.cyan}Phase 3 — AC density and Gherkin form${colors.reset}`);

function extractFRBlocks(text) {
  const lines = text.split('\n');
  const blocks = [];
  let current = null;
  for (const line of lines) {
    if (/^- FR-\d{2}:/.test(line)) {
      if (current) blocks.push(current);
      current = { fr: line, acs: [] };
    } else if (current && /^ {4}- AC:/.test(line)) {
      current.acs.push(line);
    } else if (current && line.startsWith('##')) {
      blocks.push(current);
      current = null;
    }
  }
  if (current) blocks.push(current);
  return blocks;
}

const frBlocks = extractFRBlocks(body);
assert(frBlocks.length > 0, `extractFRBlocks produces FR blocks (count: ${frBlocks.length})`);

for (const block of frBlocks) {
  assert(block.acs.length >= 2, `${block.fr.slice(0, 50)}... has >=2 AC sub-bullets`, `Got ${block.acs.length}`);
  assert(block.acs.length <= 4, `${block.fr.slice(0, 50)}... has <=4 AC sub-bullets`, `Got ${block.acs.length}`);
  for (const ac of block.acs) {
    assert(/Given .+, when .+, then .+/i.test(ac), `AC in Given/When/Then form: ${ac.slice(0, 80)}...`, `Line: ${ac}`);
  }
}

// ─── Phase 4 — Out of Scope (D-58) ──────────────────────────────────────
console.log(`\n${colors.cyan}Phase 4 — Out of Scope${colors.reset}`);

// Extract OOS block body between `## Out of Scope` and the next `## ` header (or EOF).
// Note: using `\n## ` as the end anchor, which consumes the separator; if no next
// `## ` exists, fall back to end-of-string. Multiline `$` only matches end-of-line,
// not end-of-input, so we use an explicit `\n*\Z`-style fallback via `[\s\S]*` without
// a greedy trap by anchoring to the literal next-section header.
const oosBlockRegex = /## Out of Scope\n([\s\S]*?)(?:\n## |\s*$)/;
const oosBlockMatch = body.match(oosBlockRegex);
assert(Boolean(oosBlockMatch), 'Out of Scope block extractable');

if (oosBlockMatch) {
  const oosLines = oosBlockMatch[1].split('\n').filter((l) => l.trim().startsWith('- '));
  assert(oosLines.length > 0, `Out of Scope has >=1 entry (found ${oosLines.length})`);
  // Accept en-dash (U+2013), em-dash (U+2014), or regular hyphen as separator (Reason marker)
  const OOS_ENTRY_REGEX = /^- \*\*OOS-\d{2}\*\*: .+ (—|-|–) Reason: .+/;
  for (const line of oosLines) {
    assert(OOS_ENTRY_REGEX.test(line), 'OOS line format: `- **OOS-NN**: <capability> — Reason: <why>`', line);
  }
}

// ─── Phase 5 — Validator-sim: step-v-12 header scan ─────────────────────
console.log(`\n${colors.cyan}Phase 5 — Validator-sim (step-v-12 header scan)${colors.reset}`);

// Mirrors the validator's completeness check shape — header names scanned verbatim.
for (const header of REQUIRED_SECTIONS) {
  assert(body.includes(header), `[validator-sim] ${header} discoverable`);
}

// ─── Phase 6 — Epics-sim: step-01 "FR1: or similar" FR extraction ────────
console.log(`\n${colors.cyan}Phase 6 — Epics-sim (FR extraction)${colors.reset}`);

// gm-create-epics-and-stories/steps/step-01-validate-prerequisites.md:80
// "Look for numbered items like 'FR1:', 'Functional Requirement 1:', or similar"
// D-44's FR-01: matches via the "or similar" clause.
const epicsSeenFRs = [];
for (const line of body.split('\n')) {
  const m = line.match(/^- (FR-\d{2}): (.+)$/);
  if (m) epicsSeenFRs.push({ id: m[1], text: m[2] });
}
assert(epicsSeenFRs.length > 0, `[epics-sim] would extract >=1 FR (count: ${epicsSeenFRs.length})`);
assert(
  epicsSeenFRs.every((f) => /^FR-\d{2}$/.test(f.id)),
  '[epics-sim] every extracted FR ID matches FR-NN shape',
);

// ─── Phase 7 — Architect-sim: step-02-context.md:64 AC extraction ────────
console.log(`\n${colors.cyan}Phase 7 — Architect-sim (AC extraction)${colors.reset}`);

// gm-create-architecture/steps/step-02-context.md:64
// "Extract acceptance criteria for technical implications"
// D-45 inline AC sub-bullets surface through this path.
const totalAcs = frBlocks.reduce((acc, b) => acc + b.acs.length, 0);
assert(totalAcs >= frBlocks.length * 2, `[architect-sim] total AC count >= 2x FR count (${totalAcs} >= ${frBlocks.length * 2})`);

// ─── Phase 8 — Readiness-sim: deterministic prerequisites check (D-50) ───
console.log(`\n${colors.cyan}Phase 8 — Readiness-sim (deterministic prerequisites)${colors.reset}`);

assert(frontmatter.workflowType === 'prd', "[readiness-sim] frontmatter workflowType === 'prd'");
assert(Array.isArray(frontmatter.stepsCompleted), '[readiness-sim] frontmatter stepsCompleted is array');
assert(
  Array.isArray(frontmatter.stepsCompleted) && frontmatter.stepsCompleted.includes('step-12-complete'),
  '[readiness-sim] stepsCompleted includes step-12-complete (PRD finalized)',
);

// ─── Phase 9 — Negative-fixture self-test (Pitfall 6 mitigation) ────────
console.log(`\n${colors.cyan}Phase 9 — Negative-fixture self-test${colors.reset}`);

const badFixture = [
  '## Functional Requirements',
  '',
  '- FR1: User can do a thing', // legacy unpadded — must be rejected
  '    - AC: Given ..., when ..., then ...',
  '',
  '- FR2: Another thing', // legacy unpadded
  '    - AC: Given ..., when ..., then ...',
  '',
  '## Non-Functional Requirements',
  '',
  '- NFR-01: placeholder',
  '',
].join('\n');

// Assertion: FR-NN negative guard MUST detect the legacy format.
const legacyUnpadded = /^- FR\d+:/m.test(badFixture);
assert(legacyUnpadded === true, String.raw`Negative-fixture detector: flags legacy unpadded FR\d+: format`);

// Assertion: our positive extractor MUST find zero FR-NN blocks in the bad fixture.
const badBlocks = extractFRBlocks(badFixture);
assert(badBlocks.length === 0, 'Negative-fixture detector: extracts zero FR-NN blocks from legacy-format input');

// Assertion: OOS block is missing from the bad fixture.
const badOosMatch = badFixture.match(/^## Out of Scope\n/m);
assert(!badOosMatch, 'Negative-fixture detector: confirms absence of ## Out of Scope in legacy fixture');

// ─── Summary ────────────────────────────────────────────────────────────
console.log(
  `\n${colors.cyan}Results:${colors.reset} ${colors.green}${passed} passed${colors.reset}, ${colors.red}${failed} failed${colors.reset}\n`,
);

process.exit(failed > 0 ? 1 : 0);
