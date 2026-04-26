# Phase 12: Agent Dir Relocation + Release - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in `12-CONTEXT.md` — this log preserves the alternatives considered.

**Date:** 2026-04-26
**Phase:** 12-agent-dir-relocation-release
**Areas discussed:** Release publishing path, Quality gate composition, Upgrade CLI UX, Upgrade test seed strategy
**Mode:** discuss (interactive, single batch of 4 questions, no follow-ups)

---

## Gray Area Selection

**Question:** Phase 12 has 4 user-facing gray areas left (publishing mechanics, quality gate shape, upgrade UX, test seeding). Which do you want to weigh in on?

| Option | Description | Selected |
|--------|-------------|----------|
| Release publishing path | Manual npm publish via granular access token (current v1.2 pattern) vs migrating to OIDC Trusted Publishing via GitHub Actions | ✓ |
| Quality gate composition | Single fat npm run quality vs tiered (quality / quality:full) | ✓ |
| Upgrade CLI UX | Silent cleanup vs explicit migration banner during BREAKING relocation | ✓ |
| Upgrade test seed strategy | Real v1.2 tarball vs synthesized v1.2 layout | ✓ |

**User's choice:** All four areas selected.
**Notes:** User opted for full coverage rather than narrowing — typical for a phase that simultaneously moves a runtime pointer and ships a release.

---

## Release publishing path

| Option | Description | Selected |
|--------|-------------|----------|
| Granular token (same as v1.2) (Recommended) | Manual npm publish from local machine using a granular access token with 'Bypass 2FA' enabled. Zero new infra. Same path used for v1.2.0 release. OIDC migration deferred to v1.4+ as separate phase work. | ✓ |
| OIDC Trusted Publishing via GitHub Actions | Set up .github/workflows/publish.yml + npm publisher config (Trusted Publishers). Publish triggered by v1.3.0 tag push. 2026 SOTA, no token to leak, but adds CI workflow authoring + npm package settings work to this phase. | |
| Both — set up OIDC, but use token for this release | Author the GitHub Actions workflow + configure npm Trusted Publisher in this phase, but actually publish v1.3.0 manually via token. OIDC becomes the default for v1.4.0+. Higher cost up-front, payoff next release. | |

**User's choice:** Granular token (same as v1.2) — recommended option.
**Notes:** Keeps Phase 12 diff scoped to relocation + release content; OIDC adoption becomes a clean standalone v1.4+ phase rather than entangled with the BREAKING agent-dir change.

---

## Quality gate composition

| Option | Description | Selected |
|--------|-------------|----------|
| Single fat npm run quality (Recommended) | All tests + linters + docs:build run under one script. Matches REL-02 wording literally. Slower local runs but one source of truth. | ✓ |
| Tiered: quality = fast subset, quality:full = release gate | quality runs fast checks (lint, unit, gm-surface) for inner-loop dev. quality:full adds tarball verify, prd-chain, legacy-v12-upgrade, v13-agent-relocation, domain-kb-install, docs:build, validate:doc-paths. prepublishOnly invokes quality:full. | |

**User's choice:** Single fat npm run quality — recommended option.
**Notes:** No risk of skipping a check between local and release-gate runs. Tiered split flagged in CONTEXT.md `<deferred>` for revisit if release-gate runtime becomes painful in practice.

---

## Upgrade CLI UX

| Option | Description | Selected |
|--------|-------------|----------|
| Verbose migration banner (Recommended) | Print explicit message covering relocation target, backup location, .customize.yaml preservation, and rollback cross-reference. Loud because v1.3 is BREAKING. | ✓ |
| Silent cleanup (current v1.1→v1.2 pattern) | Cleanup runs through buildCleanupPlan + executeCleanupPlan with existing log lines but no special migration banner. | |
| Hybrid — silent unless TTY + summary at end | Standard cleanup logs during the run, then a one-line summary on completion. | |

**User's choice:** Verbose migration banner — recommended option.
**Notes:** Banner is suppressed when `--dry-run` is passed (existing v1.2 flag) — dry-run already prints planned actions, banner would be duplicative. Exact wording + chalk styling left to Claude's discretion in execution.

---

## Upgrade test seed strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Synthesize v1.2 layout manually (Recommended) | Test creates tempdir with hand-crafted _gomad/_config/files-manifest.csv (v2 schema) + 8 personas + minimal launchers, then runs v1.3 install. Fast, deterministic, no network. | ✓ |
| Download real @xgent-ai/gomad@1.2.0 tarball from npm | Test fetches v1.2.0 tarball via npm pack, runs gomad install (v1.2) in tempdir, then runs v1.3 install. Highest authenticity but network-dependent + slower. | |
| Use a checked-in fixture tarball at test/fixtures/v1.2.0.tgz | Commit the v1.2.0 npm tarball into the repo as a binary fixture. Authentic + offline. Adds ~MB to repo. | |

**User's choice:** Synthesize v1.2 layout manually — recommended option.
**Notes:** Network-free + deterministic was the deciding factor — CI runs and offline dev should not depend on npm registry availability for the legacy-upgrade test.

---

## Continuation Check

**Question:** Captured 4 decisions (all recommended defaults). Anything to dig deeper into, or ready to lock context?

**User's choice:** Ready for context.

---

## Claude's Discretion

- Exact wording and ANSI styling of the verbose migration banner (D-09)
- Wave count + ordering within Phase 12 (RESEARCH suggests 6 waves)
- Detector function name (`isV12LegacyAgentsDir` recommended)
- Exact CHANGELOG v1.3.0 BREAKING-section prose (v1.2.0 entry is the floor)
- Whether to add a `quality:fast` companion script for inner-loop dev
- Hand-crafted persona `.md` content for the AGENT-08 test seed (1-line stubs vs source copies)

## Deferred Ideas

- OIDC Trusted Publishing migration → standalone v1.4+ phase
- Tiered quality gate (quality / quality:full split) → revisit if release-gate runtime becomes painful
- `quality:fast` companion script → optional inner-loop addition
- Backup rotation/pruning policy (REL-F1) → already deferred per PROJECT.md
- Positive enforcement in DOCS-07 linter → adds brittleness, defer
- Splitting the AGENT-* relocation from REL-* release → coupled by REL-02 dependency on all AGENT-* tests
