# Requirements: GOMAD

**Defined:** 2026-04-07
**Core Value:** One command gives any project a curated, project-local Claude Code environment without touching global config.

## v1 Requirements

### Rename

- [ ] **REN-01**: Package name is "gomad" in package.json with correct description (GOMAD Orchestration Method for Agile Development)
- [ ] **REN-02**: CLI binary is "gomad" (bin field in package.json points to bin/gomad-cli.js)
- [ ] **REN-03**: CLI entry file renamed from mobmad-cli.js to gomad-cli.js with all internal references updated
- [ ] **REN-04**: Lock file renamed from mobmad.lock.yaml to gomad.lock.yaml
- [ ] **REN-05**: Manifest file renamed from .mobmad-manifest.yaml to .gomad-manifest.yaml
- [ ] **REN-06**: All string literals, comments, logs, and help text reference "gomad" instead of "mobmad"

### Install Target

- [ ] **INS-01**: `gomad install` writes all assets to ./.claude/ (project-local) instead of ~/.claude/ (global)
- [ ] **INS-02**: No code references os.homedir(), $HOME, or ~/ for installation targets
- [ ] **INS-03**: Backup/restore system removed from global-installer.js (no timestamped backups)
- [ ] **INS-04**: sync-upstream.js tool removed (no longer syncing from ~/.claude/)
- [ ] **INS-05**: Manifest file (.gomad-manifest.yaml) written to ./.claude/ within the project
- [ ] **INS-06**: `gomad uninstall` removes assets from ./.claude/ instead of ~/.claude/

### BMAD Decoupling

- [ ] **BMA-01**: bmad-method peer dependency removed from package.json
- [ ] **BMA-02**: BMAD module registration code removed (module.yaml integration)
- [ ] **BMA-03**: package-skills.js BMAD manifest generation removed (skill copying retained if needed)
- [ ] **BMA-04**: BMAD-specific agents in src/module/agents/ converted to regular agents (no BMAD integration layer)
- [ ] **BMA-05**: No runtime code imports or references bmad-method packages

### Publishing

- [x] **PUB-01**: package.json configured for private npm registry publication
- [x] **PUB-02**: `npx gomad install` works end-to-end on a fresh project (writes ./.claude/ with selected assets)
- [x] **PUB-03**: `npx gomad install --preset full --yes` works non-interactively

### Testing

- [ ] **TST-01**: All existing tests updated to reference gomad instead of mobmad
- [ ] **TST-02**: Tests verify assets are written to ./.claude/ (project-local) not ~/.claude/
- [ ] **TST-03**: Tests verify no home directory access during install
- [x] **TST-04**: All tests pass with the project test runner (`npm test`)

## v2 Requirements

### Cross-Project Sharing

- **SHR-01**: User can export current .claude/ config as a portable bundle
- **SHR-02**: User can import a bundle into a new project's .claude/

### Enhanced Curation

- **CUR-01**: User can create custom presets and save to catalog
- **CUR-02**: User can diff current .claude/ against a preset

## Out of Scope

| Feature | Reason |
|---------|--------|
| Global installation to ~/.claude/ | Core design change — project-local only |
| BMAD-METHOD integration | Dropping dependency entirely |
| Backup/restore on install | Git handles versioning for project-local files |
| MCP server auto-configuration | Defer — security-sensitive, users opt-in manually |
| Template export/import | v2 feature, each project runs gomad install independently |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| REN-01 | Phase 1 | Pending |
| REN-02 | Phase 1 | Pending |
| REN-03 | Phase 1 | Pending |
| REN-04 | Phase 1 | Pending |
| REN-05 | Phase 1 | Pending |
| REN-06 | Phase 1 | Pending |
| INS-01 | Phase 2 | Pending |
| INS-02 | Phase 2 | Pending |
| INS-03 | Phase 2 | Pending |
| INS-04 | Phase 2 | Pending |
| INS-05 | Phase 2 | Pending |
| INS-06 | Phase 2 | Pending |
| BMA-01 | Phase 3 | Pending |
| BMA-02 | Phase 3 | Pending |
| BMA-03 | Phase 3 | Pending |
| BMA-04 | Phase 3 | Pending |
| BMA-05 | Phase 3 | Pending |
| PUB-01 | Phase 4 | Complete |
| PUB-02 | Phase 4 | Complete |
| PUB-03 | Phase 4 | Complete |
| TST-01 | Phase 1 | Pending |
| TST-02 | Phase 2 | Pending |
| TST-03 | Phase 2 | Pending |
| TST-04 | Phase 4 | Complete |

**Coverage:**
- v1 requirements: 20 total
- Mapped to phases: 20
- Unmapped: 0 ✓

---
*Requirements defined: 2026-04-07*
*Last updated: 2026-04-07 after initial definition*
