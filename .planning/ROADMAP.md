# Roadmap: GoMad

## Milestones

- ✅ **v1.1 Rename & Rebrand** — Phases 1-4 (shipped 2026-04-18) — see [milestones/v1.1-ROADMAP.md](./milestones/v1.1-ROADMAP.md)
- ✅ **v1.2 Agent-as-Command & Coding-Agent PRD Refinement** — Phases 5-9 (shipped 2026-04-24) — see [milestones/v1.2-ROADMAP.md](./milestones/v1.2-ROADMAP.md)
- 🚧 **v1.3 Docs, Story Context & Agent Relocation** — Phases 10-12 (in progress)

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (10.1, 10.2): Urgent insertions (marked INSERTED) between integers

Decimal phases appear between their surrounding integers in numeric order. Phase numbering continues from v1.2 (ended at Phase 9) — v1.3 starts at Phase 10. The marketplace workstream (former Phase 10) was dropped 2026-04-24; subsequent phases renumbered 11→10, 12→11, 13→12.

<details>
<summary>✅ v1.1 Rename & Rebrand (Phases 1-4) — SHIPPED 2026-04-18</summary>

- [x] Phase 1: Foundation (2/2 plans) — completed 2026-04
- [x] Phase 2: Rename (3/3 plans) — completed 2026-04
- [x] Phase 3: Credit, Branding & Docs (2/2 plans) — completed 2026-04
- [x] Phase 4: Verification & Release (3/3 plans) — completed 2026-04-18

</details>

<details>
<summary>✅ v1.2 Agent-as-Command & Coding-Agent PRD Refinement (Phases 5-9) — SHIPPED 2026-04-24</summary>

- [x] Phase 5: Foundations & Command-Surface Validation (3/3 plans) — completed 2026-04-19
- [x] Phase 6: Installer Mechanics — Copy + Manifest + Stub Generation (3/3 plans) — completed 2026-04-20
- [x] Phase 7: Upgrade Safety — Manifest-Driven Cleanup (2/2 plans) — completed 2026-04-21
- [x] Phase 8: PRD + Product-Brief Content Refinement (5/5 plans) — completed 2026-04-22
- [x] Phase 9: Reference Sweep + Verification + Release (3/3 plans) — completed 2026-04-24

See [milestones/v1.2-ROADMAP.md](./milestones/v1.2-ROADMAP.md) for full phase details.

</details>

### 🚧 v1.3 Docs, Story Context & Agent Relocation (Phases 10-12)

**Milestone Goal:** Enrich the 4-implementation story workflow with a discuss step plus a domain-knowledge framework, ship initial docs content to `gomad.xgent.ai`, and restructure the agent install path. Ship as `@xgent-ai/gomad@1.3.0` with explicit BREAKING callout for the agent-dir relocation.

**Structure:** 3 phases, coarse granularity. Phases 10/11 are independent and parallel-safe, but the shipping order matters: story-creation lands first (exercises `_config/<subdir>/` greenfield path as warm-up for relocation), docs content authored second (references the post-v1.3 install layout), then Phase 12 executes the agent-dir relocation with exclusive lock — simultaneously shipping the release (CHANGELOG BREAKING + `npm publish` + `v1.3.0` tag). The 3-phase plan is justified because AGENT-* and REL-* are so tightly coupled — REL-02 quality gate depends on every AGENT-* test, AGENT-10 extends `verify-tarball.js` which is the release gate itself, and CHANGELOG BREAKING (REL-01) is specifically about the agent-dir move. Splitting them would manufacture an artificial boundary. (Marketplace refresh — formerly Phase 10 — was dropped 2026-04-24; see `.planning/REQUIREMENTS.md` Out of Scope.)

- [ ] **Phase 10: Story-Creation Enhancements** — Ship `gm-discuss-story` + `gm-domain-skill` under `4-implementation/`, 2 seed KB packs in `src/domain-kb/`, installer `_installDomainKb()` step copying to `<installRoot>/_config/kb/`, context auto-load in `gm-create-story`, and `validate-kb-licenses.js` gate.
- [ ] **Phase 11: Docs Site Content Authoring** — Author Install / Quick-Start / Agents / Skills / Architecture / Contributing pages plus zh-cn parity under `docs/**`; Starlight auto-deploy pipeline (already shipped in v1.2) handles publishing to `gomad.xgent.ai`.
- [ ] **Phase 12: Agent Dir Relocation + Release** — Relocate persona bodies `<installRoot>/gomad/agents/` → `<installRoot>/_config/agents/` across 11 touchpoints, fix `newInstallSet` latent bug, tweak custom-file detector, add v1.2→v1.3 upgrade test, finalize DOCS-07 path sweep, publish `@xgent-ai/gomad@1.3.0` with BREAKING callout.

## Phase Details

### Phase 10: Story-Creation Enhancements
**Goal**: Developer can run `gm-discuss-story` before `gm-create-story` to crystallize gray areas, `gm-create-story` auto-loads that context, and coding agents can retrieve from a 2-pack seed domain knowledge base via `gm-domain-skill` — all shipped with zero new runtime deps and provable IP cleanliness.
**Depends on**: Nothing (additive; exercises greenfield `_config/kb/` path without touching `_config/agents/`)
**Requirements**: STORY-01, STORY-02, STORY-03, STORY-04, STORY-05, STORY-06, STORY-07, STORY-08, STORY-09, STORY-10, STORY-11, STORY-12
**Success Criteria** (what must be TRUE):
  1. Developer running `gm-discuss-story` for story `1-2-user-auth` produces `{planning_artifacts}/1-2-user-auth-context.md` with locked sections (`<domain>`, `<decisions>`, `<canonical_refs>`, `<specifics>`, `<deferred>`) at ≤1500 tokens; re-running shows defined idempotency behavior (overwrite / append / abort).
  2. Developer subsequently running `gm-create-story` for the same story automatically merges the context.md into the story draft; missing context.md emits a hint (not an error); conflicts between context.md and user prompt resolve to prompt-wins with a visible warning listing the conflict lines.
  3. Developer running `gm-domain-skill testing "how do I write a flaky test detector?"` returns content from `<installRoot>/_config/kb/testing/` ranked by BM25-normalized scoring; a typo slug (e.g., `testig`) produces a "did you mean: testing, architecture" fallback via Levenshtein; truly empty result returns an explicit "no match" (not silent weak hit).
  4. Fresh `gomad install` lands `<installRoot>/_config/kb/testing/` + `<installRoot>/_config/kb/architecture/` populated from `src/domain-kb/`, every file tracked in `files-manifest.csv` under `install_root="_gomad"`; re-install is idempotent.
  5. Developer running `npm run quality` sees `validate-kb-licenses.js` exit 0 — every KB file has `source:`, `license:`, `last_reviewed:` frontmatter; any pack missing attribution blocks the release.
**Plans:** 6 plans
Plans:
- [x] 10-01-PLAN.md — KB license validator + npm run quality wire (release gate; STORY-10)
- [x] 10-02-PLAN.md — Installer _installDomainKb() + install-paths.js kbDir + test-domain-kb-install (STORY-11)
- [x] 10-03-PLAN.md — gm-discuss-story skill (5 files; STORY-01, STORY-02, STORY-03)
- [x] 10-04-PLAN.md — gm-domain-skill (5 files; STORY-06, STORY-07)
- [x] 10-05-PLAN.md — Seed KB packs: testing/ + architecture/ (18 files; STORY-08, STORY-09)
- [x] 10-06-PLAN.md — Patch gm-create-story (discover-inputs.md + workflow.md; STORY-04, STORY-05, STORY-12)

### Phase 11: Docs Site Content Authoring
**Goal**: Visitors to `gomad.xgent.ai` can read tutorials (install, quick-start), reference pages (agents, skills), explanation (architecture), and contributing guide in both English and Chinese — content deployed automatically by the existing Starlight GH Actions pipeline on push to main.
**Depends on**: Nothing for content authoring (Starlight pipeline already shipped in v1.2); soft dependency — path examples use the canonical post-v1.3 layout (`<installRoot>/_config/agents/`), which Phase 12 formally validates via DOCS-07.
**Requirements**: DOCS-01, DOCS-02, DOCS-03, DOCS-04, DOCS-05, DOCS-06
**Success Criteria** (what must be TRUE):
  1. Visitor opening `https://gomad.xgent.ai/tutorials/install` and `/tutorials/quick-start` sees step-by-step guidance covering `npm install @xgent-ai/gomad` + `gomad install` flow with working commands.
  2. Visitor opening `/reference/agents` sees all 8 `gm-agent-*` personas listed with purpose + `/gm:agent-*` invocation form; visitor opening `/reference/skills` sees the 4-phase workflow + core skills cataloged, grouped by workflow layer.
  3. Visitor opening `/explanation/architecture` understands the 4-phase lifecycle, the manifest-v2 installer model, and the launcher-form slash command contract.
  4. Contributor opening `/how-to/contributing` can follow fork → PR → test-expectations steps end-to-end.
  5. Chinese-speaking visitor opening `/zh-cn/tutorials/install` (and siblings under `/zh-cn/`) sees parity content to the English pages authored above.
**Plans**: TBD
**UI hint**: yes

### Phase 12: Agent Dir Relocation + Release
**Goal**: Fresh v1.3 installs land persona bodies at `<installRoot>/_config/agents/` (not `<installRoot>/gomad/agents/`); v1.2 → v1.3 upgrades relocate cleanly with backup snapshots and no orphaned files; `@xgent-ai/gomad@1.3.0` is published to npm with explicit BREAKING callout; `v1.3.0` tag on main; `npm run quality` green across the full test matrix.
**Depends on**: Phase 10 (proven `_config/<subdir>/` greenfield install pattern via `_config/kb/` before touching collision-prone `_config/agents/`), Phase 11 (doc content ready for path-sweep finalization via DOCS-07).
**Requirements**: DOCS-07, AGENT-01, AGENT-02, AGENT-03, AGENT-04, AGENT-05, AGENT-06, AGENT-07, AGENT-08, AGENT-09, AGENT-10, AGENT-11, REL-01, REL-02, REL-03, REL-04
**Success Criteria** (what must be TRUE):
  1. Developer running fresh `gomad install` on a clean workspace finds persona files at `<installRoot>/_config/agents/<shortName>.md` (not `<installRoot>/gomad/agents/`); `/gm:agent-pm` invocation in Claude Code successfully loads the persona from the new path; `<installRoot>` resolves from the user-chosen dir (not hardcoded `_gomad`).
  2. Developer upgrading a v1.2 install to v1.3 sees (a) old `<installRoot>/gomad/agents/*.md` files snapshotted under `<installRoot>/_backups/<timestamp>/`, (b) old files removed, (c) new files written to `<installRoot>/_config/agents/`, (d) no orphan files left on disk; `.customize.yaml` user-override semantics preserved (custom-file detector AGENT-05 correctly treats matching `.md` as generated).
  3. Developer running `npm run quality` on the release commit sees exit 0 — `test:gm-surface` (extended with launcher-body regex) + `test:tarball` (extended with legacy-path grep) + `test:legacy-v12-upgrade` + `test:v13-agent-relocation` + `test:domain-kb-install` + `test:prd-chain` + `docs:build` + `validate-kb-licenses` + `tools/validate-doc-paths.js` all pass.
  4. Developer reading `CHANGELOG.md` for `1.3.0` sees an explicit `### BREAKING CHANGES` section documenting the agent-dir move with old-path → new-path migration instructions and a backup-recovery cross-reference; `docs/upgrade-recovery.md` reflects v1.2 → v1.3 migration steps; all docs path examples (from Phase 11) use the canonical post-v1.3 layout with zero `gomad/agents/` leaks (verified by `tools/validate-doc-paths.js`).
  5. `@xgent-ai/gomad@1.3.0` is live on npm with `latest` dist-tag (v1.1.0 + v1.2.0 retained as prior stable; v1.0.0 deprecation unchanged); `v1.3.0` tag pushed to `origin/main`; PROJECT.md + MILESTONES.md + STATE.md updated in the release commit range.
**Plans**: TBD
**Research flag**: yes — `/gsd-research-phase` recommended before `/gsd-plan-phase 12`. Two open design questions have cascading effects: (a) `newInstallSet` bug fix (AGENT-04) — choose between deriving `newInstallSet` from current install's planned outputs vs. adding relocation-specific branch to `buildCleanupPlan` analogous to `isV11Legacy`; (b) `_config/agents/` collision resolution (AGENT-05) — Option 2 (extend custom-file detector to treat matching `.md` as generated) is the smallest-diff path per research, but confirm before planning.

## Progress

**Execution Order:**
Phases execute in numeric order: 10 → 11 → 12 (Phases 10/11 are logically independent; recommended shipping order reflects risk-minimization — story-creation first exercises `_config/` subdir pattern on a greenfield path, docs content second is authored after the story skills exist to reference, Phase 12 last with exclusive lock because it's simultaneously the riskiest change and the release itself).

| Phase                                              | Milestone | Plans Complete | Status      | Completed  |
| -------------------------------------------------- | --------- | -------------- | ----------- | ---------- |
| 1. Foundation                                      | v1.1      | 2/2            | Complete    | 2026-04    |
| 2. Rename                                          | v1.1      | 3/3            | Complete    | 2026-04    |
| 3. Credit, Branding & Docs                         | v1.1      | 2/2            | Complete    | 2026-04    |
| 4. Verification & Release                          | v1.1      | 3/3            | Complete    | 2026-04-18 |
| 5. Foundations & Command-Surface Validation        | v1.2      | 3/3            | Complete    | 2026-04-19 |
| 6. Installer Mechanics — Copy + Manifest + Stubs   | v1.2      | 3/3            | Complete    | 2026-04-20 |
| 7. Upgrade Safety — Manifest-Driven Cleanup        | v1.2      | 2/2            | Complete    | 2026-04-21 |
| 8. PRD + Product-Brief Content Refinement          | v1.2      | 5/5            | Complete    | 2026-04-22 |
| 9. Reference Sweep + Verification + Release        | v1.2      | 3/3            | Complete    | 2026-04-24 |
| 10. Story-Creation Enhancements                    | v1.3      | 0/TBD          | Not started | -          |
| 11. Docs Site Content Authoring                    | v1.3      | 0/TBD          | Not started | -          |
| 12. Agent Dir Relocation + Release                 | v1.3      | 0/TBD          | Not started | -          |

## Coverage

**v1.3 requirement coverage:** 34/34 mapped to phases ✓

| Phase | Requirements | Count |
|-------|--------------|-------|
| 10    | STORY-01, STORY-02, STORY-03, STORY-04, STORY-05, STORY-06, STORY-07, STORY-08, STORY-09, STORY-10, STORY-11, STORY-12 | 12 |
| 11    | DOCS-01, DOCS-02, DOCS-03, DOCS-04, DOCS-05, DOCS-06 | 6 |
| 12    | DOCS-07, AGENT-01, AGENT-02, AGENT-03, AGENT-04, AGENT-05, AGENT-06, AGENT-07, AGENT-08, AGENT-09, AGENT-10, AGENT-11, REL-01, REL-02, REL-03, REL-04 | 16 |
| **Total** | | **34** |

**Coverage notes:**

- **Marketplace workstream dropped (2026-04-24)**: Former Phase 10 (MARKET-01..05) removed — user chose `gomad install` CLI as the single distribution path; stale `.claude-plugin/marketplace.json` removed from the repo rather than refreshed. Phases 11/12/13 renumbered to 10/11/12. See `.planning/REQUIREMENTS.md` Out of Scope for reasoning.
- **DOCS-07 assignment**: Placed entirely in Phase 12 (not split). Rationale: the requirement's enforcement mechanism (`tools/validate-doc-paths.js` wired into `npm run quality`) validates against real v1.3 paths, which requires AGENT-* to have landed. Phase 11 authors docs content using the canonical post-v1.3 layout (`<installRoot>/_config/agents/`) as documented-target; Phase 12 ships the linter and finalizes any sweep needed. Cleaner traceability — no REQ-ID split across phases.
- **STORY-12 constraint**: `gm-domain-skill` invocation is from `gm-create-story` only (pre-bake pattern established in v1.2 with `project-context.md`). `gm-dev-story` integration is explicitly Future scope (STORY-F1).
- **Phase 12 exclusive lock**: No work overlaps with Phase 12 because it touches the installer's runtime pointer (`agent-command-template.md:16`), cleanup-planner semantics (`cleanup-planner.js:282`), and the release gate itself. Concurrent changes risk silent drift.
