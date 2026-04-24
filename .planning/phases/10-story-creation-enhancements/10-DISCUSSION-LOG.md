# Phase 10: Story-Creation Enhancements - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in `10-CONTEXT.md` — this log preserves the alternatives considered.

**Date:** 2026-04-24
**Phase:** 10-story-creation-enhancements
**Areas discussed:** Elicitation flow, Re-run idempotency, Domain-KB retrieval, Context merge

---

## Elicitation flow

### Q1: What elicitation style should gm-discuss-story use?

| Option | Description | Selected |
|--------|-------------|----------|
| Assumptions-first (Recommended) | Mirrors /gsd-discuss-phase-assumptions; Claude surfaces assumptions with evidence + "if wrong"; user corrects only what's off. 2-4 interactions total. | |
| Interactive Q&A | Classic /gsd-discuss-phase; Claude identifies gray areas, user picks, ~4 questions per area. ~10-15 interactions. | |
| Fixed checklist walkthrough | Claude walks 4 STORY-01 categories as fixed script. ~4 interactions. | |
| Hybrid | Assumptions-first for locked categories, interactive Q&A for flagged-as-unclear items. | |

**User's choice:** Free-text response (Chinese) — "gm-discuss-story should reference gm-create-story's context, get the current story's goal from epics, so story's work content and goal should be consistent between the two."
**Notes:** Interpreted as scope-grounding clarification (shared inputs between gm-discuss-story and gm-create-story), not a direct style pick. Led to follow-up confirmation.

### Q2: Confirm — gm-discuss-story uses assumptions-first elicitation grounded in gm-create-story's input files (epics/PRD/architecture)?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — assumptions-first grounded in shared inputs (Recommended) | Reuses gm-create-story's discover-inputs.md Input Files table; surfaces 3-5 assumptions per locked section with evidence from those inputs. | ✓ (later reverted) |
| Yes, but add a short 'open questions' interview at the end | Assumptions-first as primary, 2-3 open-ended questions at end for uncoverable items. | |
| No — I meant something different | Let me re-describe the flow. | |

**User's choice:** Initially "Yes — assumptions-first grounded in shared inputs" — later reverted during Q5 (see below) after user asked how discuss-phase.md actually works.

### Q3: How should the 4 STORY-01 categories map to the 5 locked output sections?

| Option | Description | Selected |
|--------|-------------|----------|
| Fixed mapping (Recommended) | AC edges → `<decisions>`, NFRs → `<decisions>`, data-model → `<specifics>`, downstream contracts → `<canonical_refs>`, `<domain>` = story goal, `<deferred>` = out-of-scope. Deterministic. | |
| Adaptive mapping | Claude decides per-story which category fits which section. Flexible but non-deterministic for any downstream parser. | ✓ |
| All categories pooled under `<decisions>` | Collapse into flat D-NN list. Simpler; loses section contract. | |

**User's choice:** Adaptive mapping.
**Notes:** Captured as D-03.

### Q4: How should the ≤1500-token cap be enforced?

| Option | Description | Selected |
|--------|-------------|----------|
| Soft cap with self-check (Recommended) | Claude drafts, estimates token count heuristically, trims if over. | |
| Hard cap per section | Each section gets sub-budget; Claude trims per-section. | |
| Drafted first, user trims interactively | No cap during draft; if over, ask user what to cut. | |

**User's choice:** No option selected — user interrupted to request clarification, then reframed entirely.

### Q5: Clarification discussion on token-cap + discuss-phase reference

**User input (paraphrased):** "Explain what this token-cap is" → then "Claude drafts freely regardless of length, auto-compress on overflow" → then on reflection "gomad does NOT impose a token cap at all".
**Final framing:** No length cap on context.md output. STORY-02 revised to drop `≤1500 tokens` clause.
**Notes:** Captured as D-04. STORY-02 revision noted.

### Q6: Should there be a user review gate before writing context.md?

**User input (paraphrased):** "How does .claude/commands/gsd/discuss-phase.md actually do it?"
**Reflected back:** Explained both Classic mode (no pre-write preview, per-area transition checks) and Assumptions mode (integral pre-write preview with "Yes proceed / Let me correct some" gate).
**User's correction:** "Actually I want Classic mode (discuss)" — reverted the earlier Q2 assumptions-first choice.
**Notes:** Captured as D-02. Earlier D (assumptions-first) reverted. Adaptive section mapping (D-03) retained — compatible with Classic mode.

### Q7: Should gm-discuss-story write an incremental checkpoint (JSON) after each area?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — checkpoint per area (Recommended) | Write {planning_artifacts}/{{story_key}}-discuss-checkpoint.json after each area. Resume detection on re-run. | ✓ |
| No — single-pass only | Interrupted session = restart from scratch. Simpler. | |
| In-memory only, not persisted | Track progress in session but don't write JSON. Stateless on disk. | |

**User's choice:** Yes — checkpoint per area.
**Notes:** Captured as D-05.

---

## Re-run idempotency

### Q8: What should gm-discuss-story do when {{story_key}}-context.md already exists?

| Option | Description | Selected |
|--------|-------------|----------|
| Prompt: Update / View / Skip (Recommended) | Mirror discuss-phase pattern. | ✓ |
| Overwrite silently | Fast; destructive. | |
| Abort with error | Requires explicit user action to re-run. | |
| Append to existing | File grows unboundedly; section contract messy. | |

**User's choice:** Prompt: Update / View / Skip.
**Notes:** Captured as D-06. D-07 (edge case: both checkpoint and context.md exist → context.md wins, stale checkpoint auto-deleted) added to cover completeness.

---

## Domain-KB retrieval

### Q9: What should gm-domain-skill return when a query matches?

| Option | Description | Selected |
|--------|-------------|----------|
| Single best-matching file, full content (Recommended) | Per STORY-06 literal text. Whole .md returned. | ✓ |
| Single best-matching section (not whole file) | H2 section with highest score; requires section-level indexing. | |
| Top-N ranked files with scores | e.g. top-3 matches + excerpts; deviates from STORY-06 "single best". | |
| Full pack (all files in slug dir) | Heaviest payload. | |

**User's choice:** Single best-matching file, full content.
**Notes:** Captured as D-08.

### Q10: How should the BM25 "no match" threshold be handled?

| Option | Description | Selected |
|--------|-------------|----------|
| Heuristic with tunable constant (Recommended) | Hardcoded default; comment explains rationale; tune in patch release if empirically wrong. | ✓ |
| Return top match regardless — caller judges | No threshold; always argmax. Violates STORY-07. | |
| Config file (YAML) with override | User-tunable per-install; adds config surface. | |

**User's choice:** Heuristic with tunable constant.
**Notes:** Captured as D-10.

### Q11: How should "did you mean" slug suggestions behave?

| Option | Description | Selected |
|--------|-------------|----------|
| List close matches, halt for user to retry (Recommended) | Levenshtein distance ≤ 3, print suggestions, exit without searching. | ✓ |
| Auto-pick top suggestion if distance = 1 or 2 | Auto-correct silent; riskier. | |
| Always fail with 'unknown slug' + list all available slugs | No Levenshtein. Violates STORY-07. | |

**User's choice:** List close matches, halt for user to retry.
**Notes:** Captured as D-11.

### Q12: When slug is provided but query is omitted, what should gm-domain-skill return?

| Option | Description | Selected |
|--------|-------------|----------|
| Return the pack's SKILL.md (Recommended) | SKILL.md as natural overview. | |
| Return a listing (filename + H1) of all .md files in the pack | Catalog-style; two-step UX. | ✓ |
| Error — require query | Violates STORY-06 "optional {query}". | |

**User's choice:** Return a listing (filename + H1) of all .md files in the pack.
**Notes:** Captured as D-09. Overrides my initial recommendation — user chose richer UX over single-file default.

### Q13: For seed packs, what content depth to target in v1.3?

| Option | Description | Selected |
|--------|-------------|----------|
| Broad-shallow (Recommended) | ~10 files per pack; SKILL.md + 4-6 reference + 2-3 examples + 1 anti-patterns.md. | ✓ |
| Narrow-deep | ~4-5 files per pack; each ~1500+ words. | |
| Minimal placeholder | ~4 files per pack; proves framework; v1.4+ expands. | |

**User's choice:** Broad-shallow.
**Notes:** Captured as D-12.

---

## Context merge (gm-create-story)

### Q14: How should gm-create-story merge {{story_key}}-context.md into the story draft?

| Option | Description | Selected |
|--------|-------------|----------|
| Parse 5 locked sections, route to story fields (Recommended) | Structured parser routes sections to story fields. | |
| Verbatim paste into single 'Pre-story Context' block | Whole context.md under one heading; no parsing. | |
| Replace SELECTIVE_LOAD variables | Substitute prd/architecture content. | |

**User's choice:** Free-text — "gm-create-story does not merge context file. Instead, it uses context file as part of the context to help create correct and better story."
**Notes:** Interpreted as: load as SELECTIVE_LOAD input, no parsing, no routing. Captured as D-13.

### Q15: How should gm-create-story handle STORY-05 conflict detection + warning?

| Option | Description | Selected |
|--------|-------------|----------|
| Semantic detection by Claude (Recommended) | Claude identifies contradictions during drafting; emits warning block. | |
| Load context.md — skip conflict warning entirely | User prompt naturally wins; no conflict logic. | ✓ |
| Regex-based keyword match | Brittle; false positives. | |

**User's choice:** Load context.md — skip conflict warning entirely.
**Notes:** Captured as D-14. STORY-05 revised to drop warning clause.

---

## Final gate

### Q16: Ready to write CONTEXT.md, or explore more gray areas?

| Option | Description | Selected |
|--------|-------------|----------|
| Ready for context | Proceed to write `10-CONTEXT.md`. | ✓ |
| Explore more gray areas | Additional areas (installer step placement, slug naming, CI wiring, invocation form). | |
| Revisit an area | Go back to one of the 4 areas. | |

**User's choice:** Ready for context.

---

## Claude's Discretion (areas not explicitly decided)

- Exact BM25 constant values (k1, b, floor for "no match") — tune empirically once seeds land
- Exact file names and subtopic choices within each seed pack (within broad-shallow envelope from D-12) — planner + author decide based on representative query diversity
- Exact placement of `_installDomainKb()` in the installer pipeline (before or after `_installOfficialModules`) — follow existing pattern
- `gm-discuss-story` and `gm-domain-skill` invocation form — task-skills (no launcher-form slash commands)
- Exact wording of checkpoint JSON schema fields (match discuss-phase's schema or simplify) — planner decides
- Exact wording of "Resume / Start fresh" and "Update / View / Skip" prompts — planner mirrors discuss-phase copy

## Deferred Ideas

- `gm-discuss-story --text` flag (P2 in research; deferred unless trivial)
- `gm-domain-skill` YAML config override for BM25 threshold (rejected per D-10; revisit v1.4+)
- Conflict detection + warning in `gm-create-story` (explicitly dropped per D-14; revises STORY-05)
- Token cap + compression for context.md (explicitly dropped per D-04; revises STORY-02)
- Additional seed KB packs per STORY-F4 (react-performance, nodejs-async, api-design, claude-code-skills, claude-code-plugin)
- `gm-dev-story` fresh-retrieval integration (STORY-F1)
- `gm-discuss-story --chain` auto-trigger of `gm-create-story` (STORY-F2)
- Vector-scoring upgrade for `gm-domain-skill` (STORY-F3)
- Auto-pick top Levenshtein suggestion at distance 1 (considered and rejected during D-11 discussion)
