---
phase: 11-docs-site-content-authoring
plan: 09
subsystem: docs
tags: [docs, zh-cn, translation, upgrade-recovery, starlight, gap-closure]

# Dependency graph
requires:
  - phase: 11-docs-site-content-authoring
    provides: "Plan 11-05 zh-cn architecture explainer that cross-links to ../upgrade-recovery.md (orphan target until this plan landed); Plan 11-07 verification report that documented Gap B and named the preferred fix path."
provides:
  - "docs/zh-cn/upgrade-recovery.md — full Simplified Chinese translation of docs/upgrade-recovery.md"
  - "Restored EN/zh-cn parity across the entire Phase 11 + v1.2-baseline page surface"
  - "Resolved the orphan cross-link from docs/zh-cn/explanation/architecture.md:65 → ../upgrade-recovery.md"
affects: [phase-11-docs-site-content-authoring-11-10-integration-gate, phase-12-release]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "zh-cn page-translation pattern: prose translated, code blocks / paths / commands / JSON / enum literals preserved verbatim per D-14"
    - "EN-first authoring sequence per D-13 honored end-to-end (Plan 01 kept EN baseline; Plan 09 added zh-cn sibling)"

key-files:
  created:
    - "docs/zh-cn/upgrade-recovery.md"
  modified: []

key-decisions:
  - "Followed Plan 11-07's preferred resolution path (option 1: translate) over the alternative (option 2: cross-locale link with translator note) — option 1 preserves the EN+zh-cn parity invariant the rest of Phase 11 establishes."
  - "Mirrored EN section structure exactly: 6 H2 + 3 H3 (the plan's <interfaces> block lists 7 logical sections counting the no-header preamble; only 6 are H2 markdown headings)."
  - "Preserved English directory-tree comments (e.g. '# machine-readable backup manifest', '# remove all April-1st backups') verbatim per the precedent set by Plan 11-05's zh-cn architecture explainer."
  - "Translated 'manifest' as bare English 'manifest' in prose (matches Plan 05 voice: '读取上一次的 manifest', 'manifest 驱动')."
  - "Used 全角 punctuation in prose (，。：——) and ASCII inside code blocks / inline code spans, consistent with Plan 04 install.md and Plan 05 architecture.md."

patterns-established:
  - "Gap-closure deviation handling: when a plan's verification spec is internally inconsistent with its own structural description (here, the 7-vs-6 H2 mismatch), apply Rule 1 — match the EN source as the parity reference rather than the literal grep assertion. Document the discrepancy in the SUMMARY."

requirements-completed: [DOCS-04, DOCS-06]

# Metrics
duration: ~10min
completed: 2026-04-26
---

# Phase 11 Plan 09: docs/zh-cn/upgrade-recovery.md Translation Summary

**zh-cn translation of upgrade-recovery.md restoring full EN/zh-cn parity and resolving the orphan cross-link from the zh-cn architecture explainer (Gap B closed).**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-04-26T12:40:00Z
- **Completed:** 2026-04-26T12:50:22Z
- **Tasks:** 1
- **Files modified:** 1 (1 new file)

## Accomplishments

- Created `docs/zh-cn/upgrade-recovery.md` (107 lines) as a fluent Simplified Chinese translation of `docs/upgrade-recovery.md`, mirroring the EN structure section-for-section.
- Resolved Gap B: the relative link `../upgrade-recovery.md` from `docs/zh-cn/explanation/architecture.md:65` now resolves to a real file in the zh-cn locale.
- Preserved all 10 critical English literals verbatim (`_gomad/_backups`, `metadata.json`, `files-manifest.csv`, `gomad_version`, `manifest_cleanup`, `legacy_v1_cleanup`, `MANIFEST_CORRUPT`, `gomad install`, `rsync -a --exclude=metadata.json`, `rm -rf _gomad/_backups`).
- Translated frontmatter `title:` → `升级恢复` and `description:` → 介绍 manifest 驱动的清理快照如何工作，以及如何从快照中恢复.
- Validator (`node tools/validate-doc-links.js`) no longer flags `docs/zh-cn/explanation/architecture.md` for the upgrade-recovery link. The remaining 4 issues are external https URLs owned by Plan 11-08 (Gap A), out of scope for Plan 11-09.

## Task Commits

1. **Task 1: Translate docs/upgrade-recovery.md → docs/zh-cn/upgrade-recovery.md** — `76eb9f6` (feat)

## Files Created/Modified

- `docs/zh-cn/upgrade-recovery.md` — NEW — Simplified Chinese translation of the EN upgrade-recovery guide. Frontmatter `title:` and `description:` translated. 6 H2 sections + 3 H3 subsections matching EN structure exactly. All code blocks (bash, JSON, directory tree, markdown table), paths, command names, JSON field names, and enum literals preserved verbatim per D-14. Prose translated to Simplified Chinese using the same voice/terminology as Plan 11-04 install.md and Plan 11-05 architecture.md (manifest → bare 'manifest', snapshot → 快照, backup → 备份, installer → 安装器, workspace → 工作区).

## Decisions Made

- **Translate vs. cross-locale link.** Plan 11-07's preferred resolution path (option 1) chosen — full zh-cn parity matches the rest of Phase 11.
- **Section-structure parity.** Mirror EN markdown structure (6 H2 + 3 H3) over the plan's literal "7 H2" assertion. The plan itself listed "(preamble paragraph — no header)" as item 1 in its 7-section breakdown, so only 6 of those 7 are H2 headings. The translation matches the EN markdown structure 1:1.
- **Code-block comments stay English.** Followed Plan 11-05 precedent (e.g. `# machine-readable backup manifest`, `# remove all April-1st backups` left untranslated inside fenced code blocks).
- **Frontmatter `sidebar.order:` omitted.** EN source omits it; mirroring keeps Starlight i18n autogen consistent.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Verification spec bug] Plan asserted 7 H2 in zh-cn but EN source has 6 H2**

- **Found during:** Task 1 verification step.
- **Issue:** Plan acceptance criterion #3 reads `[ "$(grep -c '^## ' docs/zh-cn/upgrade-recovery.md)" = "7" ]`, but the EN source `docs/upgrade-recovery.md` has exactly 6 `## ` headings (the preamble paragraph has no header). Translating section-for-section produces 6 H2 in zh-cn — matching EN parity. Asserting 7 would force inserting an extra H2 not present in EN, breaking parity.
- **Fix:** Translation matches EN markdown structure exactly (6 H2 + 3 H3). The plan's `<interfaces>` block confirms this implicitly by labeling the preamble as item 1 in a "7-section" breakdown where only items 2-7 are H2. The grep assertion is the spec error, not the file.
- **Verification used:** Parity-check `grep -c '^## ' docs/upgrade-recovery.md` (= 6) == `grep -c '^## ' docs/zh-cn/upgrade-recovery.md` (= 6). H3 parity: 3 == 3. All 10 critical literals present. CJK density = 33 lines (>20 threshold; perl recipe in plan needed `-CSD` flag for UTF-8 input — content is correct). Validator no longer flags the architecture-page link.
- **Committed in:** 76eb9f6 (Task 1 commit; the file itself is correct — only the verification recipe in the plan was off).

---

**Total deviations:** 1 auto-fixed (Rule 1 — plan verification spec inconsistent with own EN source).
**Impact on plan:** Translation correctness preserved. EN/zh-cn parity is the operative invariant; the plan's `<interfaces>` description and the EN source agree (6 H2). Recommend the verifier (Plan 11-10) cross-check parity against EN rather than the literal `= 7` grep assertion.

## Issues Encountered

- None during translation work itself. The single deviation (above) was a verification-spec inconsistency, not a content issue.

## User Setup Required

None — pure docs translation. No external service configuration, no environment variables, no CLI commands for the user to run.

## Next Phase Readiness

- Plan 11-10 (Wave 6 integration gate) is unblocked for the upgrade-recovery dimension. When 11-10 runs:
  - `node tools/validate-doc-links.js` should report only the 4 external https URLs that Plan 11-08 closes (no internal/relative-link failures from upgrade-recovery).
  - `npm run docs:build` should pick up `docs/zh-cn/upgrade-recovery.md` automatically via Starlight i18n routing (`/zh-cn/upgrade-recovery/`).
- Gap B (zh-cn cross-link orphan) closed. Gap A (4 https URLs) remains owned by Plan 11-08 (parallel sibling in Wave 5).
- No blockers for Phase 12 release coordination.

## Self-Check: PASSED

- File exists: `docs/zh-cn/upgrade-recovery.md` — FOUND
- Commit exists: `76eb9f6` — FOUND in `git log --oneline`
- Cross-link target file resolves the orphan: confirmed (`docs/zh-cn/explanation/architecture.md:65` → `../upgrade-recovery.md` → `docs/zh-cn/upgrade-recovery.md` ✓)
- Validator flag for upgrade-recovery cleared: confirmed (`grep -B1 'upgrade-recovery'` against validator output returns no matches)
- EN/zh-cn structural parity: confirmed (6 H2 + 3 H3 in both)
- All 10 critical English literals preserved: confirmed
- CJK density: 33 lines (>20 threshold)
- No body horizontal rules: confirmed
- No H4 headers: confirmed

---
*Phase: 11-docs-site-content-authoring*
*Completed: 2026-04-26*
