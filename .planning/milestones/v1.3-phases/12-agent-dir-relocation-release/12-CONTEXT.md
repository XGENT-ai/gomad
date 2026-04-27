# Phase 12: Agent Dir Relocation + Release - Context

**Gathered:** 2026-04-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Move persona body files from `<installRoot>/_gomad/gomad/agents/<shortName>.md` to `<installRoot>/_gomad/_config/agents/<shortName>.md` on fresh v1.3 installs and v1.2→v1.3 upgrades, fix the `newInstallSet` latent bug, extend the test matrix, and publish `@xgent-ai/gomad@1.3.0` to npm with an explicit BREAKING callout. Scope is fixed by ROADMAP §"Phase 12" and the 16 requirements DOCS-07 + AGENT-01..11 + REL-01..04.

Out of bounds: marketplace work (dropped 2026-04-24), restructuring `gomad/workflows/` or `gomad/data/` (agents-only relocation), backup rotation/pruning (REL-F1 deferred), OIDC migration (deferred to v1.4+).

</domain>

<decisions>
## Implementation Decisions

### Cleanup Planner (AGENT-04)
- **D-01:** Use approach (b) — add `isV12LegacyAgentsDir` detector + new branch in `cleanup-planner.buildCleanupPlan` parallel to the existing `isV11Legacy` branch. Approach (a) is structurally impossible because `_prepareUpdateState` runs at `installer.js:51` before `extractPersonas` populates `installedFiles` at `installer.js:304` (RESEARCH §AGENT-04, §Decisions Locked).
- **D-02:** New branch handles ONLY the 8 known persona files. Other stale entries flow through the standard manifest-diff branch via a `Set<string>` of handled `resolved` paths to prevent double-processing (RESEARCH §Open Q1).

### Custom-File Detector (AGENT-05)
- **D-03:** Use Option 2 — extend the `detectCustomFiles()` whitelist at `installer.js:967-973` to recognize the 8 `AgentCommandGenerator.AGENT_SOURCES.shortName` `.md` files under `_config/agents/` as generated. ~8 LOC in 1 file. Options 1 (`_config/agents/personas/`) and 3 (`_config/agent-customizations/`) rejected because they mutate the literal target named in REQUIREMENTS.md AGENT-01/03/06 (RESEARCH §AGENT-05, §Decisions Locked).
- **D-04:** `.customize.yaml` user-override semantics preserved — files matching the persona shortname pattern remain custom-classified ONLY when no corresponding generated `.md` is in the manifest.

### Path Constant (AGENT-02)
- **D-05:** Add `AGENTS_PERSONA_SUBPATH` constant in `path-utils.js` as the sole source of truth. Pair with `LEGACY_AGENTS_PERSONA_SUBPATH` for cleanup-planner consumption. Sweep ONLY the 3 real touchpoints — `agent-command-generator.js:71` (writer), `agent-command-template.md:16` (runtime pointer), `installer.js:299` (comment). DO NOT touch `path-utils.js` JSDoc examples, `artifacts.js:55-56`, or `manifest-generator.js:351-352` — those reference orthogonal `<gomadDir>/agents/` standalone-agent discovery (RESEARCH §AGENT-02).

### Release Publishing (REL-03)
- **D-06:** Manual `npm publish` from local machine using a granular access token with "Bypass 2FA" enabled — same path used for v1.2.0 release. OIDC Trusted Publishing migration deferred to a standalone v1.4+ phase to keep Phase 12 diff focused on relocation + release content (not CI infra).
- **D-07:** Add `prepublishOnly: "npm run quality"` script to `package.json` as a pre-publish safety gate against publishing un-tested or un-built state (RESEARCH §Open Q4, §Pitfall 4).

### Quality Gate Composition (REL-02)
- **D-08:** Single `npm run quality` script wires the full release-gate matrix: `test:gm-surface` (extended Phase C body-regex), `test:tarball` (extended Phase 4 grep-clean), `test:legacy-v12-upgrade` (NEW), `test:v13-agent-relocation` (NEW), `test:domain-kb-install`, `test:integration` (prd-chain), `docs:build`, `validate-kb-licenses`, `validate:doc-paths` (NEW). One source of truth; no risk of skipping a check between local and release-gate runs.

### Upgrade CLI UX (AGENT-06)
- **D-09:** Verbose migration banner shown at start of v1.2→v1.3 upgrade cleanup. Banner content covers: (a) what's being relocated, (b) backup snapshot location, (c) `.customize.yaml` preservation reassurance, (d) cross-reference to `docs/upgrade-recovery.md` for rollback. Justification: v1.3 is BREAKING; users running `gomad install` deserve a loud signal that something non-trivial is happening to disk state.
- **D-10:** Banner is suppressed when `--dry-run` is passed (existing v1.2 flag) — dry-run already prints planned actions, banner would be duplicative.

### Test Seed Strategy (AGENT-08)
- **D-11:** `test/test-legacy-v12-upgrade.js` synthesizes the v1.2 install state manually in a tempdir — hand-crafted `_gomad/_config/files-manifest.csv` (v2 schema) + 8 persona `.md` files at `_gomad/gomad/agents/<shortName>.md` + minimal `.claude/commands/gm/agent-*.md` launcher stubs. Then runs v1.3 `gomad install` and asserts old path absent + new path present + backup populated + no orphans. Fast, deterministic, network-free.

### DOCS-07 Linter Scope
- **D-12:** `tools/validate-doc-paths.js` enforces NEGATIVE-only — fails if any docs file under `docs/` references the legacy `<installRoot>/gomad/agents/` runtime path. Allowlist exempts `docs/upgrade-recovery.md` line 19 (legitimate v1.2-era backup-tree example) via the existing `tools/fixtures/`-style allowlist pattern. Positive enforcement (require `_config/agents/` to APPEAR in expected docs) deferred — adds brittleness without proportional safety win (RESEARCH §Open Q2).

### Tarball Phase 4 Allowlist (AGENT-10)
- **D-13:** `verify-tarball.js` Phase 4 grep-clean uses an allowlist pattern (extending `tools/fixtures/tarball-grep-allowlist.json` if present, else creating it). Legitimate references inside `cleanup-planner.js` (the v12-legacy branch must reference the old path to know what to clean) and `CHANGELOG.md` (BREAKING entries describe the move) are exempted. Strict zero-occurrence in shipped tarball minus allowlist.

### Wave Coordination (Phase 11 dependency)
- **D-14:** Phase 11 docs branch (`gsd/phase-11-docs-site-content-authoring`) MUST be merged into main BEFORE the v1.3.0 release commit. First task in Wave 5 (DOCS-07 sweep) is "merge Phase 11 branch into Phase 12 working branch and run `validate:doc-paths` against the combined tree" (RESEARCH §Pitfall 8, §Open Q3).

### Claude's Discretion
- Exact wording and ANSI styling of the verbose migration banner — cli-utils chalk patterns established in v1.1 banner work
- Wave count + ordering within Phase 12 (RESEARCH suggests 6 waves; planner may collapse or split)
- Exact name of the new cleanup branch detector (`isV12LegacyAgentsDir` recommended, parallel to `isV11Legacy`)
- Exact CHANGELOG v1.3.0 BREAKING-section prose; pattern from v1.2.0 entry is the floor (Summary / Added / Changed / Removed / BREAKING CHANGES)
- Whether to add a `quality:fast` companion script for inner-loop dev (NOT a release gate — D-08 keeps single fat `quality` as the gate)
- Hand-crafted persona `.md` content for the AGENT-08 test seed (8 files; can be 1-line stubs or copies from current source)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 12 planning surface
- `.planning/ROADMAP.md` §"Phase 12: Agent Dir Relocation + Release" — Goal, Depends-on, Requirements, Success Criteria, Research flag rationale
- `.planning/REQUIREMENTS.md` §"Agent Dir Relocation + Test Coverage", §"Release", §DOCS-07 — 16-requirement scope
- `.planning/STATE.md` §Decisions, §Blockers/Concerns — Phase 12 exclusive lock, research-flag rationale, locked v1.3 decisions
- `.planning/PROJECT.md` §"Key Decisions" rows for v1.2 manifest-driven cleanup, BREAKING-callout pattern, dual-sided REL-03, zero-new-deps policy
- `.planning/phases/12-agent-dir-relocation-release/12-RESEARCH.md` §"Decisions Locked", §"Common Pitfalls", §"Code Examples", §"Open Questions" — full implementation guidance
- `.planning/phases/11-docs-site-content-authoring/PHASE-NOTE.md` (if present) — Phase 11 branch-coordination note (Pitfall 8)

### Installer mechanics (touchpoints)
- `tools/installer/core/cleanup-planner.js` (full file; especially `buildCleanupPlan`, `executeCleanupPlan`, `isV11Legacy` branch as the parallel pattern for the new v12 branch)
- `tools/installer/core/installer.js` — call ordering at lines 51 (`_prepareUpdateState`), 280-320 (extractPersonas), 480-590 (legacy-v11 branch + `newInstallSet` site), 850-1029 (`detectCustomFiles`)
- `tools/installer/core/install-paths.js` — `_config/agents/` already exists as `.customize.yaml` co-tenant
- `tools/installer/ide/shared/path-utils.js` — target file for `AGENTS_PERSONA_SUBPATH` + `LEGACY_AGENTS_PERSONA_SUBPATH` constants
- `tools/installer/ide/shared/agent-command-generator.js:71` — writer touchpoint (real)
- `tools/installer/ide/templates/agent-command-template.md:16` — runtime pointer touchpoint
- `tools/installer/ide/shared/artifacts.js:55-56` — orthogonal, DO NOT touch
- `tools/installer/ide/shared/manifest-generator.js:351-352` — orthogonal, DO NOT touch

### Test surface
- `test/test-gm-command-surface.js:217-241` — Phase C extension site for AGENT-07
- `test/test-legacy-v11-upgrade.js` — clone template for AGENT-08 (`test-legacy-v12-upgrade.js`)
- `test/test-domain-kb-install.js:1-60` — Phase 10 reference for new-test scaffolding pattern
- `tools/verify-tarball.js` — Phase 1/2/3 structure; AGENT-10 adds Phase 4
- `tools/validate-doc-links.js:1-80` — pattern reference for new `tools/validate-doc-paths.js`
- `tools/fixtures/tarball-grep-allowlist.json` (if present, else NEW) — allowlist file for AGENT-10

### Release surface
- `package.json` — `quality` script (extension target), `prepublishOnly` (NEW), `version` (1.2.0 → 1.3.0 bump)
- `CHANGELOG.md` v1.2.0 entry — BREAKING-section template (Summary / Added / Changed / Removed / BREAKING CHANGES)
- `docs/upgrade-recovery.md` — v1.2→v1.3 migration content target (AGENT-11)
- `docs/zh-cn/upgrade-recovery.md` — translation parity (AGENT-11)

### External standards (referenced by RESEARCH.md)
- npm Trusted Publishers documentation (https://docs.npmjs.com/trusted-publishers/) — context only; OIDC migration deferred per D-06
- npm scripts lifecycle (https://docs.npmjs.com/cli/v11/using-npm/scripts#prepublishonly) — for D-07

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`cleanup-planner.buildCleanupPlan` + `executeCleanupPlan`** — Manifest-driven cleanup machinery from v1.2 (Phase 7). The new v12-legacy branch plugs into this; backup snapshots under `_gomad/_backups/<ts>/` are auto-handled by `executeCleanupPlan` lines 432-458.
- **`AgentCommandGenerator.AGENT_SOURCES`** — 8-entry source-of-truth array for known persona shortnames (analyst, tech-writer, pm, ux-designer, architect, sm, dev, solo-dev). Use directly as the basis for the AGENT-05 detector whitelist.
- **`csv-parse/sync` + local `escapeCsv`** — Manifest v2 read/write symmetric pattern from v1.2. AGENT-08 test seed reuses this for synthesizing manifest.
- **`tools/validate-doc-links.js`** — Existing docs linter pattern (URL-scheme guard). DOCS-07 `validate-doc-paths.js` mirrors structure: glob `docs/**/*.md`, regex check, exit code.
- **CLI banner / chalk styling in `cli-utils.js`** — Established v1.1 pattern for verbose terminal output. Reuse for D-09 verbose migration banner.

### Established Patterns
- **Generate-don't-move** (PROJECT.md Key Decisions) — Source dirs canonical; installed surfaces emitted at install time. Phase 12 changes the EMIT TARGET, not the pattern.
- **Single-source path constants** — Existing `GOMAD_FOLDER_NAME` etc. in `path-utils.js`. AGENT-02 follows this convention.
- **Realpath containment** (v1.2 D-32/D-33) — All cleanup deletions guard against symlink-escape via realpath resolution + allowed-root prefix check. New v12 branch inherits this for free via `executeCleanupPlan`.
- **Dual-sided test gate** (v1.2 D-65) — `test:gm-surface` (installer output shape) + `test:tarball` (shipped tarball shape). v1.3 extends both: AGENT-07 extends gm-surface Phase C; AGENT-10 extends tarball Phase 4.
- **BREAKING callout in CHANGELOG** — v1.2.0 entry establishes the pattern. REL-01 mirrors it.

### Integration Points
- **Phase 11 docs branch must merge before Phase 12 release commit** — Pitfall 8. First Wave-5 task: merge Phase 11 → working branch, run `validate:doc-paths` against combined tree.
- **`<installRoot>` / `_gomad` semantics** — `<installRoot>` is user-chosen (default `_gomad`). Template substitution uses `{project-root}/_gomad/...`; `_gomad` literal in template is intentional (D-22 carry-forward).
- **`/gm:agent-*` runtime contract** — Claude Code reads launcher stub at `.claude/commands/gm/agent-*.md`; stub body contains literal path to persona body. AGENT-03 changes this literal; runtime resolution is unchanged.

</code_context>

<specifics>
## Specific Ideas

- "v1.3 is BREAKING — users deserve a loud signal" → motivation for D-09 verbose migration banner over silent cleanup
- "Same release path as v1.2 — no new infra in this phase" → motivation for D-06 granular token over OIDC; OIDC migration becomes a clean v1.4+ phase
- "Single source of truth for the release gate" → motivation for D-08 single fat `quality` script over tiered split
- "Network-free, deterministic test seeding" → motivation for D-11 manual synthesis over real-tarball download or checked-in fixture

</specifics>

<deferred>
## Deferred Ideas

- **OIDC Trusted Publishing migration** — Set up `.github/workflows/publish.yml` + npm Trusted Publisher config. Standalone v1.4+ phase; D-06 keeps Phase 12 focused on relocation + content.
- **Tiered quality gate** — `quality` (fast subset) + `quality:full` (release gate) split. Revisit if release-gate runtime becomes painful in practice; current single-script approach (D-08) is the simpler default.
- **`quality:fast` companion script for inner-loop dev** — Claude's discretion to add later if local-loop velocity matters; not a release-gate concern.
- **Backup rotation / pruning policy (REL-F1)** — Already deferred per PROJECT.md. `_gomad/_backups/<ts>/` keeps all snapshots through v1.3.
- **Positive enforcement in DOCS-07 linter** — Require `_config/agents/` to APPEAR in expected docs (not just absence of legacy paths). Adds brittleness; D-12 keeps it negative-only for now.
- **Splitting the AGENT-* relocation from REL-* release** — STATE.md couples them because REL-02 quality gate depends on every AGENT-* test; AGENT-10 extends `verify-tarball.js` which IS the release gate.

</deferred>

---

*Phase: 12-agent-dir-relocation-release*
*Context gathered: 2026-04-26*
