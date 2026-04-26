---
phase: 11-docs-site-content-authoring
plan: 08
subsystem: docs-tooling
tags: [link-validation, llms-txt, ai-discovery, build-pipeline, gap-closure]

requires:
  - phase: 11-docs-site-content-authoring
    provides: 14 authored Phase 11 docs pages (EN + zh-cn) including 4 GitHub-hosted .md URLs in index pages and a working injectReferenceTables → checkDocLinks pipeline
provides:
  - URL-scheme skip guard in tools/validate-doc-links.js (closes Gap A — 4 https GitHub markdown URL false positives eliminated)
  - Corrected REPO_URL constant in tools/build-docs.mjs (closes WR-02 — points to canonical xgent-ai/gomad org)
  - v1.3-aligned URL list in generateLlmsTxt() (closes WR-01 — six BMAD-era URLs replaced with the six actual Phase 11 docs pages)
affects: [11-09 (zh-cn upgrade-recovery sibling — Gap B), 11-10 (final integration gate runs npm run docs:build end-to-end), 12-release-and-publish (docs:build is part of npm run quality on the release commit)]

tech-stack:
  added: []
  patterns:
    - "URL-scheme skip guard: per-link loop short-circuits absolute URLs (http://, https://, mailto:, tel:, ftp://, ...) BEFORE attempting filesystem resolution — generalizes for any future external `.md` reference (BMAD docs, third-party markdown, etc.) without per-link maintenance"
    - "Tooling-fix-preferred routing for link-validator regressions: when a content pattern is legitimate (external GitHub URLs ending in .md are common), tighten the validator's filtering rather than rewrite content"
    - "AI-facing artifact URL list mirrors the human-facing docs structure: generateLlmsTxt() emits exactly the same six v1.3 pages that docs/index.md links to, ensuring llms.txt and the human site stay in lockstep"

key-files:
  created: []
  modified:
    - tools/validate-doc-links.js
    - tools/build-docs.mjs

key-decisions:
  - "Skip-guard, not regex tightening: LINK_REGEX (line 25) preserved unchanged; the URL-scheme filter is an early-continue guard inside processFile()'s per-link loop, placed alongside STATIC_ASSET_EXTENSIONS / CUSTOM_PAGE_ROUTES skips. Smallest blast radius — does not risk dropping legitimate `./..rel/path.md` matches."
  - "RFC-3986-shaped scheme regex (`^[a-z][a-z0-9+.-]*:\\/\\/`) plus explicit `mailto:` / `tel:` checks: covers http, https, ftp, file, ws, wss, data: with `://` form, plus the two RFC-3986 schemes that don't use `://`. Future schemes are handled automatically."
  - "Bundled the WR-01/WR-02 build-docs.mjs fixes with the validator patch (per 11-VERIFICATION.md recommendation): same pipeline gate (`npm run docs:build`), different files. Without WR-01/WR-02 the AI-facing llms.txt would silently degrade once link-check passes."
  - "REPO_URL derived from package.json:21 (`git+https://github.com/xgent-ai/gomad.git`) — single source of truth for the canonical repo URL across docs, llms.txt headers, and llms-full.txt headers."

patterns-established:
  - "External-URL handling in link validators: skip via URL-scheme regex BEFORE attempting filesystem resolution; the validator's domain is site-internal links only, external URLs are downstream concerns (Astro/Starlight handle render-time sanitization)."
  - "Generated AI artifacts (llms.txt) curated to mirror human-site nav: keep the page list in sync with docs/index.md so AI agents and human readers see the same navigable surface."

requirements-completed: [DOCS-01, DOCS-02, DOCS-03, DOCS-04, DOCS-05, DOCS-06]

duration: 1min
completed: 2026-04-26
---

# Phase 11 Plan 08: Validator URL-Scheme Guard + build-docs.mjs Cleanup Summary

**URL-scheme skip guard added to tools/validate-doc-links.js (closes Gap A — 4 false positives → 0); REPO_URL and generateLlmsTxt URL list corrected in tools/build-docs.mjs (closes review WR-01 + WR-02), unblocking docs:build and aligning the AI-facing llms.txt artifact with the v1.3 docs structure.**

## Performance

- **Duration:** ~1 min (atomic surgical patches; no exploratory work)
- **Started:** 2026-04-26T12:48:00Z (plan kickoff)
- **First commit:** 2026-04-26T12:49:08Z (Task 1)
- **Last commit:** 2026-04-26T12:49:54Z (Task 2)
- **Completed:** 2026-04-26T12:50:06Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- **Gap A closed.** `tools/validate-doc-links.js` now skips any href whose `linkPath` matches a URL scheme (`^[a-z][a-z0-9+.-]*:\/\/`) or starts with `mailto:` / `tel:`. Standalone `node tools/validate-doc-links.js` previously surfaced 5 issues (4 https GitHub `.md` URLs in `docs/index.md` lines 37+42 and `docs/zh-cn/index.md` lines 37+42, plus the Gap B zh-cn upgrade-recovery link); now surfaces 1 issue (Gap B — owned by Plan 11-09).
- **WR-02 closed.** `tools/build-docs.mjs` line 26 `REPO_URL` now points to `https://github.com/xgent-ai/gomad` (was the BMAD-era `gomad-code-org/GOMAD-METHOD` 404 URL). Both `llms.txt` and `llms-full.txt` headers will now embed the correct repo URL.
- **WR-01 closed.** `tools/build-docs.mjs` `generateLlmsTxt()` URL list rewritten to the six actual Phase 11 v1.3 pages (`tutorials/install/`, `tutorials/quick-start/`, `explanation/architecture/`, `reference/agents/`, `reference/skills/`, `how-to/contributing/`). The six BMAD-era URLs (`tutorials/getting-started/`, `how-to/install-gomad/`, `explanation/quick-flow/`, `explanation/party-mode/`, `reference/workflow-map/`, `reference/modules/`) and the `BMM, BMB, BMGD, and more` marketing string are removed.
- **No regressions.** `node --check` passes for both files. `LINK_REGEX` (line 25 of the validator) and `LLM_EXCLUDE_PATTERNS` / `injectReferenceTables` / `checkDocLinks` (build-docs.mjs) all unchanged. Pipeline ordering (`injectReferenceTables` before `checkDocLinks`, line 68 < line 71) preserved.

## Task Commits

Each task was committed atomically:

1. **Task 1: Patch tools/validate-doc-links.js (URL-scheme skip guard, Gap A)** — `5b430ac` (fix)
2. **Task 2: Patch tools/build-docs.mjs (REPO_URL + llms.txt URL list, WR-01 + WR-02)** — `88f9fca` (fix)

_Note: SUMMARY.md commit and STATE.md/ROADMAP.md updates are owned by the orchestrator (parallel-executor scope)._

## Files Created/Modified

### Modified

- `tools/validate-doc-links.js` (+8 lines, ~lines 257-264): Added URL-scheme skip guard inside `processFile()` per-link loop, placed after `CUSTOM_PAGE_ROUTES.has(linkPath)` skip and before `resolveLink(linkPath, filePath)` call. Guard short-circuits with `continue` when `linkPath` matches `/^[a-z][a-z0-9+.-]*:\/\//i` or starts with `mailto:` or `tel:`. Comment block documents intent and rationale. No other functions touched.
- `tools/build-docs.mjs` (+11 lines, -8 lines): Two surgical edits.
  - **Line 26 (WR-02):** `REPO_URL = 'https://github.com/xgent-ai/gomad'` (was `'https://github.com/gomad-code-org/GOMAD-METHOD'`).
  - **Lines 160-176 (WR-01):** `generateLlmsTxt()` URL list block replaced. Now emits four sections (Quick Start, Core Concepts, Reference, Contributing) referencing the six v1.3 docs pages. The opening lines 145-157 (banner, blockquote, Documentation/Repository/Full-docs metadata) and trailing Quick Links section + writeFileSync are unchanged.

## Verification Evidence

### Task 1 Plan-Spec Verify Chain (all PASS)

```
node --check tools/validate-doc-links.js                                                # exit 0
grep -q 'Skip absolute URLs' tools/validate-doc-links.js                                 # match
grep -qE '\^\[a-z\]\[a-z0-9\+\.-\]\*:\\/\\/' tools/validate-doc-links.js                  # match
grep -q "linkPath.startsWith('mailto:')" tools/validate-doc-links.js                     # match
grep -q "linkPath.startsWith('tel:')" tools/validate-doc-links.js                        # match
SKIP_LINE=257  RESOLVE_LINE=266    [ 257 -lt 266 ]                                        # PASS (guard runs before resolveLink)
sed -n '25p' tools/validate-doc-links.js                                                 # LINK_REGEX unchanged
```

### Task 2 Plan-Spec Verify Chain (all PASS)

```
node --check tools/build-docs.mjs                                                         # exit 0
grep -q "const REPO_URL = 'https://github.com/xgent-ai/gomad';" tools/build-docs.mjs      # match
! grep -q 'gomad-code-org' tools/build-docs.mjs                                           # 0 matches
! grep -q 'GOMAD-METHOD' tools/build-docs.mjs                                             # 0 matches
grep -q 'tutorials/install/' tools/build-docs.mjs                                         # match
grep -q 'tutorials/quick-start/' tools/build-docs.mjs                                     # match
grep -q 'explanation/architecture/' tools/build-docs.mjs                                  # match
grep -q 'reference/agents/' tools/build-docs.mjs                                          # match
grep -q 'reference/skills/' tools/build-docs.mjs                                          # match
grep -q 'how-to/contributing/' tools/build-docs.mjs                                       # match
! grep -q 'tutorials/getting-started/' tools/build-docs.mjs                               # 0 matches
! grep -q 'how-to/install-gomad/' tools/build-docs.mjs                                    # 0 matches
! grep -q 'explanation/quick-flow/' tools/build-docs.mjs                                  # 0 matches
! grep -q 'explanation/party-mode/' tools/build-docs.mjs                                  # 0 matches
! grep -q 'reference/workflow-map/' tools/build-docs.mjs                                  # 0 matches
! grep -q 'reference/modules/' tools/build-docs.mjs                                       # 0 matches
! grep -q 'BMM, BMB, BMGD' tools/build-docs.mjs                                           # 0 matches
INJ_LINE=68  CHK_LINE=71    [ 68 -lt 71 ]                                                  # PASS (pipeline ordering intact)
```

### Standalone Validator Run — Before vs After

**Baseline (pre-Task-1):**
```
Files scanned: 17
Files with issues: 3
Total issues: 5
  Breakdown: Auto-fixable: 0  Needs review: 0  Manual check: 5
[MANUAL] index.md           https://github.com/xgent-ai/gomad/blob/main/.planning/ROADMAP.md
[MANUAL] index.md           https://github.com/xgent-ai/gomad/blob/main/README.md
[MANUAL] zh-cn/index.md     https://github.com/xgent-ai/gomad/blob/main/.planning/ROADMAP.md
[MANUAL] zh-cn/index.md     https://github.com/xgent-ai/gomad/blob/main/README.md
[MANUAL] zh-cn/explanation/architecture.md  ../upgrade-recovery.md     ← Gap B (out of scope, Plan 11-09)
EXITCODE=1 (false-positive-driven)
```

**Post-Task-1 (current state):**
```
Files scanned: 17
Files with issues: 1
Total issues: 1
  Breakdown: Auto-fixable: 0  Needs review: 0  Manual check: 1
[MANUAL] zh-cn/explanation/architecture.md  ../upgrade-recovery.md     ← Gap B remains (Plan 11-09 owns)
EXITCODE=1 (legitimate broken link)
```

The 4 GitHub `.md` URL false positives are gone. Only the legitimate Gap B (zh-cn upgrade-recovery) remains, which Plan 11-09 closes. After Plan 11-09 lands, the validator will exit 0 and Plan 11-10's integration gate can run `npm run docs:build` end-to-end.

### Files Modified Outside Plan Scope

```
$ git diff --name-only HEAD~2 HEAD
tools/build-docs.mjs
tools/validate-doc-links.js
```

Confirmed: only the two files this plan owns.

## Decisions Made

1. **Skip-guard placement:** After `CUSTOM_PAGE_ROUTES` skip and before `resolveLink()` call, mirroring the existing `STATIC_ASSET_EXTENSIONS` and `CUSTOM_PAGE_ROUTES` pre-resolution skips. Keeps all "skip-this-class-of-href" decisions co-located in the per-link loop, single point of audit.
2. **`LINK_REGEX` line 25 preserved:** Tightening the regex to exclude `https?://` matches at the start would risk skipping legitimate relative paths (`./..rel/file.md` etc.) due to regex backtracking subtleties. The skip guard is the surgical, low-risk approach. Plan explicitly forbade modifying line 25 (T-11-08-01 mitigation).
3. **`tel:` and `mailto:` explicit checks (in addition to the `://` regex):** Both schemes per RFC 3966 / RFC 6068 use the form `mailto:user@host` and `tel:+1234567890` — single-colon, no `://`. The plain regex would not catch them. Both are common in markdown and would otherwise still fail filesystem resolution. Defensive coverage with negligible cost.
4. **Bundled WR-01 + WR-02 fix in Task 2:** Same file (`tools/build-docs.mjs`), same gate (`npm run docs:build`), different concerns. Bundling avoids two commits to the same file in the same plan and matches the verifier's recommendation in 11-VERIFICATION.md gaps.0.missing[1] (WR-01/WR-02 should land with the gap-closure plan, not deferred).

## Deviations from Plan

None — plan executed exactly as written. Both task `<action>` blocks were applied verbatim:

- Task 1: URL-scheme skip guard inserted at the exact location specified (after `CUSTOM_PAGE_ROUTES.has(linkPath) continue` and before `const targetFile = resolveLink(linkPath, filePath)`). Regex pattern, `mailto:` check, `tel:` check, and surrounding comment block all match the plan's verbatim code block.
- Task 2: `REPO_URL` line replaced 1:1; `generateLlmsTxt()` URL list block replaced with the verbatim block specified in 11-REVIEW.md WR-01 (lines 65-83) and quoted in the plan's `<action>`.

No auto-fix deviations (Rule 1 / Rule 2 / Rule 3) triggered. No architectural-decision checkpoints (Rule 4) reached.

## Issues Encountered

None.

## Threat Flags

None — both files are existing tooling-only files with no new network endpoints, auth paths, or trust-boundary changes. Threat register T-11-08-01 / T-11-08-02 mitigations applied as specified (LINK_REGEX preserved; REPO_URL + llms.txt URLs corrected).

## User Setup Required

None — both fixes are pure tooling patches with no external service / env-var / dashboard configuration.

## Next Phase Readiness

- **Plan 11-09 (Gap B closure)** can run independently of this plan; the two gap-closure plans are file-disjoint (this plan touches `tools/`, Plan 11-09 touches `docs/zh-cn/`).
- **Plan 11-10 (final integration gate)** depends on both 11-08 and 11-09. Once 11-09 lands, `node tools/validate-doc-links.js` will exit 0 and `npm run docs:build` will progress past the link-check stage to `cleanBuildDirectory` → `generateArtifacts` (now emitting correct `llms.txt`) → `buildAstroSite`.
- **Phase 12 (release-and-publish)** unblocked from this plan's perspective — `docs:build` is part of `npm run quality` on the release commit (Phase 12 success criterion 3), and the AI-facing artifacts will now contain canonical URLs.

## Self-Check

Verifying claims made in this SUMMARY before handing off to the orchestrator.

- Created/modified files exist:
  - `tools/validate-doc-links.js` — FOUND (modified)
  - `tools/build-docs.mjs` — FOUND (modified)
- Commits exist:
  - `5b430ac` (Task 1) — FOUND
  - `88f9fca` (Task 2) — FOUND
- Verification commands re-run produce the documented results:
  - `node --check tools/validate-doc-links.js` — exit 0 ✓
  - `node --check tools/build-docs.mjs` — exit 0 ✓
  - `node tools/validate-doc-links.js` — exit 1 with exactly 1 manual-check issue (`zh-cn/explanation/architecture.md` `../upgrade-recovery.md`), 4 GitHub URL issues GONE ✓
  - All grep assertions in Task 1 + Task 2 verify chains — all PASS ✓

## Self-Check: PASSED

---
*Phase: 11-docs-site-content-authoring*
*Plan: 08*
*Completed: 2026-04-26*
