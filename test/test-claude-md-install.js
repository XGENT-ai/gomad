/**
 * test/test-claude-md-install.js
 *
 * v1.3.1 — smoke-test the gomad CLAUDE.md installer (create / replace / append)
 * via `claude-md-installer.js` directly. Three primary cases plus an idempotency
 * check; mirrors the style of test/test-statusline-install.js.
 *
 * Cases:
 *   A. Fresh install: no pre-existing CLAUDE.md → file is created with the
 *      template (single fenced block, no extra content).
 *   B. Existing CLAUDE.md WITH gomad fence: the fenced block is replaced
 *      in-place, content before and after the fence is preserved.
 *   C. Existing CLAUDE.md WITHOUT gomad fence: block is appended to the end;
 *      original content stays at the top.
 *   D. Idempotency: running case A twice in a row leaves the file byte-identical
 *      after the second run.
 *
 * Style-matched to test/test-statusline-install.js: plain Node, `assert` from
 * node:assert/strict, top-level async IIFE, exit 1 on any assertion failure.
 *
 * Usage: node test/test-claude-md-install.js
 */

const assert = require('node:assert/strict');
const path = require('node:path');
const os = require('node:os');
const fs = require('fs-extra');

const { installClaudeMdGuidelines, FENCE_START, FENCE_END } = require('../tools/installer/core/claude-md-installer');

const projectRoot = path.resolve(__dirname, '..');

const colors = {
  reset: '[0m',
  green: '[32m',
  red: '[31m',
  dim: '[2m',
};

let passed = 0;
let failed = 0;

function check(name, fn) {
  try {
    fn();
    console.log(`${colors.green}✓${colors.reset} ${name}`);
    passed++;
  } catch (error) {
    console.log(`${colors.red}✗${colors.reset} ${name}`);
    console.log(`  ${colors.dim}${error.message}${colors.reset}`);
    failed++;
  }
}

async function makeTmpDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'gomad-claude-md-'));
}

(async () => {
  // Sanity: template file ships with the gomad source repo.
  const templatePath = path.join(projectRoot, 'tools/installer/assets/CLAUDE.md.template');
  assert.ok(await fs.pathExists(templatePath), 'template asset must exist');
  const templateContent = (await fs.readFile(templatePath, 'utf8')).replace(/\s+$/, '');
  assert.ok(templateContent.startsWith(FENCE_START), 'template starts with FENCE_START');
  assert.ok(templateContent.endsWith(FENCE_END), 'template ends with FENCE_END');

  // ── Case A: fresh install ────────────────────────────────────────────────
  {
    const dir = await makeTmpDir();
    try {
      const action = await installClaudeMdGuidelines(dir, { gomadSrcRoot: projectRoot, silent: true });
      const file = path.join(dir, 'CLAUDE.md');
      const content = await fs.readFile(file, 'utf8');

      check('A. fresh install returns "created"', () => assert.equal(action, 'created'));
      check('A. CLAUDE.md exists after fresh install', () => assert.ok(fs.existsSync(file)));
      check('A. content begins with gomad fence start', () => assert.ok(content.startsWith(FENCE_START)));
      check('A. content ends with gomad fence end + newline', () => assert.ok(content.endsWith(FENCE_END + '\n')));
      check('A. exactly one occurrence of FENCE_START', () => assert.equal(content.split(FENCE_START).length - 1, 1));
      check('A. exactly one occurrence of FENCE_END', () => assert.equal(content.split(FENCE_END).length - 1, 1));
    } finally {
      await fs.remove(dir);
    }
  }

  // ── Case B: existing file WITH fence — block is replaced in place ────────
  {
    const dir = await makeTmpDir();
    try {
      const file = path.join(dir, 'CLAUDE.md');
      const userPreamble = '# My Project Custom CLAUDE.md\n\nProject-specific notes line 1.\nProject-specific notes line 2.\n\n';
      const oldBlock = `${FENCE_START}\n# OLD GOMAD BLOCK\n\nThis was the old behavioral guideline content.\n${FENCE_END}`;
      const userTrailer = '\n\n## My Custom Section\n\nKeep this trailing content as-is.\n';
      await fs.writeFile(file, userPreamble + oldBlock + userTrailer, 'utf8');

      const action = await installClaudeMdGuidelines(dir, { gomadSrcRoot: projectRoot, silent: true });
      const content = await fs.readFile(file, 'utf8');

      check('B. existing-with-fence returns "replaced"', () => assert.equal(action, 'replaced'));
      check('B. user preamble preserved', () => assert.ok(content.startsWith(userPreamble)));
      check('B. user trailer preserved', () => assert.ok(content.endsWith(userTrailer)));
      check('B. old gomad block removed', () => assert.ok(!content.includes('OLD GOMAD BLOCK')));
      check('B. new gomad block (template) inserted', () =>
        assert.ok(content.includes('Behavioral guidelines to reduce common LLM coding mistakes')),
      );
      check('B. exactly one FENCE_START after replace', () => assert.equal(content.split(FENCE_START).length - 1, 1));
      check('B. exactly one FENCE_END after replace', () => assert.equal(content.split(FENCE_END).length - 1, 1));
    } finally {
      await fs.remove(dir);
    }
  }

  // ── Case C: existing file WITHOUT fence — block is appended ──────────────
  {
    const dir = await makeTmpDir();
    try {
      const file = path.join(dir, 'CLAUDE.md');
      const userContent = '# Existing CLAUDE.md\n\nUser-authored notes with no gomad fence.\n';
      await fs.writeFile(file, userContent, 'utf8');

      const action = await installClaudeMdGuidelines(dir, { gomadSrcRoot: projectRoot, silent: true });
      const content = await fs.readFile(file, 'utf8');

      check('C. existing-no-fence returns "appended"', () => assert.equal(action, 'appended'));
      check('C. original user content preserved at top', () => assert.ok(content.startsWith(userContent)));
      check('C. fence appended after original content', () => assert.ok(content.includes(FENCE_START)));
      check('C. file ends with gomad fence end + newline', () => assert.ok(content.endsWith(FENCE_END + '\n')));
      check('C. user content not duplicated', () => assert.equal(content.split(userContent).length - 1, 1));
    } finally {
      await fs.remove(dir);
    }
  }

  // ── Case D: idempotency ──────────────────────────────────────────────────
  {
    const dir = await makeTmpDir();
    try {
      const action1 = await installClaudeMdGuidelines(dir, { gomadSrcRoot: projectRoot, silent: true });
      const file = path.join(dir, 'CLAUDE.md');
      const after1 = await fs.readFile(file, 'utf8');

      const action2 = await installClaudeMdGuidelines(dir, { gomadSrcRoot: projectRoot, silent: true });
      const after2 = await fs.readFile(file, 'utf8');

      check('D. first run returns "created"', () => assert.equal(action1, 'created'));
      check('D. second run is a no-op (replace produces same content)', () => assert.ok(action2 === 'replaced' || action2 === 'skipped'));
      check('D. file content byte-identical after re-run', () => assert.equal(after1, after2));
    } finally {
      await fs.remove(dir);
    }
  }

  // ── Summary ──────────────────────────────────────────────────────────────
  console.log('');
  console.log(`${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
})().catch((error) => {
  console.error('Test runner crashed:', error);
  process.exit(1);
});
