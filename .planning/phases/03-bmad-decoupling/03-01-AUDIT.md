# Phase 3 — D-07 Audit: src/module/skills/ References

**Audited:** 2026-04-07
**Scope:** bin/ tools/ src/ test/ assets/ catalog/ package.json README.md CLAUDE.md
**Excluded:** BMAD/, node_modules/, .planning/, package-lock.json

## Hits

```
$ grep -rn "src/module/skills" bin/ tools/ src/ test/ assets/ catalog/ package.json README.md CLAUDE.md
bin/gomad-cli.js:55:  .description('Package selected skills into src/module/skills/ with manifests')
tools/package-skills.js:4: * Package skills from ~/.claude/skills/ into src/module/skills/
tools/package-skills.js:62: * Package a single skill into src/module/skills/.
tools/package-skills.js:123: * Package all selected skills into src/module/skills/.
tools/package-skills.js:169:  console.log(chalk.bold.green(`\nPackaged ${packaged.length} skills into src/module/skills/\n`));
CLAUDE.md:188:- Depends on: `~/.claude/skills/` source, catalog metadata, `src/module/skills/` target
CLAUDE.md:224:- Location: `src/module/skills/{name}/`
```

```
$ grep -rn "module/skills" bin/ tools/ src/ test/ assets/ catalog/
(no additional matches beyond the "src/module/skills" results above)
```

Note: `test/test-installation.js` does NOT contain a literal `src/module/skills` reference. It imports `tools/package-skills.js` (line 45) inside the `Integration: curate + package flow` describe block, which Plan 04 deletes. No file under `src/module/skills/` itself contains a self-reference to that path.

## Classification

| File:Line | Reference | Survives Plan 03? | Notes |
|-----------|-----------|-------------------|-------|
| bin/gomad-cli.js:55 | `.description('Package selected skills into src/module/skills/ with manifests')` | no | Inside the `package` command (lines 53-59), explicitly removed by Plan 03 (03-03-PLAN.md task 1, lines 109-115). |
| tools/package-skills.js:4 | JSDoc header `Package skills from ~/.claude/skills/ into src/module/skills/` | no | Entire file deleted by Plan 03 (03-03-PLAN.md). |
| tools/package-skills.js:62 | Function comment | no | Entire file deleted by Plan 03. |
| tools/package-skills.js:123 | Function comment | no | Entire file deleted by Plan 03. |
| tools/package-skills.js:169 | `console.log` success message | no | Entire file deleted by Plan 03. |
| CLAUDE.md:188 | Architecture doc: "Depends on: ... `src/module/skills/` target" | yes (file survives) | Documentation reference describing current package-skills architecture. NOT a runtime consumer. CLAUDE.md is not slated for deletion in Plan 03, but the architecture text it describes will be obsolete after Plan 03. Will need a follow-up doc-sync (out of scope for D-07; tracked as soft deviation below). |
| CLAUDE.md:224 | Architecture doc: "Location: `src/module/skills/{name}/`" | yes (file survives) | Same as above — documentation only, no runtime impact. |

## Verdict

- **SAFE TO DELETE** — No runtime consumer of `src/module/skills/` survives Plan 03. Every code reference (`bin/gomad-cli.js:55`, all four hits in `tools/package-skills.js`) lives inside files/blocks already slated for deletion by Plan 03. `test/test-installation.js` contains no literal `src/module/skills` reference (its `package-skills` import is removed by Plan 04). Plan 03 is authorized to `rm -rf src/module/skills/` as part of `src/module/` removal.

### Soft deviation (documentation drift, NOT a blocker)

`CLAUDE.md` lines 188 and 224 describe the package-skills architecture and reference `src/module/skills/`. These are documentation, not runtime consumers, and they do not block deletion. After Plan 03 lands, a follow-up doc-sync should remove or update these lines so CLAUDE.md no longer documents a vanished directory. This is a normal post-decoupling docs cleanup and can be handled in any subsequent plan or as part of Phase 3 wrap-up — it does NOT need to gate Plan 03.

Pre-deletion sanity check: `ls src/module/skills/ | wc -l` = 14 (intact, untouched by this audit).
