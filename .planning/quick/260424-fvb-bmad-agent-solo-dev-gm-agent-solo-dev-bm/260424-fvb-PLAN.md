---
phase: 260424-fvb
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/gomad-skills/4-implementation/bmad-agent-solo-dev/SKILL.md
  - src/gomad-skills/4-implementation/bmad-agent-solo-dev/bmad-skill-manifest.yaml
  - src/gomad-skills/4-implementation/gm-agent-solo-dev/SKILL.md
  - src/gomad-skills/4-implementation/gm-agent-solo-dev/skill-manifest.yaml
autonomous: true
requirements:
  - QUICK-260424-fvb
must_haves:
  truths:
    - "Directory src/gomad-skills/4-implementation/bmad-agent-solo-dev/ no longer exists"
    - "Directory src/gomad-skills/4-implementation/gm-agent-solo-dev/ exists with SKILL.md and skill-manifest.yaml"
    - "New skill's manifest filename is skill-manifest.yaml (no bmad- prefix)"
    - "New skill's name frontmatter is gm-agent-solo-dev in both SKILL.md and skill-manifest.yaml"
    - "New skill's module is gomad (not bmm)"
    - "SKILL.md references gm-quick-dev, gm-code-review, and gm-help (no bmad- references remain)"
    - "Config path in SKILL.md resolves to {project-root}/_gomad/agile/config.yaml"
    - "Persona content (Barry name, role, principles, communication style) is preserved verbatim"
  artifacts:
    - path: "src/gomad-skills/4-implementation/gm-agent-solo-dev/SKILL.md"
      provides: "Barry persona skill entrypoint with gm-* identifiers"
      contains: "name: gm-agent-solo-dev"
    - path: "src/gomad-skills/4-implementation/gm-agent-solo-dev/skill-manifest.yaml"
      provides: "Agent manifest with gm-agent-solo-dev name and gomad module"
      contains: "module: gomad"
  key_links:
    - from: "src/gomad-skills/4-implementation/gm-agent-solo-dev/SKILL.md"
      to: "_gomad/agile/config.yaml"
      via: "On Activation step 1 config path"
      pattern: "_gomad/agile/config.yaml"
    - from: "src/gomad-skills/4-implementation/gm-agent-solo-dev/SKILL.md"
      to: "gm-quick-dev, gm-code-review, gm-help skills"
      via: "Capabilities table + help reminder"
      pattern: "gm-(quick-dev|code-review|help)"
---

<objective>
Rename the untracked `bmad-agent-solo-dev` skill directory to `gm-agent-solo-dev` to join the `gm-agent-*` family, and swap every `bmad-*` identifier inside the skill to the corresponding `gm-*` identifier so it matches the sibling `gm-agent-dev` skill's naming and module conventions.

Purpose: Align the Barry persona skill with the `gm-agent-*` family now that `gm-agent-dev` is the established pattern. Removes the last `bmad-` naming island in this implementation tier.
Output: Renamed directory at `src/gomad-skills/4-implementation/gm-agent-solo-dev/` containing rewritten `SKILL.md` and `skill-manifest.yaml` (note: manifest filename also drops the `bmad-` prefix).
</objective>

<execution_context>
@/Users/rockie/Documents/GitHub/xgent/gomad/.claude/get-shit-done/workflows/execute-plan.md
@/Users/rockie/Documents/GitHub/xgent/gomad/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md

# Source files being renamed/rewritten (read these first):
@src/gomad-skills/4-implementation/bmad-agent-solo-dev/SKILL.md
@src/gomad-skills/4-implementation/bmad-agent-solo-dev/bmad-skill-manifest.yaml

# Sibling skill whose conventions we are mirroring:
@src/gomad-skills/4-implementation/gm-agent-dev/SKILL.md
@src/gomad-skills/4-implementation/gm-agent-dev/skill-manifest.yaml

<identifier_swap_table>
<!-- All and only these substitutions. Do not touch persona content, display name "Barry", role text, or principles. -->

| From (bmad-*)                 | To (gm-*)                     |
|-------------------------------|-------------------------------|
| bmad-agent-solo-dev           | gm-agent-solo-dev             |
| bmad-quick-dev                | gm-quick-dev                  |
| bmad-code-review              | gm-code-review                |
| bmad-help                     | gm-help                       |
| _bmad/bmm/config.yaml         | _gomad/agile/config.yaml      |
| module: bmm                   | module: gomad                 |

Manifest filename also changes: `bmad-skill-manifest.yaml` → `skill-manifest.yaml` (drop the `bmad-` prefix entirely; the sibling uses the unprefixed form).

Directory currently UNTRACKED in git, so a plain `mv` (or delete+write) is sufficient — no `git mv` history preservation required.
</identifier_swap_table>

<preservation_rules>
<!-- Content that MUST remain verbatim. Do NOT rewrite, paraphrase, or restructure. -->
- Display name: "Barry" (everywhere: heading `# Barry`, `displayName: Barry`, and all narrative references).
- Role description: "Elite Full-Stack Developer + Quick Flow Specialist" and the Identity/Overview paragraphs.
- Principles text: "Planning and execution are two sides of the same coin. Specs are for building, not bureaucracy. Code that ships is better than perfect code that doesn't."
- Communication style paragraph.
- Description frontmatter sentence (only the skill `name:` field changes; `description:` text stays the same).
- Capability codes `QD` and `CR` and their Description column text; only the `Skill` column values change (`bmad-quick-dev` → `gm-quick-dev`, `bmad-code-review` → `gm-code-review`).
- Icon `🚀` and title "Quick Flow Solo Dev" in the manifest.
</preservation_rules>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create gm-agent-solo-dev directory with rewritten manifest</name>
  <files>
    src/gomad-skills/4-implementation/gm-agent-solo-dev/skill-manifest.yaml
  </files>
  <action>
  Create the new skill directory at `src/gomad-skills/4-implementation/gm-agent-solo-dev/` and write `skill-manifest.yaml` (note: unprefixed filename, matching sibling `gm-agent-dev/skill-manifest.yaml`).

  Start from the existing `src/gomad-skills/4-implementation/bmad-agent-solo-dev/bmad-skill-manifest.yaml` content and apply ONLY these field changes:
  - `name: bmad-agent-solo-dev` → `name: gm-agent-solo-dev`
  - `module: bmm` → `module: gomad`

  Preserve verbatim (do NOT reword): `type: agent`, `displayName: Barry`, `title: Quick Flow Solo Dev`, `icon: "🚀"`, `capabilities:`, `role:`, `identity:`, `communicationStyle:`, `principles:` — these hold persona content that must stay intact.

  Final file content should be exactly:

  ```yaml
  type: agent
  name: gm-agent-solo-dev
  displayName: Barry
  title: Quick Flow Solo Dev
  icon: "🚀"
  capabilities: "rapid spec creation, lean implementation, minimum ceremony"
  role: Elite Full-Stack Developer + Quick Flow Specialist
  identity: "Barry handles Quick Flow - from tech spec creation through implementation. Minimum ceremony, lean artifacts, ruthless efficiency."
  communicationStyle: "Direct, confident, and implementation-focused. Uses tech slang (e.g., refactor, patch, extract, spike) and gets straight to the point. No fluff, just results. Stays focused on the task at hand."
  principles: "Planning and execution are two sides of the same coin. Specs are for building, not bureaucracy. Code that ships is better than perfect code that doesn't."
  module: gomad
  ```

  Do NOT delete the old `bmad-agent-solo-dev/` directory in this task — Task 2 handles the SKILL.md rewrite and the final directory removal in one pass to keep the swap atomic.
  </action>
  <verify>
    <automated>test -f src/gomad-skills/4-implementation/gm-agent-solo-dev/skill-manifest.yaml && grep -q "^name: gm-agent-solo-dev$" src/gomad-skills/4-implementation/gm-agent-solo-dev/skill-manifest.yaml && grep -q "^module: gomad$" src/gomad-skills/4-implementation/gm-agent-solo-dev/skill-manifest.yaml && grep -q "^displayName: Barry$" src/gomad-skills/4-implementation/gm-agent-solo-dev/skill-manifest.yaml && ! grep -q "bmad" src/gomad-skills/4-implementation/gm-agent-solo-dev/skill-manifest.yaml</automated>
  </verify>
  <done>
  New file `src/gomad-skills/4-implementation/gm-agent-solo-dev/skill-manifest.yaml` exists with `name: gm-agent-solo-dev`, `module: gomad`, `displayName: Barry` preserved, and zero occurrences of the string `bmad` anywhere in the file.
  </done>
</task>

<task type="auto">
  <name>Task 2: Write gm-agent-solo-dev SKILL.md and remove old bmad-agent-solo-dev directory</name>
  <files>
    src/gomad-skills/4-implementation/gm-agent-solo-dev/SKILL.md
    src/gomad-skills/4-implementation/bmad-agent-solo-dev/SKILL.md
    src/gomad-skills/4-implementation/bmad-agent-solo-dev/bmad-skill-manifest.yaml
  </files>
  <action>
  Write `src/gomad-skills/4-implementation/gm-agent-solo-dev/SKILL.md` by copying the existing `bmad-agent-solo-dev/SKILL.md` content and applying ONLY the identifier substitutions from the swap table:

  - Frontmatter: `name: bmad-agent-solo-dev` → `name: gm-agent-solo-dev` (the `description:` line stays byte-for-byte identical).
  - Capabilities table `Skill` column: `bmad-quick-dev` → `gm-quick-dev`, `bmad-code-review` → `gm-code-review`.
  - On Activation step 1 config path: `{project-root}/_bmad/bmm/config.yaml` → `{project-root}/_gomad/agile/config.yaml`.
  - On Activation step 3: `bmad-help` → `gm-help`.

  Preserve VERBATIM (no edits, no rewording, no reformatting):
  - `# Barry` heading and all narrative sections (Overview, Identity, Communication Style, Principles, On Activation steps 2 and 3 prose, CRITICAL Handling note).
  - The persona-embodiment paragraph ("You must fully embody this persona...").
  - Capability codes `QD` and `CR` and their `Description` column text.
  - Both bullet points under Principles.

  After writing the new SKILL.md, verify it exists and is non-empty, then delete the old directory entirely:
  ```
  rm -rf src/gomad-skills/4-implementation/bmad-agent-solo-dev
  ```
  (Plain `rm -rf` is correct here — the old directory is untracked in git, so no `git rm` is needed.)

  Do NOT touch `module-help.csv` or any other registry file — the orchestrator confirmed no CSV entries are needed (sibling `gm-agent-dev` is also absent from that CSV).
  </action>
  <verify>
    <automated>test -f src/gomad-skills/4-implementation/gm-agent-solo-dev/SKILL.md && test ! -d src/gomad-skills/4-implementation/bmad-agent-solo-dev && grep -q "^name: gm-agent-solo-dev$" src/gomad-skills/4-implementation/gm-agent-solo-dev/SKILL.md && grep -q "gm-quick-dev" src/gomad-skills/4-implementation/gm-agent-solo-dev/SKILL.md && grep -q "gm-code-review" src/gomad-skills/4-implementation/gm-agent-solo-dev/SKILL.md && grep -q "gm-help" src/gomad-skills/4-implementation/gm-agent-solo-dev/SKILL.md && grep -q "_gomad/agile/config.yaml" src/gomad-skills/4-implementation/gm-agent-solo-dev/SKILL.md && grep -q "^# Barry$" src/gomad-skills/4-implementation/gm-agent-solo-dev/SKILL.md && ! grep -rq "bmad" src/gomad-skills/4-implementation/gm-agent-solo-dev/</automated>
  </verify>
  <done>
  New `gm-agent-solo-dev/SKILL.md` exists with updated identifiers (gm-agent-solo-dev, gm-quick-dev, gm-code-review, gm-help, `_gomad/agile/config.yaml`). Persona content intact (`# Barry` heading present). Old `bmad-agent-solo-dev/` directory is fully removed. `grep -rq "bmad" src/gomad-skills/4-implementation/gm-agent-solo-dev/` finds zero matches.
  </done>
</task>

</tasks>

<verification>
After both tasks complete, run these checks from repo root:

1. New location populated:
   ```
   ls src/gomad-skills/4-implementation/gm-agent-solo-dev/
   # Expected: SKILL.md  skill-manifest.yaml
   ```
2. Old location gone:
   ```
   test ! -d src/gomad-skills/4-implementation/bmad-agent-solo-dev && echo OK
   ```
3. No residual `bmad` references anywhere in the new skill:
   ```
   grep -r "bmad" src/gomad-skills/4-implementation/gm-agent-solo-dev/
   # Expected: no output
   ```
4. Persona preserved:
   ```
   grep -c "Barry" src/gomad-skills/4-implementation/gm-agent-solo-dev/SKILL.md
   grep -c "Barry" src/gomad-skills/4-implementation/gm-agent-solo-dev/skill-manifest.yaml
   # Expected: both > 0
   ```
5. Sibling-convention parity (filename, module):
   ```
   diff <(ls src/gomad-skills/4-implementation/gm-agent-solo-dev/) <(ls src/gomad-skills/4-implementation/gm-agent-dev/)
   # Expected: no output (same filenames)
   grep "^module:" src/gomad-skills/4-implementation/gm-agent-solo-dev/skill-manifest.yaml
   # Expected: module: gomad
   ```
</verification>

<success_criteria>
- `src/gomad-skills/4-implementation/bmad-agent-solo-dev/` no longer exists.
- `src/gomad-skills/4-implementation/gm-agent-solo-dev/` exists and contains exactly two files: `SKILL.md` and `skill-manifest.yaml` (manifest uses the unprefixed filename, matching `gm-agent-dev/`).
- Zero occurrences of the substring `bmad` remain anywhere inside `gm-agent-solo-dev/`.
- SKILL.md `name:` frontmatter is `gm-agent-solo-dev`; manifest `name:` is `gm-agent-solo-dev`; manifest `module:` is `gomad`.
- Capabilities table references `gm-quick-dev` and `gm-code-review`; activation step 3 references `gm-help`; activation step 1 config path is `{project-root}/_gomad/agile/config.yaml`.
- Persona content — display name "Barry", role, Overview, Identity, Communication Style, Principles, capability descriptions — is byte-identical to the original (only identifiers swapped).
- No changes to `module-help.csv` or any other registry/manifest outside this skill directory.
</success_criteria>

<output>
After completion, create `.planning/quick/260424-fvb-bmad-agent-solo-dev-gm-agent-solo-dev-bm/260424-fvb-01-SUMMARY.md` documenting:
- Files created: `gm-agent-solo-dev/SKILL.md`, `gm-agent-solo-dev/skill-manifest.yaml`
- Files deleted: entire `bmad-agent-solo-dev/` directory
- Identifier swaps applied (reference the table in this plan)
- Confirmation that persona content was preserved verbatim
</output>
