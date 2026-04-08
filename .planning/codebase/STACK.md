# Technology Stack

**Analysis Date:** 2026-04-08

## Languages

**Primary:**
- JavaScript/Node.js - CLI tools, installer, build scripts
- TypeScript - Website build system, type safety
- Markdown - Documentation source files

**Secondary:**
- Python 3.10+ - Optional dependency, supported by project but not directly used in core codebase
- YAML - Configuration files and workflow definitions
- Shell/Bash - GitHub Actions workflows, scripts

## Runtime

**Environment:**
- Node.js 20.0.0+ (required, specified in `package.json` engines field)
- npm 11.5.1+ (required for trusted publishing in publish workflow)

**Package Manager:**
- npm (primary)
- Lockfile: `package-lock.json` (present)
- Config: `.npmrc` with `legacy-peer-deps=true` and `prefer-offline=true`

## Frameworks

**Core:**
- Astro 5.16.0 - Static site generation for documentation website (`website/astro.config.mjs`)
- Starlight 0.37.5 - Astro documentation theme integration
- Commander 14.0.0 - CLI framework for bmad-cli command parsing and routing

**Build/Dev:**
- Prettier 3.7.4 - Code formatting (140 char line width, 2-space indent)
- ESLint 9.33.0 - JavaScript/YAML linting with plugin ecosystem:
  - eslint-plugin-n (Node.js rules)
  - eslint-plugin-unicorn (modern best practices)
  - eslint-plugin-yml (YAML rules)
  - eslint-config-prettier (compatibility layer)
- Husky 9.1.7 - Git hooks
- lint-staged 16.1.1 - Staged file linting before commits
- Jest 30.2.0 - Test framework
- c8 10.1.3 - Code coverage

**Utilities:**
- Astro Sitemap 3.6.0 - Automatic sitemap generation for SEO
- Sharp 0.33.5 - Image optimization and manipulation

## Key Dependencies

**Critical:**
- @clack/core 1.0.0 - Low-level CLI prompt infrastructure
- @clack/prompts 1.0.0 - User-friendly terminal prompts for installer
- fs-extra 11.3.0 - Enhanced filesystem operations with copying, recursion
- yaml 2.7.0 - YAML parsing and serialization for configuration
- js-yaml 4.1.0 - Alternative YAML parser
- glob 11.0.3 - File pattern matching for discovery
- chalk 4.1.2 - Terminal color output for CLI
- semver 7.6.3 - Semantic version comparison for update checks
- commander 14.0.0 - CLI framework

**Infrastructure:**
- @kayvan/markdown-tree-parser 1.6.1 - Parse markdown document structure for navigation
- csv-parse 6.1.0 - CSV file parsing
- xml2js 0.6.2 - XML parsing and conversion
- ignore 7.0.5 - .gitignore-style pattern matching
- picocolors 1.1.1 - Minimal color library alternative
- unist-util-visit 5.1.0 - AST traversal utilities for document processing
- yaml-eslint-parser 1.2.3 - YAML parsing for ESLint
- yaml-lint 1.7.0 - YAML validation tool
- prettier-plugin-packagejson 2.5.19 - Prettier plugin for package.json formatting
- markdownlint-cli2 0.19.1 - Markdown linting

## Configuration

**Environment:**
- Site URL resolution: `SITE_URL` (explicit override) → `GITHUB_REPOSITORY` (GitHub Actions) → `http://localhost:3000` (development default)
  - Implementation: `website/src/lib/site-url.mjs`
- Version and update checking via npm registry queries
- GitHub Actions environment variables: `GITHUB_REPOSITORY`, `SITE_URL` (workflow variables)

**Build:**
- `package.json` - Main manifest with scripts, dependencies, version control
- `prettier.config.mjs` - Formatting configuration (140 char width, trailing commas)
- `eslint.config.mjs` - Flat ESLint config with rule customization per file type
- `astro.config.mjs` - Astro site configuration with Starlight and Sitemap integrations
- `tsconfig.json` - Not detected; TypeScript used minimally
- `.nvmrc` - Node version file specifying v22
- `.npmrc` - Legacy peer deps and offline preference enabled

**Secrets Management:**
- GitHub Secrets used for:
  - `DISCORD_WEBHOOK` - Discord notifications
  - `RELEASE_APP_ID` - GitHub App for trusted publishing
  - `RELEASE_APP_PRIVATE_KEY` - Signing release commits
  - `GITHUB_TOKEN` - Default GitHub Actions token

## Platform Requirements

**Development:**
- Node.js 20.0.0+
- npm v11.5.1+ (for trusted publishing feature)
- Python 3.10+ (optional, community support)
- uv package manager (optional, community support)

**Build/CI Environment:**
- Ubuntu Latest (specified in GitHub Actions workflows)
- Node.js 20+ configured via .nvmrc
- Full git history (fetch-depth: 0) for Starlight's lastUpdated timestamps

**Production:**
- Static hosting compatible (GitHub Pages deployment in CI/CD)
- No server-side runtime required for documentation site
- Website output directory: `build/site`

## Package Distribution

**NPM:**
- Package name: `bmad-method`
- Repository: <https://github.com/bmad-code-org/BMAD-METHOD>
- Main entry: `tools/installer/bmad-cli.js`
- Bin commands: `bmad`, `bmad-method` (both alias same CLI)
- License: MIT
- Access: public
- Publishing: Automated via GitHub Actions with semantic versioning
  - Channels: `latest` (stable), `next` (prerelease)
  - Trusted publishing enabled (uses OIDC tokens)
  - Provenance metadata included

---

*Stack analysis: 2026-04-08*
