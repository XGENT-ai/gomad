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

## Milestone: v1.2 — Agent-as-Command & Coding-Agent PRD Refinement

**Shipped:** 2026-04-24
**Phases:** 5 | **Plans:** 16 | **Tasks:** 47 | **Timeline:** ~6 days (2026-04-18 → 2026-04-24) | **Commits:** 133

### What Was Built

- `@xgent-ai/gomad@1.2.0` on npm with `latest` dist-tag; `v1.2.0` tagged on main. v1.1.0 retained as prior-stable.
- 7 `gm-agent-*` personas now installed as `/gm:agent-*` launcher-form slash commands under `.claude/commands/gm/`, generated at install time from `gm-agent-*/skill-manifest.yaml`. Subdirectory namespace verified on current Claude Code (CMD-05).
- Copy-only installer: `fs.ensureSymlink` → `fs.copy` throughout; `fs.lstat` pre-check unlinks pre-existing v1.1 symlinks on upgrade.
- `files-manifest.csv` v2 schema: 7 columns (`type,name,module,path,hash,schema_version,install_root`) parsed/written via `csv-parse/sync`; backward-compat preserved via dual-schema read.
- Manifest-driven upgrade cleanup: pure `buildCleanupPlan` + `executeCleanupPlan`, realpath containment under `.claude/` + `_gomad/`, BOM/CRLF-aware row parsing, `MANIFEST_CORRUPT`/`CORRUPT_ROW` classification, symlink-escape pre-throw logging, `--dry-run` preview flag, pre-cleanup backup snapshots under `_gomad/_backups/<timestamp>/`, v1.1→v1.2 legacy cleanup of `.claude/skills/gm-agent-*/`. `docs/upgrade-recovery.md` authored.
- PRD pipeline refocused on coding-agent consumers: `gm-create-prd` steps 02b/02c/03/10 stripped of human-founder framing + residual sweep across 9 other steps; `## Coding-Agent Consumer Mindset` section added to `data/prd-purpose.md`; step-09 emits FR-NN + Given/When/Then AC + explicit `## Out of Scope`; `gm-product-brief` voice aligned with all canonical guardrails preserved verbatim.
- Regression gates installed in `npm run quality`: `test:orphan-refs` (allowlisted grep), `test:gm-surface` Phase C hard assertion on all 7 installer-produced launchers + negative assertion on legacy skills dir, `verify-tarball.js` Phase 3 grep-clean pass, `test/integration/prd-chain/test-prd-chain.js` (97 assertions, deterministic, <100ms).

### What Worked

- **Dual-role REL-03 enforcement** — `test:gm-surface` (installer output shape) + `test:tarball` (shipped tarball shape), both must exit 0 before publish. Caught installer-vs-tarball divergence categorically.
- **Phase 5 as load-bearing de-risk** — verifying `/gm:*` namespace resolution on current Claude Code and the launcher-vs-self-contained decision **before** any installer work meant Phase 6 executed without replanning.
- **Strip-only / additive PRD refinement** — explicitly preserving structural sections consumed by `gm-validate-prd`, `gm-create-architecture`, `gm-create-epics-and-stories`, `gm-check-implementation-readiness` let Phase 8 ship in isolation without a downstream-skill cascade. Integration test (PRD-07) verified the contract held.
- **Zero new runtime deps as a shipping constraint** — 16 plans, 47 tasks, not one new npm dep. Forced reuse (local `escapeCsv` instead of `csv-stringify/sync`) and kept the shipped surface smaller than it would have been.
- **Dual-format manifest sniff** — v1→v2 cleanup handled corrupt rows + BOM + CRLF + malformed headers without false-positive mass-deletion; batch-poison on containment failure (D-33) kept partial deletes categorically impossible.
- **Symlink-escape pre-throw log** — emit `SYMLINK_ESCAPE` line BEFORE throwing `ManifestCorruptError`, so the offending entry is captured even when the batch poison short-circuits. Debugging-friendly by default.
- **Pedagogical quote allow-listing** — `data/prd-purpose.md § Coding-Agent Consumer Mindset` intentionally names banned terms (ARR/CAC/LTV/"why now?") as examples of what NOT to include. Allow-listing these as pedagogical lets the banned-phrase sweep stay strict elsewhere.

### What Was Inefficient

- **REQUIREMENTS.md checkboxes + traceability never updated during execution** — same issue as v1.1 Lesson 1. All 32 checkboxes remained `[ ]` / `Pending` through Phases 5-9 despite phase summaries confirming completion. Had to be bulk-flipped at milestone close as bookkeeping. The reliable signal was phase `SUMMARY.md`, not `REQUIREMENTS.md`.
- **`gsd-tools audit-open` flagged a completed quick task as 'missing'** — v1.1 Lesson 5 still applies: the audit classifies by metadata field shape, not by whether SUMMARY.md exists. Quick task `260416-j8h` shipped 2026-04-16 but surfaced at close requiring explicit acknowledgement.
- **MILESTONES.md CLI appends extracted raw `accomplishments` sections verbatim** — resulting in noise like "Launcher row" and "Pre-edit (from initial read at line 1097-1112):" as bullet points. Had to rewrite the v1.2 MILESTONES.md entry by hand to match v1.1's curated format. `summary-extract` returns section bodies keyed by header, not the compact `one_liner:` frontmatter field.
- **`gsd-sdk query milestone.complete` does not exist** — workflow doc references it, but the CLI is `gsd-tools.cjs milestone complete`. Same drift as v1.1 Lesson 5. Multiple query wrappers don't route.
- **Banned-phrase sweep false positives on `ARR`/`CAC` substrings** — Phase 8 literal `-i` grep flagged English words containing "arr" (like "array", "carries"). Resolved by re-running with word-boundary anchors `\bARR\b`. Plans should default to word-boundary anchors for acronym guards.
- **Planner-supplied OOS regex lookahead had a correctness bug** — `(?=\n## |\n*$)` zero-width matched prematurely in multiline mode; `?` non-greedy then matched zero chars. Fixed to `(?:\n## |\s*$)`. Plans that embed regex should have the executor run a minimal fixture probe before shipping.

### Patterns Established

- **Launcher-form slash commands as thin stubs loading persona at runtime** — `.claude/commands/<ns>/<cmd>.md` with `name: <ns>:<cmd>` frontmatter + short launcher body; persona lives in `_gomad/<ns>/agents/*.md`, loaded at invocation. Preserves SKILL.md as single source of truth; Claude Code sees rich metadata via launcher body.
- **Generate-don't-move for derived surfaces** — source dirs stay canonical in `src/gomad-skills/`; launchers emitted at install time into target workspace. Dev repo never holds generated output (enforced via `.gitignore`).
- **Filesystem dir names keep dash form, user-visible invocation uses colon form** — colons aren't Windows-safe in paths. Migrate only the invocation surface, never the filesystem entries. `skill-manifest.yaml name:` field also keeps dash form.
- **Realpath-contain-then-execute for any file-level surgery** — before any deletion, resolve realpath, assert containment under allowed roots, fail the batch on any single violation. Symlink escape is the failure mode to worry about.
- **Backup-snapshot-before-remove, no rotation on first pass** — `_gomad/_backups/<timestamp>/` captures pre-cleanup state; recovery via `cp -R`. Rotation policy deferred until real-world snapshot accumulation justifies it.
- **Strip-only / additive content refactors** — when touching upstream-consumed content (PRDs, SKILL bodies), preserve every structural header and named section. Behavioral refactor stays downstream; content refactor stays surgical.
- **Dual-sided verification gates** — when a shipped artifact has two surface layers (installer output + published tarball), assert both independently. Neither alone is sufficient.
- **Word-boundary acronym guards by default** — `\bARR\b` not `ARR`. Plans enumerating banned terms should include the anchor form.
- **Integration tests that are deterministic, LLM-free, and <100ms** — 97-assertion PRD chain test runs entirely in Node with a canonical fixture, no LLM calls, no tool invocation. Fast enough to wire into `npm run quality`.

### Key Lessons

1. **Checkbox drift in REQUIREMENTS.md is now a repeat offender.** Both v1.1 and v1.2 closed with 0% checkbox sync. The signal is that phase `SUMMARY.md` is the ground truth; REQUIREMENTS.md is vestigial bookkeeping. Consider: (a) auto-tick at phase close via a hook, (b) generate REQUIREMENTS.md read-views from phase SUMMARY.md frontmatter instead of maintaining by hand, or (c) accept that REQUIREMENTS.md gets bulk-flipped at close as the normal pattern.
2. **CLI/workflow drift is now a repeat offender.** v1.1 Lesson 5 flagged this; v1.2 hit it again with `gsd-sdk query milestone.complete` not existing and `audit-open` mis-classifying a complete task. Workflow docs should either (a) test the commands they reference, or (b) degrade gracefully and name fallbacks inline.
3. **MILESTONES.md generation from raw SUMMARY.md extractions produces noise.** The `accomplishments` section in individual summaries is verbose; concatenating them makes an unreadable bullet soup. Either curate a `one_liner:` frontmatter field rigorously during execution, or accept that milestone close includes a hand-curated summary pass.
4. **De-risk the load-bearing assumption in Phase N before building Phases N+1..N+K.** v1.2 Phase 5 verified `/gm:*` namespace resolution + locked launcher-form decision before Phase 6 touched the installer. Zero replanning resulted. Contrast with v1.1 Phase 4's `findBmadDir` rename leaking beyond plan scope because Phase 2's sweep was incomplete.
5. **Embedded regex in plans should be probe-tested by the executor.** The OOS-capture lookahead bug cost a cycle. Plans that ship regex should either (a) include a fixture probe step, or (b) accept that the first GREEN run is the regex smoke test.
6. **Word-boundary anchors on acronym sweeps.** `ARR` matches `array`. Always `\bACRONYM\b`.
7. **Zero-new-runtime-deps is a shippable constraint.** v1.2 delivered 16 plans under this rule. Sets a useful discipline for future milestones.

### Cost Observations

- Model mix: primarily Opus (quality profile) with Sonnet for some parallelizable content work in Phase 8
- Sessions: ~one session per plan + a final close session; Phase 7 plan 02 restarted mid-GREEN after a stream idle timeout but resumed cleanly from the RED commit
- Notable: Phase 5 (de-risk) took ~4 min of focused work and saved Phase 6 from at least one replan cycle; strongest ROI of the milestone

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Phases | Plans | Key Change                                                                                                     |
| --------- | ------ | ----- | -------------------------------------------------------------------------------------------------------------- |
| v1.1      | 4      | 10    | First milestone archived via GSD (v1.0 had a tag but no archive)                                                |
| v1.2      | 5      | 16    | First milestone shipping under zero-new-runtime-deps constraint; launcher-form slash commands pattern established |

### Cumulative Quality

| Milestone | Test suites                                                                                                    | Requirements coverage | Tarball size |
| --------- | -------------------------------------------------------------------------------------------------------------- | --------------------- | ------------ |
| v1.1      | quality (7 sub-checks) + tarball + E2E (10 assertions, 52 skills)                                              | 36/36 (100%)          | 320 files    |
| v1.2      | quality + tarball + E2E + `test:gm-surface` (3-phase) + `test:orphan-refs` + PRD-chain integration (97 assert) | 32/32 (100%)          | growing      |

### Top Lessons (Verified Across Milestones)

1. **Requirements checkbox drift is structural, not incidental.** Both v1.1 and v1.2 closed with 0% checkbox sync despite shipping. Treat REQUIREMENTS.md checkboxes as bulk-flip-at-close bookkeeping or automate via hook; trusting phase SUMMARY.md is the reliable pattern.
2. **CLI/workflow drift recurs at milestone close.** Both v1.1 and v1.2 hit missing/broken `gsd-tools` subcommands during archival (`audit-open` mis-classification, `milestone complete` routing mismatch). Workflows referencing CLI commands should degrade gracefully.
3. **De-risk load-bearing assumptions before downstream work.** v1.1 Phase 2 sweep gaps cascaded into Phase 4 deviations; v1.2 Phase 5 explicit de-risk kept Phases 6-9 clean. Front-loading validation costs ~4 min and saves a replan cycle.
4. **Byte-identical preservation + additive refactors are the safe shape.** v1.1 preserved BMAD LICENSE verbatim; v1.2 PRD refactor stayed strip-only. When touching shared-surface content, preserve every named section structurally.
