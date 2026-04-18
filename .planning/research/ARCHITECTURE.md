# Architecture Research

**Domain:** npm-distributed agentic-workflow framework (hard fork of BMAD Method). Source-of-truth on GitHub, installable artifact, consumed by Claude Code and ~20 other AI coding IDEs.
**Researched:** 2026-04-18
**Confidence:** HIGH (all findings grounded in the working tree at `/Users/rockie/Documents/GitHub/xgent/gomad`, not training data).

## v1.2 Scope Anchor

This document answers only the five questions the roadmapper needs. It does **not** re-describe v1.1 architecture — that was shipped, the layout is stable, and nothing in v1.2 crosses module boundaries that weren't already crossed. The scope is:

1. Agent-as-slash-command migration (7 personas).
2. Copy-only installer + `files-manifest.csv`-driven upgrade cleanup.
3. Reference sweep from `gm-agent-*` to `gm:agent-*`.
4. Content surgery on `gm-create-prd` and `gm-product-brief`.
5. Build order / dependency graph.

## System Overview — What Already Exists

```
┌──────────────────────────────────────────────────────────────────────┐
│  SOURCE TREE (src/)                                                  │
│  ┌────────────────────────┐   ┌──────────────────────────────────┐   │
│  │ src/core-skills/       │   │ src/gomad-skills/                │   │
│  │   gm-help, gm-brain-   │   │   1-analysis/                    │   │
│  │   storming, gm-party-  │   │   2-plan-workflows/              │   │
│  │   mode, gm-shard-doc,  │   │   3-solutioning/                 │   │
│  │   gm-distillator, …    │   │   4-implementation/              │   │
│  └────────────────────────┘   │     gm-agent-{analyst,tech-      │   │
│                               │     writer,pm,ux-designer,       │   │
│                               │     architect,sm,dev}            │   │
│                               │     gm-create-prd, gm-product-   │   │
│                               │     brief, gm-create-story, …    │   │
│                               └──────────────────────────────────┘   │
├──────────────────────────────────────────────────────────────────────┤
│  INSTALLER (tools/installer/)                                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                │
│  │ gomad-cli.js │  │ commands/    │  │ core/        │                │
│  │ (commander)  │→ │ install.js   │→ │ installer.js │                │
│  │              │  │ uninstall.js │  │ 1700 lines   │                │
│  └──────────────┘  │ status.js    │  └──────┬───────┘                │
│                    └──────────────┘         │                        │
│  ┌─────────────────────────────────┐   ┌────▼──────────────────┐     │
│  │ modules/official-modules.js     │←──│ manifest-generator.js │     │
│  │ modules/custom-modules.js       │   │ (scans installed tree,│     │
│  │ file-ops.js                     │   │  writes 4 manifests)  │     │
│  └─────────────────────────────────┘   └────┬──────────────────┘     │
│                                             │                        │
│  ┌──────────────────────────────────────────▼───────────┐            │
│  │ ide/ — per-IDE install pipelines                     │            │
│  │   platform-codes.yaml (24 IDEs, target_dir mapping)  │            │
│  │   _config-driven.js  ←— THE FILE WITH THE SYMLINK    │            │
│  │   shared/path-utils.js  (dash-naming helpers)        │            │
│  │   shared/agent-command-generator.js  ←— DEAD CODE    │            │
│  │   templates/agent-command-template.md ←— DEAD CODE   │            │
│  └──────────────────────────────────────────────────────┘            │
├──────────────────────────────────────────────────────────────────────┤
│  INSTALL OUTPUT — at consumer's `<project>/` after `gomad install`   │
│  ┌─────────────────────────────┐  ┌──────────────────────────────┐   │
│  │ _gomad/                     │  │ .claude/skills/  (per IDE)   │   │
│  │   _config/                  │  │   gm-agent-pm/   ← SYMLINK → │   │
│  │     manifest.yaml           │  │   gm-create-prd/ ← SYMLINK → │   │
│  │     skill-manifest.csv      │  │   …52 entries                │   │
│  │     agent-manifest.csv      │  │                              │   │
│  │     files-manifest.csv ★    │  │ .cursor/skills/, .opencode/  │   │
│  │     gomad-help.csv          │  │   skills/, … same pattern    │   │
│  │     agents/  custom/        │  └──────────────────────────────┘   │
│  │   core/      agile/         │                                     │
│  │     (copied skill sources)  │                                     │
│  └─────────────────────────────┘                                     │
└──────────────────────────────────────────────────────────────────────┘
```

★ = `files-manifest.csv` already exists, already gets written, and already carries SHA-256 hashes per row (`type,name,module,path,hash`). `readFilesManifest()` and `detectCustomFiles()` in `core/installer.js` already read it on re-install to compute custom/modified file sets for backup. **The "upgrade cleanup" feature of v1.2 layers on top of existing infrastructure — it is not greenfield.**

## Component Responsibilities — Where Integration Happens

| Component | File | Current role | v1.2 change |
|---|---|---|---|
| Source of truth for agents | `src/gomad-skills/{phase}/gm-agent-*/` (7 dirs, each = `SKILL.md` + `skill-manifest.yaml`) | Loaded as skills; installed into IDE `.{ide}/skills/<dir>` via symlink; also registered in `agent-manifest.csv` with persona fields | **Dual-install**: keep behaving as a skill AND emit a slash-command `.md` stub at `.claude/commands/gm/agent-{name}.md`. See "Source-of-truth decision" below. |
| IDE installer (symlink path) | `tools/installer/ide/_config-driven.js:136-189` `installVerbatimSkills()` | Calls `fs.ensureSymlink(relTarget, skillDir)` for every row of `skill-manifest.csv` | Replace `fs.ensureSymlink` with `fs.copy(sourceDir, skillDir, { overwrite: true, filter })`. Single-point change, ~5 lines. |
| Manifest writer | `tools/installer/core/manifest-generator.js:587-647` `writeFilesManifest()` | Already iterates `this.allInstalledFiles` (a Set populated during install) and writes `files-manifest.csv` with hashes | Extend what the installer feeds into `this.installedFiles`. Add IDE-side writes (skills-target-dir copies, slash-command `.md` stubs) to the Set so they land in the CSV. |
| Upgrade detection | `tools/installer/core/installer.js:602-766` `readFilesManifest()`, `detectCustomFiles()`, `_prepareUpdateState()` | On re-install: reads old CSV, diffs against current filesystem to find user-added ("custom") + user-modified files, backs them up, lets install run, restores at end | **Add a deletion phase** between "detection complete" and "install begins": for every path in the old `files-manifest.csv` that is NOT in the custom/modified set, delete it from the target. This ensures stale slash-command stubs and stale skill copies from a prior v1.2 install are removed. |
| Slash-command installation | **(does not exist yet)** | n/a | New IDE-handler branch (Claude Code only, keyed on `platform-codes.yaml` having a new `commands_dir` alongside `target_dir`). Copies each `gm-agent-*/` launcher stub to `<projectRoot>/.claude/commands/gm/agent-{name}.md`. |
| Launcher-stub template | `tools/installer/ide/templates/agent-command-template.md` **(currently dead code per artifacts.js L12-34)** | Used to be for old compiled agent format (`{{module}}/agents/{{path}}`). Now unused. | **Revive and rewrite**: new template that delegates to the installed skill dir (`_gomad/{module}/gm-agent-{name}/SKILL.md`) and declares frontmatter with `name: gm:agent-{name}` + description. |
| Reference-sweep surface | 21 files with 54 occurrences of literal string `gm-agent-` (grep-verified) | String sprinkled through SKILL.md capability tables, skill-manifest.yaml `module:` values, module-help.csv, docs, .planning | Case-by-case rename: some to `gm:agent-*` (human-readable command form), some left as `gm-agent-*` (filesystem directory references). See "Reference sweep" section. |
| PRD content | `src/gomad-skills/2-plan-workflows/gm-create-prd/steps-c/*.md` (12 files, ~8KB each) + `templates/prd-template.md` | Step-file architecture: step-01 through step-12, each enforces just-in-time loading. Step 02b explicitly asks "Why now?"; steps 03, 10 include business metrics; step 02c produces Executive Summary in human-founder voice | Surgery on steps 02b (vision/why-now), 02c (exec summary), 03 (success metrics), 10 (nonfunctional), plus prd-template.md. |
| Product-brief content | `src/gomad-skills/1-analysis/gm-product-brief/SKILL.md` + `prompts/{contextual-discovery,guided-elicitation,draft-and-review,finalize}.md` + `resources/brief-template.md` + `agents/{opportunity,skeptic,web,artifact}-reviewer.md` | Already has "scope discipline" block explicitly declaring biz/commercial OUT. Already has "capture-don't-interrupt" for biz metrics. **Closer to coding-agent voice than the PRD.** Still has "What Makes This Different" and "Success Signals" sections aimed at humans. | Lighter surgery: tune resource template + `guided-elicitation.md` + SKILL.md scope-discipline wording. |

## Source-of-Truth Decision: Generated Stubs, Not Moved Dirs

**Question:** Do the 7 `gm-agent-*` skill directories get *moved* to a new `src/gomad-commands/` location, or are `.claude/commands/gm/agent-*.md` files *generated at install time* from the existing skill dirs?

**Recommendation: GENERATE AT INSTALL TIME. Keep `src/gomad-skills/{phase}/gm-agent-*/` as the single source of truth.**

### Reasoning

1. **The 7 agent dirs are already minimal.** Each is just `SKILL.md` + `skill-manifest.yaml`. There's no step files, no templates, no sub-resources. They are pure persona metadata. Moving them buys nothing structurally.
2. **They already participate in the skill pipeline.** `manifest-generator.js:collectSkills()` discovers them via `SKILL.md` frontmatter, writes them to `skill-manifest.csv`, and IDE installers copy/symlink them to `.{ide}/skills/gm-agent-{name}/`. This is how they show up in other IDEs (Cursor, Codex, OpenCode, etc.) that don't have Claude Code's `.claude/commands/` concept.
3. **Slash commands are a Claude Code-specific surface.** Only Claude Code consumes `.claude/commands/<ns>/<cmd>.md`. If we *moved* the sources to a commands-shaped location, we'd break the cross-IDE skill installation for the other 23 platforms. Generating a Claude-Code-only `.md` stub alongside the existing skill copy keeps both surfaces working.
4. **There's dead infrastructure ready to be revived.** `tools/installer/ide/templates/agent-command-template.md` + `shared/agent-command-generator.js` already implement "generate launcher markdown files from agent manifests, write them to a commands dir." Per the inline comments in `artifacts.js:12-34` the mechanism was retired when compiled-agent XML was dropped. The bones are there — re-target them at the Claude Code `.claude/commands/gm/` directory.
5. **The `name:` frontmatter field decides the slash form, not the path.** Verified in this very repo: `.claude/commands/gsd/new-milestone.md` declares `name: gsd:new-milestone` in its frontmatter, and that's how `/gsd:new-milestone` works. Subdirectory auto-namespacing under `.claude/commands/` was historically buggy (anthropics/claude-code#2422) and per current docs `.claude/commands/` is a legacy surface being merged into skills. **The colon form is carried by the frontmatter `name:` field, not by directory nesting.** This means our stubs can live at `.claude/commands/gm/agent-pm.md` for filesystem tidiness, but the *invocation* `/gm:agent-pm` works because the stub declares `name: gm:agent-pm`.

### What the Generated Stub Looks Like

A minimal `gm-agent-pm.md` stub at install target `<projectRoot>/.claude/commands/gm/agent-pm.md`:

```markdown
---
name: gm:agent-pm
description: Product manager persona for PRD creation and requirements discovery. Use when the user asks to talk to John or requests the product manager.
---

You must fully embody this agent's persona and follow all activation instructions exactly as specified. NEVER break character until given an exit command.

<agent-activation>
1. LOAD the full agent persona from: `_gomad/gomad/2-plan-workflows/gm-agent-pm/SKILL.md`
2. READ its entire contents — this is the complete persona, menu, and instructions.
3. Execute ALL activation steps exactly as written.
4. Follow the agent's persona and menu system precisely.
5. Stay in character throughout the session.
</agent-activation>
```

Source fields come from existing `skill-manifest.yaml` (for `displayName`, `role`, `description`) and the skill's source directory path (for the load target). The `agent-command-generator.js` already does this templating; new work is ~20 lines of targeted edits.

## Installer Flow Rewrite — Integration Points

### Current re-install flow (`core/installer.js install()`)

```
1. Config.build + InstallPaths.create      (line 38-40)
2. ExistingInstall.detect(gomadDir)        (line 42 — reads manifest.yaml)
3. if existing:
     _removeDeselectedModules              (line 48 — removes per-module dirs)
     _prepareUpdateState                   (line 49 — reads files-manifest.csv,
                                            detects custom+modified, backs up)
     _removeDeselectedIdes                 (line 50 — per-IDE cleanup() call)
4. _cacheCustomModules                     (line 58)
5. _installAndConfigure                    (line 65 — calls official-modules.install(),
                                            populates this.installedFiles Set,
                                            calls manifest-generator which writes all 4 manifests
                                            including files-manifest.csv with fresh hashes)
6. _setupIdes                              (line 67 — per-IDE setup() → installVerbatimSkills()
                                            which SYMLINKS skill dirs into .{ide}/skills/)
7. _restoreUserFiles                       (line 68 — restores backed-up custom + .bak modified)
```

### Required v1.2 changes (three integration points)

**Point 1 — `_config-driven.js:171` symlink→copy.** Single replacement:

```js
// Before:
await fs.ensureSymlink(relTarget, skillDir);

// After:
await fs.copy(sourceDir, skillDir, {
  overwrite: true,
  errorOnExist: false,
  filter: (src) => !this.fileOps.shouldIgnore(src),  // reuse FileOps.shouldIgnore
});
// Track every file written for manifest
for (const f of await this.fileOps.getFileList(skillDir)) {
  installedFilesCallback(path.join(skillDir, f));
}
```

The `installedFilesCallback` is the existing `(filePath) => this.installedFiles.add(filePath)` that `official-modules.install` already uses. The IDE installer currently does NOT hook into this (symlinks don't need tracking — the source dir under `_gomad/` is already tracked). With copy, we MUST track.

**Point 2 — Add a "manifest-driven cleanup" step before `_installAndConfigure`.** New private method on `Installer`:

```js
async _cleanStaleInstalledFiles(paths, existingInstall, updateState) {
  if (!existingInstall.installed) return;
  const oldEntries = await this.readFilesManifest(paths.gomadDir);

  // Skip anything the user touched (already backed up in updateState)
  const customSet = new Set(updateState.customFiles);
  const modifiedSet = new Set(updateState.modifiedFiles.map(m => m.path));

  for (const entry of oldEntries) {
    const abs = path.isAbsolute(entry.path)
      ? entry.path
      : path.join(paths.gomadDir, entry.path);
    if (customSet.has(abs) || modifiedSet.has(abs)) continue;
    if (await fs.pathExists(abs)) {
      await fs.remove(abs);
    }
  }

  // ALSO clean IDE targets that the old manifest tracked.
  // Problem: files-manifest.csv today records paths relative to gomadDir,
  // which won't cover .claude/commands/gm/*.md or .{ide}/skills/*.
  // Fix: extend the manifest schema (or add a sibling CSV) to record
  // absolute-or-project-relative paths for IDE-target files too.
}
```

This is invoked right after `_prepareUpdateState`, before `_installAndConfigure`. Position matters: backup first (to preserve user work), clean second (to sweep stale product files), install third (to write fresh product files).

**Point 3 — Extend `installedFiles` Set to include IDE-target writes.** Today `this.installedFiles` (populated by `official-modules.install()` callback) only contains paths under `_gomad/`. For v1.2 we must also add:
- Every file copied into `.{ide}/skills/<dir>/` (from revised `installVerbatimSkills`).
- Every generated slash-command stub at `.claude/commands/gm/agent-*.md`.

**Schema decision for `files-manifest.csv`:** Today path column stores paths *relative to `_gomad/`* (e.g., `gomad/2-plan-workflows/gm-create-prd/SKILL.md`). For IDE-target paths we need a representation that can escape `_gomad/`. Cleanest: change `path` to be relative to **project root** (so `_gomad/...`, `.claude/commands/gm/agent-pm.md`, `.cursor/skills/gm-agent-pm/` are all first-class). Migration: on first v1.2 install against a v1.1-manifest layout, the cleanup step may no-op (paths don't resolve), which is acceptable — user can re-install cleanly. On v1.2→v1.2 upgrades, cleanup works correctly.

### Failure modes the roadmap must plan for

| Failure | Manifestation | Mitigation |
|---|---|---|
| Partial install | Installer crashes after writing half the files, before writing the new manifest | Write manifest last (already the case); rerun cleans stale partial files on next install |
| Manifest schema drift (v1.1 → v1.2) | Old `files-manifest.csv` uses `_gomad/`-relative paths; new code expects project-root-relative | Sniff format on read (check if any path starts with `.claude/`, `.cursor/`, etc. — if not, treat as v1.1 format and prepend `_gomad/`) |
| User deletes `_gomad/_config/files-manifest.csv` but leaves installed files | Cleanup can't run; next install appears fresh but stale files remain | Acceptable: matches current v1.1 behavior. Document in README. |
| User moves project dir; symlinks-era install has broken symlinks | Pre-v1.2 installs will appear broken on `git clone <workspace>` | This is exactly what v1.2 solves. For users on v1.1 → v1.2 upgrade path, first `gomad install` after upgrade detects broken symlinks and replaces with copies. **Confirm during implementation**: does `fs.pathExists` return true for a broken symlink? (Likely no on most platforms — plan a sweep that force-removes the skill target before copying.) |
| IDE cleanup deletes user customizations in `.claude/commands/gm/` | Files not in old manifest but under the managed target_dir get swept | Apply existing custom/modified-file detection at the IDE target level too, not just `_gomad/` |

## Reference Sweep — Scope and Mechanics

Grep of the working tree shows **54 occurrences of literal `gm-agent-` across 21 files.** Categorization:

### Category A: Must rename to `gm:agent-*` (user-facing command form)

These are places where a human/agent reads "talk to the PM" and should see the invocation form `/gm:agent-pm`:

| File | Count | Context |
|---|---|---|
| `src/gomad-skills/module-help.csv` | 5 | `skill` column: rows for `gm-agent-tech-writer` capabilities (WD, US, MG, VD, EC). These drive `gomad-help.csv` output. When a user runs `/gm:help` they should see invokable command strings. |
| `src/gomad-skills/4-implementation/gm-sprint-agent/workflow.md` | 4 | Hand-off prose ("delegate to `gm-agent-dev`...") — should read as `/gm:agent-dev`. |
| `src/gomad-skills/4-implementation/gm-epic-demo-story/SKILL.md` | 1 | Same pattern. |
| `src/gomad-skills/**/gm-agent-*/SKILL.md` Capabilities tables | 7 (one per agent) | **KEEP as `gm-*` for the skill column** (these reference *skills* the agent invokes, which are still filesystem dirs like `gm-create-prd`). The *agent's own name* at the top of SKILL.md is already `gm-agent-pm` in the `name:` field — see Category C. |

### Category B: Must NOT rename (filesystem/manifest references)

| File | Count | Context | Why keep |
|---|---|---|---|
| `src/gomad-skills/**/gm-agent-*/skill-manifest.yaml` | 7 | `name: gm-agent-pm` field | `manifest-generator.js:parseSkillMd` validates `skillMeta.name === dirName`. Directory is still `gm-agent-pm/` on disk. The slash-command form lives in the *generated stub's* frontmatter, not here. |
| `src/gomad-skills/**/gm-agent-*/SKILL.md` frontmatter `name:` | 7 | Same constraint | Same reason. |
| `tools/validate-skills.js` | 2 | Validator probably hard-codes the pattern for the 7 agent dirs | Check but likely keep (it enforces the filesystem layout). |

### Category C: Generated-stub output (net-new)

The sweep itself doesn't touch these, but the new stubs will contain the `gm:agent-*` string. Install-target output:
- `.claude/commands/gm/agent-analyst.md`
- `.claude/commands/gm/agent-tech-writer.md`
- `.claude/commands/gm/agent-pm.md`
- `.claude/commands/gm/agent-ux-designer.md`
- `.claude/commands/gm/agent-architect.md`
- `.claude/commands/gm/agent-sm.md`
- `.claude/commands/gm/agent-dev.md`

Each carries `name: gm:agent-{role}` in frontmatter.

### Category D: Docs / planning — judgment calls

| File | Count | Recommendation |
|---|---|---|
| `.planning/PROJECT.md` | 5 | Keep as-is (historical: describes the migration in *past* / *active* form). |
| `.planning/quick/260416-j8h-*/…` | 21 across 2 files | Keep as-is (historical quick-task artifact). |
| `.planning/codebase/CONCERNS.md` | 1 | Review in context; likely update if it's forward-looking. |
| `docs/reference/commands.md` | 1 | **Update to `gm:agent-*`.** This is user-facing docs. |
| `docs/how-to/upgrade-to-v6.md`, `docs/zh-cn/how-to/upgrade-to-v6.md` | 2 | Review: if these docs are BMAD-legacy instructions, maybe delete. If they show user commands, update. |
| `docs/zh-cn/explanation/why-solutioning-matters.md` | 2 | User-facing explanation — update. |
| `tools/docs/native-skills-migration-checklist.md` | 2 | Internal doc — update if still live, otherwise remove. |

### Sweep mechanics (v1.1 lineage)

The v1.1 rename sweep used `test/test-rename-sweep.js` as the regression gate. For v1.2, either:
- **Extend `test-rename-sweep.js`** to also assert no prose `gm-agent-` in user-facing docs / module-help / workflow.md (but still allow it in skill-manifest.yaml / SKILL.md frontmatter / filesystem dirs). This gives a hard failure on drift.
- **Add `test/test-agent-command-refs.js`** as a new file focused only on the agent→command migration. Probably cleaner — v1.1's test can remain a "no bmad residual" test.

## PRD + Product-Brief Content Architecture

### gm-create-prd structure

```
src/gomad-skills/2-plan-workflows/gm-create-prd/
├── SKILL.md                    # 6 lines: frontmatter + "Follow ./workflow.md"
├── skill-manifest.yaml         # manifest for IDE install
├── workflow.md                 # Workflow architecture + step-file loading rules + activation
├── templates/
│   └── prd-template.md         # Final PRD document template
└── steps-c/                    # 12 step files (just-in-time loaded one at a time)
    ├── step-01-init.md              # Init + project discovery
    ├── step-01b-continue.md         # Continue existing PRD flow
    ├── step-02-discovery.md         # Project classification
    ├── step-02b-vision.md           # ★ "Why now?" + vision — HUMAN-FOUNDER VOICE
    ├── step-02c-executive-summary.md # ★ Exec summary — HUMAN-STAKEHOLDER VOICE
    ├── step-03-success.md           # ★ Success metrics — BIZ/OPERATIONAL METRICS
    ├── step-04-journeys.md          # User journeys
    ├── step-05-domain.md            # Domain context
    ├── step-06-innovation.md        # What's innovative
    ├── step-07-project-type.md      # Project type
    ├── step-08-scoping.md           # Scope definition
    ├── step-09-functional.md        # Functional requirements
    ├── step-10-nonfunctional.md     # ★ Non-functional — likely TIME-WINDOW / BIZ mixed in
    ├── step-11-polish.md            # Polish pass
    └── step-12-complete.md          # Completion
```

**v1.2 surgery targets (★):**

- `step-02b-vision.md` — lines 76-79 ask verbatim "Why is this the right time to build this?" Drop this prompt entirely. Keep future-state + problem-framing. Add "aggressive vision + MVP scope" framing: the goal of this step is to have the *coding agent* capture the product ambition, not to stress-test business timing.
- `step-02c-executive-summary.md` — rewrite exec-summary template to be a *dev-ready spec summary*, not a human-stakeholder pitch.
- `step-03-success.md` — drop ARR/CAC/LTV/DAU/retention-style metrics. Replace with feature-completion, acceptance-criteria-met, and functional-success signals that a coding agent can verify.
- `step-10-nonfunctional.md` — audit for business SLAs that don't translate to code; keep only technical NFRs (perf, scale, security, accessibility).
- `templates/prd-template.md` — align final document shape with revised steps.

### gm-product-brief structure

```
src/gomad-skills/1-analysis/gm-product-brief/
├── SKILL.md                    # 117 lines — Stage 1 (Understand Intent) lives here
├── manifest.json               # small manifest
├── prompts/
│   ├── contextual-discovery.md    # Stage 2 — subagent fan-out
│   ├── guided-elicitation.md      # Stage 3 — ★ asks questions potentially human-framed
│   ├── draft-and-review.md        # Stage 4
│   └── finalize.md                # Stage 5
├── resources/
│   └── brief-template.md       # ★ Functional-first but still has "What Makes This Different"
└── agents/                     # Four subagents fanned out in Stage 2
    ├── artifact-analyzer.md
    ├── opportunity-reviewer.md
    ├── skeptic-reviewer.md
    └── web-researcher.md
```

**v1.2 surgery targets (★):**

- The product-brief is **already closer to v1.2 intent than the PRD.** SKILL.md lines 14-18 explicitly declare biz/commercial metrics out of scope, and lines 102-104 say "do not probe for business/commercial metrics — only record what the user volunteers." **This is correct; don't break it.**
- `guided-elicitation.md` — audit: if there are elicitation questions that target founder mindset (competitive positioning, GTM, pricing curiosity), prune. Keep questions that surface *functional* intent.
- `resources/brief-template.md` — tune the "What Makes This Different" section: currently says "1-2 short paragraphs. The functional angle…" which is fine. But amplify: "Aggressive vision: state the full ambition in 1-2 sentences. Deliberately distinguish from MVP scope below."
- SKILL.md lines 75-80 "Brief type detection" is good. Add an explicit "coding-agent consumer" lens: the brief's ultimate reader is a coding agent that will produce a PRD, not a human VP of Product.

**Key content-architecture insight for the roadmap:** gm-product-brief is a *lighter* edit than gm-create-prd (fewer files, already-closer-to-target scope discipline). If the milestone risks falling behind, prioritize gm-create-prd first — it's where the bigger wins are.

## Build Order — Dependency Graph

```
             ┌──────────────────────────────────────┐
             │ F0. Source-of-truth decision         │
             │    (document in PROJECT.md:          │
             │     "generated stubs, not moved")    │
             └──────────────┬───────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
  ┌──────────┐      ┌───────────────┐    ┌──────────────┐
  │ F1. Copy │      │ F3. Slash-cmd │    │ F5a. PRD     │
  │   -only  │      │   generation  │    │   content    │
  │ _config- │      │   (revive     │    │   surgery    │
  │ driven   │      │    agent-cmd- │    │              │
  │    .js   │      │    generator) │    │ F5b. Brief   │
  └─────┬────┘      └───────┬───────┘    │   content    │
        │                   │            │   surgery    │
        ▼                   ▼            └──────────────┘
  ┌───────────────────────────────┐       (fully parallel,
  │ F2. Extend files-manifest     │        no deps on F1-F4)
  │   schema (project-root paths) │
  │   + installedFiles-Set plumb  │
  └──────────────┬────────────────┘
                 │
                 ▼
  ┌───────────────────────────────┐
  │ F4. Upgrade cleanup           │
  │   (_cleanStaleInstalledFiles) │
  │   — reads F2 manifest,        │
  │     deletes stale paths       │
  └──────────────┬────────────────┘
                 │
                 ▼
  ┌───────────────────────────────┐
  │ F6. Reference sweep           │
  │   (docs/module-help/workflow  │
  │    .md) + test-agent-command- │
  │    refs.js regression gate    │
  └──────────────┬────────────────┘
                 │
                 ▼
  ┌───────────────────────────────┐
  │ F7. Verification              │
  │   — fresh install             │
  │   — upgrade install (v1.1 →)  │
  │   — upgrade install (v1.2 →)  │
  │   — tarball structural check  │
  │   — E2E `/gm:agent-pm` works  │
  │     in Claude Code            │
  └───────────────────────────────┘
```

### Why this order

- **F0 first** because it's 30 minutes of doc work and it unblocks F1+F3 from arguing about layout. Must be written into PROJECT.md Key Decisions before anyone writes code.
- **F1 before F4.** Copy-only must land before manifest cleanup because the cleanup logic assumes copies (symlinks don't need cleanup — removing a symlink doesn't unroot the source). Also: F1's new tracking feeds F2.
- **F2 between F1 and F4.** Schema extension (project-root paths) is the contract F4 relies on. Must land before F4's cleanup logic can target IDE-side paths.
- **F3 parallel to F1.** Slash-command generation uses already-dead `agent-command-generator.js` + dead `agent-command-template.md`. Revives them, points at `.claude/commands/gm/`. Doesn't touch `_config-driven.js`. Can be built in parallel with F1 by a different worker, integrated together.
- **F4 after F1+F2+F3.** All three produce outputs that must be tracked in the manifest; cleanup logic needs to know about all three output shapes.
- **F5a/F5b fully parallel to F1-F4.** PRD + product-brief content surgery is pure-prose work in `src/gomad-skills/.../*.md`. Zero installer code involved. Could be done week 1 by a content-focused pass, merged cleanly regardless of installer work status.
- **F6 after F1-F5.** Reference sweep runs last because the *rename targets* depend on decisions made in F1-F5 (e.g., if F3 decides the slash form is `/gm:agent-pm`, the sweep knows what to replace to). Doing F6 first risks churn.
- **F7 last.** Verification gates the milestone.

### Build-order risk flags for the roadmapper

1. **F4's v1.1→v1.2 migration path.** The old `files-manifest.csv` has `_gomad/`-relative paths. Decide: (a) schema sniff + dual-parse or (b) force users to uninstall first. Option (a) is more polite; option (b) is simpler. Document the decision in F2.
2. **F3's dead-code revival is deceptively scoped.** `agent-command-generator.js` has 180 lines of logic for three naming formats (dash / colon / underscore). Most of it is irrelevant to the new mission. Aggressively delete rather than preserve — do not let legacy format-detection logic leak into v1.2 code.
3. **F5a surgery is the highest-content-risk item.** 12 step files, interdependent through the "stepsCompleted" frontmatter flow. Plan for a full read-through pass + a single-editor coherence pass (don't split step-02b and step-02c across two workers — they share the vision-to-summary handoff).
4. **F6's test gate is load-bearing.** Without a regression test, the sweep drifts back in later PRs. Build the test early (can be F6a before the bulk edits) so sweep PRs have a gate.

## Scaling Considerations

Not applicable at v1.2. This is a CLI installer + skill source tree, not a server. The only "scale" question is **number of managed IDE targets** (currently 24 in `platform-codes.yaml`). All v1.2 changes are additive to the IDE pipeline, so scale is bounded by that existing matrix — adding v1.2 features to one IDE (Claude Code for slash commands, all 24 for copy-only) doesn't introduce N×M complexity.

## Anti-Patterns to Avoid

### Anti-Pattern 1: "Move the gm-agent-* dirs to a new src/gomad-commands/ location"

**What this would look like:** `mv src/gomad-skills/2-plan-workflows/gm-agent-pm src/gomad-commands/pm`. Then update the installer to treat `gomad-commands/` as a sibling module root.

**Why it's wrong:**
- Breaks skill installation into the 23 non-Claude-Code IDEs that have no commands concept.
- Loses the phase-based organization (which *workflow phase* each agent belongs to).
- Doubles the source-of-truth surface: PM exists as both a skill and a command, users can't tell which is authoritative.
- Forces parallel maintenance: a persona fix has to be applied in two trees.

**Do this instead:** Keep skill dirs as single source of truth. Generate slash-command stubs at install time from the same YAML metadata.

### Anti-Pattern 2: "Just delete symlinks and recreate as copies — the manifest already works"

**What this would look like:** Change the one `fs.ensureSymlink` to `fs.copy` and ship.

**Why it's wrong:**
- The existing `files-manifest.csv` does NOT track IDE-target paths. It tracks `_gomad/...` paths only. If you copy into `.{ide}/skills/` but don't track those copies in the manifest, you've lost the cleanup primitive at the exact moment you needed it — copies pile up forever.
- `detectCustomFiles()` flags any unknown file as "custom" and backs it up. If IDE-target copies aren't in the manifest, every one of them gets flagged as custom on re-install, causing N backup/restore cycles.

**Do this instead:** Copy + track (extend `installedFiles` Set to include IDE targets) + clean (F4 uses the extended manifest).

### Anti-Pattern 3: "Rename everything that matches /gm-agent-/"

**What this would look like:** `sed -i '' 's/gm-agent-/gm:agent-/g'` across the tree.

**Why it's wrong:**
- Breaks filesystem dir references. `src/gomad-skills/.../gm-agent-pm/` is still a directory named `gm-agent-pm` on disk; `manifest-generator.js:parseSkillMd` validates that `skillMeta.name === dirName`.
- Breaks YAML: `skill-manifest.yaml`'s `name: gm-agent-pm` is a filesystem contract.
- Creates a split-personality sweep halfway through when someone realizes the renames must be reverted in half the files.

**Do this instead:** Category-driven sweep (see "Reference Sweep" above). The literal string has three distinct meanings — rename by meaning, not by regex.

### Anti-Pattern 4: "The product-brief is already done — ship what's there"

**What this would look like:** Close the PRD gap in gm-create-prd and declare gm-product-brief untouched.

**Why it's wrong:**
- Brief has "Success Signals (qualitative)" and "What Makes This Different" sections still phrased for a human reader. A coding agent reading these will produce derivative content in the same voice.
- Brief's SKILL.md line 87 suggests "Buyer vs User" for B2B — this is human-sales thinking.

**Do this instead:** Light pass on brief template wording + guided-elicitation questions. Even if the structural scope discipline is correct, the voice needs to match PRD v1.2's voice so the downstream PRD stage stays consistent.

## Integration Points

### Internal boundaries

| Boundary | Today's communication | v1.2 change |
|---|---|---|
| `src/gomad-skills/` ↔ `manifest-generator.js` | Generator walks the tree, reads SKILL.md frontmatter + skill-manifest.yaml, writes 4 manifests to `_gomad/_config/` | No change. Agent dirs are already discovered correctly. |
| `installer.js` ↔ `ide/*.js` per-IDE handlers | `ideManager.setup(ide, projectRoot, gomadDir, { selectedModules })` called per IDE | Extend the handler contract: accept a `installedFilesCallback` (mirror of what `official-modules.install` already gets) so IDE-target writes can be tracked. |
| `installer.js` ↔ `files-manifest.csv` | `readFilesManifest`, `detectCustomFiles` (read); `manifest-generator.writeFilesManifest` (write) | Add `_cleanStaleInstalledFiles` between read and write. |
| `agent-command-generator.js` ↔ `ide/_config-driven.js` | Currently no wiring — generator is dead code | Add a wire from `_config-driven.js:setup()` (Claude Code branch only) that calls the generator to produce stubs into `.claude/commands/gm/`. |

### External services

None. Everything is local filesystem. No network calls at install time (there's a best-effort `npm view @xgent-ai/gomad@latest version` check in `gomad-cli.js:21-53` but it's purely informational).

## Sources

### Primary (verified from working tree)

- `/Users/rockie/Documents/GitHub/xgent/gomad/.planning/PROJECT.md` — v1.2 milestone scope (lines 3-17, 42-45)
- `/Users/rockie/Documents/GitHub/xgent/gomad/tools/installer/gomad-cli.js` — CLI entry (lines 79-103 command registration)
- `/Users/rockie/Documents/GitHub/xgent/gomad/tools/installer/core/installer.js` — main install flow (lines 34-103), update prep (lines 460-491), file detection (lines 602-766)
- `/Users/rockie/Documents/GitHub/xgent/gomad/tools/installer/core/manifest-generator.js` — manifest write (lines 66-124, 587-647)
- `/Users/rockie/Documents/GitHub/xgent/gomad/tools/installer/ide/_config-driven.js` — THE symlink call (line 171), install loop (lines 136-189)
- `/Users/rockie/Documents/GitHub/xgent/gomad/tools/installer/ide/shared/agent-command-generator.js` — dead launcher generator (ready for revival)
- `/Users/rockie/Documents/GitHub/xgent/gomad/tools/installer/ide/shared/artifacts.js` — dead-code inventory in header comments (lines 12-34)
- `/Users/rockie/Documents/GitHub/xgent/gomad/tools/installer/ide/templates/agent-command-template.md` — dead stub template (ready for revival)
- `/Users/rockie/Documents/GitHub/xgent/gomad/tools/installer/ide/shared/path-utils.js` — dash-naming conventions (authoritative reference for how v1.1 formatted things)
- `/Users/rockie/Documents/GitHub/xgent/gomad/src/gomad-skills/2-plan-workflows/gm-agent-pm/SKILL.md` + `skill-manifest.yaml` — representative agent persona (2 files, no sub-dirs)
- `/Users/rockie/Documents/GitHub/xgent/gomad/src/gomad-skills/2-plan-workflows/gm-create-prd/steps-c/*.md` — 12-step file architecture with ★-marked surgery targets
- `/Users/rockie/Documents/GitHub/xgent/gomad/src/gomad-skills/1-analysis/gm-product-brief/SKILL.md` + subdirs — lighter-surgery content (scope discipline already in place)
- `/Users/rockie/Documents/GitHub/xgent/gomad/src/gomad-skills/module-help.csv` — 5 occurrences of `gm-agent-tech-writer` capability rows
- `/Users/rockie/Documents/GitHub/xgent/gomad/tools/installer/ide/platform-codes.yaml` — 24-IDE target_dir matrix
- `/Users/rockie/Documents/GitHub/xgent/gomad/.claude/commands/gsd/new-milestone.md` frontmatter — in-repo proof that `name: <ns>:<cmd>` is how Claude Code slash-namespacing works in practice
- Grep output on working tree: 54 occurrences of `gm-agent-` across 21 files

### Secondary (external, verified 2026-04-18)

- [Claude Code Slash Commands (current docs)](https://code.claude.com/docs/en/slash-commands) — custom commands merged into skills; `.claude/commands/` legacy but still works; `name:` frontmatter determines invocation form
- [anthropics/claude-code#2422](https://github.com/anthropics/claude-code/issues/2422) — historical bug on subdirectory auto-namespacing in `.claude/commands/` (closed "not planned"). Explains why the `name:` frontmatter approach is the reliable path.

---

*Architecture research for: v1.2 agent-to-slash-command migration, copy-only installer with manifest-tracked cleanup, PRD + brief content refinement*
*Researched: 2026-04-18*
