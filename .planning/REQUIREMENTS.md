# Requirements: GoMad v1.3

**Milestone:** v1.3 Docs, Story Context & Agent Relocation
**Defined:** 2026-04-24
**Core Value:** A lean, properly-credited fork of BMAD Method that we own end-to-end and can extend with our own agents/skills.
**Research summary:** `.planning/research/SUMMARY.md`
**Roadmap:** `.planning/ROADMAP.md` (Phases 10-12)

## v1.3 Requirements

Requirements for this milestone. Each maps to a single roadmap phase (Phases 10–12).

### Docs Site Content (Starlight auto-deploy pipeline already shipped in v1.2)

Author initial docs content for `gomad.xgent.ai`. GH Actions auto-deploy on push stays as-is.

- [x] **DOCS-01**: User can read install + quick-start tutorials at `gomad.xgent.ai/tutorials/install` and `/tutorials/quick-start` — covers `npm install @xgent-ai/gomad` + `gomad install` flow.
- [x] **DOCS-02**: User can browse an Agents Reference at `/reference/agents` listing all 8 `gm-agent-*` personas with purpose + invocation (`/gm:agent-*`).
- [x] **DOCS-03**: User can browse a Skills Reference at `/reference/skills` listing all 4-phase + core skills with purpose, grouped by workflow layer.
- [x] **DOCS-04**: User can read an Architecture explainer at `/explanation/architecture` describing the 4-phase workflow, installer + manifest-v2 model, and launcher-form slash commands.
- [x] **DOCS-05**: Contributor can read a Contributing how-to at `/how-to/contributing` covering fork + PR + test expectations.
- [x] **DOCS-06**: Chinese-speaking user has parity content under `/zh-cn/` for all pages authored in DOCS-01..05.
- [ ] **DOCS-07**: All docs path examples use the canonical post-v1.3 install layout (`<installRoot>/_config/agents/`, not legacy `<installRoot>/gomad/agents/`) — authored or refreshed after AGENT-* phase lands; `tools/validate-doc-paths.js` enforces in `npm run quality`.

### Story-Creation Enhancements (src/gomad-skills/4-implementation/)

Add a pre-story discuss step, teach `gm-create-story` to auto-load context, and ship a parameterized domain-knowledge retrieval skill with seeds.

- [ ] **STORY-01**: Developer can invoke `gm-discuss-story` as a manual step before `gm-create-story`; skill writes `{planning_artifacts}/{{story_key}}-context.md` clarifying gray areas (acceptance-criteria edge cases, NFRs, data-model ambiguities, downstream contracts).
- [ ] **STORY-02**: `gm-discuss-story` mirrors `gm-create-story/` 5-file structure (SKILL.md + workflow.md + template.md + checklist.md + discover-inputs.md) and caps context.md output at ≤1500 tokens with an explicit re-run idempotency behavior.
- [ ] **STORY-03**: `{{story_key}}-context.md` output contract has locked sections — `<domain>`, `<decisions>`, `<canonical_refs>`, `<specifics>`, `<deferred>` — so `gm-create-story` can consume deterministically.
- [ ] **STORY-04**: `gm-create-story` auto-detects `{planning_artifacts}/{{story_key}}-context.md` via `discover-inputs.md` SELECTIVE_LOAD; missing file = hint, not error; present file is merged into story-draft context.
- [ ] **STORY-05**: When `{{story_key}}-context.md` and user prompt conflict, user prompt wins; `gm-create-story` emits a visible warning listing the conflict lines (no silent override).
- [ ] **STORY-06**: Developer can invoke `gm-domain-skill` passing `{domain_slug}` + optional `{query}`; skill searches `<installRoot>/_config/kb/<slug>/*.md` via hand-rolled BM25-style ranking (zero new deps) and returns the single best-matching file content.
- [ ] **STORY-07**: `gm-domain-skill` handles typo slugs with Levenshtein "did you mean" fallback listing available slugs under `_config/kb/`; empty-match returns explicit "no match" rather than silently returning a weak hit.
- [ ] **STORY-08**: `src/domain-kb/testing/` seed pack authored from scratch (zero IP risk); canonical format — `SKILL.md` + `reference/` + `examples/` + `anti-patterns.md`; frontmatter includes `source: "original"` + `license: "MIT"` + `last_reviewed: YYYY-MM-DD`.
- [ ] **STORY-09**: `src/domain-kb/architecture/` seed pack authored from scratch with same canonical format and frontmatter as STORY-08.
- [ ] **STORY-10**: `validate-kb-licenses.js` gate runs on every KB file, asserting `source:` + `license:` + `last_reviewed:` frontmatter present; wired into `npm run quality` BEFORE any KB content lands.
- [ ] **STORY-11**: Installer copies `src/domain-kb/*` → `<installRoot>/_config/kb/*` via new `_installDomainKb()` step in `installer.js`; every copied file tracked in `files-manifest.csv` v2 under `install_root="_gomad"`; no hardcoded install-root string.
- [ ] **STORY-12**: `gm-domain-skill` is invoked from `gm-create-story` (pre-bake into story draft) — integration point confirmed in `gm-create-story/workflow.md`; `gm-dev-story` integration deferred.

### Agent Dir Relocation + Test Coverage

Move persona body install path from `<installRoot>/gomad/agents/` to `<installRoot>/_config/agents/`. Update all 11 touchpoints in lockstep. Fix the `newInstallSet` latent bug. Cover with upgrade + fresh-install tests.

- [ ] **AGENT-01**: Persona body files install to `<installRoot>/_config/agents/<shortName>.md` (not `<installRoot>/gomad/agents/<shortName>.md`) on fresh v1.3 installs.
- [ ] **AGENT-02**: Single `AGENTS_PERSONA_SUBPATH` constant in `path-utils.js` is the sole source of truth for the persona subpath; sweep replaces all hardcoded `gomad/agents` literals across `agent-command-generator.js`, `path-utils.js`, `artifacts.js`, `installer.js`, `manifest-generator.js`, and `agent-command-template.md`.
- [ ] **AGENT-03**: Launcher stub body path in `agent-command-template.md:16` matches the new `_config/agents/<shortName>.md` location; `<installRoot>` resolves at install time from user-chosen dir (never hardcoded `_gomad`).
- [ ] **AGENT-04**: `newInstallSet` derivation bug in `installer.js:520-543` fixed — set is populated from current install's planned outputs, not the prior manifest; `cleanup-planner.js:282` guard correctly permits old-path deletion during v1.2→v1.3 relocation.
- [ ] **AGENT-05**: Custom-file detector in `installer.js:923-925` updated so persona `.md` files under `_config/agents/` matching installed paths are treated as generated (not custom); user `.customize.yaml` semantics preserved.
- [ ] **AGENT-06**: On v1.2→v1.3 upgrade: old `<installRoot>/gomad/agents/*.md` files removed via manifest-driven cleanup with realpath containment; new `<installRoot>/_config/agents/*.md` installed; pre-cleanup backup snapshot written under `<installRoot>/_backups/<timestamp>/`.
- [ ] **AGENT-07**: `test-gm-command-surface.js` Phase C extended with launcher-body regex assertion — positive case (body references new `_config/agents/`), negative case (fails if body references legacy `gomad/agents/`); runs in same CI job as existing Phase A/B/C.
- [ ] **AGENT-08**: `test/test-legacy-v12-upgrade.js` simulates v1.2→v1.3 upgrade (installs v1.2 tarball, runs v1.3 install, asserts old path absent + new path present + no orphans); cloned from existing `test-legacy-v11-upgrade.js` pattern; wired into `npm run quality`.
- [ ] **AGENT-09**: `test/test-v13-agent-relocation.js` asserts fresh v1.3 install lands personas only at `_config/agents/`; wired into `npm run quality`.
- [ ] **AGENT-10**: `tools/verify-tarball.js` Phase 4 grep-clean extended — asserts shipped tarball has zero occurrences of the legacy `gomad/agents/` path in any runtime-path string.
- [ ] **AGENT-11**: `docs/upgrade-recovery.md` updated with v1.2→v1.3 migration instructions, old-path → new-path rollback recipe, and backup-snapshot location; cross-referenced from CHANGELOG BREAKING entry.

### Release

Publish `@xgent-ai/gomad@1.3.0` with BREAKING callout. Manual `npm publish`; docs auto-deploy stays.

- [ ] **REL-01**: `CHANGELOG.md` v1.3.0 entry includes explicit `### BREAKING CHANGES` section covering the agent-dir move with old-path → new-path migration instructions and backup-recovery reference.
- [ ] **REL-02**: `npm run quality` exits 0 on the v1.3 release commit — includes `test:gm-surface` (extended), `test:tarball` (extended), `test:legacy-v12-upgrade`, `test:v13-agent-relocation`, `test:domain-kb-install`, `test:prd-chain`, `docs:build`, `validate-kb-licenses`.
- [ ] **REL-03**: `@xgent-ai/gomad@1.3.0` published to npm with `latest` dist-tag via manual `npm publish` (OIDC or granular token); `v1.1.0` + `v1.2.0` retained on npm; `v1.0.0` deprecation unchanged.
- [ ] **REL-04**: Git tag `v1.3.0` pushed to `origin/main` after publish; PROJECT.md + MILESTONES.md + STATE.md updated in the same release commit range.

## Future Requirements (Deferred to v1.4+)

Acknowledged but out of v1.3 roadmap.

### Docs

- **DOCS-F1**: CI-driven `docs/reference/skills.md` auto-generation from `skill-manifest.yaml` / `manifest.json` — replaces manual curation.
- **DOCS-F2**: Version selector in docs site (current ships single live version).

### Story-Creation

- **STORY-F1**: `gm-dev-story` integration for `gm-domain-skill` — fresh retrieval at implementation time in addition to pre-bake at story time.
- **STORY-F2**: `gm-discuss-story --chain` flag to auto-trigger `gm-create-story` after context.md approval.
- **STORY-F3**: `gm-domain-skill` vector-scoring upgrade path when KB count grows past ~20 packs.
- **STORY-F4**: Additional seed KB packs (react-performance, nodejs-async, api-design, claude-code-skills, claude-code-plugin).

### Release

- **REL-F1**: Backup rotation / pruning policy for `<installRoot>/_backups/<timestamp>/` (first-pass keeps all snapshots).

## Out of Scope

Explicitly excluded from v1.3. Documented to prevent scope creep.

| Feature                                                   | Reason                                                                                             |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Claude Code plugin marketplace (`.claude-plugin/marketplace.json`) | Dropped 2026-04-24 — user chose `gomad install` CLI as the single distribution path; the stale BMAD-era `marketplace.json` was removed from the repo rather than refreshed. Supersedes the former MARKET-01..05 workstream. |
| Disabling GH Pages auto-deploy                            | User clarified: "publish manually" applied to `npm publish`, not docs. Auto-deploy stays as-is.    |
| Adding new runtime deps to support v1.3 features          | v1.2 zero-new-deps policy carried forward. BM25 hand-rolled (~50 LOC) rejects `lunr`/`minisearch`/`fuse.js`. |
| Borrowing KB content from Claude-Cortex / vercel-labs     | Zero IP risk preferred. Seed packs authored from scratch; license-validator still ships for future. |
| `_config/agents/` subdir partition (persona/ vs customize) | User: directory currently empty, no collision. Small detector tweak (AGENT-05) suffices.           |
| Touching BMAD upstream or `bmad-method` on npm            | Permanent — BMAD is a separate product.                                                            |
| Restructuring 1-analysis / 2-plan / 3-solutioning / 4-implementation workflow internals | v1.3 adds sibling skills only; workflow structure unchanged.                                  |
| Tracking BMAD upstream in GoMad                           | Permanent — GoMad is a hard fork, not a continuously-merged downstream.                            |
| CI-driven skills auto-generation for docs                 | Deferred to DOCS-F1 (v1.4+).                                                                       |

## Traceability

Populated by the roadmapper during Phase creation. Every v1.3 requirement maps to exactly one phase; coverage is 100%.

| Requirement | Phase | Status |
|-------------|-------|--------|
| STORY-01 | Phase 10 | Pending |
| STORY-02 | Phase 10 | Pending |
| STORY-03 | Phase 10 | Pending |
| STORY-04 | Phase 10 | Pending |
| STORY-05 | Phase 10 | Pending |
| STORY-06 | Phase 10 | Pending |
| STORY-07 | Phase 10 | Pending |
| STORY-08 | Phase 10 | Pending |
| STORY-09 | Phase 10 | Pending |
| STORY-10 | Phase 10 | Pending |
| STORY-11 | Phase 10 | Pending |
| STORY-12 | Phase 10 | Pending |
| DOCS-01 | Phase 11 | Complete |
| DOCS-02 | Phase 11 | Complete |
| DOCS-03 | Phase 11 | Complete |
| DOCS-04 | Phase 11 | Complete |
| DOCS-05 | Phase 11 | Complete |
| DOCS-06 | Phase 11 | Complete |
| DOCS-07 | Phase 12 | Pending |
| AGENT-01 | Phase 12 | Pending |
| AGENT-02 | Phase 12 | Pending |
| AGENT-03 | Phase 12 | Pending |
| AGENT-04 | Phase 12 | Pending |
| AGENT-05 | Phase 12 | Pending |
| AGENT-06 | Phase 12 | Pending |
| AGENT-07 | Phase 12 | Pending |
| AGENT-08 | Phase 12 | Pending |
| AGENT-09 | Phase 12 | Pending |
| AGENT-10 | Phase 12 | Pending |
| AGENT-11 | Phase 12 | Pending |
| REL-01 | Phase 12 | Pending |
| REL-02 | Phase 12 | Pending |
| REL-03 | Phase 12 | Pending |
| REL-04 | Phase 12 | Pending |

**Coverage:**
- v1.3 requirements: 34 total (12 STORY + 7 DOCS + 11 AGENT + 4 REL)
- Mapped to phases: 34 ✓
- Unmapped: 0 ✓

**Phase distribution:**
- Phase 10 (Story-Creation Enhancements): 12 reqs
- Phase 11 (Docs Site Content Authoring): 6 reqs
- Phase 12 (Agent Dir Relocation + Release): 16 reqs

---

*Requirements defined: 2026-04-24*
*Last updated: 2026-04-24 after marketplace workstream dropped — MARKET-01..05 moved to Out of Scope; `.claude-plugin/marketplace.json` removed from repo; phases renumbered 11→10, 12→11, 13→12; 34/34 requirements mapped to Phases 10-12.*
*Previously: 2026-04-24 after roadmap creation — 39/39 requirements mapped to Phases 10-13; traceability table populated.*
