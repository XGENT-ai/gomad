---
name: configuration
description: Configure playwright.config.ts with defineConfig — timeouts, projects, webServer, and globalSetup.
license: MIT
last_reviewed: 2026-05-02
---

# Playwright Configuration

## CLI Quick Reference

```bash
npx playwright init                           # scaffold config + first test
npx playwright test --config=custom.config.ts # use alternate config
npx playwright test --project=chromium        # run single project
npx playwright test --reporter=html           # override reporter
npx playwright test --grep @smoke             # run tests tagged @smoke
npx playwright test --grep-invert @slow       # exclude @slow tests
npx playwright show-report                    # open last HTML report
DEBUG=pw:api npx playwright test              # verbose logging
```

## Production-Ready Config

```ts
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.ts',

  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? '50%' : undefined,

  reporter: process.env.CI
    ? [['html', { open: 'never' }], ['github']]
    : [['html', { open: 'on-failure' }]],

  timeout: 30_000,
  expect: { timeout: 5_000 },

  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:4000',
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    locale: 'en-US',
    timezoneId: 'America/Los_Angeles',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'mobile-chrome', use: { ...devices['Pixel 7'] } },
    { name: 'mobile-safari', use: { ...devices['iPhone 14'] } },
  ],

  webServer: {
    command: 'npm run start',
    url: 'http://localhost:4000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
```

## Decision Guide

### Timeout Selection

| Symptom | Setting | Default | Recommended |
|---------|---------|---------|-------------|
| Test takes too long overall | `timeout` | 30s | 30-60s (max 120s) |
| Assertion retries too long/short | `expect.timeout` | 5s | 5-10s |
| `page.goto()` or `waitForURL()` times out | `navigationTimeout` | 30s | 10-30s |
| `click()`, `fill()` time out | `actionTimeout` | 0 (unlimited) | 10-15s |
| Dev server slow to start | `webServer.timeout` | 60s | 60-180s |

### Server Management

| Scenario | Approach |
|----------|----------|
| App in same repo | `webServer` with `reuseExistingServer: !process.env.CI` |
| Separate repos | Manual start or Docker Compose |
| Testing deployed environment | No `webServer`; set `baseURL` via env |
| Multiple services | Array of `webServer` entries |

### Single vs Multi-Project

| Scenario | Approach |
|----------|----------|
| Early development | Single project (chromium only) |
| Pre-release validation | Multi-project: chromium + firefox + webkit |
| Mobile-responsive app | Add mobile projects alongside desktop |
| Auth + non-auth tests | Setup project with dependencies |
| Tight CI budget | Chromium on PRs; all browsers on main |

### globalSetup vs Setup Projects vs Fixtures

| Need | Use |
|------|-----|
| One-time DB seed | `globalSetup` |
| Shared browser auth | Setup project with `dependencies` |
| Per-test isolated state | Custom fixture via `test.extend()` |
| Cleanup after all tests | `globalTeardown` |

## Environment-Specific Configuration

```ts
// playwright.config.ts
import { defineConfig } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

const ENV = process.env.TEST_ENV || 'local';
dotenv.config({ path: path.resolve(__dirname, `.env.${ENV}`) });

const envConfig: Record<string, { baseURL: string; retries: number }> = {
  local:   { baseURL: 'http://localhost:4000',      retries: 0 },
  staging: { baseURL: 'https://staging.myapp.com',  retries: 2 },
  prod:    { baseURL: 'https://myapp.com',          retries: 2 },
};

export default defineConfig({
  testDir: './e2e',
  retries: envConfig[ENV].retries,
  use: { baseURL: envConfig[ENV].baseURL },
});
```

```bash
TEST_ENV=staging npx playwright test
TEST_ENV=prod npx playwright test --grep @smoke
```

## Environment Variables with .env

```bash
# .env.example (commit this)
BASE_URL=http://localhost:4000
TEST_PASSWORD=
API_KEY=

# .env.local (gitignored)
BASE_URL=http://localhost:4000
TEST_PASSWORD=secret123
API_KEY=dev-key-abc
```

```bash
# .gitignore
.env
.env.local
.env.staging
.env.production
playwright/.auth/
```

```bash
npm install -D dotenv
```

## Artifact Collection Strategy

| Setting | Local | CI | Reason |
|---------|-------|-----|--------|
| `trace` | `'off'` | `'on-first-retry'` | Traces are large; collect on failure only |
| `screenshot` | `'off'` | `'only-on-failure'` | Useful for CI debugging |
| `video` | `'off'` | `'retain-on-failure'` | Recording slows tests |

```ts
export default defineConfig({
  use: {
    trace: process.env.CI ? 'on-first-retry' : 'off',
    screenshot: process.env.CI ? 'only-on-failure' : 'off',
    video: process.env.CI ? 'retain-on-failure' : 'off',
  },
});
```

## Projects and Dependencies

### Basic Multi-Browser Setup

```typescript
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
});
```

### Test Type Projects

```typescript
export default defineConfig({
  projects: [
    {
      name: "e2e",
      testDir: "./tests/e2e",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "api",
      testDir: "./tests/api",
      use: { baseURL: "http://localhost:3000" },
    },
  ],
});
```

### Setup Project with Dependencies

The recommended approach for shared authentication state. Setup projects run before main test projects and have access to Playwright fixtures.

```ts
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  projects: [
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.auth/session.json',
      },
      dependencies: ['setup'],
    },
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        storageState: 'playwright/.auth/session.json',
      },
      dependencies: ['setup'],
    },
  ],
});
```

```ts
// e2e/auth.setup.ts
import { test as setup, expect } from '@playwright/test';

const authFile = 'playwright/.auth/session.json';

setup('authenticate', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Username').fill('testuser@example.com');
  await page.getByLabel('Password').fill(process.env.TEST_PASSWORD!);
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(page.getByRole('heading', { name: 'Home' })).toBeVisible();
  await page.context().storageState({ path: authFile });
});
```

### Multiple Auth States

```typescript
export default defineConfig({
  projects: [
    { name: "setup-admin", testMatch: /admin\.setup\.ts/ },
    { name: "setup-user", testMatch: /user\.setup\.ts/ },

    {
      name: "admin-tests",
      testDir: "./tests/admin",
      use: { storageState: ".auth/admin.json" },
      dependencies: ["setup-admin"],
    },
    {
      name: "user-tests",
      testDir: "./tests/user",
      use: { storageState: ".auth/user.json" },
      dependencies: ["setup-user"],
    },
    {
      name: "integration-tests",
      testDir: "./tests/integration",
      dependencies: ["setup-admin", "setup-user"],
    },
  ],
});
```

### Chained Dependencies

```typescript
export default defineConfig({
  projects: [
    { name: "db-setup", testMatch: /db\.setup\.ts/ },
    {
      name: "auth-setup",
      testMatch: /auth\.setup\.ts/,
      dependencies: ["db-setup"],
    },
    {
      name: "seed-setup",
      testMatch: /seed\.setup\.ts/,
      dependencies: ["auth-setup"],
    },
    {
      name: "tests",
      testDir: "./tests",
      dependencies: ["seed-setup"],
    },
  ],
});
```

### Teardown Projects

```typescript
export default defineConfig({
  projects: [
    {
      name: "setup",
      testMatch: /.*\.setup\.ts/,
      teardown: "teardown",
    },
    {
      name: "teardown",
      testMatch: /.*\.teardown\.ts/,
    },
    {
      name: "tests",
      dependencies: ["setup"],
    },
  ],
});
```

```typescript
// cleanup.teardown.ts
import { test as teardown } from "@playwright/test";

teardown("cleanup", async ({ request }) => {
  await request.delete("/api/test/data");
});
```

### Conditional Projects

```typescript
const projects = [
  { name: "chromium", use: { ...devices["Desktop Chrome"] } },
];

if (process.env.CI) {
  projects.push({ name: "firefox", use: { ...devices["Desktop Firefox"] } });
}

if (process.env.TEST_MOBILE) {
  projects.push({ name: "mobile", use: { ...devices["iPhone 14"] } });
}

export default defineConfig({ projects });
```

### Project-Specific Tag Filtering

```ts
export default defineConfig({
  projects: [
    { name: 'smoke', grep: /@smoke/, use: { ...devices['Desktop Chrome'] } },
    { name: 'regression', grepInvert: /@smoke/, use: { ...devices['Desktop Chrome'] } },
    { name: 'critical-only', grep: /@critical/, use: { ...devices['Desktop Chrome'] } },
  ],
});
```

## Global Setup and Teardown

`globalSetup` runs once before all tests and workers. It has **no access** to Playwright fixtures (`page`, `request`, `context`).

### Database Migration in Setup

```typescript
// global-setup.ts
import { execSync } from "child_process";
import { FullConfig } from "@playwright/test";

async function globalSetup(config: FullConfig) {
  const { baseURL } = config.projects[0].use;
  console.log(`Setting up for ${baseURL}`);

  execSync("npx prisma migrate deploy", { stdio: "inherit" });
  execSync("npx prisma db seed", { stdio: "inherit" });

  process.env.TEST_RUN_ID = `run-${Date.now()}`;
}

export default globalSetup;
```

### Global Setup with Return Value

```typescript
// global-setup.ts
async function globalSetup(config: FullConfig): Promise<() => Promise<void>> {
  const server = await startTestServer();

  // Return cleanup function (alternative to globalTeardown)
  return async () => {
    await server.stop();
  };
}

export default globalSetup;
```

### Docker Compose Setup

```typescript
// global-setup.ts
import { execSync } from "child_process";

async function globalSetup() {
  execSync("docker-compose -f docker-compose.test.yml up -d", { stdio: "inherit" });
  execSync("docker-compose -f docker-compose.test.yml exec -T db pg_isready", { stdio: "inherit" });
}

export default globalSetup;
```

```typescript
// global-teardown.ts
import { execSync } from "child_process";

async function globalTeardown() {
  execSync("docker-compose -f docker-compose.test.yml down -v", { stdio: "inherit" });
}

export default globalTeardown;
```

### Environment Variables Validation

```typescript
// global-setup.ts
import dotenv from "dotenv";
import path from "path";

async function globalSetup() {
  const envFile = process.env.CI ? ".env.ci" : ".env.test";
  dotenv.config({ path: path.resolve(process.cwd(), envFile) });

  const required = ["DATABASE_URL", "API_KEY", "TEST_EMAIL"];
  for (const key of required) {
    if (!process.env[key]) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }
}

export default globalSetup;
```

### Register in Config

```ts
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  globalSetup: './e2e/setup.ts',
  globalTeardown: './e2e/teardown.ts',

  // Combine with setup projects for auth
  projects: [
    { name: 'setup', testMatch: /.*\.setup\.ts/ },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], storageState: '.auth/user.json' },
      dependencies: ['setup'],
    },
  ],
});
```

### Parallel Execution Caveats

```
globalSetup runs ONCE
↓
┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐
│ Worker 1│  │ Worker 2│  │ Worker 3│  │ Worker 4│
│ tests   │  │ tests   │  │ tests   │  │ tests   │
└─────────┘  └─────────┘  └─────────┘  └─────────┘
↓
globalTeardown runs ONCE
```

- Global setup has **no access** to Playwright fixtures (`page`, `request`, `context`)
- State created in global setup is **shared** across all workers
- Use worker-scoped fixtures (not `globalSetup`) when tests modify shared state

```typescript
// BAD: Global setup creates ONE user, all workers fight over it
async function globalSetup() {
  await createUser({ email: "test@example.com" }); // Shared!
}

// GOOD: Each worker gets its own user via worker-scoped fixture
// Uses workerInfo.workerIndex to create unique data per worker
```

### When to Prefer Worker-Scoped Fixtures

| Scenario | Why Fixtures Are Better |
| ------------------------------------ | ---------------------------------------------------- |
| Each worker needs isolated resources | Fixtures can create per-worker databases, servers |
| Setup needs Playwright APIs | Fixtures have access to `page`, `request`, `browser` |
| Resources need cleanup per worker | Worker fixtures auto-cleanup when worker exits |

## webServer Configuration

```ts
export default defineConfig({
  webServer: {
    command: process.env.CI
      ? 'npm run build && npm run preview'
      : 'npm run dev',
    url: 'http://localhost:4000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      NODE_ENV: 'test',
      DB_URL: process.env.DB_URL || 'postgresql://localhost:5432/testdb',
    },
  },
});
```

## Anti-Patterns

| Don't | Problem | Do Instead |
|-------|---------|------------|
| `timeout: 300_000` globally | Masks flaky tests; slow CI | Fix root cause; keep 30s default |
| Hardcoded URLs: `page.goto('http://localhost:4000/login')` | Breaks in other environments | Use `baseURL` + relative paths |
| All browsers on every PR | 3x CI time | Chromium on PRs; all on main |
| `trace: 'on'` always | Huge artifacts, slow uploads | `trace: 'on-first-retry'` |
| `video: 'on'` always | Massive storage; slow tests | `video: 'retain-on-failure'` |
| `retries: 3` locally | Hides flakiness | `retries: 0` local, `retries: 2` CI |
| No `forbidOnly` in CI | Committed `test.only` runs single test | `forbidOnly: !!process.env.CI` |
| `globalSetup` for browser auth | No browser context available | Use setup project with dependencies |
| Missing setup dependencies | Tests fail randomly | Declare all dependencies explicitly |
| Committing `.env` with credentials | Security risk | Commit `.env.example` only |

## Troubleshooting

### baseURL Not Working

**Cause**: Using absolute URL in `page.goto()` ignores `baseURL`.

```ts
// Wrong - ignores baseURL
await page.goto('http://localhost:4000/dashboard');

// Correct - uses baseURL
await page.goto('/dashboard');
```

### webServer Starts But Tests Get Connection Refused

**Cause**: `webServer.url` doesn't match actual server address or health check returns non-200.

```ts
webServer: {
  command: 'npm run dev',
  url: 'http://localhost:4000/api/health',  // use real endpoint
  reuseExistingServer: !process.env.CI,
  timeout: 120_000,
},
```

### Tests Pass Locally But Timeout in CI

**Cause**: CI machines are slower. Increase timeouts and reduce workers:

```ts
export default defineConfig({
  workers: process.env.CI ? '50%' : undefined,
  use: {
    navigationTimeout: process.env.CI ? 30_000 : 15_000,
    actionTimeout: process.env.CI ? 15_000 : 10_000,
  },
});
```

### "Target page, context or browser has been closed"

**Cause**: Test exceeded `timeout` and Playwright tore down browser during action.

**Fix**: Don't increase global timeout. Find slow step using trace:

```bash
npx playwright test --trace on
npx playwright show-report
```
