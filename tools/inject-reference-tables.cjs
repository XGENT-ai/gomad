/**
 * Auto-generated Reference Table Injector
 *
 * Reads source-of-truth skill catalog from src/gomad-skills/ and src/core-skills/,
 * renders markdown tables for the docs reference pages, and substitutes the rendered
 * tables between AUTO marker comments. Eliminates drift on the moving-target
 * persona/skill catalog (D-05).
 *
 * Source of truth (per-phase enumeration; never hardcoded):
 *   - src/gomad-skills/1-analysis/         (Analysis phase)
 *   - src/gomad-skills/2-plan-workflows/   (Planning phase)
 *   - src/gomad-skills/3-solutioning/      (Solutioning phase)
 *   - src/gomad-skills/4-implementation/   (Implementation phase)
 *   - src/core-skills/                     (Core phase-agnostic skills)
 *
 * Persona dirs match `gm-agent-*`. Task-skill dirs are any other directory containing
 * SKILL.md. The src/domain-kb/ tree is skipped — KB packs use a different SKILL.md
 * contract validated by tools/validate-kb-licenses.js (Pitfall 6).
 *
 * Idempotency: re-running injectBetweenMarkers() on already-substituted source produces
 * byte-identical output (Pitfall 1). Standalone CLI invocation is safe to run repeatedly.
 *
 * If docs/reference/ pages do not yet exist (Plan 03 hasn't authored them), the CLI
 * silently skips them so this tool can ship before its consumers in Wave 1.
 *
 * Usage:
 *   node tools/inject-reference-tables.cjs   # Inject into docs/reference/{agents,skills}.md
 *   require('./inject-reference-tables.cjs') # Programmatic (used by tests + build-docs.mjs)
 */

const fs = require('node:fs');
const path = require('node:path');
const { parseFrontmatterMultiline } = require('./validate-skills.js');

// =============================================================================
// Constants
// =============================================================================

const PROJECT_ROOT = path.resolve(__dirname, '..');
const SKILL_ROOT = path.join(PROJECT_ROOT, 'src', 'gomad-skills');
const CORE_ROOT = path.join(PROJECT_ROOT, 'src', 'core-skills');
const DOCS_ROOT = path.join(PROJECT_ROOT, 'docs');

const PHASE_DIRS = ['1-analysis', '2-plan-workflows', '3-solutioning', '4-implementation'];
const PHASE_LABELS = {
  '1-analysis': 'Analysis',
  '2-plan-workflows': 'Planning',
  '3-solutioning': 'Solutioning',
  '4-implementation': 'Implementation',
};
const PHASE_ORDER = Object.fromEntries(PHASE_DIRS.map((p, i) => [p, i]));

const EXPECTED_PERSONA_COUNT = 8;

// Reference page targets (English + zh-cn). Missing files are silently skipped.
const REFERENCE_PAGES = {
  agents: [path.join(DOCS_ROOT, 'reference', 'agents.md'), path.join(DOCS_ROOT, 'zh-cn', 'reference', 'agents.md')],
  skills: [path.join(DOCS_ROOT, 'reference', 'skills.md'), path.join(DOCS_ROOT, 'zh-cn', 'reference', 'skills.md')],
};

// Per-phase marker pairs for the skills page (D-08).
const SKILLS_MARKER_KEYS = [
  { key: 'analysis', label: 'Analysis' },
  { key: 'planning', label: 'Planning' },
  { key: 'solutioning', label: 'Solutioning' },
  { key: 'implementation', label: 'Implementation' },
  { key: 'core', label: 'Core' },
];

// =============================================================================
// Helpers
// =============================================================================

/**
 * Escape a string so it is safe to embed in a markdown table cell.
 * - Pipe characters become \| so they don't fracture the column count (T-11-02-01).
 * - Newlines collapse to a single space so the row stays on one logical line.
 */
function escapeTableCell(str) {
  return String(str || '')
    .replaceAll('|', String.raw`\|`)
    .replaceAll(/\r?\n+/g, ' ')
    .trim();
}

/**
 * Read a file's text content, returning null if it does not exist.
 * Throws on any other read error.
 */
function readFileOrNull(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    if (error && error.code === 'ENOENT') return null;
    throw error;
  }
}

/**
 * Parse the SKILL.md frontmatter at skillDir/SKILL.md.
 * Returns the parsed object, or null if the SKILL.md is missing or has no frontmatter.
 */
function readSkillFrontmatter(skillDir) {
  const skillMd = path.join(skillDir, 'SKILL.md');
  const raw = readFileOrNull(skillMd);
  if (raw === null) return null;
  return parseFrontmatterMultiline(raw);
}

/**
 * Best-effort read of skill-manifest.yaml for a persona — returns the raw text or null.
 * We avoid pulling the `yaml` package here because the only fields we need
 * (displayName, title, icon) are flat scalars; a tiny line scanner is enough
 * and keeps the injector dependency-free.
 */
function readManifestFields(skillDir) {
  const manifestPath = path.join(skillDir, 'skill-manifest.yaml');
  const raw = readFileOrNull(manifestPath);
  if (raw === null) return {};
  const fields = {};
  for (const rawLine of raw.split(/\r?\n/)) {
    const line = rawLine.trimEnd();
    if (!line || line.startsWith('#')) continue;
    if (line[0] === ' ' || line[0] === '\t') continue; // skip nested values
    const colon = line.indexOf(':');
    if (colon <= 0) continue;
    const key = line.slice(0, colon).trim();
    let value = line.slice(colon + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    fields[key] = value;
  }
  return fields;
}

// =============================================================================
// Discovery
// =============================================================================

/**
 * Walk a directory tree, returning every directory that directly contains SKILL.md.
 * Skips node_modules, .git, and domain-kb (KB pack contract — Pitfall 6).
 */
function walkSkillDirs(rootDir) {
  const skillDirs = [];
  if (!fs.existsSync(rootDir)) return skillDirs;

  function walk(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (entry.name === 'node_modules' || entry.name === '.git') continue;
      // domain-kb/ uses a different SKILL.md contract (KB pack frontmatter:
      // source/license/last_reviewed) validated by tools/validate-kb-licenses.js.
      if (entry.name === 'domain-kb') continue;

      const fullPath = path.join(dir, entry.name);
      if (fs.existsSync(path.join(fullPath, 'SKILL.md'))) {
        skillDirs.push(fullPath);
      }
      walk(fullPath);
    }
  }

  walk(rootDir);
  return skillDirs;
}

/**
 * Determine which top-level phase directory a skill lives under.
 * Returns one of PHASE_DIRS or null if the skill isn't under a known phase.
 */
function phaseOfSkill(skillDir) {
  const rel = path.relative(SKILL_ROOT, skillDir);
  if (rel.startsWith('..')) return null;
  const top = rel.split(path.sep)[0];
  return PHASE_DIRS.includes(top) ? top : null;
}

/**
 * Discover all 8 persona skills (gm-agent-*) across all four phase dirs.
 * Returns entries sorted by phase order, then by name.
 */
function discoverPersonas() {
  const personas = [];
  for (const skillDir of walkSkillDirs(SKILL_ROOT)) {
    const base = path.basename(skillDir);
    if (!base.startsWith('gm-agent-')) continue;
    const phase = phaseOfSkill(skillDir);
    if (phase === null) continue;
    const fm = readSkillFrontmatter(skillDir) || {};
    const manifest = readManifestFields(skillDir);
    personas.push({
      phase,
      dir: skillDir,
      name: fm.name || base,
      shortName: base.replace(/^gm-agent-/, ''),
      displayName: manifest.displayName || fm.name || base,
      title: manifest.title || '',
      icon: manifest.icon || '',
      description: fm.description || '',
    });
  }
  personas.sort((a, b) => {
    const pa = PHASE_ORDER[a.phase] ?? 99;
    const pb = PHASE_ORDER[b.phase] ?? 99;
    if (pa !== pb) return pa - pb;
    return a.name.localeCompare(b.name);
  });
  return personas;
}

/**
 * Discover task skills under src/gomad-skills/ — every dir with SKILL.md whose name
 * does NOT start with `gm-agent-`. domain-kb/ is excluded (Pitfall 6).
 */
function discoverTaskSkills() {
  const skills = [];
  for (const skillDir of walkSkillDirs(SKILL_ROOT)) {
    const base = path.basename(skillDir);
    if (base.startsWith('gm-agent-')) continue;
    const phase = phaseOfSkill(skillDir);
    if (phase === null) continue;
    const fm = readSkillFrontmatter(skillDir) || {};
    skills.push({
      phase,
      dir: skillDir,
      name: fm.name || base,
      description: fm.description || '',
    });
  }
  skills.sort((a, b) => {
    const pa = PHASE_ORDER[a.phase] ?? 99;
    const pb = PHASE_ORDER[b.phase] ?? 99;
    if (pa !== pb) return pa - pb;
    return a.name.localeCompare(b.name);
  });
  return skills;
}

/**
 * Discover core skills — every direct child of src/core-skills/ that contains SKILL.md.
 */
function discoverCoreSkills() {
  const skills = [];
  if (!fs.existsSync(CORE_ROOT)) return skills;
  const entries = fs.readdirSync(CORE_ROOT, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'domain-kb') continue;
    const skillDir = path.join(CORE_ROOT, entry.name);
    if (!fs.existsSync(path.join(skillDir, 'SKILL.md'))) continue;
    const fm = readSkillFrontmatter(skillDir) || {};
    skills.push({
      dir: skillDir,
      name: fm.name || entry.name,
      description: fm.description || '',
    });
  }
  skills.sort((a, b) => a.name.localeCompare(b.name));
  return skills;
}

// =============================================================================
// Rendering
// =============================================================================

/**
 * Render the personas reference table. Four columns (D-07): Persona, Slash command,
 * Phase, Purpose. Output is a markdown table with header + separator + 1 row per persona.
 */
function renderAgentsTable(personas) {
  const lines = [];
  lines.push('| Persona | Slash command | Phase | Purpose |', '| --- | --- | --- | --- |');
  for (const p of personas) {
    const display = escapeTableCell(p.displayName || p.name);
    const slash = `\`/gm:agent-${p.shortName}\``;
    const phaseLabel = PHASE_LABELS[p.phase] || p.phase;
    const purpose = escapeTableCell(p.description);
    lines.push(`| ${display} | ${slash} | ${phaseLabel} | ${purpose} |`);
  }
  return lines.join('\n');
}

/**
 * Render a per-phase task-skill section. Three columns: Skill, Description, Invoked by.
 */
function renderTaskSkillSection(skillsForPhase) {
  const lines = [];
  lines.push('| Skill | Description | Invoked by |', '| --- | --- | --- |');
  for (const s of skillsForPhase) {
    lines.push(`| \`${s.name}\` | ${escapeTableCell(s.description)} | Invoked by \`gm-agent-*\` or any persona via the skill loader |`);
  }
  return lines.join('\n');
}

/**
 * Render the core-skills section. Same column shape as task-skills.
 */
function renderCoreSection(coreSkills) {
  const lines = [];
  lines.push('| Skill | Description | Invoked by |', '| --- | --- | --- |');
  for (const s of coreSkills) {
    lines.push(`| \`${s.name}\` | ${escapeTableCell(s.description)} | Invoked by \`gm-agent-*\` or any persona via the skill loader |`);
  }
  return lines.join('\n');
}

/**
 * Render the full skills reference, returning a map keyed by section:
 *   { analysis, planning, solutioning, implementation, core }
 *
 * Each value is a markdown table string ready to be substituted between
 * <!-- AUTO:skills-table-{key}-start --> / <!-- AUTO:skills-table-{key}-end --> markers.
 *
 * The output also includes section labels in a top-of-string comment so callers
 * (and Test 8) can verify all five sections are represented in a single view.
 */
function renderSkillsTable(taskSkills, coreSkills) {
  const byPhase = {
    '1-analysis': [],
    '2-plan-workflows': [],
    '3-solutioning': [],
    '4-implementation': [],
  };
  for (const s of taskSkills) {
    if (byPhase[s.phase]) byPhase[s.phase].push(s);
  }
  return {
    analysis: `<!-- section: Analysis -->\n${renderTaskSkillSection(byPhase['1-analysis'])}`,
    planning: `<!-- section: Planning -->\n${renderTaskSkillSection(byPhase['2-plan-workflows'])}`,
    solutioning: `<!-- section: Solutioning -->\n${renderTaskSkillSection(byPhase['3-solutioning'])}`,
    implementation: `<!-- section: Implementation -->\n${renderTaskSkillSection(byPhase['4-implementation'])}`,
    core: `<!-- section: Core -->\n${renderCoreSection(coreSkills)}`,
  };
}

// =============================================================================
// Marker substitution
// =============================================================================

/**
 * Substitute the content between matched HTML-comment markers with `replacement`.
 *
 * The match is anchored on `<!-- {startMarker} -->` and `<!-- {endMarker} -->` (with
 * optional whitespace around the marker name). Throws if either marker is absent.
 *
 * Idempotent: substituting an already-substituted region with the same replacement
 * yields byte-identical output (the regex non-greedily matches whatever lives between
 * the markers and replaces it with `\n${replacement}\n`).
 */
function injectBetweenMarkers(source, startMarker, endMarker, replacement) {
  const re = new RegExp(`(<!--\\s*${startMarker}\\s*-->)[\\s\\S]*?(<!--\\s*${endMarker}\\s*-->)`);
  if (!re.test(source)) {
    throw new Error(`Markers ${startMarker}/${endMarker} not found in source.`);
  }
  return source.replace(re, `$1\n${replacement}\n$2`);
}

// =============================================================================
// File-level injection
// =============================================================================

/**
 * Inject `replacement` between markers in `filePath` and write the result back
 * IF AND ONLY IF the content changed (preserves mtime when a no-op).
 *
 * Returns:
 *   - 'skipped' if the file does not exist (Plan 03 hasn't authored markers yet)
 *   - 'unchanged' if the file exists but content was already byte-identical
 *   - 'written' if the file was modified
 */
function injectFile(filePath, startMarker, endMarker, replacement) {
  const original = readFileOrNull(filePath);
  if (original === null) return 'skipped';
  const next = injectBetweenMarkers(original, startMarker, endMarker, replacement);
  if (next === original) return 'unchanged';
  fs.writeFileSync(filePath, next, 'utf8');
  return 'written';
}

/**
 * Variant that performs multiple marker substitutions on the same file in one pass.
 * `pairs` is an array of { startMarker, endMarker, replacement } objects. Markers
 * that are not present cause the whole file to be skipped (best-effort fault containment
 * — a file missing one section's markers shouldn't be partially injected).
 */
function injectMultipleSections(filePath, pairs) {
  const original = readFileOrNull(filePath);
  if (original === null) return 'skipped';
  let working = original;
  for (const { startMarker, endMarker, replacement } of pairs) {
    const re = new RegExp(`<!--\\s*${startMarker}\\s*-->[\\s\\S]*?<!--\\s*${endMarker}\\s*-->`);
    if (!re.test(working)) {
      // Markers absent — file isn't ready for these sections yet. Skip rather than throw
      // so partial-marker authoring during Wave 3 doesn't break the whole pipeline.
      continue;
    }
    working = injectBetweenMarkers(working, startMarker, endMarker, replacement);
  }
  if (working === original) return 'unchanged';
  fs.writeFileSync(filePath, working, 'utf8');
  return 'written';
}

// =============================================================================
// Main
// =============================================================================

function main() {
  const personas = discoverPersonas();
  if (personas.length !== EXPECTED_PERSONA_COUNT) {
    throw new Error(
      `Expected ${EXPECTED_PERSONA_COUNT} personas, found ${personas.length}. ` +
        `Personas: ${personas.map((p) => p.name).join(', ')}. ` +
        `Either a persona was added/removed (update EXPECTED_PERSONA_COUNT and the test count) ` +
        `or the discovery walk is broken.`,
    );
  }

  const taskSkills = discoverTaskSkills();
  const coreSkills = discoverCoreSkills();

  const agentsTable = renderAgentsTable(personas);
  const skillsSections = renderSkillsTable(taskSkills, coreSkills);

  let touched = 0;
  let skipped = 0;

  for (const filePath of REFERENCE_PAGES.agents) {
    const result = injectFile(filePath, 'AUTO:agents-table-start', 'AUTO:agents-table-end', agentsTable);
    if (result === 'written') touched++;
    if (result === 'skipped') skipped++;
  }

  const skillsPairs = SKILLS_MARKER_KEYS.map(({ key }) => ({
    startMarker: `AUTO:skills-table-${key}-start`,
    endMarker: `AUTO:skills-table-${key}-end`,
    replacement: skillsSections[key],
  }));

  for (const filePath of REFERENCE_PAGES.skills) {
    const result = injectMultipleSections(filePath, skillsPairs);
    if (result === 'written') touched++;
    if (result === 'skipped') skipped++;
  }

  const summary =
    `personas=${personas.length} task-skills=${taskSkills.length} core-skills=${coreSkills.length} ` +
    `pages-written=${touched} pages-skipped=${skipped}`;
  console.log(`  Reference table catalog: ${summary}`);
}

if (require.main === module) {
  try {
    main();
    console.log('  ✓ Reference tables injected');
  } catch (error) {
    console.error(`  ✗ ${error.message}`);
    process.exit(1);
  }
}

module.exports = {
  injectBetweenMarkers,
  discoverPersonas,
  discoverTaskSkills,
  discoverCoreSkills,
  renderAgentsTable,
  renderSkillsTable,
  escapeTableCell,
};
