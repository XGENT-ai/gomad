---
name: featured-snippets
description: Format content for featured snippets (position zero) using paragraph, list, and table structures.
license: MIT
last_reviewed: 2026-05-02
---

## Snippet Type Selection

| Query type | Snippet format | Structure to use |
|---|---|---|
| "What is X" / "Define X" | Paragraph | 40–60 word direct definition under question H2 |
| "How to X" / "Steps to X" | Numbered list | `<ol>` with 4–8 items, each ≤15 words |
| "Best X" / "Types of X" | Bullet list | `<ul>` with 5–10 items |
| Comparison queries | Table | 2–4 column table with clear headers |
| "How many" / specific numbers | Paragraph | Answer in first sentence with the number |

Pick one format per target question. Mixing formats in a single answer block confuses the parser.

## Paragraph Snippet Template

Target: 40–60 words. Keyword in first sentence.

```markdown
## What Is Email Deliverability?

Email deliverability is the percentage of sent emails that reach the recipient's inbox
rather than spam or bounces. It depends on sender reputation, authentication protocols
(SPF, DKIM, DMARC), and list hygiene. A deliverability rate above 95% is generally
considered healthy.
```

Do NOT start with "Great question" or restate the question in the answer. Open directly with the answer.

## List Snippet Template

```markdown
## How to Improve Email Deliverability

1. Set up SPF, DKIM, and DMARC records for your sending domain.
2. Remove bounced addresses after every campaign.
3. Warm up new IP addresses over 4–6 weeks.
4. Keep unsubscribe rates below 0.5%.
5. Segment inactive subscribers before mailing them.
```

Each item must be independently useful. Avoid "Step 1: First, you should consider..." — get to the action.

## Table Snippet Template

```markdown
| Protocol | Purpose | Required |
|---|---|---|
| SPF | Authorizes sending IPs | Yes |
| DKIM | Signs email content | Yes |
| DMARC | Policy for failures | Recommended |
```

Tables render as snippets for comparison queries. Keep columns ≤4; more than that usually truncates in the SERP.

## Positioning in the Article

Place the snippet-optimized block early in the relevant section — ideally within the first 2–3 paragraphs under the H2. Google extracts from content near the question header, not buried 800 words in.

## FAQ Schema

Add `FAQPage` schema when the page contains multiple Q&A blocks. Each FAQ item must match the visible content — schema that differs from page content violates Google's guidelines.

```json
{
  "@type": "FAQPage",
  "mainEntity": [{
    "@type": "Question",
    "name": "What is email deliverability?",
    "acceptedAnswer": {
      "@type": "Answer",
      "text": "Email deliverability is the percentage of sent emails that reach the inbox..."
    }
  }]
}
```

## When NOT to Target Featured Snippets

- Transactional queries ("buy email software") — Google shows ads, not snippets
- Brand queries — Knowledge Panel appears instead
- Queries where position 1 is stronger than position 0: clicking through converts better than reading the snippet answer. Check CTR data before over-investing.
- Pages not yet ranking in the top 10 — snippets almost exclusively come from page 1

## Common Failure Modes

- **Answer block too long**: A 200-word "answer" won't be extracted as a snippet. Keep to 60 words for paragraphs.
- **Question not as H2/H3**: Google uses headers as question signals. An answer buried in paragraph text without a question header is invisible to snippet extraction.
- **Table with merged cells or colspan**: Snippet parser doesn't handle complex table structure. Use flat, simple tables only.
- **FAQ schema mismatching visible content**: If the schema says one thing and the page text says another, Google ignores the schema and may apply a manual penalty.
