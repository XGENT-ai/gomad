---
phase: 1
slug: foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-08
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | jest 30.x |
| **Config file** | `jest.config.js` (if exists) or package.json jest config |
| **Quick run command** | `npx jest --passWithNoTests` |
| **Full suite command** | `npx jest --passWithNoTests --coverage` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx jest --passWithNoTests`
- **After every plan wave:** Run `npx jest --passWithNoTests --coverage`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 01-01-01 | 01 | 1 | PKG-01 | — | N/A | cli | `npm pkg get name \| grep gomad` | ✅ | ⬜ pending |
| 01-01-02 | 01 | 1 | PKG-02 | — | N/A | cli | `npm pkg get version \| grep 1.1.0` | ✅ | ⬜ pending |
| 01-01-03 | 01 | 1 | PKG-03 | — | N/A | cli | `node -e "console.log(require('./package.json').bin)"` | ✅ | ⬜ pending |
| 01-01-04 | 01 | 1 | PKG-04 | — | N/A | cli | `node -e "console.log(require('./package.json').scripts['gomad:install'])"` | ✅ | ⬜ pending |
| 01-01-05 | 01 | 1 | PKG-05 | — | N/A | cli | `npm pkg get publishConfig.access \| grep public` | ✅ | ⬜ pending |
| 01-02-01 | 02 | 1 | SLIM-01 | — | N/A | file | `test ! -f tools/installer/external-official-modules.yaml` | ✅ | ⬜ pending |
| 01-02-02 | 02 | 1 | SLIM-01 | — | N/A | file+grep | `! grep -r ExternalModuleManager tools/installer/` | ✅ | ⬜ pending |
| 01-02-03 | 02 | 1 | SLIM-02 | — | N/A | file+grep | `! grep -r bundler tools/installer/ && ! grep -r rebundle package.json` | ✅ | ⬜ pending |
| 01-03-01 | 03 | 1 | SLIM-03 | — | N/A | file | `test ! -f README_VN.md` | ✅ | ⬜ pending |
| 01-03-02 | 03 | 1 | SLIM-04 | — | N/A | file | `test ! -d docs/cs && test ! -d docs/fr && test ! -d docs/vi-vn` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements. Phase 1 is metadata/cleanup — no new test files needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| npm publish works | PKG-05 | Requires npm auth + registry | Dry-run: `npm publish --dry-run` |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
