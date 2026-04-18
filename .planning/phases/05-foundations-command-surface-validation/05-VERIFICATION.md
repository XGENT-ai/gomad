---
phase: 05-foundations-command-surface-validation
verified: 2026-04-18T00:00:00Z
status: passed
score: 9/9 must-haves verified
overrides_applied: 0
re_verification:
  previous_status: note_only
  previous_score: 1/1 (narrow CMD-05 note; superseded)
  gaps_closed: []
  gaps_remaining: []
  regressions: []
---

# Phase 5: Foundations & Command-Surface Validation — Verification Report

**Phase Goal:** De-risk the load-bearing assumptions of v1.2 — verify `/gm:*` subdirectory namespace resolves on today's Claude Code, lock the launcher-vs-self-contained architecture decision, correct the `type: module` factual error in PROJECT.md, and prevent generated command output from polluting the dev repo — before any installer or content work begins.

**Verified:** 2026-04-18
**Status:** passed
**Re-verification:** No — initial phase-goal verification (supersedes the earlier narrow CMD-05 note while preserving its empirical content below)

> **Note:** An earlier `05-VERIFICATION.md` authored by Plan 05-01 served as the CMD-05 empirical-proof note. This report supersedes that file with the full phase-goal verification. The CMD-05 empirical content (Observable Truths #1-3) is preserved inline below, extended with per-plan verification across all three Success Criteria.

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `.claude/commands/gsd/*.md` exist with `name: gsd:<cmd>` frontmatter in this repo as live proof of subdirectory-namespace resolution (CMD-05 / SC#1) | VERIFIED | `ls .claude/commands/gsd/*.md` → 73 files; `head -3 .claude/commands/gsd/add-phase.md` returns `name: gsd:add-phase`; `head -3 .claude/commands/gsd/plan-phase.md` returns `name: gsd:plan-phase`. `/gsd:*` commands were invoked successfully across Phases 1-4 of v1.1 — if subdirectory-namespace resolution were broken, v1.1 could not have shipped. |
| 2 | Committed verification artifact at `.planning/phases/05-foundations-command-surface-validation/05-VERIFICATION.md` cites those gsd commands as empirical evidence (CMD-05 / SC#1) | VERIFIED | File exists at exact path. Grep confirms `name: gsd:add-phase` and `name: gsd:plan-phase` both present. No forbidden literals (`gm-agent-*`, `flat-name fallback`, `minimum claude code version`, `min cc version`) match case-insensitive grep. |
| 3 | An automated CI guard at `test/test-gm-command-surface.js` runs `gomad install` non-interactively in a tempDir fixture and asserts exit 0 (install-smoke half of D-02, CMD-05) | VERIFIED | `node test/test-gm-command-surface.js` → exit 0, 7 passed / 0 failed. Phase C packs tarball via `npm pack`, installs into `os.tmpdir()` fixture, runs `gomad install --yes --directory <tempDir> --tools claude-code` — exits 0 in ~40s wall-clock. Structural assertion conditional on Phase 6 generator presence (log output confirms `.claude/commands/gm/` absent as expected in Phase 5 baseline). |
| 4 | Launcher-vs-self-contained architecture decision is logged in PROJECT.md Key Decisions (REL-01 / SC#2) | VERIFIED | PROJECT.md line 120 contains a new Key Decisions row: `Launcher-form slash commands (not self-contained) — .claude/commands/gm/agent-*.md is a thin stub loading persona from _gomad/gomad/agents/*.md at runtime ... Contract set in Phase 5; extractor lands in Phase 6`. `grep -cF "Launcher-form slash commands (not self-contained)"` returns 1. `## Evolution` section header still follows the Key Decisions table (line 122). |
| 5 | `.gitignore` excludes `.claude/commands/gm/` while keeping `.claude/commands/gsd/` tracked (REF-03 / SC#3) | VERIFIED | `.gitignore` line 80 contains the literal `.claude/commands/gm/` pattern with a dedicated comment block ("Installer-generated output") at lines 76-79. `git check-ignore -v .claude/commands/gm/any-file.md` returns `.gitignore:65:.claude` (ignored via the bare `.claude` entry which line 80 makes explicit). `git ls-files .claude/commands/gsd/ \| wc -l` returns 68 (unchanged from pre-edit). `git ls-files --error-unmatch .claude/settings.json` exits 0 (settings still tracked). |
| 6 | Installer self-install guard in `tools/installer/commands/install.js` refuses install into the gomad source repo unless `--self` is passed (REF-03 defense-in-depth / D-11) | VERIFIED | `install.js:29-31` declares the `--self` Commander option. `install.js:34-50` implements the guard using `fs.pathExists(path.join(cwd, 'src', 'gomad-skills'))` as the marker. Guard runs BEFORE the existing `try { ... }` block (line 52) so its error-exit is not rewrapped as "Installation failed: ...". `grep -c 'prompts.log.error'` returns 3 (existing uninstall-analog + new guard + existing error handler). |
| 7 | A test at `test/test-installer-self-install-guard.js` asserts guard-trigger, --self-bypass, and non-gomad-cwd paths (REF-03) | VERIFIED | `node test/test-installer-self-install-guard.js` → exit 0, 6 passed / 0 failed. Tests: (1) guard exits 1 in fake gomad-source-repo fixture, (2) `--self` bypasses guard, (3) guard no-ops in clean tempDir. All three fixtures cleaned up in `finally` block. |
| 8 | `.planning/PROJECT.md` no longer claims installer is `type: module` — corrected to CommonJS with `require()`-based loading (REL-01 / SC#4) | VERIFIED | `grep -c "type: module" .planning/PROJECT.md` returns 0. `grep -cF 'CommonJS, \`require()\`-based loading' .planning/PROJECT.md` returns 2 (line 77 §Context bullet + line 94 §Constraints bullet). Both bullets preserve their original markdown shape (bullet prefix, bold where applicable, "inherited from BMAD." trailer). Evidence: `package.json` has no `"type"` field (only `"type": "git"` under `repository`); `tools/installer/gomad-cli.js:3` uses `require('commander')`. |
| 9 | npm scripts `test:gm-surface` and `test:self-install-guard` are registered in `package.json` for targeted invocation (CMD-05, REF-03) | VERIFIED | `package.json:59` contains `"test:gm-surface": "node test/test-gm-command-surface.js"`. `package.json:62` contains `"test:self-install-guard": "node test/test-installer-self-install-guard.js"`. No new `dependencies` or `devDependencies` added by Phase 5 (git diff across phase 5 commits shows zero new entries in either block). |

**Score:** 9/9 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `.planning/phases/05-foundations-command-surface-validation/05-VERIFICATION.md` | Verification note citing gsd commands + this superseding report | VERIFIED | File exists; 48 lines (prior narrow note); superseded by this report. Cites `name: gsd:add-phase`, `name: gsd:plan-phase`. No forbidden literals. |
| `test/test-gm-command-surface.js` | 3-phase test (in-repo + negative + install-smoke) | VERIFIED | 277 lines CommonJS; imports `fs-extra`, `js-yaml`, `glob`; packs tarball, runs `gomad install --yes --directory <tempDir> --tools claude-code`, asserts exit 0; conditional structural assertion; negative-fixture self-test with local counter; `finally` cleanup. Runs green end-to-end. |
| `test/test-installer-self-install-guard.js` | Guard trigger/bypass/no-op test | VERIFIED | 115 lines CommonJS; uses `spawnSync` with 10s timeout; 3 fixtures cleaned in `finally`; 6 assertions, all pass. |
| `.gitignore` | Narrow `.claude/commands/gm/` pattern | VERIFIED | Line 80 contains literal `.claude/commands/gm/`; comment block at lines 76-79. Bare `.claude` line 65 preserved. Broad form `.claude/commands/*` absent; negation `!.claude/commands/gsd/` absent (not needed — tracked-file precedence). |
| `tools/installer/commands/install.js` | `--self` option + guard before try/catch | VERIFIED | `fs-extra` imported (line 2); `--self` option registered (lines 29-31); guard implemented (lines 34-50) BEFORE the existing `try {` at line 52. `gomad-cli.js` untouched. |
| `package.json` | Two new npm scripts, no new deps | VERIFIED | `test:gm-surface` (line 59) and `test:self-install-guard` (line 62) present. `dependencies` + `devDependencies` unchanged. No `"type": "module"` field (CommonJS runtime preserved). |
| `.planning/PROJECT.md` | Two `type: module` → CommonJS corrections + D-08 Key Decisions row | VERIFIED | Line 77 + line 94 corrected; line 120 new Key Decisions row; line 122 `## Evolution` header still present. Net +1 line. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `test/test-gm-command-surface.js` | `gomad install` CLI (tempDir fixture, non-interactive) | `execSync` with `--yes --directory <tempDir> --tools claude-code` after `npm pack` + `npm install <tarball>` | WIRED | Phase C of the test executes this full chain; live run confirms exit 0 in ~40s. |
| `test/test-gm-command-surface.js` | `.claude/commands/gm/agent-*.md` (when present) | `globSync('agent-*.md')` + `yaml.load(frontmatter)` | WIRED (conditional) | Conditional on Phase 6 generator producing the dir; code path verified via Phase B's negative-fixture self-test which exercises the same assertion logic against synthesized good/bad fixtures. |
| `05-VERIFICATION.md` | `.claude/commands/gsd/*.md` | Cited file paths + frontmatter examples | WIRED | File paths cited; `name: gsd:add-phase` and `name: gsd:plan-phase` literal strings present. |
| `package.json` scripts | `test/test-gm-command-surface.js` | `npm run test:gm-surface` → `node test/test-gm-command-surface.js` | WIRED | npm script entry present; command-string is literal. |
| `package.json` scripts | `test/test-installer-self-install-guard.js` | `npm run test:self-install-guard` → `node test/test-installer-self-install-guard.js` | WIRED | npm script entry present; command-string is literal. |
| `tools/installer/commands/install.js` (options array) | `tools/installer/gomad-cli.js` command.option loop | `commands/*.js` → `gomad-cli.js` auto-loader at lines 93-100 | WIRED | `--self` option in install.js options array picked up by the auto-loader without any edit to gomad-cli.js. Verified via successful test-3 bypass in test:self-install-guard. |
| `install.js` action handler (top of body) | `src/gomad-skills/` marker detection | `await fs.pathExists(path.join(cwd, 'src', 'gomad-skills'))` before the existing try/catch | WIRED | Guard runs at line 38; `try` is at line 52. Verified by test-1 in test:self-install-guard (guard triggers with exit 1 and expected error message). |
| `.planning/PROJECT.md` line 77 + line 94 | Runtime reality in `tools/installer/gomad-cli.js:3` + `core/installer.js` | Docs statement matches code (`CommonJS, require()`-based loading) | WIRED | `gomad-cli.js:3` is `const { program } = require('commander');`; `core/installer.js` uses `require('node:path')`; `package.json` has no `"type": "module"`. Docs now match code. |
| `.planning/PROJECT.md` Key Decisions table | Phase 6 `agent-command-generator.js` contract | New D-08 row locks launcher-form decision as phase-5-committed architecture | WIRED | Row at line 120 names the contract ("thin stub loading persona from `_gomad/gomad/agents/*.md` at runtime"), source of truth (SKILL.md), and phase-6 handoff ("extractor lands in Phase 6"). |

### Data-Flow Trace (Level 4)

Not applicable — Phase 5 produces verification artifacts, tests, documentation corrections, and a CLI guard. No components render dynamic data from a data source. The two tests exercise live code paths (install CLI + guard) and their assertions are themselves the data-flow verification.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Self-install guard test suite passes | `node test/test-installer-self-install-guard.js` | exit 0, 6 passed / 0 failed | PASS |
| gm-command-surface test suite passes (full install-smoke) | `node test/test-gm-command-surface.js` | exit 0, 7 passed / 0 failed — npm pack, npm install, gomad install all complete cleanly; Phase 5 baseline structural skip logged | PASS |
| PROJECT.md no longer contains `type: module` | `grep -c "type: module" .planning/PROJECT.md` | 0 | PASS |
| PROJECT.md contains CommonJS correction in both §Context and §Constraints | `grep -cF 'CommonJS, \`require()\`-based loading' .planning/PROJECT.md` | 2 | PASS |
| PROJECT.md Key Decisions row logged | `grep -cF "Launcher-form slash commands (not self-contained)" .planning/PROJECT.md` | 1 | PASS |
| `.claude/commands/gm/` is ignored | `git check-ignore -v .claude/commands/gm/any-file.md` | `.gitignore:65:.claude` rule matches (exit 0) | PASS |
| `.claude/commands/gsd/` remains tracked | `git ls-files .claude/commands/gsd/ \| wc -l` | 68 (matches pre-edit baseline captured in Plan 05-02) | PASS |
| `.claude/settings.json` still tracked | `git ls-files --error-unmatch .claude/settings.json` | exit 0 | PASS |
| `--self` flag declared in install.js options | `grep -q "'--self'" tools/installer/commands/install.js` | exit 0 | PASS |
| Guard uses marker detection via fs.pathExists | `grep -q "path.join(cwd, 'src', 'gomad-skills')" tools/installer/commands/install.js` | exit 0 | PASS |
| Guard runs BEFORE try block | Line numbers of `Refusing to install...` vs first `try {` | Guard at line 42; `try` at line 52 (guard precedes try) | PASS |
| gomad-cli.js untouched in phase 5 | `git diff` of `tools/installer/gomad-cli.js` across phase-5 commits | No changes | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| CMD-05 | 05-01 | Subdirectory slash-command namespace (`/gm:*`) resolution verified on current Claude Code before installer changes; flat-name fallback documented if subdirectory fails | SATISFIED | Verification note cites `.claude/commands/gsd/*.md` as live in-repo empirical proof. `test/test-gm-command-surface.js` provides install-smoke + conditional structural assertion. Per D-04, the team committed to the single `/gm:agent-*` form — the "fallback if subdirectory fails" branch of the requirement is not needed because the subdirectory form is empirically shown to work. ROADMAP SC#1 allows either branch; this phase chose the first (OR "A documented flat-name fallback plan" — not needed). |
| REF-03 | 05-02 | Generated launcher stubs (into target `.claude/commands/gm/`) excluded from dev-repo via `.gitignore` and confirmed absent from `git status` | SATISFIED | `.gitignore` line 80 contains the narrow explicit pattern; `git check-ignore -v` confirms the rule is active; defense-in-depth layer adds the installer self-install guard (D-11) with full test coverage (6 assertions, all green). |
| REL-01 | 05-03 | PROJECT.md `type: module` factual error corrected — installer is CommonJS | SATISFIED | Both `type: module` occurrences replaced with `CommonJS, \`require()\`-based loading` at lines 77 (§Context) and 94 (§Constraints). Verified by greps returning 0 and 2 respectively. |

All three requirement IDs declared in phase-5 plan frontmatter (CMD-05, REF-03, REL-01) match the IDs mapped to Phase 5 in REQUIREMENTS.md line 134. No orphaned requirements.

### Anti-Patterns Found

Code review (`05-REVIEW.md`) already scanned the 5 modified files and reported 0 critical, 2 warning, 5 info — all non-blocking. The warnings (WR-01 Windows path regex fragility, WR-02 missing positive assertion that commander accepted `--self`) and info items (IN-01 placeholder fixture coupling, IN-02 global counter documentation, IN-03 install-smoke cleanup robustness, IN-04 hardcoded timeouts, IN-05 .gitignore comment wording) are hardening suggestions, not defects. None prevent goal achievement.

My independent anti-pattern scan concurs:

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `.gitignore:77` | 77 | Comment says installer "writes" .claude/commands/gm/* but Phase 5 baseline has no generator yet (minor tense inaccuracy) | Info | None — flagged in 05-REVIEW.md IN-05; does not affect the rule's effect. |
| `test/test-gm-command-surface.js` | 180, 189, 192, 207 | Magic timeout constants inline (60_000, 30_000, 120_000, 180_000) | Info | None — flagged in 05-REVIEW.md IN-04; readability suggestion only. |
| `test/test-installer-self-install-guard.js` | 80 | Forward-slash regex literal `/src\/gomad-skills/` matches hardcoded message, but will silently pass on Windows if the error message is ever refactored to use `path.join` output | Warning | None today — future-fragile. Flagged in 05-REVIEW.md WR-01. |

All findings are non-blocking and tracked in 05-REVIEW.md for future follow-up.

### Human Verification Required

None. All phase-5 truths are verifiable programmatically:

- CLI guard: exercised by `test:self-install-guard` (6 assertions green)
- Install-smoke: exercised by `test:gm-surface` (7 assertions green, full `gomad install` run in tempDir)
- `.gitignore` effect: verified via `git check-ignore -v` and `git ls-files`
- PROJECT.md content: verified via `grep` on literal strings
- Key Decisions row: verified via `grep -cF` on unique phrase

No visual, real-time, or external-service behaviors introduced in this phase. The subdirectory-namespace resolution claim (CMD-05) is proven by analogy + empirical in-repo usage of `.claude/commands/gsd/*.md` during Phases 1-4 of v1.1 — this is the canonical empirical proof approach per D-01 and does not require a fresh human test.

### Gaps Summary

None. All 4 ROADMAP Success Criteria are met:

1. **SC#1 (CMD-05) — empirical subdirectory-namespace verification:** PASSED via committed note citing live `.claude/commands/gsd/*.md` usage + automated `test:gm-surface` gate.
2. **SC#2 (REL-01) — launcher-vs-self-contained decision logged:** PASSED via new Key Decisions row in PROJECT.md (line 120).
3. **SC#3 (REF-03) — .gitignore excludes `.claude/commands/gm/`, keeps gsd tracked:** PASSED via narrow explicit pattern + defense-in-depth installer guard + 6-assertion test.
4. **SC#4 (REL-01) — PROJECT.md CommonJS correction:** PASSED via two in-place replacements at lines 77 and 94.

All three plans (05-01, 05-02, 05-03) executed cleanly with atomic commits, zero new dependencies, and TDD red-green cycles where `tdd="true"` was declared (05-02 Task 2).

---

## Appendix: CMD-05 Empirical Proof (preserved from prior narrow note)

The preliminary `05-VERIFICATION.md` authored by Plan 05-01 contained the original CMD-05 empirical-proof content. Its substantive claims are retained above in Observable Truths #1-3. The key facts:

- **Live in-repo evidence:** `.claude/commands/gsd/*.md` (73 files as of this verification) use the exact pattern `.claude/commands/<ns>/<cmd>.md` with `name: <ns>:<cmd>` frontmatter and resolve as `/<ns>:<cmd>` slash commands on the team's current Claude Code.
- **Scope discipline (D-03, D-04):** No CC-version floor pinned; no alternative namespace shape documented as a contingency. The team committed fully to `/gm:agent-*` as the single invocation form.
- **Automated guard:** `test/test-gm-command-surface.js` locks the contract into CI with install-smoke (live) and conditional structural assertion (hardens in Phase 6).

## Appendix: Phase 6 Handoff

Phase 6 (installer mechanics) MUST:

1. Ship `tools/installer/ide/shared/agent-command-generator.js` that emits `.claude/commands/gm/agent-*.md` stubs with the D-07 frontmatter contract (`name: gm:agent-<name>`, non-empty `description`).
2. Edit `test/test-gm-command-surface.js` Phase C to convert `if (fs.existsSync(installedGmDir))` into `assert(fs.existsSync(installedGmDir), '.claude/commands/gm/ present in installed output')` — a missing directory MUST fail the test once the generator lands.
3. (Optional) Wire `test:gm-surface` and `test:self-install-guard` into the composite `test` / `quality` scripts.

---

_Verified: 2026-04-18_
_Verifier: Claude (gsd-verifier)_
