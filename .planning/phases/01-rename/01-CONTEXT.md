# Phase 1: Rename - Context

**Gathered:** 2026-04-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace all mobmad references with gomad across package, CLI, files, and strings. Additionally strip the "bmad-" prefix from agent directories and names. No trace of "mobmad" or "bmad-" prefix should remain anywhere in the codebase.

</domain>

<decisions>
## Implementation Decisions

### Rename Strategy
- **D-01:** Delete old files and create new ones (no git mv) — clean break, losing blame history is acceptable
- **D-02:** All renames happen in a single atomic commit — no intermediate broken states

### Legacy Migration
- **D-03:** Ignore old mobmad.lock.yaml and .mobmad-manifest.yaml files entirely — gomad starts fresh. Phase 2 changes install target to project-local anyway, making old global files irrelevant.

### String Replacement Scope
- **D-04:** Replace "mobmad" with "gomad" everywhere — JS source, tests, package.json, README, catalog YAML descriptions, agent content, comments, log strings. Zero traces.
- **D-05:** Strip "bmad-" prefix from agent directory names: bmad-analysis/ -> analysis/, bmad-planning/ -> planning/, bmad-research/ -> research/, bmad-review/ -> review/
- **D-06:** Strip "bmad-" prefix from agent names in catalog/agents.yaml: "bmad-api-documenter" -> "api-documenter", "bmad-codebase-analyzer" -> "codebase-analyzer", etc.
- **D-07:** Strip "bmad-" prefix from all references (filenames, catalog entries, module-help.csv, skill manifests) — consistent and clean

### Test Approach
- **D-08:** Keep Node.js built-in test runner for now — do not migrate to vitest in Phase 1. Vitest migration deferred to Phase 4 (TST-04).
- **D-09:** Update all internal string references in test files from mobmad to gomad
- **D-10:** Review and rename test file names if any contain "mobmad" (unlikely but check)

### Claude's Discretion
- Order of operations within the atomic commit (which files to change first)
- Handling of any edge cases in string replacement (e.g., URLs, paths in comments)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` — REN-01 through REN-06 define exact rename targets; TST-01 defines test update scope

### Codebase Structure
- `.planning/codebase/STRUCTURE.md` — Full directory layout showing all files that need renaming
- `.planning/codebase/CONVENTIONS.md` — Naming patterns and constants that reference "mobmad"

### Key Source Files
- `bin/mobmad-cli.js` — CLI entry point, must be renamed to gomad-cli.js
- `tools/global-installer.js` — Contains LOCKFILE_PATH, MANIFEST_PATH constants referencing "mobmad"
- `tools/curator.js` — References mobmad in lockfile operations
- `package.json` — name, bin, description fields
- `catalog/agents.yaml` — 48 agents, 15 with "bmad-" prefix to strip
- `src/module/module-help.csv` — Agent registry with bmad- prefixed entries

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Catalog system (skills.yaml, agents.yaml, commands.yaml, hooks.yaml) is data-driven — string replacements in YAML propagate through the system
- Test suite validates catalog integrity — renamed entries will be caught by existing tests

### Established Patterns
- Constants defined at module top: `LOCKFILE_PATH`, `CLAUDE_DIR`, `MANIFEST_PATH` — need updating
- `PROJECT_ROOT` computed from `import.meta.url` — pattern stays, just references change
- Dynamic imports in CLI: `await import('../tools/global-installer.js')` — paths need updating if tool files rename

### Integration Points
- `bin/mobmad-cli.js` is the package.json `bin` entry — must rename file AND update package.json bin field together
- `mobmad.lock.yaml` is hardcoded in curator.js as the lockfile path
- `.mobmad-manifest.yaml` is hardcoded in global-installer.js as the manifest filename

</code_context>

<specifics>
## Specific Ideas

- User wants a complete purge: zero traces of both "mobmad" AND "bmad-" prefix
- Agent directories should use plain descriptive names (analysis/, planning/, research/, review/) not gomad- prefix
- This is a cosmetic/branding phase — no behavioral changes

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-rename*
*Context gathered: 2026-04-07*
