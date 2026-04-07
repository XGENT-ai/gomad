# gomad (GOMAD Orchestration Method for Agile Development)

A CLI tool that curates and installs Claude Code skills, agents, rules, hooks, and commands into a project's `.claude/` directory. It packages 142+ skills, 48 agents, 77 rules, 70 commands, and 36 hooks with interactive selection via presets or individual curation.

## Why gomad?

gomad gives any project a curated, project-local Claude Code environment. Pick a preset, customize per-item, and deploy the same setup across machines or share it with your team.

**One command** (`npx gomad install`) sets up everything without touching your global config.

## Prerequisites

- Node.js >= 18
- [Claude Code](https://claude.ai/code) CLI installed

## Quick Start

```bash
# Install
npm install gomad

# Interactive: choose a preset, toggle individual skills
npx gomad install

# Non-interactive: pick a preset and go
npx gomad install --preset full-stack --yes
```

## Presets

| Preset | Skills | Description |
|--------|--------|-------------|
| `full` | 142 | Everything -- all skills, agents, hooks, commands |
| `full-stack` | ~50 | TypeScript, Python, frontend, backend, DB, DevOps |
| `python-only` | ~15 | Python patterns, Django, testing |
| `enterprise` | ~100 | All languages + healthcare + supply chain domains |
| `lean` | ~20 | Core coding standards, TDD, code review, security |
| `enhanced` | ~25 | 16 planning/analysis agents + complementary skills |

## CLI Commands

```
gomad install [options]   Install module and assets to .claude/
  -p, --preset <name>     Use a preset (full, full-stack, python-only, enterprise, lean, enhanced)
  --global-only           Install only global assets (rules, hooks, commands, agents)
  -y, --yes               Skip interactive prompts, use defaults

gomad curate              Interactively select skills, agents, and hooks
gomad package             Package selected skills with manifests
gomad sync                Populate global/ from ~/.claude/ based on lockfile
gomad status              Show what is currently installed
gomad update              Re-apply module with latest content
gomad uninstall --global  Remove global assets, restore backups
gomad mcp list            List available MCP server templates
```

## How It Works

```
~/.claude/                        gomad package
  skills/ ──── curate ────>  gomad.lock.yaml
  agents/        |                  |
  rules/     select preset    sync / package
  commands/      |                  |
  hooks/         v                  v
              catalog/         src/module/     ──── install ────> .claude/
              presets.yaml     skills/
                               agents/
                               module.yaml
```

1. **Curate** -- pick a preset or toggle individual items from the catalogs
2. **Sync** -- copy selected content from `~/.claude/` into the package's `global/` directory
3. **Package** -- generate `SKILL.md` + `skill-manifest.yaml` per skill
4. **Install** -- deploy to `.claude/` with manifest tracking

## Architecture

```
gomad/
  bin/gomad-cli.js               # CLI entry point (commander)
  src/module/
    module.yaml                  # Module definition (code: mob)
    module-help.csv              # Skill registry for help
    agents/                      # 16 project-specific agents
      analysis/                  #   api-documenter, codebase-analyzer, data-analyst, pattern-detector
      planning/                  #   dependency-mapper, epic-optimizer, requirements-analyst, ...
      research/                  #   market-researcher, tech-debt-auditor
      review/                    #   document-reviewer, technical-evaluator, test-coverage-analyzer
    skills/                      # Packaged skills with manifests
  global/                        # Global assets for .claude/
    rules/                       #   77 rules (common + 11 language dirs + zh)
    commands/                    #   Selected commands
    hooks/                       #   Selected hook scripts
    agents/                      #   Global-scope agents
  catalog/
    skills.yaml                  # 142 skills with metadata and categories
    agents.yaml                  # 48 agents (33 global + 15 project)
    commands.yaml                # 70 commands
    hooks.yaml                   # 36 hooks (PreToolUse, PostToolUse, Stop)
    presets.yaml                 # 6 preset bundles with inheritance
  tools/
    curator.js                   # Interactive selector (@clack/prompts)
    global-installer.js          # Install with manifest tracking
    sync-upstream.js             # Sync from ~/.claude/ into package
    package-skills.js            # Generate skill manifests
  test/
    test-catalogs.js             # Catalog validation (28 unit tests)
    test-presets.js              # Preset resolution and cross-refs
    test-module.js               # Module structure and CSV format
    test-installation.js         # Integration: curate -> package -> install
```

## Safety

- **Manifest tracking**: `.gomad-manifest.yaml` records exactly which files were installed
- **Rollback**: `gomad uninstall --global` restores from backups automatically
- **No secrets**: MCP configs with API keys are never auto-installed (use `gomad mcp enable` to opt in)

## Development

```bash
# Run tests (35 tests, ~600ms)
npm test

# Curate interactively
npm run curate

# Sync content from your ~/.claude/
npx gomad sync

# Package skills with manifests
npx gomad package
```

## License

MIT

<!-- VERIFY: Sections above this marker contain stale pre-rebrand facts. Corrections:
     - Package name is `@xgent-ai/gomad` (not `gomad`); install with `npm install @xgent-ai/gomad` or run `npx @xgent-ai/gomad install`.
     - Quick Start `npm install gomad` is wrong — use `npx @xgent-ai/gomad install` (project-local only).
     - CLI flag `--global-only` and command `gomad uninstall --global` no longer exist; gomad is project-local only and writes to `./.claude/`, never `~/.claude/`.
     - `gomad sync` and `gomad package` commands have been removed along with `tools/sync-upstream.js` and `tools/package-skills.js`.
     - "How It Works" diagram referencing `~/.claude/` → `src/module/` → `.claude/` no longer reflects reality. Current flow: `catalog/` + `assets/` → `gomad.lock.yaml` → `./.claude/`.
     - Architecture tree is stale: there is no `src/module/` directory and no `global/` directory. Current layout is `bin/`, `tools/` (curator.js, installer.js), `catalog/`, `assets/` (agents/, commands/, hooks/, rules/), `test/`.
     - Development section claims "35 tests, ~600ms" — actual count is 28 tests (see Testing section below).
     - `npm run curate` and `npx gomad sync` / `npx gomad package` references in Development section are stale.
-->

## Requirements

- Node.js >= 18.0.0
- npm 8.x or newer
- [Claude Code](https://claude.ai/code) CLI (consumer of the installed `.claude/` directory)

## Installation

gomad is **project-local only** — it writes to `./.claude/` in the current working directory and never touches `~/.claude/` or any global path.

```bash
# Run directly with npx (recommended — no global install needed)
npx @xgent-ai/gomad install

# Non-interactive with a preset
npx @xgent-ai/gomad install --preset full-stack --yes

# Or add as a dev dependency
npm install --save-dev @xgent-ai/gomad
npx gomad install
```

After installation, your project will have a `.claude/` directory containing the selected skills, agents, rules, hooks, and commands, plus a `gomad.lock.yaml` recording the selection.

## Project Structure

```
gomad/
  bin/
    gomad-cli.js          # CLI entry point (commander)
  tools/
    curator.js            # Interactive preset/item selector (@clack/prompts)
    installer.js          # Project-local installer that writes to ./.claude/
  catalog/
    skills.yaml           # Skill metadata and categories
    agents.yaml           # Agent catalog (global + project-scoped)
    commands.yaml         # Command catalog
    hooks.yaml            # Hook catalog (PreToolUse / PostToolUse / Stop)
    presets.yaml          # Preset bundles with inheritance
  assets/                 # Source content copied into ./.claude/ on install
    agents/
    commands/
    hooks/
    rules/
  test/
    test-catalogs.js      # Catalog schema validation
    test-presets.js       # Preset resolution and cross-references
    test-installation.js  # Installer integration tests
    test-decoupling.js    # Ensures no BMAD / global-path coupling
    test-publish-e2e.js   # npm pack + install tarball + run CLI end-to-end
  package.json
  README.md
```

## Testing

The project uses Node.js's built-in test runner (`node --test`). The suite covers catalog validation, preset resolution, installer integration, decoupling guarantees, and a publish-to-tarball end-to-end test.

```bash
# Run the full suite (28 tests across 5 files)
npm test
```

Test files live in `test/` and match the pattern `test-*.js`. The publish E2E test runs `npm pack`, installs the resulting tarball into a temp directory, and verifies `npx gomad install --preset full --yes` populates `./.claude/` correctly.
