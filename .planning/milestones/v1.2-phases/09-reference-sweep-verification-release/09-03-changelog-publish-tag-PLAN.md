---
phase: 09-reference-sweep-verification-release
plan: 03
type: execute
wave: 3
depends_on:
  - 09-01
  - 09-02
files_modified:
  - CHANGELOG.md
  - package.json
autonomous: false
requirements:
  - REL-02
  - REL-04
  - REL-05
  - REL-06
tags:
  - release
  - changelog
  - npm-publish
  - git-tag

user_setup:
  - service: npm-registry
    why: "Publish @xgent-ai/gomad@1.2.0 requires authenticated npm access (REL-05)"
    env_vars: []
    dashboard_config:
      - task: "Verify npm auth active: `npm whoami` must return the maintainer account"
        location: "Local shell (npm auth uses ~/.npmrc or OS keychain)"
      - task: "Verify granular access token has Bypass 2FA enabled (PROJECT.md constraint — classic automation tokens revoked Dec 2025)"
        location: "npmjs.com → Account → Access Tokens"
  - service: github-origin
    why: "Push v1.2.0 tag to origin (REL-06)"
    env_vars: []
    dashboard_config:
      - task: "Verify branch protection on `main` permits tag pushes (push-tag-only, not branch push)"
        location: "GitHub → Settings → Branches → main → tag protection rules"

must_haves:
  truths:
    - "CHANGELOG.md has a new `## [1.2.0] - <date>` section ABOVE the existing v1.1.0 entry, matching the v1.1.0 structure (Summary → Added → Changed → Removed → ### BREAKING CHANGES)"
    - "The BREAKING CHANGES subsection contains the one-paragraph upgrade guidance specified in D-73 (skill → slash-command pivot, `gomad install` regenerates, `/gm-agent-*` → `/gm:agent-*` scripting note) AND retains the migration-guidance sentence that references the before-form `gm-agent-` so the upgrade diff is unambiguous"
    - "`package.json` version field reads `\"version\": \"1.2.0\"` (bumped from `1.1.1`)"
    - "The full gate stack exits 0: `npm run quality && npm run test:tarball && npm run test:gm-surface && npm run test:e2e`"
    - "After human approval, `@xgent-ai/gomad@1.2.0` is published to npm with `dist-tag: latest` (REL-05)"
    - "After publish, `v1.2.0` git tag is applied on `main` HEAD and pushed to origin (REL-06)"
    - "Published tarball installs clean in an isolated temp dir and `gomad install` exits 0 (smoke test verification per D-75 step 6)"
    - "`v1.1.0` remains on npm as `prior-stable` posture — no `npm deprecate` issued (D-76)"
    - "`.planning/STATE.md` YAML frontmatter fields `total_plans`, `completed_plans`, `completed_phases` are updated in addition to the prose body (frontmatter is authoritative for `/gsd-next` per gsd-tools)"
  artifacts:
    - path: "CHANGELOG.md"
      provides: "v1.2.0 release notes with BREAKING section"
      contains: "## [1.2.0]"
    - path: "package.json"
      provides: "Version bumped to 1.2.0"
      contains: "\"version\": \"1.2.0\""
    - path: "(git tag) v1.2.0"
      provides: "Immutable version anchor pointing at Phase 9 HEAD on main"
      contains: "v1.2.0"
    - path: "(npm registry) @xgent-ai/gomad@1.2.0"
      provides: "Published package with `latest` dist-tag"
      contains: "1.2.0"
  key_links:
    - from: "CHANGELOG.md v1.2.0 BREAKING section"
      to: "installed `.claude/commands/gm/agent-*.md` user-visible surface"
      via: "prose upgrade guidance per D-73"
      pattern: "/gm:agent-\\*"
    - from: "package.json version 1.2.0"
      to: "npm registry 1.2.0 tarball"
      via: "npm publish"
      pattern: "\"version\": \"1\\.2\\.0\""
    - from: "git tag v1.2.0"
      to: "main branch HEAD at release commit"
      via: "git tag + git push origin v1.2.0"
      pattern: "v1\\.2\\.0"
---

<objective>
Land the CHANGELOG entry + version bump in autonomous tasks, then human-gate the npm publish + git tag steps. Closes v1.2 milestone.

Purpose: Make the release transition auditable (CHANGELOG explaining the BREAKING surface change), reproducible (gate stack runs locally before publish), and reversible up to the tag push (version bump + CHANGELOG can be amended before `npm publish`; once published, the tag is the immutable anchor).

Output:
- CHANGELOG.md v1.2.0 entry (autonomous)
- package.json version 1.1.1 → 1.2.0 (autonomous, separate commit per D-75)
- Gate-stack verification (autonomous)
- `npm publish` checkpoint (human-verify, blocking)
- `git tag v1.2.0 && git push origin v1.2.0` (autonomous after publish)
- Post-publish smoke test (autonomous)
</objective>

<execution_context>
@/Users/rockie/Documents/GitHub/xgent/gomad/.claude/get-shit-done/workflows/execute-plan.md
@/Users/rockie/Documents/GitHub/xgent/gomad/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/ROADMAP.md
@.planning/REQUIREMENTS.md
@.planning/phases/09-reference-sweep-verification-release/09-CONTEXT.md
@.planning/phases/09-reference-sweep-verification-release/09-PATTERNS.md
@CHANGELOG.md
@package.json

<!--
  09-01-SUMMARY.md and 09-02-SUMMARY.md are produced by execute-plan for
  Plans 01 and 02 and are NOT required inputs for Plan 03. If they exist at
  runtime (serial execution path), the executor MAY read them for post-Plan
  context. If they do not exist (fresh re-plan, or checkpoint resume), Plan 03
  MUST still execute — it depends on the *actual* committed state of CHANGELOG,
  package.json, and the test suite, not on SUMMARY content. Treat both SUMMARYs
  as soft/optional context, never blockers.
-->

<release_sequencing>
Per D-75, the ordered sequence is:
1. (Plans 01 + 02 commits already on `main`)
2. `chore(09): bump version to 1.2.0` — dedicated commit, package.json version only
3. Run full gate stack locally: `npm run quality && npm run test:tarball && npm run test:gm-surface && npm run test:e2e`
4. `npm publish --access public` (dist-tag defaults to `latest`)
5. `git tag v1.2.0 && git push origin v1.2.0`
6. Smoke: install published tarball into a scratch dir, run `gomad install`, confirm clean exit

The CHANGELOG entry can land BEFORE the version bump commit (prepend-then-bump is a common shape) or together with it. Planner chooses CHANGELOG-first (Task 1) → version bump (Task 2) → gate run (Task 3) → human-verify publish (Task 4) → tag + smoke (Task 5) to keep each commit minimal and reversible.
</release_sequencing>

<changelog_template>
Full prepared content for the v1.2.0 CHANGELOG entry (Task 1 copies this verbatim, substituting the date placeholder `<YYYY-MM-DD>` with today's date in ISO format):

```markdown
## [1.2.0] - <YYYY-MM-DD>

### Summary

v1.2.0 completes the agent-surface migration: the 7 `gm-agent-*` personas ship
as `/gm:agent-*` slash commands at `.claude/commands/gm/agent-*.md` instead of
`.claude/skills/gm-agent-*/` skills. Installer now copies (never symlinks),
writes a file manifest, and performs manifest-driven cleanup on re-install with
snapshot-then-remove safety. Fresh-install and v1.1→v1.2 upgrade paths are
both covered by automated tests. Verification gates catch `gm-agent-` leakage
in shipped content and install output. PRD + product-brief skills have been
retuned for coding-agent consumers (human-founder framing stripped).

### Added

- `.claude/commands/gm/agent-<name>.md` launcher stubs for the 7 agent
  personas (analyst, tech-writer, pm, ux-designer, architect, sm, dev),
  generated at install time from each `gm-agent-*/skill-manifest.yaml`.
- `_gomad/_config/files-manifest.csv` — manifest v2 schema with
  `schema_version`, `type`, `name`, `module`, `path`, `hash` columns;
  installer reads + writes with `csv-parse`.
- Manifest-driven cleanup on re-install: realpath-contained under `.claude/`
  and `_gomad/` install roots, snapshot-then-remove with backups at
  `_gomad/_backups/<timestamp>/`, `--dry-run` flag for preview.
- First v1.2 install on a v1.1 workspace explicitly cleans legacy
  `.claude/skills/gm-agent-*/` directories.
- `test/test-orphan-refs.js` + `test/fixtures/orphan-refs/allowlist.json`:
  dedicated regression gate for `gm-agent-` reference drift.
- `tools/verify-tarball.js` Phase 3 grep-clean pass for `gm-agent-` residuals
  in shipped content (narrow allowlist at
  `tools/fixtures/tarball-grep-allowlist.json`).
- `test/test-gm-command-surface.js` Phase C: hard assertion on all 7
  `.claude/commands/gm/agent-*.md` launcher files + negative assertion on
  `.claude/skills/gm-agent-*/` absence.

### Changed

- Installer switched from `fs.ensureSymlink` to `fs.copy`; pre-copy
  `fs.lstat` check unlinks pre-existing symlinks to prevent v1.1→v1.2
  source-tree pollution.
- Cross-skill invokes in `gm-sprint-agent/workflow.md` and
  `gm-epic-demo-story/SKILL.md` now reference `/gm:agent-*` slash commands
  instead of `gm-agent-*` skills (dropped "via the Skill tool" clause).
- `src/gomad-skills/module-help.csv` source rows carry user-visible colon
  form (`gm:agent-tech-writer`) directly; installer no longer transforms at
  merge time.
- `gm-create-prd` + `gm-product-brief` content refined for coding-agent
  consumers: human-founder framing (ARR/CAC/LTV/DAU, "why now?",
  go-to-market language, persona demographics) stripped; aggressive vision
  + MVP scope amplified; dev-ready requirements sharpened (stable REQ-IDs,
  machine-verifiable acceptance criteria, explicit out-of-scope).
- `PROJECT.md` line-78 factual correction: installer is CommonJS (not
  `type: module`).

### Removed

- `.claude/skills/gm-agent-*/` skill directories — no longer installed;
  cleaned up on upgrade from v1.1.
- `toUserVisibleAgentId` / `fromUserVisibleAgentId` helpers in
  `tools/installer/core/installer.js` — no-op after source/emit alignment.

### BREAKING CHANGES

The 7 `gm-agent-*` skill personas are no longer installed as
`.claude/skills/gm-agent-*/` skills — they ship as `/gm:agent-*` slash
commands at `.claude/commands/gm/agent-*.md`. Upgrading from v1.1.0: run
`gomad install` to regenerate; the installer auto-removes legacy
`.claude/skills/gm-agent-*/` directories (see Phase 7 upgrade-safety) and
writes the new command stubs. If you scripted `/gm-agent-*` invocations
(pre-v1.2 dash-form), update to `/gm:agent-*` (colon-form).
```

**Invariant (warning #7):** the BREAKING block MUST retain both forms in the
before→after narrative so the migration guidance is unambiguous:
- the before-form token `gm-agent-` (dash) — appears in both the bare-word
  `.claude/skills/gm-agent-*/` references AND the parenthetical
  "(pre-v1.2 dash-form)" note after `/gm-agent-*`
- the after-form token `gm:agent-*` (colon) — appears in the
  `.claude/commands/gm/agent-*.md` path AND as `/gm:agent-*` slash-command
  literal

Stripping either side would hide the mental-model shift. Task 1's verify
block has explicit grep acceptance for these tokens inside the BREAKING
subsection.
</changelog_template>
</context>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Prepend v1.2.0 CHANGELOG entry matching v1.1.0 structure + D-73 BREAKING content</name>
  <files>CHANGELOG.md</files>
  <read_first>
    - CHANGELOG.md (entire file — verify current state: preamble lines 1-5, then `## [1.1.0] - 2026-04-09` at line 7)
    - .planning/phases/09-reference-sweep-verification-release/09-CONTEXT.md §D-72, §D-73 (CHANGELOG structure + BREAKING content)
    - .planning/phases/09-reference-sweep-verification-release/09-PATTERNS.md §"CHANGELOG.md (MODIFY, content/release notes)" (full template)
  </read_first>
  <action>
Prepend the v1.2.0 entry to `CHANGELOG.md`. Exact placement: immediately AFTER the preamble (lines 1-5) and BEFORE the existing `## [1.1.0] - 2026-04-09` header at line 7.

Concretely, the resulting file must look like:

```markdown
# Changelog

All notable changes to GoMad are documented in this file. This changelog starts
fresh at v1.1.0 and does not include the upstream BMAD Method history. See
[LICENSE](LICENSE) and [README.md](README.md#credits) for the fork's origin.

## [1.2.0] - <YYYY-MM-DD>
   ...
   (full v1.2.0 block from the `<changelog_template>` section of the plan context —
    copy VERBATIM, substituting `<YYYY-MM-DD>` with today's date from
    `date -u +%Y-%m-%d` or equivalent ISO 8601 calendar date)

## [1.1.0] - 2026-04-09
   ...
   (existing content, unchanged)
```

**Critical rules:**
- Preamble lines 1-5 are UNCHANGED.
- v1.1.0 entry (lines 7-49+) is UNCHANGED — the prepend adds above it, does NOT modify below it.
- `<YYYY-MM-DD>` in the `## [1.2.0] - <YYYY-MM-DD>` header MUST be replaced with today's date in ISO format (e.g. `2026-04-23`). Use `new Date().toISOString().slice(0, 10)` in JavaScript or `date -u +%Y-%m-%d` in bash.
- Section order in the v1.2.0 entry MUST be: Summary → Added → Changed → Removed → `### BREAKING CHANGES` (per D-72 matching v1.1.0 pattern — no elevated callout at top).
- The `### BREAKING CHANGES` paragraph content MUST match the D-73 text verbatim (already included in the template) — including BOTH the before-form `gm-agent-` references (bare `.claude/skills/gm-agent-*/` path + the parenthetical "pre-v1.2 dash-form" migration note) AND the after-form `/gm:agent-*` references. The before→after framing is load-bearing for upgrade guidance; future edits MUST NOT strip either side (Task 1's verify block enforces this).
- After writing, run `npm run lint:md` to ensure markdown passes linting (markdownlint-cli2). Fix any lint errors (typical: trailing whitespace, MD047 final-newline).
- After `lint:md`, run `npm run format:check` (prettier). If prettier complains about CHANGELOG, run `npm run format:fix` and re-check.

Do NOT touch `package.json` in this task — version bump is Task 2.
  </action>
  <verify>
    <automated>
      grep -qE '^## \[1\.2\.0\] - 20[0-9]{2}-[0-9]{2}-[0-9]{2}$' CHANGELOG.md \
      && grep -qE '^## \[1\.1\.0\] - 2026-04-09$' CHANGELOG.md \
      && awk '/^## \[1\.2\.0\]/,/^## \[1\.1\.0\]/' CHANGELOG.md | grep -q '^### Summary$' \
      && awk '/^## \[1\.2\.0\]/,/^## \[1\.1\.0\]/' CHANGELOG.md | grep -q '^### Added$' \
      && awk '/^## \[1\.2\.0\]/,/^## \[1\.1\.0\]/' CHANGELOG.md | grep -q '^### Changed$' \
      && awk '/^## \[1\.2\.0\]/,/^## \[1\.1\.0\]/' CHANGELOG.md | grep -q '^### Removed$' \
      && awk '/^## \[1\.2\.0\]/,/^## \[1\.1\.0\]/' CHANGELOG.md | grep -q '^### BREAKING CHANGES$' \
      && awk '/^### BREAKING CHANGES$/,/^## \[1\.1\.0\]/' CHANGELOG.md | grep -q '/gm:agent-' \
      && awk '/^### BREAKING CHANGES$/,/^## \[1\.1\.0\]/' CHANGELOG.md | grep -q 'gomad install' \
      && awk '/^### BREAKING CHANGES$/,/^## \[1\.1\.0\]/' CHANGELOG.md | grep -q 'pre-v1\.2 dash-form' \
      && awk '/^### BREAKING CHANGES$/,/^## \[1\.1\.0\]/' CHANGELOG.md | grep -qE 'gm-agent-|\\.claude/skills/gm-agent-' \
      && npm run lint:md \
      && npm run format:check
    </automated>
  </verify>
  <acceptance_criteria>
    - `grep -qE '^## \[1\.2\.0\] - 20[0-9]{2}-[0-9]{2}-[0-9]{2}$' CHANGELOG.md` succeeds (version header with ISO date)
    - `grep -qE '^## \[1\.1\.0\] - 2026-04-09$' CHANGELOG.md` still succeeds (v1.1.0 entry preserved)
    - All 5 section headers present inside the v1.2.0 block (Summary, Added, Changed, Removed, `### BREAKING CHANGES`) — verified by `awk` range scan
    - BREAKING block mentions `/gm:agent-*` (new form) AND `gomad install` (upgrade action) — per D-73 content
    - BREAKING block retains the before-form token `gm-agent-` (either as `.claude/skills/gm-agent-*/` bare reference or inside the `pre-v1.2 dash-form` migration note) — verified by `awk` range scan + grep on the `### BREAKING CHANGES` → `## [1.1.0]` slice (warning #7 invariant: future edits MUST NOT strip the before-side of the migration guidance)
    - BREAKING block contains the literal phrase `pre-v1.2 dash-form` — verified by `awk` range scan (enforces migration-sentence retention per warning #7)
    - Line 1 of file still reads `# Changelog` (preamble untouched)
    - `npm run lint:md` exits 0 (markdownlint-cli2 clean)
    - `npm run format:check` exits 0 (prettier clean)
    - `git diff --stat CHANGELOG.md` shows only additions (no deletions beyond trivial whitespace normalization)
  </acceptance_criteria>
  <done>v1.2.0 entry prepended verbatim per template; v1.1.0 entry untouched; BREAKING block retains before-form `gm-agent-` AND after-form `/gm:agent-*` so the upgrade diff is unambiguous; markdown and prettier gates pass.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Bump package.json version from 1.1.1 to 1.2.0 in a dedicated change</name>
  <files>package.json</files>
  <read_first>
    - package.json (current line 4: `"version": "1.1.1"`)
    - .planning/phases/09-reference-sweep-verification-release/09-CONTEXT.md §D-75 (release sequencing — dedicated commit `chore(09): bump version to 1.2.0`)
  </read_first>
  <action>
Edit `package.json` line 4.

- FROM: `  "version": "1.1.1",`
- TO:   `  "version": "1.2.0",`

Only this single line changes. Do NOT touch any other field (scripts, dependencies, files, publishConfig are all untouched). Do NOT add any new keys.

After edit, run `npm run format:check` to verify prettier is happy. If `prettier-plugin-packagejson` re-sorts anything, allow `npm run format:fix` to normalize.

**Commit convention per D-75:** this task corresponds to the commit message `chore(09): bump version to 1.2.0`. The executor orchestration (outside this task) handles commit framing — this task only produces the file change.
  </action>
  <verify>
    <automated>
      node -e "process.exit(require('./package.json').version === '1.2.0' ? 0 : 1)" \
      && ! grep -q '"version": "1\.1\.1"' package.json \
      && npm run format:check
    </automated>
  </verify>
  <acceptance_criteria>
    - `node -e "console.log(require('./package.json').version)"` outputs `1.2.0`
    - `grep -c '"version": "1.1.1"' package.json` returns `0` (old version fully removed)
    - `grep -c '"version": "1.2.0"' package.json` returns `1`
    - `git diff --stat package.json` shows a single line-pair change (1 `+`, 1 `-`) in the version line — no other fields modified
    - `npm run format:check` exits 0
    - All existing scripts still present: `node -e "const s=require('./package.json').scripts; for (const k of ['test:orphan-refs','quality','test','test:tarball','test:gm-surface','test:e2e']) { if (!s[k]) { console.error('missing:', k); process.exit(1); } }"` exits 0
  </acceptance_criteria>
  <done>Version bumped to 1.2.0; no collateral changes; format check clean.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 3: Run full gate stack locally (quality + tarball + gm-surface + e2e)</name>
  <files>.planning/phases/09-reference-sweep-verification-release/release-logs/*.log</files>
  <read_first>
    - package.json scripts.quality, scripts.test:tarball, scripts.test:gm-surface, scripts.test:e2e (verify all 4 scripts exist)
    - .planning/phases/09-reference-sweep-verification-release/09-CONTEXT.md §D-75 step 3 (gate stack sequence)
  </read_first>
  <action>
Execute the D-75 gate stack in order. All four MUST exit 0 before proceeding to Task 4 (publish checkpoint).

Run each command and capture stdout/stderr to phase-local logs:

```bash
mkdir -p .planning/phases/09-reference-sweep-verification-release/release-logs

npm run quality 2>&1 | tee .planning/phases/09-reference-sweep-verification-release/release-logs/01-quality.log
QUALITY_EXIT=${PIPESTATUS[0]}
[ "$QUALITY_EXIT" = "0" ] || { echo "quality FAILED (exit $QUALITY_EXIT)"; exit 1; }

npm run test:tarball 2>&1 | tee .planning/phases/09-reference-sweep-verification-release/release-logs/02-tarball.log
TARBALL_EXIT=${PIPESTATUS[0]}
[ "$TARBALL_EXIT" = "0" ] || { echo "test:tarball FAILED (exit $TARBALL_EXIT)"; exit 1; }

npm run test:gm-surface 2>&1 | tee .planning/phases/09-reference-sweep-verification-release/release-logs/03-gm-surface.log
GM_EXIT=${PIPESTATUS[0]}
[ "$GM_EXIT" = "0" ] || { echo "test:gm-surface FAILED (exit $GM_EXIT)"; exit 1; }

npm run test:e2e 2>&1 | tee .planning/phases/09-reference-sweep-verification-release/release-logs/04-e2e.log
E2E_EXIT=${PIPESTATUS[0]}
[ "$E2E_EXIT" = "0" ] || { echo "test:e2e FAILED (exit $E2E_EXIT)"; exit 1; }

echo "All 4 gates passed. Ready for publish checkpoint."
```

If ANY gate fails:
- Do NOT proceed to Task 4.
- Triage the failure: is it a regression introduced by Plan 01 or Plan 02 landing? Is it a flaky test?
- Fix the root cause in a new commit (may warrant a gap-closure plan).
- Re-run the full gate stack from scratch.

**DO NOT proceed to Task 4 unless all four gates exit 0.**

Also run `git status` and verify the working tree is clean (no uncommitted changes) before the publish checkpoint — `npm publish` packs from the committed tree, but stray changes could pollute the tarball.
  </action>
  <verify>
    <automated>
      test -f .planning/phases/09-reference-sweep-verification-release/release-logs/01-quality.log \
      && test -f .planning/phases/09-reference-sweep-verification-release/release-logs/02-tarball.log \
      && test -f .planning/phases/09-reference-sweep-verification-release/release-logs/03-gm-surface.log \
      && test -f .planning/phases/09-reference-sweep-verification-release/release-logs/04-e2e.log \
      && [ -z "$(git status --porcelain)" ]
    </automated>
  </verify>
  <acceptance_criteria>
    - `npm run quality` exits 0 (publish gate clean)
    - `npm run test:tarball` exits 0 (tarball hygiene clean; REL-03 shipped-content side)
    - `npm run test:gm-surface` exits 0 (install-smoke Phase C hard assertion + negative assertion pass; REL-03 install-output side)
    - `npm run test:e2e` exits 0 (full E2E install flow clean)
    - All 4 log files exist under `.planning/phases/09-reference-sweep-verification-release/release-logs/`
    - `git status --porcelain` output is empty (no uncommitted changes — committed work tree guarantees npm pack produces a clean tarball)
    - REL-04 satisfied: "`npm run quality`, tarball verification, and E2E fresh-install all exit 0 before publish"
  </acceptance_criteria>
  <done>All 4 gates green, logs captured, working tree clean — ready for human publish checkpoint.</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 4: HUMAN CHECKPOINT — Publish @xgent-ai/gomad@1.2.0 to npm</name>
  <files>(no file changes — this is a human-verified automation gate)</files>
  <read_first>
    - .planning/phases/09-reference-sweep-verification-release/release-logs/01-quality.log (confirm Task 3 quality gate exit 0)
    - .planning/phases/09-reference-sweep-verification-release/release-logs/02-tarball.log (confirm Task 3 tarball gate exit 0)
    - .planning/phases/09-reference-sweep-verification-release/release-logs/03-gm-surface.log (confirm Task 3 gm-surface gate exit 0)
    - .planning/phases/09-reference-sweep-verification-release/release-logs/04-e2e.log (confirm Task 3 e2e gate exit 0)
    - .planning/phases/09-reference-sweep-verification-release/09-CONTEXT.md §D-74 (publish mechanism — manual `npm publish`)
  </read_first>
  <what-built>
- v1.2.0 CHANGELOG entry (Task 1) and version bump (Task 2) landed on `main`
- Full gate stack (quality + tarball + gm-surface + e2e) exited 0 (Task 3, logs in `.planning/phases/09-reference-sweep-verification-release/release-logs/`)
- Working tree is clean; `main` is at the commit that will be published

What needs human-verified automation:
- `npm whoami` returns the maintainer account (auth still valid)
- `npm publish --access public` is invoked from the clean working tree
- The `latest` dist-tag is applied (npm default)

Automation after this checkpoint (Task 5) depends on successful publish.
  </what-built>
  <action>
This is a human-verified automation gate. The AUTOMATION is the human running the documented command sequence below. Claude PAUSES here and waits for the resume signal before proceeding to Task 5.

Claude's pre-checkpoint responsibility: verify the 4 log files from Task 3 all contain "passed" indicators and do NOT contain error indicators. If any log shows a failure, block the checkpoint and return to Task 3 triage.

Human's checkpoint responsibility: execute the `how-to-verify` steps below in a local shell and type the `resume-signal` when done. Claude MUST NOT attempt `npm publish` autonomously — this is the one step requiring human auth + intent confirmation per D-74.
  </action>
  <how-to-verify>
1. **Pre-publish sanity check** (in the repo root):
   ```bash
   npm whoami
   # Expected: maintainer account name (e.g., the account that holds @xgent-ai scope)

   npm view @xgent-ai/gomad versions
   # Expected: list includes 1.1.0 and 1.1.1; does NOT yet include 1.2.0
   ```

2. **Dry-run publish to inspect the tarball one more time**:
   ```bash
   npm publish --dry-run --access public
   # Expected: tarball file list ends with a "published" simulation; no errors.
   # Spot-check the file list for: tools/installer/, src/, LICENSE, README.md, README_CN.md, CHANGELOG.md, TRADEMARK.md, CONTRIBUTORS.md, CONTRIBUTING.md
   # Expected: NO .planning/, NO test/, NO .github/, NO website/ entries (per tools/verify-tarball.js Phase 1).
   ```

3. **Real publish** (this is the load-bearing step):
   ```bash
   npm publish --access public
   # Expected output: "+ @xgent-ai/gomad@1.2.0" at the end.
   ```

   If 2FA/OTP prompt appears and the configured granular token has Bypass 2FA disabled, re-auth with the correct token per PROJECT.md constraint (granular token w/ Bypass 2FA enabled, post-Dec-2025).

4. **Post-publish verification**:
   ```bash
   npm view @xgent-ai/gomad@1.2.0 version
   # Expected: 1.2.0

   npm view @xgent-ai/gomad dist-tags.latest
   # Expected: 1.2.0
   ```

**Resume criteria:**
- Type `published` to proceed to Task 5 (git tag + smoke test)
- Type `failed: <reason>` to trigger a gap-closure loop (Task 5 is blocked)
- If the registry rejected the publish (e.g., auth error, tarball validation failure), do NOT retry blindly — investigate and either fix the underlying issue or restart from Task 3 (re-run gates)
  </how-to-verify>
  <verify>
    <automated>
      npm view @xgent-ai/gomad@1.2.0 version 2>/dev/null | grep -qx 1.2.0 \
      && npm view @xgent-ai/gomad dist-tags.latest 2>/dev/null | grep -qx 1.2.0
    </automated>
  </verify>
  <acceptance_criteria>
    - Human types `published` as the resume signal
    - `npm view @xgent-ai/gomad@1.2.0 version` returns `1.2.0` (post-checkpoint verification that the publish actually succeeded against the public registry)
    - `npm view @xgent-ai/gomad dist-tags.latest` returns `1.2.0` (latest dist-tag updated per npm default)
    - `npm view @xgent-ai/gomad versions --json` output contains `1.1.0` AND `1.2.0` (both retained per D-76)
    - If human types `failed: <reason>`, Task 5 MUST NOT execute and a triage/gap-closure path is followed instead
  </acceptance_criteria>
  <resume-signal>Type "published" to proceed; "failed: &lt;reason&gt;" to halt and triage.</resume-signal>
  <done>Human approved publish, registry confirms 1.2.0 with latest dist-tag, ready for tag + smoke in Task 5.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 5: Tag v1.2.0 on main, push tag, smoke-test published tarball, update milestone tracking</name>
  <files>
    .planning/ROADMAP.md,
    .planning/STATE.md
  </files>
  <read_first>
    - .planning/phases/09-reference-sweep-verification-release/09-CONTEXT.md §D-75 steps 5-6 (tag push + smoke test)
    - .planning/phases/09-reference-sweep-verification-release/09-CONTEXT.md §D-76 (v1.1.0 posture: no deprecation)
    - .planning/ROADMAP.md (current Phase 9 row + v1.2 milestone header)
    - .planning/STATE.md (current progress + milestone fields — note both YAML frontmatter AND prose body must be updated)
  </read_first>
  <action>
After Task 4 publish is confirmed (resume signal was `published`), execute three sub-steps.

**SUB-STEP A: Tag `v1.2.0` on `main` HEAD and push to origin (REL-06)**

```bash
# Confirm we're on main
git rev-parse --abbrev-ref HEAD
# Expected: main

# Confirm HEAD is at the release commit (the version-bump commit from Task 2)
git log -1 --oneline
# Expected: something like "chore(09): bump version to 1.2.0" — or the combined Phase 9 final commit if Task 2 was amended into a merge

# Create the annotated tag
git tag -a v1.2.0 -m "v1.2.0: agent-as-command + coding-agent PRD refinement"

# Push the tag to origin
git push origin v1.2.0
```

If branch protection on `main` blocks the tag push, re-verify the user_setup entry (GitHub → Settings → Branches → main → tag protection rules) and retry.

**SUB-STEP B: Smoke test — install the published tarball in a scratch dir**

D-75 step 6 mandates: install the published package into a scratch dir, run `gomad install --directory <scratch>`, confirm clean exit. The `--tools claude-code` flag below is a real, supported Commander option on `gomad install` (verified in `tools/installer/gomad-cli.js` + `tools/installer/commands/install.js`:38-40 — `--tools <tools>` accepts `claude-code,cursor,...` or `none`). Passing `--tools claude-code --yes` skips the interactive tool prompt so the smoke test is non-interactive.

```bash
# Create a scratch workspace
SMOKE_DIR=$(mktemp -d -t gomad-v1.2-smoke-XXXXXX)
cd "$SMOKE_DIR"

# Bootstrap a minimal package.json
npm init -y

# Install the just-published package
npm install @xgent-ai/gomad@1.2.0

# Confirm it resolved
node -e "console.log(require('@xgent-ai/gomad/package.json').version)"
# Expected: 1.2.0

# Run gomad install into a sub-dir.
# --tools claude-code is a supported Commander option (verified at
# tools/installer/commands/install.js:38-40 — '--tools <tools>' accepts
# claude-code,cursor,none). If a future 1.2.0 release ever drops this flag,
# fall back to `gomad install --yes --directory target-workspace` per
# D-75 step 6 baseline.
mkdir -p target-workspace
./node_modules/.bin/gomad install --yes --directory target-workspace --tools claude-code
# Expected: exit 0, launcher files generated at target-workspace/.claude/commands/gm/agent-*.md

# Spot-check: enumerate the 7 launcher files
ls target-workspace/.claude/commands/gm/agent-*.md | wc -l
# Expected: 7

# Confirm no legacy skills dir was created
[ ! -d target-workspace/.claude/skills/gm-agent-analyst ] && echo "NO_LEGACY_SKILLS_DIR" || echo "LEGACY_SKILLS_DIR_LEAKED"
# Expected: NO_LEGACY_SKILLS_DIR

# Clean up
cd -
rm -rf "$SMOKE_DIR"
```

If the smoke test fails, the published tarball has a regression. Options:
1. Publish a patch (`1.2.1`) with the fix — per PROJECT.md, do NOT unpublish v1.2.0
2. Open a gap-closure plan for diagnosing + patching
3. Do NOT deprecate v1.1.0 yet (per D-76 posture)

**SUB-STEP C: Update ROADMAP.md + STATE.md milestone tracking (prose AND frontmatter)**

Edit `.planning/ROADMAP.md`:
1. In the "🚧 v1.2 Agent-as-Command & Coding-Agent PRD Refinement" section header (line 26 area), change the `🚧` emoji to `✅` and the "In Progress" label to "SHIPPED YYYY-MM-DD" (today's ISO date).
2. In the Phase 9 bullet `- [ ] **Phase 9: Reference Sweep + Verification + Release**`, change `[ ]` to `[x]`.
3. In the "Phase Details" section under Phase 9, replace `**Plans**: TBD` with `**Plans**: 3 plans` and add the 3 plan bullets with `[x]` checkmarks (matching the pattern used for Phases 5-8):
   ```
   - [x] 09-01-PLAN.md — Prose sweep + installer simplification (REF-01, REF-02, REF-04)
   - [x] 09-02-PLAN.md — Verification gates: orphan-refs + Phase C hard assertion + tarball Phase 3 (REF-01, REF-04, REF-05, REL-03, REL-04)
   - [x] 09-03-PLAN.md — CHANGELOG + version bump + release checkpoint (REL-02, REL-04, REL-05, REL-06)
   ```
4. In the milestone table at the bottom, update the "9. Reference Sweep + Verification + Release" row: `Plans Complete: 3/3, Status: Complete, Completed: YYYY-MM-DD`.

Edit `.planning/STATE.md` — **BOTH the YAML frontmatter AND the prose body must be updated** (per blocker #3: `/gsd-next` and other gsd-tools read the frontmatter keys as authoritative; prose alone will drift).

**Frontmatter edits (lines 1-15, top of file; YAML block between the `---` fences):**

Current frontmatter (pre-edit snapshot for traceability):
```yaml
---
gsd_state_version: 1.0
milestone: v1.2
milestone_name: Agent-as-Command & Coding-Agent PRD Refinement
status: executing
stopped_at: Phase 9 context gathered
last_updated: "2026-04-23T12:22:36.768Z"
last_activity: 2026-04-22
progress:
  total_phases: 5
  completed_phases: 4
  total_plans: 13
  completed_plans: 13
  percent: 100
---
```

Required frontmatter edits (apply these specific field changes):
- `status: executing` → `status: shipped`
- `stopped_at: Phase 9 context gathered` → `stopped_at: Phase 9 shipped — v1.2.0 published`
- `last_updated: "2026-04-23T12:22:36.768Z"` → `last_updated: "<current ISO datetime UTC>"` (regenerate via `date -u +%Y-%m-%dT%H:%M:%S.000Z` or equivalent)
- `last_activity: 2026-04-22` → `last_activity: <today's ISO date>` (e.g. `2026-04-23`)
- `progress.completed_phases: 4` → `progress.completed_phases: 5`
- `progress.total_plans: 13` → `progress.total_plans: 16`
- `progress.completed_plans: 13` → `progress.completed_plans: 16`
- `progress.percent` — recompute from the new totals. With `completed_phases: 5` and `total_phases: 5`, this stays `100` (or the equivalent per the gsd-tools formula). Keep the existing value unless the formula dictates otherwise.
- `milestone`, `milestone_name`, `gsd_state_version`, `progress.total_phases` — UNCHANGED.

Rationale (blocker #3): the YAML frontmatter fields `total_plans`, `completed_plans`, `completed_phases` are authoritative for `/gsd-next` and gsd-tools. Updating only the prose body produces frontmatter↔prose drift; `/gsd-next` will read stale plan counts and mis-route. Both layers MUST be updated together.

**Prose body edits (under `## Current Position`, roughly lines 26-31):**
- `Phase: 9` (unchanged)
- `Plan: Not started` → `Plan: 3/3 Complete`
- `Status: Executing Phase 08` → `Status: v1.2 shipped <YYYY-MM-DD>`
- `Last activity: 2026-04-22` → `Last activity: <today's ISO date>`
- `Progress: [░░░░░░░░░░] 0% (0/5 v1.2 phases complete)` → `Progress: [██████████] 100% (5/5 v1.2 phases complete)`

**Session Continuity block (bottom of file):**
- `Last session: 2026-04-23T12:22:36.764Z` → `Last session: <current ISO datetime>`
- `Stopped at: Phase 9 context gathered` → `Stopped at: Phase 9 shipped — v1.2.0 published`
- `Resume: run /gsd-plan-phase 5 …` → `Resume: v1.2 milestone complete. Next: run /gsd-milestone-retrospective to close milestone; then /gsd-new-milestone to plan v1.3.`

Per D-76, do NOT run `npm deprecate @xgent-ai/gomad@1.1.0` — v1.1.0 stays as prior-stable.
  </action>
  <verify>
    <automated>
      git tag -l v1.2.0 | grep -qx v1.2.0 \
      && git ls-remote --tags origin v1.2.0 | grep -q refs/tags/v1.2.0 \
      && npm view @xgent-ai/gomad@1.2.0 version 2>/dev/null | grep -qx 1.2.0 \
      && npm view @xgent-ai/gomad dist-tags.latest 2>/dev/null | grep -qx 1.2.0 \
      && grep -qE '✅ \*\*v1\.2' .planning/ROADMAP.md \
      && grep -qE '\[x\] \*\*Phase 9' .planning/ROADMAP.md \
      && grep -qE '^status: shipped$' .planning/STATE.md \
      && grep -qE '^  total_plans: 16$' .planning/STATE.md \
      && grep -qE '^  completed_plans: 16$' .planning/STATE.md \
      && grep -qE '^  completed_phases: 5$' .planning/STATE.md
    </automated>
  </verify>
  <acceptance_criteria>
    - `git tag -l v1.2.0` returns `v1.2.0` locally
    - `git ls-remote --tags origin v1.2.0` shows the tag pushed to origin (REL-06 satisfied)
    - `npm view @xgent-ai/gomad@1.2.0 version` returns `1.2.0` (publish visible from public registry)
    - `npm view @xgent-ai/gomad dist-tags.latest` returns `1.2.0` (REL-05 satisfied: `latest` points at 1.2.0)
    - `npm view @xgent-ai/gomad versions --json | jq 'contains(["1.1.0"])'` returns `true` (v1.1.0 retained per D-76)
    - `npm view @xgent-ai/gomad@1.1.0 deprecated` returns empty string or falsy (v1.1.0 NOT deprecated per D-76)
    - Smoke test output from SUB-STEP B contains `NO_LEGACY_SKILLS_DIR` and shows exactly 7 launcher files (install flow from public tarball works end-to-end)
    - `grep -E '✅ \*\*v1\.2' .planning/ROADMAP.md` succeeds (milestone header marked complete with ISO date)
    - `grep -E '\[x\] \*\*Phase 9' .planning/ROADMAP.md` succeeds (Phase 9 row checked off)
    - `grep -E '^status: shipped$' .planning/STATE.md` succeeds (STATE frontmatter reflects milestone shipped)
    - `grep -qE '^  total_plans: 16$' .planning/STATE.md` succeeds (blocker #3: frontmatter total_plans updated from 13 → 16)
    - `grep -qE '^  completed_plans: 16$' .planning/STATE.md` succeeds (blocker #3: frontmatter completed_plans updated from 13 → 16)
    - `grep -qE '^  completed_phases: 5$' .planning/STATE.md` succeeds (blocker #3: frontmatter completed_phases updated from 4 → 5)
    - `grep -qE '^last_updated: "20[0-9]{2}-[0-9]{2}-[0-9]{2}T' .planning/STATE.md` succeeds (frontmatter timestamp regenerated)
  </acceptance_criteria>
  <done>v1.2.0 tag pushed to origin; public tarball smoke-installs clean; ROADMAP + STATE updated at BOTH prose and YAML frontmatter layers (per blocker #3: `total_plans: 16`, `completed_plans: 16`, `completed_phases: 5`, `status: shipped`, `last_updated`/`last_activity` regenerated); v1.1.0 retained on npm per D-76.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| local git ↔ GitHub origin | Tag push to `main` crosses this boundary; branch protection governs accept/reject |
| npm CLI ↔ npm registry | `npm publish` uses the configured granular access token; token enables package-scope writes under `@xgent-ai/` |
| published tarball → downstream users | Once published, the 1.2.0 tarball is the canonical source consumed by installers — unrecoverable once pulled by users |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-09-10 | Spoofing | npm publish auth | mitigate | Granular access token scoped to `@xgent-ai/gomad` (PROJECT.md constraint). Bypass 2FA enabled only for this token. No classic automation tokens (revoked Dec 2025). Human verifies `npm whoami` in Task 4 step 1 before publish. **Cross-link to T-09-05 / T-09-06 (Plan 02 allowlist tampering):** token exfiltration is NOT independent of allowlist tampering — a compromised allowlist can hide a `gm-agent-` regression AND a compromised publish token can ship the tampered tarball to `latest`. The compounded risk is: one tampered allowlist commit + one exfiltrated token = a silently-poisoned `@xgent-ai/gomad@1.2.x` release. Convention: any PR that adds >3 entries to either `test/fixtures/orphan-refs/allowlist.json` or `tools/fixtures/tarball-grep-allowlist.json` requires a second reviewer before merge; publish tokens are rotated on any suspected review-process bypass. |
| T-09-11 | Tampering | Tarball content between pack and publish | mitigate | Task 3 runs `npm run test:tarball` against the same `npm pack` machinery that `npm publish` uses. Task 4 step 2 dry-runs the publish to inspect the final tarball file list. Clean working tree (Task 3 verifier) guarantees no stray files. |
| T-09-12 | Repudiation | Publish event audit | mitigate | `git tag v1.2.0` provides immutable anchor pointing at the published commit. CHANGELOG entry documents what shipped. `npm view @xgent-ai/gomad time.1.2.0` records the publish timestamp server-side. |
| T-09-13 | Tampering | Force-push or tag-delete on `main` | mitigate | Branch protection on `main` per user_setup prevents force push. Tags are immutable once pushed (would require admin override to delete). PROJECT.md git-safety rules (main-only workflow) reinforce this. |
| T-09-14 | Denial of Service | Registry 5xx during publish | accept | npm publish is retry-safe up to a point; if registry is down, Task 4 checkpoint halts. Retry is a manual action with no automated fallback. |
| T-09-15 | Information Disclosure | Secret in tarball | mitigate | `tools/verify-tarball.js` Phase 1 explicitly forbids `.planning/`, `.github/`, `test/`, `website/`. No env files shipped (`files` in package.json enumerates whitelist). Phase 2 grep-clean catches bmad/bmm leftovers; Phase 3 (Plan 02) catches gm-agent- leftovers. |
| T-09-16 | Privilege Escalation | `gomad install` from tarball writes outside target | mitigate | Phase 7's realpath containment (INSTALL-06) + allowed-install-roots check prevents writes outside `.claude/` and `_gomad/`. Smoke test (Task 5 SUB-STEP B) runs under `mktemp -d` sandbox — any escape is locally observable. |
</threat_model>

<verification>
After all 5 tasks complete, ALL of these must be true:

1. **REL-02:** `## [1.2.0]` section exists in CHANGELOG.md with a `### BREAKING CHANGES` subsection containing `/gm:agent-*` guidance AND the before-form `gm-agent-` / `pre-v1.2 dash-form` migration sentence (warning #7 invariant).

2. **REL-04:** The 4-gate stack (quality, tarball, gm-surface, e2e) exited 0 before publish; logs preserved at `.planning/phases/09-reference-sweep-verification-release/release-logs/`.

3. **REL-05:** `npm view @xgent-ai/gomad@1.2.0 version` returns `1.2.0`; `npm view @xgent-ai/gomad dist-tags.latest` returns `1.2.0`; v1.1.0 still listed in `npm view @xgent-ai/gomad versions`.

4. **REL-06:** `git ls-remote --tags origin v1.2.0` shows the tag on origin; local `git tag -l v1.2.0` confirms.

5. **Post-publish smoke:** install of `@xgent-ai/gomad@1.2.0` into `mktemp -d` sandbox followed by `gomad install --yes --directory target-workspace --tools claude-code` (`--tools` is a real, verified Commander option per `tools/installer/commands/install.js`:38-40) produces all 7 launcher files and zero legacy skill dirs.

6. **D-76 posture:** `npm view @xgent-ai/gomad@1.1.0 deprecated` returns empty/falsy (no deprecation issued).

7. **Milestone tracking (frontmatter + prose — blocker #3):**
   - `.planning/ROADMAP.md` Phase 9 row marked complete
   - `.planning/STATE.md` YAML frontmatter has `status: shipped`, `total_plans: 16`, `completed_plans: 16`, `completed_phases: 5`, regenerated `last_updated` / `last_activity`
   - `.planning/STATE.md` prose body reflects v1.2 shipped
</verification>

<success_criteria>
- CHANGELOG v1.2.0 entry landed with correct structure, BREAKING block retaining both before-form and after-form tokens (warning #7) (Task 1)
- Version bumped 1.1.1 → 1.2.0 (Task 2)
- 4-gate stack exits 0 with logs preserved (Task 3)
- Human-verified `npm publish` succeeded (Task 4)
- `v1.2.0` tag on origin (REL-06) + public tarball smoke-installs clean via verified `--tools claude-code` flag + ROADMAP/STATE updated at BOTH frontmatter and prose layers (blocker #3) (Task 5)
- v1.1.0 retained as prior-stable (D-76)
- All 4 REL requirements satisfied: REL-02, REL-04, REL-05, REL-06
</success_criteria>

<output>
After completion, create `.planning/phases/09-reference-sweep-verification-release/09-03-SUMMARY.md` capturing:
- Final CHANGELOG v1.2.0 entry (copy into SUMMARY for archival)
- Gate-stack log locations + pass/fail status
- `npm view @xgent-ai/gomad@1.2.0` output (publish confirmation)
- `git ls-remote --tags origin v1.2.0` output (tag push confirmation)
- Smoke test output showing 7 launchers + NO_LEGACY_SKILLS_DIR
- Before/after snapshot of STATE.md YAML frontmatter (blocker #3 traceability: total_plans 13→16, completed_plans 13→16, completed_phases 4→5)
- Link to `.planning/RETROSPECTIVE.md` update (milestone close — orchestrator will trigger)
</output>
