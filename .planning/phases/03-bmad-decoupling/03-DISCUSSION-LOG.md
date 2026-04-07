# Phase 3: BMAD Decoupling - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-07
**Phase:** 03-bmad-decoupling
**Areas discussed:** Agent destination, Agent naming, src/module/ fate, package-skills.js fate

---

## Agent Destination

| Option | Description | Selected |
|--------|-------------|----------|
| Move to assets/agents/ + catalog | Relocate 16 .md files, register in catalog/agents.yaml; first-class installable items | ✓ |
| assets/agents/ but no catalog | Ship in package but not selectable via curate/preset | |
| Delete them | Drop all 16; contradicts BMA-04 | |

**Subdirectories:**
| Option | Description | Selected |
|--------|-------------|----------|
| Flatten to assets/agents/ | All 16 at one level, matches existing layout | ✓ |
| Keep analysis/planning/research/review | Preserve grouping unique to ex-BMAD | |

**User's choice:** Move to assets/agents/ + catalog, flattened.
**Notes:** Aligns fully with Phase 2 architecture.

---

## Agent Naming

| Option | Description | Selected |
|--------|-------------|----------|
| Strip mob- prefix entirely | mob-codebase-analyzer → codebase-analyzer | ✓ |
| Replace with bmm- prefix | Preserve BMAD lineage signal | |
| Keep mob- prefix | Minimum churn but leaves artifact | |

**Frontmatter:**
| Option | Description | Selected |
|--------|-------------|----------|
| Strip all BMAD fields, keep name/description | Match existing agent shape | ✓ |
| Strip only module/canonicalId | Conservative | |

**User's choice:** Full strip — prefix and BMAD frontmatter both gone.

---

## src/module/ Fate

| Option | Description | Selected |
|--------|-------------|----------|
| Delete src/module/ entirely | Removes all BMAD registration artifacts | ✓ |
| Keep src/module/skills/ as staging | Conditional on package-skills.js decision | |
| Keep all of src/module/, just delete BMAD fields | Minimal destruction | |

**src/module/skills/ specifically:**
| Option | Description | Selected |
|--------|-------------|----------|
| Delete it | Phase 2 already migrated install to assets/ | |
| Audit first, decide during execution | Defer the call | ✓ |

**User's choice:** Delete src/module/ entirely, but the skills/ subtree gets audited first by the executor before deletion.

---

## package-skills.js Fate

| Option | Description | Selected |
|--------|-------------|----------|
| Delete tool + CLI command + tests | Cleanest BMA-03 interpretation | ✓ |
| Keep as gomad package, strip BMAD only | Reduce to pure copy | |
| Delete tool, defer command/test cleanup | Mark for deletion, planner verifies | |

**Tests:**
| Option | Description | Selected |
|--------|-------------|----------|
| Delete BMAD-specific tests, add decoupling assertions | Drop obsolete + add negative guardrails | ✓ |
| Just delete the BMAD test cases | No new assertions | |

**User's choice:** Full deletion of tool, CLI command, and BMAD tests; add new decoupling assertions.

---

## Claude's Discretion

- Exact catalog/agents.yaml entry shape (categories, default_include) — match existing conventions
- Whether agent files need `tools:` declarations — match existing patterns
- Vitest test file layout — match existing test/ patterns
- Whether any preset default-includes the new agents

## Deferred Ideas

- Reorganizing catalog/agents.yaml beyond adding entries
- Preset updates for new agents
- README/docs updates explaining the 16 new agents (Phase 4)
- npm publish configuration (Phase 4)
