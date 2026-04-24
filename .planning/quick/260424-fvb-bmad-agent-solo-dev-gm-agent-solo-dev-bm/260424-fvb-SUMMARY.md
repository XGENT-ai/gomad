---
phase: 260424-fvb
plan: 01
subsystem: gomad-skills/4-implementation
tags:
  - rename
  - skill-rewrite
  - bmad-to-gm
  - persona-preservation
requirements:
  - QUICK-260424-fvb
dependency_graph:
  requires: []
  provides:
    - gm-agent-solo-dev (Barry persona, Quick Flow Solo Dev agent skill)
  affects:
    - sibling naming conventions (now matches gm-agent-dev)
tech_stack:
  added: []
  patterns:
    - "gm-agent-* family naming (unprefixed manifest filename, module: gomad)"
key_files:
  created:
    - src/gomad-skills/4-implementation/gm-agent-solo-dev/SKILL.md
    - src/gomad-skills/4-implementation/gm-agent-solo-dev/skill-manifest.yaml
  modified:
    - test/fixtures/orphan-refs/allowlist.json
    - tools/fixtures/tarball-grep-allowlist.json
  deleted:
    - src/gomad-skills/4-implementation/bmad-agent-solo-dev/SKILL.md
    - src/gomad-skills/4-implementation/bmad-agent-solo-dev/bmad-skill-manifest.yaml
    - src/gomad-skills/4-implementation/bmad-agent-solo-dev/ (directory)
decisions:
  - "Manifest filename dropped bmad- prefix to match sibling gm-agent-dev/skill-manifest.yaml convention"
  - "Allowlist updates were mandatory (Rule 2): orphan-refs regression gate fails without gm-agent-solo-dev entries"
  - "Directory removal used plain rm -rf since bmad-agent-solo-dev was never tracked in git"
metrics:
  duration: "~3 minutes"
  completed: 2026-04-24T03:31:24Z
  tasks_completed: 2
  files_created: 2
  files_modified: 2
  files_deleted: 3
---

# Phase 260424-fvb Plan 01: Rename bmad-agent-solo-dev to gm-agent-solo-dev Summary

Renamed the untracked `bmad-agent-solo-dev` skill to `gm-agent-solo-dev` and swapped every `bmad-*` identifier inside the skill to the corresponding `gm-*` identifier so it matches the sibling `gm-agent-dev` skill's naming and module conventions.

## What Was Built

The Barry persona skill has been realigned with the `gm-agent-*` family:

- New directory `src/gomad-skills/4-implementation/gm-agent-solo-dev/` contains exactly two files (matching sibling `gm-agent-dev/`): `SKILL.md` and `skill-manifest.yaml` (unprefixed filename).
- All persona content preserved verbatim: display name "Barry", role "Elite Full-Stack Developer + Quick Flow Specialist", Overview/Identity/Communication Style/Principles prose, capability codes `QD` and `CR` with their descriptions.
- Identifier swaps applied per the plan's swap table:

| From (bmad-*)                 | To (gm-*)                     |
|-------------------------------|-------------------------------|
| bmad-agent-solo-dev           | gm-agent-solo-dev             |
| bmad-quick-dev                | gm-quick-dev                  |
| bmad-code-review              | gm-code-review                |
| bmad-help                     | gm-help                       |
| _bmad/bmm/config.yaml         | _gomad/agile/config.yaml      |
| module: bmm                   | module: gomad                 |
| bmad-skill-manifest.yaml      | skill-manifest.yaml (file renamed) |

Old `bmad-agent-solo-dev/` directory removed entirely.

## Tasks Completed

| Task | Name                                                              | Commit   | Files                                                      |
| ---- | ----------------------------------------------------------------- | -------- | ---------------------------------------------------------- |
| 1    | Create gm-agent-solo-dev directory with rewritten manifest        | 3f62d9d  | gm-agent-solo-dev/skill-manifest.yaml (created)            |
| 2    | Write gm-agent-solo-dev SKILL.md and remove old bmad-agent-solo-dev | 12251e8  | gm-agent-solo-dev/SKILL.md (created), bmad-agent-solo-dev/ (deleted), allowlist.json and tarball-grep-allowlist.json (updated) |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical functionality] Added gm-agent-solo-dev entries to orphan-refs and tarball-grep allowlists**

- **Found during:** Task 1 commit (pre-commit hook ran `npm run test:orphan-refs`)
- **Issue:** The orphan-refs regression gate (`test/test-orphan-refs.js`) scans the repo for any `gm-agent-` token and fails unless each occurrence is in `test/fixtures/orphan-refs/allowlist.json`. The new `gm-agent-solo-dev` identifier in `SKILL.md` and `skill-manifest.yaml` would trigger the gate. The shipped-tarball guard (`tools/fixtures/tarball-grep-allowlist.json`) has the same requirement for release verification.
- **Fix:** Added four allowlist entries total — two in each file — for `gm-agent-solo-dev/SKILL.md` (pattern `name: gm-agent-solo-dev`) and `gm-agent-solo-dev/skill-manifest.yaml` (pattern `name: gm-agent-solo-dev`). Entries mirror the existing sibling `gm-agent-dev` entries verbatim in both files.
- **Rationale:** Without these entries the regression gate would block every future commit that touches the repo, and `verify-tarball.js` would reject the next release. This is a correctness requirement (Rule 2), not a feature addition — the skill cannot live alongside its siblings without its identifier being recognized by the gate.
- **Files modified:** `test/fixtures/orphan-refs/allowlist.json`, `tools/fixtures/tarball-grep-allowlist.json`
- **Commit:** 12251e8 (bundled with Task 2)

## Verification Results

All plan-level checks passed:

1. **New location populated:** `ls src/gomad-skills/4-implementation/gm-agent-solo-dev/` → `SKILL.md  skill-manifest.yaml`
2. **Old location gone:** `test ! -d src/gomad-skills/4-implementation/bmad-agent-solo-dev` → exit 0 (OK)
3. **No residual bmad references:** `grep -rq "bmad" src/gomad-skills/4-implementation/gm-agent-solo-dev/` → exit 1 (no matches, OK)
4. **Persona preserved:** `grep -c "Barry" SKILL.md` = 4, `grep -c "Barry" skill-manifest.yaml` = 2 (both > 0)
5. **Sibling-convention parity:** `diff <(ls gm-agent-solo-dev/) <(ls gm-agent-dev/)` → no output (same filenames)
6. **Module field correct:** `grep "^module:" skill-manifest.yaml` → `module: gomad`
7. **Orphan-refs gate:** `npm run test:orphan-refs` → 2/2 passed (185 total hits, 0 unallowlisted)
8. **Full test suite (pre-commit):** `npm test` (test:refs, test:orphan-refs, test:install, lint, lint:md, format:check) all green after Task 2 commit

## Known Stubs

None. All files are fully wired: `SKILL.md` references real sibling skills (`gm-quick-dev`, `gm-code-review`, `gm-help`) that exist in the tree, and the config path (`{project-root}/_gomad/agile/config.yaml`) resolves at runtime just like the sibling `gm-agent-dev` skill.

## Self-Check

**Files created:**

- `src/gomad-skills/4-implementation/gm-agent-solo-dev/SKILL.md` — FOUND
- `src/gomad-skills/4-implementation/gm-agent-solo-dev/skill-manifest.yaml` — FOUND

**Files modified:**

- `test/fixtures/orphan-refs/allowlist.json` — FOUND (contains `gm-agent-solo-dev` entries)
- `tools/fixtures/tarball-grep-allowlist.json` — FOUND (contains `gm-agent-solo-dev` entries)

**Files deleted:**

- `src/gomad-skills/4-implementation/bmad-agent-solo-dev/` — MISSING (as intended)

**Commits:**

- 3f62d9d — FOUND in git log
- 12251e8 — FOUND in git log

## Self-Check: PASSED
