/**
 * Install-time invocation-syntax transform.
 *
 * Source skill content uses the colon form `/gm:agent-<short>` (and bare
 * `gm:agent-<short>` in CSV cells) — that's the canonical authored form per
 * D-22/D-64. Claude Code resolves the colon form natively via launchers under
 * `.claude/commands/gm/`. Codex (and every other platform without
 * `launcher_target_dir`) cannot — it can only invoke skills as
 * `$gm-agent-<short>` (dollar-prefixed dash form, by skill directory name).
 *
 * Solution (locked in 260430-q3c CONTEXT.md): rewrite skill content at
 * install time, gated on a per-platform `invocation_syntax` field in
 * `platform-codes.yaml`. Source files stay byte-identical; only the copy
 * landing in `.agents/skills/` (or equivalent) is transformed.
 *
 * The transform is conservative: only the 8 canonical agent shortNames from
 * `AgentCommandGenerator.AGENT_SOURCES` are rewritten. Arbitrary `gm:`-prefixed
 * strings are left alone.
 */

const { AgentCommandGenerator } = require('./agent-command-generator');

// Source-of-truth shortName list — pulled from AGENT_SOURCES so the regex
// can never drift from the live agent set. Exported for the unit test's
// drift-detector assertion.
const BUILT_IN_AGENT_SHORTNAMES = AgentCommandGenerator.AGENT_SOURCES.map((s) => s.shortName);

/**
 * Build the regex alternation with longest shortNames first so multi-token
 * names (e.g. `solo-dev`, `tech-writer`, `ux-designer`) match before any
 * single-token prefix (`dev`, `tech`, `ux`). Without this, `gm:agent-solo-dev`
 * would partial-match `gm:agent-solo` leaving a dangling `-dev`.
 */
function buildShortNamesAlternation() {
  return [...BUILT_IN_AGENT_SHORTNAMES].sort((a, b) => b.length - a.length).join('|');
}

/**
 * Apply the conservative invocation-syntax transform.
 *
 * When `invocationSyntax !== 'dash'`, returns `text` unchanged (no-op for
 * `'colon'`, `undefined`, etc.). When `'dash'`, applies two substitutions:
 *
 *   1. `/gm:agent-<short>` → `$gm-agent-<short>`  (slash-colon → dollar-dash)
 *   2. `gm:agent-<short>`  → `gm-agent-<short>`   (bare colon → bare dash)
 *
 * Substitution #1 must run first; otherwise #2 would consume the `gm:agent-pm`
 * portion of `/gm:agent-pm` and leave `/gm-agent-pm` (wrong — we need
 * `$gm-agent-pm`).
 *
 * Word boundaries (`\b`) on both sides prevent false matches like
 * `xgm:agent-pm` (left) and `gm:agent-pmx` (right).
 *
 * @param {string} text - File content to transform.
 * @param {string} invocationSyntax - `'dash'` to transform, anything else is a no-op.
 * @returns {string} Transformed text (or original if no-op).
 */
function applyInvocationSyntaxTransform(text, invocationSyntax) {
  if (invocationSyntax !== 'dash') return text;
  if (typeof text !== 'string' || text.length === 0) return text;

  const shorts = buildShortNamesAlternation();
  // #1: `/gm:agent-<short>` → `$gm-agent-<short>`
  // Replacement uses `$$` to emit a literal `$` (JS replace string syntax).
  const slashColon = new RegExp(`/gm:agent-(${shorts})\\b`, 'g');
  // #2: bare `gm:agent-<short>` → `gm-agent-<short>` (left \b prevents `xgm:agent-pm` matches)
  const bareColon = new RegExp(`\\bgm:agent-(${shorts})\\b`, 'g');

  return text.replace(slashColon, '$$gm-agent-$1').replace(bareColon, 'gm-agent-$1');
}

/**
 * Resolve a platform's invocation syntax from its config block.
 * Defaults to `'dash'` — claude-code is the only platform that overrides
 * to `'colon'` (it has launchers that resolve the colon form natively).
 *
 * @param {Object} platformConfig - Entry from `platform-codes.yaml#platforms.*`.
 * @returns {'colon' | 'dash'}
 */
function resolveInvocationSyntax(platformConfig) {
  return platformConfig?.installer?.invocation_syntax || 'dash';
}

module.exports = {
  applyInvocationSyntaxTransform,
  resolveInvocationSyntax,
  BUILT_IN_AGENT_SHORTNAMES,
};
