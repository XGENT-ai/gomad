/**
 * rename-sweep.js — Idempotent content-sweep for the bmad → gomad rename (D-05).
 *
 * Applies a case-preserving mapping across source, configs, tests, docs, and
 * website content. The Phase 3-owned files (LICENSE, CHANGELOG.md, TRADEMARK.md,
 * CONTRIBUTORS.md, README.md, README_CN.md) are hard-coded in the exclude list
 * and are never touched here (D-06).
 *
 * Usage:
 *   node tools/dev/rename-sweep.js              # apply changes
 *   node tools/dev/rename-sweep.js --dry-run    # report only; no writes
 *
 * Exit codes:
 *   0 = success (dry-run or applied)
 *   1 = error (I/O failure, glob failure, etc.)
 *
 * Idempotency: a second run on a clean tree reports `Files touched: 0`.
 *
 * Threat model (see 02-02-PLAN.md):
 * - T-02-06: LICENSE/CHANGELOG/TRADEMARK mitigated by hard-coded EXCLUDE_FILES.
 * - T-02-07: `bmm` is word-anchored via lookarounds so only identifier-segment
 *            matches are replaced.
 * - T-02-09: Pure fs.readFile / fs.writeFile — no child_process, no shell-out.
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { globSync } = require('glob');

const REPO_ROOT = path.resolve(__dirname, '..', '..');

// D-06 exclude list — exact relative paths from repo root.
// These files are owned by Phase 3 (credit/legal/branding) and must stay byte-
// identical to their BMAD-origin or be rewritten by hand, not mechanically swept.
const EXCLUDE_FILES = new Set([
  // D-06 Phase 3-owned files.
  'LICENSE',
  'CHANGELOG.md',
  'TRADEMARK.md',
  'CONTRIBUTORS.md',
  'README.md',
  'README_CN.md',
  // BMAD upstream attribution surfaces rewritten by hand in Task 2 Part B so
  // nominative-fair-use URLs (bmad-code-org/BMAD-METHOD, bmadcode.com,
  // buymeacoffee.com/bmad, contact@bmadcode.com) are not mechanically corrupted.
  // Without these exclusions the sweep would produce broken links like
  // "gomad-code-org/GOMAD-METHOD". Documented as Rule 2 deviation in SUMMARY.
  'docs/roadmap.mdx',
  'docs/zh-cn/roadmap.mdx',
  'website/src/styles/custom.css',
]);

// Target file set: any text file under the repo matching one of these extensions.
// Extensions chosen so the sweep covers every extension that produced residual
// bmad/BMAD/bmm hits in the first dry-run (mdx docs, toml IDE templates, py
// helper scripts, sh validators, css stylesheets).
const TARGET_GLOB = '**/*.{md,mdx,yaml,yml,json,js,mjs,cjs,ts,astro,html,csv,toml,py,sh,css}';
const IGNORE_GLOBS = [
  'node_modules/**',
  '.git/**',
  'build/**',
  '.planning/**',
  // The sweep script must not rewrite itself mid-run. Its own source file
  // intentionally contains the literal patterns in comments/regex.
  'tools/dev/rename-sweep.js',
  // The sweep script's unit tests intentionally assert on literal bmad/BMAD/
  // bmm strings. Sweeping them would turn the test fixtures into tautologies
  // ("gomad transforms to gomad") and make the suite worthless.
  'test/test-rename-sweep.js',
];

// D-05 substitution mapping. Order matters: longest / most specific patterns
// first so compound forms ("BMAD Method", "bmad-method") are consumed before
// the bare token substitutions run.
const MAPPINGS = Object.freeze([
  { re: /BMAD Method/g, to: 'GoMad', name: 'BMAD Method→GoMad' },
  { re: /bmad-method/g, to: 'gomad', name: 'bmad-method→gomad' },
  { re: /BMad/g, to: 'GoMad', name: 'BMad→GoMad' },
  { re: /BMAD/g, to: 'GOMAD', name: 'BMAD→GOMAD' },
  { re: /bmad/g, to: 'gomad', name: 'bmad→gomad' },
  // T-02-07 mitigation: `bmm` matches only when flanked by non-alphanumeric
  // characters (or start/end of string). Underscore is treated as a segment
  // boundary so `bmad_bmm_pm` (internal slash-command naming) rewrites cleanly
  // via two passes (bmad→gomad, then _bmm_ → _gomad_) — required by the plan's
  // D-17 zero-bmm-hit gate. `xbmmx` and `bmm3` remain untouched.
  //
  // Note: the plan's <action> block showed `(?<![A-Za-z0-9_])` including
  // underscore, but the <behavior> spec says "non-alphanumeric characters" and
  // the D-17 gate demands zero residual `bmm`. Following the behavior spec.
  { re: /(?<![A-Za-z0-9])bmm(?![A-Za-z0-9])/g, to: 'gomad', name: 'bmm→gomad (word-anchored)' },
  // camelCase identifier head: `bmmPath`, `bmmConfigPath`, `bmmInfo` — legit
  // JavaScript identifiers in installer code whose `bmm` prefix is namespace,
  // followed by a capital letter. The previous rule won't match (capital is
  // alphanumeric). Matches only at identifier start (non-alphanumeric before),
  // so `someBmmPath` — if it existed — would NOT be rewritten.
  { re: /(?<![A-Za-z0-9])bmm(?=[A-Z])/g, to: 'gomad', name: 'bmm→gomad (camelCase head)' },
]);

/**
 * Apply the ordered mapping to a single string. Returns { content, counts }
 * where `counts` is an object keyed by mapping name with replacement counts.
 * Pure function — exported for unit tests.
 *
 * @param {string} input
 * @returns {{ content: string, counts: Record<string, number> }}
 */
function applyMappings(input) {
  let content = input;
  const counts = Object.create(null);
  for (const mapping of MAPPINGS) {
    let localCount = 0;
    content = content.replace(mapping.re, () => {
      localCount += 1;
      return mapping.to;
    });
    counts[mapping.name] = localCount;
  }
  return { content, counts };
}

/**
 * @param {string[]} argv
 * @returns {{ dryRun: boolean }}
 */
function parseArgs(argv) {
  return {
    dryRun: argv.includes('--dry-run'),
  };
}

function main() {
  const { dryRun } = parseArgs(process.argv.slice(2));

  let files;
  try {
    files = globSync(TARGET_GLOB, {
      cwd: REPO_ROOT,
      ignore: IGNORE_GLOBS,
      nodir: true,
      dot: false,
    });
  } catch (error) {
    console.error(`rename-sweep: glob failed: ${error.message}`);
    process.exit(1);
  }

  const totals = Object.create(null);
  for (const mapping of MAPPINGS) {
    totals[mapping.name] = 0;
  }

  let filesScanned = 0;
  let filesTouched = 0;
  let filesSkippedByExclude = 0;
  const touchedFiles = [];

  for (const relPath of files) {
    if (EXCLUDE_FILES.has(relPath)) {
      filesSkippedByExclude += 1;
      continue;
    }

    const absPath = path.join(REPO_ROOT, relPath);
    filesScanned += 1;

    let original;
    try {
      original = fs.readFileSync(absPath, 'utf8');
    } catch (error) {
      console.error(`rename-sweep: read failed for ${relPath}: ${error.message}`);
      process.exit(1);
    }

    const { content, counts } = applyMappings(original);
    if (content === original) {
      continue;
    }

    filesTouched += 1;
    touchedFiles.push(relPath);
    for (const mapping of MAPPINGS) {
      totals[mapping.name] += counts[mapping.name];
    }

    if (!dryRun) {
      try {
        fs.writeFileSync(absPath, content, 'utf8');
      } catch (error) {
        console.error(`rename-sweep: write failed for ${relPath}: ${error.message}`);
        process.exit(1);
      }
    }
  }

  const mode = dryRun ? 'DRY RUN' : 'APPLIED';
  console.log(`rename-sweep (${mode})`);
  console.log(`Files scanned: ${filesScanned}`);
  console.log(`Files touched: ${filesTouched}`);
  console.log(`Files skipped (exclude list): ${filesSkippedByExclude}`);
  console.log('Replacements by mapping:');
  for (const mapping of MAPPINGS) {
    console.log(`  ${mapping.name}: ${totals[mapping.name]}`);
  }

  if (dryRun && filesTouched > 0) {
    console.log('');
    console.log('First 10 files that would change:');
    for (const f of touchedFiles.slice(0, 10)) {
      console.log(`  ${f}`);
    }
  }
}

// Only run when invoked directly; exports are for unit testing.
if (require.main === module) {
  main();
}

module.exports = { applyMappings, MAPPINGS, EXCLUDE_FILES };
