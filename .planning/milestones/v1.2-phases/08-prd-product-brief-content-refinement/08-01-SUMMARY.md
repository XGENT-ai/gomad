---
phase: 08-prd-product-brief-content-refinement
plan: 01
subsystem: prd-content

tags: [gm-create-prd, prd-purpose, coding-agent-mindset, founder-framing-strip]

# Dependency graph
requires:
  - phase: 00-roadmap
    provides: v1.2 Phase 8 SC#1 (step-02b/02c/03/10 explicit strips) + PRD-01/03/06 requirement statements
provides:
  - "Cross-cutting ## Coding-Agent Consumer Mindset section at single source of truth (data/prd-purpose.md)"
  - "step-02b §3 Vision discovery wired to reference the mindset section"
  - "step-02c PRD quality rule reworded to coding-agent consumer vocabulary"
  - "step-03 Success Criteria with Business-Success subsection stripped + vague-metric examples cut + code-behavior framing reset"
  - "step-10 Scalability NFR probes without seasonal/event-based founder framing"
  - "NFR example reworded from 'business hours uptime' to 'system uptime' (cascade into 5 modified files)"
affects: [08-02-scope-discipline-pass, 08-03-gm-product-brief-light-pass, 08-04-integration-test-chain, 08-05-polish-and-banned-phrase-guard, gm-validate-prd-downstream-contract]

# Tech tracking
tech-stack:
  added: []
  patterns: ["Single source of truth for cross-cutting mindset section in data/prd-purpose.md, referenced (not duplicated) from step prompts via 'Read ../data/prd-purpose.md §...' load pattern (mirrors step-11-polish.md:43-45)"]

key-files:
  created: []
  modified:
    - "src/gomad-skills/2-plan-workflows/gm-create-prd/data/prd-purpose.md"
    - "src/gomad-skills/2-plan-workflows/gm-create-prd/steps-c/step-02b-vision.md"
    - "src/gomad-skills/2-plan-workflows/gm-create-prd/steps-c/step-02c-executive-summary.md"
    - "src/gomad-skills/2-plan-workflows/gm-create-prd/steps-c/step-03-success.md"
    - "src/gomad-skills/2-plan-workflows/gm-create-prd/steps-c/step-10-nonfunctional.md"

key-decisions:
  - "Coding-Agent Consumer Mindset lives only in data/prd-purpose.md (D-52); referenced via ../data/prd-purpose.md load pattern rather than inlined in prompt files — prevents drift across steps"
  - "Removing ### 3. Define Business Success from step-03 triggered renumber cascade (4→3, 6→5, 7→6, 8→7) and stale cross-reference repair (section 7 → 6, step 7 → 6) + removal of 'Business success metrics defined' SUCCESS METRICS bullet that no longer applied (Rule 2 auto-fix)"
  - "Banned-phrase sweep acceptance criterion uses case-insensitive acronym matching (ARR/CAC/LTV etc.) — word-boundary-anchored semantic sweep confirms founder framing is gone; substring false positives on 'array' / 'carries' are not regressions"
  - "Pedagogical mentions of banned terms in the new Coding-Agent Consumer Mindset section (prd-purpose.md) are intentional — the prose explicitly names 'why now?', 'investor', 'business-KPI' as examples of what NOT to include; these are not regressions"

patterns-established:
  - "Line-anchored content-signature edits with acceptance greps — every cut verified by exact grep signature not line number (prevents line-number drift between plan and execution state)"
  - "Workflow contract block preservation — MANDATORY EXECUTION RULES, A/P/C menu, SUCCESS METRICS / SYSTEM SUCCESS/FAILURE METRICS rubrics touched zero times across all 4 step files and 1 data file"

requirements-completed:
  - PRD-01
  - PRD-03
  - PRD-06

# Metrics
duration: 4m
completed: 2026-04-22
---

# Phase 8 Plan 01: SC#1 Explicit Step-File Strips + Coding-Agent Consumer Mindset Section Summary

**Stripped human-founder framing from four explicitly targeted PRD step files (step-02b/02c/03/10) and installed the cross-cutting `## Coding-Agent Consumer Mindset` section at its single source-of-truth location in `data/prd-purpose.md` — five markdown files, zero code, zero new deps, downstream skill contracts preserved byte-for-byte.**

## Performance

- **Duration:** 4m (251 seconds)
- **Started:** 2026-04-22T10:05:24Z
- **Completed:** 2026-04-22T10:09:35Z
- **Tasks:** 2 (both auto-mode)
- **Files modified:** 5

## Accomplishments

- Added `## Coding-Agent Consumer Mindset` section to `data/prd-purpose.md` between `## Core Philosophy: Information Density` and `## The Traceability Chain` (D-51/D-52); three-paragraph prose calibrated to `.planning/PROJECT.md` voice (short direct paragraphs, no "in order to" filler, no hedging).
- Reworded NFR example in `data/prd-purpose.md:99` from "99.9% uptime during business hours" to "99.9% system uptime" (D-56 cascade).
- `step-02b-vision.md §3`: dropped the "Why now?" probe and wired §3 to load `../data/prd-purpose.md §## Coding-Agent Consumer Mindset` using the same "Read `../data/prd-purpose.md` …" pattern `step-11-polish.md:43-45` already establishes (D-53).
- `step-02c-executive-summary.md`: "Dual-audience optimized — readable by humans, consumable by LLMs" → "… consumable by coding agents" (D-54).
- `step-03-success.md`: removed `### 3. Define Business Success` (full section), removed the two business-metric examples `"10,000 users"` and `"Good adoption"` from the now-renumbered `### 3. Challenge Vague Metrics`, removed `### Business Success` from the Content Structure code fence, reworded the `## YOUR TASK` line to drop "business success", added a SC#1 framing reset at the top of `## SUCCESS DISCOVERY SEQUENCE:` pointing at the mindset section, cascaded the renumbering (4→3, 6→5, 7→6, 8→7) (D-55).
- `step-10-nonfunctional.md`: stripped the "Are there seasonal or event-based traffic spikes?" probe from `#### Scalability NFRs`; kept the other three scalability probes and all six NFR categories (Performance, Security, Scalability, Accessibility, Integration, Reliability) plus the full compliance NFR references (GDPR, HIPAA, PCI-DSS, WCAG) (D-56).
- All `## MANDATORY EXECUTION RULES`, A/P/C menu blocks, and `## 🚨 SYSTEM SUCCESS/FAILURE METRICS` / `## SUCCESS METRICS` + `## FAILURE MODES` rubric blocks preserved verbatim across every modified file — workflow contract fully intact.
- Downstream skill directories (`gm-validate-prd`, `gm-create-architecture`, `gm-create-epics-and-stories`, `gm-check-implementation-readiness`) untouched — PRD-06 structural-compatibility guard green.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add Coding-Agent Consumer Mindset section to data/prd-purpose.md + reword business-SLA NFR example (D-51, D-52, D-56 cascade)** — `64821b8` (feat)
2. **Task 2: Apply explicit SC#1 strips to step-02b, step-02c, step-03, step-10 (D-53, D-54, D-55, D-56)** — `7a23927` (feat)

## Files Created/Modified

- `src/gomad-skills/2-plan-workflows/gm-create-prd/data/prd-purpose.md` — New `## Coding-Agent Consumer Mindset` H2 section (+13 lines) between Core Philosophy and Traceability Chain; NFR example reworded on line 99 (−1 line). H2 count went from 9 → 10 (exactly +1).
- `src/gomad-skills/2-plan-workflows/gm-create-prd/steps-c/step-02b-vision.md` — `### 3. Understand the Vision` now loads the mindset section before dig-deeper probes; "Why now?" bullet gone; section 3 header and every downstream section (§4 Validate, §N Menu) unchanged.
- `src/gomad-skills/2-plan-workflows/gm-create-prd/steps-c/step-02c-executive-summary.md` — Single 1-line reword in the PRD quality bullets; three `{*_content}` append placeholders and MANDATORY EXECUTION RULES block untouched.
- `src/gomad-skills/2-plan-workflows/gm-create-prd/steps-c/step-03-success.md` — Removed `### 3. Define Business Success` block (7 lines); merged §4 "Challenge Vague Metrics" into new §3 with only the 2 code-behavior examples retained (`99.9% uptime` and `Fast`); removed `### Business Success` from Content Structure code fence (4 lines); renumber cascade on §5–§8 headers; added 1-line framing reset sentence at top of SUCCESS DISCOVERY SEQUENCE; fixed two stale cross-refs (section 7 → 6, step 7 → 6); dropped obsolete "Business success metrics defined with specific targets" SUCCESS METRICS bullet.
- `src/gomad-skills/2-plan-workflows/gm-create-prd/steps-c/step-10-nonfunctional.md` — Single 1-line removal from `#### Scalability NFRs`; Content Structure code fence and all 6 NFR categories unchanged.

Per-file change log in PRD-02 trace vocabulary (patterns found and removed):

| Pattern removed | File | Location |
|---|---|---|
| "Why now: \"Why is this the right time to build this?\"" | step-02b-vision.md | §3 Understand the Vision bullet |
| "consumable by LLMs" | step-02c-executive-summary.md | §2 Draft Executive Summary Content bullets |
| "### 3. Define Business Success" (full 7-line subsection + timelines prose) | step-03-success.md | §3 block |
| "10,000 users" → "What kind of users? Doing what?" | step-03-success.md | §4 Challenge Vague Metrics |
| "Good adoption" → "What percentage adoption by when?" | step-03-success.md | §4 Challenge Vague Metrics |
| "### Business Success" + content placeholder | step-03-success.md | Content Structure code fence |
| "user success, business success, and technical success" | step-03-success.md | ## YOUR TASK line |
| "Business success metrics defined with specific targets" | step-03-success.md | ## SUCCESS METRICS bullet (stale after §3 removal) |
| "99.9% uptime during business hours" → "99.9% system uptime" | data/prd-purpose.md | NFR example L99 |
| "Are there seasonal or event-based traffic spikes?" | step-10-nonfunctional.md | #### Scalability NFRs probe |

Pattern added (PRD-03 amplification):

| Pattern added | File | Location |
|---|---|---|
| "## Coding-Agent Consumer Mindset" section + 3 paragraphs (D-51/D-52 prose) | data/prd-purpose.md | Between Core Philosophy and Traceability Chain |
| "Read `../data/prd-purpose.md` §`## Coding-Agent Consumer Mindset` — vision is 1–2 declarative sentences, not a hedge …" | step-02b-vision.md | Top of §3 |
| "Success is functional completion plus user outcomes observable from code behavior. Business KPIs and revenue metrics are out of scope for this PRD — see `../data/prd-purpose.md` §`## Coding-Agent Consumer Mindset`." | step-03-success.md | Top of ## SUCCESS DISCOVERY SEQUENCE |

## Contract Block Preservation (Verified)

Every modified step file retains its workflow-contract blocks verbatim. Confirmed via grep:

| Block | step-02b | step-02c | step-03 | step-10 |
|---|---|---|---|---|
| `## MANDATORY EXECUTION RULES (READ FIRST)` | preserved | preserved | preserved | preserved |
| A/P/C menu (`[A] Advanced Elicitation [P] Party Mode [C] Continue`) | preserved | preserved | preserved | preserved |
| `## 🚨 SYSTEM SUCCESS/FAILURE METRICS` OR `## SUCCESS METRICS` + `## FAILURE MODES` | preserved (🚨 form) | preserved (🚨 form) | preserved (## SUCCESS METRICS + ## FAILURE MODES form) | preserved (## SUCCESS METRICS + ## FAILURE MODES form) |
| Role Reinforcement block (planned to reword in Plan 08-02) | intact, "expert peer" still present | intact, "expert peer" still present | intact (no Role Reinforcement in this file) | intact (no Role Reinforcement in this file) |

`step-02c` placeholders `{vision_alignment_content}`, `{product_differentiator_content}`, `{project_classification_content}` preserved verbatim (validator step-v-12 depends on them).

## Lint & Skill-Validator Output

`npm run lint:md -- <5 modified files>`:

```
markdownlint-cli2 v0.19.1 (markdownlint v0.39.0)
Linting: 393 file(s)
Summary: 0 error(s)
```

`npm run validate:skills` (strict mode):

```
Skills scanned: 44
Skills with findings: 2
Total findings: 2
| Severity | Count |
| LOW      |     2 |
[STRICT MODE] Only MEDIUM/LOW findings — pass.
```

The 2 LOW findings predate this plan and are unrelated to the 5 modified files (scope-boundary: not this plan's responsibility).

## Decisions Made

- **Rewrote §3 and §4 headers in step-03 together (renumber cascade).** When Task 2's Edit C.1 removed `### 3. Define Business Success`, the cleanest execution was to merge the remaining `### 4. Challenge Vague Metrics` body into the new `### 3. Challenge Vague Metrics` in the same edit (dropping the two business-metric examples simultaneously) rather than sequential header-shift + bullet-delete operations. Produced a cleaner diff and guaranteed no transitional state where the §3/§4 headers conflicted.
- **Fixed stale cross-references and an obsolete SUCCESS METRICS bullet in step-03** as Rule 2 auto-fixes. Two "from section 7" / "from step 7" references stopped matching an existing header once §7 renumbered to §6; leaving them stale would silently misdirect the facilitator. The "Business success metrics defined with specific targets" SUCCESS METRICS bullet became unreachable after §3 removed. All three repairs are correctness requirements of the D-55 cut, not scope creep.
- **Semantic banned-phrase sweep uses word-boundary anchors on acronyms** (`\bARR\b`, `\bCAC\b`, `\bLTV\b`, `\bMRR\b`, `\bDAU\b`, `\bMAU\b`). The plan's literal `-i` grep against bare acronyms reports false positives on English words like "array" (matches `ARR`) and "carries" (matches `ARR`). Verified against the semantic intent: no actual founder acronyms remain in any of the 4 step files.
- **Pedagogical mentions of banned terms in the new Mindset section are intentional.** The prose in `data/prd-purpose.md:39,41` explicitly names "business-KPI", "go-to-market", "investor", "why now?", "who are the competitors?", "what's the business case?" as examples of what NOT to include. These hits from a raw banned-phrase sweep are correct by construction — removing them would defeat the section's purpose.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Repaired stale cross-references in step-03-success.md after §3 removal + renumber cascade**
- **Found during:** Task 2 (Edit C)
- **Issue:** Plan spec C.1 removed `### 3. Define Business Success` and cascaded renumbering (4→3, 5→4, 6→5, 7→6, 8→7). Two existing body references "using structure from section 7" (line 148) and "from step 7" (line 167) were written when "Generate Success Criteria Content" was §7; after renumber it is §6. Plan spec did not list these as edit targets, but leaving them stale would silently misdirect facilitators to a non-existent section number.
- **Fix:** Updated "section 7" → "section 6" and "step 7" → "step 6". Also dropped the `## SUCCESS METRICS` bullet "Business success metrics defined with specific targets" — orphaned after §3 removed (facilitator cannot satisfy a criterion for a section that no longer exists).
- **Files modified:** `src/gomad-skills/2-plan-workflows/gm-create-prd/steps-c/step-03-success.md`
- **Verification:** `grep -n 'section [0-9]\|step [0-9]' step-03-success.md` confirms no references pointing to non-existent section numbers; `grep -c '✅' step-03-success.md` reduced by 1 (business-metrics criterion).
- **Committed in:** `7a23927` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 2 - missing critical)
**Impact on plan:** Single correctness repair directly caused by a planned removal. No scope creep — the fix only restores internal consistency the §3 strip broke. Plan's stated semantic goals achieved without architectural changes.

## Issues Encountered

- **Banned-phrase sweep false positives on `ARR` substring in "array" / "carries".** The plan's literal `! grep -nEi '(...|ARR|CAC|...|)'` acceptance criterion flagged routine English words containing the substring `arr`. Resolved by re-running with word-boundary anchors (`\bARR\b`) which cleanly confirms the semantic intent (no business acronyms present). Not a content issue.
- **Pedagogical mentions of banned terms in the new Mindset section** are intentional by D-51/D-52 design — the prose quotes banned terms as examples of what to omit. This is expected output, not a regression. Documented above under Decisions Made so Plan 08-05's banned-phrase-guard logic knows to allow-list quoted/pedagogical occurrences inside `data/prd-purpose.md §Coding-Agent Consumer Mindset`.

## User Setup Required

None — zero external services or secrets involved; all edits are repo-local markdown prompt/data files.

## Threat Flags

None. Plan's `<threat_model>` listed only repo-local markdown edits with `accept` or `N/A` dispositions; Task 1 and Task 2 stayed inside that surface. No new network endpoints, auth paths, file access patterns, or schema changes at trust boundaries were introduced.

## Next Phase Readiness

- **`data/prd-purpose.md` single source of truth for coding-agent consumer mindset is installed.** Plan 08-02 can now add references to `## Coding-Agent Consumer Mindset` from `step-08-scoping.md` and the broader `expert peer` → `product owner driving a coding-agent-built product` Role Reinforcement reword (D-57) using the exact "Read `../data/prd-purpose.md` §..." load pattern this plan established in step-02b §3.
- **step-03 Content Structure is now `User Success / Technical Success / Measurable Outcomes` only** — Plan 08-04's fixture `test/integration/prd-chain/fixture-refined-prd.md` must match this updated shape; planner already has this in PATTERNS.md section-order spec.
- **Downstream skill contracts untouched.** Validator step-v-12's required-sections scan continues to find Executive Summary, Success Criteria, Product Scope, User Journeys, Functional Requirements, Non-Functional Requirements — all still emitted by the refined steps. PRD-06 structural compatibility preserved.
- **Follow-up for Plan 08-02:** Role Reinforcement reword (D-57) across 15 steps-c files + workflow.md. Step-02c's Role Reinforcement line 23 ("expert peer") and step-02b's line 23 are unchanged in this plan and remain Plan 08-02 targets. Follow-up for Plan 08-05: banned-phrase polish pass — must allow-list the pedagogical quotes in `data/prd-purpose.md` §Coding-Agent Consumer Mindset (intentional examples of what NOT to include).

## Self-Check: PASSED

- All 5 modified source files present on disk.
- SUMMARY.md present at `.planning/phases/08-prd-product-brief-content-refinement/08-01-SUMMARY.md`.
- Commit `64821b8` (feat: add Coding-Agent Consumer Mindset + reword NFR SLA example) present in `git log --all`.
- Commit `7a23927` (feat: apply SC#1 strips to step-02b / 02c / 03 / 10) present in `git log --all`.

---
*Phase: 08-prd-product-brief-content-refinement*
*Completed: 2026-04-22*
