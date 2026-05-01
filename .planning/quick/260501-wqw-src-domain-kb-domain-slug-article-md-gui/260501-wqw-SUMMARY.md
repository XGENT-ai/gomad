---
quick_id: 260501-wqw
status: complete
files_modified:
  - src/domain-kb/GUIDELINE.md
commits:
  - 56c66b6
---

# 260501-wqw — Summary

## What was done

Authored `src/domain-kb/GUIDELINE.md` as the single contract document for entries under `src/domain-kb/`. The file:

- Opens with a one-paragraph framing above the first H2.
- Contains all 11 required H2 sections in the prescribed order:
  1. Purpose & Scope
  2. Directory Layout
  3. When to Add a SKILL.md vs a Standalone Article
  4. Slug Rules
  5. Article Frontmatter Schema
  6. Writing the `description` Field
  7. SKILL.md Frontmatter Schema
  8. Style Rules
  9. License & Source Fields
  10. Review Cadence (`last_reviewed`)
  11. Canonical Examples
- Article frontmatter schema lists exactly: `name`, `description`, `source`, `license`, `last_reviewed`.
- SKILL.md frontmatter schema lists exactly: `source`, `license`, `last_reviewed`.
- The "Writing the `description` Field" section quotes the opening sentence of `debugging/tls-handshake-debugging.md` as the canonical example and links back to the file.
- The "Canonical Examples" section links the four required files: `debugging/tls-handshake-debugging.md`, `better-auth/better-auth-best-practices.md`, `testing/SKILL.md`, `architecture/SKILL.md`.

The GUIDELINE.md itself follows the opinionated, concrete style it prescribes: no encyclopedic filler, decision tables for "if X then Y" content, explicit "Do NOT" callouts, and short justifications for each rule.

## Verification

- `test -f src/domain-kb/GUIDELINE.md` → present
- `grep -c '^## ' src/domain-kb/GUIDELINE.md` → `11`
- Pre-commit `markdownlint-cli2` pass on the new file.

## Deviations

None. Plan executed as written.

## Notes

- The pre-commit hook ran the full project test suite. One pre-existing failure (`test-claude-md-install.js`, Case B "new gomad block (template) inserted") surfaced — it is unrelated to this task (the GUIDELINE.md file is not consumed by the CLAUDE.md installer). Out of scope per the executor scope-boundary rule; not fixed.
- Commit: `56c66b6`.
