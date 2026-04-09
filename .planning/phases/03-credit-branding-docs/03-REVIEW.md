---
phase: 03-credit-branding-docs
reviewed: 2026-04-09T03:07:04Z
depth: standard
files_reviewed: 31
files_reviewed_list:
  - .npmignore
  - CHANGELOG.md
  - CNAME
  - CONTRIBUTING.md
  - CONTRIBUTORS.md
  - LICENSE
  - README.md
  - README_CN.md
  - TRADEMARK.md
  - Wordmark.png
  - docs/_STYLE_GUIDE.md
  - docs/explanation/established-projects-faq.md
  - docs/how-to/get-answers-about-gomad.md
  - docs/index.md
  - docs/tutorials/getting-started.md
  - docs/zh-cn/_STYLE_GUIDE.md
  - docs/zh-cn/explanation/established-projects-faq.md
  - docs/zh-cn/how-to/get-answers-about-gomad.md
  - docs/zh-cn/index.md
  - docs/zh-cn/tutorials/getting-started.md
  - test/fixtures/contributors-bmad-baseline.txt
  - test/fixtures/license-bmad-baseline.txt
  - test/validate-phase-03.js
  - tools/dev/regenerate-wordmark.js
  - tools/installer/cli-utils.js
  - tools/installer/gomad-cli.js
  - website/astro.config.mjs
  - website/public/favicon.png
  - website/src/lib/locales.mjs
  - website/src/pages/index.astro
findings:
  critical: 0
  warning: 7
  info: 6
  total: 13
status: issues_found
---

# Phase 3: Code Review Report

**Reviewed:** 2026-04-09T03:07:04Z
**Depth:** standard
**Files Reviewed:** 30 source files (Wordmark.png and favicon.png are binaries; reviewed by metadata only)
**Status:** issues_found

## Summary

Phase 3 ("credit, branding, docs") is largely on-target: LICENSE and CONTRIBUTORS.md preserve the BMAD baseline byte-identically, the canonical non-affiliation disclaimer is consistent across the four required surfaces (LICENSE, README.md, README_CN.md, TRADEMARK.md), CHANGELOG starts fresh at v1.1.0 with a BREAKING CHANGES subsection, CNAME is correct, and the validation harness in `test/validate-phase-03.js` is well structured.

The bulk of remaining issues cluster in two areas:

1. **CLI update-check uses the wrong npm package name.** `tools/installer/gomad-cli.js` queries `npm view gomad@…` instead of `@xgent-ai/gomad`. This silently breaks the update prompt and, when it does fire, advises users to run a non-existent package.
2. **Fork-residue in user-facing docs.** Two docs files under review (`docs/how-to/get-answers-about-gomad.md` and `docs/explanation/established-projects-faq.md`, plus their `zh-cn` mirrors) still reference the upstream `gomad-code-org/GOMAD-METHOD` repo, the legacy `BMM` acronym in a user-visible intro sentence, and contain a stray free-verse poem signed `*—Claude*` that appears to be accidental AI output left in the document body.

No CRITICAL findings — nothing blocks merge on security or data-loss grounds — but the CLI update check (WR-01) and the broken `gomad-code-org` URLs (WR-02) should be fixed before tagging v1.1.0 because both are user-visible at install time.

## Warnings

### WR-01: CLI update check queries the wrong npm package

**File:** `tools/installer/gomad-cli.js:19`
**Issue:** `const packageName = 'gomad';` is then used at line 34 in `execSync(\`npm view ${packageName}@${tag} version\`)`. The published package is `@xgent-ai/gomad`, not `gomad`. As a result:
1. `npm view gomad@latest version` either errors out or returns metadata for an unrelated package, so the update check is silently no-op (errors are swallowed at line 53).
2. If the query *does* succeed, the user is told at line 47 to run `npx gomad@${tag} install`, which is also wrong.

This regresses the upstream behavior on the same line and undermines a user-facing feature for v1.1.0.

**Fix:**
```js
// tools/installer/gomad-cli.js:19
const packageName = '@xgent-ai/gomad';
```
And update the user-facing message at line 47 accordingly:
```js
`  npm cache clean --force && npx ${packageName}@${tag} install`,
```

### WR-02: Docs still link to upstream `gomad-code-org/GOMAD-METHOD`

**File:** `docs/how-to/get-answers-about-gomad.md:28`, `docs/how-to/get-answers-about-gomad.md:43`, `docs/zh-cn/how-to/get-answers-about-gomad.md:70`, `docs/zh-cn/how-to/get-answers-about-gomad.md:77`
**Issue:** These lines point users at:
- `https://github.com/gomad-code-org/GOMAD-METHOD` (does not exist; legacy upstream slug pattern reused as a placeholder)
- `https://gomad-code-org.github.io/GOMAD-METHOD/llms-full.txt` (404)

The canonical repo for this fork is `https://github.com/xgent-ai/gomad`. The same files correctly use `xgent-ai/gomad` for issue links elsewhere, so the inconsistency will confuse users and break Phase 3's "rewrite docs to point at the fork" goal.

**Fix:** Replace the bad URLs with the canonical fork repo, or — if the `llms-full.txt` artifact is not yet hosted — drop the section until the docs site is live. For example:
```md
Clone or open the [gomad repo](https://github.com/xgent-ai/gomad) and ask your AI about it.
```
And remove or stub the `llms-full.txt` paragraph until `gomad.xgent.ai` is deployed.

### WR-03: User-facing intro still says "GoMad Method (BMM)"

**File:** `docs/explanation/established-projects-faq.md:7`, `docs/explanation/established-projects-faq.md:48`
**Issue:** The English FAQ opens with "...working on established projects with the GoMad Method (BMM)." and later contains "BMM respects your choice — it won't force modernization, but it will offer it." `BMM` is the upstream module acronym; per CLAUDE.md and Phase 3 scope, lowercase/legacy `bmm` should not appear in user-facing prose under review. The trademark policy in TRADEMARK.md only permits attribution-context use of upstream marks, not body-copy use.

The Chinese mirror (`docs/zh-cn/explanation/established-projects-faq.md`) does NOT carry these strings, so the two language versions have drifted.

**Fix:** Drop the `(BMM)` parenthetical and rephrase line 48:
```md
GoMad respects your choice — it won't force modernization, but it will offer it.
```

### WR-04: Stray AI-generated free-verse poem left in published docs

**File:** `docs/how-to/get-answers-about-gomad.md:54-78`, `docs/zh-cn/how-to/get-answers-about-gomad.md:111-135`
**Issue:** Both files end with a multi-stanza free-verse poem signed `*—Claude*` (e.g. *"You! / Stuck / in the queue— / waiting / for who?"*). This appears to be unintended AI scratch output accidentally committed into a How-To document. It is jarring next to the preceding `## 3. Ask Someone` section, has no introductory framing, and conflicts with the project's documentation style guide (`docs/_STYLE_GUIDE.md` does not mention prose poems and the section budget rules would forbid it).

**Fix:** Delete lines 54-78 in the English file and the corresponding lines 111-135 in the zh-cn mirror. If a flourish is desired, replace with a one-line tip or a `:::tip` admonition.

### WR-05: zh-cn FAQ has content drift vs English original

**File:** `docs/zh-cn/explanation/established-projects-faq.md:15`, `docs/zh-cn/explanation/established-projects-faq.md:47-58`, `docs/zh-cn/explanation/established-projects-faq.md:60-64`
**Issue:** The Chinese version contains an extra TOC entry and section ("什么时候该从 Quick Flow 切到完整方法？", lines 15 and 47) and an extra "继续阅读" footer (lines 60-64) that the English version (`docs/explanation/established-projects-faq.md`) does not have. It also references local files that are out of scope for Phase 3 review and may not exist:
- `./quick-dev.md`
- `./project-context.md`
- `../how-to/established-projects.md`
- `../how-to/project-context.md`

If these targets don't exist, `npm run docs:validate-links` will fail. Even if they do, the bilingual drift means the two language versions answer different questions.

**Fix:** Either bring the English version up to parity (add the "graduate to full method" Q&A) or trim the Chinese version to match. Verify all four relative links resolve in the docs tree before merging.

### WR-06: zh-cn FAQ uses curly quotation marks inconsistently

**File:** `docs/zh-cn/explanation/established-projects-faq.md:22, 28, 41`
**Issue:** Lines mix curly quotes (`”…”`, `“…”`) inside body copy where the rest of the zh-cn docs use straight ASCII quotes. This is a minor encoding/style consistency issue but it shows up in rendered output and breaks grep-based content audits.

**Fix:** Run a one-pass replacement of `”` and `“` with `"` (or with the project-standard Chinese-bracket convention), and add a markdownlint rule if you want to enforce it going forward.

### WR-07: README "docs site pending" claim is contradicted by index.md

**File:** `README.md:42`, `docs/index.md:43-46`
**Issue:** README says "site deployment pending; current docs live in the [`docs/`](docs/) directory of this repository." But `docs/index.md` lines 43-46 link to:
- `./tutorials/getting-started.md` (exists, reviewed)
- `./how-to/install-gomad.md` (not in review scope; existence not verified)
- `./explanation/analysis-phase.md` (not in review scope)
- `./reference/agents.md` (not in review scope)

If any of these don't exist, the landing page is broken even for the "view in repo" path that README is steering users toward. Worth verifying with `npm run docs:validate-links` before tagging.

**Fix:** Run `npm run docs:validate-links` (already part of project tooling per `_STYLE_GUIDE.md`). If targets are missing, either create stubs or remove the links.

## Info

### IN-01: `checkForUpdate` called before declaration relies on hoisting

**File:** `tools/installer/gomad-cli.js:20`
**Issue:** `checkForUpdate().catch(...)` is invoked at line 20, but `async function checkForUpdate() { ... }` isn't declared until line 24. Function declarations hoist, so this works, but it's a readability gotcha for an entry-point file.
**Fix:** Move the invocation below the declaration, or wrap the call site in an obvious "kick off background update check" comment block.

### IN-02: `clearScreen` parameter is dead

**File:** `tools/installer/cli-utils.js:159`
**Issue:** `displayModuleComplete(moduleName, clearScreen = false)` accepts a parameter that the body never references. Comment says "deprecated but kept for backwards compatibility." If nothing in the codebase calls it with `clearScreen=true`, drop the parameter. If it must stay for API stability, mark with a JSDoc `@deprecated` tag.
**Fix:**
```js
/**
 * @deprecated No-op kept for backwards compatibility.
 */
displayModuleComplete(moduleName, _clearScreen = false) { /* intentionally empty */ },
```

### IN-03: `parseArgs` has an empty inner block

**File:** `test/validate-phase-03.js:395-401`
**Issue:** The `--dry-run` case wraps a single assignment in an extra `{ ... }` block with a `// No default` comment. The double brace is dead structure; it looks like a leftover from a code-mod.
**Fix:**
```js
case '--dry-run': {
  args.dryRun = true;
  break;
}
```

### IN-04: `regenerate-wordmark.js` doesn't validate that `sharp` is available

**File:** `tools/dev/regenerate-wordmark.js:6`
**Issue:** `require('sharp')` will throw `MODULE_NOT_FOUND` if a contributor runs the script in an environment that didn't install `sharp`. The header comment says "Run manually when the visual identity changes," so the guidance is informal — but a friendlier error would help.
**Fix:** Wrap the `require` and emit a clear hint:
```js
let sharp;
try { sharp = require('sharp'); }
catch { console.error('sharp is required. Run: npm install --save-dev sharp'); process.exit(1); }
```

### IN-05: README badges still advertise Python and uv

**File:** `README.md:4-5`
**Issue:** The Python and `uv` badges are inherited from upstream, but Phase 3's CLAUDE.md says "Python 3.10+ — Optional dependency, supported by project but not directly used in core codebase." Showing these prominently above the description suggests Python is required, which contradicts the install instructions (Node-only). README_CN already drops the uv badge — bilingual drift again.
**Fix:** Either drop both badges (recommended for v1.1.0 trim) or move them to a "Compatibility" section lower in the README. Either way, keep README.md and README_CN.md in sync.

### IN-06: TODO/code comment notes upstream provenance in `cli-utils.js`

**File:** `tools/installer/cli-utils.js:28`, `tools/installer/cli-utils.js:37`
**Issue:** The comments `Generated once (pasted in literally). D-07 forbids figlet dep.` and `No tagline (factual + minimal). No upstream credit text in CLI output (see D-08).` reference internal decision IDs (D-07, D-08) without context. End users won't see them but new contributors hitting this file have no map back to those decisions. Consider linking to the planning doc that defines D-07/D-08, or inlining a one-line summary.
**Fix:** Append a path reference, e.g. `// see .planning/phases/03-credit-branding-docs/03-PLAN.md §D-07`.

---

_Reviewed: 2026-04-09T03:07:04Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
