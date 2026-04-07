---
phase: 01-rename
reviewed: 2026-04-07T12:00:00Z
depth: standard
files_reviewed: 49
files_reviewed_list:
  - CLAUDE.md
  - README.md
  - bin/gomad-cli.js
  - catalog/agents.yaml
  - catalog/commands.yaml
  - catalog/hooks.yaml
  - catalog/presets.yaml
  - catalog/skills.yaml
  - package.json
  - src/module/agents/analysis/api-documenter.md
  - src/module/agents/analysis/codebase-analyzer.md
  - src/module/agents/analysis/data-analyst.md
  - src/module/agents/analysis/pattern-detector.md
  - src/module/agents/planning/dependency-mapper.md
  - src/module/agents/planning/epic-optimizer.md
  - src/module/agents/planning/requirements-analyst.md
  - src/module/agents/planning/technical-decisions-curator.md
  - src/module/agents/planning/trend-spotter.md
  - src/module/agents/planning/user-journey-mapper.md
  - src/module/agents/planning/user-researcher.md
  - src/module/agents/research/market-researcher.md
  - src/module/agents/research/tech-debt-auditor.md
  - src/module/agents/review/document-reviewer.md
  - src/module/agents/review/technical-evaluator.md
  - src/module/agents/review/test-coverage-analyzer.md
  - src/module/agents/skill-manifest.yaml
  - src/module/module-help.csv
  - src/module/module.yaml
  - src/module/skills/api-design/skill-manifest.yaml
  - src/module/skills/coding-standards/skill-manifest.yaml
  - src/module/skills/database-migrations/skill-manifest.yaml
  - src/module/skills/deep-research/skill-manifest.yaml
  - src/module/skills/deployment-patterns/skill-manifest.yaml
  - src/module/skills/docker-patterns/skill-manifest.yaml
  - src/module/skills/find-skills/skill-manifest.yaml
  - src/module/skills/postgres-patterns/skill-manifest.yaml
  - src/module/skills/prompt-optimizer/skill-manifest.yaml
  - src/module/skills/search-first/skill-manifest.yaml
  - src/module/skills/security-review/skill-manifest.yaml
  - src/module/skills/security-scan/skill-manifest.yaml
  - src/module/skills/tdd-workflow/skill-manifest.yaml
  - src/module/skills/verification-loop/skill-manifest.yaml
  - test/test-installation.js
  - test/test-module.js
  - test/test-presets.js
  - tools/curator.js
  - tools/global-installer.js
  - tools/package-skills.js
  - tools/sync-upstream.js
findings:
  critical: 1
  warning: 5
  info: 5
  total: 11
status: issues_found
---

# Phase 01-rename: Code Review Report

**Reviewed:** 2026-04-07T12:00:00Z
**Depth:** standard
**Files Reviewed:** 49
**Status:** issues_found

## Summary

Reviewed all 49 files in Phase 01 scope: CLI entry point, 5 catalog YAML files, module definitions (module.yaml, module-help.csv), 16 agent markdown files, 14 skill manifests, 3 test files, and 4 tool modules. The core mobmad-to-gomad rename is largely complete: package.json, CLI binary name, lockfile/manifest references, catalog YAML files, and agent directory names (bmad-analysis -> analysis, etc.) all use "gomad" consistently. The single remaining "mobmad" in source is the intentional historical context in CLAUDE.md line 6.

However, the review found one critical bug in the uninstall flow, a newly discovered stale `bmm-` prefix across all 16 agent .md files that was missed in Phase 1 planning, and several user-facing messages referencing the old BMAD module code. Items explicitly deferred to Phase 3 (module code `mob`, `install_to_bmad`, bmad-method peer dependency) are noted as info only.

## Critical Issues

### CR-01: Uninstall rmSync on individual files lacks recursive option

**File:** `tools/global-installer.js:309`
**Issue:** In `uninstallGlobal()`, the no-backup branch iterates `installedFiles` and calls `rmSync(filePath)` without `{ recursive: true }`. While `collectFiles()` returns only file paths (not directories), if a previously installed file has been replaced by a directory of the same name (manual intervention, tool upgrade), `rmSync` without `recursive: true` will throw `EISDIR`, crashing the uninstall mid-way and leaving a partially cleaned state. The backup branch (line 299) correctly uses `rmSync(target, { recursive: true, force: true })`, making this inconsistency a latent bug.
**Fix:**
```javascript
for (const file of installedFiles) {
  const filePath = join(target, file);
  if (existsSync(filePath)) {
    rmSync(filePath, { force: true });
    removed++;
  }
}
```

## Warnings

### WR-01: All 16 agent .md files retain `bmm-` prefix in frontmatter name field

**File:** `src/module/agents/analysis/api-documenter.md:2`, `src/module/agents/analysis/codebase-analyzer.md:2`, `src/module/agents/analysis/data-analyst.md:2`, `src/module/agents/analysis/pattern-detector.md:2`, `src/module/agents/planning/dependency-mapper.md:2`, `src/module/agents/planning/epic-optimizer.md:2`, `src/module/agents/planning/requirements-analyst.md:2`, `src/module/agents/planning/technical-decisions-curator.md:2`, `src/module/agents/planning/trend-spotter.md:2`, `src/module/agents/planning/user-journey-mapper.md:2`, `src/module/agents/planning/user-researcher.md:2`, `src/module/agents/research/market-researcher.md:2`, `src/module/agents/research/tech-debt-auditor.md:2`, `src/module/agents/review/document-reviewer.md:2`, `src/module/agents/review/technical-evaluator.md:2`, `src/module/agents/review/test-coverage-analyzer.md:2`
**Issue:** Every agent .md file has `name: bmm-<agent-name>` in its YAML frontmatter (e.g., `name: bmm-api-documenter`). The `bmm` prefix is a BMAD module code that was not identified in the Phase 1 research or plan. While directory names were correctly stripped of the `bmad-` prefix, the frontmatter `name` field inside each file was not updated. This creates an inconsistency: the skill-manifest.yaml uses `mob-` prefix for the same agents, and neither prefix matches the new `gomad` branding.
**Fix:** Replace `bmm-` prefix with the appropriate gomad prefix in all 16 agent .md frontmatter name fields. If this is deferred to Phase 3 along with the `mob` module code, document it explicitly in the deferred items list.

### WR-02: CLI uninstall help text references stale `.claude/skills/mob/` path

**File:** `bin/gomad-cli.js:66`
**Issue:** The uninstall command's else branch prints `To remove the project module, delete .claude/skills/mob/ in your project.` This references the old BMAD module directory. For gomad-only users who never used BMAD, this path will not exist and the message is misleading.
**Fix:**
```javascript
console.log('To remove the project module, delete the gomad skill directories from .claude/ in your project.');
```

### WR-03: global-installer.js installProjectModule references bmad-method command

**File:** `tools/global-installer.js:213-214`
**Issue:** The `installProjectModule` function tells users to run `npx bmad-method install --modules bmm,mob`. This instructs users to install via the old BMAD workflow, which contradicts gomad's standalone identity. While deferred to Phase 3 for full removal, the user-facing message is misleading today.
**Fix:**
```javascript
async function installProjectModule(options) {
  console.log(chalk.dim('Project module installation is not yet available.'));
  console.log(chalk.dim('Use `gomad install --global-only` for now.'));
}
```

### WR-04: Duplicate skill entry "connections-optimizer" in catalog

**File:** `catalog/skills.yaml:353` and `catalog/skills.yaml:503`
**Issue:** The skill `connections-optimizer` appears twice: once in the "Tools" category (line 353) and once in the "Domain" category (line 503) with a different description. This inflates the skill count and could cause confusing behavior during curation.
**Fix:** Remove the duplicate at line 503-505, keeping the first occurrence.

### WR-05: Recursive preset resolution has no cycle detection

**File:** `tools/curator.js:39-44` and `test/test-presets.js:35-41`
**Issue:** The `resolvePreset` function calls itself recursively via `preset.extend` with no visited-set guard. A circular `extend` chain (e.g., A extends B, B extends A) would cause infinite recursion and a stack overflow crash.
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

## Info

### IN-01: CLAUDE.md line 218 references "bmad-enhanced" preset name

**File:** `CLAUDE.md:218`
**Issue:** Line 218 lists `bmad-enhanced` as a preset example, but the actual preset name is `enhanced` (the `bmad-` prefix was stripped). This is in the auto-generated architecture section and will mislead AI assistants reading project context.
**Fix:** Update to `enhanced` when CLAUDE.md is next regenerated.

### IN-02: Test assertions couple to Phase-3-scoped `mob` module code

**File:** `test/test-installation.js:62-65`, `test/test-module.js:20,78`
**Issue:** Tests assert `manifest.module === 'mob'`, `manifest.canonicalId.startsWith('mob-')`, `mod.code === 'mob'`, and `pkg.peerDependencies['bmad-method']`. These are correct today but create a tight coupling to values that Phase 3 will change. Noting for Phase 3 planning.
**Fix:** No action in Phase 1. Track as Phase 3 dependency.

### IN-03: module-help.csv uses `mob-` skill prefix in all 26 entries

**File:** `src/module/module-help.csv:2-27`
**Issue:** All skill identifiers use `mob-` prefix (e.g., `mob-coding-standards`). This is internally consistent with `module.yaml code: mob` but will need regeneration in Phase 3.
**Fix:** No action in Phase 1.

### IN-04: Unused `relative` import in package-skills.js

**File:** `tools/package-skills.js:14`
**Issue:** The `relative` function is imported from `path` but never used.
**Fix:**
```javascript
import { join, dirname } from 'path';
```

### IN-05: README skill count "142+" does not match catalog

**File:** `README.md:3`
**Issue:** README says "142+ skills" while `catalog/skills.yaml` contains 165 entries (164 unique after WR-04 fix). The `full` preset description references "165 skills".
**Fix:** Update README to match current catalog count.

---

_Reviewed: 2026-04-07T12:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
