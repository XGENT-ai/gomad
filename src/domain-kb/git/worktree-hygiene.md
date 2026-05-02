---
name: worktree-hygiene
description: Clean up stale branches and worktrees in a bare-repo Git layout.
license: MIT
last_reviewed: 2026-05-02
---

## Applicability

This procedure applies to repos using a **bare-repo + worktree layout**:
- The `.git` entry is a file pointing to a `.bare/` directory, or
- `git rev-parse --is-bare-repository` returns `true`

For standard single-worktree repos: skip steps 3–4, 6, and 8 (worktree-specific). Run only the fetch/branch cleanup.

## Step-by-Step

### 1. Locate the bare root

```bash
git rev-parse --git-common-dir
```

Run all branch and worktree management commands from this directory.

### 2. Fetch and prune

```bash
git fetch --prune origin
```

Updates all remote-tracking refs and removes refs for deleted remote branches. Note what was pruned.

### 3. Find stale branches

```bash
git branch -vv | grep ': gone]'
```

Collect the branch names whose upstream no longer exists on origin.

### 4. Find stale worktrees

```bash
git worktree list
git worktree prune --dry-run
```

Cross-reference the worktree list against the gone branches. For each potentially stale worktree:

```bash
cd <worktree-path> && git status --short
```

Categorize:

| State | Action |
|-------|--------|
| Clean + upstream gone | Safe to remove |
| Dirty + upstream gone | Flag for user review; do not remove without explicit approval |
| Path already deleted | Prunable metadata — safe to prune |

### 5. Confirm before deleting

Present the full list and wait for confirmation. Example summary:

```
Stale worktrees to remove:
  worktrees/feat-login  (feat/add-login-SEND-77)  [clean]
  worktrees/feat-pay    (feat/add-payment-SEN-42) [dirty — 3 uncommitted changes]

Stale branches to delete:
  feat/add-login-SEND-77
  fix/old-bug-SEN-10

Prunable worktree metadata:
  worktrees/old-worktree  (path no longer exists)
```

### 6. Remove stale worktrees

```bash
git worktree remove <name>
```

If removal fails due to dirty state, report and skip unless the user explicitly approves.

### 7. Delete stale branches

```bash
git branch -D branch1 branch2 ...
```

### 8. Prune worktree metadata

```bash
git worktree prune -v
```

### 9. Fast-forward important branches

For `main`, `dev`, or other branches with dedicated worktrees:

```bash
cd <worktree-path> && git pull --ff-only origin <branch>
```

If `--ff-only` fails, the local branch has diverged. Report it and ask for guidance — do not merge or rebase automatically.

## When NOT to Apply

- **Single-worktree repos** — worktree management steps are unnecessary; run only fetch and branch cleanup.
- **Branches with unpushed commits** — verify nothing is lost before deleting.
- **`--ff-only` fails on an important branch** — stop and investigate before taking any action.

## Common Failure Modes

| Failure | Cause | Fix |
|---------|-------|-----|
| `git worktree remove` fails | Worktree has uncommitted changes | Check `git status` inside the worktree; stash or commit first |
| `git pull --ff-only` fails on main | Local branch has diverged (amend, reset, etc.) | Run `git log --oneline origin/main..main` to inspect; ask before resetting |
| Deleted branch still had unpushed work | Cleanup ran before the author pushed | Check `git reflog` or ask the author; restore with `git checkout -b {branch} {sha}` |
| Branch delete command fails | Running from a worktree subdirectory, not the bare root | Use `git rev-parse --git-common-dir` to find the correct working directory |
