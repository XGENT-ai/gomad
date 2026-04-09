/**
 * E2E Fresh-Install Test
 *
 * Verifies that a locally-packed tarball installs cleanly and that
 * all gm-* skill directories contain a SKILL.md file.
 *
 * Usage: node test/test-e2e-install.js
 */

const path = require('node:path');
const os = require('node:os');
const { execSync } = require('node:child_process');
const fs = require('fs-extra');
const { globSync } = require('glob');

// ANSI colors
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

/**
 * Test helper: Assert condition
 */
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

const projectRoot = path.resolve(__dirname, '..');
let tarballPath = null;
let tempDir = null;

try {
  // ── 1. Pack the tarball ──────────────────────────────────────────────
  console.log(`\n${colors.cyan}E2E Fresh-Install Test${colors.reset}\n`);
  console.log(`${colors.dim}Packing tarball...${colors.reset}`);

  const packOutput = execSync('npm pack', {
    cwd: projectRoot,
    encoding: 'utf8',
    timeout: 60_000,
  }).trim();

  // npm pack outputs the tarball filename on the last line
  const tarballName = packOutput.split('\n').pop().trim();
  tarballPath = path.join(projectRoot, tarballName);

  assert(fs.existsSync(tarballPath), 'npm pack produces a .tgz tarball file', `Expected: ${tarballPath}`);

  // ── 2. Create temp directory ─────────────────────────────────────────
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gomad-e2e-'));

  assert(fs.existsSync(tempDir), 'Temp directory created');

  // ── 3. Initialize npm project in temp dir ────────────────────────────
  console.log(`${colors.dim}Initializing temp project...${colors.reset}`);

  execSync('npm init -y', {
    cwd: tempDir,
    encoding: 'utf8',
    timeout: 30_000,
    stdio: 'pipe',
  });

  // ── 4. Install tarball in temp dir ───────────────────────────────────
  console.log(`${colors.dim}Installing tarball (timeout: 120s)...${colors.reset}`);

  execSync(`npm install "${tarballPath}"`, {
    cwd: tempDir,
    encoding: 'utf8',
    timeout: 120_000,
    stdio: 'pipe',
  });

  assert(true, 'npm install of tarball exits 0');

  // ── 5. Verify structure ──────────────────────────────────────────────
  const pkgDir = path.join(tempDir, 'node_modules', '@xgent-ai', 'gomad');

  const srcExists = fs.existsSync(path.join(pkgDir, 'src'));
  assert(srcExists, 'Installed package contains src/ directory', `Checked: ${pkgDir}/src`);

  const toolsExists = fs.existsSync(path.join(pkgDir, 'tools', 'installer'));
  assert(toolsExists, 'Installed package contains tools/installer/ directory', `Checked: ${pkgDir}/tools/installer`);

  // ── 6. Verify gm-* skills have SKILL.md ──────────────────────────────
  const skillDirs = globSync('**/gm-*/', { cwd: path.join(pkgDir, 'src') });

  assert(skillDirs.length > 0, `Found gm-* skill directories (${skillDirs.length})`, 'Expected at least one gm-* directory');

  let missingSkillMd = [];
  for (const skillDir of skillDirs) {
    const skillMdPath = path.join(pkgDir, 'src', skillDir, 'SKILL.md');
    if (!fs.existsSync(skillMdPath)) {
      missingSkillMd.push(skillDir);
    }
  }

  assert(
    missingSkillMd.length === 0,
    `All gm-* skill directories have SKILL.md (${skillDirs.length} checked)`,
    `Missing SKILL.md in: ${missingSkillMd.join(', ')}`,
  );

  // Also check core-skills gm-* directories
  const coreSkillDirs = globSync('**/gm-*/', { cwd: path.join(pkgDir, 'src', 'core-skills') });

  if (coreSkillDirs.length > 0) {
    let missingCoreMd = [];
    for (const skillDir of coreSkillDirs) {
      const skillMdPath = path.join(pkgDir, 'src', 'core-skills', skillDir, 'SKILL.md');
      if (!fs.existsSync(skillMdPath)) {
        missingCoreMd.push(skillDir);
      }
    }

    assert(
      missingCoreMd.length === 0,
      `All core-skills gm-* directories have SKILL.md (${coreSkillDirs.length} checked)`,
      `Missing SKILL.md in core-skills: ${missingCoreMd.join(', ')}`,
    );
  }

  const totalSkills = skillDirs.length + coreSkillDirs.length;
  console.log(`\n${colors.dim}Total gm-* skills verified: ${totalSkills}${colors.reset}`);
} catch (error) {
  console.log(`${colors.red}\u2717${colors.reset} Unexpected error during E2E test`);
  console.log(`  ${colors.dim}${error.message}${colors.reset}`);
  failed++;
} finally {
  // ── 7. Cleanup ─────────────────────────────────────────────────────
  console.log(`\n${colors.dim}Cleaning up...${colors.reset}`);

  if (tempDir && fs.existsSync(tempDir)) {
    fs.removeSync(tempDir);
    assert(!fs.existsSync(tempDir), 'Temp directory cleaned up');
  }

  if (tarballPath && fs.existsSync(tarballPath)) {
    fs.unlinkSync(tarballPath);
    assert(!fs.existsSync(tarballPath), 'Tarball file cleaned up');
  }
}

// ── 8. Summary ─────────────────────────────────────────────────────────
console.log(
  `\n${colors.cyan}Results:${colors.reset} ${colors.green}${passed} passed${colors.reset}, ${colors.red}${failed} failed${colors.reset}\n`,
);

process.exit(failed > 0 ? 1 : 0);
