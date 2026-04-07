import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import * as p from '@clack/prompts';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const CATALOG_DIR = join(__dirname, '..', 'catalog');

function loadCatalog(filename) {
  const raw = readFileSync(join(CATALOG_DIR, filename), 'utf8');
  return parseYaml(raw);
}

function resolvePreset(presetName, presets, catalogs) {
  const preset = presets[presetName];
  if (!preset) {
    throw new Error(`Unknown preset: ${presetName}`);
  }

  if (preset.include_all) {
    return {
      skills: catalogs.skills.map((s) => s.name),
      agents: catalogs.agents.map((a) => a.name),
      commands: catalogs.commands.map((c) => c.name),
      hooks: catalogs.hooks.map((h) => h.name),
    };
  }

  const result = {
    skills: [...(preset.skills || [])],
    agents: [...(preset.agents || [])],
    commands: [...(preset.commands || [])],
    hooks: [...(preset.hooks || [])],
  };

  // Handle preset extension
  if (preset.extend) {
    const base = resolvePreset(preset.extend, presets, catalogs);
    result.skills = [...new Set([...base.skills, ...result.skills])];
    result.agents = [...new Set([...base.agents, ...result.agents])];
    result.commands = [...new Set([...base.commands, ...result.commands])];
    result.hooks = [...new Set([...base.hooks, ...result.hooks])];
  }

  // Merge additional_* fields
  if (preset.additional_skills) {
    result.skills = [...new Set([...result.skills, ...preset.additional_skills])];
  }
  if (preset.additional_agents) {
    result.agents = [...new Set([...result.agents, ...preset.additional_agents])];
  }
  if (preset.additional_commands) {
    result.commands = [...new Set([...result.commands, ...preset.additional_commands])];
  }
  if (preset.additional_hooks) {
    result.hooks = [...new Set([...result.hooks, ...preset.additional_hooks])];
  }

  return result;
}

function groupByCategory(items) {
  const groups = {};
  for (const item of items) {
    const cat = item.category || item.type || item.scope || 'other';
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(item);
  }
  return groups;
}

/**
 * Interactive skill/agent/hook selector using @clack/prompts.
 * Reads catalogs, presents preset selection, then per-item toggles.
 * Writes mobmad.lock.yaml with selections.
 *
 * @param {object} options - { preset?: string, yes?: boolean }
 * @returns {object} resolved selections { skills, agents, commands, hooks }
 */
export async function curate(options = {}) {
  const { skills: skillCatalog } = loadCatalog('skills.yaml');
  const { agents: agentCatalog } = loadCatalog('agents.yaml');
  const { commands: commandCatalog } = loadCatalog('commands.yaml');
  const { hooks: hookCatalog } = loadCatalog('hooks.yaml');
  const { presets } = loadCatalog('presets.yaml');

  const catalogs = {
    skills: skillCatalog,
    agents: agentCatalog,
    commands: commandCatalog,
    hooks: hookCatalog,
  };

  // Non-interactive mode
  if (options.preset && options.yes) {
    const resolved = resolvePreset(options.preset, presets, catalogs);
    writeLockfile(resolved);
    return resolved;
  }

  p.intro('mobmad — curate your skill set');

  // Step 1: Preset selection
  const presetChoice = options.preset || await p.select({
    message: 'Choose a preset to start from:',
    options: Object.entries(presets).map(([key, val]) => ({
      value: key,
      label: `${key} — ${val.description}`,
    })),
  });

  if (p.isCancel(presetChoice)) {
    p.cancel('Curation cancelled.');
    process.exit(0);
  }

  const resolved = resolvePreset(presetChoice, presets, catalogs);

  // Step 2: Ask if user wants to customize
  const customize = await p.confirm({
    message: `Preset "${presetChoice}" includes ${resolved.skills.length} skills, ${resolved.agents.length} agents, ${resolved.commands.length} commands, ${resolved.hooks.length} hooks. Customize?`,
    initialValue: false,
  });

  if (p.isCancel(customize)) {
    p.cancel('Curation cancelled.');
    process.exit(0);
  }

  if (customize) {
    // Step 3: Per-category skill toggles
    const skillGroups = groupByCategory(skillCatalog);

    for (const [category, skills] of Object.entries(skillGroups)) {
      const selected = await p.multiselect({
        message: `Skills — ${category}:`,
        options: skills.map((s) => ({
          value: s.name,
          label: `${s.name} — ${s.description}`,
        })),
        initialValues: skills
          .filter((s) => resolved.skills.includes(s.name))
          .map((s) => s.name),
        required: false,
      });

      if (p.isCancel(selected)) {
        p.cancel('Curation cancelled.');
        process.exit(0);
      }

      // Remove all skills from this category, then add selected ones
      const categoryNames = new Set(skills.map((s) => s.name));
      resolved.skills = resolved.skills.filter((s) => !categoryNames.has(s));
      resolved.skills.push(...selected);
    }

    // Agent toggles
    const agentSelected = await p.multiselect({
      message: 'Agents:',
      options: agentCatalog.map((a) => ({
        value: a.name,
        label: `${a.name} — ${a.description}`,
      })),
      initialValues: resolved.agents,
      required: false,
    });

    if (!p.isCancel(agentSelected)) {
      resolved.agents = agentSelected;
    }
  }

  // Write lockfile
  writeLockfile(resolved);

  p.outro(`Saved selections to mobmad.lock.yaml — ${resolved.skills.length} skills, ${resolved.agents.length} agents, ${resolved.commands.length} commands, ${resolved.hooks.length} hooks`);

  return resolved;
}

function writeLockfile(selections) {
  const lockPath = join(__dirname, '..', 'mobmad.lock.yaml');
  const content = stringifyYaml({
    generated: new Date().toISOString(),
    version: '0.1.0',
    ...selections,
  });
  writeFileSync(lockPath, content, 'utf8');
}

// Allow direct execution
if (process.argv[1] === __filename) {
  curate().catch(console.error);
}
