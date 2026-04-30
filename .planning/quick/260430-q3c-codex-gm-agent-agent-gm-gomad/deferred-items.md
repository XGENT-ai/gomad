# Deferred Items — 260430-q3c

Issues observed during execution that are OUT OF SCOPE for this quick task.

## Pre-existing failure: `test:claude-md` "B. new gomad block (template) inserted"

**Discovered:** during Task 2 `npm test` aggregate run.

**Cause:** The worktree has an unstaged modification to
`tools/installer/assets/CLAUDE.md.template` that strips the leading
"# CLAUDE.md" header and the "Behavioral guidelines to reduce common LLM
coding mistakes" sentence from the template body. The test expects that
exact sentence in the inserted block.

**Verification this is pre-existing, not caused by this task:**
Stashed all working changes (including the `CLAUDE.md.template` modification),
ran `node test/test-claude-md-install.js` against the base commit
`1b1dc59` — got `21 passed, 0 failed`. Restored stash. Confirmed the
modification to `CLAUDE.md.template` was already present in the worktree at
`git status` time before this task began (see initial `gitStatus` snapshot
in the executor handoff).

**Action:** None — this task does not touch `CLAUDE.md.template` or
`test-claude-md-install.js`. The orchestrator / a separate task should
either revert the `CLAUDE.md.template` change or update the test
expectations to match the new template body.
