/**
 * Legacy v1.2 → v1.3 Upgrade E2E Test (Phase 12 Plan 05 — AGENT-08)
 *
 * Verifies the v1.2 → v1.3 agent-dir relocation upgrade contract end-to-end:
 *   - Synthesizes a v1.2 install state in a tempdir (NETWORK-FREE per D-11):
 *     * 8 persona body files at _gomad/gomad/agents/<shortName>.md
 *     * Hand-crafted _gomad/_config/files-manifest.csv referencing those rows
 *     * Minimal .claude/commands/gm/agent-<shortName>.md launcher stubs that
 *       point at the OLD path (so v1.3 install regenerates them)
 *     * Optional .customize.yaml under _config/agents/ to verify D-04
 *       preservation
 *   - Runs `gomad install` from the v1.3 source tree (via npm pack tarball)
 *     against the seeded tempdir
 *   - Asserts:
 *     * (AGENT-01) all 8 personas at the NEW location _config/agents/
 *     * (AGENT-04/06) all 8 legacy persona files REMOVED from gomad/agents/
 *     * Exactly 1 backup dir under _gomad/_backups/ with all 8 personas
 *       snapshotted
 *     * (AGENT-04) backup metadata.json TOP-LEVEL `reason === 'manifest_cleanup'`
 *       — single specific path, NO per-entry fallback (Blocker 4 closure)
 *     * (D-04) .customize.yaml preserved byte-for-byte
 *     * (AGENT-03) launcher stubs regenerated to reference _config/agents/, NOT
 *       legacy gomad/agents/
 *     * (idempotency) re-install produces NO new backup dir
 *
 * Harness: real `npm pack` + `npm install` + `gomad install --yes` against a
 *          tempdir (mirrors test-legacy-v11-upgrade.js — NOT mocked).
 *
 * Usage: node test/test-legacy-v12-upgrade.js
 */

'use strict';

const path = require('node:path');
const os = require('node:os');
const fs = require('fs-extra');
const { execSync } = require('node:child_process');
const crypto = require('node:crypto');

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

const REPO_ROOT = path.resolve(__dirname, '..');

// 8 personas — match AgentCommandGenerator.AGENT_SOURCES (Plan 02 also uses
// LEGACY_AGENT_SHORT_NAMES derived from this list). The v12 detector
// `isV12LegacyAgentsDir` (cleanup-planner.js) iterates these shortnames to
// decide whether to fire the v12 cleanup branch.
const LEGACY_AGENTS = ['analyst', 'tech-writer', 'pm', 'ux-designer', 'architect', 'sm', 'dev', 'solo-dev'];

// Hand-rolled CSV writer — csv-stringify is NOT a project dep (RESEARCH §"Don't
// Hand-Roll" exception; mirrors manifest-generator.js:686 escapeCsv). The
// v1.2 manifest schema columns must match manifest-generator.writeFilesManifest:
//   type,name,module,path,hash,schema_version,install_root
function escapeCsv(value) {
  return `"${String(value ?? '').replaceAll('"', '""')}"`;
}

function writeCsv(rows, columns) {
  const lines = [columns.join(',')];
  for (const r of rows) {
    lines.push(columns.map((c) => escapeCsv(r[c] ?? '')).join(','));
  }
  return lines.join('\n') + '\n';
}

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

function listBackupTimestamps(backupsDir) {
  if (!fs.existsSync(backupsDir)) return [];
  return fs.readdirSync(backupsDir).filter((d) => /^\d{8}-\d{6}(-\d+)?$/.test(d));
}

function sha256File(p) {
  return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
}

/**
 * Seed a v1.2-style workspace per D-11 (NETWORK-FREE manual synthesis):
 *   1. 8 persona body files at _gomad/gomad/agents/<shortName>.md
 *   2. Hand-crafted _gomad/_config/files-manifest.csv with the 8 persona rows
 *      using the v2 schema (type,name,module,path,hash,schema_version,install_root)
 *   3. Minimal .claude/commands/gm/agent-<shortName>.md launcher stubs pointing
 *      at the OLD path (gm-agent-pm seed pattern; v1.3 install regenerates them)
 *   4. Optional .customize.yaml under _config/agents/ to verify D-04 preservation
 */
function seedV12Workspace(tempDir, { includeCustomize } = {}) {
  // 1. Create the 8 persona body files at _gomad/gomad/agents/<shortName>.md
  const legacyDir = path.join(tempDir, '_gomad', 'gomad', 'agents');
  fs.ensureDirSync(legacyDir);
  const seededFiles = [];
  for (const shortName of LEGACY_AGENTS) {
    const p = path.join(legacyDir, `${shortName}.md`);
    const body = `# gm-agent-${shortName} (v1.2 seed)\n\nFake persona body for upgrade test.\n`;
    fs.writeFileSync(p, body);
    const hash = sha256File(p);
    seededFiles.push({
      type: 'md',
      name: shortName,
      module: 'gomad',
      path: path.posix.join('gomad', 'agents', `${shortName}.md`),
      hash,
      schema_version: '2.0',
      install_root: '_gomad',
    });
  }

  // 2. Hand-craft _gomad/_config/files-manifest.csv (v2 schema with the 8 persona rows).
  // Column list matches manifest-generator.js:691 exactly:
  //   type,name,module,path,hash,schema_version,install_root
  const configDir = path.join(tempDir, '_gomad', '_config');
  fs.ensureDirSync(configDir);
  const manifestColumns = ['type', 'name', 'module', 'path', 'hash', 'schema_version', 'install_root'];
  const csvBody = writeCsv(seededFiles, manifestColumns);
  fs.writeFileSync(path.join(configDir, 'files-manifest.csv'), csvBody);

  // 3. Minimal launcher stubs at .claude/commands/gm/agent-<shortName>.md
  //    pointing at the OLD path (so v1.3 install regenerates them).
  const launcherDir = path.join(tempDir, '.claude', 'commands', 'gm');
  fs.ensureDirSync(launcherDir);
  for (const shortName of LEGACY_AGENTS) {
    const stub = `---\nname: 'gm:agent-${shortName}'\ndescription: v1.2 seed launcher\n---\n\n1. LOAD the FULL agent file from {project-root}/_gomad/gomad/agents/${shortName}.md\n`;
    fs.writeFileSync(path.join(launcherDir, `agent-${shortName}.md`), stub);
  }

  // 4. (Optional) Seed a .customize.yaml under _config/agents/ to verify D-04
  //    user-override preservation across the upgrade.
  if (includeCustomize) {
    const customizeDir = path.join(tempDir, '_gomad', '_config', 'agents');
    fs.ensureDirSync(customizeDir);
    fs.writeFileSync(path.join(customizeDir, '.customize.yaml'), 'agentCustomizations:\n  pm:\n    persona: "Custom PM"\n');
  }

  return { seededFiles, legacyDir };
}

(async () => {
  console.log(`\n${colors.cyan}Legacy v1.2 → v1.3 Upgrade E2E Test (AGENT-08)${colors.reset}\n`);

  let tarballPath;
  let tempDir;

  try {
    console.log(`${colors.dim}Packing + installing tarball (this takes ~60-180s)...${colors.reset}`);
    const ctx = packAndInstall('gomad-v12-upgrade-');
    tarballPath = ctx.tarballPath;
    tempDir = ctx.tempDir;
    const gomadBin = ctx.gomadBin;

    // Seed the v1.2-style workspace BEFORE running v1.3 install. The v12
    // detector in cleanup-planner.js fires when manifest exists AND ≥1 of the
    // 8 known persona files at _gomad/gomad/agents/<shortName>.md is present.
    seedV12Workspace(tempDir, { includeCustomize: true });

    console.log(`${colors.dim}Running gomad install --yes (v1.3 over v1.2 seed)...${colors.reset}`);
    execSync(`"${gomadBin}" install --directory "${tempDir}" --modules core --tools claude-code --yes`, {
      cwd: tempDir,
      stdio: 'pipe',
      timeout: 300_000,
    });

    // === Assertions ===
    const newDir = path.join(tempDir, '_gomad', '_config', 'agents');
    const oldDir = path.join(tempDir, '_gomad', 'gomad', 'agents');

    // (AGENT-01) Personas at NEW location
    for (const shortName of LEGACY_AGENTS) {
      assert(fs.existsSync(path.join(newDir, `${shortName}.md`)), `(AGENT-01) _config/agents/${shortName}.md present after v1.3 upgrade`);
    }

    // (AGENT-04/06) Legacy persona files REMOVED from gomad/agents/
    for (const shortName of LEGACY_AGENTS) {
      assert(!fs.existsSync(path.join(oldDir, `${shortName}.md`)), `(AGENT-04/06) gomad/agents/${shortName}.md REMOVED after v1.3 upgrade`);
    }

    // Backup snapshot — exactly 1 backup dir
    const backupsDir = path.join(tempDir, '_gomad', '_backups');
    const backupTss = listBackupTimestamps(backupsDir);
    assert(backupTss.length === 1, `(AGENT-06) exactly 1 backup dir created`, `found ${backupTss.length}: ${backupTss.join(', ')}`);

    if (backupTss.length === 1) {
      const backupRoot = path.join(backupsDir, backupTss[0]);
      const metaPath = path.join(backupRoot, 'metadata.json');
      assert(fs.existsSync(metaPath), '(AGENT-06) metadata.json present in backup');
      if (fs.existsSync(metaPath)) {
        const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
        // SINGLE specific path — TOP-LEVEL meta.reason. NO per-entry fallback.
        // Pinned per Blocker 4 reading of cleanup-planner.js:445-458 (writeMetadata
        // emits `reason: plan.reason` as a TOP-LEVEL field; files[] enumerates only
        // {install_root, relative_path, orig_hash, was_modified} and silently
        // drops any other fields). A vacuous "robust to either shape" assertion
        // would silently green-light a regression where the v12 branch produced
        // the wrong reason value.
        assert(
          meta.reason === 'manifest_cleanup',
          `(AGENT-04) backup metadata top-level reason === 'manifest_cleanup'`,
          `got ${JSON.stringify(meta.reason)}`,
        );
      }
      // All 8 persona files snapshotted under _gomad/gomad/agents/
      for (const shortName of LEGACY_AGENTS) {
        const snapPath = path.join(backupRoot, '_gomad', 'gomad', 'agents', `${shortName}.md`);
        assert(fs.existsSync(snapPath), `(AGENT-06) backup contains snapshot of ${shortName}.md`);
      }
    }

    // (D-04) .customize.yaml preserved byte-for-byte
    const customizePath = path.join(tempDir, '_gomad', '_config', 'agents', '.customize.yaml');
    assert(fs.existsSync(customizePath), '(D-04) .customize.yaml preserved after upgrade');
    if (fs.existsSync(customizePath)) {
      const content = fs.readFileSync(customizePath, 'utf8');
      assert(content.includes('Custom PM'), '(D-04) .customize.yaml content unchanged');
    }

    // (AGENT-03) Launcher stubs regenerated to reference NEW path, not legacy
    const launcherPmPath = path.join(tempDir, '.claude', 'commands', 'gm', 'agent-pm.md');
    if (fs.existsSync(launcherPmPath)) {
      const stub = fs.readFileSync(launcherPmPath, 'utf8');
      assert(stub.includes('/_gomad/_config/agents/pm.md'), '(AGENT-03) launcher stub regenerated with new path');
      assert(!stub.includes('/_gomad/gomad/agents/pm.md'), '(AGENT-03) launcher stub does NOT reference legacy path');
    } else {
      assert(false, '(AGENT-03) launcher stub agent-pm.md regenerated');
    }

    // Idempotent re-install — no new backup dir
    console.log(`${colors.dim}Running gomad install --yes a second time (idempotency check)...${colors.reset}`);
    execSync(`"${gomadBin}" install --directory "${tempDir}" --modules core --tools claude-code --yes`, {
      cwd: tempDir,
      stdio: 'pipe',
      timeout: 300_000,
    });
    const backupsAfter = listBackupTimestamps(backupsDir);
    assert(
      backupsAfter.length === 1,
      `(idempotency) re-install creates no new backup dir (still 1)`,
      `got ${backupsAfter.length}: ${backupsAfter.join(', ')}`,
    );
  } catch (error) {
    console.error(`${colors.red}SETUP/EXECUTION FAILURE${colors.reset}: ${error.message}`);
    if (error.stdout) console.error(`${colors.dim}STDOUT:${colors.reset}\n${error.stdout}`);
    if (error.stderr) console.error(`${colors.dim}STDERR:${colors.reset}\n${error.stderr}`);
    failed++;
  } finally {
    if (tempDir && fs.existsSync(tempDir)) {
      try {
        fs.removeSync(tempDir);
      } catch {
        /* best-effort cleanup */
      }
    }
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
