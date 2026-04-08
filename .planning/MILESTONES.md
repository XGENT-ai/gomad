# Milestones

## v1.0 MVP — Standalone gomad (Shipped: 2026-04-08)

**Delivered:** A standalone, project-local Claude Code curator (`@xgent-ai/gomad@1.0.0`) — one command installs curated skills, agents, rules, hooks, and commands into `./.claude/`, with no global writes and no BMAD dependency.

**Phases completed:** 4 phases, 12 plans, 19 tasks

### Key Accomplishments

1. **Phase 1 — Rename:** Complete mobmad → gomad rebrand across CLI, package.json, 5 catalogs, agent directories, skill manifests, and all tests. Lockfile and manifest renamed (`gomad.lock.yaml`, `.gomad-manifest.yaml`).
2. **Phase 2 — Project-Local Install:** Rewrote installer to target `./.claude/` instead of `~/.claude/`. Removed backup/restore system (git is the backup). Removed `sync-upstream.js`. CLI simplified to project-local commands only.
3. **Phase 3 — BMAD Decoupling:** Stripped `bmad-method` peer dependency, removed module/manifest generation layer, deleted `package-skills.js`. Former BMAD agents preserved as regular Claude Code agents.
4. **Phase 4 — Publish and Verify:** Configured `package.json` for public npm publish as `@xgent-ai/gomad@1.0.0` with `publishConfig.access=public`. Added hermetic E2E publish test (`test/test-publish-e2e.js`) that packs the tarball, installs into a temp dir, and asserts a populated `./.claude/` tree. Documentation set generated (`docs/ARCHITECTURE.md`, `CONFIGURATION.md`, `GETTING-STARTED.md`, `DEVELOPMENT.md`, `TESTING.md`).

### Stats

- **Tests:** 28/28 passing (`npm test` via `node --test`, ~1.5s)
- **Package size:** 116 kB (119 files), `npm pack --dry-run` clean — only `bin/`, `assets/`, `catalog/`, `tools/`, `README.md`, `package.json`
- **Dependencies:** 5 runtime (`commander`, `@clack/prompts`, `yaml`, `fs-extra`, `chalk`) — `bmad-method` peer dependency removed

### Key Decisions

| Decision | Outcome |
|----------|---------|
| D-01 (Phase 4): Public npm as `@xgent-ai/gomad` (reversed private-only constraint) | ✓ Configured |
| D-04/D-05 (Phase 4): `node --test` is the test runner (not vitest) | ✓ Confirmed |
| Project-local only (`./.claude/`), no `~/` writes | ✓ Implemented Phase 2 |
| Drop BMAD-METHOD peer dependency | ✓ Implemented Phase 3 |
| No backup/restore system (git tracks `./.claude/`) | ✓ Implemented Phase 2 |

### Known Gaps (Deferred Human Gates)

These items are intentional manual gates, not implementation gaps. They are tracked in `.planning/phases/04-publish-and-verify/04-HUMAN-UAT.md` for resolution after release prerequisites are met.

- [ ] **Run `npm publish`** — requires `@xgent-ai` scope ownership and an authenticated `npm whoami`. Phase 4 scope was "publishable", not "published".
- [ ] **Post-publish smoke test** — on a clean machine with no local checkout, run `npx @xgent-ai/gomad install --preset full --yes` and confirm `./.claude/` is populated. Requires the package to exist on the registry first.

### Documentation Drift Cleanup (Low Priority)

- `README.md` head section contains stale pre-rebrand facts (flagged inline with a VERIFY block during Phase 4 docs generation). Either supplement manually or regenerate with `/gsd-docs-update --force`.

---
