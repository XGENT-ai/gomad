---
phase: 02-project-local-install
fixed_at: 2026-04-07T00:00:00Z
review_path: .planning/phases/02-project-local-install/02-REVIEW.md
iteration: 1
findings_in_scope: 4
fixed: 4
skipped: 0
status: all_fixed
---

# Phase 02: Code Review Fix Report

**Fixed at:** 2026-04-07
**Source review:** .planning/phases/02-project-local-install/02-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 4 (all Warnings; no Critical findings)
- Fixed: 4
- Skipped: 0

## Fixed Issues

### WR-01: `loadManifest()` crashes on empty or corrupt YAML

**Files modified:** `tools/installer.js`
**Commit:** 38bf581
**Applied fix:** Wrapped both `loadLockfile()` and `loadManifest()` in try/catch with `parsed ?? <empty>` fallback. Corrupt YAML now logs a yellow warning and returns a safe empty default (null for lockfile, empty manifest object for manifest), so `status()` and `uninstall()` no longer throw `TypeError: Cannot read properties of null`.

### WR-02: Curator silently ignores cancel during agent multiselect

**Files modified:** `tools/curator.js`
**Commit:** cbf5684
**Applied fix:** Replaced the inverted `if (!p.isCancel(...))` branch with the same `p.cancel(...); process.exit(0)` pattern used by every other multiselect step in `curate()`. Ctrl-C during agent selection now cancels cleanly instead of silently committing the preset's agent list.

### WR-03: `install` forces non-interactive mode whenever `--preset` is supplied

**Files modified:** `tools/installer.js`
**Commit:** ccf0dbb
**Applied fix:** Removed the `|| !!options.preset` coercion on the `yes` flag passed to `curate()`. `gomad install --preset lean` now respects the user's intent: a preset alone selects the starting bundle but still allows interactive customization, while `--yes` (alone or combined with `--preset`) is the only way to skip prompts. Matches the documented `-y, --yes` semantics in `bin/gomad-cli.js`.

### WR-04: `uninstall()` leaves empty directories and ignores rmSync race conditions

**Files modified:** `tools/installer.js`
**Commit:** f29997e
**Applied fix:** Two-part change:
1. Added a `pruneEmptyDirs(dir)` helper that walks the target tree bottom-up and removes empty subdirectories, swallowing missing-dir / readdir errors.
2. Replaced the `existsSync` + bare `rmSync` pattern with `rmSync(filePath, { force: true })` inside a try/catch that warns on per-file failures instead of aborting the loop. After each asset's removal loop, `pruneEmptyDirs(target)` is invoked so empty `rules/python/`, `commands/foo/`, etc. no longer pollute the project.

---

_Fixed: 2026-04-07_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
