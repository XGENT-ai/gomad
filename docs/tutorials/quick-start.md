---
title: "Quick Start"
description: Run your first GoMad workflow — invoke a persona, produce a draft PRD in 5 minutes.
sidebar:
  order: 2
---

Run your first GoMad workflow end-to-end. You'll invoke the Product Manager persona, draft a PRD, and see how the launcher-form slash command + persona body resolution actually works. Plan on five minutes from slash command to inspecting the artifact on disk.

## What you'll learn

- Invoke a `gm-agent-*` persona via slash command.
- Understand how the launcher loads the persona body at runtime.
- Produce your first artifact (a draft PRD).
- Know where to find the agents reference and where to go next.

## Before you start

:::note[Before you start]
You've completed the [install tutorial](./install.md). The `_gomad/` directory exists with `_config/agents/` populated.
:::

## Step 1: Pick a persona

GoMad ships 8 personas grouped across the four phases of work — analysis, planning, solutioning, and implementation. Each persona has a slash command you trigger from your IDE, a body file the launcher loads at runtime, and a set of skills it knows how to invoke.

For this walkthrough, pick `gm-agent-pm` — John, the Product Manager. He's a planning-phase persona whose primary skill (`gm-create-prd`) produces a PRD draft, which is exactly the kind of small, tangible artifact we want from a five-minute tour. The two files that matter for John on disk are:

```text
<installRoot>/_config/agents/pm.md       # persona body (loaded at runtime)
.claude/commands/gm/agent-pm.md          # launcher stub (slash command target)
```

Browse the full catalog in the [agents reference](../reference/agents.md) when you're ready to pick a different persona.

You don't need to memorize the file paths. They're shown here so you can confirm the install actually wired things up; once you trust the install, the slash command is all you'll touch day-to-day.

## Step 2: Invoke the persona

Trigger John from your IDE's slash-command palette:

```text
/gm:agent-pm
```

The launcher stub at `.claude/commands/gm/agent-pm.md` resolves the slash command, then loads the persona body from `<installRoot>/_config/agents/pm.md` on each invocation. That indirection is the contract: launchers stay tiny and IDE-friendly while the persona body remains the single source of truth, even after upgrades.

When John picks up, he greets you in character, lists his capabilities (PRD creation, validation, edits, brainstorming, brief authoring), and waits for direction. He won't break character or jump ahead — every step is yours to drive.

## Step 3: Drive your first workflow

Now ask John for an artifact. Type a prompt that names the skill and gives a tiny scope so the demo finishes inside five minutes:

> Use the `gm-create-prd` skill to draft a PRD for a daily-summary email feature.

John loads `gm-create-prd` and walks the PRD interview. `gm-create-prd` is a task skill, not a persona — it has no slash command of its own. You invoke it through the persona that owns it, which is exactly the pattern you'll use for every implementation skill.

Answer his questions briefly. The prompt scope you gave (daily-summary email) is small enough that the interview wraps up quickly. When John finishes, he writes the PRD draft to the path your project's planning convention dictates — typically a markdown file under your project's planning directory.

If a question doesn't apply, say "skip" or "not in scope" and John moves on. If you don't know an answer, say so plainly — he'd rather have an explicit "unknown" in the PRD than a fabricated detail.

## Step 4: Inspect the artifact

Open the PRD draft John produced. It's a regular markdown file, sectioned into goals, functional requirements (FR-NN format), Given/When/Then acceptance criteria, and an explicit `## Out of Scope` block. Nothing magical — just plain markdown that downstream skills (and humans) can read.

The artifact is the merge of three inputs: the persona body's instructions, the skill's template, and your prompt. See the [architecture explainer](../explanation/architecture.md) for how the runtime resolves all three on each invocation.

The PRD also doubles as the input contract for the rest of the workflow. Downstream skills like architecture, epic-and-story creation, and implementation readiness checks all consume the same FR-NN requirements and Given/When/Then acceptance criteria you just produced.

## What you got

In one short session you produced:

- Your first persona invocation — a slash command resolved through the launcher to the persona body.
- Your first task skill loaded — `gm-create-prd`, invoked through the persona that owns it.
- Your first artifact written — a draft PRD in markdown, ready to feed the rest of the workflow.

## Where to next

Three good follow-ups, in increasing depth. Browse the [skills reference](../reference/skills.md) for the full catalog of task skills you can invoke through any persona. Read the [architecture explainer](../explanation/architecture.md) to understand the 4-phase lifecycle and how launchers, persona bodies, and skills compose at runtime. When you're ready to extend GoMad with your own skills or persona tweaks, see [contributing](../how-to/contributing.md).
