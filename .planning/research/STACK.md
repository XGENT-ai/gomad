# Stack Research

**Domain:** CLI installer + Claude Code slash-command artifact generation (v1.2 delta on existing Node.js package `@xgent-ai/gomad@1.1.1`)
**Researched:** 2026-04-18
**Confidence:** HIGH

## TL;DR

v1.2 requires **zero new runtime dependencies**. Every capability the milestone needs — CSV read/write, file copy, YAML frontmatter, interactive prompts, colorized output, recursive glob, semver checks — is already present in `package.json`. The work is purely:

1. **Author** seven `.claude/commands/gm/agent-*.md` files with Claude Code skill-compatible frontmatter (`name`, `description`, plus optional `argument-hint` / `disable-model-invocation` / `allowed-tools`).
2. **Extend** the existing `files-manifest.csv` writer (`tools/installer/core/manifest-generator.js:587`) to also track files written outside `_gomad/` (the new `.claude/commands/gm/` output).
3. **Add** a pre-install cleanup pass that reads the prior `files-manifest.csv` and `fs.remove`s each path before re-writing.
4. **Remove** the symlink branch (`fs.ensureSymlink` at `tools/installer/ide/_config-driven.js:171`) and replace with `fs.copy`.

The single load-bearing external contract is **Claude Code's slash-command file format** — verified below against the current official docs (2026 edition).

## Recommended Stack — v1.2 Delta

### Core Technologies (unchanged from v1.1)

| Technology | Version (pinned) | Purpose | Why Recommended |
|---|---|---|---|
| Node.js | `>=20.0.0` (engine) | Runtime | Already locked in `engines.node`; v20 LTS ships stable `fs.cp`, but we keep `fs-extra` for `ensureDir`/`copy` ergonomics |
| CommonJS (`type` unset in package.json despite PROJECT.md claim) | — | Module system | **Verified:** `package.json` has no `"type": "module"` field, and `gomad-cli.js` uses `require(...)`. PROJECT.md line 78 saying `type: module` is incorrect — the installer is CommonJS. v1.2 must continue using `require()` in `tools/installer/` |
| Claude Code slash-command / skill format | 2026 spec | Output artifact format | Load-bearing for the whole CMD requirement. See format reference below |

### Dependencies Already Installed (all keep current pins; no bumps needed for v1.2)

| Library | Current Pin | Latest on npm | Purpose in v1.2 | Bump Needed? |
|---|---|---|---|---|
| `fs-extra` | `^11.3.0` | `11.3.4` | Copy directories (`fs.copy`), ensure-dir, remove files, path-exists. The primary filesystem workhorse for copy-only install + cleanup | No — `^11.3.0` resolves to latest 11.x |
| `csv-parse` | `^6.1.0` | `6.2.1` | Parse prior `files-manifest.csv` on re-install for cleanup pass. Already used at `tools/installer/ide/_config-driven.js:6` (`csv-parse/sync`) | No |
| `yaml` | `^2.7.0` | `2.8.3` | Parse skill-manifest.yaml + write install manifest.yaml. Used throughout installer | No |
| `js-yaml` | `^4.1.0` | `4.1.1` | Legacy YAML reader paired with `yaml`. Keep both during v1.2 — removing one is a separate refactor | No |
| `@clack/prompts` | `^1.0.0` | `1.2.0` | Interactive installer prompts. E2E test (per v1.1 key decision) avoids `install` in CI due to TTY hang — keep that pattern | No |
| `@clack/core` | `^1.0.0` | — | Transitive of @clack/prompts, required directly for some primitives | No |
| `chalk` | `^4.1.2` | `5.6.2` | **Do NOT upgrade.** Chalk 5 is ESM-only; installer is CommonJS. `chalk@4` is the CJS-compatible line and is intentionally pinned | **No — hold at 4.x** |
| `picocolors` | `^1.1.1` | `1.1.1` | Lightweight color fallback (CJS-safe). Already the preferred stick-color lib | No |
| `commander` | `^14.0.0` | `14.0.3` | CLI arg parsing for `gomad install` / `gomad uninstall`. v1.2 may add flags but no API change | No |
| `glob` | `^11.0.3` | `13.0.6` | Recursive file enumeration during installer's allInstalledFiles collection. Current `^11` still supported; v13 upgrade is orthogonal to v1.2 | **No — defer** |
| `semver` | `^7.6.3` | `7.7.4` | Version comparison for update-check banner in `gomad-cli.js:37` | No |

### No New Runtime Dependencies Needed

**Explicit null result for the milestone's open question.** Every capability the installer needs is already shipped:

- **CSV parsing:** `csv-parse/sync` ✓ (at `tools/installer/ide/_config-driven.js:6`)
- **CSV writing:** Hand-rolled string concat in `writeFilesManifest()` at `manifest-generator.js:590-645`. This is fine for v1.2 — the header `type,name,module,path,hash` has five columns, none containing commas/newlines/quotes in practice. **Do NOT add `csv-stringify`** — it's 150 KB and solves zero problems we have
- **File copy:** `fs-extra.copy` ✓ (at `tools/installer/file-ops.js:23`)
- **YAML frontmatter generation:** `yaml.stringify` ✓ (used throughout)

### Dev Dependencies (unchanged)

| Tool | Version | Purpose | v1.2 Notes |
|---|---|---|---|
| `jest` | `^30.2.0` | Installer unit + component tests | Existing `test:install` script covers new copy-mode path |
| `eslint` + plugins | `^9.33.0` family | Lint | No config change for v1.2 |
| `prettier` | `^3.7.4` | Format | No config change |
| `markdownlint-cli2` | `^0.19.1` | Markdown lint | **Will flag generated `.claude/commands/gm/agent-*.md`** — ensure the generator produces lint-clean frontmatter + content, or add those paths to `.markdownlintignore` |
| `husky` + `lint-staged` | `^9.1.7` / `^16.1.1` | Pre-commit gates | No change |

## Claude Code Slash-Command Format (v1.2 Output Spec)

**Source:** [code.claude.com/docs/en/slash-commands](https://code.claude.com/docs/en/slash-commands) — fetched 2026-04-18. Confidence: HIGH (official Anthropic docs).

### Unified "Skills" Model (2026)

In the 2026 edition, custom commands and skills are **merged**. Per the official note:

> **Custom commands have been merged into skills.** A file at `.claude/commands/deploy.md` and a skill at `.claude/skills/deploy/SKILL.md` both create `/deploy` and work the same way. Your existing `.claude/commands/` files keep working.

**Implication for v1.2:** `.claude/commands/gm/agent-*.md` is a fully supported form. Skills (`.claude/skills/<name>/SKILL.md`) are the "recommended" form for new work, but the milestone explicitly targets `.claude/commands/gm/` per PROJECT.md line 9. Both load the same frontmatter; no semantic difference for our use case. Stick with `.claude/commands/` as specified.

### File Location & Invocation

| Location | Path | Scope |
|---|---|---|
| Project | `.claude/commands/<name>.md` | This repo only (what the installer writes) |
| Personal | `~/.claude/commands/<name>.md` | User-global (not our target) |

**Subdirectory → namespace prefix:** A file at `.claude/commands/gm/agent-pm.md` is invoked as `/gm:agent-pm` — confirmed by multiple sources ([Learnia 2026 reference](https://learn-prompting.fr/blog/claude-code-slash-commands-reference), [aiengineerguide](https://aiengineerguide.com/til/claude-code-custom-command/)). The subdirectory becomes a colon-separated namespace. This matches existing `.claude/commands/gsd/new-milestone.md` in this repo, invoked as `/gsd:new-milestone` — **prior art in the same repo confirms the format** (see `/Users/rockie/Documents/GitHub/xgent/gomad/.claude/commands/gsd/new-milestone.md` which uses `name: gsd:new-milestone` in frontmatter).

**Filename:** Kebab-case, `.md` extension. The filename (minus `.md`) determines the command name if frontmatter `name:` is absent. Max 64 chars, lowercase+digits+hyphens only.

### Frontmatter Reference (authoritative, all fields)

All fields optional; only `description` recommended. Fields we care about for v1.2 in **bold**:

| Field | v1.2 Usage |
|---|---|
| **`name`** | Set to `gm:agent-pm` etc. Matches the intended invocation `/gm:agent-pm` — frontmatter name with a colon is the canonical form already used by this repo's own `gsd:new-milestone` commands |
| **`description`** | Required for the skill listing. Front-load keywords: *"Product Manager for PRD creation. Use when the user wants to talk to John, draft a PRD, or gather product requirements."* Capped at 1,536 chars combined with `when_to_use` |
| `when_to_use` | Optional trigger phrases. Append if the base description grows past its keyword budget |
| `argument-hint` | Optional — e.g. `[topic]` shown during autocomplete. Probably unused for persona agents |
| **`disable-model-invocation`** | **Recommended `true`** for persona-style agents to prevent Claude from auto-invoking them mid-conversation. The user explicitly runs `/gm:agent-pm` when they want John |
| `user-invocable` | Leave default (`true`) so the command appears in the `/` menu |
| `allowed-tools` | Optional tool allowlist. Do **not** set — persona agents need the full tool surface |
| `model` / `effort` | Don't set. Inherit session defaults |
| `context: fork` | **Do not use.** Persona agents are conversational; forked context loses chat history |
| `paths` | Don't set. Personas aren't file-scoped |

### String Substitutions Available

| Variable | Purpose |
|---|---|
| `$ARGUMENTS` | All args joined |
| `$0`, `$1`, `$2` (or `$ARGUMENTS[N]`) | Positional args, 0-indexed, shell-style quoting |
| `${CLAUDE_SESSION_ID}` | Session ID for logging |
| `${CLAUDE_SKILL_DIR}` | Directory containing the invoked file |

### Example v1.2 Command File

Target output at `.claude/commands/gm/agent-pm.md`:

```markdown
---
name: gm:agent-pm
description: Product Manager (John) for PRD creation, requirements discovery, and stakeholder alignment. Use when the user asks to talk to John, draft a PRD, gather product requirements, or needs a product manager persona.
disable-model-invocation: true
---

You must fully embody this agent's persona and follow all activation instructions exactly as specified. NEVER break character until given an exit command.

<agent-activation CRITICAL="TRUE">
1. LOAD the FULL agent file from {project-root}/_gomad/gomad/agents/pm.md
2. READ its entire contents - this contains the complete agent persona, menu, and instructions
3. Execute ALL activation steps exactly as written in the agent file
4. Follow the agent's persona and menu system precisely
5. Stay in character throughout the session
</agent-activation>
```

This shape is nearly identical to the existing `tools/installer/ide/templates/agent-command-template.md` — v1.2's change is: (a) **path**: flat dash format `gomad-agent-pm.md` → namespaced `gm/agent-pm.md`; (b) **name field**: `pm` → `gm:agent-pm`; (c) add `disable-model-invocation: true` to avoid accidental auto-activation.

## Integration with Existing Installer Code

| Concern | Existing code | v1.2 change |
|---|---|---|
| CSV manifest writer | `tools/installer/core/manifest-generator.js:587` writes `_gomad/_config/files-manifest.csv` with header `type,name,module,path,hash` | **Extend `allInstalledFiles` to include paths outside `_gomad/`** — specifically `.claude/commands/gm/agent-*.md`. The CSV `path` column is already relative-path; widen the scheme so entries can begin with `.claude/` not just `_gomad/`-stripped relative paths |
| Manifest reader + cleanup | Currently read only by `_config-driven.js:143` (for verbatim-skill installation). Cleanup logic exists but only removes `gomad*`-prefixed entries in target dirs (`_config-driven.js:290`) | **New: pre-install pass** — before writing anything, if `_gomad/_config/files-manifest.csv` exists, read it, iterate rows, `fs.remove` each path. Happens once at the top of `installer.install()` before any copy step |
| Symlink mode | `tools/installer/ide/_config-driven.js:169-171` creates relative symlinks: `await fs.ensureSymlink(relTarget, skillDir)` | **Replace with copy:** `await fs.copy(sourceDir, skillDir, { overwrite: true })`. The `fs-extra.copy` call already dereferences symlinks by default — no extra option needed |
| Agent-command generator | `tools/installer/ide/shared/agent-command-generator.js` generates flat `gomad-agent-gomad-pm.md` via `writeDashArtifacts()` (and older colon/underscore variants) | **New writer method** `writeNamespacedArtifacts(baseCommandsDir, artifacts)` that writes to `<baseCommandsDir>/gm/agent-<name>.md`. Reuse `agent-command-template.md` but update the frontmatter block and the path-in-module references |
| Template | `tools/installer/ide/templates/agent-command-template.md` — 3-field frontmatter, activation block | **Update:** add `disable-model-invocation: true`, change `name` value scheme, keep activation block as-is |
| Uninstall | `tools/installer/commands/uninstall.js:121-126` and `installer.uninstallIdeConfigs` scan target dirs for `gomad*`-prefixed entries | **Extend** to also delete `.claude/commands/gm/` directory as a unit. Cleaner than relying on prefix-matching once artifacts move to a subdirectory |

## Alternatives Considered

| Recommended | Alternative | When Alternative Makes Sense |
|---|---|---|
| Keep hand-rolled CSV write in `manifest-generator.js` | Add `csv-stringify@6.5.1` | Only if we start writing user-generated content into CSV rows (paths with commas/quotes). Installed files are controlled source paths — no escaping edge cases. Defer until we hit a real parse failure |
| Keep `chalk@4` (CJS) | `picocolors` everywhere, drop `chalk` | Low-value refactor for v1.2. Two color libs adds ~15 KB total and both are battle-tested. Defer |
| Keep both `js-yaml` + `yaml` | Consolidate on `yaml@2` | Consolidation is a cross-file refactor touching ~10 call sites. Not in v1.2 scope. Keep both for now |
| `.claude/commands/gm/agent-*.md` (project-scoped) | `.claude/skills/gm-agent-*/SKILL.md` (project-scoped skill) | Skills form is Anthropic's "recommended" path forward and unlocks supporting-file sidecars. But v1.2 requirement explicitly says **commands** form. Revisit in a later milestone if we want to ship rich agent reference bundles |
| Copy-only install | Keep `--symlink` flag as opt-in | REQ-INSTALL says "symlink mode removed". Adding a hidden flag re-adds surface area. Remove fully; users who want in-place editing can `git clone` and install into their workspace |

## What NOT to Add

| Avoid | Why | Use Instead |
|---|---|---|
| `csv-stringify` | Over-engineering. Our 5-column CSV has no values needing RFC-4180 escaping. Adds dep + install time | Keep existing string-concat writer at `manifest-generator.js:590-645` |
| `chalk@5` | ESM-only. Installer is CommonJS. Upgrade would require converting `tools/installer/**` to `.mjs` or top-level `"type": "module"`, which conflicts with the `require()`-based module loader pattern | Hold `chalk@^4.1.2` |
| `inquirer` / `prompts` (sindresorhus) | We already use `@clack/prompts`. Adding a second prompting lib is duplication | Extend existing `prompts.js` wrapper |
| `zod` / `ajv` for manifest schema | CSV manifest has 5 fixed columns; YAML manifest has known top-level shape. Schema validators are overkill for a local-only artifact file we control both ends of | Keep hand-written parse + shape check |
| `fast-glob` / `globby` | `glob@^11` is already in deps and adequate. Don't mix glob libs | Use existing `glob` |
| Node built-in `fs.cp` (recursive) | Available in Node 20+, but `fs-extra.copy` has better semantics (filter callbacks, `overwrite`, `errorOnExist`) and is already the project's idiom | Keep `fs-extra.copy` |
| Any new prompts, spinner, or TUI library | Scope creep | `@clack/prompts` only |
| Context7 / MCP tooling in the installer runtime | The installer runs outside an AI session; it doesn't invoke Claude | N/A |
| A `.claude/commands/gm/` "skill" directory with nested SKILL.md | Spec says **commands**, not skills. Using `.claude/commands/gm/agent-pm.md` is the explicit target form | `.claude/commands/gm/agent-<name>.md` single file per agent |

## Version Compatibility Notes

| Package A | Compatible With | Notes |
|---|---|---|
| `chalk@4.x` | Node 20+ (CommonJS) | Chalk 4 is the last CJS line. Chalk 5+ is ESM-only — upgrading requires a full installer ESM conversion, out of v1.2 scope |
| `fs-extra@11.x` | Node 20+ | Stable; `.copy()` on Node 20 no longer needs fallback polyfills |
| `csv-parse@6.x` | Node 20+ | v6 is the current major; `csv-parse/sync` subpath import works in CJS (we use it already) |
| `@clack/prompts@1.2.0` | Node 18+ | Known issue (per v1.1 key decisions): hangs in non-TTY environments. E2E test intentionally avoids `install` command execution — preserve this pattern for v1.2 new tests |
| `glob@11` vs `glob@13` | — | Breaking changes between 11 and 13 include removed sync API variants. Defer upgrade; v1.2 doesn't need anything 13-only |

## Non-Stack Concerns (for roadmap awareness)

These are **process** items the stack doesn't solve but that intersect the tech choices:

- **Reference sweep tooling** already exists: `tools/validate-file-refs.js` + `test/test-file-refs-csv.js` + `test:refs` script. v1.2's REF requirement reuses this machinery — feed it the `gm-agent-*` → `gm:agent-*` mapping as a new rule. No new lib.
- **Frontmatter generation correctness** — Markdownlint may flag trailing newlines, heading increments, etc. in generated `.claude/commands/gm/agent-*.md`. Validate with `npm run lint:md` after codegen; add to `.markdownlintignore` if template constraints conflict (personas often have non-standard heading flow).
- **PRD content refinement** (REQ-PRD) is **pure markdown editing** inside `src/gomad-skills/2-plan-workflows/gm-create-prd/` and `gm-product-brief/`. No stack change. No new deps.

## Installation Commands

**No install changes for v1.2.** The current `package.json` deps are sufficient.

If someone tries to add a new runtime dep during implementation, challenge it against this document. If a genuinely-justified new dep emerges, add via:

```bash
npm install <pkg>@<exact-major>      # runtime
npm install -D <pkg>@<exact-major>   # dev-only
```

And update this document's "No New Runtime Dependencies Needed" section with the justification.

## Sources

- [Claude Code Slash Commands & Skills — official docs, 2026](https://code.claude.com/docs/en/slash-commands) — HIGH confidence, primary source for frontmatter fields, file locations, subdirectory namespace rules, string substitutions
- [Claude Code Slash Commands: Complete Reference Guide 2026 — Learnia Blog](https://learn-prompting.fr/blog/claude-code-slash-commands-reference) — MEDIUM confidence, corroborated colon-namespace subdirectory invocation syntax
- [How to Add Custom Slash Commands in Claude Code — aiengineerguide](https://aiengineerguide.com/til/claude-code-custom-command/) — MEDIUM confidence, confirmed namespace/prefix behavior
- [Agent Skills open standard — agentskills.io](https://agentskills.io) — referenced by official docs as the cross-tool base spec
- `package.json` at `/Users/rockie/Documents/GitHub/xgent/gomad/package.json` — ground truth for current pins
- `tools/installer/core/manifest-generator.js:587-647` — existing `writeFilesManifest` (CSV schema: `type,name,module,path,hash`)
- `tools/installer/ide/_config-driven.js:140-174` — existing `csv-parse/sync` read path + `fs.ensureSymlink` call to replace
- `tools/installer/ide/templates/agent-command-template.md` — existing template to adapt
- `.claude/commands/gsd/new-milestone.md` — in-repo prior art: command named `gsd:new-milestone` living at `gsd/new-milestone.md`, confirming the subdirectory-as-namespace pattern
- `npm view` output 2026-04-18 for latest versions of each dep

---
*Stack research for: CLI installer + Claude Code slash-command artifacts (v1.2 delta)*
*Researched: 2026-04-18*
