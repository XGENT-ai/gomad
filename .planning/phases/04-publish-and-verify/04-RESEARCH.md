# Phase 4: Publish and Verify - Research

**Researched:** 2026-04-07
**Domain:** npm publication of a scoped Node.js CLI + tarball-based end-to-end install verification
**Confidence:** HIGH (every claim is either verified against the local codebase or against canonical npm docs; one item flagged for the user under Open Questions)

## Summary

Phase 4 has two technical surfaces. The first is a small set of `package.json` edits — rename to `@xgent-ai/gomad`, version `1.0.0`, `publishConfig.access: "public"`, polished `description` — none of which touch runtime code. The second is one new test file (`test/test-publish-e2e.js`) that runs `npm pack`, installs the resulting tarball into a randomized `os.tmpdir()` fixture, invokes the CLI in non-interactive mode, asserts the project-local `.claude/` tree was populated, and cleans up unconditionally. The CLI surface (`bin/gomad-cli.js install --preset full --yes`) is already wired and the underlying `tools/installer.js` has been project-local since Phase 2; Phase 4 verifies it works through a real npm install boundary.

The biggest watch-out is **subprocess exit codes**: `install()` in `tools/installer.js` currently `console.log`s and `return`s on failure paths instead of throwing or `process.exit(1)`. The CLI handler `await`s `install(options)` and never sets a non-zero exit code, so a failed install can still produce exit code 0. The e2e test must therefore assert on **filesystem state** (the `.claude/` tree was actually populated) and not rely solely on exit codes. This is verified in `tools/installer.js:185-188` and `bin/gomad-cli.js:24-27`.

The second watch-out is the wording of D-05. CLAUDE.md (the actual project file at the repo root) contains **zero** literal vitest references. The stale mentions live in `.planning/PROJECT.md`, `.planning/ROADMAP.md`, and `.planning/REQUIREMENTS.md`. Phase 4 should still update them, but D-05's wording implies CLAUDE.md edits that are not needed.

**Primary recommendation:** One new test file, three small `package.json` edits, three planning-doc text fixes (PROJECT.md / ROADMAP.md / REQUIREMENTS.md — not CLAUDE.md), and a manual `npm pack --dry-run` review. No new dependencies, no installer changes. Timeout the e2e test at 120s.

## User Constraints (from CONTEXT.md)

### Locked Decisions

**Distribution Direction (CHANGE FROM PROJECT.md)**
- **D-01:** Publish to **public npm** (not private) under the scoped name **`@xgent-ai/gomad`**. Deliberate reversal of two PROJECT.md entries: the "Public npm publication" Out of Scope item and the "Registry: Publish to private npm" constraint. Both updated at next phase transition.
- **D-02:** Package name changes from `gomad` → `@xgent-ai/gomad`. The CLI binary command stays `gomad` (`bin` field key unchanged: `{ "gomad": "bin/gomad-cli.js" }`).
- **D-03:** Add `publishConfig: { access: "public" }` so the first publish does not fail. Mandatory, not optional.

**Test Framework Alignment (TST-04)**
- **D-04:** Keep `node --test`. Do NOT migrate to vitest. Existing `test/test-*.js` files use `node:test` API.
- **D-05:** Update REQUIREMENTS.md TST-04 wording from "All tests pass with vitest" to "All tests pass with the project test runner (`npm test`)". Update CLAUDE.md's stale vitest mentions in the same edit. *(See Open Questions Q1 — CLAUDE.md does not contain literal vitest text; the stale mentions actually live in PROJECT.md and ROADMAP.md.)*

**End-to-End Verification (PUB-02, PUB-03)**
- **D-06:** Add `test/test-publish-e2e.js` that: (1) runs `npm pack`, (2) creates fresh `os.tmpdir()` fixture with stub `package.json`, (3) installs tarball, (4) runs `npx gomad install --preset full --yes`, (5) asserts `./.claude/` populated, (6) cleans up in finally.
- **D-07:** Fixture in `os.tmpdir()` with randomized name (`gomad-e2e-<random>`). Not committed. Cleanup regardless of pass/fail.
- **D-08:** Single test covers PUB-02 + PUB-03.

**Package Metadata**
- **D-09:** Update `description` for npm registry listing — must mention "curated Claude Code skills/agents/rules/hooks/commands" and "project-local install".
- **D-10:** Add `publishConfig: { access: "public" }`.
- **D-11:** Do NOT add `repository`, `homepage`, or `bugs` fields.
- **D-12:** Bump version `0.1.0` → **`1.0.0`**.

**Files Whitelist**
- **D-13:** Keep `files` array as-is: `["bin/", "assets/", "catalog/", "tools/", "README.md"]`. Run `npm pack --dry-run` once to validate; surface deviations rather than silently expand.

### Claude's Discretion
- Exact wording of polished package.json `description`.
- Exact assertion set for "populated `.claude/`" — match what `--preset full` actually installs from `catalog/presets.yaml`.
- `node:fs/promises` vs `fs-extra` in the e2e test — match existing test conventions (existing tests use `node:fs` sync API + `child_process.execSync`).
- Whether to assert install subprocess exit code 0 (recommended yes, but see Summary caveat — exit code is not authoritative on failure).
- README polish for npm listing — minor only.

### Deferred Ideas (OUT OF SCOPE)
- `repository`, `homepage`, `bugs` fields (skipped per D-11)
- CI/CD publish automation (manual `npm publish` after merge)
- Provenance / SLSA attestation (`npm publish --provenance`)
- Changelog tooling / release notes
- README rewrite for npm landing
- PROJECT.md reversal of Out-of-Scope and Constraints entries (happens at phase transition, not inside this phase's plans)

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PUB-01 | package.json configured for npm registry publication | §"Package.json Diff" — exact name/version/publishConfig changes |
| PUB-02 | `npx gomad install` works end-to-end on a fresh project | §"E2E Test Pattern" — tarball install + filesystem assertions |
| PUB-03 | `npx gomad install --preset full --yes` works non-interactively | Same e2e test; `--preset full --yes` is the exact invocation |
| TST-04 | All tests pass with the project test runner | §"TST-04 Wording Cleanup" — exact files and line numbers to edit |

## Project Constraints (from CLAUDE.md)

CLAUDE.md is the actual project file at `/Users/rockie/Documents/GitHub/xgent/gomad/CLAUDE.md`. Directives that affect Phase 4:

- **Tech stack lock**: Node.js, only `commander`, `@clack/prompts`, `yaml`, `fs-extra`, `chalk`. **Implication:** the e2e test must NOT introduce a new test framework, assertion library, or tarball helper. Use `node:test`, `node:assert/strict`, `node:child_process`, `node:fs`, `node:os`, `node:path` — the same modules `test/test-installation.js` already imports. [VERIFIED: CLAUDE.md §Constraints]
- **No global writes**: nothing in `/`, `~/`, or `$HOME`. **Implication:** the e2e fixture must live under `os.tmpdir()` (already required by D-07) and the test must not pollute the user's npm cache or global modules. [VERIFIED: CLAUDE.md §Constraints]
- **GSD workflow enforcement**: file edits should go through GSD commands. **Implication:** the planner produces plans, the executor edits — research should not edit. [VERIFIED: CLAUDE.md §"GSD Workflow Enforcement"]
- **Test files**: `test-[feature].js` in `test/` directory. New file: `test/test-publish-e2e.js`. [VERIFIED: CLAUDE.md §"Naming Patterns"]
- **ESM, no transpilation**: matches existing test files exactly. [VERIFIED: CLAUDE.md §"Module System"]
- **Code Style**: 2-space indent, no semicolons-at-line-end requirement (optional in modules), JSDoc on public functions. Match `test/test-installation.js` shape exactly.

CLAUDE.md does **not** mention vitest anywhere. D-05's "Update CLAUDE.md's stale vitest mentions" is a no-op for this file — see Open Questions Q1.

## Standard Stack

### Core (no new dependencies needed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `node:test` | built-in (Node 18+) | Test runner — `describe`, `it`, lifecycle hooks | Already used by all 4 existing test files; D-04 locks it |
| `node:assert/strict` | built-in | Assertions | Already used in `test/test-installation.js:2` |
| `node:child_process` | built-in | `execSync` for `npm pack`, `npm install`, `node bin/gomad-cli.js` | Already used in `test/test-installation.js:6` |
| `node:fs` | built-in | `existsSync`, `mkdirSync`, `writeFileSync`, `rmSync`, `readdirSync` | Sync API matches existing test idiom |
| `node:os` | built-in | `os.tmpdir()` for fixture root | Mandatory per D-07 |
| `node:path` | built-in | `join`, `dirname`, `relative` | Already used everywhere |
| `node:crypto` | built-in | `randomBytes(8).toString('hex')` for randomized fixture name | Avoids collisions across parallel runs |

### Version verification
No new packages. Existing dependency versions remain pinned per `package.json` — no `npm view` calls required for this phase.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `child_process.execSync` | `child_process.spawnSync` | spawnSync gives structured stdout/stderr/status without shell parsing; existing tests use `execSync` so we match that. Either acceptable per Claude's Discretion. |
| `node:fs/promises` | `fs-extra` | fs-extra is already a project dep, but existing tests use sync `node:fs`. Match the existing pattern. |
| `node --test` reporter override | default reporter | Default is fine; no need to add `--test-reporter`. |

## Architecture Patterns

### Recommended Structure (one new file)

```
test/
├── test-catalogs.js       # existing
├── test-decoupling.js     # existing
├── test-installation.js   # existing (template to mirror)
├── test-presets.js        # existing
└── test-publish-e2e.js    # NEW — Phase 4
```

### Pattern 1: Tarball-based E2E install test

**What:** Pack the local repo, install the tarball into a tmp dir, exercise the CLI through the same path a real `npx @xgent-ai/gomad install` would take, assert filesystem state, clean up unconditionally.

**When to use:** Verifying that the published artifact works as a consumer would experience it — catches missing `files` entries, missing executable bits on `bin`, broken `bin` mapping, missing `assets/` content, etc. This is the only way to catch a class of bugs that pass `npm test` locally but fail post-publish.

**Example (full file content the planner can hand to the executor):**

```javascript
// test/test-publish-e2e.js
// Source: pattern derived from test/test-installation.js + node:test docs
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import {
  existsSync, mkdirSync, writeFileSync, rmSync, readdirSync,
} from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { randomBytes } from 'node:crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');

// 120s budget: npm pack ~5-15s, npm install of tarball into fresh dir ~10-30s,
// gomad install --preset full ~5-20s. 120s leaves comfortable headroom.
const E2E_TIMEOUT_MS = 120_000;

describe('Publish E2E: pack -> install tarball -> run CLI', { timeout: E2E_TIMEOUT_MS }, () => {
  let fixtureDir;
  let tarballPath;

  before(() => {
    // 1. Pack the repo. --pack-destination puts the tarball in PROJECT_ROOT
    // so we control where it goes and can clean it up.
    const packOutput = execSync('npm pack --silent', {
      cwd: PROJECT_ROOT,
      encoding: 'utf8',
      timeout: 60_000,
    }).trim();
    // npm pack prints the tarball filename on the last line of stdout
    const tarballName = packOutput.split('\n').pop().trim();
    tarballPath = join(PROJECT_ROOT, tarballName);
    assert.ok(existsSync(tarballPath), `tarball should exist at ${tarballPath}`);

    // 2. Create randomized fixture under os.tmpdir()
    const fixtureName = `gomad-e2e-${randomBytes(8).toString('hex')}`;
    fixtureDir = join(tmpdir(), fixtureName);
    mkdirSync(fixtureDir, { recursive: true });

    // 3. Stub package.json (npm install requires one)
    writeFileSync(
      join(fixtureDir, 'package.json'),
      JSON.stringify({ name: 'gomad-e2e-fixture', version: '0.0.0', private: true }, null, 2),
      'utf8',
    );

    // 4. Install the tarball. --no-audit --no-fund --silent reduces noise.
    // --no-package-lock keeps the fixture minimal. Flags are documented as
    // safe defaults in npm-install(1).
    execSync(`npm install --no-audit --no-fund --no-package-lock --silent "${tarballPath}"`, {
      cwd: fixtureDir,
      stdio: 'inherit',
      timeout: 90_000,
    });
  });

  after(() => {
    // Cleanup runs even if assertions fail (node:test guarantees `after` runs).
    // force: true swallows ENOENT; recursive: true handles the whole tree.
    if (fixtureDir && existsSync(fixtureDir)) {
      rmSync(fixtureDir, { recursive: true, force: true });
    }
    if (tarballPath && existsSync(tarballPath)) {
      rmSync(tarballPath, { force: true });
    }
  });

  it('npx gomad install --preset full --yes populates ./.claude/', () => {
    // Use the bin from node_modules directly. This is what `npx gomad` resolves to
    // when the package is installed locally; calling it directly is faster and
    // avoids npx prompting in CI.
    const cliPath = join(fixtureDir, 'node_modules', '.bin', 'gomad');
    assert.ok(existsSync(cliPath), `gomad bin should be linked at ${cliPath}`);

    // Run the install. cwd = fixtureDir so installer.js writes ./.claude/ inside
    // the fixture, not the test runner's cwd.
    const output = execSync(`"${cliPath}" install --preset full --yes`, {
      cwd: fixtureDir,
      encoding: 'utf8',
      timeout: 60_000,
    });

    // Sanity check on output
    assert.ok(output.includes('gomad install'), 'expected install banner');
    assert.ok(output.includes('Installed'), 'expected "Installed N files" summary');

    // Filesystem assertions: derived from tools/installer.js ASSET_DIRS map
    // (verified in tools/installer.js:19-24). The `full` preset has
    // include_all: true (verified in catalog/presets.yaml:4-5), so every
    // populated assets/<type>/ subtree should appear under .claude/.
    const claudeDir = join(fixtureDir, '.claude');
    assert.ok(existsSync(claudeDir), '.claude/ should exist');

    // These four asset types map directly from assets/<type>/ to .claude/<...>/
    // per ASSET_DIRS in tools/installer.js. Each subtree must be non-empty.
    const expectedSubdirs = [
      join(claudeDir, 'rules'),
      join(claudeDir, 'commands'),
      join(claudeDir, 'agents'),
      join(claudeDir, 'scripts', 'hooks'),  // hooks target is nested per ASSET_DIRS
    ];

    for (const subdir of expectedSubdirs) {
      assert.ok(existsSync(subdir), `${subdir} should exist`);
      assert.ok(readdirSync(subdir).length > 0, `${subdir} should be non-empty`);
    }

    // Manifest must be present
    assert.ok(
      existsSync(join(claudeDir, '.gomad-manifest.yaml')),
      '.gomad-manifest.yaml should be written',
    );

    // Lockfile must be present at fixture root
    assert.ok(
      existsSync(join(fixtureDir, 'gomad.lock.yaml')),
      'gomad.lock.yaml should be written to fixture root',
    );
  });
});
```

**Key design decisions baked into the example:**
1. `before` / `after` hooks scoped to the `describe` block — guarantees cleanup even on assertion failure (verified by `node:test` docs: `after` runs unconditionally).
2. Calls the CLI binary directly via `node_modules/.bin/gomad` rather than `npx gomad` — faster, no network, no prompting in CI.
3. Uses `execSync` (not `spawnSync`) to match `test/test-installation.js:6,12-18`.
4. Asserts filesystem state, not just exit codes — see Summary caveat.
5. Cleans up the tarball as well as the fixture (otherwise the repo accumulates `.tgz` files between test runs).
6. Per-`describe` `timeout` option (supported in `node:test` since Node 20.4 / backported to 18.x via `--test-timeout` flag — see Open Questions Q2).

### Anti-Patterns to Avoid
- **Asserting only on stdout**: install logs include "Installed" even when nothing was actually installed if assets/ is empty — use filesystem assertions.
- **Skipping cleanup on failure**: `try/finally` or `node:test` `after` hook is mandatory; failed runs leak tmp dirs.
- **Hardcoding the tarball filename**: `npm pack` produces `xgent-ai-gomad-1.0.0.tgz` (scoped packages have the slash replaced by a dash) — read it from `npm pack` stdout instead.
- **Running `npx gomad`**: triggers a network resolution attempt and a prompt. Call the local `node_modules/.bin/gomad` directly.
- **Forgetting `--no-package-lock`**: the fixture would otherwise generate a lockfile that's harmless but slower to write.
- **Using shell-injection-prone string concatenation for `tarballPath`**: wrap in double quotes (`"${tarballPath}"`) since `os.tmpdir()` paths can contain spaces on macOS/Windows.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Build a tarball | Custom tar packer | `npm pack` | Same logic the registry uses; respects `files` and `.npmignore`; produces the exact artifact that will publish |
| Install a local package | Symlink hacks, copy node_modules | `npm install <tarball-path>` | Exercises the real install path including `bin` linking |
| Random tmp dir | Custom timestamp dirs | `os.tmpdir()` + `crypto.randomBytes` | Standard, cross-platform, collision-resistant |
| Recursive delete | Custom rm walker | `fs.rmSync(dir, { recursive: true, force: true })` | Stable since Node 14.14, handles ENOENT, no extra dep |
| Test runner | Add vitest | `node:test` | D-04 locks this; existing suite uses it |

**Key insight:** Phase 4 is mostly "don't reinvent the npm publish flow." The whole point of the e2e test is that the npm machinery (`npm pack`, `npm install`, `bin` linking) is what you're verifying, so use it directly rather than simulating it.

## Common Pitfalls

### Pitfall 1: Scoped packages default to private
**What goes wrong:** First `npm publish` fails with `402 Payment Required` ("You must sign up for private packages").
**Why it happens:** Any package whose name starts with `@scope/` is treated as private by default; the registry assumes you wanted a paid private package and refuses to publish it publicly.
**How to avoid:** Set `publishConfig.access = "public"` in `package.json` (verified by D-03/D-10 and npm docs at docs.npmjs.com/cli/v10/configuring-npm/package-json#publishconfig). Alternative is `npm publish --access public` on the CLI, but baking it into `package.json` makes the publish reproducible.
**Warning signs:** Error message mentions `private packages` or `402` during `npm publish`.

### Pitfall 2: `bin` mapping uses package name not bin command
**What goes wrong:** After renaming to `@xgent-ai/gomad`, users assume `npx @xgent-ai/gomad` runs the CLI but they have to use `npx @xgent-ai/gomad gomad` or just `gomad` after install.
**Why it happens:** `bin` field key (`"gomad": "bin/gomad-cli.js"`) is the **command name**, not the package name. `npx @xgent-ai/gomad` looks up the package, then runs the bin entry whose name matches the package's last path segment (`gomad`), so it does work — by coincidence — because the bin name matches.
**How to avoid:** Keep the bin key as `"gomad"`. Do **not** change it to `"@xgent-ai/gomad"`. After install, the local `node_modules/.bin/gomad` symlink will exist. [VERIFIED: D-02 in CONTEXT.md, npm docs npm-package-json/#bin]
**Warning signs:** `command not found: gomad` after install, or `bin` field renamed during the rename diff.

### Pitfall 3: `npm pack` includes more than `files` whitelist suggests
**What goes wrong:** Tarball ships `.git/`, `node_modules/`, `.planning/`, or `BMAD/` — bloats download size, may leak local-only content.
**Why it happens:** npm always includes a default set (`package.json`, `README.md`, `LICENSE`, `CHANGELOG.md`, the `bin` script, the `main` entry) plus everything matched by `files`. It also honors `.npmignore` and `.gitignore`. If neither exists, certain dotfiles still slip through.
**How to avoid:** Run `npm pack --dry-run` once during execution and inspect the output. The `files` array is the allowlist (`["bin/", "assets/", "catalog/", "tools/", "README.md"]` per D-13) but always verify. If anything unexpected appears, surface as a deviation per D-13.
**Warning signs:** Tarball size > ~5 MB without explanation, `.planning/` or `BMAD/` in dry-run output.

### Pitfall 4: `install()` returns silently on failure
**What goes wrong:** A subprocess `gomad install` exits 0 even when installation aborted (no lockfile, no asset content).
**Why it happens:** `tools/installer.js:174-188` uses `console.log` + `return` rather than throwing or `process.exit(1)` for the "no selections" and "no asset content" failure paths. The CLI handler in `bin/gomad-cli.js:24-27` `await`s the function and never sets exit code.
**How to avoid:** The e2e test must assert on **filesystem state** (e.g., `existsSync('.claude/agents')` and non-empty), not on subprocess exit code. Optionally, the test can assert that the stdout contains the success banner ("Installed N files") to catch the silent-success case. **Do not "fix" installer.js exit codes in this phase** — that's a behavior change outside Phase 4 scope.
**Warning signs:** A green test that passed despite no `.claude/` being created.

### Pitfall 5: tmp fixture leaks on test failure
**What goes wrong:** Crashed tests leave `gomad-e2e-*` directories in `/tmp` that accumulate over time.
**Why it happens:** Cleanup logic placed inside the `it()` block instead of an `after()` hook never runs if an assertion throws first.
**How to avoid:** Use `after()` (or `afterEach()`) hook, which `node:test` guarantees to run. Pair with `fs.rmSync(dir, { recursive: true, force: true })` — `force: true` swallows ENOENT so a missing dir doesn't cause secondary failure.
**Warning signs:** Tmp dir growing over multiple test runs, or `EEXIST` errors on subsequent runs.

### Pitfall 6: `npm install <tarball>` requires a `package.json` in cwd
**What goes wrong:** `npm install /path/to/tarball.tgz` from an empty dir fails with `ENOENT: no such file or directory, open ... package.json` or installs into the npm global location.
**Why it happens:** npm requires a `package.json` in the current directory to know where to install. Without one, it walks up the tree looking for one.
**How to avoid:** Write a stub `package.json` (`{ "name": "gomad-e2e-fixture", "version": "0.0.0", "private": true }`) before running `npm install`. The example test already does this. [VERIFIED: npm-install(1)]
**Warning signs:** Test fails immediately on the install step, error references package.json.

### Pitfall 7: First publish to a non-existent npm scope
**What goes wrong:** `npm publish` fails with `404 Not Found` because the `@xgent-ai` scope/org doesn't exist on npmjs.com yet.
**Why it happens:** Publishing under a scope requires either (a) the scope is your username, or (b) the scope is an organization you belong to. npm does not auto-create scopes.
**How to avoid:** Before the first publish (deferred to post-merge per CONTEXT.md "out of scope"), the user must either create the `xgent-ai` org on npmjs.com or confirm they own that scope. **Flag for user — see Open Questions Q3.** Phase 4 itself does not run `npm publish`, so this is a heads-up for the manual step after merge.
**Warning signs:** `404` on first publish. Not blocking for Phase 4 implementation.

## Code Examples

### Example 1: Reading the tarball name from `npm pack` output
```javascript
// Source: npm-pack(1) docs — last line of stdout is the tarball filename
const packOutput = execSync('npm pack --silent', {
  cwd: PROJECT_ROOT,
  encoding: 'utf8',
}).trim();
const tarballName = packOutput.split('\n').pop().trim();
// e.g. "xgent-ai-gomad-1.0.0.tgz"
```

### Example 2: Cross-platform fixture cleanup
```javascript
// Source: node:fs docs — rmSync stable since Node 14.14
import { rmSync, existsSync } from 'node:fs';

after(() => {
  if (fixtureDir && existsSync(fixtureDir)) {
    rmSync(fixtureDir, { recursive: true, force: true });
  }
});
```

### Example 3: Calling the installed CLI directly (avoid `npx`)
```javascript
// Source: npm bin linking convention — node_modules/.bin/<bin-key>
const cliPath = join(fixtureDir, 'node_modules', '.bin', 'gomad');
execSync(`"${cliPath}" install --preset full --yes`, {
  cwd: fixtureDir,
  encoding: 'utf8',
  timeout: 60_000,
});
```

## Package.json Diff (exact before/after)

**Before** (verified at `package.json:1-40`):
```json
{
  "name": "gomad",
  "version": "0.1.0",
  "description": "GOMAD Orchestration Method for Agile Development — curated Claude Code skills, agents, rules, hooks, and commands",
  "type": "module",
  "bin": {
    "gomad": "bin/gomad-cli.js"
  },
  "scripts": {
    "test": "node --test 'test/test-*.js'",
    "curate": "node tools/curator.js",
    "lint": "npx eslint ."
  },
  ...
}
```

**After** (the only changes are `name`, `version`, `description` polish, and a new `publishConfig` block):
```json
{
  "name": "@xgent-ai/gomad",
  "version": "1.0.0",
  "description": "One command installs curated Claude Code skills, agents, rules, hooks, and commands into your project's local .claude/ directory.",
  "type": "module",
  "bin": {
    "gomad": "bin/gomad-cli.js"
  },
  "publishConfig": {
    "access": "public"
  },
  "scripts": {
    "test": "node --test 'test/test-*.js'",
    ...
  },
  ...
}
```

**Diff summary:**
1. `name`: `"gomad"` → `"@xgent-ai/gomad"`
2. `version`: `"0.1.0"` → `"1.0.0"`
3. `description`: rewrite per D-09 (exact wording at executor's discretion; example above)
4. **NEW** `publishConfig`: `{ "access": "public" }` (placement near top, before `scripts`, is npm convention)
5. `bin`: **unchanged** (do not rename the `gomad` key)
6. `files`: **unchanged** per D-13
7. `repository` / `homepage` / `bugs`: **not added** per D-11

**Validation step the planner must include:** after the edit, run `npm pack --dry-run` and inspect the output. Expected contents are limited to: `package.json`, `README.md`, everything under `bin/`, everything under `assets/`, everything under `catalog/`, everything under `tools/`. Anything else is a deviation per D-13.

## TST-04 Wording Cleanup

D-05 says "Update REQUIREMENTS.md TST-04 wording from 'All tests pass with vitest' to 'All tests pass with the project test runner (`npm test`)'. Update CLAUDE.md's stale vitest mentions in the same edit."

**Verified locations of literal `vitest` in canonical planning + project files** (grep results, project files only — not BMAD docs, not `.claude/`):

| File | Line | Current Text | Action |
|------|------|--------------|--------|
| `.planning/REQUIREMENTS.md` | 45 | `- [ ] **TST-04**: All tests pass with vitest` | Replace with `All tests pass with the project test runner (\`npm test\`)` per D-05 |
| `.planning/PROJECT.md` | 20 | `- ✓ 35 unit tests with vitest — existing` | Replace `vitest` with `node --test` |
| `.planning/ROADMAP.md` | 30 | `4. All tests pass with vitest after renaming (test files reference gomad, not mobmad)` | Replace `vitest` with `the project test runner` (Phase 1 success criterion — historical, but should still be corrected for consistency) |
| `.planning/ROADMAP.md` | 80 | `4. Full test suite passes with vitest (all 20 requirements verified)` | Replace `vitest` with `the project test runner` (this is Phase 4's own success criterion in ROADMAP) |
| `CLAUDE.md` (project root) | — | **No matches** | **No-op** — see Open Questions Q1 |

**Files NOT in scope** (do not edit, regardless of grep hits):
- `.claude/get-shit-done/**` — third-party GSD tool templates, not gomad source
- `BMAD/**` — vendored BMAD docs, not gomad source (and Phase 3 should have removed BMAD coupling but the docs directory still exists)
- `.planning/phases/01-rename/**`, `.planning/phases/03-bmad-decoupling/**` — historical phase artifacts, do not edit
- `catalog/skills.yaml:223-224` — this is the catalog entry for the *vitest* skill itself (a skill that gomad ships for users who use vitest in their own projects). This is **legitimate, intended content** — do not delete.
- `catalog/presets.yaml:27` — `vitest` listed as a skill in the `full-stack` preset; same reason. Do not delete.

## Expected `.claude/<subdir>` Paths After `--preset full --yes`

Derived by reading `tools/installer.js:19-24` (the `ASSET_DIRS` map) and `assets/` directory contents (verified non-empty for all four).

| Source (in tarball) | Target (under fixture `.claude/`) | Expected non-empty? |
|---------------------|-----------------------------------|---------------------|
| `assets/rules/`     | `.claude/rules/`                  | YES (verified: contains `common`, `cpp`, `csharp`, `golang`, `java`, ...) |
| `assets/commands/`  | `.claude/commands/`               | YES (per Phase 2 architecture) |
| `assets/agents/`    | `.claude/agents/`                 | YES (verified: contains `api-documenter.md`, `architect.md`, ...) |
| `assets/hooks/`     | `.claude/scripts/hooks/`          | YES — note the **nested** target path (verified: contains `check-hook-enabled.js`, `config-protection.js`, ...) |

**Additional files that MUST exist after install:**
- `<fixtureDir>/.claude/.gomad-manifest.yaml` — written by `saveManifest()` at `installer.js:139-142,213`
- `<fixtureDir>/gomad.lock.yaml` — written by `writeLockfile()` at `curator.js:186-194`

**CRITICAL: there is NO `.claude/skills/` directory.** Despite the `full` preset description ("Everything — all 165 skills..."), the `assets/` directory has no `skills/` subdirectory and `installer.js` `ASSET_DIRS` does not list one. The skills catalog (`catalog/skills.yaml`) exists for curation/lockfile purposes, but no skill *files* ship in the tarball. **Do not assert `.claude/skills/` exists** — that assertion will always fail. This is a Phase 2/3 architecture fact, not a Phase 4 bug. [VERIFIED: `assets/` directory listing returned only `agents commands hooks rules`; `tools/installer.js:19-24` confirms only those four asset types]

If the user expected `.claude/skills/` to be populated, that's a separate scope question — flag as Open Question Q4.

## Cleanup Pattern for Tmp Fixture

```javascript
import { rmSync, existsSync } from 'node:fs';
import { after } from 'node:test';

let fixtureDir;
let tarballPath;

// Setup writes both fixtureDir and tarballPath
// before(() => { ... });

// Cleanup runs unconditionally — node:test guarantees `after` runs
// even if `it` blocks throw.
after(() => {
  if (fixtureDir && existsSync(fixtureDir)) {
    rmSync(fixtureDir, { recursive: true, force: true });
  }
  if (tarballPath && existsSync(tarballPath)) {
    rmSync(tarballPath, { force: true });
  }
});
```

**Why `after` and not `try/finally`:** `node:test` lifecycle hooks are guaranteed to run regardless of test outcome. A `try/finally` inside an `it()` body works too, but the hook approach scales better if more than one `it` block is added later.

**Why `force: true`:** swallows `ENOENT` so a partial-setup failure (where the dir was never created) doesn't double-fault during cleanup.

## Recommended Timeout / Runtime Expectations

| Step | Expected duration | Hard timeout |
|------|-------------------|--------------|
| `npm pack` (cwd: PROJECT_ROOT) | 2–10 s | 60 s |
| `npm install <tarball>` (cwd: tmp fixture, fresh node_modules) | 5–30 s | 90 s |
| `gomad install --preset full --yes` (copies all assets to `.claude/`) | 2–15 s | 60 s |
| Filesystem assertions + cleanup | < 1 s | (no separate timeout) |
| **Total e2e test wall time** | **10–60 s typical** | **120 s describe-level** |

**Setting the timeout:** `node:test` accepts a `timeout` option in the `describe`/`it` options object since Node 20.4 (verified by `node:test` API docs). For Node 18 compatibility (CLAUDE.md requires `>=18.0.0`), pass `--test-timeout=120000` to the `node --test` invocation, or wrap the test in a per-test `t.timeout` call. Recommended: use the options-object form (works on Node 20+) and document the Node 20+ requirement, OR add `--test-timeout=120000` to the `npm test` script.

**Should this test be gated behind an env var?** The user did not request gating, and total wall time is ≤60 s typical. Recommendation: do **not** gate. Run it as part of `npm test` so it catches regressions on every commit. If runtime becomes a problem in CI, gate later behind `GOMAD_E2E=1` — easy to add.

## Open Questions

1. **Q1 — D-05 says "update CLAUDE.md's stale vitest mentions" but CLAUDE.md has zero literal vitest references.**
   - What we know: `grep -i vitest CLAUDE.md` returns no matches (verified). The actual stale mentions are in `.planning/PROJECT.md`, `.planning/ROADMAP.md`, and `.planning/REQUIREMENTS.md`.
   - What's unclear: did the user mean those files, or is there a CLAUDE.md edit I'm missing (e.g., a cached version)?
   - Recommendation: planner treats D-05 as covering the four `.planning/*.md` line edits documented in §"TST-04 Wording Cleanup". CLAUDE.md edits = none. Surface this to the user during plan review.

2. **Q2 — `node:test` `timeout` option support on Node 18.**
   - What we know: `engines.node` is `">=18.0.0"`. The `describe(...,  { timeout: N }, fn)` form is documented for Node 20.4+.
   - What's unclear: whether the same option silently no-ops on Node 18 or whether it errors.
   - Recommendation: the safest path is to add `--test-timeout=120000` to the `test` script in `package.json` so it works on Node 18+. Alternatively, bump `engines.node` to `>=20.4.0`. Flag for user; default to script-flag approach to avoid bumping the engine.

3. **Q3 — Does the `@xgent-ai` npm org/scope exist?**
   - What we know: scoped packages require either the scope to be your npm username or an org you belong to. CONTEXT.md treats `npm publish` as out of scope (manual after merge).
   - What's unclear: whether the org has been created on npmjs.com.
   - Recommendation: not a Phase 4 blocker (publish is post-merge), but flag to user as a precondition for the manual publish step. Phase 4 plans should not include "verify scope exists" as a task; it's a pre-publish checklist item.

4. **Q4 — `--preset full` description claims "165 skills" but `assets/` ships zero skill files.**
   - What we know: `assets/skills/` does not exist; `tools/installer.js` `ASSET_DIRS` has no `skills` entry; `catalog/presets.yaml` `full` preset says `description: "Everything — all 165 skills, 48 agents, 70 commands, 36 hooks"`.
   - What's unclear: was this an intended Phase 2/3 design decision (skills are catalog-only metadata, not shipped files) or a regression?
   - Recommendation: out of scope for Phase 4 — the e2e test verifies what the installer actually does, not what the preset description claims. But flag to user as a follow-up question. The preset description may need a wording update in a later phase.

5. **Q5 — Phase 4 success criteria in ROADMAP.md mention "Full test suite passes with vitest".**
   - This will be fixed by the §"TST-04 Wording Cleanup" edits. No separate action needed — flagged here so the planner knows the criterion text itself is being rewritten as part of Phase 4 deliverables.

## Sources

### Primary (HIGH confidence)
- `package.json` (project root) — verified current state lines 1–40
- `bin/gomad-cli.js:1-60` — verified CLI install command shape, dynamic import path, no exit-code handling
- `tools/installer.js` (entire file) — verified ASSET_DIRS map, install() flow, manifest path, lockfile path, silent-failure paths
- `tools/curator.js:97-101,186-194` — verified non-interactive `--preset --yes` path and lockfile location
- `catalog/presets.yaml:1-7` — verified `full` preset has `include_all: true`
- `test/test-installation.js` (entire file) — verified existing test pattern with `node:test`, `node:assert/strict`, `child_process.execSync`, 30s timeout convention
- `assets/` directory listing — verified four subdirs (`agents commands hooks rules`), no `skills` subdir
- `assets/agents/`, `assets/rules/`, `assets/hooks/` listings — verified non-empty with sample filenames
- `CLAUDE.md` (project root, in-conversation contents) — verified no literal vitest references; verified tech stack, naming conventions, and "no global writes" constraint
- `.planning/phases/04-publish-and-verify/04-CONTEXT.md` (entire file) — verified all 13 decisions
- `.planning/REQUIREMENTS.md:36-45,91-97` — verified PUB-01/02/03, TST-04 wording, traceability
- `.planning/ROADMAP.md:72-85` — verified Phase 4 goal and success criteria
- Grep results for `vitest` across the project — verified the four `.planning/*.md` locations and confirmed CLAUDE.md absence

### Secondary (MEDIUM confidence — citations from training, not fetched in-session)
- `[CITED: docs.npmjs.com/cli/v10/configuring-npm/package-json#publishconfig]` — `publishConfig.access: "public"` is the documented mechanism for first-publish of a scoped package without paying for private packages.
- `[CITED: docs.npmjs.com/cli/v10/commands/npm-pack]` — `npm pack` writes the tarball to the current directory by default and prints the filename on stdout.
- `[CITED: docs.npmjs.com/cli/v10/commands/npm-publish#access]` — alternative is `npm publish --access public`.
- `[CITED: nodejs.org/api/test.html]` — `node:test` `before`/`after` hooks run unconditionally; `timeout` option supported in `describe`/`it` since v20.4.
- `[CITED: nodejs.org/api/fs.html#fsrmsyncpath-options]` — `rmSync` with `recursive: true, force: true` is stable since v14.14.0 and swallows ENOENT.

### Tertiary (LOW confidence — none used)
None — every claim above is either filesystem-verified or cited to canonical npm/node docs.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies; existing built-ins verified against existing test files
- Architecture (e2e test pattern): HIGH — example code maps directly to verified `installer.js` and `curator.js` behavior
- Pitfalls: HIGH — pitfalls 1, 2, 4, 6 verified against codebase; 3, 5, 7 are well-known npm/test pitfalls cited from npm docs
- Package.json diff: HIGH — current state read directly from disk
- TST-04 cleanup: HIGH — exact line numbers from grep
- Asset assertions: HIGH — derived from `installer.js` and confirmed by `assets/` directory listing

**Research date:** 2026-04-07
**Valid until:** 2026-05-07 (30 days — npm CLI behavior is stable, asset structure won't change between phases)

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | `node:test` (built-in, Node ≥18.0.0) |
| Config file | none — invoked via `node --test 'test/test-*.js'` in `package.json` `scripts.test` |
| Quick run command | `npm test` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PUB-01 | package.json publishable (name/version/access) | unit | new test in `test/test-publish-e2e.js` (or extend `test-installation.js`) — assert `pkg.name === '@xgent-ai/gomad'`, `pkg.version === '1.0.0'`, `pkg.publishConfig.access === 'public'` | ❌ Wave 0 (new file) |
| PUB-02 | `npx gomad install` works on fresh project | e2e | `npm test` (runs the new e2e test) | ❌ Wave 0 (new file) |
| PUB-03 | `--preset full --yes` non-interactive works | e2e | same e2e test (uses exactly that flag combo) | ❌ Wave 0 (new file) |
| TST-04 | All tests pass with project test runner | meta | `npm test` exits 0 | ✅ existing |

### Sampling Rate
- **Per task commit:** `npm test` (full suite — runtime is ~60s with the new e2e test)
- **Per wave merge:** `npm test`
- **Phase gate:** `npm test` green + manual `npm pack --dry-run` review + `npm test` includes the new e2e test

### Wave 0 Gaps
- [ ] `test/test-publish-e2e.js` — covers PUB-02, PUB-03 (and inline metadata assertions for PUB-01)
- [ ] OR a small `test-package-metadata.js` for PUB-01 unit assertions (planner's call — single file is fine, splitting is also fine)
- [ ] `package.json` `scripts.test` may need `--test-timeout=120000` flag (see Open Question Q2)

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | npm publish auth is manual, post-merge — out of phase scope |
| V3 Session Management | no | n/a |
| V4 Access Control | no | n/a |
| V5 Input Validation | no | no new user-input surfaces in this phase |
| V6 Cryptography | no | n/a |
| V14 Configuration | yes | `publishConfig.access: "public"` is a config-correctness concern, covered by D-03/D-10 |

### Known Threat Patterns for npm publish

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Accidentally shipping secrets in tarball | Information Disclosure | `files` allowlist (already in place per D-13); `npm pack --dry-run` review |
| Shipping `.git/`, `.env`, or other sensitive dotfiles | Information Disclosure | `files` allowlist + dry-run review |
| Typosquat / scope confusion | Spoofing | Use scoped name `@xgent-ai/gomad`; do not also publish unscoped `gomad` |
| Bin script with executable bit missing | DoS | npm pack preserves executable bit on `bin/gomad-cli.js`; e2e test transitively verifies (the test would fail at the exec step if bit were missing) |
| Tarball contains tarballs (recursion) | Bloat | `files` array does not include `*.tgz`, and the new e2e test cleans up its `.tgz` after itself |

**Phase 4 specific:** the e2e test itself is a security control — it catches the entire class of "tarball is broken" bugs that could otherwise result in publishing a tarball that doesn't actually work.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `node` ≥18 | runtime, test runner | (assumed yes — repo already runs) | — | — |
| `npm` | `npm pack`, `npm install <tarball>` in e2e test | (assumed yes — repo already uses) | — | — |
| Network | `npm install <tarball>` may fetch transitive deps; `npm publish` (out of scope) | depends on CI environment | — | If transitive deps already cached, e2e works offline. Worst case, planner can pre-warm cache. Flag if CI is air-gapped. |

**Note on transitive deps:** `@xgent-ai/gomad` depends on `@clack/prompts`, `commander`, `yaml`, `fs-extra`, `chalk`. When the e2e test runs `npm install <tarball>` in a fresh fixture, npm will fetch these from the registry. If the test must run offline, the planner should add `--offline` or `--prefer-offline` flags and document the cache pre-warm step. **Recommended:** start with online (no flag), only add offline support if CI requires it.

---

## RESEARCH COMPLETE

**Phase:** 4 - Publish and Verify
**Confidence:** HIGH

### Key Findings
- **One new test file** (`test/test-publish-e2e.js`) covers PUB-02 and PUB-03 via tarball-based install. Full executable example included in §"Pattern 1".
- **Three small `package.json` edits**: name → `@xgent-ai/gomad`, version → `1.0.0`, add `publishConfig: { access: "public" }`, polish description. The `bin` field key stays `"gomad"`. Diff shown verbatim in §"Package.json Diff".
- **`.claude/skills/` does NOT exist after install** — only `rules`, `commands`, `agents`, and `scripts/hooks`. The e2e test must NOT assert on a `skills/` subdir. Verified against `assets/` listing and `installer.js` `ASSET_DIRS`.
- **`installer.js` has silent-failure paths** that return without setting a non-zero exit code. The e2e test must assert on **filesystem state**, not exit codes. Do not "fix" `installer.js` in this phase.
- **CLAUDE.md has zero literal vitest references.** D-05's "update CLAUDE.md vitest mentions" is a no-op for that file; the stale mentions actually live in `.planning/PROJECT.md:20`, `.planning/ROADMAP.md:30,80`, and `.planning/REQUIREMENTS.md:45`. Flagged as Open Question Q1.
- **Recommended e2e test budget**: 120s describe-level timeout, ~10–60s typical wall time. Add `--test-timeout=120000` to the `npm test` script for Node 18 compatibility.
- **No new dependencies needed** — entire e2e test uses Node built-ins (`node:test`, `node:assert/strict`, `node:child_process`, `node:fs`, `node:os`, `node:path`, `node:crypto`).

### File Created
`.planning/phases/04-publish-and-verify/04-RESEARCH.md`

### Confidence Assessment
| Area | Level | Reason |
|------|-------|--------|
| Standard Stack | HIGH | Zero new deps; built-ins verified against existing test files |
| Architecture (e2e pattern) | HIGH | Example code maps 1:1 to verified installer.js and curator.js behavior |
| Pitfalls | HIGH | Codebase-verified for installer.js exit-code, bin mapping, asset structure; npm-doc-cited for publishConfig and pack/install behavior |
| Package.json diff | HIGH | Current state read directly from disk |
| TST-04 cleanup | HIGH | Exact line numbers from grep |
| Asset assertions | HIGH | Derived from installer.js source + confirmed by assets/ listing |

### Open Questions (flagged for user — see §"Open Questions")
1. D-05 mentions CLAUDE.md vitest edits, but CLAUDE.md has none. Treat as `.planning/*.md` edits only?
2. `node:test` `timeout` option may not work on Node 18 — use `--test-timeout=120000` script flag instead?
3. Does `@xgent-ai` npm scope/org actually exist on npmjs.com? Not a Phase 4 blocker (publish is manual post-merge).
4. `--preset full` description claims 165 skills but no skill files ship in `assets/`. Intentional or follow-up?
5. ROADMAP.md Phase 4 success criterion text itself uses "vitest" — fixed as part of TST-04 cleanup.

### Ready for Planning
Research complete. Planner can now create PLAN.md files. Recommended plan structure: (1) one plan for the package.json + planning-doc edits, (2) one plan for the new e2e test file. Both can run in either order; the e2e test does not depend on the rename.
