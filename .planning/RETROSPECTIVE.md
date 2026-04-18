# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.1 — Rename & Rebrand

**Shipped:** 2026-04-18
**Phases:** 4 | **Plans:** 10 | **Timeline:** 12 days (2026-04-07 → 2026-04-18)

### What Was Built

- `@xgent-ai/gomad@1.1.0` published to npm; v1.0.0 deprecated with redirect to `@latest`
- Full codebase rename: ~41 `bmad-*` skill directories → `gm-*`, `bmm-skills/` → `gomad-skills/`, manifest prefix drop, CLI entry point rename, idempotent content sweep across source/configs/tests/docs/website
- Legal + credit posture: `LICENSE` byte-identical BMAD MIT + GoMad block, `TRADEMARK.md` rewritten for nominative fair use, `CONTRIBUTORS.md` preserved, canonical non-affiliation disclaimer reused verbatim
- Branding: hand-authored GoMad ASCII CLI banner (no figlet dep), `Wordmark.png` + favicon regenerated via committed sharp reproducibility script
- Bilingual docs (en + zh-cn) + under-construction Astro website stub at `gomad.xgent.ai`
- Verification infrastructure: `files` allowlist limits tarball to 320 files, `verify-tarball.js` enforces no `bmad` residuals, E2E fresh-install test confirms all 52 `gm-*` skills loadable

### What Worked

- **Canonical-disclaimer-as-single-source-of-truth** pattern — established in Plan 03-01, reused verbatim across LICENSE, TRADEMARK, README, README_CN. Zero drift across legal surfaces.
- **Atomic FS handoff in a single plan (Plan 02-01)** — bundling the `bmm-skills/` tree rename, 41 skill renames, manifest prefix drop, CLI entry rename, and artifacts rename into one wave kept the intermediate states consistent.
- **Idempotent content-sweep script (Plan 02-02)** — case-preserving regex sweep with explicit exclusions for Phase 3-owned files; rerunnable and reviewable.
- **Structural E2E test (Plan 04-02)** — verifying tarball contents + skill directory structure, not an interactive `gomad install`, sidestepped the `@clack/prompts` non-TTY hang.
- **21-invariant checker for Phase 3** — automated regression barrier for the legal/identity surface area before surfacing work hit users.
- **Manual-human-action checkpoint for the publish step (Plan 04-03)** — the one place where Claude shouldn't touch credentials was explicitly handed off to the operator.

### What Was Inefficient

- **Requirements traceability drift** — 24 of 36 checkboxes in `REQUIREMENTS.md` remained unchecked through Phase 1, 2, and 4 even though phase summaries confirmed completion. Traceability table had to be backfilled at milestone close. Phase `SUMMARY.md` completion was reliable; the REQUIREMENTS.md sync step was not.
- **Phase 2 content sweep missed extensions** — `TARGET_GLOB` missed five text extensions on first pass; caught as a Rule 3 (Blocking) deviation. A preflight file-type census would have surfaced this earlier.
- **`findBmadDir` rename leaked beyond plan scope** (Plan 04-01) — the rename touched files outside the listed set, caught as Rule 1 deviation. Incomplete Phase 2 sweep.
- **npm mirror cache confused deprecation verification** — `npm view ... deprecated` against the default (`registry.npmmirror.com`) returned empty; had to query `registry.npmjs.org` directly. Worth documenting the canonical registry URL for release verification.
- **`gsd-tools audit-open` CLI broken** (`ReferenceError: output is not defined` at bin/gsd-tools.cjs:784,786). Fell back to manual audit. Not blocking, but the workflow file assumes the command works.

### Patterns Established

- **Canonical disclaimer as single source of truth** — when the same legal text appears in multiple surfaces, write it once, reuse verbatim, keep a reproducibility reference in the source plan.
- **Atomic FS handoff over split renames** — do file-system-level renames in a single wave to avoid intermediate broken states.
- **Reproducibility scripts over hand-edited binary assets** — `Wordmark.png` and `favicon.png` generated via committed `sharp` script, not hand-composed.
- **Structural verification over interactive E2E** — verify tarball contents + directory structure directly when interactive flows add flaky dependencies.
- **Human-action checkpoints for credentialed operations** — `npm publish`, `npm deprecate`, and tag pushing stay behind an explicit operator handoff.
- **Byte-identical preservation of upstream legal text** — BMAD's `LICENSE` and `CONTRIBUTORS.md` preserved verbatim; GoMad additions appended below horizontal rules.

### Key Lessons

1. **Keep REQUIREMENTS.md traceability table in sync during execution.** Ticking checkboxes at phase close (not milestone close) makes the state inspectable mid-flight. A post-plan hook or explicit task in each plan would enforce this.
2. **Preflight census before content sweeps.** Before running a regex sweep, enumerate file extensions and count expected touches — catches missed globs before they ship as deviations.
3. **Query the canonical npm registry for verification.** `registry.npmjs.org` is the source of truth; mirrors lag. Set `--registry=https://registry.npmjs.org/` explicitly in release-verification scripts.
4. **Legal text reuse beats duplication.** Canonical-disclaimer pattern scales to any piece of language that must appear verbatim across multiple surfaces.
5. **`gsd-tools` commands referenced by workflows can drift from CLI reality.** `audit-open`, `milestone complete`, and `progress bar --raw` were referenced by workflows but `milestone complete` doesn't exist in the local CLI and `audit-open` is broken. Workflows should degrade gracefully when CLI subcommands are missing.

### Cost Observations

- Model mix: predominantly Opus (quality profile in config) with selective Haiku for narrow-scope quick tasks
- Sessions: not tracked precisely — roughly one session per plan plus the final close session
- Notable: `/gsd-discuss-phase` + `/gsd-plan-phase` + `/gsd-execute-phase` per-phase pattern held up well across all 4 phases; no phase required replanning mid-execution

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Phases | Plans | Key Change                                                       |
| --------- | ------ | ----- | ---------------------------------------------------------------- |
| v1.1      | 4      | 10    | First milestone archived via GSD (v1.0 had a tag but no archive) |

### Cumulative Quality

| Milestone | Test suites                                                        | Requirements coverage | Tarball size |
| --------- | ------------------------------------------------------------------ | --------------------- | ------------ |
| v1.1      | quality (7 sub-checks) + tarball + E2E (10 assertions, 52 skills)  | 36/36 (100%)          | 320 files    |

### Top Lessons (Verified Across Milestones)

*(Will accumulate as more milestones ship.)*
