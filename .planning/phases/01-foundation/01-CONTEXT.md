# Phase 1: Foundation - Context

**Gathered:** 2026-04-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Establish the package as `@xgent-ai/gomad@1.1.0` with correct metadata, remove all dead code and unused assets, and slim the codebase so Phase 2 (Rename) operates on a clean base. No behavioral changes — only identity, cleanup, and removal.

</domain>

<decisions>
## Implementation Decisions

### Package metadata (PKG-01, PKG-02, PKG-05)
- **D-01:** `name` → `@xgent-ai/gomad`, `version` → `1.1.0`
- **D-02:** `description` → `"GOMAD Orchestration Method for Agile Development"`
- **D-03:** `keywords` → `["gomad", "agile", "ai", "agents", "orchestrator", "development", "methodology"]` (drop `bmad`, add `gomad` first)
- **D-04:** `repository.url` → `git+https://github.com/xgent-ai/gomad.git`
- **D-05:** `author` → `Rockie Guo <rockie@kitmi.com.au>`
- **D-06:** `homepage` → `https://gomad.xgent.ai`, `bugs.url` → `https://github.com/xgent-ai/gomad/issues`
- **D-07:** `publishConfig.access` → `"public"` (already set — verify preserved)

### Binary and scripts (PKG-03, PKG-04)
- **D-08:** `bin` → `{ "gomad": "tools/installer/gomad-cli.js" }` — remove both `bmad` and `bmad-method` aliases entirely. Clean break, no backward compat.
- **D-09:** `main` → `tools/installer/gomad-cli.js`
- **D-10:** Scripts renamed: `bmad:install` → `gomad:install`, `bmad:uninstall` → `gomad:uninstall`, `install:bmad` → `install:gomad`
- **D-11:** Delete dead `rebundle` script (references non-existent `tools/installer/bundlers/bundle-web.js`)

### Dependency audit (full)
- **D-12:** Full audit of both `dependencies` and `devDependencies` — verify each dep is actually imported/used by the codebase. Remove any unused deps. Flag any questionable ones.
- **D-13:** Check for v1.0.0 leftover deps that don't belong in the BMAD-derived codebase.

### External module removal (SLIM-01) — clean restructure
- **D-14:** Delete `tools/installer/external-official-modules.yaml`
- **D-15:** Delete `tools/installer/modules/external-manager.js`
- **D-16:** Clean restructure `tools/installer/modules/official-modules.js` — remove the `ExternalModuleManager` import, constructor initialization, and all fallback branches that call it. Simplify the class so it reads cleanly without dead code paths.

### Builder/web-bundle verification (SLIM-02)
- **D-17:** Confirm `tools/installer/bundlers/` directory does NOT exist (already verified: it doesn't). Delete the `rebundle` script reference (covered by D-11). Grep for any remaining `bundler`/`bundle-web`/`rebundle` references and remove them.

### Dead doc/translation removal (SLIM-03, SLIM-04)
- **D-18:** Delete `README_VN.md`
- **D-19:** Delete `docs/cs/`, `docs/fr/`, `docs/vi-vn/` directories entirely. Keep `docs/` (default English) and `docs/zh-cn/` only.

### Claude's Discretion
- Exact order of operations within each plan (as long as deps are correct)
- Whether to split the dependency audit into its own plan or combine with package.json edits
- How to handle any edge cases discovered during the external module cleanup

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Package identity
- `package.json` — Current package metadata (name, version, bin, scripts, deps) — the primary file being modified
- `.planning/PROJECT.md` §Key Decisions — Locked decisions on naming, versioning, casing

### Research artifacts
- `.planning/research/RENAME_MECHANICS.md` — File-level inventory of what needs renaming (Phase 2 scope, but relevant context for understanding the codebase)
- `.planning/research/CREDIT_AND_NPM.md` — npm publish/deprecate mechanics (Phase 4 scope, but informs publishConfig decisions)

### Requirements
- `.planning/REQUIREMENTS.md` — PKG-01 through PKG-05, SLIM-01 through SLIM-04 definitions

### Files being deleted/modified
- `tools/installer/external-official-modules.yaml` — External modules manifest (to be deleted)
- `tools/installer/modules/external-manager.js` — External module consumer code (to be deleted)
- `tools/installer/modules/official-modules.js` — Must be restructured to remove ExternalModuleManager references

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `tools/installer/modules/official-modules.js` — Core module discovery logic; will be simplified by removing external module fallback paths
- `tools/installer/core/config.js` — Configuration handling that references package metadata

### Established Patterns
- CommonJS modules (`require`/`module.exports`) throughout installer code
- YAML-based configuration files for module manifests
- `package.json` `engines.node >= 20.0.0` constraint

### Integration Points
- `package.json bin` field → `tools/installer/bmad-cli.js` (will become `gomad-cli.js` in Phase 2, but `main` field updated now)
- `official-modules.js` imports `external-manager.js` — this import chain must be cleanly severed
- `publishConfig.access: "public"` already set — no change needed, just verify

</code_context>

<specifics>
## Specific Ideas

No specific requirements — decisions are well-defined from PROJECT.md and requirements.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 01-foundation*
*Context gathered: 2026-04-08*
