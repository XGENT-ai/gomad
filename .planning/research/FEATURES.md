# Feature Research

**Domain:** AI coding-agent tooling — slash-command distribution, installer portability, coding-agent-oriented planning artifacts
**Researched:** 2026-04-18
**Confidence:** HIGH (four features are each concrete refactors against an existing codebase; target UX for each is well-documented in Claude Code / upstream BMAD / npm tooling ecosystems)

## Scope

This document covers v1.2 target features for `@xgent-ai/gomad`:

1. **Agent → slash-command migration** — 7 `gm-agent-*` personas become `.claude/commands/gm/agent-*.md`, invoked as `/gm:agent-*`.
2. **Reference sweep** — replace every `gm-agent-*` reference with `gm:agent-*` across source / docs / tests / manifests.
3. **Copy-only installer + files-manifest.csv** — symlink mode removed; installer writes `_gomad/_config/files-manifest.csv`; re-install cleans files from prior manifest before writing new ones.
4. **PRD / product-brief refinement for coding agents** — drop human-founder framing; amplify aggressive vision + MVP scope; sharpen dev-ready requirements.

Each section identifies table stakes, differentiators, anti-features, and dependencies on existing gomad artifacts.

---

## Feature 1 — Agent-as-Slash-Command

### Table Stakes (Users Expect These)

| Feature | Why Expected | Complexity | Notes |
|---|---|---|---|
| File path `.claude/commands/gm/agent-*.md` produces invocation `/gm:agent-*` | Claude Code convention: subdirectory name becomes command namespace separated by colon. Exactly how Anthropic docs and every community command pack (wshobson/commands, Claude-Command-Suite, aj-geddes/claude-code-bmad-skills) structure namespaced commands. | LOW | Already validated by existing `AgentCommandGenerator.writeAgentLaunchers` which does `path.join(baseCommandsDir, artifact.module, 'agents', ...)` — we just need the directory layout `gm/agent-<role>.md` instead of `gomad/agents/<role>.md` and matching filenames. |
| YAML frontmatter with `description` | Surfaces in `/help` and in the slash-command picker when the user types `/`. Without it, users can't tell commands apart. | LOW | Existing `agent-command-template.md` already emits `description`. Keep one-line descriptions (<100 chars) — full long text gets truncated in the 1,536-char picker budget. |
| Flat file (no arguments, no bash execution) for persona activation | Agent personas are stateful sessions, not one-shot commands. Users expect `/gm:agent-analyst` to *become Mary*, not to take args or run `!git status`. | LOW | Current template is already argument-free and just embeds the agent-activation block. Do NOT add `argument-hint` or `$ARGUMENTS` to agent launchers — that's a different primitive (task commands). |
| Command picker shows both `/gm:agent-analyst` and its description | Discovery UX — a user types `/gm:` and sees all seven personas with one-line roles. | LOW | Derive from `skill-manifest.yaml` `displayName` + `title` (e.g. "Mary — Business Analyst") rather than generic "analyst agent". Fits the 100-char description soft budget. |
| `gm/` namespace prefix on every command | Prevents collision with user's own commands and other installed tools' commands (gsd, custom internal packs). | LOW | One directory nesting level under `.claude/commands/`. |
| Deterministic file names: kebab-case, no suffixes, no versioning in filename | Matches Anthropic docs and every production command pack. Filenames become command names — `/gm:agent-analyst`, not `/gm:agent-analyst-v1`. | LOW | Rename map: `gm-agent-analyst` → `gm/agent-analyst.md`, `gm-agent-tech-writer` → `gm/agent-tech-writer.md`, etc. |
| Uninstall removes the `.claude/commands/gm/` directory cleanly | Re-running `gomad install` or uninstalling should not leave orphan slash commands that error on invocation. | LOW | Ties into Feature 3 (files-manifest.csv). |

### Differentiators (Competitive Advantage)

| Feature | Value Proposition | Complexity | Notes |
|---|---|---|---|
| Persona identity embedded in launcher description: "Mary — Strategic Business Analyst" | Users recognize the persona name in the picker, not just a functional label. Builds mental model before invocation. | LOW | Pull from `skill-manifest.yaml` (`displayName`, `title`, `icon`). |
| Agent file loaded on-activation via `{project-root}/_gomad/gomad/agents/...` reference | Decouples command launcher (lightweight, in `.claude/commands/`) from persona definition (full content, in `_gomad/`). Single source of truth; rebranding edits one file. | LOW | Already how `agent-command-template.md` works — keep it. Don't inline the whole persona in the launcher. |
| One-line capability summary in description (e.g. "market research, competitive analysis, requirements elicitation") | Helps the model match user intent to the right persona when the user says "I need help with competitive analysis." | LOW | Pull from `skill-manifest.yaml` `capabilities` field. |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---|---|---|---|
| Argument passing on agent launchers (`/gm:agent-analyst <topic>`) | "It would be nice to seed the session with a topic." | Personas are conversational. Arguments make the first turn stilted and break the agent's greeting/menu pattern. Upstream BMAD deliberately does NOT pass args to agent launchers. | User invokes `/gm:agent-analyst` → Mary greets → user describes topic naturally. |
| Nesting launchers deeper than one level (`.claude/commands/gm/agents/analyst.md` → `/gm:agents:analyst`) | "More organization." | Three-segment slash commands are harder to type and inconsistent with ecosystem (Anthropic examples, wshobson/commands, Claude-Command-Suite all use 1-2 segments). Also breaks older Claude Code compatibility (issue bmad-code-org/BMAD-METHOD#773 — discovery in nested dirs was flaky). | Single `gm/` directory; put `agent-` prefix in the filename itself. |
| Model override (`model: opus` / `model: haiku`) in frontmatter for agent launchers | "Let tech-writer use cheaper model." | Agent personas run full conversations; locking them to Haiku degrades quality unpredictably. User's global model config should win unless there's a measured reason. | Don't set `model`; let the user's session model flow through. |
| `allowed-tools` restrictions on launcher frontmatter | "Scope down what each persona can do." | Personas need the full tool surface for their phase (Dev needs Write/Edit/Bash; Architect needs Read/Grep/WebSearch). Restricting creates puzzling "why can't Mary read this file?" failures. | Trust the persona's instructions to self-scope; don't enforce at the tool layer. |
| Keeping BOTH `gm-agent-*` skills AND `/gm:agent-*` commands (dual surface) | "Backward compat." | Doubles the maintenance surface. Users on v1.1 won't auto-upgrade anyway (they'd re-run `gomad install`). Clean break is cheaper than a year of "which do I use?" questions. | Hard cut. Retain the skill file as the loaded persona body (referenced by `{project-root}/_gomad/gomad/agents/...`); remove it from `skill-manifest.yaml` discovery as a standalone skill. |
| Inlining the full persona body into the launcher file | "One file to edit." | Violates single source of truth; the launcher is for Claude Code discovery, the persona definition is the skill content. Any update requires editing both. | Keep launcher minimal (template); persona stays in `src/gomad-skills/*/gm-agent-*/SKILL.md`. |

### Real-World Precedent

- **Upstream BMAD v6.3.0** (April 2026) has already migrated from `workflow.yaml` to native Claude Code `SKILL.md` format. The ecosystem is coalescing around native slash commands + skills, away from custom launcher formats.
- **aj-geddes/claude-code-bmad-skills**, **PabloLION/bmad-plugin**, **24601/BMAD-AT-CLAUDE** — all three BMAD-for-Claude-Code ports use `.claude/commands/<namespace>/<name>.md` → `/<namespace>:<name>` exactly as proposed here.
- **qdhenry/Claude-Command-Suite**, **wshobson/commands** — community packs standardize on one-level namespace (`/dev:code-review`, `/security:security-audit`).

---

## Feature 2 — Reference Sweep (`gm-agent-*` → `gm:agent-*`)

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---|---|---|---|
| Every mention in `src/gomad-skills/*/SKILL.md`, `src/core-skills/*/SKILL.md` updated | Skills reference each other ("invoke `gm-agent-pm`"). Dangling refs break workflows. | LOW | Affects the capabilities tables in every agent SKILL.md and cross-references in task skills. ~17 files per grep. |
| `module-help.csv` entries updated | The `gm-help` skill reads this catalog; a stale entry surfaces "run `gm-agent-analyst`" to users who no longer have that skill. | LOW | `src/gomad-skills/module-help.csv` and `src/core-skills/module-help.csv`. |
| README.md, README_CN.md, `docs/`, website content updated | External-facing surface; stale instructions mislead new users. | LOW | "Use `/gm:agent-analyst` to talk to Mary" replaces "Invoke `gm-agent-analyst` skill." |
| Test fixtures (`tests/`) reflecting new invocation format | CI fails on stale fixtures. | LOW | Likely thin — installer tests mostly check file layout, not invocation strings. |
| Installer output templates (completion messages, next-steps prompts) updated | User-facing "you're ready; run `gm-agent-pm`" message points to the new command form. | LOW | `tools/installer/install-messages.yaml`. |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---|---|---|---|
| Migration note in CHANGELOG explaining the rename with before/after examples | Anyone upgrading from v1.1 needs one place that tells them `gm-agent-pm` is now `/gm:agent-pm`. | LOW | Single section in CHANGELOG.md. |
| Runtime deprecation path: if a skill SKILL.md references `gm-agent-*`, emit a one-time warning linking to the new form | Safety net for any reference we miss. | MEDIUM | Optional; grep-driven sweep should catch everything statically. Skip unless sweep is incomplete. |

### Anti-Features

| Feature | Why Requested | Why Problematic | Alternative |
|---|---|---|---|
| Automated `sed` sweep across entire `src/` | "Fast." | Catches false positives in code comments, documentation examples, legacy strings. Silent corruption risk. | Manual grep + targeted Edit. ~17 files — hand-verifiable. |
| Leaving BMAD fork references (`.bmad`, `bmm-`, `bmad-`) in stale comments untouched | "Not in scope." | Confuses future contributors ("wait, do we still support bmad?"). Gomad is a hard fork — residual refs are technical debt. | Sweep these at the same time; it's one pass. |
| Updating `skill-manifest.yaml` `name` field from `gm-agent-analyst` → `gm:agent-analyst` | "Name should match command." | Colons in skill names break filesystem conventions (colon is path separator on Windows; reserved in URLs). The command surface is `gm:agent-analyst`, but the *skill file* stays `gm-agent-analyst` for filesystem safety. | Command name (user-visible) uses colon. File/skill internal name (filesystem) uses dash. They are different identifiers. |

---

## Feature 3 — Copy-Only Installer + Files-Manifest Tracking

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---|---|---|---|
| Copy-only mode (no symlinks) | npm's own default is copy (Issue npm/npm#12515 and symlink-or-copy package document that symlinks break on git clone, tarball archives, cross-platform sync, and read-only filesystems). Installed output must survive `git clone` of the target repo to another workstation. | LOW | Grep installer for `fs.symlink`, `fs.link`, `fs-extra.ensureSymlink`, `.lnk` — remove. Current code (`installer.js`) already uses `fs.copy`; verify no symlink path in custom-modules or IDE handlers. |
| `_gomad/_config/files-manifest.csv` enumerating every written path | Every CMake install (`install_manifest.txt`), dotnet SDK uninstaller, dpkg `.list`, Homebrew `INSTALL_RECEIPT.json`, ML4W dotfiles, pip `RECORD` — all modern installers track what they wrote to enable clean uninstall. Without this, re-install leaves orphan files and upgrades accumulate cruft. | MEDIUM | Schema: one row per file. Columns: `path`, `hash` (sha256), `module`, `artifact_type` (skill/agent/command/config), `install_date`. Existing `this.installedFiles` Set in `Installer` class is the staging ground — currently passed to `ManifestGenerator.generateManifests` but manifest.js writes only module-level yaml, not per-file CSV. |
| Re-install / upgrade cleans files listed in prior manifest before writing new ones | Without this, renamed files (e.g. `gm-agent-*` skills → `gm/agent-*.md` commands) accumulate. User ends up with stale v1.1 `.claude/skills/gm-agent-*/` AND new v1.2 `.claude/commands/gm/agent-*.md`. | MEDIUM | Algorithm: (1) Read existing `files-manifest.csv`; (2) Collect target file set for new install; (3) Diff — `to_delete = prior - new`; (4) Delete stale files, rmdir empty parents up to `.claude/` boundary; (5) Write new files; (6) Write new `files-manifest.csv`. |
| Never delete files outside the gomad-managed set | Destroying the user's hand-edited `.claude/commands/<other-thing>.md` is catastrophic. | MEDIUM | The manifest is the allowlist of what `gomad` owns. Everything else is off-limits. Existing `_restoreUserFiles` logic already distinguishes "custom" from "installed" files — this extends it. |
| Hash (sha256) per file in manifest | Enables detection of user-modified managed files on re-install (like `rpm --verify` or `.bak` preservation). | LOW | Existing code backs up modified files as `.bak` — keep that behavior. Hash lets us detect modification without needing to re-read on every install. |
| Fresh install writes manifest (no prior to read) | First-time install must establish the manifest so subsequent upgrades can clean. | LOW | Null-object pattern: missing `files-manifest.csv` → `prior = []`, no cleanup, just write. |
| Cross-platform path handling (Windows backslash vs POSIX forward-slash) | Manifest on a Windows machine must be readable on macOS if the repo is committed. | LOW | Store POSIX-form paths in CSV; convert at read/write boundaries. Existing `agent-command-generator.js` already does `replaceAll('\\', '/')`. |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---|---|---|---|
| `gomad install --dry-run` prints what would be written / deleted | Every modern installer supports this (dotnet uninstaller, rclone, ansible, apt, pip, astral-sh/uv issue #14194). Prevents "oh no I didn't want that" moments. | MEDIUM | Plumbs a `dryRun` flag through installer; skip `fs.writeFile`/`fs.remove` calls when set; log the intended operation. |
| Install summary shows counts: "42 files written, 3 files removed, 2 files preserved as .bak" | Confidence-building; matches Homebrew / npm summary style. | LOW | Already partially present (`renderInstallSummary`); extend with file-level numbers. |
| Backup stale files to `_gomad/_backups/<timestamp>/` instead of deleting | Safety hedge for first few v1.2 installs. Users can recover if we mis-computed the diff. | MEDIUM | Extra disk use. Worth it for one or two releases, then can be removed. |
| Manifest version field (`schema_version: 1`) | Future-proofs against schema changes. | LOW | Trivial; add a header row or sidecar field. |

### Anti-Features

| Feature | Why Requested | Why Problematic | Alternative |
|---|---|---|---|
| Interactive "are you sure?" prompt on every file deletion during upgrade | "Safety." | 320+ files per install; user would mash Enter 320 times. They opted into upgrade by running the command. | Single pre-flight summary + one confirmation, or `--yes` to skip. Existing `-y/--yes` flag. |
| Tracking every file the user touches in `.claude/commands/` (including user-owned) | "Helps on uninstall." | Gomad has no business tracking files it didn't write. Manifest must be scoped strictly to gomad-written paths. | Manifest tracks only paths written by `this.installedFiles.add(...)`. |
| Keeping symlink mode behind a `--symlink` flag for "dev mode" | "Faster iteration for contributors." | Splits behavior across two install modes → bug reports that only reproduce in one mode. Contributor dev loop should use `npm link` globally, not a special install flag. | Single mode (copy). Contributors use `npm link @xgent-ai/gomad` + `gomad install` from a workspace. |
| Content-addressable store (hash-named files in `_gomad/.store/` with symlinks into `.claude/`) | "pnpm does it." | pnpm can because it controls node_modules top-to-bottom. Our install surface is multiple IDEs (Claude Code, Cursor, Codex, etc.) — adding a store indirection explodes complexity. | Plain copy, manifest, diff-based cleanup. |
| Deleting files only listed in previous `manifest.yaml` (the module-level manifest) | "Reuse what we have." | Current manifest only tracks module IDs — not individual file paths. Insufficient granularity; wouldn't detect renamed files. | New `files-manifest.csv` explicitly for per-file tracking. |
| Git-based diff/clean (using `.gitignore` patterns to identify managed paths) | "Leverage git." | Target workspace may not be a git repo; managed paths may overlap with user-added entries to `.gitignore`. | File-list manifest is explicit and self-contained. |
| Storing manifest as JSON | "JSON is standard." | CSV is human-readable line-by-line, diffable in git, append-appendable. Manifest has no nesting. JSON adds ceremony without benefit. | CSV (already what PROJECT.md calls for). |

### Real-World Precedent

- **CMake** — `install_manifest.txt` is a newline-delimited path list. Uninstall reads it, deletes each.
- **pip** — `RECORD` file in `.dist-info/` is CSV: `path,hash,size`. Identical shape to what we need.
- **dpkg** — `/var/lib/dpkg/info/<pkg>.list` is newline-delimited paths.
- **Homebrew** — `INSTALL_RECEIPT.json` under Cellar tracks version + paths; `brew cleanup` removes prior versions.
- **mise / asdf** — per-plugin shim tracking; upgrades rebuild shims (`asdf reshim`) to handle version-path mismatches.
- **ML4W dotfiles uninstaller** (GitHub Wiki) — removes dotfiles folder, related symlinks, and desktop files; restores pre-install `.config` backups.

Common thread: a canonical list of owned paths, checked before destructive operations.

---

## Feature 4 — Coding-Agent-Oriented PRD & Product-Brief

### Current State (gm-create-prd, gm-product-brief)

Both skills today read as human-founder facilitation frameworks. Evidence in the code:

- `gm-product-brief/SKILL.md` literally says "Act as a product-focused Business Analyst and peer collaborator" and lists "differentiation (1-2 sentences)", "rough qualitative success signals", "high-level vision" under *Lightly covered*.
- "**Out of scope for this brief**" explicitly names ARR, CAC, LTV, pricing strategy, GTM plan, investor narrative — which suggests the prior version *did* include these and they've already been half-stripped. v1.2 finishes that work.
- Rationale: "The user is the domain expert. You bring structured thinking, facilitation, and the ability to synthesize large volumes of input into a clear, implementable picture" — heavy on facilitation cues (pauses, "anything else?", option menus) more suited to a PM conversation than a coding-agent spec.

### Table Stakes (What the Refactored PRD/Brief Must Have)

| Feature | Why Expected | Complexity | Notes |
|---|---|---|---|
| **Structured sections with stable headers** (Problem, Users, Features, Acceptance Criteria, Out of Scope, Tech Stack, Open Questions) | AGENTS.md-style specs are chunked by section; MCP and skill loaders pull `## Acceptance Criteria` directly. Predictable headers = clean retrieval. Consensus across chatprd.ai, ideaplan SCOPE method, Addy Osmani's "good spec" essay. | MEDIUM | Already mostly present in templates — formalize and name-check them. |
| **Machine-verifiable acceptance criteria** (given/when/then or behavioral assertion format) | Coding agents need testable assertions, not "users should feel X." ideaplan.io SCOPE method and O'Reilly "good spec" essay both make this load-bearing. | MEDIUM | Replace qualitative language ("intuitive", "clean") with assertions ("clicking Publish POSTs `/api/articles` with body `{title, content}`; returns 201; redirects to `/articles/:id`"). |
| **Explicit boundary constraints** ("always", "never", "ask first") | AI agents over-reach without them. Builder.io AGENTS.md guide and cursor rules docs emphasize boundary language. | LOW | Replace "consider" / "might want to" with imperative forms. |
| **Out-of-scope section with reasoning** | Prevents scope creep and side-quests during agent execution. PROJECT.md already models this — promote it to PRD. | LOW | Copy the "Out of Scope" pattern from gomad's own PROJECT.md template. |
| **Drop time-window estimation** ("MVP in 4 weeks", "Q2 launch") | Coding agents have no concept of calendar time; estimates are hallucination vectors. Human PMs need them for planning; agents do not. PROJECT.md explicitly lists time windows in the removal set. | LOW | Sweep any `{timeline}` / `{launch_date}` variables from templates. |
| **Drop "why now?" market-timing challenge** | Market-timing is a human VC / founder frame. Irrelevant to an agent building the feature. | LOW | Remove from `gm-product-brief` prompts and steps. |
| **Drop business/operational metrics** (ARR, CAC, LTV, conversion, retention targets) | Already partially out-of-scope; finish the job. Not dev-ready signal. | LOW | Remove placeholders and prompts asking for these. |
| **Amplify aggressive vision + MVP scope statements** | The remaining "vision" should be sharp, opinionated, concrete — not a hedged elevator pitch. MVP scope should be a bulleted boundary list, not prose. | MEDIUM | Rewrite the Vision section prompt to force a 1-2 sentence declarative statement + 3-7 bulleted MVP items. |
| **Dev-ready requirement statements** — each requirement has: id, summary, behavior, data, UI (if any), errors, non-goals | Standard spec shape for coding agents (Addy Osmani "good spec"; chatprd PRD-for-Claude-Code guide; johnnychauvet/prd-skill uses JTBD + component specs + acceptance criteria). | HIGH | Biggest structural change. Template update + step-file rewrites in `gm-create-prd/steps-c/`. |
| **Explicit tech-stack section** or reference to `project-context.md` | AGENTS.md/CLAUDE.md standard pattern: agents need to know language, framework, versions before writing code. | LOW | Either a section in PRD or a requirement that PRD links to an existing `project-context.md` produced by `gm-generate-project-context`. |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---|---|---|---|
| Each requirement carries a stable REQ-ID (e.g. `REQ-AUTH-001`) | Enables cross-referencing from stories, PRs, test files. Already used in gomad's own PROJECT.md ("CUSTOM-01", "CMD", "REF", "INSTALL", "PRD"). Consistent with our own patterns. | LOW | Introduce ID scheme and require it in templates. |
| Dual-mode output: human-readable PRD + LLM-distilled token-efficient version | gm-product-brief already mentions a "token-efficient LLM distillate" as optional output. Formalize this — human PRD for review, LLM-PRD for consumption by `gm-create-epics-and-stories`. | MEDIUM | Pipe the distillate through `gm-distillator` (already exists in core-skills). |
| "Open Questions" section explicitly calling out decisions deferred to implementation | Agents need permission to make or escalate judgment calls. Current brief workflow has "capture-don't-interrupt" patterns — those notes should land here rather than being dropped. | LOW | New required section. |
| Front-matter block with machine-readable metadata (schema_version, status, updated_at, upstream_docs) | Enables programmatic validation (PRD lint) and tool integrations. Matches `skill-manifest.yaml` pattern already in gomad. | LOW | Template change. |

### Anti-Features

| Feature | Why Requested | Why Problematic | Alternative |
|---|---|---|---|
| Keeping "time-to-market" / "launch timeline" sections | "PMs still ask." | Agents can't estimate wall-clock time; prompting them to produces confidently wrong numbers. v1.2's whole point is refocusing the artifact on coding-agent consumers. | If a human needs a timeline, they add it on top of the PRD out-of-band. The artifact itself stays dev-focused. |
| Keeping "personas" section with demographic/psychographic detail | "Traditional PRD has it." | Agents implement behavior, not empathy. A persona ("Sarah, 34, marketing manager who values X") doesn't translate into code. | One-line "target users" identifying roles and capabilities (e.g., "authenticated admins with `billing.write` scope"). |
| Keeping option-menu facilitation in every question (as gm-product-brief does today) | "Lower cognitive load." | The artifact output is for an agent, not an interactive PM session. Heavy facilitation structure makes the skill run long and interleaves brainstorming with spec-writing. | Keep soft guidance but drop the mandatory "2-4 concrete recommended options" rule as a load-bearing pattern. Use it where it clarifies; skip it where it stalls. |
| Generating business-case appendices (market size, competitor landscape, pricing tiers) | "Comprehensive." | v1.2 explicitly removes these. Competitor analysis belongs in `gm-market-research` (separate skill); if a user wants it, they run that skill and link its output. | Cross-link, don't embed. |
| "What could go wrong?" risk matrices in PRD | "Risk hygiene." | Risk analysis belongs in architecture/solutioning phase (`gm-create-architecture`, `gm-check-implementation-readiness`), not requirements. | Link to the relevant phase's artifact; PRD stays "what to build," not "how it could fail." |
| Mandatory user-research summaries (interview quotes, survey data) | "Evidence-based PRDs." | Irrelevant for v1.2's intended consumer (coding agents). Also — gomad doesn't conduct user research; this would be a fabrication vector. | Drop entirely. Evidence claims go in `gm-market-research` output. |
| Making `gm-create-prd` automatically run `gm-market-research` and `gm-domain-research` first | "Convenience." | Forces every PRD through heavy research workflows even when the user already has context. Also doubles token cost. | Keep `gm-create-prd` focused on PRD; suggest those skills in the "If you need market context first, run X" pointer. |

### Real-World Precedent

- **AGENTS.md standard** (OpenAI / Google / Sourcegraph / Cursor / Factory, 2026) — project-root + subdirectory overrides, structured sections, build/test commands + tech stack + project structure are the highest-value content.
- **Addy Osmani "good spec for AI agents"** — explicit behaviors, concrete examples, testable outcomes, boundary constraints.
- **ideaplan SCOPE method** — Structured, Constrained, Observable, Precise, Explicit.
- **johnnychauvet/prd-skill** (Claude Code `/prd` command) — JTBD framework + user stories + component specs + acceptance criteria. Good shape reference.
- **chatprd.ai PRD-for-Claude-Code guide (2026)** — machine-verifiable acceptance criteria, clearly labeled sections for MCP retrieval, pair with CLAUDE.md for coding style.
- **BMAD v6.3.0** (upstream, April 2026) — already killed the spec-wip singleton in favor of parallel Stories and added Amazon PRFAQ + Epic context compilation. Upstream is moving the same direction gomad is.

---

## Cross-Feature Dependencies

```
Feature 2 (reference sweep)
    └──requires──> Feature 1 (commands exist as /gm:agent-*)
                       └──requires──> design decision: command dir layout

Feature 3 (files-manifest + cleanup)
    └──requires──> Feature 1 (to know new paths being written)
    └──requires──> current Installer + ManifestGenerator hooks

Feature 4 (PRD/brief refactor)
    └──is independent──> can ship in parallel with 1-3

Feature 1 conflicts with keeping gm-agent-* as standalone skills
    └──resolution──> hard cut in v1.2 (no dual surface)
```

### Dependency Notes

- **Feature 2 requires Feature 1**: you can't sweep references to a command form that doesn't yet exist. Implement launchers first, then update references pointing to them.
- **Feature 3 requires Feature 1**: the files-manifest must include the new command paths (`.claude/commands/gm/agent-*.md`). Fold manifest wiring into the same diff that adds command generation.
- **Feature 4 is independent**: PRD/brief refactor doesn't touch the installer or command surface; it's a content change in `src/gomad-skills/1-analysis/gm-product-brief/` and `src/gomad-skills/2-plan-workflows/gm-create-prd/`. Can ship in parallel or first.
- **Upgrade cleanup must understand the renames**: v1.1 → v1.2 upgrade is the *first* time the manifest-based cleanup runs on an install that has no prior manifest. Fallback plan: for v1.2, scan for known v1.1 artifact paths (`.claude/skills/gm-agent-*/`) and clean them explicitly as a one-time migration, even without prior manifest. After v1.2 the manifest covers all future upgrades.

---

## MVP Definition

### Launch With (v1.2)

All four features are in-scope for v1.2 per PROJECT.md. No "ship subset" path.

- [ ] **Feature 1 — Agent-as-command**: 7 launcher files under `.claude/commands/gm/agent-*.md`, wired through `AgentCommandGenerator`, description = "Mary — Strategic Business Analyst" style. Persona body remains in `_gomad/gomad/agents/...`.
- [ ] **Feature 2 — Reference sweep**: every `gm-agent-*` string in source, docs, tests, manifests updated to `gm:agent-*` (command) or retained as `gm-agent-*` (skill file path) per the distinction above.
- [ ] **Feature 3 — Copy-only installer + files-manifest.csv + upgrade cleanup**: symlink code paths removed; `files-manifest.csv` written on every install; re-install diffs against prior manifest and deletes orphan paths; one-time v1.1 artifact cleanup as fallback.
- [ ] **Feature 4 — PRD/brief refactor**: `gm-create-prd` and `gm-product-brief` templates + steps updated to drop time windows / why-now / biz-metrics and amplify vision / MVP scope / dev-ready acceptance criteria.

### Add After Validation (v1.3+)

- [ ] `gomad install --dry-run` mode (defer unless feedback surfaces need during v1.2).
- [ ] Manifest `schema_version` field + migration-on-read logic (only needed once schema changes).
- [ ] LLM-distilled PRD output piped through `gm-distillator` as a second artifact (differentiator).

### Future Consideration (v2+)

- [ ] Runtime deprecation warnings for any residual `gm-agent-*` references.
- [ ] PRD lint tool (validate REQ-IDs, section headers, acceptance-criteria format).
- [ ] Per-requirement status tracking (pending / in-progress / done) as metadata in PRD front-matter.

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---|---|---|---|
| Feature 1 — Agent as slash command | HIGH (invocation UX is the main user touch point) | LOW (existing template + generator; rename paths) | P1 |
| Feature 2 — Reference sweep | MEDIUM (prevents confusion; required for consistency) | LOW (grep + Edit, ~20 files) | P1 |
| Feature 3a — Copy-only mode | HIGH (portability; surviving git clone is table stakes for shared projects) | LOW (remove symlink code paths; verify) | P1 |
| Feature 3b — files-manifest.csv + upgrade cleanup | HIGH (unblocks safe re-install; required to handle v1.1→v1.2 rename churn) | MEDIUM (schema + diff logic + v1.1 one-time fallback) | P1 |
| Feature 3c — dry-run flag | MEDIUM | MEDIUM (plumbs through installer) | P2 (defer) |
| Feature 4 — PRD/brief refactor (drop biz framing) | HIGH (PRD is the on-ramp to every downstream workflow; bad PRD = bad code) | MEDIUM (template + step-file rewrites; content work, not mechanical) | P1 |
| Feature 4 extension — LLM-distilled PRD output | MEDIUM | LOW (pipe through gm-distillator) | P2 |

**Priority key:**
- P1: Must have for v1.2 launch (matches PROJECT.md Active requirements).
- P2: Should have, add when possible or in v1.3.
- P3: Nice to have, future consideration.

---

## Dependencies on Existing GoMad Artifacts

| Touched / Leveraged | Path | Change Type |
|---|---|---|
| Agent command template | `tools/installer/ide/templates/agent-command-template.md` | Minimal change — already matches target shape. Verify `{{module}}` / `{{path}}` template variables resolve under new layout. |
| Agent command generator | `tools/installer/ide/shared/agent-command-generator.js` | Modify `collectAgentArtifacts` / `writeAgentLaunchers` to emit `gm/agent-<name>.md` layout instead of `gomad/agents/<name>.md`. |
| Platform codes YAML | `tools/installer/ide/platform-codes.yaml` | `claude-code.installer.target_dir` is `.claude/skills`; may need additional `target_commands_dir: .claude/commands` or similar for slash commands. Inspect IDE handlers. |
| Installer main flow | `tools/installer/core/installer.js` | Extend `installedFiles` Set → write CSV manifest; add `_cleanupPriorInstall` method before install writes. |
| Manifest generator | `tools/installer/core/manifest-generator.js` | Add `generateFilesManifestCsv` alongside existing yaml/json manifests. |
| Skill manifests (agent files) | `src/gomad-skills/**/gm-agent-*/skill-manifest.yaml` | Retain name `gm-agent-*` (filesystem safety). `displayName` + `title` surface in command description. |
| Agent SKILL.md files | `src/gomad-skills/**/gm-agent-*/SKILL.md` | Content stays; cross-references updated by Feature 2 sweep. |
| PRD skill | `src/gomad-skills/2-plan-workflows/gm-create-prd/{SKILL.md,workflow.md,steps-c/,templates/}` | Major rewrite of template + step-files. |
| Product-brief skill | `src/gomad-skills/1-analysis/gm-product-brief/{SKILL.md,prompts/,resources/}` | Rewrite SKILL.md scope section + prompts to strip biz framing. |
| Module help catalog | `src/gomad-skills/module-help.csv`, `src/core-skills/module-help.csv` | Entries updated by Feature 2 sweep. |
| Installer messages | `tools/installer/install-messages.yaml` | Next-steps / completion messages reference `/gm:agent-*` command form. |
| README / docs | `README.md`, `README_CN.md`, `docs/`, `website/` | Invocation examples updated to `/gm:agent-*`. |
| E2E tarball test | `tests/` | Verify presence of `.claude/commands/gm/agent-*.md` files and `_gomad/_config/files-manifest.csv` in installed output. |

---

## Sources

### Claude Code slash commands
- [Slash commands — Claude Code Docs](https://code.claude.com/docs/en/slash-commands) — authoritative on `.claude/commands/` layout, subdirectory namespacing via colon, frontmatter fields (`description`, `argument-hint`, `allowed-tools`, `model`, `disable-model-invocation`), `$ARGUMENTS`, `!` bash prefix, `@` file refs
- [Writing Slash Commands — Claude Skills](https://claude-plugins.dev/skills/@CaptainCrouton89/.claude/slash-commands-guide)
- [Your complete guide to slash commands Claude Code — eesel AI](https://www.eesel.ai/blog/slash-commands-claude-code)
- [How to Create Custom Slash Commands in Claude Code — BioErrorLog Tech Blog](https://en.bioerrorlog.work/entry/claude-code-custom-slash-command)
- [wshobson/commands](https://github.com/wshobson/commands) — production command pack using namespace layout
- [qdhenry/Claude-Command-Suite](https://github.com/qdhenry/Claude-Command-Suite) — professional namespaced commands
- [bmad-code-org/BMAD-METHOD issue #773](https://github.com/bmad-code-org/BMAD-METHOD/issues/773) — nested-directory discovery pitfall

### BMAD migration / upstream patterns
- [BMAD Method — Welcome](http://docs.bmad-method.org/)
- [BMAD v6.3.0 changelog (April 2026)](https://www.vibesparking.com/en/blog/ai/bmad/2026-04-11-bmad-v630-changelog/)
- [aj-geddes/claude-code-bmad-skills](https://github.com/aj-geddes/claude-code-bmad-skills)
- [PabloLION/bmad-plugin](https://github.com/PabloLION/bmad-plugin)
- [24601/BMAD-AT-CLAUDE](https://github.com/24601/BMAD-AT-CLAUDE)

### Installer patterns / copy vs symlink / manifest tracking
- [npm/cli issue #4031 — local paths create symlinks instead of copying](https://github.com/npm/cli/issues/4031)
- [npm/npm issue #12515 — NPM and using symlinks instead of full copy](https://github.com/npm/npm/issues/12515)
- [npm/npm issue #13050 — npm install doesn't include symlinks in a git repository](https://github.com/npm/npm/issues/13050)
- [symlink-or-copy npm package](https://www.npmjs.com/package/symlink-or-copy) — documents when symlinks work vs when they silently break
- [CMake Recipe #5: Adding an uninstall target using install_manifest.txt](https://www.linux.com/training-tutorials/cmake-recipe-5-adding-uninstall-target-your-project/)
- [ML4W Dotfiles Uninstaller Wiki](https://github.com/mylinuxforwork/dotfiles/wiki/Uninstall)
- [astral-sh/uv issue #14194 — Add --dry-run to uv tool install/uninstall](https://github.com/astral-sh/uv/issues/14194)
- [CLI Tools That Support Previews, Dry Runs or Non-Destructive Actions — Nick Janetakis](https://nickjanetakis.com/blog/cli-tools-that-support-previews-dry-runs-or-non-destructive-actions)
- [dotnet-core-uninstall dry-run command](https://learn.microsoft.com/en-us/dotnet/core/additional-tools/uninstall-tool-cli-dry-run)
- [Next.js CLI: create-next-app](https://nextjs.org/docs/app/api-reference/cli/create-next-app) — `--reset-preferences`, `--skip-install`, `--yes` conventions

### PRD for AI coding agents / AGENTS.md standard
- [AGENTS.md Standard — Builder.io](https://www.builder.io/blog/agents-md)
- [Best Practices for Using PRDs with Claude Code in 2026 — ChatPRD](https://www.chatprd.ai/learn/PRD-for-Claude-Code)
- [Best Practices for Using PRDs with Cursor in 2026 — ChatPRD](https://www.chatprd.ai/learn/PRD-for-Cursor)
- [Writing PRDs for AI Code Generation Tools in 2026 — ChatPRD](https://www.chatprd.ai/learn/prd-for-ai-codegen)
- [How to Write a Good Spec for AI Agents — O'Reilly Radar](https://www.oreilly.com/radar/how-to-write-a-good-spec-for-ai-agents/)
- [AddyOsmani — How to write a good spec for AI agents](https://addyosmani.com/blog/good-spec/)
- [Write Specs for AI Coding Agents: The SCOPE Method — ideaplan](https://www.ideaplan.io/blog/how-to-write-specs-for-ai-coding-agents)
- [johnnychauvet/prd-skill](https://github.com/johnnychauvet/prd-skill) — Claude Code `/prd` command generating AI-prototyping-ready PRDs
- [.cursorrules vs CLAUDE.md vs AGENTS.md (2026) — The Prompt Shelf](https://thepromptshelf.dev/blog/cursorrules-vs-claude-md/)
- [How to Configure Every AI Coding Assistant — DeployHQ](https://www.deployhq.com/blog/ai-coding-config-files-guide)
- [How to write PRDs for AI Coding Agents — David Haberlah, Medium](https://medium.com/@haberlah/how-to-write-prds-for-ai-coding-agents-d60d72efb797)

---
*Feature research for: gomad v1.2 — agent-as-command, copy-only installer + file manifest, coding-agent PRD*
*Researched: 2026-04-18*
