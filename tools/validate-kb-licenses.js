/**
 * KB License / Attribution Validator (Release Gate)
 *
 * Validates IP-cleanliness frontmatter on every `.md` file under `src/domain-kb/`.
 * Per PITFALLS.md §Pitfall 4-J (CRITICAL), un-attributed KB content carries DMCA
 * takedown risk. This validator MUST run in `npm run quality` and MUST land
 * BEFORE any KB content is committed.
 *
 * What it checks (STORY-08/09/10):
 * - KB-01 CRITICAL: YAML frontmatter present (`---\n...\n---`).
 * - KB-02 CRITICAL: frontmatter has `source` key (non-empty).
 * - KB-03 CRITICAL: frontmatter has `license` key (non-empty).
 * - KB-04 CRITICAL: frontmatter has `last_reviewed` key matching `YYYY-MM-DD`.
 * - KB-05 HIGH:     `source` is `original` OR starts with `http://` / `https://`.
 * - KB-06 HIGH:     `license` is in allowlist (`MIT`, `Apache-2.0`, `BSD-3-Clause`,
 *                   `CC-BY-4.0`, `CC0-1.0`, `original`).
 * - KB-07 HIGH:     file has an H1 (`# ...`) after the frontmatter (D-09 catalog).
 *
 * Exit-code contract (stricter than validate-skills.js per PATTERNS.md §8):
 * - Any CRITICAL finding → exit 1 (no `--strict` needed — release-gate posture).
 * - `--strict` additionally promotes HIGH to a failing exit.
 * - Empty/missing `src/domain-kb/` → exit 0 (baseline: no KB content yet).
 *
 * Usage:
 *   node tools/validate-kb-licenses.js              # exit 1 on CRITICAL
 *   node tools/validate-kb-licenses.js --strict     # exit 1 on CRITICAL or HIGH
 *   node tools/validate-kb-licenses.js --json       # JSON output
 */

const fs = require('node:fs');
const path = require('node:path');
const yaml = require('yaml');
const { globSync } = require('glob');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const KB_DIR = path.join(PROJECT_ROOT, 'src', 'domain-kb');

// --- CLI Parsing ---

const args = new Set(process.argv.slice(2));
const STRICT = args.has('--strict');
const JSON_OUTPUT = args.has('--json');

// --- Constants ---

const LICENSE_ALLOWLIST = ['MIT', 'Apache-2.0', 'BSD-3-Clause', 'CC-BY-4.0', 'CC0-1.0', 'original'];
const REQUIRED_KEYS = ['source', 'license', 'last_reviewed'];
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const H1_REGEX = /^#\s+\S/m;
const URL_REGEX = /^https?:\/\/\S+/i;

const SEVERITY_ORDER = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

const colors = {
  reset: '\u001B[0m',
  red: '\u001B[31m',
  green: '\u001B[32m',
  yellow: '\u001B[33m',
  cyan: '\u001B[36m',
  dim: '\u001B[2m',
};

// --- Output Escaping ---

function escapeAnnotation(str) {
  return String(str).replaceAll('%', '%25').replaceAll('\r', '%0D').replaceAll('\n', '%0A');
}

function escapeTableCell(str) {
  return String(str).replaceAll('|', String.raw`\|`);
}

// --- Frontmatter Extraction (canonical `yaml.parse` per CONTEXT.md §Reusable Assets) ---

/**
 * Extract YAML frontmatter block from markdown content.
 * Returns the parsed object, or null when frontmatter is missing,
 * or `{ __parse_error: true }` when the YAML is malformed.
 */
function extractFrontmatter(content) {
  const m = content.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return null;
  try {
    const parsed = yaml.parse(m[1]);
    // yaml.parse returns null for empty-but-present frontmatter; normalise to {}
    if (parsed === null || parsed === undefined) return {};
    if (typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { __parse_error: true };
    }
    return parsed;
  } catch {
    return { __parse_error: true };
  }
}

/**
 * Extract content body (everything after the closing `---`) for H1 / heading checks.
 */
function extractBody(content) {
  const m = content.match(/^---\n[\s\S]*?\n---\n?([\s\S]*)$/);
  return m ? m[1] : content;
}

// --- Discovery ---

/**
 * Discover all `.md` files under `src/domain-kb/`.
 * Returns an empty array when the directory does not exist (baseline = pass).
 */
function discoverKbFiles() {
  if (!fs.existsSync(KB_DIR)) return [];
  const matches = globSync('src/domain-kb/**/*.md', { cwd: PROJECT_ROOT, absolute: true });
  return matches.sort();
}

// --- Safe File Read ---

function safeReadFile(filePath, findings, relFile) {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch (error) {
    findings.push({
      rule: 'READ-ERR',
      title: 'File Read Error',
      severity: 'MEDIUM',
      file: relFile,
      detail: `Cannot read file: ${error.message}`,
      fix: 'Check file permissions and ensure the file exists.',
    });
    return null;
  }
}

// --- Rule Checks ---

/**
 * Validate a single KB markdown file.
 * Returns { file, findings: [{rule, title, severity, file, detail, fix}] }.
 */
function validateFile(filePath) {
  const relFile = path.relative(PROJECT_ROOT, filePath);
  const findings = [];

  const content = safeReadFile(filePath, findings, relFile);
  if (content === null) return { file: relFile, findings };

  const fm = extractFrontmatter(content);

  // --- KB-01: frontmatter must be present and parseable ---
  if (fm === null) {
    findings.push({
      rule: 'KB-01',
      title: 'KB File Must Have YAML Frontmatter',
      severity: 'CRITICAL',
      file: relFile,
      detail: 'No YAML frontmatter found — file must start with `---\\n...\\n---`.',
      fix: 'Prepend `---\\nsource: <url-or-original>\\nlicense: <SPDX-or-original>\\nlast_reviewed: YYYY-MM-DD\\n---` to the file.',
    });
    // Without frontmatter, downstream rules cannot fire. Still check KB-07 on body.
    checkHeading(content, relFile, findings);
    return { file: relFile, findings };
  }

  if (fm.__parse_error) {
    findings.push({
      rule: 'KB-01',
      title: 'KB File Frontmatter Must Be Valid YAML',
      severity: 'CRITICAL',
      file: relFile,
      detail: 'Frontmatter block exists but failed YAML parse.',
      fix: 'Fix YAML syntax inside `---\\n...\\n---` (check colons, quotes, indentation).',
    });
    checkHeading(extractBody(content), relFile, findings);
    return { file: relFile, findings };
  }

  // --- KB-02, KB-03, KB-04: required keys present + non-empty ---
  for (const key of REQUIRED_KEYS) {
    if (!(key in fm) || fm[key] === null || fm[key] === undefined || String(fm[key]).trim() === '') {
      const ruleMap = { source: 'KB-02', license: 'KB-03', last_reviewed: 'KB-04' };
      findings.push({
        rule: ruleMap[key],
        title: `KB Frontmatter Must Have \`${key}\``,
        severity: 'CRITICAL',
        file: relFile,
        detail: `Frontmatter is missing required key \`${key}\` (or value is empty).`,
        fix: `Add \`${key}: <value>\` to the frontmatter. See STORY-08/09 for expected format.`,
      });
    }
  }

  // --- KB-04: last_reviewed must match YYYY-MM-DD ---
  if ('last_reviewed' in fm && fm.last_reviewed !== null && fm.last_reviewed !== undefined) {
    // yaml.parse may coerce an unquoted ISO date to a Date object — normalise to string.
    let dateStr;
    if (fm.last_reviewed instanceof Date) {
      dateStr = fm.last_reviewed.toISOString().slice(0, 10);
    } else {
      dateStr = String(fm.last_reviewed).trim();
    }
    if (dateStr !== '' && !DATE_REGEX.test(dateStr)) {
      findings.push({
        rule: 'KB-04',
        title: 'KB Frontmatter `last_reviewed` Must Be ISO Date',
        severity: 'CRITICAL',
        file: relFile,
        detail: `\`last_reviewed: "${dateStr}"\` does not match YYYY-MM-DD format.`,
        fix: 'Use an ISO date, e.g. `last_reviewed: 2026-04-24`.',
      });
    }
  }

  // --- KB-05 HIGH: source must be `original` or a URL ---
  if ('source' in fm && fm.source !== null && fm.source !== undefined) {
    const sourceStr = String(fm.source).trim();
    if (sourceStr !== '' && sourceStr !== 'original' && !URL_REGEX.test(sourceStr)) {
      findings.push({
        rule: 'KB-05',
        title: 'KB Frontmatter `source` Format',
        severity: 'HIGH',
        file: relFile,
        detail: `\`source: "${sourceStr}"\` is not \`original\` and is not an http(s) URL.`,
        fix: 'Use `source: original` for GoMad-authored content, or a full URL (https://...) for third-party material.',
      });
    }
  }

  // --- KB-06 HIGH: license must be in allowlist ---
  if ('license' in fm && fm.license !== null && fm.license !== undefined) {
    const licenseStr = String(fm.license).trim();
    if (licenseStr !== '' && !LICENSE_ALLOWLIST.includes(licenseStr)) {
      findings.push({
        rule: 'KB-06',
        title: 'KB Frontmatter `license` Not In Allowlist',
        severity: 'HIGH',
        file: relFile,
        detail: `\`license: "${licenseStr}"\` is not in the allowlist: ${LICENSE_ALLOWLIST.join(', ')}.`,
        fix: `Use one of: ${LICENSE_ALLOWLIST.join(', ')}. Content under other licenses must not be shipped.`,
      });
    }
  }

  // --- KB-07 HIGH: body must have an H1 heading ---
  checkHeading(extractBody(content), relFile, findings);

  return { file: relFile, findings };
}

/**
 * KB-07 HIGH: check that the post-frontmatter body contains an H1 heading.
 */
function checkHeading(body, relFile, findings) {
  if (!H1_REGEX.test(body)) {
    findings.push({
      rule: 'KB-07',
      title: 'KB File Must Have H1 Heading',
      severity: 'HIGH',
      file: relFile,
      detail: 'No H1 heading (`# ...`) found after frontmatter. Required for D-09 catalog listing.',
      fix: 'Add a single `# Title` line as the first heading after the frontmatter.',
    });
  }
}

// --- Main Entry ---

/**
 * Validate every KB file and summarise.
 * Returns `{ results, hasCritical, hasHighPlus }`.
 */
function validateKbLicenses() {
  const files = discoverKbFiles();
  if (files.length === 0) {
    return { results: [], hasCritical: false, hasHighPlus: false };
  }
  const results = files.map((f) => validateFile(f));
  const hasCritical = results.some((r) => r.findings.some((f) => f.severity === 'CRITICAL'));
  const hasHighPlus = hasCritical || results.some((r) => r.findings.some((f) => f.severity === 'HIGH'));
  return { results, hasCritical, hasHighPlus };
}

// --- Output Formatting ---

function formatHumanReadable(results) {
  const output = [];
  const severityCounts = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
  let totalFindings = 0;

  output.push(
    '',
    `Validating KB content in: ${path.relative(PROJECT_ROOT, KB_DIR) || 'src/domain-kb'}`,
    `Mode: ${STRICT ? 'STRICT (exit 1 on HIGH+)' : 'RELEASE-GATE (exit 1 on CRITICAL)'}${JSON_OUTPUT ? ' + JSON' : ''}`,
    '',
  );

  let filesWithFindings = 0;

  for (const { file, findings } of results) {
    if (findings.length > 0) {
      filesWithFindings++;
      output.push(`${colors.cyan}${file}${colors.reset}`);
      for (const f of findings) {
        totalFindings++;
        severityCounts[f.severity]++;
        const sevColor = f.severity === 'CRITICAL' ? colors.red : f.severity === 'HIGH' ? colors.yellow : colors.dim;
        output.push(
          `  ${sevColor}[${f.severity}]${colors.reset} ${f.rule} — ${f.title}`,
          `    ${colors.dim}${f.detail}${colors.reset}`,
          `    ${colors.dim}Fix: ${f.fix}${colors.reset}`,
        );

        if (process.env.GITHUB_ACTIONS) {
          const ghFile = f.file;
          const line = 1;
          const level = f.severity === 'LOW' ? 'notice' : 'warning';
          console.log(`::${level} file=${ghFile},line=${line}::${escapeAnnotation(`${f.rule}: ${f.detail}`)}`);
        }
      }
      output.push('');
    }
  }

  // Summary
  output.push(
    '─'.repeat(60),
    'Summary:',
    `   KB files scanned: ${results.length}`,
    `   Files with findings: ${filesWithFindings}`,
    `   Total findings: ${totalFindings}`,
  );

  if (totalFindings > 0) {
    output.push('', '   | Severity | Count |', '   |----------|-------|');
    for (const sev of ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']) {
      if (severityCounts[sev] > 0) {
        output.push(`   | ${sev.padEnd(8)} | ${String(severityCounts[sev]).padStart(5)} |`);
      }
    }
  }

  const hasCritical = severityCounts.CRITICAL > 0;
  const hasHighPlus = hasCritical || severityCounts.HIGH > 0;

  if (totalFindings === 0) {
    output.push('', `   ${colors.green}All KB files passed license/attribution validation.${colors.reset}`);
  } else if (hasCritical) {
    output.push('', `   ${colors.red}[RELEASE GATE] CRITICAL findings present — exiting with failure.${colors.reset}`);
  } else if (STRICT && hasHighPlus) {
    output.push('', `   ${colors.red}[STRICT MODE] HIGH findings present — exiting with failure.${colors.reset}`);
  } else {
    output.push('', `   ${colors.yellow}HIGH findings present. Run with --strict to treat as errors.${colors.reset}`);
  }

  output.push('');

  // GitHub Actions step summary
  if (process.env.GITHUB_STEP_SUMMARY) {
    let summary = '## KB License Validation\n\n';
    if (totalFindings > 0) {
      summary += '| File | Rule | Severity | Detail |\n';
      summary += '|------|------|----------|--------|\n';
      for (const { findings } of results) {
        for (const f of findings) {
          summary += `| ${escapeTableCell(f.file)} | ${f.rule} | ${f.severity} | ${escapeTableCell(f.detail)} |\n`;
        }
      }
      summary += '\n';
    }
    summary += `**${results.length} KB files scanned, ${totalFindings} findings**\n`;
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
  }

  return { output: output.join('\n'), hasCritical, hasHighPlus };
}

function formatJson(results) {
  const allFindings = [];
  for (const { findings } of results) {
    for (const f of findings) {
      allFindings.push({
        file: f.file,
        rule: f.rule,
        title: f.title,
        severity: f.severity,
        detail: f.detail,
        fix: f.fix,
      });
    }
  }
  allFindings.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);

  const hasCritical = allFindings.some((f) => f.severity === 'CRITICAL');
  const hasHighPlus = hasCritical || allFindings.some((f) => f.severity === 'HIGH');

  return { output: JSON.stringify(allFindings, null, 2), hasCritical, hasHighPlus };
}

// --- Entry point ---

if (require.main === module) {
  const { results, hasCritical, hasHighPlus } = validateKbLicenses();
  const { output } = JSON_OUTPUT ? formatJson(results) : formatHumanReadable(results);
  console.log(output);

  // Release-gate posture: ANY CRITICAL finding fails without requiring --strict.
  if (hasCritical) process.exit(1);

  // --strict additionally promotes HIGH to a failing exit.
  if (STRICT && hasHighPlus) process.exit(1);

  process.exit(0);
}

// --- Exports (for testing + internal use) ---
module.exports = {
  validateKbLicenses,
  validateFile,
  extractFrontmatter,
  discoverKbFiles,
  LICENSE_ALLOWLIST,
  REQUIRED_KEYS,
};
