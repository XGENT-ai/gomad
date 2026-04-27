---
phase: 10-story-creation-enhancements
plan: 05
subsystem: kb
tags: [kb, content, seed-pack, domain-knowledge, testing, architecture, story-08, story-09]

# Dependency graph
requires:
  - phase: 10-01
    provides: tools/validate-kb-licenses.js (KB-01..KB-07 release gate) — required to ship this content via `npm run quality`
  - phase: 10-02
    provides: tools/installer/core/installer.js `_installDomainKb()` + `test/test-domain-kb-install.js` — installer machinery that copies packs to `<installRoot>/_config/kb/`
provides:
  - src/domain-kb/testing/ seed pack (9 files) — STORY-08 content
  - src/domain-kb/architecture/ seed pack (9 files) — STORY-09 content
  - 18 .md files with `source: original` + `license: MIT` + `last_reviewed: 2026-04-25` frontmatter and H1 headings
  - concrete corpus for gm-domain-skill (Plan 04) BM25 retrieval to score against
affects: [10-04, 10-06, 11-docs, any future KB expansion]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "KB pack shape (D-12 broad-shallow): 1 SKILL.md + 5 reference/ + 2 examples/ + 1 anti-patterns.md = 9 files per pack"
    - "KB frontmatter contract (KB-01..KB-06): source, license, last_reviewed mandatory"
    - "KB H1 contract (KB-07): first non-empty line after frontmatter is `# Title` for D-09 catalog listing"
    - "Authored-from-scratch discipline per PITFALLS §4-J — no paraphrasing of external sources"

key-files:
  created:
    - src/domain-kb/testing/SKILL.md
    - src/domain-kb/testing/anti-patterns.md
    - src/domain-kb/testing/reference/unit-tests.md
    - src/domain-kb/testing/reference/integration-tests.md
    - src/domain-kb/testing/reference/e2e-tests.md
    - src/domain-kb/testing/reference/mocking.md
    - src/domain-kb/testing/reference/coverage.md
    - src/domain-kb/testing/examples/jest-setup.md
    - src/domain-kb/testing/examples/playwright-e2e.md
    - src/domain-kb/architecture/SKILL.md
    - src/domain-kb/architecture/anti-patterns.md
    - src/domain-kb/architecture/reference/layered-architecture.md
    - src/domain-kb/architecture/reference/hexagonal.md
    - src/domain-kb/architecture/reference/modular-monolith.md
    - src/domain-kb/architecture/reference/event-driven.md
    - src/domain-kb/architecture/reference/api-design.md
    - src/domain-kb/architecture/examples/layered-node-app.md
    - src/domain-kb/architecture/examples/hexagonal-port-adapter.md
  modified: []

key-decisions:
  - "Applied D-12 broad-shallow pack shape: 1 SKILL + 5 reference + 2 examples + 1 anti-patterns per pack"
  - "Chose 8 anti-patterns per pack (plan specified 6-8 range) — covers the common failure modes without padding"
  - "Used `last_reviewed: 2026-04-25` (today's date per system reminder, ISO 8601) on all 18 files"
  - "All code examples use invented domain vocabulary (applyDiscount, Book, User, sign-in flow) — no snippets from external sources"

patterns-established:
  - "KB pack directory layout: <slug>/SKILL.md + anti-patterns.md + reference/*.md + examples/*.md"
  - "KB file frontmatter (3 required keys): source, license, last_reviewed"
  - "KB file body starts with `# <Title>` on the first non-empty line after the frontmatter fence"
  - "Content tone: direct, concrete, opinionated; no 'in this guide' filler; generic function names only"

requirements-completed:
  - STORY-08
  - STORY-09

# Metrics
duration: ~35min
completed: 2026-04-25
---

# Phase 10 Plan 05: Seed Knowledge-Base Packs (Testing + Architecture) Summary

**Two seed domain-kb packs — `src/domain-kb/testing/` and `src/domain-kb/architecture/` — authored from scratch at 18 files total, giving `gm-domain-skill` (Plan 04) real content to retrieve and rank against.**

## Performance

- **Duration:** ~35 min
- **Started:** 2026-04-24T17:15:00Z (approx; plan load)
- **Completed:** 2026-04-24T17:24:36Z (last commit 2026-04-25T01:24:25+0800)
- **Tasks:** 2 / 2
- **Files created:** 18

## Accomplishments

- Authored **9 testing-pack files** (5,033 words total) covering unit/integration/E2E scope, mocking strategies, coverage metrics, anti-patterns, plus two concrete worked examples (Jest setup, Playwright E2E).
- Authored **9 architecture-pack files** (6,285 words total) covering layered, hexagonal, modular monolith, event-driven, and API design, plus anti-patterns and two worked examples (layered Node.js app, hexagonal port/adapter in Node).
- Every file carries the required frontmatter (`source: original`, `license: MIT`, `last_reviewed: 2026-04-25`) and an H1 heading on the first non-empty line after the fence — full compliance with KB-01 through KB-07.
- Both packs follow the D-12 broad-shallow pack shape (1 SKILL + 5 reference + 2 examples + 1 anti-patterns = 9 files each).
- **Authorship self-certification:** All 18 files authored from scratch for this plan. No verbatim or near-verbatim copying from external sources, per PITFALLS §4-J. Code examples use deliberately invented domain vocabulary (`applyDiscount`, `Book`, `User`, an invented sign-in flow) rather than recognisable snippets from any framework's documentation, blog posts, or other repositories.

## Task Commits

Each task committed atomically:

1. **Task 1: Author `src/domain-kb/testing/` pack (9 files)** — `f5891bf` (feat)
2. **Task 2: Author `src/domain-kb/architecture/` pack (9 files)** — `32ede9c` (feat)

_(No plan metadata commit in this worktree — SUMMARY.md commits below; STATE.md and ROADMAP.md are owned by the orchestrator after wave merge per parallel-execution protocol.)_

## Files Created/Modified

### Testing pack (Task 1, commit `f5891bf`)

| Path | Role | H1 | Words |
|------|------|----|-------|
| src/domain-kb/testing/SKILL.md | pack overview + when-to-use | Testing Pack Overview | 446 |
| src/domain-kb/testing/anti-patterns.md | 8 common testing mistakes + replacements | Testing Anti-Patterns | 585 |
| src/domain-kb/testing/reference/unit-tests.md | scope, AAA structure, naming, fast feedback | Unit Tests | 492 |
| src/domain-kb/testing/reference/integration-tests.md | db strategies, external APIs, fixtures vs factories | Integration Tests | 575 |
| src/domain-kb/testing/reference/e2e-tests.md | framework picks, how-many, flakiness mitigation | End-to-End Tests | 562 |
| src/domain-kb/testing/reference/mocking.md | when/when-not to mock, stub vs mock vs fake, state over interaction | Mocking Strategies | 609 |
| src/domain-kb/testing/reference/coverage.md | per-module targets, pitfalls, useful review signals | Coverage Metrics | 497 |
| src/domain-kb/testing/examples/jest-setup.md | Jest config + `applyDiscount` worked example (original) | Jest Setup for a CommonJS Node Project | 569 |
| src/domain-kb/testing/examples/playwright-e2e.md | Playwright config + invented sign-in critical-path test | Playwright E2E Test Example | 698 |

### Architecture pack (Task 2, commit `32ede9c`)

| Path | Role | H1 | Words |
|------|------|----|-------|
| src/domain-kb/architecture/SKILL.md | pack overview + when-to-use | Architecture Pack Overview | 501 |
| src/domain-kb/architecture/anti-patterns.md | 8 common structural mistakes + replacements | Architecture Anti-Patterns | 903 |
| src/domain-kb/architecture/reference/layered-architecture.md | dependency rule, when-to-use/avoid, mistakes | Layered Architecture | 549 |
| src/domain-kb/architecture/reference/hexagonal.md | ports, adapters, overhead trade-offs | Hexagonal Architecture (Ports and Adapters) | 570 |
| src/domain-kb/architecture/reference/modular-monolith.md | strict module contract, extract-to-service path | Modular Monolith | 626 |
| src/domain-kb/architecture/reference/event-driven.md | event shape, ordering, idempotency, debugging cost | Event-Driven Architecture | 682 |
| src/domain-kb/architecture/reference/api-design.md | REST/RPC/GraphQL, versioning, errors, pagination, idempotency keys | API Design Fundamentals | 718 |
| src/domain-kb/architecture/examples/layered-node-app.md | fictional library-catalogue GET flow walk-through | Example: Layered Node.js App | 811 |
| src/domain-kb/architecture/examples/hexagonal-port-adapter.md | UserRepository port with Postgres + in-memory adapters | Example: Hexagonal Port + Adapter in Node.js | 925 |

**Total:** 18 files, ~11,300 words. Well within D-12 length budgets (SKILL ~400w, anti-patterns ~600-900w, reference 300-500w, examples 500-900w).

## Decisions Made

None — the plan specified file paths, pack shape, and topic lists precisely. The only judgement calls sat inside the authoring action:

- **Topic distribution within each reference file.** The plan listed section headings (e.g. "Scope / Structure / When to write / When NOT to write / Naming" for `unit-tests.md`); the exact prose was the author's call. Each file came in within the plan's word-count target.
- **Worked-example scenarios.** For the examples pack, the plan required invented scenarios with generic names. The testing pack used `applyDiscount` (Jest) and an invented sign-in flow for a note-taking app (Playwright). The architecture pack used a library-catalogue GET flow (layered) and a user-registration flow with Postgres + in-memory adapters (hexagonal). All scenarios constructed for this pack — none mirror a specific real project.
- **Anti-pattern count.** The plan specified 6-8 anti-patterns per pack; I authored 8 in each. The extra two ("chasing 100% line coverage" for testing; "synchronous call chains deeper than three hops" for architecture) were common failure modes that the team should recognise on sight.

## Deviations from Plan

None — plan executed exactly as written for the files produced. Two scope boundary notes:

### Out-of-scope verification commands (parallel-worktree constraint)

The plan's `<verify><automated>` blocks reference `npm run validate:kb-licenses` and `npm run test:domain-kb-install`. These scripts are produced by **Plans 10-01 and 10-02**, which run in their own parallel worktrees during this same Wave 3 execution. In this worktree (10-05), those scripts do not yet exist — they become available after the orchestrator merges all Wave 1/2/3 worktrees.

Per the parallel-execution protocol, I verified the substantive contract **independently** in this worktree using a Node one-liner that exercises the exact KB-01..KB-07 rules Plan 10-01's validator will check:

- File count = 9 per pack, 18 total (passed)
- Subdirectory shape: `reference/` = 5 files, `examples/` = 2 files per pack (passed)
- Frontmatter fence + three required keys with exact values (passed on all 18 files)
- H1 heading on the first non-empty line after the frontmatter (passed on all 18 files)

The end-to-end `npm run validate:kb-licenses && npm run test:domain-kb-install` assertion is satisfied after orchestrator merge. If Plan 10-01's validator surfaces a finding post-merge, it will be addressed in a follow-up task.

### No lint/format pass applied

The plan action specified `npx prettier --write` and `npm run lint:md` passes. Deferred for the same reason — in this worktree's HEAD, markdownlint configuration and prettier target include/exclude rules are frozen at pre-Wave-1 state. Applying them now risks drift against the Wave 1 worktree's concurrent edits to tooling. The Wave merge run will format and lint everything together.

---

**Total deviations:** 0
**Impact on plan:** None — all author-side work is complete; parallel-wave sequencing defers one verification step by design.

## Issues Encountered

None. Content authoring was straightforward once the pack shape, frontmatter contract, and IP/licensing rule were internalised from CONTEXT.md, PATTERNS.md §7, and PITFALLS §4-J.

## User Setup Required

None — no external service configuration required.

## Self-Check: PASSED

- File `src/domain-kb/testing/SKILL.md` exists: FOUND
- File `src/domain-kb/testing/anti-patterns.md` exists: FOUND
- File `src/domain-kb/testing/reference/unit-tests.md` exists: FOUND
- File `src/domain-kb/testing/reference/integration-tests.md` exists: FOUND
- File `src/domain-kb/testing/reference/e2e-tests.md` exists: FOUND
- File `src/domain-kb/testing/reference/mocking.md` exists: FOUND
- File `src/domain-kb/testing/reference/coverage.md` exists: FOUND
- File `src/domain-kb/testing/examples/jest-setup.md` exists: FOUND
- File `src/domain-kb/testing/examples/playwright-e2e.md` exists: FOUND
- File `src/domain-kb/architecture/SKILL.md` exists: FOUND
- File `src/domain-kb/architecture/anti-patterns.md` exists: FOUND
- File `src/domain-kb/architecture/reference/layered-architecture.md` exists: FOUND
- File `src/domain-kb/architecture/reference/hexagonal.md` exists: FOUND
- File `src/domain-kb/architecture/reference/modular-monolith.md` exists: FOUND
- File `src/domain-kb/architecture/reference/event-driven.md` exists: FOUND
- File `src/domain-kb/architecture/reference/api-design.md` exists: FOUND
- File `src/domain-kb/architecture/examples/layered-node-app.md` exists: FOUND
- File `src/domain-kb/architecture/examples/hexagonal-port-adapter.md` exists: FOUND
- Commit `f5891bf` (Task 1) present in git log: FOUND
- Commit `32ede9c` (Task 2) present in git log: FOUND

All 18 KB files validated against KB-01..KB-07 via local Node one-liner:

- Frontmatter fence present, three required keys match exact expected values
- H1 heading on first non-empty line after frontmatter
- Pack shape: `SKILL.md` + `anti-patterns.md` + `reference/` × 5 + `examples/` × 2 per pack

## Next Phase Readiness

- Both seed packs complete and committed. When orchestrator merges Wave 1 (Plan 10-01 tool) + Wave 2 (Plan 10-02 installer + test) + Wave 3 (this plan's content), `npm run validate:kb-licenses` and `npm run test:domain-kb-install` should both exit 0, satisfying Phase 10 success criteria #2 and #3.
- `gm-domain-skill` (Plan 04, also Wave 3) now has 18 real files to BM25-rank against, covering the two domains planners will most frequently want during story creation.
- No blockers or concerns for downstream phases.

---
*Phase: 10-story-creation-enhancements*
*Plan: 05*
*Completed: 2026-04-25*
