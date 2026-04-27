/**
 * test/test-statusline-install.js
 *
 * Quick task 260427-k86 — smoke-test the gomad Claude Code statusline
 * install / uninstall round-trip via `ConfigDrivenIdeSetup` directly
 * (no full `gomad install` invocation needed — the install path is
 * already covered by other tests; here we only exercise the new
 * statusline + settings.json merge logic).
 *
 * Cases:
 *   A. Fresh install: no pre-existing settings.json → file is created
 *      with the gomad statusLine entry; hook lands on disk + executable.
 *   B. Pre-existing settings.json with unrelated keys: merge preserves
 *      `env` + `hooks` and adds `statusLine`.
 *   C. Pre-existing third-party `statusLine`: settings stay untouched
 *      but the hook file is still copied (we don't refuse the whole
 *      install, only the settings rewrite).
 *   D. Uninstall (case A): hook removed, statusLine stripped.
 *   E. Uninstall (case B): hook removed, statusLine stripped, env + hooks
 *      survive.
 *
 * Style-matched to test/test-installation-components.js: plain Node,
 * `assert` from node:assert/strict, top-level async IIFE, exit 1 on
 * any assertion failure.
 *
 * Usage: node test/test-statusline-install.js
 */

const assert = require('node:assert/strict');
const path = require('node:path');
const os = require('node:os');
const fs = require('fs-extra');

const projectRoot = path.resolve(__dirname, '..');

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

// Stub `getProjectRoot()` BEFORE loading `_config-driven.js` so the
// statusline source resolves against the live repo root rather than
// whatever cwd the test was invoked from. Done via require-cache surgery.
const projectRootModule = require('../tools/installer/project-root');
projectRootModule.getProjectRoot = () => projectRoot;

const { ConfigDrivenIdeSetup } = require('../tools/installer/ide/_config-driven');

function makeClaudeCodeConfig() {
  return {
    name: 'Claude Code',
    preferred: true,
    installer: {
      target_dir: '.claude/skills',
      hooks_target_dir: '.claude/hooks',
      statusline: {
        source: 'tools/installer/assets/hooks/gomad-statusline.js',
        dest_name: 'gomad-statusline.js',
        settings_file: '.claude/settings.json',
      },
    },
  };
}

async function makeTmpDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'gomad-statusline-'));
}

(async () => {
  console.log(`${colors.cyan}========================================`);
  console.log('Statusline Install Round-Trip Tests (260427-k86)');
  console.log(`========================================${colors.reset}\n`);

  // -------------------------------------------------------------------------
  // Case A — fresh install, no pre-existing settings.json
  // -------------------------------------------------------------------------
  console.log(`${colors.yellow}Case A: fresh install, no settings.json${colors.reset}`);
  let caseATmp;
  try {
    caseATmp = await makeTmpDir();
    const cfg = makeClaudeCodeConfig();
    const setup = new ConfigDrivenIdeSetup('claude-code', cfg);

    const tracked = [];
    const installed = await setup.installStatusline(caseATmp, cfg.installer, {
      silent: true,
      trackInstalledFile: (p) => tracked.push(p),
    });

    const hookPath = path.join(caseATmp, '.claude/hooks/gomad-statusline.js');
    const settingsPath = path.join(caseATmp, '.claude/settings.json');

    check('A1 install returns true', () => assert.equal(installed, true));
    check('A2 hook file exists', () => assert.equal(fs.pathExistsSync(hookPath), true));

    // Check exec bit (skip on Windows where chmod is largely a no-op).
    if (process.platform !== 'win32') {
      check('A3 hook file is executable', () => {
        const mode = fs.statSync(hookPath).mode;
        assert.equal((mode & 0o100) !== 0, true, `mode was ${mode.toString(8)}`);
      });
    }

    check('A4 settings.json exists', () => assert.equal(fs.pathExistsSync(settingsPath), true));

    const settings = await fs.readJson(settingsPath);
    check('A5 settings.statusLine.type === "command"', () => assert.equal(settings.statusLine?.type, 'command'));
    check('A6 settings.statusLine.padding === 0', () => assert.equal(settings.statusLine?.padding, 0));
    check('A7 settings.statusLine.command references hook', () => {
      assert.match(settings.statusLine?.command || '', /gomad-statusline\.js/);
      assert.match(settings.statusLine?.command || '', /\$CLAUDE_PROJECT_DIR/);
    });

    check('A8 install tracked the hook file', () => {
      assert.equal(
        tracked.some((p) => p.endsWith('gomad-statusline.js')),
        true,
      );
    });
    check('A9 install tracked the settings file', () => {
      assert.equal(
        tracked.some((p) => p.endsWith('settings.json')),
        true,
      );
    });
  } catch (error) {
    check('A0 case A ran without throwing', () => {
      throw error;
    });
  }
  console.log('');

  // -------------------------------------------------------------------------
  // Case B — settings.json with unrelated keys gets merged non-destructively
  // -------------------------------------------------------------------------
  console.log(`${colors.yellow}Case B: pre-existing settings.json with unrelated keys${colors.reset}`);
  let caseBTmp;
  try {
    caseBTmp = await makeTmpDir();
    const cfg = makeClaudeCodeConfig();
    const setup = new ConfigDrivenIdeSetup('claude-code', cfg);

    const settingsPath = path.join(caseBTmp, '.claude/settings.json');
    await fs.ensureDir(path.dirname(settingsPath));
    await fs.writeJson(
      settingsPath,
      {
        env: { FOO: 'bar' },
        hooks: {
          SessionStart: [{ hooks: [{ type: 'command', command: 'echo hi' }] }],
        },
      },
      { spaces: 2 },
    );

    const installed = await setup.installStatusline(caseBTmp, cfg.installer, { silent: true });
    const settings = await fs.readJson(settingsPath);

    check('B1 install returns true', () => assert.equal(installed, true));
    check('B2 env.FOO survived merge', () => assert.equal(settings.env?.FOO, 'bar'));
    check('B3 hooks block survived merge', () => {
      assert.equal(settings.hooks?.SessionStart?.[0]?.hooks?.[0]?.command, 'echo hi');
    });
    check('B4 statusLine added', () => {
      assert.equal(settings.statusLine?.type, 'command');
      assert.match(settings.statusLine?.command || '', /gomad-statusline\.js/);
    });
  } catch (error) {
    check('B0 case B ran without throwing', () => {
      throw error;
    });
  }
  console.log('');

  // -------------------------------------------------------------------------
  // Case C — pre-existing third-party statusLine, silent install: leave it
  // -------------------------------------------------------------------------
  console.log(`${colors.yellow}Case C: pre-existing third-party statusLine (silent)${colors.reset}`);
  let caseCTmp;
  try {
    caseCTmp = await makeTmpDir();
    const cfg = makeClaudeCodeConfig();
    const setup = new ConfigDrivenIdeSetup('claude-code', cfg);

    const settingsPath = path.join(caseCTmp, '.claude/settings.json');
    await fs.ensureDir(path.dirname(settingsPath));
    await fs.writeJson(
      settingsPath,
      {
        statusLine: { type: 'command', command: 'cat /tmp/foo' },
      },
      { spaces: 2 },
    );

    const installed = await setup.installStatusline(caseCTmp, cfg.installer, { silent: true });

    const hookPath = path.join(caseCTmp, '.claude/hooks/gomad-statusline.js');
    const settings = await fs.readJson(settingsPath);

    check('C1 install returns true (we still copy the hook)', () => assert.equal(installed, true));
    check('C2 hook file is still copied', () => assert.equal(fs.pathExistsSync(hookPath), true));
    check('C3 third-party statusLine.command is untouched (silent skips prompt)', () => {
      assert.equal(settings.statusLine?.command, 'cat /tmp/foo');
    });
  } catch (error) {
    check('C0 case C ran without throwing', () => {
      throw error;
    });
  }
  console.log('');

  // -------------------------------------------------------------------------
  // Case C2 — third-party statusLine, user accepts override
  // -------------------------------------------------------------------------
  console.log(`${colors.yellow}Case C2: override accepted via overrideExistingStatusline=true${colors.reset}`);
  let caseC2Tmp;
  try {
    caseC2Tmp = await makeTmpDir();
    const cfg = makeClaudeCodeConfig();
    const setup = new ConfigDrivenIdeSetup('claude-code', cfg);

    const settingsPath = path.join(caseC2Tmp, '.claude/settings.json');
    await fs.ensureDir(path.dirname(settingsPath));
    await fs.writeJson(
      settingsPath,
      {
        env: { KEEP: 'me' },
        statusLine: { type: 'command', command: 'node ~/.claude/hooks/gsd-statusline.js' },
      },
      { spaces: 2 },
    );

    await setup.installStatusline(caseC2Tmp, cfg.installer, {
      silent: true,
      overrideExistingStatusline: true,
    });

    const settings = await fs.readJson(settingsPath);

    check('C2.1 statusLine.command now references gomad-statusline.js', () => {
      assert.match(settings.statusLine?.command || '', /gomad-statusline\.js/);
    });
    check('C2.2 unrelated keys (env.KEEP) survive the override', () => {
      assert.equal(settings.env?.KEEP, 'me');
    });
  } catch (error) {
    check('C2.0 case C2 ran without throwing', () => {
      throw error;
    });
  }
  console.log('');

  // -------------------------------------------------------------------------
  // Case C3 — third-party statusLine, user declines override
  // -------------------------------------------------------------------------
  console.log(`${colors.yellow}Case C3: override declined via overrideExistingStatusline=false${colors.reset}`);
  let caseC3Tmp;
  try {
    caseC3Tmp = await makeTmpDir();
    const cfg = makeClaudeCodeConfig();
    const setup = new ConfigDrivenIdeSetup('claude-code', cfg);

    const settingsPath = path.join(caseC3Tmp, '.claude/settings.json');
    await fs.ensureDir(path.dirname(settingsPath));
    const original = { statusLine: { type: 'command', command: 'node /opt/ccusage/cli.js' } };
    await fs.writeJson(settingsPath, original, { spaces: 2 });

    await setup.installStatusline(caseC3Tmp, cfg.installer, {
      silent: true,
      overrideExistingStatusline: false,
    });

    const hookPath = path.join(caseC3Tmp, '.claude/hooks/gomad-statusline.js');
    const settings = await fs.readJson(settingsPath);

    check('C3.1 hook file IS copied even when override declined', () => assert.equal(fs.pathExistsSync(hookPath), true));
    check('C3.2 third-party statusLine.command unchanged', () => {
      assert.equal(settings.statusLine?.command, 'node /opt/ccusage/cli.js');
    });
  } catch (error) {
    check('C3.0 case C3 ran without throwing', () => {
      throw error;
    });
  }
  console.log('');

  // -------------------------------------------------------------------------
  // Case D — uninstall round-trip from case A's resulting state
  // -------------------------------------------------------------------------
  console.log(`${colors.yellow}Case D: uninstall removes hook + statusLine${colors.reset}`);
  if (caseATmp) {
    try {
      const cfg = makeClaudeCodeConfig();
      const setup = new ConfigDrivenIdeSetup('claude-code', cfg);
      // installerConfig is read by cleanupStatusline — assign manually because
      // we constructed via ConfigDrivenIdeSetup with the platformConfig wrapper.
      // (The constructor already does this from platformConfig.installer; assert.)
      assert.equal(setup.installerConfig?.statusline?.dest_name, 'gomad-statusline.js');

      await setup.cleanupStatusline(caseATmp, { silent: true });

      const hookPath = path.join(caseATmp, '.claude/hooks/gomad-statusline.js');
      const settingsPath = path.join(caseATmp, '.claude/settings.json');

      check('D1 hook file removed', () => assert.equal(fs.pathExistsSync(hookPath), false));

      // settings.json is allowed to remain as `{}` (we don't delete the file
      // because the user might add other keys later).
      check('D2 settings.json contains no statusLine', async () => {
        if (fs.pathExistsSync(settingsPath)) {
          const s = await fs.readJson(settingsPath);
          assert.equal(s.statusLine, undefined);
        }
        // else: missing is also fine.
      });
    } catch (error) {
      check('D0 case D ran without throwing', () => {
        throw error;
      });
    }
    await fs.remove(caseATmp);
  }
  console.log('');

  // -------------------------------------------------------------------------
  // Case E — uninstall preserves unrelated settings.json keys (case B)
  // -------------------------------------------------------------------------
  console.log(`${colors.yellow}Case E: uninstall preserves unrelated keys${colors.reset}`);
  if (caseBTmp) {
    try {
      const cfg = makeClaudeCodeConfig();
      const setup = new ConfigDrivenIdeSetup('claude-code', cfg);
      await setup.cleanupStatusline(caseBTmp, { silent: true });

      const settingsPath = path.join(caseBTmp, '.claude/settings.json');
      check('E1 settings.json still exists', () => assert.equal(fs.pathExistsSync(settingsPath), true));
      const s = await fs.readJson(settingsPath);
      check('E2 env.FOO still present', () => assert.equal(s.env?.FOO, 'bar'));
      check('E3 hooks block still present', () => {
        assert.equal(s.hooks?.SessionStart?.[0]?.hooks?.[0]?.command, 'echo hi');
      });
      check('E4 statusLine stripped', () => assert.equal(s.statusLine, undefined));
    } catch (error) {
      check('E0 case E ran without throwing', () => {
        throw error;
      });
    }
    await fs.remove(caseBTmp);
  }
  console.log('');

  // Cleanup case C tmp.
  if (caseCTmp) await fs.remove(caseCTmp);

  // -------------------------------------------------------------------------
  // Case F — transcript-driven agent detection picks up /gm:agent-* loads
  // (no todo activeForm — the persona signal must come from transcript only).
  // -------------------------------------------------------------------------
  console.log(`${colors.yellow}Case F: detect /gm:agent-pm from transcript${colors.reset}`);
  let caseFTmp;
  try {
    caseFTmp = await makeTmpDir();
    const { detectAgentFromTranscript, resolveTranscriptPath, SHORTNAMES } = require(
      '../tools/installer/assets/hooks/gomad-statusline.js',
    );

    check('F1 SHORTNAMES covers all 8 personas', () => {
      assert.equal(Object.keys(SHORTNAMES).length, 8);
      assert.equal(SHORTNAMES.pm, 'John');
      assert.equal(SHORTNAMES.dev, 'Amelia');
      assert.equal(SHORTNAMES['solo-dev'], 'Barry');
    });

    // F2: slash-command form picks up the right persona.
    const t1 = path.join(caseFTmp, 't1.jsonl');
    await fs.writeFile(
      t1,
      [
        JSON.stringify({ type: 'user', content: 'hi there' }),
        JSON.stringify({ type: 'user', content: '/gm:agent-pm please draft the PRD' }),
      ].join('\n') + '\n',
    );
    check('F2 slash-command /gm:agent-pm → John', () => {
      const r = detectAgentFromTranscript(t1);
      assert.deepEqual(r, { persona: 'John', skill: 'gm-agent-pm' });
    });

    // F3: persona file Read picks up the persona too.
    const t2 = path.join(caseFTmp, 't2.jsonl');
    await fs.writeFile(
      t2,
      JSON.stringify({
        type: 'assistant',
        content: [{ type: 'tool_use', name: 'Read', input: { file_path: '/proj/_gomad/_config/agents/dev.md' } }],
      }) + '\n',
    );
    check('F3 _config/agents/dev.md → Amelia', () => {
      const r = detectAgentFromTranscript(t2);
      assert.deepEqual(r, { persona: 'Amelia', skill: 'gm-agent-dev' });
    });

    // F4: most-recent persona wins when transcript shows two loads.
    const t3 = path.join(caseFTmp, 't3.jsonl');
    await fs.writeFile(
      t3,
      [
        JSON.stringify({ type: 'user', content: '/gm:agent-pm draft PRD' }),
        JSON.stringify({ type: 'user', content: 'thanks, now /gm:agent-architect please' }),
      ].join('\n') + '\n',
    );
    check('F4 most-recent persona wins (architect over pm)', () => {
      const r = detectAgentFromTranscript(t3);
      assert.deepEqual(r, { persona: 'Winston', skill: 'gm-agent-architect' });
    });

    // F5: unknown shortname → null (not a false positive on `/gm:agent-foo`).
    const t4 = path.join(caseFTmp, 't4.jsonl');
    await fs.writeFile(t4, JSON.stringify({ type: 'user', content: '/gm:agent-bogus' }) + '\n');
    check('F5 unknown shortname returns null', () => {
      assert.equal(detectAgentFromTranscript(t4), null);
    });

    // F6: missing transcript file returns null silently.
    check('F6 missing file returns null', () => {
      assert.equal(detectAgentFromTranscript(path.join(caseFTmp, 'does-not-exist.jsonl')), null);
    });

    // F7: resolveTranscriptPath prefers data.transcript_path when provided.
    check('F7 resolveTranscriptPath honors data.transcript_path', () => {
      assert.equal(resolveTranscriptPath({ transcript_path: t1 }, 'irrelevant'), t1);
    });
  } catch (error) {
    check('F0 case F ran without throwing', () => {
      throw error;
    });
  }
  if (caseFTmp) await fs.remove(caseFTmp);
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
