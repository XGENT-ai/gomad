# Phase 1: Rename - Research

**Researched:** 2026-04-07
**Domain:** Codebase-wide string/file rename (mobmad -> gomad, bmad- prefix stripping)
**Confidence:** HIGH

## Summary

Phase 1 is a pure branding rename with no behavioral changes. The codebase has 245 occurrences of "mobmad" across 31 files (including planning docs), and uses the "bmad-" prefix in 4 agent directories, 16 agent names in catalog/agents.yaml, 16 agent references in catalog/presets.yaml, and 14 bmad-skill-manifest.yaml files in src/module/skills/. The rename affects three layers: (1) file/directory names, (2) string content within source files, and (3) string content within YAML catalogs and config.

The existing test suite (35 tests, all passing, Node.js built-in test runner) validates catalog integrity, preset resolution, and module structure. Seven test assertions explicitly reference "mobmad" or "bmad-" names and must be updated to match the renamed targets. Decision D-08 keeps Node.js built-in test runner (no vitest migration in this phase).

**Primary recommendation:** Execute as a systematic find-and-replace in a deterministic order: rename files/directories first, then update all string content, then update tests to match, then verify with `npm test`.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Delete old files and create new ones (no git mv) -- clean break, losing blame history is acceptable
- **D-02:** All renames happen in a single atomic commit -- no intermediate broken states
- **D-03:** Ignore old mobmad.lock.yaml and .mobmad-manifest.yaml files entirely -- gomad starts fresh. Phase 2 changes install target to project-local anyway, making old global files irrelevant.
- **D-04:** Replace "mobmad" with "gomad" everywhere -- JS source, tests, package.json, README, catalog YAML descriptions, agent content, comments, log strings. Zero traces.
- **D-05:** Strip "bmad-" prefix from agent directory names: bmad-analysis/ -> analysis/, bmad-planning/ -> planning/, bmad-research/ -> research/, bmad-review/ -> review/
- **D-06:** Strip "bmad-" prefix from agent names in catalog/agents.yaml: "bmad-api-documenter" -> "api-documenter", "bmad-codebase-analyzer" -> "codebase-analyzer", etc.
- **D-07:** Strip "bmad-" prefix from all references (filenames, catalog entries, module-help.csv, skill manifests) -- consistent and clean
- **D-08:** Keep Node.js built-in test runner for now -- do not migrate to vitest in Phase 1. Vitest migration deferred to Phase 4 (TST-04).
- **D-09:** Update all internal string references in test files from mobmad to gomad
- **D-10:** Review and rename test file names if any contain "mobmad" (unlikely but check)

### Claude's Discretion
- Order of operations within the atomic commit (which files to change first)
- Handling of any edge cases in string replacement (e.g., URLs, paths in comments)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| REN-01 | Package name is "gomad" in package.json with correct description | package.json has name "mobmad", description references "BMAD" -- both need updating |
| REN-02 | CLI binary is "gomad" (bin field points to bin/gomad-cli.js) | package.json bin field is `{"mobmad": "bin/mobmad-cli.js"}` -- needs both key and value change |
| REN-03 | CLI entry file renamed from mobmad-cli.js to gomad-cli.js with all internal references updated | bin/mobmad-cli.js has 7 "mobmad" occurrences in .name(), .description(), help text, and log strings |
| REN-04 | Lock file renamed from mobmad.lock.yaml to gomad.lock.yaml | Hardcoded in curator.js (line 185), global-installer.js (line 18), package-skills.js (line 27), sync-upstream.js (line 17) |
| REN-05 | Manifest file renamed from .mobmad-manifest.yaml to .gomad-manifest.yaml | Hardcoded in global-installer.js (line 16) as MANIFEST_PATH constant |
| REN-06 | All string literals, comments, logs, and help text reference "gomad" instead of "mobmad" | 245 occurrences across 31 files; 12 source files need content changes |
| TST-01 | All existing tests updated to reference gomad instead of mobmad | 7 test assertions reference "mobmad" directly; "bmad-" references in tests need updating too |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- **Tech stack**: Node.js, keep existing dependencies (commander, @clack/prompts, yaml, fs-extra, chalk)
- **No global writes**: Must not write anything to ~/ or $HOME directories
- **GSD Workflow**: All changes must go through GSD workflow
- **Code style**: 2-space indentation, no semicolons, ESM modules, functional approach
- **File size**: 200-400 lines typical, 800 max
- **Immutability**: Spread operators, no mutation

## Architecture Patterns

### Rename Execution Order (Recommended)

The order matters to avoid broken intermediate states within the single commit:

```
1. Rename files/directories (create new, will delete old)
   - bin/mobmad-cli.js -> bin/gomad-cli.js
   - mobmad.lock.yaml -> gomad.lock.yaml (D-03: actually just delete, gomad starts fresh)
   - src/module/agents/bmad-analysis/ -> src/module/agents/analysis/
   - src/module/agents/bmad-planning/ -> src/module/agents/planning/
   - src/module/agents/bmad-research/ -> src/module/agents/research/
   - src/module/agents/bmad-review/ -> src/module/agents/review/

2. Update source file content (string replacements)
   - bin/gomad-cli.js (7 occurrences)
   - tools/global-installer.js (12 occurrences)
   - tools/curator.js (4 occurrences)
   - tools/sync-upstream.js (4 occurrences)
   - tools/package-skills.js (3 occurrences)
   - package.json (name, bin, description, keywords, peerDependencies)

3. Update catalog/config YAML files
   - catalog/agents.yaml (16 bmad- agent names + 1 header comment)
   - catalog/presets.yaml (32 bmad- agent references + 1 header + bmad-enhanced preset name)
   - catalog/skills.yaml (1 header comment)
   - catalog/commands.yaml (1 header comment)
   - catalog/hooks.yaml (1 header comment)

4. Update module files
   - src/module/module.yaml (3 occurrences)
   - src/module/agents/bmad-skill-manifest.yaml (complete rewrite -- all keys use bmad- prefix)
   - src/module/skills/*/bmad-skill-manifest.yaml (14 files, rename to skill-manifest.yaml or similar)

5. Update documentation
   - README.md (25 occurrences)

6. Update test files
   - test/test-installation.js (4 mobmad + bmad references)
   - test/test-module.js (3 mobmad + bmad references)
   - test/test-presets.js (bmad-enhanced references)

7. Verify: npm test
```

### Anti-Patterns to Avoid
- **Partial rename**: Leaving any "mobmad" string anywhere will break catalog cross-references that tests validate
- **Case-insensitive replace**: "MOBMAD" does not appear but "Mobmad" might in prose -- check carefully
- **Renaming package-lock.json entries**: Do NOT manually edit package-lock.json; it will be regenerated by `npm install` after package.json changes
- **Touching .planning/ docs**: Planning docs reference "mobmad" for historical context -- these are documentation, not code. The planner should decide whether to update them.
- **Touching BMAD/ directory**: This is legacy/upstream reference material, not part of the gomad codebase

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| String replacement | Custom regex engine | Direct string replacement in editor/Write tool | Simple find-replace is sufficient; "mobmad" is unique enough to not have false positives |
| YAML editing | Manual YAML string manipulation | Read file, replace strings, write file | YAML structure stays identical; only string values change |

**Key insight:** This is a mechanical rename, not a refactoring. Every "mobmad" becomes "gomad", every "bmad-" prefix on agent dirs/names gets stripped. No logic changes.

## Runtime State Inventory

This is a rename phase, so runtime state must be considered.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | mobmad.lock.yaml in project root | D-03: Delete it (gomad starts fresh) |
| Live service config | None -- no external services reference "mobmad" | None |
| OS-registered state | None -- CLI not globally installed on dev machine for this project | None |
| Secrets/env vars | None -- no env vars reference "mobmad" | None |
| Build artifacts | package-lock.json contains "mobmad" as package name (3 occurrences) | Run `npm install` after package.json rename to regenerate |

**The canonical question:** After every file in the repo is updated, what runtime systems still have the old string cached, stored, or registered?

**Answer:** Only package-lock.json (regenerated by npm install) and the old mobmad.lock.yaml file (deleted per D-03). No external runtime state exists for this project.

## Common Pitfalls

### Pitfall 1: package-lock.json Manual Edit
**What goes wrong:** Manually editing package-lock.json to replace "mobmad" causes checksum/integrity mismatches
**Why it happens:** package-lock.json has computed hashes that change when content changes
**How to avoid:** After changing package.json, run `npm install` to regenerate package-lock.json
**Warning signs:** `npm ci` fails with integrity errors

### Pitfall 2: bmad-skill-manifest.yaml in Skills
**What goes wrong:** 14 files named `bmad-skill-manifest.yaml` under src/module/skills/ contain `install_to_bmad: true` -- this is a BMAD-specific field
**Why it happens:** These manifests are for BMAD module integration which is being removed in Phase 3
**How to avoid:** Per D-07, strip "bmad-" prefix from filenames. The `install_to_bmad` field content is Phase 3 scope (BMA-03) -- in Phase 1, just rename the file, keep the field for now
**Warning signs:** test-installation.js line 58-64 checks for `bmad-skill-manifest.yaml` existence and `install_to_bmad` field

### Pitfall 3: Preset Name "bmad-enhanced"
**What goes wrong:** The preset named "bmad-enhanced" in catalog/presets.yaml should be renamed, but this is referenced in tests and module.yaml
**Why it happens:** The preset name contains "bmad-" which D-07 says to strip
**How to avoid:** Rename to "enhanced" and update all references (test-presets.js line 98-102, test-module.js line 30, module.yaml line 23)
**Warning signs:** Test failures in preset resolution tests

### Pitfall 4: Agent Name Format Change
**What goes wrong:** Agent names in catalog/agents.yaml use format "bmad-category/agent-name" (e.g., "bmad-analysis/api-documenter"). After stripping bmad- prefix, they become "analysis/api-documenter"
**Why it happens:** The directory rename (bmad-analysis/ -> analysis/) changes the agent namespace
**How to avoid:** Update all references consistently: catalog/agents.yaml, catalog/presets.yaml, src/module/agents/bmad-skill-manifest.yaml, and any test that filters by "bmad-" prefix
**Warning signs:** test-presets.js line 101 filters agents by `a.startsWith('bmad-')` -- this test assertion must be rewritten

### Pitfall 5: Test Assertion Logic Changes
**What goes wrong:** Some tests don't just check string values -- they have logic based on "bmad-" prefix
**Why it happens:** test-presets.js line 101: `result.agents.filter((a) => a.startsWith('bmad-'))` will return 0 after rename
**How to avoid:** Rewrite this assertion to filter by the new prefix (e.g., `a.startsWith('analysis/')` or check against known agent names)
**Warning signs:** Test passes with 0 matches when it expects 10+

## Comprehensive File Change Inventory

### Files to RENAME (delete old, create new per D-01)

| Old Path | New Path |
|----------|----------|
| bin/mobmad-cli.js | bin/gomad-cli.js |
| mobmad.lock.yaml | DELETE (D-03: gomad starts fresh) |
| src/module/agents/bmad-analysis/ | src/module/agents/analysis/ |
| src/module/agents/bmad-planning/ | src/module/agents/planning/ |
| src/module/agents/bmad-research/ | src/module/agents/research/ |
| src/module/agents/bmad-review/ | src/module/agents/review/ |
| src/module/agents/bmad-skill-manifest.yaml | src/module/agents/skill-manifest.yaml |
| src/module/skills/*/bmad-skill-manifest.yaml (14 files) | src/module/skills/*/skill-manifest.yaml |

### Files to UPDATE (string content only)

**Source files (12 files):**

| File | mobmad count | bmad- count | Key changes |
|------|-------------|-------------|-------------|
| bin/gomad-cli.js (after rename) | 7 | 1 | .name(), .description(), all help text, preset list |
| tools/global-installer.js | 12 | 0 | MANIFEST_PATH, LOCKFILE_PATH, all console.log strings, backup path pattern |
| tools/curator.js | 4 | 0 | Lockfile path, intro/outro text, JSDoc |
| tools/sync-upstream.js | 4 | 0 | LOCKFILE_PATH, console.log strings |
| tools/package-skills.js | 3 | 2+ | LOCKFILE_PATH, console.log, bmad-skill-manifest references |
| package.json | 2 | 2 | name, bin key+value, description, keywords, peerDependencies |

**Catalog files (5 files):**

| File | Changes |
|------|---------|
| catalog/agents.yaml | Header comment + 16 agent names (bmad-X/Y -> X/Y) |
| catalog/presets.yaml | Header comment + 32 agent refs + "bmad-enhanced" -> "enhanced" |
| catalog/skills.yaml | Header comment only |
| catalog/commands.yaml | Header comment only |
| catalog/hooks.yaml | Header comment only |

**Module files (2+ files):**

| File | Changes |
|------|---------|
| src/module/module.yaml | 3 occurrences (preset name, status/uninstall help text) |
| src/module/agents/skill-manifest.yaml (after rename) | Complete rewrite: all 16 keys drop bmad- prefix |

**Test files (3 files):**

| File | Changes |
|------|---------|
| test/test-installation.js | CLI path, lockfile path, status output strings, bmad-skill-manifest references |
| test/test-module.js | package name assertion, bin assertion, peerDep assertion, CLI path, agent subdirs, preset list |
| test/test-presets.js | Preset name list, bmad-enhanced test case, agent prefix filter logic |

**Documentation (1 file):**

| File | Changes |
|------|---------|
| README.md | 25 occurrences -- full rewrite of brand name and examples |

### Files to NOT TOUCH

| File/Directory | Reason |
|----------------|--------|
| .planning/* | Historical documentation, not executable code |
| BMAD/* | Legacy upstream reference, not part of gomad |
| package-lock.json | Regenerated by `npm install` |
| node_modules/ | Regenerated |
| .git/ | Never touch |

## Code Examples

### package.json Changes
```json
{
  "name": "gomad",
  "description": "GOMAD Orchestration Method for Agile Development — curated Claude Code skills, agents, rules, hooks, and commands",
  "bin": {
    "gomad": "bin/gomad-cli.js"
  },
  "keywords": [
    "gomad",
    "claude-code",
    "ai-development",
    "skills",
    "agents"
  ]
}
```
[VERIFIED: package.json read directly]

### CLI Name Change
```javascript
program
  .name('gomad')
  .description('GOMAD — curated Claude Code environment')
  .version(pkg.version);
```
[VERIFIED: bin/mobmad-cli.js read directly]

### Constants Update (global-installer.js)
```javascript
const MANIFEST_PATH = join(CLAUDE_DIR, '.gomad-manifest.yaml');
const LOCKFILE_PATH = join(PROJECT_ROOT, 'gomad.lock.yaml');
```
[VERIFIED: tools/global-installer.js read directly]

### Agent Catalog Entry (before/after)
```yaml
# Before
- name: bmad-analysis/api-documenter
  description: Generate API documentation
  scope: project
  default_include: false

# After
- name: analysis/api-documenter
  description: Generate API documentation
  scope: project
  default_include: false
```
[VERIFIED: catalog/agents.yaml read directly]

### Test Assertion Update (test-presets.js)
```javascript
// Before
it('bmad-enhanced extends lean and includes BMAD agents', () => {
  assert.equal(presets['bmad-enhanced'].extend, 'lean');
  const result = resolvePreset('bmad-enhanced', presets, catalogs);
  const bmadAgents = result.agents.filter((a) => a.startsWith('bmad-'));
  assert.ok(bmadAgents.length >= 10, `expected 10+ BMAD agents, got ${bmadAgents.length}`);
});

// After
it('enhanced extends lean and includes analysis/planning/research/review agents', () => {
  assert.equal(presets['enhanced'].extend, 'lean');
  const result = resolvePreset('enhanced', presets, catalogs);
  const specialAgents = result.agents.filter((a) =>
    a.startsWith('analysis/') || a.startsWith('planning/') ||
    a.startsWith('research/') || a.startsWith('review/')
  );
  assert.ok(specialAgents.length >= 10, `expected 10+ specialized agents, got ${specialAgents.length}`);
});
```
[VERIFIED: test/test-presets.js read directly]

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| mobmad (BMAD-dependent) | gomad (standalone) | This phase | All references update |
| bmad- prefixed agents | Plain descriptive names | This phase | Cleaner naming |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | No test file names contain "mobmad" (D-10 check) | File Change Inventory | LOW -- verified by find command, no test files have "mobmad" in name |
| A2 | "bmad-enhanced" preset should be renamed to "enhanced" per D-07 | Pitfall 3 | MEDIUM -- if user wanted to keep this name, tests would need different update |
| A3 | bmad-skill-manifest.yaml files should be renamed to skill-manifest.yaml | File Change Inventory | LOW -- D-07 says strip bmad- from all filenames |
| A4 | .planning/ docs should NOT be updated in this phase | Files to NOT TOUCH | LOW -- these are historical docs, not runtime code |

All claims tagged [ASSUMED] above. All other claims in this research were verified by direct file reading.

## Open Questions

1. **Should .planning/ documentation be updated?**
   - What we know: 13 .planning/ files reference "mobmad" (total ~130 occurrences)
   - What's unclear: Whether planning docs should be treated as historical record or kept current
   - Recommendation: Skip in Phase 1 (they're planning artifacts, not shipped code). Can be updated separately if desired.

2. **What happens to the `bmad-method` peerDependency in package.json?**
   - What we know: package.json has `"peerDependencies": {"bmad-method": "^6.x"}` and test-module.js asserts it exists
   - What's unclear: D-04 says replace "mobmad" everywhere but the peerDep is "bmad-method" (not "mobmad")
   - Recommendation: This is Phase 3 scope (BMA-01). In Phase 1, leave the peerDependency but update the test assertion to not check for it (since it will be removed in Phase 3). Or leave both untouched if purely a Phase 3 concern.

## Environment Availability

Step 2.6: No external dependencies needed. Phase 1 is purely code/config string replacement. Node.js and npm are confirmed available (tests pass).

## Sources

### Primary (HIGH confidence)
- Direct file reads of all 12 source files, 5 catalog files, 3 test files, package.json, README.md
- `grep -r "mobmad"` across full codebase: 245 occurrences in 31 files
- `grep -r "bmad-"` across full codebase: 100+ files (most in BMAD/ directory, ~20 in gomad source)
- `find . -name "*mobmad*"`: 3 files (bin/mobmad-cli.js, mobmad.lock.yaml, BMAD/docs/mobmad-plan.md)
- `find . -name "*bmad*"`: 22 files in src/module/ (4 dirs + 14 skill manifests + agent manifest + 3 other)
- `npm test`: 35/35 tests pass (baseline before rename)

## Metadata

**Confidence breakdown:**
- File inventory: HIGH - every file was read and grep-verified
- String replacement scope: HIGH - exact occurrence counts from grep
- Test impact: HIGH - all test assertions manually reviewed
- Edge cases (bmad-enhanced, skill manifests): HIGH - identified and documented

**Research date:** 2026-04-07
**Valid until:** Indefinite (codebase rename is a snapshot-in-time analysis)
