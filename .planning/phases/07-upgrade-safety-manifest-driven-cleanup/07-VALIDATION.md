---
phase: 7
slug: upgrade-safety-manifest-driven-cleanup
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-20
---

# Phase 7 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | node:test (project convention — TBD per planner; RESEARCH.md recommends extending existing `test/test-gm-command-surface.js` harness) |
| **Config file** | none — plain `node test/<file>.js` invocations |
| **Quick run command** | `node --test test/test-manifest-cleanup.js` (TBD by planner) |
| **Full suite command** | `npm test` (covers existing + new Phase 7 fixtures) |
| **Estimated runtime** | ~TBD seconds (to be filled by planner based on fixture count) |

---

## Sampling Rate

- **After every task commit:** Run quick command for the relevant test file
- **After every plan wave:** Run full suite command
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** TBD (planner to set based on harness speed)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 7-XX-XX | TBD | TBD | INSTALL-05/06/07/08/09 | TBD | TBD | TBD | TBD | TBD | ⬜ pending |

*Populated by planner during /gsd-plan-phase. Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Planner to finalize from RESEARCH.md §Validation Architecture (27 named test axes). Seed list:

- [ ] `test/test-manifest-cleanup.js` — new Phase 7 test file extending `test-gm-command-surface.js` harness pattern
- [ ] `test/fixtures/phase-07/manifest-corrupt-bom.csv` — BOM at head
- [ ] `test/fixtures/phase-07/manifest-corrupt-crlf.csv` — CRLF line endings
- [ ] `test/fixtures/phase-07/manifest-malformed-header.csv` — wrong column order
- [ ] `test/fixtures/phase-07/manifest-missing-column.csv` — row with missing required column (CORRUPT_ROW per D-33)
- [ ] `test/fixtures/phase-07/manifest-quoted-field-edge.csv` — embedded `"`, `,`, `\n` in value
- [ ] `test/fixtures/phase-07/manifest-duplicate-path.csv` — two rows same path
- [ ] `test/fixtures/phase-07/manifest-absolute-path.csv` — containment fail (D-32)
- [ ] `test/fixtures/phase-07/manifest-traversal.csv` — `../../../etc/passwd` containment fail
- [ ] `test/fixtures/phase-07/manifest-symlink-escape.csv` — manifest points at a symlink to outside (D-35)
- [ ] `test/fixtures/phase-07/legacy-v1.1-workspace/` — synthetic v1.1 tree with 7 `gm-agent-*` dirs, some containing custom user files (D-42/D-43)
- [ ] `test/fixtures/phase-07/new-install-set.csv` — the "after" manifest used to compute diff

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Backup recovery via `cp -R _gomad/_backups/<ts>/* ./` | INSTALL-09 | File-tree restore is OS-level; test in `node:test` as shell-out | Documented in `docs/upgrade-recovery.md` + `_gomad/_backups/<ts>/README.md`; manual smoke after automated snapshot test passes |
| Windows NTFS junction behavior | INSTALL-06 | No Windows CI host in this phase; deferred to Phase 9 REL-04 release-verification matrix | Phase 9 CI matrix runs installer against Windows workspace with NTFS junction |
| Long-path edge cases on Windows (MAX_PATH 260) | INSTALL-09 | Windows-specific; deep backup nesting `_gomad/_backups/<ts>/.claude/skills/gm-agent-pm/custom.md` risks hitting limit | Phase 9 CI matrix |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (manifest fixtures + legacy workspace fixture)
- [ ] No watch-mode flags
- [ ] Feedback latency < TBD seconds
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

---

## Validation Architecture Summary (from RESEARCH.md)

27 test axes grouped:

1. **Manifest corruption (6):** BOM, CRLF, malformed header, missing column, quoted-field edge, row arity, duplicate path
2. **Containment escapes (4):** absolute path, `../` traversal, symlink to sibling workspace, symlink to parent
3. **Legacy v1.1 (4):** bare 7 dirs present, one dir with user custom file, one symlinked dir, no-manifest detection signal
4. **Idempotency (3):** install twice → no-op; install then remove file manually → `already_removed` log (not MANIFEST_CORRUPT); install → dry-run → identical actions
5. **Dry-run (3):** plan rendering, `buildCleanupPlan()` pure (no disk writes), exit code 0 on clean plan
6. **Backup snapshot (4):** metadata.json mandatory schema, `was_modified` marker on hash-mismatch, recovery via `cp -R` round-trip, backups-excluded from new manifest (D-39)
7. **Windows-specific (3):** NTFS junction (Phase 9 deferred), long-path (Phase 9 deferred), path-separator normalization (Phase 6 D-26 regression guard)

**Binding references:** RESEARCH.md §Validation Architecture owns the canonical list with per-axis acceptance criteria. Planner populates the Per-Task Verification Map above by mapping each axis to one or more tasks.
