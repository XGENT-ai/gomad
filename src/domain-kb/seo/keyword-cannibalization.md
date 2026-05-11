---
name: keyword-cannibalization
description: Detect and resolve keyword cannibalization between competing pages on the same site.
license: MIT
last_reviewed: 2026-05-02
---

# Keyword Cannibalization

## What Cannibalization Looks Like

Two or more pages on the same domain compete for the same query. Google alternates which one it ranks, neither reaches its potential, and CTR splits. Signs:

- Google Search Console shows the same keyword sending impressions to multiple URLs
- A page that previously ranked top-5 now oscillates between page 1 and page 2
- Two pages share near-identical H1s or title tags

## Detection

1. Export keywords from Google Search Console → Performance → Pages. Filter by keyword; if multiple URLs appear for the same term, it's a conflict.
2. Use a spreadsheet: one row per keyword, columns for each URL ranking for it. Rows with multiple non-empty cells are cannibalizing.
3. Run `site:yourdomain.com "target keyword"` in Google — multiple results with similar titles confirm the issue.

## Resolution Matrix

| Situation | Resolution |
|---|---|
| Page A ranks, Page B is weaker and similar | 301 Page B → Page A; consolidate content |
| Both pages are strong, different intent | Rewrite to differentiate intent; update metadata |
| Near-duplicate content | Merge into one authoritative page; 301 the rest |
| Same keyword, different funnel stage | Clarify intent signals: informational vs. commercial |
| Accidental overlap from pagination | Add `rel="canonical"` to paginated URLs pointing to root |

## Differentiation Strategy

When consolidation isn't an option, force distinct search intent:

- **Informational**: "What is X", how-to framing, definition-led content
- **Commercial**: "Best X", comparison tables, review framing
- **Transactional**: "Buy X", pricing, CTA-led

Two pages targeting the same keyword but with clearly different intents (and metadata that signals it) will not cannibalize.

## Internal Link Audit

After resolving cannibalization, update internal anchor text. If 10 internal links point to the deprecated URL with the target keyword as anchor text, they dilute the consolidated page. Redirect + update anchors.

## When NOT to Treat as Cannibalization

- **Pagination**: `/category/page/2` competing with `/category/` is expected; use canonical.
- **Hreflang variants**: `/en/` and `/fr/` targeting the same keyword in different languages — that's by design.
- **Brand + non-brand**: `brand name` and `brand name review` targeting the same URL is fine; the intent is different enough.

## Common Failure Modes

- **Redirecting without consolidating content**: The strong page loses content that was ranking. Merge before redirecting.
- **Over-canonicalizing**: Pointing every variation to the root removes legitimate ranking signals from pages that should rank independently.
- **Fixing metadata only**: Changing title tags without fixing content overlap leaves the core conflict intact.
- **Not updating internal links**: After a 301, the authority passes but internal anchor text still points to the old URL — rebuild links to the target.
