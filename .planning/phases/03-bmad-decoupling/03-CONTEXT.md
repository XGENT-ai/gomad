# Phase 3: BMAD Decoupling - Context

**Gathered:** 2026-04-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Remove BMAD-METHOD peer dependency, registration system, and integration layer from gomad. Preserve the 16 BMAD agents as regular Claude Code agents installable via the existing catalog/preset system. No runtime imports of `bmad-method`. No `src/module/` BMAD registration artifacts.

In scope: package.json, src/module/, tools/package-skills.js, agent file frontmatter, catalog/agents.yaml, related tests.

Out of scope: publishing to npm (Phase 4), any new agent capabilities, refactoring agents beyond removing BMAD frontmatter.

</domain>

<decisions>
## Implementation Decisions

### Agent Destination
- **D-01:** Move all 16 ex-BMAD agents from `src/module/agents/{analysis,planning,research,review}/*.md` to `assets/agents/` (flat — no subdirectories preserved). Category becomes metadata only.
- **D-02:** Register all 16 agents in `catalog/agents.yaml` so they are first-class, installable via `gomad install` and selectable via curate/presets, matching the Phase 2 architecture for every other agent.

### Agent Naming and Frontmatter
- **D-03:** Strip the `mob-` canonical-ID prefix from every agent. Example: `mob-codebase-analyzer` → `codebase-analyzer`. Filenames already match the unprefixed form.
- **D-04:** Strip BMAD-specific frontmatter fields from each agent .md file: `module`, `canonicalId`, `displayName`, `title`. Keep `name`, `description`, and any `tools` field. Result must match the frontmatter shape of other agents already in `assets/agents/`.
- **D-05:** Delete `src/module/agents/skill-manifest.yaml` (the BMAD agent manifest) — no replacement; catalog/agents.yaml is the source of truth.

### src/module/ Fate
- **D-06:** Delete `src/module/` entirely after migration: `module.yaml`, `module-help.csv`, `agents/skill-manifest.yaml`, the `agents/` subtree, and (pending audit per D-07) `skills/`. This satisfies BMA-02 cleanly and removes all BMAD registration artifacts.
- **D-07:** Before deleting `src/module/skills/`, the executor MUST audit the repo for any references to that path. If anything still consumes it, surface a deviation; otherwise delete. Do not assume — verify.
- **D-08:** Remove the stale `install_global_assets` prompt block from `module.yaml` is moot once the file is deleted, but flag explicitly: nothing in the new structure may reintroduce a prompt that writes to `~/.claude/`.

### package-skills.js Fate
- **D-09:** Delete `tools/package-skills.js` entirely. Its only purpose was generating BMAD-compatible SKILL.md + skill-manifest.yaml.
- **D-10:** Remove the `gomad package` command registration from `bin/gomad-cli.js` (currently at lines ~57-58: `import('../tools/package-skills.js')` and `packageSkills()` call).
- **D-11:** Remove `package-skills.js` references from `test/test-installation.js:45-46` and `test/test-module.js:86`.

### Tests
- **D-12:** Delete BMAD-specific test cases that exercise BMAD module structure or `package-skills` behavior.
- **D-13:** Add new decoupling assertion tests: (a) `package.json` has no `bmad-method` in dependencies or peerDependencies, (b) `src/module/` does not exist, (c) no agent file in `assets/agents/` contains `module:` or `canonicalId:` fields, (d) no source file imports `bmad-method`.

### package.json
- **D-14:** Remove the entire `peerDependencies` block (currently only contains `bmad-method: ^6.x` at line 24). If the block becomes empty, delete the key.

### Claude's Discretion
- Exact organization of catalog/agents.yaml entries (categories, default_include flags) — planner/executor decides based on existing catalog conventions.
- Whether the 16 agents need any `tools:` declarations in frontmatter — executor inspects each file and matches existing agent conventions.
- Test framework details (vitest spec layout) — match existing test/ patterns.
- Whether any preset (full, full-stack, enhanced) should default-include the new agents — planner decides based on existing preset philosophy.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project planning
- `.planning/PROJECT.md` — vision, BMAD-decoupling rationale, key decisions, constraints (no global writes)
- `.planning/REQUIREMENTS.md` — requirements BMA-01 through BMA-05 (the acceptance criteria for this phase)
- `.planning/ROADMAP.md` §"Phase 3: BMAD Decoupling" — goal and success criteria

### Prior phase context
- `.planning/phases/02-project-local-install/02-CONTEXT.md` — Phase 2 decisions establishing `assets/` and `.claude/` as canonical install paths (if present)
- `.planning/phases/02-project-local-install/02-RESEARCH.md` — codebase patterns from Phase 2 worth preserving

### Code touchpoints
- `package.json` §dependencies/peerDependencies — bmad-method removal target
- `bin/gomad-cli.js` §package command — CLI surface to remove
- `tools/package-skills.js` — file slated for deletion
- `src/module/module.yaml` — BMAD module registration to delete
- `src/module/module-help.csv` — BMAD help registration to delete
- `src/module/agents/skill-manifest.yaml` — BMAD canonical ID manifest to delete
- `src/module/agents/{analysis,planning,research,review}/*.md` — 16 agent files to migrate
- `catalog/agents.yaml` — destination for new catalog entries
- `assets/agents/` — destination for migrated agent files
- `test/test-installation.js`, `test/test-module.js` — tests to update

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `catalog/agents.yaml` — already the canonical agent registry; just add 16 new entries following existing schema
- `assets/agents/` — Phase 2 established this as the install source; new home for the 16 agents
- Existing curator/installer flow already handles agent installation end-to-end — no new tooling needed

### Established Patterns
- Catalog-driven installation: every installable item has a YAML entry + a file under `assets/`. The 16 agents must conform to this pattern, not invent a new one.
- Project-local only: nothing in this phase may reintroduce `~/.claude/` writes (Phase 2 decision).
- Frontmatter shape for agents in `assets/agents/` is the template; ex-BMAD agents must match it.
- Tests live in `test/` and use vitest (Phase 1 migration).

### Integration Points
- `bin/gomad-cli.js` — remove the `package` command registration; nothing else in the CLI references BMAD.
- `catalog/agents.yaml` — additive change (new entries); preset files may need to reference the new agents if any preset wants them by default.
- `test/` — both removing old tests and adding new negative-assertion tests.

### Known Gotchas
- `src/module/agents/skill-manifest.yaml` uses `mob-*` IDs that may be referenced from elsewhere — grep before deleting.
- `src/module/skills/` may contain packaged skill duplicates — D-07 requires an audit before deletion.
- The `install_global_assets` prompt in `module.yaml` is dead code post-Phase-2 but still present in the file; deleting `module.yaml` removes it.

</code_context>

<specifics>
## Specific Ideas

- "Preserve as regular agents" (BMA-04) — interpreted as: same files, stripped frontmatter, registered through the normal catalog path. No special "BMAD lineage" marker.
- The decoupling test (D-13) should be a fast guardrail that fails loudly if anyone reintroduces a BMAD reference.
- D-07 is intentionally deferred-to-execution: the user chose "Audit first, decide during execution" rather than blanket-deleting `src/module/skills/`.

</specifics>

<deferred>
## Deferred Ideas

- Reorganizing or pruning `catalog/agents.yaml` — out of scope; this phase only adds entries.
- Updating presets to include or exclude the new ex-BMAD agents — Claude's discretion noted above; can revisit in Phase 4 verification.
- Documentation/README updates explaining the 16 new agents — belongs to Phase 4 publish step.
- npm publish configuration — Phase 4.

### Reviewed Todos (not folded)
None — no matching todos surfaced.

</deferred>

---

*Phase: 03-bmad-decoupling*
*Context gathered: 2026-04-07*
