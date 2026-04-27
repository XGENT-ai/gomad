/**
 * Fresh v1.3 Install + Idempotency Test (Phase 12 Plan 05 — AGENT-09)
 *
 * Asserts the v1.3 fresh-install layout end-to-end:
 *   - All 8 personas at _gomad/_config/agents/<shortName>.md
 *   - NO legacy _gomad/gomad/agents/ directory
 *   - Manifest CSV has 8 persona rows under _config/agents/ with
 *     install_root='_gomad'
 *   - Launcher stubs reference _config/agents/, not legacy path
 *   - Idempotent re-install produces ZERO new backup dirs (proves AGENT-05
 *     detectCustomFiles whitelist works — without it, the persona files
 *     would be misclassified as custom on the second install)
 *
 * Uses gomad-cli directly (NOT npm pack) for speed — fresh install only,
 * no upgrade simulation needed. Mirrors test-domain-kb-install.js scaffold.
 *
 * Usage: node test/test-v13-agent-relocation.js
 */

'use strict';

const path = require('node:path');
const os = require('node:os');
const { execSync } = require('node:child_process');
const fs = require('fs-extra');
const { parse: csvParse } = require('csv-parse/sync');

const colors = {
  reset: '[0m',
  green: '[32m',
  red: '[31m',
  yellow: '[33m',
  cyan: '[36m',
  dim: '[2m',
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

const PERSONAS = ['analyst', 'tech-writer', 'pm', 'ux-designer', 'architect', 'sm', 'dev', 'solo-dev'];
const REPO_ROOT = path.resolve(__dirname, '..');
// Direct CLI invocation against tools/installer/gomad-cli.js — faster than
// the npm-pack tarball harness used by test-legacy-v12-upgrade.js (no
// upgrade-state seeding required for fresh install).
const CLI_PATH = path.join(REPO_ROOT, 'tools', 'installer', 'gomad-cli.js');

function runInstaller(targetDir) {
  // Non-interactive flags per tools/installer/commands/install.js:
  //   --directory <path>         → confirmedDirectory path
  //   --modules core             → minimal module set
  //   --tools claude-code        → IDE scaffolding incl. launcher stubs at
  //                                .claude/commands/gm/agent-*.md
  //   --yes                      → skipPrompts (defaults for coreConfig + actionType)
  execSync(`node "${CLI_PATH}" install --directory "${targetDir}" --modules core --tools claude-code --yes`, {
    cwd: REPO_ROOT,
    stdio: 'pipe',
    encoding: 'utf8',
    timeout: 180_000,
  });
}

function readFilesManifest(gomadDir) {
  const csv = fs.readFileSync(path.join(gomadDir, '_config', 'files-manifest.csv'), 'utf8');
  return csvParse(csv, { columns: true, skip_empty_lines: true, relax_quotes: false });
}

(async () => {
  console.log(`\n${colors.cyan}Fresh v1.3 Install + Idempotency Test (AGENT-09)${colors.reset}\n`);

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gomad-v13-fresh-'));

  try {
    console.log(`${colors.dim}Target: ${tempDir}${colors.reset}`);
    console.log(`${colors.dim}Running first install...${colors.reset}`);

    // === FIRST INSTALL ===
    runInstaller(tempDir);
    const gomadDir = path.join(tempDir, '_gomad');

    // (AGENT-01) Per-persona presence at NEW location
    for (const sn of PERSONAS) {
      assert(fs.existsSync(path.join(gomadDir, '_config', 'agents', `${sn}.md`)), `(AGENT-01) _config/agents/${sn}.md exists`);
    }

    // (AGENT-09) NO legacy path on fresh v1.3 install
    assert(!fs.existsSync(path.join(gomadDir, 'gomad', 'agents')), '(AGENT-09) gomad/agents/ does NOT exist on fresh v1.3 install');

    // (AGENT-02) Manifest references new path with install_root='_gomad'
    const rows = readFilesManifest(gomadDir);
    const personaRows = rows.filter((r) => {
      const p = (r.path || '').replaceAll('\\', '/');
      return p.includes('_config/agents/') && p.endsWith('.md');
    });
    assert(personaRows.length === 8, `(AGENT-02) 8 persona rows in manifest`, `got ${personaRows.length}`);
    assert(
      personaRows.every((r) => (r.install_root || '_gomad') === '_gomad'),
      '(AGENT-02) all persona rows have install_root="_gomad"',
    );

    // (AGENT-03) Launcher stubs reference NEW path, not legacy
    const launcherDir = path.join(tempDir, '.claude', 'commands', 'gm');
    for (const sn of PERSONAS) {
      const stubPath = path.join(launcherDir, `agent-${sn}.md`);
      if (fs.existsSync(stubPath)) {
        const stub = fs.readFileSync(stubPath, 'utf8');
        assert(stub.includes(`/_gomad/_config/agents/${sn}.md`), `(AGENT-03) agent-${sn}.md launcher references _config/agents/`);
        assert(!stub.includes(`/_gomad/gomad/agents/${sn}.md`), `(AGENT-03) agent-${sn}.md launcher has NO legacy reference`);
      } else {
        assert(false, `(AGENT-03) launcher stub agent-${sn}.md exists`);
      }
    }

    // === SECOND INSTALL (idempotency — proves AGENT-05 whitelist) ===
    console.log(`${colors.dim}Running second install (idempotency check)...${colors.reset}`);
    runInstaller(tempDir);
    const backupsDir = path.join(gomadDir, '_backups');
    const backups = fs.existsSync(backupsDir) ? fs.readdirSync(backupsDir) : [];
    assert(
      backups.length === 0,
      `(AGENT-05) idempotent re-install creates ZERO backup dirs`,
      `got ${backups.length}: ${backups.join(', ')}`,
    );
  } catch (error) {
    console.error(`${colors.red}SETUP/EXECUTION FAILURE${colors.reset}: ${error.message}`);
    if (error.stdout) console.error(`${colors.dim}STDOUT:${colors.reset}\n${error.stdout}`);
    if (error.stderr) console.error(`${colors.dim}STDERR:${colors.reset}\n${error.stderr}`);
    failed++;
  } finally {
    if (fs.existsSync(tempDir)) {
      try {
        fs.removeSync(tempDir);
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
