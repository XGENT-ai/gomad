---
phase: 02-rename
plan: 02
subsystem: rename
tags: [rename, text-sweep, idempotent, gates]
requires:
  - "Phase 2-01 filesystem rename (src/gomad-skills, gm-* dirs, gomad-cli.js)"
  - "glob package from existing repo deps"
provides:
  - "tools/dev/rename-sweep.js — idempotent content-sweep script"
  - "test/test-rename-sweep.js — 20-case unit suite for applyMappings"
  - "Zero residual bmad/BMAD/bmm references across src/ tools/ test/ docs/ website/"
  - "gm-* reconciled skill IDs in module-help.csv (core + gomad)"
  - "GoMad-scoped roadmap placeholder replacing the inherited upstream roadmap"
affects:
  - "253 files across the repo (mechanical sweep pass)"
  - "src/core-skills/module-help.csv and src/gomad-skills/module-help.csv (manual gm-* reconciliation)"
  - "6 docs pages renamed (install/customize/get-answers — EN + zh-cn)"
  - "docs/roadmap.mdx and docs/zh-cn/roadmap.mdx (content rewrite)"
  - "website/src/styles/custom.css (header comment only)"
tech-stack:
  added: []
  patterns:
    - "pure applyMappings() export so the regex engine is directly unit-testable"
    - "IGNORE_GLOBS entry for the sweep script + its own test to prevent self-corruption"
key-files:
  created:
    - "tools/dev/rename-sweep.js"
    - "test/test-rename-sweep.js"
  modified:
    - "src/core-skills/module.yaml (code: gomad-core-equivalent metadata via sweep)"
    - "src/gomad-skills/module.yaml (code: gomad via sweep)"
    - "src/core-skills/module-help.csv (gm-* reconciliation)"
    - "src/gomad-skills/module-help.csv (gm-* reconciliation)"
    - "docs/roadmap.mdx (rewrite — upstream promotional content removed)"
    - "docs/zh-cn/roadmap.mdx (rewrite — 中文 版本 同 步)"
    - "website/src/styles/custom.css (header comment)"
    - "tools/installer/core/installer.js (gomadConfigPath identifier rewrite)"
    - "tools/installer/modules/official-modules.js (gomadPath/gomadInfo identifier rewrite)"
    - "tools/installer/ide/shared/agent-command-generator.js (gomad_gomad_ namespace)"
    - "tools/installer/ide/templates/combined/gemini-*.toml (BMAD -> GOMAD template bodies)"
    - "src/core-skills/gm-distillator/scripts/analyze_sources.py (_gomad-output path)"
    - "tools/validate-svg-changes.sh (default SVG path)"
    - "Plus ~240 other markdown/yaml/json/js files swept mechanically"
  renamed:
    - "docs/how-to/install-bmad.md -> install-gomad.md"
    - "docs/how-to/customize-bmad.md -> customize-gomad.md"
    - "docs/how-to/get-answers-about-bmad.md -> get-answers-about-gomad.md"
    - "docs/zh-cn/how-to/install-bmad.md -> install-gomad.md"
    - "docs/zh-cn/how-to/customize-bmad.md -> customize-gomad.md"
    - "docs/zh-cn/how-to/get-answers-about-bmad.md -> get-answers-about-gomad.md"
decisions:
  - "Extended TARGET_GLOB with mdx, toml, py, sh, css — plan's glob list omitted five extensions that produced residual hits; Rule 3 (blocking) fix"
  - "Added a camelCase bmm rule (bmm before uppercase letter) so bmmPath / bmmConfigPath / bmmInfo rewrite cleanly; not in plan but required to hit zero"
  - "Bmm word-anchor uses [A-Za-z0-9] only (no underscore) per the plan's <behavior> spec, overriding the plan's <action> snippet that included underscore — required for bmad_bmm_pm IDE identifiers"
  - "docs/roadmap.mdx + zh-cn counterpart rewritten from scratch rather than mechanically swept — inherited promotional content referenced upstream-only products and required editorial judgment"
  - "6 docs filenames with bmad in the stem were renamed as a Rule 3 blocker (doc-link validator fails otherwise) — Phase 2-01 summary flagged docs/ as out of scope for FS renames, but leaving these names breaks the plan-level gate"
metrics:
  duration_minutes: ~35
  tasks_completed: 2
  commits: 3
  files_touched_by_sweep: 253
  files_manually_reconciled: 5
  files_renamed: 6
  unit_tests: 20
completed_date: "2026-04-08"
---

# Phase 02 Plan 02: Text-level Rename Sweep Summary

Idempotent content-sweep script plus its application across the repo, turning every textual bmad / BMAD / BMad / bmad-method / bmm reference into its gomad equivalent across source, configs, tests, docs, and website content — excluding the Phase 3-owned files (LICENSE, CHANGELOG.md, TRADEMARK.md, CONTRIBUTORS.md, README.md, README_CN.md). Covers TXT-01 (text substitution), TXT-02 (skill ID references), TXT-03 (module.yaml metadata).

## What Shipped

### The sweep script (`tools/dev/rename-sweep.js`)

CommonJS script with:

- Hard-coded D-06 `EXCLUDE_FILES` set covering the six Phase 3-owned files plus three attribution-URL surfaces (`docs/roadmap.mdx`, `docs/zh-cn/roadmap.mdx`, `website/src/styles/custom.css`).
- `IGNORE_GLOBS` entry for the sweep script itself and its unit test so neither self-corrupts mid-run.
- Seven ordered mappings (longest-first, plus a camelCase-head rule for `bmm`).
- `--dry-run` flag for preview-without-write.
- Pure exported `applyMappings()` so the regex engine is directly unit-testable.
- Summary output with per-mapping replacement counts, files scanned, files touched, files skipped by exclude list.

### Mapping order (D-05)

| # | Pattern | Replacement |
|---|---------|-------------|
| 1 | `BMAD Method` | `GoMad` |
| 2 | `bmad-method` | `gomad` |
| 3 | `BMad` | `GoMad` |
| 4 | `BMAD` | `GOMAD` |
| 5 | `bmad` | `gomad` |
| 6 | `bmm` (word-anchored, `(?<![A-Za-z0-9])bmm(?![A-Za-z0-9])`) | `gomad` |
| 7 | `bmm` (camelCase head, `(?<![A-Za-z0-9])bmm(?=[A-Z])`) | `gomad` |

### Sweep run summary output (final, idempotent pass)

```
rename-sweep (APPLIED)
Files scanned: 425
Files touched: 0
Files skipped (exclude list): 8
Replacements by mapping:
  BMAD Method→GoMad: 0
  bmad-method→gomad: 0
  BMad→GoMad: 0
  BMAD→GOMAD: 0
  bmad→gomad: 0
  bmm→gomad (word-anchored): 0
  bmm→gomad (camelCase head): 0
```

### Cumulative replacement counts across the two apply passes (Task 2)

| Mapping | Count |
|---------|-------|
| BMAD Method→GoMad | 17 |
| bmad-method→gomad | 98 |
| BMad→GoMad | 369 |
| BMAD→GOMAD | 347 |
| bmad→gomad | 1758 |
| bmm→gomad (word-anchored) | 217 |
| bmm→gomad (camelCase head) | 12 |
| **Total** | **2818** |

### Final zero-hit grep output

```
$ grep -rn 'bmad\|BMAD\|bmm' src/ tools/ test/ docs/ website/ 2>/dev/null \
    | grep -v '^tools/dev/rename-sweep.js:' \
    | grep -v '^test/test-rename-sweep.js:' \
    | wc -l
0
```

The two remaining files that match the grep (`tools/dev/rename-sweep.js` itself and `test/test-rename-sweep.js`) legitimately contain the literal patterns in their regex sources and test fixtures, and are both in the sweep's `IGNORE_GLOBS`.

## Commits

| Task | Subject | SHA |
|------|---------|-----|
| 1 | feat(02-02): add tools/dev/rename-sweep.js idempotent content-sweep script (D-05) | `95d4ee9` |
| 2A | refactor(02-02): apply rename-sweep to src, tools, test, docs, website (TXT-01) | `c8701e4` |
| 2B | refactor(02-02): reconcile module-help.csv IDs and rewrite inherited attribution pages (TXT-02/TXT-03) | `42bb699` |

## Plan-level gate state (D-17 after 02-02)

| Gate | Result |
|------|--------|
| `node tools/dev/rename-sweep.js` second-run idempotency | PASSED — `Files touched: 0` |
| `npm run lint` | PASSED (exit 0) |
| Zero-hit grep across `src/ tools/ test/ docs/ website/` | PASSED (0 hits outside self-references) |
| `git status` on LICENSE/CHANGELOG/TRADEMARK/CONTRIBUTORS/README/README_CN | PASSED (clean, untouched) |
| `npm run validate:skills` | PASSED (2 LOW findings, both pre-existing from Phase 1) |
| `node test/test-installation-components.js` | PASSED (204/204) |
| `node test/test-rename-sweep.js` | PASSED (20/20) |
| `node tools/validate-doc-links.js` | PASSED (0 issues) |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking] TARGET_GLOB missed five text extensions**

- **Found during:** Task 2, Part A verification
- **Issue:** The plan's glob list `{md,yaml,yml,json,js,mjs,cjs,ts,astro,html,csv}` omitted `mdx`, `toml`, `py`, `sh`, and `css`. Residual `bmad`/`BMAD`/`bmm` hits survived in `docs/roadmap.mdx`, `website/src/styles/custom.css`, `tools/installer/ide/templates/combined/gemini-*.toml`, `src/core-skills/gm-distillator/scripts/analyze_sources.py`, and `tools/validate-svg-changes.sh`. Without extending the glob the D-17 zero-hit gate cannot pass.
- **Fix:** Added the five missing extensions to `TARGET_GLOB`.
- **Files modified:** `tools/dev/rename-sweep.js`
- **Commit:** `c8701e4`

**2. [Rule 3 — Blocking] camelCase `bmm` identifiers survived the word-anchored rule**

- **Found during:** Task 2, Part A verification
- **Issue:** JavaScript identifiers `bmmPath`, `bmmConfigPath`, `bmmInfo` in `tools/installer/core/installer.js` and `tools/installer/modules/official-modules.js` did not match the plan's word-anchored `(?<![A-Za-z0-9])bmm(?![A-Za-z0-9])` rule because the following character (`P`, `C`, `I`) is alphanumeric. They survived the sweep and blocked the zero-hit gate.
- **Fix:** Added a seventh mapping — `(?<![A-Za-z0-9])bmm(?=[A-Z])` → `gomad` — which matches `bmm` at identifier start immediately before a capital letter. Covered by two new unit tests (camelCase head matches, `someBmmPath` does not).
- **Files modified:** `tools/dev/rename-sweep.js`, `test/test-rename-sweep.js`, and the two installer files through sweep re-run.
- **Commit:** `c8701e4`

**3. [Rule 1 — Bug] Underscore in the plan's bmm lookaround contradicted the behavior spec**

- **Found during:** Task 1 TDD test design
- **Issue:** The plan's `<action>` block showed `(?<![A-Za-z0-9_])bmm(?![A-Za-z0-9_])` (underscore in the negation). The plan's `<behavior>` block said "non-alphanumeric characters" and the D-17 gate demands zero residual `bmm`. Internal slash-command namespace identifiers like `bmad_bmm_pm` (from `tools/installer/ide/shared/agent-command-generator.js`) contain `bmm` flanked by underscores. With underscore in the negation set, `_bmm_` would not match and `bmad_bmm_pm` → `gomad_bmm_pm` would leave residual `bmm`.
- **Fix:** Dropped underscore from the lookaround so the regex is `(?<![A-Za-z0-9])bmm(?![A-Za-z0-9])`. After two passes (`bmad_bmm_pm` → `gomad_bmm_pm` by the `bmad` rule, then `gomad_bmm_pm` → `gomad_gomad_pm` by the bmm rule), the result is clean. Following the `<behavior>` spec over the `<action>` snippet.
- **Files modified:** `tools/dev/rename-sweep.js`
- **Commit:** `95d4ee9` (original) and `c8701e4` (kept in the final version)

**4. [Rule 2 — Critical content] docs/roadmap.mdx was inherited upstream promotional content**

- **Found during:** Task 2, Part A verification
- **Issue:** The EN and zh-cn `roadmap.mdx` pages were lists of upstream-only products (Builder v1, Team Pros Blog, Podcast, Master Class, Prototype First, BALM, BMad in a Box, Official UI) plus a "Want to Contribute" block with real BMAD upstream URLs (`github.com/bmad-code-org/BMAD-METHOD`, `buymeacoffee.com/bmad`, `contact@bmadcode.com`). Mechanically sweeping these would produce broken URLs like `github.com/gomad-code-org/GOMAD-METHOD` and falsely claim GoMad had products it does not ship.
- **Fix:** Added both files to `EXCLUDE_FILES`, then rewrote them from scratch with a concise GoMad-scoped placeholder roadmap (Milestone 1 = rename/slim down/credit/branding, Milestone 2+ = GoMad-specific agents and skills). Attribution to the upstream project lives in LICENSE, README, and TRADEMARK (Phase 3 scope), not on the docs roadmap page. The `index.md` and `zh-cn/index.md` links to `/roadmap/` still resolve.
- **Files modified:** `docs/roadmap.mdx`, `docs/zh-cn/roadmap.mdx`, `tools/dev/rename-sweep.js` (exclude list)
- **Commit:** `42bb699`

**5. [Rule 2 — Critical content] website/src/styles/custom.css header comment referenced bmadcode.com**

- **Found during:** Task 2, Part A verification
- **Issue:** CSS file header comment said `* BMAD Method Documentation - Custom Styles for Starlight` and `* Dark theme matching bmadcode.com Ghost blog`. Sweep would rewrite to "GOMAD Method Documentation" and "gomadcode.com", creating a false domain reference. Rest of the file is pure style rules.
- **Fix:** Added to `EXCLUDE_FILES` and hand-edited the header comment to "GoMad Documentation - Custom Styles for Starlight / Dark theme adapted from the upstream Ghost-blog-matching palette". Style rules unchanged.
- **Files modified:** `website/src/styles/custom.css`, `tools/dev/rename-sweep.js`
- **Commit:** `42bb699`

**6. [Rule 3 — Blocking] Six docs pages had `bmad` in their filenames**

- **Found during:** Task 2, Part A pre-commit hook (validate-doc-links)
- **Issue:** `docs/how-to/install-bmad.md`, `customize-bmad.md`, `get-answers-about-bmad.md` (and their `zh-cn/` counterparts) still carried `bmad` in their filenames. The sweep rewrote link targets from `install-bmad.md` to `install-gomad.md` in pages referencing them, but the actual files had not been renamed. The pre-commit `validate-doc-links` hook flagged 8 broken links and blocked commit 2A.
- **Fix:** `git mv` all six files to the `-gomad.md` suffix. Links resolve. Phase 2-01 summary's scope note said "docs/ out of scope for Phase 1", but leaving these names means either the sweep-updated links break or the file contents still say `bmad`. Neither is acceptable for the plan-level gate.
- **Files modified (renames):** 6 docs files under `docs/how-to/` and `docs/zh-cn/how-to/`.
- **Commit:** `c8701e4`

**7. [Rule 1 — Bug] module-help.csv sweep produced `gomad-*` IDs, not `gm-*`**

- **Found during:** Task 2, Part B verification
- **Issue:** The sweep rewrote `bmad-<skill>` to `gomad-<skill>` throughout `module-help.csv` in both trees, but the actual directories on disk (per Phase 2-01) use the `gm-` short prefix. The CSVs referenced non-existent skill IDs after the sweep.
- **Fix:** Targeted node one-liner that rewrote only field-boundary `gomad-<skill>` occurrences (after comma, colon, quote, or line-start) to `gm-<skill>`. Spot-checked against `find src -maxdepth 3 -type d -name 'gm-*'` — all 30 gomad-skills rows and 10 core-skills rows now reference real directories.
- **Files modified:** `src/core-skills/module-help.csv`, `src/gomad-skills/module-help.csv`
- **Commit:** `42bb699`

### Architectural changes

None — all deviations were inline blocking/correctness fixes. No trust-boundary changes, no new dependencies, no schema changes.

## Known Stubs

None. The sweep script, its tests, and the swept files are all wired. Roadmap pages are placeholders by design (Milestone 1 scope boundary), not stubs.

## Threat Model Notes

All five STRIDE threats from the plan's `<threat_model>` block are mitigated as specified:

- **T-02-06 (LICENSE/TRADEMARK/CHANGELOG tampering):** `EXCLUDE_FILES` set prevents any sweep of the six Phase 3-owned files. `git status` verification on the set is clean after every sweep run.
- **T-02-07 (unrelated identifier corruption by `bmm` trigram):** Word-anchored lookarounds. `xbmmx`, `bmm3`, and `someBmmPath` all survive unchanged per unit tests.
- **T-02-08 (broken installer due to stale skill IDs):** Module-help.csv reconciliation + Plan 03's `validate:refs` + `validate:skills` regression checks. Installation components test suite still reports 204/204.
- **T-02-09 (shell injection):** Script uses pure `fs.readFile` / `fs.writeFile`. No `child_process`, no shell out.
- **T-02-10 (residual BMAD wordmark disclosure):** D-17 zero-hit grep gate across `src/ tools/ test/ docs/ website/` is clean outside the sweep script's self-references.

## Scope Boundary Notes

- **In scope and done:** Every text extension the sweep now touches, the three attribution surfaces rewritten by hand, the six docs filename renames that unblocked the link validator, the module-help.csv gm-* reconciliation.
- **Out of scope and left alone:** LICENSE, CHANGELOG.md, TRADEMARK.md, CONTRIBUTORS.md, README.md, README_CN.md — all owned by Phase 3.
- **Out of scope and left alone:** `.planning/` directory, `node_modules/`, `.git/`, `build/` — all in `IGNORE_GLOBS`.
- **Deferred:** PROJECT.md Active requirements for `docs/cs/`, `docs/fr/`, `docs/vi-vn/` deletion — still present because the plan does not call for them. Safe to leave (contents are already swept mechanically wherever they contain bmad references).

## Self-Check: PASSED

- `tools/dev/rename-sweep.js` exists and contains `EXCLUDE_FILES`, `MAPPINGS`, `applyMappings`.
- `test/test-rename-sweep.js` exists; 20/20 tests pass.
- Commits `95d4ee9`, `c8701e4`, `42bb699` all present in `git log`.
- `node tools/dev/rename-sweep.js` reports `Files touched: 0` (idempotent).
- `npm run lint` exits 0.
- Zero-hit grep outside sweep-script self-references.
- LICENSE, CHANGELOG.md, TRADEMARK.md, CONTRIBUTORS.md, README.md, README_CN.md all untouched.
- `node test/test-installation-components.js`: 204/204 pass.
- `node tools/validate-doc-links.js`: 0 issues.
- `src/core-skills/module-help.csv` and `src/gomad-skills/module-help.csv` reference only `gm-*` IDs that map to real directories on disk.
