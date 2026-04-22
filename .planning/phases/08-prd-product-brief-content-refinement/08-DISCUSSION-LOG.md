# Phase 8: PRD + Product-Brief Content Refinement - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in `08-CONTEXT.md` — this log preserves the alternatives considered.

**Date:** 2026-04-22
**Phase:** 08-prd-product-brief-content-refinement
**Mode:** discuss (standard)
**Areas discussed:** REQ-ID + AC shape, Integration test shape, Aggressive framing, Role language + remaining tactical calls

---

## Initial Gray Area Selection

| Option | Description | Selected |
|--------|-------------|----------|
| REQ-ID + AC shape (PRD-04) | Stable REQ-IDs + machine-verifiable AC placement | ✓ |
| Integration test shape (PRD-07) | Fixture vs E2E vs hybrid | ✓ |
| Aggressive framing tone (PRD-03) | Quiet strip vs loud amplification vs full rewrite | ✓ |
| Role language + remaining tactical calls | PM-facilitator reword + OOS placement + persona depth + NFR strip + product-brief coverage + polish retrofit | ✓ |

**User's choice:** All four selected.

---

## REQ-ID + AC Shape (PRD-04)

### Q: REQ-ID format

| Option | Description | Selected |
|--------|-------------|----------|
| FR-01 / NFR-01 (Recommended) | 2-digit zero-padded, dash-separated, matches REQUIREMENTS.md style | ✓ |
| Keep FR1 / NFR1 | Zero diff; epics skill reads this literally | |
| FR-001 / NFR-001 | Matches validator report labels; over-specified | |

**User's choice:** FR-01 / NFR-01 (Recommended).

### Q: AC placement

| Option | Description | Selected |
|--------|-------------|----------|
| Inline sub-bullets per FR (Recommended) | `FR-01:` + 2-4 `- AC:` sub-bullets, capability + verification co-located | ✓ |
| Separate `## Acceptance Criteria` section | Grouped together, keyed by FR-ID | |
| Deferred to story level only | AC generated downstream; smallest content diff | |

**User's choice:** Inline sub-bullets per FR (Recommended).

### Q: AC count

| Option | Description | Selected |
|--------|-------------|----------|
| 2–4 ACs per FR, floor of 2 (Recommended) | Floor guards single-check FRs; cap prevents AC sprawl | ✓ |
| 1–3 ACs, no floor | Gentler; harder to enforce dev-ready | |
| Let Claude decide | No count target | |

**User's choice:** 2–4 ACs per FR, floor of 2 (Recommended).

### Q: AC wording style

| Option | Description | Selected |
|--------|-------------|----------|
| Given/When/Then (Recommended) | Gherkin-shaped, machine-verifiable by construction | ✓ |
| Free-form testable assertions | One-sentence observable + measurable | |
| Mixed — G/W/T suggested with free-form fallback | Pragmatic, more prompt complexity | |

**User's choice:** Given/When/Then (Recommended).

---

## Integration Test Shape (PRD-07)

### Q: Test implementation

| Option | Description | Selected |
|--------|-------------|----------|
| Fixture-based structural test (Recommended) | Pre-built sample PRD + deterministic validator/architect/epics input-parse asserts | ✓ |
| Full LLM-driven E2E run | Real pipeline, API cost, flaky | |
| Hybrid — fixture + manual E2E checklist | Automated structural + human-run checklist | |
| Fixture structural only, no E2E | Skip readiness skill assertion; narrowest SC#5 read | |

**User's choice:** Fixture-based structural test (Recommended).

### Q: Test location

| Option | Description | Selected |
|--------|-------------|----------|
| `test/integration/prd-chain/` (Recommended) | Top-level test dir; mirrors Phase 5/6 harness style | ✓ |
| Co-located under `src/.../gm-create-prd/test/` | Skill-local; no precedent in repo | |
| `tools/installer/test/integration/` | Wrong semantic location | |

**User's choice:** `test/integration/prd-chain/` (Recommended).

### Q: Readiness alignment assertion

| Option | Description | Selected |
|--------|-------------|----------|
| Readiness skill's structural prerequisites parse green (Recommended) | Deterministic input validation only | ✓ |
| Snapshot-based: fixture produces a known-good readiness report | Brittle LLM prose snapshot | |
| Skip readiness assertion | Ignores SC#5 literal target | |

**User's choice:** Readiness skill's structural prerequisites parse green (Recommended).

### Q: More questions on integration test?

| Option | Description | Selected |
|--------|-------------|----------|
| Move to Aggressive framing | Planner picks fixture domain + frontmatter | ✓ |
| One more question on fixture project domain | Ensure FR/NFR variety | |

**User's choice:** Move to Aggressive framing.

---

## Aggressive Framing (PRD-03)

### Q: Amplification posture

| Option | Description | Selected |
|--------|-------------|----------|
| Loud amplification — explicit coding-agent framing (Recommended) | New prose in step-02b + step-08 + prd-purpose.md | ✓ |
| Quiet strip — remove hedging only | No counter-framing; drift risk | |
| Full rewrite of vision + scoping prompts | Largest diff; chain-regression risk | |

**User's choice:** Loud amplification (Recommended).

### Q: Where the amplification prose lives

| Option | Description | Selected |
|--------|-------------|----------|
| `prd-purpose.md` gains new section, referenced from step-02b + step-08 (Recommended) | Single source of truth; step-11 polish also reads it | ✓ |
| Inline in each of step-02b + step-08 | Duplication; drift risk | |
| New `data/coding-agent-mindset.md` | Extra data file | |

**User's choice:** `prd-purpose.md` section + cross-references (Recommended).

### Q: step-02b cuts

| Option | Description | Selected |
|--------|-------------|----------|
| Drop 'Why now?' + time-window framing, keep vision probe (Recommended) | SC#1 literal; vision-discovery machinery intact | ✓ |
| Also drop 'future state' + narrative probes | Risks too-thin vision signal | |
| Replace step-02b entirely with capability-first probes | Largest rewrite | |

**User's choice:** Drop 'Why now?' + time-window framing (Recommended).

### Q: step-02c cuts

| Option | Description | Selected |
|--------|-------------|----------|
| Drop stakeholder-pitch framing; keep dense vision + differentiator + classification (Recommended) | Structure preserved; validator OK | ✓ |
| Collapse Executive Summary to 3 bulleted lines | Validator may fail its vision-statement check | |
| Keep current 02c structure; reword one line | Minimal diff; weakest PRD-01 signal | |

**User's choice:** Drop stakeholder-pitch framing (Recommended).

### Q: step-03 cuts

| Option | Description | Selected |
|--------|-------------|----------|
| Strip business-metrics subsection; keep user + technical success (Recommended) | Retains User/Technical Success + scope negotiation | ✓ |
| Also strip domain framing (Consumer / B2B / Regulated) | Weakens compliance signals | |
| Keep business metrics with conditional disclaimer | Conflicts with SC#1 | |

**User's choice:** Strip business-metrics subsection (Recommended).

### Q: step-10 cuts

| Option | Description | Selected |
|--------|-------------|----------|
| Keep technical + compliance NFRs; strip business SLAs (Recommended) | All six categories kept + GDPR/HIPAA/WCAG in full | ✓ |
| Also strip Accessibility entirely | Loses WCAG 2.1 AA (code-level requirement) | |
| Strip nothing | Leaves founder-flavored SLA phrasing | |

**User's choice:** Keep technical + compliance NFRs (Recommended).

---

## Role Language + Remaining Tactical Calls

### Q: Role language

| Option | Description | Selected |
|--------|-------------|----------|
| Keep role; reword 'expert peer' → 'product owner driving a coding-agent-built product' (Recommended) | Single cascading rename; posture preserved | ✓ |
| Replace with 'spec writer for coding agents' | Clean break; loses conversational elicitation | |
| Keep role language unchanged | Facilitator may revert to human-founder framing | |

**User's choice:** Keep role; reword 'expert peer' (Recommended).

### Q: Out-of-Scope placement

| Option | Description | Selected |
|--------|-------------|----------|
| New top-level `## Out of Scope` after `## Functional Requirements` (Recommended) | Mirrors REQUIREMENTS.md style; closes validator OOS gap | ✓ |
| Sub-section inside `## Product Scope` | Mixes scope-deferred with scope-never | |
| Per-FR non-capabilities list | Noisy; FR block already has AC | |

**User's choice:** New top-level `## Out of Scope` section (Recommended).

### Q: Persona/journey depth

| Option | Description | Selected |
|--------|-------------|----------|
| Keep names + role + goal; strip demographics + emotional arc (Recommended) | Matches PRD-02 'persona demographics' literal | ✓ |
| Strip to actor-list only | Most aggressive; loses UX context | |
| Gate on project type (greenfield vs brownfield) | Complex prompt logic | |

**User's choice:** Keep names + role + goal; strip demographics + emotional arc (Recommended).

### Q: gm-product-brief file coverage

| Option | Description | Selected |
|--------|-------------|----------|
| SKILL.md + prompts/ + resources/brief-template.md (Recommended) | Bounded "light pass" covering all prose | ✓ |
| SKILL.md only | Leaves prompt-level residue | |
| Everything including agents/ + manifest.json | Metadata files, low value | |

**User's choice:** SKILL.md + prompts/ + resources/brief-template.md (Recommended).

### Q: step-11 polish retrofit

| Option | Description | Selected |
|--------|-------------|----------|
| Add new sub-step 2c 'coding-agent readiness review' (Recommended) | Parallel to existing 2b; banned-phrase checklist | ✓ |
| Extend existing section 2 quality review with the check | Smaller diff; lower visibility | |
| Skip — existing polish is enough | Least safety net | |

**User's choice:** Add new sub-step 2c (Recommended).

### Q: Done or more questions?

| Option | Description | Selected |
|--------|-------------|----------|
| Done — ready for context | All four selected areas covered | ✓ |
| More questions | Continue | |

**User's choice:** Done.

---

## Claude's Discretion

Areas where the planner retains flexibility:
- Fixture project domain (D-48)
- Fixture frontmatter shape
- Exact prose of new `## Coding-Agent Consumer Mindset` section (D-52)
- Exact rewording of "expert peer" across step files (D-57)
- Plan decomposition — single vs split across 3–4 plans
- `npm run test:integration` script wiring
- Whether OOS items need a Reason column or free-form Reason text
- Whether banned-phrase list extracts to `data/coding-agent-banned-phrases.md`

## Deferred Ideas

- Full LLM-driven E2E pipeline test
- `gm-check-implementation-readiness` full snapshot test
- JSON dry-run format for integration test
- Per-FR non-capabilities list
- Replacing `PM facilitator` role entirely
- Sweep of `agents/` and `manifest.json` in gm-product-brief
- Extracted `data/coding-agent-banned-phrases.md`
- Task-skill → slash-command aliases (project-level deferral, §CMD-F1)
