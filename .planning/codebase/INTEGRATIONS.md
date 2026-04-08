# External Integrations

**Analysis Date:** 2026-04-08

## APIs & External Services

**NPM Registry:**
- Service: npm public registry
- What it's used for: Package distribution, installation, version management, update checking
  - Version queries: `npm view bmad-method@tag version` (async, best-effort in background)
  - Installation trigger: `npm ci` for deterministic installs in CI
  - Publishing: `npm publish --tag [latest|next] --provenance` with OIDC trusted publishing
  - Implementation: `tools/installer/bmad-cli.js` checkForUpdate() function

**GitHub API:**
- Service: GitHub repository operations
- What it's used for: Release management, commit information, repository context
  - Release creation: `gh release create` with changelog extraction
  - Release note generation: `--generate-notes` (fallback)
  - Implementation: `.github/workflows/publish.yaml` (lines 119-136)
  - Auth: `${{ secrets.GITHUB_TOKEN }}` (default GitHub Actions token)

## Version Control & Repository

**Git:**
- Git operations for version commits and tag pushes
- Signed commits via GitHub App when doing stable releases
- Tag convention: `v{semver}` (e.g., `v6.2.2`)
- Implementation: `.github/workflows/publish.yaml` post-publish steps

## Webhooks & Callbacks

**Incoming:**
- Not detected

**Outgoing:**
- Discord Webhook: `${{ secrets.DISCORD_WEBHOOK }}`
  - Trigger: Package release (publish workflow)
  - Message format: Release announcement with version and link
  - Endpoint: Not in code (stored as GitHub secret)
  - Implementation: `.github/workflows/publish.yaml` (lines 138-152)
  
- Discord Webhook: Pull request and issue notifications
  - Triggers: PR opened/closed/merged, issue opened
  - Implementation: `.github/workflows/discord.yaml`
  - Payloads: Formatted messages via `curl` POST to webhook URL
  - Flow: Shell script helpers at `.github/scripts/discord-helpers.sh`

## Authentication & Identity

**Auth Provider:**
- Custom: GitHub App OIDC (trusted publishing)
  - App ID secret: `${{ secrets.RELEASE_APP_ID }}`
  - Private key secret: `${{ secrets.RELEASE_APP_PRIVATE_KEY }}`
  - Purpose: Signing release commits without hardcoded tokens
  - Implementation: `.github/workflows/publish.yaml` (lines 43-49)
  - Token generation: `actions/create-github-app-token@v2`

**CI/CD Authentication:**
- `GITHUB_TOKEN`: Automatic token provided by GitHub Actions
- npm OIDC: Trusted publishing removes need for hardcoded npm auth tokens
  - Enabled by npm >= 11.5.1 with `npm publish --provenance`

## Data Storage

**Databases:**
- None detected

**File Storage:**
- Local filesystem only:
  - Project root detection: `tools/installer/project-root.js`
  - File operations: `tools/installer/file-ops.js`
  - Custom module caching: `tools/installer/core/custom-module-cache.js`
  - Temp directories for updates/backups

**Configuration Storage:**
- YAML-based manifests (module configs)
- JSON manifests (skill definitions, file references)
- Installation state: Stored in BMAD folder structure
- No external database integration

**Caching:**
- npm offline-first caching (`prefer-offline=true` in `.npmrc`)
- No external caching service

## Monitoring & Observability

**Error Tracking:**
- None detected

**Logs:**
- Console output via CLI (`tools/installer/ui.js`)
- GitHub Actions logs (workflow runs)
- No external logging service

## CI/CD & Deployment

**Hosting:**
- GitHub Pages (documentation site)
- npm public registry (package distribution)

**CI Pipeline:**
- GitHub Actions (5 workflows):
  - `docs.yaml` - Build and deploy documentation on main branch
  - `publish.yaml` - NPM package publishing and release management
  - `discord.yaml` - PR/issue notification to Discord
  - `quality.yaml` - Linting, formatting, test validation
  - `coderabbit-review.yaml` - Code review automation
  - Workflows implement:
    - Node.js setup from `.nvmrc`
    - npm install with caching
    - Semantic versioning and release tagging
    - Multi-channel publishing (latest/next tags)
    - Provenance metadata generation

**Deployment:**
- GitHub Pages Actions: `actions/upload-pages-artifact` and `actions/deploy-pages`
- Documentation output: `build/site` directory
- Automatic deployment on main branch push to docs/**

## Environment Configuration

**Required env vars:**
- For docs build: `SITE_URL` (optional override, auto-derives from `GITHUB_REPOSITORY`)
- For publish: `RELEASE_APP_ID`, `RELEASE_APP_PRIVATE_KEY` (GitHub App)

**Secrets location:**
- Repository secrets (GitHub UI):
  - `DISCORD_WEBHOOK` - Discord notification endpoint
  - `RELEASE_APP_ID` - GitHub App ID
  - `RELEASE_APP_PRIVATE_KEY` - GitHub App signing key
- Workflow variables (GitHub UI):
  - `SITE_URL` - Optional documentation site URL override

**No hardcoded secrets in code:**
- All sensitive values passed via GitHub secrets
- Environment variable references only: `${{ secrets.* }}`

## Cross-Cutting Integration Patterns

**CLI-based Installation:**
- Installer prompts users for IDE selection, custom modules
- Resolves project root and installation paths
- No external API calls for user configuration (local-only)

**Documentation as Infrastructure:**
- Starlight integration for structured docs
- Astro for static generation
- Markdown source with YAML frontmatter
- Build on every docs/** change, auto-deploy

**Module Management:**
- Official modules: Bundled with package
- Custom modules: User-provided, cached locally
- External modules: Third-party, discoverable via manifest
- No central registry lookup (manifest-based)

---

*Integration audit: 2026-04-08*
