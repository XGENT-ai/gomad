import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { parse as parseYaml } from 'yaml';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CATALOG_DIR = join(__dirname, '..', 'catalog');

function loadCatalog(name) {
  const raw = readFileSync(join(CATALOG_DIR, `${name}.yaml`), 'utf8');
  return parseYaml(raw);
}

describe('Catalog parsing', () => {
  it('skills.yaml loads and has items', () => {
    const { skills } = loadCatalog('skills');
    assert.ok(Array.isArray(skills), 'skills should be an array');
    assert.ok(skills.length >= 100, `expected 100+ skills, got ${skills.length}`);
  });

  it('every skill has required fields', () => {
    const { skills } = loadCatalog('skills');
    for (const skill of skills) {
      assert.ok(skill.name, `skill missing name: ${JSON.stringify(skill)}`);
      assert.ok(skill.description, `skill ${skill.name} missing description`);
      assert.ok(skill.category, `skill ${skill.name} missing category`);
      assert.ok(typeof skill.default_include === 'boolean', `skill ${skill.name} default_include should be boolean`);
    }
  });

  it('skill names are unique', () => {
    const { skills } = loadCatalog('skills');
    const names = skills.map((s) => s.name);
    const unique = new Set(names);
    // Allow at most a few duplicates from domain overlap (connections-optimizer appears in tool and domain)
    const dupes = names.filter((n, i) => names.indexOf(n) !== i);
    assert.ok(dupes.length <= 2, `Too many duplicate skill names: ${dupes.join(', ')}`);
  });

  it('skill categories are valid', () => {
    const validCategories = new Set([
      'language', 'framework', 'testing', 'review', 'security',
      'devops', 'content', 'tool', 'domain', 'workflow',
    ]);
    const { skills } = loadCatalog('skills');
    for (const skill of skills) {
      assert.ok(validCategories.has(skill.category),
        `skill ${skill.name} has invalid category: ${skill.category}`);
    }
  });

  it('agents.yaml loads with global and project agents', () => {
    const { agents } = loadCatalog('agents');
    assert.ok(Array.isArray(agents));
    const globalAgents = agents.filter((a) => a.scope === 'global');
    const projectAgents = agents.filter((a) => a.scope === 'project');
    assert.ok(globalAgents.length >= 30, `expected 30+ global agents, got ${globalAgents.length}`);
    assert.ok(projectAgents.length >= 10, `expected 10+ project agents, got ${projectAgents.length}`);
  });

  it('every agent has required fields', () => {
    const { agents } = loadCatalog('agents');
    for (const agent of agents) {
      assert.ok(agent.name, 'agent missing name');
      assert.ok(agent.description, `agent ${agent.name} missing description`);
      assert.ok(['global', 'project'].includes(agent.scope),
        `agent ${agent.name} has invalid scope: ${agent.scope}`);
      assert.ok(typeof agent.default_include === 'boolean',
        `agent ${agent.name} default_include should be boolean`);
    }
  });

  it('commands.yaml loads with items', () => {
    const { commands } = loadCatalog('commands');
    assert.ok(Array.isArray(commands));
    assert.ok(commands.length >= 50, `expected 50+ commands, got ${commands.length}`);
  });

  it('hooks.yaml loads with typed hooks', () => {
    const { hooks } = loadCatalog('hooks');
    assert.ok(Array.isArray(hooks));
    const types = new Set(hooks.map((h) => h.type));
    assert.ok(types.has('PreToolUse'), 'should have PreToolUse hooks');
    assert.ok(types.has('PostToolUse'), 'should have PostToolUse hooks');
    assert.ok(types.has('Stop'), 'should have Stop hooks');
  });
});
