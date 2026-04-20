const path = require('node:path');
const fs = require('fs-extra');
const prompts = require('../prompts');
const { Installer } = require('../core/installer');
const { UI } = require('../ui');

const installer = new Installer();
const ui = new UI();

// Self-install guard (D-11, Pitfall #7): refuse install into the gomad source
// repo unless explicitly opted in with --self. The marker is src/gomad-skills/
// at the TARGET directory — not the current working directory — so that running
// the CLI from inside the gomad dev repo against a different --directory works.
async function failIfGomadSourceTarget(targetDir) {
  const resolved = path.resolve(targetDir);
  const isGomadSource = await fs.pathExists(path.join(resolved, 'src', 'gomad-skills'));
  if (!isGomadSource) return false;
  await prompts.log.error(
    [
      'Refusing to install into the gomad source repo itself.',
      `Detected src/gomad-skills/ in ${resolved}.`,
      'This would pollute the dev repo with installer-generated output under .claude/commands/gm/.',
      'If you really mean to install here (rare — typically only for local dev-loop seeding),',
      'pass --self explicitly.',
    ].join('\n'),
  );
  process.exit(1);
}

module.exports = {
  command: 'install',
  description: 'Install GOMAD Core agents and tools',
  options: [
    ['-d, --debug', 'Enable debug output for manifest generation'],
    ['--directory <path>', 'Installation directory (default: current directory)'],
    ['--modules <modules>', 'Comma-separated list of module IDs to install (e.g., "gomad,bmb")'],
    [
      '--tools <tools>',
      'Comma-separated list of tool/IDE IDs to configure (e.g., "claude-code,cursor"). Use "none" to skip tool configuration.',
    ],
    ['--custom-content <paths>', 'Comma-separated list of paths to custom modules/agents/workflows'],
    ['--action <type>', 'Action type for existing installations: install, update, or quick-update'],
    ['--user-name <name>', 'Name for agents to use (default: system username)'],
    ['--communication-language <lang>', 'Language for agent communication (default: English)'],
    ['--document-output-language <lang>', 'Language for document output (default: English)'],
    ['--output-folder <path>', 'Output folder path relative to project root (default: _gomad-output)'],
    ['-y, --yes', 'Accept all defaults and skip prompts where possible'],
    [
      '--self',
      'Permit install into the gomad source repo itself (bypasses the self-install guard). Use only when intentionally re-seeding local dev output.',
    ],
    [
      '--dry-run',
      'Print the planned cleanup + copy actions (TO SNAPSHOT / TO REMOVE / TO WRITE) without touching disk (Phase 7 D-40)',
    ],
  ],
  action: async (options) => {
    // Self-install guard (D-11, Pitfall #7) — fires BEFORE any prompts. The
    // effective target is whatever `gomad install` would write to without
    // further user interaction: --directory when given, else cwd as default.
    // This allows `gomad install --directory <elsewhere>` from inside the
    // gomad dev repo to proceed, while still blocking a bare `gomad install`
    // from inside the source repo (which would default to cwd).
    if (!options.self) {
      const effectiveTarget = options.directory || process.cwd();
      await failIfGomadSourceTarget(effectiveTarget);
    }

    try {
      // Set debug flag as environment variable for all components
      if (options.debug) {
        process.env.GOMAD_DEBUG_MANIFEST = 'true';
        await prompts.log.info('Debug mode enabled');
      }

      const config = await ui.promptInstall(options);

      // Phase 7 D-40/D-41: propagate --dry-run from Commander options into
      // installer config. Consumed by _prepareUpdateState which calls
      // cleanupPlanner.renderPlan + process.exit(0) BEFORE any disk write.
      config.dryRun = !!options.dryRun;

      // Handle cancel
      if (config.actionType === 'cancel') {
        await prompts.log.warn('Installation cancelled.');
        process.exit(0);
      }

      // Handle quick update separately
      if (config.actionType === 'quick-update') {
        const result = await installer.quickUpdate(config);
        await prompts.log.success('Quick update complete!');
        await prompts.log.info(`Updated ${result.moduleCount} modules with preserved settings (${result.modules.join(', ')})`);
        process.exit(0);
      }

      // Regular install/update flow
      const result = await installer.install(config);

      // Check if installation was cancelled
      if (result && result.cancelled) {
        process.exit(0);
      }

      // Check if installation succeeded
      if (result && result.success) {
        process.exit(0);
      }
    } catch (error) {
      try {
        if (error.fullMessage) {
          await prompts.log.error(error.fullMessage);
        } else {
          await prompts.log.error(`Installation failed: ${error.message}`);
        }
        if (error.stack) {
          await prompts.log.message(error.stack);
        }
      } catch {
        console.error(error.fullMessage || error.message || error);
      }
      process.exit(1);
    }
  },
};
