---
phase: 11-docs-site-content-authoring
plan: 01
subsystem: docs
tags: [docs, starlight, astro, cleanup, bmad-fork, llms-txt, build-pipeline]

# Dependency graph
requires:
  - phase: 09-v1.2-release
    provides: shipped @xgent-ai/gomad@1.2.0 with v1.2 install layout (<installRoot>/gomad/agents/) — establishes the npm baseline that Phase 11 docs intentionally diverge from under branch isolation
provides:
  - Empty docs/{tutorials,how-to,explanation,reference}/ trees ready for Wave 3 authoring (plans 03-06)
  - Empty docs/zh-cn/{tutorials,how-to,explanation,reference}/ mirrors
  - v1.3 gomad landing page at docs/index.md (and zh-cn mirror) with 5 ## sections, forward-links to 6 Wave 3 pages, live-roadmap pointer
  - Sidebar config (website/astro.config.mjs) with no slug:'roadmap' entry
  - tools/build-docs.mjs LLM_EXCLUDE_PATTERNS scrubbed of stale BMAD entries
  - PHASE-NOTE.md flagging Phase 12 must merge this branch alongside npm publish 1.3.0
affects: [11-02, 11-03, 11-04, 11-05, 11-06, 11-07, 12-agent-relocation-and-release]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Branch isolation via D-11: feature branch docs do NOT auto-deploy; .github/workflows/docs.yaml gates on push to main only"
    - "Cleanup separated from authoring: deletion + landing rewrite + sidebar config in one plan, content authoring in plans 03-06; lets Wave 4 plan 11-07 own the link-check gate"
    - "Landing page forward-links to future Wave 3 pages; link-check intentionally deferred to Wave 4 integration plan"

key-files:
  created:
    - .planning/phases/11-docs-site-content-authoring/PHASE-NOTE.md
  modified:
    - docs/index.md
    - docs/zh-cn/index.md
    - website/astro.config.mjs
    - tools/build-docs.mjs

key-decisions:
  - "DELETE roadmap.mdx (and zh-cn mirror) rather than rewrite as a pointer page — the live ROADMAP.md is one click away on GitHub and a single-pointer page adds maintenance burden for negligible audience value (D-03 / RESEARCH.md Open Question 1)"
  - "Add a 5th ## Credits section to docs/index.md to satisfy the plan's 5-## acceptance criterion AND preserve the legal/attribution posture central to the BMAD fork (PROJECT.md license + non-affiliation policy)"
  - "Use canonical phase-branch name 'gsd/phase-11-docs-site-content-authoring' in PHASE-NOTE.md rather than the ephemeral worktree branch name — the note is consumed by Phase 12, by which time the merged branch identity matters, not the worktree identity"
  - "Drop stale 'bmgd/' branch in getLlmSortKey() in addition to the LLM_EXCLUDE_PATTERNS scrub — Rule 1 bug fix; without removal the Task 3 audit grep self-fails on the leftover string and gomad has no game-dev module so the code path is dead"

patterns-established:
  - "Cleanup-before-authoring: a Wave 1 plan deletes legacy content and rewrites the landing page in the same commit-set, so the working tree is internally consistent at every commit boundary even though forward links don't yet resolve"
  - "Cross-phase coordination via PHASE-NOTE.md: a single artifact per phase that flags merge/sequence requirements for downstream phases, consumed at planning time by the next phase's planner"

requirements-completed: [DOCS-01, DOCS-02, DOCS-03, DOCS-04, DOCS-05, DOCS-06]

# Metrics
duration: ~10min
completed: 2026-04-26
---

# Phase 11 Plan 01: Docs Cleanup + v1.3 Landing Page Summary

**Deleted 53 BMAD-era doc pages plus 2 roadmap.mdx files, rewrote docs/index.md (+ zh-cn mirror) as the v1.3 gomad landing page with forward-links to Wave 3 pages, removed slug:'roadmap' sidebar entry, scrubbed stale BMAD entries from tools/build-docs.mjs LLM_EXCLUDE_PATTERNS + getLlmSortKey, and added PHASE-NOTE.md flagging Phase 12 merge coordination**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-04-26T09:39:16Z
- **Completed:** 2026-04-26T09:49:00Z (approx)
- **Tasks:** 3
- **Files modified:** 4 (rewrites + edits)
- **Files deleted:** 55 (53 BMAD-era + 2 roadmap.mdx)
- **Files created:** 1 (PHASE-NOTE.md)

## Accomplishments

- All 53 BMAD-era files under `docs/{tutorials,how-to,explanation,reference}/` and zh-cn siblings deleted as proper git operations.
- `docs/roadmap.mdx` and `docs/zh-cn/roadmap.mdx` deleted; `slug: 'roadmap'` sidebar entry removed from `website/astro.config.mjs` so Starlight does not warn about a missing slug.
- `docs/index.md` rewritten as a v1.3 gomad landing page with 5 `##` sections (What is GoMad?, Get started, Browse the docs, Project status, Credits), forward-linking to `tutorials/install.md`, `tutorials/quick-start.md`, `reference/agents.md`, `reference/skills.md`, `explanation/architecture.md`, `how-to/contributing.md`. `docs/zh-cn/index.md` mirrors the structure with translated headers and prose.
- `tools/build-docs.mjs` `LLM_EXCLUDE_PATTERNS` scrubbed of `'v4-to-v6-upgrade'`, `'explanation/game-dev/'`, `'bmgd/'`. Forward-looking entries (`'changelog'`, `'ide-info/'`, `'faq'`, `'reference/glossary/'`) preserved. `node --check tools/build-docs.mjs` exits 0.
- `PHASE-NOTE.md` flags Phase 12 must schedule the merge of this branch alongside `npm publish @xgent-ai/gomad@1.3.0` (REL-03) so live docs at `gomad.xgent.ai` reflect v1.3 paths simultaneously with the npm release.
- KEEP files preserved: `_STYLE_GUIDE.md`, `404.md`, `upgrade-recovery.md` (and zh-cn siblings).

## Task Commits

Each task was committed atomically:

1. **Task 1: Delete 53 inherited BMAD-era pages and remove roadmap sidebar entry** — `bfaf0ff` (chore)
2. **Task 2: Rewrite docs/index.md and docs/zh-cn/index.md as the gomad landing page** — `863673d` (feat)
3. **Task 3: Scrub stale LLM_EXCLUDE_PATTERNS in tools/build-docs.mjs and write PHASE-NOTE.md** — `9662aec` (chore)

## Files Created/Modified

- `docs/index.md` — Rewritten as v1.3 gomad landing page (no BMAD body content; legal attribution via Credits section).
- `docs/zh-cn/index.md` — zh-cn mirror with translated headers and prose; code blocks, file paths, npm package names stay in English per D-13.
- `website/astro.config.mjs` — `slug: 'roadmap'` sidebar block removed; autogenerate entries for `tutorials`/`how-to`/`reference`/`explanation` retained for Plans 03-06 to populate.
- `tools/build-docs.mjs` — `LLM_EXCLUDE_PATTERNS` scrubbed of 3 stale BMAD entries; `getLlmSortKey()` `bmgd/` branch removed (Rule 1 fix; see Deviations).
- `.planning/phases/11-docs-site-content-authoring/PHASE-NOTE.md` — New cross-phase coordination artifact for Phase 12 release planner.
- 53 BMAD-era `.md` files + 2 `roadmap.mdx` files deleted (full list in `git log -p bfaf0ff`).

## Decisions Made

- **Roadmap: DELETE rather than rewrite as pointer page** — D-03 left the choice to the planner; live `.planning/ROADMAP.md` is one click on GitHub, pointer page = maintenance burden.
- **Add `## Credits` section as 5th `##` header** — plan's acceptance criteria required `grep -c '^## ' docs/index.md` to output 5, but the action body listed only 4 explicit `##` sections (the hook had no header). Adding `## Credits` resolves the inconsistency AND preserves the legal/attribution posture central to the BMAD fork.
- **PHASE-NOTE.md uses canonical phase-branch name** — `gsd/phase-11-docs-site-content-authoring` instead of the ephemeral worktree branch name. The note is consumed by Phase 12 after this work merges, so the merged branch identity is what matters.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed stale `bmgd/` branch in `getLlmSortKey()` in tools/build-docs.mjs**

- **Found during:** Task 3 verification
- **Issue:** After scrubbing `'bmgd/'` from `LLM_EXCLUDE_PATTERNS`, the verify block ran `! grep -F "'bmgd/'" tools/build-docs.mjs` — and FAILED because line 249 had `if (filePath.startsWith('bmgd/')) return 6;` in the LLM-output sort-key function. This is dead code (gomad has no `bmgd/` directory) and a stale leftover from BMAD's BMM Game Dev module.
- **Fix:** Deleted the line entirely. The numeric sort-key (6) was unique to that branch — no other key shifted, and the default-return-7 catches any unexpected directory.
- **Files modified:** tools/build-docs.mjs
- **Verification:** `! grep -F "'bmgd/'" tools/build-docs.mjs` succeeds; `node --check tools/build-docs.mjs` exits 0.
- **Committed in:** `9662aec` (Task 3 commit)

**2. [Rule 1 - Plan inconsistency] Added 5th `##` section (`## Credits`) to docs/index.md and zh-cn mirror**

- **Found during:** Task 2 verification
- **Issue:** Plan body listed 4 explicit `##` sections (items 2-5: What is GoMad?, Get started, Browse the docs, Project status; item 1 was a no-header hook). But the same plan's acceptance criteria asserted `grep -c '^## ' docs/index.md` outputs `5` and the action body explicitly stated "5 `##` headers total". Internal contradiction.
- **Fix:** Added `## Credits` as the 5th section, mirroring the original BMAD-era index.md's Credits section. This satisfies the count assertion AND preserves the legal/attribution posture central to the BMAD fork (PROJECT.md says "credit preserved legally and ethically").
- **Files modified:** docs/index.md, docs/zh-cn/index.md
- **Verification:** `grep -c '^## ' docs/index.md` outputs 5; same for zh-cn.
- **Committed in:** `863673d` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 bug fix, 1 plan-inconsistency resolution)
**Impact on plan:** Both fixes were necessary for the plan's own acceptance criteria to pass. No scope creep — both stayed inside Plan 01's existing files.

## Issues Encountered

- **Plan-level BMAD pattern grep is too strict for legitimate attribution.** Verify block in Task 3 says `find docs ... | xargs grep -l 'BMAD' | wc -l = 0` — but `docs/index.md` legitimately mentions BMAD in `## What is GoMad?` (the action body explicitly instructs "a lean fork of BMAD Method") and `## Credits` (legal attribution). The intent of the check was clearly "no leftover BMAD-era content pages", not "no use of the BMAD trademark in attribution". Plan-level success criteria 1-6 (which do not include this grep) all pass. Documented as plan-author conflation, not an execution issue.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- **Wave 3 plans (11-03 through 11-06)** can now author content into the empty `docs/{tutorials,how-to,explanation,reference}/` trees and zh-cn mirrors. The landing page already cross-links to all 6 expected page paths.
- **Wave 4 plan 11-07** owns the end-to-end `npm run docs:build` link-check gate — the plan author must run the full pipeline once Plans 03-06 have landed their cross-linked pages, including `tutorials/install.md`, `tutorials/quick-start.md`, `reference/agents.md`, `reference/skills.md`, `explanation/architecture.md`, `how-to/contributing.md`.
- **Phase 12 release planner** must read `.planning/phases/11-docs-site-content-authoring/PHASE-NOTE.md` and schedule the merge of `gsd/phase-11-docs-site-content-authoring` into `main` alongside `npm publish @xgent-ai/gomad@1.3.0` (REL-03) so live docs at `gomad.xgent.ai` reflect v1.3 paths simultaneously with the npm release. DOCS-07 (`tools/validate-doc-paths.js` in Phase 12) is the v1.2-path-leak gate.

## Self-Check

```
File checks:
- docs/index.md: FOUND
- docs/zh-cn/index.md: FOUND
- website/astro.config.mjs: FOUND (slug:'roadmap' removed)
- tools/build-docs.mjs: FOUND (LLM_EXCLUDE_PATTERNS scrubbed; getLlmSortKey bmgd branch removed)
- .planning/phases/11-docs-site-content-authoring/PHASE-NOTE.md: FOUND

Commit checks:
- bfaf0ff: FOUND (Task 1 — delete 53 BMAD pages + roadmap sidebar)
- 863673d: FOUND (Task 2 — rewrite landing pages)
- 9662aec: FOUND (Task 3 — scrub LLM_EXCLUDE_PATTERNS + PHASE-NOTE.md)

Plan-level success criteria 1-6: ALL PASS
```

## Self-Check: PASSED

---
*Phase: 11-docs-site-content-authoring*
*Completed: 2026-04-26*
