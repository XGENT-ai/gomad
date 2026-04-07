---
phase: 03-bmad-decoupling
plan: 04
subsystem: test-suite-decoupling
tags: [decoupling, bmad, tests, guardrail, bma-01, bma-02, bma-03, bma-05]
requires:
  - "Plan 03-03 destructive decoupling (src/module/, package-skills.js, peerDependencies removed)"
provides:
  - "Test suite that no longer asserts BMAD coupling"
  - "Permanent guardrail tests preventing BMAD coupling regressions"
affects:
  - test/test-module.js
  - test/test-installation.js
  - test/test-decoupling.js
tech_stack:
  added: []
  patterns:
    - "Source-dir-scoped filesystem walker with explicit exclusion list"
key_files:
  created:
    - test/test-decoupling.js
  modified:
    - test/test-installation.js
  deleted:
    - test/test-module.js
decisions:
  - "Deleted test/test-module.js entirely rather than gut its contents — every assertion was BMAD-specific (module.yaml, module-help.csv, peerDependencies, src/module/agents/*, package-skills.js)"
  - "Used `^\\s*package\\b` regex anchored to line start for the negative help assertion so the substring 'package' inside descriptions cannot trigger false positives"
  - "Decoupling walker scope is an allowlist (bin, tools, src, test, assets, catalog) — additive by design so future top-level dirs must be reviewed before being grep-scanned"
  - "Walker uses basename(f) === 'test-decoupling.js' for self-skip rather than substring match to avoid skipping unrelated files"
  - "Added devDependencies['bmad-method'] check alongside dependencies/peerDependencies for completeness"
metrics:
  duration_minutes: 4
  tasks_completed: 2
  files_changed: 3
  completed_at: 2026-04-07
requirements: [BMA-01, BMA-02, BMA-03, BMA-05]
---

# Phase 3 Plan 4: Test Suite BMAD Decoupling Summary

Cleared the last BMAD-coupled test code and locked in a permanent guardrail: deleted `test/test-module.js`, surgically edited `test/test-installation.js`, and added `test/test-decoupling.js` with four D-13 assertions. `npm test` now exits 0 with 27/27 tests passing, including all four new decoupling assertions.

## What Was Done

### Task 1 — purge BMAD assertions from installation suite (commit `1c8dbe9`)

**Deleted `test/test-module.js`** (100 lines, all BMAD-coupled):
- `module.yaml exists / has required fields / skill_preset options` — file gone in Plan 03
- `module-help.csv exists / header / GOMAD rows / 20+ entries / unique menu codes` — file gone
- `pkg.peerDependencies['bmad-method']` — `peerDependencies` removed in Plan 03
- `tools/package-skills.js exists` — deleted in Plan 03
- `src/module/agents/{analysis,planning,research,review}` — deleted in Plan 03

Surgical edit alone would have left an empty husk; full deletion was cleaner.

**Edited `test/test-installation.js`:**
- Removed the entire `describe('Integration: curate + package flow')` block (47 lines, two `it` blocks). Both depended on `tools/package-skills.js` and `src/module/skills/` — both deleted in Plan 03.
- Updated `--help shows all commands`:
  - Removed positive `assert.ok(output.includes('package'))`
  - Added negative `assert.ok(!/^\s*package\b/m.test(output), 'help should not list package command (BMAD decoupling)')` — anchored to line start so the substring "package" in description text cannot create false positives.
- Trimmed unused imports after the cut: removed `existsSync`, `rmSync`, `readdirSync` from `fs`, and removed `parseYaml` from `yaml` entirely. Kept `readFileSync` (used by Project-local installation block) and `execSync` (used by `run`).
- `Project-local installation` describe block left unchanged.
- `node --check` passes.

### Task 2 — add decoupling guardrail tests (commit `6fc73df`)

Created `test/test-decoupling.js` with four D-13 assertions inside `describe('BMAD decoupling')`:

1. **`package.json has no peerDependencies and no bmad-method dependency`** — asserts `pkg.peerDependencies === undefined` (not `{}`), and that neither `dependencies['bmad-method']` nor `devDependencies['bmad-method']` is set.
2. **`src/module/ does not exist`** — direct `existsSync` check.
3. **`no agent file in assets/agents/ contains BMAD frontmatter fields`** — for every `*.md`, asserts no `^module:`, no `^canonicalId:`, no `^name:\s+(bmm|mob)-` line.
4. **`no source file imports or references bmad-method`** — walks `bin/, tools/, src/, test/, assets/, catalog/`, greps every `.js|.mjs|.cjs|.json|.yaml|.yml|.md` for the literal `bmad-method`. Self-skips `test-decoupling.js` via `basename` match.

**Critical scoping** — the walker is an allowlist of source dirs. The following are explicitly excluded to prevent permanent false positives:
- `BMAD/` — vendored reference repo with hundreds of legitimate matches
- `node_modules/` — transitive package matches
- `.planning/` — documents the decoupling itself (this very summary mentions `bmad-method`)
- `package-lock.json` — kept clean by Plan 03 but never scanned

## Verification

| Check | Result |
|---|---|
| `test -f test/test-module.js` | absent |
| `test -f test/test-decoupling.js` | present |
| `node --check test/test-installation.js` | exits 0 |
| `node --check test/test-decoupling.js` | exits 0 |
| `grep "package-skills\|src/module/skills\|packageSkills\|output.includes('package')" test/test-installation.js` | no matches |
| `grep "package command" test/test-installation.js` | new negative assertion present |
| `npm test` | **27 pass / 0 fail / 27 total** |
| `BMAD decoupling` describe block in output | all 4 it() blocks pass |

### Test counts (npm test)

```
ℹ tests 27
ℹ suites 5
ℹ pass 27
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
```

## Deviations from Plan

**1. [Rule 2 - Defense in depth] Added `devDependencies['bmad-method']` check**
- **Found during:** Task 2
- **Issue:** Plan template only checked `peerDependencies` and `dependencies`. A future commit could move `bmad-method` to `devDependencies` and slip past the guardrail.
- **Fix:** Added `assert.equal(pkg.devDependencies?.['bmad-method'], undefined)` to the package.json test.
- **Files modified:** `test/test-decoupling.js`
- **Commit:** `6fc73df`

**2. [Rule 1 - Robustness] Self-skip uses `basename` not substring match**
- **Found during:** Task 2 implementation
- **Issue:** Plan template used `f.endsWith('test-decoupling.js')`. That works but is fragile if a file named `my-test-decoupling.js` ever exists. `basename(f) === 'test-decoupling.js'` is exact.
- **Fix:** Imported `basename` from `path` and used exact equality.
- **Commit:** `6fc73df`

No architectural changes, no auth gates, no blockers.

## Commits

- `1c8dbe9` — test(03-04): remove BMAD-coupled tests from installation suite
- `6fc73df` — test(03-04): add BMAD decoupling guardrail tests

## Self-Check: PASSED

- `test/test-module.js` does not exist — verified.
- `test/test-decoupling.js` exists — verified via Write tool result.
- `test/test-installation.js` parses (`node --check` exit 0) — verified.
- `test/test-decoupling.js` parses — verified.
- Both commits exist in `git log` (`1c8dbe9`, `6fc73df`) — verified.
- `npm test` reports 27 pass / 0 fail — verified end-to-end.
- `BMAD decoupling` describe block runs all 4 assertions and they pass — verified in output.
- Walker scope excludes BMAD/, node_modules/, .planning/, package-lock.json — verified by code inspection (allowlist).
