/**
 * Installer Self-Install Guard Test
 *
 * Verifies D-11 (Pitfall #7, Phase 5):
 *   - Running `gomad install` from cwd that contains src/gomad-skills/ without
 *     --self exits 1 and prints a "gomad source repo" error.
 *   - Running `gomad install --self` from the same cwd passes the guard.
 *   - Running `gomad install` from a cwd without src/gomad-skills/ passes the guard.
 *
 * Usage: node test/test-installer-self-install-guard.js
 */

const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');
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

const repoRoot = path.resolve(__dirname, '..');
const cliPath = path.join(repoRoot, 'tools', 'installer', 'gomad-cli.js');
let fixtureGomadRepo = null;
let fixtureOther = null;

function runCli(cwd, args, timeoutMs = 10_000) {
  return spawnSync('node', [cliPath, 'install', ...args], {
    cwd,
    encoding: 'utf8',
    timeout: timeoutMs,
    // Inherit only env; no TTY — @clack/prompts will bail early in non-TTY but
    // guard runs BEFORE promptInstall() so it fires first.
    env: { ...process.env, FORCE_COLOR: '0' },
  });
}

try {
  console.log(`\n${colors.cyan}Installer Self-Install Guard Test${colors.reset}\n`);

  // Fixture 1: cwd that LOOKS like the gomad source repo (has src/gomad-skills/)
  fixtureGomadRepo = fs.mkdtempSync(path.join(os.tmpdir(), 'gomad-guard-fixture-repo-'));
  fs.ensureDirSync(path.join(fixtureGomadRepo, 'src', 'gomad-skills'));
  // Also create a placeholder agent dir so it looks realistic
  fs.ensureDirSync(path.join(fixtureGomadRepo, 'src', 'gomad-skills', '1-analysis', 'gm-agent-analyst'));

  // Fixture 2: cwd that does NOT look like the gomad source repo
  fixtureOther = fs.mkdtempSync(path.join(os.tmpdir(), 'gomad-guard-fixture-other-'));

  // --- Test 1: guard triggers without --self ---
  const r1 = runCli(fixtureGomadRepo, []);
  assert(
    r1.status === 1,
    'Exit code 1 when installing in gomad source repo without --self',
    `Got status=${r1.status}, stdout=${r1.stdout}, stderr=${r1.stderr}`,
  );
  const combined1 = `${r1.stdout}${r1.stderr}`;
  assert(/gomad source repo/.test(combined1), 'Error message mentions "gomad source repo"', `Output: ${combined1}`);
  assert(/src\/gomad-skills/.test(combined1), 'Error message mentions "src/gomad-skills" marker', `Output: ${combined1}`);
  assert(/--self/.test(combined1), 'Error message mentions "--self" bypass flag', `Output: ${combined1}`);

  // --- Test 2: guard bypasses with --self ---
  // With --self, the guard passes; downstream non-TTY @clack prompts may exit
  // quickly, but crucially NOT with the guard's specific error message.
  const r2 = runCli(fixtureGomadRepo, ['--self']);
  const combined2 = `${r2.stdout}${r2.stderr}`;
  assert(
    !/Refusing to install into the gomad source repo itself/.test(combined2),
    '--self bypasses the guard (guard error message not emitted)',
    `Output: ${combined2}`,
  );

  // --- Test 3: guard does not fire in a non-gomad cwd ---
  const r3 = runCli(fixtureOther, []);
  const combined3 = `${r3.stdout}${r3.stderr}`;
  assert(
    !/Refusing to install into the gomad source repo itself/.test(combined3),
    'Guard does not fire in a cwd without src/gomad-skills/',
    `Output: ${combined3}`,
  );
} finally {
  console.log(`\n${colors.dim}Cleaning up...${colors.reset}`);
  if (fixtureGomadRepo && fs.existsSync(fixtureGomadRepo)) {
    fs.removeSync(fixtureGomadRepo);
  }
  if (fixtureOther && fs.existsSync(fixtureOther)) {
    fs.removeSync(fixtureOther);
  }
}

console.log(
  `\n${colors.cyan}Results:${colors.reset} ${colors.green}${passed} passed${colors.reset}, ${colors.red}${failed} failed${colors.reset}\n`,
);
process.exit(failed > 0 ? 1 : 0);
