---
phase: 06-installer-mechanics-copy-manifest-stub-generation
plan: 03
subsystem: installer
tags: [launcher-generator, persona-extractor, claude-code, agent-command, files-manifest-v2, install_root, platform-codes, gm-agent]

# Dependency graph
requires:
  - phase: 06-installer-mechanics-copy-manifest-stub-generation
    provides: "Copy-only IDE skill install loop (Plan 06-01) + v2 manifest schema with install_root column (Plan 06-02)"
  - phase: 05-foundations-command-surface-validation
    provides: "test/test-gm-command-surface.js Phase C conditional structural assertions — flipped to green by this plan"
provides:
  - "AgentCommandGenerator.extractPersonas: source-tree → _gomad/gomad/agents/<shortName>.md with full skill-manifest.yaml as frontmatter"
  - "AgentCommandGenerator.writeAgentLaunchers: flat .claude/commands/gm/agent-<shortName>.md launcher files with fenced YAML metadata + activation directive"
  - "AgentCommandGenerator.removeLegacyAgentSkillDirs: atomic D-29 v1.1 cleanup (same-install overlap elimination)"
  - "platform-codes.yaml launcher_target_dir opt-in gate (claude-code only; non-CC IDEs unchanged)"
  - "installer.js persona-extractor invocation + post-_setupIdes manifest refresh"
  - "manifest-generator.js per-path install_root derivation ('_gomad' | '.claude')"
  - "/gm:agent-<shortName> Claude Code command surface — 7 canonical agents (analyst, tech-writer, pm, ux-designer, architect, sm, dev)"
affects: [07, 08]

# Tech tracking
tech-stack:
  added: []  # zero new runtime deps (all code uses fs-extra, yaml, already imported)
  patterns:
    - "AGENT_SOURCES static enumeration as source-of-truth mapping (shortName → src dir → purpose)"
    - "Launcher-target gate pattern: IDE opts in via platform-codes.yaml launcher_target_dir (D-31)"
    - "Extract-then-launch: installer.js runs persona extractor in configTask BEFORE generateManifests; _config-driven.js runs launcher writer in _setupIdes; installer.js refreshes manifest AFTER _setupIdes"
    - "trackInstalledFile callback threaded through ideManager.setup → installToTarget for IDE-target path tracking"
    - "Per-path install_root derivation at manifest-write time (absFilePath prefix check against workspaceRoot + '.claude')"

key-files:
  created: []
  modified:
    - tools/installer/ide/platform-codes.yaml
    - tools/installer/ide/templates/agent-command-template.md
    - tools/installer/ide/shared/agent-command-generator.js
    - tools/installer/ide/_config-driven.js
    - tools/installer/core/installer.js
    - tools/installer/core/manifest-generator.js
    - test/test-installation-components.js  # Test 9 updated to reflect Phase 6 semantics

key-decisions:
  - "D-14 applied: SKILL.md frontmatter stripped via /^---\\n[\\s\\S]*?\\n---\\n+/ regex; body copied verbatim"
  - "D-15 applied: full skill-manifest.yaml emitted as frontmatter of extracted persona file (11 fields mirrored)"
  - "D-16 applied: launcher body includes fenced ```yaml ... ``` block with displayName/title/icon/capabilities + prose activation"
  - "D-17 applied: description format '<Title> (<displayName>). <one-line purpose>.'"
  - "D-18 applied: launcher metadata sourced from skill-manifest.yaml (not quoted from launcher body)"
  - "D-28 applied: flat launcher naming (agent-<shortName>.md, no module/agents nesting)"
  - "D-29 applied: legacy .claude/skills/gm-agent-*/ cleanup runs atomically during launcher write (no overlap window)"
  - "D-31 applied: launcher_target_dir opt-in gate in platform-codes.yaml; only claude-code receives launchers"

patterns-established:
  - "Source-tree → workspace extraction pattern (getSourcePath + hard-coded AGENT_SOURCES)"
  - "Two-phase manifest write: configTask emits _gomad-internal rows; post-_setupIdes refresh adds IDE-target rows"
  - "Idempotent removeLegacy + write: second install produces zero file-count delta"

requirements-completed: [CMD-01, CMD-02, CMD-03, CMD-04, INSTALL-03, INSTALL-04]

# Metrics
duration: 8min
completed: 2026-04-18
---

# Phase 06 Plan 03: Launcher Generator + Persona Extractor + IDE-Target Manifest Wiring Summary

**Revived `AgentCommandGenerator` to produce the full `gm:agent-*` launcher + persona artifact set for Claude Code — 7 persona files extracted to `_gomad/gomad/agents/` (full skill-manifest.yaml as frontmatter), 7 flat launcher files written to `.claude/commands/gm/` (fenced YAML metadata + activation directive), legacy `.claude/skills/gm-agent-*/` dirs atomically cleaned, all 14 artifacts tracked in v2 manifest with correct install_root ('_gomad' or '.claude').**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-04-18T13:43:44Z
- **Completed:** 2026-04-18T13:51:51Z
- **Tasks:** 4 / 4
- **Files modified:** 7 (6 in plan scope + 1 Rule-3 test update)

## Accomplishments

- **Task 1 — platform opt-in (D-31):** Added `launcher_target_dir: .claude/commands/gm` to `platforms.claude-code.installer`. Single-line additive change. No other platform touched; non-CC IDEs stay on v1.1 behavior (minus symlinks per Plan 06-01).
- **Task 2 — template body (D-16/D-17):** Replaced the 15-line agent-command-template.md with a 22-line extended version: `name: 'gm:agent-{{shortName}}'` frontmatter, fenced `` ```yaml `` metadata block (displayName/title/icon/capabilities), corrected activation path `{project-root}/_gomad/gomad/agents/{{shortName}}.md`. Old `{{name}}`/`{{module}}`/`{{path}}` placeholders fully removed.
- **Task 3 — generator class (D-14/D-15/D-28/D-29):** Rewrote `tools/installer/ide/shared/agent-command-generator.js` around a new `AGENT_SOURCES` static array (7 canonical entries with `shortName`, `dir`, `purpose`). New methods: `extractPersonas(workspaceRoot)`, `writeAgentLaunchers(launcherTargetDir, workspaceRoot)`, `removeLegacyAgentSkillDirs(workspaceRoot)`. `generateLauncherContent` rewritten for new placeholder set. Obsolete `collectAgentArtifacts` deleted (dead-code path via `getAgentsFromBmad`). `writeColonArtifacts`/`writeDashArtifacts` kept per CONTEXT "deferred ideas" (no interference with new flow).
- **Task 4 — installer wiring (D-25/D-31):** Two-file coordinated edit:
  - `installer.js`: imported `AgentCommandGenerator`, added `this.ideInstalledFiles = new Set()` tracker, invoked `extractPersonas` before `generateManifests` in configTask, passed `trackInstalledFile` callback through `ideManager.setup`, added second `writeFilesManifest` call after `_setupIdes` to pick up IDE-target paths.
  - `_config-driven.js`: imported `AgentCommandGenerator`, added launcher-target-dir-gated block in `installToTarget` that calls `removeLegacyAgentSkillDirs` then `writeAgentLaunchers`, threading produced paths into `options.trackInstalledFile`. `printSummary` extended with launcher count line.
  - `manifest-generator.js`: extended `writeFilesManifest.allInstalledFiles` branch to derive `install_root` per-path — paths under `<workspaceRoot>/.claude` land as `install_root='.claude'` with path stripped relative to `.claude/`, paths under `_gomad/` keep the default `'_gomad'`.
- **Rule 3 / Rule 1 deviation:** Pre-existing Test Suite 9 in `test/test-installation-components.js` asserted `!fs.pathExists(legacyDir9)` where `legacyDir9 = .claude/commands/`. Phase 6 legitimately repopulates `.claude/commands/gm/` with launcher files per the plan's explicit `<success_criteria>`, so the literal legacy-dir-removed assertion is now semantically wrong. Updated to assert the true invariant: legacy **file** `gomad-legacy.md` is removed AND new launcher dir `.claude/commands/gm/` exists. See "Deviations" below.

## Task Commits

Each task was committed atomically (orchestrator will attach this branch's commits on merge):

1. **Task 1: Add launcher_target_dir to claude-code in platform-codes.yaml** — `8ab67a9` (feat)
2. **Task 2: Extend agent-command template with fenced YAML metadata and corrected persona path** — `6285f59` (feat)
3. **Task 3: Rewrite AgentCommandGenerator — extractPersonas + writeAgentLaunchers + removeLegacyAgentSkillDirs** — `69af1cb` (feat)
4. **Task 4: Wire persona extractor + launcher generator into installer flow** — `3466b2c` (feat)

_Note: Plan Tasks 3 and 4 were marked `tdd="true"` but follow the same precedent established by Plan 06-02 — the project uses ad-hoc Node test scripts under `test/` rather than a Jest/Mocha runner for these files, and the plan's `<verify><automated>` + `<acceptance_criteria>` blocks define inline behavior assertions (no separate `*.test.js` file). All behavior contracts from `<behavior>` blocks verified via end-to-end install smoke + `npm run test:gm-surface` (Phase C structural assertions)._

**Plan metadata:** SUMMARY.md committed by orchestrator after this agent returns (worktree mode).

## Files Created/Modified

- `tools/installer/ide/platform-codes.yaml` — `+1` line (`launcher_target_dir: .claude/commands/gm` under claude-code.installer).
- `tools/installer/ide/templates/agent-command-template.md` — `+9 / -2` lines (fenced YAML metadata block inserted after frontmatter; activation path updated to `_gomad/gomad/agents/{{shortName}}.md`; old placeholders removed).
- `tools/installer/ide/shared/agent-command-generator.js` — `+117 / -73` lines (AGENT_SOURCES constant + extractPersonas + writeAgentLaunchers rewrite + removeLegacyAgentSkillDirs + generateLauncherContent rewrite; `collectAgentArtifacts` deleted; `yaml` + `getSourcePath` imports added).
- `tools/installer/core/installer.js` — `+23 / -1` lines (`AgentCommandGenerator` import; `ideInstalledFiles` Set init; extractPersonas invocation in configTask; trackInstalledFile callback wired into ideManager.setup; post-_setupIdes second manifest refresh).
- `tools/installer/ide/_config-driven.js` — `+25 / -1` lines (`AgentCommandGenerator` import; launcher_target_dir-gated block in installToTarget; printSummary launcher-count line).
- `tools/installer/core/manifest-generator.js` — `+14 / -6` lines (per-path install_root derivation in allInstalledFiles branch; `claudeRoot` prefix detection; `rootPath`-relative path computation).
- `test/test-installation-components.js` — `+7 / -1` lines (Test 9 assertion replaced to reflect Phase 6 repopulation semantics; see Deviations).

## Live-Install Evidence

Real-world install into `/tmp/gomad-e2e-claude-*` via packed tarball:

### 7 Launcher Files @ `.claude/commands/gm/agent-*.md`

| Launcher                        | Frontmatter `name`           | Frontmatter `description`                                                                          |
|---------------------------------|------------------------------|----------------------------------------------------------------------------------------------------|
| `agent-analyst.md`              | `gm:agent-analyst`           | `Business Analyst (Mary). Market research, competitive analysis, requirements elicitation, domain expertise.` |
| `agent-architect.md`            | `gm:agent-architect`         | `Architect (Winston). System architecture, technical design, solution engineering.`                |
| `agent-dev.md`                  | `gm:agent-dev`               | `Developer Agent (Amelia). Development, implementation, coding, refactoring.`                      |
| `agent-pm.md`                   | `gm:agent-pm`                | `Product Manager (John). Product management, PRD creation, feature scoping, stakeholder alignment.` |
| `agent-sm.md`                   | `gm:agent-sm`                | `Scrum Master (Bob). Scrum mastery, story creation, sprint facilitation, implementation planning.` |
| `agent-tech-writer.md`          | `gm:agent-tech-writer`       | `Technical Writer (Paige). Technical writing, documentation, explanation, diagramming.`            |
| `agent-ux-designer.md`          | `gm:agent-ux-designer`       | `UX Designer (Sally). UX design, user flows, interaction design, design reviews.`                  |

### 7 Extracted Persona Files @ `_gomad/gomad/agents/<shortName>.md`

Each persona file has exactly **11 frontmatter fields** mirroring the source `skill-manifest.yaml`: `type`, `name`, `displayName`, `title`, `icon`, `capabilities`, `role`, `identity`, `communicationStyle`, `principles`, `module`.

| File               | Fields |
|--------------------|--------|
| `analyst.md`       | 11     |
| `architect.md`     | 11     |
| `dev.md`           | 11     |
| `pm.md`            | 11     |
| `sm.md`            | 11     |
| `tech-writer.md`   | 11     |
| `ux-designer.md`   | 11     |

### Sample Manifest Rows

**Launcher row** (`install_root='.claude'`):
```
{"type":"md","name":"agent-analyst","module":"commands","path":"commands/gm/agent-analyst.md","hash":"6fea971506c09aa08510c5b667d5212439a59a73aaa8e1a58ba4ab8a7259694c","schema_version":"2.0","install_root":".claude"}
```

**Persona row** (`install_root='_gomad'`):
```
{"type":"md","name":"analyst","module":"gomad","path":"gomad/agents/analyst.md","hash":"d086207b9b5612d7d17be36c11e870aa947f6eea2a97c9820d22db88bbd54c51","schema_version":"2.0","install_root":"_gomad"}
```

Manifest-check invariant verified: **7 launcher rows + 7 persona rows + all rows `schema_version='2.0'` = pass**.

### Source Tree Unchanged

```
$ git status -s src/gomad-skills/
(empty)
```

`src/gomad-skills/*/gm-agent-*/` source dirs are untouched by the extraction — the installer only READS from them.

### Legacy Cleanup (D-29)

Install log emits `Removed 7 legacy gm-agent-* skill dir(s)` when the destination workspace previously had v1.1 `.claude/skills/gm-agent-*/` directories. Post-install check:

```
$ ls -d <tempDir>/.claude/skills/gm-agent-*
(no matches — all removed)
```

### Idempotency

Second `gomad install` in the same tempDir — file counts unchanged:

```
Before second install:  7 persona files, 7 launchers
After second install:   7 persona files, 7 launchers
```

Log output shows `Quick update complete!` — no errors, no duplicate rows.

### Non-Claude-Code IDE (Gate)

Install with `--tools cursor` instead:

```
$ ls <tempDir>/.claude/commands/gm/
ls: No such file or directory        # ✅ launcher_target_dir gate worked

$ ls <tempDir>/.cursor/skills/
gm-advanced-elicitation
gm-agent-analyst
gm-agent-architect
gm-agent-dev
gm-agent-pm
...                                  # ✅ v1.1 behavior preserved
```

Non-CC IDEs skip the launcher block entirely (the `config.launcher_target_dir` check in `_config-driven.js:installToTarget` returns falsy).

### `fs.ensureSymlink` Residue

```
$ grep -rn 'fs\.ensureSymlink' tools/installer/
(no matches)
```

Zero occurrences in `tools/installer/`. Phase 6 Plan 01 + Plan 03 combined leave a fully copy-based installer with no symlink primitives.

## Test Results

All test suites green:

| Test Suite                        | Command                           | Result          |
|-----------------------------------|-----------------------------------|-----------------|
| gm-surface (Phase 5 + Phase 6 C)  | `npm run test:gm-surface`         | 29 passed, 0 failed ✅ — Phase C flipped to hard assertion; 7 launchers pass frontmatter-name + description checks |
| installation components           | `npm run test:install`            | 205 passed, 0 failed ✅ (Test 9 updated for Phase 6 semantics) |
| self-install guard                | `npm run test:self-install-guard` | 6 passed, 0 failed ✅ |

The gm-surface Phase C structural assertion that was conditional in Phase 5 ("Installed `.claude/commands/gm/` not present — Phase 5 baseline — expected before Phase 6 ships") now goes GREEN with 7 passing `(C) agent-*.md` assertions.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Bug in pre-existing test / Rule 3 — Blocking] Test 9 in test-installation-components.js asserted `!fs.pathExists('.claude/commands')` which is now incorrect**

- **Found during:** Task 4 verification (`npm run test:install`).
- **Issue:** Test Suite 9 created a legacy `.claude/commands/gomad-legacy.md` file, ran `ideManager.setup('claude-code', ...)`, then asserted `!fs.pathExists(legacyDir9)` where `legacyDir9 = .claude/commands/`. With Phase 6, the installer deliberately repopulates `.claude/commands/gm/agent-*.md` per the plan's explicit `<success_criteria>` (7 launcher files MUST exist at that path). So `.claude/commands/` now EXISTS (because its child `gm/` dir has content), and the literal assertion fails.
- **Fix:** The test's **intent** is to verify legacy-file cleanup (pre-existing `gomad-legacy.md` shouldn't survive re-install). The intent is still satisfied. Updated the assertion to:
  - (a) assert the specific legacy file `gomad-legacy.md` is gone (the true cleanup invariant)
  - (b) assert the new launcher dir `.claude/commands/gm/` exists (the new Phase 6 invariant)
- **Files modified:** `test/test-installation-components.js` (Test Suite 9, around line 482)
- **Committed in:** Task 4 commit `3466b2c`

**Impact on plan:** Zero scope creep — this is a test-assertion correction for a semantic change that the plan explicitly mandates ("Phase 6 MUST flip this conditional into a hard assertion" per test-gm-command-surface.js:216-217). The plan's `files_modified` frontmatter did not anticipate this test update, but it is a direct consequence of Task 4 behavior and falls squarely under Rule 1 (bug: pre-existing assertion now contradicts plan-mandated behavior) + Rule 3 (blocking: `npm run test:install` would remain red otherwise).

**2. [Interpretation note, no code change] Plan Task 4 acceptance criterion `grep -c 'config.launcher_target_dir' tools/installer/ide/_config-driven.js` returns exactly `1` was specified but the plan's own Step B2 code block contains 2 references (one in the `if` gate, one in `path.join`).**

- **Found during:** Task 4 acceptance-criteria check.
- **Issue:** The criterion conflicts with the plan's own specified code. Both references are necessary: the `if (config.launcher_target_dir)` gate AND the `path.join(projectDir, config.launcher_target_dir)` composition.
- **Fix:** Honored plan Step B2 (explicit code block) over strict grep count. Semantic intent — "launcher_target_dir is used as the opt-in gate" — is fully satisfied by the two occurrences both referencing the gate value. Same treatment applied to `options.trackInstalledFile` (criterion "at least 1", actual 2; both needed — `if` check and inner for-loop call).
- **Files modified:** None (no code adjustment).
- **Committed in:** N/A — interpretation of plan, not a code fix.

---

**Total deviations:** 2 (1 code-side test update, 1 plan-criterion interpretation)
**Impact on plan scope:** Test update is a direct consequence of Phase 6 semantics, already anticipated by the Phase 5 design (test-gm-command-surface.js line 214-217 comment: "Phase 6 MUST flip this conditional into a hard assertion"). No additional scope.

## Decisions Made

All decisions locked upstream in `06-CONTEXT.md` §decisions (D-14, D-15, D-16, D-17, D-18, D-28, D-29, D-31). This plan is the implementation — no re-decision surface.

Notable in-flight decisions:

- **AGENT_SOURCES `purpose` field strings** — Authored per D-17 "Claude's Discretion":
  - analyst: "Market research, competitive analysis, requirements elicitation, domain expertise"
  - tech-writer: "Technical writing, documentation, explanation, diagramming"
  - pm: "Product management, PRD creation, feature scoping, stakeholder alignment"
  - ux-designer: "UX design, user flows, interaction design, design reviews"
  - architect: "System architecture, technical design, solution engineering"
  - sm: "Scrum mastery, story creation, sprint facilitation, implementation planning"
  - dev: "Development, implementation, coding, refactoring"
- **Manifest-write install_root detection** — Extended the `allInstalledFiles` branch only (not the fallback `this.files` branch, per plan Step B6 — fallback uses workflow/agent/task collectors that never flow launcher files).

## Issues Encountered

None beyond the Test 9 assertion update (documented above).

## User Setup Required

None — purely internal installer changes. Users receive the new behavior automatically on `npm install @xgent-ai/gomad` + `gomad install --tools claude-code`.

## Threat Flags

None. Every threat surface introduced by this plan was enumerated in the plan's `<threat_model>` (T-06-10 through T-06-16). No new network endpoints, auth paths, or trust-boundary changes were introduced beyond those already scoped. Path-traversal mitigations for `removeLegacyAgentSkillDirs` (T-06-12) verified: shortName values are literal constants in `AGENT_SOURCES`, no user input reaches `path.join`.

## Known Stubs

None. Every file produced by this plan (7 launchers + 7 persona files + 7 manifest rows × 2 groups) contains fully-populated content from source `skill-manifest.yaml` and `SKILL.md`. No hardcoded empty values, no placeholder strings, no "coming soon" text.

## Next Phase Readiness

- **Phase 7 (manifest-driven cleanup, INSTALL-05/06/08/09):** Plan 06-03 is complete — cleanup can read `install_root='.claude'` rows from the manifest to find launcher files for surgical cleanup without scanning the filesystem. `schema_version='2.0'` gates version-aware cleanup behavior.
- **Phase 8 (doc refresh):** The `/gm:agent-<shortName>` command surface is now live. READMEs and docs can reference these commands directly (they resolve in Claude Code after install).
- **No blockers.** All 6 plan `requirements-completed` (CMD-01..04, INSTALL-03..04) are satisfied with live-install evidence.

## Self-Check: PASSED

Files verified to exist on disk:

- `tools/installer/ide/platform-codes.yaml` — FOUND, contains `launcher_target_dir: .claude/commands/gm` under claude-code.installer.
- `tools/installer/ide/templates/agent-command-template.md` — FOUND, contains `name: 'gm:agent-{{shortName}}'` and `_gomad/gomad/agents/{{shortName}}.md`.
- `tools/installer/ide/shared/agent-command-generator.js` — FOUND, exports `AgentCommandGenerator`; `AGENT_SOURCES.length === 7`; `extractPersonas`, `writeAgentLaunchers`, `removeLegacyAgentSkillDirs` all defined; `collectAgentArtifacts` removed.
- `tools/installer/ide/_config-driven.js` — FOUND, imports `AgentCommandGenerator`; `installToTarget` contains `config.launcher_target_dir` gate.
- `tools/installer/core/installer.js` — FOUND, imports `AgentCommandGenerator`; `this.ideInstalledFiles = new Set()` init; post-_setupIdes manifest refresh present.
- `tools/installer/core/manifest-generator.js` — FOUND, per-path `install_root` derivation in `allInstalledFiles` branch with `claudeRoot` prefix check.
- `test/test-installation-components.js` — FOUND, Test Suite 9 updated with split assertions.

Commits verified in `git log --oneline`:

- `8ab67a9` — `feat(06-03): add launcher_target_dir to claude-code platform config`
- `6285f59` — `feat(06-03): extend agent-command template with fenced YAML metadata and corrected persona path`
- `69af1cb` — `feat(06-03): rewrite AgentCommandGenerator with extractPersonas + flat launcher writer`
- `3466b2c` — `feat(06-03): wire persona extractor + launcher generator into installer flow`

Test suites re-verified green:

- `npm run test:gm-surface` → 29 passed, 0 failed
- `npm run test:install` → 205 passed, 0 failed
- `npm run test:self-install-guard` → 6 passed, 0 failed

---

*Phase: 06-installer-mechanics-copy-manifest-stub-generation*
*Completed: 2026-04-18*
