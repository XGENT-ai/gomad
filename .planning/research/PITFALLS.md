# Pitfalls Research — GoMad v1.2

**Domain:** Agent → slash-command migration, copy-only installer with manifest-tracked upgrade cleanup, PRD content refinement for coding-agent consumers
**Researched:** 2026-04-18
**Confidence:** HIGH for tool/installer pitfalls (direct code evidence), MEDIUM for Claude Code behavioral pitfalls (official docs retrieved live, but two contradictory GitHub issues), MEDIUM for PRD-refinement pitfalls (derived from current skill structure)

**Reading order:** The ordering below is by *blast radius if ignored* — Critical pitfalls can ship broken, Moderate are usually caught in QA, Minor are polish. Phase-to-Pitfall Mapping at the end is the roadmap's consumption point.

---

## Critical Pitfalls

### Pitfall 1: `/gm:agent-*` subdirectory namespace silently doesn't work on the user's Claude Code version

**What goes wrong:**
User installs v1.2, runs `/gm:agent-pm`, nothing happens. No error, no autocomplete, no fallback to another command. The files at `.claude/commands/gm/agent-pm.md` are on disk but unreachable.

**Why it happens:**
Subdirectory-based slash-command namespacing in Claude Code has a turbulent history:
- Issue [#2422](https://github.com/anthropics/claude-code/issues/2422) (closed "not planned") documents that `.claude/commands/<dir>/<name>.md` → `/user:<dir>:<name>` *does not work* on v1.0.31
- Issue [#44678](https://github.com/anthropics/claude-code/issues/44678) (opened 2026-04-07, still open) re-requests the feature with the `/dir:name` syntax the user chose
- [The live docs as of 2026-04-18](https://code.claude.com/docs/en/slash-commands) explicitly describe `.claude/commands/db/migrate.md` → `/db:migrate` as working

The feature appears to have shipped very recently (between April 7 and April 18, 2026) or the docs are ahead of the implementation. Either way, users on older Claude Code versions will find the commands *silently* non-functional. And unlike the `gm-*` skills which are discoverable via `/` menu autocomplete, invalid-subdirectory commands don't even appear in autocomplete — there is no user-facing failure signal.

**How to avoid:**
- Require a minimum Claude Code version in installer messaging and `README` (research the exact version that shipped namespacing — likely the April 2026 release). Gate the install with a check: `claude --version`-style detection isn't guaranteed possible from the installer, so at minimum add a pre-flight note.
- Provide a **fallback flat name** per agent in addition to the namespaced file — e.g., ship both `.claude/commands/gm/agent-pm.md` AND `.claude/commands/gm-agent-pm.md` (latter invoked as `/gm-agent-pm`) during a deprecation window. Users on older CC versions get the flat one; users on new versions get both, with the namespaced one preferred (docs say skill > command if same name, but flat-command vs namespaced-command of the same agent is not a conflict).
- Add an E2E test that does NOT rely on Claude Code invocation — test only the on-disk layout. A "does it actually resolve?" test requires a live Claude Code process in TTY, which we already established (from v1.1 E2E) is impractical.
- Treat the feature as **LOW confidence until proven** — call it out in `CHANGELOG.md` as "requires Claude Code ≥ X.Y".

**Warning signs:**
- Early-adopter report "I ran `/gm:agent-pm` and Claude asked me what I meant" or "the command isn't in my `/` menu"
- `/` autocomplete shows flat `/gm-agent-pm`-style commands but not the namespaced `/gm:agent-pm` form
- CI on GitHub Actions uses a pinned or older CC CLI version that behaves differently from local dev

**Phase to address:**
Phase 1 (research/planning) — validate namespacing works today on current CC before committing to the `/gm:agent-pm` syntax. Phase 2 (command migration) — implement the fallback-flat-name safety net. Phase 5 (verification/release) — document the minimum CC version.

---

### Pitfall 2: Manifest-driven cleanup deletes user files because manifest lies, is stale, or is mis-parsed

**What goes wrong:**
On re-install, installer reads `_gomad/_config/files-manifest.csv` to know what to remove, then writes fresh files. If the manifest contains a path that the user has hand-edited to hold their own work, or if a CSV parse error returns bogus paths, or if the install target was relocated and the manifest points into the *previous* location, `fs.remove` deletes real work. Unlike v1.1's current approach — which backs up custom files detected by hash-diff against the manifest — the proposed v1.2 flow *trusts the manifest as the deletion list*.

**Why it happens:**
Several plausible causes:
1. **CSV quoting drift.** The current writer (`manifest-generator.js` line 642) emits `"type","name","module","path","hash"` with naive `"..."` wrapping but the reader (`installer.js` line 620-632) hand-rolls CSV parsing with a toggle-state quote flag. A path containing a literal quote, or CRLF injected by Windows editors, or a BOM prepended by Excel, will parse incorrectly — and incorrect parse produces paths that either (a) miss the file that should be removed (orphans lingering) or (b) point at a neighbor directory entry with catastrophic rm consequences.
2. **Path-with-spaces.** Paths like `_gomad/gomad/What I'm Building.md` (yes, apostrophes; CSV rules for escaping single and double quotes differ) break the hand-rolled parser.
3. **Absolute-vs-relative ambiguity.** The manifest stores paths *relative to* `gomadDir`, but `readFilesManifest` reconstructs absolute paths by `path.join(gomadDir, entry.path)`. If a malformed entry has a leading slash, on POSIX `path.join('/foo', '/bar/baz')` returns `/bar/baz` — traversal outside `_gomad/`.
4. **Manifest inherited from a different install location.** User moves `_gomad/` to a new project. Manifest still lists paths relative to old dir; cleanup tries to delete ghosts, possibly with errors that are swallowed.
5. **User edited manifest by mistake** (opened it in Excel which reformatted dates, re-saved; or git merge conflict).
6. **Hashes missing from old manifest.** Existing code has a `manifestHasHashes` flag for backward-compat with v1.0-era manifests. If hashes are missing we can't detect modifications — and the proposed v1.2 upgrade-cleanup flow needs hashes to make "safe to delete" decisions.

**How to avoid:**
- Switch from hand-rolled CSV to `csv-parse/sync` (already a dependency; already used in `manifest-generator.js` for reading agent manifest). Validate each row has the expected column count; reject and log the manifest as corrupt if not.
- **Require a BOM/CRLF normalization pass** on read: strip leading U+FEFF and normalize `\r\n` → `\n`.
- Enforce **path containment**: before any `fs.remove(pathJoin(gomadDir, entry.path))`, verify `fs.realpath(target)` is a prefix-descendant of `fs.realpath(gomadDir)`. Refuse to remove otherwise. This defeats absolute-path and `../` shenanigans.
- Enforce **hash match before delete**. If manifest has a hash, compute current hash; if it differs, the file is user-modified — rename to `.bak` rather than delete (mirrors v1.1's existing modified-files-as-.bak pattern at `installer.js` line 397). If hash missing, fall through to v1.1 behavior (detect custom files, back up, restore).
- Treat a **corrupt manifest as a recoverable failure**: log `MANIFEST_CORRUPT`, skip the cleanup phase, proceed with install (idempotent copy-over), leave residual files — do NOT assume "corrupt manifest means no files to keep" and mass-delete.
- Fail-safe **dry-run mode** for upgrades: `gomad install --dry-run` prints "would delete N files: …" without touching disk. Consider making it default-visible for upgrades ("Proceed? [y/N]") when >N files would be removed, N=20 or similar.
- **Atomic swap** where practical: stage new files in `_gomad.new/`, validate, then rename. Full atomic swap is impractical for partial updates, but the *manifest file itself* should be written via tempfile+rename so a partial write can't leave a truncated manifest that parses as "zero files installed" (which would be catastrophic next run).
- Keep a **rotating backup** `_gomad/_config/files-manifest.csv.1` (previous install's manifest) so we can detect "are we about to delete something that was never ours?".

**Warning signs:**
- User report "after `gomad install --update` my `planning/` notes disappeared"
- Test that writes a malformed CSV (missing closing quote, embedded newline, BOM) and confirms installer handles gracefully
- Stack trace mentions `ENOENT` with absolute path outside the project root
- Manifest contains zero rows after a successful install (sign of a swallowed write error)

**Phase to address:**
Phase 3 (installer rework) — hardening. **This is the single highest-severity pitfall in v1.2** because it can destroy user work, and the current installer design has no path-containment guard. Design docs for this phase must include an explicit "safety" subsection.

---

### Pitfall 3: Symlinked existing installs break silently or keep working (wrong) after v1.2 upgrade

**What goes wrong:**
v1.1 installs create relative symlinks: `.claude/skills/<canonicalId>` → `../../_gomad/<module>/<path>` (see `_config-driven.js` line 171, `fs.ensureSymlink`). A developer or user who installed from a git checkout may have _gomad/ symlinked somewhere, or individual skills symlinked from the checkout for live-edit during skill development.

Two failure modes:
1. **Symlink leftovers persist.** v1.2 copy-only installer writes directory `.claude/skills/<id>/` containing real files. If the old symlink at the same path isn't explicitly removed, `fs.ensureDir(skillDir)` inside a symlink may traverse the link and write into the *source* tree (polluting the git checkout). If `fs.copy` is used naively, it may refuse (EEXIST) or clobber the target of the symlink.
2. **Silent "works" via dangling link.** Migration removes `_gomad/` from the user's repo during upgrade but leaves the symlink in `.claude/skills/<id>`. User's IDE now loads nothing (dangling link) but doesn't fail loudly — just "skill not found" in Claude Code's `/` menu.

Additionally, v1.1's cleanup at `_config-driven.js` line 309 catches `gomad*` at target root, but skill *directories* at `.claude/skills/<canonicalId>/` don't start with `gomad` — they start with `gm-` (or `gomad-quick-*`, or arbitrary canonicalIds). The existing `fs.remove` of `skillDir` on line 166 only works because the skill directory IS a known canonicalId already being re-created. If a canonicalId *renames* across versions (which v1.2 does — `gm-agent-pm` → `gm:agent-pm` command), the old `gm-agent-pm/` skill dir becomes an **orphan** that the install loop never touches.

**Why it happens:**
- Developer dogfooded v1.1 from a git checkout; installed via our dev-mode script (if one exists) or manually symlinked; now v1.2 sees an existing install they want to upgrade.
- Users who ran `npm link` or `npm install -g` and then pointed a project at their cloned `_gomad/` via symlink.
- `fs.ensureSymlink` vs `fs.copy` race: `fs.ensureSymlink` is a no-op if the link exists with the right target; but `fs.copy` into an existing symlinked directory has different semantics — it follows the link by default.

**How to avoid:**
- **Explicit symlink detection step during upgrade.** Before touching any target path: `const stat = await fs.lstat(target); if (stat.isSymbolicLink()) { /* unlink, then proceed */ }`. Apply to both `.claude/skills/<id>/` entries and `_gomad/` itself.
- **Remove orphaned skill directories** by comparing the new `skill-manifest.csv` canonicalId set against what's currently at `<target_dir>/*` — anything that starts with `gomad` or exists-but-isn't-in-manifest gets removed. This addresses the v1.1 `gm-agent-*` → v1.2 renamed-away-skill orphan problem. (v1.1 already removes files starting with `gomad`; this needs to extend to `gm-*` skill *directories*, OR the skill-manifest.csv needs to drive orphan detection directly.)
- **Do not use `fs.copy` on a target that is a symlink.** Always `fs.remove` first, then `fs.copy` or `fs.ensureDir` + write files. `fs.copy`'s default behavior of following links is a foot-gun here.
- Changelog/RELEASE NOTES should warn v1.1 users: "If you installed via symlink from a git checkout, run `gomad uninstall` and then re-install." Provide an explicit `gomad uninstall` that knows about symlinks.
- E2E test: set up a pre-v1.2 state with symlinks, run upgrade, assert real files present and no link-following pollution of sources.

**Warning signs:**
- After upgrade, `.claude/skills/<id>` is a symlink (use `ls -la` in QA)
- User's source-of-truth `src/gomad-skills/` files change unexpectedly after `gomad install` (symlink traversal polluted source)
- Skills invoked by Claude Code return "file not found"

**Phase to address:**
Phase 3 (installer rework). Must be done in the same phase as the copy-only switch — cannot be deferred without leaving users stuck.

---

### Pitfall 4: Orphan references to `gm-agent-*` linger across source/tests/docs/manifests after the rename sweep

**What goes wrong:**
Like v1.1 taught us (see v1.1 issues-resolved: "`validate-skills.js NAME_REGEX` hardcoded `bmad-` prefix — updated during Phase 2 rename" and "`findBmadDir` function references in additional files beyond Plan 04-01 scope — renamed"), a rename sweep has a **long tail** of missed references. For v1.2, the targets are:

- `src/gomad-skills/module-help.csv` — contains `gm-agent-tech-writer` as the `skill` column for multiple capability codes (WD, US, MG, VD, EC). These rows will need to be either renamed or restructured (since the replacement is a command, not a skill). [Verified: `grep` found 4+ rows].
- `docs/reference/agents.md` and `docs/zh-cn/reference/agents.md` — still say `` `gomad-agent-dev` `` etc. Users reading docs will copy-paste command names that don't exist.
- `docs/reference/commands.md`, `docs/tutorials/getting-started.md` — reference skill-form agent names in example code.
- The 7 `gm-agent-*/skill-manifest.yaml` files contain `name: gm-agent-*` and `module: gomad` — need to decide: delete these directories entirely (since they become commands), or keep them as skills-that-bootstrap-the-command, or keep as bridge for IDEs that don't support slash commands (e.g., Cursor uses `.cursor/skills` with no command concept).
- `tools/installer/ide/shared/path-utils.js` has `toDashName`, `toDashPath`, `parseDashName` — all assuming `gomad-agent-*` flat naming. The path-utils logic still needs to exist for *other IDEs* but not for Claude Code.
- `tools/installer/ide/shared/agent-command-generator.js` — its whole purpose is generating `gomad-agent-*.md` flat launchers. For Claude Code it should produce `gm/agent-*.md` namespaced files instead.
- `.planning/PROJECT.md`, `.planning/MILESTONES.md`, `.planning/quick/260416-*-fix-gm-agent-dev-skill-*` — historical references that should be left alone but *documented as archived naming*.
- `src/gomad-skills/4-implementation/gm-sprint-agent/workflow.md` and `src/gomad-skills/4-implementation/gm-epic-demo-story/SKILL.md` reference agent names — verify these are behavioral references (they invoke the persona) vs presentational (doc links).
- `src/core-skills/gm-distillator/resources/distillate-format-reference.md` — distillate format reference, probably historical example, but check.

Downstream, user-visible breakage:
- A skill step like "Invoke the `gm-agent-pm` skill" (see `gm-create-prd/steps-c/step-02b-vision.md` line 104: "Invoke the `gm-advanced-elicitation` skill" — same pattern) may say "Invoke the `gm-agent-pm`". Post-migration this is ambiguous: there's a command now, not a skill. The instruction text to the LLM should say "Invoke the `/gm:agent-pm` slash command" or, more robustly, "Embody the PM persona from `.claude/commands/gm/agent-pm.md`".

**Why it happens:**
- Rename sweeps rely on a text-search regex; `gm-agent-` occurs in both machine-checked code paths (validate-skills.js, path-utils.js) and human-written documentation — the former error when the regex updates, the latter silently lingers.
- Documentation in `zh-cn/` trails English docs by convention; easy to update English and forget the Chinese translation.
- Capability tables in agent persona files (see `gm-agent-pm/SKILL.md`) list capabilities *by skill name*. Those tables are semantic, not pattern-matched by ripgrep.
- Tests assert specific names; fixture files contain specific names.

**How to avoid:**
- Use a **catalogue of locations** as the sweep's source of truth. Run `grep -rn 'gm-agent-\|gomad-agent-'` at the start and end of the phase. Final list must be 0 matches (or explicitly-annotated allowlist of historical/archival hits).
- **Distinguish behavioral vs presentational references.** Behavioral (code, skills that invoke agents as a menu action, workflow steps that say "load the PM persona") must migrate to the new command form. Presentational (docs explaining what the system is) must use the new form in marketing copy. Historical (`.planning/`, changelog, old milestone docs) must be left untouched and labeled as historical.
- **Update the tests alongside the rename.** v1.1 hit the `validate-skills.js NAME_REGEX` issue; v1.2 has an equivalent landmine in `path-utils.js` regex-based parsing (`parseDashName` assumes `gomad-agent-*` flat form).
- **Update docs/zh-cn in the same commit** as docs/en, not a later catch-up PR.
- **Consider what to do with the 7 `gm-agent-*` directories on disk.** Options: (a) delete entirely and replace with command files; (b) keep as compat shim for non-CC IDEs; (c) keep as internal reference data that the command file loads. Choice (b) is cleanest for multi-IDE support but forks the story; choice (a) is cleaner but breaks Cursor/Codex users.

**Warning signs:**
- User runs `gomad install` with Cursor (not Claude Code) and gets zero agents.
- `grep -n gm-agent- docs/` returns any matches after phase completion.
- A skill tells the user "run the `gm-agent-pm` skill" and Claude Code searches `.claude/skills/gm-agent-pm/` → 404.
- Chinese-language user reports broken docs.

**Phase to address:**
Phase 2 (rename sweep / content migration). Explicit success criterion: zero `gm-agent-` matches in non-historical files after phase completion.

---

### Pitfall 5: `_preserveModules` and `detectCustomFiles` logic assumes legacy file locations that v1.2 changes

**What goes wrong:**
The current `installer.js` has intricate logic (lines 660-766) to preserve user customizations across upgrades — it walks `gomadDir`, compares every file against `files-manifest.csv` hashes, and classifies files as `customFiles` (user-added) vs `modifiedFiles` (gomad-owned but user-edited). v1.2 adds slash-command files at `.claude/commands/gm/*` which are *outside* `gomadDir` — they live in `.claude/commands/` under the *project root*. 

Two problems:
1. **Scope confusion.** The scan only covers `gomadDir` (`_gomad/`). Slash command files at `.claude/commands/gm/` are unmanaged by `detectCustomFiles`. If a user hand-edits `.claude/commands/gm/agent-pm.md` (quite plausible — "I want John to speak in French"), the next `gomad install` blows it away without detection-or-backup logic. v1.1's cleanup pattern at `_config-driven.js` line 305 iterates `targetPath` entries and removes any starting with `gomad` — it will happily remove the whole `gm/` subdirectory if we extend that pattern, or leave it entirely if we don't.
2. **Preservation asymmetry.** Inside `_gomad/` modifications are preserved as `.bak`; inside `.claude/commands/gm/` they're silently overwritten. Users will notice the inconsistency and feel gaslit.

Additionally, the existing `_preserveModules` codepath (`installer.js` line 273) preserves modules the user didn't re-select. This has no meaning for slash commands — but its intent (don't nuke unrelated work) does.

**Why it happens:**
Slash commands are a *new kind of artifact* for the installer. Existing preserve/detect logic was designed for the single-root `_gomad/` tree.

**How to avoid:**
- Extend `files-manifest.csv` to include IDE-tree files (`.claude/commands/gm/*`, `.claude/skills/*`, and platform equivalents). Track them with hashes. Apply the same `custom/modified → backup` logic to those files.
- Alternatively, treat **everything under `.claude/commands/gm/`** as gomad-owned and document it: "Do not hand-edit this directory; changes are lost on upgrade. To customize, edit the source in `_gomad/gomad/commands/gm/` and reinstall." (The source may need to exist for this model to work; currently it doesn't.)
- Add a **pre-upgrade diff**: before cleanup, enumerate all files the installer is about to clobber; if any have changed from their manifest hash, list them to the user with a confirmation prompt. This is an explicit opt-in to potentially destructive upgrade.
- Document the model clearly: "Files in `_gomad/` can be edited; files in `.claude/commands/gm/` cannot. Customization goes in `_gomad/_memory/` sidecars."

**Warning signs:**
- User complaint: "I customized the PM agent's greeting, upgrade wiped it"
- QA scenario: edit `.claude/commands/gm/agent-pm.md`, run `gomad install`, verify edit is either preserved as `.bak` or at minimum loudly reported

**Phase to address:**
Phase 3 (installer rework) — this needs to be solved same-phase as the copy-only switch.

---

### Pitfall 6: PRD refinement strips context that downstream skills (`gm-validate-prd`, `gm-create-architecture`, `gm-create-epics-and-stories`) structurally depend on

**What goes wrong:**
v1.2 plans to drop human-founder framing — "why now?", time windows, business/operational metrics — from `gm-create-prd` and `gm-product-brief`. But `gm-validate-prd` has 13 step files that check specific PRD sections. If a section is removed from creation but still validated, the validator flags it missing. Conversely, `gm-create-architecture` discovers PRD content from `{planning_artifacts}/*prd*.md` and reads "ALL discovered files completely" (see `gm-create-architecture/steps/step-01-init.md` line 77). The architecture workflow then draws on "vision" and "product differentiator" content in the PRD — content that may be thinned in v1.2.

Specific risks identified by inspection:
- `gm-validate-prd/steps-v/step-v-04-brief-coverage-validation.md` maps "brief content to PRD sections and identif[ies] gaps" — if the brief's business-metrics section is dropped but the PRD preserves them, or vice versa, this check either flags spurious gaps or false-passes.
- `gm-validate-prd/steps-v/step-v-07-implementation-leakage-validation.md` scans PRDs for tech names and flags "leakage." If v1.2 "sharpens dev-ready requirements," the refinement may intentionally include tech names that the validator will then reject.
- `gm-create-prd/steps-c/step-02b-vision.md` asks "Why now?" as one of three "deeper vision" questions (line 78). Removing it changes the document, which affects downstream semantic expectations.
- `gm-agent-pm/SKILL.md`'s menu lists `gm-edit-prd` and `gm-check-implementation-readiness` — readiness checker presumably has its own assumptions about PRD structure.

Risk: we refine the PRD content but don't refine the validator + architecture + readiness skills that consume it. Result: a new PRD passes creation but fails validation, or validation fails to catch genuine issues because the rubric no longer matches the document.

**Why it happens:**
The v1.2 scope frames PRD refinement as a content task (change the create workflow's prompts), but PRDs are inputs to a **pipeline**. Content changes are API changes for every downstream consumer.

**How to avoid:**
- Treat PRD template as a schema. Enumerate every downstream consumer (`gm-validate-prd`, `gm-create-architecture`, `gm-create-epics-and-stories`, `gm-check-implementation-readiness`, `gm-edit-prd`, `gm-correct-course`). For each, identify which PRD sections it references or expects.
- For each dropped section: either (a) also drop the validator check, or (b) make the validator's check conditional on the section existing, or (c) stage the change across phases — v1.2 drops the section in the creation flow, v1.3 removes the validator check.
- For each new/amplified section: ensure downstream skills consume it. "Aggressive MVP scope" content needs a place to land in the architecture workflow.
- Write an integration test: generate a PRD with v1.2 `gm-create-prd`, run `gm-validate-prd` against it, require all validations to pass (or be intentionally skipped).
- Keep validator backward-compatible: mark dropped sections as "optional — skip if absent."

**Warning signs:**
- User creates a PRD with v1.2, runs `VP` (validate PRD) from the PM menu, gets "missing business metrics" error
- Architecture workflow asks "what's the vision?" and finds the PRD doesn't answer (the user already answered it but the new PRD doesn't capture it)
- `gm-check-implementation-readiness` reports "misalignment" between artifacts that are both internally consistent

**Phase to address:**
Phase 4 (PRD refinement). Explicit acceptance criteria: downstream pipeline (`CP → VP → CA → CE → IR`) runs clean against a sample project using v1.2 templates.

---

### Pitfall 7: `.claude/commands/` in the dev repo gets polluted and committed, violating "installer-produces-output-not-repo-ships-output"

**What goes wrong:**
During v1.2 development, a contributor working on the slash-command migration tests the commands locally by running `gomad install` in the gomad git checkout itself. The installer writes `.claude/commands/gm/agent-pm.md` et al into the *dev repo's* `.claude/commands/`. They forget to `.gitignore` it (or it's already committed because `/gsd/` is already tracked there), and the files ship in the tarball OR at least pollute PRs.

**Why it happens:**
- `.claude/commands/gsd/` is already committed (dev tooling for GoMad contributors).
- Installer's default target is cwd, which during dev testing is the gomad repo.
- `package.json` `files` allowlist does NOT include `.claude/` — so strictly speaking the tarball is safe. But `git status` and code review still show polluted diffs.
- If a contributor ever *adds* `.claude/` to files allowlist (maybe because they also want to ship `.claude/settings.json` or similar), this becomes a live ship-it problem.

**How to avoid:**
- Add `.claude/commands/gm/` to `.gitignore` of the dev repo (while keeping `.claude/commands/gsd/` tracked). Explicit negative-match: `.claude/commands/*` with `!.claude/commands/gsd/`.
- Installer should emit a warning when target dir is the gomad source repo itself (detect via presence of `src/gomad-skills/` in cwd) and refuse to install without `--self` flag. Keeps contributors from accidentally self-installing.
- Tarball verification script (`verify-tarball.js` from v1.1) must reject any `.claude/commands/` content in the tarball.

**Warning signs:**
- `git status` shows new `.claude/commands/gm/*.md` files after running a local install test
- PR diffs include `.claude/commands/gm/` file changes
- `npm pack` output lists `.claude/commands/gm/`

**Phase to address:**
Phase 2 (command migration) — `.gitignore` update when command-gen is implemented. Phase 5 (verification) — tarball check extended.

---

## Moderate Pitfalls

### Pitfall 8: Colon-in-filenames is Windows-hostile; the `gm/` directory approach is correct but must be preserved against regressions

**What goes wrong:**
The `/gm:agent-pm` invocation uses a colon as namespace separator, but the *file* is at `.claude/commands/gm/agent-pm.md` (subdirectory, not `gm:agent-pm.md`). This is correct and intentional — Windows FAT/NTFS forbid `:` in filenames (alternate data streams). A regression would be if someone "simplified" the writer to emit flat `gm:agent-pm.md` files (mirroring the invocation). The current code (`path-utils.js toUnderscorePath` comment: "underscore format (Windows-compatible)") shows the team already hit this lesson once.

**Why it happens:**
Intuition: "invocation is `/gm:agent-pm`, so the file should be named `gm:agent-pm.md`." Wrong — Claude Code's docs clearly describe subdirectory = namespace.

**How to avoid:**
- Unit-test command file generation to assert files are *directories*, not colon-embedded filenames.
- Document in `path-utils.js` (or equivalent command-gen module) why we use subdirectories.
- CI job on Windows runner to confirm installer works (we likely don't have this; v1.1 tests presumably ran on macOS).

**Warning signs:**
Windows user reports: "`gomad install` exits with `EINVAL` on my machine."

**Phase to address:**
Phase 2 (command migration). Add Windows-path test case.

---

### Pitfall 9: Permission bits and executable files lost on copy; or opposite — installed files get the source's `u+x` erroneously

**What goes wrong:**
Switching from symlink to copy changes the semantics of file permissions. `fs-extra`'s `fs.copy` by default *preserves* mode bits. Two failure modes:
1. **Missing `u+x`.** If any installer-consumed script (e.g., `tools/installer/gomad-cli.js` is `0755` in the repo) gets copied without preserving the executable bit, the consumer's `gomad` binary fails to execute.
2. **Unwanted `u+x`.** A source file marked `0755` in the repo (e.g., `src/gomad-skills/*/scripts/foo.sh` — if any exist) gets copied with that bit, which on shared filesystems (Docker mounts, umask 002) could be a security concern or lint concern.

Less critical: **symlinks in source**. If `src/` contains any internal symlinks, `fs.copy` follows them by default. If there's a `fixtures/` symlink to a shared fixture, copy duplicates it rather than linking — increases install size.

**Why it happens:**
Symlinks don't modify file attributes; copies do. Changing link→copy inherits source attributes that the user may not want.

**How to avoid:**
- Audit source tree for any `0755` files that should not be executable post-install: `find src -perm -u+x -type f`.
- Explicitly set mode bits on copy where determinable: config files, data files → `0644`; scripts → `0755`.
- Use `fs-extra`'s `preserveTimestamps: true` only if we care (usually we don't; fresh install date is fine).
- E2E test: after install, `find _gomad -perm -u+x -type f` should return a known allowlist (probably empty; no skill needs exec bit).

**Warning signs:**
- Post-install, `gomad` command fails "Permission denied"
- Security scanner flags installed files with unexpected exec bits

**Phase to address:**
Phase 3 (installer rework). Include a permissions test.

---

### Pitfall 10: File-watching and dev loops that relied on symlink live-edit break for contributors and users

**What goes wrong:**
Developers working on GoMad skills (our own team, or third-party contributors forking) may have been relying on the v1.1 symlink install: edit `src/gomad-skills/*/SKILL.md`, the change is immediately visible to Claude Code because `.claude/skills/foo/` is a symlink into `src/`. v1.2 copy-only breaks this — every edit now requires re-running `gomad install`.

Additionally, Claude Code's "live change detection" (per docs: "Claude Code watches skill directories for file changes") monitors the copied files, not the source. Edits to source have no effect until re-install.

**Why it happens:**
Symlink was inadvertently providing a dev-loop feature; copy removes it.

**How to avoid:**
- Add `gomad install --watch` or a separate `gomad dev` command that symlinks (restoring old behavior) explicitly for contributor workflows. Document as "for GoMad contributors, not end users."
- OR document: "When developing a new skill, edit in `_gomad/gomad/<skill>/` directly, not in `src/`. Run `gomad install` to sync back." (Messy, but works.)
- Release notes must call out the dev-loop regression so contributors aren't surprised.

**Warning signs:**
- Contributor PR: "I edited the skill, Claude Code doesn't pick up my changes"
- Slow perceived iteration speed on our own skill development

**Phase to address:**
Phase 3 (installer rework) — but likely a Phase 3 *follow-up* or a deliberate "known trade-off" documented in release notes.

---

### Pitfall 11: Agent command template still says "load agent file from `{project-root}/_gomad/...`" which makes no sense for a slash command

**What goes wrong:**
`tools/installer/ide/templates/agent-command-template.md` currently contains:
> LOAD the FULL agent file from `{project-root}/_gomad/{{module}}/agents/{{path}}`

The v1.1 flow is: the flat `gomad-agent-pm.md` file in `.claude/commands/` is a *launcher* that tells Claude to go load the real agent persona from `_gomad/gomad/agents/pm.md`. In v1.2, if the agent content *moves into* `.claude/commands/gm/agent-pm.md` (becomes self-contained), the template instruction to "load from `_gomad/...`" is wrong — the persona IS the command file.

If the template isn't updated, post-migration slash commands will instruct Claude to go load a file that either doesn't exist (because we deleted the `_gomad/gomad/agents/` directory) or is empty / a stub.

Alternatively, if we keep the two-file model — command file dispatches to `_gomad/`-hosted persona — then the previous concern doesn't apply, but we've added a layer of indirection that slash commands didn't need. The colon-namespaced commands aren't launchers; they can BE the persona.

**Why it happens:**
Inherited template designed for launcher-pattern; v1.2 conceptually changes the relationship.

**How to avoid:**
- Decide explicitly: **self-contained command file** (persona inline) vs **launcher pattern preserved** (command loads from `_gomad/`). Document the decision in an ADR.
- If self-contained, update template and ensure the `_gomad/gomad/agents/` tree either goes away (cleanup in upgrade) or is kept as data-source for NON-Claude-Code IDEs (which don't have slash commands and still need flat launchers).
- If launcher-pattern, verify Claude Code's slash command lifecycle (see docs: "rendered SKILL.md content enters the conversation as a single message and stays"): does a launcher-pattern work, or will Claude only see "go load X" once and then forget the persona?

**Warning signs:**
- `/gm:agent-pm` responds with "I'll load the agent file..." and then doesn't follow through
- The persona content isn't present in the command file

**Phase to address:**
Phase 2 (command migration). Architecture decision upfront, then template update.

---

### Pitfall 12: "Aggressive MVP scope" amplification produces plans that are actually under-specified for coding agents

**What goes wrong:**
The PRD refinement goals include "amplify aggressive vision + MVP scope." Applied wrong, this becomes "drop requirements detail because the MVP scope is small." Coding agents fail worst on under-specified tasks — they fabricate interfaces, pick arbitrary tech choices, and produce plausible-but-wrong implementations. Stripping human-founder framing should not strip *dev-actionable specificity*.

Symptom: v1.2 PRDs read like pitch decks; downstream agents build the wrong thing fast.

**Why it happens:**
- "Aggressive" and "MVP" are both compression signals; without a floor on requirement density, compression goes too far.
- Removing business metrics is safe (coding agents don't use them); removing acceptance criteria is dangerous (coding agents need them).
- PM persona prompt currently says "ship the smallest thing that validates the assumption" — if this is the main guidance, output defaults to thin.

**How to avoid:**
- Define the "density floor" explicitly: a v1.2 PRD must have per-feature acceptance criteria, explicit in-scope/out-of-scope lists, named user flows, and a testability statement. Remove only framing, not detail.
- Add a companion section to the create workflow: "for coding agents, include: inputs/outputs, error cases, data-model sketch, boundary conditions." This is new *for* coding agents, not removed from humans.
- Validate with a real coding-agent experiment: feed a v1.2 PRD into `gm-create-architecture` and then `gm-create-epics-and-stories` and inspect whether the generated epics are well-formed or fabricated.

**Warning signs:**
- A v1.2 PRD is shorter than a v1.1 PRD for a comparable product.
- Epics generated from v1.2 PRDs are shorter or missing concrete acceptance checks.
- `gm-validate-prd` passes PRDs that `gm-check-implementation-readiness` later rejects.

**Phase to address:**
Phase 4 (PRD refinement). Include a "density audit" as an acceptance criterion.

---

### Pitfall 13: Breaking change shipped under minor-version bump will blindside users

**What goes wrong:**
User explicitly chose v1.2.0 (minor) over v2.0.0 (major) mirroring the v1.1 choice. Semver says minor is backward-compatible — it isn't for v1.2: anyone scripting `/gm-agent-pm` (v1.1 invocation) will find it broken post-upgrade unless they re-install.

**Why it happens:**
- v1.1 had "effectively zero users" so minor bump was safe.
- v1.1.0 now has SOME users (even if mostly internal). Each additional minor release accrues more users; eventually the "blast radius near zero" argument stops holding.
- npm's `^1.1.0` range happily accepts 1.2.0; upgrade is automatic for users with ranged deps.

**How to avoid:**
- `CHANGELOG.md` entry for 1.2.0 with prominent **BREAKING** callout at the top. Document migration: "`gm-agent-*` invocations no longer work; use `/gm:agent-*` slash commands. Run `gomad install` to upgrade; old skills auto-removed."
- Consider marking the old `gm-agent-*` skill directories as installable for one release (1.2) as a *compatibility shim*, removing them in 1.3. This matches user's stated "minor bump is deliberate, but call out user-comms implications."
- README banner for 1.2 release describing the change.
- If a post-install hook or version-check is feasible: detect v1.1 state, print migration note, offer `--migrate` flag.
- `deprecate`-style messages for prior version on npm (as v1.0 was handled for v1.1): publish a v1.1.2 that `console.warn`s about the upcoming change, so users running v1.1 see a prompt before they upgrade. (Optional; may be overkill for a small-audience project.)
- Consider whether the `@xgent-ai/gomad@1.1.x` line should continue to get patches for users not ready to upgrade.

**Warning signs:**
- Issue report: "installed v1.2 via `npm update`, now `/gm-agent-pm` doesn't work"
- Search traffic for "gomad gm-agent-pm not found" post-release

**Phase to address:**
Phase 5 (release). CHANGELOG + README + migration-guide content.

---

### Pitfall 14: Tarball file-allowlist drift silently adds or removes shipped files

**What goes wrong:**
v1.1's `files: ["src/", "tools/installer/", "LICENSE", "README.md", ...]` allowlist is tight — 320 files. v1.2 changes the installer (more files) and may add new content (migration docs, etc.). If someone adds a file outside the allowlist (e.g., adds tarball support for slash-command templates in a new directory), it won't ship. Or, someone unwittingly expands the allowlist and ships internal-only planning docs.

**Why it happens:**
Allowlists rot silently; the default mode ("everything not in `.npmignore`") doesn't apply.

**How to avoid:**
- Keep `verify-tarball.js` strict. Add assertions for v1.2: every new artifact type (command templates, migration scripts) has an explicit expected-file test.
- Snapshot the tarball contents in a committed file (e.g., `test/fixtures/expected-tarball-files.txt`); CI diffs against it.
- Document any `files` allowlist change with a clear rationale in the PR.

**Warning signs:**
- v1.1.x tarball: 320 files. v1.2.0 tarball: 250 files (something was accidentally excluded) or 1200 files (something internal leaked).
- User reports missing functionality after install; investigation reveals missing template file.

**Phase to address:**
Phase 5 (verification). Extend `verify-tarball.js`.

---

### Pitfall 15: Existing v1.1 `_gomad/_config/` manifest files collide with v1.2 schema changes

**What goes wrong:**
v1.2 implies the `files-manifest.csv` gains new semantics (it's now the deletion list, not just a passive record). Existing v1.1 manifests have the same name but older content: may lack certain columns, may have stale hashes, may omit slash-command files. If v1.2 installer reads a v1.1 manifest and treats it as authoritative, either:
- Deletes files v1.1 wrote but v1.2 still wants to keep, because v1.2's logic expects them to be re-written anyway (benign).
- Does NOT delete orphans that v1.2 would want to clean up (stale `gm-agent-*` skill directories), because those entries are in the v1.1 manifest with matching hashes → "file is fine, keep it."

**Why it happens:**
No schema version field in manifest. `manifestHasHashes` check exists but is coarse.

**How to avoid:**
- Add a schema-version column or header comment to `files-manifest.csv`. v1.2 writer emits v2 schema; reader detects and handles both.
- On first v1.2 install over a v1.1 install, **ignore the v1.1 manifest for deletion purposes** and instead do a full fresh-install sweep (removing any non-manifest files conservatively — e.g., only under `_gomad/gomad/agents/` where we *know* the old structure lived). Log "migrating from v1.1" clearly.
- Test migration path: install v1.1, upgrade to v1.2, verify orphans cleaned up.

**Warning signs:**
- Post-upgrade, `_gomad/gomad/agents/` still exists with the 7 old agent files plus new command structure.
- `/gm-agent-pm` AND `/gm:agent-pm` both work (or both are broken).

**Phase to address:**
Phase 3 (installer rework). Call out v1.1-to-v1.2 migration as an explicit test case.

---

## Minor Pitfalls

### Pitfall 16: Case sensitivity inconsistency between `gm:agent-pm`, `gm/agent-pm`, `gm-agent-pm`, and GoMad/gomad

Already strongly documented project constraint (display "GoMad", paths "gomad", acronym "GOMAD"), but the new slash-command form introduces three additional variants. Pick one invocation form per agent, document it, and never drift.

**Phase:** Phase 2 (naming decisions); Phase 5 (doc consistency review).

---

### Pitfall 17: `$ARGUMENTS` vs `$1`/`$ARGUMENTS[0]` inconsistency in command files

Per docs, Claude Code supports both. If v1.2 agents take args (e.g., `/gm:agent-pm "focus on auth"`), pick one style and stick with it. Inconsistency across the 7 agents means users who learn one form fail on another.

**Phase:** Phase 2 (command design); Phase 4 (PRD refinement — if PRD-creating agent takes args, template uses `$1`).

---

### Pitfall 18: Agent persona frontmatter fields (`displayName`, `title`, `icon`, `capabilities` from `skill-manifest.yaml`) have no home in slash-command files

Slash-command frontmatter per docs supports `name`, `description`, `argument-hint`, `disable-model-invocation`, `user-invocable`, `allowed-tools`, `model`, `effort`, `context`, `agent`, `hooks`, `paths`, `shell`. That's it. Current `skill-manifest.yaml` for agents carries rich metadata (see `gm-agent-analyst/skill-manifest.yaml`) including `displayName: Mary`, `title: Business Analyst`, `icon: "📊"`, `capabilities`, `role`, `identity`, `communicationStyle`, `principles`. These fields have **no frontmatter home in slash-command files** — they must move into the command body prose.

If not handled, the manifest-generator writes `agent-manifest.csv` entries that are used by `gomad-help.csv` generation (see `installer.js mergeModuleHelpCatalogs`) — the persona metadata feeds a help catalog that users browse. Losing this metadata in transition means the help catalog becomes thinner.

**Phase:** Phase 2 (command design). Preserve `agent-manifest.csv` generation even without skill-manifest.yaml sidecars; derive metadata from command file frontmatter (e.g., `description`) + body parsing.

---

### Pitfall 19: Windows path separators in files-manifest.csv (`\` vs `/`)

Manifest stores paths like `gomad/agents/pm.md` (forward slash). `detectCustomFiles` already uses `path.normalize` when building the map. But if a Windows install writes `gomad\agents\pm.md` into the CSV, cross-platform comparisons (or a Windows → macOS sync via git) breaks. Normalize manifest paths to `/` always.

**Phase:** Phase 3 (installer rework).

---

### Pitfall 20: `ancestor_conflict_check` false-positives for new command subdirectory

`_config-driven.js` has `findAncestorConflict` (line 459) that refuses to install if a parent directory has GOMAD files. Currently matches files starting with `gomad`. After v1.2, the new `.claude/commands/gm/` directory starts with `gm` but contains `gomad*`... does the ancestor conflict logic still fire? Needs verification. If a user has gomad installed at `~/projects/foo/.claude/commands/gm/` and tries to install at `~/projects/foo/bar/`, behavior is undefined.

**Phase:** Phase 3 (installer rework).

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Skip the v1.1→v1.2 orphan cleanup for `gm-agent-*` skill directories ("next install will clean it") | Saves a phase of careful logic | Users have stale skills showing up in `/` menu + resolving to dead targets; dev confusion about which naming is current | Never — must clean in v1.2 |
| Hand-rolled CSV parse instead of `csv-parse/sync` | "It's already there in `readFilesManifest`" | Quote/escape edge cases cause wrong deletes; pitfall #2 made real | Never — use the parser that already exists in deps |
| Skip `.bak`-style preservation for edits under `.claude/commands/gm/` | Simpler install logic | Loud user complaint; perceived data loss; reputational risk | Only if the command files are documented as non-editable AND a clear customization path exists in `_gomad/` |
| Ship v1.2 as minor without a 1-release compat shim for `gm-agent-*` | Faster; cleaner final state | Breakage for every upgrading user; support load | If users confirmed to be internal-only (currently true); document as a deliberate cost |
| Copy `fs.copy` defaults without thinking about symlinks + permissions | Fewer lines of installer code | Source-tree pollution via symlink traversal; security-scanner flags | Never — explicit options needed |
| Drop "why now?" and business metrics from PRDs without updating validator | Faster content-only change | Validator reports false gaps; user confusion | Never — make validator backward-compatible first |
| Leave `.claude/commands/gm/` unversioned (no schema in manifest, no ADR) | Ship faster | Next schema change has same v1.1→v1.2 migration pain (#15) | Acceptable if v1.2 is the last breaking change expected for a while; still advisable to add a schema version now |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Claude Code `.claude/commands/` | Assume subdirectory namespacing works universally | Verify against current CC version; provide flat-name fallback; gate on min version |
| Claude Code `.claude/skills/` | Forget skills take precedence over same-named commands | Namespace all skills with `gm-*` prefix (already the case); for command-shaped agents use `gm:agent-*` colon form |
| Cursor `.cursor/skills/` | Assume Cursor understands `/gm:agent-*` slash syntax | Cursor ≠ Claude Code; keep flat `gomad-agent-*.md` for Cursor via `agent-command-generator.js` |
| Codex `.agents/skills/` (global at `~/.codex/prompts`) | Assume project-local is the only target | Platform config `legacy_targets` includes `~/.codex/prompts` — global scope also needs cleanup logic |
| npm `@xgent-ai/gomad` | Assume `^1.1.0` semver range is safe | It isn't, for v1.2; ranged users need explicit migration note |
| fs-extra `fs.copy` | Assume safe defaults | Defaults follow symlinks (source pollution), preserve mode bits (unwanted exec); be explicit |
| fs-extra `fs.ensureSymlink` → `fs.copy` swap | Forget to `fs.remove` stale symlinks first | Always detect-and-unlink before writing copy |
| Node `path.join` with CSV-sourced paths | Trust manifest paths unconditionally | Enforce containment check with `realpath` prefix match |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Install time grows from O(symlink count) to O(total file size) | `gomad install` takes minutes instead of seconds | Parallelize copies; consider hardlinks on same-filesystem as a compromise; measure baseline vs v1.1 | ~52 skill dirs × ~dozen files each = ~600 files. Probably fine. A 5-6x slowdown is unlikely to be user-noticeable but worth measuring. |
| `detectCustomFiles` full-tree scan | Install slow on large projects (user has many non-gomad files under cwd? No, scan is scoped to `_gomad/`) | Confirm scope; `scanDirectory` is already scoped to `gomadDir` | Unlikely to break at realistic scale |
| Hash computation on every file in upgrade | N hashes = N SHA-256 passes | Already in v1.1 code; acceptable for ~600 files | Breaks if user's `_gomad/` grows to thousands (not likely) |
| Re-writing `skill-manifest.csv` regenerates every row's hash | Quadratic if manifests are also scanned for modifications | Already handled; same cost as v1.1 | Not a new v1.2 concern |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Trusting `files-manifest.csv` paths for `fs.remove` without containment check | Absolute-path or `../` entries delete files outside project | `realpath` containment assertion before any destructive op |
| `fs.copy` following symlinks from source | If user's clone has unexpected symlinks, installer writes outside target | `dereference: false`-aware copy; explicit symlink handling |
| Executable bit leaked from source on copy | Privilege escalation if copied-in script is later run with more privilege | Normalize mode to `0644` for data, `0755` only for known executables |
| Pre-install hook / post-install hook without validation | Supply-chain attack vector | We don't have install hooks; keep it that way |
| Hash comparisons without constant-time comparison | Not a real concern here (we use SHA-256 for content-integrity, not auth) | N/A |
| Writing files to `.claude/` paths user provided via CLI arg without validation | Path-injection if `--directory` isn't sanitized | Already handled in v1.1; re-verify during Phase 3 |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Silent command discovery failure (`/gm:agent-pm` not found, no hint why) | User thinks install failed, reinstalls, same result | Ship install-time diagnostic: after install, attempt to validate expected command count vs installed; print a smoke-test checklist |
| Backup files (`.bak`) left in project without explanation | User sees `pm.md.bak` and wonders "is this mine or theirs?" | Summary at end of install: "We preserved N customized files as `.bak`. Review them and delete once reconciled." |
| Upgrade warning only in stdout | Users running `npm update` in CI miss it | Output on stderr too (or npm post-install script); add banner in README release notes |
| PRD workflow feels robotic to users who still want the human-facing experience | Human product leads can't use gomad for their own planning | Keep a `--human` flag or a separate skill for the old framing; or document that GoMad's PRD creation is now coding-agent-first and suggest alternatives for human-facing PRDs |
| New users don't know which form to invoke (`/gm:agent-pm` vs `/gm-agent-pm` vs `/gm-agent-pm.md`) | Friction; abandonment | Single canonical invocation per command, clearly named in docs + `/help` |

---

## "Looks Done But Isn't" Checklist

- [ ] **Command migration:** All 7 agents have files at `.claude/commands/gm/agent-*.md` — verify each command actually resolves via Claude Code's `/` menu in a fresh CC session.
- [ ] **Command migration:** Verify `/gm:agent-pm` works specifically on the minimum supported CC version, not just the latest.
- [ ] **Reference sweep:** `grep -rn 'gm-agent-\|gomad-agent-'` returns only explicit historical/archival matches; every other match is resolved.
- [ ] **Reference sweep:** `docs/zh-cn/` updated in same PR as `docs/en/`, not a follow-up.
- [ ] **Installer:** `gomad install` on a fresh machine completes; `_gomad/` contains real files (not symlinks) — `ls -la` shows `-rw-` not `lrwx`.
- [ ] **Installer:** `gomad install` run twice produces identical `_gomad/_config/files-manifest.csv` hashes (idempotence).
- [ ] **Installer:** `gomad install` over a v1.1 install removes all `gm-agent-*` skill directories, adds `gm/` command directory.
- [ ] **Installer:** Upgrade over symlinked v1.1 install completes without polluting source tree.
- [ ] **Installer:** Malformed `files-manifest.csv` (manually corrupted) does NOT cause mass deletion; installer logs and skips cleanup.
- [ ] **Installer:** User-modified file in `_gomad/` is preserved as `.bak`; end-of-install summary lists it.
- [ ] **Installer:** User-modified file in `.claude/commands/gm/` is preserved (or loudly reported) — NOT silently overwritten.
- [ ] **Installer:** Running installer from the gomad git checkout itself warns or refuses (prevents polluting dev repo).
- [ ] **Installer:** Windows CI job (if available) completes an install without path errors.
- [ ] **Manifest:** CSV contains no literal quotes in values; no BOM; LF line endings; all paths use `/` separators.
- [ ] **Manifest:** Every row has 5 columns (type, name, module, path, hash).
- [ ] **PRD refinement:** `gm-validate-prd` passes a v1.2-generated PRD.
- [ ] **PRD refinement:** `gm-create-architecture` consuming a v1.2 PRD produces an architecture without "missing context" questions that the PRD should have answered.
- [ ] **PRD refinement:** `gm-create-epics-and-stories` produces concrete epics from a v1.2 PRD (not pitch-deck epics).
- [ ] **PRD refinement:** Per-feature acceptance criteria present; dev-actionable-spec density preserved or increased.
- [ ] **Release:** `CHANGELOG.md` has prominent BREAKING callout for the agent invocation change.
- [ ] **Release:** README has migration note ("if upgrading from v1.1, do X").
- [ ] **Release:** `verify-tarball.js` asserts no `.claude/commands/gm/` in tarball (installer-generated only).
- [ ] **Release:** Tarball file count is explicit and tested (v1.1 was 320; record v1.2's number).
- [ ] **Release:** `package.json` `files` allowlist unchanged or changes are reviewed explicitly.
- [ ] **Test infrastructure:** Existing v1.1 tests (`test-e2e-install.js`, `test-installation-components.js`, `test-file-refs-csv.js`) all pass OR are updated with explicit rationale.

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| #1 Namespacing silently broken | LOW | Document min CC version; users can `rm -rf .claude/commands/gm && gomad install` after updating CC. If widespread, ship v1.2.1 with flat-name fallback. |
| #2 Manifest-driven over-delete destroyed user files | HIGH | Git-tracked files recoverable via `git reflog`/`git checkout`. Non-git files gone — only `_gomad-*-backup-temp/` ephemeral dirs might still exist if they weren't cleaned up on the destructive run. Immediate hotfix: disable manifest-driven delete, fall back to fresh-install-over-existing. Post-mortem: add containment check. |
| #3 Symlink leftovers causing source pollution | MEDIUM | Instruct users to `git clean -fdx src/` on GoMad repo; issue fix in v1.2.1. |
| #4 Orphan references found post-release | LOW | Patch release (v1.2.1) with corrected references; no data impact. |
| #5 User customizations to `.claude/commands/gm/` wiped | MEDIUM | Cannot recover without user's backup. Release note apology; add `.bak` preservation in v1.2.1. |
| #6 PRD pipeline misaligned (validate fails new PRDs) | MEDIUM | Ship v1.2.1 with validator updates; users regenerate. Affects only projects with v1.2-created PRDs. |
| #7 Dev repo `.claude/commands/gm/` committed | LOW | Revert commit; add to `.gitignore`; no user impact if not yet tarballed. |
| #10 Dev-loop regression | LOW (contributors only) | Manual `gomad install` loops. Or implement `gomad dev --watch` follow-up. |
| #13 Semver surprise (minor bump breaking) | LOW to MEDIUM depending on user count | Publish v1.1.2 with deprecation warning retroactively; v1.2 README migration note; social channel announcement. |
| #15 v1.1→v1.2 migration orphans | LOW | Reinstall with `gomad uninstall && gomad install`. Document as migration step. |

---

## Pitfall-to-Phase Mapping

| Pitfall | Phase | Verification |
|---------|-------|--------------|
| #1 Namespacing may not work on user's CC version | Phase 1 (research) + Phase 2 (command migration) | Doc + test: verify against minimum supported CC version; optional flat-name fallback shipped. |
| #2 Manifest-driven over-delete | Phase 3 (installer rework) | Containment-check test; malformed-CSV test; dry-run option demoed. |
| #3 Symlink leftovers | Phase 3 (installer rework) | E2E test that starts from a symlinked v1.1 state and completes clean. |
| #4 Orphan references | Phase 2 (rename sweep) | `grep -n gm-agent-` final pass returns zero non-historical matches. |
| #5 `.claude/commands/gm/` customization destroyed | Phase 3 (installer rework) | Test: edit command file, re-install, verify preserved or reported. |
| #6 PRD pipeline misalignment | Phase 4 (PRD refinement) | Integration test: CP→VP→CA→CE→IR all exit success against a v1.2-created sample PRD. |
| #7 Dev repo pollution | Phase 2 (command migration) | `.gitignore` updated; installer refuses self-install. |
| #8 Colon-in-filename regression | Phase 2 (command migration) | Unit test: generated path is dir + file, never contains `:` in filename. |
| #9 Permission bit drift | Phase 3 (installer rework) | Post-install perm audit test. |
| #10 Dev-loop regression | Phase 3 (installer rework) | Release note documents tradeoff; optional `--watch` follow-up. |
| #11 Template still says "load from `_gomad/...`" | Phase 2 (command migration) | Template content review; ADR for launcher-vs-self-contained. |
| #12 Aggressive MVP → under-spec | Phase 4 (PRD refinement) | Density audit; experiment feeding v1.2 PRD through pipeline. |
| #13 Breaking change under minor bump | Phase 5 (release) | CHANGELOG + README + migration guide content review. |
| #14 Tarball allowlist drift | Phase 5 (release) | `verify-tarball.js` extended assertions; expected-files snapshot. |
| #15 v1.1→v1.2 manifest schema | Phase 3 (installer rework) | Migration test: install v1.1 → upgrade v1.2, verify no orphans + no over-deletes. |
| #16 Case/namespace inconsistency | Phase 2 + Phase 5 | Name canonicalization review. |
| #17 `$ARGUMENTS` vs `$1` inconsistency | Phase 2 | Convention doc + review across all 7 command files. |
| #18 Agent metadata has no frontmatter home | Phase 2 | Confirm `agent-manifest.csv` still populates from new source; help catalog intact. |
| #19 Windows path separators in manifest | Phase 3 | Normalization on write + test. |
| #20 `ancestor_conflict_check` interaction | Phase 3 | Regression test against nested install layout. |

---

## Cross-References to Other v1.2 Research

- **STACK.md** (already present): tech choices influence which pitfalls apply — e.g., `csv-parse/sync` availability affects pitfall #2.
- **CREDIT_AND_NPM.md** (from v1.1): release mechanics context for pitfall #13/#14.
- **RENAME_MECHANICS.md** (from v1.1): lessons from the `bmad → gomad` rename directly inform pitfall #4.

---

## Sources

Direct code evidence (HIGH confidence — all reviewed in-tree as of 2026-04-18):

- `/Users/rockie/Documents/GitHub/xgent/gomad/tools/installer/core/installer.js`
- `/Users/rockie/Documents/GitHub/xgent/gomad/tools/installer/core/manifest-generator.js`
- `/Users/rockie/Documents/GitHub/xgent/gomad/tools/installer/core/existing-install.js`
- `/Users/rockie/Documents/GitHub/xgent/gomad/tools/installer/core/manifest.js`
- `/Users/rockie/Documents/GitHub/xgent/gomad/tools/installer/file-ops.js`
- `/Users/rockie/Documents/GitHub/xgent/gomad/tools/installer/ide/_config-driven.js`
- `/Users/rockie/Documents/GitHub/xgent/gomad/tools/installer/ide/shared/agent-command-generator.js`
- `/Users/rockie/Documents/GitHub/xgent/gomad/tools/installer/ide/shared/path-utils.js`
- `/Users/rockie/Documents/GitHub/xgent/gomad/tools/installer/ide/templates/agent-command-template.md`
- `/Users/rockie/Documents/GitHub/xgent/gomad/tools/installer/ide/platform-codes.yaml`
- `/Users/rockie/Documents/GitHub/xgent/gomad/src/gomad-skills/2-plan-workflows/gm-agent-pm/SKILL.md`
- `/Users/rockie/Documents/GitHub/xgent/gomad/src/gomad-skills/2-plan-workflows/gm-create-prd/` (workflow + steps)
- `/Users/rockie/Documents/GitHub/xgent/gomad/src/gomad-skills/2-plan-workflows/gm-validate-prd/` (workflow + steps)
- `/Users/rockie/Documents/GitHub/xgent/gomad/src/gomad-skills/3-solutioning/gm-create-architecture/workflow.md`
- `/Users/rockie/Documents/GitHub/xgent/gomad/src/gomad-skills/module-help.csv`
- `/Users/rockie/Documents/GitHub/xgent/gomad/.planning/PROJECT.md`
- `/Users/rockie/Documents/GitHub/xgent/gomad/.planning/MILESTONES.md`
- `/Users/rockie/Documents/GitHub/xgent/gomad/.planning/milestones/v1.1-ROADMAP.md`

External documentation (MEDIUM confidence — dated sources; live at time of research but may evolve):

- [Claude Code slash commands docs](https://code.claude.com/docs/en/slash-commands) — retrieved 2026-04-18; describes subdirectory namespacing
- [GitHub Issue #2422](https://github.com/anthropics/claude-code/issues/2422) — closed "not planned"; documents prior bug with subdirectory namespacing
- [GitHub Issue #44678](https://github.com/anthropics/claude-code/issues/44678) — opened 2026-04-07; new feature request (open)
- [Claude Code skills docs](https://code.claude.com/docs/en/skills) — context on skill/command precedence
- Search result sources: [Claude Code slash commands guide (eesel.ai, 2026)](https://www.eesel.ai/blog/claude-code-slash-commands); [Claude Code commands cheat sheet (scriptbyai, 2026)](https://www.scriptbyai.com/claude-code-commands-cheat-sheet/); [Learnia Claude Code slash commands reference 2026](https://learn-prompting.fr/blog/claude-code-slash-commands-reference); [Anatomy of the .claude/ folder (dailydoseofds)](https://blog.dailydoseofds.com/p/anatomy-of-the-claude-folder); [Claude Code changelog 2026](https://claudefa.st/blog/guide/changelog)

Internal knowledge (MEDIUM confidence — v1.1 shipped lessons):

- v1.1 `issues-resolved` section of v1.1-ROADMAP.md: `NAME_REGEX` hardcoding, content-sweep glob misses, dangling `require` statements
- v1.1 E2E testing approach: tarball-structural verification rather than interactive `gomad install` to avoid `@clack/prompts` hang

---

*Pitfalls research for: GoMad v1.2 — agent-to-slash-command migration + copy-only installer + PRD refinement*
*Researched: 2026-04-18*
