// Claude Code Statusline — gomad Edition
// Shows: model | active gomad persona / sprint snapshot / current todo | dirname | context bar
//
// Patterned on `.claude/hooks/gsd-statusline.js`. Pure Node, no third-party deps.
// Silent-fails on every error path — must NEVER throw or hang the user terminal.

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

// --- Persona map ------------------------------------------------------------

// 8 named gomad personas → underlying skill ids. Hard-coded; matches
// src/gomad-skills/4-implementation/* + 1-analysis/*.
const PERSONAS = {
  Mary: 'gm-agent-analyst',
  John: 'gm-agent-pm',
  Winston: 'gm-agent-architect',
  Sally: 'gm-agent-ux-designer',
  Amelia: 'gm-agent-dev',
  Bob: 'gm-agent-sm',
  Barry: 'gm-agent-solo-dev',
  Paige: 'gm-agent-tech-writer',
};

/**
 * Detect a gomad persona referenced in a free-form todo `activeForm` string.
 *
 * Strategy:
 *   1. First try to anchor-match the skill id (`gm-agent-*`) so `gm-agent-dev`
 *      can never match `gm-agent-developer`. The skill id is extremely
 *      specific — if it appears, we trust it.
 *   2. Fall back to whole-word persona-name match. Case-sensitive on the
 *      first letter so unrelated text mentioning "amelia earhart" or
 *      "barry's bug" stays out.
 *
 * Returns `{ persona, skill }` or `null`.
 */
function detectGomadAgent(taskText) {
  if (!taskText || typeof taskText !== 'string') return null;

  // 1) skill id (anchored — must be followed by a non-alphanumeric/underscore
  //    so 'gm-agent-dev' cannot match 'gm-agent-developer'/'gm-agent-dev-x').
  for (const [persona, skill] of Object.entries(PERSONAS)) {
    const re = new RegExp(`(?:^|[^A-Za-z0-9_-])${escapeRegex(skill)}(?![A-Za-z0-9_-])`);
    if (re.test(taskText)) return { persona, skill };
  }

  // 2) whole-word persona name, first letter case-sensitive.
  for (const [persona, skill] of Object.entries(PERSONAS)) {
    const re = new RegExp(`\\b${escapeRegex(persona)}\\b`);
    if (re.test(taskText)) return { persona, skill };
  }

  return null;
}

function escapeRegex(s) {
  return s.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
}

// --- Transcript-driven agent detection --------------------------------------

// Reverse PERSONAS: shortName → persona display name. Lets the transcript
// scanner translate `/gm:agent-pm` or `_config/agents/pm.md` straight to John.
const SHORTNAMES = {
  analyst: 'Mary',
  'tech-writer': 'Paige',
  pm: 'John',
  'ux-designer': 'Sally',
  architect: 'Winston',
  sm: 'Bob',
  dev: 'Amelia',
  'solo-dev': 'Barry',
};

// Cheap mtime+size cache so the per-tick transcript scan is a no-op when the
// file hasn't changed. Keyed by `${path}:${mtimeMs}:${size}`. One slot is
// enough — Claude Code statusline runs in a fresh process per refresh anyway,
// but module-level cache helps if the host ever shares a process.
let _transcriptCache = { key: null, value: null };

/**
 * Scan the tail of a Claude Code transcript (.jsonl) for the most recent
 * gomad agent load signal. Returns `{ persona, skill }` or `null`.
 *
 * Each line is parsed as JSON and matched against the *structural* shapes
 * Claude Code emits — chat text or tool I/O that happens to mention the
 * literal strings does NOT count. Two strong signals are honored:
 *
 *   1. User invoked `/gm:agent-<short>` as a slash command. The transcript
 *      records a `type:'user'` entry whose `message.content` STARTS WITH
 *      `<command-name>/gm:agent-<short></command-name>`.
 *   2. Claude loaded the persona body via the `Read` tool. The transcript
 *      records a `type:'assistant'` entry whose `message.content[]` includes
 *      a `{ type:'tool_use', name:'Read', input:{ file_path: …/_config/agents/<short>.md } }`.
 *
 * `/clear` acts as a hard barrier — but only when it has the same
 * `<command-name>/clear</command-name>` structural shape; assistant text
 * or tool I/O that happens to mention the literal string is ignored.
 *
 * Reads at most TAIL_BYTES from the end of the file to keep the per-tick
 * cost bounded even on long sessions. Drops the first (potentially partial)
 * line when truncating mid-file.
 */
function detectAgentFromTranscript(transcriptPath) {
  if (!transcriptPath || typeof transcriptPath !== 'string') return null;
  let st;
  try {
    st = fs.statSync(transcriptPath);
  } catch {
    return null;
  }
  const cacheKey = `${transcriptPath}:${st.mtimeMs}:${st.size}`;
  if (_transcriptCache.key === cacheKey) return _transcriptCache.value;

  let result = null;
  try {
    const TAIL_BYTES = 65_536;
    const len = Math.min(TAIL_BYTES, st.size);
    const fd = fs.openSync(transcriptPath, 'r');
    const buf = Buffer.alloc(len);
    fs.readSync(fd, buf, 0, len, st.size - len);
    fs.closeSync(fd);

    const lines = buf.toString('utf8').split('\n').filter(Boolean);
    if (st.size > TAIL_BYTES && lines.length > 1) lines.shift();

    for (let i = lines.length - 1; i >= 0; i--) {
      let entry;
      try {
        entry = JSON.parse(lines[i]);
      } catch {
        continue;
      }

      if (isClearCommand(entry)) break;

      const slashShort = extractSlashAgent(entry);
      if (slashShort && SHORTNAMES[slashShort]) {
        result = { persona: SHORTNAMES[slashShort], skill: `gm-agent-${slashShort}` };
        break;
      }

      const readShort = extractAgentRead(entry);
      if (readShort && SHORTNAMES[readShort]) {
        result = { persona: SHORTNAMES[readShort], skill: `gm-agent-${readShort}` };
        break;
      }
    }
  } catch {
    // Silent fail — never break the statusline over a transcript hiccup.
  }

  _transcriptCache = { key: cacheKey, value: result };
  return result;
}

/** True when this entry is a real user-invoked /clear (structural match). */
function isClearCommand(entry) {
  if (!entry || entry.type !== 'user') return false;
  const c = entry.message && entry.message.content;
  if (typeof c !== 'string') return false;
  return /^\s*<command-name>\/clear<\/command-name>/.test(c);
}

/** Returns the short-name of a `/gm:agent-<short>` slash invocation, or null. */
function extractSlashAgent(entry) {
  if (!entry || entry.type !== 'user') return null;
  const c = entry.message && entry.message.content;
  if (typeof c !== 'string') return null;
  const m = c.match(/^\s*<command-name>\/gm:agent-([a-z][a-z-]*)<\/command-name>/i);
  return m ? m[1].toLowerCase() : null;
}

/** Returns the short-name from an assistant Read tool_use of `…/_config/agents/<short>.md`, or null. */
function extractAgentRead(entry) {
  if (!entry || entry.type !== 'assistant') return null;
  const blocks = entry.message && entry.message.content;
  if (!Array.isArray(blocks)) return null;
  for (const block of blocks) {
    if (!block || block.type !== 'tool_use' || block.name !== 'Read') continue;
    const fp = block.input && block.input.file_path;
    if (typeof fp !== 'string') continue;
    const m = fp.match(/[/\\]_config[/\\]+agents[/\\]+([a-z][a-z-]+)\.md$/i);
    if (m) return m[1].toLowerCase();
  }
  return null;
}

/**
 * Resolve the transcript file for this session. Claude Code newer builds
 * pass `transcript_path` directly in the statusline JSON. Older builds
 * don't — fall back to globbing `~/.claude/projects/*\/<session>.jsonl`.
 */
function resolveTranscriptPath(data, session) {
  if (data && typeof data.transcript_path === 'string' && data.transcript_path) {
    return data.transcript_path;
  }
  if (!session) return null;
  const projectsDir = path.join(os.homedir(), '.claude', 'projects');
  try {
    if (!fs.existsSync(projectsDir)) return null;
    const subdirs = fs.readdirSync(projectsDir);
    for (const sub of subdirs) {
      const candidate = path.join(projectsDir, sub, `${session}.jsonl`);
      if (fs.existsSync(candidate)) return candidate;
    }
  } catch {
    // Silent fail
  }
  return null;
}

// --- Sprint state reader ----------------------------------------------------

/**
 * Walk up from `dir` (max 10 levels) looking for `_gomad/agile/config.yaml`.
 * If found, parse the yaml's `implementation_artifacts` and read the
 * `sprint-status.yaml` it points at. Tally story statuses.
 *
 * Returns { project, counts } or null on any failure.
 *
 * Counts is { backlog, ready_for_dev, in_progress, review, done }. Keys under
 * `development_status:` starting with `epic-` or ending in `-retrospective`
 * are skipped (those aren't stories). Legacy `drafted` maps to `ready-for-dev`.
 */
function readGomadSprint(dir) {
  if (!dir) return null;
  const home = os.homedir();
  let current = dir;
  let installRoot = null;
  for (let i = 0; i < 10; i++) {
    const candidate = path.join(current, '_gomad', 'agile', 'config.yaml');
    if (fs.existsSync(candidate)) {
      installRoot = current;
      break;
    }
    const parent = path.dirname(current);
    if (parent === current || current === home) break;
    current = parent;
  }
  if (!installRoot) return null;

  let cfgText;
  try {
    cfgText = fs.readFileSync(path.join(installRoot, '_gomad', 'agile', 'config.yaml'), 'utf8');
  } catch {
    return null;
  }

  const cfg = parseFlatYaml(cfgText);
  if (!cfg) return null;

  // implementation_artifacts may include a `{project-root}` placeholder. The
  // canonical default in src/gomad-skills/module.yaml is
  // `{project-root}/{output_folder}/implementation-artifacts`. We only need to
  // resolve `{project-root}` here — anything else stays as-is and either
  // works or makes us silent-fail downstream.
  let artifactsPath = cfg.implementation_artifacts;
  if (!artifactsPath || typeof artifactsPath !== 'string') return null;
  artifactsPath = artifactsPath.replaceAll('{project-root}', installRoot);
  // Strip stray surrounding quotes.
  artifactsPath = artifactsPath.replaceAll(/^["']|["']$/g, '');
  if (!path.isAbsolute(artifactsPath)) {
    artifactsPath = path.resolve(installRoot, artifactsPath);
  }

  const sprintFile = path.join(artifactsPath, 'sprint-status.yaml');
  if (!fs.existsSync(sprintFile)) return null;

  let sprintText;
  try {
    sprintText = fs.readFileSync(sprintFile, 'utf8');
  } catch {
    return null;
  }

  const sprint = parseSprintYaml(sprintText);
  if (!sprint) return null;
  return sprint;
}

/**
 * Tiny line-by-line parser scoped to the top-level scalar keys we actually
 * need. No nested mapping support — `development_status:` is intentionally
 * NOT parsed here (that's parseSprintYaml's job). Lines that don't match
 * `key: value` at column 0 are silently skipped. Always returns an object.
 */
function parseFlatYaml(text) {
  if (typeof text !== 'string') return null;
  const out = {};
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, '').trimEnd();
    if (!line || line.startsWith(' ') || line.startsWith('\t')) continue;
    const m = line.match(/^([A-Za-z_][\w-]*)\s*:\s*(.*)$/);
    if (!m) continue;
    const [, key, val] = m;
    const v = val.trim().replaceAll(/^["']|["']$/g, '');
    if (v === '') continue; // a `key:` opening a mapping; we don't descend
    out[key] = v;
  }
  return out;
}

/**
 * Parse a sprint-status.yaml just enough to pull `project` and the flat
 * `development_status:` story counts. We don't validate, we don't recurse —
 * any structural surprise → return null.
 */
function parseSprintYaml(text) {
  if (typeof text !== 'string') return null;
  const lines = text.split(/\r?\n/);

  let project = null;
  let inDev = false;
  const counts = {
    backlog: 0,
    ready_for_dev: 0,
    in_progress: 0,
    review: 0,
    done: 0,
  };

  for (const rawLine of lines) {
    // Drop trailing comments. Don't trimStart — we need leading whitespace
    // to know if a line is a top-level key or nested under development_status.
    const line = rawLine.replace(/#.*$/, '').replace(/\s+$/, '');
    if (!line) continue;

    // Top-level keys (column 0).
    if (!/^\s/.test(line)) {
      inDev = false;
      const m = line.match(/^([A-Za-z_][\w-]*)\s*:\s*(.*)$/);
      if (!m) continue;
      const [, key, val] = m;
      if (key === 'project') {
        project = val.trim().replaceAll(/^["']|["']$/g, '') || null;
      } else if (key === 'development_status') {
        inDev = true;
      }
      continue;
    }

    if (!inDev) continue;

    // Nested under development_status — expect 2-space indent.
    const m = line.match(/^\s+([^\s:][^:]*?)\s*:\s*([^\s].*?)?\s*$/);
    if (!m) continue;
    const key = m[1].trim();
    const rawStatus = (m[2] || '').trim().replaceAll(/^["']|["']$/g, '');
    if (!key || !rawStatus) continue;
    if (key.startsWith('epic-')) continue;
    if (key.endsWith('-retrospective')) continue;

    // Map legacy `drafted` → ready-for-dev (matches gm-sprint-status workflow).
    const status = rawStatus === 'drafted' ? 'ready-for-dev' : rawStatus;
    switch (status) {
      case 'backlog': {
        counts.backlog++;
        break;
      }
      case 'ready-for-dev': {
        counts.ready_for_dev++;
        break;
      }
      case 'in-progress': {
        counts.in_progress++;
        break;
      }
      case 'review': {
        counts.review++;
        break;
      }
      case 'done': {
        counts.done++;
        break;
      }
      // Unknown status — skip silently.
      default: {
        break;
      }
    }
  }

  return { project, counts };
}

// --- Statusline runtime -----------------------------------------------------

function runStatusline() {
  let input = '';
  // Same 3 s timeout as the GSD reference — exit silently on stalled stdin.
  const stdinTimeout = setTimeout(() => process.exit(0), 3000);
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (chunk) => {
    input += chunk;
  });
  process.stdin.on('end', () => {
    clearTimeout(stdinTimeout);
    try {
      const data = input ? JSON.parse(input) : {};
      const model = data.model?.display_name || 'Claude';
      const dir = data.workspace?.current_dir || process.cwd();
      const session = data.session_id || '';
      const remaining = data.context_window?.remaining_percentage;

      // Context-bar logic: copied verbatim from the GSD reference, minus the
      // bridge-file write (that's GSD-internal, not relevant here).
      const totalCtx = data.context_window?.total_tokens || 1_000_000;
      const acw = parseInt(process.env.CLAUDE_CODE_AUTO_COMPACT_WINDOW || '0', 10);
      const AUTO_COMPACT_BUFFER_PCT = acw > 0 ? Math.min(100, (acw / totalCtx) * 100) : 16.5;
      let ctx = '';
      if (remaining != null) {
        const usableRemaining = Math.max(0, ((remaining - AUTO_COMPACT_BUFFER_PCT) / (100 - AUTO_COMPACT_BUFFER_PCT)) * 100);
        const used = Math.max(0, Math.min(100, Math.round(100 - usableRemaining)));
        const filled = Math.floor(used / 10);
        const bar = '█'.repeat(filled) + '░'.repeat(10 - filled);
        if (used < 50) {
          ctx = ` [32m${bar} ${used}%[0m`;
        } else if (used < 65) {
          ctx = ` [33m${bar} ${used}%[0m`;
        } else if (used < 80) {
          ctx = ` [38;5;208m${bar} ${used}%[0m`;
        } else {
          ctx = ` [5;31m💀 ${bar} ${used}%[0m`;
        }
      }

      // Pull current todo (active form) from Claude Code's todos cache.
      let activeForm = '';
      const homeDir = os.homedir();
      const claudeDir = process.env.CLAUDE_CONFIG_DIR || path.join(homeDir, '.claude');
      const todosDir = path.join(claudeDir, 'todos');
      if (session && fs.existsSync(todosDir)) {
        try {
          const files = fs
            .readdirSync(todosDir)
            .filter((f) => f.startsWith(session) && f.includes('-agent-') && f.endsWith('.json'))
            .map((f) => ({ name: f, mtime: fs.statSync(path.join(todosDir, f)).mtime }))
            .sort((a, b) => b.mtime - a.mtime);
          if (files.length > 0) {
            try {
              const todos = JSON.parse(fs.readFileSync(path.join(todosDir, files[0].name), 'utf8'));
              const inProgress = Array.isArray(todos) ? todos.find((t) => t && t.status === 'in_progress') : null;
              if (inProgress) activeForm = inProgress.activeForm || '';
            } catch {
              // Bad todos JSON — silently ignore.
            }
          }
        } catch {
          // FS errors on todos dir — silently ignore.
        }
      }

      // Decide the middle zone:
      //   1. transcript shows a recent /gm:agent-* load → 👤 Persona (skill)
      //   2. else if persona is detectable in the active todo → 👤 …
      //   3. else if a todo activeForm exists → bare activeForm (bold)
      //   4. else if sprint-status resolved → Sprint: <project> · ▶x ✓y ⏳z (dim)
      //   5. else → empty
      let middle = null;
      const transcriptPath = resolveTranscriptPath(data, session);
      const persona = detectAgentFromTranscript(transcriptPath) || detectGomadAgent(activeForm);
      if (persona) {
        middle = `[1m👤 ${persona.persona} (${persona.skill})[0m`;
      } else if (activeForm) {
        middle = `[1m${activeForm}[0m`;
      } else {
        let sprint = null;
        try {
          sprint = readGomadSprint(dir);
        } catch {
          sprint = null;
        }
        if (sprint && sprint.counts) {
          const c = sprint.counts;
          const pending = (c.backlog || 0) + (c.ready_for_dev || 0);
          const proj = sprint.project || 'sprint';
          middle = `[2mSprint: ${proj} · ▶${c.in_progress} ✓${c.done} ⏳${pending}[0m`;
        }
      }

      const dirname = path.basename(dir);
      if (middle) {
        process.stdout.write(`[2m${model}[0m │ ${middle} │ [2m${dirname}[0m${ctx}`);
      } else {
        process.stdout.write(`[2m${model}[0m │ [2m${dirname}[0m${ctx}`);
      }
    } catch {
      // Silent fail — never break the statusline.
    }
  });
}

// Export helpers for unit tests. Harmless when the file runs as a script.
module.exports = {
  readGomadSprint,
  detectGomadAgent,
  detectAgentFromTranscript,
  resolveTranscriptPath,
  SHORTNAMES,
};

if (require.main === module) runStatusline();
