# Requirements: GoMad v1.1.0

**Defined:** 2026-04-08
**Core Value:** A lean, properly-credited fork of BMAD Method that we own end-to-end and can extend with our own agents/skills.

## v1.1 Requirements

### Package & Metadata

- [ ] **PKG-01**: `package.json` name is `@xgent-ai/gomad` and version is `1.1.0`
- [ ] **PKG-02**: `package.json` description, keywords, repository URL, and author (`Rockie Guo <rockie@kitmi.com.au>`) reflect gomad identity
- [ ] **PKG-03**: `package.json` exposes `gomad` binary via `bin` field pointing to `tools/installer/gomad-cli.js`
- [ ] **PKG-04**: npm scripts renamed: `gomad:install`, `gomad:uninstall`, `install:gomad`; dead `rebundle` script removed
- [ ] **PKG-05**: `publishConfig: { access: "public" }` is set for scoped public publish

### Rename — File System

- [ ] **FS-01**: `src/bmm-skills/` renamed to `src/gomad-skills/`; all installer paths and module manifests updated
- [ ] **FS-02**: All ~41 `bmad-*` skill directories renamed to `gm-*` across `core-skills/` and `gomad-skills/` (11 + 8 + 6 + 5 + 11)
- [ ] **FS-03**: Manifest filenames `bmad-skill-manifest.yaml` → `skill-manifest.yaml` and `bmad-manifest.json` → `manifest.json` (prefix dropped)
- [ ] **FS-04**: `tools/installer/bmad-cli.js` renamed to `tools/installer/gomad-cli.js`
- [ ] **FS-05**: `tools/installer/ide/shared/bmad-artifacts.js` renamed to `gomad-artifacts.js` (or `artifacts.js`)

### Rename — Content Sweep

- [ ] **TXT-01**: All occurrences of `BMAD Method` / `BMAD` / `BMad` / `bmad-method` / `bmm` in source, docs, configs, tests, comments replaced using case-preserving mapping: `BMAD Method`→`GoMad`, `BMAD`→`GOMAD`, `BMad`→`GoMad`, `bmad-method`→`gomad`, `bmad`→`gomad`, `bmm`→`gomad`. Excludes LICENSE attribution block and CHANGELOG history entries
- [ ] **TXT-02**: All skill ID references inside SKILL.md files, YAML manifests, `module-help.csv`, and installer code updated to match new `gm-*` names
- [ ] **TXT-03**: `module.yaml` files in both `core-skills/` and `gomad-skills/` updated with new module names and skill IDs
- [ ] **TXT-04**: Test fixtures (`test/fixtures/file-refs-csv/valid/bmm-style.csv`, `core-style.csv`) and consuming tests updated to reflect renamed skill paths

### Slim Down

- [ ] **SLIM-01**: `tools/installer/external-official-modules.yaml` deleted along with consumer code in `external-manager.js` and any external-official references in `official-modules.js`
- [ ] **SLIM-02**: No BMad builder or web bundle source/assets remain in the repo (verify `next` branch refactor completeness)
- [ ] **SLIM-03**: `README_VN.md` deleted
- [ ] **SLIM-04**: `docs/cs/`, `docs/fr/`, `docs/vi-vn/` deleted; only default (en) and `zh-cn/` remain

### Credit & Legal

- [ ] **CREDIT-01**: `LICENSE` file preserves BMAD's original MIT text byte-identical, with a GoMad copyright block (`Copyright (c) 2026 Rockie Guo / xgent-ai`) appended below a horizontal rule, plus explicit "not affiliated with, endorsed by, or sponsored by BMad Code, LLC" disclaimer
- [ ] **CREDIT-02**: `README.md` and `README_CN.md` contain a `## Credits` section with: factual fork statement ("GoMad is a hard fork of BMAD Method by Brian (BMad) Madison"), link to upstream repo, and the same non-affiliation disclaimer
- [ ] **CREDIT-03**: `TRADEMARK.md` rewritten for GoMad: no claim over the BMAD wordmark, acknowledges BMAD as a trademark of BMad Code LLC via nominative fair use, states xgent-ai's trademark posture for "GoMad"
- [ ] **CREDIT-04**: `CONTRIBUTORS.md` preserves original BMAD contributors list; new GoMad contributors section added

### Branding

- [ ] **BRAND-01**: `banner-gomad.png` created and replaces `banner-bmad-method.png`; `Wordmark.png` regenerated for GoMad
- [ ] **BRAND-02**: CLI installer/startup banner output displays "GoMad" branding (not BMAD)

### Documentation

- [ ] **DOCS-01**: `README.md` (English) fully rewritten with GoMad framing, `npm install @xgent-ai/gomad` install instructions, and credit section
- [ ] **DOCS-02**: `README_CN.md` (Chinese) fully rewritten, same scope as DOCS-01
- [ ] **DOCS-03**: `CNAME` set to `gomad.xgent.ai`
- [ ] **DOCS-04**: `CHANGELOG.md` has v1.1.0 entry that frames the pivot (from Claude Code skills installer to BMAD Method fork)
- [ ] **DOCS-05**: `CONTRIBUTING.md`, `SECURITY.md`, `AGENTS.md` updated with GoMad identity
- [ ] **DOCS-06**: `docs/` site content and `website/` content updated or cleaned up for GoMad (default en + zh-cn only)
- [ ] **DOCS-07**: `docs/mobmad-plan.md` investigated and either renamed or deleted

### Release

- [ ] **REL-01**: `@xgent-ai/gomad@1.0.0` deprecated on npm with message pointing to v1.1.0
- [ ] **REL-02**: `@xgent-ai/gomad@1.1.0` published to npm after all verification passes; uses `files` allowlist, `npm pack --dry-run` verified clean

### Verification

- [ ] **VFY-01**: `npm run quality` passes (format:check + lint + lint:md + docs:build + test:install + validate:refs + validate:skills)
- [ ] **VFY-02**: Fresh install from locally-packed tarball produces working setup with all `gm-*` skills loadable
- [ ] **VFY-03**: No residual `bmad` / `BMAD` / `bmm` strings in shipped files (grep clean), excluding LICENSE attribution and CHANGELOG history

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
| PKG-01 | TBD | Pending |
| PKG-02 | TBD | Pending |
| PKG-03 | TBD | Pending |
| PKG-04 | TBD | Pending |
| PKG-05 | TBD | Pending |
| FS-01 | TBD | Pending |
| FS-02 | TBD | Pending |
| FS-03 | TBD | Pending |
| FS-04 | TBD | Pending |
| FS-05 | TBD | Pending |
| TXT-01 | TBD | Pending |
| TXT-02 | TBD | Pending |
| TXT-03 | TBD | Pending |
| TXT-04 | TBD | Pending |
| SLIM-01 | TBD | Pending |
| SLIM-02 | TBD | Pending |
| SLIM-03 | TBD | Pending |
| SLIM-04 | TBD | Pending |
| CREDIT-01 | TBD | Pending |
| CREDIT-02 | TBD | Pending |
| CREDIT-03 | TBD | Pending |
| CREDIT-04 | TBD | Pending |
| BRAND-01 | TBD | Pending |
| BRAND-02 | TBD | Pending |
| DOCS-01 | TBD | Pending |
| DOCS-02 | TBD | Pending |
| DOCS-03 | TBD | Pending |
| DOCS-04 | TBD | Pending |
| DOCS-05 | TBD | Pending |
| DOCS-06 | TBD | Pending |
| DOCS-07 | TBD | Pending |
| REL-01 | TBD | Pending |
| REL-02 | TBD | Pending |
| VFY-01 | TBD | Pending |
| VFY-02 | TBD | Pending |
| VFY-03 | TBD | Pending |

**Coverage:**
- v1.1 requirements: 36 total
- Mapped to phases: 0
- Unmapped: 36 (roadmap pending)

---
*Requirements defined: 2026-04-08*
*Last updated: 2026-04-08 after initial definition*
