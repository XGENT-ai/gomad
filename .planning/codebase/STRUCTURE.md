# Codebase Structure

**Analysis Date:** 2026-04-08

## Directory Layout

```
gomad/
├── src/                        # Skills, agents, workflows source definitions
│   ├── bmm-skills/             # BMad Method (BMM) module — core workflows organized by phase
│   │   ├── 1-analysis/         # Analysis phase skills (elicitation, research, documentation)
│   │   ├── 2-plan-workflows/   # Planning phase skills (PRD creation, UX design, validation)
│   │   ├── 3-solutioning/      # Solution design phase (architecture, epics, stories)
│   │   └── 4-implementation/   # Dev implementation phase (coding, QA, retrospectives)
│   └── core-skills/            # Universal core capabilities (distillation, brainstorming, etc.)
│
├── tools/                      # Build, installation, and validation utilities
│   ├── installer/              # CLI installer system (main entry point and orchestration)
│   │   ├── bmad-cli.js         # Entry point — CLI command router
│   │   ├── commands/           # CLI command handlers (install, uninstall, status)
│   │   ├── core/               # Installation orchestration and manifest generation
│   │   ├── modules/            # Official and custom module discovery/management
│   │   ├── ide/                # IDE-specific configuration handlers
│   │   ├── ui.js               # Interactive UI components and layout
│   │   ├── prompts.js          # User prompts and logging
│   │   ├── cli-utils.js        # CLI helper utilities
│   │   ├── file-ops.js         # File operations (copy, backup, restore)
│   │   ├── project-root.js     # Project root detection
│   │   └── *.yaml              # Config files (messages, platform codes, official modules)
│   │
│   ├── build-docs.mjs          # Documentation generation script
│   ├── validate-*.js           # Skill, file reference, and SVG validators
│   ├── fix-doc-links.js        # Link correction utility
│   ├── skill-validator.md      # Skill manifest schema reference
│   └── docs/                   # Build documentation resources
│
├── website/                    # Astro-based documentation site
│   ├── src/
│   │   ├── pages/              # Astro pages (root-level routing)
│   │   ├── components/         # Reusable Astro components
│   │   ├── content/            # Content collections (i18n docs, schemas)
│   │   ├── lib/                # Utilities (site URL, locales, i18n helpers)
│   │   ├── styles/             # Global styles
│   │   ├── rehype-*.js         # Custom rehype plugins for markdown processing
│   │   └── astro.config.mjs    # Astro configuration
│   ├── public/                 # Static assets (diagrams, images)
│   └── astro.config.mjs        # Site configuration with Starlight integration
│
├── test/                       # Tests for installation, validation, and utilities
│   ├── test-installation-components.js  # Main test suite for installer
│   ├── test-file-refs-csv.js            # Validates file reference integrity
│   ├── test-install-to-bmad.js          # Integration test for install-to-.bmad flow
│   ├── test-workflow-path-regex.js      # Workflow path pattern testing
│   ├── test-rehype-plugins.mjs          # Documentation plugin tests
│   ├── fixtures/                        # Test data and mocks
│   └── adversarial-review-tests/        # Edge case test scenarios
│
├── docs/                       # Generated documentation and API reference
│
├── .claude/                    # Claude Code integration (agents, rules, manifests)
│   ├── agents/                 # Agent markdown definitions
│   ├── commands/               # Command definitions
│   ├── rules/                  # Coding standards and practices
│   └── gsd-file-manifest.json  # File manifest for GSD commands
│
├── .github/                    # GitHub workflows and CI/CD configuration
├── .husky/                     # Git hooks
├── .vscode/                    # VS Code settings
├── .planning/                  # Planning documents and phase tracking
│   └── codebase/               # Generated codebase analysis docs (this location)
│
├── package.json                # Node.js dependencies and scripts
├── eslint.config.mjs           # ESLint configuration
├── prettier.config.mjs         # Prettier configuration
├── README.md                   # Project introduction
├── CHANGELOG.md                # Release notes and version history
├── LICENSE                     # MIT license
└── CONTRIBUTING.md             # Contribution guidelines
```

## Directory Purposes

**src/bmm-skills/1-analysis/**
- Purpose: Business analysis, market research, requirements elicitation, project discovery
- Contains: Agent definitions, research templates, documentation workflows
- Key files: `bmad-agent-analyst/bmad-skill-manifest.yaml` (Mary — Business Analyst), `bmad-document-project/` (scan and document projects), `bmad-prfaq/` (Pre-Fact-Review-FAQ workflows)

**src/bmm-skills/2-plan-workflows/**
- Purpose: Product planning, UX design, PRD creation, design validation
- Contains: PM agent, UX designer agent, PRD creation/editing workflows
- Key files: `bmad-agent-pm/` (Project Manager), `bmad-agent-ux-designer/`, `bmad-create-prd/`, `bmad-validate-prd/`

**src/bmm-skills/3-solutioning/**
- Purpose: Architecture design, epic/story generation, implementation readiness
- Contains: Architect agent, system design workflows, context generation
- Key files: `bmad-agent-architect/`, `bmad-create-architecture/`, `bmad-create-epics-and-stories/`

**src/bmm-skills/4-implementation/**
- Purpose: Story development, code review, QA, sprint planning, retrospectives
- Contains: Developer agent, QA agent, story implementation workflows
- Key files: `bmad-agent-dev/`, `bmad-dev-story/`, `bmad-code-review/`, `bmad-qa-generate-e2e-tests/`

**src/core-skills/**
- Purpose: Universal capabilities independent of project phase
- Contains: Distillation engine, brainstorming, editorial review, indexing, party mode
- Key files: `bmad-distillator/` (document compression), `bmad-brainstorming/`, `bmad-help/` (contextual guidance)

**tools/installer/core/**
- Purpose: Core installation orchestration and manifest generation
- Contains: `installer.js` (main orchestrator), `manifest-generator.js` (generates .gomad-manifest.yaml), `manifest.js` (manifest schema and validation)
- Key responsibilities: Coordinate multi-stage installation, detect existing installs, manage updates

**tools/installer/modules/**
- Purpose: Module discovery and validation
- Contains: `official-modules.js` (built-in modules), `custom-modules.js` (user-provided), `external-manager.js` (third-party packages)
- Key responsibilities: Load module metadata, validate module structure, resolve module dependencies

**tools/installer/ide/**
- Purpose: IDE-specific configuration and integration
- Contains: `manager.js` (router), handler files for each IDE (Claude Code, Cursor, etc.)
- Key responsibilities: Detect IDE, generate IDE-specific config files, integrate with tool settings

**website/src/content/**
- Purpose: Documentation content collections with i18n support
- Contains: Markdown files organized by language locale
- Key files: `config.ts` (content schema definitions)

**test/**
- Purpose: Validation and integration testing for installer, validators, and plugins
- Contains: Test suites for installation flow, file references, workflow paths, documentation
- Key responsibilities: Verify installer correctness, validate manifest structures, test documentation generation

## Key File Locations

**Entry Points:**
- `package.json` → `main: "tools/installer/bmad-cli.js"` (NPM entry point)
- `tools/installer/bmad-cli.js`: CLI router and version checker
- `tools/installer/commands/install.js`: Install command handler (interactive)

**Configuration:**
- `package.json`: Project metadata, dependencies, build/test scripts
- `tools/installer/*.yaml`: Configuration files (install messages, platform codes, official modules list)
- `website/astro.config.mjs`: Documentation site configuration
- `eslint.config.mjs`, `prettier.config.mjs`: Code style rules

**Core Logic:**
- `tools/installer/core/installer.js`: Main installation orchestrator (install, update, uninstall flows)
- `tools/installer/core/manifest-generator.js`: Generates `.gomad-manifest.yaml` from skill metadata
- `tools/installer/ui.js`: Interactive CLI UI and prompts
- `tools/installer/modules/`: Module resolution and discovery

**Skill Definitions:**
- `src/bmm-skills/*/bmad-*/bmad-skill-manifest.yaml`: Agent/skill metadata (type, name, identity, capabilities)
- `src/bmm-skills/*/bmad-*/SKILL.md`: Markdown documentation of skill behavior and usage
- `src/core-skills/*/SKILL.md`: Universal skill documentation

**Testing:**
- `test/test-installation-components.js`: Main installation test suite
- `test/test-file-refs-csv.js`: File reference validation
- `test/test-rehype-plugins.mjs`: Documentation plugin tests

**Validation & Build:**
- `tools/validate-skills.js`: Runtime skill schema validation
- `tools/build-docs.mjs`: Documentation generation
- `tools/skill-validator.md`: Skill manifest schema reference

**Website:**
- `website/astro.config.mjs`: Astro and Starlight configuration
- `website/src/pages/`: Root-level Astro pages and dynamic routes
- `website/src/components/`: Reusable Astro components

## Naming Conventions

**Files:**
- Skills: `bmad-<function>` (e.g., `bmad-distillator`, `bmad-agent-analyst`)
- Agent files: `bmad-agent-<role>` (e.g., `bmad-agent-architect`, `bmad-agent-dev`)
- Manifest files: `bmad-skill-manifest.yaml` (consistent name across all skills)
- Documentation: `SKILL.md` (consistent name for skill documentation)
- Utilities: descriptive camelCase or kebab-case (e.g., `manifest-generator.js`, `file-ops.js`)

**Directories:**
- Skill directories: `bmad-<function>` (matching skill name)
- Phase directories: `<number>-<phase-name>` (e.g., `1-analysis`, `2-plan-workflows`)
- IDE handlers: `<ide-name>` (e.g., `claude-code`, `cursor`)
- Config/docs: lowercase with hyphens (e.g., `install-messages.yaml`, `platform-codes.yaml`)

**Variables & Functions:**
- Classes: PascalCase (e.g., `Installer`, `Manifest`, `IdeManager`)
- Functions/methods: camelCase (e.g., `promptInstall()`, `generateManifest()`)
- Constants: UPPER_SNAKE_CASE (e.g., `BMAD_FOLDER_NAME`, `BMAD_DEBUG_MANIFEST`)
- Configuration objects: camelCase (e.g., `config.modules`, `config.ides`)

## Where to Add New Code

**New Agent/Skill:**
- Primary code: `src/bmm-skills/<phase>/bmad-<name>/bmad-skill-manifest.yaml` (metadata), `src/bmm-skills/<phase>/bmad-<name>/SKILL.md` (documentation)
- Supporting resources: `src/bmm-skills/<phase>/bmad-<name>/agents/`, `src/bmm-skills/<phase>/bmad-<name>/scripts/`, `src/bmm-skills/<phase>/bmad-<name>/resources/`
- Phase selection: Choose based on lifecycle stage (1-analysis, 2-plan-workflows, 3-solutioning, 4-implementation) or core-skills if universal

**New Universal Skill (Core):**
- Implementation: `src/core-skills/bmad-<name>/SKILL.md`, `src/core-skills/bmad-<name>/<supporting-dirs>/`
- Use when skill is not phase-specific and applies across multiple workflows

**Installer Enhancement:**
- Command handling: `tools/installer/commands/<new-command>.js` (if new CLI command)
- Installation logic: `tools/installer/core/installer.js` (extend existing methods)
- Module management: `tools/installer/modules/<manager>.js` (if new module type)
- IDE support: `tools/installer/ide/handlers/<ide-name>.js` (if new IDE)
- UI/Prompts: `tools/installer/ui.js`, `tools/installer/prompts.js` (interactive flows)

**Validation/Build Tools:**
- Validators: `tools/validate-<aspect>.js` (e.g., validate-skills.js)
- Documentation: `tools/build-docs.mjs` (generator script)
- Utilities: `tools/` root directory or subdirectories by function

**Tests:**
- Installation tests: `test/test-installation-components.js` (extend existing suite)
- New test suites: `test/test-<aspect>.js` (for new test areas)
- Fixtures: `test/fixtures/` (test data and mocks)

**Documentation:**
- Website content: `website/src/content/docs/` (Astro content collections)
- Components: `website/src/components/` (reusable Astro components)
- Styling: `website/src/styles/` (global styles)

## Special Directories

**`.bmad/` (Installation Target):**
- Purpose: Target directory where `bmad install` copies agents, skills, workflows
- Generated: Yes (created during installation)
- Committed: No (created per-project, contains user-specific structure)
- Location: Created in project root or specified directory; contains `.claude/agents/`, `.claude/workflows/`, `.claude/skills/` subdirectories

**`.claude/` (Claude Code Integration):**
- Purpose: Agent definitions, rules, manifests consumed by Claude Code and other AI IDEs
- Generated: Partially (some files shipped in repo, manifest updated by installer)
- Committed: Yes (agents/ and rules/ are in repo)
- Contents: `agents/` (agent .md files), `commands/` (command .md definitions), `rules/` (coding standards), `gsd-file-manifest.json` (GSD command index)

**`.planning/` (Planning & Analysis Output):**
- Purpose: Planning documents, phase tracking, codebase analysis (like this STRUCTURE.md)
- Generated: Yes (created during phases and analysis)
- Committed: Yes (but evolves with development)
- Contents: `.planning/codebase/` (analysis docs), phase execution logs, project state

**`build/` (Build Output):**
- Purpose: Generated artifacts from build process
- Generated: Yes (created by npm scripts)
- Committed: No (in .gitignore)
- Contents: `build/site/` (generated website), docs, minified/bundled assets

**`docs/` (Generated Documentation):**
- Purpose: Generated API reference and documentation
- Generated: Yes (via `npm run docs:build`)
- Committed: Yes (some generated content is tracked)
- Contents: Reference documents, guides, API documentation

---

*Structure analysis: 2026-04-08*
