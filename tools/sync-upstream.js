import {
  existsSync, mkdirSync, cpSync, readFileSync, writeFileSync,
  readdirSync, statSync, rmSync,
} from 'fs';
import { join, dirname, relative } from 'path';
import { fileURLToPath } from 'url';
import { homedir } from 'os';
import { parse as parseYaml } from 'yaml';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..');

const CLAUDE_DIR = join(homedir(), '.claude');
const GLOBAL_DIR = join(PROJECT_ROOT, 'global');
const LOCKFILE_PATH = join(PROJECT_ROOT, 'mobmad.lock.yaml');

// Source paths in ~/.claude/ for each asset type
const UPSTREAM_SOURCES = {
  rules:    join(CLAUDE_DIR, 'rules'),
  commands: join(CLAUDE_DIR, 'commands'),
  hooks:    join(CLAUDE_DIR, 'scripts', 'hooks'),
  agents:   join(CLAUDE_DIR, 'agents'),
};

/**
 * Load lockfile selections.
 */
function loadLockfile() {
  if (!existsSync(LOCKFILE_PATH)) return null;
  return parseYaml(readFileSync(LOCKFILE_PATH, 'utf8'));
}

/**
 * Load a catalog YAML and return the items array.
 */
function loadCatalog(name) {
  const path = join(PROJECT_ROOT, 'catalog', `${name}.yaml`);
  if (!existsSync(path)) return [];
  const data = parseYaml(readFileSync(path, 'utf8'));
  return data[name] || [];
}

/**
 * Sync upstream ~/.claude/ content into the mobmad global/ directory.
 * Uses the lockfile to determine which items to include.
 *
 * For rules: copies entire directory trees (common/, typescript/, etc.)
 * For commands: copies selected command files/directories
 * For hooks: copies selected hook scripts
 * For agents: copies selected agent .md files (global scope only)
 */
export function syncUpstream(options = {}) {
  console.log(chalk.bold('\nmobmad sync — populate global/ from ~/.claude/\n'));

  const lockfile = loadLockfile();
  if (!lockfile) {
    console.log(chalk.red('No lockfile found. Run `mobmad curate` first.\n'));
    return { synced: 0 };
  }

  let totalSynced = 0;

  // --- Rules: copy all rule directories (they're always included as a set) ---
  {
    const srcDir = UPSTREAM_SOURCES.rules;
    const destDir = join(GLOBAL_DIR, 'rules');

    if (existsSync(srcDir)) {
      // Clean and re-copy
      if (existsSync(destDir)) rmSync(destDir, { recursive: true, force: true });
      cpSync(srcDir, destDir, { recursive: true });
      const count = countFiles(destDir);
      totalSynced += count;
      console.log(chalk.green(`  rules: ${count} files`));
    }
  }

  // --- Commands: copy selected command files/dirs ---
  {
    const srcDir = UPSTREAM_SOURCES.commands;
    const destDir = join(GLOBAL_DIR, 'commands');
    const selected = new Set(lockfile.commands || []);

    if (existsSync(srcDir) && selected.size > 0) {
      if (existsSync(destDir)) rmSync(destDir, { recursive: true, force: true });
      mkdirSync(destDir, { recursive: true });

      let count = 0;
      for (const entry of readdirSync(srcDir)) {
        const name = entry.replace(/\.md$/, '');
        if (selected.has(name) || selected.has(entry)) {
          const srcPath = join(srcDir, entry);
          const destPath = join(destDir, entry);
          cpSync(srcPath, destPath, { recursive: true });
          count++;
        }
      }
      totalSynced += count;
      console.log(chalk.green(`  commands: ${count} items (of ${selected.size} selected)`));
    }
  }

  // --- Hooks: copy selected hook scripts ---
  {
    const srcDir = UPSTREAM_SOURCES.hooks;
    const destDir = join(GLOBAL_DIR, 'hooks');
    const selected = new Set(lockfile.hooks || []);

    if (existsSync(srcDir) && selected.size > 0) {
      if (existsSync(destDir)) rmSync(destDir, { recursive: true, force: true });
      mkdirSync(destDir, { recursive: true });

      let count = 0;
      for (const entry of readdirSync(srcDir)) {
        if (selected.has(entry)) {
          cpSync(join(srcDir, entry), join(destDir, entry));
          count++;
        }
      }
      totalSynced += count;
      console.log(chalk.green(`  hooks: ${count} items (of ${selected.size} selected)`));
    }
  }

  // --- Agents: copy selected global-scope agents ---
  {
    const srcDir = UPSTREAM_SOURCES.agents;
    const destDir = join(GLOBAL_DIR, 'agents');
    const selected = new Set(lockfile.agents || []);
    const agentCatalog = loadCatalog('agents');
    const globalAgents = new Set(
      agentCatalog.filter((a) => a.scope === 'global').map((a) => a.name)
    );

    if (existsSync(srcDir) && selected.size > 0) {
      if (existsSync(destDir)) rmSync(destDir, { recursive: true, force: true });
      mkdirSync(destDir, { recursive: true });

      let count = 0;
      for (const entry of readdirSync(srcDir)) {
        const name = entry.replace(/\.md$/, '');
        if (selected.has(name) && globalAgents.has(name)) {
          cpSync(join(srcDir, entry), join(destDir, entry), { recursive: true });
          count++;
        }
      }
      totalSynced += count;
      console.log(chalk.green(`  agents: ${count} items (global scope only)`));
    }
  }

  console.log(chalk.bold.green(`\nSynced ${totalSynced} items to global/\n`));
  return { synced: totalSynced };
}

function countFiles(dir) {
  let count = 0;
  if (!existsSync(dir)) return 0;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      count += countFiles(full);
    } else {
      count++;
    }
  }
  return count;
}

// Allow direct execution
if (process.argv[1] === __filename) {
  syncUpstream();
}
