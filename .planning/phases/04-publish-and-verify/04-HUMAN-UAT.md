---
status: partial
phase: 04-publish-and-verify
source: [04-VERIFICATION.md]
started: 2026-04-07T14:40:02Z
updated: 2026-04-07T14:40:02Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Run `npm publish` to the public npm registry
expected: `@xgent-ai/gomad@1.0.0` is published to https://registry.npmjs.org/ with public access. Requires @xgent-ai scope ownership and an authenticated `npm whoami`. Phase 4 configures the package for publishing but does not actually publish — this is an intentional human gate.
result: [pending]

### 2. Post-publish smoke test on a fresh machine
expected: On a clean workstation (no local gomad checkout), `npx @xgent-ai/gomad install --preset full --yes` in a throwaway project directory creates a populated `./.claude/` tree with rules, commands, agents, and scripts/hooks — confirming the real npx resolution path works end-to-end against the live registry.
result: [pending]

## Summary

total: 2
passed: 0
issues: 0
pending: 2
skipped: 0
blocked: 0

## Gaps
