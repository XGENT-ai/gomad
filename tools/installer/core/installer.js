const path = require('node:path');
const fs = require('fs-extra');
const csv = require('csv-parse/sync');
const { Manifest } = require('./manifest');
const { OfficialModules } = require('../modules/official-modules');
const { CustomModules } = require('../modules/custom-modules');
const { IdeManager } = require('../ide/manager');
const { FileOps } = require('../file-ops');
const { Config } = require('./config');
const { getProjectRoot, getSourcePath } = require('../project-root');
const { ManifestGenerator } = require('./manifest-generator');
const cleanupPlanner = require('./cleanup-planner');
const { AgentCommandGenerator } = require('../ide/shared/agent-command-generator');
const prompts = require('../prompts');
const { GOMAD_FOLDER_NAME } = require('../ide/shared/path-utils');
const { InstallPaths } = require('./install-paths');

const { ExistingInstall } = require('./existing-install');

class Installer {
  constructor() {
    this.manifest = new Manifest();
    this.customModules = new CustomModules();
    this.ideManager = new IdeManager();
    this.fileOps = new FileOps();
    this.installedFiles = new Set(); // Track all installed files
    this.ideInstalledFiles = new Set(); // Phase 6: tracks IDE-target paths (launchers) for post-_setupIdes manifest refresh
    this.gomadFolderName = GOMAD_FOLDER_NAME;
  }

  /**
   * Main installation method
   * @param {Object} config - Installation configuration
   * @param {string} config.directory - Target directory
   * @param {string[]} config.modules - Modules to install (including 'core')
   * @param {string[]} config.ides - IDEs to configure
   */
  async install(originalConfig) {
    let updateState = null;

    try {
      const config = Config.build(originalConfig);
      const paths = await InstallPaths.create(config);
      const officialModules = await OfficialModules.build(config, paths);
      const existingInstall = await ExistingInstall.detect(paths.gomadDir);

      await this.customModules.discoverPaths(originalConfig, paths);

      if (existingInstall.installed) {
        await this._removeDeselectedModules(existingInstall, config, paths);
        updateState = await this._prepareUpdateState(paths, config, existingInstall, officialModules);
        await this._removeDeselectedIdes(existingInstall, config, paths);
      }

      await this._validateIdeSelection(config);

      // Results collector for consolidated summary
      const results = [];
      const addResult = (step, status, detail = '') => results.push({ step, status, detail });

      await this._cacheCustomModules(paths, addResult);

      // Compute module lists: official = selected minus custom, all = both
      const customModuleIds = new Set(this.customModules.paths.keys());
      const officialModuleIds = (config.modules || []).filter((m) => !customModuleIds.has(m));
      const allModules = [...officialModuleIds, ...[...customModuleIds].filter((id) => !officialModuleIds.includes(id))];

      await this._installAndConfigure(config, originalConfig, paths, officialModuleIds, allModules, addResult, officialModules);

      await this._setupIdes(config, allModules, paths, addResult);

      // Phase 6 (D-25): Re-write files-manifest.csv so launcher files written by _setupIdes
      // (_config-driven.js's launcher_target_dir block) land in the manifest with
      // install_root='.claude' instead of being untracked. The first manifest write in
      // configTask only saw _gomad/-internal paths; this second pass picks up IDE-target
      // paths that were added to this.installedFiles during IDE setup.
      if (this.ideInstalledFiles && this.ideInstalledFiles.size > 0) {
        const manifestGen = new ManifestGenerator();
        const allModulesForManifest = config.isQuickUpdate()
          ? originalConfig._existingModules || allModules || []
          : originalConfig._preserveModules
            ? [...allModules, ...originalConfig._preserveModules]
            : allModules || [];
        // WR-02: pass IDE root list so writeFilesManifest can correctly derive
        // install_root for launcher files outside _gomad/.
        const ideRoots = await this._collectIdeRoots();
        await manifestGen.generateManifests(paths.gomadDir, allModulesForManifest, [...this.installedFiles], {
          ides: config.ides || [],
          preservedModules: allModulesForManifest,
          ideRoots,
        });
      }

      const restoreResult = await this._restoreUserFiles(paths, updateState);

      // Render consolidated summary
      await this.renderInstallSummary(results, {
        gomadDir: paths.gomadDir,
        modules: config.modules,
        ides: config.ides,
        customFiles: restoreResult.customFiles.length > 0 ? restoreResult.customFiles : undefined,
        modifiedFiles: restoreResult.modifiedFiles.length > 0 ? restoreResult.modifiedFiles : undefined,
      });

      return {
        success: true,
        path: paths.gomadDir,
        modules: config.modules,
        ides: config.ides,
        projectDir: paths.projectRoot,
      };
    } catch (error) {
      await prompts.log.error('Installation failed');

      // Clean up any temp backup directories that were created before the failure
      try {
        if (updateState?.tempBackupDir && (await fs.pathExists(updateState.tempBackupDir))) {
          await fs.remove(updateState.tempBackupDir);
        }
        if (updateState?.tempModifiedBackupDir && (await fs.pathExists(updateState.tempModifiedBackupDir))) {
          await fs.remove(updateState.tempModifiedBackupDir);
        }
      } catch {
        // Best-effort cleanup — don't mask the original error
      }

      throw error;
    }
  }

  /**
   * Remove modules that were previously installed but are no longer selected.
   * No confirmation — the user's module selection is the decision.
   */
  async _removeDeselectedModules(existingInstall, config, paths) {
    const previouslyInstalled = new Set(existingInstall.moduleIds);
    const newlySelected = new Set(config.modules || []);
    const toRemove = [...previouslyInstalled].filter((m) => !newlySelected.has(m) && m !== 'core');

    for (const moduleId of toRemove) {
      const modulePath = paths.moduleDir(moduleId);
      try {
        if (await fs.pathExists(modulePath)) {
          await fs.remove(modulePath);
        }
      } catch (error) {
        await prompts.log.warn(`Warning: Failed to remove ${moduleId}: ${error.message}`);
      }
    }
  }

  /**
   * Fail fast if all selected IDEs are suspended.
   */
  async _validateIdeSelection(config) {
    if (!config.ides || config.ides.length === 0) return;

    await this.ideManager.ensureInitialized();
    const suspendedIdes = config.ides.filter((ide) => {
      const handler = this.ideManager.handlers.get(ide);
      return handler?.platformConfig?.suspended;
    });

    if (suspendedIdes.length > 0 && suspendedIdes.length === config.ides.length) {
      for (const ide of suspendedIdes) {
        const handler = this.ideManager.handlers.get(ide);
        await prompts.log.error(`${handler.displayName || ide}: ${handler.platformConfig.suspended}`);
      }
      throw new Error(
        `All selected tool(s) are suspended: ${suspendedIdes.join(', ')}. Installation aborted to prevent upgrading _gomad/ without a working IDE configuration.`,
      );
    }
  }

  /**
   * Remove IDEs that were previously installed but are no longer selected.
   * No confirmation — the user's IDE selection is the decision.
   */
  async _removeDeselectedIdes(existingInstall, config, paths) {
    const previouslyInstalled = new Set(existingInstall.ides);
    const newlySelected = new Set(config.ides || []);
    const toRemove = [...previouslyInstalled].filter((ide) => !newlySelected.has(ide));

    if (toRemove.length === 0) return;

    await this.ideManager.ensureInitialized();
    for (const ide of toRemove) {
      try {
        const handler = this.ideManager.handlers.get(ide);
        if (handler) {
          await handler.cleanup(paths.projectRoot);
        }
      } catch (error) {
        await prompts.log.warn(`Warning: Failed to remove ${ide}: ${error.message}`);
      }
    }
  }

  /**
   * Cache custom modules into the local cache directory.
   * Updates this.customModules.paths in place with cached locations.
   */
  async _cacheCustomModules(paths, addResult) {
    if (!this.customModules.paths || this.customModules.paths.size === 0) return;

    const { CustomModuleCache } = require('./custom-module-cache');
    const customCache = new CustomModuleCache(paths.gomadDir);

    for (const [moduleId, sourcePath] of this.customModules.paths) {
      const cachedInfo = await customCache.cacheModule(moduleId, sourcePath, {
        sourcePath: sourcePath,
      });
      this.customModules.paths.set(moduleId, cachedInfo.cachePath);
    }

    addResult('Custom modules cached', 'ok');
  }

  /**
   * Install modules, create directories, generate configs and manifests.
   */
  async _installAndConfigure(config, originalConfig, paths, officialModuleIds, allModules, addResult, officialModules) {
    const isQuickUpdate = config.isQuickUpdate();
    const moduleConfigs = officialModules.moduleConfigs;

    const dirResults = { createdDirs: [], movedDirs: [], createdWdsFolders: [] };

    const installTasks = [];

    if (allModules.length > 0) {
      installTasks.push({
        title: isQuickUpdate ? `Updating ${allModules.length} module(s)` : `Installing ${allModules.length} module(s)`,
        task: async (message) => {
          const installedModuleNames = new Set();

          await this._installOfficialModules(config, paths, officialModuleIds, addResult, isQuickUpdate, officialModules, {
            message,
            installedModuleNames,
          });

          await this._installCustomModules(config, paths, addResult, officialModules, {
            message,
            installedModuleNames,
          });

          // STORY-11 (Plan 10-02): copy src/domain-kb/* → <gomadDir>/_config/kb/*
          // and track every copied file so manifest-v2 records install_root='_gomad'.
          await this._installDomainKb(paths, addResult, { message });

          return `${allModules.length} module(s) ${isQuickUpdate ? 'updated' : 'installed'}`;
        },
      });
    }

    installTasks.push({
      title: 'Creating module directories',
      task: async (message) => {
        const verboseMode = process.env.GOMAD_VERBOSE_INSTALL === 'true' || config.verbose;
        const moduleLogger = {
          log: async (msg) => (verboseMode ? await prompts.log.message(msg) : undefined),
          error: async (msg) => await prompts.log.error(msg),
          warn: async (msg) => await prompts.log.warn(msg),
        };

        if (config.modules && config.modules.length > 0) {
          for (const moduleName of config.modules) {
            message(`Setting up ${moduleName}...`);
            const result = await officialModules.createModuleDirectories(moduleName, paths.gomadDir, {
              installedIDEs: config.ides || [],
              moduleConfig: moduleConfigs[moduleName] || {},
              existingModuleConfig: officialModules.existingConfig?.[moduleName] || {},
              coreConfig: moduleConfigs.core || {},
              logger: moduleLogger,
              silent: true,
            });
            if (result) {
              dirResults.createdDirs.push(...result.createdDirs);
              dirResults.movedDirs.push(...(result.movedDirs || []));
              dirResults.createdWdsFolders.push(...result.createdWdsFolders);
            }
          }
        }

        addResult('Module directories', 'ok');
        return 'Module directories created';
      },
    });

    const configTask = {
      title: 'Generating configurations',
      task: async (message) => {
        await this.generateModuleConfigs(paths.gomadDir, moduleConfigs);
        addResult('Configurations', 'ok', 'generated');

        this.installedFiles.add(paths.manifestFile());
        this.installedFiles.add(paths.agentManifest());

        // Phase 6 (D-14/D-15): extract 8 agent personas from src/gomad-skills/*/gm-agent-*/
        // into _gomad/_config/agents/<shortName>.md (v1.3+ — was gomad/agents/ in v1.2).
        // Runs BEFORE generateManifests so the extracted files land in
        // files-manifest.csv with install_root='_gomad'.
        message('Extracting agent personas...');
        const personaGen = new AgentCommandGenerator(this.gomadFolderName);
        const workspaceRoot = path.dirname(paths.gomadDir);
        const extractedPersonaPaths = await personaGen.extractPersonas(workspaceRoot);
        for (const p of extractedPersonaPaths) {
          this.installedFiles.add(p);
        }

        message('Generating manifests...');
        const manifestGen = new ManifestGenerator();

        const allModulesForManifest = config.isQuickUpdate()
          ? originalConfig._existingModules || allModules || []
          : originalConfig._preserveModules
            ? [...allModules, ...originalConfig._preserveModules]
            : allModules || [];

        let modulesForCsvPreserve;
        if (config.isQuickUpdate()) {
          modulesForCsvPreserve = originalConfig._existingModules || allModules || [];
        } else {
          modulesForCsvPreserve = originalConfig._preserveModules ? [...allModules, ...originalConfig._preserveModules] : allModules;
        }

        // WR-02: pass IDE root list so writeFilesManifest can derive install_root
        // for any IDE-target files (e.g. .claude/commands/gm/agent-*.md).
        const ideRoots = await this._collectIdeRoots();
        await manifestGen.generateManifests(paths.gomadDir, allModulesForManifest, [...this.installedFiles], {
          ides: config.ides || [],
          preservedModules: modulesForCsvPreserve,
          ideRoots,
        });

        message('Generating help catalog...');
        await this.mergeModuleHelpCatalogs(paths.gomadDir);
        addResult('Help catalog', 'ok');

        return 'Configurations generated';
      },
    };
    installTasks.push(configTask);

    // Run install + dirs first, then render dir output, then run config generation
    const mainTasks = installTasks.filter((t) => t !== configTask);
    await prompts.tasks(mainTasks);

    const color = await prompts.getColor();
    if (dirResults.movedDirs.length > 0) {
      const lines = dirResults.movedDirs.map((d) => `  ${d}`).join('\n');
      await prompts.log.message(color.cyan(`Moved directories:\n${lines}`));
    }
    if (dirResults.createdDirs.length > 0) {
      const lines = dirResults.createdDirs.map((d) => `  ${d}`).join('\n');
      await prompts.log.message(color.yellow(`Created directories:\n${lines}`));
    }
    if (dirResults.createdWdsFolders.length > 0) {
      const lines = dirResults.createdWdsFolders.map((f) => color.dim(`  \u2713 ${f}/`)).join('\n');
      await prompts.log.message(color.cyan(`Created WDS folder structure:\n${lines}`));
    }

    await prompts.tasks([configTask]);
  }

  /**
   * Set up IDE integrations for each selected IDE.
   */
  async _setupIdes(config, allModules, paths, addResult) {
    if (config.skipIde || !config.ides || config.ides.length === 0) return;

    await this.ideManager.ensureInitialized();
    const validIdes = config.ides.filter((ide) => ide && typeof ide === 'string');

    if (validIdes.length === 0) {
      addResult('IDE configuration', 'warn', 'no valid IDEs selected');
      return;
    }

    for (const ide of validIdes) {
      const setupResult = await this.ideManager.setup(ide, paths.projectRoot, paths.gomadDir, {
        selectedModules: allModules || [],
        verbose: config.verbose,
        trackInstalledFile: (filePath) => {
          this.installedFiles.add(filePath);
          this.ideInstalledFiles.add(filePath);
        },
      });

      if (setupResult.success) {
        addResult(ide, 'ok', setupResult.detail || '');
      } else {
        addResult(ide, 'error', setupResult.error || 'failed');
      }
    }
  }

  /**
   * Restore custom and modified files that were backed up before the update.
   * No-op for fresh installs (updateState is null).
   * @param {Object} paths - InstallPaths instance
   * @param {Object|null} updateState - From _prepareUpdateState, or null for fresh installs
   * @returns {Object} { customFiles, modifiedFiles } — lists of restored files
   */
  async _restoreUserFiles(paths, updateState) {
    const noFiles = { customFiles: [], modifiedFiles: [] };

    if (!updateState || (updateState.customFiles.length === 0 && updateState.modifiedFiles.length === 0)) {
      return noFiles;
    }

    let restoredCustomFiles = [];
    let restoredModifiedFiles = [];

    await prompts.tasks([
      {
        title: 'Finalizing installation',
        task: async (message) => {
          if (updateState.customFiles.length > 0) {
            message(`Restoring ${updateState.customFiles.length} custom files...`);

            for (const originalPath of updateState.customFiles) {
              const relativePath = path.relative(paths.gomadDir, originalPath);
              const backupPath = path.join(updateState.tempBackupDir, relativePath);

              if (await fs.pathExists(backupPath)) {
                await fs.ensureDir(path.dirname(originalPath));
                await fs.copy(backupPath, originalPath, { overwrite: true });
              }
            }

            if (updateState.tempBackupDir && (await fs.pathExists(updateState.tempBackupDir))) {
              await fs.remove(updateState.tempBackupDir);
            }

            restoredCustomFiles = updateState.customFiles;
          }

          if (updateState.modifiedFiles.length > 0) {
            restoredModifiedFiles = updateState.modifiedFiles;

            if (updateState.tempModifiedBackupDir && (await fs.pathExists(updateState.tempModifiedBackupDir))) {
              message(`Restoring ${restoredModifiedFiles.length} modified files as .bak...`);

              for (const modifiedFile of restoredModifiedFiles) {
                const relativePath = path.relative(paths.gomadDir, modifiedFile.path);
                const tempBackupPath = path.join(updateState.tempModifiedBackupDir, relativePath);
                const bakPath = modifiedFile.path + '.bak';

                if (await fs.pathExists(tempBackupPath)) {
                  await fs.ensureDir(path.dirname(bakPath));
                  await fs.copy(tempBackupPath, bakPath, { overwrite: true });
                }
              }

              await fs.remove(updateState.tempModifiedBackupDir);
            }
          }

          return 'Installation finalized';
        },
      },
    ]);

    return { customFiles: restoredCustomFiles, modifiedFiles: restoredModifiedFiles };
  }

  /**
   * Scan the custom module cache directory and register any cached custom modules
   * that aren't already known from the manifest or external module list.
   * @param {Object} paths - InstallPaths instance
   */
  async _scanCachedCustomModules(paths) {
    const cacheDir = paths.customCacheDir;
    if (!(await fs.pathExists(cacheDir))) {
      return;
    }

    const cachedModules = await fs.readdir(cacheDir, { withFileTypes: true });

    for (const cachedModule of cachedModules) {
      const moduleId = cachedModule.name;
      const cachedPath = path.join(cacheDir, moduleId);

      // Skip if path doesn't exist (broken symlink, deleted dir) - avoids lstat ENOENT
      if (!(await fs.pathExists(cachedPath)) || !cachedModule.isDirectory()) {
        continue;
      }

      // Skip if we already have this module from manifest
      if (this.customModules.paths.has(moduleId)) {
        continue;
      }

      // Check if this is actually a custom module (has module.yaml)
      const moduleYamlPath = path.join(cachedPath, 'module.yaml');
      if (await fs.pathExists(moduleYamlPath)) {
        this.customModules.paths.set(moduleId, cachedPath);
      }
    }
  }

  /**
   * Common update preparation: detect files, preserve core config, scan cache, back up.
   * @param {Object} paths - InstallPaths instance
   * @param {Object} config - Clean config (may have coreConfig updated)
   * @param {Object} existingInstall - Detection result
   * @param {Object} officialModules - OfficialModules instance
   * @returns {Object} Update state: { customFiles, modifiedFiles, tempBackupDir, tempModifiedBackupDir }
   */
  async _prepareUpdateState(paths, config, existingInstall, officialModules) {
    // Detect custom and modified files BEFORE updating (compare current files vs files-manifest.csv)
    const existingFilesManifest = await this.readFilesManifest(paths.gomadDir);

    // ========== Phase 7: manifest-driven cleanup (INSTALL-05/06/07/08/09) ==========
    // Compute the cleanup plan as a pure function on the prior manifest + workspace state.
    // Then either print (dry-run) or execute it, BEFORE normal install begins.
    // MANIFEST_CORRUPT errors are caught + logged + suppressed — install proceeds idempotently (D-33).
    // The legacy v1.1 `_backupUserFiles` + `detectCustomFiles` flow below is PRESERVED UNTOUCHED (D-41).
    try {
      const workspaceRoot = await fs.realpath(paths.projectRoot);
      const ideRoots = await this._collectIdeRoots();
      const allowedRoots = new Set(['_gomad', '.claude', ...ideRoots]);
      const isV11 = await cleanupPlanner.isV11Legacy(workspaceRoot, paths.gomadDir);
      const isV12Reloc = await cleanupPlanner.isV12LegacyAgentsDir(workspaceRoot, paths.gomadDir);

      // newInstallSet: realpath-resolve every prior manifest entry that still exists on
      // disk. This preserves Phase 7 SC1 (idempotent re-install — no new backup, no
      // manifest change) because buildCleanupPlan's still-needed guard
      //   `if (newInstallSet.has(resolved)) continue;`
      // skips entries that are already in the intended write set. Files the new install
      // will NOT re-install (stale entries from an older manifest, e.g. a removed skill)
      // are absent from this set and correctly flow into to_snapshot + to_remove.
      //
      // If the prior manifest entry is missing on disk (ENOENT — Pitfall 22), realpath
      // throws ENOENT and we skip that row — the file is already gone, no snapshot
      // needed. buildCleanupPlan handles the same ENOENT case identically.
      const newInstallSet = new Set();
      for (const entry of existingFilesManifest) {
        const installRoot = entry.install_root || '_gomad';
        const joined = entry.absolutePath || path.join(workspaceRoot, installRoot, entry.path || '');
        try {
          const resolved = await fs.realpath(joined);
          newInstallSet.add(resolved);
        } catch (error) {
          if (error.code !== 'ENOENT') throw error;
          // ENOENT: file already deleted; nothing to preserve. Matches
          // buildCleanupPlan's own ENOENT handling for the same entry.
        }
      }

      const plan = await cleanupPlanner.buildCleanupPlan({
        priorManifest: existingFilesManifest,
        newInstallSet,
        workspaceRoot,
        allowedRoots,
        isV11Legacy: isV11,
        isV12LegacyAgentsDir: isV12Reloc,
      });

      // D-09: verbose v1.3 BREAKING migration banner. Suppressed in dry-run
      // (D-10) because cleanupPlanner.renderPlan(plan) already prints the
      // planned actions. API pattern verified at installer.js:347-358 —
      // `await prompts.getColor()` returns the chalk-shaped helper used
      // throughout the installer for banner output.
      if (isV12Reloc && !config.dryRun) {
        const color = await prompts.getColor();
        await prompts.log.message(color.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
        await prompts.log.message(color.yellow('  GoMad v1.3 BREAKING: Agent persona files are relocating'));
        await prompts.log.message(color.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
        await prompts.log.message('');
        await prompts.log.message('  • What is moving: 8 persona body files (.md)');
        await prompts.log.message('      from  _gomad/gomad/agents/<shortName>.md');
        await prompts.log.message('      to    _gomad/_config/agents/<shortName>.md');
        await prompts.log.message('  • Backup snapshot: every old file is copied to');
        await prompts.log.message('      _gomad/_backups/<YYYYMMDD-HHMMSS>/_gomad/gomad/agents/');
        await prompts.log.message('      BEFORE removal. Recovery is non-destructive.');
        await prompts.log.message('  • Your .customize.yaml files are preserved unchanged');
        await prompts.log.message('      (custom-file detector handles persona .md as generated).');
        await prompts.log.message('  • Rollback recipe: see docs/upgrade-recovery.md');
        await prompts.log.message('      § "v1.2 → v1.3 recovery"');
        await prompts.log.message('');
        await prompts.log.message(color.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
        await prompts.log.message('');
      }

      if (config.dryRun) {
        // D-41 dry-run: print plan and exit without touching disk.
        await prompts.log.info('\n' + cleanupPlanner.renderPlan(plan) + '\n');
        process.exit(0);
      }

      if (plan.to_snapshot.length > 0 || plan.to_remove.length > 0) {
        // Use getProjectRoot() to resolve package.json — the bare '../../package.json'
        // relative require fails in tarball installs (landing at tools/installer/package.json
        // which doesn't exist). This matches the pattern used elsewhere in this file (L1439).
        const pkgVersion = require(path.join(getProjectRoot(), 'package.json')).version;
        const backupRoot = await cleanupPlanner.executeCleanupPlan(plan, workspaceRoot, pkgVersion);
        if (backupRoot) {
          await prompts.log.info(
            `Phase 7 cleanup: ${plan.to_snapshot.length} files snapshotted to ${path.relative(workspaceRoot, backupRoot)}, ${plan.to_remove.length} removed` +
              (isV11 ? ' (legacy v1.1 upgrade)' : ''),
          );
        }
      }
    } catch (error) {
      if (error instanceof cleanupPlanner.ManifestCorruptError || error.code === 'MANIFEST_CORRUPT') {
        await prompts.log.error(`MANIFEST_CORRUPT: ${error.message}`);
        await prompts.log.warn('Skipping Phase 7 cleanup; install will proceed idempotently.');
        // Do NOT re-throw; fall through to v1.1 detect-custom-files + _backupUserFiles flow.
      } else {
        throw error; // unexpected — propagate (e.g. ENOSPC during snapshot, missing platform-codes.yaml)
      }
    }
    // ========== End Phase 7 cleanup ==========

    const { customFiles, modifiedFiles } = await this.detectCustomFiles(paths.gomadDir, existingFilesManifest);

    // Preserve existing core configuration during updates
    // (no-op for quick-update which already has core config from collectModuleConfigQuick)
    const coreConfigPath = paths.moduleConfig('core');
    if ((await fs.pathExists(coreConfigPath)) && (!config.coreConfig || Object.keys(config.coreConfig).length === 0)) {
      try {
        const yaml = require('yaml');
        const coreConfigContent = await fs.readFile(coreConfigPath, 'utf8');
        const existingCoreConfig = yaml.parse(coreConfigContent);

        config.coreConfig = existingCoreConfig;
        officialModules.moduleConfigs.core = existingCoreConfig;
      } catch (error) {
        await prompts.log.warn(`Warning: Could not read existing core config: ${error.message}`);
      }
    }

    await this._scanCachedCustomModules(paths);

    const backupDirs = await this._backupUserFiles(paths, customFiles, modifiedFiles);

    return {
      customFiles,
      modifiedFiles,
      tempBackupDir: backupDirs.tempBackupDir,
      tempModifiedBackupDir: backupDirs.tempModifiedBackupDir,
    };
  }

  /**
   * Back up custom and modified files to temp directories before overwriting.
   * Returns the temp directory paths (or undefined if no files to back up).
   * @param {Object} paths - InstallPaths instance
   * @param {string[]} customFiles - Absolute paths of custom (user-added) files
   * @param {Object[]} modifiedFiles - Array of { path, relativePath } for modified files
   * @returns {Object} { tempBackupDir, tempModifiedBackupDir } — undefined if no files
   */
  async _backupUserFiles(paths, customFiles, modifiedFiles) {
    let tempBackupDir;
    let tempModifiedBackupDir;

    if (customFiles.length > 0) {
      tempBackupDir = path.join(paths.projectRoot, '_gomad-custom-backup-temp');
      await fs.ensureDir(tempBackupDir);

      for (const customFile of customFiles) {
        const relativePath = path.relative(paths.gomadDir, customFile);
        const backupPath = path.join(tempBackupDir, relativePath);
        await fs.ensureDir(path.dirname(backupPath));
        await fs.copy(customFile, backupPath);
      }
    }

    if (modifiedFiles.length > 0) {
      tempModifiedBackupDir = path.join(paths.projectRoot, '_gomad-modified-backup-temp');
      await fs.ensureDir(tempModifiedBackupDir);

      for (const modifiedFile of modifiedFiles) {
        const relativePath = path.relative(paths.gomadDir, modifiedFile.path);
        const tempBackupPath = path.join(tempModifiedBackupDir, relativePath);
        await fs.ensureDir(path.dirname(tempBackupPath));
        await fs.copy(modifiedFile.path, tempBackupPath, { overwrite: true });
      }
    }

    return { tempBackupDir, tempModifiedBackupDir };
  }

  /**
   * Install official (non-custom) modules.
   * @param {Object} config - Installation configuration
   * @param {Object} paths - InstallPaths instance
   * @param {string[]} officialModuleIds - Official module IDs to install
   * @param {Function} addResult - Callback to record installation results
   * @param {boolean} isQuickUpdate - Whether this is a quick update
   * @param {Object} ctx - Shared context: { message, installedModuleNames }
   */
  async _installOfficialModules(config, paths, officialModuleIds, addResult, isQuickUpdate, officialModules, ctx) {
    const { message, installedModuleNames } = ctx;

    for (const moduleName of officialModuleIds) {
      if (installedModuleNames.has(moduleName)) continue;
      installedModuleNames.add(moduleName);

      message(`${isQuickUpdate ? 'Updating' : 'Installing'} ${moduleName}...`);

      const moduleConfig = officialModules.moduleConfigs[moduleName] || {};
      await officialModules.install(
        moduleName,
        paths.gomadDir,
        (filePath) => {
          this.installedFiles.add(filePath);
        },
        {
          skipModuleInstaller: true,
          moduleConfig: moduleConfig,
          installer: this,
          silent: true,
        },
      );

      addResult(`Module: ${moduleName}`, 'ok', isQuickUpdate ? 'updated' : 'installed');
    }
  }

  /**
   * Install custom modules using CustomModules.install().
   * Source paths come from this.customModules.paths (populated by discoverPaths).
   */
  async _installCustomModules(config, paths, addResult, officialModules, ctx) {
    const { message, installedModuleNames } = ctx;
    const isQuickUpdate = config.isQuickUpdate();

    for (const [moduleName, sourcePath] of this.customModules.paths) {
      if (installedModuleNames.has(moduleName)) continue;
      installedModuleNames.add(moduleName);

      message(`${isQuickUpdate ? 'Updating' : 'Installing'} ${moduleName}...`);

      const collectedModuleConfig = officialModules.moduleConfigs[moduleName] || {};
      const result = await this.customModules.install(moduleName, paths.gomadDir, (filePath) => this.installedFiles.add(filePath), {
        moduleConfig: collectedModuleConfig,
      });

      // Generate runtime config.yaml with merged values
      await this.generateModuleConfigs(paths.gomadDir, {
        [moduleName]: { ...config.coreConfig, ...result.moduleConfig, ...collectedModuleConfig },
      });

      addResult(`Module: ${moduleName}`, 'ok', isQuickUpdate ? 'updated' : 'installed');
    }
  }

  /**
   * STORY-11 (Plan 10-02): Copy src/domain-kb/* → <gomadDir>/_config/kb/* and track
   * every copied file in this.installedFiles so writeFilesManifest records
   * install_root='_gomad' with schema_version='2.0'. Greenfield path (`_config/kb/`
   * has no prior collision per ARCHITECTURE §4.6). No-op when src/domain-kb/ is
   * empty or absent.
   *
   * Idempotency: fs.copy overwrites with identical content (same hash); manifest-v2
   * cleanup-planner sees identical-hash entries and produces zero remove/snapshot work.
   *
   * @param {Object} paths - InstallPaths instance (expects paths.kbDir + paths.srcDir)
   * @param {Function} addResult - Callback to record installation results
   * @param {Object} ctx - Shared context: { message }
   */
  async _installDomainKb(paths, addResult, ctx) {
    const { message } = ctx;
    const srcKbDir = path.join(paths.srcDir, 'src', 'domain-kb');

    if (!(await fs.pathExists(srcKbDir))) {
      addResult('Domain KB', 'skip', 'no source packs');
      return;
    }

    const entries = await fs.readdir(srcKbDir);
    if (entries.length === 0) {
      addResult('Domain KB', 'skip', 'source directory empty');
      return;
    }

    message('Installing domain-kb packs...');
    await fs.ensureDir(paths.kbDir);
    await fs.copy(srcKbDir, paths.kbDir, { overwrite: true });

    // Track every copied .md file so writeFilesManifest assigns install_root='_gomad'
    const { globSync } = require('glob');
    const copiedFiles = globSync('**/*.md', { cwd: paths.kbDir, absolute: true });
    for (const filePath of copiedFiles) {
      this.installedFiles.add(filePath);
    }

    addResult('Domain KB', 'ok', `${copiedFiles.length} file(s) installed`);
  }

  /**
   * WR-02: Collect the set of leading-segment IDE root directories defined in
   * platform-codes.yaml (e.g. '.claude', '.cursor', '.opencode'). Used by
   * ManifestGenerator.writeFilesManifest to derive `install_root` for any file
   * installed outside `_gomad/`. Returns a sorted array of unique root segments.
   * @returns {Promise<string[]>} Array of IDE root directory names (leading segment only)
   */
  async _collectIdeRoots() {
    const { loadPlatformCodes } = require('../ide/platform-codes');
    const platformConfig = await loadPlatformCodes();
    const roots = new Set();
    for (const platformInfo of Object.values(platformConfig.platforms || {})) {
      const installer = platformInfo?.installer;
      if (!installer) continue;
      for (const key of ['target_dir', 'launcher_target_dir']) {
        const value = installer[key];
        if (typeof value !== 'string' || !value) continue;
        // Take the first path segment — that's the IDE root we record in install_root.
        const leading = value.split('/')[0].split(path.sep)[0];
        if (leading && leading !== '~' && !leading.startsWith('..')) {
          roots.add(leading);
        }
      }
    }
    return [...roots].sort();
  }

  /**
   * Read files-manifest.csv
   * @param {string} gomadDir - GOMAD installation directory
   * @returns {Array} Array of file entries from files-manifest.csv
   */
  async readFilesManifest(gomadDir) {
    const filesManifestPath = path.join(gomadDir, '_config', 'files-manifest.csv');
    if (!(await fs.pathExists(filesManifestPath))) {
      return [];
    }

    let content;
    try {
      content = await fs.readFile(filesManifestPath, 'utf8');
    } catch (error) {
      // Phase 7 D-33: I/O failure on the manifest file is treated as MANIFEST_CORRUPT
      // (whole-manifest skip-cleanup signal). Installer continues with idempotent install.
      await prompts.log.error('MANIFEST_CORRUPT: IO_ERROR: ' + error.message);
      return [];
    }

    let records;
    try {
      records = csv.parse(content, {
        columns: true,
        skip_empty_lines: true,
        bom: true, // Phase 7 D-33: strip leading U+FEFF silently (normalization, not corruption)
        // Phase 7 WR-01: pin strict parse semantics so the corrupt-quote / corrupt-arity
        // fixtures trigger MANIFEST_CORRUPT independent of csv-parse default drift.
        relax_quotes: false, // enforce RFC 4180 quote balance — unterminated quotes throw
        relax_column_count: false, // arity mismatch → CsvError rather than silent pad/truncate
      });
    } catch (error) {
      // Phase 7 D-33: csv-parse throw → whole-manifest corrupt. Log MANIFEST_CORRUPT
      // and return [] so the cleanup step is skipped; installer continues with
      // idempotent copy-over (no deletions).
      const code = error.code || 'PARSE_ERROR';
      await prompts.log.error('MANIFEST_CORRUPT: ' + code + ': ' + error.message);
      return [];
    }

    // Phase 7 D-33: per-row validation. A row missing required columns → CORRUPT_ROW
    // (skip that row, keep the rest). install_root MAY be empty for legacy v1 rows
    // (Phase 6 D-23 compat) — only required when schema_version === '2.0' (RESEARCH.md
    // §Pitfall 15 extended).
    const REQUIRED_ALWAYS = ['type', 'name', 'path'];
    const validRows = [];
    for (const [idx, row] of records.entries()) {
      const missing = REQUIRED_ALWAYS.filter((k) => !row[k] || row[k] === '');
      if (!row.install_root && row.schema_version === '2.0') {
        missing.push('install_root');
      }
      if (missing.length > 0) {
        await prompts.log.warn('CORRUPT_ROW: row ' + idx + ': missing column(s) ' + missing.join(','));
        continue;
      }
      validRows.push(row);
    }

    // WR-01: resolve absolute paths based on install_root so detectCustomFiles can
    // match scanned IDE-target files (e.g. .claude/commands/gm/agent-pm.md). Without
    // absolutePath, every v2 row whose install_root != '_gomad' would map to a bogus
    // path under gomadDir, so launcher edits would be silently undetected.
    const workspaceRoot = path.dirname(gomadDir);
    return validRows.map((r) => {
      const installRoot = r.install_root || '_gomad';
      const rootPath = installRoot === '_gomad' ? gomadDir : path.join(workspaceRoot, installRoot);
      return {
        type: r.type,
        name: r.name,
        module: r.module,
        path: r.path,
        hash: r.hash || null, // v1 compat: hash column always present since Phase 3
        schema_version: r.schema_version || null, // D-23: v1 rows → null (implicit v1)
        install_root: installRoot, // D-25: default for v1 rows
        absolutePath: path.join(rootPath, r.path || ''), // WR-01: install_root-aware absolute path
      };
    });
  }

  /**
   * Detect custom and modified files
   * @param {string} gomadDir - GOMAD installation directory
   * @param {Array} existingFilesManifest - Previous files from files-manifest.csv
   * @returns {Object} Object with customFiles and modifiedFiles arrays
   */
  async detectCustomFiles(gomadDir, existingFilesManifest) {
    const customFiles = [];
    const modifiedFiles = [];

    // Memory is always in _gomad/_memory
    const gomadMemoryPath = '_memory';

    // Check if the manifest has hashes - if not, we can't detect modifications
    let manifestHasHashes = false;
    if (existingFilesManifest && existingFilesManifest.length > 0) {
      manifestHasHashes = existingFilesManifest.some((f) => f.hash);
    }

    // Build map of previously installed files from files-manifest.csv with their hashes.
    // WR-01: prefer absolutePath (install_root-aware) when present; fall back to gomadDir-relative
    // for backward-compat with manifest entries that pre-date the install_root column.
    const installedFilesMap = new Map();
    const extraScanRoots = new Set(); // WR-01: additional roots (e.g. .claude/) to scan beyond gomadDir
    for (const fileEntry of existingFilesManifest) {
      if (fileEntry.path) {
        const absolutePath = fileEntry.absolutePath || path.join(gomadDir, fileEntry.path);
        installedFilesMap.set(path.normalize(absolutePath), {
          hash: fileEntry.hash,
          relativePath: fileEntry.path,
        });
        // WR-01: any manifest row that lives outside gomadDir contributes its install_root
        // to the scan list, so modifications to launcher files are observable.
        if (fileEntry.install_root && fileEntry.install_root !== '_gomad') {
          const workspaceRoot = path.dirname(gomadDir);
          const rootAbs = path.join(workspaceRoot, fileEntry.install_root);
          extraScanRoots.add(rootAbs);
        }
      }
    }

    // Recursively scan gomadDir for all files
    const scanDirectory = async (dir) => {
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);

          if (entry.isDirectory()) {
            // Skip certain directories
            if (entry.name === 'node_modules' || entry.name === '.git') {
              continue;
            }
            await scanDirectory(fullPath);
          } else if (entry.isFile()) {
            const normalizedPath = path.normalize(fullPath);
            const fileInfo = installedFilesMap.get(normalizedPath);

            // Skip certain system files that are auto-generated
            const relativePath = path.relative(gomadDir, fullPath);
            const fileName = path.basename(fullPath);

            // Skip _config directory EXCEPT for modified agent customizations
            if (relativePath.startsWith('_config/') || relativePath.startsWith('_config\\')) {
              // Special handling for .customize.yaml files - only preserve if modified
              if (relativePath.includes('/agents/') && fileName.endsWith('.customize.yaml')) {
                // Check if the customization file has been modified from manifest
                const manifestPath = path.join(gomadDir, '_config', 'manifest.yaml');
                if (await fs.pathExists(manifestPath)) {
                  const crypto = require('node:crypto');
                  const currentContent = await fs.readFile(fullPath, 'utf8');
                  const currentHash = crypto.createHash('sha256').update(currentContent).digest('hex');

                  const yaml = require('yaml');
                  const manifestContent = await fs.readFile(manifestPath, 'utf8');
                  const manifestData = yaml.parse(manifestContent);
                  const originalHash = manifestData.agentCustomizations?.[relativePath];

                  // Only add to customFiles if hash differs (user modified)
                  if (originalHash && currentHash !== originalHash) {
                    customFiles.push(fullPath);
                  }
                }
              }
              continue;
            }

            if (relativePath.startsWith(gomadMemoryPath + '/') && path.dirname(relativePath).includes('-sidecar')) {
              continue;
            }

            // Skip config.yaml files - these are regenerated on each install/update
            if (fileName === 'config.yaml') {
              continue;
            }

            if (!fileInfo) {
              // File not in manifest = custom file
              // EXCEPT: Agent .md files in module folders are generated files, not custom
              // Only treat .md files under _config/agents/ as custom
              if (!(fileName.endsWith('.md') && relativePath.includes('/agents/') && !relativePath.startsWith('_config/'))) {
                customFiles.push(fullPath);
              }
            } else if (manifestHasHashes && fileInfo.hash) {
              // File in manifest with hash - check if it was modified
              const currentHash = await this.manifest.calculateFileHash(fullPath);
              if (currentHash && currentHash !== fileInfo.hash) {
                // Hash changed = file was modified
                modifiedFiles.push({
                  path: fullPath,
                  relativePath: fileInfo.relativePath,
                });
              }
            }
          }
        }
      } catch {
        // Ignore errors scanning directories
      }
    };

    await scanDirectory(gomadDir);

    // WR-01: scan additional IDE roots (e.g. .claude/) that the manifest references,
    // but ONLY to detect modifications to files we already know about. We deliberately
    // do NOT flag unknown files in IDE roots as "custom" — those roots contain many
    // user/IDE files unrelated to GOMAD that should be left alone.
    for (const extraRoot of extraScanRoots) {
      if (!(await fs.pathExists(extraRoot))) continue;
      const scanForModifications = async (dir) => {
        try {
          const entries = await fs.readdir(dir, { withFileTypes: true });
          for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
              if (entry.name === 'node_modules' || entry.name === '.git') continue;
              await scanForModifications(fullPath);
            } else if (entry.isFile()) {
              const normalizedPath = path.normalize(fullPath);
              const fileInfo = installedFilesMap.get(normalizedPath);
              if (fileInfo && manifestHasHashes && fileInfo.hash) {
                const currentHash = await this.manifest.calculateFileHash(fullPath);
                if (currentHash && currentHash !== fileInfo.hash) {
                  modifiedFiles.push({
                    path: fullPath,
                    relativePath: fileInfo.relativePath,
                  });
                }
              }
            }
          }
        } catch {
          // Ignore errors scanning directories
        }
      };
      await scanForModifications(extraRoot);
    }

    return { customFiles, modifiedFiles };
  }

  /**
   * Generate clean config.yaml files for each installed module
   * @param {string} gomadDir - GOMAD installation directory
   * @param {Object} moduleConfigs - Collected configuration values
   */
  async generateModuleConfigs(gomadDir, moduleConfigs) {
    const yaml = require('yaml');

    // Extract core config values to share with other modules
    const coreConfig = moduleConfigs.core || {};

    // Get all installed module directories
    const entries = await fs.readdir(gomadDir, { withFileTypes: true });
    const installedModules = entries
      .filter((entry) => entry.isDirectory() && entry.name !== '_config' && entry.name !== 'docs')
      .map((entry) => entry.name);

    // Generate config.yaml for each installed module
    for (const moduleName of installedModules) {
      const modulePath = path.join(gomadDir, moduleName);

      // Get module-specific config or use empty object if none
      const config = moduleConfigs[moduleName] || {};

      if (await fs.pathExists(modulePath)) {
        const configPath = path.join(modulePath, 'config.yaml');

        // Create header
        const packageJson = require(path.join(getProjectRoot(), 'package.json'));
        const header = `# ${moduleName.toUpperCase()} Module Configuration
# Generated by GOMAD installer
# Version: ${packageJson.version}
# Date: ${new Date().toISOString()}

`;

        // For non-core modules, add core config values directly
        let finalConfig = { ...config };
        let coreSection = '';

        if (moduleName !== 'core' && coreConfig && Object.keys(coreConfig).length > 0) {
          // Add core values directly to the module config
          // These will be available for reference in the module
          finalConfig = {
            ...config,
            ...coreConfig, // Spread core config values directly into the module config
          };

          // Create a comment section to identify core values
          coreSection = '\n# Core Configuration Values\n';
        }

        // Clean the config to remove any non-serializable values (like functions)
        const cleanConfig = structuredClone(finalConfig);

        // Convert config to YAML
        let yamlContent = yaml.stringify(cleanConfig, {
          indent: 2,
          lineWidth: 0,
          minContentWidth: 0,
        });

        // If we have core values, reorganize the YAML to group them with their comment
        if (coreSection && moduleName !== 'core') {
          // Split the YAML into lines
          const lines = yamlContent.split('\n');
          const moduleConfigLines = [];
          const coreConfigLines = [];

          // Separate module-specific and core config lines
          for (const line of lines) {
            const key = line.split(':')[0].trim();
            if (Object.prototype.hasOwnProperty.call(coreConfig, key)) {
              coreConfigLines.push(line);
            } else {
              moduleConfigLines.push(line);
            }
          }

          // Rebuild YAML with module config first, then core config with comment
          yamlContent = moduleConfigLines.join('\n');
          if (coreConfigLines.length > 0) {
            yamlContent += coreSection + coreConfigLines.join('\n');
          }
        }

        // Write the clean config file with POSIX-compliant final newline
        const content = header + yamlContent;
        await fs.writeFile(configPath, content.endsWith('\n') ? content : content + '\n', 'utf8');

        // Track the config file in installedFiles
        this.installedFiles.add(configPath);
      }
    }
  }

  /**
   * Merge all module-help.csv files into a single gomad-help.csv
   * Scans all installed modules for module-help.csv and merges them
   * Enriches agent info from agent-manifest.csv
   * Output is written to _gomad/_config/gomad-help.csv
   * @param {string} gomadDir - GOMAD installation directory
   */
  async mergeModuleHelpCatalogs(gomadDir) {
    const allRows = [];
    const headerRow =
      'module,phase,name,code,sequence,workflow-file,command,required,agent-name,agent-command,agent-display-name,agent-title,options,description,output-location,outputs';

    // Load agent manifest for agent info lookup
    const agentManifestPath = path.join(gomadDir, '_config', 'agent-manifest.csv');
    const agentInfo = new Map(); // agent-name -> {command, displayName, title+icon}

    // Phase 09 (D-64): source module-help.csv and agent-manifest.csv now both
    // carry user-visible colon form (`gm:agent-*`) directly, so no
    // dash↔colon transform is needed at lookup or emit time.

    if (await fs.pathExists(agentManifestPath)) {
      // WR-04: parse with csv-parse/sync (header-aware) — the previous hand-rolled
      // split(',') broke on embedded commas in capabilities/role/principles, which
      // pushed `module` (cols[10]) out of position for every gomad agent.
      const manifestContent = await fs.readFile(agentManifestPath, 'utf8');
      const records = csv.parse(manifestContent, {
        columns: true,
        skip_empty_lines: true,
      });

      for (const r of records) {
        const agentName = (r.name || '').trim();
        if (!agentName) continue;
        // Store the lookup key as-is; both the manifest and module-help.csv
        // sources now carry user-visible colon form (D-64).
        const internalAgentName = agentName;
        const displayName = (r.displayName || '').trim();
        const title = (r.title || '').trim();
        const icon = (r.icon || '').trim();
        const module = (r.module || '').trim();

        // Both source and manifest carry colon form directly (D-64); the
        // lookup key IS the user-visible form.
        const userVisibleAgentName = internalAgentName;
        const agentCommand = module ? `gomad:${module}:agent:${userVisibleAgentName}` : `gomad:agent:${userVisibleAgentName}`;

        agentInfo.set(internalAgentName, {
          command: agentCommand,
          displayName: displayName || userVisibleAgentName,
          title: icon && title ? `${icon} ${title}` : title || userVisibleAgentName,
        });
      }
    }

    // Get all installed module directories
    const entries = await fs.readdir(gomadDir, { withFileTypes: true });
    const installedModules = entries
      .filter((entry) => entry.isDirectory() && entry.name !== '_config' && entry.name !== 'docs' && entry.name !== '_memory')
      .map((entry) => entry.name);

    // Add core module to scan (it's installed at root level as _config, but we check src/core-skills)
    const coreModulePath = getSourcePath('core-skills');
    const modulePaths = new Map();

    // Map all module source paths
    if (await fs.pathExists(coreModulePath)) {
      modulePaths.set('core', coreModulePath);
    }

    // Map installed module paths
    for (const moduleName of installedModules) {
      const modulePath = path.join(gomadDir, moduleName);
      modulePaths.set(moduleName, modulePath);
    }

    // Scan each module for module-help.csv
    for (const [moduleName, modulePath] of modulePaths) {
      const helpFilePath = path.join(modulePath, 'module-help.csv');

      if (await fs.pathExists(helpFilePath)) {
        try {
          const content = await fs.readFile(helpFilePath, 'utf8');
          const lines = content.split('\n').filter((line) => line.trim() && !line.startsWith('#'));

          for (const line of lines) {
            // Skip header row
            if (line.startsWith('module,')) {
              continue;
            }

            // Parse the line - handle quoted fields with commas
            const columns = this.parseCSVLine(line);
            if (columns.length >= 12) {
              // Map old schema to new schema
              // Old: module,phase,name,code,sequence,workflow-file,command,required,agent,options,description,output-location,outputs
              // New: module,phase,name,code,sequence,workflow-file,command,required,agent-name,agent-command,agent-display-name,agent-title,options,description,output-location,outputs

              const [
                module,
                phase,
                name,
                code,
                sequence,
                workflowFile,
                command,
                required,
                agentName,
                options,
                description,
                outputLocation,
                outputs,
              ] = columns;

              // If module column is empty, set it to this module's name (except for core which stays empty for universal tools)
              const finalModule = (!module || module.trim() === '') && moduleName !== 'core' ? moduleName : module || '';

              // D-64: source module-help.csv carries user-visible colon form
              // directly, so the merge is a straight pass-through — no
              // dash↔colon transform, no separate internal/emitted split.
              const rawAgentName = agentName ? agentName.trim() : '';
              const agentData = agentInfo.get(rawAgentName) || { command: '', displayName: '', title: '' };
              const emittedAgentName = rawAgentName;
              const emittedPhase = phase || '';

              // Build new row with agent info
              const newRow = [
                finalModule,
                emittedPhase,
                name || '',
                code || '',
                sequence || '',
                workflowFile || '',
                command || '',
                required || 'false',
                emittedAgentName,
                agentData.command,
                agentData.displayName,
                agentData.title,
                options || '',
                description || '',
                outputLocation || '',
                outputs || '',
              ];

              allRows.push(newRow.map((c) => this.escapeCSVField(c)).join(','));
            }
          }

          if (process.env.GOMAD_VERBOSE_INSTALL === 'true') {
            await prompts.log.message(`  Merged module-help from: ${moduleName}`);
          }
        } catch (error) {
          await prompts.log.warn(`  Warning: Failed to read module-help.csv from ${moduleName}: ${error.message}`);
        }
      }
    }

    // Sort by module, then phase, then sequence
    allRows.sort((a, b) => {
      const colsA = this.parseCSVLine(a);
      const colsB = this.parseCSVLine(b);

      // Module comparison (empty module/universal tools come first)
      const moduleA = (colsA[0] || '').toLowerCase();
      const moduleB = (colsB[0] || '').toLowerCase();
      if (moduleA !== moduleB) {
        return moduleA.localeCompare(moduleB);
      }

      // Phase comparison
      const phaseA = colsA[1] || '';
      const phaseB = colsB[1] || '';
      if (phaseA !== phaseB) {
        return phaseA.localeCompare(phaseB);
      }

      // Sequence comparison
      const seqA = parseInt(colsA[4] || '0', 10);
      const seqB = parseInt(colsB[4] || '0', 10);
      return seqA - seqB;
    });

    // Write merged catalog
    const outputDir = path.join(gomadDir, '_config');
    await fs.ensureDir(outputDir);
    const outputPath = path.join(outputDir, 'gomad-help.csv');

    const mergedContent = [headerRow, ...allRows].join('\n');
    await fs.writeFile(outputPath, mergedContent, 'utf8');

    // Track the installed file
    this.installedFiles.add(outputPath);

    if (process.env.GOMAD_VERBOSE_INSTALL === 'true') {
      await prompts.log.message(`  Generated gomad-help.csv: ${allRows.length} workflows`);
    }
  }

  /**
   * Render a consolidated install summary using prompts.note()
   * @param {Array} results - Array of {step, status: 'ok'|'error'|'warn', detail}
   * @param {Object} context - {gomadDir, modules, ides, customFiles, modifiedFiles}
   */
  async renderInstallSummary(results, context = {}) {
    const color = await prompts.getColor();
    const selectedIdes = new Set((context.ides || []).map((ide) => String(ide).toLowerCase()));

    // Build step lines with status indicators
    const lines = [];
    for (const r of results) {
      let stepLabel = null;

      if (r.status !== 'ok') {
        stepLabel = r.step;
      } else if (r.step === 'Core') {
        stepLabel = 'GOMAD';
      } else if (r.step.startsWith('Module: ')) {
        stepLabel = r.step;
      } else if (selectedIdes.has(String(r.step).toLowerCase())) {
        stepLabel = r.step;
      }

      if (!stepLabel) {
        continue;
      }

      let icon;
      if (r.status === 'ok') {
        icon = color.green('\u2713');
      } else if (r.status === 'warn') {
        icon = color.yellow('!');
      } else {
        icon = color.red('\u2717');
      }
      const detail = r.detail ? color.dim(` (${r.detail})`) : '';
      lines.push(`  ${icon}  ${stepLabel}${detail}`);
    }

    if ((context.ides || []).length === 0) {
      lines.push(`  ${color.green('\u2713')}  No IDE selected ${color.dim('(installed in _gomad only)')}`);
    }

    // Context and warnings
    lines.push('');
    if (context.gomadDir) {
      lines.push(`  Installed to: ${color.dim(context.gomadDir)}`);
    }
    if (context.customFiles && context.customFiles.length > 0) {
      lines.push(`  ${color.cyan(`Custom files preserved: ${context.customFiles.length}`)}`);
    }
    if (context.modifiedFiles && context.modifiedFiles.length > 0) {
      lines.push(`  ${color.yellow(`Modified files backed up (.bak): ${context.modifiedFiles.length}`)}`);
    }

    // Next steps
    lines.push('', '  Next steps:', `    Read our new Docs Site: ${color.dim('https://gomad.xgent.ai/')}`);
    if (context.ides && context.ides.length > 0) {
      lines.push(`    Invoke the ${color.cyan('gomad-help')} skill in your IDE Agent to get started`);
    }

    await prompts.note(lines.join('\n'), 'GOMAD is ready to use!');
  }

  /**
   * Quick update method - preserves all settings and only prompts for new config fields
   * @param {Object} config - Configuration with directory
   * @returns {Object} Update result
   */
  async quickUpdate(config) {
    const projectDir = path.resolve(config.directory);
    const { gomadDir } = await this.findGomadDir(projectDir);

    // Check if gomad directory exists
    if (!(await fs.pathExists(gomadDir))) {
      throw new Error(`GOMAD not installed at ${gomadDir}. Use regular install for first-time setup.`);
    }

    // Detect existing installation
    const existingInstall = await ExistingInstall.detect(gomadDir);
    const installedModules = existingInstall.moduleIds;
    const configuredIdes = existingInstall.ides;
    const projectRoot = path.dirname(gomadDir);

    const customModuleSources = await this.customModules.assembleQuickUpdateSources(config, existingInstall, gomadDir);

    // Get available modules (what we have source for)
    const availableModulesData = await new OfficialModules().listAvailable();
    const availableModules = [...availableModulesData.modules, ...availableModulesData.customModules];

    // Add custom modules from manifest if their sources exist
    for (const [moduleId, customModule] of customModuleSources) {
      const sourcePath = customModule.sourcePath;
      if (sourcePath && (await fs.pathExists(sourcePath)) && !availableModules.some((m) => m.id === moduleId)) {
        availableModules.push({
          id: moduleId,
          name: customModule.name || moduleId,
          path: sourcePath,
          isCustom: true,
          fromManifest: true,
        });
      }
    }

    // Handle missing custom module sources
    const customModuleResult = await this.handleMissingCustomSources(
      customModuleSources,
      gomadDir,
      projectRoot,
      'update',
      installedModules,
      config.skipPrompts || false,
    );

    const { validCustomModules, keptModulesWithoutSources } = customModuleResult;

    const customModulesFromManifest = validCustomModules.map((m) => ({
      ...m,
      isCustom: true,
      hasUpdate: true,
    }));

    const allAvailableModules = [...availableModules, ...customModulesFromManifest];
    const availableModuleIds = new Set(allAvailableModules.map((m) => m.id));

    // Only update modules that are BOTH installed AND available (we have source for)
    const modulesToUpdate = installedModules.filter((id) => availableModuleIds.has(id));
    const skippedModules = installedModules.filter((id) => !availableModuleIds.has(id));

    // Add custom modules that were kept without sources to the skipped modules
    for (const keptModule of keptModulesWithoutSources) {
      if (!skippedModules.includes(keptModule)) {
        skippedModules.push(keptModule);
      }
    }

    if (skippedModules.length > 0) {
      await prompts.log.warn(`Skipping ${skippedModules.length} module(s) - no source available: ${skippedModules.join(', ')}`);
    }

    // Load existing configs and collect new fields (if any)
    await prompts.log.info('Checking for new configuration options...');
    const quickModules = new OfficialModules();
    await quickModules.loadExistingConfig(projectDir);

    let promptedForNewFields = false;

    const corePrompted = await quickModules.collectModuleConfigQuick('core', projectDir, true);
    if (corePrompted) {
      promptedForNewFields = true;
    }

    for (const moduleName of modulesToUpdate) {
      const modulePrompted = await quickModules.collectModuleConfigQuick(moduleName, projectDir, true);
      if (modulePrompted) {
        promptedForNewFields = true;
      }
    }

    if (!promptedForNewFields) {
      await prompts.log.success('All configuration is up to date, no new options to configure');
    }

    quickModules.collectedConfig._meta = {
      version: require(path.join(getProjectRoot(), 'package.json')).version,
      installDate: new Date().toISOString(),
      lastModified: new Date().toISOString(),
    };

    // Build config and delegate to install()
    const installConfig = {
      directory: projectDir,
      modules: modulesToUpdate,
      ides: configuredIdes,
      coreConfig: quickModules.collectedConfig.core,
      moduleConfigs: quickModules.collectedConfig,
      actionType: 'install',
      _quickUpdate: true,
      _preserveModules: skippedModules,
      _customModuleSources: customModuleSources,
      _existingModules: installedModules,
      customContent: config.customContent,
    };

    await this.install(installConfig);

    return {
      success: true,
      moduleCount: modulesToUpdate.length,
      hadNewFields: promptedForNewFields,
      modules: modulesToUpdate,
      skippedModules: skippedModules,
      ides: configuredIdes,
    };
  }

  /**
   * Uninstall GOMAD with selective removal options
   * @param {string} directory - Project directory
   * @param {Object} options - Uninstall options
   * @param {boolean} [options.removeModules=true] - Remove _gomad/ directory
   * @param {boolean} [options.removeIdeConfigs=true] - Remove IDE configurations
   * @param {boolean} [options.removeOutputFolder=false] - Remove user artifacts output folder
   * @returns {Object} Result with success status and removed components
   */
  async uninstall(directory, options = {}) {
    const projectDir = path.resolve(directory);
    const { gomadDir } = await this.findGomadDir(projectDir);

    if (!(await fs.pathExists(gomadDir))) {
      return { success: false, reason: 'not-installed' };
    }

    // 1. DETECT: Read state BEFORE deleting anything
    const existingInstall = await ExistingInstall.detect(gomadDir);
    const outputFolder = await this._readOutputFolder(gomadDir);

    const removed = { modules: false, ideConfigs: false, outputFolder: false };

    // 2. IDE CLEANUP (before _gomad/ deletion so configs are accessible)
    if (options.removeIdeConfigs !== false) {
      await this.uninstallIdeConfigs(projectDir, existingInstall, { silent: options.silent });
      removed.ideConfigs = true;
    }

    // 3. OUTPUT FOLDER (only if explicitly requested)
    if (options.removeOutputFolder === true && outputFolder) {
      removed.outputFolder = await this.uninstallOutputFolder(projectDir, outputFolder);
    }

    // 4. GOMAD DIRECTORY (last, after everything that needs it)
    if (options.removeModules !== false) {
      removed.modules = await this.uninstallModules(projectDir);
    }

    return { success: true, removed, version: existingInstall.installed ? existingInstall.version : null };
  }

  /**
   * Uninstall IDE configurations only
   * @param {string} projectDir - Project directory
   * @param {Object} existingInstall - Detection result from detector.detect()
   * @param {Object} [options] - Options (e.g. { silent: true })
   * @returns {Promise<Object>} Results from IDE cleanup
   */
  async uninstallIdeConfigs(projectDir, existingInstall, options = {}) {
    await this.ideManager.ensureInitialized();
    const cleanupOptions = { isUninstall: true, silent: options.silent };
    const ideList = existingInstall.ides;
    if (ideList.length > 0) {
      return this.ideManager.cleanupByList(projectDir, ideList, cleanupOptions);
    }
    return this.ideManager.cleanup(projectDir, cleanupOptions);
  }

  /**
   * Remove user artifacts output folder
   * @param {string} projectDir - Project directory
   * @param {string} outputFolder - Output folder name (relative)
   * @returns {Promise<boolean>} Whether the folder was removed
   */
  async uninstallOutputFolder(projectDir, outputFolder) {
    if (!outputFolder) return false;
    const resolvedProject = path.resolve(projectDir);
    const outputPath = path.resolve(resolvedProject, outputFolder);
    if (!outputPath.startsWith(resolvedProject + path.sep)) {
      return false;
    }
    if (await fs.pathExists(outputPath)) {
      await fs.remove(outputPath);
      return true;
    }
    return false;
  }

  /**
   * Remove the _gomad/ directory
   * @param {string} projectDir - Project directory
   * @returns {Promise<boolean>} Whether the directory was removed
   */
  async uninstallModules(projectDir) {
    const { gomadDir } = await this.findGomadDir(projectDir);
    if (await fs.pathExists(gomadDir)) {
      await fs.remove(gomadDir);
      return true;
    }
    return false;
  }

  /**
   * Get installation status
   */
  async getStatus(directory) {
    const projectDir = path.resolve(directory);
    const { gomadDir } = await this.findGomadDir(projectDir);
    return await ExistingInstall.detect(gomadDir);
  }

  /**
   * Get available modules
   */
  async getAvailableModules() {
    return await new OfficialModules().listAvailable();
  }

  /**
   * Get the configured output folder name for a project
   * Resolves gomadDir internally from projectDir
   * @param {string} projectDir - Project directory
   * @returns {string} Output folder name (relative, default: '_gomad-output')
   */
  async getOutputFolder(projectDir) {
    const { gomadDir } = await this.findGomadDir(projectDir);
    return this._readOutputFolder(gomadDir);
  }

  /**
   * Handle missing custom module sources interactively
   * @param {Map} customModuleSources - Map of custom module ID to info
   * @param {string} gomadDir - GOMAD directory
   * @param {string} projectRoot - Project root directory
   * @param {string} operation - Current operation ('update', 'compile', etc.)
   * @param {Array} installedModules - Array of installed module IDs (will be modified)
   * @param {boolean} [skipPrompts=false] - Skip interactive prompts and keep all modules with missing sources
   * @returns {Object} Object with validCustomModules array and keptModulesWithoutSources array
   */
  async handleMissingCustomSources(customModuleSources, gomadDir, projectRoot, operation, installedModules, skipPrompts = false) {
    const validCustomModules = [];
    const keptModulesWithoutSources = []; // Track modules kept without sources
    const customModulesWithMissingSources = [];

    // Check which sources exist
    for (const [moduleId, customInfo] of customModuleSources) {
      if (await fs.pathExists(customInfo.sourcePath)) {
        validCustomModules.push({
          id: moduleId,
          name: customInfo.name,
          path: customInfo.sourcePath,
          info: customInfo,
        });
      } else {
        // For cached modules that are missing, we just skip them without prompting
        if (customInfo.cached) {
          // Skip cached modules without prompting
          keptModulesWithoutSources.push({
            id: moduleId,
            name: customInfo.name,
            cached: true,
          });
        } else {
          customModulesWithMissingSources.push({
            id: moduleId,
            name: customInfo.name,
            sourcePath: customInfo.sourcePath,
            relativePath: customInfo.relativePath,
            info: customInfo,
          });
        }
      }
    }

    // If no missing sources, return immediately
    if (customModulesWithMissingSources.length === 0) {
      return {
        validCustomModules,
        keptModulesWithoutSources: [],
      };
    }

    // Non-interactive mode: keep all modules with missing sources
    if (skipPrompts) {
      for (const missing of customModulesWithMissingSources) {
        keptModulesWithoutSources.push(missing.id);
      }
      return { validCustomModules, keptModulesWithoutSources };
    }

    await prompts.log.warn(`Found ${customModulesWithMissingSources.length} custom module(s) with missing sources:`);

    let keptCount = 0;
    let updatedCount = 0;
    let removedCount = 0;

    for (const missing of customModulesWithMissingSources) {
      await prompts.log.message(
        `${missing.name} (${missing.id})\n  Original source: ${missing.relativePath}\n  Full path: ${missing.sourcePath}`,
      );

      const choices = [
        {
          name: 'Keep installed (will not be processed)',
          value: 'keep',
          hint: 'Keep',
        },
        {
          name: 'Specify new source location',
          value: 'update',
          hint: 'Update',
        },
      ];

      // Only add remove option if not just compiling agents
      if (operation !== 'compile-agents') {
        choices.push({
          name: '⚠️  REMOVE module completely (destructive!)',
          value: 'remove',
          hint: 'Remove',
        });
      }

      const action = await prompts.select({
        message: `How would you like to handle "${missing.name}"?`,
        choices,
      });

      switch (action) {
        case 'update': {
          // Use sync validation because @clack/prompts doesn't support async validate
          const newSourcePath = await prompts.text({
            message: 'Enter the new path to the custom module:',
            default: missing.sourcePath,
            validate: (input) => {
              if (!input || input.trim() === '') {
                return 'Please enter a path';
              }
              const expandedPath = path.resolve(input.trim());
              if (!fs.pathExistsSync(expandedPath)) {
                return 'Path does not exist';
              }
              // Check if it looks like a valid module
              const moduleYamlPath = path.join(expandedPath, 'module.yaml');
              const agentsPath = path.join(expandedPath, 'agents');
              const workflowsPath = path.join(expandedPath, 'workflows');

              if (!fs.pathExistsSync(moduleYamlPath) && !fs.pathExistsSync(agentsPath) && !fs.pathExistsSync(workflowsPath)) {
                return 'Path does not appear to contain a valid custom module';
              }
              return; // clack expects undefined for valid input
            },
          });

          // Defensive: handleCancel should have exited, but guard against symbol propagation
          if (typeof newSourcePath !== 'string') {
            keptCount++;
            keptModulesWithoutSources.push(missing.id);
            continue;
          }

          // Update the source in manifest
          const resolvedPath = path.resolve(newSourcePath.trim());
          missing.info.sourcePath = resolvedPath;
          // Remove relativePath - we only store absolute sourcePath now
          delete missing.info.relativePath;
          await this.manifest.addCustomModule(gomadDir, missing.info);

          validCustomModules.push({
            id: missing.id,
            name: missing.name,
            path: resolvedPath,
            info: missing.info,
          });

          updatedCount++;
          await prompts.log.success('Updated source location');

          break;
        }
        case 'remove': {
          // Extra confirmation for destructive remove
          await prompts.log.error(
            `WARNING: This will PERMANENTLY DELETE "${missing.name}" and all its files!\n  Module location: ${path.join(gomadDir, missing.id)}`,
          );

          const confirmDelete = await prompts.confirm({
            message: 'Are you absolutely sure you want to delete this module?',
            default: false,
          });

          if (confirmDelete) {
            const typedConfirm = await prompts.text({
              message: 'Type "DELETE" to confirm permanent deletion:',
              validate: (input) => {
                if (input !== 'DELETE') {
                  return 'You must type "DELETE" exactly to proceed';
                }
                return; // clack expects undefined for valid input
              },
            });

            if (typedConfirm === 'DELETE') {
              // Remove the module from filesystem and manifest
              const modulePath = path.join(gomadDir, missing.id);
              if (await fs.pathExists(modulePath)) {
                const fsExtra = require('fs-extra');
                await fsExtra.remove(modulePath);
                await prompts.log.warn(`Deleted module directory: ${path.relative(projectRoot, modulePath)}`);
              }

              await this.manifest.removeModule(gomadDir, missing.id);
              await this.manifest.removeCustomModule(gomadDir, missing.id);
              await prompts.log.warn('Removed from manifest');

              // Also remove from installedModules list
              if (installedModules && installedModules.includes(missing.id)) {
                const index = installedModules.indexOf(missing.id);
                if (index !== -1) {
                  installedModules.splice(index, 1);
                }
              }

              removedCount++;
              await prompts.log.error(`"${missing.name}" has been permanently removed`);
            } else {
              await prompts.log.message('Removal cancelled - module will be kept');
              keptCount++;
            }
          } else {
            await prompts.log.message('Removal cancelled - module will be kept');
            keptCount++;
          }

          break;
        }
        case 'keep': {
          keptCount++;
          keptModulesWithoutSources.push(missing.id);
          await prompts.log.message('Module will be kept as-is');

          break;
        }
        // No default
      }
    }

    // Show summary
    if (keptCount > 0 || updatedCount > 0 || removedCount > 0) {
      let summary = 'Summary for custom modules with missing sources:';
      if (keptCount > 0) summary += `\n  • ${keptCount} module(s) kept as-is`;
      if (updatedCount > 0) summary += `\n  • ${updatedCount} module(s) updated with new sources`;
      if (removedCount > 0) summary += `\n  • ${removedCount} module(s) permanently deleted`;
      await prompts.log.message(summary);
    }

    return {
      validCustomModules,
      keptModulesWithoutSources,
    };
  }

  /**
   * Find the gomad installation directory in a project
   * Always uses the standard _gomad folder name
   * @param {string} projectDir - Project directory
   * @returns {Promise<Object>} { gomadDir: string }
   */
  async findGomadDir(projectDir) {
    const gomadDir = path.join(projectDir, GOMAD_FOLDER_NAME);
    return { gomadDir };
  }

  /**
   * Read the output_folder setting from module config files
   * Checks gomad/config.yaml first, then other module configs
   * @param {string} gomadDir - GOMAD installation directory
   * @returns {string} Output folder path or default
   */
  async _readOutputFolder(gomadDir) {
    const yaml = require('yaml');

    // Check gomad/config.yaml first (most common)
    const gomadConfigPath = path.join(gomadDir, 'gomad', 'config.yaml');
    if (await fs.pathExists(gomadConfigPath)) {
      try {
        const content = await fs.readFile(gomadConfigPath, 'utf8');
        const config = yaml.parse(content);
        if (config && config.output_folder) {
          // Strip {project-root}/ prefix if present
          return config.output_folder.replace(/^\{project-root\}[/\\]/, '');
        }
      } catch {
        // Fall through to other modules
      }
    }

    // Scan other module config.yaml files
    try {
      const entries = await fs.readdir(gomadDir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory() || entry.name === 'gomad' || entry.name.startsWith('_')) continue;
        const configPath = path.join(gomadDir, entry.name, 'config.yaml');
        if (await fs.pathExists(configPath)) {
          try {
            const content = await fs.readFile(configPath, 'utf8');
            const config = yaml.parse(content);
            if (config && config.output_folder) {
              return config.output_folder.replace(/^\{project-root\}[/\\]/, '');
            }
          } catch {
            // Continue scanning
          }
        }
      }
    } catch {
      // Directory scan failed
    }

    // Default fallback
    return '_gomad-output';
  }

  /**
   * Parse a CSV line, handling quoted fields
   * @param {string} line - CSV line to parse
   * @returns {Array} Array of field values
   */
  parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Escaped quote
          current += '"';
          i++; // Skip next quote
        } else {
          // Toggle quote mode
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current);
    return result;
  }

  /**
   * Escape a CSV field if it contains special characters
   * @param {string} field - Field value to escape
   * @returns {string} Escaped field
   */
  escapeCSVField(field) {
    if (field === null || field === undefined) {
      return '';
    }
    const str = String(field);
    // If field contains comma, quote, or newline, wrap in quotes and escape inner quotes
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replaceAll('"', '""')}"`;
    }
    return str;
  }
}

module.exports = { Installer };
