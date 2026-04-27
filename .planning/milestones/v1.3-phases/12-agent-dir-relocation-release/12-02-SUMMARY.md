---
phase: 12-agent-dir-relocation-release
plan: 02
subsystem: installer
tags: [installer, cleanup-planner, upgrade-migration, banner, persona-relocation]

# Dependency graph
requires:
  - phase: 12-agent-dir-relocation-release
    plan: 01
    provides: "LEGACY_AGENTS_PERSONA_SUBPATH constant ('gomad/agents') exported from path-utils.js"
provides:
  - "isV12LegacyAgentsDir detector function (cleanup-planner.js) — manifest-AND-persona-files predicate distinguishing v1.2→v1.3 from v1.1→v1.3 upgrades"
  - "v12 branch in buildCleanupPlan that snapshots + removes the 8 legacy persona files at _gomad/gomad/agents/<shortName>.md regardless of newInstallSet membership (fixes AGENT-04 latent bug)"
  - "handledPaths Set in standard manifest-diff branch — prevents double-processing of v12-branch entries"
  - "Verbose 4-bullet v1.3 BREAKING migration banner (installer.js) printed when isV12Reloc && !config.dryRun via prompts.getColor() chalk-shaped helper"
affects:
  - 12-03 (detectCustomFiles whitelist will use AgentCommandGenerator.AGENT_SOURCES at lines 967-973 — orthogonal to plan 12-02 edits at lines 510-590)
  - 12-04 (docs/upgrade-recovery.md '§ v1.2 → v1.3 recovery' is referenced by the banner)
  - 12-05 (AGENT-08 test asserts top-level meta.reason === 'manifest_cleanup' in metadata.json — single specific path, no fallback)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pattern: parallel detector + branch in cleanup-planner mirroring isV11Legacy structure (RESEARCH Pattern 1)"
    - "Pattern: handledPaths Set fall-through guard between custom branch and standard manifest-diff branch (D-02)"
    - "Pattern: top-level plan.reason ('manifest_cleanup') is the single source of truth for metadata.json — per-entry reason fields are silently dropped by writeMetadata"
    - "Pattern: prompts.getColor() chalk-shaped helper API for installer banner output (D-09)"

key-files:
  created: []
  modified:
    - "tools/installer/core/cleanup-planner.js — +94/-1 LOC: import LEGACY_AGENTS_PERSONA_SUBPATH, isV12LegacyAgentsDir detector, v12 branch in buildCleanupPlan, handledPaths skip in standard branch, JSDoc for isV12LegacyAgentsDir input, module export entry"
    - "tools/installer/core/installer.js — +28/0 LOC: isV12LegacyAgentsDir detector call, isV12LegacyAgentsDir input on buildCleanupPlan, 18-line verbose v1.3 BREAKING banner block using prompts.getColor()"
    - ".planning/phases/12-agent-dir-relocation-release/deferred-items.md — +1 LOC: log pre-existing test-cleanup-planner.js 7-vs-8 agent count failures (predates plan 12-02)"

key-decisions:
  - "Top-level plan.reason ('manifest_cleanup') used for metadata.json — verified by reading writeMetadata at cleanup-planner.js:357 which emits `reason: plan.reason` from the plan-construction default; per-entry `reason` fields are NOT propagated (writeMetadata enumerates {install_root, relative_path, orig_hash, was_modified} and silently drops other fields). v12 branch's to_snapshot.push therefore omits per-entry reason. Plan 12-05 test asserts top-level meta.reason === 'manifest_cleanup' — single path, no fallback."
  - "v12 branch falls through to the standard manifest-diff branch via a handledPaths Set rather than returning early (unlike v11). This preserves the standard branch's stale-entry cleanup for non-persona paths in a v1.2 manifest."
  - "Banner uses prompts.getColor() exclusively (D-09) — no console.log fallback. The same API is used at installer.js:347, 1332, 1356-1383 (3 other established sites)."
  - "manifestGen NOT explicitly passed to buildCleanupPlan — the cleanup-planner default `new ManifestGenerator()` provides calculateFileHash, satisfying the v12 branch's was_modified compute path. Adding the explicit pass would be a no-op."

patterns-established:
  - "Pattern: cleanup-planner v12-style branch — extend buildCleanupPlan input destructure with new flag, add a custom branch BEFORE the standard branch with a handledPaths Set, skip handled paths in the standard branch loop (after realpath, before newInstallSet check). Future N-style upgrade migrations follow the same shape."
  - "Pattern: v1.x BREAKING banner block — `if (detector && !config.dryRun) { const color = await prompts.getColor(); await prompts.log.message(color.cyan(...)); ... }` — used between buildCleanupPlan and the dry-run/execute branch."

requirements-completed: [AGENT-04, AGENT-06]

# Metrics
duration: 5min
completed: 2026-04-27
---

# Phase 12 Plan 02: Cleanup-Planner v12 Branch + Migration Banner Summary

**v1.2→v1.3 upgrade migration path now wired: isV12LegacyAgentsDir detector + parallel v12 branch in buildCleanupPlan snapshot+remove the 8 legacy persona files via reused executeCleanupPlan + 4-bullet BREAKING migration banner prints via prompts.getColor() before plan execution.**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-04-27T01:59:29Z
- **Completed:** 2026-04-27T02:05:12Z
- **Tasks:** 2
- **Files modified:** 3 (cleanup-planner.js, installer.js, deferred-items.md)

## Accomplishments

- `isV12LegacyAgentsDir(workspaceRoot, gomadDir)` detector exported from cleanup-planner.js — returns true iff `_gomad/_config/files-manifest.csv` exists AND ≥1 of the 8 known persona files at `_gomad/gomad/agents/<shortName>.md` is present.
- New v12 branch in `buildCleanupPlan` queues all present legacy persona files into `plan.to_snapshot` and `plan.to_remove` regardless of `newInstallSet` membership (fixes AGENT-04 latent bug). Reuses `LEGACY_AGENT_SHORT_NAMES` (8 entries derived from `AgentCommandGenerator.AGENT_SOURCES`) — no duplicated lists.
- Realpath + `isContained` symlink-escape guard reused (SYMLINK_ESCAPE → `plan.refused`, non-fatal per D-35).
- D-34 was_modified detection: when `priorEntry.hash` is available, current file SHA-256 is computed via the default `ManifestGenerator` (or injected `manifestGen`) and the `was_modified` boolean is set.
- `to_snapshot.push` shape exactly matches `writeMetadata`'s enumerated field set (`{install_root, relative_path, orig_hash, was_modified}` plus `src` for executor) — no per-entry `reason` field added (would be silently dropped).
- `handledPaths` Set in standard manifest-diff branch skips paths already processed by the v12 branch — fall-through to handle non-persona stale entries normally.
- Top-level `plan.reason = 'manifest_cleanup'` is the existing default (line 215 when v11=false); UNCHANGED.
- `installer.js _prepareUpdateState` now calls the detector adjacent to the `isV11Legacy` call and passes `isV12LegacyAgentsDir: isV12Reloc` into `buildCleanupPlan`.
- Verbose 4-bullet v1.3 BREAKING migration banner (D-09) prints when `isV12Reloc && !config.dryRun`, using `await prompts.getColor()` + `color.cyan(...)` / `color.yellow(...)` exclusively — no `console.log` fallback. Suppressed in dry-run per D-10 (renderPlan already prints planned actions).
- Existing v11 detector + v11 branch + executeCleanupPlan + writeMetadata + snapshot writer + `_backups/` layout: byte-for-byte unchanged.
- Existing newInstallSet build loop in installer.js: byte-for-byte unchanged (the bug fix lives in the cleanup-planner v12 branch, NOT in installer.js).

## Task Commits

1. **Task 1: Add isV12LegacyAgentsDir detector + v12 branch + handledPaths skip in cleanup-planner.js** — `18b27d1` (feat)
2. **Task 2: Wire isV12LegacyAgentsDir into installer.js + verbose v1.3 BREAKING banner** — `fde3f69` (feat)

**Auxiliary:** `017b449` (docs: log pre-existing 7-vs-8 agent count test failures to deferred-items.md)

## Files Created/Modified

- `tools/installer/core/cleanup-planner.js` — +94/-1 LOC. Added `LEGACY_AGENTS_PERSONA_SUBPATH` import; `isV12LegacyAgentsDir` detector after `isV11Legacy` (lines 159-184); buildCleanupPlan input destructure extended with `isV12LegacyAgentsDir: v12Reloc`; v12 branch (lines ~287-329) immediately after the v11 `return plan;`; `handledPaths.has(resolved) continue;` skip after the realpath block in the standard branch; `isV12LegacyAgentsDir` JSDoc parameter on buildCleanupPlan; `isV12LegacyAgentsDir` exported in module.exports.
- `tools/installer/core/installer.js` — +28/0 LOC. `isV12LegacyAgentsDir` detector call after `isV11Legacy` call (line 524); `isV12LegacyAgentsDir: isV12Reloc` added to `buildCleanupPlan` input; 18-line verbose BREAKING banner block between `buildCleanupPlan` return and the dry-run branch (lines 559-585) using `await prompts.getColor()` + `color.cyan/yellow`.
- `.planning/phases/12-agent-dir-relocation-release/deferred-items.md` — +1 LOC documenting pre-existing test-cleanup-planner.js failures.

## Reason value used in metadata.json

**TOP-LEVEL `meta.reason === 'manifest_cleanup'`** — single specific path consumed by Plan 05's AGENT-08 test assertion. NO fallback / "robust to both" — the v12 branch relies on the existing top-level default (set at plan construction when `v11=false`). The v12 branch's `to_snapshot.push` shape contains `{src, install_root, relative_path, orig_hash, was_modified}` with NO per-entry `reason` field (writeMetadata at cleanup-planner.js:357 enumerates only `{install_root, relative_path, orig_hash, was_modified}` and silently drops other fields).

Verified via functional smoke test:

```
Plan reason: manifest_cleanup
to_snapshot count: 1
to_remove count: 1
first snapshot keys: install_root,orig_hash,relative_path,src,was_modified
first snapshot install_root: _gomad
first snapshot relative_path: gomad/agents/pm.md
```

## Banner API confirmation (Blocker 3 closure)

The new banner block at installer.js lines 559-585 uses `await prompts.getColor()` + `color.cyan(...)` / `color.yellow(...)` exclusively. No `console.log` is introduced. Verified via:

```bash
awk '/if \(isV12Reloc && !config\.dryRun\)/,/^      }[[:space:]]*$/' \
    tools/installer/core/installer.js | grep -c "console.log"
# → 0
```

The same `prompts.getColor()` API is used at installer.js:348 (Phase 6 dirResults banner), 1332 (install summary banner), and 1356-1383 (final results renderer) — established pattern (D-09).

## Decisions Made

- **Top-level plan.reason as the single SoT for metadata.json** — verified by reading the plan-construction default at cleanup-planner.js (line 215 in the post-edit file) and `writeMetadata` at line 357. The v12 branch does NOT touch `plan.reason` and does NOT add per-entry `reason` on `to_snapshot.push`. Plan 12-05's AGENT-08 test asserts the top-level `meta.reason === 'manifest_cleanup'` as a single path — this matches exactly.
- **Fall-through (not return) from v12 branch via handledPaths Set** — unlike v11 which returns the plan early because v1.1 has no manifest, v1.2 DOES have a manifest with non-persona stale entries that need standard-branch cleanup. The handledPaths Set is the smallest-diff way to keep both branches working without re-snapshotting/re-removing the persona paths.
- **manifestGen NOT explicitly passed by installer.js** — the cleanup-planner default `manifestGen || new ManifestGenerator()` already provides `calculateFileHash`. Adding `manifestGen: this.manifest` would be functionally a no-op. Decision: leave the call site lean.

## Deviations from Plan

### Auto-fixed Issues

None for Task 1.

None for Task 2.

The plan was followed exactly. The plan's optional "If `manifestGen` is already passed, do not duplicate it. Otherwise add `manifestGen: this.manifest`" was resolved on the side of NOT adding it because the cleanup-planner default already covers the v12 branch's hashGen needs — see Decisions above.

---

**Total deviations:** 0
**Impact on plan:** None — plan executed as written.

## Issues Encountered

- **Pre-existing test-cleanup-planner.js failures (4 assertions)** — `LEGACY_AGENT_SHORT_NAMES: has exactly 7 entries`, the matching expected-order assertion, `buildCleanupPlan legacy: 7 snapshots`, and `buildCleanupPlan legacy: 7 removals`. The list now contains 8 agents (analyst, tech-writer, pm, ux-designer, architect, sm, dev, solo-dev) per quick-task `260424-g68` (commit `8c754b1`, 2026-04-24). Pre-existing failures verified via `git stash && npm run test:cleanup-all` BEFORE plan 12-02 edits — confirmed identical 66 passed / 4 failed pattern. Out of scope per Rule 3 scope boundary; logged to `.planning/phases/12-agent-dir-relocation-release/deferred-items.md` (commit `017b449`).
- **No new failures introduced** — `npm run test:cleanup-all` reports the same 66 passed / 4 failed AFTER plan 12-02 edits.

## Confirmations

- **isV11Legacy detector + branch unchanged:** `git diff tools/installer/core/cleanup-planner.js | grep -E '^-.*isV11Legacy|^-.*v11 \\?'` shows no removed lines for isV11Legacy or the `v11 ? 'legacy_v1_cleanup' : 'manifest_cleanup'` ternary.
- **executeCleanupPlan + snapshotFiles + writeMetadata + writeBackupReadme unchanged:** Same git-diff guard returns no removed lines for those functions.
- **newInstallSet build loop in installer.js unchanged:** `git diff tools/installer/core/installer.js | grep -E '^-.*newInstallSet'` returns 0 lines.
- **Banner uses prompts.getColor() exclusively, no console.log fallback:** `awk` extraction of the banner block returns 0 console.log occurrences.
- **205 install tests still pass:** `npm run test:install` exits 0.
- **Lint clean:** `npx eslint tools/installer/core/cleanup-planner.js --max-warnings=0` and `npx eslint tools/installer/core/installer.js --max-warnings=0` both exit 0.
- **CLI sanity load:** `node tools/installer/gomad-cli.js install --help` prints the help banner without a require error.

## Notes for Downstream Plans

- **Plan 12-03 (detectCustomFiles whitelist):** Plan 12-02's installer.js edits live at lines 510-590 (`_prepareUpdateState`); Plan 12-03's whitelist edit at lines 967-973 (`detectCustomFiles`) is at distinct line ranges and merges cleanly. AGENT_SOURCES is the canonical 8-entry shortname list — consume that for the whitelist instead of re-deriving.
- **Plan 12-04 (docs/upgrade-recovery.md):** The new banner at installer.js line ~582 cross-references `docs/upgrade-recovery.md` § "v1.2 → v1.3 recovery" — Plan 12-04 must add that exact section heading.
- **Plan 12-05 (AGENT-08 test):** Test asserts `meta.reason === 'manifest_cleanup'` at the TOP LEVEL of metadata.json — single path, no per-entry fallback. The v12 branch design honors this exactly.
- **Plan 12-06 (AGENT-07 Phase C body-regex test):** No interaction with Plan 12-02 — the launcher template path is set in Plan 12-01 and not touched here.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- v1.2 → v1.3 upgrade path is now functionally complete on the cleanup-planner side: manifest-AND-persona detector + parallel branch + reused executor.
- Banner content references `docs/upgrade-recovery.md` § "v1.2 → v1.3 recovery" which Plan 12-04 must author.
- `newInstallSet` AGENT-04 latent bug is FIXED for the v1.2→v1.3 path: even if the prior v1.2 manifest still lists `_gomad/gomad/agents/<shortName>.md` AND the new install would recreate them at the OLD location (it won't — Plan 12-01 redirected the writer), the v12 branch unconditionally queues those paths for snapshot+remove.

## Self-Check: PASSED

- File `tools/installer/core/cleanup-planner.js`: FOUND
- File `tools/installer/core/installer.js`: FOUND
- File `.planning/phases/12-agent-dir-relocation-release/deferred-items.md`: FOUND
- Commit `18b27d1` (Task 1): FOUND
- Commit `fde3f69` (Task 2): FOUND
- Commit `017b449` (deferred-items log): FOUND
- `node -e "console.log(typeof require('./tools/installer/core/cleanup-planner').isV12LegacyAgentsDir)"` → `function`: VERIFIED
- `grep -c "isV12LegacyAgentsDir" tools/installer/core/cleanup-planner.js` → 5 (≥4 required): VERIFIED
- `grep -c "isV12LegacyAgentsDir" tools/installer/core/installer.js` → 2 (≥2 required): VERIFIED
- `grep -c "if (handledPaths.has(resolved)) continue;" tools/installer/core/cleanup-planner.js` → 1: VERIFIED
- `grep -c "GoMad v1.3 BREAKING" tools/installer/core/installer.js` → 1: VERIFIED
- `grep -c "console.log" inside banner block` → 0: VERIFIED
- `npm run lint -- tools/installer/core/{cleanup-planner,installer}.js` → exit 0: VERIFIED
- `npm run test:install` → 205 passed / 0 failed: VERIFIED

---
*Phase: 12-agent-dir-relocation-release*
*Completed: 2026-04-27*
