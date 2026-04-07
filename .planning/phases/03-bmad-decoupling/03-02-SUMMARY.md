---
phase: 03-bmad-decoupling
plan: 02
subsystem: agents-catalog
tags: [decoupling, bmad, agents, catalog, presets, bma-04]
requires:
  - "Plan 03-01 D-07 audit (no impact, but sequenced before)"
provides:
  - "16 ex-BMAD agents as flat assets/agents/*.md files"
  - "catalog/agents.yaml entries for 16 flat-name project agents"
  - "catalog/presets.yaml enterprise/enhanced presets referencing flat names"
affects:
  - assets/agents/
  - catalog/agents.yaml
  - catalog/presets.yaml
  - test/test-presets.js
tech_stack:
  added: []
  patterns:
    - "yaml round-trip frontmatter rewrite (yaml package ^2.7.1)"
key_files:
  created:
    - assets/agents/api-documenter.md
    - assets/agents/codebase-analyzer.md
    - assets/agents/data-analyst.md
    - assets/agents/pattern-detector.md
    - assets/agents/dependency-mapper.md
    - assets/agents/epic-optimizer.md
    - assets/agents/requirements-analyst.md
    - assets/agents/technical-decisions-curator.md
    - assets/agents/trend-spotter.md
    - assets/agents/user-journey-mapper.md
    - assets/agents/user-researcher.md
    - assets/agents/market-researcher.md
    - assets/agents/tech-debt-auditor.md
    - assets/agents/document-reviewer.md
    - assets/agents/technical-evaluator.md
    - assets/agents/test-coverage-analyzer.md
  modified:
    - catalog/agents.yaml
    - catalog/presets.yaml
    - test/test-presets.js
decisions:
  - "Stripped both bmm- and mob- prefixes from agent name fields per researcher correction to D-03"
  - "Defaulted tools field to [] when source had null tools, matching code-reviewer.md template"
  - "Removed analysis/, planning/, research/, review/ subgroup comments from catalog/agents.yaml in favor of flat alphabetical sort"
  - "Recounted catalog totals on the fly: 36 global + 16 project = 52 agents (prior comment 33+15=48 was inaccurate)"
  - "Updated test/test-presets.js project-agent detection from prefix heuristic to catalog scope (Rule 1: stale heuristic broke after flat-name migration)"
metrics:
  duration_minutes: 12
  tasks_completed: 3
  files_changed: 19
  completed_at: 2026-04-07
requirements: [BMA-04]
---

# Phase 3 Plan 2: Migrate ex-BMAD Agents to Flat assets/agents/ Summary

Migrated all 16 ex-BMAD agents from `src/module/agents/{analysis,planning,research,review}/` into flat `assets/agents/` files with stripped frontmatter, then rewrote `catalog/agents.yaml` and `catalog/presets.yaml` to reference the new flat names — satisfying BMA-04.

## What Was Done

### Task 1: Migrate 16 agent files (commit `b53521f`)

Wrote a one-shot Node script (`migrate-agents.mjs`, deleted after use) that for each of the 16 source files:

1. Read the source `.md` from `src/module/agents/{subdir}/{name}.md`
2. Parsed the YAML frontmatter via `yaml.parse`
3. Set `name = <flat-bare-filename>` (stripping `bmm-` / `mob-` prefixes)
4. Deleted `module`, `canonicalId`, `displayName`, `title` fields
5. Defaulted `tools` to `[]` when null/undefined
6. Stringified frontmatter with `yaml.stringify` and reconstructed `---\n{fm}---\n{body}`
7. Wrote to `assets/agents/{name}.md`

Source files in `src/module/agents/` were intentionally NOT deleted — Plan 03 removes the entire `src/module/` tree.

### Task 2: Rewrite catalog/agents.yaml (commit `5d65d0d`)

- Replaced all 16 prefixed `analysis/...`, `planning/...`, `research/...`, `review/...` entries with flat unprefixed names
- Sorted the project-scope block alphabetically
- Removed the `# analysis/`, `# planning/`, etc. subgroup comments (no longer accurate with flat names)
- Updated section header from `(15)` to `(16)`
- Recounted globals (36) and project (16) and corrected the trailer to `# Total: 52 agents (36 global + 16 project)` — the prior `48 (33+15)` was off by four

### Task 3: Update presets.yaml + fix stale test heuristic (commit `ae3f1bc`)

- Stripped subdir prefixes from `enterprise.additional_agents` (16 entries)
- Stripped subdir prefixes from `enhanced.additional_agents` (16 entries; left `doc-updater`, `docs-lookup`, `refactor-cleaner` untouched)
- Cross-checked every preset entry resolves to a `name:` in `catalog/agents.yaml`
- Fixed `test/test-presets.js:101` whose `a.includes('/')` heuristic for "project agents" broke after flat-name migration. Replaced with catalog-scope-based detection.

## Verification

| Check | Result |
|---|---|
| `ls assets/agents/*.md \| wc -l` | 22 (6 existing + 16 new) |
| `grep -E "^name: (bmm\|mob)-" assets/agents/*.md` | no matches |
| catalog/agents.yaml `yaml.parse` round-trip | OK, 52 entries |
| catalog/agents.yaml has all 16 flat names | OK |
| catalog/agents.yaml has no `analysis/`, `planning/`, `research/`, `review/` prefixed names | OK |
| catalog/presets.yaml `yaml.parse` round-trip | OK |
| `enterprise.additional_agents` contains all 16 flat names | OK |
| `enhanced.additional_agents` contains all 16 flat names | OK |
| Every preset entry resolves to existing catalog agent | OK |
| `npm test` | 37/37 passing |
| `src/module/agents/` source files preserved | OK (4+7+2+3=16 source files intact) |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] test/test-presets.js stale prefix-based heuristic**
- **Found during:** Task 3 verification (`npm test`)
- **Issue:** `test/test-presets.js:101` filtered project agents via `a.includes('/')`. After Task 2/3 stripped the subdir prefixes from agent names, this heuristic returned 0 matches and the `enhanced extends lean and includes project agents` test failed (`expected 10+ project agents, got 0`).
- **Fix:** Changed the filter to use `catalog/agents.yaml` `scope: project` membership — the canonical source of truth that survives the flat-name migration.
- **Files modified:** `test/test-presets.js`
- **Commit:** `ae3f1bc` (combined with Task 3)

**2. [Rule 2 - Critical] Inaccurate catalog count comments**
- **Found during:** Task 2 catalog edit
- **Issue:** Plan said original counts were `(15)` and `33 global + 15 project = 48`, but actual file had 36 global agents and the project block has 16 entries, not 15.
- **Fix:** Updated the trailer to `# Total: 52 agents (36 global + 16 project)` based on programmatic recount via `yaml.parse`.
- **Files modified:** `catalog/agents.yaml`
- **Commit:** `5d65d0d` (combined with Task 2)

## Commits

- `b53521f` — feat(03-02): migrate 16 ex-BMAD agents to flat assets/agents/
- `5d65d0d` — feat(03-02): rewrite catalog/agents.yaml to flat agent names
- `ae3f1bc` — feat(03-02): update presets to flat agent names + fix stale test heuristic

## Self-Check: PASSED

- All 16 files in `assets/agents/` exist (verified via `ls assets/agents/*.md | wc -l == 22`)
- Commits `b53521f`, `5d65d0d`, `ae3f1bc` exist in `git log`
- `npm test` passes (37/37)
- Source files under `src/module/agents/` still present for Plan 03 to delete
