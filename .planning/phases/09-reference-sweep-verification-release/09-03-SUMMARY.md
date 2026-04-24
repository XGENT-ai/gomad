---
phase: 09-reference-sweep-verification-release
plan: 03
subsystem: release
tags: [changelog, npm-publish, git-tag, smoke-test, release]

requires:
  - phase: 09-01-prose-sweep-installer-simplification
    provides: canonical `/gm:agent-*` surface across source + installer alignment
  - phase: 09-02-verification-gates
    provides: orphan-refs + tarball + gm-surface + e2e gates to bless the release tree
provides:
  - v1.2.0 CHANGELOG entry with BREAKING section (before+after migration tokens)
  - package.json version bump 1.1.1 → 1.2.0
  - full release-gate stack executed; logs captured at `.planning/phases/.../release-logs/`
  - `@xgent-ai/gomad@1.2.0` published to npm with `latest` dist-tag
  - `v1.2.0` annotated tag pushed to origin
  - post-publish smoke test: 7 `/gm:agent-*` launchers, no legacy skills dir leak
  - STATE.md + ROADMAP.md updated at both prose and YAML frontmatter layers
affects: [v1.3 milestone kickoff, milestone-summary, future release phases]

tech-stack:
  added: []
  patterns:
    - Human-verify checkpoint split across executor pause + continuation for npm-auth gates
    - Astro docs frontmatter as release-gate prerequisite (discovered gap in Phase 7 artifact)

key-files:
  created:
    - .planning/phases/09-reference-sweep-verification-release/09-03-SUMMARY.md
    - .planning/phases/09-reference-sweep-verification-release/release-logs/01-quality.log
    - .planning/phases/09-reference-sweep-verification-release/release-logs/02-tarball.log
    - .planning/phases/09-reference-sweep-verification-release/release-logs/03-gm-surface.log
    - .planning/phases/09-reference-sweep-verification-release/release-logs/04-e2e.log
  modified:
    - CHANGELOG.md
    - package.json
    - docs/upgrade-recovery.md
    - .planning/ROADMAP.md
    - .planning/STATE.md

key-decisions:
  - "BREAKING section retains both `gm-agent-` (before) and `/gm:agent-*` (after) forms per D-73 to keep the migration diff unambiguous."
  - "Tag v1.2.0 at main HEAD (70a15c5) rather than Task 2 version-bump commit — post-publish GSD upgrade commit is gitignore-scoped (`.claude/`) and not in the tarball."
  - "v1.1.0 retained on npm as prior-stable (no `npm deprecate` per D-76)."

patterns-established:
  - "Release gate stack: quality → test:tarball → test:gm-surface → test:e2e with per-gate log capture before publish checkpoint."
  - "Astro content collection schema enforcement at `npm run quality` — docs without `title` frontmatter break the release gate."
  - "Dual-layer tracking update: YAML frontmatter `total_plans`/`completed_plans`/`completed_phases` are authoritative for `/gsd-next`; prose body is human-readable mirror."

requirements-completed: [REL-02, REL-04, REL-05, REL-06]

duration: 55min
completed: 2026-04-24
---

# Phase 09, Plan 03: CHANGELOG + Publish + Tag — Summary

**Shipped `@xgent-ai/gomad@1.2.0` to npm with BREAKING-change guidance and pushed `v1.2.0` tag to origin; milestone v1.2 is closed.**

## Performance

- **Duration:** ~55 min (split across two executor invocations + human-verify checkpoint)
- **Started:** 2026-04-23T22:04:00Z (Task 1)
- **Completed:** 2026-04-24T02:10:00Z (Task 5)
- **Tasks:** 5/5 (Tasks 1-3 + 5 autonomous; Task 4 human-verify checkpoint)
- **Files modified:** 5 tracked + 4 release-logs (gitignored)

## Accomplishments

- v1.2.0 CHANGELOG entry prepended with full Summary/Added/Changed/Removed/BREAKING structure matching v1.1.0 pattern; migration guidance retains both before-form (`gm-agent-`) and after-form (`/gm:agent-*`) tokens
- package.json version bumped 1.1.1 → 1.2.0 in a dedicated atomic commit per D-75
- Pre-existing Phase 7 defect surfaced and fixed: `docs/upgrade-recovery.md` was missing Astro frontmatter, blocking `npm run quality` via the docs:build step
- Full release gate stack ran green: orphan-refs (177/177 allowlisted), lint, format, docs build + link validation, tarball (327 files, no forbidden paths, no `gm-agent-` residuals), gm-surface (43 assertions, 7 launchers + legacy absent), e2e (10 passed, 55 gm-* skills verified)
- `npm publish --access public` executed by maintainer (human checkpoint); registry now serves 1.2.0 with `latest` dist-tag; 1.0.0/1.1.0/1.1.1 all retained
- `v1.2.0` annotated tag created on main HEAD and pushed to `origin` (`git.wsjn.hk/XGENT.ai/gomad`)
- Post-publish smoke: npm-installed the public tarball in a scratch dir, ran `gomad install --tools claude-code`, confirmed 7 `agent-*.md` launchers at `.claude/commands/gm/` and zero `.claude/skills/gm-agent-*` leak

## Task Commits

1. **Task 1: CHANGELOG v1.2.0 prepend** — `49d15e3` (docs)
2. **Task 2: package.json 1.1.1 → 1.2.0** — `c29eef4` (chore)
3. **Pre-req fix: Astro frontmatter on docs/upgrade-recovery.md** — `9d01a7b` (fix)
4. **Task 3: Gate stack** — logs only (release-logs are `*.log` gitignored)
5. **Task 4: Human-verify `npm publish`** — off-tree action; registry confirmation only
6. **Task 5: v1.2.0 tag + smoke test** — tag object `e7cd70d` on commit `70a15c5`, pushed to origin
7. **Task 5: Tracking updates** — (committed with this SUMMARY.md)

## Files Created/Modified

- `CHANGELOG.md` — v1.2.0 release notes with BREAKING section (before+after migration tokens)
- `package.json` — version 1.1.1 → 1.2.0
- `docs/upgrade-recovery.md` — added Astro `title`/`description` frontmatter (unblocks release gate)
- `.planning/ROADMAP.md` — v1.2 milestone marked SHIPPED 2026-04-24; all Phase 5-9 rows flipped to Complete
- `.planning/STATE.md` — frontmatter `status: shipped`, `completed_phases: 5`, `percent: 100`; prose mirrors
- `.planning/phases/09-.../09-03-SUMMARY.md` — this file
- `.planning/phases/09-.../release-logs/*.log` — quality/tarball/gm-surface/e2e logs (gitignored)

## Verification

- `git tag -l v1.2.0` → `v1.2.0`
- `git ls-remote --tags origin v1.2.0` → `e7cd70d0e0ec71c2b97ad207c8a26e3ec255538a refs/tags/v1.2.0`
- `npm view @xgent-ai/gomad@1.2.0 version` → `1.2.0`
- `npm view @xgent-ai/gomad dist-tags.latest` → `1.2.0`
- `npm view @xgent-ai/gomad versions` → includes `1.0.0`, `1.1.0`, `1.1.1`, `1.2.0`
- Smoke test in scratch dir: 7 launcher files, `NO_LEGACY_SKILLS_DIR`

## Notable Deviations

- **D-75 release commit shape:** plan expected tag at Task 2 commit (version-bump). Mid-plan the user ran `/gsd:update` between Task 4 (publish) and Task 5 (tag), which advanced main HEAD with a GSD tooling upgrade commit (`70a15c5`). Tag anchored at HEAD rather than backdating to the version-bump commit — the GSD upgrade lives under `.claude/` which is gitignored from the npm tarball, so the tagged tree faithfully represents the published 1.2.0 surface.
- **Pre-existing Astro frontmatter defect** required a Phase 9-scoped fix commit (`9d01a7b`) before the release gate could go green. Committed with `fix(09-03):` convention. Root cause: Phase 7's `docs/upgrade-recovery.md` shipped without frontmatter; Phase 9 is where release gates first exercised `npm run quality` against it.

## Self-Check: PASSED

- ✓ All 5 task acceptance criteria satisfied
- ✓ Publish confirmed against live registry
- ✓ Tag pushed and visible on origin
- ✓ Smoke test on public tarball clean
- ✓ Milestone v1.2 fully closed in ROADMAP + STATE (prose + frontmatter)
