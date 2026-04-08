# Credit & NPM Reference

**Researched:** 2026-04-08
**Confidence:** HIGH on MIT mechanics and npm commands; MEDIUM on stylistic README conventions (real-world forks vary widely).

## Summary

Decisions the planning phase needs to make based on this research:

1. **LICENSE composition** — Keep BMAD's existing `LICENSE` file byte-identical (preserves the MIT notice and the BMAD trademark notice already inside it). Add a second file `LICENSE-GOMAD` (or append a clearly-separated Gomad copyright block at the bottom of the existing `LICENSE`). Do **not** rewrite or merge the BMAD MIT block — that would break the "above copyright notice ... shall be included" clause.
2. **No NOTICE file needed** — NOTICE is an Apache-2.0 convention, not an MIT one. Skip it. Put attribution in `LICENSE`, `README.md`, and `CHANGELOG.md` instead.
3. **README attribution** — Use a short footer "Credits" / "Acknowledgements" section (not a top banner). Phrase: *"Gomad is a hard fork of [BMAD Method](https://github.com/bmad-code-org/BMAD-METHOD) by BMad Code, LLC, used under the MIT License. BMad™, BMad Method™, and BMad Core™ are trademarks of BMad Code, LLC and are used here only for attribution."* This is nominative fair use and explicitly disclaims endorsement.
4. **Trademark posture** — Saying "based on BMAD Method" / "fork of BMAD Method" is safe nominative use as long as (a) we use only the mark needed to identify the project, (b) we don't imply endorsement, and (c) we don't use BMAD in our product name, domain, or branding. The existing `TRADEMARK.md` from upstream actually grants this explicitly ("Refer to BMad to accurately describe compatibility" / "Fork the software and distribute your own version under a different name").
5. **npm publish** — `@xgent-ai/gomad` is a scoped public package, requires `"publishConfig": { "access": "public" }` in `package.json` plus an existing `xgent-ai` org on npmjs.com. First publish: `npm publish`. Deprecate v1.0 with `npm deprecate bmad-method@"1.0.x" "This package has moved to @xgent-ai/gomad. Install with: npm i @xgent-ai/gomad"`. CI publishes need a **granular access token with "Bypass 2FA" enabled** (legacy automation tokens were removed in late 2025).

---

## 1. MIT Fork Credit Best Practices

### 1.1 What MIT actually requires

The only legal obligation in the MIT license is:

> "The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software."

Practical interpretation (HIGH confidence, multiple sources including [/dev/lawyer line-by-line breakdown](https://writing.kemitchell.com/2016/09/21/MIT-License-Line-by-Line.html) and [Software Freedom Law Center guidance](https://softwarefreedom.org/resources/2012/ManagingCopyrightInformation.html)):

- You **must** ship the original copyright line (`Copyright (c) 2025 BMad Code, LLC`) and the full MIT permission/disclaimer text in every distribution that contains substantial portions of the code.
- You **may** add your own copyright line — typically above or below the original.
- You **may** consolidate multiple notices into a single attribution file, as long as the original notice is reproduced.
- You are **not** required to advertise, banner, or marketing-credit the upstream — preservation of the notice in the distribution is sufficient. Anything beyond that is a courtesy/ethics call, not a legal one.

### 1.2 LICENSE file composition — recommendation

**Recommendation: Option (a) — preserve BMAD's `LICENSE` byte-identical, append a Gomad block at the bottom, separated by a horizontal rule.**

Rationale:
- Lowest-risk reading of the MIT clause: the original notice is reproduced verbatim, in the file users expect to find it, with no editorializing.
- Avoids the "combined block listing both copyrights" approach (option b), which is legally fine but visually conflates two distinct copyright holders into a single statement and tends to look like a co-authored work rather than a fork.
- A separate `LICENSE-BMAD` file (option c) is also legal but is less discoverable — many license scanners (npm, GitHub's license detector, `licensee`) only read `LICENSE` / `LICENSE.md` / `LICENSE.txt` at the repo root.

**Real-world precedent:** OpenTofu's `LICENSE` file preserves `Copyright (c) 2014 HashiCorp, Inc.` at the top of the file alongside the OpenTofu Authors copyright, in a single MPL-2.0 block. They didn't move HashiCorp's copyright to a separate file. ([OpenTofu LICENSE](https://github.com/opentofu/opentofu/blob/main/LICENSE))

**Concrete file to ship as `/LICENSE`:**

```
MIT License

Copyright (c) 2025 BMad Code, LLC

This project incorporates contributions from the open source community.
See [CONTRIBUTORS.md](CONTRIBUTORS.md) for contributor attribution.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

TRADEMARK NOTICE:
BMad™, BMad Method™, and BMad Core™ are trademarks of BMad Code, LLC, covering all
casings and variations (including BMAD, bmad, BMadMethod, BMAD-METHOD, etc.). The use of
these trademarks in this software does not grant any rights to use the trademarks
for any other purpose. See [TRADEMARK.md](TRADEMARK.md) for detailed guidelines.

----------------------------------------------------------------------

Gomad is a hard fork of BMAD Method, distributed under the MIT License.

Copyright (c) 2026 xgent-ai

Modifications and additions made by xgent-ai are likewise released under the
MIT License above. The original BMAD Method copyright notice and license terms
are preserved in their entirety as required by the MIT License.

BMad™, BMad Method™, and BMad Core™ remain trademarks of BMad Code, LLC and
are referenced here solely for attribution purposes. xgent-ai is not affiliated
with, endorsed by, or sponsored by BMad Code, LLC.
```

Note that we keep `TRADEMARK.md` (BMAD's original) byte-identical in the repo — its content already grants permission for the kind of attribution-only use we're doing.

### 1.3 NOTICE file — skip it

NOTICE is an **Apache-2.0** convention, not MIT. The Apache 2.0 license has section 4(d) explicitly requiring a NOTICE file. The MIT license has no equivalent clause.

Adding a NOTICE file to an MIT project is harmless but signals confusion about which license you're under. License scanners may flag a NOTICE file in a non-Apache project as anomalous.

**Recommendation: do not create a NOTICE file.** All attribution lives in `LICENSE`, `README.md` Credits section, and `CHANGELOG.md` v1.1.0 entry.

The PROJECT.md checklist mentions "`NOTICE` (or equivalent)" — interpret "or equivalent" as the README Credits section + LICENSE block, and do not create a literal NOTICE file.

### 1.4 README attribution placement

**Recommendation: footer Credits section, not top banner.**

Real-world data points:

| Project | Approach | Source |
|---|---|---|
| **OpenTofu** (Terraform fork) | No README mention of Terraform at all. LICENSE preserves HashiCorp copyright. | [OpenTofu README](https://github.com/opentofu/opentofu) |
| **Forgejo** (Gitea fork) | No README mention of Gitea (relicensed to GPL, fully diverged). | [Forgejo README on Codeberg](https://codeberg.org/forgejo/forgejo) |
| **Valkey** (Redis fork) | One sentence in the intro: *"This project was forked from the open source Redis project right before the transition to their new source available licenses."* Placed after badges, before "What is Valkey?". | [Valkey README](https://github.com/valkey-io/valkey) |

**Observation:** Among major forks, the trend is **minimal README attribution**. Most either (a) say nothing at all in the README and rely entirely on LICENSE preservation, or (b) drop a single factual sentence in the intro paragraph. None of them put a top-of-readme banner saying "FORK OF X."

For Gomad, given that the project context explicitly says credit must remain prominent "both legally and ethically," we should be **slightly more generous than the major-fork norm** but still tasteful. Recommendation:

**One short paragraph in the intro** (factual fork statement) **plus a dedicated `## Credits` or `## Acknowledgements` section near the bottom of the README** with the full attribution.

**Top intro paragraph (one sentence):**

> Gomad is a hard fork of [BMAD Method](https://github.com/bmad-code-org/BMAD-METHOD), an agentic workflow framework for AI-driven software development originally created by BMad Code, LLC.

**Footer `## Credits` section:**

```markdown
## Credits

Gomad is a hard fork of [BMAD Method](https://github.com/bmad-code-org/BMAD-METHOD),
originally created by [BMad Code, LLC](https://github.com/bmad-code-org). The upstream
project is distributed under the MIT License, which is preserved in [LICENSE](LICENSE).

We are deeply grateful to BMad Code, LLC and all BMAD Method contributors for the
foundation this project builds on. The original `1-analysis` → `2-plan-workflows` →
`3-solutioning` → `4-implementation` workflow structure, the core skill model, and
the installer architecture all originate with BMAD Method.

**Trademark notice:** BMad™, BMad Method™, and BMad Core™ are trademarks of BMad Code,
LLC. They are referenced here solely for attribution under nominative fair use.
xgent-ai is not affiliated with, endorsed by, or sponsored by BMad Code, LLC. See
[TRADEMARK.md](TRADEMARK.md) for the upstream trademark guidelines, which we follow.
```

**Conventional language to use** (in order of preference):

1. **"hard fork of"** — most precise and unambiguous; matches PROJECT.md framing.
2. **"based on"** — softer; appropriate when the fork has significantly diverged.
3. **"derived from"** — formal/legal-sounding; fine in LICENSE blocks but stiff in READMEs.
4. **"originally created by"** — good for attributing the *people*, distinct from the *project*.

**Avoid:** "inspired by" (understates the relationship; legally risky because it suggests independence the code doesn't have).

### 1.5 CHANGELOG entry for v1.1.0

The trick is to frame the v1.0 → v1.1 transition without burying the fork relationship and without making it sound apologetic.

**Recommended `CHANGELOG.md` v1.1.0 entry:**

```markdown
## [1.1.0] - 2026-04-XX

### Project pivot

This release marks Gomad's transition from a continuation of the upstream BMAD Method
project to an independently-maintained hard fork under the `@xgent-ai/gomad` name. The
prior `bmad-method@1.0.x` releases on npm have been deprecated and will not receive
further updates.

Gomad continues to be distributed under the MIT License. The original BMAD Method
copyright and license are preserved in [LICENSE](LICENSE), and BMAD Method is credited
in the [README Credits section](README.md#credits).

### Changed
- Package renamed: `bmad-method` → `@xgent-ai/gomad`
- Skill prefix: `bmad-*` → `gm-*` (e.g., `bmad-help` → `gm-help`)
- Module directory: `src/bmm-skills/` → `src/gomad-skills/`
- Documentation, branding assets, CLI banner all rebranded to Gomad
- Default domain: `gomad.xgent.ai`

### Removed
- BMad builder (not needed for our distribution model)
- Web bundle (out of scope for v1.1)
- `README_VN.md` (no Vietnamese maintainer)

### Preserved from upstream BMAD Method
- The four-phase workflow: `1-analysis` → `2-plan-workflows` → `3-solutioning` → `4-implementation`
- The core skills foundation (renamed from `core-skills/bmad-*` to `core-skills/gm-*`)
- The installer architecture and skill validator pattern
- The MIT License and original BMAD copyright notice

### Migration

Users of `bmad-method@1.0.x`:
\`\`\`bash
npm uninstall bmad-method
npm install @xgent-ai/gomad
\`\`\`
```

### 1.6 Trademark posture — what's legally safe

**HIGH confidence:** Saying "Gomad is a hard fork of BMAD Method" is safe nominative fair use under US trademark law (15 USC §1125). The three-part test ([INTA fact sheet](https://www.inta.org/fact-sheets/fair-use-of-trademarks-intended-for-a-non-legal-audience/), [Wikipedia: Nominative use](https://en.wikipedia.org/wiki/Nominative_use)):

1. **The product is not readily identifiable without the mark** — ✅ We can't refer to BMAD Method without saying "BMAD Method." There's no generic name for it.
2. **Only as much of the mark as reasonably necessary is used** — ✅ We use the wordmark in attribution text only. We don't reproduce the BMAD logo, banner, or stylized branding.
3. **No suggestion of sponsorship or endorsement** — ✅ The README and LICENSE both explicitly state "not affiliated with, endorsed by, or sponsored by BMad Code, LLC."

**Critically, BMAD's own `TRADEMARK.md` explicitly grants this:**

> You may:
> - Refer to BMad to accurately describe compatibility or integration (e.g., "Compatible with BMad Method v6")
> - Link to <https://github.com/bmad-code-org/BMAD-METHOD>
> - Fork the software and distribute your own version under a different name

So our use case ("hard fork of BMAD Method, distributed as Gomad") is on the explicit allow-list. We are within the lines they themselves drew.

**What we must NOT do** (per BMAD's `TRADEMARK.md`, which the project context says we must respect):

- ❌ Use "BMad" / "BMAD" anywhere in the Gomad product name — already handled, we picked "Gomad."
- ❌ Use BMAD logos or visual branding — already handled by the "branding — visual assets" checklist item.
- ❌ Register `bmad-*` domains, npm scopes, or social handles — `@xgent-ai/gomad` and `gomad.xgent.ai` comply.
- ❌ Imply endorsement or partnership — handled by explicit disclaimers in LICENSE and README.

**One thing to double-check manually:** the `/skills/` directory structure currently uses `bmad-*` prefixes (e.g., `bmad-help`, `bmad-brainstorming`). PROJECT.md already plans to rename these to `gm-*`. **Do not leave any `bmad-*` skill IDs in shipped code** — that would be using the BMAD wordmark inside our distributed product, which is more aggressive than nominative attribution and could plausibly be challenged. The rename is therefore not just cosmetic; it's a trademark-safety requirement.

### 1.7 `package.json` metadata for fork signaling

Beyond the obvious `name` / `description` / `version`, useful fields:

| Field | Recommended value | Why |
|---|---|---|
| `name` | `"@xgent-ai/gomad"` | Required by PROJECT.md |
| `version` | `"1.1.0"` | Per Key Decisions table |
| `description` | `"A hard fork of BMAD Method — agentic workflow framework for AI-driven software development."` | Mentions upstream by name in the npm registry blurb |
| `keywords` | Add `"bmad"` and `"bmad-method-fork"` alongside Gomad-specific keywords | Helps users searching for BMAD on npm find us |
| `repository` | `{ "type": "git", "url": "git+https://github.com/xgent-ai/gomad.git" }` | Points to our repo, NOT upstream |
| `bugs` | `{ "url": "https://github.com/xgent-ai/gomad/issues" }` | Our issues, NOT upstream's |
| `homepage` | `"https://gomad.xgent.ai"` | Per PROJECT.md |
| `author` | `"xgent-ai"` (or specific maintainer) | Our org |
| `contributors` | Optional array — could list upstream BMAD as a contributor entry | Symbolic credit; surfaces in `npm view` |
| `license` | `"MIT"` | Unchanged |
| `publishConfig` | `{ "access": "public" }` | **Required** for first scoped publish — see §2.1 |

**Do not** point `bugs.url` at the upstream BMAD repo — that would dump our user issues into BMAD's tracker, which is rude and breaks expectations.

**Optional symbolic touch:** add a custom field like `"forkOf": "bmad-method"` or include upstream as a `contributors` entry. Neither is conventional but neither is harmful, and `contributors` is at least a real npm field that surfaces in `npm view @xgent-ai/gomad`.

Example `contributors` entry:

```json
"contributors": [
  {
    "name": "BMad Code, LLC (upstream BMAD Method)",
    "url": "https://github.com/bmad-code-org/BMAD-METHOD"
  }
]
```

---

## 2. NPM Publish + Deprecate

### 2.1 First-time scoped publish of `@xgent-ai/gomad@1.1.0`

**Prerequisites:**

1. **npm org `xgent-ai` must exist.** If it doesn't:
   - Log in at npmjs.com → Create Organization → name `xgent-ai` → Free tier is fine for public packages.
   - Verify at <https://www.npmjs.com/org/xgent-ai>
2. **Publishing user must be a member of the `xgent-ai` org** with publish rights (Developer or Owner).
3. **2FA must be enabled** on the publishing account (npm now requires it for all publishes — see §2.3).
4. **`package.json` must include `"publishConfig": { "access": "public" }`.** Without this, npm assumes scoped packages are private and the publish will fail with `E402 Payment Required` (private packages need a paid plan).

**Steps:**

```bash
# 1. Make sure you're logged in as a user with rights on xgent-ai
npm whoami
npm login   # if needed — uses browser-based auth in current CLI

# 2. Verify what will actually be packaged (doesn't publish, just shows the tarball contents)
npm pack --dry-run

# 3. Publish — no flag needed if publishConfig.access is set in package.json
npm publish

# Equivalent if you didn't set publishConfig:
npm publish --access public
```

**Common gotchas:**

| Gotcha | Symptom | Fix |
|---|---|---|
| Missing `publishConfig.access` | `E402 Payment Required` | Add `"publishConfig": { "access": "public" }` to package.json |
| Org doesn't exist | `E404` on the scope | Create `xgent-ai` org on npmjs.com first |
| User not in org | `E403 Forbidden` | Add user to org with publish role |
| 2FA not enabled | `EOTP` / `must provide one-time password` | Enable 2FA on the account; pass `--otp=123456` on the command line |
| `.npmignore` accidentally excluding required files | Package installs but is broken | Use `npm pack --dry-run` to verify tarball contents before publishing |
| Forgetting to bump version | `E403 You cannot publish over the previously published versions` | Bump `version` in package.json |
| `files` field excluding `LICENSE` | License missing from published package | Don't put `LICENSE` in `files` ignore — npm always includes `LICENSE`, `README.md`, `package.json`, `CHANGELOG.md` regardless |

**Verification after publish:**

```bash
npm view @xgent-ai/gomad
npm view @xgent-ai/gomad versions
# Test install in a fresh tmp dir:
mkdir /tmp/gomad-test && cd /tmp/gomad-test
npm init -y
npm install @xgent-ai/gomad
ls node_modules/@xgent-ai/gomad
```

### 2.2 Deprecating `bmad-method@1.0.x`

**Important context:** PROJECT.md says "v1.0 was published in the wrong direction" under the `bmad-method` name on npm. We need to mark those versions deprecated so users get a warning at install time and are redirected to the new package.

**Command:**

```bash
# Deprecate all 1.0.x versions
npm deprecate bmad-method@"1.0.x" \
  "This package has been superseded by @xgent-ai/gomad. Install with: npm install @xgent-ai/gomad. See https://github.com/xgent-ai/gomad for details."
```

**Syntax notes:**
- The version range can be a single version (`bmad-method@1.0.3`), a semver range (`bmad-method@"1.0.x"` or `bmad-method@">=1.0.0 <2.0.0"`), or omitted to deprecate the entire package.
- **Always quote the version range** in shells (zsh/bash treat `<` and `>` as redirection).
- The message can include URLs and the new scoped package name. npm displays it verbatim during `npm install`.
- To undeprecate later: re-run with an empty message: `npm deprecate bmad-method@"1.0.x" ""`.

**What users see:**

```
$ npm install bmad-method
npm WARN deprecated bmad-method@1.0.0: This package has been superseded by @xgent-ai/gomad. Install with: npm install @xgent-ai/gomad. See https://github.com/xgent-ai/gomad for details.
```

The warning shows on every install but does **not** block installation. If we want to be more aggressive (rare), we could publish a new `bmad-method@1.0.99` whose `postinstall` script prints a louder banner — but that's user-hostile and not recommended.

**Permissions:** You must be the owner or maintainer of `bmad-method` on npm to deprecate it. Verify with `npm owner ls bmad-method`. If we're not currently listed as an owner (because the previous v1.0 publish was under a different account or the original BMAD maintainer's), this step will require account-level coordination first — **flag this for manual verification before the v1.1 release task.**

**Reference scoped→scoped example** ([npm docs - deprecating packages](https://docs.npmjs.com/deprecating-and-undeprecating-packages-or-package-versions/)):

```bash
npm deprecate @lmc-eu/stylelint-config "LMC's Stylelint config is deprecated. Please use @almacareer/stylelint-config instead."
```

This is the documented pattern; our `bmad-method` → `@xgent-ai/gomad` case is the same thing in the unscoped→scoped direction.

### 2.3 2FA / token requirements (CI vs local)

**As of late 2025, the npm authentication landscape changed significantly** ([GitHub Changelog: Strengthening npm security, Sep 2025](https://github.blog/changelog/2025-09-29-strengthening-npm-security-important-changes-to-authentication-and-token-management/), [GitHub Changelog: classic tokens revoked, Dec 2025](https://github.blog/changelog/2025-12-09-npm-classic-tokens-revoked-session-based-auth-and-cli-token-management-now-available/)):

- **Classic / legacy automation tokens have been revoked.** Any old `npm_xxx` automation token from 2024 or earlier no longer works.
- Only **granular access tokens** are supported now.
- **All publishes require 2FA** by default. Granular access tokens with the **"Bypass 2FA"** option enabled are the documented way to publish from CI without a human typing an OTP.
- **Trusted publishing** (OIDC-based, no token at all) is recommended where supported (GitHub Actions has it).

**Local publish (interactive):**

```bash
npm login        # browser flow
npm publish      # prompts for OTP if 2FA enabled
# or
npm publish --otp=123456
```

**CI publish (recommended: trusted publishing via GitHub Actions OIDC):**

Configure the package on npmjs.com → Settings → Trusted Publisher → add the GitHub repo + workflow file. Then in the workflow:

```yaml
- uses: actions/setup-node@v4
  with:
    node-version: '20'
    registry-url: 'https://registry.npmjs.org'
- run: npm ci
- run: npm publish
  env:
    NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}  # not needed if using OIDC trusted publishing
```

**CI publish (fallback: granular access token):**

1. npmjs.com → Access Tokens → Generate New Token → **Granular Access Token**
2. Set:
   - **Permissions**: Read and write
   - **Packages and scopes**: `@xgent-ai/gomad` only (or `@xgent-ai/*` scope)
   - **Bypass 2FA**: ✅ Enabled (this is the key flag — without it, the token can't publish)
   - **Expiration**: Max 90 days for write tokens
3. Save token as `NPM_TOKEN` GitHub secret.
4. Use `NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}` in the workflow.

**Common CI gotchas:**
- Token without "Bypass 2FA" → publish fails with `EOTP` even though it's a "real" token. This trips up most people on first attempt.
- Token scoped to wrong package/scope → `E403`.
- Token expired → `E401`. Granular write tokens cap at 90 days, so set a calendar reminder or use trusted publishing.

### 2.4 Package size, `files` field, and `.npmignore`

**Recommendation: use the `files` field in `package.json` (allowlist), not `.npmignore` (denylist).** Allowlists are safer — accidentally adding a new file to the repo doesn't accidentally publish it.

**Always-included by npm regardless of `files`:**
- `package.json`
- `README*`
- `LICENSE*` / `LICENCE*`
- `CHANGELOG*` (in current npm versions)
- The file referenced by `main`

**Always-excluded by npm regardless of `files`:**
- `.git`, `.svn`, `.hg`, `CVS`
- `.DS_Store`
- `node_modules`
- `package-lock.json` (excluded by default but `npm-shrinkwrap.json` is included if present)
- `.npmrc`

**Recommended `package.json` `files` for Gomad:**

```json
{
  "files": [
    "src/",
    "tools/installer/",
    "bin/",
    "AGENTS.md",
    "TRADEMARK.md",
    "CONTRIBUTORS.md"
  ]
}
```

(Adjust based on what `tools/installer/` actually ships at runtime — if it has dev-only subdirectories, exclude them via a more specific glob like `tools/installer/lib/` instead of the whole directory.)

**Things that should NOT ship in the npm tarball** (so they should be omitted from `files` and/or listed in `.npmignore` as a belt-and-suspenders):

- `.planning/` — internal project management, not user-facing
- `.claude/` — local Claude Code config
- `test/`, `tests/`, `__tests__/` — test code
- `.github/` — GitHub workflows
- `docs/` and `website/` — if these are deployed separately to GH Pages, exclude from the tarball too; if they're part of the user-facing distribution (e.g., the installer reads them), include them
- `.eslintrc*`, `.prettierrc*`, `tsconfig.json` (unless library is TS and consumers extend it)
- `*.test.js`, `*.spec.js`
- `coverage/`, `.nyc_output/`
- Source maps (`*.map`) unless you specifically want consumers to debug into them
- `banner-bmad-method.png` and any leftover BMAD branding assets — these MUST be removed from the package per the v1.1 rename checklist

**Verification step (mandatory before publish):**

```bash
npm pack --dry-run
# OR for a full file listing:
npm pack
tar -tzf xgent-ai-gomad-1.1.0.tgz | sort
```

This shows exactly what would be published. Diff the output against expectations before running `npm publish` for real.

**Size guidance:** No hard limit, but tarballs over 10 MB get flagged. The current `bmad-method` package size will give us a baseline — check with `npm view bmad-method dist.unpackedSize` before publishing v1.1.

### 2.5 Open question to flag for manual decision

**Who currently owns `bmad-method` on npm?** PROJECT.md says v1.0 was published, but doesn't say under whose npm account. If it was published under the upstream BMAD maintainer's account and they haven't transferred ownership, we **cannot** deprecate it ourselves. This needs to be checked manually with:

```bash
npm owner ls bmad-method
```

If we're not an owner, the deprecation task either (a) requires coordination with the current owner, or (b) needs to be dropped from v1.1 scope (and the wrong-direction v1.0 just stays un-deprecated, which is unfortunate but not blocking).

---

## Sources

### MIT license mechanics
- [MIT License — Choose a License](https://choosealicense.com/licenses/mit/)
- [The MIT License, Line by Line — /dev/lawyer (Kyle Mitchell)](https://writing.kemitchell.com/2016/09/21/MIT-License-Line-by-Line.html)
- [Managing Copyright Information — Software Freedom Law Center](https://softwarefreedom.org/resources/2012/ManagingCopyrightInformation.html)
- [Open Source Software Licenses 101: MIT — FOSSA](https://fossa.com/blog/open-source-licenses-101-mit-license/)
- [HOWTO fork an MIT-licensed project — GitHub gist](https://gist.github.com/fbaierl/1d740a7925a6e0e608824eb27a429370)
- [MIT License — Wikipedia](https://en.wikipedia.org/wiki/MIT_License)

### Real-world fork attribution examples
- [OpenTofu LICENSE](https://github.com/opentofu/opentofu/blob/main/LICENSE) — preserves HashiCorp copyright in MPL-2.0 block
- [OpenTofu README](https://github.com/opentofu/opentofu) — no Terraform mention in README
- [Valkey README](https://github.com/valkey-io/valkey) — single-sentence Redis attribution in intro
- [Forgejo README on Codeberg](https://codeberg.org/forgejo/forgejo) — no Gitea mention (fully diverged + relicensed)
- [Forgejo FAQ on upstream relationship](https://forgejo.org/faq/)
- [Preact LICENSE](https://github.com/preactjs/preact/blob/main/LICENSE) — example of plain single-author MIT for comparison

### Trademark / nominative fair use
- [Nominative use — Wikipedia](https://en.wikipedia.org/wiki/Nominative_use)
- [Fair Use of Trademarks — INTA fact sheet](https://www.inta.org/fact-sheets/fair-use-of-trademarks-intended-for-a-non-legal-audience/)
- [Fair Use (US trademark law) — Wikipedia](https://en.wikipedia.org/wiki/Fair_use_(U.S._trademark_law))
- The existing upstream `TRADEMARK.md` in this repo — explicitly grants fork-and-distribute-under-different-name use

### npm publish + scoped packages
- [Creating and publishing scoped public packages — npm Docs](https://docs.npmjs.com/creating-and-publishing-scoped-public-packages/)
- [Creating and publishing an org-scoped package — npm Docs](https://docs.npmjs.com/creating-and-publishing-an-org-scoped-package)
- [npm scope — npm Docs](https://docs.npmjs.com/cli/v11/using-npm/scope/)
- [npm-publish CLI command — npm Docs](https://docs.npmjs.com/cli/v11/commands/npm-publish/)

### npm deprecate
- [Deprecating and undeprecating packages — npm Docs](https://docs.npmjs.com/deprecating-and-undeprecating-packages-or-package-versions/)
- [npm-deprecate CLI command — npm Docs](https://docs.npmjs.com/cli/v11/commands/npm-deprecate/)
- [Using deprecated packages — npm Docs](https://docs.npmjs.com/using-deprecated-packages/)

### npm tokens / 2FA / CI
- [Requiring 2FA for package publishing — npm Docs](https://docs.npmjs.com/requiring-2fa-for-package-publishing-and-settings-modification/)
- [About access tokens — npm Docs](https://docs.npmjs.com/about-access-tokens/)
- [Strengthening npm security: authentication and token changes (Sep 2025) — GitHub Changelog](https://github.blog/changelog/2025-09-29-strengthening-npm-security-important-changes-to-authentication-and-token-management/)
- [npm classic tokens revoked, session-based auth (Dec 2025) — GitHub Changelog](https://github.blog/changelog/2025-12-09-npm-classic-tokens-revoked-session-based-auth-and-cli-token-management-now-available/)
- [Automatic npm publishing with GitHub Actions & granular tokens — HTTP Toolkit](https://httptoolkit.com/blog/automatic-npm-publish-gha/)

### Files & .npmignore
- [Files & Ignores — npm/cli wiki](https://github.com/npm/cli/wiki/Files-&-Ignores)
- [Publishing what you mean to publish — npm Blog Archive](https://blog.npmjs.org/post/165769683050/publishing-what-you-mean-to-publish.html)
- [Control What You Publish Inside Your npm Packages — David Barral / Trabe](https://medium.com/trabe/control-what-you-publish-inside-your-npm-packages-e3ec911638b8)
