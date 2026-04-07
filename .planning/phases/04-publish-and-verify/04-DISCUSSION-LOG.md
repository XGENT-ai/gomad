# Phase 4: Publish and Verify - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in 04-CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-07
**Phase:** 04-publish-and-verify
**Areas discussed:** Private registry config, Test framework (TST-04), End-to-end verification, Package metadata + files

---

## Private Registry Config

### Q1: Which private registry will gomad publish to?

| Option | Description | Selected |
|--------|-------------|----------|
| GitHub Packages | npm.pkg.github.com, scoped name, GITHUB_TOKEN auth | |
| Self-hosted Verdaccio | Internal Verdaccio at known URL | |
| Defer to env / .npmrc | publishConfig minimal, registry from env | |
| private:true only | Block accidental public publish | |
| **Other (free text)** | **public npm first, use @xgent-ai/gomad** | ✓ |

**User's choice:** Public npm with scoped name `@xgent-ai/gomad`.
**Notes:** Reverses the PROJECT.md "private npm only" constraint and "public npm Out of Scope" entry. Captured as D-01 with explicit note that PROJECT.md must be updated at phase transition.

### Q2: Should the package name be scoped?

| Option | Description | Selected |
|--------|-------------|----------|
| Keep unscoped 'gomad' | Current name | |
| **Scope it (@scope/gomad)** | Required for the chosen direction | ✓ |

**User's choice:** `@xgent-ai/gomad`.
**Notes:** Scope `@xgent-ai` chosen by user. Bin command stays `gomad`.

---

## Test Framework (TST-04)

### Q1: TST-04 says 'tests pass with vitest' but current scripts use node --test. How do you want to resolve this?

| Option | Description | Selected |
|--------|-------------|----------|
| Migrate to vitest | Add vitest devDep, convert tests | |
| **Keep node --test, fix the requirement** | Update REQUIREMENTS.md and CLAUDE.md to match reality | ✓ |
| Add vitest as wrapper | Run same files via both | |

**User's choice:** Keep `node --test`, fix the requirement wording.
**Notes:** Zero churn. Captured as D-04 / D-05.

---

## End-to-End Verification

### Q1: How do you want PUB-02 / PUB-03 verified end-to-end?

| Option | Description | Selected |
|--------|-------------|----------|
| **Automated test using npm pack** | tarball + tmp fixture + assert .claude/ populated | ✓ |
| Manual smoke test + checklist | Human runs steps, ticks boxes | |
| Real dry-publish to registry | Publish 0.1.0-rc.0 prerelease and npx-install | |
| Both: automated + manual | Belt-and-suspenders | |

**User's choice:** Automated test via `npm pack`.
**Notes:** Captured as D-06. One test covers both PUB-02 and PUB-03 because the test invokes `--preset full --yes`.

### Q2: For the automated install test, how should the fresh-project fixture be created?

| Option | Description | Selected |
|--------|-------------|----------|
| **tmpdir + minimal package.json** | os.tmpdir() with random name, cleaned up | ✓ |
| Fixture committed to test/fixtures/ | Committed minimal project, copied at test start | |

**User's choice:** `os.tmpdir()` with randomized name.
**Notes:** Captured as D-07. Cleanup in finally block is mandatory.

---

## Package Metadata + Files

### Q1: Which package.json metadata fields should be added/updated for publish? (multiSelect)

| Option | Description | Selected |
|--------|-------------|----------|
| repository | git URL, enables provenance + GitHub link | |
| homepage + bugs | npm package page links | |
| **description tweak** | Polish current description | ✓ |
| **publishConfig.access=public** | Required for first publish of scoped package | ✓ |

**User's choice:** description tweak + `publishConfig.access=public`.
**Notes:** Captured as D-09 / D-10. `repository`, `homepage`, `bugs` explicitly deferred per D-11.

### Q2: Version bump strategy for the first publish?

| Option | Description | Selected |
|--------|-------------|----------|
| Stay at 0.1.0 | Publish current as-is | |
| Bump to 0.1.0-rc.0 first | Release candidate then 0.1.0 | |
| **Jump to 1.0.0** | Signal stability now | ✓ |

**User's choice:** Jump to `1.0.0`.
**Notes:** Captured as D-12.

### Q3: Files whitelist — anything missing from current package.json files array?

| Option | Description | Selected |
|--------|-------------|----------|
| **Current is sufficient** | bin/, assets/, catalog/, tools/, README.md | ✓ |
| Add LICENSE explicitly | Make implicit-include explicit | |
| Audit + add anything missing | Run `npm pack --dry-run` and inspect | |

**User's choice:** Current is sufficient.
**Notes:** Captured as D-13. Planner is still asked to run `npm pack --dry-run` once during execution as a sanity check, surfacing deviations rather than silently expanding.

---

## Claude's Discretion

- Exact polished `description` text for package.json.
- Exact assertion set in the e2e test for "populated `.claude/`" (derived from `catalog/presets.yaml` `full` preset).
- File API choice in the e2e test (`fs-extra` vs `node:fs/promises`) — match existing test conventions.
- Whether to assert install subprocess exit code 0 (recommended).
- Minor README polish for npm listing (no full rewrite).

## Deferred Ideas

- `repository`, `homepage`, `bugs` package.json fields — explicitly out per D-11.
- CI/CD automation for publishing.
- npm provenance / SLSA attestation.
- Changelog tooling.
- README rewrite.
- PROJECT.md reversal of "private only" constraint and "public npm Out of Scope" — happens at phase transition, not within phase plans.
