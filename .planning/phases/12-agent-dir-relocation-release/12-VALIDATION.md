---
phase: 12
slug: agent-dir-relocation-release
status: approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-26
---

# Phase 12 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Every code-producing task lists an `<automated>` verify command. New
> assertion surfaces (test files + linters) are explicitly enumerated as
> Wave 0 deliverables — these are NEW artifacts owned by Plans 04, 05,
> and 06 and are themselves their own first-execution acceptance.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Custom Node assertion harness — `assert(condition, name, errMsg)` + ANSI color helpers, identical to `test/test-legacy-v11-upgrade.js` pattern. Each test file is self-contained, runnable as `node test/<file>.js`, exits 0 on green / 1 on red. No Jest / Mocha / Vitest. |
| **Config file** | none — each `node test/<file>.js` is hermetic. CI orchestration via `package.json scripts.quality`. |
| **Quick run command** | `npm run test:install` (~3 min — `node test/test-installation-components.js`; touches the broadest installer surface, fastest signal for relocation regressions) |
| **Full suite command** | `npm run quality` (~15-20 min after Plan 08 extends the chain — runs format:check + lint + lint:md + docs:build + 4 validate:* + 9 test:* including the two new Phase 12 E2E tests) |
| **Estimated runtime** | quick: ~180s; full: ~900-1200s |

---

## Sampling Rate

- **After every task commit:** Run `npm run test:install` (quick — ~3 min)
- **After every plan wave:** Run the per-plan owner test (e.g. Plan 02 wave → `node test/test-cleanup-planner.js`; Plan 06 wave → `npm run test:gm-surface && npm run test:tarball`)
- **Before `/gsd-verify-work`:** Full suite must be green — `npm run quality` exits 0
- **Max feedback latency:** 180s (quick) / 1200s (full)

---

## Per-Task Verification Map

17 tasks across 8 plans (Plan 01: 2 tasks · Plan 02: 2 · Plan 03: 1 · Plan 04: 2 · Plan 05: 2 · Plan 06: 3 · Plan 07: 1 auto + 1 checkpoint · Plan 08: 4 auto + 2 checkpoints + 1 human-action — auto-only counted = 13 auto + 3 checkpoints + 1 human-action). Counting only tasks that produce verifiable code/files:

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 12-01-01 | 01 | 1 | AGENT-02 | T-12-01-02 | Constants exported; JSDoc untouched | unit | `node -e "const u=require('./tools/installer/ide/shared/path-utils'); if (u.AGENTS_PERSONA_SUBPATH !== '_config/agents') process.exit(1)"` | ✅ existing | ⬜ pending |
| 12-01-02 | 01 | 1 | AGENT-01, AGENT-03 | T-12-01-01, T-12-01-04 | Writer + template + comment co-commit; no JSDoc drift | grep+integration | `set -e; grep -q "AGENTS_PERSONA_SUBPATH" tools/installer/ide/shared/agent-command-generator.js && grep -q "_config/agents/{{shortName}}.md" tools/installer/ide/templates/agent-command-template.md && ! grep -q "'gomad', 'agents'" tools/installer/ide/shared/agent-command-generator.js` | ✅ existing | ⬜ pending |
| 12-02-01 | 02 | 2 | AGENT-04 | T-12-02-01, T-12-02-02, T-12-02-06 | isV12LegacyAgentsDir detector + handledPaths skip; realpath+isContained reused | unit | `node -e "const cp=require('./tools/installer/core/cleanup-planner'); if (typeof cp.isV12LegacyAgentsDir !== 'function') process.exit(1)" && grep -q "handledPaths" tools/installer/core/cleanup-planner.js` | ✅ existing | ⬜ pending |
| 12-02-02 | 02 | 2 | AGENT-06 | T-12-02-03, T-12-02-05 | Banner suppressed in dry-run; uses `await prompts.getColor()` (D-09 chalk pattern via cli-utils) | grep | `set -e; grep -q "isV12LegacyAgentsDir(workspaceRoot" tools/installer/core/installer.js && grep -q "GoMad v1.3 BREAKING" tools/installer/core/installer.js && grep -q "if (isV12Reloc && !config.dryRun)" tools/installer/core/installer.js && grep -q "await prompts.getColor()" tools/installer/core/installer.js` | ✅ existing | ⬜ pending |
| 12-03-01 | 03 | 3 | AGENT-05 | T-12-03-01, T-12-03-02 | PERSONA_SHORTNAMES derived from AGENT_SOURCES; .customize.yaml early-continue preserved | grep+integration | `set -e; grep -q "PERSONA_SHORTNAMES" tools/installer/core/installer.js && grep -q "AgentCommandGenerator.AGENT_SOURCES.map" tools/installer/core/installer.js && npm run test:install` | ✅ existing | ⬜ pending |
| 12-04-01 | 04 | 4 | DOCS-07 | T-12-04-01, T-12-04-04 | Negative-only linter; allowlist exempts upgrade-recovery.md (en+zh-cn) | new-test | `node tools/validate-doc-paths.js` | ❌ W0 — Plan 04 Task 1 CREATES `tools/validate-doc-paths.js` | ⬜ pending |
| 12-04-02 | 04 | 4 | DOCS-07 | — | Single-line script entry; no other package.json fields touched | wiring | `npm run validate:doc-paths` | ✅ existing (after 04-01) | ⬜ pending |
| 12-05-01 | 05 | 4 | AGENT-04, AGENT-06, AGENT-08 | T-12-05-01, T-12-05-05 | Network-free synthetic v1.2 seed; backup + remove + reason='manifest_cleanup' (top-level meta.reason) + .customize.yaml preserved | new-e2e | `node test/test-legacy-v12-upgrade.js` | ❌ W0 — Plan 05 Task 1 CREATES `test/test-legacy-v12-upgrade.js` | ⬜ pending |
| 12-05-02 | 05 | 4 | AGENT-01, AGENT-02, AGENT-03, AGENT-05, AGENT-09 | T-12-05-01 | Fresh-install + idempotent re-install produces ZERO backup dirs (proves Plan 03 whitelist) | new-e2e | `node test/test-v13-agent-relocation.js` | ❌ W0 — Plan 05 Task 2 CREATES `test/test-v13-agent-relocation.js` | ⬜ pending |
| 12-06-01 | 06 | 4 | AGENT-07 | T-12-06-04 | Phase C body-regex: positive `_config/agents/<name>.md` + negative `gomad/agents/<name>.md` per persona | extension | `npm run test:gm-surface` | ✅ existing | ⬜ pending |
| 12-06-02 | 06 | 4 | AGENT-10 | T-12-06-02 | Allowlist `category` field; cleanup-planner.js entry covers Phase 3 + Phase 4 (`category: 'both'`) | unit | `node -e "const a=JSON.parse(require('fs').readFileSync('tools/fixtures/tarball-grep-allowlist.json','utf8')); const e=a.find(x=>x.path==='tools/installer/core/cleanup-planner.js'); if(!['both','gomad-agents'].includes(e.category))process.exit(1)"` | ✅ existing | ⬜ pending |
| 12-06-03 | 06 | 4 | AGENT-10 | T-12-06-01 | Phase 4 grep clean against shipped src/ + tools/installer/; allowlist filtered by category | extension | `npm run test:tarball` | ❌ W0 — Plan 06 Task 2 EXTENDS `tools/fixtures/tarball-grep-allowlist.json` (and Task 3 EXTENDS `tools/verify-tarball.js`); Phase 4 invocation is NEW | ⬜ pending |
| 12-07-01 | 07 | 5 | AGENT-11 | T-12-07-02 | New `## v1.2 → v1.3 recovery` section; existing line-19 backup-tree example untouched | docs+lint | `set -e; grep -q "## v1.2 → v1.3 recovery" docs/upgrade-recovery.md && npm run validate:doc-paths` | ✅ existing | ⬜ pending |
| 12-07-02 | 07 | 5 | AGENT-11 | T-12-07-03 | zh-cn parity translation; code blocks untranslated | docs+lint | `set -e; grep -q "## v1.2 → v1.3 升级恢复" docs/zh-cn/upgrade-recovery.md && npm run validate:doc-paths` | ✅ existing | ⬜ pending |
| 12-08-01 | 08 | 6 | REL-02 | T-12-08-03 | quality script chains the FULL release matrix; prepublishOnly = npm run quality | wiring | `node -e "const p=JSON.parse(require('fs').readFileSync('package.json','utf8')); for (const s of ['prepublishOnly','test:legacy-v12-upgrade','test:v13-agent-relocation','validate:doc-paths']) if (!p.scripts[s]) process.exit(1)"` | ✅ existing | ⬜ pending |
| 12-08-02 | 08 | 6 | REL-01 | — | v1.3.0 entry inserted ABOVE v1.2.0; BREAKING + cross-link to upgrade-recovery.md#v12--v13-recovery | docs | `set -e; grep -q "## \\[1.3.0\\]" CHANGELOG.md && grep -q "v12--v13-recovery" CHANGELOG.md` | ✅ existing | ⬜ pending |
| 12-08-03 | 08 | 6 | REL-03 | T-12-08-04 | Version bump 1.2.0 → 1.3.0; release commit pre-tag | unit | `node -e "if (JSON.parse(require('fs').readFileSync('package.json')).version !== '1.3.0') process.exit(1)"` | ✅ existing | ⬜ pending |
| 12-08-04 | 08 | 6 | REL-04 | T-12-08-07 | v1.3.0 annotated tag pushed; PROJECT.md/MILESTONES.md/STATE.md updated | wiring | `git ls-remote --tags origin v1.3.0 \| grep -q "refs/tags/v1.3.0"` | ✅ existing | ⬜ pending |

**Checkpoint tasks (no `<automated>` — gated by human signal):**
- 12-07-CP1 (Confirm Phase 11 docs branch merged into Phase 12 working branch)
- 12-08-CP1 (`npm run quality` green + `npm pack --dry-run` file list inspected BEFORE version bump)
- 12-08-CP2 (User runs `npm publish --access public --tag latest` with 2FA OTP)

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Wave 0 deliverables — NEW assertion surfaces created by Phase 12. Each is itself its own first-run acceptance:

- [ ] **`tools/validate-doc-paths.js`** — NEW negative-only docs linter (Plan 04 Task 1). First green run = the file existing + scanning current docs tree exit 0 with allowlist (`upgrade-recovery.md` en + zh-cn) honored.
- [ ] **`test/test-legacy-v12-upgrade.js`** — NEW v1.2→v1.3 upgrade E2E (Plan 05 Task 1). Synthesizes v1.2 install state in tempdir, runs `gomad install`, asserts: old path gone + new path present + backup populated + `meta.reason === 'manifest_cleanup'` (top-level — confirmed by reading `tools/installer/core/cleanup-planner.js:357` `writeMetadata({ ..., reason: plan.reason, ... })`) + idempotent re-install produces no second backup. First green run = the file existing + exit 0.
- [ ] **`test/test-v13-agent-relocation.js`** — NEW fresh-install + idempotency E2E (Plan 05 Task 2). Fresh tempdir, runs `gomad install` twice, second invocation produces ZERO `_gomad/_backups/<ts>/` entries (proves AGENT-05 whitelist works). First green run = file existing + exit 0.
- [ ] **`tools/fixtures/tarball-grep-allowlist.json` extension** — Plan 06 Task 2 adds `category` field (`'gomad-agents'` / `'both'`) to existing entries and adds the `tools/installer/ide/shared/path-utils.js` entry. JSON validity check is its first acceptance: `node -e "JSON.parse(require('fs').readFileSync('tools/fixtures/tarball-grep-allowlist.json'))"` exits 0.

**Existing infrastructure covers all OTHER phase requirements** — Plans 01/02/03/06/07/08 mostly extend or wire into pre-existing `npm run test:install`, `npm run test:gm-surface`, `npm run test:tarball`, `npm run lint`, `npm run lint:md`, `npm run format:check`, `npm run docs:build` surfaces.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Phase 11 docs branch merged into Phase 12 working branch BEFORE Plan 07 finalizes | DOCS-07 cross-tree | Git history coordination cannot be auto-verified — operator must confirm `git log` shows Phase 11 commits in current branch | Plan 07 Checkpoint 1 — `git log --oneline \| grep -E "phase[- ]?11"` returns commits; if none, `git merge origin/main` then verify |
| `npm run quality` GREEN BEFORE version bump (Pitfall 4) | REL-02 | Quality matrix takes 15-20 min; cannot be auto-asserted in plan tooling — operator runs and confirms | Plan 08 Checkpoint 1 — operator runs `npm run quality` + `npm pack --dry-run`, visually inspects file list, types `approved — quality-green-and-tarball-clean` |
| `npm publish --access public --tag latest` with 2FA OTP (REL-03) | REL-03 | npm 2FA TOTP requires interactive OTP input from authenticator; Claude has no auth credentials | Plan 08 Checkpoint 2 — operator runs `npm publish`, supplies OTP, verifies `npm view @xgent-ai/gomad@1.3.0 version` returns `1.3.0` |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies (3 W0 NEW files + 1 W0 fixture extension; remaining 13 tasks have automated greps/integration commands)
- [x] Sampling continuity: no 3 consecutive tasks without automated verify (every task has either `<automated>` or W0 NEW-artifact acceptance; checkpoint tasks are non-code human-gates and don't break sampling continuity)
- [x] Wave 0 covers all MISSING references (4 NEW assertion surfaces enumerated; existing `npm run test:install` / `test:gm-surface` / `test:tarball` cover the rest)
- [x] No watch-mode flags (Node assertion harness exits after run; no `--watch` anywhere)
- [x] Feedback latency < 180s (quick `npm run test:install` ~180s; per-task greps sub-second)
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-04-26
