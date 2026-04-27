/**
 * Regression test — ExistingInstall.detect must migrate the legacy
 * `gomad` module id to `agile`.
 *
 * Background: pre-853aeb3 src/gomad-skills/module.yaml had `code: gomad`,
 * so manifests written under that revision recorded the agile module as
 * `gomad`. After the rename to `code: agile`, listAvailable() now returns
 * id `agile` — but old manifests still list `gomad` (sometimes alongside
 * a freshly-added `agile` row after a re-install). On update, the install
 * flow then warns:
 *
 *     Skipping 1 module(s) - no source available: gomad
 *
 * The detect() pass should normalize legacy `gomad` → `agile` on read
 * and de-duplicate so the next manifest write drops the stale row.
 *
 * Usage: node test/test-existing-install-migration.js
 */

'use strict';

const assert = require('node:assert/strict');
const path = require('node:path');
const os = require('node:os');
const fs = require('fs-extra');

const { ExistingInstall } = require('../tools/installer/core/existing-install');

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

function check(name, fn) {
  try {
    fn();
    console.log(`  ${colors.green}✓${colors.reset} ${name}`);
    passed++;
  } catch (error) {
    console.log(`  ${colors.red}✗${colors.reset} ${name}`);
    console.log(`    ${colors.dim}${error.message}${colors.reset}`);
    failed++;
  }
}

async function makeTmpDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'gomad-existing-install-'));
}

async function seedManifest(gomadDir, manifestYamlBody) {
  await fs.ensureDir(path.join(gomadDir, '_config'));
  await fs.writeFile(path.join(gomadDir, '_config', 'manifest.yaml'), manifestYamlBody, 'utf8');
}

async function ensureCore(gomadDir) {
  // detect() needs a `core/` dir to consider the install hasCore=true; without
  // it, an install that only has manifest data is still treated as installed
  // because manifestData is non-null, so the core dir isn't strictly required.
  // Add an empty one anyway so we mirror real installs.
  await fs.ensureDir(path.join(gomadDir, 'core'));
}

(async () => {
  console.log(`${colors.cyan}========================================`);
  console.log('ExistingInstall legacy-id Migration Tests');
  console.log(`========================================${colors.reset}\n`);

  // -------------------------------------------------------------------------
  // Case A — manifest with both `agile` and legacy `gomad` (real-world repro)
  // -------------------------------------------------------------------------
  console.log(`${colors.yellow}Case A: manifest has both agile and legacy gomad${colors.reset}`);
  let tmpA;
  try {
    tmpA = await makeTmpDir();
    const gomadDir = path.join(tmpA, '_gomad');
    await ensureCore(gomadDir);
    await seedManifest(
      gomadDir,
      `installation:
  version: 1.2.0
  installDate: 2026-04-26T06:22:59.621Z
  lastUpdated: 2026-04-26T06:22:59.799Z
modules:
  - name: core
    version: 1.2.0
    source: built-in
  - name: agile
    version: null
    source: unknown
  - name: gomad
    version: 1.2.0
    source: built-in
`,
    );

    const result = await ExistingInstall.detect(gomadDir);
    check('A1 detect() succeeds', () => assert.equal(result.installed, true));
    check('A2 moduleIds contains agile', () => assert.equal(result.moduleIds.includes('agile'), true));
    check('A3 moduleIds does NOT contain legacy gomad', () =>
      assert.equal(result.moduleIds.includes('gomad'), false),
    );
    check('A4 no duplicate agile entries (de-dup)', () => {
      const agileCount = result.moduleIds.filter((id) => id === 'agile').length;
      assert.equal(agileCount, 1);
    });
  } catch (error) {
    check('A0 case A ran without throwing', () => {
      throw error;
    });
  } finally {
    if (tmpA) await fs.remove(tmpA);
  }
  console.log('');

  // -------------------------------------------------------------------------
  // Case B — manifest with ONLY legacy `gomad` (older install, never updated)
  // -------------------------------------------------------------------------
  console.log(`${colors.yellow}Case B: manifest has only legacy gomad${colors.reset}`);
  let tmpB;
  try {
    tmpB = await makeTmpDir();
    const gomadDir = path.join(tmpB, '_gomad');
    await ensureCore(gomadDir);
    await seedManifest(
      gomadDir,
      `installation:
  version: 1.1.0
modules:
  - name: core
    version: 1.1.0
  - name: gomad
    version: 1.1.0
`,
    );

    const result = await ExistingInstall.detect(gomadDir);
    check('B1 legacy gomad migrates to agile', () => assert.equal(result.moduleIds.includes('agile'), true));
    check('B2 no gomad in moduleIds', () => assert.equal(result.moduleIds.includes('gomad'), false));
  } catch (error) {
    check('B0 case B ran without throwing', () => {
      throw error;
    });
  } finally {
    if (tmpB) await fs.remove(tmpB);
  }
  console.log('');

  // -------------------------------------------------------------------------
  // Case C — clean modern manifest (only `agile`) — must remain unchanged
  // -------------------------------------------------------------------------
  console.log(`${colors.yellow}Case C: modern manifest with only agile${colors.reset}`);
  let tmpC;
  try {
    tmpC = await makeTmpDir();
    const gomadDir = path.join(tmpC, '_gomad');
    await ensureCore(gomadDir);
    await seedManifest(
      gomadDir,
      `installation:
  version: 1.3.0
modules:
  - name: core
    version: 1.3.0
  - name: agile
    version: 1.3.0
`,
    );

    const result = await ExistingInstall.detect(gomadDir);
    check('C1 modern manifest preserves agile', () =>
      assert.deepEqual([...result.moduleIds].sort(), ['agile', 'core']),
    );
    check('C2 single agile entry only', () => {
      const agileCount = result.moduleIds.filter((id) => id === 'agile').length;
      assert.equal(agileCount, 1);
    });
  } catch (error) {
    check('C0 case C ran without throwing', () => {
      throw error;
    });
  } finally {
    if (tmpC) await fs.remove(tmpC);
  }
  console.log('');

  // -------------------------------------------------------------------------
  // Case D — third-party module with id NOT 'gomad' must pass through.
  // -------------------------------------------------------------------------
  console.log(`${colors.yellow}Case D: third-party module ids untouched${colors.reset}`);
  let tmpD;
  try {
    tmpD = await makeTmpDir();
    const gomadDir = path.join(tmpD, '_gomad');
    await ensureCore(gomadDir);
    await seedManifest(
      gomadDir,
      `installation:
  version: 1.3.0
modules:
  - name: core
    version: 1.3.0
  - name: my-custom-mod
    version: 0.1.0
`,
    );
    const result = await ExistingInstall.detect(gomadDir);
    check('D1 custom module id preserved verbatim', () =>
      assert.equal(result.moduleIds.includes('my-custom-mod'), true),
    );
  } catch (error) {
    check('D0 case D ran without throwing', () => {
      throw error;
    });
  } finally {
    if (tmpD) await fs.remove(tmpD);
  }
  console.log('');

  console.log(`${colors.cyan}========================================${colors.reset}`);
  console.log(
    `Total: ${passed + failed}, Passed: ${colors.green}${passed}${colors.reset}, Failed: ${
      failed > 0 ? colors.red : colors.green
    }${failed}${colors.reset}`,
  );
  console.log(`${colors.cyan}========================================${colors.reset}\n`);

  if (failed > 0) process.exit(1);
})().catch((error) => {
  console.error(`${colors.red}Fatal:${colors.reset}`, error);
  process.exit(1);
});
