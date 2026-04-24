# Phase 8: PRD + Product-Brief Content Refinement - Context

**Gathered:** 2026-04-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Retune `gm-create-prd` (15 step files + `data/prd-purpose.md` + `templates/prd-template.md`) and `gm-product-brief` (SKILL.md + 4 prompts + `resources/brief-template.md`) for coding-agent consumers. Strip human-founder framing (time windows, "why now?", business/operational metrics, persona demographics, go-to-market language), amplify aggressive vision + MVP scope, sharpen dev-ready requirement density (REQ-IDs, machine-verifiable acceptance criteria, explicit out-of-scope, feature boundaries). Refinement is strictly additive/stripping — structural sections consumed by `gm-validate-prd`, `gm-create-architecture`, `gm-create-epics-and-stories`, and `gm-check-implementation-readiness` are preserved so the downstream pipeline stays compatible without lockstep updates.

Out of scope: any edit to downstream skills (scope-locked via PRD-06); new task-skill-to-slash-command migration; structural reshuffling of workflow.md step-file architecture.

</domain>

<decisions>
## Implementation Decisions

(Numbering continues from Phase 7's D-43.)

### REQ-ID + acceptance-criteria contract (PRD-04)

- **D-44:** REQ-ID format is **`FR-01` / `NFR-01`** (2-digit zero-padded, dash-separated). Lexicographic sort works up to 99 items, matches REQUIREMENTS.md style (`PRD-01`, `REL-05`), and still matches `gm-create-epics-and-stories/steps/step-01-validate-prerequisites.md:80` "numbered items like 'FR1:', 'Functional Requirement 1:', or similar" via the *or similar* clause. `gm-validate-prd/steps-v/step-v-10-smart-validation.md` generates its own `FR-001` labels in reports — our PRD-side format does not need to match that verbatim.
- **D-45:** Acceptance criteria live as **inline sub-bullets under each FR**. Format:
  ```
  - FR-01: [Actor] can [capability]
      - AC: Given [state], when [action], then [observable outcome]
      - AC: Given [state], when [action], then [observable outcome]
  ```
  Keeps capability + verification co-located; validator + architect + epics all read the same FR block; epics skill extracts AC as story-AC seeds. Step-09 content structure updates to emit this form. No separate `## Acceptance Criteria` section.
- **D-46:** Target **2–4 AC sub-bullets per FR, floor of 2**. Step-09 self-validation (its "Quality Check" subsection) gains: "Each FR has ≥2 AC sub-bullets." Prevents single-check FRs; caps at 4 so AC sprawl belongs in stories downstream.
- **D-47:** AC wording style is **Given / When / Then** (Gherkin-shaped). Machine-verifiable by construction; maps 1:1 to test assertions; epics skill already uses AC as story-AC seeds so this harmonizes. Step-09 prompt shows Given/When/Then as the canonical form.

### Integration test shape (PRD-07)

- **D-48:** Integration test is **fixture-based and structural**, not LLM-driven E2E. Authored artifacts: one canonical sample PRD fixture (`fixture-refined-prd.md`) produced from the refined skills under a realistic project domain, plus a Node test that (a) loads the fixture, (b) asserts structural sections present + `FR-01` / `NFR-01` ID format + `### Out of Scope` presence, (c) invokes `gm-validate-prd`'s deterministic checks (density, format, completeness — excluding LLM elicitation steps), (d) asserts `gm-create-architecture`'s step-01 and `gm-create-epics-and-stories`' step-01-validate-prerequisites parse the fixture without "missing context" errors. Deterministic, fast (<30s), CI-safe. No full LLM pipeline run; no API cost; no flaky elicitation snapshots.
- **D-49:** Test location is **`test/integration/prd-chain/`** (new top-level dir). Fixture: `test/integration/prd-chain/fixture-refined-prd.md`. Test: `test/integration/prd-chain/test-prd-chain.js`. Wired into `npm run test:integration` (new script) and gated under `npm run quality` so REL-04 catches regressions pre-publish. Matches `test/test-gm-command-surface.js` (Phase 5/6 tarball-verification) style. Not under `tools/installer/test/` (semantically wrong — this isn't an installer test) and not per-skill co-located (test crosses three skills).
- **D-50:** `gm-check-implementation-readiness` "alignment" assertion (part of SC#5) is satisfied by **deterministic-prerequisites check only** — the readiness skill's step-01 (or equivalent input-prerequisites validator) is run against the fixture chain output and must parse all required input sections without errors. No full LLM readiness elicitation, no snapshot-diff on readiness report prose. Matches SC#5 "reports alignment" literally without pulling LLM dependency into CI.

### Aggressive framing posture (PRD-03)

- **D-51:** Framing shift is **loud amplification**, not quiet strip. `step-02b` (vision), `step-08` (scoping), and `data/prd-purpose.md` gain explicit prose telling facilitators: "Coding agents ship faster than human teams — push MVP scope UP, not down. Vision is 1–2 declarative sentences, not a hedge." Gives downstream agents reading the refined PRD a clear signal for WHY content reads this way. Facilitators get an explicit mental-model reset, not just vacated cues.
- **D-52:** The amplification prose lives in **`data/prd-purpose.md`** as a new `## Coding-Agent Consumer Mindset` section, referenced (not duplicated) from step-02b and step-08 prompts. Single source of truth; `step-11` polish also reads `prd-purpose.md` so the same framing informs the polish check. Avoids drift vs inline duplication and avoids introducing a new standalone data file (`data/coding-agent-mindset.md` rejected as unnecessary).

### Step-level strip scope — SC#1 explicit targets (PRD-01)

- **D-53:** **step-02b-vision.md** cuts: drop the "Why now? — Why is this the right time to build this?" probe (line 78) and any time-window estimation language. Preserve vision-probe sequence (user delight, differentiation moment, core insight, problem framing, future state). Matches SC#1 literal "no 'why now?' prompt" without gutting the vision-discovery machinery downstream steps depend on.
- **D-54:** **step-02c-executive-summary.md** cuts: drop stakeholder-pitch / elevator-pitch framing from the drafted summary and from the step-specific rule "Dual-audience optimized — readable by humans, consumable by LLMs" (reworded to "… consumable by coding agents"). Preserve the three content blocks (`{vision_alignment_content}`, `{product_differentiator_content}`, `{project_classification_content}`) verbatim — validator's step-v-12 asserts Executive Summary exists with a vision statement, so structure is load-bearing.
- **D-55:** **step-03-success.md** cuts: remove section "3. Define Business Success" (lines 73–79) and "4. Challenge Vague Metrics" business-metric examples (`"10,000 users"`, `"good adoption"`). Keep `### User Success` + `### Technical Success` template subsections and the MVP / Growth / Vision scope negotiation in section 6. Reframe the step goal as "functional completion + user outcomes observable from code behavior." Section 5's domain switch (Consumer / B2B / Regulated / Developer-tools / GovTech) stays — compliance signals downstream depend on it.
- **D-56:** **step-10-nonfunctional.md** cuts: strip "business SLAs" framing (e.g. "business hours uptime" → "system uptime"; remove founder-flavored "seasonal / event-based traffic spikes" phrasing). Keep all six technical NFR categories — Performance, Security, Scalability, Accessibility, Integration, Reliability — they are code-relevant. Compliance NFRs (GDPR, HIPAA, PCI-DSS, WCAG 2.1 AA) stay in full; they affect code behavior directly. Matches SC#1 literal "no business SLAs unrelated to code".

### Residual strip — SC#2 read-through targets (PRD-02)

- **D-57:** Role language across all 15 `steps-c/*.md` files: **keep `product-focused PM facilitator`** as the role; **reword `expert peer`** → `product owner driving a coding-agent-built product` in every "Role Reinforcement" block and any inline references. Cascades as a single find-and-replace batch during plan execution. Preserves the conversational elicitation posture that step-02b / step-03 / step-04 / step-08 depend on while rebuilding the mental model: the user is a product owner whose implementer is a coding agent team, not a human dev team.
- **D-58:** Refined PRDs produce a **new top-level `## Out of Scope` section after `## Functional Requirements`**. Entry format mirrors REQUIREMENTS.md style:
  ```
  ## Out of Scope
  - **OOS-01**: <capability> — Reason: <why>
  ```
  Template change: `templates/prd-template.md` gains the section header as a placeholder; step-09 content structure (or a new step-09b) emits the `## Out of Scope` block. Validator's step-v-12 already expects "in-scope and out-of-scope defined" so structurally the new section closes an existing validation gap. Architect reads it (prevents over-building); epics skill doesn't need to.
- **D-59:** **step-04-journeys.md** persona depth: keep persona *name + role + goal*; strip demographic "realistic name and personality", backstory, emotional-arc probes, and the "Opening Scene / Rising Action / Climax / Resolution" narrative framework (section 2 sub-structure). Journey prose rewrites as action-oriented: "Actor performs X, system responds Y, outcome Z." "Minimum Coverage" list (Primary happy / Primary edge / Admin / Support / API) preserved — downstream capability extraction depends on it.

### gm-product-brief light pass (PRD-05)

- **D-60:** File coverage: **SKILL.md** (tone reword only — existing scope discipline is already strong), **all 4 files under `prompts/`** (`contextual-discovery.md`, `draft-and-review.md`, `finalize.md`, `guided-elicitation.md` — strip any residual "why now?" / investor / GTM framing), and **`resources/brief-template.md`** (template voice alignment with refined gm-create-prd output — reference to product-owner-of-coding-agents mental model). **Skip** `agents/` (directory-level pointer, no prose) and **`manifest.json`** (machine-read metadata; `description` field reworded only if it contains human-founder tone). Bounded "light pass" that touches every file with actual prose while not sweeping metadata.

### step-11 polish retrofit

- **D-61:** **step-11-polish.md** gains a new sub-step — section **2c "Coding-Agent Readiness Review"** (parallel to existing 2b Brainstorming Reconciliation). Includes an explicit banned-phrase checklist:
  - "why now?"
  - "investor" / "investors"
  - "ARR" / "CAC" / "LTV" / "MRR" / "DAU" / "MAU" / "retention rate" / "churn"
  - "go-to-market" / "GTM"
  - "stakeholder pitch" / "elevator pitch"
  - persona demographic markers (e.g. "35-year-old", "mother of two", "emotional journey")
  - time-window estimation phrases ("in 3 months", "by Q4", "within 18 months")

  Facilitator must flag occurrences, propose strip-or-rephrase, and only proceed on user approval. Catches regressions if earlier steps drifted. Bounded additive change — no existing section reshaped.

### Claude's Discretion

- Fixture project domain for the integration test (D-48) — SaaS CRUD, CLI dev tool, or internal agent-ops tool. Planner picks based on which surfaces the most FR / NFR / OOS variety in a fixture sized for CI (< ~300 lines).
- Fixture frontmatter shape — planner matches the template's `stepsCompleted` / `inputDocuments` / `workflowType: 'prd'` keys (`templates/prd-template.md` lines 1–5) and adds whatever steps the fixture needs to look "complete."
- Exact prose of the new `data/prd-purpose.md` `## Coding-Agent Consumer Mindset` section (D-52) — 2–3 short paragraphs, calibrated to the existing prd-purpose.md voice (which is direct and pattern-rich).
- Exact rewording of "expert peer" occurrences (D-57) — may be "product owner driving a coding-agent-built product" in full, or shortened to "product owner" where "coding-agent-built product" is already implied by context earlier in the same step file. Planner keeps diff size sane.
- Plan decomposition — bundling all 18 decisions as one plan vs splitting (e.g., SC#1 explicit cuts as plan 08-01, SC#2 residual strip + OOS as 08-02, product-brief pass as 08-03, integration test as 08-04). Tight coupling around `prd-purpose.md` + step-09 suggests bundled; separable review surfaces suggest split. Planner decides based on reviewability; expect 3–4 plans.
- Numbering / decision-of-each-cut inside the plans — e.g., "strip line 78 of step-02b" is a concrete implementation step the plan spells out; this CONTEXT.md records *what and why*.
- `npm run test:integration` script wiring (D-49) — new script in `package.json` or folded into existing `quality` aggregate. Planner aligns with v1.1 test-script conventions.
- Whether OOS items (D-58) also need a Reason column in the template placeholder or free-form Reason text suffices. Both satisfy SC#3 "explicit out-of-scope"; planner picks per prd-purpose.md density norms.
- Where the banned-phrase list (D-61) lives physically — inline in step-11 or extracted to `data/coding-agent-banned-phrases.md` for reuse by step-09 / step-02b self-checks. Planner decides based on reuse count.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase-8 authoritative roadmap + requirements

- `.planning/ROADMAP.md` — Phase 8 goal and SC#1–6 literal wording (SC#1 = explicit step-02b/02c/03/10 strips; SC#2 = residual sweep; SC#3 = aggressive vision + dev-ready requirements + REQ-IDs + OOS; SC#4 = gm-product-brief light pass; SC#5 = integration test chain; SC#6 = no downstream-skill changes)
- `.planning/REQUIREMENTS.md` §PRD — PRD-01 through PRD-07 requirement statements (lines 36–44) and Out-of-Scope row locking PRD-06 structural compatibility (lines 75–76)
- `.planning/PROJECT.md` — v1.2 milestone goal, "PRD: ..." Active requirement line (line 45), Key Decisions table

### Target skill — gm-create-prd (15 step files + template + data)

- `src/gomad-skills/2-plan-workflows/gm-create-prd/SKILL.md` — entry point
- `src/gomad-skills/2-plan-workflows/gm-create-prd/workflow.md` — workflow architecture, step-file execution rules
- `src/gomad-skills/2-plan-workflows/gm-create-prd/data/prd-purpose.md` — dual-audience philosophy, FR/NFR anti-patterns, structural section list (D-52 adds `## Coding-Agent Consumer Mindset`)
- `src/gomad-skills/2-plan-workflows/gm-create-prd/templates/prd-template.md` — output frontmatter (D-58 adds `## Out of Scope` placeholder)
- `src/gomad-skills/2-plan-workflows/gm-create-prd/steps-c/step-01-init.md` — input discovery, brownfield/greenfield detection
- `src/gomad-skills/2-plan-workflows/gm-create-prd/steps-c/step-01b-continue.md` — continuation path
- `src/gomad-skills/2-plan-workflows/gm-create-prd/steps-c/step-02-discovery.md` — project classification
- `src/gomad-skills/2-plan-workflows/gm-create-prd/steps-c/step-02b-vision.md` §3 "Understand the Vision" — D-53 cut target ("Why now?" probe, line 78)
- `src/gomad-skills/2-plan-workflows/gm-create-prd/steps-c/step-02c-executive-summary.md` — D-54 cut target (stakeholder-pitch framing, line 69 rule)
- `src/gomad-skills/2-plan-workflows/gm-create-prd/steps-c/step-03-success.md` §3–4 — D-55 cut target (business-metrics subsection, lines 73–88)
- `src/gomad-skills/2-plan-workflows/gm-create-prd/steps-c/step-04-journeys.md` §2 "Create Narrative Story-Based Journeys" — D-59 strip target (persona story framework)
- `src/gomad-skills/2-plan-workflows/gm-create-prd/steps-c/step-05-domain.md` — PRD-02 read-through
- `src/gomad-skills/2-plan-workflows/gm-create-prd/steps-c/step-06-innovation.md` — PRD-02 read-through
- `src/gomad-skills/2-plan-workflows/gm-create-prd/steps-c/step-07-project-type.md` — PRD-02 read-through
- `src/gomad-skills/2-plan-workflows/gm-create-prd/steps-c/step-08-scoping.md` — PRD-02 read-through; D-52 reference to prd-purpose.md mindset section
- `src/gomad-skills/2-plan-workflows/gm-create-prd/steps-c/step-09-functional.md` — D-44/45/46/47/58 changes (REQ-ID format, AC sub-bullets, OOS emission)
- `src/gomad-skills/2-plan-workflows/gm-create-prd/steps-c/step-10-nonfunctional.md` — D-56 cut target (business SLAs)
- `src/gomad-skills/2-plan-workflows/gm-create-prd/steps-c/step-11-polish.md` §2b Brainstorming Reconciliation — D-61 parallel-section template ("Coding-Agent Readiness Review")
- `src/gomad-skills/2-plan-workflows/gm-create-prd/steps-c/step-12-complete.md` — PRD-02 read-through

### Target skill — gm-product-brief (SKILL.md + prompts + template)

- `src/gomad-skills/1-analysis/gm-product-brief/SKILL.md` — D-60 light pass target (tone reword; existing scope discipline preserved)
- `src/gomad-skills/1-analysis/gm-product-brief/prompts/contextual-discovery.md` — D-60 sweep
- `src/gomad-skills/1-analysis/gm-product-brief/prompts/draft-and-review.md` — D-60 sweep
- `src/gomad-skills/1-analysis/gm-product-brief/prompts/finalize.md` — D-60 sweep
- `src/gomad-skills/1-analysis/gm-product-brief/prompts/guided-elicitation.md` — D-60 sweep
- `src/gomad-skills/1-analysis/gm-product-brief/resources/brief-template.md` — D-60 template voice alignment

### Downstream contract (READ, DO NOT MODIFY — PRD-06)

- `src/gomad-skills/2-plan-workflows/gm-validate-prd/steps-v/step-v-12-completeness-validation.md` — required structural sections: Executive Summary, Success Criteria, User Journeys, Functional Requirements, Non-Functional Requirements, Product Scope (in-scope + out-of-scope). D-58 closes existing OOS gap.
- `src/gomad-skills/2-plan-workflows/gm-validate-prd/steps-v/step-v-10-smart-validation.md` — validator-internal `FR-001` label format in its reports (NOT what the PRD emits; D-44 uses `FR-01`)
- `src/gomad-skills/3-solutioning/gm-create-epics-and-stories/steps/step-01-validate-prerequisites.md:80` — "numbered items like 'FR1:', 'Functional Requirement 1:', or similar" — D-44's `FR-01:` matches via *or similar*
- `src/gomad-skills/3-solutioning/gm-create-epics-and-stories/steps/step-02-design-epics.md` — FR-to-epic mapping format (`FR1: Epic 1 — ...`); D-44 format must round-trip
- `src/gomad-skills/3-solutioning/gm-create-architecture/steps/step-02-context.md:64` — "Extract acceptance criteria for technical implications" — D-45 inline AC sub-bullets surface through this path
- `src/gomad-skills/3-solutioning/gm-check-implementation-readiness/workflow.md` — readiness skill entry; D-50 asserts its prerequisites parse green

### Codebase conventions (already established, D-61 plans align)

- `.planning/codebase/CONVENTIONS.md` — Prettier 140-char, ESLint flat config, test file naming (`test-<thing>.js`)
- `test/test-gm-command-surface.js` — existing tarball + structural-verification pattern; D-49 integration test mirrors this shape

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- **`test/test-gm-command-surface.js`** — Phase 5/6 test harness proven in CI; uses `node --test` runner, plain assertions, reads the tarball or fixture dir and asserts structural layout. D-49's `test/integration/prd-chain/test-prd-chain.js` copies this shape (load fixture → assert layout → run deterministic skill-step checks).
- **`csv-parse` + markdown parsing utilities** — already installed dep (per Phase 6 D-27). If the integration test needs to parse the fixture PRD's FR list, a simple markdown header + list-item scan suffices (no new dep).
- **Step-file architecture itself** — `SKILL.md` → `workflow.md` → `steps-[c|v]/*.md` is the canonical pattern; D-61's new sub-step 2c in step-11 stays inside this pattern (no new file, no new step number; section-level addition).
- **Existing `data/*.md` and `data/*.csv` loading convention** — `data/prd-purpose.md`, `data/domain-complexity.csv`, `data/project-types.csv` already referenced by `cat ../data/prd-purpose.md`-style loads. D-52 adds a new section to an existing file; no new data-file contract needed.

### Established Patterns

- **Step files end with `## 🚨 SYSTEM SUCCESS/FAILURE METRICS`** — refined cuts must preserve this section; strips happen in the prose body, not the success/failure rubric.
- **A/P/C menu at end of each elicitation step** — preserved verbatim; refactoring the menu is out of scope.
- **Frontmatter `stepsCompleted` array tracking** — D-58's new `## Out of Scope` emission lives inside step-09's existing append-to-document flow; no new step number, no frontmatter contract change.
- **REQ-ID dash convention repo-wide** — `.planning/REQUIREMENTS.md` already uses `CMD-01`, `REF-03`, `INSTALL-05`, `PRD-04`, `REL-02`. D-44's `FR-01` / `NFR-01` / D-58's `OOS-01` align with this house style.
- **"Light pass" scoping** — SKILL.md's existing scope-discipline prose (gm-product-brief/SKILL.md:14–19) is a precedent for product-brief-level scope guardrails; D-60 strengthens that voice rather than rewrites it.

### Integration Points

- **`data/prd-purpose.md`** — single ingestion point for cross-cutting PRD philosophy; read by step-11 polish already (step-11-polish.md:45 "Load the PRD purpose document first"). D-52's new `## Coding-Agent Consumer Mindset` section travels into every polish run automatically.
- **`templates/prd-template.md`** — output shape contract. D-58's `## Out of Scope` placeholder lands here plus the step-09 content structure. Validator-side OOS check (step-v-12) uses markdown-header scanning, so a plain `## Out of Scope` header is sufficient.
- **`tools/installer/test/*` + `test/*.js`** — v1.1 test infrastructure. D-49's new `test/integration/prd-chain/` directory is a peer to existing `test/`, not a replacement.
- **`npm run quality`** — aggregate gate that REL-04 asserts green before publish. D-49's new test integrates here via `test:integration` script addition.

</code_context>

<specifics>
## Specific Ideas

- **FR / AC block shape** must read like this in the refined output:
  ```
  - FR-01: Authenticated user can create a draft post
      - AC: Given a logged-in user on the composer view, when they click "Save draft", then a draft record is persisted with status="draft"
      - AC: Given an unauthenticated user hitting /composer, when they attempt save, then the request returns 401 and no draft is persisted
  ```
- **Out-of-Scope block shape** mirrors `.planning/REQUIREMENTS.md:70–84`:
  ```
  ## Out of Scope
  - **OOS-01**: <capability> — Reason: <why it's excluded>
  ```
- **Coding-Agent Consumer Mindset prose** (D-52 target) should read closer to `.planning/PROJECT.md` directness — short paragraphs, no hedging, no "in order to" filler — than to step-file facilitator conversational tone.
- **Role-language rewording** (D-57) — "expert peer" → "product owner driving a coding-agent-built product". Where brevity matters (step headers, single-line role callouts), "product owner" alone with the coding-agent framing implicit from context is acceptable.

</specifics>

<deferred>
## Deferred Ideas

- **Full LLM-driven E2E pipeline test** — considered for D-48, rejected in favor of fixture-based deterministic test. Revisit if CI flake rates from fixture drift justify the API-cost + determinism tradeoff.
- **`gm-check-implementation-readiness` full snapshot test** — considered for D-50, rejected (LLM output snapshot brittleness). If readiness skill adds deterministic output formats later, upgrade D-50 from prerequisites-parse to output-structure assertion.
- **JSON dry-run format for the integration test runner** — analog to Phase 7's D-40 JSON dry-run deferral. If `test-prd-chain.js` grows enough dimensions to need structured output (e.g. CI annotations), revisit.
- **Per-FR non-capabilities list** — considered for D-58 OOS placement, rejected in favor of top-level `## Out of Scope` section. Revisit if architect feedback shows per-FR exclusions would prevent over-building more effectively than global OOS.
- **Replacing `PM facilitator` role language entirely** — considered for D-57, rejected. Revisit if future user-research signals that coding-agent-consumer posture requires a sharper role reframe ("spec writer for coding agents").
- **Sweep of `agents/` and `manifest.json` in gm-product-brief** — considered for D-60, rejected (no prose to refine). Revisit if `manifest.json.description` contains human-founder tone (plan execution will spot-check).
- **New `data/coding-agent-banned-phrases.md` as extracted banned-phrase list** — considered for D-61, deferred to planner's call. Extract only if step-09 / step-02b self-checks reuse the same list (likely by Phase 8 plan decomposition).
- **Task-skill → slash-command aliases for `gm-create-prd` / `gm-product-brief`** — already deferred at project level (REQUIREMENTS.md Future §CMD-F1); stays deferred. No conflict with Phase 8.

</deferred>

---

*Phase: 08-prd-product-brief-content-refinement*
*Context gathered: 2026-04-22*
