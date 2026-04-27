# Phase 11 → Phase 12 Coordination Note

**Created:** during Phase 11 Plan 01 (cleanup)
**Branch:** gsd/phase-11-docs-site-content-authoring

## Why this exists

Per CONTEXT.md D-10/D-11, Phase 11 docs reference the v1.3 install layout
(`<installRoot>/_config/agents/<shortName>.md`) but the npm registry still
serves `@xgent-ai/gomad@1.2.x` which uses the v1.2 layout
(`<installRoot>/gomad/agents/`). To prevent docs from advertising paths
that don't match the shipped npm package, deploy is gated by branch
isolation: this branch does NOT auto-deploy.

## Required Phase 12 action

Phase 12's release plan (Plans TBD) MUST schedule the merge of this
Phase 11 branch into `main` AS PART OF the v1.3.0 release sequence:

1. Phase 12 lands AGENT-* relocation + REL-* release tasks on its own branch.
2. Phase 12 publishes `@xgent-ai/gomad@1.3.0` to npm (REL-03).
3. Phase 12 merges its own branch to `main`, triggering `.github/workflows/docs.yaml`
   which auto-deploys docs to `gomad.xgent.ai`.
4. **At step 3, this Phase 11 branch must already be merged to main** (or
   merged in the same flight) so the live docs reflect v1.3 paths
   simultaneously with the npm release.

## Why this matters

If Phase 11 merges before Phase 12 ships v1.3.0: live docs advertise
v1.3 paths over a v1.2 npm install. Users hit "command not found"
confusion.

If Phase 12 ships v1.3.0 but Phase 11 sits unmerged: live docs still
show stale BMAD content and never reflect the v1.3 reality.

## Verification

DOCS-07 in Phase 12 (`tools/validate-doc-paths.js`) is the final gate
that catches v1.2 path leaks in docs. It runs as part of `npm run quality`
on the release commit. Phase 11 declares "authored to v1.3 spec"; Phase 12
enforces.
