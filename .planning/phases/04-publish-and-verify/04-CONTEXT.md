# Phase 4: Publish and Verify - Context

**Gathered:** 2026-04-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Configure gomad for npm publication as `@xgent-ai/gomad` and verify `npx @xgent-ai/gomad install` works end-to-end on a fresh project, both interactively and non-interactively. Satisfies PUB-01, PUB-02, PUB-03, TST-04.

In scope: package.json publish metadata, scoped name rename, automated end-to-end install test via `npm pack`, alignment of TST-04 wording with reality, README touch-ups required for publish.

Out of scope: actually running `npm publish` (this phase configures + verifies; real publish is a manual step after merge), CI/CD automation, post-publish monitoring, changelog generation tooling.

</domain>

<decisions>
## Implementation Decisions

### Distribution Direction (CHANGE FROM PROJECT.md)
- **D-01:** Publish to **public npm** (not private) under the scoped name **`@xgent-ai/gomad`**. This is a deliberate reversal of two PROJECT.md entries: the "Public npm publication" Out of Scope item and the "Registry: Publish to private npm" constraint. Both must be updated at the next phase transition.
- **D-02:** Package name changes from `gomad` → `@xgent-ai/gomad`. The CLI binary command stays `gomad` (the `bin` field key is unchanged: `{ "gomad": "bin/gomad-cli.js" }`).
- **D-03:** Scoped public packages default to restricted access on npm. Add `publishConfig: { access: "public" }` so the first publish does not fail. This is mandatory, not optional.

### Test Framework Alignment (TST-04)
- **D-04:** Keep the current `node --test` runner. Do NOT migrate to vitest. The current `test/test-*.js` files already use `node:test` API and pass.
- **D-05:** Update REQUIREMENTS.md TST-04 wording from "All tests pass with vitest" to "All tests pass with the project test runner (`npm test`)". Update CLAUDE.md's stale vitest mentions in the same edit.

### End-to-End Verification (PUB-02, PUB-03)
- **D-06:** Add an automated end-to-end test (e.g. `test/test-publish-e2e.js`) that:
  1. Runs `npm pack` in the repo root to produce a tarball.
  2. Creates a fresh fixture project under `os.tmpdir()` with a minimal stub `package.json`.
  3. Installs the packed tarball into that fixture (`npm install <tarball>`).
  4. Runs `npx gomad install --preset full --yes` inside the fixture.
  5. Asserts `./.claude/` exists in the fixture and is populated with expected asset directories (skills, agents, rules, hooks, commands).
  6. Cleans up the tmp fixture in a finally block.
- **D-07:** Fixture lives in `os.tmpdir()` with a randomized name (e.g. `gomad-e2e-<random>`). No fixture is committed to `test/fixtures/`. The test must clean up regardless of pass/fail.
- **D-08:** This single test covers both PUB-02 (install works on fresh project) and PUB-03 (`--preset full --yes` non-interactive works), since `--preset full --yes` is the exact invocation under test.

### Package Metadata
- **D-09:** Update package.json `description`. The current text is fine in spirit but should be polished for the npm registry listing — planner/executor decides exact wording, must mention "curated Claude Code skills/agents/rules/hooks/commands" and "project-local install".
- **D-10:** Add `publishConfig: { access: "public" }` to package.json (see D-03).
- **D-11:** Do NOT add `repository`, `homepage`, or `bugs` fields in this phase. User explicitly opted out. (Can be added later if registry listing needs it; not blocking publish.)
- **D-12:** Bump version from `0.1.0` directly to **`1.0.0`** for the first publish. No release-candidate stage.

### Files Whitelist
- **D-13:** Keep the current `files` array as-is: `["bin/", "assets/", "catalog/", "tools/", "README.md"]`. No additions. Planner should still run `npm pack --dry-run` once during execution to confirm the tarball contents are sane (no junk, nothing missing); if anything obviously wrong is found, surface as a deviation rather than silently expand the list.

### Claude's Discretion
- Exact wording of the polished package.json `description` (D-09).
- Exact assertion set in the e2e test for what counts as "populated `.claude/`" (D-06.5) — match what `--preset full` actually installs based on `catalog/presets.yaml`.
- Whether to use `node:fs/promises` vs `fs-extra` in the e2e test — match existing test conventions.
- Whether the e2e test should also assert exit code 0 of the install subprocess (recommended yes, but not explicitly required).
- README polish needed for npm listing — minor touch-ups OK, no rewrite.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project planning
- `.planning/PROJECT.md` — vision, constraints. **NOTE:** Two entries are being reversed by this phase (see D-01); this phase will update PROJECT.md at transition time.
- `.planning/REQUIREMENTS.md` — PUB-01, PUB-02, PUB-03 acceptance criteria; TST-04 (which this phase rewords per D-05).
- `.planning/ROADMAP.md` §"Phase 4: Publish and Verify" — goal and success criteria.

### Prior phase context
- `.planning/phases/03-bmad-decoupling/03-CONTEXT.md` — Phase 3 decisions establishing `assets/` + `catalog/` + project-local `.claude/` as the install surface that Phase 4 must verify.
- `.planning/phases/02-project-local-install/02-CONTEXT.md` — Phase 2 decisions establishing `./.claude/` as the install destination (the thing the e2e test asserts on).

### Code touchpoints
- `package.json` — name (rename to `@xgent-ai/gomad`), version (→ 1.0.0), description, add `publishConfig.access`.
- `bin/gomad-cli.js` §22-23 — `--preset` and `--yes` flags already exist; e2e test relies on them.
- `tools/global-installer.js` — the `install()` implementation under test by the e2e flow.
- `tools/curator.js` — preset resolution path exercised by `--preset full`.
- `catalog/presets.yaml` — defines what `full` includes; e2e test assertions derive expected assets from here.
- `test/test-*.js` — existing test suite shape, conventions to match in `test-publish-e2e.js`.
- `CLAUDE.md` — stale vitest mentions to update (D-05).

### npm publish references
- npm docs §publishConfig — for `access: "public"` requirement on scoped packages.
- npm docs §npm pack — for tarball-based local install testing pattern used in D-06.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `bin/gomad-cli.js` `--preset` + `--yes` flags (lines 22-23): already wired, no work needed. The e2e test invokes these directly.
- `tools/global-installer.js` `install()`: already does project-local install per Phase 2 — the function under test, no behavior change required.
- `test/test-installation.js`: existing pattern for spawning install in a tmp dir; e2e test should follow this shape.
- `catalog/presets.yaml`: source of truth for what `full` preset includes — e2e test reads this to compute expected assertions.

### Established Patterns
- All tests use `node:test` API directly (`import { test } from 'node:test'`) — keep this pattern in the new e2e test.
- `package.json` `files` array (not `.npmignore`) controls what ships — already in place.
- Async file ops via `fs-extra` and `node:fs/promises` mixed — match local file conventions.

### Integration Points
- The published tarball (`@xgent-ai/gomad-1.0.0.tgz` from `npm pack`) is the integration point: e2e installs it like a real user would, then exercises the CLI surface.
- Renaming `gomad` → `@xgent-ai/gomad` is contained to package.json `name`. The `bin` mapping is keyed on the binary command name (`gomad`), not the package name, so `npx @xgent-ai/gomad install` and the `gomad` command both keep working.

</code_context>

<specifics>
## Specific Ideas

- Scope chosen: **`@xgent-ai`** (user-specified). Package: `@xgent-ai/gomad`.
- "Public npm first" — user wants the package on the public registry as the primary distribution channel, reversing the earlier private-only constraint.
- Test runner stays as `node --test` (no vitest migration) because the actual test files already use `node:test`.
- Direct jump to `1.0.0` — user is comfortable signaling stability now that Phases 1-3 have rebranded, retargeted, and decoupled the tool.

</specifics>

<deferred>
## Deferred Ideas

- **`repository`, `homepage`, `bugs` fields** — explicitly skipped this phase per D-11. Can be added in a future polish phase or before the next minor release.
- **CI/CD publish automation** — out of scope. First publish will be a manual `npm publish` after this phase merges.
- **Provenance / SLSA attestation** (`npm publish --provenance`) — not in scope, would require GitHub Actions OIDC setup.
- **Changelog tooling / release notes** — out of scope.
- **README rewrite for npm landing** — only minor polish allowed in this phase, no full rewrite.
- **PROJECT.md reversal of Out-of-Scope and Constraints entries** — must happen at phase transition, not inside this phase's plans.

</deferred>

---

*Phase: 04-publish-and-verify*
*Context gathered: 2026-04-07*
