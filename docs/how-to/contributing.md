---
title: "Contributing to GoMad"
description: Fork, branch, test, and open a PR — what to run before submitting.
sidebar:
  order: 1
---

Use the standard fork-and-PR workflow to contribute to GoMad. This page covers the test expectations every PR must meet before merge.

## When to use this guide

- You're proposing a new persona, skill, or domain knowledge pack.
- You're fixing a bug in the installer, in a tool under `tools/`, or in an existing skill.
- You're improving documentation or translations.

## Prerequisites

:::note[Prerequisites]
Node.js 20+, npm 10+, a GitHub account, and read access to the existing `CONTRIBUTING.md` at the repo root for the canonical PR template.
:::

## Step 1: Fork and clone

Fork [`xgent-ai/gomad`](https://github.com/xgent-ai/gomad) on GitHub (use the **Fork** button in the top-right of the repo page), then clone your fork and install dependencies:

```bash
git clone git@github.com:<your-username>/gomad.git
cd gomad
npm install
```

GoMad is a hard fork of BMAD Method, not a continuously-merged downstream — there is no upstream sync to keep in lockstep. Treat your fork as a working copy of `xgent-ai/gomad`.

## Step 2: Branch from main

Create a feature branch off `main` using a conventional prefix:

```bash
git switch -c feat/your-feature-name
```

Use `feat/` for new features, `fix/` for bug fixes, `docs/` for documentation changes, and `chore/` for tooling or config updates. Keep the branch name short and descriptive.

## Step 3: Make your change

Source-of-truth content lives under `src/gomad-skills/`, `src/core-skills/`, and `src/domain-kb/`. The installer copies these into the user's `<installRoot>/_config/` at install time — that's the generate-don't-move pattern, so always edit under `src/`, never under an installed copy.

For a new persona, add a `src/gomad-skills/<phase>/gm-agent-<short>/` directory containing `SKILL.md` (frontmatter `name:` plus `description:`) and `skill-manifest.yaml` (`displayName`, `title`, `icon`). For a new task skill, use the same directory layout under the appropriate phase, with only `SKILL.md` (no `skill-manifest.yaml` is needed for task skills). For documentation changes, edit files under `docs/` — the Starlight site picks up changes automatically.

See the [architecture explainer](../explanation/architecture.md) for how installer + workflow + launcher fit together at runtime.

## Step 4: Run the quality gate

Run the full quality chain locally before opening a PR:

```bash
npm run quality
```

The chain (defined in `package.json`) runs Prettier format check, ESLint, markdownlint, the docs build (link check + Astro build), the install + integration tests, file-reference validation, skills validation, the inject-reference-tables test, KB license validation, and the orphan-reference test. The gate must exit 0 before you open a PR.

:::caution[If a check fails]
Run the failing script in isolation (e.g., `npm run lint` or `npm run docs:build`) for focused output. Don't bypass the gate — the PR template asks you to confirm `npm run quality` passes locally.
:::

## Step 5: Open the PR

Push your feature branch to your fork, then open a pull request against `main` of `xgent-ai/gomad`. Reviewers will pull your branch, re-run `npm run quality`, and leave feedback on the diff.

PR title convention: `<type>(<scope>): <summary>` — for example, `feat(skills): add gm-domain-skill`. The PR body should reference any related issue or roadmap entry so reviewers can connect the change to its motivating context.

## What you get

- PR review feedback, typically within a few days.
- Once merged, your change ships in the next `@xgent-ai/gomad` npm release per the milestone schedule.
- Attribution in `CONTRIBUTORS.md` if your change is non-trivial.

## Where to learn more

For the runtime model — how the installer, skills, and launcher slash commands fit together — read the [architecture explainer](../explanation/architecture.md). For catalog examples, browse the [agents reference](../reference/agents.md) and the [skills reference](../reference/skills.md) to see how existing personas and skills are structured.
