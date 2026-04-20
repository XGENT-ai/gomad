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
  assert(
    !isContained(`${sep}ws-suffix${sep}foo`, `${sep}ws`),
    'isContained: prefix-collision sibling (/ws-suffix) returns false (defends against startsWith bug)',
  );

  // ─── formatTimestamp ──────────────────────────────────────────────────
  const { formatTimestamp } = cleanupPlanner;
  const ts1 = formatTimestamp(new Date(2026, 3, 20, 14, 30, 52)); // April 20, 2026 14:30:52 local
  assert(ts1 === '20260420-143052', `formatTimestamp: April 20 2026 14:30:52 → 20260420-143052 (got ${ts1})`);
  const ts2 = formatTimestamp(new Date(2026, 0, 5, 3, 7, 9)); // Jan 5, 2026 03:07:09 local — zero-pad
  assert(ts2 === '20260105-030709', `formatTimestamp: Jan 5 2026 03:07:09 → 20260105-030709 (got ${ts2})`);
  assert(/^\d{8}-\d{6}$/.test(ts1) && /^\d{8}-\d{6}$/.test(ts2), String.raw`formatTimestamp: matches /^\d{8}-\d{6}$/`);

  // ─── LEGACY_AGENT_SHORT_NAMES ─────────────────────────────────────────
  const { LEGACY_AGENT_SHORT_NAMES } = cleanupPlanner;
  assert(Array.isArray(LEGACY_AGENT_SHORT_NAMES), 'LEGACY_AGENT_SHORT_NAMES: is an array');
  assert(LEGACY_AGENT_SHORT_NAMES.length === 7, `LEGACY_AGENT_SHORT_NAMES: has exactly 7 entries (got ${LEGACY_AGENT_SHORT_NAMES.length})`);
  const expected = ['analyst', 'tech-writer', 'pm', 'ux-designer', 'architect', 'sm', 'dev'];
  assert(
    JSON.stringify(LEGACY_AGENT_SHORT_NAMES) === JSON.stringify(expected),
    `LEGACY_AGENT_SHORT_NAMES: matches expected order (got ${JSON.stringify(LEGACY_AGENT_SHORT_NAMES)})`,
  );
  // Verify it's derived from AgentCommandGenerator (NOT duplicated)
  const derived = AgentCommandGenerator.AGENT_SOURCES.map((a) => a.shortName);
  assert(
    JSON.stringify(LEGACY_AGENT_SHORT_NAMES) === JSON.stringify(derived),
    'LEGACY_AGENT_SHORT_NAMES: derived from AgentCommandGenerator.AGENT_SOURCES (not hardcoded)',
  );

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

  // ─── buildCleanupPlan ─────────────────────────────────────────────────
  const { buildCleanupPlan } = cleanupPlanner;
  const { ManifestGenerator } = require(path.join(REPO_ROOT, 'tools', 'installer', 'core', 'manifest-generator'));

  /**
   * Helper: build a workspace tempdir whose realpath we resolve immediately
   * (so containment checks compare realpath-to-realpath on macOS where
   * /tmp itself is a symlink to /private/tmp).
   */
  function makeRealWs(prefix) {
    const ws = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
    return fs.realpathSync(ws);
  }

  // Case A: empty inputs → empty plan, reason='manifest_cleanup'
  resetLogs();
  {
    const ws = makeRealWs('gomad-plan-empty-');
    const plan = await buildCleanupPlan({
      priorManifest: [],
      newInstallSet: new Set(),
      workspaceRoot: ws,
      allowedRoots: new Set(['_gomad', '.claude']),
      isV11Legacy: false,
    });
    assert(Array.isArray(plan.to_snapshot) && plan.to_snapshot.length === 0, 'buildCleanupPlan empty: to_snapshot=[]');
    assert(Array.isArray(plan.to_remove) && plan.to_remove.length === 0, 'buildCleanupPlan empty: to_remove=[]');
    assert(Array.isArray(plan.to_write) && plan.to_write.length === 0, 'buildCleanupPlan empty: to_write=[]');
    assert(Array.isArray(plan.refused) && plan.refused.length === 0, 'buildCleanupPlan empty: refused=[]');
    assert(plan.reason === 'manifest_cleanup', `buildCleanupPlan empty: reason='manifest_cleanup' (got ${plan.reason})`);
    // Plan keys exactly match expected shape
    const keys = Object.keys(plan).sort();
    assert(
      JSON.stringify(keys) === JSON.stringify(['reason', 'refused', 'to_remove', 'to_snapshot', 'to_write']),
      `buildCleanupPlan: plan has exact keys (got ${JSON.stringify(keys)})`,
    );
  }

  // Case B: still-needed entry preserved
  resetLogs();
  {
    const ws = makeRealWs('gomad-plan-still-needed-');
    fs.ensureDirSync(path.join(ws, '_gomad', 'gomad', 'agents'));
    const filePath = path.join(ws, '_gomad', 'gomad', 'agents', 'pm.md');
    fs.writeFileSync(filePath, 'persona-content');
    const realFilePath = fs.realpathSync(filePath);
    const priorManifest = [
      {
        type: 'file',
        name: 'pm',
        module: 'gomad',
        path: 'gomad/agents/pm.md',
        hash: null,
        schema_version: '2.0',
        install_root: '_gomad',
        absolutePath: filePath,
      },
    ];
    const plan = await buildCleanupPlan({
      priorManifest,
      newInstallSet: new Set([realFilePath]), // still needed
      workspaceRoot: ws,
      allowedRoots: new Set(['_gomad', '.claude']),
      isV11Legacy: false,
    });
    assert(plan.to_remove.length === 0, 'buildCleanupPlan still-needed: to_remove is empty');
    assert(plan.to_snapshot.length === 0, 'buildCleanupPlan still-needed: to_snapshot is empty');
  }

  // Case C: stale entry → snapshot + remove with hash check (was_modified=false when match)
  resetLogs();
  {
    const ws = makeRealWs('gomad-plan-stale-match-');
    fs.ensureDirSync(path.join(ws, '_gomad', 'gomad', 'agents'));
    const filePath = path.join(ws, '_gomad', 'gomad', 'agents', 'old-agent.md');
    fs.writeFileSync(filePath, 'old-content');
    const realFilePath = fs.realpathSync(filePath);
    // Compute the actual hash to set up was_modified=false case
    const hashGen = new ManifestGenerator();
    const actualHash = await hashGen.calculateFileHash(realFilePath);
    const priorManifest = [
      {
        type: 'file',
        name: 'old-agent',
        module: 'gomad',
        path: 'gomad/agents/old-agent.md',
        hash: actualHash,
        schema_version: '2.0',
        install_root: '_gomad',
        absolutePath: filePath,
      },
    ];
    const plan = await buildCleanupPlan({
      priorManifest,
      newInstallSet: new Set(), // not in new install
      workspaceRoot: ws,
      allowedRoots: new Set(['_gomad', '.claude']),
      isV11Legacy: false,
    });
    assert(plan.to_remove.length === 1, 'buildCleanupPlan stale: to_remove has 1');
    assert(plan.to_remove[0] === realFilePath, `buildCleanupPlan stale: to_remove[0] is realpath (got ${plan.to_remove[0]})`);
    assert(plan.to_snapshot.length === 1, 'buildCleanupPlan stale: to_snapshot has 1');
    assert(plan.to_snapshot[0].src === realFilePath, 'buildCleanupPlan stale: snapshot.src is realpath');
    assert(plan.to_snapshot[0].install_root === '_gomad', 'buildCleanupPlan stale: snapshot.install_root preserved');
    assert(
      plan.to_snapshot[0].relative_path === 'gomad/agents/old-agent.md',
      `buildCleanupPlan stale: relative_path posix-normalized (got ${plan.to_snapshot[0].relative_path})`,
    );
    assert(plan.to_snapshot[0].orig_hash === actualHash, 'buildCleanupPlan stale: orig_hash preserved from manifest');
    assert(
      plan.to_snapshot[0].was_modified === false,
      `buildCleanupPlan stale: was_modified=false when on-disk hash matches (got ${plan.to_snapshot[0].was_modified})`,
    );
  }

  // Case D: stale entry with hash mismatch → was_modified=true
  resetLogs();
  {
    const ws = makeRealWs('gomad-plan-stale-mismatch-');
    fs.ensureDirSync(path.join(ws, '_gomad', 'gomad', 'agents'));
    const filePath = path.join(ws, '_gomad', 'gomad', 'agents', 'edited.md');
    fs.writeFileSync(filePath, 'user-edited-content');
    const priorManifest = [
      {
        type: 'file',
        name: 'edited',
        module: 'gomad',
        path: 'gomad/agents/edited.md',
        hash: 'NOTtheRealHash0000000000000000000000000000000000000000000000',
        schema_version: '2.0',
        install_root: '_gomad',
        absolutePath: filePath,
      },
    ];
    const plan = await buildCleanupPlan({
      priorManifest,
      newInstallSet: new Set(),
      workspaceRoot: ws,
      allowedRoots: new Set(['_gomad', '.claude']),
      isV11Legacy: false,
    });
    assert(plan.to_snapshot.length === 1, 'buildCleanupPlan hash-mismatch: to_snapshot has 1');
    assert(
      plan.to_snapshot[0].was_modified === true,
      `buildCleanupPlan hash-mismatch: was_modified=true (got ${plan.to_snapshot[0].was_modified})`,
    );
  }

  // Case E: absolute escape → ManifestCorruptError
  resetLogs();
  {
    const ws = makeRealWs('gomad-plan-escape-abs-');
    const priorManifest = [
      {
        type: 'file',
        name: 'passwd',
        module: 'gomad',
        path: '/etc/passwd',
        hash: null,
        schema_version: '2.0',
        install_root: '_gomad',
        absolutePath: '/etc/passwd', // absolute escape
      },
    ];
    let threw = false;
    let err = null;
    try {
      await buildCleanupPlan({
        priorManifest,
        newInstallSet: new Set(),
        workspaceRoot: ws,
        allowedRoots: new Set(['_gomad', '.claude']),
        isV11Legacy: false,
      });
    } catch (error) {
      threw = true;
      err = error;
    }
    assert(threw && err instanceof cleanupPlanner.ManifestCorruptError, 'buildCleanupPlan absolute-escape: throws ManifestCorruptError');
    assert(
      err && /CONTAINMENT_FAIL/.test(err.message),
      `buildCleanupPlan absolute-escape: message has CONTAINMENT_FAIL (got ${err && err.message})`,
    );
    assert(
      warnLog.some((m) => m.startsWith('SYMLINK_ESCAPE:')),
      'buildCleanupPlan absolute-escape: SYMLINK_ESCAPE logged before throw',
    );
  }

  // Case F: traversal that lands on an EXISTING file outside ws → ManifestCorruptError
  // Construct enough `../` traversals to climb out of the tempdir entirely
  // and resolve to /etc/passwd (which exists on POSIX systems). A non-
  // existent traversal is correctly handled by the ENOENT-skip branch
  // (Pitfall 22) — the test for traversal escape requires a real target.
  resetLogs();
  {
    const ws = makeRealWs('gomad-plan-escape-traverse-');
    // Compute traversals: count of path segments + 1 for safety, escaping ws and any parents.
    const wsParts = ws.split(path.sep).filter(Boolean);
    const ups = '../'.repeat(wsParts.length + 1);
    const escapePath = path.join(ws, '_gomad', ups + 'etc/passwd');
    // Ensure the escape target actually exists; if /etc/passwd is unreadable
    // the realpath will still resolve (it requires existence not readability).
    if (fs.existsSync('/etc/passwd')) {
      const priorManifest = [
        {
          type: 'file',
          name: 'passwd',
          module: 'gomad',
          path: ups + 'etc/passwd',
          hash: null,
          schema_version: '2.0',
          install_root: '_gomad',
          absolutePath: escapePath,
        },
      ];
      let threw = false;
      try {
        await buildCleanupPlan({
          priorManifest,
          newInstallSet: new Set(),
          workspaceRoot: ws,
          allowedRoots: new Set(['_gomad', '.claude']),
          isV11Legacy: false,
        });
      } catch (error) {
        threw = error instanceof cleanupPlanner.ManifestCorruptError;
      }
      assert(threw, 'buildCleanupPlan traverse-escape: throws ManifestCorruptError when traversal lands on /etc/passwd');
    } else {
      console.log(
        `${colors.yellow}skip${colors.reset} buildCleanupPlan traverse-escape: /etc/passwd not present (probably non-POSIX host)`,
      );
    }
  }

  // Case G: symlink to outside → ManifestCorruptError
  resetLogs();
  {
    const ws = makeRealWs('gomad-plan-symlink-escape-');
    fs.ensureDirSync(path.join(ws, '_gomad'));
    // Create a symlink under _gomad pointing OUTSIDE the workspace.
    // Target: real /tmp file (must exist for realpath to resolve).
    const linkTarget = fs.mkdtempSync(path.join(os.tmpdir(), 'gomad-link-target-'));
    const realLinkTarget = fs.realpathSync(linkTarget);
    const linkFile = path.join(realLinkTarget, 'sneaky.md');
    fs.writeFileSync(linkFile, 'outside content');
    const linkPath = path.join(ws, '_gomad', 'escape-link.md');
    fs.symlinkSync(linkFile, linkPath);

    const priorManifest = [
      {
        type: 'file',
        name: 'escape-link',
        module: 'gomad',
        path: 'escape-link.md',
        hash: null,
        schema_version: '2.0',
        install_root: '_gomad',
        absolutePath: linkPath,
      },
    ];
    let threw = false;
    try {
      await buildCleanupPlan({
        priorManifest,
        newInstallSet: new Set(),
        workspaceRoot: ws,
        allowedRoots: new Set(['_gomad', '.claude']),
        isV11Legacy: false,
      });
    } catch (error) {
      threw = error instanceof cleanupPlanner.ManifestCorruptError;
    }
    assert(threw, 'buildCleanupPlan symlink-escape: throws ManifestCorruptError when realpath escapes ws');
  }

  // Case H: ENOENT (manifest entry → file deleted) → silently skipped, no throw
  resetLogs();
  {
    const ws = makeRealWs('gomad-plan-enoent-');
    const priorManifest = [
      {
        type: 'file',
        name: 'gone',
        module: 'gomad',
        path: 'gomad/agents/gone.md',
        hash: null,
        schema_version: '2.0',
        install_root: '_gomad',
        absolutePath: path.join(ws, '_gomad', 'gomad', 'agents', 'gone.md'),
      },
    ];
    let threw = false;
    let plan = null;
    try {
      plan = await buildCleanupPlan({
        priorManifest,
        newInstallSet: new Set(),
        workspaceRoot: ws,
        allowedRoots: new Set(['_gomad', '.claude']),
        isV11Legacy: false,
      });
    } catch {
      threw = true;
    }
    assert(!threw, 'buildCleanupPlan ENOENT: does NOT throw when manifest entry file is missing (idempotency)');
    assert(
      plan && plan.to_remove.length === 0 && plan.to_snapshot.length === 0,
      'buildCleanupPlan ENOENT: entry silently skipped (no remove/snapshot)',
    );
  }

  // Case I: install_root not in allowedRoots → refused
  resetLogs();
  {
    const ws = makeRealWs('gomad-plan-unknown-root-');
    fs.ensureDirSync(path.join(ws, '.unknown-ide'));
    const filePath = path.join(ws, '.unknown-ide', 'foo.md');
    fs.writeFileSync(filePath, 'x');
    const priorManifest = [
      {
        type: 'file',
        name: 'foo',
        module: 'm',
        path: 'foo.md',
        hash: null,
        schema_version: '2.0',
        install_root: '.unknown-ide',
        absolutePath: filePath,
      },
    ];
    const plan = await buildCleanupPlan({
      priorManifest,
      newInstallSet: new Set(),
      workspaceRoot: ws,
      allowedRoots: new Set(['_gomad', '.claude']),
      isV11Legacy: false,
    });
    assert(plan.refused.length === 1, `buildCleanupPlan unknown-root: 1 refused (got ${plan.refused.length})`);
    assert(
      plan.refused[0].reason === 'UNKNOWN_INSTALL_ROOT',
      `buildCleanupPlan unknown-root: reason=UNKNOWN_INSTALL_ROOT (got ${plan.refused[0].reason})`,
    );
    assert(plan.to_remove.length === 0, 'buildCleanupPlan unknown-root: not added to to_remove');
  }

  // Case J: legacy v1.1 branch — 7 dirs all present
  resetLogs();
  {
    const ws = makeRealWs('gomad-plan-legacy-7-');
    for (const shortName of cleanupPlanner.LEGACY_AGENT_SHORT_NAMES) {
      const dir = path.join(ws, '.claude', 'skills', `gm-agent-${shortName}`);
      fs.ensureDirSync(dir);
      fs.writeFileSync(path.join(dir, 'SKILL.md'), `legacy ${shortName}`);
    }
    const plan = await buildCleanupPlan({
      priorManifest: [],
      newInstallSet: new Set(),
      workspaceRoot: ws,
      allowedRoots: new Set(['_gomad', '.claude']),
      isV11Legacy: true,
    });
    assert(plan.reason === 'legacy_v1_cleanup', `buildCleanupPlan legacy: reason=legacy_v1_cleanup (got ${plan.reason})`);
    assert(plan.to_snapshot.length === 7, `buildCleanupPlan legacy: 7 snapshots (got ${plan.to_snapshot.length})`);
    assert(plan.to_remove.length === 7, 'buildCleanupPlan legacy: 7 removals');
    assert(
      plan.to_snapshot.every((s) => s.was_modified === null),
      'buildCleanupPlan legacy: was_modified=null on every entry (no v1.1 hash)',
    );
    assert(
      plan.to_snapshot.every((s) => s.install_root === '.claude'),
      'buildCleanupPlan legacy: install_root=.claude on every entry',
    );
    assert(
      plan.to_snapshot.every((s) => /^skills\/gm-agent-/.test(s.relative_path)),
      'buildCleanupPlan legacy: relative_path posix-normalized under skills/',
    );
  }

  // Case K: legacy branch with only 3 of 7 dirs present
  resetLogs();
  {
    const ws = makeRealWs('gomad-plan-legacy-3-');
    const present = ['analyst', 'pm', 'dev'];
    for (const shortName of present) {
      fs.ensureDirSync(path.join(ws, '.claude', 'skills', `gm-agent-${shortName}`));
    }
    const plan = await buildCleanupPlan({
      priorManifest: [],
      newInstallSet: new Set(),
      workspaceRoot: ws,
      allowedRoots: new Set(['_gomad', '.claude']),
      isV11Legacy: true,
    });
    assert(plan.to_snapshot.length === 3, `buildCleanupPlan legacy-3: 3 snapshots (got ${plan.to_snapshot.length})`);
    assert(plan.to_remove.length === 3, 'buildCleanupPlan legacy-3: 3 removals');
  }

  // Case L: purity — buildCleanupPlan performs zero fs WRITES
  resetLogs();
  {
    const ws = makeRealWs('gomad-plan-purity-');
    fs.ensureDirSync(path.join(ws, '_gomad', 'gomad', 'agents'));
    const filePath = path.join(ws, '_gomad', 'gomad', 'agents', 'pm.md');
    fs.writeFileSync(filePath, 'persona-content');
    // Reset the call counter
    let writeCalls = 0;
    const origCopy = fs.copy;
    const origRemove = fs.remove;
    const origEnsureDir = fs.ensureDir;
    const origWriteFile = fs.writeFile;
    const origEnsureFile = fs.ensureFile;
    fs.copy = (...a) => {
      writeCalls++;
      return origCopy(...a);
    };
    fs.remove = (...a) => {
      writeCalls++;
      return origRemove(...a);
    };
    fs.ensureDir = (...a) => {
      writeCalls++;
      return origEnsureDir(...a);
    };
    fs.writeFile = (...a) => {
      writeCalls++;
      return origWriteFile(...a);
    };
    fs.ensureFile = (...a) => {
      writeCalls++;
      return origEnsureFile(...a);
    };
    try {
      const priorManifest = [
        {
          type: 'file',
          name: 'pm',
          module: 'gomad',
          path: 'gomad/agents/pm.md',
          hash: 'unmatchedhash000000000000000000000000000000000000000000000000',
          schema_version: '2.0',
          install_root: '_gomad',
          absolutePath: filePath,
        },
      ];
      await buildCleanupPlan({
        priorManifest,
        newInstallSet: new Set(),
        workspaceRoot: ws,
        allowedRoots: new Set(['_gomad', '.claude']),
        isV11Legacy: false,
      });
      assert(writeCalls === 0, `buildCleanupPlan purity: 0 fs write calls (got ${writeCalls})`);
    } finally {
      fs.copy = origCopy;
      fs.remove = origRemove;
      fs.ensureDir = origEnsureDir;
      fs.writeFile = origWriteFile;
      fs.ensureFile = origEnsureFile;
    }
  }

  // ─── D-39: writeFilesManifest excludes _gomad/_backups/** ─────────────
  // Task 4 — exclude any path containing /_gomad/_backups/ from the
  // generated files-manifest.csv. Symmetric POSIX + native separator
  // check to handle Windows separators per Pitfall 19.
  resetLogs();
  {
    // Build a workspace tempdir with a real _gomad/_config/ directory so
    // writeFilesManifest can write into it.
    const ws = makeRealWs('gomad-d39-exclusion-');
    const gomadDir = path.join(ws, '_gomad');
    fs.ensureDirSync(path.join(gomadDir, '_config'));

    // Create a few real files under both expected and excluded paths.
    fs.ensureDirSync(path.join(gomadDir, 'gomad', 'agents'));
    const includedFile1 = path.join(gomadDir, 'gomad', 'agents', 'pm.md');
    fs.writeFileSync(includedFile1, 'persona-pm');

    fs.ensureDirSync(path.join(ws, '.claude', 'commands', 'gm'));
    const includedFile2 = path.join(ws, '.claude', 'commands', 'gm', 'agent-pm.md');
    fs.writeFileSync(includedFile2, 'launcher-pm');

    fs.ensureDirSync(path.join(gomadDir, '_backups', '20260420-143052'));
    const excludedBackup1 = path.join(gomadDir, '_backups', '20260420-143052', 'metadata.json');
    fs.writeFileSync(excludedBackup1, '{}');

    fs.ensureDirSync(path.join(gomadDir, '_backups', '20260420-143052', '.claude', 'commands', 'gm'));
    const excludedBackup2 = path.join(gomadDir, '_backups', '20260420-143052', '.claude', 'commands', 'gm', 'agent-pm.md');
    fs.writeFileSync(excludedBackup2, 'old-launcher');

    // Prefix-collision case (must NOT be excluded): _backupstemp ≠ _backups
    fs.ensureDirSync(path.join(gomadDir, '_backupstemp'));
    const collisionFile = path.join(gomadDir, '_backupstemp', 'x.md');
    fs.writeFileSync(collisionFile, 'not-a-backup');

    const gen = new ManifestGenerator();
    gen.gomadDir = gomadDir;
    gen.gomadFolderName = '_gomad';
    gen.ideRoots = ['.claude'];
    gen.allInstalledFiles = [includedFile1, includedFile2, excludedBackup1, excludedBackup2, collisionFile];

    const csvPath = await gen.writeFilesManifest(path.join(gomadDir, '_config'));
    const csvContent = fs.readFileSync(csvPath, 'utf8');

    assert(/agents\/pm\.md/.test(csvContent), 'D-39 exclusion: gomad/agents/pm.md included in manifest');
    assert(/agent-pm\.md/.test(csvContent), 'D-39 exclusion: .claude/commands/gm/agent-pm.md included');
    assert(!/_backups\/20260420/.test(csvContent), 'D-39 exclusion: _gomad/_backups/* path is EXCLUDED from manifest');
    assert(!/_backups\/20260420-143052\/metadata\.json/.test(csvContent), 'D-39 exclusion: metadata.json under _backups EXCLUDED');
    assert(!/_backups\/20260420-143052\/\.claude/.test(csvContent), 'D-39 exclusion: nested .claude under _backups EXCLUDED');
    assert(/_backupstemp/.test(csvContent), 'D-39 exclusion: _backupstemp (prefix collision, no trailing slash match) is INCLUDED');
  }

  // D-39 native-separator check: synthesize Windows-style paths and verify
  // the writer skips them too (defensive — on POSIX this is a no-op since
  // path.sep === '/', but on Windows the native separator is '\').
  resetLogs();
  {
    const ws = makeRealWs('gomad-d39-native-sep-');
    const gomadDir = path.join(ws, '_gomad');
    fs.ensureDirSync(path.join(gomadDir, '_config'));
    fs.ensureDirSync(path.join(gomadDir, 'gomad', 'agents'));
    const goodFile = path.join(gomadDir, 'gomad', 'agents', 'a.md');
    fs.writeFileSync(goodFile, 'a');

    // Synthesize a Windows-style path for the include list. On POSIX the
    // file doesn't exist at this literal name; that's fine — calculateFileHash
    // returns '' on missing files (existing behavior at manifest-generator.js:643).
    // The point of this assertion: the path-prefix filter rejects the path
    // BEFORE attempting to read it.
    const winSepBackupPath = String.raw`\ws\_gomad\_backups\20260420\meta.json`;

    const gen = new ManifestGenerator();
    gen.gomadDir = gomadDir;
    gen.gomadFolderName = '_gomad';
    gen.ideRoots = [];
    gen.allInstalledFiles = [goodFile, winSepBackupPath];

    const csvPath = await gen.writeFilesManifest(path.join(gomadDir, '_config'));
    const csvContent = fs.readFileSync(csvPath, 'utf8');

    assert(/a\.md/.test(csvContent), 'D-39 native-sep: good file included');
    assert(!/meta\.json/.test(csvContent), String.raw`D-39 native-sep: backslash _gomad\_backups\ path EXCLUDED`);
  }

  // ─── Final ─────────────────────────────────────────────────────────────
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
})().catch((error) => {
  console.error(`${colors.red}FATAL:${colors.reset}`, error);
  process.exit(2);
});
