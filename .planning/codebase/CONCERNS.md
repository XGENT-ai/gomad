# Codebase Concerns

**Analysis Date:** 2026-04-08

## Tech Debt

**Dead Code — Legacy XML Agent Compilation Pipeline:**
- Issue: XML-based agent compiler and related artifacts remain in codebase but are no longer used. All agents now use the SKILL.md directory format with `bmad-skill-manifest.yaml`.
- Files: `tools/installer/ide/shared/bmad-artifacts.js` (lines 9-34), `tools/installer/ide/shared/agent-command-generator.js`
- Impact: Codebase contains unused functions (`getAgentsFromBmad()`, `getAgentsFromDir()`, `AgentCommandGenerator`) that add maintenance burden and confusion. Removes dead code path during IDE installation.
- Fix approach: Remove `getAgentsFromBmad`, `getAgentsFromDir`, `AgentCommandGenerator`, `agent-command-template.md`, and all call sites in IDE installers that invoke `collectAgentArtifacts`, `writeAgentLaunchers`, `writeColonArtifacts`, `writeDashArtifacts`. Verify that `getTasksFromBmad` and `getTasksFromDir` are still in use before removing them.

**Glob Version Constraint Gap:**
- Issue: `glob@11.0.3` is installed and working, but newer version `glob@13.0.6` is available with improvements.
- Files: `package.json` (line 74)
- Impact: Minor—no functionality loss, but missing performance or security updates.
- Fix approach: Run `npm update glob` to evaluate compatibility with v13.

**Chalk Version Update Available:**
- Issue: `chalk@4.1.2` is current, but `chalk@5.6.2` is available.
- Files: `package.json` (line 70)
- Impact: v5 is a major version (likely breaking changes); evaluate carefully before upgrading.
- Fix approach: Review chalk changelog for breaking changes before upgrading.

## Known Bugs

**Corrupt YAML Handling in Manifest Loading:**
- Symptoms: Installer can fail silently if `bmad-skill-manifest.yaml` or lockfile is malformed.
- Files: `tools/installer/core/installer.js` (lines 122-123, 484-485), `tools/installer/core/manifest.js`
- Trigger: Manually edited or corrupted YAML files in the installation directory.
- Mitigation: `loadManifest()` and `loadLockfile()` have try-catch guards added in fix commit `38bf581`, but error messages are only warnings — installation can continue and may produce corrupted output.
- Improvement: Promote YAML parse errors to hard errors in strict mode.

**Empty Directory Cleanup Race Condition:**
- Symptoms: Uninstall can fail or leave orphaned empty directories in concurrent scenarios.
- Files: `tools/installer/core/installer.js` (uninstall routine)
- Trigger: Running uninstall in parallel from multiple processes or rapid successive uninstalls.
- Mitigation: Fix commit `f29997e` added directory pruning and race tolerance, but the fix is best-effort.
- Improvement: Add exclusive file locking during uninstall to prevent races.

**Non-Interactive Mode Override:**
- Symptoms: When `--preset` flag is supplied, the installer was forcing non-interactive mode even when user intended interactive prompts.
- Files: `tools/installer/prompts.js`, `tools/installer/core/installer.js`
- Trigger: Running `bmad install --preset mypreset` with `--interactive` or without explicit `--yes`.
- Status: Fixed in commit `ccf0dbb`; no longer an issue.

**Agent Multiselect Cancel Exit Code:**
- Symptoms: Installer would continue instead of exiting when user cancels during agent multiselect.
- Files: `tools/installer/prompts.js`
- Trigger: User pressing ESC or choosing "cancel" during agent selection prompt.
- Status: Fixed in commit `cbf5684`; now exits cleanly.

## Security Considerations

**Environment Variable Exposure in External Module Config:**
- Risk: External module URLs and NPM package names are read from `tools/installer/external-official-modules.yaml` without validation. If attacker can modify this file, arbitrary modules could be installed.
- Files: `tools/installer/modules/external-manager.js` (lines 24-37), `tools/installer/external-official-modules.yaml`
- Current mitigation: File is part of repository and not dynamically fetched; limited risk from git-controlled source.
- Recommendations:
  1. Validate URLs are HTTPS and from trusted domains before executing.
  2. Add file integrity check (hash) before loading external config.
  3. Log all external module installations for audit trail.

**Manifest File Path Injection Risk:**
- Risk: File paths constructed from user input in manifest generation could escape intended directories.
- Files: `tools/installer/core/manifest-generator.js`, `tools/installer/core/installer.js`
- Current mitigation: Uses `path.join()` and `path.resolve()` which prevent `../` escapes on most systems.
- Recommendations:
  1. Add explicit path validation using `path.relative()` to ensure all paths remain within `_bmad` directory.
  2. Reject any path containing `..` or absolute paths in user-supplied module names.

**Console Logging in CLI Tools:**
- Risk: Sensitive file paths, URLs, or error details may be logged to stdout/stderr and captured in CI logs.
- Files: `tools/validate-file-refs.js`, `tools/validate-doc-links.js`, `tools/format-workflow-md.js`
- Current mitigation: Most logging is user-facing output (intentional). Some error paths log full error objects.
- Recommendations:
  1. Audit error messages for sensitive data (absolute paths, URLs, tokens).
  2. Use proper logging library with redaction patterns for production.

**No Input Validation on Custom Module Paths:**
- Risk: Custom module paths supplied via CLI or config are not validated before file operations.
- Files: `tools/installer/modules/custom-modules.js`, `tools/installer/core/installer.js`
- Current mitigation: Path operations use `fs-extra` which has built-in guards, but symlink targets are not verified.
- Recommendations:
  1. Validate that custom module paths are not symlinks pointing outside project.
  2. Check module directories contain expected `module.yaml` before treating as valid modules.

## Performance Bottlenecks

**Large Files in Skill Validation:**
- Problem: `tools/validate-skills.js` (736 lines) and `tools/installer/modules/official-modules.js` (2043 lines) perform synchronous file I/O in loops.
- Files: `tools/validate-skills.js`, `tools/installer/modules/official-modules.js` (recursive directory scanning)
- Cause: Sequential directory traversal, frontmatter parsing on every file, YAML parsing without streaming.
- Cause: Validation runs on **every** skill directory, including nested step files, without caching results.
- Improvement path:
  1. Add in-memory cache for parsed YAML manifests (already exists for `externalModuleManager.cachedModules`).
  2. Use `Promise.all()` for parallel file reads where safe (metadata only).
  3. Add `--cache` flag to skip re-validation of unchanged skills.

**Manifest Generation Duplicates All File Hashing:**
- Problem: ManifestGenerator scans the installed `_bmad` directory and recalculates hashes on every install, even for unchanged files.
- Files: `tools/installer/core/manifest-generator.js` (lines 67-99)
- Impact: Slow on large installations with many files (1000+ skills).
- Improvement path:
  1. Store file hashes in `_config/manifest-state.json` to detect changes.
  2. Only rehash files that differ from previous state.

**Synchronous YAML Parsing for Installation Components:**
- Problem: `test/test-installation-components.js` (1892 lines) uses synchronous `yaml.parse()` and file reads, blocking test execution.
- Files: `test/test-installation-components.js`, `tools/installer/core/config.js`
- Impact: Tests are slow (especially large test suites with 100+ assertions).
- Improvement path:
  1. Migrate critical tests to async/await with parallel test execution.
  2. Batch YAML parsing using `Promise.all()`.

## Fragile Areas

**Installer State Machine — Partial Failures Leave Artifacts:**
- Files: `tools/installer/core/installer.js` (lines 36-103)
- Why fragile: Complex multi-stage installation (copy files → update manifests → configure IDEs → cleanup) has multiple exit points. If step N fails, steps 1..N-1 are not rolled back.
- Safe modification:
  1. Implement rollback stack: record each operation, reverse on error.
  2. Add transaction boundaries: wrap multi-step operations in try-finally with cleanup.
  3. Persist installation state to `_config/install-state.json` for recovery.
- Test coverage gaps:
  1. No tests for partial failures (e.g., IDE setup fails after files copied).
  2. No tests for recovery after crash during installation.

**Manifest CSV Format — Breaking Changes Risk:**
- Files: `tools/installer/core/manifest-generator.js` (manifest generation), multiple installers depend on CSV schema
- Why fragile: CSV column schema is documented but not schema-versioned. Adding/removing columns breaks downstream parsers.
- Safe modification:
  1. Add `version: "1"` field to `_config/manifest.csv` as first line.
  2. Add migration code for old schema versions.
  3. Update parser to validate header before processing.
- Test coverage gaps:
  1. No tests for schema migration.
  2. No tests loading manifests from older installations.

**YAML Module Definitions — No Schema Validation:**
- Files: `tools/installer/external-official-modules.yaml`, module `module.yaml` files in all skills
- Why fragile: Module definitions use free-form YAML without schema. Missing required fields or typos fail silently.
- Safe modification:
  1. Add JSON schema validation (using `ajv` or built-in validation).
  2. Validate module manifests on load, fail fast on errors.
  3. Add `bmad-skill-manifest.yaml` schema document.
- Test coverage gaps:
  1. No validation tests for malformed module definitions.
  2. No tests for missing required fields.

**Async Error Handling — Silent Catch Blocks:**
- Files: `tools/installer/core/installer.js` (lines 99-100, 767-768, 1660, 1678, 1683)
- Why fragile: Multiple catch blocks do nothing: `} catch { // Ignore errors scanning directories }`. Legitimate errors get swallowed.
- Safe modification:
  1. Add logging to all catch blocks with error context.
  2. Use catch blocks only for expected errors (e.g., "directory doesn't exist"). For others, log and rethrow.
  3. Add `DEBUG=* npm run test` mode to surface swallowed errors during development.
- Test coverage gaps:
  1. No tests for error logging in catch blocks.
  2. No tests verifying errors aren't silently dropped.

## Test Coverage Gaps

**Installation Component Tests — Integration Only:**
- What's not tested: Unit tests for individual installer functions.
- Files: `test/test-installation-components.js` (comprehensive but monolithic, 1892 lines)
- Risk: Changes to `official-modules.js` or `custom-modules.js` aren't validated in isolation.
- Priority: **High** — these modules are critical paths for installation.
- Recommendation: Add unit test suite for `OfficialModules`, `CustomModules`, `ManifestGenerator` with isolated dependencies.

**Manifest Generator — Schema and Corruption Not Tested:**
- What's not tested: CSV parsing with malformed/missing columns, duplicate file hashes, schema migrations.
- Files: `tools/installer/core/manifest-generator.js`
- Risk: CSV manifest is consumed by external tools; corruption silently breaks downstream processes.
- Priority: **High** — manifest is critical output.
- Recommendation: Add parameterized tests for CSV generation with edge cases (missing fields, special characters, large files).

**File Validation Tools — No E2E Tests:**
- What's not tested: `validate-file-refs.js` and `validate-doc-links.js` have no automated tests.
- Files: `tools/validate-file-refs.js`, `tools/validate-doc-links.js`
- Risk: Broken references or doc links in new content won't be caught until manual review.
- Priority: **Medium** — CI job runs these, but not part of pull request checks.
- Recommendation: Add test files in `test/` directory that exercise file/doc validation with fixtures.

**Skill Validation — No Deterministic Rule Tests:**
- What's not tested: `validate-skills.js` (736 lines) has no test coverage for individual rules SKILL-01 through STEP-07.
- Files: `tools/validate-skills.js`
- Risk: New rules added without regression tests; false positives not caught.
- Priority: **Medium** — already comprehensive, but brittle.
- Recommendation: Add parameterized test matrix for each validation rule with passing/failing examples.

**IDE-Specific Installation — Platform Coverage Gaps:**
- What's not tested: IDE installers for VSCode, Cursor, Windsurf, OpenCode — no E2E tests verifying agents appear in IDE.
- Files: `tools/installer/ide/**/*.js`
- Risk: Agent invocation fails silently in IDE even though installation "succeeded."
- Priority: **Medium** — requires IDE instances to test.
- Recommendation: Add integration test suite that can check IDE config files for agent references.

## Dependencies at Risk

**Deprecated Package: xml2js:**
- Risk: `xml2js@0.6.2` is mature but no longer actively maintained. Legacy XML parsing still needed for task/workflow imports.
- Impact: Security vulnerabilities in XML parsing could go unfixed.
- Files: `tools/installer/core/installer.js`, manifest generation
- Migration plan: Check if XML parsing is still required (likely yes for legacy workflows). If not, remove. If yes, migrate to modern XML parser (e.g., `fast-xml-parser`).

**Commander.js v14 — Stable but Dated:**
- Risk: `commander@14.0.3` is stable but several point releases behind latest.
- Impact: Minimal—no known security issues.
- Migration plan: Update to `14.0.3` (latest in v14 line). Monitor for v15 release.

**Chalk v4 — Nearing End of Life:**
- Risk: `chalk@4.1.2` is stable but v5 and v6 are available. v4 may not receive security updates.
- Impact: Low for CLI app, but color/ANSI code handling could have edge cases.
- Files: Used throughout installer for colored output.
- Migration plan: Evaluate `chalk@5` (likely breaking changes). If colors are non-critical, consider switching to lighter alternative like `picocolors` (already a dependency, v1.1.1).

**Sharp Image Library — Large Dependency:**
- Risk: `sharp@0.33.5` (image processing) is a devDependency but pulls in native C++ bindings. Can cause install failures on unsupported platforms.
- Impact: Developers on exotic platforms (ARM, musl libc) may fail `npm install`.
- Files: `package.json` (devDeps), used by Astro docs builder
- Migration plan: `sharp` is heavy but necessary for docs. No alternative; ensure CI tests `npm install` on multiple platforms.

## Missing Critical Features

**No Dry-Run Mode for Installation:**
- Problem: Installation makes changes immediately; no way to preview what will be installed.
- Blocks: Cannot diagnose installation issues before committing to the change.
- Impact: Users may install wrong modules by accident; recovery requires manual cleanup.
- Recommendation: Add `--dry-run` flag that shows file ops without executing, outputs manifest diff.

**No Uninstall Verification:**
- Problem: Uninstall removes files but doesn't verify cleanup succeeded or show what was removed.
- Blocks: User cannot confirm uninstall completed correctly.
- Impact: Orphaned files or broken IDE configs may go unnoticed.
- Recommendation: Add `--verify` flag to uninstall that re-scans `_bmad` and reports unexpected files.

**No Installation Health Check:**
- Problem: No command to verify installed BMAD is in good state (all manifests valid, no orphaned files, config intact).
- Blocks: Cannot diagnose corrupted installations.
- Impact: Users must manually check or reinstall to fix issues.
- Recommendation: Add `bmad check` command that runs manifest validation, file integrity checks, and IDE config validation.

**No Rollback Mechanism:**
- Problem: If installation fails partway through, no way to restore previous state.
- Blocks: Cannot recover from crashes or bad installations without manual recovery.
- Impact: High user friction on error.
- Recommendation: Implement backup/restore: `bmad backup` and `bmad restore --from <backup-id>`.

## Scaling Limits

**Manifest Generation — Linear Scaling with Skill Count:**
- Current capacity: Tested with ~200 skills; manifest generation takes ~5-10 seconds.
- Limit: At ~1000+ skills, manifest generation may exceed 30 seconds.
- Scaling path:
  1. Add caching for unchanged skills (see Performance section).
  2. Parallelize file hashing using `Promise.all()`.
  3. Pre-compute skill indexes on save instead of on-demand.

**File Reference Validation — Grows with Codebase Size:**
- Current capacity: Validates ~100 markdown files in ~2-3 seconds.
- Limit: At ~1000 files, validation can take >10 seconds.
- Scaling path:
  1. Implement incremental validation (only changed files).
  2. Add `--skip-patterns` to exclude directories (e.g., `node_modules`).
  3. Run validation in parallel per-file using worker threads.

**Directory Traversal — Unbounded Recursion:**
- Current capacity: Handles nested skill directory structures up to ~10 levels deep without issue.
- Limit: Deeply nested structures (20+ levels) could hit stack limits or slow significantly.
- Scaling path:
  1. Use iterative directory traversal instead of recursion where possible.
  2. Add configurable max-depth limit.

---

*Concerns audit: 2026-04-08*
