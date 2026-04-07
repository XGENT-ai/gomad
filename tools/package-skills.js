#!/usr/bin/env node

/**
 * Package skills from ~/.claude/skills/ into src/module/skills/
 * Creates BMAD-compatible skill directories with SKILL.md + skill-manifest.yaml
 *
 * Usage: node tools/package-skills.js [--preset <name>] [--lockfile]
 */

import {
  existsSync, mkdirSync, cpSync, readFileSync, writeFileSync,
  readdirSync, statSync, rmSync,
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
const SKILLS_SRC = join(CLAUDE_DIR, 'skills');
const MODULE_SKILLS = join(PROJECT_ROOT, 'src', 'module', 'skills');
const LOCKFILE_PATH = join(PROJECT_ROOT, 'gomad.lock.yaml');
const CATALOG_PATH = join(PROJECT_ROOT, 'catalog', 'skills.yaml');

/**
 * Parse SKILL.md frontmatter from a skill directory.
 * Returns { name, description } or null if not found.
 */
function parseSkillMd(skillDir) {
  const skillMdPath = join(skillDir, 'SKILL.md');
  if (!existsSync(skillMdPath)) return null;

  const content = readFileSync(skillMdPath, 'utf8');
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;

  try {
    const frontmatter = parseYaml(match[1]);
    return {
      name: frontmatter.name || null,
      description: frontmatter.description || null,
      body: content.slice(match[0].length).trim(),
    };
  } catch {
    return null;
  }
}

/**
 * Get catalog metadata for a skill by name.
 */
function getCatalogEntry(skillName, catalog) {
  return catalog.find((s) => s.name === skillName) || null;
}

/**
 * Package a single skill into src/module/skills/.
 *
 * For each skill:
 * 1. Copy the entire skill directory
 * 2. Ensure SKILL.md exists with valid frontmatter
 * 3. Create skill-manifest.yaml with canonicalId and module
 */
function packageSkill(skillName, catalogEntry) {
  const srcDir = join(SKILLS_SRC, skillName);
  if (!existsSync(srcDir)) {
    return { name: skillName, status: 'missing', reason: 'not found in ~/.claude/skills/' };
  }

  const destDir = join(MODULE_SKILLS, skillName);

  // Clean destination if exists
  if (existsSync(destDir)) {
    rmSync(destDir, { recursive: true, force: true });
  }

  // Check if source is a symlink or directory
  const stat = statSync(srcDir, { throwIfNoEntry: false });
  if (!stat) {
    return { name: skillName, status: 'missing', reason: 'stat failed' };
  }

  // Copy skill directory
  mkdirSync(destDir, { recursive: true });
  cpSync(srcDir, destDir, { recursive: true, dereference: true });

  // Parse existing SKILL.md
  const parsed = parseSkillMd(destDir);

  // Create SKILL.md if missing
  if (!parsed) {
    const desc = catalogEntry?.description || `${skillName} skill`;
    const skillMdContent = `---\nname: ${skillName}\ndescription: '${desc.replace(/'/g, "''")}'\n---\n\nFollow the instructions in ./workflow.md.\n`;
    writeFileSync(join(destDir, 'SKILL.md'), skillMdContent, 'utf8');
  }

  // Create skill-manifest.yaml
  const manifest = {
    canonicalId: `mob-${skillName}`,
    type: 'skill',
    module: 'mob',
    install_to_bmad: true,
    name: skillName,
    description: parsed?.description || catalogEntry?.description || skillName,
    category: catalogEntry?.category || 'tool',
  };

  writeFileSync(
    join(destDir, 'skill-manifest.yaml'),
    stringifyYaml(manifest),
    'utf8'
  );

  return { name: skillName, status: 'packaged' };
}

/**
 * Package all selected skills into src/module/skills/.
 */
export function packageSkills(options = {}) {
  console.log(chalk.bold('\ngomad package-skills\n'));

  // Load skill list from lockfile
  if (!existsSync(LOCKFILE_PATH)) {
    console.log(chalk.red('No lockfile found. Run `gomad curate` first.'));
    return;
  }

  const lockfile = parseYaml(readFileSync(LOCKFILE_PATH, 'utf8'));
  const selectedSkills = lockfile.skills || [];
  console.log(chalk.dim(`Using lockfile (${selectedSkills.length} skills)`));

  // Load catalog for metadata
  const catalog = existsSync(CATALOG_PATH)
    ? parseYaml(readFileSync(CATALOG_PATH, 'utf8')).skills || []
    : [];

  // Clean module skills directory
  if (existsSync(MODULE_SKILLS)) {
    rmSync(MODULE_SKILLS, { recursive: true, force: true });
  }
  mkdirSync(MODULE_SKILLS, { recursive: true });

  // Package each skill
  const results = [];
  for (const skillName of selectedSkills) {
    const catalogEntry = getCatalogEntry(skillName, catalog);
    const result = packageSkill(skillName, catalogEntry);
    results.push(result);
  }

  // Report
  const packaged = results.filter((r) => r.status === 'packaged');
  const missing = results.filter((r) => r.status === 'missing');

  console.log(chalk.green(`  packaged: ${packaged.length} skills`));
  if (missing.length > 0) {
    console.log(chalk.yellow(`  missing:  ${missing.length} skills`));
    for (const m of missing) {
      console.log(chalk.dim(`    - ${m.name}: ${m.reason}`));
    }
  }

  console.log(chalk.bold.green(`\nPackaged ${packaged.length} skills into src/module/skills/\n`));
  return { packaged: packaged.length, missing: missing.length, results };
}

// Allow direct execution
if (process.argv[1] === __filename) {
  packageSkills({ lockfile: true });
}
