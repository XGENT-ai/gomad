---
title: GoMad
description: Agentic workflow framework for AI-driven agile development
---

# GoMad

GoMad (GOMAD Orchestration Method for Agile Development) is an agentic workflow framework for AI-driven software development. It guides you through a structured pipeline of analysis, planning, solutioning, and implementation using specialized agents and composable skills. GoMad is distributed on npm as `@xgent-ai/gomad`.

GoMad is a hard fork of BMAD Method. It inherits the proven four-phase agile pipeline and extends it with xgent-ai's own agents, skills, and integrations. See [Credits](#credits) at the bottom of this page for fork origin.

## What GoMad is

GoMad treats AI agents as expert collaborators in a structured agile process. Rather than asking a model to "do the thinking" for you, GoMad's workflows bring out your best thinking in partnership with the AI.

The framework is organised around four sequential phases:

1. **Analysis** — Brainstorm, research, and scope the problem.
2. **Planning** — Produce requirements, PRDs, or specs.
3. **Solutioning** — Design the architecture and technical approach.
4. **Implementation** — Execute with agentic workflows and tight review loops.

Each phase exposes a set of `gm-*` skills that specialized agents invoke to produce concrete artifacts. Skills are composable and can be adapted per project.

## Install

```bash
npm install @xgent-ai/gomad
```

Or run the interactive installer directly via `npx`:

```bash
npx @xgent-ai/gomad install
```

Follow the installer prompts, then open your AI IDE (Claude Code, Cursor, etc.) in your project folder.

## Where to go next

These docs are organised into four Diataxis sections based on what you are trying to do:

- **[Tutorials](./tutorials/getting-started.md)** — Learning-oriented. Step-by-step guides for building something. Start here if you are new.
- **[How-To Guides](./how-to/install-gomad.md)** — Task-oriented. Practical recipes for solving specific problems.
- **[Explanation](./explanation/analysis-phase.md)** — Understanding-oriented. Deep dives into concepts, architecture, and rationale.
- **[Reference](./reference/agents.md)** — Information-oriented. Technical specifications for agents, workflows, and configuration.

## What you'll need

GoMad works with any AI coding assistant that supports custom system prompts or project context. Popular options include:

- [Claude Code](https://code.claude.com) — Anthropic's CLI tool (recommended)
- [Cursor](https://cursor.sh) — AI-first code editor
- [Codex CLI](https://github.com/openai/codex) — OpenAI's terminal coding agent

Basic familiarity with version control, project structure, and agile workflows is helpful.

## Credits

GoMad is a hard fork of [BMAD Method](https://github.com/bmad-code-org/BMAD-METHOD). See the repository README for the full attribution and the canonical non-affiliation disclaimer.
