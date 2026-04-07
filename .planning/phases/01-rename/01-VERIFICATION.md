---
phase: 01-rename
verified: 2026-04-07T08:15:00Z
status: gaps_found
score: 7/9 must-haves verified
overrides_applied: 0
gaps:
  - truth: "No file in the project contains the string 'mobmad' (excluding .planning/, BMAD/, node_modules/, .git/, package-lock.json)"
    status: failed
    reason: "CLAUDE.md (project root, not in any exclusion directory) contains 16 occurrences of 'mobmad', including actively inaccurate developer documentation such as 'bin/mobmad-cli.js', 'npm install -g mobmad', and '~/.claude/.mobmad-manifest.yaml'. These are developer-facing instructions that now point to incorrect paths and commands."
    artifacts:
      - path: "CLAUDE.md"
        issue: "16 occurrences of 'mobmad' including stale binary path (bin/mobmad-cli.js), stale manifest path (.mobmad-manifest.yaml), stale install command (npm install -g mobmad), stale MCP command (mobmad mcp enable). Not historical context — these are live developer instructions."
    missing:
      - "Update CLAUDE.md to replace all occurrences of 'mobmad' with 'gomad', correct file paths (bin/gomad-cli.js), correct manifest path (.gomad-manifest.yaml), and correct commands (gomad mcp enable)"
  - truth: "No file in the project contains the string 'mobmad' (excluding .planning/, BMAD/, node_modules/, .git/, package-lock.json)"
    status: partial
    reason: "mobmad.lock.yaml still exists as an untracked file in the project root. The plan task D-03 explicitly called for deletion ('Delete mobmad.lock.yaml from project root (gomad starts fresh, no migration)'). The SUMMARY acknowledged this as a 'git artifact' but it was not removed."
    artifacts:
      - path: "mobmad.lock.yaml"
        issue: "File still exists as untracked in project root. Plan task D-03 required deletion. The filename 'mobmad.lock.yaml' violates the zero-mobmad-filenames requirement (plan verification step 4 checks: find . -name '*mobmad*')."
    missing:
      - "Delete mobmad.lock.yaml from project root (rm mobmad.lock.yaml)"
deferred:
  - truth: "module code 'mob' not renamed across module.yaml, skill-manifest.yaml, module-help.csv, package-skills.js, and tests (80+ occurrences)"
    addressed_in: "Phase 3"
    evidence: "Phase 3 BMA-02: 'BMAD module registration code removed (module.yaml integration)'; BMA-03: 'package-skills.js BMAD manifest generation removed (skill copying retained if needed)'; BMA-04: 'BMAD-specific agents in src/module/agents/ converted to regular agents'. The 'mob' code is the BMAD module identifier, not a mobmad->gomad rename item."
  - truth: "install_to_bmad field in 14 skill manifests and package-skills.js canonicalId/module fields not updated"
    addressed_in: "Phase 3"
    evidence: "Phase 3 BMA-03: 'package-skills.js BMAD manifest generation removed (skill copying retained if needed)'. The install_to_bmad field is BMAD integration metadata, not a mobmad rename item."
  - truth: "bin/gomad-cli.js line 66 references '.claude/skills/mob/' in uninstall help text; global-installer.js line 214 references 'npx bmad-method install --modules bmm,mob'"
    addressed_in: "Phase 3"
    evidence: "Phase 3 BMA-02: 'BMAD module registration code removed (module.yaml integration)'. These strings reference the BMAD module installation path (mob = BMAD module code), not a mobmad rename."
---

# Phase 01: Rename Verification Report

**Phase Goal:** The CLI is fully rebranded as gomad with no trace of mobmad in code, filenames, or output
**Verified:** 2026-04-07T08:15:00Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

Truths derive from two sources merged: ROADMAP.md success criteria (non-negotiable contract) and PLAN 01-01/01-02 must_haves frontmatter.

| # | Truth | Source | Status | Evidence |
|---|-------|--------|--------|----------|
| 1 | Running `node bin/gomad-cli.js --help` shows "gomad" in all help text with no mention of "mobmad" | ROADMAP SC1 | VERIFIED | CLI outputs "Usage: gomad", "GOMAD — curated Claude Code environment". Zero mobmad occurrences in help output. |
| 2 | Lock file constant references `gomad.lock.yaml` and manifest constant references `.gomad-manifest.yaml` | ROADMAP SC2 | VERIFIED | `tools/global-installer.js`: `LOCKFILE_PATH = join(PROJECT_ROOT, 'gomad.lock.yaml')` and `MANIFEST_PATH = join(CLAUDE_DIR, '.gomad-manifest.yaml')`. Also verified in curator.js and sync-upstream.js. |
| 3 | package.json name field is "gomad" and bin field points to `bin/gomad-cli.js` | ROADMAP SC3 | VERIFIED | `"name": "gomad"`, `"bin": {"gomad": "bin/gomad-cli.js"}`, `"description": "GOMAD Orchestration Method for Agile Development..."` |
| 4 | All tests pass after renaming (test files reference gomad, not mobmad) | ROADMAP SC4 | VERIFIED | 35/35 tests pass with node --test. Zero "mobmad" in test files. Zero bmad-analysis/planning/research/review refs in test files. Note: ROADMAP says "vitest" but both plans and code use node --test (built-in runner). Tests pass. |
| 5 | Running `node bin/gomad-cli.js --help` shows "gomad" in program name and description with zero "mobmad" mentions | PLAN 01-01 T1 | VERIFIED | Same as SC1 above. `.name('gomad')` confirmed in bin/gomad-cli.js line 15. |
| 6 | package.json name is "gomad" and bin field maps "gomad" to "bin/gomad-cli.js" | PLAN 01-01 T2 | VERIFIED | Same as SC3 above. |
| 7 | No file in the project contains the string "mobmad" (excluding .planning/, BMAD/, node_modules/, .git/, package-lock.json) | PLAN 01-01 T3 | FAILED | CLAUDE.md in project root contains 16 occurrences of "mobmad", including stale developer documentation. mobmad.lock.yaml file still exists as an untracked file in the project root. |
| 8 | No agent directory or catalog entry contains "bmad-" prefix | PLAN 01-01 T4 | VERIFIED | `src/module/agents/` contains only: analysis/, planning/, research/, review/, skill-manifest.yaml. Zero bmad-prefixed dirs. catalog/agents.yaml uses plain `analysis/api-documenter` naming. catalog/presets.yaml uses `enhanced:` preset key. |
| 9 | All 35 tests pass with node --test | PLAN 01-02 T1 | VERIFIED | 35 pass, 0 fail, 0 cancelled. |

**Score:** 7/9 truths verified (2 failed — both from PLAN Truth 3, same underlying issue)

### Deferred Items

Items not yet met but explicitly addressed in later milestone phases. These use the `mob` module identifier (BMAD integration code), not the `mobmad` brand name — they are Phase 3 scope, not Phase 1.

| # | Item | Addressed In | Evidence |
|---|------|-------------|----------|
| 1 | Module code `mob` in module.yaml (`code: mob`), skill-manifest.yaml (48 occurrences of `module: mob`, `mob-*` canonicalIds), module-help.csv (26 `mob-*` skill entries), package-skills.js (generates `mob-` prefixed canonicalIds) | Phase 3 | BMA-02: "BMAD module registration code removed (module.yaml integration)"; BMA-03: "package-skills.js BMAD manifest generation removed" |
| 2 | `install_to_bmad: true` field in 14 skill-manifest.yaml files under `src/module/skills/` and in `tools/package-skills.js` | Phase 3 | BMA-03: "package-skills.js BMAD manifest generation removed (skill copying retained if needed)" |
| 3 | `bin/gomad-cli.js:66` references `.claude/skills/mob/` in uninstall help text; `tools/global-installer.js:214` references `npx bmad-method install --modules bmm,mob` | Phase 3 | BMA-02: "BMAD module registration code removed (module.yaml integration)" |

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `bin/gomad-cli.js` | CLI entry point renamed from mobmad-cli.js | VERIFIED | Exists. `.name('gomad')`. bin/mobmad-cli.js deleted. |
| `package.json` | Package identity as gomad | VERIFIED | `"name": "gomad"`, correct bin and description. |
| `src/module/agents/analysis/` | Renamed agent directory (was bmad-analysis/) | VERIFIED | Exists with 4 .md files: api-documenter.md, codebase-analyzer.md, data-analyst.md, pattern-detector.md. |
| `src/module/agents/planning/` | Renamed agent directory (was bmad-planning/) | VERIFIED | Exists with 7 .md files. |
| `src/module/agents/research/` | Renamed agent directory (was bmad-research/) | VERIFIED | Exists with 2 .md files. |
| `src/module/agents/review/` | Renamed agent directory (was bmad-review/) | VERIFIED | Exists with 3 .md files. |
| `CLAUDE.md` | All mobmad references replaced | FAILED | 16 occurrences remain; stale developer docs (wrong binary path, install command, manifest path). |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `package.json bin field` | `bin/gomad-cli.js` | `bin.gomad entry` | VERIFIED | `"gomad": "bin/gomad-cli.js"` confirmed in package.json. |
| `tools/global-installer.js` | `gomad.lock.yaml` | LOCKFILE_PATH constant | VERIFIED | `const LOCKFILE_PATH = join(PROJECT_ROOT, 'gomad.lock.yaml')` |
| `tools/global-installer.js` | `.gomad-manifest.yaml` | MANIFEST_PATH constant | VERIFIED | `const MANIFEST_PATH = join(CLAUDE_DIR, '.gomad-manifest.yaml')` |
| `test/test-installation.js` | `bin/gomad-cli.js` | CLI path assertion | VERIFIED | References gomad-cli.js, not mobmad-cli.js. |
| `test/test-module.js` | `package.json` | package name assertion | VERIFIED | `assert.equal(pkg.name, 'gomad')` |
| `test/test-presets.js` | `catalog/presets.yaml` | preset name resolution | VERIFIED | `presets['enhanced']`, `resolvePreset('enhanced',...)` |

### Data-Flow Trace (Level 4)

Not applicable — this phase performs rename/rebrand operations only (string replacements, file renames). No dynamic data rendering components were created or modified.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| CLI help shows gomad branding | `node bin/gomad-cli.js --help` | "Usage: gomad", zero "mobmad" | PASS |
| Full test suite passes | `npm test` | 35 pass, 0 fail | PASS |
| No mobmad in source files | `grep -r "mobmad" --include="*.js" --include="*.yaml" ...` | 16 hits in CLAUDE.md only | PARTIAL |
| No bmad-prefixed agent dirs | `find src/module/agents -name "bmad-*" -type d` | Zero results | PASS |
| Agent catalogs use plain names | `grep "analysis/api-documenter" catalog/agents.yaml` | Match found | PASS |
| Enhanced preset (not bmad-enhanced) | `grep "enhanced:" catalog/presets.yaml` | Match found | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| REN-01 | 01-01-PLAN.md | Package name is "gomad" with correct description | SATISFIED | `"name": "gomad"`, `"description": "GOMAD Orchestration Method for Agile Development..."` |
| REN-02 | 01-01-PLAN.md | CLI binary is "gomad", bin field points to bin/gomad-cli.js | SATISFIED | `"bin": {"gomad": "bin/gomad-cli.js"}` confirmed |
| REN-03 | 01-01-PLAN.md | CLI entry file renamed to gomad-cli.js with internal references updated | SATISFIED | bin/gomad-cli.js exists, bin/mobmad-cli.js deleted, `.name('gomad')` confirmed |
| REN-04 | 01-01-PLAN.md | Lock file renamed to gomad.lock.yaml (constant in code) | SATISFIED | LOCKFILE_PATH constant updated in global-installer.js, curator.js, sync-upstream.js, package-skills.js. Note: physical mobmad.lock.yaml untracked leftover still exists in root. |
| REN-05 | 01-01-PLAN.md | Manifest file renamed to .gomad-manifest.yaml (constant in code) | SATISFIED | MANIFEST_PATH constant `'.gomad-manifest.yaml'` confirmed in global-installer.js |
| REN-06 | 01-01-PLAN.md | All string literals, comments, logs, help text reference "gomad" instead of "mobmad" | BLOCKED | CLAUDE.md has 16 stale "mobmad" occurrences including inaccurate developer instructions |
| TST-01 | 01-02-PLAN.md | All existing tests updated to reference gomad instead of mobmad | SATISFIED | 35/35 tests pass. Zero "mobmad" in test files. Agent filter rewritten from `a.startsWith('bmad-')` to `startsWith('analysis/')` etc. |

### Anti-Patterns Found

| File | Pattern | Severity | Impact |
|------|---------|----------|--------|
| `CLAUDE.md` | 16 occurrences of "mobmad" including stale instructions: `bin/mobmad-cli.js`, `npm install -g mobmad`, `mobmad mcp enable`, `~/.claude/.mobmad-manifest.yaml`, `bin.mobmad` | Warning | CLAUDE.md is loaded as project context for every Claude Code session — stale entries actively mislead AI assistants working in this codebase and would cause incorrect suggestions about command syntax, file paths, and binary names. |
| `mobmad.lock.yaml` | Untracked file with old name in project root | Info | Non-blocking (untracked by git), but confusing and plan said to delete it. |
| `test/test-module.js:20` | `assert.equal(mod.code, 'mob')` — test validates old mob module code | Info | Test currently passes because module.yaml still has `code: mob`. This is Phase 3 deferred work, not a Phase 1 gap. |

### Human Verification Required

None — all verification was completed programmatically.

### Gaps Summary

Two gaps block full goal achievement for Phase 1:

**Gap 1 (Active — REN-06 blocker): CLAUDE.md has 16 stale mobmad references.**

CLAUDE.md is not in any exclusion directory (.planning/, BMAD/, node_modules/) and contains actively inaccurate developer documentation. The plan's must-have truth 3 requires zero occurrences of "mobmad" across all non-excluded files. The SUMMARY documented this as intentionally skipped ("project history context"), but the content is not history — it includes live instructions like `npm install -g mobmad`, `mobmad mcp enable`, and paths like `bin/mobmad-cli.js` that are now wrong. Because CLAUDE.md is injected into every Claude Code session as project context, stale entries will cause the AI to make incorrect suggestions about binary names, command syntax, and file paths.

**Gap 2 (Minor — cleanup): mobmad.lock.yaml untracked file in project root.**

Plan task D-03 explicitly required deletion. The file is untracked (not committed to git) but persists in the working directory. It does not affect functionality but the plan's verification step 4 (`find . -name "*mobmad*"`) would catch it.

**Deferred (Phase 3 scope): mob module code and BMAD integration strings.**

The `mob` module identifier in module.yaml, skill-manifest.yaml, module-help.csv, and package-skills.js is the BMAD module code (separate from the mobmad brand name). These 80+ occurrences use `mob` not `mobmad` and are addressed by Phase 3 requirements BMA-02, BMA-03, and BMA-04. Similarly, `install_to_bmad` field names in 14 skill manifests are BMAD integration metadata cleaned up in Phase 3.

---

_Verified: 2026-04-07T08:15:00Z_
_Verifier: Claude (gsd-verifier)_
