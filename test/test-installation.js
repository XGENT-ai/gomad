import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');
const CLI = join(PROJECT_ROOT, 'bin', 'gomad-cli.js');

function run(cmd) {
  return execSync(`node ${CLI} ${cmd}`, {
    cwd: PROJECT_ROOT,
    encoding: 'utf8',
    timeout: 30000,
  });
}

describe('Integration: CLI help and version', () => {
  it('--help shows all commands', () => {
    const output = run('--help');
    assert.ok(output.includes('install'));
    assert.ok(output.includes('curate'));
    assert.ok(output.includes('status'));
    assert.ok(output.includes('uninstall'));
    assert.ok(output.includes('mcp'));
    // Removed commands must not appear as standalone command words
    assert.ok(!/\bsync\b/.test(output), 'help should not list sync command');
    assert.ok(!/^\s*update\b/m.test(output), 'help should not list update command');
    assert.ok(!/^\s*package\b/m.test(output), 'help should not list package command (BMAD decoupling)');
  });

  it('--version shows package version', () => {
    const output = run('--version');
    assert.ok(output.trim().match(/^\d+\.\d+\.\d+$/), `version should be semver: ${output.trim()}`);
  });

  it('status runs without error', () => {
    const output = run('status');
    assert.ok(output.includes('gomad status'));
  });

  it('install --preset lean --yes runs without error', () => {
    const output = run('install --preset lean --yes');
    assert.ok(output.includes('gomad install'));
  });
});

describe('Project-local installation', () => {
  it('installer.js does not reference homedir', () => {
    const src = readFileSync(join(PROJECT_ROOT, 'tools', 'installer.js'), 'utf8');
    assert.ok(!src.includes('homedir'), 'installer.js must not import or use homedir');
    assert.ok(!src.includes('$HOME'), 'installer.js must not reference $HOME');
    assert.ok(!src.includes('~/.claude'), 'installer.js must not reference ~/.claude/');
  });

  it('installer uses process.cwd for CLAUDE_DIR', () => {
    const src = readFileSync(join(PROJECT_ROOT, 'tools', 'installer.js'), 'utf8');
    assert.ok(
      src.includes("join(process.cwd(), '.claude')"),
      'CLAUDE_DIR must use process.cwd()'
    );
  });

  it('curator writes lockfile to process.cwd', () => {
    const src = readFileSync(join(PROJECT_ROOT, 'tools', 'curator.js'), 'utf8');
    assert.ok(
      src.includes("join(process.cwd(), 'gomad.lock.yaml')"),
      'lockfile path must use process.cwd()'
    );
  });
});
