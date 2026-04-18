# Phase 5: Foundations & Command-Surface Validation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-18
**Phase:** 05-foundations-command-surface-validation
**Areas discussed:** Verification artifact, Launcher → persona path, .gitignore strategy, Flat-name fallback

---

## Area Selection

**Question:** Which areas for Phase 5 do you want to discuss?
**Options presented (multiSelect):**

| Option | Description | Selected |
|--------|-------------|----------|
| Verification artifact | How to satisfy SC#1 — prove /gm:* resolves? Options span from a short committed note citing the in-repo /gsd:* precedent, to an automated on-disk layout test, to a live-invocation recording. | ✓ |
| Launcher → persona path | Where does the launcher stub load the persona from at runtime? Roadmap says `_gomad/gomad/agents/*.md`, but persona currently lives in `src/gomad-skills/.../gm-agent-*/SKILL.md` + `skill-manifest.yaml`. | ✓ |
| .gitignore strategy | Narrow pattern vs broad pattern with gsd exception. | ✓ |
| Flat-name fallback | SC#1 says 'OR a documented flat-name fallback plan.' Given /gsd:* works, do we still document /gm-agent-* as contingency? | ✓ |

**User's choice:** All four areas selected.

---

## Verification Artifact

### Q1: What form should the verification artifact take?

| Option | Description | Selected |
|--------|-------------|----------|
| Short note + gsd precedent (Recommended) | Brief note citing .claude/commands/gsd/*.md as live evidence. Lowest-effort. | |
| Automated on-disk layout test | Assert file at .claude/commands/<ns>/<cmd>.md with `name:` frontmatter exists and parses. Stronger regression guard. | |
| Live-invocation recording | Throwaway /gm-ping with recorded terminal session. Highest rigor. | |
| Note + automated layout test | Both: gsd precedent note AND structural test. Belt-and-braces. | ✓ |

**User's choice:** Note + automated layout test

### Q2: If a test is added, what should it assert?

| Option | Description | Selected |
|--------|-------------|----------|
| Structural only (Recommended) | File exists, frontmatter parses, `name:` matches expected form. Runs in normal CI (no TTY). | |
| Structural + install smoke | Structural PLUS invoke `gomad install` in a fixture workspace and re-check. Catches installer regressions. | ✓ |
| No test — note only | Skip test entirely; rely on note + gsd precedent. | |

**User's choice:** Structural + install smoke

### Q3: Should Phase 5 pin a minimum Claude Code version?

| Option | Description | Selected |
|--------|-------------|----------|
| Defer to Phase 9 (Recommended) | Phase 9 handles release mechanics; min-version fits there. | |
| Phase 5 establishes min-version | Detect current CC version during verification, record as minimum. | |

**User's clarifying question:** "What's the relation with CC-version?"
**Claude's response:** Explained Pitfall #1 context (namespace rocky on older CC versions).
**User's final decision:** "No need, nobody will use old versions, CC updates several versions almost every day."
**Outcome:** No min-CC-version pin in Phase 5 OR Phase 9. Skipped entirely. Handle in patch if regression occurs.

---

## Launcher → Persona Path

### Q1: Where does the launcher stub point at runtime to load the persona?

| Option | Description | Selected |
|--------|-------------|----------|
| `_gomad/gomad/agents/<name>.md` (Recommended) | Matches roadmap language. Clean, flat, command-facing. | ✓ |
| Installed SKILL.md directly | Launcher points at installed copy of `gm-agent-*/SKILL.md`. Tighter coupling to source tree shape. | |
| Inline-with-reference hybrid | Full persona text inline + source-of-truth path in comment. Trades launcher-thinness. | |

**User's choice:** `_gomad/gomad/agents/<name>.md`

### Q2: How is the installed persona file produced from source?

| Option | Description | Selected |
|--------|-------------|----------|
| Extract from SKILL.md body (Recommended) | Installer extracts persona body (strip frontmatter, keep prose). Preserves single source of truth. | ✓ |
| Copy SKILL.md verbatim | Copy as-is including frontmatter; frontmatter ignored at persona-load. Simplest. | |
| Compose from skill-manifest.yaml fields | Build from structured fields — more deterministic but duplicates content. | |

**User's choice:** Extract from SKILL.md body

### Q3: Where do rich persona metadata fields land?

| Option | Description | Selected |
|--------|-------------|----------|
| Launcher frontmatter description + body metadata (Recommended) | Launcher has frontmatter + body metadata; agent-manifest.csv regenerated from launcher. | ✓ |
| Keep skill-manifest.yaml as sole metadata source | Launcher bare; agent-manifest.csv reader keeps pointing at src/ skill-manifest.yaml. | |
| Defer to Phase 6 | Phase 6's launcher-gen territory; Phase 5 only pins path contract. | |

**User's choice:** Launcher frontmatter description + body metadata

---

## .gitignore Strategy + Self-Install Guard

### Q1 (round 1): Which .gitignore pattern?

| Option | Description | Selected |
|--------|-------------|----------|
| Narrow: .claude/commands/gm/ only (Recommended) | Explicit, minimal risk. | |
| Broad: deny .claude/commands/* except gsd | Future-proof allowlist pattern. | |
| Narrow + self-install guard | Narrow pattern + installer refuses when cwd is gomad source repo. | |

**User's free-text response:** "不用加到 .gitignore，否则团队无法共用，另外为什么会出现 gsd，gsd 和我们这个项目没关系的啊"
**User's concerns flagged:**
- Why gitignore if team can't share?
- Why is gsd in the conversation at all — gsd is unrelated to gomad.

**Claude's clarification:**
- `.claude/commands/gsd/` IS committed in this repo per PROJECT.md — it's dev tooling for contributors building gomad; not shipped in tarball; cited as in-repo empirical proof subdirectory namespace works.
- `.claude/commands/gm/` would be installer OUTPUT written per-workspace by `gomad install`, not a source artifact the team authors. If team wants to share, they need to decide: is it installer output, hand-authored source, or committed installed state?

### Q2 (round 2): What should live at .claude/commands/gm/ in the dev repo?

| Option | Description | Selected |
|--------|-------------|----------|
| Nothing — installer-only output (Recommended) | Dev repo never has it; gitignore prevents accidental commits. | ✓ |
| Hand-authored launcher source files, committed | Launcher files committed somewhere like tools/installer/templates/. Changes "Generate-don't-move" to "copy-don't-generate". | |
| Commit the installed output | Run installer in dev repo, commit output. Conflicts with self-install guard. | |

**User's choice:** Nothing — installer-only output

### Q3 (round 3): .gitignore pattern after clarification

| Option | Description | Selected |
|--------|-------------|----------|
| Narrow: .claude/commands/gm/ only (Recommended) | Explicit single-path pattern. | ✓ |
| Broad: deny .claude/commands/* except gsd | Future-proof allowlist pattern. | |

**User's choice:** Narrow: .claude/commands/gm/ only

### Q4: Installer self-install guard?

| Option | Description | Selected |
|--------|-------------|----------|
| Phase 5 adds it now (Recommended) | Detect src/gomad-skills/ in cwd, refuse unless --self. | ✓ |
| Defer to Phase 6 | Gitignore is sufficient pollution prevention. | |
| Skip entirely | Rely on .gitignore + reviewer vigilance. | |

**User's choice:** Phase 5 adds it now

---

## Flat-name Fallback

### Q1: Do we document a /gm-agent-* fallback?

| Option | Description | Selected |
|--------|-------------|----------|
| Skip entirely (Recommended) | No fallback doc. Namespace verified; patch release if regression. | |
| One-line mention in verification note | Short breadcrumb. | |
| Document as ADR | Full architecture decision record. | |

**User's free-text response:** "gsd is only used to develop gomad, it should not appear in the project which use gomad"
**Context:** User reiterated gsd scope boundary. Not a direct answer to the fallback question.
**Claude's action:** Acknowledged scope (already in PROJECT.md Out of Scope). Verified via `package.json files` allowlist that gsd is structurally blocked from the tarball. Re-asked fallback question without gsd framing.

### Q1 (retry): Do we document a /gm-agent-* fallback?

| Option | Description | Selected |
|--------|-------------|----------|
| Skip (Recommended) | No fallback doc. | |
| One-line breadcrumb in verification note | Short fallback mention. | |

**User's free-text response:** "don't fallback to /gm-agent-*"
**User's decision:** Full commitment to `/gm:agent-*`. No fallback documented anywhere, not even as a breadcrumb.

---

## Claude's Discretion

- Plan decomposition (single plan vs split) — planner decides.
- Exact location of verification note file and automated test file — planner aligns with existing test conventions.
- Installer self-install guard error wording.
- PROJECT.md Key Decisions row wording (within existing table format).

## Deferred Ideas

- Minimum Claude Code version requirement (Pitfall #1) — explicitly skipped.
- `/gm-agent-*` flat-name fallback (Pitfall #1 alternative) — explicitly skipped.
- `gomad install --watch` dev-loop contributor experience (Pitfall #10) — out of Phase 5 scope.
- Full ADR for launcher decision — deferred; PROJECT.md Key Decisions row is sufficient.
