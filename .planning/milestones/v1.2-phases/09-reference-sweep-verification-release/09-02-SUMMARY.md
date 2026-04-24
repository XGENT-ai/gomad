---
phase: 09-reference-sweep-verification-release
plan: 02
subsystem: verification-gates
tags:
  - verification
  - tests
  - release-gates
  - tarball
  - regression-gate

# Dependency graph
requires:
  - phase: 09-01
    provides: "Clean post-rewrite grep output across 4 edited files; source/emit symmetry for module-help.csv; dash↔colon transform helpers deleted in installer.js"
provides:
  - "test:orphan-refs regression gate fails exit 1 on any unallowlisted gm-agent- hit (REF-01 lock-in)"
  - "test-gm-command-surface.js Phase C hard assertion on all 7 installer-produced launchers + negative assertion on legacy skills dir absence (D-69, REL-03)"
  - "verify-tarball.js Phase 3 grep-clean pass for gm-agent- with narrow allowlist (D-71, REL-04)"
  - "quality + test chains now invoke test:orphan-refs (D-68 publish-gate + dev-fast gate wiring)"
  - "REF-05 enforcement: README.md/README_CN.md/docs/website/ in-scope — future gm-agent- regression in user-facing docs exits 1"
affects:
  - 09-03 (release gate — publish checklist relies on quality chain passing)
  - any-future-plan-touching-gm-agent-user-visible-refs

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Regression gate with narrow JSON allowlist (per-line lineContainsPattern or whole-file path-only for filesystem-path refs)"
    - "Gate-self-references allowlisted explicitly: test-orphan-refs.js + its fixture + verify-tarball.js Phase 3 code + LEGACY_AGENTS loop are all by-design references to the pattern they enforce, not orphans"
    - "Dual-sided REL-03 enforcement: install-smoke (gm-surface) + shipped-content (tarball) both gate on gm-agent- residual"

key-files:
  created:
    - "test/test-orphan-refs.js — CLI regression gate (148 lines; parseHit/isAllowlisted/printContext helpers + ANSI-colored summary)"
    - "test/fixtures/orphan-refs/allowlist.json — 31 entries (14 frontmatter + 11 installer/test filesystem-path refs + 1 phase-07 test fixture + 5 gate-self-references)"
    - "tools/fixtures/tarball-grep-allowlist.json — 19 entries (14 frontmatter SKILL.md + skill-manifest.yaml + 5 shipped installer modules)"
  modified:
    - "test/test-gm-command-surface.js — Phase C flipped from conditional to hard assertion; EXPECTED_AGENTS + LEGACY_AGENTS enumerated explicitly; header comment updated (D-69)"
    - "tools/verify-tarball.js — new checkGmAgentGrepClean function + Phase 3 invocation + node:fs / node:path imports (D-71)"
    - "package.json — test:orphan-refs script added; quality + test chains extended (D-68)"

key-decisions:
  - "Gate grep scope INCLUDES README.md, README_CN.md, docs/, website/ — no --exclude-dir flags for those paths. These surfaces currently have zero gm-agent- hits (per Plan 01 and pre-plan boundary); the gate therefore passes with no allowlist entries for them. Any future regression in those paths immediately bites (REF-05 enforcement, not a passive state claim)."
  - "Allowlist entries use per-line `lineContainsPattern` where practical (frontmatter lines, phase-07 test fixture line, installer.js single-line comment); whole-file path-only entries for files where every hit is a legitimate filesystem-path ref (agent-command-generator.js, cleanup-planner.js, manifest-generator.js, verify-tarball.js Phase 3, etc.). This keeps the allowlist auditable while avoiding tedious per-line entries for files where every hit is categorically legitimate."
  - "LEGACY_AGENTS loop in Phase C and EXPECTED_AGENTS loop both enumerate the 7 shortNames explicitly (not globSync) — a silently-missing 1-of-7 launcher must fail the test (per D-69 strict-count requirement)."
  - "gate-self-references allowlisted: test-orphan-refs.js, its fixture, verify-tarball.js Phase 3 code, and test-gm-command-surface.js LEGACY_AGENTS loop all reference `gm-agent-` by design — they ARE the gates. Adding them to the allowlist prevents gate self-accusation."

patterns-established:
  - "Regression gate + JSON allowlist: gate script runs a canonical grep, classifies hits via allowlist entries with per-line or per-file matching, exits 1 on any unallowlisted hit. Allowlist entries carry a `reason` field for reviewer auditability."
  - "Dual-sided release gate: install-smoke (gm-surface) verifies installer output shape; tarball grep-clean verifies shipped content. Both must exit 0 before release."

requirements-completed:
  - REF-01
  - REF-04
  - REF-05
  - REL-03
  - REL-04

# Metrics
duration: 18min
completed: 2026-04-23
---

# Phase 9 Plan 2: Verification Gates Summary

**Installed three regression gates — `test:orphan-refs` (allowlisted grep across source/tests/docs/manifests), `test-gm-command-surface.js` Phase C hard assertion on all 7 installer-produced launchers with negative assertion on legacy skills dir absence, and `verify-tarball.js` Phase 3 grep-clean pass for shipped tarball content — wired into `npm run quality` + `npm test` chains. Any future `gm-agent-` regression in user-visible surface (including README, docs/, website/) now exits 1 before the publish gate passes.**

## Performance

- **Duration:** 18 min
- **Tasks:** 3 (all auto, no TDD)
- **Files created:** 3 (test script + 2 fixture JSONs)
- **Files modified:** 3 (test/test-gm-command-surface.js, tools/verify-tarball.js, package.json)

## Accomplishments

### Task 1 — Orphan-refs gate + allowlist fixture

- Created `test/test-orphan-refs.js` (148 lines) — CLI gate mirroring `test/test-file-refs-csv.js` shape; runs `grep -rn 'gm-agent-' .` excluding node_modules/.git/.planning/milestones/dist/coverage (README/docs/website intentionally IN scope per REF-05)
- Helpers: `parseHit` (parses `./path:NN:text` format), `isAllowlisted` (per-line `lineContainsPattern` or whole-file path match), `printContext` (shows ±2 lines around hit for failure diagnostics)
- Created `test/fixtures/orphan-refs/allowlist.json` — 31 entries covering:
  - 14 frontmatter `name: gm-agent-*` lines (7 agents × SKILL.md + skill-manifest.yaml)
  - 11 installer + test module filesystem-path refs (whole-file-allowed or per-line pattern)
  - 1 phase-07 test fixture line
  - 5 gate-self-references (the gate script + its fixture + verify-tarball.js Phase 3 + tarball-grep-allowlist.json + test-gm-command-surface.js LEGACY_AGENTS loop)
- Gate exits 0 on post-Plan-01 tree (162 total grep hits, 162 allowlisted, 0 unallowlisted)
- Regression bite proven: `echo '// gm-agent-pm orphan' > tools/.regression-test.js && npm run test:orphan-refs` exits 1; delete file, re-run, exits 0

### Task 2 — Phase C hard assertion + verify-tarball Phase 3

- Flipped `test/test-gm-command-surface.js` Phase C from conditional (`if fs.existsSync(installedGmDir) { ... } else { warn }`) to hard assertion:
  - `assert(fs.existsSync(installedGmDir), ...)` — installer MUST emit `.claude/commands/gm/`
  - `EXPECTED_AGENTS = ['analyst', 'tech-writer', 'pm', 'ux-designer', 'architect', 'sm', 'dev']` loop — each of the 7 must have its `agent-<shortName>.md` with valid YAML frontmatter (name === `gm:agent-<shortName>`, non-empty description)
  - `LEGACY_AGENTS` loop negative assertion — no `.claude/skills/gm-agent-<shortName>/` dir may be present in fresh install
- Removed outdated "Phase 5 baseline" / "Phase 6 will flip" comments from Phase A/B/C
- Added `tools/verify-tarball.js` Phase 3 (`checkGmAgentGrepClean`):
  - `grep -rlE "gm-agent-" src/ tools/installer/ --include=*.js --include=*.yaml --include=*.md --include=*.json --include=*.csv` (same file-type scope as Phase 2)
  - Filters results against `tools/fixtures/tarball-grep-allowlist.json` (19 entries: 14 frontmatter + 5 shipped installer modules)
  - Integrated into main execution: Phase 3 invocation added after Phase 2; final success log updated to mention "no unallowlisted gm-agent- residuals"
  - Added `const fs = require('node:fs')` + `const path = require('node:path')` imports
- `npm run test:tarball` exits 0 (327 files in tarball, all 3 phases pass)
- `npm run test:gm-surface` exits 0 — 43 assertions, all 7 agents' launchers verified structurally + all 7 legacy skills dirs verified absent

### Task 3 — package.json scripts wiring

- Added `"test:orphan-refs": "node test/test-orphan-refs.js"` to scripts (placed after test:integration; prettier-plugin-packagejson re-sort stable)
- Extended `quality` script (terminal gate per D-68):
  - Before: `... && npm run validate:skills`
  - After: `... && npm run validate:skills && npm run test:orphan-refs`
- Extended `test` script (dev-fast gate per D-68):
  - Before: `npm run test:refs && npm run test:install && ...`
  - After: `npm run test:refs && npm run test:orphan-refs && npm run test:install && ...`
- Supplemented allowlist with 3 entries for new gate-self-references introduced by Task 2 (revealed when the gate was wired into the test chain)
- `version` field NOT touched — Plan 03 owns the `1.1.1 → 1.2.0` bump per D-75 step 2

## Task Commits

1. **Task 1: Create orphan-refs gate + allowlist fixture** — `c3f2bd4` (test)
2. **Task 2: Flip Phase C hard assertion + add verify-tarball Phase 3** — `e95e48d` (test)
3. **Task 3: Wire test:orphan-refs into quality + test chains** — `9a2bb1f` (chore)

## Allowlist Entry Count + Categorization

### `test/fixtures/orphan-refs/allowlist.json` — 31 entries

| Category | Count | Examples |
|----------|-------|----------|
| Frontmatter `name:` lines | 14 | `src/gomad-skills/1-analysis/gm-agent-analyst/SKILL.md` + `skill-manifest.yaml` (×7 agents) |
| Installer filesystem-path refs (whole-file-allowed) | 1 | `tools/installer/ide/shared/agent-command-generator.js` |
| Installer per-line refs | 4 | `tools/validate-skills.js`, `tools/installer/ide/_config-driven.js`, `tools/installer/core/cleanup-planner.js`, `tools/installer/core/manifest-generator.js` |
| Installer legacy comment (installer.js single line) | 1 | `tools/installer/core/installer.js` line 294 (Phase 6 D-14/D-15 comment) |
| Test-fixture filesystem-path refs | 6 | `test/test-legacy-v11-upgrade.js`, `test/test-cleanup-execute.js`, `test/test-dry-run.js`, `test/test-installer-self-install-guard.js`, `test/test-cleanup-planner.js`, `test/fixtures/phase-07/manifests/valid-v2.csv` |
| Gate-self-references | 5 | `test/test-orphan-refs.js`, `test/fixtures/orphan-refs/allowlist.json`, `tools/verify-tarball.js`, `tools/fixtures/tarball-grep-allowlist.json`, `test/test-gm-command-surface.js` |

### `tools/fixtures/tarball-grep-allowlist.json` — 19 entries

| Category | Count | Examples |
|----------|-------|----------|
| Frontmatter SKILL.md + skill-manifest.yaml | 14 | 7 agents × 2 files (shipped) |
| Shipped installer modules | 5 | `tools/installer/ide/shared/agent-command-generator.js`, `tools/installer/ide/_config-driven.js`, `tools/installer/core/cleanup-planner.js`, `tools/installer/core/manifest-generator.js`, `tools/installer/core/installer.js` |

## Gate Invocation Output

### `npm run test:orphan-refs`

```
Orphan Reference Regression Gate (gm-agent-)
Grep scope: repo root, excluding node_modules/.git/.planning/milestones.

  ✓ Allowlist fixture parses as JSON array
  ✓ Grep output clean: 162 total hits, 0 unallowlisted

Summary
  2/2 tests passed, 0 failed
  Total grep hits: 162, allowlisted: 162, unallowlisted: 0
```

Exit 0.

### `npm run test:gm-surface`

```
...
✓ .claude/commands/gm/ present in installed output
✓ (C) agent-analyst.md present in installed output
... (all 7 launchers verified with YAML frontmatter + name + description)
✓ (C) no legacy .claude/skills/gm-agent-analyst/ present after fresh install
... (all 7 legacy dirs verified absent)

Results: 43 passed, 0 failed
```

Exit 0.

### `npm run test:tarball`

```
Phase 1: Checking tarball for forbidden paths...
PASS: no forbidden paths in tarball
Phase 2: Checking for residual bmad/bmm references...
PASS: no bmad/bmm residuals in shipped files
Phase 3: Checking for residual gm-agent- references...
PASS: no unallowlisted gm-agent- residuals in shipped files

OK: 327 files in tarball, no forbidden paths, no bmad/bmm residuals, no unallowlisted gm-agent- residuals
```

Exit 0.

## Regression-Bite Proof (paste-ready)

```bash
# Inject orphan reference
echo '// regression test: gm-agent-pm orphan injected' > tools/.regression-test-file.js

# Gate MUST exit 1
npm run test:orphan-refs; GATE_EXIT=$?
echo "Gate exit with regression: $GATE_EXIT"   # expect 1

# Cleanup
rm -f tools/.regression-test-file.js

# Gate MUST now exit 0
npm run test:orphan-refs; GATE_EXIT=$?
echo "Gate exit on clean tree: $GATE_EXIT"     # expect 0
```

Verified during execution. Gate bit correctly on injected regression (exit 1), returned to clean (exit 0) after revert.

## REF-05 Gate-Scope Proof

Grep scope in `test/test-orphan-refs.js`:

```javascript
grepOutput = execSync(
  `grep -rn 'gm-agent-' . ` +
    `--exclude-dir=node_modules --exclude-dir=.git --exclude-dir=.planning ` +
    `--exclude-dir='old-milestone-*' --exclude-dir=dist --exclude-dir=coverage ` +
    `2>/dev/null`,
  ...
);
```

`README.md`, `README_CN.md`, `docs/`, `website/` are NOT excluded. They are therefore IN scope. These paths currently have zero `gm-agent-` hits (pre-plan boundary from Phase 8 / Plan 01 state), so no allowlist entries are needed for them. Any future regression (someone accidentally re-introducing `gm-agent-` in README or docs/ or website/) causes the gate to exit 1 — this is the plan-delivered REF-05 enforcement.

## Filesystem Invariant Preserved

```bash
$ ls -d src/gomad-skills/*/gm-agent-* 2>/dev/null | wc -l
7
$ grep -rc '^name: gm-agent-' src/gomad-skills/ | grep -v ':0$' | wc -l
14
```

7 `gm-agent-*` dirs + 14 `name: gm-agent-*` frontmatter lines — unchanged. REF-02 / REF-04 invariants intact.

## Decisions Made

- **Gate-self-reference allowlisting is explicit.** Rather than pattern-excluding the gate script + fixture from the grep (which would risk silently missing regressions in test code), we allowlist them by path with clear `reason` fields. Reviewer can audit the allowlist and confirm these 5 entries are structurally unavoidable.
- **Whole-file path-only allowlist for files where every hit is categorically legitimate.** Examples: `tools/installer/ide/shared/agent-command-generator.js` (every hit is a filesystem dir string), `tools/verify-tarball.js` (every Phase 3 hit is the target pattern by design). Saves ~30 per-line entries without loss of auditability (reviewer sees the `reason` field explaining why the whole file is waivable).
- **Per-line `lineContainsPattern` where practical.** Installer.js single-line comment, phase-07 fixture line, frontmatter lines all use per-line matching so that ANY new `gm-agent-` reference in those files (not on the allowlisted line) would cause exit 1.
- **REL-03 enforced dual-sidedly.** `test:gm-surface` verifies installer output shape (what gets written to `.claude/commands/gm/`); `test:tarball` verifies shipped tarball content (what ships in the npm package). Both must exit 0 for the publish gate to pass. Neither alone is sufficient — e.g., installer could produce correct output from broken tarball source, or tarball could be correct but installer could mis-emit.

## Deviations from Plan

### [Rule 3 - Blocking] Task 2 edits created new gm-agent- references that Task 1's gate caught when wired in Task 3

- **Found during:** Task 3 verification (`npm run test:orphan-refs` via the newly-wired test chain)
- **Issue:** Task 2 edits added new `gm-agent-` references in three files that were not in the Task 1 allowlist bootstrap:
  - `tools/verify-tarball.js` — Phase 3 code comments, grep pattern string, allowlist-file path string (8 new lines)
  - `tools/fixtures/tarball-grep-allowlist.json` — its own `path` entries (14 lines, one per shipped file)
  - `test/test-gm-command-surface.js` — Phase C header comment (line 18) + LEGACY_AGENTS loop template strings (lines 246/247)
- **Classification:** These are gate-self-references (the verify-tarball.js Phase 3 IS the `gm-agent-` grep gate; tarball-grep-allowlist.json IS the allowlist for that gate; LEGACY_AGENTS loop IS the negative-assertion target). Not orphan refs.
- **Fix:** Added 3 whole-file path-only allowlist entries with `reason` fields explaining each is a by-design gate self-reference. Committed alongside the Task 3 package.json wiring.
- **Why this happened:** Task 1 bootstrapped the allowlist before Task 2 ran — so Task 2's additions were not yet visible during bootstrap. This is expected pipeline order (Task 1 script/fixture ships first, then Task 2 fleshes out the other gates, then Task 3 wires them together). The plan's bootstrap procedure documents this iterative pattern.
- **Files modified:** `test/fixtures/orphan-refs/allowlist.json` (+3 entries from 28 to 31)
- **Committed in:** `9a2bb1f` (Task 3 commit, bundled with package.json scripts wiring)

**Impact:** Zero risk. Without these entries the gate would self-accuse when wired into the test chain, breaking `npm test` and `npm run quality`. With the entries, the gate correctly classifies its own mechanism files.

---

**Total deviations:** 1 (Rule 3 blocking issue, auto-fixed per instructions). All plan-spec actions landed.

## Issues Encountered

- None blocking. The one gate-self-reference gap (above) was revealed and fixed during Task 3 verification.

## User Setup Required

None — gates are fully automatable CI artifacts. No external service configuration required.

## Self-Check: PASSED

**Files verified present:**

```bash
$ test -f test/test-orphan-refs.js && echo "FOUND: test/test-orphan-refs.js"
FOUND: test/test-orphan-refs.js

$ test -f test/fixtures/orphan-refs/allowlist.json && echo "FOUND: allowlist.json"
FOUND: allowlist.json

$ test -f tools/fixtures/tarball-grep-allowlist.json && echo "FOUND: tarball allowlist"
FOUND: tarball allowlist
```

**Commits verified in `git log --oneline`:**

- FOUND: `c3f2bd4` — test(09-02): add orphan-refs regression gate + allowlist fixture
- FOUND: `e95e48d` — test(09-02): flip Phase C hard assertion + add verify-tarball Phase 3
- FOUND: `9a2bb1f` — chore(09-02): wire test:orphan-refs into quality + test chains

**Global invariants verified post-plan:**

- `npm run test:orphan-refs` exits 0 (162 hits, all allowlisted)
- `npm run test:gm-surface` exits 0 (43 assertions, hard + negative both pass)
- `npm run test:tarball` exits 0 (Phase 1+2+3 all pass, 327 shipped files clean)
- `npm run lint` exits 0
- `npm run format:check` exits 0
- 7 `gm-agent-*` filesystem dirs present (REF-02 invariant preserved)
- 14 `name: gm-agent-*` frontmatter lines present (REF-04 invariant preserved)
- Regression bite: injecting `gm-agent-pm` in an unallowlisted file causes exit 1 (proven during Task 3 verification)
- `package.json.version` untouched at `1.1.1` (Plan 03 owns the bump)

## Next Phase Readiness

- **Plan 03 (release gate)** has all three verification gates wired. `npm run quality` now includes `test:orphan-refs` as its terminal gate, so any gm-agent- regression exits 1 before publish. `npm test` (dev-fast chain) also bites on the same regression.
- **No blockers** for Plan 03.

## Threat Flags

None. All new surface introduced (regression gate script + two allowlist fixtures) operates on repo-local filesystem and has no network, auth, or schema impact. Threat register T-09-05 through T-09-09 documented in plan's `<threat_model>` remain accurate; no additional threats discovered during execution.

---
*Phase: 09-reference-sweep-verification-release*
*Completed: 2026-04-23*
