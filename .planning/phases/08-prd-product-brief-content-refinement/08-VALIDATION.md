---
phase: 8
slug: prd-product-brief-content-refinement
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-22
---

# Phase 8 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node CommonJS + node:assert (mirrors `test/test-gm-command-surface.js`) |
| **Config file** | `package.json` scripts block (add `test:integration` script) |
| **Quick run command** | `npm test -- --filter prd-chain` or direct `node test/integration/prd-chain/run.js --fast` |
| **Full suite command** | `npm run quality` (wraps lint + tests + markdownlint + prettier) |
| **Estimated runtime** | ~30 seconds (fixture-driven, no LLM calls) |

---

## Sampling Rate

- **After every task commit:** Run `npm run lint` and targeted node check on modified markdown
- **After every plan wave:** Run `npm run quality`
- **Before `/gsd-verify-work`:** `npm run quality` must be green; integration chain test must exit 0
- **Max feedback latency:** 45 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 08-01-01 | 01 | 1 | PRD-01, PRD-02 | — | Founder-framing removed from steps-c/02b, 02c, 03, 10 | lint+grep | `npm run markdownlint && grep -nEi 'why now|investor|ARR|CAC|LTV|DAU|retention' gm-create-prd/steps-c/{02b,02c,03,10}*.md; test $? -ne 0` | ⬜ W0 | ⬜ pending |
| 08-01-02 | 01 | 1 | PRD-02 | — | Residual founder framing removed from 01, 01b, 04, 05, 06, 07, 08, 09, 11, 12 (change log in PLAN) | grep | `grep -nEi 'time-window|go-to-market|demographic|investors|partners' gm-create-prd/steps-c/{01,01b,04,05,06,07,08,09,11,12}*.md; test $? -ne 0` | ⬜ W0 | ⬜ pending |
| 08-02-01 | 02 | 1 | PRD-03, PRD-04 | — | Vision/MVP scope amplified + REQ-ID/OOS sharpened | grep | `grep -n 'FR-01:' gm-create-prd/templates/prd-template.md && grep -n '## Out of Scope' gm-create-prd/templates/prd-template.md` | ⬜ W0 | ⬜ pending |
| 08-03-01 | 03 | 2 | PRD-05 | — | gm-product-brief voice aligned; founder framing stripped | grep | `grep -nEi 'CAC|LTV|investor|GTM' gm-product-brief/**/*.md; test $? -ne 0` | ⬜ W0 | ⬜ pending |
| 08-04-01 | 04 | 3 | PRD-06, PRD-07 | — | Integration test chains gm-create-prd → gm-validate-prd → gm-create-architecture → gm-create-epics-and-stories; gm-check-implementation-readiness reports alignment | integration | `node test/integration/prd-chain/run.js` | ❌ W0 | ⬜ pending |
| 08-04-02 | 04 | 3 | PRD-07 | — | Structural compatibility preserved (no changes to 4 downstream skills) | guard | `git diff --name-only HEAD~{N} | grep -E '^(gm-validate-prd|gm-create-architecture|gm-create-epics-and-stories|gm-check-implementation-readiness)/'; test $? -ne 0` | ⬜ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `test/integration/prd-chain/run.js` — new integration test harness (CommonJS, node:assert)
- [ ] `test/integration/prd-chain/fixtures/` — sample PRD input fixture (research §Architecture)
- [ ] `package.json` — add `test:integration` script; wire into `quality`
- [ ] No new runtime dependencies (STATE.md constraint)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Vision section tone ("aggressive vision, 1–2 declarative sentences, no elevator-pitch hedging") | PRD-03 | Tone is qualitative; no deterministic grep captures "hedging" | Reviewer reads refined `gm-create-prd/steps-c/03*.md` + `templates/prd-template.md` §Vision; confirms output example is 1–2 declarative sentences |
| Coding-Agent Consumer Mindset framing | PRD-03 | Checks editorial voice rather than string presence | Reviewer reads refined intro sections; confirms framing speaks to AI coding agents as consumers (not human founders) |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (integration harness is the one MISSING piece)
- [ ] No watch-mode flags in automated commands
- [ ] Feedback latency < 45s (integration test budget ~30s)
- [ ] `nyquist_compliant: true` set in frontmatter after planner backfills task IDs

**Approval:** pending
