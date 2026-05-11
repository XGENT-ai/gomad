---
name: content-audit
description: Audit existing content for SEO quality, depth, and E-E-A-T signals to prioritize improvements.
license: MIT
last_reviewed: 2026-05-02
---

# SEO Content Audit

## When to Run a Content Audit

Run an audit when:
- Organic traffic dropped without an obvious technical cause
- A site has accumulated 50+ articles over 2+ years with no systematic review
- Preparing for a site migration or rebrand
- Recovering from a core algorithm update

Do not audit continuously. Quarterly is usually enough for active blogs; annually for stable sites.

## Scoring Dimensions

| Dimension | What to check | Score 1-10 |
|---|---|---|
| Content depth | Covers all subtopics a searcher expects; no major gaps | |
| E-E-A-T signals | Author bio, credentials, citations, trust page links | |
| Readability | Short paragraphs, scannable headers, clear sentences | |
| Keyword optimization | Primary keyword present, not stuffed; semantic terms included | |
| Freshness | Statistics, examples, and dates are current | |
| Structure | Logical H1→H2→H3 hierarchy; intro answers the query quickly | |

Any dimension scoring below 5 is a priority fix. Any page averaging below 5 across dimensions is a candidate for consolidation or deletion.

## What a Content Audit Cannot Determine

- Whether a page is *actually* ranking (requires Search Console data)
- Competitor content quality without fetching and reading it
- Search volume or keyword difficulty (requires a keyword tool)
- User engagement or bounce rate (requires analytics access)

Confusing content quality signals with ranking signals is the most common audit mistake. Audit what you can read; augment with data tools separately.

## Decision Framework

```
Content score ≥ 7 → Keep, monitor
Content score 4-6 → Improve: update stats, add depth, fix structure
Content score < 4 AND low traffic → Delete or consolidate
Content score < 4 AND high traffic → Prioritize rewrite immediately
Duplicate intent with another page → Merge (see keyword-cannibalization.md)
```

## Audit Workflow

1. Export all URLs from sitemap or crawl tool (Screaming Frog, Sitebulb)
2. Pull traffic data from Search Console per URL
3. Score each URL across dimensions above
4. Categorize: Keep / Improve / Merge / Delete
5. Build a prioritized work queue: high-traffic + low-score pages first

## Common Failure Modes

- **Deleting instead of consolidating**: Removing a page with any backlinks wastes link equity. 301 to the consolidation target.
- **Improving pages no one visits**: Start with pages that have impressions but low CTR or declining positions. Fixing zero-traffic pages yields zero return.
- **Ignoring the introduction**: Many audited pages bury the answer 500 words in. Readers and crawlers expect the core answer near the top.
- **Treating word count as depth**: A 3,000-word article with padding is shallower than a 900-word article that covers every angle. Score depth by topic coverage, not length.
