# Phase 4: Verification & Release - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-09
**Phase:** 04-verification-release
**Areas discussed:** Publish mechanism + workflow rewrite, Tarball hygiene, Fresh-install E2E verification, v1.0.0 deprecation timing & branch flow

---

## Publish Mechanism + Workflow Rewrite

### How should v1.1.0 actually get published?

| Option | Description | Selected |
|--------|-------------|----------|
| GH Actions trusted publishing | Rewrite publish.yaml to use OIDC trusted publishing. Most secure, no token to manage. | |
| Manual `npm publish` from local | Run `npm publish --provenance` locally with a granular access token. Faster to execute first time. | ✓ |
| Both: workflow + manual fallback | Rewrite workflow AND keep manual ability as escape hatch. | |

**User's choice:** Manual `npm publish` from local
**Notes:** None

### What's the scope of the publish.yaml rewrite?

| Option | Description | Selected |
|--------|-------------|----------|
| Minimal: latest channel only | Strip prerelease/next logic, Discord, App token. Keep only dispatch → test → pack → publish → tag. | |
| Keep next + latest channels | Rewrite for gomad but preserve dual-channel from BMAD's workflow. | |
| Delete publish.yaml entirely | Drop the workflow, publish manually for v1.1.0, defer CI publishing. | ✓ |

**User's choice:** Delete publish.yaml entirely
**Notes:** None

### Should the rewritten workflow auto-create a GitHub Release + git tag?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, both tag and Release | Workflow runs npm version, pushes tag, creates GH Release with CHANGELOG body. | |
| Tag only, no GH Release | Push v1.1.0 git tag, skip GH Release creation. | ✓ |
| Neither — publish only | Only npm publish, manual tag + release later. | |

**User's choice:** Tag only, no GH Release
**Notes:** None

---

## Tarball Hygiene (`files` Allowlist)

### How should the `files` allowlist be structured?

| Option | Description | Selected |
|--------|-------------|----------|
| Explicit allowlist, delete .npmignore | Add `files` to package.json, delete .npmignore. `files` takes precedence anyway. | ✓ |
| Explicit allowlist, keep .npmignore | Add `files` AND keep .npmignore as belt-and-suspenders. | |
| You decide | Claude picks during planning. | |

**User's choice:** Explicit allowlist, delete .npmignore
**Notes:** None

### What should the tarball verification check for specifically?

| Option | Description | Selected |
|--------|-------------|----------|
| Automated: script verifies tarball contents | Script runs `npm pack --dry-run`, parses output, asserts no .planning/, test/, .github/, bmad assets, docs/, website/. | ✓ |
| Manual: eyeball check | Run `npm pack --dry-run` manually and visually confirm. | |
| You decide | Claude picks during planning. | |

**User's choice:** Automated script
**Notes:** None

---

## Fresh-Install E2E Verification

### How should the fresh-install E2E test work?

| Option | Description | Selected |
|--------|-------------|----------|
| Scripted: pack → install → verify | Shell/Node script: npm pack, install in temp dir, run gomad install, verify gm-* skills present. | ✓ |
| Manual smoke test with checklist | Document a manual checklist, not automated. | |
| You decide | Claude picks during planning. | |

**User's choice:** Scripted
**Notes:** None

### What's the success bar for 'all gm-* skills are loadable'?

| Option | Description | Selected |
|--------|-------------|----------|
| All skills in manifest resolve | Parse gomad-manifest.yaml after install. Every skill ID must have its SKILL.md present. | ✓ |
| Installer runs without error | Just verify `gomad install` exits 0 and produces .gomad/ dir. | |
| You decide | Claude picks during planning. | |

**User's choice:** All skills in manifest resolve
**Notes:** None

---

## v1.0.0 Deprecation Timing & Branch Flow

### When should v1.0.0 be deprecated relative to v1.1.0 publish?

| Option | Description | Selected |
|--------|-------------|----------|
| After v1.1.0 is published | Publish first, confirm installable, then deprecate. No broken window. | ✓ |
| Before v1.1.0 publish | Deprecate first, then publish. Brief period with no non-deprecated version. | |
| Same step / atomic | Both commands back-to-back in one session. | |

**User's choice:** After v1.1.0 is published
**Notes:** None

### Branch flow: how does `next` get to `main` for publish?

| Option | Description | Selected |
|--------|-------------|----------|
| Merge next → main, publish from main | Standard flow, tag on main. Aligns with PROJECT.md. | ✓ |
| Publish from next, merge after | Publish from next, merge to main post-publish. | |
| You decide | Claude picks during planning. | |

**User's choice:** Merge next → main, publish from main
**Notes:** None

### Use PROJECT.md's exact deprecation message or revise?

| Option | Description | Selected |
|--------|-------------|----------|
| Use as-is | Full message from PROJECT.md with BMAD context. | |
| Simplify | Shorter: "Use @xgent-ai/gomad@latest instead." | ✓ |
| Revise | Custom wording. | |

**User's choice:** Simplify
**Notes:** None

---

## Claude's Discretion

- Tarball verification script implementation details (shell vs Node)
- E2E test script structure and temp dir management
- Order of quality gate sub-checks
- Whether test:e2e joins the quality composite script

## Deferred Ideas

- GitHub Actions trusted publishing (OIDC) — future milestone
- GitHub Release creation — manual later if desired
- Prerelease / next channel CI publishing — deferred with publish.yaml deletion
