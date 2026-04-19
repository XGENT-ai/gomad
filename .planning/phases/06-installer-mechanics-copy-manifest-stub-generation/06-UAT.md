---
status: complete
phase: 06-installer-mechanics-copy-manifest-stub-generation
source: [06-01-SUMMARY.md, 06-02-SUMMARY.md, 06-03-SUMMARY.md]
started: 2026-04-18T14:54:29Z
updated: 2026-04-19T00:40:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Cold Start Smoke Test
expected: Fresh `gomad install --yes --directory <tmpDir> --tools claude-code` in an empty directory boots cleanly, copies all skills, writes manifest, exits 0 with no errors.
result: issue
reported: "正常如果不带 --directory ，应该是会出来让用户选择安装目录的，不是吗？现在我直接运行install，不带--yes，它会以为我要安装到当前目录 (self-install guard fired in source repo)"
severity: major

### 2. Copy-only install (no symlinks)
expected: After a fresh install, `ls -la <tmpDir>/.claude/skills/**/*.md` shows real files (-rw-), NOT symlinks (lrwx). `find <tmpDir>/.claude/skills -type l` returns empty.
result: pass
resolved_by: "fix commit 6554f91 — self-install guard now checks resolved target, not cwd"

### 3. v1.1 symlink upgrade
expected: Install into a directory that already has pre-existing symlinks at `.claude/skills/gm-agent-*/` AND a v1 `_gomad/_config/files-manifest.csv`. Installer emits info log `upgrading from symlink: <path>` for each symlink destination, unlinks them, and replaces them with real files. No crash. Final targets are real files.
result: pass

### 4. Manifest v2 header
expected: `head -1 <tmpDir>/_gomad/_config/files-manifest.csv` outputs exactly `type,name,module,path,hash,schema_version,install_root` (7 columns, no BOM).
result: pass

### 5. Manifest v2 install_root column
expected: In `_gomad/_config/files-manifest.csv` after install: launcher rows (`.claude/commands/gm/agent-*.md`) have `install_root=.claude`; persona rows (`_gomad/gomad/agents/*.md`) and other `_gomad/*` rows have `install_root=_gomad`. Every row carries `schema_version=2.0`.
result: pass

### 6. Seven persona files extracted
expected: After install, all 7 files exist with SKILL.md body + full skill-manifest.yaml as frontmatter: `_gomad/gomad/agents/{analyst,tech-writer,pm,ux-designer,architect,sm,dev}.md`. Each file's frontmatter contains `displayName`, `title`, `icon`, `capabilities`, etc.
result: pass

### 7. Seven launcher files generated
expected: After install, all 7 launcher files exist: `.claude/commands/gm/agent-{analyst,tech-writer,pm,ux-designer,architect,sm,dev}.md`. Each has frontmatter `name: gm:agent-<shortName>` + description in `<Title> (<displayName>). <purpose>` form, plus a fenced ```yaml metadata block in the body and an activation directive referencing `_gomad/gomad/agents/<shortName>.md`.
result: pass

### 8. Legacy skill dirs removed
expected: After install, `ls <tmpDir>/.claude/skills/ 2>/dev/null` shows NO `gm-agent-*` subdirectories. The legacy v1.1 artifact set is gone; only the new launcher set at `.claude/commands/gm/` remains.
result: pass

### 9. Slash command /gm:agent-dev resolves
expected: In Claude Code running against the installed workspace, typing `/gm:agent-dev` resolves to the dev launcher, which activates the dev persona from `_gomad/gomad/agents/dev.md`. (Repeat spot-check for at least one other agent, e.g. `/gm:agent-pm`.)
result: pass

### 10. Idempotent re-install
expected: Running `gomad install --yes --directory <same-tmpDir> --tools claude-code` a SECOND time succeeds with zero file-count delta and no duplicate rows in `files-manifest.csv`. No `upgrading from symlink:` logs on the second pass (nothing to upgrade).
result: issue
reported: "以下3个文件，还保留了旧的 gm-agent-* 引用: ./_gomad/_config/agent-manifest.csv ./_gomad/_config/gomad-help.csv ./_gomad/_config/skill-manifest.csv"
severity: major
note: "User-visible name columns in agent/skill/help manifests still use `gm-agent-*` (dash) instead of migrated `gm:agent-*` (colon). Filesystem path columns correctly keep dash form per D-05. Strict idempotency claim of Test 10 (no file-count delta, no duplicate rows) is orthogonal to this finding and was not tested because the name-format finding was surfaced first."

## Summary

total: 10
passed: 8
issues: 2
pending: 0
skipped: 0
blocked: 0

## Gaps

- truth: "Running `gomad install` without --directory prompts the user interactively for target directory (never silently defaults to cwd)"
  status: failed
  reason: "User reported: 正常如果不带 --directory ，应该是会出来让用户选择安装目录的，不是吗？现在我直接运行install，不带--yes，它会以为我要安装到当前目录"
  severity: major
  test: 1
  root_cause: "D-11 / Pitfall #7 guard intentionally fires BEFORE any prompt when the effective target is the source repo; the user was running from inside the source repo so cwd defaulted as target and the guard blocked. The guard contract is enforced by test/test-installer-self-install-guard.js (6 assertions). This is by-design safety behavior."
  artifacts:
    - path: "tools/installer/commands/install.js:10-28"
      issue: "Guard blocks interactive prompt when cwd is source repo — intentional per D-11 but surprising UX"
  missing:
    - "OPTIONAL UX enhancement (non-blocking for Phase 06): when cwd is source repo AND --directory is missing, suggest `gomad install --directory <target>` in the error message or fall through to prompt with a warning"
  debug_session: ""
  deferred: true
  deferred_reason: "Safety contract enforced by existing test suite; user can work around with --directory flag. Not a Phase 06 regression."

- truth: "Self-install guard checks the TARGET directory (options.directory || cwd), not cwd alone — allowing `gomad install --directory <other-path>` from inside the gomad source repo"
  status: resolved
  reason: "User reported: 我加了 --directory /Users/rockie/Documents/GitHub/xgent/xgent-ai-scheduler-service ，也出来这个提示，block了uat"
  severity: blocker
  test: 2
  root_cause: "tools/installer/commands/install.js:37-50 — guard checked process.cwd() unconditionally for src/gomad-skills/ marker; never consulted options.directory. `gomad install --directory <elsewhere>` run from inside the gomad repo was incorrectly blocked."
  artifacts:
    - path: "tools/installer/commands/install.js"
      issue: "Self-install guard ignored --directory when determining target"
  resolution:
    commit: "6554f91"
    summary: "Extracted failIfGomadSourceTarget(targetDir) helper. Guard now resolves effective target = options.directory || process.cwd() and checks that path. Preserves D-11 test contract (bare install in source repo still fires); 6/6 guard tests + 205 install tests + gm-surface smoke all green."

- truth: "Config manifests (agent-manifest.csv, skill-manifest.csv, gomad-help.csv) emit user-visible agent identifiers in the migrated `gm:agent-*` (colon) form, not the legacy `gm-agent-*` (dash) source-tree form"
  status: failed
  reason: "User reported: 以下3个文件，还保留了旧的 gm-agent-* 引用: ./_gomad/_config/agent-manifest.csv ./_gomad/_config/gomad-help.csv ./_gomad/_config/skill-manifest.csv"
  severity: major
  test: 10
  root_cause: |
    Source-tree skill-manifest.yaml files under src/gomad-skills/<module>/gm-agent-<shortName>/
    declare `name: gm-agent-<shortName>`. The manifest writers (writeAgentManifest in
    manifest-generator.js, writeSkillManifest, and the help-catalog aggregator
    mergeModuleHelpCatalogs in installer.js) copy this `name` through to the emitted
    `_gomad/_config/*.csv` files verbatim. Phase 06 did NOT touch these writers — Plan
    06-02 only upgraded files-manifest.csv (separate file) to v2 schema, and Plan 06-03
    only generated persona + launcher artifacts. The project decision (STATE.md Key
    Decisions) states: "Filesystem dirs keep gm-agent-* (dash); only user-visible
    references migrate to gm:agent-*". The `name` column in these 3 CSVs IS user-visible
    (rendered by the gomad-help surface and used as an agent identifier in tooling),
    so it should be migrated, but the migration plan never covered these writers.
  artifacts:
    - path: "tools/installer/core/manifest-generator.js"
      issue: "writeAgentManifest emits `name` column from source-tree skill-manifest.yaml verbatim — dash form leaks into user-visible output"
    - path: "tools/installer/core/installer.js"
      issue: "mergeModuleHelpCatalogs propagates dash-form agent names into gomad-help.csv user-facing rows"
    - path: "src/gomad-skills/*/gm-agent-*/skill-manifest.yaml"
      issue: "Source `name:` field values (e.g. `gm-agent-analyst`) are the canonical source of the dash form that leaks downstream"
  missing:
    - "Decide migration strategy: (a) transform dash→colon at manifest-write time, (b) update source skill-manifest.yaml `name:` fields and separate source-tree path from user-visible name, or (c) add a new `displayId` column and keep `name` as source-tree ID"
    - "Apply chosen transform in writeAgentManifest (manifest-generator.js), writeSkillManifest, and mergeModuleHelpCatalogs (installer.js) so the 3 CSVs emit gm:agent-* for user-visible columns"
    - "Audit any downstream consumers of these CSVs that may rely on the current dash form (gomad-help skill rendering, agent-command-generator lookups)"
  debug_session: ""
  deferred: true
  deferred_reason: "Not a Phase 06 regression — pre-existing gap in cross-milestone agent-name migration plan. Requires scope decision (which column is source-tree ID vs user-visible name) and touches 3 writers + potentially source YAML. Defer to decimal phase 06.1 (or fold into Phase 07 installer-cleanup scope)."
