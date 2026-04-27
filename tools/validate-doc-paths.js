'use strict';

/**
 * DOCS-07 — Validate that no shipped docs file references the legacy v1.2
 * persona runtime path. NEGATIVE-only enforcement (D-12): fails if any
 * non-allowlisted file under docs/ contains `_gomad/gomad/agents/` or
 * `gomad/agents/<name>.md`. Does NOT enforce presence of `_config/agents/`.
 *
 * Allowlist: upgrade-recovery.md and its zh-cn translation legitimately
 * demonstrate the v1.2-era backup-tree layout. CHANGELOG.md and any file
 * under tools/installer/ are out of scope (this linter only walks docs/).
 *
 * Exit codes:
 *   0 = clean (or only allowlisted files matched)
 *   1 = at least one non-allowlisted file contains a forbidden pattern
 */

const fs = require('node:fs');
const path = require('node:path');

const DOCS_ROOT = path.resolve(__dirname, '..', 'docs');

// Single canonical legacy path that must NEVER appear in shipped docs.
const FORBIDDEN_PATTERNS = [/\b_gomad\/gomad\/agents\b/, /\bgomad\/agents\/[a-z][a-z0-9-]*\.md\b/];

// Allowlist (relative-to-DOCS_ROOT paths) — legitimate v1.2-era references
// inside backup-tree examples. Both English + zh-cn upgrade-recovery.md
// pages legitimately demonstrate the v1.2 backup layout (D-12).
const ALLOWLIST = new Set(['upgrade-recovery.md', path.join('zh-cn', 'upgrade-recovery.md')]);

function getMarkdownFiles(dir, base) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('_')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...getMarkdownFiles(full, base));
    } else if (entry.isFile() && /\.(md|mdx)$/.test(entry.name)) {
      out.push(path.relative(base, full));
    }
  }
  return out;
}

function main() {
  if (!fs.existsSync(DOCS_ROOT)) {
    console.error(`ERROR: docs root not found at ${DOCS_ROOT}`);
    process.exit(2);
  }

  const failures = [];
  const files = getMarkdownFiles(DOCS_ROOT, DOCS_ROOT);
  for (const rel of files) {
    if (ALLOWLIST.has(rel)) continue;
    const abs = path.join(DOCS_ROOT, rel);
    const content = fs.readFileSync(abs, 'utf8');
    for (const pat of FORBIDDEN_PATTERNS) {
      if (pat.test(content)) {
        failures.push({ file: rel, pattern: pat.source });
      }
    }
  }

  if (failures.length === 0) {
    console.log(`OK: scanned ${files.length} files; no legacy gomad/agents/ paths in shipped docs`);
    process.exit(0);
  }

  for (const f of failures) {
    console.error(`FAIL: ${f.file} contains forbidden pattern /${f.pattern}/`);
  }
  console.error(`\n${failures.length} failure(s) — fix offending files or add to ALLOWLIST if legitimate`);
  process.exit(1);
}

main();
