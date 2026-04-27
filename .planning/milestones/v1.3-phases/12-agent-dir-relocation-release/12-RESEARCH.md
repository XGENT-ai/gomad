# Phase 12: Agent Dir Relocation + Release — Research

**Researched:** 2026-04-26
**Domain:** Node CLI installer relocation + npm major-ish release with BREAKING callout
**Confidence:** HIGH

## Summary

Phase 12 is a coupled relocation + release. The relocation moves persona body files
from `<installRoot>/_gomad/gomad/agents/<shortName>.md` to
`<installRoot>/_gomad/_config/agents/<shortName>.md` while reusing every v1.2
mechanism (manifest-driven cleanup, backup snapshots under `_backups/<ts>/`,
`AgentCommandGenerator` extractor, launcher template substitution). The release
publishes `@xgent-ai/gomad@1.3.0` to npm as `latest`, retaining v1.1.0 + v1.2.0,
and is gated by an extended `npm run quality` matrix.

After reading the actual code at `cleanup-planner.js`, `installer.js:509-585`,
`installer.js:867-1029`, `install-paths.js`, and the existing v11 upgrade test,
**both open design questions have a clear winner backed by the existing code
shape**:

- **AGENT-04 (`newInstallSet` bug)**: Recommended approach is **(b) — add a
  relocation-specific branch to `buildCleanupPlan` analogous to `isV11Legacy`**.
  Approach (a) cannot work as currently structured because `_prepareUpdateState`
  runs at `installer.js:51` BEFORE persona extraction populates
  `this.installedFiles` at `installer.js:304`. There is no "current install's
  planned outputs" available at the moment `newInstallSet` is built. The cleanest
  fix is a `isV12LegacyAgentsDir` detector + a relocation branch that mirrors
  the v11 legacy branch's pattern.

- **AGENT-05 (`_config/agents/` collision)**: Recommended approach is
  **Option 2 — extend `detectCustomFiles()` to whitelist generated persona `.md`
  paths**. The fix is ~5 lines at `installer.js:967-973`. Options 1 and 3
  require renaming the install path (Option 1: `_config/agents/personas/`) or
  relocating customizations (Option 3: `_config/agent-customizations/`). Both
  enlarge the diff, both add a path drift between the requirement description
  and the implementation. Option 2 leaves `<installRoot>/_config/agents/` as
  the literal target named in REQUIREMENTS.md AGENT-01 / AGENT-03.

The release surface (REL-*) is mostly mechanical — the hard parts are: (a) the
quality gate matrix in `package.json` does NOT currently include
`test:gm-surface`, `test:tarball`, `test:domain-kb-install`, `test:integration`
(prd-chain), `validate:doc-paths` — REL-02 explicitly requires wiring all of
them, plus two NEW tests (`test:legacy-v12-upgrade`, `test:v13-agent-relocation`)
[VERIFIED: `package.json` line 57]; (b) `test:tarball` is `verify-tarball.js`
which has 3 phases today — AGENT-10 says "Phase 4 grep-clean extended" so a
NEW phase is added [VERIFIED: `tools/verify-tarball.js`]; (c)
`tools/validate-doc-paths.js` is NEW work — does not exist [VERIFIED:
filesystem check].

**Primary recommendation:** Sequence the phase as a 6-wave plan: (1) introduce
`AGENTS_PERSONA_SUBPATH` constant + a `LEGACY_AGENTS_PERSONA_SUBPATH` constant
in `path-utils.js`; (2) extend `cleanup-planner.js` with `isV12LegacyAgentsDir`
detector + new branch in `buildCleanupPlan`, switch the extractor's write path
in `agent-command-generator.js:71`, update `agent-command-template.md:16` in
the SAME commit; (3) extend `detectCustomFiles()` whitelist; (4) author both
new tests + extend Phase C body-regex + add `verify-tarball.js` Phase 4;
(5) author `tools/validate-doc-paths.js` + DOCS-07 sweep + update
`docs/upgrade-recovery.md`; (6) release commit (CHANGELOG + bump to 1.3.0 +
publish + tag + STATE/PROJECT/MILESTONES updates).

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Persona body file location (the move itself) | Installer / Filesystem | — | `agent-command-generator.extractPersonas()` writes to disk; runtime pointer in launcher template references the same path; no other tier touches it |
| Cleanup of legacy `_gomad/gomad/agents/` on upgrade | Installer / Filesystem | — | `cleanup-planner.buildCleanupPlan` decides; `executeCleanupPlan` snapshots + removes |
| Custom-file vs generated-file classification | Installer / Filesystem | — | `installer.detectCustomFiles()` is the sole authority; Plan 11 docs do not interact |
| Runtime persona load (`/gm:agent-pm` invocation) | IDE Runtime (Claude Code) | Installer (template author) | Claude reads launcher stub at `.claude/commands/gm/agent-pm.md`; that stub contains a literal path to the persona body — installer authors the literal, runtime resolves `{project-root}` |
| Docs path-example correctness | Docs Tooling | — | `tools/validate-doc-paths.js` (NEW) is the linter; `npm run quality` is the gate |
| Tarball cleanliness | Release Tooling | Installer source | `tools/verify-tarball.js` Phase 4 (NEW) greps shipped tarball; installer source files must not contain legacy literals |
| npm publish + dist-tag management | Release Operator | npm Registry | Manual `npm publish` per REL-03; OIDC trusted publishing is OPTIONAL future enhancement (granular token works today) |
| Git tagging | Release Operator | git | `v1.3.0` tag pushed to `origin/main` after publish per REL-04 |

## User Constraints

> Phase 12 has no `12-CONTEXT.md` yet (research runs BEFORE discuss-phase per
> ROADMAP.md "research flag: yes"). The constraints below are extracted from
> ROADMAP.md, REQUIREMENTS.md, and STATE.md `Decisions`.

### Locked Decisions (from ROADMAP/REQUIREMENTS/STATE)

- **Target path:** `<installRoot>/_config/agents/<shortName>.md` is the literal
  target named in AGENT-01, AGENT-03, AGENT-05, AGENT-06. Do NOT propose
  Option 1 (`_config/agents/personas/`) or Option 3
  (`_config/agent-customizations/`) — those alter the requirement.
- **Single-source path constant:** AGENT-02 requires
  `AGENTS_PERSONA_SUBPATH` constant in `path-utils.js` as the sole source of
  truth. (Pair with `LEGACY_AGENTS_PERSONA_SUBPATH` for cleanup planner.)
- **Backup snapshots required:** AGENT-06 mandates
  `<installRoot>/_backups/<timestamp>/` snapshot BEFORE removing legacy files.
  Reuse v1.2's `executeCleanupPlan` flow.
- **Fresh + upgrade test coverage:** AGENT-08 (clone of `test-legacy-v11-upgrade.js`
  pattern) + AGENT-09 (fresh-install assertion). Both wired into `npm run quality`.
- **Tarball grep extension:** AGENT-10 — `verify-tarball.js` Phase 4 NEW —
  asserts shipped tarball has zero `gomad/agents/` runtime-path strings.
- **CHANGELOG BREAKING required:** REL-01 — explicit `### BREAKING CHANGES`
  section, old-path → new-path migration instructions, cross-reference to
  `docs/upgrade-recovery.md`.
- **Manual npm publish to `latest`:** REL-03 — retains v1.1.0 + v1.2.0;
  v1.0.0 deprecation unchanged. OIDC NOT required (granular token acceptable).
- **`v1.3.0` git tag pushed to `origin/main`:** REL-04 + same release commit
  range updates `PROJECT.md`, `MILESTONES.md`, `STATE.md`.
- **Path-validator linter:** DOCS-07 — `tools/validate-doc-paths.js` NEW —
  enforces in `npm run quality` against real post-v1.3 layout.
- **Zero new runtime dependencies:** carried from v1.2 STATE.md
  `Decisions` — load-bearing across v1.3.
- **Phase 12 has exclusive lock:** STATE.md `Decisions` — no concurrent work;
  no parallel branches.

### Claude's Discretion (research recommends)

- AGENT-04 fix shape (a vs b) — RECOMMENDATION: (b), with rationale below.
- AGENT-05 fix shape (Option 1 / 2 / 3) — RECOMMENDATION: Option 2.
- Wave count + ordering — RECOMMENDATION: 6 waves (see Summary).
- Exact name of the new cleanup branch (`isV12LegacyAgentsDir` vs
  `isV12AgentsRelocation` etc.) — recommend `isV12LegacyAgentsDir` for parallel
  to `isV11Legacy`.
- Whether to keep an allowlist for `gomad/agents/` references in
  `verify-tarball.js` Phase 4 (e.g., legitimate references inside
  `cleanup-planner.js` that describe what to clean up). RECOMMEND extending
  the existing `tools/fixtures/tarball-grep-allowlist.json` pattern.

### Deferred Ideas (OUT OF SCOPE)

- **REL-F1 backup rotation/pruning policy** — `_backups/` cleanup is
  user-managed in v1.3 [VERIFIED: STATE.md].
- **Splitting the AGENT-* relocation from REL-* release** — STATE.md says
  these stay coupled because REL-02 quality gate depends on every AGENT-* test;
  AGENT-10 extends `verify-tarball.js` which IS the release gate; CHANGELOG
  BREAKING (REL-01) is specifically about the agent-dir.
- **OIDC trusted publishing migration** — REL-03 accepts manual publish with
  granular token. OIDC is a 2026 standard but adopting it is NEW work outside
  this phase.
- **Disabling docs auto-deploy on push to main** — STATE.md says auto-deploy
  stays as-is; "publish manually" applies to npm only.
- **Marketplace refresh (former Phase 10)** — dropped 2026-04-24, permanent.
- **Custom partition of `_config/agents/personas/` vs `_config/agents/<customize>`**
  — explicitly Out of Scope per REQUIREMENTS.md table line 97 ("Small detector
  tweak (AGENT-05) suffices.").
- **Restructuring AgentCommandGenerator into a multi-file module** — comment
  in `artifacts.js:9-34` says "remove AgentCommandGenerator" but that comment
  is STALE — the class is live and load-bearing for v1.2's `/gm:agent-*`
  contract. Do NOT act on that comment.

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DOCS-07 | Docs path examples use canonical post-v1.3 layout; `tools/validate-doc-paths.js` enforces in `npm run quality` | NEW linter — pattern from `tools/validate-doc-links.js` (`docs/explanation/architecture.md`, `docs/tutorials/install.md`, `docs/tutorials/quick-start.md`, and zh-cn mirrors already use canonical path; `docs/upgrade-recovery.md:19` legitimately references legacy path inside backup-tree example — linter MUST exempt that file or that section) |
| AGENT-01 | Fresh v1.3 installs land personas at `_config/agents/<shortName>.md` | Change literal at `agent-command-generator.js:71`; `install-paths.js:22` already creates `_config/agents/` for `.customize.yaml` — co-tenant with personas after AGENT-05 |
| AGENT-02 | `AGENTS_PERSONA_SUBPATH` constant in `path-utils.js`, sweep all `gomad/agents` literals | Actual literal touchpoints (verified by grep): `agent-command-generator.js:71` (writer); `agent-command-template.md:16` (template); `installer.js:299` (comment). `path-utils.js:27,57-62,81` use `gomad/agents/pm.md` as illustrative `<module>/<type>/<name>` examples — ORTHOGONAL, do not touch. `artifacts.js:55-56` and `manifest-generator.js:351-352` reference `<gomadDir>/agents/` (NOT `<gomadDir>/gomad/agents/`) — ORTHOGONAL standalone-agent discovery, do not touch. **Real touchpoint count: 3 (writer + template + 1 comment), not 11.** Add the constant, then surgically swap. |
| AGENT-03 | Launcher stub body path matches new location; `<installRoot>` resolves at install time | Change `agent-command-template.md:16` to `{project-root}/_gomad/_config/agents/{{shortName}}.md`. `{project-root}` is a Claude-Code-resolved variable; `_gomad` is the GOMAD_FOLDER_NAME constant (literal in template — current template hardcodes `_gomad`, which is fine because the install dir IS `_gomad`; "<installRoot>" in the requirement language refers to the user-chosen project root parent, not a template substitution). |
| AGENT-04 | `newInstallSet` derivation bug fixed; cleanup permits old-path deletion during v1.2→v1.3 relocation | RECOMMEND option (b): new `isV12LegacyAgentsDir` branch in `buildCleanupPlan` parallel to `isV11Legacy`. Detailed below. |
| AGENT-05 | Custom-file detector treats matching `.md` under `_config/agents/` as generated | RECOMMEND Option 2: extend whitelist at `installer.js:967-973`. Diff is ~5 LOC. Detailed below. |
| AGENT-06 | Upgrade flow: snapshot → remove old → install new → no orphans | New cleanup branch (AGENT-04 fix) reuses existing `executeCleanupPlan` machinery — backup at `_gomad/_backups/<ts>/`, metadata.json + README.md auto-generated [VERIFIED: `cleanup-planner.js:432-458`]. |
| AGENT-07 | `test-gm-command-surface.js` Phase C extended with launcher-body regex assertion | Extend Phase C at `test-gm-command-surface.js:217-241` — for each of 8 launchers, parse body, regex-match `_config/agents/<shortName>.md` (positive); ensure no match for `gomad/agents/` (negative). |
| AGENT-08 | `test-legacy-v12-upgrade.js` simulates v1.2→v1.3 upgrade | NEW test, clone of `test-legacy-v11-upgrade.js`. Differences: seed v1.2 layout (run `gomad install` from a v1.2 tarball if reachable, else manually seed `_gomad/_config/files-manifest.csv` v2 + `_gomad/gomad/agents/<shortName>.md` files) before running v1.3 install; assert old path gone + new path present + backup contains old persona files + `metadata.reason = 'manifest_cleanup'` (NOT `legacy_v1_cleanup` — that's reserved for v1.1 path). |
| AGENT-09 | `test-v13-agent-relocation.js` asserts fresh v1.3 install lands personas only at `_config/agents/` | NEW test, simpler than AGENT-08 — fresh tempdir, run `gomad install`, assert `_gomad/_config/agents/pm.md` exists, assert `_gomad/gomad/agents/` does NOT exist. |
| AGENT-10 | `verify-tarball.js` Phase 4 extension — zero `gomad/agents/` in shipped tarball | Add `checkLegacyAgentPathClean()` after Phase 3. Allowlist legitimate references in `cleanup-planner.js` (the v12-legacy branch must reference the old path to know what to clean) + CHANGELOG.md entries describing the move. |
| AGENT-11 | `docs/upgrade-recovery.md` updated with v1.2→v1.3 migration instructions | Update `docs/upgrade-recovery.md` (current example backup tree at line 19 already uses `gomad/agents/pm.md` — keep that as a v1.2-era reference; add new v1.3 section explaining the relocation rollback recipe). Also translate to `docs/zh-cn/upgrade-recovery.md`. |
| REL-01 | CHANGELOG v1.3.0 entry with explicit `### BREAKING CHANGES` section | Pattern from CHANGELOG.md v1.2.0 entry — use the same structure (`Summary`, `Added`, `Changed`, `Removed`, `BREAKING CHANGES`). |
| REL-02 | `npm run quality` exits 0 on release commit, includes the full new test matrix | EXTEND package.json `quality` script. Current `quality` does NOT include `test:gm-surface`, `test:tarball`, `test:domain-kb-install`, `test:integration` (prd-chain test), `validate:doc-paths` — REL-02 wires all of them PLUS new `test:legacy-v12-upgrade` + `test:v13-agent-relocation`. |
| REL-03 | `@xgent-ai/gomad@1.3.0` published to npm with `latest` dist-tag; v1.1.0 + v1.2.0 retained; v1.0.0 deprecation unchanged | Manual `npm publish` (granular token OR OIDC). 2FA required. `prepublishOnly` script recommended (NEW work — currently absent from package.json scripts) to gate accidental publish on un-built/un-tested state. Bump version 1.2.0 → 1.3.0 BEFORE publish. |
| REL-04 | Git tag `v1.3.0` pushed to `origin/main` after publish | `git tag -a v1.3.0 -m "..."` + `git push origin v1.3.0`. Same release commit range updates `PROJECT.md`, `MILESTONES.md`, `STATE.md`. |

## Project Constraints (from CLAUDE.md)

> No project-level `./CLAUDE.md` was found at repo root. Per the v1.2 baseline:

- CommonJS-only for installer code [VERIFIED: STATE.md `Decisions`]
- Node.js ≥20.0.0 [VERIFIED: package.json `engines`]
- Zero new runtime dependencies [VERIFIED: STATE.md, REQUIREMENTS.md Out of Scope]
- All v1.3 files MUST use `require()`, not ESM `import` [VERIFIED: existing
  installer source uses CJS exclusively]
- Manifest-driven cleanup with realpath containment is the upgrade-safety
  pattern; do NOT introduce ad-hoc `fs.remove` outside the cleanup-planner
  contract [VERIFIED: `cleanup-planner.js` design comments D-32, D-33, D-34]

## Standard Stack

### Core (already installed; reuse)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `fs-extra` | `^11.3.0` | Filesystem ops, copy, ensureDir, realpath, pathExists | v1.2 standard; every installer module imports from here [VERIFIED: package.json] |
| `csv-parse` | `^6.1.0` | Read v2 `files-manifest.csv` | v1.2 manifest-v2 schema; cleanup planner consumes [VERIFIED: package.json + `cleanup-planner.js`] |
| `yaml` | `^2.7.0` | Parse `manifest.yaml`, `skill-manifest.yaml`, `agentCustomizations` map | v1.2 standard [VERIFIED: package.json + `installer.js:944`] |
| `js-yaml` | `^4.1.0` | Parse YAML in test files (legacy choice) | Existing tests use it; new tests should match surrounding file [VERIFIED: `test-gm-command-surface.js:28`] |
| `glob` | `^11.0.3` | Directory scanning | Used in `test-gm-command-surface.js`; available for new tests [VERIFIED: package.json] |
| Node `node:path`, `node:fs`, `node:crypto`, `node:os`, `node:child_process` | built-in | Path manipulation, hashing, exec, tempdir | All Node ≥20 built-ins [VERIFIED: across installer files] |

### NO new dependencies

`prepublishOnly` is a built-in npm lifecycle script — no package required.
Path validator uses Node built-ins + existing `glob`. New tests use existing
`fs-extra` + `node:child_process`.

### Versions verified

```bash
# Verified 2026-04-26 against npm registry:
npm view @xgent-ai/gomad version           # 1.2.0 (current latest)
npm view @xgent-ai/gomad dist-tags         # { latest: '1.2.0' }
```

[VERIFIED: npm registry — confirms package.json local version 1.2.0 matches
published latest; safe to bump to 1.3.0]

## Architecture Patterns

### System Architecture Diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│ User runs: gomad install (in workspace with v1.2 install OR fresh)    │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│ installer.js:install()                                                │
│   ┌─────────────────────────────────────────────────────────────────┐ │
│   │ if (existingInstall.installed):                                 │ │
│   │   _prepareUpdateState()  ← runs FIRST                          │ │
│   │     ├─ readFilesManifest                                        │ │
│   │     ├─ build newInstallSet from PRIOR manifest's still-existing│ │
│   │     │  files (← LATENT BUG SITE for relocation)                │ │
│   │     ├─ isV11Legacy detector                                    │ │
│   │     ├─ ★ NEW: isV12LegacyAgentsDir detector (AGENT-04 FIX)    │ │
│   │     ├─ buildCleanupPlan ─→ ★ NEW v12 branch (AGENT-04 FIX)    │ │
│   │     │     ├─ existing v11 branch (legacy_v1_cleanup)           │ │
│   │     │     ├─ ★ new v12 branch (manifest_cleanup, force-remove │ │
│   │     │     │  old persona paths even if newInstallSet has them)│ │
│   │     │     └─ standard manifest-diff branch                     │ │
│   │     ├─ executeCleanupPlan: snapshot → metadata → README →      │ │
│   │     │   remove (REUSED — no change)                            │ │
│   │     ├─ detectCustomFiles ★ AGENT-05 EXTENSION                 │ │
│   │     │   (whitelist .md persona names under _config/agents/)   │ │
│   │     └─ _backupUserFiles                                        │ │
│   └─────────────────────────────────────────────────────────────────┘ │
│   _installAndConfigure (configTask runs here)                         │
│     └─ AgentCommandGenerator.extractPersonas()                        │
│         ★ NEW write target: _config/agents/<shortName>.md             │
│           (literal change at agent-command-generator.js:71)            │
│     └─ generateManifests → files-manifest.csv with NEW path entries  │
│   _setupIdes                                                          │
│     └─ AgentCommandGenerator.writeAgentLaunchers()                   │
│         (uses agent-command-template.md ★ NEW path — AGENT-03)       │
│         → .claude/commands/gm/agent-<shortName>.md                    │
│   _restoreUserFiles                                                   │
└────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│ User runs: /gm:agent-pm in Claude Code                                │
│   Claude reads .claude/commands/gm/agent-pm.md                        │
│   → "LOAD the FULL agent file from                                    │
│      {project-root}/_gomad/_config/agents/pm.md"  ← ★ NEW LOCATION   │
│   → reads persona body, embodies persona                              │
└────────────────────────────────────────────────────────────────────────┘

★ = new in Phase 12. Everything else is reused v1.2 machinery.
```

### Recommended Project Structure (changes only)

```
src/                                    # unchanged
tools/
├── installer/
│   ├── core/
│   │   ├── cleanup-planner.js         # ADD isV12LegacyAgentsDir + v12 branch in buildCleanupPlan
│   │   ├── installer.js               # MODIFY detectCustomFiles whitelist (~5 LOC); update comment at :299
│   │   └── install-paths.js           # unchanged (already creates _config/agents/)
│   └── ide/
│       ├── shared/
│       │   ├── path-utils.js          # ADD AGENTS_PERSONA_SUBPATH + LEGACY_AGENTS_PERSONA_SUBPATH
│       │   └── agent-command-generator.js  # CHANGE :71 outputDir to use AGENTS_PERSONA_SUBPATH
│       └── templates/
│           └── agent-command-template.md   # CHANGE :16 path literal
├── verify-tarball.js                   # ADD Phase 4: legacy-path grep-clean
└── validate-doc-paths.js               # NEW — DOCS-07 linter

test/
├── test-gm-command-surface.js          # EXTEND Phase C with launcher-body regex
├── test-legacy-v12-upgrade.js          # NEW — clone of test-legacy-v11-upgrade.js
└── test-v13-agent-relocation.js        # NEW — fresh-install assertion

docs/
├── upgrade-recovery.md                 # ADD v1.2→v1.3 section
└── zh-cn/upgrade-recovery.md           # MIRROR translation

CHANGELOG.md                            # ADD v1.3.0 entry with BREAKING CHANGES section
package.json                            # BUMP version 1.2.0 → 1.3.0; EXTEND quality script; ADD prepublishOnly (recommended)
.planning/{PROJECT,MILESTONES,STATE}.md # UPDATE in same release commit per REL-04
```

### Pattern 1: Add legacy-relocation branch to `buildCleanupPlan` (AGENT-04 fix)

**What:** Add `isV12LegacyAgentsDir` detector in `cleanup-planner.js`. When TRUE,
populate plan via a v12-specific branch that snapshots + removes the old
`_gomad/gomad/agents/<shortName>.md` paths regardless of whether they're in
`newInstallSet`.

**When to use:** Only when (a) prior manifest exists AND (b) at least one
`_gomad/gomad/agents/<shortName>.md` file exists on disk. This is the unambiguous
v1.2 → v1.3 upgrade signal — fresh installs and v1.1 installs both fail this
detector and follow their existing branches.

**Example shape (sketched diff):**

```javascript
// Source: tools/installer/core/cleanup-planner.js — pattern parallel to isV11Legacy
async function isV12LegacyAgentsDir(workspaceRoot, gomadDir) {
  // Manifest must exist (distinguishes from v1.1 legacy path)
  const manifestPath = path.join(gomadDir, '_config', 'files-manifest.csv');
  if (!(await fs.pathExists(manifestPath))) return false;
  // Old persona dir must contain at least one of the 8 known persona files
  const legacyAgentsDir = path.join(gomadDir, 'gomad', 'agents');
  if (!(await fs.pathExists(legacyAgentsDir))) return false;
  for (const shortName of LEGACY_AGENT_SHORT_NAMES) {
    if (await fs.pathExists(path.join(legacyAgentsDir, `${shortName}.md`))) return true;
  }
  return false;
}

// In buildCleanupPlan — NEW branch BEFORE the standard manifest-diff branch:
async function buildCleanupPlan(input) {
  const { ..., isV12LegacyAgentsDir: v12Reloc } = input;
  // ... existing v11 branch ...

  if (v12Reloc) {
    // For each legacy persona file: realpath + containment check + snapshot + remove.
    // Distinct reason 'manifest_cleanup' (NOT 'legacy_v1_cleanup') — manifest IS present.
    // After this branch, fall THROUGH to the standard manifest-diff branch so any
    // OTHER stale entries (non-persona) still get processed normally.
    const legacyAgentsDir = path.join(workspaceRoot, '_gomad', 'gomad', 'agents');
    for (const shortName of LEGACY_AGENT_SHORT_NAMES) {
      const legacyPath = path.join(legacyAgentsDir, `${shortName}.md`);
      if (!(await fs.pathExists(legacyPath))) continue;
      let resolved;
      try { resolved = await fs.realpath(legacyPath); }
      catch (error) { if (error.code === 'ENOENT') continue; throw error; }
      if (!isContained(resolved, workspaceRoot)) {
        plan.refused.push({ idx: null, entry: { path: legacyPath }, reason: 'SYMLINK_ESCAPE' });
        continue;
      }
      // Hash for was_modified — manifest IS present, so we can compute it.
      const orig_hash = priorManifest.find(e => e.absolutePath === resolved)?.hash || null;
      let was_modified = null;
      if (orig_hash) {
        const currentHash = await hashGen.calculateFileHash(resolved);
        was_modified = currentHash !== orig_hash;
      }
      plan.to_snapshot.push({
        src: resolved,
        install_root: '_gomad',
        relative_path: path.posix.join('gomad', 'agents', `${shortName}.md`),
        orig_hash,
        was_modified,
      });
      plan.to_remove.push(resolved);
      // Mark as handled so the standard branch below doesn't double-process.
    }
    // Continue to standard manifest-diff branch (DON'T return) — but skip
    // entries we just queued. The standard branch's `newInstallSet.has(resolved)`
    // guard will naturally skip these because they're now in plan.to_remove,
    // not in newInstallSet. (Verify in implementation: filter priorManifest by
    // a "handled" set if needed.)
  }

  // ... existing standard manifest-diff branch ...
}
```

**Why approach (b) over approach (a):** Approach (a) — "derive `newInstallSet`
from current install's planned outputs" — sounds clean but is impossible at
the call site. `_prepareUpdateState` runs at `installer.js:51`, BEFORE
`extractPersonas` populates `this.installedFiles` at `installer.js:304`. The
"current install's planned outputs" simply doesn't exist yet. Workarounds
(eagerly compute outputs, refactor extractor to be pure, etc.) are large
diffs that touch the install pipeline ordering — much higher blast radius
than a localized branch in cleanup-planner.

Approach (b)'s blast radius: 1 new function (`isV12LegacyAgentsDir`) + 1 new
input field on `buildCleanupPlan` + 1 conditional branch + 1 call-site update
in `installer.js:_prepareUpdateState` to compute and pass the new boolean.
Roughly 60 lines added across 2 files. The existing `isV11Legacy` branch is
the proven precedent.

### Pattern 2: Custom-file detector whitelist extension (AGENT-05 fix)

**What:** At `installer.js:967-973` the file-not-in-manifest classification
treats any `.md` file as a custom user file UNLESS it matches an existing
exclusion (currently: agent .md files in module folders, but NOT under
`_config/agents/`). Extend the exclusion to whitelist persona `.md` files
matching one of the 8 known shortNames under `_config/agents/`.

**Current code:**

```javascript
// installer.js:967-973
if (!fileInfo) {
  // File not in manifest = custom file
  // EXCEPT: Agent .md files in module folders are generated files, not custom
  // Only treat .md files under _config/agents/ as custom
  if (!(fileName.endsWith('.md') && relativePath.includes('/agents/') && !relativePath.startsWith('_config/'))) {
    customFiles.push(fullPath);
  }
}
```

**Sketched fix (recommended ~5 LOC):**

```javascript
// Source: extend installer.js:967-973
const PERSONA_SHORTNAMES = AgentCommandGenerator.AGENT_SOURCES.map(a => a.shortName);
// ...
if (!fileInfo) {
  // File not in manifest = custom file
  // EXCEPT: (a) Agent .md files in module folders are generated, (b) v1.3+ persona
  // .md bodies under _config/agents/<shortName>.md are generated by extractPersonas
  // and managed by the manifest pipeline; only .customize.yaml is a custom user override.
  const isModuleAgentMd = fileName.endsWith('.md') && relativePath.includes('/agents/') && !relativePath.startsWith('_config/');
  const isV13PersonaMd = (
    fileName.endsWith('.md')
    && (relativePath.startsWith('_config/agents/') || relativePath.startsWith('_config\\agents\\'))
    && PERSONA_SHORTNAMES.includes(fileName.replace(/\.md$/, ''))
  );
  if (!isModuleAgentMd && !isV13PersonaMd) {
    customFiles.push(fullPath);
  }
}
```

**Note:** The current `if (relativePath.startsWith('_config/'))` early-`continue`
at `installer.js:934-956` already SKIPS `_config/` files entirely (with
.customize.yaml special-cased), but only when fileInfo is nil from
installedFilesMap. After AGENT-01 lands, persona `.md` files WILL be in
`files-manifest.csv` (and thus in `installedFilesMap`), so the
`continue` at line 955 is hit and they don't reach line 967. So
**Option 2's actual diff may be even smaller** — possibly nothing if
manifest registration is correct. The whitelist above is defensive belt-and-
braces against a manifest-missing edge case (e.g., manifest corruption that
falls back to v1.1-style detection). Plan should verify both paths via test.

**Why Option 2 over 1 or 3:** Option 1 (`_config/agents/personas/<shortName>.md`)
breaks AGENT-01's literal `<installRoot>/_config/agents/<shortName>.md`
requirement. Option 3 (relocate `.customize.yaml`) is much larger — needs
its own v1.2→v1.3 migration. Option 2's diff is local, surgical, and reuses
the existing `AgentCommandGenerator.AGENT_SOURCES` source-of-truth for the
8-name allowlist [VERIFIED: `agent-command-generator.js:14-51`].

### Pattern 3: Single-source path constant (AGENT-02)

**What:** Add to `path-utils.js` exports — pair (current + legacy) so cleanup
planner has a name for the old path:

```javascript
// path-utils.js — add near GOMAD_FOLDER_NAME
const AGENTS_PERSONA_SUBPATH = path.posix.join('_config', 'agents');         // v1.3+
const LEGACY_AGENTS_PERSONA_SUBPATH = path.posix.join('gomad', 'agents');    // v1.2 (kept for cleanup detection only)

module.exports = {
  // ... existing exports ...
  AGENTS_PERSONA_SUBPATH,
  LEGACY_AGENTS_PERSONA_SUBPATH,
};
```

**Why posix-join:** Used as a forward-slash subpath that gets re-joined with
`path.join` (which normalizes per platform) at call sites, AND used as a
substring match in detectors. Forward-slash matches the manifest CSV
serialization convention [VERIFIED: `cleanup-planner.js:301` —
`relNative.split(path.sep).join('/')`]. Then in agent-command-generator.js:71:

```javascript
// Before:
const outputDir = path.join(workspaceRoot, this.gomadFolderName, 'gomad', 'agents');
// After:
const outputDir = path.join(workspaceRoot, this.gomadFolderName, ...AGENTS_PERSONA_SUBPATH.split('/'));
```

### Pattern 4: Launcher template path update (AGENT-03)

```diff
# tools/installer/ide/templates/agent-command-template.md
- 1. LOAD the FULL agent file from {project-root}/_gomad/gomad/agents/{{shortName}}.md
+ 1. LOAD the FULL agent file from {project-root}/_gomad/_config/agents/{{shortName}}.md
```

`{project-root}` is a Claude-Code runtime variable — DO NOT touch. `_gomad`
is the literal `GOMAD_FOLDER_NAME` value [VERIFIED: `path-utils.js:23`] and
matches the directory the installer creates. Template-string substitution is
performed in `generateLauncherContent` at `agent-command-generator.js:128-134`
[VERIFIED] — only `{{shortName}}` and the other `{{...}}` placeholders are
replaced.

**Critical:** This change MUST land in the SAME commit as the
agent-command-generator.js:71 change. A drift between writer and template =
silent runtime failure (`/gm:agent-pm` invocation can't find persona body).
Phase C body-regex assertion (AGENT-07) is the safety net.

### Pattern 5: Test extension — Phase C body-regex (AGENT-07)

```javascript
// Source: extend test/test-gm-command-surface.js inside the for-EXPECTED_AGENTS loop ~line 217
const stubPath = path.join(installedGmDir, `agent-${shortName}.md`);
const raw = fs.readFileSync(stubPath, 'utf8');
// ... existing frontmatter parse ...

// AGENT-07: launcher body MUST reference the v1.3 path, NOT the v1.2 legacy path.
const positiveRegex = new RegExp(`/_gomad/_config/agents/${shortName}\\.md`);
const negativeRegex = new RegExp(`/_gomad/gomad/agents/${shortName}\\.md`);
assert(positiveRegex.test(raw), `(C) agent-${shortName}.md body references v1.3 _config/agents/ path`);
assert(!negativeRegex.test(raw), `(C) agent-${shortName}.md body has NO legacy gomad/agents/ reference`);
```

### Anti-Patterns to Avoid

- **Don't change template before write path** — silent runtime failure
  (launcher points to file the writer hasn't created).
- **Don't change write path before cleanup-planner v12 branch** — orphaned
  files survive upgrade.
- **Don't sweep `path-utils.js` doc-comment examples** — those use
  `gomad/agents/pm.md` to illustrate the `<module>/<type>/<name>` SOURCE-PATH
  format consumed by `toDashPath()`. They are NOT runtime path literals. The
  `gomad-agents` example survives the rename and remains correct as input
  notation.
- **Don't sweep `artifacts.js:55-56` or `manifest-generator.js:351-352`** —
  those reference `<gomadDir>/agents/` (NOT `<gomadDir>/gomad/agents/`) for
  STANDALONE agent discovery, completely orthogonal to persona body location.
- **Don't trust `artifacts.js:9-34` "TODO: dead code" comment** —
  `AgentCommandGenerator` is live; the comment is stale advice from before
  v1.2's `/gm:agent-*` contract was finalized.
- **Don't ship CHANGELOG without `### BREAKING CHANGES`** — REL-01 explicit;
  CHANGELOG is part of the file-manifest tarball check.
- **Don't bump version BEFORE quality green** — REL-02 must exit 0 on the
  release commit. If quality fails post-bump, the commit is poisoned and
  must be rolled back before publish.
- **Don't `npm publish` without `prepublishOnly` gate** — recommend adding
  `"prepublishOnly": "npm run quality && npm run test:tarball"` to scripts
  to prevent accidental publish on un-built/un-tested state.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Backup snapshot directory creation | Custom `cp -r` loop | `executeCleanupPlan` from cleanup-planner.js | v1.2 already handles realpath containment, metadata.json, README.md, rollback-on-failure, unique-suffix collision |
| Legacy persona file detection | Manual `fs.readdir` walk | `LEGACY_AGENT_SHORT_NAMES` from cleanup-planner.js | Source of truth derives from `AgentCommandGenerator.AGENT_SOURCES` — adding/removing an agent flows automatically |
| File hash for was_modified detection | Manual `crypto.createHash` | `manifestGen.calculateFileHash` from `cleanup-planner.js` | Reused across snapshot pipeline; consistent with manifest-csv hash format |
| Realpath + containment check | Custom `path.startsWith` | `isContained(resolved, wsRoot)` from cleanup-planner.js | `path.relative` semantics, parent-traversal detection, cross-platform |
| Tarball file enumeration | Custom tar reader | `npm pack --dry-run` parsing pattern from `verify-tarball.js:30-41` | Already proven; allowlist mechanism in place |
| Test scaffold (npm pack + tempdir + install) | Custom harness | `packAndInstall()` pattern from `test-legacy-v11-upgrade.js:60-71` | 90% of the v12-upgrade test is a textual edit of v11-upgrade test |
| Doc path validation | Hand-grep over docs/ | NEW `validate-doc-paths.js` (only `gomad/agents/` is the lint target) | But model on `validate-doc-links.js` walking pattern (`getMarkdownFiles` recursive walker) |
| YAML frontmatter parsing in tests | `yaml.parse` raw | `js-yaml.load` matching surrounding test files | Existing tests use `js-yaml`; new tests should match (DON'T introduce `yaml@^2.7.0` to test dir to avoid drift) |
| Version comparison | Hand-rolled regex | `semver` (already a dep) | Available; v1.2 already imports |

**Key insight:** Phase 12 is 90% reuse + 10% new code. The extractor relocation is
3 literal swaps; the cleanup branch is a clone of `isV11Legacy`. The release
ops are pure mechanical (npm publish + git tag). The genuinely novel work is
narrow: `tools/validate-doc-paths.js` (NEW), `verify-tarball.js` Phase 4
extension, and the v1.2→v1.3 upgrade test.

## Runtime State Inventory

> Phase 12 IS a relocation phase — this section is mandatory.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | `_gomad/_config/files-manifest.csv` v2 rows for 8 personas — paths recorded as `gomad/agents/<shortName>.md` with `install_root='_gomad'` and SHA-256 hashes [VERIFIED: `cleanup-planner.js` schema docs + `manifest-generator.js`]. Also: `manifest.yaml > agentCustomizations` map keyed by relative path (only relevant if a user has hand-edited `_config/agents/<shortName>.customize.yaml` — orthogonal to persona body relocation but co-tenant of `_config/agents/`) | Cleanup planner v12 branch removes old manifest rows (executeCleanupPlan → fs.remove). Generate manifests pass-2 records new rows automatically via `extractPersonas` populating `this.installedFiles`. **DATA migration:** automatic via the existing manifest pipeline — no manual step needed. **CODE edit:** `cleanup-planner.js` v12 branch (per AGENT-04 fix). |
| Live service config | None — gomad has no live external services that store the persona path. Claude Code reads the launcher stub which contains the literal path; the stub is regenerated on every install. No hosted database, no remote config | Nothing to migrate. Runtime updates next time `/gm:agent-*` is invoked AFTER `gomad install`. |
| OS-registered state | None — gomad does not register OS-level tasks, services, or daemons. CLI invocation is `npx gomad install`. | Nothing to migrate. |
| Secrets/env vars | None — gomad has no env-var dependencies for the agent path. The path is fully hardcoded in `_gomad/` relative to the workspace root. | None — verified by grep across `tools/installer/` and `src/` for `process.env` references. |
| Build artifacts / installed packages | (1) Old launcher stubs at `.claude/commands/gm/agent-<shortName>.md` will be regenerated automatically on next install (`writeAgentLaunchers` always overwrites, no version compat check needed). (2) Old persona body files at `_gomad/gomad/agents/<shortName>.md` — these IS the relocation target. (3) Tarball cache: if a user has `npm cache` of `@xgent-ai/gomad@1.2.0`, that's not affected — install always re-renders from source. (4) Possible: previous `_gomad/_backups/<ts>/` directories from earlier v1.2 cleanups — these are USER-MANAGED per REL-F1 deferral; do not touch. | (a) Launcher stubs: auto-handled by writeAgentLaunchers. (b) Old persona body files: AGENT-04 fix removes them via cleanup planner with snapshot. (c) npm cache: nothing. (d) `_backups/`: leave alone. |

**Nothing found in OS-registered state, secrets/env vars** — verified by
grep. **Stored data and build artifacts** are handled by the existing
manifest-driven cleanup machinery once AGENT-04's branch is added.

**Critical canonical question:** *"After every file in the repo is updated,
what runtime systems still have the old string cached, stored, or
registered?"* → ANSWER: only the user's own workspace `_gomad/gomad/agents/`
files, which the AGENT-04 cleanup branch removes. No external state.

## Common Pitfalls

### Pitfall 1: `newInstallSet` skip-guard hides orphans (the AGENT-04 latent bug)

**What goes wrong:** v1.2 → v1.3 upgrade leaves `_gomad/gomad/agents/*.md`
files on disk with no manifest record (since v1.3 manifest doesn't reference
them). They're orphaned forever — the next install can't see them in the
manifest, can't trigger cleanup.

**Why it happens:** `newInstallSet` is built from the prior manifest's
still-existing files (`installer.js:535-547`). For a v1.2 install, that
includes `_gomad/gomad/agents/<shortName>.md`. The cleanup planner's guard
at `cleanup-planner.js:282` says "if the resolved path is in `newInstallSet`,
skip removal" — meaning the old persona files are PRESERVED.

**How to avoid:** AGENT-04 fix — add `isV12LegacyAgentsDir` branch in
`buildCleanupPlan` that explicitly enumerates the 8 known persona files at
the legacy path and queues them for removal regardless of `newInstallSet`
membership.

**Warning signs:** `test-legacy-v12-upgrade.js` (AGENT-08, NEW) asserts old
path is gone post-install. If that assertion fails, the v12 branch isn't
firing.

### Pitfall 2: `_config/agents/` semantic collision misclassifies personas as custom

**What goes wrong:** Without AGENT-05 fix, the first install that lands a
persona at `_gomad/_config/agents/pm.md` sees the file at
`detectCustomFiles` time as "not in manifest" (because manifest hasn't been
written yet for THIS install) — and the existing rule at `installer.js:971`
classifies any `_config/agents/`-prefixed `.md` as custom. Result: persona
file is backed up as a "custom user file" and the install pipeline fights
itself.

**Why it happens:** `detectCustomFiles` runs INSIDE `_prepareUpdateState`
BEFORE the new install's manifest is written. The check at
`installer.js:967-973` is conservative — it assumes anything not in the
PRIOR manifest under `_config/agents/` is user-authored.

**How to avoid:** AGENT-05 fix — extend whitelist to recognize the 8 known
persona shortNames as generated (regardless of manifest presence). Use
`AgentCommandGenerator.AGENT_SOURCES` as the source of truth.

**Warning signs:** Re-install of v1.3 produces a `_gomad/_backups/<ts>/`
directory containing personas. (Should produce no backup if idempotent.)
`AGENT-09` test (fresh install + immediate re-install + assert no
backup-dir for personas) catches this.

### Pitfall 3: Template-writer drift causes silent `/gm:agent-*` failure

**What goes wrong:** If `agent-command-template.md:16` references
`_config/agents/` but `agent-command-generator.js:71` still writes to
`gomad/agents/` (or vice versa), `/gm:agent-pm` invocation in Claude Code
fails to load the persona body — Claude reports "file not found" or
silently embodies a partial persona.

**Why it happens:** The two literals must be co-equal. Refactoring one
without the other is easy to miss.

**How to avoid:** Land both changes in the SAME commit. Phase C launcher-body
regex (AGENT-07) catches drift in CI.

**Warning signs:** Phase C assertion failure on either positive
(`/_config/agents/`) OR negative (`/gomad/agents/`) regex.

### Pitfall 4: npm publish accidents — wrong version, wrong dist-tag, stale build

**What goes wrong:**
- Publish without bumping version → 403 (already published) or worse, force-push anti-pattern.
- Publish with `--tag next` instead of `latest` → users on `latest` don't get v1.3.
- Publish a tarball that includes `.planning/` or `test/` because `verify-tarball.js` wasn't run.
- Publish from a dirty working tree (uncommitted changes baked into tarball).

**Why it happens:** Manual `npm publish` has no automatic gate. Forgetting
the `version` bump in `package.json` is the #1 npm publishing mistake.

**How to avoid:**
1. Add `"prepublishOnly": "npm run quality && npm run test:tarball"` to
   `package.json` scripts (NEW work — currently absent). This forces gate before publish.
2. Verify version bumped in package.json BEFORE git commit (eslint or pre-commit hook can catch).
3. Verify dist-tag explicitly: `npm publish --tag latest` (default but be explicit).
4. Run `npm pack --dry-run` and visually inspect file list before `npm publish`.
5. Check working tree is clean: `git status --porcelain` returns empty BEFORE publish.
6. Use 2FA-required granular token (npm now requires 2FA on Granular tokens
   per [npm Trusted Publishers docs](https://docs.npmjs.com/trusted-publishers/);
   alternative is OIDC trusted publishing which requires npm CLI ≥11.5.1 +
   Node ≥22.14.0 — feasible but NEW work, not required for v1.3).

**Warning signs:** `npm view @xgent-ai/gomad@1.3.0` returns 404 immediately
after publish (publish failed); or returns metadata with wrong files list.

### Pitfall 5: CHANGELOG BREAKING omits migration steps

**What goes wrong:** Users upgrade `npm install -g @xgent-ai/gomad`, run
`gomad install` in their existing v1.2 workspace, see backup created, but
don't know what to do if anything goes wrong. CHANGELOG must explicitly
list the rollback path AND link to `docs/upgrade-recovery.md`.

**Why it happens:** It's tempting to write "BREAKING: persona path moved"
and stop. Insufficient — users need actionable recovery.

**How to avoid:** Pattern from CHANGELOG.md v1.2.0 BREAKING section:
1. State what changed (path move).
2. State what installer does automatically (cleanup-planner snapshot + remove + new install).
3. State what user does (run `gomad install` once).
4. State rollback recipe with backup snapshot location.
5. Cross-link `docs/upgrade-recovery.md`.

### Pitfall 6: DOCS-07 linter false-positives on legitimate legacy references

**What goes wrong:** `tools/validate-doc-paths.js` greps for `gomad/agents/`
and flags `docs/upgrade-recovery.md:19` (which legitimately shows
`gomad/agents/pm.md` inside an example `_backups/<ts>/` tree explaining
v1.2-era backups). Linter fails CI; quality gate red.

**Why it happens:** A naive grep flags every occurrence. The legacy path
appears in three legitimate contexts: (a) `docs/upgrade-recovery.md` backup
example, (b) CHANGELOG v1.2.0 entry, (c) installer source code that
implements the cleanup-planner v12 branch (the cleanup must reference the
old path to know what to clean).

**How to avoid:** Linter MUST exempt `docs/upgrade-recovery.md` (entirely or
via a sentinel `<!-- legacy-path-ok -->` marker), `CHANGELOG.md`, and any
file under `tools/installer/` (installer source is allowed to reference the
old path for cleanup purposes — those don't appear in user-visible docs
output anyway, but code paths sweep through `*.md` files which include
this RESEARCH.md and the planning artifacts; the linter should ONLY scan
`docs/`).

**Warning signs:** `npm run quality` red on the release commit with a
"validate:doc-paths" failure that names a docs file the team hand-vetted
as legitimate.

### Pitfall 7: Test depends on `npm pack` from a dirty working tree

**What goes wrong:** `test-legacy-v12-upgrade.js` (AGENT-08) follows the v11
pattern of `npm pack` → `npm install <tarball>` in a tempdir. If the working
tree has uncommitted changes, the tarball includes them — but the test
asserts behavior of "v1.3 installer" while it's really testing "v1.3
installer + uncommitted experimental changes". False green or false red
results.

**Why it happens:** `npm pack` packs whatever's in `files:` glob from
package.json — independent of git state.

**How to avoid:** Test is run as PART of `npm run quality`, which runs in
CI on the release commit. The release commit is a clean git state by
construction (REL-04 says STATE/PROJECT/MILESTONES updated in the release
commit range, so the commit IS clean). Local manual runs against a dirty
tree are a developer concern, not a CI concern.

### Pitfall 8: Phase 11 branch not merged before v1.3.0 release

**What goes wrong:** Per `PHASE-NOTE.md`, Phase 11 was authored on a
separate branch `gsd/phase-11-docs-site-content-authoring` to prevent docs
auto-deploy from advertising v1.3 paths over the v1.2 npm install.
**If Phase 12 publishes v1.3.0 to npm but Phase 11 branch is still
unmerged**, live docs at `gomad.xgent.ai` show stale BMAD content while
npm serves v1.3.

**Why it happens:** Two separate branches, two separate merge events; easy
to forget one.

**How to avoid:** Phase 12 release plan MUST schedule Phase 11 merge as a
prerequisite step. Sequence:
1. Phase 12 lands AGENT-* + REL-* on its own branch.
2. Verify Phase 11 branch is up-to-date with main (or in same PR).
3. `npm publish` from the release commit (REL-03).
4. Tag `v1.3.0` (REL-04).
5. Merge Phase 12 branch → main (triggers docs auto-deploy WITH Phase 11
   content already merged).

**Warning signs:** After release, `gomad.xgent.ai` 404s on `/tutorials/install`
or shows stale BMAD content. Or docs show v1.3 paths while users on `latest`
have v1.2 (inverse failure).

## Code Examples

### Example 1: Adding `prepublishOnly` to package.json (REL-03 safety)

```json
// Source: package.json scripts section (extension)
{
  "scripts": {
    "prepublishOnly": "npm run quality && npm run test:tarball",
    "quality": "npm run format:check && npm run lint && npm run lint:md && npm run docs:build && npm run test:install && npm run test:integration && npm run validate:refs && npm run validate:skills && npm run test:inject-reference-tables && npm run validate:kb-licenses && npm run test:orphan-refs && npm run test:gm-surface && npm run test:tarball && npm run test:domain-kb-install && npm run test:legacy-v12-upgrade && npm run test:v13-agent-relocation && npm run validate:doc-paths"
  }
}
```

**Notes (per REL-02):** Must wire ALL of these. Order matters slightly
because `test:tarball` runs `npm pack --dry-run` which is fast; longer
tests (`test:legacy-v12-upgrade`, install/integration) should be later so
fast failures abort early. `prepublishOnly` is a built-in npm lifecycle —
it auto-runs before `npm publish`; no extra config needed [VERIFIED:
[npm docs](https://docs.npmjs.com/cli/v11/using-npm/scripts#prepublishonly)].

### Example 2: validate-doc-paths.js skeleton

```javascript
// Source: pattern from tools/validate-doc-links.js + new constraints
'use strict';
const fs = require('node:fs');
const path = require('node:path');

const DOCS_ROOT = path.resolve(__dirname, '../docs');
const FORBIDDEN_PATTERNS = [
  // The single canonical legacy path that must NEVER appear in published docs
  /\b_gomad\/gomad\/agents\b/,
  /\bgomad\/agents\/[a-z-]+\.md\b/,
];
// Allowlisted files (legacy references are legitimate context here)
const ALLOWLIST = new Set([
  'upgrade-recovery.md',                  // backup-tree example shows v1.2 layout
  'zh-cn/upgrade-recovery.md',
]);

function getMarkdownFiles(dir, base = dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('_')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...getMarkdownFiles(full, base));
    else if (/\.(md|mdx)$/.test(entry.name)) out.push(path.relative(base, full));
  }
  return out;
}

function main() {
  const failures = [];
  for (const rel of getMarkdownFiles(DOCS_ROOT)) {
    if (ALLOWLIST.has(rel)) continue;
    const content = fs.readFileSync(path.join(DOCS_ROOT, rel), 'utf8');
    for (const pat of FORBIDDEN_PATTERNS) {
      if (pat.test(content)) failures.push({ file: rel, pattern: pat.source });
    }
  }
  if (failures.length === 0) {
    console.log('OK: no legacy gomad/agents/ paths in shipped docs');
    process.exit(0);
  }
  for (const f of failures) console.error(`FAIL: ${f.file} contains pattern ${f.pattern}`);
  process.exit(1);
}
main();
```

### Example 3: CHANGELOG v1.3.0 entry (sketch — final words during plan execution)

```markdown
## [1.3.0] - 2026-04-XX

### Summary

v1.3.0 relocates persona body files from `<installRoot>/_gomad/gomad/agents/`
to `<installRoot>/_gomad/_config/agents/`, adds the story-creation domain-kb
framework, and ships initial docs content at `gomad.xgent.ai`. v1.2 → v1.3
upgrades are handled automatically with backup snapshots.

### Added
- `gm-discuss-story` skill ...
- `gm-domain-skill` ...
- `_gomad/_config/kb/` domain-knowledge install path ...
- Initial docs site content (tutorials, references, architecture) ...
- `tools/validate-doc-paths.js` linter ...
- `tools/verify-tarball.js` Phase 4: legacy-path grep-clean ...
- `test/test-legacy-v12-upgrade.js`, `test/test-v13-agent-relocation.js` ...
- `prepublishOnly` script gating publish on quality + tarball verification ...

### Changed
- Persona body install path: `<installRoot>/_gomad/gomad/agents/<shortName>.md` →
  `<installRoot>/_gomad/_config/agents/<shortName>.md`.
- Launcher stubs (`/gm:agent-*`) reference the new path; regenerated on every
  install.
- `npm run quality` matrix extended with `test:gm-surface`, `test:tarball`,
  `test:domain-kb-install`, `test:legacy-v12-upgrade`,
  `test:v13-agent-relocation`, `validate:doc-paths`.

### Removed
- (none — v1.2 → v1.3 is a relocation, not a removal)

### BREAKING CHANGES

The 8 persona body files have moved from
`<installRoot>/_gomad/gomad/agents/<shortName>.md` to
`<installRoot>/_gomad/_config/agents/<shortName>.md`. Upgrading from v1.2.0:
run `gomad install` in your existing v1.2 workspace. The installer will:
1. Snapshot the old `_gomad/gomad/agents/` files into
   `_gomad/_backups/<YYYYMMDD-HHMMSS>/_gomad/gomad/agents/`.
2. Remove the old files.
3. Write the new files at `_gomad/_config/agents/<shortName>.md`.
4. Regenerate launcher stubs (`/gm:agent-*`) to point at the new location.

If `/gm:agent-pm` (or any persona) invocation fails after upgrade, see
[`docs/upgrade-recovery.md`](./docs/upgrade-recovery.md#v12--v13-recovery)
for the rollback recipe.

If you scripted the literal path `_gomad/gomad/agents/`, update to
`_gomad/_config/agents/`.
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| npm classic tokens | npm Granular tokens (90-day max, 2FA required) OR OIDC trusted publishing | Granular tokens superseded classic, 2025; OIDC GA 2025-07-31 [CITED: [GitHub blog 2025-07-31](https://github.blog/changelog/2025-07-31-npm-trusted-publishing-with-oidc-is-generally-available/)] | For v1.3 — granular token works fine; OIDC migration is OPTIONAL future enhancement (REL-03 doesn't require it) |
| `gh-pages` branch push for static sites | `actions/deploy-pages@v4` with artifact upload | 2024 | docs auto-deploy already on the modern path [VERIFIED: `.github/workflows/docs.yaml` per architecture research] |
| Hand-rolled BM25 / fuzzy match | (still hand-rolled — `gm-domain-skill` per Phase 10) | — | Carried-forward decision; v1.3 zero-new-deps |

**Deprecated/outdated:**
- npm classic tokens: permanently deprecated 2025; existing tokens may still
  function but no new ones can be created. Use granular OR OIDC.
- `gh-pages` npm package: superseded by GitHub Actions Pages deployment.
- BMAD upstream: NOT tracked (permanent — fork posture per STATE.md).

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Custom assertion harness (no Jest/Mocha for installer tests; matches v1.2 baseline) — Jest is in devDependencies for `tools/` unit tests but installer integration tests use plain `assert(...)` helpers + colored console output |
| Config file | none (each test is a standalone Node script with shebang or `node test/<file>.js` invocation) |
| Quick run command | `npm run test:gm-surface` (~30s on cached pack, ~3min cold) |
| Full suite command | `npm run quality` (~10-20min) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AGENT-01 | Fresh install lands persona at `_config/agents/` | integration | `npm run test:v13-agent-relocation` | ❌ Wave 0 — NEW |
| AGENT-02 | `AGENTS_PERSONA_SUBPATH` constant is sole literal source | grep / lint | `tools/verify-tarball.js` Phase 4 (extended) | ⚙️ Phase 4 NEW |
| AGENT-03 | Launcher body references `_config/agents/<shortName>.md` | unit / structural | `npm run test:gm-surface` Phase C extension | ⚙️ EXTEND |
| AGENT-04 | v12-legacy cleanup branch removes old persona files | integration | `npm run test:legacy-v12-upgrade` | ❌ Wave 0 — NEW |
| AGENT-05 | Custom-file detector treats persona `.md` as generated | integration | `npm run test:v13-agent-relocation` (re-install idempotency assertion) | ❌ Wave 0 — NEW |
| AGENT-06 | Backup snapshot, remove, install, no orphans | integration | `npm run test:legacy-v12-upgrade` | ❌ Wave 0 — NEW |
| AGENT-07 | Phase C body regex | unit | `npm run test:gm-surface` (extended) | ⚙️ EXTEND |
| AGENT-08 | v1.2→v1.3 upgrade test | integration | `npm run test:legacy-v12-upgrade` | ❌ Wave 0 — NEW |
| AGENT-09 | Fresh v1.3 install assertion | integration | `npm run test:v13-agent-relocation` | ❌ Wave 0 — NEW |
| AGENT-10 | Tarball Phase 4 grep-clean | unit | `npm run test:tarball` (extended) | ⚙️ EXTEND |
| AGENT-11 | docs/upgrade-recovery.md updated | manual / docs | `validate:doc-paths` (allowlist verifies recovery file is excluded) | ⚙️ EXTEND |
| DOCS-07 | Linter enforces no `gomad/agents/` in shipped docs | lint | `npm run validate:doc-paths` | ❌ Wave 0 — NEW |
| REL-01 | CHANGELOG `### BREAKING CHANGES` present | manual / spot-check | `npm run docs:build` (does not enforce; consider CHANGELOG section regex in `validate:doc-paths`) | manual review |
| REL-02 | `npm run quality` exits 0 | meta | `npm run quality` | ⚙️ EXTEND (script) |
| REL-03 | `1.3.0` published, dist-tag `latest` | manual | `npm view @xgent-ai/gomad@1.3.0` post-publish | manual |
| REL-04 | `v1.3.0` git tag pushed | manual | `git ls-remote --tags origin v1.3.0` post-push | manual |

### Sampling Rate

- **Per task commit:** `npm run lint && npm run lint:md` (sub-second)
- **Per wave merge:** `npm run test:gm-surface && npm run test:tarball` (~5 min)
- **Phase gate:** `npm run quality` full matrix (~15-20 min)

### Wave 0 Gaps (NEW work to author before implementation can proceed)

- [ ] `test/test-legacy-v12-upgrade.js` — covers AGENT-04, AGENT-06, AGENT-08
      (clone of test-legacy-v11-upgrade.js with v1.2 seed adjustments)
- [ ] `test/test-v13-agent-relocation.js` — covers AGENT-01, AGENT-05, AGENT-09
      (simpler — fresh install + re-install idempotency)
- [ ] `tools/validate-doc-paths.js` — covers DOCS-07
      (skeleton in Code Examples §2 above)
- [ ] `verify-tarball.js` Phase 4 (extension, not new file) — covers AGENT-10
- [ ] `test-gm-command-surface.js` Phase C extension — covers AGENT-07
- [ ] `package.json` `quality` script extension + new `prepublishOnly` script
      — covers REL-02 + REL-03 safety

*(Framework install: NONE NEW. All tests are plain Node scripts using
existing `fs-extra` + `csv-parse/sync` + Node built-ins.)*

## Security Domain

> Phase 12 is an installer relocation + npm release, not a user-auth feature.
> ASVS categories that apply are mostly file-system safety and supply-chain
> integrity.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | (no user auth in this phase) |
| V3 Session Management | no | — |
| V4 Access Control | no | — |
| V5 Input Validation | yes | Realpath containment in `cleanup-planner.isContained` (D-32) — proven v1.2 control; reused for AGENT-04 v12 branch |
| V6 Cryptography | yes (file-integrity, not user-auth crypto) | SHA-256 via `node:crypto` for `was_modified` detection — already in `manifest-generator.calculateFileHash`; reuse |
| V14 Configuration | yes | npm token security (Granular 90-day OR OIDC); `.npmrc` should NOT be committed |

### Known Threat Patterns for {npm CLI installer + npm publish}

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Symlink escape during cleanup | Tampering | `fs.realpath` BEFORE containment check (D-32, `cleanup-planner.isContained`) — REUSED for v12 branch |
| Manifest corruption causing destructive cleanup | Tampering | `ManifestCorruptError` whole-batch poison (D-33) — REUSED |
| npm token theft | Spoofing | Granular tokens with 2FA + 90-day expiry; OR OIDC trusted publishing (no long-lived token) |
| Tarball pollution (`.planning/`, secrets, build artifacts shipped) | Information Disclosure | `verify-tarball.js` Phase 1 forbidden-paths check + Phase 4 NEW legacy-path grep |
| Dependency confusion (unintended npm install of typosquat) | Spoofing | `@xgent-ai/` scoped name + repository field set in package.json |
| Pre-publish state divergence (publish unbuilt code) | Tampering | NEW `prepublishOnly` script gating on quality + test:tarball |
| Force-publish over a previously-deprecated version | Tampering | npm registry refuses (immutable versions); v1.0.0 deprecation unaffected |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Approach (a) for AGENT-04 ("derive newInstallSet from current install's planned outputs") cannot work because `_prepareUpdateState` runs before `extractPersonas` populates `this.installedFiles` | Pattern 1 / AGENT-04 recommendation | If the installer pipeline is reordered or refactored, approach (a) might become viable. Verify by re-reading installer.js call sequence at plan time. [VERIFIED: installer.js:51 → :304 ordering, but is a SOFT-VERIFIED claim — code may evolve] |
| A2 | `path-utils.js` JSDoc examples (`gomad/agents/pm.md`) are illustrative source-path notation, NOT runtime path literals, and don't need to change for AGENT-* | AGENT-02 touchpoint accounting | If a future reader interprets the JSDoc as path literals, an unnecessary sweep would be wasted effort but not break anything. Low risk. [VERIFIED: read of `toDashPath` function shows input is `<module>/<type>/<name>` parsed by `parts.split('/')`] |
| A3 | `artifacts.js:55-56` and `manifest-generator.js:351-352` use `<gomadDir>/agents/` (NOT `<gomadDir>/gomad/agents/`) for orthogonal standalone-agent discovery | AGENT-02 touchpoint accounting | Verified by direct grep — these paths look at `_gomad/agents/`, persona bodies live at `_gomad/_config/agents/`. Different directories entirely. Zero conflict. [VERIFIED] |
| A4 | The DEAD-CODE comment in `artifacts.js:9-34` is stale advice from before v1.2 ships; `AgentCommandGenerator` is load-bearing for `/gm:agent-*` slash commands | Anti-Patterns / AGENT-02 touchpoint accounting | If a future cleanup pass acts on this comment, it would break v1.2's command surface. The plan should explicitly note the comment is stale. [VERIFIED: agent-command-generator.js usage at installer.js:302 + writeAgentLaunchers in IDE setup] |
| A5 | npm Granular tokens with 2FA are sufficient for REL-03 (OIDC NOT required) | REL-03 / Standard Stack | Risk: OIDC may be required by org policy not visible in this research session. Mitigation: REQUIREMENTS.md says "OIDC or granular token", confirming both are acceptable. [CITED: REQUIREMENTS.md AGENT-/REL-03 wording, [npm docs](https://docs.npmjs.com/trusted-publishers/)] |
| A6 | Phase 11's branch must be merged BEFORE the Phase 12 release commit triggers docs auto-deploy | Pitfall 8 | If Phase 11 is already merged at plan time, this is a non-issue. Verify branch status during planning. [VERIFIED: PHASE-NOTE.md states Phase 11 is on a separate branch; STATE.md says Phase 11 is "Complete" but merge state to main is not asserted] |
| A7 | The exact set of legitimate `_gomad/gomad/agents/` references in `tools/installer/` source code (after the relocation lands) is small and bounded — only the new cleanup-planner v12 branch needs the legacy literal | AGENT-10 / Pitfall 6 | If the cleanup-planner needs to handle multiple legacy versions over time, the allowlist may grow. v1.3 only deals with v1.2→v1.3, so 1 legacy literal is correct. |
| A8 | `_config/agents/` already exists in `install-paths.js:22` for `.customize.yaml` files, so AGENT-01's literal target requires NO new directory-creation code | Pattern 2 / AGENT-05 | [VERIFIED: install-paths.js:22 + ensureWritableDir loop] — directory is created on every install regardless of v1.2 or v1.3, so persona files just land there. |
| A9 | `manifest.reason = 'manifest_cleanup'` (NOT `legacy_v1_cleanup`) is the correct value for the v12 cleanup branch — manifest IS present | AGENT-08 test assertion | If implementation accidentally tags it `legacy_v1_cleanup`, the test catches it. Low risk. |
| A10 | `prepublishOnly` is the correct npm lifecycle script (NOT `prepublish` which is deprecated) | REL-03 safety | [CITED: [npm scripts docs](https://docs.npmjs.com/cli/v11/using-npm/scripts#prepublishonly)] — `prepublish` runs on `npm install` AND `npm publish` (legacy footgun); `prepublishOnly` runs ONLY on `npm publish`. |

**Risk concentration:** A1 is the single most consequential assumption — if
the AGENT-04 fix shape is wrong, the entire phase is poorly planned. The
plan's AGENT-04 implementation task should re-verify the call ordering as
its first step (reading installer.js:51 + :304 sequence) before writing the
fix.

## Open Questions

1. **Should the cleanup planner's v12 branch run BEFORE or AFTER the standard
   manifest-diff branch?**
   - What we know: The v11 branch returns early (`return plan;` at line 244)
     so no fall-through to the standard branch. The v12 branch is different
     — it handles ONLY the 8 persona files; OTHER stale entries should still
     flow through the manifest-diff branch.
   - What's unclear: The "skip already-handled" logic in the standard branch
     to avoid double-processing the persona files queued by the v12 branch.
   - Recommendation: Use a `Set<string>` of handled `resolved` paths during
     the v12 branch; have the standard branch's loop skip entries whose
     `resolved` is in that set. ~3 LOC. Plan task should include a unit test
     for this in `test-cleanup-planner.js` (existing).

2. **Should `validate-doc-paths.js` also enforce that NEW canonical paths
   (`_config/agents/`) ARE present in the expected reference docs, not just
   absence of legacy paths?**
   - What we know: DOCS-07 says "All docs path examples use the canonical
     post-v1.3 install layout".
   - What's unclear: Whether "use the canonical layout" means strict
     positive enforcement (`_config/agents/` MUST appear in `docs/reference/agents.md`)
     or only negative (`gomad/agents/` MUST NOT appear).
   - Recommendation: Start with negative-only (smaller diff, less brittle).
     Positive enforcement can be added later if false positives prove
     unbearable.

3. **Does Phase 11's branch need to be re-verified for legacy path leaks
   before Phase 12 ships?**
   - What we know: Phase 11 docs already reference `<installRoot>/_config/agents/`
     (verified by grep), with one legitimate exception in
     `docs/upgrade-recovery.md` line 19.
   - What's unclear: Whether `validate:doc-paths` enforcement should run
     against Phase 11's content as part of the Phase 12 release commit gate
     (it should — Phase 11's branch must merge to main before Phase 12 release
     per Pitfall 8).
   - Recommendation: First task in Wave 5 (DOCS-07 sweep) is "merge Phase 11
     branch into Phase 12 working branch and run `validate:doc-paths`
     against the combined tree".

4. **Should `prepublishOnly` script include `npm run docs:build`?**
   - What we know: `quality` already runs `docs:build`; if `prepublishOnly`
     just runs `quality`, that's covered.
   - What's unclear: Whether quality + prepublishOnly running docs:build
     twice is wasteful (each takes ~30s).
   - Recommendation: `"prepublishOnly": "npm run quality"` only — one source
     of truth, all gates run.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | All installer code | Will be present (engines: ≥20) | — | — |
| npm | Tarball ops, publish | — | needs ≥10.0 (≥11.5.1 for OIDC, irrelevant if granular token) | — |
| Git | Tag, push | — | any modern | — |
| `fs-extra`, `csv-parse`, `yaml`, `glob`, `js-yaml`, `semver` | Installer + tests | yes | already pinned in package.json | — |
| `astro`, `@astrojs/starlight`, `@astrojs/sitemap` | docs:build (in quality matrix) | yes (devDep) | already pinned | — |

**Missing dependencies with no fallback:** None.

**Missing dependencies with fallback:** None — all stack pieces are
already pinned or are Node built-ins.

## Sources

### Primary (HIGH confidence — direct file reads)

- `tools/installer/core/cleanup-planner.js` (530 LOC) — full read; AGENT-04 and AGENT-06 mechanics grounded here
- `tools/installer/core/installer.js` lines 35-130, 280-320, 480-590, 850-1030 — call ordering, `_prepareUpdateState`, `detectCustomFiles`
- `tools/installer/core/install-paths.js` (full) — `_config/agents/` already exists; co-tenant with `.customize.yaml`
- `tools/installer/core/manifest-generator.js` lines 345-360 — orthogonal standalone-agent discovery (NOT a touchpoint)
- `tools/installer/ide/shared/path-utils.js` (full) — JSDoc examples are illustrative, not literals
- `tools/installer/ide/shared/agent-command-generator.js` (full) — extractor + launcher writer; AGENT-02 line 71 is real touchpoint
- `tools/installer/ide/shared/artifacts.js` lines 1-90 — DEAD-CODE comment is stale; line 55-56 is orthogonal
- `tools/installer/ide/templates/agent-command-template.md` (full) — line 16 is the runtime pointer
- `test/test-gm-command-surface.js` (full) — Phase C structure for AGENT-07 extension
- `test/test-legacy-v11-upgrade.js` lines 1-200 — clone template for AGENT-08
- `test/test-domain-kb-install.js` lines 1-60 — Phase 10 reference for Wave 0 scaffolding pattern
- `tools/verify-tarball.js` (full) — Phase 1/2/3 structure for AGENT-10 Phase 4 extension
- `tools/validate-doc-links.js` lines 1-80 — pattern for DOCS-07 linter
- `package.json` — current `quality` script, dependencies, scripts
- `docs/upgrade-recovery.md` (full) — pattern for AGENT-11 v1.2→v1.3 update
- `docs/{tutorials,reference,explanation}/*.md` and zh-cn mirrors — verified all use `_config/agents/` already (Phase 11 already authored to v1.3 spec)
- `CHANGELOG.md` lines 1-120 — v1.2 BREAKING template
- `.planning/REQUIREMENTS.md` — 16-requirement scope
- `.planning/STATE.md` — locked decisions
- `.planning/ROADMAP.md` — phase context
- `.planning/research/SUMMARY.md` + `ARCHITECTURE.md` — prior research that surfaced the bugs
- `.planning/phases/11-docs-site-content-authoring/PHASE-NOTE.md` — branch coordination note
- `npm view @xgent-ai/gomad version` — confirmed 1.2.0 latest [VERIFIED 2026-04-26]

### Secondary (MEDIUM confidence — official docs)

- [npm Trusted Publishers](https://docs.npmjs.com/trusted-publishers/) — OIDC alternative
- [npm scripts: prepublishOnly](https://docs.npmjs.com/cli/v11/using-npm/scripts#prepublishonly) — pre-publish lifecycle
- [GitHub Changelog: npm OIDC GA 2025-07-31](https://github.blog/changelog/2025-07-31-npm-trusted-publishing-with-oidc-is-generally-available/) — current SOTA
- [Trusted publishing for npm packages — npm Docs](https://docs.npmjs.com/trusted-publishers/) — Granular vs OIDC tradeoffs

### Tertiary (LOW confidence)

- (none — every claim above is anchored to file:line or official-docs URL)

## Decisions Locked

> The two open design questions called out in the roadmap have a clear winner.
> Documenting the dissenting options here so the planner sees why.

### AGENT-04 — RECOMMENDED: approach (b), new v12 branch in `buildCleanupPlan`

**Recommendation:** Add `isV12LegacyAgentsDir` detector + new branch in
`cleanup-planner.buildCleanupPlan` that handles the 8 known persona files at
`_gomad/gomad/agents/<shortName>.md` regardless of `newInstallSet` membership.

**Why approach (a) was rejected:** "Derive `newInstallSet` from current
install's planned outputs" is impossible at the call site —
`_prepareUpdateState` (and `buildCleanupPlan` within it) runs at
`installer.js:51`, BEFORE `AgentCommandGenerator.extractPersonas` at
`installer.js:304` populates `this.installedFiles`. The "current install's
planned outputs" don't exist yet. Workarounds (eagerly precompute outputs;
refactor extractPersonas to be a pure function called from
_prepareUpdateState; etc.) all require re-ordering the install pipeline,
which is much higher blast radius than approach (b)'s localized cleanup-planner change.

**Approach (b) blast radius (small):**
- 1 new function `isV12LegacyAgentsDir(workspaceRoot, gomadDir)` — ~12 LOC
- 1 new input field on `buildCleanupPlan` — `isV12LegacyAgentsDir: boolean`
- 1 new branch in `buildCleanupPlan` — ~30 LOC, parallel to existing v11 branch
- 1 new "handled" Set + filter in standard manifest-diff branch — ~3 LOC
- 1 call-site change in `installer.js:_prepareUpdateState` — compute the boolean and pass it

Total: ~60 LOC across 2 files (`cleanup-planner.js`, `installer.js`).

### AGENT-05 — RECOMMENDED: Option 2, extend `detectCustomFiles` whitelist

**Recommendation:** Extend the file-not-in-manifest classification at
`installer.js:967-973` to whitelist `.md` files under `_config/agents/`
matching a known `AgentCommandGenerator.AGENT_SOURCES.shortName` as
generated, not custom.

**Why Option 1 (`_config/agents/personas/`) was rejected:** Adds a path
segment not named in REQUIREMENTS.md AGENT-01 / AGENT-03 ("personas at
`<installRoot>/_config/agents/<shortName>.md>`"). Changing the literal
target would require updating REQUIREMENTS.md, the docs already authored
in Phase 11 (which use `_config/agents/`), and the launcher template — a
much larger ripple than Option 2.

**Why Option 3 (relocate `.customize.yaml`) was rejected:** Adds a SECOND
v1.2→v1.3 migration alongside the persona relocation. Two simultaneous
migrations on the same install path = compounding risk. The user's hand-
edits to `.customize.yaml` files would need their own backup + relocation
flow. Larger blast radius for marginal benefit (cleaner long-term naming
isn't worth two migrations).

**Option 2 blast radius (tiny):**
- 1 new local constant `PERSONA_SHORTNAMES` derived from `AgentCommandGenerator.AGENT_SOURCES`
- ~5-line modification to the `if (!fileInfo)` block at `installer.js:967-973`

Total: ~8 LOC in 1 file (`installer.js`).

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — every package version verified against installed
  package.json + npm view confirmation; zero new deps maintained
- Architecture: HIGH — every claim anchored to a `file:line` in v1.2 codebase;
  AGENT-04 recommendation grounded in re-reading installer.js call sequence
  first-hand
- Pitfalls: HIGH — pitfalls 1-3 are direct read of code; pitfalls 4-8 are
  general npm + multi-branch risk patterns supported by existing project
  artifacts (PHASE-NOTE.md, CHANGELOG history)
- AGENT-04 recommendation: HIGH — the call-ordering constraint that kills
  approach (a) is verifiable in 30 seconds by re-reading installer.js:51
  vs :304
- AGENT-05 recommendation: HIGH — alternative options would require changing
  the literal target named in REQUIREMENTS.md, which is locked

**Research date:** 2026-04-26
**Valid until:** 2026-05-26 (~30 days; npm + Node + Astro stack is stable;
re-verify if `cleanup-planner.js` or `installer.js` are touched between
research and execution).
