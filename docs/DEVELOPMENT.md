<!-- generated-by: gsd-doc-writer -->
# Development

This guide is for contributors hacking on **gomad** itself. If you only want to install gomad into your project, see `README.md`.

> **GSD workflow enforcement:** Per `CLAUDE.md`, start work through a GSD command (`/gsd-quick`, `/gsd-debug`, or `/gsd-execute-phase`) so planning artifacts and execution context stay in sync. Do not make direct repo edits outside a GSD workflow unless explicitly asked to bypass it.

## Local Setup

1. Clone the repository and enter the directory:
   ```bash
   git clone <repo-url> gomad
   cd gomad
   ```
2. Install dependencies (requires Node.js >= 18.0.0):
   ```bash
   npm install
   ```
3. No build step — gomad is pure ESM JavaScript and runs directly from source.

## Project Layout

For an in-depth tour, see `docs/ARCHITECTURE.md`. Quick reference:

| Path | Purpose |
|------|---------|
| `bin/gomad-cli.js` | CLI entry point (commander). Dynamically imports tools on demand. |
| `tools/curator.js` | Interactive skill/agent/hook selector using `@clack/prompts`. |
| `tools/installer.js` | Installs, uninstalls, and reports status of `.claude/` assets. |
| `catalog/*.yaml` | Source-of-truth catalogs: `skills.yaml`, `agents.yaml`, `commands.yaml`, `hooks.yaml`, `presets.yaml`. |
| `assets/` | Bundled asset payload copied into consumer projects (`agents/`, `commands/`, `hooks/`, `rules/`). |
| `test/test-*.js` | Test suite executed by `node --test`. |

## Running the CLI Locally

To exercise the CLI end-to-end against a scratch directory without publishing:

```bash
# From any scratch directory (not the gomad repo itself)
mkdir /tmp/gomad-scratch && cd /tmp/gomad-scratch
node /path/to/gomad/bin/gomad-cli.js install --preset full --yes
```

Useful commands during development:

```bash
node bin/gomad-cli.js --help        # List CLI commands
node bin/gomad-cli.js curate        # Interactive selection
node bin/gomad-cli.js status        # Show installed assets
node bin/gomad-cli.js uninstall     # Remove .claude/ assets
```

## Scripts

All scripts are defined in `package.json`:

| Command | Description |
|---------|-------------|
| `npm test` | Runs the full test suite via `node --test --test-timeout=120000 'test/test-*.js'`. |
| `npm run curate` | Launches the interactive curator (`node tools/curator.js`). |
| `npm run lint` | Runs ESLint over the repo (`npx eslint .`). |

## Adding a New Catalog Item

Catalog entries live in `catalog/*.yaml` and follow a flat metadata shape.

1. **Pick the right catalog** — `skills.yaml`, `agents.yaml`, `commands.yaml`, or `hooks.yaml`.
2. **Append an entry** with the required fields. For skills:
   ```yaml
   - name: my-new-skill
     description: One-line summary of what the skill does
     category: language   # language | framework | testing | review | security | devops | content | tool | domain | workflow
     default_include: false
   ```
   Agents and hooks have type-specific fields (`scope` for agents, `type` for hooks) — match the shape of existing entries in the same file.
3. **Ship the payload** — place the actual asset files under the matching `assets/<kind>/<name>/` subtree so installer can copy them.
4. **Wire it into a preset (optional)** — if the new item should ship with a preset, add its `name` to the appropriate array in `catalog/presets.yaml` (e.g., `presets.full-stack.skills`). The `full` preset uses `include_all: true` and picks up new items automatically.
5. **Run the tests** — `npm test` validates catalog integrity and preset resolution:
   - `test/test-catalogs.js` — every catalog item has required fields
   - `test/test-presets.js` — preset references resolve to real catalog entries
   - `test/test-installation.js` — installer round-trip
   - `test/test-decoupling.js` — no cross-module leakage
   - `test/test-publish-e2e.js` — pack + install + run E2E flow

## Linting

ESLint is available but no project-specific config file is checked in — lint runs use the default ruleset.

```bash
npm run lint
```

## Testing

Tests use Node's built-in test runner (`node:test`) and live in `test/test-*.js`. The suite includes 28 tests and typically completes in ~1.5 seconds (excluding `test-publish-e2e.js`, which performs `npm pack` + tarball install and can take 30–60s).

```bash
npm test                                    # Full suite
node --test test/test-catalogs.js           # Single file
node --test --test-name-pattern='preset' test/test-presets.js   # Filter by name
```

Test pattern conventions:

- Import `describe`, `it` from `node:test` and `assert` from `node:assert/strict`.
- Each test file is self-contained — no shared fixtures or mocks.
- Use `import.meta.url` + `fileURLToPath` to compute paths to catalog/assets.
- Prefer real filesystem round-trips over mocks for installer tests (use `os.tmpdir()` for isolation).

## Testing the Publish Flow Locally

Before shipping, verify the tarball install works end-to-end:

```bash
npm pack --dry-run              # Preview what would be published
node --test test/test-publish-e2e.js   # Full pack + install + run test
```

`test-publish-e2e.js` packs the repo with `npm pack`, installs the tarball into a randomized `os.tmpdir()` fixture, runs `gomad install --preset full --yes`, and asserts that the project-local `./.claude/` tree was populated. It has a 120-second budget to accommodate pack and install times.

The `files` field in `package.json` controls what ships in the tarball — currently `bin/`, `assets/`, `catalog/`, `tools/`, and `README.md`.

## Conventions

These conventions are enforced by convention (no automated formatter). Match existing code style.

- **ESM only** — `"type": "module"` in `package.json`. Use `import`/`export`, not `require`. Compute `__dirname` via `fileURLToPath(import.meta.url)` + `dirname`.
- **Filename casing** — kebab-case for CLI and tool scripts (`gomad-cli.js`, `curator.js`). Test files use `test-<feature>.js`.
- **Function naming** — camelCase for functions and locals. Verb-first for side effects (`installFiles`, `saveManifest`). UPPERCASE for module-level constants (`PROJECT_ROOT`, `CLAUDE_DIR`).
- **Indentation** — 2 spaces, no semicolons at line ends (optional in ESM).
- **Immutability** — prefer spread/copy over mutation. See `.claude/rules/common/coding-style.md` for the project's immutability rule.
- **File size** — 200–400 lines typical, 800 max. Extract utilities from large modules.
- **Error handling** — explicit try/catch for parse operations with fallback returns (`try { parseYaml(...) } catch { return null }`). Use `existsSync()` guards before filesystem operations. Throw for critical failures (`throw new Error('Unknown preset: ...')`).
- **Dynamic imports** — CLI commands in `bin/gomad-cli.js` use dynamic `import()` to defer tool loading until a subcommand runs.
- **No global writes** — gomad must never write to `~/` or `$HOME` (project constraint from `CLAUDE.md`).

## Next Steps

- `docs/ARCHITECTURE.md` — Component diagrams, data flow, and directory rationale.
- `docs/CONFIGURATION.md` — Preset definitions, catalog fields, and configuration knobs.
- `README.md` — End-user installation and quick start.
