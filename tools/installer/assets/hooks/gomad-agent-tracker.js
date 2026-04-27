// Claude Code hook — gomad active-persona tracker
//
// Wired by `gomad install` (claude-code platform) to three Claude Code hook
// events; one tiny script handles all three by branching on hook_event_name:
//
//   - UserPromptSubmit: when the user invokes `/gm:agent-<short>`, write the
//     resolved persona to the per-session state file. Free-text mentions of
//     the same string are ignored — the regex is anchored.
//   - SessionStart  (startup|resume|clear|compact): delete the state file so
//     the statusline starts each session/segment with no persona pinned.
//   - SessionEnd    (any subtype): delete the state file — defensive cleanup
//     so /tmp doesn't accumulate stale entries on logout / shell exit.
//
// State file lives at  ${os.tmpdir()}/gomad-agent-${session_id}.json  and is
// read by gomad-statusline.js. Any throw, parse error, or missing field is
// silently swallowed — a tracker hook MUST NEVER break the user's session.

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const PERSONAS = {
  analyst: 'Mary',
  'tech-writer': 'Paige',
  pm: 'John',
  'ux-designer': 'Sally',
  architect: 'Winston',
  sm: 'Bob',
  dev: 'Amelia',
  'solo-dev': 'Barry',
};

function stateFileFor(session) {
  // Session ids must not contain path separators or traversal sequences —
  // reject and return null rather than ever writing outside tmpdir.
  if (!session || typeof session !== 'string') return null;
  if (/[/\\]|\.\./.test(session)) return null;
  return path.join(os.tmpdir(), `gomad-agent-${session}.json`);
}

function tryUnlink(p) {
  if (!p) return;
  try {
    fs.unlinkSync(p);
  } catch {
    // Already gone or permission-denied — both are fine for a cleanup hook.
  }
}

function extractSlashAgent(prompt) {
  if (typeof prompt !== 'string') return null;
  // Anchored on start-of-string with optional whitespace. Followed by a word
  // boundary so `/gm:agent-dev` doesn't match `/gm:agent-developer`.
  const m = prompt.match(/^\s*\/gm:agent-([a-z][a-z-]*?)(?=\s|$|[^a-z-])/i);
  if (!m) return null;
  const shortName = m[1].toLowerCase();
  return PERSONAS[shortName] ? shortName : null;
}

function handle(data) {
  const session = data && data.session_id;
  const stateFile = stateFileFor(session);
  if (!stateFile) return;

  const event = data.hook_event_name || '';

  if (event === 'SessionStart' || event === 'SessionEnd') {
    tryUnlink(stateFile);
    return;
  }

  if (event === 'UserPromptSubmit') {
    const shortName = extractSlashAgent(data.prompt);
    if (!shortName) return;
    try {
      fs.writeFileSync(
        stateFile,
        JSON.stringify({
          shortName,
          persona: PERSONAS[shortName],
          skill: `gm-agent-${shortName}`,
          ts: Date.now(),
        }),
      );
    } catch {
      // FS errors are non-fatal — the statusline will simply show no persona.
    }
  }
}

function run() {
  let input = '';
  // Same 3 s safety as the statusline: never hang the host process.
  const timer = setTimeout(() => process.exit(0), 3000);
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (c) => {
    input += c;
  });
  process.stdin.on('end', () => {
    clearTimeout(timer);
    try {
      const data = input ? JSON.parse(input) : {};
      handle(data);
    } catch {
      // Bad JSON — silently ignore.
    }
  });
}

module.exports = { stateFileFor, extractSlashAgent, handle, PERSONAS };

if (require.main === module) run();
