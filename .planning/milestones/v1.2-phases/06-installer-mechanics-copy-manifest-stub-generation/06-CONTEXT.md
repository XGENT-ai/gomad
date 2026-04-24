# Phase 6: Installer Mechanics — Copy + Manifest + Stub Generation - Context

**Gathered:** 2026-04-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Ship three tightly-coupled installer-internal changes as one coherent unit:

1. **Copy-only install** — replace `fs.ensureSymlink` → `fs.copy` universally across all IDEs in `tools/installer/ide/_config-driven.js`; pre-check destination with `fs.lstat` on re-install and unlink any pre-existing symlink before copying (INSTALL-01, INSTALL-02).
2. **Manifest v2 schema** — `_gomad/_config/files-manifest.csv` gains a `schema_version` per-row column (value `2.0`) and an `install_root` column so IDE-target paths (`.claude/commands/gm/*.md`, `.<ide>/skills/*`) live in the same unified manifest as `_gomad/`-internal paths; both read AND write go through `csv-parse` (existing dep) (INSTALL-03, INSTALL-04).
3. **Agent-command generator revival** — `tools/installer/ide/shared/agent-command-generator.js` is rewired to (a) extract persona body from `src/gomad-skills/*/gm-agent-*/SKILL.md` into `_gomad/gomad/agents/<name>.md` at install time and (b) write 7 launcher files to `.claude/commands/gm/agent-{analyst,tech-writer,pm,ux-designer,architect,sm,dev}.md` for the `claude-code` IDE only (CMD-01, CMD-02, CMD-03, CMD-04).

Out of scope for this phase: manifest-driven cleanup with realpath containment, dry-run flag, and backup snapshotting (Phase 7 — INSTALL-05/06/08/09); broader v1.1→v1.2 legacy cleanup beyond the specific removal of `.claude/skills/gm-agent-*/` (Phase 7 — INSTALL-07); reference sweep across source/docs/tests (Phase 9 — REF-01/02/04/05); PRD refinement (Phase 8).

</domain>

<decisions>
## Implementation Decisions

### Persona-extraction contract (CMD-03, CMD-04, D-06 concretization)

- **D-14:** Extraction scope is **full body sans frontmatter** — installer strips only the leading YAML frontmatter block (`name:` / `description:`) from `src/gomad-skills/*/gm-agent-*/SKILL.md` and copies the remaining prose verbatim into `_gomad/gomad/agents/<name>.md`. Preserves SKILL.md as single source of truth; no section-by-section filtering to maintain.
- **D-15:** Extracted `_gomad/gomad/agents/<name>.md` gets **full `skill-manifest.yaml` mirrored as its own frontmatter** — every field (`type`, `name`, `displayName`, `title`, `icon`, `capabilities`, `role`, `identity`, `communicationStyle`, `principles`, `module`) copied from `src/gomad-skills/*/gm-agent-*/skill-manifest.yaml` at install time. Gives the extracted file full traceability metadata.
- **D-16:** Launcher body at `.claude/commands/gm/agent-<name>.md` carries rich metadata via a **fenced YAML metadata block then prose activation** — a `\`\`\`yaml ... \`\`\`` block with `displayName`, `title`, `icon`, `capabilities` fields at the top of the body, followed by prose activation instructions that tell Claude to load and embody the persona from `_gomad/gomad/agents/<name>.md`.
- **D-17:** Launcher `description:` frontmatter field follows the format **`<Title> (<displayName>). <one-line purpose>`** — e.g., `"Business Analyst (Mary). Market research, competitive analysis, requirements elicitation."`. Title leads for searchability; displayName in parens gives persona; purpose clause informs Claude's routing.
- **D-18:** Because rich metadata now lives in three places (`skill-manifest.yaml` source + extracted agent-file frontmatter per D-15 + launcher body YAML fence per D-16), **both derivation paths MUST read from `skill-manifest.yaml` at generation time** — the extractor and the launcher generator do not quote from each other. Prevents drift; `skill-manifest.yaml` stays authoritative.

### Copy-only switch & symlink-leftover handling (INSTALL-01, INSTALL-02)

- **D-19:** Copy-only applies **universally to all IDEs** (claude-code, cursor, codex, auggie, …). `fs.ensureSymlink` at `_config-driven.js:171` is replaced with `fs.copy`; no per-IDE gate on copy behavior. Matches INSTALL-01 as written and keeps one installer code path.
- **D-20:** On re-install, when `fs.lstat` finds a pre-existing symlink at the install destination: **log one info-level line `"upgrading from symlink: <path>"`, `fs.unlink` the symlink, then `fs.copy`**. Closes Pitfall #3 (symlink leftovers + source-tree pollution via link traversal) with minimal noise and full observability of the v1.1→v1.2 transition.
- **D-21:** If the destination is a **regular file** (not a symlink) and is not in the prior manifest: **always overwrite**. This is an intentional interim posture — v1.1's `.bak` preservation flow (`installer.js:461–525`) protects files under `_gomad/` but not under IDE-target paths (`.claude/commands/gm/`, `.claude/skills/`). Phase 7's manifest-driven cleanup (INSTALL-05/09) layers `.bak` snapshot safety back on for all destinations. Phase 6 alone = overwrites silently; this is accepted and documented.
- **D-22:** The `fs.lstat` symlink pre-check is **gated on re-install** — only runs when `_gomad/_config/files-manifest.csv` is present at install start. Fresh installs skip the `lstat` entirely (nothing to leftover-handle). Tightens fresh-install performance and scopes upgrade-mode logic cleanly.

### Manifest v2 schema (INSTALL-03, INSTALL-04)

- **D-23:** `schema_version` lives as a **per-row column** — CSV header becomes `type,name,module,path,hash,schema_version,install_root` (order to be finalized in plan) and every row carries `"2.0"` in the `schema_version` cell. Missing column on old manifests → treated as implicit v1. Trivially parsed by `csv-parse` (no comment-line or magic-row handling needed).
- **D-24:** `schema_version` value is the **string `"2.0"` (semver-ish)** — not `"2"` or `"1.2"`. Permits future `"2.1"`/`"2.2"` minor schema bumps without a major-version jump; decoupled from npm release numbering.
- **D-25:** A **single unified manifest** covers both `_gomad/`-internal paths and IDE-target paths via a new **`install_root` column** — values: `"_gomad"` (for `_gomad/gomad/agents/*.md`, `_gomad/<module>/…`), `".claude"` (for `.claude/commands/gm/agent-*.md` and `.claude/skills/*`), `".cursor"`, `".codex"`, `".auggie"`, etc. Row `path` is relative to its `install_root`. Phase 7's realpath-containment check (INSTALL-06) will resolve `install_root` to an allowed root and verify `path.join(root, path)`'s realpath stays under the workspace root.
- **D-26:** All manifest `path` values are **normalized to forward slashes** on write (addresses Pitfall #19 Windows-separator drift).
- **D-27:** Phase 6 swaps **both read AND write** to `csv-parse/sync` — replaces the hand-rolled toggle-quote parser at `installer.js:618–633` (`readFilesManifest`) and aligns the writer at `manifest-generator.js:588–647` (`writeFilesManifest`) on the same parser. Matches INSTALL-04 literally; closes Pitfall #2 quoting/BOM/CRLF bugs at the source.

### Claude-code IDE target layout (CMD-01, CMD-04)

- **D-28:** The Claude-Code target layout is **split**: agent launchers go to `.claude/commands/gm/agent-*.md`, all other (non-agent) skills stay at `.claude/skills/*`. Matches roadmap language ("launchers for all 7 personas") and REQUIREMENTS.md scope ("only the 7 `gm-agent-*` personas"). Non-agent task-skills becoming slash commands is explicitly out of scope (REQUIREMENTS Out of Scope table).
- **D-29:** Phase 6 **does remove** the legacy `.claude/skills/gm-agent-*/` directories atomically when the launcher generator runs — no `/gm-agent-*` and `/gm:agent-*` both-work overlap window. Phase 7's INSTALL-07 still owns the broader manifest-driven legacy-state cleanup; Phase 6 owns only this one specific removal so upgrading to Phase 6 alone produces a consistent state.
- **D-30:** For **other IDEs** (cursor, codex, auggie, …), the 7 agent personas continue to install as skill directories at `.<ide>/skills/gm-agent-*/` — same as v1.1 minus the symlink (now copy per D-19). No launcher generation for non-CC IDEs. Preserves multi-IDE support; launcher-form is Claude-Code-only.
- **D-31:** Wire-in is **data-driven via `platform-codes.yaml`** — claude-code's `installer:` block gains a new `launcher_target_dir: .claude/commands/gm` field. `_config-driven.js` reads it; when present, it instantiates `AgentCommandGenerator` after the normal skill install step, runs the persona extractor (SKILL.md → `_gomad/gomad/agents/*.md`), then writes launchers to the configured `launcher_target_dir`. No Claude-Code hardcoded branch; third-party IDE forks can opt in later by adding the field.

### Claude's Discretion

- Plan decomposition — bundling all three changes (copy-only + manifest v2 + launcher generator) into one plan vs splitting. The three are tightly coupled (manifest v2 must enumerate the new launcher paths; copy-only unblocks stub generation) but have independent review surfaces. Planner decides based on reviewability and dependency ordering.
- Exact column ordering in `files-manifest.csv` header (must include `schema_version` and `install_root`; semantic ordering — existing columns first, new columns appended — preferred unless plan identifies a parse-order constraint).
- Exact wording of the `"upgrading from symlink: <path>"` log line and log level (info vs warn) (D-20).
- Exact prose activation template used in the launcher body after the fenced YAML metadata block (D-16) — should mirror `tools/installer/ide/templates/agent-command-template.md` shape but reference `_gomad/gomad/agents/<name>.md` as the persona file.
- One-line purpose clause per agent for `description:` (D-17) — derived from each `skill-manifest.yaml`'s `capabilities` field or authored fresh per persona.
- Whether to write a separate extractor unit test or extend `test/test-gm-command-surface.js` (the Phase 5 structural assertion is already conditional on `.claude/commands/gm/` presence and goes green automatically once Phase 6 lands).
- Windows junction-point semantics under `fs.lstat` (Node.js 20+ treats junctions as symbolic links on Windows — planner confirms and documents).
- Exact implementation of the legacy `.claude/skills/gm-agent-*/` cleanup per D-29 (recursive `fs.remove` on the 7 known paths, before or after launcher generation, idempotency of re-runs).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase-6-specific requirements and success criteria
- `.planning/ROADMAP.md` §"Phase 6: Installer Mechanics — Copy + Manifest + Stub Generation" — Goal statement, 5 success criteria, requirements linkage (CMD-01, CMD-02, CMD-03, CMD-04, INSTALL-01, INSTALL-02, INSTALL-03, INSTALL-04)
- `.planning/REQUIREMENTS.md` §CMD-01/02/03/04 — Launcher generation, frontmatter-resolves-to-colon, launcher-is-thin-stub, source-of-truth preservation
- `.planning/REQUIREMENTS.md` §INSTALL-01/02/03/04 — Copy-only (`fs.ensureSymlink` → `fs.copy`), symlink-leftover unlink, manifest with schema_version + five columns, `csv-parse` for read/write

### Prior-phase decisions that Phase 6 implements
- `.planning/phases/05-foundations-command-surface-validation/05-CONTEXT.md` §D-05/D-06/D-07 — Launcher-form architecture contract; extract-don't-move; launcher frontmatter + body metadata split
- `.planning/phases/05-foundations-command-surface-validation/05-VERIFICATION.md` — Confirms in-repo `.claude/commands/gsd/*.md` as empirical proof of subdirectory-namespace resolution; `test/test-gm-command-surface.js` conditional structural assertion ready to go green once Phase 6 generator lands
- `.planning/PROJECT.md` §"Key Decisions" (line 120) — Locked launcher-form row: "Launcher-form slash commands (not self-contained) — `.claude/commands/gm/agent-*.md` is a thin stub loading persona from `_gomad/gomad/agents/*.md` at runtime … Contract set in Phase 5; extractor lands in Phase 6"

### Pitfall research (Phase-6-relevant entries)
- `.planning/research/PITFALLS.md` §"Pitfall 2: Manifest-driven cleanup deletes user files because manifest lies, is stale, or is mis-parsed" — Informs D-27 (csv-parse for both read and write), D-23/D-25/D-26 (schema discipline). Cleanup-side (realpath containment, backup, dry-run) is Phase 7's to own.
- `.planning/research/PITFALLS.md` §"Pitfall 3: Symlinked existing installs break silently or keep working (wrong) after v1.2 upgrade" — Informs D-19/D-20/D-22 (universal copy + fs.lstat pre-check on re-install + unlink-then-copy)
- `.planning/research/PITFALLS.md` §"Pitfall 4: Orphan references to `gm-agent-*` linger across source/tests/docs/manifests" — Specific subitem "The 7 `gm-agent-*/skill-manifest.yaml` files contain `name: gm-agent-*` and `module: gomad`" + "`tools/installer/ide/shared/agent-command-generator.js` — its whole purpose is generating `gomad-agent-*.md` flat launchers" — Informs D-14/D-15/D-16/D-29/D-31
- `.planning/research/PITFALLS.md` §"Pitfall 9: Permission bits and executable files lost on copy; or opposite" — Informs Phase 6 plan to include a permissions test for installed launcher files
- `.planning/research/PITFALLS.md` §"Pitfall 11: Agent command template still says 'load agent file from `{project-root}/_gomad/...`'" — Directly relevant to D-16 (launcher body wording); `tools/installer/ide/templates/agent-command-template.md` is the file that needs updating
- `.planning/research/PITFALLS.md` §"Pitfall 15: Existing v1.1 `_gomad/_config/` manifest files collide with v1.2 schema changes" — Informs D-23 (schema_version is mandatory to avoid v1↔v2 misread)
- `.planning/research/PITFALLS.md` §"Pitfall 18: Agent persona frontmatter fields have no home in slash-command files" — Directly informs D-15/D-16 (YAML metadata block in launcher body, full manifest mirrored to extracted agent file frontmatter)
- `.planning/research/PITFALLS.md` §"Pitfall 19: Windows path separators in files-manifest.csv (`\` vs `/`)" — Informs D-26 (forward-slash normalization)

### Target of Phase 6 edits
- `tools/installer/ide/_config-driven.js` (line 171: `fs.ensureSymlink` replacement; new launcher-generator invocation block reading `launcher_target_dir`)
- `tools/installer/ide/shared/agent-command-generator.js` (revive; add persona-extractor method; update `writeAgentLaunchers` to target `.claude/commands/gm/` via `launcher_target_dir`)
- `tools/installer/ide/templates/agent-command-template.md` (update body per D-16: fenced YAML metadata block + prose activation; current body instruction "LOAD the FULL agent file from `{project-root}/_gomad/{{module}}/agents/{{path}}`" stays directionally correct but must be extended with the YAML metadata block)
- `tools/installer/ide/platform-codes.yaml` (new `launcher_target_dir: .claude/commands/gm` field under `claude-code.installer`, per D-31)
- `tools/installer/core/installer.js` §`readFilesManifest` (lines 597–651: replace hand-rolled CSV parser with `csv-parse/sync`)
- `tools/installer/core/manifest-generator.js` §`writeFilesManifest` (lines 584–647: add `schema_version` + `install_root` columns; normalize paths to forward slashes; use `csv-parse/sync` writer helpers)

### Source of truth — 7 agent skill paths for extractor
- `src/gomad-skills/1-analysis/gm-agent-analyst/SKILL.md` + `skill-manifest.yaml` (displayName: Mary, title: Business Analyst, icon: 📊, module: gomad)
- `src/gomad-skills/1-analysis/gm-agent-tech-writer/SKILL.md` + `skill-manifest.yaml`
- `src/gomad-skills/2-plan-workflows/gm-agent-pm/SKILL.md` + `skill-manifest.yaml`
- `src/gomad-skills/2-plan-workflows/gm-agent-ux-designer/SKILL.md` + `skill-manifest.yaml`
- `src/gomad-skills/3-solutioning/gm-agent-architect/SKILL.md` + `skill-manifest.yaml`
- `src/gomad-skills/4-implementation/gm-agent-sm/SKILL.md` + `skill-manifest.yaml`
- `src/gomad-skills/4-implementation/gm-agent-dev/SKILL.md` + `skill-manifest.yaml`

### Test infrastructure (already shipped in Phase 5)
- `test/test-gm-command-surface.js` — Phase C install-smoke harness; conditional structural assertion on `.claude/commands/gm/agent-*.md` presence and `name: gm:agent-<name>` frontmatter; goes green automatically when Phase 6 generator lands
- `test/test-installer-self-install-guard.js` — Defense-in-depth test for the `--self` guard; untouched by Phase 6
- `package.json` scripts `test:gm-surface` + `test:self-install-guard`

### Packaging / distribution references
- `package.json` §`dependencies` — Confirms `csv-parse: "^6.1.0"` already present (zero new runtime deps constraint, per PROJECT.md Accumulated Context)
- `package.json` §`files` — Allowlist governs what ships in the tarball; Phase 6 must not require allowlist changes (all edits are to already-allowlisted paths under `src/` and `tools/installer/`)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- **`tools/installer/ide/shared/agent-command-generator.js`** — Already a class (`AgentCommandGenerator`) with `collectAgentArtifacts`, `generateLauncherContent`, `writeAgentLaunchers`, `writeColonArtifacts`, `writeDashArtifacts`, and custom-agent name helpers. Phase 6 adds a persona-extractor method (SKILL.md → `_gomad/gomad/agents/*.md`) and rewires `writeAgentLaunchers` to use `launcher_target_dir` from platform config per D-31. The existing `getAgentsFromBmad` helper (in `artifacts.js`) reads from the already-installed `gomad/` directory — Phase 6's extractor must run BEFORE the launcher generator so `_gomad/gomad/agents/*.md` exists to be discovered.
- **`tools/installer/ide/templates/agent-command-template.md`** — Existing launcher template (15 lines). Current body says "LOAD the FULL agent file from `{project-root}/_gomad/{{module}}/agents/{{path}}`" — directionally correct; Phase 6 extends it with a fenced YAML metadata block at the top of the body per D-16.
- **`csv-parse/sync`** — Already imported at `_config-driven.js:6` and `manifest-generator.js:5`. The manifest writer already uses it to generate `"..."`-quoted rows; Phase 6 switches the reader (`installer.js:readFilesManifest`) to use the same package per D-27.
- **`tools/installer/core/manifest-generator.js:writeFilesManifest`** (line 587) — Existing CSV writer that already knows how to walk `allInstalledFiles`, compute SHA-256 hashes via `calculateFileHash`, and emit rows with `"..."` quoting. Phase 6 extends the header (`type,name,module,path,hash` → `type,name,module,path,hash,schema_version,install_root`) and teaches it about IDE-target paths (not just `_gomad/` internals).
- **`tools/installer/ide/_config-driven.js:cleanup` + `legacy_targets`** — Existing mechanism for per-IDE cleanup on install. Phase 5's `.gitignore` + self-install guard is not touched by Phase 6.
- **Phase 5 test harness** — `test/test-gm-command-surface.js` Phase C (tempDir fixture + `npm pack` + `gomad install --yes --directory <tempDir> --tools claude-code`) is structurally ready to assert full Phase 6 success automatically.

### Established Patterns

- **Data-driven IDE config** (`platform-codes.yaml` → `_config-driven.js`) — New fields added to the YAML without JS changes elsewhere; third-party IDE forks opt in by declaring the field. Phase 6's `launcher_target_dir` (D-31) follows this pattern.
- **CommonJS throughout** — `require()` everywhere (`const fs = require('fs-extra')`, `const path = require('node:path')`, `const csv = require('csv-parse/sync')`). No ESM. Phase 6 edits stay CommonJS per PROJECT.md constraint.
- **`fs-extra` over `node:fs`** — Used for `ensureDir`, `copy`, `remove`, `writeFile`, `pathExists`. Phase 6's new code uses the same lib; `fs.lstat` and `fs.unlink` are available on `fs-extra`.
- **`_gomad` folder prefix configurable** — Constant `GOMAD_FOLDER_NAME` in `path-utils.js`; agent-command-generator already parameterizes it. Extractor must parameterize it too.
- **SHA-256 file hashes in manifest** — `manifest-generator.js:calculateFileHash` exists and is the pattern for every manifest row's `hash` column. Phase 6's new `.claude/commands/gm/*.md` rows will use the same hash function.
- **Skill-manifest.yaml as source of truth** — Richer than anything the Claude-Code command frontmatter can hold (Pitfall #18). Informs D-15/D-16/D-18 — split between launcher-frontmatter vs launcher-body-metadata vs extracted-agent-frontmatter, all derived from `skill-manifest.yaml`.

### Integration Points

- **`_config-driven.js:skillInstall`** — The existing per-IDE install loop at lines 150–189 (writes `skillDir`, calls `fs.ensureSymlink`). Phase 6 replaces `fs.ensureSymlink` with `fs.copy` universally (D-19), adds `fs.lstat` + `fs.unlink` pre-check when `files-manifest.csv` is present (D-20/D-22), and after the loop invokes the new `AgentCommandGenerator` flow when `launcher_target_dir` is set in the platform config (D-31).
- **`installer.js:install` flow** — Orchestrates gomad-dir install → skill-install → manifest-write. Phase 6 inserts the persona extractor between gomad-dir install and skill-install (so `_gomad/gomad/agents/*.md` exists before any IDE reads it), and extends the manifest-write to include IDE-target path entries with correct `install_root` per D-25.
- **`platform-codes.yaml:claude-code`** — Schema-add only: a new `launcher_target_dir: .claude/commands/gm` field; existing `target_dir: .claude/skills` stays (for non-agent skills per D-28); existing `legacy_targets` block is unchanged.
- **Test harness — `test/test-gm-command-surface.js`** — Phase C's conditional structural assertion (currently logs "Phase 5 baseline — no commands yet") flips to asserting 7 launcher files + frontmatter validation once Phase 6 ships. No test code changes required; Phase 5 pre-wired the assertion.

</code_context>

<specifics>
## Specific Ideas

- **Extractor runs from source, not from installed dir.** The extractor reads `src/gomad-skills/*/gm-agent-*/SKILL.md` at install time (same source the tarball ships). This means the extractor reads paths relative to the installed `@xgent-ai/gomad` package — NOT paths in the target workspace. Plan must resolve the source tree correctly for both `npx gomad install` (reads from node_modules) and local-dev `node tools/installer/gomad-cli.js install` (reads from repo).
- **Full skill-manifest.yaml in extracted file frontmatter + fenced YAML in launcher body is deliberate triplication.** User chose it explicitly. Both derivation paths MUST read from `skill-manifest.yaml` at generation time — neither quotes from the other. Plan must ensure single-source-of-truth derivation (D-18).
- **Phase 6 is a no-new-runtime-deps phase.** `csv-parse` is already in `package.json` dependencies. Every other operation uses `fs-extra`, `node:path`, `node:crypto` (for SHA-256 in existing `calculateFileHash`), and `js-yaml` (already a dep, used by Phase 5 tests).
- **"Phase 6 alone produces a consistent state" is a design goal per D-29.** Upgrading a v1.1 workspace to a Phase-6-only build (without Phase 7 yet) must still yield: `.claude/commands/gm/agent-*.md` present, legacy `.claude/skills/gm-agent-*/` absent, `_gomad/gomad/agents/*.md` extracted, manifest v2 written. No `/gm-agent-*` ↔ `/gm:agent-*` both-work window.
- **Launcher template is a touchpoint.** The existing `agent-command-template.md` has a hard-coded "LOAD the FULL agent file from `{project-root}/_gomad/{{module}}/agents/{{path}}`" instruction. Phase 6 keeps that directionally (launcher-form per D-05) but extends the template body per D-16 with the fenced YAML metadata block.

</specifics>

<deferred>
## Deferred Ideas

- **Manifest-driven cleanup with realpath containment + dry-run + backup snapshotting** — Phase 7 (INSTALL-05/06/08/09). Phase 6's "always overwrite regular files" posture (D-21) is an intentional interim state; Phase 7 layers safety back.
- **Broader v1.1→v1.2 legacy cleanup** — Phase 7 (INSTALL-07). Phase 6 removes only the specific `.claude/skills/gm-agent-*/` dirs (D-29); Phase 7 owns generalized manifest-driven orphan cleanup.
- **`gomad install --watch` / dev-loop for contributor live-edit** — Pitfall #10 explicitly out of Phase 6 scope. Either a Phase 6 follow-up or a separate skill. Release notes for v1.2 will call out the dev-loop regression (per Phase 9 release work).
- **Task-skill → slash-command aliases** (REQUIREMENTS Future — CMD-F1) — Explicitly deferred; v1.2 only migrates the 7 agent personas. Non-agent skills stay at `.claude/skills/` per D-28.
- **Dash-form flat launchers for non-CC IDEs** — Considered and rejected per D-30; other IDEs keep v1.1 skill-directory model. `AgentCommandGenerator.writeDashArtifacts` (already in the class) stays as dead code for now or is removed in plan (Claude's Discretion).
- **Windows junction-point edge cases and CI matrix expansion** — Plan surfaces as implementation detail under Claude's Discretion; full Windows test coverage belongs to Phase 9 verification (REL-04).
- **`description:` per-persona one-line-purpose authoring** — Mechanics locked in D-17; per-agent wording is Claude's Discretion during planning/implementation.

</deferred>

---

*Phase: 06-installer-mechanics-copy-manifest-stub-generation*
*Context gathered: 2026-04-18*
