---
name: e-e-a-t
description: Optimize content for E-E-A-T signals (Experience, Expertise, Authority, Trust) in SEO.
license: MIT
last_reviewed: 2026-05-02
---

## When to Apply

E-E-A-T signals matter most for **YMYL (Your Money or Your Life)** topics: health, finance, legal, safety. Google's Quality Rater Guidelines weight these heavily. For non-YMYL content, E-E-A-T still affects quality scores but is rarely the primary ranking lever.

Prioritize E-E-A-T work when:
- Content covers medical, financial, or legal advice
- Pages are losing rankings to sites with clear institutional authority
- Author credentials are absent or generic
- The site has no About page or editorial policy

## Signal Categories

| Layer | What it signals | Concrete implementation |
|---|---|---|
| **Experience** | First-hand exposure to the topic | Case studies, behind-the-scenes, "we tested X" phrasing |
| **Expertise** | Subject-matter depth | Author credentials in bio, industry-specific terminology, cited data |
| **Authority** | External validation | Backlinks from authoritative domains, media mentions, industry recognition |
| **Trust** | Operational transparency | SSL, privacy policy, contact info, editorial guidelines page |

## Author Bio Requirements

A usable author bio contains:
1. Name and title (not generic "Staff Writer")
2. Credentials relevant to the topic (certifications, degrees, years in field)
3. Link to an author page with full profile
4. Previous work or publications

**Do NOT** use a company bio as an author bio. The signal is about the person, not the brand.

## Trust Page Checklist

- `/about` — company history, mission, team
- `/contact` — real email or form, phone number for local business
- `/editorial-policy` — how content is created and fact-checked
- Privacy policy linked in footer
- SSL across all pages

## Topical Authority vs. Page-Level E-E-A-T

Page-level E-E-A-T (author bio, citations) is necessary but not sufficient. Topical authority — deep coverage of a subject area through a cluster of related articles — amplifies individual page signals. A single well-authored article on a thin site ranks below a moderately-authored article on a site with 40 related pages on the same topic.

Build topic clusters before polishing individual E-E-A-T elements.

## Schema to Implement

```json
{
  "@type": "Article",
  "author": {
    "@type": "Person",
    "name": "Jane Smith",
    "jobTitle": "Certified Financial Planner",
    "url": "https://example.com/authors/jane-smith"
  },
  "publisher": {
    "@type": "Organization",
    "name": "Example Co",
    "url": "https://example.com"
  },
  "dateModified": "2026-05-01"
}
```

## When NOT to Apply

- Listicle or entertainment content where expertise is irrelevant
- Product pages — trust signals matter, but E-E-A-T is not the framework; product schema and reviews are
- Building author bios before the topic cluster exists (authority needs surface area)

## Common Failure Modes

- **Generic bios**: "John is a content writer passionate about finance." No credentials, no signal.
- **Trust theater**: Adding badges and seals with no substance behind them. Google's raters verify claims.
- **Skipping the About page**: Raters look for organizational transparency. A missing About page is a hard negative signal.
- **Outdated credentials**: An author bio listing a 2015 certification on a 2026 article looks stale. Keep bios current.
