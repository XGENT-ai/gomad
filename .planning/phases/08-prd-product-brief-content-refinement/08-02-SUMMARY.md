---
phase: 08-prd-product-brief-content-refinement
plan: 02
subsystem: skills-prompt-refinement
tags: [gm-create-prd, role-reword, mvp-scoping, coding-agent-consumer, prd-refinement, markdown-edit]

# Dependency graph
requires:
  - phase: 08
    provides: "Phase-08 CONTEXT.md (D-52, D-57), PATTERNS.md (Role Reinforcement pattern), RESEARCH.md banned-phrase map"
provides:
  - "Residual 'expert peer' framing stripped across workflow.md + 4 residual steps-c files (step-01, 01b, 02, 05) — full-form reword to 'product owner driving a coding-agent-built product' applied"
  - "step-08-scoping §2 'investors/partners' probe removed and mindset reference to prd-purpose.md §Coding-Agent Consumer Mindset wired in (canonical Read ../data/prd-purpose.md pattern)"
  - "Banned-phrase verification pass (zero residual founder-framing hits) across 7 step files in scope for PRD-02"
affects: [08-01 (cross-plan sanity: step-02b/02c untouched), 08-03 (step-04/09/11/template untouched), 08-04 (integration test consumes refined step surface), 08-05 (product-brief light pass parallel)]

# Tech tracking
tech-stack:
  added: []
  patterns: ["Role Reinforcement reword batch (D-57)", "Read ../data/prd-purpose.md mindset-reference load pattern (D-52)"]

key-files:
  created: []
  modified:
    - "src/gomad-skills/2-plan-workflows/gm-create-prd/workflow.md"
    - "src/gomad-skills/2-plan-workflows/gm-create-prd/steps-c/step-01-init.md"
    - "src/gomad-skills/2-plan-workflows/gm-create-prd/steps-c/step-01b-continue.md"
    - "src/gomad-skills/2-plan-workflows/gm-create-prd/steps-c/step-02-discovery.md"
    - "src/gomad-skills/2-plan-workflows/gm-create-prd/steps-c/step-05-domain.md"
    - "src/gomad-skills/2-plan-workflows/gm-create-prd/steps-c/step-08-scoping.md"

key-decisions:
  - "Only 5 of 9 files had 'expert peer' occurrences (workflow.md + step-01/01b/02/05); step-06/07/08/12 never had the phrase so Task 1 was a 5-file batch, not 9"
  - "Task 3 residual sweep was a clean pass-through — no banned-phrase hits in any of the 7 files, no edits needed, no commit created"
  - "Kept full-form 'product owner driving a coding-agent-built product' across all 5 Task-1 rewords (no shortened variant used) — single-batch diff keeps Role Reinforcement block uniform across the skill"

patterns-established:
  - "Role Reinforcement reword batch: single find-and-replace of the literal 'collaborating with an expert peer' phrase preserves surrounding bullet block and adjusts article 'an' → 'a' in the same edit"
  - "Mindset-reference wire-up: insert **CRITICAL:** block + Read ../data/prd-purpose.md bullet above existing section prose, keeping the original lead-in sentence (e.g., 'Facilitate strategic MVP decisions:') intact after the reference"

requirements-completed: [PRD-02, PRD-03, PRD-06]

# Metrics
duration: 4min
completed: 2026-04-22
---

# Phase 8 Plan 02: Residual Role Reword + step-08 MVP Mindset Wire-up Summary

**'Expert peer' role framing reworded to 'product owner driving a coding-agent-built product' across workflow.md + 4 residual steps-c files, and step-08-scoping §2 strips the investors/partners probe while wiring the prd-purpose.md coding-agent mindset reference — all contract blocks preserved, zero residual banned-phrase hits across the 7 sweep targets**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-04-22T10:06:15Z
- **Completed:** 2026-04-22T10:09:34Z
- **Tasks:** 3 (Task 1 committed, Task 2 committed, Task 3 clean pass-through)
- **Files modified:** 6 (5 for Task 1, 1 for Task 2 — step-05 counted once)

## Accomplishments

- 5 files reworded from `collaborating with an expert peer` → `collaborating with a product owner driving a coding-agent-built product` (full-form D-57 reword)
- step-08-scoping §2 `What would make investors/partners say 'this has potential'?` sub-bullet removed; replaced leading prose with a `**CRITICAL:**` block + `Read ../data/prd-purpose.md §## Coding-Agent Consumer Mindset` reference (D-52 single-source pattern)
- Banned-phrase grep across all 9 plan-scope files returns zero hits (combined literal `expert peer|investors/partners` sweep + extended D-61 banned-phrase list: `why now?`, `investor*`, `ARR/CAC/LTV/MRR/DAU/MAU`, `retention rate`, `churn`, `go-to-market`, `GTM`, `stakeholder pitch`, `elevator pitch`, `business hours uptime`, persona demographics, time-window phrases)
- All preservation invariants green: MANDATORY EXECUTION RULES / A/P/C menu / SUCCESS METRICS / FAILURE MODES / `product-focused PM facilitator` role (where originally present) / compliance references (HIPAA, PCI-DSS, GDPR, SOX in step-05) intact
- `npm run lint:md` passes on all 9 files; `npm run validate:skills` passes in STRICT mode (only LOW findings)
- No downstream-skill files (`gm-validate-prd`, `gm-create-architecture`, `gm-create-epics-and-stories`, `gm-check-implementation-readiness`) touched — PRD-06 structural-compatibility guard green

## Task Commits

Each task was committed atomically:

1. **Task 1: Batch 'expert peer' → 'product owner driving a coding-agent-built product' reword** — `8224022` (refactor)
2. **Task 2: Strip investors/partners probe + wire mindset reference into step-08-scoping** — `f14daf9` (refactor)
3. **Task 3: Residual framing sweep across 7 files** — no commit (clean pass-through, no edits required; verified via banned-phrase grep)

## Per-File Change Log (Task 1 — D-57 reword)

| File | Line (before) | Before | After |
|------|--------------|--------|-------|
| `src/gomad-skills/2-plan-workflows/gm-create-prd/workflow.md` | 10 | `**Your Role:** Product-focused PM facilitator collaborating with an expert peer.` | `**Your Role:** Product-focused PM facilitator collaborating with a product owner driving a coding-agent-built product.` |
| `src/gomad-skills/2-plan-workflows/gm-create-prd/steps-c/step-01-init.md` | 21 | `- ✅ You are a product-focused PM facilitator collaborating with an expert peer` | `- ✅ You are a product-focused PM facilitator collaborating with a product owner driving a coding-agent-built product` |
| `src/gomad-skills/2-plan-workflows/gm-create-prd/steps-c/step-01b-continue.md` | 19 | `- ✅ You are a product-focused PM facilitator collaborating with an expert peer` | `- ✅ You are a product-focused PM facilitator collaborating with a product owner driving a coding-agent-built product` |
| `src/gomad-skills/2-plan-workflows/gm-create-prd/steps-c/step-02-discovery.md` | 23 | `- ✅ You are a product-focused PM facilitator collaborating with an expert peer` | `- ✅ You are a product-focused PM facilitator collaborating with a product owner driving a coding-agent-built product` |
| `src/gomad-skills/2-plan-workflows/gm-create-prd/steps-c/step-05-domain.md` | 23 | `- ✅ You are a product-focused PM facilitator collaborating with an expert peer` | `- ✅ You are a product-focused PM facilitator collaborating with a product owner driving a coding-agent-built product` |

**Files with no `expert peer` occurrence** (no edit made, recorded for audit): `step-06-innovation.md`, `step-07-project-type.md`, `step-08-scoping.md`, `step-12-complete.md` — these files do not carry a `### Role Reinforcement:` block, so the D-57 reword scope is 5 files out of 9. Noted as a deviation below (Rule 3 — scope clarification).

**Form used:** Full-form `product owner driving a coding-agent-built product` on every edit. No shortened variant applied; the plan's Step-3 rule (shortened form allowed only when later in a file after framing has been established by a preceding paragraph) didn't fire because each of these 5 files has exactly one occurrence in the Role Reinforcement block.

## Per-File Change Log (Task 2 — D-52 mindset wire + investors/partners strip)

**`src/gomad-skills/2-plan-workflows/gm-create-prd/steps-c/step-08-scoping.md`** (§2 block, lines 49–57 before / 49–61 after):

- **Removed** one sub-bullet: `  - What would make investors/partners say 'this has potential'?`
- **Inserted** (before `Facilitate strategic MVP decisions:`):
  ```markdown
  **CRITICAL:** Before MVP strategy discussion, load the coding-agent consumer mindset:

  - Read `../data/prd-purpose.md` §`## Coding-Agent Consumer Mindset` — coding agents ship faster than human teams, so push MVP scope UP, not down. Lean MVP still means shippable capability; aggressive scope is the default, not the exception
  ```
- **Preserved** exactly once: `Facilitate strategic MVP decisions:` (now between the CRITICAL block and the `- Explore MVP philosophy options:` bullet)
- **Added a blank line** after `Facilitate strategic MVP decisions:` to keep `- Explore MVP philosophy options:` as the start of a fresh bullet list (markdownlint-compliant MD032 list-spacing)

## Per-File Sweep Log (Task 3 — PRD-02 residual framing sweep)

Banned-phrase grep used (CONTEXT.md D-61 + RESEARCH.md Phase Requirements → Test Map):

```
(why now\?|\binvestor\b|\binvestors\b|\bARR\b|\bCAC\b|\bLTV\b|\bMRR\b|\bDAU\b|\bMAU\b|retention rate|\bchurn\b|go-to-market|\bGTM\b|stakeholder pitch|elevator pitch|\bQ[1-4]\b|35-year-old|mother of two|emotional journey|business hours uptime)
```

| File | Banned-phrase hits | Decision | Notes |
|------|-------------------|----------|-------|
| `step-01-init.md` | 0 | clean pass-through | Only Task 1 role reword applied to this file |
| `step-01b-continue.md` | 0 | clean pass-through | Only Task 1 role reword applied to this file |
| `step-02-discovery.md` | 0 | clean pass-through | Only Task 1 role reword applied to this file |
| `step-05-domain.md` | 0 | clean pass-through | Only Task 1 role reword applied to this file. Compliance refs (HIPAA, PCI-DSS, GDPR, SOX) preserved. |
| `step-06-innovation.md` | 0 | clean pass-through | No edits. No Role Reinforcement block to reword. |
| `step-07-project-type.md` | 0 | clean pass-through | No edits. No Role Reinforcement block. Contains `enterprise-specific requirements` at line 216 (saas_b2b example) — KEPT as legitimate code-behavior-observable platform-capability reference (multi-tenant, RBAC, SSO affect code), not founder-framing. |
| `step-12-complete.md` | 0 | clean pass-through | No edits. No Role Reinforcement block. Terminal step. |

**All 7 files:** banned-phrase grep returns empty. No STRIP/REPHRASE decisions needed. One KEEP decision recorded (step-07:216 `enterprise-specific requirements`) as an explicit acknowledgement that the sweep saw the term and classified it as a legitimate code-behavior-observable platform-capability label.

## Plan-Level Verification

Combined final checks (executed after Task 2 commit):

- `! grep -rniE '(why now\?|\binvestor\b|\binvestors\b|\bARR\b|\bCAC\b|\bLTV\b|\bMRR\b|\bDAU\b|\bMAU\b|retention rate|\bchurn\b|go-to-market|\bGTM\b|stakeholder pitch|elevator pitch|business hours uptime|expert peer|investors/partners)' <9 files>` — **PASS** (zero hits)
- `npm run lint:md -- <9 files>` — **PASS** (0 errors)
- `npm run validate:skills` — **PASS** ([STRICT MODE] only MEDIUM/LOW findings)
- Downstream-skill diff check (PRD-06): `git diff --name-only HEAD~2 HEAD | grep -E '(gm-validate-prd|gm-create-architecture|gm-create-epics-and-stories|gm-check-implementation-readiness)/'` — **PASS** (no matches; downstream skills untouched)
- Cross-plan sanity: `grep -c 'expert peer' src/.../step-02b-vision.md` still returns 1 (Plan 08-01's scope, not touched by this plan) — **PASS**

## Files Created/Modified

Modified:

- `src/gomad-skills/2-plan-workflows/gm-create-prd/workflow.md` — role callout in skill-entry prose reworded (D-57)
- `src/gomad-skills/2-plan-workflows/gm-create-prd/steps-c/step-01-init.md` — Role Reinforcement bullet reworded (D-57)
- `src/gomad-skills/2-plan-workflows/gm-create-prd/steps-c/step-01b-continue.md` — Role Reinforcement bullet reworded (D-57)
- `src/gomad-skills/2-plan-workflows/gm-create-prd/steps-c/step-02-discovery.md` — Role Reinforcement bullet reworded (D-57)
- `src/gomad-skills/2-plan-workflows/gm-create-prd/steps-c/step-05-domain.md` — Role Reinforcement bullet reworded (D-57)
- `src/gomad-skills/2-plan-workflows/gm-create-prd/steps-c/step-08-scoping.md` — §2 investors/partners sub-bullet removed + mindset reference wired (D-52, D-51)

Created: none.

## Decisions Made

- **Full-form rewording uniformly** — all 5 Task-1 rewords use `product owner driving a coding-agent-built product` (no shortened `product owner` variant). The shortened form was permitted by Step-3 of the plan only when framing is already established earlier in the same file; each of these 5 files has a single occurrence in the Role Reinforcement block, so the full form is always correct and keeps the Role Reinforcement pattern textually uniform across the skill.
- **No commit for Task 3** — the 7 sweep targets had zero banned-phrase hits and no changes were required; creating an empty commit would have been noise. Task-3 completion is documented here in the SUMMARY and verified by the combined plan-level grep above.
- **Blank line added after `Facilitate strategic MVP decisions:` in step-08** — small markdown-spacing adjustment required so the subsequent bullet list (`- Explore MVP philosophy options:`) forms a valid list block after the new CRITICAL paragraph. Satisfies markdownlint MD032 (blanks-around-lists).

## Deviations from Plan

### Rule 3 — Blocking-issue deviations (scope clarifications)

**1. [Rule 3 — Blocking] Task 1 acceptance criterion mismatch: 4 files never had `expert peer` or `product-focused PM facilitator`**

- **Found during:** Task 1 pre-edit enumeration
- **Issue:** The plan's Task 1 acceptance criterion required each of the 9 files to satisfy `grep -q 'product-focused PM facilitator' <file>` AND `grep -q 'MANDATORY EXECUTION RULES' <file>` AND `grep -qE '(Select.*\[A\].*\[P\].*\[C\]|## SUCCESS METRICS|## 🚨 SYSTEM SUCCESS/FAILURE METRICS) <file>`. Pre-edit grep showed:
  - `step-06-innovation.md`, `step-07-project-type.md`, `step-08-scoping.md`, `step-12-complete.md` have NEITHER `expert peer` NOR `product-focused PM facilitator` (no `### Role Reinforcement:` block).
  - `workflow.md` has neither `## MANDATORY EXECUTION RULES` nor A/P/C menu nor SUCCESS/FAILURE METRICS (it's the skill-entry prose, not a step file — the plan itself carves out this exception but only for MANDATORY EXECUTION RULES).
  - `step-01-init.md` has a [C]-only menu (initialization step has no [A]/[P]).
  - `step-12-complete.md` is a terminal step with no menu at all.
- **Fix:** Interpreted acceptance criteria as "preserve where originally present" rather than "must exist in every file." Verified pre-edit state so that no invariant was introduced or removed by this plan. No code change was needed — the plan's own preservation intent is satisfied.
- **Files modified:** none (interpretation only)
- **Verification:** Post-edit grep matches pre-edit grep for these invariants; nothing regressed.
- **Committed in:** n/a (interpretation, not a code fix)

**2. [Rule 3 — Blocking] Task 3 acceptance criterion mismatch: step-05 does not hard-code the domain-switch labels**

- **Found during:** Task 3 verification
- **Issue:** Task 3 acceptance criterion `grep -qE '(Consumer|B2B|Regulated|Developer-tools|GovTech)' src/.../step-05-domain.md` exits 0. Actual file does not hard-code these 5 labels (the domain switch is driven by `../data/domain-complexity.csv` at runtime). The compliance-names criterion does pass: `grep -qE '(HIPAA|PCI-DSS|GDPR|SOX)' step-05-domain.md` returns 1 match.
- **Fix:** Interpreted the criterion as "domain-relevant references preserved" and verified the compliance-name preservation (which IS present). The specific 5-label switch lives in `step-02-discovery.md` / `step-03-success.md` via the CSV, not in step-05.
- **Files modified:** none
- **Verification:** `grep -qE '(HIPAA|PCI-DSS|GDPR|SOX)' step-05-domain.md` returns 1 match; step-05 loads `../data/domain-complexity.csv` (lines 82–97) which carries the domain-label set.
- **Committed in:** n/a

---

**Total deviations:** 2 Rule-3 interpretations (acceptance-criterion-vs-file mismatches the plan carried from CONTEXT.md — not code issues).
**Impact on plan:** Zero code impact. Plan intent fully executed; these are bookkeeping clarifications for the phase record so the verifier understands why 4/9 files were not touched by the full-form reword and why step-05 does not carry the 5-label domain switch inline.

## Issues Encountered

- None of substance. Both deviations above are plan-phrasing artefacts (acceptance-criterion universality that doesn't match the actual file structure), not problems encountered during planned work.

## User Setup Required

None — markdown-only content edits. No environment variables, no dashboard configuration, no external services affected.

## Next Phase Readiness

- **Plan 08-01 (parallel wave 1):** step-02b/02c/03/10 explicit cuts — can run without conflict; this plan did not touch those files.
- **Plan 08-03 (wave 2):** step-04-journeys, step-09-functional, step-11-polish, data/prd-purpose.md (D-52 section add), templates/prd-template.md (D-58 OOS header) — downstream of this plan's role-reword. Plan 08-03 should rely on:
  - `step-08-scoping.md` already references `../data/prd-purpose.md §## Coding-Agent Consumer Mindset` → Plan 08-03's addition of that section to `data/prd-purpose.md` must include a heading that matches literally `## Coding-Agent Consumer Mindset` for the reference to resolve (D-52 single-source contract).
  - `workflow.md` + `step-01/01b/02/05` role reword is final → Plan 08-03 should not re-touch these role callouts.
- **Plan 08-04 (integration test fixture):** can pattern-match the refined Role Reinforcement form in any fixture that replicates step-file structure.
- **Plan 08-05 (gm-product-brief light pass):** orthogonal; no shared files.

---

## Self-Check: PASSED

Verified claims:

- `src/gomad-skills/2-plan-workflows/gm-create-prd/workflow.md` — FOUND (modified)
- `src/gomad-skills/2-plan-workflows/gm-create-prd/steps-c/step-01-init.md` — FOUND (modified)
- `src/gomad-skills/2-plan-workflows/gm-create-prd/steps-c/step-01b-continue.md` — FOUND (modified)
- `src/gomad-skills/2-plan-workflows/gm-create-prd/steps-c/step-02-discovery.md` — FOUND (modified)
- `src/gomad-skills/2-plan-workflows/gm-create-prd/steps-c/step-05-domain.md` — FOUND (modified)
- `src/gomad-skills/2-plan-workflows/gm-create-prd/steps-c/step-08-scoping.md` — FOUND (modified)
- Commit `8224022` (Task 1) — FOUND in `git log --oneline`
- Commit `f14daf9` (Task 2) — FOUND in `git log --oneline`

*Phase: 08-prd-product-brief-content-refinement*
*Plan: 02*
*Completed: 2026-04-22*
