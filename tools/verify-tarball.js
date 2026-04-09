/**
 * Tarball Verification Script
 *
 * Validates npm tarball hygiene before publishing:
 * 1. Forbidden path check - ensures no .planning/, test/, .github/, docs/, website/, or banner-bmad files leak into tarball
 * 2. Grep-clean check - ensures no bmad/bmm references remain in shipped files (VFY-03)
 *
 * Usage: node tools/verify-tarball.js
 *        npm run test:tarball
 */

const { execSync } = require('node:child_process');

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

// Exit
if (hasFailures) {
  process.exit(1);
}

console.log(`\n${colors.green}OK: ${tarballFiles.length} files in tarball, no forbidden paths, no bmad/bmm residuals${colors.reset}`);
