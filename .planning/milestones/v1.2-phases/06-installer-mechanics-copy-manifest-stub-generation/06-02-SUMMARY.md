---
phase: 06-installer-mechanics-copy-manifest-stub-generation
plan: 02
subsystem: installer
tags: [csv-parse, files-manifest, schema_version, install_root, escapeCsv, manifest-v2, backward-compat]

# Dependency graph
requires:
  - phase: 04-installer-bridge-tracking-cleanup
    provides: v1 files-manifest.csv (5 cols) + hand-rolled toggle-quote parser at installer.js:608
  - phase: 05-foundations-command-surface-validation
    provides: launcher-form contract (D-06) requiring per-row install_root for IDE-target rows
provides:
  - "v2 files-manifest.csv schema (7 cols: type,name,module,path,hash,schema_version,install_root)"
  - "csv-parse/sync–based readFilesManifest (RFC-4180 quoting, BOM/CRLF safe)"
  - "escapeCsv-based writeFilesManifest (symmetric with the reader)"
  - "Backward-compat read of v1 manifests — missing columns default to schema_version=null, install_root='_gomad'"
  - "Forward-slash path normalization across both write branches (D-26)"
affects: [06-03 (launcher generator pushes IDE-target rows with explicit install_root), 07 (cleanup phase reads schema_version to gate cleanup behavior)]

# Tech tracking
tech-stack:
  added: []  # zero new deps — csv-parse@^6.1.0 already declared in package.json
  patterns:
    - "csv-parse/sync read idiom: `csv.parse(content, {columns:true, skip_empty_lines:true})`"
    - "escapeCsv RFC-4180 helper: `(value) => `\"${String(value ?? '').replaceAll('\"', '\"\"')}\"`"
    - "Per-row schema_version + install_root for forward-compatible cleanup gating"

key-files:
  created: []
  modified:
    - tools/installer/core/installer.js
    - tools/installer/core/manifest-generator.js

key-decisions:
  - "Preserve pre-existing parseCSVLine helper in installer.js (used by mergeModuleHelpCatalogs) — out of scope per Plan Step C; deviation documented below"
  - "Reuse local escapeCsv helper (mirroring writeAgentManifest:499) instead of pulling csv-stringify/sync — honors zero-new-runtime-deps constraint per CONTEXT.md"
  - "schema_version is the literal string '2.0' (D-24) and install_root defaults to '_gomad' for this plan's _gomad/-internal rows (D-25); Plan 06-03 will override install_root for IDE-target rows"

patterns-established:
  - "Pattern A: Manifest reader uses csv-parse/sync exclusively — no hand-rolled toggle-quote parsing in any new manifest reader from this point forward"
  - "Pattern B: Manifest writer uses escapeCsv per cell + .join(',') — symmetric with the csv-parse reader so a writer→reader round-trip is lossless even with quote/comma payloads"
  - "Pattern C: Additive backward-compat — v1 → v2 schema migration extends columns without breaking existing readers; missing columns get sensible defaults at read time"

requirements-completed: [INSTALL-03, INSTALL-04]

# Metrics
duration: 5min
completed: 2026-04-18
---

# Phase 06 Plan 02: Manifest v2 (csv-parse + schema_version + install_root) Summary

**files-manifest.csv upgraded from v1 (5 cols, hand-rolled toggle-quote parser) to v2 (7 cols, csv-parse/sync) — adds schema_version='2.0' and install_root='_gomad' on every row, preserves v1 backward-compat, and mitigates Pitfall #2 quoting/BOM/CRLF fragility.**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-04-18T13:32:10Z
- **Completed:** 2026-04-18T13:37:Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Replaced the 30-line hand-rolled toggle-quote CSV parser at `installer.js:608-646` with the canonical 5-line `csv.parse({columns:true, skip_empty_lines:true})` idiom already used in `_config-driven.js:143-147` and `manifest-generator.js:505-511`.
- Bumped `files-manifest.csv` header from `type,name,module,path,hash` to `type,name,module,path,hash,schema_version,install_root` (D-23).
- Tagged every row with `schema_version="2.0"` (D-24) and `install_root="_gomad"` (D-25 default).
- Added forward-slash normalization (D-26) on both writer branches — defensive even on POSIX where `replace(this.gomadDir, '')` already produced forward slashes.
- Adopted the `escapeCsv` helper from `writeAgentManifest:499` so writer output is symmetric with the new csv-parse reader (T-06-06 mitigation: CSV-injection via embedded commas/quotes is impossible).
- Added v1 backward-compat at the read side: missing `schema_version` column → `null`; missing `install_root` column → `'_gomad'`. Phase 4 manifests (and any external v1 manifests) still read cleanly.

## Task Commits

Each task was committed atomically:

1. **Task 1: Replace hand-rolled CSV parser in installer.js:readFilesManifest with csv-parse/sync** — `3bdf995` (feat)
2. **Task 2: Extend writeFilesManifest with schema_version + install_root columns + escapeCsv + forward-slash normalization** — `106782a` (feat)

**Plan metadata:** committed by orchestrator after worktree merge.

_Note: Both tasks were marked `tdd="true"` in the plan, but the project uses ad-hoc Node test scripts under `test/` (no Jest/Mocha runner is wired for these files). Per the plan's `<verify><automated>` blocks and `<acceptance_criteria>` round-trip checks, the tests are inline assertions — not separate `*.test.js` files. Both inline behavior tests (Test 1 v2 read; Test 2 v1 backward-compat; Test 4 embedded comma) and the round-trip test were executed and passed (output below)._

## Files Created/Modified

- `tools/installer/core/installer.js` — Added `csv-parse/sync` import; replaced `readFilesManifest` body (lines 608-651) with a 14-line csv-parse implementation that returns the v1-compatible shape plus additive `schema_version`/`install_root` fields.
- `tools/installer/core/manifest-generator.js` — Inserted local `escapeCsv` helper in `writeFilesManifest`; bumped CSV header to v2 schema; added `schema_version='2.0'` + `install_root='_gomad'` to both push branches; added redundant-safe forward-slash normalization on the path field; rewrote the row-emit loop to use `escapeCsv` on every cell.

## Decisions Made

- **D-23 / D-24 / D-25 / D-26 / D-27 implemented exactly as specified in 06-CONTEXT.md** — column order is "existing 5 first, new 2 appended" (CONTEXT.md §"Claude's Discretion" preferred form); `schema_version` is the literal string `"2.0"`; `install_root` default is `"_gomad"`.
- **Local escapeCsv (3 LOC) instead of csv-stringify/sync** — honors the zero-new-runtime-deps constraint while delivering RFC-4180 quoting that is symmetric with `csv.parse` on read.
- **Preserved `parseCSVLine` helper** (`installer.js:1663-1690`) — it is consumed by `mergeModuleHelpCatalogs` for `module-help.csv` parsing, an unrelated path. Plan Step C explicitly instructed "Do NOT touch any other method in installer.js".

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Bug, but in plan acceptance criterion] Cannot satisfy strict `grep -c 'inQuotes' returns 0` without violating Plan Step C**

- **Found during:** Task 1 verification (Step `<verify><automated>`).
- **Issue:** The plan's strict acceptance criterion `grep -c 'inQuotes' tools/installer/core/installer.js returns 0` would only pass if every `inQuotes` reference is removed from the file. However, Step C explicitly says "Do NOT touch any other method in installer.js" — and the pre-existing `parseCSVLine` helper at `installer.js:1663-1690` (used by `mergeModuleHelpCatalogs` to parse `module-help.csv`) also uses an `inQuotes` flag. Removing it would break unrelated functionality.
- **Fix:** Honored Plan Step C (explicit, narrowly-scoped instruction) over the strict grep criterion (a generic count). The hand-rolled parser **inside `readFilesManifest`** (the actual target) was fully removed (30 → 0 LOC of `inQuotes` logic in that method). The unrelated helper for a different CSV file remains intact. A scoped re-verification confirmed: `readFilesManifest` body contains zero `inQuotes` references.
- **Verification:**
  ```
  $ grep -n inQuotes tools/installer/core/installer.js
  1643:    let inQuotes = false;
  1650:        if (inQuotes && nextChar === '"') {
  1656:          inQuotes = !inQuotes;
  1658:      } else if (char === ',' && !inQuotes) {
  ```
  All 4 remaining occurrences are inside `parseCSVLine` (the `module-help.csv` helper), not `readFilesManifest`. The `<done>` criterion "No hand-rolled character-by-character CSV logic remains in installer.js" is interpreted in the context of the plan's stated scope (this plan owns ONLY `readFilesManifest`); converting `parseCSVLine` is appropriate cleanup for a future plan, not 06-02.
- **Files modified:** None (no extra change beyond the planned edit).
- **Committed in:** N/A — interpretation of plan, not a code-side fix.

---

**Total deviations:** 1 (plan-criterion interpretation, no extra code change)
**Impact on plan:** Zero scope creep. Both modified files match the `files_modified` frontmatter exactly. The strict `inQuotes==0` criterion is a planning oversight that didn't account for the unrelated `parseCSVLine` helper consumed by `mergeModuleHelpCatalogs`. The intent of the criterion (no hand-rolled parsing in `readFilesManifest`) is fully satisfied.

## Issues Encountered

None. Both tasks executed exactly as planned.

## Verification Evidence

**v2 header (manual install spot-check, real installer run):**
```
type,name,module,path,hash,schema_version,install_root
```

**Sample v2 row (line 5 of a real install's `_gomad/_config/files-manifest.csv`, 265 rows total):**
```
"csv","domain-complexity","agile","agile/2-plan-workflows/gm-create-prd/data/domain-complexity.csv","f775f09fb4dc1b9214ca22db4a3994ce53343d976d7f6e5384949835db6d2770","2.0","_gomad"
```

**Round-trip verification (Task 2 acceptance_criteria one-liner):**
```
ROUND_TRIP_OK
Header: type,name,module,path,hash,schema_version,install_root
Sample row: "txt","dummy","dummy.txt","dummy.txt","2d711642b726b04401627ca9fbac32f5c8530fb1903cc4db02258717921a4881","2.0","_gomad"
```

**v1 backward-compat verification (Test 2 from Task 1 behavior):**
```
V1_COMPAT_OK {"type":"md","name":"foo","module":"gomad","path":"gomad/foo.md","hash":"abc123","schema_version":null,"install_root":"_gomad"}
```

**Embedded comma verification (Test 4 from Task 1 behavior — Pitfall #2 mitigation):**
```
EMBEDDED_COMMA_OK {"type":"md","name":"agent-pm","module":"gomad","path":"agents/pm, the PM.md","hash":"def","schema_version":"2.0","install_root":"_gomad"}
```

**Existing test suites unaffected:**
- `npm run test:gm-surface` → 7 passed, 0 failed (real `gomad install --yes` produces a v2 manifest end-to-end)
- `npm run test:install` → 204 passed, 0 failed (manifest-generator unit tests all green)

**Zero-new-runtime-deps confirmation:**
```
$ git diff --stat package.json
(empty — no changes)
```
`csv-parse@^6.1.0` was already a declared dependency.

## Caller Audit (per `<output>` requirement)

`readFilesManifest` is called from exactly one location in source:
- `tools/installer/core/installer.js:463` inside `_prepareUpdateState` → feeds `detectCustomFiles` (defined at `installer.js:659`).

`detectCustomFiles` consumes only `fileEntry.path` and `fileEntry.hash`. The two new additive fields (`schema_version`, `install_root`) are ignored by current callers, so the change is fully backward-compatible with existing call sites. Plan 06-03's launcher generator and Phase 7's cleanup are the **intended** new consumers of the additive fields.

## User Setup Required

None — purely internal manifest schema change.

## Next Phase Readiness

- **Plan 06-03 (launcher generator)** can now push rows for the 7 generated `.claude/commands/gm/agent-*.md` launcher files plus the 7 extracted persona files into `this.installedFiles`, and they will land in the v2 manifest with `install_root='.claude'` (or `'.cursor'` / `'.codex'` etc.) — via the `file.install_root || '_gomad'` preserve-if-set logic in the fallback branch, OR the primary branch can be extended in 06-03 to derive `install_root` from the path prefix.
- **Phase 7 (cleanup)** can branch on `schema_version === '2.0'` vs `null` to apply version-specific cleanup behavior (T-06-07 mitigation realized).
- **No blockers.** v1 manifests from Phase 4 still read cleanly; downstream `detectCustomFiles` is unchanged in observable behavior.

## Self-Check: PASSED

- `tools/installer/core/installer.js` — present, contains `csv.parse(content` at the readFilesManifest site, contains `schema_version: r.schema_version`, contains `install_root: r.install_root || '_gomad'`.
- `tools/installer/core/manifest-generator.js` — present, contains v2 header literal, contains `escapeCsv = (value)` (3 occurrences across the file), contains `schema_version: '2.0'` (2 occurrences — one per push branch), contains `install_root: '_gomad'` default.
- Commit `3bdf995` — present in `git log --oneline` (Task 1).
- Commit `106782a` — present in `git log --oneline` (Task 2).

---

*Phase: 06-installer-mechanics-copy-manifest-stub-generation*
*Completed: 2026-04-18*
