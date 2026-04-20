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

/**
 * D-42 source of truth — the 7 known v1.1 agent skill short names. Derived
 * from AgentCommandGenerator.AGENT_SOURCES so a future addition/removal of
 * an agent flows through automatically (one source of truth per CLAUDE.md
 * common rules — no duplicated lists).
 *
 * Order: ['analyst', 'tech-writer', 'pm', 'ux-designer', 'architect', 'sm', 'dev']
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

module.exports = {
  isContained,
  isV11Legacy,
  formatTimestamp,
  uniqueBackupDir,
  LEGACY_AGENT_SHORT_NAMES,
  ManifestCorruptError,
  // buildCleanupPlan: added in Task 3
};
