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
        source: 'tools/installer/assets/hooks/gomad-statusline.cjs',
        dest_name: 'gomad-statusline.cjs',
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

    const hookPath = path.join(caseATmp, '.claude/hooks/gomad-statusline.cjs');
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
      assert.match(settings.statusLine?.command || '', /gomad-statusline\.cjs/);
      assert.match(settings.statusLine?.command || '', /\$CLAUDE_PROJECT_DIR/);
    });

    check('A8 install tracked the hook file', () => {
      assert.equal(
        tracked.some((p) => p.endsWith('gomad-statusline.cjs')),
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
      assert.match(settings.statusLine?.command || '', /gomad-statusline\.cjs/);
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

    const hookPath = path.join(caseCTmp, '.claude/hooks/gomad-statusline.cjs');
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

    check('C2.1 statusLine.command now references gomad-statusline.cjs', () => {
      assert.match(settings.statusLine?.command || '', /gomad-statusline\.cjs/);
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

    const hookPath = path.join(caseC3Tmp, '.claude/hooks/gomad-statusline.cjs');
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
      assert.equal(setup.installerConfig?.statusline?.dest_name, 'gomad-statusline.cjs');

      await setup.cleanupStatusline(caseATmp, { silent: true });

      const hookPath = path.join(caseATmp, '.claude/hooks/gomad-statusline.cjs');
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
  // Case F — hook-driven agent state: tracker writes, statusline reads.
  // -------------------------------------------------------------------------
  console.log(`${colors.yellow}Case F: hook-driven agent state${colors.reset}`);
  let caseFSession;
  try {
    const { readAgentState, SHORTNAMES } = require('../tools/installer/assets/hooks/gomad-statusline.cjs');
    const tracker = require('../tools/installer/assets/hooks/gomad-agent-tracker.cjs');

    check('F1 SHORTNAMES covers all 8 personas', () => {
      assert.equal(Object.keys(SHORTNAMES).length, 8);
      assert.equal(SHORTNAMES.pm, 'John');
      assert.equal(SHORTNAMES.dev, 'Amelia');
      assert.equal(SHORTNAMES['solo-dev'], 'Barry');
    });

    // Use a unique session id per process so we never collide with a real one.
    caseFSession = `gomad-test-${process.pid}-${Date.now()}`;
    const stateFile = tracker.stateFileFor(caseFSession);
    try {
      fs.unlinkSync(stateFile);
    } catch {
      /* fresh */
    }

    // F2: UserPromptSubmit with /gm:agent-pm writes state, statusline reads it.
    tracker.handle({
      hook_event_name: 'UserPromptSubmit',
      session_id: caseFSession,
      prompt: '/gm:agent-pm please draft a PRD',
    });
    check('F2 tracker writes state on /gm:agent-pm', () => {
      assert.equal(fs.pathExistsSync(stateFile), true);
      assert.deepEqual(readAgentState(caseFSession), { persona: 'John', skill: 'gm-agent-pm' });
    });

    // F3: subsequent UserPromptSubmit with chat text leaves state alone.
    tracker.handle({
      hook_event_name: 'UserPromptSubmit',
      session_id: caseFSession,
      prompt: 'thanks, also gm-agent-solo-dev should not change the persona',
    });
    check('F3 chat text does not overwrite state', () => {
      assert.deepEqual(readAgentState(caseFSession), { persona: 'John', skill: 'gm-agent-pm' });
    });

    // F4: /gm:agent-architect overwrites — most recent invocation wins.
    tracker.handle({
      hook_event_name: 'UserPromptSubmit',
      session_id: caseFSession,
      prompt: '/gm:agent-architect now',
    });
    check('F4 second /gm:agent-* overwrites state', () => {
      assert.deepEqual(readAgentState(caseFSession), { persona: 'Winston', skill: 'gm-agent-architect' });
    });

    // F5: SessionStart resets state regardless of subtype.
    tracker.handle({ hook_event_name: 'SessionStart', session_id: caseFSession, source: 'clear' });
    check('F5 SessionStart deletes state file', () => {
      assert.equal(fs.pathExistsSync(stateFile), false);
      assert.equal(readAgentState(caseFSession), null);
    });

    // F6: SessionEnd also deletes (defensive cleanup).
    tracker.handle({
      hook_event_name: 'UserPromptSubmit',
      session_id: caseFSession,
      prompt: '/gm:agent-dev',
    });
    tracker.handle({ hook_event_name: 'SessionEnd', session_id: caseFSession, reason: 'logout' });
    check('F6 SessionEnd deletes state file', () => {
      assert.equal(fs.pathExistsSync(stateFile), false);
    });

    // F7: unknown shortname is rejected silently.
    tracker.handle({
      hook_event_name: 'UserPromptSubmit',
      session_id: caseFSession,
      prompt: '/gm:agent-bogus',
    });
    check('F7 unknown shortname does not create state', () => {
      assert.equal(fs.pathExistsSync(stateFile), false);
    });

    // F8: chat starting with non-slash text is rejected (regression for the
    // "我运行 /gm:agent-pm" false-positive bug).
    tracker.handle({
      hook_event_name: 'UserPromptSubmit',
      session_id: caseFSession,
      prompt: '我运行 /gm:agent-pm ，但显示的是 Barry (gm-agent-solo-dev)',
    });
    check('F8 chat text mentioning /gm:agent-* mid-sentence is rejected', () => {
      assert.equal(fs.pathExistsSync(stateFile), false);
      assert.equal(readAgentState(caseFSession), null);
    });

    // F9: extractSlashAgent direct-unit checks for the regex anchoring.
    check('F9 extractSlashAgent rejects non-anchored matches', () => {
      assert.equal(tracker.extractSlashAgent('chat /gm:agent-pm'), null);
      assert.equal(tracker.extractSlashAgent('  /gm:agent-pm draft'), 'pm');
      assert.equal(tracker.extractSlashAgent('/gm:agent-bogus'), null);
      assert.equal(tracker.extractSlashAgent('/gm:agent-dev'), 'dev');
      // boundary: should not match `/gm:agent-developer` as `dev`
      assert.equal(tracker.extractSlashAgent('/gm:agent-developer'), null);
    });

    // F10: stateFileFor rejects path-traversal session ids.
    check('F10 stateFileFor rejects unsafe session ids', () => {
      assert.equal(tracker.stateFileFor('../etc/passwd'), null);
      assert.equal(tracker.stateFileFor('foo/bar'), null);
      assert.equal(tracker.stateFileFor(''), null);
      assert.equal(tracker.stateFileFor(null), null);
    });

    // F11: readAgentState returns null when state file is missing.
    check('F11 readAgentState returns null without state file', () => {
      assert.equal(readAgentState(`${caseFSession}-never-existed`), null);
    });
  } catch (error) {
    check('F0 case F ran without throwing', () => {
      throw error;
    });
  }
  // Cleanup any state file we left behind.
  if (caseFSession) {
    try {
      const trackerMod = require('../tools/installer/assets/hooks/gomad-agent-tracker.cjs');
      const sf = trackerMod.stateFileFor(caseFSession);
      if (sf) fs.removeSync(sf);
    } catch {
      /* ignore */
    }
  }
  console.log('');

  // -------------------------------------------------------------------------
  // Case G — installAgentTracker / cleanupAgentTracker round-trip
  // -------------------------------------------------------------------------
  console.log(`${colors.yellow}Case G: agent-tracker install/uninstall round-trip${colors.reset}`);
  try {
    const tmp = await makeTmpDir();
    const cfg = {
      name: 'Claude Code',
      installer: {
        target_dir: '.claude/skills',
        hooks_target_dir: '.claude/hooks',
        agent_tracker: {
          source: 'tools/installer/assets/hooks/gomad-agent-tracker.cjs',
          dest_name: 'gomad-agent-tracker.cjs',
          settings_file: '.claude/settings.json',
          events: ['UserPromptSubmit', 'SessionStart', 'SessionEnd'],
        },
      },
    };
    const setup = new ConfigDrivenIdeSetup('claude-code', cfg);

    // Pre-existing settings.json with an unrelated hook entry that must survive.
    const settingsPath = path.join(tmp, '.claude/settings.json');
    await fs.ensureDir(path.dirname(settingsPath));
    await fs.writeJson(
      settingsPath,
      {
        env: { KEEP: 'me' },
        hooks: {
          SessionStart: [{ hooks: [{ type: 'command', command: 'echo other' }] }],
        },
      },
      { spaces: 2 },
    );

    const installed = await setup.installAgentTracker(tmp, cfg.installer, { silent: true });
    check('G1 installAgentTracker returns true', () => assert.equal(installed, true));

    const trackerPath = path.join(tmp, '.claude/hooks/gomad-agent-tracker.cjs');
    check('G2 tracker file copied + executable', () => {
      assert.equal(fs.pathExistsSync(trackerPath), true);
      if (process.platform !== 'win32') {
        const mode = fs.statSync(trackerPath).mode;
        assert.equal((mode & 0o100) !== 0, true);
      }
    });

    const settingsAfter = await fs.readJson(settingsPath);
    check('G3 unrelated env.KEEP survives', () => assert.equal(settingsAfter.env?.KEEP, 'me'));
    check('G4 unrelated SessionStart hook survives', () => {
      const groups = settingsAfter.hooks?.SessionStart || [];
      const echoSurvived = groups.some((g) => (g.hooks || []).some((h) => h.command === 'echo other'));
      assert.equal(echoSurvived, true);
    });
    check('G5 tracker registered on all 3 events', () => {
      for (const event of ['UserPromptSubmit', 'SessionStart', 'SessionEnd']) {
        const groups = settingsAfter.hooks?.[event] || [];
        const found = groups.some((g) =>
          (g.hooks || []).some((h) => typeof h.command === 'string' && h.command.includes('gomad-agent-tracker.cjs')),
        );
        assert.equal(found, true, `missing tracker registration on ${event}`);
      }
    });

    // G6: re-running install is idempotent — no duplicates.
    await setup.installAgentTracker(tmp, cfg.installer, { silent: true });
    const settingsAfter2 = await fs.readJson(settingsPath);
    check('G6 re-install does not duplicate registrations', () => {
      for (const event of ['UserPromptSubmit', 'SessionStart', 'SessionEnd']) {
        const matches = (settingsAfter2.hooks?.[event] || []).reduce(
          (n, g) =>
            n + (g.hooks || []).filter((h) => typeof h.command === 'string' && h.command.includes('gomad-agent-tracker.cjs')).length,
          0,
        );
        assert.equal(matches, 1, `expected 1 tracker entry on ${event}, got ${matches}`);
      }
    });

    // G7: cleanup removes file + entries, leaves unrelated config alone.
    await setup.cleanupAgentTracker(tmp, { silent: true });
    const settingsCleaned = await fs.readJson(settingsPath);
    check('G7 cleanup removes tracker file', () => {
      assert.equal(fs.pathExistsSync(trackerPath), false);
    });
    check('G8 cleanup leaves unrelated keys intact', () => {
      assert.equal(settingsCleaned.env?.KEEP, 'me');
      const groups = settingsCleaned.hooks?.SessionStart || [];
      const echoSurvived = groups.some((g) => (g.hooks || []).some((h) => h.command === 'echo other'));
      assert.equal(echoSurvived, true);
    });
    check('G9 cleanup strips all tracker entries', () => {
      for (const event of ['UserPromptSubmit', 'SessionStart', 'SessionEnd']) {
        const groups = settingsCleaned.hooks?.[event] || [];
        const trackerEntries = groups.reduce(
          (n, g) =>
            n + (g.hooks || []).filter((h) => typeof h.command === 'string' && h.command.includes('gomad-agent-tracker.cjs')).length,
          0,
        );
        assert.equal(trackerEntries, 0, `tracker still registered on ${event}`);
      }
    });

    await fs.remove(tmp);
  } catch (error) {
    check('G0 case G ran without throwing', () => {
      throw error;
    });
  }
  console.log('');

  // -------------------------------------------------------------------------
  // Case H — quick task 260512-vc3: hook MUST load under a host project whose
  // package.json has "type": "module". With the old .js extension this would
  // throw `ReferenceError: require is not defined in ES module scope` at
  // module load (Node treats `.js` files as ESM when the nearest parent
  // package.json sets `"type": "module"`). The .cjs extension forces CJS.
  // -------------------------------------------------------------------------
  console.log(`${colors.yellow}Case H: hook loads under type:module parent (260512-vc3)${colors.reset}`);
  let caseHTmp;
  try {
    caseHTmp = await makeTmpDir();
    // Synthetic host project with `"type": "module"` at the package root.
    await fs.writeJson(path.join(caseHTmp, 'package.json'), { type: 'module' }, { spaces: 2 });
    const hookDir = path.join(caseHTmp, '.claude', 'hooks');
    await fs.ensureDir(hookDir);
    const hookDest = path.join(hookDir, 'gomad-agent-tracker.cjs');
    await fs.copy(path.join(projectRoot, 'tools/installer/assets/hooks/gomad-agent-tracker.cjs'), hookDest);

    // Spawn a fresh node process so require() actually resolves against the
    // host package.json — `require()` from this test process would resolve
    // against gomad's own package.json instead.
    const { spawnSync } = require('node:child_process');
    const sessionId = `gomad-test-esm-${process.pid}-${Date.now()}`;
    const stdin = JSON.stringify({
      session_id: sessionId,
      hook_event_name: 'UserPromptSubmit',
      prompt: '/gm:agent-pm hi',
    });
    const result = spawnSync(process.execPath, [hookDest], {
      input: stdin,
      encoding: 'utf8',
      timeout: 5000,
    });
    check('H1 hook process exits 0 under type:module parent', () => {
      assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    });
    check('H2 hook stderr is empty (no ESM scope error)', () => {
      assert.equal(result.stderr, '', `unexpected stderr: ${result.stderr}`);
    });
    // The state file lives in os.tmpdir() (not host tmp). Use the source
    // module to compute its path consistently.
    const trackerMod = require('../tools/installer/assets/hooks/gomad-agent-tracker.cjs');
    const stateFile = trackerMod.stateFileFor(sessionId);
    check('H3 hook wrote per-session state file', () => {
      assert.equal(fs.pathExistsSync(stateFile), true, `state file missing: ${stateFile}`);
      const state = fs.readJsonSync(stateFile);
      assert.equal(state.persona, 'John');
      assert.equal(state.skill, 'gm-agent-pm');
    });
    // Cleanup state file.
    try {
      fs.unlinkSync(stateFile);
    } catch {
      /* ignore */
    }
  } catch (error) {
    check('H0 case H ran without throwing', () => {
      throw error;
    });
  }
  if (caseHTmp) await fs.remove(caseHTmp);
  console.log('');

  // -------------------------------------------------------------------------
  // Case I — quick task 260512-vc3: cleanup migrates legacy .js artifacts
  // left behind by prior installer versions. Verifies both the file
  // removal and the settings.json strip handle the legacy name.
  // -------------------------------------------------------------------------
  console.log(`${colors.yellow}Case I: cleanup migrates legacy .js artifacts (260512-vc3)${colors.reset}`);
  try {
    const tmp = await makeTmpDir();
    const cfg = makeClaudeCodeConfig();
    // Add agent_tracker to exercise its cleanup as well.
    cfg.installer.agent_tracker = {
      source: 'tools/installer/assets/hooks/gomad-agent-tracker.cjs',
      dest_name: 'gomad-agent-tracker.cjs',
      settings_file: '.claude/settings.json',
      events: ['UserPromptSubmit', 'SessionStart', 'SessionEnd'],
    };
    const setup = new ConfigDrivenIdeSetup('claude-code', cfg);

    // Seed legacy .js artifacts (statusline + tracker) plus matching
    // settings.json entries that reference the .js filenames.
    const hooksDir = path.join(tmp, '.claude/hooks');
    await fs.ensureDir(hooksDir);
    const legacyStatuslineFile = path.join(hooksDir, 'gomad-statusline.js');
    const legacyTrackerFile = path.join(hooksDir, 'gomad-agent-tracker.js');
    await fs.writeFile(legacyStatuslineFile, '// stale legacy statusline\n');
    await fs.writeFile(legacyTrackerFile, '// stale legacy tracker\n');

    const settingsPath = path.join(tmp, '.claude/settings.json');
    await fs.writeJson(
      settingsPath,
      {
        env: { KEEP: 'me' },
        statusLine: {
          type: 'command',
          command: 'node "$CLAUDE_PROJECT_DIR"/.claude/hooks/gomad-statusline.js',
          padding: 0,
        },
        hooks: {
          UserPromptSubmit: [
            { hooks: [{ type: 'command', command: 'node "$CLAUDE_PROJECT_DIR"/.claude/hooks/gomad-agent-tracker.js', timeout: 5 }] },
          ],
          SessionStart: [
            { hooks: [{ type: 'command', command: 'node "$CLAUDE_PROJECT_DIR"/.claude/hooks/gomad-agent-tracker.js', timeout: 5 }] },
            { hooks: [{ type: 'command', command: 'echo other' }] }, // unrelated — must survive
          ],
          SessionEnd: [
            { hooks: [{ type: 'command', command: 'node "$CLAUDE_PROJECT_DIR"/.claude/hooks/gomad-agent-tracker.js', timeout: 5 }] },
          ],
        },
      },
      { spaces: 2 },
    );

    await setup.cleanupStatusline(tmp, { silent: true });
    await setup.cleanupAgentTracker(tmp, { silent: true });

    check('I1 legacy gomad-statusline.js removed', () => {
      assert.equal(fs.pathExistsSync(legacyStatuslineFile), false);
    });
    check('I2 legacy gomad-agent-tracker.js removed', () => {
      assert.equal(fs.pathExistsSync(legacyTrackerFile), false);
    });

    const after = await fs.readJson(settingsPath);
    check('I3 legacy statusLine stripped from settings.json', () => {
      assert.equal(after.statusLine, undefined);
    });
    check('I4 legacy tracker entries stripped from all three events', () => {
      for (const event of ['UserPromptSubmit', 'SessionStart', 'SessionEnd']) {
        const groups = after.hooks?.[event] || [];
        const stillThere = groups.some((g) =>
          (g.hooks || []).some((h) => typeof h.command === 'string' && h.command.includes('gomad-agent-tracker.js')),
        );
        assert.equal(stillThere, false, `legacy tracker still registered on ${event}`);
      }
    });
    check('I5 unrelated env.KEEP survived', () => assert.equal(after.env?.KEEP, 'me'));
    check('I6 unrelated `echo other` hook survived', () => {
      const groups = after.hooks?.SessionStart || [];
      const echoSurvived = groups.some((g) => (g.hooks || []).some((h) => h.command === 'echo other'));
      assert.equal(echoSurvived, true);
    });

    await fs.remove(tmp);
  } catch (error) {
    check('I0 case I ran without throwing', () => {
      throw error;
    });
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
