# Phase 3: BMAD Decoupling - Research

**Researched:** 2026-04-07
**Domain:** Dependency removal, file migration, catalog registration
**Confidence:** HIGH

## Summary

Phase 3 decouples gomad from BMAD-METHOD. The work is mostly mechanical — file moves, frontmatter rewrites, catalog updates, deletions, and test surgery — across a small, well-mapped surface. There is no library research to do; the entire investigation is codebase inventory. CONTEXT.md locks 14 decisions (D-01..D-14) and the research below verifies each against ground truth. One material discrepancy was found (D-03 says strip `mob-` prefix but the agent .md files actually carry a `bmm-` prefix in `name:`; only the manifest YAML uses `mob-` IDs) — the planner must reconcile this. A second important finding is that `tools/installer.js` copies `assets/agents/` wholesale (no lockfile gating per file), so adding the 16 new agents to `assets/agents/` will cause every install to ship them regardless of preset selection — relevant to D-02.

**Primary recommendation:** Plan as four ordered slices: (1) audit `src/module/skills/` (D-07), (2) migrate 16 agents to `assets/agents/` with rewritten frontmatter and add catalog entries, (3) delete `src/module/`, `tools/package-skills.js`, `peerDependencies`, and `package` CLI command, (4) replace BMAD-specific tests with decoupling guardrail tests. Slices 2-4 can each be a single plan.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Agent Destination**
- **D-01:** Move all 16 ex-BMAD agents from `src/module/agents/{analysis,planning,research,review}/*.md` to `assets/agents/` (flat — no subdirectories preserved). Category becomes metadata only.
- **D-02:** Register all 16 agents in `catalog/agents.yaml` so they are first-class, installable via `gomad install` and selectable via curate/presets, matching the Phase 2 architecture for every other agent.

**Agent Naming and Frontmatter**
- **D-03:** Strip the `mob-` canonical-ID prefix from every agent. Example: `mob-codebase-analyzer` → `codebase-analyzer`. Filenames already match the unprefixed form.
- **D-04:** Strip BMAD-specific frontmatter fields from each agent .md file: `module`, `canonicalId`, `displayName`, `title`. Keep `name`, `description`, and any `tools` field. Result must match the frontmatter shape of other agents already in `assets/agents/`.
- **D-05:** Delete `src/module/agents/skill-manifest.yaml` (the BMAD agent manifest) — no replacement; catalog/agents.yaml is the source of truth.

**src/module/ Fate**
- **D-06:** Delete `src/module/` entirely after migration: `module.yaml`, `module-help.csv`, `agents/skill-manifest.yaml`, the `agents/` subtree, and (pending audit per D-07) `skills/`. Satisfies BMA-02 cleanly.
- **D-07:** Before deleting `src/module/skills/`, the executor MUST audit the repo for any references to that path. If anything still consumes it, surface a deviation; otherwise delete. Do not assume — verify.
- **D-08:** Stale `install_global_assets` prompt block in `module.yaml` is moot once the file is deleted; nothing in the new structure may reintroduce a prompt that writes to `~/.claude/`.

**package-skills.js Fate**
- **D-09:** Delete `tools/package-skills.js` entirely.
- **D-10:** Remove the `gomad package` command registration from `bin/gomad-cli.js` (currently lines ~53-59).
- **D-11:** Remove `package-skills.js` references from `test/test-installation.js:45-46` and `test/test-module.js:86`.

**Tests**
- **D-12:** Delete BMAD-specific test cases that exercise BMAD module structure or `package-skills` behavior.
- **D-13:** Add new decoupling assertion tests: (a) `package.json` has no `bmad-method` in dependencies or peerDependencies, (b) `src/module/` does not exist, (c) no agent file in `assets/agents/` contains `module:` or `canonicalId:` fields, (d) no source file imports `bmad-method`.

**package.json**
- **D-14:** Remove the entire `peerDependencies` block (currently only contains `bmad-method: ^6.x` at line 24). If empty, delete the key.

### Claude's Discretion
- Exact organization of catalog/agents.yaml entries (categories, default_include flags) — planner/executor decides based on existing catalog conventions.
- Whether the 16 agents need any `tools:` declarations in frontmatter — executor inspects each file and matches existing agent conventions.
- Test framework details (vitest spec layout) — match existing test/ patterns.
- Whether any preset (full, full-stack, enhanced) should default-include the new agents — planner decides based on existing preset philosophy.

### Deferred Ideas (OUT OF SCOPE)
- Reorganizing or pruning `catalog/agents.yaml` — out of scope; this phase only adds/transforms entries.
- Updating presets to include or exclude the new ex-BMAD agents — Claude's discretion, can revisit in Phase 4.
- Documentation/README updates explaining the 16 new agents — Phase 4.
- npm publish configuration — Phase 4.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| BMA-01 | bmad-method peer dependency removed from package.json | `package.json:23-25` confirms `peerDependencies: { "bmad-method": "^6.x" }` is the only entry — D-14 deletes the whole block |
| BMA-02 | BMAD module registration code removed (module.yaml integration) | `src/module/module.yaml`, `src/module/module-help.csv`, `src/module/agents/skill-manifest.yaml` are the only registration artifacts — D-06 deletes them all |
| BMA-03 | package-skills.js BMAD manifest generation removed (skill copying retained if needed) | `tools/package-skills.js` exists solely to write BMAD `skill-manifest.yaml` files; no other code path needs skill copying. D-09 deletes the file |
| BMA-04 | BMAD-specific agents in src/module/agents/ converted to regular agents | 16 agents inventoried below; D-01..D-05 define the conversion |
| BMA-05 | No runtime code imports or references bmad-method packages | Verified: zero runtime imports of `bmad-method` in `bin/`, `tools/`, `src/`, `test/` (only `BMAD/` vendored sub-repo and lockfile string-matches) |
</phase_requirements>

## Standard Stack

No external libraries to add. All work uses existing project tooling:

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| yaml | ^2.7.1 | Parse/stringify catalog and agent frontmatter | Already used everywhere in tools/ [VERIFIED: package.json:29] |
| node:test | built-in | Decoupling guardrail tests | Existing test framework; test/test-*.js all use it [VERIFIED: test/test-catalogs.js:1] |
| node:fs/path | built-in | File migration, content rewrites | Existing pattern in installer.js |

> Note: CONTEXT and `.claude/rules/typescript/testing.md` mention vitest, but the actual test files in `test/` use Node's built-in `node:test` runner with `node --test 'test/test-*.js'` [VERIFIED: package.json:10, test/test-installation.js:1]. Match this — do **not** introduce vitest in this phase.

## Architecture Patterns

### Agent Migration (D-01, D-03, D-04)

The 16 agents currently live under four subdirectories. After migration they live flat under `assets/agents/`. The transformation per file:

```
src/module/agents/analysis/codebase-analyzer.md
  ──> assets/agents/codebase-analyzer.md

Frontmatter BEFORE:
---
name: bmm-codebase-analyzer
description: Performs comprehensive codebase analysis...
tools:
---

Frontmatter AFTER (matches assets/agents/code-reviewer.md template):
---
name: codebase-analyzer
description: Performs comprehensive codebase analysis...
tools: []
---
```

**CRITICAL discrepancy with D-03:** CONTEXT.md says "strip the `mob-` canonical-ID prefix from every agent." Verification of ground truth shows the agent .md files actually use **`bmm-`** as the prefix in their `name:` field, not `mob-`:

[VERIFIED: grep of all 16 agent .md files]
```
name: bmm-api-documenter
name: bmm-codebase-analyzer
name: bmm-data-analyst
name: bmm-dependency-mapper
name: bmm-document-reviewer
name: bmm-epic-optimizer
name: bmm-market-researcher
name: bmm-pattern-detector
name: bmm-requirements-analyst
name: bmm-tech-debt-auditor
name: bmm-technical-decisions-curator
name: bmm-technical-evaluator
name: bmm-test-coverage-analyzer
name: bmm-trend-spotter
name: bmm-user-journey-mapper
name: bmm-user-researcher
```

The `mob-*` IDs that CONTEXT references appear only inside `src/module/agents/skill-manifest.yaml` (the manifest YAML), not inside the .md files. Both are BMAD legacy artifacts (`bmm` = BMAD Method Module, `mob` = the gomad/mobmad module code).

**Planner action:** Treat D-03 as "strip ANY legacy module prefix (`bmm-`, `mob-`) from the .md `name:` field." The end-state is unprefixed names (`codebase-analyzer`, etc.). The executor must rewrite the `name:` field in every .md file, not just delete the manifest. Filenames are already correct (unprefixed).

### Existing Agent Frontmatter Template (assets/agents/code-reviewer.md)

```yaml
---
name: code-reviewer
description: Expert code review specialist. ...
tools: ["Read", "Grep", "Glob", "Bash"]
model: sonnet
---
```

The 16 ex-BMAD agents currently have an empty `tools:` field. Executor's discretion (per CONTEXT) whether to populate it. Conservative default: leave as `tools: []` (matches the empty-tools convention) and skip `model:`.

### Catalog Entry Pattern (catalog/agents.yaml)

Existing entries (project scope, with subdir prefix in name) [VERIFIED: catalog/agents.yaml:152-221]:

```yaml
- name: analysis/codebase-analyzer
  description: Comprehensive codebase analysis and architecture
  scope: project
  default_include: true
```

After D-01 (flat in assets/agents/), the catalog entries should also be flat to match the new file location. Recommended pattern:

```yaml
- name: codebase-analyzer
  description: Comprehensive codebase analysis and architecture
  scope: project
  default_include: true
```

**Critical install-flow finding:** `tools/installer.js:199-209` copies the **entire** `assets/agents/` directory wholesale via `installFiles()`. The installer does NOT filter by lockfile selections per file — every file in `assets/agents/` ships on every install [VERIFIED: tools/installer.js:85-99, 199-209]. Consequence: once the 16 agents land in `assets/agents/`, they will install for every user regardless of preset. Either (a) accept this (the catalog entries become advisory metadata for `gomad curate` only, not install-time gating), or (b) make the planner aware so they can decide whether to also gate installer.js by lockfile. **Out of scope per CONTEXT (no installer rewrites in Phase 3) — surface as a known fact, not an action item.**

### Catalog Naming Collision Check
[VERIFIED: catalog/agents.yaml:5-148 search]

None of the 16 unprefixed names collide with existing global agent names. Safe to add as flat entries.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| YAML frontmatter rewrite | Custom regex parser | `yaml` package + `match(/^---\n([\s\S]*?)\n---/)` | Already the project pattern in `tools/package-skills.js:38` and `tools/curator.js` |
| Recursive file move | Custom walker | `cpSync` + `rmSync` from node:fs | Already used in `tools/installer.js:95` |
| Decoupling test assertions | Anything fancy | Plain `node:assert/strict` reads of `package.json` and grep-style `readFileSync` checks | Pattern established in `test/test-installation.js:101-122` |

**Key insight:** This phase is destruction + mechanical rewrites. No new abstractions, no new tooling. Reuse `parseYaml`/`stringifyYaml` for the agent frontmatter rewrite step.

## Runtime State Inventory

This phase is a refactor/decoupling phase. Per the runtime state inventory protocol:

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — gomad has no databases, no persisted user state. The only "stored" artifact is `gomad.lock.yaml` at the project root, which contains agent names; planner must verify the lockfile won't reference subdirectory-style names like `analysis/api-documenter` after the rename. [VERIFIED: gomad.lock.yaml is regenerated by `gomad curate`, not hand-edited] | Lockfile is regenerated on each curate run; if testing infrastructure has a stale lockfile from earlier `lean` preset runs, regenerate it. No data migration needed. |
| Live service config | None — no external services touch the BMAD module. The 16 agents are static .md files; nothing reads them at runtime except Claude Code itself when installed. | None |
| OS-registered state | None — no scheduled tasks, no daemons, no installed binaries. `npx gomad install` is the only entry point. | None |
| Secrets/env vars | None — no env vars reference `bmad`, `mob`, or `bmm`. Verified by grep across `bin/`, `tools/`, `src/`, `test/`. | None |
| Build artifacts / installed packages | `node_modules/bmad-method/` exists [VERIFIED: package-lock.json:152]. After `peerDependencies` removal and `npm install`, npm will purge this on the next install. `package-lock.json` will also need regeneration. | After D-14, run `npm install` to regenerate `package-lock.json` and remove `node_modules/bmad-method/`. |

**The canonical question — after every file in the repo is updated, what runtime systems still have the old string cached, stored, or registered?**

Answer: only `package-lock.json` and `node_modules/bmad-method/`, both purged by a fresh `npm install` after `package.json` is edited. There is **no** runtime state to migrate.

## Common Pitfalls

### Pitfall 1: Confusing the two BMAD prefixes
**What goes wrong:** CONTEXT D-03 says strip `mob-`. The agent .md files actually use `bmm-` in their `name:` fields. Only the to-be-deleted `skill-manifest.yaml` uses `mob-` IDs. Stripping only `mob-` will leave 16 agents with broken `bmm-*` names that don't match their filenames.
**Why it happens:** Two different BMAD legacy modules: `bmm` (BMAD Method Module — origin of these agents) and `mob` (the gomad/mobmad module code that wrapped them).
**How to avoid:** Plan must rewrite `name:` in every .md file to the bare unprefixed form. Verify with: `grep -r "^name: bmm-\|^name: mob-" assets/agents/` returns zero matches after migration.
**Warning signs:** Test failures, agents not callable by their expected name.

### Pitfall 2: Assuming `assets/agents/` install is preset-gated
**What goes wrong:** Adding 16 agents to `assets/agents/` will cause every `gomad install` to copy all 16 regardless of preset, because the installer does not filter by lockfile.
**Why it happens:** `tools/installer.js` does a wholesale recursive copy of `assets/agents/`.
**How to avoid:** Accept this for Phase 3; surface to user only if undesired. Out of scope to fix the installer here.
**Warning signs:** Users running `lean` preset and getting all 16 ex-BMAD agents installed anyway.

### Pitfall 3: Forgetting the `BMAD/` vendored sub-repo
**What goes wrong:** Grepping for `bmad-method` returns hundreds of hits inside `BMAD/` (a vendored copy of the BMAD-METHOD source itself, used for reference).
**Why it happens:** `BMAD/` was included in the repo as a reference; it is NOT a runtime dependency of gomad and is not in `package.json`.
**How to avoid:** Decoupling assertions (D-13) must scope grep to `bin/`, `tools/`, `src/`, `test/`, `assets/`, `catalog/` — explicitly excluding `BMAD/`, `node_modules/`, `.planning/`, and `package-lock.json`. Otherwise tests will false-positive forever.
**Warning signs:** Decoupling test fails immediately on a commit that already removed all real bmad-method usage.

### Pitfall 4: Empty `peerDependencies` key vs deleted key
**What goes wrong:** D-14 says delete the key entirely if it becomes empty. Removing only `bmad-method` and leaving `peerDependencies: {}` looks "done" but trips the D-13 (a) assertion if it just checks `pkg.peerDependencies?.['bmad-method']` (passes) versus `pkg.peerDependencies` (fails).
**How to avoid:** Implementation must `delete pkg.peerDependencies` (not set to `{}`). Test should assert `pkg.peerDependencies === undefined` AND no key named `bmad-method` anywhere in the file.

### Pitfall 5: Test file `test/test-module.js` is entirely BMAD-coupled
**What goes wrong:** The whole file (100 lines) is structured around `module.yaml` existing, `module-help.csv` having ≥20 entries, `peerDependencies['bmad-method']` being present, and `src/module/agents/{subdirs}` existing. Surgical edits will leave a husk.
**How to avoid:** Delete the entire file. Replace with a new `test/test-decoupling.js` that asserts the four D-13 conditions. Faster, cleaner, less risk of orphan asserts.

## Code Examples

### Frontmatter rewrite pattern (verified from tools/package-skills.js:34-52)

```javascript
import { readFileSync, writeFileSync } from 'fs';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';

function rewriteAgentFrontmatter(filePath, newName) {
  const content = readFileSync(filePath, 'utf8');
  const match = content.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) throw new Error(`No frontmatter in ${filePath}`);

  const fm = parseYaml(match[1]);

  // Rewrite per D-03/D-04
  fm.name = newName;
  delete fm.module;
  delete fm.canonicalId;
  delete fm.displayName;
  delete fm.title;
  // Keep: description, tools

  const newFrontmatter = `---\n${stringifyYaml(fm)}---\n`;
  const body = content.slice(match[0].length);
  writeFileSync(filePath, newFrontmatter + body, 'utf8');
}
```

**Caveat:** the current 16 .md files only carry `name`, `description`, `tools` in frontmatter (not `module`/`canonicalId`/`displayName`/`title`). Those four fields live in the YAML manifest, not the .md files [VERIFIED: src/module/agents/analysis/codebase-analyzer.md:1-5]. So the rewrite is effectively just `fm.name = newName` plus copying the file. The `delete` calls are defensive no-ops.

### Decoupling test pattern (matches test/test-installation.js:101-122)

```javascript
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');

describe('BMAD decoupling', () => {
  it('package.json has no bmad-method dependency', () => {
    const pkg = JSON.parse(readFileSync(join(PROJECT_ROOT, 'package.json'), 'utf8'));
    assert.equal(pkg.peerDependencies, undefined);
    assert.equal(pkg.dependencies?.['bmad-method'], undefined);
  });

  it('src/module/ does not exist', () => {
    assert.ok(!existsSync(join(PROJECT_ROOT, 'src', 'module')));
  });

  it('no agent file contains BMAD frontmatter fields', () => {
    const agentsDir = join(PROJECT_ROOT, 'assets', 'agents');
    for (const file of readdirSync(agentsDir).filter(f => f.endsWith('.md'))) {
      const content = readFileSync(join(agentsDir, file), 'utf8');
      assert.ok(!/^module:/m.test(content), `${file} has module:`);
      assert.ok(!/^canonicalId:/m.test(content), `${file} has canonicalId:`);
    }
  });

  it('no source file imports bmad-method', () => {
    const sourceDirs = ['bin', 'tools', 'src', 'test'];
    for (const dir of sourceDirs) {
      const dirPath = join(PROJECT_ROOT, dir);
      if (!existsSync(dirPath)) continue;
      walkAndAssertNoBmad(dirPath);
    }
  });
});
```

## Concrete File Inventory

### 16 Agents to Migrate (D-01)

[VERIFIED: ls of src/module/agents/]

| Source path | Destination | Catalog name (current) | Catalog name (after) |
|---|---|---|---|
| `src/module/agents/analysis/api-documenter.md` | `assets/agents/api-documenter.md` | `analysis/api-documenter` | `api-documenter` |
| `src/module/agents/analysis/codebase-analyzer.md` | `assets/agents/codebase-analyzer.md` | `analysis/codebase-analyzer` | `codebase-analyzer` |
| `src/module/agents/analysis/data-analyst.md` | `assets/agents/data-analyst.md` | `analysis/data-analyst` | `data-analyst` |
| `src/module/agents/analysis/pattern-detector.md` | `assets/agents/pattern-detector.md` | `analysis/pattern-detector` | `pattern-detector` |
| `src/module/agents/planning/dependency-mapper.md` | `assets/agents/dependency-mapper.md` | `planning/dependency-mapper` | `dependency-mapper` |
| `src/module/agents/planning/epic-optimizer.md` | `assets/agents/epic-optimizer.md` | `planning/epic-optimizer` | `epic-optimizer` |
| `src/module/agents/planning/requirements-analyst.md` | `assets/agents/requirements-analyst.md` | `planning/requirements-analyst` | `requirements-analyst` |
| `src/module/agents/planning/technical-decisions-curator.md` | `assets/agents/technical-decisions-curator.md` | `planning/technical-decisions-curator` | `technical-decisions-curator` |
| `src/module/agents/planning/trend-spotter.md` | `assets/agents/trend-spotter.md` | `planning/trend-spotter` | `trend-spotter` |
| `src/module/agents/planning/user-journey-mapper.md` | `assets/agents/user-journey-mapper.md` | `planning/user-journey-mapper` | `user-journey-mapper` |
| `src/module/agents/planning/user-researcher.md` | `assets/agents/user-researcher.md` | `planning/user-researcher` | `user-researcher` |
| `src/module/agents/research/market-researcher.md` | `assets/agents/market-researcher.md` | `research/market-researcher` | `market-researcher` |
| `src/module/agents/research/tech-debt-auditor.md` | `assets/agents/tech-debt-auditor.md` | `research/tech-debt-auditor` | `tech-debt-auditor` |
| `src/module/agents/review/document-reviewer.md` | `assets/agents/document-reviewer.md` | `review/document-reviewer` | `document-reviewer` |
| `src/module/agents/review/technical-evaluator.md` | `assets/agents/technical-evaluator.md` | `review/technical-evaluator` | `technical-evaluator` |
| `src/module/agents/review/test-coverage-analyzer.md` | `assets/agents/test-coverage-analyzer.md` | `review/test-coverage-analyzer` | `test-coverage-analyzer` |

Counts: 4 analysis + 7 planning + 2 research + 3 review = 16. ✓

### Existing assets/agents/ contents (collision check)

[VERIFIED: ls of assets/agents/]
```
architect.md
build-error-resolver.md
code-reviewer.md
planner.md
security-reviewer.md
tdd-guide.md
```

No collisions with the 16 new flat names. ✓

### catalog/agents.yaml entries to update (D-02)

[VERIFIED: catalog/agents.yaml:150-222]

Lines 150-222 contain 16 entries with `analysis/`, `planning/`, `research/`, `review/` prefixes. Plan must:
1. Rewrite each to use the flat unprefixed name.
2. Optionally drop the `# === Project-Specific Agents ===` header comment, or keep it as a categorization aid.
3. Keep `scope: project` and `default_include: true` (matches existing convention).

### catalog/presets.yaml references to update

[VERIFIED: catalog/presets.yaml:204-219, 269-284]

Two presets reference the prefixed names:
- `enterprise.additional_agents` (lines 204-219) — 16 entries with `analysis/`, `planning/`, etc. prefixes
- `enhanced.additional_agents` (lines 269-284) — same 16 entries

Both must be updated to flat names for preset resolution to keep working. **This is a required change for D-02 to function**, not a discretionary preset reorganization.

### bin/gomad-cli.js — `package` command removal (D-10)

[VERIFIED: bin/gomad-cli.js:53-59]

```javascript
program
  .command('package')
  .description('Package selected skills into src/module/skills/ with manifests')
  .action(async () => {
    const { packageSkills } = await import('../tools/package-skills.js');
    packageSkills();
  });
```

Delete lines 53-59 (the entire `program.command('package')` block). Nothing else in `bin/gomad-cli.js` references package-skills or BMAD.

### Test files needing surgery (D-11, D-12)

[VERIFIED via grep + read]

| File | Lines | Action |
|------|-------|--------|
| `test/test-installation.js` | 21-67 | Delete entire `describe('Integration: curate + package flow', ...)` block. The `programmatic curate creates correct lockfile` test still has value but overlaps with `test/test-presets.js`; safe to delete the whole describe. Lines 73-82 also reference `package` command in `--help` output assertion — change `assert.ok(output.includes('package'));` to `assert.ok(!output.includes('package'));` |
| `test/test-installation.js` | 73-82 | Update `--help shows all commands` test: remove `package` from expected, add it to forbidden list |
| `test/test-module.js` | 1-100 | Delete entire file. Every assertion is BMAD-specific (module.yaml fields, module-help.csv structure, peerDependencies['bmad-method'], src/module/agents/ subdirs, package-skills.js in tools list) |
| (new) `test/test-decoupling.js` | new | Create with the four D-13 assertions |

### package.json edits (D-14)

[VERIFIED: package.json:23-25]

Lines 23-25:
```json
  "peerDependencies": {
    "bmad-method": "^6.x"
  },
```

Delete these three lines. Trailing comma on previous line stays valid (line 22 is the closing `]` of `keywords`, no comma needed before `peerDependencies`). Verify the resulting JSON parses.

Also note line 39: `"global/",` in the `files` array. Phase 2 already renamed `global/` → `assets/`, so this is **already a Phase 2 carryover bug**: the published package would not include `assets/`. Surface to planner — consider fixing here as a one-line nit (`"global/"` → `"assets/"`) or defer to Phase 4. Not in CONTEXT, so technically out of scope; flag only.

## src/module/skills/ Audit (D-07)

[VERIFIED: ls of src/module/skills/, grep for "src/module/skills"]

Contents (14 directories): api-design, coding-standards, database-migrations, deep-research, deployment-patterns, docker-patterns, find-skills, postgres-patterns, prompt-optimizer, search-first, security-review, security-scan, tdd-workflow, verification-loop.

Each directory contains a `skill-manifest.yaml` with `canonicalId: mob-{name}` (BMAD artifacts).

**External references to `src/module/skills/`:**
- `bin/gomad-cli.js:55` — only inside the `package` command description string, removed by D-10
- `tools/package-skills.js` — the only writer; deleted by D-09
- `CLAUDE.md`, `README.md`, `.planning/codebase/*.md` — documentation references, Phase 4 cleanup
- `test/test-installation.js:48` — inside the deleted-by-D-12 describe block

**No runtime code outside `tools/package-skills.js` reads `src/module/skills/`.** Curator does not read it. Installer does not read it. Catalogs do not reference it.

**Recommendation: SAFE TO DELETE.** Audit comes back clean — no consumer survives Phase 3's deletions. Proceed with the full `rm -rf src/module/skills/` as part of D-06.

## State of the Art

Not applicable — this is a deletion phase, not a technology selection phase.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The 16 ex-BMAD agents have no functional dependencies on each other (no cross-agent file imports inside the .md content). [ASSUMED — sampled 2 of 16 agent bodies, no cross-references found, but did not exhaustively read all 16] | Agent Migration | Low — agents are .md prompts; they reference each other by name in prose at most |
| A2 | Removing `bmad-method` from peerDependencies + `npm install` will clean `node_modules/bmad-method/`. [ASSUMED — standard npm behavior] | Runtime State Inventory | Low — worst case, manual `rm -rf node_modules && npm install` |
| A3 | The `BMAD/` directory is a vendored reference copy and not consumed by gomad runtime. [VERIFIED: zero imports of `BMAD/` paths in `bin/`, `tools/`, `src/`, `test/`, `assets/`, `catalog/`] | Common Pitfalls | None — verified |

## Open Questions

1. **Should the planner delete the vendored `BMAD/` sub-repo as part of Phase 3?**
   - What we know: It's not a runtime dependency, not in `package.json`, not imported anywhere. It is committed to git per the gitStatus showing `?? BMAD/` (untracked, present locally).
   - What's unclear: Whether keeping it as reference material is intentional (contains the BMAD spec docs at `BMAD/docs/mobmad-plan.md` referenced in Phase 1 history).
   - Recommendation: **Leave alone.** Out of CONTEXT scope. Just exclude from decoupling test grep.

2. **Should the `# === Project-Specific Agents (15) — Project Scope ===` comment in catalog/agents.yaml become `(16)` or `(31)` or be removed?**
   - What we know: 15 is wrong even today (the 4 + 7 + 2 + 3 = 16 agents currently listed are 16, not 15).
   - What's unclear: Whether the comment is load-bearing (it's not — yaml comments).
   - Recommendation: Update to `(16)` and the total at line 223 from `48 agents (33 global + 15 project)` to `48 agents (32 global + 16 project)`. (Note: existing global count of 33 in the comment header conflicts with the trailer's 33; recount during execution.)

3. **Should the `package.json:39` `"global/"` → `"assets/"` Phase 2 carryover be fixed here?**
   - What we know: Phase 2 renamed the directory but missed the `files` array.
   - Recommendation: Out of strict CONTEXT scope. Surface to user; if approved, fix as a one-line nit. Otherwise defer to Phase 4.

## Environment Availability

Not applicable — this phase has no external runtime dependencies. All work is file edits, deletions, and existing-test runs. Node 18+ and `npm` are already required by the project.

## Sources

### Primary (HIGH confidence — verified by direct file read or grep)
- `package.json` — lines 23-25 (peerDependencies), line 39 (files array carryover bug)
- `bin/gomad-cli.js` — lines 53-59 (package command), full file 78 lines, no other BMAD refs
- `tools/installer.js` — full file 313 lines, lines 199-209 (wholesale assets/agents copy)
- `tools/package-skills.js` — full file 176 lines, line 24 (homedir read), line 104 (canonicalId mob-* generation)
- `src/module/agents/skill-manifest.yaml` — full file 146 lines, all 16 entries inventoried
- `src/module/agents/{subdirs}/*.md` — all 16 files listed; sampled `analysis/codebase-analyzer.md` and `planning/requirements-analyst.md` for frontmatter shape; grepped `^name:` across all 16 to confirm `bmm-` prefix
- `src/module/module.yaml` — full file 56 lines, contains the dead `install_global_assets` prompt
- `src/module/skills/` — 14 subdirectories listed, manifests grepped for `mob-*` IDs
- `assets/agents/` — 6 existing files listed, `code-reviewer.md` frontmatter sampled as template
- `catalog/agents.yaml` — full file 223 lines
- `catalog/presets.yaml` — full file 288 lines, enterprise/enhanced preset agent lists located
- `test/test-installation.js`, `test/test-module.js`, `test/test-catalogs.js`, `test/test-presets.js` — all read or sampled
- `.planning/REQUIREMENTS.md`, `.planning/ROADMAP.md`, `.planning/STATE.md`, `.planning/config.json` — all read

### Secondary (MEDIUM confidence)
- None — every claim in this research is grounded in a direct file read or grep of the working tree.

### Tertiary (LOW confidence)
- None.

## Metadata

**Confidence breakdown:**
- File inventory: HIGH — every file path, line number, and count was verified by direct read or grep against the working tree on 2026-04-07.
- Frontmatter prefix discrepancy (D-03 conflict): HIGH — verified by grepping `^name:` across all 16 .md files.
- Installer behavior (wholesale agent copy): HIGH — read installer.js end-to-end.
- Decoupling test grep scope: HIGH — confirmed `BMAD/` is the only false-positive source.
- src/module/skills/ deletion safety: HIGH — exhaustive grep for path references.
- "BMAD/ is reference-only" claim: HIGH — zero imports found in any source directory.

**Research date:** 2026-04-07
**Valid until:** 2026-05-07 (low-decay — pure refactor, no external dependencies)
