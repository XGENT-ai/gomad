# Contributing to GoMad

Thanks for your interest in GoMad. GoMad is a small, focused fork of BMAD
Method maintained by xgent-ai. Contributions are welcome via pull request.

## How to contribute

1. Fork `https://github.com/xgent-ai/gomad` on GitHub.
2. Create a feature branch from `next` (milestone work) or `main` (hotfixes).
3. Make your changes, following the project conventions in `CLAUDE.md` and the
   code style enforced by `eslint.config.mjs` / `prettier.config.mjs`.
4. Run `npm run lint` and `npm test` locally before opening a PR.
5. Open a pull request against the appropriate base branch with a clear
   description of the change and its motivation.

## What we accept

- Bug fixes with a minimal reproduction.
- Documentation improvements.
- New agents or skills that follow the `gm-*` naming convention and fit the
  `1-analysis` → `2-plan-workflows` → `3-solutioning` → `4-implementation`
  workflow.

## What we defer

- Large architectural changes — please open an issue for discussion first.
- Renames or moves across the skill directory tree — coordinate with the
  maintainer first, as these affect downstream installer behavior.

## Contact

Maintainer: Rockie Guo <rockie@kitmi.com.au>

Issues and PRs: <https://github.com/xgent-ai/gomad>
