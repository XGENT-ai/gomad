# Phase 10 — Deferred Items (discovered during execution)

## 10-04 executor — pre-existing validate-skills.js --strict failures

**Discovered during:** Plan 10-04 Task 1 verification run.

**Issue:** `node tools/validate-skills.js --strict` exits with 4 CRITICAL findings — all from the Wave 1 KB packs shipped by Plan 10-05:

```
src/domain-kb/architecture
  [CRITICAL] SKILL-02 — SKILL.md Must Have name in Frontmatter
  [CRITICAL] SKILL-03 — SKILL.md Must Have description in Frontmatter
src/domain-kb/testing
  [CRITICAL] SKILL-02 — SKILL.md Must Have name in Frontmatter
  [CRITICAL] SKILL-03 — SKILL.md Must Have description in Frontmatter
```

**Root cause:** `tools/validate-skills.js` `discoverSkillDirs` walks `src/` recursively and treats any directory containing a `SKILL.md` as a skill. KB pack `SKILL.md` files are semantic _pack manifests_ (carrying `source`, `license`, `last_reviewed` frontmatter) — NOT skill manifests — and therefore lack `name`/`description`.

**Why NOT fixed in 10-04:** Out of scope. The issue pre-dates 10-04 and lives in Wave 1 output (files created by 10-05). Per executor scope rule, plan 10-04 only auto-fixes issues directly caused by its own changes. My new files under `src/gomad-skills/4-implementation/gm-domain-skill/` produce ZERO new findings. 10-04 passes "no regression" semantics.

**Fix required in a future plan or patch release:** Either:

1. Add `src/domain-kb/**` to `discoverSkillDirs` skip list (preferred — KB packs aren't skills); OR
2. Extend KB pack SKILL.md frontmatter with `name: <slug>` + `description: <one-liner>` (minimal but creates naming-shape ambiguity with real skills).

Option 1 is the cleanest; recommend addressing as a small follow-up (possibly folded into Plan 10-06 install flow validation or a Phase 11 cleanup ticket).

**Verification 10-04 DID run that IS green:**

- `npm run lint:md` → exits 0 for all 5 new files
- Every 10-04 acceptance_criteria probe → passes
- Task 1/2/3 automated verify scripts → all return `OK`
- My new files produce zero validate-skills findings in isolation
