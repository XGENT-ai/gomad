import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { join, dirname, basename } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');

// Walk source dirs and assert no file imports/references bmad-method.
// EXPLICITLY excluded: BMAD/ (vendored reference repo), node_modules/,
// .planning/ (documents the decoupling itself), package-lock.json
// Including any of these would cause permanent false positives.
function walkSourceDirs(dirs) {
  const files = [];
  for (const dir of dirs) {
    const dirPath = join(PROJECT_ROOT, dir);
    if (!existsSync(dirPath)) continue;
    const stack = [dirPath];
    while (stack.length) {
      const cur = stack.pop();
      const st = statSync(cur);
      if (st.isDirectory()) {
        for (const e of readdirSync(cur)) stack.push(join(cur, e));
      } else if (/\.(js|mjs|cjs|json|yaml|yml|md)$/.test(cur)) {
        files.push(cur);
      }
    }
  }
  return files;
}

describe('BMAD decoupling', () => {
  it('package.json has no peerDependencies and no bmad-method dependency', () => {
    const pkg = JSON.parse(readFileSync(join(PROJECT_ROOT, 'package.json'), 'utf8'));
    assert.equal(
      pkg.peerDependencies,
      undefined,
      'peerDependencies key must be deleted, not set to {}'
    );
    assert.equal(pkg.dependencies?.['bmad-method'], undefined);
    assert.equal(pkg.devDependencies?.['bmad-method'], undefined);
  });

  it('src/module/ does not exist', () => {
    assert.ok(
      !existsSync(join(PROJECT_ROOT, 'src', 'module')),
      'src/module/ must be deleted in Phase 3'
    );
  });

  it('no agent file in assets/agents/ contains BMAD frontmatter fields', () => {
    const agentsDir = join(PROJECT_ROOT, 'assets', 'agents');
    const files = readdirSync(agentsDir).filter((f) => f.endsWith('.md'));
    for (const file of files) {
      const content = readFileSync(join(agentsDir, file), 'utf8');
      assert.ok(!/^module:\s/m.test(content), `${file} has 'module:' frontmatter`);
      assert.ok(!/^canonicalId:\s/m.test(content), `${file} has 'canonicalId:' frontmatter`);
      assert.ok(!/^name:\s+(bmm|mob)-/m.test(content), `${file} still has bmm-/mob- prefix`);
    }
  });

  it('no source file imports or references bmad-method', () => {
    // Scope: source dirs only. BMAD/, node_modules/, .planning/, package-lock.json excluded.
    const files = walkSourceDirs(['bin', 'tools', 'src', 'test', 'assets', 'catalog']);
    const offenders = [];
    for (const f of files) {
      // Skip the decoupling test itself (it contains the literal string).
      if (basename(f) === 'test-decoupling.js') continue;
      const content = readFileSync(f, 'utf8');
      if (/bmad-method/.test(content)) {
        offenders.push(f.replace(PROJECT_ROOT + '/', ''));
      }
    }
    assert.deepEqual(
      offenders,
      [],
      `files referencing bmad-method: ${offenders.join(', ')}`
    );
  });
});
