# Roadmap: GoMad v1.1.0

## Overview

GoMad v1.1.0 transforms the raw BMAD Method fork into a properly-named, slim, credited, and publishable package. The milestone moves through four phases: establish package identity and remove dead code, rename all file-system and content references, compose credit/branding/documentation, then verify everything and publish to npm.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3, 4): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation** - Package identity, dependency cleanup, and dead code removal
- [ ] **Phase 2: Rename** - Directory renames, manifest updates, and full content sweep
- [ ] **Phase 3: Credit, Branding & Docs** - LICENSE, TRADEMARK, README, visual assets, and documentation
- [ ] **Phase 4: Verification & Release** - Quality gates, installer E2E, npm publish and deprecate

## Phase Details

### Phase 1: Foundation
**Goal**: The package declares itself as `@xgent-ai/gomad@1.1.0` with correct metadata, all dead code and unused assets are removed, and the codebase is slim enough to rename cleanly
**Depends on**: Nothing (first phase)
**Requirements**: PKG-01, PKG-02, PKG-03, PKG-04, PKG-05, SLIM-01, SLIM-02, SLIM-03, SLIM-04
**Success Criteria** (what must be TRUE):
  1. `npm pkg get name` returns `@xgent-ai/gomad` and `npm pkg get version` returns `1.1.0`
  2. `package.json` exposes `gomad` binary, has renamed scripts (`gomad:install`, `gomad:uninstall`, `install:gomad`), no `rebundle` script, and `publishConfig.access` is `"public"`
  3. `tools/installer/external-official-modules.yaml`, `external-manager.js` consumer code, and any builder/web-bundle residue are gone from the repo
  4. `README_VN.md` and `docs/cs/`, `docs/fr/`, `docs/vi-vn/` no longer exist
**Plans**: TBD

Plans:
- [ ] 01-01: TBD
- [ ] 01-02: TBD

### Phase 2: Rename
**Goal**: Every file path, directory name, manifest entry, skill ID, and content reference has been transformed from `bmad`/`BMAD`/`bmm` to `gomad`/`GOMAD`/`gm-*`, with no rename-related breakage in installer or tests
**Depends on**: Phase 1
**Requirements**: FS-01, FS-02, FS-03, FS-04, FS-05, TXT-01, TXT-02, TXT-03, TXT-04
**Success Criteria** (what must be TRUE):
  1. `src/bmm-skills/` is now `src/gomad-skills/` and all ~41 `bmad-*` skill directories are renamed to `gm-*`
  2. Manifest filenames are `skill-manifest.yaml` and `manifest.json` (no `bmad-` prefix) with updated IDs inside
  3. CLI entry point is `tools/installer/gomad-cli.js` and artifacts file is `gomad-artifacts.js`
  4. A grep for `bmad` across source, configs, manifests, and tests returns zero hits outside of LICENSE attribution, CHANGELOG history, and TRADEMARK fair-use references
  5. Test fixtures (`bmm-style.csv`, `core-style.csv`) are renamed and `test-file-refs-csv.js` passes
**Plans**: TBD

Plans:
- [ ] 02-01: TBD
- [ ] 02-02: TBD
- [ ] 02-03: TBD

### Phase 3: Credit, Branding & Docs
**Goal**: GoMad is properly credited as a hard fork of BMAD Method with correct legal files, new visual branding, and complete English + Chinese documentation
**Depends on**: Phase 2
**Requirements**: CREDIT-01, CREDIT-02, CREDIT-03, CREDIT-04, BRAND-01, BRAND-02, DOCS-01, DOCS-02, DOCS-03, DOCS-04, DOCS-05, DOCS-06, DOCS-07
**Success Criteria** (what must be TRUE):
  1. `LICENSE` preserves BMAD's original MIT text byte-identical with GoMad copyright block appended below a horizontal rule, plus non-affiliation disclaimer
  2. `README.md` and `README_CN.md` each contain a factual fork statement in the intro and a `## Credits` section with upstream link and disclaimer
  3. `TRADEMARK.md` is rewritten for GoMad (no BMAD wordmark claim, nominative fair use acknowledgment)
  4. `banner-gomad.png` exists, old `banner-bmad-method.png` is gone, and CLI startup banner shows "GoMad"
  5. `CHANGELOG.md` has a v1.1.0 entry framing the fork pivot; `CONTRIBUTING.md`, `SECURITY.md`, `AGENTS.md`, and `docs/` site content reflect GoMad identity
**Plans**: TBD
**UI hint**: yes

Plans:
- [ ] 03-01: TBD
- [ ] 03-02: TBD

### Phase 4: Verification & Release
**Goal**: The package passes all quality gates, installs cleanly from a local tarball, and is published to npm as `@xgent-ai/gomad@1.1.0` with v1.0.0 deprecated
**Depends on**: Phase 3
**Requirements**: VFY-01, VFY-02, VFY-03, REL-01, REL-02
**Success Criteria** (what must be TRUE):
  1. `npm run quality` exits 0 (format:check, lint, lint:md, docs:build, test:install, validate:refs, validate:skills all green)
  2. `npm pack --dry-run` shows a clean tarball with no `bmad` branding assets, no `.planning/`, no `test/` -- only shipped files
  3. Fresh install from locally-packed tarball produces a working setup where all `gm-*` skills are loadable
  4. `@xgent-ai/gomad@1.1.0` is published on npm and `@xgent-ai/gomad@1.0.0` is deprecated with redirect message
**Plans**: TBD

Plans:
- [ ] 04-01: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 0/2 | Not started | - |
| 2. Rename | 0/3 | Not started | - |
| 3. Credit, Branding & Docs | 0/2 | Not started | - |
| 4. Verification & Release | 0/1 | Not started | - |
