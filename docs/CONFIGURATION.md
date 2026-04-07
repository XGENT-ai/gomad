<!-- generated-by: gsd-doc-writer -->
# Configuration

GOMAD has **no environment variables** and **no runtime `.env` file**. All configuration
is expressed through declarative YAML catalogs that ship with the package, a per-project
lockfile that records your selections, and a manifest that tracks what was installed for
safe rollback. This document describes each configuration surface.

## Environment Variables

GOMAD reads no environment variables. There is no `.env` file in the repository and no
`process.env.*` lookups in the CLI, curator, or installer. Running `gomad` requires only
Node.js `>= 18.0.0` (enforced by `package.json` `engines.node`).

## Configuration Surfaces

GOMAD's behavior is driven by five file-based surfaces plus a small number of CLI flags:

| Surface | File / Location | Purpose | Who Writes It |
| --- | --- | --- | --- |
| Content catalogs | `catalog/*.yaml` | Declares the universe of skills, agents, commands, hooks, and presets | GOMAD package (read-only at runtime) |
| Lockfile | `gomad.lock.yaml` (project root) | Records the user's curated selections | `gomad curate` |
| Manifest | `.claude/.gomad-manifest.yaml` | Tracks every file installed, for uninstall / rollback | `gomad install` |
| Package metadata | `package.json` | GOMAD's own name, version, bin entry, and published files | Maintainers |
| CLI flags | `gomad install` arguments | Override interactive prompts | User, per invocation |

## Content Catalogs (`catalog/*.yaml`)

The `catalog/` directory is the single source of truth for everything GOMAD can install.
Catalog files are YAML and are read by the curator and installer — they are never
modified at runtime.

| File | Describes | Key Fields |
| --- | --- | --- |
| `catalog/skills.yaml` | Available Claude Code skills | `name`, `description`, `category`, `default_include` |
| `catalog/agents.yaml` | Available subagents | `name`, `description`, and agent-specific fields |
| `catalog/commands.yaml` | Available slash commands | `name`, `description` |
| `catalog/hooks.yaml` | Available PreToolUse / PostToolUse / Stop hooks | `name`, `description` |
| `catalog/presets.yaml` | Named bundles combining the above | `description`, `include_all`, `skills`, `agents`, `commands`, `hooks`, `extend`, `additional_*` |

**Categories** used in `skills.yaml` include: `language`, `framework`, `testing`,
`review`, `security`, `devops`, `content`, `tool`, `domain`, `workflow`.

**Adding a new item to a catalog:**

1. Append an entry to the relevant `catalog/*.yaml` file with the required fields
   (at minimum `name` and `description`).
2. Place the corresponding source files under `assets/` so the installer can copy them
   (`assets/rules/`, `assets/commands/`, `assets/hooks/`, or `assets/agents/` — see
   `ASSET_DIRS` in `tools/installer.js`).
3. Optionally reference the new item from one or more presets in `catalog/presets.yaml`.

## Presets (`catalog/presets.yaml`)

Presets bundle curated sets of skills, agents, commands, and hooks. The shipped presets are:

| Preset | Description |
| --- | --- |
| `full` | Everything — uses `include_all: true` to select every catalog item |
| `full-stack` | TypeScript, Python, frontend, backend, DB, DevOps (~50 skills) |
| `python-only` | Python patterns, Django, testing (~15 skills) |
| `enterprise` | Extends `full-stack` with additional languages, domain skills, and agents |
| `lean` | Core coding standards, TDD, code review, security (~20 skills) |
| `enhanced` | Extends `lean` with project agents and complementary skills |

**Preset schema fields** (observed in `catalog/presets.yaml`):

- `description` — human-readable summary
- `include_all: true` — shorthand that selects every catalog item
- `skills`, `agents`, `commands`, `hooks` — explicit lists of item names to include
- `extend: <preset-name>` — inherit from another preset as a base
- `additional_skills`, `additional_agents`, `additional_commands`, `additional_hooks` —
  merged with the base preset when `extend` is set

**Adding a new preset:** append a new key under `presets:` in `catalog/presets.yaml`
following the schema above. Every name referenced in a preset must exist in its
respective catalog file or validation tests will fail.

## Project Lockfile (`gomad.lock.yaml`)

The lockfile lives at the project root and records the exact selections the curator
produced. It is the contract between `gomad curate` and `gomad install`.

**Location:** `./gomad.lock.yaml` (resolved via `process.cwd()` in `tools/installer.js`).

**Shape** (observed from the committed lockfile):

```yaml
generated: 2026-04-07T13:06:44.007Z   # ISO timestamp
version: 0.1.0                         # lockfile schema version
skills:                                # selected skill names
  - coding-standards
  - tdd-workflow
agents:                                # selected agent names
  - architect
  - code-reviewer
commands:                              # selected command names
  - plan
  - code-review
hooks:                                 # selected hook filenames
  - check-hook-enabled.js
  - quality-gate.js
```

**Lifecycle:**

- `gomad curate` writes `gomad.lock.yaml` after interactive selection.
- `gomad install` reads it via `loadLockfile()`. If it is missing, the installer invokes
  the curator first; if `--preset` or `--yes` was supplied, it runs the curator
  non-interactively with those options.
- A corrupt or unparseable lockfile is logged as a warning and treated as absent.

**Check the lockfile into version control** so every contributor installs the same
curated set.

## Installation Manifest (`.claude/.gomad-manifest.yaml`)

The manifest is written by the installer and enables `gomad uninstall` and `gomad status`
to operate safely without touching user-authored files in `.claude/`.

**Location:** `.claude/.gomad-manifest.yaml` (relative to the project root).

**Shape** (from `tools/installer.js` `install()`):

```yaml
installed_at: 2026-04-07T13:10:00.000Z   # ISO timestamp of the install run
version: 0.1.0                            # copied from lockfile.version or "0.1.0"
files:                                    # files installed per asset type
  rules:
    - common/coding-style.md
  commands:
    - plan.md
  hooks:
    - quality-gate.js
  agents:
    - architect.md
```

**Behavior:**

- `gomad install` writes a fresh manifest on every run, capturing every file copied from
  `assets/` into `.claude/`.
- `gomad uninstall` reads the manifest and removes exactly the files it lists, then
  prunes empty directories. User-authored files inside `.claude/` are preserved.
- `gomad status` reads both the manifest and the lockfile to report installed-file counts
  and current selections.
- A missing or corrupt manifest is treated as "no installation" rather than raising an
  error.

**Asset type → target directory mapping** (from `ASSET_DIRS` in `tools/installer.js`):

| Asset Type | Source (in package) | Target (in project) |
| --- | --- | --- |
| `rules` | `assets/rules/` | `.claude/rules/` |
| `commands` | `assets/commands/` | `.claude/commands/` |
| `hooks` | `assets/hooks/` | `.claude/scripts/hooks/` |
| `agents` | `assets/agents/` | `.claude/agents/` |

## Package Metadata (`package.json`)

GOMAD's own configuration lives in `package.json` and is only relevant to maintainers
publishing the package:

| Field | Value | Purpose |
| --- | --- | --- |
| `name` | `@xgent-ai/gomad` | npm package identifier |
| `version` | `1.0.0` | Published package version |
| `type` | `module` | Enables native ESM (no build step) |
| `bin.gomad` | `bin/gomad-cli.js` | Registers the `gomad` CLI executable |
| `engines.node` | `>=18.0.0` | Minimum runtime version |
| `files` | `bin/`, `assets/`, `catalog/`, `tools/`, `README.md` | Directories included in the published tarball |
| `publishConfig.registry` | `https://registry.npmjs.org/` | Target registry for `npm publish` |
| `scripts.test` | `node --test --test-timeout=120000 'test/test-*.js'` | Runs the test suite |
| `scripts.curate` | `node tools/curator.js` | Direct curator invocation |
| `scripts.lint` | `npx eslint .` | Lint script (no project-local ESLint config file is present) |

## CLI Flags That Affect Behavior

The only commands that accept options today are `install` and `mcp` (see
`bin/gomad-cli.js`):

| Command | Flag | Argument | Effect |
| --- | --- | --- | --- |
| `gomad install` | `-p, --preset <preset>` | `full`, `full-stack`, `python-only`, `enterprise`, `lean`, `enhanced` | Runs the curator non-interactively with the named preset when no lockfile exists |
| `gomad install` | `-y, --yes` | (flag) | Skips interactive prompts; combined with an implicit `full-stack` preset if `--preset` is omitted |
| `gomad mcp` | — | `list` (default) \| `enable <name>` | Manages MCP server configurations (see below) |

`gomad curate`, `gomad status`, and `gomad uninstall` take no flags.

> Note: there is no `--global-only` flag. GOMAD is project-local only — it writes to
> `./.claude/` in the current working directory and never touches `~/` or `$HOME`.

## MCP Server Configurations

**MCP server credentials are explicitly NOT auto-installed.** GOMAD will never copy API
keys or MCP configs into your project or user directories as a side effect of
`gomad install`. Users must opt in explicitly by running:

```bash
gomad mcp enable <name>
```

In the current code (`bin/gomad-cli.js`), the `mcp` subcommand is a stub — `gomad mcp
list` and `gomad mcp enable <name>` print placeholder messages and the subcommand is
marked as "Phase 6 — not yet implemented". The opt-in-only contract is a design
guarantee: no MCP configuration will be added without the user running `gomad mcp enable`
themselves.

## Required vs Optional

Nothing is required for GOMAD to start. There are no environment variables, no secrets
to validate at startup, and no config file that must exist before the CLI will run.

- `gomad install` without a lockfile triggers the interactive curator.
- `gomad install --preset <name>` or `gomad install --yes` both bypass the prompts.
- A missing `gomad.lock.yaml` is handled gracefully (the installer runs the curator).
- A missing `.claude/.gomad-manifest.yaml` is treated as "nothing installed" by
  `gomad status` and `gomad uninstall`.

## Per-Environment Overrides

GOMAD has no dev/staging/production distinction. A project either has a lockfile or it
does not, and the lockfile determines the full installed set. If you need different
curated sets per branch or per environment, maintain separate `gomad.lock.yaml` files
on those branches — the CLI will faithfully install whichever lockfile is present in
the working directory.
