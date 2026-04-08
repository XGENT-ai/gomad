<!-- markdownlint-disable MD001 -->

# Phase 2: Rename - Context

**Gathered:** 2026-04-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Transform every file path, directory name, manifest filename, skill ID, and content reference from `bmad`/`BMAD`/`bmm` to `gomad`/`GOMAD`/`gm-*` without breaking installer or tests mid-flight. Pure rename phase — no behavioral changes, no new features, no content rewrites beyond mechanical substitution. Credit/branding/docs rewriting is Phase 3.

</domain>

<decisions>
## Implementation Decisions

### Plan decomposition (FS-01..05, TXT-01..04)
- **D-01:** Three plans, layered by responsibility:
  - **02-01-PLAN:** FS renames + atomic CLI handoff. Covers FS-01 (`bmm-skills/` → `gomad-skills/`), FS-02 (~41 `bmad-*` skill dirs → `gm-*`), FS-03 (manifest filename prefix drop), FS-04 (`bmad-cli.js` → `gomad-cli.js`), FS-05 (`bmad-artifacts.js` → `artifacts.js`). Also completes the Phase 1 D-08/D-09 staged handoff by atomically updating `package.json` `bin` and `main` paths in the same commit as the CLI file rename.
  - **02-02-PLAN:** Content sweep. Covers TXT-01 (case-preserving text substitution across markdown/yaml/json/js/html/csv), TXT-02 (skill ID references in SKILL.md, manifests, `module-help.csv`, installer code), TXT-03 (`module.yaml` updates in both skill trees).
  - **02-03-PLAN:** Test fixtures + validation. Covers TXT-04 (rename `bmm-style.csv`/`core-style.csv` fixtures, update `test-file-refs-csv.js` consumer), plus re-running `validate:refs`, `validate:skills`, and `test:install` to confirm nothing broke.
- **D-02:** Dependency chain is strict: 02-02 depends on 02-01 (content sweep needs final paths to reference), 02-03 depends on 02-02 (tests validate the fully-renamed tree).

### Git rename mechanism (FS-01, FS-02, FS-04, FS-05)
- **D-03:** Use `git mv` for every directory and file rename. Split each plan into two commits where renames occur:
  1. **Rename-only commit:** Pure `git mv` with no content edits. Lets git's rename detection succeed cleanly so `git log --follow` and `git blame` continue to work across the ~41 skill directories.
  2. **Reference-update commit:** Update all references that point at the new paths (installer imports, cross-skill references, manifest IDs).
- **D-04:** Within the rename-only commit, group renames by subtree (e.g., all `core-skills/bmad-*` in one commit, all `bmm-skills/1-analysis/bmad-*` in another) if the per-commit diff would otherwise exceed git's default rename detection threshold. Keep commits reviewable.

### Content sweep tooling (TXT-01, TXT-02, TXT-03)
- **D-05:** Write a committed Node script at `tools/dev/rename-sweep.js`. Script responsibilities:
  - Glob target file set: `**/*.{md,yaml,yml,json,js,mjs,cjs,ts,astro,html,csv}` — excluding `node_modules/`, `.git/`, `build/`, and `.planning/`.
  - Apply case-preserving substitution mapping (order matters; longest-first to avoid partial matches):
    1. `BMAD Method` → `GoMad`
    2. `bmad-method` → `gomad`
    3. `BMad` → `GoMad`
    4. `BMAD` → `GOMAD`
    5. `bmad` → `gomad`
    6. `bmm` → `gomad` (only as whole-word or as identifier segment; must not rewrite unrelated trigrams)
  - Enforce an explicit exclude list (D-06 below).
  - Be idempotent — re-running the script after completion should produce zero changes.
  - Print a summary: files touched, replacements per mapping, files skipped (with reason).
- **D-06:** Exclude list is hard-coded in the script as an explicit array of file paths plus per-file line-range markers. Initial list:
  - `LICENSE` — entire file (Phase 3 appends gomad copyright block; Phase 2 must not touch BMAD's preserved MIT text)
  - `CHANGELOG.md` — entire file (history entries preserved; Phase 3 adds v1.1.0 entry manually)
  - `TRADEMARK.md` — entire file (Phase 3 rewrites it; Phase 2 must not sweep it)
  - `CONTRIBUTORS.md` — entire file (preserves original BMAD contributors list verbatim)
  - `README.md`, `README_CN.md` — entire files (Phase 3 rewrites both with gomad framing + credit section)
  - `.planning/**` — entire tree (internal planning artifacts, not shipped)
  - `node_modules/**`, `.git/**`, `build/**` — build artifacts
- **D-07:** Script must not touch skill directory *names* or manifest *filenames* — those are handled by the `git mv` step in 02-01. The sweep only edits file *contents*.

### Manifest schema migration (FS-03)
- **D-08:** Manifest filename prefix drop: `bmad-skill-manifest.yaml` → `skill-manifest.yaml`, `bmad-manifest.json` → `manifest.json`. Directory namespace (`src/gomad-skills/<phase>/<skill>/`) already provides context.
- **D-09:** Installer reader code updates that MUST land atomically with the filename rename (same commit):
  - `tools/installer/ide/shared/skill-manifest.js` — glob pattern update
  - `tools/installer/core/manifest-generator.js` — manifest discovery update
  - `tools/installer/modules/official-modules.js` — any manifest path references
  - `tools/installer/project-root.js` — any manifest path references
- **D-10:** Inside each manifest, update `id`/`name` fields from `bmad-<x>` to `gm-<x>` to match the new directory name. This is a content edit, but it's part of the reference-update commit in plan 02-01, not the sweep in 02-02.

### CLI binary handoff (completes Phase 1 D-08/D-09)
- **D-11:** File rename and `package.json` update MUST be in the same commit:
  - `git mv tools/installer/bmad-cli.js tools/installer/gomad-cli.js`
  - Edit `package.json` `bin` → `{ "gomad": "tools/installer/gomad-cli.js" }`
  - Edit `package.json` `main` → `tools/installer/gomad-cli.js`
  - Any shebang, internal require paths, or self-references inside the file updated in the same commit
- **D-12:** Artifacts file: `tools/installer/ide/shared/bmad-artifacts.js` → `tools/installer/ide/shared/artifacts.js` (drop prefix entirely, consistent with D-08 manifest-filename decision). All importers updated in the same commit.

### Test fixtures (TXT-04)
- **D-13:** Rename fixture files in place via `git mv`:
  - `test/fixtures/file-refs-csv/valid/bmm-style.csv` → `gomad-style.csv`
  - `test/fixtures/file-refs-csv/valid/core-style.csv` stays (`core-skills` is not being renamed at the top level — only the `bmad-*` prefix inside it)
- **D-14:** Rewrite fixture CSV contents so every `bmad-<x>` skill ID reference becomes `gm-<x>` to match the renamed skill directories.
- **D-15:** Update `test/test-file-refs-csv.js` consumer to reference the renamed fixture path and any changed expected-output strings.

### Slim-down leftover
- **D-16:** Delete `docs/mobmad-plan.md`. It was introduced by the Phase 1 reset commit `ad2434b refactor: new start for next` as a stale artifact describing a superseded "mobmad external-module" product direction. Not part of the gomad fork plan. Purely dead weight. Delete outright (no archival) in plan 02-01 alongside the FS renames.

### Verification inside Phase 2 (pre-Phase 4)
- **D-17:** After each plan, run the relevant smoke check:
  - After 02-01: `npm run validate:skills` and `node tools/installer/gomad-cli.js --help` to prove CLI + manifest discovery still work
  - After 02-02: `npm run lint` and a final `grep -rn 'bmad\|BMAD\|bmm' src/ tools/ test/ docs/ website/` that should return zero hits outside the exclude list
  - After 02-03: `npm run test:install` and the specific `test-file-refs-csv.js` test
- **D-18:** A full `npm run quality` is NOT required inside Phase 2 — that's Phase 4's job (VFY-01). Phase 2 gates are just the targeted smoke checks above.

### Claude's Discretion
- Exact ordering of `git mv` commits within a plan (as long as rename-only commits precede reference-update commits)
- Regex anchoring specifics in `rename-sweep.js` (word boundaries, identifier segment matching for `bmm`)
- How to split the ~41 skill directory renames across commits for reviewable diff sizes
- Whether to add `tools/dev/rename-sweep.js` to `.eslintignore` or let it pass lint

### Folded Todos
No todos were folded from the backlog — Phase 2 scope is fully covered by REQUIREMENTS.md.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & prior phase context
- `.planning/REQUIREMENTS.md` — FS-01 through FS-05, TXT-01 through TXT-04 definitions and acceptance criteria
- `.planning/PROJECT.md` — v1.1 constraints (casing rules, trademark posture, scope discipline)
- `.planning/phases/01-foundation/01-CONTEXT.md` — Phase 1 decisions; specifically D-08/D-09 which stage the CLI binary path handoff into Phase 2 (see D-11 above for completion)
- `.planning/ROADMAP.md` §Phase 2 — Goal statement and success criteria (5 items)

### Research artifacts
- `.planning/research/RENAME_MECHANICS.md` — Full inventory: ~41 skill dirs to rename, text-sweep categories, special-case files, manifest filename guidance
- `.planning/research/CREDIT_AND_NPM.md` — Referenced for Phase 3/4 context; confirms Phase 2 must NOT touch LICENSE or TRADEMARK.md

### Codebase maps
- `.planning/codebase/STRUCTURE.md` — Current directory layout (pre-rename baseline)
- `.planning/codebase/CONVENTIONS.md` — Naming conventions and manifest schema expectations
- `.planning/codebase/STACK.md` — Runtime and dependency context

### Files being renamed or edited
- `src/bmm-skills/` → `src/gomad-skills/` (top-level directory)
- `src/core-skills/bmad-*/` → `src/core-skills/gm-*/` (11 directories)
- `src/bmm-skills/**/bmad-*/` → `src/gomad-skills/**/gm-*/` (~30 directories)
- `tools/installer/bmad-cli.js` → `tools/installer/gomad-cli.js`
- `tools/installer/ide/shared/bmad-artifacts.js` → `tools/installer/ide/shared/artifacts.js`
- `tools/installer/ide/shared/skill-manifest.js` — manifest filename glob updates
- `tools/installer/core/manifest-generator.js` — manifest discovery updates
- `tools/installer/modules/official-modules.js` — manifest path references
- `tools/installer/project-root.js` — manifest path references
- `test/fixtures/file-refs-csv/valid/bmm-style.csv` → `gomad-style.csv`
- `test/test-file-refs-csv.js` — consumer update
- `package.json` — `bin`, `main`, already-set scripts (validation)
- `docs/mobmad-plan.md` — delete
- `src/core-skills/module.yaml`, `src/gomad-skills/module.yaml` — module metadata updates
- `src/core-skills/module-help.csv`, `src/gomad-skills/module-help.csv` — skill ID listings

### New files being created
- `tools/dev/rename-sweep.js` — Committed content-sweep script (D-05, D-06)

### Exclude list for content sweep
- `LICENSE`, `CHANGELOG.md`, `TRADEMARK.md`, `CONTRIBUTORS.md`, `README.md`, `README_CN.md`, `.planning/**`, `node_modules/**`, `.git/**`, `build/**`

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `tools/installer/ide/shared/skill-manifest.js` — Current manifest reader; the glob pattern needs updating for the prefix drop (FS-03). Well-structured, single point of change.
- `tools/installer/core/manifest-generator.js` — Central manifest discovery; any hard-coded `bmad-` filename references land here.
- `test/test-file-refs-csv.js` — Existing consumer for the fixture rename; provides a ready-made smoke test for D-13/D-14/D-15.

### Established Patterns
- CommonJS (`require`/`module.exports`) throughout the installer — new `tools/dev/rename-sweep.js` should match (CommonJS, no ESM, no TypeScript).
- YAML manifests use snake_case IDs in `id`/`name` fields — the `bmad-` → `gm-` rewrite must preserve YAML structure exactly.
- `module-help.csv` files use skill IDs as first-column keys — rename must update all rows in both `core-skills/` and `gomad-skills/`.
- Git rename detection in this repo's default configuration works well for pure moves; splitting rename-from-edit commits (D-03) is the standard path to preserve blame.

### Integration Points
- `package.json` `bin` + `main` fields → `tools/installer/gomad-cli.js` (D-11 atomic handoff from Phase 1 staged state)
- Installer manifest readers (D-09) must glob the new filenames atomically with the filename rename or installer breaks between commits
- Test runner picks up `test/test-file-refs-csv.js` automatically — no separate registration needed
- `rename-sweep.js` is a dev tool, not shipped to npm — `files` allowlist in `package.json` (set in Phase 1) excludes `tools/dev/`

### Scope boundary warnings
- Do NOT edit `LICENSE`, `TRADEMARK.md`, or `CHANGELOG.md` in Phase 2 — those are Phase 3's responsibility
- Do NOT rewrite `README.md`/`README_CN.md` prose in Phase 2 — prose rewrite is Phase 3
- Do NOT publish, deprecate, or touch npm in Phase 2 — that's Phase 4
- Do NOT add new agents, skills, or workflow behavior in Phase 2 — milestone 2 scope per PROJECT.md

</code_context>

<specifics>
## Specific Ideas

- User flagged `docs/mobmad-plan.md` as suspicious ("are you copied from main branch?"). Investigation confirmed it was introduced on `next` by the reset commit `ad2434b`. Decision: delete as part of Phase 2 cleanup (D-16). The suspicion is valid — any other stale artifacts from the reset commit surfaced during sweep should be flagged to the user before deletion.
- Phase 1 CONTEXT.md D-08/D-09 explicitly staged the CLI binary file rename into Phase 2 to avoid a broken CLI state. D-11 here completes that handoff atomically.
- `bmm` is a trigram that could appear inside unrelated identifiers — the sweep regex must anchor to whole-word or clear identifier-segment boundaries to avoid corrupting unrelated code.

</specifics>

<deferred>
## Deferred Ideas

- **Credit/branding/docs rewrite (LICENSE append, TRADEMARK.md rewrite, README rewrite, banner replacement, CLI banner)** — Phase 3 scope. Explicitly out of Phase 2 per scope boundary.
- **`npm run quality` full gate** — Phase 4 VFY-01. Phase 2 runs targeted smoke checks only (D-17/D-18).
- **npm publish + v1.0.0 deprecation** — Phase 4 REL-01/REL-02.
- **New gomad-specific agents/skills** — Milestone 2; strict out-of-scope per PROJECT.md.
- **Investigation of any other stale artifacts from the `next` reset commit beyond `docs/mobmad-plan.md`** — If the sweep surfaces additional suspicious files, flag them to the user rather than deleting silently. No proactive audit in Phase 2.

</deferred>

---

*Phase: 02-rename*
*Context gathered: 2026-04-08*
