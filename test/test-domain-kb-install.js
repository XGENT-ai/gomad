/**
 * test/test-domain-kb-install.js
 *
 * STORY-11 (Plan 10-02): Fresh `gomad install` copies `src/domain-kb/*` into
 * `<installRoot>/_config/kb/*` and every copied file appears in
 * `<installRoot>/_config/files-manifest.csv` under `install_root="_gomad"` +
 * `schema_version="2.0"`. Re-install is idempotent — no duplicate manifest rows,
 * no drift in row count.
 *
 * Strategy: invoke the local installer CLI (`node tools/installer/gomad-cli.js`)
 * non-interactively via `--modules core --tools none --yes`, pointed at a
 * tempdir. This exercises the full install path end-to-end (modules → KB copy →
 * manifest generation) without the `npm pack` overhead of test-e2e-install.js.
 *
 * Assertions (driven by plan 10-02 acceptance criteria):
 *   1. `_config/kb/testing/SKILL.md` + `_config/kb/architecture/SKILL.md` land on disk
 *   2. At least one file under `_config/kb/testing/reference/` + `_config/kb/architecture/reference/`
 *   3. Every KB row in `files-manifest.csv` has `install_root="_gomad"` + `schema_version="2.0"`
 *   4. Re-install: the KB row count stays stable (no duplicates)
 *
 * Exit code: 0 on success, 1 on any assertion failure.
 */

const path = require('node:path');
const os = require('node:os');
const { execSync } = require('node:child_process');
const fs = require('fs-extra');
const { parse: csvParse } = require('csv-parse/sync');

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

const projectRoot = path.resolve(__dirname, '..');
const cliPath = path.join(projectRoot, 'tools', 'installer', 'gomad-cli.js');

function runInstaller(targetDir) {
  // Non-interactive flags per tools/installer/commands/install.js:
  //   --directory <path>  → confirmedDirectory path
  //   --modules core      → minimal module set (source of truth via AGENT_SOURCES)
  //   --tools none        → skipIde = true, no IDE scaffolding written
  //   --yes               → skipPrompts (defaults for coreConfig + actionType)
  execSync(`node "${cliPath}" install --directory "${targetDir}" --modules core --tools none --yes`, {
    cwd: projectRoot,
    encoding: 'utf8',
    timeout: 120_000,
    stdio: 'pipe',
  });
}

function readFilesManifest(gomadDir) {
  const csv = fs.readFileSync(path.join(gomadDir, '_config', 'files-manifest.csv'), 'utf8');
  return csvParse(csv, { columns: true, skip_empty_lines: true, relax_quotes: false });
}

async function main() {
  console.log(`\n${colors.cyan}Domain KB Install Test (STORY-11)${colors.reset}\n`);

  // ── Pre-flight: confirm seed packs exist (Wave 1 Plan 10-05 output) ───
  const seedRoot = path.join(projectRoot, 'src', 'domain-kb');
  if (!fs.existsSync(seedRoot)) {
    console.log(`${colors.red}✗${colors.reset} src/domain-kb/ missing — STORY-11 prerequisite not met`);
    console.log(`  ${colors.dim}Expected Wave 1 (Plan 10-05) seed KB packs at ${seedRoot}${colors.reset}`);
    process.exit(1);
  }
  assert(fs.existsSync(path.join(seedRoot, 'testing')), 'Pre-flight: src/domain-kb/testing/ exists (Wave 1 output)');
  assert(fs.existsSync(path.join(seedRoot, 'architecture')), 'Pre-flight: src/domain-kb/architecture/ exists (Wave 1 output)');

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gomad-kb-install-'));

  try {
    console.log(`${colors.dim}Target: ${tempDir}${colors.reset}`);
    console.log(`${colors.dim}Running fresh install...${colors.reset}`);

    // ── FRESH INSTALL ─────────────────────────────────────────────────
    runInstaller(tempDir);

    const gomadDir = path.join(tempDir, '_gomad');
    const kbDir = path.join(gomadDir, '_config', 'kb');

    assert(fs.existsSync(kbDir), 'Fresh install creates _gomad/_config/kb/ directory');
    assert(fs.existsSync(path.join(kbDir, 'testing', 'SKILL.md')), '_config/kb/testing/SKILL.md landed from src/domain-kb/testing/');
    assert(
      fs.existsSync(path.join(kbDir, 'architecture', 'SKILL.md')),
      '_config/kb/architecture/SKILL.md landed from src/domain-kb/architecture/',
    );

    // At least one nested reference file in each pack — confirms recursive copy
    const testingRefDir = path.join(kbDir, 'testing', 'reference');
    const archRefDir = path.join(kbDir, 'architecture', 'reference');
    assert(
      fs.existsSync(testingRefDir) && fs.readdirSync(testingRefDir).length > 0,
      '_config/kb/testing/reference/ is non-empty (recursive copy worked)',
    );
    assert(
      fs.existsSync(archRefDir) && fs.readdirSync(archRefDir).length > 0,
      '_config/kb/architecture/reference/ is non-empty (recursive copy worked)',
    );

    // ── MANIFEST SHAPE ────────────────────────────────────────────────
    const manifest = readFilesManifest(gomadDir);
    const kbRows = manifest.filter((row) => typeof row.path === 'string' && row.path.startsWith('_config/kb/'));

    assert(kbRows.length > 0, `files-manifest.csv contains KB rows (got ${kbRows.length})`);
    assert(
      kbRows.every((row) => row.install_root === '_gomad'),
      'Every KB row has install_root="_gomad"',
      `Rows with wrong install_root: ${kbRows
        .filter((r) => r.install_root !== '_gomad')
        .map((r) => `${r.path}→${r.install_root}`)
        .join(', ')}`,
    );
    assert(
      kbRows.every((row) => row.schema_version === '2.0'),
      'Every KB row has schema_version="2.0"',
      `Rows with wrong schema_version: ${kbRows
        .filter((r) => r.schema_version !== '2.0')
        .map((r) => `${r.path}→${r.schema_version}`)
        .join(', ')}`,
    );

    // Every .md file on disk under _config/kb/ has a corresponding manifest row
    const { globSync } = require('glob');
    const kbDiskFiles = globSync('**/*.md', { cwd: kbDir, absolute: false });
    const kbDiskRelPaths = new Set(kbDiskFiles.map((f) => path.posix.join('_config/kb', f)));
    const kbManifestPaths = new Set(kbRows.map((r) => r.path));
    const missingFromManifest = [...kbDiskRelPaths].filter((p) => !kbManifestPaths.has(p));
    assert(
      missingFromManifest.length === 0,
      `Every KB .md file on disk appears in files-manifest.csv (${kbDiskFiles.length} files)`,
      `Missing from manifest: ${missingFromManifest.join(', ')}`,
    );

    // ── IDEMPOTENCY: run install again, expect stable row count ───────
    console.log(`${colors.dim}Running second install (idempotency check)...${colors.reset}`);
    runInstaller(tempDir);

    const manifest2 = readFilesManifest(gomadDir);
    const kbRows2 = manifest2.filter((row) => typeof row.path === 'string' && row.path.startsWith('_config/kb/'));

    assert(
      kbRows2.length === kbRows.length,
      `Re-install preserves KB row count (${kbRows.length} after first install, ${kbRows2.length} after second)`,
      `Row count changed by ${kbRows2.length - kbRows.length} after re-install`,
    );

    // No duplicate rows (path uniqueness within KB subset)
    const uniquePaths2 = new Set(kbRows2.map((r) => r.path));
    assert(
      uniquePaths2.size === kbRows2.length,
      `Re-install produces no duplicate KB rows (${uniquePaths2.size} unique of ${kbRows2.length})`,
    );
  } finally {
    // ── CLEANUP ───────────────────────────────────────────────────────
    if (fs.existsSync(tempDir)) {
      fs.removeSync(tempDir);
    }
  }

  console.log();
  console.log(
    `${colors.cyan}Results:${colors.reset} ${colors.green}${passed} passed${colors.reset}, ${colors.red}${failed} failed${colors.reset}`,
  );
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error(`${colors.red}Unexpected error:${colors.reset} ${error.message}`);
  if (error.stack) {
    console.error(error.stack);
  }
  process.exit(1);
});
