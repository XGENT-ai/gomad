---
phase: 260430-kod
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/gomad-skills/4-implementation/gm-domain-skill/SKILL.md
  - CLAUDE.md
autonomous: true
requirements:
  - QUICK-260430-kod-01
  - QUICK-260430-kod-02

must_haves:
  truths:
    - "gm-domain-skill SKILL.md frontmatter declares an argument-hint that matches the skill's documented inputs ({domain_slug} required, {query} optional)."
    - "Project root contains a CLAUDE.md file with the behavioral guidelines block wrapped in <!-- gomad:start --> / <!-- gomad:end --> fence markers, enabling future wholesale replacement."
  artifacts:
    - path: "src/gomad-skills/4-implementation/gm-domain-skill/SKILL.md"
      provides: "Skill frontmatter with name, description, and argument-hint"
      contains: 'argument-hint: "<domain_slug> [query]"'
    - path: "CLAUDE.md"
      provides: "Behavioral guidelines block at project root, fenced for future replacement"
      contains: "<!-- gomad:start -->"
  key_links:
    - from: "CLAUDE.md"
      to: "fence markers"
      via: "HTML comment delimiters wrapping the entire block including the H1"
      pattern: "<!-- gomad:start -->[\\s\\S]+# CLAUDE\\.md[\\s\\S]+<!-- gomad:end -->"
    - from: "SKILL.md frontmatter"
      to: "documented inputs in workflow.md"
      via: "argument-hint field syntax (angle = required, square = optional)"
      pattern: "argument-hint:\\s*\"<domain_slug> \\[query\\]\""
---

<objective>
Apply two surgical edits requested for v1.3.1:

1. Add an `argument-hint` field to the gm-domain-skill SKILL.md frontmatter so its inputs are declared in the same convention used by GSD slash commands.
2. Create a project-root CLAUDE.md containing the agreed behavioral-guidelines block, wrapped in HTML-comment fence markers so the block can be replaced wholesale in future versions.

Purpose: Make the skill's input contract self-describing in its frontmatter, and seed a versioned, replaceable behavioral-guidelines block at the project root.

Output:
- Modified `src/gomad-skills/4-implementation/gm-domain-skill/SKILL.md` (one new frontmatter field).
- New `CLAUDE.md` at project root containing the verbatim block inside `<!-- gomad:start -->` / `<!-- gomad:end -->` fences.
</objective>

<execution_context>
@/Users/rockie/Documents/GitHub/xgent/gomad/.claude/get-shit-done/workflows/execute-plan.md
@/Users/rockie/Documents/GitHub/xgent/gomad/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@src/gomad-skills/4-implementation/gm-domain-skill/SKILL.md
@src/gomad-skills/4-implementation/gm-domain-skill/workflow.md
@.claude/commands/gsd/quick.md

<interfaces>
<!-- Existing SKILL.md frontmatter (target of Task 1). The executor adds ONE field; do not modify name/description. -->

Current `src/gomad-skills/4-implementation/gm-domain-skill/SKILL.md` frontmatter:
```yaml
---
name: gm-domain-skill
description: 'Use when a coding agent or another skill needs to ground itself in reference material from an installed domain-knowledge-base pack. Takes {domain_slug} and optional {query}; on a strong BM25 match the skill loads the single best-matching .md file into the agent''s working context as authoritative domain guidance and returns only a one-line citation (read-as-skill, not stdout dump). With no query, returns a file listing. Supports typo fallback via Levenshtein "did you mean" suggestions.'
---
```

Reference convention (from `.claude/commands/gsd/quick.md` line 4):
```yaml
argument-hint: "[list | status <slug> | resume <slug> | --full] [--validate] [--discuss] [--research] [task description]"
```
Angle brackets `<...>` denote required positional args; square brackets `[...]` denote optional args.
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add argument-hint to gm-domain-skill SKILL.md frontmatter</name>
  <files>src/gomad-skills/4-implementation/gm-domain-skill/SKILL.md</files>
  <action>
Edit `src/gomad-skills/4-implementation/gm-domain-skill/SKILL.md` and insert a new frontmatter field `argument-hint` between `name:` and `description:`. Use this EXACT line (locked decision — do not paraphrase):

```
argument-hint: "<domain_slug> [query]"
```

After the edit, the frontmatter MUST read in this order:
1. `name: gm-domain-skill`
2. `argument-hint: "<domain_slug> [query]"`
3. `description: '...'` (unchanged — preserve the existing single-quoted description verbatim, including its embedded escaped apostrophes)

Do NOT modify `name`, `description`, or the `Follow the instructions in ./workflow.md.` body line. This is a surgical, single-line insertion. Use the Edit tool, not Write — the rest of the file must be byte-identical to its current contents.

Rationale (per source artifact and decision lock-in): the skill's inputs per workflow.md and the SKILL.md description are `{domain_slug}` (required) and `{query}` (optional, empty triggers catalog-listing mode). The angle/square-bracket convention matches `.claude/commands/gsd/quick.md` line 4.
  </action>
  <verify>
    <automated>grep -n '^argument-hint: "&lt;domain_slug&gt; \[query\]"$' src/gomad-skills/4-implementation/gm-domain-skill/SKILL.md &amp;&amp; grep -c '^name: gm-domain-skill$' src/gomad-skills/4-implementation/gm-domain-skill/SKILL.md | grep -q '^1$' &amp;&amp; grep -c "^description: 'Use when a coding agent" src/gomad-skills/4-implementation/gm-domain-skill/SKILL.md | grep -q '^1$'</automated>
  </verify>
  <done>
    SKILL.md frontmatter contains exactly three fields (name, argument-hint, description) in that order. The argument-hint line is `argument-hint: "<domain_slug> [query]"` verbatim. The description field and body are unchanged.
  </done>
</task>

<task type="auto">
  <name>Task 2: Create project-root CLAUDE.md with fenced behavioral-guidelines block</name>
  <files>CLAUDE.md</files>
  <action>
Create a NEW file at the project root: `/Users/rockie/Documents/GitHub/xgent/gomad/CLAUDE.md`. The file MUST NOT exist beforehand (verified during planning). Use the Write tool.

The file's contents are EXACTLY the following (locked — do not alter wording, headings, fence-marker syntax, blank lines, or code-fence contents). The fence wraps the ENTIRE block including the `# CLAUDE.md` H1:

```
&lt;!-- gomad:start --&gt;
# CLAUDE.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.
&lt;!-- gomad:end --&gt;
```

Notes for the executor:
- The opening fence marker `<!-- gomad:start -->` is the FIRST line of the file. There is NO leading blank line, NO YAML frontmatter, NO BOM.
- The closing fence marker `<!-- gomad:end -->` is the LAST line of the file. End the file with a single trailing newline.
- The block contains an inner triple-backtick code fence around the numbered plan template (`1. [Step] → verify: [check]` …). Preserve those backticks exactly — they are part of the verbatim block.
- Use Unicode arrow `→` (U+2192), not `->`, in the "Goal-Driven Execution" section. The source block uses Unicode arrows.
- Do not add any project-specific content, links, or commentary. The block is verbatim.
  </action>
  <verify>
    <automated>test -f CLAUDE.md &amp;&amp; head -1 CLAUDE.md | grep -qx '&lt;!-- gomad:start --&gt;' &amp;&amp; tail -1 CLAUDE.md | grep -qx '&lt;!-- gomad:end --&gt;' &amp;&amp; grep -c '^# CLAUDE\.md$' CLAUDE.md | grep -q '^1$' &amp;&amp; grep -q '## 1\. Think Before Coding' CLAUDE.md &amp;&amp; grep -q '## 2\. Simplicity First' CLAUDE.md &amp;&amp; grep -q '## 3\. Surgical Changes' CLAUDE.md &amp;&amp; grep -q '## 4\. Goal-Driven Execution' CLAUDE.md &amp;&amp; grep -q '→ verify: \[check\]' CLAUDE.md</automated>
  </verify>
  <done>
    `CLAUDE.md` exists at the project root. First line is `<!-- gomad:start -->`, last line is `<!-- gomad:end -->`, the H1 `# CLAUDE.md` appears exactly once inside the fence, all four numbered sections are present, and Unicode arrows (`→`) are preserved in section 4.
  </done>
</task>

</tasks>

<verification>
- `grep -n '^argument-hint:' src/gomad-skills/4-implementation/gm-domain-skill/SKILL.md` returns the locked line.
- `head -1 CLAUDE.md` and `tail -1 CLAUDE.md` return the opening and closing fence markers respectively.
- `git diff --stat` shows exactly two paths touched: `src/gomad-skills/4-implementation/gm-domain-skill/SKILL.md` (modified) and `CLAUDE.md` (added).
</verification>

<success_criteria>
1. gm-domain-skill SKILL.md frontmatter declares `argument-hint: "<domain_slug> [query]"` (Task 1 verify passes).
2. Project-root `CLAUDE.md` exists, fenced by `<!-- gomad:start -->` / `<!-- gomad:end -->`, with the verbatim block inside (Task 2 verify passes).
3. No other files modified. No content paraphrased or reformatted.
</success_criteria>

<output>
After completion, create `.planning/quick/260430-kod-1-3-1-add-argument-hint-to-gm-domain-ski/260430-kod-SUMMARY.md`.
</output>
