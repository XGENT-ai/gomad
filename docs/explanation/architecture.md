---
title: "GoMad Architecture"
description: How GoMad's 4-phase workflow, manifest-v2 installer, and launcher-form slash commands fit together.
sidebar:
  order: 1
---

GoMad is a fork of BMAD Method that ships an opinionated agile workflow as agents and skills loaded into your AI IDE.
This page explains how its three pillars fit together — the 4-phase workflow, the manifest-driven installer, and the launcher-form slash command contract.

## Overview

GoMad is a markdown-driven agentic workflow for AI-assisted software development.
It ships a coordinated set of personas, task skills, and knowledge packs that an AI IDE loads at runtime to drive a project through analysis, planning, solutioning, and implementation.

Three pillars carry the runtime story.

- The **workflow** decides *what* you do and *when* — a sequential pipeline of phases that each consume the previous phase's output.
- The **installer** decides *how* files land in your workspace — a manifest-driven copy step that emits agent personas, task skills, and launcher stubs into a user-chosen install root.
- The **launcher** decides *how* your IDE invokes a persona — a thin slash command stub that loads the persona body fresh on every invocation.

The design constraint behind all three is deliberate: zero new runtime dependencies.
The whole system is plain markdown plus a minimal Node.js installer.
There is no hosted service, no daemon, no plugin runtime.
Your IDE's existing skill-loading machinery does the work.

## The 4-phase workflow

GoMad's workflow runs as a sequential pipeline through four phases — Analysis, Planning, Solutioning, Implementation.
Each phase consumes the artifacts of the previous one, so the order is load-bearing rather than aspirational.

**Analysis** produces discovery artifacts.
The analyst persona walks the team through brainstorming, market research, and project documentation.
The output is a set of briefs and research notes that frame the problem before any product decisions are made.

**Planning** produces requirements.
The PM and UX-designer personas turn the analysis output into a Product Requirements Document and supporting UX design specs.
These artifacts name the functional requirements (FR-NN), the acceptance criteria (Given/When/Then), and the explicit out-of-scope contract that the next phase will consume.

**Solutioning** produces an implementation plan.
The architect persona drafts an architecture document, decomposes work into epics and stories, and runs an implementation-readiness check.
That check confirms downstream skills can act on the plan without further human translation.

**Implementation** produces code, code review, and retrospectives.
The dev and SM personas drive story execution, plus the new domain knowledge framework that lets a persona retrieve curated reference material on demand.
This is where the upstream phase artifacts finally turn into committed work.

The pipeline shape matters because each phase's output is the next phase's input.
A partial brief produces a partial PRD, which produces partial architecture, which produces stuck stories.
See the [skills reference](../reference/skills.md) for the full per-phase skill catalog.

## The manifest-v2 installer

GoMad follows a generate-don't-move principle.
The source directories — `src/gomad-skills/`, `src/core-skills/`, and `src/domain-kb/` — are the canonical content.
Nothing in those directories is what the user runs against.
Instead, `gomad install` reads them and *emits* a fresh tree into the user's chosen `<installRoot>` (the project convention is `_gomad`, but the path is configurable).

Every emitted file is recorded in a manifest.
The manifest lives at `<installRoot>/_config/files-manifest.csv` and uses the v2 schema: a `schema_version` row plus per-file rows carrying `install_root`, `path`, and content metadata.
The manifest is the source of truth for what is installed — not the filesystem, not the package version, the CSV.

Subsequent `gomad install` runs are manifest-driven.
The installer reads the prior manifest, snapshots every file it is about to replace into `<installRoot>/_backups/<timestamp>/`, then writes the fresh outputs and rewrites the manifest.
If a re-install ever produces an unexpected result, the snapshot directory holds a reversible record — see the [upgrade recovery guide](../upgrade-recovery.md) for the restore procedure.

User overrides survive across reinstalls.
A `.customize.yaml` file in your install root marks specific paths as user-owned.
The installer's custom-file detector treats matching `.md` files as out-of-bounds and skips them during cleanup, so your edits are not silently overwritten.

The v1.3 install layout is deliberately flat:

```text
<installRoot>/
├── _config/
│   ├── agents/<shortName>.md
│   ├── kb/<slug>/
│   └── files-manifest.csv
└── _backups/<timestamp>/
```

## The launcher-form slash command

GoMad personas ship as three artifacts per persona, not one.

- The **persona body** at `<installRoot>/_config/agents/<shortName>.md` is the actual instructions the IDE follows when the persona is active.
- The **launcher stub** at `.claude/commands/gm/agent-<shortName>.md` is a tiny file the IDE binds to the slash command surface.
- The **slash command surface** itself, `/gm:agent-<shortName>`, is what you type.

The runtime sequence is intentionally short.
You type `/gm:agent-pm`.
Your IDE locates the launcher stub at `.claude/commands/gm/agent-pm.md`.
The launcher instructs the IDE to load the persona body fresh from `<installRoot>/_config/agents/pm.md`.
The persona greets you and lists its capabilities.
Each invocation re-reads the persona body, so updates from `gomad install` take effect on the next slash command, no restart required.

The reason this is launcher-form rather than bundled-form is decoupling.
The persona body changes whenever you re-run `gomad install` (new prompts, refined instructions, updated capability lists).
The launcher stub stays stable — it is a pointer, not a copy.
That decoupling means the user-facing slash command does not change shape across upgrades; only the content the IDE loads on the other side does.

The agent catalog is documented in the [agents reference](../reference/agents.md), which lists every persona with its slash command and primary phase.

Note that **task skills** — the per-step skills the personas use, catalogued in the [skills reference](../reference/skills.md) — are loaded by the persona, not invoked directly.
There is no `/gm:create-prd` slash command in v1.3; a task skill is triggered when an active persona's instructions tell the IDE to load it.
The slash command surface is reserved for personas only.

## How they fit together

Walk through a single concrete flow to see the three pillars cooperate.

A developer runs `gomad install` against a fresh project.
The installer emits agent personas, task skills, and launcher stubs into the v1.3 layout — `<installRoot>/_config/agents/pm.md`, `<installRoot>/_config/kb/<slug>/`, `.claude/commands/gm/agent-pm.md`, and the manifest at `<installRoot>/_config/files-manifest.csv`.

The developer types `/gm:agent-pm`.
The IDE loads the launcher stub, which tells it to load the persona body fresh.
The PM persona greets the developer and offers to drive the Planning phase.
The persona's instructions invoke task skills as needed, producing a PRD draft.
That PRD becomes the input artifact for the Solutioning phase, where the architect persona — invoked the same way — turns it into an architecture document and a story decomposition.

The pillars are independently testable but designed together.
The installer lays files.
The launcher binds slash commands to those files.
The workflow gives the slash commands a sequence to run in.
Remove any one of the three and the system fails: no installer means files never land at predictable paths; no launcher means the IDE has nothing to invoke; no workflow means the personas have no shared script for what to do next.
