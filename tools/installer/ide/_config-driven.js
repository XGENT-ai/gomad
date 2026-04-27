const os = require('node:os');
const path = require('node:path');
const fs = require('fs-extra');
const yaml = require('yaml');
const prompts = require('../prompts');
const csv = require('csv-parse/sync');
const { getProjectRoot } = require('../project-root');
const { GOMAD_FOLDER_NAME } = require('./shared/path-utils');
const { AgentCommandGenerator } = require('./shared/agent-command-generator');

// Best-effort signature match for well-known statusline plugins so the override
// prompt can show a friendly name. Order matters: first match wins. Returns
// null if nothing matches (the caller falls back to displaying the raw command).
const STATUSLINE_PLUGIN_SIGNATURES = [
  { match: /gsd-statusline/i, name: 'GSD statusline' },
  { match: /ccusage/i, name: 'ccusage' },
  { match: /cc-statusline/i, name: 'cc-statusline' },
  { match: /claude-?powerline/i, name: 'claude-powerline' },
];

function detectStatuslinePlugin(command) {
  if (!command || typeof command !== 'string') return null;
  for (const sig of STATUSLINE_PLUGIN_SIGNATURES) {
    if (sig.match.test(command)) return sig.name;
  }
  return null;
}

/**
 * Config-driven IDE setup handler
 *
 * This class provides a standardized way to install GOMAD artifacts to IDEs
 * based on configuration in platform-codes.yaml. It eliminates the need for
 * individual installer files for each IDE.
 *
 * Features:
 * - Config-driven from platform-codes.yaml
 * - Verbatim skill installation from skill-manifest.csv
 * - Legacy directory cleanup and IDE-specific marker removal
 */
class ConfigDrivenIdeSetup {
  constructor(platformCode, platformConfig) {
    this.name = platformCode;
    this.displayName = platformConfig.name || platformCode;
    this.preferred = platformConfig.preferred || false;
    this.platformConfig = platformConfig;
    this.installerConfig = platformConfig.installer || null;
    this.gomadFolderName = GOMAD_FOLDER_NAME;

    // Set configDir from target_dir so detect() works
    this.configDir = this.installerConfig?.target_dir || null;
  }

  setBmadFolderName(gomadFolderName) {
    this.gomadFolderName = gomadFolderName;
  }

  /**
   * Detect whether this IDE already has configuration in the project.
   * Checks for gomad-prefixed entries in target_dir.
   * @param {string} projectDir - Project directory
   * @returns {Promise<boolean>}
   */
  async detect(projectDir) {
    if (!this.configDir) return false;

    const dir = path.join(projectDir || process.cwd(), this.configDir);
    if (await fs.pathExists(dir)) {
      try {
        const entries = await fs.readdir(dir);
        return entries.some((e) => typeof e === 'string' && e.startsWith('gomad'));
      } catch {
        return false;
      }
    }
    return false;
  }

  /**
   * Main setup method - called by IdeManager
   * @param {string} projectDir - Project directory
   * @param {string} gomadDir - GOMAD installation directory
   * @param {Object} options - Setup options
   * @returns {Promise<Object>} Setup result
   */
  async setup(projectDir, gomadDir, options = {}) {
    // Check for GOMAD files in ancestor directories that would cause duplicates
    if (this.installerConfig?.ancestor_conflict_check) {
      const conflict = await this.findAncestorConflict(projectDir);
      if (conflict) {
        await prompts.log.error(
          `Found existing GOMAD skills in ancestor installation: ${conflict}\n` +
            `  ${this.name} inherits skills from parent directories, so this would cause duplicates.\n` +
            `  Please remove the GOMAD files from that directory first:\n` +
            `    rm -rf "${conflict}"/gomad*`,
        );
        return {
          success: false,
          reason: 'ancestor-conflict',
          error: `Ancestor conflict: ${conflict}`,
          conflictDir: conflict,
        };
      }
    }

    if (!options.silent) await prompts.log.info(`Setting up ${this.name}...`);

    // Clean up any old GOMAD installation first
    await this.cleanup(projectDir, options);

    if (!this.installerConfig) {
      return { success: false, reason: 'no-config' };
    }

    if (this.installerConfig.target_dir) {
      return this.installToTarget(projectDir, gomadDir, this.installerConfig, options);
    }

    return { success: false, reason: 'invalid-config' };
  }

  /**
   * Install to a single target directory
   * @param {string} projectDir - Project directory
   * @param {string} gomadDir - GOMAD installation directory
   * @param {Object} config - Installation configuration
   * @param {Object} options - Setup options
   * @returns {Promise<Object>} Installation result
   */
  async installToTarget(projectDir, gomadDir, config, options) {
    const { target_dir } = config;
    const targetPath = path.join(projectDir, target_dir);
    await fs.ensureDir(targetPath);

    this.skillWriteTracker = new Set();
    const results = { skills: 0 };

    results.skills = await this.installVerbatimSkills(projectDir, gomadDir, targetPath, config);
    results.skillDirectories = this.skillWriteTracker.size;

    // Phase 6 (D-28/D-29/D-31): For Claude Code (or any IDE that sets launcher_target_dir
    // in platform-codes.yaml), write 7 launcher files flat under launcher_target_dir and
    // remove any legacy .claude/skills/gm-agent-*/ directories atomically. All files
    // produced are pushed into the trackInstalledFile callback so the post-IDE manifest
    // refresh in installer.js includes them with install_root derived from target.
    if (config.launcher_target_dir) {
      const launcherGen = new AgentCommandGenerator(this.gomadFolderName);
      const launcherDir = path.join(projectDir, config.launcher_target_dir);

      // D-29: remove legacy v1.1 .claude/skills/gm-agent-*/ dirs atomically (no overlap window)
      const removed = await launcherGen.removeLegacyAgentSkillDirs(projectDir);
      if (removed.length > 0) {
        await prompts.log.info(`Removed ${removed.length} legacy gm-agent-* skill dir(s)`);
      }

      // D-31: write 7 flat launchers at launcher_target_dir/agent-<shortName>.md
      const launcherPaths = await launcherGen.writeAgentLaunchers(launcherDir, projectDir);
      if (options.trackInstalledFile) {
        for (const p of launcherPaths) {
          options.trackInstalledFile(p);
        }
      }
      results.launchers = launcherPaths.length;
    }

    // Quick task 260427-k86: gomad-flavored Claude Code statusline.
    // Drop a Node hook into <projectDir>/<hooks_target_dir>/ and merge a
    // `statusLine` entry into `.claude/settings.json` non-destructively.
    // Only claude-code carries the `statusline` config block today.
    if (config.statusline) {
      const installed = await this.installStatusline(projectDir, config, options);
      if (installed) results.statusline = true;
    }

    // Active-persona tracker — installs a Claude Code hook that captures
    // /gm:agent-<short> invocations on UserPromptSubmit and resets on
    // SessionStart / SessionEnd. The statusline reads its state file.
    if (config.agent_tracker) {
      const installed = await this.installAgentTracker(projectDir, config, options);
      if (installed) results.agentTracker = true;
    }

    await this.printSummary(results, target_dir, options);
    this.skillWriteTracker = null;
    return { success: true, results };
  }

  /**
   * Copy the gomad statusline hook into <projectDir>/<hooks_target_dir>/ and
   * register it under `statusLine` in <settings_file>. Defensive about
   * pre-existing third-party statuslines (won't stomp them) and missing
   * source assets (silently skips for tarball edge cases).
   *
   * Quick task 260427-k86.
   *
   * @param {string} projectDir - Project root
   * @param {Object} config - installer config block (must have statusline + hooks_target_dir)
   * @param {Object} options - { silent, trackInstalledFile }
   * @returns {Promise<boolean>} true if the hook was actually copied
   */
  async installStatusline(projectDir, config, options = {}) {
    const { hooks_target_dir, statusline } = config;
    if (!hooks_target_dir || !statusline?.source || !statusline?.dest_name) return false;

    // Resolve source against the gomad source repo (npm-pack root or live repo).
    const gomadSrcRoot = getProjectRoot();
    const srcFile = path.join(gomadSrcRoot, statusline.source);
    if (!(await fs.pathExists(srcFile))) {
      // Tarball edge case — asset not shipped. Silent skip.
      return false;
    }

    const destDir = path.join(projectDir, hooks_target_dir);
    const destFile = path.join(destDir, statusline.dest_name);
    await fs.ensureDir(destDir);
    await fs.copy(srcFile, destFile, { overwrite: true });
    try {
      await fs.chmod(destFile, 0o755);
    } catch {
      // Some filesystems (Windows) can't chmod — harmless.
    }
    options.trackInstalledFile?.(destFile);

    // Settings merge.
    const settingsFile = statusline.settings_file ? path.join(projectDir, statusline.settings_file) : null;
    if (settingsFile) {
      let parsed = {};
      let exists = false;
      if (await fs.pathExists(settingsFile)) {
        exists = true;
        try {
          const raw = await fs.readFile(settingsFile, 'utf8');
          parsed = raw.trim() ? JSON.parse(raw) : {};
          if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
            // settings.json must be a JSON object — bail without touching.
            if (!options.silent) {
              await prompts.log.warn(`  Could not merge ${statusline.settings_file}: not a JSON object — skipping statusline registration`);
            }
            return true;
          }
        } catch {
          if (!options.silent) {
            await prompts.log.warn(`  Could not parse ${statusline.settings_file} — skipping statusline registration`);
          }
          return true;
        }
      }

      // Detect third-party statuslines and ask before overriding.
      const existingCmd = parsed.statusLine?.command;
      const isThirdParty = existingCmd && typeof existingCmd === 'string' && !existingCmd.includes(statusline.dest_name);

      let shouldWrite = !isThirdParty;
      if (isThirdParty) {
        const detectedName = detectStatuslinePlugin(existingCmd);
        const label = detectedName ? `${detectedName} (${existingCmd})` : existingCmd;
        // Test/automation hook: deterministic override decision skips the prompt.
        // Silent installs default to preserving the existing entry — never prompt.
        if (typeof options.overrideExistingStatusline === 'boolean') {
          shouldWrite = options.overrideExistingStatusline;
          if (!options.silent) {
            await prompts.log.warn(
              shouldWrite
                ? `  Existing statusLine: ${label} — overriding (--override-statusline)`
                : `  Existing statusLine: ${label} — left untouched`,
            );
          }
        } else if (options.silent) {
          await prompts.log.warn(`  Existing statusLine: ${label} — left untouched (silent mode)`);
        } else {
          await prompts.log.warn(`  Found existing statusLine: ${label}`);
          shouldWrite = await prompts.confirm({
            message: `Override existing statusLine in ${statusline.settings_file} with the gomad statusline?`,
            default: false,
          });
          if (!shouldWrite) {
            await prompts.log.message(`  Keeping existing statusLine — gomad-statusline.js still copied to ${hooks_target_dir}/`);
          }
        }
      }

      if (shouldWrite) {
        parsed.statusLine = {
          type: 'command',
          command: `node "$CLAUDE_PROJECT_DIR"/${hooks_target_dir}/${statusline.dest_name}`,
          padding: 0,
        };
        await fs.ensureDir(path.dirname(settingsFile));
        await fs.writeFile(settingsFile, JSON.stringify(parsed, null, 2) + '\n', 'utf8');
        // Track the settings file too so manifest cleanup knows about it.
        // (For pre-existing settings.json we still track — uninstall only
        // removes our `statusLine` key, not the file.)
        options.trackInstalledFile?.(settingsFile);
        if (!exists && !options.silent) {
          await prompts.log.message(`  Created ${statusline.settings_file} with statusLine entry`);
        }
      }
    }

    if (!options.silent) {
      await prompts.log.success(`Claude Code statusline installed → ${hooks_target_dir}/${statusline.dest_name}`);
    }
    return true;
  }

  /**
   * Copy the gomad-agent-tracker.js hook and register it under each requested
   * `hooks.<EventName>` entry in `.claude/settings.json`. Additive merge —
   * preserves any non-gomad hook entries the user had configured.
   *
   * Identifying our entries on uninstall: the command string contains the
   * tracker's dest_name (e.g. `gomad-agent-tracker.js`), which is gomad-specific.
   *
   * @param {string} projectDir
   * @param {Object} config - installer config block (must have agent_tracker + hooks_target_dir)
   * @param {Object} options - { silent, trackInstalledFile }
   * @returns {Promise<boolean>}
   */
  async installAgentTracker(projectDir, config, options = {}) {
    const { hooks_target_dir, agent_tracker } = config;
    if (!hooks_target_dir || !agent_tracker?.source || !agent_tracker?.dest_name) return false;
    const events = Array.isArray(agent_tracker.events) ? agent_tracker.events : [];
    if (events.length === 0) return false;

    const gomadSrcRoot = getProjectRoot();
    const srcFile = path.join(gomadSrcRoot, agent_tracker.source);
    if (!(await fs.pathExists(srcFile))) return false;

    const destDir = path.join(projectDir, hooks_target_dir);
    const destFile = path.join(destDir, agent_tracker.dest_name);
    await fs.ensureDir(destDir);
    await fs.copy(srcFile, destFile, { overwrite: true });
    try {
      await fs.chmod(destFile, 0o755);
    } catch {
      // Windows — harmless.
    }
    options.trackInstalledFile?.(destFile);

    if (!agent_tracker.settings_file) {
      if (!options.silent) {
        await prompts.log.success(`Claude Code agent tracker installed → ${hooks_target_dir}/${agent_tracker.dest_name}`);
      }
      return true;
    }

    const settingsFile = path.join(projectDir, agent_tracker.settings_file);
    let parsed = {};
    if (await fs.pathExists(settingsFile)) {
      try {
        const raw = await fs.readFile(settingsFile, 'utf8');
        parsed = raw.trim() ? JSON.parse(raw) : {};
        if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
          if (!options.silent) {
            await prompts.log.warn(`  Could not merge ${agent_tracker.settings_file}: not a JSON object — skipping tracker registration`);
          }
          return true;
        }
      } catch {
        if (!options.silent) {
          await prompts.log.warn(`  Could not parse ${agent_tracker.settings_file} — skipping tracker registration`);
        }
        return true;
      }
    }

    if (!parsed.hooks || typeof parsed.hooks !== 'object' || Array.isArray(parsed.hooks)) {
      parsed.hooks = {};
    }

    const command = `node "$CLAUDE_PROJECT_DIR"/${hooks_target_dir}/${agent_tracker.dest_name}`;

    for (const event of events) {
      if (!Array.isArray(parsed.hooks[event])) parsed.hooks[event] = [];
      const groups = parsed.hooks[event];

      // Skip if any existing entry already invokes our tracker (re-install / idempotent).
      const alreadyRegistered = groups.some(
        (group) =>
          Array.isArray(group?.hooks) &&
          group.hooks.some((h) => typeof h?.command === 'string' && h.command.includes(agent_tracker.dest_name)),
      );
      if (alreadyRegistered) continue;

      groups.push({ hooks: [{ type: 'command', command, timeout: 5 }] });
    }

    await fs.ensureDir(path.dirname(settingsFile));
    await fs.writeFile(settingsFile, JSON.stringify(parsed, null, 2) + '\n', 'utf8');
    options.trackInstalledFile?.(settingsFile);

    if (!options.silent) {
      await prompts.log.success(
        `Claude Code agent tracker installed → ${hooks_target_dir}/${agent_tracker.dest_name} (${events.join(', ')})`,
      );
    }
    return true;
  }

  /**
   * Reverse of installAgentTracker: remove the hook file and strip our
   * tracker entries from each `hooks.<EventName>` array in settings.json.
   * Identifies our entries by `command` containing dest_name.
   */
  async cleanupAgentTracker(projectDir, options = {}) {
    const installerCfg = this.installerConfig || {};
    const { hooks_target_dir, agent_tracker } = installerCfg;
    if (!hooks_target_dir || !agent_tracker?.dest_name) return;

    const destDir = path.join(projectDir, hooks_target_dir);
    const destFile = path.join(destDir, agent_tracker.dest_name);
    if (await fs.pathExists(destFile)) {
      try {
        await fs.remove(destFile);
      } catch {
        // Best-effort.
      }
    }

    if (!agent_tracker.settings_file) return;
    const settingsFile = path.join(projectDir, agent_tracker.settings_file);
    if (!(await fs.pathExists(settingsFile))) return;

    let parsed;
    try {
      const raw = await fs.readFile(settingsFile, 'utf8');
      parsed = raw.trim() ? JSON.parse(raw) : {};
      if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return;
    } catch {
      return;
    }

    if (!parsed.hooks || typeof parsed.hooks !== 'object') return;

    let mutated = false;
    for (const [event, groups] of Object.entries(parsed.hooks)) {
      if (!Array.isArray(groups)) continue;
      const filteredGroups = [];
      for (const group of groups) {
        if (!group || !Array.isArray(group.hooks)) {
          filteredGroups.push(group);
          continue;
        }
        const remaining = group.hooks.filter(
          (h) => !(typeof h?.command === 'string' && h.command.includes(agent_tracker.dest_name)),
        );
        if (remaining.length === 0) {
          mutated = true;
          continue; // Drop the entire group — it was only ours.
        }
        if (remaining.length === group.hooks.length) {
          filteredGroups.push(group);
        } else {
          mutated = true;
          filteredGroups.push({ ...group, hooks: remaining });
        }
      }
      if (filteredGroups.length === 0) {
        delete parsed.hooks[event];
        mutated = true;
      } else {
        parsed.hooks[event] = filteredGroups;
      }
    }

    if (Object.keys(parsed.hooks).length === 0) {
      delete parsed.hooks;
      mutated = true;
    }

    if (mutated) {
      try {
        await fs.writeFile(settingsFile, JSON.stringify(parsed, null, 2) + '\n', 'utf8');
      } catch {
        // Silent.
      }
    }

    if (!options.silent) {
      await prompts.log.message(`  Removed gomad agent-tracker hooks from ${agent_tracker.settings_file}`);
    }
  }

  /**
   * Install verbatim native SKILL.md directories from skill-manifest.csv.
   * Copies the entire source directory as-is into the IDE skill directory.
   * The source SKILL.md is used directly — no frontmatter transformation or file generation.
   * @param {string} projectDir - Project directory
   * @param {string} gomadDir - GOMAD installation directory
   * @param {string} targetPath - Target skills directory
   * @param {Object} config - Installation configuration
   * @returns {Promise<number>} Count of skills installed
   */
  async installVerbatimSkills(projectDir, gomadDir, targetPath, config) {
    const gomadFolderName = path.basename(gomadDir);
    const gomadPrefix = gomadFolderName + '/';
    const csvPath = path.join(gomadDir, '_config', 'skill-manifest.csv');

    if (!(await fs.pathExists(csvPath))) return 0;

    const csvContent = await fs.readFile(csvPath, 'utf8');
    const records = csv.parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
    });

    // D-22: symlink-leftover pre-check runs ONLY on re-install (v1.1 manifest present).
    // Fresh installs skip the lstat entirely — nothing to leftover-handle.
    const filesManifestPath = path.join(gomadDir, '_config', 'files-manifest.csv');
    const isReinstall = await fs.pathExists(filesManifestPath);

    let count = 0;

    for (const record of records) {
      const canonicalId = record.canonicalId;
      if (!canonicalId) continue;

      // Derive source directory from path column
      // path is like "_gomad/agile/workflows/gomad-quick-flow/gomad-quick-dev-new-preview/SKILL.md"
      // Strip gomadFolderName prefix and join with gomadDir, then get dirname
      const relativePath = record.path.startsWith(gomadPrefix) ? record.path.slice(gomadPrefix.length) : record.path;
      const sourceFile = path.join(gomadDir, relativePath);
      const sourceDir = path.dirname(sourceFile);

      if (!(await fs.pathExists(sourceDir))) continue;

      // D-19/D-20/D-22: copy-only install (no symlinks). On re-install, if the
      // destination is a symlink from a v1.1 install, unlink it first so fs.copy
      // writes through into targetPath (not back through the symlink into the source tree).
      const skillDir = path.join(targetPath, canonicalId);
      if (isReinstall && (await fs.pathExists(skillDir))) {
        const destStat = await fs.lstat(skillDir);
        if (destStat.isSymbolicLink()) {
          await prompts.log.info(`upgrading from symlink: ${skillDir}`);
          await fs.unlink(skillDir);
        }
      }
      await fs.remove(skillDir);
      this.skillWriteTracker?.add(canonicalId);

      // D-19: universal copy (applies to every IDE — no per-IDE gate).
      // sourceDir is the live source under gomadDir; copy into targetPath as real files.
      await fs.copy(sourceDir, skillDir);

      count++;
    }

    // Post-install cleanup: remove _gomad/ directories for skills with install_to_gomad === "false"
    for (const record of records) {
      if (record.install_to_gomad === 'false') {
        const relativePath = record.path.startsWith(gomadPrefix) ? record.path.slice(gomadPrefix.length) : record.path;
        const sourceFile = path.join(gomadDir, relativePath);
        const sourceDir = path.dirname(sourceFile);
        if (await fs.pathExists(sourceDir)) {
          await fs.remove(sourceDir);
        }
      }
    }

    return count;
  }

  /**
   * Print installation summary
   * @param {Object} results - Installation results
   * @param {string} targetDir - Target directory (relative)
   */
  async printSummary(results, targetDir, options = {}) {
    if (options.silent) return;
    const count = results.skillDirectories || results.skills || 0;
    if (count > 0) {
      await prompts.log.success(`${this.name} configured: ${count} skills → ${targetDir}`);
    }
    if (results.launchers > 0) {
      await prompts.log.success(
        `${this.name} launchers configured: ${results.launchers} agents → ${this.installerConfig?.launcher_target_dir}`,
      );
    }
  }

  /**
   * Cleanup IDE configuration
   * @param {string} projectDir - Project directory
   */
  async cleanup(projectDir, options = {}) {
    // Quick task 260427-k86: tear down the gomad statusline first so
    // anything below (legacy_targets, target_dir wipe) doesn't leave
    // dangling references in `.claude/settings.json`.
    if (this.installerConfig?.statusline && this.name === 'claude-code') {
      await this.cleanupStatusline(projectDir, options);
    }

    if (this.installerConfig?.agent_tracker && this.name === 'claude-code') {
      await this.cleanupAgentTracker(projectDir, options);
    }

    // Migrate legacy target directories (e.g. .opencode/agent → .opencode/agents)
    if (this.installerConfig?.legacy_targets) {
      if (!options.silent) await prompts.log.message('  Migrating legacy directories...');
      for (const legacyDir of this.installerConfig.legacy_targets) {
        if (this.isGlobalPath(legacyDir)) {
          await this.warnGlobalLegacy(legacyDir, options);
        } else {
          await this.cleanupTarget(projectDir, legacyDir, options);
          await this.removeEmptyParents(projectDir, legacyDir);
        }
      }
    }

    // Strip GOMAD markers from copilot-instructions.md if present
    if (this.name === 'github-copilot') {
      await this.cleanupCopilotInstructions(projectDir, options);
    }

    // Strip GOMAD modes from .kilocodemodes if present
    if (this.name === 'kilo') {
      await this.cleanupKiloModes(projectDir, options);
    }

    // Strip GOMAD entries from .rovodev/prompts.yml if present
    if (this.name === 'rovo-dev') {
      await this.cleanupRovoDevPrompts(projectDir, options);
    }

    // Clean target directory
    if (this.installerConfig?.target_dir) {
      await this.cleanupTarget(projectDir, this.installerConfig.target_dir, options);
    }
  }

  /**
   * Reverse of installStatusline: remove the hook file and strip our
   * `statusLine` entry from settings.json. Defensive — only touches
   * a `statusLine` block whose command actually references our hook.
   *
   * Quick task 260427-k86.
   *
   * @param {string} projectDir - Project root
   * @param {Object} options - { silent }
   */
  async cleanupStatusline(projectDir, options = {}) {
    const cfg = this.installerConfig?.statusline;
    const hooks_target_dir = this.installerConfig?.hooks_target_dir;
    if (!cfg || !cfg.dest_name || !hooks_target_dir) return;

    const hookFile = path.join(projectDir, hooks_target_dir, cfg.dest_name);
    let removed = false;
    if (await fs.pathExists(hookFile)) {
      try {
        await fs.remove(hookFile);
        removed = true;
      } catch {
        // Best-effort — keep going.
      }
    }

    // Strip our statusLine from settings.json if it's still ours.
    if (cfg.settings_file) {
      const settingsFile = path.join(projectDir, cfg.settings_file);
      if (await fs.pathExists(settingsFile)) {
        try {
          const raw = await fs.readFile(settingsFile, 'utf8');
          const parsed = raw.trim() ? JSON.parse(raw) : {};
          if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            const cmd = parsed.statusLine?.command;
            if (typeof cmd === 'string' && cmd.includes(cfg.dest_name)) {
              delete parsed.statusLine;
              await fs.writeFile(settingsFile, JSON.stringify(parsed, null, 2) + '\n', 'utf8');
            }
          }
        } catch {
          // Bad JSON — leave the user's file alone.
        }
      }
    }

    // Best-effort: rmdir hooks_target_dir if it's now empty.
    if (removed) {
      const hooksDir = path.join(projectDir, hooks_target_dir);
      try {
        const remaining = await fs.readdir(hooksDir);
        if (remaining.length === 0) await fs.rmdir(hooksDir);
      } catch {
        // Dir gone or non-empty — ignore.
      }
    }

    if (removed && !options.silent) {
      await prompts.log.message(`  Removed Claude Code statusline (${hooks_target_dir}/${cfg.dest_name})`);
    }
  }

  /**
   * Check if a path is global (starts with ~ or is absolute)
   * @param {string} p - Path to check
   * @returns {boolean}
   */
  isGlobalPath(p) {
    return p.startsWith('~') || path.isAbsolute(p);
  }

  /**
   * Warn about stale GOMAD files in a global legacy directory (never auto-deletes)
   * @param {string} legacyDir - Legacy directory path (may start with ~)
   * @param {Object} options - Options (silent, etc.)
   */
  async warnGlobalLegacy(legacyDir, options = {}) {
    try {
      const expanded = legacyDir.startsWith('~/')
        ? path.join(os.homedir(), legacyDir.slice(2))
        : legacyDir === '~'
          ? os.homedir()
          : legacyDir;

      if (!(await fs.pathExists(expanded))) return;

      const entries = await fs.readdir(expanded);
      const gomadFiles = entries.filter((e) => typeof e === 'string' && e.startsWith('gomad'));

      if (gomadFiles.length > 0 && !options.silent) {
        await prompts.log.warn(`Found ${gomadFiles.length} stale GOMAD file(s) in ${expanded}. Remove manually: rm ${expanded}/gomad-*`);
      }
    } catch {
      // Errors reading global paths are silently ignored
    }
  }

  /**
   * Cleanup a specific target directory
   * @param {string} projectDir - Project directory
   * @param {string} targetDir - Target directory to clean
   */
  async cleanupTarget(projectDir, targetDir, options = {}) {
    const targetPath = path.join(projectDir, targetDir);

    if (!(await fs.pathExists(targetPath))) {
      return;
    }

    // Remove all gomad* files
    let entries;
    try {
      entries = await fs.readdir(targetPath);
    } catch {
      // Directory exists but can't be read - skip cleanup
      return;
    }

    if (!entries || !Array.isArray(entries)) {
      return;
    }

    let removedCount = 0;

    for (const entry of entries) {
      if (!entry || typeof entry !== 'string') {
        continue;
      }
      if (entry.startsWith('gomad') && !entry.startsWith('gomad-os-')) {
        const entryPath = path.join(targetPath, entry);
        try {
          await fs.remove(entryPath);
          removedCount++;
        } catch {
          // Skip entries that can't be removed (broken symlinks, permission errors)
        }
      }
    }

    if (removedCount > 0 && !options.silent) {
      await prompts.log.message(`  Cleaned ${removedCount} GOMAD files from ${targetDir}`);
    }

    // Remove empty directory after cleanup
    if (removedCount > 0) {
      try {
        const remaining = await fs.readdir(targetPath);
        if (remaining.length === 0) {
          await fs.remove(targetPath);
        }
      } catch {
        // Directory may already be gone or in use — skip
      }
    }
  }

  /**
   * Strip GOMAD-owned content from .github/copilot-instructions.md.
   * The old custom installer injected content between <!-- GOMAD:START --> and <!-- GOMAD:END --> markers.
   * Deletes the file if nothing remains. Restores .bak backup if one exists.
   */
  async cleanupCopilotInstructions(projectDir, options = {}) {
    const filePath = path.join(projectDir, '.github', 'copilot-instructions.md');

    if (!(await fs.pathExists(filePath))) return;

    try {
      const content = await fs.readFile(filePath, 'utf8');
      const startIdx = content.indexOf('<!-- GOMAD:START -->');
      const endIdx = content.indexOf('<!-- GOMAD:END -->');

      if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) return;

      const cleaned = content.slice(0, startIdx) + content.slice(endIdx + '<!-- GOMAD:END -->'.length);

      if (cleaned.trim().length === 0) {
        await fs.remove(filePath);
        const backupPath = `${filePath}.bak`;
        if (await fs.pathExists(backupPath)) {
          await fs.rename(backupPath, filePath);
          if (!options.silent) await prompts.log.message('  Restored copilot-instructions.md from backup');
        }
      } else {
        await fs.writeFile(filePath, cleaned, 'utf8');
        const backupPath = `${filePath}.bak`;
        if (await fs.pathExists(backupPath)) await fs.remove(backupPath);
      }

      if (!options.silent) await prompts.log.message('  Cleaned GOMAD markers from copilot-instructions.md');
    } catch {
      if (!options.silent) await prompts.log.warn('  Warning: Could not clean GOMAD markers from copilot-instructions.md');
    }
  }

  /**
   * Strip GOMAD-owned modes from .kilocodemodes.
   * The old custom kilo.js installer added modes with slug starting with 'gomad-'.
   * Parses YAML, filters out GOMAD modes, rewrites. Leaves file as-is on parse failure.
   */
  async cleanupKiloModes(projectDir, options = {}) {
    const kiloModesPath = path.join(projectDir, '.kilocodemodes');

    if (!(await fs.pathExists(kiloModesPath))) return;

    const content = await fs.readFile(kiloModesPath, 'utf8');

    let config;
    try {
      config = yaml.parse(content) || {};
    } catch {
      if (!options.silent) await prompts.log.warn('  Warning: Could not parse .kilocodemodes for cleanup');
      return;
    }

    if (!Array.isArray(config.customModes)) return;

    const originalCount = config.customModes.length;
    config.customModes = config.customModes.filter((mode) => mode && (!mode.slug || !mode.slug.startsWith('gomad-')));
    const removedCount = originalCount - config.customModes.length;

    if (removedCount > 0) {
      try {
        await fs.writeFile(kiloModesPath, yaml.stringify(config, { lineWidth: 0 }));
        if (!options.silent) await prompts.log.message(`  Removed ${removedCount} GOMAD modes from .kilocodemodes`);
      } catch {
        if (!options.silent) await prompts.log.warn('  Warning: Could not write .kilocodemodes during cleanup');
      }
    }
  }

  /**
   * Strip GOMAD-owned entries from .rovodev/prompts.yml.
   * The old custom rovodev.js installer registered workflows in prompts.yml.
   * Parses YAML, filters out entries with name starting with 'gomad-', rewrites.
   * Removes the file if no entries remain.
   */
  async cleanupRovoDevPrompts(projectDir, options = {}) {
    const promptsPath = path.join(projectDir, '.rovodev', 'prompts.yml');

    if (!(await fs.pathExists(promptsPath))) return;

    const content = await fs.readFile(promptsPath, 'utf8');

    let config;
    try {
      config = yaml.parse(content) || {};
    } catch {
      if (!options.silent) await prompts.log.warn('  Warning: Could not parse prompts.yml for cleanup');
      return;
    }

    if (!Array.isArray(config.prompts)) return;

    const originalCount = config.prompts.length;
    config.prompts = config.prompts.filter((entry) => entry && (!entry.name || !entry.name.startsWith('gomad-')));
    const removedCount = originalCount - config.prompts.length;

    if (removedCount > 0) {
      try {
        if (config.prompts.length === 0) {
          await fs.remove(promptsPath);
        } else {
          await fs.writeFile(promptsPath, yaml.stringify(config, { lineWidth: 0 }));
        }
        if (!options.silent) await prompts.log.message(`  Removed ${removedCount} GOMAD entries from prompts.yml`);
      } catch {
        if (!options.silent) await prompts.log.warn('  Warning: Could not write prompts.yml during cleanup');
      }
    }
  }

  /**
   * Check ancestor directories for existing GOMAD files in the same target_dir.
   * IDEs like Claude Code inherit commands from parent directories, so an existing
   * installation in an ancestor would cause duplicate commands.
   * @param {string} projectDir - Project directory being installed to
   * @returns {Promise<string|null>} Path to conflicting directory, or null if clean
   */
  async findAncestorConflict(projectDir) {
    const targetDir = this.installerConfig?.target_dir;
    if (!targetDir) return null;

    const resolvedProject = await fs.realpath(path.resolve(projectDir));
    let current = path.dirname(resolvedProject);
    const root = path.parse(current).root;

    while (current !== root && current.length > root.length) {
      const candidatePath = path.join(current, targetDir);
      try {
        if (await fs.pathExists(candidatePath)) {
          const entries = await fs.readdir(candidatePath);
          const hasBmad = entries.some(
            (e) => typeof e === 'string' && e.toLowerCase().startsWith('gomad') && !e.toLowerCase().startsWith('gomad-os-'),
          );
          if (hasBmad) {
            return candidatePath;
          }
        }
      } catch {
        // Can't read directory — skip
      }
      current = path.dirname(current);
    }

    return null;
  }

  /**
   * Walk up ancestor directories from relativeDir toward projectDir, removing each if empty
   * Stops at projectDir boundary — never removes projectDir itself
   * @param {string} projectDir - Project root (boundary)
   * @param {string} relativeDir - Relative directory to start from
   */
  async removeEmptyParents(projectDir, relativeDir) {
    const resolvedProject = path.resolve(projectDir);
    let current = relativeDir;
    let last = null;
    while (current && current !== '.' && current !== last) {
      last = current;
      const fullPath = path.resolve(projectDir, current);
      // Boundary guard: never traverse outside projectDir
      if (!fullPath.startsWith(resolvedProject + path.sep) && fullPath !== resolvedProject) break;
      try {
        if (!(await fs.pathExists(fullPath))) {
          // Dir already gone — advance current; last is reset at top of next iteration
          current = path.dirname(current);
          continue;
        }
        const remaining = await fs.readdir(fullPath);
        if (remaining.length > 0) break;
        await fs.rmdir(fullPath);
      } catch (error) {
        // ENOTEMPTY: TOCTOU race (file added between readdir and rmdir) — skip level, continue upward
        // ENOENT: dir removed by another process between pathExists and rmdir — skip level, continue upward
        if (error.code === 'ENOTEMPTY' || error.code === 'ENOENT') {
          current = path.dirname(current);
          continue;
        }
        break; // fatal error (e.g. EACCES) — stop upward walk
      }
      current = path.dirname(current);
    }
  }
}

module.exports = { ConfigDrivenIdeSetup };
