---
phase: 10-story-creation-enhancements
plan: 01
subsystem: release-gate
tags: [validator, kb, yaml, glob, ip-licensing, quality-gate, release-gate, commonjs]

# Dependency graph
requires:
  - phase: 09 (v1.2 close)
    provides: "npm run quality chain discipline (validate:refs, validate:skills, test:orphan-refs pattern); zero-new-deps policy; yaml+glob already in dependencies"
provides:
  - "tools/validate-kb-licenses.js enforcing 7 rules (KB-01..KB-07) on src/domain-kb/**/*.md frontmatter"
  - "npm run validate:kb-licenses script + wiring into npm run quality"
  - "Release-gate posture for all v1.3 KB content (IP-cleanliness contract)"
  - "Exportable API: validateKbLicenses(), validateFile(), extractFrontmatter() for in-process reuse by downstream tests"
affects:
  - "10-04 (testing KB pack) — every .md emitted must carry source/license/last_reviewed frontmatter"
  - "10-05 (architecture KB pack) — same frontmatter contract"
  - "10-06 (installer _installDomainKb + test-domain-kb-install) — relies on validator having already blocked bad content before installer sees it"
  - "Any future KB content — IP-licensing gate is now load-bearing for CI"

# Tech tracking
tech-stack:
  added: []  # Zero new runtime deps (policy held)
  patterns:
    - "Release-gate exit contract: any CRITICAL finding fails without --strict; --strict additionally promotes HIGH to failing (stricter than validate-skills.js)"
    - "yaml.parse + globSync canonical parsers (per CONTEXT.md §Reusable Assets)"
    - "Finding shape: {rule, title, severity, file, detail, fix} mirroring validate-skills.js"
    - "ANSI colors via \\u001B Unicode escapes (satisfies unicorn/escape-case + unicorn/no-hex-escape lint rules)"

key-files:
  created:
    - "tools/validate-kb-licenses.js (422 lines)"
  modified:
    - "package.json (scripts.validate:kb-licenses added + quality chain wiring; 2-line diff)"

key-decisions:
  - "Chose yaml.parse over hand-rolled parseFrontmatter — CONTEXT.md §Reusable Assets preference; KB frontmatter is small enough to warrant the real parser, and yaml is already in dependencies"
  - "Chose globSync over recursive walk — KB tree is shallow; globSync already used by test/test-e2e-install.js; glob is already in dependencies"
  - "Release-gate exit posture is stricter than validate-skills.js — CRITICAL fails without --strict to enforce the IP-cleanliness contract unambiguously"
  - "Normalized ANSI escape from \\x1b to \\u001B (uppercase, Unicode form) to satisfy unicorn/escape-case + unicorn/no-hex-escape lint rules"
  - "Handled yaml.parse date coercion — unquoted ISO dates parse as Date objects; validator normalises via .toISOString().slice(0,10) before DATE_REGEX check"

patterns-established:
  - "KB-0X rule naming convention: numeric suffix (01..07), CRITICAL for correctness-of-attribution rules (KB-01..KB-04), HIGH for format/policy rules (KB-05..KB-07)"
  - "Release-gate validators get dual exit modes: CRITICAL-only (default) and HIGH+ (--strict); content-based validators (like validate-skills.js) stay warning-only until --strict"
  - "YAML date coercion normalization: validators that accept ISO dates from yaml.parse must handle both Date objects and strings"

requirements-completed:
  - STORY-10

# Metrics
duration: ~25min
completed: 2026-04-24
---

# Phase 10 Plan 01: KB License Validator (Release Gate) Summary

**Release-gate validator for IP-cleanliness — 7 rules (KB-01..KB-07) enforce source/license/last_reviewed frontmatter on src/domain-kb/\*\*/\*.md, wired into npm run quality before any KB content ships.**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-04-24T16:56:00Z
- **Completed:** 2026-04-24T17:22:08Z
- **Tasks:** 2 / 2
- **Files modified:** 2 (1 created, 1 modified)

## Accomplishments

- **IP-cleanliness release gate landed before any KB content** — per PITFALLS.md §Pitfall 4-J (CRITICAL), any future un-attributed `.md` under `src/domain-kb/` is now blocked at CI. DMCA takedown risk for v1.3 KB packs (Plans 10-04/05) is mitigated at the gate, not after the fact.
- **Zero new runtime deps** — reused `yaml` and `glob` already in `dependencies` (policy held).
- **Dual exit posture** — `CRITICAL` fails without `--strict` (release-gate); `--strict` promotes `HIGH` to failing as well. Stricter than `validate-skills.js` per PATTERNS.md §8.
- **Quality chain wired** — `npm run quality` now runs `validate:kb-licenses` between `validate:skills` and `test:orphan-refs`; exact position verified in acceptance criteria to prevent accidental reordering (T-10-01-03 mitigation).
- **Exportable API** — `validateKbLicenses`, `validateFile`, `extractFrontmatter`, `discoverKbFiles`, `LICENSE_ALLOWLIST`, `REQUIRED_KEYS` exported for downstream in-process reuse (e.g., Plan 10-06 tests).

## Task Commits

Each task was committed atomically:

1. **Task 1: Write `tools/validate-kb-licenses.js` with KB-01..KB-07 rules** — `0eb6666` (feat)
2. **Task 2: Wire `validate:kb-licenses` into `npm run quality` via package.json** — `9369ae4` (chore)

## Files Created/Modified

- `tools/validate-kb-licenses.js` (**new**, 422 lines) — CommonJS release-gate validator. Imports `yaml`, `glob`, `node:fs`, `node:path`. Implements 7 KB rules + human-readable + JSON outputs + GitHub Actions annotations. Exports `validateKbLicenses`/`validateFile`/`extractFrontmatter`/`discoverKbFiles`/`LICENSE_ALLOWLIST`/`REQUIRED_KEYS` for in-process reuse.
- `package.json` (modified) — adds `scripts.validate:kb-licenses` (alphabetically placed); wires `npm run validate:kb-licenses` into `scripts.quality` chain between `validate:skills` and `test:orphan-refs`. 2-line diff. No dependency changes.

## Validator Rules Implemented

| Rule  | Severity | Check                                                                                 |
| ----- | -------- | ------------------------------------------------------------------------------------- |
| KB-01 | CRITICAL | YAML frontmatter present and parseable (`---\n...\n---`)                              |
| KB-02 | CRITICAL | Frontmatter has non-empty `source` key                                                |
| KB-03 | CRITICAL | Frontmatter has non-empty `license` key                                               |
| KB-04 | CRITICAL | Frontmatter has `last_reviewed` matching `YYYY-MM-DD`                                 |
| KB-05 | HIGH     | `source` is `original` OR starts with `http://` / `https://`                          |
| KB-06 | HIGH     | `license` ∈ `{MIT, Apache-2.0, BSD-3-Clause, CC-BY-4.0, CC0-1.0, original}`           |
| KB-07 | HIGH     | File has H1 heading (`# ...`) after frontmatter (enables D-09 catalog listing)        |

## package.json Wiring

**Position in quality chain:** `validate:skills` → **`validate:kb-licenses`** → `test:orphan-refs`

Final `scripts.quality` value:

```
npm run format:check && npm run lint && npm run lint:md && npm run docs:build && npm run test:install && npm run test:integration && npm run validate:refs && npm run validate:skills && npm run validate:kb-licenses && npm run test:orphan-refs
```

**Alphabetical ordering** (prettier-plugin-packagejson contract): `validate:kb-licenses < validate:refs < validate:skills` — placed first in the validate cluster.

## Verification Evidence

- **Baseline (empty tree):** `node tools/validate-kb-licenses.js` exits 0 when `src/domain-kb/` is missing/empty (STORY-10 baseline met).
- **Baseline via npm:** `npm run validate:kb-licenses` exits 0 on empty tree.
- **Negative case:** A `.md` without frontmatter placed under `src/domain-kb/__v/bad.md` causes the validator to exit 1 with a `KB-01 CRITICAL` finding (manual sanity verified, cleaned up).
- **Negative case (HIGH):** A file with `license: GPL-3.0` under `--strict` triggers `KB-06 HIGH` and exits 1.
- **Positive case:** A file with `source: original`, `license: MIT`, `last_reviewed: 2026-04-25`, and an H1 passes cleanly under `--strict`.
- **Lint:** `npx eslint tools/validate-kb-licenses.js --max-warnings=0` passes.
- **Format:** `npx prettier --check tools/validate-kb-licenses.js` and `npx prettier --check package.json` both pass.
- **Zero new deps:** `git diff 86a48f2..HEAD -- package.json` shows no `"^"`-prefixed new dependency lines.

## Decisions Made

1. **`yaml.parse` over hand-rolled parser** — CONTEXT.md §Reusable Assets flagged this explicitly; hand-rolled parser in `validate-skills.js` (lines 67-100) is adequate for simple KV but `yaml.parse` is the canonical KB approach. No new dep cost (`yaml` was already installed).
2. **`globSync` over recursive walk** — KB tree is shallow and simple; `glob` is already in `dependencies` and used at `test/test-e2e-install.js:14`. Simpler, fewer lines than adapting `discoverSkillDirs`.
3. **Release-gate exit contract stricter than `validate-skills.js`** — per PATTERNS.md §8 "Deviation for KB validator": any CRITICAL fails without `--strict`; `--strict` additionally promotes HIGH to failing. Rationale: IP-licensing compliance is non-negotiable; requiring `--strict` to catch un-attributed content would be a footgun.
4. **ANSI escape normalization** — validate-skills.js uses no ANSI colors, so there's no project precedent. Chose `[...]` (uppercase Unicode escape) over `\x1b[...]` to satisfy `unicorn/escape-case` + `unicorn/no-hex-escape` rules without per-line disables.
5. **YAML date coercion handling** — `yaml.parse` returns a `Date` object for unquoted ISO dates (e.g., `last_reviewed: 2026-04-25`). Validator normalises via `.toISOString().slice(0,10)` before applying `DATE_REGEX`, so both quoted strings and unquoted dates pass KB-04 cleanly. This was a latent issue; surfaced during sanity testing with a "good" file.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking] Installed project dependencies in worktree**

- **Found during:** Pre-Task 1 (dependencies check)
- **Issue:** The worktree had no `node_modules/`, so `require('yaml')` and `require('glob')` could not resolve; validator would fail to run and acceptance criteria could not be exercised.
- **Fix:** Ran `npm install --no-audit --no-fund --silent` once in the worktree; confirmed `node_modules/yaml` and `node_modules/glob` present.
- **Files modified:** None committed — the `npm install` regenerated `node_modules/` and made a harmless `package-lock.json` version bump (1.1.0 → 1.2.0 to match `package.json`); the `package-lock.json` change was **reverted** with `git checkout -- package-lock.json` to keep the commit scoped to the plan's stated files-modified contract. `package-lock.json` stays as it was in the base commit.
- **Verification:** `node -e "require('yaml'); require('glob')"` resolves; all subsequent verifications ran cleanly.
- **Committed in:** Not committed (infrastructure bootstrap only).

**2. [Rule 2 — Missing Critical] Added `yaml.parse` date-object normalisation for KB-04**

- **Found during:** Task 1 sanity testing (positive-case "good" file)
- **Issue:** `yaml.parse` coerces unquoted ISO dates (`last_reviewed: 2026-04-25`) to a `Date` object. Naïve `String(fm.last_reviewed).trim()` + `DATE_REGEX.test(...)` would then run against `"Sat Apr 25 2026 00:00:00 GMT+0000 (Coordinated Universal Time)"` and spuriously fail KB-04. This would make the most common case (an author writes an unquoted ISO date) fail the gate, causing adoption friction on Plans 10-04/05.
- **Fix:** Added a `Date`-instance branch in `validateFile` that normalises to `Date.toISOString().slice(0,10)` before applying `DATE_REGEX`. Both quoted (`"2026-04-25"`) and unquoted (`2026-04-25`) forms now pass KB-04.
- **Files modified:** `tools/validate-kb-licenses.js` (see lines 192-211).
- **Verification:** Good-file sanity test passed under `--strict` after the fix.
- **Committed in:** `0eb6666` (Task 1 commit).

**3. [Rule 3 — Blocking] ESLint unicorn rule conformance (escape sequences + args Set)**

- **Found during:** Task 1 lint verification (after initial write)
- **Issue:** Initial file used `\x1b[...]` (hex escape, lowercase) for ANSI codes and `args.includes('--strict')` on an array. ESLint unicorn plugin flagged both: `unicorn/escape-case` + `unicorn/no-hex-escape` (6 ANSI strings) and `unicorn/prefer-set-has` (1 occurrence). The `npm run lint` gate is part of `npm run quality`, so these would block the release gate itself — a bootstrap problem.
- **Fix:** Converted all ANSI escapes to `[...]` (Unicode, uppercase) via a single-pass Python replace to avoid input-escaping tool quirks. Converted `args` to `new Set(process.argv.slice(2))` + `args.has(...)` access pattern.
- **Files modified:** `tools/validate-kb-licenses.js` (colors block + CLI parsing block).
- **Verification:** `npx eslint tools/validate-kb-licenses.js --max-warnings=0` passes; all behavior tests still pass.
- **Committed in:** `0eb6666` (Task 1 commit, included pre-commit).

---

**Total deviations:** 3 auto-fixed (1 blocking bootstrap, 1 missing-critical correctness fix, 1 blocking lint conformance).
**Impact on plan:** All auto-fixes were required for the validator to actually ship through CI. No scope creep: no new rules, no new deps, no changes to plan's files-modified list.

## Issues Encountered

- **`npm install` version bump in package-lock** — `package-lock.json` base state had `version: "1.1.0"` while `package.json` declares `1.2.0`; `npm install` corrected the lockfile. Since this is unrelated to the plan and belongs to a broader release-mechanics concern, the change was reverted and the lockfile stays as-is for this plan.
- **Tool input drops raw ESC bytes** — The `Write`/`Edit` tool input path strips raw `0x1b` bytes from string literals, so attempting to author ANSI codes directly yielded a literal-but-invisible escape character on disk. Worked around by using a Python bytes-replace to emit proper `[...]` JS source sequences deterministically.

## Threat Flags

None — the plan's threat model fully covers the surface introduced. The validator itself introduces no new network endpoints, auth paths, or schema changes. Threats T-10-01-01/02/03/05 are mitigated per the plan's disposition; T-10-01-04 (DoS) is explicitly accepted (KB tree is ~20 files max).

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- **IP-cleanliness gate live for downstream Plans 10-04/05** — any KB markdown authored in those plans will be validated automatically at CI. Plans 10-04/05 should assume the validator is present; no further wiring needed.
- **In-process API ready for Plan 10-06 tests** — `test/test-domain-kb-install.js` can `require('../tools/validate-kb-licenses.js')` and call `validateFile()` directly to assert that installed KB content stays attribution-compliant end-to-end.
- **No blockers.** The plan landed atomically as the phase's load-bearing constraint per `autonomous: true` + wave 1.

## Self-Check: PASSED

- `tools/validate-kb-licenses.js` — **FOUND**
- `.planning/phases/10-story-creation-enhancements/10-01-SUMMARY.md` — **FOUND** (this file)
- Commit `0eb6666` (Task 1) — **FOUND** in `git log`
- Commit `9369ae4` (Task 2) — **FOUND** in `git log`
- `package.json` has `scripts["validate:kb-licenses"]` — **VERIFIED** (`true`)
- `package.json` `scripts.quality` includes `npm run validate:kb-licenses` — **VERIFIED** (`true`)
- Position check (skills < kb-licenses < orphan-refs) — **VERIFIED** (`true`)
- `node tools/validate-kb-licenses.js` exits 0 on empty tree — **VERIFIED**
- `npm run validate:kb-licenses` exits 0 on empty tree — **VERIFIED**
- ESLint + Prettier clean on both modified files — **VERIFIED**

---

_Phase: 10-story-creation-enhancements_
_Plan: 01_
_Completed: 2026-04-24_
