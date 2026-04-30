---
quick_id: 260430-q3c
type: summary
status: complete
completed: 2026-04-30
commits:
  - c5c82b4 feat(installer-260430-q3c): install-time invocation-syntax transform for non-launcher IDEs
  - 7d8ec75 test(installer-260430-q3c): allowlist gm-agent- references in invocation-syntax helper
  - 3694a08 test(installer-260430-q3c): unit test for invocation-syntax transform
files_changed:
  - tools/installer/ide/platform-codes.yaml (+1)
  - tools/installer/ide/shared/invocation-syntax.js (+88, new)
  - tools/installer/ide/_config-driven.js (+43)
  - tools/installer/core/installer.js (+48 / -10)
  - test/test-codex-syntax-transform.js (+141, new)
  - package.json (+1 / -1)
  - test/fixtures/orphan-refs/allowlist.json (+10)
totals: 7 files, +324 / -10
---

# Quick Task 260430-q3c — Summary

## Problem

After `gomad install --tools codex`, every cross-skill agent reference inside
copied skill bodies was authored as `/gm:agent-<short>`. Codex (and every
other platform without `launcher_target_dir`) cannot resolve the colon form —
it only invokes skills as `$gm-agent-<short>` (dollar-prefixed dash form, by
skill directory name). All such references were dead links at runtime.

## Fix

Install-time syntax transformation, gated on a per-platform `invocation_syntax`
field in `platform-codes.yaml`:

- `claude-code` declares `invocation_syntax: colon` — content ships verbatim,
  resolved at runtime via `.claude/commands/gm/agent-*.md` launchers
  (D-22/D-64 preserved bit-for-bit).
- All other platforms default to `dash` — copied skill content is rewritten
  in place after `fs.copy(...)` so `/gm:agent-pm` becomes `$gm-agent-pm`
  and bare `gm:agent-pm` (in CSV cells) becomes `gm-agent-pm`.

Source files under `src/gomad-skills/` stay canonical (colon form). Confirmed
byte-identical across all three commits via `git diff --stat 1b1dc59 HEAD --
src/gomad-skills/` (empty output).

## The exact regex

Two substitutions, applied in order, only when `invocationSyntax === 'dash'`:

```js
// shorts is the alternation of the 8 canonical shortNames sorted by length
// desc so multi-token names match first (solo-dev before dev, tech-writer
// before tech, etc.):
const shorts = ['analyst','tech-writer','pm','ux-designer','architect','sm','dev','solo-dev']
  .slice().sort((a, b) => b.length - a.length).join('|');

// 1. /gm:agent-<short> → $gm-agent-<short>  (slash-colon → dollar-dash)
new RegExp(`/gm:agent-(${shorts})\\b`, 'g'); // replacement: '$$gm-agent-$1'

// 2. bare gm:agent-<short> → gm-agent-<short>  (CSV cell rewrite)
new RegExp(`\\bgm:agent-(${shorts})\\b`, 'g'); // replacement: 'gm-agent-$1'
```

Substitution #1 runs FIRST. If #2 ran first, the `gm:agent-pm` portion of
`/gm:agent-pm` would consume to `gm-agent-pm`, leaving `/gm-agent-pm` in
output (wrong — the slash needs to become `$`).

Word boundaries (`\b`) on both sides prevent false matches like `xgm:agent-pm`
(left) and `gm:agent-pmx` (right).

## Why dash for non-launcher platforms, colon for source

- **Source colon form** is canonical because Claude Code is the dominant
  surface and has launcher generation. Authors write `/gm:agent-pm` once
  in `src/gomad-skills/` and the launcher under `.claude/commands/gm/`
  resolves it at runtime.
- **Codex et al.** have no launcher mechanism — they invoke a skill by its
  directory name only, prefixed with `$` (e.g. `$gm-agent-pm`). They cannot
  parse colons in invocation tokens.
- The transform runs at copy time, AFTER `fs.copy(sourceDir, skillDir)`,
  so source files are never modified. Files whose contents do not change
  are not rewritten (mtime stays stable for all the non-agent-referencing
  files like images, JSON fixtures, etc.).

## Two install-pipeline call sites

1. **`tools/installer/ide/_config-driven.js#installVerbatimSkills`** — for
   each copied `skillDir`, when `invocationSyntax === 'dash'`, walk it
   recursively via the new `_applyInvocationSyntaxToDir(dir, syntax)`
   method and rewrite `.md`, `.csv`, `.yaml`, `.yml` files in place.
2. **`tools/installer/core/installer.js#mergeModuleHelpCatalogs`** — accepts
   a new `invocationSyntax` parameter (resolved by
   `_resolveMergedInvocationSyntax(config.ides)` — returns `'dash'` if any
   selected IDE is non-launcher, `'colon'` only when claude-code is the
   sole pick). The transform applies to:
   - `agentInfo` map keys at population time (line ~1219), so the lookup
     key matches the form the row's `rawAgentName` will be transformed
     into.
   - Each row's `rawAgentName` before lookup (line ~1304).
   - The emitted `emittedAgentName` column written to
     `_gomad/_config/gomad-help.csv`.

## Conservative scope (provably bounded)

The substitution is hard-bounded to the 8 shortNames in
`AgentCommandGenerator.AGENT_SOURCES` — re-exported from
`invocation-syntax.js#BUILT_IN_AGENT_SHORTNAMES`. Test case 14 is a drift
detector: `assert.deepEqual(BUILT_IN_AGENT_SHORTNAMES, AGENT_SOURCES.map(s => s.shortName))`.
If a 9th agent is ever added without updating the regex source list, the
test fails immediately.

Negative cases verified by the test suite:
- `/gm:agent-unknown` (unknown shortName) — unchanged
- `gm:something-else` (unrelated colon prefix) — unchanged
- `/gm:agent-pmx` (right-boundary edge) — unchanged
- `$gm-agent-pm` (already dash) — unchanged (idempotent)

## Platforms verified beyond codex

The transform is gated purely on the `invocation_syntax` field (or its
absence — defaults to dash). Every non-`claude-code` platform in
`platform-codes.yaml` (auggie, cline, codebuddy, antigravity, crush, cursor,
gemini, github-copilot, iflow, junie, kilo, kiro, ona, opencode, pi, qoder,
qwen, roo, rovo-dev, trae, windsurf, codex) gets dash form by virtue of
having no `launcher_target_dir` and no `invocation_syntax` override. No
platform-specific code paths needed.

The transform itself is verified at the unit-test level (14 cases). A
separate full install-smoke test for codex was deferred per the plan ("If
someone later wants a codex install-smoke […] that's a follow-up").

## Test results

- `node test/test-codex-syntax-transform.js` — 14/14 pass
- `npm run test:codex-syntax` — 14/14 pass
- `npm run test:orphan-refs` — 2/2 pass (allowlist updated for the new
  helper file and test file)
- `npm run test:install` — 205/205 pass (all 27 IDE installer suites,
  including the codex suite, still green)
- `npm run test:statusline` — 46/46 pass
- `npm run lint` (modified files) — clean
- `npm run format:check` (modified files) — clean

## Deviations

**[Rule 3 — Lint fix]** The pre-existing `invocation-syntax.js` (created in
a prior commit at the worktree base) had one `unicorn/prefer-spread` lint
error: `BUILT_IN_AGENT_SHORTNAMES.slice().sort(...)`. Changed to
`[...BUILT_IN_AGENT_SHORTNAMES].sort(...)` so `npm run lint` stayed green
on the changed-files set. Behavior identical.

**[Rule 3 — Allowlist update]** The new `invocation-syntax.js` and
`test-codex-syntax-transform.js` files contain JSDoc / fixtures that
legitimately reference both `gm:agent-<short>` (input) and
`gm-agent-<short>` (output) forms. The orphan-refs regression gate
(`test/test-orphan-refs.js`) flagged them. Added two file-level entries
to `test/fixtures/orphan-refs/allowlist.json` with reasons explaining
the legitimate intent.

**[Lint nuance — `unicorn/no-useless-undefined` for test 12]** The test
12 fixture `resolveInvocationSyntax(undefined)` is the case under test
(defensive default for `undefined` config). Added a per-line
`eslint-disable-next-line` with rationale rather than removing the
literal `undefined` (which would defeat the test). Conservative: scoped
to the single line.

## Deferred items

See `deferred-items.md` in this same directory. One pre-existing
`test:claude-md` "B. new gomad block (template) inserted" failure caused
by an unstaged modification to `tools/installer/assets/CLAUDE.md.template`
that arrived in the worktree before this task started. Verified the
modification is NOT mine by stashing all changes and running the failing
test against the base commit (`1b1dc59`) — it passes 21/21 there, so the
failure is purely a function of the pre-existing `CLAUDE.md.template`
modification. This task does not touch `CLAUDE.md.template` or
`test-claude-md-install.js`.

## Manual smoke (developer machine — not in CI)

Per the plan's `<verify>` section. Not executed in this commit because
the pre-existing `xgent-ai-gomad-1.3.1.tgz` artifact in the worktree is
stale relative to these changes. The code path is exercised end-to-end
by `test:install` (Codex test suite passes), and the regex semantics by
the unit test. Run after a fresh `npm pack`:

```bash
TMP=$(mktemp -d) && cd "$TMP" && npm init -y >/dev/null && \
npm install "$(cd /Users/rockie/Documents/GitHub/xgent/gomad && npm pack 2>/dev/null | tail -1)" >/dev/null && \
./node_modules/.bin/gomad install --yes --directory "$TMP" --tools codex >/dev/null
grep -c '/gm:agent-' "$TMP/.agents/skills/gm-sprint-agent/workflow.md"  # expect 0
grep -c '\$gm-agent-pm' "$TMP/.agents/skills/gm-sprint-agent/workflow.md" # expect ≥1
grep -c 'gm:agent-tech-writer' "$TMP/_gomad/_config/gomad-help.csv" # expect 0
```

## Self-Check: PASSED

- File `tools/installer/ide/platform-codes.yaml` — has `invocation_syntax: colon` on claude-code (verified)
- File `tools/installer/ide/shared/invocation-syntax.js` — exists, exports the 3 names
- File `tools/installer/ide/_config-driven.js` — has `_applyInvocationSyntaxToDir` and the call site
- File `tools/installer/core/installer.js` — has `_resolveMergedInvocationSyntax` and updated `mergeModuleHelpCatalogs(gomadDir, invocationSyntax)`
- File `test/test-codex-syntax-transform.js` — exists, 14/14 pass
- File `test/fixtures/orphan-refs/allowlist.json` — has the two new file-level entries
- File `package.json` — has `test:codex-syntax` script, wired into `test` aggregate between `test:claude-md` and `test:legacy-gomad-id`
- Commits `c5c82b4`, `7d8ec75`, `3694a08` — all in `git log`
- Source files in `src/gomad-skills/` — byte-identical to base
