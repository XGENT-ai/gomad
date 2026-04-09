---
phase: 3
slug: credit-branding-docs
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-09
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | jest 30.x (unit) + bash asserts (byte-identical + grep checks) + `npm run build` (website stub) |
| **Config file** | `package.json` (jest), no config for bash asserts |
| **Quick run command** | `node test/validate-phase-03.js` (to be added in Wave 0) |
| **Full suite command** | `npm run lint && npm test && npm run build:website` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `node test/validate-phase-03.js` (quick grep + diff asserts)
- **After every plan wave:** Run `npm run lint && npm test`
- **Before `/gsd-verify-work`:** Full suite must be green, including `npm run build:website`
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

*Populated by planner during plan generation. Every task in 03-01-PLAN.md and 03-02-PLAN.md must map to exactly one row here.*

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| TBD | TBD | TBD | TBD | — | TBD | TBD | TBD | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `test/validate-phase-03.js` — grep + diff asserts for Phase 3 invariants (see §Invariants below)
- [ ] `test/fixtures/bmad-license-upstream.txt` — snapshot of upstream BMAD MIT block for byte-identical diff
- [ ] `test/fixtures/bmad-contributors-upstream.txt` — snapshot of upstream CONTRIBUTORS list for byte-identical diff

---

## Phase 3 Invariants (checked by `test/validate-phase-03.js`)

1. **LICENSE byte-identical preservation** — `diff LICENSE test/fixtures/bmad-license-upstream.txt` on the BMAD block (lines above the horizontal rule) exits 0.
2. **CONTRIBUTORS byte-identical preservation** — same, on the BMAD contributor list above the horizontal rule.
3. **No `banner-bmad-method.png` references** — `grep -r 'banner-bmad-method' --include='*.md' --include='*.json' --include='*.npmignore'` returns zero matches. File itself does not exist on disk.
4. **No `banner-gomad.png` references** — per D-05, no replacement banner. Grep must return zero matches.
5. **README fork statement in Credits only, not intro** — README.md and README_CN.md have exactly one `## Credits` section, and the substring "hard fork of BMAD" appears only within that section (grep line numbers must be inside the Credits section).
6. **Non-affiliation disclaimer identical across 4 files** — exact-match presence of the canonical disclaimer sentence in LICENSE, README.md Credits, README_CN.md Credits, TRADEMARK.md.
7. **CLI banner shows "GoMad" in TTY + degrades in non-TTY** — `node tools/installer/gomad-cli.js --version | grep -c GoMad` ≥ 1; `NO_COLOR=1 node tools/installer/gomad-cli.js --version` exits 0 with plain-text output; `CI=true node tools/installer/gomad-cli.js --version` exits 0.
8. **No BMAD ASCII art or "Build More, Architect Dreams" tagline in CLI code** — `grep -E 'Build More|Architect Dreams|BMAD' tools/installer/cli-utils.js` returns zero matches.
9. **CNAME file correct** — `cat CNAME` equals `gomad.xgent.ai\n`. No other CNAME file exists in repo.
10. **Deleted files are actually gone** — `test ! -f SECURITY.md && test ! -f AGENTS.md && test ! -f banner-bmad-method.png && test ! -f website/src/content/i18n/fr-FR.json && test ! -f website/src/content/i18n/vi-VN.json`.
11. **website/src/lib/locales.mjs no longer references fr-FR or vi-VN** — `grep -E 'fr-FR|vi-VN' website/src/lib/locales.mjs` returns zero matches.
12. **Astro website builds** — `npm run build:website` (or equivalent) exits 0 after i18n file deletion and index.astro stub creation.
13. **CHANGELOG starts at v1.1.0** — `head -30 CHANGELOG.md | grep -c '1.1.0'` ≥ 1; no v6.x or v1.0.0 entries remain in file.
14. **CHANGELOG v1.1.0 has BREAKING CHANGES subsection** — `grep -c 'BREAKING CHANGES' CHANGELOG.md` ≥ 1.
15. **Wordmark.png exists and is not the old BMAD file** — file exists; file hash ≠ upstream BMAD Wordmark.png hash (snapshot in fixtures).
16. **Favicon exists** — `website/public/favicon.png` or `public/favicon.png` or `docs/favicon.png` (exact path locked by planner) exists.
17. **docs/index.md + docs/zh-cn/index.md rewritten** — contain "GoMad" and do not contain mangled Phase-2-sweep artifacts: `grep -cE 'gomad-builder-docs\.gomad\.org|BMM phases|\(\*\*B\*\*uild \*\*M\*\*ore' docs/index.md docs/zh-cn/index.md` equals 0.
18. **docs/mobmad-plan.md is deleted** (DOCS-07 closure verification) — `test ! -f docs/mobmad-plan.md`.
19. **REQUIREMENTS.md + ROADMAP.md contain the three requirement-delta relaxations** — specific substrings for CREDIT-02, BRAND-01, DOCS-05 relaxations present.
20. **CLI does not credit BMAD anywhere** — `node tools/installer/gomad-cli.js --version`, `--about` (if exists), and startup-banner stdout combined contain zero occurrences of `BMAD` (case-insensitive). D-08 enforcement.
21. **Case-preserving map applied to any new Phase 3 prose** — no occurrences of `bmad`, `BMAD`, `BMad`, `bmad-method`, or `BMM` in files created or rewritten by Phase 3 (exclude LICENSE BMAD block, CONTRIBUTORS BMAD block, README Credits section, CHANGELOG v1.1.0 attribution line, TRADEMARK nominative acknowledgment — all within allow-listed line ranges).

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| CLI banner visual quality in 80-col TTY | BRAND-02 | ASCII art readability is subjective; automated test only checks string presence | Run `node tools/installer/gomad-cli.js install` in an 80-column terminal; visually confirm "GoMad" ASCII-art renders legibly and colors look right |
| TRADEMARK.md legal posture clarity | CREDIT-04 | Legal language review requires human judgment | Human-read TRADEMARK.md top-to-bottom; confirm nominative acknowledgment + defensive GoMad assertion + non-affiliation disclaimer all present and coherent |
| Wordmark.png visual quality | BRAND-01 (relaxed) | Typographic treatment is aesthetic | Open Wordmark.png; confirm it reads "GoMad" with correct casing at expected render sizes |
| docs/index.md + docs/zh-cn/index.md readability | DOCS-02 | Prose quality requires human review | Human-read both landing pages; confirm they explain what GoMad is, how to install, and where to go next, in GoMad voice |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (`test/validate-phase-03.js`, fixtures)
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter (after planner populates Per-Task Verification Map)

**Approval:** pending
