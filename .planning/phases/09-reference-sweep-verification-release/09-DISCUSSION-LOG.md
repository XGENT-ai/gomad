# Phase 9: Reference Sweep + Verification + Release - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-23
**Phase:** 09-reference-sweep-verification-release
**Areas discussed:** Sweep prose + cross-skill invokes, module-help.csv restructuring, Regression gate + tarball verification, CHANGELOG BREAKING + release mechanics

---

## Sweep prose + cross-skill invokes

### Question 1a: Cross-skill invoke prose rewrite style

| Option | Description | Selected |
|--------|-------------|----------|
| Slash command invocation | "invoking the `gm-agent-pm` skill (via the Skill tool)" → "invoking the `/gm:agent-pm` slash command". Drops the Skill-tool reference. Minimal churn, matches the command-form contract. | ✓ |
| Embody-persona prose | "Embody the PM persona from `.claude/commands/gm/agent-pm.md`" — hardcodes file path, works across IDE/subagent contexts. More verbose. | |
| Hybrid — command with fallback | Command + "or read `.claude/commands/gm/agent-pm.md` and adopt the persona if slash command unavailable." Covers edge case, more prose. | |

**User's choice:** Slash command invocation.
**Notes:** Internal audience + established command-form contract from Phase 5/6; hybrid over-engineers for unclear edge cases.

### Question 1b: Non-prose `gm-agent-` hits in installer + tests

| Option | Description | Selected |
|--------|-------------|----------|
| Leave as-is — legitimate filesystem refs | No action; regression gate covers via allowlist. | |
| Strict replace + document allowlist in test:refs | Every hit must be in allowlist or match known filesystem-path pattern. | ✓ |
| Defer — planner picks | Coupled to regression-gate discussion. | |

**User's choice:** Strict replace + document allowlist in test:refs.
**Notes:** Allowlist forces explicit review of each legitimate reference; prevents drift via silent new hits.

---

## module-help.csv restructuring

### Question 2: Source-row form

| Option | Description | Selected |
|--------|-------------|----------|
| Keep source dashed — rely on existing installer transform | Zero-churn; installer already emits colon form via `toUserVisibleAgentId()`. | |
| Swap source to colon form + simplify installer | `gm-agent-tech-writer` → `gm:agent-tech-writer` in source. Delete `fromUserVisibleAgentId`/`toUserVisibleAgentId` helpers. | ✓ |
| Leave row content, add a schema note | Keep dashed + comment convention at top of CSV. | |

**User's choice:** Swap source to colon form + simplify installer.
**Notes:** Aligns source with user-visible output; removes code debt (two helper functions become no-ops). Filesystem dirs + YAML `name:` fields keep the dash per REF-02 — asymmetry is filesystem-only.

---

## Regression gate + tarball verification

### Question 3a: Orphan-reference regression gate home

| Option | Description | Selected |
|--------|-------------|----------|
| New dedicated script | `test/test-orphan-refs.js` + npm `test:orphan-refs`; allowlist at `test/fixtures/orphan-refs/allowlist.json`. | ✓ |
| Extend verify-tarball.js | Add grep-clean phase for `gm-agent-` in tarball files. Source-tree drift uncovered. | |
| Rename existing test:refs to cover both | Conflates CSV-extraction and orphan-ref concerns. | |

**User's choice:** New dedicated script.
**Notes:** Keeps existing `test:refs` (CSV workflow-file extraction) unambiguous. Expected allowlist size ~30-50 entries post-sweep.

### Question 3b: Tarball verification scope

| Option | Description | Selected |
|--------|-------------|----------|
| Extend test-gm-command-surface.js Phase C | Hard-assert 7 launchers present + legacy absence; empty-tempDir only. Relies on Phase 7's `test-legacy-v11-upgrade.js` for upgrade path. | ✓ |
| Extend AND add v1.1 fixture smoke | Belt-and-suspenders; catches inter-phase drift. | |
| Extend verify-tarball.js only | Static tarball inspection; doesn't exercise install. | |

**User's choice:** Extend test-gm-command-surface.js Phase C.
**Notes:** Rejects belt-and-suspenders pre-emptively; if Phase 7 test proves insufficient, escalate via gaps loop.

---

## CHANGELOG BREAKING + release mechanics

### Question 4a: CHANGELOG BREAKING callout shape

| Option | Description | Selected |
|--------|-------------|----------|
| Match v1.1 structure + BREAKING section | Mirror existing `## [1.1.0]` entry layout. One-paragraph upgrade guidance. | ✓ |
| Elevated BREAKING callout at top of entry | Boxed/bolded callout before Summary. | |
| Per-agent before/after migration table | ~15 lines of explicit before/after per agent. | |

**User's choice:** Match v1.1 structure + BREAKING section.
**Notes:** Established project pattern; internal audience needs no visual shouting; `### BREAKING CHANGES` header is prominent enough.

### Question 4b: Release publish mechanism

| Option | Description | Selected |
|--------|-------------|----------|
| Manual `npm publish` (current baseline) | No CI changes; existing granular token with Bypass 2FA. | ✓ |
| Add GitHub Actions OIDC trusted-publishing workflow | `.github/workflows/release.yaml` triggered on tag push. Expands Phase 9 scope. | |
| Manual now + track OIDC as follow-up | Ship manual + log OIDC as new requirement. | |

**User's choice:** Manual `npm publish` (current baseline).
**Notes:** Matches v1.1 flow; low risk; OIDC deferred implicitly (not logged as separate requirement per user's direct selection — but CONTEXT.md's deferred-ideas section notes it as candidate REL-F2).

---

## Claude's Discretion

- Plan decomposition (1 bundled plan vs 2 splits vs 3+ finer splits) — coupled to reviewability; planner picks.
- Exact allowlist contents (D-67 and D-71) — populated post-sweep; entry count and shape are implementation details.
- Allowlist format (JSON/YAML/plain text) — planner aligns with `test/fixtures/` conventions.
- Whether D-75 smoke step is automated (new `verify-published-tarball.js`) or manual.
- `chore(09): bump version to 1.2.0` commit timing.
- v1.2.0 CHANGELOG Changed/Added section depth (milestone-summary vs detailed).
- Whether to stage through `1.2.0-rc.1` before final publish.

## Deferred Ideas

- **OIDC trusted-publishing workflow** — future patch, candidate `REL-F2`.
- **Automated published-tarball smoke script** — pays off only at higher publish cadence.
- **v1.1.0 deprecation** — until/unless post-v1.2 issues emerge.
- **Per-agent before/after migration table in CHANGELOG** — over-engineered for internal audience.
- **v1.1-fixture redundant assertion in Phase C** — Phase 7's `test-legacy-v11-upgrade.js` already covers.
- **Extending orphan-refs gate to archived `.planning/`** — explicitly out of scope per ROADMAP SC#1.
