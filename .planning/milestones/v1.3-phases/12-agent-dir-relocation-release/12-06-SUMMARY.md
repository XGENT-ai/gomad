---
phase: 12-agent-dir-relocation-release
plan: 06
subsystem: testing
tags: [tests, regex-assertion, tarball-verification, allowlist, dual-sided-gate]

# Dependency graph
requires:
  - phase: 12-agent-dir-relocation-release
    plan: 01
    provides: "Launcher template line 16 → _config/agents/<shortName>.md (Phase C body-regex target)"
  - phase: 12-agent-dir-relocation-release
    plan: 02
    provides: "cleanup-planner.js v12 cleanup branch with legitimate gomad/agents/ string literal — allowlisted under category='both'"
  - phase: 12-agent-dir-relocation-release
    plan: 03
    provides: "PERSONA_SHORTNAMES whitelist runtime — Phase C install-smoke exercises this without flagging persona .md files as custom"
provides:
  - "test-gm-command-surface.js Phase C extended with 16 launcher-body regex assertions (positive _config/agents/ + negative gomad/agents/) for AGENT-07"
  - "verify-tarball.js Phase 4 (checkLegacyAgentPathClean) — greps shipped source for residual gomad/agents/ refs with category-aware allowlist filtering for AGENT-10"
  - "tools/fixtures/tarball-grep-allowlist.json — extended schema with optional category field (legacy/gm-agent/gomad-agents/both); 6 new entries cataloging legitimate gomad/agents/ references"
  - "checkGmAgentGrepClean (Phase 3) updated to category-aware filtering — backward-compatible (entries without category remain Phase 3 default)"
affects:
  - "12-07 (CHANGELOG release notes can reference AGENT-07 + AGENT-10 as completed test gates)"
  - "12-08 (Phase 4 must be invoked by the `quality` script chain via npm run test:tarball — already wired)"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pattern S5 — Allowlist + Grep-Filter: enumerate forbidden literals, allowlist legitimate references with reason+category (verify-tarball.js Phase 4 + tools/validate-doc-paths.js from Plan 04 share this pattern)"
    - "Pattern: Dual-sided test gate — gm-surface verifies installer output shape (Phase C body regex); verify-tarball verifies shipped tarball shape (Phase 4 grep-clean). Both must pass before publish."
    - "Pattern: Category-aware allowlist filtering — single fixtures file with category field; each Phase reads a different filter subset (Phase 3: no-cat | gm-agent | both; Phase 4: gomad-agents | both)"
    - "Pattern: Word-boundary grep regex \\bgomad/agents/ — prevents false-positives (e.g. xgomad/agents/, gomad/agentsfoo)"

key-files:
  created: []
  modified:
    - "test/test-gm-command-surface.js — +6 LOC inside the existing per-persona Phase C for-loop (positive + negative regex pair + 2 assert calls)"
    - "tools/fixtures/tarball-grep-allowlist.json — +6 new entries, schema extended with category field; cleanup-planner.js entry's reason broadened + category='both' added; total entries 17 → 23"
    - "tools/verify-tarball.js — +53/-2 LOC: new checkLegacyAgentPathClean function, Phase 4 invocation block, header docstring + final summary updated to 4 phases, checkGmAgentGrepClean allowlist filter made category-aware"

key-decisions:
  - "Schema-extension over schema-rewrite: existing 17 allowlist entries kept untouched (no category field — treated as legacy gm-agent default); 6 entries (5 modifications + 1 new) carry category='both' or 'gomad-agents'. Backward-compatible — Phase 3 behavior unchanged for entries without a category."
  - "Categorize 4 existing dual-purpose entries as 'both' (cleanup-planner, agent-command-generator, manifest-generator, installer.js) — these legitimately reference BOTH gm-agent- AND gomad/agents/ patterns. Verified via per-file grep counts: each has both pattern types, so each must satisfy both Phase 3 and Phase 4 filters."
  - "Add 2 new gomad-agents-only entries (path-utils.js, artifacts.js) — these don't reference gm-agent- so weren't in the original Phase 3 allowlist; they reference gomad/agents/ legitimately (path-utils defines LEGACY_AGENTS_PERSONA_SUBPATH; artifacts has a single comment about the standalone-agent source dir)."
  - "Categorize _config-driven.js explicitly as 'gm-agent' (rather than leaving without category) — defensive: makes the allowlist self-documenting about which Phase each entry serves, even though behaviorally identical to no-category for Phase 3."

patterns-established:
  - "Pattern: Phase-N grep-clean pattern in verify-tarball.js — each new shipped-source forbidden-literal class gets a checkXxxGrepClean function with try/catch around execSync, an allowlist filter, an invocation block mirroring Phase 3, and an entry in the category-aware fixtures file. Future v1.4 path moves follow the same shape."
  - "Pattern: Phase C body-regex extension — when the launcher template path changes, add positive (new-path) AND negative (old-path) regex assertions inside the existing per-persona for-loop. Drift in either direction fails loud."

requirements-completed: [AGENT-07, AGENT-10]

# Metrics
duration: ~10min
completed: 2026-04-27
---

# Phase 12 Plan 06: Phase C Body Regex + Tarball Phase 4 Summary

**Dual-sided test gate for the agent-dir relocation: `test-gm-command-surface.js` Phase C now asserts launcher-body positive `_config/agents/` + negative `gomad/agents/` regex per persona (AGENT-07); `verify-tarball.js` Phase 4 (`checkLegacyAgentPathClean`) greps shipped source for residual `gomad/agents/` refs with a category-aware allowlist (AGENT-10). All four tarball phases + the gm-surface 63-assertion run pass green on the current tree.**

## Performance

- **Duration:** ~10 min
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments

- **AGENT-07 (Phase C body regex):** Inside the existing Phase C per-persona for-loop, added a positive regex assertion (`/_gomad/_config/agents/<shortName>.md` MUST appear) and a negative regex assertion (`/_gomad/gomad/agents/<shortName>.md` MUST NOT appear). 16 new assertions total (2 per persona × 8 personas). All pass against the v1.3 install output produced by Plan 12-01's writer + template swap.
- **AGENT-10 (Phase 4 grep gate):** New `checkLegacyAgentPathClean` function in `tools/verify-tarball.js` parallel to the existing `checkGmAgentGrepClean`. Greps `src/` and `tools/installer/` for `\bgomad/agents/` (word-boundary anchored to prevent false positives). Failures are filtered through a category-aware allowlist subset (`gomad-agents` OR `both`).
- **Allowlist schema extension:** `tools/fixtures/tarball-grep-allowlist.json` extended with optional `category` field. Entries WITHOUT `category` remain Phase 3 default (backward-compatible). 6 entries categorized for the new Phase 4: 4 as `both` (cleanup-planner, agent-command-generator, manifest-generator, installer.js — each legitimately references BOTH legacy patterns), 2 as `gomad-agents` (path-utils.js, artifacts.js — only reference gomad/agents/). One entry explicitly tagged `gm-agent` (\_config-driven.js) for self-documentation.
- **Phase 3 backward compatibility:** `checkGmAgentGrepClean` updated to filter the allowlist by category (`!entry.category || entry.category === 'gm-agent' || entry.category === 'both'`). Entries without a category continue to suppress Phase 3 matches exactly as before.
- **Header docstring + final summary:** The verify-tarball.js script header now documents Phase 4; the final OK summary line lists 4 phases by name.

## Task Commits

1. **Task 1: Extend test-gm-command-surface.js Phase C with launcher-body regex (AGENT-07)** — `b88878c` (test)
2. **Task 2: Extend tarball-grep-allowlist.json with category field + new gomad-agents entries** — `378531f` (chore)
3. **Task 3: Add verify-tarball.js Phase 4 (checkLegacyAgentPathClean) for AGENT-10** — `11b107d` (feat)

## Files Created/Modified

- `test/test-gm-command-surface.js` — +6 LOC inside the existing Phase C for-loop. Two new const declarations (`positiveRegex`, `negativeRegex`) plus two new `assert(...)` calls. The variables `shortName` and `raw` were already in scope from the existing for-loop. No new imports.
- `tools/fixtures/tarball-grep-allowlist.json` — +20/-5 LOC. cleanup-planner.js entry's reason broadened + category=`both`; agent-command-generator.js + manifest-generator.js + installer.js + \_config-driven.js entries given category fields; 2 new entries appended for path-utils.js + artifacts.js. 17 → 23 entries; 16 SKILL.md/skill-manifest.yaml entries unchanged.
- `tools/verify-tarball.js` — +53/-2 LOC. New `checkLegacyAgentPathClean` function (28 LOC); Phase 4 invocation block (10 LOC, mirroring Phase 3); header docstring + final summary message extended to 4 phases; `checkGmAgentGrepClean` allowlist filter changed from `.map(entry.path)` to a category-aware `.filter().map(entry.path)` (3 LOC).

## Test Results

**`npm run test:gm-surface`** — exits 0. 63 passed / 0 failed.

- Phase A — in-repo self-check: skipped (`.claude/commands/gm/` gitignored, expected per Plan 05-02).
- Phase B — negative-fixture self-test: PASS (1 assertion).
- Phase C — install-smoke: PASS (62 assertions).
  - 8 personas × 6 per-persona assertions = 48 assertions:
    - present-in-installed-output (8)
    - has-YAML-frontmatter (8)
    - frontmatter-name-matches-gm:agent-NAME (8)
    - has-non-empty-description (8)
    - **NEW** body-references-v1.3-\_config/agents/-path (8) ← AGENT-07 positive
    - **NEW** body-has-NO-legacy-gomad/agents/-reference (8) ← AGENT-07 negative
  - 7 legacy-skills-dir-absent assertions (`.claude/skills/gm-agent-<name>/`)
  - 1 npm pack assertion + 1 temp-dir creation + 1 npm install + 1 gomad bin presence + 1 install exit-0 + 1 cleanup-tarball + 1 cleanup-tempdir + 1 .claude/commands/gm/ present.

**`npm run test:tarball`** — exits 0. All 4 phases pass:

- Phase 1 (forbidden paths): PASS — no `.planning/`, `test/`, `.github/`, `docs/`, `website/`, or `banner-bmad` files in the 357-file tarball.
- Phase 2 (bmad/bmm grep-clean): PASS — no residual references in shipped source.
- Phase 3 (gm-agent- grep-clean): PASS — all gm-agent-referencing files are in the category-eligible allowlist.
- Phase 4 (gomad/agents/ grep-clean): PASS — all 6 files referencing `gomad/agents/` (cleanup-planner, installer, manifest-generator, agent-command-generator, path-utils, artifacts) are in the `gomad-agents` OR `both` allowlist subset.

## Induced-Violation Verification (Phase 4 Failure Path)

Confirmed that Phase 4 correctly fails on a non-allowlisted residual:

```bash
echo "// gomad/agents/test.md" >> src/index.js
node tools/verify-tarball.js  # → exit 1, "FAIL: residual gomad/agents/ references in: src/index.js"
rm -f src/index.js  # cleanup (file did not exist in git; created by the test)
```

`src/index.js` was never tracked in git — the test created it and immediately deleted it. Phase 4 detected the residual on the first run and exited with code 1 as designed.

## Decisions Made

- **Schema-extension over schema-rewrite for the allowlist** — adding an optional `category` field keeps the 17 pre-existing entries untouched. Entries without a category default to legacy Phase 3 (gm-agent) eligibility — exactly the prior behavior. Phase 4 only sees entries explicitly tagged `gomad-agents` or `both`. This is the smallest-diff way to introduce category-awareness without a global rewrite of the fixtures file.
- **`category: 'both'` for 4 entries that legitimately reference BOTH legacy patterns** — verified by per-file grep counts. cleanup-planner.js (gomad/agents/=2, gm-agent-=5), agent-command-generator.js (gomad/agents/=3, gm-agent-=11), manifest-generator.js (gomad/agents/=1, gm-agent-=6), installer.js (gomad/agents/=3, gm-agent-=1). Each of these requires both Phase 3 and Phase 4 to whitelist it.
- **`category: 'gomad-agents'` for 2 NEW entries** — path-utils.js (defines `LEGACY_AGENTS_PERSONA_SUBPATH = path.posix.join('gomad', 'agents')` constant + JSDoc examples) and artifacts.js (single comment line at line 55 referencing the legacy standalone-agent source dir). Neither references `gm-agent-`, so neither was in the prior Phase 3 allowlist.
- **Explicit `category: 'gm-agent'` for `_config-driven.js`** — defensive. Behaviorally identical to no-category for Phase 3, but makes the allowlist self-documenting about which Phase each entry serves. The other 16 SKILL.md/skill-manifest.yaml entries (with no `gomad/agents/` references) retain no-category for minimal diff.
- **Word-boundary regex `\bgomad/agents/`** — prevents false positives like `xgomad/agents/` or `gomad/agentsfoo`. The pattern matches `gomad/agents/` as a substring — catches both `_gomad/gomad/agents/` (full path) and bare `gomad/agents/` (any context).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Prettier reformat of category-filter chain**

- **Found during:** Task 3 (verify-tarball.js Phase 4 addition)
- **Issue:** Initial Phase 4 + Phase 3 update wrote the category-filter chain across 3 lines (`.filter(...)` and `.map(...)` on separate lines). `npm run format:check -- tools/verify-tarball.js` failed with `[warn] Code style issues found`. The plan's pseudocode used the multi-line form, but the project's prettier config flattens the chain because it fits within the print-width budget once the filter expression is short enough.
- **Fix:** Ran `npx prettier --write tools/verify-tarball.js`. Both the Phase 3 update and the Phase 4 new function had their `.filter(...).map(...)` chains flattened to a single line. Behaviorally identical; only line-layout changed.
- **Files modified:** tools/verify-tarball.js (committed as part of Task 3 commit `11b107d`).
- **Verification:** `npx prettier --check tools/verify-tarball.js` and `npx eslint tools/verify-tarball.js --max-warnings=0` both exit 0.
- **Acceptance criteria still met:** `grep -c "category === 'gomad-agents'"` returns 1, `grep -c "category === 'both'"` returns 3 (all on flattened lines).

---

**Total deviations:** 1 auto-fixed (Rule 3 blocking — formatting compliance)
**Impact on plan:** Functionally equivalent to the plan's pseudocode; line layout differs because prettier flattens chains within print-width. The acceptance-criteria greps for the literal substrings still pass.

## Issues Encountered

- **Pre-existing prettier issue on `tools/installer/ide/templates/agent-command-template.md`** — already documented in `.planning/phases/12-agent-dir-relocation-release/deferred-items.md` by Plan 12-01. Out of scope per Rule 3 scope boundary. Not investigated or modified.
- **Pre-existing test-cleanup-planner.js failures** — already documented by Plan 12-02. Out of scope. Not investigated or modified.

## Confirmations

- **Phase A and Phase B unchanged:** `git diff HEAD~3..HEAD~2 test/test-gm-command-surface.js` shows the only change to test-gm-command-surface.js is +6 LOC inside the Phase C for-loop. Phase A, Phase B, and the EXPECTED_AGENTS constant all byte-for-byte unchanged.
- **EXPECTED_AGENTS unchanged:** Still `['analyst', 'tech-writer', 'pm', 'ux-designer', 'architect', 'sm', 'dev', 'solo-dev']` (8 personas).
- **Existing 17 allowlist entries' paths unchanged:** Only the cleanup-planner.js entry's `reason` field was modified (broadened to mention Phase 12 D-01); all other paths and reasons are byte-for-byte identical to the prior file.
- **No file deletions:** `git diff --diff-filter=D --name-only HEAD~3 HEAD` returns empty.
- **No untracked files:** `git status --short` returns empty after Task 3 commit.
- **Lint clean across all 3 files:** ESLint exits 0 on test-gm-command-surface.js, verify-tarball.js, and the JSON allowlist (JSON is not linted but is parsed).
- **Format clean:** Prettier exits 0 on all 3 files.
- **Phase 3 backward compatibility:** Phase 3 still passes on the current tree (the Phase 3 PASS line is printed in the test:tarball output above).

## Notes for Downstream Plans

- **Plan 12-07 (CHANGELOG release notes):** AGENT-07 + AGENT-10 are the dual-sided test-gate completions; reference them as the v1.3 release-quality assurance.
- **Plan 12-08 (release script chain):** Phase 4 is now part of `npm run test:tarball` — already wired into the `quality` chain via the existing script. No additional wiring needed.
- **Future maintainers — adding a new shipped-source forbidden-literal class:** Follow the pattern established here. Add a `checkXxxGrepClean` function with try/catch around execSync, an allowlist filter using a new category value, an invocation block mirroring Phase 3 + Phase 4, an entry in the fixtures file with the new category. Word-boundary regex `\bxxx` prevents false positives.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Pipeline is internally consistent: Phase C body regex enforces installer output shape (positive new-path + negative old-path); Phase 4 enforces shipped tarball shape (no residual old-path refs in source). Drift in either direction fails loud.
- Allowlist is self-documenting via the `category` field — future Phase additions follow the same shape.
- Remaining v1.3 plans (12-04 path-validation linter, 12-05 upgrade tests, 12-07 CHANGELOG, 12-08 release): all have non-overlapping file targets with this plan.

## Self-Check: PASSED

- File `test/test-gm-command-surface.js`: FOUND
- File `tools/fixtures/tarball-grep-allowlist.json`: FOUND
- File `tools/verify-tarball.js`: FOUND
- Commit `b88878c` (Task 1 — Phase C body regex): FOUND
- Commit `378531f` (Task 2 — allowlist category extension): FOUND
- Commit `11b107d` (Task 3 — Phase 4 grep gate): FOUND
- `grep -c "positiveRegex" test/test-gm-command-surface.js` → 2: VERIFIED
- `grep -c "negativeRegex" test/test-gm-command-surface.js` → 2: VERIFIED
- `grep -c "function checkLegacyAgentPathClean" tools/verify-tarball.js` → 1: VERIFIED
- `grep -c "Phase 4:" tools/verify-tarball.js` → 3: VERIFIED
- `grep -c "category === 'gomad-agents'" tools/verify-tarball.js` → 1: VERIFIED
- `grep -c "category === 'both'" tools/verify-tarball.js` → 3: VERIFIED
- `node -e "JSON.parse(...)"` on allowlist: VERIFIED (23 entries)
- `npm run test:gm-surface` → 63 passed / 0 failed: VERIFIED
- `npm run test:tarball` → all 4 phases PASS: VERIFIED
- Induced-violation Phase 4 failure → exit 1: VERIFIED

---

_Phase: 12-agent-dir-relocation-release_
_Completed: 2026-04-27_
