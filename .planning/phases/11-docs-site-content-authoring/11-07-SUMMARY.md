---
phase: 11-docs-site-content-authoring
plan: 07
subsystem: docs-build-pipeline
tags: [docs, build-pipeline, integration-gate, link-check, gap-detection, astro, llms-txt]

# Dependency graph
requires:
  - phase: 11-docs-site-content-authoring
    provides: "Plan 01 (cleanup + landing rewrite), Plan 02 (injector + pipeline patch), Plan 03/04/05/06 (reference + tutorials + architecture + contributing pages, EN + zh-cn)"
provides:
  - "Wave 4 integration record — `npm run docs:build` exit code, stage-by-stage status, gap surface"
  - "Gap surface for follow-up gap-closure plan: 5 link-check failures across 3 source files traceable to Plan 01 (4) and Plan 05 (1)"
affects: [11-08-or-gap-closure-plan, phase-12-release-mechanics]

# Tech tracking
tech-stack:
  added: []  # Integration-only plan; no new tooling.
  patterns:
    - "Wave-level integration gate that surfaces gaps without inline-fixing — preserves planner authority over authoring plans (Threat T-11-07-02 mitigation enacted)"
    - "Pre-flight file-existence check passed for all 14 Wave 1-3 page targets before invoking npm run docs:build"

key-files:
  created:
    - .planning/phases/11-docs-site-content-authoring/11-07-SUMMARY.md
  modified: []  # No file modifications outside the SUMMARY artifact.

key-decisions:
  - "Surface integration failure as gap (per plan action + Threat T-11-07-02) — did NOT inline-fix offending links; deviation rules 1-3 deliberately not applied because plan explicitly forbids modifications under docs/, tools/, website/, package.json"
  - "All 14 Wave 1-3 page targets verified present in pre-flight check before npm run docs:build invoked — failure is downstream of authoring presence, surfaced inside Plan 01 / Plan 05 cross-link content"
  - "Working tree confirmed unchanged after failed build (git status clean) — Threat T-11-07-02 acceptance criterion 'no new files written under docs/ tools/ website/ package.json' is satisfied"

patterns-established:
  - "Integration-gate failure protocol: capture stage that failed + offending paths + plan ownership in SUMMARY; do NOT patch authoring plans inline; route via /gsd-plan-phase --gaps"
  - "Pre-flight assertion before docs:build prevents late-bound link-check noise from masking missing-page issues"

requirements-completed: []  # DOCS-01..06 NOT verified end-to-end — link-check stage fails. Integration gate is OPEN until gap-closure plan lands.

# Metrics
duration: 2min
completed: 2026-04-26
---

# Phase 11 Plan 07: Full docs:build Integration Gate Summary

**Wave 4 integration gate executed: pre-flight clean (14/14 page targets), injector stage green (8/28/11 catalog), but link-check stage FAILED with 5 broken-link issues across 3 source files — failure surfaced as gap per plan action; no inline fixes applied.**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-04-26T10:09:25Z
- **Completed:** 2026-04-26T10:11:38Z
- **Tasks:** 1 (autonomous, no checkpoints; integration result is FAILURE-SURFACED rather than GREEN)
- **Files created:** 1 (this SUMMARY)
- **Files modified:** 0 (no docs/, tools/, website/, package.json changes — by plan design)

## Integration Gate Result

**`npm run docs:build` exit code: 1** (link-check stage failed; pipeline aborted before cleanBuildDirectory / generateArtifacts / buildAstroSite).

### Stage-by-stage outcome

| # | Stage                                  | Outcome  | Notes                                                                                |
|---|----------------------------------------|----------|--------------------------------------------------------------------------------------|
| 1 | Platform check + banner                | OK       | Project root + build directory printed                                               |
| 2 | Inject auto-generated reference tables | OK       | Catalog: personas=8 task-skills=28 core-skills=11 pages-written=0 pages-skipped=0 (idempotent — no diff vs current state) |
| 3 | Check documentation links              | **FAIL** | 17 markdown files scanned, 3 files with issues, 5 total manual-check issues. Pipeline aborted with `✗ Link check failed - fix broken links before building` |
| 4 | Clean build directory                  | NOT RUN  | (downstream of stage 3 abort)                                                        |
| 5 | Generate LLM artifacts                 | NOT RUN  | (downstream of stage 3 abort) — `llms.txt` + `llms-full.txt` not emitted             |
| 6 | Build Astro site                       | NOT RUN  | (downstream of stage 3 abort) — `build/site/index.html` not emitted                  |

`build/` directory was never created. No artifact sizes available because stages 5–6 did not run.

### Pre-flight check: PASSED

All 14 Wave 1-3 page targets verified present before `npm run docs:build` was invoked:

- Plan 01: `docs/index.md`, `docs/zh-cn/index.md`
- Plan 03: `docs/reference/agents.md`, `docs/reference/skills.md`, `docs/zh-cn/reference/agents.md`, `docs/zh-cn/reference/skills.md`
- Plan 04: `docs/tutorials/install.md`, `docs/tutorials/quick-start.md`, `docs/zh-cn/tutorials/install.md`, `docs/zh-cn/tutorials/quick-start.md`
- Plan 05: `docs/explanation/architecture.md`, `docs/zh-cn/explanation/architecture.md`
- Plan 06: `docs/how-to/contributing.md`, `docs/zh-cn/how-to/contributing.md`

Wave 1 cleanup intact: `find docs/{tutorials,how-to,reference,explanation} -maxdepth 1 -name '*.md'` returns exactly the 6 known files (no BMAD-era pages came back).

Plan 02 pipeline patch intact: `injectReferenceTables()` at line 68 of `tools/build-docs.mjs` runs before `checkDocLinks()` at line 71.

## Gap Surface (for follow-up gap-closure plan)

Five link-check failures across three source files. Categorized by ownership:

### Gap A — Plan 01 owns (`docs/index.md` + `docs/zh-cn/index.md`)

`tools/validate-doc-links.js` `LINK_REGEX` (line 27) matches any link ending in `.md`, including external HTTPS URLs. The validator then attempts to resolve the URL as a local file path and fails with `[MANUAL] File not found anywhere`. Four occurrences:

| File                      | Line | Offending href                                                                |
|---------------------------|------|-------------------------------------------------------------------------------|
| `docs/index.md`           | 37   | `https://github.com/xgent-ai/gomad/blob/main/.planning/ROADMAP.md`            |
| `docs/index.md`           | 42   | `https://github.com/xgent-ai/gomad/blob/main/README.md`                       |
| `docs/zh-cn/index.md`     | 37   | `https://github.com/xgent-ai/gomad/blob/main/.planning/ROADMAP.md`            |
| `docs/zh-cn/index.md`     | 42   | `https://github.com/xgent-ai/gomad/blob/main/README.md`                       |

Both files are owned by Plan 01 (commit `863673d` — "feat(11-01): rewrite docs/index.md and zh-cn mirror as v1.3 gomad landing page"). The `https://github.com/.../LICENSE` link on line 42 of each file is NOT flagged because it doesn't end in `.md`, so the regex doesn't catch it — confirming the regex-vs-`.md`-suffix is the trigger.

**Two valid gap-closure paths:**
1. **Tooling fix (preferred — addresses class of issue):** Patch `tools/validate-doc-links.js` to skip links with a URL scheme (`https://`, `http://`, `mailto:`, etc.) before resolution. One-line guard at the top of the per-link loop. Plan 02 already established the link-validator as authoritative; teaching it to skip absolute URLs is a clean tooling improvement.
2. **Content fix (narrower):** Edit Plan 01's two index pages to drop the `.md` suffix from the GitHub URL paths (e.g., link to the GitHub repo path without the trailing `.md`, or use the repo's tree-view URL).

The orchestrator/planner should pick (1) — fixing the tool generalizes for future external `.md` references; the content fix would have to be repeated for every future doc that references repo-hosted markdown.

### Gap B — Plan 05 owns (`docs/zh-cn/explanation/architecture.md`)

Single broken relative link to a Chinese-locale upgrade-recovery page that was never authored:

| File                                          | Line | Offending href             | Resolves to (missing)              |
|-----------------------------------------------|------|----------------------------|-------------------------------------|
| `docs/zh-cn/explanation/architecture.md`      | 65   | `../upgrade-recovery.md`   | `docs/zh-cn/upgrade-recovery.md`    |

The EN counterpart at `docs/explanation/architecture.md` line 65 uses the **same** `../upgrade-recovery.md` relative path — but it resolves cleanly because `docs/upgrade-recovery.md` exists (single EN copy, no zh-cn translation). The zh-cn copy was direct-copied from EN without a corresponding zh-cn upgrade-recovery file.

Owner commit: `7480f32` — "feat(11-05): add architecture explainer (zh-cn) — translated per D-13/D-14".

**Two valid gap-closure paths:**
1. **Translate** `docs/upgrade-recovery.md` → `docs/zh-cn/upgrade-recovery.md` (parallels Plan 01-style EN+zh-cn lockstep).
2. **Cross-locale link** in zh-cn architecture page: change `../upgrade-recovery.md` to `/upgrade-recovery/` (site-relative to the EN page) and add a translator note.

(1) is consistent with Plan 05's stated bilingual translation contract; (2) breaks the EN+zh-cn parity.

### Failure-Surface Pattern Note

Both gaps would have surfaced individually inside Plan 01 / Plan 05 verification IF those plans had been allowed to run `npm run docs:build` — but per the Wave 1-3 sequencing decision (logged in 11-02-SUMMARY: "Wave 2 isolation deliberate: this plan does NOT run npm run docs:build because Plan 01's rewritten docs/index.md links to 6 Wave 3 pages that don't exist yet"), the integration gate is THIS plan. The surfaced gaps are exactly what Wave 4 exists to detect — the threat model T-11-07-04 ("Wave 1-3 plans pass per-plan verify but fail at integration") accepted this risk and wrote Plan 11-07 to catch it.

## Task Commits

1. **Task 1: Run npm run docs:build end-to-end and surface failure as gap** — *(no per-task source-code commit; build run was read-only against `docs/`/`tools/`/`website/`. Integration result is recorded in this SUMMARY artifact only.)*

**Plan metadata:** `<commit-pending>` (`docs(11-07): surface integration-gate failure as gap`)

_Note: Per plan action and Threat T-11-07-02, no docs/ tools/ website/ package.json modifications were made. The single artifact this plan produces is `11-07-SUMMARY.md`._

## Files Created/Modified

- `.planning/phases/11-docs-site-content-authoring/11-07-SUMMARY.md` (NEW) — this file. Records integration-gate execution, stage-by-stage outcome, and gap surface for the follow-up gap-closure plan.

No other files modified. `git status --short docs/ tools/ website/ package.json` returns empty (verified post-build).

## Decisions Made

- **Surfaced as gap, did NOT inline-fix.** Plan action explicitly prohibits modifications under `docs/`, `tools/`, `website/`, `package.json`. Acceptance criterion treats inline fixing as "a planner-level violation" to be surfaced as a gap. Deviation rules 1-3 (auto-fix bug / missing-critical / blocking) were deliberately NOT applied because the plan-level directive supersedes them — the plan is **the** authority on integration-gate scope. This is the textbook Threat T-11-07-02 mitigation in action.
- **Recorded both content-fix and tooling-fix paths for each gap** so the gap-closure planner has explicit options to weigh, rather than a single prescribed remedy.
- **Did NOT attempt a third `npm run docs:build` run** to re-confirm idempotency once link-check fails — the second-run idempotency assertion is structurally moot when the first run aborted before any byte-mutating stage. Once the gap-closure plan lands and the link-check stage passes, the second-run idempotency check should be re-asserted as part of the closure plan's verify block.

## Deviations from Plan

None — plan executed exactly as written. The plan anticipated this exact failure mode (Threat T-11-07-04 disposition `accept`) and mandated the gap-surfacing protocol. Following that protocol IS plan compliance.

## Issues Encountered

- **Integration-gate failure is the integration result, not an exception.** Wave 4 plans of this shape exist precisely to surface gaps that per-plan verify blocks cannot catch (per-plan blocks couldn't run `npm run docs:build` because forward references hadn't yet landed). The "issue" is itself the work product of this plan: a precise diagnostic that the gap-closure planner can act on without re-discovering the failure surface.

## User Setup Required

None — no external service configuration. Gap-closure plan, when authored, will operate inside the same repo with the same tooling.

## Next Phase Readiness

- **Phase 11 NOT closed at the integration-gate level.** DOCS-01..06 page artifacts exist on disk, the injector pipeline is wired correctly, and the per-plan SUMMARYs all show idempotent + verified states for their narrow scopes. But the Wave 4 closure check (full `npm run docs:build` exit 0) FAILED. Phase 11 is technically open until a gap-closure plan lands.
- **Recommended orchestrator route: `/gsd-plan-phase 11 --gaps`** to author a gap-closure plan that:
  - Patches `tools/validate-doc-links.js` to skip URL-scheme links (Gap A — preferred), and
  - Either translates `docs/upgrade-recovery.md` → `docs/zh-cn/upgrade-recovery.md` OR rewrites the zh-cn architecture link to cross-locale (Gap B).
  - Re-runs `npm run docs:build` twice (first for green, second for idempotency under `docs/reference/` + `docs/zh-cn/reference/`).
  - Asserts `build/site/index.html` exists, captures `llms.txt` + `llms-full.txt` sizes.
- **Phase 12 (Agent Relocation + Release) NOT blocked at the planning level.** Phase 12's research flag (STATE.md) and `/gsd-research-phase 12` workflow are independent of this gap. But Phase 11 should close via gap-closure before the v1.3 release tarball verifies cleanly.
- **Manual-only verification items** (page-reads-coherently checks per `11-VALIDATION.md`) remain pending — those run against the deployed site once the build succeeds, so they are downstream of the gap-closure plan.

## Threat Model Compliance

- **T-11-07-01 (DoS — late link-check)** mitigated: pre-flight file-existence check passed cleanly; failure is downstream of file presence, inside content. The actionable diagnostic is precise (file:line:href).
- **T-11-07-02 (Tampering — inline-fix temptation)** mitigated as enacted: zero modifications under `docs/`, `tools/`, `website/`, `package.json`. `git status` clean post-build.
- **T-11-07-03 (Information Disclosure — non-idempotent rebuild)** N/A this run: link-check aborted before the byte-mutating stages, so non-idempotency could not surface; the assertion is deferred to the gap-closure plan.
- **T-11-07-04 (Repudiation — Wave 1-3 pass per-plan but fail at integration)** materialized exactly as accepted in plan; the wave-level gate did its job.

## Self-Check: PASSED

Verified directly:

- `.planning/phases/11-docs-site-content-authoring/11-07-SUMMARY.md` exists — FOUND
- `git status --short docs/ tools/ website/ package.json` returns empty (no protected-path modifications) — FOUND
- All 14 Wave 1-3 page targets present (pre-flight log captured above) — FOUND
- `tools/build-docs.mjs` line 68 (`injectReferenceTables();`) precedes line 71 (`checkDocLinks();`) — FOUND
- `npm run docs:build` exit code captured (`EXIT_CODE=1`) and full stdout/stderr persisted at `/tmp/11-07-build1.log` (60 lines) — FOUND
- All 5 link-check issues traced to specific files + line numbers + ownership commits — FOUND

Self-check is on the integration-gate ARTIFACT (this SUMMARY) and the FAILURE SURFACE, not on the build itself. The build-itself self-check is `exit code 1` — captured truthfully.

---
*Phase: 11-docs-site-content-authoring*
*Completed: 2026-04-26*
*Integration result: FAILURE-SURFACED-AS-GAP (per plan action + Threat T-11-07-02)*
