---
phase: 10-story-creation-enhancements
reviewed: 2026-04-25T00:00:00Z
depth: standard
files_reviewed: 22
files_reviewed_list:
  - tools/validate-kb-licenses.js
  - tools/installer/core/install-paths.js
  - tools/installer/core/installer.js
  - test/test-domain-kb-install.js
  - package.json
  - src/gomad-skills/4-implementation/gm-create-story/discover-inputs.md
  - src/gomad-skills/4-implementation/gm-create-story/workflow.md
  - src/gomad-skills/4-implementation/gm-discuss-story/SKILL.md
  - src/gomad-skills/4-implementation/gm-discuss-story/workflow.md
  - src/gomad-skills/4-implementation/gm-discuss-story/template.md
  - src/gomad-skills/4-implementation/gm-discuss-story/checklist.md
  - src/gomad-skills/4-implementation/gm-discuss-story/discover-inputs.md
  - src/gomad-skills/4-implementation/gm-domain-skill/SKILL.md
  - src/gomad-skills/4-implementation/gm-domain-skill/workflow.md
  - src/gomad-skills/4-implementation/gm-domain-skill/template.md
  - src/gomad-skills/4-implementation/gm-domain-skill/checklist.md
  - src/gomad-skills/4-implementation/gm-domain-skill/discover-inputs.md
  - src/domain-kb/testing/SKILL.md
  - src/domain-kb/testing/anti-patterns.md
  - src/domain-kb/architecture/SKILL.md
  - src/domain-kb/architecture/anti-patterns.md
findings:
  critical: 0
  warning: 6
  info: 5
  total: 11
status: issues_found
---

# Phase 10: Code Review Report

**Reviewed:** 2026-04-25
**Depth:** standard
**Files Reviewed:** 22
**Status:** issues_found

## Summary

Phase 10 ships six changes: a release-gate KB license validator, an installer path for `src/domain-kb/* → _config/kb/*` with idempotent manifest tracking, two new task-skills (`gm-discuss-story`, `gm-domain-skill`), a 2-file patch to `gm-create-story`, and 18 seed KB pack files. Overall the implementation is solid and security-conscious — the traversal guard on `gm-domain-skill`, the release-gate posture of `validate-kb-licenses`, and the prose-parity specs for BM25/Levenshtein are all well thought through. No CRITICAL findings.

Six WARNINGS and five INFO items were surfaced, clustered in four areas:

1. **Installer KB copy (`_installDomainKb`)** — non-`.md` assets in source packs are copied to disk but not tracked in the manifest, creating orphans that survive uninstall; and user-modified files under `_config/kb/` are overwritten silently because `detectCustomFiles` unconditionally skips the whole `_config/` subtree.
2. **gm-domain-skill discovery** — no guard for a pack directory that exists but yields zero `.md` files (would divide by zero in BM25 `avg_doc_len`); also an ambiguous contract between `pack_found=true` and an empty catalog.
3. **validate-kb-licenses** — reads files via `fs.readFileSync` without a symlink-escape guard; a malicious PR could point a `src/domain-kb/foo.md` symlink outside the tree.
4. **gm-create-story step 3b integration** — the "Accept all three outcomes silently" note may be mis-interpreted by an LLM executor because Mode D explicitly says HALT. The contract needs a clearer "when gm-domain-skill halts, catch-and-continue" directive.

Plus smaller issues around empty-catalog edge cases, checklist gaps in the idempotency test, and one workflow-flow ambiguity in `gm-discuss-story` step 2.

---

## Warnings

### WR-01: `_installDomainKb` leaves non-`.md` assets untracked in manifest

**File:** `tools/installer/core/installer.js:752-759`

**Issue:** The copy uses `fs.copy(srcKbDir, paths.kbDir, { overwrite: true })` which copies EVERY file under `src/domain-kb/` (images, JSON, YAML, etc.), but the subsequent tracking loop only globs `**/*.md` for inclusion in `this.installedFiles`. Any non-`.md` asset that a future pack ships (e.g., an image referenced from an example) would land on disk but NOT appear in `files-manifest.csv`. That creates two downstream problems:

1. **Cleanup planner drift** — stale non-`.md` files from a removed pack would never be snapshotted/removed on re-install because they're not in the prior manifest (Phase 7 cleanup is manifest-driven).
2. **Uninstall leak** — `gomad uninstall` leaves orphan files behind that the user has no record of.

Today all 18 seed files are `.md`, so the bug is latent. It becomes real the first time a pack ships a non-`.md` asset.

**Fix:** Either (a) restrict `fs.copy` to `.md` files via a filter function, or (b) track ALL copied files, not just `.md`:

```javascript
// Option B (safer — manifest stays authoritative)
const copiedFiles = globSync('**/*', { cwd: paths.kbDir, absolute: true, nodir: true });
for (const filePath of copiedFiles) {
  this.installedFiles.add(filePath);
}
```

Also consider documenting the contract: "KB packs may ONLY contain `.md` files" (then add a validator rule KB-08 and enforce in `validate-kb-licenses.js`).

---

### WR-02: User-modified KB files overwritten without backup

**File:** `tools/installer/core/installer.js:752` + `tools/installer/core/installer.js:934`

**Issue:** `detectCustomFiles` (line 934) has a blanket `continue` that skips the entire `_config/` subtree when walking for user customizations — with the sole exception of `_config/agents/**/*.customize.yaml`. That means any user edit to a file under `_config/kb/` (for example, a user adding a project-specific anti-pattern to `_config/kb/testing/anti-patterns.md`) is:

- NOT classified as a modified file
- NOT snapshotted to `_backups/`
- Silently clobbered on the next `gomad install` because `_installDomainKb` does `fs.copy(..., { overwrite: true })`

The Phase 7 cleanup-planner would catch content drift for files listed in the manifest IF the manifest row's hash mismatches current disk content — but the `_config/` skip at line 934 means the detection never reaches the KB directory in the first place.

The test `test-domain-kb-install.js` does not exercise this path (it tests only fresh-install and pristine re-install).

**Fix:** Add `_config/kb/` as a second exception alongside the `.customize.yaml` carve-out, OR decide deliberately that KB content is "install-managed, never user-edited" and document this in the pack contract (and add a marker file like `DO_NOT_EDIT.txt`). The current behavior is neither — silent data loss.

```javascript
// Option 1: treat _config/kb/ like other tracked files
if (relativePath.startsWith('_config/kb/') || relativePath.startsWith('_config\\kb\\')) {
  // Fall through to the normal manifest-hash comparison below
} else if (relativePath.startsWith('_config/') || relativePath.startsWith('_config\\')) {
  // ... existing .customize.yaml handling ...
  continue;
}
```

---

### WR-03: `gm-domain-skill` has no guard for empty-but-present pack directory

**File:** `src/gomad-skills/4-implementation/gm-domain-skill/discover-inputs.md:31-35` + `src/gomad-skills/4-implementation/gm-domain-skill/workflow.md:82-122`

**Issue:** Step 3 of `discover-inputs.md` says "If `{pack_dir}` exists AND is a non-empty directory: set `{pack_found}` = true". But a directory containing ONLY `.` or `_` prefixed subdirectories (which the walker SKIPS per line 33) is non-empty on disk yet yields `{pack_files}` = `[]`. Downstream:

- Step 4 (BM25, Mode A): `N = |{pack_files_abs}| = 0`, so `{avg_doc_len} = mean([])` is undefined/NaN, and the sort has no top file. The LLM executor has no guidance for this case and may hallucinate a "best match" or return NaN in the citation footer.
- Step 5 (Catalog, Mode B): loop over `{pack_files}` emits only the header/footer with zero content lines. Caller sees a technically-valid but misleading output implying the pack is installed and empty.

The checklist Mode B item "Line count matches |{pack_files}| (no silently dropped files)" correctly covers empty, but there's no guard at the branch point to route empty packs to a fifth "pack installed but empty" signal.

**Fix:** In `discover-inputs.md` Step 3, add a sub-case: if `{pack_dir}` exists but after filtering `{pack_files}` is empty, treat it as `{pack_found}` = false (or add a new state `{pack_empty}` = true) so Step 3 of `workflow.md` routes to step 6 (Levenshtein) or emits an explicit "pack installed but empty" message. Also add an explicit pre-check in Step 4: `if N == 0 then GOTO step 6`.

---

### WR-04: `validate-kb-licenses.js` follows symlinks without bound check

**File:** `tools/validate-kb-licenses.js:110-114` + `tools/validate-kb-licenses.js:118-132`

**Issue:** `discoverKbFiles` uses `globSync('src/domain-kb/**/*.md', { cwd: PROJECT_ROOT, absolute: true })` and `safeReadFile` uses `fs.readFileSync`. `globSync` defaults follow symlinks, and `readFileSync` resolves the symlink target transparently. A malicious PR could land a file like `src/domain-kb/architecture/leaked.md` as a symlink pointing to `/etc/passwd` or to a file outside the repo. The validator would:

- Successfully "validate" the foreign file's frontmatter (which would likely fail, producing noisy CRITICAL findings)
- Surface the foreign file's content indirectly via the `detail` / `fix` fields in findings (minor info disclosure)

The DMCA/IP posture that motivates this validator is undermined if the file paths it reports don't correspond to bytes that actually live in the repo.

**Fix:** Reject symlinks during discovery:

```javascript
function discoverKbFiles() {
  if (!fs.existsSync(KB_DIR)) return [];
  const matches = globSync('src/domain-kb/**/*.md', {
    cwd: PROJECT_ROOT,
    absolute: true,
    follow: false,
  });
  // Drop any entry that's a symlink or whose realpath escapes KB_DIR
  const safe = [];
  for (const p of matches) {
    const lstat = fs.lstatSync(p, { throwIfNoEntry: false });
    if (!lstat || lstat.isSymbolicLink()) continue;
    const real = fs.realpathSync(p);
    if (!real.startsWith(KB_DIR + path.sep)) continue;
    safe.push(p);
  }
  return safe.sort();
}
```

Add a LOW/MEDIUM finding when a symlink is detected so the PR author gets a clear diagnostic, rather than silently dropping the file.

---

### WR-05: `gm-create-story` step 3b contract with `gm-domain-skill` is ambiguous

**File:** `src/gomad-skills/4-implementation/gm-create-story/workflow.md:267-287`

**Issue:** Step 3b says:

> gm-domain-skill returns a single best-matching .md file's full content per D-08, or a "no match" message per D-10, or a "did you mean" fallback per D-11. Accept all three outcomes silently — no fatal branches.

But Mode D in `gm-domain-skill/workflow.md:168` says `<action>HALT (non-success signal — caller decides whether to retry with a suggested slug).</action>` An LLM executor reading step 3b will invoke gm-domain-skill as a sub-workflow; when that sub-workflow HALTs, the executor may interpret "HALT" as "stop the parent workflow" rather than "return non-success to caller". The phrase "no fatal branches" is advisory, not enforceable — there's no explicit try/catch idiom in the workflow DSL.

Secondary issue: step 3b's pre-check `<check if="no relevant domain slugs match any installed pack">` depends on reading `<installRoot>/_config/kb/` directory listing, but the workflow doesn't define how `<installRoot>` is resolved in the gm-create-story context (it IS defined in gm-domain-skill, but gm-create-story runs independently).

**Fix:** (a) Rename Mode D's action from "HALT" to "RETURN Mode D to caller" in `gm-domain-skill/workflow.md`, OR add an explicit guard to `gm-create-story` step 3b: "If gm-domain-skill returns Mode C or Mode D, swallow the non-success result and set the slug's snippet to empty string; continue with the next slug." (b) Copy the `<installRoot>` resolution block from `gm-domain-skill/workflow.md` into `gm-create-story/workflow.md` Paths section.

---

### WR-06: `test-domain-kb-install.js` does not verify claimed idempotency properties

**File:** `test/test-domain-kb-install.js:155-173`

**Issue:** The test comment (line 7-8) claims "Re-install is idempotent — no duplicate manifest rows, no drift in row count". The test verifies row count stability (line 162) and path uniqueness (line 170), which is good. But the stated idempotency contract in `_installDomainKb` (file header, line 728-729) is stronger:

> manifest-v2 cleanup-planner sees identical-hash entries and produces zero remove/snapshot work

The test does NOT check:

1. Whether a new `_backups/<ts>/` directory was created on re-install (should be zero — identical content means no snapshot)
2. Whether file hashes in the manifest are byte-for-byte identical between the two installs (checking path and install_root isn't enough — a pipeline change that re-writes bytes with different line endings would silently break idempotency)

**Fix:** Add two assertions after the second install:

```javascript
// Assertion 5: no new backup directory created by the idempotent re-install
const backupsDir = path.join(gomadDir, '_backups');
const backupsBefore = /* snapshot ls before second install */;
const backupsAfter = fs.existsSync(backupsDir) ? fs.readdirSync(backupsDir) : [];
assert(
  backupsAfter.length === backupsBefore.length,
  'Re-install produces no new _backups/<ts>/ directory',
);

// Assertion 6: manifest row hashes stable across re-install
const kbHashMap1 = new Map(kbRows.map((r) => [r.path, r.hash]));
const hashesDrifted = kbRows2.filter((r) => kbHashMap1.get(r.path) !== r.hash);
assert(hashesDrifted.length === 0, 'KB row hashes stable across re-install');
```

The first install already happens before the backup snapshot runs (greenfield), so `backupsBefore` is expected to be `[]`; the idempotent re-install should preserve that.

---

## Info

### IN-01: GitHub Actions annotations hard-code `line=1`

**File:** `tools/validate-kb-licenses.js:313-317`

**Issue:** `console.log(`::${level} file=${ghFile},line=${line}::...`)` always emits `line=1`. When a CRITICAL KB-01/KB-02 finding fires, PR-review reviewers jump to line 1 regardless of where the actual issue is (e.g., `last_reviewed` on line 4). Mild UX regression vs. the heuristic in `validate-skills.js` which tracks actual line numbers where possible.

**Fix:** Track the frontmatter block's actual starting line (or the line of the offending key) and emit that instead. Pass it via the `finding` object:

```javascript
const fmStartLine = content.slice(0, content.indexOf('---')).split('\n').length;
// include `line: fmStartLine` in the finding, use it in the annotation
```

---

### IN-02: `checkHeading` on missing frontmatter scans the entire file, including code blocks

**File:** `tools/validate-kb-licenses.js:160` + `tools/validate-kb-licenses.js:252-263`

**Issue:** When frontmatter is absent (line 150), `checkHeading(content, ...)` is called with the full file content. `H1_REGEX = /^#\s+\S/m` matches any line starting with `#` including `#` inside fenced code blocks (```` ```markdown\n# example\n``` ````). A file with no real H1 but an example H1 inside a fence would pass KB-07. Borderline — most KB files won't do this, but release-gate rules shouldn't be borderline.

**Fix:** Strip fenced code blocks before the H1 check, or require the H1 to appear before any fence:

```javascript
const preFenceBody = body.split(/^```/m)[0];
if (!H1_REGEX.test(preFenceBody)) { /* ... */ }
```

---

### IN-03: `gm-discuss-story` step 2 Update path may operate on unloaded inputs

**File:** `src/gomad-skills/4-implementation/gm-discuss-story/workflow.md:167-213`

**Issue:** Step 2 "only context.md exists" jumps to step 3b (Update/View/Skip). Step 3b's "Update" branch runs `<action>Read fully and follow ./discover-inputs.md to load all input files</action>` — good. But the "View" path reads `{{default_output_file}}` then re-prompts; on a subsequent Update choice it calls `GOTO step 3a` (line 208). Step 3a begins with `<action>If inputs not yet loaded, read fully and follow ./discover-inputs.md...</action>` (line 182) — so loading is guarded. OK, not a bug. However:

The guard phrase "If inputs not yet loaded" has no explicit scoping — an LLM executor has to infer state from a prior step. Safer to make loading idempotent-by-design: always call discover-inputs.md at step 3a entry with no guard, and let the protocol cache by variable presence.

**Fix:** Remove the "If inputs not yet loaded" conditional; have Step 3a unconditionally call `discover-inputs.md`. `discover-inputs.md` already stores into named variables, so re-invocation is side-effect-free.

---

### IN-04: `require('glob')` inside `_installDomainKb` should be hoisted

**File:** `tools/installer/core/installer.js:755`

**Issue:** `const { globSync } = require('glob');` is inside the function body. Node caches `require` results, so cost is one-time, but having the require at module top (alongside other `require` calls around lines 1-20) is more conventional and surfaces dependency usage at a glance.

**Fix:** Move `const { globSync } = require('glob');` to the top of `installer.js` with the other requires. (Also applies to the inline `require('node:crypto')` and `require('yaml')` elsewhere in the file — separate scope, not this PR's concern.)

---

### IN-05: `gm-domain-skill/workflow.md` step 3b does not enumerate the degenerate "query has content but all tokens dropped" outcome

**File:** `src/gomad-skills/4-implementation/gm-domain-skill/workflow.md:89-93`

**Issue:** Step 4 handles `{query_tokens}` empty after tokenization by falling through to step 5 (catalog). Good. But the OUTPUT message at line 91 ("Query tokenizes to zero usable terms") is emitted BEFORE `GOTO step 5` fires — the caller sees BOTH a warning message AND a catalog listing. The Mode B checklist doesn't mention this hybrid output, so a checklist run would flag the catalog as "correct" without noticing the prefixed warning. Mild documentation drift.

**Fix:** Either (a) suppress the warning and go straight to Mode B silently, or (b) document in Mode B checklist that an optional "zero usable terms" prefix line is acceptable when the fall-through path triggered.

---

_Reviewed: 2026-04-25_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
