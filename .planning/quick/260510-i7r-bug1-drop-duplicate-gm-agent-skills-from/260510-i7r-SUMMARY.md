---
phase: quick
plan: 260510-i7r
subsystem: installer
tags: [bug-fix, claude-code, v1.3.1, install-cleanup, regression]
dependency_graph:
  requires:
    - tools/installer/ide/_config-driven.js (installVerbatimSkills loop)
    - tools/installer/ide/shared/agent-command-generator.js (AGENT_SOURCES + removeLegacyAgentSkillDirs)
    - tools/installer/core/cleanup-planner.js (isV12LegacyAgentsDir + buildCleanupPlan v12 branch)
  provides:
    - bug1: Skip-agent-skills branch on Claude Code (launcher_target_dir guard)
    - bug1: Colon-form sweep in removeLegacyAgentSkillDirs
    - bug2: Detector signal on _gomad/gomad/config.yaml
    - bug2: v12-branch snapshot+remove of orphan config.yaml + parent dir
  affects:
    - Re-install over v1.3.0/1.3.1 Claude Code workspaces (cleans up gm:agent-* leftovers)
    - Upgrade from v1.2-or-earlier installs (clears _gomad/gomad/ orphan)
tech-stack:
  added: []
  patterns:
    - "canonicalId.startsWith('gm:agent-') as in-memory persona discriminator"
    - "v12 detector OR signal: config.yaml exists ⇒ orphan present"
    - "Children-before-parent ordering in plan.to_remove for fs.remove sequential consumption"
key-files:
  created:
    - test/test-config-driven-agent-skill-skip.js (bug1 unit test)
  modified:
    - tools/installer/ide/_config-driven.js (skip-guard inside installVerbatimSkills loop)
    - tools/installer/ide/shared/agent-command-generator.js (removeLegacyAgentSkillDirs sweeps both forms)
    - tools/installer/core/cleanup-planner.js (isV12LegacyAgentsDir widened + v12 branch extended)
    - test/test-cleanup-planner.js (4 bug2 cases + LEGACY_AGENT_SHORT_NAMES 7→8 fix)
    - test/fixtures/orphan-refs/allowlist.json (new test allowlisted for filesystem-path refs)
    - tools/installer/assets/CLAUDE.md.template (restore intro line — pre-existing test/template mismatch, blocking commit hook)
    - package.json (test:bug1-agent-skill-skip wired into test chain)
decisions: []
metrics:
  started: "2026-05-10T05:13:28Z"
  completed: "2026-05-10T05:25:25Z"
  duration_seconds: 717
  duration_human: "~12 minutes"
  tasks_completed: 2
  files_changed: 7
  commits: 5
---

# Quick 260510-i7r: Drop duplicate gm:agent-* skills + clear v1.2 _gomad/gomad/ orphan — Summary

Two surgical install-time bug fixes for `@xgent-ai/gomad` v1.3.1: (bug1) Claude Code installs no longer create duplicate `.claude/skills/gm:agent-*` directories that shadow the launcher commands; (bug2) upgrades from v1.2-or-earlier now snapshot+remove the orphan `_gomad/gomad/config.yaml` + its empty parent dir.

## Tasks Completed

| Task | Name                                                                    | Commits                | Files                                                                                                                                                          |
| ---- | ----------------------------------------------------------------------- | ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | bug1 — skip agent skills + sweep colon-form leftovers on Claude Code    | `d5720a6` + `a2c70ca`  | `_config-driven.js`, `agent-command-generator.js`, `test-config-driven-agent-skill-skip.js` (new), `package.json`, `allowlist.json`                            |
| 2    | bug2 — snapshot+remove orphan `_gomad/gomad/` on v1.2 upgrade           | `0d4fbaa` + `9fa0602`  | `cleanup-planner.js`, `test-cleanup-planner.js`                                                                                                                 |

Plus 1 auto-fix commit (`ad4a378`) — see Deviations below.

## What Changed

### bug1 fix (`a2c70ca`)

- **`tools/installer/ide/_config-driven.js`** — `installVerbatimSkills` now skips records whose `canonicalId` starts with `gm:agent-` when `config.launcher_target_dir` is set. Single 3-line guard inserted before `relativePath` derivation. Codex/Junie/etc. (no launcher target) keep installing personas as skills under `.agents/skills/` (D-29 contract preserved).
- **`tools/installer/ide/shared/agent-command-generator.js`** — `removeLegacyAgentSkillDirs` now sweeps BOTH historical forms per shortName: `gm-agent-<sn>` (v1.1 — D-29) AND `gm:agent-<sn>` (v1.3.0/1.3.1 regression). Inner-loop variant array; same call sites.
- **`package.json`** — wired `test:bug1-agent-skill-skip` into the `test` chain after `test:install`.

### bug2 fix (`9fa0602`)

- **`tools/installer/core/cleanup-planner.js`** — `isV12LegacyAgentsDir` widened: returns true when manifest exists AND (legacy `_gomad/gomad/config.yaml` exists OR ≥1 persona file at `_gomad/gomad/agents/`). `buildCleanupPlan` v12 branch extended after the persona loop to (a) snapshot+remove `config.yaml` (D-34 backup invariant preserved; containment check via realpath, SYMLINK_ESCAPE refusal mirrors persona path) and (b) push the now-empty `_gomad/gomad/` parent to `to_remove` only when at least one child was successfully cleared (a user-created `_gomad/gomad/` with unrelated files is left alone).

### Tests added

- **`test/test-config-driven-agent-skill-skip.js`** (new, 13 cases) — exercises the install-time skip-guard (T1: launcher target set ⇒ skip), no-regression for non-launcher platforms (T2: Codex still installs personas as skills), and the colon-form sweep (T3: both `gm-agent-*` and `gm:agent-*` forms removed; unrelated dirs untouched).
- **`test/test-cleanup-planner.js`** (4 new cases + 4 fixed) — bug2 detector + plan tests for config.yaml-only, combined (8 personas + config.yaml), clean (no orphan), and symlink-escape containment. Plus pre-existing `LEGACY_AGENT_SHORT_NAMES` count assertions updated 7→8 (`solo-dev` was added in quick task 260424-g68 but the test was never updated).

## Test Results

| Suite                                                                  | Result   |
| ---------------------------------------------------------------------- | -------- |
| `node test/test-config-driven-agent-skill-skip.js` (new — bug1)        | 13/13    |
| `node test/test-cleanup-planner.js` (extended — bug2)                  | 92/92    |
| `npm run test:v13-agent-relocation` (regression — fresh Claude Code)   | 28/28    |
| `npm run test:legacy-v12-upgrade` (regression — v1.2→v1.3 E2E upgrade) | 32/32    |
| `npm run test:legacy-gomad-id` (regression — gomad → agile rewrite)    | 9/9      |
| `npm test` (full local CI gate: refs, orphan-refs, install, statusline, claude-md, codex-syntax, legacy-gomad-id, lint, lint:md, format:check) | exit 0 |

## Manual Smoke

### bug1 — fresh Claude Code install (`/tmp/gomad-bug1-smoke`)

```text
ls .claude/skills/ | grep -E '^gm[:-]agent-'   →  0 matches  PASS
ls .claude/commands/gm/agent-*.md | wc -l      →  8          PASS
```

11 non-agent skills installed (`gm-distillator`, `gm-help`, `gm-brainstorming`, `gm-advanced-elicitation`, `gm-editorial-review-{prose,structure}`, `gm-index-docs`, `gm-party-mode`, `gm-review-{adversarial-general,edge-case-hunter}`). 8 launchers at `.claude/commands/gm/agent-{analyst,architect,dev,pm,sm,solo-dev,tech-writer,ux-designer}.md`.

### bug2 — v1.2-orphan upgrade (`/tmp/gomad-bug2-smoke`, copy of repro from `xgent-ai-file-storage/_gomad`)

```text
Pre-install:  _gomad/gomad/{agents/,config.yaml}  exists
Post-install: _gomad/gomad/                       gone (No such file or directory)  PASS

Backup metadata.json (timestamp 20260510-132429):
  files: [{ install_root: "_gomad", relative_path: "gomad/config.yaml",
            orig_hash: null, was_modified: null }]
  reason: "manifest_cleanup"
  recovery_hint: "Restore with: cp -R $(pwd)/_gomad/_backups/20260510-132429/* ./"
```

Schema-compatible row (matches existing entries' shape; `orig_hash`/`was_modified=null` reflects the absence of a pre-v1.3 hash for `gomad → agile`-rewritten manifest entries).

### Idempotency

Re-running install over the now-clean v1.3 layout produced ZERO new backup dirs — backup count stayed at 1 (the snapshot from the upgrade), proving the v12 detector correctly returns false when no orphan remains.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Bug] Updated pre-existing 7→8 LEGACY_AGENT_SHORT_NAMES assertions**

- **Found during:** Task 2 RED (running `node test/test-cleanup-planner.js` before adding bug2 cases)
- **Issue:** 4 pre-existing assertions in `test-cleanup-planner.js` hardcoded `length === 7` + `expected = [...7 names]` + legacy plan `to_snapshot.length === 7` + `to_remove.length === 7`. Production added `solo-dev` (8th persona) in quick task 260424-g68 (commit `8c754b1`) but these tests were never updated.
- **Fix:** Updated to 8 / `[...8 names]`. The plan-level `<verify>` requires `node test/test-cleanup-planner.js` to exit 0; without this fix the suite would have stayed RED on existing tests after my GREEN.
- **Files modified:** `test/test-cleanup-planner.js`
- **Commit:** `0d4fbaa` (bundled with bug2 RED)

**2. [Rule 3 — Blocking issue] Added orphan-refs allowlist entry for new test**

- **Found during:** Task 1 RED commit (husky `npm test` chain)
- **Issue:** The project-wide `test:orphan-refs` regression gate (`test/test-orphan-refs.js`) treats every `gm-agent-*` literal in the repo as an orphan unless allowlisted. My new `test/test-config-driven-agent-skill-skip.js` legitimately needs to seed `gm-agent-dev/` and assert against it.
- **Fix:** Added a single allowlist entry to `test/fixtures/orphan-refs/allowlist.json` with the standard `lineContainsPattern: "gm-agent-"` form + reason explaining REF-02 filesystem-path semantics.
- **Files modified:** `test/fixtures/orphan-refs/allowlist.json`
- **Commit:** `a2c70ca` (bundled with bug1 GREEN)

**3. [Rule 1 — Bug] Restored CLAUDE.md.template title + intro line**

- **Found during:** Task 2 GREEN commit (husky `npm test` chain blocked the commit)
- **Issue:** `test/test-claude-md-install.js:104` asserts the installed CLAUDE.md body contains `'Behavioral guidelines to reduce common LLM coding mistakes'`. The source template at `tools/installer/assets/CLAUDE.md.template` was missing that intro line and the `# CLAUDE.md` title — pre-existing template/test mismatch unrelated to bug1/bug2 but blocking the pre-commit hook chain. Plan constraint forbids `--no-verify`.
- **Fix:** Added 3 lines (title + intro paragraph) at the top of the gomad-fenced block. Surgical: nothing else touched. Commit was kept atomic and separate from Task 2 GREEN so the Task 2 commit message stays focused on the bug2 fix.
- **Files modified:** `tools/installer/assets/CLAUDE.md.template`
- **Commit:** `ad4a378` (between bug2 RED and bug2 GREEN)

## Deferred Issues

None. The Task 2 GREEN commit blocker (`test:claude-md` "B. new gomad block (template) inserted") was auto-fixed inline as Rule 1 / Rule 3 (it was a 1-line template restoration, not a structural change).

## Commits

```text
d5720a6 test(quick-260510-i7r): add failing test for bug1 agent-skill skip + colon sweep
a2c70ca fix(quick-260510-i7r): drop duplicate gm:agent-* skills on Claude Code (bug1)
0d4fbaa test(quick-260510-i7r): add failing tests for bug2 v1.2 config.yaml orphan
ad4a378 fix(quick-260510-i7r): restore CLAUDE.md.template title + intro line
9fa0602 fix(quick-260510-i7r): snapshot+remove orphan _gomad/gomad/ on v1.2 upgrade (bug2)
```

5 commits — RED + GREEN per task (TDD), plus 1 auto-fix landing between bug2 RED and bug2 GREEN to clear a pre-existing test/template mismatch that was gating the husky pre-commit chain.

## Self-Check: PASSED

Verified all claims before producing this summary.

- File `tools/installer/ide/_config-driven.js`: FOUND (modified)
- File `tools/installer/ide/shared/agent-command-generator.js`: FOUND (modified)
- File `tools/installer/core/cleanup-planner.js`: FOUND (modified)
- File `test/test-config-driven-agent-skill-skip.js`: FOUND (created)
- File `test/test-cleanup-planner.js`: FOUND (modified)
- File `test/fixtures/orphan-refs/allowlist.json`: FOUND (modified)
- File `tools/installer/assets/CLAUDE.md.template`: FOUND (modified)
- File `package.json`: FOUND (modified — `test:bug1-agent-skill-skip` script added; wired into `test`)
- Commit `d5720a6`: FOUND in `git log`
- Commit `a2c70ca`: FOUND in `git log`
- Commit `0d4fbaa`: FOUND in `git log`
- Commit `ad4a378`: FOUND in `git log`
- Commit `9fa0602`: FOUND in `git log`
