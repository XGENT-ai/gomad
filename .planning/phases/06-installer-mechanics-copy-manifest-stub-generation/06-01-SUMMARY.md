---
phase: 06-installer-mechanics-copy-manifest-stub-generation
plan: 01
subsystem: infra
tags: [installer, fs-extra, copy, symlink, files-manifest, csv-parse, claude-code, multi-ide]

# Dependency graph
requires:
  - phase: 05-foundations-command-surface-validation
    provides: install-smoke harness (test/test-gm-command-surface.js Phase C) used as integration check for the copy-only switch
provides:
  - "Copy-only IDE skill install loop (fs.copy replaces fs.ensureSymlink in tools/installer/ide/_config-driven.js:installVerbatimSkills)"
  - "Re-install symlink-leftover handler (fs.lstat + fs.unlink + prompts.log.info gated on _gomad/_config/files-manifest.csv presence)"
  - "Pitfall #3 closure (symlink leftovers + source-tree pollution on v1.1→v1.2 upgrade)"
affects: [06-02, 06-03, 07, 08]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Re-install gating via existence of v1.1 _gomad/_config/files-manifest.csv (D-22)"
    - "fs-extra.copy as universal install primitive (no per-IDE branching) (D-19)"
    - "Symlink-detect → unlink → copy idiom (info-level log on transition) (D-20)"

key-files:
  created: []
  modified:
    - "tools/installer/ide/_config-driven.js"

key-decisions:
  - "D-19 applied: fs.copy used universally for every IDE — no per-IDE gate"
  - "D-20 applied: log line wording exactly 'upgrading from symlink: ${skillDir}' via prompts.log.info (info, not warn — normal upgrade transition)"
  - "D-22 applied: symlink pre-check gated on _gomad/_config/files-manifest.csv presence — fresh installs skip lstat entirely"
  - "Existing await fs.remove(skillDir) preserved per D-21 (covers regular-file overwrite case); symlink branch is additive and runs BEFORE fs.remove"

patterns-established:
  - "Pre-loop boolean gate (isReinstall) hoisted out of the per-record loop body — single fs.pathExists call per install, not per record"
  - "Inline 'upgrade transition' log via prompts.log.info — info level (not warn) signals a normal v1.1→v1.2 path, not a problem"

requirements-completed:
  - INSTALL-01
  - INSTALL-02

# Metrics
duration: 28min
completed: 2026-04-18
---

# Phase 6 Plan 01: Copy-Only Switch + Symlink-Leftover Unlink Summary

**Replaced `fs.ensureSymlink` with `fs.copy` universally in the IDE skill install loop and added a re-install-gated `fs.lstat` pre-check that unlinks pre-existing v1.1 symlinks before copying — installed skill targets are now real files (not symlinks) and v1.1→v1.2 upgrades transition cleanly with a single info-level log line.**

## Performance

- **Duration:** ~28 min
- **Started:** 2026-04-18T13:07:00Z (approx, plan-load time)
- **Completed:** 2026-04-18T13:34:46Z
- **Tasks:** 1 / 1
- **Files modified:** 1

## Accomplishments

- **Universal copy switch (D-19):** `fs.ensureSymlink(relTarget, skillDir)` at `_config-driven.js:171` is gone. Every IDE skill install path (`claude-code`, `cursor`, `codex`, `auggie`, …) now writes real files via `await fs.copy(sourceDir, skillDir)`. Single code path; no per-IDE branching.
- **Gated re-install handler (D-20, D-22):** A pre-loop `isReinstall = await fs.pathExists(filesManifestPath)` boolean keys the entire `fs.lstat` block. On fresh installs the boolean is `false` and the per-record loop never calls `lstat` (perf win). On re-install (v1.1 manifest present), each destination is `lstat`'d; if it's a symbolic link, the installer logs `upgrading from symlink: <path>` via `prompts.log.info` and `fs.unlink`s the link before the `await fs.remove(skillDir)` + `await fs.copy(sourceDir, skillDir)` write.
- **Pitfall #3 closure:** v1.1 workspaces with relative symlinks at `.claude/skills/<canonicalId>` → `../../_gomad/<module>/<path>` no longer cause `fs.copy` to follow the link back into the source tree. Source-tree pollution path is closed.
- **Phase 5 install-smoke still green:** `npm run test:gm-surface` exits 0 with all 7 assertions passing. The `gomad install --yes --directory <tempDir> --tools claude-code` step succeeds against the new copy path.
- **No new runtime deps:** All new code uses `fs-extra` methods (`fs.copy`, `fs.lstat`, `fs.unlink`, `fs.pathExists`, `fs.remove`) and `prompts.log.info` already imported in the file. Zero changes to `package.json`.

## Task Commits

Each task was committed atomically:

1. **Task 1: Replace fs.ensureSymlink with fs.copy + add gated symlink-leftover unlink pre-check** — `57c4858` (feat)

_Note: This plan's TDD cycle was inline grep-based verification (not a separate test-file commit). The behavior contract in `<behavior>` is enforced by the `<verify><automated>` node one-liner and the eight `<acceptance_criteria>` grep checks (all pass — see below). No separate `test(...)` commit was needed because no new test file is part of this plan; the integration test (`npm run test:gm-surface`) is pre-existing from Phase 5._

**Plan metadata:** SUMMARY.md committed by the orchestrator after this agent returns (worktree mode).

## Files Created/Modified

- `tools/installer/ide/_config-driven.js` — `installVerbatimSkills` method body: removed `fs.ensureSymlink` call + the obsolete relTarget computation, added `isReinstall` gate + `fs.lstat`/`fs.unlink` symlink branch, replaced with `await fs.copy(sourceDir, skillDir)`. Net change: `+18 / −4`.

## Acceptance Criteria — Verification Output

All eight `<acceptance_criteria>` checks from the plan pass:

```
$ grep -c 'fs\.ensureSymlink' tools/installer/ide/_config-driven.js
0
$ grep -c 'await fs\.copy(' tools/installer/ide/_config-driven.js
1
$ grep -c 'upgrading from symlink:' tools/installer/ide/_config-driven.js
1
$ grep -c 'await fs\.lstat(' tools/installer/ide/_config-driven.js
1
$ grep -c 'isReinstall' tools/installer/ide/_config-driven.js
2
$ grep -nE 'files-manifest\.csv' tools/installer/ide/_config-driven.js
151:    const filesManifestPath = path.join(gomadDir, '_config', 'files-manifest.csv');
$ node -c tools/installer/ide/_config-driven.js
(exits 0 — syntactically valid)
$ node -e "require('./tools/installer/ide/_config-driven.js')"
(exits 0 — module loads without error)
```

The plan's bundled `<verify><automated>` one-liner also returns `OK` with exit code 0:

```
$ node -e "const s=require('fs').readFileSync('tools/installer/ide/_config-driven.js','utf8'); if(s.includes('fs.ensureSymlink'))process.exit(1); if(!s.includes('await fs.copy('))process.exit(2); if(!s.includes('upgrading from symlink:'))process.exit(3); if(!s.match(/isReinstall\s*=\s*await fs\.pathExists/))process.exit(4); console.log('OK');"
OK
```

No new `require(...)` lines were added at the top of the file (existing `fs-extra` import covers everything).

## Reference-Check Findings (Plan Step E)

`grep -rn 'fs\.ensureSymlink' tools/installer/` returns **zero matches** after this commit. The `_config-driven.js:171` call was the only `fs.ensureSymlink` invocation in `tools/installer/`. No other files in `tools/installer/` need this treatment.

A wider repo scan (excluding `node_modules/`) shows the only remaining `fs.ensureSymlink` references are in **planning docs** (`.planning/...`) and **research docs** (`.planning/research/...`) — these are descriptive references to the historical pattern, not live code. They are intentionally preserved as historical record (no edits needed for this plan or a future plan).

## Symlink Pre-Check Behavior on the Test Install

The Phase 5 install-smoke test (`npm run test:gm-surface`) ran the new copy path against a clean tempDir (no pre-existing `_gomad/_config/files-manifest.csv`). Per **D-22**, the `isReinstall` boolean evaluated `false` and the entire `fs.lstat` block was skipped — exactly the gated-on-re-install behavior the plan specifies. **No `upgrading from symlink:` log line was emitted during the smoke test**, which is the correct outcome for a fresh install.

The re-install branch (where a symlink IS present and the log line WOULD fire) is exercised by manual upgrade testing of an existing v1.1 workspace. The code path is small and deterministic:

```javascript
if (isReinstall && (await fs.pathExists(skillDir))) {
  const destStat = await fs.lstat(skillDir);
  if (destStat.isSymbolicLink()) {
    await prompts.log.info(`upgrading from symlink: ${skillDir}`);
    await fs.unlink(skillDir);
  }
}
```

A regression test that constructs a tempDir with a pre-existing `_gomad/_config/files-manifest.csv` AND a pre-existing symlink at a destination path is a candidate for Phase 7's broader manifest-driven cleanup test surface (out of scope for this plan).

## Decisions Made

None beyond strict literal application of the plan's `<action>` Steps A–E. Every decision was already locked in `06-CONTEXT.md` §decisions (D-19, D-20, D-21, D-22) — this plan is the implementation, not a re-decision surface.

## Deviations from Plan

None — plan executed exactly as written. The plan's `<action>` block was specified with exact source-line context and target wording; the edit was a literal application.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Threat Flags

None — every threat surface introduced by this plan was enumerated in the plan's `<threat_model>` (T-06-01 through T-06-04). No new network endpoints, auth paths, or trust-boundary changes were introduced.

## Next Plan Readiness

- **Plan 06-02 (manifest v2 schema, Wave 1 sibling):** Independent — touches `installer.js` + `manifest-generator.js`, zero `_config-driven.js` overlap. No blocker from this plan.
- **Plan 06-03 (launcher generator, Wave 2):** Unblocked by this plan. With copy-only in place, the launcher generator's writes to `.claude/commands/gm/agent-*.md` will land on real-file destinations, never on symlinks pointing back into `gomad-skills/`. The symlink-leftover unlink pre-check additionally protects future launcher-file paths if a v1.1 install accidentally created any symlinks under `.claude/`.
- **Phase 7 (manifest-driven cleanup, INSTALL-05/06/08/09):** Layers `.bak` snapshot + dry-run safety on top of this plan's "always overwrite regular files" interim posture (D-21). No structural blocker.

## Self-Check: PASSED

Verified before finalizing this SUMMARY:

- `tools/installer/ide/_config-driven.js` exists (FOUND).
- Commit `57c4858` exists in `git log --oneline --all` (FOUND): `feat(06-01): replace fs.ensureSymlink with fs.copy + add gated symlink-leftover unlink (D-19/D-20/D-22)`.
- All eight acceptance-criteria grep checks pass (zero `fs.ensureSymlink`, ≥1 `await fs.copy(`, exactly 1 `upgrading from symlink:`, ≥1 `await fs.lstat(`, ≥2 `isReinstall`, ≥1 `files-manifest.csv` ref).
- `node -c` and `require()` both exit 0.
- `npm run test:gm-surface` exits 0 (Phase 5 install-smoke remains green).

---
*Phase: 06-installer-mechanics-copy-manifest-stub-generation*
*Completed: 2026-04-18*
