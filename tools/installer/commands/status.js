const path = require('node:path');
const prompts = require('../prompts');
const { Installer } = require('../core/installer');
const { Manifest } = require('../core/manifest');
const { UI } = require('../ui');

const installer = new Installer();
const manifest = new Manifest();
const ui = new UI();

module.exports = {
  command: 'status',
  description: 'Display GOMAD installation status and module versions',
  options: [],
  action: async (options) => {
    try {
      // Find the gomad directory
      const projectDir = process.cwd();
      const { gomadDir } = await installer.findBmadDir(projectDir);

      // Check if gomad directory exists
      const fs = require('fs-extra');
      if (!(await fs.pathExists(gomadDir))) {
        await prompts.log.warn('No GOMAD installation found in the current directory.');
        await prompts.log.message(`Expected location: ${gomadDir}`);
        await prompts.log.message('Run "gomad install" to set up a new installation.');
        process.exit(0);
        return;
      }

      // Read manifest
      const manifestData = await manifest._readRaw(gomadDir);

      if (!manifestData) {
        await prompts.log.warn('No GOMAD installation manifest found.');
        await prompts.log.message('Run "gomad install" to set up a new installation.');
        process.exit(0);
        return;
      }

      // Get installation info
      const installation = manifestData.installation || {};
      const modules = manifestData.modules || [];

      // Check for available updates (only for external modules)
      const availableUpdates = await manifest.checkForUpdates(gomadDir);

      // Display status
      await ui.displayStatus({
        installation,
        modules,
        availableUpdates,
        gomadDir,
      });

      process.exit(0);
    } catch (error) {
      await prompts.log.error(`Status check failed: ${error.message}`);
      if (process.env.GOMAD_DEBUG) {
        await prompts.log.message(error.stack);
      }
      process.exit(1);
    }
  },
};
