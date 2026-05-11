---
name: meta-tags
description: Write optimized title tags, meta descriptions, and URL slugs for CTR and keyword targeting.
license: MIT
last_reviewed: 2026-05-02
---

# SEO Meta Tags

## URL Slugs

- Max 60 characters
- Lowercase, hyphens only — no underscores, no camelCase
- Primary keyword as early as possible: `/email-marketing-best-practices` not `/best-practices-for-email-marketing`
- Remove stop words when it doesn't hurt readability: `/email-marketing-guide` not `/a-guide-to-email-marketing`
- No dates in slugs unless the content is inherently date-bound (event archives)

## Title Tags

Character limit: 50–60 characters. Google truncates beyond ~580px (~60 chars for most fonts).

Formula: `[Primary Keyword] — [Differentiator] | [Brand]`

| Element | Rule |
|---|---|
| Primary keyword | In first 30 characters |
| Differentiator | Year, number, power word: "2025", "7 Ways", "Complete" |
| Brand | End of title, separated by pipe or dash |
| Length | 50–60 characters total |

Examples:
```
Email Marketing Best Practices 2025 | Mailco         (48 chars) ✓
7 Email Subject Lines That Doubled Our Open Rate      (51 chars) ✓
A Comprehensive Guide to Email Marketing for Everyone (54 chars) ✗ — no keyword early, filler phrase
```

## Meta Descriptions

Not a ranking factor, but directly affects CTR. Google often rewrites them — write one anyway because it's used when Google doesn't rewrite.

- 150–160 characters
- Include primary keyword (may be bolded in SERPs)
- Action verb + benefit + CTA pattern
- Do not repeat the title verbatim

```
Learn 7 proven email marketing strategies that increased our client revenue by 40%. Free templates included. Start optimizing today.
```
(134 chars)

## A/B Testing Metadata

Google Search Console shows CTR per query per URL. A baseline is available immediately after publishing. To test:

1. Note current CTR for target keyword
2. Update title or description
3. Check CTR for the same keyword 4 weeks later
4. Keep the higher performer

Do not change both title and description simultaneously — you won't know which element drove the change.

## Power Words and Emotional Triggers

Use sparingly. One per title is enough.

| Category | Examples |
|---|---|
| Curiosity | Secret, Surprising, Little-Known |
| Speed | Quick, Fast, Instant |
| Authority | Expert, Proven, Official |
| Scarcity | Limited, Exclusive |
| Number | Exact digits ("7 Ways") beat vague ("Several Ways") |

## When NOT to Over-Optimize Metadata

- Exact-match keyword in both title AND URL AND meta description looks manipulative — vary phrasing in the description
- Adding the year to evergreen content that won't be refreshed annually — "2025 Guide to HTTP" updated last in 2023 destroys credibility
- Clickbait titles that don't match content: "This One Trick…" → high CTR, high bounce rate, ranking penalty over time

## Common Failure Modes

- **Title truncation**: "The Complete Guide to Email Marketing Strategy for B2B Businesses" is 65 chars — truncated in SERPs and loses the tail.
- **Duplicate titles across pages**: Every page with "Homepage | Brand" offers no keyword signal and cannibalizes brand SERPs.
- **Meta description copied from the first paragraph**: Google already shows paragraph snippets; a description with no CTA adds nothing.
- **Ignoring mobile truncation**: Mobile truncates titles at ~55 characters. Put the differentiating information in the first 50.
