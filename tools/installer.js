import {
  existsSync, mkdirSync, cpSync, readFileSync, writeFileSync,
  readdirSync, statSync, rmSync,
} from 'fs';
import { join, dirname, relative } from 'path';
import { fileURLToPath } from 'url';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CLAUDE_DIR = join(process.cwd(), '.claude');
const ASSETS_SRC = join(__dirname, '..', 'assets');
const LOCKFILE_PATH = join(process.cwd(), 'gomad.lock.yaml');
const MANIFEST_PATH = join(CLAUDE_DIR, '.gomad-manifest.yaml');

// Mapping from catalog asset type to source/target directories
const ASSET_DIRS = {
  rules:    { src: join(ASSETS_SRC, 'rules'),    target: join(CLAUDE_DIR, 'rules') },
  commands: { src: join(ASSETS_SRC, 'commands'), target: join(CLAUDE_DIR, 'commands') },
  hooks:    { src: join(ASSETS_SRC, 'hooks'),    target: join(CLAUDE_DIR, 'scripts', 'hooks') },
  agents:   { src: join(ASSETS_SRC, 'agents'),   target: join(CLAUDE_DIR, 'agents') },
};

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
 * Merge strategy: overwrites existing files but does NOT delete files
 * that are not in the source. Preserves user customizations.
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
    return { installed_at: null, version: null, files: {} };
  }
  const raw = readFileSync(MANIFEST_PATH, 'utf8');
  return parseYaml(raw);
}

/**
 * Save manifest to disk.
 */
function saveManifest(manifest) {
  mkdirSync(dirname(MANIFEST_PATH), { recursive: true });
  writeFileSync(MANIFEST_PATH, stringifyYaml(manifest), 'utf8');
}

/**
 * Install gomad assets to ./.claude/ in the current working directory.
 *
 * Flow:
 * 1. Run curator if no lockfile exists (or --preset provided)
 * 2. Copy assets from assets/ to ./.claude/ (merge strategy)
 * 3. Write manifest tracking what was installed
 *
 * @param {object} options - { preset?: string, yes?: boolean }
 */
export async function install(options = {}) {
  console.log(chalk.bold('\ngomad install\n'));

  // Step 1: Ensure we have selections (run curator if needed)
  let lockfile = loadLockfile();

  if (!lockfile) {
    const { curate } = await import('./curator.js');
    if (options.preset || options.yes) {
      await curate({
        preset: options.preset || 'full-stack',
        yes: options.yes || !!options.preset,
      });
    } else {
      await curate();
    }

    // Reload from disk since curate writes it
    lockfile = loadLockfile();

    if (!lockfile) {
      console.log(chalk.red('No selections made. Aborting.'));
      return;
    }
  }

  // Step 2: Check what content is available in assets/
  const hasAssetContent = Object.values(ASSET_DIRS).some(
    ({ src }) => existsSync(src) && readdirSync(src).length > 0
  );

  if (!hasAssetContent) {
    console.log(chalk.yellow('No asset content found in assets/. Nothing to install.'));
    return;
  }

  // Step 3: Install assets and build manifest
  const manifest = {
    installed_at: new Date().toISOString(),
    version: lockfile.version || '0.1.0',
    files: {},
  };

  let totalFiles = 0;

  for (const [assetType, { src, target }] of Object.entries(ASSET_DIRS)) {
    if (!existsSync(src) || readdirSync(src).length === 0) {
      console.log(chalk.dim(`  skip ${assetType} (no content)`));
      continue;
    }

    const files = installFiles(src, target);
    manifest.files[assetType] = files;
    totalFiles += files.length;
    console.log(chalk.green(`  installed ${files.length} ${assetType}`));
  }

  // Step 4: Save manifest
  saveManifest(manifest);
  console.log(chalk.dim(`  manifest -> ${relative(process.cwd(), MANIFEST_PATH)}`));

  console.log(chalk.bold.green(`\nInstalled ${totalFiles} files to ./.claude/\n`));
}

/**
 * Uninstall gomad assets from ./.claude/ using the manifest.
 * Only removes files listed in the manifest -- does NOT recursively
 * remove .claude/ (preserves user files).
 */
export function uninstall() {
  console.log(chalk.bold('\ngomad uninstall\n'));

  const manifest = loadManifest();

  if (!manifest.installed_at) {
    console.log(chalk.yellow('No gomad installation found. Nothing to uninstall.\n'));
    return;
  }

  const files = manifest.files || {};
  let removed = 0;

  for (const [assetType, fileList] of Object.entries(files)) {
    if (!Array.isArray(fileList) || fileList.length === 0) continue;

    const dirs = ASSET_DIRS[assetType];
    if (!dirs) continue;

    const { target } = dirs;
    let assetRemoved = 0;

    for (const file of fileList) {
      const filePath = join(target, file);
      if (existsSync(filePath)) {
        rmSync(filePath);
        assetRemoved++;
        removed++;
      }
    }

    console.log(chalk.green(`  removed ${assetRemoved} ${assetType} files`));
  }

  // Remove manifest
  if (existsSync(MANIFEST_PATH)) {
    rmSync(MANIFEST_PATH);
  }

  console.log(chalk.bold.green(`\nUninstalled ${removed} gomad files from ./.claude/\n`));
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
  console.log(`Location:  ${relative(process.cwd(), CLAUDE_DIR) || '.claude'}`);
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

  console.log();
}
