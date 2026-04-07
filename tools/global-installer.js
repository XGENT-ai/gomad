import {
  existsSync, mkdirSync, cpSync, readFileSync, writeFileSync,
  readdirSync, statSync, renameSync, rmSync,
} from 'fs';
import { join, dirname, relative } from 'path';
import { fileURLToPath } from 'url';
import { homedir } from 'os';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..');

const CLAUDE_DIR = join(homedir(), '.claude');
const MANIFEST_PATH = join(CLAUDE_DIR, '.gomad-manifest.yaml');
const GLOBAL_SRC = join(PROJECT_ROOT, 'global');
const LOCKFILE_PATH = join(PROJECT_ROOT, 'gomad.lock.yaml');

// Mapping from catalog asset type to source/target directories
const ASSET_DIRS = {
  rules:    { src: join(GLOBAL_SRC, 'rules'),    target: join(CLAUDE_DIR, 'rules') },
  commands: { src: join(GLOBAL_SRC, 'commands'),  target: join(CLAUDE_DIR, 'commands') },
  hooks:    { src: join(GLOBAL_SRC, 'hooks'),     target: join(CLAUDE_DIR, 'scripts', 'hooks') },
  agents:   { src: join(GLOBAL_SRC, 'agents'),    target: join(CLAUDE_DIR, 'agents') },
};

/**
 * Create a timestamped backup of a directory.
 * Returns the backup path or null if nothing to back up.
 */
function backupDir(targetDir) {
  if (!existsSync(targetDir)) return null;

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const backupPath = `${targetDir}.gomad-backup-${timestamp}`;
  // Only back up if there are files to preserve
  try {
    const entries = readdirSync(targetDir);
    if (entries.length === 0) return null;
  } catch {
    return null;
  }

  cpSync(targetDir, backupPath, { recursive: true });
  return backupPath;
}

/**
 * Collect all files recursively from a directory, returning relative paths.
 */
function collectFiles(dir, base = dir) {
  const files = [];
  if (!existsSync(dir)) return files;

  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      files.push(...collectFiles(full, base));
    } else {
      files.push(relative(base, full));
    }
  }
  return files;
}

/**
 * Copy files from source to target, creating directories as needed.
 * Returns list of installed file paths (relative to target).
 */
function installFiles(srcDir, targetDir) {
  if (!existsSync(srcDir)) return [];

  mkdirSync(targetDir, { recursive: true });
  const files = collectFiles(srcDir);

  for (const file of files) {
    const srcFile = join(srcDir, file);
    const targetFile = join(targetDir, file);
    mkdirSync(dirname(targetFile), { recursive: true });
    cpSync(srcFile, targetFile, { force: true });
  }

  return files;
}

/**
 * Load the lockfile selections or return null.
 */
function loadLockfile() {
  if (!existsSync(LOCKFILE_PATH)) return null;
  const raw = readFileSync(LOCKFILE_PATH, 'utf8');
  return parseYaml(raw);
}

/**
 * Load existing manifest or return empty one.
 */
function loadManifest() {
  if (!existsSync(MANIFEST_PATH)) {
    return { installed_at: null, version: null, backups: {}, files: {} };
  }
  const raw = readFileSync(MANIFEST_PATH, 'utf8');
  return parseYaml(raw);
}

/**
 * Save manifest to disk.
 */
function saveManifest(manifest) {
  writeFileSync(MANIFEST_PATH, stringifyYaml(manifest), 'utf8');
}

/**
 * Install gomad global assets to ~/.claude/
 *
 * Flow:
 * 1. Run curator if no lockfile exists (or --preset provided)
 * 2. Backup existing directories
 * 3. Copy assets from global/ to ~/.claude/
 * 4. Write manifest tracking what was installed
 * 5. Optionally delegate to bmad-method for project module
 */
export async function install(options = {}) {
  console.log(chalk.bold('\ngomad install\n'));

  // Step 1: Ensure we have selections (run curator if needed)
  let lockfile = loadLockfile();

  if (!lockfile) {
    if (options.preset || options.yes) {
      const { curate } = await import('./curator.js');
      lockfile = await curate({
        preset: options.preset || 'full-stack',
        yes: options.yes || !!options.preset,
      });
    } else {
      const { curate } = await import('./curator.js');
      lockfile = await curate();
    }

    if (!lockfile) {
      console.log(chalk.red('No selections made. Aborting.'));
      return;
    }

    // Reload from disk since curate writes it
    lockfile = loadLockfile();
  }

  // Step 2: Check what content is available in global/
  const hasGlobalContent = Object.values(ASSET_DIRS).some(
    ({ src }) => existsSync(src) && readdirSync(src).length > 0
  );

  if (!hasGlobalContent) {
    console.log(chalk.yellow('Global content not yet packaged (global/ dirs are empty).'));
    console.log(chalk.yellow('Run Phase 4 content packaging first, or use `gomad install --sync` to populate from ~/.claude/.'));
    console.log();

    if (!options.globalOnly) {
      await installProjectModule(options);
    }
    return;
  }

  // Step 3: Backup and install
  const manifest = loadManifest();
  manifest.installed_at = new Date().toISOString();
  manifest.version = lockfile.version || '0.1.0';
  manifest.backups = {};
  manifest.files = {};

  let totalFiles = 0;

  for (const [assetType, { src, target }] of Object.entries(ASSET_DIRS)) {
    if (!existsSync(src) || readdirSync(src).length === 0) {
      console.log(chalk.dim(`  skip ${assetType} (no content)`));
      continue;
    }

    // Backup
    const backupPath = backupDir(target);
    if (backupPath) {
      manifest.backups[assetType] = backupPath;
      console.log(chalk.dim(`  backup ${assetType} -> ${relative(CLAUDE_DIR, backupPath)}`));
    }

    // Install
    const files = installFiles(src, target);
    manifest.files[assetType] = files;
    totalFiles += files.length;
    console.log(chalk.green(`  installed ${files.length} ${assetType}`));
  }

  // Step 4: Save manifest
  saveManifest(manifest);
  console.log(chalk.dim(`  manifest -> ${relative(homedir(), MANIFEST_PATH)}`));

  console.log(chalk.bold.green(`\nInstalled ${totalFiles} files to ~/.claude/\n`));

  // Step 5: Install project module if not --global-only
  if (!options.globalOnly) {
    await installProjectModule(options);
  }
}

/**
 * Delegate to bmad-method for project-scoped module installation.
 */
async function installProjectModule(options) {
  console.log(chalk.dim('Project module installation requires bmad-method.'));
  console.log(chalk.dim('Run: npx bmad-method install --modules bmm,mob'));
}

/**
 * Show status of installed gomad assets.
 */
export function status() {
  console.log(chalk.bold('\ngomad status\n'));

  const manifest = loadManifest();

  if (!manifest.installed_at) {
    console.log(chalk.yellow('No gomad installation found.'));
    console.log(chalk.dim('Run `gomad install` to get started.\n'));
    return;
  }

  console.log(`Installed: ${chalk.green(manifest.installed_at)}`);
  console.log(`Version:   ${manifest.version || 'unknown'}`);
  console.log();

  // Show file counts per asset type
  const files = manifest.files || {};
  let total = 0;

  for (const [assetType, fileList] of Object.entries(files)) {
    const count = Array.isArray(fileList) ? fileList.length : 0;
    total += count;
    console.log(`  ${assetType.padEnd(10)} ${chalk.bold(count)} files`);
  }

  console.log(`  ${'total'.padEnd(10)} ${chalk.bold(total)} files`);
  console.log();

  // Show lockfile info
  const lockfile = loadLockfile();
  if (lockfile) {
    console.log(chalk.dim('Lockfile selections:'));
    console.log(`  Skills:   ${lockfile.skills?.length || 0}`);
    console.log(`  Agents:   ${lockfile.agents?.length || 0}`);
    console.log(`  Commands: ${lockfile.commands?.length || 0}`);
    console.log(`  Hooks:    ${lockfile.hooks?.length || 0}`);
  }

  // Show backups
  const backups = manifest.backups || {};
  const backupEntries = Object.entries(backups).filter(([, p]) => existsSync(p));
  if (backupEntries.length > 0) {
    console.log();
    console.log(chalk.dim('Backups:'));
    for (const [assetType, backupPath] of backupEntries) {
      console.log(`  ${assetType}: ${relative(homedir(), backupPath)}`);
    }
  }

  console.log();
}

/**
 * Uninstall global assets by restoring from backups.
 */
export function uninstallGlobal() {
  console.log(chalk.bold('\ngomad uninstall --global\n'));

  const manifest = loadManifest();

  if (!manifest.installed_at) {
    console.log(chalk.yellow('No gomad installation found. Nothing to uninstall.\n'));
    return;
  }

  const backups = manifest.backups || {};
  const files = manifest.files || {};
  let restored = 0;
  let removed = 0;

  for (const [assetType, { target }] of Object.entries(ASSET_DIRS)) {
    const installedFiles = files[assetType];
    if (!installedFiles || installedFiles.length === 0) continue;

    const backupPath = backups[assetType];

    if (backupPath && existsSync(backupPath)) {
      // Remove current and restore backup
      if (existsSync(target)) {
        rmSync(target, { recursive: true, force: true });
      }
      renameSync(backupPath, target);
      restored++;
      console.log(chalk.green(`  restored ${assetType} from backup`));
    } else {
      // No backup — remove only the files we installed
      for (const file of installedFiles) {
        const filePath = join(target, file);
        if (existsSync(filePath)) {
          rmSync(filePath);
          removed++;
        }
      }
      console.log(chalk.yellow(`  removed ${installedFiles.length} ${assetType} files (no backup to restore)`));
    }
  }

  // Clean up manifest
  rmSync(MANIFEST_PATH, { force: true });

  console.log(chalk.bold.green(`\nUninstalled. Restored ${restored} directories, removed ${removed} individual files.\n`));
}
