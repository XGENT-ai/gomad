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
result: pass
resolved_by: "fix commit 2bcb594 — migrated user-visible agent refs in agent-manifest.csv, skill-manifest.csv, gomad-help.csv to gm:agent-* form. Verified: 0 gm-agent-* refs in user-visible columns; 7/7 + 7/7 + 5/5 migrated; path columns correctly keep dash form; two sequential installs produce bit-identical manifests (idempotency confirmed)."

## Summary

total: 10
passed: 9
issues: 1
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
  status: resolved
  reason: "User reported: 以下3个文件，还保留了旧的 gm-agent-* 引用: ./_gomad/_config/agent-manifest.csv ./_gomad/_config/gomad-help.csv ./_gomad/_config/skill-manifest.csv"
  severity: major
  test: 10
  root_cause: |
    Source-tree skill-manifest.yaml files under src/gomad-skills/<module>/gm-agent-<shortName>/
    declare `name: gm-agent-<shortName>`. The manifest writers copied this `name` through
    to `_gomad/_config/*.csv` verbatim. User chose Option C (treat as Phase 06 blocker),
    so the migration was completed inline via Strategy (a) — transform at write time —
    rather than deferred.
  artifacts:
    - path: "tools/installer/core/manifest-generator.js"
      issue: "writeAgentManifest + writeSkillManifest emitted `name`/`canonicalId` columns verbatim from source"
    - path: "tools/installer/core/installer.js"
      issue: "mergeModuleHelpCatalogs propagated dash-form names into gomad-help.csv `agent-name` + `phase` columns"
  resolution:
    commit: "2bcb594"
    strategy: "Transform-at-write-time (Strategy A): source-tree skill-manifest.yaml files retain `name: gm-agent-*` as canonical internal ID; writers apply `toUserVisibleAgentId` helper at emit time for user-visible columns only. Path columns correctly keep dash form per D-05."
    summary: |
      Added toUserVisibleAgentId() / fromUserVisibleAgentId() helpers scoped to `gm-agent-` prefix.
      Applied in writeSkillManifest (canonicalId + name), writeAgentManifest (name + canonicalId,
      with dash-normalized dedup key), and mergeModuleHelpCatalogs (dash-keyed agentInfo dict,
      colon-emitted agent-name + phase + agent-command).

      Verification:
      - 0 gm-agent-* refs in user-visible columns across all 3 manifests
      - 7/7 + 7/7 + 5/5 refs migrated to gm:agent-* form
      - Path columns (7 + 7) correctly preserve dash form (Windows-safe on-disk names)
      - Two sequential installs produce bit-identical manifests (idempotent)
      - 212 tests pass (7 refs + 205 install) + lint + markdown + prettier green
