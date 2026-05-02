---
license: MIT
last_reviewed: 2026-05-01
---

# `src/domain-kb/` Authoring Contract

This document defines how to write entries under `src/domain-kb/`. Read it once and you should be able to author a new article without looking at any other file. The conventions here are not aspirational — they describe what every existing article in this directory already does. New entries that diverge will be rejected in review.

## Purpose & Scope

`src/domain-kb/` is curated, opinionated domain knowledge consumed by both humans and coding agents. Each article exists because someone hit a real problem, paid for the answer, and wrote down the parts that generalize.

It is NOT:

- A skill. Skills are problem-solving capabilities that bundle workflows, scripts, and conventions for an agent to load and run. They live in skill-specific directories elsewhere in the repo. Articles here are reference material only — pure markdown, no side effects. See [kb vs Skill](#kb-vs-skill) for the boundary.
- A wiki. There is no obligation to cover a topic comprehensively.
- A dump of upstream documentation. Link out to canonical docs; don't restate them.
- A tutorial collection. Articles assume the reader is mid-task and needs a decision, not an introduction.
- A scratchpad. Drafts go in PRs, not here.

The retrieval model is: an agent loads an article when its `description` matches the situation. If your article has nothing concrete enough to match against, it does not belong here.

## kb vs Skill

Skills and kb articles often sound similar in casual conversation but they're different artifacts. Mixing them is the most common authoring mistake. Here's the boundary:

| Aspect | KB article (here) | Skill (elsewhere in the repo) |
|---|---|---|
| Goal | Transfer know-how — best practices, samples, anti-patterns, recipes | Solve a problem end-to-end for an agent |
| Form | Markdown only. One file. | A bundle: SKILL.md + supporting workflows, scripts, fixtures |
| Style | Opinionated reference: "if X, do Y; here's why" | Procedural: "load me, take these inputs, run these steps" |
| Flexibility | Static. Same content for every reader. | Adapts to context. Takes args; branches on situation. |
| Side effects | None. Reading an article changes nothing. | Often. Skills may run scripts, edit files, hit APIs. |
| Reader's mode | Learning or deciding | Doing |

Decision rule:

- **Writing know-how, best practices, samples, or anti-patterns?** → kb article. Right place.
- **Writing something an agent will load, parameterize, and run procedurally?** → skill. Wrong place; this guideline does not cover it.
- **Have a procedure that's pure prose with no inputs and no side effects?** → kb article. Even if it reads like a recipe, if there's no executable side and no parameterization, it's reference material.
- **Have static knowledge that you want bundled with helper scripts?** → split it. The knowledge half lives here as a kb article; the script half lives in the appropriate skill directory.

When in doubt: "Could the reader use this without running anything?" If yes, it's a kb article. If no, it's a skill.

## Directory Layout

```
src/domain-kb/
├── GUIDELINE.md                              # this file
├── {domain_slug}/
│   └── {article}.md                          # one article per file
└── ...
```

Rules:

- Every leaf knowledge unit is a single `.md` file. No multi-file articles.
- Don't nest domains. `src/domain-kb/{domain_slug}/` is the only level of grouping.
- A domain dir holds one or more articles. Nothing else — no index files, no `examples/` subdirs, no `reference/` subdirs. Each article must stand alone.

## Slug Rules

Both `{domain_slug}` and `{article}` filenames follow the same rules:

- Lowercase ASCII, hyphen-separated (kebab-case). No underscores, no camelCase.
- Descriptive nouns or noun-phrases. The slug describes the topic, not the reader's verb.
- No dates. No version numbers. (`react-19-hooks` is wrong; `react-hooks` is right. Version-specific notes go in the body.)
- `{article}` reads as the topic, not the action: `tls-handshake-debugging.md`, not `how-to-debug-tls.md`.
- `{domain_slug}` is short — 1 to 3 words. Examples in this repo: `debugging`, `better-auth`.
- Do NOT use the slug to encode hierarchy (`debugging-tls-handshake.md` in a flat dir). Put it in a `debugging/` domain instead.

## Article Frontmatter Schema

Every `{article}.md` MUST open with YAML frontmatter containing exactly these four fields:

| Field | Required | Type | Rule |
|---|---|---|---|
| `name` | yes | string | Short human-readable title. Usually matches the filename slug. |
| `description` | yes | string | One-line retrieval trigger. **Max 100 characters.** See [Writing the `description` Field](#writing-the-description-field). |
| `license` | yes | string | SPDX identifier (`MIT`, `Apache-2.0`, `CC-BY-4.0`) or `proprietary`. |
| `last_reviewed` | yes | ISO date `YYYY-MM-DD` | Date the content was last verified against reality. |

No extra fields. No `tags`, no `author`, no `source`, no `version`. If you think you need one, raise it in review first.

Example:

```yaml
---
name: tls-handshake-debugging
description: Diagnose TLS handshake failures in Rust gRPC/HTTP clients.
license: MIT
last_reviewed: 2026-04-25
---
```

## Writing the `description` Field

The `description` is the retrieval index entry — an agent decides whether to load your file based on this string alone. Keep it tight: **max 100 characters**, single line.

Formula: `<action verb> <topic> in <tech/context>.`

Examples:

```
Diagnose TLS handshake failures in Rust gRPC/HTTP clients.
Configure structured logging in Go with slog.
Choose between Zod and Valibot for TypeScript runtime validation.
```

Rules:

- **Start with an action verb.** `Diagnose`, `Configure`, `Choose between`, `Write`. Not `About`, not `Notes on`.
- **Name the tech stack** — library, language, framework. Be specific enough to distinguish from sibling articles.
- **No "Use this when…" — that belongs in the article body** (a "When to use" section or opening paragraph).
- **No marketing prose.** "A comprehensive guide…" is not a trigger.
- **Don't restate the filename.** Zero new information.

Detailed context (exact error strings, library lists, trigger phrases) goes in the article body, not here.

## Style Rules

These apply to article bodies. They are non-negotiable; existing articles already follow them.

- **Be opinionated and concrete.** State a recommendation, then state the tradeoff. "Use Postgres. The cost: another moving part in dev setup."
- **Use decision tables and probe matrices** for "if X then Y" content. Prose loses to a table every time.
- **Real code in real languages.** No pseudocode. No `// ...do the thing...`. If you can't write it, you don't understand it well enough to publish.
- **Explicit "Do NOT" / "When NOT to apply X" callouts.** An article that only describes the happy path is incomplete.
- **Step-by-step recipes over prose narratives.** Numbered steps beat paragraphs when the reader is mid-task.
- **No encyclopedic background.** Link out for reference material — Wikipedia, RFCs, upstream docs. Don't paraphrase them.
- **Each article answers four questions:** when to use, how to use, when NOT to use, and common failure modes. If yours skips one, it isn't done.
- **No filler.** Cut the introduction. Cut the conclusion. The first H2 should answer the question the title implies.

## License Field

- Default to the repo's license (`MIT` across existing articles). Use SPDX identifiers only.
- If adapting content from an upstream source, set `license` to match and include attribution inline in the body.
- Do not invent license strings.

## Review Cadence (`last_reviewed`)

`last_reviewed` is a freshness signal, not a changelog.

- Update it when you **meaningfully verify or revise** the content — re-ran the recipe, confirmed the API still works, corrected a claim.
- Do NOT update it for typo fixes, formatting changes, or link tidying.
- Articles older than **12 months** should be flagged for review. An article that hasn't been touched in 18 months and still has a 12-month-old `last_reviewed` is a candidate for removal, not just refresh.
- Format strictly ISO `YYYY-MM-DD`. No locale variants.

## Canonical Examples

Use these as templates when starting a new entry:

- **Single-article domain:** [`debugging/tls-handshake-debugging.md`](debugging/tls-handshake-debugging.md) — gold-standard `description` field, probe-matrix layout, opinionated body.
- **Multi-article flat domain:** [`better-auth/`](better-auth/) — several sibling articles in one domain dir; each one self-contained, no shared index.
