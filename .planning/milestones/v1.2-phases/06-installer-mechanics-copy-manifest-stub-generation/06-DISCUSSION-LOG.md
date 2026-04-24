# Phase 6: Installer Mechanics — Copy + Manifest + Stub Generation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-18
**Phase:** 06-installer-mechanics-copy-manifest-stub-generation
**Areas discussed:** Persona-extraction contract, Copy-only scope & symlink-leftover policy, Manifest v2 schema shape, Claude-code non-agent skill target

---

## Persona-extraction contract

### Q: At install time, what exactly gets extracted from src/gomad-skills/*/gm-agent-*/SKILL.md into _gomad/gomad/agents/<name>.md?

| Option | Description | Selected |
|--------|-------------|----------|
| Full body sans frontmatter (Recommended) | Strip only the YAML frontmatter block, keep the rest verbatim | ✓ |
| Selected sections only | Keep only persona-defining sections (Identity, Communication Style, Principles, On Activation) | |
| Rewrite into a new persona schema | Define a canonical persona-file shape | |

**User's choice:** Full body sans frontmatter
**Notes:** Preserves SKILL.md as single source of truth; no section-by-section filtering logic to maintain.

---

### Q: Does the extracted _gomad/gomad/agents/<name>.md get its OWN frontmatter, and if so what shape?

| Option | Description | Selected |
|--------|-------------|----------|
| No frontmatter — pure prose (Recommended) | Pure prose after the strip | |
| Minimal frontmatter (name + displayName) | Traceability header only | |
| Full skill-manifest.yaml mirrored as frontmatter | Every field copied from skill-manifest.yaml | ✓ |

**User's choice:** Full skill-manifest.yaml mirrored as frontmatter
**Notes:** Gives extracted file full traceability metadata; user accepted the resulting triplication (source manifest + extracted agent frontmatter + launcher body YAML fence) on the condition that both derivation paths read from skill-manifest.yaml at generation time (captured in CONTEXT.md D-18).

---

### Q: How should the launcher body carry rich metadata (displayName, icon, title, capabilities) so Claude Code sees it at command-load time?

| Option | Description | Selected |
|--------|-------------|----------|
| Structured prose paragraph (Recommended) | Intro paragraph weaving metadata into natural prose | |
| Key-value bullet list | Tight list of **Name:** / **Title:** / **Icon:** / etc. | |
| Fenced YAML metadata block then prose activation | ```yaml block then prose | ✓ |

**User's choice:** Fenced YAML metadata block then prose activation
**Notes:** Machine-parseable + clear separation between metadata and activation instructions.

---

### Q: How should the launcher frontmatter 'description:' field read (combining title + displayName per D-07)?

| Option | Description | Selected |
|--------|-------------|----------|
| '<Title> (<displayName>). <one-line purpose>' (Recommended) | e.g., "Business Analyst (Mary). Market research, competitive analysis, …" | ✓ |
| 'Talk to <displayName>, the <Title>' | e.g., "Talk to Mary, the Business Analyst." | |
| '<displayName> — <Title>' (em-dash, no purpose) | e.g., "Mary — Business Analyst." | |

**User's choice:** '<Title> (<displayName>). <one-line purpose>'
**Notes:** Title leads for searchability; displayName in parens gives persona; purpose clause informs Claude's routing.

---

## Copy-only scope & symlink-leftover policy

### Q: Which IDEs does the copy-only switch apply to?

| Option | Description | Selected |
|--------|-------------|----------|
| All IDEs universally (Recommended) | Replace fs.ensureSymlink with fs.copy for every IDE | ✓ |
| Claude-code only; other IDEs keep symlinks | Per-platform gate | |

**User's choice:** All IDEs universally
**Notes:** Matches INSTALL-01 as written; one installer code path.

---

### Q: When fs.lstat finds a PRE-EXISTING symlink at the install destination, what happens?

| Option | Description | Selected |
|--------|-------------|----------|
| Log 'upgrading from symlink' then unlink then copy (Recommended) | Info-level log line + unlink + copy | ✓ |
| Silently unlink then copy | No log output | |
| Back up as .bak then unlink then copy | fs.move to .bak before copy | |

**User's choice:** Log 'upgrading from symlink' then unlink then copy
**Notes:** Minimal noise; full observability of v1.1→v1.2 transition.

---

### Q: If the destination is a REGULAR FILE (not a symlink), not in the prior manifest, what's the Phase 6 behavior?

| Option | Description | Selected |
|--------|-------------|----------|
| Defer to v1.1 .bak detection flow (Recommended) | Leave installer.js:461–525 .bak logic intact | |
| Always overwrite regular files | fs.copy with overwrite: true | ✓ |
| Refuse install with 'unexpected regular file at path' | Fail-loud | |

**User's choice:** Always overwrite regular files
**Notes:** Intentional interim posture — Phase 7's manifest-driven cleanup (INSTALL-05/09) layers .bak snapshot safety back on top. Flagged as regression vs v1.1 for IDE-target paths; accepted consciously.

---

### Q: How does the installer recognize it should apply the symlink-leftover check?

| Option | Description | Selected |
|--------|-------------|----------|
| Unconditional per-file fs.lstat pre-check (Recommended) | Always lstat before fs.copy | |
| Only on re-install (when files-manifest.csv exists) | Gate on manifest presence | ✓ |
| Gate on legacy path detection (v1.1 .claude/skills/gm-agent-*) | Detect v1.1 explicitly | |

**User's choice:** Only on re-install (when files-manifest.csv exists)
**Notes:** Tightens fresh-install performance; scopes upgrade-mode logic cleanly.

---

## Manifest v2 schema shape

### Q: Where does schema_version live in _gomad/_config/files-manifest.csv?

| Option | Description | Selected |
|--------|-------------|----------|
| Per-row column (Recommended) | Add schema_version as a column on every row | ✓ |
| Header comment line above header row | '# schema_version: 2' on line 1 | |
| Meta-row at top (magic row before data) | __meta__ row | |

**User's choice:** Per-row column
**Notes:** Trivially parsed by csv-parse; missing column → implicit v1.

---

### Q: What value does schema_version hold?

| Option | Description | Selected |
|--------|-------------|----------|
| '2' (integer string, Recommended) | Simple incrementing integer | |
| '2.0' (semver-ish) | Permits '2.1' / '2.2' minor bumps | ✓ |
| '1.2' (mirror release version) | Couples schema to npm version | |

**User's choice:** '2.0' (semver-ish)
**Notes:** Decoupled from npm release numbering; allows minor schema bumps.

---

### Q: How do IDE-target paths vs _gomad/-internal paths get represented in one manifest?

| Option | Description | Selected |
|--------|-------------|----------|
| Unified manifest; add an 'install_root' column (Recommended) | Every row carries install_root + relative path | ✓ |
| Unified manifest; paths relative to target project root | No new column; prefix-matching required | |
| Two manifests (files-manifest.csv + ide-manifest.csv) | Split into separate files | |

**User's choice:** Unified manifest; add an 'install_root' column
**Notes:** Enables Phase 7's realpath-containment check; all paths normalized to forward slashes (Pitfall #19).

---

### Q: Does Phase 6 swap the existing hand-rolled CSV PARSE in installer.js over to csv-parse, or just use csv-parse for the NEW write path?

| Option | Description | Selected |
|--------|-------------|----------|
| Both — read AND write via csv-parse now (Recommended) | Replace installer.js:618–633 hand-rolled parser | ✓ |
| Write via csv-parse; leave read unchanged | Narrower diff | |

**User's choice:** Both — read AND write via csv-parse now
**Notes:** Closes Pitfall #2 quoting/BOM/CRLF bugs at the source; matches INSTALL-04 literally.

---

## Claude-code non-agent skill target

### Q: What happens to the OTHER ~45 Claude-Code skills currently installed at .claude/skills/?

| Option | Description | Selected |
|--------|-------------|----------|
| Keep the split: agents → .claude/commands/gm/, non-agents → .claude/skills/ (Recommended) | New launcher_target_dir field for agents; target_dir unchanged for non-agents | ✓ |
| Migrate ALL claude-code skills under .claude/commands/ | Out of scope per REQUIREMENTS | |
| Keep agents in BOTH places (.claude/skills/ AND .claude/commands/gm/) | Belt-and-suspenders | |

**User's choice:** Keep the split
**Notes:** Matches roadmap scope; non-agent task-skill migration explicitly out of scope.

---

### Q: Does Phase 6 explicitly REMOVE the legacy .claude/skills/gm-agent-*/ directories, or defer to Phase 7?

| Option | Description | Selected |
|--------|-------------|----------|
| Defer to Phase 7 (INSTALL-07) (Recommended) | Phase 7 owns all manifest-driven legacy cleanup | |
| Clean up in Phase 6 alongside the generator landing | Phase 6 removes the 7 specific paths atomically | ✓ |

**User's choice:** Clean up in Phase 6 alongside the generator landing
**Notes:** Ensures upgrading to Phase 6 alone produces a consistent state; no /gm-agent-* ↔ /gm:agent-* overlap. Phase 7 still owns broader manifest-driven cleanup.

---

### Q: Other IDEs (cursor, codex, auggie, …) don't support slash-command namespaces — what do they install for the 7 agent personas?

| Option | Description | Selected |
|--------|-------------|----------|
| Keep agents as skills at .<ide>/skills/gm-agent-*/ (Recommended) | Unchanged from v1.1 minus symlink | ✓ |
| Generate dash-form flat launchers for other IDEs | writeDashArtifacts for all IDEs | |
| Skip other IDEs entirely in v1.2 — claude-code only | Regression for cursor/codex/auggie users | |

**User's choice:** Keep agents as skills at .<ide>/skills/gm-agent-*/
**Notes:** Preserves multi-IDE support; launcher-form is Claude-Code-only.

---

### Q: Which file does Phase 6 edit to land the launcher_target_dir + extractor invocation hook?

| Option | Description | Selected |
|--------|-------------|----------|
| platform-codes.yaml (new launcher_target_dir field) + _config-driven.js (reads it, invokes generator) (Recommended) | Data-driven; narrow; follows existing pattern | ✓ |
| Hardcode claude-code special case in _config-driven.js or installer.js | Fewer file touches but inverts the config-data model | |
| New top-level installer hook file (e.g., ide/hooks/claude-code-agent-launchers.js) | Most extensible but premature abstraction | |

**User's choice:** platform-codes.yaml (new launcher_target_dir field) + _config-driven.js
**Notes:** User paused mid-question to ask for background clarification; followed up after explanation and picked A. The pause was about understanding the three options' positioning in the codebase, not about the decision itself.

---

## Claude's Discretion

Areas left to planner / implementer:

- Plan decomposition — bundled one-plan vs three-plan split
- Column ordering in files-manifest.csv header
- Log level (info vs warn) for 'upgrading from symlink: <path>'
- Exact prose activation template wording after the fenced YAML block
- Per-agent one-line purpose clause for description:
- Separate extractor unit test vs extend test-gm-command-surface.js
- Windows junction-point semantics under fs.lstat
- Exact implementation of the legacy .claude/skills/gm-agent-*/ removal (recursive fs.remove timing, idempotency)

## Deferred Ideas

- Manifest-driven cleanup with realpath containment + dry-run + backup snapshotting → Phase 7
- Broader v1.1→v1.2 legacy cleanup → Phase 7
- `gomad install --watch` / dev-loop → post-Phase 6 follow-up
- Task-skill → slash-command aliases (CMD-F1) → future milestone
- Dash-form flat launchers for non-CC IDEs → rejected (dead code to clean up at Claude's Discretion)
- Full Windows CI matrix → Phase 9 verification (REL-04)
- Per-persona description one-line-purpose authoring → Claude's Discretion during planning
