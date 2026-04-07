import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, rmSync, readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { parse as parseYaml } from 'yaml';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');
const CLI = join(PROJECT_ROOT, 'bin', 'mobmad-cli.js');

function run(cmd) {
  return execSync(`node ${CLI} ${cmd}`, {
    cwd: PROJECT_ROOT,
    encoding: 'utf8',
    timeout: 30000,
  });
}

describe('Integration: curate + package flow', () => {
  it('programmatic curate creates correct lockfile', async () => {
    const lockPath = join(PROJECT_ROOT, 'mobmad.lock.yaml');
    if (existsSync(lockPath)) rmSync(lockPath);

    const { curate } = await import('../tools/curator.js');
    const result = await curate({ preset: 'lean', yes: true });

    assert.ok(result.skills.length >= 10, 'lean should have 10+ skills');
    assert.ok(result.skills.length <= 20, 'lean should have <=20 skills');
    assert.ok(result.agents.length >= 4, 'lean should have 4+ agents');
    assert.ok(result.hooks.length >= 3, 'lean should have 3+ hooks');

    assert.ok(existsSync(lockPath), 'lockfile should exist');
    const lockfile = parseYaml(readFileSync(lockPath, 'utf8'));
    assert.equal(lockfile.version, '0.1.0');
    assert.deepEqual(lockfile.skills.sort(), result.skills.sort());
  });

  it('package creates skill directories with manifests', async () => {
    // Ensure lockfile exists from previous test
    const { curate } = await import('../tools/curator.js');
    await curate({ preset: 'lean', yes: true });

    const { packageSkills } = await import('../tools/package-skills.js');
    packageSkills();

    const skillsDir = join(PROJECT_ROOT, 'src', 'module', 'skills');
    assert.ok(existsSync(skillsDir));

    const dirs = readdirSync(skillsDir);
    assert.ok(dirs.length >= 10, `expected 10+ skills, got ${dirs.length}`);

    for (const dir of dirs) {
      const skillDir = join(skillsDir, dir);
      assert.ok(existsSync(join(skillDir, 'SKILL.md')),
        `${dir} should have SKILL.md`);
      assert.ok(existsSync(join(skillDir, 'bmad-skill-manifest.yaml')),
        `${dir} should have bmad-skill-manifest.yaml`);

      const manifest = parseYaml(readFileSync(join(skillDir, 'bmad-skill-manifest.yaml'), 'utf8'));
      assert.equal(manifest.module, 'mob');
      assert.equal(manifest.type, 'skill');
      assert.equal(manifest.install_to_bmad, true);
      assert.ok(manifest.canonicalId.startsWith('mob-'));
    }
  });
});

describe('Integration: sync populates global/', () => {
  it('sync creates content in global/', async () => {
    const { syncUpstream } = await import('../tools/sync-upstream.js');
    const result = syncUpstream();
    assert.ok(result.synced > 0, 'should sync some items');

    const globalDir = join(PROJECT_ROOT, 'global');
    assert.ok(existsSync(join(globalDir, 'rules')), 'rules should exist');
    assert.ok(readdirSync(join(globalDir, 'rules')).length > 0, 'rules should have content');
  });
});

describe('Integration: CLI help and version', () => {
  it('--help shows all commands', () => {
    const output = run('--help');
    assert.ok(output.includes('install'));
    assert.ok(output.includes('curate'));
    assert.ok(output.includes('status'));
    assert.ok(output.includes('sync'));
    assert.ok(output.includes('package'));
    assert.ok(output.includes('uninstall'));
  });

  it('--version shows package version', () => {
    const output = run('--version');
    assert.ok(output.trim().match(/^\d+\.\d+\.\d+$/), `version should be semver: ${output.trim()}`);
  });

  it('status runs without error', () => {
    const output = run('status');
    assert.ok(output.includes('mobmad status'));
  });

  it('install --preset lean --yes --global-only runs without error', () => {
    const output = run('install --preset lean --yes --global-only');
    assert.ok(output.includes('mobmad install'));
  });
});
