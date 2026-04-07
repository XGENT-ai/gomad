# Phase 1: Rename - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-07
**Phase:** 01-rename
**Areas discussed:** Rename strategy, Legacy migration, String replacement scope, Test approach

---

## Rename Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| git mv + search-replace | Use git mv for tracked files to preserve blame history, then global search-replace | |
| Delete + create new | Delete old files, create new ones. Clean break, loses git blame history | ✓ |
| You decide | Claude picks the best approach during implementation | |

**User's choice:** Delete + create new
**Notes:** Clean break preferred over preserving blame history

### Follow-up: Commit strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Single atomic commit | One commit does all renames — simpler, no intermediate broken state | ✓ |
| Split by category | Separate commits for package.json, file renames, string replacements, test updates | |

**User's choice:** Single atomic commit

---

## Legacy Migration

| Option | Description | Selected |
|--------|-------------|----------|
| Ignore old files | gomad starts fresh — old mobmad files irrelevant since Phase 2 changes to project-local | ✓ |
| Auto-detect and rename | gomad detects mobmad.lock.yaml and renames to gomad.lock.yaml | |
| Warn and skip | Print a warning if old files exist but don't touch them | |

**User's choice:** Ignore old files

---

## String Replacement Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Everything | All JS source, tests, package.json, README, catalogs, agents, comments, logs | |
| Code + config only | JS source, tests, package.json, lockfile, manifest only | |
| Code only | Just JS source files and package.json | |

**User's choice:** Everything — including bmad references as well (custom input)
**Notes:** User wants both "mobmad" and "bmad-" prefix stripped everywhere

### Follow-up: BMAD directory/name handling

| Option | Description | Selected |
|--------|-------------|----------|
| Rename bmad to gomad prefix | bmad-analysis/ -> gomad-analysis/ | |
| Only rename mobmad | Leave bmad-* as-is for Phase 3 | |
| Rename bmad to descriptive names | bmad-analysis/ -> analysis/, drop prefix entirely | ✓ |

**User's choice:** Rename bmad to just descriptive names

### Follow-up: Agent catalog names

| Option | Description | Selected |
|--------|-------------|----------|
| Drop bmad- prefix everywhere | Catalog entries, filenames, directory names all lose bmad- prefix | ✓ |
| Keep bmad- in catalog only | Directory structure changes but YAML names stay | |

**User's choice:** Drop bmad- prefix everywhere

---

## Test Approach

| Option | Description | Selected |
|--------|-------------|----------|
| Migrate to vitest in Phase 1 | Rename + switch test runner together | |
| Rename only, keep Node test runner | Update strings, defer vitest to Phase 4 | ✓ |
| You decide | Claude picks based on complexity | |

**User's choice:** Rename only, keep Node test runner

### Follow-up: Test file names

| Option | Description | Selected |
|--------|-------------|----------|
| Internal references only | Test filenames don't contain mobmad, just update internals | |
| Review and rename if needed | Check each test file name and rename if it references mobmad | ✓ |

**User's choice:** Review and rename if needed

---

## Claude's Discretion

- Order of operations within the atomic commit
- Edge case handling in string replacement (URLs, paths in comments)

## Deferred Ideas

None
