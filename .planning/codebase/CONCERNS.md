# Codebase Concerns

**Analysis Date:** 2026-04-07

## Tech Debt

**MCP Server Implementation (Phase 6) — Not Started:**
- Issue: `mobmad mcp` command is a stub with `console.log('TODO: Enable MCP server...')` placeholder
- Files: `bin/mobmad-cli.js:96`
- Impact: Users cannot configure MCP servers via CLI. Documented but unimplemented feature creates user confusion.
- Fix approach: Implement `mcp enable <name>` command to generate and install MCP config files. Coordinate with BMAD-METHOD's MCP configuration system.

**Hardcoded Directory Assumptions:**
- Issue: Installation assumes `~/.claude/` directory structure is fixed (rules/, commands/, scripts/hooks/, agents/). No validation that directories match BMAD-METHOD layout.
- Files: `tools/global-installer.js:22-25`, `tools/sync-upstream.js:20-25`
- Impact: Installation may silently install to wrong locations if user's BMAD-METHOD setup differs. Symlinks in ~/.claude/ could cause unpredictable behavior.
- Fix approach: Add validation in `install()` and `syncUpstream()` that directories exist and match expected structure before copying. Log warnings if paths differ from defaults.

**Empty Global/ Directories on Install:**
- Issue: If `global/` directories are empty, installer shows warning "Run Phase 4 content packaging first" but still succeeds, potentially leaving incomplete installation.
- Files: `tools/global-installer.js:152-165`
- Impact: Users may think installation succeeded when no assets were actually installed. No clear error message distinguishing between "packaging not done yet" and "install complete".
- Fix approach: Distinguish between "user hasn't packaged yet" (advisory) and "nothing to install" (error). Require `--skip-check` flag to allow empty install.

**Silent Failure in statSync:**
- Issue: `statSync(srcDir, { throwIfNoEntry: false })` returns null silently in `package-skills.js:83`, losing error context.
- Files: `tools/package-skills.js:83-86`
- Impact: When a skill fails to stat (permission error, broken symlink, race condition), only generic "stat failed" message is shown. Difficult to debug permission or symlink issues.
- Fix approach: Catch and log the underlying error from statSync when applicable. Pass error details to `packageSkill()` return value.

**Process.exit(0) in Curator on Cancel:**
- Issue: `curate()` calls `process.exit(0)` when user cancels at multiple prompts (lines 116, 129, 151).
- Files: `tools/curator.js:116, 129, 151`
- Impact: Exits immediately without cleanup (no return value to caller). If curator is called programmatically (not from CLI), caller has no way to handle cancellation gracefully. Test suite may be affected if cleanup runs.
- Fix approach: Return null or throw CancelledError instead of process.exit(). Let CLI handle exit code. Allows programmatic usage.

**Lockfile Overwrite Without Confirmation:**
- Issue: `writeLockfile()` overwrites existing `mobmad.lock.yaml` without prompting or preserving backup.
- Files: `tools/curator.js:184-191`
- Impact: User runs curator to adjust selections and accidentally overwrites a carefully crafted lockfile. No recovery path.
- Fix approach: Create timestamped backups of lockfile before overwriting (e.g., `mobmad.lock.yaml.backup-2026-04-07T...`). Add `--force` flag to skip backup.

## Known Bugs

**Symlink Handling in package-skills:**
- Symptoms: When copying skills from ~/.claude/skills/ that are symlinked directories, cpSync may not dereference correctly.
- Files: `tools/package-skills.js:90` (uses `dereference: true`, but stat check happens earlier)
- Trigger: Create symlink to a skill directory in ~/.claude/skills/, run `mobmad package`
- Workaround: Ensure all skills in ~/.claude/skills/ are actual directories, not symlinks. Or manually copy skill content before packaging.
- Root cause: `statSync()` at line 83 happens before `cpSync()` at line 90. If symlink target is inaccessible after stat check but before copy, copy fails silently.

**Preset Inheritance Not Validated Against Catalog:**
- Symptoms: Preset resolution succeeds even if referenced skills/agents don't exist in catalog.
- Files: `tools/curator.js:16-61` (resolvePreset)
- Trigger: Manually edit presets.yaml to add non-existent skill to a preset, then `mobmad curate --preset <name>`
- Workaround: Validate presets in test suite (test-presets.js does this, but runtime doesn't). Manual review required.
- Root cause: `resolvePreset()` merges arrays without cross-checking against catalog. Only tests validate.

**Incomplete Rollback on Partial Install Failure:**
- Symptoms: If `cpSync()` fails halfway through installing files, manifest is not updated but some files are already copied.
- Files: `tools/global-installer.js:177-195`
- Trigger: Disk full during install, or permission error mid-copy
- Workaround: Manual deletion of partially installed files, or use `mobmad uninstall --global` (restores from backup if available)
- Root cause: No transaction-like behavior. Files are copied, then manifest is written. If copy completes but manifest write fails, inconsistent state.

## Security Considerations

**Backup Directory Names Are Predictable:**
- Risk: Backup path pattern is `${targetDir}.mobmad-backup-${timestamp}`. Timestamp is ISO string with `-` separators. Can be guessed easily (only 1-day granularity).
- Files: `tools/global-installer.js:35-36`
- Current mitigation: Backups are in ~/.claude/, which is typically user-owned. Unlikely to be exploited in shared environments.
- Recommendations: Use random suffix (e.g., 8 random hex chars) instead of timestamp. Or include full ISO timestamp with milliseconds.

**No Validation of YAML File Integrity:**
- Risk: YAML parsing errors are caught silently in several places. If lockfile is corrupted, installer proceeds with partial selections.
- Files: `tools/package-skills.js:43, 50` (try-catch without re-throw)
- Current mitigation: Test suite validates catalogs; installer checks lockfile syntax at usage time.
- Recommendations: Add explicit YAML schema validation using a library like `joi` or `zod`. Fail loudly if YAML doesn't match expected schema.

**File Permissions Not Preserved:**
- Risk: Installed files may lose execute bit or be installed with wrong ownership.
- Files: `tools/global-installer.js:82` (cpSync doesn't preserve permissions by default)
- Current mitigation: Files are typically .md or .js scripts; execute bit is set by BMAD-METHOD later.
- Recommendations: For hook scripts, explicitly set execute bit after install: `chmod +x <hook-files>`. Test that hooks are executable after installation.

**No Checksum Verification:**
- Risk: Files could be modified in ~/.claude/ between installation and use without detection.
- Files: `tools/global-installer.js` (manifest tracks file count, not content hashes)
- Current mitigation: Installation creates timestamped backups. User can compare old vs new.
- Recommendations: Store SHA256 hashes of installed files in manifest. Provide `mobmad verify` command to check integrity.

## Performance Bottlenecks

**Recursive Directory Traversal on Every Install:**
- Problem: `collectFiles()` recursively walks entire directory tree for each asset type. On large rule directories (77 files), this is repeated for each install.
- Files: `tools/global-installer.js:52-66`
- Cause: No caching. Same function is called for backup + install. Full traversal happens twice.
- Improvement path: Cache directory tree for the duration of a single install operation. Consider lazy-loading if asset dirs are very large (unlikely with current ~100 files per type).

**YAML Parsing Happens Multiple Times:**
- Problem: Catalogs and presets are parsed fresh on each CLI invocation. No in-memory or file-system cache.
- Files: `tools/curator.js:11-14` (loadCatalog is called 5 times per curate), `tools/package-skills.js:134, 140` (catalog loaded twice)
- Cause: Synchronous fs.readFileSync + parseYaml for each asset. YAML parsing is slower than JSON.
- Improvement path: Implement a simple in-process cache for catalogs/presets. Or pre-generate a cache file on install. Low priority for current scale.

**No Parallel Copy Operations:**
- Problem: Files are copied sequentially in `installFiles()`. Modern systems could parallelize with Promise.all().
- Files: `tools/global-installer.js:78-83`
- Cause: Synchronous fs API used throughout (no async). Refactoring would require Promise-based rewrite.
- Improvement path: Switch to async fs API (fs/promises) and use Promise.all() for parallel copies. Medium effort, marginal performance gain for current file counts (~100-200 files).

## Fragile Areas

**Interactive Prompt State Machine (curator.js):**
- Files: `tools/curator.js:82-182`
- Why fragile: Multiple nested prompts with isCancel checks. If new prompt is added mid-sequence, flow logic breaks. Example: agent toggles don't happen if customize is false (line 161-173 skipped).
- Safe modification: Add comments documenting expected flow. Write tests for each path (full customize vs skip customize). Refactor into state machine if complexity grows.
- Test coverage: `test-installation.js` tests end-to-end flow, but doesn't test cancel paths. Consider adding cancel scenario to tests.

**Lockfile as Source of Truth (global-installer.js):**
- Files: `tools/global-installer.js:129-150`
- Why fragile: Lockfile is loaded and used to determine what to install. If lockfile is missing/corrupt and --preset is provided, curator is called to regenerate it. But if curator is called, lockfile is overwritten, losing previous selections.
- Safe modification: Distinguish between "create lockfile" (no prior selections) and "update lockfile" (preserve old selections if not explicitly overridden). Store backup of original lockfile before curator modifies it.
- Test coverage: `test-installation.js:curate + package flow` tests fresh install. Need test for "re-curate with existing lockfile" scenario.

**Manifest Tracking (global-installer.js):**
- Files: `tools/global-installer.js:169-199`
- Why fragile: Manifest is written at end of install. If install is interrupted (Ctrl+C, process kill), files are on disk but manifest isn't written. Next uninstall will restore backup incorrectly (manifest says nothing was installed).
- Safe modification: Write manifest incrementally as each asset type completes. Or use write-ahead log (write manifest, then copy files, then confirm). This requires error recovery logic.
- Test coverage: Tests don't simulate interrupted installations. Integration test should cover SIGTERM handling.

**File Path Assumptions Across OS:**
- Files: `tools/sync-upstream.js:20-25`, `tools/global-installer.js:22-25`
- Why fragile: Hardcoded paths use `join()` which is correct, but assumptions about directory structure aren't validated. On Windows, ~/.claude/ may be in different location or have different structure.
- Safe modification: Add platform detection at startup. Test on macOS, Linux, Windows. Use `process.platform` to emit warnings if on unsupported OS.
- Test coverage: Tests run on dev machine only. No CI for cross-platform testing.

## Scaling Limits

**Catalog Size:**
- Current capacity: 165 skills, 48 agents, 70 commands, 36 hooks (1478 lines total YAML)
- Limit: YAML parsing time becomes noticeable >500 items. Interactive prompts become unwieldy >100 items per category.
- Scaling path: Lazy-load catalogs per category. Use indexed catalog format (JSON Lines or SQLite) for faster parsing. Implement search/filter in curator to reduce displayed items.

**Global Asset Installation:**
- Current capacity: ~100-200 files (77 rule files, ~30 skills, ~10 commands, ~6 hooks)
- Limit: If rules/agents grows to 500+ files, installation time becomes noticeable (recursive walk + copy).
- Scaling path: Parallel file copying with fs/promises. Or use rsync-like incremental sync (only copy changed files). Implement file deduplication if same file appears in multiple asset types.

**Project Skills Directory:**
- Current capacity: mobmad packages ~14 skills in src/module/skills/ (from lockfile)
- Limit: If project bundles 100+ skills, src/module/ becomes large. Git performance may degrade. Package size grows.
- Scaling path: Use symlinks to ~/.claude/skills/ instead of copying. Or lazy-load skills on demand. Implement manifest-only mode (don't include skill content, fetch from registry).

## Missing Critical Features

**No Pre-Install Compatibility Check:**
- Problem: installer doesn't verify BMAD-METHOD version, Node.js version, or ~/.claude/ structure before installing
- Blocks: Users with incompatible BMAD-METHOD v5.x or old Node.js versions will have silent failures
- Improvement: Add check in `install()` to verify bmad-method peer dependency is installed and correct version. Exit with clear error if not.

**No Uninstall Selectivity:**
- Problem: `mobmad uninstall --global` restores ALL assets from backup, even if user only wanted to remove certain skills
- Blocks: User can't selectively uninstall one skill without uninstalling everything
- Improvement: Add `mobmad uninstall --asset-type rules` or `mobmad uninstall --skill <name>` to allow partial uninstall.

**No Diff/Preview Before Install:**
- Problem: User runs `mobmad install` and doesn't see what will change until files are already copied
- Blocks: Users with custom modifications to ~/.claude/ may accidentally overwrite them without warning
- Improvement: Add `mobmad install --dry-run` to show what will be copied without actually copying. Add `--show-diff` to compare old vs new files.

## Test Coverage Gaps

**Interactive Prompt Cancellation Paths:**
- What's not tested: Cancel at each prompt (preset selection, customize confirm, skill multiselect, agent multiselect)
- Files: `tools/curator.js:114-151` has 4 isCancel checks
- Risk: process.exit(0) may have side effects if curator is called programmatically; tests don't catch this
- Priority: Medium

**Error Handling in statSync/cpSync:**
- What's not tested: EACCES (permission denied), ENOSPC (disk full), EISDIR (wrong type), symlink target missing
- Files: `tools/package-skills.js:83-90`, `tools/global-installer.js:78-83`
- Risk: Silent failures or incomplete installations with generic error messages
- Priority: High (affects user experience)

**Partial Install Recovery:**
- What's not tested: Install interrupted mid-copy (Ctrl+C), or copy fails halfway
- Files: `tools/global-installer.js:177-199`
- Risk: Inconsistent state where some files installed but manifest not written
- Priority: High (data integrity)

**Symlink Handling:**
- What's not tested: Skills in ~/.claude/skills/ that are symlinks to external directories
- Files: `tools/package-skills.js:90` (dereference: true), `tools/sync-upstream.js:73` (cpSync without dereference)
- Risk: Broken symlinks cause silent failures or incomplete copies
- Priority: Medium

**Cross-Platform Paths (Windows):**
- What's not tested: Installation on Windows (CI runs on Linux/macOS only)
- Files: Path manipulation throughout `tools/` uses `join()`, but no validation of Windows-specific issues
- Risk: Path separators, long paths (>260 chars), permission model differences not caught
- Priority: Low (not advertised as Windows-compatible yet)

**Corrupt/Malformed YAML:**
- What's not tested: Manually created corrupted catalog or lockfile
- Files: `tools/package-skills.js:43`, `tools/curator.js:16` (try-catch without re-throw)
- Risk: Silent failures or confusing error messages from YAML parser
- Priority: Medium

---

*Concerns audit: 2026-04-07*
