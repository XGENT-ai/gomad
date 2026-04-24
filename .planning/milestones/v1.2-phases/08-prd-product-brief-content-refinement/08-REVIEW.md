---
phase: 08-prd-product-brief-content-refinement
reviewed: 2026-04-22T00:00:00Z
depth: standard
files_reviewed: 22
files_reviewed_list:
  - package.json
  - src/gomad-skills/1-analysis/gm-product-brief/SKILL.md
  - src/gomad-skills/1-analysis/gm-product-brief/prompts/draft-and-review.md
  - src/gomad-skills/1-analysis/gm-product-brief/prompts/guided-elicitation.md
  - src/gomad-skills/1-analysis/gm-product-brief/resources/brief-template.md
  - src/gomad-skills/2-plan-workflows/gm-create-prd/data/prd-purpose.md
  - src/gomad-skills/2-plan-workflows/gm-create-prd/steps-c/step-01-init.md
  - src/gomad-skills/2-plan-workflows/gm-create-prd/steps-c/step-01b-continue.md
  - src/gomad-skills/2-plan-workflows/gm-create-prd/steps-c/step-02-discovery.md
  - src/gomad-skills/2-plan-workflows/gm-create-prd/steps-c/step-02b-vision.md
  - src/gomad-skills/2-plan-workflows/gm-create-prd/steps-c/step-02c-executive-summary.md
  - src/gomad-skills/2-plan-workflows/gm-create-prd/steps-c/step-03-success.md
  - src/gomad-skills/2-plan-workflows/gm-create-prd/steps-c/step-04-journeys.md
  - src/gomad-skills/2-plan-workflows/gm-create-prd/steps-c/step-05-domain.md
  - src/gomad-skills/2-plan-workflows/gm-create-prd/steps-c/step-08-scoping.md
  - src/gomad-skills/2-plan-workflows/gm-create-prd/steps-c/step-09-functional.md
  - src/gomad-skills/2-plan-workflows/gm-create-prd/steps-c/step-10-nonfunctional.md
  - src/gomad-skills/2-plan-workflows/gm-create-prd/steps-c/step-11-polish.md
  - src/gomad-skills/2-plan-workflows/gm-create-prd/templates/prd-template.md
  - src/gomad-skills/2-plan-workflows/gm-create-prd/workflow.md
  - test/integration/prd-chain/fixture-refined-prd.md
  - test/integration/prd-chain/test-prd-chain.js
findings:
  critical: 0
  warning: 4
  info: 6
  total: 10
status: issues_found
---

# Phase 8: Code Review Report

**Reviewed:** 2026-04-22T00:00:00Z
**Depth:** standard
**Files Reviewed:** 22
**Status:** issues_found

## Summary

Phase 8 is predominantly markdown content refinement with a single Node integration test at the core. Structural contracts (FR-NN, Given/When/Then AC, `## Out of Scope`, section ordering) are well-established in `step-09-functional.md` and enforced by the new `test-prd-chain.js` against `fixture-refined-prd.md`. The `prd-purpose.md` coding-agent-consumer mindset is referenced cleanly from `step-02b-vision.md`, `step-08-scoping.md`, and `step-11-polish.md`.

Four warnings stand out:

1. **Template emits `## Out of Scope` before any content exists** — combined with Step 9 appending a second `## Out of Scope`, the finalized PRD will almost always contain two sibling H2 sections with the same title, which breaks the validator's "header scan" assumption (step-v-12) and any tool that does `body.indexOf('## Out of Scope')` (including `test-prd-chain.js:100`, which returns the FIRST occurrence).
2. **Banned-phrase regression within the PRD step files themselves** — `step-02b-vision.md:23` and `step-02c-executive-summary.md:23` both say "collaborating with an **expert peer**", which is one of the phrases `step-11-polish.md:119` is explicitly programmed to flag. The facilitator reads these as role-reinforcement before running the polish banned-phrase sweep on the *output*; nothing sweeps the *prompts* themselves, so the drift Phase 8 was meant to clean up still lives in two source files.
3. **Step progress counters drift between "of 11", "of 12", and "of 13"** across the 12 PRD step files. This is not a runtime bug but is user-facing text; partial refactors have left the step headers inconsistent.
4. **`test-prd-chain.js` Phase 1 uses `body.includes(header)` for duplicate-prone headers** — `## Out of Scope` appears in both the template and the Step-9 append. The test currently passes because the fixture is hand-authored, but `body.includes` returns `true` even if the header appears twice. Combined with Warning 1, the test will not catch a real-world "duplicate `## Out of Scope`" regression.

Info items cover portability, regex hardening, and minor polish items.

## Warnings

### WR-01: Template `## Out of Scope` placeholder collides with Step-9 append

**File:** `src/gomad-skills/2-plan-workflows/gm-create-prd/templates/prd-template.md:12`
**Issue:** The template seeds an empty `## Out of Scope` heading immediately, and `step-09-functional.md:187-191` then appends another `## Out of Scope` block after the FRs. Because Step 9's append is the only place that populates OOS-NN entries, the final PRD will contain two sibling `## Out of Scope` sections — an empty one (from the template) and a populated one (from Step 9). This breaks:
  - `step-11-polish.md` §4 "Must Preserve" says "Out of Scope block (OOS-NN entries)" — polish has no rule for deduplicating two same-name H2s.
  - Downstream parsers that look up the section by first-match (`body.indexOf('## Out of Scope')`) will point at the empty one and miss OOS entries.
  - `test-prd-chain.js:100-106` trusts `body.indexOf('## Out of Scope')` and assumes it resolves to the populated block.

The fixture `test/integration/prd-chain/fixture-refined-prd.md` sidesteps this because it is hand-authored and contains only one OOS heading (line 163). A real PRD produced by the workflow will not.

**Fix:** Remove the placeholder from the template — Step 9 is the authoritative author of `## Out of Scope`. Suggested template body:

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

Alternatively, keep the placeholder and change Step 9 to *insert into* the existing section rather than append a new one — but the removal is simpler and matches how every other H2 section is authored (Step 9 for FRs, Step 10 for NFRs, etc.).

### WR-02: Banned phrase "expert peer" lives inside two PRD step prompts

**File:** `src/gomad-skills/2-plan-workflows/gm-create-prd/steps-c/step-02b-vision.md:23`
**File:** `src/gomad-skills/2-plan-workflows/gm-create-prd/steps-c/step-02c-executive-summary.md:23`
**Issue:** Both files contain the line:

> `- ✅ You are a product-focused PM facilitator collaborating with an expert peer`

But `step-11-polish.md:119` lists `"expert peer" (if referring to the user — reword to "product owner driving a coding-agent-built product")` as a banned phrase to strip from PRDs. The §2c sweep only runs against the generated PRD document, not against the upstream prompts that seeded the facilitator's framing. Every other Role Reinforcement block in the phase-8 step files (step-01-init, step-02-discovery, step-05-domain, step-08-scoping-descendants) uses the corrected wording "product owner driving a coding-agent-built product". These two are stragglers.

**Fix:** Replace the line in both files with the canonical role-reinforcement wording that already appears in `step-01-init.md:23` and `step-02-discovery.md:23`:

```markdown
- ✅ You are a product-focused PM facilitator collaborating with a product owner driving a coding-agent-built product
```

### WR-03: Step progress counters drift between "of 11", "of 12", and "of 13"

**Files and lines:**
- `step-01-init.md:3` — `Step 1 of 11` (and line 137 `Step 2 of 11`)
- `step-02-discovery.md:3` — `Step 2 of 13`
- `step-02b-vision.md:3` — `Step 2b of 13`
- `step-02c-executive-summary.md:3` — `Step 2c of 13`
- `step-03-success.md:3` — `Step 3 of 11`
- `step-04-journeys.md:3` — `Step 4 of 11`
- `step-05-domain.md:3` — `Step 5 of 13`
- `step-08-scoping.md:3` — `Step 8 of 11`
- `step-09-functional.md:3` — `Step 9 of 11`
- `step-10-nonfunctional.md:3` — `Step 10 of 12`
- `step-11-polish.md:3` — `Step 11 of 12`

**Issue:** The same workflow is labelled as three different lengths depending on which step file the facilitator opens. `step-01b-continue.md` enumerates a 13-entry lookup table (01 → 02 → 02b → 02c → 03 → 04 → 05 → 06 → 07 → 08 → 09 → 10 → 11 → 12 = 13 steps including the two sub-steps), so the "of 13" headers are correct and "of 11" / "of 12" are stale counts from before 02b/02c were inserted. When a coding-agent consumer reads "Step 3 of 11" after being told "Step 2c of 13" it will either over-estimate progress or silently discard the mismatch.

**Fix:** Normalize every `Progress: Step X of N` line and every "Continue to … (Step Y of N)" menu line to `of 13`. Diff (partial):

```markdown
# step-01-init.md
-**Progress: Step 1 of 11** - Next: Project Discovery
+**Progress: Step 1 of 13** - Next: Project Discovery
...
-"[C] Continue - Save this and move to Project Discovery (Step 2 of 11)"
+"[C] Continue - Save this and move to Project Discovery (Step 2 of 13)"

# step-03-success.md, step-04-journeys.md, step-08-scoping.md,
# step-09-functional.md: same pattern ("of 11" → "of 13")

# step-10-nonfunctional.md, step-11-polish.md: "of 12" → "of 13"
```

`step-06-innovation.md` and `step-07-project-type.md` are outside the phase-8 file list but have the same drift — flagging for awareness, not for in-phase fix.

### WR-04: `test-prd-chain.js` Phase 1 uses `body.includes` — misses duplicate-header regressions

**File:** `test/integration/prd-chain/test-prd-chain.js:94-96`
**Issue:** The structural check iterates the required H2 headers and calls `body.includes(header)`:

```js
for (const header of REQUIRED_SECTIONS) {
  assert(body.includes(header), `${header} present`);
}
```

`String.prototype.includes` is true on **first** match; if a real PRD contains two `## Out of Scope` sections (see WR-01) or two `## Functional Requirements` sections from a re-run, this test will pass while downstream parsers (`body.indexOf`, first-match `match`) silently resolve to the wrong section. For a test explicitly framed as "Pitfall 6 — prevent overly-permissive regex drift" (`test-prd-chain.js:15`), missing the "sibling duplicate H2" case is a meaningful gap.

Additionally, `idxOOS = body.indexOf('## Out of Scope')` (line 101) and `idxNFR = body.indexOf('## Non-Functional Requirements')` (line 102) find first-match. If the template's empty `## Out of Scope` placeholder survives (WR-01), `idxOOS` will point *before* `## Functional Requirements` in some realistic document orderings, flipping the order check into a false failure or false success depending on where the template placeholder ends up.

**Fix:** Assert `occurrences === 1` for each required H2, and use the single match position for the ordering check:

```js
function headerCount(text, header) {
  // Match `^<header>\s*$` precisely — avoid counting prose mentions.
  const re = new RegExp(`^${header.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'gm');
  return (text.match(re) || []).length;
}

for (const header of REQUIRED_SECTIONS) {
  const n = headerCount(body, header);
  assert(n === 1, `${header} present exactly once`, `found ${n} occurrences`);
}
```

This catches both "missing header" and "duplicate header" regressions with a single assertion, and hardens the ordering check against the WR-01 class of drift.

## Info

### IN-01: `test-prd-chain.js` filesystem imports are cross-platform-safe but two paths drift from the project convention

**File:** `test/integration/prd-chain/test-prd-chain.js:23-25`
**Issue:** The test uses `path`, `fs-extra`, and `js-yaml` — all available from `package.json` dependencies (not devDependencies). `fs-extra` is production runtime dep; importing it from a test-only path is fine but slightly unusual (most sibling tests use core `node:fs`). `node:path` style (line 23) is good. `js-yaml` is imported despite `yaml` also being a dep — picking one and standardizing would reduce cognitive load for future test authors.
**Fix:** Non-blocking. If standardizing, prefer `node:fs` + `node:fs/promises` to match `test-gm-command-surface.js:1-30` conventions. No change needed if fs-extra's `existsSync` / `readFileSync` ergonomics are intentional.

### IN-02: Phase 9 negative-fixture test asserts `=== true` on a boolean

**File:** `test/integration/prd-chain/test-prd-chain.js:236-237`
**Issue:**
```js
const legacyUnpadded = /^- FR\d+:/m.test(badFixture);
assert(legacyUnpadded === true, ...);
```
`RegExp.test()` already returns a boolean, so `=== true` is redundant. Minor but reads oddly for a file that otherwise uses `assert(Boolean(x), ...)` elsewhere.
**Fix:**
```js
assert(legacyUnpadded, String.raw`Negative-fixture detector: flags legacy unpadded FR\d+: format`);
```

### IN-03: `extractFRBlocks` boundary: FR block does not close on blank line before next section

**File:** `test/integration/prd-chain/test-prd-chain.js:121-138`
**Issue:** The state machine only closes a block when it sees `^##` or another `^- FR-\d{2}:`. If a stray bullet appears between the last FR's ACs and the next `##` header (e.g. a short paragraph, a bullet-list comment), it will silently extend the `acs` array — a bullet like `    - Note: blah` would be counted as an AC under the currently-open FR. The AC-count floor/cap (≥2, ≤4) would then be polluted.
**Fix:** Tighten the AC matcher to the Given/When/Then shape (or make blank-line end the block):
```js
} else if (current && /^ {4}- AC: Given .+, when .+, then .+/i.test(line)) {
  current.acs.push(line);
} else if (current && line.trim() === '' /* keep going */) {
  continue;
} else if (current) {
  // Non-matching non-blank line inside an FR block — close it defensively.
  blocks.push(current);
  current = null;
}
```
Only worth doing if the fixture ever gains non-FR bullets; skip until then.

### IN-04: `OOS_ENTRY_REGEX` allows mixed dash families silently

**File:** `test/integration/prd-chain/test-prd-chain.js:167`
**Issue:** The regex `/^- \*\*OOS-\d{2}\*\*: .+ (—|-|–) Reason: .+/` accepts en-dash, em-dash, OR hyphen. The comment above it (lines 154-158) says this is intentional to match Unicode rendering differences, which is fine — but a genuine typo like `Reason - :` (hyphen, space, colon) would also pass if the capability text happens to contain a hyphen. The `.+` before the dash group is greedy and will consume any earlier dashes. Impact is low because the fixture is well-formed.
**Fix:** Anchor the marker more tightly:
```js
const OOS_ENTRY_REGEX = /^- \*\*OOS-\d{2}\*\*: .+ [—–-] Reason: \S/;
```
(Character class is equivalent; trailing `\S` rejects empty Reason.)

### IN-05: `test-prd-chain.js` does not set `process.exitCode` defensively before `process.exit`

**File:** `test/integration/prd-chain/test-prd-chain.js:252`
**Issue:** `process.exit(failed > 0 ? 1 : 0)` hard-exits and skips any pending I/O. Node best practice for simple scripts is to set `process.exitCode` and let the event loop drain:
```js
process.exitCode = failed > 0 ? 1 : 0;
```
All siblings in `test/` use `process.exit`, so this matches convention — flagging for awareness only.
**Fix:** None required; keep convention unless a future test adds async cleanup.

### IN-06: `SKILL.md` references `contextual-discovery.md` with `{mode}=autonomous` but has no corresponding headless-mode codepath in the file list

**File:** `src/gomad-skills/1-analysis/gm-product-brief/SKILL.md:54-56`
**Issue:** Line 54 says "Route directly to `prompts/contextual-discovery.md` with `{mode}=autonomous`". The `prompts/` directory has `contextual-discovery.md` (verified — exists), but `draft-and-review.md:72` only mentions "Headless mode: Skip to `finalize.md`". The chain `SKILL (autonomous) → contextual-discovery → ??? → finalize` has no documented intermediate route for autonomous mode through Stage 3. Probably intentional (autonomous mode skips guided elicitation), but worth making the path explicit.
**Fix:** Add one sentence to `draft-and-review.md` or `contextual-discovery.md` noting: "In autonomous mode, Stage 3 (guided elicitation) is skipped; proceed directly to Stage 4." Low-impact polish.

---

_Reviewed: 2026-04-22T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
