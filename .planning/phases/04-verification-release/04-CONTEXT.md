# Phase 4: Verification & Release - Context

**Gathered:** 2026-04-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Run quality gates, produce a clean npm tarball, verify a fresh install works end-to-end, publish `@xgent-ai/gomad@1.1.0` to npm, and deprecate v1.0.0. This phase ships the milestone — no new features, no renames, no branding changes.

</domain>

<decisions>
## Implementation Decisions

### Publish Mechanism
- **D-01:** Manual `npm publish` from local machine using a granular access token with "Bypass 2FA" enabled. No trusted publishing / GitHub Actions OIDC for v1.1.0.
- **D-02:** Delete `.github/workflows/publish.yaml` entirely. CI-based publishing is deferred to a future milestone. The existing workflow is BMAD-branded and non-functional for our repo — removing it avoids confusion.
- **D-03:** Create a v1.1.0 git tag on `main` after publish. No GitHub Release — tag only.

### Tarball Hygiene
- **D-04:** Add an explicit `files` allowlist to `package.json` covering shipped directories and files: `src/`, `tools/installer/`, `LICENSE`, `README.md`, `README_CN.md`, `CHANGELOG.md`, `TRADEMARK.md`, `CONTRIBUTORS.md`, `CONTRIBUTING.md`. Delete `.npmignore` — `files` takes precedence.
- **D-05:** Write an automated tarball verification script that runs `npm pack --dry-run`, parses output, and asserts: no `.planning/`, no `test/`, no `.github/`, no `bmad` branding assets (`banner-bmad-method.png`), no `docs/` or `website/`. Integrate as a new npm script (e.g., `test:tarball` or extend `quality`).

### Fresh-Install E2E Verification
- **D-06:** Scripted E2E test: `npm pack` → install tarball in a temp directory → run `gomad install` → verify all `gm-*` skills load. Add as `npm run test:e2e` or similar.
- **D-07:** Success bar: parse the generated `.gomad-manifest.yaml` after install. Every skill ID listed must have its `SKILL.md` file present at the expected path. Missing skill files = test failure.

### Deprecation & Branch Flow
- **D-08:** Deprecate v1.0.0 AFTER v1.1.0 is published and confirmed installable from npm. No risk of broken window where the only available version is deprecated.
- **D-09:** Merge `next` → `main` before publish. Publish from `main` checkout. Tag v1.1.0 on `main`. Aligns with PROJECT.md: "merged to main only when milestone ships."
- **D-10:** Simplified deprecation message: `"Use @xgent-ai/gomad@latest instead."` (shorter than PROJECT.md draft — cleaner in terminal output).

### Claude's Discretion
- Exact implementation of the tarball verification script (shell vs Node, integration point with npm scripts)
- E2E test script structure (shell vs Node, temp dir management, cleanup)
- Order of quality gate sub-checks (as long as all 7 pass before publish)
- Whether `test:e2e` is added to the `quality` composite script or kept separate

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Package & publish
- `.planning/REQUIREMENTS.md` — VFY-01, VFY-02, VFY-03, REL-01, REL-02 requirements
- `.planning/PROJECT.md` — npm publish mechanics section, deprecation message template, branch merge policy
- `package.json` — Current scripts (`quality`, `test:install`, `validate:refs`, `validate:skills`), bin field, no `files` field yet

### Existing quality infrastructure
- `.github/workflows/quality.yaml` — CI quality workflow (reference for what gates exist)
- `test/test-installation-components.js` — Existing install component test (extend or complement, don't duplicate)
- `tools/validate-skills.js` — Skill validation logic (may inform E2E skill-load verification)
- `tools/validate-file-refs.js` — File reference validation

### Prior phase context
- `.planning/phases/03-credit-branding-docs/03-CONTEXT.md` — D-05 (no banner), D-08 (no BMAD in CLI), D-09..D-12 (CHANGELOG decisions)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `npm run quality` — Already wired with 7 sub-checks; just needs to pass, not be rewritten
- `test/test-installation-components.js` — Component-level install test; E2E test builds on top of this
- `tools/validate-skills.js` — Skill validation that can inform manifest-resolution assertions in E2E

### Established Patterns
- npm scripts as the orchestration layer (`npm run quality`, `npm run test:install`)
- `.npmignore` currently controls tarball contents — will be replaced by `files` allowlist

### Integration Points
- `package.json` `files` field — new addition, replaces `.npmignore`
- `package.json` `scripts` — new `test:tarball` and `test:e2e` entries
- `git merge next → main` — branch flow before publish
- `npm publish` + `npm deprecate` — manual npm CLI operations

</code_context>

<specifics>
## Specific Ideas

- Deprecation message should be short and actionable: `"Use @xgent-ai/gomad@latest instead."`
- Publish workflow (publish.yaml) is deleted, not rewritten — CI publishing deferred to future milestone
- Tag only, no GitHub Release for v1.1.0

</specifics>

<deferred>
## Deferred Ideas

- GitHub Actions trusted publishing (OIDC) — future milestone when CI publishing is set up
- GitHub Release creation — can be done manually later if desired
- Prerelease / `next` channel publishing via CI — deferred with publish.yaml deletion

</deferred>

---

*Phase: 04-verification-release*
*Context gathered: 2026-04-09*
