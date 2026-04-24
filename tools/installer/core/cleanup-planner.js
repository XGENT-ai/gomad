'use strict';

/**
 * cleanup-planner.js — Phase 7 Pure Plan Builder + Helpers
 *
 * Houses the pure-logic surface for manifest-driven cleanup:
 *   - Helpers: isContained, isV11Legacy, formatTimestamp, uniqueBackupDir
 *   - Constants: LEGACY_AGENT_SHORT_NAMES (D-42 source of truth, derived
 *     from AgentCommandGenerator.AGENT_SOURCES — never duplicated)
 *   - Errors: ManifestCorruptError (D-33 whole-batch-poison signal)
 *   - Plan builder: buildCleanupPlan (added in Task 3)
 *
 * The defining property of this module: zero filesystem WRITES. Realpath
 * reads are allowed (for D-32 containment checks). The plan/execute split
 * (executor lives in plan 07-02) preserves the dry-run-equals-actual
 * invariant per D-41.
 *
 * Dependencies:
 *   - fs-extra for fs.realpath / fs.pathExists (no writes from this module)
 *   - AgentCommandGenerator for the canonical 7-shortName list (D-42)
 *
 * @module cleanup-planner
 */

const path = require('node:path');
const fs = require('fs-extra');
const { AgentCommandGenerator } = require('../ide/shared/agent-command-generator');
const { ManifestGenerator } = require('./manifest-generator');
const prompts = require('../prompts');

/**
 * D-42 source of truth — the 7 known v1.1 agent skill short names. Derived
 * from AgentCommandGenerator.AGENT_SOURCES so a future addition/removal of
 * an agent flows through automatically (one source of truth per CLAUDE.md
 * common rules — no duplicated lists).
 *
 * Order: ['analyst', 'tech-writer', 'pm', 'ux-designer', 'architect', 'sm', 'dev', 'solo-dev']
 *
 * @type {ReadonlyArray<string>}
 */
const LEGACY_AGENT_SHORT_NAMES = AgentCommandGenerator.AGENT_SOURCES.map((a) => a.shortName);

/**
 * Custom error class signaling that the whole manifest must be treated as
 * corrupt (D-33 poison-batch posture). Thrown by buildCleanupPlan when an
 * entry's resolved realpath escapes the workspace; thrown / caught at the
 * caller boundary which logs the failure and skips cleanup entirely
 * (idempotent install continues).
 */
class ManifestCorruptError extends Error {
  /**
   * @param {string} message
   * @param {string} [code='MANIFEST_CORRUPT'] — short code for log classification
   */
  constructor(message, code = 'MANIFEST_CORRUPT') {
    super(message);
    this.name = 'ManifestCorruptError';
    this.code = code;
  }
}

/**
 * Check whether a realpath-resolved path is contained within wsRoot.
 *
 * Caller's responsibility:
 *   - Both `resolved` and `wsRoot` MUST already be realpath-resolved
 *     absolute paths (no symlinks remaining).
 *   - For destructive operations, ALWAYS realpath the candidate path
 *     BEFORE calling this — never check containment on a `path.join` result.
 *
 * Why path.relative (not startsWith): `'/foo'.startsWith('/fo')` is true
 * even though `/fo` is a different directory. `path.relative` handles
 * separator semantics correctly across platforms.
 *
 * @param {string} resolved — realpath-resolved absolute path to check
 * @param {string} wsRoot — realpath-resolved workspace root
 * @returns {boolean} true iff resolved is wsRoot or a descendant of wsRoot
 */
function isContained(resolved, wsRoot) {
  const rel = path.relative(wsRoot, resolved);
  if (rel === '') return true; // resolved === wsRoot
  if (path.isAbsolute(rel)) return false; // different filesystem root
  if (rel === '..' || rel.startsWith('..' + path.sep)) return false; // parent traversal
  return true;
}

/**
 * Format a Date as YYYYMMDD-HHMMSS in local time per D-37.
 *
 * Filesystem-safe (no colons → Windows-friendly), lexicographically
 * orderable (chronological), 15 chars total. Local time only — no
 * timezone in the name (timezone fidelity lives in metadata.json's
 * ISO 8601 `created_at` field).
 *
 * Uses manual padStart (not toISOString) because toISOString returns UTC
 * and includes separators we don't want.
 *
 * @param {Date} [date=new Date()]
 * @returns {string} 15-char string matching /^\d{8}-\d{6}$/
 */
function formatTimestamp(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return (
    String(date.getFullYear()).padStart(4, '0') +
    pad(date.getMonth() + 1) +
    pad(date.getDate()) +
    '-' +
    pad(date.getHours()) +
    pad(date.getMinutes()) +
    pad(date.getSeconds())
  );
}

/**
 * Return a unique backup directory path under workspaceRoot/_gomad/_backups/.
 * If `<baseTs>` already exists (Pitfall 21 — two installs in the same
 * second), append `-2`, then `-3`, etc. until unique.
 *
 * This is a READ-ONLY check — no directory is created here. Callers
 * (executor in plan 07-02) are responsible for `fs.ensureDir` after
 * obtaining the unique path.
 *
 * @param {string} workspaceRoot — absolute path
 * @param {string} baseTs — timestamp from formatTimestamp(), e.g. '20260420-143052'
 * @returns {Promise<string>} absolute path to a non-existent backup directory
 */
async function uniqueBackupDir(workspaceRoot, baseTs) {
  const baseDir = path.join(workspaceRoot, '_gomad', '_backups', baseTs);
  if (!(await fs.pathExists(baseDir))) return baseDir;
  let i = 2;
  while (await fs.pathExists(`${baseDir}-${i}`)) {
    i++;
  }
  return `${baseDir}-${i}`;
}

/**
 * Detect whether the workspace is a v1.1 install (no v2 manifest yet).
 *
 * Signal: NO `_gomad/_config/files-manifest.csv` AND ≥1 of the 7 known
 * `.claude/skills/gm-agent-XXX/` directories exists. Per D-42 — the legacy
 * cleanup is strictly scoped to those 7 paths (no generic gm-* sweep).
 *
 * @param {string} workspaceRoot — absolute path
 * @param {string} gomadDir — absolute path to the workspace's _gomad dir
 * @returns {Promise<boolean>}
 */
async function isV11Legacy(workspaceRoot, gomadDir) {
  const manifestPath = path.join(gomadDir, '_config', 'files-manifest.csv');
  if (await fs.pathExists(manifestPath)) return false;
  for (const shortName of LEGACY_AGENT_SHORT_NAMES) {
    const legacyDir = path.join(workspaceRoot, '.claude', 'skills', `gm-agent-${shortName}`);
    if (await fs.pathExists(legacyDir)) return true;
  }
  return false;
}

/**
 * Build a cleanup plan describing what the installer will snapshot, remove,
 * and write. PURE function — no filesystem WRITES. Performs realpath READS
 * and SHA-256 hash READS only.
 *
 * The plan object is consumed by:
 *   - Plan 07-02 executor (executeCleanupPlan): snapshot → metadata → remove
 *   - Plan 07-02 dry-run renderer (renderPlan): print to stdout, exit 0
 *
 * The dry-run-equals-actual invariant (D-41) depends on this function being
 * a pure function on its inputs.
 *
 * @param {Object} input
 * @param {Array<Object>} input.priorManifest — rows from installer.readFilesManifest
 *   (each: { type, name, module, path, hash, schema_version, install_root, absolutePath })
 * @param {Set<string>} input.newInstallSet — absolute realpath-resolved paths
 *   the new install will write
 * @param {string} input.workspaceRoot — realpath-resolved workspace root
 *   (caller's responsibility to fs.realpath this BEFORE invoking)
 * @param {Set<string>} input.allowedRoots — install_root values from
 *   platform-codes.yaml + ['_gomad', '.claude'] sentinels
 * @param {boolean} input.isV11Legacy — true if no prior manifest AND ≥1 of
 *   the 7 legacy gm-agent-* dirs (use isV11Legacy() to compute)
 * @param {ManifestGenerator} [input.manifestGen] — optional injected hash
 *   computer (defaults to a fresh ManifestGenerator instance for D-34
 *   was_modified detection)
 *
 * @returns {Promise<{
 *   to_snapshot: Array<{src: string, install_root: string, relative_path: string, orig_hash: string|null, was_modified: boolean|null}>,
 *   to_remove: Array<string>,
 *   to_write: Array<string>,
 *   refused: Array<{idx: number|null, entry: object, reason: string}>,
 *   reason: 'manifest_cleanup' | 'legacy_v1_cleanup'
 * }>}
 *
 * @throws {ManifestCorruptError} when any prior-manifest entry's resolved
 *   realpath escapes workspaceRoot (D-32 + D-33 poison-batch posture).
 *   Per-entry SYMLINK_ESCAPE log is emitted BEFORE the throw so the
 *   specific failing entry is captured.
 */
async function buildCleanupPlan(input) {
  const { priorManifest, newInstallSet, workspaceRoot, allowedRoots, isV11Legacy: v11, manifestGen } = input;
  const hashGen = manifestGen || new ManifestGenerator();

  const plan = {
    to_snapshot: [],
    to_remove: [],
    to_write: [...newInstallSet],
    refused: [],
    reason: v11 ? 'legacy_v1_cleanup' : 'manifest_cleanup',
  };

  if (v11) {
    // D-42 + D-43: 7 known dirs only; snapshot whole dir; was_modified=null
    // (v1.1 had no hash manifest, so modification status is unknown).
    // Conservatively realpath + containment-check each legacy dir so a
    // symlinked legacy dir doesn't escape via the snapshot side door.
    for (const shortName of LEGACY_AGENT_SHORT_NAMES) {
      const legacyDir = path.join(workspaceRoot, '.claude', 'skills', `gm-agent-${shortName}`);
      if (!(await fs.pathExists(legacyDir))) continue;

      let resolved;
      try {
        resolved = await fs.realpath(legacyDir);
      } catch (error) {
        if (error.code === 'ENOENT') continue; // race: removed between pathExists and realpath
        throw error;
      }

      if (!isContained(resolved, workspaceRoot)) {
        // SYMLINK_ESCAPE on a legacy dir is non-fatal per D-35 (legacy branch
        // tolerates rogue per-entry); refuse this entry and continue.
        await prompts.log.warn('SYMLINK_ESCAPE: ' + legacyDir + ' → ' + resolved + ', refusing to touch');
        plan.refused.push({ idx: null, entry: { path: legacyDir }, reason: 'SYMLINK_ESCAPE' });
        continue;
      }

      plan.to_snapshot.push({
        src: resolved,
        install_root: '.claude',
        relative_path: path.posix.join('skills', 'gm-agent-' + shortName),
        orig_hash: null,
        was_modified: null,
      });
      plan.to_remove.push(resolved);
    }
    return plan;
  }

  // ─── Standard manifest-diff branch ──────────────────────────────────
  for (const [idx, entry] of priorManifest.entries()) {
    const installRoot = entry.install_root || '_gomad';

    // D-32 allow-list check: install_root must be in the configured set.
    if (!allowedRoots.has(installRoot)) {
      plan.refused.push({ idx, entry, reason: 'UNKNOWN_INSTALL_ROOT' });
      continue;
    }

    const joined = entry.absolutePath || path.join(workspaceRoot, installRoot, entry.path || '');

    // Realpath BEFORE containment per D-32 + RESEARCH.md Pattern 2.
    let resolved;
    try {
      resolved = await fs.realpath(joined);
    } catch (error) {
      if (error.code === 'ENOENT') {
        // Pitfall 22: user manually deleted between installs. Normal
        // idempotency case — skip silently, do NOT classify as corrupt.
        continue;
      }
      throw error;
    }

    // D-32 containment check on resolved (realpath'd) path.
    if (!isContained(resolved, workspaceRoot)) {
      // D-32 + D-35: log per-entry SYMLINK_ESCAPE before poisoning the
      // batch (D-33 conservatism). The log captures the offending entry
      // even when the batch poison short-circuits processing.
      await prompts.log.warn('SYMLINK_ESCAPE: ' + joined + ' → ' + resolved + ', refusing to touch');
      throw new ManifestCorruptError('CONTAINMENT_FAIL: row ' + idx + ' escapes workspace: ' + resolved);
    }

    // Still-needed entry — preserved (no snapshot, no remove).
    if (newInstallSet.has(resolved)) continue;

    // Stale entry — D-34 hash-mismatch check feeds was_modified marker
    // (consumed by metadata.json in plan 07-02 + dry-run renderer).
    const orig_hash = entry.hash || null;
    let was_modified = false;
    if (orig_hash) {
      const currentHash = await hashGen.calculateFileHash(resolved);
      was_modified = currentHash !== orig_hash;
    }

    // D-26 + D-36: relative_path is forward-slash normalized for
    // serialization (metadata.json files[].relative_path).
    // Phase 7 WR-04: the earlier `installRoot === '_gomad' ? ... : ...` ternary
    // collapsed both branches to the same path.join, so it was dead conditional
    // logic. If a future decision remaps '_gomad' to a different directory,
    // re-introduce the branch here and document the asymmetry explicitly.
    const rootAbs = path.join(workspaceRoot, installRoot);
    const relNative = path.relative(rootAbs, resolved);
    const relative_path = relNative.split(path.sep).join('/');

    plan.to_snapshot.push({
      src: resolved,
      install_root: installRoot,
      relative_path,
      orig_hash,
      was_modified,
    });
    plan.to_remove.push(resolved);
  }

  return plan;
}

/**
 * Snapshot files into backupRoot/<install_root>/<relative_path>, preserving
 * the install-root tree structure per D-36. Sequential; if any copy fails,
 * the returned promise rejects BEFORE the next iteration runs.
 *
 * `preserveTimestamps: true` is best-effort per D-36 — mtime is preserved
 * within a few-second tolerance on most filesystems.
 *
 * @param {Array<{src: string, install_root: string, relative_path: string}>} toSnapshot
 * @param {string} backupRoot — absolute path to the backup dir root
 * @returns {Promise<void>}
 */
async function snapshotFiles(toSnapshot, backupRoot) {
  for (const item of toSnapshot) {
    const backupPath = path.join(backupRoot, item.install_root, ...item.relative_path.split('/'));
    await fs.ensureDir(path.dirname(backupPath));
    await fs.copy(item.src, backupPath, { preserveTimestamps: true });
  }
}

/**
 * Write the D-38 mandatory metadata.json file into backupRoot.
 *
 * Schema (D-38):
 *   gomad_version — string, from package.json version
 *   created_at    — ISO 8601 with timezone (new Date().toISOString())
 *   reason        — 'manifest_cleanup' | 'legacy_v1_cleanup'
 *   files[]       — per-file record (install_root, relative_path, orig_hash, was_modified)
 *   recovery_hint — one-line shell command for quick restore
 *
 * Hash-at-plan-time invariant: orig_hash + was_modified are preserved
 * VERBATIM from plan.to_snapshot[] — no re-hashing at execute time.
 *
 * @param {string} backupRoot — absolute path to the backup dir root
 * @param {{gomadVersion: string, plan: object}} opts
 * @returns {Promise<void>}
 */
async function writeMetadata(backupRoot, { gomadVersion, plan }) {
  const metadata = {
    gomad_version: gomadVersion,
    created_at: new Date().toISOString(),
    reason: plan.reason,
    files: plan.to_snapshot.map((item) => ({
      install_root: item.install_root,
      relative_path: item.relative_path,
      orig_hash: item.orig_hash === undefined ? null : item.orig_hash,
      was_modified: item.was_modified === undefined ? null : item.was_modified,
    })),
    recovery_hint: `Restore with: cp -R $(pwd)/_gomad/_backups/${path.basename(backupRoot)}/* ./`,
  };
  await fs.writeFile(path.join(backupRoot, 'metadata.json'), JSON.stringify(metadata, null, 2) + '\n');
}

/**
 * Write the auto-generated README.md into backupRoot. Co-located with
 * metadata.json; points users at the full recovery docs
 * (docs/upgrade-recovery.md in the gomad package).
 *
 * @param {string} backupRoot — absolute path to the backup dir root
 * @param {{gomadVersion: string}} opts
 * @returns {Promise<void>}
 */
async function writeBackupReadme(backupRoot, { gomadVersion }) {
  const ts = path.basename(backupRoot);
  const body = [
    `# GoMad Upgrade Backup — ${ts}`,
    '',
    `This directory was created by \`gomad install\` (v${gomadVersion}) on ${new Date().toISOString()}.`,
    '',
    "## What's here",
    '',
    '- `metadata.json` — machine-readable backup manifest (see `files[]` for file list)',
    '- `<install_root>/...` — snapshots of files that were removed during upgrade',
    '',
    '## How to restore',
    '',
    '```bash',
    `cp -R $(pwd)/_gomad/_backups/${ts}/* ./`,
    '```',
    '',
    'Exclude `metadata.json` and this README if you only want the file content back:',
    '',
    '```bash',
    'rsync -a --exclude=metadata.json --exclude=README.md \\',
    `  $(pwd)/_gomad/_backups/${ts}/ ./`,
    '```',
    '',
    'See `docs/upgrade-recovery.md` in the gomad package for full documentation,',
    'including a version compat check on `metadata.json.gomad_version` before recovery.',
    '',
  ].join('\n');
  await fs.writeFile(path.join(backupRoot, 'README.md'), body);
}

/**
 * Faithful executor for the cleanup plan. Consumes the plan object from
 * `buildCleanupPlan` verbatim — no branching on dry-run state (dry-run is
 * handled at the caller site structurally via `process.exit(0)` BEFORE this
 * function is reached).
 *
 * Order (D-34 snapshot-before-remove invariant):
 *   1. snapshot all files → backupRoot/<install_root>/<relative_path>
 *   2. writeMetadata      → backupRoot/metadata.json
 *   3. writeBackupReadme  → backupRoot/README.md
 *   4. fs.remove loop     → remove each plan.to_remove entry
 *
 * NO try/catch around the chain. If snapshotFiles rejects (ENOSPC, EACCES,
 * ENOTDIR parent blocker), the `await` propagates and fs.remove NEVER runs.
 * Original data intact.
 *
 * @param {object} plan — from buildCleanupPlan
 * @param {string} workspaceRoot — realpath-resolved workspace root
 * @param {string} gomadVersion — from package.json version
 * @returns {Promise<string|null>} — absolute path to backup dir, or null if
 *   plan was empty (no snapshot + no remove ⇒ no work ⇒ no dir created)
 */
async function executeCleanupPlan(plan, workspaceRoot, gomadVersion) {
  if (plan.to_snapshot.length === 0 && plan.to_remove.length === 0) {
    return null;
  }
  const baseTs = formatTimestamp(new Date());
  const backupRoot = await uniqueBackupDir(workspaceRoot, baseTs);

  // Phase 7 WR-03: wrap the pre-remove phase (ensureDir → snapshot → metadata →
  // README) in a rollback. If any step rejects, best-effort remove the partial
  // backup dir so the user doesn't accumulate orphaned half-snapshots in
  // `_gomad/_backups/` over time. D-34 is preserved because fs.remove never
  // runs — originals stay intact regardless of rollback success.
  try {
    await fs.ensureDir(backupRoot);
    await snapshotFiles(plan.to_snapshot, backupRoot);
    await writeMetadata(backupRoot, { gomadVersion, plan });
    await writeBackupReadme(backupRoot, { gomadVersion });
  } catch (error) {
    await fs.remove(backupRoot).catch(() => {}); // best-effort; do not mask the original error
    throw error;
  }

  for (const target of plan.to_remove) {
    await fs.remove(target);
  }
  return backupRoot;
}

/**
 * Render the plan as a human-readable table per D-40. Pure — no side effects.
 *
 * Output shape:
 *   TO SNAPSHOT (N files)
 *     <install_root>/<relative_path>    (annotation)
 *   TO REMOVE (N files)
 *     <same list — snapshot is prerequisite>
 *   TO WRITE (N files)
 *     <absolute-path>
 *   Summary: S snapshotted, R removed, W written
 *   Refused: X entries (only if plan.refused.length > 0)
 *
 * Annotations (D-40):
 *   was_modified === true  → '(user-modified, hash-diff)'
 *   was_modified === false → '(from files-manifest.csv)'
 *   was_modified === null  → '(legacy v1.1, hash unknown)'
 *
 * @param {object} plan — from buildCleanupPlan
 * @returns {string} multi-line human-readable table
 */
function renderPlan(plan) {
  const lines = [];
  if (plan.to_snapshot.length > 0) {
    lines.push(`TO SNAPSHOT (${plan.to_snapshot.length} files)`);
    for (const item of plan.to_snapshot) {
      const display = `${item.install_root}/${item.relative_path}`;
      let tag;
      if (item.was_modified === true) {
        tag = '(user-modified, hash-diff)';
      } else if (item.was_modified === false) {
        tag = '(from files-manifest.csv)';
      } else {
        tag = '(legacy v1.1, hash unknown)';
      }
      lines.push(`  ${display}    ${tag}`);
    }
    lines.push('');
  }
  if (plan.to_remove.length > 0) {
    lines.push(`TO REMOVE (${plan.to_remove.length} files)`, '  <same list — snapshot is prerequisite>', '');
  }
  if (plan.to_write.length > 0) {
    lines.push(`TO WRITE (${plan.to_write.length} files)`);
    for (const p of plan.to_write) {
      lines.push(`  ${p}`);
    }
    lines.push('');
  }
  lines.push(`Summary: ${plan.to_snapshot.length} snapshotted, ${plan.to_remove.length} removed, ${plan.to_write.length} written`);
  if (plan.refused && plan.refused.length > 0) {
    lines.push(`Refused: ${plan.refused.length} entries (see logs above)`);
  }
  return lines.join('\n');
}

module.exports = {
  isContained,
  isV11Legacy,
  formatTimestamp,
  uniqueBackupDir,
  LEGACY_AGENT_SHORT_NAMES,
  ManifestCorruptError,
  buildCleanupPlan,
  executeCleanupPlan,
  snapshotFiles,
  writeMetadata,
  writeBackupReadme,
  renderPlan,
};
