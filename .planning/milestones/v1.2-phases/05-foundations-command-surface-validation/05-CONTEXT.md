# Phase 5: Foundations & Command-Surface Validation - Context

**Gathered:** 2026-04-18
**Status:** Ready for planning

<domain>
## Phase Boundary

De-risk the load-bearing assumptions of v1.2 **before** any installer or content work begins. Four discrete deliverables, all narrow:

1. Verify `/gm:*` subdirectory namespace resolves on the team's current Claude Code (via a committed verification artifact)
2. Log the launcher-vs-self-contained architecture decision in PROJECT.md Key Decisions (outcome: launcher)
3. Prevent installer-generated command output from polluting the dev repo (`.gitignore` + installer self-install guard)
4. Fix the `type: module` factual error in PROJECT.md (actual runtime is CommonJS)

Out of scope for this phase: installer mechanics (Phase 6), manifest-driven cleanup (Phase 7), PRD refinement (Phase 8), reference sweep and release (Phase 9).

</domain>

<decisions>
## Implementation Decisions

### Verification artifact (SC#1)
- **D-01:** Verification artifact takes TWO forms, both committed: a short markdown note citing `.claude/commands/gsd/*.md` as in-repo empirical proof the subdirectory-namespace form works on the team's current Claude Code; AND an automated test
- **D-02:** Automated test asserts BOTH structural layout (file at `.claude/commands/gm/agent-<name>.md` exists, YAML frontmatter parses, `name:` field matches `gm:agent-<name>`) AND install-smoke (invoke `gomad install` in a fixture workspace and re-check the layout) — catches installer regressions that break the generated layout
- **D-03:** No minimum Claude Code version pin. Rationale: Claude Code updates essentially daily; nobody runs old versions long enough for the silent-namespace-fail pitfall to matter in practice. If a regression ever occurs, handle in a patch release — not as pre-emptive paperwork.
- **D-04:** No flat-name fallback (`/gm-agent-*`) is documented. Full commitment to `/gm:agent-*`. No contingency breadcrumb in the verification note — keeps messaging single-form.

### Launcher → persona path contract (SC#2, Phase 6 input)
- **D-05:** Launcher stub at `.claude/commands/gm/agent-<name>.md` delegates at runtime to `_gomad/gomad/agents/<name>.md`. Confirms roadmap language.
- **D-06:** Installer (Phase 6) **extracts the persona body** from `src/gomad-skills/*/gm-agent-*/SKILL.md` at install time, writing it to `_gomad/gomad/agents/<name>.md` in the target workspace. Frontmatter stripped; prose (role, identity, principles, communicationStyle) kept. Preserves single source of truth in `SKILL.md`; no new hand-authored files; no manual duplication risk.
- **D-07:** Launcher frontmatter carries `name: gm:agent-<name>` + `description:` (combining title + displayName). Rich persona metadata (displayName, icon, title, capabilities) lands in the launcher body so Claude Code sees it at command-load time. `agent-manifest.csv` is regenerated from launcher frontmatter + body scanning; `skill-manifest.yaml` in source stays authoritative for fields not exposed via launcher frontmatter.
- **D-08:** Launcher decision must be formally logged in PROJECT.md Key Decisions table in this phase (per SC#2). Row content: "Launcher-form slash commands (not self-contained) — `.claude/commands/gm/agent-*.md` is a thin stub loading persona from `_gomad/gomad/agents/*.md` at runtime."

### Dev-repo pollution prevention (SC#3)
- **D-09:** `.claude/commands/gm/` in the dev repo is **installer-only output**, never a source-authored directory. The dev repo should never have content at this path.
- **D-10:** `.gitignore` uses a **narrow** pattern: add `.claude/commands/gm/` explicitly. Do NOT use a broad allowlist pattern like `.claude/commands/*` + `!.claude/commands/gsd/` — narrow is lower-risk of hiding deliberate future tracked directories.
- **D-11:** Phase 5 also adds an **installer self-install guard**: detect `src/gomad-skills/` in cwd; refuse `gomad install` with a clear error unless `--self` is passed. Defense-in-depth: `.gitignore` prevents commits of pollution, guard prevents pollution from ever occurring. This closes Pitfall #7 at the tool level rather than relying on `.gitignore` + reviewer vigilance alone.
- **D-12:** `.claude/commands/gsd/` stays tracked as contributor dev tooling (PROJECT.md already locks this as Out of Scope for the shipped distribution). `package.json` `files` allowlist contains zero `.claude/` entries — gsd is structurally blocked from leaking into the tarball; confirmed `2026-04-18`.

### PROJECT.md factual correction (SC#4)
- **D-13:** PROJECT.md line 77 and line 94 currently say *"Tech stack: Node.js / JavaScript (`type: module`), inherited from BMAD."* This is factually wrong. `package.json` has no `"type"` field; `tools/installer/gomad-cli.js` uses `const { program } = require('commander')`; `tools/installer/core/installer.js` uses `const path = require('node:path')`. The installer is **CommonJS with `require()`-based loading**. Both occurrences of the error must be corrected.

### Claude's Discretion
- Plan decomposition — bundling all four SCs into one plan vs splitting (e.g., verification work vs PROJECT.md edits vs gitignore/guard). Planner decides based on dependency and reviewability.
- Exact location of verification note file (likely `.planning/phases/05-.../VERIFICATION.md` or a note directly in the phase dir).
- Exact location/framework of the automated test (candidates: `tools/installer/test/`, repo-level `test/`, `test-e2e-install.js`-style under project root). Planner aligns with existing v1.1 test conventions.
- Wording of the installer self-install guard error message.
- Exact PROJECT.md Key Decisions row wording (kept within the existing table format).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase-5-specific requirements and success criteria
- `.planning/ROADMAP.md` §"Phase 5: Foundations & Command-Surface Validation" — Goal statement, 4 success criteria, requirements linkage (CMD-05, REF-03, REL-01)
- `.planning/REQUIREMENTS.md` §CMD-05 — Subdirectory namespace verification requirement
- `.planning/REQUIREMENTS.md` §REF-03 — Generated launcher stubs excluded via `.gitignore`
- `.planning/REQUIREMENTS.md` §REL-01 — PROJECT.md `type: module` factual-error correction
- `.planning/STATE.md` §"Accumulated Context → Decisions" — Milestone-kickoff locked decisions carried into Phase 5 (launcher-form, generate-don't-move, zero new runtime deps, filesystem dirs keep `gm-agent-*` dash)

### Pitfall research (Phase-5-relevant entries)
- `.planning/research/PITFALLS.md` §"Pitfall 1: `/gm:agent-*` subdirectory namespace silently doesn't work" — Informs D-01/D-02/D-03/D-04; full rationale for why verification matters and why min-CC-version work is skipped
- `.planning/research/PITFALLS.md` §"Pitfall 7: `.claude/commands/` in the dev repo gets polluted and committed" — Informs D-09/D-10/D-11
- `.planning/research/PITFALLS.md` §"Pitfall 11: Agent command template still says 'load agent file from `{project-root}/_gomad/...`'" — Informs D-05/D-06/D-07 (launcher-vs-self-contained decision and path contract)

### Target of Phase 5 edits
- `.planning/PROJECT.md` §"Context" (line 77) AND §"Constraints" (line 94) — Both occurrences of `type: module` require correction to CommonJS per D-13
- `.planning/PROJECT.md` §"Key Decisions" — Target for the launcher-form decision row per D-08
- `.gitignore` (repo root) — Target for D-10 pattern addition

### In-repo precedent and code context
- `.claude/commands/gsd/*.md` — In-repo empirical proof the subdirectory-namespace `name: <ns>:<cmd>` pattern resolves on team's current Claude Code. Cited in the verification note (D-01).
- `src/gomad-skills/1-analysis/gm-agent-analyst/SKILL.md` + `skill-manifest.yaml`
- `src/gomad-skills/1-analysis/gm-agent-tech-writer/SKILL.md` + `skill-manifest.yaml`
- `src/gomad-skills/2-plan-workflows/gm-agent-pm/SKILL.md` + `skill-manifest.yaml`
- `src/gomad-skills/2-plan-workflows/gm-agent-ux-designer/SKILL.md` + `skill-manifest.yaml`
- `src/gomad-skills/3-solutioning/gm-agent-architect/SKILL.md` + `skill-manifest.yaml`
- `src/gomad-skills/4-implementation/gm-agent-sm/SKILL.md` + `skill-manifest.yaml`
- `src/gomad-skills/4-implementation/gm-agent-dev/SKILL.md` + `skill-manifest.yaml` — Seven persona sources; Phase 6 will extract bodies per D-06 (Phase 5 only documents the contract)

### Packaging / distribution references
- `package.json` §`files` — Confirms `.claude/` absent from allowlist; gsd cannot leak into shipped tarball (supports D-12)
- `package.json` §`main` (`tools/installer/gomad-cli.js`) — Entry point used to confirm CommonJS reality for D-13

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`.claude/commands/gsd/*.md` with `name: gsd:*` frontmatter** — Working example of subdirectory-namespace pattern in THIS repo. Verification note (D-01) cites these as live proof. Structural test (D-02) can mirror the frontmatter shape when asserting `gm:agent-*` launcher conformance.
- **`tools/installer/ide/shared/agent-command-generator.js`** — Already exists (per PITFALLS.md Pitfall #4) with the purpose of generating flat `gomad-agent-*.md` launchers. Phase 6 will revise it to emit `gm/agent-*.md` — Phase 5 only needs to know the target contract (D-05, D-06, D-07) so Phase 6 has the spec.
- **`tools/installer/ide/templates/agent-command-template.md`** — Existing launcher template (PITFALLS.md Pitfall #11). Its instruction "LOAD the FULL agent file from `{project-root}/_gomad/{{module}}/agents/{{path}}`" is directionally aligned with D-05. Phase 6 will revise, not Phase 5.
- **`tools/installer/core/installer.js`** — CommonJS entry point; evidence for D-13 (`require('fs-extra')`, etc.).
- **Existing v1.1 test harness patterns** — `test-e2e-install.js`, `test-installation-components.js` (per PITFALLS.md "Looks Done But Isn't Checklist"). Phase 5 automated test (D-02) aligns with these conventions; avoids TTY-dependent interactive install (v1.1 lesson per PROJECT.md Key Decisions).

### Established Patterns
- **`.claude/commands/<ns>/<cmd>.md` + `name: <ns>:<cmd>`** — The pattern already in use for gsd. Phase 5 treats this as a fixed contract, not a variable.
- **`files` allowlist at `package.json`** — Opt-in to shipping, not opt-out. Any concern about dev-repo-only content leaking into the tarball is structurally already prevented; confirms D-12.
- **CommonJS `require()` throughout `tools/installer/`** — No ESM. Confirms D-13.
- **`skill-manifest.yaml` richer than launcher frontmatter can hold** — Per PITFALLS.md Pitfall #18. Informs D-07's split between "launcher frontmatter vs launcher body metadata vs `skill-manifest.yaml` residual."

### Integration Points
- **PROJECT.md Key Decisions table** — Structured table; D-08 adds one row. Must preserve table format (columns: Decision | Rationale | Outcome).
- **`.gitignore`** — Existing file has explicit top-level block comments grouping patterns (dependencies, logs, build output, AI assistant files). D-10 addition belongs under the "Development tools and configs" or a new "Installer-generated output" group for clarity.
- **`gomad install` CLI flag parsing** — `tools/installer/gomad-cli.js` uses Commander; adding `--self` flag (D-11) follows the existing pattern there.
- **Self-install detection signal** — `src/gomad-skills/` presence in cwd is the proposed signal (D-11). Alternative signals the planner may evaluate: presence of `.planning/PROJECT.md`, `package.json` with `"name": "@xgent-ai/gomad"`.

</code_context>

<specifics>
## Specific Ideas

- **Lean into the `/gsd:*` precedent.** When writing the verification note, point directly at the existing gsd commands in this very repo. That's the strongest possible evidence; far more credible than a separate test file. "Works here, in this exact environment, right now."
- **"Nobody uses old CC versions."** CC updates daily; the min-version concern is theoretical. Don't spend Phase 5 or Phase 9 paperwork on it. Ship cleanly; if someone hits it, handle in patch.
- **No fallback posture.** Full commit to `/gm:agent-*`. Don't hedge in docs or README. One form, clearly named.
- **Defense-in-depth on dev-repo pollution.** Both gitignore AND installer self-install guard, not either-or. The guard prevents creation; gitignore prevents commits of anything that slips through (e.g., if a contributor passes `--self` for a legitimate reason).

</specifics>

<deferred>
## Deferred Ideas

- **Minimum Claude Code version requirement** (Pitfall #1 long-tail mitigation) — Explicitly skipped per D-03. Not queued for Phase 9 either. Revisit only if a CC regression actually breaks `/gm:*` for a real user.
- **Flat-name fallback `/gm-agent-*` contingency** (Pitfall #1 alternative) — Explicitly skipped per D-04. Not documented anywhere. If needed, ship a patch release with it; do not pre-document.
- **`gomad install --watch` / dev-loop contributor experience** (Pitfall #10) — Out of scope for Phase 5; belongs in Phase 6 (installer mechanics) or a separate follow-up. Not blocking v1.2.
- **Full ADR file for launcher decision** — Deferred in favor of the in-place PROJECT.md Key Decisions row per D-08. If the architecture ever needs deeper rationale, author an ADR in a later phase.

</deferred>

---

*Phase: 05-foundations-command-surface-validation*
*Context gathered: 2026-04-18*
