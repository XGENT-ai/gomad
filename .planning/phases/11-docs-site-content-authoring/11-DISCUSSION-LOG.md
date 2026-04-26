# Phase 11: Docs Site Content Authoring - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-26
**Phase:** 11-docs-site-content-authoring
**Areas discussed:** Inherited BMAD content disposition, Reference auto-gen vs hand-author, Path examples v1.2 vs v1.3, zh-cn translation strategy

---

## Inherited BMAD content disposition

### Q1: What should happen to existing BMAD-era pages in docs/{tutorials,how-to,reference,explanation}/?

| Option | Description | Selected |
|--------|-------------|----------|
| Delete all stale, author 6 fresh (Recommended) | Remove ~25 inherited pages in one cleanup commit, then author 6 new EN pages in clean directories. | ✓ |
| Archive to docs/_archive/, author 6 fresh | Move inherited pages to docs/_archive/ (excluded from build). Preserves prose for salvage. | |
| Leave alongside, only add 6 new pages | Inherited pages stay live. Smallest diff but ships a confusing site. | |
| Rewrite-in-place where overlap exists | Edit existing pages into new gm-agent-* form; delete only orphans. | |

**User's choice:** Delete all stale, author 6 fresh

### Q2: What about docs/zh-cn/ — same disposition as EN, or different?

| Option | Description | Selected |
|--------|-------------|----------|
| Same as EN (delete or archive in lockstep) (Recommended) | Mirror EN decision for zh-cn; keeps locales structurally aligned. | ✓ |
| Delete zh-cn entirely now, recreate when authoring DOCS-06 | Wipe docs/zh-cn/ completely; recreate in DOCS-06 plan. | |
| Leave zh-cn as-is, only add 6 zh-cn pages later | Treat zh-cn parallel; ignore inherited zh-cn pages. | |

**User's choice:** Same as EN (delete or archive in lockstep)

### Q3: Two edge cases — docs/index.md (homepage) and docs/roadmap.mdx (BMAD roadmap). Same delete-and-rewrite, or treat differently?

| Option | Description | Selected |
|--------|-------------|----------|
| Rewrite both as part of Phase 11 (Recommended) | index.md becomes gomad landing; roadmap.mdx rewritten or deleted. Phase 11 owns the homepage. | ✓ |
| Rewrite index.md only; delete roadmap.mdx | Homepage in scope; roadmap deferred or removed. | |
| Leave both untouched | Strict spec reading; risks shipping a homepage that references BMAD personas. | |
| Rewrite index.md; leave roadmap.mdx as-is | Homepage gets fresh content; roadmap stays as BMAD historical artifact. | |

**User's choice:** Rewrite both as part of Phase 11

### Q4: Cleanup ordering vs new-content authoring — single phase or two stages?

| Option | Description | Selected |
|--------|-------------|----------|
| Cleanup first, then author 6 pages (Recommended) | One or two cleanup plans, then 6 authoring plans. Each cleanup commit reversible. | ✓ |
| Author each page and delete its predecessor in the same plan | Tightly couples cleanup to authoring; harder to land partial Phase 11. | |
| Author all 6 first, then sweep deletes at the end | Risks shipping mid-phase with both old and new visible. | |

**User's choice:** Cleanup first, then author 6 pages

---

## Reference pages: auto-gen vs hand-author

### Q1: /reference/agents and /reference/skills source-of-truth posture — how do we keep them aligned with src/gomad-skills/ as it evolves?

| Option | Description | Selected |
|--------|-------------|----------|
| Hand-author + coverage validator (Recommended) | Author by hand; add tools/validate-doc-coverage.js diff check on npm run quality. | |
| Auto-generate from SKILL.md frontmatter at build | Build script reads SKILL.md frontmatter and emits tables before Astro build. Always accurate. | |
| Hand-author + accept drift | Just write once, fix when noticed. | |
| Hybrid: auto-gen tables + hand-author narrative | Build regenerates tables in marked HTML comment blocks; hand-authored prose stays. | ✓ |

**User's choice:** Hybrid: auto-gen tables + hand-author narrative
**Notes:** Diverged from recommendation — user prioritized structural accuracy over coverage policing.

### Q2: Skills reference grouping — how should /reference/skills present 27 skills across 4 phases + core?

| Option | Description | Selected |
|--------|-------------|----------|
| Grouped by 4-phase workflow + Core (Recommended) | Top-level sections mirror src/gomad-skills/ structure. Spec literally says "grouped by workflow layer". | ✓ |
| Grouped by agent ownership | Group by which gm-agent-* invokes the skill. | |
| Single alphabetical list with type column | Flat table of all 27 skills. | |

**User's choice:** Grouped by 4-phase workflow + Core

### Q3: Where exactly does the build script inject regenerated content into the .md page?

| Option | Description | Selected |
|--------|-------------|----------|
| HTML comment markers in the .md file (Recommended) | <!-- AUTO:agents-table-start --> ... <!-- AUTO:agents-table-end -->. Standard pattern. | ✓ |
| Starlight component import (e.g., <AgentsTable />) | Astro component reads frontmatter at build. More idiomatic; harder for LLM-flat output. | |
| Separate generated .md include | Build emits docs/reference/_generated/agents-table.md; MDX include. | |

**User's choice:** HTML comment markers in the .md file

### Q4: What columns / fields should the auto-gen agent table contain?

| Option | Description | Selected |
|--------|-------------|----------|
| Persona name + Slash command + Purpose (Recommended) | 3 columns; minimal, scannable, matches DOCS-02 spec. | |
| Add Phase column (Analysis/Planning/Solutioning/Implementation) | 4-column table; useful for "who do I talk to in planning?" | ✓ |
| Add Primary skills column | Lists 3-5 representative skills the persona invokes. | |

**User's choice:** Add Phase column (Analysis/Planning/Solutioning/Implementation)

---

## Path examples: v1.2 vs v1.3 layout

### Q1: How should Phase 11 docs reference install paths and other v1.2-vs-v1.3 surfaces?

| Option | Description | Selected |
|--------|-------------|----------|
| v1.3 paths now; CI-deploy gated until v1.3 ships (Recommended) | Author with v1.3 paths everywhere; gate deploy. Phase 12 just runs DOCS-07 validator. | ✓ |
| v1.2 paths now; sweep in Phase 12 via DOCS-07 | Author with current shipped paths; flip in Phase 12. Doubles edit work. | |
| Symbolic refs (e.g., <installRoot>/<agentsDir>/) | Build-time substitution; needs new tooling. | |
| v1.3 paths + admonition note '(v1.3+)' | v1.3 paths with per-page :::note callout. Some visual clutter. | |

**User's choice:** v1.3 paths now; CI-deploy gated until v1.3 ships

### Q2: When Phase 12 ships, who validates Phase 11 docs are clean?

| Option | Description | Selected |
|--------|-------------|----------|
| DOCS-07's validator (already in Phase 12 spec) (Recommended) | tools/validate-doc-paths.js fails npm run quality on legacy path leaks. Single source of truth in Phase 12. | ✓ |
| Add validator to Phase 11 scope | Pull validator forward; decouples Phase 11 from Phase 12. Minor scope creep. | |
| No validator, manual review | Trust authors; one missed grep ships wrong tutorial. | |

**User's choice:** DOCS-07's validator (already in Phase 12 spec)

### Q3: Deploy gating mechanism — docs.yaml currently triggers on push to main. How do we hold deploy until Phase 12 ships v1.3?

| Option | Description | Selected |
|--------|-------------|----------|
| Author on a feature branch, defer merge until v1.3 (Recommended) | Land on docs/v13-content branch; merge after Phase 12 npm publish. | ✓ |
| Land on main but disable docs.yaml temporarily | Comment out workflow triggers; restore in Phase 12. | |
| Land on main; tolerate live site showing v1.3 paths during v1.2 window | Site documents upcoming version; users following tutorial get a v1.2 install with different layout. | |
| Land on main; add site-wide :::caution[v1.3-preview] banner | Visually flag preview status; remove when Phase 12 ships. | |

**User's choice:** Author on a feature branch, defer merge until v1.3

---

## zh-cn translation strategy

### Q1: How should zh-cn parity be authored?

| Option | Description | Selected |
|--------|-------------|----------|
| EN-first, then translate per page (Recommended) | EN page lands and is reviewed; then zh-cn translation. Locks technical accuracy in EN first. | ✓ |
| Co-author EN + zh-cn in the same plan | Both locales together; risks retranslating when EN gets reviewed. | |
| Machine-translate (Claude/GPT) as draft, human review | EN-first; LLM zh-cn first draft; human review. | |
| EN-first; zh-cn as [translation pending] placeholders | Defers actual translation; technically not meeting DOCS-06 parity. | |

**User's choice:** EN-first, then translate per page

### Q2: Who does the zh-cn translation work?

| Option | Description | Selected |
|--------|-------------|----------|
| User (you) authors zh-cn directly (Recommended) | Highest quality; user time bottleneck; matches v1.1 pattern. | |
| Claude drafts zh-cn, user reviews | Faster; user is quality gate. | |
| Claude drafts and commits without human review | Fastest; first zh-cn page shipped without human review. | ✓ |

**User's choice:** Claude drafts and commits without human review
**Notes:** Diverged from recommendation. User chose throughput over translation review. Tradeoff acknowledged in follow-up Q3.

### Q3: Sanity check on Claude-drafts-and-commits — want any lightweight safety net, or full velocity?

| Option | Description | Selected |
|--------|-------------|----------|
| Full velocity, no gate (Recommended given your pick) | Ship and iterate; patch only if user spots issue. | ✓ |
| Add a glossary lock (zh-cn terminology pinned) | docs/_GLOSSARY-zh.md with canonical zh-cn renderings; small upfront cost. | |
| Post-merge review window (you skim weekly) | User skims recently-shipped zh-cn weekly. | |

**User's choice:** Full velocity, no gate

---

## Claude's Discretion

The following were explicitly left to planner/Claude judgment:

- Exact wording of `docs/index.md` rewrite within the gomad landing-page brief.
- Whether `docs/roadmap.mdx` is deleted or rewritten as a thin pointer.
- Filename and placement of the auto-gen build step (new file vs. section in tools/build-docs.mjs).
- Skills table layout details (invoke form, trigger codes).
- Architecture explainer page structure within /explanation/architecture.
- Tutorial step ordering in /tutorials/install and /tutorials/quick-start.
- Contributing guide section breakdown in /how-to/contributing.
- Whether to update tools/build-docs.mjs LLM_EXCLUDE_PATTERNS during cleanup commit.

## Deferred Ideas

Areas surfaced in the multi-select but not opened:

- Architecture explainer depth (single page vs. split into subpages)
- Auto-deploy posture revisit (resolved via D-11)
- Page-count budget (locked at 6)
- Style-guide revision (deferred — _STYLE_GUIDE.md treated as immutable in Phase 11)

Discussion-time deferrals:

- zh-cn glossary lock (rejected per D-14)
- Post-merge zh-cn review window (rejected per D-14)
- validate-doc-coverage.js (deferred — auto-gen makes coverage drift impossible)
- Path validator tools/validate-doc-paths.js (belongs to Phase 12 / DOCS-07)
- Symbolic path tokens (rejected per D-10)
- PROJECT.md "GitHub Pages deployment" stale entry (cleanup at planner discretion)
- tools/build-docs.mjs LLM_EXCLUDE_PATTERNS cleanup (Claude's discretion)
