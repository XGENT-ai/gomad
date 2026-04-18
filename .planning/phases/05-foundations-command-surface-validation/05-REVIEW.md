---
phase: 05-foundations-command-surface-validation
reviewed: 2026-04-18T00:00:00Z
depth: standard
files_reviewed: 5
files_reviewed_list:
  - .gitignore
  - package.json
  - test/test-gm-command-surface.js
  - test/test-installer-self-install-guard.js
  - tools/installer/commands/install.js
findings:
  critical: 0
  warning: 2
  info: 5
  total: 7
status: issues_found
---

# Phase 5: Code Review Report

**Reviewed:** 2026-04-18
**Depth:** standard
**Files Reviewed:** 5
**Status:** issues_found

## Summary

Phase 5 ships three defense-in-depth artifacts for milestone v1.2: a narrow
`.gitignore` entry for installer-generated output, a pre-flight self-install
guard in `tools/installer/commands/install.js` with an accompanying
`--self` bypass flag, and two new test harnesses (`test:gm-surface`,
`test:self-install-guard`). The change set is small, disciplined, and
internally consistent: the guard is placed correctly outside the
`try/catch` wrapper so its exit is not reformatted as a generic
"Installation failed" message, CommonJS conventions match the surrounding
codebase, and the tests cover the three meaningful paths (guard trigger,
`--self` bypass, non-gomad cwd).

The review found **no CRITICAL issues** and **no security vulnerabilities**.
The guard is correctly positioned and uses the existing `fs-extra` async
convention. Two WARNING findings concern portability and ordering details
that could cause false positives/negatives in edge cases; five INFO
findings note minor consistency and hardening opportunities.

## Warnings

### WR-01: Guard message regex is Windows-fragile in install-smoke test

**File:** `test/test-gm-command-surface.js:198-211`
**Issue:** Phase C of the install-smoke test runs `gomad install` from a
tempDir that does *not* contain `src/gomad-skills/`, so the guard cannot
trip — this is correct. However, the guard uses `path.join(cwd, 'src',
'gomad-skills')` in `install.js:38`, which on Windows resolves with
backslashes (`C:\\...\\src\\gomad-skills`). The guard logic itself is
platform-safe (it's a `fs.pathExists` check, not a string match), but the
*test* in `test-installer-self-install-guard.js:80` asserts
`/src\/gomad-skills/.test(combined1)` with a forward-slash literal. That
regex matches the literal error-message string (which is hardcoded with
`/`), so it passes on Windows — but only because the error message happens
not to interpolate the joined path. If a future refactor changes the
message to print the joined path (e.g. `Detected ${markerPath} in ...`),
the Windows build would silently fail this assertion. Add a comment or use
a platform-agnostic pattern now to prevent regression.

**Fix:**
```javascript
// In test/test-installer-self-install-guard.js near line 80:
// Note: this regex matches the HARDCODED literal 'src/gomad-skills/' in the
// error message, not path.join output. If the message is ever refactored to
// interpolate a path.join(...) result, switch to /src[\\\/]gomad-skills/.
assert(/src\/gomad-skills/.test(combined1), 'Error message mentions "src/gomad-skills" marker', `Output: ${combined1}`);
```

Alternatively, proactively broaden the regex to `/src[\\\/]gomad-skills/`
so future refactors don't silently break.

### WR-02: `test:self-install-guard` assertions depend on guard firing *before* commander parses unknown flags

**File:** `test/test-installer-self-install-guard.js:86-92`
**Issue:** Test 2 runs `node cliPath install --self` and asserts the guard
error message is *not* present. This works today because `--self` is now
registered as a commander option in `install.js:29-31`. However, the test
does not verify that commander accepted the flag (vs. erroring with an
"unknown option" message). If someone later removes the option declaration
but leaves the guard, Test 2 would still pass — commander's own error
message also does not contain "Refusing to install into the gomad source
repo itself", so the negative assertion would give a false green.

**Fix:** Add a positive assertion that commander parsed `--self` cleanly —
either check exit code is non-1 (guard would exit 1), or assert the output
does not contain "unknown option":
```javascript
// In test/test-installer-self-install-guard.js after line 92:
assert(
  !/unknown option.*--self/i.test(combined2),
  '--self is a recognized Commander option (not rejected as unknown)',
  `Output: ${combined2}`,
);
```

## Info

### IN-01: `ensureDirSync` placeholder fixture path may drift from runtime convention

**File:** `test/test-installer-self-install-guard.js:66`
**Issue:** The fixture creates `src/gomad-skills/1-analysis/gm-agent-analyst`
as a "realistic" placeholder. This is purely for flavor — the guard only
checks `src/gomad-skills/` existence. The comment on line 65 calls it a
"placeholder agent dir so it looks realistic", which is fine, but the
numbered prefix `1-analysis` couples the fixture to a specific directory
naming convention that may shift in Phase 6+. Since the placeholder isn't
checked by anything, consider removing it to reduce coupling.

**Fix:** Drop lines 65-66 — the fixture at line 64 (`src/gomad-skills/`
alone) is sufficient for the guard test.

### IN-02: Global `passed`/`failed` counters pollute Phase B assertion semantics

**File:** `test/test-gm-command-surface.js:128-158`
**Issue:** Phase B correctly uses LOCAL `negPassed`/`negFailed` counters
so the negative-fixture run doesn't pollute the global tally, then
wraps the result in a single global `assert()` call. This is good. The
accompanying comment on line 108 ("Uses a LOCAL counter so negatives
don't pollute the global pass/fail tally") clearly explains intent.
However, Phase A (lines 77-98) and Phase C (lines 226-247) both use the
global `assert()` helper directly inside loops — if the installer ever
produces a large number of `agent-*.md` files, a single bad stub adds
multiple "failed" entries. This is intentional and correct for structural
validation (each malformed file is a separate failure), but worth noting
for future maintainers so they don't "fix" it by copying Phase B's
local-counter pattern.

**Fix:** Add a one-line comment in Phase A (line 74-ish) and Phase C
(line 226-ish) documenting why these use global counters (one failure per
bad stub = correct signal granularity), e.g.:
```javascript
// Each file's frontmatter is a separate structural assertion — using the
// global assert() surfaces per-file failures individually (unlike Phase B
// where we aggregate into a single meta-assertion).
```

### IN-03: Install-smoke test does not clean up on early `throw` from assertions

**File:** `test/test-gm-command-surface.js:174-269`
**Issue:** Phase C wraps the entire block in `try/catch/finally`, which
*does* clean up `installTempDir` and `tarballPath`. Good. However, the
inner `execSync` calls at lines 176, 189, and 192 could throw before
`tarballPath` or `installTempDir` are assigned (e.g., `npm pack` fails →
`tarballPath` stays `null`, cleanup skips correctly). The logic is safe,
but the nested try/catch inside the outer try (lines 202-211) swallows the
`execSync` failure of `gomad install` into an `assert(false, ...)` call
— which is correct, but if the inner try's `execSync` succeeds but the
assertion helper itself throws (theoretically impossible today, but
future-fragile), the outer finally still runs. Overall the pattern is
sound; this is a defense-in-depth note only.

**Fix:** None required. Consider extracting the install-smoke block into a
helper function in a later refactor to clarify lifecycle.

### IN-04: Hardcoded timeout values should be named constants

**File:** `test/test-gm-command-surface.js:180, 189, 192, 207`
**Issue:** Magic numbers `60_000`, `30_000`, `120_000`, `180_000` appear
inline for tarball pack, npm init, npm install, and gomad install
timeouts respectively. Per `common/coding-style.md` ("No hardcoded values
— use constants or config"), these should be named:
```javascript
const TIMEOUT_NPM_PACK_MS = 60_000;
const TIMEOUT_NPM_INIT_MS = 30_000;
const TIMEOUT_NPM_INSTALL_MS = 120_000;
const TIMEOUT_GOMAD_INSTALL_MS = 180_000;
```

Same observation for `test-installer-self-install-guard.js:48` where
`timeoutMs = 10_000` is a parameter default — that's fine as-is since
it's named.

**Fix:** Extract top-of-file `TIMEOUT_*_MS` constants for readability and
to make CI tuning trivial.

### IN-05: `.gitignore` comment-block wording slightly over-asserts about generation source

**File:** `.gitignore:76-80`
**Issue:** The comment says "The gomad installer writes
`.claude/commands/gm/agent-*.md` into a target workspace." As of Phase 5
baseline (per `05-CONTEXT.md` and the test comments at
`test-gm-command-surface.js:70-71, 249-253`), the installer does NOT yet
produce this output — that's a Phase 6 deliverable via
`agent-command-generator.js`. The comment reads as though current behavior
already emits these files, which could confuse readers auditing
`.gitignore` rules in Phase 5. Minor wording tweak suggested.

**Fix:**
```diff
 # Installer-generated output (dev-repo pollution prevention per Pitfall #7, D-10)
-# The gomad installer writes .claude/commands/gm/agent-*.md into a target workspace.
+# The gomad installer will write .claude/commands/gm/agent-*.md into a target
+# workspace once Phase 6 lands agent-command-generator.js. Pre-emptive ignore
+# to guarantee dev-repo pollution cannot sneak in before or after that change.
 # Must never be committed from the dev repo itself. Narrow pattern chosen over
 # broad allowlist to avoid accidentally hiding deliberately-tracked future dirs.
 .claude/commands/gm/
```

---

_Reviewed: 2026-04-18_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
