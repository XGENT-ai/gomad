---
id: 260512-vc3
slug: fix-gomad-hook-esm-scope-error-in-target
description: Fix gomad hook ESM scope error in target projects with type:module — rename .js hook files to .cjs (and update settings.json template + installer references)
status: complete
date: 2026-05-12
---

# Quick Task 260512-vc3 — Summary

## Bug

After `gomad install` against a target project (e.g. `xgent-ai-file-storage`) whose `package.json` declares `"type": "module"`, every `UserPromptSubmit` in Claude Code surfaced:

```
UserPromptSubmit hook error
⎿ Failed with non-blocking status code: file:///<project>/.claude/hooks/gomad-agent-tracker.js:18
```

Reproducing the hook directly under that project confirmed the underlying Node error:

```
ReferenceError: require is not defined in ES module scope, you can use import instead
This file is being treated as an ES module because it has a '.js' file extension
and '<project>/package.json' contains "type": "module". To treat it as a CommonJS
script, rename it to use the '.cjs' file extension.
    at file:///<project>/.claude/hooks/gomad-agent-tracker.js:18:12
```

The hook is CommonJS (`require('node:fs')` at line 18) but lived as `.js` under the host project, so Node's module-type resolution followed the **host** `package.json`. Hosts with `"type": "module"` mis-classified the hook as ESM and crashed at module load. Same latent failure mode for `gomad-statusline.js`.

## Fix

Renamed both hook assets from `.js` to `.cjs` so Node's per-extension module-type override pins them to CommonJS regardless of the host's `package.json` `"type"` field. This is the migration Node itself recommends in its error text.

Renames touched five concentric layers:

1. **Hook source assets** — `git mv`'d `tools/installer/assets/hooks/gomad-{agent-tracker,statusline}.js` → `.cjs` and refreshed the cross-reference comments inside both files; added a doc note in `gomad-agent-tracker.cjs` explaining the `.cjs` semantics.
2. **Installer config** — `tools/installer/ide/platform-codes.yaml` `source:` + `dest_name:` for both `statusline` and `agent_tracker` blocks now point at `.cjs`, with a comment explaining why.
3. **Installer comments + log strings** — `tools/installer/ide/_config-driven.js` (the `"... still copied to ${hooks_target_dir}/"` log message + two JSDoc references) updated to `.cjs`.
4. **Allowlist fixtures** — `tools/fixtures/tarball-grep-allowlist.json` and `test/fixtures/orphan-refs/allowlist.json` now reference `.cjs` paths.
5. **ESLint scope** — `eslint.config.mjs` override at line 88 only matched `tools/**/*.{js,mjs}` and `test/**/*.{js,mjs}`. Extended to include `.cjs` so the renamed assets inherit the same relaxed Node-CLI rule set (otherwise `process.exit(...)` and `parseInt(...)` immediately became errors on the renamed files). One now-redundant inline `eslint-disable` in `tools/inject-reference-tables.cjs` removed.

### Migration for existing installs

`cleanupStatusline` and `cleanupAgentTracker` previously identified "our" files and settings.json entries by exact-match on the current `dest_name`. After flipping to `.cjs`, stale `.js` artifacts left by older installer versions would have been orphaned: cleanup would skip them and the next install would see the stale `.js` `statusLine.command` as **third-party** and prompt the user to override.

Both cleanup methods now compute a `legacyDest = cfg.dest_name.replace(/\.cjs$/, '.js')`, build a `candidateNames` set containing both names, and:

- Remove the hook file at either name from `<hooks_target_dir>/`.
- Strip `statusLine.command` / per-event `hooks[].command` entries that include **either** name from `settings.json`.

`installToTarget()` runs `cleanup()` before re-installing, so `npx @xgent-ai/gomad install` over a stale install now self-heals in a single command — no user action required.

## Tests

`test/test-statusline-install.js` — kept all 46 prior assertions green (renamed `.js` → `.cjs` literals and three regex assertions `/gomad-statusline\.js/` → `/gomad-statusline\.cjs/` that `replace_all` couldn't touch because they contained escaped dots). Added two new cases:

- **Case H (3 checks)** — original-bug regression. Spawns a child `node` process against a synthetic host directory containing `{"type": "module"}` in `package.json` and the renamed `gomad-agent-tracker.cjs` under `.claude/hooks/`. Asserts: (1) exit 0, (2) empty stderr (no ESM-scope ReferenceError), (3) state file written with the resolved persona. With the old `.js` name this case would have failed at module load.
- **Case I (6 checks)** — migration cleanup. Seeds a tmp project with stale `gomad-{statusline,agent-tracker}.js` files plus matching `statusLine` and three-event `hooks` entries pointing at the `.js` names, then runs both cleanup methods. Asserts both legacy files are removed, `statusLine` is stripped, all three event-level legacy entries are stripped, and unrelated keys (`env.KEEP`, `echo other` hook) survive.

Total: 55 passed / 0 failed. Also verified `npm run lint`, `npm run format:check`, `npm run test:refs`, `npm run test:orphan-refs`, `npm run test:install` (205/205), and `npm run test:tarball` all green.

## Verification commands

Hook end-to-end under a synthetic `type:module` parent (the exact reproducer):

```bash
tmp=$(mktemp -d)
echo '{"type":"module"}' > "$tmp/package.json"
mkdir -p "$tmp/hooks"
cp tools/installer/assets/hooks/gomad-agent-tracker.cjs "$tmp/hooks/"
echo '{"session_id":"esm-regression","hook_event_name":"UserPromptSubmit","prompt":"/gm:agent-pm hi"}' \
  | node "$tmp/hooks/gomad-agent-tracker.cjs"
echo "exit=$?"   # → exit=0 (previously: ReferenceError, exit=1)
```

Locally produced:

```
exit=0
/var/folders/.../T/gomad-agent-esm-regression.json
{"shortName":"pm","persona":"John","skill":"gm-agent-pm","ts":...}
```

## Files Changed

- `tools/installer/assets/hooks/gomad-agent-tracker.js` → `.cjs` (rename + comment refresh)
- `tools/installer/assets/hooks/gomad-statusline.js` → `.cjs` (rename + comment refresh)
- `tools/installer/ide/platform-codes.yaml` (source + dest_name × 2)
- `tools/installer/ide/_config-driven.js` (log msg + JSDoc + migration in both cleanup methods)
- `tools/fixtures/tarball-grep-allowlist.json` (path updates)
- `test/fixtures/orphan-refs/allowlist.json` (path updates)
- `eslint.config.mjs` (scope override to include `.cjs`)
- `tools/inject-reference-tables.cjs` (drop now-redundant `eslint-disable`)
- `test/test-statusline-install.js` (literal refresh + Case H + Case I)

## Non-Scope / Deferred

- Did not rewrite the hook as ESM. The `.cjs` extension is a smaller, more portable fix.
- Did not touch the in-repo `.claude/hooks/gsd-statusline.js` (different ownership; this repo's own `package.json` doesn't set `"type": "module"`).
- Migration runs silently via the existing `cleanup` step. No new install-time prompts.
