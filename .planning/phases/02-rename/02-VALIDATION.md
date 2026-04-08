---
phase: 2
slug: rename
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-08
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | jest 30.x + custom node scripts |
| **Config file** | `jest.config.js` / `package.json` scripts |
| **Quick run command** | `npm run validate:skills && npm run validate:refs` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~45 seconds |

---

## Sampling Rate

- **After every task commit:** Run quick command (validate:skills + validate:refs)
- **After every plan wave:** Run full suite (`npm test`)
- **Before `/gsd-verify-work`:** Full suite must be green + zero-hit grep gate
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

To be filled by the planner — every task must either have an `<automated>` verify block
or a Wave 0 dependency. See 02-RESEARCH.md §Validation Architecture for the
requirement-to-test mapping.

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements:
- `npm run validate:skills` — validates skill manifests after rename
- `npm run validate:refs` — validates cross-file references
- `test/test-file-refs-csv.js` — validates renamed CSV fixtures
- CLI `--help` smoke test — validates `gomad-cli.js` entry point

No new test framework install required.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| LICENSE/CHANGELOG/TRADEMARK retain `BMAD` nominative references | TXT-04 | Exception allowlist cannot be automated without listing every allowed file | Run `git grep -n "BMAD\|bmad" -- . ':!LICENSE' ':!CHANGELOG*' ':!TRADEMARK*'` and verify zero hits |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
