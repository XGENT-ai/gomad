---
phase: 04-publish-and-verify
plan: 01
subsystem: packaging
tags: [npm, publish, planning-docs, package.json]
dependency-graph:
  requires: [Phase 3 complete]
  provides: [publish-ready package.json, clean planning docs]
  affects: [package.json, .planning/REQUIREMENTS.md, .planning/PROJECT.md, .planning/ROADMAP.md]
tech-stack:
  added: []
  patterns: [scoped-package, publishConfig-access-public]
key-files:
  created: []
  modified:
    - package.json
    - .planning/REQUIREMENTS.md
    - .planning/PROJECT.md
    - .planning/ROADMAP.md
decisions:
  - D-01 reversed: public npm publication is now in scope
  - D-02/D-09/D-10/D-12: scoped name @xgent-ai/gomad, v1.0.0, publishConfig.access=public, description mentions curated Claude Code assets + project-local
  - D-11: repository/homepage/bugs deferred (not added)
  - D-13: files whitelist unchanged
metrics:
  duration: ~6 min
  completed: 2026-04-07
requirements: [PUB-01, TST-04]
---

# Phase 4 Plan 01: Public npm publish prep + planning-doc cleanup Summary

Configured package.json for first-publish to public npm as `@xgent-ai/gomad@1.0.0` and scrubbed stale `vitest` references from canonical planning docs.

## What Changed

### package.json

| Field | Before | After |
|-------|--------|-------|
| name | `gomad` | `@xgent-ai/gomad` |
| version | `0.1.0` | `1.0.0` |
| publishConfig | (absent) | `{ "access": "public" }` |
| description | "GOMAD Orchestration Method for Agile Development — curated..." | "One command installs curated Claude Code skills, agents, rules, hooks, and commands into your project's local .claude/ directory." |
| bin.gomad | `bin/gomad-cli.js` | `bin/gomad-cli.js` (UNCHANGED — CLI command name preserved) |
| files | `["bin/", "assets/", "catalog/", "tools/", "README.md"]` | unchanged (D-13) |
| repository/homepage/bugs | (absent) | still absent (D-11 deferred) |

### Vitest references removed

| File | Old text | New text |
|------|----------|----------|
| .planning/REQUIREMENTS.md (TST-04) | "All tests pass with vitest" | "All tests pass with the project test runner (`npm test`)" |
| .planning/REQUIREMENTS.md (Out of Scope) | row "Public npm publication / Private registry only for now" | (removed) |
| .planning/PROJECT.md (Validated) | "35 unit tests with vitest" | "35 unit tests with node --test" |
| .planning/PROJECT.md (Active) | "Publish to private npm registry as gomad" | "Publish to public npm as @xgent-ai/gomad" |
| .planning/PROJECT.md (Out of Scope) | "Public npm publication — private registry only" | (removed) |
| .planning/PROJECT.md (Constraints) | "Registry: Publish to private npm (not public)" | "Registry: Publish to public npm as @xgent-ai/gomad" |
| .planning/PROJECT.md (Key Decisions) | "Private npm publish / Internal distribution only / — Pending" | "Public npm publish as @xgent-ai/gomad / Standalone tool, broad distribution / — Pending (Phase 4)" |
| .planning/ROADMAP.md Phase 1 SC #4 | "tests pass with vitest" | "tests pass with the project test runner (`npm test`)" |
| .planning/ROADMAP.md Phase 4 SC #4 | "test suite passes with vitest" | "test suite passes with the project test runner `npm test`" |
| .planning/ROADMAP.md 04-01 line | "clean up stale vitest mentions" | "clean up stale test-runner mentions" |

CLAUDE.md, catalog/skills.yaml, and catalog/presets.yaml were NOT touched (per 04-RESEARCH.md: no matches in CLAUDE.md; catalog entries are user-facing skill metadata, not project test config).

### npm pack --dry-run results

- Package: `@xgent-ai/gomad@1.0.0`
- Total files: 119
- Package size: 116.1 kB (well under 10 MB ceiling)
- Unpacked size: 336.0 kB
- Tarball contents: only whitelisted paths (`bin/`, `assets/`, `catalog/`, `tools/`, `README.md`, `package.json`)
- NO entries under `.planning/`, `BMAD/`, `node_modules/`, `.git/`, `.claude/`, `test/`, or any dotfile
- No `.tgz` artifacts left on disk (dry-run only)

### npm test
All 27 tests still pass (27/27, 0 fail, ~367ms).

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1    | 24c6683 | chore(04-01): configure package.json for public npm publish as @xgent-ai/gomad@1.0.0 |
| 2    | 779af50 | docs(04-01): remove stale vitest references and reverse private-npm constraint |
| 3    | (no file edits) | npm pack --dry-run verification only |

## Deviations from Plan

None — plan executed exactly as written. Task 3 surfaced no deviations from the files whitelist.

One minor in-scope extension during Task 2: the plan enumerated 6 edits but ROADMAP.md also contained a stale `vitest` mention on line 84 (Plan 04-01 description line) that the plan did not list. Per must_haves ("No literal 'vitest' references remain in ROADMAP.md"), this line was also updated. Not tracked as a deviation since it was explicitly required by the plan frontmatter.

## Open Questions

- **Scope ownership (T-04-03):** Does the `@xgent-ai` npm scope already exist and does the publisher's npm account have publish rights? This is a manual pre-publish precondition — not blocked by this plan (we only configure, don't publish).
- **Repository/homepage/bugs (D-11):** Deferred; may be added before first publish for better npmjs.com listing but not required for publish itself.

## Self-Check: PASSED

- package.json contains `@xgent-ai/gomad`, `1.0.0`, `"access": "public"` — VERIFIED via node -e
- package.json `bin.gomad` still maps to `bin/gomad-cli.js` — VERIFIED
- No `vitest` in REQUIREMENTS.md, PROJECT.md, ROADMAP.md — VERIFIED via grep
- `PROJECT.md` contains `node --test`, `@xgent-ai/gomad`, no `Public npm publication`, no `Publish to private npm` — VERIFIED
- npm pack --dry-run exit 0 with clean file listing — VERIFIED
- npm test: 27/27 pass — VERIFIED
- Commits 24c6683 and 779af50 exist in git log — VERIFIED
