# Roadmap: GOMAD

## Overview

Transform the existing mobmad CLI into gomad: rename all references, retarget installation from global to project-local, strip BMAD-METHOD coupling, and verify the full end-to-end workflow publishes correctly to a private registry. Each phase builds on the previous, progressing from cosmetic rename through behavioral changes to final integration verification.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Rename** - Replace all mobmad references with gomad across package, CLI, files, and strings
- [ ] **Phase 2: Project-Local Install** - Retarget all install/uninstall operations from ~/.claude/ to ./.claude/
- [ ] **Phase 3: BMAD Decoupling** - Remove BMAD-METHOD dependency, registration system, and integration layers
- [ ] **Phase 4: Publish and Verify** - Configure private registry publication and verify end-to-end workflows

## Phase Details

### Phase 1: Rename
**Goal**: The CLI is fully rebranded as gomad with no trace of mobmad in code, filenames, or output
**Depends on**: Nothing (first phase)
**Requirements**: REN-01, REN-02, REN-03, REN-04, REN-05, REN-06, TST-01
**Success Criteria** (what must be TRUE):
  1. Running `node bin/gomad-cli.js --help` shows "gomad" in all help text with no mention of "mobmad"
  2. Lock file is named gomad.lock.yaml and manifest is named .gomad-manifest.yaml
  3. package.json name field is "gomad" and bin field points to bin/gomad-cli.js
  4. All tests pass with vitest after renaming (test files reference gomad, not mobmad)
**Plans:** 4 plans

Plans:
- [x] 01-01-PLAN.md -- Rename files/directories and update all string content (mobmad->gomad, strip bmad- prefix)
- [x] 01-02-PLAN.md -- Update test files and verify full test suite passes
- [x] 01-03-PLAN.md -- Gap closure: update CLAUDE.md stale mobmad references and delete mobmad.lock.yaml
- [x] 01-04-PLAN.md -- Gap closure: delete leftover mobmad.lock.yaml from project root

### Phase 2: Project-Local Install
**Goal**: All asset installation targets ./.claude/ within the project directory, with no global home directory access
**Depends on**: Phase 1
**Requirements**: INS-01, INS-02, INS-03, INS-04, INS-05, INS-06, TST-02, TST-03
**Success Criteria** (what must be TRUE):
  1. Running `gomad install` creates assets under ./.claude/ in the current working directory
  2. Running `gomad uninstall` removes assets from ./.claude/ in the current working directory
  3. No code path references os.homedir(), $HOME, or ~/ for installation targets
  4. Backup/restore logic is removed and sync-upstream.js no longer exists
  5. Tests verify project-local paths and assert no home directory access
**Plans:** 2 plans

Plans:
- [x] 02-01-PLAN.md -- Rewrite installer for project-local ./.claude/, delete sync/global-installer, rename global/ to assets/, update CLI
- [x] 02-02-PLAN.md -- Update test files for project-local verification and new file structure

### Phase 3: BMAD Decoupling
**Goal**: All BMAD-METHOD dependencies and integration code are removed; BMAD agents are preserved as regular agents
**Depends on**: Phase 2
**Requirements**: BMA-01, BMA-02, BMA-03, BMA-04, BMA-05
**Success Criteria** (what must be TRUE):
  1. package.json has no bmad-method in dependencies or peerDependencies
  2. No source file imports or references bmad-method packages at runtime
  3. Agents previously under src/module/agents/ work as standalone agents without BMAD integration layer
  4. package-skills.js BMAD manifest generation is removed (skill copying retained)
**Plans:** 4 plans

Plans:
- [x] 03-01-PLAN.md -- Audit src/module/skills/ references (D-07 verdict artifact)
- [x] 03-02-PLAN.md -- Migrate 16 ex-BMAD agents to assets/agents/ + update catalog/agents.yaml + catalog/presets.yaml
- [x] 03-03-PLAN.md -- Delete src/module/, tools/package-skills.js, package CLI command, peerDependencies; fix package.json files array; npm install
- [x] 03-04-PLAN.md -- Replace BMAD-coupled tests with test-decoupling.js guardrail (D-13)

### Phase 4: Publish and Verify
**Goal**: gomad is publishable to private npm and works end-to-end via npx on a fresh project
**Depends on**: Phase 3
**Requirements**: PUB-01, PUB-02, PUB-03, TST-04
**Success Criteria** (what must be TRUE):
  1. package.json is configured for private npm registry (publishConfig or private field)
  2. `npx gomad install` on a fresh project creates a populated ./.claude/ directory with selected assets
  3. `npx gomad install --preset full --yes` completes non-interactively without errors
  4. Full test suite passes with vitest (all 20 requirements verified)
**Plans**: TBD

Plans:
- [ ] 04-01: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Rename | 3/4 | In progress | - |
| 2. Project-Local Install | 0/2 | Not started | - |
| 3. BMAD Decoupling | 0/4 | Not started | - |
| 4. Publish and Verify | 0/1 | Not started | - |
