# Phase 9: Reference Sweep + Verification + Release - Pattern Map

**Mapped:** 2026-04-23
**Files analyzed:** 11 (2 NEW, 9 MODIFIED)
**Analogs found:** 10 / 11 (1 greenfield — `allowlist.json` — no close analog)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `test/test-orphan-refs.js` (NEW) | test (grep-driven gate) | batch / transform | `test/test-file-refs-csv.js` + `tools/verify-tarball.js` (Phase 2 grep-clean) | role+flow match (hybrid) |
| `test/fixtures/orphan-refs/allowlist.json` (NEW) | test-fixture (config data) | static-config | no existing JSON fixture — closest is `test/fixtures/file-refs-csv/valid/*.csv` (file structure convention only) | no analog |
| `test/test-gm-command-surface.js` (MODIFY) | test (install-smoke) | request-response (exec) | self — lines 213-254 conditional block | exact (self-evolution) |
| `tools/verify-tarball.js` (MODIFY) | tool (release gate) | batch | self — `checkGrepClean()` at lines 66-87 | exact (self-evolution) |
| `src/gomad-skills/4-implementation/gm-sprint-agent/workflow.md` (MODIFY) | content (prose) | N/A | self — in-place string rewrite | exact (self-edit) |
| `src/gomad-skills/4-implementation/gm-epic-demo-story/SKILL.md` (MODIFY) | content (prose) | N/A | self — in-place string rewrite | exact (self-edit) |
| `src/gomad-skills/module-help.csv` (MODIFY) | content (CSV data) | N/A | self — column-value rewrite | exact (self-edit) |
| `tools/installer/core/installer.js` (MODIFY) | service (installer helper deletion) | transform | self — lines 1097-1112 + surrounding usage | exact (self-simplification) |
| `CHANGELOG.md` (MODIFY) | content (release notes) | N/A | `CHANGELOG.md` v1.1.0 entry (lines 7-49) | exact (template mirror) |
| `package.json` version bump (MODIFY) | config | N/A | self — line 4 | trivial |
| `package.json` scripts wiring (MODIFY) | config | N/A | self — scripts block lines 40-68 | exact (structural) |

---

## Pattern Assignments

### `test/test-orphan-refs.js` (NEW, test, batch/transform)

**Primary analog:** `test/test-file-refs-csv.js` (node-native test runner shape, ANSI colors, exit codes)
**Secondary analog:** `tools/verify-tarball.js` (grep-driven scan + allowlist filtering at lines 66-87)
**Tertiary:** `test/test-rename-sweep.js` (exclusion-list pattern, line 67-78)

**Imports pattern** (copy from `test/test-file-refs-csv.js` lines 11-13):
```javascript
const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process'); // NEW — from verify-tarball.js line 12
```

**ANSI colors + counters** (copy verbatim from `test/test-file-refs-csv.js` lines 15-28):
```javascript
const colors = {
  reset: '\u001B[0m',
  green: '\u001B[32m',
  red: '\u001B[31m',
  cyan: '\u001B[36m',
  dim: '\u001B[2m',
};

let totalTests = 0;
let passedTests = 0;
const failures = [];
```

**Test/assert helpers** (copy verbatim from `test/test-file-refs-csv.js` lines 30-44):
```javascript
function test(name, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  ${colors.green}\u2713${colors.reset} ${name}`);
  } catch (error) {
    console.log(`  ${colors.red}\u2717${colors.reset} ${name} ${colors.red}${error.message}${colors.reset}`);
    failures.push({ name, message: error.message });
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
```

**Grep invocation pattern** (adapt from `tools/verify-tarball.js` lines 66-87 — the critical core pattern):
```javascript
// Pattern source: tools/verify-tarball.js:checkGrepClean()
function runGrep() {
  let grepOutput = '';
  try {
    // Note: grep -n includes line numbers; exclude-dir repeated for each skipped tree.
    // .planning/ excluded per D-67 (archived planning stays untouched per ROADMAP SC#1).
    grepOutput = execSync(
      `grep -rn 'gm-agent-' . ` +
        `--exclude-dir=node_modules --exclude-dir=.git --exclude-dir=.planning ` +
        `--exclude-dir=old-milestone-* 2>/dev/null`,
      { encoding: 'utf8' },
    );
  } catch {
    // grep exit 1 = no matches — return empty
    return [];
  }
  return grepOutput.split('\n').filter((l) => l.length > 0);
}
```

**Allowlist matching pattern** (adapt from `verify-tarball.js` lines 80-84 `.filter()` chain — extend to shaped entries per D-67):
```javascript
// D-67 shape: { path: <relative>, lineContainsPattern: <string|regex>, reason: <why> }
function isAllowlisted(hit, allowlist) {
  // hit format: "./path/to/file.ext:NN:matched text line"
  const [, relPath, , ...rest] = hit.match(/^\.\/(.+?):(\d+):(.*)$/) || [];
  const lineText = rest.join(':');
  return allowlist.some((entry) => {
    if (entry.path !== relPath) return false;
    if (!entry.lineContainsPattern) return true; // whole-file waive
    const pattern = entry.lineContainsPattern;
    return typeof pattern === 'string' ? lineText.includes(pattern) : new RegExp(pattern).test(lineText);
  });
}
```

**Context output pattern (3 lines of context per D-67)** — compose using node-native file read (no `grep -C` because we need structured output):
```javascript
// For each unallowlisted hit, print path + line + 3-line window
function printContext(hit) {
  const m = hit.match(/^\.\/(.+?):(\d+):(.*)$/);
  if (!m) { console.log(hit); return; }
  const [, relPath, lineNo] = m;
  const lines = fs.readFileSync(relPath, 'utf8').split('\n');
  const n = parseInt(lineNo, 10);
  const start = Math.max(0, n - 2);
  const end = Math.min(lines.length, n + 1);
  console.log(`${colors.red}\u2717${colors.reset} ${relPath}:${lineNo}`);
  for (let i = start; i < end; i++) {
    const marker = i + 1 === n ? '>' : ' ';
    console.log(`  ${marker} ${i + 1}: ${lines[i]}`);
  }
}
```

**Exit semantics** (copy from `test/test-file-refs-csv.js` lines 114-133 — summary block + `process.exit(1)` on failure, `process.exit(0)` on all-green).

---

### `test/fixtures/orphan-refs/allowlist.json` (NEW, test-fixture, static-config)

**No close analog.** JSON shape defined by D-67. Bootstrap by running `grep -rn 'gm-agent-' .` AFTER D-62/D-64 rewrites land and recording legitimate hits.

**Format** (JSON array of entries — D-67 canonical shape, Claude's discretion bullet in CONTEXT.md chose JSON over YAML to match existing `test/fixtures/` convention of JSON+CSV):
```json
[
  {
    "path": "tools/installer/ide/shared/agent-command-generator.js",
    "lineContainsPattern": "dir: '1-analysis/gm-agent-analyst'",
    "reason": "Filesystem path ref — dashed name per REF-02 (Windows-safe dir)."
  },
  {
    "path": "src/gomad-skills/1-analysis/gm-agent-analyst/SKILL.md",
    "lineContainsPattern": "name: gm-agent-analyst",
    "reason": "Frontmatter name must match dir name per parseSkillMd contract (D-63)."
  },
  {
    "path": "tools/installer/core/installer.js",
    "lineContainsPattern": "legacy v1.1 .claude/skills/gm-agent-",
    "reason": "Comment describing legacy cleanup target — not a live ref."
  }
]
```

**Seeding plan note for planner:** 14 guaranteed entries (7 agents × 2 files each: `SKILL.md` + `skill-manifest.yaml` `name:` line per D-63). Additional entries come from `tools/installer/ide/shared/agent-command-generator.js:17-45` (7 `dir:` strings) + installer comment/assertion lines. Expected total: ~30-50 per CONTEXT.md D-67.

---

### `test/test-gm-command-surface.js` (MODIFY, test, install-smoke)

**Analog:** self — existing Phase C block at lines 171-254.

**Flip conditional → hard assertion** (D-69). Current conditional at lines 218-254:
```javascript
// BEFORE (current — conditional):
const installedGmDir = path.join(installTempDir, '.claude', 'commands', 'gm');
if (fs.existsSync(installedGmDir)) {
  // ...structural checks...
} else {
  console.log(`${colors.yellow}\u26A0${colors.reset} Installed .claude/commands/gm/ not present (Phase 5 baseline...)`);
  console.log(`${colors.dim}  Phase 6 will flip this conditional into a hard assertion.${colors.reset}`);
}
```

**Rewrite pattern** (D-69 + the "explicitly enumerated all 7 agents" requirement):
```javascript
// AFTER (Phase 9 — hard assertion + explicit 7-agent enumeration):
const installedGmDir = path.join(installTempDir, '.claude', 'commands', 'gm');
assert(fs.existsSync(installedGmDir), '.claude/commands/gm/ present in installed output', `Checked: ${installedGmDir}`);

// D-69: enumerate all 7 explicitly (not globSync) so a silently-missing 1-of-7 fails
const EXPECTED_AGENTS = ['analyst', 'tech-writer', 'pm', 'ux-designer', 'architect', 'sm', 'dev'];
for (const shortName of EXPECTED_AGENTS) {
  const stubPath = path.join(installedGmDir, `agent-${shortName}.md`);
  assert(fs.existsSync(stubPath), `(C) agent-${shortName}.md present in installed output`);
  if (!fs.existsSync(stubPath)) continue;

  const raw = fs.readFileSync(stubPath, 'utf8');
  const match = raw.match(/^---\n([\s\S]*?)\n---/);
  assert(Boolean(match), `(C) agent-${shortName}.md has YAML frontmatter`);
  if (!match) continue;
  const fm = yaml.load(match[1]);
  assert(fm && fm.name === `gm:agent-${shortName}`, `(C) agent-${shortName}.md frontmatter name matches gm:agent-${shortName}`);
  assert(fm && typeof fm.description === 'string' && fm.description.length > 0, `(C) agent-${shortName}.md has non-empty description`);
}
```

**Negative assertion pattern** (D-69 — after positive checks pass, assert legacy absence. Reuse the `LEGACY_AGENTS` list from `test/test-legacy-v11-upgrade.js:53`):
```javascript
// D-69: negative assertion — no legacy .claude/skills/gm-agent-*/ left behind
const LEGACY_AGENTS = ['analyst', 'tech-writer', 'pm', 'ux-designer', 'architect', 'sm', 'dev'];
for (const shortName of LEGACY_AGENTS) {
  const legacyDir = path.join(installTempDir, '.claude', 'skills', `gm-agent-${shortName}`);
  assert(!fs.existsSync(legacyDir), `(C) no legacy .claude/skills/gm-agent-${shortName}/ present after fresh install`);
}
```

**Header comment update** (lines 17-21): rewrite from "Phase 6 will flip…" to "Phase 9 flipped conditional into hard assertion + added negative assertion per D-69." Keep the surrounding Phase A/B/C block-level structure intact.

---

### `tools/verify-tarball.js` (MODIFY, tool, batch grep)

**Analog:** self — existing `checkGrepClean()` function at lines 66-87 gives a direct template for the new Phase 3 pass.

**Third grep pass pattern** (D-71 — mirrors Phase 2 shape but scoped to `gm-agent-` with allowlist JSON):
```javascript
// Pattern copied from checkGrepClean() lines 66-87, adapted per D-71
function checkGmAgentGrepClean(tarballFiles) {
  // tarballFiles filtered to shipped paths (already parsed by parseTarballFiles)
  let grepOutput = '';
  try {
    grepOutput = execSync(
      `grep -rlE "gm-agent-" src/ tools/installer/ --include="*.js" --include="*.yaml" --include="*.md" --include="*.json" --include="*.csv" 2>/dev/null`,
      { encoding: 'utf8' },
    );
  } catch {
    return { passed: true, failures: [] };
  }

  // Load narrow allowlist (tarball-scoped; D-71 says ~10-15 entries vs D-67's ~30-50)
  const allowlistPath = path.join(__dirname, 'fixtures', 'tarball-grep-allowlist.json');
  const allowlist = fs.existsSync(allowlistPath) ? JSON.parse(fs.readFileSync(allowlistPath, 'utf8')) : [];

  const failures = grepOutput
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .filter((line) => !allowlist.some((entry) => entry.path === line));

  return { passed: failures.length === 0, failures };
}
```

**Integration pattern** (mirror the existing Phase 2 block at lines 117-126):
```javascript
// Phase 3: gm-agent- grep-clean check (D-71)
console.log(`${colors.cyan}Phase 3: Checking for residual gm-agent- references...${colors.reset}`);
const gmAgentCheck = checkGmAgentGrepClean(tarballFiles);
if (gmAgentCheck.passed) {
  console.log(`${colors.green}PASS: no unallowlisted gm-agent- residuals in shipped files${colors.reset}`);
} else {
  hasFailures = true;
  console.log(`${colors.red}FAIL: residual gm-agent- references in: ${gmAgentCheck.failures.join(', ')}${colors.reset}`);
}
```

**Final success log update** (line 133) — extend to mention 3 passes clean:
```javascript
console.log(`\n${colors.green}OK: ${tarballFiles.length} files in tarball, no forbidden paths, no bmad/bmm residuals, no unallowlisted gm-agent- residuals${colors.reset}`);
```

**New import** — `verify-tarball.js` does NOT currently import `node:fs` or `node:path`; add at top:
```javascript
const fs = require('node:fs');
const path = require('node:path');
```

---

### `src/gomad-skills/4-implementation/gm-sprint-agent/workflow.md` (MODIFY, prose)

**Pattern:** in-place string rewrite per D-62. 4 mechanical replacements at specific lines (verified in CONTEXT.md canonical refs):

| Line | Before | After |
|------|--------|-------|
| 90 | ``invoking the `gm-agent-pm` skill (via the Skill tool)`` | ``invoking the `/gm:agent-pm` slash command`` |
| 176 | ``invoking the `gm-agent-pm` skill (via the Skill tool)`` | ``invoking the `/gm:agent-pm` slash command`` |
| 245 | ``invoking the `gm-agent-dev` skill (via the Skill tool)`` | ``invoking the `/gm:agent-dev` slash command`` |
| 291 | ``invoking the `gm-agent-dev` skill (via the Skill tool)`` | ``invoking the `/gm:agent-dev` slash command`` |

D-62 explicitly says drop the "(via the Skill tool)" clause — commands ≠ skills post-migration.

---

### `src/gomad-skills/4-implementation/gm-epic-demo-story/SKILL.md` (MODIFY, prose)

**Pattern:** single-line rewrite per D-62. Line 20:

Before:
```markdown
Spawn a subagent and invoke `/gm-agent-pm` to load the Scrum Master (Bob) persona.
```

After:
```markdown
Spawn a subagent and invoke `/gm:agent-pm` to load the Scrum Master (Bob) persona.
```

---

### `src/gomad-skills/module-help.csv` (MODIFY, content/CSV)

**Pattern:** column-value rewrite per D-64. 5 rows (lines 6-10), `skill` column (2nd column): `gm-agent-tech-writer` → `gm:agent-tech-writer`. All 5 lines are mechanically identical in the affected column — a simple find/replace scoped to lines 6-10 (or whole-file with grep-restricted match `,gm-agent-tech-writer,` → `,gm:agent-tech-writer,`).

Before (line 6 sample):
```csv
GoMad Agile Development Module,gm-agent-tech-writer,Write Document,WD,"Describe ...
```

After:
```csv
GoMad Agile Development Module,gm:agent-tech-writer,Write Document,WD,"Describe ...
```

**Header row (line 1) UNCHANGED** — schema is `skill` column name stays.

---

### `tools/installer/core/installer.js` (MODIFY, service, helper deletion + simplification)

**Pattern:** self — delete lines 1103-1112 (both helpers) and rewrite call sites at lines 1127-1129, 1210-1223 to pass through raw values. D-64 makes the transform a no-op, so the simplification is pure deletion + rename.

**Delete pattern** (lines 1097-1112 — the comment block + both helpers):
```javascript
// DELETE ALL of lines 1097-1112:
// Local helpers for the Phase 06 agent-id migration. The source tree uses
// dash form (`gm-agent-*`, Windows-safe filesystem names); user-visible CSV
// columns emit colon form (`gm:agent-*`). agent-manifest.csv was migrated
// at write time, but module-help.csv sources (src/gomad-skills/module-help.csv
// and per-module module-help.csv) still carry dash form as internal refs —
// so normalize the lookup key on both sides, and transform only at emit.
const toUserVisibleAgentId = (id) => { /* ... */ };
const fromUserVisibleAgentId = (id) => { /* ... */ };
```

**Rewrite call site 1** (line 1129 — agent-manifest.csv lookup key normalization):
```javascript
// BEFORE:
const internalAgentName = fromUserVisibleAgentId(agentName);

// AFTER (D-64 — manifest already carries user-visible colon form per Phase 6):
const internalAgentName = agentName;
```

Update surrounding comment (lines 1127-1128) to: "Store the lookup key as-is; both source CSV and manifest now carry user-visible colon form (D-64)."

**Rewrite call site 2** (line 1137):
```javascript
// BEFORE:
const userVisibleAgentName = toUserVisibleAgentId(internalAgentName);

// AFTER (D-64):
const userVisibleAgentName = internalAgentName;
```

**Rewrite call site 3** (lines 1210-1223 — module-help.csv merge):
```javascript
// BEFORE (lines 1213-1223):
const rawAgentName = agentName ? agentName.trim() : '';
const internalAgentName = fromUserVisibleAgentId(rawAgentName);
const agentData = agentInfo.get(internalAgentName) || { command: '', displayName: '', title: '' };
const emittedAgentName = internalAgentName ? toUserVisibleAgentId(internalAgentName) : '';
// ... skill column transform ...
const emittedPhase = toUserVisibleAgentId(phase || '');

// AFTER (D-64 — all pass-throughs):
const rawAgentName = agentName ? agentName.trim() : '';
const agentData = agentInfo.get(rawAgentName) || { command: '', displayName: '', title: '' };
const emittedAgentName = rawAgentName;
const emittedPhase = phase || '';
```

Update comment block at lines 1210-1212 + 1218-1222 to reflect: "Source module-help.csv and agent-manifest.csv both carry user-visible colon form directly (D-64); no transform needed at merge time."

**DO NOT MODIFY** line 1138 `agentCommand` construction (CONTEXT.md explicit: "confirm unchanged behavior").

---

### `CHANGELOG.md` (MODIFY, content/release notes)

**Analog:** self — existing v1.1.0 entry at lines 7-49 (mirror exactly per D-72).

**Template (v1.1.0 structure copied verbatim, content per D-73):**
```markdown
## [1.2.0] - <YYYY-MM-DD>

### Summary

v1.2.0 completes the agent-surface migration: the 7 `gm-agent-*` personas ship
as `/gm:agent-*` slash commands instead of installed skills. Fresh-install and
v1.1→v1.2 upgrade paths are both covered; verification gates catch `gm-agent-`
leakage in shipped content and install output.

### Added

- `.claude/commands/gm/agent-<name>.md` launcher stubs for 7 agent personas
  (analyst, tech-writer, pm, ux-designer, architect, sm, dev).
- `test/test-orphan-refs.js` + `test/fixtures/orphan-refs/allowlist.json` —
  dedicated regression gate for `gm-agent-` reference drift (Phase 9).
- Phase C install-smoke hard assertion on all 7 agent launcher files + negative
  assertion on `.claude/skills/gm-agent-*/` absence.
- `tools/verify-tarball.js` Phase 3 grep-clean for `gm-agent-` with allowlist.
- Legacy `.claude/skills/gm-agent-*/` snapshot-then-remove on v1.1→v1.2 upgrade
  (see Phase 7 upgrade-safety).

### Changed

- Cross-skill invokes in `gm-sprint-agent/workflow.md` and
  `gm-epic-demo-story/SKILL.md` now reference `/gm:agent-*` slash commands
  instead of `gm-agent-*` skills (dropped "via the Skill tool" clause).
- `src/gomad-skills/module-help.csv` source rows carry user-visible colon form
  (`gm:agent-tech-writer`) directly; installer no longer transforms at merge time.

### Removed

- `toUserVisibleAgentId` / `fromUserVisibleAgentId` helpers in
  `tools/installer/core/installer.js` — no-op after source/emit alignment.
- `.claude/skills/gm-agent-*/` skill directories (no longer installed; cleaned
  up on upgrade).

### BREAKING CHANGES

The 7 `gm-agent-*` skill personas are no longer installed as
`.claude/skills/gm-agent-*/` skills — they ship as `/gm:agent-*` slash commands
at `.claude/commands/gm/agent-*.md`. Upgrading from v1.1.0: run `gomad install`
to regenerate; the installer auto-removes legacy
`.claude/skills/gm-agent-*/` directories (see Phase 7 upgrade-safety) and
writes the new command stubs. If you scripted `/gm-agent-*` invocations
(pre-v1.2 dash-form), update to `/gm:agent-*` (colon-form).
```

**Placement:** prepend (insert BEFORE the `## [1.1.0] - 2026-04-09` line at line 7). Do NOT modify the preamble at lines 1-5 or the v1.1.0 entry.

---

### `package.json` version bump (MODIFY)

Single-line change at line 4: `"version": "1.1.1"` → `"version": "1.2.0"`. Per D-75, lands in a dedicated commit `chore(09): bump version to 1.2.0` after all Phase 9 plan commits land on `main`.

---

### `package.json` scripts wiring (MODIFY)

**Analog:** self — current scripts block at lines 40-68.

**Add new script** (insert alphabetically near `test:refs` at line 63-64):
```json
"test:orphan-refs": "node test/test-orphan-refs.js",
```

**Update `quality` script** (line 56 — insert `test:orphan-refs` at end per D-68):
```json
// BEFORE:
"quality": "npm run format:check && npm run lint && npm run lint:md && npm run docs:build && npm run test:install && npm run test:integration && npm run validate:refs && npm run validate:skills",

// AFTER:
"quality": "npm run format:check && npm run lint && npm run lint:md && npm run docs:build && npm run test:install && npm run test:integration && npm run validate:refs && npm run validate:skills && npm run test:orphan-refs",
```

**Update `test` script** (line 57 — insert after `test:refs` per D-68):
```json
// BEFORE:
"test": "npm run test:refs && npm run test:install && npm run lint && npm run lint:md && npm run format:check",

// AFTER:
"test": "npm run test:refs && npm run test:orphan-refs && npm run test:install && npm run lint && npm run lint:md && npm run format:check",
```

Note: `prettier-plugin-packagejson` will likely re-sort scripts on commit — the plan should run `npm run format:fix` after editing to let the tooling normalize key order.

---

## Shared Patterns

### Node-native Test Runner Shape

**Source:** `test/test-file-refs-csv.js` (canonical), `test/test-legacy-v11-upgrade.js` (execSync variant), `test/test-gm-command-surface.js` (install-smoke variant)
**Apply to:** `test/test-orphan-refs.js`

All test scripts follow the same skeleton:
1. ANSI color block (5-6 keys)
2. `passed`/`failed` counters + `failures[]` array
3. `test(name, fn)` or `assert(cond, testName, err)` helper
4. Sequential test calls with section headers in cyan
5. Summary block (`${passed} passed, ${failed} failed`)
6. `process.exit(failed > 0 ? 1 : 0)`

No framework dependencies (no jest, no mocha). Exit code semantics drive `npm run test` gate behavior.

### Grep-driven Content Check + Allowlist

**Source:** `tools/verify-tarball.js:checkGrepClean()` (lines 66-87)
**Apply to:** `test/test-orphan-refs.js` AND `tools/verify-tarball.js` Phase 3

Common shape:
1. `execSync('grep -rE ...')` wrapped in try/catch (grep exit 1 = no matches = success)
2. Split output by newline, trim, filter empty
3. Apply `.filter((line) => !allowlisted(line))` chain
4. Return `{ passed: failures.length === 0, failures }`

Difference: `test-orphan-refs.js` uses richer allowlist (shape: `{path, lineContainsPattern, reason}`); `verify-tarball.js` can stay with simpler `{path}`-only entries per D-71's narrower scope.

### Source/Filesystem Asymmetry (REF-02 vs REF-01)

**Source:** `.planning/research/PITFALLS.md` §Pitfall 4 + CONTEXT.md §D-65
**Apply to:** all Phase 9 sweep targets

Invariants (all must hold post-Phase 9):
- Filesystem dir names: `src/gomad-skills/*/gm-agent-*/` — **dashed** (REF-02, Windows-safe)
- `SKILL.md` / `skill-manifest.yaml` `name:` frontmatter — **dashed** (parseSkillMd contract, D-63)
- User-visible prose (workflow.md, SKILL.md body refs) — **colon** (`/gm:agent-*`, D-62)
- `src/gomad-skills/module-help.csv` `skill` column — **colon** (D-64, newly aligned)
- Installed `.claude/commands/gm/agent-*.md` frontmatter name — **colon** (pre-existing)
- Installed `_gomad/_config/gomad-help.csv` — **colon** (pre-existing)

Planner should cite this section in every plan action that touches a `gm-agent-` reference to prevent accidentally "fixing" a dashed filesystem ref.

### CHANGELOG Section Template

**Source:** `CHANGELOG.md` lines 7-49 (v1.1.0 entry)
**Apply to:** v1.2.0 entry only

Fixed section order: Summary → Added → Changed → Removed → `### BREAKING CHANGES` (same-level subsection, no elevated callout per D-72).

### npm Script Composition

**Source:** `package.json` lines 56-57 (`quality` + `test` scripts)
**Apply to:** D-68 wiring

Convention:
- `quality` = publish gate (serial `&&` chain, every validator)
- `test` = dev-fast gate (shorter `&&` chain, core tests only)
- Individual `test:*` / `validate:*` scripts stay single-responsibility

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `test/fixtures/orphan-refs/allowlist.json` | test-fixture | static-config | No existing JSON-shaped allowlist in the repo. Planner should bootstrap from D-67 spec + post-sweep grep output. Closest structural sibling: `test/fixtures/phase-07/manifests/*.csv` (different format, different purpose — only shares the `test/fixtures/<feature>/` path convention). |

---

## Metadata

**Analog search scope:**
- `test/*.js` — 13 test files scanned
- `test/fixtures/**` — 4 fixture directories scanned
- `tools/installer/core/installer.js` — lines 1080-1290 (mergeModuleHelpCatalogs)
- `tools/verify-tarball.js` — full file (134 lines)
- `tools/installer/ide/shared/agent-command-generator.js` — gm-agent- refs
- `CHANGELOG.md` — existing v1.1.0 entry
- `package.json` — scripts block
- `src/gomad-skills/module-help.csv` — 33 rows
- `src/gomad-skills/4-implementation/gm-sprint-agent/workflow.md` — target prose lines
- `src/gomad-skills/4-implementation/gm-epic-demo-story/SKILL.md` — target prose line

**Files scanned:** ~30
**Pattern extraction date:** 2026-04-23
