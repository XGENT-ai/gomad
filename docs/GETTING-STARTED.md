<!-- generated-by: gsd-doc-writer -->
# Getting Started

This guide walks you from zero to a curated `./.claude/` directory in your
project using `gomad`. Everything installs **project-locally** — nothing is
written to your home directory.

## Prerequisites

- **Node.js** `>= 18.0.0` — required to run the CLI via `npx`.
- **Claude Code CLI** — installed and working in the project you want to
  augment. `gomad` populates `./.claude/`, which Claude Code reads on startup.
- A **project directory** (any repo) where you want curated rules, agents,
  commands, and hooks installed.

No global install is required. `gomad` runs directly through `npx` and writes
only to the current working directory.

## 1. Install with a preset (fastest path)

From the root of your project, run a non-interactive install with a preset:

```bash
npx @xgent-ai/gomad install --preset full --yes
```

This does three things:

1. Resolves the `full` preset into a concrete selection list.
2. Writes `gomad.lock.yaml` to your project root (the selection record).
3. Copies the selected assets into `./.claude/` and writes a manifest.

Available presets (pass any of these to `--preset`):

- `full` — everything in the catalog.
- `full-stack` — default preset for general web/full-stack projects.
- `python-only` — Python-focused skills and agents.
- `enterprise` — enterprise-oriented bundle.
- `lean` — minimal curated set.
- `enhanced` — enhanced baseline.

The `--yes` flag skips all interactive prompts and accepts the preset defaults.

## 2. Interactive curation (pick exactly what you want)

If you want to review and toggle individual items, run `install` without
`--yes`:

```bash
npx @xgent-ai/gomad install
```

This launches the curator:

1. **Preset picker** — choose a starting preset as a baseline.
2. **Per-item toggles** — review the resolved skills, agents, commands, and
   hooks and check/uncheck individual entries.
3. **Confirm** — selections are written to `gomad.lock.yaml`, then assets are
   installed into `./.claude/`.

You can also run curation without installing using:

```bash
npx @xgent-ai/gomad curate
```

This updates the lockfile only. The next `install` run will use it.

## 3. Verify the install

Check what landed in the project:

```bash
npx @xgent-ai/gomad status
```

You will see the install timestamp, the version, the `.claude/` location, and
per-asset-type file counts (rules, commands, hooks, agents), plus the current
lockfile selection counts for skills, agents, commands, and hooks.

If the status command reports `No gomad installation found`, the install step
has not been run (or was uninstalled) — re-run step 1 or 2.

## 4. Uninstall

To remove everything `gomad` installed from the current project:

```bash
npx @xgent-ai/gomad uninstall
```

This reads `./.claude/.gomad-manifest.yaml` and removes only the files it
originally installed. User-authored files in `./.claude/` are preserved. Empty
directories left behind are pruned. The manifest file is then deleted. The
`gomad.lock.yaml` file is **not** removed — your selections persist so a later
`install` can reproduce the same tree.

## 5. Where things land

`gomad install` writes to the following project-local locations:

| Asset type | Destination                    |
| ---------- | ------------------------------ |
| rules      | `./.claude/rules/`             |
| commands   | `./.claude/commands/`          |
| agents     | `./.claude/agents/`            |
| hooks      | `./.claude/scripts/hooks/`     |

Nothing is written outside the current working directory.

## 6. The lockfile and manifest

Two bookkeeping files control reproducibility and safe uninstall:

- **`gomad.lock.yaml`** (project root) — the **selection record**. Produced by
  `curate` or `install`, it lists the exact skills, agents, commands, and
  hooks you picked (plus the preset version). Commit this to your repo so
  teammates and CI get the same curated set when they run `gomad install`.

- **`./.claude/.gomad-manifest.yaml`** — the **install record**. Produced by
  `install`, it lists every file that was copied into `./.claude/`, grouped by
  asset type, with an `installed_at` timestamp and version. This is what
  `status` reads and what `uninstall` uses to remove files precisely without
  touching anything you added yourself.

Rule of thumb: **commit the lockfile, ignore the manifest.** Add
`.claude/.gomad-manifest.yaml` to `.gitignore` if it ends up tracked.

## Next steps

- See [ARCHITECTURE.md](./ARCHITECTURE.md) for how the curator, installer, and
  catalog layers fit together.
- See [CONFIGURATION.md](./CONFIGURATION.md) for lockfile schema details and
  advanced selection overrides.
- Re-run `npx @xgent-ai/gomad install` any time you change `gomad.lock.yaml`
  by hand — the installer merges new files in and the manifest will track
  them on the next run.
