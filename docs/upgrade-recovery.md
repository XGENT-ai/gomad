---
title: "Upgrade Recovery"
description: How manifest-driven cleanup snapshots work and how to restore from them
---

Starting with gomad v1.2, every `gomad install` that removes files takes a snapshot of those files into a timestamped directory under `_gomad/_backups/<YYYYMMDD-HHMMSS>/`. This document explains how those snapshots are structured and how to restore from them.

## Backup directory layout

When `gomad install` performs a manifest-driven cleanup, it creates:

```
_gomad/_backups/<YYYYMMDD-HHMMSS>/
├── metadata.json           # machine-readable backup manifest
├── README.md               # auto-generated recovery instructions (co-located)
├── .claude/                # snapshots of files that were installed under .claude/
│   └── commands/gm/agent-pm.md
├── _gomad/                 # snapshots of files that were installed under _gomad/
│   └── gomad/agents/pm.md
└── .cursor/                # snapshots from any IDE-target install_root
    └── ...
```

Each top-level directory under `<YYYYMMDD-HHMMSS>/` corresponds to an `install_root` value from `_gomad/_config/files-manifest.csv`. Inside each, the relative-path structure mirrors the original workspace layout.

## metadata.json schema

```json
{
  "gomad_version": "1.2.0",
  "created_at": "2026-04-20T14:30:52.123+09:00",
  "reason": "manifest_cleanup",
  "files": [
    {
      "install_root": ".claude",
      "relative_path": "commands/gm/agent-pm.md",
      "orig_hash": "<sha256 from files-manifest.csv, or null>",
      "was_modified": false
    }
  ],
  "recovery_hint": "Restore with: cp -R $(pwd)/_gomad/_backups/20260420-143052/* ./"
}
```

| Field | Purpose |
|-------|---------|
| `gomad_version` | The gomad version that produced this backup. Recovery should verify compatibility with your current install. |
| `created_at` | Full ISO 8601 timestamp with timezone — disambiguates among same-second installs. |
| `reason` | One of `manifest_cleanup`, `legacy_v1_cleanup`. |
| `files[]` | Per-file record. `was_modified` is `true` when the file on disk differed from the stored manifest hash, `false` when it matched, `null` for v1.1 legacy backups (no hash was stored). |
| `recovery_hint` | One-line shell command that restores from this backup. |

## How to restore

### Quick recovery

From the workspace root:

```bash
cp -R $(pwd)/_gomad/_backups/<YYYYMMDD-HHMMSS>/* ./
```

Replace `<YYYYMMDD-HHMMSS>` with the directory name of the backup you want.

### Restore file content only (skip metadata.json and README.md)

```bash
rsync -a --exclude=metadata.json --exclude=README.md \
  $(pwd)/_gomad/_backups/<YYYYMMDD-HHMMSS>/ ./
```

### Before restoring — version compat check

Compare `metadata.json.gomad_version` to your currently-installed gomad version:

```bash
cat _gomad/_backups/<YYYYMMDD-HHMMSS>/metadata.json | grep gomad_version
npx gomad --version
```

If the versions differ, the install_root semantics may have changed. Recovering a v1.2-vintage backup onto a v1.3+ install should still work for file content, but paths may land in locations the new installer no longer manages — you may end up with orphaned files. When in doubt, copy a single file at a time.

## Identifying which backup to restore

Each `_gomad/_backups/<YYYYMMDD-HHMMSS>/` directory is sortable chronologically (lexicographic order matches chronological order by construction of the D-37 timestamp format). Two installs within the same second produce `<ts>` and `<ts>-2` suffixes.

Each backup directory also contains an auto-generated `README.md` with the exact `cp -R` command for that specific snapshot.

## Pruning backups

Backups are user-managed in v1.2 — the installer never deletes or rotates old snapshots. Each backup directory is a self-contained tree you can safely remove:

```bash
rm -rf _gomad/_backups/20260401-*   # remove all April-1st backups
```

Automated rotation is deferred to a future gomad release.

## When backups are NOT produced

No backup is created when:

- `gomad install` runs on a fresh workspace (nothing to snapshot)
- The new install set is identical to the prior — idempotent re-install
- A manifest corruption is detected (`MANIFEST_CORRUPT` logged) — cleanup is skipped entirely as a safety measure

In these cases, `_gomad/_backups/` may remain empty or contain only earlier backups.

## v1.2 → v1.3 recovery

When upgrading from v1.2.0 to v1.3.0, the installer relocates persona body
files from `_gomad/gomad/agents/<shortName>.md` to
`_gomad/_config/agents/<shortName>.md`. The 8 old files are snapshotted
into `_gomad/_backups/<YYYYMMDD-HHMMSS>/_gomad/gomad/agents/` before removal.

The v1.3 cleanup planner detects v1.2 layouts via the presence of both a
`_gomad/_config/files-manifest.csv` (v2 schema) AND at least one persona
file at `_gomad/gomad/agents/`. When detected, the migration emits a
verbose banner naming the move, the backup location, and this recovery
document.

### Rollback to v1.2 layout

If `/gm:agent-*` invocation fails after upgrade, or you need to roll back to
v1.2.0:

1. Re-pin the v1.2 release globally:

   ```bash
   npm install -g @xgent-ai/gomad@1.2.0
   ```

2. Restore the snapshotted persona files (substitute the actual timestamp
   from `_gomad/_backups/`):

   ```bash
   cp -R _gomad/_backups/<YYYYMMDD-HHMMSS>/_gomad/gomad/agents/ _gomad/gomad/
   ```

3. Re-run `gomad install` against the v1.2 binary — the installer will
   regenerate launcher stubs (`/gm:agent-*`) pointing at the restored
   `_gomad/gomad/agents/` location:

   ```bash
   gomad install
   ```

### Forward recovery

If only the launcher stubs are stale (the persona body files are at the
new `_config/agents/` location but `/gm:agent-*` 404s), re-run
`gomad install`. The `writeAgentLaunchers` step overwrites launcher stubs
unconditionally and will regenerate them with the v1.3 path.

```bash
gomad install
```

### What the .customize.yaml semantics look like

User overrides at `_gomad/_config/agents/.customize.yaml` are preserved
across the v1.2→v1.3 upgrade. The custom-file detector treats the 8
generated persona `.md` files as installer-managed and leaves
`.customize.yaml` and any non-matching `.md` files untouched.
