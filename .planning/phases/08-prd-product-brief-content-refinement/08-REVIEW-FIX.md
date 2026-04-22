---
status: partial
phase: 08
phase_name: prd-product-brief-content-refinement
source: 08-REVIEW.md
fix_scope: all
findings_in_scope: 10
fixed: 7
skipped: 3
iteration: 2
date: 2026-04-22
---

# Phase 8 — Code Review Fix Report

> Cumulative fix report across two iterations.
>
> **Iteration 1** (scope = `critical_warning`): addressed the 4 WARN-level findings
> (WR-01..WR-04). See commits `e664a06`, `4cac616`, `82647c8`, `50c6937`.
>
> **Iteration 2** (scope = `all`): this pass re-opened the phase with `--all`, so
> the 6 INFO-level findings (IN-01..IN-06) came into scope. Three of the six were
> applied as low-risk polish (IN-02, IN-04, IN-06); the other three were skipped
> per the review's own "non-blocking / only if X" guidance.

---

## Summary

| Finding | Severity | Status | Commit |
|---------|----------|--------|--------|
| WR-01 — duplicate `## Out of Scope` H2 on live runs (template placeholder + step-09 emission) | Warning | fixed (iter-1) | `e664a06` |
| WR-02 — residual "expert peer" at `step-02b-vision.md:23` + `step-02c-executive-summary.md:23` | Warning | fixed (iter-1) | `4cac616` |
| WR-03 — step progress counter drift ("of 11"/"of 12" vs canonical "of 13") across 9 files | Warning | fixed (iter-1) | `82647c8` |
| WR-04 — `test-prd-chain.js` used `body.includes`/`indexOf` — could not detect duplicate H2s | Warning | fixed (iter-1) | `50c6937` |
| IN-01 — `fs-extra`/`js-yaml` imports drift from sibling tests' `node:fs` convention | Info | skipped | — |
| IN-02 — redundant `=== true` on `RegExp.test()` result (test-prd-chain.js:240) | Info | fixed (iter-2) | `b6b26a6` |
| IN-03 — `extractFRBlocks` boundary: stray bullet between FR ACs and next `##` would pollute `acs` | Info | skipped | — |
| IN-04 — `OOS_ENTRY_REGEX` allowed non-canonical dash / empty Reason | Info | fixed (iter-2) | `3c71a14` |
| IN-05 — `process.exit` vs `process.exitCode` convention | Info | skipped | — |
| IN-06 — `gm-product-brief/SKILL.md` autonomous-mode docs no explicit bridge to `finalize` | Info | fixed (iter-2) | `ccc9570` |

**Test status post-iter-2:** `npm test` (205 passing) and `npm run test:integration`
(97 passing) both green. No regressions introduced by any of the three polish fixes.

---

## Per-finding detail — Warnings (iteration 1, already applied)

### WR-01 — Duplicate `## Out of Scope` (template placeholder)

**File:** `src/gomad-skills/2-plan-workflows/gm-create-prd/templates/prd-template.md`
**Problem:** Empty `## Out of Scope` placeholder at line 12 collided with the populated
`## Out of Scope` block emitted by `step-09-functional.md` on live runs — producing two
sibling H2s with identical titles that downstream `body.indexOf`-style parsers would
silently resolve to the empty one.
**Fix (commit `e664a06`):** Removed the empty placeholder from `prd-template.md`. The
`step-09` emission is the single source of truth.

### WR-02 — Residual "expert peer" framing

**Files:**
- `src/gomad-skills/2-plan-workflows/gm-create-prd/steps-c/step-02b-vision.md:23`
- `src/gomad-skills/2-plan-workflows/gm-create-prd/steps-c/step-02c-executive-summary.md:23`

**Problem:** Stale "collaborating with an expert peer" wording — one of the phrases
`step-11-polish.md:119` is explicitly programmed to flag.
**Fix (commit `4cac616`):** Applied the canonical "product owner driving a
coding-agent-built product" reword in both files.

### WR-03 — Step progress counter drift

**Files normalized** (9 total): `step-01-init.md`, `step-03-success.md`,
`step-04-journeys.md`, `step-06-innovation.md`, `step-07-project-type.md`,
`step-08-scoping.md`, `step-09-functional.md` (were "of 11") and
`step-10-nonfunctional.md`, `step-11-polish.md` (were "of 12").
**Fix (commit `82647c8`):** Normalized to canonical "of 13" across all 9 files.

### WR-04 — Duplicate-header detection in integration test

**File:** `test/integration/prd-chain/test-prd-chain.js:94-96`
**Problem:** Phase 1 used `body.includes(header)` — returns true on any occurrence
count >=1, so duplicate H2s from WR-01 would go undetected.
**Fix (commit `50c6937`):** Replaced with multiline-regex exactly-one assertion.

---

## Per-finding detail — Info fixes (iteration 2)

### IN-02 — redundant `=== true` on RegExp.test()

**File:** `test/integration/prd-chain/test-prd-chain.js:240`
**Problem:** `RegExp.test()` already returns a boolean, so `=== true` is noise.
**Fix (commit `b6b26a6`):** Dropped `=== true`:
```js
const legacyUnpadded = /^- FR\d+:/m.test(badFixture);
assert(legacyUnpadded, String.raw`Negative-fixture detector: flags legacy unpadded FR\d+: format`);
```
**Verification:** Tier 1 re-read OK; `node -c` syntax check OK; full
`test-prd-chain.js` run → 97 passing, 0 failed.

### IN-04 — `OOS_ENTRY_REGEX` allowed mixed dash families and empty Reason

**File:** `test/integration/prd-chain/test-prd-chain.js:170`
**Problem:** `(—|-|–)` alternation combined with greedy `.+` could accept a
non-canonical dash/space/colon shape; trailing `.+` accepted empty-looking reasons.
**Fix (commit `3c71a14`):** Tightened to character class and `\S` anchor:
```js
const OOS_ENTRY_REGEX = /^- \*\*OOS-\d{2}\*\*: .+ [—–-] Reason: \S/;
```
**Verification:** Tier 1 re-read OK; `node -c` syntax check OK; 97 passing, 0 failed.
Fixture's canonical em-dash lines still pass; empty `Reason:` would now reject.

### IN-06 — autonomous-mode bridge from `contextual-discovery` to `finalize`

**File:** `src/gomad-skills/1-analysis/gm-product-brief/prompts/draft-and-review.md:72`
**Problem:** `SKILL.md:54` routes autonomous flow into `contextual-discovery.md`,
but the onward path (skip guided elicitation → finalize) was implicit.
**Fix (commit `ccc9570`):** Added a parenthetical to the existing "Headless mode"
line explicitly naming the chain `SKILL → contextual-discovery → draft-and-review →
finalize`.
**Verification:** Tier 1 re-read confirms the sentence is in place; no code paths
affected (pure markdown doc). `npm run lint:md` clean.

---

## Per-finding detail — Info skips

### IN-01 — filesystem import convention drift

**File:** `test/integration/prd-chain/test-prd-chain.js:23-25`
**Reason skipped:** The review itself marks this **non-blocking** and notes the
current `fs-extra` + `js-yaml` usage is intentionally consistent with project
`package.json` production dependencies. `fs-extra`'s `existsSync`/`readFileSync`
ergonomics are appropriate here; swapping to `node:fs` would be pure churn with
no behavior change, and `js-yaml` is already the established YAML parser across
the codebase (grep shows multiple call sites — `yaml` package is also a dep but
less widely adopted internally). Deferring until a broader test-harness style
sweep is scheduled.

### IN-03 — `extractFRBlocks` boundary hardening

**File:** `test/integration/prd-chain/test-prd-chain.js:124-141`
**Reason skipped:** The review's own closing line explicitly says "Only worth
doing if the fixture ever gains non-FR bullets; skip until then." The current
fixture (`fixture-refined-prd.md`) contains only well-formed `FR-NN` + `    - AC:`
patterns; no defensive close is needed until a regression scenario actually
materializes. Adding state-machine complexity now without a failing test to
anchor it would be speculative — revisit if Phase 9+ fixtures add prose or stray
bullets inside FR blocks.

### IN-05 — `process.exit` vs `process.exitCode`

**File:** `test/integration/prd-chain/test-prd-chain.js:255`
**Reason skipped:** The review's own "Fix" section says "None required; keep
convention unless a future test adds async cleanup." All sibling tests in `test/`
use `process.exit`. Changing this one file would diverge from the established
project convention. The test has no async I/O to drain, so the distinction is
purely stylistic. Deferring until a project-wide test-runner convention change
is scheduled.

---

## Final status

- 7 of 10 findings resolved (4 Warnings + 3 Info polish)
- 3 Info findings skipped with explicit per-finding justification (all aligned
  with the review's own "non-blocking" / "only if X" guidance)
- All phase-level tests green post-iter-2: `npm test` (205 passing) and
  `npm run test:integration` (97 passing), zero regressions
- Phase 8 verification remains **passed** — Warnings were the blocking subset and
  all are resolved; Info items that remain are advisory style-consistency notes
  with explicit deferral rationale
