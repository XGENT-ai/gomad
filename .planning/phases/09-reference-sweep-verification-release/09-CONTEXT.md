# Phase 9: Reference Sweep + Verification + Release - Context

**Gathered:** 2026-04-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Close v1.2 by migrating every user-visible `gm-agent-*` reference to the `/gm:agent-*` command form across prose surfaces (cross-skill invokes, source `module-help.csv`), extending verification gates (a new dedicated orphan-reference regression script + a tightened Phase C install-smoke assertion), and shipping `@xgent-ai/gomad@1.2.0` with a CHANGELOG BREAKING section and a `v1.2.0` tag on `main`.

Sweep scope is narrower than ROADMAP phrasing implies: `docs/` (en + zh-cn), `README.md`, `README_CN.md`, `CHANGELOG.md`, and `website/` already contain **zero** `gm-agent-` hits — no work needed there. The real prose-sweep targets are:

1. `src/gomad-skills/4-implementation/gm-sprint-agent/workflow.md` — 4 cross-skill "invoke the `gm-agent-pm` skill (via the Skill tool)" prose strings (lines 90, 176, 245, 291)
2. `src/gomad-skills/4-implementation/gm-epic-demo-story/SKILL.md` — 1 cross-skill `/gm-agent-pm` reference (line 20)
3. `src/gomad-skills/module-help.csv` — 5 rows with `gm-agent-tech-writer` in the `skill` column
4. Tests + fixtures (6 files) — mostly legitimate filesystem-path refs; allowlisted rather than rewritten

Filesystem directory names (`src/gomad-skills/*/gm-agent-*/`) AND the 7 `SKILL.md` + `skill-manifest.yaml` `name: gm-agent-*` frontmatter fields stay dashed per REF-02/REF-04 — no Windows-hostile colons inside real files. The colon form `gm:agent-*` lives in: user-facing prose, installed `.claude/commands/gm/agent-*.md` launcher frontmatter, and the generated `_gomad/_config/gomad-help.csv` at install-emit time.

Out of scope for this phase: any changes to the 7 agent persona bodies (Phase 5/6 contract); installer cleanup logic (Phase 7 — `test-legacy-v11-upgrade.js` already covers the v1.1→v1.2 upgrade path); PRD/product-brief content (Phase 8, complete); OIDC trusted-publishing workflow (tracked as a follow-up, not a v1.2 blocker).

</domain>

<decisions>
## Implementation Decisions

(Numbering continues from Phase 8's D-61.)

### Cross-skill invoke prose rewrite (REF-01, SC#1)

- **D-62:** `gm-sprint-agent/workflow.md` and `gm-epic-demo-story/SKILL.md` cross-skill invokes rewrite to **slash-command form**, not embody-from-file-path form. Concretely: "invoking the `gm-agent-pm` skill (via the Skill tool)" → "invoking the `/gm:agent-pm` slash command". Drop the "(via the Skill tool)" clause — it's both semantically wrong post-migration (commands ≠ skills) and unnecessary once the subagent has the slash command available. Same pattern for the 3 other `gm-agent-pm` hits and the `gm-agent-dev` hits in `workflow.md`, and for the single `/gm-agent-pm` hit in `gm-epic-demo-story/SKILL.md`. Rationale: minimal churn, matches the command-form contract, rejects the hybrid "command with file-path fallback" option as over-engineered for our internal audience.
- **D-63:** The 7 agent `SKILL.md` + `skill-manifest.yaml` files keep both their `name: gm-agent-*` frontmatter fields exactly as-is — each file has exactly one `gm-agent-` hit on line 2 and that hit MUST stay dashed per REF-02/REF-04 (filesystem name matches `parseSkillMd`'s `skillMeta.name === dirName` assertion). No internal self-references in those files beyond line 2 (verified via grep), so nothing else to sweep in the 7 agent dirs. Agent SKILL.md bodies do not reference sibling agents by name, so no cross-agent prose sweep is required in the agent files themselves.

### module-help.csv source form (REF-01, Pitfall #4)

- **D-64:** `src/gomad-skills/module-help.csv` source rows switch from dashed (`gm-agent-tech-writer`) to colon form (`gm:agent-tech-writer`) in the `skill` column. This makes the source row match the user-visible form directly — the installer's current `fromUserVisibleAgentId()` reverse-lookup in `tools/installer/core/installer.js:1108-1112` becomes a no-op (internal lookup already matches user-visible emit), and `toUserVisibleAgentId()` at line 1103 stays a no-op pass-through. **Simplification action**: delete both helpers; the `emittedAgentName` / `emittedPhase` variables become plain `rawAgentName.trim()` / `phase || ''` passes. Rationale: rejects keep-dashed-as-internal-ref (leaves source out-of-sync with shipped CSV and carries helper-code debt) and rejects schema-comment-only (doesn't address the root mismatch).
- **D-65:** The filesystem directory names (`src/gomad-skills/*/gm-agent-*/`) and `skill-manifest.yaml`/`SKILL.md` `name:` fields stay dashed independently of D-64 — the `module-help.csv` `skill` column is a semantic pointer (agent-command id), not a filesystem-path. The asymmetry is: filesystem artifacts dashed (Windows-safe, REF-02), prose/CSV colon (matches command namespace, REF-01). Downstream code (installer's agent-name lookup + manifest generation) already handles the asymmetry correctly; D-64 only removes the dash→colon transform on the module-help merge path.

### Orphan-reference regression gate (REF-01, REF-04, SC#2)

- **D-66:** A **new dedicated test script** implements the `gm-agent-*` orphan-reference regression gate. Filename: `test/test-orphan-refs.js`. npm script alias: `test:orphan-refs`. Existing `test:refs` (CSV workflow-file extraction per `test-file-refs-csv.js`) stays unchanged — renaming would conflate two unrelated concerns and break muscle memory.
- **D-67:** `test-orphan-refs.js` contract:
  - Runs `grep -rn 'gm-agent-'` over the repo (excluding `node_modules/`, `.git/`, `.planning/`, and any archived `old-milestone-*` or similar historical paths)
  - For each hit, matches against an allowlist file at `test/fixtures/orphan-refs/allowlist.json`
  - Allowlist entries have shape `{ path: <relative-path>, lineContainsPattern: <string or regex>, reason: <short why> }` — entries match either a specific line pattern on a specific path or a whole-file waive for unavoidable filesystem-path fixtures
  - **Exit 0**: every hit matches an allowlist entry. **Exit 1**: any unallowlisted hit, printed with path + line + 3 lines of context.
  - Allowlist bootstrap at plan time: populated by running the grep against the codebase AFTER D-62/D-64 prose rewrites land, and recording the remaining legitimate hits (filesystem path refs in `tools/installer/ide/shared/agent-command-generator.js` `dir:` strings, installer comments describing filesystem layout, test assertions referencing `.claude/skills/gm-agent-*/` absence, `parseSkillMd`'s dir-name validation comment, the 7 agent `name:` frontmatter lines, `.planning/` archived content). Expected allowlist size: ~30-50 entries.
- **D-68:** Wire `test:orphan-refs` into `npm run quality` aggregate. Current `quality` script is `format:check && lint && lint:md && docs:build && test:install && test:integration && validate:refs && validate:skills` — insert `test:orphan-refs` after `validate:skills` (terminal gate, alongside other ref/schema validators). Also add to `npm test` sequence (currently `test:refs && test:install && lint && lint:md && format:check`) — insert after `test:refs`. Both locations needed: `quality` is the publish gate, `test` is the dev-fast gate.

### Tarball verification extension (REL-03, SC#3)

- **D-69:** Extend the existing `test/test-gm-command-surface.js` Phase C install-smoke (not `tools/verify-tarball.js`). Phase 9 changes:
  - Flip the currently-conditional `.claude/commands/gm/agent-*.md` structural assertion to a **hard assertion** — a missing agent-command file must fail Phase C. (This flip was explicitly anticipated in the existing file's header comment: "Phase 6 will flip the conditional structural assertion into a hard assertion".)
  - Add a **negative assertion**: after `gomad install` exits cleanly, assert the tempDir does NOT contain `.claude/skills/gm-agent-<any-of-7>/`. Both presence and absence are verified in a single Phase C pass.
  - All 7 agent launcher files enumerated explicitly (analyst, tech-writer, pm, ux-designer, architect, sm, dev) rather than globbed — catches the case where 6 generate and 1 silently doesn't.
- **D-70:** Phase C scope stays **empty-tempDir fresh install only**. The v1.1→v1.2 upgrade path is already covered by Phase 7's `test-legacy-v11-upgrade.js` (pre-seeds `.claude/skills/gm-agent-*/` dirs then installs; asserts legacy cleanup). Phase 9 doesn't add a redundant v1.1 fixture to Phase C. If Phase 7's test proves insufficient post-Phase-9, escalate via the `gaps` loop — don't pre-emptively layer belt-and-suspenders.
- **D-71:** `tools/verify-tarball.js` extension: add a grep-clean pass over tarball file list for user-visible `gm-agent-` strings. The existing Phase 2 already does grep-clean for `bmad/bmm`; Phase 9 adds a third pass for `gm-agent-` with allowlist (filesystem path refs in shipped installer code, the 7 skill-dir `name:` frontmatter lines). Allowlist pattern mirrors D-67's structure but scoped to the shipped tarball; bootstrap populates from actual tarball output post-D-62/D-64. Complements D-69's install-smoke — tarball check validates *shipped content*, Phase C validates *install output*.

### CHANGELOG BREAKING section + release mechanics (REL-02, REL-05, REL-06)

- **D-72:** `CHANGELOG.md` entry for v1.2.0 **matches the v1.1.0 entry structure**: `## [1.2.0] - <date>`, then Summary → Added → Changed → Removed → `### BREAKING CHANGES`. The BREAKING section is a normal same-level subsection (like v1.1), not an elevated callout at the top. Rationale: matches established project pattern, internal audience doesn't need the visual shouting, the `### BREAKING CHANGES` header alone is prominent enough.
- **D-73:** BREAKING section content: **one-paragraph upgrade guidance**, not a per-agent before/after table. Shape:
  > The 7 `gm-agent-*` skill personas are no longer installed as `.claude/skills/gm-agent-*/` skills — they ship as `/gm:agent-*` slash commands at `.claude/commands/gm/agent-*.md`. Upgrading from v1.1.0: run `gomad install` to regenerate; the installer auto-removes legacy `.claude/skills/gm-agent-*/` directories (see Phase 7 upgrade-safety) and writes the new command stubs. If you scripted `/gm-agent-*` invocations (pre-v1.2 dash-form), update to `/gm:agent-*` (colon-form).
  Rationale: rejects per-agent table (overkill for internal audience) and rejects one-liner (\"run gomad install\") which hides the actual mental-model shift from skill to command.
- **D-74:** Publish mechanism for v1.2.0: **manual `npm publish`** from a clean workspace after `npm run quality` + `npm run test:tarball` + `npm run test:gm-surface` + `npm run test:e2e` all exit 0. No CI workflow change. Uses existing npm auth (granular access token with Bypass 2FA enabled per PROJECT.md constraint; classic automation tokens revoked Dec 2025). Matches how v1.1.0 shipped. OIDC trusted-publishing workflow is valuable but expands Phase 9 scope — tracked as a follow-up for a later patch (candidate REL-F2 requirement).
- **D-75:** Release sequencing (REL-04/05/06): (1) merge all Phase 9 plan commits to `main`, (2) bump `package.json` version `1.1.1` → `1.2.0` in a dedicated commit (`chore(09): bump version to 1.2.0`), (3) run full gate stack locally: `npm run quality` && `npm run test:tarball` && `npm run test:gm-surface` && `npm run test:e2e`, (4) `npm publish --access public` (dist-tag defaults to `latest`), (5) `git tag v1.2.0 && git push origin v1.2.0`, (6) smoke: `npm install @xgent-ai/gomad@1.2.0 --prefix /tmp/verify-v1.2 && /tmp/verify-v1.2/node_modules/.bin/gomad install --directory <scratch>` to confirm published tarball installs clean.
- **D-76:** `v1.1.0` posture: **keep as-is**, no deprecation. Per ROADMAP SC#5 literal: "`v1.1.0` is retained as a prior stable (no deprecation unless issues emerge)." If post-v1.2 publish a user reports v1.1→v1.2 upgrade issues, revisit deprecating v1.1; otherwise leave the npm metadata untouched.

### Claude's Discretion

- **Plan decomposition** — Phase 9 covers 9 requirements (REF-01, REF-02, REF-04, REF-05, REL-02, REL-03, REL-04, REL-05, REL-06). Two plausible splits: (a) 2 plans — "sweep + regression gate + tarball verification" (REF-01/02/04/05 + REL-03 + SC#2) AND "CHANGELOG + publish + tag" (REL-02/04/05/06); (b) 3 plans — "prose sweep" + "verification gates" + "release mechanics". Tight coupling between D-62/D-64 prose rewrites and D-67 allowlist bootstrap (allowlist can only be populated *after* prose lands) argues for (a) or for sequencing within a single plan. Planner picks based on reviewability — expect 2-3 plans.
- **Exact allowlist contents for D-67 and D-71** — populated by running grep against the codebase after D-62/D-64 rewrites. Size and exact entries are an implementation detail; expected ~30-50 entries for `test-orphan-refs` (broader scope), ~10-15 for `verify-tarball` (narrower, tarball-only).
- **Allowlist format encoding** — JSON as specified in D-67, or could be YAML / plain text with line-based entries. Planner picks based on existing `test/fixtures/` conventions (mostly JSON + CSV).
- **Whether D-75's smoke step (step 6) is fully automated** — could be a simple manual `npm install` + `gomad install` invocation, or could be a new `tools/verify-published-tarball.js` script that automates the flow. Manual is fine for a one-off release smoke; automation pays off only if publish cadence increases.
- **`chore(09): bump version to 1.2.0` commit timing** — could be (a) in the same PR as the final Phase 9 plan, (b) a dedicated release-prep commit after all plans land, or (c) on a separate `release/v1.2.0` branch. Planner aligns with project convention (main-only workflow per `gitStatus` — option (b) is the fit).
- **Whether the `## Changed` section of v1.2.0 CHANGELOG lists every Phase 5-9 change or summarizes at milestone-level** — v1.1.0's entry is milestone-summary style, so v1.2.0 likely mirrors. Planner keeps diff scannable.
- **Whether `package.json` version lands at `1.2.0` or `1.2.0-rc.1` during Phase 9 execution** — v1.1 went direct to `1.1.0` (no rc stage). Follow same pattern unless a pre-release smoke rehearsal is desired. Planner decides.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase-9 requirements + success criteria

- `.planning/ROADMAP.md` §"Phase 9: Reference Sweep + Verification + Release" — phase goal, 6 success criteria, dependency declaration on Phases 6/7/8
- `.planning/REQUIREMENTS.md` §REF — REF-01, REF-02, REF-04, REF-05 requirement statements (lines 30-34)
- `.planning/REQUIREMENTS.md` §REL — REL-02, REL-03, REL-04, REL-05, REL-06 requirement statements (lines 49-53)
- `.planning/PROJECT.md` — v1.2 milestone goal, `Key Decisions` table especially D-27 "E2E test verifies tarball structurally" and the launcher-form commitment, `Constraints` (granular token w/ Bypass 2FA post-Dec-2025)

### Pitfall research (Phase-9 load-bearing pitfalls)

- `.planning/research/PITFALLS.md` §"Pitfall 4: Orphan references to `gm-agent-*` linger across source/tests/docs/manifests after the rename sweep" — **defining pitfall for this phase**. Informs D-64 (`module-help.csv` schema decision), D-67 (dedicated orphan-refs gate + allowlist), D-71 (tarball grep-clean extension).
- `.planning/research/PITFALLS.md` §"Pitfall 16: Case sensitivity inconsistency between `gm:agent-pm`, `gm/agent-pm`, `gm-agent-pm`, and GoMad/gomad" — informs D-62's blanket "slash command form" decision (rejects mixed-form hybrid).
- `.planning/research/PITFALLS.md` — v1.2 BREAKING discussion around line 373 and release-mechanics around line 381 — informs D-72/D-73 CHANGELOG callout design, D-76 v1.1.0 posture.

### Prior-phase decisions this phase depends on

- `.planning/phases/05-foundations-command-surface-validation/05-CONTEXT.md` §D-02 — `test-gm-command-surface.js` structural + install-smoke test shape. D-69 extends the Phase C assertion level.
- `.planning/phases/05-foundations-command-surface-validation/05-CONTEXT.md` §D-03 — no minimum Claude Code version pin (informs D-74 "no preflight CC-version assertion before publish").
- `.planning/phases/06-installer-mechanics-copy-manifest-stub-generation/06-CONTEXT.md` §D-14, §D-15, §D-20 — launcher extractor contract + symlink-unlink (context for D-69 hard-assert — missing launcher file now indicates installer regression, not a Phase 5 baseline).
- `.planning/phases/07-upgrade-safety-manifest-driven-cleanup/07-CONTEXT.md` §D-42, §D-43 — v1.1 legacy cleanup scope + snapshot-first contract. D-70 relies on `test-legacy-v11-upgrade.js` (Phase 7 output) covering the upgrade path so Phase 9's Phase C doesn't need to duplicate it.

### Target files for Phase 9 edits

#### Prose sweep (D-62)

- `src/gomad-skills/4-implementation/gm-sprint-agent/workflow.md:90` — "invoking the `gm-agent-pm` skill" → "invoking the `/gm:agent-pm` slash command"
- `src/gomad-skills/4-implementation/gm-sprint-agent/workflow.md:176` — same pattern
- `src/gomad-skills/4-implementation/gm-sprint-agent/workflow.md:245` — "invoking the `gm-agent-dev` skill" → "invoking the `/gm:agent-dev` slash command"
- `src/gomad-skills/4-implementation/gm-sprint-agent/workflow.md:291` — same pattern
- `src/gomad-skills/4-implementation/gm-epic-demo-story/SKILL.md:20` — "invoke `/gm-agent-pm`" → "invoke `/gm:agent-pm`"

#### module-help.csv rewrite + installer simplification (D-64)

- `src/gomad-skills/module-help.csv` — 5 rows (lines 6-10), `skill` column: `gm-agent-tech-writer` → `gm:agent-tech-writer`
- `tools/installer/core/installer.js:1097-1112` — comment block + `toUserVisibleAgentId` + `fromUserVisibleAgentId` helpers deleted; `emittedAgentName` becomes `rawAgentName.trim()`; `emittedPhase` becomes `phase || ''`. Update surrounding comments (lines 1097-1102, 1127-1129, 1210-1222) to reflect that source now carries colon form directly.
- `tools/installer/core/installer.js:1138` — `agentCommand` construction already uses `userVisibleAgentName`; confirm unchanged behavior (should be transparent to the rename since the user-visible form is already what's emitted).

#### Orphan-refs gate (D-66/D-67/D-68)

- `test/test-orphan-refs.js` — NEW. Mirrors the style of `test/test-file-refs-csv.js` (node-native, exit-code semantics, colored output).
- `test/fixtures/orphan-refs/allowlist.json` — NEW. Seed content bootstrapped post-D-62/D-64 sweep.
- `package.json` — `scripts` section: add `"test:orphan-refs": "node test/test-orphan-refs.js"`; update `quality` to `"npm run format:check && npm run lint && npm run lint:md && npm run docs:build && npm run test:install && npm run test:integration && npm run validate:refs && npm run validate:skills && npm run test:orphan-refs"`; update `test` to `"npm run test:refs && npm run test:orphan-refs && npm run test:install && npm run lint && npm run lint:md && npm run format:check"`.

#### Tarball + install-smoke verification (D-69/D-70/D-71)

- `test/test-gm-command-surface.js` Phase C — flip conditional assertion to hard; add negative assertion; enumerate all 7 agents.
- `tools/verify-tarball.js` — add third grep-clean pass for `gm-agent-` with allowlist at `tools/fixtures/tarball-grep-allowlist.json` (or equivalent).

#### CHANGELOG + version bump (D-72/D-73/D-75)

- `CHANGELOG.md` — new `## [1.2.0] - <date>` entry at top, before current `## [1.1.0]` entry. Sections: Summary, Added, Changed, Removed, `### BREAKING CHANGES` matching D-73 paragraph.
- `package.json` — `"version": "1.1.1"` → `"version": "1.2.0"`.

### Downstream contract (DO NOT MODIFY)

- `tools/installer/core/manifest-generator.js:parseSkillMd` — `skillMeta.name === dirName` assertion. D-63 preserves this by not touching the 7 agent `name:` frontmatter fields. D-67 allowlist must cover the dir-name validation comment/assertion area.
- `src/gomad-skills/*/gm-agent-*/skill-manifest.yaml` + `SKILL.md` — `name: gm-agent-*` frontmatter on line 2 of each file (7×2 = 14 files). MUST stay dashed (REF-02/REF-04). D-67 allowlist covers each of the 14 lines explicitly.
- `.planning/**` — archived planning artifacts. MUST stay untouched (ROADMAP SC#1 explicit). D-67's grep scope excludes `.planning/` entirely.

### Existing test + gate infrastructure

- `test/test-file-refs-csv.js` + `tools/validate-file-refs.js` + `test/fixtures/file-refs-csv/` — existing `test:refs` + `validate:refs` pair. Unchanged by Phase 9; D-66 explicitly keeps them separate from `test:orphan-refs`.
- `test/test-legacy-v11-upgrade.js` — Phase 7's v1.1→v1.2 upgrade-path test. D-70 relies on this covering legacy fixture scope; Phase 9 doesn't extend or duplicate.
- `tools/validate-skills.js` — existing `validate:skills` gate. Unchanged by Phase 9 (but the `WF_SKIP_SKILLS` set at line 395 is already aware of `gm-agent-tech-writer` and needs no update).
- `test/test-gm-command-surface.js` — existing Phase A/B/C structure. D-69 tightens Phase C.
- `tools/verify-tarball.js` — existing Phase 1/2 (forbidden paths + grep-clean for bmad/bmm). D-71 adds Phase 3 for `gm-agent-` with allowlist.

### Codebase conventions

- `.planning/codebase/CONVENTIONS.md` — Prettier 140-char, ESLint flat config, test file naming (`test-<thing>.js` under `test/`).
- `.planning/codebase/TESTING.md` — test-runner patterns (node-native, ANSI colors, exit codes).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- **`tools/installer/core/installer.js:1088` `mergeModuleHelpCatalogs`** — the dash↔colon transform helpers at lines 1103-1112 are the target of D-64's simplification (delete both helpers, pass through `rawAgentName` / `phase` directly).
- **`tools/installer/core/installer.js:1082-1253` merged-help flow** — already correctly emits `gm:agent-*` in the shipped `gomad-help.csv`; D-64 makes the source row match without behavior change to the emit.
- **`test/test-gm-command-surface.js` Phase C** — install-smoke harness (tempDir, `npm pack`, `gomad install --yes --directory <tempDir>`, post-install assertion). D-69 tightens existing assertion.
- **`tools/verify-tarball.js` Phase 2 grep-clean** — existing bmad/bmm pattern gives D-71 a direct analog.
- **`test/test-file-refs-csv.js`** — structural template for D-66/D-67's new `test-orphan-refs.js` (exit codes, ANSI colors, fixture-driven testing shape).
- **Phase 7's `test-legacy-v11-upgrade.js`** — v1.1→v1.2 upgrade-path coverage that D-70 relies on, meaning Phase 9's Phase C stays scoped to fresh-tempDir install.

### Established Patterns

- **Source/filesystem asymmetry**: source tree uses dashed form for filesystem names; user-visible surface (installed CSV, command namespace) uses colon form. Phase 6's installer transform codifies this. D-64 narrows the asymmetry to *filesystem names only* (directories + YAML `name:` fields), aligning CSV source with user-visible output.
- **npm script composition**: `quality` is the publish gate (strict, serial, multi-step); `test` is the dev-fast gate (single-threaded run of core tests). D-68 adds `test:orphan-refs` to both.
- **Test-fixture location**: `test/fixtures/<feature>/` convention (e.g., `phase-07/`, `file-refs-csv/`). D-67 uses `test/fixtures/orphan-refs/`.
- **Matching upstream CHANGELOG pattern**: `## [version] - date`, sectioned Summary/Added/Changed/Removed/BREAKING. D-72 matches v1.1.0 exactly.

### Integration Points

- **`package.json` scripts block** — D-68/D-74 touch this (add new script, update `quality` + `test` sequences, version bump).
- **`CHANGELOG.md` top of file** — D-72 prepends the new v1.2.0 entry.
- **Git tag + branch protection on `main`** — D-75 step 5 pushes the `v1.2.0` tag. Confirm branch protection rules allow tag pushes.
- **npm registry auth** — D-74 relies on existing granular access token (user-managed; no workflow wiring).

</code_context>

<specifics>
## Specific Ideas

- "`test:refs` stays as-is, orphan-refs is its own script" — avoid conflating two unrelated ref-checking concerns.
- "Match v1.1.0 CHANGELOG structure" — don't invent a new entry template; mirror the established section layout including the `### BREAKING CHANGES` placement.
- "Manual `npm publish` matches how v1.1 shipped" — no infrastructure changes in Phase 9; OIDC is a follow-up not a blocker.
- "Source `module-help.csv` switches to colon form" — the internal-ref convention breaks symmetry with user-visible output; fix both the data and the transform helper in the same plan.

</specifics>

<deferred>
## Deferred Ideas

- **OIDC trusted-publishing workflow** — moved to a future patch. Candidate requirement ID: `REL-F2`. Not a v1.2 blocker.
- **Automated published-tarball smoke** (`tools/verify-published-tarball.js`) — only pays off at higher publish cadence; manual step in D-75 is fine for v1.2.
- **v1.1.0 deprecation** — deferred until/unless issues emerge post-v1.2 publish. Per ROADMAP SC#5.
- **Per-agent before/after migration table in CHANGELOG** — rejected for v1.2 (over-engineered for internal audience). Revisit if external contributors land.
- **Belt-and-suspenders v1.1-fixture assertion in Phase C** — Phase 7's `test-legacy-v11-upgrade.js` covers this; rely on it unless gaps are found.
- **Extending the orphan-refs gate to cover historical `.planning/` paths** — explicitly out of scope; archived history stays untouched.

</deferred>

---

*Phase: 09-reference-sweep-verification-release*
*Context gathered: 2026-04-23*
