---
phase: 03-credit-branding-docs
fixed_at: 2026-04-09T04:15:00Z
review_path: .planning/phases/03-credit-branding-docs/03-REVIEW.md
iteration: 2
findings_in_scope: 13
fixed: 12
skipped: 1
status: partial
---

# Phase 3: Code Review Fix Report

**Fixed at:** 2026-04-09T04:15:00Z
**Source review:** .planning/phases/03-credit-branding-docs/03-REVIEW.md
**Iteration:** 2 (cumulative across iterations 1 and 2)

**Summary:**
- Findings in scope: 13 (WR-01..WR-07 from iteration 1; IN-01..IN-06 from iteration 2)
- Fixed: 12
- Skipped: 1 (WR-07 — verified correct, no code change required)

## Fixed Issues

### WR-01: CLI update check queries the wrong npm package

**Files modified:** `tools/installer/gomad-cli.js`
**Commit:** d8bbb0d (iteration 1)
**Applied fix:** Changed `packageName` from `'gomad'` to `'@xgent-ai/gomad'` and updated the user-facing update command message to use the `packageName` variable so the `npx` hint points at the correct scoped package. Verified via `node -c`.

### WR-02: Docs still link to upstream `gomad-code-org/GOMAD-METHOD`

**Files modified:** `docs/how-to/get-answers-about-gomad.md`, `docs/zh-cn/how-to/get-answers-about-gomad.md`
**Commit:** 5fd73a2 (iteration 1, combined with WR-04)
**Applied fix:** Replaced `https://github.com/gomad-code-org/GOMAD-METHOD` with `https://github.com/xgent-ai/gomad` in both language versions. Removed the `llms-full.txt` paragraph/table row in both files since the docs site is not yet live (matches reviewer's suggested stub-until-deployed approach).

### WR-03: User-facing intro still says "GoMad Method (BMM)"

**Files modified:** `docs/explanation/established-projects-faq.md`
**Commit:** e99e101 (iteration 1)
**Applied fix:** Dropped the `(BMM)` parenthetical in the opening sentence and rephrased line 48 from `BMM respects your choice...` to `GoMad respects your choice...`.

### WR-04: Stray AI-generated free-verse poem left in published docs

**Files modified:** `docs/how-to/get-answers-about-gomad.md`, `docs/zh-cn/how-to/get-answers-about-gomad.md`
**Commit:** 5fd73a2 (iteration 1, combined with WR-02)
**Applied fix:** Deleted the multi-stanza poem signed `*—Claude*` at the end of both the English and Chinese files. Files now end cleanly on the GitHub Issues link.

### WR-05: zh-cn FAQ has content drift vs English original

**Files modified:** `docs/zh-cn/explanation/established-projects-faq.md`
**Commit:** 67a0abd (iteration 1, combined with WR-06)
**Applied fix:** Trimmed the Chinese version to match the English original by removing: (a) the extra TOC entry for "什么时候该从 Quick Flow 切到完整方法？", (b) the extra Q&A section that followed, (c) the inline "如果你想了解这套接入方式..." paragraph with broken relative links, and (d) the "继续阅读" footer section with four unverified relative links. Chose to trim zh-cn down rather than expand English because the reviewer said either approach was acceptable and the trim is safer (avoids creating content that needs translation review).

### WR-06: zh-cn FAQ uses curly quotation marks inconsistently

**Files modified:** `docs/zh-cn/explanation/established-projects-faq.md`
**Commit:** 67a0abd (iteration 1, combined with WR-05)
**Applied fix:** Replaced curly quotes `"…"` / `"…"` with straight ASCII `"…"` in three body-copy locations: `"代码现状"`, `"是否沿用当前约定？"`, and `"立即现代化"`. String quotes in frontmatter were left alone since they are ASCII already.

### IN-01: `checkForUpdate` called before declaration relies on hoisting

**Files modified:** `tools/installer/gomad-cli.js`
**Commit:** d8b4d76 (iteration 2)
**Applied fix:** Moved the `checkForUpdate().catch(...)` invocation to immediately after the `async function checkForUpdate()` declaration so the call site reads top-to-bottom without relying on hoisting. Added a clarifying comment block calling out the "background update check" intent. Verified via `node -c`.

### IN-02: `clearScreen` parameter is dead

**Files modified:** `tools/installer/cli-utils.js`
**Commit:** 00ecbcf (iteration 2)
**Applied fix:** Renamed the unused parameter to `_clearScreen` (underscore convention for intentionally unused) and added a `@deprecated` JSDoc tag plus an explanatory `[_clearScreen]` parameter line. The parameter is preserved for API stability per the reviewer's guidance. Verified via `node -c`.

### IN-03: `parseArgs` has an empty inner block

**Files modified:** `test/validate-phase-03.js`
**Commit:** 41b69ba (iteration 2)
**Applied fix:** Removed the redundant inner `{ ... }` wrapper and the dead `// No default` comment around the `--dry-run` case. The case body now matches the conventions of `--wave` and `--only`. Verified via `node -c`.

### IN-04: `regenerate-wordmark.js` doesn't validate that `sharp` is available

**Files modified:** `tools/dev/regenerate-wordmark.js`
**Commit:** ddf6dcc (iteration 2)
**Applied fix:** Wrapped `require('sharp')` in a try/catch that prints a clear hint (`sharp is required for this script. Run: npm install --save-dev sharp`) and exits with code 1 when the dependency is missing, instead of surfacing a raw `MODULE_NOT_FOUND`. Verified via `node -c`.

### IN-05: README badges still advertise Python and uv

**Files modified:** `README.md`
**Commit:** 3089c6b (iteration 2)
**Applied fix:** Removed the Python Version and uv badges from the badge row in `README.md`. README_CN.md already lacked these badges, so the bilingual drift is now resolved by trimming English to match Chinese (consistent with the v1.1.0 "trim" theme).

### IN-06: TODO/code comment notes upstream provenance in `cli-utils.js`

**Files modified:** `tools/installer/cli-utils.js`
**Commit:** daac1b8 (iteration 2)
**Applied fix:** Appended `// See .planning/phases/03-credit-branding-docs/03-PLAN.md (decision D-07).` next to the figlet/D-07 comment and `// See .planning/phases/03-credit-branding-docs/03-PLAN.md (decision D-08).` next to the no-tagline/D-08 comment, giving future contributors a direct path back to the decision records. Verified via `node -c`.

## Skipped Issues

### WR-07: README "docs site pending" claim is contradicted by index.md

**File:** `README.md:42`, `docs/index.md:43-46`
**Reason:** Verified in iteration 1 that all four link targets in `docs/index.md` (`./tutorials/getting-started.md`, `./how-to/install-gomad.md`, `./explanation/analysis-phase.md`, `./reference/agents.md`) exist in the repo via direct filesystem check. The landing page is not broken. The reviewer's concern was conditional ("if any of these don't exist"), and the condition is not met, so no code change is required. The README's "site deployment pending" statement is factually accurate and consistent with the working in-repo docs navigation.
**Original issue:** Reviewer asked to verify that `docs/index.md` link targets exist and run `npm run docs:validate-links`. Filesystem verification passed; deeper link-validator run is deferred to the verifier phase.

---

_Fixed: 2026-04-09T04:15:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 2 (cumulative)_
