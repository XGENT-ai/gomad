---
phase: 03-bmad-decoupling
plan: 03
subsystem: bmad-decoupling-destructive
tags: [decoupling, bmad, deletion, package-json, cli, src-module]
requires:
  - "Plan 03-01 D-07 audit (SAFE TO DELETE verdict)"
  - "Plan 03-02 agent migration to assets/agents/"
provides:
  - "package.json without peerDependencies and with correct files array"
  - "CLI without the package command"
  - "Repo with no src/module/ tree"
  - "Lockfile and node_modules purged of bmad-method"
affects:
  - package.json
  - package-lock.json
  - bin/gomad-cli.js
  - tools/package-skills.js
  - src/module/
tech_stack:
  added: []
  patterns: []
key_files:
  created: []
  modified:
    - package.json
    - bin/gomad-cli.js
    - package-lock.json
  deleted:
    - tools/package-skills.js
    - src/module/module.yaml
    - src/module/module-help.csv
    - src/module/agents/skill-manifest.yaml
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
    - src/module/skills/ (14 packaged skill directories)
decisions:
  - "Removed src/ entry from package.json files array since src/ became empty after src/module/ deletion"
  - "Removed stray src/.DS_Store macOS artifact so src/ could be rmdir'd cleanly"
  - "Test failures in test/test-module.js and test/test-installation.js left intact — Plan 04 is the authorized cleanup scope"
metrics:
  duration_minutes: 6
  tasks_completed: 5
  files_changed: 50
  completed_at: 2026-04-07
requirements: [BMA-01, BMA-02, BMA-03, BMA-05]
---

# Phase 3 Plan 3: BMAD Destructive Decoupling Summary

Removed all BMAD-METHOD coupling from the runtime surface in a single surgical pass: dropped `peerDependencies`, fixed the Phase 2 `files` array carryover, deleted `tools/package-skills.js`, removed the `package` CLI command, deleted the entire `src/module/` tree, and regenerated `package-lock.json` to purge `bmad-method` from dependency closure.

## What Was Done

### Task 1 — package.json edits (commit `82da063`)

- Deleted the `peerDependencies` block entirely (not set to `{}`) so `JSON.parse(...).peerDependencies === undefined`.
- Replaced `"global/"` with `"assets/"` in the `files` array (Phase 2 carryover bug fix).
- Removed `"src/"` from the `files` array as well — `src/` becomes empty after Task 4 and is fully removed.
- Validated with a `JSON.parse` round-trip + assertion script.

### Task 2 — delete `package` command from bin/gomad-cli.js (commit `7a2991f`)

- Removed the entire 7-line `program.command('package')...` block and its leading blank line.
- `node bin/gomad-cli.js --help` now lists only `install`, `curate`, `status`, `uninstall`, `mcp`.
- `grep -n "package-skills\|packageSkills\|command('package')" bin/gomad-cli.js` returns no matches.

### Task 3 — delete tools/package-skills.js (commit `f5e0991`)

- Removed the BMAD skill manifest generator (176 lines).
- Verified no references remain under `bin/`, `tools/`, `src/`, `assets/`, `catalog/`.
- Test files under `test/` still reference it — Plan 04 handles those cleanups.

### Task 4 — delete src/module/ tree (commit `173f72f`)

- Gate check: re-read `.planning/phases/03-bmad-decoupling/03-01-AUDIT.md` — verdict is `SAFE TO DELETE`.
- Sanity check: all 16 migrated agents confirmed present in `assets/agents/` before deleting their source.
- `rm -rf src/module` removed:
  - `src/module/module.yaml`
  - `src/module/module-help.csv`
  - `src/module/agents/skill-manifest.yaml`
  - 16 agent `.md` files across `analysis/`, `planning/`, `research/`, `review/` subdirs
  - 14 packaged skill directories under `src/module/skills/`
- After deletion, `src/` contained only `.DS_Store`; removed that artifact and `rmdir src` cleanly.
- 48 files + 1 directory deleted (6,744 lines removed).

### Task 5 — regenerate lockfile (commit `77f4941`)

- Ran `npm install` — 96 packages removed from the tree.
- Lockfile: `grep -c '"bmad-method"' package-lock.json` = `0` (was `2`).
- `node_modules/bmad-method/` no longer exists.
- `package-lock.json` shrank by 1,348 lines.

## Verification

| Check | Result |
|---|---|
| `node -e "console.log(JSON.parse(require('fs').readFileSync('package.json','utf8')).peerDependencies===undefined)"` | `true` |
| `grep -n "bmad-method" package.json` | no matches |
| `test -f tools/package-skills.js` | absent |
| `test -e src/module` | absent |
| `test -e src/` | absent (fully removed) |
| `grep -rn "bmad-method" bin/ tools/ assets/ catalog/ package.json` | no matches |
| `grep -c '"bmad-method"' package-lock.json` | `0` |
| `test -d node_modules/bmad-method` | absent |
| `node bin/gomad-cli.js --help` | exits 0, lists install/curate/status/uninstall/mcp only |
| `grep -rn "src/module" bin/ tools/ assets/ catalog/ package.json` | no matches |
| All 16 migrated agents exist in `assets/agents/` | intact |

### Test suite status (expected, documented)

`npm test` reports failures in `test/test-module.js` and `test/test-installation.js` — specifically:
- `test/test-module.js:85` — `all tool files exist` asserts `tools/package-skills.js` exists
- `test/test-module.js:92` — `project agents are packaged` asserts `src/module/agents/analysis` exists

Both failures are **expected**: the plan's orchestrator success criteria state "Test suite still runs (some tests will fail until Plan 04 fixes them — that's expected)". Plan 04 is the authorized scope to delete/rewrite these tests. No fixes attempted in this plan.

## Deviations from Plan

### Auto-fixed / scope adjustments

**1. [Rule 2 - Missing] Removed `"src/"` from package.json files array**
- **Found during:** Task 1 while evaluating the files-array edits.
- **Issue:** Plan said "evaluate whether src/ should remain" and authorized removing it if `src/` became empty after Task 4. Since src/module/ was the only content and Task 4 fully deletes it (plus the stray `.DS_Store`), keeping `src/` in the files array would publish either nothing or only a hidden artifact.
- **Fix:** Dropped `"src/"` from the files array in Task 1's commit.
- **Files modified:** `package.json`
- **Commit:** `82da063`

**2. [Rule 3 - Blocker] Removed `src/.DS_Store`**
- **Found during:** Task 4, after `rm -rf src/module` — `rmdir src` failed with "Directory not empty" because of a stray macOS `.DS_Store` file.
- **Issue:** Plan authorized removing `src/` if it became empty; macOS left a 6KB metadata file blocking the removal.
- **Fix:** `rm src/.DS_Store && rmdir src`. This was never tracked by git (not in the diff).
- **Files modified:** none tracked
- **Commit:** bundled with `173f72f`

### Soft deviation (pre-flagged, not a blocker)

**CLAUDE.md doc references to src/module/skills/** — The D-07 audit flagged `CLAUDE.md:188` and `CLAUDE.md:224` as documentation-only references that survive Plan 03. These lines now describe a vanished directory. Not touched in this plan; follow-up doc-sync recommended (can be handled in any subsequent plan or Phase 3 wrap-up).

### Expected test failures — not fixed

Two tests in `test/test-module.js` fail because they assert the existence of deleted files. The plan explicitly scopes these cleanups to Plan 04. No fix attempted.

## Commits

- `82da063` — refactor(03-03): drop peerDependencies and fix files array in package.json
- `7a2991f` — refactor(03-03): remove package command from gomad CLI
- `f5e0991` — refactor(03-03): delete tools/package-skills.js
- `173f72f` — refactor(03-03): delete src/module/ BMAD module tree
- `77f4941` — chore(03-03): regenerate package-lock.json after BMAD decoupling

## Self-Check: PASSED

- `package.json` has no `peerDependencies` and no `bmad-method` — verified via Grep.
- `bin/gomad-cli.js` has no `package-skills` / `packageSkills` / `command('package')` — verified via Grep.
- `tools/package-skills.js` does not exist — verified via `Bash(test -f ...)`.
- `src/module/` and `src/` do not exist — verified via Bash.
- `node_modules/bmad-method/` does not exist — verified post-install.
- `package-lock.json` has zero `"bmad-method"` occurrences — verified via grep count.
- All 5 commits exist in `git log --oneline -6` (verified above).
- All 16 agents in `assets/agents/` still present — sanity check passed before deletion.
