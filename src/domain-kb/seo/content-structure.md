---
name: content-structure
description: Structure content headers, internal links, and schema markup for SEO and crawlability.
license: MIT
last_reviewed: 2026-05-02
---

# SEO Content Structure

## Header Hierarchy Rules

- **One H1 per page**, matching the primary keyword and title tag (within a few words)
- H2s for major sections — each should include a secondary keyword or semantic variant
- H3s for subsections under H2s — never skip levels (no H1 → H3 without an H2)
- Don't use bold text as a pseudo-header — it doesn't pass heading signals

Bad hierarchy:
```
H1: Email Marketing Guide
H3: What is Email Marketing  ← skipped H2
H3: Best Practices          ← skipped H2
```

Good hierarchy:
```
H1: Email Marketing Guide
H2: What Is Email Marketing
  H3: Email vs. Other Channels
H2: Email Marketing Best Practices
  H3: Subject Lines
  H3: Send Timing
```

## Internal Linking Strategy

Internal links pass PageRank and signal topical relationship. Rules:

- Link from high-authority pages to new pages needing rank boost
- Use descriptive anchor text: "email deliverability guide" not "click here"
- Vary anchor text across different links to the same page — identical anchor text looks manipulative
- Every new article should receive at least 2–3 internal links from existing content at publication
- Link depth: no important page should be more than 3 clicks from the homepage

## Silo Structure

A content silo groups topically related pages together through internal linking, keeping PageRank within the theme cluster:

```
/email-marketing/ (pillar)
├── /email-marketing/deliverability/
├── /email-marketing/subject-lines/
└── /email-marketing/segmentation/
```

Cross-silo links are fine but should be deliberate — only when the content is genuinely relevant, not as a PR-spreading tactic.

## Schema Markup Priority

| Schema type | Use when | Impact |
|---|---|---|
| `Article` / `BlogPosting` | Any editorial content | Medium — improves rich result eligibility |
| `FAQPage` | Page contains Q&A blocks | High — can expand SERP footprint |
| `HowTo` | Step-by-step instructions | High — can show steps directly in SERP |
| `BreadcrumbList` | Site has nested URL structure | Medium — shows breadcrumbs in SERP |
| `Organization` | Homepage or About page | Medium — supports Knowledge Panel |
| `Product` / `Review` | Product pages with ratings | High — enables star ratings in SERP |

Implement via JSON-LD in `<head>`. Do not use Microdata — JSON-LD is Google's preferred format.

```json
{
  "@context": "https://schema.org",
  "@type": "HowTo",
  "name": "How to Set Up DKIM",
  "step": [
    {
      "@type": "HowToStep",
      "name": "Generate DKIM keys",
      "text": "Use your email provider's control panel to generate a 2048-bit DKIM key pair."
    },
    {
      "@type": "HowToStep",
      "name": "Add DNS TXT record",
      "text": "Add the public key as a TXT record at selector._domainkey.yourdomain.com."
    }
  ]
}
```

## Table of Contents

Add a linked TOC for pages over 2,000 words. Use jump links (`#anchor-id`). Benefits:
- Reduces bounce rate by letting readers navigate to relevant sections
- Jump links appear as site links in Google SERPs for high-authority pages
- Provides additional keyword signals through anchor text

## When NOT to Add Schema

- Schema for content type that doesn't match the page (e.g., `HowTo` on an opinion piece)
- Schema with data that contradicts the visible page content — Google penalizes this
- Adding all schema types to one page — choose the most specific applicable type

## Common Failure Modes

- **Multiple H1s**: CMS themes often inject the site name as H1 and the post title as another H1. Audit template output.
- **Orphan pages**: Articles published without any internal links from existing content. They may never be crawled or indexed.
- **Anchor text over-optimization**: Every internal link to a page using exact-match anchor text looks manipulative. Vary it.
- **Schema without visible data**: Using `AggregateRating` schema without visible star ratings on the page. Google ignores it and may flag it as spam.
