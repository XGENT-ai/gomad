---
name: branch-workflow
description: Name branches, establish topology, and select a merge strategy in Git.
license: MIT
last_reviewed: 2026-05-02
---

## Discovering the Default Branch

Run this before branching or opening a PR:

```bash
# Preferred: requires gh CLI and a GitHub remote
gh repo view --json defaultBranchRef --jq '.defaultBranchRef.name'

# Fallback: infer from remote HEAD ref
git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@'

# Last resort: probe known names
if git rev-parse --verify main >/dev/null 2>&1; then
  echo main
elif git rev-parse --verify master >/dev/null 2>&1; then
  echo master
else
  echo "ERROR: cannot determine default branch" >&2
fi
```

Store the result and use the actual branch name in all subsequent commands.

## Branch Naming

Format: `type/description-TICKET-ID`

| Example | Notes |
|---------|-------|
| `feat/add-login-SEND-77` | Feature with ticket |
| `fix/pool-party-stall-SEN-68` | Bug fix with ticket |
| `hotfix/auth-bypass` | Hotfix without ticket |
| `chore/update-deps` | Maintenance without ticket |

Omit the ticket ID when no issue exists. Use the repo's documented naming convention first — this format is the fallback.

## Branch Topology

```
{production-branch}          ← live deploys
 └── {default-branch}        ← staging / PR target
      ├── feat/...
      ├── fix/...
      └── hotfix/*           ← branches off production, not default
```

- Feature and fix branches start from the **default branch**.
- Hotfix branches start from the **production branch**.
- PRs target the default branch unless the repo uses a single-branch flow.
- When default branch == production branch, all PRs target that branch directly.

## Merge Strategy

Use the repo merge policy first. Default fallback:

| PR | Strategy | Reason |
|----|----------|--------|
| Feature/fix → default branch | Squash merge | One commit per feature, clean history |
| Default branch → production | Merge commit | Preserves release boundary; visible deploy points in log |
| Hotfix → production | Squash merge | Single atomic fix on production |

## Force Push Safety

When rewriting history on a branch (rebase, amend), always:

```bash
git push --force-with-lease origin {branch}
```

Never use plain `--force`. `--force-with-lease` rejects the push if someone else has pushed to the branch since your last fetch, preventing you from silently overwriting their work.

## When NOT to Apply

- Repo has a documented branch policy in CONTRIBUTING.md or team wiki — defer to it.
- Monorepo with automated release tooling (changesets, semantic-release) — follow tooling constraints.
- Open-source project with enforced maintainer flow — match the existing pattern.

## Common Failure Modes

| Mistake | Fix |
|---------|-----|
| Hotfix branched off default instead of production | Re-base onto the production branch |
| `--force` instead of `--force-with-lease` on push | Always use `--force-with-lease` |
| Squash-merging default→production | Use merge commit to keep release boundary visible |
| Skipping branch discovery | Run discovery commands first; never assume `main` or `master` |
