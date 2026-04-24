# Phase 8: PRD + Product-Brief Content Refinement - Pattern Map

**Mapped:** 2026-04-22
**Files analyzed:** 24 (23 existing files edited + 3 new test/fixture files)
**Analogs found:** 24 / 24 (every edited file is its own "before" analog; new files have strong sibling analogs)

## File Classification

Two shapes dominate Phase 8: **markdown content refinement** (line-anchored edits to existing prompt/template files, where the "before" state is itself the analog) and **one new Node integration test + fixture**. Classification distinguishes "edit" (role/data-flow describes the file's function in the skill runtime) from "create" (role/data-flow describes the new artifact).

### gm-create-prd — edits to existing prompt/template/data files

| File | Role | Data Flow | Closest Analog | Match Quality |
|------|------|-----------|----------------|---------------|
| `src/gomad-skills/2-plan-workflows/gm-create-prd/workflow.md` | skill-entry prompt | append-only doc-build | self (L10 "expert peer" line only) | exact (in-place reword) |
| `src/gomad-skills/2-plan-workflows/gm-create-prd/data/prd-purpose.md` | skill data file | single-source reference | self + `.planning/PROJECT.md` voice for new `## Coding-Agent Consumer Mindset` | exact (additive section) |
| `src/gomad-skills/2-plan-workflows/gm-create-prd/templates/prd-template.md` | skill output template | append-only doc-build | self (minimal header-only template; pattern is "placeholder header") | exact |
| `src/gomad-skills/2-plan-workflows/gm-create-prd/steps-c/step-01-init.md` | facilitation prompt | conversational elicitation | self + `step-02-discovery.md` for matching Role Reinforcement block | exact |
| `src/gomad-skills/2-plan-workflows/gm-create-prd/steps-c/step-01b-continue.md` | facilitation prompt | conversational elicitation | self + `step-02b-vision.md` "Role Reinforcement" form | exact |
| `src/gomad-skills/2-plan-workflows/gm-create-prd/steps-c/step-02-discovery.md` | facilitation prompt | conversational elicitation | `step-02b-vision.md` Role Reinforcement | exact |
| `src/gomad-skills/2-plan-workflows/gm-create-prd/steps-c/step-02b-vision.md` | facilitation prompt | conversational elicitation | self (L77 "Why now:" bullet) + `step-08-scoping.md` for mindset-reference pattern | exact |
| `src/gomad-skills/2-plan-workflows/gm-create-prd/steps-c/step-02c-executive-summary.md` | content-draft prompt | append-only doc-build | self (L69 rule, L23 Role Reinforcement) | exact |
| `src/gomad-skills/2-plan-workflows/gm-create-prd/steps-c/step-03-success.md` | facilitation prompt | append-only doc-build | self (L73–79 §3, L81–88 §4) + `step-04-journeys.md` for section-renumber guidance | exact |
| `src/gomad-skills/2-plan-workflows/gm-create-prd/steps-c/step-04-journeys.md` | facilitation prompt | append-only doc-build | self (§2 body replacement target; preserve §2 header per A7) | exact (in-place body rewrite) |
| `src/gomad-skills/2-plan-workflows/gm-create-prd/steps-c/step-05-domain.md` | facilitation prompt | conversational elicitation | self (Role Reinforcement only) | exact |
| `src/gomad-skills/2-plan-workflows/gm-create-prd/steps-c/step-06-innovation.md` | facilitation prompt | conversational elicitation | self (Role Reinforcement only) | exact |
| `src/gomad-skills/2-plan-workflows/gm-create-prd/steps-c/step-07-project-type.md` | facilitation prompt | conversational elicitation | self (Role Reinforcement only) | exact |
| `src/gomad-skills/2-plan-workflows/gm-create-prd/steps-c/step-08-scoping.md` | facilitation prompt | append-only doc-build | self (L55 "investors/partners" probe) + `step-02b-vision.md` mindset-reference | exact |
| `src/gomad-skills/2-plan-workflows/gm-create-prd/steps-c/step-09-functional.md` | content-draft prompt | append-only doc-build | self (L94–107 format block; L142–155 content-structure code fence; §5 Self-Validation) | exact (primary surface: FR/AC/OOS emission) |
| `src/gomad-skills/2-plan-workflows/gm-create-prd/steps-c/step-10-nonfunctional.md` | facilitation prompt | append-only doc-build | self (L87 "seasonal or event-based") | exact |
| `src/gomad-skills/2-plan-workflows/gm-create-prd/steps-c/step-11-polish.md` | content-polish prompt | single-source reference | self §2b Brainstorming Reconciliation (parallel pattern for new §2c) | exact |
| `src/gomad-skills/2-plan-workflows/gm-create-prd/steps-c/step-12-complete.md` | workflow-close prompt | read-only | self (final read-through sweep) | exact |

### gm-product-brief — light-pass edits

| File | Role | Data Flow | Closest Analog | Match Quality |
|------|------|-----------|----------------|---------------|
| `src/gomad-skills/1-analysis/gm-product-brief/SKILL.md` | skill-entry prompt | conversational elicitation | self (L14–19 scope-discipline block: preserve; strengthen guardrail voice) | exact |
| `src/gomad-skills/1-analysis/gm-product-brief/prompts/contextual-discovery.md` | facilitation prompt | subagent fan-out | `prompts/guided-elicitation.md` L70–77 "Explicitly DO NOT probe" block (preserve guardrail pattern) | exact |
| `src/gomad-skills/1-analysis/gm-product-brief/prompts/draft-and-review.md` | facilitation prompt | append-only doc-build | self (L18, L53 guardrail lines: preserve) | exact |
| `src/gomad-skills/1-analysis/gm-product-brief/prompts/finalize.md` | facilitation prompt | append-only doc-build | `prompts/guided-elicitation.md` voice + self | exact |
| `src/gomad-skills/1-analysis/gm-product-brief/prompts/guided-elicitation.md` | facilitation prompt | conversational elicitation | self (L70–77 "Explicitly DO NOT probe" = canonical guardrail block) | exact |
| `src/gomad-skills/1-analysis/gm-product-brief/resources/brief-template.md` | output template | append-only doc-build | self (L5 "explicitly not the focus"; L77, L82 guardrail lines) | exact |

### NEW files — test harness + fixture

| File | Role | Data Flow | Closest Analog | Match Quality |
|------|------|-----------|----------------|---------------|
| `test/integration/prd-chain/test-prd-chain.js` | integration test | fixture-load + structural-assert | `test/test-gm-command-surface.js` | role + data-flow match |
| `test/integration/prd-chain/fixture-refined-prd.md` | test fixture (markdown) | static artifact | `src/gomad-skills/2-plan-workflows/gm-create-prd/templates/prd-template.md` (frontmatter shape) + `.planning/REQUIREMENTS.md` §Out of Scope (format template) | role + structural match |
| `package.json` | npm script config | build/test wiring | self (existing `scripts.quality` concat; existing `test:*` script pattern) | exact |

---

## Pattern Assignments

### `workflow.md`, all `steps-c/*.md`, all `prompts/*.md`, `SKILL.md` (facilitation/content-draft prompts — edit)

**Analog:** In-place edit; the "before" state is the analog. Cross-file pattern anchor is `step-02b-vision.md:22-26`.

**Role Reinforcement block pattern** (canonical form across all 15 steps-c files and workflow.md) — D-57 rewording target:

```markdown
### Role Reinforcement:

- ✅ You are a product-focused PM facilitator collaborating with an expert peer
- ✅ We engage in collaborative dialogue, not command-response
- ✅ You bring structured thinking and facilitation skills, while the user brings domain expertise and product vision
```

Source: `src/gomad-skills/2-plan-workflows/gm-create-prd/steps-c/step-02b-vision.md:22-26` (verbatim verified).

Target reword (CONTEXT.md D-57, specifics block):

```markdown
### Role Reinforcement:

- ✅ You are a product-focused PM facilitator collaborating with a product owner driving a coding-agent-built product
- ✅ We engage in collaborative dialogue, not command-response
- ✅ You bring structured thinking and facilitation skills, while the user brings domain expertise and product vision
```

Apply the same replacement anywhere "expert peer" appears inline (e.g., `step-02c-executive-summary.md:23`). Where prose context already implies the coding-agent framing within the same step, the shortened "product owner" form is acceptable per Claude's Discretion.

**MANDATORY EXECUTION RULES preservation pattern** (must NOT be edited during strip):

```markdown
## MANDATORY EXECUTION RULES (READ FIRST):

- 🛑 NEVER generate content without user input

- 📖 CRITICAL: ALWAYS read the complete step file before taking any action - partial understanding leads to incomplete decisions
- 🔄 CRITICAL: When loading next step with 'C', ensure the entire file is read and understood before proceeding
- ✅ ALWAYS treat this as collaborative discovery between PM peers
- 📋 YOU ARE A FACILITATOR, not a content generator
```

Source: `src/gomad-skills/2-plan-workflows/gm-create-prd/steps-c/step-09-functional.md:5-15`. Preserved verbatim across edits — this block is the workflow contract.

**A/P/C menu preservation pattern** (must NOT be removed during strip) — canonical form:

```markdown
### N. Present MENU OPTIONS

[...]

Display: "**Select:** [A] Advanced Elicitation [P] Party Mode [C] Continue to <next step name> (Step N of M)"

#### Menu Handling Logic:
- IF A: Invoke the `gm-advanced-elicitation` skill [...]
- IF P: Invoke the `gm-party-mode` skill [...]
- IF C: Append the final content to {outputFile}, update frontmatter by adding this step name to the end of the stepsCompleted array, then read fully and follow: ./step-NN-next.md
- IF Any other: help user respond, then redisplay menu

#### EXECUTION RULES:
- ALWAYS halt and wait for user input after presenting menu
- ONLY proceed to next step when user selects 'C'
- After other menu items execution, return to this menu
```

Source: `step-02b-vision.md:93-112` + `step-09-functional.md:158-180`. Consistent across every steps-c file.

**SYSTEM SUCCESS/FAILURE METRICS preservation** — each file ends with a `## 🚨 SYSTEM SUCCESS/FAILURE METRICS` or equivalent `## SUCCESS METRICS` + `## FAILURE MODES` block. Refined cuts must not touch these rubrics.

Source anchors: `step-02b-vision.md:119-143`; `step-09-functional.md:186-210`.

---

### `data/prd-purpose.md` (D-52 — add `## Coding-Agent Consumer Mindset`)

**Analog:** Existing `data/prd-purpose.md` sections for structure + `.planning/PROJECT.md` voice for prose density.

**Existing section pattern to copy** — all top-level sections use `## Title` followed by short direct paragraphs with `**Bold lead:**` for key terms and `✅`/`❌` lists for anti-patterns:

```markdown
## Core Philosophy: Information Density

**High Signal-to-Noise Ratio**

Every sentence must carry information weight. LLMs consume precise, dense content efficiently.

**Anti-Patterns (Eliminate These):**
- ❌ "The system will allow users to..." → ✅ "Users can..."
- ❌ "It is important to note that..." → ✅ State the fact directly
- ❌ "In order to..." → ✅ "To..."
- ❌ Conversational filler and padding → ✅ Direct, concise statements

**Goal:** Maximum information per word. Zero fluff.

---
```

Source: `src/gomad-skills/2-plan-workflows/gm-create-prd/data/prd-purpose.md:17-30`.

**New section emission target** (D-52) — parallel structure, landing position AFTER `## Core Philosophy: Information Density` and BEFORE `## The Traceability Chain`:

```markdown
## Coding-Agent Consumer Mindset

**The downstream consumers of this PRD are coding agents, not human development teams.**

[paragraph 1 — coding agents ship faster than human teams; MVP scope pushes UP, not DOWN]

[paragraph 2 — vision is 1–2 declarative sentences, not a hedge; requirements are testable capabilities machine-consumable without stakeholder context]

[paragraph 3 — omit business-KPI / GTM / investor framing; keep code-behavior-observable outcomes]

---
```

Voice calibration: match `.planning/PROJECT.md` directness — short paragraphs, no "in order to" filler, no hedging. Reference from `step-02b-vision.md` §3 and `step-08-scoping.md` §2 via the same load pattern `step-11-polish.md:44-45` already uses:

```markdown
**CRITICAL:** Load the PRD purpose document first:

- Read `../data/prd-purpose.md` to understand what makes a great GOMAD PRD
```

Source: `src/gomad-skills/2-plan-workflows/gm-create-prd/steps-c/step-11-polish.md:43-45`.

**NFR-template reword within same file** (D-56 cascade) — `data/prd-purpose.md:99` currently:

```markdown
- ✅ "The system shall maintain 99.9% uptime during business hours as measured by cloud provider SLA"
```

Target (business-SLA framing strip):

```markdown
- ✅ "The system shall maintain 99.9% system uptime as measured by cloud provider SLA"
```

Source: `src/gomad-skills/2-plan-workflows/gm-create-prd/data/prd-purpose.md:99`.

---

### `templates/prd-template.md` (D-58 — add `## Out of Scope` placeholder)

**Analog:** `src/gomad-skills/2-plan-workflows/gm-create-prd/templates/prd-template.md` (current header-only minimal template).

**Current full template** (7 lines):

```markdown
---
stepsCompleted: []
inputDocuments: []
workflowType: 'prd'
---

# Product Requirements Document - {{project_name}}

**Author:** {{user_name}}
**Date:** {{date}}
```

**Edit target:** Add `## Out of Scope` header placeholder per D-58. Planner's discretion (Q4 in RESEARCH.md) on whether to include example entries; simplest satisfying option is header-only addition emitted as part of step-09's content structure (not in template frontmatter itself).

**OOS entry format** (to be emitted by step-09, per D-58 + specifics block):

```markdown
## Out of Scope

- **OOS-01**: <capability> — Reason: <why it's excluded>
- **OOS-02**: <capability> — Reason: <why it's excluded>
```

Source: `.planning/REQUIREMENTS.md:70-84` for the REQ-ID + table/bullet convention; `src/gomad-skills/2-plan-workflows/gm-create-prd/data/prd-purpose.md:130-139` for the "Required Sections" list this slots into (new item between §8 Functional Requirements and §9 Non-Functional Requirements).

---

### `step-09-functional.md` (D-44/D-45/D-46/D-47/D-58 — FR/AC/OOS emission)

**Analog:** `src/gomad-skills/2-plan-workflows/gm-create-prd/steps-c/step-09-functional.md` itself — entire emission surface restructured in place.

**Current FR format block** (L94–107) — must be replaced:

```markdown
**Format:**

- FR#: [Actor] can [capability] [context/constraint if needed]
- Number sequentially (FR1, FR2, FR3...)
- Aim for 20-50 FRs for typical projects

**Altitude Check:**
Each FR should answer "WHAT capability exists?" NOT "HOW it's implemented?"

**Examples:**

- ✅ "Users can customize appearance settings"
- ❌ "Users can toggle light/dark theme with 3 font size options stored in LocalStorage"
```

Source: `src/gomad-skills/2-plan-workflows/gm-create-prd/steps-c/step-09-functional.md:94-107`.

**Target FR + inline AC format** (D-44/45/47, per specifics block):

```markdown
**Format:**

- FR-NN: [Actor] can [capability] [context/constraint if needed]
    - AC: Given [state], when [action], then [observable outcome]
    - AC: Given [state], when [action], then [observable outcome]

- Number FRs sequentially with 2-digit zero-padded dash-separated IDs (FR-01, FR-02, ..., FR-99)
- Aim for 20-50 FRs for typical projects
- Each FR MUST have 2-4 AC sub-bullets (floor: 2, cap: 4)
- AC wording is Given/When/Then (Gherkin-shaped), machine-verifiable by construction
```

**Current Content Structure code fence** (L142–155) — must be replaced:

```markdown
#### Content Structure:

When saving to document, append these Level 2 and Level 3 sections:

\`\`\`markdown
## Functional Requirements

### [Capability Area Name]

- FR1: [Specific Actor] can [specific capability]
- FR2: [Specific Actor] can [specific capability]
- FR3: [Specific Actor] can [specific capability]

### [Another Capability Area]

- FR4: [Specific Actor] can [specific capability]
- FR5: [Specific Actor] can [specific capability]

[Continue for all capability areas discovered in conversation]
\`\`\`
```

Source: `src/gomad-skills/2-plan-workflows/gm-create-prd/steps-c/step-09-functional.md:137-156`.

**Target Content Structure** (D-45 + D-58 — inline AC sub-bullets + OOS block emission):

```markdown
#### Content Structure:

When saving to document, append these Level 2 and Level 3 sections:

\`\`\`markdown
## Functional Requirements

### [Capability Area Name]

- FR-01: [Specific Actor] can [specific capability]
    - AC: Given [state], when [action], then [observable outcome]
    - AC: Given [state], when [action], then [observable outcome]

- FR-02: [Specific Actor] can [specific capability]
    - AC: Given [state], when [action], then [observable outcome]
    - AC: Given [state], when [action], then [observable outcome]

### [Another Capability Area]

- FR-03: [Specific Actor] can [specific capability]
    - AC: Given [state], when [action], then [observable outcome]
    - AC: Given [state], when [action], then [observable outcome]

[Continue for all capability areas discovered in conversation]

## Out of Scope

- **OOS-01**: <excluded capability> — Reason: <why excluded>
- **OOS-02**: <excluded capability> — Reason: <why excluded>
\`\`\`
```

**Self-Validation Quality Check addition** (D-46) — current L127–131 "Quality Check" adds new bullet:

```markdown
**Quality Check:**

1. "Is each FR clear enough that someone could test whether it exists?"
2. "Is each FR independent (not dependent on reading other FRs to understand)?"
3. "Did I avoid vague terms like 'good', 'fast', 'easy'?" (Use NFRs for quality attributes)
4. "Does each FR have ≥2 AC sub-bullets, capped at 4, in Given/When/Then form?"
5. "Is there an ## Out of Scope section with at least one OOS-NN entry?"
```

Source: `src/gomad-skills/2-plan-workflows/gm-create-prd/steps-c/step-09-functional.md:127-131`.

---

### `step-11-polish.md` (D-61 — add §2c Coding-Agent Readiness Review)

**Analog:** `step-11-polish.md:89-103` §2b Brainstorming Reconciliation — parallel pattern for new §2c.

**Existing §2b structure** (to copy):

```markdown
### 2b. Brainstorming Reconciliation (if brainstorming input exists)

**Check the PRD frontmatter `inputDocuments` for any brainstorming document** (e.g., `brainstorming-session*.md`, `brainstorming-report.md`). If a brainstorming document was used as input:

1. **Load the brainstorming document** and extract all distinct ideas, themes, and recommendations
2. **Cross-reference against the PRD** — for each brainstorming idea, check if it landed in any PRD section [...]
3. **Identify dropped ideas** — [...]
4. **Present findings to user**: "These brainstorming ideas did not make it into the PRD: [list]. Should any be incorporated?"
5. **If user wants to incorporate dropped ideas**: Add them to the most appropriate PRD section [...]

**Why this matters**: [...]
```

Source: `src/gomad-skills/2-plan-workflows/gm-create-prd/steps-c/step-11-polish.md:89-103`.

**New §2c to emit** (D-61), parallel structure:

```markdown
### 2c. Coding-Agent Readiness Review

**Scan the PRD for residual human-founder framing that leaked past earlier steps.** Run the banned-phrase checklist below against every section:

Banned phrases (flag all occurrences):
- "why now?"
- "investor" / "investors"
- "ARR" / "CAC" / "LTV" / "MRR" / "DAU" / "MAU" / "retention rate" / "churn"
- "go-to-market" / "GTM"
- "stakeholder pitch" / "elevator pitch"
- persona demographic markers (e.g. "35-year-old", "mother of two", "emotional journey")
- time-window estimation phrases ("in 3 months", "by Q4", "within 18 months")

For each occurrence found:
1. **Flag the exact line and section** to the user
2. **Propose strip-or-rephrase** — show the edit you'd make
3. **Wait for user approval** before applying — facilitator gates, user decides

**Why this matters**: Earlier steps may have drifted; coding-agent consumers parse the PRD without the human PM context these phrases assume. Polish is the last gate before PRD finalization.
```

**Physical location decision** (RESEARCH.md Q3, CONTEXT.md Claude's Discretion): inline in step-11 is the default. Extract to `data/coding-agent-banned-phrases.md` only if step-09 / step-02b also reuse the same list (planner's call).

---

### `step-04-journeys.md` (D-59 — strip persona story framework)

**Analog:** In-place body replacement within `step-04-journeys.md:60-88` (§2 "Create Narrative Story-Based Journeys"), preserving §2 header per A7 to avoid renumbering §3–§7 cross-references.

**Current §2 content** (to be replaced):

```markdown
### 2. Create Narrative Story-Based Journeys

For each user type, create compelling narrative journeys that tell their story:

#### Narrative Journey Creation Process:

**If Using Existing Persona from Input Documents:**
[...]

**If Creating New Persona:**
Guide persona creation with story framework:
- Name: realistic name and personality
- Situation: What's happening in their life/work that creates need?
- Goal: What do they desperately want to achieve?
- Obstacle: What's standing in their way?
- Solution: How does the product solve their story?

**Story-Based Journey Mapping:**

Guide narrative journey creation using story structure:
- **Opening Scene**: Where/how do we meet them? What's their current pain?
- **Rising Action**: What steps do they take? What do they discover?
- **Climax**: Critical moment where product delivers real value
- **Resolution**: How does their situation improve? What's their new reality?

Encourage narrative format with specific user details, emotional journey, and clear before/after contrast
```

Source: `src/gomad-skills/2-plan-workflows/gm-create-prd/steps-c/step-04-journeys.md:60-88`.

**Target §2 content** (action-oriented rewrite; preserve header and numbering):

```markdown
### 2. Create Action-Oriented Journeys

For each user type, create action-oriented journeys with name + role + goal only:

#### Journey Creation Process:

**Persona fields (minimal):**
- **Name** — identifier only (no demographic markers, no backstory)
- **Role** — how they relate to the system (e.g., "admin", "end-user", "API consumer")
- **Goal** — observable outcome they need

**Journey prose shape:**

"Actor performs X, system responds Y, outcome Z."

For each journey:
- Describe the triggering action (what the actor does)
- Describe the system's observable response
- Describe the resulting state/outcome
- Flag edge cases and error paths as separate journey entries, not emotional asides

This form maps 1:1 to FR acceptance-criteria candidates in step 9.
```

Preserve §3 "Guide Journey Exploration" through §7 "Present MENU OPTIONS" verbatim (Minimum Coverage list at §5 is load-bearing; downstream capability extraction depends on it).

---

### `gm-product-brief` light-pass edits (D-60)

**Analog:** `src/gomad-skills/1-analysis/gm-product-brief/prompts/guided-elicitation.md:70-77` — canonical **preserve-strengthen** guardrail block (Pitfall 4 in RESEARCH.md explicitly warns: these are pre-existing guardrails, not removal targets).

**Canonical guardrail pattern to PRESERVE verbatim** across all 4 prompts + SKILL.md + brief-template.md:

```markdown
### Explicitly DO NOT probe for
- Pricing, packaging, monetization strategy
- CAC, LTV, ARR, payback period, or other financial KPIs
- Investor-facing narrative or fundraising angles
- Detailed 2-3 year business roadmap
- Go-to-market channel strategy

If the user volunteers any of the above, **capture silently** for the distillate with a brief "noted" — don't follow up on it.
```

Source: `src/gomad-skills/1-analysis/gm-product-brief/prompts/guided-elicitation.md:70-77`. This block is the model of discipline for Phase 8 — strengthen its voice, do not remove.

**SKILL.md scope discipline block to PRESERVE** — also verbatim:

```markdown
**Scope discipline (important):**
- **In scope:** problem, target users, core features & capabilities, key user flows, user scenarios, MVP functional boundary, critical constraints.
- **Lightly covered:** differentiation (1-2 sentences is enough), rough qualitative success signals, high-level vision.
- **Out of scope for this brief:** detailed business/commercial metrics (ARR, CAC, LTV, pricing strategy, GTM plan, investor narrative, 2-3 year business roadmap). If the user volunteers these, capture them silently for the distillate — do **not** interrogate for them.
```

Source: `src/gomad-skills/1-analysis/gm-product-brief/SKILL.md:14-18`.

**Light-pass edit targets** (per D-60; tone alignment only — do not weaken the above blocks):
- `SKILL.md:12` "as equals" framing → align to "product owner driving a coding-agent-built product" mental model if context permits
- `prompts/*.md` — strip any residual "why now?" / investor / GTM framing that is NOT inside a guardrail block (rare — most such mentions in this directory are already inside guardrails)
- `resources/brief-template.md:5` "Business/commercial concerns [...] explicitly **not** the focus" — strengthen voice; align to coding-agent consumer vocabulary

**Do NOT touch:** `agents/` (pointer dir, no prose); `manifest.json` (machine-read metadata — only touch `description` field if it contains human-founder tone).

---

### `test/integration/prd-chain/test-prd-chain.js` (NEW — D-48/D-49/D-50)

**Analog:** `test/test-gm-command-surface.js` (full file).

**Imports pattern** (L26–31):

```javascript
const path = require('node:path');
const os = require('node:os');
const { execSync } = require('node:child_process');
const fs = require('fs-extra');
const yaml = require('js-yaml');
const { globSync } = require('glob');
```

Source: `test/test-gm-command-surface.js:26-31`. CommonJS `require('node:*')` style per CONVENTIONS.md; zero-new-runtime-deps policy.

**ANSI colors + counters pattern** (L33–44):

```javascript
const colors = {
  reset: '\u001B[0m',
  green: '\u001B[32m',
  red: '\u001B[31m',
  yellow: '\u001B[33m',
  cyan: '\u001B[36m',
  dim: '\u001B[2m',
};

let passed = 0;
let failed = 0;
```

Source: `test/test-gm-command-surface.js:34-44`.

**`assert()` helper pattern** (L46–60):

```javascript
function assert(condition, testName, errorMessage = '') {
  if (condition) {
    console.log(`${colors.green}\u2713${colors.reset} ${testName}`);
    passed++;
  } else {
    console.log(`${colors.red}\u2717${colors.reset} ${testName}`);
    if (errorMessage) {
      console.log(`  ${colors.dim}${errorMessage}${colors.reset}`);
    }
    failed++;
  }
}
```

Source: `test/test-gm-command-surface.js:49-60`. Reuse verbatim.

**Frontmatter extraction pattern** (L79–80):

```javascript
const raw = fs.readFileSync(stubPath, 'utf8');
const match = raw.match(/^---\n([\s\S]*?)\n---/);
// ...
let fm;
try {
  fm = yaml.load(match[1]);
} catch (error) {
  assert(false, `(A) ${file} frontmatter parses as YAML`, error.message);
  continue;
}
```

Source: `test/test-gm-command-surface.js:79-90`.

**Phase structure pattern** (the whole file is laid out as Phase A / Phase B / Phase C):

```javascript
// ─── Phase A — <description> ────────────────────────────
console.log(`${colors.cyan}Phase A — <description>${colors.reset}`);
// ... assertions ...

// ─── Phase B — <description> ────────────────────────────
console.log(`\n${colors.cyan}Phase B — <description>${colors.reset}`);
// ... assertions ...

// ─── Summary ────────────────────────────────────────────
console.log(
  `\n${colors.cyan}Results:${colors.reset} ${colors.green}${passed} passed${colors.reset}, ${colors.red}${failed} failed${colors.reset}\n`,
);

process.exit(failed > 0 ? 1 : 0);
```

Source: `test/test-gm-command-surface.js:66-277`. For `test-prd-chain.js`, use phases:
- Phase 1 — Fixture load + structural sections present
- Phase 2 — FR-NN / NFR-NN / OOS-NN format + AC density (≥2, ≤4) + Given/When/Then form
- Phase 3 — `## Out of Scope` block present with OOS-NN entries
- Phase 4 — Validator-sim: section-header scan mirroring `step-v-12-completeness-validation.md`
- Phase 5 — Architect-sim: AC extraction per `step-02-context.md:64`
- Phase 6 — Epics-sim: FR extraction per `step-01-validate-prerequisites.md:80` "or similar" regex
- Phase 7 — Readiness-sim: prerequisite parse per `gm-check-implementation-readiness/steps/step-01-document-discovery.md` (filename-pattern only; no LLM)

**Negative-fixture self-test pattern** (Phase B in command-surface test, L106–165) — mandatory per Pitfall 6:

```javascript
// Good fixture — SHOULD pass the structural check
fs.writeFileSync(
  path.join(negGmDir, 'agent-pm.md'),
  ['---', 'name: gm:agent-pm', 'description: "Project manager persona launcher."', '---', '', 'Body.', ''].join('\n'),
);

// Bad fixture — structural check MUST detect name mismatch
fs.writeFileSync(
  path.join(negGmDir, 'agent-broken.md'),
  ['---', 'name: wrong:name', 'description: "Broken."', '---', '', 'Body.', ''].join('\n'),
);
```

Source: `test/test-gm-command-surface.js:117-127`. Phase 8 negative-fixture: embed a "known-bad" PRD snippet with `FR1:` (unpadded) format; assert the FR-format check rejects it. Local counter (`negPassed`/`negFailed`) keeps self-test out of global pass/fail tally.

**FR extraction + AC density assertion** (new Phase 2 content; derived from D-44/46/47 and RESEARCH.md Code Examples):

```javascript
function extractFRBlocks(body) {
  const lines = body.split('\n');
  const blocks = [];
  let current = null;
  for (const line of lines) {
    if (/^- FR-\d{2}:/.test(line)) {
      if (current) blocks.push(current);
      current = { fr: line, acs: [] };
    } else if (current && /^ {4}- AC:/.test(line)) {
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
assert(frBlocks.length > 0, 'Fixture contains at least one FR-NN block');
for (const block of frBlocks) {
  assert(block.acs.length >= 2, `${block.fr} has ≥2 AC sub-bullets`, `Got ${block.acs.length}`);
  assert(block.acs.length <= 4, `${block.fr} has ≤4 AC sub-bullets`, `Got ${block.acs.length}`);
  for (const ac of block.acs) {
    assert(/Given .+, when .+, then .+/i.test(ac), `AC in Given/When/Then form`, ac);
  }
}
// Negative guard — legacy FR1:/FR-1: must be absent
assert(!/^- FR\d+:/m.test(body), 'No legacy unpadded FR format in fixture');
assert(!/^- FR-\d:(?!\d)/m.test(body), 'No legacy single-digit FR-N format in fixture');
```

Source: derived from `.planning/phases/08-prd-product-brief-content-refinement/08-RESEARCH.md:493-522` + command-surface test assertion style.

**OOS block assertion**:

```javascript
const oosBlockMatch = body.match(/^## Out of Scope\n([\s\S]*?)(?=\n##|\n*$)/m);
assert(Boolean(oosBlockMatch), 'Fixture has ## Out of Scope block');
if (oosBlockMatch) {
  const oosLines = oosBlockMatch[1].split('\n').filter(l => l.trim().startsWith('- '));
  assert(oosLines.length > 0, 'Out of Scope block has entries');
  for (const line of oosLines) {
    assert(
      /^- \*\*OOS-\d{2}\*\*: .+ — Reason: .+/.test(line),
      'OOS line matches **OOS-NN**: <cap> — Reason: <why> format',
      line,
    );
  }
}
```

Source: derived from `.planning/REQUIREMENTS.md:70-84` style + CONTEXT.md specifics block.

**Cleanup pattern** (mirror L159–164 tempdir cleanup if the test materializes any temp artifacts):

```javascript
} finally {
  if (negTempDir && fs.existsSync(negTempDir)) {
    fs.removeSync(negTempDir);
  }
}
```

Source: `test/test-gm-command-surface.js:159-164`. For Phase 8, simple synchronous read of a committed fixture file is the baseline — no tempdir needed unless the negative-fixture test materializes an in-memory "known-bad" variant.

---

### `test/integration/prd-chain/fixture-refined-prd.md` (NEW — D-48)

**Analogs:**
1. `src/gomad-skills/2-plan-workflows/gm-create-prd/templates/prd-template.md` — frontmatter shape
2. `.planning/REQUIREMENTS.md:70-84` — OOS table/bullet style reference
3. `src/gomad-skills/2-plan-workflows/gm-create-prd/data/prd-purpose.md:128-140` — "Required Sections" list (authoritative section order)

**Frontmatter pattern** (copy template shape, fill as "complete"):

```markdown
---
stepsCompleted: ['step-01-init', 'step-02-discovery', 'step-02b-vision', 'step-02c-executive-summary', 'step-03-success', 'step-04-journeys', 'step-05-domain', 'step-06-innovation', 'step-07-project-type', 'step-08-scoping', 'step-09-functional', 'step-10-nonfunctional', 'step-11-polish', 'step-12-complete']
inputDocuments: []
workflowType: 'prd'
---

# Product Requirements Document - <Fixture Project Name>

**Author:** gomad-test
**Date:** 2026-04-22
```

Source: `src/gomad-skills/2-plan-workflows/gm-create-prd/templates/prd-template.md:1-10`. Planner picks step list per fixture's needed completeness.

**Section order** (mandatory — step-v-12 header scan):

```markdown
## Executive Summary
### What Makes This Special
## Project Classification
## Success Criteria
### User Success
### Technical Success
## Product Scope
### MVP - Minimum Viable Product
### Growth Features (Post-MVP)
### Vision (Future)
## User Journeys
## Functional Requirements
### [Capability Area 1]
- FR-01: ...
    - AC: Given ..., when ..., then ...
    - AC: Given ..., when ..., then ...
- FR-02: ...
    - AC: ...
    - AC: ...
## Out of Scope
- **OOS-01**: <capability> — Reason: <why>
- **OOS-02**: <capability> — Reason: <why>
## Non-Functional Requirements
### Performance
- NFR-01: ...
### Security
- NFR-02: ...
```

Source: composite of `data/prd-purpose.md:130-140` (required sections) + step-09 Content Structure + D-58 OOS placement + step-03 scope sub-sections.

**Fixture domain choice** (Claude's Discretion + RESEARCH.md A6): CLI dev tool recommended — surfaces cleanest FR/NFR/OOS variety in <300 lines.

---

### `package.json` (D-49 — add `test:integration`, wire into `quality`)

**Analog:** existing `scripts` object in `package.json:40-66` — same file, add new script and extend `quality` concat.

**Existing scripts pattern** (lines 40–66):

```json
"scripts": {
  "docs:build": "node tools/build-docs.mjs",
  "format:check": "prettier --check \"**/*.{js,cjs,mjs,json,yaml}\"",
  "lint": "eslint . --ext .js,.cjs,.mjs,.yaml --max-warnings=0",
  "lint:md": "markdownlint-cli2 \"**/*.md\"",
  "quality": "npm run format:check && npm run lint && npm run lint:md && npm run docs:build && npm run test:install && npm run validate:refs && npm run validate:skills",
  "test": "npm run test:refs && npm run test:install && npm run lint && npm run lint:md && npm run format:check",
  "test:gm-surface": "node test/test-gm-command-surface.js",
  "test:install": "node test/test-installation-components.js",
  "test:refs": "node test/test-file-refs-csv.js",
  "validate:refs": "node tools/validate-file-refs.js --strict",
  "validate:skills": "node tools/validate-skills.js --strict"
}
```

Source: `package.json:40-66`.

**Target additions**:

```json
"test:integration": "node test/integration/prd-chain/test-prd-chain.js",
"quality": "npm run format:check && npm run lint && npm run lint:md && npm run docs:build && npm run test:install && npm run test:integration && npm run validate:refs && npm run validate:skills"
```

Append `test:integration` into `quality` chain AFTER `test:install` and BEFORE `validate:refs` (matches existing ordering convention: format → lint → docs → tests → validators).

**Verification one-liner** (Pitfall 7):

```bash
node -e "require('./package.json').scripts.quality.includes('test:integration') || process.exit(1)"
```

Source: RESEARCH.md Pitfall 7 + `package.json:56` composition.

---

## Shared Patterns

### Line-anchored in-place edits (no file moves, no renames)

**Source:** every edit target file itself.

**Apply to:** all 23 markdown files being edited.

Pattern: cut by **content signature** (e.g., grep for literal "Why now:") not by line number; plan documents the verbatim text being cut; verifies via post-edit grep. Prevents line-number drift between CONTEXT.md references and actual plan-execution file state (Pitfall 2 in RESEARCH.md).

### Role Reinforcement reword batch

**Source:** `step-02b-vision.md:22-26` (canonical block; identical across all 15 steps-c files + `workflow.md:10`).

**Apply to:** all 15 `steps-c/*.md` files + `workflow.md`.

Single find-and-replace pattern: `expert peer` → `product owner driving a coding-agent-built product` (full form) OR `product owner` (shortened form where context implies coding-agent framing). Planner keeps diff size sane (Claude's Discretion).

### Preserve workflow contract blocks verbatim

**Sources:**
- `## MANDATORY EXECUTION RULES (READ FIRST):` block — `step-09-functional.md:5-15`
- A/P/C menu block — `step-09-functional.md:158-180`
- `## 🚨 SYSTEM SUCCESS/FAILURE METRICS` footer — `step-02b-vision.md:119-143`
- `## SUCCESS METRICS` / `## FAILURE MODES` in step files that use the non-emoji form — `step-09-functional.md:186-210`
- Frontmatter `stepsCompleted` append-flow — `templates/prd-template.md:1-5`

**Apply to:** all 15 steps-c files (cuts happen in prose body only; never in these rubric/contract blocks).

### `data/prd-purpose.md` as single source of truth

**Source:** `step-11-polish.md:44-45` load pattern `Read ../data/prd-purpose.md`.

**Apply to:** D-52's new `## Coding-Agent Consumer Mindset` section lives ONLY in `data/prd-purpose.md`. `step-02b-vision.md` and `step-08-scoping.md` reference it via `Read ../data/prd-purpose.md` — never duplicate the prose inline (CONTEXT.md D-52 + Pitfall 3 equivalent).

### Node test scaffolding

**Source:** `test/test-gm-command-surface.js` (entire file).

**Apply to:** new `test/integration/prd-chain/test-prd-chain.js`.

Elements to reuse verbatim: imports (L26–31), ANSI colors + counters (L33–44), `assert()` helper (L46–60), frontmatter extraction regex (L79–80), phase-structured console output, final summary + `process.exit(failed > 0 ? 1 : 0)` (L271–276).

### Zero new runtime deps

**Source:** `.planning/STATE.md:53` + `package.json:84-96` (existing deps list).

**Apply to:** `test/integration/prd-chain/test-prd-chain.js` — use only `node:*` built-ins + existing deps (`fs-extra`, `js-yaml`, `glob`, `chalk`). Do NOT add `vitest`, `jest`, `chai`, `unified` / `remark`, `gray-matter`, or similar.

### REQ-ID house style

**Source:** `.planning/REQUIREMENTS.md` — uses `CMD-01`, `REF-03`, `INSTALL-05`, `PRD-04`, `REL-02` (2-digit zero-padded, dash-separated, UPPER prefix).

**Apply to:** D-44's `FR-01` / `NFR-01` / D-58's `OOS-01` — identical convention. Integration test `assertFRIdFormat` enforces `^- FR-\d{2}:` strictly (Pitfall 6 in RESEARCH.md).

### "Explicitly DO NOT probe" guardrail preservation

**Source:** `src/gomad-skills/1-analysis/gm-product-brief/prompts/guided-elicitation.md:70-77`.

**Apply to:** gm-product-brief light-pass edits. Strengthen voice of this block; do NOT strip. Distinguish historical framing (strip) from guardrail prose (preserve) via line-by-line diff review (Pitfall 4 in RESEARCH.md). Post-edit grep for `CAC` / `LTV` / `investor` / `GTM` in gm-product-brief MUST still return hits (the guardrail mentions).

---

## No Analog Found

All 24 files have analogs in the repo. No gaps.

(The "new" `fixture-refined-prd.md` is intentionally synthesized from multiple analogs — template frontmatter + REQUIREMENTS.md OOS format + prd-purpose.md section list — because no existing single file is a full "refined PRD output" artifact; the fixture *is* that artifact.)

---

## Metadata

**Analog search scope:**
- `src/gomad-skills/2-plan-workflows/gm-create-prd/` (all subdirs)
- `src/gomad-skills/1-analysis/gm-product-brief/` (all subdirs)
- `src/gomad-skills/2-plan-workflows/gm-validate-prd/` (read-only, for contract preservation)
- `src/gomad-skills/3-solutioning/gm-create-{architecture,epics-and-stories,check-implementation-readiness}/` (read-only, for contract preservation)
- `test/` (integration-test analog)
- `.planning/REQUIREMENTS.md` (REQ-ID + OOS format reference)
- `.planning/PROJECT.md` (voice calibration for new mindset section)
- `package.json` (script wiring target)

**Files scanned (Read):** 12 — `test-gm-command-surface.js`, `step-02b-vision.md`, `step-02c-executive-summary.md`, `step-03-success.md`, `step-04-journeys.md`, `step-08-scoping.md:1-80`, `step-09-functional.md`, `step-10-nonfunctional.md:1-100`, `step-11-polish.md`, `data/prd-purpose.md`, `templates/prd-template.md`, `workflow.md:1-30`, `SKILL.md (gm-product-brief)`, `resources/brief-template.md`, `prompts/guided-elicitation.md`, `.planning/REQUIREMENTS.md:60-100`, `package.json`.

**Pattern extraction date:** 2026-04-22
