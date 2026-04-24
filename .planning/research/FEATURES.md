# Feature Research — GoMad v1.3

**Domain:** AI agent framework — plugin marketplace + docs site + config relocation + story-context enhancements
**Researched:** 2026-04-24
**Confidence:** HIGH (official Claude Code marketplace schema confirmed from docs; reference knowledge-pack implementations inspected directly; discuss-phase workflow read in full)

This is a v1.3 subsequent-milestone research document. Table stakes / differentiators / anti-features are scoped ONLY to the four v1.3 workstreams. Existing shipped v1.2 features (7 `gm-agent-*` launchers, 15 implementation skills, PRD chain, copy-only installer with manifest v2) are NOT re-catalogued — see prior `.planning/research/FEATURES.md` git history or the Validated block in PROJECT.md.

---

## Workstream 1 — Plugin Marketplace Refresh

**Artifact:** `.claude-plugin/marketplace.json`
**Current state (HIGH confidence — file read):** Still carries pre-fork BMAD identity — `name: "bmad-method"`, `owner: Brian (BMad) Madison`, two plugins (`bmad-pro-skills`, `bmad-method-lifecycle`), all skill paths reference `bmm-skills/bmad-*`. Everything is stale w.r.t. v1.2 layout.

**Authoritative schema source:** `https://code.claude.com/docs/en/plugin-marketplaces` (HIGH confidence — read in full). Required fields are `name`, `owner`, `plugins[]`; per-plugin required are `name` + `source`. Optional per-plugin: `description`, `version`, `author`, `homepage`, `repository`, `license`, `keywords`, `category`, `tags`, `strict`, `skills`, `commands`, `agents`, `hooks`, `mcpServers`, `lspServers`. Top-level optional: `metadata.description`, `metadata.version`, `metadata.pluginRoot`, `allowCrossMarketplaceDependenciesOn`.

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Marketplace identity matches package identity | `name: "bmad-method"` actively lies about who ships this. Users discover via `/plugin install <plugin>@bmad-method` when the package on npm is `@xgent-ai/gomad`. | LOW | Set `name: "gomad"`; `owner.name: "xgent-ai"`; `owner.email` optional. |
| All plugin entries use current `gm-*` / `gomad-skills/` paths | Current file points at `bmm-skills/bmad-*/` — paths don't exist in v1.2 source tree. Full rename sweep. | LOW | Source tree confirmed: `src/gomad-skills/{1..4}/gm-*/`, `src/core-skills/gm-*/`. Agent skills have moved across phase dirs (`gm-agent-analyst` in 1, `gm-agent-pm`/`gm-agent-ux-designer` in 2, `gm-agent-architect` in 3, `gm-agent-dev`/`gm-agent-sm`/`gm-agent-solo-dev` in 4). |
| Per-plugin `description` field | Users see this in `/plugin list` output and `/plugin marketplace` UI. Missing or copy-pasted = poor discoverability. | LOW | One sentence per plugin group: what it does, who it's for. |
| Per-plugin `version` field pinned | Schema note: if `version` is absent AND `plugin.json` is absent, Claude Code falls back to git commit SHA, meaning every commit to main counts as a new release. For a published npm package with explicit release cadence, this is wrong. Pin to `1.3.0`. | LOW | Match `package.json` version. Bump in lockstep with npm publish. |
| Per-plugin `author` + `license` | Legal/credit hygiene — same rationale that drove the canonical non-affiliation disclaimer (per v1.1 Key Decisions). `license: "MIT"` explicit (matches LICENSE file). | LOW | `author.name: "Rockie Guo"`, `author.email: "rockie@kitmi.com.au"` matches `package.json`. |
| `kebab-case` plugin names | Claude Code marketplace validator warns on non-kebab-case; Claude.ai marketplace sync outright rejects them. | LOW | Already the convention — just verify during rename. |
| `skills` path arrays resolve to existing dirs with `SKILL.md` | A stale path means the plugin loads broken. Schema requires: each path must contain `<name>/SKILL.md`. | LOW | Paths verified against filesystem. Add to `test:tarball` assertions. |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Three-plugin group structure: `gm-agent-launchers` / `gomad-skills` / `gomad-core` | Maps cleanly onto v1.2's commit-form layout (`.claude/commands/gm/agent-*.md` vs `src/gomad-skills/` vs `src/core-skills/`). Users can install ONLY the launchers if that's all they need (e.g., embedding GoMad agents in a non-bmm workflow). | LOW-MED | This is the v1.3 structural win over current 2-plugin layout (`bmad-pro-skills` + `bmad-method-lifecycle`) — separating launchers gives users an à la carte entry point. |
| `metadata.description` + `metadata.version` on the marketplace itself | Shows up in `/plugin marketplace list` — the thing users see first. `metadata.version` aligns marketplace catalog version with package version for release-channel parity. | LOW | Currently absent. Trivial add with real value. |
| `keywords` / `tags` / `category` on each plugin entry | Feeds Claude.ai marketplace search + `/plugin` TUI filtering. `category: "development"` for launchers, `"productivity"` for gomad-skills, `"core"` for gomad-core is the natural slicing. | LOW | Not required, but keyword-indexing is how marketplaces become discoverable at scale. |
| `homepage: "https://gomad.xgent.ai"` and `repository` filled | Points users straight at the docs site (W2 of this milestone) — self-reinforcing discovery loop. | LOW | Currently `homepage` points at BMAD's repo. |
| CI assertion that manifest paths resolve to real dirs | Prevents the current-state failure mode (paths point at nonexistent `bmm-skills/bmad-*/`). Integrate into `test:tarball` (already extended with v1.2 presence/absence assertions). | MED | One Node script walks `plugins[].skills[]` and stat-s each path. Zero new deps. |
| `strict: true` explicit per plugin | Default, but explicit-is-better-than-implicit defends against accidental `plugin.json` conflicts if any group grows its own manifest later. | LOW | One-line field. |

### Anti-Features

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Monolithic single-plugin listing all ~38 skills + 7 agents | "Simpler" — one install command gets everything. | Users can't install partial scope. Upgrading one plugin re-installs everything. Claude.ai marketplace UX shows a single ~500-line skill list that's impossible to scan. Echoes the BMAD monolith we just escaped. | Keep the 3-group split. |
| Groups sliced by workflow phase (`1-analysis` / `2-plan` / `3-solutioning` / `4-implementation`) | Mirrors source-tree layout, feels "natural". | (a) Agents live across multiple phase dirs (`gm-agent-analyst` in 1, `gm-agent-pm` in 2, `gm-agent-architect` in 3), so phase grouping scatters them. (b) Phase grouping implies users pick phases à la carte — they don't; bmm is an end-to-end workflow. | Group by **role in v1.2 architecture**: launchers (entry points), bmm workflow skills (the workflow), core skills (shared primitives). |
| Groups sliced by audience ("analyst-plugin" / "pm-plugin" / "dev-plugin") | Maps to user persona. | Overlap: `gm-code-review` serves both dev and reviewer audiences. Audience slicing creates duplicate skill entries across plugins. | Keep technical grouping; user picks their own entry agent via `/gm:agent-*`. |
| Plugin dependencies declaring "gomad-skills requires gomad-core" | Prevents users from installing broken configurations. | Cross-plugin dependencies introduce semver-range management overhead (see `/en/plugin-dependencies` — `{plugin-name}--v{version}` git-tag convention). For three in-house plugins shipping from one npm package, overkill. | Document in homepage docs that all three are meant to be installed together. Defer real dependency metadata until/if any group ships standalone. |
| Listing each skill as its own top-level plugin | Claude Code allows it; gives users granular control. | ~38+ plugin entries destroys the marketplace UI. `/plugin marketplace` becomes unreadable. Also means version bumps ripple across 38 entries per release. | Three-group split is the right granularity for this repo size. |
| Populating `hooks` or `mcpServers` in marketplace entries for v1.3 | Unlocks PostToolUse validators etc. (see schema Advanced plugin entries example). | Zero hooks/MCP shipped in v1.2. Adding them in the marketplace manifest without source implementation is dead metadata that will drift. | Omit. Add if/when hook infrastructure ships. |

---

## Workstream 2 — GitHub Pages Docs Site (`gomad.xgent.ai`)

**Constraint from PROJECT.md:** "GitHub Pages deployment — CNAME set to `gomad.xgent.ai`; actual deploy deferred until project stabilizes." v1.3 scope: **initial content**, manually deployed. No CI auto-deploy. Current site is an Astro under-construction one-pager.

**Reference:** BMAD's own docs site (`docs.bmad-method.org`) uses Diátaxis IA (Tutorial / How-To / Explanation / Reference) — applicable shape for GoMad.

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Install page | First thing any user needs. Must cover: `npm install -g @xgent-ai/gomad`, running `gomad install`, `<installRoot>` choice, the v1.2→v1.3 upgrade note (`_config/agents/` relocation). | LOW | Single page. Markdown, copy-paste-able shell blocks. |
| Quick Start page | Two-minute path from empty project to first `/gm:agent-analyst` invocation. Users give up on frameworks that don't deliver a "hello world" in the first 2 minutes. | LOW-MED | Links: install → run one command → see one agent respond. |
| Agents Reference (one entry per `gm:agent-*`) | 7 launcher-form slash commands each need: what the agent does, which phase it belongs to, what skills it wraps, typical invocation context. | MED | 7 pages or one long page. Must match launcher-form naming (`/gm:agent-*`, NOT `gm-agent-*`). |
| Skills Reference (grouped by phase) | Currently ~38 skills across `1-analysis` → `4-implementation` + `core-skills`. Reference must answer "what does this do, when do I call it directly vs. via agent". | MED | One page per phase with a table; OR one page per skill. Phase-grouped table is lighter-weight and v1.3-appropriate. |
| Architecture page | Explains the "why" — launcher-form contract, persona-body runtime loading, manifest-driven installer, `_config/` relocation. Distills `.planning/ARCHITECTURE.md` for public consumption. | MED | Covers D-06 launcher contract, manifest v2, upgrade/recovery. |
| Contributing page | For external contributors: repo layout, how to add a skill, `skill-manifest.yaml` schema, zero-new-deps policy. | MED | Mirrors the v1.1 BMAD-upstream-contribution path we explicitly rejected, but for GoMad. |
| GitHub Pages deploy mechanics (manual) | CNAME record already points at `gomad.xgent.ai`. v1.3 delivers the content; human runs the deploy. | LOW | Plain `main`-branch + `/docs` folder + Pages enabled. No actions, no build step in v1.3. |
| Bilingual parity (en + zh-cn) | Already established in v1.1 (`docs/` default + `zh-cn/`). Continuation rather than new policy. | MED | Mirror every page in `/zh-cn/`. |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Skills Reference generated from `skill-manifest.yaml` | Single source of truth. Prevents the "docs drifted from code" failure mode common in AI agent framework docs. `skill-manifest.yaml` already carries `name`, `description`, `keywords`, inputs — all the metadata a reference entry needs. | MED-HIGH | Small Node script parsing all `src/**/skill-manifest.yaml` → markdown. v1.3 can ship this as a one-shot script (manual `npm run docs:skills` before manual deploy). No CI in v1.3. |
| Launcher stub examples inlined in Agents Reference | Shows users what the `.claude/commands/gm/agent-*.md` launcher body looks like (or at least the persona body at `_gomad/_config/agents/*.md` per W3). Demystifies the "how does `/gm:agent-*` actually work" question. | LOW | One code fence per agent. Copy-paste from source. |
| Downloadable `.md` source per page | Agents read the docs. GitHub-Pages-by-default is HTML-only; shipping raw `.md` alongside means `gm-*` skills can cite the docs at `https://gomad.xgent.ai/skills/gm-create-story.md`. | LOW | GitHub Pages serves `.md` as text/plain by default if extension is preserved. |
| Prominent "fork of BMAD" disclaimer on landing + every Reference page header | Continues the canonical non-affiliation posture. A docs site that hides its upstream is worse than one that doesn't exist. | LOW | One-line header include, reusing the canonical disclaimer. |
| Version selector in nav | Indicates actively maintained docs vs. legacy. | HIGH | **Anti-feature for v1.3.** Plain flat docs; defer until v1.4+ when multiple active versions exist on npm. |
| Anchor links for every FR-NN requirement (once sufficiently stable) | Lets PRD authors cite `gomad.xgent.ai/spec#FR-12` directly from their PRDs. | MED | Stretch for v1.3. Safer to ship reference-only first. |

### Anti-Features

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Hand-maintained skills list | "Just write it out — it's only 38 skills." | Guaranteed drift: a v1.4 skill rename breaks the list. Every BMAD-era artifact we've touched in this fork has had drift between source and docs. | Generate from `skill-manifest.yaml`. |
| Deep multi-level nav (4+ levels) | "Mirror source-tree depth for accuracy." | Users scan, they don't browse. Anything past 2 levels gets skipped. Diátaxis model explicitly argues against deep hierarchies. | Flat: Docs → (Install / Quick Start / Agents / Skills / Architecture / Contributing). Within Agents and Skills, one level of grouping max. |
| Auto-deployed from `main` via GitHub Actions in v1.3 | "Standard practice." | PROJECT.md explicitly defers CI deploy to when project stabilizes. Manual deploy is an intentional scope boundary for v1.3. Echo decision, don't re-litigate. | Manual deploy. Revisit for v1.4+. |
| Doc-only features | "Document the aspirational roadmap alongside shipped state." | Forces users to reason about what's real vs. planned. Public docs must track `latest` dist-tag only. | Docs site documents what's in `@xgent-ai/gomad@latest`. Aspirational roadmap lives in internal `.planning/`. |
| Marketing-heavy landing page | "Pitch the product." | Audience is internal xgent-ai + a small set of AI-assisted-dev adopters. Per PROJECT.md: "Public discoverability is secondary; correctness and credit are primary." A feature-ticker landing competes with the canonical disclaimer for surface area. | Utilitarian landing: what is GoMad, who it's for, where to start, credit to BMAD. |
| Interactive playground / live agent demo | Common in modern docs sites. | Requires a hosted Claude Code session. Infra-heavy, zero v1.3 budget. | Link to `gm-help` skill from the Quick Start. |
| Versioned docs at v1.3 | Parity with React/Next/Tailwind docs conventions. | Only one active version. Versioned docs are infrastructure for a problem we don't have yet. | Defer. Single `latest` view in v1.3. |

---

## Workstream 3 — Agent Dir Relocation (`<installRoot>/gomad/agents/` → `<installRoot>/_config/agents/`)

**Scope (from PROJECT.md):** "Agents-only; `gomad/workflows/` and `gomad/data/` stay put. v1.2→v1.3 upgrade via manifest-v2 cleanup with backup snapshots."

**Prior-art context (MEDIUM confidence):** Node ecosystem has no binding standard for in-tree config location. XDG Base Directory Spec defines `~/.config/` for user-level config but doesn't govern in-tree runtime layouts. Existing in-the-wild patterns: `.claude/` (Claude Code itself), `.yarn/` (Yarn Berry), `node_modules/.cache/`, `.gitignore`-adjacent dotfiles. The `_config/` convention (single underscore prefix, non-hidden) is unusual — makes the directory visible in `ls` but sorts ahead of alphanumeric siblings. No universal standard to appeal to; the choice is a local gomad convention.

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Manifest-v2 path list cleanly reflects the new location | `files-manifest.csv` already tracks `type,name,module,path,hash`. v1.3 needs agent entries writing to `_config/agents/` and the v1.2 → v1.3 cleanup path removing old `_gomad/gomad/agents/*`. | LOW-MED | Manifest schema unchanged — only the `path` column values change. |
| Realpath containment extended to `_config/` | v1.2 cleanup realpath-contains deletions under `.claude/` + `_gomad/`. `_config/` is already a subdir of `_gomad/` so containment holds by default — no schema change needed. | LOW | Verify the containment prefix check in `buildCleanupPlan` doesn't special-case `gomad/agents/`. |
| Pre-cleanup backup snapshot under `_gomad/_backups/<timestamp>/` | Carries forward v1.2 reversibility contract. Non-negotiable for a path relocation. | LOW | Mechanism shipped. Only change is which paths flow through it. |
| Launcher stubs continue to find the persona body | `.claude/commands/gm/agent-*.md` loads from `_gomad/gomad/agents/*.md` at runtime today. The D-06 contract / launcher extractor must now emit the `_gomad/_config/agents/*.md` path. | LOW-MED | Single path constant in the launcher-stub generator. Requires targeted test: `test:gm-surface` install-smoke assertion checking the new path is what stubs point at. |
| `docs/upgrade-recovery.md` updated | v1.2 shipped this doc for the manifest-cleanup flow. Adding the `gomad/agents/` → `_config/agents/` leg is table stakes for anyone hitting the cleanup cold. | LOW | Append v1.3 section. |
| Silent upgrade path (no user prompts during `gomad install` re-run) | v1.2's upgrade was non-interactive by default (`--dry-run` opt-in). Consistency matters. | LOW | Flows through existing cleanup. |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| `--dry-run` preview continues to show the full diff | Already exists. v1.3 free-rides. Users get to see `delete _gomad/gomad/agents/*, create _gomad/_config/agents/*` before committing. | LOW | Free. |
| CHANGELOG v1.3.0 BREAKING callout | v1.2 established the pattern ("CHANGELOG v1.2.0 includes explicit BREAKING callout"). Any consumer with hand-pinned paths to `_gomad/gomad/agents/` breaks silently otherwise. | LOW | One paragraph in CHANGELOG + README upgrade note. |
| Rollback instruction in `docs/upgrade-recovery.md` | Explicit "to roll back: copy `_gomad/_backups/<timestamp>/gomad/agents/` back to `_gomad/gomad/agents/` and re-install @1.2.0". | LOW | Plain-text recipe. No tooling. |
| Tarball presence/absence assertions for `_config/agents/` | v1.2 extended `test:tarball` with presence of `.claude/commands/gm/` + absence of `.claude/skills/gm-agent-*`. v1.3 gets an analogous assertion pair for `_config/agents/` presence, `gomad/agents/` absence (or more precisely: no new-ship of `gomad/agents/`). | LOW-MED | Adds 2 assertions to existing test. |
| Future-facing: document `_config/` as the home for *other* config — kb packs (W4) live there too | Frames the rename as "pulling config out of the workflow tree" rather than "moving agents around." Sets up W4's `_config/kb/` naturally. | LOW | Framing only — no code. |

### Anti-Features

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Silent migration with no upgrade note | "Just move stuff; it's a copy-only installer; the cleanup handles it." | Users who run `require('./path/to/_gomad/gomad/agents/dev.md')` in their own automation break with no warning. BMAD heritage = zero trust-fund of goodwill for silent breakage. | Explicit BREAKING in CHANGELOG, note in README upgrade section. |
| Renaming to `.config/` (hidden, leading dot) | Matches XDG convention + Node tradition. | (a) Hidden dirs get missed by users exploring install output. (b) Claude Code already owns `.claude/`; another hidden `.config/` competes visually. (c) `_config/` sort-ahead behavior is deliberate — users see the config dir first when they `ls <installRoot>/`. | Stick with `_config/`. |
| Moving `gomad/workflows/` and `gomad/data/` too | "Clean sweep, one migration." | Scope violation. PROJECT.md scopes v1.3 to agents-only. Mixing structural moves dilutes the migration blast radius. Phase 7 experience in v1.2 established that cleanup discipline = small deletes one at a time. | Agents-only for v1.3. Document `workflows/`/`data/` as stable, not relocating. |
| New "migration wizard" UI | Interactive upgrade feels polished. | Non-interactive default is the v1.2 contract; reversing it for one workstream breaks consistency. `--dry-run` is the interactive affordance. | Free-ride on `--dry-run`. |
| Delete `_gomad/_backups/` older than 90 days as part of v1.3 cleanup | Unbounded backup growth is real. | `REL-F1` (backup rotation) is explicitly deferred. Wiring rotation into v1.3 is scope creep. | Keep REL-F1 deferred. |
| Auto-update user-owned scripts that reference the old path | "Helpful." | We can't reliably find those references, and touching user files outside the manifest-contained root violates the containment contract. | User's problem. Document in CHANGELOG. |

---

## Workstream 4 — Story-Creation Enhancements (Highest Detail Warranted)

Three sub-features bundled: `gm-discuss-story` (NEW), `gm-create-story` context-load (MODIFY), `gm-domain-skill` (NEW + 2 seed knowledge packs).

### 4A — `gm-discuss-story` (NEW)

**Purpose:** Manual-step precursor to `gm-create-story` that surfaces gray areas before the dev-agent context is generated. Mirrors `/gsd:discuss-phase` ergonomics from the GSD dev-tooling layer (`.claude/get-shit-done/workflows/discuss-phase.md` — read in full).

**Dependency analysis (HIGH confidence — workflow.md read):** `gm-create-story` consumes epics (`{planning_artifacts}/epics.md`) + PRD + architecture + UX + prior story file. `gm-discuss-story` must consume the **same inputs** (so the gray-area analysis is grounded) PLUS the current `story_key` to target a specific story. It does NOT consume context from prior CONTEXT.md files (that's phase-level — story-level is a different granularity). Output path: `{planning_artifacts}/{{story_key}}-context.md`.

**Scope-boundary fundamentals** carried over from `discuss-phase.md`'s `<scope_guardrail>`:
- Story boundary comes from epic — FIXED. Discussion clarifies HOW, never WHETHER.
- User = visionary, Claude = builder.
- Gray areas are implementation decisions the user cares about that could go multiple ways.

#### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Takes `{{story_key}}` (e.g. `1-2-user-auth`) as argument OR auto-discovers from sprint-status.yaml | Mirrors `gm-create-story` step-1 discovery contract exactly. Users who already run `gm-create-story` without args should get the same ergonomics. | LOW-MED | Read-only reuse of the sprint-status parsing from `gm-create-story/workflow.md`. |
| Loads epics + PRD + architecture + UX via `discover-inputs.md` protocol | Every gray-area question must be grounded in what's actually planned. Skipping this = asking the user to re-decide stuff that's already in the PRD. | LOW | Direct reuse of the existing `discover-inputs.md` SELECTIVE_LOAD pattern. |
| Identifies 3-5 story-level gray areas before asking the user | `discuss-phase.md` pattern: Claude analyses first, THEN presents a multiSelect. Never ask "what gray areas exist?" — that's the user's fault for fuzzy AC. | MED | Story-level gray-area categories (concrete, not generic — see STORY-LEVEL GRAY AREAS below). |
| `AskUserQuestion` (multiSelect) for gray-area selection | Matches discuss-phase UX. User picks which areas to discuss; others flow through as Claude's Discretion. | LOW | Max 4 options, header ≤12 chars. |
| Per-area question loop until "next area" | discuss-phase default pacing: 4 questions per area, then check "more or next?". | MED | Reuse loop structure from discuss-phase.md. |
| Writes `{planning_artifacts}/{{story_key}}-context.md` | The contract between this skill and `gm-create-story` (4B). Specific filename so 4B can glob-detect. | LOW | `planning_artifacts` is already a known path from `config.yaml`. |
| Output contract (section headings — see below) | Downstream consumer (`gm-create-story`) must be able to parse this file deterministically. | MED | Section headings locked as part of this research. |
| Idempotent — re-run on existing context offers Update/View/Skip | Directly from discuss-phase.md `check_existing`. | LOW | |
| Scope-creep redirect ("that's a new story") | `<scope_guardrail>` from discuss-phase.md. Story-level version: "that sounds like Story 1.3, not 1.2 — defer to that story's context." | LOW | |

#### STORY-LEVEL GRAY AREAS (the concrete categories Claude scans for)

These are the domain probes `gm-discuss-story` runs over the loaded epic+PRD+architecture context. Not generic labels — real decision points that change implementation:

1. **Acceptance criteria edge cases** — AC says "user logs in with email+password". What about: empty fields, malformed email, case-sensitivity on email, trailing whitespace, 50-char vs 500-char password, account lockout thresholds, expired password?
2. **Non-functional requirements** — Latency ceiling for the happy path? Concurrent-user assumption? Memory footprint if this runs in a worker? Accessibility (WCAG level)? These rarely make it into AC but always bite on code review.
3. **Data-model ambiguities** — "We store users" — in which table? FK cascade on delete? Soft delete or hard? Index choices? Migration strategy if this alters an existing schema?
4. **Downstream consumer contracts** — If this story emits an event / writes an API response / updates shared state, which other stories/services read it? Format freeze or versioned?
5. **Failure-mode surface area** — What happens on DB unavailable? Partial write? Duplicate request? Rate limit hit? The story will hit these — agent will guess badly without guidance.
6. **Library / integration choice** (when ambiguous) — "We send an email" — via what? Existing SES wrapper? SMTP? New Resend integration? Architecture doc may not have anticipated this specific story.
7. **Observability contract** — Logs at which level? Trace span? Metrics emitted? Dead-letter handling? Usually absent from AC but decisive for production readiness.
8. **Testing approach** — Unit-only, or integration too? Mock which services? Test-data fixtures reused or story-specific?

Not every story needs all 8. `gm-discuss-story`'s analysis step picks the 3-5 that actually have gray in them — per `<gray_area_identification>` in discuss-phase.md.

#### Output Contract — `{{story_key}}-context.md` Sections (LOCKED)

This is the concrete shape `gm-create-story` (4B) reads. Sections mirror discuss-phase.md's CONTEXT.md template, adapted for story scope:

```markdown
# Story {{story_key}} — Context

**Gathered:** [ISO date]
**Status:** Ready for story creation
**Epic:** {{epic_num}}
**Story title:** {{story_title}}

<domain>
## Story Boundary

[One-paragraph statement of what this story delivers — anchors scope.
Lifted from epic AC + PRD. NOT freshly interpreted.]
</domain>

<decisions>
## Implementation Decisions

### Acceptance Criteria Edge Cases
- **D-01:** [concrete decision — e.g. "Email comparison is case-insensitive; trailing whitespace trimmed"]
- **D-02:** [concrete decision]

### Non-Functional Requirements
- **D-03:** [e.g. "p95 latency budget = 300ms happy path; 1s degraded"]
- **D-04:** [e.g. "WCAG AA on form inputs; no live-region announcements required"]

### Data Model
- **D-05:** [e.g. "Add `last_login_at` column to `users`, nullable, indexed; migration in this story"]

### Failure Modes
- **D-06:** [e.g. "DB unavailable → return 503 + retry-after:5; do not fall back to cache"]

### Observability
- **D-07:** [e.g. "Emit `auth.login.succeeded` / `auth.login.failed` structured-log events at info/warn"]

### Claude's Discretion
[Areas where user explicitly said "you decide" — Claude gets flexibility here.]
</decisions>

<canonical_refs>
## Canonical References

[MANDATORY. Every spec/ADR/doc that gm-create-story + gm-dev-story MUST read.
Full relative paths, not just names. Grouped by topic.
Inherited from discuss-phase.md's canonical_refs accumulator pattern.]

### Architecture
- `{planning_artifacts}/architecture.md#auth-module` — auth-module structural contract

### External specs
- `docs/adr/adr-007-session-management.md` — session timeout + rotation rules
</canonical_refs>

<specifics>
## Specific Ideas

[User-quoted language. "I want the error message to say X". "Reference how Y does it."
Verbatim where possible. NEVER paraphrased into generic language.]
</specifics>

<deferred>
## Deferred To Other Stories

[Scope-creep items redirected out. Preserved so user doesn't lose the thought,
but not locked into this story.]
- [Idea] — belongs to Story {{future_story_key}}
</deferred>

---
*Story: {{story_key}}*
*Context gathered: [date]*
*Consumed by: gm-create-story, gm-dev-story*
```

#### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Auto-integrates with `gm-domain-skill` (W4C) | When user references "like how React.Suspense is discussed in react-perf kb", `gm-discuss-story` calls `gm-domain-skill` to fetch the relevant kb-pack section and inlines it into `<canonical_refs>`. | MED-HIGH | Creates a natural dependency chain 4C→4A→4B. Powerful. |
| Checkpoint file for interrupted sessions | `gm-discuss-story` writes `{planning_artifacts}/{{story_key}}-context-checkpoint.json` after each area. Resume across sessions. Directly from discuss-phase.md. | MED | Port of `check_existing` + checkpoint logic. |
| `--all` / `--auto` flag parity | discuss-phase.md has `--power`, `--all`, `--auto`, `--chain`, `--text`, `--batch`, `--analyze`. For v1.3, ship `--auto` (recommended defaults) + `--text` (for `/rc` remote sessions). Others can come later. | MED | Minimal flag set for MVP. |
| Prior-story-context awareness | Read previous story's final file (like `gm-create-story` step 2 does) — surface "story 1.1 decided X; does that constrain this story?" | MED | Reuses existing `gm-create-story` discovery logic. |
| Scope boundary is epic AC, not "whatever the user says" | Scope-guardrail text (directly from discuss-phase.md) prevents story discussions from mushrooming into "let's redesign the feature." | LOW | Include the guardrail text in the skill prompt. |

#### Anti-Features

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Generic gray-area categories ("UI", "UX", "Behavior") | "Easy to enumerate." | discuss-phase.md explicitly warns against these: "Don't use generic category labels. Generate specific gray areas." Generic labels produce generic answers. | Domain-specific probes (the 8 story-level categories above). |
| Asking about implementation details Claude should figure out (architecture patterns, performance optimization) | "Gather more context." | discuss-phase.md `<philosophy>`: "User = visionary, Claude = builder." Asking about codebase patterns wastes user time and anchors wrong. | Ask about vision + acceptance-edge decisions. Let Claude read the code. |
| Running `gm-discuss-story` AFTER `gm-create-story` as "refinement" | Makes sense linearly. | Inverts the information flow. Story context is an INPUT to story creation, not an output. | Discuss BEFORE create. Matches PROJECT.md phrasing: "manual-step precursor to `gm-create-story`". |
| Hard-requiring `gm-discuss-story` before `gm-create-story` | Forces the gray-area surfacing. | Breaks backward compat: v1.2 `gm-create-story` runs fine without context.md. Users with clear AC shouldn't pay the discuss tax. | OPTIONAL — 4B auto-loads if present, works as before if absent. |
| Full AskUserQuestion flow in `gm-discuss-story` by default in `/rc` remote sessions | Standard UX. | AskUserQuestion's TUI menu doesn't render through Claude App → `/rc` sessions. discuss-phase.md explicitly handles this with `workflow.text_mode`. | Inherit `--text` flag + `workflow.text_mode` config detection. |
| Writing context.md outside `planning_artifacts` (e.g., next to story file in `implementation_artifacts`) | "Co-locate with story for visibility." | Story file (`{implementation_artifacts}/{{story_key}}.md`) is CREATED by `gm-create-story` — context must exist before it's there. Also: `planning_artifacts` is the canonical home for pre-implementation artifacts. | `{planning_artifacts}/{{story_key}}-context.md`. |

---

### 4B — `gm-create-story` Context Load (MODIFY)

**Current behavior (HIGH confidence — workflow.md read):** `gm-create-story` step-2 calls `discover-inputs.md` which loads epics, prd, architecture, ux. It also loads `project_context = **/project-context.md` if it exists. No story-specific context is currently considered.

#### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Detect `{{story_key}}-context.md` in `{planning_artifacts}/` | Simple glob match after `story_key` is known (step-1 output). | LOW | One new line in `discover-inputs.md` or step-2. |
| If present, load into `{story_context}` variable alongside `{epics_content}` etc. | Contract defined by `gm-discuss-story` output. | LOW | Direct file read. |
| If absent, proceed as v1.2 (no change) | Backward compatibility. Users who never run `gm-discuss-story` must see zero behavior change. | LOW | Early return on missing file. |
| Precedence: context.md `<decisions>` > epic AC > PRD defaults > architecture guidance > Claude inference | When sources contradict, the most specific wins. Context.md decisions are locked by the user for THIS story — highest authority. | MED | Document in skill prompt with concrete example. |
| Inline context.md `<decisions>` into the "developer_context_section" or "technical_requirements" template section | The D-0N decisions need to show up in the final story file so `gm-dev-story` sees them at implementation time. | MED | template.md update — add a "Story Context (from gm-discuss-story)" section. |
| Thread `<canonical_refs>` from context.md into story's `### References` section | Story references are already a template section. Context.md adds to the list. | LOW | Merge, de-dupe by path. |

#### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Surface missing context.md as a hint, not a blocker | "No discuss-story context found. Run `gm-discuss-story {{story_key}}` first for richer context, or continue without." — before creating the story file. | LOW | One `<output>` line in step-2. |
| Conflict-detection when context.md contradicts epic AC | "Context says case-insensitive email; epic AC says 'exact match' — resolving in favor of context.md. Flagging for review." | MED | One pass comparing AC text to D-0N decisions. Non-blocking, just logged. |
| Bump story Status to `"ready-for-dev-with-context"` when context.md was loaded | Distinguishes stories that went through discuss from ones that didn't. Signal to reviewer. | LOW | Optional — keep `ready-for-dev` if simplicity preferred. |

#### Anti-Features

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Require context.md; fail if absent | Forces the discuss step. | Breaks v1.2 contract + ignores cases with crystal-clear AC. | Optional. Missing = hint, not error. |
| Context.md OVERRIDES epic AC silently | Simpler precedence. | Hides contradiction from user. An epic AC is a commitment; silent override = "the story secretly means something else." | Detect conflict, log it, apply context.md precedence WITH a visible note in the story file. |
| Inline the entire context.md verbatim into story file | "Preserve full context." | Story file becomes huge; `gm-dev-story` wastes tokens re-reading what was distilled. | Inline `<decisions>` + `<canonical_refs>` + `<specifics>`. Skip `<deferred>` and `<domain>` (redundant with story.md's own sections). |
| Re-run `gm-discuss-story` automatically if context.md is older than the epic | "Keep it fresh." | Violates user's expectation of explicit manual-step workflow. Invisible re-runs = surprise token/time cost. | Hint only: "Context.md older than epic — consider re-running gm-discuss-story." |

---

### 4C — `gm-domain-skill` (NEW) + 2 Seed Knowledge Packs

**Purpose (from PROJECT.md):** "Framework + retrieval protocol + 2 seed knowledge packs (`src/domain-kb/` → `<installRoot>/_config/kb/`)."

**Reference implementations inspected:**
- **Claude-Cortex** (`NickCrew/Claude-Cortex`, `skills/react-performance-optimization/SKILL.md`) — knowledge pack with frontmatter (name, description, keywords, `file_patterns` glob triggers, confidence score), body = overview + Quick Reference Table mapping topics to reference files + Implementation Patterns (code examples) + Common Mistakes + Checklist + External Resources. Knowledge-pack hallmark: conceptual foundations + modular reference files + cross-context applicability.
- **vercel-labs/agent-skills** (`skills/react-best-practices/SKILL.md`) — name `vercel-react-best-practices`, description "when writing, reviewing, or refactoring React/Next.js code", MIT licensed, v1.0.0. Structure: "When to Apply" triggers + 8 rule categories ranked by impact + Quick Reference + "How to Use" + references to `rules/*.md` (individual rule files) and a compiled `AGENTS.md`.

**Common structural pattern across both:** `SKILL.md` is the entry point with frontmatter; body is a lightweight topic-map; heavy content lives in `rules/` or `reference/` subdirectories; examples + anti-patterns + checklist are table-stakes sections.

**Retrieval target:** `gm-domain-skill` takes a domain slug → greps `<installRoot>/_config/kb/<slug>/*.md` → returns top-1 best match. Consumer-agent can then request specific sections.

#### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Caller signature: `gm-domain-skill(domain_slug, query) → markdown` | Invokable from other skills (`gm-discuss-story`, `gm-create-story`, `gm-dev-story`) as a primitive. | LOW-MED | SKILL.md + workflow.md pattern (same shape as existing skills). |
| Slug resolution: `<slug>` maps to `<installRoot>/_config/kb/<slug>/` (directory) | Simple path resolution. No registry / index file. | LOW | `fs.existsSync` + directory check. |
| Grep over `<slug>/*.md` | Node `fs.readdirSync` + `fs.readFileSync` + string matching. No new deps. | LOW-MED | Start with case-insensitive substring match; upgrade to scored matching later. |
| Match ranking: simple TF-ish score — count of query-term occurrences, weighted by (a) heading matches (b) first-paragraph matches (c) body matches | Good-enough retrieval for 10s-of-files packs. | MED | Node-native; zero deps. Return top-1 AND include 2nd/3rd as alternatives in metadata. |
| Return shape: `{ file_path, heading_hit, excerpt, full_markdown }` | Structured so the caller can decide whether to inline the full file or cite with a section ref. | LOW-MED | Small object. |
| "Not found" graceful return | `{ file_path: null, error: "slug <slug> not installed. Available slugs: [...]" }` | LOW | Dir-listing on `_config/kb/`. |
| Seed pack 1 — `_config/kb/testing/` | Reasonable starter domain. Test pyramid, fixtures, mocking guidance. | MED | One SKILL.md + 5-8 reference `.md` files. |
| Seed pack 2 — `_config/kb/architecture/` (OR another chosen slug) | Covers the "what are the tradeoffs of approach X vs Y" question space. | MED | Same shape. |
| Each pack has `SKILL.md` with frontmatter (`name`, `description`, `keywords`) | Matches Anthropic Agent Skills open format (per `agentskills.io` — skill = folder containing SKILL.md file). Interoperable with Claude Code's skill-discovery. | LOW | Direct copy of current `skill-manifest.yaml` → frontmatter convention. |
| Each pack has clear TOC in SKILL.md mapping topics → reference files | The Claude-Cortex + vercel pattern. Keeps SKILL.md light and makes cross-pack comparison possible. | LOW | Markdown table. |

#### What Counts as a Well-Formed Knowledge Pack (gomad canonical format)

Locked structural contract for `src/domain-kb/<slug>/`:

```
src/domain-kb/<slug>/
├── SKILL.md              # frontmatter + overview + TOC
├── reference/            # individual topic pages
│   ├── overview.md
│   ├── <topic-1>.md
│   ├── <topic-2>.md
│   └── ...
├── examples/             # (optional) runnable/illustrative code
│   └── <example-N>.md
└── anti-patterns.md      # what NOT to do, with rationale
```

**SKILL.md minimum sections:**
```markdown
---
name: gomad-kb-<slug>
description: <one-sentence domain + when-to-apply trigger>
keywords: [<3-6 keywords>]
license: MIT
---

# <Domain Name>

## When to Apply

[Context triggers — when an agent should request this kb.]

## Topic Map

| Topic | Reference File | Summary |
|-------|----------------|---------|
| ...   | reference/X.md | ...     |

## Overview

[1-2 paragraph orientation.]

## Core Concepts

[Named concepts with 1-sentence definitions.]

## Common Mistakes

[3-5 anti-patterns with alternatives. Link to anti-patterns.md for depth.]

## External Resources

[Canonical upstream docs, spec URLs.]
```

Install-time: `src/domain-kb/*/` → `<installRoot>/_config/kb/*/` (one-to-one copy). Manifest v2 tracks each file.

#### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| `gm-discuss-story` integration — discussion can cite kb by slug | User says "use the testing kb's approach" → `gm-discuss-story` calls `gm-domain-skill('testing', 'fixtures')` → inlines guidance into `<canonical_refs>`. | MED | Requires stable caller API for `gm-domain-skill`. |
| `gm-create-story` / `gm-dev-story` opt-in citation | Story file can carry `<!-- kb: testing/fixtures -->` hints → `gm-dev-story` loads the kb-pack at implementation time. | MED | Signals which docs matter without bloating story file. |
| Pack authoring guide (`docs/domain-kb-authoring.md`) | Defines the canonical format so external contributors can add kbs. Table-stakes if this framework is to scale beyond 2 seed packs. | LOW-MED | Covered by the canonical format above. |
| `gm-domain-skill list` subcommand (or companion skill) | Enumerate available kb slugs. User discovers what's installed without shelling to the filesystem. | LOW | One-liner listing dir. |
| Version pinning per pack (each SKILL.md frontmatter has `version: 1.0.0`) | If kb content evolves (testing best practices drift), users can detect "my dev-agent is citing stale testing guidance from v0.9." | LOW | Frontmatter field. No versioning logic needed in v1.3 — just the field. |

#### Anti-Features

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Embed a vector-search index (chunks → embeddings → cosine similarity) | Modern retrieval-augmented generation. | Adds heavy runtime deps (sentence-transformers, FAISS, or hosted embedding API) — violates v1.2 zero-new-deps policy carried into v1.3. Also: 2 seed packs do not need vector search to find the right file. | Simple keyword-scored grep. Upgrade path exists if kb count >>20. |
| Pull kb packs from a remote registry at runtime | Dynamic ecosystem. | Network calls during agent invocation = unreliable + auth-complicated. v1.2 copy-only installer precedent argues for static bundling. | Ship kb packs in-repo (`src/domain-kb/`), installed at `gomad install` time. |
| Top-K retrieval (K>1) by default | More context = better answers. | Consumers can't reason about source attribution with 5 files returned. Also bloats the caller's context window. | Top-1 with alternatives in metadata. Caller explicitly opts into more. |
| Allow kb authors to define arbitrary directory structures | "Don't be prescriptive." | Defeats retrieval: grep + ranking depend on predictable layout. Each nonconforming pack = a special case. | Lock the canonical format (above). Validator script in `test:tarball`. |
| Ship the Anthropic / vercel packs directly | "They're already well-written." | License / attribution overhead; they're not gomad-shaped (different triggers, different retrieval contract). | Write 2 native packs; reference Claude-Cortex + vercel-labs as prior-art in `docs/domain-kb-authoring.md`. |
| Overlap with `core-skills/gm-help` or `gm-advanced-elicitation` | "Help + kb are the same thing." | They're not. `gm-help` = CLI/workflow help ("how do I run X?"). `gm-domain-skill` = technical domain knowledge ("what's the right approach to retry policies?"). Different audiences, different triggers. | Keep them separate. Cross-reference only if natural. |
| Hard-bind kb slugs to specific agent personas (e.g., `testing` kb only callable from `gm-agent-dev`) | Access control. | Violates the primitive nature of `gm-domain-skill`. Any skill/agent might need any kb. | Flat access — any caller, any slug. |

---

## Feature Dependencies

```
gm-domain-skill (4C)
    ├─ enables ──> gm-discuss-story citing kb in canonical_refs (4A)
    └─ installed via ──> _config/kb/ relocation context (W3)

gm-discuss-story (4A)
    ├─ consumes ──> epics.md, PRD, architecture, UX (via discover-inputs.md — EXISTING)
    ├─ produces ──> {planning_artifacts}/{{story_key}}-context.md
    └─ feeds ────> gm-create-story context load (4B)

gm-create-story context load (4B)
    └─ consumes ──> {{story_key}}-context.md from 4A

Agent dir relocation (W3)
    ├─ launcher extractor (v1.2 D-06) ──> updated path _config/agents/
    ├─ manifest v2 ──> tracks new paths, cleans old
    └─ sets up _config/ ──> knowledge-pack home for 4C

Plugin marketplace refresh (W1)
    ├─ skill paths ──> must reference current gomad-skills/gm-* tree
    ├─ homepage ──> points at docs site (W2)
    └─ independent of W3/W4 for source paths (kb pack dirs are in-source; marketplace entry doesn't need per-kb-pack entries in v1.3)

GitHub Pages docs site (W2)
    ├─ skills generation ──> reads src/**/skill-manifest.yaml (references W3's `_config/agents/` new location in Agents Reference)
    ├─ includes kb-pack authoring guide (supports 4C)
    └─ documents upgrade mechanics (W3 rollback recipe)
```

### Dependency Notes

- **4C `gm-domain-skill` blocks nothing but unlocks 4A integration.** Ship the retrieval primitive + 2 seed packs; integration into `gm-discuss-story` is a nice-to-have, not required.
- **4A `gm-discuss-story` depends only on EXISTING infra** (`discover-inputs.md`, sprint-status.yaml parsing in `gm-create-story`). Can ship before 4C.
- **4B modify ships with 4A.** They're a contract pair — context.md writer + reader. Independent delivery creates a dead contract.
- **W3 `_config/` relocation precedes 4C shipment.** Install target for kb packs is `<installRoot>/_config/kb/` — if `_config/` isn't established yet, kb packs need a second relocation later.
- **W1 marketplace refresh independent** of all other workstreams (it's a JSON rename + path-update operation). Can ship first or last in the phase sequence.
- **W2 docs site depends on shipped state of W1/W3/W4** — Agents Reference page documents the `_config/agents/` path (W3); Skills Reference generates from manifests; Architecture page explains `_config/kb/` (W4). W2 should be scheduled AFTER W1/W3/W4 content is stable.

## MVP Definition

### Launch With (v1.3 — all six Active items from PROJECT.md)

Per PROJECT.md Active list — these are the scoped v1.3 deliverables:

- [ ] **W1 Marketplace refresh** — renamed `marketplace.json` with 3-group structure + v1.3.0 version pinning + `test:tarball` path validation
- [ ] **W2 Docs site (manual deploy)** — Install / Quick Start / Agents / Skills / Architecture / Contributing pages; bilingual; manually deployed to `gomad.xgent.ai`
- [ ] **W3 Agent dir relocation** — `_config/agents/` with manifest-driven cleanup, backup snapshot, CHANGELOG BREAKING call-out, upgrade-recovery.md updated
- [ ] **W4A `gm-discuss-story`** — SKILL.md + workflow.md emitting `{{story_key}}-context.md` with locked section contract
- [ ] **W4B `gm-create-story` context load** — auto-detect + merge with precedence rules
- [ ] **W4C `gm-domain-skill` + 2 seed packs** — retrieval primitive + canonical kb format + 2 seeded domains under `src/domain-kb/`

### Add After Validation (v1.4+)

- [ ] Skills reference auto-gen CI pipeline (upgrade from v1.3's manual `npm run docs:skills`)
- [ ] Docs versioning (multi-version selector)
- [ ] Plugin dependencies between `gomad-core` / `gomad-skills` / `gm-agent-launchers`
- [ ] Backup rotation policy (REL-F1 — already deferred)
- [ ] `gm-domain-skill` remote-registry support OR vector-scoring upgrade (trigger: kb count >>20)
- [ ] Additional `--flag` parity for `gm-discuss-story` (`--power`, `--chain`, `--batch`, `--analyze`)
- [ ] Cross-plugin marketplace dependencies (`allowCrossMarketplaceDependenciesOn`)

### Future Consideration (v2+)

- [ ] Interactive docs playground
- [ ] Hooks / MCP server entries in marketplace manifest (need source implementation first)
- [ ] Third-party kb pack ecosystem (marketplace of marketplaces)

## Feature Prioritization Matrix

Scoped to v1.3 workstreams only. "User Value" = internal xgent-ai team + AI-assisted-dev adopters per PROJECT.md audience.

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| W1 marketplace rename + path update | HIGH (current file actively misrepresents the project) | LOW | P1 |
| W1 3-group restructure | MEDIUM (better discoverability) | LOW | P1 |
| W1 marketplace metadata (version, keywords, homepage) | LOW-MED | LOW | P1 |
| W2 Install + Quick Start pages | HIGH | LOW | P1 |
| W2 Agents + Skills Reference | HIGH | MED | P1 |
| W2 Architecture + Contributing pages | MED | MED | P1 |
| W2 bilingual parity | MED | MED | P1 |
| W2 auto-gen skills from manifest | MED | MED | P2 |
| W3 manifest-driven relocation | HIGH (blocks W4C kb install target) | LOW-MED | P1 |
| W3 upgrade-recovery.md + CHANGELOG | HIGH (safety contract) | LOW | P1 |
| W3 tarball assertions | MED | LOW-MED | P1 |
| W4A gm-discuss-story core | HIGH (new capability) | MED | P1 |
| W4A checkpoint + resume | MED | MED | P2 |
| W4A --text flag | MED (required for /rc) | LOW | P1 |
| W4B context.md auto-load | HIGH (wire 4A to dev flow) | LOW | P1 |
| W4B conflict detection | LOW-MED | MED | P2 |
| W4C gm-domain-skill retrieval | MED-HIGH | MED | P1 |
| W4C seed pack 1 (testing) | MED | MED | P1 |
| W4C seed pack 2 (architecture or chosen domain) | MED | MED | P1 |
| W4C kb authoring guide | MED | LOW | P1 |

**Priority key:**
- P1: Must ship in v1.3 (matches the 6 Active items in PROJECT.md)
- P2: Should ship in v1.3 if budget allows; otherwise defer to v1.4
- P3: Future consideration (not in this doc — see "v2+" above)

## Competitor / Prior-Art Feature Analysis

| Feature | BMAD (docs.bmad-method.org) | Claude-Cortex | vercel-labs/agent-skills | GoMad v1.3 Plan |
|---------|-----------------------------|---------------|--------------------------|------------------|
| Docs IA | Diátaxis (Tutorials / How-To / Explanation / Reference) | README-heavy, no dedicated site | README-heavy, no dedicated site | Simplified Diátaxis — Install / Quick Start / Agents / Skills / Architecture / Contributing (flat) |
| Skills reference | Hand-maintained "commands" reference | Root-README lists skills | Root-README lists skills | Auto-gen from `skill-manifest.yaml` (MVP = manual script) |
| Plugin marketplace | Modular: one GitHub-Pages-ready `docs/` per module | N/A | N/A | 3-group `marketplace.json` (launchers / skills / core) |
| Knowledge packs | bmad-help skill + external web | `skills/<domain>/SKILL.md` + `references/` | `skills/<domain>/SKILL.md` + `rules/<rule>.md` | `_config/kb/<domain>/SKILL.md` + `reference/` + `examples/` + `anti-patterns.md` (blends both) |
| Agent file location | BMAD `agents/` in install root | N/A | N/A | `_config/agents/` in install root (v1.3 rename) |
| Story context file | Implicit in epic expansion | N/A | N/A | Explicit `{{story_key}}-context.md` via `gm-discuss-story` |

## Sources

**Authoritative (HIGH confidence):**
- Claude Code Plugin Marketplaces schema — https://code.claude.com/docs/en/plugin-marketplaces (read in full)
- GoMad `.claude/get-shit-done/workflows/discuss-phase.md` (read in full — foundational pattern for `gm-discuss-story`)
- GoMad `.claude/get-shit-done/references/questioning.md` (philosophy + AskUserQuestion patterns)
- GoMad `src/gomad-skills/4-implementation/gm-create-story/{SKILL.md,workflow.md,template.md,discover-inputs.md}` (read in full — current behavior for 4B modification)
- GoMad `.planning/PROJECT.md` (v1.3 milestone scope + constraints)
- GoMad `.claude-plugin/marketplace.json` (current BMAD-state file)

**Reference implementations (MEDIUM confidence — external web-fetched):**
- Claude-Cortex knowledge pack — https://github.com/NickCrew/Claude-Cortex (structure pattern, `skills/react-performance-optimization/SKILL.md`)
- vercel-labs/agent-skills — https://github.com/vercel-labs/agent-skills/tree/main/skills/react-best-practices (structure + frontmatter)
- Anthropic Agent Skills open format — https://agentskills.io/home
- BMAD Method docs site IA — https://docs.bmad-method.org/

**Industry conventions (MEDIUM confidence):**
- Node CLI config-directory conventions — https://docs.npmjs.com/cli/v11/configuring-npm/folders/ ; https://github.com/nodejs/tooling/issues/71
- XDG Base Directory Spec (referenced via Lobsters discussion) — https://lobste.rs/s/wac58n/use_config_store_your_project_configs

---
*Feature research for: GoMad v1.3 Marketplace, Docs & Story Context*
*Researched: 2026-04-24*
