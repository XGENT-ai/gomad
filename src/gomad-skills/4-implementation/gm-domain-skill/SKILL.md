---
name: gm-domain-skill
argument-hint: "<domain_slug> [query]"
description: 'Use when a coding agent or another skill needs to ground itself in reference material from an installed domain-knowledge-base pack. Takes {domain_slug} and optional {query}; on a strong BM25 match the skill loads the single best-matching .md file into the agent''s working context as authoritative domain guidance and returns only a one-line citation (read-as-skill, not stdout dump). With no query, returns a file listing. Supports typo fallback via Levenshtein "did you mean" suggestions.'
---

Follow the instructions in ./workflow.md.
