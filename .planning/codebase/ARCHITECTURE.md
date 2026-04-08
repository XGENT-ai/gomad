# Architecture

**Analysis Date:** 2026-04-08

## Pattern Overview

**Overall:** Module-based Skill Delivery System with Installation Orchestration

**Key Characteristics:**
- CLI-driven installation and configuration system
- Hierarchical skill organization (core-skills and domain-specific BMM skills)
- Agent-based workflow execution with manifest-driven deployment
- Multi-module support with IDE integration capabilities
- Extensible architecture supporting custom modules and third-party integrations

## Layers

**Presentation Layer:**
- Purpose: CLI user interface and interactive prompts for installation and configuration
- Location: `tools/installer/ui.js`, `tools/installer/prompts.js`
- Contains: UI components, prompt definitions, interactive dialogs
- Depends on: Core configuration layer
- Used by: Installation commands

**Command Layer:**
- Purpose: Entry points for CLI operations (install, uninstall, status)
- Location: `tools/installer/commands/` (install.js, uninstall.js, status.js)
- Contains: Command handlers with option parsing
- Depends on: Installer core, UI layer
- Used by: Main CLI entry point `tools/installer/bmad-cli.js`

**Installation Orchestration Layer:**
- Purpose: Coordinate installation workflow, module discovery, and IDE setup
- Location: `tools/installer/core/installer.js`
- Contains: Main installation logic, update handling, file operations
- Depends on: Manifest generation, module managers, IDE manager
- Used by: Install command handler

**Module Management Layer:**
- Purpose: Discover, validate, and manage official and custom modules
- Location: `tools/installer/modules/official-modules.js`, `tools/installer/modules/custom-modules.js`, `tools/installer/modules/external-manager.js`
- Contains: Module resolution, validation, caching logic
- Depends on: Manifest system, file operations
- Used by: Installer orchestration layer

**Manifest Generation & Management Layer:**
- Purpose: Generate and validate `.gomad-manifest.yaml` files for module installation
- Location: `tools/installer/core/manifest-generator.js`, `tools/installer/core/manifest.js`
- Contains: Manifest schema validation, agent/workflow/skill registration
- Depends on: Skill validator, file operations
- Used by: Installer orchestration, module managers

**IDE Integration Layer:**
- Purpose: Configure IDE-specific settings and Claude Code integrations
- Location: `tools/installer/ide/` (manager.js, handlers for each IDE)
- Contains: IDE detection, settings generation, tool configuration
- Depends on: Manifest system, file operations
- Used by: Installation orchestration

**Skills & Agents Layer:**
- Purpose: Define BMad agents, workflows, and skills with manifest metadata
- Location: `src/bmm-skills/` (1-analysis, 2-plan-workflows, 3-solutioning, 4-implementation), `src/core-skills/`
- Contains: Agent manifests (.yaml), SKILL.md documentation, supporting resources
- Depends on: None (leaf layer)
- Used by: Manifest generation, IDE configuration

**Utilities & Support Layer:**
- Purpose: File operations, validation, configuration, project detection
- Location: `tools/installer/core/config.js`, `tools/installer/file-ops.js`, `tools/installer/cli-utils.js`, `tools/installer/project-root.js`
- Contains: Helper functions for file I/O, path resolution, environment detection
- Depends on: Node.js fs libraries
- Used by: All higher layers

## Data Flow

**Installation Flow:**

1. **User Invocation** — User runs `npx bmad-method install` or `bmad install`
2. **CLI Entry** — `tools/installer/bmad-cli.js` parses command and routing
3. **Command Handler** — `tools/installer/commands/install.js` begins interactive setup via UI layer
4. **Config Collection** — `tools/installer/prompts.js` and `tools/installer/ui.js` gather user selections (directory, modules, IDEs, language, username)
5. **Config Building** — `tools/installer/core/config.js` validates and structures collected config
6. **Path Resolution** — `tools/installer/core/install-paths.js` establishes target directories and `.bmad/` location
7. **Module Discovery** — `tools/installer/modules/official-modules.js` loads available modules, `tools/installer/modules/custom-modules.js` discovers custom modules
8. **Existing Install Detection** — `tools/installer/core/existing-install.js` checks for prior installation
9. **Manifest Generation** — For each selected module, `tools/installer/core/manifest-generator.js` reads skill metadata from `src/bmm-skills/` and `src/core-skills/`, generates `.gomad-manifest.yaml`
10. **File Installation** — `tools/installer/file-ops.js` copies skills, agents, workflows to target `.bmad/` folder
11. **IDE Configuration** — `tools/installer/ide/manager.js` reads IDE type, invokes handler to write IDE-specific config files
12. **Update Handling** — If updating, backs up existing user modifications, merges with new assets, restores user customizations
13. **Summary Reporting** — Installer outputs summary with paths, modules installed, next steps
14. **Exit** — CLI process exits with success or failure status

**State Management:**

- **Installation State**: Tracked during install via `updateState` object containing temp backup directories and modified file lists
- **Module State**: Official modules loaded from `tools/installer/modules/` metadata, custom modules discovered dynamically
- **Config State**: User selections merged with defaults and validated at each stage
- **File Tracking**: `installedFiles` Set tracks all deployed files to prevent conflicts

## Key Abstractions

**Manifest:**
- Purpose: Declarative specification of agents, workflows, and skills
- Examples: `.gomad-manifest.yaml` generated per module, `src/bmm-skills/1-analysis/bmad-agent-analyst/bmad-skill-manifest.yaml`
- Pattern: YAML-based metadata; schema validated against `tools/skill-validator.md`; includes agent identity, capabilities, role, communication style, principles

**Module:**
- Purpose: Grouping of related skills, agents, and workflows
- Examples: `bmm` (core BMad Method), `bmb` (BMad Builder), custom modules
- Pattern: Each module has install path, manifest file, skill directories; official modules shipped in codebase, custom modules from external sources

**Skill:**
- Purpose: Encapsulated capability or workflow (agent behavior, document generation, etc.)
- Examples: `bmad-distillator` (compression), `bmad-agent-analyst` (agent role)
- Pattern: Each skill has `SKILL.md` documentation, `bmad-skill-manifest.yaml` metadata, optional supporting resources (agents, scripts, templates)

**IDE Handler:**
- Purpose: Abstract IDE-specific configuration logic
- Examples: Claude Code handler, Cursor handler
- Pattern: Each IDE has dedicated handler in `tools/installer/ide/` that generates tool-specific config files

## Entry Points

**CLI Entry Point:**
- Location: `tools/installer/bmad-cli.js` (marked `#!/usr/bin/env node`)
- Triggers: `npm run bmad:install`, `npx bmad-method install`, `bmad install` commands
- Responsibilities: Parse CLI arguments, route to appropriate command (install/uninstall/status), handle top-level error reporting

**Install Command:**
- Location: `tools/installer/commands/install.js`
- Triggers: When `install` subcommand is invoked
- Responsibilities: Interactive prompt orchestration, config validation, invoke Installer class

**Uninstall Command:**
- Location: `tools/installer/commands/uninstall.js`
- Triggers: When `uninstall` subcommand is invoked
- Responsibilities: Remove installed modules, clean up `.bmad/` directory, restore backups

**Status Command:**
- Location: `tools/installer/commands/status.js`
- Triggers: When `status` subcommand is invoked
- Responsibilities: Display current installation state, installed modules, IDE configuration

## Error Handling

**Strategy:** Layered error handling with graceful fallback and detailed user reporting

**Patterns:**

- **Validation Errors**: Early validation at config/path/module stages prevents downstream failures. Invalid config raises `Error` with descriptive message. User is prompted to correct input.

- **File Operation Errors**: File I/O wrapped in try-catch with backup restoration on failure. If installation fails mid-process, `updateState.tempBackupDir` and `updateState.tempModifiedBackupDir` are cleaned up to prevent orphaned directories.

- **Module Discovery Errors**: Missing modules logged as warnings; installation continues with available modules. Custom module resolution failures do not block official module installation.

- **IDE Configuration Errors**: IDE handler failures log detailed error but do not block skill/agent installation. User can manually configure IDE settings later.

- **Manifest Generation Errors**: Schema validation failures caught and reported with specific field/constraint details. Caller is directed to fix manifest files or skill metadata.

- **Exit Codes**: Process exits with code 0 on success, code 1 on failure. Allows scripting and CI/CD integration.

## Cross-Cutting Concerns

**Logging:** 
- Approach: Asynchronous prompt-based logging via `tools/installer/prompts.js` (`prompts.log.info()`, `prompts.log.warn()`, `prompts.log.error()`, etc.)
- Used throughout for progress updates, warnings, and error reporting

**Configuration:** 
- Approach: YAML-based config files (e.g., `install-messages.yaml`, `platform-codes.yaml`), environment variables for debug/override
- Loaded via `tools/installer/message-loader.js`, `tools/installer/core/config.js`

**File Operations:** 
- Approach: Centralized file ops via `tools/installer/file-ops.js` (copy, remove, backup, restore)
- Ensures consistent error handling and transaction semantics (backups before modifications)

**Validation:** 
- Approach: Multi-stage validation — config validation, path validation, manifest validation, skill schema validation
- Skill validation done via `tools/validate-skills.js` (run-time check) and `tools/skill-validator.md` (schema reference)

**Update/Upgrade:** 
- Approach: Detect existing installation via `.bmad/` folder, backup user-modified files, merge new assets, restore backups
- Quick update path (`--action quick-update`) skips re-prompting, only updates selected modules while preserving settings

---

*Architecture analysis: 2026-04-08*
