---
phase: 08-prd-product-brief-content-refinement
plan: 04
subsystem: skills-content
tags: [gm-product-brief, voice-alignment, guardrail-preservation, coding-agent-consumer, markdown-only]

requires:
  - phase: 08-prd-product-brief-content-refinement
    provides: D-57 product-owner mental model; D-60 gm-product-brief coverage (SKILL.md + 4 prompts + brief-template.md); Pitfall 4 guardrail-preservation directive
provides:
  - gm-product-brief SKILL.md voice aligned with product-owner-driving-coding-agents mental model
  - resources/brief-template.md Focus-of-this-brief block extended with coding-agent consumer reference
  - draft-and-review.md triage language rephrased from commercial ("market positioning") to functional ("feature-prioritization")
  - guided-elicitation.md Goal paragraph reinforced with coding-agent downstream consumer reference (guardrail untouched)
  - Every canonical guardrail across the 6 files preserved VERBATIM (Pitfall 4 mitigation)
affects: [08-05 (phase-verification), future PRD-work phases, gm-create-prd handoff consumers]

tech-stack:
  added: []
  patterns:
    - "STRENGTHENING pass (not stripping) — banned-phrase grep triage classifies each hit as GUARDRAIL-KEEP | CONTEXTUAL-KEEP | STRIP | REPHRASE; guardrails stay intact, residual framing is rephrased"
    - "Voice-alignment with coding-agent-consumer mental model applied ONLY at non-guardrail anchors (SKILL.md L12 paragraph, brief-template.md L5 Focus, guided-elicitation.md L6 Goal)"

key-files:
  created: []
  modified:
    - "src/gomad-skills/1-analysis/gm-product-brief/SKILL.md"
    - "src/gomad-skills/1-analysis/gm-product-brief/resources/brief-template.md"
    - "src/gomad-skills/1-analysis/gm-product-brief/prompts/draft-and-review.md"
    - "src/gomad-skills/1-analysis/gm-product-brief/prompts/guided-elicitation.md"

key-decisions:
  - "Kept 'equals' → 'peers on the spec' reword (slightly less absolute; better matches product-owner framing)"
  - "Applied the optional voice-reinforcement at guided-elicitation.md L6 — the Goal paragraph now explicitly names the coding-agent downstream consumer, tightening the 'why we don't probe commercial' framing"
  - "Applied 'market positioning decisions' → 'feature-prioritization decisions' reword at draft-and-review.md L68 (plan-sanctioned, drops last commercial-framing residual outside guardrails)"
  - "contextual-discovery.md and finalize.md were NOT edited — zero residual-framing hits after classification; one banned-phrase hit in contextual-discovery.md L17 is a GUARDRAIL-KEEP"

patterns-established:
  - "Guardrail-safe voice reinforcement: single-sentence injection at paragraph anchor that names the coding-agent consumer, placed BEFORE (not replacing) any existing 'do NOT probe / out of scope' prose"
  - "Banned-phrase triage applied as a pre-edit audit across all 4 prompt files, then acted on per classification"

requirements-completed: [PRD-05, PRD-06]

duration: 7min
completed: 2026-04-22
---

# Phase 08 Plan 04: gm-product-brief Voice Alignment Summary

**gm-product-brief voice aligned with product-owner-driving-coding-agents mental model across SKILL.md, brief-template.md, draft-and-review.md, and guided-elicitation.md — every canonical guardrail ("Explicitly DO NOT probe", "Do NOT pad with commercial content", "Commercial/market/investor content is explicitly out of scope", "Do not pick investor, GTM, pricing, or commercial-risk lenses") preserved VERBATIM, with two targeted voice touchups and two guardrail-adjacent reinforcements**

## Performance

- **Duration:** 7 min
- **Started:** 2026-04-22T10:03:47Z
- **Completed:** 2026-04-22T10:10:00Z
- **Tasks:** 2
- **Files modified:** 4 (of 6 in scope — contextual-discovery.md and finalize.md had zero edits after banned-phrase triage classified all hits as GUARDRAIL-KEEP or clean)

## Accomplishments

- SKILL.md L12 reworded: "Work together as equals" → "Work together as peers on the spec" under the new product-owner-driving-coding-agents framing
- brief-template.md L5 extended with "The downstream consumer is a coding agent (via the gm-create-prd handoff)" reference; full guardrail list preserved
- draft-and-review.md L68: "market positioning decisions" → "feature-prioritization decisions"
- guided-elicitation.md L6: new sentence ties elicitation scope to the coding-agent consumer, placed directly before the existing "not a commercial/business deep-dive" guardrail phrase to reinforce (not weaken) it
- Every canonical guardrail across the 6 files left byte-identical; verified via grep against guardrail anchor strings
- markdownlint green on all 6 files; `validate:skills` green (no findings in gm-product-brief)
- `agents/` pointer dir and `manifest.json` untouched, as required

## Task Commits

1. **Task 1: Voice-align SKILL.md + brief-template.md** — `7f5a6fa` (refactor)
2. **Task 2: Light-pass sweep of 4 prompt files** — `6b1692e` (refactor)

## Files Created/Modified

### Modified

- `src/gomad-skills/1-analysis/gm-product-brief/SKILL.md` — L12 Overview second paragraph reworded to product-owner / coding-agent-consumer framing with "peers on the spec" collaboration posture
- `src/gomad-skills/1-analysis/gm-product-brief/resources/brief-template.md` — L5 Focus-of-this-brief block extended with coding-agent consumer reference, preserving the guardrail sentence verbatim
- `src/gomad-skills/1-analysis/gm-product-brief/prompts/draft-and-review.md` — L68 triage-flag language rephrased from commercial ("market positioning") to functional ("feature-prioritization")
- `src/gomad-skills/1-analysis/gm-product-brief/prompts/guided-elicitation.md` — L6 Goal paragraph gained a single-sentence coding-agent-consumer reinforcement inserted BEFORE the trailing "**not** a commercial/business deep-dive" guardrail

### Unmodified (in-scope but zero edits after triage)

- `src/gomad-skills/1-analysis/gm-product-brief/prompts/contextual-discovery.md` — only banned-phrase hit (L17) classified as GUARDRAIL-KEEP
- `src/gomad-skills/1-analysis/gm-product-brief/prompts/finalize.md` — zero banned-phrase hits

## Voice-Alignment Diffs

### SKILL.md L12

**Before:**
```markdown
The user is the domain expert. You bring structured thinking, facilitation, and the ability to synthesize large volumes of input into a clear, implementable picture of the product. Work together as equals.
```

**After:**
```markdown
The user is the product owner, driving a product built by coding agents rather than a human development team. You bring structured thinking, facilitation, and the ability to synthesize large volumes of input into a clear, implementable picture — one that a coding agent can consume downstream. Work together as peers on the spec.
```

### brief-template.md L5

**Before:**
```markdown
**Focus of this brief:** what the product does, who it serves, and the core functional scope of the first version. Business/commercial concerns (pricing, GTM, financial metrics, investor narrative) are explicitly **not** the focus and belong in a separate business brief or the distillate.
```

**After:**
```markdown
**Focus of this brief:** what the product does, who it serves, and the core functional scope of the first version. The downstream consumer is a coding agent (via the gm-create-prd handoff), so prose is concrete and capability-oriented — not a stakeholder pitch. Business/commercial concerns (pricing, GTM, financial metrics, investor narrative) are explicitly **not** the focus and belong in a separate business brief or the distillate.
```

## Per-File Banned-Phrase Change Log

Regex used for triage:
`(why now\?|investor|investors|\bARR\b|\bCAC\b|\bLTV\b|\bMRR\b|\bDAU\b|\bMAU\b|retention rate|\bchurn\b|go-to-market|\bGTM\b|stakeholder pitch|elevator pitch|3 months|6 months|12 months|18 months|by Q[1-4]|35-year-old|mother of two|emotional journey|pricing|monetization|fundraising|payback period|commercial|investor narrative|market positioning)`

| File | Line | Phrase | Decision | Before | After |
|------|------|--------|----------|--------|-------|
| contextual-discovery.md | 17 | `Commercial/market/investor content is explicitly out of scope for this researcher.` | GUARDRAIL-KEEP | — | unchanged |
| draft-and-review.md | 18 | `Do NOT pad with commercial content — no pricing, no financial KPIs, no investor narrative, no multi-year business roadmap.` | GUARDRAIL-KEEP | — | unchanged |
| draft-and-review.md | 44 | `keeping the focus functional (not commercial)` | GUARDRAIL-KEEP | — | unchanged |
| draft-and-review.md | 53 | `Do not pick investor, GTM, pricing, or commercial-risk lenses — those are out of scope for this brief.` | GUARDRAIL-KEEP | — | unchanged |
| draft-and-review.md | 68 | `market positioning decisions` | REPHRASE | `strategic choices, scope questions, market positioning decisions` | `strategic choices, scope questions, feature-prioritization decisions` |
| finalize.md | — | (zero hits) | N/A | — | unchanged |
| guided-elicitation.md | 6 | `**not** a commercial/business deep-dive` | GUARDRAIL-KEEP (+ voice reinforcement inserted before it in same paragraph) | `... supporting research. This stage is smart, targeted questioning — **not** a rote section-by-section interrogation, and **not** a commercial/business deep-dive.` | `... supporting research. The downstream consumer is a coding agent via the PRD handoff — keep elicitation focused on feature and flow detail a coding agent can compile, not commercial positioning. This stage is smart, targeted questioning — **not** a rote section-by-section interrogation, and **not** a commercial/business deep-dive.` |
| guided-elicitation.md | 71 | `Pricing, packaging, monetization strategy` | GUARDRAIL-KEEP | — | unchanged |
| guided-elicitation.md | 72 | `CAC, LTV, ARR, payback period, or other financial KPIs` | GUARDRAIL-KEEP | — | unchanged |
| guided-elicitation.md | 73 | `Investor-facing narrative or fundraising angles` | GUARDRAIL-KEEP | — | unchanged |
| guided-elicitation.md | 75 | `Go-to-market channel strategy` | GUARDRAIL-KEEP | — | unchanged |

**Summary:** 11 banned-phrase hits across 4 prompts. 10 classified GUARDRAIL-KEEP (preserved verbatim). 1 classified REPHRASE (`market positioning` → `feature-prioritization` at draft-and-review.md L68). Additionally 1 voice-reinforcement sentence inserted at guided-elicitation.md L6 BEFORE (not replacing) the guardrail.

## Guardrail-Preservation Proof

Counts of `CAC|LTV|ARR|investor|GTM|go-to-market|commercial` mentions across `src/gomad-skills/1-analysis/gm-product-brief/` tree:

| File | Before | After | Delta |
|------|--------|-------|-------|
| resources/brief-template.md | 3 | 3 | 0 |
| agents/artifact-analyzer.md | 0 | 0 | 0 (not modified) |
| agents/skeptic-reviewer.md | 2 | 2 | 0 (not modified) |
| agents/web-researcher.md | 2 | 2 | 0 (not modified) |
| agents/opportunity-reviewer.md | 1 | 1 | 0 (not modified) |
| SKILL.md | 3 | 3 | 0 |
| manifest.json | 0 | 0 | 0 (not modified) |
| prompts/contextual-discovery.md | 1 | 1 | 0 (not modified) |
| prompts/guided-elicitation.md | 2 | 2 | 0 |
| prompts/draft-and-review.md | 3 | 3 | 0 |
| prompts/finalize.md | 0 | 0 | 0 (not modified) |
| **TOTAL** | **17** | **17** | **0** |

Every guardrail mention survived. (Total-matches are on the regex `\b(CAC|LTV|ARR|investor|GTM|go-to-market|commercial)\b` — counts lines with any match, not match-instances.)

The plan's plan-level verification requires `count > 5` for `\b(CAC|LTV|ARR|investor|GTM|go-to-market)\b` — our count is 13 across the full tree, satisfying the gate with headroom.

## agents/ + manifest.json Untouched Proof

```bash
$ git diff --name-only HEAD~2 HEAD
src/gomad-skills/1-analysis/gm-product-brief/SKILL.md
src/gomad-skills/1-analysis/gm-product-brief/prompts/draft-and-review.md
src/gomad-skills/1-analysis/gm-product-brief/prompts/guided-elicitation.md
src/gomad-skills/1-analysis/gm-product-brief/resources/brief-template.md
```

No paths under `agents/`; `manifest.json` absent. Constraint honored.

## Verification Output

### markdownlint (all 6 in-scope files)

```
markdownlint-cli2 v0.19.1 (markdownlint v0.39.0)
Linting: 6 file(s)
Summary: 0 error(s)
EXIT=0
```

### validate:skills

```
Validating skills in: .../src
Mode: STRICT (exit 1 on HIGH+)
Summary:
   Skills scanned: 44
   Skills with findings: 2  (both pre-existing, in gm-brainstorming and gm-create-ux-design)
   Total findings: 2 (LOW)
   [STRICT MODE] Only MEDIUM/LOW findings — pass.
EXIT=0
```

Zero findings in `gm-product-brief` itself.

## Decisions Made

- **Applied the optional guided-elicitation.md L6 voice reinforcement** — the plan marked this as "planner's discretion". Applied it because the sentence directly reinforces the coding-agent-consumer framing while leaving the existing "**not** a commercial/business deep-dive" guardrail untouched at the end of the paragraph. Net effect: the Goal paragraph now explicitly names WHY the scope is tight (coding-agent downstream consumer), which strengthens the guardrail rather than dilutes it.
- **Did NOT apply optional touchup at brief-template.md L7 "Sensible Default Structure"** — plan noted it was already appropriately neutral. No change.
- **Kept 'peers on the spec'** — plan offered this as the replacement for 'equals'. Judged it a genuine improvement over the original (slightly less absolute; anchors the collaboration to a concrete artifact, the spec).

## Deviations from Plan

None - plan executed exactly as written.

_Note: All acceptance-criteria greps that could meaningfully verify semantic preservation passed. One acceptance-criterion literal (`grep -q 'not a commercial/business deep-dive'`) fails because the file uses markdown bold markers (`**not**`) that fragment the literal substring. This is a plan-authoring artifact (the same grep would have failed against the un-edited file) and not a regression. The semantic guardrail `**not** a commercial/business deep-dive` IS present and was verified with a bold-aware grep (`grep -qE '\*\*not\*\* a commercial/business deep-dive'`, exit 0)._

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Threat Flags

None — no new security-relevant surface introduced. All edits are markdown-only content inside existing files at trust-boundary-less locations.

## Next Phase Readiness

- PRD-05 (coding-agent-consumer voice refinement across gm-product-brief) closed
- PRD-06 (guardrail preservation during voice refinement) closed
- gm-product-brief now voice-consistent with refined gm-create-prd; ready for 08-05 phase-verification sweep
- No blockers, no open questions

## Self-Check

### Files verified

```
$ [ -f src/gomad-skills/1-analysis/gm-product-brief/SKILL.md ] && echo FOUND
FOUND
$ [ -f src/gomad-skills/1-analysis/gm-product-brief/resources/brief-template.md ] && echo FOUND
FOUND
$ [ -f src/gomad-skills/1-analysis/gm-product-brief/prompts/draft-and-review.md ] && echo FOUND
FOUND
$ [ -f src/gomad-skills/1-analysis/gm-product-brief/prompts/guided-elicitation.md ] && echo FOUND
FOUND
```

### Commits verified

```
$ git log --oneline --all | grep -qE '7f5a6fa|6b1692e' && echo FOUND
FOUND
```

## Self-Check: PASSED

---
*Phase: 08-prd-product-brief-content-refinement*
*Completed: 2026-04-22*
