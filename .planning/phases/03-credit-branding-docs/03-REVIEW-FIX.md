---
phase: 03-credit-branding-docs
fixed_at: 2026-04-09T03:30:00Z
review_path: .planning/phases/03-credit-branding-docs/03-REVIEW.md
iteration: 1
findings_in_scope: 7
fixed: 6
skipped: 1
status: partial
---

# Phase 3: Code Review Fix Report

**Fixed at:** 2026-04-09T03:30:00Z
**Source review:** .planning/phases/03-credit-branding-docs/03-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 7 (WR-01..WR-07; info-level IN-01..IN-06 out of scope)
- Fixed: 6
- Skipped: 1 (WR-07 — verified correct, no code change required)

## Fixed Issues

### WR-01: CLI update check queries the wrong npm package

**Files modified:** `tools/installer/gomad-cli.js`
**Commit:** d8bbb0d
**Applied fix:** Changed `packageName` from `'gomad'` to `'@xgent-ai/gomad'` and updated the user-facing update command message to use the `packageName` variable so the `npx` hint points at the correct scoped package. Verified via `node -c`.

### WR-02: Docs still link to upstream `gomad-code-org/GOMAD-METHOD`

**Files modified:** `docs/how-to/get-answers-about-gomad.md`, `docs/zh-cn/how-to/get-answers-about-gomad.md`
**Commit:** 5fd73a2 (combined with WR-04, same files)
**Applied fix:** Replaced `https://github.com/gomad-code-org/GOMAD-METHOD` with `https://github.com/xgent-ai/gomad` in both language versions. Removed the `llms-full.txt` paragraph/table row in both files since the docs site is not yet live (matches reviewer's suggested stub-until-deployed approach).

### WR-03: User-facing intro still says "GoMad Method (BMM)"

**Files modified:** `docs/explanation/established-projects-faq.md`
**Commit:** e99e101
**Applied fix:** Dropped the `(BMM)` parenthetical in the opening sentence and rephrased line 48 from `BMM respects your choice...` to `GoMad respects your choice...`.

### WR-04: Stray AI-generated free-verse poem left in published docs

**Files modified:** `docs/how-to/get-answers-about-gomad.md`, `docs/zh-cn/how-to/get-answers-about-gomad.md`
**Commit:** 5fd73a2 (combined with WR-02)
**Applied fix:** Deleted the multi-stanza poem signed `*—Claude*` at the end of both the English and Chinese files. Files now end cleanly on the GitHub Issues link.

### WR-05: zh-cn FAQ has content drift vs English original

**Files modified:** `docs/zh-cn/explanation/established-projects-faq.md`
**Commit:** 67a0abd (combined with WR-06, same file)
**Applied fix:** Trimmed the Chinese version to match the English original by removing: (a) the extra TOC entry for "什么时候该从 Quick Flow 切到完整方法？", (b) the extra Q&A section that followed, (c) the inline "如果你想了解这套接入方式..." paragraph with broken relative links, and (d) the "继续阅读" footer section with four unverified relative links. Chose to trim zh-cn down rather than expand English because the reviewer said either approach was acceptable and the trim is safer (avoids creating content that needs translation review).

### WR-06: zh-cn FAQ uses curly quotation marks inconsistently

**Files modified:** `docs/zh-cn/explanation/established-projects-faq.md`
**Commit:** 67a0abd (combined with WR-05)
**Applied fix:** Replaced curly quotes `"…"` / `"…"` with straight ASCII `"…"` in three body-copy locations: `"代码现状"`, `"是否沿用当前约定？"`, and `"立即现代化"`. String quotes in frontmatter were left alone since they are ASCII already.

## Skipped Issues

### WR-07: README "docs site pending" claim is contradicted by index.md

**File:** `README.md:42`, `docs/index.md:43-46`
**Reason:** Verified that all four link targets in `docs/index.md` (`./tutorials/getting-started.md`, `./how-to/install-gomad.md`, `./explanation/analysis-phase.md`, `./reference/agents.md`) exist in the repo via direct filesystem check. The landing page is not broken. The reviewer's concern was conditional ("if any of these don't exist"), and the condition is not met, so no code change is required. The README's "site deployment pending" statement is factually accurate and consistent with the working in-repo docs navigation.
**Original issue:** Reviewer asked to verify that `docs/index.md` link targets exist and run `npm run docs:validate-links`. Filesystem verification passed; deeper link-validator run is deferred to the verifier phase.

---

_Fixed: 2026-04-09T03:30:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
