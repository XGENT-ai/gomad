/**
 * gm-Command Surface Test
 *
 * Verifies the /gm:agent-* launcher contract (D-07, CMD-05):
 *   .claude/commands/gm/agent-<name>.md has frontmatter
 *     name: gm:agent-<name>
 *     description: <non-empty string>
 *
 * Phase A: In-repo self-check (no-op in Phase 5 baseline; meaningful once
 *          Phase 6 generator populates .claude/commands/gm/ in the dev tree
 *          via --self install, if ever; otherwise stays no-op because
 *          .gitignore ignores .claude/commands/gm/ per Plan 05-02).
 * Phase B: Fixture-based negative test (validates the structural assertion
 *          itself correctly detects drift — runs always).
 * Phase C: Install-smoke (LIVE in Phase 5). Packs the tarball, installs it
 *          into a tempDir fixture, invokes `gomad install` non-interactively,
 *          asserts clean exit, and conditionally asserts structural layout
 *          on any .claude/commands/gm/agent-*.md the installer produces.
 *          Phase 6 will flip the conditional structural assertion into a
 *          hard assertion — once agent-command-generator.js lands, a missing
 *          .claude/commands/gm/ MUST fail the test.
 *
 * Usage: node test/test-gm-command-surface.js
 */

const path = require('node:path');
const os = require('node:os');
const { execSync } = require('node:child_process');
const fs = require('fs-extra');
const yaml = require('js-yaml');
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

const REPO_ROOT = path.resolve(__dirname, '..');

console.log(`\n${colors.cyan}gm-Command Surface Test${colors.reset}\n`);

// ─── Phase A — In-repo structural self-check ────────────────────────────
// Phase A runs against the dev repo's working tree. In Phase 5 baseline
// (before Phase 6 ships agent-command-generator.js), .claude/commands/gm/
// does not yet exist in the repo and this phase is a no-op with an INFO log.
// In Phase 6 and beyond, the generator populates it and these structural
// assertions become load-bearing.
console.log(`${colors.cyan}Phase A — in-repo self-check${colors.reset}`);
const gmDir = path.join(REPO_ROOT, '.claude', 'commands', 'gm');
const gmDirExists = fs.existsSync(gmDir);
if (gmDirExists) {
  const repoStubs = globSync('agent-*.md', { cwd: gmDir });
  for (const file of repoStubs) {
    const stubPath = path.join(gmDir, file);
    const raw = fs.readFileSync(stubPath, 'utf8');
    const match = raw.match(/^---\n([\s\S]*?)\n---/);
    assert(Boolean(match), `(A) ${file} has YAML frontmatter`);
    if (!match) continue;

    let fm;
    try {
      fm = yaml.load(match[1]);
    } catch (error) {
      assert(false, `(A) ${file} frontmatter parses as YAML`, error.message);
      continue;
    }
    const agentName = path.basename(file, '.md').replace(/^agent-/, '');
    assert(
      fm && fm.name === `gm:agent-${agentName}`,
      `(A) ${file} frontmatter name matches gm:agent-${agentName}`,
      `Got: ${fm ? fm.name : '<no name>'}`,
    );
    assert(fm && typeof fm.description === 'string' && fm.description.length > 0, `(A) ${file} has non-empty description`);
  }
} else {
  console.log(
    `${colors.yellow}\u26A0${colors.reset} .claude/commands/gm/ not present in repo ` +
      `(Phase 5 baseline — Phase 6 generator will populate it). Skipping in-repo structural assertions.`,
  );
}

// ─── Phase B — Fixture-based negative test ──────────────────────────────
// Validates the structural assertion itself correctly detects drift.
// Uses a LOCAL counter so negatives don't pollute the global pass/fail tally.
console.log(`\n${colors.cyan}Phase B — negative-fixture self-test${colors.reset}`);
let negTempDir = null;
try {
  negTempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gomad-gm-surface-neg-'));
  const negGmDir = path.join(negTempDir, '.claude', 'commands', 'gm');
  fs.ensureDirSync(negGmDir);

  // Good fixture — SHOULD pass the structural check
  fs.writeFileSync(
    path.join(negGmDir, 'agent-pm.md'),
    ['---', 'name: gm:agent-pm', 'description: "Project manager persona launcher."', '---', '', 'Body.', ''].join('\n'),
  );

  // Bad fixture — structural check MUST detect name mismatch
  fs.writeFileSync(
    path.join(negGmDir, 'agent-broken.md'),
    ['---', 'name: wrong:name', 'description: "Broken."', '---', '', 'Body.', ''].join('\n'),
  );

  let negPassed = 0;
  let negFailed = 0;
  const fixtureFiles = globSync('agent-*.md', { cwd: negGmDir });
  for (const file of fixtureFiles) {
    const stubPath = path.join(negGmDir, file);
    const raw = fs.readFileSync(stubPath, 'utf8');
    const match = raw.match(/^---\n([\s\S]*?)\n---/);
    if (!match) {
      negFailed++;
      continue;
    }
    let fm;
    try {
      fm = yaml.load(match[1]);
    } catch {
      negFailed++;
      continue;
    }
    const agentName = path.basename(file, '.md').replace(/^agent-/, '');
    if (fm && fm.name === `gm:agent-${agentName}` && typeof fm.description === 'string' && fm.description.length > 0) {
      negPassed++;
    } else {
      negFailed++;
    }
  }

  assert(
    negFailed === 1 && negPassed === 1,
    'Negative fixture correctly detects name mismatch (1 pass, 1 detected failure)',
    `Got negPassed=${negPassed}, negFailed=${negFailed}`,
  );
} catch (error) {
  assert(false, 'Phase B — negative-fixture self-test ran without unexpected error', error.message);
} finally {
  if (negTempDir && fs.existsSync(negTempDir)) {
    fs.removeSync(negTempDir);
  }
}

// ─── Phase C — Install-smoke ────────────────────────────────────────────
// Packs the tarball, installs into a tempDir, invokes `gomad install`
// non-interactively, asserts clean exit, and conditionally asserts the
// structural layout on any installer-produced .claude/commands/gm/agent-*.md.
console.log(`\n${colors.cyan}Phase C — install-smoke${colors.reset}`);
let tarballPath = null;
let installTempDir = null;
try {
  console.log(`${colors.dim}Packing tarball...${colors.reset}`);
  const packOutput = execSync('npm pack', {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    timeout: 60_000,
  }).trim();
  const tarballName = packOutput.split('\n').pop().trim();
  tarballPath = path.join(REPO_ROOT, tarballName);
  assert(fs.existsSync(tarballPath), 'npm pack produces a .tgz tarball', `Expected: ${tarballPath}`);

  installTempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gomad-gm-surface-install-'));
  assert(fs.existsSync(installTempDir), 'Install-smoke temp directory created');

  console.log(`${colors.dim}Initializing temp project...${colors.reset}`);
  execSync('npm init -y', { cwd: installTempDir, stdio: 'pipe', timeout: 30_000 });

  console.log(`${colors.dim}Installing tarball (timeout: 120s)...${colors.reset}`);
  execSync(`npm install "${tarballPath}"`, { cwd: installTempDir, stdio: 'pipe', timeout: 120_000 });

  const gomadBin = path.join(installTempDir, 'node_modules', '.bin', 'gomad');
  assert(fs.existsSync(gomadBin), 'gomad bin present in installed node_modules/.bin', `Checked: ${gomadBin}`);

  console.log(`${colors.dim}Running non-interactive gomad install (timeout: 180s)...${colors.reset}`);
  // NOTE: --self is NOT passed. The self-install guard (Plan 05-02, Wave 2)
  // only triggers when src/gomad-skills/ is detected in cwd. installTempDir
  // is under os.tmpdir() and has no such directory, so the guard will not
  // trip once Wave 2 lands. Do not add --self here.
  try {
    execSync(`"${gomadBin}" install --yes --directory "${installTempDir}" --tools claude-code`, {
      cwd: installTempDir,
      stdio: 'pipe',
      timeout: 180_000,
    });
    assert(true, 'gomad install --yes --directory <tempDir> --tools claude-code exits 0');
  } catch (error) {
    assert(false, 'gomad install --yes --directory <tempDir> --tools claude-code exits 0', error.message);
  }

  // Conditional structural assertion on installed output.
  // Phase 5 baseline: installer does NOT yet emit .claude/commands/gm/ —
  // the directory's absence is expected and we log a neutral INFO.
  // Phase 6 MUST flip this conditional into a hard assertion:
  //   assert(fs.existsSync(installedGmDir), '.claude/commands/gm/ present in installed output');
  const installedGmDir = path.join(installTempDir, '.claude', 'commands', 'gm');
  if (fs.existsSync(installedGmDir)) {
    const stubs = globSync('agent-*.md', { cwd: installedGmDir });
    assert(
      stubs.length > 0,
      `Installer produced .claude/commands/gm/agent-*.md stubs (count: ${stubs.length})`,
      'Expected at least one agent-*.md file',
    );
    for (const file of stubs) {
      const stubPath = path.join(installedGmDir, file);
      const raw = fs.readFileSync(stubPath, 'utf8');
      const match = raw.match(/^---\n([\s\S]*?)\n---/);
      assert(Boolean(match), `(C) ${file} has YAML frontmatter`);
      if (!match) continue;

      let fm;
      try {
        fm = yaml.load(match[1]);
      } catch (error) {
        assert(false, `(C) ${file} frontmatter parses as YAML`, error.message);
        continue;
      }
      const agentName = path.basename(file, '.md').replace(/^agent-/, '');
      assert(
        fm && fm.name === `gm:agent-${agentName}`,
        `(C) ${file} frontmatter name matches gm:agent-${agentName}`,
        `Got: ${fm ? fm.name : '<no name>'}`,
      );
      assert(fm && typeof fm.description === 'string' && fm.description.length > 0, `(C) ${file} has non-empty description`);
    }
  } else {
    console.log(
      `${colors.yellow}\u26A0${colors.reset} Installed .claude/commands/gm/ not present (Phase 5 baseline — ` +
        `expected before Phase 6 ships agent-command-generator.js). Structural assertion skipped.`,
    );
    console.log(`${colors.dim}  Phase 6 will flip this conditional into a hard assertion.${colors.reset}`);
  }
} catch (error) {
  console.log(`${colors.red}\u2717${colors.reset} Unexpected error during install-smoke`);
  console.log(`  ${colors.dim}${error.message}${colors.reset}`);
  failed++;
} finally {
  console.log(`\n${colors.dim}Cleaning up install-smoke fixtures...${colors.reset}`);
  if (installTempDir && fs.existsSync(installTempDir)) {
    fs.removeSync(installTempDir);
    assert(!fs.existsSync(installTempDir), 'Install-smoke temp directory cleaned up');
  }
  if (tarballPath && fs.existsSync(tarballPath)) {
    fs.unlinkSync(tarballPath);
    assert(!fs.existsSync(tarballPath), 'Tarball file cleaned up');
  }
}

// ─── Summary ────────────────────────────────────────────────────────────
console.log(
  `\n${colors.cyan}Results:${colors.reset} ${colors.green}${passed} passed${colors.reset}, ${colors.red}${failed} failed${colors.reset}\n`,
);

process.exit(failed > 0 ? 1 : 0);
