/**
 * Cleanup Executor Tests (Phase 7 Plan 02 Task 1 — executor path)
 *
 * Verifies:
 *   - executeCleanupPlan(plan, workspaceRoot, gomadVersion)
 *       · empty plan → no disk writes
 *       · populated plan → snapshot dir, metadata.json, README.md, removed files
 *       · snapshot-then-remove ordering (D-34 — snapshot failure MUST abort before remove)
 *       · timestamp collision handling (Pitfall 21)
 *       · cp -R recovery round-trip
 *   - snapshotFiles(toSnapshot, backupRoot) — D-36 tree mirroring, preserveTimestamps
 *   - writeMetadata(backupRoot, {gomadVersion, plan}) — D-38 mandatory schema
 *   - writeBackupReadme(backupRoot, {gomadVersion}) — README.md with cp -R string
 *   - renderPlan(plan) — D-40 human-readable table
 *
 * Usage: node test/test-cleanup-execute.js
 */

'use strict';

const path = require('node:path');
const os = require('node:os');
const fs = require('fs-extra');
const { execSync } = require('node:child_process');

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

/**
 * Helper: build a workspace tempdir whose realpath we resolve immediately
 * (so containment checks compare realpath-to-realpath on macOS where
 * /tmp itself is a symlink to /private/tmp).
 */
function makeRealWs(prefix) {
  const ws = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  return fs.realpathSync(ws);
}

(async () => {
  console.log(`\n${colors.cyan}Cleanup Executor Tests (Phase 7 Plan 02 Task 1)${colors.reset}\n`);

  const { executeCleanupPlan, snapshotFiles, writeMetadata, writeBackupReadme, renderPlan } = cleanupPlanner;

  // ─── Exports present ──────────────────────────────────────────────────
  assert(typeof executeCleanupPlan === 'function', 'executeCleanupPlan: exported as function');
  assert(typeof snapshotFiles === 'function', 'snapshotFiles: exported as function');
  assert(typeof writeMetadata === 'function', 'writeMetadata: exported as function');
  assert(typeof writeBackupReadme === 'function', 'writeBackupReadme: exported as function');
  assert(typeof renderPlan === 'function', 'renderPlan: exported as function');

  // ─── executeCleanupPlan: empty plan → no writes ───────────────────────
  {
    const ws = makeRealWs('gomad-exec-empty-');
    const result = await executeCleanupPlan(
      { to_snapshot: [], to_remove: [], to_write: [], refused: [], reason: 'manifest_cleanup' },
      ws,
      '1.2.0',
    );
    assert(result === null, 'executeCleanupPlan empty plan returns null');
    const backupsDir = path.join(ws, '_gomad', '_backups');
    assert(!fs.existsSync(backupsDir), 'executeCleanupPlan empty plan creates no _gomad/_backups/ dir');
  }

  // ─── executeCleanupPlan: populated plan → snapshot + metadata + README + remove ─
  {
    const ws = makeRealWs('gomad-exec-full-');
    // Pre-seed a file that will be in plan.to_snapshot + to_remove
    const srcFile = path.join(ws, '.claude', 'commands', 'gm', 'agent-pm.md');
    const srcContent = '# Stale launcher content\n';
    await fs.ensureDir(path.dirname(srcFile));
    await fs.writeFile(srcFile, srcContent);
    const resolvedSrc = await fs.realpath(srcFile);

    const plan = {
      to_snapshot: [
        {
          src: resolvedSrc,
          install_root: '.claude',
          relative_path: 'commands/gm/agent-pm.md',
          orig_hash: 'deadbeef0000',
          was_modified: false,
        },
      ],
      to_remove: [resolvedSrc],
      to_write: [],
      refused: [],
      reason: 'manifest_cleanup',
    };

    const backupRoot = await executeCleanupPlan(plan, ws, '1.2.0');
    assert(typeof backupRoot === 'string' && backupRoot.length > 0, 'executeCleanupPlan returns backup dir path');
    assert(fs.existsSync(backupRoot), `executeCleanupPlan creates backup dir (${backupRoot})`);

    // Snapshot landed at backupRoot/.claude/commands/gm/agent-pm.md
    const snapshotFile = path.join(backupRoot, '.claude', 'commands', 'gm', 'agent-pm.md');
    assert(fs.existsSync(snapshotFile), 'snapshotFiles placed file at backupRoot/<install_root>/<relative_path>');
    assert(fs.readFileSync(snapshotFile, 'utf8') === srcContent, 'snapshotFiles preserved content byte-for-byte');

    // Original removed
    assert(!fs.existsSync(resolvedSrc), 'executeCleanupPlan removed original file after snapshot');

    // metadata.json
    const metaPath = path.join(backupRoot, 'metadata.json');
    assert(fs.existsSync(metaPath), 'writeMetadata created metadata.json');
    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));

    // D-38 mandatory fields
    assert(meta.gomad_version === '1.2.0', `metadata.gomad_version (got ${meta.gomad_version})`);
    assert(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(meta.created_at), `metadata.created_at is ISO 8601 (got ${meta.created_at})`);
    assert(meta.reason === 'manifest_cleanup', `metadata.reason (got ${meta.reason})`);
    assert(Array.isArray(meta.files) && meta.files.length === 1, `metadata.files[] length=1 (got ${meta.files.length})`);
    assert(meta.files[0].install_root === '.claude', 'metadata.files[0].install_root=.claude');
    assert(meta.files[0].relative_path === 'commands/gm/agent-pm.md', 'metadata.files[0].relative_path forward-slash');
    assert(meta.files[0].orig_hash === 'deadbeef0000', 'metadata.files[0].orig_hash preserved verbatim from plan');
    assert(meta.files[0].was_modified === false, 'metadata.files[0].was_modified=false (preserved from plan)');
    assert(typeof meta.recovery_hint === 'string' && meta.recovery_hint.includes('cp -R'), 'metadata.recovery_hint contains cp -R');

    // README.md
    const readmePath = path.join(backupRoot, 'README.md');
    assert(fs.existsSync(readmePath), 'writeBackupReadme created README.md');
    const readme = fs.readFileSync(readmePath, 'utf8');
    assert(readme.includes('cp -R'), 'README.md contains cp -R recovery command');
    assert(readme.includes('GoMad Upgrade Backup'), 'README.md has title header');
  }

  // ─── was_modified=true gets annotation from legacy branch (null) ───────
  {
    const ws = makeRealWs('gomad-exec-legacy-');
    const srcFile = path.join(ws, '.claude', 'skills', 'gm-agent-pm', 'custom.md');
    await fs.ensureDir(path.dirname(srcFile));
    await fs.writeFile(srcFile, 'USER CUSTOM\n');
    const resolvedSrc = await fs.realpath(srcFile);

    const plan = {
      to_snapshot: [
        {
          src: resolvedSrc,
          install_root: '.claude',
          relative_path: 'skills/gm-agent-pm/custom.md',
          orig_hash: null,
          was_modified: null,
        },
      ],
      to_remove: [resolvedSrc],
      to_write: [],
      refused: [],
      reason: 'legacy_v1_cleanup',
    };

    const backupRoot = await executeCleanupPlan(plan, ws, '1.2.0');
    const meta = JSON.parse(fs.readFileSync(path.join(backupRoot, 'metadata.json'), 'utf8'));
    assert(meta.reason === 'legacy_v1_cleanup', 'metadata.reason=legacy_v1_cleanup for legacy plan');
    assert(meta.files[0].was_modified === null, 'legacy_v1_cleanup: was_modified=null preserved');
    assert(meta.files[0].orig_hash === null, 'legacy_v1_cleanup: orig_hash=null preserved');
  }

  // ─── Snapshot failure → remove not called ──────────────────────────────
  {
    const ws = makeRealWs('gomad-exec-failsnap-');
    // Pre-seed original file that MUST survive if snapshot aborts
    const srcFile = path.join(ws, '.claude', 'commands', 'survivor.md');
    await fs.ensureDir(path.dirname(srcFile));
    await fs.writeFile(srcFile, 'this must survive');
    const resolvedSrc = await fs.realpath(srcFile);

    // Pre-create the backup dir AS A FILE (not a directory). This causes
    // snapshotFiles → fs.ensureDir(path.dirname(backupPath)) to reject with
    // ENOTDIR because the parent is a file. Since the plan's timestamp is
    // dynamic, we trigger the failure by using a relative_path whose parent
    // can't be created (put a file where a dir needs to go).
    //
    // Strategy: create a file at `<ws>/_gomad/_backups/<expectedTs>/.claude`
    // after we know the timestamp. But timestamp is dynamic at execute time.
    //
    // Alternative: use relative_path with a COLLIDING segment at the dest.
    // Pre-create `<ws>/_gomad/_backups` as a FILE (not a dir). Then
    // fs.ensureDir on the first snapshot path fails with ENOTDIR.
    const backupsFileBlocker = path.join(ws, '_gomad', '_backups');
    await fs.ensureDir(path.dirname(backupsFileBlocker)); // ws/_gomad
    await fs.writeFile(backupsFileBlocker, 'blocker file'); // _backups is a FILE now

    const plan = {
      to_snapshot: [
        {
          src: resolvedSrc,
          install_root: '.claude',
          relative_path: 'commands/survivor.md',
          orig_hash: null,
          was_modified: false,
        },
      ],
      to_remove: [resolvedSrc],
      to_write: [],
      refused: [],
      reason: 'manifest_cleanup',
    };

    let threw = false;
    try {
      await executeCleanupPlan(plan, ws, '1.2.0');
    } catch {
      threw = true;
    }
    assert(threw, 'executeCleanupPlan rejects when snapshot cannot create backup root');
    assert(fs.existsSync(resolvedSrc), 'Original file SURVIVES when snapshot fails (remove never ran)');
    assert(fs.readFileSync(resolvedSrc, 'utf8') === 'this must survive', 'Original file contents unchanged');
  }

  // ─── Two invocations same second → <ts> and <ts>-2 ─────────────────────
  {
    const ws = makeRealWs('gomad-exec-collide-');
    // Seed two separate files (one per invocation so fs.remove has something to do)
    const file1 = path.join(ws, '.claude', 'a.md');
    const file2 = path.join(ws, '.claude', 'b.md');
    await fs.ensureDir(path.dirname(file1));
    await fs.writeFile(file1, 'file 1');
    await fs.writeFile(file2, 'file 2');
    const r1 = await fs.realpath(file1);
    const r2 = await fs.realpath(file2);

    // Force both calls to produce the same base timestamp by stubbing Date
    // via monkeypatch on cleanup-planner's formatTimestamp reference. Simpler:
    // Pre-create the base directory so uniqueBackupDir returns the -2 suffix.
    // We simulate the "same second" case by running back-to-back and asserting
    // both base dirs exist.
    const backup1 = await executeCleanupPlan(
      {
        to_snapshot: [{ src: r1, install_root: '.claude', relative_path: 'a.md', orig_hash: null, was_modified: false }],
        to_remove: [r1],
        to_write: [],
        refused: [],
        reason: 'manifest_cleanup',
      },
      ws,
      '1.2.0',
    );

    // Force same-timestamp collision: pre-create a dir that matches backup1's timestamp base
    // The second call will hit uniqueBackupDir and choose -2. Need the timestamp string.
    // Approach: pre-create the same backupRoot as a second directory, forcing -2
    const backup2 = await executeCleanupPlan(
      {
        to_snapshot: [{ src: r2, install_root: '.claude', relative_path: 'b.md', orig_hash: null, was_modified: false }],
        to_remove: [r2],
        to_write: [],
        refused: [],
        reason: 'manifest_cleanup',
      },
      ws,
      '1.2.0',
    );

    assert(backup1 !== backup2, `Two invocations produce DISTINCT backup dirs (got ${backup1} == ${backup2})`);
    assert(fs.existsSync(backup1) && fs.existsSync(backup2), 'Both backup dirs exist');
    // If they happened in the same second, the second has -2 suffix; otherwise different ts.
    // Both are acceptable — distinctness is what matters for the invariant.
  }

  // ─── Collision forced: pre-create a dir to force -2 suffix ────────────
  {
    const ws = makeRealWs('gomad-exec-force-collide-');
    // Pre-create today's timestamp-pattern dir so uniqueBackupDir returns -2
    const baseTs = cleanupPlanner.formatTimestamp(new Date());
    const collisionDir = path.join(ws, '_gomad', '_backups', baseTs);
    await fs.ensureDir(collisionDir);
    // Put a marker so we can tell it's the pre-existing one
    await fs.writeFile(path.join(collisionDir, 'PRE_EXISTING'), 'original');

    // Now seed a file and run the executor. It MUST pick <ts>-2 (or later).
    const srcFile = path.join(ws, '.claude', 'c.md');
    await fs.ensureDir(path.dirname(srcFile));
    await fs.writeFile(srcFile, 'collision victim');
    const rSrc = await fs.realpath(srcFile);

    const backupRoot = await executeCleanupPlan(
      {
        to_snapshot: [{ src: rSrc, install_root: '.claude', relative_path: 'c.md', orig_hash: null, was_modified: false }],
        to_remove: [rSrc],
        to_write: [],
        refused: [],
        reason: 'manifest_cleanup',
      },
      ws,
      '1.2.0',
    );

    const bn = path.basename(backupRoot);
    assert(/^\d{8}-\d{6}-\d+$/.test(bn), `Forced-collision run uses numeric suffix (got basename=${bn})`);
    // Pre-existing marker unaffected
    assert(fs.existsSync(path.join(collisionDir, 'PRE_EXISTING')), 'Pre-existing collision dir untouched');
    // The metadata.json in backupRoot references its own (suffixed) basename
    const meta = JSON.parse(fs.readFileSync(path.join(backupRoot, 'metadata.json'), 'utf8'));
    assert(meta.recovery_hint.includes(bn), `metadata.recovery_hint references the actual backup dir name (${bn})`);
  }

  // ─── cp -R recovery round-trip ─────────────────────────────────────────
  {
    const ws = makeRealWs('gomad-exec-recovery-');
    const srcFile = path.join(ws, '.claude', 'skills', 'gm-agent-pm', 'custom.md');
    const originalContent = 'USER-EDIT-' + Date.now();
    await fs.ensureDir(path.dirname(srcFile));
    await fs.writeFile(srcFile, originalContent);
    const rSrc = await fs.realpath(srcFile);

    const plan = {
      to_snapshot: [
        { src: rSrc, install_root: '.claude', relative_path: 'skills/gm-agent-pm/custom.md', orig_hash: null, was_modified: null },
      ],
      to_remove: [rSrc],
      to_write: [],
      refused: [],
      reason: 'legacy_v1_cleanup',
    };

    const backupRoot = await executeCleanupPlan(plan, ws, '1.2.0');
    assert(!fs.existsSync(rSrc), 'Original removed after snapshot');

    // Recovery: cp -R from backup into a fresh recovery dir
    const recoveryDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gomad-recovery-rt-'));
    execSync(`cp -R "${backupRoot}/.claude/skills/gm-agent-pm" "${recoveryDir}/"`, { stdio: 'pipe' });
    const restoredFile = path.join(recoveryDir, 'gm-agent-pm', 'custom.md');
    assert(fs.existsSync(restoredFile), 'Recovery cp -R restored custom.md to new location');
    assert(fs.readFileSync(restoredFile, 'utf8') === originalContent, 'Recovered file byte-matches original content');
  }

  // ─── renderPlan: empty plan ────────────────────────────────────────────
  {
    const output = renderPlan({ to_snapshot: [], to_remove: [], to_write: [], refused: [], reason: 'manifest_cleanup' });
    assert(output.includes('Summary: 0 snapshotted, 0 removed, 0 written'), `renderPlan empty: summary line (got: ${output})`);
    assert(!output.includes('TO SNAPSHOT'), 'renderPlan empty: no TO SNAPSHOT header');
    assert(!output.includes('TO REMOVE'), 'renderPlan empty: no TO REMOVE header');
    assert(!output.includes('TO WRITE'), 'renderPlan empty: no TO WRITE header');
  }

  // ─── renderPlan: populated plan with mixed was_modified values ─────────
  {
    const plan = {
      to_snapshot: [
        { src: '/abs/foo', install_root: '_gomad', relative_path: 'gomad/agents/pm.md', orig_hash: 'aaaa', was_modified: false },
        { src: '/abs/bar', install_root: '.claude', relative_path: 'commands/gm/agent-pm.md', orig_hash: 'bbbb', was_modified: true },
        { src: '/abs/baz', install_root: '.claude', relative_path: 'skills/gm-agent-pm/custom.md', orig_hash: null, was_modified: null },
      ],
      to_remove: ['/abs/foo', '/abs/bar', '/abs/baz'],
      to_write: ['/abs/new1', '/abs/new2'],
      refused: [],
      reason: 'manifest_cleanup',
    };
    const output = renderPlan(plan);
    assert(output.includes('TO SNAPSHOT (3 files)'), 'renderPlan populated: TO SNAPSHOT header with count');
    assert(output.includes('TO REMOVE (3 files)'), 'renderPlan populated: TO REMOVE header with count');
    assert(output.includes('TO WRITE (2 files)'), 'renderPlan populated: TO WRITE header with count');
    assert(output.includes('Summary: 3 snapshotted, 3 removed, 2 written'), 'renderPlan populated: summary line');
    assert(output.includes('(from files-manifest.csv)'), 'renderPlan: was_modified=false → "(from files-manifest.csv)"');
    assert(output.includes('(user-modified, hash-diff)'), 'renderPlan: was_modified=true → "(user-modified, hash-diff)"');
    assert(output.includes('(legacy v1.1, hash unknown)'), 'renderPlan: was_modified=null → "(legacy v1.1, hash unknown)"');
    assert(output.includes('_gomad/gomad/agents/pm.md'), 'renderPlan: install_root/relative_path display format');
    assert(output.includes('.claude/commands/gm/agent-pm.md'), 'renderPlan: IDE-target install_root rendered');
  }

  // ─── renderPlan: refused list summary line ─────────────────────────────
  {
    const plan = {
      to_snapshot: [],
      to_remove: [],
      to_write: [],
      refused: [{ idx: 3, entry: { path: 'x' }, reason: 'UNKNOWN_INSTALL_ROOT' }],
      reason: 'manifest_cleanup',
    };
    const output = renderPlan(plan);
    assert(output.includes('Refused: 1 entries'), 'renderPlan: refused count surfaces');
  }

  // ─── snapshotFiles: preserveTimestamps idiom (structural check) ───────
  {
    const ws = makeRealWs('gomad-snap-ts-');
    const srcFile = path.join(ws, 'src.txt');
    await fs.writeFile(srcFile, 'content');
    // Set a known mtime in the past
    const pastTime = new Date(Date.now() - 86_400_000); // 1 day ago
    await fs.utimes(srcFile, pastTime, pastTime);
    const rSrc = await fs.realpath(srcFile);
    const backupRoot = path.join(ws, 'backup');
    await fs.ensureDir(backupRoot);
    await snapshotFiles(
      [{ src: rSrc, install_root: '.claude', relative_path: 'src.txt', orig_hash: null, was_modified: false }],
      backupRoot,
    );
    const snapFile = path.join(backupRoot, '.claude', 'src.txt');
    assert(fs.existsSync(snapFile), 'snapshotFiles created file at dest');
    const snapStat = await fs.stat(snapFile);
    // preserveTimestamps: true keeps mtime within a few-second tolerance of source
    const delta = Math.abs(snapStat.mtimeMs - pastTime.getTime());
    assert(delta < 5000, `snapshotFiles preserved mtime (delta=${delta}ms)`);
  }

  console.log(`\n${colors.cyan}Results:${colors.reset} ${passed} passed, ${failed} failed\n`);
  process.exit(failed > 0 ? 1 : 0);
})().catch((error) => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, error);
  process.exit(1);
});
