# Requirements: GoMad v1.1.0

**Defined:** 2026-04-08
**Core Value:** A lean, properly-credited fork of BMAD Method that we own end-to-end and can extend with our own agents/skills.

## v1.1 Requirements

### Package & Metadata

- [x] **PKG-01**: `package.json` name is `@xgent-ai/gomad` and version is `1.1.0`
- [x] **PKG-02**: `package.json` description, keywords, repository URL, and author (`Rockie Guo <rockie@kitmi.com.au>`) reflect gomad identity
- [x] **PKG-03**: `package.json` exposes `gomad` binary via `bin` field pointing to `tools/installer/gomad-cli.js`
- [x] **PKG-04**: npm scripts renamed: `gomad:install`, `gomad:uninstall`, `install:gomad`; dead `rebundle` script removed
- [x] **PKG-05**: `publishConfig: { access: "public" }` is set for scoped public publish

### Rename — File System

- [x] **FS-01**: `src/bmm-skills/` renamed to `src/gomad-skills/`; all installer paths and module manifests updated
- [x] **FS-02**: All ~41 `bmad-*` skill directories renamed to `gm-*` across `core-skills/` and `gomad-skills/` (11 + 8 + 6 + 5 + 11)
- [x] **FS-03**: Manifest filenames `bmad-skill-manifest.yaml` → `skill-manifest.yaml` and `bmad-manifest.json` → `manifest.json` (prefix dropped)
- [x] **FS-04**: `tools/installer/bmad-cli.js` renamed to `tools/installer/gomad-cli.js`
- [x] **FS-05**: `tools/installer/ide/shared/bmad-artifacts.js` renamed to `gomad-artifacts.js` (or `artifacts.js`)

### Rename — Content Sweep

- [x] **TXT-01**: All occurrences of `BMAD Method` / `BMAD` / `BMad` / `bmad-method` / `bmm` in source, docs, configs, tests, comments replaced using case-preserving mapping: `BMAD Method`→`GoMad`, `BMAD`→`GOMAD`, `BMad`→`GoMad`, `bmad-method`→`gomad`, `bmad`→`gomad`, `bmm`→`gomad`. Excludes LICENSE attribution block and CHANGELOG history entries
- [x] **TXT-02**: All skill ID references inside SKILL.md files, YAML manifests, `module-help.csv`, and installer code updated to match new `gm-*` names
- [x] **TXT-03**: `module.yaml` files in both `core-skills/` and `gomad-skills/` updated with new module names and skill IDs
- [x] **TXT-04**: Test fixtures (`test/fixtures/file-refs-csv/valid/bmm-style.csv`, `core-style.csv`) and consuming tests updated to reflect renamed skill paths

### Slim Down

- [x] **SLIM-01**: `tools/installer/external-official-modules.yaml` deleted along with consumer code in `external-manager.js` and any external-official references in `official-modules.js`
- [x] **SLIM-02**: No BMad builder or web bundle source/assets remain in the repo (verify `next` branch refactor completeness)
- [x] **SLIM-03**: `README_VN.md` deleted
- [x] **SLIM-04**: `docs/cs/`, `docs/fr/`, `docs/vi-vn/` deleted; only default (en) and `zh-cn/` remain

### Credit & Legal

- [x] **CREDIT-01**: `LICENSE` file preserves BMAD's original MIT text byte-identical, with a GoMad copyright block (`Copyright (c) 2026 Rockie Guo / xgent-ai`) appended below a horizontal rule, plus explicit "not affiliated with, endorsed by, or sponsored by BMad Code, LLC" disclaimer
- [x] **CREDIT-02**: `README.md` and `README_CN.md` contain a `## Credits` footer section with: factual fork statement ("GoMad is a hard fork of BMAD Method by Brian (BMad) Madison"), link to upstream repo, and the same non-affiliation disclaimer. No fork-statement in intro (per Phase 3 CONTEXT D-04).
- [x] **CREDIT-03**: `TRADEMARK.md` rewritten for GoMad: no claim over the BMAD wordmark, acknowledges BMAD as a trademark of BMad Code LLC via nominative fair use, states xgent-ai's trademark posture for "GoMad"
- [x] **CREDIT-04**: `CONTRIBUTORS.md` preserves original BMAD contributors list; new GoMad contributors section added

### Branding

- [x] **BRAND-01**: `banner-bmad-method.png` is deleted, NO replacement banner image is created, `Wordmark.png` is regenerated for GoMad, and the CLI startup banner shows "GoMad" (per Phase 3 CONTEXT D-05).
- [x] **BRAND-02**: CLI installer/startup banner output displays "GoMad" branding (not BMAD)

### Documentation

- [x] **DOCS-01**: `README.md` (English) fully rewritten with GoMad framing, `npm install @xgent-ai/gomad` install instructions, and credit section
- [x] **DOCS-02**: `README_CN.md` (Chinese) fully rewritten, same scope as DOCS-01
- [x] **DOCS-03**: `CNAME` set to `gomad.xgent.ai`
- [x] **DOCS-04**: `CHANGELOG.md` has v1.1.0 entry that frames the pivot (from Claude Code skills installer to BMAD Method fork)
- [x] **DOCS-05**: `CONTRIBUTING.md` rewritten with GoMad identity; `SECURITY.md` and `AGENTS.md` deleted (per Phase 3 CONTEXT D-24).
- [x] **DOCS-06**: `docs/` site content and `website/` content updated or cleaned up for GoMad (default en + zh-cn only)
- [x] **DOCS-07**: `docs/mobmad-plan.md` investigated and either renamed or deleted

### Release

- [x] **REL-01**: `@xgent-ai/gomad@1.0.0` deprecated on npm with message pointing to v1.1.0
- [x] **REL-02**: `@xgent-ai/gomad@1.1.0` published to npm after all verification passes; uses `files` allowlist, `npm pack --dry-run` verified clean

### Verification

- [x] **VFY-01**: `npm run quality` passes (format:check + lint + lint:md + docs:build + test:install + validate:refs + validate:skills)
- [x] **VFY-02**: Fresh install from locally-packed tarball produces working setup with all `gm-*` skills loadable
- [x] **VFY-03**: No residual `bmad` / `BMAD` / `bmm` strings in shipped files (grep clean), excluding LICENSE attribution and CHANGELOG history

## v2 Requirements

Deferred to milestone 2. Tracked but not in current roadmap.

### Custom Agents & Skills

- **CUSTOM-01**: New gomad-specific agents added to `src/gomad-skills/` or `src/core-skills/`
- **CUSTOM-02**: New gomad-specific skills integrated into the `1-analysis` → `4-implementation` workflow
- **CUSTOM-03**: Agent/skill documentation and installer support for new additions

## Out of Scope

| Feature | Reason |
|---------|--------|
| New agents or skills | Deferred to milestone 2; v1.1 is rename + credit only |
| Touching `bmad-method` on npm | Not our package; owned by BMAD's authors |
| Reworking bmm workflow internals | Structural changes out of scope; pure rename only |
| GSD integration into gomad distribution | GSD is our dev tooling, not part of the product |
| GitHub Pages deployment | CNAME set now; actual deploy deferred until stable |
| Re-publishing or unpublishing v1.0 | Deprecated, not removed |
| Tracking BMAD upstream changes | Hard fork, not a merge-tracked downstream |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| PKG-01 | Phase 1 | Complete |
| PKG-02 | Phase 1 | Complete |
| PKG-03 | Phase 1 | Complete |
| PKG-04 | Phase 1 | Complete |
| PKG-05 | Phase 1 | Complete |
| FS-01 | Phase 2 | Complete |
| FS-02 | Phase 2 | Complete |
| FS-03 | Phase 2 | Complete |
| FS-04 | Phase 2 | Complete |
| FS-05 | Phase 2 | Complete |
| TXT-01 | Phase 2 | Complete |
| TXT-02 | Phase 2 | Complete |
| TXT-03 | Phase 2 | Complete |
| TXT-04 | Phase 2 | Complete |
| SLIM-01 | Phase 1 | Complete |
| SLIM-02 | Phase 1 | Complete |
| SLIM-03 | Phase 1 | Complete |
| SLIM-04 | Phase 1 | Complete |
| CREDIT-01 | Phase 3 | Complete |
| CREDIT-02 | Phase 3 | Complete |
| CREDIT-03 | Phase 3 | Complete |
| CREDIT-04 | Phase 3 | Complete |
| BRAND-01 | Phase 3 | Complete |
| BRAND-02 | Phase 3 | Complete |
| DOCS-01 | Phase 3 | Complete |
| DOCS-02 | Phase 3 | Complete |
| DOCS-03 | Phase 3 | Complete |
| DOCS-04 | Phase 3 | Complete |
| DOCS-05 | Phase 3 | Complete |
| DOCS-06 | Phase 3 | Complete |
| DOCS-07 | Phase 3 | Complete |
| REL-01 | Phase 4 | Complete |
| REL-02 | Phase 4 | Complete |
| VFY-01 | Phase 4 | Complete |
| VFY-02 | Phase 4 | Complete |
| VFY-03 | Phase 4 | Complete |

**Coverage:**
- v1.1 requirements: 36 total
- Mapped to phases: 36
- Unmapped: 0

---
*Requirements defined: 2026-04-08*
*Last updated: 2026-04-18 -- all 36 v1.1 requirements marked complete at milestone close*
