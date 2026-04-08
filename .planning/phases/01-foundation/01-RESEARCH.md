# Phase 1: Foundation - Research

**Researched:** 2026-04-08
**Domain:** npm package metadata, dead code removal, codebase cleanup
**Confidence:** HIGH

## Summary

Phase 1 is a non-behavioral change phase: update `package.json` identity fields, rename scripts, remove dead code (external module system, bundler references), and delete unused translations/docs. The codebase is a CommonJS Node.js project with no TypeScript compilation step, so changes are straightforward file edits and deletions.

The primary risk is the ExternalModuleManager removal, which touches three files (`official-modules.js`, `installer.js`, `custom-modules.js`) plus test mocks -- more than the CONTEXT.md D-16 explicitly lists. The dependency audit also surfaced three unused production dependencies (`xml2js`, `@kayvan/markdown-tree-parser`, `ignore`) that should be removed.

**Primary recommendation:** Execute in two waves -- (1) package.json metadata + script renames + dead dep removal, (2) external module system removal + doc/translation cleanup. Wave 2 is higher risk due to code restructuring.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** `name` -> `@xgent-ai/gomad`, `version` -> `1.1.0`
- **D-02:** `description` -> `"GOMAD Orchestration Method for Agile Development"`
- **D-03:** `keywords` -> `["gomad", "agile", "ai", "agents", "orchestrator", "development", "methodology"]` (drop `bmad`, add `gomad` first)
- **D-04:** `repository.url` -> `git+https://github.com/xgent-ai/gomad.git`
- **D-05:** `author` -> `Rockie Guo <rockie@kitmi.com.au>`
- **D-06:** `homepage` -> `https://gomad.xgent.ai`, `bugs.url` -> `https://github.com/xgent-ai/gomad/issues`
- **D-07:** `publishConfig.access` -> `"public"` (already set -- verify preserved)
- **D-08:** `bin` -> `{ "gomad": "tools/installer/gomad-cli.js" }` -- remove both `bmad` and `bmad-method` aliases entirely
- **D-09:** `main` -> `tools/installer/gomad-cli.js`
- **D-10:** Scripts renamed: `bmad:install` -> `gomad:install`, `bmad:uninstall` -> `gomad:uninstall`, `install:bmad` -> `install:gomad`
- **D-11:** Delete dead `rebundle` script
- **D-12:** Full audit of `dependencies` and `devDependencies` -- remove unused
- **D-13:** Check for v1.0.0 leftover deps
- **D-14:** Delete `tools/installer/external-official-modules.yaml`
- **D-15:** Delete `tools/installer/modules/external-manager.js`
- **D-16:** Clean restructure `official-modules.js` -- remove ExternalModuleManager import, constructor, fallback branches
- **D-17:** Confirm `tools/installer/bundlers/` does NOT exist. Delete `rebundle` script. Grep for remaining bundler references and remove.
- **D-18:** Delete `README_VN.md`
- **D-19:** Delete `docs/cs/`, `docs/fr/`, `docs/vi-vn/`

### Claude's Discretion
- Exact order of operations within each plan (as long as deps are correct)
- Whether to split the dependency audit into its own plan or combine with package.json edits
- How to handle any edge cases discovered during the external module cleanup

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PKG-01 | `package.json` name is `@xgent-ai/gomad` and version is `1.1.0` | Direct field edits in package.json; verified current values (`bmad-method`, `6.2.2`) |
| PKG-02 | description, keywords, repository URL, author reflect gomad identity | All current values documented; exact replacements specified in D-01 through D-06 |
| PKG-03 | `bin` field exposes `gomad` binary pointing to `tools/installer/gomad-cli.js` | Current bin has `bmad` and `bmad-method` both pointing to `bmad-cli.js`; NOTE: `gomad-cli.js` does not exist yet (Phase 2 FS-04 creates it), so bin/main will be temporarily broken |
| PKG-04 | Scripts renamed (`gomad:install`, `gomad:uninstall`, `install:gomad`); `rebundle` removed | Three scripts to rename, one to delete; `rebundle` references non-existent `tools/installer/bundlers/bundle-web.js` |
| PKG-05 | `publishConfig: { access: "public" }` is set | Already present -- verify preserved during edits |
| SLIM-01 | External modules YAML + consumer code + references deleted | ExternalModuleManager used in 3 files + test mocks (see Architecture Patterns) |
| SLIM-02 | No builder/web bundle source/assets remain | `tools/installer/bundlers/` confirmed non-existent; `.bundler-temp` refs in eslint/coderabbit configs are cleanup targets |
| SLIM-03 | `README_VN.md` deleted | File confirmed present |
| SLIM-04 | `docs/cs/`, `docs/fr/`, `docs/vi-vn/` deleted | All three directories confirmed present |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- **Casing**: Display form is "GoMad" (not "Gomad"). Lowercase `gomad` for package names/paths/CLI. Uppercase `GOMAD` for acronym expansion only.
- **Branch**: All v1.1 work on `next` branch (current branch).
- **Scope discipline**: v1.1 is rename + slim down + credit + branding. No new agent/skill work.
- **Tech stack**: Node.js / JavaScript (`type: module` inherited from BMAD). No language change.
- **License**: BMAD MIT preserved byte-identical. GoMad additions also MIT.
- **Trademark**: `bmad-*` -> `gm-*` skill rename is trademark-safety requirement (Phase 2, not this phase).

## Architecture Patterns

### ExternalModuleManager Removal Scope (CRITICAL)

D-16 in CONTEXT.md mentions only `official-modules.js`, but research found ExternalModuleManager is used in **three source files plus tests**: [VERIFIED: codebase grep]

| File | Usage | Cleanup Required |
|------|-------|-----------------|
| `tools/installer/modules/official-modules.js` (L7, L11, L215) | Import, constructor init, `findExternalModuleSource()` fallback | Remove import, constructor line, fallback branch in `findModuleSource()` |
| `tools/installer/core/installer.js` (L14, L20, L447, L1151, L1159) | Import, constructor init, `hasModule()` check in cache logic, passed to `assembleQuickUpdateSources()`, `listAvailable()` for quick-update | Remove import, constructor line, all 4 usage sites |
| `tools/installer/modules/custom-modules.js` (L205-208, L281) | Receives `externalModuleManager` as parameter in `assembleQuickUpdateSources()`, calls `hasModule()` | Remove parameter from signature, remove `isExternal` check block |
| `test/test-installation-components.js` (L1821-1822) | Mocks `installer.externalModuleManager.hasModule` and `.listAvailable` | Remove mock setup lines |

### Cleanup Pattern

For each ExternalModuleManager removal site, the pattern is:
1. Remove the `require('./external-manager')` import
2. Remove `this.externalModuleManager = new ExternalModuleManager()` from constructor
3. Remove or simplify conditional branches that call externalModuleManager methods
4. Where external modules were added to available modules lists, remove that aggregation logic
5. Update function signatures that accepted externalModuleManager as a parameter

### Bundler Reference Cleanup

Beyond `package.json scripts.rebundle` (D-11/D-17), there are `.bundler-temp` ignore patterns in: [VERIFIED: codebase grep]
- `eslint.config.mjs` line 34: `'.bundler-temp/**'`
- `.coderabbit.yaml` line 58: `"!.bundler-temp/**"`
- `.augment/code_review_guidelines.yaml` line 45: `".bundler-temp/**"`

These are low-risk cosmetic cleanups -- the directory does not exist. Remove them for cleanliness.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JSON editing of package.json | Manual string manipulation | `npm pkg set` or direct JSON edit with Prettier formatting | Prettier is configured with `prettier-plugin-packagejson` and will reorder/format correctly |
| Verifying package.json fields | Manual file reading | `npm pkg get name`, `npm pkg get version` etc. | CLI verification matches success criteria exactly |

## Dependency Audit Findings

### Unused Production Dependencies (REMOVE) [VERIFIED: codebase grep]

| Package | Listed In | Actually Imported | Verdict |
|---------|-----------|-------------------|---------|
| `xml2js` | dependencies | Nowhere in source or tools | REMOVE -- was for legacy XML import; external-manager.js (being deleted) was the likely consumer context |
| `@kayvan/markdown-tree-parser` | dependencies | Nowhere in source or tools | REMOVE -- likely used by removed builder features |
| `ignore` | dependencies | Nowhere (only `ignore` as JS keyword appears) | REMOVE -- was likely used by bundler/builder features |

### Used Production Dependencies (KEEP) [VERIFIED: codebase grep]

| Package | Used In |
|---------|---------|
| `@clack/core`, `@clack/prompts` | `tools/installer/prompts.js` |
| `chalk` | Multiple installer files |
| `commander` | `tools/installer/bmad-cli.js` |
| `csv-parse` | `tools/installer/ide/_config-driven.js`, `tools/validate-file-refs.js`, `manifest-generator.js` |
| `fs-extra` | Throughout installer |
| `glob` | Multiple tool files |
| `js-yaml` | Multiple tool files |
| `picocolors` | `tools/installer/prompts.js` (dynamic import) |
| `semver` | `tools/installer/bmad-cli.js` |
| `yaml` | Throughout installer |

### Dev Dependencies (ALL USED) [VERIFIED: codebase grep]

All devDependencies are used by the build/lint/test/docs pipeline. `sharp` is an implicit Astro dependency for image optimization. `yaml-lint` is used via `npx` in `tools/installer/yaml-format.js`.

## Common Pitfalls

### Pitfall 1: Broken bin/main pointing to non-existent file
**What goes wrong:** D-08 sets `bin` to `tools/installer/gomad-cli.js` and D-09 sets `main` to the same path, but this file does not exist until Phase 2 (FS-04 renames `bmad-cli.js` to `gomad-cli.js`).
**Why it happens:** Phase 1 updates metadata before Phase 2 does the actual file rename.
**How to avoid:** Accept this as a known temporary breakage between phases. `npm run gomad:install` will also fail since D-10 renames the script but it still calls `node tools/installer/bmad-cli.js` internally. The scripts should point to the current filename (`bmad-cli.js`) in Phase 1, or the bin/main update should be deferred to Phase 2.
**Warning signs:** `npm run gomad:install` fails, `npx gomad` fails.

**RECOMMENDATION:** In Phase 1, update `bin` and `main` to point to the EXISTING file (`tools/installer/bmad-cli.js`) with the NEW names (`gomad` binary name). Phase 2 will update the path when the file is actually renamed. This keeps the CLI functional between phases. Alternatively, keep `bin` pointing to `bmad-cli.js` in Phase 1 and only change the binary name from `bmad`/`bmad-method` to `gomad`. [ASSUMED]

### Pitfall 2: Script rename breaks internal references
**What goes wrong:** Renaming `bmad:install` -> `gomad:install` in scripts might break any CI or documentation that references the old script names.
**Why it happens:** Cross-references in docs, GitHub Actions, or README.
**How to avoid:** Grep for `bmad:install`, `bmad:uninstall`, `install:bmad` across the entire repo before removing old names.
**Warning signs:** CI failures, broken docs.

### Pitfall 3: Incomplete ExternalModuleManager removal leaves dangling references
**What goes wrong:** Removing the file but missing a reference in `installer.js` or `custom-modules.js` causes runtime `require` errors.
**Why it happens:** CONTEXT.md D-16 only mentions `official-modules.js`, but research found references in 3 files + tests.
**How to avoid:** Remove ALL references found in the Architecture Patterns section above. Run `node tools/installer/bmad-cli.js install --help` after cleanup to verify no require errors.

### Pitfall 4: Prettier reformats package.json unexpectedly
**What goes wrong:** Manual package.json edits get reformatted by `prettier-plugin-packagejson` on commit (via husky/lint-staged), potentially reordering fields.
**Why it happens:** The plugin enforces a canonical field order.
**How to avoid:** Run `npx prettier --write package.json` after edits to normalize. This is actually beneficial -- let the plugin do its job.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Custom Node.js test runner (no Jest/Vitest config found) |
| Config file | None -- tests are standalone scripts |
| Quick run command | `node test/test-installation-components.js` |
| Full suite command | `npm run test` (runs test:refs + test:install + lint + lint:md + format:check) |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PKG-01 | name and version correct | smoke | `npm pkg get name && npm pkg get version` | N/A (CLI check) |
| PKG-02 | metadata fields correct | smoke | `npm pkg get description && npm pkg get repository` | N/A (CLI check) |
| PKG-03 | bin field correct | smoke | `npm pkg get bin` | N/A (CLI check) |
| PKG-04 | scripts renamed, rebundle gone | smoke | `npm pkg get scripts` + verify no rebundle | N/A (CLI check) |
| PKG-05 | publishConfig.access is public | smoke | `npm pkg get publishConfig` | N/A (CLI check) |
| SLIM-01 | external module files gone | smoke | `test ! -f tools/installer/external-official-modules.yaml && test ! -f tools/installer/modules/external-manager.js` | N/A (file check) |
| SLIM-01 | no require references remain | unit | `node test/test-installation-components.js` | Yes (existing, needs mock removal) |
| SLIM-02 | no bundler references | smoke | `grep -r "bundler\|bundle-web\|rebundle" --include="*.js" --include="*.mjs" tools/ src/` should return nothing | N/A (grep check) |
| SLIM-03 | README_VN.md gone | smoke | `test ! -f README_VN.md` | N/A (file check) |
| SLIM-04 | translation dirs gone | smoke | `test ! -d docs/cs && test ! -d docs/fr && test ! -d docs/vi-vn` | N/A (file check) |

### Sampling Rate
- **Per task commit:** `node test/test-installation-components.js`
- **Per wave merge:** `npm run test`
- **Phase gate:** `npm run quality` (full quality suite)

### Wave 0 Gaps
None -- existing test infrastructure covers the critical path (installation components). Phase 1 changes are primarily deletions and metadata edits, testable via CLI/file checks. The existing test file at `test/test-installation-components.js` needs its ExternalModuleManager mock lines removed (L1821-1822), but no new test files are needed.

## Security Domain

This phase involves no authentication, session management, access control, input validation, or cryptographic changes. It is purely package metadata updates and dead code removal.

| ASVS Category | Applies | Rationale |
|---------------|---------|-----------|
| V2 Authentication | No | No auth code touched |
| V3 Session Management | No | No session code touched |
| V4 Access Control | No | No access control touched |
| V5 Input Validation | No | No input handling changed |
| V6 Cryptography | No | No crypto code touched |

**Only security concern:** Verify no secrets are accidentally committed when editing package.json (e.g., npm tokens). This is covered by standard pre-commit checks.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `bin` and `main` should point to existing `bmad-cli.js` in Phase 1 (not the not-yet-created `gomad-cli.js`) to keep CLI functional between phases | Pitfalls | CLI breaks between Phase 1 and Phase 2; user cannot run `npx gomad` until Phase 2 completes |
| A2 | `@kayvan/markdown-tree-parser` was used by removed builder features and is safe to remove | Dependency Audit | Removing it breaks some code path not found by grep |
| A3 | `sharp` is an implicit Astro dependency for image optimization | Dependency Audit | Removing it would break docs build |

## Open Questions (RESOLVED)

1. **Should `bin` and `main` point to `gomad-cli.js` (non-existent) or `bmad-cli.js` (existing)?** **RESOLVED 2026-04-08:** User chose staged transition. Phase 1 sets `bin.gomad` and `main` to `tools/installer/bmad-cli.js` to keep CLI functional. Phase 2 atomically renames the file AND updates these paths to `tools/installer/gomad-cli.js`. CONTEXT.md D-08 and D-09 have been revised accordingly.

2. **Should `.bundler-temp` references in config files be cleaned up in Phase 1?** **RESOLVED 2026-04-08:** Yes. Plan 02 SLIM-02 scope cleans them up in `eslint.config.mjs`, `.coderabbit.yaml`, and `.augment/code_review_guidelines.yaml`.

## Sources

### Primary (HIGH confidence)
- Codebase grep for all ExternalModuleManager references -- verified 3 source files + 1 test file
- Codebase grep for all bundler/rebundle references -- verified package.json + 3 config files + CHANGELOG
- Codebase grep for dependency usage -- verified 3 unused production deps
- Direct reading of `package.json` -- verified all current field values
- Direct file existence checks for `README_VN.md`, `docs/cs/`, `docs/fr/`, `docs/vi-vn/`, `tools/installer/bundlers/`

### Secondary (MEDIUM confidence)
- None needed -- all findings are from direct codebase investigation

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - no new libraries needed, purely editing existing files
- Architecture: HIGH - all references verified via grep, file reads confirm structure
- Pitfalls: HIGH - bin/main path issue is a concrete, verifiable risk

**Research date:** 2026-04-08
**Valid until:** 2026-05-08 (stable -- no external dependency version sensitivity)
