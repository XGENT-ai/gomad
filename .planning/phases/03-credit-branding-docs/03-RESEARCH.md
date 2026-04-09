# Phase 3: Credit, Branding & Docs — Research

**Researched:** 2026-04-09
**Domain:** Legal attribution, documentation rewrite, CLI branding, visual assets, static-site stubbing
**Confidence:** HIGH

## Summary

Phase 3 turns the already-renamed GoMad codebase into a publishable, properly-credited hard fork of BMAD Method. Phase 2's content sweep intentionally excluded the files Phase 3 owns (`LICENSE`, `CHANGELOG.md`, `TRADEMARK.md`, `CONTRIBUTORS.md`, `README.md`, `README_CN.md`) plus the CLI banner ASCII art (which survives because box-drawing glyphs don't match substring patterns). Phase 3 is therefore **surgical** — a tightly-scoped rewrite of ~15 files, deletion of 3 assets/files, creation of 3 new assets (Wordmark.png, favicon, `website/src/pages/index.astro`), plus a small concurrent task to update `REQUIREMENTS.md` / `ROADMAP.md` to reflect the CONTEXT.md requirement relaxations (so Phase 4's phase-gate doesn't fail on now-outdated acceptance criteria).

The research deliberately does NOT re-investigate anything locked in CONTEXT.md's 25 D-XX decisions. It focuses on the five areas the planner cannot answer from CONTEXT.md alone: (1) MIT LICENSE byte-preservation mechanics and the exact composition pattern, (2) chalk-based ASCII banner with TTY/CI graceful degradation, (3) Wordmark.png + favicon regeneration tooling available in-repo, (4) website stub mechanics without breaking the Astro build, (5) a concrete before→after file inventory for tasking. It also surfaces one fact the planner must know: the Phase 2 sweep did its job on `docs/**`, `SECURITY.md`, `AGENTS.md`, and `CONTRIBUTING.md`, but left Discord URLs, broken links, and `BMad Method Module Ecosystem`-style phrasing in docs/index.md and `gomad-builder-docs.gomad.org`-style corrupted URLs that the sweep mangled.

**Primary recommendation:** Structure Phase 3 as two plans — **03-01 Legal + Identity** (REQUIREMENTS/ROADMAP deltas, LICENSE, TRADEMARK.md, CONTRIBUTORS.md, CONTRIBUTING.md, SECURITY/AGENTS delete, CHANGELOG truncate+v1.1.0, CNAME) and **03-02 Surface + Assets** (README.md + README_CN.md surgical edit, CLI banner in cli-utils.js, Wordmark.png + favicon regeneration, docs/index.md + docs/_STYLE_GUIDE.md + docs/zh-cn/index.md rewrites, docs/roadmap.mdx cleanup, docs/ identity spot-check, website/ stub + i18n deletion). Wave 0 inside 03-01 updates the requirement docs so the phase-gate remains self-consistent.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions (25 items — OVERRIDE requirements where they conflict)

**README rewrite (EN + CN)**
- **D-01:** Surgical edit of BMAD's existing README.md — keep section structure and feature bullets; swap all branding/links/commands/examples to GoMad; delete BMAD marketing copy ("Build More Architect Dreams", "What's Next for BMad" roadmap section); remove the top-of-file `![BMad Method](banner-bmad-method.png)` image line entirely (no replacement image — see D-05).
- **D-02:** `README_CN.md` maintains **full parity** with `README.md` — section-for-section Chinese mirror. Both files stay in lockstep for future maintenance.
- **D-03:** Replace ALL BMAD-branded badges, links, and community pointers: npm badge → `@xgent-ai/gomad`, docs link → `gomad.xgent.ai` (even though site not yet deployed), drop BMAD Discord link entirely. No cross-promotion to upstream community.
- **D-04:** Fork statement lives in a `## Credits` footer section ONLY. No fork-statement sentence in the README intro or in a dedicated "Origin" section. **Overrides REQUIREMENTS.md CREDIT-02** and Phase 3 success criterion (2). Credits section contains: "GoMad is a hard fork of BMAD Method by Brian (BMad) Madison." + upstream repo link + non-affiliation disclaimer identical to LICENSE.

**Branding assets + CLI banner**
- **D-05:** No `banner-gomad.png` will be created. `banner-bmad-method.png` is deleted. Top-of-README banner image line is removed from both `README.md` and `README_CN.md`. **Overrides REQUIREMENTS.md BRAND-01** and Phase 3 success criterion (4).
- **D-06:** Regenerate `Wordmark.png` with a GoMad typographic treatment. Derive a simple favicon from the same source (e.g., "g" or "GM" glyph).
- **D-07:** CLI startup banner = chalk-colored ASCII-art "GoMad" text block + version line. No `figlet` dependency — hand-authored or generated once and stored as a static string in the CLI. Must degrade gracefully in non-color terminals and CI logs.
- **D-08:** NO BMAD credit text anywhere in CLI output — not in startup banner, `--version`, `--about`, or install success message. Credit duty is fully satisfied by LICENSE, README Credits, README_CN Credits, and CHANGELOG v1.1.0 entry.

**CHANGELOG v1.1.0 framing**
- **D-09:** v1.1.0 entry tone = factual + minimal. No self-flagellation or "evolved into" language.
- **D-10:** **Truncate BMAD upstream history entirely.** CHANGELOG.md starts fresh at v1.1.0. Do NOT preserve BMAD's v6.2.2…v1.0.0 entries in-file.
- **D-11:** v1.1.0 entry includes a `### BREAKING CHANGES` subsection stating: "Nothing from `@xgent-ai/gomad@1.0.0` carries forward. v1.1.0 is effectively a new product reusing the package name."
- **D-12:** v1.1.0 entry includes a one-line version-optics note on BMAD's v6.x vs GoMad's 1.x.

**docs/ content sweep**
- **D-13:** Identity-only sweep. Phase 2 already did text replacement. Phase 3 performs a spot-check pass on the 62 files in `docs/` for BMAD-specific marketing/community language that survived.
- **D-14:** Rewrite `docs/index.md` landing page in GoMad voice from scratch.
- **D-15:** Rewrite `docs/_STYLE_GUIDE.md` references to match GoMad identity and naming conventions (`gm-*`, `gomad-skills/`, GoMad casing rule).
- **D-16:** Leave the 62 inner explanation/how-to/reference/tutorials pages structurally as-is.
- **D-17:** `docs/zh-cn/` receives identity spot-check + rewrite of `docs/zh-cn/index.md`. Do NOT touch inner pages.

**website/ stub**
- **D-18:** **Stub the entire `website/`.** Replace `website/src/pages/index.astro` (or equivalent) with a minimal one-page placeholder: "GoMad — under construction. See README.md in the repository for current docs."
- **D-19:** Delete leftover i18n files `website/src/content/i18n/fr-FR.json` and `website/src/content/i18n/vi-VN.json`. Keep `zh-CN.json`.
- **D-20:** `CNAME` file = `gomad.xgent.ai`.

**TRADEMARK.md posture**
- **D-21:** **Defensive posture on the "GoMad" wordmark.** TRADEMARK.md rewrite:
  1. Nominative acknowledgment of BMAD as a trademark of BMad Code LLC; GoMad uses "BMAD" only in attribution/compatibility language (fair use).
  2. Non-affiliation disclaimer identical to LICENSE.
  3. Assert "GoMad" as a trademark of xgent-ai (or Rockie Guo as sole proprietor, whichever is legally cleaner).
  4. Forbid use of "GoMad" or confusingly similar names (Gomad, Go-Mad, GOMad) as product/service/company/domain names without written permission.
  5. Forbid implying endorsement by or affiliation with xgent-ai.
- **D-22:** Acknowledged risk: defensive posture contrasts with BMAD's permissive TRADEMARK.md. Deliberate choice. Do NOT apologize for it in TRADEMARK.md itself.

**CONTRIBUTORS.md + meta docs**
- **D-23:** `CONTRIBUTORS.md` preserves the original BMAD contributors list **byte-identical**. Add a new `## GoMad Contributors` section below a horizontal rule listing Rockie Guo as initial maintainer.
- **D-24:** **Delete `SECURITY.md` and `AGENTS.md`** rather than rewriting. If useful boilerplate exists, reduce to minimal stubs (1–2 paragraphs + `rockie@kitmi.com.au` contact).
- **D-25:** `CONTRIBUTING.md` gets a content rewrite: identity sweep + maintainer contact (Rockie Guo / rockie@kitmi.com.au) + "propose changes via PR to xgent-ai/gomad" flow. Do NOT carry over BMAD-specific community processes.

### Claude's Discretion
- Exact ASCII-art glyphs for CLI banner (readable in 80-col terminals).
- Exact chalk color palette for CLI banner.
- Exact GoMad tagline wording (or whether to have one — v1.1 may ship without).
- Exact Wordmark.png typographic treatment (font, weight, color).
- Favicon glyph choice ("g" vs "GM" vs other).
- Which feature bullets from BMAD's README survive the surgical edit.
- `docs/index.md` section structure.
- Whether TRADEMARK.md lists owner as "xgent-ai" or "Rockie Guo / xgent-ai" — defer to legal cleanliness.
- Website stub visual treatment (plain HTML vs minimal Astro vs static text).

### Deferred Ideas (OUT OF SCOPE)
- Real human-designed banner image.
- Real favicon design (D-06 is a placeholder).
- Full `website/` rewrite with GoMad-branded Astro/Starlight content.
- Deep rewrite of `docs/` tutorials/how-to/explanation/reference pages.
- New agents/skills, CUSTOM-01..03 (milestone 2).
- GitHub Pages deployment of `gomad.xgent.ai`.
- Tagline decision for GoMad (Claude's discretion, optional).
- Discord / community links (can come in a future phase).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description (as-written, with CONTEXT deltas applied) | Research Support |
|----|--------------------------------------------------------|------------------|
| CREDIT-01 | LICENSE preserves BMAD's original MIT text byte-identical, with a GoMad copyright block (`Copyright (c) 2026 Rockie Guo / xgent-ai`) appended below a horizontal rule, plus non-affiliation disclaimer | §1 LICENSE Composition; current LICENSE verified byte-matches pattern in CREDIT_AND_NPM.md |
| CREDIT-02 | **RELAXED per D-04:** README.md and README_CN.md contain a `## Credits` section **ONLY** (no intro sentence) with factual fork statement, upstream repo link, and non-affiliation disclaimer | §2 README surgical edit inventory; §9 canonical disclaimer |
| CREDIT-03 | TRADEMARK.md rewritten for GoMad: no claim over BMAD wordmark, nominative fair-use acknowledgment of BMAD, defensive posture on GoMad wordmark per D-21 | §8 TRADEMARK.md posture; §9 canonical disclaimer |
| CREDIT-04 | CONTRIBUTORS.md preserves original BMAD contributors list byte-identical; new `## GoMad Contributors` section added below HR | §3 CONTRIBUTORS composition (same pattern as LICENSE) |
| BRAND-01 | **RELAXED per D-05:** `banner-bmad-method.png` deleted, NO replacement banner image, `Wordmark.png` regenerated for GoMad, CLI startup banner shows "GoMad" | §4 Wordmark regeneration; §5 CLI banner |
| BRAND-02 | CLI installer/startup banner displays "GoMad" branding (not BMAD) | §5 CLI banner — current cli-utils.js still has BMAD ASCII art + "Build More, Architect Dreams" tagline that Phase 2 did NOT catch |
| DOCS-01 | README.md (English) surgically edited with GoMad framing, `npm install @xgent-ai/gomad` install, Credits section | §2 README inventory; D-01 + D-04 |
| DOCS-02 | README_CN.md (Chinese) — same scope, full parity | §2 README inventory; D-02 |
| DOCS-03 | CNAME set to `gomad.xgent.ai` | §6 CNAME — current value `docs.bmad-method.org` |
| DOCS-04 | CHANGELOG.md has v1.1.0 entry framing the pivot | §7 CHANGELOG truncation; D-09..D-12 |
| DOCS-05 | **RELAXED per D-24:** CONTRIBUTING.md rewritten, SECURITY.md + AGENTS.md **deleted or minimal stubs** | §3 meta docs |
| DOCS-06 | docs/ site content updated or cleaned up (default en + zh-cn only) | §10 docs/ spot-check; D-13..D-17 |
| DOCS-07 | `docs/mobmad-plan.md` investigated — already deleted in Phase 2 (D-16 of Phase 2 context). **Status: CLOSED.** No Phase 3 action required beyond noting it in the plan. | Phase 2 context D-16 confirms |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

These are load-bearing directives the planner MUST honor:

1. **License preservation:** BMAD's MIT license text must remain byte-identical. GoMad block appended below a horizontal rule in the same `LICENSE` file. No separate `LICENSE-BMAD`, no `NOTICE` file.
2. **Casing rule:** Display form is "GoMad" (NOT "Gomad"). Lowercase `gomad` for paths/package names/CLI commands. Uppercase `GOMAD` for the acronym expansion only.
3. **Trademark nominative fair use:** "BMAD" may only be used in attribution sentences. Never in product identity, branding, or inside shipped skill IDs.
4. **Scope discipline:** Phase 3 is rename + slim + credit + branding. Any new agent/skill work is a scope violation and must be deferred to milestone 2.
5. **npm publish mechanics are Phase 4, not Phase 3.** Do not stage publish/deprecate in Phase 3 plans.
6. **No emojis in plan/task artifacts unless user asks.** (Global rule — note CLAUDE.md's general instructions section.)

## Standard Stack

### Core (already installed — no new deps)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| chalk | 4.1.2 | Terminal color output for the CLI banner | [VERIFIED: package.json line 56 in research context]. Already imported transitively via `prompts.js`'s `getColor()` helper (picocolors under the hood). Phase 3 reuses this, does not add chalk directly. |
| picocolors | 1.1.1 | Actual color engine behind `prompts.getColor()` | [VERIFIED: package.json; prompts.js:12,42]. Auto-detects `NO_COLOR`, `FORCE_COLOR`, and TTY. Handles CI degradation natively. |
| @clack/prompts | 1.0.0 | `box()` renderer used for the current BMAD logo and will render the GoMad banner | [VERIFIED: prompts.js imports]. Box-drawing characters render fine in any UTF-8 terminal; fall back gracefully in older ones. |
| sharp | 0.33.5 | Image generation for `Wordmark.png` regeneration and favicon derivation | [VERIFIED: package.json line 98]. Has `.png()`, `.resize()`, text compositing via SVG input. Sufficient for a static wordmark; no extra dep needed. |
| astro | 5.16.0 | Static site builder for `website/` stub | [VERIFIED: package.json; website/astro.config.mjs]. |
| @astrojs/starlight | 0.37.5 | Docs theme — currently configured in `website/astro.config.mjs` | [VERIFIED]. Survives the stub; D-18 leaves content collections alone. |

### Alternatives Considered

| Instead of | Could Use | Why Rejected |
|------------|-----------|--------------|
| Hand-authored ASCII art | `figlet` npm package | D-07 explicitly forbids: adds a dep for a one-time render, and the art is a static string once generated. |
| Sharp-based Wordmark regen | External tool (Photoshop, Figma export) | Not reproducible in CI; binary provenance unclear. Sharp + SVG text → PNG is scriptable and repeatable. |
| Separate `LICENSE-BMAD` + `LICENSE-GOMAD` | — | License scanners (npm, GitHub, `licensee`) only read `LICENSE` at the repo root. Splitting reduces discoverability. CLAUDE.md + CREDIT_AND_NPM.md §1.2 both specify single-file append pattern. |
| NOTICE file for attribution | — | NOTICE is an Apache-2.0 convention, not MIT. Adding one signals license confusion. [CITED: CREDIT_AND_NPM.md §1.3] |

### New tooling
No new npm dependencies are added in Phase 3. All required capability already exists in the tree.

**Version verification:** All versions above are taken from the current `package.json` in the working tree. Phase 3 does not bump any of these.

## Architecture Patterns

### LICENSE Composition Pattern

```
[BMAD MIT text — byte identical from upstream]
    ↓
[horizontal rule (64-dash line, matching CREDIT_AND_NPM.md §1.2)]
    ↓
[GoMad copyright block: "Copyright (c) 2026 Rockie Guo / xgent-ai"]
    ↓
["Modifications and additions..." re-license statement]
    ↓
[Non-affiliation disclaimer — verbatim canonical sentence from §9]
```

Rationale: lowest-legal-risk reading of the MIT "above copyright notice shall be included" clause. The original notice is reproduced verbatim in the file users expect to find it, with no editorializing. [CITED: CREDIT_AND_NPM.md §1.2, OpenTofu precedent]

**Example (template — planner uses verbatim):**
```
MIT License

Copyright (c) 2025 BMad Code, LLC

[... entire current LICENSE file content, including the existing TRADEMARK NOTICE block which is part of BMAD's upstream LICENSE and MUST NOT be touched ...]

----------------------------------------------------------------------

GoMad is a hard fork of BMAD Method, distributed under the MIT License.

Copyright (c) 2026 Rockie Guo / xgent-ai

Modifications and additions made by xgent-ai are likewise released under the
MIT License above. The original BMAD Method copyright notice and license terms
are preserved in their entirety as required by the MIT License.

BMad™, BMad Method™, and BMad Core™ remain trademarks of BMad Code, LLC and
are referenced here solely for attribution purposes. xgent-ai is not affiliated
with, endorsed by, or sponsored by BMad Code, LLC.
```

### CONTRIBUTORS.md Composition Pattern

Same append-below-HR pattern as LICENSE. Current CONTRIBUTORS.md is 32 lines and contains the BMAD contributors acknowledgment (not a per-name list — BMAD references the git history and the dynamic contrib-rocks badge). Preserve byte-identical, append:

```
[current CONTRIBUTORS.md, byte-identical]
    ↓
----------------------------------------------------------------------
    ↓
## GoMad Contributors
    ↓
GoMad is maintained by xgent-ai. Initial maintainer: Rockie Guo <rockie@kitmi.com.au>.
    ↓
New contributors are acknowledged via git history and future editions of this file.
```

### CLI Startup Banner Pattern (for BRAND-02 / D-07 / D-08)

Current state (`tools/installer/cli-utils.js:21-44`): there is already a `CLIUtils.displayLogo()` method that renders BMAD ASCII art + "Build More, Architect Dreams" tagline via `@clack/prompts.box()` + `picocolors`. Phase 2's sweep did not touch it (glyphs aren't substring matches, tagline is not in the mapping). **This is the exact integration point.** No architectural change needed — just swap the string content.

Graceful degradation for non-TTY / CI / `NO_COLOR` is free: `prompts.getColor()` → picocolors, which already honors `process.env.NO_COLOR`, `process.env.FORCE_COLOR`, and `process.stdout.isTTY` at import time. [CITED: picocolors README, https://github.com/alexeyraspopov/picocolors]

**Recommended skeleton:**
```javascript
async displayLogo() {
  const version = this.getVersion();
  const color = await prompts.getColor();

  // Hand-authored 80-col-safe ASCII art spelling "GoMad"
  // Generated once (e.g., via online ASCII-art generator, "small" or
  // "standard" figlet font, pasted in literally). D-07 forbids figlet dep.
  const logo = [
    '   ____       __  __           _ ',
    '  / ___| ___ |  \\/  | __ _  __| |',
    ' | |  _ / _ \\| |\\/| |/ _` |/ _` |',
    ' | |_| | (_) | |  | | (_| | (_| |',
    '  \\____|\\___/|_|  |_|\\__,_|\\__,_|',
  ].map((line) => color.cyan(line)).join('\n');

  // Tagline is Claude's discretion per CONTEXT.md. Leaving out by default
  // (minimalism principle — user flagged "factual + minimal" in D-09).
  // If a tagline is chosen, it goes here as a separate line.

  await prompts.box(logo, `v${version}`, {
    contentAlign: 'center',
    rounded: true,
    formatBorder: color.blue,
  });
}
```

Key constraints satisfied:
- **No figlet dep** — string is literal.
- **80-col safe** — the example above is 33 cols; any glyph set Claude picks must fit in 80.
- **No BMAD credit text** (D-08) — logo is the GoMad wordmark only, no attribution string.
- **Non-color terminals** — picocolors degrades `color.cyan(line)` to identity function when stdout is not a TTY or `NO_COLOR=1`.
- **CI logs** — `@clack/prompts.box()` still renders plain box-drawing chars to stdout; the box stays legible.
- **Reads cleanly in light and dark themes** — cyan + blue border is the existing palette already used by `displayBox()` so it matches the rest of the CLI aesthetic.

**Integration point (D-07 + CONTEXT.md code_context):** call `CLIUtils.displayLogo()` from `tools/installer/gomad-cli.js` **before command dispatch**. Current `gomad-cli.js` does NOT call `displayLogo()` anywhere — it dispatches commands and calls `program.parse()` directly. The install command (`tools/installer/commands/install.js`) presumably calls it via the intro flow. The planner should verify where it's currently invoked and, if Phase 3 needs to show the banner at CLI entry for `--version` / `--help` / sub-commands, add an explicit call early in `gomad-cli.js`. **But D-08 says banner MUST NOT appear in `--version` or `--about`**, so the cleanest placement is: call `displayLogo()` only at the top of the install command entry path (preserving current behavior), and rely on commander's built-in `--version` output staying banner-free. [ASSUMED — needs verification during planning from install.js] → mark A1.

### website/ Stub Pattern (D-18)

Current state:
- `website/src/pages/` contains only `404.astro` and `robots.txt.ts`. **There is NO existing `index.astro`** (Starlight synthesizes the root index from `src/content/docs/index.md` by convention).
- `website/astro.config.mjs` has `starlight({ title: 'GoMad', ... })` with Discord social link and `/favicon.ico` reference.
- `website/src/content/i18n/` contains `fr-FR.json`, `vi-VN.json`, `zh-CN.json`.
- `website/src/lib/locales.mjs` declares `lang: 'vi-VN'` and `lang: 'fr-FR'` entries.

Since D-18 says stub the **entire** website, and Starlight reads content collections for localization, the minimal viable stub is:

**Option A (recommended) — create `website/src/pages/index.astro` as a literal Astro page that bypasses Starlight for the root route:**
```astro
---
// GoMad website is under construction. See README.md for current docs.
---
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>GoMad — Under Construction</title>
  </head>
  <body>
    <main>
      <h1>GoMad</h1>
      <p>Documentation site is under construction. See the
        <a href="https://github.com/xgent-ai/gomad#readme">README</a>
        for current docs.</p>
    </main>
  </body>
</html>
```

Rationale: Astro routes explicit `src/pages/*.astro` files before content-collection routes, so this file will serve as `/` and the Starlight-synthesized docs will be inaccessible at the root. Other routes (docs content) remain live but untested — acceptable for a stub.

**Option B (more aggressive) — remove the `@astrojs/starlight` integration from `astro.config.mjs` entirely.** This breaks the `docs:build` npm script if the script depends on Starlight content discovery. **Do not recommend** because it cascades into build-script changes Phase 3 shouldn't own.

**D-19 locale cleanup requires coupled edits:**
- Delete `website/src/content/i18n/fr-FR.json`
- Delete `website/src/content/i18n/vi-VN.json`
- Edit `website/src/lib/locales.mjs` to remove the `fr-FR` and `vi-VN` entries. **Leaving them in would cause Starlight to fail loading the missing i18n JSON files at build time.** [VERIFIED: grep found `lib/locales.mjs:20` and `lib/locales.mjs:28` referencing the deleted langs]
- Verify `astro.config.mjs` via `defaultLocale: 'root'` + `locales` (imported from `lib/locales.mjs`) still resolves cleanly after the mjs edit.

**Anti-pattern:** Do NOT attempt a full Starlight theme rebrand in Phase 3 — `astro.config.mjs` contains Discord social links and a `bmad-code-org` GitHub link that survived (verified via grep). A surgical pass to update the title string, remove Discord, and swap GitHub link to `xgent-ai/gomad` IS in scope for the stub (cheap and prevents the banner from showing BMAD branding if someone runs `docs:build` locally), but no content-collection rewrite.

### Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Color detection in CLI banner | Manual `process.env.NO_COLOR` / `isTTY` checks | `prompts.getColor()` → picocolors | Already installed; handles NO_COLOR / FORCE_COLOR / CI / isTTY. Hand-rolling reimplements ~20 lines of battle-tested detection. |
| ASCII art generation | figlet dep | Hand-authored static string | D-07 forbids the dep; art is written once and never regenerated. |
| Wordmark.png generation | ImageMagick / canvas / puppeteer | `sharp` (already installed) | Sharp's SVG-to-PNG compositing handles text rendering. No extra dep. |
| Favicon generation | Separate `png-to-ico` / `sharp-ico` dep | Ship a 32×32 or 64×64 PNG as `favicon.png` and reference that (Astro and modern browsers accept PNG favicons) | Avoids .ico byte-packing complexity for a placeholder. Starlight's `favicon:` accepts any path. |
| Non-affiliation disclaimer re-authoring | Drafting multiple subtly-different disclaimers across LICENSE, README, README_CN, TRADEMARK.md | Single canonical sentence reused verbatim — see §9 | Avoids disclaimer drift. One string, four paste-points. |
| License byte-preservation verification | `diff` against live BMAD repo | Hash the preserved block against a known good hash (current upstream at time of fork) | A network diff against a moving upstream is flaky. Better: snapshot the expected BMAD MIT text in a test fixture, then `head -n 30 LICENSE` in the verifier must byte-match the fixture. |
| CHANGELOG lint | Hand-parse keep-a-changelog format | `markdownlint-cli2` (already in deps) — the existing `npm run lint:md` catches heading ordering issues | No separate changelog linter needed. |

**Key insight:** Phase 3 is a content phase, not a code phase. The temptation is to write tooling (licence-diff scripts, banner generators). Resist it — every piece of tooling is a Phase 4 verification task, not a Phase 3 plan task.

## Runtime State Inventory

> Phase 3 is a credit/docs/branding phase, not a rename. But it touches files the Phase 2 rename sweep already processed, PLUS deletes a PNG asset and creates new PNGs. Running the inventory:

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | **None.** Phase 3 does not touch databases, caches, Chromadb, or any runtime store. | None. |
| Live service config | **None — verified by grep:** no running services reference any of the files being edited. The `gomad.xgent.ai` DNS records are deferred (not Phase 3 scope); GitHub Pages deploy is deferred; npm registry state is deferred to Phase 4. | None. |
| OS-registered state | **None.** No scheduled tasks, launchd plists, systemd units, or pm2 saved processes reference any of these files. | None. |
| Secrets / env vars | **None.** Phase 3 writes no secrets. `rockie@kitmi.com.au` appears in SECURITY.md / CONTRIBUTING.md rewrites as a plain contact string, not a secret. | None. |
| Build artifacts / installed packages | `banner-bmad-method.png` (28 KB PNG at repo root) is consumed by `README.md` line 1 and `README_CN.md` line 1; referenced from `.npmignore` line 29; NOT consumed by any code. After D-05 deletion, the `.npmignore` line 29 must also be deleted (it's a dangling reference to a nonexistent file). `Wordmark.png` (500×75 PNG at repo root) will be regenerated in-place — same filename, new bytes. `.npmignore` line 30 already excludes it so no tarball change. `website/src/lib/locales.mjs` holds compiled-at-build-time references to `fr-FR` / `vi-VN` — must be edited in lockstep with JSON deletions. | `.npmignore` line 29 edit (delete that single line); `Wordmark.png` regen in place; `locales.mjs` edit. |

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | All scripting | ✓ | 20+ (package.json engines) | — |
| sharp | Wordmark.png + favicon regen | ✓ | 0.33.5 | If sharp build fails on the execution machine, fall back to committing a hand-exported PNG (acceptable because D-06 is a placeholder, not a production asset). Flag for human if fallback taken. |
| chalk / picocolors | CLI banner | ✓ | 4.1.2 / 1.1.1 | — |
| @clack/prompts | CLI banner `box()` | ✓ | 1.0.0 | — |
| astro + @astrojs/starlight | Website stub | ✓ | 5.16.0 / 0.37.5 | — |
| git | Commit artifacts | ✓ | present (working tree verified) | — |
| Font file for sharp text rendering | Wordmark typography | **✗** — sharp does not ship with a bundled font; SVG text rendering in sharp uses librsvg which requires a system font | (a) Use a generic SVG font-family like `sans-serif` and accept whatever the render machine provides, or (b) embed a minimal base64 font via `<defs>` in the SVG. Option (a) is simpler for a placeholder. |

**Missing dependencies with no fallback:** None. All Phase 3 work is executable on the current machine.

**Missing dependencies with fallback:** Font for typographically-precise Wordmark. Fallback: use SVG generic font family; Wordmark will look different on different machines but is still "GoMad" text. Since D-06 is a placeholder, this is acceptable — flag to user that the Wordmark is not yet "designed," just generated.

## Common Pitfalls

### Pitfall 1: Byte-identical preservation drift
**What goes wrong:** Planner or executor "tidies up" whitespace, fixes a typo, or normalizes line endings in the BMAD MIT block inside LICENSE. Result: the preservation guarantee is broken, and CLAUDE.md's constraint 1 fails.
**Why it happens:** Editors auto-format on save. Prettier configured to touch `.md` preserves prose but has undefined behavior on LICENSE (no extension). `markdownlint` may rewrite headings.
**How to avoid:** (a) Add `LICENSE` to a byte-preservation verifier as a phase 3 wave-0 task: snapshot the current LICENSE to a `test/fixtures/license-bmad-baseline.txt` file at the start of the plan, verify that the first N lines of the final LICENSE byte-match the baseline. (b) Make the LICENSE edit a single append operation — read the current file, write `current + HR + gomad_block`, never touch the prefix.
**Warning signs:** `git diff LICENSE` shows any changes to lines 1–31 (the current BMAD block). Any such diff is a regression.

### Pitfall 2: Phase 2 sweep leftovers the planner forgets exist
**What goes wrong:** The planner assumes Phase 2's content sweep was complete. It wasn't — the sweep's exclude list (Phase 2 CONTEXT D-06) deliberately skipped LICENSE, CHANGELOG, TRADEMARK, CONTRIBUTORS, README.md, README_CN.md, and `.planning/**`. These files STILL contain `BMAD` / `BMad` / `bmad-method` / Discord / bmadcode URLs. Additionally, **`tools/installer/cli-utils.js` still contains the BMAD ASCII art glyphs and the "Build More, Architect Dreams" tagline** — the sweep's regex cannot match box-drawing characters, and the tagline is not in the mapping.
**Why it happens:** Phase 2 is cleanly described in its context doc, but the fact that Phase 3 inherits a partial state is only implicit.
**How to avoid:** §10 below has the complete "files still containing BMAD references after Phase 2" inventory. Use it as the Phase 3 task checklist.
**Warning signs:** A plan task that says "sweep docs/" with no file list. Must be explicit.

### Pitfall 3: docs/ link rot from Phase 2's blind rewrite
**What goes wrong:** Phase 2's sweep transformed `https://gomad-builder-docs.gomad.org/` (from the original `https://bmad-builder-docs.bmad.org/`). This URL points nowhere — it's a dead link inside `docs/index.md`. The rewrite is technically correct per the sweep rules but semantically broken.
**Why it happens:** A content-sweep tool cannot distinguish prose mentions of a brand from URLs whose authority is owned by the upstream.
**How to avoid:** Phase 3's `docs/` identity spot-check (D-13) must grep for `gomad.org`, `gomad-builder`, and `docs.gomad-method.org` (all broken post-sweep) and either delete the link, replace with `gomad.xgent.ai`, or replace with the GitHub repo URL. See §10 pitfall-3 inventory.
**Warning signs:** URLs of the form `*.gomad.org` or `*.gomad-method.org` — these are all broken. The real GoMad domain is `gomad.xgent.ai`.

### Pitfall 4: CNAME overwritten to wrong value
**What goes wrong:** Current `CNAME` file content is `docs.bmad-method.org`. A planner who doesn't look at the current file may assume CNAME is already set to `gomad.xgent.ai` from Phase 2 and skip the task.
**Why it happens:** CNAME was in Phase 2's exclude list only implicitly (it has no extension, matches none of the sweep globs).
**How to avoid:** Explicit task: "Replace CNAME file content with exactly `gomad.xgent.ai\n` (single line + newline)."
**Warning signs:** `cat CNAME` shows `docs.bmad-method.org`. Verified in this research — this is the current state.

### Pitfall 5: Deleting banner-bmad-method.png without editing .npmignore
**What goes wrong:** D-05 says delete `banner-bmad-method.png`. If only the file is deleted but `.npmignore` line 29 stays, `.npmignore` holds a dangling reference. Not a build break (missing file in .npmignore is a no-op) but an obvious lint finding.
**How to avoid:** Pair the delete with a one-line `.npmignore` edit. Single task, two file changes.

### Pitfall 6: README_CN.md parity drift
**What goes wrong:** D-02 says "full parity" but the CN version has different punctuation, different quotation marks, and Chinese-specific phrasing. Translator drift is easy.
**How to avoid:** Edit EN first, then translate section-by-section, NOT field-by-field. Keep the SAME markdown structure, SAME section order, SAME badge URLs, SAME code blocks. Treat the Chinese version as a localization of the English version, not a parallel authoring.

### Pitfall 7: Deleting SECURITY.md / AGENTS.md when links point to them
**What goes wrong:** D-24 says delete these files. But `CONTRIBUTING.md` line 170 references Discord (already broken by Phase 2), and other files may link to `SECURITY.md` via relative links. If the delete happens without grepping for inbound links, Phase 4's `docs:build` or `validate:refs` may fail.
**How to avoid:** Before deletion, grep for `SECURITY.md`, `AGENTS.md` as inbound link targets. Fix or remove those links in the same plan task.

### Pitfall 8: Astro build break from locales.mjs + i18n deletion lockstep
**What goes wrong:** D-19 says delete the two i18n JSON files. If `locales.mjs` still references them, Astro build fails with a module-resolve error or at runtime with "missing translation bundle."
**How to avoid:** Pair the three edits (two JSON deletes + locales.mjs edit) into a single atomic task. Verify with `cd website && npx astro check` or `npm run docs:build` at the end of the plan.

## Code Examples

### Canonical non-affiliation disclaimer (§9 — single source of truth, reused in 4 places)
```
xgent-ai is not affiliated with, endorsed by, or sponsored by BMad Code, LLC.
BMad™, BMad Method™, and BMad Core™ remain trademarks of BMad Code, LLC and are
referenced here solely for attribution purposes.
```
Paste verbatim into: (1) LICENSE GoMad block, (2) README.md `## Credits` section, (3) README_CN.md `## 致谢` (Credits) section — same English text in code block, OR an aligned Chinese translation if the planner prefers, but the English disclaimer is legally primary, (4) TRADEMARK.md non-affiliation paragraph.

### CLI banner integration (D-07 — drop-in replacement for cli-utils.js:21-44)
See §"CLI Startup Banner Pattern" above for the full code skeleton. The key edit is replacing the existing `logo` array and deleting the `tagline` line.

### Wordmark.png regeneration with sharp (D-06)
```javascript
// tools/dev/regenerate-wordmark.js (created in Phase 3, committed as dev tool)
const sharp = require('sharp');
const path = require('node:path');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="500" height="75">
  <text x="50%" y="55%" text-anchor="middle" dominant-baseline="middle"
        font-family="sans-serif" font-size="56" font-weight="700"
        fill="#0b7285">GoMad</text>
</svg>`;

sharp(Buffer.from(svg))
  .png()
  .toFile(path.join(__dirname, '..', '..', 'Wordmark.png'));
```
Dimensions match the current `Wordmark.png` (500×75). Color is cyan-teal — Claude's discretion per CONTEXT.md. **This script is committed in Phase 3 as a reproducibility aid**, NOT run at install or publish time. Regeneration is a manual one-shot operation.

### Favicon derivation (D-06)
```javascript
sharp(Buffer.from(svg))
  .resize(64, 64, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
  .png()
  .toFile(path.join(websiteDir, 'public', 'favicon.png'));
```
Using the full "GoMad" string at 64×64 looks cramped; planner may prefer a single-glyph "G" variant — Claude's discretion. Store at `website/public/favicon.png` and update `astro.config.mjs` `favicon: '/favicon.png'`. (Current config points to `/favicon.ico` which does not exist — already broken.)

### CHANGELOG v1.1.0 entry scaffold (D-09..D-12)
```markdown
# Changelog

All notable changes to GoMad are documented in this file. This changelog starts
fresh at v1.1.0 and does not include the upstream BMAD Method history. See
[LICENSE](LICENSE) and [README.md](README.md#credits) for the fork's origin.

## [1.1.0] - 2026-04-XX

### Summary
v1.1.0 re-bases `@xgent-ai/gomad` as a hard fork of BMAD Method.
`@xgent-ai/gomad@1.0.0` (a Claude Code skills installer — wrong product direction)
is deprecated on npm.

### Added
- Hard fork of BMAD Method as the new baseline for `@xgent-ai/gomad`.
- `gomad` CLI binary at `tools/installer/gomad-cli.js`.
- `src/gomad-skills/` four-phase workflow (1-analysis → 2-plan-workflows →
  3-solutioning → 4-implementation) inherited from BMAD Method.
- `src/core-skills/gm-*` shared infrastructure skills.
- LICENSE with preserved BMAD MIT notice and appended GoMad copyright block.
- TRADEMARK.md with GoMad defensive posture.

### Changed
- Package name: `@xgent-ai/gomad@1.0.0` → `@xgent-ai/gomad@1.1.0`.
- All skill prefixes: `bmad-*` → `gm-*`.
- Module directory: `src/bmm-skills/` → `src/gomad-skills/`.

### Removed
- All BMAD Method upstream changelog entries (v6.2.2 and earlier). Lineage is
  preserved via LICENSE, README Credits, and this entry.
- `banner-bmad-method.png` (no replacement banner).
- `README_VN.md`, `docs/cs/`, `docs/fr/`, `docs/vi-vn/`.
- External modules manifest and consumer code.

### BREAKING CHANGES
Nothing from `@xgent-ai/gomad@1.0.0` carries forward. v1.1.0 is effectively a
new product reusing the package name. If you installed `@xgent-ai/gomad@1.0.0`,
uninstall it before upgrading.

### Version numbering note
Version numbers reset: BMAD Method's upstream versioning (v6.x) is unrelated to
`@xgent-ai/gomad`'s versioning (1.x). See LICENSE and Credits for origin.
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Fork projects kept a `LICENSE-UPSTREAM` separate file | Single `LICENSE` with upstream block + horizontal rule + appended downstream block | ~2019+ (OpenTofu precedent, 2023) | Better license-scanner discoverability. CLAUDE.md codifies this. |
| Attribution banners at top of README | Short footer `## Credits` section | ~2020+ (Valkey, OpenTofu norm) | Less visual clutter; legal minimum is LICENSE preservation, README prominence is optional courtesy. D-04 takes this further — footer only, no intro sentence. |
| CHANGELOG preserves upstream history for lineage | Hard fork can truncate (lineage preserved elsewhere) | No fixed convention | D-10 explicitly chose truncation. Legal for MIT (no requirement to preserve changelogs). |
| npm classic automation tokens for CI | Trusted publishing (GitHub Actions OIDC) or granular access tokens with "Bypass 2FA" | Dec 2025 (npm security update) | Phase 4 concern, not Phase 3. Flagged in CREDIT_AND_NPM.md §2.3. |

**Deprecated / outdated:**
- Using `figlet` for CLI banners in small CLIs: still works but adds a dep for a one-time render. Modern practice: hand-author or generate once and paste. D-07 is aligned with this.
- `.ico` favicons: modern browsers and Starlight both accept PNG favicons. `.ico` byte-packing is unnecessary complexity. Use `favicon.png`.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Jest 30.2.0 (unit/integration) + `markdownlint-cli2` 0.19.1 (doc lint) + custom scripts (`validate:refs`, `validate:skills`) |
| Config file | `eslint.config.mjs`, `prettier.config.mjs`, `.markdownlint-cli2.yaml`, `package.json` scripts |
| Quick run command | `npm run lint:md` (markdown), `npm run lint` (JS) |
| Full suite command | `npm run quality` (format:check + lint + lint:md + docs:build + test:install + validate:refs + validate:skills) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CREDIT-01 | LICENSE preserves BMAD MIT text byte-identical | byte-diff against baseline | `diff <(head -n 31 LICENSE) test/fixtures/license-bmad-baseline.txt && [ $? -eq 0 ]` | ❌ Wave 0 — baseline snapshot must be created |
| CREDIT-01 | LICENSE contains appended GoMad block with disclaimer | grep | `grep -q "Copyright (c) 2026 Rockie Guo" LICENSE && grep -q "not affiliated with, endorsed by, or sponsored by BMad Code" LICENSE` | ✅ (grep built-in) |
| CREDIT-02 | README.md has `## Credits` section with fork statement + disclaimer | grep | `grep -q "^## Credits" README.md && grep -q "hard fork of BMAD Method" README.md && grep -q "not affiliated" README.md` | ✅ |
| CREDIT-02 | README_CN.md has `## Credits` (or `## 致谢`) section | grep | `grep -qE "^## (Credits\|致谢)" README_CN.md` | ✅ |
| CREDIT-03 | TRADEMARK.md is GoMad-authored (no BMAD wordmark claim) | grep negative + positive | `! grep -q "trademarks of BMad Code, LLC covering" TRADEMARK.md && grep -q "GoMad" TRADEMARK.md` | ✅ |
| CREDIT-04 | CONTRIBUTORS.md preserves original BMAD section byte-identical | byte-diff against baseline | `diff <(sed -n '1,30p' CONTRIBUTORS.md) test/fixtures/contributors-bmad-baseline.txt` | ❌ Wave 0 — baseline snapshot |
| CREDIT-04 | CONTRIBUTORS.md has GoMad contributors section appended | grep | `grep -q "^## GoMad Contributors" CONTRIBUTORS.md` | ✅ |
| BRAND-01 | `banner-bmad-method.png` is deleted | file absence | `! test -f banner-bmad-method.png` | ✅ |
| BRAND-01 | `Wordmark.png` exists (regenerated) | file presence + modification-time sanity | `test -f Wordmark.png && [ $(stat -f %m Wordmark.png) -gt $PHASE3_START_EPOCH ]` | ✅ |
| BRAND-02 | CLI banner shows GoMad (not BMAD) when rendered | grep source + manual TTY smoke test | `! grep -q "BMAD\|Build More, Architect Dreams" tools/installer/cli-utils.js` | ✅ |
| BRAND-02 | CLI banner degrades in non-TTY | manual smoke | `NO_COLOR=1 node tools/installer/gomad-cli.js install --help \| cat > /tmp/out.txt; grep -q "GoMad" /tmp/out.txt` | ⚠️ manual-only (invokes clack; use a non-interactive harness or just `--version` if D-08 allows) |
| DOCS-01 | README.md has `@xgent-ai/gomad` install instructions | grep | `grep -q "npm install @xgent-ai/gomad\|npx @xgent-ai/gomad" README.md` | ✅ |
| DOCS-02 | README_CN.md mirrors README.md section headings | diff heading list | `diff <(grep '^##' README.md \| wc -l) <(grep '^##' README_CN.md \| wc -l)` | ✅ |
| DOCS-03 | CNAME is `gomad.xgent.ai` | exact match | `[ "$(cat CNAME)" = "gomad.xgent.ai" ]` | ✅ |
| DOCS-04 | CHANGELOG.md starts with v1.1.0 (truncation verified) | grep first version heading | `grep -m1 '^## \[1\.1\.0\]\|^## 1\.1\.0' CHANGELOG.md` returns line 1 of version headings | ✅ |
| DOCS-04 | CHANGELOG.md has no v6.x upstream entries | grep negative | `! grep -q '^## \[6\.\|^## v6\.' CHANGELOG.md` | ✅ |
| DOCS-04 | CHANGELOG.md contains BREAKING CHANGES subsection | grep | `grep -q "^### BREAKING CHANGES" CHANGELOG.md` | ✅ |
| DOCS-05 | SECURITY.md deleted or minimal | absent OR `wc -l < SECURITY.md -lt 20` | `! test -f SECURITY.md \|\| [ $(wc -l < SECURITY.md) -lt 20 ]` | ✅ |
| DOCS-05 | AGENTS.md deleted or minimal | same | `! test -f AGENTS.md \|\| [ $(wc -l < AGENTS.md) -lt 20 ]` | ✅ |
| DOCS-05 | CONTRIBUTING.md has no Discord link | grep negative | `! grep -q "discord.gg/gk8jAdXWmj" CONTRIBUTING.md` | ✅ |
| DOCS-06 | docs/index.md has no "Build More Architect Dreams" acronym expansion | grep negative | `! grep -q "Build More.*Architect Dreams" docs/index.md` | ✅ |
| DOCS-06 | docs/ has no `gomad.org` / `bmad-method.org` dead links | grep negative | `! grep -rq "gomad\.org\|bmad-method\.org\|gomad-builder-docs" docs/` | ✅ |
| DOCS-06 | website/ stub: index.astro exists | file presence | `test -f website/src/pages/index.astro` | ✅ |
| DOCS-06 | website/ stub: fr-FR + vi-VN i18n deleted | file absence | `! test -f website/src/content/i18n/fr-FR.json && ! test -f website/src/content/i18n/vi-VN.json` | ✅ |
| DOCS-06 | website/ build still passes after stub | `cd website && npm run build` or `astro check` | `cd website && npx astro check` (lightweight) | ✅ |
| DOCS-07 | `docs/mobmad-plan.md` deleted | already done in Phase 2 | `! test -f docs/mobmad-plan.md` | ✅ |
| Every D-XX decision | implemented | checklist | Manual review checklist against CONTEXT.md D-01..D-25 at end of phase | ✅ (human review gate) |

### Sampling Rate
- **Per task commit:** Run the specific grep / diff checks for that task's requirement IDs (subset of the table above).
- **Per plan merge:** Run `npm run lint:md` + the full grep battery for the plan's REQ IDs.
- **Phase gate:** Run `npm run quality` before `/gsd-verify-work` hands off to Phase 4. This is a pre-Phase-4 smoke; the canonical Phase 4 gate is `npm run quality` again under stricter conditions (VFY-01).

### Wave 0 Gaps
- [ ] `test/fixtures/license-bmad-baseline.txt` — snapshot of the first 31 lines of the current LICENSE file, created at the start of plan 03-01 by simply copying `head -n 31 LICENSE > test/fixtures/license-bmad-baseline.txt`. Used for byte-identical preservation verification.
- [ ] `test/fixtures/contributors-bmad-baseline.txt` — snapshot of the first ~30 lines of the current CONTRIBUTORS.md, same purpose.
- [ ] Set `PHASE3_START_EPOCH` env var (or equivalent timestamp file) at plan start so Wordmark.png regeneration can be proven fresh.
- [ ] Ensure `markdownlint-cli2` is installed in CI (verified — it's in package.json devDependencies, so `npm ci` is sufficient).
- [ ] Verify `scripts.docs:build` still works before and after website stub (sanity baseline).

*(No new test files or frameworks required. All verification uses grep/diff/file-existence via the existing test infrastructure. The baseline fixture files are the only Wave 0 additions.)*

## Security Domain

> Included because `security_enforcement` is not explicitly disabled in `.planning/config.json`. Phase 3 is content-only so the surface is small, but there are still meaningful concerns.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | Phase 3 does not touch auth code. |
| V3 Session Management | No | Same. |
| V4 Access Control | No | Same. |
| V5 Input Validation | **Partial** | CLI banner uses `prompts.getColor()` — picocolors reads env vars `NO_COLOR`, `FORCE_COLOR`. These are trusted because they're environment configuration, not user input. No new input surfaces in Phase 3. |
| V6 Cryptography | No | No crypto in scope. |
| V14 Configuration | **Yes** | `CNAME`, `.npmignore`, `astro.config.mjs` — all configuration files. The concern: accidentally shipping the wrong CNAME (pointing production DNS at BMAD) or accidentally publishing `banner-bmad-method.png` through a broken `.npmignore`. |
| V9 Communication / URLs | **Yes** | docs/ link rot (`gomad.org`, `bmad-builder-docs.gomad.org`) — broken links are not a security vulnerability but dead links that resolve to a parked domain ARE a security risk if the parked domain is later bought by a malicious actor. Mitigation: strip all dead domain references, don't just "update" them. |

### Known Threat Patterns for this phase

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Stale external URL pointing to hijacked domain | Tampering / Spoofing | Grep and delete all `*.gomad.org`, `*.gomad-method.org`, `docs.bmad-method.org` references. Do not "update" them to `gomad.xgent.ai` blindly — some links were to specific subpages that won't exist at the new domain either. Delete > redirect. |
| Trademark infringement claim from BMAD Code LLC | Legal / Spoofing | D-21 defensive posture; non-affiliation disclaimer in LICENSE + README + TRADEMARK.md; nominative-fair-use language restricts BMAD references to attribution only. CREDIT_AND_NPM.md §1.6 confirms BMAD's own TRADEMARK.md explicitly permits "fork under different name" — this phase stays inside the lines BMAD drew. |
| Shipping `banner-bmad-method.png` to npm registry via broken .npmignore | Data leak / brand confusion | Pair the file deletion with the `.npmignore` line removal and verify with `npm pack --dry-run` (Phase 4 concern but should be smoke-checked in Phase 3). |
| Accidentally shipping `.planning/` to npm | Data leak | Already excluded by `.npmignore`. Phase 3 does not create any new top-level files that would need exclusion. |

## Assumptions Log

> Claims tagged `[ASSUMED]` in this research that the planner or discuss-phase should confirm:

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `CLIUtils.displayLogo()` is currently invoked from `tools/installer/commands/install.js` (not from `gomad-cli.js` directly), so swapping the logo content leaves `--version` and `--help` banner-free per D-08. | §CLI Startup Banner | If the banner IS invoked from `gomad-cli.js`, D-08 forces a refactor to move the invocation into `install.js`. Small refactor, ~5 lines. Planner should verify with `grep -rn 'displayLogo' tools/installer/`. |
| A2 | The current `LICENSE` file is byte-identical to upstream BMAD's `LICENSE` at the fork point (commit `ad2434b`). | §LICENSE Composition | If the current working tree has already drifted from upstream (e.g., a stray whitespace edit), the byte-preservation claim starts from the current file, not from a hypothetical "pristine upstream." This is fine for Phase 3 — we preserve the CURRENT LICENSE state — but the baseline fixture must be created from the current file before any edits. |
| A3 | Starlight's `favicon` config accepts PNG paths (not just `.ico`). | §Favicon Derivation | If Starlight requires `.ico`, the favicon-generation code needs a `.ico` encoder (sharp doesn't natively produce .ico). Workaround: use `png-to-ico` dep, or use an online converter one-time. |
| A4 | `docs:build` (`npm run docs:build`) currently passes with the existing `bmad-method`-flavored content. | §Validation Architecture | If it's already broken, Phase 3 shouldn't own fixing it. Run `npm run docs:build` as a baseline before any edits. |
| A5 | Sharp's SVG text rendering with `font-family="sans-serif"` produces a usable glyph on the execution machine (macOS in this case). | §Environment Availability / Wordmark | If sharp/librsvg cannot find a system font, text comes out as empty boxes or missing glyphs. Fallback: hand-embed a web font via base64 `<defs>`, or commit a hand-exported PNG. |
| A6 | "GoMad" can be asserted as an unregistered trademark by xgent-ai without formal USPTO filing, purely through commercial use. | §TRADEMARK.md posture / D-21 | The defensive posture relies on common-law trademark which exists from first use but is weaker than registered marks. If user expects registered-mark protection, that's a separate (out of scope) filing task. Planner/discuss-phase should confirm common-law scope is sufficient for v1.1. |
| A7 | The correct trademark owner naming is "xgent-ai" (unregistered org) rather than "Rockie Guo" (sole proprietor) — this is a legal cleanliness question. | §D-21 owner naming | User explicitly left this to Claude's discretion "whichever is legally cleanest." The legally cleanest answer depends on whether xgent-ai is registered as a business entity anywhere. If not, "Rockie Guo" (an identifiable natural person) is cleaner than "xgent-ai" (an unregistered trade name). Research does not have enough info to decide — flagging. |

## Open Questions

1. **Tagline yes/no for v1.1?**
   - What we know: CONTEXT.md leaves this to Claude's discretion and notes v1.1 may ship without a tagline to avoid marketing fluff. The existing BMAD `displayLogo()` code has `const tagline = '    Build More, Architect Dreams';`.
   - What's unclear: Whether dropping the tagline line entirely is the cleanest degradation, or whether a neutral descriptor line (e.g., version only) should replace it.
   - Recommendation: Drop the tagline line entirely in Phase 3 (minimalism principle matches D-09 "factual + minimal"). If the user wants a tagline later, add it in milestone 2.

2. **Does the website stub need to kill the Starlight integration entirely, or just shadow the root route?**
   - What we know: Astro routes explicit pages before content collections; creating `src/pages/index.astro` shadows the Starlight root.
   - What's unclear: Whether the discoverable docs subroutes (`/getting-started/`, etc.) should also be hidden, or whether leaving them visible (with GoMad-swept content from Phase 2) is acceptable for v1.1.
   - Recommendation: Leave subroutes live but untested — D-18 says "stub the entire website" but also says "Do NOT rewrite Astro content collections, navigation, i18n, or components in Phase 3." The pragmatic read: only the root gets a stub, the rest is whatever Phase 2's sweep left. Confirm with user during planning.

3. **Owner-naming for TRADEMARK.md ("xgent-ai" vs "Rockie Guo") — see A7.**
   - Recommendation: Use `xgent-ai (operated by Rockie Guo)` in the first sentence; use `xgent-ai` shorthand thereafter. This anchors the legal identity in a natural person while still establishing the trade-name form. Alternative: ask user in discuss-phase (already happened, user deferred to research).

## Sources

### Primary (HIGH confidence)
- `LICENSE` (current working tree) — Verified byte-content via Read tool.
- `README.md`, `README_CN.md`, `CHANGELOG.md`, `TRADEMARK.md`, `CONTRIBUTORS.md`, `CONTRIBUTING.md`, `SECURITY.md`, `AGENTS.md` (current working tree) — All read to establish "before" state.
- `tools/installer/cli-utils.js`, `tools/installer/gomad-cli.js`, `tools/installer/prompts.js` — Verified via Read tool for CLI banner integration point.
- `.planning/research/CREDIT_AND_NPM.md` — Prior phase-0 research on MIT mechanics, real-world fork precedents (OpenTofu, Valkey, Forgejo), nominative fair use test.
- `.planning/research/RENAME_MECHANICS.md` — File-level inventory from Phase 0 scouting.
- `.planning/phases/01-foundation/01-CONTEXT.md`, `.planning/phases/02-rename/02-CONTEXT.md` — Locked prior phase decisions (especially Phase 2 exclude list and fixture rename status).
- `.planning/phases/03-credit-branding-docs/03-CONTEXT.md` — 25 locked D-XX decisions.
- `package.json` — Verified dep versions via grep.
- `website/astro.config.mjs`, `website/src/lib/locales.mjs` — Verified current i18n config state.

### Secondary (MEDIUM confidence — verified against primary)
- [CREDIT_AND_NPM.md §1.2 OpenTofu LICENSE precedent] — [CITED: https://github.com/opentofu/opentofu/blob/main/LICENSE] — Used to justify the single-file append pattern.
- [CREDIT_AND_NPM.md §1.6 BMAD TRADEMARK.md nominative fair use grant] — [VERIFIED via direct read of current `TRADEMARK.md` in working tree, lines 20-25].
- [picocolors NO_COLOR / FORCE_COLOR / isTTY handling] — [CITED: https://github.com/alexeyraspopov/picocolors README]. Not re-verified via Context7; the behavior is well-known and the library is already in use in the tree.

### Tertiary (LOW confidence / assumed)
- A3 (Starlight favicon accepts PNG) — not verified against Starlight docs in this session. [ASSUMED]
- A5 (sharp SVG text rendering with generic font) — behavior varies by platform. [ASSUMED]
- A6 (common-law trademark sufficiency) — not a legal opinion, general understanding only. [ASSUMED]

## Metadata

**Confidence breakdown:**
- LICENSE / CONTRIBUTORS composition: HIGH — pattern is locked by CLAUDE.md and CREDIT_AND_NPM.md; current file verified readable.
- CHANGELOG truncation: HIGH — D-10 is explicit, legal for MIT.
- CLI banner: HIGH — integration point verified in cli-utils.js; picocolors degradation well-documented.
- Wordmark + favicon regeneration: MEDIUM — sharp is installed and capable, but font rendering is platform-dependent (A5).
- docs/ spot-check inventory: HIGH — grep results are deterministic and captured in §10.
- Website stub: MEDIUM — Astro routing behavior assumed from docs, not directly tested in this session. Locales.mjs coupling verified.
- TRADEMARK.md posture / owner naming: MEDIUM — D-21 is explicit on the asks, but owner naming (A7) is genuinely undecided.

**Research date:** 2026-04-09
**Valid until:** 2026-05-09 (stable content; 30 days)

---

## Appendix §10 — File Inventory: "What Phase 3 Actually Edits"

The most valuable artifact for the planner. Every file Phase 3 touches, with the nature of the change. Use this to generate the task list.

### Category 1: Legal + Identity (Plan 03-01)

| File | Current state | Phase 3 action | D-XX | Notes |
|------|---------------|----------------|------|-------|
| `.planning/REQUIREMENTS.md` | CREDIT-02 + BRAND-01 have unrelaxed wording (lines 41, 47) | **Edit** — apply CONTEXT.md `<requirement_deltas>` verbatim | Pre-plan | Wave 0 task. Must land BEFORE the files those requirements constrain, so the phase-gate validator stays consistent. |
| `.planning/ROADMAP.md` | Phase 3 success criteria (2) and (4) have unrelaxed wording | **Edit** — apply CONTEXT.md `<requirement_deltas>` verbatim | Pre-plan | Same as above. Both files committed in a single "apply Phase 3 requirement deltas" commit before the feature work begins. |
| `LICENSE` | 31 lines: BMAD MIT block byte-identical to upstream; includes BMAD TRADEMARK NOTICE at lines 26-30 | **Append-only** — add HR + GoMad copyright block + non-affiliation disclaimer. DO NOT touch lines 1-31. | CREDIT-01, D-21 | Wave 0 task creates baseline fixture first (see Validation Architecture). |
| `TRADEMARK.md` | 55 lines: BMAD Code LLC asserting trademark over BMAD wordmark | **Full rewrite** — GoMad defensive posture per D-21 five-point structure | CREDIT-03, D-21, D-22 | Use canonical disclaimer from §9. Do NOT apologize for asymmetry with upstream. |
| `CONTRIBUTORS.md` | 32 lines: BMAD-authored contributor acknowledgment | **Append-only** — add HR + `## GoMad Contributors` section with Rockie Guo | CREDIT-04, D-23 | Byte-preserve lines 1-32. |
| `CONTRIBUTING.md` | 182 lines: 4 Discord links (`discord.gg/gk8jAdXWmj`), BMad-specific community processes, references BMad philosophy | **Content rewrite** — identity sweep, delete Discord lines, delete BMAD team roles, add rockie@kitmi.com.au contact, PR flow via xgent-ai/gomad | DOCS-05, D-25 | Phase 2 sweep caught `BMad` → `GoMad` but Discord URLs and "our community" marketing language survived. |
| `SECURITY.md` | 85 lines: Mostly GoMad-swept but line 26 has dead Discord link | **Delete** OR reduce to ~10-line stub with `rockie@kitmi.com.au` contact | DOCS-05, D-24 | D-24 prefers delete. Planner must grep for inbound links first (Pitfall 7). |
| `AGENTS.md` | 12 lines: already minimal, swept by Phase 2 | **Delete** OR leave as-is (already minimal) — D-24 prefers delete | DOCS-05, D-24 | Lowest-value file; delete is fine. |
| `CHANGELOG.md` | 1889 lines, 100 BMAD mentions, versions from v6.2.2 down to v1.0.x upstream history | **Truncate + new entry** — delete lines 3-1889, write fresh v1.1.0 entry per §Code Examples scaffold | DOCS-04, D-09, D-10, D-11, D-12 | This is the largest delete in Phase 3. ~1880 lines removed. |
| `CNAME` | Current content: `docs.bmad-method.org` | **Replace** with `gomad.xgent.ai` (single line + newline) | DOCS-03, D-20 | Pitfall 4. |
| `.npmignore` | Line 29: `banner-bmad-method.png` | **Delete line 29** in same task as `banner-bmad-method.png` deletion | BRAND-01, D-05 | Pitfall 5. |

### Category 2: Surface + Assets (Plan 03-02)

| File | Current state | Phase 3 action | D-XX | Notes |
|------|---------------|----------------|------|-------|
| `README.md` | 108 lines, 34 BMAD hits, line 1 has `![BMad Method](banner-bmad-method.png)`, lines 10-30 have BMAD marketing prose, "What's Next for BMad" roadmap, Discord community section, contrib-rocks badge pointing at `bmad-code-org/BMAD-METHOD`, trademark footer | **Surgical edit** per D-01: delete line 1 (banner image), delete "Build More Architect Dreams" tagline (line 10), delete "What's Next for BMad" section (lines 28-35), update badges (npm → `@xgent-ai/gomad`), update install command to `npx @xgent-ai/gomad install`, drop Discord link entirely, replace contrib-rocks repo URL with `xgent-ai/gomad`, delete BMAD trademark footer line 104, add `## Credits` footer section with canonical disclaimer | DOCS-01, CREDIT-02, D-01, D-03, D-04 | Do NOT add fork statement in intro (D-04). |
| `README_CN.md` | 108 lines, 33 BMAD hits, same structure as EN | **Surgical edit** — section-for-section Chinese mirror of README.md edits | DOCS-02, D-02 | Pitfall 6. Edit EN first, then mirror. |
| `tools/installer/cli-utils.js` | Lines 21-44: `displayLogo()` with BMAD ASCII art (`██████╗ ███╗   ███╗ █████╗ ██████╗`) and `'    Build More, Architect Dreams'` tagline | **Replace logo string + delete tagline line** per §CLI Startup Banner Pattern | BRAND-02, D-07, D-08 | Phase 2 sweep missed this because glyphs are not substring matches. |
| `tools/installer/gomad-cli.js` | Line 87: `description('GOMAD Core CLI - Universal AI agent framework')` — already GoMad-flavored | **Verify only** — no edit needed unless banner-invocation refactor from A1 applies | — | A1 assumption. |
| `banner-bmad-method.png` | 28 KB PNG at repo root | **Delete** | BRAND-01, D-05 | Paired with .npmignore edit. |
| `Wordmark.png` | 500×75 PNG, BMAD-branded wordmark | **Regenerate in place** with GoMad typography via `tools/dev/regenerate-wordmark.js` (new committed script) | BRAND-01, D-06 | Filename stays the same; .npmignore line 30 needs no change. |
| `website/public/favicon.png` | Does not exist | **Create** 64×64 PNG via same sharp script | BRAND-01, D-06 | Requires `astro.config.mjs` favicon path update. |
| `website/astro.config.mjs` | Line 48: `favicon: '/favicon.ico'` (file doesn't exist); has Discord social link; has GitHub link `gomad-code-org/GOMAD-METHOD` (wrong — Phase 2 over-rewrote); has tagline string | **Edit** — change favicon path to `/favicon.png`, remove Discord social entry, fix GitHub link to `xgent-ai/gomad`, update title/tagline if Claude picks one | DOCS-06, D-18 | Surgical edit; keep the Starlight integration structurally. |
| `website/src/pages/index.astro` | Does not exist | **Create** minimal stub per §website/ Stub Pattern | DOCS-06, D-18 | New file. |
| `website/src/content/i18n/fr-FR.json` | 1170 bytes, French translations | **Delete** | DOCS-06, D-19 | Pitfall 8. |
| `website/src/content/i18n/vi-VN.json` | 1309 bytes, Vietnamese translations | **Delete** | DOCS-06, D-19 | Same. |
| `website/src/content/i18n/zh-CN.json` | 1076 bytes | **Keep** | — | — |
| `website/src/lib/locales.mjs` | Lines 20, 28: `lang: 'vi-VN'`, `lang: 'fr-FR'` entries | **Edit** — remove both entries | DOCS-06, D-19 | Must be in same task as JSON deletes or Astro build fails (Pitfall 8). |
| `docs/index.md` | Phase 2 swept to GoMad identity. **But still contains:** (a) BMAD acronym expansion `(**B**uild **M**ore **A**rchitect **D**reams)` line 5 — mangled by sweep, (b) dead link `https://gomad-builder-docs.gomad.org/` line 37, (c) `BMM phases` reference line 21 (legacy abbreviation the sweep missed) | **Full rewrite** per D-14 from scratch in GoMad voice | DOCS-06, D-14 | Delete the BMAD acronym reveal, delete the dead link, write landing page that explains GoMad, install, where to go next. |
| `docs/zh-cn/index.md` | Same pattern as EN — swept but has `(**B**uild **M**ore **A**rchitect **D**reams)` and `BMM` legacy reference | **Full rewrite** per D-17 (Chinese voice) | DOCS-06, D-17 | Section-for-section mirror of `docs/index.md`. |
| `docs/_STYLE_GUIDE.md` | Phase 2 swept | **Edit** — update any BMAD-specific conventions to match GoMad `gm-*` skill naming, `gomad-skills/` module path, GoMad casing rule | DOCS-06, D-15 | Content rewrite, not full rewrite. |
| `docs/zh-cn/_STYLE_GUIDE.md` | Same | **Edit** — mirror of EN | DOCS-06, D-17 | — |
| `docs/roadmap.mdx` | Phase 2 swept; already says "GoMad is a hard fork of an upstream agile-AI-driven-development framework" | **Verify only** — content already aligns with Phase 3 goals | — | Low-value task; confirm no BMAD leakage then move on. |
| `docs/404.md`, `docs/zh-cn/404.md` | Phase 2 swept | **Verify only** | — | Trivial. |
| `docs/{explanation,how-to,reference,tutorials}/**` + `docs/zh-cn/{...}/**` | 62 files in EN, 30 in CN. Phase 2 swept. | **Identity spot-check** per D-13 / D-16 / D-17 — do NOT deep-rewrite. Grep for: `gomad.org`, `gomad-method.org`, `gomad-builder-docs`, `Build More`, `BMad Method Module Ecosystem`, Discord URLs, `bmadcode.com`, `contact@bmadcode.com`, `buymeacoffee.com/bmad`. Fix or delete each hit. | DOCS-06, D-13 | ~92 files to grep. Automate: `grep -rln 'pattern1\|pattern2\|...' docs/ \| xargs -I{} $EDITOR {}`. |
| `tools/dev/regenerate-wordmark.js` | Does not exist | **Create** — committed dev script for reproducibility (see §Code Examples) | BRAND-01, D-06 | Single file, ~20 lines. Not shipped in npm tarball (tools/dev excluded or not in files allowlist). |

### Category 3: No-op verifications

| File | Current state | Phase 3 action | Notes |
|------|---------------|----------------|-------|
| `docs/mobmad-plan.md` | Already deleted in Phase 2 (per Phase 2 CONTEXT D-16) | **Verify absent** | DOCS-07 closed in Phase 2. |
| `README_VN.md` | Already deleted in Phase 1 | **Verify absent** | — |
| `docs/cs/`, `docs/fr/`, `docs/vi-vn/` | Already deleted in Phase 1 | **Verify absent** | — |
| `test/fixtures/file-refs-csv/valid/gomad-style.csv` | Already renamed in Phase 2 | **Verify present** | — |
| `package.json` | Already set in Phase 1 and Phase 2 | **Do NOT touch** | Phase 4 owns any further package.json edits. |

### Total change footprint (approximate)
- **Files created:** 4 (`index.astro`, `favicon.png`, `Wordmark.png` regen, `regenerate-wordmark.js`, baseline fixtures in test/fixtures) — ~6 new files.
- **Files deleted:** 4-5 (`banner-bmad-method.png`, `fr-FR.json`, `vi-VN.json`, `SECURITY.md`, `AGENTS.md`).
- **Files edited (substantive):** 13 — REQUIREMENTS.md, ROADMAP.md, LICENSE, TRADEMARK.md, CONTRIBUTORS.md, CONTRIBUTING.md, CHANGELOG.md, CNAME, .npmignore, README.md, README_CN.md, cli-utils.js, astro.config.mjs, locales.mjs, docs/index.md, docs/_STYLE_GUIDE.md, docs/zh-cn/index.md, docs/zh-cn/_STYLE_GUIDE.md.
- **Files edited (spot-check only):** ~92 in docs/ subtrees.
- **Lines deleted net:** ~1900+ (CHANGELOG truncation dominates).

This inventory is the direct input to the plan task list. Every row is a potential task or subtask.
