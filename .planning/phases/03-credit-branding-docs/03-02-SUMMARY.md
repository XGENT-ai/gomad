---
phase: 03-credit-branding-docs
plan: 02
subsystem: surface-and-assets
tags: [readme, cli-banner, branding, website, docs, phase-3, wave-2]
requires:
  - 03-01 (Legal + Identity — canonical disclaimer, LICENSE, invariant checker)
provides:
  - gomad-surface-readme-en-cn
  - gomad-cli-banner-ascii
  - gomad-wordmark-favicon-regen-script
  - website-under-construction-stub
  - docs-landing-gomad-voice
  - phase-3-invariant-checker-fix
affects:
  - README.md
  - README_CN.md
  - tools/installer/cli-utils.js
  - tools/installer/gomad-cli.js
  - tools/dev/regenerate-wordmark.js
  - Wordmark.png
  - website/public/favicon.png
  - website/astro.config.mjs
  - website/src/lib/locales.mjs
  - website/src/pages/index.astro
  - docs/index.md
  - docs/zh-cn/index.md
  - docs/_STYLE_GUIDE.md
  - docs/zh-cn/_STYLE_GUIDE.md
  - docs/explanation/established-projects-faq.md
  - docs/how-to/get-answers-about-gomad.md
  - docs/tutorials/getting-started.md
  - docs/zh-cn/explanation/established-projects-faq.md
  - docs/zh-cn/how-to/get-answers-about-gomad.md
  - docs/zh-cn/tutorials/getting-started.md
  - test/validate-phase-03.js
tech_stack_added: []
patterns_used:
  - surgical-rewrite-from-scratch
  - verbatim-canonical-disclaimer-reuse
  - committed-reproducibility-script
  - atomic-multi-file-lockstep-edit
  - inner-page-spot-check-sweep
key_files_created:
  - tools/dev/regenerate-wordmark.js
  - website/public/favicon.png
  - website/src/pages/index.astro
  - .planning/phases/03-credit-branding-docs/03-02-SUMMARY.md
key_files_modified:
  - README.md
  - README_CN.md
  - tools/installer/cli-utils.js
  - tools/installer/gomad-cli.js
  - Wordmark.png
  - website/astro.config.mjs
  - website/src/lib/locales.mjs
  - docs/index.md
  - docs/zh-cn/index.md
  - docs/_STYLE_GUIDE.md
  - docs/zh-cn/_STYLE_GUIDE.md
  - docs/explanation/established-projects-faq.md
  - docs/how-to/get-answers-about-gomad.md
  - docs/tutorials/getting-started.md
  - docs/zh-cn/explanation/established-projects-faq.md
  - docs/zh-cn/how-to/get-answers-about-gomad.md
  - docs/zh-cn/tutorials/getting-started.md
  - test/validate-phase-03.js
key_files_deleted:
  - website/src/content/i18n/fr-FR.json
  - website/src/content/i18n/vi-VN.json
decisions:
  - "Reused the canonical non-affiliation disclaimer from Plan 03-01 verbatim in README.md + README_CN.md Credits sections (no paraphrase, no retranslation — English legal text + Chinese parenthetical aid in CN)"
  - "CLI banner rendered via hand-authored 5-line ASCII art in cli-utils.js (no figlet dep per D-07); color.cyan line colors; NO_COLOR/TTY degradation via prompts.getColor() picocolors wrapper"
  - "Commander --version string customized to 'GoMad v<version>' so invariant #7 'GoMad in --version' passes without adding a pre-command banner render (keeps D-08 intact)"
  - "Regenerated Wordmark.png and created website/public/favicon.png via committed sharp script at tools/dev/regenerate-wordmark.js (not run at install/publish — reproducibility only)"
  - "Dropped fr-FR, vi-VN, AND cs-CZ from locales.mjs (plan only required fr-FR + vi-VN but cs-CZ had no JSON file shipped upstream; leaving it dangling would break the Astro build)"
  - "Dropped the GoMad Ecosystem sidebar section from astro.config.mjs — all its links pointed to dead gomad-builder-docs.gomad.org / cis-docs.gomad.org / game-dev-studio-docs.gomad.org domains (Phase 2 rename artifacts with no real target)"
  - "Removed discord.gg/gk8jAdXWmj references from 6 inner docs pages during spot-check sweep (D-13); replaced Discord-as-support-channel with xgent-ai/gomad GitHub Issues links"
  - "Fixed invariant checker #12 [Rule 1 - Bug]: original 'cd website && npm run build' could never work (website has no package.json); replaced with 'npm run docs:build' which wraps astro build with the correct --root flag"
metrics:
  duration_seconds: 567
  completed_at: "2026-04-09T03:01:15Z"
  tasks_total: 3
  tasks_completed: 3
  files_created: 4
  files_modified: 18
  files_deleted: 2
---

# Phase 03 Plan 02: Surface + Assets Summary

**One-liner:** Closed the entire user-visible "Surface + Assets" column of Phase 3 — surgically rewrote README.md + README_CN.md with verbatim canonical disclaimer Credits footer, replaced the BMAD CLI ASCII banner + "Build More, Architect Dreams" tagline with hand-authored GoMad ASCII art, regenerated Wordmark.png and created favicon.png via a committed sharp reproducibility script, stubbed the Astro website as an under-construction one-pager while deleting orphaned fr-FR/vi-VN i18n JSON in lockstep with locales.mjs, rewrote docs/index.md + docs/zh-cn/index.md landing pages from scratch in GoMad voice, updated both STYLE_GUIDE.md files, and ran the D-13 inner-page spot-check sweep that cleared Discord + dead-URL survivors from 6 docs pages. All 21 Phase 3 invariants now PASS.

## Tasks Completed

| # | Task | Commit | Key outputs |
|---|------|--------|-------------|
| 1 | README.md + README_CN.md surgical edit with Credits footer | `b6403a0` | EN + CN README reduced to factual GoMad intro + What GoMad is + Install + Docs + Contributing + License + Credits; canonical disclaimer verbatim; 6 matching H2 headings per file; zero BMAD marketing prose |
| 2 | CLI banner replacement + Wordmark/favicon regeneration | `137b03d` | cli-utils.js displayLogo() rewritten with GoMad ASCII art; gomad-cli.js version string customized; tools/dev/regenerate-wordmark.js committed; Wordmark.png regenerated in place; website/public/favicon.png created |
| 3 | Website stub + i18n lockstep + docs landing rewrites + sweep | `fd680c6` | index.astro stub, fr-FR/vi-VN JSON deleted, locales.mjs cleaned, astro.config.mjs favicon + GitHub + sidebar fixes, docs/index.md + docs/zh-cn/index.md rewritten, both STYLE_GUIDE.md files updated, 6 inner pages de-Discord'd, invariant checker #12 fixed |

## Phase 3 Invariant State (21 of 21 PASS)

Final `node test/validate-phase-03.js` output after Plan 03-02:

| # | Status | Description |
|---|--------|-------------|
| 1 | PASS | LICENSE BMAD block byte-identical |
| 2 | PASS | CONTRIBUTORS.md BMAD block byte-identical |
| 3 | PASS | No banner-bmad-method references |
| 4 | PASS | No banner-gomad references |
| 5 | PASS | README fork statement confined to Credits section |
| 6 | PASS | Canonical disclaimer present in all 4 files (LICENSE, TRADEMARK.md, README.md, README_CN.md) |
| 7 | PASS | CLI --version contains GoMad |
| 8 | PASS | cli-utils.js BMAD-free (no Build More / Architect Dreams / BMAD / ██ blocks) |
| 9 | PASS | CNAME == `gomad.xgent.ai\n` |
| 10 | PASS | Deleted files confirmed gone (SECURITY.md, AGENTS.md, banner-bmad-method.png, fr-FR.json, vi-VN.json) |
| 11 | PASS | locales.mjs clean (no fr-FR / vi-VN) |
| 12 | PASS | Astro build OK (via `npm run docs:build` wrapper) |
| 13 | PASS | CHANGELOG starts fresh at 1.1.0 |
| 14 | PASS | BREAKING CHANGES subsection present |
| 15 | PASS | Wordmark.png present |
| 16 | PASS | Favicon found at website/public/favicon.png |
| 17 | PASS | docs landing pages rewritten cleanly |
| 18 | PASS | docs/mobmad-plan.md gone |
| 19 | PASS | Requirement deltas applied |
| 20 | PASS | CLI --version BMAD-free |
| 21 | PASS | Case map applied to Phase 3 rewrites |

**Final score:** 21 PASS / 0 FAIL / 0 SKIP.

## CLI Banner Invocation Site (Task 2 verification)

`grep -rn displayLogo tools/installer/` returns exactly two hits:

- `tools/installer/ui.js:31` — `await CLIUtils.displayLogo();` (call site)
- `tools/installer/cli-utils.js:21` — `async displayLogo()` (definition)

The call chain is `commands/install.js -> ui.js -> CLIUtils.displayLogo()`. `gomad-cli.js` does NOT call `displayLogo()` at any point — the Commander entry point only prints version/help text. This satisfies D-08: no banner appears during `--version`, `--help`, or any non-install command.

`node tools/installer/gomad-cli.js --version` output: `GoMad v1.1.0` (both with and without NO_COLOR=1).

## Wordmark / Favicon Regeneration

`tools/dev/regenerate-wordmark.js` was executed once. sharp 0.33.5 rendered both SVG strings cleanly — no fallback was needed. Both resulting PNG files verified as valid PNG via sharp metadata probe:

- `Wordmark.png` — 500x75, teal `#0b7285` text, regenerated in place (same filename, new bytes; `.npmignore` line 30 still excludes it from the tarball unchanged)
- `website/public/favicon.png` — 64x64, teal background with white "G" glyph, new file

## Docs Inner-Page Spot-Check Sweep (D-13, D-16)

Grep battery used:

```
grep -rln -E 'gomad\.org|gomad-method\.org|gomad-builder-docs|Build More|Architect Dreams|discord\.gg|bmadcode\.com|buymeacoffee\.com/bmad|contact@bmadcode|BMad Method Module Ecosystem|BMM phases|\(\*\*B\*\*uild \*\*M\*\*ore' docs/
```

Pre-fix: 6 files with hits. Each hit was a Discord link and/or a `gomad-code-org/GOMAD-METHOD` (Phase 2 rename artifact) URL. All six were edited with surgical line-level replacements — no deep content rewrites (D-16).

| File | Edit |
|------|------|
| `docs/explanation/established-projects-faq.md:50` | Replaced Discord link + gomad-code-org URL with single `xgent-ai/gomad/issues` link |
| `docs/how-to/get-answers-about-gomad.md:54` | Deleted Discord line; updated GitHub Issues link to `xgent-ai/gomad/issues` |
| `docs/tutorials/getting-started.md:265` | Replaced "Community — Discord" bullet with "Issues & discussion — xgent-ai/gomad/issues" |
| `docs/zh-cn/explanation/established-projects-faq.md:56` | Removed Discord half of "Issues or Discord" sentence; updated URL |
| `docs/zh-cn/how-to/get-answers-about-gomad.md:109` | Deleted Discord line; updated GitHub Issues link |
| `docs/zh-cn/tutorials/getting-started.md:264` | Replaced "社区 — Discord" bullet with "Issues 与讨论 — xgent-ai/gomad/issues" |

Post-fix grep: zero hits. Sweep complete.

## Deviations from Plan

### [Rule 1 - Bug] Invariant checker #12 command fix

**Found during:** Task 3 Step 8 (full invariant run)
**Issue:** `test/validate-phase-03.js` invariant #12 ran `cd website && npm run build` to verify the Astro build. That command can never succeed because `website/package.json` does not exist in this repo — npm scripts live in the top-level `package.json` and the wrapper `npm run docs:build` handles the `astro build --root website` invocation. The old command was a Phase 3 Plan 01 assumption about a conventional project layout that GoMad's inherited BMAD structure does not match.
**Fix:** Replaced the command with `npm run docs:build` (which is what actually produces a working Astro build) and added a comment explaining why. Verified manually and via the invariant checker: PASS.
**Files modified:** `test/validate-phase-03.js`
**Commit:** `fd680c6`

### [Rule 3 - Blocking] locales.mjs cs-CZ dangling entry

**Found during:** Task 3 Step 1 (website lockstep edit)
**Issue:** Plan specified deleting fr-FR and vi-VN from `locales.mjs`. Reading the file revealed a fifth entry `cs: { label: 'Čeština', lang: 'cs-CZ' }` that also had no corresponding JSON in `website/src/content/i18n/` — shipping it would leave Astro/Starlight referencing a locale with no content.
**Fix:** Dropped `cs-CZ` from `locales.mjs` in the same edit. Also dropped `cs-CZ` (and `fr-FR`, `vi-VN`) from the sidebar `translations` maps in `astro.config.mjs`. Build passes.
**Files modified:** `website/src/lib/locales.mjs`, `website/astro.config.mjs`
**Commit:** `fd680c6`

### [Rule 1 - Bug] Dead GoMad Ecosystem sidebar links

**Found during:** Task 3 Step 1 reading `astro.config.mjs`
**Issue:** The sidebar contained a "GoMad Ecosystem" section with four external links: `gomad-builder-docs.gomad.org`, `cis-docs.gomad.org`, `game-dev-studio-docs.gomad.org`, and `gomad-code-org.github.io/gomad-test-architecture-enterprise/`. All four domains are Phase 2 rename artifacts — they do not resolve. Shipping them in the sidebar would be a domain-takeover risk (T-03-02-04 threat register entry).
**Fix:** Deleted the entire "GoMad Ecosystem" sidebar block. Ecosystem modules will be added to the sidebar in a later phase when they actually have published docs.
**Files modified:** `website/astro.config.mjs`
**Commit:** `fd680c6`

### [Rule 1 - Bug] docs/index.md link validator — directory links

**Found during:** Task 3 Step 8 running `npm run docs:build`
**Issue:** Initial landing page rewrite used bare directory links like `[Tutorials](./tutorials/)`. The project's link validator (`tools/fix-doc-links.js`) flags these as broken because it resolves to a file, not a directory index.
**Fix:** Changed the four Diataxis links in both `docs/index.md` and `docs/zh-cn/index.md` to point at concrete files (`./tutorials/getting-started.md`, `./how-to/install-gomad.md`, etc.). Also changed the Credits pointer from `[CREDITS](../README.md#credits)` / `[Credits](../../README.md#credits)` (same validator flags anchor-only links in README targets) to plain prose pointing readers at the repo README.
**Files modified:** `docs/index.md`, `docs/zh-cn/index.md`
**Commit:** `fd680c6`

All four deviations fall under auto-fix rules (1 and 3). No architectural decisions were needed.

## Authentication Gates

None. All operations were fully automated; no external auth or manual steps required.

## Astro Build + CLI Version Verification

**Astro build:** `npm run docs:build` exits 0. 61 pages built in 3.55s via Pagefind index + Sitemap. Favicon.png present in build output. Final deployable output at `build/site/`.

**CLI --version:** `node tools/installer/gomad-cli.js --version` prints `GoMad v1.1.0`. `NO_COLOR=1 node tools/installer/gomad-cli.js --version` prints the same. Zero BMAD references in either.

**Markdown lint:** `npm run lint:md` reports 13 pre-existing errors, all in `.planning/` files (02-VERIFICATION.md, 03-01-PLAN.md, 03-02-PLAN.md, 03-CONTEXT.md, 03-RESEARCH.md). None are in README.md, README_CN.md, docs/index.md, docs/zh-cn/index.md, or the STYLE_GUIDE files touched in this plan. These planning-doc violations were present before Plan 03-02 started and are out of scope (scope boundary rule).

## Phase 3 Close-Out Readiness Checklist

Phase 4's phase-gate validator (to be built in Phase 4) will verify:

- [x] All Phase 3 requirements (CREDIT-01..04 with CREDIT-02 delta, BRAND-01..02 with BRAND-01 delta, DOCS-01..07 with DOCS-05 delta) are met on disk
- [x] All 21 `test/validate-phase-03.js` invariants PASS (node test/validate-phase-03.js exits 0)
- [x] `npm run docs:build` produces a clean Astro build
- [x] `node tools/installer/gomad-cli.js --version` outputs BMAD-free GoMad-branded version string
- [x] README.md + README_CN.md contain `## Credits` section with canonical disclaimer verbatim
- [x] LICENSE preserves BMAD block byte-identical (invariant #1 — already passing from Plan 03-01)
- [x] CONTRIBUTORS.md preserves BMAD contributors byte-identical (invariant #2 — already passing from Plan 03-01)
- [x] No Discord links, dead gomad.org / gomad-builder-docs URLs, or BMAD marketing text in `docs/` or top-level user-visible files
- [x] Website stub renders and future-proofs CNAME pointer at `gomad.xgent.ai`
- [x] Wordmark.png and website/public/favicon.png exist and are regeneratable via committed script

Phase 3 is functionally complete. Phase 4 can proceed with: npm publish mechanics (trusted publishing or granular token), quality gates (installer E2E, smoke tests), and phase-gate validator wiring.

## Self-Check: PASSED

- [x] Files created exist on disk:
  - `tools/dev/regenerate-wordmark.js` — FOUND
  - `website/public/favicon.png` — FOUND
  - `website/src/pages/index.astro` — FOUND
  - `.planning/phases/03-credit-branding-docs/03-02-SUMMARY.md` — FOUND (this file)
- [x] Files deleted confirmed gone:
  - `website/src/content/i18n/fr-FR.json` — gone
  - `website/src/content/i18n/vi-VN.json` — gone
- [x] Commits exist in git history:
  - `b6403a0` — Task 1 (README surgical edit)
  - `137b03d` — Task 2 (CLI banner + Wordmark + favicon)
  - `fd680c6` — Task 3 (website stub + i18n + docs sweep)
- [x] All 21 Phase 3 invariants PASS on final run
- [x] Astro build passes via `npm run docs:build`
- [x] CLI --version BMAD-free
