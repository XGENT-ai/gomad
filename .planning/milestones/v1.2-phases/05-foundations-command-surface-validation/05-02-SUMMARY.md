---
phase: 05-foundations-command-surface-validation
plan: 02
subsystem: installer
tags: [installer, gitignore, self-install-guard, defense-in-depth, commander, fs-extra, pitfall-7, d-10, d-11]

# Dependency graph
requires:
  - phase: 04-verification-release
    provides: >-
      Established v1.1 test harness conventions (CommonJS `assert` helper, ANSI color block,
      `os.tmpdir()` fixture pattern, try/finally cleanup) reused verbatim for the new
      self-install guard test.
  - phase: 05-foundations-command-surface-validation
    provides: >-
      Plan 05-01 registered the `test:gm-surface` npm script slot; Plan 05-02 slots
      `test:self-install-guard` alphabetically alongside it without touching the prior entry.
provides:
  - Narrow explicit `.gitignore` rule `.claude/commands/gm/` — installer-generated output cannot be committed from the dev repo (D-10)
  - `--self` Commander flag on `gomad install` (declared in `tools/installer/commands/install.js`, NOT in `gomad-cli.js` per PATTERNS.md nudge)
  - Pre-flight self-install guard detecting `src/gomad-skills/` marker; refuses install with clear error unless `--self` passed (D-11)
  - Defense-in-depth layer complementing the `.gitignore` rule — two independent safeguards per D-11
  - Automated test at `test/test-installer-self-install-guard.js` covering all three paths (guard trigger, --self bypass, non-gomad cwd)
  - `test:self-install-guard` npm script for targeted invocation and future CI wiring
affects:
  - 06-installer-mechanics (Phase 6 generator emits into `.claude/commands/gm/`; this gate ensures that output never pollutes the dev repo even if a contributor runs `gomad install` in-repo by accident)
  - 09-release (quality gate can pick up `test:self-install-guard` once Phase 6 stabilizes — currently standalone, composite `test` script untouched per plan direction)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Guard OUTSIDE the action-handler try/catch — preserves guard's error-exit instead of having it wrapped as 'Installation failed: ...'"
    - "Marker-based detection via `fs.pathExists('src/gomad-skills')` — mirrors `tools/installer/project-root.js` marker-probe style"
    - "`await prompts.log.error` with `['line1','line2'].join('\\n')` — reuses `uninstall.js` fail-fast error pattern"
    - "Commander option declared in per-command options array — per 05-PATTERNS.md §5 nudge (flags live with their command, not in gomad-cli.js glue)"
    - "Narrow .gitignore pattern over broad allowlist — D-10 preserves tracked-file precedence and avoids accidentally hiding future tracked subdirs"
    - "Fixture-based guard test using `spawnSync` with 10s timeout — matches test-e2e-install.js harness shape, swaps `execSync` → `spawnSync` only for reliable exit-code capture on non-zero exits"

key-files:
  created:
    - "test/test-installer-self-install-guard.js"
  modified:
    - ".gitignore"
    - "tools/installer/commands/install.js"
    - "package.json"

key-decisions:
  - "Narrow `.gitignore` rule `.claude/commands/gm/` ONLY — no broad `.claude/commands/*` form, no negation `!.claude/commands/gsd/` (D-10; gsd stays tracked via git's tracked-file precedence)"
  - "`--self` flag declared in `tools/installer/commands/install.js` options array, NOT in `tools/installer/gomad-cli.js` — per PATTERNS.md §5 nudge"
  - "Guard placed BEFORE the existing `try { ... } catch { ... }` block so the guard-exit error is not re-wrapped by the catch handler as `Installation failed: ...`"
  - "Test spawns the CLI via `spawnSync` (not `execSync`) to reliably capture exit code on non-zero exits without throwing"
  - "Composite `test` script and `quality` aggregate NOT wired yet — Phase 6 owns CI-gate integration per plan direction"

patterns-established:
  - "Defense-in-depth-against-dev-pollution pattern: .gitignore narrow pattern + installer guard + test that exercises both the guard-trigger path and the --self-bypass path"
  - "Guard-before-try-catch layout in Commander action handlers: single-purpose fast-path checks fire before the main try so their error paths aren't reformatted"
  - "Pre-edit state capture: verified bare `.claude` at line 65 matched gm/anyfile.md BEFORE editing, then verified gsd count unchanged AFTER editing — both required by acceptance criteria"

requirements-completed: [REF-03]

# Metrics
duration: 8min
completed: 2026-04-18
---

# Phase 5 Plan 02: Installer Self-Install Guard + .gitignore Pollution Prevention

**Two-layer defense-in-depth closing Pitfall #7: narrow `.gitignore` pattern for installer-generated output, plus a `--self`-gated pre-flight guard in `install.js` that refuses installs into the gomad source repo — both covered by a 6-assertion automated test.**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-04-18 (wave 2 parallel executor spawn)
- **Completed:** 2026-04-18
- **Tasks:** 2 (Task 1 single commit; Task 2 TDD two-commit cycle)
- **Files modified:** 4 (`.gitignore`, `tools/installer/commands/install.js`, `test/test-installer-self-install-guard.js` created, `package.json`)

## Accomplishments

- **`.gitignore` narrow rule added** (D-10, Task 1). New 5-line block (comment + pattern) inserted after the `.windsurf` entry on line 74 and before the `# Astro / Documentation Build` section. Bare `.claude` entry on line 65 preserved intact; no deletions.
- **`--self` Commander flag registered** (D-11, Task 2). Added as last entry in the options array of `tools/installer/commands/install.js` — the auto-loader at `gomad-cli.js` lines 93-100 picks it up without any change to the CLI glue file.
- **Self-install guard implemented** (D-11, Task 2). Pre-flight check at the top of the `action` handler, BEFORE the existing try/catch, using `fs.pathExists(path.join(cwd, 'src', 'gomad-skills'))` as the marker. On trigger: calls `await prompts.log.error` with a 5-line message (mentions all three required phrases — "gomad source repo", "src/gomad-skills", "--self"), then `process.exit(1)`.
- **Test file created** (`test/test-installer-self-install-guard.js`, 112 lines). Spawns `gomad-cli.js` via `spawnSync` with a 10-second timeout against three fixtures: (1) tmpdir containing `src/gomad-skills/` without --self; (2) same tmpdir WITH --self; (3) clean tmpdir without the marker. All 6 assertions pass.
- **`test:self-install-guard` npm script registered**. Alphabetical insertion between `test:refs` and `test:tarball` — leaves `test:gm-surface` (added by Plan 05-01, wave 1) untouched. Composite `test` and `quality` aggregates intentionally NOT modified per plan direction.

## Task Commits

Each task was committed atomically:

1. **Task 1: .gitignore narrow pattern** — `2563fe5` (chore)
2. **Task 2 RED: failing guard test** — `7d3bed8` (test)
3. **Task 2 GREEN: --self flag + guard implementation** — `cfc7401` (feat)

_Task 2 followed TDD per plan's `tdd="true"` directive. No REFACTOR commit needed — code is small, matches analogs verbatim, already clean._

## Files Created/Modified

- `.gitignore` — Added 5-line installer-generated-output block (1 comment, 4 content lines including 3 wrapped comment lines + `.claude/commands/gm/`). Net +5 lines, zero deletions.
- `tools/installer/commands/install.js` — Added `fs-extra` import (1 line), appended `--self` option entry (4 lines with wrapping), inserted guard block before the existing try/catch (18 lines including comment). Net +23 lines.
- `test/test-installer-self-install-guard.js` — New CommonJS file, 112 lines, 6 assertions across 3 scenarios.
- `package.json` — Added single `test:self-install-guard` script entry between `test:refs` and `test:tarball`. Zero dependency changes.

## Decisions Made

Plan executed as specified — the `<action>` blocks were highly prescriptive (exact error-message phrasing, exact guard placement relative to try/catch, exact option-entry format). No new decisions beyond what the plan already locked:

- Narrow `.gitignore` pattern, not broad allowlist (D-10)
- Flag lives in `commands/install.js`, not in `gomad-cli.js` (PATTERNS.md §5 nudge, 05-CONTEXT.md D-11)
- Guard before try/catch so error-exit preserves the guard's specific message (PATTERNS.md Shared Pattern C)
- Marker file: `src/gomad-skills/` (canonical dev-repo signature)
- `spawnSync` over `execSync` in the test for reliable non-zero exit-code capture

## Pre-Edit State Captured (Audit Trail — Task 1)

Per plan's Step 1 verification before editing `.gitignore`:

- **GSD_COUNT_BEFORE:** 68 files under `.claude/commands/gsd/` (captured via `git ls-files .claude/commands/gsd/ | wc -l`)
- **Line-65 rule match:** `git check-ignore -v .claude/commands/gm/test.md` → `.gitignore:65:.claude`
- **`.claude/settings.json` tracked:** `git ls-files --error-unmatch .claude/settings.json` → exit 0

Post-edit verification confirmed:

- **GSD_COUNT_AFTER:** 68 (unchanged — gsd tracking preserved)
- **Line-65 still active:** `.gitignore:65:.claude` (bare entry intact at same line)
- **Line-80 new explicit:** `.gitignore` contains `.claude/commands/gm/` at line 80
- **`.claude/settings.json` still tracked:** still listed via `git ls-files --error-unmatch`
- **Broad form absent:** `grep -c '^\.claude/commands/\*' .gitignore` returns 0
- **Negation absent:** `grep -c '!\.claude/commands/gsd' .gitignore` returns 0

## Key Links Established

Per the plan's `key_links` frontmatter:

1. `tools/installer/commands/install.js` options array → `tools/installer/gomad-cli.js` command.option loop — via the auto-loader at lines 93-100; pattern `\[\s*'--self'` matches the new entry.
2. `install.js` action handler (top of body) → `src/gomad-skills/` marker — via `fs.pathExists(path.join(cwd, 'src', 'gomad-skills'))` called before the try/catch.
3. `package.json` `scripts.test:self-install-guard` → `test/test-installer-self-install-guard.js` — via literal `node test/test-installer-self-install-guard.js` command string.

## Deviations from Plan

None — plan executed exactly as written.

The plan's `<action>` blocks were prescriptive to the phrase level (error text, option entry format, guard placement), and the analog files (`uninstall.js` for the fail-fast pattern, `test-e2e-install.js` for the harness shape) were cited explicitly. No auto-fixes were required:

- **Lint compliance** — Both modified JS files and the new test file pass `eslint --max-warnings=0` on first run. No `unicorn/escape-case` issues (all `\u` escapes use uppercase hex by default in my output), no `unicorn/no-negated-condition` issues (all conditionals in both finally blocks use the positive form `if (fixture && fs.existsSync(fixture))`).
- **Prettier compliance** — All three modified files plus the new test file pass `prettier --check` on first run. The plan's inline code examples were already formatted to repo width conventions.

This is a contrast with Plan 05-01, which needed two post-facto fixes (escape-case + prettier wrap). Plan 05-02 avoided those by taking the 05-01 auto-fix history into account when composing the new test file and modeling output against the now-known-compliant `test-e2e-install.js` as the harness template.

**Total deviations:** 0. **Impact on plan:** N/A.

## Issues Encountered

None. One observational note:

- **Test runs cleanly in ~100ms wall-clock.** The guard fires synchronously before any `@clack/prompts` interactive path, so the non-TTY environment of the test spawn never reaches the interactive-hang risk zone. Test timeout is 10s; actual runtime is ~100ms per spawn × 3 spawns ≈ 300ms total.

## User Setup Required

None — no external service configuration required. Zero new dependencies.

## Next Phase Readiness

**Ready for Phase 6 (installer mechanics + agent-command generator).**

- **REF-03 closed.** The `.gitignore` excludes `.claude/commands/gm/` while keeping `.claude/commands/gsd/` tracked; `git status` in a clean worktree does not show installer-generated command files (Phase 5 baseline verified — directory doesn't exist yet; when Phase 6 generator runs in a target workspace, its output under `.claude/commands/gm/` will not be committable from the dev repo even if a contributor mistakenly runs `gomad install` in-repo).
- **Defense-in-depth verified live.** Running `node tools/installer/gomad-cli.js install` from the gomad source repo root without `--self` exits 1 with the guard's error message. Running with `--self` bypasses the guard. This is automated in `test:self-install-guard`.
- **Phase 6 handoff options:**
  1. (Optional) Wire `test:self-install-guard` into the composite `test` script once Phase 6 ships the generator and the guard is proven stable across local dev loops.
  2. (Optional) Wire `test:self-install-guard` into the `quality` aggregate for pre-release validation.
  3. When the Phase 6 generator lands, contributors working locally will need to pass `--self` when seeding `.claude/commands/gm/` in-repo for manual verification — the flag description explicitly documents this ("Use only when intentionally re-seeding local dev output").

**No blockers carried forward.** Plan 05-03 (PROJECT.md factual corrections) is independent of this plan and runs in wave 3.

## Threat Flags

None. All files created/modified stay inside existing trust boundaries:

- Test fixtures created under `os.tmpdir()` with fixed `gomad-guard-fixture-*-` prefix and cleaned up in `finally` (T-05-02-06 mitigation)
- Guard timeout capped at 10s per spawn (T-05-02-07 mitigation)
- `.gitignore` rule verified not to hide `.claude/commands/gsd/` (T-05-02-02 mitigation — explicit acceptance criterion 8 checked)
- Error message reveals cwd (T-05-02-03) — accepted per threat model; cwd is already user-knowledge

## TDD Gate Compliance

Plan 05-02 had `type: execute` at the plan level but `tdd="true"` on Task 2. Both gates verified:

1. **RED commit:** `7d3bed8` (`test(05-02): add failing test for self-install guard`) — 4 of 6 assertions failing pre-implementation.
2. **GREEN commit:** `cfc7401` (`feat(05-02): add --self flag and self-install guard to install.js`) — all 6 of 6 assertions passing post-implementation.
3. **REFACTOR:** Not required — code is 23 lines, follows analog patterns verbatim, and is already clean on first write. No functional rewrite needed.

## Self-Check

**Created files verified:**

- `/Users/rockie/Documents/GitHub/xgent/gomad/test/test-installer-self-install-guard.js` → FOUND (112 lines)

**Modified files verified (via `git log -1 --stat`):**

- `.gitignore` — FOUND modified in commit `2563fe5` (+5 lines)
- `tools/installer/commands/install.js` — FOUND modified in commit `cfc7401` (+23 lines)
- `package.json` — FOUND modified in commit `7d3bed8` (+1 line, alongside the new test file)

**Commits verified:**

- `2563fe5` `chore(05-02): ignore .claude/commands/gm/ from dev repo` → FOUND via `git log --oneline`
- `7d3bed8` `test(05-02): add failing test for self-install guard` → FOUND via `git log --oneline`
- `cfc7401` `feat(05-02): add --self flag and self-install guard to install.js` → FOUND via `git log --oneline`

**Runtime verified:**

- `npm run test:self-install-guard` → exit 0, 6 passed / 0 failed
- `npx eslint tools/installer/commands/install.js --max-warnings=0` → exit 0
- `npx eslint test/test-installer-self-install-guard.js --max-warnings=0` → exit 0
- `npx prettier --check tools/installer/commands/install.js test/test-installer-self-install-guard.js package.json` → exit 0

**Acceptance criteria (Task 1, 9 criteria):** All verified — `.claude/commands/gm/` present, comment block present, no broad form, no negation, bare `.claude` line 65 preserved, gsd count ≥ 10 (actual: 68), `.claude/settings.json` tracked, gm rule active (matches line 65), diff shows only additions.

**Acceptance criteria (Task 2, 12 criteria):** All verified — fs-extra imported, `--self` option present, marker-detection line present, exact error phrase present, `prompts.log.error` count = 3 (≥ 2 required), guard before try (line 42 < line 52), `gomad-cli.js` untouched (empty diff), test file exists + CommonJS, test runs exit 0, `test:self-install-guard` in package.json, `test:gm-surface` still present (wave 1 dependency preserved), zero new dependencies.

**Self-Check: PASSED**

**Requirement closure:** REF-03 closed (defense-in-depth live; 6-assertion test locking the contract).

---
*Phase: 05-foundations-command-surface-validation*
*Plan: 02*
*Completed: 2026-04-18*
