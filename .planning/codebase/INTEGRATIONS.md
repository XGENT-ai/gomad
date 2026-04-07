# External Integrations

**Analysis Date:** 2026-04-07

## APIs & External Services

**BMAD-METHOD Framework:**
- Service: BMAD-METHOD v6.x
- What it's used for: Module registration and integration framework for Claude Code AI development
- SDK/Client: npm peer dependency `bmad-method: ^6.x`
- Integration: Module code `mob` registered via `src/module/module.yaml` with BMAD manifest convention
- Usage: Module provides skills, agents, commands, and hooks as first-class BMAD entities

**Claude Code CLI:**
- Service: Anthropic Claude Code
- What it's used for: AI-driven code development framework
- Dependency: Required peer, not directly integrated but bundled skills/agents/hooks run within Claude Code
- Auth: Claude Code user authentication (handles OAuth)

## Data Storage

**Databases:**
- Type: Not applicable — No database integrations
- File-based storage only: Catalogs and configurations stored as YAML files in `catalog/`

**File Storage:**
- Type: Local filesystem
- Location: 
  - Project files: `src/`, `tools/`, `bin/`, `catalog/`, `global/`
  - Global installation: `~/.claude/` (user's home directory)
  - Backup directory: `~/.claude/.mobmad-backups/` (timestamped)
- Operations: Read/write catalogs, sync upstream content, create installation manifests

**Caching:**
- Type: File-based lock state
- Location: `mobmad.lock.yaml`
- Purpose: Records user's curated selections for reproducibility across machines

## Authentication & Identity

**Auth Provider:**
- Type: None at application level
- BMAD-METHOD handles: All authentication for module integration
- Claude Code handles: User identity and session management
- MCP servers: Optional MCP server configs (not auto-installed) — user must supply API keys manually via `mobmad mcp enable`

## Monitoring & Observability

**Error Tracking:**
- Type: None — No external error tracking service
- Approach: Console logging of errors and status (using chalk for color coding)

**Logs:**
- Approach: Console output only
  - Status messages via `chalk` colored text
  - Installation progress logged to stdout
  - Errors printed to stderr
  - No persistent logging to files

## CI/CD & Deployment

**Hosting:**
- Type: npm registry
- Package: Published as `mobmad` on npmjs.com
- Installation: `npm install mobmad` or `npx mobmad install`

**CI Pipeline:**
- Type: Not yet implemented for public CI (Phase 6 per code)
- Local testing: `npm test` runs 35 unit tests via Node.js built-in test runner
  - `test/test-catalogs.js` - Catalog validation (28 tests)
  - `test/test-presets.js` - Preset resolution and cross-references
  - `test/test-module.js` - Module structure and CSV format
  - `test/test-installation.js` - Integration: curate → package → install

**Package Management:**
- Upstream: BMAD-METHOD repository (no dependency pinning, semver ^6.x)
- Lockfile: `package-lock.json` locks all transitive dependencies

## Environment Configuration

**Required env vars:**
- None — Application requires no environment variables
- Optional: Home directory (read from `process.env.HOME` or `os.homedir()`)

**Secrets location:**
- **Explicit policy: No auto-installed secrets**
- MCP server API keys: User must manually add via `mobmad mcp enable <name>`
- Env vars: User manages in their `~/.claude/settings.json` or shell profile
- **Never stored**: MCP configs with credentials not included in distribution

## Webhooks & Callbacks

**Incoming:**
- Type: None
- No webhook endpoints

**Outgoing:**
- Type: None
- No outbound webhooks

## Installation & Backup System

**Safety Features:**
- **Backup Strategy**: Every `install` creates timestamped backups: `~/.claude/.mobmad-backups/<timestamp>/`
- **Manifest Tracking**: `~/.claude/.mobmad-manifest.yaml` records all installed files for rollback
- **Rollback**: `mobmad uninstall --global` restores from most recent backup automatically
- **No overwrites without backup**: Existing `~/.claude/` directories always backed up first

## File Synchronization

**Sync Direction:** Project → Home directory
- Source: User's `~/.claude/` (skills, agents, rules, commands, hooks)
- Target: Project `global/` directory
- Command: `mobmad sync` (via `tools/sync-upstream.js`)
- Use case: Populate project with curated selections from upstream BMAD

**Package Direction:** Home → Project
- Source: User's `~/.claude/skills/`
- Target: Project `src/module/skills/`
- Command: `mobmad package` (via `tools/package-skills.js`)
- Use case: Generate BMAD-compatible manifests for distribution

---

*Integration audit: 2026-04-07*
