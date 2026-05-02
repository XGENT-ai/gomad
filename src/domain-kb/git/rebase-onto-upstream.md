---
name: rebase-onto-upstream
description: Rebase a feature branch onto the latest upstream safely in Git.
license: MIT
last_reviewed: 2026-05-02
---

## Rebase vs Merge Decision

| Situation | Use |
|-----------|-----|
| Feature branch, only you have pushed | Rebase — linear history |
| Feature branch, colleagues have based work on it | Merge — rebase would break their history |
| Shared branch (main, dev, production) | Never rebase — merge only |
| Branch contains merge commits to preserve | `git rebase --rebase-merges` |
| Branch contains merge commits to flatten | Plain `git rebase` |

## Step-by-Step

### 1. Check state

```bash
git status
git branch --show-current
```

If `git status` shows an in-progress merge, rebase, or cherry-pick — finish or abort that first.

### 2. Fetch latest

```bash
git fetch origin
```

### 3. Create a backup tag (local only — do not push)

```bash
git tag -a {branch}-rebase-backup-$(date +%Y%m%d-%H%M%S) -m "pre-rebase backup" HEAD
```

Record the tag name. Use it to restore if the rebase goes wrong.

### 4. Check for merge commits in branch

```bash
git rev-list --count --merges origin/{base_branch}..HEAD
```

- **0** → use plain `git rebase origin/{base_branch}`
- **> 0** → choose: preserve with `--rebase-merges`, or flatten with plain rebase

### 5. Run the rebase

```bash
# Plain rebase (most common)
git rebase origin/{base_branch}

# Preserve merge commits
git rebase --rebase-merges origin/{base_branch}
```

### 6. Conflict resolution

For each conflict:

```bash
git status          # list conflicted files
git diff            # inspect conflict hunks
git show            # see the commit being replayed
```

| Conflict type | Resolution |
|---------------|------------|
| Lockfile (`package-lock.json`, `Cargo.lock`, `go.sum`) | Accept upstream version; regenerate: `npm install` / `cargo build` / `go mod tidy` |
| Generated file (protobuf, graphql schema, migrations) | Accept upstream; regenerate from source |
| Ambiguous product logic (unclear which behavior is correct) | Stop. Ask. Do not invent behavior. |
| Unambiguous feature addition with no upstream overlap | Keep feature branch version |

After resolving each file:

```bash
git add <resolved-file>
git rebase --continue
```

To abandon entirely (safe — restores pre-rebase state):

```bash
git rebase --abort
```

### 7. Verify

```bash
git log --oneline --decorate origin/{base_branch}..HEAD
```

Run tests, typecheck, and lint if available.

### 8. Push

```bash
git push --force-with-lease origin HEAD:{branch_name}
```

Never use plain `--force`. `--force-with-lease` rejects the push if someone else pushed to the branch since your last fetch.

## Recovery

If the rebase produced a bad result, restore from the backup tag:

```bash
git reset --hard {backup_tag}
```

## When NOT to Apply

- **Shared branches** (main, dev, staging, production) — use merge, never rebase.
- **Colleagues have based work on your branch** — coordinate before rewriting history; rebase will break their local branches.
- **PR is open and reviewers have commented on specific commits** — a rebase relocates commit SHAs and invalidates review comments; squash or merge instead.

## Common Failure Modes

| Failure | Cause | Fix |
|---------|-------|-----|
| Rebase fails immediately | Dirty working tree | `git stash` or commit uncommitted changes first |
| Lockfile conflict produces invalid result | Hand-editing a generated file | Accept upstream version, then regenerate |
| `--force-with-lease` rejected | Someone else pushed to the branch | `git fetch`; review their changes; rebase again |
| Duplicate commits after `--rebase-merges` | Complex merge history | Abort; use plain rebase and flatten |
| Ambiguous conflict resolved incorrectly | Guessing product behavior | Abort; ask the original author |
