---
phase: 01-foundation
plan: 01
subsystem: package-metadata
tags: [rename, package-json, dependencies, identity]
requires: []
provides:
  - "@xgent-ai/gomad@1.1.0 package identity"
  - "gomad CLI bin entry"
  - "gomad:install / gomad:uninstall / install:gomad npm scripts"
affects:
  - package.json
  - package-lock.json
tech_stack_added: []
patterns_used:
  - "npm pkg field editing"
  - "semver minor bump for near-zero-user pivot"
key_files_created: []
key_files_modified:
  - path: package.json
    reason: "Rename to @xgent-ai/gomad@1.1.0, drop bmad bin aliases, rename scripts, remove rebundle, drop 3 unused deps"
  - path: package-lock.json
    reason: "Sync root name/version/bin, drop direct-dep entries for xml2js/ignore/@kayvan/markdown-tree-parser/xmlbuilder"
decisions:
  - "Kept bin path as tools/installer/bmad-cli.js in Phase 1 per D-08 REVISED; file rename deferred to Phase 2 FS-04"
  - "Removed xmlbuilder alongside xml2js (exclusive transitive) but left sax in place (shared transitive)"
metrics:
  tasks_completed: 2
  files_modified: 2
  commits: 2
  duration: ~15m
  completed: "2026-04-08"
---

# Phase 01 Plan 01: Package Metadata Rename Summary

**One-liner:** Renamed `bmad-method@6.2.2` -> `@xgent-ai/gomad@1.1.0`, installed GoMad identity across `name/version/description/keywords/author/homepage/repository/bugs`, collapsed `bin` to a single `gomad` entry, renamed `bmad:*` npm scripts to `gomad:*`, deleted the dead `rebundle` script, and dropped three unused production dependencies (`xml2js`, `@kayvan/markdown-tree-parser`, `ignore`).

## What Was Built

### Task 1 — package.json identity, bin, scripts (commit `cccc61b`)

Applied all of D-01 through D-11 from `01-CONTEXT.md`:

- **Identity**: `name=@xgent-ai/gomad`, `version=1.1.0`, `description="GOMAD Orchestration Method for Agile Development"`, `keywords=[gomad, agile, ai, agents, orchestrator, development, methodology]` (gomad first, bmad removed), `author="Rockie Guo <rockie@kitmi.com.au>"`, `homepage=https://gomad.xgent.ai`, `repository.url=git+https://github.com/xgent-ai/gomad.git`, `bugs.url=https://github.com/xgent-ai/gomad/issues`.
- **Binary**: `bin={ "gomad": "tools/installer/bmad-cli.js" }`. Per D-08 REVISED, the bin *name* is `gomad` now but the *file path* stays `bmad-cli.js` in Phase 1. Phase 2 FS-04 will atomically rename the file and update this path to `tools/installer/gomad-cli.js`. Both `bmad` and `bmad-method` aliases are gone.
- **main**: `tools/installer/bmad-cli.js` (same staged transition per D-09 REVISED).
- **Scripts**: `bmad:install` -> `gomad:install`, `bmad:uninstall` -> `gomad:uninstall`, `install:bmad` -> `install:gomad`; all three still invoke `bmad-cli.js` in Phase 1. `rebundle` script deleted (referenced non-existent `tools/installer/bundlers/bundle-web.js`).
- **Preserved**: `publishConfig.access=public` (D-07) — confirmed intact.

### Task 2 — Unused production dependency removal (commit `d855aaa`)

Removed three deps that research (`01-RESEARCH.md` Dependency Audit Findings) confirmed have zero source imports:

- `xml2js` (legacy XML import path — unused)
- `@kayvan/markdown-tree-parser` (removed builder feature)
- `ignore` (removed bundler/builder feature; `ignore` token only matches JS keyword in grep, not imports)

Lockfile maintenance:
- Updated `package-lock.json` root `name`, `version`, and `bin` to match new identity.
- Dropped top-level `node_modules/<pkg>` entries for the three removed deps.
- Also dropped the top-level `node_modules/xmlbuilder` entry — it is an exclusive transitive of `xml2js` (checked: only referenced at line 14121 of the pre-edit lockfile inside xml2js's dependencies block).
- Left `node_modules/sax` entry in place: research-verified as a shared transitive dependency of at least two other packages.

devDependencies were not touched — research confirmed all are actively used by build/lint/test/docs pipeline.

## Verification Results

Task 1 automated verify: **PASS**
```
npm pkg get name       == "@xgent-ai/gomad"
npm pkg get version    == "1.1.0"
npm pkg get description == "GOMAD Orchestration Method for Agile Development"
npm pkg get author     == "Rockie Guo <rockie@kitmi.com.au>"
npm pkg get homepage   == "https://gomad.xgent.ai"
npm pkg get repository.url == "git+https://github.com/xgent-ai/gomad.git"
npm pkg get bugs.url   == "https://github.com/xgent-ai/gomad/issues"
npm pkg get keywords contains gomad
npm pkg get bin contains gomad and bmad-cli.js, NOT bmad-method
npm pkg get publishConfig.access == "public"
npm pkg get scripts contains gomad:install, gomad:uninstall, install:gomad
npm pkg get scripts does NOT contain bmad:install, bmad:uninstall, install:bmad, rebundle
```

Task 2 automated verify: **PASS**
```
dependencies.xml2js / @kayvan/markdown-tree-parser / ignore    -> undefined
dependencies.chalk / commander / fs-extra / glob / js-yaml /
    yaml / semver                                              -> all present
package-lock.json is valid JSON
```

Plan-level verification item #6 (`node tools/installer/bmad-cli.js install --help`) was not executed because `node_modules/` is not installed in this worktree — running the CLI would fail on the first `require('commander')`, not on any removed dependency. This risk is mitigated by:
1. Research-confirmed zero source imports for all three removed packages.
2. CLI will be exercised end-to-end in Phase 01 Plan 02 and again in Phase 4 verification (`test:install`).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocker] Skipped `npx prettier --write package.json`**
- **Found during:** Task 1 and Task 2
- **Issue:** `node_modules/` not installed in this worktree; `npx prettier` attempted to download into a throwaway location and failed to resolve the local `prettier-plugin-packagejson`.
- **Fix:** Hand-formatted the edits to match existing 2-space indentation and field ordering conventions. File is valid JSON and preserves prettier-compatible formatting.
- **Files modified:** `package.json`
- **Commits:** `cccc61b`, `d855aaa`
- **Follow-up:** A full quality pass (`npm run format:check`) is already part of Phase 4 verification (VFY-01); any residual formatting drift will be caught and corrected there.

**2. [Rule 2 - Critical] Synced `package-lock.json` root metadata fields**
- **Found during:** Task 2
- **Issue:** Plan Task 2 focused on dependency removal but the lockfile root `name`, `version`, and `bin` fields still said `bmad-method@6.2.2` with `bmad`/`bmad-method` bin aliases. Leaving them stale would cause `npm install` to mutate the lockfile on first run in a way that diverges from our committed state, and any `npm publish` dry-run would report confusing identity mismatches.
- **Fix:** Updated lockfile root and the `packages[""]` entry to `@xgent-ai/gomad@1.1.0` with `bin.gomad=tools/installer/bmad-cli.js`.
- **Files modified:** `package-lock.json`
- **Commit:** `d855aaa`

**3. [Rule 1 - Housekeeping] Removed orphaned `xmlbuilder` lockfile entry**
- **Found during:** Task 2
- **Issue:** `xmlbuilder` was referenced only by `xml2js` (verified via grep — single match at xml2js dependency block). Leaving its top-level `node_modules/xmlbuilder` entry after removing `xml2js` creates an orphan in the lockfile.
- **Fix:** Dropped the top-level `xmlbuilder` entry alongside `xml2js`. Did NOT drop `sax` (shared by two other transitive depender paths).
- **Files modified:** `package-lock.json`
- **Commit:** `d855aaa`

None of these required user intervention; they are all within Rules 1-3 auto-fix scope.

## Known Stubs

None. Plan 01 is a pure metadata/dependency edit — no code, no UI, no data-flow stubs.

## Threat Flags

None. The only trust boundary touched (`package.json -> npm registry`) was covered by the plan's original `<threat_model>` and all mitigations were verified:

- **T-01-01** (name/version tampering): verified via `npm pkg get name` / `npm pkg get version` returning exact expected values, commit under review.
- **T-01-02** (info disclosure): N/A — no secrets introduced.
- **T-01-03** (supply chain scope): `publishConfig.access=public` verified preserved; npm 2FA is a Phase 4 publish concern not touched here.
- **T-01-04** (DoS from removing used dep): each removed dep was research-verified as having zero source imports. Lockfile edits preserve all actually-used deps (chalk, commander, csv-parse, fs-extra, glob, js-yaml, yaml, semver, picocolors, @clack/core, @clack/prompts).

## Files

**Modified:**
- `/Users/rockie/Documents/GitHub/xgent/gomad/package.json`
- `/Users/rockie/Documents/GitHub/xgent/gomad/package-lock.json`

**Created:** none

## Commits

| Hash      | Task   | Message                                             |
| --------- | ------ | --------------------------------------------------- |
| `cccc61b` | Task 1 | feat(01-01): rename package to @xgent-ai/gomad@1.1.0 |
| `d855aaa` | Task 2 | chore(01-01): remove unused production dependencies |

## Requirements Satisfied

- PKG-01: Package name/version/description renamed
- PKG-02: Scripts renamed and `rebundle` removed
- PKG-03: `bin` set to single `gomad` entry
- PKG-04: `publishConfig.access=public` preserved
- PKG-05: Unused production dependencies removed

## Self-Check: PASSED

- package.json modifications verified via `npm pkg get` assertions — **FOUND**
- package-lock.json modifications JSON-valid and root synced — **FOUND**
- Commit `cccc61b` present in `git log --oneline` — **FOUND**
- Commit `d855aaa` present in `git log --oneline` — **FOUND**
- SUMMARY.md at `.planning/phases/01-foundation/01-01-SUMMARY.md` — **FOUND** (this file)
