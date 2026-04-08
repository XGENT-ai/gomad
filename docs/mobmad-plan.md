# mobmad (My Own BMAD) — Implementation Plan

> **Status**: Phase 5 complete — Phases 1-5 done, Phase 6 (MCP) is optional
> **Created**: 2026-04-07
> **Project**: Fork/extend BMAD-METHOD with user's curated skill set

## Overview

mobmad is a personalized distribution of BMAD-METHOD (v6.2.2) that bundles 142+ skills, 40+ agents, 77 rules, 68 commands, and 36 hooks as a first-class BMAD external module with its own CLI.

## Approach: Module + CLI Wrapper (Not a Fork)

Instead of forking BMAD-METHOD (which would create merge conflicts), mobmad is:

1. A **BMAD external module** (`mob`) — integrates natively with BMAD's installer
2. A **thin CLI wrapper** — provides `npx mobmad install` branding
3. A **global asset installer** — handles rules/hooks/commands that live in `~/.claude/`

### Why Not a Full Fork

- BMAD installer is 2000+ lines across 15+ files — maintaining a fork means perpetual merge conflicts
- External module system (`external-official-modules.yaml`) already supports this use case
- BMAD's `CustomModules` class can install any module with a `module.yaml` + content directory

### Why Not a Pure Module Only

- User wants `npx mobmad install` branding
- Some content (MCP configs, hooks, global rules) lives outside BMAD's module scope (`~/.claude/` not `.claude/skills/`)
- A CLI wrapper can orchestrate: install BMAD core, install mobmad module, then configure global assets

## Architecture

```
mobmad/
├── package.json                 # npm: "mobmad", peer dep on bmad-method
├── bin/
│   └── mobmad-cli.js            # CLI: install, curate, update, status
├── src/
│   └── module/                  # BMAD external module (project-scoped)
│       ├── module.yaml          # BMAD module definition (code: mob)
│       ├── module-help.csv      # Skill registry for bmad-help
│       ├── agents/              # 16 BMAD-specific agents
│       └── skills/              # Selected skills with manifests
├── global/                      # Global assets -> ~/.claude/
│   ├── rules/                   # 77 rules (common/ + language dirs)
│   ├── commands/                # 68 commands
│   ├── hooks/                   # 36 hook scripts
│   └── agents/                  # General-purpose agents
├── catalog/                     # Curation system
│   ├── skills.yaml              # Master catalog (142 skills)
│   ├── agents.yaml              # All agents with metadata
│   ├── commands.yaml            # All commands with metadata
│   ├── hooks.yaml               # All hooks with metadata
│   └── presets.yaml             # "full", "full-stack", "lean", etc.
├── tools/
│   ├── curator.js               # Interactive skill selector (@clack/prompts)
│   ├── global-installer.js      # Install global assets with backup
│   └── sync-upstream.js         # Sync from ~/.claude/ updates
├── test/
│   ├── test-installation.js     # Module/manifest validation
│   └── test-bmad-integration.js # E2E with BMAD installer
└── README.md
```

## Phase 1: Project Scaffolding and Module Definition

**Goal**: Create the npm package and BMAD module skeleton.

### Step 1.1 — Initialize npm package (`package.json`)

- `name: "mobmad"`
- `bin: { "mobmad": "bin/mobmad-cli.js" }`
- Peer dependency on `bmad-method@^6.x`
- Dependencies: `@clack/prompts`, `commander`, `yaml`, `fs-extra`, `chalk`

### Step 1.2 — Create BMAD module definition (`src/module/module.yaml`)

- `code: mob`
- `name: "My Own BMAD"`
- Configuration prompts for skill selection preset
- Directory declarations for agents/ and skills/
- Follows pattern from `BMAD-METHOD/src/bmm-skills/module.yaml`

### Step 1.3 — Create module-help.csv (`src/module/module-help.csv`)

- Register all mobmad skills in BMAD's help system CSV format
- Columns: module, skill, display-name, menu-code, description, action, args, phase, etc.
- Integrates into `bmad-help` for natural discovery

## Phase 2: Content Curation System

**Goal**: Build catalogs, presets, and the interactive curator.

### Step 2.1 — Master skill catalog (`catalog/skills.yaml`)

Enumerate all 142 skills with metadata:
- name, category (language/domain/tool)
- source (ECC plugin or "custom")
- default-include (boolean)
- description, dependencies

### Step 2.2 — Agent, command, hook catalogs

Same structure for 40+ agents, 68 commands, 36 hooks. Include `scope: project|global` field.

### Step 2.3 — Define presets (`catalog/presets.yaml`)

| Preset | Description | Approx. Skills |
|--------|-------------|-----------------|
| `full` | Everything | 142 |
| `full-stack` | TS, Python, frontend, backend, DB | ~50 |
| `python-only` | Python patterns, Django, testing | ~15 |
| `enterprise` | All languages + healthcare + supply chain | ~100 |
| `lean` | Core coding standards, TDD, code review, security | ~20 |
| `bmad-enhanced` | 16 BMAD-specific agents + complementary skills | ~25 |

### Step 2.4 — Interactive curator (`tools/curator.js`)

- Uses `@clack/prompts` (same as BMAD)
- Shows preset selection -> per-skill toggle
- Generates `mobmad.lock.yaml` recording selections
- Copies selected content into `src/module/`

## Phase 3: CLI Wrapper

**Goal**: Provide `npx mobmad install` experience.

### Step 3.1 — CLI entry point (`bin/mobmad-cli.js`)

Commander-based CLI with subcommands:
- `mobmad install` — runs curator, delegates to `npx bmad-method install --modules bmm,mob`
- `mobmad install --preset full-stack` — non-interactive
- `mobmad install --global-only` — install only global assets to `~/.claude/`
- `mobmad update` — pull latest BMAD + re-apply module
- `mobmad curate` — re-run skill selection
- `mobmad status` — show installed skills/agents

### Step 3.2 — Global asset installer (`tools/global-installer.js`)

Installs selected global assets to `~/.claude/`:
- Rules -> `~/.claude/rules/`
- Commands -> `~/.claude/commands/`
- Hooks -> `~/.claude/scripts/hooks/`
- Global agents -> `~/.claude/agents/`
- **Always creates timestamped backups before overwriting**
- Writes `~/.claude/.mobmad-manifest.yaml` tracking installed files
- Provides `mobmad uninstall --global` rollback

## Phase 4: Content Packaging

**Goal**: Package skills, agents, and manifests.

### Step 4.1 — Skill manifests (`src/module/skills/*/bmad-skill-manifest.yaml`)

For each included skill, create BMAD skill manifest with `canonicalId`, `type`, `install_to_bmad` flag.

### Step 4.2 — Package project-scoped agents (`src/module/agents/`)

Copy the 16 BMAD-specific agents:
- `bmad-analysis/` (4 agents: api-documenter, codebase-analyzer, data-analyst, pattern-detector)
- `bmad-planning/` (7 agents: dependency-mapper, epic-optimizer, requirements-analyst, etc.)
- `bmad-research/` (2 agents: market-researcher, tech-debt-auditor)
- `bmad-review/` (3 agents: document-reviewer, technical-evaluator, test-coverage-analyzer)

### Step 4.3 — Content sync script (`tools/sync-upstream.js`)

- Reads `~/.claude/skills/`, `~/.claude/agents/`, etc.
- Diffs against current catalogs
- Reports new/removed/changed items
- Optionally updates catalogs and copies new content

## Phase 5: Testing

### Step 5.1 — Unit tests

- Catalog parsing, preset resolution, curator logic, manifest generation

### Step 5.2 — Integration tests

- Full `mobmad install --preset lean --yes` in temp directory
- Verify file structure matches expected output

### Step 5.3 — E2E tests

- `npx mobmad install` in fresh project
- Open Claude Code, verify `bmad-help` shows mobmad skills
- Rollback tests for global installer

## Phase 6: MCP Server Configs (Optional)

MCP configs are **NOT auto-installed** (they contain API keys). Stored as reference templates:
- `mobmad mcp list` — show available configs
- `mobmad mcp enable <name>` — merge into user's MCP config

## Risks and Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| BMAD v7 breaks module format | Medium | Pin `^6.x`, monitor releases |
| Global install corrupts `~/.claude/` | High | Timestamped backups + manifest tracking + rollback |
| Context window bloat (142 skills) | Medium | Lean preset as default |
| ECC plugin updates change skill structure | Low | `sync-upstream.js` drift detection |
| Trademark concerns with "BMAD" in name | Low | "mobmad" is clearly derivative, MIT-licensed, README acknowledges origins |

## Success Criteria

- [ ] `npx mobmad install` works in a fresh project directory
- [ ] BMAD's `bmad-help` lists mobmad skills alongside BMM skills
- [ ] `npx mobmad install --preset lean` installs fewer than 20 skills
- [ ] `npx bmad-method install` still works independently (no conflicts)
- [ ] Global assets install to `~/.claude/` with backup
- [ ] `mobmad curate` allows adding/removing skills post-install
- [ ] `mobmad update` pulls latest BMAD-METHOD without losing mobmad content
- [ ] All installation tests pass

## Key BMAD-METHOD Reference Files

These define the integration surface mobmad depends on:

- `package.json` — npm package, CLI entry points
- `tools/installer/external-official-modules.yaml` — external module registry format
- `src/bmm-skills/module.yaml` — module definition format
- `src/core-skills/module.yaml` — core module config format
- `src/bmm-skills/module-help.csv` — skill registry CSV format
- `tools/installer/commands/install.js` — install command
- `tools/installer/modules/custom-modules.js` — custom module discovery
- `tools/installer/core/installer.js` — main install orchestration
- `tools/installer/ide/platform-codes.yaml` — IDE target directories
- `tools/installer/ide/shared/skill-manifest.js` — skill manifest loading
- `tools/installer/core/manifest-generator.js` — manifest generation

## User's Skill Set Sources

- `~/.claude/skills/` — 142 skills
- `~/.claude/agents/` — 40+ agents (16 BMAD-specific)
- `~/.claude/rules/` — 77 rules (common/ + 11 language dirs + zh/)
- `~/.claude/commands/` — 68 commands
- `~/.claude/scripts/hooks/` — 36 hook scripts
- `~/.claude/mcp-configs/mcp-servers.json` — 22 MCP servers

## How to Resume

In a new session, say:
```
Read docs/mobmad-plan.md and continue from Phase [N]
```
