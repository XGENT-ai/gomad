---
status: partial
phase: 03-credit-branding-docs
source: [03-VERIFICATION.md]
started: 2026-04-09T03:12:35Z
updated: 2026-04-09T03:15:00Z
---

## Current Test

[awaiting human testing]

## How to run each test

Each test below lists:
- **command(s)** — what to run from the repo root (`/Users/rockie/Documents/GitHub/xgent/gomad`)
- **look for** — the specific things to eyeball and judge
- **mark result as** — `pass` / `issue: <description>`

For tests that boot the installer or docs site in an interactive TTY, run them in a real terminal
(not inside this chat) so prompts and colors render correctly.

---

## Tests

### 1. CLI banner visual quality in 80-col TTY

**command:**
```bash
# Resize your terminal to exactly 80 columns first, then:
node tools/installer/gomad-cli.js install
# (you can Ctrl+C at the first interactive prompt — we only need the banner)
```

Alternative (non-interactive, just the logo):
```bash
node -e "require('./tools/installer/ui.js').displayLogo()"
```

**look for:**
- ASCII art reads as "GoMad" (not wrapped, not chopped, not double-rendered)
- No stray color escape codes like `\x1b[…m` bleeding through
- Banner fits inside 80 columns (no horizontal scroll, no line breaks mid-letter)
- No leftover "BMAD" strings anywhere in the output

**mark result as:** `pass` or `issue: <what you saw>`

expected: `tools/installer/cli-utils.js` `displayLogo()` renders cleanly in an 80-column terminal with no wrap, alignment, or color-code artifacts; ASCII art reads as "GoMad".
result: [pending]

---

### 2. TRADEMARK.md legal posture clarity

**command:**
```bash
# Render in your preferred markdown viewer, or just:
less TRADEMARK.md
# (or open TRADEMARK.md in your editor)
```

**look for:**
- Reads clearly to a non-lawyer (you should be able to skim it in <2 min and know what's OK to say)
- Non-affiliation disclaimer is unambiguous ("GoMad is not affiliated with / endorsed by GoMad Code, LLC")
- Nominative fair-use framing is defensible — it explains *why* we can reference "BMAD Method" in attribution without implying endorsement
- No contradictions with `LICENSE` (which carries the same canonical disclaimer)

**mark result as:** `pass` or `issue: <what was unclear or wrong>`

expected: TRADEMARK.md reads clearly to a non-lawyer; non-affiliation disclaimer is unambiguous; nominative fair-use framing is defensible.
result: [pending]

---

### 3. Wordmark.png visual quality

**command:**
```bash
# macOS:
open Wordmark.png
# Linux:
xdg-open Wordmark.png
# Or view in your file manager / editor preview pane.
```

Optional — regenerate from source to confirm the script is reproducible:
```bash
node tools/dev/regenerate-wordmark.js
# then `open Wordmark.png` again
```

**look for:**
- Reads clearly as "GoMad" at normal viewing size
- No rendering artifacts from the sharp pipeline (jagged edges, color bleed, missing alpha)
- Reasonable proportions (not stretched, not pixelated)
- Background is transparent (or whatever the script intends) — drop it onto both a light and dark background mentally

**mark result as:** `pass` or `issue: <what was off>`

expected: Regenerated `Wordmark.png` is visually acceptable as the project mark; no rendering/bleed artifacts from the sharp regeneration script.
result: [pending]

---

### 4. docs/index.md + docs/zh-cn/index.md readability

**command:**
```bash
# Fastest: just read the source
less docs/index.md
less docs/zh-cn/index.md
```

Or render with the live docs site:
```bash
npm run docs:dev
# then open the URL it prints (usually http://localhost:4321/) and visit:
#   /          (English landing)
#   /zh-cn/    (Chinese landing)
# Ctrl+C to stop when done.
```

**look for:**
- Both pages work as onboarding for a first-time reader (they know what GoMad is, what to install, where to go next)
- Navigation/links feel sensible (no dead-end pages, no links to the old BMAD docs)
- EN and CN versions are at parity — same sections in the same order, same depth (content may be translated but structure should match)
- No accidental English leaking into the Chinese version or vice versa
- No stale "BMAD" references in either version

**mark result as:** `pass` or `issue: <what drifted or was unclear>`

expected: English and Chinese docs landing pages read well as onboarding; navigation makes sense; EN/CN content parity holds.
result: [pending]

---

### 5. README.md + README_CN.md prose + EN/CN parity

**command:**
```bash
less README.md
less README_CN.md
```

Or view rendered on GitHub:
```bash
# Push the branch and open it in GitHub, or use gh:
gh browse README.md
gh browse README_CN.md
```

**look for:**
- Prose flows naturally (not machine-translated or stitched-together-feeling)
- GoMad "Credits" footer is present and correctly placed near the end of both files
- The canonical non-affiliation disclaimer in Credits matches the one in `LICENSE` and `TRADEMARK.md` verbatim
- EN and CN are in parity modulo language — same headings, same badges (except where intentionally dropped, e.g., uv badge), same install/quick-start sections
- No leftover "BMAD Method" branding in titles/headings (attribution in Credits is fine, branding is not)

**mark result as:** `pass` or `issue: <what drifted>`

expected: README prose flows naturally; GoMad Credits footer is correctly placed; EN/CN versions are in parity modulo language.
result: [pending]

---

## Summary

total: 5
passed: 0
issues: 0
pending: 5
skipped: 0
blocked: 0

## Gaps
