import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { parse as parseYaml } from 'yaml';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');

describe('BMAD module definition', () => {
  const moduleYamlPath = join(PROJECT_ROOT, 'src', 'module', 'module.yaml');

  it('module.yaml exists', () => {
    assert.ok(existsSync(moduleYamlPath));
  });

  it('module.yaml has required fields', () => {
    const mod = parseYaml(readFileSync(moduleYamlPath, 'utf8'));
    assert.equal(mod.code, 'mob');
    assert.equal(mod.name, 'My Own BMAD');
    assert.ok(mod.description);
    assert.ok(mod.skill_preset, 'should have skill_preset config');
    assert.ok(mod.install_global_assets, 'should have install_global_assets config');
  });

  it('module.yaml skill_preset has all preset options', () => {
    const mod = parseYaml(readFileSync(moduleYamlPath, 'utf8'));
    const presetValues = mod.skill_preset['single-select'].map((o) => o.value);
    const expected = ['full', 'full-stack', 'python-only', 'enterprise', 'lean', 'bmad-enhanced'];
    for (const preset of expected) {
      assert.ok(presetValues.includes(preset), `preset ${preset} missing from module.yaml`);
    }
  });
});

describe('module-help.csv', () => {
  const csvPath = join(PROJECT_ROOT, 'src', 'module', 'module-help.csv');

  it('module-help.csv exists', () => {
    assert.ok(existsSync(csvPath));
  });

  it('has correct CSV header', () => {
    const content = readFileSync(csvPath, 'utf8');
    const header = content.split('\n')[0];
    assert.ok(header.startsWith('module,skill,display-name,menu-code,description'));
  });

  it('all rows belong to My Own BMAD module', () => {
    const content = readFileSync(csvPath, 'utf8');
    const lines = content.trim().split('\n').slice(1); // skip header
    for (const line of lines) {
      assert.ok(line.startsWith('My Own BMAD,'), `row should start with module name: ${line.slice(0, 40)}`);
    }
  });

  it('has at least 20 skill entries', () => {
    const content = readFileSync(csvPath, 'utf8');
    const lines = content.trim().split('\n').slice(1);
    assert.ok(lines.length >= 20, `expected 20+ entries, got ${lines.length}`);
  });

  it('menu-codes are unique', () => {
    const content = readFileSync(csvPath, 'utf8');
    const lines = content.trim().split('\n').slice(1);
    const codes = lines.map((l) => l.split(',')[3]);
    const unique = new Set(codes);
    assert.equal(codes.length, unique.size, `duplicate menu codes: ${codes.filter((c, i) => codes.indexOf(c) !== i)}`);
  });
});

describe('Package structure', () => {
  it('package.json exists with correct name', () => {
    const pkg = JSON.parse(readFileSync(join(PROJECT_ROOT, 'package.json'), 'utf8'));
    assert.equal(pkg.name, 'mobmad');
    assert.ok(pkg.bin.mobmad, 'should have bin entry');
    assert.ok(pkg.peerDependencies['bmad-method'], 'should peer-depend on bmad-method');
  });

  it('CLI entry point exists', () => {
    assert.ok(existsSync(join(PROJECT_ROOT, 'bin', 'mobmad-cli.js')));
  });

  it('all tool files exist', () => {
    const tools = ['curator.js', 'global-installer.js', 'sync-upstream.js', 'package-skills.js'];
    for (const tool of tools) {
      assert.ok(existsSync(join(PROJECT_ROOT, 'tools', tool)), `tools/${tool} should exist`);
    }
  });

  it('BMAD agents are packaged', () => {
    const agentsDir = join(PROJECT_ROOT, 'src', 'module', 'agents');
    const subdirs = ['bmad-analysis', 'bmad-planning', 'bmad-research', 'bmad-review'];
    for (const sub of subdirs) {
      assert.ok(existsSync(join(agentsDir, sub)), `agents/${sub} should exist`);
    }
    assert.ok(existsSync(join(agentsDir, 'bmad-skill-manifest.yaml')), 'agent manifest should exist');
  });
});
