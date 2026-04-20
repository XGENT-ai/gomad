# Phase 7: Upgrade Safety — Manifest-Driven Cleanup - Context

**Gathered:** 2026-04-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver safe, reversible manifest-driven cleanup that lets `gomad install` remove stale files on re-install **without ever touching anything outside allowed install roots**. Five tightly-coupled capabilities shipped as one unit:

1. **Stale-entry cleanup (INSTALL-05)** — on re-install, read prior `_gomad/_config/files-manifest.csv`, remove every entry no longer in the new install set BEFORE writing new files; idempotent second `gomad install` produces no disk change.
2. **Realpath containment (INSTALL-06)** — every manifest entry's resolved realpath must be a prefix-descendant of `fs.realpath(workspaceRoot)` under an allow-listed `install_root`. Absolute paths, `../` traversal, and symlink escapes are refused; nothing outside install roots is ever touched.
3. **v1.1→v1.2 legacy cleanup (INSTALL-07)** — first v1.2 install on a v1.1 workspace (no prior manifest) detects the legacy state and explicitly cleans the 7 known `.claude/skills/gm-agent-*/` paths.
4. **`--dry-run` preview (INSTALL-08)** — `gomad install --dry-run` prints the full cleanup + copy plan (paths to remove, paths to write, count summary) and exits without touching disk. Running without `--dry-run` performs the identical actions.
5. **Backup snapshot (INSTALL-09)** — before any destructive removal, files-to-be-removed are snapshotted into `_gomad/_backups/<timestamp>/` preserving relative-path structure; a documented recovery procedure restores from the backup.

Out of scope for this phase: reference sweep across source/docs/tests (Phase 9 — REF-01/02/04/05); PRD refinement (Phase 8); release mechanics — CHANGELOG BREAKING callout, tarball verification for Phase 7 paths, publish (Phase 9 — REL-02/03/04/05/06); backup rotation/pruning (explicitly deferred beyond v1.2 — REL-F1); interactive >N-file confirmation prompt.

</domain>

<decisions>
## Implementation Decisions

(Numbering continues from Phase 6's D-31.)

### Containment + corrupt-manifest policy (INSTALL-05, INSTALL-06)

- **D-32:** Allowed install roots are **derived dynamically from `tools/installer/ide/platform-codes.yaml`** (same source `_config-driven.js` uses to discover IDE target dirs) PLUS a realpath-containment check. For every manifest entry, the installer resolves `fs.realpath(path.join(workspaceRoot, install_root, entry.path))` and verifies the result is a prefix-descendant of `fs.realpath(workspaceRoot)`. One check closes three escape vectors: absolute paths, `../` traversal, and symlink-escape.
- **D-33:** `MANIFEST_CORRUPT` policy:
  - `csv-parse` throws OR header is malformed → **whole-manifest corrupt**. Log `MANIFEST_CORRUPT: <reason>`, skip cleanup entirely, continue with idempotent install (copy-over, no deletions).
  - A row is missing a required column (`type`, `name`, `path`, `install_root`) → **skip that row only**, keep the rest of the manifest. Log `CORRUPT_ROW: <row_idx>: <reason>`.
  - Any row's resolved path fails containment → **whole-manifest corrupt** (same posture as csv-parse failure). Conservative: one bad row poisons the batch because containment failures mean the manifest is either attacker-controlled or profoundly wrong.
  - BOM / CRLF are **normalization concerns, not corruption**. Strip leading `U+FEFF` and `\r\n → \n` silently before parsing; never treated as corrupt.
- **D-34:** Hash-mismatch policy (file on disk doesn't match `hash` column): **snapshot to `_gomad/_backups/<ts>/` then remove**. Every removal goes through the snapshot flow regardless of hash state; hash-mismatch files get an extra `was_modified: true` marker in `metadata.json` so recovery tooling can tell user edits apart from untouched deletions. Single uniform deletion flow; `hash` becomes informational, not protective.
- **D-35:** Symlink-escape (a manifest entry resolves to a symlink pointing outside the workspace): **refuse the entry, log `SYMLINK_ESCAPE: <path> → <target>, refusing to touch`, continue processing remaining entries**. Non-fatal. One rogue entry shouldn't abort an upgrade; the rest of the manifest is still actionable.

### Backup layout + recovery (INSTALL-09)

- **D-36:** `_gomad/_backups/<timestamp>/` **mirrors the `install_root` + relative-path tree structure** of the removed files. Examples: a `.claude/commands/gm/agent-pm.md` removal lands at `_gomad/_backups/<ts>/.claude/commands/gm/agent-pm.md`; a `_gomad/gomad/agents/pm.md` removal lands at `_gomad/_backups/<ts>/_gomad/gomad/agents/pm.md`. Recovery is `cp -R _gomad/_backups/<ts>/* ./` from the workspace root. Structure matches the `install_root` column of manifest v2.
- **D-37:** Timestamp format is **`YYYYMMDD-HHMMSS`** (e.g. `20260420-143052`). Filesystem-safe (no colons — Windows-hostile), lexicographic ordering = chronological, human-readable at a glance, no timezone ambiguity (always local time; documented in metadata.json).
- **D-38:** Each `_gomad/_backups/<ts>/metadata.json` is **mandatory** and contains:
  - `gomad_version` — the installer version that performed the backup
  - `created_at` — ISO 8601 timestamp (full fidelity with TZ)
  - `reason` — one of `manifest_cleanup` | `legacy_v1_cleanup` | `hash_mismatch_only`
  - `files[]` — each entry: `{ install_root, relative_path, orig_hash, was_modified }`
  - `recovery_hint` — one-line pointer: `"Restore with: cp -R $(pwd)/_gomad/_backups/<ts>/* ./"`
- **D-39:** `_gomad/_backups/**` is **explicitly excluded from `files-manifest.csv`** (both written and read paths). Prevents: (a) the next cleanup pass marking old backups as "stale" and deleting them; (b) recursive backup-of-backup growth. Rotation/pruning is user-managed for v1.2 (REL-F1 defers automated rotation). Exclusion is implemented in `manifest-generator.writeFilesManifest` as a path prefix filter.

### Dry-run UX + destructive-op confirmation (INSTALL-08)

- **D-40:** `--dry-run` output is a **human-readable table grouped by section** with summary counts:
  ```
  TO SNAPSHOT (3 files)
    _gomad/gomad/agents/pm.md           (from files-manifest.csv)
    .claude/commands/gm/agent-pm.md     (user-modified, hash-diff)
    ...
  TO REMOVE (3 files)
    <same list — snapshot is prerequisite>
  TO WRITE (12 files)
    _gomad/gomad/agents/analyst.md
    .claude/commands/gm/agent-analyst.md
    ...

  Summary: 3 snapshotted, 3 removed, 12 written
  ```
  JSON output format (`--dry-run-format=json`) is **deferred** beyond v1.2. Exit code is `0` when the plan renders cleanly; non-zero only for parse/IO errors. Without `--dry-run`, the installer performs the identical actions.
- **D-41:** Non-dry-run install **does NOT prompt for interactive confirmation** regardless of the file-deletion count. Users who want preview run `gomad install --dry-run` explicitly. Rationale:
  - CI / non-TTY environments stay unblocked with no need for a `--yes` bypass flag
  - `--dry-run` already exists as the preview mechanism — an additional interactive gate would be redundant and harder to document
  - Safety nets layered by D-32 (realpath containment) + D-34/D-38 (backup snapshot + metadata) are structural, not operator-discretion
  - v1.1 `.bak` preservation flow already proves users trust the installer's destructive path when safety nets are in place

### v1.1 legacy cleanup scope (INSTALL-07)

- **D-42:** Legacy cleanup is **strictly scoped to the 7 known `gm-agent-*` paths**:
  - `.claude/skills/gm-agent-analyst/`
  - `.claude/skills/gm-agent-tech-writer/`
  - `.claude/skills/gm-agent-pm/`
  - `.claude/skills/gm-agent-ux-designer/`
  - `.claude/skills/gm-agent-architect/`
  - `.claude/skills/gm-agent-sm/`
  - `.claude/skills/gm-agent-dev/`

  No generic `gm-*` orphan sweep under `.claude/skills/`. Rationale: minimum blast radius, zero risk of eating user-forked skills with same-prefixed names. After the first v1.2 install writes its own `files-manifest.csv`, subsequent installs manage drift through manifest-diff (D-32/D-33) — they don't need a path-based orphan hunt.
- **D-43:** When a known v1.1 path contains user-added files (e.g. `.claude/skills/gm-agent-pm/custom.md`): **snapshot the entire directory tree to `_gomad/_backups/<ts>/.claude/skills/gm-agent-pm/` then remove the directory**. Preserves user edits under the snapshot structure (recoverable via the same `cp -R _backups/<ts>/* ./` flow as D-36). `metadata.json.reason = "legacy_v1_cleanup"` and per-file entries get `was_modified: null` (v1.1 had no hash manifest, so modification status is unknown). The directory is removed as a unit — no attempt to delete "known files only, keep user files" because v1.1 had no manifest to distinguish them.

### Claude's Discretion

- Exact error-message wording for `MANIFEST_CORRUPT`, `SYMLINK_ESCAPE`, and containment-rejection log lines (structured logs + human-readable summary — planner decides template).
- Table column widths / visual treatment (box drawing, color) in `--dry-run` output.
- Placement of recovery procedure documentation: `_gomad/_backups/<ts>/README.md`, `docs/upgrade-recovery.md`, a `gomad restore` CLI command, or a combination. `metadata.json.recovery_hint` is mandatory regardless (D-38); the human-facing doc is planner's call.
- Plan decomposition — a single "Phase 7 safety" plan vs splitting (cleanup vs backup vs dry-run vs legacy). Tight coupling suggests bundled; separate review surfaces suggest split. Planner decides based on reviewability and dependency ordering.
- Integration with v1.1's existing `_backupUserFiles` pattern at `installer.js:545` (`_gomad-custom-backup-temp` / `_gomad-modified-backup-temp`). Two reasonable postures: (a) keep v1.1 flow untouched for the existing `detectCustomFiles` path, add Phase 7 snapshot as a new parallel flow for manifest-driven cleanup; (b) unify both flows into one `_gomad/_backups/<ts>/` structure. Planner evaluates blast radius.
- Whether `--dry-run` performs a full manifest parse + containment validation pass (producing rejection log lines even though no disk change happens) or a shallower plan preview. Stronger validation in `--dry-run` helps users debug manifest-corrupt scenarios before executing.
- Test-fixture design for corrupt-manifest scenarios (BOM, CRLF, quoted-field edge cases, row-arity errors, containment-escape attempts, duplicate paths). Minimum: one golden fixture per D-33 bullet. Planner picks test framework — probably extend `test/test-gm-command-surface.js` or add a dedicated `test/test-manifest-cleanup.js`.
- Exact implementation of the "exclude `_gomad/_backups/**` from manifest" rule — a prefix filter in `writeFilesManifest` vs a constant allow-list in the installer's file discovery pass. Both land in the same outcome.
- Windows-specific edge cases: `fs.realpath` behavior on NTFS junctions (Node.js ≥20 treats junctions as symlinks); `fs.copy` permission-preserve semantics. Planner surfaces as an implementation detail — v1.2 release verification (REL-04) covers the CI matrix.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase-7-specific requirements and success criteria
- `.planning/ROADMAP.md` §"Phase 7: Upgrade Safety — Manifest-Driven Cleanup" — Goal statement, 6 success criteria, requirements linkage (INSTALL-05/06/07/08/09)
- `.planning/REQUIREMENTS.md` §INSTALL-05 — Manifest-driven stale-entry cleanup before copy; idempotent re-install
- `.planning/REQUIREMENTS.md` §INSTALL-06 — Realpath containment under allowed install roots; refuse absolute / `../` / symlink escapes
- `.planning/REQUIREMENTS.md` §INSTALL-07 — Legacy v1.1 state detection; clean known `.claude/skills/gm-agent-*/` paths
- `.planning/REQUIREMENTS.md` §INSTALL-08 — `--dry-run` flag; identical actions as non-dry-run
- `.planning/REQUIREMENTS.md` §INSTALL-09 — Backup snapshot to `_gomad/_backups/<timestamp>/` with documented recovery

### Pitfall research (Phase-7-relevant entries)
- `.planning/research/PITFALLS.md` §"Pitfall 2: Manifest-driven cleanup deletes user files because manifest lies, is stale, or is mis-parsed" — **THE defining pitfall for this phase.** Informs D-32 (realpath containment), D-33 (corrupt-manifest policy, BOM/CRLF normalization), D-34/D-36/D-38 (snapshot with metadata), D-41 (dry-run as preview mechanism)
- `.planning/research/PITFALLS.md` §"Pitfall 3: Symlinked existing installs break silently or keep working (wrong) after v1.2 upgrade" — Informs D-35 (symlink-escape refusal), layers on Phase 6's D-20 (symlink-leftover unlink during copy)
- `.planning/research/PITFALLS.md` §"Pitfall 15: Existing v1.1 `_gomad/_config/` manifest files collide with v1.2 schema changes" — Informs D-42/D-43 (no-prior-manifest detection drives legacy cleanup; v1.1 → v1.2 migration is the primary upgrade path)
- `.planning/research/PITFALLS.md` §"Pitfall 19: Windows path separators in files-manifest.csv (`\` vs `/`)" — Phase 6 D-26 already normalized to forward slashes; Phase 7 must not reintroduce separator drift when building snapshot paths

### Prior-phase decisions that Phase 7 depends on
- `.planning/phases/06-installer-mechanics-copy-manifest-stub-generation/06-CONTEXT.md` §D-21 — "Phase 6 overwrites regular files silently; Phase 7 layers `.bak` snapshot safety back on for all destinations." Phase 7 fulfills this commitment via the snapshot-to-`_backups/` flow (D-34/D-36).
- `.planning/phases/06-installer-mechanics-copy-manifest-stub-generation/06-CONTEXT.md` §D-23 — `schema_version` per-row column; v1 rows → implicit v1 (missing column). Phase 7's corrupt-row skip (D-33) relies on this.
- `.planning/phases/06-installer-mechanics-copy-manifest-stub-generation/06-CONTEXT.md` §D-25 — `install_root` column covers both `_gomad/` internals and IDE-target paths (`.claude/commands/gm/*`, `.cursor/skills/*`, etc.). Phase 7's containment check (D-32) resolves paths relative to `install_root` per row.
- `.planning/phases/06-installer-mechanics-copy-manifest-stub-generation/06-CONTEXT.md` §D-27 — Both read and write go through `csv-parse/sync`. Phase 7 extends reader with corrupt-row and containment-failure detection.
- `.planning/phases/06-installer-mechanics-copy-manifest-stub-generation/06-CONTEXT.md` §D-29 — Phase 6 already removes `.claude/skills/gm-agent-*/` atomically during the launcher generator run. Phase 7 adds the **legacy-only** path (no prior manifest present) where the same removal happens **before** any copy, gated by D-43's snapshot-first contract.

### Target of Phase 7 edits
- `tools/installer/core/installer.js` §`readFilesManifest` (lines 673-708) — Extend with: (a) BOM/CRLF normalization pass; (b) per-row containment check; (c) corrupt-row vs whole-manifest classification per D-33
- `tools/installer/core/installer.js` §`_prepareUpdateState` (lines 504-535) — Insert manifest-driven cleanup step: compute stale-entry list → snapshot to `_gomad/_backups/<ts>/` → remove. Coordinates with existing `_backupUserFiles` flow (D-41 Claude's Discretion)
- `tools/installer/core/installer.js` — New function (location TBD by planner): build cleanup-plan object describing `{ to_snapshot[], to_remove[], to_write[] }` for both dry-run output and actual execution
- `tools/installer/core/manifest-generator.js` §`writeFilesManifest` (lines 650+) — Add `_gomad/_backups/**` exclusion filter per D-39
- `tools/installer/gomad-cli.js` — Add `--dry-run` flag to Commander config; wire through to installer options
- `tools/installer/ide/platform-codes.yaml` — Source of truth for allowed install roots (D-32). No schema change; Phase 7 reads existing `installer:` blocks to enumerate valid roots
- `tools/installer/ide/_config-driven.js` §line 508 (`fs.realpath` already used) — Existing realpath pattern; Phase 7 reuses for containment check

### Source of truth — 7 legacy v1.1 artifact paths (D-42)
- `.claude/skills/gm-agent-analyst/`
- `.claude/skills/gm-agent-tech-writer/`
- `.claude/skills/gm-agent-pm/`
- `.claude/skills/gm-agent-ux-designer/`
- `.claude/skills/gm-agent-architect/`
- `.claude/skills/gm-agent-sm/`
- `.claude/skills/gm-agent-dev/`

### Test infrastructure (Phase 5 foundation)
- `test/test-gm-command-surface.js` — Existing install-smoke harness using `npm pack` + `gomad install --yes --directory <tempDir>`. Phase 7 tests extend the same harness pattern for cleanup scenarios (malformed manifest fixtures, legacy v1.1 workspace fixture, dry-run invocation).
- `test/test-installer-self-install-guard.js` — Defense-in-depth pattern; Phase 7's corrupt-manifest test follows the same fixture-driven shape.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- **`tools/installer/core/installer.js:readFilesManifest` (line 673)** — Already uses `csv-parse/sync` (Phase 6 D-27), resolves `install_root`-aware absolute paths (WR-01), falls back to `_gomad` default for v1 rows. Phase 7 extends with: BOM/CRLF normalization, per-row containment validation, corrupt-row skip logic. The function's error handling already uses `try/catch` + `prompts.log.warn` — Phase 7 upgrades this to distinguish MANIFEST_CORRUPT vs CORRUPT_ROW vs SYMLINK_ESCAPE per D-33/D-35.
- **`tools/installer/core/installer.js:_backupUserFiles` (line 545)** — Existing v1.1 pattern that backs up `customFiles` and `modifiedFiles` into `_gomad-custom-backup-temp` and `_gomad-modified-backup-temp`. Phase 7 adds a parallel snapshot flow rooted at `_gomad/_backups/<ts>/` for manifest-driven cleanup, keeping v1.1's temp-backup flow intact for the `detectCustomFiles` path (D-41 Claude's Discretion — planner may choose to unify).
- **`tools/installer/core/manifest-generator.js:writeFilesManifest` (line 650)** — Existing writer with header `type,name,module,path,hash,schema_version,install_root`. Phase 7 adds a prefix filter: any file under `_gomad/_backups/` is excluded per D-39. No schema change — only the discovery/write loop changes.
- **`tools/installer/ide/_config-driven.js:508` (`fs.realpath` usage)** — Existing pattern for resolving project-root realpath. Phase 7's containment check (D-32) reuses `fs.realpath` for every manifest entry's resolved absolute path + compares against `fs.realpath(workspaceRoot)` using `path.relative`-is-not-`..` or `path.startsWith`.
- **`tools/installer/ide/_config-driven.js:131-135` (legacy `gm-agent-*` removal in Phase 6)** — Already removes launcher-form legacy paths atomically via `launcherGen.removeLegacyAgentSkillDirs`. Phase 7's D-42/D-43 wraps this call with snapshot-first semantics for the "no prior manifest" branch.
- **`tools/installer/gomad-cli.js`** — Commander-based CLI; adding `--dry-run` follows the existing flag-definition pattern (e.g., `--yes`, `--self`, `--directory`). Flag propagates through to installer options object.
- **`fs-extra`** — Already a project dep. `fs.realpath`, `fs.lstat`, `fs.copy`, `fs.remove`, `fs.ensureDir`, `fs.pathExists` all available. No new dependencies (zero-new-deps constraint per PROJECT.md).
- **`csv-parse/sync`** — Already imported at `_config-driven.js:6`, `manifest-generator.js:5`, and `installer.js` (Phase 6 D-27). Phase 7's corrupt-row handling uses its built-in error semantics.

### Established Patterns

- **Data-driven IDE config (`platform-codes.yaml` + `_config-driven.js`)** — Phase 7's allowed-root allowlist (D-32) enumerates `platform-codes.yaml` entries, no hardcoded IDE list in cleanup code. Scales when a new IDE is added.
- **CommonJS throughout `tools/installer/`** — `require()` only; no ESM. Phase 7 edits stay CommonJS (PROJECT.md constraint).
- **Path normalization to forward slashes** — Phase 6 D-26 established this for manifest paths; Phase 7's backup structure (D-36) preserves the same normalization when building snapshot paths (`path.posix.join` for manifest storage; `path.join` for actual filesystem ops).
- **SHA-256 hashing via `manifest-generator.js:calculateFileHash`** — Reused for D-34's hash-mismatch detection and D-38's `orig_hash` metadata field.
- **`prompts.log.{info,warn,error}`** — Existing logging facade. Phase 7 uses `log.warn` for SYMLINK_ESCAPE and CORRUPT_ROW (non-fatal), `log.error` for MANIFEST_CORRUPT (skip-cleanup signal), `log.info` for snapshot / dry-run summary lines.
- **Test harness pattern (`npm pack` + `gomad install --yes --directory <tempDir>`)** — Phase 5 established this in `test/test-gm-command-surface.js`; Phase 7 extends with fixtures for malformed manifest, v1.1 legacy workspace, and `--dry-run` invocation.

### Integration Points

- **`installer.js:_prepareUpdateState`** — The natural insertion point for Phase 7's cleanup flow. Order: (1) read prior manifest with corrupt-detection → (2) if corrupt, log + skip to idempotent install; if not, compute stale-entry list → (3) build cleanup-plan object → (4) if `--dry-run`, print plan + exit; otherwise snapshot → remove → proceed with normal install.
- **`installer.js:install` main flow** — `--dry-run` must bail at the right point. After cleanup-plan is computed and manifest write-target is known (so the plan can describe "TO WRITE" paths), but BEFORE any `fs.copy` or `fs.remove` is called. Planner decides the exact exit point.
- **`_config-driven.js:cleanup` and `legacy_targets`** — Existing per-IDE cleanup mechanism (lines 253-286) operates on `platform-codes.yaml`-declared legacy paths. Phase 7's D-42 legacy cleanup is orthogonal — it targets a fixed list of 7 paths and runs only in the "no prior manifest" branch, NOT per-IDE-cleanup.
- **`manifest-generator.js` collection of all installed files** — Phase 7 exclusion of `_gomad/_backups/**` (D-39) must be applied at the collection step (before the write loop sees the paths) to avoid any chance of slipping a backup path into the written manifest.

</code_context>

<specifics>
## Specific Ideas

- **Failure mode is catastrophic: this phase is the v1.2 highest-severity risk.** Every design decision prioritizes "never delete outside install roots" over "upgrade thoroughness." When in doubt, snapshot + skip > delete aggressively.
- **Dry-run ≡ actual install, except disk writes.** The cleanup-plan compute step is the same code path for both. This is a correctness property: a user who runs `--dry-run`, reads the plan, then runs without `--dry-run` must see the identical actions executed. Planner must structure the cleanup logic so the "build plan" step is a pure function on `{ prior_manifest, new_manifest, workspace_state }` and the "execute plan" step is a separate, faithful consumer.
- **Backup directory is a terminal sink.** `_gomad/_backups/<ts>/` is written but never read by the installer except through user-initiated recovery (copy back manually). The installer never auto-restores, never auto-prunes (REL-F1 deferred), never migrates backup format across versions.
- **v1.1 upgrade is the primary test case.** The single scenario that matters most: user has a v1.1 workspace with the 7 `.claude/skills/gm-agent-*/` directories, some of which contain user-added custom files. They run `gomad install` (v1.2). Expected outcome: snapshot everything to `_gomad/_backups/<ts>/.claude/skills/gm-agent-*/`, remove directories cleanly, write new `.claude/commands/gm/agent-*.md` launchers + `_gomad/gomad/agents/*.md` personas, write fresh v2 manifest. User's custom.md is recoverable from the snapshot. Single E2E test that captures this is worth more than ten unit tests.
- **MANIFEST_CORRUPT is a log-and-skip, never a crash.** If the installer crashes on a bad manifest, users can't recover — the cleanup step blocks the install. By contrast, log + skip + idempotent-install means a malformed manifest degrades gracefully: user gets new files written, old orphans just stick around until manually cleaned. Recoverable state > terminal state.
- **Realpath check must handle missing files.** If a manifest entry points to a file that no longer exists (user manually deleted it between installs), `fs.realpath` throws `ENOENT`. Don't classify this as corrupt — log it as `already_removed` and skip that entry; it's a normal idempotency case.

</specifics>

<deferred>
## Deferred Ideas

- **Backup rotation / pruning policy** — REL-F1 explicitly deferred beyond v1.2. `_gomad/_backups/` grows unbounded; documentation calls this out. First-pass approach: user or a future maintenance skill prunes manually.
- **JSON dry-run output (`--dry-run-format=json`)** — Considered and deferred. v1.2 ships human-readable table only. If CI adoption motivates it, future release adds the flag.
- **Interactive destructive-op confirmation (>N-file threshold)** — Considered per PITFALLS.md #2 and rejected per D-41. `--dry-run` + structural safety nets substitute for interactive prompts.
- **Generic `gm-*` orphan sweep under `.claude/skills/`** — Considered and rejected per D-42. Blast radius too large (user-forked skills risk false-positive deletion). Manifest-diff handles drift from v1.2 onward.
- **Unified `_gomad/_backups/<ts>/` structure replacing v1.1's `_gomad-custom-backup-temp`** — Deferred to planner discretion (D-41 Claude's Discretion). Could be a later refactor if the parallel flows create maintenance friction.
- **`gomad restore` CLI command** — Considered for recovery UX (D-38 metadata points at a `cp -R` incantation). Not in v1.2; recovery is manual + documented. Future release could add a structured restore command.
- **Windows NTFS junction edge cases** — Handled opportunistically during implementation (Node.js ≥20 treats junctions as symlinks in `fs.lstat`/`fs.realpath`), surfaced explicitly in Phase 9 release verification (REL-04 CI matrix).
- **`--dry-run` depth of validation** — Deferred to planner (Claude's Discretion above). Shallow plan-only vs full-manifest-parse-with-validation both valid approaches.
- **Custom agents / skills support (CUSTOM-01/02/03)** — Explicitly out of v1.2 per PROJECT.md Deferred section.

</deferred>

---

*Phase: 07-upgrade-safety-manifest-driven-cleanup*
*Context gathered: 2026-04-20*
