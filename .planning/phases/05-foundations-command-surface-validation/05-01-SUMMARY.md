---
phase: 05-foundations-command-surface-validation
plan: 01
subsystem: testing
tags: [verification, command-surface, install-smoke, js-yaml, glob, commander, claude-code]

# Dependency graph
requires:
  - phase: 04-verification-release
    provides: >-
      v1.1 test harness conventions (test/test-e2e-install.js pack-and-install pattern,
      test/test-installation-components.js assert/runner frame) and npm-pack-based
      fixture workflow that this plan's install-smoke phase reuses verbatim.
provides:
  - Committed verification note proving /gsd:* subdirectory-namespace pattern works in-repo (CMD-05 empirical proof, D-01)
  - Automated CI guard (test/test-gm-command-surface.js) running three phases — in-repo self-check, negative-fixture self-test, install-smoke — against the live installer
  - Non-interactive install-smoke harness driving `gomad install --yes --directory <tempDir> --tools claude-code` in a tempDir fixture and asserting clean exit (D-02 install-smoke half, LIVE in Phase 5)
  - Conditional structural assertion on installer-produced `.claude/commands/gm/agent-*.md` that Phase 6 will flip into a hard assertion
  - npm script `test:gm-surface` registered for targeted invocation and future CI wiring
affects:
  - 06-installer-mechanics (Phase 6 MUST flip Phase C conditional into a hard assertion once agent-command-generator.js populates .claude/commands/gm/)
  - 07-manifest-cleanup (same test harness convention available for cleanup regression tests)
  - 09-release (quality gate will pick up test:gm-surface once Phase 6 makes the structural assertion load-bearing)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "CommonJS test harness reused verbatim from test/test-e2e-install.js (colors, assert helper, try/finally cleanup, exit-code pattern)"
    - "npm pack → mkdtempSync under os.tmpdir() → npm init -y → npm install tarball → invoke installed bin non-interactively"
    - "Phase 6 hardening hook: conditional assertion comment explicitly flags where the hard assertion goes once generator lands"
    - "Negative-fixture self-test with LOCAL pass/fail counter keeps the assertion logic itself honest without polluting the global tally"

key-files:
  created:
    - ".planning/phases/05-foundations-command-surface-validation/05-VERIFICATION.md"
    - "test/test-gm-command-surface.js"
  modified:
    - "package.json (added test:gm-surface script)"

key-decisions:
  - "Full commitment to /gm:agent-* single form per D-04 — no alternative namespace shape documented anywhere in the verification note"
  - "No Claude Code version floor pinned per D-03 — Claude Code updates essentially daily; if a regression breaks /gm:* for a real user, handle in a patch release"
  - "Install-smoke is LIVE in Phase 5 per user resolution of Blocker 2 (rejected Option 3: hand-synthesizing agent-*.md fixtures); structural assertion stays conditional until Phase 6 ships the generator"
  - "Negative-fixture self-test added so the assertion logic itself is validated on every run — prevents silent drift where the check passes only because it checks nothing"

patterns-established:
  - "Phase-note + Observable Truths table (frontmatter carries phase/verified/status/score/overrides_applied)"
  - "Three-phase test layout (A: in-repo self-check, B: negative-fixture self-test, C: install-smoke) — extensible for future contract tests"
  - "Conditional-then-hard assertion evolution: explicit code comment at the flip point documents the Phase N+1 strengthening contract"

requirements-completed: [CMD-05]

# Metrics
duration: 4min
completed: 2026-04-18
---

# Phase 5 Plan 01: Command-Surface Verification Summary

**Committed markdown note citing `.claude/commands/gsd/*.md` as live in-repo empirical proof of the subdirectory-namespace pattern, plus an automated three-phase test (in-repo self-check, negative-fixture self-test, non-interactive install-smoke) that locks the /gm:agent-* launcher contract into CI and strengthens as Phase 6 adds generator behavior.**

## Performance

- **Duration:** 4 min
- **Started:** 2026-04-18T10:06:40Z
- **Completed:** 2026-04-18T10:11:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- `.planning/phases/05-foundations-command-surface-validation/05-VERIFICATION.md` authored — cites `.claude/commands/gsd/add-phase.md` and `.claude/commands/gsd/plan-phase.md` frontmatter (`name: gsd:add-phase`, `name: gsd:plan-phase`) as empirical in-repo proof that the subdirectory-namespace pattern resolves as `/<ns>:<cmd>` on the team's current Claude Code. No CC-version pin; no alternative-namespace-shape contingency.
- `test/test-gm-command-surface.js` written in CommonJS using only existing deps (`fs-extra`, `js-yaml`, `glob`). Runs three phases:
  - **Phase A (in-repo self-check):** no-op in Phase 5 baseline with yellow INFO line; becomes load-bearing once Phase 6 populates `.claude/commands/gm/` in the dev tree (if ever).
  - **Phase B (negative-fixture self-test):** synthesizes two fixture stubs (`agent-pm.md` with correct frontmatter, `agent-broken.md` with `name: wrong:name`), runs the structural check against both with a LOCAL counter, and globally asserts `negPassed === 1 && negFailed === 1` — validating the assertion logic detects drift.
  - **Phase C (install-smoke):** packs the tarball via `npm pack`, installs it into a fresh `os.tmpdir()` fixture, invokes `gomad install --yes --directory <tempDir> --tools claude-code` non-interactively (verified exits 0 against current main), and conditionally asserts the structural layout on any installer-produced `.claude/commands/gm/agent-*.md`. The conditional is explicitly flagged in code comments as the Phase 6 flip point.
- `package.json` scripts block gained `"test:gm-surface": "node test/test-gm-command-surface.js"` — no new dependencies, no change to `"type"` (CommonJS runtime preserved per D-13).

## Task Commits

Each task was committed atomically:

1. **Task 1: Author 05-VERIFICATION.md** — `b387210` (docs)
2. **Task 2: Create test/test-gm-command-surface.js + register npm script** — `eaac349` (test)

## Files Created/Modified

- `.planning/phases/05-foundations-command-surface-validation/05-VERIFICATION.md` — Verification note citing gsd commands as live proof (47 lines, 4-column Observable Truths table, Scope Discipline section expressing D-03/D-04 without forbidden literals)
- `test/test-gm-command-surface.js` — Three-phase test (~275 lines; header comment documents Phase 6 hardening contract)
- `package.json` — Added `test:gm-surface` npm script entry

## Decisions Made

Plan executed as specified. The plan's `<action>` block was highly prescriptive (including the safe verbatim text for the verification note to avoid forbidden literals, and the exact three-phase structure for the test). No new decisions beyond what the plan already locked:

- Committed `/gm:agent-*` as single form (D-04)
- No CC-version floor (D-03)
- Both D-02 halves LIVE in Phase 5 (install-smoke + structural, with structural conditional on Phase 6 generator)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Repo-lint compliance on the new test file**

- **Found during:** Task 2 post-implementation verification (running `npx eslint test/test-gm-command-surface.js --max-warnings=0`)
- **Issue:** The plan's `<action>` prescribed lowercase hex in `\u26a0` and a negated `if (!fs.existsSync(gmDir))` condition. The repo's ESLint config (`eslint-plugin-unicorn`) rejects both: `unicorn/escape-case` requires uppercase hex, and `unicorn/no-negated-condition` rejects negated conditions. The analog file `test/test-e2e-install.js` passes lint cleanly — so lint enforcement is load-bearing for the test harness family.
- **Fix:** Changed `\u26a0` → `\u26A0` in both occurrences (Phase A and Phase C yellow-warning lines). Inverted the Phase A control flow to use a positive `if (gmDirExists)` branch with the yellow-warning log moved into the `else` branch, preserving identical runtime behavior.
- **Files modified:** `test/test-gm-command-surface.js`
- **Verification:** `npx eslint test/test-gm-command-surface.js --max-warnings=0` → exit 0. `node test/test-gm-command-surface.js` → exit 0 with the yellow warning still printing when the dir is absent (Phase 5 baseline).
- **Committed in:** `eaac349` (Task 2 commit)

**2. [Rule 2 - Missing Critical] Prettier formatting compliance**

- **Found during:** Task 2 post-implementation verification (`npx prettier --check`)
- **Issue:** Several lines exceeded the printWidth threshold from the repo's `prettier.config.mjs`. The file `test/test-e2e-install.js` passes `format:check` cleanly, so Prettier compliance is load-bearing for the test harness family.
- **Fix:** Ran `npx prettier --write test/test-gm-command-surface.js package.json` — pure whitespace/wrapping change; no logic altered.
- **Files modified:** `test/test-gm-command-surface.js`
- **Verification:** `npx prettier --check test/test-gm-command-surface.js package.json` → exit 0. `npx eslint` → still clean. `node test/test-gm-command-surface.js` → still exit 0, 7 passed / 0 failed.
- **Committed in:** `eaac349` (Task 2 commit, same changeset)

---

**Total deviations:** 2 auto-fixed (both Rule 2 — required for CI-quality compliance; the analog file `test-e2e-install.js` demonstrates lint + prettier enforcement is the established convention for this test family)
**Impact on plan:** No scope creep. Both fixes were mechanical (case and whitespace only) and preserve all plan-mandated behavior — including the yellow-warning diagnostic line when `.claude/commands/gm/` is absent.

## Issues Encountered

- **Preflight reality check.** Before writing the test, I ran `gomad install --yes --directory /tmp/... --tools claude-code` manually in a tempDir to confirm it actually exits 0 non-interactively in the current main state (it does, in ~10s wall-clock). This confirmed the install-smoke harness would not hang on an unexpected interactive prompt in Phase 5 baseline.
- **Fresh-install code path confirms non-interactive compatibility.** In `tools/installer/ui.js`, when no existing installation is detected in the temp dir: `options.directory` is used directly (line 40); `options.yes` picks default modules (line 338); `options.tools 'claude-code'` is consumed directly without prompting (per `promptToolSelection`); and custom-content prompting is gated behind `!options.yes` (line 408). No interactive path is reachable for our invocation.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

**Ready for Phase 6 (installer mechanics + generator).**

- CMD-05 verification artifact is live; `test:gm-surface` is a working CI gate.
- Phase 6 MUST:
  1. Ship `tools/installer/ide/shared/agent-command-generator.js` emitting `.claude/commands/gm/agent-*.md` stubs with the D-07 frontmatter contract (`name: gm:agent-<name>`, non-empty `description`).
  2. Edit `test/test-gm-command-surface.js` Phase C to convert the `if (fs.existsSync(installedGmDir))` conditional into an `assert(fs.existsSync(installedGmDir), '.claude/commands/gm/ present in installed output')` hard assertion so a missing directory fails the test.
  3. Consider wiring `test:gm-surface` into the composite `test` / `quality` scripts once the structural assertion is load-bearing.

**No blockers carried forward.** Plan 05-02 (gitignore + installer self-install guard) and Plan 05-03 (PROJECT.md factual corrections + Key Decisions row) are independent and run in the same Wave 1 as this plan per the ROADMAP wave layout.

## Threat Flags

None. All files created/modified operate inside existing trust boundaries (test fixture under `os.tmpdir()`, verification note content only cites public repo-relative paths, npm script entry is a literal command with no shell metacharacters).

## Self-Check: PASSED

**Created files verified:**

- `.planning/phases/05-foundations-command-surface-validation/05-VERIFICATION.md` → FOUND
- `test/test-gm-command-surface.js` → FOUND
- `package.json` (modified) → FOUND with `test:gm-surface` script

**Commits verified:**

- `b387210` docs(05-01): add Phase 5 command-surface verification note → FOUND
- `eaac349` test(05-01): add gm-command surface test + npm script → FOUND

**Test runtime verified:**

- `node test/test-gm-command-surface.js` → exit 0, 7 passed / 0 failed
- `npx eslint test/test-gm-command-surface.js --max-warnings=0` → exit 0
- `npx prettier --check test/test-gm-command-surface.js package.json` → exit 0

**Requirement closure:** CMD-05 closed (both D-02 halves live; Phase 6 strengthens the conditional structural assertion into a hard assertion per the handoff above).

---
*Phase: 05-foundations-command-surface-validation*
*Completed: 2026-04-18*
