# Project Research Summary

**Project:** `@xgent-ai/gomad` v1.2 — Agent-as-Command & Coding-Agent PRD Refinement
**Domain:** CLI tooling for AI-assisted development (fork of BMAD Method)
**Researched:** 2026-04-18
**Confidence:** HIGH

## Executive Summary

v1.2 is a focused internal refactor with **zero new runtime dependencies**. The milestone reshapes the user-visible agent-invocation surface (skill → slash command), hardens the installer for portable git-clone workflows, and refocuses two planning artifacts (`gm-create-prd`, `gm-product-brief`) on coding-agent consumers.

The recommended approach is **generate-don't-move** for the 7 agent personas (produce `.claude/commands/gm/agent-*.md` launcher files at install time from the existing `gm-agent-*/` skill metadata — do not physically relocate the skill directories, which would break the 23 non-Claude-Code IDEs the installer already supports). The installer gains a pre-install cleanup pass driven by the existing `files-manifest.csv` writer, which is the right primitive already sitting dead-code-ready in `tools/installer/core/manifest-generator.js`.

**Top three risks, all addressable in-phase:** (1) Claude Code's subdirectory-namespace colon convention (`/gm:agent-*`) works in current docs but has historical flakiness (issue #2422 closed-not-planned, #44678 open 11 days ago) — needs an early validation step and a flat-name fallback strategy. (2) Manifest-driven deletion on upgrade is the single highest-severity correctness risk — requires realpath containment, schema versioning, and a safe CSV parser. (3) PRD content surgery cannot be purely isolated to `gm-create-prd` + `gm-product-brief` — four downstream skills (`gm-validate-prd`, `gm-create-architecture`, `gm-create-epics-and-stories`, `gm-check-implementation-readiness`) consume PRD structure and need lockstep updates or the `CP → VP → CA → CE → IR` pipeline breaks.

## Key Findings

### Recommended Stack

**Zero new runtime dependencies.** Every v1.2 capability is already in `package.json`: `csv-parse@^6.1.0` (manifest parsing), `fs-extra@^11.3.0` (copy/remove with symlink dereferencing), `yaml@^2.7.0` (skill-manifest read), `@clack/prompts@^1.0.0` (installer UX), `picocolors`, `commander`, `glob`, `semver`. The milestone adds authoring work, not dependency surface.

**Correction to log in PROJECT.md:** line 78 claims `type: module`, but `package.json` has no such field and `gomad-cli.js` uses `require()`. The installer is **CommonJS**. This does not block v1.2 but should be fixed in the phase that touches PROJECT.md.

**Claude Code slash-command format** (verified against official 2026 docs + in-repo precedent at `.claude/commands/gsd/new-milestone.md`):
- File path `.claude/commands/gm/agent-pm.md` is invoked as `/gm:agent-pm` (subdirectory → colon namespace)
- Frontmatter supports `name`, `description`, `argument-hint`, `disable-model-invocation`, `user-invocable`, `allowed-tools`, `model`, `effort`, `context`, `agent`, `hooks`, `paths`, `shell`, `when_to_use`
- Recommended for persona agents: `disable-model-invocation: true` to keep LLM from auto-selecting them
- The `name:` frontmatter — not directory nesting — is what makes `/gm:agent-*` resolve

**Do NOT upgrade `chalk`** — pinned at `^4.1.2` because the installer is CommonJS. Chalk 5+ is ESM-only.

### Expected Features

**Must have (table stakes):**
- Installer produces `.claude/commands/gm/agent-*.md` launchers for all 7 personas — generated from existing `gm-agent-*/` skill metadata, not moved
- Copy-only install behavior (symlink mode removed) so installed output survives `git clone` to another workspace
- `_gomad/_config/files-manifest.csv` tracks every path the installer wrote; on re-install, the prior manifest drives cleanup before the new install writes anything
- All `gm-agent-*` user-visible references updated to `gm:agent-*` command form across source / docs / tests / manifests (filesystem directory names keep the dash — colons aren't Windows-safe)
- `gm-create-prd` and `gm-product-brief` drop human-founder framing (time windows, "why now?", business/operational metrics), amplify aggressive vision + MVP scope, and sharpen dev-ready acceptance criteria

**Should have (competitive):**
- One-time v1.1→v1.2 legacy cleanup: first v1.2 install on a v1.1 workspace has no prior manifest, so the installer must know the legacy v1.1 artifact paths (`.claude/skills/gm-agent-*/`) to clean explicitly
- `_gomad/_backups/<timestamp>/` safety net for at least the first couple v1.2 releases, so destructive cleanup is reversible
- Dry-run / diff preview flag on the installer so users can see what will be removed before consenting
- Broken-symlink handling (`fs.lstat` + unlink) at the copy destination so v1.1 symlinked installs don't pollute the source tree on upgrade

**Defer (beyond v1.2):**
- Task skills (`gm-create-prd`, `gm-create-architecture`, etc.) becoming `/gm:*` slash aliases — v1.2 stays narrow
- New gomad-specific agents (CUSTOM-01 from the deferred list)
- Backups rotation / pruning policy (first-pass backups can simply stay on disk; clean up later if they become a problem)

### Architecture Approach

The 7 agent personas remain physical `gm-agent-*/` skill directories (source of truth). At install time, the installer generates small `.claude/commands/gm/agent-*.md` launcher files from each skill's `skill-manifest.yaml` metadata. The existing dead-code generator `tools/installer/ide/shared/agent-command-generator.js` + `templates/agent-command-template.md` is retargeted for this purpose — it was the old compiled-agent launcher generator and already has the right shape.

**Major components:**
1. **Stub-generator (revived)** — `agent-command-generator.js` produces `.claude/commands/gm/agent-*.md` files from `gm-agent-*/skill-manifest.yaml`
2. **Installer copy path** — `_config-driven.js:171` single-line change from `fs.ensureSymlink` to `fs.copy`; every written path pushed into the existing `this.installedFiles` Set
3. **Files-manifest v2** — extend existing CSV schema (`type,name,module,path,hash`) to cover paths outside `_gomad/` (i.e., project-root-relative for IDE-target files like `.claude/commands/` and `.claude/skills/`); add `schema_version` field for forward-compat
4. **Pre-install cleanup (`_cleanStaleInstalledFiles`)** — reads prior manifest, realpath-contains each entry under the expected install roots, `fs.remove`s safely; runs between backup and install
5. **Reference sweep** — bounded grep-driven migration across 21 files, 54 occurrences; **not** a global sed because `manifest-generator.js:parseSkillMd` validates `skillMeta.name === dirName`
6. **PRD step-file surgery** — `gm-create-prd/steps-c/` has 12 step files; primary targets are step-02b ("Why now?"), step-02c (exec summary), step-03 (business metrics), step-10 (nonfunctional). Full read-through required for the other 8.
7. **Brief light-pass** — `gm-product-brief` already has correct scope discipline; mostly tightening the template voice.

### Critical Pitfalls

1. **Subdirectory slash-command namespacing history is rocky** — issue #2422 closed "not planned", issue #44678 opened 11 days ago re-requesting. Docs describe it as working, but failures are silent (no autocomplete, no error). Prevention: early validation phase that `/gm:agent-pm` actually resolves on today's Claude Code version; keep a flat-name (`/gm-agent-pm`) fallback in reserve.

2. **Manifest-driven deletion is the single highest-severity risk** — current CSV code hand-rolls parsing, has no realpath containment before `fs.remove`, no schema version. An absolute path, `../`, quoted-field-with-embedded-newlines, or BOM in a manifest can silently destroy user files. Prevention: use `csv-parse` (already a dep), realpath-contain every entry under `.claude/` or `_gomad/` install roots, reject any path that escapes, schema_version field + dual-format sniff for v1.1→v1.2 upgrade.

3. **Symlink→copy transition needs explicit `lstat` + unlink** — `fs.copy` follows symlinks by default, so v1.1 symlinked installs can pollute the source tree on upgrade. Prevention: before copy, `fs.lstat` the target; if it's a symlink, unlink before writing.

4. **PRD content surgery is a pipeline change, not a content change** — four downstream skills consume PRD structure (`gm-validate-prd`, `gm-create-architecture`, `gm-create-epics-and-stories`, `gm-check-implementation-readiness`). The stated v1.2 scope lists only `gm-create-prd` + `gm-product-brief`. Prevention: either add downstream-skill updates to the v1.2 roadmap, or add an explicit scope-discipline decision that the downstream skills consume a superset of what the new PRD produces (i.e., the refinement is additive/stripping, not structural).

5. **Launcher-vs-self-contained architecture decision must be made upfront** — is a slash command a *launcher* that loads the persona from `_gomad/` at runtime, or is it *self-contained* with the persona inline? This choice ripples through stub size, install portability, and how the reference sweep treats `_gomad/gomad/agents/*.md`. The existing dead-code template is launcher-shaped; recommend launcher unless a specific reason emerges during planning.

6. **Coding-agent PRD density floor** — "aggressive MVP scope amplification" can drift into under-specification. Prevention: integration test that runs `gm-validate-prd` against a refactored PRD and confirms it still passes. Keep `gm-create-epics-and-stories` happy.

7. **Breaking change under a minor bump (v1.2 vs v2.0)** — user chose minor deliberately given GoMad's pre-traction user base, but CHANGELOG needs a BREAKING callout and deprecation guidance for any v1.1-installed users. Prevention: explicit BREAKING section in release notes; tarball verification extended to assert `.claude/commands/gm/` present and `.claude/skills/gm-agent-*` absent.

Other noted pitfalls (see PITFALLS.md for full 20): orphaned references in docs/tests after rename; binary/permission-bit loss during copy; partial-install inconsistency between backup + manifest; manifest drift from hand-edited files; stale manifest pointing to a different target dir; CSV quoting/BOM edge cases; accidental destruction of user files on corrupt manifest; mixing human and coding-agent guidance in the same doc.

## Implications for Roadmap

Based on research, suggested phase structure continues from v1.1's Phase 4, starting at **Phase 5**:

### Phase 5: Foundations & Command-Surface Validation
**Rationale:** De-risk the load-bearing assumptions before building anything substantive. Verify `/gm:agent-*` subdirectory namespacing works on today's Claude Code; make the launcher-vs-self-contained architecture decision; log the `type: module` PROJECT.md correction.
**Delivers:** Documented architecture decision, verification harness for slash-command resolution, updated PROJECT.md, `.gitignore` rules for install outputs that shouldn't land in the dev repo.
**Addresses:** Architecture decision gap (FEATURES.md F0), PROJECT.md correction (STACK.md finding).
**Avoids:** Pitfalls #1, #5.

### Phase 6: Installer Mechanics — Copy + Manifest v2 + Stub Generation
**Rationale:** These three installer-internal changes are tightly coupled and should ship as one coherent unit. Copy-only unblocks stub generation (stubs are copied, not symlinked); manifest v2 schema must be in place before cleanup has anything to read.
**Delivers:** `fs.ensureSymlink` → `fs.copy` swap, extended `files-manifest.csv` schema with `schema_version`, revived `agent-command-generator.js` producing `.claude/commands/gm/agent-*.md` launchers for all 7 personas.
**Uses:** Existing `fs-extra`, `csv-parse`, `yaml`, `@clack/prompts` (no new deps).
**Implements:** Components 1-3 from Architecture Approach.
**Avoids:** Pitfall #3 (explicit `lstat` + unlink at copy destination).

### Phase 7: Upgrade Safety — Manifest-Driven Cleanup
**Rationale:** Gated on Phase 6 (nothing to read until manifest v2 exists). Highest-risk phase in the milestone; deserves a dedicated safety-subsection in its plan.
**Delivers:** `_cleanStaleInstalledFiles` method, realpath containment checks, dual-format sniff for v1.1→v1.2 legacy paths, optional `_gomad/_backups/<timestamp>/` safety net, dry-run flag, safe CSV parsing via `csv-parse`.
**Implements:** Component 4.
**Avoids:** Pitfall #2 (the highest-severity risk in the entire milestone).

### Phase 8: PRD + Product-Brief Content Refinement
**Rationale:** Parallelizable with Phases 5-7 since it touches content, not installer code. One dependency: if downstream-skill updates are needed (Pitfall #4), those belong here too.
**Delivers:** `gm-create-prd/steps-c/` surgery (step-02b, 02c, 03, 10 primary; full read-through of 01, 01b, 04-09, 11, 12 to catch other human-founder framing); `gm-product-brief` light pass; integration test that `gm-validate-prd` still passes on the refactored PRD; decision logged on whether downstream-skills (`gm-create-architecture`, `gm-create-epics-and-stories`, `gm-check-implementation-readiness`) need lockstep updates.
**Implements:** Components 6-7.
**Avoids:** Pitfalls #4, #6.

### Phase 9: Reference Sweep + Verification + Release
**Rationale:** Sweep must be last — all final strings must be settled before migrating references. Verification confirms the breaking-change release is clean.
**Delivers:** 54 occurrences across 21 files migrated `gm-agent-*` → `gm:agent-*` (by category: must-rename, must-keep-filesystem, generated-output, judgment-call-docs); extended tarball verification asserting `.claude/commands/gm/` present and legacy paths absent; CHANGELOG with BREAKING callout; deprecation/upgrade guidance; npm publish as `@xgent-ai/gomad@1.2.0`; v1.2.0 tag.
**Implements:** Component 5 + release mechanics.
**Avoids:** Pitfall #7.

### Phase Ordering Rationale

- **Phase 5 first** — architecture decisions and command-surface validation de-risk every subsequent phase; cheapest to redirect if the namespace convention doesn't hold.
- **Phase 6 before Phase 7** — cleanup has nothing to read until manifest v2 exists. Three installer changes are tightly coupled.
- **Phase 7 isolated** — highest-risk phase deserves its own plan, not bundled with Phase 6.
- **Phase 8 parallelizable** — content work doesn't touch installer internals; can run on a separate worker.
- **Phase 9 last** — sweep + release gates on everything else being stable.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 7 (upgrade safety):** CSV safety patterns, realpath containment, backup rotation — implementation research justified given destructive-delete severity.
- **Phase 8 (PRD refinement):** full read-through of the other 8 `gm-create-prd/steps-c/` files during plan-phase to scope the surgery precisely; decision on downstream-skill updates.

Phases with standard patterns (can skip plan-phase research):
- **Phase 5:** architecture decisions + config tweaks, nothing novel.
- **Phase 6:** mechanical swaps, metadata-driven generation, existing dep surface.
- **Phase 9:** sweep is grep-driven + bounded; release mechanics follow the v1.1 playbook.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Every dep claim verified against `package.json` + live `npm view` 2026-04-18 |
| Features | HIGH | Three independent BMAD ports + Anthropic docs + five comparable installers agree on the shape |
| Architecture | HIGH | Integration points identified at file:line precision; in-repo precedent (`.claude/commands/gsd/`) confirms the generate-don't-move pattern |
| Pitfalls | HIGH | 20 pitfalls cross-referenced against real Claude Code issues, CSV spec edge cases, and v1.1 shipping artifacts |

**Overall confidence:** HIGH

### Gaps to Address

- **Subdirectory namespace validation** — `/gm:agent-*` docs say it works, history is rocky. Plan Phase 5 to include a 1-minute verify step on live Claude Code. If it fails, fall back to flat `/gm-agent-*` (no user-visible impact beyond naming).
- **Launcher vs self-contained decision** — recommendation is launcher (load persona from `_gomad/` at runtime), but not final. Plan Phase 5 to log this decision.
- **Downstream PRD-consumer updates** — recommend Phase 8 includes explicit decision: either (a) downstream skills updated in lockstep, or (b) PRD refinement is strictly additive/stripping so downstream skills remain compatible. Needs commitment before writing phase plan.
- **v1.1→v1.2 legacy cleanup paths** — concrete list of paths the first v1.2 install must clean on a v1.1 workspace (absent prior manifest) — assemble during Phase 7 plan.
- **PRD step-file full coverage** — read-through of `gm-create-prd/steps-c/` steps 01, 01b, 04-09, 11, 12 during Phase 8 plan to confirm the scope of human-founder framing.

## Sources

### Primary (HIGH confidence)
- Claude Code Slash Commands & Skills (official 2026 docs) — `code.claude.com/docs/en/slash-commands`, `code.claude.com/docs/en/skills`
- In-repo prior art: `.claude/commands/gsd/new-milestone.md` — confirms `name:` frontmatter + subdirectory = `/gsd:new-milestone` resolution
- `package.json` + live `npm view` (2026-04-18) — dependency versions verified
- `tools/installer/core/manifest-generator.js:587-647` — existing `files-manifest.csv` writer with schema
- `tools/installer/ide/_config-driven.js:171` — single `fs.ensureSymlink` call to swap
- `tools/installer/ide/shared/agent-command-generator.js` + `templates/agent-command-template.md` — revivable dead code

### Secondary (MEDIUM confidence)
- Upstream BMAD ports (aj-geddes, PabloLION, 24601/BMAD-AT-CLAUDE) — subdirectory namespacing in practice
- Community skill packs (wshobson, qdhenry) — slash-command layout precedent
- 2026 AGENTS.md / CLAUDE.md / SCOPE-method writing — coding-agent PRD consensus
- CMake install_manifest.txt, pip RECORD, dpkg .list, Homebrew INSTALL_RECEIPT.json, ML4W dotfiles — manifest-driven cleanup patterns

### Tertiary (LOW confidence)
- GitHub Issue [#2422](https://github.com/anthropics/claude-code/issues/2422) (closed not-planned) + [#44678](https://github.com/anthropics/claude-code/issues/44678) (open 11 days ago) — subdirectory namespace validation needed on current Claude Code

---
*Research completed: 2026-04-18*
*Ready for roadmap: yes*
