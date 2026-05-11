---
name: commit-conventions
description: Write git commit messages following the Conventional Commits format.
license: MIT
last_reviewed: 2026-05-02
---

# Conventional Commits

## Format

```
type(scope): description

[optional body]
```

Subject line rules:
- Lowercase, imperative mood, no trailing period
- Under 72 characters
- Scope is optional but preferred when a clear subsystem exists

## Type Taxonomy

| Type | Use for |
|------|---------|
| `feat` | New functionality |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `refactor` | Restructuring without behavior change |
| `perf` | Performance improvement |
| `chore` | Maintenance, dependencies, tooling |
| `test` | Adding or updating tests |
| `ci` | CI/CD pipeline changes |
| `build` | Build system changes |
| `style` | Formatting, whitespace (no logic change) |

Breaking change: append `!` after the type/scope (`refactor(api)!: ...`) and explain what breaks in the body.

## When to Add a Body

The subject line carries the **what**. Add a body only when the **why** is non-obvious.

| Add body when... | Skip body when... |
|------------------|-------------------|
| Motivation or tradeoff is non-obvious | Change speaks for itself (`fix(shell): restore Alt+F navigation`) |
| Multiple parts benefit from a bullet list | Single-file fix with a clear subject |
| Needs external context (issue link, root cause, `Fixes TICKET-ID`) | Routine chore or dependency bump |

## Real Examples

Single-line fix — no body:
```
fix(shell): restore Alt+F terminal navigation
```

Root-cause body:
```
fix(shell): use HOMEBREW_PREFIX to avoid path_helper breaking plugins in login shells

macOS path_helper reorders PATH in login shells, putting /usr/local/bin
before /opt/homebrew/bin. This caused `brew --prefix` to resolve the stale
Intel Homebrew, so fzf, zsh-autosuggestions, and zsh-syntax-highlighting
all silently failed to load in Ghostty (which spawns login shells).

Use the HOMEBREW_PREFIX env var (set by brew shellenv in .zshenv) instead
of calling `brew --prefix` — it survives path_helper and is faster.
```

Multi-part feature with bullets:
```
feat(install): add claude bootstrap runtime management

- migrate Claude defaults to declarative files under claude/defaults
- add claude-bootstrap check/fix/uninstall with backup-first migration
- stop stowing full claude/codex runtime trees and tighten drift checks
```

Ticket reference:
```
fix(pool-party): handle stale settlement state on reconnect

PoolSettlement contract stays in pending state when the participant
disconnects mid-settlement. Check settlement timestamp and expire
stale entries on reconnect.

Fixes SEND-718
```

Breaking change:
```
refactor(api)!: change auth endpoint response format

The /auth/token endpoint now returns { access_token, expires_in }
instead of { token, expiry }. All clients must update their parsers.
```

Submodule bump:
```
chore(submodule): update claude-code

Bump claude-code to 88d0c75 (feat(skills): add tiltup, specalign, and e2e skills).
```

## When NOT to Apply

- The repo has a commit linter config (`commitlint.config.js`, `.commitlintrc`) — follow that schema.
- The repo's CONTRIBUTING.md specifies a different convention — defer to it.
- Team uses Jira-prefixed commits (`PROJECT-123: fix thing`) by established convention — keep consistency.

## Common Failure Modes

| Mistake | Fix |
|---------|-----|
| Vague description: `chore: update stuff` | Name the subsystem: `chore(deps): bump typescript to 5.4` |
| Scope is the filename, not the subsystem | `fix(auth.ts): ...` → `fix(auth): ...` |
| Body restates the subject | Cut the body; the subject is enough |
| Past tense: `fixed the bug` | Imperative: `fix the bug` |
| Trailing period in subject | Remove it |
| Body added for an obvious one-liner | Delete the body |
