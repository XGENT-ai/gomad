// test/test-publish-e2e.js
// End-to-end publish verification: pack the repo, install the tarball into a
// randomized os.tmpdir() fixture, run `gomad install --preset full --yes`, and
// assert the project-local ./.claude/ tree was populated. Satisfies PUB-02 +
// PUB-03 in a single test. See .planning/phases/04-publish-and-verify/04-02-PLAN.md.
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import {
  existsSync, mkdirSync, writeFileSync, rmSync, readdirSync,
} from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { randomBytes } from 'node:crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');

// 120s budget: npm pack ~5-15s, npm install of tarball into fresh dir ~10-30s,
// gomad install --preset full ~5-20s. 120s leaves comfortable headroom.
// Note: enforced via --test-timeout=120000 at the runner level (package.json
// scripts.test) — the per-describe { timeout } option requires Node 20.4+ and
// engines.node is >=18.0.0, so we use the runner flag instead.
const E2E_TIMEOUT_MS = 120_000;
void E2E_TIMEOUT_MS;

describe('Publish E2E: pack -> install tarball -> run CLI', () => {
  let fixtureDir;
  let tarballPath;

  before(() => {
    // 1. Pack the repo. npm pack prints the tarball filename on the last line
    // of stdout. Tarball lands in PROJECT_ROOT by default.
    const packOutput = execSync('npm pack --silent', {
      cwd: PROJECT_ROOT,
      encoding: 'utf8',
      timeout: 60_000,
    }).trim();
    const tarballName = packOutput.split('\n').pop().trim();
    tarballPath = join(PROJECT_ROOT, tarballName);
    assert.ok(existsSync(tarballPath), `tarball should exist at ${tarballPath}`);

    // 2. Create randomized fixture under os.tmpdir() (64 bits of entropy per
    // T-04-07 in 04-02-PLAN.md threat model).
    const fixtureName = `gomad-e2e-${randomBytes(8).toString('hex')}`;
    fixtureDir = join(tmpdir(), fixtureName);
    mkdirSync(fixtureDir, { recursive: true });

    // 3. Stub package.json (npm install requires one).
    writeFileSync(
      join(fixtureDir, 'package.json'),
      JSON.stringify({ name: 'gomad-e2e-fixture', version: '0.0.0', private: true }, null, 2),
      'utf8',
    );

    // 4. Install the tarball. --ignore-scripts blocks any pre/post-install
    // lifecycle scripts (T-04-08 mitigation, defense-in-depth). Other flags
    // keep the fixture minimal and quiet.
    execSync(
      `npm install --no-audit --no-fund --no-package-lock --ignore-scripts --silent "${tarballPath}"`,
      {
        cwd: fixtureDir,
        stdio: 'inherit',
        timeout: 90_000,
      },
    );
  });

  after(() => {
    // Cleanup runs unconditionally (node:test guarantees `after` runs even on
    // assertion failure). force: true swallows ENOENT; existsSync guards avoid
    // double-faults on partial setup.
    if (fixtureDir && existsSync(fixtureDir)) {
      rmSync(fixtureDir, { recursive: true, force: true });
    }
    if (tarballPath && existsSync(tarballPath)) {
      rmSync(tarballPath, { force: true });
    }
  });

  it('npx gomad install --preset full --yes populates ./.claude/', () => {
    // Call the bin from node_modules/.bin directly — faster than npx, no
    // network resolution, no prompting. Existence of the symlink proves the
    // `bin` field in package.json is wired correctly.
    const cliPath = join(fixtureDir, 'node_modules', '.bin', 'gomad');
    assert.ok(existsSync(cliPath), `gomad bin should be linked at ${cliPath}`);

    // Run the install. cwd = fixtureDir so installer.js writes ./.claude/
    // inside the fixture, not the test runner's cwd.
    const output = execSync(`"${cliPath}" install --preset full --yes`, {
      cwd: fixtureDir,
      encoding: 'utf8',
      timeout: 60_000,
    });

    // Sanity check on output — installer.js can silent-return on failure
    // paths (see tools/installer.js:174-188), so we check banner + summary
    // in addition to filesystem state below.
    assert.ok(output.includes('gomad install'), 'expected install banner');
    assert.ok(output.includes('Installed'), 'expected "Installed N files" summary');

    // Filesystem assertions: derived from ASSET_DIRS in tools/installer.js:19-24.
    // The `full` preset has include_all: true (catalog/presets.yaml), so every
    // populated assets/<type>/ subtree should appear under .claude/.
    const claudeDir = join(fixtureDir, '.claude');
    assert.ok(existsSync(claudeDir), '.claude/ should exist');

    // These four asset types map directly from assets/<type>/ to their
    // install targets per ASSET_DIRS. NOTE: there is no `skills` entry and
    // no assets/skills/ — do NOT assert on .claude/skills (would always fail).
    const expectedSubdirs = [
      join(claudeDir, 'rules'),
      join(claudeDir, 'commands'),
      join(claudeDir, 'agents'),
      join(claudeDir, 'scripts', 'hooks'),
    ];

    for (const subdir of expectedSubdirs) {
      assert.ok(existsSync(subdir), `${subdir} should exist`);
      assert.ok(readdirSync(subdir).length > 0, `${subdir} should be non-empty`);
    }

    // Manifest must be written to .claude/.gomad-manifest.yaml
    assert.ok(
      existsSync(join(claudeDir, '.gomad-manifest.yaml')),
      '.gomad-manifest.yaml should be written',
    );

    // Lockfile must be written to fixture root
    assert.ok(
      existsSync(join(fixtureDir, 'gomad.lock.yaml')),
      'gomad.lock.yaml should be written to fixture root',
    );
  });
});
