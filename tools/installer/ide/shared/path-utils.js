/**
 * Path transformation utilities for IDE installer standardization
 *
 * Provides utilities to convert hierarchical paths to flat naming conventions.
 *
 * DASH-BASED NAMING (new standard):
 * - Agents: gomad-agent-module-name.md (with gomad-agent- prefix)
 * - Workflows/Tasks/Tools: gomad-module-name.md
 *
 * Example outputs:
 * - cis/agents/storymaster.md → gomad-agent-cis-storymaster.md
 * - gomad/workflows/plan-project.md → gomad-gomad-plan-project.md
 * - gomad/tasks/create-story.md → gomad-gomad-create-story.md
 * - core/agents/brainstorming.md → gomad-agent-brainstorming.md (core agents skip module name)
 * - standalone/agents/fred.md → gomad-agent-standalone-fred.md
 */

const path = require('node:path');

// Type segments - agents are included in naming, others are filtered out
const TYPE_SEGMENTS = ['workflows', 'tasks', 'tools'];
const AGENT_SEGMENT = 'agents';

// GOMAD installation folder name - centralized constant for all installers
const GOMAD_FOLDER_NAME = '_gomad';

// v1.3+ persona body location under <installRoot>/_gomad/. Sole source of
// truth — every other module derives from this constant. Pair with
// LEGACY_AGENTS_PERSONA_SUBPATH so cleanup-planner can name the old path.
const AGENTS_PERSONA_SUBPATH = path.posix.join('_config', 'agents');
const LEGACY_AGENTS_PERSONA_SUBPATH = path.posix.join('gomad', 'agents');

/**
 * Convert hierarchical path to flat dash-separated name (NEW STANDARD)
 * Converts: 'gomad', 'agents', 'pm' → 'gomad-agent-gomad-pm.md'
 * Converts: 'gomad', 'workflows', 'correct-course' → 'gomad-gomad-correct-course.md'
 * Converts: 'core', 'agents', 'brainstorming' → 'gomad-agent-brainstorming.md' (core agents skip module name)
 * Converts: 'standalone', 'agents', 'fred' → 'gomad-agent-standalone-fred.md'
 *
 * @param {string} module - Module name (e.g., 'gomad', 'core', 'standalone')
 * @param {string} type - Artifact type ('agents', 'workflows', 'tasks', 'tools')
 * @param {string} name - Artifact name (e.g., 'pm', 'brainstorming')
 * @returns {string} Flat filename like 'gomad-agent-gomad-pm.md' or 'gomad-gomad-correct-course.md'
 */
function toDashName(module, type, name) {
  const isAgent = type === AGENT_SEGMENT;

  // For core module, skip the module name: use 'gomad-agent-name.md' instead of 'gomad-agent-core-name.md'
  if (module === 'core') {
    return isAgent ? `gomad-agent-${name}.md` : `gomad-${name}.md`;
  }
  // For standalone module, include 'standalone' in the name
  if (module === 'standalone') {
    return isAgent ? `gomad-agent-standalone-${name}.md` : `gomad-standalone-${name}.md`;
  }

  // Module artifacts: gomad-module-name.md or gomad-agent-module-name.md
  // eslint-disable-next-line unicorn/prefer-string-replace-all -- regex replace is intentional here
  const dashName = name.replace(/\//g, '-'); // Flatten nested paths
  return isAgent ? `gomad-agent-${module}-${dashName}.md` : `gomad-${module}-${dashName}.md`;
}

/**
 * Convert relative path to flat dash-separated name
 * Converts: 'gomad/agents/pm.md' → 'gomad-agent-gomad-pm.md'
 * Converts: 'gomad/agents/tech-writer/tech-writer.md' → 'gomad-agent-gomad-tech-writer.md' (uses folder name)
 * Converts: 'gomad/workflows/correct-course.md' → 'gomad-gomad-correct-course.md'
 * Converts: 'core/agents/brainstorming.md' → 'gomad-agent-brainstorming.md' (core agents skip module name)
 *
 * @param {string} relativePath - Path like 'gomad/agents/pm.md'
 * @returns {string} Flat filename like 'gomad-agent-gomad-pm.md' or 'gomad-brainstorming.md'
 */
function toDashPath(relativePath) {
  if (!relativePath || typeof relativePath !== 'string') {
    // Return a safe default for invalid input
    return 'gomad-unknown.md';
  }

  // Strip common file extensions to avoid double extensions in generated filenames
  // e.g., 'create-story.xml' → 'create-story', 'workflow.md' → 'workflow'
  const withoutExt = relativePath.replace(/\.(md|yaml|yml|json|xml|toml)$/i, '');
  const parts = withoutExt.split(/[/\\]/);

  const module = parts[0];
  const type = parts[1];
  let name;

  // For agents, if nested in a folder (more than 3 parts), use the folder name only
  // e.g., 'gomad/agents/tech-writer/tech-writer' → 'tech-writer' (not 'tech-writer-tech-writer')
  if (type === 'agents' && parts.length > 3) {
    // Use the folder name (parts[2]) as the name, ignore the file name
    name = parts[2];
  } else {
    // For non-nested or non-agents, join all parts after type
    name = parts.slice(2).join('-');
  }

  return toDashName(module, type, name);
}

/**
 * Create custom agent dash name
 * Creates: 'gomad-custom-agent-fred-commit-poet.md'
 *
 * @param {string} agentName - Custom agent name
 * @returns {string} Flat filename like 'gomad-custom-agent-fred-commit-poet.md'
 */
function customAgentDashName(agentName) {
  return `gomad-custom-agent-${agentName}.md`;
}

/**
 * Check if a filename uses dash format
 * @param {string} filename - Filename to check
 * @returns {boolean} True if filename uses dash format
 */
function isDashFormat(filename) {
  return filename.startsWith('gomad-') && filename.includes('-');
}

/**
 * Extract parts from a dash-formatted filename
 * Parses: 'gomad-agent-gomad-pm.md' → { prefix: 'gomad', module: 'gomad', type: 'agents', name: 'pm' }
 * Parses: 'gomad-gomad-correct-course.md' → { prefix: 'gomad', module: 'gomad', type: 'workflows', name: 'correct-course' }
 * Parses: 'gomad-agent-brainstorming.md' → { prefix: 'gomad', module: 'core', type: 'agents', name: 'brainstorming' } (core agents)
 * Parses: 'gomad-brainstorming.md' → { prefix: 'gomad', module: 'core', type: 'workflows', name: 'brainstorming' } (core workflows)
 * Parses: 'gomad-agent-standalone-fred.md' → { prefix: 'gomad', module: 'standalone', type: 'agents', name: 'fred' }
 * Parses: 'gomad-standalone-foo.md' → { prefix: 'gomad', module: 'standalone', type: 'workflows', name: 'foo' }
 *
 * @param {string} filename - Dash-formatted filename
 * @returns {Object|null} Parsed parts or null if invalid format
 */
function parseDashName(filename) {
  const withoutExt = filename.replace('.md', '');
  const parts = withoutExt.split('-');

  if (parts.length < 2 || parts[0] !== 'gomad') {
    return null;
  }

  // Check if this is an agent file (has 'agent' as second part)
  const isAgent = parts[1] === 'agent';

  if (isAgent) {
    // This is an agent file
    // Format: gomad-agent-name (core) or gomad-agent-standalone-name or gomad-agent-module-name
    if (parts.length >= 4 && parts[2] === 'standalone') {
      // Standalone agent: gomad-agent-standalone-name
      return {
        prefix: parts[0],
        module: 'standalone',
        type: 'agents',
        name: parts.slice(3).join('-'),
      };
    }
    if (parts.length === 3) {
      // Core agent: gomad-agent-name
      return {
        prefix: parts[0],
        module: 'core',
        type: 'agents',
        name: parts[2],
      };
    } else {
      // Module agent: gomad-agent-module-name
      return {
        prefix: parts[0],
        module: parts[2],
        type: 'agents',
        name: parts.slice(3).join('-'),
      };
    }
  }

  // Not an agent file - must be a workflow/tool/task
  // If only 2 parts (gomad-name), it's a core workflow/tool/task
  if (parts.length === 2) {
    return {
      prefix: parts[0],
      module: 'core',
      type: 'workflows', // Default to workflows for non-agent core items
      name: parts[1],
    };
  }

  // Check for standalone non-agent: gomad-standalone-name
  if (parts[1] === 'standalone') {
    return {
      prefix: parts[0],
      module: 'standalone',
      type: 'workflows', // Default to workflows for non-agent standalone items
      name: parts.slice(2).join('-'),
    };
  }

  // Otherwise, it's a module workflow/tool/task (gomad-module-name)
  return {
    prefix: parts[0],
    module: parts[1],
    type: 'workflows', // Default to workflows for non-agent module items
    name: parts.slice(2).join('-'),
  };
}

// ============================================================================
// LEGACY FUNCTIONS (underscore format) - kept for backward compatibility
// ============================================================================

/**
 * Convert hierarchical path to flat underscore-separated name (LEGACY)
 * @deprecated Use toDashName instead
 */
function toUnderscoreName(module, type, name) {
  const isAgent = type === AGENT_SEGMENT;
  if (module === 'core') {
    return isAgent ? `gomad_agent_${name}.md` : `gomad_${name}.md`;
  }
  if (module === 'standalone') {
    return isAgent ? `gomad_agent_standalone_${name}.md` : `gomad_standalone_${name}.md`;
  }
  return isAgent ? `gomad_${module}_agent_${name}.md` : `gomad_${module}_${name}.md`;
}

/**
 * Convert relative path to flat underscore-separated name (LEGACY)
 * @deprecated Use toDashPath instead
 */
function toUnderscorePath(relativePath) {
  // Strip common file extensions (same as toDashPath for consistency)
  const withoutExt = relativePath.replace(/\.(md|yaml|yml|json|xml|toml)$/i, '');
  const parts = withoutExt.split(/[/\\]/);

  const module = parts[0];
  const type = parts[1];
  const name = parts.slice(2).join('_');

  return toUnderscoreName(module, type, name);
}

/**
 * Create custom agent underscore name (LEGACY)
 * @deprecated Use customAgentDashName instead
 */
function customAgentUnderscoreName(agentName) {
  return `gomad_custom_${agentName}.md`;
}

/**
 * Check if a filename uses underscore format (LEGACY)
 * @deprecated Use isDashFormat instead
 */
function isUnderscoreFormat(filename) {
  return filename.startsWith('gomad_') && filename.includes('_');
}

/**
 * Extract parts from an underscore-formatted filename (LEGACY)
 * @deprecated Use parseDashName instead
 */
function parseUnderscoreName(filename) {
  const withoutExt = filename.replace('.md', '');
  const parts = withoutExt.split('_');

  if (parts.length < 2 || parts[0] !== 'gomad') {
    return null;
  }

  const agentIndex = parts.indexOf('agent');

  if (agentIndex !== -1) {
    if (agentIndex === 1) {
      // gomad_agent_... - check for standalone
      if (parts.length >= 4 && parts[2] === 'standalone') {
        return {
          prefix: parts[0],
          module: 'standalone',
          type: 'agents',
          name: parts.slice(3).join('_'),
        };
      }
      return {
        prefix: parts[0],
        module: 'core',
        type: 'agents',
        name: parts.slice(agentIndex + 1).join('_'),
      };
    } else {
      return {
        prefix: parts[0],
        module: parts[1],
        type: 'agents',
        name: parts.slice(agentIndex + 1).join('_'),
      };
    }
  }

  if (parts.length === 2) {
    return {
      prefix: parts[0],
      module: 'core',
      type: 'workflows',
      name: parts[1],
    };
  }

  // Check for standalone non-agent: gomad_standalone_name
  if (parts[1] === 'standalone') {
    return {
      prefix: parts[0],
      module: 'standalone',
      type: 'workflows',
      name: parts.slice(2).join('_'),
    };
  }

  return {
    prefix: parts[0],
    module: parts[1],
    type: 'workflows',
    name: parts.slice(2).join('_'),
  };
}

/**
 * Resolve the skill name for an artifact.
 * Prefers canonicalId from a skill-manifest.yaml sidecar when available,
 * falling back to the path-derived name from toDashPath().
 *
 * @param {Object} artifact - Artifact object (must have relativePath; may have canonicalId)
 * @returns {string} Filename like 'gomad-create-prd.md' or 'gomad-agent-gomad-pm.md'
 */
function resolveSkillName(artifact) {
  if (artifact.canonicalId) {
    return `${artifact.canonicalId}.md`;
  }
  return toDashPath(artifact.relativePath);
}

// Backward compatibility aliases (colon format was same as underscore)
const toColonName = toUnderscoreName;
const toColonPath = toUnderscorePath;
const customAgentColonName = customAgentUnderscoreName;
const isColonFormat = isUnderscoreFormat;
const parseColonName = parseUnderscoreName;

module.exports = {
  // New standard (dash-based)
  toDashName,
  toDashPath,
  resolveSkillName,
  customAgentDashName,
  isDashFormat,
  parseDashName,

  // Legacy (underscore-based) - kept for backward compatibility
  toUnderscoreName,
  toUnderscorePath,
  customAgentUnderscoreName,
  isUnderscoreFormat,
  parseUnderscoreName,

  // Backward compatibility aliases
  toColonName,
  toColonPath,
  customAgentColonName,
  isColonFormat,
  parseColonName,

  TYPE_SEGMENTS,
  AGENT_SEGMENT,
  GOMAD_FOLDER_NAME,
  AGENTS_PERSONA_SUBPATH,
  LEGACY_AGENTS_PERSONA_SUBPATH,
};
