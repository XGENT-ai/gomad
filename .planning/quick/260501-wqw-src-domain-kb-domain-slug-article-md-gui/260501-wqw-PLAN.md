---
quick_id: 260501-wqw
type: execute
wave: 1
depends_on: []
files_modified:
  - src/domain-kb/GUIDELINE.md
autonomous: true
requirements:
  - QK-260501-wqw
must_haves:
  truths:
    - "A contributor (human or agent) can read GUIDELINE.md and author a new src/domain-kb/{domain_slug}/{article}.md without asking clarifying questions."
    - "The guideline distinguishes the article frontmatter schema from the SKILL.md frontmatter schema."
    - "The guideline explains the description field as a retrieval trigger, with concrete length and content rules."
    - "The guideline cites at least one existing article and one existing SKILL.md as canonical examples."
  artifacts:
    - path: "src/domain-kb/GUIDELINE.md"
      provides: "Authoring contract for src/domain-kb/ entries"
      contains: "Frontmatter schema, slug rules, style rules, description writing guidance"
  key_links:
    - from: "src/domain-kb/GUIDELINE.md"
      to: "src/domain-kb/debugging/tls-handshake-debugging.md"
      via: "cited as canonical article example"
    - from: "src/domain-kb/GUIDELINE.md"
      to: "src/domain-kb/testing/SKILL.md"
      via: "cited as canonical SKILL.md example"
---

<objective>
Author `src/domain-kb/GUIDELINE.md` — a single contract document defining how to write articles at `src/domain-kb/{domain_slug}/{article}.md`.

Purpose: Lock in the conventions already practiced in the codebase (testing/, architecture/, better-auth/, debugging/) so future contributors produce consistent, retrieval-friendly knowledge entries.

Output: One markdown file at `src/domain-kb/GUIDELINE.md`.
</objective>

<context>
@CLAUDE.md
@src/domain-kb/testing/SKILL.md
@src/domain-kb/architecture/SKILL.md
@src/domain-kb/debugging/tls-handshake-debugging.md
@src/domain-kb/better-auth/better-auth-best-practices.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Write src/domain-kb/GUIDELINE.md</name>
  <files>src/domain-kb/GUIDELINE.md</files>
  <action>
Create `src/domain-kb/GUIDELINE.md`. The document MUST contain the following sections, in this order, with the H2 headings listed:

1. `## Purpose & Scope` — what `src/domain-kb/` is for (curated, opinionated domain knowledge consumed by humans and agents); what it is NOT (not a wiki, not a dump of upstream docs).

2. `## Directory Layout` — the canonical layout:
   - `src/domain-kb/{domain_slug}/{article}.md` — one article per file
   - Optional `src/domain-kb/{domain_slug}/SKILL.md` — pack overview / index
   - Optional `src/domain-kb/{domain_slug}/examples/` — runnable or reference snippets
   - Optional `src/domain-kb/{domain_slug}/reference/` — supplementary material
   Show as a tree block.

3. `## When to Add a SKILL.md vs a Standalone Article` — decision rule:
   - Single focused topic → standalone article only (e.g. `debugging/tls-handshake-debugging.md`)
   - Domain with multiple articles or a curriculum → add `SKILL.md` as the index/overview (e.g. `testing/SKILL.md`)
   - Flat single-article domains (e.g. `better-auth/`) need neither subdirs nor SKILL.md

4. `## Slug Rules` — for both `{domain_slug}` and `{article}`:
   - Lowercase, ASCII, hyphen-separated (kebab-case)
   - Descriptive nouns/noun-phrases, no dates, no version numbers in the slug itself
   - `{article}` filename should read as the topic, not the verb (e.g. `tls-handshake-debugging.md`, not `how-to-debug-tls.md`)
   - Domain slugs are short (1-3 words): `testing`, `better-auth`, `debugging`

5. `## Article Frontmatter Schema` — table with columns `Field | Required | Type | Rule`:
   - `name` (required, string) — short human-readable title
   - `description` (required, string) — the retrieval trigger; see next section
   - `source` (required, string) — origin or attribution; "original" if authored fresh
   - `license` (required, string) — e.g. `MIT`, `CC-BY-4.0`, or `proprietary`
   - `last_reviewed` (required, ISO date `YYYY-MM-DD`) — date the content was last verified
   Include a YAML example block.

6. `## Writing the `description` Field` — the most important section:
   - It is the retrieval trigger; agents match on it to decide whether to load the article
   - MUST include: specific error strings the article addresses, library/tech names, concrete situations ("when the user reports...")
   - Length: 80-250 words; long enough to disambiguate from sibling articles
   - MUST start with an action verb ("Diagnose...", "Configure...", "Choose between...")
   - Cite the TLS article's description as a canonical example (quote the opening sentence) and link to the file
   - Anti-patterns: vague summaries ("about TLS"), marketing prose, restating the title

7. `## SKILL.md Frontmatter Schema` — lighter variant. Table with `source`, `license`, `last_reviewed` only. No `name` or `description` (the H1 inside the file plays that role). Include a YAML example.

8. `## Style Rules` — bullet list, opinionated:
   - Be opinionated and concrete; state a recommendation, then the tradeoff
   - Use decision tables / probe matrices for "if X then Y" content
   - Use real code in real languages — no pseudocode
   - Include explicit "Do NOT" / "When NOT to apply X" callouts
   - Prefer step-by-step recipes over prose narratives
   - No encyclopedic background — link out for reference material
   - Each article should answer: when to use, how to use, when NOT to use, common failure modes

9. `## License & Source Fields` — guidance:
   - `source: original` for content authored in-repo
   - `source: <url>` or `source: <upstream project>` when adapting external material; include attribution inline if license requires
   - `license` must match the source's license when adapted; default to repo license for original content

10. `## Review Cadence (`last_reviewed`)` — semantics:
    - Update when content is meaningfully verified or revised; not for typo fixes
    - Articles older than 12 months should be flagged for review
    - Format: ISO `YYYY-MM-DD`

11. `## Canonical Examples` — link list:
    - Standalone article: `debugging/tls-handshake-debugging.md`
    - Flat-domain article: `better-auth/better-auth-best-practices.md`
    - Domain with SKILL.md index: `testing/SKILL.md`, `architecture/SKILL.md`

Style of GUIDELINE.md itself: follow the same opinionated style it prescribes. Concrete, surgical, no filler. Open with a one-paragraph summary above the first H2.
  </action>
  <verify>
    <automated>test -f src/domain-kb/GUIDELINE.md && grep -c '^## ' src/domain-kb/GUIDELINE.md | awk '$1 >= 11 {exit 0} {exit 1}'</automated>
  </verify>
  <done>
- `src/domain-kb/GUIDELINE.md` exists
- Contains all 11 H2 sections listed above (verifiable by `grep '^## '`)
- Article frontmatter schema lists exactly: name, description, source, license, last_reviewed
- SKILL.md frontmatter schema lists exactly: source, license, last_reviewed
- The "Writing the description Field" section quotes or links the TLS article as canonical example
- The "Canonical Examples" section links the four files cited above
- File reads as opinionated and concrete (no encyclopedic filler), matching the style it prescribes
  </done>
</task>

</tasks>

<verification>
- File exists at `src/domain-kb/GUIDELINE.md`
- All required H2 sections present
- Frontmatter schemas accurately reflect existing files in `src/domain-kb/`
- Cited example files exist at the referenced paths
</verification>

<success_criteria>
A new contributor reading only `src/domain-kb/GUIDELINE.md` can author a syntactically and stylistically correct `src/domain-kb/{domain_slug}/{article}.md` without inspecting other files in the directory.
</success_criteria>

<output>
After completion, the plan is done — no SUMMARY required for quick mode.
</output>
