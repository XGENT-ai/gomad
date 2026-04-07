# Phase 2: Project-Local Install - Research

**Researched:** 2026-04-07
**Domain:** Node.js CLI file operations, project-local installation patterns
**Confidence:** HIGH

## Summary

Phase 2 retargets all gomad install/uninstall operations from `~/.claude/` (global home directory) to `./.claude/` (project-local). The scope is well-defined: rewrite `tools/global-installer.js` as `tools/installer.js`, delete `tools/sync-upstream.js`, remove CLI commands (`sync`, `update`) and flags (`--global-only`, `--global`), rename the `global/` source directory to `assets/`, and update all tests.

The codebase is small and self-contained. The installer is ~320 lines with backup/restore logic that gets stripped entirely, yielding a ~100-line replacement. The CLI has 7 commands dropping to 5. All dependencies (fs, path, yaml, chalk) remain unchanged. No new packages needed.

**Primary recommendation:** Rewrite installer.js from scratch targeting `process.cwd()` + `.claude/`, then surgically update CLI and tests. The `global/` to `assets/` rename is a directory rename plus constant updates in the new installer.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Strip backup/restore system entirely (backupDir, manifest tracking, timestamped backups) -- git is the backup for project-local `.claude/`
- **D-02:** Rewrite `tools/global-installer.js` from scratch as `tools/installer.js` -- clean ~100-line file with install, uninstall, status functions targeting `./.claude/`
- **D-03:** Rename file from `global-installer.js` to `installer.js` -- matches pattern of other tools (curator.js, etc.)
- **D-04:** Remove `sync` command entirely -- delete `tools/sync-upstream.js` and the sync command definition from `bin/gomad-cli.js`
- **D-05:** Remove `update` command -- users re-run `gomad install` instead. Less surface area.
- **D-06:** Remove all global flags: `--global-only` from install, `--global` from uninstall, `--sync` from install. These are global-path concepts that no longer apply.
- **D-07:** Keep package-skills.js and the `package` CLI command -- reading `~/.claude/skills/` is acceptable because it's a development/authoring tool discovering system state, not an install-time tool writing to global paths
- **D-08:** The "no global access" rule (INS-02) applies to **writes** of gomad assets only. Reading `~/.claude/` to discover Claude's state is explicitly allowed.
- **D-09:** Assets ship bundled in the npm package. `gomad install` copies from the package's source directory to `./.claude/` in the current working directory.
- **D-10:** Rename the `global/` source directory to `assets/` -- "global" is misleading now that nothing installs globally
- **D-11:** Install uses merge strategy -- copy/overwrite gomad asset files into `./.claude/` without deleting existing non-gomad files. Safe default that preserves user customizations.

### Claude's Discretion
- Internal implementation of the new installer.js (function signatures, error handling flow)
- Order of operations for CLI command removal
- How uninstall identifies "gomad assets" vs user files in `./.claude/` (lockfile-based, pattern-based, etc.)
- Whether to update `global/` references in existing tests atomically with the rename or as a separate step

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| INS-01 | `gomad install` writes all assets to ./.claude/ (project-local) | New installer.js uses `CLAUDE_DIR = join(process.cwd(), '.claude')` |
| INS-02 | No code references os.homedir(), $HOME, or ~/ for installation targets | Remove homedir import from installer.js; package-skills.js keeps it (read-only, per D-08) |
| INS-03 | Backup/restore system removed from global-installer.js | backupDir(), manifest.backups, timestamped backup logic all stripped in rewrite |
| INS-04 | sync-upstream.js tool removed | Delete file + remove sync command from CLI |
| INS-05 | Manifest file (.gomad-manifest.yaml) written to ./.claude/ within the project | MANIFEST_PATH = join(CLAUDE_DIR, '.gomad-manifest.yaml') where CLAUDE_DIR is project-local |
| INS-06 | `gomad uninstall` removes assets from ./.claude/ | New uninstall function reads manifest from project-local .claude/ |
| TST-02 | Tests verify assets are written to ./.claude/ (project-local) | Test creates temp dir, runs install, asserts files under temp/.claude/ |
| TST-03 | Tests verify no home directory access during install | Static grep assertion: no homedir/HOME references in installer.js |
</phase_requirements>

## Standard Stack

### Core (unchanged)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| fs (node built-in) | Node 18+ | File copy, mkdir, rm, exists checks | No external dependency needed for file ops [VERIFIED: codebase] |
| path (node built-in) | Node 18+ | join, dirname, relative for path construction | Standard Node.js path handling [VERIFIED: codebase] |
| yaml | ^2.7.1 | Parse/stringify lockfile and manifest | Already in dependencies [VERIFIED: package.json] |
| chalk | ^5.4.1 | Colored terminal output for status messages | Already in dependencies [VERIFIED: package.json] |
| commander | ^13.1.0 | CLI command definitions | Already in dependencies [VERIFIED: package.json] |

### No New Dependencies Required
This phase adds no new packages. The rewrite simplifies existing code using the same stack. [VERIFIED: codebase analysis]

## Architecture Patterns

### New Installer Structure (tools/installer.js)
```
tools/installer.js (~100 lines)
  Constants:
    CLAUDE_DIR = join(process.cwd(), '.claude')
    ASSETS_SRC = join(__dirname, '..', 'assets')
    LOCKFILE_PATH = join(process.cwd(), 'gomad.lock.yaml')
    MANIFEST_PATH = join(CLAUDE_DIR, '.gomad-manifest.yaml')

  ASSET_DIRS map:
    rules    → assets/rules    → .claude/rules
    commands → assets/commands  → .claude/commands
    hooks    → assets/hooks     → .claude/scripts/hooks
    agents   → assets/agents    → .claude/agents

  Exports:
    install(options)   — curate if needed, copy assets, write manifest
    uninstall()        — read manifest, remove listed files, remove manifest
    status()           — read manifest, display counts
```

### Key Design Decision: process.cwd() vs __dirname

Two different base paths serve two different purposes:
- **`process.cwd()`** = where user runs `gomad install` = target project root (`.claude/` lives here)
- **`__dirname`** (from `import.meta.url`) = where gomad package lives = source assets (`assets/` lives here)

This is the critical distinction. The old code conflated them because both source and target were relative to the gomad project. Now target is always the user's CWD. [VERIFIED: codebase analysis]

### Lockfile Location Decision

The lockfile (`gomad.lock.yaml`) currently writes to `PROJECT_ROOT` (gomad's own directory). For project-local install, the lockfile should write to `process.cwd()` -- the user's project root -- so each project tracks its own selections. The curator.js currently hardcodes `join(__dirname, '..', 'gomad.lock.yaml')` which points to gomad's package directory. This needs updating to `join(process.cwd(), 'gomad.lock.yaml')`. [VERIFIED: curator.js line 185]

### Manifest Strategy for Uninstall

The manifest (`.gomad-manifest.yaml`) tracks what gomad installed, enabling clean uninstall without touching user files. Structure:

```yaml
installed_at: "2026-04-07T..."
version: "0.1.0"
files:
  rules:
    - common/coding-style.md
    - typescript/patterns.md
  commands:
    - gsd-quick.md
  hooks:
    - gsd-statusline.js
  agents:
    - planner.md
```

Uninstall reads this manifest and removes only listed files. No backup/restore needed. [ASSUMED -- Claude's discretion per CONTEXT.md]

### Directory Rename: global/ to assets/

Physical rename of directory plus constant updates:
- `git mv global/ assets/`
- Update `GLOBAL_SRC` / `GLOBAL_DIR` constants to `ASSETS_SRC` / `ASSETS_DIR`
- Update any test references to `global/`

### CLI Command Topology After Phase 2

| Command | Status | Import |
|---------|--------|--------|
| install | KEPT (rewritten) | `../tools/installer.js` |
| curate | KEPT (unchanged) | `../tools/curator.js` |
| status | KEPT (rewritten) | `../tools/installer.js` |
| uninstall | KEPT (rewritten, no --global flag) | `../tools/installer.js` |
| package | KEPT (unchanged) | `../tools/package-skills.js` |
| mcp | KEPT (unchanged) | inline |
| update | REMOVED (D-05) | -- |
| sync | REMOVED (D-04) | -- |

### Anti-Patterns to Avoid
- **Using homedir() in the new installer:** The entire point is project-local. Use `process.cwd()` for target paths.
- **Deleting the entire .claude/ on uninstall:** Must only remove gomad-tracked files. User may have their own .claude/settings.json or other files.
- **Hardcoding lockfile path to gomad package dir:** Lockfile must be in the user's project, not in node_modules/gomad.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Recursive file copy | Custom traversal | `cpSync(src, dest, { recursive: true })` | Node 18+ built-in, handles edge cases [VERIFIED: Node.js docs] |
| Directory creation | Manual mkdir chain | `mkdirSync(path, { recursive: true })` | Creates all intermediate dirs [VERIFIED: Node.js docs] |
| File tracking for uninstall | Pattern matching on filenames | Manifest YAML listing exact files installed | Deterministic, no false positives |

## Common Pitfalls

### Pitfall 1: Lockfile Location Mismatch
**What goes wrong:** Lockfile writes to gomad's package directory (inside node_modules) instead of user's project root when installed via npx.
**Why it happens:** Current code uses `join(__dirname, '..', 'gomad.lock.yaml')` which resolves to the gomad package directory.
**How to avoid:** Use `join(process.cwd(), 'gomad.lock.yaml')` for lockfile read/write in both curator.js and installer.js.
**Warning signs:** `gomad curate` works but `gomad install` can't find the lockfile.

### Pitfall 2: Forgetting to Update test-module.js Tool List
**What goes wrong:** Test `test-module.js` line 86 asserts existence of `global-installer.js` and `sync-upstream.js`. Both are being removed/renamed.
**Why it happens:** Tests validate file structure; changes to file names must be reflected.
**How to avoid:** Update the tools array to `['curator.js', 'installer.js', 'package-skills.js']`.
**Warning signs:** `npm test` fails on structure validation.

### Pitfall 3: test-installation.js Sync Tests Still Present
**What goes wrong:** Test file has `describe('Integration: sync populates global/')` block that imports sync-upstream.js which no longer exists.
**Why it happens:** Test file not updated to match removed functionality.
**How to avoid:** Remove the sync test block entirely. Replace `--global-only` test with project-local install test.
**Warning signs:** Import error at test load time.

### Pitfall 4: Hooks Directory Path Mismatch
**What goes wrong:** The hooks target is `join(CLAUDE_DIR, 'scripts', 'hooks')` -- note the extra `scripts/` subdirectory. Easy to miss when rewriting.
**Why it happens:** Claude Code expects hooks at `.claude/scripts/hooks/`, not `.claude/hooks/`.
**How to avoid:** Preserve the ASSET_DIRS mapping exactly from the original, just change CLAUDE_DIR base.
**Warning signs:** Hooks not found by Claude Code after install.

### Pitfall 5: Skills Directory Not in ASSET_DIRS
**What goes wrong:** The current installer only handles rules, commands, hooks, agents. Skills are handled separately via package-skills.js and the BMAD module system.
**Why it happens:** Skills have a different installation path (via BMAD module, not direct copy).
**How to avoid:** For Phase 2, keep skills out of the installer. Skills installation is addressed in Phase 3 (BMAD decoupling). The `assets/` directory currently has no `skills/` subdirectory.
**Warning signs:** Users expect `gomad install` to install skills but it only installs rules/commands/hooks/agents.

## Code Examples

### New installer.js Core Structure
```javascript
// Source: Derived from existing global-installer.js patterns [VERIFIED: codebase]
import { existsSync, mkdirSync, cpSync, readFileSync, writeFileSync, rmSync } from 'fs';
import { join, dirname, relative } from 'path';
import { fileURLToPath } from 'url';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CLAUDE_DIR = join(process.cwd(), '.claude');
const ASSETS_SRC = join(__dirname, '..', 'assets');
const LOCKFILE_PATH = join(process.cwd(), 'gomad.lock.yaml');
const MANIFEST_PATH = join(CLAUDE_DIR, '.gomad-manifest.yaml');

const ASSET_DIRS = {
  rules:    { src: join(ASSETS_SRC, 'rules'),    target: join(CLAUDE_DIR, 'rules') },
  commands: { src: join(ASSETS_SRC, 'commands'),  target: join(CLAUDE_DIR, 'commands') },
  hooks:    { src: join(ASSETS_SRC, 'hooks'),     target: join(CLAUDE_DIR, 'scripts', 'hooks') },
  agents:   { src: join(ASSETS_SRC, 'agents'),    target: join(CLAUDE_DIR, 'agents') },
};
```

### Merge-Copy Install Pattern (D-11)
```javascript
// Source: Adapting existing installFiles pattern [VERIFIED: codebase]
function installFiles(srcDir, targetDir) {
  if (!existsSync(srcDir)) return [];
  mkdirSync(targetDir, { recursive: true });
  const files = collectFiles(srcDir);
  for (const file of files) {
    const targetFile = join(targetDir, file);
    mkdirSync(dirname(targetFile), { recursive: true });
    cpSync(join(srcDir, file), targetFile, { force: true });
  }
  return files;
}
// This overwrites existing files but does NOT delete files not in source.
// User's custom files in .claude/ are preserved.
```

### Manifest-Based Uninstall
```javascript
// Source: New pattern replacing backup-restore [ASSUMED]
export function uninstall() {
  const manifest = loadManifest();
  if (!manifest.installed_at) {
    console.log(chalk.yellow('No gomad installation found.'));
    return;
  }
  let removed = 0;
  for (const [assetType, fileList] of Object.entries(manifest.files || {})) {
    const { target } = ASSET_DIRS[assetType];
    for (const file of fileList) {
      const filePath = join(target, file);
      if (existsSync(filePath)) { rmSync(filePath); removed++; }
    }
    // Clean up empty directories after file removal
  }
  rmSync(MANIFEST_PATH, { force: true });
  console.log(chalk.green(`Removed ${removed} gomad files from .claude/`));
}
```

### Test Pattern: Project-Local Verification (TST-02, TST-03)
```javascript
// Source: Adapting existing test patterns [ASSUMED]
import { mkdtempSync } from 'fs';
import { tmpdir } from 'os';

// TST-02: Verify project-local install
it('install writes to ./.claude/', async () => {
  const tmpDir = mkdtempSync(join(tmpdir(), 'gomad-test-'));
  // Run install with cwd set to tmpDir
  // Assert files exist under tmpDir/.claude/
  // Assert no files in homedir()/.claude/ were modified
});

// TST-03: Verify no homedir references in installer
it('installer.js does not reference homedir', () => {
  const src = readFileSync(join(PROJECT_ROOT, 'tools', 'installer.js'), 'utf8');
  assert.ok(!src.includes('homedir'), 'installer must not import homedir');
  assert.ok(!src.includes('$HOME'), 'installer must not reference $HOME');
  assert.ok(!src.includes('~/.claude'), 'installer must not reference ~/.claude/');
});
```

## Files to Modify/Delete Summary

| File | Action | Key Changes |
|------|--------|-------------|
| `tools/global-installer.js` | DELETE | Replaced by installer.js |
| `tools/installer.js` | CREATE | New ~100-line installer targeting .claude/ in cwd |
| `tools/sync-upstream.js` | DELETE | No longer needed (D-04) |
| `bin/gomad-cli.js` | MODIFY | Remove sync/update commands, remove global flags, update imports |
| `global/` | RENAME to `assets/` | `git mv global assets` |
| `tools/curator.js` | MODIFY | Lockfile path: `__dirname` to `process.cwd()` |
| `test/test-installation.js` | REWRITE | Remove sync tests, add project-local assertions |
| `test/test-module.js` | MODIFY | Update tool list assertion (line 86) |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Manifest-based uninstall is sufficient to distinguish gomad files from user files | Architecture Patterns | Medium -- if manifest is lost, uninstall becomes manual. But git tracks .claude/ so low practical risk |
| A2 | Lockfile should move to process.cwd() for project-local semantics | Pitfall 1 | High -- if lockfile stays in package dir, multi-project usage breaks |
| A3 | Empty directory cleanup after uninstall is desirable | Code Examples | Low -- cosmetic, non-functional |

## Open Questions

1. **Lockfile location in curator.js**
   - What we know: Currently hardcoded to gomad package directory
   - What's unclear: Whether curator.js changes are in Phase 2 scope or deferred
   - Recommendation: Include in Phase 2 since installer reads the lockfile and both must agree on location

2. **Skills installation gap**
   - What we know: Current installer handles rules/commands/hooks/agents but not skills. Skills go through package-skills.js + BMAD module.
   - What's unclear: Will Phase 3 (BMAD decoupling) add skills to the installer?
   - Recommendation: Note the gap but don't address in Phase 2. Skills installation is Phase 3's concern.

## Sources

### Primary (HIGH confidence)
- Codebase analysis: `tools/global-installer.js` (322 lines), `tools/sync-upstream.js` (176 lines), `bin/gomad-cli.js` (102 lines)
- Codebase analysis: `tools/curator.js` lockfile writing (line 185)
- Codebase analysis: `test/test-installation.js` (107 lines), `test/test-module.js` (line 86)
- Node.js built-in fs module: cpSync, mkdirSync with recursive option (Node 18+)

### Secondary (MEDIUM confidence)
- CONTEXT.md decisions D-01 through D-11 defining exact scope

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - no new dependencies, verified existing ones in package.json
- Architecture: HIGH - straightforward rewrite with clear before/after from codebase analysis
- Pitfalls: HIGH - derived from actual code analysis of integration points

**Research date:** 2026-04-07
**Valid until:** 2026-05-07 (stable domain, no external dependencies changing)
