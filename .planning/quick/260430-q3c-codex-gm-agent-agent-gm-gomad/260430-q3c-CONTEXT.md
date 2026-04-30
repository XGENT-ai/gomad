---
name: 260430-q3c-CONTEXT
description: Context for quick task 260430-q3c — Codex install: $gm-agent-* works, /gm:agent-* references in skill content are dead
type: quick-task-context
---

# Quick Task 260430-q3c: Codex install — `/gm:agent-*` references don't resolve - Context

**Gathered:** 2026-04-30
**Status:** Ready for planning

<domain>
## Task Boundary

Bug: After selecting Codex as the install target, users cannot invoke agents via `/gm:agent-*` or capabilities via `/gm-*`. User clarified that in Codex the actual syntax is `$gm-*` (capabilities) and `$gm-agent-*` (agents) — both of these dash-form invocations work natively. What does NOT work is `/gm:agent-*` (colon form), which is the form referenced inside skill bodies.

The fix is to make installed skill content correctly invokable in Codex without breaking Claude Code.

</domain>

<decisions>
## Implementation Decisions

### Codex install path (locked)
- Codex `target_dir` is `.agents/skills/` (per `tools/installer/ide/platform-codes.yaml`).
- Skills are copied verbatim from `src/gomad-skills/*/<skill-name>/` into `.agents/skills/<skill-name>/`.
- Codex invokes a skill at `.agents/skills/gm-agent-pm/SKILL.md` as `$gm-agent-pm`.
- Codex does NOT support colons in invocation names (`$gm:agent-*` is invalid).
- Codex has NO launcher-file equivalent — invocation is by skill directory name directly.

### Bug scope (locked by user)
- `$gm-*` works (capability skills like `gm-distillator`)
- `$gm-agent-*` works (agent personas like `gm-agent-pm`)
- `$gm:agent-*` does NOT work
- The dead references are inside skill content telling users to invoke `/gm:agent-pm` etc.

### Fix approach (Claude's recommendation — confirm with planner)
**Install-time syntax transformation per platform.**
- Add an `invocation_syntax` field to each platform's installer config in `platform-codes.yaml` (e.g. `colon` for claude-code, `dash` for codex/others).
- During `installVerbatimSkills` (in `tools/installer/ide/_config-driven.js`), apply a regex transform to skill content as it's copied:
  - For platforms with `invocation_syntax: dash`: replace `/gm:agent-<short>` → `$gm-agent-<short>` and bare `gm:agent-<short>` → `gm-agent-<short>`.
  - For `invocation_syntax: colon` (claude-code): no-op, content ships as-is.
- Apply the same transform to `module-help.csv` rows during the merge in `installer.js#mergeModuleHelpCatalogs` for non-claude platforms.

Why this approach:
- Source files stay clean and readable (single canonical reference form).
- Each platform receives content that uses its own native syntax.
- Surgical: confined to the install copy path and the help-CSV merge.
- No reversal of prior D-64 decision (user-visible references remain colon at the source).

### Claude's Discretion
- Exact list of files to transform: any `*.md`, `*.csv`, and `*.yaml` under each skill directory that contains a colon-form cross-reference. Planner can scope precisely.
- Whether the transform also covers other platforms beyond codex (auggie, cline, codebuddy, antigravity all also lack `launcher_target_dir`) — recommend "yes, all platforms without `launcher_target_dir` get the dash transform" since they all share Codex's constraint pattern.
- Whether to add a regression test fixture that verifies installed Codex skill content contains `$gm-agent-*` and not `/gm:agent-*`.

</decisions>

<specifics>
## Specific Files Identified

User-visible colon-form references in source content (must transform for non-claude platforms):
- `src/gomad-skills/4-implementation/gm-sprint-agent/workflow.md:90,176,245,291` — `/gm:agent-pm`, `/gm:agent-dev`
- `src/gomad-skills/4-implementation/gm-epic-demo-story/SKILL.md:20` — `/gm:agent-pm`
- `src/gomad-skills/module-help.csv:6-10` — `gm:agent-tech-writer` in agent column (5 rows)

Frontmatter `name:` fields in `skill-manifest.yaml` and `SKILL.md` use dash form (`gm-agent-pm`) and need NOT be touched — those are filesystem identifiers.

Install pipeline entry points:
- Per-platform copy: `tools/installer/ide/_config-driven.js` — `installVerbatimSkills` (called from `installToTarget`).
- Help-CSV merge: `tools/installer/core/installer.js#mergeModuleHelpCatalogs` (line 1191).
- Platform config: `tools/installer/ide/platform-codes.yaml` (add `invocation_syntax` field).

</specifics>

<canonical_refs>
## Canonical References

- D-22 / D-64 in prior commits: filesystem dirs keep `gm-agent-*` (dash) but user-visible refs use `gm:agent-*` (colon). This decision was Claude-Code-centric — it didn't account for IDEs without launcher generation.
- `tools/installer/core/manifest-generator.js:22-29` — comments documenting the dash↔colon mapping policy.
- Platform list in `tools/installer/ide/platform-codes.yaml` — codex, auggie, cline, codebuddy, antigravity all have no `launcher_target_dir` and would benefit from the dash transform.

</canonical_refs>
