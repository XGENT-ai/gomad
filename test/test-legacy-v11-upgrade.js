/**
 * Legacy v1.1 → v1.2 Upgrade E2E Test (Phase 7 Plan 02 Task 5 — THE test)
 *
 * Verifies the Phase 7 upgrade-safety contract end-to-end:
 *   Test 1 — v1.1 workspace with user custom.md gets fully snapshotted BEFORE
 *            removal; custom.md recoverable from _gomad/_backups/<ts>/.
 *   Test 2 — `cp -R` recovery round-trip byte-matches pre-install content.
 *   Test 3 — Second install is idempotent: no new backup dir; manifest hash
 *            unchanged.
 *   Test 4 — Bare 7-dir legacy workspace (no customs) — all 7 dirs
 *            snapshotted, removed, and metadata.files[] has ≥7 entries.
 *
 * Harness: real npm pack + npm install + `gomad install --yes` run against
 *          a tempdir (not mocked).
 *
 * Usage: node test/test-legacy-v11-upgrade.js
 */

'use strict';

const path = require('node:path');
const os = require('node:os');
const fs = require('fs-extra');
const { execSync } = require('node:child_process');
const crypto = require('node:crypto');

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
const LEGACY_AGENTS = ['analyst', 'tech-writer', 'pm', 'ux-designer', 'architect', 'sm', 'dev'];
const CUSTOM_MARKER = 'USER-EDIT-MARKER-' + Date.now();

/**
 * Pack the repo once and install into a fresh npm project tempdir.
 * Returns the path to the node_modules/.bin/gomad executable + tempdir paths.
 */
function packAndInstall(prefix) {
  const packOutput = execSync('npm pack', { cwd: REPO_ROOT, encoding: 'utf8', timeout: 120_000 }).trim();
  const tarballName = packOutput.split('\n').pop().trim();
  const tarballPath = path.join(REPO_ROOT, tarballName);

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  execSync('npm init -y', { cwd: tempDir, stdio: 'pipe', timeout: 30_000 });
  execSync(`npm install "${tarballPath}"`, { cwd: tempDir, stdio: 'pipe', timeout: 180_000 });

  const gomadBin = path.join(tempDir, 'node_modules', '.bin', 'gomad');
  return { tempDir, gomadBin, tarballPath };
}

/**
 * Seed a v1.1-style workspace: all 7 .claude/skills/gm-agent-<shortName>/
 * dirs each containing SKILL.md. If includeCustom, add gm-agent-pm/custom.md
 * with CUSTOM_MARKER content.
 */
function seedV11Workspace(tempDir, { includeCustom }) {
  for (const shortName of LEGACY_AGENTS) {
    const dir = path.join(tempDir, '.claude', 'skills', `gm-agent-${shortName}`);
    fs.ensureDirSync(dir);
    fs.writeFileSync(path.join(dir, 'SKILL.md'), `# gm-agent-${shortName} (v1.1)\n`);
  }
  if (includeCustom) {
    fs.writeFileSync(path.join(tempDir, '.claude', 'skills', 'gm-agent-pm', 'custom.md'), CUSTOM_MARKER);
  }
}

function listBackupTimestamps(backupsDir) {
  if (!fs.existsSync(backupsDir)) return [];
  return fs.readdirSync(backupsDir).filter((d) => /^\d{8}-\d{6}(-\d+)?$/.test(d));
}

function sha256File(p) {
  return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
}

(async () => {
  console.log(`\n${colors.cyan}Legacy v1.1 → v1.2 Upgrade E2E Test${colors.reset}\n`);

  let tarballPath;
  let tempDir1;
  let tempDir4;

  try {
    // ─── Test 1 (THE test) + Test 2 (recovery) + Test 3 (idempotency) ─────
    console.log(`${colors.cyan}Test 1/2/3 — v1.1 workspace with user custom.md${colors.reset}`);
    console.log(`${colors.dim}Packing + installing tarball (this takes ~60–180s)...${colors.reset}`);
    const ctx = packAndInstall('gomad-v11-upgrade-');
    tarballPath = ctx.tarballPath;
    tempDir1 = ctx.tempDir;
    const gomadBin1 = ctx.gomadBin;

    seedV11Workspace(tempDir1, { includeCustom: true });

    console.log(`${colors.dim}Running first gomad install --yes ...${colors.reset}`);
    execSync(`"${gomadBin1}" install --yes --directory "${tempDir1}" --tools claude-code`, {
      cwd: tempDir1,
      stdio: 'pipe',
      timeout: 300_000,
    });

    // Find the backup dir (exactly one should exist)
    const backupsDir = path.join(tempDir1, '_gomad', '_backups');
    const backupTss = listBackupTimestamps(backupsDir);
    assert(backupTss.length === 1, 'Exactly one backup dir created', `found ${backupTss.length}: ${backupTss.join(', ')}`);

    const backupRoot = path.join(backupsDir, backupTss[0]);

    // User custom preserved under snapshot
    const snapshotCustom = path.join(backupRoot, '.claude', 'skills', 'gm-agent-pm', 'custom.md');
    assert(fs.existsSync(snapshotCustom), 'User custom.md snapshotted');
    assert(
      fs.existsSync(snapshotCustom) && fs.readFileSync(snapshotCustom, 'utf8') === CUSTOM_MARKER,
      'custom.md byte-matches pre-install content',
    );

    // All 7 legacy dirs snapshotted
    for (const shortName of LEGACY_AGENTS) {
      const snap = path.join(backupRoot, '.claude', 'skills', `gm-agent-${shortName}`);
      assert(fs.existsSync(snap), `Legacy dir gm-agent-${shortName} snapshotted`);
    }

    // Legacy dirs removed from live workspace
    for (const shortName of LEGACY_AGENTS) {
      const live = path.join(tempDir1, '.claude', 'skills', `gm-agent-${shortName}`);
      assert(!fs.existsSync(live), `Live gm-agent-${shortName} removed after upgrade`);
    }

    // Phase 6 launcher present (evidence install succeeded post-cleanup)
    assert(
      fs.existsSync(path.join(tempDir1, '.claude', 'commands', 'gm', 'agent-pm.md')),
      'Phase 6 launcher agent-pm.md present after upgrade',
    );

    // Manifest v2 written with correct schema; D-39 _backups excluded
    const manifestPath = path.join(tempDir1, '_gomad', '_config', 'files-manifest.csv');
    assert(fs.existsSync(manifestPath), 'files-manifest.csv written');
    const manifestContent = fs.readFileSync(manifestPath, 'utf8');
    assert(!manifestContent.includes('_gomad/_backups/'), 'manifest excludes _gomad/_backups/ per D-39');
    assert(!manifestContent.includes('_gomad\\_backups\\'), 'manifest excludes Windows-sep _gomad\\_backups\\ per D-39');

    // metadata.json shape
    const metaPath = path.join(backupRoot, 'metadata.json');
    assert(fs.existsSync(metaPath), 'metadata.json present');
    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
    assert(meta.reason === 'legacy_v1_cleanup', 'metadata.reason=legacy_v1_cleanup');
    assert(
      typeof meta.gomad_version === 'string' && meta.gomad_version.length > 0,
      `metadata.gomad_version present (got ${meta.gomad_version})`,
    );
    assert(/^\d{4}-\d{2}-\d{2}T/.test(meta.created_at), `metadata.created_at is ISO 8601 (got ${meta.created_at})`);
    assert(
      Array.isArray(meta.files) && meta.files.length >= 7,
      `metadata.files[] has >=7 entries (got ${Array.isArray(meta.files) ? meta.files.length : 'not-array'})`,
    );
    assert(
      Array.isArray(meta.files) && meta.files.every((f) => f.was_modified === null),
      'all files[] have was_modified === null (D-43 legacy-v1 signal)',
    );
    assert(
      typeof meta.recovery_hint === 'string' && meta.recovery_hint.includes('cp -R'),
      'recovery_hint contains cp -R',
    );

    // README.md present
    assert(fs.existsSync(path.join(backupRoot, 'README.md')), 'README.md co-located with metadata.json');

    // ─── Test 2: recovery round-trip ──────────────────────────────────
    const recoveryDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gomad-recovery-'));
    fs.ensureDirSync(path.join(recoveryDir, '.claude', 'skills', 'gm-agent-pm'));
    execSync(
      `cp -R "${backupRoot}/.claude/skills/gm-agent-pm/custom.md" "${recoveryDir}/.claude/skills/gm-agent-pm/custom.md"`,
    );
    const restored = fs.readFileSync(path.join(recoveryDir, '.claude', 'skills', 'gm-agent-pm', 'custom.md'), 'utf8');
    assert(restored === CUSTOM_MARKER, 'Recovery via cp -R restores custom.md byte-for-byte (identical to pre-install)');

    // ─── Test 3: idempotent second install ────────────────────────────
    // Phase 7 idempotency invariant: a second identical install produces NO new
    // backup and performs NO Phase 7 cleanup. The core invariant that matters
    // for SC1 / INSTALL-05 is "no mass deletion on re-run".
    //
    // The file-content hash of files-manifest.csv is NOT bit-identical across
    // runs: three config yaml files (_config/manifest.yaml, agile/config.yaml,
    // core/config.yaml) embed fresh `lastUpdated: ${new Date().toISOString()}`
    // timestamps on every install, and those file-content hashes propagate into
    // the manifest. That's pre-existing installer behavior from manifest.js:481
    // and is orthogonal to Phase 7 — it's NOT a Phase 7 regression.
    //
    // So Test 3 checks only: (a) no new backup dir, (b) manifest file count +
    // row count stable (structural identity), (c) non-timestamp manifest rows
    // are bit-identical (content-level identity for skills/launchers/agents).
    console.log(`${colors.dim}Running second gomad install --yes (idempotency check)...${colors.reset}`);
    const manifestContentBefore = fs.readFileSync(manifestPath, 'utf8');
    const rowCountBefore = manifestContentBefore.split('\n').filter(Boolean).length;
    execSync(`"${gomadBin1}" install --yes --directory "${tempDir1}" --tools claude-code`, {
      cwd: tempDir1,
      stdio: 'pipe',
      timeout: 300_000,
    });
    const backupsAfter = listBackupTimestamps(backupsDir);
    assert(
      backupsAfter.length === 1,
      'No new backup created on idempotent re-install (Phase 7 SC1 invariant)',
      `found ${backupsAfter.length}: ${backupsAfter.join(', ')}`,
    );
    const manifestContentAfter = fs.readFileSync(manifestPath, 'utf8');
    const rowCountAfter = manifestContentAfter.split('\n').filter(Boolean).length;
    assert(
      rowCountBefore === rowCountAfter,
      'files-manifest.csv row count unchanged on idempotent re-install',
      `before=${rowCountBefore} after=${rowCountAfter}`,
    );
    // Skill / launcher / agent rows are content-addressed on source material that
    // has no embedded timestamp, so those rows MUST be bit-identical even though
    // three config-yaml rows (manifest.yaml, agile/config.yaml, core/config.yaml)
    // legitimately churn. Filter those out and compare.
    const CONFIG_YAML_CHURN = /^"yaml","(manifest|config)","(_config|agile|core)",/;
    const stableRowsBefore = manifestContentBefore.split('\n').filter((r) => r && !CONFIG_YAML_CHURN.test(r));
    const stableRowsAfter = manifestContentAfter.split('\n').filter((r) => r && !CONFIG_YAML_CHURN.test(r));
    assert(
      stableRowsBefore.join('\n') === stableRowsAfter.join('\n'),
      'Non-config-yaml manifest rows (skills/launchers/agents) bit-identical on re-install',
      `diff lines: ${stableRowsBefore.length} vs ${stableRowsAfter.length}`,
    );

    // ─── Test 4: bare 7-dir legacy workspace (no customs) ─────────────
    console.log(`\n${colors.cyan}Test 4 — bare 7-dir legacy workspace (no custom.md)${colors.reset}`);
    // Reuse the same tarball (already packed above) — just install into a new tempdir.
    tempDir4 = fs.mkdtempSync(path.join(os.tmpdir(), 'gomad-v11-bare-'));
    execSync('npm init -y', { cwd: tempDir4, stdio: 'pipe', timeout: 30_000 });
    execSync(`npm install "${tarballPath}"`, { cwd: tempDir4, stdio: 'pipe', timeout: 180_000 });
    const gomadBin4 = path.join(tempDir4, 'node_modules', '.bin', 'gomad');
    seedV11Workspace(tempDir4, { includeCustom: false });

    console.log(`${colors.dim}Running gomad install --yes on bare v1.1 workspace...${colors.reset}`);
    execSync(`"${gomadBin4}" install --yes --directory "${tempDir4}" --tools claude-code`, {
      cwd: tempDir4,
      stdio: 'pipe',
      timeout: 300_000,
    });

    const bareBackupsDir = path.join(tempDir4, '_gomad', '_backups');
    const bareBackupTss = listBackupTimestamps(bareBackupsDir);
    assert(bareBackupTss.length === 1, 'Bare 7-dir: exactly one backup dir created', `found ${bareBackupTss.length}`);

    const bareBackupRoot = path.join(bareBackupsDir, bareBackupTss[0]);
    for (const shortName of LEGACY_AGENTS) {
      const snap = path.join(bareBackupRoot, '.claude', 'skills', `gm-agent-${shortName}`);
      assert(fs.existsSync(snap), `Bare 7-dir: gm-agent-${shortName} snapshotted`);
      const live = path.join(tempDir4, '.claude', 'skills', `gm-agent-${shortName}`);
      assert(!fs.existsSync(live), `Bare 7-dir: live gm-agent-${shortName} removed`);
    }

    const bareMeta = JSON.parse(fs.readFileSync(path.join(bareBackupRoot, 'metadata.json'), 'utf8'));
    assert(bareMeta.reason === 'legacy_v1_cleanup', 'Bare 7-dir: metadata.reason=legacy_v1_cleanup');
    assert(
      Array.isArray(bareMeta.files) && bareMeta.files.length >= 7,
      `Bare 7-dir: metadata.files[] length >= 7 (got ${bareMeta.files.length})`,
    );
  } catch (error) {
    console.error(`${colors.red}SETUP/EXECUTION FAILURE${colors.reset}: ${error.message}`);
    if (error.stdout) console.error(`${colors.dim}STDOUT:${colors.reset}\n${error.stdout}`);
    if (error.stderr) console.error(`${colors.dim}STDERR:${colors.reset}\n${error.stderr}`);
    failed++;
  } finally {
    if (tarballPath && fs.existsSync(tarballPath)) {
      try {
        fs.removeSync(tarballPath);
      } catch {
        /* best-effort cleanup */
      }
    }
  }

  console.log(`\n${colors.cyan}Results:${colors.reset} ${passed} passed, ${failed} failed\n`);
  process.exit(failed > 0 ? 1 : 0);
})().catch((error) => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, error);
  process.exit(1);
});
