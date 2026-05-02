---
name: authentication
description: Set up Playwright auth with storageState, global setup, per-worker fixtures, and role-based access.
license: MIT
last_reviewed: 2026-05-02
---

# Authentication Testing

## Storage State Reuse

`storageState` serializes cookies and localStorage to a JSON file. Load it in any browser context to start authenticated instantly — no UI login per test.

```typescript
// scripts/generate-auth.ts — run once to generate the state file
import { chromium } from "@playwright/test";

async function generateAuthState() {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto("http://localhost:4000/login");
  await page.getByLabel("Username").fill("testuser@example.com");
  await page.getByLabel("Password").fill("secretPass123");
  await page.getByRole("button", { name: "Log in" }).click();
  await page.waitForURL("/home");

  await context.storageState({ path: ".auth/session.json" });
  await browser.close();
}

generateAuthState();
```

```typescript
// playwright.config.ts — load saved state for all tests
import { defineConfig } from "@playwright/test";

export default defineConfig({
  use: {
    baseURL: "http://localhost:4000",
    storageState: ".auth/session.json",
  },
});
```

```typescript
// tests/home.spec.ts — test starts already logged in
import { test, expect } from "@playwright/test";

test("authenticated user sees home page", async ({ page }) => {
  await page.goto("/home");
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
});
```

Add `.auth/` to `.gitignore`. Auth state files contain session tokens and should never be committed.

## Global Setup Authentication

**Use when**: You want to authenticate once before the entire test suite runs.
**Avoid when**: Different tests need different users, or your tokens expire faster than your suite runs.

```typescript
// global-setup.ts
import { chromium, type FullConfig } from "@playwright/test";

async function globalSetup(config: FullConfig) {
  const { baseURL } = config.projects[0].use;
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto(`${baseURL}/login`);
  await page.getByLabel("Username").fill(process.env.TEST_USER_EMAIL!);
  await page.getByLabel("Password").fill(process.env.TEST_USER_PASSWORD!);
  await page.getByRole("button", { name: "Log in" }).click();
  await page.waitForURL("**/home");

  await context.storageState({ path: ".auth/session.json" });
  await browser.close();
}

export default globalSetup;
```

```typescript
// playwright.config.ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  globalSetup: require.resolve("./global-setup"),
  use: {
    baseURL: "http://localhost:4000",
    storageState: ".auth/session.json",
  },
});
```

## Per-Worker Authentication

**Use when**: Each parallel worker needs its own authenticated session to avoid race conditions for tests that modify server-side state.
**Avoid when**: Tests are read-only and sharing a session is safe.

> **Sharded runs**: `parallelIndex` resets per shard, so different shards can have workers with the same index. To avoid collisions, include the shard identifier in the username (e.g., `worker-${SHARD_INDEX}-${parallelIndex}@example.com`) by passing a `SHARD_INDEX` environment variable from your CI matrix.

```typescript
// fixtures/auth.ts
import { test as base, type BrowserContext } from "@playwright/test";

type AuthFixtures = {
  authenticatedContext: BrowserContext;
};

export const test = base.extend<{}, AuthFixtures>({
  authenticatedContext: [
    async ({ browser }, use) => {
      const context = await browser.newContext();
      const page = await context.newPage();

      await page.goto("/login");
      await page
        .getByLabel("Username")
        .fill(`worker-${test.info().parallelIndex}@example.com`);
      await page.getByLabel("Password").fill("secretPass123");
      await page.getByRole("button", { name: "Log in" }).click();
      await page.waitForURL("/home");
      await page.close();

      await use(context);
      await context.close();
    },
    { scope: "worker" },
  ],
});

export { expect } from "@playwright/test";
```

```typescript
// tests/settings.spec.ts
import { test, expect } from "../fixtures/auth";

test("update display name", async ({ authenticatedContext }) => {
  const page = await authenticatedContext.newPage();
  await page.goto("/settings/profile");
  await page.getByLabel("Display name").fill("Updated Name");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Profile saved")).toBeVisible();
});
```

## Multiple Roles

**Use when**: Your app has role-based access control and you need to test different permission levels.

```typescript
// global-setup.ts — authenticate all roles
import { chromium, type FullConfig } from "@playwright/test";

const accounts = [
  { role: "admin", email: "admin@example.com", password: process.env.ADMIN_PASSWORD! },
  { role: "member", email: "member@example.com", password: process.env.MEMBER_PASSWORD! },
  { role: "guest", email: "guest@example.com", password: process.env.GUEST_PASSWORD! },
];

async function globalSetup(config: FullConfig) {
  const { baseURL } = config.projects[0].use;

  for (const { role, email, password } of accounts) {
    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(`${baseURL}/login`);
    await page.getByLabel("Username").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Log in" }).click();
    await page.waitForURL("**/home");

    await context.storageState({ path: `.auth/${role}.json` });
    await browser.close();
  }
}

export default globalSetup;
```

```typescript
// playwright.config.ts — one project per role
import { defineConfig } from "@playwright/test";

export default defineConfig({
  globalSetup: require.resolve("./global-setup"),
  projects: [
    {
      name: "admin",
      use: { storageState: ".auth/admin.json" },
      testMatch: "**/*.admin.spec.ts",
    },
    {
      name: "member",
      use: { storageState: ".auth/member.json" },
      testMatch: "**/*.member.spec.ts",
    },
    {
      name: "guest",
      use: { storageState: ".auth/guest.json" },
      testMatch: "**/*.guest.spec.ts",
    },
    {
      name: "anonymous",
      use: { storageState: { cookies: [], origins: [] } },
      testMatch: "**/*.anon.spec.ts",
    },
  ],
});
```

**Alternative**: Use a fixture that accepts a role parameter when you need role switching within a single spec file.

```typescript
// fixtures/auth.ts — role-based fixture
import { test as base, type Page } from "@playwright/test";
import fs from "fs";

type RoleFixtures = {
  loginAs: (role: "admin" | "member" | "guest") => Promise<Page>;
};

export const test = base.extend<RoleFixtures>({
  loginAs: async ({ browser }, use) => {
    const pages: Page[] = [];

    await use(async (role) => {
      const statePath = `.auth/${role}.json`;
      if (!fs.existsSync(statePath)) {
        throw new Error(`Auth state for role "${role}" not found at ${statePath}`);
      }
      const context = await browser.newContext({ storageState: statePath });
      const page = await context.newPage();
      pages.push(page);
      return page;
    });

    for (const page of pages) {
      await page.context().close();
    }
  },
});

export { expect } from "@playwright/test";
```

```typescript
// tests/role-comparison.spec.ts
import { test, expect } from "../fixtures/auth";

test("admin sees remove button, guest does not", async ({ loginAs }) => {
  const adminPage = await loginAs("admin");
  await adminPage.goto("/admin/users");
  await expect(adminPage.getByRole("button", { name: "Remove user" })).toBeVisible();

  const guestPage = await loginAs("guest");
  await guestPage.goto("/admin/users");
  await expect(guestPage.getByText("Access denied")).toBeVisible();
});
```

## OAuth/SSO Mocking

**Use when**: Your app authenticates via a third-party OAuth provider and you cannot hit the real provider in tests.
**Avoid when**: You have a dedicated test tenant on the OAuth provider.

A typical OAuth flow: user clicks "Sign in with Provider" → browser navigates to `https://accounts.provider.com/authorize?...` → provider redirects back to your app's callback route (e.g. `http://localhost:4000/auth/callback?code=ABC&state=XYZ`) → your backend exchanges the `code` for an access token and creates a session.

In tests you can short-circuit with `page.route()`: intercept the outbound request to the provider and respond with a `302` redirect straight to your callback route.

```typescript
// tests/oauth-login.spec.ts — mock the callback route
import { test, expect } from "@playwright/test";

test("login via mocked OAuth flow", async ({ page }) => {
  await page.route("https://accounts.provider.com/**", async (route) => {
    const callbackUrl = new URL("http://localhost:4000/auth/callback");
    callbackUrl.searchParams.set("code", "mock-auth-code-xyz");
    callbackUrl.searchParams.set("state", "expected-state-value");
    await route.fulfill({
      status: 302,
      headers: { location: callbackUrl.toString() },
    });
  });

  await page.goto("/login");
  await page.getByRole("button", { name: "Sign in with Provider" }).click();

  await page.waitForURL("/home");
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
});
```

```typescript
// tests/oauth-login.spec.ts — API-based session injection
import { test, expect } from "@playwright/test";

test("bypass OAuth entirely via API session injection", async ({ page }) => {
  const response = await page.request.post("/api/test/create-session", {
    data: { email: "oauth-user@example.com", provider: "provider", role: "member" },
  });
  expect(response.ok()).toBeTruthy();

  await page.context().storageState({ path: ".auth/oauth-user.json" });
  await page.goto("/home");
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
});
```

**Backend requirement**: Your backend must expose a test-only session creation endpoint (guarded by `NODE_ENV=test`) or accept a known test OAuth code.

## MFA Handling

**Use when**: Your app requires two-factor authentication (TOTP, SMS, email codes).
**Avoid when**: MFA is optional and you can disable it for test accounts.

**Strategy 1**: Generate real TOTP codes from a shared secret.

```typescript
// helpers/totp.ts
import * as OTPAuth from "otpauth";

export function generateTOTP(secret: string): string {
  const totp = new OTPAuth.TOTP({
    secret: OTPAuth.Secret.fromBase32(secret),
    digits: 6,
    period: 30,
    algorithm: "SHA1",
  });
  return totp.generate();
}
```

```typescript
// tests/mfa-login.spec.ts
import { test, expect } from "@playwright/test";
import { generateTOTP } from "../helpers/totp";

test("login with TOTP two-factor auth", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Username").fill("mfa-user@example.com");
  await page.getByLabel("Password").fill("secretPass123");
  await page.getByRole("button", { name: "Log in" }).click();

  await expect(page.getByText("Enter your authentication code")).toBeVisible();

  const code = generateTOTP(process.env.MFA_TOTP_SECRET!);
  await page.getByLabel("Authentication code").fill(code);
  await page.getByRole("button", { name: "Verify" }).click();

  await page.waitForURL("/home");
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
});
```

**Strategy 2**: Mock MFA at the backend level. Have your backend accept a known bypass code (e.g., `000000`) when `NODE_ENV=test`.

**Strategy 3**: Disable MFA for test accounts at the infrastructure level.

## Session Refresh

**Use when**: Your tokens expire during long test runs.

```typescript
// fixtures/auth-with-refresh.ts
import { test as base, type BrowserContext } from "@playwright/test";
import fs from "fs";

type AuthFixtures = {
  authenticatedPage: import("@playwright/test").Page;
};

export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ browser }, use) => {
    const statePath = ".auth/session.json";

    let context: BrowserContext;
    if (fs.existsSync(statePath)) {
      context = await browser.newContext({ storageState: statePath });
      const page = await context.newPage();

      const response = await page.request.get("/api/auth/me");
      if (response.ok()) {
        await use(page);
        await context.close();
        return;
      }
      await context.close();
    }

    context = await browser.newContext();
    const page = await context.newPage();
    await page.goto("/login");
    await page.getByLabel("Username").fill(process.env.TEST_USER_EMAIL!);
    await page.getByLabel("Password").fill(process.env.TEST_USER_PASSWORD!);
    await page.getByRole("button", { name: "Log in" }).click();
    await page.waitForURL("/home");

    await context.storageState({ path: statePath });

    await use(page);
    await context.close();
  },
});

export { expect } from "@playwright/test";
```

## API-Based Login

**Use when**: You want the fastest possible authentication without any browser interaction. API login is typically 5-10x faster than UI login.
**Avoid when**: You are specifically testing the login UI.

```typescript
// global-setup.ts — API-based login (fastest)
import { request, type FullConfig } from "@playwright/test";

async function globalSetup(config: FullConfig) {
  const { baseURL } = config.projects[0].use;
  const requestContext = await request.newContext({ baseURL });

  const response = await requestContext.post("/api/auth/login", {
    data: {
      email: process.env.TEST_USER_EMAIL!,
      password: process.env.TEST_USER_PASSWORD!,
    },
  });

  if (!response.ok()) {
    throw new Error(`API login failed: ${response.status()} ${await response.text()}`);
  }

  await requestContext.storageState({ path: ".auth/session.json" });
  await requestContext.dispose();
}

export default globalSetup;
```

## Unauthenticated Tests

**Use when**: Testing the login page, signup flow, password reset, public pages, or redirect behavior for unauthenticated users.

When your config sets a default `storageState`, you must explicitly clear it for unauthenticated tests.

```typescript
// tests/public-pages.spec.ts
import { test, expect } from "@playwright/test";

test.use({ storageState: { cookies: [], origins: [] } });

test.describe("unauthenticated access", () => {
  test("homepage is accessible without login", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Welcome" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Log in" })).toBeVisible();
  });

  test("protected route redirects to login", async ({ page }) => {
    await page.goto("/home");
    await page.waitForURL("**/login**");
    expect(page.url()).toContain("redirect=%2Fhome");
  });

  test("expired session shows re-login prompt", async ({ page, context }) => {
    await page.goto("/home");
    await context.clearCookies();

    await page.goto("/settings");
    await page.waitForURL("**/login**");
    await expect(page.getByText("Your session has expired")).toBeVisible();
  });
});
```

## Decision Guide

| Scenario | Approach | Speed | When to Choose |
| -------------------------------- | ------------------------------ | -------- | -------------------------------------------------------------- |
| Most tests need auth | Global setup + `storageState` | Fastest | Default for nearly every project |
| Tests modify user state | Per-worker fixture | Fast | Tests update profile, change settings, or mutate data |
| Multiple user roles | Per-project `storageState` | Fastest | App has admin/member/guest roles |
| Testing the login page | No `storageState` | N/A | Use `test.use({ storageState: { cookies: [], origins: [] } })` |
| OAuth/SSO provider | Mock the callback | Fast | Never hit real OAuth providers in CI |
| MFA is required | TOTP generation or bypass | Moderate | Generate real TOTP codes or use a test-mode bypass |
| Token expires mid-suite | Session refresh fixture | Fast | Fixture validates the session before use |
| API-first app (no login UI) | API login via `request.post()` | Fastest | No browser needed for auth |

### UI Login vs API Login vs Storage State

```text
Need to test the login page itself?
├── Yes → UI login with LoginPage POM, no storageState
└── No → Do you have a login API endpoint?
    ├── Yes → API login in global setup, save storageState (fastest)
    └── No → UI login in global setup, save storageState
              └── Tokens expire quickly?
                  ├── Yes → Add session refresh fixture
                  └── No → Standard storageState reuse is fine
```

## Anti-Patterns

| Don't Do This | Problem | Do This Instead |
| ------------------------------------------------------------------------- | ------------------------------------------- | ------------------------------------------------------------------------- |
| Log in via UI before every test | Adds 2-5 seconds per test | Use `storageState` to skip login entirely |
| Share a single auth state file across parallel workers that mutate state | Race conditions | Use per-worker fixtures with `{ scope: 'worker' }` |
| Hardcode credentials in test files | Security risk | Use environment variables and `.env` files |
| Ignore token expiration | Tests fail intermittently with 401 errors | Add a session validity check in your auth fixture |
| Hit real OAuth providers in CI | Flaky: rate limits, CAPTCHA, network issues | Mock the OAuth callback or use API session injection |
| Use `page.waitForTimeout(2000)` after login | Arbitrary delay | `await page.waitForURL('/home')` or `await expect(heading).toBeVisible()` |
| Store `.auth/*.json` files in git | Tokens in version control | Add `.auth/` to `.gitignore` |
| Create one "god" test account with all permissions | Cannot test role-based access control | Create separate accounts per role |

## Troubleshooting

### Global setup fails with "Target page, context or browser has been closed"

**Cause**: The login page redirected unexpectedly, or the browser closed before `storageState()` was called.

**Fix**: Add `await page.waitForURL()` after the login action. Check that `baseURL` in your config matches the actual server URL and protocol.

```typescript
const response = await page.waitForResponse("**/api/auth/**");
if (!response.ok()) {
  throw new Error(`Login failed in global setup: ${response.status()} ${await response.text()}`);
}
```

### Tests fail with 401 Unauthorized after running for a while

**Cause**: The session token saved in `storageState` has expired.

**Fix**: Use the session refresh fixture pattern, increase token expiry in test environment configuration, or switch to API-based login in a worker-scoped fixture.

### `storageState` file is empty or contains no cookies

**Cause**: `storageState()` was called before the login response set cookies.

**Fix**: Wait for the post-login page to load: `await page.waitForURL('/home')`. Verify cookies exist before saving:

```typescript
const cookies = await context.cookies();
if (cookies.length === 0) {
  throw new Error("No cookies found after login");
}
await context.storageState({ path: ".auth/session.json" });
```

### Different browsers get different cookies

**Cause**: Some auth flows set cookies with `SameSite=Strict` or use browser-specific cookie behavior.

**Fix**: Generate separate auth state files per browser project.

```typescript
projects: [
  {
    name: 'chromium',
    use: { ...devices['Desktop Chrome'], storageState: '.auth/chromium-session.json' },
  },
  {
    name: 'firefox',
    use: { ...devices['Desktop Firefox'], storageState: '.auth/firefox-session.json' },
  },
],
```

### OAuth mock does not work — still redirects to real provider

**Cause**: `page.route()` was registered after the navigation that triggers the OAuth redirect.

**Fix**: Register route handlers before any navigation — call `page.route()` before `page.goto()`.

```typescript
page.on("request", (req) => {
  if (req.url().includes("oauth") || req.url().includes("accounts.provider")) {
    console.log("OAuth request:", req.url());
  }
});
```

## Complex Authentication Flows

### Email Verification

Intercept API responses to capture verification tokens for testing:

```typescript
test('completes registration with email verification', async ({ page }) => {
  let capturedToken = '';

  await page.route('**/api/auth/register', async (route) => {
    const response = await route.fetch();
    const body = await response.json();
    capturedToken = body.verificationToken;
    await route.fulfill({ response });
  });

  await page.goto('/register');
  await page.getByLabel('Name').fill('New User');
  await page.getByLabel('Email').fill('newuser@test.com');
  await page.getByLabel('Password', { exact: true }).fill('SecurePass!');
  await page.getByLabel('Confirm password').fill('SecurePass!');
  await page.getByRole('button', { name: 'Create account' }).click();

  await expect(page.getByText('Check your inbox')).toBeVisible();

  expect(capturedToken).toBeTruthy();
  await page.goto(`/verify?token=${capturedToken}`);
  await expect(page.getByText('Email confirmed')).toBeVisible();
});
```

### Password Reset

```typescript
test('resets password through email link', async ({ page }) => {
  let resetToken = '';

  await page.route('**/api/auth/forgot-password', async (route) => {
    const response = await route.fetch();
    const body = await response.json();
    resetToken = body.resetToken;
    await route.fulfill({ response });
  });

  await page.goto('/forgot-password');
  await page.getByLabel('Email').fill('user@test.com');
  await page.getByRole('button', { name: 'Send link' }).click();

  await expect(page.getByText('Reset email sent')).toBeVisible();

  expect(resetToken).toBeTruthy();
  await page.goto(`/reset-password?token=${resetToken}`);

  await page.getByLabel('New password', { exact: true }).fill('NewPassword456!');
  await page.getByLabel('Confirm password').fill('NewPassword456!');
  await page.getByRole('button', { name: 'Update password' }).click();

  await expect(page.getByText('Password updated')).toBeVisible();
});
```

```typescript
test('shows error for expired reset token', async ({ page }) => {
  await page.goto('/reset-password?token=expired-token');

  await page.getByLabel('New password', { exact: true }).fill('NewPass!');
  await page.getByLabel('Confirm password').fill('NewPass!');
  await page.getByRole('button', { name: 'Update password' }).click();

  await expect(page.getByRole('alert')).toContainText(/expired|invalid/i);
});
```

### Session Timeout Testing

```typescript
test('redirects to signin after session expires', async ({ page, context }) => {
  await page.goto('/signin');
  await page.getByLabel('Email').fill('user@test.com');
  await page.getByLabel('Password').fill('Password!');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL('/home');

  const cookies = await context.cookies();
  const sessionCookie = cookies.find((c) => c.name.includes('session'));

  if (sessionCookie) {
    await context.clearCookies({ name: sessionCookie.name });
  }

  await page.goto('/profile');
  await expect(page).toHaveURL(/\/signin/);
  await expect(page.getByText(/session.*expired|sign in again/i)).toBeVisible();
});
```

Mock a near-expiry session to test the warning UI:

```typescript
test('shows warning before session expires', async ({ page }) => {
  await page.route('**/api/auth/session', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ valid: true, expiresIn: 60 }),
    });
  });

  await page.goto('/home');
  await expect(page.getByText(/session.*expir/i)).toBeVisible({ timeout: 10000 });
  await expect(page.getByRole('button', { name: /extend|stay signed in/i })).toBeVisible();
});
```

### Remember Me Persistence

```typescript
test('persists session with remember me enabled', async ({ browser }) => {
  const ctx1 = await browser.newContext();
  const page1 = await ctx1.newPage();

  await page1.goto('/signin');
  await page1.getByLabel('Email').fill('user@test.com');
  await page1.getByLabel('Password').fill('Password!');
  await page1.getByLabel('Keep me signed in').check();
  await page1.getByRole('button', { name: 'Sign in' }).click();
  await expect(page1).toHaveURL('/home');

  const state = await ctx1.storageState();
  await ctx1.close();

  const ctx2 = await browser.newContext({ storageState: state });
  const page2 = await ctx2.newPage();

  await page2.goto('/home');
  await expect(page2).toHaveURL('/home');
  await expect(page2.getByText('Welcome')).toBeVisible();

  await ctx2.close();
});
```

### Logout with Session Cleanup

```typescript
test.use({ storageState: '.auth/user.json' });

test('logs out and clears session', async ({ page, context }) => {
  await page.goto('/home');

  await page.getByRole('button', { name: /account|menu/i }).click();
  await page.getByRole('menuitem', { name: 'Sign out' }).click();

  await expect(page).toHaveURL('/signin');

  const cookies = await context.cookies();
  const sessionCookies = cookies.filter((c) => c.name.includes('session') || c.name.includes('token'));
  expect(sessionCookies).toHaveLength(0);

  await page.goto('/home');
  await expect(page).toHaveURL(/\/signin/);
});
```
