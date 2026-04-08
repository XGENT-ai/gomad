# Phase 3: Credit, Branding & Docs - Context

**Gathered:** 2026-04-09
**Status:** Ready for planning

<domain>
## Phase Boundary

GoMad is properly credited as a hard fork of BMAD Method with correct legal files, new visual branding, and complete English + Chinese documentation. Scope: `LICENSE`, `TRADEMARK.md`, `CONTRIBUTORS.md`, `README.md`, `README_CN.md`, `CHANGELOG.md`, `CONTRIBUTING.md`, `SECURITY.md`, `AGENTS.md`, `CNAME`, visual assets (`Wordmark.png`, favicon), CLI startup banner, `docs/` site content, `website/` stub. Excludes: npm publishing, quality gates, installer E2E — those live in Phase 4.

</domain>

<decisions>
## Implementation Decisions

### README rewrite (EN + CN)
- **D-01:** Surgical edit of BMAD's existing `README.md` — keep section structure and feature bullets; swap all branding/links/commands/examples to GoMad; delete BMAD marketing copy ("Build More Architect Dreams", "What's Next for BMad" roadmap section); remove the top-of-file `![BMad Method](banner-bmad-method.png)` image line entirely (no replacement image — see D-05).
- **D-02:** `README_CN.md` maintains **full parity** with `README.md` — section-for-section Chinese mirror. Both files stay in lockstep for future maintenance.
- **D-03:** Replace ALL BMAD-branded badges, links, and community pointers: npm badge → `@xgent-ai/gomad`, docs link → `gomad.xgent.ai` (even though site not yet deployed), drop BMAD Discord link entirely. No cross-promotion to upstream community.
- **D-04:** Fork statement lives in a `## Credits` footer section ONLY. No fork-statement sentence in the README intro or in a dedicated "Origin" section. This **overrides REQUIREMENTS.md CREDIT-02** and Phase 3 success criterion (2), which must be relaxed from "factual fork statement in the intro and a `## Credits` section" to "factual fork statement in a `## Credits` section". Credits section contains: "GoMad is a hard fork of BMAD Method by Brian (BMad) Madison." + upstream repo link + non-affiliation disclaimer identical to LICENSE.

### Branding assets + CLI banner
- **D-05:** No `banner-gomad.png` will be created. `banner-bmad-method.png` is deleted. Top-of-README banner image line is removed from both `README.md` and `README_CN.md`. This **overrides REQUIREMENTS.md BRAND-01** and Phase 3 success criterion (4), which must be relaxed from "`banner-gomad.png` exists, old `banner-bmad-method.png` is gone, and CLI startup banner shows 'GoMad'" to "`banner-bmad-method.png` is gone, `Wordmark.png` regenerated for GoMad, and CLI startup banner shows 'GoMad'". Rationale: the banner PNG was only used as README decoration, never loaded by the CLI, and already excluded from the npm tarball via `.npmignore` — it carries no functional value.
- **D-06:** Regenerate `Wordmark.png` with a GoMad typographic treatment. Derive a simple favicon from the same source (e.g., "g" or "GM" glyph).
- **D-07:** CLI startup banner = chalk-colored ASCII-art "GoMad" text block + version line. No `figlet` dependency — hand-authored or generated once and stored as a static string in the CLI. Must degrade gracefully in non-color terminals and CI logs.
- **D-08:** NO BMAD credit text anywhere in CLI output — not in startup banner, not in `--version`, not in `--about`, not in install success message. Credit duty is fully satisfied by `LICENSE` (byte-identical MIT), `README.md` Credits section, `README_CN.md` Credits section, and `CHANGELOG.md` v1.1.0 entry.

### CHANGELOG v1.1.0 framing
- **D-09:** v1.1.0 entry tone = **factual + minimal**. State what changed, not opinion about v1.0. No self-flagellation; no positive-spin "evolved into" language. Example opener: "v1.1.0 re-bases `@xgent-ai/gomad` as a hard fork of BMAD Method. `@xgent-ai/gomad@1.0.0` (a Claude Code skills installer, wrong product direction) is deprecated."
- **D-10:** **Truncate BMAD upstream history entirely.** `CHANGELOG.md` starts fresh at v1.1.0. Do NOT preserve BMAD's v6.2.2…v1.0.0 entries in-file. Lineage is preserved via `LICENSE` (byte-identical MIT + copyright), `README.md` Credits section, and the v1.1.0 entry itself. Cleanest break; zero confusion about what `@xgent-ai/gomad` ships.
- **D-11:** v1.1.0 entry includes a dedicated `### BREAKING CHANGES` subsection that explicitly states: "Nothing from `@xgent-ai/gomad@1.0.0` carries forward. v1.1.0 is effectively a new product reusing the package name." This makes the npm deprecate message coherent with the in-repo record.
- **D-12:** v1.1.0 entry includes a one-line version-optics note: "Version numbers reset: BMAD Method's upstream versioning (v6.x) is unrelated to `@xgent-ai/gomad`'s versioning (1.x). See LICENSE and Credits for origin." Preempts confusion from anyone who remembers BMAD's version numbers.

### docs/ content sweep
- **D-13:** **Identity-only sweep.** Phase 2's content sweep already did text replacement. Phase 3 performs a spot-check pass on the 62 files in `docs/` (explanation/, how-to/, reference/, tutorials/) for BMAD-specific claims that survived the sweep (e.g., community callouts, "why BMAD" framings, BMAD-specific marketing language).
- **D-14:** Rewrite `docs/index.md` landing page in GoMad voice from scratch. This is what a reader sees first when browsing the docs; it deserves a full rewrite, not a sweep.
- **D-15:** Rewrite `docs/_STYLE_GUIDE.md` references to match GoMad identity and naming conventions (`gm-*`, `gomad-skills/`, GoMad casing rule).
- **D-16:** Leave the 62 inner explanation/how-to/reference/tutorials pages structurally as-is. They explain workflow mechanics (analysis → plan → solutioning → implementation) that remain accurate post-rename. Do NOT deep-rewrite them.
- **D-17:** `docs/zh-cn/` (30 files) receives the same treatment: identity spot-check + rewrite of `docs/zh-cn/index.md` landing page. Do NOT touch inner pages.

### website/ stub
- **D-18:** **Stub the entire `website/`.** Replace `website/src/pages/index.astro` (or equivalent) with a minimal one-page placeholder: "GoMad — under construction. See README.md in the repository for current docs." Do NOT rewrite Astro content collections, navigation, i18n, or components in Phase 3. Matches PROJECT.md decision "CNAME set now, actual deploy deferred until stable".
- **D-19:** Delete leftover i18n files `website/src/content/i18n/fr-FR.json` and `website/src/content/i18n/vi-VN.json` (orphaned after `docs/fr/` and `docs/vi-vn/` were deleted in Phase 1). Keep `zh-CN.json`.
- **D-20:** `CNAME` file = `gomad.xgent.ai` (per REQUIREMENTS.md DOCS-03; no ambiguity).

### TRADEMARK.md posture
- **D-21:** **Defensive posture on the "GoMad" wordmark.** TRADEMARK.md rewrite:
  1. Nominative acknowledgment of BMAD as a trademark of BMad Code LLC; GoMad uses "BMAD" only in attribution/compatibility language (fair use).
  2. Non-affiliation disclaimer identical to LICENSE.
  3. Assert "GoMad" as a trademark of xgent-ai (or Rockie Guo as sole proprietor, whichever is legally cleaner).
  4. Forbid use of "GoMad" or confusingly similar names (Gomad, Go-Mad, GOMad, etc.) as product/service/company/domain names without written permission.
  5. Forbid implying endorsement by or affiliation with xgent-ai.
- **D-22:** Acknowledged risk: the defensive posture contrasts with BMAD's own permissive TRADEMARK.md ("Fork the software and distribute your own version under a different name"). This is a deliberate choice, not an oversight. Document the asymmetry in an internal comment but do NOT apologize for it in TRADEMARK.md itself.

### CONTRIBUTORS.md + meta docs
- **D-23:** `CONTRIBUTORS.md` preserves the original BMAD contributors list **byte-identical** (same philosophy as LICENSE preservation). Add a new `## GoMad Contributors` section below a horizontal rule listing Rockie Guo as initial maintainer.
- **D-24:** **Delete `SECURITY.md` and `AGENTS.md`** rather than rewriting. If BMAD's versions contain useful boilerplate we want, reduce to minimal stubs (1–2 paragraphs + "report to rockie@kitmi.com.au" contact). Do NOT inherit BMAD governance content wholesale.
- **D-25:** `CONTRIBUTING.md` gets a content rewrite: identity sweep + maintainer contact (Rockie Guo / rockie@kitmi.com.au) + "propose changes via PR to xgent-ai/gomad" flow. Do NOT carry over BMAD-specific community processes (Discord pointers, BMAD team roles, etc.).

### Claude's Discretion
- Exact ASCII-art glyphs for CLI banner (pick something readable in 80-col terminals).
- Exact chalk color palette for CLI banner.
- Exact wording of the GoMad tagline (or whether to have one at all — v1.1 may ship without a tagline to avoid marketing fluff).
- Exact Wordmark.png typographic treatment (font, weight, color) — as long as it reads "GoMad" with correct casing.
- Favicon glyph choice ("g" vs "GM" vs something else).
- Which exact feature bullets from BMAD's README survive the surgical edit vs which get cut as BMAD-specific marketing.
- Landing page (`docs/index.md`) section structure — as long as it explains what GoMad is, how to install, and where to go next.
- Whether TRADEMARK.md lists trademark owner as "xgent-ai" or "Rockie Guo / xgent-ai" (pick whichever is legally cleanest — defer to research if unclear).
- Website stub visual treatment (plain HTML, minimal Astro, or static text).

</decisions>

<requirement_deltas>
## Requirement Deltas

Decisions in this context conflict with REQUIREMENTS.md and ROADMAP.md as written. The planner MUST apply these relaxations before generating plans:

- **CREDIT-02 (REQUIREMENTS.md line 41) + Phase 3 success criterion #2 (ROADMAP.md line 60):** Remove "in the intro and" — relax to "a `## Credits` section with upstream link and disclaimer". See D-04.
- **BRAND-01 (REQUIREMENTS.md line 47) + Phase 3 success criterion #4 (ROADMAP.md line 62):** Remove "`banner-gomad.png` created and replaces `banner-bmad-method.png`" / "`banner-gomad.png` exists". Replace with "`banner-bmad-method.png` is deleted, no replacement banner image is created, `Wordmark.png` regenerated for GoMad, and CLI startup banner shows 'GoMad'". See D-05.
- **DOCS-05 / Phase 3 success criterion #5:** No structural change, but note that "`SECURITY.md`, `AGENTS.md` … reflect GoMad identity" is satisfied by deleting those files or reducing them to minimal stubs. See D-24.

Planner should create a small pre-plan task (e.g., as part of 03-01) that updates REQUIREMENTS.md and ROADMAP.md with these relaxations and commits the change before starting feature work, so the phase-gate validator remains consistent.

</requirement_deltas>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project-level requirements and constraints
- `.planning/PROJECT.md` — Core value, v1.1 active requirements, constraints, key decisions (LICENSE strategy, casing rule, trademark posture, scope discipline)
- `.planning/REQUIREMENTS.md` §Credit & Legal, §Branding, §Documentation — CREDIT-01..04, BRAND-01..02, DOCS-01..07 (apply relaxations from `<requirement_deltas>` above)
- `.planning/ROADMAP.md` §Phase 3 — Phase goal, dependencies, success criteria (apply relaxations from `<requirement_deltas>` above)
- `CLAUDE.md` — Project-level constraints including license, casing, trademark, tech stack, scope discipline

### Research artifacts (from Phase 0 scouting)
- `.planning/research/CREDIT_AND_NPM.md` — Credit best-practices, MIT license composition, npm publish/deprecate mechanics, banner asset cleanup guidance (line 450 explicitly calls out `banner-bmad-method.png` removal)
- `.planning/research/RENAME_MECHANICS.md` — File-level rename inventory including branding assets (line 120 original "replace asset" directive — superseded by D-05)

### Upstream files to preserve (byte-identical)
- `LICENSE` — BMAD MIT text section MUST remain byte-identical; GoMad block appended below horizontal rule
- `CONTRIBUTORS.md` — BMAD contributors list MUST remain byte-identical; GoMad section appended

### Prior phase context (locked upstream decisions)
- `.planning/phases/01-foundation/01-CONTEXT.md` — Package identity, dependency, and slim-down decisions from Phase 1
- `.planning/phases/02-rename/02-CONTEXT.md` — Rename mechanics, content sweep rules, case-preserving map from Phase 2

### External references (informational, not locked)
- <https://github.com/bmad-code-org/BMAD-METHOD> — Upstream repository; URL for README Credits section, CHANGELOG v1.1.0 entry, TRADEMARK.md nominative attribution
- BMAD's own `TRADEMARK.md` (upstream) — Precedent for permissive-fork posture; GoMad deliberately takes a stricter posture on its own wordmark (see D-21, D-22)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `tools/installer/cli-utils.js` — Already imports chalk; add the banner string + renderer function here rather than a new module. Keeps CLI code cohesive.
- `tools/installer/prompts.js` — Uses `@clack/prompts` `intro()` / `outro()` — banner renders just before `intro()` in the install command entry path.
- `Wordmark.png` (existing BMAD asset, top-level) — Replace in place; the file path stays the same so `.npmignore` and any README references do not need updating.
- `.npmignore` line 29 already excludes `banner-bmad-method.png` — removing the asset also means removing this line; no tarball change from the user's perspective.

### Established Patterns
- Case-preserving mapping locked in Phase 2: `BMAD Method`→`GoMad`, `BMAD`→`GOMAD`, `BMad`→`GoMad`, `bmad-method`→`gomad`, `bmad`→`gomad`, `bmm`→`gomad`. Apply identically to any new prose written in Phase 3.
- LICENSE composition pattern (BMAD text byte-identical, HR, GoMad block) is the template for `CONTRIBUTORS.md` composition as well — see D-23.
- Chalk usage elsewhere in the CLI is restrained (status messages, warnings, errors). Banner can break this by using color more liberally, but should not introduce new chalk styles not already used elsewhere.

### Integration Points
- `tools/installer/gomad-cli.js` (CLI entry) — Where the banner renders. Happens before any command dispatch.
- `README.md` line 1 and `README_CN.md` line 1 — Current `![BMad Method](banner-bmad-method.png)` line must be deleted, not replaced.
- `website/src/pages/*` — Stub target; existing Astro content collections remain in place but are no longer rendered.
- `docs/index.md` and `docs/zh-cn/index.md` — Landing pages to rewrite.

</code_context>

<specifics>
## Specific Ideas

- User explicitly chose "factual + minimal" for CHANGELOG — this is a strong steer against any marketing language anywhere in Phase 3 written artifacts. If in doubt, trim.
- User explicitly chose a **defensive** TRADEMARK posture on the GoMad wordmark despite the asymmetry with BMAD's permissive posture — this is an intentional, considered decision. Planner and executor should not second-guess it.
- User explicitly wanted `banner-gomad.png` eliminated rather than replaced. The whole "visual branding" story for v1.1 is intentionally minimalist: wordmark + CLI ASCII + nothing else. Do NOT add additional decorative assets on initiative.
- User explicitly chose to delete SECURITY.md and AGENTS.md rather than rewriting. This is a "less is more" call — don't revive them with stubs unless there's a compelling reason.
- The non-affiliation disclaimer wording is identical across LICENSE, README Credits, README_CN Credits, and TRADEMARK.md — draft it once, reuse verbatim.

</specifics>

<deferred>
## Deferred Ideas

- Real human-designed banner image — deferred; v1.1 ships without one (see D-05).
- Real favicon design — D-06 derives a simple placeholder; a properly-designed favicon can come when `gomad.xgent.ai` actually deploys.
- Full `website/` rewrite with GoMad-branded Astro/Starlight content — deferred to the phase that ships `gomad.xgent.ai` (see D-18).
- Deep rewrite of `docs/` tutorials/how-to/explanation/reference pages — deferred; Phase 3 sweeps identity only (see D-13, D-16).
- New agents/skills, CUSTOM-01..03 — deferred to milestone 2 per PROJECT.md "Out of Scope".
- GitHub Pages deployment of `gomad.xgent.ai` — deferred per PROJECT.md "deploy deferred until stable".
- Tagline decision for GoMad — left to Claude's discretion in Phase 3 with the option of shipping without one.
- Discord / community links — intentionally omitted in v1.1; can be added in a future phase if a community emerges.

</deferred>

---

*Phase: 03-credit-branding-docs*
*Context gathered: 2026-04-09*
