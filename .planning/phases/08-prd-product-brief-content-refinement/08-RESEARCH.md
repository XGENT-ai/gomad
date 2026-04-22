# Phase 8: PRD + Product-Brief Content Refinement - Research

**Researched:** 2026-04-22
**Domain:** Markdown content engineering — prompt/template refinement for LLM-consumed workflow skills, with a deterministic structural integration test preserving downstream compatibility
**Confidence:** HIGH

## Summary

Phase 8 is a **markdown content refinement** phase, not a code change. Eighteen decisions in CONTEXT.md (D-44..D-61) map to edits in 15 `steps-c/*.md` files, 1 data file, 1 template file, 1 SKILL.md, 4 prompts, and 1 resource template across two skills (`gm-create-prd`, `gm-product-brief`), plus one new Node CommonJS integration test under `test/integration/prd-chain/`.

Three insights dominate the planning surface:

1. **Structural compatibility is load-bearing.** `gm-validate-prd/steps-v/step-v-12-completeness-validation.md` does markdown-header scanning for section names (Executive Summary, Success Criteria, Product Scope, User Journeys, Functional Requirements, Non-Functional Requirements) and explicitly checks "In-scope and out-of-scope defined." `gm-create-epics-and-stories/steps/step-01-validate-prerequisites.md` extracts FRs via regex-ish matching ("FR1:", "Functional Requirement 1:", "or similar"). `gm-create-architecture/steps/step-02-context.md` pulls acceptance criteria from the PRD text. `gm-check-implementation-readiness/steps/step-01-document-discovery.md` uses filename-pattern discovery. All of these extraction surfaces are preserved by the CONTEXT.md decisions (D-44 `FR-01:` matches the *or similar* clause; D-58 new `## Out of Scope` header closes an already-existing validator expectation).
2. **`gm-product-brief` already enforces the exact discipline Phase 8 is introducing to `gm-create-prd`.** The brief's SKILL.md, prompts, resources, and agents contain ~15 instances of *explicit anti-framing* ("do NOT probe for investor / CAC / LTV / GTM", "not a commercial or investor-grade market analysis"). D-60's "light pass" is therefore genuinely light — strengthening voice and aligning the coding-agent mental model, not stripping.
3. **The integration test is structural, not LLM-driven.** D-48/49/50 lock the test shape: fixture-based, pure Node, uses existing `node --test` + plain-assertion harness proven by `test/test-gm-command-surface.js`. No API cost, no flakiness, <30s runtime, gated by `npm run quality`.

**Primary recommendation:** Execute the 18 decisions as **three or four plans** — bundled around shared-edit surfaces (SC#1 explicit cuts, SC#2 residual sweep + OOS + REQ-IDs/AC, gm-product-brief pass, integration test). Do every cut via targeted line-level edits tracked in a changelog appendix; run `npm run format:check`, `npm run lint:md`, and the new integration test at each plan gate.

## User Constraints (from CONTEXT.md)

### Locked Decisions

(Numbering continues from Phase 7's D-43.)

**REQ-ID + acceptance-criteria contract (PRD-04)**

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

**Integration test shape (PRD-07)**

- **D-48:** Integration test is **fixture-based and structural**, not LLM-driven E2E. Authored artifacts: one canonical sample PRD fixture (`fixture-refined-prd.md`), plus a Node test that (a) loads the fixture, (b) asserts structural sections present + `FR-01` / `NFR-01` ID format + `### Out of Scope` presence, (c) invokes `gm-validate-prd`'s deterministic checks (density, format, completeness — excluding LLM elicitation steps), (d) asserts `gm-create-architecture`'s step-01 and `gm-create-epics-and-stories`' step-01-validate-prerequisites parse the fixture without "missing context" errors. Deterministic, fast (<30s), CI-safe. No full LLM pipeline run; no API cost; no flaky elicitation snapshots.
- **D-49:** Test location is **`test/integration/prd-chain/`** (new top-level dir). Fixture: `test/integration/prd-chain/fixture-refined-prd.md`. Test: `test/integration/prd-chain/test-prd-chain.js`. Wired into `npm run test:integration` (new script) and gated under `npm run quality` so REL-04 catches regressions pre-publish.
- **D-50:** `gm-check-implementation-readiness` "alignment" assertion (part of SC#5) is satisfied by **deterministic-prerequisites check only** — the readiness skill's step-01 (or equivalent input-prerequisites validator) is run against the fixture chain output and must parse all required input sections without errors. No full LLM readiness elicitation, no snapshot-diff on readiness report prose.

**Aggressive framing posture (PRD-03)**

- **D-51:** Framing shift is **loud amplification**, not quiet strip. `step-02b` (vision), `step-08` (scoping), and `data/prd-purpose.md` gain explicit prose telling facilitators: "Coding agents ship faster than human teams — push MVP scope UP, not down. Vision is 1–2 declarative sentences, not a hedge."
- **D-52:** The amplification prose lives in **`data/prd-purpose.md`** as a new `## Coding-Agent Consumer Mindset` section, referenced (not duplicated) from step-02b and step-08 prompts. Single source of truth; `step-11` polish also reads `prd-purpose.md` so the same framing informs the polish check.

**Step-level strip scope — SC#1 explicit targets (PRD-01)**

- **D-53:** **step-02b-vision.md** cuts: drop the "Why now? — Why is this the right time to build this?" probe (line 78) and any time-window estimation language. Preserve vision-probe sequence (user delight, differentiation moment, core insight, problem framing, future state).
- **D-54:** **step-02c-executive-summary.md** cuts: drop stakeholder-pitch / elevator-pitch framing from the drafted summary and from the step-specific rule "Dual-audience optimized — readable by humans, consumable by LLMs" (reworded to "… consumable by coding agents"). Preserve the three content blocks verbatim.
- **D-55:** **step-03-success.md** cuts: remove section "3. Define Business Success" (lines 73–79) and "4. Challenge Vague Metrics" business-metric examples. Keep `### User Success` + `### Technical Success` template subsections and the MVP / Growth / Vision scope negotiation in section 6. Reframe the step goal as "functional completion + user outcomes observable from code behavior."
- **D-56:** **step-10-nonfunctional.md** cuts: strip "business SLAs" framing. Keep all six technical NFR categories. Compliance NFRs stay in full.

**Residual strip — SC#2 read-through targets (PRD-02)**

- **D-57:** Role language across all 15 `steps-c/*.md` files: **keep `product-focused PM facilitator`** as the role; **reword `expert peer`** → `product owner driving a coding-agent-built product` in every "Role Reinforcement" block.
- **D-58:** Refined PRDs produce a **new top-level `## Out of Scope` section after `## Functional Requirements`**. Entry format mirrors REQUIREMENTS.md style:
  ```
  ## Out of Scope
  - **OOS-01**: <capability> — Reason: <why>
  ```
- **D-59:** **step-04-journeys.md** persona depth: keep persona *name + role + goal*; strip demographic "realistic name and personality", backstory, emotional-arc probes, and the "Opening Scene / Rising Action / Climax / Resolution" narrative framework. Journey prose rewrites as action-oriented. "Minimum Coverage" list preserved.

**gm-product-brief light pass (PRD-05)**

- **D-60:** File coverage: **SKILL.md** (tone reword only), **all 4 files under `prompts/`**, and **`resources/brief-template.md`**. **Skip** `agents/` and **`manifest.json`**.

**step-11 polish retrofit**

- **D-61:** **step-11-polish.md** gains a new sub-step — section **2c "Coding-Agent Readiness Review"** (parallel to existing 2b Brainstorming Reconciliation). Includes an explicit banned-phrase checklist. Facilitator must flag occurrences, propose strip-or-rephrase, and only proceed on user approval.

### Claude's Discretion

- Fixture project domain for the integration test (D-48) — SaaS CRUD, CLI dev tool, or internal agent-ops tool.
- Fixture frontmatter shape — planner matches the template's `stepsCompleted` / `inputDocuments` / `workflowType: 'prd'` keys and adds whatever steps the fixture needs to look "complete."
- Exact prose of the new `data/prd-purpose.md` `## Coding-Agent Consumer Mindset` section (D-52) — 2–3 short paragraphs, calibrated to the existing prd-purpose.md voice.
- Exact rewording of "expert peer" occurrences (D-57) — full form or shortened variant where context covers.
- Plan decomposition — bundling all 18 decisions as one plan vs splitting into 3–4. Planner decides based on reviewability.
- Numbering / decision-of-each-cut inside the plans.
- `npm run test:integration` script wiring (D-49) — new script or folded into existing `quality` aggregate.
- Whether OOS items (D-58) also need a Reason column in the template placeholder or free-form Reason text suffices.
- Where the banned-phrase list (D-61) lives physically — inline in step-11 or extracted to `data/coding-agent-banned-phrases.md` for reuse.

### Deferred Ideas (OUT OF SCOPE)

- **Full LLM-driven E2E pipeline test** — rejected in favor of fixture-based deterministic test.
- **`gm-check-implementation-readiness` full snapshot test** — rejected (LLM output snapshot brittleness).
- **JSON dry-run format for the integration test runner** — analog to Phase 7's D-40 JSON dry-run deferral.
- **Per-FR non-capabilities list** — rejected in favor of top-level `## Out of Scope` section.
- **Replacing `PM facilitator` role language entirely** — rejected.
- **Sweep of `agents/` and `manifest.json` in gm-product-brief** — rejected (no prose to refine).
- **New `data/coding-agent-banned-phrases.md` as extracted banned-phrase list** — deferred to planner's call; extract only if step-09 / step-02b self-checks reuse the same list.
- **Task-skill → slash-command aliases for `gm-create-prd` / `gm-product-brief`** — already deferred at project level (REQUIREMENTS.md Future §CMD-F1); stays deferred.

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PRD-01 | Step 02b/02c/03/10 strip human-founder framing | Located line-level cut targets: step-02b L77 "Why now?"; step-02c L69 "readable by humans, consumable by LLMs" + L76 review pitch; step-03 L73–79 Business Success + L86 "good adoption" / L85 "10,000 users" examples; step-10 L87 "seasonal or event-based traffic spikes" + step-10 L99 NFR template `business hours uptime` from prd-purpose.md |
| PRD-02 | Read-through of 01, 01b, 04, 05, 06, 07, 08, 09, 11, 12 | Identified additional targets from grep: step-08 L55 "What would make investors/partners say 'this has potential'?"; step-04 L74 "realistic name and personality" + L83-86 Opening/Rising/Climax/Resolution framework; prd-purpose.md L10 "Human Product Managers" + L99 "business hours uptime"; role-language hits at step-01, step-01b, step-02, step-02b, step-02c, step-05 "expert peer" |
| PRD-03 | Amplify aggressive vision + MVP scope | D-51/D-52 lock amplification into `data/prd-purpose.md` new section, referenced from step-02b + step-08 + step-11-polish |
| PRD-04 | Dev-ready requirements (REQ-IDs, AC, OOS, boundaries) | D-44 REQ-ID format; D-45 inline AC sub-bullets; D-46 AC density floor 2; D-47 Gherkin AC; D-58 OOS section |
| PRD-05 | gm-product-brief light pass | D-60 defines 6-file coverage; grep confirms existing anti-framing guardrails in SKILL.md L14–19, L104; draft-and-review L18, L53; guided-elicitation L70–77; brief-template L5, L77, L82 |
| PRD-06 | Structural compatibility preserved | Downstream contracts mapped: step-v-12 (section headers), step-v-10 (internal `FR-001` label not touched), epics step-01 ("or similar" clause), architecture step-02 (AC extraction), readiness step-01 (filename discovery) |
| PRD-07 | Integration test | D-48/D-49/D-50 define fixture-based deterministic test shape under `test/integration/prd-chain/` |

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Workflow facilitation prompts (step files) | Skill file (markdown) | — | `gm-create-prd` / `gm-product-brief` are skill directories; step files are the authoritative prompts the agent follows at runtime |
| PRD philosophy / mindset guidance | Skill data file (`data/prd-purpose.md`) | Referenced from step-02b, step-08, step-11 | Single source of truth convention; `cat ../data/prd-purpose.md` already used in step-11-polish.md L45 |
| Output-document shape contract | Skill template (`templates/prd-template.md`) | Validator (`step-v-12`) scans for section headers | D-58's `## Out of Scope` header lands in template + emission step (step-09) |
| Product-brief structure | Skill resource (`resources/brief-template.md`) | Feeds into gm-create-prd's step-01 input-document discovery | Template voice alignment is a one-way dependency |
| Integration test | Node CommonJS test file (`test/integration/prd-chain/test-prd-chain.js`) | Fixture markdown + package.json script wiring | Follows `test/test-gm-command-surface.js` pattern; runs outside any skill runtime |
| Fixture PRD | Markdown file (`test/integration/prd-chain/fixture-refined-prd.md`) | — | Static artifact committed to repo; represents "ideal output" of the refined skills |
| `npm run quality` gate | package.json scripts | Gates REL-04 (Phase 9) | New `test:integration` script integrates here |

## Standard Stack

### Core (zero-new-runtime-deps per project STATE.md decision)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `node --test` | Node ≥ 18.11 | Integration test runner | [VERIFIED: existing `test/test-gm-command-surface.js`, `test/test-cleanup-planner.js` use plain Node assertions — no external runner] |
| `fs-extra` | existing dep | Filesystem operations in the test | [VERIFIED: required in `test-gm-command-surface.js:29`] |
| `js-yaml` | existing dep | Fixture frontmatter parsing | [VERIFIED: required in `test-gm-command-surface.js:30`] |
| `glob` | existing dep | Directory scanning if needed | [VERIFIED: required in `test-gm-command-surface.js:31`] |
| `chalk` | existing dep | CLI color output per CONVENTIONS.md | [VERIFIED: CONVENTIONS.md L132 "Chalk library used for colored output"] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `csv-parse` | existing dep | Not needed for Phase 8 | Only if fixture grows CSV-shaped assertions (unlikely) |
| `node:assert` | built-in | Phase 8 test assertions | Use `assert.ok`, `assert.strictEqual`, `assert.match` |
| `node:fs` / `node:path` | built-in | Fixture loading | Use `node:` prefix per CONVENTIONS.md |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Node built-in `assert` | `chai` / `jest-expect` | Rejected — CONVENTIONS.md shows plain assertions; adds dep for no gain |
| `node --test` runner | `vitest` / `jest` | Rejected — existing test files are plain `node` invocations, zero-new-deps constraint |
| Fixture-based structural test | Full LLM E2E run | Rejected per D-48 — flaky, API cost, snapshot brittleness |

**Installation:** No new packages. Phase 8 uses existing `package.json` dependencies only. [VERIFIED: STATE.md line 53 "Zero new runtime deps — every v1.2 capability uses existing package.json dependencies"]

**Version verification:** Not applicable — no new packages to install. Existing deps `fs-extra`, `js-yaml`, `glob` locked at current package.json versions; no changes required.

## Architecture Patterns

### System Architecture Diagram

Data flow through the refined pipeline + integration test:

```
┌──────────────────────────────────┐
│  Human facilitator invokes       │
│  gm-create-prd skill             │
└────────────────┬─────────────────┘
                 │ (sequence: step-01 → step-12)
                 ▼
┌──────────────────────────────────┐       ┌─────────────────────────┐
│  steps-c/ prompts drive          │ reads │  data/prd-purpose.md    │
│  collaborative elicitation       │◄──────┤   (incl. new Coding-    │
│  (refined in Phase 8)            │       │    Agent Consumer       │
│                                  │       │    Mindset section)     │
└────────────────┬─────────────────┘       └─────────────────────────┘
                 │ append-only writes
                 ▼
┌──────────────────────────────────┐       ┌─────────────────────────┐
│  {planning_artifacts}/prd.md     │◄──────┤  templates/prd-         │
│  (output PRD document)           │ copy  │   template.md           │
│   - Executive Summary            │ base  │   (incl. Out of Scope   │
│   - Success Criteria             │       │    placeholder)         │
│   - Product Scope                │       └─────────────────────────┘
│   - User Journeys                │
│   - Functional Requirements      │
│     (FR-01 / FR-02 / ...)        │
│       - AC: Given/When/Then      │
│   - Out of Scope (OOS-01...)     │  ← NEW SECTION per D-58
│   - Non-Functional Requirements  │
│     (NFR-01 / NFR-02 / ...)      │
└────────────────┬─────────────────┘
                 │ downstream read (structure preserved, no skill edits)
                 ▼
        ┌────────┴─────────┬─────────────────────┬────────────────────┐
        ▼                  ▼                     ▼                    ▼
┌──────────────┐  ┌────────────────┐  ┌──────────────────┐  ┌────────────────┐
│ gm-validate- │  │ gm-create-     │  │ gm-create-       │  │ gm-check-      │
│ prd          │  │ architecture   │  │ epics-and-       │  │ implementation-│
│              │  │                │  │ stories          │  │ readiness      │
│ step-v-12    │  │ step-02        │  │ step-01          │  │ step-01        │
│ scans        │  │ extracts AC    │  │ extracts FRs via │  │ discovers      │
│ headers      │  │ from FR blocks │  │ "FR1: or sim."   │  │ files by name  │
└──────────────┘  └────────────────┘  └──────────────────┘  └────────────────┘

                           Phase 8 Integration Test:
┌─────────────────────────────────────────────────────────────────────────┐
│  test/integration/prd-chain/test-prd-chain.js  (Node CommonJS)          │
│    1. Load fixture-refined-prd.md                                       │
│    2. Assert structural sections + FR-NN / NFR-NN + ## Out of Scope     │
│    3. Run gm-validate-prd deterministic checks (step-v-12 sections)     │
│    4. Run gm-create-architecture step-02 input-parse (no LLM call)      │
│    5. Run gm-create-epics-and-stories step-01 FR extraction             │
│    6. Run gm-check-implementation-readiness step-01 discovery           │
│  Gated by: npm run test:integration → npm run quality                   │
└─────────────────────────────────────────────────────────────────────────┘
```

### Recommended Project Structure

```
src/gomad-skills/2-plan-workflows/gm-create-prd/
├── SKILL.md                       # unchanged
├── workflow.md                    # L10 "expert peer" → "product owner driving..."
├── data/
│   ├── prd-purpose.md             # +## Coding-Agent Consumer Mindset section
│   ├── domain-complexity.csv      # unchanged
│   └── project-types.csv          # unchanged
├── templates/
│   └── prd-template.md            # +## Out of Scope placeholder
└── steps-c/
    ├── step-01-init.md            # role reword only (PRD-02)
    ├── step-01b-continue.md       # role reword only
    ├── step-02-discovery.md       # role reword only
    ├── step-02b-vision.md         # D-53: drop L77 "Why now?" + reference prd-purpose new section
    ├── step-02c-executive-summary.md # D-54: drop pitch framing + "consumable by LLMs" → "consumable by coding agents"
    ├── step-03-success.md         # D-55: drop §3 Business Success, §4 business-metric examples
    ├── step-04-journeys.md        # D-59: strip backstory/realistic name/Opening-Climax framework
    ├── step-05-domain.md          # PRD-02 read-through (role reword only expected)
    ├── step-06-innovation.md      # PRD-02 read-through
    ├── step-07-project-type.md    # PRD-02 read-through
    ├── step-08-scoping.md         # D-52: reference prd-purpose new section; L55 "investors/partners" rephrase
    ├── step-09-functional.md      # D-44,45,46,47,58: REQ-IDs, inline AC sub-bullets, Quality Check floor=2, OOS emission
    ├── step-10-nonfunctional.md   # D-56: strip "seasonal/event-based"; rephrase business SLAs
    ├── step-11-polish.md          # D-61: +§2c Coding-Agent Readiness Review with banned-phrase checklist
    └── step-12-complete.md        # PRD-02 read-through (final wrap-up copy)

src/gomad-skills/1-analysis/gm-product-brief/
├── SKILL.md                       # D-60: tone reword only (keep scope discipline prose)
├── manifest.json                  # SKIP per D-60
├── agents/                        # SKIP per D-60 (pointer dir, no prose)
├── prompts/
│   ├── contextual-discovery.md    # D-60 sweep
│   ├── draft-and-review.md        # D-60 sweep
│   ├── finalize.md                # D-60 sweep
│   └── guided-elicitation.md      # D-60 sweep
└── resources/
    └── brief-template.md          # D-60: voice alignment w/ refined gm-create-prd

test/integration/prd-chain/        # NEW top-level dir
├── fixture-refined-prd.md         # canonical sample PRD
└── test-prd-chain.js              # Node CommonJS test, node --test style
```

### Pattern 1: Additive-only markdown edits with preserved section scaffolding

**What:** Each cut is a targeted line-range removal or rewording that preserves:
- Top-level `##` section headers (validator scans these)
- `🚨 SYSTEM SUCCESS/FAILURE METRICS` rubric at file end (workflow contract)
- A/P/C menu blocks (elicitation contract)
- `stepsCompleted` append-flow (frontmatter contract)
- Numbered section hierarchy (`### 1.`, `### 2.` — step-04 renumbers if "Create Narrative Story-Based Journeys" §2 is restructured)

**When to use:** Every step-file edit in Phase 8.

**Example (D-53 step-02b cut):**
```markdown
### 3. Understand the Vision

Dig deeper into the product vision:

- **Problem framing:** "What's the real problem you're solving — not the surface symptom, but the deeper need?"
- **Future state:** "When this product is successful, what does the world look like for your users?"
- **Why now:** "Why is this the right time to build this?"     ← DROP this bullet
```

After edit:
```markdown
### 3. Understand the Vision

Dig deeper into the product vision:

- **Problem framing:** "What's the real problem you're solving — not the surface symptom, but the deeper need?"
- **Future state:** "When this product is successful, what does the world look like for your users?"
```

**Source:** `src/gomad-skills/2-plan-workflows/gm-create-prd/steps-c/step-02b-vision.md:71-77` (verified by Read)

### Pattern 2: Single source of truth via `data/` file reference

**What:** D-52's new `## Coding-Agent Consumer Mindset` prose lives ONLY in `data/prd-purpose.md`. Consumer step files (02b, 08, 11) reference it, never duplicate.

**When to use:** Cross-cutting guidance that multiple steps must share.

**Example:**
```markdown
### 2. [step-08 section referencing mindset]

Load the Coding-Agent Consumer Mindset from `../data/prd-purpose.md` before
facilitating MVP scope negotiation. Key calibration: coding agents ship faster
than human teams — push MVP scope UP, not down.
```

**Source:** Pattern established by `step-11-polish.md:44` (`cat ../data/prd-purpose.md` load).

### Pattern 3: New inline AC sub-bullets under FR items (D-45)

**What:** Functional requirements emit as top-level bullets; acceptance criteria as indented `- AC:` sub-bullets. No separate `## Acceptance Criteria` section.

**When to use:** step-09 content structure emission.

**Example (for the fixture and the refined prompt):**
```markdown
## Functional Requirements

### User Management

- FR-01: Authenticated user can create a draft post
    - AC: Given a logged-in user on the composer view, when they click "Save draft", then a draft record is persisted with status="draft"
    - AC: Given an unauthenticated user hitting /composer, when they attempt save, then the request returns 401 and no draft is persisted

- FR-02: User can publish a draft post
    - AC: Given an existing draft, when the author clicks "Publish", then the post status transitions to "published" and publishedAt is set
    - AC: Given a published post, when the author clicks "Publish" again, then the action is a no-op and no duplicate is created
```

**Source:** CONTEXT.md specifics block.

### Pattern 4: Node CommonJS integration test mirroring `test-gm-command-surface.js`

**What:** One-file test using `node --test`, plain `assert` from `node:assert`, colored output via chalk, sequential phases (Load → Structural → Validator-sim → Architecture-sim → Epics-sim → Readiness-sim), exit code 0 or 1.

**When to use:** `test/integration/prd-chain/test-prd-chain.js`.

**Example skeleton (to be fleshed out in plan):**
```javascript
// test/integration/prd-chain/test-prd-chain.js
const path = require('node:path');
const fs = require('fs-extra');
const yaml = require('js-yaml');

const FIXTURE_PATH = path.join(__dirname, 'fixture-refined-prd.md');

function assertStructuralSections(raw) {
  const required = [
    '## Executive Summary',
    '## Success Criteria',
    '## Product Scope',
    '## User Journeys',
    '## Functional Requirements',
    '## Out of Scope',
    '## Non-Functional Requirements',
  ];
  for (const header of required) {
    if (!raw.includes(header)) {
      throw new Error(`Missing required section: ${header}`);
    }
  }
}

function assertFRIdFormat(raw) {
  // Must match FR-01, FR-02, ..., FR-99 (2-digit zero-padded, dash-separated)
  const frMatches = raw.match(/^- FR-\d{2}:/gm) ?? [];
  if (frMatches.length === 0) {
    throw new Error('Fixture contains no FR-NN: lines');
  }
  // Reject legacy FR1: / FR-1: format to guard regression
  if (/^- FR\d+:/m.test(raw) || /^- FR-\d:/m.test(raw)) {
    throw new Error('Found legacy FR ID format; all FRs must be FR-NN (2-digit)');
  }
}

// ...additional phases...
```

**Source:** `test/test-gm-command-surface.js:26-46` (structure), CONVENTIONS.md L37–58 (style).

### Anti-Patterns to Avoid

- **Refactoring step-file architecture to make cuts cleaner:** Out of scope per CONTEXT.md domain boundary. Edit in place; preserve all contracts.
- **Adding LLM-dependent assertions to the integration test:** D-48 locked it deterministic. Any "does this read well to a coding agent?" assertion is wrong-shape — it belongs in `step-11-polish.md`'s banned-phrase checklist, not the test.
- **Duplicating Coding-Agent Consumer Mindset prose inline in step-02b or step-08:** Breaks D-52 single-source convention. Reference only.
- **Changing the `FR-001` label format inside `gm-validate-prd/steps-v/step-v-10-smart-validation.md`:** That's validator-internal output; PRD-side uses `FR-01`. They don't need to match. Do NOT "normalize."
- **Stripping `product-focused PM facilitator` role:** Deferred item rejects this. Only `expert peer` is reworded.
- **Removing A/P/C menus "because they feel verbose":** Elicitation contract; out of scope.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Markdown frontmatter parsing in integration test | Custom `---` delimiter splitter | `js-yaml` (existing dep) with manual `---` block split OR regex `/^---\n([\s\S]*?)\n---/` per `test-gm-command-surface.js:80` | Established pattern; handles edge cases |
| Section-header scanning | Regex with capture groups and state machine | Plain `raw.includes('## Section Name')` sufficient for D-48's structural check | Headers are stable ASCII; validator step-v-12 uses same approach |
| Integration test runner | Custom harness | `node --test` (Node ≥ 18.11 built-in) OR plain-script `assert` flow | Matches repo convention; no new deps |
| FR extraction regex | Complex multi-line state | Simple `raw.match(/^- FR-\d{2}:/gm)` | Strict D-44 format makes this one-line |
| AC-count-per-FR check | Tokenizer + AST | Split FR blocks on blank lines or next `- FR-` start, count `- AC:` lines | Matches D-46 floor-of-2 assertion cleanly |
| Banned-phrase scanner for step-11 § 2c | Regex with context-aware exclusions | Simple case-insensitive string search with exceptions listed in prose | Facilitator validates false positives manually — this is a prompt, not automation |
| Diff reporting for integration test | Unified-diff library | Plain "missing X" / "found forbidden Y" messages | CI output is enough; users investigate via file inspection |

**Key insight:** Phase 8 is markdown-content + one simple Node test. Every candidate for hand-rolling is already solved by existing deps or built-in Node capabilities. Do NOT introduce new packages. STATE.md locks zero-new-runtime-deps.

## Common Pitfalls

### Pitfall 1: Breaking downstream extraction by "improving" FR format beyond D-44

**What goes wrong:** Planner/implementer decides `FR-01` is ugly, switches to `**FR-01:**` bold or moves FRs to a table.
**Why it happens:** Markdown aesthetics; table format "looks cleaner for multiple AC."
**How to avoid:** Lock the format via integration test assertion (reject anything not `- FR-NN:` at start of line). D-45 specifies bullet hierarchy specifically because tables break sub-bullet extraction in `gm-create-architecture/steps/step-02-context.md:64`.
**Warning signs:** Integration test passing but epics skill fails with "no FRs found" on a real run.

### Pitfall 2: Inconsistent line-number drift during cuts

**What goes wrong:** D-53's "drop line 77" becomes "drop line 78" after an earlier step file cut shifted numbering. Multi-file plan tries to cut by line number.
**Why it happens:** CONTEXT.md references current line numbers; iterative edits shift them.
**How to avoid:** Cut by content signature (e.g., `"Why now: ..."`), not line number. Plan documents the content being cut verbatim; verifies via grep after each plan.
**Warning signs:** Plan-level diff is unexpectedly large or touches wrong lines.

### Pitfall 3: Missing the `## Out of Scope` emission in step-09

**What goes wrong:** D-58 adds the template placeholder, but step-09-functional.md content structure isn't updated to emit the block. Refined PRDs have `{{ Out of Scope }}` placeholder unfilled.
**Why it happens:** Template and emission flow are in different files; easy to update one and forget the other.
**How to avoid:** Plan explicitly lists BOTH `templates/prd-template.md` placeholder AND `steps-c/step-09-functional.md` content structure "### [Capability Area Name]" section. Integration test's fixture must have `## Out of Scope` populated; `step-v-12`-simulation asserts it.
**Warning signs:** Template variable scan in `step-v-12-completeness-validation.md` §1 finds `{{out_of_scope}}` remaining.

### Pitfall 4: Regression in `gm-product-brief` existing scope discipline

**What goes wrong:** D-60 "light pass" accidentally weakens existing guardrails ("do NOT probe for CAC/LTV/GTM") by reinterpreting them as human-founder framing and stripping them.
**Why it happens:** Grep hits for "CAC", "LTV", "investor" appear in BOTH guardrail prose (good — keep) AND historical framing (bad — strip). Distinguishing requires reading context.
**How to avoid:** Every `gm-product-brief` edit diff must be reviewed line-by-line. The SKILL.md L14–19 scope block, draft-and-review.md L18, guided-elicitation.md L70–77 are GUARDRAILS — strengthen, don't remove. Retain semantic preservation: "do NOT probe for X" stays.
**Warning signs:** Post-edit grep for "CAC" / "LTV" / "investor" / "GTM" in gm-product-brief returns zero hits (should still hit the guardrail mentions).

### Pitfall 5: step-04 renumbering breaks the numbered section contract

**What goes wrong:** D-59 strips §2 "Create Narrative Story-Based Journeys" → following sections (§3 Guide Journey Exploration, §4 Connect Journeys to Requirements, etc.) are renumbered, breaking any cross-references.
**Why it happens:** Markdown section numbers are just text; no automatic renumbering.
**How to avoid:** Plan-level task: `grep -n "### [0-9]" step-04-journeys.md` after edit, verify sequence is monotonic. Alternative: restructure §2 to retain the header but replace body (keeps numbering stable).
**Warning signs:** step-04's section numbers skip or duplicate; internal references like "using structure from step 6" point to wrong content.

### Pitfall 6: Integration test false-pass via overly permissive regex

**What goes wrong:** `assertFRIdFormat` uses `/FR[-\d]+/` which matches BOTH new `FR-01` and legacy `FR1` / `FR-1` — test passes on pre-refinement fixture.
**Why it happens:** Initial test author loosens regex to "accept a range of formats."
**How to avoid:** Test MUST assert both (a) presence of `FR-\d{2}:` AND (b) ABSENCE of legacy formats. Negative tests: commit a mutation (fixture with `FR1:`) to the test fixture directory as a "known-bad" and confirm the test rejects it. Phase 5's `test-gm-command-surface.js:Phase B` uses exactly this pattern.
**Warning signs:** Test passes against pre-refinement PRD; or passes when fixture has mixed `FR-01` and `FR5:` formats.

### Pitfall 7: `npm run test:integration` added but not wired into `quality`

**What goes wrong:** Integration test works locally, CI's `npm run quality` doesn't invoke it; regressions ship.
**Why it happens:** `scripts.quality` in package.json is a long concat; easy to miss when appending a new script.
**How to avoid:** Plan explicitly asserts `npm run quality` output lists `test:integration` invocation. Verification: `node -e "console.log(require('./package.json').scripts.quality)"` prints command including `test:integration`.
**Warning signs:** D-49's REL-04 hook is silent; Phase 9's release flow won't catch PRD-chain regressions.

## Code Examples

Verified patterns from official sources in this repo:

### Structural fixture loading + YAML frontmatter extract

```javascript
// Source: test/test-gm-command-surface.js:79-80 (verified)
const raw = fs.readFileSync(stubPath, 'utf8');
const match = raw.match(/^---\n([\s\S]*?)\n---/);
const frontmatter = match ? yaml.load(match[1]) : {};
const body = match ? raw.slice(match[0].length) : raw;
```

### Section-header presence assertion

```javascript
// Pattern derived from gm-validate-prd/steps-v/step-v-12-completeness-validation.md:74-78
// (validator scans PRD for required section names — integration test mirrors this)
const REQUIRED_SECTIONS = [
  '## Executive Summary',
  '## Success Criteria',
  '## Product Scope',
  '## User Journeys',
  '## Functional Requirements',
  '## Out of Scope',              // ← new per D-58
  '## Non-Functional Requirements',
];
for (const header of REQUIRED_SECTIONS) {
  assert.ok(body.includes(header), `Missing required section: ${header}`);
}
```

### FR ID format + AC density assertions

```javascript
// Source: D-44 (FR-NN format) + D-46 (≥2 AC floor)
function extractFRBlocks(body) {
  // Split on FR-NN: line starts; capture block until next FR-NN: or next section
  const lines = body.split('\n');
  const blocks = [];
  let current = null;
  for (const line of lines) {
    if (/^- FR-\d{2}:/.test(line)) {
      if (current) blocks.push(current);
      current = { fr: line, acs: [] };
    } else if (current && /^    - AC:/.test(line)) {
      current.acs.push(line);
    } else if (current && /^##/.test(line)) {
      blocks.push(current);
      current = null;
    }
  }
  if (current) blocks.push(current);
  return blocks;
}

const frBlocks = extractFRBlocks(body);
assert.ok(frBlocks.length > 0, 'No FR-NN blocks found');
for (const block of frBlocks) {
  assert.ok(block.acs.length >= 2, `${block.fr} has only ${block.acs.length} AC sub-bullets (need ≥2)`);
  assert.ok(block.acs.length <= 4, `${block.fr} has ${block.acs.length} AC sub-bullets (cap at 4)`);
  for (const ac of block.acs) {
    assert.match(ac, /Given .+, when .+, then .+/, `AC not in Given/When/Then form: ${ac}`);
  }
}
```

### Downstream-skill compatibility check (epics step-01 FR extraction simulation)

```javascript
// Source: src/gomad-skills/3-solutioning/gm-create-epics-and-stories/steps/step-01-validate-prerequisites.md:80
// "Look for numbered items like 'FR1:', 'Functional Requirement 1:', or similar"
// D-44's FR-01: matches the "or similar" clause — simulate the extraction
const epicsSeenFRs = [];
for (const line of body.split('\n')) {
  const m = line.match(/^- (FR-\d{2}): (.+)$/);
  if (m) epicsSeenFRs.push({ id: m[1], text: m[2] });
}
assert.ok(epicsSeenFRs.length > 0, 'gm-create-epics-and-stories step-01 would find zero FRs');
```

### `## Out of Scope` block format check

```javascript
// Source: D-58 + .planning/REQUIREMENTS.md L70-84 style
const oosBlockMatch = body.match(/^## Out of Scope\n([\s\S]*?)(?=\n##|\n*$)/m);
assert.ok(oosBlockMatch, 'Missing ## Out of Scope block');
const oosLines = oosBlockMatch[1].split('\n').filter(l => l.trim().startsWith('- '));
assert.ok(oosLines.length > 0, 'Out of Scope block is empty');
for (const line of oosLines) {
  assert.match(line, /^- \*\*OOS-\d{2}\*\*: .+ — Reason: .+/, `OOS line not in expected format: ${line}`);
}
```

### package.json script wiring (for D-49 `test:integration`)

```json
{
  "scripts": {
    "test:integration": "node test/integration/prd-chain/test-prd-chain.js",
    "quality": "npm run format:check && npm run lint && npm run lint:md && npm run docs:build && npm run test:install && npm run test:integration && npm run validate:refs && npm run validate:skills"
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `FR1:` / `FR2:` unpadded sequential | `FR-01` / `FR-02` zero-padded with dash | Phase 8 (D-44) | Lexicographic sort up to 99; matches REL-05 / PRD-04 house style |
| Separate `## Acceptance Criteria` section | Inline `- AC:` sub-bullets under each FR | Phase 8 (D-45) | Capability + verification co-located; architect's AC-extraction path (step-02-context.md:64) reads the same FR block |
| Persona story framework (Opening/Rising/Climax/Resolution) | Action-oriented journey prose ("Actor performs X, system responds Y") | Phase 8 (D-59) | Tighter, machine-readable; preserves Minimum Coverage list that downstream capability extraction depends on |
| "Why now?" / business-SLA / ARR-CAC-LTV framing | Stripped; code-behavior-observable reframing | Phase 8 (D-51 to D-56) | Aligns with coding-agent consumer; amplifies aggressive MVP scope |
| `expert peer` role language | `product owner driving a coding-agent-built product` | Phase 8 (D-57) | Mental-model reset for facilitators; preserves PM facilitator role |
| Human-only `## Out of Scope` awareness | Explicit top-level `## Out of Scope` section with `OOS-NN` IDs | Phase 8 (D-58) | Closes existing validator gap (step-v-12 already expected "in-scope and out-of-scope defined") |

**Deprecated/outdated:**
- `stakeholder pitch` / `elevator pitch` framing in step-02c → replaced by direct vision/differentiator drafting
- "realistic name and personality" backstory probe in step-04 → replaced by name + role + goal only
- Business success metrics subsection in step-03 (§3 "Define Business Success", L73–79) → removed entirely
- "business hours uptime" NFR example in prd-purpose.md:99 → reframed as "system uptime" (D-56 cascade)

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `node --test` built-in runner available in target Node version | Standard Stack | Low — Node 18.11+ is >2 years old; CONVENTIONS.md Phase 5 tests already use plain-script style with `node test/test-*.js`, compatible with either plain assertions or `node --test`. Fallback: plain-script style (what Phase 5/6/7 tests already use). [ASSUMED] |
| A2 | `gm-validate-prd` has no step file that hard-codes `FR1:` as a literal (only `FR-001` in its own generated reports) | Downstream Contract | Low — I read step-v-10 L1-60 and step-v-12 in full; neither asserts PRD-side `FR1:` literal. Grep of the validator dir would confirm. Risk: if a step-v-* I didn't read asserts `FR1:` exactly, D-44's `FR-01` would fail validation. Recommend: plan adds a one-time grep of `gm-validate-prd/steps-v/*.md` for literal `FR1:` / `FR2:` to confirm. [ASSUMED] |
| A3 | The integration test doesn't need to spawn the skill runtime (LLM-free is sufficient for SC#5) | Test Shape | Low — D-48/D-49/D-50 locked this. If SC#5 is later reinterpreted to require real LLM runs, test upgrades to snapshot-based, not restructured. [VERIFIED: CONTEXT.md D-48] |
| A4 | `## Out of Scope` as a top-level H2 between `## Functional Requirements` and `## Non-Functional Requirements` doesn't break downstream skills' filename/section-path assumptions | Downstream Contract | Low — step-v-12 scans for header presence, not order; architect/epics/readiness extract by pattern, not by positional offset. Recommend: integration test asserts section ORDER matches the template, not just presence, as a belt-and-braces check. [ASSUMED] |
| A5 | `test:integration` added into `npm run quality` won't increase quality-run wall time beyond tolerable CI budget | Tooling | Low — D-48 caps the new test at <30s deterministic. Existing `quality` runs include `npm run test:install` which spawns tarball + install; that's already >30s. Integration test is additive but cheap. [ASSUMED] |
| A6 | The planner's chosen fixture project domain (SaaS / CLI / agent-ops) can yield ~20 FRs + 5 NFRs + 3 OOS items in <300 lines | Fixture | Low — discretion-level; if too dense, fixture can be ~400 lines without breaking CI budget. Recommend: fixture uses a CLI dev tool domain because its FR/NFR/OOS boundaries are the cleanest to articulate within 300 lines. [ASSUMED] |
| A7 | `step-04-journeys.md` renumbering after §2 restructure doesn't break any internal cross-reference like "using structure from section 6" | Edit Safety | Medium — step-04:158 explicitly references "using structure from step 6"; removing §2 sub-structure without renumbering §6 or rewriting that reference would cause drift. Recommend: plan treats §2 body rewrite as in-place body replacement (preserve §2 header), NOT section deletion. [ASSUMED — mitigation is to rewrite in place] |

**If this table is empty:** (N/A — 7 assumptions logged above; planner + discuss-phase should confirm A2 and A7 before execution.)

## Open Questions (RESOLVED)

1. **Does `gm-validate-prd` have any step file that asserts a specific `FR\d+:` literal on the PRD side?**
   - What we know: step-v-10 and step-v-12 do not (read in full). step-v-10 generates `FR-001` labels in its own output reports, which D-44 correctly identifies as validator-internal.
   - What's unclear: I did not read step-v-01 through step-v-09, step-v-11, step-v-13 in full. There could be a regex elsewhere asserting legacy `FR\d+:` format.
   - Recommendation: RESOLVED: plan's first task includes `grep -n "FR\d*:" src/gomad-skills/2-plan-workflows/gm-validate-prd/steps-v/*.md` and categorizes each hit as (a) PRD-side assertion needing D-44 compat, (b) validator-internal output (safe), (c) prose example (safe but could be updated for consistency).

2. **Do any planning artifacts in `.planning/` reference the refined PRD format and require updating?**
   - What we know: CONTEXT.md `<deferred>` notes "historical planning artifacts (.planning/, old milestone docs) are left untouched as archived history" but that's Phase 9's REF-01 scope, not Phase 8.
   - What's unclear: whether `.planning/REQUIREMENTS.md`'s `PRD-04` line or `PROJECT.md` needs an FR-NN reference update as part of Phase 8.
   - Recommendation: RESOLVED: Plan 08 treats `.planning/` as read-only; any downstream doc alignment happens in Phase 9 reference sweep.

3. **Should the `## Coding-Agent Consumer Mindset` section in `data/prd-purpose.md` have its own banned-phrase checklist, or is that redundant with step-11's §2c?**
   - What we know: D-61 places the checklist in step-11-polish.md as an execution gate.
   - What's unclear: whether the mindset-section prose should enumerate the forbidden vocabulary as a "don't do" list, reinforcing step-11.
   - Recommendation: RESOLVED: keep the mindset section aspirational/positive ("do this") and leave the negative checklist in step-11. DRY by reference if the banned list later grows.

4. **Should `prd-template.md` add the `FR-01` / `NFR-01` / `OOS-01` placeholders as literal examples, or only section headers?**
   - What we know: Current template is minimal (frontmatter + title + author/date). D-58 adds `## Out of Scope` header.
   - What's unclear: whether the template should include example entries like `- FR-01: [capability]` under `## Functional Requirements` as a style primer for the LLM that's filling it in.
   - Recommendation: RESOLVED: header-only placeholders, NO literal FR-01/NFR-01/OOS-01 example entries. This disposition coexists with D-58, which mandates the `## Out of Scope` H2 header itself in the template as a placeholder — the header goes into the template (per D-58), but no example rows are added beneath it. Step-09's Content Structure is the authoritative source of populated `- **OOS-NN**: ...` example lines; the template's job is the structural scaffold that the validator (step-v-12) header-scans.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | integration test + existing scripts | ✓ | ≥ 18.11 (implied by repo's `node --test`-compatible test files) | — |
| `fs-extra` | integration test fixture I/O | ✓ | existing dep | — |
| `js-yaml` | frontmatter parsing | ✓ | existing dep | — |
| `glob` | optional — not required for single-fixture test | ✓ | existing dep | — |
| `chalk` | integration test colored output (optional) | ✓ | existing dep | — |
| npm scripts: `quality`, `test:install`, `validate:refs`, `validate:skills` | `npm run quality` wiring | ✓ | defined in package.json L56–66 | — |
| No new runtime deps | Phase 8 scope | — | — | — |

**Missing dependencies with no fallback:** None.

**Missing dependencies with fallback:** None.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Plain Node CommonJS scripts with `node:assert` and ad-hoc pass/fail counters, matching `test/test-gm-command-surface.js` pattern |
| Config file | None — each test is a standalone `.js` file invoked via `node test/**/*.js` |
| Quick run command | `node test/integration/prd-chain/test-prd-chain.js` |
| Full suite command | `npm run quality` (integration test gated under this after D-49 wiring) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PRD-01 | step-02b/02c/03/10 human-founder framing removed | static grep | `! grep -qE "(why now\\?|investor|ARR\\|CAC\\|LTV\\|MRR\\|DAU\\|MAU\\|stakeholder pitch\\|elevator pitch\\|seasonal or event-based)" src/gomad-skills/2-plan-workflows/gm-create-prd/steps-c/step-0{2b,2c,3,10}*.md` | ❌ Wave 0 grep script |
| PRD-02 | residual framing stripped across all steps-c | static grep | same pattern across all 15 steps-c files | ❌ Wave 0 |
| PRD-03 | `data/prd-purpose.md` contains `## Coding-Agent Consumer Mindset` section | static grep | `grep -q "^## Coding-Agent Consumer Mindset" src/gomad-skills/2-plan-workflows/gm-create-prd/data/prd-purpose.md` | ❌ Wave 0 |
| PRD-04 | fixture has `FR-NN:` format + AC sub-bullets (≥2, ≤4, Given/When/Then); has `## Out of Scope` with `OOS-NN` entries | integration test | `node test/integration/prd-chain/test-prd-chain.js` | ❌ Wave 0 |
| PRD-05 | gm-product-brief prose voice aligned (no elevator-pitch / Why-now / human-founder phrases BUT keep guardrail prose); template references coding-agent mental model | static grep + manual diff review | `grep` pass + manual review of diff | ❌ Wave 0 grep script |
| PRD-06 | downstream skill dirs (`gm-validate-prd`, `gm-create-architecture`, `gm-create-epics-and-stories`, `gm-check-implementation-readiness`) are byte-for-byte unchanged | git diff | `git diff --exit-code src/gomad-skills/2-plan-workflows/gm-validate-prd/ src/gomad-skills/3-solutioning/gm-create-architecture/ src/gomad-skills/3-solutioning/gm-create-epics-and-stories/ src/gomad-skills/3-solutioning/gm-check-implementation-readiness/` against phase-8-baseline ref | ❌ Wave 0 baseline tag |
| PRD-07 | integration test exists and passes against fixture; gated under `npm run quality` | integration test + npm script introspection | `node test/integration/prd-chain/test-prd-chain.js && node -e "require('./package.json').scripts.quality.includes('test:integration') || process.exit(1)"` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `node test/integration/prd-chain/test-prd-chain.js` (if integration test exists yet) + local grep scripts for PRD-01/02/03/05 compliance on the edited file(s)
- **Per wave merge:** Full grep sweep across ALL 15 `steps-c/*.md` + gm-product-brief + `npm run test:integration` + `npm run lint:md`
- **Phase gate:** `npm run quality` green (includes integration test once D-49 wiring completes) before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `test/integration/prd-chain/test-prd-chain.js` — covers PRD-04, PRD-06, PRD-07; exercises fixture load + 5 downstream-sim phases
- [ ] `test/integration/prd-chain/fixture-refined-prd.md` — canonical fixture PRD (CLI dev tool domain recommended per A6)
- [ ] `test/integration/prd-chain/fixture-legacy-prd.md` (optional, high-value) — known-bad fixture with `FR1:` format to verify the test rejects it (Phase 5 `Phase B` pattern)
- [ ] Baseline git tag or stored sha for PRD-06 diff check (e.g., `pre-phase-08-baseline`) — captured BEFORE any Phase 8 edits to downstream skills (expected to be the empty set, but git tag gives audit trail)
- [ ] package.json script additions: `test:integration` + `quality` updated to include it
- [ ] Wave 0 grep scripts (inline, no new file needed): banned-phrase scanners for gm-create-prd + gm-product-brief, runnable as one-liners during per-task verification
- [ ] No framework install needed — all test infrastructure uses existing deps (STATE.md zero-new-runtime-deps)

## Sources

### Primary (HIGH confidence — verified by Read or grep in this session)

- `.planning/phases/08-prd-product-brief-content-refinement/08-CONTEXT.md` — 18 locked decisions, canonical refs, deferred items
- `.planning/REQUIREMENTS.md` (PRD-01..PRD-07, lines 36–44; Out-of-Scope row 75–76)
- `.planning/ROADMAP.md` §Phase 8 — 6 success criteria literal wording
- `.planning/STATE.md` — v1.2 zero-new-runtime-deps decision, Phase 8 status
- `.planning/codebase/CONVENTIONS.md` — Prettier 140-char, ESLint flat config, test naming, require patterns
- `.planning/config.json` — `workflow.nyquist_validation: true`, commit_docs: true
- `src/gomad-skills/2-plan-workflows/gm-create-prd/workflow.md` — role language, step-file architecture contract
- `src/gomad-skills/2-plan-workflows/gm-create-prd/data/prd-purpose.md` — philosophy file, D-52 insertion target, step-11 loads this via L45
- `src/gomad-skills/2-plan-workflows/gm-create-prd/templates/prd-template.md` — minimal output template; D-58 placeholder target
- `src/gomad-skills/2-plan-workflows/gm-create-prd/steps-c/step-02b-vision.md:77` — D-53 "Why now?" bullet confirmed
- `src/gomad-skills/2-plan-workflows/gm-create-prd/steps-c/step-02c-executive-summary.md:69,76` — D-54 targets confirmed
- `src/gomad-skills/2-plan-workflows/gm-create-prd/steps-c/step-03-success.md:73-88` — D-55 Business Success subsection + examples confirmed
- `src/gomad-skills/2-plan-workflows/gm-create-prd/steps-c/step-04-journeys.md:74,82-86` — D-59 persona framework targets confirmed
- `src/gomad-skills/2-plan-workflows/gm-create-prd/steps-c/step-08-scoping.md:55` — unflagged "investors/partners" probe (PRD-02 additional target)
- `src/gomad-skills/2-plan-workflows/gm-create-prd/steps-c/step-09-functional.md:94-107,142-155` — D-44/45/46/47/58 emission surface
- `src/gomad-skills/2-plan-workflows/gm-create-prd/steps-c/step-10-nonfunctional.md:87` — D-56 "seasonal or event-based" confirmed
- `src/gomad-skills/2-plan-workflows/gm-create-prd/steps-c/step-11-polish.md:44-45,89-103` — step-11 polish loads prd-purpose; §2b pattern for D-61's §2c parallel
- `src/gomad-skills/2-plan-workflows/gm-validate-prd/steps-v/step-v-12-completeness-validation.md:74-78` — header scan confirms D-58 closes validator gap
- `src/gomad-skills/2-plan-workflows/gm-validate-prd/steps-v/step-v-10-smart-validation.md:1-60` — validator-internal `FR-001` label confirmed as non-conflicting with D-44
- `src/gomad-skills/3-solutioning/gm-create-epics-and-stories/steps/step-01-validate-prerequisites.md:80` — "FR1: or similar" clause confirms D-44 compat
- `src/gomad-skills/3-solutioning/gm-create-architecture/steps/step-02-context.md:64` — "Extract acceptance criteria" confirms D-45 inline AC path works
- `src/gomad-skills/3-solutioning/gm-check-implementation-readiness/steps/step-01-document-discovery.md` — filename-pattern discovery confirms no new dep on PRD internals
- `src/gomad-skills/1-analysis/gm-product-brief/SKILL.md:14-19,104` — existing scope discipline; D-60 light-pass context
- `src/gomad-skills/1-analysis/gm-product-brief/resources/brief-template.md:5,77,82` — brief template guardrails
- `src/gomad-skills/1-analysis/gm-product-brief/prompts/guided-elicitation.md:70-77` — explicit DO NOT probe list confirms the discipline is pre-existing
- `test/test-gm-command-surface.js:1-80` — existing structural-test pattern D-49 mirrors
- `package.json:41-72` — scripts: `quality`, `test:install`, `test:refs`, `lint:md` composition

### Secondary (MEDIUM confidence — pattern inference)

- `test/test-cleanup-planner.js`, `test/test-manifest-corruption.js`, etc. (listed; not fully read) — assumed to follow same CommonJS plain-assertion pattern

### Tertiary (LOW confidence — N/A)

- None. All findings are repo-local or from locked CONTEXT.md. No WebSearch, Context7, or external docs were needed for a markdown-content refinement phase.

## Metadata

**Confidence breakdown:**
- Standard stack: **HIGH** — all dependencies verified as existing in `test/test-gm-command-surface.js`; zero-new-runtime-deps policy locked in STATE.md.
- Architecture: **HIGH** — file paths, line numbers, and section references verified by Read tool in this session. CONTEXT.md decisions locked 18 concrete choices; this research traced each to a line-anchored cut target.
- Pitfalls: **HIGH** — each pitfall identified has a concrete `warning signs` signal testable via grep or `npm run quality`.
- Downstream contract preservation (PRD-06): **HIGH** — validator, architect, epics, readiness skills all inspected; D-44/D-45/D-58 shown non-breaking via line-anchored evidence.

**Project Constraints (from CLAUDE.md):** No `./CLAUDE.md` at repo root. User's global rules (typescript/python/common) apply by default; CONVENTIONS.md (project-specific) is the repo's authoritative style guide and overrides where it conflicts. Relevant constraints active for Phase 8:
- Prettier 140-char, single quotes, LF only (CONVENTIONS.md L36–42)
- ESLint flat config, no-console off for CLI tools (CONVENTIONS.md L43–58)
- CommonJS `require('node:fs')` style, one class per file (CONVENTIONS.md L72–92)
- Zero new runtime deps (STATE.md L53)
- Test naming `test-<thing>.js` (CONVENTIONS.md L10, confirmed by existing test/ files)
- File organization: kebab-case CLI scripts, camelCase utilities, UPPER_SNAKE_CASE true constants

**Research date:** 2026-04-22
**Valid until:** 2026-05-22 (30 days — Phase 8 scope is stable markdown content; no fast-moving external dependencies)
