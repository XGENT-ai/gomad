# Phase 10: Story-Creation Enhancements - Context

**Gathered:** 2026-04-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Ship two new task-skills (`gm-discuss-story` + `gm-domain-skill`) under `src/gomad-skills/4-implementation/`, two seed knowledge-base packs (`testing/` + `architecture/`) under `src/domain-kb/`, an installer `_installDomainKb()` step copying `src/domain-kb/*` → `<installRoot>/_config/kb/*` with `files-manifest.csv` v2 tracking, a `validate-kb-licenses.js` release gate wired into `npm run quality` **before** any KB content lands, and `gm-create-story` discover-inputs.md patch to auto-load `{{story_key}}-context.md`. Zero new runtime deps. Provable IP cleanliness (every KB file carries `source:` + `license:` + `last_reviewed:` frontmatter).

Out of this phase: agent-dir relocation (Phase 12), docs site content (Phase 11), `gm-dev-story` fresh-retrieval integration (STORY-F1 deferred), additional seed packs beyond testing/architecture (STORY-F4 deferred), backup rotation (REL-F1 deferred).

</domain>

<decisions>
## Implementation Decisions

### Elicitation Flow (`gm-discuss-story`)

- **D-01:** Reuse `gm-create-story/discover-inputs.md` Input Files table as the shared upstream input source for `gm-discuss-story`. Both skills read the same materials (epics, PRD, architecture, ux, sprint-status) so story scope stays consistent between pre-story discussion and story draft. `gm-discuss-story` extracts the target story's entry from the epics file (SELECTIVE_LOAD by `{{story_key}}`) as the scope anchor.
- **D-02:** Classic `discuss` elicitation mode (mirrors `.claude/get-shit-done/workflows/discuss-phase.md` classic mode, NOT assumptions mode). Flow: (1) read shared inputs → (2) identify gray areas grounded in the target story → (3) user multi-selects gray areas via AskUserQuestion → (4) per-area ~4-question focused Q&A with 2-3 concrete options each → (5) "More questions about [area], or move to next?" transition check between areas → (6) "Explore more / Ready for context" final gate → (7) write `{{story_key}}-context.md` directly → (8) show summary after write. **No pre-write integral preview** (user controls surface through per-area transitions, consistent with discuss-phase classic).
- **D-03:** Adaptive mapping of gray-area content to the 5 locked output sections (`<domain>`, `<decisions>`, `<canonical_refs>`, `<specifics>`, `<deferred>`). Section boundaries are determined by content semantics, not by a fixed "STORY-01 category → section" lookup. Implication: any downstream parser of context.md (e.g., for diagnostics) MUST key on section names, not assume category→section mapping.
- **D-04:** **No length cap on context.md output.** gomad does not count tokens, does not run an auto-compression pass, does not trigger interactive trimming. Conciseness is enforced by prompt engineering inside `gm-discuss-story/workflow.md` ("capture decisions, not discussion transcripts"). **Revises STORY-02**: drop `≤1500 tokens` clause; retain "explicit re-run idempotency behavior" clause. **Revises Phase 10 Success Criterion #1**: delete `at ≤1500 tokens` sub-clause.

### Re-run Idempotency (`gm-discuss-story`)

- **D-05:** Per-area incremental checkpoint. After each gray area completes, write `{planning_artifacts}/{{story_key}}-discuss-checkpoint.json` with accumulated decisions, completed areas, and remaining areas. On re-invocation, detect checkpoint → prompt "Resume / Start fresh". On "Resume": load decisions, skip completed areas, continue from where left off. Checkpoint file deleted after `{{story_key}}-context.md` is written successfully.
- **D-06:** On re-invocation when `{{story_key}}-context.md` already exists (and no checkpoint): prompt the user with three options — "Update" (load existing decisions as pre-filled, continue discussion) / "View" (display file, then offer Update/Skip) / "Skip" (exit without changes). Mirrors discuss-phase pattern.
- **D-07:** Edge case — both checkpoint and context.md present. context.md takes precedence; the stale checkpoint is auto-deleted before prompting Update/View/Skip. Prevents "resume" attempts against an already-completed discussion.

### Domain-KB Retrieval (`gm-domain-skill`)

- **D-08:** On successful match, return the single best-matching `.md` file's full content (NOT a section excerpt, NOT the full pack, NOT a top-N ranked list). Matches STORY-06 literal text. Indexing granularity is per-file (each `.md` inside a `<slug>/` pack is one BM25 document).
- **D-09:** When `{domain_slug}` is passed but `{query}` is omitted, return a file listing of all `.md` files in the pack (format: `<relative_path> — <H1 heading>` per line). Gives the caller a deterministic catalog to drive a follow-up query. Does NOT return the pack's `SKILL.md` by default (rejected in favor of listing for a richer two-step UX).
- **D-10:** BM25 "no match" threshold is a hardcoded heuristic constant in the skill's source (e.g., top score must exceed a tuned floor; exact formula deferred to implementation). Source code carries a short comment explaining the rationale. If empirically wrong after v1.3 seeds land, tune in a patch release. **No config surface** (no YAML override file, no env var) — zero new deps ethos extended to zero new config surface. STORY-07 "explicit no match" requirement satisfied by this threshold plus a human-readable "no match" output message.
- **D-11:** Levenshtein "did you mean" behavior: on unknown slug, compute Levenshtein distance against all `.md` directory names under `<installRoot>/_config/kb/`. If any slugs are within distance ≤ 3, print `Did you mean: <slug1>, <slug2>?` and exit without further searching. User re-invokes with the corrected slug. **Does not auto-execute** even at distance 1 (safer; avoids silent slug substitution).
- **D-12:** Seed pack content depth = **broad-shallow**. Each of the two packs (`testing/` + `architecture/`) lands with approximately 10 files: 1× `SKILL.md` (overview + "when to use this pack"), 4-6× `reference/*.md` (subtopic refs, ~200-500 words each), 2-3× `examples/*.md` (concrete code examples), 1× `anti-patterns.md` (common mistakes). Gives the BM25 ranker meaningful surface to score against; not overwhelming to author; fits "seed" framing without locking us into narrow-deep or placeholder shapes that would force rework in v1.4+ (STORY-F4).

### Context Merge (`gm-create-story`)

- **D-13:** `gm-create-story` does NOT mechanically parse or route context.md fields. Integration is purely: `discover-inputs.md` SELECTIVE_LOAD adds `{{story_key}}-context.md` as one more Input File alongside prd/architecture/epics/ux. The whole content becomes part of the LLM context Claude uses when drafting the story. No section-to-story-field routing; no structured parsing; no merge algorithm. Rationale: context.md is supplementary context, not a data source to be transformed.
- **D-14:** **No conflict detection and no warning emission.** If user prompt and context.md contradict, Claude silently prioritizes the user prompt through normal LLM context-ordering behavior. **Revises STORY-05**: drop "emits a visible warning listing the conflict lines (no silent override)" clause; retain "user prompt wins" clause (satisfied naturally by prompt recency). **Revises Phase 10 Success Criterion #2**: delete "with a visible warning listing the conflict lines" sub-clause. Rationale: mechanical conflict detection is brittle (regex-based) or expensive (semantic via extra LLM pass); both violate zero-new-deps / minimal-diff ethos. If a real conflict causes user confusion post-v1.3, add the warning in a patch release with a concrete failure mode in mind.

### Claude's Discretion

- Exact BM25 constant values (k1, b, floor for "no match") — tune empirically once seeds land.
- Exact file names and subtopic choices within each seed pack (within the broad-shallow envelope from D-12) — planner + author decide based on representative query diversity.
- Exact placement of `_installDomainKb()` in the installer pipeline (before or after `_installOfficialModules`) — follow the existing pattern; add to `InstallPaths.create()` and `collectSkills`-parallel loop as appropriate.
- `gm-discuss-story` and `gm-domain-skill` invocation form — both are task-skills (no persona), so launcher-form slash commands do NOT apply. They are loaded as skills like `gm-create-story`.
- Exact wording of checkpoint JSON schema fields (match discuss-phase's schema or simplify) — planner decides.
- Exact wording of "Resume / Start fresh" and "Update / View / Skip" prompts — planner mirrors discuss-phase copy.

### Folded Todos

None — no pending todos were folded into this phase's scope.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents (researcher, planner, executor) MUST read these before planning or implementing.**

### Milestone scope + requirements

- `.planning/PROJECT.md` — Overall project context, zero-new-runtime-deps constraint (v1.2 policy carried forward), current milestone v1.3 goal
- `.planning/REQUIREMENTS.md` §"Story-Creation Enhancements" (STORY-01..12) — The 12 locked requirements for this phase; plus STORY-F1 and STORY-F4 in §"Future Requirements" for deferred scope
- `.planning/ROADMAP.md` §"Phase 10: Story-Creation Enhancements" — Phase goal, depends-on, success criteria, plan TBD marker
- `.planning/MILESTONES.md` — Milestone v1.3 entry for context on where this phase sits

### Research outputs (v1.3 milestone research)

- `.planning/research/SUMMARY.md` — Executive summary of all four v1.3 workstreams; phase ordering rationale; HIGH-confidence assessment
- `.planning/research/STACK.md` — Zero-new-deps decision rationale; which already-installed packages to use (`csv-parse/sync`, `fs-extra`, `glob`, `yaml`); hand-rolled BM25 ~50 LOC sizing
- `.planning/research/ARCHITECTURE.md` — `gm-domain-skill` invocation point analysis (pre-bake from `gm-create-story` vs fresh retrieval from `gm-dev-story`); `_installDomainKb()` placement pattern
- `.planning/research/FEATURES.md` — Must/should/defer breakdown; seed pack topic picks (testing + architecture chosen from candidate list)
- `.planning/research/PITFALLS.md` — IP/licensing hard gate (`validate-kb-licenses.js` must land BEFORE content); potential conflicts with `gm-dev-story` integration point (deferred per STORY-F1)

### Upstream skill pattern (template for new skills)

- `src/gomad-skills/4-implementation/gm-create-story/SKILL.md` — Skill manifest shape (name + description + "Follow instructions in ./workflow.md")
- `src/gomad-skills/4-implementation/gm-create-story/workflow.md` — Reference for BMAD `<workflow>` / `<step>` / `<check>` / `<action>` / `<ask>` XML-tag patterns to mirror in `gm-discuss-story/workflow.md`
- `src/gomad-skills/4-implementation/gm-create-story/discover-inputs.md` — Input Files table pattern; SELECTIVE_LOAD / FULL_LOAD / INDEX_GUIDED strategies; **this file will be patched** to add `{{story_key}}-context.md` as a new SELECTIVE_LOAD entry per D-13
- `src/gomad-skills/4-implementation/gm-create-story/template.md` — Output template reference; informs `gm-discuss-story/template.md` shape with the 5 locked sections
- `src/gomad-skills/4-implementation/gm-create-story/checklist.md` — Validation checklist pattern; informs `gm-discuss-story/checklist.md`

### Inspiration source (for `gm-discuss-story` elicitation flow — user-confirmed during discussion)

- `.claude/get-shit-done/workflows/discuss-phase.md` — Classic mode elicitation pattern (gray-area identification, user multi-select, per-area Q&A, transition checks, final gate, checkpoint resume) — `gm-discuss-story` adapts this pattern to story-level scope per D-02, D-05, D-06

### Installer + manifest touchpoints

- `tools/installer/core/installer.js` — Existing `_installOfficialModules` / `_installCustomModules` pattern; `_installDomainKb()` will slot alongside these (STORY-11)
- `tools/installer/core/install-paths.js` — `InstallPaths.create()` adds `_config/kb/` path constant (parallel to existing `_config/agents/`)
- `tools/installer/core/manifest-generator.js` §"collectSkills" (lines 181-272) — Auto-discovery of new skills under `src/gomad-skills/*/`; `gm-discuss-story` + `gm-domain-skill` land here automatically once their directories exist
- `tools/verify-tarball.js` — Phase 4 grep-clean pattern; reference for adding a `_config/kb/` presence assertion (test:domain-kb-install per Phase 10 Success Criterion #4)

### Release gate (license validator — must land BEFORE content)

- `tools/validate-skills.js` — Reference pattern for the new `tools/validate-kb-licenses.js` script (structurally similar; wires into `npm run quality`)

### Known pitfalls to respect

- `.planning/research/PITFALLS.md` §"IP/licensing for seed KB content" — Seed packs MUST be authored from scratch with `source: "original"` + `license: "MIT"` frontmatter; validator must land and pass before any KB file is committed

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- **`gm-create-story/discover-inputs.md`** — Full SELECTIVE_LOAD / FULL_LOAD / INDEX_GUIDED protocol; `gm-discuss-story` reuses verbatim (reads the same inputs) and `gm-create-story` extends with one new SELECTIVE_LOAD entry for `{{story_key}}-context.md`
- **`gm-create-story/` 5-file structure** — `gm-discuss-story/` mirrors file-for-file (SKILL.md + workflow.md + template.md + checklist.md + discover-inputs.md per STORY-02)
- **BMAD `<workflow>` / `<step>` / `<check>` / `<action>` / `<ask>` XML-tag DSL** — Already used by every 4-implementation skill; `gm-discuss-story/workflow.md` adopts the same DSL for consistency
- **`csv-parse/sync` + local `escapeCsv` (3 LOC)** — v1.2 pattern for `files-manifest.csv` read/write; `_installDomainKb()` reuses for tracking KB file entries under `install_root="_gomad"`
- **`fs-extra` + `glob`** — Already installed; handle directory copy + pattern matching for `src/domain-kb/*` → `<installRoot>/_config/kb/*`
- **`ManifestGenerator.collectSkills`** — Auto-discovers new skill directories under `src/gomad-skills/*/`; no wiring needed for `gm-discuss-story` + `gm-domain-skill` to appear in manifest
- **`tools/validate-skills.js` structure** — Reference shape for `tools/validate-kb-licenses.js`: glob KB files, parse frontmatter (regex + `yaml.parse`), assert required keys, exit 1 on violation, wire into `package.json` scripts
- **Discuss-phase classic-mode flow (external, not in gomad runtime)** — `.claude/get-shit-done/workflows/discuss-phase.md` is the documented blueprint for `gm-discuss-story/workflow.md` elicitation pattern

### Established Patterns

- **Zero new runtime deps (v1.2 policy)** — All new code uses already-installed packages or Node built-ins; BM25 + Levenshtein hand-rolled (~50 LOC each)
- **CommonJS `require()` in all installer / test files** — locked in v1.2; `_installDomainKb()` and `validate-kb-licenses.js` MUST use `require()`, not ESM
- **Task-skills are skill-only (no launcher-form slash commands)** — Only agent personas (`gm-agent-*`) get `/gm:agent-*` launcher stubs; `gm-discuss-story` + `gm-domain-skill` are invoked as skills (like `gm-create-story`), not via `/gm:*` commands
- **Frontmatter conventions** — `source:` + `license:` + `last_reviewed:` for KB content per STORY-08/09; validated by `tools/validate-kb-licenses.js` per STORY-10
- **`files-manifest.csv` v2 schema** — `schema_version="2.0"` + `install_root="_gomad"` + columns `type,name,module,path,hash`; `_installDomainKb()` emits rows with `install_root="_gomad"` and new `type="kb"` (or reuse existing type)
- **Checkpoint-resume pattern (from discuss-phase)** — JSON file with `areas_completed[]` / `areas_remaining[]` / `decisions{}` / deleted on successful final write

### Integration Points

- **`gm-create-story/discover-inputs.md`** — Add `{{story_key}}-context.md` as a new SELECTIVE_LOAD entry; missing file = hint not error (STORY-04)
- **`gm-create-story/workflow.md`** — Add `gm-domain-skill` invocation step (pre-bake integration per STORY-12); `gm-dev-story` integration deferred (STORY-F1)
- **`tools/installer/core/installer.js`** — New `_installDomainKb()` method; call from `_installAndConfigure` alongside `_installOfficialModules`
- **`tools/installer/core/install-paths.js`** — Add `_config/kb/` path constant (parallel to existing `_config/agents/`)
- **`package.json` scripts** — `validate-kb-licenses` script wired into `npm run quality` BEFORE any KB content lands (hard release gate)
- **`test/test-domain-kb-install.js`** — New test asserting fresh install lands `_config/kb/testing/` + `_config/kb/architecture/` populated; wired into `npm run quality`
- **`tools/verify-tarball.js`** — Extend Phase 4 grep-clean (or equivalent) to assert `_config/kb/` presence in shipped tarball

</code_context>

<specifics>
## Specific Ideas

- **User references** during discussion: ".claude/commands/gsd/discuss-phase.md 是怎么做的" — the user explicitly asked for the classic discuss-phase pattern as the elicitation blueprint for `gm-discuss-story`. That pattern (gray-area identification → user multi-select → per-area Q&A → transition check → final gate → checkpoint resume) is the intended UX model (D-02, D-05, D-06).
- **Adaptive section mapping (D-03)** explicitly overrides the research SUMMARY.md recommendation of a fixed category-to-section mapping. Downstream parsers of context.md MUST key on section names (e.g., `<decisions>`) rather than assuming a specific STORY-01 category lives in a specific section.
- **No token cap (D-04)** explicitly revises STORY-02. Planner should NOT plan a token counter, compression pass, or truncation logic.
- **No conflict warning (D-14)** explicitly revises STORY-05. Planner should NOT plan conflict detection or warning emission logic in `gm-create-story`.
- **User's framing quote** (translated): "gm-discuss-story is providing reference for gm-create-story, so the story's work content and goal should be consistent" — reinforces D-01 (shared inputs) and D-02 (scope stays bounded to epic's story entry).

</specifics>

<deferred>
## Deferred Ideas

- **`gm-discuss-story --text` flag** — Plain-text numbered-list mode for `/rc` remote sessions. Surfaced in research as P2 "should have". Deferred from v1.3 unless planner finds trivial marginal cost.
- **`gm-domain-skill` config surface** (YAML override for BM25 threshold) — Rejected during discussion in favor of hardcoded heuristic per D-10. Revisit in v1.4+ if empirical tuning needs a user-facing knob.
- **Conflict detection + warning in `gm-create-story`** — Explicitly dropped per D-14 (revises STORY-05). If user confusion emerges post-v1.3, add warning in a patch release with a concrete failure mode in mind.
- **Token cap + compression pass for context.md** — Explicitly dropped per D-04 (revises STORY-02). If context.md length becomes a problem post-v1.3, revisit with real data.
- **Additional seed KB packs** (react-performance, nodejs-async, api-design, claude-code-skills, claude-code-plugin) — Listed in STORY-F4 future requirements. Not in v1.3 scope.
- **`gm-dev-story` fresh-retrieval integration for `gm-domain-skill`** — Deferred per STORY-F1 and confirmed by D-13 scope boundary (pre-bake from `gm-create-story` only).
- **`gm-discuss-story --chain` auto-trigger of `gm-create-story`** — Deferred per STORY-F2.
- **Vector-scoring upgrade for `gm-domain-skill`** — Deferred per STORY-F3 until KB count grows past ~20 packs.
- **Auto-pick top Levenshtein suggestion at distance 1** — Considered during D-11 discussion; rejected as too risky. Keep list-and-halt behavior.

### Reviewed Todos (not folded)

None — no pending todos matched Phase 10 scope.

</deferred>

---

*Phase: 10-story-creation-enhancements*
*Context gathered: 2026-04-24*
