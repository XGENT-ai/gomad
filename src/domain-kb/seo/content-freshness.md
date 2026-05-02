---
name: content-freshness
description: Refresh existing content to maintain SEO freshness signals and prevent ranking decay over time.
license: MIT
last_reviewed: 2026-05-02
---

## When Freshness Matters

Google's QDF (Query Deserves Freshness) algorithm boosts recent content for:
- Breaking news and current events
- Queries containing "2025", "now", "latest", "current"
- Rapidly changing industries (AI, crypto, regulations)

For evergreen content, freshness is less a ranking boost than a decay prevention mechanism. Content that was accurate 3 years ago starts losing ground to recently-published competitors.

## Refresh Priority Matrix

| Signal | Priority |
|---|---|
| Page dropped 3+ positions in last 90 days | High |
| Page contains statistics older than 2 years | High |
| Year in title tag is last year or earlier | High |
| Competitors recently published updated versions | High |
| Page is stagnant but not declining | Medium |
| Page contains examples from 3+ years ago | Medium |
| Page is declining but low-traffic | Low |

## What to Update

**High-impact:**
- Statistics and data points — replace with current studies; cite the year
- Year references in the title tag and meta description
- Outdated tool or software references (deprecated APIs, sunset products)
- Legal or regulatory information that has changed

**Medium-impact:**
- Case studies and examples — add recent ones even if keeping older ones
- Internal links — add links to recently published related articles
- FAQ content — add questions that emerged since publication
- Screenshots or UI examples — UIs change; outdated screenshots undercut trust

**Not worth doing alone:**
- Changing publish date without meaningful content updates — Google can detect thin freshness signals
- Typo fixes and minor grammar edits — these do not constitute a meaningful update

## Freshness Signals Google Uses

1. `dateModified` in Article schema (most reliable)
2. Last-modified HTTP header
3. Dates visible in content (paragraph text, statistics years)
4. New internal links pointing to the page (signals editorial awareness)
5. Updated sitemaps with recent `<lastmod>`

Implement all five for maximum signal clarity.

```json
{
  "@type": "Article",
  "datePublished": "2023-03-15",
  "dateModified": "2026-05-01"
}
```

## When NOT to Refresh

- Content with zero search impressions: refreshing doesn't help if no one is finding it. Diagnose the indexing issue first.
- Content that needs a fundamental rewrite: a patch refresh on structurally weak content wastes effort. Audit first (see `content-audit.md`), decide if the page should be rebuilt or removed.
- Stable reference content: RFCs, historical records, and definitions of stable concepts don't need freshness signals — adding a year to a timeless topic looks artificial.

## Common Failure Modes

- **Date-only updates**: Changing "2023" to "2025" in the title without updating content. This is detectable and reflects badly on the site's credibility.
- **Updating low-traffic pages first**: A 2% traffic page refreshed instead of a 40% traffic page declining — wrong prioritization.
- **Missing schema update**: Content updated but `dateModified` in schema not changed — the freshness signal doesn't propagate.
- **Removing historical data**: Deleting older statistics instead of supplementing them with newer ones. Showing data trend over time is more valuable than a single current figure.
