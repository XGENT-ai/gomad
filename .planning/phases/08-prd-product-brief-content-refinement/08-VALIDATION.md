---
phase: 8
slug: prd-product-brief-content-refinement
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-22
updated: 2026-04-22
---

# Phase 8 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Regenerated against the 5-plan decomposition (13 tasks total) on 2026-04-22.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node CommonJS + node:assert (mirrors `test/test-gm-command-surface.js`) |
| **Config file** | `package.json` scripts block (adds `test:integration` script wired into `quality`) |
| **Quick run command** | `node test/integration/prd-chain/test-prd-chain.js` |
| **Full suite command** | `npm run quality` (wraps format:check + lint + lint:md + docs:build + test:install + test:integration + validate:refs + validate:skills) |
| **Estimated runtime** | ~30 seconds total; integration test budget <30s (fixture-driven, no LLM calls) |

---

## Sampling Rate

- **After every task commit:** Run `npm run lint:md` on modified markdown files + targeted grep assertions per task's `<verify>`
- **After every plan wave:** Run `npm run quality`
- **Before `/gsd-verify-work`:** `npm run quality` must be green; integration chain test must exit 0
- **Max feedback latency:** 45 seconds

---

## Plan Structure Summary

| Plan | Wave | Tasks | Scope |
|------|------|-------|-------|
| 08-01 | 1 | 2 | SC#1 explicit cuts: prd-purpose.md Mindset section + step-02b/02c/03/10 strips (PRD-01, PRD-03, PRD-06) |
| 08-02 | 1 | 3 | SC#2 residual sweep: expert-peer reword across 9 files; step-08 scoping strip + mindset wire; 7-file banned-phrase sweep (PRD-02, PRD-03, PRD-06) |
| 08-03 | 1 | 3 | Content-shape changes: step-04 action-oriented journeys; step-09 FR-NN/AC/OOS; step-11 §2c + prd-template.md `## Out of Scope` header placeholder (PRD-02, PRD-03, PRD-04, PRD-06) |
| 08-04 | 1 | 3 | gm-product-brief light pass: SKILL.md + brief-template.md voice-align; prompts sweep + package.json placeholder edits (PRD-05, PRD-06) |
| 08-05 | 2 | 3 | Integration test: fixture authoring; test-prd-chain.js harness; package.json scripts wiring (PRD-06, PRD-07) |
| **Total** | — | **13** | **2 + 3 + 3 + 3 + 3** — plans 08-01..08-04 parallel-ready, 08-05 depends on all four |

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 08-01-01 | 01 | 1 | PRD-01, PRD-03 | T-08-01-01 | `data/prd-purpose.md` gains `## Coding-Agent Consumer Mindset` section between Core Philosophy and Traceability Chain; NFR example reworded from `business hours uptime` to `system uptime` | lint+grep | `grep -q '^## Coding-Agent Consumer Mindset$' src/gomad-skills/2-plan-workflows/gm-create-prd/data/prd-purpose.md && grep -q 'maintain 99.9% system uptime as measured by cloud provider SLA' src/gomad-skills/2-plan-workflows/gm-create-prd/data/prd-purpose.md && ! grep -q '99.9% uptime during business hours' src/gomad-skills/2-plan-workflows/gm-create-prd/data/prd-purpose.md && npm run lint:md -- src/gomad-skills/2-plan-workflows/gm-create-prd/data/prd-purpose.md` | ✅ exists | ⬜ pending |
| 08-01-02 | 01 | 1 | PRD-01, PRD-03 | T-08-01-02 | step-02b-vision.md (no `Why now?`), step-02c-executive-summary.md (`consumable by coding agents`), step-03-success.md (no §3 Business Success; no vague-metric examples), step-10-nonfunctional.md (no seasonal-spikes probe) | grep+lint | `! grep -qi 'why now' src/gomad-skills/2-plan-workflows/gm-create-prd/steps-c/step-02b-vision.md && grep -q 'consumable by coding agents' src/gomad-skills/2-plan-workflows/gm-create-prd/steps-c/step-02c-executive-summary.md && ! grep -q '### 3\. Define Business Success' src/gomad-skills/2-plan-workflows/gm-create-prd/steps-c/step-03-success.md && ! grep -q 'seasonal or event-based' src/gomad-skills/2-plan-workflows/gm-create-prd/steps-c/step-10-nonfunctional.md && npm run lint:md -- src/gomad-skills/2-plan-workflows/gm-create-prd/steps-c/step-02b-vision.md src/gomad-skills/2-plan-workflows/gm-create-prd/steps-c/step-02c-executive-summary.md src/gomad-skills/2-plan-workflows/gm-create-prd/steps-c/step-03-success.md src/gomad-skills/2-plan-workflows/gm-create-prd/steps-c/step-10-nonfunctional.md` | ✅ exists | ⬜ pending |
| 08-02-01 | 02 | 1 | PRD-02, PRD-06 | T-08-02-01 | `expert peer` replaced with `product owner driving a coding-agent-built product` across workflow.md + 8 steps-c files; `product-focused PM facilitator` role preserved | grep+lint | `! grep -rn 'expert peer' src/gomad-skills/2-plan-workflows/gm-create-prd/workflow.md src/gomad-skills/2-plan-workflows/gm-create-prd/steps-c/step-01-init.md src/gomad-skills/2-plan-workflows/gm-create-prd/steps-c/step-01b-continue.md src/gomad-skills/2-plan-workflows/gm-create-prd/steps-c/step-02-discovery.md src/gomad-skills/2-plan-workflows/gm-create-prd/steps-c/step-05-domain.md src/gomad-skills/2-plan-workflows/gm-create-prd/steps-c/step-06-innovation.md src/gomad-skills/2-plan-workflows/gm-create-prd/steps-c/step-07-project-type.md src/gomad-skills/2-plan-workflows/gm-create-prd/steps-c/step-08-scoping.md src/gomad-skills/2-plan-workflows/gm-create-prd/steps-c/step-12-complete.md` | ✅ exists | ⬜ pending |
| 08-02-02 | 02 | 1 | PRD-02, PRD-03 | T-08-02-01 | step-08-scoping.md strips `investors/partners` probe and wires `Read ../data/prd-purpose.md` mindset reference | grep+lint | `! grep -qi 'investors/partners' src/gomad-skills/2-plan-workflows/gm-create-prd/steps-c/step-08-scoping.md && grep -q 'Coding-Agent Consumer Mindset' src/gomad-skills/2-plan-workflows/gm-create-prd/steps-c/step-08-scoping.md && grep -q 'push MVP scope UP, not down' src/gomad-skills/2-plan-workflows/gm-create-prd/steps-c/step-08-scoping.md` | ✅ exists | ⬜ pending |
| 08-02-03 | 02 | 1 | PRD-02 | T-08-02-01 | Residual banned-phrase sweep clean across step-01, 01b, 02, 05, 06, 07, 12; compliance refs (HIPAA/PCI-DSS/GDPR) + domain switch preserved in step-05 | grep+lint | `for f in step-01-init.md step-01b-continue.md step-02-discovery.md step-05-domain.md step-06-innovation.md step-07-project-type.md step-12-complete.md; do ! grep -niE '(why now\?\|\binvestor\b\|\bARR\b\|\bCAC\b\|\bLTV\b\|\bMRR\b\|stakeholder pitch\|elevator pitch\|business hours uptime)' src/gomad-skills/2-plan-workflows/gm-create-prd/steps-c/$f \|\| exit 1; done && grep -q 'HIPAA\|PCI-DSS\|GDPR' src/gomad-skills/2-plan-workflows/gm-create-prd/steps-c/step-05-domain.md` | ✅ exists | ⬜ pending |
| 08-03-01 | 03 | 1 | PRD-02, PRD-06 | T-08-03-01 | step-04-journeys.md §2 rewritten to action-oriented (name+role+goal; `Actor performs X...`); §3–§7 numbering stable; Minimum Coverage list preserved | grep+lint | `grep -q '### 2\. Create Action-Oriented Journeys' src/gomad-skills/2-plan-workflows/gm-create-prd/steps-c/step-04-journeys.md && ! grep -qE '(Opening Scene\|Rising Action\|Climax\|Resolution)' src/gomad-skills/2-plan-workflows/gm-create-prd/steps-c/step-04-journeys.md && grep -q 'Actor performs' src/gomad-skills/2-plan-workflows/gm-create-prd/steps-c/step-04-journeys.md && test $(grep -c '^### [0-9]' src/gomad-skills/2-plan-workflows/gm-create-prd/steps-c/step-04-journeys.md) -eq 7` | ✅ exists | ⬜ pending |
| 08-03-02 | 03 | 1 | PRD-04, PRD-06 | T-08-03-01 | step-09-functional.md emits FR-NN with inline 2–4 Given/When/Then AC sub-bullets; Content Structure includes `## Out of Scope` with OOS-NN entries; Quality Check gains AC + OOS validations | grep+lint | `grep -q 'FR-NN\|FR-01' src/gomad-skills/2-plan-workflows/gm-create-prd/steps-c/step-09-functional.md && grep -q 'AC: Given' src/gomad-skills/2-plan-workflows/gm-create-prd/steps-c/step-09-functional.md && grep -q '## Out of Scope' src/gomad-skills/2-plan-workflows/gm-create-prd/steps-c/step-09-functional.md && grep -q '\*\*OOS-01\*\*' src/gomad-skills/2-plan-workflows/gm-create-prd/steps-c/step-09-functional.md && ! grep -qE '^- FR#:' src/gomad-skills/2-plan-workflows/gm-create-prd/steps-c/step-09-functional.md` | ✅ exists | ⬜ pending |
| 08-03-03 | 03 | 1 | PRD-02, PRD-03, PRD-04 | T-08-03-01 | step-11-polish.md gains §2c `Coding-Agent Readiness Review` between §2b and §3 with full D-61 banned-phrase list and facilitator-gate semantics; prd-template.md gains `## Out of Scope` H2 header placeholder (D-58 — header-only, no example rows) | grep+lint | `grep -q '### 2c\. Coding-Agent Readiness Review' src/gomad-skills/2-plan-workflows/gm-create-prd/steps-c/step-11-polish.md && grep -q 'Wait for user approval' src/gomad-skills/2-plan-workflows/gm-create-prd/steps-c/step-11-polish.md && grep -n '^## Out of Scope$' src/gomad-skills/2-plan-workflows/gm-create-prd/templates/prd-template.md && ! grep -qE '^- \*\*(FR\|NFR\|OOS)-' src/gomad-skills/2-plan-workflows/gm-create-prd/templates/prd-template.md && test $(wc -l < src/gomad-skills/2-plan-workflows/gm-create-prd/templates/prd-template.md) -le 14` | ✅ exists | ⬜ pending |
| 08-04-01 | 04 | 1 | PRD-05, PRD-06 | T-08-04-01 | SKILL.md L12 reworded (`Work together as peers on the spec`); brief-template.md L5 extended with coding-agent consumer reference; all Scope discipline + guardrail prose preserved verbatim | grep+lint | `grep -q 'product owner, driving a product built by coding agents' src/gomad-skills/1-analysis/gm-product-brief/SKILL.md && ! grep -q 'Work together as equals' src/gomad-skills/1-analysis/gm-product-brief/SKILL.md && grep -q 'ARR, CAC, LTV' src/gomad-skills/1-analysis/gm-product-brief/SKILL.md && grep -q 'The downstream consumer is a coding agent' src/gomad-skills/1-analysis/gm-product-brief/resources/brief-template.md` | ✅ exists | ⬜ pending |
| 08-04-02 | 04 | 1 | PRD-05, PRD-06 | T-08-04-07 | 4 prompts (contextual-discovery, draft-and-review, finalize, guided-elicitation) swept; every guardrail block (`Explicitly DO NOT probe for`, `Do NOT pad with commercial content`, `Commercial/market/investor content is explicitly out of scope`, `not a commercial/business deep-dive`) preserved verbatim | grep+lint | `grep -q 'Explicitly DO NOT probe for' src/gomad-skills/1-analysis/gm-product-brief/prompts/guided-elicitation.md && grep -q 'CAC, LTV, ARR' src/gomad-skills/1-analysis/gm-product-brief/prompts/guided-elicitation.md && grep -q 'Commercial/market/investor content is explicitly out of scope' src/gomad-skills/1-analysis/gm-product-brief/prompts/contextual-discovery.md && grep -q 'Do NOT pad with commercial content' src/gomad-skills/1-analysis/gm-product-brief/prompts/draft-and-review.md` | ✅ exists | ⬜ pending |
| 08-04-03 | 04 | 1 | PRD-05 | T-08-04-01 | `agents/` dir and `manifest.json` untouched (D-60 scope-skip); no new files; subagent fan-out patterns + headless-mode JSON output preserved | guard | `git diff --name-only HEAD \| grep 'gm-product-brief/agents/'; test $? -ne 0 && git diff --name-only HEAD \| grep 'gm-product-brief/manifest\.json'; test $? -ne 0 && grep -q 'Skeptic Reviewer' src/gomad-skills/1-analysis/gm-product-brief/prompts/draft-and-review.md && grep -q '"status": "complete"' src/gomad-skills/1-analysis/gm-product-brief/prompts/finalize.md` | ✅ exists | ⬜ pending |
| 08-05-01 | 05 | 2 | PRD-06, PRD-07 | T-08-05-01 | Canonical fixture `test/integration/prd-chain/fixture-refined-prd.md` authored (CLI dev-tool domain; ≥15 FR-NN with 2–4 Given/When/Then AC each; ≥3 OOS-NN entries; ≥5 NFR-NN entries; ≤300 lines; 7 required H2 sections in canonical order; zero banned phrases) | structural | `test -f test/integration/prd-chain/fixture-refined-prd.md && test $(wc -l < test/integration/prd-chain/fixture-refined-prd.md) -lt 310 && test $(grep -c '^- FR-' test/integration/prd-chain/fixture-refined-prd.md) -ge 15 && test $(grep -c '^    - AC: Given' test/integration/prd-chain/fixture-refined-prd.md) -ge 30 && test $(grep -c '^- \*\*OOS-' test/integration/prd-chain/fixture-refined-prd.md) -ge 3 && test $(grep -c '^- NFR-' test/integration/prd-chain/fixture-refined-prd.md) -ge 5 && for s in '## Executive Summary' '## Success Criteria' '## Product Scope' '## User Journeys' '## Functional Requirements' '## Out of Scope' '## Non-Functional Requirements'; do grep -qF "$s" test/integration/prd-chain/fixture-refined-prd.md \|\| exit 1; done` | ❌ W0 (created by 08-05-01) | ⬜ pending |
| 08-05-02 | 05 | 2 | PRD-06, PRD-07 | T-08-05-02 | `test/integration/prd-chain/test-prd-chain.js` authored (CommonJS; 9 phases: structural, FR-NN format, AC density + Gherkin form, OOS block, validator-sim, epics-sim, architect-sim, readiness-sim, negative-fixture self-test); exits 0 against fixture in <30s; zero new deps | integration | `test -f test/integration/prd-chain/test-prd-chain.js && node test/integration/prd-chain/test-prd-chain.js && grep -q "require('node:path')" test/integration/prd-chain/test-prd-chain.js && ! grep -qE "require\(['\"](vitest\|jest\|chai\|gray-matter)['\"]\)" test/integration/prd-chain/test-prd-chain.js && grep -q 'Negative-fixture' test/integration/prd-chain/test-prd-chain.js && for p in 'Phase 1' 'Phase 2' 'Phase 3' 'Phase 4' 'Phase 5' 'Phase 6' 'Phase 7' 'Phase 8' 'Phase 9'; do grep -q "$p" test/integration/prd-chain/test-prd-chain.js \|\| exit 1; done` | ❌ W0 (created by 08-05-02) | ⬜ pending |
| 08-05-03 | 05 | 2 | PRD-07 | T-08-05-02 | `package.json` gains `test:integration` script AND `quality` aggregate wires it between `test:install` and `validate:refs` (Pitfall 7 mitigation — prevents regression slip through CI); no other scripts modified; no new runtime deps | script-introspection | `node -e "const s=require('./package.json').scripts; if(!s['test:integration']) process.exit(1); if(!s.quality.includes('test:integration')) process.exit(1); if(!s.quality.includes('npm run test:install && npm run test:integration')) process.exit(1); if(!s.quality.includes('npm run test:integration && npm run validate:refs')) process.exit(1);" && npm run test:integration && npm run format:check` | ✅ exists | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

**Total: 13 tasks (2+3+3+3+3). Waves: 08-01..08-04 = Wave 1 (no `files_modified` overlap → parallel-ready); 08-05 = Wave 2 (depends on all four).**

---

## Wave 0 Requirements

Wave 0 normally bootstraps test infrastructure **before** any feature task runs. Phase 8 is unusual because the integration harness IS the test infrastructure — it is authored by Plan 08-05 in Wave 2, not provisioned ahead of Wave 1.

**Wave 0 bootstrap items (none required ahead of Wave 1):**

- [x] Every existing `<automated>` command in Wave 1 plans uses either (a) `grep`/`test` against files that already exist in the repo (edits modify them in place), or (b) `npm run lint:md` / `npm run validate:skills` which are existing npm scripts and do not require new infrastructure
- [x] No new markdown linter / fixture generator / harness is required for Wave 1's 11 tasks (08-01..08-04) — they operate on files already in the working tree
- [x] No new runtime dependencies added at any wave (STATE.md zero-new-runtime-deps constraint)

**Wave 2 bootstrap items (authored by Plan 08-05 itself — not Wave 0):**

- Task 08-05-01 CREATES `test/integration/prd-chain/fixture-refined-prd.md` (the canonical fixture)
- Task 08-05-02 CREATES `test/integration/prd-chain/test-prd-chain.js` (the integration harness)
- Task 08-05-03 EDITS `package.json` to add `test:integration` script and wire it into `quality`

These are NOT Wave 0 prerequisites because Plan 08-05 depends on Plans 08-01..08-04 completing — the fixture must embody the refined output shape those plans produce. Wave 0 pre-staging of the fixture would force us to write a fixture matching an unfinalized output shape, re-invert when Wave 1 drifts, and lose the single-source guarantee.

**Feedback-latency coverage for Wave 1:** every Wave 1 task's `<automated>` is grep+lint, all of which complete in <5s per file. No 3-consecutive-task gap in automated verification — the Nyquist sampling condition holds at the per-task granularity.

**Feedback-latency coverage for Wave 2:** the integration test completes in <30s; `npm run quality` end-to-end (including test:integration, test:install tarball run, lint, format:check, docs:build, validators) is ~2 minutes — above the 45s per-task budget but runs only at plan-wave and phase-gate sampling, not per-task.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Vision section tone (1–2 declarative sentences, no elevator-pitch hedging) | PRD-03 | Tone is qualitative; no deterministic grep captures "hedging" | Reviewer reads refined `gm-create-prd/steps-c/step-02b-vision.md` §3 + `data/prd-purpose.md` §Coding-Agent Consumer Mindset; confirms prose reads as coding-agent-consumer-oriented (not human-founder pitch) |
| Coding-Agent Consumer Mindset framing registers as aspirational, not prescriptive | PRD-03 | Editorial voice check rather than string presence | Reviewer reads the new Mindset section end-to-end; confirms short paragraphs, no hedging, no "in order to" filler, tone matches PROJECT.md directness |
| `step-11-polish.md` §2c banned-phrase checklist reads as facilitator-gated (not silently applied) | PRD-02, PRD-03 | Semantic check on whether §2c clearly instructs the facilitator to wait for user approval | Reviewer reads §2c end-to-end; confirms it has three-step flag-then-propose-then-wait structure mirroring §2b |
| Fixture PRD (08-05-01) reads as a realistic refined PRD output, not a contrived test | PRD-04, PRD-07 | Realism check — fixture should be representative of actual gm-create-prd output so test drift matches real drift | Reviewer reads `test/integration/prd-chain/fixture-refined-prd.md` end-to-end; confirms CLI dev-tool domain is plausible, FR/AC prose is code-behavior-observable, no filler content |

---

## Validation Sign-Off

- [ ] All 13 tasks have an `<automated>` verify command (Nyquist enforced at task granularity — no 3-consecutive-task gaps)
- [ ] All filename references use `test-prd-chain.js` (not `run.js`)
- [ ] Wave assignments match PLAN frontmatter: 08-01..08-04 = Wave 1; 08-05 = Wave 2
- [ ] Wave 0 section accurately reflects that integration harness is CREATED by Plan 08-05 in Wave 2 (not a Wave 0 bootstrap artifact)
- [ ] Sampling continuity confirmed: lint+grep feedback <5s per task; phase-gate `npm run quality` <3min total
- [ ] No watch-mode flags in any automated command (CI-safe)
- [ ] D-58 compliance confirmed: Plan 08-03 Task 3 adds `## Out of Scope` H2 placeholder to `prd-template.md` (validated by 08-03-03 row's grep assertion)
- [ ] `nyquist_compliant: true` set in frontmatter after planner sign-off against this revised map

**Approval:** pending planner sign-off against 5-plan decomposition.
