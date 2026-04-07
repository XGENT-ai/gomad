---
phase: 04-publish-and-verify
reviewed: 2026-04-07T00:00:00Z
depth: standard
files_reviewed: 2
files_reviewed_list:
  - package.json
  - test/test-publish-e2e.js
findings:
  critical: 0
  warning: 1
  info: 4
  total: 5
status: issues_found
---

# Phase 04: Code Review Report

**Reviewed:** 2026-04-07
**Depth:** standard
**Files Reviewed:** 2
**Status:** issues_found

## Summary

Phase 04 adds publish metadata (`@xgent-ai/gomad` scope, `publishConfig.access: public`, `files` allowlist) to `package.json` and introduces `test/test-publish-e2e.js`, an end-to-end test that packs the repo, installs the tarball into an `os.tmpdir()` fixture, runs the `gomad` bin, and asserts the project-local `.claude/` tree is populated.

Overall the changes are well-scoped and carry thoughtful inline rationale (timeout sourcing, randomized fixture, `--ignore-scripts` defense-in-depth, asset-dir mapping cross-reference). The test correctly matches `ASSET_DIRS` in `tools/installer.js` (rules, commands, agents, scripts/hooks) and the `files` allowlist in `package.json` includes everything the installer reads at runtime (`bin/`, `assets/`, `catalog/`, `tools/`).

One warning: the test never exercises a real `npx @xgent-ai/gomad install` invocation as the phase prompt specified — it calls the already-linked bin directly. This is documented in code comments as an intentional speed/hermeticity tradeoff, but it means the "npx end-to-end path" (scoped-name resolution, bin-field wiring through npx's own resolver) is not covered by an automated test. Four info items cover minor robustness and hygiene improvements.

## Warnings

### WR-01: E2E test does not exercise the `npx` code path described in the phase prompt

**File:** `test/test-publish-e2e.js:82-95`
**Issue:** The phase prompt states the test should run `npx @xgent-ai/gomad install --preset full --yes --ignore-scripts` against the tarball. The actual implementation installs the tarball with `npm install --ignore-scripts` (line 61) and then invokes the bin symlink directly from `node_modules/.bin/gomad` (lines 86, 91). Comments justify this as "faster than npx, no network resolution, no prompting" and note that the symlink's existence proves the `bin` field is wired.

This is a reasonable simplification, but it means:
1. The actual `npx @xgent-ai/gomad` resolution path (scope handling, cache interaction, bin resolver) is never tested.
2. `--ignore-scripts` is passed to `npm install` (correct for defense-in-depth) but **not** passed to the gomad CLI itself as the prompt requested — gomad currently has no such flag, so this is moot, but the divergence from the prompt should be acknowledged in the phase verification or the prompt should be reconciled with the plan.
3. If `bin/gomad-cli.js` ever loses its shebang or executable bit in the packed tarball, direct-invocation via the symlink would still work on many systems, whereas `npx` more closely mirrors end-user behavior.

**Fix:** Either (a) update the phase plan/prompt to reflect the direct-bin approach and document why npx is not used, or (b) add a second, slower `it(...)` block that shells out to `npx --prefix "${fixtureDir}" @xgent-ai/gomad install --preset full --yes` to cover the npx resolution path as a smoke test. Example:

```javascript
it('npx resolution path works end-to-end', () => {
  const output = execSync(
    `npx --prefix "${fixtureDir}" --yes @xgent-ai/gomad install --preset full --yes`,
    { cwd: fixtureDir, encoding: 'utf8', timeout: 90_000 },
  );
  assert.ok(output.includes('Installed'));
});
```

## Info

### IN-01: `execSync` stdout mixing with `stdio: 'inherit'` discards captured output

**File:** `test/test-publish-e2e.js:60-67`
**Issue:** The `npm install` call uses `stdio: 'inherit'`, which streams output directly to the parent and makes `execSync`'s return value empty. This is fine for the current code (return value is unused), but if a future change needs to assert on install output (e.g., to detect npm warnings), the `stdio` setting would silently drop it. Minor hygiene note: prefer `stdio: ['ignore', 'pipe', 'inherit']` or `encoding: 'utf8'` + explicit logging on failure.
**Fix:** Optional. If keeping `inherit`, add a comment clarifying the intent ("stream to parent for CI log visibility; return value intentionally unused").

### IN-02: `tarballName = packOutput.split('\n').pop().trim()` is fragile on `npm pack --silent`

**File:** `test/test-publish-e2e.js:35-41`
**Issue:** `npm pack --silent` should emit only the tarball filename, but historically npm versions have leaked notices, deprecation warnings, or stray blank lines on stdout even with `--silent`. Taking the last non-empty line is safer than `.pop()`, which returns `''` if the output ends with `\n`. The current `.trim()` after `.pop()` masks trailing-newline issues on the final line but not an empty last element.
**Fix:**
```javascript
const tarballName = packOutput
  .split('\n')
  .map((line) => line.trim())
  .filter(Boolean)
  .pop();
assert.ok(tarballName && tarballName.endsWith('.tgz'), `unexpected npm pack output: ${packOutput}`);
```

### IN-03: `void E2E_TIMEOUT_MS;` is dead code masquerading as a reference

**File:** `test/test-publish-e2e.js:25-26`
**Issue:** `E2E_TIMEOUT_MS` is declared and immediately voided to suppress an "unused variable" lint. The comment above explains *why* the per-describe timeout isn't used, but the constant itself serves no runtime purpose. This is a code smell — a comment alone would convey the same information without a dead binding.
**Fix:** Replace the constant + `void` with a standalone comment:
```javascript
// Runner-level timeout: 120s via --test-timeout=120000 in package.json scripts.test.
// Per-describe { timeout } requires Node 20.4+; engines.node is >=18.0.0.
```

### IN-04: `package.json` `files` allowlist omits `assets/` subtree visibility check

**File:** `package.json:36-42`
**Issue:** The `files` array includes `assets/`, which is correct — `tools/installer.js:14` reads from `ASSETS_SRC = join(__dirname, '..', 'assets')`. However, there is no test asserting that the packed tarball actually contains populated `assets/agents/`, `assets/rules/`, `assets/commands/`, and `assets/hooks/` subtrees. The e2e test would catch a missing `assets/` (installer would fail or produce empty dirs), but a silent regression where only a subset ships (e.g., `.npmignore` drift) could still slip through as "install succeeded but fewer files than expected." The e2e test does assert `readdirSync(subdir).length > 0`, which partially covers this — good. Consider also asserting a minimum file count or a known canonical file exists.
**Fix:** Optional hardening. Add one assertion per subdir checking for a known-stable canonical file, e.g.:
```javascript
assert.ok(existsSync(join(claudeDir, 'rules', 'README.md')), 'canonical rules/README.md should ship');
```
This catches the "accidentally shipped empty directory stub" failure mode.

---

_Reviewed: 2026-04-07_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
