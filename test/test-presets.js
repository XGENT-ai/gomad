import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { parse as parseYaml } from 'yaml';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CATALOG_DIR = join(__dirname, '..', 'catalog');

function loadCatalog(name) {
  return parseYaml(readFileSync(join(CATALOG_DIR, `${name}.yaml`), 'utf8'));
}

function resolvePreset(presetName, presets, catalogs) {
  const preset = presets[presetName];
  if (!preset) throw new Error(`Unknown preset: ${presetName}`);

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

  if (preset.extend) {
    const base = resolvePreset(preset.extend, presets, catalogs);
    result.skills = [...new Set([...base.skills, ...result.skills])];
    result.agents = [...new Set([...base.agents, ...result.agents])];
    result.commands = [...new Set([...base.commands, ...result.commands])];
    result.hooks = [...new Set([...base.hooks, ...result.hooks])];
  }

  for (const key of ['additional_skills', 'additional_agents', 'additional_commands', 'additional_hooks']) {
    const target = key.replace('additional_', '');
    if (preset[key]) {
      result[target] = [...new Set([...result[target], ...preset[key]])];
    }
  }

  return result;
}

describe('Preset resolution', () => {
  const catalogs = {
    skills: loadCatalog('skills').skills,
    agents: loadCatalog('agents').agents,
    commands: loadCatalog('commands').commands,
    hooks: loadCatalog('hooks').hooks,
  };
  const { presets } = loadCatalog('presets');

  it('all preset names are valid', () => {
    const expected = ['full', 'full-stack', 'python-only', 'enterprise', 'lean', 'enhanced'];
    for (const name of expected) {
      assert.ok(presets[name], `preset "${name}" should exist`);
    }
  });

  it('full preset includes all skills', () => {
    const result = resolvePreset('full', presets, catalogs);
    assert.equal(result.skills.length, catalogs.skills.length);
    assert.equal(result.agents.length, catalogs.agents.length);
  });

  it('lean preset has fewer than 20 skills', () => {
    const result = resolvePreset('lean', presets, catalogs);
    assert.ok(result.skills.length <= 20,
      `lean should have <=20 skills, got ${result.skills.length}`);
    assert.ok(result.skills.length >= 10,
      `lean should have >=10 skills, got ${result.skills.length}`);
  });

  it('full-stack preset is between lean and full', () => {
    const lean = resolvePreset('lean', presets, catalogs);
    const fullStack = resolvePreset('full-stack', presets, catalogs);
    const full = resolvePreset('full', presets, catalogs);
    assert.ok(fullStack.skills.length > lean.skills.length);
    assert.ok(fullStack.skills.length < full.skills.length);
  });

  it('enterprise extends full-stack', () => {
    assert.equal(presets.enterprise.extend, 'full-stack');
    const enterprise = resolvePreset('enterprise', presets, catalogs);
    const fullStack = resolvePreset('full-stack', presets, catalogs);
    assert.ok(enterprise.skills.length > fullStack.skills.length);
  });

  it('enhanced extends lean and includes project agents', () => {
    assert.equal(presets['enhanced'].extend, 'lean');
    const result = resolvePreset('enhanced', presets, catalogs);
    const projectScopeNames = new Set(
      catalogs.agents.filter((a) => a.scope === 'project').map((a) => a.name)
    );
    const projectAgents = result.agents.filter((a) => projectScopeNames.has(a));
    assert.ok(projectAgents.length >= 10, `expected 10+ project agents, got ${projectAgents.length}`);
  });

  it('all preset skills reference existing catalog entries', () => {
    const skillNames = new Set(catalogs.skills.map((s) => s.name));
    for (const [presetName, preset] of Object.entries(presets)) {
      if (preset.include_all) continue;
      const allSkills = [
        ...(preset.skills || []),
        ...(preset.additional_skills || []),
      ];
      for (const skill of allSkills) {
        assert.ok(skillNames.has(skill),
          `preset "${presetName}" references unknown skill: ${skill}`);
      }
    }
  });

  it('all preset agents reference existing catalog entries', () => {
    const agentNames = new Set(catalogs.agents.map((a) => a.name));
    for (const [presetName, preset] of Object.entries(presets)) {
      if (preset.include_all) continue;
      const allAgents = [
        ...(preset.agents || []),
        ...(preset.additional_agents || []),
      ];
      for (const agent of allAgents) {
        assert.ok(agentNames.has(agent),
          `preset "${presetName}" references unknown agent: ${agent}`);
      }
    }
  });
});
