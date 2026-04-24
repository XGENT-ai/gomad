# Pitfalls Research — v1.3 Marketplace, Docs & Story Context

**Domain:** GoMad installer + skills framework — adding marketplace refresh, docs site, agent dir relocation, and story-context enhancements to shipped `@xgent-ai/gomad@1.2.0`
**Researched:** 2026-04-24
**Confidence:** HIGH (grounded in direct read of `cleanup-planner.js`, `verify-tarball.js`, `test-gm-command-surface.js`, `agent-command-template.md`, `marketplace.json`, v1.1/v1.2 RETROSPECTIVE.md, MILESTONES.md)

**Scope note:** These are pitfalls specific to ADDING these features to THIS codebase. Generic "write good code" advice is excluded. Every pitfall cites a concrete file, test, or prior-milestone lesson it derives from.

---

## Workstream 1 — Agent Dir Relocation (`gomad/agents/` → `_config/agents/`)

### Pitfall 1-A: Partial-update drift between template and path-utils

**What goes wrong:**
`tools/installer/ide/templates/agent-command-template.md` line 16 hard-codes `{project-root}/_gomad/gomad/agents/{{shortName}}.md` as the runtime persona path. `tools/installer/ide/shared/path-utils.js` + `agent-command-generator.js` compute install-time agent destinations. Both reference the same logical `gomad/agents/` path but in different formats. If you update the template body string but miss the generator (or the reverse), the installer writes launchers that reference a directory the installer never populated.

**Why it happens:**
The path is physically duplicated — it's a string literal in the template, but also an assembled path in generator code, and also shows up in `docs/upgrade-recovery.md` line 19, `installer.js:295` comments, `manifest-generator.js:351`, and `artifacts.js:55`. No single source-of-truth constant. The `GOMAD_FOLDER_NAME = '_gomad'` constant in `path-utils.js` exists, but there is no equivalent `AGENTS_SUBPATH = 'gomad/agents'` constant.

**How to avoid:**
Before touching any path:
1. Run `grep -rn "gomad/agents" tools/installer/ docs/ src/` and inventory every hit.
2. Introduce a single exported constant (e.g., `AGENTS_SUBPATH = '_config/agents'`) in `path-utils.js`, then import everywhere. Convert every hit to use the constant.
3. Do the template substitution via `.replaceAll()` at generator time (not via hand-edit of the template) so the template becomes a `{{agentsPath}}` placeholder filled from the constant.

**Warning sign (detection):**
Grep `grep -rn "gomad/agents" tools/ src/ docs/` AFTER the edit should return ZERO hits outside archived changelog entries. Any hit = drift.

**Phase to address:**
Early phase — before any other agent-relocation work. Extract the constant FIRST (similar to how v1.1 extracted `GOMAD_FOLDER_NAME`).

---

### Pitfall 1-B: `test:gm-surface` cannot detect launcher-body runtime-path drift

**What goes wrong:**
`test/test-gm-command-surface.js` asserts (Phase C, lines 224–240): launcher file exists, has YAML frontmatter, `name: gm:agent-<shortName>`, non-empty description. It does **not** grep the launcher BODY for the runtime path (`_gomad/gomad/agents/` vs `_gomad/_config/agents/`). Meaning: a launcher pointing at the OLD path will pass every current test but silently break at `/gm:agent-pm` invocation time.

**Why it happens:**
Phase C was written in v1.2 to lock the launcher CONTRACT (frontmatter shape). It assumes the template body is static. v1.3 breaks that assumption by changing the body.

**How to avoid:**
Extend `test/test-gm-command-surface.js` Phase C with a body-regex assertion:
```js
assert(
  /\{project-root\}\/_gomad\/_config\/agents\//.test(raw),
  `(C) agent-${shortName}.md body references new _config/agents/ path`
);
assert(
  !/_gomad\/gomad\/agents\//.test(raw),
  `(C) agent-${shortName}.md body does NOT reference legacy gomad/agents/ path`
);
```
Wire this into Phase C on installer output AND Phase A on the in-repo dev stubs.

**Warning sign (detection):**
Manually `/gm:agent-pm` post-install — Claude reports "file not found" for `_gomad/gomad/agents/pm.md`.

**Phase to address:**
Same phase as the relocation itself. The test MUST gain the body assertion in the same commit that changes the template.

---

### Pitfall 1-C: v1.2→v1.3 upgrade — cleanup plan doesn't model the MOVE semantically

**What goes wrong:**
`cleanup-planner.js:buildCleanupPlan` produces `{to_snapshot, to_remove, to_write}`. It does this by taking `newInstallSet` (paths the new install will write) and diffing against `priorManifest` entries. An entry in priorManifest whose realpath is NOT in newInstallSet → stale → removed. This is correct for "agent moved from `.../gomad/agents/pm.md` to `.../_config/agents/pm.md`" because:
- Old path `gomad/agents/pm.md` is in priorManifest but NOT newInstallSet → scheduled for remove (snapshotted first).
- New path `_config/agents/pm.md` is in newInstallSet but NOT priorManifest → scheduled for write.

BUT — the user's custom edits to the v1.2 file (`gomad/agents/pm.md`) will be snapshotted (flagged `was_modified=true` via D-34 hash compare) and then removed, and the new v1.3 file will be written to a different location, losing their edits unless they manually re-apply from backup. There is no `to_move_and_preserve_user_edits` semantic.

**Why it happens:**
v1.2's cleanup was designed for "skills/gm-agent-*/ no longer installed" (true delete). It was not designed for renames/moves.

**How to avoid:**
1. Before Phase-X relocation work, write a dedicated upgrade test (`test/test-v12-to-v13-upgrade.js`) that:
   - Sets up a simulated v1.2 workspace with a files-manifest.csv containing `_gomad/gomad/agents/pm.md`.
   - Modifies one of those files (simulates user edit).
   - Runs a mocked v1.3 install.
   - Asserts the modified file is snapshotted with `was_modified: true` in metadata.json AND that the new path gets written.
   - Asserts `docs/upgrade-recovery.md` explicitly documents the move and tells the user to review `_backups/<ts>/_gomad/gomad/agents/` against `_gomad/_config/agents/` to re-apply edits.
2. Consider adding a preflight warning to `gomad install` when v1.2→v1.3 is detected: *"Your agent files at `_gomad/gomad/agents/` will be moved to `_gomad/_config/agents/`. A backup snapshot will be written to `_gomad/_backups/<ts>/`. If you customized agent files, review the backup and re-apply changes to the new location."*

**Warning sign (detection):**
Manual upgrade test: stash v1.2 workspace, run v1.3 install, `diff _gomad/_backups/<ts>/_gomad/gomad/agents/ _gomad/_config/agents/` — any diff is lost work.

**Phase to address:**
Relocation phase, BEFORE installer code changes land. Write the upgrade test first (TDD RED/GREEN — our standard pattern per RETROSPECTIVE v1.2 Lesson 4).

---

### Pitfall 1-D: Hardcoded `_gomad` / `_config` strings bypassing the `<installRoot>` variable

**What goes wrong:**
`<installRoot>` is user-chosen (PROJECT.md line 24: *"`<installRoot>` is user-chosen (`_gomad` by convention); no hardcoded install paths"*). If a dev writes `'_gomad/_config/agents'` directly (not `path.join(gomadFolder, '_config', 'agents')`), then a user who customizes to `my-gomad/` gets broken behavior.

**Why it happens:**
Copy-paste from existing code (which already hardcodes `_gomad/gomad/agents/` in several spots — see `installer.js:295`, `upgrade-recovery.md:19`, template line 16, `manifest-generator.js:351`). The bad pattern is already entrenched; relocation risks propagating it.

**How to avoid:**
During relocation edits, audit each hit from Pitfall 1-A's grep. Classify each:
- Documentation / example (OK to hardcode `_gomad` as conventional default): docs/, changelog, README.
- Runtime code (MUST use `gomadFolder` variable): anything under `tools/installer/`.
- Template (MUST use `{project-root}/{{gomadFolder}}/_config/agents/`): `agent-command-template.md`.

The template line 16 today reads `{project-root}/_gomad/gomad/agents/...` — the `_gomad` literal there is actually a bug carried from v1.2 (it should have been a placeholder). Fix the root cause during relocation, don't re-ship the bug.

**Warning sign (detection):**
Add a lint rule or grep test: `grep -rn "'_gomad/" tools/installer/ | grep -v 'GOMAD_FOLDER_NAME\|test/\|fixtures/'` should return zero hits.

**Phase to address:**
Same phase as relocation — one atomic fix, not piecemeal.

---

### Pitfall 1-E: `verify-tarball.js` grep-clean does NOT cover new path

**What goes wrong:**
`tools/verify-tarball.js` Phase 2 greps for `\b(bmad|bmm)\b` and Phase 3 greps for `gm-agent-`. Neither checks that `_gomad/gomad/agents/` references are absent from shipped content post-migration. After v1.3, any stray `gomad/agents/` reference in shipped source will not fail the release.

**Why it happens:**
v1.2's grep-clean covered v1.1→v1.2 residuals (bmad, gm-agent-). v1.3 introduces a new residual to sweep (`gomad/agents` → `_config/agents`) that isn't gated.

**How to avoid:**
Add Phase 4 to `verify-tarball.js`:
```js
function checkLegacyAgentPathClean() {
  // Search for the old path in shipped source (src/ + tools/installer/)
  const out = execSync('grep -rlE "_gomad/gomad/agents|[^a-z]gomad/agents/" src/ tools/installer/ ... 2>/dev/null');
  // Allowlist: CHANGELOG.md, upgrade-recovery.md archived references
}
```
Wire Phase 4 into `test:tarball`.

**Warning sign (detection):**
Ship an intentional regression (re-add `gomad/agents/` to one file) and verify `npm run test:tarball` now fails.

**Phase to address:**
Relocation phase, before the first `npm publish`.

---

### Pitfall 1-F: `docs/upgrade-recovery.md` still shows `gomad/agents/` in backup tree

**What goes wrong:**
`docs/upgrade-recovery.md` line 19 shows:
```
└── _gomad/                 # snapshots of files that were installed under _gomad/
    └── gomad/agents/pm.md
```
Post-v1.3, backups for users upgrading FROM v1.2 will genuinely contain `gomad/agents/pm.md` (that was the old path at snapshot time). So this doc is actually correct for v1.2→v1.3 upgrade. BUT a user doing v1.3→v1.4 upgrade will see `_config/agents/pm.md` in their backup, and the doc will be stale.

**Why it happens:**
Doc captures a snapshot of a specific version's install tree. Doesn't generalize.

**How to avoid:**
Rewrite line 19 with both paths explicitly:
```
└── _gomad/
    ├── gomad/agents/pm.md         # for v1.2-vintage workspaces (pre-relocation)
    └── _config/agents/pm.md       # for v1.3+ workspaces (post-relocation)
```
OR better: use a generic `<agent-dir>/pm.md` placeholder and link to the version-at-install-time constant.

**Warning sign (detection):**
Docs review checklist: every hardcoded path in `docs/` that references the install tree → must be either generic placeholder OR version-qualified.

**Phase to address:**
Docs-site phase (same milestone, likely later — but must run AFTER the relocation phase to reflect final state).

---

## Workstream 2 — Plugin Marketplace Refresh

### Pitfall 2-A: marketplace.json schema version drift from Claude Code spec

**What goes wrong:**
`.claude-plugin/marketplace.json` currently uses `{name, owner, description, plugins: [{name, skills: [...]}]}` — fields we made up as best-match for BMAD's fork. The Claude Code plugin marketplace schema evolves independently. If Claude Code drops support for a field or requires a new one (e.g., `pluginVersion`, `compatibility`), our manifest silently stops resolving.

**Why it happens:**
No version floor pinned on Claude Code (Key Decision: "No Claude Code version floor pinned"). No test that validates our marketplace.json against a schema. The file is hand-authored.

**How to avoid:**
1. During marketplace restructure, check the current Claude Code marketplace documentation (via Context7 or official docs) and compare the JSON shape against current schema.
2. Add a schema file (e.g., `.claude-plugin/marketplace.schema.json`) and validate via a short Node script. Per zero-new-deps policy, avoid `ajv` — use Node built-in `JSON.parse` + hand-rolled assertions.
3. Add `test/test-marketplace-schema.js` wired into `npm run quality`.

**Warning sign (detection):**
Install in Claude Code, attempt to enable the plugin, silent failure or "plugin not found" error.

**Phase to address:**
Marketplace refresh phase, first plan. Schema validation test is the foundation.

---

### Pitfall 2-B: Dead references / renamed skill paths in marketplace.json

**What goes wrong:**
The current `marketplace.json` has entries like `./src/bmm-skills/1-analysis/bmad-product-brief`. The v1.1 rename renamed the directory to `src/gomad-skills/1-analysis/gm-product-brief`. The marketplace.json was never updated — it still references `bmm-skills/` + `bmad-*`. Every single path is dead.

**Why it happens:**
v1.1 focused on the shipped tarball + installer. `.claude-plugin/marketplace.json` is shipped but wasn't part of the rename sweep — confirm: it's not listed in `files:` allowlist in package.json which means it may not even ship in the tarball, but it IS in the repo as the GitHub-discovered plugin surface.

**How to avoid:**
During restructure:
1. Write a test (`test/test-marketplace-paths.js`): for each `plugins[].skills[].path`, assert `fs.existsSync(path + '/SKILL.md')`. Zero hits OK for workflow-type entries but MUST catch typo paths.
2. Regenerate the skill list programmatically from `src/gomad-skills/` + `src/core-skills/` via a small helper script (`tools/generate-marketplace.js`), DO NOT hand-curate. Treat `marketplace.json` as generated output, not hand-authored input.
3. Run the generator in `npm run quality` and diff against committed version — drift = fail.

**Warning sign (detection):**
Manual install from GitHub Pages marketplace URL → "skill not found" errors in Claude Code logs.

**Phase to address:**
Marketplace refresh phase. Generator + path-existence test before restructure.

---

### Pitfall 2-C: Duplicated skill listings across plugin groups

**What goes wrong:**
v1.3 plans to restructure into 3 groups: `gm-agent-*` launchers / `gomad-skills` workflow / `core-skills`. If the same skill is listed in two groups (e.g., `gm-brainstorming` under both `gomad-method-lifecycle` and `gomad-pro-skills`), Claude Code may register it twice, causing duplicate menu entries or resolve-conflict errors.

**Why it happens:**
Copy-paste + lack of uniqueness assertion. BMAD's current file has this structure; it's easy to miss a dupe during group restructure.

**How to avoid:**
In the same test as Pitfall 2-B:
```js
const allPaths = plugins.flatMap(p => p.skills);
const uniq = new Set(allPaths);
assert(allPaths.length === uniq.size, 'No duplicated skill paths across plugin groups');
```

**Warning sign (detection):**
Count: `jq '[.plugins[].skills[]] | length' marketplace.json` vs `jq '[.plugins[].skills[]] | unique | length'` — must match.

**Phase to address:**
Marketplace refresh phase.

---

### Pitfall 2-D: Missing entries for new v1.3 skills

**What goes wrong:**
v1.3 adds 3 skills: `gm-discuss-story`, `gm-domain-skill`, and modifies `gm-create-story`. If the marketplace.json is restructured BEFORE these new skills are built, or if the restructure happens in a different phase than the skill additions, the final marketplace will miss them.

**Why it happens:**
Phase ordering. Marketplace is tempting to restructure "first" as cleanup, but it's actually DOWNSTREAM of skill creation.

**How to avoid:**
Phase ordering rule: marketplace restructure MUST be the LAST phase before release (after all skill additions). Alternatively, if using the generator from Pitfall 2-B, just regenerate as a bookkeeping step — no hand-sync needed.

**Warning sign (detection):**
Checklist before release: for each skill in `src/gomad-skills/` with a `SKILL.md`, confirm it appears in `marketplace.json`. If using the generator, this is automatic.

**Phase to address:**
Release / wrap-up phase. Run the generator.

---

### Pitfall 2-E: Semver confusion — `plugins[].version` vs root `package.json` version

**What goes wrong:**
`plugins[].version` in the current marketplace.json is `"6.3.0"` (BMAD's upstream). Root `package.json` is `1.2.0`. Claude Code may use `plugins[].version` for compatibility checks — stale value reports the wrong version.

**Why it happens:**
BMAD's version number got carried into our fork unchanged. v1.1 rename missed this field.

**How to avoid:**
1. Pin `plugins[].version` to mirror root `package.json` version — read it at generator-time via `require('../../package.json').version`.
2. Assert equality in the marketplace test: `assert(plugin.version === pkg.version, 'plugin version matches package version')`.

**Warning sign (detection):**
`jq '.plugins[].version' marketplace.json` vs `jq '.version' package.json` — must match.

**Phase to address:**
Marketplace refresh phase.

---

## Workstream 3 — GitHub Pages Docs Site

### Pitfall 3-A: Astro `base` / `site` misconfiguration on custom subdomain

**What goes wrong:**
Astro's `astro.config.mjs` uses `site: 'https://example.com'` + optional `base: '/path'` for subpath deployments. On a custom subdomain (`gomad.xgent.ai` — root path), `base` should be unset or `/`. If set incorrectly (e.g., `base: '/gomad'` inherited from a previous config), all asset URLs render as `/gomad/_astro/...` resulting in 404s.

**Why it happens:**
GitHub Pages project sites (`<org>.github.io/<repo>/`) require `base: '/<repo>'`; user sites and custom domains don't. Config often starts from a project-site template.

**How to avoid:**
1. Explicit config in `website/astro.config.mjs`: `site: 'https://gomad.xgent.ai', base: '/'` (or omit `base`).
2. After deploy, `curl -I https://gomad.xgent.ai/_astro/<hash>.css` → 200 OK (not 404).
3. Add a post-deploy smoke test: `node tools/docs-smoke.js` fetches index + one asset URL.

**Warning sign (detection):**
Open deployed site in browser, F12 Network tab → all asset requests return 404.

**Phase to address:**
Docs-site phase, first plan (setup before content).

---

### Pitfall 3-B: CNAME file lost on deploy, domain reverts to github.io

**What goes wrong:**
GitHub Pages reads `CNAME` file at the docroot of the deployed branch to pin the custom domain. If the build output doesn't include a `CNAME` file, next deploy silently reverts to the default `<org>.github.io/<repo>` URL. `gomad.xgent.ai` stops resolving.

**Why it happens:**
Astro clears `dist/` on build. If `CNAME` lives in `website/public/CNAME` it's auto-copied to `dist/CNAME`; if it only exists in the gh-pages branch root (committed once, forgotten), `astro build` will overwrite it.

**How to avoid:**
1. Put `CNAME` in `website/public/CNAME` (contents: `gomad.xgent.ai`) — Astro's `public/` dir is copied verbatim to build output.
2. Deploy script asserts `dist/CNAME` exists before `git push origin gh-pages`.
3. DNS smoke test post-deploy: `dig +short gomad.xgent.ai` should return xgent.ai's GitHub Pages IP, not the repo default.

**Warning sign (detection):**
`curl https://gomad.xgent.ai` returns the generic github.io HTTP 301 to `xgent-ai.github.io/gomad/`.

**Phase to address:**
Docs-site phase, deployment plan (before first push to gh-pages).

---

### Pitfall 3-C: Manual deploy missed — docs drift from published npm

**What goes wrong:**
PROJECT.md is explicit: *"No CI auto-deploy in v1.3"*. Manual deploy after each release. Natural failure mode: release `1.3.0` with new skills, forget to regenerate docs, users visiting `gomad.xgent.ai` see `1.2.0` docs.

**Why it happens:**
Manual step is easy to skip. Release checklist doesn't enforce it.

**How to avoid:**
1. Extend the release runbook (part of the milestone close workflow): "Before `npm publish`, run `npm run docs:build && npm run docs:deploy` and verify `curl https://gomad.xgent.ai | grep <new-version>` returns the new version."
2. Embed the shipped version into docs site footer at build time (from `package.json`) so drift is visually obvious.
3. Wire a `prepublishOnly` script in package.json that reminds or actively runs the doc build (still manual on the git-push to gh-pages side — but the build output is always current).

**Warning sign (detection):**
Visit `gomad.xgent.ai` footer → "v1.2.0" when npm shows `1.3.0` published.

**Phase to address:**
Release phase. Part of the milestone close runbook.

---

### Pitfall 3-D: Docs content hand-authored → immediately stale

**What goes wrong:**
If the docs site pages for skills ("available skills", "agent personas") are hand-typed lists, they drift from `src/gomad-skills/` the moment a new skill lands. v1.1 RETROSPECTIVE noted this class: *"`findBmadDir` rename leaked beyond plan scope... incomplete Phase 2 sweep."*

**Why it happens:**
Copy-pasting skill names feels fast. Generating from source feels like premature automation.

**How to avoid:**
1. Docs site skill pages generated from `src/*/SKILL.md` frontmatter at build time via an Astro content collection or a pre-build script.
2. `npm run docs:build` fails if any skill directory lacks a valid `SKILL.md` frontmatter.
3. CI (even if deploy is manual) runs `docs:build` on PR merge to main so broken docs never land.

**Warning sign (detection):**
Add a new skill locally, `npm run docs:build` — new skill should appear automatically in the generated skill index. If not, docs are hand-authored.

**Phase to address:**
Docs-site phase. Content generation plumbing BEFORE writing content.

---

### Pitfall 3-E: Docs reference pre-v1.3 state (still documents `gomad/agents/`)

**What goes wrong:**
Docs ship examples like `Edit _gomad/gomad/agents/pm.md to customize the PM persona`. Post-relocation, that example is wrong — path is now `_gomad/_config/agents/pm.md`.

**Why it happens:**
Docs authored once, never re-swept after code changes. Same failure mode as v1.1 Phase 2 sweep gap.

**How to avoid:**
1. Add `tools/validate-doc-paths.js` (or extend `tools/validate-doc-links.js` which already exists): grep docs for `gomad/agents/` and fail.
2. Wire into `npm run quality` BEFORE the docs-site phase lands.
3. Pair with Pitfall 1-A's constant — docs examples can reference the constant in Astro templates (e.g., `<code>{AGENTS_INSTALL_PATH}</code>`).

**Warning sign (detection):**
`grep -rn "gomad/agents" docs/ website/` → any hit is stale.

**Phase to address:**
Docs-site phase, AFTER relocation phase. Phase ordering is critical here.

---

### Pitfall 3-F: Build artifact bloat — shipping source maps to public

**What goes wrong:**
`astro build` by default emits `.css.map` / `.js.map` files. Deploying the full `dist/` to gh-pages ships them. Source maps reveal source structure, bloat the repo, can leak internal comments.

**Why it happens:**
Astro defaults. Not a safety-critical leak for a docs site, but wasteful.

**How to avoid:**
`astro.config.mjs`: `vite: { build: { sourcemap: false } }` for production. Or deploy script `find dist -name "*.map" -delete` before push.

**Warning sign (detection):**
`curl https://gomad.xgent.ai/_astro/<hash>.js.map` → returns 200 with source.

**Phase to address:**
Docs-site phase, deployment plan.

---

### Pitfall 3-G: No index / search — users can't find anything

**What goes wrong:**
Ship a docs site with ~10 skill pages and 7 agent pages. No top-level index, no fulltext search. Users land on homepage, don't see what they want, leave.

**Why it happens:**
"Ship content first, polish later" mindset. Search feels like scope creep.

**How to avoid:**
1. Build a `/skills/` and `/agents/` top-level index page at minimum.
2. Consider a static client-side search (Pagefind is Astro-friendly, Node-built, zero runtime deps) — but respect the zero-new-runtime-deps policy for the installer; docs site's buildtime deps are separate (already has Astro).
3. Treat v1.3 docs site as MVP — single-page reference OK if indexed in `README.md`.

**Warning sign (detection):**
User testing: ask someone "find the gm-domain-skill docs" — if they take >30s, index is insufficient.

**Phase to address:**
Docs-site phase, content plan. MVP scope decision.

---

## Workstream 4 — Story-Creation Enhancements

### Pitfall 4-A: `gm-discuss-story` Context.md bloats gm-create-story's context window

**What goes wrong:**
`gm-discuss-story` writes `{planning_artifacts}/{{story_key}}-context.md`. `gm-create-story` loads it. If the discuss output is 10KB of verbose dialogue, the story creation skill pays that in every future invocation — and if `gm-create-story` quotes it verbatim into the story template, the produced story balloons.

**Why it happens:**
LLM outputs are verbose by default. No length budget enforced.

**How to avoid:**
1. `gm-discuss-story` SKILL.md must specify a target output budget: *"Output MUST be ≤1500 tokens. If exceeded, compress into bulleted decisions + rejected alternatives. Do NOT include verbatim dialogue — only resolved conclusions."*
2. Output structure: `## Resolved Decisions` (bullets), `## Rejected Alternatives` (bullets), `## Open Questions` (bullets). No prose paragraphs.
3. Add a probe test: generate a context.md from a fixture dialogue, assert `fs.statSync(...).size < 8192` bytes.

**Warning sign (detection):**
Post-Phase story creation logs show high token usage. `wc -w _planning/story-context.md` >1500.

**Phase to address:**
Story-enhancements phase. Budget spec before prompt content.

---

### Pitfall 4-B: `gm-discuss-story` questions abstract / generic, not gray-area probes

**What goes wrong:**
First-pass prompts often produce generic interview questions: "What's your timeline? Who's the primary user? What's success look like?" These are fluff — the PRD already covers them. The skill's VALUE is probing ambiguity in the specific story input.

**Why it happens:**
Generic "good interview" templates are training-data-dense. Prompt engineering for surgical questioning is harder.

**How to avoid:**
1. SKILL.md must include explicit ban list: *"NEVER ask: timeline, success metrics, primary user — these are covered in PRD. ONLY ask about gray areas in THIS story's acceptance criteria that a coding agent would need resolved."*
2. Include 3-5 concrete examples of good probes (e.g., *"The story says `validate input` — what counts as invalid? Empty string? Whitespace only? Script tags?"*).
3. Fixture test: feed a known-ambiguous story input, assert output matches patterns like `/"what counts as|edge case|ambiguous|undefined behavior"/i`.

**Warning sign (detection):**
Sample output review: if the questions sound like any other PM intake form, the skill is broken.

**Phase to address:**
Story-enhancements phase. Iterate on prompt content via dogfood fixture.

---

### Pitfall 4-C: Re-running `gm-discuss-story` creates conflicting context files

**What goes wrong:**
User runs discuss → creates `STORY-042-context.md`. Reviews, doesn't like it. Runs again. Does the new output overwrite? Append? Create `STORY-042-context-2.md`? All three behaviors are common; all three break downstream `gm-create-story` auto-loading.

**Why it happens:**
Idempotency not specified in skill contract.

**How to avoid:**
1. SKILL.md specifies exact behavior: *"If `{story_key}-context.md` already exists, the skill MUST ask the user: overwrite, append, or abort. Default NO action."*
2. `gm-create-story` precedence rule: always loads EXACTLY `{story_key}-context.md` (no `-2`, no `-latest`). If user has multiple versions, they're user-managed (like backup snapshots).

**Warning sign (detection):**
Run discuss twice without cleanup, observe behavior. Document the actual behavior and verify it matches spec.

**Phase to address:**
Story-enhancements phase.

---

### Pitfall 4-D: Output path mis-resolution when `{planning_artifacts}` unset

**What goes wrong:**
Template uses `{planning_artifacts}/{{story_key}}-context.md`. If the calling project has no `.planning/` directory, or if `{planning_artifacts}` resolves to `undefined`, the skill writes to `undefined/STORY-042-context.md` or silently no-ops.

**Why it happens:**
Template variables are string-substituted; undefined → literal `undefined` string. Common footgun in existing gomad skills (`data/prd-purpose.md` has similar placeholders).

**How to avoid:**
1. SKILL.md activation block: *"Resolve `{planning_artifacts}`. If unset, abort with error: 'Planning artifacts directory not configured. Run gm-create-prd first or set planning_artifacts in project config.'"*
2. `gm-create-story` mirror-check: if `{planning_artifacts}` unset, skip context load silently (graceful degradation — don't block story creation if discuss wasn't run).
3. Fixture test with both resolved and unresolved placeholder.

**Warning sign (detection):**
`ls` the working dir after a run → any `undefined*` file is a bug.

**Phase to address:**
Story-enhancements phase.

---

### Pitfall 4-E: `gm-create-story` silently no-ops on malformed context.md

**What goes wrong:**
Context.md exists but has YAML frontmatter corruption, missing required sections, or encoding issues. `gm-create-story` does `fs.readFile` → parse → swallow error → continue without context. User thinks context loaded; it didn't. Story is generic.

**Why it happens:**
Error-swallow pattern is easy to write; explicit validation is work.

**How to avoid:**
1. SKILL.md: *"If context.md exists but fails validation (missing `## Resolved Decisions` header OR unparseable), the skill MUST STOP and prompt the user to fix or delete the file. Do NOT continue silently."*
2. Add a schema: minimal required sections `## Resolved Decisions` + `## Open Questions`.
3. Validator function: `validateContextMd(raw) → {ok: bool, errors: string[]}`; log errors visibly.

**Warning sign (detection):**
Feed malformed context.md → story should fail fast with clear error. If story generated anyway, bug.

**Phase to address:**
Story-enhancements phase. Same plan as the load logic.

---

### Pitfall 4-F: Precedence ambiguity — context.md says X, user prompt says ¬X

**What goes wrong:**
Context.md: "validation rule: reject empty strings". User's story-creation prompt: "validate input, allow empty". Which wins? Unspecified behavior → LLM picks unpredictably.

**Why it happens:**
Precedence rules not stated in contract.

**How to avoid:**
SKILL.md must explicitly specify: *"User's current prompt ALWAYS overrides context.md. If conflict detected, emit a warning noting the override with both values quoted, then use the prompt value. Do NOT silently use the older context value."*

**Warning sign (detection):**
Craft a conflicting fixture, check story output reflects the newer value AND logs a visible warning.

**Phase to address:**
Story-enhancements phase. Contract specification.

---

### Pitfall 4-G: `gm-domain-skill` slug typos → silent empty result

**What goes wrong:**
User invokes `gm-domain-skill react-19-concurrent-rendaring` (typo). Skill greps `src/domain-kb/` (installed to `_config/kb/`), no match, returns empty or "no patterns found". User thinks there's no React 19 pack; actually there is (`react-19-concurrent-rendering`).

**Why it happens:**
Naive exact-match slug lookup. No fuzzy fallback, no "did you mean" suggestion.

**How to avoid:**
1. SKILL.md: *"If exact slug not found, list all available slugs sorted by Levenshtein distance (top 3). Do NOT return empty."*
2. Node built-in Levenshtein (manual implementation ~15 LOC) satisfies zero-new-deps (no `fuse.js`).
3. Print the full available slug list if no near-match.

**Warning sign (detection):**
Typo a slug, observe output. If "no match" with no suggestions → bug.

**Phase to address:**
Story-enhancements phase, domain-skill plan.

---

### Pitfall 4-H: "Top-1 best match" via keyword count = longest file wins

**What goes wrong:**
Naive ranking: count query-keyword occurrences per KB file, pick highest. Longer files have more occurrences by chance → "top match" is always the longest file.

**Why it happens:**
Raw frequency ranking without normalization. Classic BM25-without-idf mistake.

**How to avoid:**
1. Either normalize by file length (occurrences per 1k chars) OR use a title/filename heuristic first (exact slug match > title keyword > body keyword).
2. If retrieval is truly keyword-based, document the algorithm in SKILL.md: *"Ranks by: (1) exact slug match, (2) title keyword match, (3) normalized body frequency."*
3. Test fixture: 2 KB files, one short + relevant, one long + irrelevant. Assert the short one ranks higher.

**Warning sign (detection):**
Seed KB test: does the most relevant file actually come first?

**Phase to address:**
Story-enhancements phase, domain-skill retrieval plan.

---

### Pitfall 4-I: KB pack version drift (React 18 patterns shipped, React 19 lands)

**What goes wrong:**
Seed KB ships with `react-18-hooks-patterns.md`. React 19 ships, some patterns change (use of `use()` hook, async transitions). The KB pack now gives outdated advice. No versioning metadata in the pack, so consumers don't know to doubt it.

**Why it happens:**
KB packs are inherently time-stamped content treated as static reference.

**How to avoid:**
1. Every KB file frontmatter: `last_reviewed: YYYY-MM-DD`, `applies_to: ["react@18.x"]`, `confidence: HIGH|MEDIUM`.
2. `gm-domain-skill` output MUST surface `last_reviewed` to the consumer: *"This pack was last reviewed 2026-03-15 and applies to React 18.x. Verify current library version."*
3. Milestone review checklist: for each KB pack, confirm `last_reviewed` is within 6 months OR flag for refresh.

**Warning sign (detection):**
Retrieve a pack older than 6 months → output should flag with a staleness warning.

**Phase to address:**
Story-enhancements phase, KB seed content plan.

---

### Pitfall 4-J (CRITICAL): IP/licensing risk for borrowed seed KB content

**What goes wrong:**
If seed KB packs (`src/domain-kb/`) are copied or adapted from Claude-Cortex / vercel-labs / other open-source repos WITHOUT verifying license compatibility, GoMad ships unlicensed content. Consequences: DMCA takedown, npm unpublish, reputational damage.

**Why it happens:**
KB content feels like "public knowledge" — but curated docs and example patterns are copyrighted by their authors. MIT/Apache-2.0/CC-BY → OK with attribution. GPL → risk (copyleft propagates). Unlicensed repos → NOT OK to copy verbatim even if public.

**How to avoid:**
1. BEFORE copying any content, check source repo LICENSE. If MIT/Apache-2.0/CC-BY — OK with attribution (note source in KB file frontmatter: `source: "https://github.com/vercel/..., MIT"`). If GPL or unlicensed — re-author from scratch, no copying.
2. Every KB pack: frontmatter `source: <URL> | original` + `license: MIT | Apache-2.0 | CC-BY-4.0 | original`.
3. Add to `LICENSE` or `TRADEMARK.md` an attribution section for borrowed KB content (same pattern v1.1 used for BMAD preservation — RETROSPECTIVE v1.1 "canonical disclaimer" pattern).
4. Write a checker (`tools/validate-kb-licenses.js`) asserting every KB file has a `source` + `license` frontmatter. Wire into `npm run quality`.
5. Legal review at milestone close: enumerate every KB file, verify license cited matches source repo.

**Warning sign (detection):**
Any KB file without `source:` or `license:` frontmatter. Any KB file citing GPL source. Legal audit flag.

**Phase to address:**
Story-enhancements phase. BEFORE seeding content, set the licensing contract. This is load-bearing — do NOT ship unlicensed content.

---

### Pitfall 4-K: Wrong integration point — gm-domain-skill invoked at wrong lifecycle step

**What goes wrong:**
If `gm-domain-skill` is invoked from `gm-create-story`, patterns get baked into the story document — but at implementation time (`gm-dev-story`) the story is consumed by a different coding agent that re-reasons from scratch. Patterns should be retrieved at implementation time, not story-creation time. Conversely, if invoked only at dev-story time, the story doc doesn't know what patterns will apply → architectural decisions deferred too late.

**Why it happens:**
Retrieval timing isn't deeply thought through. The "skill retrieval protocol" is specified but the consumer integration isn't.

**How to avoid:**
1. Explicit design decision + rationale: *"gm-domain-skill is invoked at IMPLEMENTATION time by gm-dev-story, not at creation time. Story documents reference pack SLUGS (not pack content), so dev-time retrieval is fresh. Rationale: stale pack content in stories is worse than unresolved retrieval at dev time."*
2. Integration test: dogfood a story → dev-story pipeline with a seeded pack; verify pack is consulted at the expected step.

**Warning sign (detection):**
Review gm-create-story output with a seeded pack available. If pack content is embedded verbatim in the story body, integration is at the wrong step.

**Phase to address:**
Story-enhancements phase, integration plan. Specify timing decision explicitly.

---

## Workstream 5 — Cross-Cutting Pitfalls

### Pitfall 5-A: Merging v1.2→v1.3 without full `npm run quality`

**What goes wrong:**
v1.2 wired 7+ test suites into `npm run quality`: `format:check`, `lint`, `lint:md`, `docs:build`, `test:install`, `test:integration`, `validate:refs`, `validate:skills`, `test:orphan-refs`. Skipping any of these during v1.3 development masks regressions (e.g., orphan-refs would catch a stale `gm-agent-*` reference added in new docs).

**Why it happens:**
Partial test runs feel faster. `npm test` is shorter than `npm run quality`.

**How to avoid:**
1. Git hook via Husky (already configured per `package.json`): `pre-push` runs `npm run quality`. Already exists? Verify.
2. Each phase's exit criteria: `npm run quality` exits 0.
3. RETROSPECTIVE v1.2 established this pattern; enforce for v1.3.

**Warning sign (detection):**
PR merged with failing `quality` suite — should be blocked by branch protection.

**Phase to address:**
Every phase. Standing requirement.

---

### Pitfall 5-B: Missing CHANGELOG entry for BREAKING change (agent dir move)

**What goes wrong:**
v1.3 relocates `gomad/agents/` → `_config/agents/` — this is BREAKING for scripts that `cat _gomad/gomad/agents/pm.md`. v1.2's CHANGELOG has an explicit `### BREAKING CHANGES` section (lines 68-76). v1.3 must replicate.

**Why it happens:**
CHANGELOG authored hurriedly at release time. BREAKING callout forgotten.

**How to avoid:**
1. Release runbook item: *"CHANGELOG MUST include `### BREAKING CHANGES` section with migration instructions. Verify via `grep -A 5 'BREAKING CHANGES' CHANGELOG.md`."*
2. Wire into pre-publish check: minimal Node assertion script if semver bump contains breaking content.
3. Semver reconsideration: BREAKING change in a MINOR bump is technically valid under Key Decisions (v1.2 was `1.2.0` with a breaking launcher migration), but doc it explicitly so users aren't surprised.

**Warning sign (detection):**
User issue filed: "my script broke after upgrading from 1.2 to 1.3" → CHANGELOG search. If not found → this pitfall hit.

**Phase to address:**
Release phase.

---

### Pitfall 5-C: PROJECT.md / MILESTONES.md / STATE.md drift — one updated, others not

**What goes wrong:**
Four planning docs track milestone state: `PROJECT.md` (vision + active reqs), `MILESTONES.md` (historical record), `.planning/STATE.md` (current-milestone state), `.planning/REQUIREMENTS.md` (checkboxes). RETROSPECTIVE.md lesson: "Requirements checkbox drift is now a repeat offender" (v1.1 + v1.2 both closed with 0% checkbox sync).

**Why it happens:**
Manual multi-doc sync. Easy to update one, forget others.

**How to avoid:**
1. Accept the v1.2 RETROSPECTIVE conclusion: treat REQUIREMENTS.md checkboxes as bulk-flip-at-close bookkeeping. Don't pretend they'll stay in sync mid-flight.
2. Phase SUMMARY.md is the ground truth; derive other docs from it.
3. MILESTONES.md entry written ONCE at close, hand-curated (v1.2 RETROSPECTIVE lesson 3: concatenated accomplishments sections make bullet soup).
4. STATE.md explicitly marked "current-milestone" — obsoleted at milestone close.

**Warning sign (detection):**
Milestone close audit: does REQUIREMENTS.md match shipped reality? Does MILESTONES.md cross-reference PROJECT.md Validated section?

**Phase to address:**
Every phase transition (for STATE.md), milestone close (for MILESTONES.md bulk curation).

---

### Pitfall 5-D: Zero-new-deps policy silently violated

**What goes wrong:**
PROJECT.md line 25: *"Zero new runtime deps (v1.2 policy carried forward). Domain-skill search uses Node built-ins or existing deps."* Tempting to add `fuse.js` for fuzzy slug match in `gm-domain-skill` (Pitfall 4-G). Tempting to add `marked` for docs rendering. Each feels small; cumulatively expands tarball.

**Why it happens:**
Familiar dep reflex. Cost of writing 20 LOC Levenshtein feels high relative to `npm install fuse.js`.

**How to avoid:**
1. Lint check: after `npm install`, assert `package.json` `dependencies` hasn't grown. `test/test-deps-count.js`: `assert(Object.keys(pkg.dependencies).length === <pinned>)`.
2. PR review checklist: any new `require('<non-stdlib>')` → flag.
3. v1.2 precedent: local `escapeCsv` (3 LOC) instead of `csv-stringify/sync`. Same discipline for v1.3.

**Warning sign (detection):**
`git diff package.json | grep dependencies` in any v1.3 commit.

**Phase to address:**
Every phase, gated via test.

---

### Pitfall 5-E: Phase ordering — docs site ships before relocation → docs go stale same milestone

**What goes wrong:**
Natural instinct: build docs site first (feels like setup), then do relocation. Problem: docs content captures `gomad/agents/` examples. After relocation in a later phase, docs are stale BEFORE the milestone even ships.

**Why it happens:**
Phases feel parallel. They're not — docs depend on final shape.

**How to avoid:**
Explicit phase ordering:
1. **Relocation phase FIRST** (immediately after extract-the-constant prep).
2. **Story-enhancements phase** next (independent of relocation).
3. **Marketplace refresh** LATE (captures final skill list after story-enhancements).
4. **Docs site LAST** (captures all prior state).
5. **Release** after docs site.

Alternative: if docs site MUST ship early for timeline reasons, stub it with placeholders + a `## Known stale content` warning.

**Warning sign (detection):**
Docs phase starts before relocation phase → flag in phase-sequencing review.

**Phase to address:**
Roadmap creation (milestone planning).

---

### Pitfall 5-F: RETROSPECTIVE v1.2 CLI/workflow drift hits again

**What goes wrong:**
v1.1 and v1.2 both hit: `gsd-tools audit-open` misclassifies complete tasks, `gsd-sdk query milestone.complete` doesn't exist (should be `gsd-tools.cjs milestone complete`), `gsd-sdk query progress bar --raw` flaky. v1.3 will hit the same.

**Why it happens:**
Workflow docs reference CLI commands that aren't integration-tested.

**How to avoid:**
1. Don't fix gsd-tools in v1.3 (out of scope per PROJECT.md: GSD is dev tooling, not shipped product).
2. At milestone close, expect manual audit pass. Budget time.
3. If gsd-tools is consumed heavily during v1.3, upstream a fix separately.

**Warning sign (detection):**
First use of `gsd-tools audit-open` → if output has inconsistencies, do manual.

**Phase to address:**
Milestone close (expect friction, allocate time).

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Hand-curate marketplace.json skill list instead of generating | 30 min saved vs. writing generator | Every new skill requires manual addition; dead refs accumulate (already happened — BMAD paths still in file) | Never acceptable for v1.3+; generator is the fix |
| Hardcode `_gomad/gomad/agents/` in template instead of placeholder | 5 min saved on template | Every path change requires multi-file edit (Pitfall 1-A manifested this cost in v1.2) | Never acceptable; use placeholder |
| Swallow context.md parse errors silently in gm-create-story | 10 min saved vs. error-handling | User gets generic story, thinks context loaded (Pitfall 4-E) | Never acceptable |
| Ship KB content without license attribution | 15 min saved per pack | Legal exposure, DMCA risk (Pitfall 4-J) | Never acceptable |
| Deploy docs site without CNAME in `public/` | 5 min (relying on gh-pages branch CNAME) | Silent domain reversion (Pitfall 3-B) | Never acceptable |
| Skip upgrade test for v1.2→v1.3 relocation | 2 hours saved | User data loss on upgrade (Pitfall 1-C); repro is costly after ship | Never acceptable |
| Use `fuse.js` for fuzzy slug match | 20 LOC saved | Violates zero-new-deps policy (Pitfall 5-D) | Never — use manual Levenshtein |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Claude Code marketplace client | Use stale BMAD schema shape | Validate against current Claude Code plugin schema (Pitfall 2-A) |
| GitHub Pages custom domain | Rely on gh-pages branch CNAME | `CNAME` in `website/public/` (Pitfall 3-B) |
| Astro subdomain deploy | Inherit `base: '/repo'` from project-site template | `base: '/'` or unset (Pitfall 3-A) |
| Cleanup-planner for moves | Model as delete-then-write | Acknowledge move-semantics gap: snapshot with `was_modified` + tell user to review backup (Pitfall 1-C) |
| KB content reuse | Copy from OSS repos without license check | Attribute `source:` + `license:` frontmatter; re-author GPL content (Pitfall 4-J) |
| Skill lifecycle integration | Invoke gm-domain-skill at story-creation | Invoke at dev-story time for fresh retrieval (Pitfall 4-K) |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| KB grep over all `_config/kb/**` on every domain-skill call | Slow response, high token usage | Cache slug-to-file index at startup; grep only matched file | >20 KB packs; >500KB total |
| Context.md unbounded length feeds gm-create-story | Story creation slow, high token cost (Pitfall 4-A) | 1500-token budget in discuss output | First story with verbose discussion |
| Marketplace generator re-scans entire `src/` tree | Slow build | Cache mtimes, only re-generate on source change | With >100 skills |
| Docs site skill pages generated from source on every build | Slow `docs:build` | Astro content collections cache by default | With >50 skill files |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Shipping KB packs with unlicensed content | DMCA takedown, npm unpublish, legal exposure | Pitfall 4-J — enforce `source:` + `license:` frontmatter |
| `CNAME` lost on deploy, domain reverts | Users hit github.io URL, no HTTPS on custom domain | Pitfall 3-B — CNAME in `public/` |
| Docs site source maps leaked | Minor IP leak, bloat | Pitfall 3-F — disable sourcemap in production |
| Context.md YAML injection (if user-authored discuss output parsed) | Unlikely but: malicious frontmatter → parse failure | Strict YAML schema validation (Pitfall 4-E) |
| Cleanup plan deleting outside install root (symlink escape) | User data loss, v1.2 already caught this with D-32/33 | Existing `cleanup-planner.js` realpath containment — do NOT weaken for relocation edge cases |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Silent upgrade with no warning about agent dir move | User's customizations lost, confusion | Pitfall 1-C — preflight warning + explicit upgrade docs |
| "No match found" with no suggestions for typo'd slug | User gives up, thinks feature broken | Pitfall 4-G — Levenshtein "did you mean" |
| Doc site footer shows wrong version | User sees stale docs, trust erodes | Pitfall 3-C — embed version from package.json |
| Context.md malformed, story generated anyway | User thinks context loaded, story is generic | Pitfall 4-E — fail fast with clear error |
| No way to know if KB pack is stale | User follows outdated patterns | Pitfall 4-I — `last_reviewed` surfaced in output |

## "Looks Done But Isn't" Checklist

- [ ] **Agent dir relocation:** Constants extracted? (grep `gomad/agents` returns 0 non-changelog hits) — Pitfall 1-A
- [ ] **Agent dir relocation:** test:gm-surface body assertion added? (regex check for `_config/agents/` in launcher body) — Pitfall 1-B
- [ ] **Agent dir relocation:** v1.2→v1.3 upgrade test exists with `was_modified` assertion? — Pitfall 1-C
- [ ] **Agent dir relocation:** `verify-tarball.js` Phase 4 legacy-path grep added? — Pitfall 1-E
- [ ] **Agent dir relocation:** `docs/upgrade-recovery.md` shows BOTH old and new paths or is version-qualified? — Pitfall 1-F
- [ ] **Marketplace:** Every `plugins[].skills[].path` resolves to real SKILL.md? — Pitfall 2-B
- [ ] **Marketplace:** No duplicate skill paths across groups? — Pitfall 2-C
- [ ] **Marketplace:** All v1.3 new skills (gm-discuss-story, gm-domain-skill) present? — Pitfall 2-D
- [ ] **Marketplace:** `plugins[].version` equals `package.json` version? — Pitfall 2-E
- [ ] **Marketplace:** Schema validated against current Claude Code spec? — Pitfall 2-A
- [ ] **Docs site:** CNAME file in `website/public/`? — Pitfall 3-B
- [ ] **Docs site:** Asset URLs resolve post-deploy (200 OK)? — Pitfall 3-A
- [ ] **Docs site:** Version shown in footer matches published npm? — Pitfall 3-C
- [ ] **Docs site:** Skill pages generated from `SKILL.md`, not hand-typed? — Pitfall 3-D
- [ ] **Docs site:** `validate-doc-paths.js` grep for `gomad/agents/` returns 0? — Pitfall 3-E
- [ ] **Docs site:** No `.map` files in deployed `dist/`? — Pitfall 3-F
- [ ] **Story-enhancements:** gm-discuss-story output budget ≤1500 tokens enforced? — Pitfall 4-A
- [ ] **Story-enhancements:** gm-discuss-story ban list on generic questions in SKILL.md? — Pitfall 4-B
- [ ] **Story-enhancements:** Re-run behavior of gm-discuss-story specified (overwrite/append/abort)? — Pitfall 4-C
- [ ] **Story-enhancements:** `{planning_artifacts}` unset handling specified? — Pitfall 4-D
- [ ] **Story-enhancements:** gm-create-story fails fast on malformed context.md? — Pitfall 4-E
- [ ] **Story-enhancements:** Precedence rule specified (prompt > context)? — Pitfall 4-F
- [ ] **Story-enhancements:** gm-domain-skill has "did you mean" for typo slugs? — Pitfall 4-G
- [ ] **Story-enhancements:** gm-domain-skill ranking normalized by file length? — Pitfall 4-H
- [ ] **Story-enhancements:** Every KB pack has `last_reviewed` + `applies_to` frontmatter? — Pitfall 4-I
- [ ] **Story-enhancements (CRITICAL):** Every KB pack has `source:` + `license:` frontmatter with license-compat verification? — Pitfall 4-J
- [ ] **Story-enhancements:** gm-domain-skill integration point documented (story-time vs dev-time)? — Pitfall 4-K
- [ ] **Cross-cutting:** `npm run quality` green on every phase exit? — Pitfall 5-A
- [ ] **Cross-cutting:** CHANGELOG has `### BREAKING CHANGES` section with migration steps? — Pitfall 5-B
- [ ] **Cross-cutting:** Zero new runtime deps in package.json? — Pitfall 5-D
- [ ] **Cross-cutting:** Phase order is: relocation → story-enhancements → marketplace → docs site → release? — Pitfall 5-E

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| 1-A (path constant not extracted, late-caught) | MEDIUM | Extract constant in a hotfix plan; grep-sweep; re-verify all hits; re-run test:gm-surface |
| 1-C (user data loss on upgrade) | HIGH | Point user to `_gomad/_backups/<ts>/` — the snapshot was taken; user must `cp -R` from backup to new `_config/agents/` location manually |
| 2-B (dead marketplace refs) | LOW | Run generator, commit the diff, republish (marketplace.json not in `files:` allowlist — may not need npm republish) |
| 3-B (CNAME lost, domain reverted) | LOW | Re-add CNAME to `website/public/`, redeploy; DNS propagation ~5min |
| 3-C (docs drift from npm) | LOW | Manual `docs:build && docs:deploy` — next release will refresh |
| 4-J (unlicensed KB content shipped) | HIGH | Pull affected KB files; publish patch release; review all KB content for compliance; potential public notice if source licensing was serious (GPL) |
| 5-B (missing BREAKING callout in CHANGELOG) | LOW | Append to CHANGELOG, no republish needed (it's Git-tracked, users can re-read) — but consider a pinned GitHub issue noting the breakage |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| 1-A Path constant drift | Relocation Phase, Plan 01 (before any edits) | `grep -rn "gomad/agents" tools/ src/` returns 0 non-changelog hits |
| 1-B test:gm-surface body assertion | Relocation Phase, Plan 02 (test first, then code) | Intentional regression → test:gm-surface fails |
| 1-C v1.2→v1.3 upgrade test | Relocation Phase, Plan 02 | Simulated upgrade preserves `was_modified` flag |
| 1-D Hardcoded `_gomad` strings | Relocation Phase, Plan 03 | Lint grep for `'_gomad/'` in installer code |
| 1-E verify-tarball Phase 4 | Relocation Phase, Plan 04 (release gate) | `npm run test:tarball` fails on stray `gomad/agents/` |
| 1-F upgrade-recovery.md stale paths | Docs-Site Phase | Doc-link validator shows both paths |
| 2-A Marketplace schema | Marketplace Phase, Plan 01 | test-marketplace-schema.js green |
| 2-B Marketplace dead refs | Marketplace Phase, Plan 01 | test-marketplace-paths.js green; generator output matches committed |
| 2-C Duplicate listings | Marketplace Phase, Plan 01 | Dedup assertion in test |
| 2-D Missing new v1.3 skills | Marketplace Phase (LAST, after skill additions) | Generator auto-includes new skills |
| 2-E Semver mismatch | Marketplace Phase | Equality assertion in test |
| 3-A Astro base config | Docs-Site Phase, Plan 01 | Post-deploy asset 200 OK |
| 3-B CNAME lost | Docs-Site Phase, Plan 01 | `CNAME` file exists in `public/` |
| 3-C Manual deploy skipped | Release Phase | Version-embed in footer matches npm |
| 3-D Hand-authored docs | Docs-Site Phase, Plan 01 (content plumbing first) | Regenerate on source change |
| 3-E Docs stale to relocation | Docs-Site Phase (AFTER Relocation) | validate-doc-paths.js in quality |
| 3-F Source maps | Docs-Site Phase, Plan 03 (deploy) | No `.map` in deployed dist |
| 3-G No index | Docs-Site Phase, Plan 02 (content) | MVP index + generated pages |
| 4-A Context.md bloat | Story-Enhancements Phase, gm-discuss-story plan | Fixture size test |
| 4-B Abstract questions | Story-Enhancements Phase, gm-discuss-story plan | Fixture output review |
| 4-C Re-run idempotency | Story-Enhancements Phase, gm-discuss-story plan | Manual re-run test |
| 4-D Path resolution | Story-Enhancements Phase, discuss + create-story plans | Placeholder fixture test |
| 4-E Malformed context.md | Story-Enhancements Phase, gm-create-story plan | Malformed fixture → fast fail |
| 4-F Precedence | Story-Enhancements Phase, gm-create-story plan | Conflict fixture → prompt wins with warning |
| 4-G Slug typos | Story-Enhancements Phase, gm-domain-skill plan | Typo fixture → "did you mean" |
| 4-H Longest-file ranking | Story-Enhancements Phase, gm-domain-skill plan | 2-file ranking fixture |
| 4-I KB pack version drift | Story-Enhancements Phase, KB seed plan | Every pack has `last_reviewed` |
| 4-J IP/licensing (CRITICAL) | Story-Enhancements Phase, KB seed plan (FIRST step) | validate-kb-licenses.js green; legal review at close |
| 4-K Wrong integration timing | Story-Enhancements Phase, gm-domain-skill plan | Integration test at dev-story time |
| 5-A Quality gate | Every Phase | `npm run quality` exits 0 |
| 5-B BREAKING CHANGELOG | Release Phase | Grep CHANGELOG for `BREAKING CHANGES` |
| 5-C Planning docs drift | Every Phase Transition + Milestone Close | Accept bulk-flip pattern (v1.2 lesson) |
| 5-D New deps | Every Phase | `git diff package.json` → no change to dependencies |
| 5-E Phase ordering | Roadmap creation | Docs site is LAST phase before release |
| 5-F gsd-tools drift | Milestone Close | Allocate time for manual audit |

## Sources

- `tools/installer/core/cleanup-planner.js` — buildCleanupPlan semantics (Pitfall 1-C)
- `tools/installer/ide/templates/agent-command-template.md` line 16 — hardcoded path (Pitfall 1-A, 1-D)
- `tools/installer/ide/shared/path-utils.js` — existing `GOMAD_FOLDER_NAME` constant pattern (Pitfall 1-A)
- `tools/verify-tarball.js` Phase 2 + Phase 3 — existing grep-clean infrastructure (Pitfall 1-E)
- `test/test-gm-command-surface.js` Phase C lines 224–240 — frontmatter-only assertions (Pitfall 1-B)
- `.claude-plugin/marketplace.json` — current BMAD-era content, dead refs (Pitfall 2-B, 2-E)
- `docs/upgrade-recovery.md` line 19 — `gomad/agents/pm.md` in backup tree example (Pitfall 1-F)
- `CHANGELOG.md` v1.2 section lines 68-76 — BREAKING CHANGES template (Pitfall 5-B)
- `.planning/RETROSPECTIVE.md` v1.1 Lessons 1-5 — checkbox drift, sweep gaps, CLI drift (Pitfalls 5-C, 5-F)
- `.planning/RETROSPECTIVE.md` v1.2 Lessons 1-7 — zero-new-deps discipline, de-risk patterns, dual-sided gates, word-boundary guards (Pitfalls 5-D, 5-E; test pattern for 1-E)
- `.planning/MILESTONES.md` — v1.1 + v1.2 shipped scope, carry-forward constraints
- `.planning/PROJECT.md` lines 22-26 — v1.3 constraints (installRoot, zero-deps, phase numbering)
- `package.json` scripts section — `quality`, `test:tarball`, `test:gm-surface` composition (Pitfall 5-A)

---
*Pitfalls research for: GoMad v1.3 milestone (Marketplace + Docs Site + Agent Relocation + Story Enhancements)*
*Researched: 2026-04-24*
*Confidence: HIGH — grounded in direct file reads of the codebase, not web search; prior-milestone lessons carried forward per RETROSPECTIVE.md*
