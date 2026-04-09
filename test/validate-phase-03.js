/**
 * Phase 3 Invariant Checker
 *
 * Validates the 21 invariants defined in
 * .planning/phases/03-credit-branding-docs/03-VALIDATION.md §"Phase 3 Invariants".
 *
 * Usage:
 *   node test/validate-phase-03.js             # run all invariants (Wave 1 + 2)
 *   node test/validate-phase-03.js --wave 1    # skip wave-2-only checks (7, 12, 20)
 *   node test/validate-phase-03.js --only 1,2  # run a comma-separated subset
 *   node test/validate-phase-03.js --dry-run   # print invariant list, exit 0
 *
 * Exit codes: 0 = all requested checks pass, 1 = any failed.
 *
 * Keep runtime under 5 seconds. Shell out only to cat/grep/diff/test (no astro build).
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');

const LICENSE_BASELINE = path.join(ROOT, 'test/fixtures/license-bmad-baseline.txt');
const CONTRIBUTORS_BASELINE = path.join(ROOT, 'test/fixtures/contributors-bmad-baseline.txt');

// Wave-2-only checks: skipped when --wave 1 is passed.
const WAVE_2_ONLY = new Set([7, 12, 20]);

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------

function fileExists(rel) {
  try {
    return fs.existsSync(path.join(ROOT, rel));
  } catch {
    return false;
  }
}

function readFile(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function tryRead(rel) {
  try {
    return fs.readFileSync(path.join(ROOT, rel), 'utf8');
  } catch {
    return null;
  }
}

function grepCount(text, pattern, flags = 'g') {
  if (text == null) return 0;
  const re = pattern instanceof RegExp ? pattern : new RegExp(pattern, flags);
  const matches = text.match(re);
  return matches ? matches.length : 0;
}

function pass(id, msg = '') {
  return { id, pass: true, msg };
}

function fail(id, msg) {
  return { id, pass: false, msg };
}

function skipped(id, msg) {
  return { id, pass: true, skipped: true, msg };
}

// --------------------------------------------------------------------------
// Invariant checks
// --------------------------------------------------------------------------

// Invariant 1: LICENSE byte-identical preservation (BMAD block prefix)
function check1() {
  if (!fileExists('LICENSE')) return fail(1, 'LICENSE missing');
  if (!fileExists('test/fixtures/license-bmad-baseline.txt')) return fail(1, 'baseline fixture missing');
  const baseline = fs.readFileSync(LICENSE_BASELINE, 'utf8');
  const current = readFile('LICENSE');
  if (!current.startsWith(baseline)) {
    return fail(1, 'LICENSE does not start with byte-identical BMAD baseline');
  }
  return pass(1, 'LICENSE BMAD block byte-identical');
}

// Invariant 2: CONTRIBUTORS byte-identical preservation
function check2() {
  if (!fileExists('CONTRIBUTORS.md')) return fail(2, 'CONTRIBUTORS.md missing');
  if (!fileExists('test/fixtures/contributors-bmad-baseline.txt')) return fail(2, 'baseline fixture missing');
  const baseline = fs.readFileSync(CONTRIBUTORS_BASELINE, 'utf8');
  const current = readFile('CONTRIBUTORS.md');
  if (!current.startsWith(baseline)) {
    return fail(2, 'CONTRIBUTORS.md does not start with byte-identical BMAD baseline');
  }
  return pass(2, 'CONTRIBUTORS.md BMAD block byte-identical');
}

// Invariant 3: No banner-bmad-method.png references anywhere
function check3() {
  if (fileExists('banner-bmad-method.png')) return fail(3, 'banner-bmad-method.png still exists on disk');
  const files = ['README.md', 'README_CN.md', '.npmignore', 'package.json', 'website/src/content/i18n/en-US.json'];
  for (const f of files) {
    const txt = tryRead(f);
    if (txt && /banner-bmad-method/.test(txt)) {
      return fail(3, `banner-bmad-method referenced in ${f}`);
    }
  }
  return pass(3, 'no banner-bmad-method references');
}

// Invariant 4: No banner-gomad.png references
function check4() {
  if (fileExists('banner-gomad.png')) return fail(4, 'banner-gomad.png exists (should not per D-05)');
  const files = ['README.md', 'README_CN.md', '.npmignore', 'package.json'];
  for (const f of files) {
    const txt = tryRead(f);
    if (txt && /banner-gomad/.test(txt)) {
      return fail(4, `banner-gomad referenced in ${f}`);
    }
  }
  return pass(4, 'no banner-gomad references');
}

// Invariant 5: README fork statement in Credits only (not intro)
function check5() {
  const results = [];
  for (const f of ['README.md', 'README_CN.md']) {
    const txt = tryRead(f);
    if (txt == null) {
      results.push(`${f}: missing`);
      continue;
    }
    const creditsCount = (txt.match(/^## Credits$/gm) || []).length;
    if (creditsCount !== 1) {
      results.push(`${f}: expected exactly one '## Credits' heading, found ${creditsCount}`);
      continue;
    }
    const creditsIdx = txt.search(/^## Credits$/m);
    const beforeCredits = txt.slice(0, creditsIdx);
    if (/hard fork of BMAD/.test(beforeCredits)) {
      results.push(`${f}: 'hard fork of BMAD' appears outside Credits section`);
      continue;
    }
    if (!/hard fork of BMAD/.test(txt.slice(creditsIdx))) {
      results.push(`${f}: 'hard fork of BMAD' missing from Credits section`);
    }
  }
  if (results.length > 0) return fail(5, results.join('; '));
  return pass(5, 'README fork statement confined to Credits section');
}

// Invariant 6: Canonical non-affiliation disclaimer identical across 4 files
const CANONICAL_DISCLAIMER = 'xgent-ai is not affiliated with, endorsed by, or sponsored by BMad Code, LLC.';

function check6() {
  const files = ['LICENSE', 'README.md', 'README_CN.md', 'TRADEMARK.md'];
  const missing = [];
  for (const f of files) {
    const txt = tryRead(f);
    if (txt == null || !txt.includes(CANONICAL_DISCLAIMER)) {
      missing.push(f);
    }
  }
  if (missing.length > 0) {
    return fail(6, `canonical disclaimer missing from: ${missing.join(', ')}`);
  }
  return pass(6, 'canonical disclaimer present in all 4 files');
}

// Invariant 7: CLI banner shows GoMad, degrades gracefully (Wave 2 only)
function check7() {
  try {
    const out = execSync('node tools/installer/gomad-cli.js --version', {
      cwd: ROOT,
      env: { ...process.env, NO_COLOR: '1' },
      stdio: ['ignore', 'pipe', 'pipe'],
    }).toString();
    if (!/GoMad/.test(out)) return fail(7, "'GoMad' not in --version output");
    return pass(7, 'CLI --version contains GoMad');
  } catch (error) {
    return fail(7, `CLI invocation failed: ${error.message.split('\n')[0]}`);
  }
}

// Invariant 8: No BMAD tagline/art in cli-utils.js
function check8() {
  const txt = tryRead('tools/installer/cli-utils.js');
  if (txt == null) return fail(8, 'tools/installer/cli-utils.js missing');
  if (/Build More|Architect Dreams|BMAD/i.test(txt)) {
    return fail(8, 'BMAD-related string in cli-utils.js');
  }
  return pass(8, 'cli-utils.js BMAD-free');
}

// Invariant 9: CNAME exact content
function check9() {
  const txt = tryRead('CNAME');
  if (txt == null) return fail(9, 'CNAME missing');
  if (txt !== 'gomad.xgent.ai\n') {
    return fail(9, `CNAME content mismatch (bytes=${Buffer.byteLength(txt)})`);
  }
  return pass(9, String.raw`CNAME == gomad.xgent.ai\n`);
}

// Invariant 10: Deleted files are gone
function check10() {
  const shouldNotExist = [
    'SECURITY.md',
    'AGENTS.md',
    'banner-bmad-method.png',
    'website/src/content/i18n/fr-FR.json',
    'website/src/content/i18n/vi-VN.json',
  ];
  const stillThere = shouldNotExist.filter((f) => fileExists(f));
  if (stillThere.length > 0) return fail(10, `still present: ${stillThere.join(', ')}`);
  return pass(10, 'deleted files confirmed gone');
}

// Invariant 11: website locales.mjs no longer references fr-FR/vi-VN
function check11() {
  const txt = tryRead('website/src/lib/locales.mjs');
  if (txt == null) return pass(11, 'locales.mjs not present (acceptable)');
  if (/fr-FR|vi-VN/.test(txt)) return fail(11, 'fr-FR or vi-VN still referenced');
  return pass(11, 'locales.mjs clean');
}

// Invariant 12: Astro website builds (Wave 2 only)
function check12() {
  try {
    execSync('cd website && npm run build', { cwd: ROOT, stdio: 'ignore' });
    return pass(12, 'astro build OK');
  } catch (error) {
    return fail(12, `astro build failed: ${error.message.split('\n')[0]}`);
  }
}

// Invariant 13: CHANGELOG starts at v1.1.0, no older entries
function check13() {
  const txt = tryRead('CHANGELOG.md');
  if (txt == null) return fail(13, 'CHANGELOG.md missing');
  const head = txt.split('\n').slice(0, 30).join('\n');
  if (!/1\.1\.0/.test(head)) return fail(13, '1.1.0 not in head(30)');
  if (/## \[6\.|## v6\.|## \[1\.0\.0\]/.test(txt)) {
    return fail(13, 'older version entries still present');
  }
  return pass(13, 'CHANGELOG starts fresh at 1.1.0');
}

// Invariant 14: CHANGELOG v1.1.0 has BREAKING CHANGES subsection
function check14() {
  const txt = tryRead('CHANGELOG.md');
  if (txt == null) return fail(14, 'CHANGELOG.md missing');
  if (!/BREAKING CHANGES/.test(txt)) return fail(14, 'BREAKING CHANGES subsection missing');
  return pass(14, 'BREAKING CHANGES subsection present');
}

// Invariant 15: Wordmark.png regenerated (different from baseline snapshot if one exists)
function check15() {
  if (!fileExists('Wordmark.png')) return fail(15, 'Wordmark.png missing');
  const fixture = 'test/fixtures/wordmark-bmad-baseline.png';
  if (!fileExists(fixture)) return pass(15, 'Wordmark.png present (no baseline fixture to compare)');
  try {
    const a = fs.readFileSync(path.join(ROOT, 'Wordmark.png'));
    const b = fs.readFileSync(path.join(ROOT, fixture));
    if (a.equals(b)) return fail(15, 'Wordmark.png is byte-identical to BMAD baseline (not regenerated)');
    return pass(15, 'Wordmark.png differs from BMAD baseline');
  } catch (error) {
    return fail(15, `compare failed: ${error.message}`);
  }
}

// Invariant 16: Favicon exists at one of the known locations
function check16() {
  const locs = ['website/public/favicon.png', 'public/favicon.png', 'docs/favicon.png', 'website/public/favicon.ico'];
  if (locs.some(fileExists)) return pass(16, 'favicon found');
  return fail(16, 'no favicon at any known location');
}

// Invariant 17: docs landing pages rewritten
function check17() {
  const files = ['docs/index.md', 'docs/zh-cn/index.md'];
  for (const f of files) {
    const txt = tryRead(f);
    if (txt == null) return fail(17, `${f} missing`);
    if (!/GoMad/.test(txt)) return fail(17, `${f} missing GoMad`);
    if (/gomad-builder-docs\.gomad\.org|BMM phases|\(\*\*B\*\*uild \*\*M\*\*ore/.test(txt)) {
      return fail(17, `${f} contains Phase-2-sweep mangled artifact`);
    }
  }
  return pass(17, 'docs landing pages rewritten cleanly');
}

// Invariant 18: docs/mobmad-plan.md deleted
function check18() {
  if (fileExists('docs/mobmad-plan.md')) return fail(18, 'docs/mobmad-plan.md still exists');
  return pass(18, 'docs/mobmad-plan.md gone');
}

// Invariant 19: REQUIREMENTS.md + ROADMAP.md contain the three delta relaxations
function check19() {
  const req = tryRead('.planning/REQUIREMENTS.md') || '';
  const road = tryRead('.planning/ROADMAP.md') || '';
  const issues = [];
  if (!/Credits`?\s*footer section/.test(req)) issues.push('REQUIREMENTS.md: CREDIT-02 delta not applied');
  if (!/NO replacement banner/.test(req)) issues.push('REQUIREMENTS.md: BRAND-01 delta not applied');
  if (!/`SECURITY\.md` and `AGENTS\.md` deleted/.test(req)) issues.push('REQUIREMENTS.md: DOCS-05 delta not applied');
  if (!/per CONTEXT D-05/.test(road)) issues.push('ROADMAP.md: BRAND-01 delta not applied');
  if (!/Credits footer section|fork statement lives in Credits only/.test(road)) issues.push('ROADMAP.md: CREDIT-02 delta not applied');
  if (!/per CONTEXT D-24/.test(road)) issues.push('ROADMAP.md: DOCS-05 delta not applied');
  if (issues.length > 0) return fail(19, issues.join('; '));
  return pass(19, 'requirement deltas applied');
}

// Invariant 20: CLI does not credit BMAD anywhere (Wave 2 only)
function check20() {
  try {
    const out = execSync('node tools/installer/gomad-cli.js --version', {
      cwd: ROOT,
      stdio: ['ignore', 'pipe', 'pipe'],
    }).toString();
    if (/BMAD/i.test(out)) return fail(20, 'BMAD string in CLI --version output');
    return pass(20, 'CLI --version BMAD-free');
  } catch (error) {
    return fail(20, `CLI invocation failed: ${error.message.split('\n')[0]}`);
  }
}

// Invariant 21: Case-preserving map applied (best-effort spot-check)
// This one is largely soft: Phase 2 swept the repo; Phase 3 mostly rewrites
// allow-listed files. We check files created/rewritten in Phase 3 for forbidden
// lowercase bmad/bmm in non-allow-listed lines.
function check21() {
  // Just a sanity probe on the rewritten meta docs.
  const probes = [{ file: 'CONTRIBUTING.md', forbidden: /\bbmad\b|\bbmm\b|\bBMad\b(?! Code)/ }];
  const hits = [];
  for (const { file, forbidden } of probes) {
    const txt = tryRead(file);
    if (txt && forbidden.test(txt)) {
      hits.push(file);
    }
  }
  if (hits.length > 0) return fail(21, `lingering bmad/bmm in: ${hits.join(', ')}`);
  return pass(21, 'case map applied to Phase 3 rewrites');
}

// --------------------------------------------------------------------------
// Runner
// --------------------------------------------------------------------------

const CHECKS = [
  check1,
  check2,
  check3,
  check4,
  check5,
  check6,
  check7,
  check8,
  check9,
  check10,
  check11,
  check12,
  check13,
  check14,
  check15,
  check16,
  check17,
  check18,
  check19,
  check20,
  check21,
];

function parseArgs(argv) {
  const args = { wave: null, only: null, dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    switch (a) {
      case '--wave': {
        args.wave = parseInt(argv[++i], 10);
        break;
      }
      case '--only': {
        args.only = new Set(argv[++i].split(',').map((n) => parseInt(n, 10)));
        break;
      }
      case '--dry-run': {
        {
          args.dryRun = true;
          // No default
        }
        break;
      }
    }
  }
  return args;
}

function runAll(opts = {}) {
  const results = [];
  for (const [i, CHECK] of CHECKS.entries()) {
    const id = i + 1;
    if (opts.only && !opts.only.has(id)) continue;
    if (opts.wave === 1 && WAVE_2_ONLY.has(id)) {
      results.push(skipped(id, 'SKIPPED (Plan 03-02)'));
      continue;
    }
    try {
      results.push(CHECK());
    } catch (error) {
      results.push(fail(id, `check threw: ${error.message}`));
    }
  }
  return results;
}

function printResults(results) {
  console.log('Phase 3 Invariant Check Results');
  console.log('================================');
  let passCount = 0;
  let failCount = 0;
  let skipCount = 0;
  for (const r of results) {
    const status = r.skipped ? 'SKIP' : r.pass ? 'PASS' : 'FAIL';
    const tag = r.skipped ? '·' : r.pass ? '✓' : '✗';
    console.log(`  ${tag} invariant #${String(r.id).padStart(2)}: ${status.padEnd(4)}  ${r.msg || ''}`);
    if (r.skipped) skipCount++;
    else if (r.pass) passCount++;
    else failCount++;
  }
  console.log('--------------------------------');
  console.log(`  PASS ${passCount}   FAIL ${failCount}   SKIP ${skipCount}   TOTAL ${results.length}`);
  return failCount === 0;
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.dryRun) {
    console.log('Phase 3 invariant list (dry-run):');
    for (let i = 0; i < CHECKS.length; i++) {
      console.log(`  invariant #${i + 1}`);
    }
    process.exit(0);
  }
  const results = runAll(opts);
  const ok = printResults(results);
  process.exit(ok ? 0 : 1);
}

if (require.main === module) {
  main();
}

module.exports = { runAll, CHECKS, CANONICAL_DISCLAIMER };
