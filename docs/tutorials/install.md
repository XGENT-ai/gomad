---
title: "Install GoMad"
description: Install @xgent-ai/gomad and run gomad install in 5 minutes.
sidebar:
  order: 1
---

Install GoMad in your project in five minutes using `npx`. By the end you'll have the persona library, knowledge packs, and slash-command launchers wired into your repo.

## What you'll learn

- Install `@xgent-ai/gomad` from npm (or run it directly via `npx`).
- Run the interactive `gomad install` flow and pick sensible defaults.
- Understand the directory layout the installer produces under `<installRoot>/_config/`.
- Verify the install by inspecting the `files-manifest.csv` and the on-disk tree.

## Prerequisites

:::note[Prerequisites]
Node.js 20+, npm 10+, and an AI IDE that supports slash commands (Claude Code, Cursor, etc.).
:::

## Quick path

:::tip[Quick path]
`npx @xgent-ai/gomad install` — accept defaults — done.
:::

## Step 1: Choose how to install

You have two options. Pick the one that matches how committed you are to keeping GoMad in this project.

**Option A — One-shot via `npx`.** Use this when you want to try GoMad without committing it to your `package.json`. Each invocation downloads the latest version.

```bash
npx @xgent-ai/gomad install
```

**Option B — Add as a dev dependency.** Use this for projects that need a pinned version. The package lives in your lockfile and the same invocation can run repeatedly via the local binary.

```bash
npm install --save-dev @xgent-ai/gomad
npx gomad install
```

Either option drops you at the same interactive installer.

## Step 2: Run the interactive installer

The installer walks through three prompts:

- **Choose install root.** The default is `_gomad`. This is the directory where persona bodies, knowledge packs, and the manifest live. Pick something else if your project conventions require it; nothing else hardcodes this path.
- **Confirm IDE target.** Claude Code, Cursor, Codex, and any other slash-command-capable IDE you have installed are auto-detected. The installer writes launcher stubs into the matching IDE directory.
- **Confirm agent selection.** Defaults to all 8 personas (analyst, tech-writer, pm, ux-designer, architect, sm, dev, solo-dev). Deselect any you don't want.

Once you confirm, the installer copies files into your repo. The artifacts it writes are:

- Persona body files at `<installRoot>/_config/agents/<shortName>.md` — the runtime source of truth for each persona.
- Domain knowledge packs at `<installRoot>/_config/kb/<slug>/` — retrieval-friendly markdown bundles.
- Slash command launcher stubs at `.claude/commands/gm/agent-*.md` — thin entry points your IDE picks up.
- The install manifest at `<installRoot>/_config/files-manifest.csv` — the record of every file the installer wrote, used for safe upgrades.

## Step 3: Verify the install

After the installer exits cleanly, the tree under your install root should look roughly like this:

```text
_gomad/
├── _config/
│   ├── agents/
│   │   ├── analyst.md
│   │   ├── architect.md
│   │   ├── dev.md
│   │   ├── pm.md
│   │   ├── sm.md
│   │   ├── solo-dev.md
│   │   ├── tech-writer.md
│   │   └── ux-designer.md
│   ├── kb/
│   │   ├── architecture/
│   │   └── testing/
│   └── files-manifest.csv
└── _backups/   # populated on subsequent installs
```

If your IDE supports slash commands, type `/gm:` to see the launcher list.

## Common questions

**Where do persona files live?** Each persona body is at `<installRoot>/_config/agents/<shortName>.md`. The launcher stubs at `.claude/commands/gm/agent-*.md` reference these bodies at runtime.

**Can I customize a persona without losing changes on upgrade?** Yes. Place a `.customize.yaml` next to the persona file; the installer respects customization fragments during cleanup. See the contributing guide for the merge contract.

**How do I upgrade?** Re-run `npx @xgent-ai/gomad install`. The cleanup planner snapshots replaced files under `<installRoot>/_backups/<timestamp>/` before writing new ones, so you can always roll back.

## Where to next

Once the install completes, run a real workflow in the [quick start tutorial](./quick-start.md) — invoke your first persona and produce a tangible artifact in five minutes.
