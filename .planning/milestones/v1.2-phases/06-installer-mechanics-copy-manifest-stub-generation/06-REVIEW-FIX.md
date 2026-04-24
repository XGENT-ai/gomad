---
phase: 06-installer-mechanics-copy-manifest-stub-generation
fixed_at: 2026-04-18T00:00:00Z
review_path: .planning/phases/06-installer-mechanics-copy-manifest-stub-generation/06-REVIEW.md
iteration: 1
findings_in_scope: 5
fixed: 5
skipped: 0
status: all_fixed
---

# Phase 6: Code Review Fix Report

**Fixed at:** 2026-04-18T00:00:00Z
**Source review:** .planning/phases/06-installer-mechanics-copy-manifest-stub-generation/06-REVIEW.md
**Iteration:** 1

**Summary:**

- Findings in scope: 5 (5 warnings; no critical findings; info findings out of scope)
- Fixed: 5
- Skipped: 0

All 5 warning-severity findings were fixed atomically and verified against the
full `npm test` suite (205 install-component tests + 7 ref tests + lint + markdown
lint + prettier). No regressions.

## Fixed Issues

### WR-03: Persona extraction regex does not handle CRLF line endings

**Files modified:** `tools/installer/ide/shared/agent-command-generator.js`
**Commit:** 3ae4644
**Applied fix:** In `extractPersonas()`, normalize the raw `SKILL.md` contents
with `.replaceAll('\r\n', '\n').replaceAll('\r', '\n')` before stripping the
leading frontmatter block. Mirrors the existing normalization in
`manifest-generator.js:236` (`parseSkillMd`). Previously, a CRLF-encoded
`SKILL.md` would silently fail the `^---\n…\n---\n+` regex and embed the source
frontmatter inside the freshly emitted persona frontmatter, producing malformed
YAML in `_gomad/gomad/agents/<shortName>.md`.

### WR-05: Launcher / persona generators silently stringify `undefined` when manifest fields are missing

**Files modified:** `tools/installer/ide/shared/agent-command-generator.js`
**Commit:** fc9594a
**Applied fix:** Three fail-fast guards added:

1. `extractPersonas`: throws if `yaml.parse(skill-manifest.yaml)` returns a
   non-object (null, scalar, malformed).
2. `generateLauncherContent`: throws if any of `shortName`, `displayName`,
   `title`, `icon`, `capabilities`, `purpose` is missing or non-string. This
   prevents the literal string `"undefined"` from being baked into launcher
   templates via `String.prototype.replaceAll`.
3. `writeAgentLaunchers`: throws if `yaml.parse` does not return an object
   before destructuring fields into `generateLauncherContent`.

Consistent with the existing `throw new Error` pattern on missing
`skill-manifest.yaml` / `SKILL.md` files at lines 76–81.

### WR-04: `mergeModuleHelpCatalogs` parses `agent-manifest.csv` with naive `split(',')` — breaks on embedded commas

**Files modified:** `tools/installer/core/installer.js`
**Commit:** 9782cbc
**Applied fix:** Replaced the hand-rolled `line.split(',')` /
`replaceAll('"', '')` parser inside `mergeModuleHelpCatalogs` with the
already-imported `csv-parse/sync` module configured with `{ columns: true,
skip_empty_lines: true }`. Field access now uses header names (`r.name`,
`r.displayName`, `r.title`, `r.icon`, `r.module`) instead of positional indexes.
The previous code broke on every gomad agent because real
`skill-manifest.yaml` files have multi-comma values in `capabilities`, `role`,
and `principles` — this pushed the `module` column out of position and produced
blank `agent-command` / `agent-display-name` / `agent-title` cells in
`gomad-help.csv`.

### WR-02: `install_root` auto-detection in `writeFilesManifest` hard-codes `.claude` only

**Files modified:** `tools/installer/core/installer.js`,
`tools/installer/core/manifest-generator.js`
**Commit:** 28e278e
**Applied fix:**

1. New private helper `Installer._collectIdeRoots()` reads
   `platform-codes.yaml` and returns the union of leading path segments for
   every platform's `target_dir` and `launcher_target_dir` (e.g. `.claude`,
   `.cursor`, `.opencode`, `.codebuddy`, `.crush`, `.cline`, `.codex`,
   `.augment`, `.agent`, `.agents`, `.gemini`, `.github`, `.iflow`,
   `.kilocode`, `.kiro`, `.ona`, `.opencode`, `.pi`, `.qoder`, `.qwen`,
   `.roo`, `.rovodev`, `.trae`, `.windsurf`).
2. Both `generateManifests` call sites in `installer.js` now pass the result
   as `options.ideRoots`.
3. `ManifestGenerator.generateManifests` stores `this.ideRoots` (filtered to
   non-empty strings) and `writeFilesManifest` builds an `ideRootCandidates`
   list (always including `.claude` for backward compat) used in a per-file
   loop to derive the correct `install_root` value.

Future IDEs that opt into `launcher_target_dir` will be picked up
automatically — no further code change required.

### WR-01: `install_root` from `files-manifest.csv` is never used to reconstruct absolute paths

**Files modified:** `tools/installer/core/installer.js`
**Commit:** cecee40
**Applied fix:**

1. `readFilesManifest` now resolves an `absolutePath` per row using the row's
   `install_root` (defaults to `_gomad`). Rows with `install_root='.claude'`
   resolve under `<workspaceRoot>/.claude/`; other roots resolve under
   `<workspaceRoot>/<install_root>/`.
2. `detectCustomFiles` now keys `installedFilesMap` by `fileEntry.absolutePath
   || path.join(gomadDir, fileEntry.path)` (preserves backward-compat for
   manifest entries that pre-date the `install_root` column).
3. `detectCustomFiles` collects an `extraScanRoots` set of all unique
   non-`_gomad` install_root absolute paths from the manifest.
4. After the existing `scanDirectory(gomadDir)` walk, a new
   `scanForModifications` walk visits each `extraScanRoot` to detect
   modifications to **known** manifest files only. It deliberately does NOT
   flag unknown files in IDE roots as "custom" because those roots contain
   many user/IDE files unrelated to GOMAD that must be left alone.

Net effect: a user-edited launcher file (e.g.
`.claude/commands/gm/agent-pm.md`) is now correctly recognized as a modified
file during re-install, so the existing `.bak` preservation logic engages.

## Verification

All fixes verified in three tiers:

1. Re-read modified file sections — confirmed expected text present and
   surrounding code intact.
2. `node -c` syntax check on every modified file — passed.
3. Full `npm test` suite (205 install-component tests + 7 ref tests + ESLint +
   markdownlint + Prettier check) — passed after each fix and after the final
   commit. No regressions.

## Skipped Issues

_None._ All 5 in-scope warnings were applied cleanly.

## Out-of-Scope (Info findings)

The following Info-severity findings (IN-01 through IN-06) were NOT addressed
because `fix_scope` is `critical_warning`. They remain documented in the
parent REVIEW.md for future iteration if the team chooses to address them:

- IN-01: `fs.copy` does not set `dereference: true` for verbatim skill install
- IN-02: `removeLegacyAgentSkillDirs` hardcodes `.claude/skills` path
- IN-03: `manifest-generator.js` assumes `this.gomadDir` is absolute
- IN-04: Second manifest-refresh pass has slightly different `preservedModules` derivation
- IN-05: "Atomic" legacy-dir removal comment is slightly misleading
- IN-06: Template uses `replaceAll` with zero-arg validation (documentation note only)

---

_Fixed: 2026-04-18T00:00:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
