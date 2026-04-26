---
title: GoMad
description: Agentic workflow framework for AI-driven agile development — opinionated agents, skills, and an installer that ships them into your AI IDE.
---

GoMad is an agentic workflow framework for AI-driven agile development. It ships eight opinionated agent personas, a library of composable skills, and an installer that lays them into your AI IDE so you can drive a structured Analysis → Planning → Solutioning → Implementation cycle without hand-rolling prompts.

## What is GoMad?

GoMad is a lean, properly-credited hard fork of [BMAD Method](https://github.com/bmad-code-org/BMAD-METHOD) that we own end-to-end. It distills the four-phase agile workflow into a small, predictable surface: each phase has a small set of `gm-*` skills, agents invoke those skills, and the installer copies them into the directories your IDE already reads.

Eight `gm-agent-*` personas cover the recurring roles in software delivery — analyst, tech-writer, pm, ux-designer, architect, scrum-master, dev, and solo-dev. They are invoked from your IDE as `/gm:agent-*` slash commands and load their persona body from your install root at runtime.

GoMad is published on npm as `@xgent-ai/gomad` and adds zero new runtime dependencies on top of BMAD's original stack. The installer is copy-only with manifest-driven upgrade cleanup, `--dry-run` previews, and timestamped backup snapshots.

## Get started

The fastest path is the install tutorial, which walks through running the interactive installer and pointing it at your project.

- [Install GoMad](./tutorials/install.md) — End-to-end installation walkthrough.
- [Quick start](./tutorials/quick-start.md) — Run your first GoMad workflow once GoMad is installed.

## Browse the docs

The docs follow the [Diataxis](https://diataxis.fr/) structure. Pick the section that matches what you are trying to do.

- [Agents reference](./reference/agents.md) — Catalog of the eight `gm-agent-*` personas and how to invoke them.
- [Skills reference](./reference/skills.md) — Catalog of the `gm-*` skills each agent can invoke.
- [Architecture](./explanation/architecture.md) — How agents, skills, and the installer fit together.
- [Contributing](./how-to/contributing.md) — Sending changes back to the GoMad repo.

## Project status

GoMad is on the v1.3 milestone (docs site, story-context skill, agent-directory relocation). Earlier v1.1 and v1.2 milestones are shipped on npm.

:::note[Live roadmap]
The authoritative roadmap lives in the repo at [.planning/ROADMAP.md](https://github.com/xgent-ai/gomad/blob/main/.planning/ROADMAP.md). It is updated as phases land and reflects the actual delivery state of the project.
:::

## Credits

GoMad is a hard fork of [BMAD Method](https://github.com/bmad-code-org/BMAD-METHOD), MIT-licensed by Brian (BMad) Madison. The full attribution and the canonical non-affiliation disclaimer live in the repository [LICENSE](https://github.com/xgent-ai/gomad/blob/main/LICENSE) and [README](https://github.com/xgent-ai/gomad/blob/main/README.md).
