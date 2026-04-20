# Phase 7: Upgrade Safety — Manifest-Driven Cleanup - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-20
**Phase:** 07-upgrade-safety-manifest-driven-cleanup
**Areas discussed:** Containment + corrupt-manifest policy, Backup layout + recovery, Dry-run UX + destructive-op confirmation, v1.1 legacy cleanup scope

---

## Containment + corrupt-manifest policy

### Allowed-root policy (→ D-32)

| Option | Description | Selected |
|--------|-------------|----------|
| Dynamic allowlist + realpath check | Roots derived from platform-codes.yaml PLUS per-entry realpath containment under fs.realpath(workspaceRoot). Closes absolute-path, `../`, and symlink-escape in one check. | ✓ |
| Dynamic allowlist only (no realpath) | Roots from platform-codes.yaml; skip realpath resolution. Simpler but leaves symlink-escape open. | |
| Static allowlist: _gomad, .claude only | Roadmap-literal read. Breaks multi-IDE legacy cleanup. | |

**User's choice:** Dynamic allowlist + realpath check (Recommended)

### MANIFEST_CORRUPT triggers (→ D-33)

| Option | Description | Selected |
|--------|-------------|----------|
| csv-parse throws OR header malformed | Whole-manifest corrupt — skip cleanup, idempotent install. | ✓ |
| Row missing required columns | Skip that row only; keep remaining rows. Whole-manifest corrupt only when every row fails. | ✓ |
| Any row path fails containment | Whole-manifest corrupt. Conservative: one bad row poisons the batch. | ✓ |
| BOM/CRLF strip silently (NOT corrupt) | Normalization, not corruption. | ✓ (strip silently) |
| Duplicate path entries | Warn and dedupe; not corrupt. | (not presented; default Claude's Discretion) |

**User's choice:** Four-way selection — all four policies adopted as described.

### Hash-mismatch policy (→ D-34)

| Option | Description | Selected |
|--------|-------------|----------|
| Snapshot to _backups/ then remove | Uniform deletion flow; hash-mismatch files marked `was_modified` in metadata.json. | ✓ |
| Snapshot + leave in place | User edit preserved on disk; stale-cleanup contract violated (orphan persists). | |
| Promote to .bak sibling + remove original | Mirrors v1.1 `_backupUserFiles` pattern; pollutes `.claude/` tree. | |

**User's choice:** Snapshot to _backups/ then remove (Recommended)

### Symlink-escape handling (→ D-35)

| Option | Description | Selected |
|--------|-------------|----------|
| Refuse + log + continue | Non-fatal; one rogue entry shouldn't abort the upgrade. | ✓ |
| Refuse + abort cleanup entirely | Same posture as MANIFEST_CORRUPT. Safest but blocks legitimate upgrades. | |
| Unlink symlink + skip target | Distinguishes entry-is-symlink vs entry-realpath-escapes. More code. | |

**User's choice:** Refuse + log + continue (Recommended)

---

## Backup layout + recovery

### Backup tree structure (→ D-36)

| Option | Description | Selected |
|--------|-------------|----------|
| Preserve install_root + relative path | `_backups/<ts>/.claude/commands/gm/agent-pm.md`. Recovery = `cp -R <ts>/* ./`. | ✓ |
| Flatten with hash suffix for collisions | All files at backup root; metadata.json maps back to original paths. | |
| Split by install_root only | `_backups/<ts>/<root>/...` but no root-prefix dir. Cosmetic difference from option 1. | |

**User's choice:** Preserve install_root + relative path (Recommended)

### Timestamp format (→ D-37)

| Option | Description | Selected |
|--------|-------------|----------|
| `YYYYMMDD-HHMMSS` | Filesystem/Windows-safe; sortable; readable. | ✓ |
| ISO 8601 with Z, colons replaced | Full timezone info; standard format; verbose. | |
| Unix epoch seconds | Shortest, unique, sortable — but not human-readable. | |

**User's choice:** `YYYYMMDD-HHMMSS` (Recommended)

### metadata.json requirement (→ D-38)

| Option | Description | Selected |
|--------|-------------|----------|
| Mandatory, with manifest + recovery hint | `{gomad_version, created_at, reason, files[], recovery_hint}`. | ✓ |
| Minimal manifest only (no recovery text) | Files list only; recovery doc lives in project docs. | |
| None; directory structure self-explains | No extra file. Loses `was_modified` marker and audit info. | |

**User's choice:** Mandatory with manifest + recovery hint (Recommended)

### Self-tracking rule for `_gomad/_backups/` (→ D-39)

| Option | Description | Selected |
|--------|-------------|----------|
| Excluded from files-manifest.csv | Prevents backup-of-backup recursion; respects REL-F1 rotation defer. | ✓ |
| Tracked as generated artifact | Next cleanup discovers and removes; but violates REL-F1 and causes recursive backup growth. | |
| Partial: track directory, not contents | Middle ground; behavior complexity not worth the marginal cleanup benefit. | |

**User's choice:** Excluded from manifest (Recommended)

---

## Dry-run UX + destructive-op confirmation

### `--dry-run` output format (→ D-40)

| Option | Description | Selected |
|--------|-------------|----------|
| Human table + summary counts | Grouped by section (TO SNAPSHOT / TO REMOVE / TO WRITE) with counts. | ✓ |
| Human table + optional `--dry-run-format=json` | Default human, optional JSON for CI. | (JSON deferred) |
| Plain structured text only | `ACTION<TAB>path<TAB>reason`; pipe-friendly but visually poor. | |

**User's choice:** Human table + summary counts (Recommended); JSON format deferred beyond v1.2.

### Destructive-op interactive confirmation (→ D-41)

| Option | Description | Selected |
|--------|-------------|----------|
| No confirmation — run `--dry-run` for preview | Single flow; CI-unblocked; safety via realpath containment + backup. | ✓ |
| Confirm when >20 files will be removed, `--yes` bypass | Per PITFALLS.md #2; adds TTY-dependency to the normal path. | |
| Always confirm (any deletion) unless `--yes` | Most conservative; every upgrade gains an interactive gate. | |

**User's choice:** No confirmation — run `--dry-run` for preview (Recommended)

---

## v1.1 legacy cleanup scope

### Scope breadth (→ D-42)

| Option | Description | Selected |
|--------|-------------|----------|
| 7 known gm-agent-* paths only | Minimum blast radius; aligns with REQ-07 literal; user-forked skills safe. | ✓ |
| 7 paths + broader gm-* orphan sweep | More thorough; risks deleting user-forked same-prefixed dirs. | |
| Defensive: 7 paths + per-orphan user confirmation | Safest but adds interactive boundary. | |

**User's choice:** 7 paths only (Recommended)

### User files inside legacy paths (→ D-43)

| Option | Description | Selected |
|--------|-------------|----------|
| Snapshot entire directory + remove | Preserves user edits under snapshot; clean upgrade state. | ✓ |
| Remove known files only, keep user files | v1.1 had no manifest to distinguish; orphan shell left. | |
| Abort when non-known file detected | Blocks legitimate upgrades for any custom.md. | |

**User's choice:** Snapshot entire directory + remove (Recommended)

---

## Claude's Discretion (explicit)

- Error-message wording for MANIFEST_CORRUPT / SYMLINK_ESCAPE / containment-rejection logs
- Table visual treatment in `--dry-run` output
- Recovery documentation placement (per-snapshot README, project-level doc, or `gomad restore` CLI command)
- Plan decomposition — bundle all 5 capabilities vs split
- Integration strategy with existing v1.1 `_backupUserFiles` flow (parallel vs unified)
- `--dry-run` validation depth (shallow plan-only vs full manifest-parse with validation)
- Test fixture design for corrupt-manifest scenarios
- Implementation of `_gomad/_backups/**` exclusion (filter in write path vs constant allow-list)
- Windows-specific edge cases (NTFS junctions under `fs.realpath`; `fs.copy` permission-preserve semantics)

## Deferred Ideas

- REL-F1: backup rotation/pruning policy (explicit v1.2 defer)
- `--dry-run-format=json` output
- Interactive >N-file confirmation prompt
- Generic `gm-*` orphan sweep under `.claude/skills/`
- Unified backup flow replacing v1.1's `_gomad-custom-backup-temp`
- `gomad restore` CLI command
- CUSTOM-01/02/03 (out of v1.2 entirely)
