---
phase: 02-project-local-install
reviewed: 2026-04-07T00:00:00Z
depth: standard
files_reviewed: 5
files_reviewed_list:
  - bin/gomad-cli.js
  - test/test-installation.js
  - test/test-module.js
  - tools/curator.js
  - tools/installer.js
findings:
  critical: 0
  warning: 4
  info: 5
  total: 9
status: issues_found
---

# Phase 02: Code Review Report

**Reviewed:** 2026-04-07
**Depth:** standard
**Files Reviewed:** 5
**Status:** issues_found

## Summary

Phase 02 successfully refactors the installer to write to project-local `./.claude/` instead of `~/.claude/`, with good test coverage validating the homedir-free guarantee. The code is clean, functional, and consistent with project conventions. No critical security or correctness issues were found.

The warnings cluster around defensive programming in the installer/curator: corrupt or empty YAML files can crash the CLI, the `uninstall` flow leaves empty directories behind, and the curator silently ignores cancellation in one branch (inconsistent with neighboring branches that exit cleanly). The info items cover small consistency and UX improvements.

No source files were modified.

## Warnings

### WR-01: `loadManifest()` crashes on empty or corrupt YAML

**File:** `tools/installer.js:79-85`
**Issue:** When `MANIFEST_PATH` exists but is empty or contains invalid YAML, `parseYaml(raw)` returns `null` (or throws). The function returns that value directly, and downstream callers (`status()`, `uninstall()`) immediately access `manifest.installed_at`, throwing `TypeError: Cannot read properties of null`. The same issue applies to `loadLockfile()` at lines 70-74.
**Fix:**
```javascript
function loadManifest() {
  if (!existsSync(MANIFEST_PATH)) {
    return { installed_at: null, version: null, files: {} };
  }
  try {
    const raw = readFileSync(MANIFEST_PATH, 'utf8');
    const parsed = parseYaml(raw);
    return parsed ?? { installed_at: null, version: null, files: {} };
  } catch (err) {
    console.warn(chalk.yellow(`Warning: manifest at ${MANIFEST_PATH} is corrupt (${err.message}); treating as empty.`));
    return { installed_at: null, version: null, files: {} };
  }
}
```
Apply the same null-guard / try-catch to `loadLockfile()`.

### WR-02: Curator silently ignores cancel during agent multiselect

**File:** `tools/curator.js:171-173`
**Issue:** Every other `p.isCancel(...)` branch in `curate()` exits with `process.exit(0)`. The agent multiselect branch instead does `if (!p.isCancel(agentSelected)) { resolved.agents = agentSelected; }`, meaning a Ctrl-C during agent selection silently keeps the preset's agent list and proceeds to write the lockfile. This is inconsistent and surprising — users pressing Ctrl-C expect cancellation, not partial commit.
**Fix:**
```javascript
if (p.isCancel(agentSelected)) {
  p.cancel('Curation cancelled.');
  process.exit(0);
}
resolved.agents = agentSelected;
```

### WR-03: `install` forces non-interactive mode whenever `--preset` is supplied

**File:** `tools/installer.js:113-117`
**Issue:** `yes: options.yes || !!options.preset` coerces `--preset <name>` (without `--yes`) into non-interactive mode. The CLI option help text only documents `-y, --yes` as the way to skip prompts, so a user running `gomad install --preset lean` expecting an interactive customization step gets none. This silently changes behavior based on a flag the user didn't pass.
**Fix:** Either drop the `|| !!options.preset` coercion so `--preset` alone still allows customization, or update `bin/gomad-cli.js:22` help text to explicitly document that `--preset` implies `--yes`. Preferred: drop the coercion.
```javascript
await curate({
  preset: options.preset || 'full-stack',
  yes: options.yes,
});
```

### WR-04: `uninstall()` leaves empty directories and ignores `rmSync` race conditions

**File:** `tools/installer.js:196-203`
**Issue:** Two related issues:
1. After removing tracked files, empty subdirectories (e.g. `.claude/rules/python/`) are left behind, polluting the user's project.
2. `rmSync(filePath)` without `{ force: true }` will throw if the file disappears between the `existsSync` check and the `rmSync` call (TOCTOU race), aborting the entire uninstall mid-flight.
**Fix:**
```javascript
for (const file of fileList) {
  const filePath = join(target, file);
  try {
    rmSync(filePath, { force: true });
    assetRemoved++;
    removed++;
  } catch (err) {
    console.warn(chalk.yellow(`  could not remove ${file}: ${err.message}`));
  }
}
// After loop: prune empty parent directories under `target`
```
Add a small `pruneEmptyDirs(target)` helper that walks bottom-up and removes empty directories.

## Info

### IN-01: `mcp enable` action is a TODO stub but exits 0

**File:** `bin/gomad-cli.js:70-71`
**Issue:** `gomad mcp enable foo` prints `TODO: Enable MCP server "foo"` and exits with code 0. Scripts/CI will treat this as success. Phase 6 isn't implemented, but the command should signal "not implemented" via a non-zero exit.
**Fix:** `console.error('mcp enable is not yet implemented (Phase 6).'); process.exitCode = 1;`

### IN-02: `mcp` invalid usage exits 0

**File:** `bin/gomad-cli.js:72-74`
**Issue:** Falling through to the usage hint also exits 0, so a typo like `gomad mcp foo` looks successful.
**Fix:** `process.exitCode = 1;` after printing the usage line.

### IN-03: `status()` is not awaited but is synchronous — `bin/gomad-cli.js:42` calls it without await

**File:** `bin/gomad-cli.js:40-43`
**Issue:** Minor consistency: `install`, `curate`, `uninstall`, `package` actions are all `async` and `await`, but `status` is sync and not awaited. This works today but breaks if `status()` ever becomes async. Either keep it sync intentionally (add a comment) or make all actions uniform.
**Fix:** Add `await status();` or document the choice.

### IN-04: `collectFiles` does not guard against symlink cycles

**File:** `tools/installer.js:29-43`
**Issue:** `statSync` follows symlinks. A symlinked directory pointing back into the source tree would cause infinite recursion. Risk is low (assets/ is project-controlled), but worth a `lstatSync` and a skip-on-symlink rule for defense in depth.
**Fix:**
```javascript
const stat = statSync(full);
if (stat.isSymbolicLink()) continue; // or use lstatSync above
```

### IN-05: Lockfile has no schema validation on read

**File:** `tools/installer.js:70-74`, `tools/curator.js:184-192`
**Issue:** `loadLockfile()` returns whatever YAML parses into. Downstream code assumes `lockfile.version`, `lockfile.skills`, etc. exist. A hand-edited or older-version lockfile could yield confusing crashes. Project CLAUDE.md notes "Validation-first approach" and lockfile is part of the public contract.
**Fix:** Add a small `validateLockfile(obj)` that asserts `version` is present and arrays exist (or coerces to defaults), and call it from `loadLockfile()`.

---

_Reviewed: 2026-04-07_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
