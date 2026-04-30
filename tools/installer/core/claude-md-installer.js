const path = require('node:path');
const fs = require('fs-extra');
const { getProjectRoot } = require('../project-root');

const FENCE_START = '<!-- gomad:start -->';
const FENCE_END = '<!-- gomad:end -->';
const TEMPLATE_REL_PATH = path.join('tools', 'installer', 'assets', 'CLAUDE.md.template');

/**
 * Splice the gomad-fenced block into a CLAUDE.md file at projectDir.
 *
 * Behavior:
 *  - File missing                    → create with the template (single block).
 *  - File present, fence found       → replace just the fenced block, preserving content
 *                                      before and after the fence.
 *  - File present, no fence          → append the fenced block at the end (newline-separated).
 *
 * Returns one of: 'created' | 'replaced' | 'appended' | 'skipped'.
 *
 * @param {string} projectDir - User's project root.
 * @param {object} [options]
 * @param {string} [options.gomadSrcRoot] - Override gomad source root (test seam).
 * @param {boolean} [options.silent]      - Suppress info logs.
 * @param {(file: string) => void} [options.trackInstalledFile] - Manifest tracker.
 * @param {(message: string) => Promise<void>} [options.logInfo] - Optional logger.
 */
async function installClaudeMdGuidelines(projectDir, options = {}) {
  const gomadSrcRoot = options.gomadSrcRoot || getProjectRoot();
  const templatePath = path.join(gomadSrcRoot, TEMPLATE_REL_PATH);

  if (!(await fs.pathExists(templatePath))) {
    return 'skipped';
  }

  const block = (await fs.readFile(templatePath, 'utf8')).replace(/\s+$/, '');
  const destFile = path.join(projectDir, 'CLAUDE.md');

  if (!(await fs.pathExists(destFile))) {
    await fs.writeFile(destFile, block + '\n', 'utf8');
    options.trackInstalledFile?.(destFile);
    if (!options.silent) {
      await options.logInfo?.(`  Created CLAUDE.md (gomad behavioral-guidelines block)`);
    }
    return 'created';
  }

  const existing = await fs.readFile(destFile, 'utf8');
  const startIdx = existing.indexOf(FENCE_START);
  const endIdx = existing.indexOf(FENCE_END);

  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    const before = existing.slice(0, startIdx);
    const after = existing.slice(endIdx + FENCE_END.length);
    const updated = before + block + after;
    if (updated === existing) return 'skipped';
    await fs.writeFile(destFile, updated, 'utf8');
    if (!options.silent) {
      await options.logInfo?.(`  Updated CLAUDE.md (replaced gomad block)`);
    }
    return 'replaced';
  }

  const separator = existing.endsWith('\n') ? '\n' : '\n\n';
  const appended = existing + separator + block + '\n';
  await fs.writeFile(destFile, appended, 'utf8');
  if (!options.silent) {
    await options.logInfo?.(`  Updated CLAUDE.md (appended gomad block — no fence found)`);
  }
  return 'appended';
}

module.exports = {
  installClaudeMdGuidelines,
  FENCE_START,
  FENCE_END,
  TEMPLATE_REL_PATH,
};
