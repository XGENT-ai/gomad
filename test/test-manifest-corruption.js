/**
 * Manifest Corruption Classification Test (Phase 7 D-33)
 *
 * Verifies that Installer.readFilesManifest correctly classifies parser
 * outcomes per D-33:
 *  - Whole-manifest corrupt (csv-parse error): MANIFEST_CORRUPT log + return []
 *  - Per-row corrupt (missing required column / empty path): CORRUPT_ROW log + skip
 *  - Normalization (BOM, CRLF): silent — parses cleanly with no log spam
 *  - Valid v2 manifest: returns rows with all 7 columns populated
 *  - Duplicate paths: NOT a reader concern — both rows returned
 *
 * Fixtures live in test/fixtures/phase-07/manifests/.
 *
 * Usage: node test/test-manifest-corruption.js
 */

'use strict';

const path = require('node:path');
const os = require('node:os');
const fs = require('fs-extra');

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

const REPO_ROOT = path.resolve(__dirname, '..');
const FIXTURE_DIR = path.join(REPO_ROOT, 'test', 'fixtures', 'phase-07', 'manifests');

// Patch prompts logging BEFORE requiring installer.js (which captures the prompts ref)
const prompts = require(path.join(REPO_ROOT, 'tools', 'installer', 'prompts'));
const errorLog = [];
const warnLog = [];
const infoLog = [];
prompts.log.error = async (msg) => {
  errorLog.push(String(msg));
};
prompts.log.warn = async (msg) => {
  warnLog.push(String(msg));
};
prompts.log.info = async (msg) => {
  infoLog.push(String(msg));
};

const { Installer } = require(path.join(REPO_ROOT, 'tools', 'installer', 'core', 'installer'));

/**
 * Build a temp gomadDir containing a single _config/files-manifest.csv copied
 * from a fixture file. Returns the absolute path to gomadDir.
 *
 * @param {string} fixtureName - file under test/fixtures/phase-07/manifests/
 * @returns {Promise<string>}
 */
async function makeTempGomadFromFixture(fixtureName) {
  const ws = fs.mkdtempSync(path.join(os.tmpdir(), 'gomad-manifest-corruption-'));
  const gomadDir = path.join(ws, '_gomad');
  await fs.ensureDir(path.join(gomadDir, '_config'));
  await fs.copy(path.join(FIXTURE_DIR, fixtureName), path.join(gomadDir, '_config', 'files-manifest.csv'));
  return gomadDir;
}

function resetLogs() {
  errorLog.length = 0;
  warnLog.length = 0;
  infoLog.length = 0;
}

(async () => {
  console.log(`\n${colors.cyan}Manifest Corruption Classification Test (Phase 7 D-33)${colors.reset}\n`);

  const installer = new Installer();

  // ─── Test: empty manifest file ───────────────────────────────────────
  resetLogs();
  {
    const ws = fs.mkdtempSync(path.join(os.tmpdir(), 'gomad-manifest-empty-'));
    const gomadDir = path.join(ws, '_gomad');
    await fs.ensureDir(path.join(gomadDir, '_config'));
    await fs.writeFile(path.join(gomadDir, '_config', 'files-manifest.csv'), '');
    const rows = await installer.readFilesManifest(gomadDir);
    assert(Array.isArray(rows) && rows.length === 0, 'empty manifest → returns []', `Got ${JSON.stringify(rows)}`);
    assert(errorLog.length === 0, 'empty manifest → no error log', `errorLog: ${errorLog.join('; ')}`);
    assert(warnLog.length === 0, 'empty manifest → no warn log', `warnLog: ${warnLog.join('; ')}`);
  }

  // ─── Test: missing manifest file ───────────────────────────────────────
  resetLogs();
  {
    const ws = fs.mkdtempSync(path.join(os.tmpdir(), 'gomad-manifest-missing-'));
    const gomadDir = path.join(ws, '_gomad');
    await fs.ensureDir(gomadDir);
    const rows = await installer.readFilesManifest(gomadDir);
    assert(rows.length === 0, 'missing manifest → returns []');
    assert(errorLog.length === 0, 'missing manifest → no error log');
  }

  // ─── Test: BOM-prefixed valid manifest ───────────────────────────────
  resetLogs();
  {
    const gomadDir = await makeTempGomadFromFixture('corrupt-bom.csv');
    const rows = await installer.readFilesManifest(gomadDir);
    assert(rows.length === 2, 'BOM fixture → parses successfully (returns 2 rows)', `Got ${rows.length} rows`);
    assert(errorLog.length === 0, 'BOM fixture → no error log (BOM is normalization)', `errorLog: ${errorLog.join('; ')}`);
    assert(warnLog.length === 0, 'BOM fixture → no warn log', `warnLog: ${warnLog.join('; ')}`);
    // First row's `type` field MUST be `file` not `\uFEFFfile` — the BOM was stripped
    assert(
      rows[0] && rows[0].type === 'file',
      'BOM fixture → first column header is `type` (not BOM-prefixed)',
      `Got type=${JSON.stringify(rows[0] && rows[0].type)}`,
    );
    assert(rows[0] && rows[0].install_root === '_gomad', 'BOM fixture → install_root parsed correctly');
  }

  // ─── Test: CRLF line endings ──────────────────────────────────────────
  resetLogs();
  {
    const gomadDir = await makeTempGomadFromFixture('corrupt-crlf.csv');
    const rows = await installer.readFilesManifest(gomadDir);
    assert(rows.length === 2, 'CRLF fixture → parses successfully (returns 2 rows)', `Got ${rows.length} rows`);
    assert(errorLog.length === 0, 'CRLF fixture → no error log (CRLF is normalization)', `errorLog: ${errorLog.join('; ')}`);
    assert(warnLog.length === 0, 'CRLF fixture → no warn log');
  }

  // ─── Test: unclosed-quote manifest → MANIFEST_CORRUPT ─────────────────
  resetLogs();
  {
    const gomadDir = await makeTempGomadFromFixture('corrupt-quote.csv');
    const rows = await installer.readFilesManifest(gomadDir);
    assert(rows.length === 0, 'unclosed-quote fixture → returns []');
    assert(
      errorLog.some((m) => m.startsWith('MANIFEST_CORRUPT:')),
      'unclosed-quote fixture → emits MANIFEST_CORRUPT: log',
      `errorLog: ${JSON.stringify(errorLog)}`,
    );
  }

  // ─── Test: wrong-arity manifest → MANIFEST_CORRUPT ─────────────────
  resetLogs();
  {
    const gomadDir = await makeTempGomadFromFixture('corrupt-arity.csv');
    const rows = await installer.readFilesManifest(gomadDir);
    assert(rows.length === 0, 'wrong-arity fixture → returns []');
    assert(
      errorLog.some((m) => m.startsWith('MANIFEST_CORRUPT:')),
      'wrong-arity fixture → emits MANIFEST_CORRUPT: log',
      `errorLog: ${JSON.stringify(errorLog)}`,
    );
  }

  // ─── Test: malformed header → MANIFEST_CORRUPT ─────────────────────
  resetLogs();
  {
    const gomadDir = await makeTempGomadFromFixture('corrupt-header.csv');
    const rows = await installer.readFilesManifest(gomadDir);
    assert(rows.length === 0, 'malformed-header fixture → returns []');
    assert(
      errorLog.some((m) => m.startsWith('MANIFEST_CORRUPT:')),
      'malformed-header fixture → emits MANIFEST_CORRUPT: log',
      `errorLog: ${JSON.stringify(errorLog)}`,
    );
  }

  // ─── Test: row missing required cell → CORRUPT_ROW ──────────────────
  resetLogs();
  {
    const gomadDir = await makeTempGomadFromFixture('corrupt-row-missing.csv');
    const rows = await installer.readFilesManifest(gomadDir);
    // 3 rows in fixture; middle row has empty `name` — that one is skipped
    assert(
      rows.length === 2,
      'row-missing-required fixture → returns 2 valid rows (1 skipped)',
      `Got ${rows.length}: ${JSON.stringify(rows.map((r) => r.name))}`,
    );
    assert(
      warnLog.some((m) => /^CORRUPT_ROW: row \d+: missing column/.test(m)),
      'row-missing-required fixture → emits CORRUPT_ROW: log',
      `warnLog: ${JSON.stringify(warnLog)}`,
    );
    assert(errorLog.length === 0, 'row-missing-required fixture → no MANIFEST_CORRUPT (per-row, not whole-manifest)');
    // Confirm the surviving rows are the right ones
    const names = new Set(rows.map((r) => r.name).sort());
    assert(names.has('pm') && names.has('agent-pm'), 'row-missing-required fixture → surviving rows are `pm` and `agent-pm`');
  }

  // ─── Test: row with empty path value → CORRUPT_ROW ───────────────────
  resetLogs();
  {
    const gomadDir = await makeTempGomadFromFixture('corrupt-empty-path.csv');
    const rows = await installer.readFilesManifest(gomadDir);
    assert(rows.length === 2, 'empty-path fixture → returns 2 valid rows (1 skipped)', `Got ${rows.length}`);
    assert(
      warnLog.some((m) => /^CORRUPT_ROW: row \d+:/.test(m)),
      'empty-path fixture → emits CORRUPT_ROW: log',
      `warnLog: ${JSON.stringify(warnLog)}`,
    );
  }

  // ─── Test: duplicate-path manifest → both rows returned ──────────────
  resetLogs();
  {
    const gomadDir = await makeTempGomadFromFixture('duplicate-paths.csv');
    const rows = await installer.readFilesManifest(gomadDir);
    assert(rows.length === 2, 'duplicate-paths fixture → returns both rows (de-dup is planner concern)', `Got ${rows.length}`);
    assert(warnLog.length === 0, 'duplicate-paths fixture → no warn log');
    assert(errorLog.length === 0, 'duplicate-paths fixture → no error log');
  }

  // ─── Test: valid v2 manifest → all 7 columns populated ───────────────
  resetLogs();
  {
    const gomadDir = await makeTempGomadFromFixture('valid-v2.csv');
    const rows = await installer.readFilesManifest(gomadDir);
    assert(rows.length === 3, 'valid-v2 fixture → returns 3 rows', `Got ${rows.length}`);
    assert(errorLog.length === 0, 'valid-v2 fixture → no error log');
    assert(warnLog.length === 0, 'valid-v2 fixture → no warn log');
    // Verify all required columns populated on each row
    const allValid = rows.every(
      (r) =>
        r.type &&
        r.name &&
        r.path &&
        r.install_root &&
        r.schema_version === '2.0' &&
        typeof r.absolutePath === 'string' &&
        r.absolutePath.length > 0,
    );
    assert(allValid, 'valid-v2 fixture → every row has type, name, path, install_root, schema_version=2.0, absolutePath');
    // Verify install_root values
    const roots = rows.map((r) => r.install_root).sort();
    assert(
      JSON.stringify(roots) === JSON.stringify(['.claude', '.cursor', '_gomad']),
      'valid-v2 fixture → install_root values cover _gomad, .claude, .cursor',
      `Got ${JSON.stringify(roots)}`,
    );
  }

  // ─── Final ─────────────────────────────────────────────────────────────
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
})().catch((error) => {
  console.error(`${colors.red}FATAL:${colors.reset}`, error);
  process.exit(2);
});
