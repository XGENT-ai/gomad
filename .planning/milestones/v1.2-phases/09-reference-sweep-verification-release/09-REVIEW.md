---
phase: 09-reference-sweep-verification-release
reviewed: 2026-04-24
depth: standard
status: clean
files_reviewed: 12
findings:
  critical: 0
  warning: 0
  info: 4
  total: 4
---

# Phase 09: Code Review Report

**Reviewed:** 2026-04-24
**Depth:** standard
**Files Reviewed:** 12
**Status:** clean

## Summary

Phase 09 (v1.2.0 release phase) is in solid shape. The code and artifact changes are narrow, well-traced to plan decisions (D-64, D-67, D-69, D-71, D-73, D-75), and the three verification gates actually bite on the regressions they claim to catch. All files reviewed meet quality standards. No critical or warning-level issues found. Four info-level observations follow.

**Files reviewed:**

- `src/gomad-skills/4-implementation/gm-sprint-agent/workflow.md`
- `src/gomad-skills/4-implementation/gm-epic-demo-story/SKILL.md`
- `src/gomad-skills/module-help.csv`
- `tools/installer/core/installer.js` (D-64 delta region only — ~1080-1225)
- `test/test-orphan-refs.js`
- `test/fixtures/orphan-refs/allowlist.json`
- `tools/fixtures/tarball-grep-allowlist.json`
- `test/test-gm-command-surface.js`
- `tools/verify-tarball.js`
- `package.json`
- `CHANGELOG.md`
- `docs/upgrade-recovery.md`

**Positives validated against phase invariants:**

- All 14 source-tree SKILL.md / skill-manifest.yaml files under `src/gomad-skills/*/gm-agent-*/` keep dashed `name:` frontmatter (REF-02/REF-04 invariant holds).
- `toUserVisibleAgentId` / `fromUserVisibleAgentId` helpers removed from `installer.js`; `mergeModuleHelpCatalogs` now treats both source module-help.csv and agent-manifest.csv as canonical colon form (D-64 — verified against git diff and migrated source rows 6-10 of `src/gomad-skills/module-help.csv`).
- `src/core-skills/module-help.csv` contains no `gm-agent-*` / `gm:agent-*` tokens, so the D-64 pass-through cannot silently orphan lookups.
- `test/test-orphan-refs.js` grep scope excludes `.claude/` (gitignored), `.planning/`, `node_modules/`, `old-milestone-*`, `dist/`, `coverage/` — matches the phase context requirement.
- Live run: orphan-refs gate reports 177/177 allowlisted; tarball verification passes Phase 1/2/3 with 327 files.
- `test-gm-command-surface.js` Phase C hard-asserts all 7 launcher stubs by enumerating `EXPECTED_AGENTS` explicitly (not `globSync`), so a silent 1-of-7 regression would fail the gate.
- Phase C also negatively asserts no legacy `.claude/skills/gm-agent-<shortName>/` dirs are produced by a fresh install (D-69, REL-03 invariant).
- `test-orphan-refs.js` Phase B negative-fixture self-test uses a LOCAL pass/fail counter so the deliberately-bad fixture does not pollute the global tally — subtle but correctly implemented.
- Version bump (`1.1.1` → `1.2.0`) in `c29eef4` is isolated to a single-line change in `package.json`; no other fields or files touched (D-75 step 2 satisfied).
- CHANGELOG `[1.2.0]` entry contains Summary / Added / Changed / Removed / BREAKING CHANGES sections, keeps both before-form (`gm-agent-*`, `.claude/skills/gm-agent-*/`, "pre-v1.2 dash-form") and after-form (`/gm:agent-*`, `.claude/commands/gm/agent-*.md`) tokens as required for the upgrade diff (warning #7 invariant, D-73), and prepends correctly above the `[1.1.0]` entry.
- `docs/upgrade-recovery.md` has the Astro frontmatter (`title` + `description` at lines 1-4) required by `npm run quality` → `docs:build` (Phase 7 defect fix confirmed).
- Tarball `checkGmAgentGrepClean` allowlist is narrow (19 entries): 14 persona source files (SKILL.md + skill-manifest.yaml for each of the 7 agents) plus 5 shipped installer modules that legitimately reference `gm-agent-*` filesystem paths. Every entry in both allowlists carries a machine-readable `reason` string. No overly broad entries.

## Info Findings

### IN-01: `EXPECTED_AGENTS` and `LEGACY_AGENTS` are duplicate constants

**File:** `test/test-gm-command-surface.js:217,244`

**Issue:** The two arrays are byte-identical (`['analyst', 'tech-writer', 'pm', 'ux-designer', 'architect', 'sm', 'dev']`) but declared separately under different names, inside the same `try` block in Phase C. Any future change to the agent roster must be applied to both or the positive and negative assertions will drift apart.

**Fix:** Collapse to a single module-level constant (both lists have the same semantic intent — "the 7 agents"). Example: `const ALL_AGENTS = [...]` used by both the positive enumeration loop (lines 218-241) and the legacy-absence loop (lines 245-248). Purely a maintainability improvement — no behavior change.

### IN-02: Whole-file allowlisting weakens future drift detection for 7 allowlisted files

**File:** `test/fixtures/orphan-refs/allowlist.json` (entries at `tools/installer/ide/shared/agent-command-generator.js`, `test/test-orphan-refs.js`, `test/fixtures/orphan-refs/allowlist.json`, `tools/verify-tarball.js`, `tools/fixtures/tarball-grep-allowlist.json`, `test/test-gm-command-surface.js`, `CHANGELOG.md`)

**Issue:** These 7 entries omit `lineContainsPattern`, so any future unrelated `gm-agent-*` insertion into these files will pass silently. For the 5 test-infrastructure files and CHANGELOG this is reasonable (their legitimate references are by design), but `tools/installer/ide/shared/agent-command-generator.js` is shipped code — a regression there (for example, an accidental `gm-agent-*` in a new user-facing log line) would not be caught.

**Fix:** Consider tightening `tools/installer/ide/shared/agent-command-generator.js` to `lineContainsPattern: "gm-agent-(analyst|tech-writer|pm|ux-designer|architect|sm|dev)"` so only enumerated filesystem-path refs are allowed through. Defer if v1.2 scope is locked — future-hardening, not a present bug.

### IN-03: `tools/verify-tarball.js` Phase 2 `endsWith` filter is slightly loose

**File:** `tools/verify-tarball.js:87`

**Issue:** `!line.endsWith('CHANGELOG.md')` and `!line.endsWith('LICENSE')` match any file path whose suffix is that string, including nested paths. In the current repo this is harmless (no nested CHANGELOG.md files), but the intent appears to be "the top-level CHANGELOG.md only". Pre-existing behavior — not introduced in Phase 09.

**Fix:** Harden to explicit-set membership: `!['LICENSE','CHANGELOG.md',...].includes(line)`. No action required for this release.

### IN-04: Non-agent skill slash-invocations outside REF-01 scope

**File:** `src/gomad-skills/4-implementation/gm-epic-demo-story/SKILL.md:33,82`

**Issue:** These two lines use `/gm-create-story` and `/gm-qa-generate-e2e-tests` slash syntax for non-agent skills. Other workflow files consistently say "invoke via the Skill tool" for non-agent skill invocations. This is a minor stylistic inconsistency, not a correctness issue — REF-01 only scoped the agent-surface migration, so these are intentionally left unchanged in this phase.

**Fix:** No action required for v1.2.0. Consider normalizing in a future pass when deciding a single invocation convention for non-agent skills.

---

**Bottom line:** Phase 09 is release-ready from a code-review perspective. No Critical or Warning findings. The verification gates meaningfully bite on the regressions they advertise (validated by running them live), allowlists are narrow and justified, the D-64 simplification is internally consistent with all source CSVs, and REF-02/REF-04 filesystem/frontmatter invariants are preserved.

_Reviewer: gsd-code-reviewer_
_Depth: standard_
