<!-- generated-by: gsd-doc-writer -->
# Testing

This document describes how gomad's test suite is organized, how to run it, and how to add new tests.

## Test framework and setup

gomad uses **Node.js's built-in test runner** (`node --test`) — no Jest, Vitest, or Mocha. This keeps the project's dependency surface minimal and aligned with `engines.node: ">=18.0.0"`.

- **Runner**: `node --test` (built in, no install needed)
- **Test API**: `describe` / `it` / `before` / `after` from `node:test`
- **Assertions**: `assert` from `node:assert/strict`
- **Parser**: `yaml` (already a runtime dependency) for catalog fixtures

No additional setup is required beyond `npm install` — running the test suite only needs Node.js 18 or newer.

## Running tests

The single `npm test` script runs every test file under `test/`:

```bash
npm test
```

Which expands to:

```bash
node --test --test-timeout=120000 'test/test-*.js'
```

Why `--test-timeout=120000`: the publish E2E test packs the repo, installs the resulting tarball into a throwaway fixture, and runs the CLI end-to-end. A 120-second budget leaves comfortable headroom for `npm pack` (~5–15s) plus tarball install (~10–30s) plus `gomad install` (~5–20s). The per-`describe` `{ timeout }` option requires Node 20.4+, so the runner flag is used instead to stay compatible with Node 18.

To run a single file directly:

```bash
node --test --test-timeout=120000 test/test-catalogs.js
```

To run a single test by name, use the built-in `--test-name-pattern` flag:

```bash
node --test --test-name-pattern="lean preset" test/test-presets.js
```

## Test file layout

All tests live in `test/` and follow the `test-<feature>.js` naming convention. The suite currently contains **28 tests** across 5 files:

| File | Tests | Coverage |
|---|---|---|
| `test/test-catalogs.js` | 8 | Catalog integrity — loads each YAML catalog, asserts required fields, unique skill names, valid categories, scope counts for agents, and presence of `PreToolUse` / `PostToolUse` / `Stop` hook types. |
| `test/test-presets.js` | 8 | Preset resolution — exercises a local `resolvePreset()` implementation to verify `full`, `full-stack`, `lean`, `enterprise`, `python-only`, and `enhanced` presets, including `extend` inheritance and cross-referencing every preset entry against the catalogs. |
| `test/test-installation.js` | 7 | Integration — spawns `node bin/gomad-cli.js` via `execSync` to exercise `--help`, `--version`, `status`, and `install --preset lean --yes`. Also static-asserts that `tools/installer.js` uses `process.cwd()` for `CLAUDE_DIR` and never references `homedir`, `$HOME`, or `~/.claude`, and that `tools/curator.js` writes `gomad.lock.yaml` to `process.cwd()`. |
| `test/test-decoupling.js` | 4 | BMAD decoupling guard — asserts `package.json` has no `bmad-method` dependency or `peerDependencies`, `src/module/` does not exist, no agent file under `assets/agents/` carries BMAD frontmatter (`module:`, `canonicalId:`, `bmm-` / `mob-` name prefixes), and no source file under `bin/`, `tools/`, `src/`, `test/`, `assets/`, or `catalog/` references `bmad-method`. |
| `test/test-publish-e2e.js` | 1 | Publish E2E — packs a tarball with `npm pack`, installs it into a random `os.tmpdir()` fixture with `--ignore-scripts`, runs the linked `gomad` bin with `install --preset full --yes`, and asserts that `.claude/rules`, `.claude/commands`, `.claude/agents`, `.claude/scripts/hooks`, `.claude/.gomad-manifest.yaml`, and `gomad.lock.yaml` are all written to the fixture. Cleans up the fixture and tarball in `after()`. |

## Test conventions

All gomad tests follow the same shape:

```javascript
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('Feature name', () => {
  it('does the thing', () => {
    assert.ok(condition, 'optional failure message');
    assert.equal(actual, expected);
  });
});
```

Additional conventions observed across the suite:

- **Paths** are resolved via `fileURLToPath(import.meta.url)` + `dirname(...)` and joined with `path.join`, matching the project-wide ESM idiom.
- **Catalog fixtures** are loaded by reading the real `catalog/*.yaml` files with `readFileSync` and parsing via the `yaml` package — tests run against the same data that ships to users.
- **CLI integration** uses `execSync('node ' + CLI + ' ...')` with a `timeout` option rather than library imports, so tests exercise the real `bin/gomad-cli.js` entry point.
- **Hermetic fixtures** (publish E2E) use `randomBytes(8).toString('hex')` under `os.tmpdir()` so multiple runs never collide, and `after()` hooks clean up unconditionally with `rmSync(..., { force: true })`.

## Writing new tests

1. Create a new file under `test/` named `test-<feature>.js`. The `npm test` glob (`test/test-*.js`) will pick it up automatically — no registration step.
2. Import from `node:test` and `node:assert/strict`:
   ```javascript
   import { describe, it } from 'node:test';
   import assert from 'node:assert/strict';
   ```
3. Group related tests inside a single `describe(...)` block and write one `it(...)` per behavior.
4. For tests that touch the filesystem, prefer `os.tmpdir()` with a random suffix and always clean up in `after()`.
5. For tests that shell out to the CLI, reuse the `run()` helper pattern from `test/test-installation.js` (`execSync('node ' + CLI + ' ...', { cwd, timeout })`).
6. Run `npm test` locally and confirm your new cases appear in the test count.

When touching the catalog, preset, or installer logic, add an assertion to the matching `test-catalogs.js` / `test-presets.js` / `test-installation.js` file instead of creating a new one — those files are the canonical home for their respective concerns.

## The publish E2E test

`test/test-publish-e2e.js` is the only true end-to-end test in the suite and deserves a closer look because it is the final gate before publishing a release. It implements requirements `PUB-02` and `PUB-03` from `.planning/phases/04-publish-and-verify/04-02-PLAN.md`.

The test performs a fully hermetic publish rehearsal in `before()`:

1. **Pack** — `execSync('npm pack --silent', { cwd: PROJECT_ROOT })` produces a tarball in the repo root and captures its filename from the last line of stdout.
2. **Fixture** — creates `os.tmpdir()/gomad-e2e-<16 hex chars>` (64 bits of entropy per the phase 4 threat model) and stubs a minimal `package.json` so `npm install` has something to install into.
3. **Install tarball** — `npm install --no-audit --no-fund --no-package-lock --ignore-scripts --silent "<tarball>"`. The `--ignore-scripts` flag is a defense-in-depth mitigation: it blocks any pre/post-install lifecycle scripts in the packaged tarball from running during the test.

Then in the actual test case:

4. **Run the linked bin** — invokes `<fixture>/node_modules/.bin/gomad install --preset full --yes` directly rather than going through `npx`. Existence of the symlink also proves the `bin` field in `package.json` is wired correctly.
5. **Assert filesystem state** — verifies `.claude/rules`, `.claude/commands`, `.claude/agents`, and `.claude/scripts/hooks` all exist and are non-empty, plus `.claude/.gomad-manifest.yaml` and `gomad.lock.yaml` are written. These four asset subdirectories map directly from `ASSET_DIRS` in `tools/installer.js`. There is intentionally no assertion on `.claude/skills` — the project has no `assets/skills/` source, so asserting on it would always fail.
6. **Cleanup** — `after()` hooks remove the fixture and the tarball with `force: true`; `node:test` guarantees `after` runs even on assertion failure.

Because this test is slow relative to the unit tests, it is the primary reason the suite uses `--test-timeout=120000`. If you add another test that also needs the full 120-second budget, prefer splitting it into its own file so unit-test feedback loops stay fast when you run a single file via `node --test test/test-<file>.js`.
