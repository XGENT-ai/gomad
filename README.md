# mobmad (My Own BMAD)

A personalized distribution of [BMAD-METHOD](https://github.com/bmad-code-org/BMAD-METHOD) that bundles curated skills, agents, rules, hooks, and commands as a first-class BMAD external module with its own CLI.

## Why mobmad?

BMAD-METHOD provides a powerful agile AI-driven development framework. mobmad extends it by packaging your personal Claude Code environment -- 142+ skills, 48 agents, 77 rules, 70 commands, and 36 hooks -- into a portable, installable module. Pick a preset, customize per-item, and deploy the same setup across machines or share it with your team.

**Not a fork.** mobmad is a BMAD external module (`mob`) + thin CLI wrapper. Upstream BMAD updates apply cleanly with no merge conflicts.

## Prerequisites

- Node.js >= 18
- [BMAD-METHOD](https://github.com/bmad-code-org/BMAD-METHOD) v6.x (peer dependency)
- [Claude Code](https://claude.ai/code) CLI installed

## Quick Start

```bash
# Install
npm install mobmad

# Interactive: choose a preset, toggle individual skills
npx mobmad install

# Non-interactive: pick a preset and go
npx mobmad install --preset full-stack --yes
```

## Presets

| Preset | Skills | Description |
|--------|--------|-------------|
| `full` | 142 | Everything -- all skills, agents, hooks, commands |
| `full-stack` | ~50 | TypeScript, Python, frontend, backend, DB, DevOps |
| `python-only` | ~15 | Python patterns, Django, testing |
| `enterprise` | ~100 | All languages + healthcare + supply chain domains |
| `lean` | ~20 | Core coding standards, TDD, code review, security |
| `bmad-enhanced` | ~25 | 16 BMAD planning/analysis agents + complementary skills |

## CLI Commands

```
mobmad install [options]   Install module and global assets to ~/.claude/
  -p, --preset <name>      Use a preset (full, full-stack, python-only, enterprise, lean, bmad-enhanced)
  --global-only            Install only global assets (rules, hooks, commands, agents)
  -y, --yes                Skip interactive prompts, use defaults

mobmad curate              Interactively select skills, agents, and hooks
mobmad package             Package selected skills with BMAD-compatible manifests
mobmad sync                Populate global/ from ~/.claude/ based on lockfile
mobmad status              Show what is currently installed
mobmad update              Re-apply module with latest content
mobmad uninstall --global  Remove global assets, restore backups
mobmad mcp list            List available MCP server templates
```

## How It Works

```
~/.claude/                        mobmad package
  skills/ ──── curate ────>  mobmad.lock.yaml
  agents/        |                  |
  rules/     select preset    sync / package
  commands/      |                  |
  hooks/         v                  v
              catalog/         src/module/     ──── install ────> ~/.claude/
              presets.yaml     skills/                            (with backup)
                               agents/
                               module.yaml
```

1. **Curate** -- pick a preset or toggle individual items from the catalogs
2. **Sync** -- copy selected content from `~/.claude/` into the package's `global/` directory
3. **Package** -- generate BMAD-compatible `SKILL.md` + `bmad-skill-manifest.yaml` per skill
4. **Install** -- deploy to `~/.claude/` with timestamped backups and a manifest for rollback

## Architecture

```
mobmad/
  bin/mobmad-cli.js              # CLI entry point (commander)
  src/module/
    module.yaml                  # BMAD module definition (code: mob)
    module-help.csv              # Skill registry for bmad-help
    agents/                      # 16 BMAD-specific agents
      bmad-analysis/             #   api-documenter, codebase-analyzer, data-analyst, pattern-detector
      bmad-planning/             #   dependency-mapper, epic-optimizer, requirements-analyst, ...
      bmad-research/             #   market-researcher, tech-debt-auditor
      bmad-review/               #   document-reviewer, technical-evaluator, test-coverage-analyzer
    skills/                      # Packaged skills with BMAD manifests
  global/                        # Global assets for ~/.claude/
    rules/                       #   77 rules (common + 11 language dirs + zh)
    commands/                    #   Selected commands
    hooks/                       #   Selected hook scripts
    agents/                      #   Global-scope agents
  catalog/
    skills.yaml                  # 142 skills with metadata and categories
    agents.yaml                  # 48 agents (33 global + 15 BMAD)
    commands.yaml                # 70 commands
    hooks.yaml                   # 36 hooks (PreToolUse, PostToolUse, Stop)
    presets.yaml                 # 6 preset bundles with inheritance
  tools/
    curator.js                   # Interactive selector (@clack/prompts)
    global-installer.js          # Install with backup + manifest tracking
    sync-upstream.js             # Sync from ~/.claude/ into package
    package-skills.js            # Generate BMAD skill manifests
  test/
    test-catalogs.js             # Catalog validation (28 unit tests)
    test-presets.js              # Preset resolution and cross-refs
    test-module.js               # Module structure and CSV format
    test-installation.js         # Integration: curate -> package -> install
```

## Safety

- **Backups**: every `install` creates timestamped backups of existing `~/.claude/` directories before overwriting
- **Manifest tracking**: `~/.claude/.mobmad-manifest.yaml` records exactly which files were installed
- **Rollback**: `mobmad uninstall --global` restores from backups automatically
- **No secrets**: MCP configs with API keys are never auto-installed (use `mobmad mcp enable` to opt in)

## Development

```bash
# Run tests (35 tests, ~600ms)
npm test

# Curate interactively
npm run curate

# Sync content from your ~/.claude/
npx mobmad sync

# Package skills with BMAD manifests
npx mobmad package
```

## BMAD Integration

mobmad registers as an external BMAD module with code `mob`. After installation:

- Skills appear in `bmad-help` alongside BMM and Core skills
- Agents are available via BMAD's agent system
- The module follows BMAD's `module.yaml` + `module-help.csv` conventions
- Compatible with `npx bmad-method install --modules bmm,mob`

## License

MIT

## Acknowledgments

Built on [BMAD-METHOD](https://github.com/bmad-code-org/BMAD-METHOD) by bmad-code-org. Skills sourced from the [Everything Claude Code](https://github.com/anthropics/claude-code) ecosystem.
