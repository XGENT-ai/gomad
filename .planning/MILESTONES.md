# Milestones: GoMad

Historical record of shipped versions.

---

## v1.1 — Rename & Rebrand

**Shipped:** 2026-04-18
**Phases:** 4 | **Plans:** 10 | **Timeline:** 2026-04-07 → 2026-04-18 (~12 days)
**Git tag:** `v1.1` (GSD milestone) / `v1.1.0` (npm release)
**npm:** [`@xgent-ai/gomad@1.1.0`](https://www.npmjs.com/package/@xgent-ai/gomad)

### Delivered

Transformed the raw BMAD Method fork into `@xgent-ai/gomad@1.1.0` — a lean, properly-credited, publishable package. `@xgent-ai/gomad@1.0.0` deprecated on npm with redirect to `@latest`.

### Key Accomplishments

1. **Package identity** — Renamed `bmad-method@6.2.2` → `@xgent-ai/gomad@1.1.0`, reset `package.json` metadata, collapsed `bin` to single `gomad` entry, renamed `bmad:*` scripts to `gomad:*`, dropped 3 unused dependencies, deleted dead `rebundle` script.
2. **Full rename** — ~41 `bmad-*` skill directories → `gm-*`, `bmm-skills/` → `gomad-skills/`, manifest prefix drop, CLI entry rename, idempotent content sweep across source/configs/tests/docs/website, test fixtures renamed.
3. **Slim-down** — ExternalModuleManager subsystem removed (3 source files + call sites), Vietnamese README deleted, 3 abandoned doc translations (`docs/cs/`, `docs/fr/`, `docs/vi-vn/`) deleted.
4. **Credit + legal** — `LICENSE` composed with byte-identical BMAD MIT preservation + GoMad copyright + non-affiliation disclaimer; `TRADEMARK.md` rewritten for nominative fair use; `CONTRIBUTORS.md` preserved byte-identical; canonical disclaimer reused verbatim across README/README_CN Credits sections.
5. **Branding + docs** — Hand-authored GoMad ASCII CLI banner (no figlet), `Wordmark.png` + favicon regenerated via committed sharp reproducibility script, Astro website stubbed as under-construction one-pager, bilingual (en + zh-cn) docs landing pages rewritten, 21 Phase 3 invariants all PASS.
6. **Verification + release** — `files` allowlist limits tarball to 320 shipped files, tarball verification script asserts no `bmad`/`bmm` residuals, E2E fresh-install test confirms all 52 `gm-*` skills loadable, `npm run quality` + tarball + E2E all exit 0, published to npm, v1.0.0 deprecated, `v1.1.0` tagged on main.

### Requirements: 36/36 complete (100%)

See [milestones/v1.1-REQUIREMENTS.md](./milestones/v1.1-REQUIREMENTS.md) for full traceability.

### Archives

- [milestones/v1.1-ROADMAP.md](./milestones/v1.1-ROADMAP.md) — full phase details
- [milestones/v1.1-REQUIREMENTS.md](./milestones/v1.1-REQUIREMENTS.md) — requirements traceability

---

*First milestone archived: 2026-04-18*
