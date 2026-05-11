---
name: keyword-strategy
description: Optimize keyword density, LSI terms, and entity usage in SEO content to avoid over-optimization.
license: MIT
last_reviewed: 2026-05-02
---

# SEO Keyword Strategy

## Density Guidelines

| Keyword type | Target density | Placement |
|---|---|---|
| Primary keyword | 0.5–1.5% | H1, first 100 words, ≥1 H2, conclusion |
| Secondary keywords | 1–3 mentions total | H2s, body paragraphs |
| LSI / semantic terms | Naturally distributed | Body, H3s, image alt text |

Over-optimization threshold: primary keyword appearing more than 2% of total word count, or exact-phrase repetition in consecutive paragraphs. Both trigger Google's spam filters.

## LSI Keyword Generation

LSI (Latent Semantic Indexing) keywords are co-occurring terms that tell Google what a page is actually about. For "email marketing":

- Tool approach: Google the primary keyword → scroll to "Related searches" and "People Also Ask" → these are natural semantic terms
- Manual approach: Write naturally about the topic; LSI terms emerge organically
- Programmatic: Use a keyword tool (Ahrefs, Semrush) and look at "also rank for" on top-ranked competitors

Add LSI terms where they naturally belong. Do NOT create separate sentences just to include them — that's stuffing by another name.

## Entity Analysis

Entities are named concepts Google's Knowledge Graph recognizes: people, places, organizations, products, and topics. Using named entities improves topical relevance.

For a page about "email deliverability":
- Named entities: SPF, DKIM, DMARC, Mailchimp, Postfix, Gmail
- Related concepts: bounce rate, spam filters, sender reputation, IP warming

Include entities in headers and body naturally. Do not force every entity onto one page — distribute across the cluster.

## Question-Based Keywords (PAA)

"People Also Ask" queries use question phrasing. Target them with:
- H2 or H3 that exactly matches the question ("What is SPF in email?")
- Answer in the first 60 words under that header
- FAQ schema on the page

## Over-Optimization Detection

Signs you've crossed the line:
- Primary keyword appears in every paragraph
- Multiple H2s contain the exact-match keyword
- Meta title repeats the keyword twice
- Anchor text for internal links always uses the exact keyword

Fix: replace exact-match repetitions with semantic variants. "Email marketing" → "email campaigns", "newsletter strategy", "email automation".

## When NOT to Focus on Keyword Density

- Opinion pieces and editorials: tone and argumentation matter more
- News articles: freshness and factual accuracy override density optimization
- Very short content (< 300 words): density optimization has no meaningful effect at this length

## Common Failure Modes

- **Synonym stuffing**: Replacing the primary keyword with dozens of synonyms across the same paragraph. Google understands synonyms; this looks as unnatural as exact stuffing.
- **Keyword in every image alt text**: One relevant alt text is a signal; five consecutive images with the same keyword phrase is spam.
- **Ignoring search intent for keyword selection**: Optimizing for "buy email software" on an informational how-to guide. The keyword-content intent mismatch causes ranking failure regardless of density.
- **Treating LSI as a checklist**: Jamming 30 "LSI keywords" into a page without considering whether they're contextually accurate. Topical relevance > keyword checklist completeness.
