---
phase: 11
slug: docs-site-content-authoring
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-26
---

# Phase 11 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | node:test (built-in) for the new auto-gen injector; existing `tools/validate-skills.js` shape as reference |
| **Config file** | none — `npm run` scripts in `package.json`; new test file lands at `tools/__tests__/inject-reference-tables.test.js` (or sibling) |
| **Quick run command** | `node tools/inject-reference-tables.cjs --check` (idempotent dry-run) |
| **Full suite command** | `npm run docs:build` (link-check → inject → llms.txt → Astro build) |
| **Estimated runtime** | ~30 seconds (Astro build dominates) |

---

## Sampling Rate

- **After every task commit:** Run `node tools/inject-reference-tables.cjs --check` (when present) and `npm run docs:lint` (link-check only) — fast feedback on table content + markdown links.
- **After every plan wave:** Run `npm run docs:build` (full pipeline).
- **Before `/gsd-verify-work`:** Full `npm run docs:build` must be green AND `git diff --stat docs/` must show the expected file deltas (53 deletions + N creations).
- **Max feedback latency:** 30 seconds.

---

## Per-Task Verification Map

> Plans are not yet authored — this table is populated by the planner during step 8. Each plan task gets a row here keyed to the requirement (DOCS-01..06) and to the auto-gen / link-check / Astro-build verifier.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 11-01-01 | 01 | 1 | DOCS-01..06 (cleanup precondition) | — | N/A | filesystem | `[ ! -d docs/zh-cn/explanation/game-dev ] && find docs -name '*.md' -path '*BMAD*' \| wc -l \| grep -q '^0$'` | ❌ W0 | ⬜ pending |
| 11-02-01 | 02 | 1 | DOCS-02, DOCS-03 (auto-gen tooling) | — | N/A | unit | `node --test tools/__tests__/inject-reference-tables.test.js` | ❌ W0 | ⬜ pending |
| 11-02-02 | 02 | 1 | DOCS-02, DOCS-03 (auto-gen idempotency) | — | N/A | integration | `node tools/inject-reference-tables.cjs && git diff --exit-code docs/reference/agents.md docs/reference/skills.md` | ❌ W0 | ⬜ pending |
| 11-03-* | 03 | 2 | DOCS-02, DOCS-03 (reference pages) | — | N/A | integration | `npm run docs:build` (validates markers + link-check) | ❌ W0 | ⬜ pending |
| 11-04-* | 04 | 2 | DOCS-01 (tutorials) | — | N/A | integration | `npm run docs:build` | ❌ W0 | ⬜ pending |
| 11-05-* | 05 | 2 | DOCS-04 (architecture explainer) | — | N/A | integration | `npm run docs:build` | ❌ W0 | ⬜ pending |
| 11-06-* | 06 | 2 | DOCS-05 (contributing) | — | N/A | integration | `npm run docs:build` | ❌ W0 | ⬜ pending |
| 11-0X-* | * | 3 | DOCS-06 (zh-cn parity) | — | N/A | integration | `npm run docs:build && find docs/zh-cn -name '*.md' \| wc -l` (must be ≥ 6 new pages) | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

> Planner: replace `*` rows with concrete per-task rows during PLAN.md authoring. Each authoring task should add a per-page acceptance criterion (e.g., `grep -q '<!-- AUTO:agents-table-start -->' docs/reference/agents.md`).

---

## Wave 0 Requirements

- [ ] `tools/inject-reference-tables.cjs` — new build-time injector (CommonJS per project convention; reuse `parseFrontmatterMultiline` from `tools/validate-skills.js`)
- [ ] `tools/__tests__/inject-reference-tables.test.js` — unit tests asserting:
  - All 8 personas appear in the rendered agents table
  - The 4-phase column derives correctly from parent dir
  - Re-running the injector twice produces a no-op diff (idempotency)
  - Skills count matches the actual file count (resolves CONTEXT vs RESEARCH 27/28 discrepancy)
- [ ] `package.json` — add `docs:inject` script if needed; ensure `docs:build` chains the new step
- [ ] No new framework install required — `node:test` (built-in since Node 20) covers the unit test

*If existing infrastructure carries the load: link-check (`tools/validate-doc-links.js`) and Astro build (`npm run docs:build`) already cover prose pages. Only the auto-gen injector needs new tests.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Tutorials read coherently end-to-end | DOCS-01 | Prose readability is not automatable | Reviewer follows `/tutorials/install` then `/tutorials/quick-start` step-by-step on a clean machine and confirms the documented commands actually work |
| Architecture explainer matches mental model | DOCS-04 | Conceptual accuracy needs human reasoning | Reviewer (familiar with v1.3) reads `/explanation/architecture` and confirms 4-phase lifecycle + manifest-v2 + launcher-form descriptions are correct |
| Contributing guide is followable | DOCS-05 | E2E flow validation | Reviewer simulates fork → PR → test-expectations using only `/how-to/contributing` and reports any gaps |
| zh-cn translation accuracy | DOCS-06 | Bilingual review (user is bilingual per D-14) | Spot-check zh-cn pages against EN siblings; iterate-and-patch posture per D-14 — no gating step |
| Live deploy renders correctly | DOCS-01..06 | GitHub Pages render only happens after merge | Post-merge: open `https://gomad.xgent.ai/tutorials/install`, `/zh-cn/tutorials/install`, etc. and confirm sidebar + content load |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify (link-check + Astro build cover prose-only tasks)
- [ ] Wave 0 covers all MISSING references (`tools/inject-reference-tables.cjs` + its test)
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
