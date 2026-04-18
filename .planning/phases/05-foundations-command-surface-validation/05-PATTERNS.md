# Phase 5: Foundations & Command-Surface Validation — Pattern Map

**Mapped:** 2026-04-18
**Files analyzed:** 6
**Analogs found:** 6 / 6

## Scope note

No RESEARCH.md exists for this phase (user skipped research). File list is extracted entirely from `05-CONTEXT.md` decisions **D-01 through D-13**. All analogs are drawn from the live repo — every pattern below is already in-tree and battle-tested.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `.planning/phases/05-foundations-command-surface-validation/05-VERIFICATION.md` (new; verification note for D-01) | docs (phase note) | request-response (human review) | `.planning/phases/02-rename/02-VERIFICATION.md` (retrieved from commit `3372b4c`) | exact (same phase-note convention, same repo, prior milestone) |
| `test/test-gm-command-surface.js` (new; automated test for D-02 — exact filename at planner discretion) | test (installation + structural) | request-response (CLI + filesystem assertions) | `test/test-e2e-install.js` (install-smoke + layout assertions) + `test/test-installation-components.js` (fixture helpers + `assert`/runner frame) | exact (test harness convention) |
| `.planning/PROJECT.md` (modified; lines 77 & 94 per D-13; Key Decisions row per D-08) | docs (project contract) | n/a | existing Key Decisions table already in same file (lines 98–119) | exact (self-analog) |
| `.gitignore` (modified; narrow pattern add per D-10) | config | n/a | existing `.gitignore` blocks (this very file, lines 33–75) | exact (self-analog) |
| `tools/installer/gomad-cli.js` (modified; `--self` flag per D-11) | source (CLI wiring) | request-response (Commander flag parsing) | existing Commander option declarations in `tools/installer/commands/install.js` lines 12–27 + `tools/installer/commands/uninstall.js` lines 11–14 | exact (same Commander pattern, same file family) |
| Self-install guard logic (new function, likely inside `tools/installer/commands/install.js` action body) per D-11 | source (pre-flight validation) | request-response | `tools/installer/project-root.js` lines 8–37 (marker-file detection) + `tools/installer/commands/uninstall.js` lines 50–55 (fail-fast with `prompts.log.error` + `process.exit(1)`) | role-match (marker detection) + exact (error-handling shape) |

## Pattern Assignments

### 1. `05-VERIFICATION.md` — verification note (D-01)

**Analog:** `.planning/phases/02-rename/02-VERIFICATION.md` (content retrieved via `git show 3372b4c:.planning/phases/02-rename/02-VERIFICATION.md` — deleted from working tree per recent `refactor: new start for next`, but structure is the established convention)

**Frontmatter + header pattern:**

```markdown
---
phase: 05-foundations-command-surface-validation
verified: 2026-04-18T00:00:00Z
status: passed
score: <M>/<M> must-haves verified
overrides_applied: 0
---

# Phase 5: Foundations & Command-Surface Validation Verification Report

**Phase Goal:** <one-paragraph phase goal restatement — copy language from 05-CONTEXT.md <domain> block>

**Verified:** 2026-04-18T00:00:00Z
**Status:** passed
**Re-verification:** No — initial verification
```

**"Observable Truths" table pattern (mandatory first section):**

```markdown
## Goal Achievement

### Observable Truths

| #  | Truth | Status | Evidence |
|----|-------|--------|----------|
| 1  | `.claude/commands/gsd/*.md` exist with `name: gsd:<cmd>` frontmatter and resolve as `/gsd:<cmd>` commands on team's current Claude Code | VERIFIED | `ls .claude/commands/gsd/*.md` → N files; `head -3 .claude/commands/gsd/plan-phase.md` shows `name: gsd:plan-phase` |
| 2  | Subdirectory-namespace pattern `name: <ns>:<cmd>` is empirically functional in THIS repo (evidence for D-01) | VERIFIED | <cite in-repo usage of `/gsd:*` commands during Phase 1–4 development> |
```

**Rationale for D-01 ("Lean into `/gsd:*` precedent"):** Point directly at `.claude/commands/gsd/*.md` as live proof. The CONTEXT.md <specifics> block says: *"Works here, in this exact environment, right now."* The verification note body must cite these files by path and frontmatter.

**Do NOT include** (per D-03, D-04):
- Minimum Claude Code version pin
- Flat-name fallback (`/gm-agent-*`) contingency breadcrumb

---

### 2. Automated test for gm-command surface (D-02)

**Analog 1:** `test/test-e2e-install.js` (install-smoke convention — `npm pack` → install tarball into temp dir → layout assertions)
**Analog 2:** `test/test-installation-components.js` (fixture creation helpers + `assert` function + `runTests()` frame)

**File-header + imports pattern** (copy from `test/test-e2e-install.js` lines 1–24):

```javascript
/**
 * gm-Command Surface Test
 *
 * Verifies that launcher stubs at .claude/commands/gm/agent-<name>.md
 * conform to the D-07 contract (frontmatter `name: gm:agent-<name>`,
 * `description:`) AND that `gomad install` into a fixture workspace
 * produces the expected layout. Catches installer regressions that
 * break the generated command surface.
 *
 * Usage: node test/test-gm-command-surface.js
 */

const path = require('node:path');
const os = require('node:os');
const { execSync } = require('node:child_process');
const fs = require('fs-extra');
const yaml = require('js-yaml');        // already a runtime dep (package.json line 89)
const { globSync } = require('glob');   // already a runtime dep (package.json line 88)

// ANSI colors
const colors = {
  reset: '\u001B[0m',
  green: '\u001B[32m',
  red: '\u001B[31m',
  yellow: '\u001B[33m',
  cyan: '\u001B[36m',
  dim: '\u001B[2m',
};

let passed = 0;
let failed = 0;
```

**`assert` helper pattern** (verbatim copy from `test/test-e2e-install.js` lines 32–43):

```javascript
function assert(condition, testName, errorMessage = '') {
  if (condition) {
    console.log(`${colors.green}\u2713${colors.reset} ${testName}`);
    passed++;
  } else {
    console.log(`${colors.red}\u2717${colors.reset} ${testName}`);
    if (errorMessage) {
      console.log(`  ${colors.dim}${errorMessage}${colors.reset}`);
    }
    failed++;
  }
}
```

**Install-smoke pattern — pack + install into temp dir** (verbatim adapted from `test/test-e2e-install.js` lines 45–90):

```javascript
const projectRoot = path.resolve(__dirname, '..');
let tarballPath = null;
let tempDir = null;

try {
  console.log(`\n${colors.cyan}gm-Command Surface Test${colors.reset}\n`);
  console.log(`${colors.dim}Packing tarball...${colors.reset}`);

  const packOutput = execSync('npm pack', {
    cwd: projectRoot,
    encoding: 'utf8',
    timeout: 60_000,
  }).trim();
  const tarballName = packOutput.split('\n').pop().trim();
  tarballPath = path.join(projectRoot, tarballName);

  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gomad-gm-surface-'));
  execSync('npm init -y', { cwd: tempDir, stdio: 'pipe', timeout: 30_000 });
  execSync(`npm install "${tarballPath}"`, { cwd: tempDir, stdio: 'pipe', timeout: 120_000 });
  // ... run non-interactive `gomad install` (avoid @clack TTY hang — see PROJECT.md Key Decisions
  //     line 119: "E2E test verifies tarball structurally (not via interactive `gomad install`)")
}
```

**Important:** PROJECT.md Key Decisions line 119 (`E2E test verifies tarball structurally (not via interactive `gomad install`)`) locks the convention: **avoid TTY-dependent interactive install** in tests. The D-02 "install-smoke" invocation must drive `gomad install` in non-interactive mode (e.g., `--yes --directory <tempDir> --tools claude-code`) — see `install.js` line 26 (`-y, --yes`) and line 14 (`--directory <path>`). If Phase 5 `gomad install` cannot yet be driven non-interactively to produce `.claude/commands/gm/`, the test asserts the structural layout only and documents the gap in the test comment.

**Structural assertion pattern (D-02: frontmatter + `name:` field)** — using `js-yaml`:

```javascript
const commandsDir = path.join(tempDir, '.claude', 'commands', 'gm');
const stubFiles = globSync('agent-*.md', { cwd: commandsDir });

assert(stubFiles.length === 7, `All 7 agent launcher stubs present (got ${stubFiles.length})`);

for (const file of stubFiles) {
  const stubPath = path.join(commandsDir, file);
  const raw = fs.readFileSync(stubPath, 'utf8');
  const match = raw.match(/^---\n([\s\S]*?)\n---/);
  assert(match, `${file} has YAML frontmatter`);

  const fm = yaml.load(match[1]);
  const agentName = path.basename(file, '.md').replace(/^agent-/, '');
  assert(
    fm.name === `gm:agent-${agentName}`,
    `${file} frontmatter name matches gm:agent-${agentName}`,
    `Got: ${fm.name}`,
  );
  assert(typeof fm.description === 'string' && fm.description.length > 0,
    `${file} has non-empty description`);
}
```

**Cleanup pattern** (verbatim copy from `test/test-e2e-install.js` lines 147–159):

```javascript
} finally {
  console.log(`\n${colors.dim}Cleaning up...${colors.reset}`);
  if (tempDir && fs.existsSync(tempDir)) {
    fs.removeSync(tempDir);
    assert(!fs.existsSync(tempDir), 'Temp directory cleaned up');
  }
  if (tarballPath && fs.existsSync(tarballPath)) {
    fs.unlinkSync(tarballPath);
    assert(!fs.existsSync(tarballPath), 'Tarball file cleaned up');
  }
}
```

**Summary + exit-code pattern** (verbatim copy from `test/test-e2e-install.js` lines 161–166):

```javascript
console.log(
  `\n${colors.cyan}Results:${colors.reset} ${colors.green}${passed} passed${colors.reset}, ${colors.red}${failed} failed${colors.reset}\n`,
);
process.exit(failed > 0 ? 1 : 0);
```

**npm script registration** (adds to `package.json` `scripts` block — mirrors lines 58–60):

```json
"test:gm-surface": "node test/test-gm-command-surface.js",
```

Optionally wire into the composite `"test"` script (line 57) so CI runs it; planner decides.

---

### 3. `.planning/PROJECT.md` — two edits (D-08 + D-13)

**Analog:** the file itself (self-analog for both the Key Decisions table format and the `type: module` phrase to correct).

**Edit A — D-13 factual correction** (two occurrences):

Current text at line 77:
> `- Tech stack: Node.js / JavaScript (`type: module`), inherited from BMAD.`

Current text at line 94:
> `- **Tech stack**: Node.js / JavaScript (`type: module`), inherited from BMAD.`

Replacement guidance per D-13: `package.json` (above, lines 1–123) has **no** `"type"` field; `gomad-cli.js` line 3 uses `const { program } = require('commander')`; `core/installer.js` uses `require('node:path')`. Runtime is **CommonJS with `require()`-based loading**.

Proposed corrected phrasing (planner may refine within the same sentence shape):
- Line 77: `` - Tech stack: Node.js / JavaScript (CommonJS, `require()`-based loading), inherited from BMAD. ``
- Line 94: `` - **Tech stack**: Node.js / JavaScript (CommonJS, `require()`-based loading), inherited from BMAD. ``

**Edit B — D-08 Key Decisions row** (append to the existing 3-column table at lines 100–119):

Existing table header (line 100):

```markdown
| Decision                                                                                                                                | Rationale                                                                                                              | Outcome                                                  |
| --------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
```

Existing row format (line 119 as template):

```markdown
| E2E test verifies tarball structurally (not via interactive `gomad install`)                                                            | Avoids `@clack/prompts` hang in non-TTY test environment                                                               | ✓ Good                                                   |
```

**New row to append** (per D-08, wording directly from `05-CONTEXT.md` line 33):

```markdown
| Launcher-form slash commands (not self-contained) — `.claude/commands/gm/agent-*.md` is a thin stub loading persona from `_gomad/gomad/agents/*.md` at runtime | Preserves `SKILL.md` as single source of truth (persona body extracted at install time per D-06); no hand-authored duplication; Claude Code sees rich metadata via launcher body | — Contract set in Phase 5; extractor lands in Phase 6 |
```

Planner may tune the "Outcome" cell wording; the Decision + Rationale cells are locked by D-08.

---

### 4. `.gitignore` — narrow pattern add (D-10)

**Analog:** the file itself. Existing structure (lines 1–80) uses **block comments grouping patterns by category** (Dependencies, Logs, Build output, Environment variables, Python, System files, Development tools and configs, AI assistant files, Astro / Documentation Build).

**Grouping pattern example** (lines 33–47):

```
# Development tools and configs
.prettierrc

# AI assistant files
CLAUDE.md
.ai/*
cursor
.gemini
.mcp.json
CLAUDE.local.md
.serena/
.claude/settings.local.json
.junie/
.agents/
```

**Note the existing `.claude` entry at line 65** (bare `.claude` with no trailing slash, ignoring the entire directory):

```
.claude
.codex
.github/chatmodes
```

**D-12 signal:** `.claude/commands/gsd/` remains tracked because the working tree currently contains it (git is tracking it despite the bare `.claude` entry — confirmed by `git status` showing `.claude/settings.json` as modified). This implies there is already a force-add or a negation in history. Planner MUST verify actual tracking behavior before adding the D-10 line and consider whether a negation such as `!.claude/commands/gsd/` is needed to keep gsd tracked while adding `.claude/commands/gm/` as ignored.

**New block to add** (per D-10; use the established comment-group style):

```
# Installer-generated output (dev-repo pollution prevention per Pitfall #7)
.claude/commands/gm/
```

Insert under the existing AI-assistant block (after line 65 `.claude` or line 74 `.windsurf`, wherever it reads best). D-10 **locks the pattern form** as the narrow path `.claude/commands/gm/` — do NOT use `.claude/commands/*` + `!.claude/commands/gsd/` (explicitly rejected in D-10).

---

### 5. `tools/installer/gomad-cli.js` — `--self` Commander flag (D-11)

**Analog:** existing Commander option pattern. `gomad-cli.js` does **not** declare options directly — it loops over `commands/*.js` and calls `command.option(...option)` per file (lines 93–100). The actual option declarations live in per-command files.

**Option declaration pattern** — `tools/installer/commands/install.js` lines 12–27 (the options array):

```javascript
options: [
  ['-d, --debug', 'Enable debug output for manifest generation'],
  ['--directory <path>', 'Installation directory (default: current directory)'],
  ['--modules <modules>', 'Comma-separated list of module IDs to install (e.g., "gomad,bmb")'],
  [
    '--tools <tools>',
    'Comma-separated list of tool/IDE IDs to configure (e.g., "claude-code,cursor"). Use "none" to skip tool configuration.',
  ],
  ['--custom-content <paths>', 'Comma-separated list of paths to custom modules/agents/workflows'],
  ['--action <type>', 'Action type for existing installations: install, update, or quick-update'],
  ['--user-name <name>', 'Name for agents to use (default: system username)'],
  ['--communication-language <lang>', 'Language for agent communication (default: English)'],
  ['--document-output-language <lang>', 'Language for document output (default: English)'],
  ['--output-folder <path>', 'Output folder path relative to project root (default: _gomad-output)'],
  ['-y, --yes', 'Accept all defaults and skip prompts where possible'],
],
```

**New entry to add** (per D-11; planner refines error-message wording per <decisions> Claude's Discretion):

```javascript
['--self', 'Permit install into the gomad source repo itself (bypasses the self-install guard). Use only when intentionally re-seeding local dev output.'],
```

The flag is consumed in the `action` handler via `options.self`. The existing `install.js` action block (lines 28–80) wraps the call in try/catch and exits 1 on failure — that pattern is the integration point for the guard.

**CONTEXT.md note (D-11, lines 108–111):** The flag itself lives in `install.js` options, not in `gomad-cli.js` directly. `gomad-cli.js` is the orchestration glue — Commander option registration happens per command file. Planner should add the flag to `commands/install.js` (where D-11's guard also gates), **not** to `gomad-cli.js`.

---

### 6. Self-install guard logic (D-11)

**Analog for marker detection:** `tools/installer/project-root.js` lines 8–37 (looks for `src/core-skills` as a marker to identify the gomad project root):

```javascript
function findProjectRoot(startPath = __dirname) {
  let currentPath = path.resolve(startPath);

  while (currentPath !== path.dirname(currentPath)) {
    const packagePath = path.join(currentPath, 'package.json');

    if (fs.existsSync(packagePath)) {
      try {
        const pkg = fs.readJsonSync(packagePath);
        if (pkg.name === 'gomad' || fs.existsSync(path.join(currentPath, 'src', 'core-skills'))) {
          return currentPath;
        }
      } catch {
        // Continue searching
      }
    }

    if (fs.existsSync(path.join(currentPath, 'src', 'core-skills', 'agents'))) {
      return currentPath;
    }

    currentPath = path.dirname(currentPath);
  }

  return process.cwd();
}
```

**Analog for fail-fast with user-facing error:** `tools/installer/commands/uninstall.js` lines 52–55 (existence check → error log → exit 1):

```javascript
if (!(await fs.pathExists(projectDir))) {
  await prompts.log.error(`Directory does not exist: ${projectDir}`);
  process.exit(1);
}
```

**Combined guard pattern** (where to place: top of `install.js` action handler, before `await ui.promptInstall(options)`):

```javascript
// Self-install guard (D-11, Pitfall #7): refuse install into the gomad source
// repo unless explicitly opted in with --self. Marker: src/gomad-skills/ in cwd.
const cwd = process.cwd();
const isGomadSourceRepo = await fs.pathExists(path.join(cwd, 'src', 'gomad-skills'));
if (isGomadSourceRepo && !options.self) {
  await prompts.log.error(
    [
      'Refusing to install into the gomad source repo itself.',
      `Detected src/gomad-skills/ in ${cwd}.`,
      'If you really mean to install here (rare — typically only for local dev-loop seeding),',
      'pass --self explicitly.',
    ].join('\n'),
  );
  process.exit(1);
}
```

**Marker selection (D-11 + <code_context> lines 108–111):** The chosen signal is `src/gomad-skills/` in `cwd`. CONTEXT.md lists alternatives (`.planning/PROJECT.md` presence, `package.json` with `"name": "@xgent-ai/gomad"`). Planner MAY combine multiple signals for robustness, but D-11 proposes `src/gomad-skills/` as the primary. A more conservative option is to require **both** `src/gomad-skills/` AND `package.json.name === '@xgent-ai/gomad'` — this avoids false positives if a downstream project ever mirrors the `src/gomad-skills/` naming.

Error message wording is Claude's Discretion (CONTEXT.md <decisions> block final line). The shape above is the analog — adapt tone.

---

## Shared Patterns

### Shared pattern A — test harness conventions (applies to file 2)

**Sources:**
- `test/test-e2e-install.js` lines 1–167 (install-smoke shape)
- `test/test-installation-components.js` lines 23–50 (colors + `assert`), lines 184–1890 (runner frame)

**Apply to:** any new test added in Phase 5 (D-02).

**Contract:**
- CommonJS (`require('node:path')`, `require('fs-extra')`).
- ANSI color constants block copy-pasted at top.
- `assert(condition, testName, errorMessage)` helper.
- `passed`/`failed` counters at module scope.
- Final `console.log` summary + `process.exit(failed > 0 ? 1 : 0)`.
- Fixtures created under `os.tmpdir()` via `fs.mkdtemp(path.join(os.tmpdir(), 'gomad-<kind>-'))`.
- Cleanup in `finally` block removes temp dir + tarball.
- **Never drive interactive `gomad install`** (PROJECT.md Key Decision line 119 — avoids `@clack/prompts` TTY hang). Use `--yes --directory` combo per `install.js` lines 14, 26.
- Register via `package.json` `scripts` so `npm run test:<name>` works.

### Shared pattern B — CommonJS `require()` throughout `tools/installer/` (applies to files 5, 6)

**Source:** every `.js` file under `tools/installer/` — `gomad-cli.js` line 3 (`const { program } = require('commander')`), `commands/install.js` line 1–4, `core/installer.js`, etc.

**Apply to:** any new code added to `tools/installer/`.

**Contract:** `require()` / `module.exports`. No ESM. No `import`/`export`. This pattern is also the **evidence line** for the D-13 PROJECT.md correction.

### Shared pattern C — error logging via `prompts.log.*` + `process.exit(1)` (applies to file 6)

**Source:** `tools/installer/commands/install.js` lines 64–78, `tools/installer/commands/uninstall.js` lines 52–55.

**Apply to:** the self-install guard error path.

**Contract:** use `await prompts.log.error(message)` for the user-facing line (multi-line strings via `['line1', 'line2'].join('\n')`), then `process.exit(1)`. Do not `throw` — the existing installer error-swallow structure would turn a throw into a generic "Installation failed" wrapper, burying the guard rationale.

### Shared pattern D — phase-note + frontmatter convention (applies to file 1)

**Source:** `.planning/phases/02-rename/02-VERIFICATION.md` (git-history copy).

**Apply to:** the Phase 5 verification note.

**Contract:** YAML frontmatter with `phase`, `verified`, `status`, `score`, `overrides_applied`. First section is **"Observable Truths"** — a 4-column table (`#`, `Truth`, `Status`, `Evidence`) where Evidence cells cite concrete shell commands or file paths. Subsequent sections: "Required Artifacts", "Key Link Verification", "Behavioral Spot-Checks", "Requirements Coverage". Phase 5's note will be shorter (fewer requirements than Phase 2), but MUST keep the "Observable Truths" header shape so downstream tooling (e.g., a future `/gsd-verify-phase` skimmer) stays consistent.

---

## No Analog Found

All six files/edits have a strong in-repo analog. Nothing falls through.

---

## Metadata

**Analog search scope:**
- `tools/installer/` (Commander + self-detection + error-handling patterns)
- `test/` (test harness patterns)
- `.planning/phases/02-rename/` via `git show 3372b4c` (phase-note convention)
- `.claude/commands/gsd/` (frontmatter-shape reference for D-02 structural assertion)
- `.planning/PROJECT.md` + `.gitignore` (self-analogs for in-place edits)

**Files scanned:** ~15 (gomad-cli.js, install.js, uninstall.js, project-root.js, package.json, test-e2e-install.js, test-installation-components.js, PROJECT.md, .gitignore, 3× gsd command files, git-history 02-VERIFICATION.md, status.js, custom-handler.js)

**Pattern extraction date:** 2026-04-18

**Key cross-references resolved during mapping:**
- D-11 marker choice (`src/gomad-skills/`) has a working analog in `project-root.js` using `src/core-skills/` as a similar marker — same detection primitive.
- D-13 evidence is `package.json` (no `"type"` field), `gomad-cli.js` line 3 (`require('commander')`), `install.js` line 1 (`require('node:path')`) — all confirmed in-file during mapping.
- D-02 install-smoke convention already exists in `test-e2e-install.js`; Phase 5 test reuses that frame verbatim and adds frontmatter-parse assertions on top.
- PROJECT.md Key Decisions line 119 locks "no interactive install in tests" — affects test design for D-02.
