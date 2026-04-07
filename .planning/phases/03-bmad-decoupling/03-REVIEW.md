---
status: issues_found
phase: 03-bmad-decoupling
depth: standard
files_reviewed: 23
findings:
  critical: 0
  warning: 0
  info: 4
  total: 4
---

# Phase 3: Code Review Report — BMAD Decoupling

## Summary

Phase 3 BMAD decoupling looks structurally sound. The four `test-decoupling.js` guardrails are well-scoped and assert exactly what they should:

1. `peerDependencies` deleted (not just emptied)
2. `src/module/` removed
3. No agent file carries BMAD frontmatter (`module:`, `canonicalId:`, `bmm-`/`mob-` name prefixes)
4. No source file references `bmad-method`, with `BMAD/`, `node_modules/`, `.planning/`, and `package-lock.json` correctly excluded by walking only `bin tools src test assets catalog`

`bin/gomad-cli.js` no longer registers the `package` command. `package.json` has no `peerDependencies`, no `bmad-method` in deps/devDeps, no orphaned scripts, and the `files` array is correctly scoped to `bin/`, `assets/`, `catalog/`, `tools/`, `README.md`. All 16 ex-BMAD agent files in `assets/agents/` use clean frontmatter (`name`, `description`, `tools`) with no BMAD-specific fields or `bmm-`/`mob-` prefixes.

No Critical or Warning findings. Four Info-level documentation drift items follow.

## Findings

### IN-01: Stale agent count comment in catalog/agents.yaml header

**File:** `catalog/agents.yaml:4`
**Severity:** info

Header comment says `# === Global Agents (33) ===` but the section contains 36 global agents. The footer comment on line 216 (`# Total: 52 agents (36 global + 16 project)`) is correct, so the file is internally inconsistent.

**Fix:**
```yaml
# === Global Agents (36) ===
```

### IN-02: Stale total counts in `full` preset description

**File:** `catalog/presets.yaml:5`
**Severity:** info

Description reads `"Everything — all 165 skills, 48 agents, 70 commands, 36 hooks"`. After Phase 3, `catalog/agents.yaml` contains 52 agents (per its own footer). The "48 agents" string is stale and will further drift as the catalog grows. Consider either updating to the correct number or removing the count entirely so it can't go stale.

**Fix:**
```yaml
full:
  description: "Everything — every skill, agent, command, and hook in the catalog"
  include_all: true
```

### IN-03: `enhanced` preset description overstates skill count

**File:** `catalog/presets.yaml:259`
**Severity:** info

Description says `"16 project agents + complementary skills (~25 skills)"`. `enhanced` extends `lean` (14 skills) and adds 6 more under `additional_skills:`, totaling 20 — not ~25. Minor doc drift; tests pass because `test-presets.js` only validates references, not counts.

**Fix:** Update description to `"16 project agents + complementary skills (~20 skills)"` or drop the parenthetical.

### IN-04: `mcp` command still labelled "Phase 6 — not yet implemented"

**File:** `bin/gomad-cli.js:60`
**Severity:** info

Pre-existing TODO not introduced by Phase 3, but worth flagging. The `mcp` subcommand prints `"Phase 6 — not yet implemented"` and `"TODO: Enable MCP server..."`. Not blocking — this is an intentional placeholder, but consider tracking it as an issue rather than a runtime TODO string.

**Fix:** Either implement the stub or move the placeholder text into a tracked issue and have the CLI emit a clear "not yet available" message without the `TODO:` literal.

## Notes on Out-of-Scope Verification

- `test/test-installation.js:31` correctly asserts the removed `package` command no longer appears in `--help` output.
- `test/test-presets.js:108-135` will catch any catalog drift where a preset references a deleted agent — defense in depth against the kind of stale references Phase 3 was at risk of leaving behind.
- The `enhanced` preset's `additional_agents` mixes 16 project-scope agents with 3 global agents (`doc-updater`, `docs-lookup`, `refactor-cleaner`); intentional and resolves cleanly through the catalog.
