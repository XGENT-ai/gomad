# Phase 3: Credit, Branding & Docs - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in `03-CONTEXT.md` — this log preserves the alternatives considered.

**Date:** 2026-04-09
**Phase:** 03-credit-branding-docs
**Mode:** discuss (interactive)
**Areas discussed:** README rewrite (EN + CN), Branding assets + CLI banner, CHANGELOG v1.1.0 framing, docs/ + TRADEMARK.md depth

---

## Gray Area Selection

| Area | Selected |
|------|----------|
| README rewrite (EN + CN) | ✓ |
| Branding assets + CLI banner | ✓ |
| CHANGELOG v1.1.0 framing | ✓ |
| docs/ + TRADEMARK.md depth | ✓ |

All four gray areas selected for discussion. No areas skipped.

---

## README rewrite (EN + CN)

### Q1: README.md rewrite approach — how much of BMAD's existing README survives?

| Option | Description | Selected |
|--------|-------------|----------|
| Surgical edit (Recommended) | Keep structure + feature bullets; swap branding/links/commands to GoMad; delete BMAD marketing fluff; add fork intro + Credits | ✓ |
| Full ground-up rewrite | Fresh README from scratch; own voice, own structure | |
| Minimal stub + link | One-paragraph what-it-is, install command, link to upstream BMAD docs | |

**User's choice:** Surgical edit (Recommended)

### Q2: README_CN.md parity level with English?

| Option | Description | Selected |
|--------|-------------|----------|
| Full parity (Recommended) | README_CN mirrors README.md section-for-section in Chinese | ✓ |
| Condensed CN summary | Shorter CN; link to EN for depth | |
| Machine translate + human review | Auto-translate from EN with human pass | |

**User's choice:** Full parity (Recommended)

### Q3: BMAD-branded badges, docs.bmad-method.org links, and Discord link — what stays?

| Option | Description | Selected |
|--------|-------------|----------|
| Replace all with GoMad (Recommended) | npm → @xgent-ai/gomad, docs → gomad.xgent.ai, drop BMAD Discord | ✓ |
| Replace GoMad-specific, keep BMAD Discord | Keep BMAD Discord as community pointer | |
| Drop badges entirely | No badges at all | |

**User's choice:** Replace all with GoMad (Recommended)

### Q4: Fork statement placement in README?

| Option | Description | Selected |
|--------|-------------|----------|
| Top-of-intro sentence + footer Credits (Recommended) | First line after banner + full Credits footer — matches CREDIT-02 verbatim | |
| Credits section only (no top sentence) | All credit lives in the ## Credits footer | ✓ |
| Dedicated 'Origin' section right after intro | Separate ## Origin section after intro | |

**User's choice:** Credits section only (no top sentence)
**Notes:** Choice conflicts with CREDIT-02 ("factual fork statement in the intro and a `## Credits` section"). Reconciliation asked as a follow-up Q.

### Q4-followup: Reconciliation with CREDIT-02?

| Option | Description | Selected |
|--------|-------------|----------|
| Relax the requirement | Update CREDIT-02 and Phase 3 success criterion to drop "in the intro" clause | ✓ |
| Honor CREDIT-02 as written | Keep one-line intro sentence + full Credits section | |
| Dedicated Origin section (compromise) | Add ## Origin section right after intro paragraph | |

**User's choice:** Relax the requirement
**Notes:** Drives D-04 and the CREDIT-02 requirement delta.

---

## Branding assets + CLI banner

### Q1: banner-gomad.png — how do we source the image itself?

| Option | Description | Selected |
|--------|-------------|----------|
| AI-generated placeholder (Recommended) | Generate via image model; ship as v1.1 asset | |
| Text-only Wordmark.png | Skip photographic banner; just regenerate Wordmark.png | |
| Real designed banner | Human-designed; slows down shipping | |

**User's choice:** "use ascii art" (free-text override)
**Notes:** User wanted ASCII art instead of any of the three PNG options. Surfaced BRAND-01's "banner-gomad.png" requirement and asked a follow-up to clarify the PNG/ASCII reconciliation. User then answered the follow-up via a clarifying conversation: **no `banner-gomad.png` at all**, delete `banner-bmad-method.png`, relax BRAND-01. Context: the banner PNG was only used at the top of README.md / README_CN.md and was already excluded from the npm tarball via `.npmignore` — no functional value.

### Q1-followup (resolved via conversation, not AskUserQuestion):

Options presented:
- Render ASCII art as PNG: generate ASCII, render to PNG, ship as banner-gomad.png
- Drop PNG, use .txt + README code block: no PNG, README shows fenced code block
- ASCII for CLI, small PNG wordmark for README: CLI uses ASCII, README uses Wordmark.png

**User's response:** "不需要 banner-gomad.png" — resolved by deleting the asset entirely and removing the top-of-README image line from both README.md and README_CN.md. Drives D-05 and the BRAND-01 requirement delta.

### Q2: Wordmark.png + favicon — ship both in v1.1?

| Option | Description | Selected |
|--------|-------------|----------|
| Wordmark.png yes, favicon defer (Recommended) | Regenerate Wordmark.png, defer favicon to site deploy phase | |
| Ship both, simple derivatives | Regenerate Wordmark.png + derive a simple favicon from it | ✓ |
| Neither — text only | Drop Wordmark.png entirely | |

**User's choice:** Ship both, simple derivatives

### Q3: CLI startup banner style?

| Option | Description | Selected |
|--------|-------------|----------|
| Chalk-colored text block (Recommended) | Simple multi-line chalk output: GoMad + version + tagline | ✓ |
| figlet ASCII art | ASCII-art via figlet package; adds dep | |
| Minimal one-liner | Single line: "GoMad v1.1.0 installer" | |

**User's choice:** Chalk-colored text block (Recommended)
**Notes:** Combined with the Q1 "use ascii art" direction: the final banner is chalk-colored **ASCII-art** text (hand-authored, no figlet dep), per D-07.

### Q4: Where does the "hard fork of BMAD Method" line go in the CLI output?

| Option | Description | Selected |
|--------|-------------|----------|
| Under startup banner (Recommended) | Small dimmed line under GoMad banner on every install | |
| Only on --version / --about | Keep banner clean; credit on explicit about | |
| In install success message | Show at end of successful install | |

**User's choice:** "only in README" (free-text override)
**Notes:** User wanted NO BMAD credit in any CLI output — not in banner, not in --version, not in success message. Credit lives in LICENSE + README + CHANGELOG only. Confirmed in a follow-up CLI posture question: "CLI clean, credit in written assets only". Drives D-08.

### Q4-followup: Confirm CLI output credit posture?

| Option | Description | Selected |
|--------|-------------|----------|
| CLI clean, credit in written assets only (Recommended) | No BMAD credit string in CLI at all | ✓ |
| Add credit to --version / --about only | Small concession for discoverability | |

**User's choice:** CLI clean, credit in written assets only (Recommended)

---

## CHANGELOG v1.1.0 framing

### Q1: How should v1.1.0 frame the pivot story?

| Option | Description | Selected |
|--------|-------------|----------|
| Factual + minimal (Recommended) | State what happened; no self-flagellation or marketing | ✓ |
| Blunt pivot story | Explicitly call out v1.0 as wrong direction | |
| Positive "evolved into" framing | Soft-pedal the discontinuity | |

**User's choice:** Factual + minimal (Recommended)

### Q2: What happens to BMAD's upstream CHANGELOG history below the v1.1.0 entry?

| Option | Description | Selected |
|--------|-------------|----------|
| Preserve BMAD history under clear heading (Recommended) | Keep BMAD v6.2.2...v1.0.0 under "upstream history" header | |
| Truncate BMAD history | Keep only v6.2.2 as marker, delete rest | |
| Wipe BMAD history entirely | Start CHANGELOG.md fresh at v1.1.0 | ✓ |

**User's choice:** Wipe BMAD history entirely (labeled "Truncate BMAD history" in the answer echo — the selected semantics match D-10)
**Notes:** Drives D-10. Rationale for wiping: lineage is already preserved in LICENSE + README Credits + the v1.1.0 entry itself; a CHANGELOG containing BMAD's v6.x history under GoMad's v1.1.0 header creates more confusion than it avoids.

### Q3: Call out the v1.0 → v1.1 BREAKING nature?

| Option | Description | Selected |
|--------|-------------|----------|
| BREAKING CHANGES section (Recommended) | Explicit ### BREAKING CHANGES subsection | ✓ |
| Mention inline, no dedicated section | Softer; no formal header | |
| No breaking callout at all | Let npm deprecate message handle it | |

**User's choice:** BREAKING CHANGES section (Recommended)

### Q4: Handle the version-number optics (BMAD v6.2.2 history under v1.1.0)?

| Option | Description | Selected |
|--------|-------------|----------|
| One-line note in v1.1.0 (Recommended) | Preempt confusion with a one-liner about upstream versioning | ✓ |
| Don't address it | Trust readers to figure it out | |

**User's choice:** One-line note in v1.1.0 (Recommended)

---

## docs/ + TRADEMARK.md depth

### Q1: docs/ content strategy — how deep does Phase 3 go?

| Option | Description | Selected |
|--------|-------------|----------|
| Identity-only sweep + stub (Recommended) | Spot-check pass + rewrite index.md landing; leave 62 inner files as-is | ✓ |
| Full rewrite of landing pages only | Rewrite index + section intros; keep inner files | |
| Deep rewrite of tutorials | Rewrite tutorials section; leave explanation/how-to/reference | |

**User's choice:** Identity-only sweep + stub (Recommended)

### Q2: website/ cleanup — what to do with leftover i18n files and Astro config?

| Option | Description | Selected |
|--------|-------------|----------|
| Delete fr/vi i18n + keep Astro structure (Recommended) | Delete orphaned i18n files, keep Astro, update title/nav | |
| Delete fr/vi + full Astro rewrite | Full rewrite of Astro content collection + components | |
| Stub the whole website/ | Replace with one-page placeholder | ✓ |

**User's choice:** Stub the whole website/
**Notes:** Drives D-18. Leftover i18n deletion (D-19) is folded into this decision since the stubbing work naturally includes the cleanup.

### Q3: TRADEMARK.md posture for the "GoMad" wordmark?

| Option | Description | Selected |
|--------|-------------|----------|
| Minimal nominative + permissive on GoMad (Recommended) | Acknowledge BMAD, permit GoMad forks under different names | |
| Defensive on GoMad | Claim GoMad wordmark, forbid confusingly similar names | ✓ |
| Ultra-minimal | Just BMAD nominative + non-affiliation, nothing about GoMad | |

**User's choice:** Defensive on GoMad
**Notes:** Deliberate asymmetry with BMAD's own permissive posture; user considered and chose defensive anyway. Captured in D-21 and flagged in D-22 so downstream agents don't revisit.

### Q4: CONTRIBUTING.md / SECURITY.md / AGENTS.md — how much rewrite?

| Option | Description | Selected |
|--------|-------------|----------|
| Identity sweep + contact info (Recommended) | Light updates to identity + maintainer contact | |
| Minimal delete SECURITY.md / AGENTS.md | Delete or reduce to short stubs; keep CONTRIBUTING | ✓ |

**User's choice:** Minimal delete SECURITY.md / AGENTS.md
**Notes:** CONTRIBUTING.md still gets a rewrite (D-25); only SECURITY.md and AGENTS.md are deleted or stubbed per D-24.

---

## Claude's Discretion

Explicitly delegated to Claude (captured in CONTEXT.md `<decisions>` §Claude's Discretion):

- Exact ASCII-art glyphs for CLI banner (must be 80-col safe)
- Exact chalk color palette for CLI banner
- Exact wording of tagline (or no tagline)
- Exact Wordmark.png typographic treatment
- Favicon glyph choice
- Which BMAD feature bullets survive the surgical README edit
- docs/index.md landing page section structure
- Whether TRADEMARK.md lists owner as "xgent-ai" or "Rockie Guo / xgent-ai"
- Website stub visual treatment

## Deferred Ideas

Captured in CONTEXT.md `<deferred>`:

- Real human-designed banner image
- Real favicon design
- Full website/ rewrite
- Deep rewrite of docs/ inner pages
- New agents/skills (milestone 2)
- Actual gomad.xgent.ai GitHub Pages deployment
- Tagline decision
- Discord / community links

## Requirement Deltas

- **CREDIT-02 + Phase 3 success criterion #2** — Relax to drop "in the intro" clause (from Q4 + Q4-followup on README area)
- **BRAND-01 + Phase 3 success criterion #4** — Drop banner-gomad.png creation requirement (from Q1 + clarifying conversation on Branding area)
- **DOCS-05 / Phase 3 success criterion #5** — Clarify that SECURITY.md / AGENTS.md deletion satisfies the "reflect GoMad identity" intent (from Q4 on docs/+TRADEMARK area)

Full delta text lives in CONTEXT.md `<requirement_deltas>`.
