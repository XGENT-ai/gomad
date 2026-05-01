---
name: ci-cd
description: Use this when configuring Playwright in CI/CD pipelines, specifically GitHub Actions workflows, test sharding, parallel execution, or Docker containers. Covers `npx playwright install --with-deps`, `npx playwright install-deps` (cache hit path), `~/.cache/ms-playwright` caching with `actions/cache@v4`, sharding with `--shard=1/4` and `npx playwright merge-reports --reporter=html`, blob reporter for shard merging, `actions/upload-artifact@v4` with `if: ${{ !cancelled() }}`, `concurrency.cancel-in-progress`, `fail-fast: false` for matrix jobs, container jobs with `mcr.microsoft.com/playwright:v1.48.0-noble`, Docker Compose stacks with health checks, `HOME: /root` env var for container jobs, and CI playwright.config.ts settings (`forbidOnly`, `retries`, `workers: '50%'`). Also covers PR vs nightly workflow strategies and scheduled runs. Use this when tests pass locally but fail in CI, for browser launch failures, or sharded report merging issues.
source: https://github.com/currents-dev/playwright-best-practices-skill
license: MIT
last_reviewed: 2026-05-02
---

# CI/CD Integration

## CI playwright.config.ts Reference

```typescript
// playwright.config.ts - CI optimized
export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? '50%' : undefined,
  reporter: process.env.CI
    ? [['blob'], ['github'], ['html']]
    : [['list'], ['html', { open: 'on-failure' }]],
  use: {
    baseURL: process.env.BASE_URL || "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
});
```

## GitHub Actions

### Basic Workflow

**Use when**: Starting a new project or running a small test suite (under 5 minutes).

```yaml
# .github/workflows/e2e.yml
name: E2E Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

concurrency:
  group: e2e-${{ github.ref }}
  cancel-in-progress: true

env:
  CI: true

jobs:
  test:
    timeout-minutes: 30
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - run: npm ci

      - name: Cache browsers
        id: browser-cache
        uses: actions/cache@v4
        with:
          path: ~/.cache/ms-playwright
          key: pw-${{ runner.os }}-${{ hashFiles('package-lock.json') }}

      - name: Install browsers
        if: steps.browser-cache.outputs.cache-hit != 'true'
        run: npx playwright install --with-deps

      - name: Install OS dependencies
        if: steps.browser-cache.outputs.cache-hit == 'true'
        run: npx playwright install-deps

      - run: npx playwright test

      - name: Upload report
        uses: actions/upload-artifact@v4
        if: ${{ !cancelled() }}
        with:
          name: test-report
          path: playwright-report/
          retention-days: 14

      - name: Upload traces
        uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: traces
          path: test-results/
          retention-days: 7
```

### Sharded Execution

**Use when**: Test suite exceeds 10 minutes. Sharding cuts wall-clock time significantly.
**Avoid when**: Suite runs under 5 minutes — sharding overhead negates benefits.

```yaml
# .github/workflows/e2e-sharded.yml
name: E2E Tests (Sharded)

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

concurrency:
  group: e2e-${{ github.ref }}
  cancel-in-progress: true

env:
  CI: true

jobs:
  test:
    timeout-minutes: 20
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        shard: [1/4, 2/4, 3/4, 4/4]

    steps:
      - uses: actions/checkout@v4

      - run: npm ci

      - name: Cache browsers
        id: browser-cache
        uses: actions/cache@v4
        with:
          path: ~/.cache/ms-playwright
          key: pw-${{ runner.os }}-${{ hashFiles('package-lock.json') }}

      - name: Install browsers
        if: steps.browser-cache.outputs.cache-hit != 'true'
        run: npx playwright install --with-deps

      - name: Install OS dependencies
        if: steps.browser-cache.outputs.cache-hit == 'true'
        run: npx playwright install-deps

      - name: Run tests (shard ${{ matrix.shard }})
        run: npx playwright test --shard=${{ matrix.shard }}

      - name: Upload blob report
        uses: actions/upload-artifact@v4
        if: ${{ !cancelled() }}
        with:
          name: blob-${{ strategy.job-index }}
          path: blob-report/
          retention-days: 1

  merge:
    if: ${{ !cancelled() }}
    needs: test
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - run: npm ci

      - name: Download blob reports
        uses: actions/download-artifact@v4
        with:
          path: all-blobs
          pattern: blob-*
          merge-multiple: true

      - name: Merge reports
        run: npx playwright merge-reports --reporter=html ./all-blobs

      - name: Upload merged report
        uses: actions/upload-artifact@v4
        with:
          name: test-report
          path: playwright-report/
          retention-days: 14
```

Enable blob reporter for sharding:

```typescript
// playwright.config.ts
export default defineConfig({
  reporter: process.env.CI
    ? [['blob'], ['github']]
    : [['html', { open: 'on-failure' }]],
});
```

### Container-Based Execution

**Use when**: Reproducible environment matching local Docker setup, or runner OS dependencies cause issues.

```yaml
# .github/workflows/e2e-container.yml
name: E2E Tests (Container)

on:
  pull_request:
    branches: [main]

jobs:
  test:
    timeout-minutes: 30
    runs-on: ubuntu-latest
    container:
      image: mcr.microsoft.com/playwright:v1.48.0-noble

    steps:
      - uses: actions/checkout@v4

      - run: npm ci

      - name: Run tests
        run: npx playwright test
        env:
          HOME: /root

      - uses: actions/upload-artifact@v4
        if: ${{ !cancelled() }}
        with:
          name: test-report
          path: playwright-report/
          retention-days: 14
```

### Environment Secrets

```yaml
# .github/workflows/e2e-staging.yml
jobs:
  test:
    timeout-minutes: 30
    runs-on: ubuntu-latest
    environment: staging

    env:
      CI: true
      BASE_URL: ${{ vars.STAGING_URL }}
      TEST_USER_PASSWORD: ${{ secrets.TEST_USER_PASSWORD }}
      API_TOKEN: ${{ secrets.API_TOKEN }}

    steps:
      - uses: actions/checkout@v4
      - run: npm ci

      - name: Cache browsers
        id: browser-cache
        uses: actions/cache@v4
        with:
          path: ~/.cache/ms-playwright
          key: pw-${{ runner.os }}-${{ hashFiles('package-lock.json') }}

      - name: Install browsers
        if: steps.browser-cache.outputs.cache-hit != 'true'
        run: npx playwright install --with-deps

      - name: Install OS dependencies
        if: steps.browser-cache.outputs.cache-hit == 'true'
        run: npx playwright install-deps

      - name: Run smoke tests
        run: npx playwright test --grep @smoke

      - uses: actions/upload-artifact@v4
        if: ${{ !cancelled() }}
        with:
          name: staging-report
          path: playwright-report/
          retention-days: 14
```

### Scheduled Nightly Runs

**Use when**: Full regression suite is too slow for every PR — run nightly instead.

```yaml
# .github/workflows/nightly.yml
name: Nightly Regression

on:
  schedule:
    - cron: '0 3 * * 1-5'
  workflow_dispatch:

jobs:
  test:
    timeout-minutes: 60
    runs-on: ubuntu-latest

    env:
      CI: true
      BASE_URL: ${{ vars.STAGING_URL }}

    steps:
      - uses: actions/checkout@v4
      - run: npm ci

      - name: Install browsers
        run: npx playwright install --with-deps

      - name: Run full regression
        run: npx playwright test --grep @regression

      - uses: actions/upload-artifact@v4
        if: ${{ !cancelled() }}
        with:
          name: nightly-${{ github.run_number }}
          path: playwright-report/
          retention-days: 30

      - name: Notify on failure
        if: failure()
        uses: slackapi/slack-github-action@latest
        with:
          payload: |
            {
              "text": "Nightly regression failed: ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}"
            }
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

### Reusable Workflow

**Use when**: Multiple repositories share the same Playwright setup.

```yaml
# .github/workflows/pw-reusable.yml
name: Playwright Reusable

on:
  workflow_call:
    inputs:
      node-version:
        type: string
        default: 'lts/*'
      test-command:
        type: string
        default: 'npx playwright test'
    secrets:
      BASE_URL:
        required: false
      TEST_PASSWORD:
        required: false

jobs:
  test:
    timeout-minutes: 30
    runs-on: ubuntu-latest

    env:
      CI: true
      BASE_URL: ${{ secrets.BASE_URL }}
      TEST_PASSWORD: ${{ secrets.TEST_PASSWORD }}

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ inputs.node-version }}
          cache: npm

      - run: npm ci

      - name: Cache browsers
        id: browser-cache
        uses: actions/cache@v4
        with:
          path: ~/.cache/ms-playwright
          key: pw-${{ runner.os }}-${{ hashFiles('package-lock.json') }}

      - name: Install browsers
        if: steps.browser-cache.outputs.cache-hit != 'true'
        run: npx playwright install --with-deps

      - name: Install OS dependencies
        if: steps.browser-cache.outputs.cache-hit == 'true'
        run: npx playwright install-deps

      - name: Run tests
        run: ${{ inputs.test-command }}

      - uses: actions/upload-artifact@v4
        if: ${{ !cancelled() }}
        with:
          name: test-report
          path: playwright-report/
          retention-days: 14
```

## Scenario Guide

| Scenario | Approach |
|---|---|
| Small suite (< 5 min) | Single job, no sharding |
| Medium suite (5-20 min) | 2-4 shards with matrix |
| Large suite (20+ min) | 4-8 shards + blob merge |
| Cross-browser on PRs | Chromium only on PRs; all browsers on main |
| Staging/prod smoke tests | Separate workflow with `environment:` |
| Nightly full regression | `schedule` trigger + `workflow_dispatch` |
| Multiple repos, same setup | Reusable workflow with `workflow_call` |
| Reproducible env needed | Container job with Playwright image |

## Tag-Based CI Strategy

```yaml
# PR workflow - fast feedback
- name: Run critical tests
  run: npx playwright test --grep "@smoke|@critical"

# Nightly workflow - full coverage
- name: Run all tests
  run: npx playwright test --grep-invert @flaky
```

## Parallel Execution and Sharding

### Worker Configuration

```ts
export default defineConfig({
  fullyParallel: true,
  workers: process.env.CI ? "50%" : undefined,
});
```

**`fullyParallel` behavior**:

| Setting | Files parallel | Tests in file parallel |
| -------------------------------- | -------------- | ---------------------- |
| `fullyParallel: false` (default) | Yes | No (serial) |
| `fullyParallel: true` | Yes | Yes |

**Serial execution for specific files**:

```ts
// tests/checkout-flow.spec.ts
test.describe.configure({ mode: "serial" });

test("add items to cart", async ({ page }) => { /* ... */ });
test("complete payment", async ({ page }) => { /* ... */ });
```

### Sharding CLI

```bash
# Job 1            Job 2            Job 3            Job 4
--shard=1/4        --shard=2/4      --shard=3/4      --shard=4/4

# Merge all blobs into HTML
npx playwright merge-reports --reporter=html ./all-blob-reports

# Multiple formats
npx playwright merge-reports --reporter=html,json,junit ./all-blob-reports
```

### Worker-Scoped Fixtures

Expensive resources (DB connections, auth tokens) created once per worker, not per test:

```ts
// fixtures.ts
import { test as base } from "@playwright/test";

type WorkerFixtures = {
  dbClient: DatabaseClient;
  apiToken: string;
};

export const test = base.extend<{}, WorkerFixtures>({
  dbClient: [
    async ({}, use) => {
      const client = await DatabaseClient.connect(process.env.DB_URL!);
      await use(client);
      await client.disconnect();
    },
    { scope: "worker" },
  ],

  apiToken: [
    async ({}, use, workerInfo) => {
      const res = await fetch(`${process.env.API_URL}/auth`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user: `test-user-${workerInfo.workerIndex}`,
          password: process.env.TEST_PASSWORD,
        }),
      });
      const { token } = await res.json();
      await use(token);
    },
    { scope: "worker" },
  ],
});
```

### Test Isolation for Parallelism

Each test must create its own state. No test should depend on or modify shared state:

```ts
// BAD: Shared user causes race conditions
test("edit settings", async ({ page }) => {
  await page.goto("/users/test-user/settings");
  await page.getByLabel("Email").fill("new@example.com");
  await page.getByRole("button", { name: "Save" }).click();
});

// GOOD: Unique user per test
test("edit settings", async ({ page, request }) => {
  const res = await request.post("/api/users", {
    data: { name: `user-${Date.now()}`, email: `${Date.now()}@test.com` },
  });
  const user = await res.json();

  await page.goto(`/users/${user.id}/settings`);
  await page.getByLabel("Email").fill("updated@example.com");
  await page.getByRole("button", { name: "Save" }).click();

  await request.delete(`/api/users/${user.id}`);
});
```

### Parallelism Decision Guide

| Scenario | Workers | Shards | Reason |
| -------------------------------- | -------------- | ------ | --------------------------------------- |
| < 50 tests, < 5 min | Auto (default) | None | No optimization needed |
| 50-200 tests, 5-15 min | `'50%'` in CI | 2-4 | Balance speed and cost |
| 200+ tests, > 15 min | `'50%'` in CI | 4-8 | Keep feedback under 10 min |
| Tests modify shared database | 1 or isolate | Useful | Sharding splits files; workers run them |

## Docker

### Official Image Usage

```bash
docker run --rm \
  -v $(pwd):/app \
  -w /app \
  -e CI=true \
  -e BASE_URL=http://host.docker.internal:3000 \
  mcr.microsoft.com/playwright:v1.48.0-noble \
  bash -c "npm ci && npx playwright test"

# With report extraction
docker run --rm \
  -v $(pwd):/app \
  -v $(pwd)/playwright-report:/app/playwright-report \
  -v $(pwd)/test-results:/app/test-results \
  -w /app \
  mcr.microsoft.com/playwright:v1.48.0-noble \
  bash -c "npm ci && npx playwright test"
```

### Custom Dockerfile

```dockerfile
FROM mcr.microsoft.com/playwright:v1.48.0-noble

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

CMD ["npx", "playwright", "test"]
```

Chromium-only slim image:

```dockerfile
FROM node:latest-slim

RUN npx playwright install --with-deps chromium

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .

CMD ["npx", "playwright", "test", "--project=chromium"]
```

### Docker Compose Stack

Full application stack with database and test runner:

```yaml
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=test
      - DATABASE_URL=postgresql://postgres:postgres@db:5432/test
    depends_on:
      db:
        condition: service_healthy

  db:
    image: postgres:latest-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: test
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5
    tmpfs:
      - /var/lib/postgresql/data

  e2e:
    image: mcr.microsoft.com/playwright:v1.48.0-noble
    working_dir: /app
    volumes:
      - .:/app
      - /app/node_modules
    environment:
      - CI=true
      - BASE_URL=http://app:3000
    depends_on:
      - app
    command: bash -c "npm ci && npx playwright test"
    profiles:
      - test
```

```bash
docker compose --profile test up --abort-on-container-exit --exit-code-from e2e
docker compose --profile test down -v
```

### Docker Decision Guide

| Scenario | Approach |
|---|---|
| Simple CI pipeline | Official image as CI container |
| Tests need database + cache | Docker Compose with app, db, e2e services |
| Team needs identical environments | Dev Container or custom Dockerfile |
| Only testing Chromium | Slim image with `install --with-deps chromium` |
| Cross-browser testing | Official image (all browsers pre-installed) |
| Local development | Run directly on host for faster iteration |

## Common Mistakes

| Mistake | Problem | Fix |
|---|---|---|
| No `concurrency` group | Duplicate runs waste minutes | Add `concurrency: { group: ..., cancel-in-progress: true }` |
| `fail-fast: true` with sharding | One failure cancels others | Set `fail-fast: false` |
| No browser caching | 60-90 seconds wasted per run | Cache `~/.cache/ms-playwright` |
| No `timeout-minutes` | Stuck jobs run for 6 hours | Set explicit timeout: 20-30 minutes |
| Artifacts only on failure | No report when tests pass | Use `if: ${{ !cancelled() }}` |
| Hardcoded secrets | Security risk | Use GitHub Secrets and Environments |
| All browsers on every PR | 3x CI cost | Chromium on PR; cross-browser on main |
| No artifact retention | Default 90-day fills storage | Set `retention-days: 7-14` |
| Missing `--with-deps` | Browser launch failures | Always use `npx playwright install --with-deps` |
| Running as non-root in Docker | Chromium sandbox permission errors | Run as root or add `HOME: /root` env var |
| Bind-mounting `node_modules` from host | Platform-specific binary crashes | Use anonymous volume: `-v /app/node_modules` |
| No health checks in Docker Compose | Tests start before database ready | Add `healthcheck` with `depends_on: condition: service_healthy` |

## Troubleshooting

### Browser launch fails: "Missing dependencies"

**Cause**: Browsers restored from cache but OS dependencies weren't cached.

**Fix**: Run `npx playwright install-deps` on cache hit.

### Tests pass locally but timeout in CI

**Cause**: CI runners have fewer resources than dev machines.

**Fix**: Reduce workers and increase timeouts.

```typescript
export default defineConfig({
  workers: process.env.CI ? '50%' : undefined,
  use: {
    actionTimeout: process.env.CI ? 15_000 : 10_000,
    navigationTimeout: process.env.CI ? 30_000 : 15_000,
  },
});
```

### Sharded reports incomplete

**Cause**: Artifact names collide or `merge-multiple` not set.

**Fix**: Use unique artifact names per shard and enable `merge-multiple`:

```yaml
# Upload in each shard
- uses: actions/upload-artifact@v4
  with:
    name: blob-${{ strategy.job-index }}
    path: blob-report/

# Download in merge job
- uses: actions/download-artifact@v4
  with:
    path: all-blobs
    pattern: blob-*
    merge-multiple: true
```

### `webServer` fails: "port already in use"

```yaml
- name: Kill stale processes
  run: lsof -ti:3000 | xargs kill -9 2>/dev/null || true
```

### No PR annotations

**Cause**: `github` reporter not configured.

**Fix**: Add to CI reporter configuration.

```typescript
export default defineConfig({
  reporter: process.env.CI
    ? [['html', { open: 'never' }], ['github']]
    : [['html', { open: 'on-failure' }]],
});
```

### "net::ERR_CONNECTION_REFUSED" in docker-compose

Tests trying to reach `localhost` instead of service name. Set `BASE_URL=http://app:3000` in the container environment and configure `baseURL` in playwright.config.ts to read from `process.env.BASE_URL`.

### "browserType.launch: Executable doesn't exist"

Playwright version mismatch with Docker image. Ensure `@playwright/test` package version matches the image tag:

```bash
npm ls @playwright/test
docker pull mcr.microsoft.com/playwright:v<matching-version>-noble
```
