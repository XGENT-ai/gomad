#!/usr/bin/env node

import { Command } from 'commander';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf8'));

const program = new Command();

program
  .name('gomad')
  .description('GOMAD — curated Claude Code environment')
  .version(pkg.version);

program
  .command('install')
  .description('Install gomad module and global assets')
  .option('-p, --preset <preset>', 'Skill preset (full, full-stack, python-only, enterprise, lean, enhanced)')
  .option('--global-only', 'Install only global assets to ~/.claude/')
  .option('-y, --yes', 'Skip interactive prompts, use defaults')
  .action(async (options) => {
    const { install } = await import('../tools/global-installer.js');
    await install(options);
  });

program
  .command('curate')
  .description('Interactively select skills, agents, and hooks')
  .action(async () => {
    const { curate } = await import('../tools/curator.js');
    await curate();
  });

program
  .command('update')
  .description('Pull latest content and re-apply gomad module')
  .action(async () => {
    const { install } = await import('../tools/global-installer.js');
    console.log('Updating gomad...');
    // Re-run install with existing lockfile
    await install({ yes: true });
  });

program
  .command('status')
  .description('Show installed skills, agents, rules, and hooks')
  .action(async () => {
    const { status } = await import('../tools/global-installer.js');
    status();
  });

program
  .command('uninstall')
  .description('Remove gomad assets')
  .option('--global', 'Remove global assets from ~/.claude/')
  .action(async (options) => {
    if (options.global) {
      const { uninstallGlobal } = await import('../tools/global-installer.js');
      uninstallGlobal();
    } else {
      console.log('Use --global to remove global assets from ~/.claude/');
      console.log('To remove the project module, delete .claude/skills/mob/ in your project.');
    }
  });

program
  .command('package')
  .description('Package selected skills into src/module/skills/ with manifests')
  .action(async () => {
    const { packageSkills } = await import('../tools/package-skills.js');
    packageSkills();
  });

program
  .command('sync')
  .description('Populate global/ from ~/.claude/ based on lockfile selections')
  .action(async () => {
    const { syncUpstream } = await import('../tools/sync-upstream.js');
    syncUpstream();
  });

program
  .command('mcp')
  .description('Manage MCP server configurations')
  .argument('[action]', 'list or enable', 'list')
  .argument('[name]', 'MCP server name to enable')
  .action(async (action, name) => {
    if (action === 'list') {
      console.log('MCP server templates (Phase 6 — not yet implemented):');
      console.log('  Run `gomad mcp enable <name>` to add a config to your MCP settings.');
    } else if (action === 'enable' && name) {
      console.log(`TODO: Enable MCP server "${name}"`);
    } else {
      console.log('Usage: gomad mcp list | gomad mcp enable <name>');
    }
  });

program.parse();
