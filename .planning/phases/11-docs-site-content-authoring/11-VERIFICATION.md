---
phase: 11-docs-site-content-authoring
verified: 2026-04-26T00:00:00Z
status: gaps_found
score: 4/6 must-haves verified
overrides_applied: 0
gaps:
  - truth: "content deployed automatically by the existing Starlight GH Actions pipeline on push to main — `npm run docs:build` exits 0 end-to-end"
    status: failed
    reason: "Link-check stage of `npm run docs:build` fails with 5 broken-link issues across 3 files. The pipeline aborts before cleanBuildDirectory / generateLLMArtifacts / buildAstroSite stages. Auto-deploy on push to main would short-circuit at the link-check stage in the GH Actions docs pipeline (which calls the same `npm run docs:build`). No fresh `build/site/index.html` is produced (existing one is from 2026-04-25, before Phase 11 plans landed)."
    artifacts:
      - path: "tools/validate-doc-links.js"
        issue: "LINK_REGEX (line 25) matches any href ending in `.md`, including external HTTPS URLs. Validator then attempts to resolve absolute https://github.com/.../blob/main/.../X.md as a local file, fails with `[MANUAL] File not found anywhere`. 4 occurrences across docs/index.md and docs/zh-cn/index.md (Gap A from 11-07-SUMMARY)."
      - path: "docs/zh-cn/explanation/architecture.md"
        issue: "Line 65 references `../upgrade-recovery.md` which resolves to docs/zh-cn/upgrade-recovery.md (missing). EN counterpart at docs/explanation/architecture.md:65 uses the same relative path which resolves cleanly to docs/upgrade-recovery.md (Gap B)."
    missing:
      - "Either: (a) patch tools/validate-doc-links.js to skip URL-scheme links (https://, http://, mailto:) before resolution — preferred per 11-07-SUMMARY because it generalizes for future external `.md` references, OR (b) edit docs/index.md + docs/zh-cn/index.md (lines 37, 42) to drop `.md` suffixes from GitHub URL paths."
      - "Either: (a) translate docs/upgrade-recovery.md → docs/zh-cn/upgrade-recovery.md to maintain EN/zh-cn parity, OR (b) rewrite docs/zh-cn/explanation/architecture.md:65 to cross-link to the EN page via a site-relative path."
      - "After fixing, re-run `npm run docs:build` twice: first must exit 0 with full pipeline (link-check + injector + Astro build + LLM-flat artifact emission); second must produce zero diff under docs/reference/ + docs/zh-cn/reference/ for end-to-end idempotency."
  - truth: "Visitor opening `https://gomad.xgent.ai/...` sees deployed content — published static site exists and reflects authored pages"
    status: failed
    reason: "Goal language requires content `deployed automatically by the existing Starlight GH Actions pipeline on push to main`. Until the link-check failure is fixed, push to main will abort docs.yaml at the `npm run docs:build` step (`docs:build` is the canonical pipeline that GH Actions runs). No fresh build artifact is produced from the post-Phase-11 working tree. The build/site/index.html on disk was last produced on Apr 25 — pre-dates Plan 01 onward."
    artifacts:
      - path: "build/site/"
        issue: "Stale — last successful build is from 2026-04-25, before any Phase 11 plan landed. Would not contain authored Phase 11 pages even if the failing build is bypassed."
    missing:
      - "Successful `npm run docs:build` run that emits build/site/index.html and the locale subtrees (build/site/tutorials/install/index.html, build/site/zh-cn/..., etc.) reflecting the post-Phase-11 content."
human_verification:
  - test: "After gap-closure plan lands and `npm run docs:build` exits 0, manually open the deployed site at https://gomad.xgent.ai (or the `build/site/` artifact locally) and read each authored page end-to-end — confirm prose flows, examples are coherent to a first-time reader, and zh-cn translations sound natural."
    expected: "All 6 EN page sets + 6 zh-cn page sets render without layout glitches; persona/skill tables populated correctly; cross-links between sibling pages work; 4-phase workflow narrative is comprehensible."
    why_human: "Page-reads-coherently-to-a-human is explicitly listed as a manual-only verification in 11-VALIDATION.md and acknowledged by 11-07-SUMMARY as 'downstream of the gap-closure plan'. Cannot be programmatically verified — requires reader judgment about prose quality, narrative flow, and translation fluency."
  - test: "Visit https://gomad.xgent.ai/zh-cn/tutorials/install/ in a Chinese-locale browser (or with translation tools) and confirm the canonical install command is reproducible end-to-end — `npx @xgent-ai/gomad install` actually works on a fresh workspace."
    expected: "Install completes; persona files land at <installRoot>/_config/agents/; tutorial steps match observed behavior."
    why_human: "Requires running a real `npx @xgent-ai/gomad install` against a clean workspace and following the documented steps; not automatable without provisioning infrastructure."
---

# Phase 11: Docs Site Content Authoring Verification Report

**Phase Goal:** Visitors to `gomad.xgent.ai` can read tutorials (install, quick-start), reference pages (agents, skills), explanation (architecture), and contributing guide in both English and Chinese — content deployed automatically by the existing Starlight GH Actions pipeline on push to main.

**Verified:** 2026-04-26
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| #   | Truth                                                                                                                                                                                                                                                            | Status     | Evidence                                                                                                                                                                                                                                                                                                                                                                  |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Visitor opening `/tutorials/install` and `/tutorials/quick-start` sees step-by-step guidance covering `npm install @xgent-ai/gomad` + `gomad install` flow with working commands.                                                                                | VERIFIED   | `docs/tutorials/install.md` exists with 8 `##` sections, canonical command `npx @xgent-ai/gomad install`, v1.3 path layout `<installRoot>/_config/agents/`. `docs/tutorials/quick-start.md` exists with 8 `##` sections, slash command `/gm:agent-pm`, v1.3 paths.                                                                                                          |
| 2   | Visitor opening `/reference/agents` sees all 8 `gm-agent-*` personas listed with purpose + `/gm:agent-*` invocation; visitor opening `/reference/skills` sees the 4-phase workflow + core skills cataloged, grouped by workflow layer.                            | VERIFIED   | `docs/reference/agents.md` 4 `##` sections, AUTO marker pair populated with 10 `\|` lines (8 personas + header + separator), 8 `/gm:agent-` rows. `docs/reference/skills.md` 6 `##` sections, 5 marker pairs populated (Analysis 8, Planning 6, Solutioning 6, Implementation 16, Core 13 `\|` lines including header+separator).                                          |
| 3   | Visitor opening `/explanation/architecture` understands the 4-phase lifecycle, the manifest-v2 installer model, and the launcher-form slash command contract.                                                                                                    | VERIFIED   | `docs/explanation/architecture.md` exists with 5 `##` sections (Overview, 4-phase workflow, manifest-v2 installer, launcher-form slash command, How they fit together); all 4 phase names present; v1.3 paths used; cross-links to ../reference/agents.md, ../reference/skills.md, ../upgrade-recovery.md.                                                                  |
| 4   | Contributor opening `/how-to/contributing` can follow fork → PR → test-expectations steps end-to-end.                                                                                                                                                            | VERIFIED   | `docs/how-to/contributing.md` exists with 9 `##` sections (When to use / Prerequisites / Step 1-5 / What you get / Where to learn more); `npm run quality` documented; `github.com/xgent-ai/gomad` URL present; src/gomad-skills/ source-tree path referenced; 3 cross-links present.                                                                                       |
| 5   | Chinese-speaking visitor opening `/zh-cn/tutorials/install` (and siblings under `/zh-cn/`) sees parity content to the English pages authored above.                                                                                                              | VERIFIED   | All 6 zh-cn page targets exist with matching `##` section counts (8/8/4/6/5/9 mirror EN), CJK characters present (38/36/19/19/81/34 CJK-containing lines), English code blocks/paths/slash commands preserved per D-13/D-14, sidebar.order mirrors EN siblings.                                                                                                            |
| 6   | Content deployed automatically by the existing Starlight GH Actions pipeline on push to main — `npm run docs:build` exits 0 end-to-end                                                                                                                            | FAILED     | `npm run docs:build` exits 1 at the `Checking documentation links` stage. 5 link-check failures across 3 source files. Pipeline aborts before cleanBuildDirectory / generateLLMArtifacts / buildAstroSite. `.github/workflows/docs.yaml` (Starlight auto-deploy) calls the same `npm run docs:build` and would short-circuit on push to main with the same failure.        |

**Score:** 4/6 truths verified

Additional content presence (supporting truths from PLAN frontmatter, all VERIFIED):

| Item | Evidence |
| --- | --- |
| All 53 BMAD-era files deleted | `find docs/{tutorials,how-to,reference,explanation} -maxdepth 1 -name '*.md'` returns exactly the 6 newly authored files; no `getting-started.md`, `install-gomad.md`, `quick-dev.md`, `commands.md`, `roadmap.mdx` etc. |
| `docs/index.md` and zh-cn mirror rewritten | Both files exist with `title: GoMad` (and translated zh-cn title), forward-links to all 6 Wave 3 page paths, no BMAD body content. |
| `slug: 'roadmap'` sidebar entry removed | `! grep -E "slug:\\s*['\"]roadmap['\"]" website/astro.config.mjs` succeeds. |
| `tools/build-docs.mjs` LLM_EXCLUDE_PATTERNS scrubbed | `! grep -F "'v4-to-v6-upgrade'" tools/build-docs.mjs` and same for `'explanation/game-dev/'`, `'bmgd/'` all succeed. |
| PHASE-NOTE.md exists with Phase 12 merge-coordination flag | File present with `@xgent-ai/gomad@1.3.0`, `gomad.xgent.ai`, `_config/agents` markers. |
| `tools/inject-reference-tables.cjs` injector exists | 477-LOC CJS module with required exports; reuses `parseFrontmatterMultiline` from validate-skills.js; passes 12 tests / 15 asserts. |
| Re-running injector twice produces zero git diff | Verified: `node tools/inject-reference-tables.cjs && node tools/inject-reference-tables.cjs && git diff --quiet docs/reference/ docs/zh-cn/reference/` succeeds. |

### Required Artifacts

| Artifact | Expected | Status | Details |
| -------- | -------- | ------ | ------- |
| `docs/index.md` | v1.3 landing page (5 `##`, links to all 6 Wave 3 pages, no BMAD body) | VERIFIED | 5 `##` sections; relative links to all 6 pages resolve to existing files; legal Credits section present. |
| `docs/zh-cn/index.md` | zh-cn mirror of landing page | VERIFIED | Same structure as EN; CJK present; English file paths/code preserved. |
| `website/astro.config.mjs` | Sidebar without `slug: 'roadmap'` | VERIFIED | `slug: 'roadmap'` removed; autogenerate entries for tutorials/how-to/reference/explanation retained. |
| `tools/build-docs.mjs` | LLM_EXCLUDE_PATTERNS scrubbed; `injectReferenceTables()` runs before `checkDocLinks()` | VERIFIED (with caveats) | Stale entries scrubbed; injector function at line 68 precedes `checkDocLinks()` at line 71; `node --check tools/build-docs.mjs` exits 0. CAVEAT: REVIEW WR-01/WR-02 flag pre-existing stale content (BMAD-era llms.txt URLs, wrong REPO_URL) NOT touched by Phase 11 plans — these are review findings, not Phase 11 must-have failures, but they will produce broken-URL `llms.txt` once the link-check gap is closed. |
| `.planning/phases/11-docs-site-content-authoring/PHASE-NOTE.md` | Cross-phase coordination note | VERIFIED | Mentions `@xgent-ai/gomad@1.3.0`, `gomad.xgent.ai`, `_config/agents`. |
| `tools/inject-reference-tables.cjs` | Build-time auto-gen with required exports | VERIFIED | All required exports present; reuses parseFrontmatterMultiline; persona-count assertion EXPECTED_PERSONA_COUNT = 8 in main(); domain-kb skip guard present. |
| `test/test-inject-reference-tables.js` | 12 tests / 15 asserts | VERIFIED | `npm run test:inject-reference-tables` exits 0; "15 passed, 0 failed" confirmed. |
| `package.json` | `docs:inject` + `test:inject-reference-tables` scripts; quality chain extended | VERIFIED | Both scripts present; `quality` chain includes `npm run test:inject-reference-tables`. |
| `docs/reference/agents.md` | 4 `##`, AUTO:agents-table-{start,end} populated with 8 persona rows | VERIFIED | 4 sections; 10 `\|` lines between markers (8 personas + header + separator); 8 `/gm:agent-` rows. |
| `docs/reference/skills.md` | 6 `##`, 5 marker pairs populated | VERIFIED | 6 sections; 5 marker pairs each populated with section-specific row counts (Implementation 16, Core 13 etc.). |
| `docs/zh-cn/reference/{agents,skills}.md` | zh-cn translations preserve markers | VERIFIED | Both files exist with translated prose, same marker counts as EN, English markers/paths preserved. |
| `docs/tutorials/{install,quick-start}.md` | 7-8 `##`, canonical commands, v1.3 paths | VERIFIED | install.md 8 sections; quick-start.md 8 sections; commands and paths verified. |
| `docs/zh-cn/tutorials/{install,quick-start}.md` | zh-cn translations | VERIFIED | Both files exist; 8/8 sections; CJK present; English commands preserved. |
| `docs/explanation/architecture.md` | 5 `##`, all 4 phase names, 3 cross-links | VERIFIED | All conditions met; 125 lines. |
| `docs/zh-cn/explanation/architecture.md` | zh-cn translation | VERIFIED (with caveat) | File exists; 5 sections; 81 CJK-containing lines. CAVEAT: Cross-link to `../upgrade-recovery.md` does not resolve in zh-cn because the file was never translated (Gap B). |
| `docs/how-to/contributing.md` | 9 `##`, npm run quality, fork URL, src/ paths | VERIFIED | 9 sections; `npm run quality` documented; `github.com/xgent-ai/gomad` URL present; `src/gomad-skills/` referenced. |
| `docs/zh-cn/how-to/contributing.md` | zh-cn translation | VERIFIED | File exists; 9 translated sections; English commands/paths preserved. |
| `.planning/phases/11-docs-site-content-authoring/11-07-SUMMARY.md` | Wave 4 integration record | VERIFIED | File present; documents pre-flight pass + injector pass + link-check fail; gap surface enumerated for follow-up gap-closure plan. |

### Key Link Verification

| From | To | Via | Status | Details |
| ---- | -- | --- | ------ | ------- |
| `docs/index.md` | `docs/tutorials/install.md` (Plan 04) | relative markdown link | WIRED | `[Install GoMad](./tutorials/install.md)` present; target file exists. |
| `docs/index.md` | `docs/reference/agents.md` (Plan 03) | relative link | WIRED | `[Agents reference](./reference/agents.md)` present; target exists. |
| `docs/index.md` | `docs/reference/skills.md` (Plan 03) | relative link | WIRED | Target exists. |
| `docs/index.md` | `docs/explanation/architecture.md` (Plan 05) | relative link | WIRED | Target exists. |
| `docs/index.md` | `docs/how-to/contributing.md` (Plan 06) | relative link | WIRED | Target exists. |
| `docs/index.md` line 37 | `https://github.com/xgent-ai/gomad/blob/main/.planning/ROADMAP.md` | external GitHub URL | NOT_WIRED (link-check) | URL is valid externally but `tools/validate-doc-links.js` LINK_REGEX matches absolute https URLs ending in `.md` and tries to resolve them as local files. Causes link-check FAIL — Gap A. Same offense at line 42 (README.md). zh-cn mirror has same 2 occurrences. |
| `docs/zh-cn/explanation/architecture.md` line 65 | `../upgrade-recovery.md` | relative link | NOT_WIRED | Resolves to `docs/zh-cn/upgrade-recovery.md` which does not exist. EN counterpart resolves cleanly to `docs/upgrade-recovery.md`. Gap B. |
| `tools/build-docs.mjs` | `tools/inject-reference-tables.cjs` | execSync at line 68 | WIRED | `injectReferenceTables()` calls the injector before `checkDocLinks()` at line 71; ordering verified. |
| `tools/inject-reference-tables.cjs` | `tools/validate-skills.js` | `require('./validate-skills.js')` for parseFrontmatterMultiline | WIRED | grep confirms literal require path. |
| `test/test-inject-reference-tables.js` | `tools/inject-reference-tables.cjs` | require | WIRED | Tests execute and pass. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| -------- | ------------- | ------ | ------------------ | ------ |
| `docs/reference/agents.md` AUTO marker block | persona table content | `tools/inject-reference-tables.cjs` `discoverPersonas()` walks `src/gomad-skills/*/gm-agent-*/SKILL.md` | Yes (8 personas enumerated; data in EN) | FLOWING |
| `docs/reference/skills.md` 5 AUTO marker blocks | task-skill + core-skill tables | `discoverTaskSkills()` + `discoverCoreSkills()` walk `src/gomad-skills/` + `src/core-skills/` | Yes (28 task + 11 core enumerated) | FLOWING |
| `docs/zh-cn/reference/{agents,skills}.md` AUTO marker blocks | same persona/skill tables | Same injector populates both EN and zh-cn paths | Yes (English data per D-14) | FLOWING (English data; per D-14 zh-cn iterate-and-patch policy) |
| `tools/build-docs.mjs` LLM_EXCLUDE_PATTERNS | filter list for llms-full.txt | static array constant | N/A (not a runtime data flow; just a config constant) | N/A |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| -------- | ------- | ------ | ------ |
| `npm run test:inject-reference-tables` exits 0 | `npm run test:inject-reference-tables` | "15 passed, 0 failed" | PASS |
| `tools/build-docs.mjs` is syntactically valid | `node --check tools/build-docs.mjs` | exit 0 | PASS |
| Injector runs standalone without error | `node tools/inject-reference-tables.cjs` | "Reference table catalog: personas=8 task-skills=28 core-skills=11 ... ✓ Reference tables injected" | PASS |
| Injector idempotency | run twice + `git diff --quiet docs/reference/ docs/zh-cn/reference/` | exit 0 (no diff) | PASS |
| `npm run docs:build` end-to-end | `npm run docs:build` | exit code 1 — link-check fails with 5 issues, pipeline aborts | **FAIL** |
| Astro build artifact exists from this run | `[ -f build/site/index.html ]` | exists but stale (2026-04-25, pre-Phase 11) | FAIL (no fresh build from post-Phase-11 tree) |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| ----------- | ----------- | ----------- | ------ | -------- |
| DOCS-01 | 11-01, 11-04, 11-07 | User can read install + quick-start tutorials at `gomad.xgent.ai/tutorials/install` and `/tutorials/quick-start` | SATISFIED (content) / BLOCKED (deployment) | EN + zh-cn pages authored with canonical `npx @xgent-ai/gomad install` command and full step-by-step walkthroughs. Deployment of these pages to `gomad.xgent.ai` blocked by docs:build link-check failure. |
| DOCS-02 | 11-01, 11-02, 11-03, 11-07 | User can browse Agents Reference at `/reference/agents` listing all 8 `gm-agent-*` personas | SATISFIED (content) / BLOCKED (deployment) | `docs/reference/agents.md` (EN + zh-cn) authored; injector populates 8 persona rows. Deployment blocked. |
| DOCS-03 | 11-01, 11-02, 11-03, 11-07 | User can browse Skills Reference at `/reference/skills` | SATISFIED (content) / BLOCKED (deployment) | `docs/reference/skills.md` (EN + zh-cn) authored; injector populates 5 sections (28 + 11 = 39 entries). Deployment blocked. |
| DOCS-04 | 11-01, 11-05, 11-07 | User can read Architecture explainer at `/explanation/architecture` | SATISFIED (content) / BLOCKED (deployment) | `docs/explanation/architecture.md` (EN) authored cleanly. zh-cn copy authored but contains broken link `../upgrade-recovery.md` (Gap B) that itself contributes to the link-check failure. |
| DOCS-05 | 11-01, 11-06, 11-07 | Contributor can read Contributing how-to at `/how-to/contributing` | SATISFIED (content) / BLOCKED (deployment) | `docs/how-to/contributing.md` (EN + zh-cn) authored; `npm run quality` gate documented. Deployment blocked. |
| DOCS-06 | 11-01, 11-03, 11-04, 11-05, 11-06, 11-07 | Chinese-speaking user has parity content under `/zh-cn/` | PARTIAL | All 6 zh-cn page targets authored with translated section headers, prose, admonitions, frontmatter title/description. Marker text + code blocks + paths preserved in English per D-14. **Caveat:** `docs/zh-cn/upgrade-recovery.md` was NOT created — the EN-only `docs/upgrade-recovery.md` is shared and zh-cn architecture page links to it (Gap B). Strict parity requires a translated upgrade-recovery page; current state is "EN content + 6 translated pages" which is short of full `/zh-cn/` parity for every linked sibling. |

**Coverage:**
- 6 of 6 requirement IDs have authored content artifacts in the working tree (DOCS-01..06).
- 0 of 6 requirements are end-to-end verified — the deployment side of every DOCS-01..06 is blocked by the same link-check gate failure documented in 11-07-SUMMARY.
- DOCS-06 has a content gap (zh-cn upgrade-recovery missing) in addition to the deployment gap.

**Orphaned requirements:** None — REQUIREMENTS.md maps DOCS-01..06 to Phase 11; all 6 IDs appear in plan frontmatter (11-01 declares all 6; 11-02 has DOCS-02/03; 11-03 has DOCS-02/03/06; 11-04 has DOCS-01/06; 11-05 has DOCS-04/06; 11-06 has DOCS-05/06; 11-07 has DOCS-01..06). No requirements orphaned.

### Anti-Patterns Found

Anti-pattern grep run against the 17 files modified in Phase 11 (per 11-REVIEW.md files_reviewed_list):

| File | Line | Pattern | Severity | Impact |
| ---- | ---- | ------- | -------- | ------ |
| `tools/build-docs.mjs` | 26 | `REPO_URL = 'https://github.com/gomad-code-org/GOMAD-METHOD'` (stale BMAD repo path; actual repo is `xgent-ai/gomad`) | Warning | REVIEW WR-02. The constant flows into llms.txt + llms-full.txt headers as `Repository: ${REPO_URL}` (lines 155, 204). Once link-check is fixed, AI agents consuming llms.txt would be directed to a 404 GitHub URL. Pre-existing stale content; Phase 11 plans only modified LLM_EXCLUDE_PATTERNS in this file, not REPO_URL — so technically out of Phase 11's scope, but visible at the integration level. |
| `tools/build-docs.mjs` | 160-171 | `generateLlmsTxt()` hardcodes URLs to deleted BMAD-era pages (`tutorials/getting-started/`, `how-to/install-gomad/`, `explanation/quick-flow/`, `explanation/party-mode/`, `reference/workflow-map/`, `reference/modules/` describing "BMM, BMB, BMGD, and more") | Warning | REVIEW WR-01. Once link-check is fixed and docs:build emits llms.txt, these stale URLs ship into the AI-facing artifact. Same out-of-scope-but-visible posture as WR-02. |
| `tools/inject-reference-tables.cjs` | 357-363 | `injectBetweenMarkers` builds RegExp from interpolated marker names without escaping regex metacharacters (`escapeRegex` not applied) | Warning | REVIEW WR-03. Currently safe (all callers pass static, regex-safe strings) but a refactor away from injection. Defense-in-depth fix recommended. |
| `tools/inject-reference-tables.cjs` | 142-165 | `walkSkillDirs` recurses into directories that already have SKILL.md (no short-circuit) | Info | REVIEW IN-01. Today the tree is flat so this is harmless; nested SKILL.md would silently inflate task-skill count. |
| `tools/inject-reference-tables.cjs` | 153 | `domain-kb` skip guard is dead code (domain-kb lives at src/domain-kb/, sibling not child of skill roots walked) | Info | REVIEW IN-02. Defensive but currently unreachable. |

**Severity summary:** 0 blockers, 3 warnings, 2 info. None of the warnings/info items block the phase goal directly — they are downstream tooling concerns surfaced during review.

### Human Verification Required

See frontmatter `human_verification:` block. Two manual checks queued for after gap-closure:

1. **Page-reads-coherently to a human** — Read each authored page end-to-end (EN + zh-cn) on the deployed site or local build artifact; confirm prose flows, persona/skill tables render correctly, cross-links work, zh-cn translations sound natural. Acknowledged in 11-VALIDATION.md as manual-only.

2. **Reproducible install from zh-cn install tutorial** — Follow `https://gomad.xgent.ai/zh-cn/tutorials/install/` (or equivalent local artifact) end-to-end with a fresh workspace; confirm `npx @xgent-ai/gomad install` lands persona files at `<installRoot>/_config/agents/` as documented. Requires real workspace + npm.

### Gaps Summary

Phase 11 produced clean content artifacts: every page in DOCS-01..06 exists in the working tree with the correct structure, v1.3 path discipline, and zh-cn parity for the 6 authored page sets. The injector pipeline is wired correctly (test passes, idempotency proven, build-docs.mjs ordering correct), and there are zero v1.2 path leaks across all 14 page targets.

The phase falls short on the deployment side of its goal. The Starlight GH Actions pipeline runs `npm run docs:build` on push to main, and that command currently exits 1 at the link-check stage. Two distinct root causes:

- **Gap A — `tools/validate-doc-links.js` regex over-matches.** The validator's LINK_REGEX matches absolute https URLs ending in `.md` and tries to resolve them as local files. Plan 01's rewrite of `docs/index.md` and `docs/zh-cn/index.md` introduced 4 such links to GitHub-hosted markdown (`.../ROADMAP.md`, `.../README.md`). The validator was authored before these external `.md` references were common; the cleanest fix is a tooling patch to skip URL-scheme links. A content fix (drop the `.md` suffix from the GitHub URLs) is also valid but narrower. 11-07-SUMMARY recommends the tooling fix.

- **Gap B — Missing zh-cn upgrade-recovery sibling.** Plan 05 translated the architecture explainer end-to-end including the `[upgrade recovery guide](../upgrade-recovery.md)` cross-link. The relative path resolves cleanly for EN (where `docs/upgrade-recovery.md` exists, kept by Plan 01) but fails for zh-cn because no `docs/zh-cn/upgrade-recovery.md` was created. The cleanest fix is to translate the upgrade-recovery page; a cross-locale-link rewrite is the alternative.

Both gaps are explicitly anticipated and documented in 11-07-SUMMARY (Threat T-11-07-04 disposition `accept`: "Wave 1-3 plans pass per-plan verify but fail at integration"). The wave-level integration gate caught them. They are not deferred to Phase 12 — Phase 12 success criterion 3 explicitly requires `docs:build` to exit 0 as part of `npm run quality` on the release commit, so Phase 12 is *blocked by* these gaps, not the resolver of them.

Two pre-existing `tools/build-docs.mjs` issues surfaced by REVIEW (WR-01 stale llms.txt URLs, WR-02 wrong REPO_URL) are not Phase 11 must-have failures but will produce broken AI-facing artifacts once the link-check gate is closed and `llms.txt` is actually emitted from a successful build. Recommend including them in the gap-closure plan or queueing them as a separate Phase 11 cleanup; they will not surface as build failures (substring matches, not link-check), so they would silently degrade the AI integration posture.

**Recommended orchestrator route:** `/gsd-plan-phase 11 --gaps` to author a small gap-closure plan targeting Gaps A + B. Re-run verification after closure; expected outcome is `passed` with the two human-verification items deferred to operator review.

---

_Verified: 2026-04-26_
_Verifier: Claude (gsd-verifier)_
