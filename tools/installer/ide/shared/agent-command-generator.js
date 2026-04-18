const path = require('node:path');
const fs = require('fs-extra');
const yaml = require('yaml');
const { toColonPath, toDashPath, customAgentColonName, customAgentDashName, GOMAD_FOLDER_NAME } = require('./path-utils');
const { getSourcePath } = require('../../project-root');

/**
 * Generates launcher command files for each agent
 */
class AgentCommandGenerator {
  // The 7 canonical agent personas — source-of-truth mapping
  // Short name → source skill directory under src/gomad-skills/
  // Plus a hand-authored one-line purpose for D-17 description formatting.
  static AGENT_SOURCES = [
    {
      shortName: 'analyst',
      dir: '1-analysis/gm-agent-analyst',
      purpose: 'Market research, competitive analysis, requirements elicitation, domain expertise',
    },
    {
      shortName: 'tech-writer',
      dir: '1-analysis/gm-agent-tech-writer',
      purpose: 'Technical writing, documentation, explanation, diagramming',
    },
    {
      shortName: 'pm',
      dir: '2-plan-workflows/gm-agent-pm',
      purpose: 'Product management, PRD creation, feature scoping, stakeholder alignment',
    },
    {
      shortName: 'ux-designer',
      dir: '2-plan-workflows/gm-agent-ux-designer',
      purpose: 'UX design, user flows, interaction design, design reviews',
    },
    {
      shortName: 'architect',
      dir: '3-solutioning/gm-agent-architect',
      purpose: 'System architecture, technical design, solution engineering',
    },
    {
      shortName: 'sm',
      dir: '4-implementation/gm-agent-sm',
      purpose: 'Scrum mastery, story creation, sprint facilitation, implementation planning',
    },
    { shortName: 'dev', dir: '4-implementation/gm-agent-dev', purpose: 'Development, implementation, coding, refactoring' },
  ];

  constructor(gomadFolderName = GOMAD_FOLDER_NAME) {
    this.templatePath = path.join(__dirname, '../templates/agent-command-template.md');
    this.gomadFolderName = gomadFolderName;
  }

  /**
   * Extract persona bodies from src/gomad-skills/*\/gm-agent-*\/SKILL.md
   * into <workspaceRoot>/<gomadFolder>/gomad/agents/<shortName>.md.
   *
   * Per D-14: strips leading YAML frontmatter block; copies body verbatim.
   * Per D-15: emits full skill-manifest.yaml as frontmatter of the extracted file.
   * Per D-18: reads from skill-manifest.yaml directly — does not quote from launcher body.
   *
   * @param {string} workspaceRoot - Target workspace directory (contains _gomad/ after install)
   * @returns {Promise<string[]>} Array of absolute paths written
   */
  async extractPersonas(workspaceRoot) {
    const skillsRoot = getSourcePath('gomad-skills');
    const outputDir = path.join(workspaceRoot, this.gomadFolderName, 'gomad', 'agents');
    await fs.ensureDir(outputDir);

    const writtenPaths = [];

    for (const { shortName, dir } of AgentCommandGenerator.AGENT_SOURCES) {
      const agentDir = path.join(skillsRoot, dir);
      const manifestPath = path.join(agentDir, 'skill-manifest.yaml');
      const skillMdPath = path.join(agentDir, 'SKILL.md');

      if (!(await fs.pathExists(manifestPath))) {
        throw new Error(`extractPersonas: missing skill-manifest.yaml at ${manifestPath}`);
      }
      if (!(await fs.pathExists(skillMdPath))) {
        throw new Error(`extractPersonas: missing SKILL.md at ${skillMdPath}`);
      }

      const manifest = yaml.parse(await fs.readFile(manifestPath, 'utf8'));
      // WR-05: fail-fast if manifest did not parse to an object (null, scalar, malformed).
      if (!manifest || typeof manifest !== 'object') {
        throw new Error(`extractPersonas: skill-manifest.yaml at ${manifestPath} did not parse to an object`);
      }
      const rawSkillMd = await fs.readFile(skillMdPath, 'utf8');
      // WR-03: normalize line endings before frontmatter strip to handle CRLF input
      // (matches parseSkillMd behavior in manifest-generator.js:236).
      const normalizedSkillMd = rawSkillMd.replaceAll('\r\n', '\n').replaceAll('\r', '\n');
      // D-14: strip leading frontmatter block (lines 1-4 of SKILL.md)
      const body = normalizedSkillMd.replace(/^---\n[\s\S]*?\n---\n+/, '');

      // D-15: emit full skill-manifest.yaml as frontmatter
      const frontmatter = yaml.stringify(manifest);
      const content = `---\n${frontmatter}---\n\n${body}`;

      const outPath = path.join(outputDir, `${shortName}.md`);
      await fs.writeFile(outPath, content);
      writtenPaths.push(outPath);
    }

    return writtenPaths;
  }

  /**
   * Generate launcher content for an agent from its skill-manifest.yaml metadata.
   * @param {Object} agent - { shortName, displayName, title, icon, capabilities, purpose }
   * @returns {Promise<string>} Rendered launcher content
   */
  async generateLauncherContent(agent) {
    // WR-05: fail-fast on missing or non-string template fields rather than emitting "undefined".
    const required = ['shortName', 'displayName', 'title', 'icon', 'capabilities', 'purpose'];
    for (const key of required) {
      if (typeof agent?.[key] !== 'string' || !agent[key]) {
        throw new Error(`generateLauncherContent: missing or non-string "${key}" for agent ${agent?.shortName || '<unknown>'}`);
      }
    }
    const template = await fs.readFile(this.templatePath, 'utf8');
    // D-17: description format "<Title> (<displayName>). <one-line purpose>."
    const description = `${agent.title} (${agent.displayName}). ${agent.purpose}.`;
    return template
      .replaceAll('{{shortName}}', agent.shortName)
      .replaceAll('{{displayName}}', agent.displayName)
      .replaceAll('{{title}}', agent.title)
      .replaceAll('{{icon}}', agent.icon)
      .replaceAll('{{capabilities}}', agent.capabilities)
      .replaceAll('{{description}}', description);
  }

  /**
   * Write 7 launcher files into launcherTargetDir with flat naming
   * (agent-<shortName>.md — no module/agents nesting per D-28).
   * Metadata derived from skill-manifest.yaml per D-18.
   *
   * @param {string} launcherTargetDir - Absolute path to .claude/commands/gm (or configured)
   * @param {string} workspaceRoot - Target workspace (for source-tree manifest lookup via getSourcePath)
   * @returns {Promise<string[]>} Array of absolute paths written
   */
  async writeAgentLaunchers(launcherTargetDir, workspaceRoot) {
    await fs.ensureDir(launcherTargetDir);
    const skillsRoot = getSourcePath('gomad-skills');
    const writtenPaths = [];

    for (const src of AgentCommandGenerator.AGENT_SOURCES) {
      const manifestPath = path.join(skillsRoot, src.dir, 'skill-manifest.yaml');
      if (!(await fs.pathExists(manifestPath))) {
        throw new Error(`writeAgentLaunchers: missing skill-manifest.yaml at ${manifestPath}`);
      }
      const manifest = yaml.parse(await fs.readFile(manifestPath, 'utf8'));
      // WR-05: fail-fast if manifest did not parse to an object — otherwise field access
      // below would silently coerce undefined into the literal string "undefined".
      if (!manifest || typeof manifest !== 'object') {
        throw new Error(`writeAgentLaunchers: skill-manifest.yaml at ${manifestPath} did not parse to an object`);
      }

      const content = await this.generateLauncherContent({
        shortName: src.shortName,
        displayName: manifest.displayName,
        title: manifest.title,
        icon: manifest.icon,
        capabilities: manifest.capabilities,
        purpose: src.purpose,
      });

      const outPath = path.join(launcherTargetDir, `agent-${src.shortName}.md`);
      await fs.writeFile(outPath, content);
      writtenPaths.push(outPath);
    }

    return writtenPaths;
  }

  /**
   * D-29: atomically remove legacy v1.1 .claude/skills/gm-agent-*\/ directories
   * during the same install that writes new launchers. No overlap window.
   * No-op if none exist.
   *
   * @param {string} workspaceRoot - Target workspace
   * @returns {Promise<string[]>} Array of paths that were removed (for logging)
   */
  async removeLegacyAgentSkillDirs(workspaceRoot) {
    const legacyBase = path.join(workspaceRoot, '.claude', 'skills');
    const removed = [];
    for (const { shortName } of AgentCommandGenerator.AGENT_SOURCES) {
      const legacyDir = path.join(legacyBase, `gm-agent-${shortName}`);
      if (await fs.pathExists(legacyDir)) {
        await fs.remove(legacyDir);
        removed.push(legacyDir);
      }
    }
    return removed;
  }

  /**
   * Write agent launcher artifacts using underscore format (Windows-compatible)
   * Creates flat files like: gomad_gomad_pm.md
   *
   * @param {string} baseCommandsDir - Base commands directory for the IDE
   * @param {Array} artifacts - Agent launcher artifacts
   * @returns {number} Count of launchers written
   */
  async writeColonArtifacts(baseCommandsDir, artifacts) {
    let writtenCount = 0;

    for (const artifact of artifacts) {
      if (artifact.type === 'agent-launcher') {
        // Convert relativePath to underscore format: gomad/agents/pm.md → gomad_gomad_pm.md
        const flatName = toColonPath(artifact.relativePath);
        const launcherPath = path.join(baseCommandsDir, flatName);
        await fs.ensureDir(path.dirname(launcherPath));
        await fs.writeFile(launcherPath, artifact.content);
        writtenCount++;
      }
    }

    return writtenCount;
  }

  /**
   * Write agent launcher artifacts using dash format (NEW STANDARD)
   * Creates flat files like: gomad-agent-gomad-pm.md
   *
   * The gomad-agent- prefix distinguishes agents from workflows/tasks/tools.
   *
   * @param {string} baseCommandsDir - Base commands directory for the IDE
   * @param {Array} artifacts - Agent launcher artifacts
   * @returns {number} Count of launchers written
   */
  async writeDashArtifacts(baseCommandsDir, artifacts) {
    let writtenCount = 0;

    for (const artifact of artifacts) {
      if (artifact.type === 'agent-launcher') {
        // Convert relativePath to dash format: gomad/agents/pm.md → gomad-agent-gomad-pm.md
        const flatName = toDashPath(artifact.relativePath);
        const launcherPath = path.join(baseCommandsDir, flatName);
        await fs.ensureDir(path.dirname(launcherPath));
        await fs.writeFile(launcherPath, artifact.content);
        writtenCount++;
      }
    }

    return writtenCount;
  }

  /**
   * Get the custom agent name in underscore format (Windows-compatible)
   * @param {string} agentName - Custom agent name
   * @returns {string} Underscore-formatted filename
   */
  getCustomAgentColonName(agentName) {
    return customAgentColonName(agentName);
  }

  /**
   * Get the custom agent name in underscore format (Windows-compatible)
   * @param {string} agentName - Custom agent name
   * @returns {string} Underscore-formatted filename
   */
  getCustomAgentDashName(agentName) {
    return customAgentDashName(agentName);
  }
}

module.exports = { AgentCommandGenerator };
