---
phase: 260430-kod
plan: 01
subsystem: tooling
tags: [skill-frontmatter, claude-md, behavioral-guidelines]
requires: []
provides:
  - "gm-domain-skill argument-hint frontmatter declaration"
  - "Project-root CLAUDE.md (local) with fenced behavioral-guidelines block for future upgrade"
affects:
  - "src/gomad-skills/4-implementation/gm-domain-skill/SKILL.md"
  - "CLAUDE.md (local, gitignored)"
tech_stack:
  added: []
  patterns:
    - "HTML-comment fence markers for wholesale block replacement (<!-- gomad:start --> / <!-- gomad:end -->)"
    - "argument-hint frontmatter convention from .claude/commands/gsd/quick.md (angle = required, square = optional)"
key_files:
  created:
    - "CLAUDE.md (local, gitignored — per-developer file with replaceable gomad block)"
  modified:
    - "src/gomad-skills/4-implementation/gm-domain-skill/SKILL.md"
decisions:
  - "Add argument-hint between name and description in SKILL.md frontmatter (preserves description verbatim, surgical insertion)"
  - "Wrap entire CLAUDE.md block (including H1) in <!-- gomad:start --> / <!-- gomad:end --> so future gomad upgrades can replace just the block, leaving the rest of a developer's local CLAUDE.md intact"
  - "CLAUDE.md remains gitignored (project policy under 'AI assistant files'). The fence enables LOCAL upgrade — not git-versioned upgrade. Each developer's CLAUDE.md is their own; only the gomad-fenced block is system-managed."
metrics:
  duration_seconds: 128
  duration_human: "2m 8s"
  tasks_completed: 2
  files_changed: 2
  insertions: 68
  deletions: 0
  completed: "2026-04-30T05:16:00Z"
requirements_completed:
  - QUICK-260430-kod-01
  - QUICK-260430-kod-02
status: complete
---

# Phase 260430-kod Plan 01: v1.3.1 — argument-hint + CLAUDE.md Seed Summary

Added `argument-hint: "<domain_slug> [query]"` to gm-domain-skill SKILL.md frontmatter and seeded a local project-root CLAUDE.md with the agreed behavioral-guidelines block, fenced by `<!-- gomad:start -->` / `<!-- gomad:end -->` so a future gomad upgrade can replace just that block in each developer's local CLAUDE.md.

## Tasks

| # | Task | Status | Commit | Files |
|---|------|--------|--------|-------|
| 1 | Add argument-hint to gm-domain-skill SKILL.md frontmatter | done | `c23511a` | `src/gomad-skills/4-implementation/gm-domain-skill/SKILL.md` |
| 2 | Seed local CLAUDE.md with fenced behavioral-guidelines block | done | (local file — not committed; gitignored per project policy) | `CLAUDE.md` |

## What Changed

### Task 1: SKILL.md frontmatter
- Inserted single new line `argument-hint: "<domain_slug> [query]"` between `name:` and `description:`.
- Preserved the existing single-quoted description verbatim (including embedded escaped apostrophes).
- Frontmatter now reads in order: `name` → `argument-hint` → `description`.
- Body line `Follow the instructions in ./workflow.md.` unchanged.

### Task 2: Local CLAUDE.md
- Created `CLAUDE.md` at the project root as a local, untracked file (`.gitignore:37` remains in effect).
- Verbatim block: H1 + tradeoff paragraph + four numbered sections (Think Before Coding, Simplicity First, Surgical Changes, Goal-Driven Execution) + closing paragraph.
- Entire block (including H1) wrapped by `<!-- gomad:start -->` / `<!-- gomad:end -->` so future gomad upgrades can do a regex replace on the fence to update just the block, leaving any user-added content outside the fence intact.
- Inner triple-backtick code fence (around the numbered plan template) preserved exactly.
- Unicode arrows `→` (U+2192) preserved in section 4 (not converted to `->`).

## Verification

```
$ grep -n '^argument-hint:' src/gomad-skills/4-implementation/gm-domain-skill/SKILL.md
3:argument-hint: "<domain_slug> [query]"

$ head -1 CLAUDE.md
<!-- gomad:start -->

$ tail -1 CLAUDE.md
<!-- gomad:end -->

$ grep -c '^# CLAUDE\.md$' CLAUDE.md
1

$ git check-ignore -v CLAUDE.md
.gitignore:37:CLAUDE.md	CLAUDE.md
```

CLAUDE.md is correctly local-only (gitignored). Frontmatter argument-hint is committed.

## Deviations from Plan

**1. [Resolved at orchestrator merge] Executor auto-removed `CLAUDE.md` from `.gitignore`**
- **Detected by orchestrator before merge:** the executor (working in worktree) interpreted "easy replacement in future version" as requiring git tracking and removed `CLAUDE.md` from `.gitignore:37` on the worktree branch (Rule 3 auto-fix flagged it but the orchestrator caught it).
- **User clarified intent:** CLAUDE.md should stay gitignored (per-dev local file). The "easy replacement" goal is satisfied at the **local** level — future gomad upgrades replace the gomad-fenced block in each dev's local CLAUDE.md via regex match, not via git versioning.
- **Resolution:** Cherry-picked only the SKILL.md change (commit `c23511a`) onto main. Copied the CLAUDE.md file content from the worktree as a local untracked file. Discarded the `.gitignore` change. Worktree branch deleted.
- **Final touched paths:** `src/gomad-skills/4-implementation/gm-domain-skill/SKILL.md` (committed) + `CLAUDE.md` (local, untracked).

## Authentication Gates

None.

## Known Stubs

None.

## Self-Check: PASSED

- File `src/gomad-skills/4-implementation/gm-domain-skill/SKILL.md` exists with `argument-hint` line at line 3 — FOUND
- File `CLAUDE.md` exists at project root with correct fence markers, gitignored — FOUND
- `.gitignore` unchanged from pre-task state — VERIFIED
- Commit `c23511a` (Task 1, cherry-picked from worktree) — FOUND in `git log`
- No commit for Task 2 (intentional — CLAUDE.md is gitignored local file).
