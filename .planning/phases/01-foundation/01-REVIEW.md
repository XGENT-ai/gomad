---
phase: 01-foundation
reviewed: 2026-04-08T00:00:00Z
depth: standard
files_reviewed: 10
files_reviewed_list:
  - .augment/code_review_guidelines.yaml
  - .coderabbit.yaml
  - eslint.config.mjs
  - package.json
  - test/test-installation-components.js
  - tools/installer/core/installer.js
  - tools/installer/core/manifest.js
  - tools/installer/modules/custom-modules.js
  - tools/installer/modules/official-modules.js
  - tools/installer/ui.js
findings:
  critical: 0
  warning: 3
  info: 4
  total: 7
status: issues_found
---

# Phase 01: Code Review Report

**Reviewed:** 2026-04-08
**Depth:** standard
**Files Reviewed:** 10
**Status:** issues_found

## Summary

Phase 01 performs two independent changes: (1) package.json identity rename
from `bmad-method@6.2.2` to `@xgent-ai/gomad@1.1.0` with removal of three
unused production dependencies (`xml2js`, `@kayvan/markdown-tree-parser`,
`ignore`), and (2) removal of the ExternalModuleManager subsystem from five
installer files plus one test fixture.

**Good news:**

- Package rename is internally consistent in `package.json` (name, version,
  description, author, repository, bugs, homepage, keywords, bin, scripts).
- Dependency removal is safe: a repo-wide grep found zero runtime imports of
  `xml2js`, `@kayvan/markdown-tree-parser`, or `ignore` outside documentation
  strings.
- ExternalModuleManager removal is structurally clean: no dangling
  `require('../modules/external-manager')` calls remain in `tools/installer/`,
  all three call sites (`installer.js`, `manifest.js`, `official-modules.js`)
  were updated, the test fixture stub was dropped, and the
  `custom-modules.js#assembleQuickUpdateSources` signature was narrowed in
  lockstep with its single caller in `installer.js`.

**Concerns:** Removal left behind dead code in three places (most notably
`ui.js:911-934` where two `for` loops iterate an always-empty array), plus
one unused `require('node:os')` in `manifest.js:840` and a handful of stale
comments that still reference the deleted subsystem. None of these are bugs
today, but they will confuse the next reader and should be cleaned up.

## Warnings

### WR-01: Dead code — two loops iterate an always-empty `externalModules` array

**File:** `tools/installer/ui.js:874,911-934`
**Issue:** The ExternalModuleManager removal patch reduced
`externalModules` to `const externalModules = [];` with a comment
explaining the array is kept empty for backward-compat with downstream
grouping logic. But the downstream logic is two `for (const mod of
externalModules)` loops (the "BMad Official Modules" and "Community
Modules" groups) — both are now guaranteed to iterate zero times, and the
intermediate `officialModules` / `communityModules` arrays are always
empty when spread into `allOptions`. This is strictly dead code: the empty
array isn't serving any API contract, it's just feeding loops that do
nothing.

**Fix:** Delete the `externalModules` declaration and both `for` loops,
along with the `officialModules` and `communityModules` local arrays and
their `allOptions.push(...)` calls. The two comments on lines 910 and 923
("Group 2: BMad Official Modules" / "Group 3: Community Modules") should
also go. After cleanup, `selectAllModules` should only build `localEntries`.

```javascript
// tools/installer/ui.js — after cleanup
async selectAllModules(installedModuleIds = new Set()) {
  const { OfficialModules } = require('./modules/official-modules');
  const officialModulesSource = new OfficialModules();
  const { modules: localModules } = await officialModulesSource.listAvailable();

  const allOptions = [];
  const initialValues = [];
  const lockedValues = ['core'];

  allOptions.push({ label: 'BMad Core Module', value: 'core', hint: 'Core configuration and shared resources' });
  initialValues.push('core');

  const buildModuleEntry = (mod, value, group) => { /* unchanged */ };

  const localEntries = [];
  for (const mod of localModules) {
    if (!mod.isCustom && mod.id !== 'core') {
      const entry = buildModuleEntry(mod, mod.id, 'Local');
      localEntries.push(entry);
      if (entry.selected) initialValues.push(mod.id);
    }
  }
  allOptions.push(...localEntries.map(({ label, value, hint }) => ({ label, value, hint })));

  // (no external/community groups anymore)

  const selected = await prompts.autocompleteMultiselect({ /* unchanged */ });
  // ...
}
```

### WR-02: Unused `os` require after ExternalModuleManager removal

**File:** `tools/installer/core/manifest.js:840`
**Issue:** Line 840 declares `const os = require('node:os');` inside
`getModuleVersionInfo`. In the pre-phase-01 code this was used by the
external-module branch to compute `path.join(os.homedir(), '.bmad',
'cache', 'external-modules', moduleName)`. That branch was deleted (see
the replaced block at lines 851-857 now collapsed to a single
fall-through comment), but the `os` require survived. It is now unused
and, because this file is under `tools/**`, the relaxed ESLint config
(`no-unused-vars: 'off'`) will not catch it.

**Fix:** Delete line 840.

```javascript
// tools/installer/core/manifest.js — around line 840
async getModuleVersionInfo(moduleName, bmadDir) {
-   const os = require('node:os');
    const yaml = require('yaml');

    // Built-in modules use BMad version (only core and bmm are in BMAD-METHOD repo)
    if (['core', 'bmm'].includes(moduleName)) {
```

### WR-03: Stale doc-comment references removed subsystem

**File:** `tools/installer/modules/official-modules.js:98`
**Issue:** The JSDoc on `listAvailable()` still reads "All other modules
come from external-official-modules.yaml". That file / subsystem was
removed in this phase. The comment now actively misleads readers about
where non-built-in modules originate.

**Fix:** Update the comment to describe the current reality (only `core`
and `bmm` are built-in; custom modules come from the custom-module cache).

```javascript
// tools/installer/modules/official-modules.js:96-100
  /**
   * List all available built-in modules (core and bmm).
-  * All other modules come from external-official-modules.yaml
+  * All other modules are custom modules discovered via CustomModules.
   * @returns {Object} Object with modules array and customModules array
   */
  async listAvailable() {
```

## Info

### IN-01: Stale comment referencing "external module list"

**File:** `tools/installer/core/installer.js:419`
**Issue:** The JSDoc for `_scanCachedCustomModules` reads "Scan the custom
module cache directory and register any cached custom modules that aren't
already known from the manifest or external module list." There is no
longer an "external module list" — that concept only existed as part of
`ExternalModuleManager`.
**Fix:** Replace "or external module list" with a period. The function
body was already simplified in this phase; only the doc-comment is stale.

### IN-02: Orphaned comment block in `getModuleVersionInfo`

**File:** `tools/installer/core/manifest.js:853-855`
**Issue:** After removing the external-module branch, the author left
behind a standalone comment "`// External modules subsystem has been
removed — fall through to custom module handling.`" with blank lines
around it. Once `WR-02` is addressed and the historical context is
captured by the phase SUMMARY, this scar-tissue comment no longer carries
value and creates visual noise between the built-in branch and the custom
branch.
**Fix:** Delete lines 853-855. The git history preserves the removal
rationale; in-source comments don't need to narrate it.

### IN-03: Stale branding strings predate phase 01 but surface in reviewed files

**File:** `tools/installer/core/installer.js:798,1107-1116`
**Issue:** `installer.js` still emits `# Generated by BMAD installer` in
module config headers (line 798) and the post-install "Next steps" panel
still advertises `https://docs.bmad-method.org/`, `bmad-help` as the skill
name, and the header "BMAD is ready to use!" (lines 1107-1116). These are
pre-existing strings, not introduced by phase 01, but they are in a file
this review was asked to cover and they contradict the rename just
performed in `package.json`. CLAUDE.md's scope discipline note says
branding changes belong in v1.1. Recommend filing a follow-up phase to
sweep these user-facing strings rather than fixing inline here.
**Fix:** Out of scope for phase 01 per the plan's "rename + slim down +
credit + branding" wording — branding sweep is a later phase. Flagging
for visibility only.

### IN-04: `package.json#main` and `bin` target still named `bmad-cli.js`

**File:** `package.json:25,27`
**Issue:** `main` and the single `bin` entry both point at
`tools/installer/bmad-cli.js`. The file path was intentionally left alone
(renaming it is explicitly out of scope for phase 01 per CLAUDE.md's "No
language change in v1.1" and the plan's "rename package.json identity
only" framing), but a cross-check: the entry file at line 19 of
`bmad-cli.js` still hardcodes `const packageName = 'bmad-method'` for its
update check, which means `npx @xgent-ai/gomad install` will silently
query the wrong npm registry record for updates. This is a real
functional bug but it lives in `bmad-cli.js`, which is not in this
review's file scope.
**Fix:** Flagging for visibility. Either (a) add `tools/installer/bmad-cli.js`
to the next phase's review/edit scope and update `packageName` to
`@xgent-ai/gomad`, or (b) explicitly defer with a TODO comment. Not a
phase 01 blocker because no file in the current review scope defines
that constant.

---

_Reviewed: 2026-04-08_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
