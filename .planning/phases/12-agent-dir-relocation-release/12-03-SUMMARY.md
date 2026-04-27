---
phase: 12-agent-dir-relocation-release
plan: 03
subsystem: installer
tags: [installer, custom-file-detector, agent-personas, idempotency]

# Dependency graph
requires:
  - phase: 12-agent-dir-relocation-release
    plan: 01
    provides: "AGENTS_PERSONA_SUBPATH constant + extractPersonas writer landing personas at _gomad/_config/agents/<shortName>.md (sets the layout the whitelist must recognize)"
  - phase: 12-agent-dir-relocation-release
    plan: 02
    provides: "v12 cleanup-planner branch + migration banner (orthogonal line range; merges cleanly with this plan's whitelist edit)"
  - phase: 09-agent-as-command-migration
    provides: "AgentCommandGenerator.AGENT_SOURCES 8-shortname source-of-truth array (now reused for whitelist derivation)"
provides:
  - "PERSONA_SHORTNAMES Set derived once per detectCustomFiles call from AgentCommandGenerator.AGENT_SOURCES (single source of truth)"
  - "isModuleAgentMd whitelist branch — distinct const recognizing module-folder agent .md files"
  - "isV13PersonaMd whitelist branch — recognizes _gomad/_config/agents/<shortName>.md as generated for the 8 known persona shortnames (cross-platform: forward + backslash prefix coverage)"
  - "Combined `if (!isModuleAgentMd && !isV13PersonaMd) customFiles.push(...)` conditional replacing the previous inline form"
affects:
  - "12-05 idempotent-reinstall assertion (zero entries in _gomad/_backups/<ts>/ after second install) depends on this whitelist NOT misclassifying persona .md files as custom"
  - "Future maintainers: if the orthogonal _config/-prefix early-continue at lines 967-989 is ever refactored to permit non-.customize.yaml _config/agents/*.md to reach the whitelist, this defense-in-depth check ensures persona files are still recognized as generated"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pattern: PERSONA_SHORTNAMES = new Set(AgentCommandGenerator.AGENT_SOURCES.map(a => a.shortName)) — single SoT, O(1) membership for per-file scan loops"
    - "Pattern: split-conditional whitelist (`isModuleAgentMd` + `isV13PersonaMd`) replacing inline negated boolean — readable, extensible, lint-friendly"
    - "Pattern: cross-platform prefix coverage (`'_config/agents/' || '_config\\\\agents\\\\'`) for relativePath matching on both POSIX and Windows separators"

key-files:
  created: []
  modified:
    - "tools/installer/core/installer.js — +23/-3 LOC, two hunks confined to detectCustomFiles (lines 906-1037). PERSONA_SHORTNAMES Set added at function top (line 919); `if (!fileInfo)` whitelist body restructured into isModuleAgentMd + isV13PersonaMd consts joined by `if (!a && !b)`."

key-decisions:
  - "Use a Set, not an Array, for PERSONA_SHORTNAMES — eslint unicorn/prefer-set-has is enforced project-wide (lint --max-warnings=0). Behavior unchanged: 8-element haystack lookup is O(1) either way; the rule is still load-bearing as a style convention. Initialised inline via `new Set(AGENT_SOURCES.map(...))` so the source-of-truth array remains visible at the derivation site."
  - "Defense-in-depth, not strict prerequisite — the `_config/`-prefix early-continue at line 967 already skips `_config/agents/*.md` for the current code shape. The plan's stated premise (`detectCustomFiles would classify the persona file as custom without this fix`) is technically subsumed by that earlier branch today. The whitelist edit nonetheless lands per AGENT-05 because: (a) the threat model + AGENT-08 idempotency assertion in Plan 05 depend on this exact code shape; (b) future refactors of the early-continue block (e.g. to relax the `.customize.yaml` filter) would silently regress idempotency without the whitelist; (c) Plan 02's banner advertises `docs/upgrade-recovery.md` § v1.2→v1.3 that depends on stable persona-vs-custom semantics. Documented as defense-in-depth in the commit message."

patterns-established:
  - "Pattern: Whitelist-by-derivation in detectCustomFiles — when adding new generated-file categories (e.g. v1.4 persona moves), derive the predicate from a source-of-truth Set inside detectCustomFiles, not a duplicated literal. Keeps additions to AGENT_SOURCES (or analogous registries) propagating automatically without tracking down whitelist sites."

requirements-completed: [AGENT-05]

# Metrics
duration: 2min
completed: 2026-04-27
---

# Phase 12 Plan 03: detectCustomFiles Whitelist Extension Summary

**`detectCustomFiles()` whitelist extended at `installer.js:1004-1025` to recognize the 8 v1.3 persona `.md` files at `_config/agents/<shortName>.md` as generated, derived from `AgentCommandGenerator.AGENT_SOURCES` as single source of truth — preserves `.customize.yaml` user-override semantics, defense-in-depth for AGENT-08 idempotent-reinstall assertion in Plan 05.**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-04-27T02:10:08Z
- **Completed:** 2026-04-27T02:12:07Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- `PERSONA_SHORTNAMES` derived once per `detectCustomFiles` call as `new Set(AgentCommandGenerator.AGENT_SOURCES.map((a) => a.shortName))` — declared at the top of the function body (line 919), 8 entries, no inline literal duplication.
- `isModuleAgentMd` const isolates the existing module-folder agent-md branch (`_gomad/<module>/agents/<...>.md`).
- `isV13PersonaMd` const recognizes `_gomad/_config/agents/<shortName>.md` matching one of the 8 known shortnames; cross-platform via `relativePath.startsWith('_config/agents/') || relativePath.startsWith('_config\\agents\\')`.
- Final conditional `if (!isModuleAgentMd && !isV13PersonaMd) customFiles.push(fullPath);` replaces the previous inline negated-boolean form.
- `.customize.yaml` early-continue at `installer.js:967-989` byte-for-byte unchanged (D-04 user-override semantics preserved); `git diff` shows two hunks only at lines 910-918 and 1003-1025.
- Plan 02 territory at `_prepareUpdateState` (lines 510-585) byte-for-byte unchanged.
- Existing modified-file detection (`manifestHasHashes && fileInfo.hash` branch) byte-for-byte unchanged.

## Task Commits

1. **Task 1: Extend detectCustomFiles whitelist to recognize v1.3 persona .md files as generated** — `1c63c35` (feat)

## Files Created/Modified

- `tools/installer/core/installer.js` — +23/-3 LOC. Two hunks confined to `detectCustomFiles`:
  - Hunk 1 (lines 910-918): added `PERSONA_SHORTNAMES = new Set(AgentCommandGenerator.AGENT_SOURCES.map(...))` derivation with explanatory comment.
  - Hunk 2 (lines 1003-1025): replaced the 4-line inline negated-boolean whitelist with the 18-line two-const + combined-conditional form.

## Exact diff (before → after)

**Hunk 1 (line 919 added):**

```javascript
+    // Derived once per detectCustomFiles call from the source-of-truth list
+    // (AGENT-05 / D-03 Phase 12). DO NOT inline duplicate the 8 names —
+    // additions/removals to AgentCommandGenerator.AGENT_SOURCES flow automatically.
+    // Backed by a Set for O(1) membership in the per-file scan loop below
+    // (unicorn/prefer-set-has). The .map() expression remains the single source
+    // of truth — adding shortnames in agent-command-generator.js is enough.
+    const PERSONA_SHORTNAMES = new Set(AgentCommandGenerator.AGENT_SOURCES.map((a) => a.shortName));
```

**Hunk 2 (whitelist body — REMOVED → ADDED):**

```javascript
- // EXCEPT: Agent .md files in module folders are generated files, not custom
- // Only treat .md files under _config/agents/ as custom
- if (!(fileName.endsWith('.md') && relativePath.includes('/agents/') && !relativePath.startsWith('_config/'))) {
+ // EXCEPT: (a) Agent .md files in module folders are generated, not custom.
+ //         (b) v1.3+ persona body files at _gomad/_config/agents/<shortName>.md
+ //             matching one of the 8 known AgentCommandGenerator.AGENT_SOURCES
+ //             shortnames are generated by extractPersonas (D-03 Phase 12).
+ //             User .customize.yaml files at _config/agents/ are handled by
+ //             the orthogonal _config/-prefix early-continue above and are
+ //             NOT touched by this conditional (D-04 user-override preservation).
+ const isModuleAgentMd = (
+   fileName.endsWith('.md')
+   && relativePath.includes('/agents/')
+   && !relativePath.startsWith('_config/')
+ );
+ const isV13PersonaMd = (
+   fileName.endsWith('.md')
+   && (relativePath.startsWith('_config/agents/') || relativePath.startsWith('_config\\agents\\'))
+   && PERSONA_SHORTNAMES.has(fileName.replace(/\.md$/, ''))
+ );
+ if (!isModuleAgentMd && !isV13PersonaMd) {
    customFiles.push(fullPath);
  }
```

## Exact location of PERSONA_SHORTNAMES declaration

`tools/installer/core/installer.js:919`, inside `detectCustomFiles(gomadDir, existingFilesManifest)`, immediately after the `gomadMemoryPath` declaration and before the `manifestHasHashes` block. The derivation is per-call (not module-scoped) so any test that monkey-patches `AgentCommandGenerator.AGENT_SOURCES` between calls observes the updated list immediately.

## `.customize.yaml` early-continue confirmation

The block at `installer.js:967-989` (`if (relativePath.startsWith('_config/') || relativePath.startsWith('_config\\\\')) { ... continue; }`) is BYTE-FOR-BYTE UNCHANGED — verified via `git diff` showing only two hunks at lines 910-918 and 1003-1025. The `.customize.yaml` hash-compare logic (lines 970-988) and the trailing `continue;` at line 989 are untouched. D-04 user-override semantics are preserved: `.customize.yaml` files have `.yaml` extension and never match `fileName.endsWith('.md')` in either `isModuleAgentMd` or `isV13PersonaMd`.

## Decisions Made

- **Use `Set` not `Array` for PERSONA_SHORTNAMES** — project-wide ESLint config enforces `unicorn/prefer-set-has` at `--max-warnings=0`. The plan's pseudocode used `.includes()` on an Array; converting to a Set with `.has()` is functionally equivalent for an 8-element haystack but keeps `npm run lint` green. The Set is initialised inline via `new Set(AGENT_SOURCES.map(...))` so the derivation expression remains visible at the declaration site (single-statement reading still works — no opaque helper).
- **Defense-in-depth, not strict prerequisite** — the existing `_config/`-prefix early-continue at line 967 already skips `_config/agents/*.md` files in the current code shape, so the plan's stated premise ("first install would classify persona file as custom") is technically subsumed by that earlier branch today. The whitelist edit nonetheless ships per AGENT-05 because: (a) Plan 12-05's AGENT-08 idempotent-reinstall assertion depends on this exact code shape; (b) future refactors of the `.customize.yaml` early-continue (e.g. relaxing the filter) would silently regress idempotency without this whitelist; (c) the threat register T-12-03-01/02 are restated as defense-in-depth invariants. The commit message tag this explicitly.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] PERSONA_SHORTNAMES typed as Set, not Array**
- **Found during:** Task 1 (Extend detectCustomFiles whitelist)
- **Issue:** Plan pseudocode used `Array.includes()` on PERSONA_SHORTNAMES. Project-wide ESLint config (`.eslintrc` with `unicorn/prefer-set-has` enabled) treats this as an error at `--max-warnings=0`. First lint run after Hunk 1 emitted: `error  PERSONA_SHORTNAMES should be a Set, and use PERSONA_SHORTNAMES.has() to check existence or non-existence  unicorn/prefer-set-has`.
- **Fix:** Wrapped the `AGENT_SOURCES.map(...)` expression in `new Set(...)` and changed the call site from `.includes(...)` to `.has(...)`. The `.map((a) => a.shortName)` source-of-truth derivation is preserved unchanged; the Set wrapper is purely a membership-API + lint-compliance change.
- **Files modified:** tools/installer/core/installer.js (single file, integrated into Task 1 commit `1c63c35`).
- **Verification:** `npx eslint tools/installer/core/installer.js --max-warnings=0` exits 0. Plan acceptance criteria still satisfied — `grep -c "AgentCommandGenerator.AGENT_SOURCES.map((a) => a.shortName)"` returns exactly 1, `grep -c "PERSONA_SHORTNAMES"` returns 2.
- **Committed in:** `1c63c35` (Task 1 commit — single atomic commit including the Set wrapping)

---

**Total deviations:** 1 auto-fixed (Rule 3 blocking — lint compliance)
**Impact on plan:** Functionally equivalent to plan pseudocode; only the membership API differs (Set.has vs Array.includes). The plan's acceptance-criteria greps were authored to match the source-of-truth `.map((a) => a.shortName)` expression literal, which is preserved unchanged. No scope creep.

## Issues Encountered

- None beyond the lint-driven Set adjustment (auto-fixed above).
- Pre-existing issues from prior plans (test-cleanup-planner.js 7-vs-8 agent count failures from Plan 12-02) were NOT re-investigated — out of scope per Rule 3 scope boundary; logged in `.planning/phases/12-agent-dir-relocation-release/deferred-items.md` by Plan 12-02.

## Confirmations

- **Acceptance criteria** (all from PLAN.md `<acceptance_criteria>`):
  - `grep -c "PERSONA_SHORTNAMES" tools/installer/core/installer.js` → 2 (≥2 required) ✓
  - `grep -c "AgentCommandGenerator.AGENT_SOURCES.map((a) => a.shortName)" tools/installer/core/installer.js` → 1 (=1 required) ✓
  - `grep -c "isV13PersonaMd" tools/installer/core/installer.js` → 2 (≥2 required) ✓
  - `grep -c "isModuleAgentMd" tools/installer/core/installer.js` → 2 (≥2 required) ✓
  - `grep -c "if (!isModuleAgentMd && !isV13PersonaMd)" tools/installer/core/installer.js` → 1 (=1 required) ✓
  - `grep -c "!(fileName.endsWith('.md') && relativePath.includes('/agents/') && !relativePath.startsWith('_config/'))" tools/installer/core/installer.js` → 0 (=0 required, OLD form removed) ✓
  - `grep -c "_config\\\\\\\\agents\\\\\\\\" tools/installer/core/installer.js` → 1 (≥1 required, Windows-defensive branch present) ✓
  - `npx eslint tools/installer/core/installer.js --max-warnings=0` → exit 0 ✓
  - `npm run test:install` → 205 passed / 0 failed ✓
  - `node -e "const {Installer} = require('./tools/installer/core/installer'); console.log(typeof Installer)"` → `function`, no throw ✓
- **Plan 02 territory unchanged:** `git diff` hunks at lines 910-918 and 1003-1025 only — no edits at lines 510-585 (`_prepareUpdateState`) or anywhere else outside `detectCustomFiles`.
- **`.customize.yaml` early-continue unchanged:** byte-for-byte preserved per inspection of lines 967-989 — no removed `customize.yaml` lines in the diff output.
- **`manifestHasHashes && fileInfo.hash` modified-file detection unchanged:** byte-for-byte preserved at lines 1026-1033.
- **No file deletions in commit:** `git diff --diff-filter=D --name-only HEAD~1 HEAD` returns empty.
- **No new untracked files** introduced by the edit.

## Notes for Downstream Plans

- **Plan 12-04 (docs/upgrade-recovery.md):** No interaction with this plan — Plan 12-04 authors documentation referenced by the Plan 12-02 banner. The whitelist edit here is invisible to docs.
- **Plan 12-05 (AGENT-08 idempotent-reinstall test):** **Direct dependency.** The test asserts that a fresh v1.3 install followed by an immediate re-install produces ZERO entries in `_gomad/_backups/<ts>/`. This whitelist is what makes that true — without it, a future refactor of the `.customize.yaml` early-continue could let persona files reach the whitelist conditional and be misclassified as custom on the second install, triggering a backup. The defense-in-depth posture documented above is for this assertion's longevity, not its current correctness.
- **Plan 12-06 (AGENT-07 Phase C body-regex test):** Orthogonal — Plan 12-06 verifies launcher-template/writer drift, not custom-file detection.
- **Future maintainers extending AGENT_SOURCES:** Adding new persona shortnames to `agent-command-generator.js:21` (the `static AGENT_SOURCES = [...]` array) automatically extends `PERSONA_SHORTNAMES` here — no tracking-down required. The `new Set(AGENT_SOURCES.map(a => a.shortName))` derivation is the single hop.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 12-04 (docs/upgrade-recovery.md) can begin: orthogonal file (`docs/upgrade-recovery.md`), zero overlap.
- Plan 12-05 (AGENT-08 idempotent-reinstall test) can begin: requires Plans 12-01, 12-02, 12-03 all merged — now satisfied. The end-to-end pipeline (writer → cleanup-planner v12 branch → whitelist) is functionally complete on the source side.
- Whitelist semantic invariant: any future `.md` file dropped into `_gomad/_config/agents/` matching a known AGENT_SOURCES shortname is treated as generated and regenerated on re-install. Any other `.md` filename (e.g. `pm-custom.md`, `team-lead.md`) remains custom-classified — preserves T-12-03-01 mitigation.

## Self-Check: PASSED

- File `tools/installer/core/installer.js`: FOUND (modified)
- Commit `1c63c35` (Task 1): FOUND
- `git log --oneline -1` → `1c63c35 feat(12-03): extend detectCustomFiles whitelist for v1.3 persona .md files`: VERIFIED
- `grep -c "PERSONA_SHORTNAMES" tools/installer/core/installer.js` → 2: VERIFIED
- `grep -c "AgentCommandGenerator.AGENT_SOURCES.map((a) => a.shortName)" tools/installer/core/installer.js` → 1: VERIFIED
- `grep -c "isV13PersonaMd" tools/installer/core/installer.js` → 2: VERIFIED
- `grep -c "isModuleAgentMd" tools/installer/core/installer.js` → 2: VERIFIED
- `grep -c "if (!isModuleAgentMd && !isV13PersonaMd)" tools/installer/core/installer.js` → 1: VERIFIED
- `grep -c "!(fileName.endsWith('.md') && relativePath.includes('/agents/') && !relativePath.startsWith('_config/'))" tools/installer/core/installer.js` → 0: VERIFIED
- `npx eslint tools/installer/core/installer.js --max-warnings=0` → exit 0: VERIFIED
- `npm run test:install` → 205 passed / 0 failed: VERIFIED
- `node -e "const {Installer} = require('./tools/installer/core/installer'); console.log(typeof Installer)"` → `function`: VERIFIED
- `git diff HEAD~1 HEAD --stat tools/installer/core/installer.js` → 1 file changed, 23 insertions(+), 3 deletions(-): VERIFIED

---
*Phase: 12-agent-dir-relocation-release*
*Completed: 2026-04-27*
