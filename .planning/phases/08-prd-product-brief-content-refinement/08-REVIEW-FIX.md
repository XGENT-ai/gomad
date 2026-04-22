---
status: all_fixed
phase: 08
phase_name: prd-product-brief-content-refinement
source: 08-REVIEW.md
fix_scope: critical_warning
findings_in_scope: 4
fixed: 4
skipped: 0
iteration: 1
date: 2026-04-22
---

# Phase 8 — Code Review Fix Report

> Fixes applied for the 4 WARN-level findings flagged in `08-REVIEW.md`. Info-level
> findings (IN-01..IN-06) were out of scope for this pass (no `--all` flag).

---

## Summary

| Finding | Severity | Status | Commit |
|---------|----------|--------|--------|
| WR-01 — duplicate `## Out of Scope` H2 on live runs (template placeholder + step-09 emission) | Warning | ✅ fixed | `e664a06` |
| WR-02 — residual "expert peer" at `step-02b-vision.md:23` + `step-02c-executive-summary.md:23` | Warning | ✅ fixed | `4cac616` |
| WR-03 — step progress counter drift ("of 11"/"of 12" vs canonical "of 13") across 9 files | Warning | ✅ fixed | `82647c8` |
| WR-04 — `test-prd-chain.js` used `body.includes`/`indexOf` — could not detect duplicate H2s | Warning | ✅ fixed | `50c6937` |

All `npm test` and `npm run test:integration` runs green post-fix (205 + 97 passing, 0 failed).

---

## Per-finding detail

### WR-01 — Duplicate `## Out of Scope` (template placeholder)

**File:** `src/gomad-skills/2-plan-workflows/gm-create-prd/templates/prd-template.md`
**Problem:** Empty `## Out of Scope` placeholder at line 12 collided with the populated
`## Out of Scope` block emitted by `step-09-functional.md` on live runs — producing two
sibling H2s with identical titles that downstream `body.indexOf`-style parsers would
silently resolve to the empty one.
**Fix (commit `e664a06`):** Removed the empty placeholder from `prd-template.md`. The
`step-09` emission is the single source of truth; template remains header-only for
other sections (D-58 disposition per RESEARCH.md Q4 "no literal example entries" preserved).
**Verification:** `grep -c '^## Out of Scope$' .../templates/prd-template.md` → 0 in
template; `step-09` emission remains as the canonical source.

### WR-02 — Residual "expert peer" framing

**Files:**
- `src/gomad-skills/2-plan-workflows/gm-create-prd/steps-c/step-02b-vision.md:23`
- `src/gomad-skills/2-plan-workflows/gm-create-prd/steps-c/step-02c-executive-summary.md:23`

**Problem:** Phase 8 Plan 08-02 Task 1 swept "expert peer" → "product owner driving a
coding-agent-built product" across 9 files in `gm-create-prd/` but missed these 2 —
they belong to Plan 08-01's file scope, and Plan 08-01 did not include the reword.
The `step-11-polish.md:119` banned-phrase sweep catches them post-generation, but the
source prompts still seed the stale framing.
**Fix (commit `4cac616`):** Applied the canonical reword in both files. Voice is now
consistent across all 11 files carrying the Role Reinforcement block.
**Verification:** `grep -rn 'expert peer' src/gomad-skills/2-plan-workflows/gm-create-prd/`
returns only the intentional reference at `step-11-polish.md:119` (banned-phrase list).

### WR-03 — Step progress counter drift

**Files normalized** (9 total):
- `step-01-init.md`, `step-03-success.md`, `step-04-journeys.md`,
  `step-06-innovation.md`, `step-07-project-type.md`, `step-08-scoping.md`,
  `step-09-functional.md` — were showing "of 11"
- `step-10-nonfunctional.md`, `step-11-polish.md` — were showing "of 12"

**Canonical count:** 13 (matching the already-correct `step-02`, `step-02b`, `step-02c`,
`step-05` files). Rationale: of the 15 step files in `steps-c/`, two are off-path
(`step-01b-continue.md` is the resume entry, `step-12-complete.md` is the final
write) and do not carry a `**Progress: Step N of M**` heading. The remaining 13
files form the numbered progress chain.
**Fix (commit `82647c8`):** `sed -i '' 's/of 11/of 13/g'` across the 7 "of 11" files
and `s/of 12/of 13/g` across the 2 "of 12" files. Both the `**Progress: Step N of M**`
heading and the "(Step N of M)" mid-body references were updated.
**Verification:** `grep -rE 'Step [0-9]+[a-z]? of [0-9]+' .../steps-c/ | awk -F'of ' '{print $2}' | sort -u`
returns only values ending in "13".

### WR-04 — Duplicate-header detection in integration test

**File:** `test/integration/prd-chain/test-prd-chain.js:94–96`
**Problem:** The Phase 1 structural section loop used `body.includes(header)`, which
returns `true` for both zero-or-more occurrences ≥ 1 — it could not detect the
duplicate `## Out of Scope` regression described in WR-01. The test framing claims
"Pitfall 6 — prevent overly-permissive regex drift", so the assertion needed to be
tightened to exactly-one semantics.
**Fix (commit `50c6937`):** Replaced the `includes` assertion with a multiline-regex
count:
```js
for (const header of REQUIRED_SECTIONS) {
  const escaped = header.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
  const headerPattern = new RegExp(`^${escaped}$`, 'gm');
  const matches = body.match(headerPattern) || [];
  assert(matches.length === 1, `${header} present exactly once (found ${matches.length})`);
}
```
(A unicorn-plugin lint auto-fix converted `.replace` → `.replaceAll` post-edit.)

**Verification:** `node test/integration/prd-chain/test-prd-chain.js` — 97 passing, 0
failed. The assertion now fails-closed if a future regression introduces duplicate
H2s.

---

## Out-of-scope (info findings carried forward)

The following Info findings from `08-REVIEW.md` were NOT addressed this pass (no
`--all` flag). They remain as polish opportunities for a follow-up:

- **IN-01** — Dependency-style drift (`fs-extra` + `js-yaml` vs sibling tests' `node:fs`)
- **IN-02** — Redundant `=== true` on `RegExp.test()` result (test-prd-chain.js:237)
- **IN-03** — `extractFRBlocks` state-machine boundary robustness (tolerates non-matching bullets inside FR blocks)
- **IN-04** — `OOS_ENTRY_REGEX` greedy `.+` tolerates non-canonical dash spacing
- **IN-05** — `process.exit` vs `process.exitCode` convention
- **IN-06** — `gm-product-brief/SKILL.md` autonomous-mode documents the entry but not the `→ finalize` bridge

Re-run with `/gsd:code-review-fix 8 --all` to attempt these.

---

## Final status

- 4/4 critical-warning findings resolved
- All phase-level tests green (205 + 97 passing)
- No regressions introduced
- Phase 8 verification remains **passed** — these were advisory polish, not must-have failures
