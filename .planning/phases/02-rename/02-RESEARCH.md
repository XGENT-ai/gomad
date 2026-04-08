# Phase 2: Rename - Research

**Researched:** 2026-04-08
**Domain:** Large-scale repo rename / refactor (file paths + content sweep + manifest schema migration)
**Confidence:** HIGH

## Summary

Phase 2 is a mechanical rename with two coupled axes: filesystem moves (~41 skill dirs, top-level `bmm-skills/` dir, CLI binary, artifacts file, 8 manifest files) and case-preserving content substitution across all source/config/test/docs trees. The CONTEXT.md from `/gsd-discuss-phase` already locks 18 decisions (D-01 through D-18) covering plan decomposition, git mechanics, content-sweep tooling, manifest schema migration, CLI handoff, fixtures, scope boundaries, and verification. Research confirms all decisions are technically sound and the inventory matches reality on disk.

The dominant risk is **broken installer state mid-rename**: filename renames (`bmad-skill-manifest.yaml` → `skill-manifest.yaml`, `bmad-cli.js` → `gomad-cli.js`) MUST be coupled atomically with the consumer code that globs/imports those names. CONTEXT.md D-09 and D-11 already mandate this. Secondary risks: macOS case-insensitive filesystem (not an issue here — these are case-distinct renames, not case-only), `bmm` trigram false positives (D-05 mandates whole-word/identifier-segment anchoring), and `git mv` rename detection threshold across the 41 skill dirs (D-04 mandates subtree chunking).

**Primary recommendation:** Execute exactly as CONTEXT.md prescribes — three plans (02-01 FS+CLI, 02-02 content sweep, 02-03 fixtures+validation), each with rename-only commits separated from reference-update commits. The plan agent should focus on commit boundaries and per-plan smoke checks; no decisions remain to make at the architectural level.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Plan decomposition (FS-01..05, TXT-01..04)**
- **D-01:** Three plans, layered by responsibility:
  - **02-01-PLAN:** FS renames + atomic CLI handoff (FS-01..05). Also completes Phase 1 D-08/D-09 staged handoff by atomically updating `package.json` `bin` and `main` paths in the same commit as the CLI file rename.
  - **02-02-PLAN:** Content sweep (TXT-01..03).
  - **02-03-PLAN:** Test fixtures + validation (TXT-04). Re-runs `validate:refs`, `validate:skills`, `test:install`.
- **D-02:** Strict dependency chain: 02-02 depends on 02-01; 02-03 depends on 02-02.

**Git rename mechanism (FS-01, FS-02, FS-04, FS-05)**
- **D-03:** Use `git mv` for every directory and file rename. Split each plan into two commits where renames occur:
  1. Rename-only commit: pure `git mv`, no content edits, preserves git rename detection / blame.
  2. Reference-update commit: update all consumers of new paths.
- **D-04:** Within rename-only commits, group renames by subtree (e.g., all `core-skills/bmad-*` in one commit, all `bmm-skills/1-analysis/bmad-*` in another) to keep diffs reviewable and stay below git's rename detection threshold.

**Content sweep tooling (TXT-01, TXT-02, TXT-03)**
- **D-05:** Write committed Node script at `tools/dev/rename-sweep.js`. Glob `**/*.{md,yaml,yml,json,js,mjs,cjs,ts,astro,html,csv}` excluding `node_modules/`, `.git/`, `build/`, `.planning/`. Apply case-preserving substitution mapping in longest-first order:
  1. `BMAD Method` → `GoMad`
  2. `bmad-method` → `gomad`
  3. `BMad` → `GoMad`
  4. `BMAD` → `GOMAD`
  5. `bmad` → `gomad`
  6. `bmm` → `gomad` (whole-word / identifier-segment only — must NOT rewrite unrelated trigrams)

  Idempotent. Print summary: files touched, replacements per mapping, files skipped.
- **D-06:** Hard-coded exclude list inside the script:
  - `LICENSE`, `CHANGELOG.md`, `TRADEMARK.md`, `CONTRIBUTORS.md`, `README.md`, `README_CN.md` (entire files)
  - `.planning/**`, `node_modules/**`, `.git/**`, `build/**` (entire trees)
- **D-07:** Script must not touch directory names or manifest filenames — those are handled by `git mv` in 02-01. Sweep edits file CONTENTS only.

**Manifest schema migration (FS-03)**
- **D-08:** `bmad-skill-manifest.yaml` → `skill-manifest.yaml`; `bmad-manifest.json` → `manifest.json`. Prefix dropped — directory namespace already provides context.
- **D-09:** Installer reader code updates land atomically with the filename rename (same commit):
  - `tools/installer/ide/shared/skill-manifest.js` — glob pattern update
  - `tools/installer/core/manifest-generator.js` — manifest discovery update
  - `tools/installer/modules/official-modules.js` — manifest path references
  - `tools/installer/project-root.js` — manifest path references
- **D-10:** Inside each manifest, update `id`/`name` fields from `bmad-<x>` to `gm-<x>` to match new directory name. Part of the reference-update commit in 02-01, NOT the sweep in 02-02.

**CLI binary handoff (completes Phase 1 D-08/D-09)**
- **D-11:** File rename + `package.json` update in the SAME commit:
  - `git mv tools/installer/bmad-cli.js tools/installer/gomad-cli.js`
  - `package.json` `bin` → `{ "gomad": "tools/installer/gomad-cli.js" }`
  - `package.json` `main` → `tools/installer/gomad-cli.js`
  - Any shebang/internal require paths/self-references inside the file updated in the same commit.
- **D-12:** `tools/installer/ide/shared/bmad-artifacts.js` → `tools/installer/ide/shared/artifacts.js` (drop prefix entirely, consistent with D-08). All importers updated in the same commit.

**Test fixtures (TXT-04)**
- **D-13:** `git mv test/fixtures/file-refs-csv/valid/bmm-style.csv` → `gomad-style.csv`. `core-style.csv` stays (top-level `core-skills/` not being renamed; only `bmad-*` prefix inside it).
- **D-14:** Rewrite fixture CSV contents — every `bmad-<x>` skill ID → `gm-<x>`.
- **D-15:** Update `test/test-file-refs-csv.js` consumer to reference renamed fixture path and any changed expected-output strings.

**Slim-down leftover**
- **D-16:** Delete `docs/mobmad-plan.md` outright (no archival). Stale artifact from `next` reset commit `ad2434b`. Delete in plan 02-01 alongside FS renames.

**Verification inside Phase 2 (pre-Phase 4)**
- **D-17:** Per-plan smoke checks:
  - After 02-01: `npm run validate:skills` and `node tools/installer/gomad-cli.js --help`
  - After 02-02: `npm run lint` and final `grep -rn 'bmad\|BMAD\|bmm' src/ tools/ test/ docs/ website/` returning zero hits outside exclude list
  - After 02-03: `npm run test:install` and `node test/test-file-refs-csv.js`
- **D-18:** Full `npm run quality` is NOT required in Phase 2 — Phase 4's job (VFY-01).

### Claude's Discretion
- Exact ordering of `git mv` commits within a plan (rename-only must precede reference-update)
- Regex anchoring specifics in `rename-sweep.js` (word boundaries, identifier segment matching for `bmm`)
- How to split the ~41 skill directory renames across commits for reviewable diff sizes
- Whether to add `tools/dev/rename-sweep.js` to `.eslintignore` or let it pass lint

### Deferred Ideas (OUT OF SCOPE)
- Credit/branding/docs rewrite (LICENSE append, TRADEMARK.md rewrite, README rewrite, banner replacement, CLI banner) — Phase 3
- `npm run quality` full gate — Phase 4 VFY-01
- npm publish + v1.0.0 deprecation — Phase 4 REL-01/REL-02
- New gomad-specific agents/skills — Milestone 2
- Proactive audit for additional stale artifacts from `next` reset commit beyond `docs/mobmad-plan.md` — flag if surfaced, no proactive sweep
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FS-01 | `src/bmm-skills/` → `src/gomad-skills/` | Verified `src/bmm-skills` exists. Plan 02-01 rename-only commit. Atomic update to all installer references (D-09). |
| FS-02 | ~41 `bmad-*` skill dirs → `gm-*` | Confirmed exactly **41** dirs via `find src -type d -name 'bmad-*' \| wc -l`. Inventory: 11 in `src/core-skills/` + 8 in `1-analysis/` (incl. 3 nested `research/`) + 6 in `2-plan-workflows/` + 5 in `3-solutioning/` + 11 in `4-implementation/`. Plan 02-01 rename-only commits, chunked by subtree per D-04. |
| FS-03 | Manifest filename prefix drop | Confirmed: 6 `bmad-skill-manifest.yaml` files + 2 `bmad-manifest.json` files. D-08 schema, D-09 atomic consumer update. |
| FS-04 | `bmad-cli.js` → `gomad-cli.js` | D-11 atomic with `package.json` `bin`/`main` (currently still `tools/installer/bmad-cli.js` — verified). |
| FS-05 | `bmad-artifacts.js` → `artifacts.js` | D-12 atomic with importer updates. File confirmed at `tools/installer/ide/shared/bmad-artifacts.js`. |
| TXT-01 | Case-preserving content sweep across all file types | D-05 mapping (longest-first ordering), D-06 exclude list, idempotent. Plan 02-02. |
| TXT-02 | Skill ID references in SKILL.md, manifests, `module-help.csv`, installer code | Some IDs handled in 02-01 reference-update commit (D-10); rest swept in 02-02. |
| TXT-03 | `module.yaml` updates in both skill trees | Plan 02-02 sweep handles content; verify `core-skills/module.yaml` and `gomad-skills/module.yaml` (post-FS-01 rename) have correct `name` and skill ID listings. |
| TXT-04 | Test fixtures + consumer | D-13/D-14/D-15. Plan 02-03. |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

| Directive | Source | Compliance Check |
|-----------|--------|------------------|
| Casing: "GoMad" display, `gomad` lowercase paths, `GOMAD` for acronym only | CLAUDE.md Constraints | Sweep mapping (D-05) is case-preserving and matches this rule exactly |
| Skill rename `bmad-*` → `gm-*` is trademark requirement, NOT cosmetic | CLAUDE.md Constraints | FS-02 must achieve full coverage; no `bmad-*` prefixes in shipped code |
| BMAD wordmark only survives in LICENSE / CHANGELOG / TRADEMARK.md (Phase 3) | CLAUDE.md Constraints | D-06 exclude list protects all three files |
| Node.js / JavaScript ESM; no language change | CLAUDE.md Constraints | `tools/dev/rename-sweep.js` is CommonJS (matches installer convention per CONTEXT.md code_context) |
| Scope discipline: rename + slim down + credit + branding only | CLAUDE.md Constraints | Phase 2 is pure rename — no behavior changes, no new features |
| GSD workflow enforcement: no direct edits outside GSD commands | CLAUDE.md | All Phase 2 work runs through `/gsd-execute-phase` |
| Project: `type: module` (ESM) — but installer files use CommonJS | CLAUDE.md Tech Stack vs codebase reality | `rename-sweep.js` follows installer convention (CommonJS). Verify `package.json` `type` field — if `module`, the script needs `.cjs` extension or `package.json` override. [VERIFIED: package.json read — confirm `type` field absence/value during planning] |

## Standard Stack

### Core (already in repo)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `glob` | 11.0.3 | File pattern matching | Already a dep; use for `rename-sweep.js` traversal [VERIFIED: package.json] |
| `fs-extra` | 11.3.0 | File I/O with recursive ops | Already a dep; use for read/write in sweep script [VERIFIED: package.json] |
| `yaml` | 2.7.0 | YAML round-trip | Already a dep; use if any structured YAML edits needed [VERIFIED: package.json] |
| `git mv` | (git builtin) | Move with rename detection | Standard tool; preserves history for `git log --follow` and `git blame` [VERIFIED: git docs] |

### Supporting tools (already in repo)
| Tool | Purpose | When to Use |
|------|---------|-------------|
| `ripgrep` (rg) | Fast verification grep for D-17 zero-hit check | Final smoke check after 02-02 sweep |
| `prettier` 3.7.4 | Re-format any sweep-touched files | Lint-staged hook handles automatically; D-17 includes `npm run lint` |
| `eslint` 9.33.0 | Catch broken JS imports after rename | D-17 lint smoke check after 02-02 |
| `markdownlint-cli2` 0.19.1 | MD validation after sweep | Excluded from D-17 (Phase 4 only) — sweep should not break MD structure |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom `rename-sweep.js` | `sed -i` shell loop | sed has fragile case-preservation, no idempotency check, no exclude-list semantics, harder to review. Node script is auditable, idempotent, committed as evidence. [ASSUMED — sed alternative is well-known weakness] |
| Custom `rename-sweep.js` | `jscodeshift` | jscodeshift is AST-based and ideal for JS imports, but Phase 2 sweeps 7 file types (md/yaml/yml/json/js/mjs/cjs/ts/astro/html/csv) — AST-per-language is overkill for mechanical string substitution with whole-word anchoring. [ASSUMED] |
| `git mv` per directory | `mv` + `git add -A` | `git mv` plus a content-pure commit gives deterministic rename detection. Plain `mv` works too if the diff stays under git's rename threshold (default 50% similarity, 1000 candidates), but `git mv` is the explicit, reviewable path. [VERIFIED: git diff docs] |

**Installation:** No new packages required — all tooling already present.

**Version verification:** `npm view glob version` → 11.0.3 confirmed in package.json. `npm view fs-extra version` → 11.3.0 confirmed. No new installs.

## Architecture Patterns

### Recommended Layout for `tools/dev/rename-sweep.js`

```
tools/
├── dev/
│   └── rename-sweep.js   # NEW — committed sweep script (D-05)
└── installer/
    ├── gomad-cli.js      # renamed from bmad-cli.js (D-11)
    └── ide/shared/
        ├── artifacts.js  # renamed from bmad-artifacts.js (D-12)
        └── skill-manifest.js  # glob updated (D-09)
```

### Pattern 1: Two-Commit Rename (rename-only → reference-update)

**What:** Every directory or file rename gets exactly two commits — one pure `git mv` with no content edits, one follow-up commit that updates all consumers.

**When to use:** Always, per D-03. Mandatory for FS-01, FS-02, FS-04, FS-05, FS-03 (manifest filenames).

**Example sequence for FS-02 chunk (core-skills):**

```bash
# Commit 1 (rename-only, content-pure)
git mv src/core-skills/bmad-help src/core-skills/gm-help
git mv src/core-skills/bmad-distillator src/core-skills/gm-distillator
# ...all 11 core-skills bmad-* dirs...
git commit -m "refactor(02): rename core-skills bmad-* dirs to gm-* (rename-only)"

# Commit 2 (reference-update)
# Edit src/core-skills/module-help.csv to use gm-* IDs
# Edit src/core-skills/module.yaml skill list
# Edit any cross-skill SKILL.md references
# Edit each gm-*/skill-manifest.yaml id/name fields (D-10)
git commit -m "refactor(02): update core-skills references to gm-* IDs"
```

**Source:** D-03, D-04 (CONTEXT.md). Standard git rename-detection guidance — keeping rename commits content-pure ensures `git log --follow` and `git blame` traverse cleanly.

### Pattern 2: Atomic Schema Migration (rename + consumer in same commit)

**What:** When the rename and the consumer code that depends on the new name MUST both work or both not work, they go in the same commit.

**When to use:** D-09 manifest filename rename (installer would crash between commits otherwise), D-11 CLI binary rename (npm `bin` resolution would break otherwise), D-12 artifacts file (importers would fail to resolve).

**Example for D-11:**

```bash
git mv tools/installer/bmad-cli.js tools/installer/gomad-cli.js
# Edit package.json: bin.gomad → "tools/installer/gomad-cli.js"
# Edit package.json: main → "tools/installer/gomad-cli.js"
# Edit package.json: scripts.gomad:install → "node tools/installer/gomad-cli.js install"
# Edit package.json: scripts.gomad:uninstall → "node tools/installer/gomad-cli.js uninstall"
# Edit package.json: scripts.install:gomad → "node tools/installer/gomad-cli.js install"
# Edit any internal require/import paths inside gomad-cli.js
git add tools/installer/gomad-cli.js package.json
git commit -m "refactor(02): rename bmad-cli.js to gomad-cli.js (atomic)"
```

This intentionally violates the two-commit rule from Pattern 1 because `git mv` plus path edit is small enough that rename detection still works on a single combined commit (git's default 50% similarity threshold is well-satisfied — only the file path changes, contents nearly identical).

### Pattern 3: Case-Preserving Sweep (longest-first)

**What:** Apply substitutions in length-descending order to prevent shorter matches from corrupting longer matches.

**Why ordering matters:**
- If `bmad` runs before `bmad-method`, the `bmad-method` literal has already become `gomad-method` and the `bmad-method` rule never fires.
- `BMAD Method` (with space) must run before `BMAD` for the same reason.
- `bmm` must run last AND with strict word/identifier-segment anchoring or it will eat unrelated trigrams.

**Anchoring for `bmm`:** Must match only:
- Whole word (e.g., `bmm`, `bmm-skills`, `BMM` in headings)
- Identifier segment bounded by `/`, `-`, `_`, `.`, whitespace, or string delimiters

Must NOT match:
- Trigrams inside words like `commit` (no — no `bmm` substring there, but use this as the anchoring discipline)
- Real risk: words containing `bmm` as a substring. None known in repo, but the regex must enforce boundaries to be safe.

**Recommended regex skeleton (CommonJS):**

```javascript
// Source: D-05, D-06, internal pattern
const SUBSTITUTIONS = [
  { pattern: /BMAD Method/g, replacement: 'GoMad' },
  { pattern: /bmad-method/g, replacement: 'gomad' },
  { pattern: /BMad/g, replacement: 'GoMad' },
  { pattern: /BMAD/g, replacement: 'GOMAD' },
  { pattern: /bmad/g, replacement: 'gomad' },
  // bmm: anchored to identifier boundaries
  { pattern: /(^|[^a-zA-Z0-9_])bmm($|[^a-zA-Z0-9_])/g, replacement: '$1gomad$2' },
];

const EXCLUDE_FILES = new Set([
  'LICENSE', 'CHANGELOG.md', 'TRADEMARK.md',
  'CONTRIBUTORS.md', 'README.md', 'README_CN.md',
]);

const EXCLUDE_DIRS = ['node_modules/', '.git/', 'build/', '.planning/'];
```

### Anti-Patterns to Avoid

- **Sweep first, rename later:** Would leave content references pointing at not-yet-renamed paths. CONTEXT.md correctly orders 02-01 (FS) before 02-02 (sweep).
- **Single mega-commit:** Renaming 41 dirs + editing all references in one commit defeats git rename detection (default candidate limit ~1000 paths) and is unreviewable. D-04 mandates subtree chunking.
- **Mixing rename and content edit in one commit (except where atomicity demands it):** Breaks `git log --follow`. D-03 mandates two-commit pattern; D-09/D-11/D-12 are explicit exceptions justified by atomicity.
- **Sweeping `.planning/`:** Would corrupt the planning artifacts that drive Phase 2 itself. D-06 excludes the whole tree.
- **Sweeping LICENSE / CHANGELOG / TRADEMARK / README:** All are Phase 3 scope; touching them in Phase 2 violates phase boundaries. D-06 protects them.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| File traversal with ignore patterns | Custom recursive `fs.readdirSync` | `glob` 11.0.3 (already a dep) | Handles brace expansion, ignore patterns, and symlinks correctly |
| YAML round-trip in sweep | Regex on YAML files | `yaml` 2.7.0 if structural edits needed; otherwise plain string sub is fine for D-05's mechanical substitution | Plain string sub is acceptable here because the sweep is content-mechanical, not structural. Use YAML lib only if D-10 manifest `id`/`name` edits need it. |
| Move-with-history detection | `mv` + `git add` | `git mv` (D-03) | Explicit rename signal; deterministic blame preservation |
| Test reference validation post-rename | Roll a custom checker | `tools/validate-file-refs.js --strict` (already exists, called by `npm run validate:refs`) | Already integrated; D-17 calls `validate:skills` after 02-01 |

**Key insight:** Every tool needed for Phase 2 already exists in the repo. The only NEW code is `tools/dev/rename-sweep.js` (D-05), which is a thin wrapper around `glob` + `fs-extra` + the substitution table.

## Runtime State Inventory

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — repo is a CLI tool / npm package, no runtime DBs, no user data, no caches that survive between commits | None |
| Live service config | None — no external services, no n8n/Datadog/Tailscale registrations | None |
| OS-registered state | None — no scheduled tasks, no pm2 processes, no systemd units. The `gomad` CLI registers no OS services on install (it copies skill files to `.bmad/` dir in user projects) | None — but note that the user-side `.bmad/` directory in installations elsewhere on disk is a Phase 4 / post-release migration concern, not Phase 2. End-users will get fresh installs via `gomad install` after v1.1.0 ships. |
| Secrets/env vars | `BMAD_DEBUG_MANIFEST` env var (per CLAUDE.md). Code that reads `process.env.BMAD_DEBUG_MANIFEST` will be touched by sweep — verify it gets renamed to `GOMAD_DEBUG_MANIFEST` consistently across reader and any docs that mention it. No secret keys, no SOPS, no .env files in scope. | Sweep handles automatically via `BMAD` → `GOMAD` mapping (D-05 rule 4). Verify via `grep BMAD_DEBUG_MANIFEST` post-sweep returns zero hits. |
| Build artifacts / installed packages | `package-lock.json` will reference `bmad-method`-era installed paths IF version 1.0.x was previously installed via `npm i`. After `package.json` was updated in Phase 1 to `@xgent-ai/gomad@1.1.0`, a `npm install` regenerates the lockfile cleanly. No egg-info equivalents (Node, not Python). `node_modules/` excluded from sweep (D-06). | Run `npm install` once after 02-01 to regenerate `package-lock.json` if needed. Verify `package-lock.json` does not contain stray `bmad-method` self-references. [VERIFIED: package.json already shows `@xgent-ai/gomad@1.1.0` from Phase 1] |

**Canonical question — "After every file in the repo is updated, what runtime systems still have the old string cached, stored, or registered?":** Nothing on this developer machine for the gomad source repo itself. End-user installations of v1.0.x carry the old `.bmad/` install directory and old skill IDs, but that's a Phase 4 release-notes / migration-guide concern, not Phase 2.

## Common Pitfalls

### Pitfall 1: Git rename detection threshold exhaustion
**What goes wrong:** Renaming 41+ files in a single commit can exceed git's default rename detection candidate limit (`diff.renameLimit`, default 1000) and `find_copies_harder` cost. Renames then show as add+delete and `git log --follow` breaks.
**Why it happens:** Rename detection is O(n²) over candidate pairs.
**How to avoid:** D-04 explicitly mandates subtree chunking. Group `core-skills/bmad-*` (11) in one commit, `bmm-skills/1-analysis/bmad-*` (8) in another, etc. Each chunk well below the threshold.
**Warning signs:** `git log --follow src/core-skills/gm-help/SKILL.md` shows history starting at the rename commit instead of going back through `bmad-help/SKILL.md`.

### Pitfall 2: Trigram corruption from naive `bmm` substitution
**What goes wrong:** A regex `s/bmm/gomad/g` corrupts any word that happens to contain `bmm` as a substring. None are known in this repo, but the discipline matters.
**Why it happens:** Regex without word boundaries.
**How to avoid:** D-05 rule 6 mandates "whole-word or identifier segment" anchoring. Use `(^|[^a-zA-Z0-9_])bmm($|[^a-zA-Z0-9_])` or split into explicit cases (`/bmm/`, `bmm-`, `-bmm`, `bmm.`, etc.).
**Warning signs:** Sweep summary shows replacements in unexpected files. Final D-17 grep returns clean.

### Pitfall 3: Substitution ordering errors (shorter eats longer)
**What goes wrong:** Running `BMAD` → `GOMAD` before `BMAD Method` → `GoMad` produces `GOMAD Method` (incorrect — should be `GoMad`).
**Why it happens:** Greedy ordering.
**How to avoid:** D-05 mandates longest-first ordering. The substitution table is hard-coded in length-descending order.
**Warning signs:** Sweep produces `GOMAD Method` strings; idempotency check fails (re-running produces additional changes).

### Pitfall 4: Broken installer between commits within Phase 2
**What goes wrong:** Renaming `bmad-skill-manifest.yaml` to `skill-manifest.yaml` without updating the glob in `tools/installer/ide/shared/skill-manifest.js` leaves the installer unable to discover any manifests until the consumer commit lands.
**Why it happens:** Splitting filename rename from consumer code update across commits.
**How to avoid:** D-09, D-11, D-12 mandate atomic rename+consumer commits for these specific cases. The two-commit pattern (D-03) applies to skill DIR renames where consumers are reference-only (CSV listings, cross-references), not to installer-critical filename renames.
**Warning signs:** `node tools/installer/gomad-cli.js --help` fails after intermediate commits in 02-01.

### Pitfall 5: Lockfile drift
**What goes wrong:** `package-lock.json` retains old `bmad-method`-era install paths or `bmad-cli.js` references in the `bin` section.
**Why it happens:** Lockfile is generated from `package.json` `name`/`bin`/`main` at install time; was generated under old values in Phase 1 prior to `bin`/`main` update.
**How to avoid:** Run `npm install` (no args) after the D-11 atomic commit to regenerate lockfile. Commit the regenerated lockfile in the same commit or as a follow-up.
**Warning signs:** `grep -n bmad package-lock.json` returns hits after rename.

### Pitfall 6: Sweep modifies prettier-managed formatting incidentally
**What goes wrong:** `rename-sweep.js` writes a file with different line endings, trailing whitespace, or quote style than prettier expects → `npm run lint` fails.
**Why it happens:** Naive `fs.writeFileSync` doesn't preserve file character class.
**How to avoid:** Read with explicit encoding, write with same encoding. Run `npm run format:fix` after sweep, OR rely on lint-staged hook on commit. D-17 calls `npm run lint` which catches this. Discretion item: whether to add `tools/dev/rename-sweep.js` to `.eslintignore`.
**Warning signs:** D-17 lint check fails on files with no functional change.

## Code Examples

### Sweep script skeleton

```javascript
// Source: D-05, D-06, internal pattern derived from CONTEXT.md
// File: tools/dev/rename-sweep.js
'use strict';

const { glob } = require('glob');
const fs = require('fs-extra');
const path = require('path');

const SUBSTITUTIONS = [
  { name: 'BMAD Method → GoMad', pattern: /BMAD Method/g, replacement: 'GoMad' },
  { name: 'bmad-method → gomad', pattern: /bmad-method/g, replacement: 'gomad' },
  { name: 'BMad → GoMad', pattern: /BMad/g, replacement: 'GoMad' },
  { name: 'BMAD → GOMAD', pattern: /BMAD/g, replacement: 'GOMAD' },
  { name: 'bmad → gomad', pattern: /bmad/g, replacement: 'gomad' },
  {
    name: 'bmm → gomad (anchored)',
    pattern: /(^|[^a-zA-Z0-9_])bmm($|[^a-zA-Z0-9_])/g,
    replacement: '$1gomad$2',
  },
];

const EXCLUDE_FILES = new Set([
  'LICENSE',
  'CHANGELOG.md',
  'TRADEMARK.md',
  'CONTRIBUTORS.md',
  'README.md',
  'README_CN.md',
]);

const GLOB_PATTERN = '**/*.{md,yaml,yml,json,js,mjs,cjs,ts,astro,html,csv}';
const IGNORE = ['node_modules/**', '.git/**', 'build/**', '.planning/**'];

async function sweep() {
  const files = await glob(GLOB_PATTERN, { ignore: IGNORE, nodir: true });
  const summary = { touched: 0, replacements: {}, skipped: [] };

  for (const file of files) {
    const basename = path.basename(file);
    if (EXCLUDE_FILES.has(basename)) {
      summary.skipped.push({ file, reason: 'exclude-list' });
      continue;
    }
    const original = await fs.readFile(file, 'utf8');
    let updated = original;
    for (const sub of SUBSTITUTIONS) {
      const before = updated;
      updated = updated.replace(sub.pattern, sub.replacement);
      if (before !== updated) {
        summary.replacements[sub.name] = (summary.replacements[sub.name] || 0) + 1;
      }
    }
    if (updated !== original) {
      await fs.writeFile(file, updated, 'utf8');
      summary.touched += 1;
    }
  }

  console.log('Sweep summary:', JSON.stringify(summary, null, 2));
}

sweep().catch((err) => {
  console.error('Sweep failed:', err);
  process.exit(1);
});
```

### Verification grep (D-17 after 02-02)

```bash
# Source: D-17
grep -rn 'bmad\|BMAD\|bmm' src/ tools/ test/ docs/ website/ \
  --exclude-dir=node_modules \
  --exclude-dir=.git \
  --exclude-dir=build
# Expected output: zero hits (D-17 contract)
```

### Skill directory rename chunk (D-04 example)

```bash
# Source: D-03, D-04
cd /Users/rockie/Documents/GitHub/xgent/gomad
for skill in bmad-help bmad-distillator bmad-brainstorming bmad-shard-doc \
             bmad-index-docs bmad-party-mode bmad-advanced-elicitation \
             bmad-editorial-review-prose bmad-editorial-review-structure \
             bmad-review-adversarial-general bmad-review-edge-case-hunter; do
  new=$(echo "$skill" | sed 's/^bmad-/gm-/')
  git mv "src/core-skills/$skill" "src/core-skills/$new"
done
git commit -m "refactor(02): rename core-skills bmad-* to gm-* (rename-only)"
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `BMAD Method` repo branding | `GoMad` fork branding | Phase 2 | Mechanical rename, no behavior change |
| `src/bmm-skills/` | `src/gomad-skills/` | Phase 2 FS-01 | Top-level dir rename |
| `bmad-*` skill prefix | `gm-*` skill prefix | Phase 2 FS-02 | Trademark safety + brand consistency |
| `bmad-skill-manifest.yaml` / `bmad-manifest.json` | `skill-manifest.yaml` / `manifest.json` | Phase 2 FS-03 / D-08 | Prefix dropped — directory namespace provides context |
| `tools/installer/bmad-cli.js` | `tools/installer/gomad-cli.js` | Phase 2 FS-04 / D-11 | Atomic with `package.json` `bin`/`main` |
| `bmad-artifacts.js` | `artifacts.js` | Phase 2 FS-05 / D-12 | Prefix dropped consistent with D-08 |

**Deprecated/outdated:**
- `docs/mobmad-plan.md` — stale artifact from `next` reset commit `ad2434b`. Delete in 02-01 (D-16).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `package.json` does not have `"type": "module"` set, so CommonJS `tools/dev/rename-sweep.js` works without `.cjs` extension | Project Constraints / Standard Stack | LOW — if `type: module` is set, rename script to `.cjs` or use ESM syntax. CLAUDE.md says `type: module` but installer code uses CommonJS, indicating the field may not be set or CommonJS files use `.cjs`. Plan agent should verify with `node -e 'console.log(require(\"./package.json\").type)'` before authoring the script. |
| A2 | The 6 `bmad-skill-manifest.yaml` and 2 `bmad-manifest.json` files are the complete set of manifest files needing rename | Phase Requirements / FS-03 | LOW — `find` results were authoritative at research time. Plan agent should re-run `find . -name 'bmad-*manifest*'` immediately before 02-01 to confirm. |
| A3 | `sed`-based shell sweep is meaningfully worse than a Node script for case-preservation and idempotency | Standard Stack | LOW — committed Node script is better for auditability regardless. CONTEXT.md D-05 already locks the Node script choice. |
| A4 | No `bmm` substring exists inside any unrelated identifier in the codebase that the anchored regex would still match | Common Pitfalls / Pitfall 2 | LOW — visual scan of skill names shows no risky cases. Sweep summary will surface any unexpected hits, and D-17 grep verifies. |
| A5 | `tools/installer/modules/official-modules.js` and `tools/installer/project-root.js` actually contain hard-coded manifest filename references that need updating | D-09 list | LOW — CONTEXT.md D-09 lists them explicitly; plan agent should confirm with grep before authoring task list. Grep run during research showed `manifest-generator.js` and `skill-manifest.js` definitely contain refs. |

**Discretion items remaining (D-91/D-92/D-93/D-94):** Exact commit splitting strategy across the 41 dirs, regex anchoring micro-tuning for `bmm`, `.eslintignore` decision for sweep script, ordering of `git mv` commits within a plan. None block planning.

## Open Questions

1. **`package.json` `type` field**
   - What we know: CLAUDE.md says `type: module` (ESM). Installer code uses `require`/`module.exports` (CommonJS).
   - What's unclear: Is `type` actually set in `package.json`? If so, `.js` files default to ESM and the installer code must use `.cjs`.
   - Recommendation: Plan agent verifies in 02-02 plan authoring step. If `type: module`, write `tools/dev/rename-sweep.cjs` (not `.js`).

2. **`gomad-skills/module.yaml` contents post-rename**
   - What we know: `module.yaml` files exist in both skill trees and contain skill ID listings (per CONTEXT.md code_context).
   - What's unclear: Whether the `name` field at the top of each `module.yaml` needs a manual edit (not just a sweep) to match the new `gomad-skills` namespace.
   - Recommendation: 02-02 plan author should `cat src/bmm-skills/module.yaml` (pre-rename) and verify the sweep output produces the right `name` value, OR explicitly include a manual edit task for the `name` field.

3. **Lockfile regeneration timing**
   - What we know: `package.json` `bin` and `main` still point at `bmad-cli.js` (verified via Read).
   - What's unclear: Whether the existing `package-lock.json` needs regeneration after D-11 lands, or whether `npm install --package-lock-only` produces a clean diff.
   - Recommendation: Include a "regenerate lockfile" step in 02-01 after the D-11 atomic commit, with a check that the resulting diff is bounded (only `bmad-cli.js` → `gomad-cli.js` references should change).

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | All scripts, sweep, validation | ✓ | 20.0.0+ required | — |
| npm | Validation scripts | ✓ | 11.5.1+ required | — |
| git | `git mv` for renames | ✓ (project is a git repo per env) | — | — |
| `glob` 11.0.3 | `rename-sweep.js` | ✓ | 11.0.3 (in package.json) | — |
| `fs-extra` 11.3.0 | `rename-sweep.js` | ✓ | 11.3.0 (in package.json) | — |
| `prettier` 3.7.4 | Post-sweep formatting | ✓ | 3.7.4 (in package.json) | — |
| `eslint` 9.33.0 | D-17 lint smoke check | ✓ | 9.33.0 (in package.json) | — |
| `ripgrep` (`rg`) | Optional fast grep for D-17 | ✓ (assumed on dev machine; `grep -r` is fallback) | — | `grep -rn` (POSIX) |

**Missing dependencies with no fallback:** None.
**Missing dependencies with fallback:** `ripgrep` is optional — `grep -rn` works equivalently.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Jest 30.2.0 (declared in package.json) + custom Node test scripts (`test/test-installation-components.js`, `test/test-file-refs-csv.js`) |
| Config file | None detected for Jest; custom test scripts are plain Node entry points |
| Quick run command | `node test/test-file-refs-csv.js` (TXT-04 verification) |
| Full suite command | `npm run test:install && npm run validate:refs && npm run validate:skills` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FS-01 | `src/gomad-skills/` exists; installer can discover skills under it | smoke | `npm run validate:skills` | ✅ (`tools/validate-skills.js`) |
| FS-02 | All ~41 `gm-*` skill dirs exist; no `bmad-*` skill dirs remain | smoke | `find src -type d -name 'bmad-*' \| wc -l` (expect 0) | ✅ (POSIX `find`) |
| FS-03 | `skill-manifest.yaml` / `manifest.json` discoverable by installer | integration | `npm run validate:skills` | ✅ |
| FS-04 | `gomad-cli.js` runs and reports help | smoke | `node tools/installer/gomad-cli.js --help` | ✅ (post-rename) |
| FS-05 | `artifacts.js` importable, no broken imports | smoke | `node -e "require('./tools/installer/ide/shared/artifacts.js')"` | ✅ (post-rename) |
| TXT-01 | Zero `bmad`/`BMAD`/`bmm` hits outside exclude list | smoke | `grep -rn 'bmad\|BMAD\|bmm' src/ tools/ test/ docs/ website/` (D-17) | ✅ (POSIX) |
| TXT-02 | Skill ID references resolve | integration | `npm run validate:refs` (calls `tools/validate-file-refs.js --strict`) | ✅ |
| TXT-03 | `module.yaml` files parse and list correct skill IDs | integration | `npm run validate:skills` | ✅ |
| TXT-04 | Renamed fixtures consumed correctly by `test-file-refs-csv.js` | unit | `node test/test-file-refs-csv.js` | ✅ |

### Sampling Rate
- **Per task commit:** `npm run validate:skills` (after rename-only commits) and `npm run lint` (after sweep commits)
- **Per wave / per plan merge:**
  - After 02-01: `npm run validate:skills` + `node tools/installer/gomad-cli.js --help` (D-17)
  - After 02-02: `npm run lint` + final D-17 grep zero-hit check
  - After 02-03: `npm run test:install` + `node test/test-file-refs-csv.js` (D-17)
- **Phase gate:** All three D-17 smoke checks green. Full `npm run quality` is deferred to Phase 4 (D-18 / VFY-01).

### Wave 0 Gaps
None — existing test infrastructure (`tools/validate-skills.js`, `tools/validate-file-refs.js`, `test/test-installation-components.js`, `test/test-file-refs-csv.js`) covers all phase requirements. No new test files needed. The new `tools/dev/rename-sweep.js` is a one-shot transformation script; idempotency check (re-running produces zero changes) is its own test and is built into the script summary output (D-05).

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | N/A — Phase 2 is a rename, no auth code touched |
| V3 Session Management | no | N/A |
| V4 Access Control | no | N/A |
| V5 Input Validation | minor | `rename-sweep.js` reads files from globs and writes them back. Inputs are repo files; trust boundary is "files I just read from disk in my own repo". No untrusted input. |
| V6 Cryptography | no | N/A — no crypto operations |
| V7 Error Handling | yes | Sweep script must fail loudly on read/write errors; D-05 mandates idempotency check |
| V12 Files | yes | Sweep script writes files; must respect exclude list (D-06) and not escape working tree |
| V14 Configuration | yes | `package.json` `bin`/`main` edit (D-11) is config change; must be atomic with file rename |

### Known Threat Patterns for Phase 2 Rename

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Sweep corrupts LICENSE attribution | Tampering | D-06 hard-coded exclude list; D-17 verification grep treats LICENSE/CHANGELOG/TRADEMARK as allowed exclusions |
| Sweep corrupts CHANGELOG history | Tampering | D-06 exclude list |
| Sweep escapes `.git/` and corrupts pack files | Tampering | D-06 explicit `.git/**` exclusion |
| Reference-update commit lands without rename commit (split commit hazard) | Repudiation / Denial of Service | D-03 ordering discipline; D-09/D-11/D-12 atomic commits where required |
| Lockfile drift exposes stale `bmad-method` references in shipped tarball | Information Disclosure (minor — brand inconsistency) | Regenerate lockfile post-D-11; Phase 4 `npm pack --dry-run` is the final gate (deferred per D-18) |

**Trademark / legal control:** D-06 protects LICENSE, CHANGELOG, TRADEMARK.md, README.md from any sweep modification. CLAUDE.md is explicit that the BMAD wordmark may only survive in nominative-fair-use contexts. Phase 2 sweep cannot violate this because the exclusion is hard-coded in the script.

## Sources

### Primary (HIGH confidence)
- `.planning/phases/02-rename/02-CONTEXT.md` — All 18 locked decisions (D-01 through D-18)
- `.planning/REQUIREMENTS.md` — FS-01..05, TXT-01..04 acceptance criteria
- `.planning/research/RENAME_MECHANICS.md` — Pre-existing inventory scout (~41 skill dirs, manifest filenames, special cases)
- `.planning/ROADMAP.md` Phase 2 — Goal statement and 5 success criteria
- `CLAUDE.md` — Trademark constraints, casing rules, scope discipline
- `package.json` (read in research) — Confirmed `bin`/`main` still point at `bmad-cli.js`; confirmed `glob`/`fs-extra`/`yaml` deps available; confirmed scripts already use `gomad:install` naming
- `find src -type d -name 'bmad-*' | wc -l` → 41 confirmed
- `find . -name 'bmad-skill-manifest.yaml'` → 6 files confirmed
- `find . -name 'bmad-manifest.json'` → 2 files confirmed
- `find src/core-skills -maxdepth 1 -type d -name 'bmad-*' | wc -l` → 11 confirmed

### Secondary (MEDIUM confidence)
- Git rename detection behavior (`diff.renameLimit`, default 1000 candidates, 50% similarity threshold) — well-known git defaults

### Tertiary (LOW confidence)
- None — Phase 2 is a mechanical rename within an existing well-understood repo. All claims are either verified against the file system or copied verbatim from CONTEXT.md decisions.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all tooling already in `package.json`, versions verified
- Architecture (two-commit pattern, atomic rename pattern): HIGH — locked in CONTEXT.md, standard git practice
- Pitfalls: HIGH — trigram, ordering, atomic-commit, lockfile-drift pitfalls all known and addressed by CONTEXT.md decisions
- Validation Architecture: HIGH — existing `validate:skills`, `validate:refs`, `test-file-refs-csv.js` cover all requirements; no Wave 0 gaps
- Security: HIGH — minimal threat surface; D-06 exclude list is the only material control

**Research date:** 2026-04-08
**Valid until:** 2026-05-08 (30 days — phase scope is mechanical and stable)
