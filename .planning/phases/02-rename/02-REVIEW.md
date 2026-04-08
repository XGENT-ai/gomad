---
status: issues_found
phase: 02-rename
depth: standard
files_reviewed: 7
findings:
  critical: 0
  warning: 5
  info: 7
  total: 12
---

# Phase 2 Code Review

**Scope reviewed:** 7 files (1 sweep script, 1 test file, 5 rewritten step markdown files). Depth: standard.

## Findings

### Critical

None.

### Warnings

#### WR-01: Discovery step has redundant, conflicting validation-report prompts

- **File:** `src/gomad-skills/2-plan-workflows/gm-edit-prd/steps-e/step-e-01-discovery.md:84-139`
- **Issue:** Steps 4 and 5 both ask about validation reports. Step 4 auto-detects one in the PRD folder, and regardless of outcome, step 5 unconditionally re-asks the user to provide a validation report path. If the user already chose `[U]` in step 4, they will be re-prompted in step 5 and can accidentally overwrite/contradict the earlier selection. There is no conditional guard like "If step 4 already loaded a report, skip step 5."
- **Fix:** Add a guard to step 5: "Skip this step if a validation report was already loaded in step 4." Alternatively, restructure so step 4 ("auto-detect") and step 5 ("manual path") are an if/else rather than sequential.

#### WR-02: Misleading "two passes" comment contradicts single-pass behavior

- **File:** `tools/dev/rename-sweep.js:86-91`
- **Issue:** The comment claims `bmad_bmm_pm` needs "two passes (bmad→gomad, then _bmm_ → _gomad_)". This is wrong: a single invocation of `applyMappings` runs all mappings sequentially in order, and the lowercase-bmad rule fires before the bmm rules, so `bmad_bmm_pm` is handled in one call. The test at line 137-143 confirms single-call behavior, contradicting the comment. Will mislead future maintainers.
- **Fix:** Update the comment to say "within a single pass, bmad→gomad runs before bmm→gomad, so `bmad_bmm_pm` rewrites cleanly in one pass."

#### WR-03: Missing rule-ordering test for camelCase bmm rule

- **File:** `tools/dev/rename-sweep.js:92, 98`
- **Issue:** Rule 5's negative lookahead `(?![A-Za-z0-9])` correctly excludes uppercase, leaving `bmmPath` for rule 6. But there is no test confirming rule ordering: if rule 6 were removed, `bmmPath` would NOT be rewritten. Adding such a test documents intent and catches regressions if someone "simplifies" the lookahead in rule 5.
- **Fix:** Add a test that confirms rule 5 alone does not rewrite `bmmPath`, and rule 6 is what handles it.

#### WR-04: Bare `BMad`/`BMAD`/`bmad` rules use no word boundary — false positive risk

- **File:** `tools/dev/rename-sweep.js:80-82`
- **Issue:** Rules 3-5 use `/BMad/g`, `/BMAD/g`, `/bmad/g` with no word boundary. Any occurrence of those substrings in unrelated identifiers is rewritten — e.g. `subbmad` → `subgomad`, `bmadness` → `gomadness`. Unlike the `bmm` rule, there is no word anchor. Probably acceptable given the controlled codebase, but no test confirms intentional substring behavior.
- **Fix:** Either add a comment documenting that substring-match is intentional because no false positives exist in the tree, or add word anchors consistent with the bmm rule. Add a test documenting the known substring behavior.

#### WR-05: Sweep script does not warn on empty glob result — silent no-op risk

- **File:** `tools/dev/rename-sweep.js:138-147`
- **Issue:** If `TARGET_GLOB` is misconfigured or the cwd is wrong, `globSync` returns `[]` and the script reports "Files scanned: 0, Files touched: 0" as a success. Future maintainers running the script from a wrong directory would see a false-positive clean run.
- **Fix:** After the glob, if `files.length === 0`, emit a warning and optionally exit 1.

### Info

#### IN-01: Discovery step embeds Unix-only shell snippet

- **File:** `src/gomad-skills/2-plan-workflows/gm-edit-prd/steps-e/step-e-01-discovery.md:87-90`
- **Issue:** `ls -t {prd_folder_path}/validation-report-*.md 2>/dev/null | head -1` is Unix-only. Replace with tool-neutral instruction using Glob.
- **Fix:** Replace shell snippet with: "Use the Glob tool to find `validation-report-*.md` in the PRD folder, sorted by modification time."

#### IN-02: Edit step frontmatter example omits legacy-conversion branch

- **File:** `src/gomad-skills/2-plan-workflows/gm-edit-prd/steps-e/step-e-03-edit.md:152-168`
- **Issue:** The `stepsCompleted` example does not mention `step-e-01b-legacy-conversion`.
- **Fix:** Add a note about including the legacy-conversion step when traversed.

#### IN-03: MAPPINGS array is shallow-frozen

- **File:** `tools/dev/rename-sweep.js:77`
- **Issue:** `Object.freeze(MAPPINGS)` freezes the array but not individual entries. A consumer could mutate `MAPPINGS[0].to = 'X'`. Low risk for a one-shot script but inconsistent with stated immutability intent.
- **Fix:** `Object.freeze(MAPPINGS.map(Object.freeze))`.

#### IN-04: Test fixture splits string literals — needs documentation

- **File:** `test/test-rename-sweep.js:83-88`
- **Issue:** Constants like `['B', 'MAD Method'].join('')` defeat the sweep but are fragile. The file IS in `IGNORE_GLOBS` so splitting is unnecessary — but provides defense-in-depth. Needs comment explaining intent.
- **Fix:** Add comment: `// Double-protection: even though this file is in IGNORE_GLOBS, we split literals so a mis-configured sweep cannot silently corrupt the fixtures.`

#### IN-05: Step files use heavy emoji formatting (style inconsistency)

- **Files:** All 5 step markdown files
- **Issue:** Heavy emoji use inherited from upstream BMAD. Not a bug; flag for Phase 4 branding cleanup if removal desired.
- **Fix:** None in Phase 2 scope.

#### IN-06: Stale `gomad-advanced-elicitation` / `gomad-party-mode` skill references should be `gm-*`

- **File:** `src/gomad-skills/2-plan-workflows/gm-edit-prd/steps-e/step-e-02-review.md:218-219`
- **Issue:** Menu options A and P reference `gomad-advanced-elicitation` and `gomad-party-mode`. The phase rename moved skills to `gm-*`, not `gomad-*`. Sweep mapped `bmad-` → `gomad-` but skills should be `gm-*`. Mechanical sweep artifact requiring hand-correction across all step files.
- **Fix:** Verify the intended slug, then hand-correct or add a follow-up sweep pass. Same pattern should be grep'd across all step files. (Plan 02-03 SUMMARY also notes this as deferred.)

#### IN-07: Apply mode does not print touched files

- **File:** `tools/dev/rename-sweep.js:207-213`
- **Issue:** In apply mode, the list of touched files is computed but never printed. `touchedFiles` is populated but only summarized.
- **Fix:** Print the list (or at least the count) unconditionally, or behind a `--verbose` flag.

---

## Summary

- **Files reviewed:** 7
- **Critical:** 0
- **Warnings:** 5 (WR-01 through WR-05)
- **Info:** 7 (IN-01 through IN-07)
- **Status:** issues_found

**Overall assessment:** The sweep script (`tools/dev/rename-sweep.js`) is well-structured, idempotent, and pure — test coverage is good (20 cases, covers ordering, idempotency, word-anchoring, camelCase). Main correctness concerns are WR-01 (duplicate validation-report prompt), WR-02 (misleading "two passes" comment), and IN-06 (apparent namespace collision where the sweep left `gomad-*` skill references that should be `gm-*`). WR-05 is a minor robustness concern. None of these block Phase 2; all are fixable as small follow-ups.
