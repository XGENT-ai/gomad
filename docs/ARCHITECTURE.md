<!-- generated-by: gsd-doc-writer -->
# Architecture

## System Overview

GOMAD is a Node.js CLI tool that installs curated Claude Code assets — rules, commands,
hooks, and agents — into a project's local `./.claude/` directory. It follows a simple
layered pipeline: the CLI parses user intent, a catalog layer defines the available
assets and bundled presets, a curator resolves selections (interactively or from a
preset) into a lockfile, and an installer copies the selected asset files from the
package's bundled `assets/` directory into `./.claude/` under the current working
directory. All operations are project-local — GOMAD never writes to the user's home
directory.

## Component Diagram

```
                ┌──────────────────────┐
                │  bin/gomad-cli.js    │  (commander entry point)
                │  install · curate    │
                │  status  · uninstall │
                │  mcp                 │
                └──────────┬───────────┘
                           │ dynamic import
             ┌─────────────┴──────────────┐
             ▼                            ▼
   ┌──────────────────┐          ┌──────────────────┐
   │ tools/curator.js │          │ tools/installer  │
   │ (selection)      │          │ .js (file copy)  │
   └────────┬─────────┘          └─────┬────────────┘
            │ reads                     │ reads
            ▼                           ▼
   ┌──────────────────┐          ┌──────────────────┐
   │ catalog/*.yaml   │          │ assets/{rules,   │
   │ skills, agents,  │          │ commands, hooks, │
   │ commands, hooks, │          │ agents}/         │
   │ presets          │          └─────┬────────────┘
   └────────┬─────────┘                │ cpSync
            │ writes                    ▼
            ▼                  ┌──────────────────────┐
   ┌──────────────────┐        │ ./.claude/           │
   │ gomad.lock.yaml  │───────▶│  rules/              │
   │ (project root)   │  read  │  commands/           │
   └──────────────────┘        │  scripts/hooks/      │
                               │  agents/             │
                               │  .gomad-manifest.yaml│
                               └──────────────────────┘
```

## Data Flow

The typical `gomad install` request moves through the system in six steps:

1. **CLI dispatch** — `bin/gomad-cli.js` parses the `install` command with optional
   `--preset <name>` and `--yes` flags, then dynamically imports `tools/installer.js`
   and calls its exported `install(options)` function.
2. **Lockfile check** — `installer.js` looks for `gomad.lock.yaml` in the current
   working directory. If it is missing, the installer dynamically imports and invokes
   the curator to produce one.
3. **Preset resolution** — `tools/curator.js` reads the five catalog files
   (`skills.yaml`, `agents.yaml`, `commands.yaml`, `hooks.yaml`, `presets.yaml`) from
   `catalog/`. If a preset name is supplied it calls `resolvePreset()`, which supports
   both full inclusion (`include_all: true`) and inheritance via the `extend` field,
   merging `additional_*` arrays on top. Otherwise it drives an interactive
   `@clack/prompts` flow for preset choice and per-category toggles.
4. **Lockfile write** — The curator writes the resolved `{ skills, agents, commands,
   hooks }` selections, plus `generated` timestamp and `version`, to `gomad.lock.yaml`
   in the project root using `yaml.stringify`.
5. **Asset copy** — The installer iterates over the `ASSET_DIRS` map (rules,
   commands, hooks, agents), recursively collects files from `assets/<type>/` inside
   the package, and copies each file into the corresponding target under `./.claude/`
   using `fs.cpSync` with `force: true`. The strategy is a merge: existing files are
   overwritten, but files not present in the source are preserved so user
   customizations are not lost.
6. **Manifest write** — The installer records every installed file path under
   `./.claude/.gomad-manifest.yaml` along with `installed_at` and `version`. This
   manifest is the sole source of truth for `gomad uninstall`, which removes only
   listed files and then prunes any empty directories left behind.

## Key Abstractions

- **Preset** (`catalog/presets.yaml`) — A named bundle of asset selections.
  Supports three composition mechanisms: `include_all: true` (everything in every
  catalog), explicit arrays (`skills`, `agents`, `commands`, `hooks`), and inheritance
  via `extend: <other-preset>` combined with `additional_*` arrays for incremental
  additions. Resolved by `resolvePreset()` in `tools/curator.js`.
- **Catalog item** (`catalog/{skills,agents,commands,hooks}.yaml`) — A flat metadata
  record describing a single installable asset. Items carry at minimum a `name` and
  `description`; categorization fields (`category`, `type`, `scope`) drive the
  interactive per-category toggle groups via `groupByCategory()` in the curator.
- **Lockfile** (`gomad.lock.yaml`, project root) — The durable record of what the
  user selected. Written by the curator and read by the installer on every run.
  Shape: `{ generated, version, skills, agents, commands, hooks }`. Its existence
  also determines whether `gomad install` reuses prior selections or re-prompts.
- **Manifest** (`./.claude/.gomad-manifest.yaml`) — The audit trail of the last
  install, keyed by asset type to an array of installed file paths relative to each
  target directory. Loaded by `loadManifest()` and used by `uninstall()` and
  `status()` in `tools/installer.js`. Enables safe, surgical removal that only
  touches GOMAD-owned files.
- **ASSET_DIRS mapping** (`tools/installer.js`) — The static table that maps each
  catalog asset type to its `{ src, target }` directories. This is the single place
  that defines where assets live inside the package and where they land inside
  `./.claude/` (for example, `hooks` map to `./.claude/scripts/hooks/`).

## Directory Structure Rationale

The project is organized around the separation between the CLI surface, the data
catalog, the tool implementations, and the bundled asset payload. Each top-level
directory has a single responsibility so that adding a new asset type or command
touches as few places as possible.

```
gomad/
├── bin/          CLI entry point — commander command definitions only
│   └── gomad-cli.js
├── tools/        Implementation modules, dynamically imported from the CLI
│   ├── curator.js    Interactive selection + preset resolution + lockfile writer
│   └── installer.js  File copy, manifest tracking, uninstall, status
├── catalog/      Pure-data YAML layer — the catalog of installable assets
│   ├── skills.yaml
│   ├── agents.yaml
│   ├── commands.yaml
│   ├── hooks.yaml
│   └── presets.yaml
├── assets/       Bundled asset payload that gets copied into ./.claude/
│   ├── rules/
│   ├── commands/
│   ├── hooks/
│   └── agents/
├── test/         Node.js built-in test runner suite (`npm test`)
├── docs/         Project documentation (this file)
└── package.json  Declares the `gomad` bin, ESM type, and dependencies
```

- **`bin/` stays thin** — the CLI file only parses commands and delegates; all real
  work lives in `tools/` so it can be tested and imported independently.
- **`tools/` hosts exactly one module per concern** — `curator.js` for selection and
  `installer.js` for filesystem effects, matching the two phases of every install.
- **`catalog/` is pure data** — no code lives here, which lets presets and items be
  edited without touching JavaScript and keeps the data layer trivially inspectable.
- **`assets/` mirrors the target layout** — subdirectories match the keys of
  `ASSET_DIRS`, so installation is a straightforward per-type recursive copy.
- **`test/` uses Node's built-in `node --test` runner** — declared in
  `package.json` scripts, requiring no extra test framework dependency.
