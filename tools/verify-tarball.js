/**
 * Tarball Verification Script
 *
 * Validates npm tarball hygiene before publishing:
 * 1. Forbidden path check - ensures no .planning/, test/, .github/, docs/, website/, or banner-bmad files leak into tarball
 * 2. Grep-clean check - ensures no bmad/bmm references remain in shipped files (VFY-03)
 * 3. gm-agent- grep-clean check - ensures no user-visible gm-agent- residuals in shipped content (Phase 9 D-71)
 * 4. gomad/agents/ legacy-path grep-clean check - ensures no residual v1.2 persona-dir references
 *    in shipped content after the Phase 12 relocation (AGENT-10)
 *
 * Usage: node tools/verify-tarball.js
 *        npm run test:tarball
 */

const { execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

// ANSI colors for output
const colors = {
  reset: '\u001B[0m',
  green: '\u001B[32m',
  red: '\u001B[31m',
  cyan: '\u001B[36m',
};

/**
 * Parse npm pack --dry-run output to extract file paths
 * @param {string} output - Raw npm pack output
 * @returns {string[]} Array of file paths in the tarball
 */
function parseTarballFiles(output) {
  const files = [];
  for (const line of output.split('\n')) {
    // npm notice lines have format: "npm notice <size>  <path>"
    // or "npm notice <path>" for some versions
    const match = line.match(/^npm notice\s+[\d.]+\s*[kMG]?B\s+(.+)$/);
    if (match) {
      files.push(match[1].trim());
    }
  }
  return files;
}

/**
 * Phase 1: Check for forbidden paths in tarball
 * @param {string[]} files - List of files in the tarball
 * @returns {{ passed: boolean, failures: string[] }}
 */
function checkForbiddenPaths(files) {
  const forbiddenPatterns = [/^\.planning\//, /^test\//, /^\.github\//, /^docs\//, /^website\//, /banner-bmad/];

  const failures = [];

  for (const filePath of files) {
    for (const pattern of forbiddenPatterns) {
      if (pattern.test(filePath)) {
        failures.push(filePath);
        break;
      }
    }
  }

  return { passed: failures.length === 0, failures };
}

/**
 * Phase 2: Grep-clean check for bmad/bmm references in shipped files
 * @returns {{ passed: boolean, failures: string[] }}
 */
function checkGrepClean() {
  let grepOutput = '';

  try {
    grepOutput = execSync(
      String.raw`grep -rliE "\b(bmad|bmm)\b" src/ tools/installer/ --include="*.js" --include="*.yaml" --include="*.md" --include="*.json" --include="*.csv" 2>/dev/null`,
      { encoding: 'utf8' },
    );
  } catch {
    // grep returns exit code 1 when no matches found - that's success
    return { passed: true, failures: [] };
  }

  // Filter out LICENSE and CHANGELOG.md (allowed to contain bmad references)
  const failures = grepOutput
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .filter((line) => !line.endsWith('LICENSE') && !line.endsWith('CHANGELOG.md') && !line.endsWith('install-messages.yaml'));

  return { passed: failures.length === 0, failures };
}

/**
 * Phase 3: Grep-clean check for gm-agent- references in shipped files
 * (Phase 9 D-71). Uses narrow allowlist at tools/fixtures/tarball-grep-allowlist.json
 * for legitimate filesystem path refs and frontmatter name lines.
 * @returns {{ passed: boolean, failures: string[] }}
 */
function checkGmAgentGrepClean() {
  let grepOutput = '';
  try {
    grepOutput = execSync(
      `grep -rlE "gm-agent-" src/ tools/installer/ ` +
        `--include="*.js" --include="*.yaml" --include="*.md" --include="*.json" --include="*.csv" ` +
        `2>/dev/null`,
      { encoding: 'utf8' },
    );
  } catch {
    return { passed: true, failures: [] };
  }

  const allowlistPath = path.join(__dirname, 'fixtures', 'tarball-grep-allowlist.json');
  const allowlist = fs.existsSync(allowlistPath) ? JSON.parse(fs.readFileSync(allowlistPath, 'utf8')) : [];
  // Phase 3 (gm-agent-) is satisfied by entries with no category (legacy default),
  // category === 'gm-agent', or category === 'both'.
  const allowedPaths = new Set(
    allowlist.filter((entry) => !entry.category || entry.category === 'gm-agent' || entry.category === 'both').map((entry) => entry.path),
  );

  const failures = grepOutput
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .filter((line) => !allowedPaths.has(line));

  return { passed: failures.length === 0, failures };
}

/**
 * Phase 4: Grep-clean check for residual gomad/agents/ legacy-path references
 * in shipped files (AGENT-10). Allowlist filtered by category=='gomad-agents'
 * OR 'both'. Failure surfaces any non-allowlisted file that still references
 * _gomad/gomad/agents/ or gomad/agents/<name>.md after the Phase 12 relocation.
 * @returns {{ passed: boolean, failures: string[] }}
 */
function checkLegacyAgentPathClean() {
  let grepOutput = '';
  try {
    grepOutput = execSync(
      String.raw`grep -rlE "\bgomad/agents/" src/ tools/installer/ ` +
        `--include="*.js" --include="*.yaml" --include="*.md" --include="*.json" --include="*.csv" ` +
        `2>/dev/null`,
      { encoding: 'utf8' },
    );
  } catch {
    return { passed: true, failures: [] };
  }

  const allowlistPath = path.join(__dirname, 'fixtures', 'tarball-grep-allowlist.json');
  const allowlist = fs.existsSync(allowlistPath) ? JSON.parse(fs.readFileSync(allowlistPath, 'utf8')) : [];
  const allowedPaths = new Set(
    allowlist.filter((entry) => entry.category === 'gomad-agents' || entry.category === 'both').map((entry) => entry.path),
  );

  const failures = grepOutput
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .filter((line) => !allowedPaths.has(line));

  return { passed: failures.length === 0, failures };
}

// Main execution
let hasFailures = false;

// Phase 1: Forbidden path check
console.log(`${colors.cyan}Phase 1: Checking tarball for forbidden paths...${colors.reset}`);

let packOutput;
try {
  packOutput = execSync('npm pack --dry-run 2>&1', { encoding: 'utf8' });
} catch (error) {
  console.error(`${colors.red}FAIL: npm pack --dry-run failed${colors.reset}`);
  console.error(error.message);
  process.exit(1);
}

const tarballFiles = parseTarballFiles(packOutput);
const pathCheck = checkForbiddenPaths(tarballFiles);

if (pathCheck.passed) {
  console.log(`${colors.green}PASS: no forbidden paths in tarball${colors.reset}`);
} else {
  hasFailures = true;
  for (const file of pathCheck.failures) {
    console.log(`${colors.red}FAIL: forbidden file in tarball: ${file}${colors.reset}`);
  }
}

// Phase 2: Grep-clean check
console.log(`${colors.cyan}Phase 2: Checking for residual bmad/bmm references...${colors.reset}`);

const grepCheck = checkGrepClean();

if (grepCheck.passed) {
  console.log(`${colors.green}PASS: no bmad/bmm residuals in shipped files${colors.reset}`);
} else {
  hasFailures = true;
  console.log(`${colors.red}FAIL: residual bmad/bmm references found in: ${grepCheck.failures.join(', ')}${colors.reset}`);
}

// Phase 3: gm-agent- grep-clean check (D-71)
console.log(`${colors.cyan}Phase 3: Checking for residual gm-agent- references...${colors.reset}`);
const gmAgentCheck = checkGmAgentGrepClean();
if (gmAgentCheck.passed) {
  console.log(`${colors.green}PASS: no unallowlisted gm-agent- residuals in shipped files${colors.reset}`);
} else {
  hasFailures = true;
  console.log(`${colors.red}FAIL: residual gm-agent- references in: ${gmAgentCheck.failures.join(', ')}${colors.reset}`);
}

// Phase 4: gomad/agents/ legacy-path grep-clean check (AGENT-10)
console.log(`${colors.cyan}Phase 4: Checking for residual gomad/agents/ references...${colors.reset}`);
const legacyAgentPathCheck = checkLegacyAgentPathClean();
if (legacyAgentPathCheck.passed) {
  console.log(`${colors.green}PASS: no unallowlisted gomad/agents/ residuals in shipped files${colors.reset}`);
} else {
  hasFailures = true;
  console.log(`${colors.red}FAIL: residual gomad/agents/ references in: ${legacyAgentPathCheck.failures.join(', ')}${colors.reset}`);
}

// Exit
if (hasFailures) {
  process.exit(1);
}

console.log(
  `\n${colors.green}OK: ${tarballFiles.length} files in tarball, no forbidden paths, no bmad/bmm residuals, no unallowlisted gm-agent- residuals, no unallowlisted gomad/agents/ residuals${colors.reset}`,
);
