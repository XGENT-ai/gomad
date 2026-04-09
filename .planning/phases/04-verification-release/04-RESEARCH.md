# Phase 4: Verification & Release - Research

**Researched:** 2026-04-09
**Domain:** npm packaging, tarball hygiene, E2E install verification, npm publish/deprecate
**Confidence:** HIGH

## Summary

Phase 4 is the shipping gate for GoMad v1.1.0. It has zero new features -- its entire purpose is to verify that prior phases produced a clean, correctly-branded package, then publish it. The work decomposes into four distinct concerns: (1) adding a `files` allowlist to package.json and deleting `.npmignore`, (2) writing verification scripts (tarball contents check + fresh-install E2E), (3) running the full `npm run quality` gate, and (4) executing the manual publish + deprecate workflow.

The npm `files` field is the single most important change. Without it, `.planning/` (51+ files, ~350KB) leaks into the tarball -- confirmed by `npm pack --dry-run` audit during this research. The publish.yaml workflow must be deleted per D-02. npm auth is not currently configured (`npm whoami` returns ENEEDAUTH) -- the operator must run `npm login` or set an `NPM_TOKEN` before publish.

**Primary recommendation:** Implement `files` allowlist first, verify with `npm pack --dry-run`, then layer E2E verification, then run quality gates, then publish manually from `main`.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Manual `npm publish` from local machine using a granular access token with "Bypass 2FA" enabled. No trusted publishing / GitHub Actions OIDC for v1.1.0.
- **D-02:** Delete `.github/workflows/publish.yaml` entirely. CI-based publishing is deferred to a future milestone.
- **D-03:** Create a v1.1.0 git tag on `main` after publish. No GitHub Release -- tag only.
- **D-04:** Add an explicit `files` allowlist to `package.json` covering shipped directories and files: `src/`, `tools/installer/`, `LICENSE`, `README.md`, `README_CN.md`, `CHANGELOG.md`, `TRADEMARK.md`, `CONTRIBUTORS.md`, `CONTRIBUTING.md`. Delete `.npmignore`.
- **D-05:** Write an automated tarball verification script that runs `npm pack --dry-run`, parses output, and asserts: no `.planning/`, no `test/`, no `.github/`, no `bmad` branding assets (`banner-bmad-method.png`), no `docs/` or `website/`. Integrate as a new npm script.
- **D-06:** Scripted E2E test: `npm pack` -> install tarball in a temp directory -> run `gomad install` -> verify all `gm-*` skills load.
- **D-07:** Success bar: parse the generated `.gomad-manifest.yaml` after install. Every skill ID listed must have its `SKILL.md` file present at the expected path.
- **D-08:** Deprecate v1.0.0 AFTER v1.1.0 is published and confirmed installable from npm.
- **D-09:** Merge `next` -> `main` before publish. Publish from `main` checkout. Tag v1.1.0 on `main`.
- **D-10:** Simplified deprecation message: `"Use @xgent-ai/gomad@latest instead."`

### Claude's Discretion
- Exact implementation of the tarball verification script (shell vs Node, integration point with npm scripts)
- E2E test script structure (shell vs Node, temp dir management, cleanup)
- Order of quality gate sub-checks (as long as all 7 pass before publish)
- Whether `test:e2e` is added to the `quality` composite script or kept separate

### Deferred Ideas (OUT OF SCOPE)
- GitHub Actions trusted publishing (OIDC) -- future milestone
- GitHub Release creation
- Prerelease / `next` channel publishing via CI

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| VFY-01 | `npm run quality` passes (format:check + lint + lint:md + docs:build + test:install + validate:refs + validate:skills) | Quality script already wired in package.json; just needs all 7 sub-checks to pass. No new infrastructure needed. |
| VFY-02 | Fresh install from locally-packed tarball produces working setup with all `gm-*` skills loadable | E2E script pattern documented below; depends on `files` allowlist being correct |
| VFY-03 | No residual `bmad`/`BMAD`/`bmm` strings in shipped files (grep clean), excluding LICENSE attribution and CHANGELOG history | Tarball verification script must include a grep-clean assertion; current state shows ~12 files with residual references |
| REL-01 | `@xgent-ai/gomad@1.0.0` deprecated on npm with message pointing to v1.1.0 | `npm deprecate "@xgent-ai/gomad@1.0.0" "Use @xgent-ai/gomad@latest instead."` -- requires auth |
| REL-02 | `@xgent-ai/gomad@1.1.0` published to npm after all verification passes | Manual `npm publish` from `main` branch; `files` allowlist controls tarball contents |

</phase_requirements>

## Standard Stack

### Core

No new library dependencies for this phase. All work uses existing npm CLI tooling and Node.js built-ins.

| Tool | Version | Purpose | Why Standard |
|------|---------|---------|--------------|
| npm CLI | 11.6.2 (installed) | pack, publish, deprecate | Already available; verified via `npm -v` [VERIFIED: local CLI] |
| Node.js | 25.2.1 (installed) | Script execution for verification scripts | Already available; verified via `node -v` [VERIFIED: local CLI] |
| fs-extra | 11.3.0 (already a dep) | Temp dir management in E2E script | Already in package.json dependencies [VERIFIED: package.json] |

### Supporting

| Tool | Version | Purpose | When to Use |
|------|---------|---------|-------------|
| child_process (built-in) | N/A | Run `npm pack --dry-run` and parse output in verification script | Tarball verification script |
| os.tmpdir() (built-in) | N/A | Create temp directory for E2E install test | E2E test script |
| path (built-in) | N/A | Cross-platform path handling | All scripts |

**Installation:** No new packages required.

## Architecture Patterns

### Recommended Project Structure for New Files

```
tools/
├── verify-tarball.js       # Tarball content verification (D-05)
test/
├── test-e2e-install.js     # E2E fresh-install verification (D-06, D-07)
```

### Pattern 1: Node.js Verification Script (recommended over shell)

**What:** Write verification scripts in Node.js, consistent with existing test infrastructure.
**When to use:** Both tarball verification and E2E install test.
**Why Node over shell:** The project is 100% Node.js; existing test files (`test/test-installation-components.js`, `test/test-file-refs-csv.js`) use the same pattern of direct `node script.js` execution with process.exit(1) on failure. Shell scripts would be inconsistent. [VERIFIED: codebase pattern]

**Example -- tarball verification pattern:**
```javascript
// tools/verify-tarball.js
const { execSync } = require('node:child_process');

const output = execSync('npm pack --dry-run --json 2>/dev/null', { encoding: 'utf-8' });
const [pkg] = JSON.parse(output);
const filePaths = pkg.files.map(f => f.path);

// Assert no forbidden paths
const FORBIDDEN = ['.planning/', 'test/', '.github/', 'docs/', 'website/', 'banner-bmad'];
for (const prefix of FORBIDDEN) {
  const matches = filePaths.filter(p => p.startsWith(prefix) || p.includes(prefix));
  if (matches.length > 0) {
    console.error(`FAIL: tarball contains forbidden path "${prefix}": ${matches.join(', ')}`);
    process.exit(1);
  }
}
```
[ASSUMED -- pattern structure; npm pack --json output format needs verification at implementation time]

### Pattern 2: E2E Install Test

**What:** Pack tarball, install in temp dir, run CLI, verify manifest resolution.
**Key steps:**
1. `npm pack` produces `.tgz` file
2. Create temp directory via `fs.mkdtempSync()`
3. `npm init -y` in temp dir
4. `npm install <path-to-tgz>` in temp dir
5. Run `npx gomad install` (or invoke CLI directly) with non-interactive flags
6. Parse generated `.gomad-manifest.yaml` and verify all skill IDs have corresponding `SKILL.md` files
7. Clean up temp dir

**Critical consideration:** The `gomad install` command is interactive (uses @clack/prompts). The E2E test must either:
- Pass `--action quick-update` or similar non-interactive flag (if available)
- Or directly test skill resolution without running the full interactive installer
- Or invoke the Installer class programmatically from the test

[VERIFIED: installer uses @clack/prompts for interactive UI -- see tools/installer/prompts.js]

### Pattern 3: `files` Allowlist in package.json

**What:** The `files` field in package.json is an allowlist of files/directories to include in the tarball. When present, `.npmignore` is ignored.
**Certain files are always included regardless:** `package.json`, `README`, `LICENSE`, `CHANGELOG`. [CITED: npm docs on package.json files field]
**Certain files are always excluded:** `.git`, `node_modules`, `.npmrc`. [CITED: npm docs]

```json
{
  "files": [
    "src/",
    "tools/installer/",
    "LICENSE",
    "README.md",
    "README_CN.md",
    "CHANGELOG.md",
    "TRADEMARK.md",
    "CONTRIBUTORS.md",
    "CONTRIBUTING.md"
  ]
}
```

**Important:** `package.json`, `README.md`, `LICENSE`, and `CHANGELOG.md` are auto-included by npm even without listing them. Listing them explicitly is harmless and makes the allowlist self-documenting. [CITED: npm docs]

### Anti-Patterns to Avoid
- **Publishing from `next` branch:** D-09 requires merge to `main` first, then publish from `main`.
- **Deprecating before confirming publish:** D-08 explicitly requires v1.1.0 to be installable from npm before deprecating v1.0.0.
- **Using `.npmignore` alongside `files`:** When `files` is present, `.npmignore` is not consulted. Delete `.npmignore` to avoid confusion. [CITED: npm docs]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Tarball content listing | Custom tar parsing | `npm pack --dry-run --json` | npm's own JSON output gives exact file list with paths and sizes |
| Temp directory creation | Manual mkdir + random names | `fs.mkdtempSync(path.join(os.tmpdir(), 'gomad-e2e-'))` | OS-managed temp dir, cross-platform |
| YAML parsing in E2E | Regex on manifest file | `yaml` or `js-yaml` (already deps) | Proper YAML parsing for manifest verification |
| npm auth token setup | .npmrc file editing | `npm login` or `NPM_TOKEN` env var | Standard npm auth flow |

## Common Pitfalls

### Pitfall 1: `npm pack --dry-run --json` Output Format
**What goes wrong:** The `--json` flag with `--dry-run` may behave differently across npm versions. Some versions output an array, others an object.
**Why it happens:** npm CLI output format has changed across major versions.
**How to avoid:** Test the exact output format with the installed npm version (11.6.2) before relying on it in scripts. Fall back to parsing the human-readable `npm pack --dry-run` output (line-by-line) if JSON is unreliable.
**Warning signs:** Script fails with JSON parse error. [ASSUMED]

### Pitfall 2: Interactive Installer in E2E
**What goes wrong:** `gomad install` prompts for user input via @clack/prompts, causing the E2E test to hang.
**Why it happens:** The installer is designed for interactive use.
**How to avoid:** Either use a non-interactive code path, or programmatically instantiate the Installer class with pre-set config (similar to how `test/test-installation-components.js` works). [VERIFIED: existing test pattern in test-installation-components.js]
**Warning signs:** E2E script hangs indefinitely.

### Pitfall 3: `files` Field Missing Subdirectories
**What goes wrong:** A directory like `tools/installer/` is listed, but npm may not include nested subdirectories if there's a nested `.npmignore` or `.gitignore`.
**Why it happens:** npm respects `.gitignore` patterns even when `files` is set (for files inside listed directories).
**How to avoid:** Run `npm pack --dry-run` after adding `files` to verify all expected files are included. Check for nested ignore files. [CITED: npm docs]
**Warning signs:** Tarball has fewer files than expected.

### Pitfall 4: npm Auth Not Configured
**What goes wrong:** `npm publish` fails with ENEEDAUTH.
**Why it happens:** No npm token is configured on the local machine.
**How to avoid:** Run `npm whoami` before attempting publish. If it fails, run `npm login` or set `NPM_TOKEN` env var. [VERIFIED: npm whoami currently returns ENEEDAUTH]
**Warning signs:** `npm whoami` fails.

### Pitfall 5: Residual bmad/bmm Strings in Comments
**What goes wrong:** VFY-03 grep finds bmad/bmm in code comments that were missed by Phase 2 text sweep.
**Why it happens:** Comments are easy to miss in automated renames.
**How to avoid:** The verification script should grep all files in the tarball (or in `src/` and `tools/installer/`) for `bmad`/`bmm` patterns, excluding `LICENSE` and `CHANGELOG.md`. Currently ~12 files still have references. [VERIFIED: grep found 12 files with bmad/bmm references in src/ and tools/installer/]
**Warning signs:** VFY-03 assertion fails.

### Pitfall 6: Merging next -> main With Conflicts
**What goes wrong:** `git merge next` on `main` produces conflicts, blocking the publish workflow.
**Why it happens:** `main` may have diverged from `next` if any direct commits were made.
**How to avoid:** Before the publish step, verify `main` is a fast-forward of `next` or resolve conflicts in a separate step. [ASSUMED]
**Warning signs:** Merge conflicts during `git checkout main && git merge next`.

## Code Examples

### Tarball Verification Script Structure
```javascript
// tools/verify-tarball.js
// Source: project convention (test/test-installation-components.js pattern)
const { execSync } = require('node:child_process');
const path = require('node:path');

const FORBIDDEN_PATTERNS = [
  /^\.planning\//,
  /^test\//,
  /^\.github\//,
  /^docs\//,
  /^website\//,
  /banner-bmad/,
];

// npm pack --dry-run outputs lines like:
// npm notice 1.2kB src/core-skills/gm-help/SKILL.md
function verifyTarball() {
  const output = execSync('npm pack --dry-run 2>&1', { encoding: 'utf-8' });
  const lines = output.split('\n')
    .filter(line => line.startsWith('npm notice '))
    .map(line => line.replace(/^npm notice\s+[\d.]+[kKMG]?B\s+/, '').trim())
    .filter(line => line && !line.startsWith('Tarball') && !line.startsWith('name:')
      && !line.startsWith('version:') && !line.startsWith('filename:')
      && !line.startsWith('package size:') && !line.startsWith('unpacked size:')
      && !line.startsWith('shasum:') && !line.startsWith('integrity:')
      && !line.startsWith('total files:'));

  let failures = 0;
  for (const filePath of lines) {
    for (const pattern of FORBIDDEN_PATTERNS) {
      if (pattern.test(filePath)) {
        console.error(`FAIL: forbidden file in tarball: ${filePath}`);
        failures++;
      }
    }
  }

  if (failures > 0) {
    console.error(`\n${failures} forbidden file(s) found in tarball`);
    process.exit(1);
  }
  console.log(`OK: ${lines.length} files in tarball, none forbidden`);
}

verifyTarball();
```

### VFY-03 Grep-Clean Assertion
```javascript
// Can be part of verify-tarball.js or a separate script
const { execSync } = require('node:child_process');

function verifyNoBmadStrings() {
  // Grep shipped directories for bmad/bmm, excluding allowed files
  try {
    const result = execSync(
      'grep -rliE "\\b(bmad|bmm)\\b" src/ tools/installer/ ' +
      '--include="*.js" --include="*.yaml" --include="*.md" --include="*.json" --include="*.csv" ' +
      '| grep -v "CHANGELOG.md" | grep -v "LICENSE"',
      { encoding: 'utf-8' }
    );
    const files = result.trim().split('\n').filter(Boolean);
    if (files.length > 0) {
      console.error('FAIL: residual bmad/bmm references found in:');
      files.forEach(f => console.error(`  ${f}`));
      process.exit(1);
    }
  } catch {
    // grep returns exit 1 when no matches -- that's success
    console.log('OK: no residual bmad/bmm strings in shipped files');
  }
}
```

### npm Scripts Integration
```json
{
  "scripts": {
    "test:tarball": "node tools/verify-tarball.js",
    "test:e2e": "node test/test-e2e-install.js"
  }
}
```

### Publish Sequence (Manual Steps)
```bash
# 1. Merge next -> main
git checkout main
git merge next

# 2. Run all quality gates
npm run quality

# 3. Run tarball verification
npm run test:tarball

# 4. Run E2E install test
npm run test:e2e

# 5. Authenticate (if needed)
npm login  # or export NPM_TOKEN=<token>

# 6. Publish
npm publish

# 7. Verify publish succeeded
npm view @xgent-ai/gomad@1.1.0

# 8. Deprecate v1.0.0
npm deprecate "@xgent-ai/gomad@1.0.0" "Use @xgent-ai/gomad@latest instead."

# 9. Tag
git tag v1.1.0
git push origin main --tags
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `.npmignore` blocklist | `files` allowlist in package.json | npm best practice (years stable) | Allowlist is safer -- only listed files ship |
| `npm publish` with classic automation tokens | Granular access tokens with "Bypass 2FA" | npm deprecated classic tokens Dec 2025 | Must use granular token for automation [CITED: CLAUDE.md] |
| CI/CD trusted publishing (OIDC) | Manual publish for v1.1.0 | D-01 locks this | Deferred to future milestone |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `npm pack --dry-run --json` output is a JSON array with `files` property on npm 11.6.2 | Code Examples / Pitfall 1 | Script needs fallback to text parsing; LOW risk -- text parsing pattern also provided |
| A2 | `git merge next` on `main` will be a fast-forward | Pitfall 6 | Could have merge conflicts; MEDIUM risk -- verify before publish |
| A3 | `gomad install` has a non-interactive code path or can be invoked programmatically | Pitfall 2 / E2E pattern | E2E script may need to use Installer class directly instead of CLI; already precedent in test-installation-components.js |

## Open Questions

1. **Interactive installer in E2E**
   - What we know: The installer uses @clack/prompts for interactive UI. `test/test-installation-components.js` already tests components programmatically.
   - What's unclear: Whether `gomad install` accepts flags for non-interactive operation (e.g., `--action quick-update`, `--yes`, `--non-interactive`).
   - Recommendation: At implementation time, check the CLI command parser for non-interactive flags. If none exist, follow the pattern from `test-installation-components.js` and instantiate the Installer class directly with pre-set config.

2. **Current state of VFY-03 compliance**
   - What we know: 12 files in `src/` and `tools/installer/` still contain `bmad`/`bmm` references (mostly in comments like "BMM, BMB, etc.").
   - What's unclear: Whether Phase 2 plans address all of these, or if Phase 4 will discover them as failures.
   - Recommendation: VFY-03 verification script should flag these. If they persist when Phase 4 executes, they need fixing before publish.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | All scripts | Yes | 25.2.1 | -- |
| npm CLI | pack, publish, deprecate | Yes | 11.6.2 | -- |
| npm auth | publish, deprecate | No (ENEEDAUTH) | -- | `npm login` before publish step |
| git | merge, tag | Yes | (system) | -- |

**Missing dependencies with no fallback:**
- npm auth: Operator must run `npm login` or configure `NPM_TOKEN` env var before the publish/deprecate steps. This is a manual prerequisite, not a script-automatable step.

**Missing dependencies with fallback:**
- None.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Custom Node.js test runner (assert + process.exit pattern) |
| Config file | None -- scripts run directly via `node` |
| Quick run command | `npm run test:tarball` |
| Full suite command | `npm run quality && npm run test:tarball && npm run test:e2e` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| VFY-01 | All 7 quality sub-checks pass | integration | `npm run quality` | Yes (existing) |
| VFY-02 | Fresh install from tarball works, gm-* skills load | e2e | `npm run test:e2e` | No -- Wave 0 |
| VFY-03 | No bmad/bmm strings in shipped files | smoke | `npm run test:tarball` (includes grep assertion) | No -- Wave 0 |
| REL-01 | v1.0.0 deprecated on npm | manual-only | `npm view @xgent-ai/gomad@1.0.0` (check deprecation notice) | N/A -- manual |
| REL-02 | v1.1.0 published and installable | manual-only | `npm view @xgent-ai/gomad@1.1.0` + `npm install @xgent-ai/gomad@1.1.0` in temp dir | N/A -- manual |

### Sampling Rate
- **Per task commit:** `npm run test:tarball`
- **Per wave merge:** `npm run quality && npm run test:tarball && npm run test:e2e`
- **Phase gate:** Full suite green + manual publish/deprecate verified

### Wave 0 Gaps
- [ ] `tools/verify-tarball.js` -- covers VFY-03 (tarball hygiene + grep-clean)
- [ ] `test/test-e2e-install.js` -- covers VFY-02 (fresh install verification)
- [ ] `package.json` `files` field -- prerequisite for tarball to be correct
- [ ] `package.json` scripts: `test:tarball`, `test:e2e`

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | -- |
| V3 Session Management | No | -- |
| V4 Access Control | No | -- |
| V5 Input Validation | No | -- |
| V6 Cryptography | No | -- |

This phase has no user-facing attack surface. The security concern is npm token handling:

### Known Threat Patterns for npm publish

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| npm token leakage in git | Information Disclosure | Never commit `.npmrc` with tokens; use `npm login` interactively or `NPM_TOKEN` env var |
| Publishing unintended files (secrets, .env) | Information Disclosure | `files` allowlist in package.json; verify with `npm pack --dry-run` before publish |
| Supply chain: publishing malicious code | Tampering | Manual review of tarball contents before publish; `npm pack --dry-run` |

## Sources

### Primary (HIGH confidence)
- `package.json` -- current scripts, dependencies, no `files` field [VERIFIED: read directly]
- `.npmignore` -- current exclusion list, 38 lines [VERIFIED: read directly]
- `npm pack --dry-run` output -- 811 files, 15.4MB unpacked, `.planning/` leaking [VERIFIED: ran locally]
- `npm whoami` -- returns ENEEDAUTH [VERIFIED: ran locally]
- `npm view @xgent-ai/gomad versions` -- only v1.0.0 published [VERIFIED: ran locally]
- `test/test-installation-components.js` -- existing test pattern [VERIFIED: read directly]
- `tools/validate-skills.js` -- existing skill validation [VERIFIED: read directly]
- `.github/workflows/publish.yaml` -- BMAD-branded, references `bmad-code-org/BMAD-METHOD` [VERIFIED: read directly]

### Secondary (MEDIUM confidence)
- npm docs on `files` field behavior (auto-includes, interaction with .gitignore) [CITED: npm help output]
- npm docs on `deprecate` command syntax [CITED: npm help output]

### Tertiary (LOW confidence)
- `npm pack --dry-run --json` output format for npm 11.6.2 [ASSUMED -- needs verification at implementation time]

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new dependencies; all tools verified locally
- Architecture: HIGH -- follows existing codebase patterns (Node.js scripts, npm scripts orchestration)
- Pitfalls: HIGH -- most pitfalls verified empirically (npm auth, tarball leaks, residual strings)

**Research date:** 2026-04-09
**Valid until:** 2026-05-09 (stable domain; npm CLI behavior unlikely to change)
