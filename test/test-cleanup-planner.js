/**
 * Cleanup Planner Unit Tests (Phase 7 — pure logic)
 *
 * Verifies:
 *   - isContained(resolved, wsRoot): D-32 realpath containment check
 *   - formatTimestamp(date): D-37 YYYYMMDD-HHMMSS local-time formatter
 *   - LEGACY_AGENT_SHORT_NAMES: D-42 7 known legacy paths, derived from
 *     AgentCommandGenerator.AGENT_SOURCES (NOT duplicated)
 *   - isV11Legacy(wsRoot, gomadDir): D-42 detection of v1.1 install
 *   - uniqueBackupDir(wsRoot, baseTs): Pitfall 21 collision disambiguation
 *   - ManifestCorruptError: custom error class
 *
 * Task 3 adds tests for buildCleanupPlan (the pure plan builder).
 * Task 4 adds tests for the writeFilesManifest D-39 exclusion filter.
 *
 * Usage: node test/test-cleanup-planner.js
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

// Patch prompts logging BEFORE requiring cleanup-planner.js
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

const cleanupPlanner = require(path.join(REPO_ROOT, 'tools', 'installer', 'core', 'cleanup-planner'));
const { AgentCommandGenerator } = require(path.join(REPO_ROOT, 'tools', 'installer', 'ide', 'shared', 'agent-command-generator'));

function resetLogs() {
  errorLog.length = 0;
  warnLog.length = 0;
  infoLog.length = 0;
}

(async () => {
  console.log(`\n${colors.cyan}Cleanup Planner Unit Tests (Phase 7)${colors.reset}\n`);

  // ─── isContained ──────────────────────────────────────────────────────
  const { isContained } = cleanupPlanner;
  const sep = path.sep;

  assert(isContained(`${sep}ws${sep}foo${sep}bar`, `${sep}ws`), 'isContained: descendant returns true');
  assert(!isContained(`${sep}etc${sep}passwd`, `${sep}ws`), 'isContained: absolute path outside returns false');
  // Construct a traversal-resolved path: /ws/../etc/passwd resolves to /etc/passwd
  assert(!isContained(`${sep}etc${sep}passwd`, `${sep}ws`), 'isContained: /etc/passwd vs /ws returns false (sibling parent)');
  assert(isContained(`${sep}ws`, `${sep}ws`), 'isContained: root itself (rel === "") returns true');
  assert(!isContained(`${sep}ws2${sep}foo`, `${sep}ws`), 'isContained: sibling root returns false');
  assert(!isContained(`${sep}ws-suffix${sep}foo`, `${sep}ws`), 'isContained: prefix-collision sibling (/ws-suffix) returns false (defends against startsWith bug)');

  // ─── formatTimestamp ──────────────────────────────────────────────────
  const { formatTimestamp } = cleanupPlanner;
  const ts1 = formatTimestamp(new Date(2026, 3, 20, 14, 30, 52)); // April 20, 2026 14:30:52 local
  assert(ts1 === '20260420-143052', `formatTimestamp: April 20 2026 14:30:52 → 20260420-143052 (got ${ts1})`);
  const ts2 = formatTimestamp(new Date(2026, 0, 5, 3, 7, 9)); // Jan 5, 2026 03:07:09 local — zero-pad
  assert(ts2 === '20260105-030709', `formatTimestamp: Jan 5 2026 03:07:09 → 20260105-030709 (got ${ts2})`);
  assert(/^\d{8}-\d{6}$/.test(ts1) && /^\d{8}-\d{6}$/.test(ts2), 'formatTimestamp: matches /^\\d{8}-\\d{6}$/');

  // ─── LEGACY_AGENT_SHORT_NAMES ─────────────────────────────────────────
  const { LEGACY_AGENT_SHORT_NAMES } = cleanupPlanner;
  assert(Array.isArray(LEGACY_AGENT_SHORT_NAMES), 'LEGACY_AGENT_SHORT_NAMES: is an array');
  assert(LEGACY_AGENT_SHORT_NAMES.length === 7, `LEGACY_AGENT_SHORT_NAMES: has exactly 7 entries (got ${LEGACY_AGENT_SHORT_NAMES.length})`);
  const expected = ['analyst', 'tech-writer', 'pm', 'ux-designer', 'architect', 'sm', 'dev'];
  assert(JSON.stringify(LEGACY_AGENT_SHORT_NAMES) === JSON.stringify(expected), `LEGACY_AGENT_SHORT_NAMES: matches expected order (got ${JSON.stringify(LEGACY_AGENT_SHORT_NAMES)})`);
  // Verify it's derived from AgentCommandGenerator (NOT duplicated)
  const derived = AgentCommandGenerator.AGENT_SOURCES.map((a) => a.shortName);
  assert(JSON.stringify(LEGACY_AGENT_SHORT_NAMES) === JSON.stringify(derived), 'LEGACY_AGENT_SHORT_NAMES: derived from AgentCommandGenerator.AGENT_SOURCES (not hardcoded)');

  // ─── isV11Legacy ──────────────────────────────────────────────────────
  const { isV11Legacy } = cleanupPlanner;

  // Case 1: manifest exists → false (regardless of legacy dirs)
  {
    const ws = fs.mkdtempSync(path.join(os.tmpdir(), 'gomad-isv11-manifest-'));
    const gomadDir = path.join(ws, '_gomad');
    fs.ensureDirSync(path.join(gomadDir, '_config'));
    fs.writeFileSync(path.join(gomadDir, '_config', 'files-manifest.csv'), 'type,name,module,path,hash,schema_version,install_root\n');
    fs.ensureDirSync(path.join(ws, '.claude', 'skills', 'gm-agent-pm')); // legacy dir present too
    const result = await isV11Legacy(ws, gomadDir);
    assert(result === false, 'isV11Legacy: manifest present → false (even with legacy dirs)');
  }

  // Case 2: no manifest, ≥1 legacy dir present → true
  {
    const ws = fs.mkdtempSync(path.join(os.tmpdir(), 'gomad-isv11-legacy-'));
    const gomadDir = path.join(ws, '_gomad');
    fs.ensureDirSync(gomadDir);
    fs.ensureDirSync(path.join(ws, '.claude', 'skills', 'gm-agent-analyst'));
    const result = await isV11Legacy(ws, gomadDir);
    assert(result === true, 'isV11Legacy: no manifest + 1 legacy dir → true');
  }

  // Case 3: no manifest, no legacy dirs → false
  {
    const ws = fs.mkdtempSync(path.join(os.tmpdir(), 'gomad-isv11-clean-'));
    const gomadDir = path.join(ws, '_gomad');
    fs.ensureDirSync(gomadDir);
    const result = await isV11Legacy(ws, gomadDir);
    assert(result === false, 'isV11Legacy: no manifest + no legacy dirs → false');
  }

  // ─── uniqueBackupDir ──────────────────────────────────────────────────
  const { uniqueBackupDir } = cleanupPlanner;

  // Case 1: no collision → returns base path
  {
    const ws = fs.mkdtempSync(path.join(os.tmpdir(), 'gomad-uniq-1-'));
    const result = await uniqueBackupDir(ws, '20260420-143052');
    assert(result === path.join(ws, '_gomad', '_backups', '20260420-143052'), `uniqueBackupDir: no collision returns base (got ${result})`);
  }

  // Case 2: base exists → returns -2
  {
    const ws = fs.mkdtempSync(path.join(os.tmpdir(), 'gomad-uniq-2-'));
    fs.ensureDirSync(path.join(ws, '_gomad', '_backups', '20260420-143052'));
    const result = await uniqueBackupDir(ws, '20260420-143052');
    assert(result === path.join(ws, '_gomad', '_backups', '20260420-143052-2'), `uniqueBackupDir: collision returns -2 (got ${result})`);
  }

  // Case 3: base + -2 exist → returns -3
  {
    const ws = fs.mkdtempSync(path.join(os.tmpdir(), 'gomad-uniq-3-'));
    fs.ensureDirSync(path.join(ws, '_gomad', '_backups', '20260420-143052'));
    fs.ensureDirSync(path.join(ws, '_gomad', '_backups', '20260420-143052-2'));
    const result = await uniqueBackupDir(ws, '20260420-143052');
    assert(result === path.join(ws, '_gomad', '_backups', '20260420-143052-3'), `uniqueBackupDir: -2 collision returns -3 (got ${result})`);
  }

  // ─── ManifestCorruptError ─────────────────────────────────────────────
  const { ManifestCorruptError } = cleanupPlanner;
  const e1 = new ManifestCorruptError('test message');
  assert(e1 instanceof Error, 'ManifestCorruptError: extends Error');
  assert(e1 instanceof ManifestCorruptError, 'ManifestCorruptError: instanceof self');
  assert(e1.name === 'ManifestCorruptError', `ManifestCorruptError: name (got ${e1.name})`);
  assert(e1.code === 'MANIFEST_CORRUPT', `ManifestCorruptError: default code (got ${e1.code})`);
  assert(e1.message === 'test message', 'ManifestCorruptError: message preserved');
  const e2 = new ManifestCorruptError('escape', 'CONTAINMENT_FAIL');
  assert(e2.code === 'CONTAINMENT_FAIL', 'ManifestCorruptError: custom code accepted');

  // ─── Final ─────────────────────────────────────────────────────────────
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
})().catch((e) => {
  console.error(`${colors.red}FATAL:${colors.reset}`, e);
  process.exit(2);
});
