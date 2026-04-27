---
phase: 12-agent-dir-relocation-release
plan: 07
subsystem: docs
tags: [docs, upgrade-recovery, zh-cn, validate-doc-paths, agent-11, docs-07]
requires:
  - "Plan 04 validate-doc-paths.js linter with allowlist for upgrade-recovery.md + zh-cn/upgrade-recovery.md"
  - "Phase 11 docs branch (gsd/phase-11-docs-site-content-authoring) merged into main before Phase 12"
  - "docs/zh-cn/upgrade-recovery.md skeleton from Phase 11 plan 11-09"
provides:
  - "v1.2 → v1.3 recovery section in docs/upgrade-recovery.md (rollback + forward-recovery + .customize.yaml semantics)"
  - "Simplified Chinese parity translation in docs/zh-cn/upgrade-recovery.md"
  - "Heading anchor for CHANGELOG cross-link consumption (Plan 08)"
affects:
  - "Plan 08: CHANGELOG v1.3.0 BREAKING entry will cross-link the new section by anchor"
tech_stack:
  added: []
  patterns:
    - "Allowlist-driven negative-only doc lint (Plan 04 + this plan)"
    - "Bilingual docs parity (EN authored, zh-cn translated, code blocks/paths untranslated)"
key_files:
  created: []
  modified:
    - docs/upgrade-recovery.md
    - docs/zh-cn/upgrade-recovery.md
decisions:
  - "Heading text is `## v1.2 → v1.3 recovery` (literal Unicode arrow → preserved); slugifies to `v12-v13-recovery` (NOT `v12--v13-recovery` as the plan asserted — see Note for Plan 08 below)"
  - "Code blocks (cp -R, gomad install, npm install -g @xgent-ai/gomad@1.2.0) NOT translated in zh-cn"
  - "Path literals (`_gomad/...`, `<YYYYMMDD-HHMMSS>`, `<shortName>.md`), file names (`.customize.yaml`, `files-manifest.csv`), and function names (`writeAgentLaunchers`) NOT translated"
  - "Pre-existing v1.2-era backup-tree examples (line 19 referencing `gomad/agents/pm.md` in both files) preserved byte-for-byte; allowlist already exempts both files"
metrics:
  duration: "~3 min"
  completed: "2026-04-27T03:20:40Z"
  tasks_completed: "2/2 (checkpoint pre-resolved by orchestrator)"
  files_modified: 2
  commits: 2
---

# Phase 12 Plan 07: Author v1.2→v1.3 Recovery Docs Summary

**One-liner:** Appended v1.2→v1.3 migration recovery section to `docs/upgrade-recovery.md` (English source) and mirrored it in `docs/zh-cn/upgrade-recovery.md` (Simplified Chinese parity, code/paths untranslated); validate:doc-paths still exits 0 on the combined Phase 11 + Phase 12 tree.

## What Got Done

### Checkpoint: Confirm Phase 11 docs branch merge state — RESOLVED (pre-approved)

Orchestrator pre-resolved the checkpoint with resume-signal `approved — phase-11-merged-and-lint-green` before spawning this executor. Worktree sanity re-check confirmed:

- Worktree base = `5358721` (Phase 12 plan 12-06 merge head — branching_strategy=none, so this is also the Phase-12-line-of-development tip on `main`)
- Phase 11 commits visible in current branch history: `f702d8b docs(phase-11): evolve PROJECT.md`, `1d6bf1d docs(phase-11): complete phase execution`, plus all 11-XX commits back to plan 11-01
- Phase 11 docs files all exist:
  - `docs/reference/agents.md`, `docs/reference/skills.md`
  - `docs/tutorials/install.md`, `docs/tutorials/quick-start.md`
  - `docs/explanation/architecture.md`, `docs/how-to/contributing.md`
  - `docs/zh-cn/reference/agents.md`, `docs/zh-cn/tutorials/install.md`
- `npm run validate:doc-paths` exits 0 on the combined tree (`OK: scanned 18 files; no legacy gomad/agents/ paths in shipped docs`)

No checkpoint commit produced (the pre-resolution path skips re-running the gate inside the worktree).

### Task 1: Add "v1.2 → v1.3 recovery" section to docs/upgrade-recovery.md

**Commit:** `6bcec23 docs(12-07): add v1.2 → v1.3 recovery section to upgrade-recovery.md`

Appended a new top-level section AFTER the existing "When backups are NOT produced" section (the file's last existing heading). The new section contains:

- **Lead paragraph (2 paragraphs):** explains the v1.2→v1.3 relocation (`_gomad/gomad/agents/<shortName>.md` → `_gomad/_config/agents/<shortName>.md`), the snapshot location (`_gomad/_backups/<YYYYMMDD-HHMMSS>/_gomad/gomad/agents/`), and the v1.3 cleanup-planner detection signal (manifest CSV present + at least one persona file at the legacy path).
- **`### Rollback to v1.2 layout`:** 3-step recipe — `npm install -g @xgent-ai/gomad@1.2.0`, `cp -R` from the snapshot, `gomad install` against the v1.2 binary.
- **`### Forward recovery`:** single-step `gomad install` re-run when launcher stubs are stale but persona bodies are at the new location (relies on `writeAgentLaunchers` overwriting unconditionally).
- **`### What the .customize.yaml semantics look like`:** documents that `_gomad/_config/agents/.customize.yaml` is preserved across the upgrade because the custom-file detector recognizes the 8 generated persona `.md` files as installer-managed (per Plan 02 D-03 whitelist).

**Acceptance criteria evidence:**

| Criterion | Result |
|-----------|--------|
| `## v1.2 → v1.3 recovery` heading present | 1 occurrence |
| `### Rollback to v1.2 layout` sub-heading | 1 occurrence |
| `### Forward recovery` sub-heading | 1 occurrence |
| `_gomad/_backups/<YYYYMMDD-HHMMSS>/_gomad/gomad/agents/` literal | 2 occurrences (lead paragraph + rollback step 2 code block) |
| `npm install -g @xgent-ai/gomad@1.2.0` | 1 occurrence (untranslated bash) |
| `writeAgentLaunchers` | 1 occurrence (untranslated function name) |
| `.customize.yaml` | 3 occurrences (sub-heading + 2 body refs) |
| Pre-existing line 19 (`gomad/agents/pm.md` in backup-tree example) byte-for-byte unchanged | 0 deletions of that line |
| `npm run validate:doc-paths` | exit 0 (`OK: scanned 18 files`) |
| `npm run lint:md -- docs/upgrade-recovery.md` | exit 0 (`Summary: 0 error(s)`) |
| `npm run docs:build` | succeeded (no errors/warnings) |

LOC delta: +57 lines (entire new section appended; no existing content modified).

### Task 2: Translate to docs/zh-cn/upgrade-recovery.md

**Commit:** `dcaca59 docs(12-07): translate v1.2 → v1.3 recovery section to zh-cn`

Mirrored the EN section in Simplified Chinese, appending after the existing `## 何时不会产生备份` section (the file's last existing heading). Translation choices:

- **Translated (prose):** intro paragraphs, sub-headings (`### 回滚到 v1.2 布局`, `### 前向恢复`, `### .customize.yaml 的保留语义`), step descriptions, table-style explanations.
- **NOT translated:** all code blocks (`bash` fences containing `npm install -g @xgent-ai/gomad@1.2.0`, `cp -R _gomad/_backups/...`, `gomad install`); all path literals (`_gomad/_config/agents/`, `_gomad/gomad/agents/<shortName>.md`, `<YYYYMMDD-HHMMSS>`); file/dir names (`.customize.yaml`, `files-manifest.csv`); function name (`writeAgentLaunchers`); identifier `/gm:agent-*`; version strings (`v1.2`, `v1.3`, `v1.2.0`, `v1.3.0`).

**Acceptance criteria evidence:**

| Criterion | Result |
|-----------|--------|
| `## v1.2 → v1.3 升级恢复` heading | 1 occurrence |
| `### 回滚到 v1.2 布局` sub-heading | 1 occurrence |
| `### 前向恢复` sub-heading | 1 occurrence |
| `.customize.yaml` (filename in heading + body) | 3 occurrences (≥ 2 required) |
| `npm install -g @xgent-ai/gomad@1.2.0` (untranslated bash) | 1 occurrence |
| `writeAgentLaunchers` (untranslated function name) | 1 occurrence |
| `_gomad/_backups/<YYYYMMDD-HHMMSS>/_gomad/gomad/agents/` (untranslated path literal) | 2 occurrences |
| Pre-existing v1.2-era backup-tree example (line 19 in zh-cn file referencing `gomad/agents/pm.md`) byte-for-byte unchanged | 0 deletions of that line |
| `npm run validate:doc-paths` | exit 0 (`OK: scanned 18 files`) |
| `npm run lint:md -- docs/zh-cn/upgrade-recovery.md` | exit 0 (`Summary: 0 error(s)`) |
| `npm run docs:build` | succeeded (no errors/warnings) |

LOC delta: +55 lines (entire new section appended; no existing content modified).

## Phase 11 Merge Coordination Evidence

**Combined-tree validate-doc-paths result:** `OK: scanned 18 files; no legacy gomad/agents/ paths in shipped docs`

The 18 files scanned include the 8 Phase-11-authored docs (4 EN + 2 zh-cn newly visible above the canonical content set, plus the upgrade-recovery pages and pre-existing index/CHANGELOG-link files). Since Phase 11 commits are present in this worktree's branch history (root cause: Phase 11 was merged to main before Phase 12 began, and Phase 12 plans build atop main), Pitfall 8 from RESEARCH (Phase-11-must-merge-before-release) is satisfied. No manual `git merge origin/main` was required during this plan.

## Decisions Made

1. **Heading text exactly per plan:** `## v1.2 → v1.3 recovery` (English) and `## v1.2 → v1.3 升级恢复` (zh-cn). The literal Unicode arrow → is preserved in both.

2. **Slug discrepancy with plan (see Plan 08 note below):** The plan frontmatter and PATTERNS doc both assert the EN heading slugifies to `v12--v13-recovery` (double hyphen). Empirical run of `headingToAnchor` from `tools/validate-doc-links.js:74-82` against `'v1.2 → v1.3 recovery'` yields `v12-v13-recovery` (SINGLE hyphen). Trace: lowercase → remove emojis (no-op) → `[^\w\s-]/g` strips `.` and `→` leaving `v12  v13 recovery` (two spaces between v12/v13 because the arrow had spaces on both sides, but spaces themselves remain) → `\s+` collapses any whitespace run to a single `-` → `v12-v13-recovery` → `-+/g` is idempotent. The double-hyphen the plan expected would only arise if the slugifier converted each whitespace char individually then collapsed; it doesn't. Plan 08 must use `#v12-v13-recovery` for the CHANGELOG cross-link.

3. **No translator's note added** to zh-cn (per plan instruction: "DO NOT add a translator's note or any non-content frontmatter field").

4. **Append-only edits:** Every existing heading and body line in both files is preserved verbatim. Only the new section was added at the end of each file.

## Deviations from Plan

### Documented discrepancies (informational, not auto-fix)

**1. [Note for Plan 08] Slug is `v12-v13-recovery`, NOT `v12--v13-recovery`**

- **Found during:** Final verification (`node -e` empirical slugify run before SUMMARY authorship)
- **Plan claim:** `## v1.2 → v1.3 recovery` slugifies to `v12--v13-recovery` (double hyphen between v12 and v13)
- **Empirical reality:** slugifies to `v12-v13-recovery` (single hyphen)
- **Why the plan was wrong:** The plan's reasoning assumed each whitespace character expands to one hyphen and only later collapses. In fact, `replaceAll(/\s+/g, '-')` is greedy: any contiguous whitespace run (regardless of how many chars) maps to ONE hyphen, before the `-+/g` collapse step ever runs.
- **Action taken:** None on this plan's content (heading text is correct as authored). Documented here so Plan 08 (CHANGELOG v1.3.0 BREAKING entry) uses `docs/upgrade-recovery.md#v12-v13-recovery` (single hyphen) for its cross-link, NOT `#v12--v13-recovery`.
- **Files modified:** none (informational note only)
- **Commits:** n/a

### Auto-fixed Issues

None. The plan content was authored exactly as specified; no Rule 1/2/3 fixes were necessary.

### Authentication gates

None — entirely an offline docs authoring task.

## Verification Run

Final commands executed (all green):

```
$ npm run validate:doc-paths
OK: scanned 18 files; no legacy gomad/agents/ paths in shipped docs

$ npm run lint:md -- docs/upgrade-recovery.md
Summary: 0 error(s)

$ npm run lint:md -- docs/zh-cn/upgrade-recovery.md
Summary: 0 error(s)

$ npm run docs:build
(succeeded — no errors/warnings; output tree includes 404.html, llms-full.txt, sitemap-0.xml, etc.)
```

## Note for Plan 08 (CHANGELOG v1.3.0)

The CHANGELOG cross-link to this recovery section MUST use the slug `v12-v13-recovery` (single hyphen), produced by the project slugifier. Concrete link form:

```markdown
See [docs/upgrade-recovery.md#v12-v13-recovery](docs/upgrade-recovery.md#v12-v13-recovery) for rollback steps.
```

Verification one-liner Plan 08 can run to confirm the slug at its execution time:

```bash
node -e "
function s(h){return h.toLowerCase().replaceAll(/[\u{1F300}-\u{1F9FF}]/gu,'').replaceAll(/[^\w\s-]/g,'').replaceAll(/\s+/g,'-').replaceAll(/-+/g,'-').replaceAll(/^-+|-+$/g,'');}
console.log(s('v1.2 → v1.3 recovery'));"
# → v12-v13-recovery
```

The zh-cn heading `v1.2 → v1.3 升级恢复` slugifies to `v12-v13` (Chinese characters get stripped by `[^\w\s-]` since `\w` is ASCII-only in this regex). zh-cn CHANGELOG entries (if Plan 08 produces them) should cross-link to the EN file specifically — `docs/upgrade-recovery.md#v12-v13-recovery` — to avoid the truncated zh slug.

## Threat Flags

None. This plan only adds documentation prose; no new endpoints, auth surfaces, or schema changes were introduced. Existing threats T-12-07-01 through T-12-07-04 from the plan's threat-register are mitigated as designed (placeholder `<YYYYMMDD-HHMMSS>` makes substitution requirement obvious; structure mirrors EN for translation parity; lint+build pass).

## Self-Check: PASSED

- File `docs/upgrade-recovery.md` exists: FOUND
- File `docs/zh-cn/upgrade-recovery.md` exists: FOUND
- Commit `6bcec23` (Task 1): FOUND in `git log --oneline`
- Commit `dcaca59` (Task 2): FOUND in `git log --oneline`
- `npm run validate:doc-paths` final run: exit 0
- All acceptance-criteria grep counts match plan thresholds (verified per task above)
