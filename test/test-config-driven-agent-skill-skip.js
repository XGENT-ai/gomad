/**
 * test/test-config-driven-agent-skill-skip.js
 *
 * Quick task 260510-i7r — bug1: Claude Code installs erroneously create
 * `.claude/skills/gm:agent-*` directories that duplicate the launcher commands
 * at `.claude/commands/gm/agent-*.md`.
 *
 * Cases:
 *   1. Fresh install path — `installVerbatimSkills` with `launcher_target_dir`
 *      set MUST skip rows whose canonicalId starts with `gm:agent-`.
 *   2. No-launcher path (Codex/Junie/etc.) — same CSV but
 *      `launcher_target_dir` undefined: ALL rows install (no regression).
 *   3. Colon-form sweep — `removeLegacyAgentSkillDirs(workspaceRoot)` removes
 *      both `gm-agent-*` (D-29 dash form) AND `gm:agent-*` (bug1 leftovers);
 *      unrelated `gm-other/` directories are untouched.
 *
 * Style-matched to test/test-statusline-install.js: plain Node,
 * `assert` from node:assert/strict, top-level async IIFE, exit 1 on fail.
 *
 * Usage: node test/test-config-driven-agent-skill-skip.js
 */

'use strict';

const assert = require('node:assert/strict');
const path = require('node:path');
const os = require('node:os');
const fs = require('fs-extra');

const projectRoot = path.resolve(__dirname, '..');

// Stub `getProjectRoot()` BEFORE loading `_config-driven.js` so the
// SKILL.md sources (and AGENT_SOURCES paths) resolve against the live
// repo root, not whatever cwd the test was invoked from.
const projectRootModule = require('../tools/installer/project-root');
projectRootModule.getProjectRoot = () => projectRoot;

const { ConfigDrivenIdeSetup } = require('../tools/installer/ide/_config-driven');
const { AgentCommandGenerator } = require('../tools/installer/ide/shared/agent-command-generator');

// Patch prompts logging so test output stays clean.
const prompts = require('../tools/installer/prompts');
prompts.log.info = async () => {};
prompts.log.warn = async () => {};
prompts.log.error = async () => {};
prompts.log.success = async () => {};
prompts.log.message = async () => {};

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
    console.log(`${colors.green}✓${colors.reset} ${name}`);
    passed++;
  } catch (error) {
    console.log(`${colors.red}✗${colors.reset} ${name}`);
    console.log(`  ${colors.dim}${error.message}${colors.reset}`);
    failed++;
  }
}

// Hand-rolled CSV writer — csv-stringify is NOT a project dep
// (mirrors the helper in test/test-legacy-v12-upgrade.js).
function escapeCsv(value) {
  return `"${String(value ?? '').replaceAll('"', '""')}"`;
}

function writeCsv(rows, columns) {
  const lines = [columns.join(',')];
  for (const r of rows) {
    lines.push(columns.map((c) => escapeCsv(r[c] ?? '')).join(','));
  }
  return lines.join('\n') + '\n';
}

/**
 * Build a minimal _gomad layout containing the `_config/skill-manifest.csv`
 * `installVerbatimSkills` reads, plus pre-existing source directories for
 * the rows so `fs.copy` finds something to copy. Returns the gomadDir path.
 *
 * Two rows: a `gm:agent-pm` (persona — must be skipped on Claude Code)
 * and a `gm-distillator` (non-agent core skill — must always install).
 */
async function makeFixture(workspaceRoot) {
  const gomadDir = path.join(workspaceRoot, '_gomad');
  const configDir = path.join(gomadDir, '_config');
  await fs.ensureDir(configDir);

  // Source dirs that the manifest paths reference. Each contains a stub
  // SKILL.md so fs.copy has something to copy and the skillDir gets created.
  const agentPmSrc = path.join(gomadDir, 'agile', 'agents', 'pm');
  await fs.ensureDir(agentPmSrc);
  await fs.writeFile(path.join(agentPmSrc, 'SKILL.md'), '---\nname: pm\n---\nbody');

  const distillatorSrc = path.join(gomadDir, 'core', 'gm-distillator');
  await fs.ensureDir(distillatorSrc);
  await fs.writeFile(path.join(distillatorSrc, 'SKILL.md'), '---\nname: gm-distillator\n---\nbody');

  // skill-manifest.csv — only the columns installVerbatimSkills reads.
  const csvContent = writeCsv(
    [
      {
        canonicalId: 'gm:agent-pm',
        path: '_gomad/agile/agents/pm/SKILL.md',
        install_to_gomad: 'true',
      },
      {
        canonicalId: 'gm-distillator',
        path: '_gomad/core/gm-distillator/SKILL.md',
        install_to_gomad: 'true',
      },
    ],
    ['canonicalId', 'path', 'install_to_gomad'],
  );
  await fs.writeFile(path.join(configDir, 'skill-manifest.csv'), csvContent);

  return gomadDir;
}

(async () => {
  console.log(`${colors.cyan}========================================`);
  console.log('bug1 — agent-skill skip on Claude Code (260510-i7r)');
  console.log(`========================================${colors.reset}\n`);

  // -------------------------------------------------------------------------
  // Test 1 — fresh-install path: launcher_target_dir set ⇒ skip gm:agent-*
  // -------------------------------------------------------------------------
  console.log(`${colors.yellow}Test 1: launcher_target_dir set ⇒ gm:agent-* rows skipped${colors.reset}`);
  let case1Tmp;
  try {
    case1Tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gomad-bug1-T1-'));
    const gomadDir = await makeFixture(case1Tmp);
    const targetPath = path.join(case1Tmp, '.claude', 'skills');
    await fs.ensureDir(targetPath);

    const setup = new ConfigDrivenIdeSetup('claude-code', {
      installer: { target_dir: '.claude/skills', launcher_target_dir: '.claude/commands/gm' },
    });
    setup.skillWriteTracker = new Set();

    const config = { launcher_target_dir: '.claude/commands/gm' };
    const count = await setup.installVerbatimSkills(case1Tmp, gomadDir, targetPath, config);

    check('T1.1 only 1 skill installed (gm-distillator; gm:agent-pm skipped)', () => assert.equal(count, 1));
    check('T1.2 .claude/skills/gm:agent-pm/ does NOT exist', () => {
      assert.equal(fs.pathExistsSync(path.join(targetPath, 'gm:agent-pm')), false);
    });
    check('T1.3 .claude/skills/gm-distillator/ DOES exist', () => {
      assert.equal(fs.pathExistsSync(path.join(targetPath, 'gm-distillator')), true);
    });
    check('T1.4 skillWriteTracker did not pick up gm:agent-pm', () => {
      assert.equal(setup.skillWriteTracker.has('gm:agent-pm'), false);
    });
    check('T1.5 skillWriteTracker did pick up gm-distillator', () => {
      assert.equal(setup.skillWriteTracker.has('gm-distillator'), true);
    });
  } catch (error) {
    check('T1.0 case ran without throwing', () => {
      throw error;
    });
  } finally {
    if (case1Tmp) await fs.remove(case1Tmp).catch(() => {});
  }
  console.log('');

  // -------------------------------------------------------------------------
  // Test 2 — no-launcher path: Codex/Junie/etc. STILL install gm:agent-*
  // -------------------------------------------------------------------------
  console.log(`${colors.yellow}Test 2: no launcher_target_dir ⇒ gm:agent-* rows install (no regression)${colors.reset}`);
  let case2Tmp;
  try {
    case2Tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gomad-bug1-T2-'));
    const gomadDir = await makeFixture(case2Tmp);
    const targetPath = path.join(case2Tmp, '.agents', 'skills');
    await fs.ensureDir(targetPath);

    const setup = new ConfigDrivenIdeSetup('codex', {
      installer: { target_dir: '.agents/skills' }, // NO launcher_target_dir
    });
    setup.skillWriteTracker = new Set();

    const config = {}; // no launcher_target_dir
    const count = await setup.installVerbatimSkills(case2Tmp, gomadDir, targetPath, config);

    check('T2.1 both skills installed (count=2)', () => assert.equal(count, 2));
    check('T2.2 .agents/skills/gm:agent-pm/ DOES exist (Codex regression check)', () => {
      assert.equal(fs.pathExistsSync(path.join(targetPath, 'gm:agent-pm')), true);
    });
    check('T2.3 .agents/skills/gm-distillator/ DOES exist', () => {
      assert.equal(fs.pathExistsSync(path.join(targetPath, 'gm-distillator')), true);
    });
  } catch (error) {
    check('T2.0 case ran without throwing', () => {
      throw error;
    });
  } finally {
    if (case2Tmp) await fs.remove(case2Tmp).catch(() => {});
  }
  console.log('');

  // -------------------------------------------------------------------------
  // Test 3 — removeLegacyAgentSkillDirs sweeps both dash AND colon forms
  // -------------------------------------------------------------------------
  console.log(`${colors.yellow}Test 3: removeLegacyAgentSkillDirs sweeps gm-agent-* + gm:agent-*${colors.reset}`);
  let case3Tmp;
  try {
    case3Tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gomad-bug1-T3-'));
    const skillsBase = path.join(case3Tmp, '.claude', 'skills');
    // Pre-seed: one colon-form leftover (bug1 regression), one dash-form
    // leftover (D-29 v1.1 legacy), and one unrelated gm-other dir that
    // must NOT be touched.
    await fs.ensureDir(path.join(skillsBase, 'gm:agent-pm'));
    await fs.writeFile(path.join(skillsBase, 'gm:agent-pm', 'SKILL.md'), 'colon-leftover');
    await fs.ensureDir(path.join(skillsBase, 'gm-agent-dev'));
    await fs.writeFile(path.join(skillsBase, 'gm-agent-dev', 'SKILL.md'), 'dash-leftover');
    await fs.ensureDir(path.join(skillsBase, 'gm-other'));
    await fs.writeFile(path.join(skillsBase, 'gm-other', 'SKILL.md'), 'unrelated');

    const gen = new AgentCommandGenerator();
    const removed = await gen.removeLegacyAgentSkillDirs(case3Tmp);

    check('T3.1 removed array includes gm:agent-pm path', () => {
      assert.equal(
        removed.some((p) => p.endsWith(`${path.sep}gm:agent-pm`)),
        true,
        `removed=${JSON.stringify(removed)}`,
      );
    });
    check('T3.2 removed array includes gm-agent-dev path', () => {
      assert.equal(
        removed.some((p) => p.endsWith(`${path.sep}gm-agent-dev`)),
        true,
        `removed=${JSON.stringify(removed)}`,
      );
    });
    check('T3.3 .claude/skills/gm:agent-pm/ no longer exists on disk', () => {
      assert.equal(fs.pathExistsSync(path.join(skillsBase, 'gm:agent-pm')), false);
    });
    check('T3.4 .claude/skills/gm-agent-dev/ no longer exists on disk', () => {
      assert.equal(fs.pathExistsSync(path.join(skillsBase, 'gm-agent-dev')), false);
    });
    check('T3.5 unrelated .claude/skills/gm-other/ is untouched', () => {
      assert.equal(fs.pathExistsSync(path.join(skillsBase, 'gm-other')), true);
    });
  } catch (error) {
    check('T3.0 case ran without throwing', () => {
      throw error;
    });
  } finally {
    if (case3Tmp) await fs.remove(case3Tmp).catch(() => {});
  }
  console.log('');

  // -------------------------------------------------------------------------
  console.log(`${colors.cyan}========================================${colors.reset}`);
  console.log(
    `Total: ${passed + failed}, Passed: ${colors.green}${passed}${colors.reset}, Failed: ${failed > 0 ? colors.red : colors.green}${failed}${colors.reset}`,
  );
  console.log(`${colors.cyan}========================================${colors.reset}\n`);

  if (failed > 0) process.exit(1);
})().catch((error) => {
  console.error(`${colors.red}Fatal:${colors.reset}`, error);
  process.exit(1);
});
