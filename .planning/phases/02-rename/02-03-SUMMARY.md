---
phase: 02-rename
plan: 03
subsystem: rename
tags: [rename, fixture, phase-gate, validation, closeout]
requires:
  - "Phase 2-01 filesystem rename (gomad-skills/, gm-* directories)"
  - "Phase 2-02 text sweep (rename-sweep.js + applied passes)"
provides:
  - "Validated Phase 2 closeout state: all 8 D-17 gates green"
  - "Reconciled gm-*-prd path literals in gm-edit-prd/steps-e/*.md frontmatter"
  - "MD037 lint-clean 02-01-SUMMARY.md (unblocks phase commits)"
affects:
  - "5 step-e-*.md files under src/gomad-skills/2-plan-workflows/gm-edit-prd/steps-e/"
  - ".planning/phases/02-rename/02-01-SUMMARY.md (lint fix only)"
tech-stack:
  added: []
  patterns: []
key-files:
  created:
    - ".planning/phases/02-rename/02-03-SUMMARY.md"
  modified:
    - "src/gomad-skills/2-plan-workflows/gm-edit-prd/steps-e/step-e-01-discovery.md"
    - "src/gomad-skills/2-plan-workflows/gm-edit-prd/steps-e/step-e-01b-legacy-conversion.md"
    - "src/gomad-skills/2-plan-workflows/gm-edit-prd/steps-e/step-e-02-review.md"
    - "src/gomad-skills/2-plan-workflows/gm-edit-prd/steps-e/step-e-03-edit.md"
    - "src/gomad-skills/2-plan-workflows/gm-edit-prd/steps-e/step-e-04-complete.md"
    - ".planning/phases/02-rename/02-01-SUMMARY.md"
  renamed: []
decisions:
  - "Task 1 already landed in Wave 2 by the 02-02 executor (commit 386e398) plus the rename-sweep pass. Verified complete, skipped duplicate work."
  - "Discovered five broken path references in gm-edit-prd frontmatter during Task 2 validate:refs run — Wave 2's sweep rewrote bmad-*-prd to gomad-*-prd textually but did not reconcile to the gm-*-prd directory names actually on disk. Fixed inline as Rule 1 (bug)."
  - "Fixed three pre-existing MD037 markdownlint errors in 02-01-SUMMARY.md as Rule 3 (blocking): the repo-level pre-commit hook runs markdownlint against all tracked markdown files, so any stale lint error blocks every commit in this phase."
  - "Accepted plan's raw grep pattern (51 hits) as PASS on the strength of the 02-02-SUMMARY interpretation: all 51 hits are inside tools/dev/rename-sweep.js and test/test-rename-sweep.js, both explicitly in the sweep's IGNORE_GLOBS, and the hits are literal regex sources + test fixtures that legitimately need to contain the source patterns. Self-ref-excluded grep = 0 hits."
metrics:
  duration_minutes: ~12
  tasks_completed: 2
  commits: 2
  files_modified: 6
  gate_checks_run: 8
  gate_checks_passed: 8
completed_date: "2026-04-08"
---

# Phase 02 Plan 03: Fixture Rename + Phase 2 Gate Closeout Summary

Rename of `bmm-style.csv` to `gomad-style.csv` (already landed by Wave 2),
reconciliation of the CSV fixture's consumer and row contents to the new
`gm-*` skill IDs, and the full Phase 2 D-17 gate sequence run. Fixes one
class of residual stale path literals discovered during the gate run.
Covers TXT-04 and closes the Phase 2 verification loop.

## What Shipped

### Path literal fix (fix commit 54e5e9e)

Wave 2's rename-sweep rewrote `bmad-<skill>` to `gomad-<skill>` inside file
contents, but the directories on disk for these three PRD workflows are
`gm-create-prd`, `gm-edit-prd`, and `gm-validate-prd` — not `gomad-*-prd`.
Five frontmatter path-literal fields in `gm-edit-prd/steps-e/*.md` still
pointed at the (non-existent) `gomad-*-prd/...` paths:

| File | Field | Fixed target |
|------|-------|--------------|
| `step-e-01-discovery.md` | `prdPurpose` | `gm-create-prd/data/prd-purpose.md` |
| `step-e-01b-legacy-conversion.md` | `prdPurpose` | `gm-create-prd/data/prd-purpose.md` |
| `step-e-02-review.md` | `prdPurpose` | `gm-create-prd/data/prd-purpose.md` |
| `step-e-03-edit.md` | `prdPurpose` | `gm-create-prd/data/prd-purpose.md` |
| `step-e-04-complete.md` | `validationWorkflow` | `gm-validate-prd/steps-v/step-v-01-discovery.md` |

These were caught by `npm run validate:refs` in Task 2 (exit 1, 5 broken
references). After the fix, validate:refs reports `Broken references: 0`.

### MD037 lint cleanup (chore commit 20a58cc)

`.planning/phases/02-rename/02-01-SUMMARY.md` had three pre-existing
markdownlint MD037 ("no-space-in-emphasis") errors at 51:86, 81:49, and
82:65. The root cause was bare `bmad-*` / `gm-*` tokens in narrative prose
and table cells being parsed as `*...*` emphasis markers with spaces
inside. Fixed by wrapping the affected literals in backticks so they are
code spans instead of emphasis candidates. No semantic change.

This was required because the repo-level pre-commit hook (lint-staged +
markdownlint-cli2) runs against all tracked markdown on every commit, so
any stale MD037 error in any planning summary blocks every Phase 2 commit.

## Phase-gate results (D-17 after 02-03)

| # | Gate | Command | Result |
|---|------|---------|--------|
| 1 | Skill manifest validation | `npm run validate:skills` | PASS — 41 skills, 2 LOW findings (pre-existing, strict-mode pass) |
| 2 | Cross-reference integrity | `npm run validate:refs` | PASS — 251 files scanned, 125 refs checked, 0 broken, 0 leaks |
| 3 | Installer component suite | `npm run test:install` | PASS — 204/204 |
| 4 | CSV fixture test | `node test/test-file-refs-csv.js` | PASS — 7/7 |
| 5 | CLI entry smoke | `node tools/installer/gomad-cli.js --help` | PASS — exit 0 |
| 6 | Rename-sweep idempotency | `node tools/dev/rename-sweep.js` | PASS — `Files touched: 0`, all 7 mappings 0 |
| 7a | Zero-hit grep (raw, per plan verify) | `grep -rn 'bmad\|BMAD\|bmm' src/ tools/ test/ docs/ website/` | 51 hits — all inside `tools/dev/rename-sweep.js` and `test/test-rename-sweep.js` (sweep self-refs, both in `IGNORE_GLOBS`). Accepted as PASS per 02-02-SUMMARY precedent. |
| 7b | Zero-hit grep (self-ref excluded) | `... \| grep -v tools/dev/rename-sweep.js \| grep -v test/test-rename-sweep.js` | PASS — 0 hits |
| 8 | Phase 3 exclude-list integrity | `git log --oneline --name-only 386e398..HEAD` + `git status` on LICENSE/CHANGELOG/TRADEMARK/CONTRIBUTORS/README/README_CN | PASS — no modifications since Wave 2 end |

### Gate 6 idempotency output (final sweep run)

```
rename-sweep (APPLIED)
Files scanned: 425
Files touched: 0
Files skipped (exclude list): 8
Replacements by mapping:
  BMAD Method→GoMad: 0
  bmad-method→gomad: 0
  BMad→GoMad: 0
  BMAD→GOMAD: 0
  bmad→gomad: 0
  bmm→gomad (word-anchored): 0
  bmm→gomad (camelCase head): 0
```

### Gate 2 output (post-fix)

```
Summary:
   Files scanned: 251
   References checked: 125
   Broken references: 0
   Absolute path leaks: 0

   All file references valid!
```

## Commits

| Task | Subject | SHA |
|------|---------|-----|
| 1 | `test(02-02): rename bmm-style.csv fixture to gomad-style.csv` | `386e398` (landed in Wave 2) |
| 2 (fix) | `fix(02-03): reconcile stale gomad-*-prd path literals to gm-*-prd (D-14 fallout)` | `54e5e9e` |
| 2 (chore) | `chore(02-03): fix MD037 lint errors in 02-01-SUMMARY.md` | `20a58cc` |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 0 — Already done] Task 1 landed in Wave 2 by the 02-02 executor**

- **Found during:** Plan 02-03 startup verification
- **Issue:** The plan's Task 1 (git mv `bmm-style.csv` -> `gomad-style.csv`, reconcile CSV row contents, update consumer) was already fully performed by the Wave 2 executor: commit `386e398` did the `git mv`, and Wave 2's rename-sweep rewrote row contents + the consumer references in `test/test-file-refs-csv.js`.
- **Verification:** `ls test/fixtures/file-refs-csv/valid/` shows `gomad-style.csv` present, `bmm-style.csv` absent. `test-file-refs-csv.js` references `valid/gomad-style.csv`, `valid/core-style.csv`, `valid/minimal.csv` and expects `_gomad/...` workflow-file paths. `node test/test-file-refs-csv.js` exits 0 with 7/7 passing. No residual `bmm-style` or `bmad-style` hits under `test/`.
- **Fix:** Skipped duplicate work; documented here as the canonical Task 1 landing record for 02-03.

**2. [Rule 1 — Bug] Stale `gomad-*-prd` path literals in gm-edit-prd frontmatter**

- **Found during:** Task 2 Gate 2 (`npm run validate:refs`)
- **Issue:** Wave 2's rename-sweep rewrote `bmad-create-prd` / `bmad-validate-prd` to `gomad-create-prd` / `gomad-validate-prd` inside file contents, but the actual directories on disk are `gm-create-prd` and `gm-validate-prd`. Five frontmatter path literals in `gm-edit-prd/steps-e/*.md` pointed at the non-existent `gomad-*-prd/...` paths. validate:refs failed with 5 broken references.
- **Fix:** Hand-reconciled the 5 path literals to `gm-*-prd/...`. Post-fix validate:refs reports 0 broken references. Scope strictly limited to the 5 entries flagged — other textual occurrences of `gomad-create-prd` in docs/tutorial prose are not path literals and not in validate:refs scope.
- **Files modified:** `src/gomad-skills/2-plan-workflows/gm-edit-prd/steps-e/step-e-01-discovery.md`, `step-e-01b-legacy-conversion.md`, `step-e-02-review.md`, `step-e-03-edit.md`, `step-e-04-complete.md`
- **Commit:** `54e5e9e`

**3. [Rule 3 — Blocking] Pre-existing MD037 errors in 02-01-SUMMARY.md blocked phase commits**

- **Found during:** First commit attempt in Task 2 (pre-commit hook failure)
- **Issue:** `.planning/phases/02-rename/02-01-SUMMARY.md` had three MD037 "no-space-in-emphasis" errors on lines 51, 81, 82. Bare `bmad-*` / `gm-*` tokens in prose and table cells were parsed as emphasis markers with spaces inside. The repo-level pre-commit hook runs markdownlint against all tracked markdown files (not just staged), so any pre-existing lint error blocks every commit in the phase.
- **Fix:** Wrapped the affected `bmad-*` / `gm-*` literals in backticks so they become code spans. No semantic change. Treated as a Rule 3 blocker since it prevents landing any Phase 2 commit.
- **Files modified:** `.planning/phases/02-rename/02-01-SUMMARY.md`
- **Commit:** `20a58cc`

### Architectural changes

None.

### Deferred (out of scope — logged, not fixed)

Textual occurrences of `gomad-create-prd` / `gomad-validate-prd` / `gomad-edit-prd` survive in:

- `src/gomad-skills/2-plan-workflows/gm-validate-prd/steps-v/step-v-13-report-complete.md` (prose: "Invoke the `gomad-edit-prd` skill")
- `src/gomad-skills/2-plan-workflows/gm-agent-pm/SKILL.md` (command/description table rows)
- `src/core-skills/gm-help/SKILL.md` (bulleted help text example)
- `tools/installer/ide/shared/path-utils.js` (JSDoc `@returns` example)
- `test/test-installation-components.js` (test fixture data literal)
- `docs/_STYLE_GUIDE.md`, `docs/zh-cn/_STYLE_GUIDE.md`, `docs/reference/commands.md`, `docs/zh-cn/reference/commands.md`, `docs/reference/workflow-map.md`, `docs/zh-cn/reference/workflow-map.md`, `docs/tutorials/getting-started.md`, `docs/zh-cn/tutorials/getting-started.md`

These are **not** validate:refs gate failures (they are prose, not path literals), **not** zero-hit grep failures (the zero-hit grep is for `bmad|BMAD|bmm`, not `gomad-create-prd`), and **not** in 02-03's scope (TXT-04 targets the CSV fixture, not prose examples). They should be addressed by a future normalization pass that reconciles user-facing skill name examples with the short `gm-` prefix — tracked as a candidate for Phase 3 or a dedicated polish plan.

## Known Stubs

None.

## Threat Model Notes

All three plan-level STRIDE threats mitigated:

- **T-02-11 (Tampering — stale test fixture path literal):** Grep across `test/` for `bmm-style` / `bmad-style` returns 0 hits; `test-file-refs-csv.js` consumer references the renamed fixture and the test passes 7/7.
- **T-02-12 (DoS — CI gate passing with stale skill IDs):** Caught by this very plan — validate:refs flagged the 5 stale `gomad-*-prd` path literals that would have otherwise reached Phase 4. Three independent validators (`validate:skills`, `validate:refs`, `test:install`) all run clean after the fix.
- **T-02-13 (Repudiation — fixture rename loses history):** `git log --follow test/fixtures/file-refs-csv/valid/gomad-style.csv` traces back through commit `386e398` to the original `bmm-style.csv` lineage. History preserved.

## Scope Boundary Notes

- **In scope and done:** Phase 2 D-17 gate run, the 5 validate:refs-flagged path literals, and the pre-commit blocker in 02-01-SUMMARY.md.
- **Deferred to future plan:** ~14 prose occurrences of `gomad-<skill>` that should be `gm-<skill>` in docs and installer strings (logged above). Not gate failures under any Phase 2 validator.
- **Out of scope and left alone:** LICENSE, CHANGELOG.md, TRADEMARK.md, CONTRIBUTORS.md, README.md, README_CN.md — Phase 3 ownership. `git status` on this set is clean.

## Phase 2 Completion Sign-off

**Phase 2 (rename) is complete and ready for `/gsd-verify-work`.**

All 8 D-17 phase gates are green. The full rename chain — Wave 1 filesystem renames, Wave 2 text sweep, Wave 3 fixture + closeout — produces a self-consistent tree: every skill directory uses the `gm-` prefix, every path reference resolves to a real file, the installer test suite passes 204/204, the CSV fixture test passes 7/7, the rename-sweep idempotency check reports zero touches on a second run, and the Phase 3 exclude-list is untouched.

## Self-Check: PASSED

- `git log --oneline -3` shows commits `20a58cc`, `54e5e9e`, `386e398` in order
- `git rev-parse --short 54e5e9e` resolves → fix commit is present
- `git rev-parse --short 20a58cc` resolves → chore commit is present
- `test/fixtures/file-refs-csv/valid/gomad-style.csv` exists
- `test/fixtures/file-refs-csv/valid/bmm-style.csv` does not exist
- `test/fixtures/file-refs-csv/valid/core-style.csv` exists
- `node test/test-file-refs-csv.js` → 7/7 pass, exit 0
- `npm run validate:skills` → 2 LOW findings, strict-mode PASS
- `npm run validate:refs` → 0 broken, 0 leaks, PASS
- `npm run test:install` → 204/204 pass
- `node tools/installer/gomad-cli.js --help` → exit 0
- `node tools/dev/rename-sweep.js` → `Files touched: 0`
- `grep -rn 'bmad\|BMAD\|bmm' src/ tools/ test/ docs/ website/` → 51 hits, all in sweep script + its test (documented IGNORE_GLOBS members)
- `git status -- LICENSE CHANGELOG.md TRADEMARK.md CONTRIBUTORS.md README.md README_CN.md` → clean
- `git log --oneline --name-only 386e398..HEAD` → no Phase 3 exclude-list files touched
- `.planning/phases/02-rename/02-03-SUMMARY.md` exists (this file)
