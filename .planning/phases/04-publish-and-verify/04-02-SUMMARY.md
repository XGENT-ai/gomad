---
phase: 04-publish-and-verify
plan: 02
subsystem: testing
tags: [e2e, npm-pack, publish-verification, node-test]
dependency-graph:
  requires: [04-01]
  provides: [publish e2e test, Node 18 compatible test timeout]
  affects: [test/test-publish-e2e.js, package.json]
tech-stack:
  added: []
  patterns: [tarball-e2e-test, os.tmpdir-fixture, node-test-lifecycle-hooks]
key-files:
  created:
    - test/test-publish-e2e.js
  modified:
    - package.json
decisions:
  - D-06/D-07/D-08 materialized as a single describe block with before/after hooks and randomized os.tmpdir() fixture
  - D-13 honored: no new dependencies; all built-in node: modules
  - --ignore-scripts added to npm install per T-04-08 (defense-in-depth)
  - --test-timeout=120000 chosen over per-describe { timeout } because engines.node is >=18.0.0 and the per-describe option requires Node 20.4+
  - Asserted on real asset directories only (rules, commands, agents, scripts/hooks) — NO .claude/skills assertion (assets/skills/ does not ship)
metrics:
  duration: ~10 min
  completed: 2026-04-07
requirements: [PUB-02, PUB-03, TST-04]
---

# Phase 4 Plan 02: Publish E2E Verification Summary

Added an end-to-end publish verification test that packs the repo, installs the tarball into an os.tmpdir() fixture, runs `gomad install --preset full --yes` through the real `node_modules/.bin/gomad` symlink, and asserts the project-local `./.claude/` tree is populated with real asset directories. Satisfies PUB-02 + PUB-03 + TST-04 via a single test.

## What Changed

### test/test-publish-e2e.js (new, 136 lines)

- **Imports:** built-ins only (`node:test`, `node:assert/strict`, `node:child_process`, `node:fs`, `node:path`, `node:url`, `node:os`, `node:crypto`). No new deps.
- **Structure:** single `describe` block with `before` / `after` lifecycle hooks + one `it` test.
- **before hook:**
  1. `execSync('npm pack --silent', ...)` in PROJECT_ROOT with 60s timeout → reads tarball name from last line of stdout.
  2. Creates `gomad-e2e-<16-hex>` fixture under `os.tmpdir()` via `crypto.randomBytes(8).toString('hex')`.
  3. Writes stub `package.json` (`{ name: 'gomad-e2e-fixture', version: '0.0.0', private: true }`).
  4. `npm install --no-audit --no-fund --no-package-lock --ignore-scripts --silent "<tarball>"` with 90s timeout and `stdio: 'inherit'`.
- **after hook:** unconditional cleanup of fixtureDir and tarballPath via `rmSync(..., { recursive: true, force: true })`, guarded by `existsSync` to avoid double-faults on partial setup.
- **it block assertions:**
  1. `node_modules/.bin/gomad` symlink exists (proves the `bin` field works).
  2. CLI subprocess runs via `execSync` with 60s timeout, cwd = fixtureDir.
  3. Output contains `'gomad install'` AND `'Installed'` (sanity — installer.js can silent-return per Pitfall 4).
  4. `.claude/` exists.
  5. `.claude/rules`, `.claude/commands`, `.claude/agents`, `.claude/scripts/hooks` all exist and are non-empty via `readdirSync(...).length > 0`.
  6. `.claude/.gomad-manifest.yaml` exists.
  7. `gomad.lock.yaml` at fixture root exists.
- **What is explicitly NOT asserted:** `.claude/skills` (assets/skills/ does not ship — would always fail). `process.homedir`, `$HOME`, or `~/.claude` (project-local constraint).

### package.json

- `scripts.test`: `"node --test 'test/test-*.js'"` → `"node --test --test-timeout=120000 'test/test-*.js'"`
- No other fields changed. `name` still `@xgent-ai/gomad`, `version` still `1.0.0`, `publishConfig.access` still `public`, `bin.gomad` still `bin/gomad-cli.js`, `files` array unchanged, no new dependencies.

## Verification Results

### `node --test --test-timeout=120000 test/test-publish-e2e.js` (isolated)

- Result: 1/1 pass
- Wall time: ~3.0s (test subject wall time ~745ms + pack/install overhead)

### `npm test` (full suite)

- Result: **28/28 pass**, 0 fail, 0 skipped
- Wall time: **~1.5s total** (1359ms reported by node:test + ~200ms shell overhead)
- New e2e test subject wall time on this run: ~412ms (npm pack + install + gomad install + assertions + cleanup, caching kicked in on re-run)
- All suites present in output: `test-catalogs.js`, `test-decoupling.js`, `test-installation.js`, `test-presets.js`, `test-publish-e2e.js`

### Cleanup verification

- `ls /Users/rockie/Documents/GitHub/xgent/gomad/*.tgz` → no matches
- `ls /tmp/gomad-e2e-*` → no matches
- Verified after both the isolated run and the full `npm test` run.

### must_haves confirmations

- `test/test-publish-e2e.js` exists and runs as part of `npm test`: **YES**
- E2E test packs, installs into randomized os.tmpdir fixture, runs `gomad install --preset full --yes`, asserts `./.claude/` populated: **YES**
- Asserts on REAL asset directories (agents, commands, rules, scripts/hooks) and NOT on `.claude/skills`: **YES** — verified via grep for `'skills'` in the file (no match as an asserted subdir).
- Cleans up fixture + tarball regardless of pass/fail: **YES** (after hook with existsSync guards)
- `npm test` exits 0 with the new e2e test: **YES**
- No writes to ~/, $HOME, or anywhere outside os.tmpdir() + repo root: **YES** (grep confirms no homedir / $HOME / ~/.claude references in the new test file)
- `--ignore-scripts` in npm install invocation: **YES** (line 58)
- `--test-timeout=120000` in package.json scripts.test: **YES**

## Commits

| Task | Commit  | Description                                                                 |
|------|---------|-----------------------------------------------------------------------------|
| 1    | b5cb97c | test(04-02): add publish e2e test covering PUB-02 + PUB-03                  |
| 2    | f70b20c | chore(04-02): add --test-timeout=120000 to npm test for Node 18 compat      |
| 3    | (none)  | Task 3 is verification-only (npm test); no file edits                       |

## Deviations from Plan

None — plan executed exactly as written.

One minor note on the test file: the plan's research example included `{ timeout: E2E_TIMEOUT_MS }` as a second argument to `describe(...)`. Per the plan's explicit instruction in Task 1 action block ("Do NOT use the `describe(..., { timeout: N }, fn)` form for the timeout — that requires Node 20.4+"), the final file uses the two-argument `describe(name, fn)` form and relies on the runner-level `--test-timeout=120000` flag added in Task 2. The `E2E_TIMEOUT_MS` constant is retained (with a `void` reference) for documentation of the budget. This is plan-compliant, not a deviation.

## Flakiness Observed

None. Ran the e2e test in isolation once and as part of the full suite once — both passed cleanly with no spurious output. The test's wall time is dominated by `npm pack` (~1-2s) rather than the install or assertions, so it should be stable across runs.

## Regression Baseline

For future regressions, on this machine (darwin 25.3.0, Node via local install):

- `npm test` full suite wall time: **~1.5s** (28 tests)
- `test-publish-e2e.js` subject wall time: **~412ms-745ms** depending on npm cache state
- `npm pack` subject wall time inside the e2e: dominant cost, ~1-2s
- Hard ceiling: 120s (runner flag); test-level: 60s (npm pack) + 90s (npm install) + 60s (CLI) = 210s worst-case but node:test caps the outer at 120s.

## Self-Check: PASSED

- `test/test-publish-e2e.js` exists at expected path — VERIFIED
- File contains `npm pack`, `tmpdir`, `randomBytes`, `gomad-e2e-`, `--preset full --yes`, `--ignore-scripts` — VERIFIED
- File contains all four asset subdir assertions (`'rules'`, `'commands'`, `'agents'`, `'scripts'` + `'hooks'`) — VERIFIED
- File does NOT contain `.claude/skills` as an asserted path — VERIFIED (only mention is in the comment explaining why it's excluded)
- File contains `.gomad-manifest.yaml` and `gomad.lock.yaml` assertions — VERIFIED
- File uses `before` + `after` lifecycle hooks — VERIFIED
- File imports only from `node:*` — VERIFIED (no vitest/jest/mocha/chai)
- File does NOT reference `homedir`, `$HOME`, or `~/.claude` — VERIFIED
- `package.json` `scripts.test` contains `--test-timeout=120000` — VERIFIED via node -e
- `package.json` `name`, `version`, `bin.gomad`, `publishConfig.access`, `files` unchanged from Plan 04-01 — VERIFIED
- `npm test` exits 0 with 28/28 pass including the new e2e test — VERIFIED
- No `*.tgz` in repo root after the run — VERIFIED
- No `gomad-e2e-*` in `/tmp` after the run — VERIFIED
- Commits b5cb97c and f70b20c exist in git log — VERIFIED
