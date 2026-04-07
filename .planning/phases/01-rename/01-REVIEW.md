---
phase: 01-rename
reviewed: 2026-04-07T14:00:00Z
depth: standard
files_reviewed: 19
files_reviewed_list:
  - bin/gomad-cli.js
  - catalog/agents.yaml
  - catalog/commands.yaml
  - catalog/hooks.yaml
  - catalog/presets.yaml
  - catalog/skills.yaml
  - CLAUDE.md
  - package.json
  - README.md
  - src/module/agents/skill-manifest.yaml
  - src/module/module-help.csv
  - src/module/module.yaml
  - test/test-installation.js
  - test/test-module.js
  - test/test-presets.js
  - tools/curator.js
  - tools/global-installer.js
  - tools/package-skills.js
  - tools/sync-upstream.js
findings:
  critical: 1
  warning: 7
  info: 5
  total: 13
status: issues_found
---

# Phase 01-rename: Code Review Report

**Reviewed:** 2026-04-07T14:00:00Z
**Depth:** standard
**Files Reviewed:** 19
**Status:** issues_found

## Summary

Reviewed 19 files across the gomad CLI tool: the CLI entry point, 5 catalog YAML files, module definitions, 3 test files, and 4 tool modules. The rename from "mobmad" to "gomad" is complete in user-facing surfaces (CLI binary name, package.json name, lockfile name, README). However, the internal module code `mob` and its derived identifiers (`mob-*` canonicalIds, `module: mob`) persist in module.yaml, skill-manifest.yaml, module-help.csv, package-skills.js, and test assertions. CLAUDE.md contains multiple stale references. Beyond the rename, there is a data integrity bug in the uninstall flow, a duplicate catalog entry, missing cycle detection in preset resolution, and a constraint contradiction regarding global writes.

## Critical Issues

### CR-01: Uninstall `rmSync` on individual files will throw EISDIR on directory entries

**File:** `tools/global-installer.js:309`
**Issue:** In the `uninstallGlobal()` function, when no backup exists, the code iterates `installedFiles` and calls `rmSync(filePath)` without `{ recursive: true }`. The `installedFiles` array is populated by `collectFiles()` which returns relative paths of files only. However, `installFiles()` uses `cpSync` with `recursive: true`, which can create subdirectories. If the manifest's `files[assetType]` list contains a path where only a parent directory remains (after child files are deleted in a previous uninstall attempt or manual cleanup), calling `rmSync` on a directory path without `{ recursive: true }` will throw an `EISDIR` error, crashing the uninstall process mid-way and leaving a partially cleaned state.
**Fix:**
```javascript
// Line 309: Add recursive and force options for safe removal
for (const file of installedFiles) {
  const filePath = join(target, file);
  if (existsSync(filePath)) {
    rmSync(filePath, { recursive: true, force: true });
    removed++;
  }
}
```

## Warnings

### WR-01: Duplicate skill entry "connections-optimizer" in skills catalog

**File:** `catalog/skills.yaml:353-355` and `catalog/skills.yaml:503-505`
**Issue:** The skill `connections-optimizer` appears twice -- once in the "Tools" category (line 353, description: "Reorganize X and LinkedIn network") and once in the "Domain" category (line 503, description: "Network optimization for X and LinkedIn"). This inflates the total skill count (claims 165, actually 164 unique) and could cause confusing behavior during curation or catalog validation.
**Fix:** Remove the duplicate entry at line 503-505 (the domain category one), keeping the tool category entry which appeared first.

### WR-02: Recursive preset resolution has no cycle detection

**File:** `tools/curator.js:39-44` and `test/test-presets.js:35-41`
**Issue:** The `resolvePreset` function calls itself recursively via `preset.extend`. A circular reference (e.g., preset A extends B, B extends A) would cause infinite recursion and a stack overflow crash. The same function is duplicated in the test file without cycle detection.
**Fix:**
```javascript
function resolvePreset(presetName, presets, catalogs, visited = new Set()) {
  if (visited.has(presetName)) {
    throw new Error(`Circular preset extension detected: ${presetName}`);
  }
  visited.add(presetName);
  // ... rest unchanged, pass visited to recursive call
}
```

### WR-03: Module code still uses "mob" prefix -- incomplete rename

**File:** `src/module/module.yaml:1`, `src/module/agents/skill-manifest.yaml:9`, `tools/package-skills.js:104-106`, `bin/gomad-cli.js:66`
**Issue:** The module code remains `mob` throughout: `module.yaml` declares `code: mob`, agent manifests use `module: mob` and `canonicalId: mob-*`, `package-skills.js` hardcodes `mob-${skillName}`, and the CLI uninstall message references `.claude/skills/mob/`. This is the largest remaining gap in the mobmad-to-gomad rename. Tests in `test/test-installation.js:62,65` and `test/test-module.js:20` assert the `mob` values, so they will need updating too.
**Fix:** Update `module.yaml` to `code: gomad`, update `package-skills.js` to use `gomad-` prefix, update `bin/gomad-cli.js:66` to reference `.claude/skills/gomad/`, regenerate agent manifests and module-help.csv, and update test assertions.

### WR-04: CLAUDE.md contains stale "mobmad" and "bmad-enhanced" references

**File:** `CLAUDE.md` (multiple locations)
**Issue:** CLAUDE.md still references `mobmad-cli.js`, `mobmad.lock.yaml`, `mobmad mcp enable`, `bmad-enhanced` preset name, and describes BMAD-specific architecture. Since CLAUDE.md is loaded as project instructions by Claude Code, stale references actively mislead the AI assistant during development. The actual files are `gomad-cli.js`, `gomad.lock.yaml`, and the preset is `enhanced`.
**Fix:** Regenerate or manually update CLAUDE.md to reflect current file names, command names, and architecture.

### WR-05: Constraint contradiction -- project writes to ~/.claude/ despite "no global writes" rule

**File:** `tools/global-installer.js:15-16`, `CLAUDE.md` (constraint section)
**Issue:** CLAUDE.md states the constraint: "No global writes: Must not write anything to ~/ or $HOME directories." However, `global-installer.js` writes extensively to `~/.claude/` -- this is a core feature of the `install`, `uninstall`, and `status` commands. Either the constraint is outdated or the installer is violating it.
**Fix:** Update the CLAUDE.md constraint to accurately reflect the intended behavior. If global install is a supported feature, document it as such. If it should be removed, refactor the installer.

### WR-06: Test ordering dependency across describe blocks

**File:** `test/test-installation.js:40-79`
**Issue:** The "package creates skill directories with manifests" test (line 40) explicitly re-runs `curate` because it depends on a lockfile from the previous test. The "sync populates global/" test (line 70) also depends on a lockfile existing. While `node:test` runs tests in order within a file, this implicit dependency makes tests fragile and harder to run in isolation.
**Fix:** Add independent setup to each `describe` block or use `before()` hooks to ensure preconditions.

### WR-07: `install` function does not validate lockfile structure

**File:** `tools/global-installer.js:129-150`
**Issue:** After loading the lockfile via `loadLockfile()`, the code proceeds without validating the parsed YAML has the expected shape. A corrupted or manually edited lockfile with unexpected types (e.g., `skills` as a string instead of an array) would cause runtime errors during iteration.
**Fix:**
```javascript
function loadLockfile() {
  if (!existsSync(LOCKFILE_PATH)) return null;
  const raw = readFileSync(LOCKFILE_PATH, 'utf8');
  const parsed = parseYaml(raw);
  if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.skills)) {
    return null;
  }
  return parsed;
}
```

## Info

### IN-01: Hooks catalog count mismatch

**File:** `catalog/hooks.yaml:128,146`
**Issue:** The Stop section header says "(6)" but only 4 entries are listed (lines 129-144). The total comment says "36 hooks" but actual count is 15 + 15 + 4 = 34. The `full` preset description in `presets.yaml:5` also says "36 hooks".
**Fix:** Update the Stop section header to "(4)" and total to "34 hooks". Update presets.yaml description accordingly.

### IN-02: README skill count says "142+" but catalog has 165

**File:** `README.md:3`
**Issue:** README says "142+ skills" while `catalog/skills.yaml` totals 165 skills (164 unique after WR-01 fix). The preset description for `full` also says "165 skills".
**Fix:** Update README to match the current catalog count.

### IN-03: `package.json` lists `bmad-method` as peer dependency

**File:** `package.json:25`
**Issue:** The `peerDependencies` section requires `bmad-method ^6.x`. CLAUDE.md describes gomad as "now being rebranded as a standalone tool," suggesting the bmad dependency may no longer be desired. Test at `test/test-module.js:78` also asserts this peer dependency exists.
**Fix:** If gomad should work independently of bmad-method, remove the peer dependency and the corresponding test assertion.

### IN-04: Unused `relative` import in package-skills.js

**File:** `tools/package-skills.js:14`
**Issue:** The `relative` function is imported from `path` but never used in the file.
**Fix:**
```javascript
import { join, dirname } from 'path';
```

### IN-05: module-help.csv uses "GOMAD" module name with "mob-" skill prefix

**File:** `src/module/module-help.csv:2-28`
**Issue:** The CSV uses module column "GOMAD" (matching `module.yaml` `name`) but skill identifiers use `mob-` prefix (matching `module.yaml` `code`). This is internally consistent today but will need regeneration after the module code rename (WR-03).
**Fix:** No immediate action needed -- will be resolved as part of WR-03.

---

_Reviewed: 2026-04-07T14:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
