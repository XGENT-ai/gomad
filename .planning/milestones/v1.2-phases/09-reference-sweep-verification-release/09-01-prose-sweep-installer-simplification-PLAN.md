---
phase: 09-reference-sweep-verification-release
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/gomad-skills/4-implementation/gm-sprint-agent/workflow.md
  - src/gomad-skills/4-implementation/gm-epic-demo-story/SKILL.md
  - src/gomad-skills/module-help.csv
  - tools/installer/core/installer.js
autonomous: true
requirements:
  - REF-01
  - REF-02
  - REF-04
tags:
  - content-sweep
  - installer
  - csv

must_haves:
  truths:
    - "Cross-skill invokes in gm-sprint-agent/workflow.md reference /gm:agent-pm and /gm:agent-dev slash commands (not gm-agent-* skills via Skill tool)"
    - "gm-epic-demo-story/SKILL.md line 20 references /gm:agent-pm (not /gm-agent-pm)"
    - "src/gomad-skills/module-help.csv carries gm:agent-tech-writer in the skill column for all 5 affected rows"
    - "toUserVisibleAgentId / fromUserVisibleAgentId helpers are removed from installer.js (source + emit now aligned)"
    - "Filesystem directory names (src/gomad-skills/*/gm-agent-*/) and the 7 SKILL.md/skill-manifest.yaml `name: gm-agent-*` frontmatter fields remain dashed (REF-02/REF-04 invariant preserved)"
    - "parseSkillMd's skillMeta.name === dirName assertion still passes (REF-04 invariant)"
  artifacts:
    - path: "src/gomad-skills/4-implementation/gm-sprint-agent/workflow.md"
      provides: "4 cross-skill invokes migrated to /gm:agent-* slash-command form"
      contains: "`/gm:agent-pm` slash command"
    - path: "src/gomad-skills/4-implementation/gm-epic-demo-story/SKILL.md"
      provides: "Step 1 activation now references /gm:agent-pm"
      contains: "/gm:agent-pm"
    - path: "src/gomad-skills/module-help.csv"
      provides: "skill column uses colon form for 5 tech-writer rows"
      contains: "gm:agent-tech-writer"
    - path: "tools/installer/core/installer.js"
      provides: "mergeModuleHelpCatalogs simplified — no dash↔colon transform helpers"
      contains: "mergeModuleHelpCatalogs"
  key_links:
    - from: "tools/installer/core/installer.js:mergeModuleHelpCatalogs"
      to: "src/gomad-skills/module-help.csv"
      via: "CSV read + merge pipeline"
      pattern: "fs\\.readFile.*module-help\\.csv"
    - from: "installer.js agent lookup"
      to: "agent-manifest.csv entries"
      via: "agentInfo Map keyed by rawAgentName.trim()"
      pattern: "agentInfo\\.get\\(rawAgentName"
    - from: "parseSkillMd"
      to: "gm-agent-*/SKILL.md frontmatter name"
      via: "skillMeta.name === dirName assertion"
      pattern: "skillMeta\\.name === dirName"
---

<objective>
Migrate every user-visible `gm-agent-*` prose string in source content to the `/gm:agent-*` slash-command form (REF-01) while preserving the dashed filesystem + frontmatter invariants (REF-02, REF-04), and align `src/gomad-skills/module-help.csv` source rows with the shipped emit form so the installer's dash↔colon transform helpers can be deleted.

Purpose: Land all source-level reference rewrites in a single coherent diff so Plan 02's orphan-refs gate can bootstrap its allowlist against a stable post-rewrite grep output.

Output:
- 4 rewrites in `gm-sprint-agent/workflow.md` (prose: skill → slash command)
- 1 rewrite in `gm-epic-demo-story/SKILL.md` (prose: dash → colon)
- 5 CSV row rewrites in `src/gomad-skills/module-help.csv` (skill column: dash → colon)
- Helper deletions + call-site rewrites in `tools/installer/core/installer.js:mergeModuleHelpCatalogs`
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
@.planning/codebase/CONVENTIONS.md

<source_filesystem_asymmetry>
Invariants that MUST hold after this plan lands (CONTEXT.md §D-65, PATTERNS.md §Shared Patterns):

- Filesystem dir names: `src/gomad-skills/*/gm-agent-*/` — **DASHED** (REF-02, Windows-safe)
- `SKILL.md` / `skill-manifest.yaml` `name:` frontmatter — **DASHED** (parseSkillMd contract, D-63)
- User-visible prose bodies (workflow.md, SKILL.md body text) — **COLON** (`/gm:agent-*`, D-62)
- `src/gomad-skills/module-help.csv` `skill` column — **COLON** (D-64, this plan)
- Installed `.claude/commands/gm/agent-*.md` frontmatter name — **COLON** (pre-existing)
- Installed `_gomad/_config/gomad-help.csv` — **COLON** (pre-existing)

DO NOT touch any `name:` frontmatter line in `src/gomad-skills/*/gm-agent-*/SKILL.md` or `skill-manifest.yaml`. DO NOT rename any `gm-agent-*` directory.
</source_filesystem_asymmetry>
</context>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Rewrite cross-skill invoke prose in gm-sprint-agent and gm-epic-demo-story</name>
  <files>
    src/gomad-skills/4-implementation/gm-sprint-agent/workflow.md,
    src/gomad-skills/4-implementation/gm-epic-demo-story/SKILL.md
  </files>
  <read_first>
    - src/gomad-skills/4-implementation/gm-sprint-agent/workflow.md (entire file — verify line numbers 90, 176, 245, 291 before editing)
    - src/gomad-skills/4-implementation/gm-epic-demo-story/SKILL.md (entire file — verify line 20 before editing)
    - .planning/phases/09-reference-sweep-verification-release/09-CONTEXT.md §D-62 (cross-skill invoke prose rewrite decision)
    - .planning/phases/09-reference-sweep-verification-release/09-PATTERNS.md §"gm-sprint-agent/workflow.md (MODIFY, prose)" (exact before/after text)
  </read_first>
  <action>
Perform 5 in-place string rewrites across 2 files. These are exact literal-string replacements — do NOT generalize or regex the whole file.

**File 1: `src/gomad-skills/4-implementation/gm-sprint-agent/workflow.md`**

Rewrite at line 90:
- FROM: `Step 1: Load your agent profile by invoking the `gm-agent-pm` skill (via the Skill tool). This sets up your identity, expertise, and working style as the Scrum Master. Follow any activation instructions it provides.`
- TO:   `Step 1: Load your agent profile by invoking the `/gm:agent-pm` slash command. This sets up your identity, expertise, and working style as the Scrum Master. Follow any activation instructions it provides.`

Rewrite at line 176:
- FROM: `Step 1: Load your agent profile by invoking the `gm-agent-pm` skill (via the Skill tool) to adopt the Scrum Master identity.`
- TO:   `Step 1: Load your agent profile by invoking the `/gm:agent-pm` slash command to adopt the Scrum Master identity.`

Rewrite at line 245:
- FROM: `Step 1: Load your agent profile by invoking the `gm-agent-dev` skill (via the Skill tool). This sets up your identity, expertise, and working style as the Senior Developer. Follow any activation instructions it provides.`
- TO:   `Step 1: Load your agent profile by invoking the `/gm:agent-dev` slash command. This sets up your identity, expertise, and working style as the Senior Developer. Follow any activation instructions it provides.`

Rewrite at line 291:
- FROM: `Step 1: Load your agent profile by invoking the `gm-agent-dev` skill (via the Skill tool). This sets up your identity, expertise, and working style as the Senior Developer. Follow any activation instructions it provides.`
- TO:   `Step 1: Load your agent profile by invoking the `/gm:agent-dev` slash command. This sets up your identity, expertise, and working style as the Senior Developer. Follow any activation instructions it provides.`

Both the backtick-wrapped identifier AND the "(via the Skill tool)" clause must be rewritten — per D-62, commands ≠ skills so the trailing clause is semantically wrong and must be dropped. The leading `/` prefix (slash-command syntax) must be added.

**File 2: `src/gomad-skills/4-implementation/gm-epic-demo-story/SKILL.md`**

Rewrite at line 20:
- FROM: `Spawn a subagent and invoke `/gm-agent-pm` to load the Scrum Master (Bob) persona. All subsequent steps operate through Bob's persona.`
- TO:   `Spawn a subagent and invoke `/gm:agent-pm` to load the Scrum Master (Bob) persona. All subsequent steps operate through Bob's persona.`

Only the `/gm-agent-pm` → `/gm:agent-pm` token changes. Rest of the line is unchanged.

**DO NOT** touch the `name:` frontmatter line 2 in either file (those stay dashed per REF-02/REF-04). Verify post-edit with `head -2 <file>` — line 2 must still read `name: gm-<skill>` (dashed, unchanged).
  </action>
  <verify>
    <automated>
      grep -c "via the Skill tool" src/gomad-skills/4-implementation/gm-sprint-agent/workflow.md | grep -qx 0 \
      && grep -c "/gm:agent-pm" src/gomad-skills/4-implementation/gm-sprint-agent/workflow.md | grep -qx 2 \
      && grep -c "/gm:agent-dev" src/gomad-skills/4-implementation/gm-sprint-agent/workflow.md | grep -qx 2 \
      && grep -c "/gm:agent-pm" src/gomad-skills/4-implementation/gm-epic-demo-story/SKILL.md | grep -qx 1 \
      && ! grep -q "/gm-agent-pm" src/gomad-skills/4-implementation/gm-epic-demo-story/SKILL.md \
      && head -2 src/gomad-skills/4-implementation/gm-sprint-agent/workflow.md | grep -q "^name: gm-sprint-agent" \
      && head -2 src/gomad-skills/4-implementation/gm-epic-demo-story/SKILL.md | grep -q "^name: gm-epic-demo-story"
    </automated>
  </verify>
  <acceptance_criteria>
    - `grep -c "via the Skill tool" src/gomad-skills/4-implementation/gm-sprint-agent/workflow.md` returns `0`
    - `grep -c "/gm:agent-pm" src/gomad-skills/4-implementation/gm-sprint-agent/workflow.md` returns `2`
    - `grep -c "/gm:agent-dev" src/gomad-skills/4-implementation/gm-sprint-agent/workflow.md` returns `2`
    - `grep -c "/gm-agent-pm" src/gomad-skills/4-implementation/gm-sprint-agent/workflow.md` returns `0` (no remaining dashed command forms)
    - `grep -c "/gm-agent-dev" src/gomad-skills/4-implementation/gm-sprint-agent/workflow.md` returns `0`
    - `grep -c "/gm:agent-pm" src/gomad-skills/4-implementation/gm-epic-demo-story/SKILL.md` returns exactly `1`
    - `grep -c "/gm-agent-pm" src/gomad-skills/4-implementation/gm-epic-demo-story/SKILL.md` returns `0`
    - `head -2 src/gomad-skills/4-implementation/gm-sprint-agent/workflow.md` contains `name: gm-sprint-agent` (dashed, untouched)
    - `head -2 src/gomad-skills/4-implementation/gm-epic-demo-story/SKILL.md` contains `name: gm-epic-demo-story` (dashed, untouched)
  </acceptance_criteria>
  <done>All 5 prose rewrites applied exactly as specified; filesystem invariant preserved (name: frontmatter lines still dashed).</done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Rewrite module-help.csv skill column to colon form for tech-writer rows</name>
  <files>src/gomad-skills/module-help.csv</files>
  <read_first>
    - src/gomad-skills/module-help.csv (entire file — confirm lines 6-10 contain the 5 `gm-agent-tech-writer` occurrences)
    - .planning/phases/09-reference-sweep-verification-release/09-CONTEXT.md §D-64 (module-help.csv source form decision)
    - .planning/phases/09-reference-sweep-verification-release/09-PATTERNS.md §"module-help.csv (MODIFY, content/CSV)"
  </read_first>
  <action>
In `src/gomad-skills/module-help.csv`, rewrite the `skill` column (column 2, 1-indexed) for lines 6-10 (the 5 rows that currently carry `gm-agent-tech-writer` in column 2).

Exact transformation (applied to lines 6-10 only — the 5 `gm-agent-tech-writer` rows):

- FROM pattern in each of 5 lines: `,gm-agent-tech-writer,`
- TO pattern: `,gm:agent-tech-writer,`

Sample verification — line 6 before:
`GoMad Agile Development Module,gm-agent-tech-writer,Write Document,WD,"Describe in detail what you want, and the agent will follow documentation best practices. Multi-turn conversation with subprocess for research/review.",write,,anytime,,,false,project-knowledge,document`

Line 6 after:
`GoMad Agile Development Module,gm:agent-tech-writer,Write Document,WD,"Describe in detail what you want, and the agent will follow documentation best practices. Multi-turn conversation with subprocess for research/review.",write,,anytime,,,false,project-knowledge,document`

Important:
- Header row (line 1) is UNCHANGED. The column name stays `skill` (schema identifier, not data).
- DO NOT rewrite any line that does NOT currently contain `gm-agent-tech-writer`. Lines 2-5 and 11-33 must be byte-identical pre/post edit.
- **Portable sed invocation** (works on BOTH macOS BSD sed AND GNU sed / Linux CI per info#10):
  ```bash
  sed -i.bak 's/,gm-agent-tech-writer,/,gm:agent-tech-writer,/g' src/gomad-skills/module-help.csv \
    && rm src/gomad-skills/module-help.csv.bak
  ```
  DO NOT use `sed -i ''` (BSD-only; fails on GNU sed with empty-string argument ambiguity on Linux CI).
  Alternative: use node-based replacement (`fs.readFileSync` + `String.replaceAll` + `fs.writeFileSync`) if preferring a cross-platform script with no sed dependency.
- The leading+trailing commas ensure only the column-2 token is matched (no substring collisions).
- After edit, run `npm run format:fix` to let prettier-plugin-packagejson / prettier normalize any whitespace (but CSV content stays identical).
  </action>
  <verify>
    <automated>
      grep -c ',gm-agent-tech-writer,' src/gomad-skills/module-help.csv | grep -qx 0 \
      && grep -c ',gm:agent-tech-writer,' src/gomad-skills/module-help.csv | grep -qx 5 \
      && [ "$(head -1 src/gomad-skills/module-help.csv)" = "module,skill,display-name,menu-code,description,action,args,phase,after,before,required,output-location,outputs" ] \
      && [ "$(wc -l < src/gomad-skills/module-help.csv)" -ge 32 ] \
      && [ ! -f src/gomad-skills/module-help.csv.bak ]
    </automated>
  </verify>
  <acceptance_criteria>
    - `grep -c ',gm-agent-tech-writer,' src/gomad-skills/module-help.csv` returns `0`
    - `grep -c ',gm:agent-tech-writer,' src/gomad-skills/module-help.csv` returns `5`
    - `head -1 src/gomad-skills/module-help.csv` output equals literally `module,skill,display-name,menu-code,description,action,args,phase,after,before,required,output-location,outputs` (header unchanged)
    - `wc -l` of file is unchanged from the pre-edit state (no accidental row addition/removal; expected minimum 32 lines)
    - No rows other than the 5 tech-writer rows are modified — `git diff --stat src/gomad-skills/module-help.csv` shows 5 `+` / 5 `-`
    - No `.bak` leftover from the portable sed invocation — `test ! -f src/gomad-skills/module-help.csv.bak` succeeds
  </acceptance_criteria>
  <done>5 rows rewritten; all invariants preserved; file still parses as valid CSV with the existing header schema; no backup files left behind.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 3: Delete dash↔colon transform helpers in installer.js and rewrite call sites to pass-throughs</name>
  <files>tools/installer/core/installer.js</files>
  <read_first>
    - tools/installer/core/installer.js lines 1080-1260 (the entire mergeModuleHelpCatalogs method — verify current state of helpers + call sites at lines 1097-1112, 1127-1129, 1137-1138, 1210-1223)
    - .planning/phases/09-reference-sweep-verification-release/09-CONTEXT.md §D-64 (helper deletion + pass-through rewrite)
    - .planning/phases/09-reference-sweep-verification-release/09-PATTERNS.md §"installer.js (MODIFY, service, helper deletion + simplification)" (exact before/after)
    - src/gomad-skills/module-help.csv (verify Task 2 has landed — grep `gm:agent-tech-writer` must return 5 matches; this rewrite depends on source CSV carrying colon form directly)
  </read_first>
  <action>
Modify `tools/installer/core/installer.js` — 4 concrete edits to `mergeModuleHelpCatalogs(gomadDir)`. D-64 rationale: since the source `module-help.csv` now carries colon form directly (Task 2), the previous dash→colon transform is a no-op and the helpers can be deleted.

**EDIT 1 — Delete lines 1097-1112 (comment block + both helpers)**

Remove exactly this block:
```javascript
    // Local helpers for the Phase 06 agent-id migration. The source tree uses
    // dash form (`gm-agent-*`, Windows-safe filesystem names); user-visible CSV
    // columns emit colon form (`gm:agent-*`). agent-manifest.csv was migrated
    // at write time, but module-help.csv sources (src/gomad-skills/module-help.csv
    // and per-module module-help.csv) still carry dash form as internal refs —
    // so normalize the lookup key on both sides, and transform only at emit.
    const toUserVisibleAgentId = (id) => {
      if (!id) return '';
      const s = String(id);
      return s.startsWith('gm-agent-') ? `gm:agent-${s.slice('gm-agent-'.length)}` : s;
    };
    const fromUserVisibleAgentId = (id) => {
      if (!id) return '';
      const s = String(id);
      return s.startsWith('gm:agent-') ? `gm-agent-${s.slice('gm:agent-'.length)}` : s;
    };
```

Replace with a single updated comment (to preserve D-64 traceability):
```javascript
    // Phase 09 (D-64): source module-help.csv and agent-manifest.csv now both
    // carry user-visible colon form (`gm:agent-*`) directly, so no
    // dash↔colon transform is needed at lookup or emit time.
```

**EDIT 2 — Rewrite lines 1127-1129 (agent-manifest.csv lookup key normalization)**

FROM (lines 1127-1129):
```javascript
        // Store the lookup key in internal (dash) form so it matches agent-name
        // cells in module-help.csv which are not yet migrated.
        const internalAgentName = fromUserVisibleAgentId(agentName);
```

TO:
```javascript
        // Store the lookup key as-is; both the manifest and module-help.csv
        // sources now carry user-visible colon form (D-64).
        const internalAgentName = agentName;
```

**EDIT 3 — Rewrite lines 1135-1137 ONLY (comment + userVisibleAgentName derivation)**

**Scope:** this edit touches lines 1135, 1136, 1137 — it DOES NOT touch line 1138. Line 1138 is explicitly preserved by EDIT 5 below.

FROM (lines 1135-1137):
```javascript
        // Build agent command using the user-visible form so the help surface
        // mirrors the actual slash-command namespace (`/gm:agent-*`).
        const userVisibleAgentName = toUserVisibleAgentId(internalAgentName);
```

TO (also 3 lines — keeps line count stable so surrounding line numbers do not drift):
```javascript
        // Both source and manifest carry colon form directly (D-64); the
        // lookup key IS the user-visible form.
        const userVisibleAgentName = internalAgentName;
```

**EDIT 4 — Rewrite lines 1210-1223 (module-help.csv merge — lookup + emit)**

FROM (lines 1210-1223):
```javascript
              // Lookup agent info. module-help.csv sources carry agent-name in
              // internal (dash) form, so normalize to that form for the dict
              // lookup and emit the user-visible (colon) form into the final CSV.
              const rawAgentName = agentName ? agentName.trim() : '';
              const internalAgentName = fromUserVisibleAgentId(rawAgentName);
              const agentData = agentInfo.get(internalAgentName) || { command: '', displayName: '', title: '' };
              const emittedAgentName = internalAgentName ? toUserVisibleAgentId(internalAgentName) : '';

              // The `phase` column in gomad-help.csv maps from source
              // module-help.csv's `skill` column. When that source skill is
              // an agent (e.g. `gm-agent-tech-writer`), the value is a
              // user-visible agent reference and must use the migrated colon
              // form. Non-agent skill IDs pass through unchanged.
              const emittedPhase = toUserVisibleAgentId(phase || '');
```

TO:
```javascript
              // D-64: source module-help.csv carries user-visible colon form
              // directly, so the merge is a straight pass-through — no
              // dash↔colon transform, no separate internal/emitted split.
              const rawAgentName = agentName ? agentName.trim() : '';
              const agentData = agentInfo.get(rawAgentName) || { command: '', displayName: '', title: '' };
              const emittedAgentName = rawAgentName;
              const emittedPhase = phase || '';
```

**EDIT 5 — Line 1138 `agentCommand` construction is PRESERVED (do NOT modify)**

Line 1138 (`const agentCommand = module ? \`gomad:${module}:agent:${userVisibleAgentName}\` : \`gomad:agent:${userVisibleAgentName}\`;`) is explicitly outside the scope of EDIT 3's rewrite. It already uses `userVisibleAgentName`, which — after EDIT 3 — is just an alias for `internalAgentName` / `agentName`, so its runtime value is unchanged. Executor MUST NOT touch line 1138.

Post-condition for coherence with EDIT 3: the trimmed EDIT 3 block only rewrites lines 1135-1137 (comment + variable assignment). Line 1138 reads identically to the pre-edit state. A `git diff -U1` of lines 1135-1138 should show 3 lines of `-` / 3 lines of `+` across 1135-1137 with line 1138 unchanged (zero diff).

After all edits, run `npm run format:fix` then `npm run lint` to confirm no lint regressions.
  </action>
  <verify>
    <automated>
      ! grep -q 'toUserVisibleAgentId' tools/installer/core/installer.js \
      && ! grep -q 'fromUserVisibleAgentId' tools/installer/core/installer.js \
      && grep -q 'D-64' tools/installer/core/installer.js \
      && grep -q 'const internalAgentName = agentName;' tools/installer/core/installer.js \
      && grep -q 'const userVisibleAgentName = internalAgentName;' tools/installer/core/installer.js \
      && grep -q 'const emittedAgentName = rawAgentName;' tools/installer/core/installer.js \
      && grep -q 'const emittedPhase = phase || ' tools/installer/core/installer.js \
      && grep -q 'const agentCommand = module ? `gomad:${module}:agent:${userVisibleAgentName}`' tools/installer/core/installer.js \
      && npm run lint 2>&1 | tail -5 | grep -qv 'error' \
      && node -e "require('./tools/installer/core/installer.js'); console.log('require-OK')" | grep -q 'require-OK'
    </automated>
  </verify>
  <acceptance_criteria>
    - `grep -c 'toUserVisibleAgentId' tools/installer/core/installer.js` returns `0` (helper fully removed)
    - `grep -c 'fromUserVisibleAgentId' tools/installer/core/installer.js` returns `0` (helper fully removed)
    - `grep -c 'D-64' tools/installer/core/installer.js` returns at least `1` (traceability comment present)
    - `grep -q 'const internalAgentName = agentName;' tools/installer/core/installer.js` succeeds (call site 1 rewritten)
    - `grep -q 'const userVisibleAgentName = internalAgentName;' tools/installer/core/installer.js` succeeds (call site 2 rewritten)
    - `grep -q 'const emittedAgentName = rawAgentName;' tools/installer/core/installer.js` succeeds (call site 3 rewritten)
    - `grep -q 'const emittedPhase = phase || ' tools/installer/core/installer.js` succeeds (call site 3 emittedPhase rewritten)
    - `grep -q 'const agentCommand = module ? \`gomad:\${module}:agent:\${userVisibleAgentName}\`' tools/installer/core/installer.js` succeeds (line 1138 preserved verbatim — EDIT 5 invariant)
    - `node -e "require('./tools/installer/core/installer.js')"` exits 0 (no syntax/require errors introduced)
    - `npm run lint -- tools/installer/core/installer.js` exits 0
    - `npm run test:install` exits 0 (installer unit tests still pass — proves the pass-through behavior is wire-compatible)
  </acceptance_criteria>
  <done>Both helpers deleted; 4 call sites rewritten to pass-throughs; lint + install tests clean; line 1138 agentCommand construction preserved verbatim (EDIT 5).</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| source CSV → installer | `src/gomad-skills/module-help.csv` rows read at install time; data value flows into `_gomad/_config/gomad-help.csv` |
| installer → user filesystem | installer writes files under target workspace — unchanged by this plan |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-09-01 | Tampering | `src/gomad-skills/module-help.csv` | accept | Source CSV lives in version control; adversarial modification requires a commit on `main` (branch-protected per `gitStatus`). Schema is narrow (known columns) and the installer does not eval data — column values are string-concatenated only. |
| T-09-02 | Repudiation | Helper-deletion in installer.js | mitigate | D-64 traceability comment embedded at the deletion site + decision ID in CHANGELOG (Plan 03). `git blame` at line 1097 points to the Phase 9 commit. |
| T-09-03 | Denial of Service | `mergeModuleHelpCatalogs` read of `module-help.csv` | accept | Source CSV is bounded in size (~33 rows per module, <10KB). No DoS surface from removing a no-op transform. |
| T-09-04 | Information Disclosure | Debug-log output during merge | accept | `BMAD_DEBUG_MANIFEST` gates debug logs (CONVENTIONS.md §Logging); no PII/secrets flow through this path. |
</threat_model>

<verification>
After all 3 tasks complete, the following global invariants MUST hold:

1. `grep -rn 'gm-agent-' src/gomad-skills/4-implementation/gm-sprint-agent/workflow.md src/gomad-skills/4-implementation/gm-epic-demo-story/SKILL.md src/gomad-skills/module-help.csv tools/installer/core/installer.js` returns only:
   - (nothing from workflow.md — dashed form fully removed)
   - (nothing from gm-epic-demo-story/SKILL.md body — dashed form fully removed; frontmatter line 2 excluded from this check's pattern by file scope)
   - (nothing from module-help.csv — all 5 tech-writer rows now colon)
   - (nothing from installer.js except possibly inside a D-64 traceability comment or legacy-cleanup comment referring to `.claude/skills/gm-agent-*` — those are acceptable)

2. `ls src/gomad-skills/1-analysis/ src/gomad-skills/2-plan-workflows/ src/gomad-skills/3-solutioning/ src/gomad-skills/4-implementation/ | grep gm-agent-` shows all 7 agent dirs with dashed names preserved (REF-02 invariant).

3. `grep -rn '^name: gm-agent-' src/gomad-skills/` returns 14 hits (7 agents × 2 files each: `SKILL.md` + `skill-manifest.yaml`) — REF-04 invariant preserved.

4. `npm run test:install && npm run validate:skills` exits 0 — proves `parseSkillMd`'s `skillMeta.name === dirName` assertion still passes (REF-04).
</verification>

<success_criteria>
- All 5 prose rewrites land in the exact files/lines specified (Task 1, Task 2)
- All 4 installer.js edits land with pass-through rewrites and helper deletions (Task 3)
- Line 1138 `agentCommand` construction preserved verbatim (EDIT 5 invariant — reconciles with EDIT 3's trimmed scope)
- `npm run lint`, `npm run test:install`, `npm run validate:skills` all exit 0
- Filesystem + frontmatter dashed invariant preserved: 7 dirs + 14 `name: gm-agent-*` frontmatter lines untouched
- `npm run format:check` passes (prettier normalizes any whitespace drift)
- Plan 02 can bootstrap its orphan-refs allowlist against a stable post-rewrite grep output
</success_criteria>

<output>
After completion, create `.planning/phases/09-reference-sweep-verification-release/09-01-SUMMARY.md` capturing:
- Files modified with exact line counts / diff sizes
- Helper-deletion pre/post snapshot (grep proof of absence)
- Any discrepancies between CONTEXT.md line-number assumptions and actual file state
- Post-rewrite grep output of `gm-agent-` across the 4 edited files (will seed Plan 02's allowlist work)
</output>
</output>
