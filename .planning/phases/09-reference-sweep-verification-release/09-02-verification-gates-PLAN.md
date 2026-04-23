---
phase: 09-reference-sweep-verification-release
plan: 02
type: execute
wave: 2
depends_on:
  - 09-01
files_modified:
  - test/test-orphan-refs.js
  - test/fixtures/orphan-refs/allowlist.json
  - test/test-gm-command-surface.js
  - tools/verify-tarball.js
  - tools/fixtures/tarball-grep-allowlist.json
  - package.json
autonomous: true
requirements:
  - REF-01
  - REF-04
  - REF-05
  - REL-03
  - REL-04
tags:
  - verification
  - tests
  - release-gates
  - tarball
  - regression-gate

must_haves:
  truths:
    - "Running `npm run test:orphan-refs` against the post-Plan-01 repo exits 0 (every gm-agent- hit is either in an allowlist entry or outside the grep scope)"
    - "Any new unallowlisted `gm-agent-` reference introduced to the source tree causes `npm run test:orphan-refs` to exit 1 (regression gate proven)"
    - "Running `npm run test:gm-surface` against a fresh-install output asserts all 7 .claude/commands/gm/agent-*.md stubs present AND no .claude/skills/gm-agent-* directory leaks"
    - "Running `npm run test:tarball` asserts no unallowlisted `gm-agent-` residuals in the shipped tarball content"
    - "`npm run quality` now invokes `test:orphan-refs` as part of the publish-gate chain"
    - "`npm test` now invokes `test:orphan-refs` as part of the dev-fast gate chain"
    - "The orphan-refs gate's grep scope INCLUDES README.md, README_CN.md, docs/en/, docs/zh-cn/, and website/ — so any future `gm-agent-` regression in those paths causes exit 1 (REF-05 enforcement, not a passive state claim; those paths currently contain zero `gm-agent-` hits, confirmed by CONTEXT.md Phase Boundary)"
  artifacts:
    - path: "test/test-orphan-refs.js"
      provides: "Dedicated node-native regression gate for gm-agent- reference drift"
      min_lines: 80
      exports: ["(none — runs as CLI on require/execute)"]
    - path: "test/fixtures/orphan-refs/allowlist.json"
      provides: "JSON allowlist of legitimate gm-agent- hits (filesystem paths, frontmatter lines, comments)"
      min_lines: 30
    - path: "test/test-gm-command-surface.js"
      provides: "Phase C install-smoke with hard assertion on all 7 launchers + negative assertion on .claude/skills/gm-agent-*/ absence"
      contains: "EXPECTED_AGENTS"
    - path: "tools/verify-tarball.js"
      provides: "Phase 3 grep-clean pass for gm-agent- with narrow allowlist"
      contains: "checkGmAgentGrepClean"
    - path: "tools/fixtures/tarball-grep-allowlist.json"
      provides: "Tarball-scoped allowlist (narrower than test-orphan-refs allowlist)"
      min_lines: 8
    - path: "package.json"
      provides: "Scripts wiring: test:orphan-refs added, quality + test chains extended"
      contains: "test:orphan-refs"
  key_links:
    - from: "test/test-orphan-refs.js"
      to: "test/fixtures/orphan-refs/allowlist.json"
      via: "fs.readFileSync + JSON.parse"
      pattern: "orphan-refs/allowlist\\.json"
    - from: "package.json scripts.quality"
      to: "test:orphan-refs script"
      via: "&& chain"
      pattern: "npm run test:orphan-refs"
    - from: "tools/verify-tarball.js"
      to: "tools/fixtures/tarball-grep-allowlist.json"
      via: "fs.readFileSync + JSON.parse"
      pattern: "tarball-grep-allowlist\\.json"
    - from: "test/test-gm-command-surface.js Phase C"
      to: "installed .claude/commands/gm/agent-<name>.md"
      via: "fs.existsSync + YAML frontmatter assertion"
      pattern: "assert.*gm:agent-"
---

<objective>
Install the verification gates that make REF-01 / REF-04 / REF-05 / REL-03 / REL-04 enforceable at CI and publish time:
- A new dedicated `test:orphan-refs` regression gate that fails on any un-allowlisted `gm-agent-` hit across source/tests/docs/manifests
- Flip `test/test-gm-command-surface.js` Phase C from conditional to hard assertion + add negative assertion on `.claude/skills/gm-agent-*/` absence
- Add `tools/verify-tarball.js` Phase 3 grep-clean pass for `gm-agent-` with narrow allowlist
- Wire the new gate into `npm run quality` + `npm test` chains

Purpose: Lock in the sweep from Plan 01 as a permanent invariant — any future drift (someone accidentally re-introducing `gm-agent-` in a user-visible surface) produces an exit-1 before the publish gate passes.

Output:
- 1 new test script + 1 new fixture JSON (orphan-refs)
- 1 new fixture JSON (tarball allowlist)
- 2 modified tools (test-gm-command-surface.js, verify-tarball.js)
- `package.json` scripts wiring
</objective>

<execution_context>
@/Users/rockie/Documents/GitHub/xgent/gomad/.claude/get-shit-done/workflows/execute-plan.md
@/Users/rockie/Documents/GitHub/xgent/gomad/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/ROADMAP.md
@.planning/REQUIREMENTS.md
@.planning/phases/09-reference-sweep-verification-release/09-CONTEXT.md
@.planning/phases/09-reference-sweep-verification-release/09-PATTERNS.md
@.planning/codebase/TESTING.md
@.planning/codebase/CONVENTIONS.md

<!--
  09-01-SUMMARY.md is produced by execute-plan for Plan 01 and is NOT a required
  input for Plan 02. If it exists when Plan 02 runs (serial execution path), the
  executor MAY read it opportunistically for post-Plan-01 grep context. If it
  does not exist (fresh execution of the phase, or re-plan context), Plan 02
  MUST still execute correctly by running the bootstrap grep against the
  current tree. Treat the SUMMARY as soft/optional context, never a blocker.
-->

<interfaces>
Key contracts pulled from the existing codebase (executor should NOT re-explore):

From `test/test-file-refs-csv.js` (canonical test-script shape — copy this shape):
```javascript
const fs = require('node:fs');
const path = require('node:path');

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

function test(name, fn) { /* see PATTERNS.md */ }
function assert(condition, message) { if (!condition) throw new Error(message); }
// Exit code: process.exit(failures.length > 0 ? 1 : 0)
```

From `tools/verify-tarball.js:checkGrepClean` (lines 66-87) — adapt for gm-agent- scan:
```javascript
const { execSync } = require('node:child_process');
function checkGrepClean() {
  let grepOutput = '';
  try {
    grepOutput = execSync(
      String.raw`grep -rliE "\b(bmad|bmm)\b" src/ tools/installer/ --include="*.js" --include="*.yaml" --include="*.md" --include="*.json" --include="*.csv" 2>/dev/null`,
      { encoding: 'utf8' },
    );
  } catch { return { passed: true, failures: [] }; }
  // ... filter/allowlist ...
  return { passed: failures.length === 0, failures };
}
```

From `test/test-legacy-v11-upgrade.js:53` — reuse the LEGACY_AGENTS list:
```javascript
const LEGACY_AGENTS = ['analyst', 'tech-writer', 'pm', 'ux-designer', 'architect', 'sm', 'dev'];
```

From `test/test-gm-command-surface.js:213-254` — current conditional block to flip.

From `package.json:40-68` — scripts block; MUST preserve order/structure conventions (prettier-plugin-packagejson will re-sort keys alphabetically within `scripts`).
</interfaces>

<allowlist_bootstrap_procedure>
The orphan-refs allowlist (`test/fixtures/orphan-refs/allowlist.json`) and the tarball allowlist (`tools/fixtures/tarball-grep-allowlist.json`) MUST be bootstrapped by running actual grep commands AFTER Plan 01 has landed. Do NOT hand-write speculative allowlist entries.

Bootstrap procedure (executor runs these commands, captures output, then builds the fixture):

1. Run the exact grep the gate will run (scoped per D-67):
   ```bash
   grep -rn 'gm-agent-' . \
     --exclude-dir=node_modules --exclude-dir=.git \
     --exclude-dir=.planning --exclude-dir='old-milestone-*' \
     --exclude-dir=dist --exclude-dir=coverage
   ```
2. For each hit, classify:
   - Legitimate filesystem-path ref (e.g. `dir: '1-analysis/gm-agent-analyst'` in agent-command-generator) → allowlist entry with `lineContainsPattern` scoped to the file path reference
   - Frontmatter `name:` line in agent SKILL.md or skill-manifest.yaml → allowlist entry (14 guaranteed entries: 7 agents × 2 files)
   - `parseSkillMd` dir-name validation comment/assertion in manifest-generator.js → allowlist entry with comment-scoped pattern
   - Installer comment describing legacy cleanup target (e.g. `.claude/skills/gm-agent-*/`) → allowlist entry
   - Test assertion referencing `.claude/skills/gm-agent-*/` absence (e.g. in `test-legacy-v11-upgrade.js`) → allowlist entry
3. Record each entry with shape `{ path, lineContainsPattern, reason }` per D-67.
4. Re-run the gate until it exits 0 against the clean post-Plan-01 tree; iterate until every legitimate hit is allowlisted and zero unallowlisted hits remain.

**Expected allowlist size:** ~30-50 entries for `orphan-refs/allowlist.json` (broad source-tree grep), ~10-15 for `tarball-grep-allowlist.json` (narrower: only shipped-tarball files).

**Anti-pattern:** Do NOT whitelist a whole file blanket-style unless every line in that file is a legitimate filesystem-path ref (e.g., `tools/installer/ide/shared/agent-command-generator.js` may legitimately use `path: undefined` for a whole-file waive if all its `gm-agent-` hits are filesystem dir strings). Prefer per-line `lineContainsPattern` entries.
</allowlist_bootstrap_procedure>
</context>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Create test/test-orphan-refs.js regression gate + bootstrap allowlist fixture</name>
  <files>
    test/test-orphan-refs.js,
    test/fixtures/orphan-refs/allowlist.json
  </files>
  <read_first>
    - test/test-file-refs-csv.js (entire file — template for ANSI colors, test/assert helpers, summary block, exit semantics)
    - tools/verify-tarball.js (lines 66-87 — checkGrepClean pattern to adapt for grep invocation + allowlist filter)
    - .planning/phases/09-reference-sweep-verification-release/09-CONTEXT.md §D-66, §D-67 (gate contract + allowlist shape)
    - .planning/phases/09-reference-sweep-verification-release/09-PATTERNS.md §"test/test-orphan-refs.js (NEW, test, batch/transform)" (code blocks to copy)
    - .planning/codebase/TESTING.md §Test Structure (exit-code conventions + ANSI pattern)
    - (optional, if present) .planning/phases/09-reference-sweep-verification-release/09-01-SUMMARY.md — post-Plan-01 grep output seeds the allowlist bootstrap. If the file is absent, run the bootstrap grep command directly against the current tree (see allowlist_bootstrap_procedure in <context>).
  </read_first>
  <action>
Create two new files.

**FILE 1: `test/test-orphan-refs.js`**

Node-native CLI test script mirroring `test/test-file-refs-csv.js` shape. Full concrete content:

```javascript
/**
 * Orphan Reference Regression Gate
 *
 * Fails (exit 1) on any `gm-agent-*` string in the source tree that is not
 * covered by `test/fixtures/orphan-refs/allowlist.json`. Ensures the Phase 9
 * sweep (REF-01) stays landed and that filesystem-path / frontmatter refs
 * (REF-02 / REF-04 invariants) continue to be classified as legitimate.
 *
 * Usage: node test/test-orphan-refs.js
 *        npm run test:orphan-refs
 */

const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');

const colors = {
  reset: '\u001B[0m',
  green: '\u001B[32m',
  red: '\u001B[31m',
  cyan: '\u001B[36m',
  dim: '\u001B[2m',
};

const REPO_ROOT = path.resolve(__dirname, '..');
const ALLOWLIST_PATH = path.join(__dirname, 'fixtures', 'orphan-refs', 'allowlist.json');

let totalTests = 0;
let passedTests = 0;
const failures = [];

function test(name, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  ${colors.green}\u2713${colors.reset} ${name}`);
  } catch (error) {
    console.log(`  ${colors.red}\u2717${colors.reset} ${name}`);
    console.log(`    ${colors.dim}${error.message}${colors.reset}`);
    failures.push({ name, message: error.message });
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function runGrep() {
  // Grep scope per D-67: exclude node_modules, .git, archived planning, milestones.
  // Include all file types relevant to the user-visible surface.
  let grepOutput = '';
  try {
    grepOutput = execSync(
      `grep -rn 'gm-agent-' . ` +
        `--exclude-dir=node_modules --exclude-dir=.git --exclude-dir=.planning ` +
        `--exclude-dir='old-milestone-*' --exclude-dir=dist --exclude-dir=coverage ` +
        `2>/dev/null`,
      { cwd: REPO_ROOT, encoding: 'utf8' },
    );
  } catch {
    return [];
  }
  return grepOutput.split('\n').filter((l) => l.length > 0);
}

function parseHit(hit) {
  // Format: "./path/to/file.ext:NN:matched text"
  const m = hit.match(/^\.\/(.+?):(\d+):(.*)$/);
  if (!m) return null;
  return { relPath: m[1], lineNo: parseInt(m[2], 10), lineText: m[3] };
}

function isAllowlisted(parsed, allowlist) {
  return allowlist.some((entry) => {
    if (entry.path !== parsed.relPath) return false;
    if (!entry.lineContainsPattern) return true;
    const pat = entry.lineContainsPattern;
    if (typeof pat === 'string') return parsed.lineText.includes(pat);
    try {
      return new RegExp(pat).test(parsed.lineText);
    } catch {
      return false;
    }
  });
}

function printContext(parsed) {
  const abs = path.join(REPO_ROOT, parsed.relPath);
  let lines;
  try {
    lines = fs.readFileSync(abs, 'utf8').split('\n');
  } catch (error) {
    console.log(`    ${colors.dim}(could not read file: ${error.message})${colors.reset}`);
    return;
  }
  const start = Math.max(0, parsed.lineNo - 2);
  const end = Math.min(lines.length, parsed.lineNo + 1);
  for (let i = start; i < end; i++) {
    const marker = i + 1 === parsed.lineNo ? `${colors.red}>${colors.reset}` : ' ';
    console.log(`    ${marker} ${i + 1}: ${lines[i]}`);
  }
}

console.log(`${colors.cyan}Orphan Reference Regression Gate (gm-agent-)${colors.reset}`);
console.log(`${colors.dim}Grep scope: repo root, excluding node_modules/.git/.planning/milestones.${colors.reset}\n`);

test('Allowlist fixture parses as JSON array', () => {
  assert(fs.existsSync(ALLOWLIST_PATH), `allowlist missing at ${ALLOWLIST_PATH}`);
  const raw = fs.readFileSync(ALLOWLIST_PATH, 'utf8');
  const parsed = JSON.parse(raw);
  assert(Array.isArray(parsed), 'allowlist must be a JSON array');
  for (const entry of parsed) {
    assert(typeof entry.path === 'string', 'every entry needs a path');
    assert(typeof entry.reason === 'string' && entry.reason.length > 0, 'every entry needs a non-empty reason');
  }
});

const allowlist = JSON.parse(fs.readFileSync(ALLOWLIST_PATH, 'utf8'));
const hits = runGrep();
const unallowlisted = [];

for (const hit of hits) {
  const parsed = parseHit(hit);
  if (!parsed) continue;
  if (!isAllowlisted(parsed, allowlist)) {
    unallowlisted.push({ hit, parsed });
  }
}

test(`Grep output clean: ${hits.length} total hits, 0 unallowlisted`, () => {
  if (unallowlisted.length === 0) return;
  console.log(`\n${colors.red}${unallowlisted.length} unallowlisted hit(s):${colors.reset}`);
  for (const { parsed } of unallowlisted) {
    console.log(`\n  ${colors.red}\u2717${colors.reset} ${parsed.relPath}:${parsed.lineNo}`);
    printContext(parsed);
  }
  throw new Error(`${unallowlisted.length} unallowlisted gm-agent- reference(s) found`);
});

console.log(`\n${colors.cyan}Summary${colors.reset}`);
console.log(`  ${passedTests}/${totalTests} tests passed, ${failures.length} failed`);
console.log(`  ${colors.dim}Total grep hits: ${hits.length}, allowlisted: ${hits.length - unallowlisted.length}, unallowlisted: ${unallowlisted.length}${colors.reset}`);
process.exit(failures.length > 0 ? 1 : 0);
```

**FILE 2: `test/fixtures/orphan-refs/allowlist.json`**

Bootstrap by running the exact grep above against the post-Plan-01 tree, then build the JSON array. Guaranteed minimum 14 entries (the 7 agent `SKILL.md` + 7 `skill-manifest.yaml` `name:` frontmatter lines). Additional entries come from filesystem-path refs in installer code + test-assertion lines + installer legacy-cleanup comments.

Each entry matches the shape D-67 mandates:
```json
{
  "path": "<repo-relative-path>",
  "lineContainsPattern": "<string or ECMAScript regex source>",
  "reason": "<short reason; cite REF-02 / REF-04 / filesystem path / legacy cleanup>"
}
```

Starter entries (the guaranteed 14 frontmatter lines — executor bootstraps the rest from post-Plan-01 grep output; expected total ~30-50 per D-67):

```json
[
  {
    "path": "src/gomad-skills/1-analysis/gm-agent-analyst/SKILL.md",
    "lineContainsPattern": "name: gm-agent-analyst",
    "reason": "Frontmatter name must match dir name per parseSkillMd contract (REF-02, REF-04, D-63)."
  },
  {
    "path": "src/gomad-skills/1-analysis/gm-agent-analyst/skill-manifest.yaml",
    "lineContainsPattern": "name: gm-agent-analyst",
    "reason": "skill-manifest.yaml name must match dir name (REF-02, REF-04, D-63)."
  }
]
```

(Repeat the pair for tech-writer, pm, ux-designer, architect, sm, dev — 14 entries total for the frontmatter baseline. Then append entries for every other legitimate hit discovered by the bootstrap grep.)

**Bootstrap command for the executor:**
```bash
# 1. Run the exact grep the gate will run
cd $REPO_ROOT
grep -rn 'gm-agent-' . \
  --exclude-dir=node_modules --exclude-dir=.git \
  --exclude-dir=.planning --exclude-dir='old-milestone-*' \
  --exclude-dir=dist --exclude-dir=coverage > /tmp/orphan-refs-hits.txt

# 2. For each hit, classify as legitimate (add to allowlist) or illegitimate (fix in source).
# 3. Iterate: run `node test/test-orphan-refs.js` → add allowlist entry → re-run → repeat until exit 0.
```

Ensure the created `test/fixtures/orphan-refs/` directory exists before writing `allowlist.json`. Use `fs.ensureDirSync` or `mkdir -p` equivalent.
  </action>
  <verify>
    <automated>
      test -f test/test-orphan-refs.js \
      && test -f test/fixtures/orphan-refs/allowlist.json \
      && grep -q "parseHit" test/test-orphan-refs.js \
      && grep -q "isAllowlisted" test/test-orphan-refs.js \
      && grep -q "printContext" test/test-orphan-refs.js \
      && grep -q "exclude-dir=.planning" test/test-orphan-refs.js \
      && node -e "const a = JSON.parse(require('node:fs').readFileSync('test/fixtures/orphan-refs/allowlist.json', 'utf8')); if (!Array.isArray(a)) process.exit(1); if (a.length < 14) process.exit(2); for (const e of a) { if (!e.path || !e.reason) process.exit(3); }" \
      && node test/test-orphan-refs.js
    </automated>
  </verify>
  <acceptance_criteria>
    - `test -f test/test-orphan-refs.js` succeeds (file exists)
    - `test -f test/fixtures/orphan-refs/allowlist.json` succeeds (file exists)
    - `wc -l test/test-orphan-refs.js` reports at least 80 lines (structural floor — warning #6 pairs this with behavioral asserts below so an 80-line stub cannot pass)
    - `grep -q "parseHit" test/test-orphan-refs.js` succeeds (behavioral: hit-parser function present)
    - `grep -q "isAllowlisted" test/test-orphan-refs.js` succeeds (behavioral: allowlist predicate present)
    - `grep -q "printContext" test/test-orphan-refs.js` succeeds (behavioral: context-printer for failure diagnostics present)
    - `grep -q "exclude-dir=.planning" test/test-orphan-refs.js` succeeds (behavioral: D-67 scope exclusion present — archived planning artifacts out of gate scope)
    - `node -e "JSON.parse(require('node:fs').readFileSync('test/fixtures/orphan-refs/allowlist.json', 'utf8'))"` exits 0 (valid JSON)
    - `jq 'length' test/fixtures/orphan-refs/allowlist.json` returns a number >= 14 (floor: 7 agent × 2 frontmatter files)
    - `jq 'all(.[]; has("path") and has("reason"))' test/fixtures/orphan-refs/allowlist.json` returns `true` (schema conformance)
    - `node test/test-orphan-refs.js` exits 0 against the post-Plan-01 tree (gate passes)
    - To prove the gate actually bites: temporarily add a line `// test: gm-agent-pm orphan`  to a tracked file, re-run `node test/test-orphan-refs.js`, confirm exit 1, then revert
  </acceptance_criteria>
  <done>Gate script exists with all four behavioral symbols (parseHit, isAllowlisted, printContext, exclude-dir=.planning); allowlist fixture exists with ≥14 entries; gate exits 0 on clean tree and exit 1 on simulated regression.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Flip test-gm-command-surface.js Phase C to hard assertion + add negative assertion; add verify-tarball.js Phase 3 grep-clean</name>
  <files>
    test/test-gm-command-surface.js,
    tools/verify-tarball.js,
    tools/fixtures/tarball-grep-allowlist.json
  </files>
  <read_first>
    - test/test-gm-command-surface.js (entire file — verify lines 17-21 header comment and lines 171-269 Phase C block)
    - tools/verify-tarball.js (entire file — understand Phase 1/2 structure + checkGrepClean at lines 66-87)
    - test/test-legacy-v11-upgrade.js (line 53 — reuse LEGACY_AGENTS constant)
    - .planning/phases/09-reference-sweep-verification-release/09-CONTEXT.md §D-69, §D-71 (hard assertion + tarball Phase 3 contracts)
    - .planning/phases/09-reference-sweep-verification-release/09-PATTERNS.md §"test-gm-command-surface.js (MODIFY, test, install-smoke)" and §"verify-tarball.js (MODIFY, tool, batch grep)" (exact code replacements)
  </read_first>
  <action>
Three concrete edits across three files.

**EDIT A: `test/test-gm-command-surface.js` — flip conditional + add negative assertion**

Locate the header comment block near lines 17-21 (current text: "Phase 6 will flip this conditional into a hard assertion"). Rewrite that comment block to:

```javascript
 * Phase C install-smoke — structural assertions on installer output:
 *   - Hard assertion: all 7 .claude/commands/gm/agent-<name>.md launchers present
 *     with valid YAML frontmatter (name: gm:agent-<name>, non-empty description).
 *   - Negative assertion: no legacy .claude/skills/gm-agent-<name>/ directory
 *     present in the installed output (REL-03, Phase 9 D-69).
```

Then find the Phase C block at lines 213-254 (the `const installedGmDir = …; if (fs.existsSync(installedGmDir)) { … } else { … }` structure). Replace the entire `if (fs.existsSync(installedGmDir)) { … } else { … }` block (lines 213-254) with:

```javascript
  // D-69 (Phase 9): hard assertion replaces the Phase 5 conditional.
  // Installer MUST now emit .claude/commands/gm/ with all 7 agent launchers.
  const installedGmDir = path.join(installTempDir, '.claude', 'commands', 'gm');
  assert(fs.existsSync(installedGmDir), '.claude/commands/gm/ present in installed output', `Checked: ${installedGmDir}`);

  // D-69: enumerate all 7 explicitly (not globSync) so a silently-missing 1-of-7 fails.
  const EXPECTED_AGENTS = ['analyst', 'tech-writer', 'pm', 'ux-designer', 'architect', 'sm', 'dev'];
  for (const shortName of EXPECTED_AGENTS) {
    const stubPath = path.join(installedGmDir, `agent-${shortName}.md`);
    assert(fs.existsSync(stubPath), `(C) agent-${shortName}.md present in installed output`);
    if (!fs.existsSync(stubPath)) continue;

    const raw = fs.readFileSync(stubPath, 'utf8');
    const match = raw.match(/^---\n([\s\S]*?)\n---/);
    assert(Boolean(match), `(C) agent-${shortName}.md has YAML frontmatter`);
    if (!match) continue;

    let fm;
    try {
      fm = yaml.load(match[1]);
    } catch (error) {
      assert(false, `(C) agent-${shortName}.md frontmatter parses as YAML`, error.message);
      continue;
    }
    assert(
      fm && fm.name === `gm:agent-${shortName}`,
      `(C) agent-${shortName}.md frontmatter name matches gm:agent-${shortName}`,
      `Got: ${fm ? fm.name : '<no name>'}`,
    );
    assert(fm && typeof fm.description === 'string' && fm.description.length > 0, `(C) agent-${shortName}.md has non-empty description`);
  }

  // D-69: negative assertion — fresh install must NOT leave any legacy skills dir.
  const LEGACY_AGENTS = ['analyst', 'tech-writer', 'pm', 'ux-designer', 'architect', 'sm', 'dev'];
  for (const shortName of LEGACY_AGENTS) {
    const legacyDir = path.join(installTempDir, '.claude', 'skills', `gm-agent-${shortName}`);
    assert(!fs.existsSync(legacyDir), `(C) no legacy .claude/skills/gm-agent-${shortName}/ present after fresh install`);
  }
```

Remove all references to `globSync` in Phase C if that import becomes unused (check the top-of-file imports; remove the unused import to keep `npm run lint` clean). If `globSync` is still used in Phase A/B, leave the import.

**EDIT B: `tools/verify-tarball.js` — add Phase 3 grep-clean pass for `gm-agent-`**

1. Update the header doc comment at lines 1-10 to list a 3rd phase:
```javascript
/**
 * Tarball Verification Script
 *
 * Validates npm tarball hygiene before publishing:
 * 1. Forbidden path check - ensures no .planning/, test/, .github/, docs/, website/, or banner-bmad files leak into tarball
 * 2. Grep-clean check - ensures no bmad/bmm references remain in shipped files (VFY-03)
 * 3. gm-agent- grep-clean check - ensures no user-visible gm-agent- residuals in shipped content (Phase 9 D-71)
 *
 * Usage: node tools/verify-tarball.js
 *        npm run test:tarball
 */
```

2. Add `const fs = require('node:fs');` and `const path = require('node:path');` at the top of the file (after the existing `execSync` require at line 12) — the current file does NOT import them.

3. After the existing `checkGrepClean` function (ends around line 87), add a new function:

```javascript
/**
 * Phase 3: Grep-clean check for gm-agent- references in shipped files
 * (Phase 9 D-71). Uses narrow allowlist at tools/fixtures/tarball-grep-allowlist.json
 * for legitimate filesystem path refs and frontmatter name lines.
 * @returns {{ passed: boolean, failures: string[] }}
 */
function checkGmAgentGrepClean() {
  let grepOutput = '';
  try {
    grepOutput = execSync(
      `grep -rlE "gm-agent-" src/ tools/installer/ ` +
        `--include="*.js" --include="*.yaml" --include="*.md" --include="*.json" --include="*.csv" ` +
        `2>/dev/null`,
      { encoding: 'utf8' },
    );
  } catch {
    return { passed: true, failures: [] };
  }

  const allowlistPath = path.join(__dirname, 'fixtures', 'tarball-grep-allowlist.json');
  const allowlist = fs.existsSync(allowlistPath) ? JSON.parse(fs.readFileSync(allowlistPath, 'utf8')) : [];
  const allowedPaths = new Set(allowlist.map((entry) => entry.path));

  const failures = grepOutput
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .filter((line) => !allowedPaths.has(line));

  return { passed: failures.length === 0, failures };
}
```

4. After the existing Phase 2 block (ends around line 126 `console.log(colors.red FAIL ...)`), insert Phase 3 invocation mirroring the Phase 2 shape:

```javascript
// Phase 3: gm-agent- grep-clean check (D-71)
console.log(`${colors.cyan}Phase 3: Checking for residual gm-agent- references...${colors.reset}`);
const gmAgentCheck = checkGmAgentGrepClean();
if (gmAgentCheck.passed) {
  console.log(`${colors.green}PASS: no unallowlisted gm-agent- residuals in shipped files${colors.reset}`);
} else {
  hasFailures = true;
  console.log(`${colors.red}FAIL: residual gm-agent- references in: ${gmAgentCheck.failures.join(', ')}${colors.reset}`);
}
```

5. Update the final success log (currently at line 133):
```javascript
console.log(`\n${colors.green}OK: ${tarballFiles.length} files in tarball, no forbidden paths, no bmad/bmm residuals, no unallowlisted gm-agent- residuals${colors.reset}`);
```

**EDIT C: `tools/fixtures/tarball-grep-allowlist.json` — NEW narrow allowlist**

Create `tools/fixtures/tarball-grep-allowlist.json` (ensure parent `tools/fixtures/` exists first) as a JSON array. Per D-71, this allowlist is narrower than orphan-refs (tarball-scoped; only shipped files). Expected ~10-15 entries.

Bootstrap procedure: run the exact Phase 3 grep command from step 3 above against the current source tree, then for each path classify:
- Legitimate filesystem path ref in shipped installer code (e.g. `tools/installer/ide/shared/agent-command-generator.js`) → allowlist entry
- Frontmatter `name:` line in shipped skill dirs (e.g. `src/gomad-skills/1-analysis/gm-agent-analyst/SKILL.md`) → allowlist entry (14 guaranteed)
- Shipped `module-help.csv` — should NOT appear since Plan 01 rewrote to colon; if it appears, that is a Plan 01 bug, not an allowlist gap

Starter shape:
```json
[
  { "path": "src/gomad-skills/1-analysis/gm-agent-analyst/SKILL.md",
    "reason": "Frontmatter name must match dir name per parseSkillMd contract (REF-02, REF-04)." },
  { "path": "src/gomad-skills/1-analysis/gm-agent-analyst/skill-manifest.yaml",
    "reason": "skill-manifest.yaml name must match dir name (REF-02, REF-04)." }
]
```

(Repeat for all 7 agents × 2 files + any legitimate installer-code path refs found during bootstrap.)

After all three edits, run `npm run format:fix` then `npm run lint` to confirm no style/lint regressions.
  </action>
  <verify>
    <automated>
      grep -c "EXPECTED_AGENTS" test/test-gm-command-surface.js | grep -qx 2 \
      && grep -c "LEGACY_AGENTS" test/test-gm-command-surface.js | grep -q '^[1-9]' \
      && ! grep -q 'Phase 5 baseline' test/test-gm-command-surface.js \
      && ! grep -q 'Phase 6 will flip' test/test-gm-command-surface.js \
      && grep -q 'checkGmAgentGrepClean' tools/verify-tarball.js \
      && grep -q "Phase 3:" tools/verify-tarball.js \
      && test -f tools/fixtures/tarball-grep-allowlist.json \
      && node -e "const a = JSON.parse(require('node:fs').readFileSync('tools/fixtures/tarball-grep-allowlist.json', 'utf8')); if (!Array.isArray(a)) process.exit(1); if (a.length < 14) process.exit(2);" \
      && npm run test:tarball \
      && npm run test:gm-surface
    </automated>
  </verify>
  <acceptance_criteria>
    - `grep -c 'EXPECTED_AGENTS' test/test-gm-command-surface.js` returns at least `2` (declaration + iteration)
    - `grep -c 'LEGACY_AGENTS' test/test-gm-command-surface.js` returns at least `1`
    - `grep -c 'Phase 5 baseline' test/test-gm-command-surface.js` returns `0` (old conditional comment gone)
    - `grep -c 'Phase 6 will flip' test/test-gm-command-surface.js` returns `0` (old TODO comment gone)
    - `grep -q "assert(!fs.existsSync(legacyDir)" test/test-gm-command-surface.js` succeeds (negative assertion present)
    - `grep -q 'checkGmAgentGrepClean' tools/verify-tarball.js` succeeds (new function present)
    - `grep -q "Phase 3:" tools/verify-tarball.js` succeeds (new phase invocation present)
    - `grep -q "const fs = require('node:fs')" tools/verify-tarball.js` succeeds (new import present)
    - `grep -q "const path = require('node:path')" tools/verify-tarball.js` succeeds (new import present)
    - `test -f tools/fixtures/tarball-grep-allowlist.json` succeeds; `jq 'length' ...` returns ≥14
    - `npm run test:gm-surface` exits 0 (Phase C hard assertion passes against a real fresh install — proves installer-output side of REL-03)
    - `npm run test:tarball` exits 0 (Phase 3 grep-clean passes — proves shipped-content side of REL-03)
    - `npm run lint` exits 0 (no unused-import or style regressions)
  </acceptance_criteria>
  <done>Test-gm-command-surface flipped to hard assertion with negative check; verify-tarball has Phase 3; tarball allowlist fixture exists and is valid JSON; both test:gm-surface and test:tarball exit 0.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 3: Wire test:orphan-refs into package.json scripts (add script + extend quality + test chains)</name>
  <files>package.json</files>
  <read_first>
    - package.json (entire file — lines 40-68 scripts block; specifically line 56 `quality` and line 57 `test`)
    - .planning/phases/09-reference-sweep-verification-release/09-CONTEXT.md §D-68 (wiring contract)
    - .planning/phases/09-reference-sweep-verification-release/09-PATTERNS.md §"package.json scripts wiring (MODIFY)" (exact before/after)
  </read_first>
  <action>
Three edits to `package.json` — additions only, no removals:

**EDIT 1: Add a new script `test:orphan-refs`**

Insert the following key-value pair inside the `scripts` object. Placement: between existing `test:install` and `test:integration` (or wherever prettier-plugin-packagejson re-sorts it alphabetically within the `test:*` cluster). The exact insertion point doesn't matter — prettier will re-sort. Content:

```json
"test:orphan-refs": "node test/test-orphan-refs.js",
```

**EDIT 2: Extend the `quality` script**

Current value at line 56:
```
"quality": "npm run format:check && npm run lint && npm run lint:md && npm run docs:build && npm run test:install && npm run test:integration && npm run validate:refs && npm run validate:skills",
```

New value (append `&& npm run test:orphan-refs` at the end — the D-68 "terminal gate" placement):
```
"quality": "npm run format:check && npm run lint && npm run lint:md && npm run docs:build && npm run test:install && npm run test:integration && npm run validate:refs && npm run validate:skills && npm run test:orphan-refs",
```

**EDIT 3: Extend the `test` script**

Current value at line 57:
```
"test": "npm run test:refs && npm run test:install && npm run lint && npm run lint:md && npm run format:check",
```

New value (insert `&& npm run test:orphan-refs` after `test:refs` per D-68):
```
"test": "npm run test:refs && npm run test:orphan-refs && npm run test:install && npm run lint && npm run lint:md && npm run format:check",
```

After all three edits, run `npm run format:fix` — `prettier-plugin-packagejson` will re-sort the `scripts` keys alphabetically. That is expected and acceptable (CONVENTIONS.md §package.json scripts block references conventional ordering, but alphabetical sorting via the prettier plugin is the shipped normalization).

**Version field scope note:** Plan 02 MUST NOT touch the `version` field. Any version-bump-related assertion is out of scope for this plan — Plan 03 owns the `1.1.1 → 1.2.0` bump in a dedicated commit per D-75 step 2. This plan's verification and acceptance criteria therefore contain NO version-value assertion (the value is orthogonal to the script-wiring work this plan delivers, and pinning it here would break re-runs after Plan 03 lands).

Do NOT modify `files`, `dependencies`, or any other top-level keys.
  </action>
  <verify>
    <automated>
      node -e "const p=require('./package.json'); if (!p.scripts['test:orphan-refs']) process.exit(1); if (!p.scripts.quality.includes('npm run test:orphan-refs')) process.exit(2); if (!p.scripts.test.includes('npm run test:orphan-refs')) process.exit(3);" \
      && npm run test:orphan-refs \
      && npm run format:check
    </automated>
  </verify>
  <acceptance_criteria>
    - `node -e "console.log(require('./package.json').scripts['test:orphan-refs'])"` outputs `node test/test-orphan-refs.js`
    - `node -e "const q=require('./package.json').scripts.quality; process.exit(q.includes('npm run test:orphan-refs') ? 0 : 1)"` exits 0
    - `node -e "const t=require('./package.json').scripts.test; process.exit(t.includes('npm run test:orphan-refs') ? 0 : 1)"` exits 0
    - (version untouched by this plan — Plan 03 handles bump; no version assertion here so re-runs remain idempotent after Plan 03 lands)
    - `npm run test:orphan-refs` exits 0 (end-to-end wiring works)
    - `npm run format:check` exits 0 (prettier re-sort is stable after the edits)
    - `npm run quality` can be invoked; if it runs to completion it exits 0 (full publish-gate chain executable — but individual phases like `docs:build` may be slow, so allow this as a smoke invocation, not a mandatory full run in CI)
  </acceptance_criteria>
  <done>test:orphan-refs script added; quality and test chains both invoke it; version field NOT modified (Plan 03 owns bump); format check passes.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| test-fixture (allowlist) → gate decision | `test/fixtures/orphan-refs/allowlist.json` and `tools/fixtures/tarball-grep-allowlist.json` drive pass/fail; tampering with allowlist tampers with the gate |
| tarball content → publish | `tools/verify-tarball.js` output governs whether `npm publish` is allowed (enforced by Plan 03's release checklist) |
| grep subprocess → gate script | `execSync('grep ...')` output is parsed and compared against allowlist; malicious file names could theoretically influence output |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-09-05 | Tampering | `test/fixtures/orphan-refs/allowlist.json` | mitigate | Allowlist lives in version control; every entry has a human-readable `reason` field so review catches silently-added waves. PR review of the allowlist is required to land changes on `main`. `npm run lint:md` doesn't cover JSON but `git diff` in code review surfaces any additions. **Cross-link to T-09-10 (Plan 03, npm publish auth):** allowlist drift combined with token exfiltration = compounded risk — a tampered allowlist can hide a `gm-agent-` regression AND the tampered tarball can ship if npm publish auth is also compromised. Convention: any PR that adds >3 entries to this allowlist requires a second reviewer before merge. |
| T-09-06 | Tampering | `tools/fixtures/tarball-grep-allowlist.json` | mitigate | Narrower scope than orphan-refs allowlist (only files shipped in the tarball). Same review-based mitigation. **Cross-link to T-09-10 (Plan 03, npm publish auth):** allowlist drift + token exfiltration = tampered tarball can publish past the gate. Convention: any PR that adds >3 entries to this allowlist requires a second reviewer before merge. |
| T-09-07 | Bypass | `checkGmAgentGrepClean` grep invocation | accept | `grep -rlE` runs with the repo root as CWD; file paths come from the filesystem directly (not user input). An attacker able to add arbitrarily-named files to the repo is already a committer on `main` (branch-protected) — out of scope for this threat model. |
| T-09-08 | DoS | `test:orphan-refs` grep scan | accept | Grep runs on the repo tree excluding `node_modules`; even with deep trees, wall-clock is <5s on current repo size. Script has no timeout but `npm run test` implicit timeout (per Node default) applies. |
| T-09-09 | Repudiation | gate pass/fail history | accept | `npm run test:orphan-refs` output is captured in CI logs if run in CI; locally, developer must re-run. No audit log needed (gate is deterministic). |
</threat_model>

<verification>
After all 3 tasks complete:

1. **Regression gate proven bites:** temporarily add `// gm-agent-pm orphan` to any tracked file, run `npm run test:orphan-refs`, verify exit 1; revert; re-run, verify exit 0.

2. **Full gate chain clean:** `npm run quality` exits 0 end-to-end.

3. **REL-03 dual check:** both `npm run test:gm-surface` (install output) and `npm run test:tarball` (shipped content) exit 0.

4. **REF-05 gate-scope enforcement:** the orphan-refs gate's grep scope includes `README.md`, `README_CN.md`, `docs/`, `website/` — NOT excluded by any `--exclude-dir` flag in `test-orphan-refs.js`. These paths currently contain zero `gm-agent-` hits (per CONTEXT.md Phase Boundary), so the gate passes with no allowlist entries for them. Any future regression (someone reintroducing `gm-agent-` in README or docs/ or website/) causes the gate to exit 1 — this is the plan-delivered REF-05 enforcement, not a passive state claim.

5. **Filesystem invariant preserved:** 7 `gm-agent-*` dirs + 14 `name:` frontmatter lines still exist as-before (verify with `ls src/gomad-skills/*/gm-agent-* 2>/dev/null | wc -l` and `grep -rc '^name: gm-agent-' src/gomad-skills/`).
</verification>

<success_criteria>
- `test/test-orphan-refs.js` exists, runs, exits 0 against post-Plan-01 tree
- `test/fixtures/orphan-refs/allowlist.json` has ≥14 entries with correct schema
- `tools/fixtures/tarball-grep-allowlist.json` has ≥14 entries with correct schema
- `test/test-gm-command-surface.js` Phase C uses hard assertion + negative assertion with all 7 agents enumerated explicitly
- `tools/verify-tarball.js` has a working Phase 3 `checkGmAgentGrepClean` + integration log
- `package.json` scripts expose `test:orphan-refs` and invoke it from both `quality` and `test` chains (version field untouched — Plan 03 owns bump)
- `npm run lint`, `npm run format:check`, `npm run test:orphan-refs`, `npm run test:gm-surface`, `npm run test:tarball` all exit 0
- Adding an unallowlisted `gm-agent-` string to any tracked file causes the gate to exit 1 (regression bite proven)
</success_criteria>

<output>
After completion, create `.planning/phases/09-reference-sweep-verification-release/09-02-SUMMARY.md` capturing:
- Final allowlist entry count (orphan-refs + tarball)
- Categories of allowlisted hits (frontmatter, filesystem-path, comments, test assertions)
- Output of `npm run test:orphan-refs`, `npm run test:gm-surface`, `npm run test:tarball` (all 3 must exit 0)
- Regression-bite proof: paste-ready command sequence that adds/removes a test orphan to prove the gate fails correctly
</output>
</output>
