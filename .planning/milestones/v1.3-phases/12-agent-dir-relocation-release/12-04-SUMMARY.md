---
phase: 12-agent-dir-relocation-release
plan: 04
subsystem: tooling
tags: [tooling, docs-linter, quality-gate, docs-07]

# Dependency graph
requires:
  - phase: 11-docs-site-content
    provides: "Authored docs tree at docs/**/*.md(x) — Phase 11 sweep ensured no shipped docs reference legacy v1.2 persona path (DOCS-07 negative-only assumption)"
  - phase: 12-agent-dir-relocation-release
    plan: 02
    provides: "v1.3 BREAKING migration banner cross-references docs/upgrade-recovery.md (allowlisted) — confirms the allowlist policy is durable"
provides:
  - "tools/validate-doc-paths.js — negative-only docs-path linter (NEW, 76 LOC, zero new deps)"
  - "npm run validate:doc-paths — runnable script exits 0 on clean tree, 1 on legacy-path leaks"
  - "Hard allowlist exempting docs/upgrade-recovery.md + docs/zh-cn/upgrade-recovery.md (D-12)"
affects:
  - "12-07 (DOCS-07 sweep + Phase 11 merge): re-run npm run validate:doc-paths after Phase 11 merge to confirm combined tree stays clean"
  - "12-08 (release commit): wire `npm run validate:doc-paths` into the extended `quality` script and `prepublishOnly` gate"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pattern: negative-only documentation linter — recursive markdown walker over docs/, regex test against fixed FORBIDDEN_PATTERNS list, hard ALLOWLIST exempting a small set of files with legitimate references; exit-1 on any non-allowlisted match"
    - "Pattern: `path.join` for allowlist values — yields native separator on both POSIX (`zh-cn/upgrade-recovery.md`) and Windows (`zh-cn\\upgrade-recovery.md`), matching what `path.relative(base, full)` returns"
    - "Pattern: word-boundary anchored regex to prevent false positives — `/\\b_gomad\\/gomad\\/agents\\b/` doesn't trigger on `xgomad/...` or `...gomad/agentsfoo`"

key-files:
  created:
    - "tools/validate-doc-paths.js — 76 LOC NEW. Recursive markdown walker; hard-coded DOCS_ROOT under repo root; FORBIDDEN_PATTERNS array with 2 regex (`/\\b_gomad\\/gomad\\/agents\\b/` and `/\\bgomad\\/agents\\/[a-z][a-z0-9-]*\\.md\\b/`); ALLOWLIST Set with 2 entries (`upgrade-recovery.md` + `path.join('zh-cn', 'upgrade-recovery.md')`); exit codes 0/1/2 (clean/violation/missing-docs-root)."
  modified:
    - "package.json — +1 LOC, single new script entry `\"validate:doc-paths\": \"node tools/validate-doc-paths.js\"` placed alphabetically before `validate:kb-licenses` in the scripts block. No other field touched."
    - ".planning/phases/12-agent-dir-relocation-release/deferred-items.md — +1 LOC, log of pre-existing prettier issues in two unrelated files (test/test-inject-reference-tables.js + tools/inject-reference-tables.cjs) verified present on base bff4ec3 before plan 12-04 edits."

key-decisions:
  - "Drop the shebang line (`#!/usr/bin/env node`) from the script: the project ESLint config enforces `n/hashbang` which prohibits shebangs in non-bin scripts; the analog `tools/validate-doc-links.js` follows the same convention. Plan acceptance criterion `head -1 == '#!/usr/bin/env node'` documented as DEVIATED — script is invoked via `node tools/validate-doc-paths.js` (matches the package.json script entry exactly) so functional behavior is unchanged."
  - "Use `path.join('zh-cn', 'upgrade-recovery.md')` for the allowlist value: native separator on Windows + POSIX matches what `path.relative(DOCS_ROOT, full)` produces during the walker scan."
  - "Run prettier --write on the new file after creation: prettier collapsed the FORBIDDEN_PATTERNS multi-line array and the ALLOWLIST multi-arg Set onto single lines. Result is byte-equivalent semantically and lint+format clean."

patterns-established:
  - "Pattern: negative-only docs-path linter for forbidden runtime path examples — drop into tools/validate-doc-paths.js, exit-1 on first non-allowlisted match, allowlist via `relative-to-DOCS_ROOT` keys with `path.join` for cross-platform separator"
  - "Pattern: log-and-continue treatment of pre-existing format failures — Rule 3 scope boundary requires NOT fixing format issues in untouched files; log to deferred-items.md and continue"

requirements-completed: [DOCS-07]

# Metrics
duration: ~3min
completed: 2026-04-27
tasks-count: 2
files-touched: 3 (1 created, 2 modified)
---

# Phase 12 Plan 04: Docs-Paths Linter Summary

**`tools/validate-doc-paths.js` (76 LOC, zero new deps) implements the DOCS-07 negative-only contract — fails if any non-allowlisted docs/**/*.md(x) file references the legacy `_gomad/gomad/agents/` runtime path; allowlist exempts `docs/upgrade-recovery.md` + `docs/zh-cn/upgrade-recovery.md`. `npm run validate:doc-paths` wired in package.json (placed alphabetically in scripts block) exits 0 on the current tree.**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-04-27T02:16:30Z
- **Completed:** 2026-04-27T02:19:50Z
- **Tasks:** 2
- **Files touched:** 3 (1 created, 2 modified)

## Accomplishments

- **`tools/validate-doc-paths.js` created (NEW, 76 LOC).** Single canonical-purpose Node script; CommonJS; uses `node:fs` + `node:path` only; hard-coded `DOCS_ROOT = path.resolve(__dirname, '..', 'docs')`; recursive walker skips `_*`-prefixed entries (matches the analog `tools/validate-doc-links.js` convention); two FORBIDDEN_PATTERNS regex (word-boundary anchored to prevent false positives on `xgomad/...` etc.); two-entry ALLOWLIST Set (English + zh-cn `upgrade-recovery.md`).
- **`npm run validate:doc-paths` script entry added to `package.json`.** Single-line addition, alphabetically placed before `validate:kb-licenses`. No other field touched (version still `1.2.0`; `quality` script unchanged; `prepublishOnly` NOT added — both Plan 08 territory).
- **Verified clean run on current docs tree:** `OK: scanned 18 files; no legacy gomad/agents/ paths in shipped docs` — exit 0.
- **Induced-violation test:** appending `_gomad/gomad/agents/test.md` to `docs/tutorials/install.md` triggers exit 1 with both regex matching; `git checkout` rollback restores exit 0.
- **Allowlist exemption verified:** even though `docs/upgrade-recovery.md:19` legitimately contains `gomad/agents/pm.md` (v1.2 backup-tree example), the linter exits 0 because the file is allowlisted.
- **Lint clean** for the new file: `npx eslint tools/validate-doc-paths.js --max-warnings=0` exits 0.
- **Format clean** for both touched files: `npx prettier --check tools/validate-doc-paths.js package.json` exits 0.

## Task Commits

1. **Task 1: Create `tools/validate-doc-paths.js`** — `edb5b5d` (feat) — single-file commit, 76 LOC.
2. **Task 2: Wire `validate:doc-paths` npm script in `package.json`** — `de02431` (feat) — single-line addition.

**Auxiliary:** `76bf751` (docs: log pre-existing prettier issues in two unrelated files to deferred-items.md)

## Files Created/Modified

- **`tools/validate-doc-paths.js`** (NEW, 76 LOC) — negative-only DOCS-07 linter. Module-level `'use strict';`. JSDoc header explains scope (D-12), allowlist rationale, and exit-code contract (0=clean, 1=violation, 2=DOCS_ROOT missing). Walker is recursive, returns relative-to-base paths, skips `_*`-prefixed entries. `main()` builds a `failures[]` list across all files (NOT short-circuit — collects every match for richer diagnostics) then either logs `OK: scanned N files; no legacy gomad/agents/ paths in shipped docs` and exits 0, or logs each `FAIL: <file> contains forbidden pattern /<pattern>/` followed by `N failure(s) — fix offending files or add to ALLOWLIST if legitimate` and exits 1.
- **`package.json`** (+1 LOC) — added `"validate:doc-paths": "node tools/validate-doc-paths.js",` between `"test:tarball"` and `"validate:kb-licenses"` (alphabetic placement: `doc-paths` < `kb-licenses` < `refs` < `skills`). All other scripts, dependencies, devDependencies, version, files, etc. byte-for-byte unchanged.
- **`.planning/phases/12-agent-dir-relocation-release/deferred-items.md`** (+1 LOC) — log of pre-existing prettier issues in two unrelated files; verified present on base via `git stash && git checkout bff4ec3 -- package.json && npm run format:check` before plan 12-04 edits.

## Result of `npm run validate:doc-paths` against current tree

```
> @xgent-ai/gomad@1.2.0 validate:doc-paths
> node tools/validate-doc-paths.js

OK: scanned 18 files; no legacy gomad/agents/ paths in shipped docs
```

Exit 0. The 18 scanned files include all `docs/**/*.md(x)` after the walker's `_*`-prefix skip. The two allowlisted files (`upgrade-recovery.md` and `zh-cn/upgrade-recovery.md`) are skipped via the `ALLOWLIST.has(rel)` short-circuit before content read, so their legitimate `gomad/agents/pm.md` references on line 19 are not flagged.

## Decisions Made

- **Drop the shebang line (`#!/usr/bin/env node`)** — the project ESLint config (`eslint-plugin-n`) enforces the `n/hashbang` rule which fails any non-bin script that begins with a shebang. The analog `tools/validate-doc-links.js`, `tools/validate-file-refs.js`, `tools/validate-skills.js`, and `tools/validate-kb-licenses.js` all follow the no-shebang convention. The plan's stated acceptance criterion `head -1 tools/validate-doc-paths.js` outputs `#!/usr/bin/env node` is DEVIATED in service of the project's lint-must-pass invariant. Functional behavior unchanged: invocation form is `node tools/validate-doc-paths.js` (matches the package.json script entry exactly).
- **Allowlist key form: `path.join('zh-cn', 'upgrade-recovery.md')`** — yields `zh-cn/upgrade-recovery.md` on POSIX and `zh-cn\\upgrade-recovery.md` on Windows. The walker uses `path.relative(base, full)` which produces native-separator output, so the `ALLOWLIST.has(rel)` lookup works on both platforms without needing a normalize step.
- **Apply prettier --write to the new file post-creation** — prettier collapsed `FORBIDDEN_PATTERNS` from the multi-line array form (per RESEARCH §Code Examples Example 2) onto a single line, and similarly collapsed the `ALLOWLIST` Set constructor. Both are semantically equivalent. Result: clean lint + clean format simultaneously.
- **Hard ALLOWLIST is a Set, not an Array** — O(1) membership check (`unicorn/prefer-set-has` lint rule, project-wide). Behavior unchanged for the 2-element haystack but keeps lint green.
- **Pre-existing format failures are out-of-scope** — `npm run format:check` reports issues in 4 files (test/test-inject-reference-tables.js, tools/inject-reference-tables.cjs, tools/installer/core/cleanup-planner.js, tools/installer/core/installer.js). Verified on base bff4ec3 BEFORE plan 12-04 edits — all 4 pre-existed. Per Rule 3 scope boundary, plan 12-04 does NOT fix them. The two installer files were touched by Plans 12-01/02/03 but those plans logged the same scope-boundary decision in deferred-items.md.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Removed shebang line — `n/hashbang` lint rule prohibits shebangs in non-bin scripts**
- **Found during:** Task 1 (initial `npm run lint -- tools/validate-doc-paths.js` after creation)
- **Issue:** Plan acceptance criterion required `head -1` to output `#!/usr/bin/env node`. After creating the file with that shebang, `npx eslint tools/validate-doc-paths.js` failed with `error  This file needs no shebang  n/hashbang`. The script is not registered in `package.json` `bin` (and would not be — it's invoked via `npm run`/`node`). All sibling validators in `tools/validate-*.js` follow the no-shebang convention.
- **Fix:** Removed the shebang line. The file now starts with `'use strict';` on line 1.
- **Files modified:** tools/validate-doc-paths.js (single file, integrated into Task 1 commit `edb5b5d`).
- **Verification:** `npx eslint tools/validate-doc-paths.js --max-warnings=0` exits 0; `node tools/validate-doc-paths.js` invocation form is unchanged. The package.json script entry is `"node tools/validate-doc-paths.js"` (per Plan Task 2) which doesn't depend on the shebang.
- **Committed in:** `edb5b5d` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 3 — lint compliance / project convention). The plan's other ~12 acceptance criteria all PASS unchanged.

**Impact on plan:** Functional behavior identical. The shebang-related plan acceptance criterion (`head -1 == '#!/usr/bin/env node'`) is the only one not met, and it was inconsistent with the project's lint config and convention from the start. No scope creep.

## Issues Encountered

- **Pre-existing format failures in 4 unrelated files** — `test/test-inject-reference-tables.js`, `tools/inject-reference-tables.cjs`, `tools/installer/core/cleanup-planner.js`, `tools/installer/core/installer.js`. Verified pre-existing on base bff4ec3 before plan 12-04 edits via `git stash && git checkout bff4ec3 -- package.json && npm run format:check`. Out-of-scope per Rule 3 scope boundary; the two new ones (test/inject-reference-tables.cjs) logged in `.planning/phases/12-agent-dir-relocation-release/deferred-items.md` (commit `76bf751`); the two installer files were already logged by prior plans in this phase.
- **No new issues introduced by plan 12-04.** `npx eslint` and `npx prettier --check` on `tools/validate-doc-paths.js` and `package.json` (the two files plan 12-04 touched) both exit 0.

## Confirmations

- **Acceptance criteria** (from PLAN.md `<acceptance_criteria>`):
  - File exists: `test -f tools/validate-doc-paths.js` ✓
  - Shebang present: DEVIATED (Rule 3 — `n/hashbang` lint rule). File starts with `'use strict';` on line 1.
  - `'use strict';` directive present in line 1: ✓ (post-shebang-removal)
  - `grep -c "FORBIDDEN_PATTERNS"` ≥ 2: returns 2 ✓
  - `grep -c "ALLOWLIST"` ≥ 2: returns 3 ✓
  - `grep -c "upgrade-recovery.md"` ≥ 2: returns 3 ✓ (English + zh-cn allowlist + JSDoc reference)
  - `grep -E "^const .* = require"` count = 2: ✓ (only `node:fs` and `node:path`)
  - LOC < 100: 76 ✓
  - `node tools/validate-doc-paths.js` exits 0 on current tree: ✓
  - Induced-violation test causes exit 1: ✓ (verified, both regex match `_gomad/gomad/agents/test.md`)
  - Allowlisted file does not fail: ✓ (`docs/upgrade-recovery.md:19` contains `gomad/agents/pm.md`, exit 0 confirmed)
  - `npx eslint tools/validate-doc-paths.js --max-warnings=0` exits 0: ✓
  - `npx prettier --check tools/validate-doc-paths.js` exits 0: ✓
  - `node -e "console.log(JSON.parse(require('fs').readFileSync('package.json','utf8')).scripts['validate:doc-paths'])"` outputs exactly `node tools/validate-doc-paths.js`: ✓
  - `npm run validate:doc-paths` exits 0: ✓
  - Valid JSON: `node -e "JSON.parse(require('fs').readFileSync('package.json'))"` exits 0 ✓
  - `git diff bff4ec3 -- package.json | grep -E "^[+-][^+-]"` returns exactly 1 line (just the new script entry): ✓
  - Version field still `"version": "1.2.0"`: ✓
  - `quality` script unchanged: ✓
  - `prepublishOnly` not added: ✓
- **No file deletions in any commit:** `git diff --diff-filter=D --name-only HEAD~3 HEAD` returns empty.
- **Threat model coverage:**
  - **T-12-04-01** (false-positive on legitimate v1.2 reference): MITIGATED — hard-coded ALLOWLIST exempts both English + zh-cn `upgrade-recovery.md`; verified by induced-test pass.
  - **T-12-04-02** (catastrophic backtracking): ACCEPTED — FORBIDDEN_PATTERNS use bounded character classes `[a-z][a-z0-9-]*` with no nested quantifiers; runtime on the 18-file tree is sub-100ms.
  - **T-12-04-03** (exit code wrong on partial match): MITIGATED — exit code derived from `failures.length === 0`; tested in induced-violation acceptance.
  - **T-12-04-04** (linter scans installer source falsely): MITIGATED — DOCS_ROOT hard-coded to `path.resolve(__dirname, '..', 'docs')`; tools/installer/ is out of scope by construction.
- **No threat flags:** No new network endpoints, auth paths, file access patterns, or schema changes at trust boundaries.

## Notes for Downstream Plans

- **Plan 12-07 (DOCS-07 sweep + Phase 11 merge):** Re-run `npm run validate:doc-paths` after the Phase 11 docs branch merge — the linter is the post-merge check that the combined tree is still clean. If any new doc page (added in Phase 11 work-in-progress) leaks the legacy path, Plan 12-07's sweep adjusts the source content (NOT the allowlist). Allowlist additions are reserved for legitimate v1.2-era backup-example pages.
- **Plan 12-08 (release commit):** Wire `npm run validate:doc-paths` into the extended `quality` script alongside `validate:refs`, `validate:skills`, `validate:kb-licenses`. Plan 08 also wires `validate:doc-paths` into a `prepublishOnly` gate per RESEARCH for double-defense before `npm publish`.
- **Future maintainers:** When adding new docs that reference v1.2 backup trees as illustrative examples (rare), update the ALLOWLIST in `tools/validate-doc-paths.js` rather than weakening FORBIDDEN_PATTERNS. The allowlist is intentionally narrow.
- **No interaction with Plans 12-05, 12-06:** Plan 12-04 touches only `tools/` + `package.json` + `deferred-items.md`. Plans 12-05/12-06 modify tests under `test/` and (if AGENT-07 Phase C) installer source. Distinct file sets; merges cleanly.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- DOCS-07 quality gate is now runnable as `npm run validate:doc-paths`. Standalone form is complete; release-gate wiring is Plan 12-08's job.
- The current docs tree is verified clean against the new linter — Phase 11's authored content (12 EN+CN pages) was authored to v1.3 spec from the start, validating the negative-only assumption.
- Plan 12-08 can compose `validate:doc-paths` into the extended `quality` script with confidence the underlying invariant holds.

## Self-Check: PASSED

- File `tools/validate-doc-paths.js`: FOUND
- File `package.json` modified: FOUND (`grep "validate:doc-paths" package.json` returns the new script entry)
- File `.planning/phases/12-agent-dir-relocation-release/deferred-items.md` modified: FOUND
- Commit `edb5b5d` (Task 1): FOUND in `git log --oneline -5`
- Commit `de02431` (Task 2): FOUND in `git log --oneline -5`
- Commit `76bf751` (deferred-items log): FOUND in `git log --oneline -5`
- `node tools/validate-doc-paths.js` exits 0: VERIFIED
- `npm run validate:doc-paths` exits 0: VERIFIED
- Induced-violation test exits 1, rollback restores exit 0: VERIFIED
- `npx eslint tools/validate-doc-paths.js --max-warnings=0` exits 0: VERIFIED
- `npx prettier --check tools/validate-doc-paths.js package.json` exits 0: VERIFIED

---
*Phase: 12-agent-dir-relocation-release*
*Completed: 2026-04-27*
