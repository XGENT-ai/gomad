---
phase: 01-rename
reviewed: 2026-04-07T12:00:00Z
depth: standard
files_reviewed: 17
files_reviewed_list:
  - bin/gomad-cli.js
  - catalog/agents.yaml
  - catalog/commands.yaml
  - catalog/hooks.yaml
  - catalog/presets.yaml
  - catalog/skills.yaml
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
  critical: 3
  warning: 5
  info: 2
  total: 10
status: issues_found
---

# Phase 1: Code Review Report

**Reviewed:** 2026-04-07
**Depth:** standard
**Files Reviewed:** 17
**Status:** issues_found

## Summary

The mobmad-to-gomad rename was executed across CLI, catalogs, tests, lockfile references, and package.json. The top-level rename (binary name, package name, lockfile name, manifest name, CLI strings) is complete and consistent. However, the **module code** `mob` and its derived identifiers (`mob-*` canonicalIds, `module: mob`) were not renamed. This is the dominant class of leftover reference -- it appears in 6 source files, 16 agent manifests, 27 CSV rows, and 14+ generated skill manifests. Additionally, CLAUDE.md still contains `bmad-enhanced` as a preset example, and there is a duplicate skill entry in `catalog/skills.yaml`.

## Critical Issues

### CR-01: Module code `mob` not renamed -- pervasive across source and manifests

**File:** `src/module/module.yaml:1`
**Issue:** The module code remains `code: mob` and `name: "GOMAD"`. This `mob` code propagates everywhere: `tools/package-skills.js` hardcodes `canonicalId: mob-${skillName}` and `module: 'mob'` (lines 104-106), `src/module/agents/skill-manifest.yaml` uses `module: mob` and `name: mob-*` for all 16 agents, `src/module/module-help.csv` uses `mob-` prefix on all 27 skill rows, and `test/test-installation.js` asserts `manifest.module === 'mob'` and `canonicalId.startsWith('mob-')` (lines 62, 65). If the rename goal is to eliminate the old "mob/mobmad" identity, this is the largest gap.
**Fix:**
Replace `code: mob` with `code: gomad` in `module.yaml`, then update all derived references:
```yaml
# src/module/module.yaml line 1
code: gomad
```
```javascript
// tools/package-skills.js lines 104-106
canonicalId: `gomad-${skillName}`,
module: 'gomad',
```
```javascript
// test/test-installation.js lines 62, 65
assert.equal(manifest.module, 'gomad');
assert.ok(manifest.canonicalId.startsWith('gomad-'));
```
Then regenerate `src/module/agents/skill-manifest.yaml` and `src/module/module-help.csv` with `gomad-` prefix.

### CR-02: CLI uninstall message references old `mob/` directory

**File:** `bin/gomad-cli.js:66`
**Issue:** The uninstall command outputs `delete .claude/skills/mob/ in your project`, still referencing the old module code directory name. After CR-01 is fixed this would be `gomad/`.
**Fix:**
```javascript
console.log('To remove the project module, delete .claude/skills/gomad/ in your project.');
```

### CR-03: `install_to_bmad` field and BMAD references not renamed in manifests and tests

**File:** `tools/package-skills.js:107`
**Issue:** The generated skill manifests include `install_to_bmad: true` -- a BMAD-specific field name. The test at `test/test-installation.js:64` asserts this field. If the project is rebranding away from BMAD, this field name should change. Additionally, `tools/global-installer.js:213-214` still prints "Project module installation requires bmad-method" and "Run: npx bmad-method install --modules bmm,mob". The `module.yaml:35` contains "Only install project-scoped BMAD module".
**Fix:**
Decide whether BMAD integration is being kept or removed. If removing:
```javascript
// tools/package-skills.js line 107
install_to_project: true,  // or remove entirely
```
```javascript
// tools/global-installer.js lines 213-214
console.log(chalk.dim('Project module installation is handled by gomad.'));
```
```yaml
# src/module/module.yaml line 35
label: "No - Only install project-scoped module"
```
If keeping BMAD integration as-is, document this explicitly as intentional.

## Warnings

### WR-01: CLAUDE.md still references `bmad-enhanced` preset name

**File:** `CLAUDE.md:218`
**Issue:** Line 218 lists preset examples as `full, full-stack, lean, enterprise, bmad-enhanced`. The preset was renamed to `enhanced` in `catalog/presets.yaml`. This stale reference in CLAUDE.md will confuse both developers and Claude Code itself (since CLAUDE.md is loaded as project instructions).
**Fix:**
```
- Examples: `full`, `full-stack`, `lean`, `enterprise`, `enhanced`
```

### WR-02: Duplicate `connections-optimizer` entry in skills catalog

**File:** `catalog/skills.yaml:353` and `catalog/skills.yaml:503`
**Issue:** The skill `connections-optimizer` appears twice -- once under "Tools" (line 353, category: tool) and once under "Domain" (line 503, category: domain) with different descriptions. This causes the "Total: 165 skills" count to be inflated by 1, and preset resolution or tests that check uniqueness could behave unexpectedly.
**Fix:**
Remove the duplicate entry. Keep whichever category is more appropriate (likely "tool" since it appears there first), or merge descriptions.

### WR-03: `test/test-module.js` asserts `module.code === 'mob'` -- test will break after CR-01

**File:** `test/test-module.js:20`
**Issue:** Line 20 asserts `assert.equal(mod.code, 'mob')`. This is correct today but will fail once CR-01 is applied. Flagging it here since it is part of the rename scope.
**Fix:**
```javascript
assert.equal(mod.code, 'gomad');
```

### WR-04: `test/test-module.js` asserts `peerDependencies['bmad-method']` exists

**File:** `test/test-module.js:78`
**Issue:** The test asserts that `package.json` has a peer dependency on `bmad-method`. If the BMAD dependency is being removed as part of the rebrand (per CLAUDE.md: "now being rebranded as a standalone tool"), this assertion and the `peerDependencies` entry in `package.json:25` should both be removed.
**Fix:**
If removing BMAD dependency:
```javascript
// Remove this assertion from test/test-module.js line 78
// assert.ok(pkg.peerDependencies['bmad-method'], 'should peer-depend on bmad-method');
```
And remove from `package.json`:
```json
// Remove peerDependencies block entirely
```

### WR-05: `module.yaml` directory template still uses `mob` path

**File:** `src/module/module.yaml:39`
**Issue:** The `directories` section specifies `{output_folder}/mob` as the directory to create during installation. After renaming the module code, this should be `{output_folder}/gomad`.
**Fix:**
```yaml
directories:
  - "{output_folder}/gomad"
```

## Info

### IN-01: Generated skill manifests in `src/module/skills/` contain old `mob-` prefix

**File:** `src/module/skills/*/skill-manifest.yaml` (14 files)
**Issue:** All generated skill manifest files under `src/module/skills/` contain `canonicalId: mob-*` and `module: mob`. These are generated artifacts from `tools/package-skills.js`, so fixing CR-01 and re-running `gomad package` will regenerate them correctly. No manual edit needed for these files.
**Fix:** Re-run `npx gomad package` after fixing CR-01.

### IN-02: CLAUDE.md contains multiple stale references to BMAD and old architecture

**File:** `CLAUDE.md:223`
**Issue:** Beyond WR-01, CLAUDE.md line 223 says "Encapsulation of a packaged skill with BMAD manifest" and line 228 says "Write access to ~/.claude/ for global asset installation" (contradicts the project-local-only constraint stated at line 15). These are documentation-level issues in the auto-generated project context, not code bugs.
**Fix:** Regenerate CLAUDE.md after completing the rename and architecture changes, or manually update the stale sections.

---

_Reviewed: 2026-04-07_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
