---
phase: 03-credit-branding-docs
plan: 01
subsystem: credit-legal-identity
tags: [legal, credit, branding, phase-3, wave-0]
requires:
  - .planning/phases/02-rename (complete)
provides:
  - canonical-non-affiliation-disclaimer
  - license-byte-identical-preservation
  - phase-3-invariant-checker
  - wave-0-baseline-fixtures
affects:
  - LICENSE
  - TRADEMARK.md
  - CONTRIBUTORS.md
  - CONTRIBUTING.md
  - CHANGELOG.md
  - CNAME
  - .npmignore
tech_stack_added: []
patterns_used:
  - append-only-byte-preservation
  - single-source-of-truth-canonical-disclaimer
  - wave-0-baseline-fixtures
  - invariant-checker-script
key_files_created:
  - test/fixtures/license-bmad-baseline.txt
  - test/fixtures/contributors-bmad-baseline.txt
  - test/validate-phase-03.js
  - .planning/phases/03-credit-branding-docs/03-01-SUMMARY.md
key_files_modified:
  - .planning/REQUIREMENTS.md
  - .planning/ROADMAP.md
  - LICENSE
  - TRADEMARK.md
  - CONTRIBUTORS.md
  - CONTRIBUTING.md
  - CHANGELOG.md
  - CNAME
  - .npmignore
key_files_deleted:
  - SECURITY.md
  - AGENTS.md
  - banner-bmad-method.png
decisions:
  - "Canonical non-affiliation disclaimer authored as a single-source-of-truth string, reused verbatim in LICENSE + TRADEMARK.md (Plan 03-02 MUST reuse verbatim in README + README_CN Credits sections)"
  - "LICENSE composed via append-only pattern (read BMAD block unchanged, concatenate, write) to guarantee byte-identical preservation"
  - "CHANGELOG truncated entirely - no BMAD v6.x entries preserved in-file; lineage preserved via LICENSE + README Credits (when added in Plan 03-02) + v1.1.0 Removed section explicit note"
  - "banner-bmad-method.png deleted without replacement (per D-05); CLI will use ASCII art in Plan 03-02"
  - "SECURITY.md and AGENTS.md deleted outright (per D-24); not replaced with stubs"
metrics:
  duration_seconds: 377
  completed_at: "2026-04-09T02:48:17Z"
  tasks_total: 3
  tasks_completed: 3
  files_created: 4
  files_modified: 9
  files_deleted: 3
---

# Phase 03 Plan 01: Legal + Identity Summary

**One-liner:** Executed the entire Phase 3 legal + identity file inventory in one plan — applied the three requirement-delta relaxations, established Wave 0 byte-preservation baselines, wrote a 21-invariant checker, composed LICENSE with byte-identical BMAD preservation, rewrote TRADEMARK.md with defensive posture, appended to CONTRIBUTORS.md byte-identical, rewrote CONTRIBUTING.md, truncated CHANGELOG to fresh v1.1.0, fixed CNAME, deleted SECURITY.md/AGENTS.md/banner-bmad-method.png, and exported the canonical non-affiliation disclaimer for Plan 03-02 reuse.

## Tasks Completed

| # | Task | Commit | Key outputs |
|---|------|--------|-------------|
| 1 | Apply requirement deltas + Wave 0 baselines + invariant checker | `092b09a` | REQUIREMENTS/ROADMAP deltas, 2 baseline fixtures, `test/validate-phase-03.js` with 21 checks |
| 2 | Compose LICENSE + rewrite TRADEMARK + append CONTRIBUTORS | `66b9f70` | LICENSE byte-preserved + GoMad block, TRADEMARK five-point defensive posture, CONTRIBUTORS preserved + GoMad section |
| 3 | Rewrite CONTRIBUTING + delete SECURITY/AGENTS + CHANGELOG truncate + CNAME + banner delete | `7dfe2aa` | CONTRIBUTING clean rewrite, CHANGELOG fresh v1.1.0, CNAME `gomad.xgent.ai\n`, SECURITY/AGENTS/banner deleted, .npmignore cleaned |

## Canonical Non-Affiliation Disclaimer

**This is the single source of truth. Plan 03-02 MUST reuse this sentence verbatim in both README.md and README_CN.md Credits sections. Do not reword.**

```
xgent-ai is not affiliated with, endorsed by, or sponsored by BMad Code, LLC.
BMad™, BMad Method™, and BMad Core™ remain trademarks of BMad Code, LLC and are
referenced here solely for attribution purposes.
```

Currently embedded verbatim in:

- `LICENSE` (below the horizontal rule, after the GoMad copyright block)
- `TRADEMARK.md` (Section 2, "Non-affiliation")

Plan 03-02 must add it to:

- `README.md` (`## Credits` section)
- `README_CN.md` (`## Credits` section, same English text — disclaimer language is legal boilerplate and does not get translated)

The invariant checker (`test/validate-phase-03.js` check #6) exact-matches this string across all 4 files.

## Requirement Deltas Applied

The three CONTEXT.md requirement-delta relaxations are now reflected in both `.planning/REQUIREMENTS.md` and `.planning/ROADMAP.md`:

1. **CREDIT-02**: Fork statement relegated to `## Credits` footer only (not intro) — per D-04
2. **BRAND-01**: No replacement banner; just delete `banner-bmad-method.png` and regenerate `Wordmark.png` — per D-05
3. **DOCS-05**: `SECURITY.md` and `AGENTS.md` deleted rather than rewritten — per D-24

Invariant #19 in the checker validates all three substring markers and currently passes.

## Phase 3 Invariant State (21 checks)

After Plan 03-01 completion, running `node test/validate-phase-03.js --wave 1`:

| # | Status | Notes |
|---|--------|-------|
| 1 | PASS | LICENSE BMAD block byte-identical |
| 2 | PASS | CONTRIBUTORS.md BMAD block byte-identical |
| 3 | pending-03-02 | `banner-bmad-method` still referenced in README.md line 1 — Plan 03-02 task 1 deletes that line |
| 4 | PASS | No `banner-gomad` references (D-05 holds) |
| 5 | pending-03-02 | No `## Credits` section in README.md / README_CN.md yet |
| 6 | partial | Disclaimer present in LICENSE + TRADEMARK.md; README + README_CN halves pending in Plan 03-02 |
| 7 | SKIPPED | Wave 2 only (Plan 03-02 CLI banner task) |
| 8 | pending-03-02 | `cli-utils.js` still has BMAD strings from upstream — Plan 03-02 rewrites the CLI banner block |
| 9 | PASS | CNAME exactly `gomad.xgent.ai\n` |
| 10 | partial | SECURITY/AGENTS/banner deleted; `website/src/content/i18n/{fr-FR,vi-VN}.json` pending Plan 03-02 |
| 11 | pending-03-02 | `website/src/lib/locales.mjs` still references fr-FR/vi-VN — Plan 03-02 website stub task |
| 12 | SKIPPED | Wave 2 only (astro build after Plan 03-02 website stub) |
| 13 | PASS | CHANGELOG starts fresh at `[1.1.0]` |
| 14 | PASS | `BREAKING CHANGES` subsection present |
| 15 | PASS* | Wordmark.png present; no baseline fixture to compare against yet (regeneration check in Plan 03-02) |
| 16 | PASS | Favicon found (existing BMAD-era file; regeneration in Plan 03-02) |
| 17 | pending-03-02 | `docs/index.md` contains Phase-2-sweep mangled artifact — Plan 03-02 docs landing rewrite |
| 18 | PASS | `docs/mobmad-plan.md` already gone (Phase 2 carryover) |
| 19 | PASS | REQUIREMENTS + ROADMAP deltas applied |
| 20 | SKIPPED | Wave 2 only (Plan 03-02 CLI BMAD-free verification) |
| 21 | PASS | Case-preserving map holds in Plan 03-01 rewrites (CONTRIBUTING.md spot-check clean) |

**Wave 1 score:** 11 PASS / 7 pending-03-02 / 3 SKIPPED (wave 2).

All pending-03-02 items are expected and scheduled for the next plan.

## Pitfall 7 Inbound-Link Sweep

Pre-deletion grep for inbound references to `SECURITY.md` and `AGENTS.md` across `*.md`, `*.mjs`, `*.js`, `*.json`, `*.yaml`, `*.astro` (excluding `.planning/`, `node_modules/`, `.github/`, `test/validate-phase-03.js`):

| Hit | Disposition |
|-----|-------------|
| `docs/zh-cn/how-to/project-context.md:9` mentions `AGENTS.md` as a generic always-rules filename concept | **Leave as-is.** Not an inbound link to our deleted file — it describes `AGENTS.md` as a convention in other projects. |
| `docs/how-to/project-context.md:8` same as above | **Leave as-is.** Same reason. |
| `src/core-skills/gm-distillator/resources/distillate-format-reference.md:198` mentions `AGENTS.md` as a Linux Foundation AAIF standard reference | **Leave as-is.** External standards citation, not an inbound link. |
| `CHANGELOG.md` explicit "Removed: SECURITY.md, AGENTS.md" line | **Intentional.** Documenting the deletion, not linking to it. |
| `.planning/**` references | **Out of scope.** Planning docs are not shipped. |

No inbound links required fixing. Zero follow-up work for Plan 03-02 from this sweep.

## Baseline Fixture Paths (for Plan 03-02 reuse)

Plan 03-02 does not need to re-snapshot. The following fixtures are committed in `092b09a` and the invariant checker reads from them:

- `test/fixtures/license-bmad-baseline.txt` — byte-identical snapshot of BMAD LICENSE at Phase 3 start (used by invariant #1)
- `test/fixtures/contributors-bmad-baseline.txt` — byte-identical snapshot of BMAD CONTRIBUTORS.md at Phase 3 start (used by invariant #2)

If Plan 03-02 wants to add a `Wordmark.png` regeneration check, it can snapshot the current (pre-regeneration) PNG to `test/fixtures/wordmark-bmad-baseline.png` — invariant #15 will then compare against it automatically.

## Deviations from Plan

None - plan executed exactly as written. No deviation rules (1-4) triggered. No architectural decisions required. No authentication gates.

## Handoff Notes for Plan 03-02

Plan 03-02 must close these invariants to reach phase green:

1. **README.md + README_CN.md surgical edit** (closes #3, #5, #6, #8-partial via downstream):
   - Delete line 1 `![BMad Method](banner-bmad-method.png)` in both files
   - Add `## Credits` footer section with fork statement + upstream link + the canonical disclaimer reused verbatim from this summary
   - Ensure exactly one `## Credits` heading per file
2. **CLI banner rewrite** (closes #7, #8, #20):
   - Remove all BMAD ASCII art / taglines from `tools/installer/cli-utils.js`
   - Install a `GoMad` ASCII banner with chalk color, degrade on NO_COLOR
3. **Wordmark.png regeneration** (closes #15 manually):
   - Regenerate with GoMad typography
4. **Website stub + i18n delete** (closes #10, #11, #12):
   - Delete `website/src/content/i18n/{fr-FR,vi-VN}.json`
   - Edit `website/src/lib/locales.mjs` to drop those locales
   - Stub `website/src/pages/*` with the "under construction" one-pager
   - Ensure `npm run build:website` (astro build) exits 0
5. **docs landing rewrites** (closes #17):
   - Rewrite `docs/index.md` and `docs/zh-cn/index.md` in GoMad voice
   - Spot-check sweep the 62 inner pages for BMAD-specific marketing survivors

After Plan 03-02 lands, `node test/validate-phase-03.js` (no `--wave` flag) should exit 0 with 21 PASS.

## Self-Check: PASSED

- [x] Files created exist on disk:
  - `test/fixtures/license-bmad-baseline.txt` — FOUND
  - `test/fixtures/contributors-bmad-baseline.txt` — FOUND
  - `test/validate-phase-03.js` — FOUND
  - `.planning/phases/03-credit-branding-docs/03-01-SUMMARY.md` — FOUND (this file)
- [x] Commits exist in git history:
  - `092b09a` — Task 1
  - `66b9f70` — Task 2
  - `7dfe2aa` — Task 3
- [x] Deleted files actually gone: `SECURITY.md`, `AGENTS.md`, `banner-bmad-method.png`
- [x] Invariant checker runs and reports 11 PASS / 7 pending / 3 SKIPPED as expected
