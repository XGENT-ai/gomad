---
phase: 4
slug: verification-release
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-09
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | jest 30.x |
| **Config file** | `jest.config.mjs` (or package.json jest field) |
| **Quick run command** | `npm test` |
| **Full suite command** | `npm run quality` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test`
- **After every plan wave:** Run `npm run quality`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 04-01-01 | 01 | 1 | VFY-01 | — | N/A | integration | `npm run quality` | ✅ | ⬜ pending |
| 04-01-02 | 01 | 1 | VFY-02 | — | N/A | integration | `npm pack --dry-run` | ✅ | ⬜ pending |
| 04-01-03 | 01 | 1 | VFY-03 | — | N/A | integration | `grep -ri bmad src/ tools/` | ✅ | ⬜ pending |
| 04-02-01 | 02 | 2 | REL-01 | — | N/A | manual | `npm publish` | ❌ W0 | ⬜ pending |
| 04-02-02 | 02 | 2 | REL-02 | — | N/A | manual | `npm deprecate` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Existing infrastructure covers all phase requirements — no new test framework needed
- [ ] `npm run quality` script exists and chains all quality checks

*Existing infrastructure covers all phase requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| npm publish succeeds | REL-01 | Requires npm auth + network | Run `npm publish --access public` after auth |
| npm deprecate v1.0.0 | REL-02 | Requires npm auth + network | Run `npm deprecate @xgent-ai/gomad@1.0.0 "..."` |
| Fresh install from tarball works | VFY-02 | Requires clean environment | `npm pack && cd /tmp && mkdir test && cd test && npm init -y && npm install /path/to/tarball` |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
