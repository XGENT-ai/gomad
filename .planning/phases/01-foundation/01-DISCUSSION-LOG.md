# Phase 1: Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-08
**Phase:** 01-foundation
**Areas discussed:** Package metadata details, Dependency audit scope, External module removal depth, Old binary aliases

---

## Package metadata details

| Option | Description | Selected |
|--------|-------------|----------|
| GOMAD Orchestration Method for Agile Development | Matches the acronym expansion from PROJECT.md. Clean and descriptive. | ✓ |
| GoMad — AI-driven agile development framework | More marketing-friendly, highlights the AI angle. | |
| An agentic workflow framework for AI-driven software development | Describes what it does rather than expanding the acronym. | |

**User's choice:** GOMAD Orchestration Method for Agile Development
**Notes:** Straightforward acronym expansion.

| Option | Description | Selected |
|--------|-------------|----------|
| gomad, agile, ai, agents, orchestrator, development, methodology | Drop 'bmad', add 'gomad'. Keep the rest. | ✓ |
| gomad, xgent, agile, ai-agents, workflow, development | More curated with 'xgent' brand. | |
| You decide | Claude picks reasonable keywords. | |

**User's choice:** gomad, agile, ai, agents, orchestrator, development, methodology

| Option | Description | Selected |
|--------|-------------|----------|
| homepage: `https://gomad.xgent.ai`, bugs: GitHub issues URL | Uses the planned CNAME domain. | ✓ |
| homepage: GitHub repo URL, bugs: GitHub issues URL | No custom domain until site is live. | |

**User's choice:** homepage: `https://gomad.xgent.ai`, bugs: GitHub issues URL

---

## Dependency audit scope

| Option | Description | Selected |
|--------|-------------|----------|
| Quick verify only | Confirm current deps are all used. Minimal diff. | |
| Full audit + cleanup | Check each dep against actual imports. Remove unused. | ✓ |
| You decide | Claude determines depth based on code analysis. | |

**User's choice:** Full audit + cleanup

| Option | Description | Selected |
|--------|-------------|----------|
| Runtime deps only | Focus on 'dependencies' field. | |
| Both runtime and dev | Audit everything. | ✓ |
| You decide | Claude checks both but only flags obvious issues. | |

**User's choice:** Both runtime and dev
**Notes:** Full audit of all dependency types.

---

## External module removal depth

| Option | Description | Selected |
|--------|-------------|----------|
| Minimal: remove import + calls | Delete require() and call sites. Leave class structure intact. | |
| Clean restructure | Remove imports/calls AND simplify the class — remove fallback branches entirely. | ✓ |
| You decide based on blast radius | Claude reads the full file and determines safest approach. | |

**User's choice:** Clean restructure
**Notes:** Remove ExternalModuleManager entirely and simplify official-modules.js.

---

## Old binary aliases

| Option | Description | Selected |
|--------|-------------|----------|
| Remove both, gomad only | Clean break. bin: { "gomad": "..." }. No backward compat. | ✓ |
| Keep 'bmad' as alias temporarily | Both gomad and bmad. Remove bmad in v1.2. | |
| Keep both old + new | Maximum compat but cluttered. | |

**User's choice:** Remove both, gomad only
**Notes:** v1.0.0 was a different product — no transition needed.

---

## Claude's Discretion

- Exact order of operations within each plan
- Whether to split dependency audit into its own plan or combine with package.json edits
- Edge case handling during external module cleanup
