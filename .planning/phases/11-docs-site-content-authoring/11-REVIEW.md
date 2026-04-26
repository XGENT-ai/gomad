---
phase: 11-docs-site-content-authoring
reviewed: 2026-04-26T00:00:00Z
depth: standard
files_reviewed: 17
files_reviewed_list:
  - docs/how-to/contributing.md
  - docs/index.md
  - docs/reference/agents.md
  - docs/reference/skills.md
  - docs/tutorials/install.md
  - docs/tutorials/quick-start.md
  - docs/zh-cn/how-to/contributing.md
  - docs/zh-cn/index.md
  - docs/zh-cn/reference/agents.md
  - docs/zh-cn/reference/skills.md
  - docs/zh-cn/tutorials/install.md
  - docs/zh-cn/tutorials/quick-start.md
  - package.json
  - test/test-inject-reference-tables.js
  - tools/build-docs.mjs
  - tools/inject-reference-tables.cjs
  - website/astro.config.mjs
findings:
  critical: 0
  warning: 3
  info: 4
  total: 7
status: issues_found
---

# Phase 11: Code Review Report

**Reviewed:** 2026-04-26
**Depth:** standard
**Files Reviewed:** 17
**Status:** issues_found

## Summary

Phase 11 is a docs-content phase: 12 of 17 reviewed files are markdown content (EN + zh-cn parity for tutorials, references, contributing, and the homepage). The markdown content is consistent, accurate against the v1.3 layout per D-10, and the EN/zh-cn pages are in good factual sync. The zh-cn translations correctly mirror EN structure, paths, and command examples. Internal cross-links resolve to existing pages (`../explanation/architecture.md`, `./quick-start.md`, etc.).

Bug-finding effort focused on the JS tooling. The injector (`tools/inject-reference-tables.cjs`) is well-structured with idempotent marker substitution, defense against pipe-injection in table cells, and adequate test coverage. The test harness (`test/test-inject-reference-tables.js`) verifies counts (8 personas, 28 task skills, 11 core skills) and table-shape invariants.

The notable issues are concentrated in `tools/build-docs.mjs`'s `generateLlmsTxt()` function, which hardcodes URLs to documentation pages that do not exist in the Phase 11 docs structure, and a stale repo URL constant. These ship into the generated `llms.txt` artifact that AI agents consume — broken links there silently degrade AI tool integrations even if the human-facing site is fine.

## Warnings

### WR-01: `llms.txt` generator references nonexistent doc pages

**File:** `tools/build-docs.mjs:160-171`
**Issue:** `generateLlmsTxt()` hardcodes URLs to pages that do not exist in the Phase 11 docs tree. Per `docs/{tutorials,how-to,explanation,reference}/`, the actual pages are `tutorials/install`, `tutorials/quick-start`, `how-to/contributing`, `explanation/architecture`, `reference/agents`, `reference/skills`. The generator instead emits links to:

- `${siteUrl}/tutorials/getting-started/` — does not exist
- `${siteUrl}/how-to/install-gomad/` — does not exist (install lives under tutorials/, not how-to/)
- `${siteUrl}/explanation/quick-flow/` — does not exist
- `${siteUrl}/explanation/party-mode/` — does not exist
- `${siteUrl}/reference/workflow-map/` — does not exist
- `${siteUrl}/reference/modules/` — does not exist (no BMM/BMB/BMGD modules in this fork)

These look like stale BMAD-era references. The generated `llms.txt` is consumed by AI agents per `astro.config.mjs:67-83` `<meta name="ai-terms"/llms-full/llms">` — broken URLs in this file silently degrade the AI integration that is the whole point of Phase 11's "AI-driven agile development" pitch.

**Fix:** Update the link list to match the v1.3 docs structure. Concretely, replace lines 160-171 with:

```js
'## Quick Start',
'',
`- **[Install GoMad](${siteUrl}/tutorials/install/)** - End-to-end installation walkthrough`,
`- **[Quick Start](${siteUrl}/tutorials/quick-start/)** - Run your first GoMad workflow`,
'',
'## Core Concepts',
'',
`- **[Architecture](${siteUrl}/explanation/architecture/)** - How agents, skills, and the installer fit together`,
'',
'## Reference',
'',
`- **[Agents](${siteUrl}/reference/agents/)** - The eight gm-agent-* personas`,
`- **[Skills](${siteUrl}/reference/skills/)** - Catalog of gm-* skills`,
'',
'## Contributing',
'',
`- **[Contributing](${siteUrl}/how-to/contributing/)** - Send changes back to the GoMad repo`,
```

### WR-02: Stale `REPO_URL` points to wrong GitHub org/repo

**File:** `tools/build-docs.mjs:26`
**Issue:** `REPO_URL = 'https://github.com/gomad-code-org/GOMAD-METHOD'` references a non-existent org and the BMAD-era repo name `GOMAD-METHOD`. The actual repository per `package.json:21` is `git+https://github.com/xgent-ai/gomad.git`, and every doc page uses `https://github.com/xgent-ai/gomad`. This URL is embedded into both `llms.txt` and `llms-full.txt` headers, so the AI-facing artifacts will direct agents to the wrong (likely 404) GitHub URL. Likely a copy-paste from BMAD that was missed in the fork rebrand.

**Fix:**
```js
const REPO_URL = 'https://github.com/xgent-ai/gomad';
```

### WR-03: `injectBetweenMarkers` regex does not escape marker arg, allowing regex injection

**File:** `tools/inject-reference-tables.cjs:357-363`
**Issue:** `injectBetweenMarkers` builds a `RegExp` from interpolated marker names without escaping regex metacharacters:

```js
const re = new RegExp(`(<!--\\s*${startMarker}\\s*-->)[\\s\\S]*?(<!--\\s*${endMarker}\\s*-->)`);
```

Today all callers pass static strings (`AUTO:agents-table-start`, `AUTO:skills-table-${key}-start`) where `key` comes from a hardcoded `SKILLS_MARKER_KEYS` whitelist, so this is not currently exploitable. However:
1. The colon in `AUTO:agents-table-start` is not a regex metachar, so it works by luck.
2. If a future caller (or someone adapting this helper) passes a marker containing `.`, `(`, `[`, `+`, `*`, `?`, `\`, etc., behavior would silently change — `injectFile` could match the wrong region or throw a confusing "marker not found" when the regex actually compiled into a different pattern.
3. The same module reuses this helper from `injectMultipleSections`, so the foot-gun lives one refactor away.

**Fix:** Escape the marker arguments before interpolation:

```js
function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function injectBetweenMarkers(source, startMarker, endMarker, replacement) {
  const startEsc = escapeRegex(startMarker);
  const endEsc = escapeRegex(endMarker);
  const re = new RegExp(`(<!--\\s*${startEsc}\\s*-->)[\\s\\S]*?(<!--\\s*${endEsc}\\s*-->)`);
  if (!re.test(source)) {
    throw new Error(`Markers ${startMarker}/${endMarker} not found in source.`);
  }
  return source.replace(re, `$1\n${replacement}\n$2`);
}
```

Also apply the same escaping in `injectMultipleSections` (line 398) where the same pattern is repeated.

## Info

### IN-01: `walkSkillDirs` recurses into directories that already have SKILL.md

**File:** `tools/inject-reference-tables.cjs:142-165`
**Issue:** `walk(dir)` adds a directory if it contains `SKILL.md`, then unconditionally recurses into it. If a future skill happened to nest a sub-skill (e.g., `gm-foo/sub-skill/SKILL.md`), both `gm-foo` and `gm-foo/sub-skill` would appear in `discoverTaskSkills()`, silently inflating counts and breaking the test assertion on line 110-115 (`expects exactly 28`). Today the tree is flat (research/ is a non-SKILL parent that contains SKILL-bearing children), so this works — but the design relies on an unstated invariant.

**Fix:** Either short-circuit recursion when `SKILL.md` is present in `fullPath`, or document the "no nested SKILL.md" invariant in the function's docstring. The short-circuit is one line:

```js
const hasSkill = fs.existsSync(path.join(fullPath, 'SKILL.md'));
if (hasSkill) {
  skillDirs.push(fullPath);
  continue; // do not recurse into a skill dir
}
walk(fullPath);
```

### IN-02: `domain-kb` skip in `walkSkillDirs` is dead code

**File:** `tools/inject-reference-tables.cjs:153`
**Issue:** The check `if (entry.name === 'domain-kb') continue;` defends against descending into `domain-kb/` while walking. But `walkSkillDirs` is only ever called with `SKILL_ROOT = src/gomad-skills/` and `CORE_ROOT = src/core-skills/`, and the actual `domain-kb/` lives at `src/domain-kb/` (sibling, not child). So this guard never triggers in the current tree. It is harmless but misleading — readers may assume domain-kb is being filtered when in fact it is structurally unreachable.

**Fix:** Either remove the check, or rephrase the comment to clarify it is "defense in depth in case domain-kb ever moves under gomad-skills/." A quick clarifying comment is cheaper than removal:

```js
// Defensive: domain-kb currently lives at src/domain-kb/ (sibling), not under
// gomad-skills/, so this guard is preventive against a future refactor.
if (entry.name === 'domain-kb') continue;
```

### IN-03: `LLM_EXCLUDE_PATTERNS` uses substring match, prone to false positives

**File:** `tools/build-docs.mjs:34-40, 296`
**Issue:** Patterns like `'changelog'` and `'faq'` are matched via `filePath.includes(pattern)`. A future doc named `docs/how-to/changelog-strategy.md` or `docs/explanation/internal-faq-tooling.md` would be silently excluded from `llms-full.txt`. There is no current collision (the docs tree is small and curated), but this is a brittle pattern for an artifact-generation step where silent exclusion is a soft failure.

**Fix:** Make the patterns more anchored — e.g., match path segments rather than substrings:

```js
const pathParts = filePath.split(path.sep);
return LLM_EXCLUDE_PATTERNS.some((pattern) => {
  // Strip trailing slash for prefix patterns; match either an exact filename
  // segment or a directory prefix.
  const trimmed = pattern.replace(/\/$/, '');
  return pathParts.includes(trimmed) || pathParts.includes(`${trimmed}.md`);
});
```

Or accept the current behavior and add a comment that patterns are interpreted as substrings.

### IN-04: `printBanner` centering math truncates on odd-length titles

**File:** `tools/build-docs.mjs:440-444`
**Issue:** `padStart(31 + title.length / 2)` produces a fractional target length when `title.length` is odd. `String.prototype.padStart` floors fractional lengths, so odd-length titles render shifted by half a character. Cosmetic only — no functional impact — but the math is non-obvious.

**Fix:** Make the truncation explicit and document intent:

```js
function printBanner(title) {
  const padded = title.padStart(Math.floor((62 + title.length) / 2)).padEnd(62);
  console.log('╔' + '═'.repeat(62) + '╗');
  console.log(`║${padded}║`);
  console.log('╚' + '═'.repeat(62) + '╝');
}
```

---

## Notes on markdown content (no findings)

Per the orchestrator instructions to flag markdown only for substantive issues, the 12 markdown files were checked for: broken commands, factually-wrong instructions, security guidance errors, and stale paths. Findings:

- **Commands** — `npx @xgent-ai/gomad install`, `npm install --save-dev @xgent-ai/gomad`, `npm run quality`, `git switch -c feat/...` all resolve against `package.json` scripts and standard tooling.
- **Paths** — All path examples use the v1.3 layout (`<installRoot>/_config/agents/<shortName>.md`) consistent with D-10 and PHASE-NOTE.md's deploy gating.
- **Cross-links** — `../explanation/architecture.md`, `./install.md`, `./quick-start.md`, `../reference/agents.md`, `../reference/skills.md`, `../how-to/contributing.md` all resolve to existing files (verified for both EN and zh-cn trees).
- **Command surface** — Slash commands `/gm:agent-pm`, `/gm:` listing, etc. match the launcher-form contract documented in agents.md.
- **EN/zh-cn parity** — Translations preserve technical content (paths, commands, code blocks) verbatim. Frontmatter `title:` and `description:` are translated; `sidebar.order` matches.
- **Generated tables** — The `<!-- AUTO:agents-table-start -->` and `<!-- AUTO:skills-table-{key}-start -->` markers in EN and zh-cn reference pages match the marker keys hardcoded in `inject-reference-tables.cjs:62-68` and `REFERENCE_PAGES:56-59`. Counts (8 personas, 6+4+4+14 = 28 task skills, 11 core skills) match the test expectations and source-of-truth file counts.

No substantive markdown issues found.

---

_Reviewed: 2026-04-26_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
