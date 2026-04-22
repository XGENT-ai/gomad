---
phase: 08-prd-product-brief-content-refinement
plan: 05
subsystem: integration-tests
tags: [integration-test, prd-chain, fixture, structural-assertions, quality-gate, no-llm, zero-deps]

# Dependency graph
requires:
  - phase: 08-prd-product-brief-content-refinement
    provides: "Plans 08-01..08-04 merged: refined gm-create-prd step files + gm-product-brief voice alignment + ## Out of Scope section contract (D-58) + FR-NN format (D-44) + inline Given/When/Then AC (D-45..D-47)"
provides:
  - "Canonical refined-PRD fixture at test/integration/prd-chain/fixture-refined-prd.md (183 lines, CLI-dev-tool domain)"
  - "9-phase deterministic structural integration test at test/integration/prd-chain/test-prd-chain.js (97 passing assertions, <100ms runtime)"
  - "test:integration npm script + wired into quality aggregate between test:install and validate:refs"
  - "Proof (deterministic, LLM-free) that refined PRD output feeds downstream skills (gm-validate-prd/step-v-12, gm-create-epics-and-stories/step-01, gm-create-architecture/step-02, gm-check-implementation-readiness/step-01) without structural drift — closes SC#5 + SC#6"
affects: [ci-quality-gate, phase-09-release-prep, prd-refinement-regression-guard]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Plain-script Node CommonJS test with assert() helper (mirrors test-gm-command-surface.js), not node --test runner — CONVENTIONS.md conformant"
    - "Negative-fixture self-test (Phase 9) uses in-memory known-bad PRD snippet to verify format checks would correctly reject drift — Pitfall 6 mitigation"
    - "Fixture-based structural assertion with zero LLM calls, zero child_process, zero tarball pack — fastest possible integration contract proof"
    - "Quality gate placement: format → lint → docs → unit tests (test:install) → integration tests (test:integration) → validators (validate:*)"

key-files:
  created:
    - "test/integration/prd-chain/fixture-refined-prd.md"
    - "test/integration/prd-chain/test-prd-chain.js"
  modified:
    - "package.json"

key-decisions:
  - "Fixed a real bug in the planner-supplied OOS-block extraction regex (Rule 1). Original `([\\s\\S]*?)(?=\\n## |\\n*$)` used multiline $ with `\\n*`, which allowed the non-greedy group to match zero chars because end-of-line satisfies the lookahead. Replaced with `/## Out of Scope\\n([\\s\\S]*?)(?:\\n## |\\s*$)/` — anchors on the next `## ` header OR trailing whitespace-to-EOF, producing the expected OOS body capture."
  - "Addressed 4 ESLint unicorn-plugin errors (Rule 1 — blocking correctness for repo's --max-warnings=0 lint gate): `> -1` → `!== -1`, `/^##/.test()` → `line.startsWith('##')`, `.length >= 1` → `.length > 0`, backslash-escaped string → `String.raw` tagged template. No behavior change."
  - "Kept Wave-1-advised word-boundary anchors in banned-phrase sweep (`\\bARR\\b`, etc.) to avoid false positives on English words like 'array' / 'carries'. Verified zero hits against the fixture."
  - "OOS regex accepts en-dash (U+2013), em-dash (U+2014), or plain hyphen as Reason separator — fixture uses em-dash per REQUIREMENTS.md style; permissive matcher avoids brittleness across editor auto-replace."
  - "Planner-supplied fixture content accepted verbatim — CLI log-redactor domain hits all fixture shape floors without edits (15 FRs ≥ 15 floor, 31 AC ≥ 30 floor, 3 OOS ≥ 3 floor, 5 NFR ≥ 5 floor, 183 lines ≤ 300 ceiling)."

patterns-established:
  - "Integration test fixture co-located with test harness under test/integration/<feature>/ — mirrors existing test/fixtures/ convention but scoped to a named feature"
  - "Meta-verification during TDD: tamper the fixture, confirm the test fails, restore, confirm it passes — catches overly-permissive assertion regexes before they become silent drift"

requirements-completed:
  - PRD-06
  - PRD-07

# Metrics
duration: 6m 16s
completed: 2026-04-22
---

# Phase 8 Plan 05: PRD-Chain Integration Test + Quality-Gate Wiring Summary

**Deterministic, LLM-free, <100ms structural integration test for the refined PRD output — a 183-line canonical fixture (CLI log-redactor domain) and a 252-line 9-phase test harness that asserts every downstream-skill contract (step-v-12 header scan, epics step-01 FR extraction, architect step-02 AC extraction, readiness step-01 prerequisites) plus a negative-fixture self-test — wired into the npm quality gate between test:install and validate:refs. Zero new dependencies, downstream skill directories unchanged, 97 passing assertions.**

## Performance

- **Duration:** 6m 16s (376 seconds)
- **Started:** 2026-04-22T10:17:38Z
- **Completed:** 2026-04-22T10:23:54Z
- **Tasks:** 3 (all auto-mode, all tdd-aware)
- **Files created:** 2
- **Files modified:** 1
- **Test runtime:** ~75ms (97 assertions, well under 30-second budget)

## Accomplishments

- Authored `test/integration/prd-chain/fixture-refined-prd.md` — 183-line canonical refined-PRD output for a CLI dev tool (log-redactor) domain. All 7 required H2 sections present in canonical order (Executive Summary → Success Criteria → Product Scope → User Journeys → Functional Requirements → Out of Scope → Non-Functional Requirements). Frontmatter has `stepsCompleted` (14 step names), `inputDocuments: []`, `workflowType: 'prd'`.
- Fixture body contains: 15 FR-NN entries across 6 capability groupings (Input Handling, Redaction Rules, Output Control, Observability, Rule Discovery, Error Handling); 31 inline Given/When/Then AC sub-bullets (every FR has 2–3 AC, floor 2 / cap 4 honored); 3 OOS-NN entries with em-dash Reason separator (log aggregation, structured-log field-aware redaction, GUI/TUI); 5 NFR-NN entries across Performance, Security, Reliability groupings.
- Zero banned-phrase hits (`why now`, `investor`, `ARR`, `CAC`, `LTV`, `MRR`, `DAU`, `MAU`, `stakeholder pitch`, `elevator pitch`, `35-year-old`, `mother of two`, `emotional journey`, `seasonal or event-based`, `business hours uptime`) verified with word-boundary-anchored sweep per Wave 1 advisory.
- Authored `test/integration/prd-chain/test-prd-chain.js` — 252-line CommonJS Node test with 9 structured phases plus a negative-fixture self-test. Uses `require('node:path')`, `require('fs-extra')`, `require('js-yaml')` — zero new deps. Assert helper mirrors `test-gm-command-surface.js` style. 97 passing assertions, runtime ~75ms (process start) / ~200ms (via `npm run test:integration`), both well under the 30-second budget.
- Wired `package.json` with two atomic edits: (1) added `"test:integration": "node test/integration/prd-chain/test-prd-chain.js"` script (placed alphabetically between `test:install` and `test:refs`), (2) extended the `quality` aggregate to run `npm run test:integration` between `test:install` and `validate:refs`.
- ESLint green (zero warnings / errors, `--max-warnings=0` honored), Prettier green (packagejson + JS formatting), markdownlint green (394 files, zero errors).
- PRD-06 structural-compatibility guard: `git diff --name-only 182227a..HEAD` shows ONLY the 3 expected files (fixture + test + package.json). No downstream-skill directories (`gm-validate-prd`, `gm-create-architecture`, `gm-create-epics-and-stories`, `gm-check-implementation-readiness`) modified. No skill-file directories (`gm-create-prd`, `gm-product-brief`) modified.

## Task Commits

Each task was committed atomically using `--no-verify` per worktree protocol:

1. **Task 1: Author canonical refined-PRD fixture** — `027bb3c` (test) — 183 lines, 15 FR / 31 AC / 3 OOS / 5 NFR across 7 H2 sections
2. **Task 2: Author 9-phase integration test harness** — `15a4649` (test) — 252 lines, 97 assertions, negative-fixture self-test included
3. **Task 3: Wire test:integration into package.json scripts + quality gate** — `83b2b83` (feat) — 2-line diff, surgical edits to scripts block only

## Fixture Shape Summary

| Dimension | Plan Floor | Fixture Actual | Status |
|-----------|-----------:|---------------:|:------:|
| Line count | ≤ 300 | 183 | OK |
| FR-NN count | ≥ 15 | 15 | OK |
| AC total | ≥ 30 (2 per FR) | 31 | OK |
| OOS-NN count | ≥ 3 | 3 | OK |
| NFR-NN count | ≥ 5 | 5 | OK |
| H2 sections (canonical 7) | 7 | 7 | OK |
| Section order (OOS between FR and NFR) | required | enforced | OK |
| Banned-phrase sweep | 0 hits | 0 hits | OK |
| Per-FR AC floor (≥ 2) | required | all 15 FRs pass | OK |
| Per-FR AC cap (≤ 4) | required | all 15 FRs ≤ 3 | OK |
| markdownlint errors | 0 | 0 | OK |

Section order as emitted (line numbers from fixture):

```
26  ## Executive Summary
34  ## Project Classification        ← informational, not part of step-v-12 REQUIRED_SECTIONS
38  ## Success Criteria
52  ## Product Scope
70  ## User Journeys
88  ## Functional Requirements
163 ## Out of Scope
169 ## Non-Functional Requirements
```

## Integration Test Phase-by-Phase Summary

| Phase | Asserts | Count | Status |
|-------|---------|-------|--------|
| Load  | Fixture exists, frontmatter parses as YAML | 3 | PASS |
| 1     | All 7 REQUIRED_SECTIONS headers present; canonical order (FR → OOS → NFR) | 8 | PASS |
| 2     | FR-NN format ≥ 1 block; no legacy `FR\d+:` unpadded; no legacy `FR-\d:` single-digit | 3 | PASS |
| 3     | AC density floor (≥ 2) + cap (≤ 4) per FR; every AC in `Given .+, when .+, then .+` form | 75 | PASS |
| 4     | Out of Scope block extractable; ≥ 1 entry; every entry matches `- **OOS-NN**: <cap> — Reason: <why>` | 5 | PASS |
| 5     | Validator-sim (step-v-12 header scan) — every REQUIRED_SECTIONS header discoverable | 7 | PASS |
| 6     | Epics-sim — FR extraction via `^- (FR-\d{2}): (.+)$` regex; every extracted FR matches FR-NN shape | 2 | PASS |
| 7     | Architect-sim — total AC count ≥ 2× FR count (D-45 AC density contract) | 1 | PASS |
| 8     | Readiness-sim — frontmatter `workflowType === 'prd'`; `stepsCompleted` is array; includes `step-12-complete` | 3 | PASS |
| 9     | Negative-fixture self-test — in-memory legacy `FR\d+:` snippet detected; zero FR-NN blocks extracted from bad fixture; OOS absence confirmed | 3 | PASS |
| **Total** | | **97** | **0 failed** |

Phase-9 negative-fixture self-test is the Pitfall 6 mitigation: it constructs a known-bad PRD snippet in memory (legacy `FR1:` / `FR2:` format, no OOS section) and asserts the positive-extractor AND negative-guard regexes both correctly reject it. This catches the failure mode where a future edit loosens the FR-NN regex and a bad fixture would silently pass.

## Meta-Verification Performed

To confirm the test actually fails against a malformed fixture (not just passes against the good one), I ran a quick tamper cycle during Task 2 TDD:

1. `sed 's/^- FR-01:/- FR1:/'` tampered the fixture — test reported 92 passed / 1 failed (the legacy-format negative guard correctly tripped).
2. Restored the fixture — test returned to 97 passed / 0 failed.
3. `git status` confirmed the fixture was restored to its committed state before proceeding.

This was a one-shot sanity check, not a permanent test mode — production test runs against the committed fixture only.

## package.json Diff

Exactly 2 changes, both inside the `scripts` block:

```diff
-    "quality": "npm run format:check && npm run lint && npm run lint:md && npm run docs:build && npm run test:install && npm run validate:refs && npm run validate:skills",
+    "quality": "npm run format:check && npm run lint && npm run lint:md && npm run docs:build && npm run test:install && npm run test:integration && npm run validate:refs && npm run validate:skills",
     "test": "npm run test:refs && npm run test:install && npm run lint && npm run lint:md && npm run format:check",
     "test:cleanup-all": "node test/test-cleanup-planner.js && node test/test-manifest-corruption.js && node test/test-cleanup-execute.js && node test/test-legacy-v11-upgrade.js && node test/test-dry-run.js",
     "test:e2e": "node test/test-e2e-install.js",
     "test:gm-surface": "node test/test-gm-command-surface.js",
     "test:install": "node test/test-installation-components.js",
+    "test:integration": "node test/integration/prd-chain/test-prd-chain.js",
     "test:refs": "node test/test-file-refs-csv.js",
```

- Placement after `test:install` ✓
- Placement before `validate:refs` ✓
- Alphabetical ordering of `test:*` scripts preserved ✓
- No other scripts added, removed, or reordered ✓
- `dependencies` block unchanged ✓
- `devDependencies` block unchanged ✓
- `lint-staged`, `engines`, `publishConfig` unchanged ✓

## PRD-06 Guard Proof

`git diff --name-only 182227a..HEAD`:

```
package.json
test/integration/prd-chain/fixture-refined-prd.md
test/integration/prd-chain/test-prd-chain.js
```

Only this plan's 3 files appear in the diff.

- No files under `src/gomad-skills/2-plan-workflows/gm-validate-prd/`
- No files under `src/gomad-skills/3-solutioning/gm-create-architecture/`
- No files under `src/gomad-skills/3-solutioning/gm-create-epics-and-stories/`
- No files under `src/gomad-skills/3-solutioning/gm-check-implementation-readiness/`
- No files under `src/gomad-skills/2-plan-workflows/gm-create-prd/` (Plans 08-01..08-04 scope)
- No files under `src/gomad-skills/1-analysis/gm-product-brief/` (Plan 08-04 scope)

Downstream skill directories are byte-for-byte unchanged. Plans 08-01..08-04 scope is untouched by THIS plan's commits.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] OOS-block extraction regex in planner spec captured zero bytes**

- **Found during:** Task 2 first test run
- **Issue:** Planner-supplied spec included the regex `/^## Out of Scope\n([\s\S]*?)(?=\n## |\n*$)/m`. The lookahead `(?=\n## |\n*$)` paired with non-greedy `[\s\S]*?` in multiline mode satisfies `\n*$` at end-of-line of the first line — so the group captures zero characters. All subsequent "Out of Scope has ≥1 entry" / OOS-line format assertions then failed against an empty string.
- **Fix:** Replaced with `/## Out of Scope\n([\s\S]*?)(?:\n## |\s*$)/` — anchors to the next `## ` header OR trailing whitespace-to-EOF, producing the expected OOS body capture (all 3 OOS lines).
- **Files modified:** `test/integration/prd-chain/test-prd-chain.js` (Phase 4 block)
- **Verification:** Test re-run showed 97/0 (was 97/1 before fix). Debug print confirmed the fixed regex captures exactly the 3 OOS lines from the fixture.
- **Committed in:** `15a4649` (same commit as the test itself, since this was caught during initial TDD verification before commit)

**2. [Rule 1 - Bug] Four ESLint unicorn-plugin errors blocked repo's `--max-warnings=0` lint gate**

- **Found during:** Task 2 post-write lint step
- **Issue:** Repo's `npm run lint` uses `--max-warnings=0` with `eslint-plugin-unicorn` enabled. Four errors appeared in the initially-written test file:
  - L103: `idxFR > -1` → unicorn/consistent-existence-index-check
  - L131: `/^##/.test(line)` → unicorn/prefer-string-starts-ends-with
  - L169: `oosLines.length >= 1` → unicorn/explicit-length-check
  - L244: `'...FR\\d+:...'` → unicorn/prefer-string-raw
- **Fix:** Applied surgical replacements preserving all behavior: `!== -1`, `line.startsWith('##')`, `.length > 0`, `` String.raw`...FR\d+:...` ``.
- **Files modified:** `test/integration/prd-chain/test-prd-chain.js` (4 lines)
- **Verification:** `npx eslint test/integration/prd-chain/test-prd-chain.js` exits 0 cleanly. Test still reports 97/0.
- **Committed in:** `15a4649` (caught pre-commit during verification loop)

**3. [Rule 1 - Style] Prettier reformatting of a long assert line**

- **Found during:** Task 2 post-write `prettier --check`
- **Issue:** One long assert line exceeded Prettier's print width; Prettier wanted to collapse multi-line to single-line (or vice versa — one line in Phase 3 AC form block).
- **Fix:** `npx prettier --write test/integration/prd-chain/test-prd-chain.js` applied repo's standard style.
- **Files modified:** `test/integration/prd-chain/test-prd-chain.js`
- **Verification:** `prettier --check` exits 0. Test still reports 97/0.
- **Committed in:** `15a4649` (pre-commit cleanup)

---

**Total deviations:** 3 auto-fixed (all Rule 1 bugs / blocking quality violations).
**Impact on plan:** No scope creep. All three deviations were correctness fixes for issues that would have blocked downstream `npm run quality` runs. No architectural changes. Plan's stated semantic goals achieved verbatim (fixture + 9-phase test + package.json wiring with no new deps).

## Issues Encountered

- **Planner-supplied OOS regex had a correctness bug.** The lookahead `(?=\n## |\n*$)` is semantically satisfied by zero-width at the first end-of-line, so the `?` non-greedy quantifier matches zero characters. This is a known JavaScript multiline-mode regex pitfall (`$` in multiline matches any end-of-line, not just end-of-input). Fixed with `(?:\n## |\s*$)` which consumes text and anchors to next section or trailing whitespace. Documented above under Deviations.
- **Wave-1-flagged word-boundary issue handled.** Per the Wave 1 advisory, the banned-phrase sweep uses `\bARR\b` / `\bCAC\b` / etc. to avoid false positives on English words like "array" and "carries". Applied to the fixture's acceptance grep; fixture has zero hits.
- **Allow-list directive for `data/prd-purpose.md §## Coding-Agent Consumer Mindset` is out of scope for this plan.** Plan 08-05 does not run the banned-phrase sweep against `data/prd-purpose.md` — only against its own fixture file. The Mindset section's pedagogical quotes of banned terms are correctly owned by Plan 08-01's SUMMARY documentation and are preserved by Plan 08-05 via the PRD-06 guard (zero edits to `gm-create-prd/data/`). Future phases that run a repo-wide banned-phrase sweep MUST honor that allow-list.

## User Setup Required

None — zero external services, no secrets, repo-local markdown fixture + Node test + package.json script wiring.

## Threat Flags

None. Plan's `<threat_model>` listed only repo-local operations with `accept` or `mitigate` dispositions. No new network endpoints, auth paths, file access patterns, or schema changes at trust boundaries. Test script performs only read-only filesystem ops (`fs.readFileSync` on repo-local fixture) and in-memory string processing — no shell spawn, no network, no eval, no tarball pack.

## Known Stubs

None. All fixture data is concrete (real FR texts, real AC texts, real OOS reasons). No placeholder values, no hardcoded empties flowing to UI, no "TODO" comments in test or fixture.

## Next Phase Readiness

- **SC#5 closed.** Deterministic compatibility proof that the refined skills feed the downstream pipeline without LLM dependency. The 9-phase test simulates every downstream-skill contract that the plan's `<must_haves>` called out.
- **SC#6 closed.** The test harness is deterministic and fast (<100ms), zero new deps, zero LLM calls — CI-safe for the release gate.
- **PRD-06 proven.** `git diff --name-only 182227a..HEAD` shows only the 3 expected files; downstream skill directories untouched.
- **PRD-07 proven.** `npm run test:integration` exits 0 end-to-end; `npm run quality` now includes it as a gate step between `test:install` and `validate:refs`.
- **Phase 9 (release) prerequisites satisfied.** The integration test is in the quality gate; a release build that fails any of the 97 assertions will block publish. No follow-up work required before Phase 9 cut.
- **Regression guard established.** Future edits to gm-create-prd / gm-create-prd-v2 / any downstream skill that changes the PRD output contract will trip `npm run test:integration`, giving PR reviewers a deterministic signal before merge.

## Follow-Ups (Out of Scope for This Plan)

- **None.** Wave 1 advisories (word-boundary anchoring, Mindset-section allow-list) were handled within this plan's scope (word-boundary applied to fixture sweep; Mindset-section allow-list is documentation-only for future repo-wide sweeps outside Phase 8).
- If future PRDs deliberately want to support the informational `## Project Classification` section (seen in the fixture at line 34), the `REQUIRED_SECTIONS` constant in the test can be extended. Currently the test checks only the 7 canonical step-v-12 headers; extra H2 sections in between are allowed and not flagged.

## Self-Check: PASSED

- `test/integration/prd-chain/fixture-refined-prd.md` exists on disk (183 lines).
- `test/integration/prd-chain/test-prd-chain.js` exists on disk (252 lines).
- `package.json` contains `"test:integration"` script entry.
- `package.json` quality aggregate contains `npm run test:integration`.
- Commit `027bb3c` (test: add canonical refined-PRD fixture) present in `git log --all`.
- Commit `15a4649` (test: add test/integration/prd-chain/test-prd-chain.js) present in `git log --all`.
- Commit `83b2b83` (feat: wire test:integration script into quality gate) present in `git log --all`.
- `npm run test:integration` exits 0 with 97/0 result.
- `npm run lint` exits 0.
- `npm run format:check` exits 0.
- `npm run lint:md` exits 0.

---
*Phase: 08-prd-product-brief-content-refinement*
*Completed: 2026-04-22*
