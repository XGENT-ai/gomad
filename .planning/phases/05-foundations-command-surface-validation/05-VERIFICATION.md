---
phase: 05-foundations-command-surface-validation
verified: 2026-04-18T00:00:00Z
status: passed
score: 1/1 must-haves verified
overrides_applied: 0
---

# Phase 5: Command-Surface Verification Note (CMD-05)

**Phase Goal:** De-risk the load-bearing assumption that Claude Code resolves the subdirectory-namespace pattern `.claude/commands/<ns>/<cmd>.md` with YAML frontmatter `name: <ns>:<cmd>` as `/<ns>:<cmd>` on the team's current Claude Code.

**Verified:** 2026-04-18
**Status:** passed
**Approach:** empirical in-repo proof (D-01) + automated structural + install-smoke test (D-02)

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `.claude/commands/gsd/*.md` exist with `name: gsd:<cmd>` frontmatter in this repo | VERIFIED | `ls .claude/commands/gsd/*.md` lists 68 files; `head -3 .claude/commands/gsd/add-phase.md` shows `name: gsd:add-phase`; `head -3 .claude/commands/gsd/plan-phase.md` shows `name: gsd:plan-phase` |
| 2 | The subdirectory-namespace pattern `.claude/commands/<ns>/<cmd>.md` with `name: <ns>:<cmd>` frontmatter resolves as `/<ns>:<cmd>` on the team's current Claude Code | VERIFIED | The gsd commands listed above have been invoked successfully during v1.1 development (Phases 1–4 shipped 2026-04-18). The `/gsd:*` form IS the invocation surface the team has been using; if subdirectory-namespace resolution were broken, v1.1 could not have shipped. |
| 3 | Therefore `.claude/commands/gm/agent-<name>.md` with `name: gm:agent-<name>` frontmatter (to be generated in Phase 6) will resolve as `/gm:agent-<name>` on the same Claude Code | VERIFIED BY ANALOGY | Same filesystem path shape (`.claude/commands/<ns>/<cmd>.md`), same frontmatter shape (`name: <ns>:<cmd>`), same Claude Code install. The only variable across `/gsd:*` and `/gm:*` is the literal namespace string. |

## Automated Guard

An automated test at `test/test-gm-command-surface.js` locks this contract into CI. It runs two phases against a tempDir fixture:

- **Install-smoke:** drives `gomad install --yes --directory <tempDir> --tools claude-code` in a packed-tarball fixture and asserts the process exits 0. Live in Phase 5.
- **Structural assertion:** if `.claude/commands/gm/agent-*.md` exists in the installed output, asserts each file's frontmatter `name:` matches `gm:agent-<filename-stem-without-'agent-'-prefix>` and `description:` is non-empty. Conditional in Phase 5 (generator lands in Phase 6); Phase 6 strengthens the conditional into a hard assertion.
- The test runs via `npm run test:gm-surface`.

## Scope Discipline

Per D-03 and D-04 of `05-CONTEXT.md`:

- **No CC-version floor pinned.** Claude Code updates essentially daily; pre-emptive version paperwork does not reflect real usage. If a CC regression ever breaks `/gm:*` for a real user, handle in a patch release.
- **`/gm:agent-*` is the single committed invocation form.** No alternative namespace shape is documented as a contingency per D-04 — single form, clear messaging, no hedging in user-facing docs.

## Reference

- Requirement: `CMD-05` in `.planning/REQUIREMENTS.md`
- Phase decisions: `05-CONTEXT.md` D-01 through D-04
- Evidence files: `.claude/commands/gsd/*.md`
- Test: `test/test-gm-command-surface.js`
