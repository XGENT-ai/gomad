# Phase 2: Rename - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-08
**Phase:** 02-rename
**Areas discussed:** Plan decomposition, Git rename mechanism, Content sweep tooling + excludes, Loose ends (artifacts filename + docs/mobmad-plan.md)

---

## Plan decomposition

| Option | Description | Selected |
|--------|-------------|----------|
| Layered: 3 plans | 02-01 FS renames (FS-01..05 + atomic bin/main update) → 02-02 Content sweep (TXT-01..03) → 02-03 Test fixtures + validation (TXT-04). Clean dependency chain, each plan independently verifiable | ✓ |
| Single mega-plan | One 02-01-PLAN covering everything. Less coordination overhead but harder to review and rollback | |
| By tree: 4 plans | 02-01 core-skills, 02-02 bmm-skills, 02-03 installer/CLI/tests, 02-04 content sweep. More granular but cross-cutting | |

**User's choice:** Layered: 3 plans
**Notes:** Straight recommendation accepted. Dependency chain is strict: sweep depends on final paths existing; tests depend on sweep being complete.

---

## Git rename mechanism

| Option | Description | Selected |
|--------|-------------|----------|
| git mv + separate commits | Per plan: first commit does pure `git mv`, second commit updates references. Preserves blame across ~41 skill dirs | ✓ |
| Single commit per plan | Rename + edit refs in same commit. Git rename detection may fail if content changes >50% | |
| Scripted bulk rename | One shell/Node script does all moves + edits in one shot. Worst history preservation | |

**User's choice:** git mv + separate commits
**Notes:** History preservation across the ~41 skill directories is important — `git log --follow` and `git blame` need to continue working after the rename.

---

## Content sweep tooling

| Option | Description | Selected |
|--------|-------------|----------|
| Committed Node script | Write `tools/dev/rename-sweep.js` that applies the case-preserving mapping with explicit excludes. Auditable, reproducible, re-runnable | ✓ |
| Ad-hoc agent edits | Executor agent reads/edits files directly. No persistent script, easier for edge cases | |
| One-shot bash sed script | Throwaway sed pipeline. Fast but no re-runnability and macOS sed has case gotchas | |

**User's choice:** Committed Node script

## Sweep exclusions

| Option | Description | Selected |
|--------|-------------|----------|
| Explicit exclude list in script | Hard-coded array of file paths + per-file line-range markers. Explicit and reviewable | ✓ |
| Sentinel comments in files | Add `<!-- rename-sweep:skip-start -->` markers. More invasive but survives future sweeps | |
| Skip whole files only | Exclude LICENSE, CHANGELOG.md, TRADEMARK.md entirely | |

**User's choice:** Explicit exclude list in script
**Notes:** Initial exclude list: LICENSE, CHANGELOG.md, TRADEMARK.md, CONTRIBUTORS.md, README.md, README_CN.md, `.planning/**`, `node_modules/**`, `.git/**`, `build/**`. README files are excluded because Phase 3 rewrites them entirely with new prose — no mechanical sweep needed.

---

## Loose ends

### Artifacts filename

| Option | Description | Selected |
|--------|-------------|----------|
| artifacts.js | Drop the brand prefix entirely. Directory namespace `ide/shared/` provides context | ✓ |
| gomad-artifacts.js | Explicit gomad branding, consistent with `gomad-cli.js` | |

**User's choice:** artifacts.js
**Notes:** Consistent with the manifest-filename decision (FS-03 also dropped the `bmad-` prefix rather than replacing it).

### docs/mobmad-plan.md

| Option | Description | Selected |
|--------|-------------|----------|
| Delete outright | Stale document from superseded product direction. Purely dead weight | ✓ (via user correction) |
| Archive to .planning/history/ | Preserves context but adds noise | |

**User's choice:** Delete outright — but raised a legitimate concern: "why do we still have docs/mobmad-plan.md, are you copied from main branch? we should only work on next branch, main branch should be abandoned"

**Investigation result:**
- Current branch confirmed as `next`
- `git log HEAD -- docs/mobmad-plan.md` shows the file was introduced by commit `ad2434b refactor: new start for next` — the Phase 1 reset commit itself
- So the file is NOT a main-branch leak; it was accidentally committed as part of the `next` reset when the codebase was trimmed down. Still dead weight on next, still deleted in Phase 2.
- Noted in CONTEXT.md <specifics>: if the sweep surfaces other suspicious stale files from the reset commit, flag them to the user before deleting silently.

---

## Claude's Discretion

- Exact ordering of `git mv` commits within a plan (as long as rename-only commits precede reference-update commits)
- Regex anchoring specifics in `rename-sweep.js` for the `bmm` trigram (whole-word / identifier segment)
- How to split the ~41 skill directory renames across commits for reviewable diff sizes
- Whether to add `tools/dev/rename-sweep.js` to `.eslintignore`

## Deferred Ideas

- Credit/branding/docs rewrite — Phase 3
- `npm run quality` full gate — Phase 4 VFY-01
- npm publish + v1.0.0 deprecation — Phase 4 REL-01/REL-02
- New gomad-specific agents/skills — Milestone 2
- Proactive audit for other stale files from the `next` reset commit (reactive flagging only)
