# Architecture Research — v1.3 Integration Map

**Domain:** CLI installer + skills framework (Node.js/CommonJS, published to npm as `@xgent-ai/gomad`)
**Researched:** 2026-04-24
**Confidence:** HIGH (every claim anchored to a file:line in the shipped v1.2 codebase)

---

## 1. System Context — What Already Exists

### Installer Pipeline (shipped v1.2)

```
┌──────────────────────────────────────────────────────────────────────┐
│ tools/installer/gomad-cli.js            (bin entry — @xgent-ai/gomad)│
└──────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌──────────────────────────────────────────────────────────────────────┐
│ core/installer.js                Installer.install()                 │
│  ├─ InstallPaths.create()         creates _gomad/, _config/, agents/ │
│  ├─ ExistingInstall.detect()                                          │
│  ├─ _prepareUpdateState()         reads files-manifest.csv,           │
│  │   ├─ cleanupPlanner.buildCleanupPlan()   PURE plan builder        │
│  │   └─ cleanupPlanner.executeCleanupPlan() snapshot → remove         │
│  ├─ _installAndConfigure()                                            │
│  │   ├─ officialModules.install()  copies src/* → _gomad/<module>/   │
│  │   ├─ AgentCommandGenerator.extractPersonas()  ← D-14/D-15         │
│  │   │    writes _gomad/gomad/agents/<shortName>.md  (v1.2 path)     │
│  │   └─ ManifestGenerator.generateManifests()                         │
│  │       ├─ writeMainManifest       (_config/manifest.yaml)           │
│  │       ├─ writeSkillManifest      (_config/skill-manifest.csv)      │
│  │       ├─ writeAgentManifest      (_config/agent-manifest.csv)     │
│  │       └─ writeFilesManifest      (_config/files-manifest.csv v2)  │
│  ├─ _setupIdes()                                                      │
│  │   └─ IdeManager → _config-driven.js                                │
│  │       ├─ AgentCommandGenerator.writeAgentLaunchers()               │
│  │       │    → .claude/commands/gm/agent-<shortName>.md              │
│  │       └─ skill copies → .claude/skills/                            │
│  └─ 2nd manifest pass (picks up IDE-root launchers)                   │
└──────────────────────────────────────────────────────────────────────┘
```

### Installed Target Layout (as of v1.2)

```
<workspaceRoot>/
├── _gomad/                              install_root='_gomad'
│   ├── _config/
│   │   ├── manifest.yaml               version + install date + modules
│   │   ├── skill-manifest.csv          skill catalog (user-visible gm:agent-* ids)
│   │   ├── agent-manifest.csv          persona metadata
│   │   ├── files-manifest.csv          v2 schema: schema_version,install_root
│   │   └── agents/                     ← ALREADY EXISTS, holds .customize.yaml
│   │                                     (user overrides, NOT persona bodies)
│   ├── _backups/<ts>/                  excluded from manifest (D-39)
│   ├── core/                           core module (skills)
│   ├── gomad/                          gomad module
│   │   ├── agents/                     ← v1.2 PERSONA BODIES LIVE HERE
│   │   │   ├── analyst.md                (8 files, one per AGENT_SOURCE)
│   │   │   ├── tech-writer.md
│   │   │   ├── pm.md
│   │   │   ├── ux-designer.md
│   │   │   ├── architect.md
│   │   │   ├── sm.md
│   │   │   ├── dev.md
│   │   │   └── solo-dev.md
│   │   ├── workflows/                  ← STAYS PUT per PROJECT.md
│   │   └── data/                       ← STAYS PUT per PROJECT.md
│   └── <other-modules>/
├── .claude/                             install_root='.claude'
│   ├── commands/gm/
│   │   ├── agent-analyst.md             launcher stubs (pointer refs)
│   │   ├── agent-tech-writer.md           ... body says:
│   │   ├── agent-pm.md                    "LOAD the FULL agent file from
│   │   └── ...                            {project-root}/_gomad/gomad/agents/
│   │                                       {{shortName}}.md"
│   └── skills/                          native SKILL.md copies
└── .claude-plugin/marketplace.json      source-of-truth for plugin ingestion
                                          (at REPO root, not install target)
```

---

## 2. Integration Map — Agent Dir Relocation `_gomad/gomad/agents/` → `_gomad/_config/agents/`

### 2.1 Exhaustive Touchpoint Inventory

Every reference to the source-path `gomad/agents/` in the v1.2 tree, with status:

| File | Line | Current Reference | Status | Change Required |
|------|------|-------------------|--------|-----------------|
| `tools/installer/ide/shared/agent-command-generator.js` | 60 | JSDoc comment "into <gomadFolder>/gomad/agents/" | LIVE | Update doc + constant |
| `tools/installer/ide/shared/agent-command-generator.js` | 71 | `path.join(workspaceRoot, this.gomadFolderName, 'gomad', 'agents')` — THE WRITE PATH | **LIVE, HOT** | Change to `'_config', 'agents'` |
| `tools/installer/ide/shared/agent-command-generator.js` | 214, 241 | JSDoc: `gomad/agents/pm.md → gomad_gomad_pm.md` | DEAD (XML compiler legacy) | Leave (already flagged dead) |
| `tools/installer/ide/shared/path-utils.js` | 57-82 | `toDashPath()` converts `gomad/agents/pm.md` → `gomad-agent-gomad-pm.md` | DEAD for v1.2 agents (agents ship as launcher stubs, not IDE-path artifacts) | Leave untouched |
| `tools/installer/ide/templates/agent-command-template.md` | 16 | `LOAD the FULL agent file from {project-root}/_gomad/gomad/agents/{{shortName}}.md` | **LIVE, HOT — this is the runtime pointer** | Change to `_gomad/_config/agents/{{shortName}}.md` |
| `tools/installer/core/installer.js` | 295 | Comment referring to `_gomad/gomad/agents/<shortName>.md` | LIVE (doc only) | Update comment |
| `tools/installer/core/installer.js` | 1711 | `path.join(expandedPath, 'agents')` (custom-module scan) | ORTHOGONAL | Leave (custom-module workflow) |
| `tools/installer/core/manifest-generator.js` | 351-356 | Scans `<gomadDir>/agents/` for standalone agents | ORTHOGONAL | Leave (standalone agent discovery) |
| `tools/installer/core/manifest-generator.js` | 825 | `path.join(modulePath, 'agents')` (module-level) | ORTHOGONAL | Leave |
| `tools/installer/ide/shared/artifacts.js` | 40-56 | `getAgentsFromBmad()` scans `core/agents/`, `<module>/agents/`, `<gomadDir>/agents/` | MARKED DEAD in source comment (lines 14-35) | Leave or drop with separate cleanup |
| `tools/installer/core/install-paths.js` | 22, 29, 42 | `agentsDir = path.join(configDir, 'agents')` | **ALREADY EXISTS** — but for `.customize.yaml` (see §2.3) | Semantic collision — see Anti-Pattern 1 |

### 2.2 Call Chain — How A Launcher Invocation Resolves Today

```
User types `/gm:agent-pm` in Claude Code
    │
    ▼
Claude Code reads .claude/commands/gm/agent-pm.md  ← flat, dash-named stub
    │
    │  body says:
    │    1. LOAD the FULL agent file from
    │       {project-root}/_gomad/gomad/agents/pm.md
    │
    ▼
Claude Code loads _gomad/gomad/agents/pm.md         ← persona body
    │
    ▼
Claude Code embodies persona, runs activation steps
```

The launcher template is the **single source of truth** for the runtime path pointer. Nothing at runtime composes the path programmatically — it's a literal string in the template, resolved via `{{shortName}}` substitution in `AgentCommandGenerator.generateLauncherContent()` (`{project-root}` is a Claude-Code-resolved variable, not a GoMad template variable).

### 2.3 Semantic Collision — `_config/agents/` Already Exists

**This is the single most important discovery.** `InstallPaths.create()` at `install-paths.js:22` already creates `_gomad/_config/agents/` as **"agents config directory"** — and this directory has established semantics:

- `installer.js:889` — `.customize.yaml` files under `_config/agents/` are **user overrides** tracked via `manifest.yaml > agentCustomizations[path] = hash`
- `installer.js:923` — `.md` files under `_config/agents/` are classified as **custom user files** (opposite of generated)

If v1.3 naively drops persona `.md` bodies into `_config/agents/` without reconciling, the custom-file detector at `installer.js:920-924` will flag them as user-created on every re-install and either back them up or fight the regenerator.

**Required reconciliation options** (pick one):
1. **Suffix partition** — put personas in `_config/agents/personas/<shortName>.md`, leave `.customize.yaml` at `_config/agents/<shortName>.customize.yaml`
2. **Extend the custom-file filter** — teach `detectCustomFiles()` that `.md` files under `_config/agents/` matching an `AGENT_SOURCES.shortName` are **generated**, not custom (preserving `.customize.yaml` semantics unchanged)
3. **Move customizations** — relocate `.customize.yaml` to `_config/agent-customizations/` and leave `_config/agents/` pure for personas

Option 2 is smallest-diff. Option 1 changes two literals (writer + template). Option 3 is the largest surface change but cleanest semantics.

### 2.4 Read-Order / Build Sequence (Critical)

Anti-patterns first (what NOT to do):
- **Don't change the launcher template before the write path.** A new launcher stub pointing to `_config/agents/<shortName>.md` with the extractor still writing to `gomad/agents/<shortName>.md` produces silent runtime failure: `/gm:agent-pm` fails to load.
- **Don't change the write path before the cleanup planner knows.** `buildCleanupPlan()` reads `files-manifest.csv` entries; old v1.2 manifests have `path=gomad/gomad/agents/pm.md`, new extract writes to `_config/agents/pm.md`. If new install happens without cleanup logic updated, the old files stay at `gomad/gomad/agents/*.md` forever (orphaned, never removed — manifest-v2 cleanup only removes what's IN the prior manifest and NOT in the new one; the stale path IS in the prior manifest and IS NOT in the new install set, so cleanup WILL remove it correctly — but only if the install actually enumerates the new paths through `this.installedFiles.add()`). **Verification step required in phase plan.**

Ordered sequence:
1. **Define target path** as a single constant (new file or add to `path-utils.js`): `AGENTS_PERSONA_SUBPATH = '_config/agents'` (or `'_config/agents/personas'` per Option 1).
2. **Write extractor first** — `agent-command-generator.js:71` — change to write to the new path.
3. **Write template second** — `agent-command-template.md:16` — update the pointer to match.
4. **Write launcher generator third** — `writeAgentLaunchers()` at `agent-command-generator.js:146` already uses the template verbatim via `generateLauncherContent()`; no code change needed if step 3 is done.
5. **Verify manifest v2 cleanup** — install a v1.2 install into a test workspace, run v1.3 installer, assert:
   - `files-manifest.csv` v1.2 had `path=gomad/gomad/agents/pm.md` (with `install_root=_gomad`)
   - v1.3 install's `this.installedFiles` contains `<ws>/_gomad/_config/agents/pm.md`
   - v1.3 install's `newInstallSet` (derived from v1.3 install — NOT from prior manifest) does NOT contain old path
   - `plan.to_snapshot` includes old `gomad/gomad/agents/*.md` entries
   - `plan.to_remove` includes old path
   - Post-install, old `_gomad/gomad/agents/` is **gone** (or directory is empty — cleanup removes files, may leave dir)

   Critical check — is `newInstallSet` derived from prior manifest or new install?

   **Re-reading `installer.js:520-543`**: `newInstallSet` is built from `existingFilesManifest` (the PRIOR manifest), realpath-resolved. It represents "files that still exist on disk from the prior install". The cleanup guard at `cleanup-planner.js:282` says `if (newInstallSet.has(resolved)) continue;` — meaning "skip entries that are in the new install set" (i.e., being preserved).

   **This is a latent bug for the relocation case.** `newInstallSet` is NOT populated from the CURRENT install's `this.installedFiles`. It's derived from the old manifest. So after relocation:
   - Old manifest has `gomad/gomad/agents/pm.md` — that path STILL EXISTS on disk at the moment `_prepareUpdateState()` runs (nothing has been removed yet)
   - `newInstallSet` adds it via `fs.realpath()`
   - `buildCleanupPlan()` hits line 282: `newInstallSet.has(resolved)` is TRUE for the old path
   - The entry is preserved, not removed
   - **Result: orphaned old persona files survive the relocation**

   This requires either (a) changing `newInstallSet` derivation to pull from the NEW install's planned outputs, or (b) adding relocation-specific cleanup analogous to `isV11Legacy` branch at `cleanup-planner.js:210-245`. The PROJECT.md entry "manifest-driven upgrade cleanup" assumes path (a) or (b) — the Phase planner must pick one.

6. **Phase-agent cleanup: `collectIdeRoots()` and manifest pass-2** — no changes expected because persona files live under `_gomad/`, install_root stays `_gomad`, and the existing manifest pipeline picks them up automatically.

### 2.5 Launcher Stub Regeneration — v1.2 Installs Upgrading to v1.3

Does a v1.2 install upgrading to v1.3 need explicit launcher-rewrite logic? **No** — launcher stubs are regenerated on every install at `_config-driven.js` handoff time (invoked from `installer.js:_setupIdes` → `IdeManager.setup` → platform handler). `writeAgentLaunchers()` unconditionally overwrites `.claude/commands/gm/agent-*.md` from the current template. Templating change in step 3 above auto-applies to v1.2 upgraders.

### 2.6 `files-manifest.csv` Migration Semantics — DELETE-old + ADD-new, not MOVE

The cleanup contract at `cleanup-planner.js:248-311` operates entry-by-entry against the prior manifest:
- If prior-manifest entry is NOT in new install set → `plan.to_snapshot` + `plan.to_remove` (DELETE-old)
- New entries absent from the prior manifest → written normally by installer, recorded in manifest pass-2

There is no `MOVE` primitive. A relocation is a (snapshot-old + remove-old + write-new + record-new) tuple, with the snapshot being the rollback safety net per D-34.

---

## 3. Integration Map — GitHub Pages Docs Site

### 3.1 Current State (fully shipped — not "to be built")

**Key discovery**: The docs site **already exists and auto-deploys**. `PROJECT.md` calls it "Astro under-construction one-pager"; reality is richer.

| Artifact | Status |
|----------|--------|
| `website/astro.config.mjs` | Full Starlight config with i18n (default + zh-CN), sidebar auto-gen from `tutorials/`, `how-to/`, `explanation/`, `reference/` | LIVE |
| `website/src/content/docs` | **Symlink** to `<repo>/docs/` (per `website/README.md`) | LIVE |
| `docs/index.md`, `docs/roadmap.mdx`, `docs/tutorials/`, `docs/how-to/`, `docs/explanation/`, `docs/reference/`, `docs/upgrade-recovery.md`, `docs/404.md`, `docs/zh-cn/` | Content tree, Diataxis structure | LIVE |
| `website/public/` | Static assets: favicon, diagrams, workflow-map HTML | LIVE |
| `CNAME` at repo root | Contents: `gomad.xgent.ai` | LIVE |
| `.github/workflows/docs.yaml` | Auto-deploy on push to `main` that touches `docs/**`, `website/**`, or `tools/build-docs.mjs`; uses `actions/upload-pages-artifact@v3` + `actions/deploy-pages@v4` | LIVE |
| `package.json` scripts: `docs:build`, `docs:dev`, `docs:fix-links`, `docs:preview`, `docs:validate-links` | wired to `tools/build-docs.mjs`, `tools/fix-doc-links.js`, `tools/validate-doc-links.js` | LIVE |
| `npm run quality` includes `docs:build` | Build validation is part of release gate | LIVE |
| DevDependencies: `astro@^5.16.0`, `@astrojs/starlight@^0.37.5`, `@astrojs/sitemap@^3.6.0` | Installed | LIVE |

**Contradiction with PROJECT.md**: PROJECT.md says "Astro under-construction one-pager" and "GitHub Pages deployment deferred until project stabilizes". Reality: site is Starlight-based, actively deploying, CNAME set. PROJECT.md also has "GitHub Pages deployment — CNAME set to gomad.xgent.ai; actual deploy deferred" in Out of Scope. **The Out-of-Scope entry is stale.** The docs workflow already runs on push-to-main.

### 3.2 Metadata Ingestion — How Docs Reference Skills/Agents

Docs currently do NOT auto-generate from `skill-manifest.yaml` or `manifest.json`. Content is hand-authored Markdown under `docs/*`. Rehype plugins (`rehype-markdown-links.js`, `rehype-base-paths.js`) rewrite links at build time but do not pull structured data from source manifests.

**v1.3 implications** (per milestone scope — "Initial content (install, agents, skills, architecture)"):
- Content is authored manually in `docs/` subdirs.
- If per-skill reference pages are desired later, a build-time step reading `src/**/skill-manifest.yaml` → generated `docs/reference/skills/*.md` would be the idiomatic Astro path — but that is **out of v1.3 scope**.

### 3.3 Build → Deploy Flow

```
Developer pushes to main  (touching docs/** or website/**)
    │
    ▼
GitHub Actions: .github/workflows/docs.yaml
    ├─ build job:
    │   ├─ actions/checkout@v4  (full history for lastUpdated)
    │   ├─ actions/setup-node@v4  (Node from .nvmrc)
    │   ├─ npm ci
    │   ├─ SITE_URL from vars.SITE_URL  (override)
    │   ├─ npm run docs:build         → tools/build-docs.mjs → astro build
    │   │                               → output: build/site/
    │   └─ actions/upload-pages-artifact@v3  (path: build/site)
    └─ deploy job: actions/deploy-pages@v4  → gh-pages (via Pages API)
```

- **No `gh-pages` branch push**. Uses the modern GitHub Pages API artifact upload (not `gh-pages` npm / `peaceiris/actions-gh-pages` / `git subtree`).
- **CNAME**: at repo root. Starlight's Astro build does not automatically copy CNAME; the `actions/deploy-pages` path generally handles custom domain via repo Pages settings + DNS, not via CNAME file propagation. **Verify in Phase** whether the root `CNAME` (15 bytes, content `gomad.xgent.ai`) is serving any purpose in the current deploy path — it may be a no-op that historically was needed for the legacy `gh-pages` branch flow.
- **Concurrency guard**: `concurrency.group: "pages"` with `cancel-in-progress: false` — sensible default, avoids mid-flight deploy cancellation.

### 3.4 v1.3 Docs Content — Actual Work

Per PROJECT.md: "Build out initial docs content (install, agents, skills, architecture) and deploy manually to gomad.xgent.ai. No CI auto-deploy in v1.3."

But auto-deploy already works. So the v1.3 work is:
- **Author `docs/tutorials/install.md`** (or `docs/how-to/install.md`)
- **Author `docs/reference/agents.md`** (list of 8 gm-agent-* personas)
- **Author `docs/reference/skills.md`** (catalog of gm-* skills)
- **Author `docs/explanation/architecture.md`**
- Optionally update sidebar slugs + translations in `astro.config.mjs`

The "deploy manually" phrasing in PROJECT.md appears to reflect caution — the CI pipeline runs on every push but the team may want content review before a push-to-main. No tooling change required.

### 3.5 Build Order for Docs Workstream

No dependency conflicts — content is additive. Docs workstream can run in **parallel** with the installer/relocation/skills workstreams provided no doc content describes paths that are in flux (e.g., don't write `docs/reference/agents.md` stating "personas live at `_gomad/gomad/agents/`" before agent relocation lands).

---

## 4. Integration Map — Story-Creation Enhancements

### 4.1 Runtime Variable Resolution — Where Does `{planning_artifacts}` Come From?

From `gm-create-story/workflow.md:19-26`:

```
Load config from `{project-root}/_gomad/agile/config.yaml` and resolve:
- `planning_artifacts`, `implementation_artifacts`
```

`{planning_artifacts}` and `{implementation_artifacts}` are configured per-project in `_gomad/agile/config.yaml` (installed by the agile module at install time). They are **runtime** variables resolved by the agent workflow, NOT install-time template variables.

Similarly, `{{story_key}}` is the hyphenated form `<epic_num>-<story_num>-<story_title>` (e.g., `1-2-user-authentication`), parsed from sprint-status.yaml or user input at `workflow.md:119-125, 176-182`.

Example resolved path at runtime: `<workspaceRoot>/docs/agile/planning/1-2-user-authentication-context.md` (if `planning_artifacts: docs/agile/planning`).

### 4.2 `gm-discuss-story` → `gm-create-story` → `gm-dev-story` Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ gm-discuss-story  (NEW in v1.3)                                 │
│   - User manually invokes to surface gray areas                 │
│   - Emits: {planning_artifacts}/{{story_key}}-context.md        │
│   - Suggested structure: 5-file mirror of gm-create-story:      │
│     SKILL.md, workflow.md, template.md, checklist.md,           │
│     discover-inputs.md                                          │
└────────────────────────┬────────────────────────────────────────┘
                         │ writes context file
                         ▼
          {planning_artifacts}/{{story_key}}-context.md
                         │
                         │ auto-detected on next run
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ gm-create-story  (MODIFIED in v1.3)                             │
│   - New auto-detect in discover-inputs.md OR Step 2             │
│     (workflow.md:211-247)                                        │
│   - If file exists: load into {story_context} variable          │
│   - Feed into Step 5 template rendering as extra context        │
└────────────────────────┬────────────────────────────────────────┘
                         │ writes story with embedded context
                         ▼
       {implementation_artifacts}/{{story_key}}.md
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ gm-dev-story  (UNCHANGED in v1.3 by default)                    │
│   - Reads story's Dev Notes section for context                 │
│   - Context is already baked into story file by create-story    │
└─────────────────────────────────────────────────────────────────┘
```

### 4.3 `gm-discuss-story` Structural Match

`gm-create-story/` contents (existing v1.2):
```
SKILL.md           267 bytes — entrypoint (frontmatter + "Follow ./workflow.md")
workflow.md        19937 bytes — step definitions with <workflow> XML
template.md        948 bytes — story file template
checklist.md       14349 bytes — validation checklist
discover-inputs.md 3911 bytes — input-pattern resolution protocol
```

v1.3 `gm-discuss-story/` should mirror this — same 5 files, same `<workflow>` XML idiom. Integration is **additive** — drops a new skill directory under `4-implementation/`. No installer code change required (ManifestGenerator.collectSkills recursive walk picks up any new SKILL.md-bearing directory automatically — `manifest-generator.js:181-272`).

### 4.4 `gm-create-story` Context-Load Patch

Two possible insertion points:

**Option A — Insert into `discover-inputs.md` (preferred)**: Add a new entry to the Input Files table concept — a "context" pattern with `SELECTIVE_LOAD` strategy that resolves `{{story_key}}` template variable. Uses the existing `SELECTIVE_LOAD` machinery (`discover-inputs.md:32-39`). Smallest code diff.

**Option B — Insert into `workflow.md` Step 2**: After `workflow.md:215` (`<action>Read fully and follow ./discover-inputs.md to load all input files</action>`), add:
```xml
<action>Check if {planning_artifacts}/{{story_key}}-context.md exists</action>
<check if="context file exists">
  <action>Load file content into {story_context}</action>
  <note>Incorporate {story_context} into Dev Notes + Architecture sections</note>
</check>
```

Option A is more idiomatic to the existing discover-inputs protocol; Option B is more surgical and keeps discover-inputs generic. Recommend **Option A** for consistency.

### 4.5 `gm-domain-skill` — Call Shape & Integration Points

**Nature**: A skill with retrieval protocol — grep-based search over `<installRoot>/_config/kb/**/*.md`.

**Invocation question — called from where?**

Three candidates:
1. **`gm-create-story`** calls it when loading context (augments Dev Notes with domain-specific patterns)
2. **`gm-dev-story`** calls it when implementing tasks (just-in-time lookup for domain patterns)
3. **Both** — gated by user skill level or explicit opt-in

Evidence favoring **#2 (gm-dev-story)**: dev-story already loads project_context at `workflow.md:35, 177` and extracts developer guidance. A domain-KB lookup naturally fits alongside project_context loading. Just-in-time retrieval is also cheaper than baking all domain content into every story file.

Evidence favoring **#1 (gm-create-story)**: story-authoring is where Dev Notes are written; retrieving domain patterns upfront and embedding them in story output means dev-story consumers get it "for free" without invoking the KB skill.

Evidence favoring **#3**: symmetric coverage, but risks content duplication and race conditions (KB changes between story-creation and story-dev).

**Recommend #1** (call from `gm-create-story`) based on the "pre-bake context into story file" pattern that v1.2 already established with `project-context.md`. This means:
- `gm-create-story/workflow.md` Step 3 (architecture analysis) adds a substep invoking `gm-domain-skill` with the story's domain tags
- `gm-domain-skill` greps `<installRoot>/_config/kb/` for matching content and returns top-N snippets
- Snippets are embedded in the story's Dev Notes under a new "Domain Guidance" section

Caller-side integration: `gm-create-story/workflow.md` needs a new `<action>` block; no manifest changes (new skill-as-sibling discovery is automatic).

### 4.6 `src/domain-kb/` Install Pipeline

**Current state**: `/Users/rockie/Documents/GitHub/xgent/gomad/src/domain-kb/` **exists as an empty directory**. v1.3 will populate it with 2 seed packs.

**Install pipeline** — needs new code:

- `src/domain-kb/` is **not** a module (no `module.yaml`, no `SKILL.md`). The existing `ManifestGenerator.scanInstalledModules()` (`manifest-generator.js:811-837`) requires `agents/` subdir or `SKILL.md` for a directory to count as a module. So automatic discovery will NOT pick this up.
- Need a new copy step analogous to `officialModules.install()` but for a KB tree. Options:
  1. **Extend official-modules**: treat `domain-kb` as a pseudo-module that installs to `_gomad/_config/kb/` instead of `_gomad/<module>/`. Requires touching `tools/installer/modules/official-modules.js` (not read, but name inferred from installer.js:5).
  2. **Dedicated step in `installer.js`**: add `_installDomainKb(paths)` between `_installAndConfigure` and `_setupIdes`, copies `src/domain-kb/*` → `_gomad/_config/kb/*`, tracks via `this.installedFiles.add()` so manifest pass captures the files under `install_root='_gomad'`.
  3. **Symlink in source tree**: impossible — the tarball publishes actual files, not symlinks. `package.json files: ["src/"]` covers `src/domain-kb/` automatically once populated.

**Recommend Option 2** (dedicated installer step). Simplest, most explicit, doesn't overload the "module" concept.

**Manifest tracking**: because every path added via `this.installedFiles.add()` is processed by `writeFilesManifest` (`manifest-generator.js:691-763`), each KB file lands in `files-manifest.csv` with correct `install_root=_gomad` and a SHA-256 hash. Cleanup planner handles add/remove/modify over successive installs automatically — the v1 → v2 path-rewrite invariant is already baked in.

**Cross-reference with §2.3**: the semantic collision question is specific to `_config/agents/`. `_config/kb/` is a greenfield path; no collision. Scope this `_config/kb/` addition to `install-paths.js:22-34` the same way `agentsDir` is defined — adds to the auto-created directory set.

### 4.7 Story-Creation Workstream Build Order

1. **Add `_config/kb/` to InstallPaths** (`install-paths.js:22-34`) — one-line add; creates directory on every install, zero-risk additive.
2. **Populate `src/domain-kb/`** with 2 seed packs (directories with `.md` files; structure TBD but simple).
3. **Add `_installDomainKb()` step** to `installer.js` — copies `src/domain-kb/*` → `<gomadDir>/_config/kb/*`, adds each path to `this.installedFiles`. Insert BEFORE the first `ManifestGenerator.generateManifests()` call (`installer.js:324`) so KB files land in files-manifest.csv on first pass.
4. **Write `gm-discuss-story/`** with 5-file mirror structure. Additive; no installer diff.
5. **Write `gm-domain-skill/`** with SKILL.md + workflow.md defining the grep-retrieve protocol. Additive; no installer diff.
6. **Patch `gm-create-story/discover-inputs.md`** (Option A from §4.4) to auto-load `{{story_key}}-context.md`. Additive.
7. **Patch `gm-create-story/workflow.md`** Step 3 to call `gm-domain-skill`. Additive.

Steps 4-7 can run in parallel with step 1-3 (installer changes don't depend on skill content and vice versa).

---

## 5. Integration Map — Plugin Marketplace Restructure

### 5.1 Current `marketplace.json` (v1.2, still says `bmad-*` — this is the ONE file the v1.1 rename missed)

```json
{
  "name": "bmad-method",                        ← WRONG: should be "gomad"
  "owner": { "name": "Brian (BMad) Madison" },  ← WRONG: should be xgent-ai
  "plugins": [
    { "name": "bmad-pro-skills", "skills": [core-skills × 11] },
    { "name": "bmad-method-lifecycle", "skills": [bmm-skills × ~27] }
  ]
}
```

All 38 skill paths use `bmad-*` prefix and `bmm-skills/` directory name — both renamed in v1.1 to `gm-*` and `gomad-skills/`. **File is entirely stale.**

### 5.2 Proposed v1.3 Layout — 3 Plugin Groups

Per PROJECT.md: "restructure of plugin groupings to match v1.2 layout (gm-agent-* launchers / gomad-skills workflow / core-skills)".

```json
{
  "name": "gomad",
  "owner": { "name": "xgent-ai / Rockie Guo" },
  "license": "MIT",
  "homepage": "https://gomad.xgent.ai",
  "repository": "https://github.com/xgent-ai/gomad",
  "keywords": ["gomad", "agile", "ai", ...],
  "plugins": [
    {
      "name": "gomad-agents",
      "description": "8 canonical agent personas (gm:agent-*) as slash-command launchers",
      "skills": [
        "./src/gomad-skills/1-analysis/gm-agent-analyst",
        "./src/gomad-skills/1-analysis/gm-agent-tech-writer",
        "./src/gomad-skills/2-plan-workflows/gm-agent-pm",
        "./src/gomad-skills/2-plan-workflows/gm-agent-ux-designer",
        "./src/gomad-skills/3-solutioning/gm-agent-architect",
        "./src/gomad-skills/4-implementation/gm-agent-sm",
        "./src/gomad-skills/4-implementation/gm-agent-dev",
        "./src/gomad-skills/4-implementation/gm-agent-solo-dev"
      ]
    },
    {
      "name": "gomad-workflow",
      "description": "Four-phase lifecycle workflow skills (analysis → plan → solutioning → implementation)",
      "skills": [ /* all non-agent skills under src/gomad-skills/* */ ]
    },
    {
      "name": "gomad-core",
      "description": "Shared infrastructure skills (brainstorming, distillator, reviews, ...)",
      "skills": [ /* all skills under src/core-skills/* */ ]
    }
  ]
}
```

### 5.3 Path Question — Source or Generated?

**Source**. `marketplace.json` paths point at `./src/gomad-skills/*` source directories, not at installed launcher stubs at `.claude/commands/gm/agent-*.md`. This is Claude Code plugin marketplace semantics — the client reads source directories and handles its own installation on the user end. Launchers at `.claude/commands/gm/*` are a GoMad-internal install target, not a marketplace artifact.

**Corroboration**: the v1.2 `marketplace.json` points at `./src/bmm-skills/*/bmad-agent-*/` source dirs, not at install targets. Same pattern applies.

### 5.4 Test Coverage for Marketplace Validity

**Current state**: `grep -rln "marketplace.json" test/ tools/` returns **nothing**. Zero test coverage.

**v1.3 gaps**:
- No JSON schema validation
- No assertion that every `./src/*/` path in the `skills` array resolves to a real directory
- No assertion that marketplace path list matches the 8 agents at `AgentCommandGenerator.AGENT_SOURCES`
- No tarball check that marketplace.json ships (currently `package.json files: ["src/", "tools/installer/", ...]` does NOT include `.claude-plugin/` — **marketplace.json is NOT shipped in the npm tarball**; users get it via `git clone` or from the GitHub repo, consistent with Claude Code plugin distribution)

**Proposed test** (name suggestion: `test/test-marketplace-contract.js`, wired into `npm run quality`):
1. Parse `.claude-plugin/marketplace.json`
2. Validate required top-level keys: `name`, `owner`, `plugins`, `homepage`, `license`
3. For every skill path: assert `fs.pathExists('./' + <path>)` and `fs.pathExists('./' + <path> + '/SKILL.md')`
4. Cross-reference the `gomad-agents` plugin's skills with `AgentCommandGenerator.AGENT_SOURCES` — each `src.dir` in AGENT_SOURCES must appear in the skills array, and vice versa
5. Validate no leftover `bmad-*` or `bmm-skills/` string tokens (anti-residual assertion consistent with v1.1 rename verification)

### 5.5 Marketplace Workstream Build Order

1. **Rewrite `marketplace.json`** — full content replacement (38 paths update, top-level rename, plugin regroup). Single-PR atomic change.
2. **Write test** (§5.4) — pin the contract in CI so future skill additions/removals can't silently drift.
3. **Wire into `npm run quality`** — add `node test/test-marketplace-contract.js` to the existing quality pipeline (`package.json:56`).

This workstream is **fully independent** of agent relocation, docs, and story-creation. Can run in parallel. Only soft dependency: if the agent relocation changes the 8 AGENT_SOURCES directory layout (which the milestone does NOT — agent skill source paths stay at `src/gomad-skills/*/gm-agent-*/`), marketplace would need to match. Since relocation only changes installed-output paths, not source-tree paths, marketplace is decoupled.

---

## 6. Recommended Phase Plan — Build Order

Phases 10+ (continuing v1.2's Phase 9 baseline):

### Phase 10 — Marketplace refresh (standalone, safe-first)
- Rewrite `.claude-plugin/marketplace.json` with v1.3 groupings
- Add `test/test-marketplace-contract.js` + quality wire-up
- **Why first**: zero runtime risk, pure config file; validates that the other workstreams don't break the contract

### Phase 11 — Docs content authoring (can run parallel with Phase 10)
- Author 4 new doc pages under `docs/tutorials/`, `docs/how-to/`, `docs/reference/`, `docs/explanation/`
- Update sidebar labels if needed in `astro.config.mjs`
- Verify `npm run docs:build` passes
- Reconcile PROJECT.md "Out of Scope" entry re: GitHub Pages deploy (already deploying)

### Phase 12 — Story-creation additive surface (parallel with Phase 10/11)
- Add `_config/kb/` to InstallPaths
- Add `_installDomainKb()` step to installer.js
- Write `gm-discuss-story/` skill (5 files)
- Write `gm-domain-skill/` skill (grep protocol)
- Populate `src/domain-kb/` with 2 seed packs
- Patch `gm-create-story/discover-inputs.md` for context auto-load
- Patch `gm-create-story/workflow.md` Step 3 for gm-domain-skill call
- Test via install-smoke: assert `_config/kb/*.md` files exist, manifest tracks them, re-install preserves user-modified KB files (existing custom-file detection already handles this for `.md` under `_config/` via `installer.js:886-908`)

### Phase 13 — Agent dir relocation (LAST — highest risk, exclusive lock)
Must run after Phase 12 lands `_config/kb/` because that phase exercises the `_config/` subdirectory install pattern without persona-file collision risk.

Sub-steps (strict order):
1. **Decide semantic collision resolution** (§2.3): pick Option 1 vs 2 vs 3.
2. **Update `agent-command-generator.js:71`** — new write path.
3. **Update `agent-command-template.md:16`** — new pointer path (match step 2).
4. **Fix the `newInstallSet` derivation bug** (§2.4 step 5) — choose (a) derive from current install or (b) add relocation-specific cleanup branch.
5. **Run full install-smoke**:
   - Fresh install → assert persona files at new path; no `.md` files at `_gomad/gomad/agents/`
   - v1.2 → v1.3 upgrade → assert old files snapshotted in `_backups/`, removed from `gomad/agents/`, written to new path
   - Idempotent re-install → no new backup, no change
6. **Update docs** (`docs/reference/agents.md` from Phase 11) with new path
7. **Update all internal refs** — `tools/installer/core/installer.js:295` comment, `agent-command-generator.js:60` JSDoc, any test fixtures

### Why This Order

- **Phase 10 first**: validates contract + provides automated regression coverage for changes in later phases that touch skill paths
- **Phase 11 parallel**: independent content work, can be authored by a different agent
- **Phase 12 before 13**: exercises `_config/` subdir install pattern on a greenfield path (kb/) before the collision-prone path (agents/)
- **Phase 13 last**: relocation is the riskiest change (runtime pointer, cleanup planner interaction, custom-file detection semantics). Land it with the largest safety net.

---

## 7. Anti-Patterns (Project-Specific)

### Anti-Pattern 1: Dropping persona files into `_config/agents/` without resolving the `.customize.yaml` collision

**What people might do**: naive change of `path.join(..., 'gomad', 'agents')` to `path.join(..., '_config', 'agents')` at `agent-command-generator.js:71` + matching template change.
**Why it's wrong**: `installer.js:886-908` classifies `.md` files under `_config/agents/` via a custom-file detector that predates this relocation. On re-install, the detector either (a) flags regenerated persona files as "user custom" (backup + preserve logic kicks in) or (b) silently skips them in cleanup (orphan risk). Also `manifest.yaml.agentCustomizations[...]` hashing machinery will misbehave if the persona files now share the namespace.
**Do this instead**: pick one of Options 1/2/3 from §2.3 and land the reconciliation in the same PR as the path change.

### Anti-Pattern 2: Trusting `newInstallSet` as "new install paths"

**What people might do**: reading `installer.js:520-543` and assuming `newInstallSet` represents the v1.3 install's target paths.
**Why it's wrong**: `newInstallSet` is derived from the PRIOR manifest, filtered to entries that still exist on disk — i.e., it's "paths we'd preserve from the old install". It has nothing to do with what the new install is about to write. A relocation that changes output paths won't trigger old-path cleanup automatically.
**Do this instead**: either (a) construct `newInstallSet` from the running install's planned output list, or (b) add a relocation-specific arm to `buildCleanupPlan` analogous to the `isV11Legacy` branch.

### Anti-Pattern 3: Assuming `src/domain-kb/` is a module

**What people might do**: dropping content into `src/domain-kb/` and expecting `ManifestGenerator.scanInstalledModules()` to discover it.
**Why it's wrong**: that scanner requires `agents/` subdir or a `SKILL.md` to classify a directory as a module (`manifest-generator.js:811-837`). KB content lacks both. Zero discovery happens.
**Do this instead**: add an explicit `_installDomainKb()` step to `installer.js` that copies + tracks files; rely on the v2 manifest pipeline to record them.

### Anti-Pattern 4: Auto-generating docs from skill manifests in v1.3

**What people might do**: build a `tools/generate-skill-docs.mjs` that scans `src/**/skill-manifest.yaml` and produces `docs/reference/skills/*.md`.
**Why it's wrong**: out of v1.3 scope per PROJECT.md Active requirements; adds a maintenance surface that must keep up with skill-manifest schema evolution; current docs are Diataxis-organized, not per-skill reference. Auto-gen breaks the structure.
**Do this instead**: write curated prose content under `docs/reference/` by hand for v1.3. If later milestones want auto-gen, scope it as its own initiative.

### Anti-Pattern 5: Treating `marketplace.json` paths as install targets

**What people might do**: writing paths like `./.claude/commands/gm/agent-analyst.md` in `marketplace.json.plugins[].skills[]`.
**Why it's wrong**: Claude Code's plugin marketplace ingests source SKILL.md directories, not launcher stubs or flattened install outputs. The current file (even in the stale BMAD form) already points at source trees (`./src/bmm-skills/*/bmad-agent-*/`). Swapping in launcher paths breaks marketplace semantics and ships zero skill content.
**Do this instead**: point marketplace paths at `./src/gomad-skills/*/gm-agent-*/` source dirs containing `SKILL.md` + `skill-manifest.yaml`.

---

## 8. Data Flow — Install-Time Path Composition

```
INSTALL TIME
────────────
src/gomad-skills/4-implementation/gm-agent-dev/
  ├── SKILL.md  (frontmatter: name: gm-agent-dev, description: ...)
  │     body ... (persona activation text)
  └── skill-manifest.yaml  (displayName: Developer, title: "Developer",
                            icon: "⚙️", capabilities: "...")

                            │
                            │ AgentCommandGenerator.extractPersonas()
                            │ (runs in installer.js:300)
                            │
                            ▼ strip SKILL.md frontmatter,
                              prepend full skill-manifest as new frontmatter
                            │
                            ▼
v1.2: _gomad/gomad/agents/dev.md       ← target changes in v1.3
v1.3: _gomad/_config/agents/dev.md     (or _config/agents/personas/dev.md per §2.3)

                            │
                            │ writeAgentLaunchers() uses template
                            │
                            ▼
.claude/commands/gm/agent-dev.md       (template substitutes {{shortName}}=dev)
  frontmatter: name: 'gm:agent-dev'
  body: "LOAD the FULL agent file from
         {project-root}/_gomad/<RELOCATION-PATH>/dev.md"
                            │
                            │ every file-write calls this.installedFiles.add(path)
                            │
                            ▼
ManifestGenerator.generateManifests() reads this.installedFiles
                            │
                            ▼
_gomad/_config/files-manifest.csv  (v2: path + install_root + hash + schema_version)

RUNTIME (User types /gm:agent-dev in Claude Code)
─────────────────────────────────────────────────
Claude Code reads .claude/commands/gm/agent-dev.md
  ├─ parses YAML frontmatter (name, description)
  ├─ reads instruction block
  └─ executes "LOAD the FULL agent file from <path>"
                            │
                            ▼ literal path substitution (no programmatic lookup)
                            │
                            ▼
loads file at _gomad/<path>/dev.md and embodies persona
```

**Critical invariant**: the path in `agent-command-template.md:16` MUST match the path in `agent-command-generator.js:71` (and the semantic resolution chosen in §2.3). These are the two sides of a literal string — if they drift, every `/gm:agent-*` invocation fails silently with "file not found" at the Claude Code side.

---

## 9. Sources (all HIGH confidence — direct file inspection)

- `/Users/rockie/Documents/GitHub/xgent/gomad/.planning/PROJECT.md` — milestone scope, constraints, v1.2 shipped state
- `/Users/rockie/Documents/GitHub/xgent/gomad/tools/installer/core/installer.js` — install orchestration, prepareUpdateState, _setupIdes, newInstallSet derivation at lines 520-543
- `/Users/rockie/Documents/GitHub/xgent/gomad/tools/installer/core/install-paths.js:22` — `_config/agents/` pre-existing directory creation
- `/Users/rockie/Documents/GitHub/xgent/gomad/tools/installer/core/manifest-generator.js` — skill/agent collection, v2 manifest write
- `/Users/rockie/Documents/GitHub/xgent/gomad/tools/installer/core/cleanup-planner.js` — pure plan builder, LEGACY_AGENT_SHORT_NAMES=AGENT_SOURCES
- `/Users/rockie/Documents/GitHub/xgent/gomad/tools/installer/ide/shared/agent-command-generator.js` — AGENT_SOURCES (8 agents), extractPersonas, writeAgentLaunchers
- `/Users/rockie/Documents/GitHub/xgent/gomad/tools/installer/ide/shared/path-utils.js` — GOMAD_FOLDER_NAME='_gomad', dead toDashPath agent branch
- `/Users/rockie/Documents/GitHub/xgent/gomad/tools/installer/ide/shared/artifacts.js` — dead code with self-documenting TODO
- `/Users/rockie/Documents/GitHub/xgent/gomad/tools/installer/ide/templates/agent-command-template.md:16` — runtime pointer literal
- `/Users/rockie/Documents/GitHub/xgent/gomad/tools/installer/ide/platform-codes.yaml` — target_dir / launcher_target_dir per IDE
- `/Users/rockie/Documents/GitHub/xgent/gomad/.claude-plugin/marketplace.json` — stale BMAD-era plugin metadata
- `/Users/rockie/Documents/GitHub/xgent/gomad/src/gomad-skills/4-implementation/gm-create-story/{SKILL.md,workflow.md,discover-inputs.md,template.md}` — story-creation skill structure, `{planning_artifacts}`/`{{story_key}}` resolution
- `/Users/rockie/Documents/GitHub/xgent/gomad/src/gomad-skills/4-implementation/gm-dev-story/workflow.md` — downstream consumer, project_context loading pattern
- `/Users/rockie/Documents/GitHub/xgent/gomad/src/domain-kb/` — verified empty (no seed packs yet)
- `/Users/rockie/Documents/GitHub/xgent/gomad/website/{astro.config.mjs,README.md,src/lib/site-url.mjs}` — Starlight config, symlink arch, SITE_URL cascade
- `/Users/rockie/Documents/GitHub/xgent/gomad/.github/workflows/docs.yaml` — Pages deploy via `actions/deploy-pages@v4`
- `/Users/rockie/Documents/GitHub/xgent/gomad/CNAME` — contents `gomad.xgent.ai`
- `/Users/rockie/Documents/GitHub/xgent/gomad/package.json` — deps, scripts, quality gate wiring

---

*Architecture research for: GoMad v1.3 (Marketplace refresh + Docs + Agent relocation + Story context)*
*Researched: 2026-04-24*
