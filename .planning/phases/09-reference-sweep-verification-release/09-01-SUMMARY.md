---
phase: 09-reference-sweep-verification-release
plan: 01
subsystem: content-sweep
tags:
  - prose-rewrite
  - csv
  - installer
  - reference-migration
  - gm-agent-command

# Dependency graph
requires:
  - phase: 06-command-surface-scaffold
    provides: "Launcher-form /gm:agent-* slash commands installed at .claude/commands/gm/agent-*.md; agent-manifest.csv emits colon form; parseSkillMd skillMeta.name === dirName contract (dashed filesystem names)"
provides:
  - "All user-visible gm-agent-* references in gm-sprint-agent/workflow.md + gm-epic-demo-story/SKILL.md migrated to /gm:agent-* slash command form (REF-01)"
  - "src/gomad-skills/module-help.csv skill column aligned with user-visible colon form — source and emit now symmetric"
  - "installer.js:mergeModuleHelpCatalogs simplified — dash↔colon transform helpers deleted, 4 call sites rewritten as pass-throughs (D-64)"
  - "Stable post-rewrite grep output for `gm-agent-` across the 4 edited files (seeds Plan 02 orphan-refs allowlist)"
affects:
  - 09-02 (verification sweep)
  - 09-03 (release gate)
  - future-plans-touching-installer-mergeModuleHelpCatalogs
  - future-plans-touching-gm-sprint-agent-workflow
  - future-plans-touching-gm-epic-demo-story

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Content-layer alignment (D-64): source CSVs carry the same user-visible form they emit — no asymmetric transforms at read/write boundary"
    - "Scope-discipline in content sweeps: non-agent skill invokes (frontend-design, gm-create-story, etc.) remain as skills, not migrated"

key-files:
  created: []
  modified:
    - "src/gomad-skills/4-implementation/gm-sprint-agent/workflow.md — 4 agent invoke prose rewrites (pm x2, dev x2)"
    - "src/gomad-skills/4-implementation/gm-epic-demo-story/SKILL.md — line 20 /gm-agent-pm → /gm:agent-pm"
    - "src/gomad-skills/module-help.csv — 5 tech-writer skill-column rows: gm-agent-tech-writer → gm:agent-tech-writer"
    - "tools/installer/core/installer.js — mergeModuleHelpCatalogs simplified (50-line delta: 15+/35-)"

key-decisions:
  - "Preserve line 1138 agentCommand construction verbatim (EDIT 5 invariant): its runtime value is unchanged because userVisibleAgentName is now an alias for agentName"
  - "Do NOT rewrite 'via the Skill tool' for non-agent skill invokes (frontend-design, gm-create-story, gm-dev-story, gm-code-review) — they are genuinely skills, not commands; plan's global grep-count-0 automated check was over-generalized"
  - "Preserve installer.js line 294 legacy comment referencing filesystem paths (src/gomad-skills/*/gm-agent-*/) — these are filesystem directory names, which MUST stay dashed per REF-02"

patterns-established:
  - "Source/emit symmetry for user-visible CSV columns: D-64 eliminates translate-at-boundary helpers when source aligns with emit form"
  - "Agent invoke prose migration: drop '(via the Skill tool)' clause when converting from skill invoke to slash-command invoke — commands are not skills"

requirements-completed:
  - REF-01
  - REF-02
  - REF-04

# Metrics
duration: 24min
completed: 2026-04-23
---

# Phase 9 Plan 1: Prose Sweep + Installer Simplification Summary

**Migrated 5 user-visible `gm-agent-*` prose references to `/gm:agent-*` slash-command form across gm-sprint-agent/workflow.md + gm-epic-demo-story/SKILL.md, aligned module-help.csv source to emit colon form directly, and deleted the installer's dash↔colon transform helpers in mergeModuleHelpCatalogs — preserving all dashed filesystem + frontmatter invariants (REF-02/REF-04).**

## Performance

- **Duration:** 24 min
- **Started:** 2026-04-23T13:22:00Z
- **Completed:** 2026-04-23T13:46:10Z
- **Tasks:** 3 (all auto, no TDD)
- **Files modified:** 4

## Accomplishments

- 4 cross-skill agent invoke rewrites landed in `gm-sprint-agent/workflow.md` (pm x2 at lines 90/176, dev x2 at lines 245/291) — prose now references `/gm:agent-*` slash commands with the `(via the Skill tool)` clause dropped (D-62)
- 1 rewrite in `gm-epic-demo-story/SKILL.md` line 20 (`/gm-agent-pm` → `/gm:agent-pm`) — colon form restored
- 5 CSV row rewrites in `src/gomad-skills/module-help.csv` (lines 6-10, tech-writer skill column: `gm-agent-tech-writer` → `gm:agent-tech-writer`) — header + all 27 non-tech-writer rows untouched
- Installer dash↔colon transform helpers (`toUserVisibleAgentId` / `fromUserVisibleAgentId`) fully deleted in `tools/installer/core/installer.js`
- 4 call-sites in `mergeModuleHelpCatalogs` rewritten to pass-throughs; line 1138 `agentCommand` construction preserved verbatim (EDIT 5)
- 4 `D-64` traceability comments embedded at deletion + rewrite sites
- **All 205 installer tests pass**; `npm run lint` exits 0; `npm run validate:skills` exits 0 (2 pre-existing LOW findings unrelated to this plan)
- Filesystem + frontmatter dashed invariants preserved: 7 `gm-agent-*` dirs intact; 14 `name: gm-agent-*` frontmatter hits across `SKILL.md` + `skill-manifest.yaml`

## Task Commits

1. **Task 1: Rewrite cross-skill invoke prose in gm-sprint-agent + gm-epic-demo-story** — `e02f506` (refactor)
2. **Task 2: Rewrite module-help.csv skill column to colon form for tech-writer rows** — `e86ab38` (refactor)
3. **Task 3: Delete dash↔colon transform helpers in installer.js and rewrite call sites to pass-throughs** — `f26bdaf` (refactor)

**Plan metadata:** (final commit by orchestrator post-merge)

## Files Created/Modified

- `src/gomad-skills/4-implementation/gm-sprint-agent/workflow.md` — 4 prose rewrites: `gm-agent-pm` (skill tool invoke) × 2 + `gm-agent-dev` (skill tool invoke) × 2 → `/gm:agent-*` slash-command form (8 lines changed, 4+/4-)
- `src/gomad-skills/4-implementation/gm-epic-demo-story/SKILL.md` — 1 prose rewrite: line 20 `/gm-agent-pm` → `/gm:agent-pm` (2 lines changed, 1+/1-)
- `src/gomad-skills/module-help.csv` — 5 CSV row rewrites in skill column for tech-writer entries (10 lines changed, 5+/5-)
- `tools/installer/core/installer.js` — helper deletion + 4 call-site pass-through rewrites in `mergeModuleHelpCatalogs` (50 lines changed, 15+/35-)

**Total diff:** 25 insertions, 45 deletions across 4 files.

## Helper-Deletion Pre/Post Snapshot

**Pre-edit (from initial read at line 1097-1112):**

```javascript
const toUserVisibleAgentId = (id) => {
  if (!id) return '';
  const s = String(id);
  return s.startsWith('gm-agent-') ? `gm:agent-${s.slice('gm-agent-'.length)}` : s;
};
const fromUserVisibleAgentId = (id) => {
  if (!id) return '';
  const s = String(id);
  return s.startsWith('gm:agent-') ? `gm-agent-${s.slice('gm:agent-'.length)}` : s;
};
```

**Post-edit grep proof of absence:**

```
$ grep -c 'toUserVisibleAgentId' tools/installer/core/installer.js
0
$ grep -c 'fromUserVisibleAgentId' tools/installer/core/installer.js
0
```

**D-64 comment now at deletion site:**

```javascript
// Phase 09 (D-64): source module-help.csv and agent-manifest.csv now both
// carry user-visible colon form (`gm:agent-*`) directly, so no
// dash↔colon transform is needed at lookup or emit time.
```

## Post-Rewrite Grep Output (seeds Plan 02 Allowlist)

`grep -rn 'gm-agent-' src/gomad-skills/4-implementation/gm-sprint-agent/workflow.md src/gomad-skills/4-implementation/gm-epic-demo-story/SKILL.md src/gomad-skills/module-help.csv tools/installer/core/installer.js` returns exactly:

```
tools/installer/core/installer.js:294:        // Phase 6 (D-14/D-15): extract 7 agent personas from src/gomad-skills/*/gm-agent-*/
```

This single remaining hit is a filesystem-path reference (`src/gomad-skills/*/gm-agent-*/`) embedded in a legacy Phase 6 traceability comment. It refers to directory names which invariantly stay dashed per REF-02 (Windows-safe filesystem names). Per the plan's verification note, such "legacy-cleanup comment referring to filesystem paths" references are explicitly allowed. **Plan 02's orphan-refs allowlist should seed this line as an accepted residual.**

## Decisions Made

- **Non-agent skill invokes preserved as "skill" references.** Task 1's automated verification specified `grep -c "via the Skill tool" = 0`, but the plan's action block explicitly enumerates only 4 agent-invoke line rewrites (lines 90, 176, 245, 291). The remaining 6 `via the Skill tool` occurrences invoke legitimate skills (`frontend-design`, `gm-create-story`, `gm-dev-story`, `gm-code-review`) — these are not agents. D-62 mandates "commands != skills", so non-agent skill invokes MUST keep the skill invocation wording. The plan's `grep -c = 0` automated check was over-generalized relative to its action spec; I followed the action spec (4 targeted rewrites) per plan-intent reading.
- **Line 1138 `agentCommand` preserved verbatim** per EDIT 5. After EDIT 3 rewrites `userVisibleAgentName` to be `internalAgentName` (which is `agentName`), line 1138's runtime value is unchanged — it still interpolates the colon-form agent name into the command string.
- **D-64 comments scattered at all 4 edit sites** (helper-deletion site + 3 call-site rewrites) for `git blame` traceability.

## Deviations from Plan

### Interpretive Reconciliation (not a deviation — plan-spec ambiguity resolved in favor of action block)

**1. [Plan ambiguity — action vs. verify mismatch] `grep -c "via the Skill tool" = 0` automated check**
- **Found during:** Task 1 verification
- **Issue:** Plan's Task 1 action block specifies 4 targeted line rewrites (lines 90, 176, 245, 291) — only agent invokes, not all skill invokes. Plan's automated verification specifies `grep -c "via the Skill tool" = 0` across the whole file, which would require rewriting 6 non-agent skill invokes too (`frontend-design`, `gm-create-story`, `gm-dev-story`, `gm-code-review`).
- **Resolution:** Followed action block spec (4 targeted rewrites). Non-agent skill invokes left intact because (a) they are genuinely skills, not commands (D-62); (b) plan's `<source_filesystem_asymmetry>` context scopes REF-01 to "user-visible `gm-agent-*` prose"; (c) changing non-agent invokes would violate plan's "content-sweep scope = gm-agent-* only" intent. Documented here so Plan 02's verifier doesn't flag the 6 residual `via the Skill tool` occurrences as orphan work.
- **Files affected:** `src/gomad-skills/4-implementation/gm-sprint-agent/workflow.md` — 6 non-agent skill invoke lines (100, 104, 255, 258, 294, 299) preserved
- **Committed in:** n/a (nothing changed for those lines)

---

**Total deviations:** 1 interpretive reconciliation (no auto-fix, no scope creep). All explicit plan actions landed exactly as specified.
**Impact on plan:** Zero. Plan 02's allowlist seed is cleaner (1 hit, the legacy installer.js comment) than it would be had we over-migrated non-agent skill invokes.

## Issues Encountered

- None. All 3 tasks completed on first attempt. No build/lint/test failures.

## User Setup Required

None — no external service configuration required.

## Self-Check: PASSED

**Files verified present:**
- FOUND: `src/gomad-skills/4-implementation/gm-sprint-agent/workflow.md` (modified, commit e02f506)
- FOUND: `src/gomad-skills/4-implementation/gm-epic-demo-story/SKILL.md` (modified, commit e02f506)
- FOUND: `src/gomad-skills/module-help.csv` (modified, commit e86ab38)
- FOUND: `tools/installer/core/installer.js` (modified, commit f26bdaf)

**Commits verified in `git log --oneline`:**
- FOUND: e02f506 (Task 1)
- FOUND: e86ab38 (Task 2)
- FOUND: f26bdaf (Task 3)

**Global invariants verified post-plan:**
- 7 agent dirs dashed (REF-02 preserved)
- 14 `name: gm-agent-*` frontmatter hits (REF-04 preserved)
- `npm run lint` exits 0
- `npm run test:install` exits 0 (205 tests pass)
- `npm run validate:skills` exits 0 (only 2 pre-existing LOW findings unrelated to this plan)
- `node -e "require('./tools/installer/core/installer.js')"` exits 0 (no syntax errors)

## Next Phase Readiness

- **Plan 02 (verification sweep)** can now bootstrap its orphan-refs allowlist against a stable post-rewrite grep output: 1 expected residual (`tools/installer/core/installer.js:294` filesystem-path comment) + 6 non-agent `via the Skill tool` residuals in `gm-sprint-agent/workflow.md` (documented above as intentional scope).
- **Plan 03 (release gate)** has a clean installer.js with no dead helpers; `mergeModuleHelpCatalogs` is now symmetric (source = emit for colon form).
- **No blockers** for Plan 02/03.

---
*Phase: 09-reference-sweep-verification-release*
*Completed: 2026-04-23*
