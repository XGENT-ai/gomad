---
name: test-architecture
description: Choose between E2E, component, and API tests in Playwright and set a third-party mocking strategy.
license: MIT
last_reviewed: 2026-05-02
---

# Test Architecture

## Choosing the Right Test Type

Ask: "What's the cheapest test that gives confidence this works?"

## Decision Matrix

| Scenario | Recommended Type | Rationale |
| --------------------------- | ---------------- | --------------------------------------------- |
| Login / auth flow | E2E | Cross-page, cookies, redirects, session state |
| Form submission | Component | Isolated validation logic, error states |
| CRUD operations | API | Data integrity matters more than UI |
| Search with results UI | Component + API | API for query logic; component for rendering |
| Cross-page navigation | E2E | Routing, history, deep linking |
| API error handling | API | Status codes, error shapes, edge cases |
| UI error feedback | Component | Toast, banner, inline error rendering |
| Accessibility | Component | ARIA roles, keyboard nav per-component |
| Responsive layout | Component | Viewport-specific rendering without full app |
| API contract validation | API | Response shapes, headers, auth |
| WebSocket/real-time | E2E | Requires full browser environment |
| Payment / checkout | E2E | Multi-step, third-party iframes |
| Onboarding wizard | E2E | Multi-step, state persists across pages |
| Widget behavior | Component | Toggle, accordion, date picker, modal |
| Permissions / authorization | API | Role-based access is backend logic |

## API Tests

**Ideal for**: CRUD operations, input validation and error responses (400, 422), permission and authorization checks, data integrity and business rules, API contract verification, edge cases expensive to reproduce through UI, test data setup/teardown for E2E tests.

**Avoid for**: Testing how errors display to users, browser-specific behavior, visual layout, flows requiring JavaScript execution or DOM interaction, third-party iframe interactions.

```typescript
import { test, expect } from "@playwright/test";

test.describe("Products API", () => {
  let token: string;

  test.beforeAll(async ({ request }) => {
    const res = await request.post("/api/auth/token", {
      data: { email: "manager@shop.io", password: "mgr-secret" },
    });
    token = (await res.json()).accessToken;
  });

  test("creates product with valid payload", async ({ request }) => {
    const res = await request.post("/api/products", {
      headers: { Authorization: `Bearer ${token}` },
      data: { name: "Widget Pro", sku: "WGT-100", price: 29.99 },
    });

    expect(res.status()).toBe(201);
    const product = await res.json();
    expect(product).toMatchObject({ name: "Widget Pro", sku: "WGT-100" });
    expect(product).toHaveProperty("id");
  });

  test("rejects duplicate SKU with 409", async ({ request }) => {
    const res = await request.post("/api/products", {
      headers: { Authorization: `Bearer ${token}` },
      data: { name: "Duplicate", sku: "WGT-100", price: 19.99 },
    });

    expect(res.status()).toBe(409);
    expect((await res.json()).message).toContain("already exists");
  });

  test("staff role cannot delete products", async ({ request }) => {
    const staffLogin = await request.post("/api/auth/token", {
      data: { email: "staff@shop.io", password: "staff-pass" },
    });
    const staffToken = (await staffLogin.json()).accessToken;

    const res = await request.delete("/api/products/123", {
      headers: { Authorization: `Bearer ${staffToken}` },
    });

    expect(res.status()).toBe(403);
  });
});
```

## Component Tests

**Ideal for**: Form validation (required fields, format rules, error messages), interactive widgets (modals, dropdowns, accordions, date pickers), conditional rendering (show/hide, loading states, empty states), accessibility per-component (ARIA attributes, keyboard navigation), responsive layout at different viewports.

**Avoid for**: Testing routing or navigation between pages, flows requiring real cookies/sessions/server-side state, API contract validation, third-party iframe interactions.

```typescript
import { test, expect } from "@playwright/experimental-ct-react";
import { ContactForm } from "../src/components/ContactForm";

test.describe("ContactForm component", () => {
  test("displays validation errors on empty submit", async ({ mount }) => {
    const component = await mount(<ContactForm onSubmit={() => {}} />);

    await component.getByRole("button", { name: "Send message" }).click();

    await expect(component.getByText("Name is required")).toBeVisible();
    await expect(component.getByText("Email is required")).toBeVisible();
  });

  test("invokes onSubmit with form data", async ({ mount }) => {
    const submissions: Array<{ name: string; email: string; message: string }> = [];
    const component = await mount(
      <ContactForm onSubmit={(data) => submissions.push(data)} />
    );

    await component.getByLabel("Name").fill("Alex");
    await component.getByLabel("Email").fill("alex@company.org");
    await component.getByLabel("Message").fill("Inquiry about pricing");
    await component.getByRole("button", { name: "Send message" }).click();

    expect(submissions).toHaveLength(1);
    expect(submissions[0]).toEqual({
      name: "Alex",
      email: "alex@company.org",
      message: "Inquiry about pricing",
    });
  });

  test("disables button during submission", async ({ mount }) => {
    const component = await mount(
      <ContactForm onSubmit={() => {}} submitting={true} />
    );

    await expect(
      component.getByRole("button", { name: "Sending..." })
    ).toBeDisabled();
  });
});
```

## E2E Tests

**Ideal for**: Critical user flows that generate revenue (checkout, signup), authentication flows (login, SSO, MFA, password reset), multi-page workflows where state carries across navigation, flows involving third-party iframes (payment widgets), smoke tests validating the entire stack.

**Avoid for**: Testing every form validation permutation, CRUD operations where UI is a thin wrapper, verifying individual component states, testing API response shapes or error codes, responsive layout at every breakpoint.

```typescript
import { test, expect } from "@playwright/test";

test.describe("subscription flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.request.post("/api/test/seed-account", {
      data: { plan: "free", email: "subscriber@demo.io" },
    });
    await page.goto("/account/upgrade");
  });

  test("upgrades to premium plan", async ({ page }) => {
    await test.step("select plan", async () => {
      await expect(page.getByRole("heading", { name: "Choose Your Plan" })).toBeVisible();
      await page.getByRole("button", { name: "Select Premium" }).click();
    });

    await test.step("enter billing details", async () => {
      await page.getByLabel("Cardholder name").fill("Sam Johnson");
      await page.getByLabel("Billing address").fill("456 Oak Ave");
      await page.getByRole("button", { name: "Continue" }).click();
    });

    await test.step("complete payment", async () => {
      const paymentFrame = page.frameLocator('iframe[title="Secure Payment"]');
      await paymentFrame.getByLabel("Card number").fill("5555555555554444");
      await paymentFrame.getByLabel("Expiry").fill("09/29");
      await paymentFrame.getByLabel("CVV").fill("456");
      await page.getByRole("button", { name: "Subscribe now" }).click();
    });

    await test.step("verify success", async () => {
      await page.waitForURL("**/account/subscription/success**");
      await expect(page.getByRole("heading", { name: "Welcome to Premium" })).toBeVisible();
    });
  });
});
```

## Layering Test Types

Effective test suites combine all three. Example for an "inventory management" feature:

### API Layer (60% of tests)

Cover every backend logic permutation — cheap to run and maintain.

```
tests/api/inventory.spec.ts
  - creates item with valid data (201)
  - rejects duplicate SKU (409)
  - rejects invalid quantity format (422)
  - warehouse-staff cannot delete items (403)
  - unauthenticated request returns 401
  - lists items with pagination
  - updates item stock level
  - prevents archiving items with pending orders
```

### Component Layer (30% of tests)

Cover every visual state and interaction.

```
tests/components/InventoryForm.spec.tsx
  - shows validation errors on empty submit
  - shows inline error for invalid SKU format
  - disables submit while saving
  - calls onSubmit with form data

tests/components/InventoryTable.spec.tsx
  - renders item rows from props
  - shows empty state when no items
  - handles archive confirmation modal
  - sorts by column header click
```

### E2E Layer (10% of tests)

Cover only critical paths proving the full stack works.

```
tests/e2e/inventory.spec.ts
  - manager creates item and sees it in list
  - manager updates item stock level
  - warehouse-staff cannot access admin settings
```

### Execution Profile

- **11 API tests** — ~2 seconds total, no browser
- **10 component tests** — ~5 seconds total, real browser but no server
- **3 E2E tests** — ~15 seconds total, full stack

If E2E fails but API and component pass, the problem is in integration (routing, state management, API client).

## Common Architecture Mistakes

| Anti-Pattern | Problem | Better Approach |
| ----------------------------------------- | -------------------------------------------------------- | -------------------------------------------------------------- |
| E2E for every validation rule | 30-second browser test for something API covers in 200ms | API test for validation, one component test for error display |
| No API tests, all E2E | Slow suite, flaky from UI timing, hard to diagnose | API tests for data/logic, E2E for critical paths only |
| Component tests mocking everything | Tests pass but app broken because mocks drift | Mock only external boundaries; API tests verify real contracts |
| E2E creating test data via UI | 2-minute test where 90 seconds is setup | Seed via API in `beforeEach`, test actual flow |
| Testing third-party behavior | Testing that Stripe validates cards (Stripe's job) | Mock Stripe; trust their contract |
| One giant E2E for entire feature | 5-minute test failing somewhere with no clear cause | Focused E2E per critical path; use `test.step()` |

---

## Mocking Strategy: Real vs Mock Services

## Core Principle

**Mock at the boundary, test your stack end-to-end.** Mock third-party services you don't own (payment gateways, email providers, OAuth). Never mock your own frontend-to-backend communication. Tests should prove YOUR code works, not that third-party APIs are available.

## Mock Decision Matrix

| Scenario | Mock? | Strategy |
| --- | --- | --- |
| Your own REST/GraphQL API | Never | Hit real API against staging or local dev |
| Your database (through your API) | Never | Seed via API or fixtures |
| Authentication (your auth system) | Mostly no | Use `storageState` to skip login in most tests |
| Stripe / payment gateway | Always | `route.fulfill()` with expected responses |
| SendGrid / email service | Always | Mock the API call, verify request payload |
| OAuth providers (Google, GitHub) | Always | Mock token exchange, test your callback handler |
| Analytics (Segment, Mixpanel) | Always | `route.abort()` or `route.fulfill()` |
| Maps / geocoding APIs | Always | Mock with static responses |
| Feature flags (LaunchDarkly) | Usually | Mock to force specific flag states |
| Flaky external dependency | CI: mock, local: real | Conditional mocking based on environment |
| Slow external dependency | Dev: mock, nightly: real | Separate test projects in config |

## Decision Flowchart

```text
Is this service part of YOUR codebase?
├── YES → Do NOT mock. Test the real integration.
│   ├── Is it slow? → Optimize the service, not the test.
│   └── Is it flaky? → Fix the service. Flaky infra is a bug.
└── NO → It's a third-party service.
    ├── Is it paid per call? → ALWAYS mock.
    ├── Is it rate-limited? → ALWAYS mock.
    ├── Is it slow or unreliable? → ALWAYS mock.
    └── Is it a complex multi-step flow? → Mock with HAR recording.
```

## Mocking Techniques

### Blocking Unwanted Requests

Block third-party scripts that slow tests and add no coverage:

```typescript
test.beforeEach(async ({ page }) => {
  await page.route('**/{analytics,tracking,segment,hotjar}.{com,io}/**', (route) => {
    route.abort();
  });
});
```

### Full Mock (route.fulfill)

```typescript
test('order flow with mocked payment service', async ({ page }) => {
  await page.route('**/api/charge', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        transactionId: 'txn_mock_abc',
        status: 'completed',
      }),
    });
  });

  await page.goto('/order/confirm');
  await page.getByRole('button', { name: 'Complete Purchase' }).click();
  await expect(page.getByText('Order confirmed')).toBeVisible();
});

test('display error on payment decline', async ({ page }) => {
  await page.route('**/api/charge', (route) => {
    route.fulfill({
      status: 402,
      contentType: 'application/json',
      body: JSON.stringify({
        error: { code: 'insufficient_funds', message: 'Card declined.' },
      }),
    });
  });

  await page.goto('/order/confirm');
  await page.getByRole('button', { name: 'Complete Purchase' }).click();
  await expect(page.getByRole('alert')).toContainText('Card declined');
});
```

### Partial Mock (Modify Responses)

Let the real API call happen but tweak the response:

```typescript
test('display low inventory warning', async ({ page }) => {
  await page.route('**/api/inventory/*', async (route) => {
    const response = await route.fetch();
    const data = await response.json();

    data.quantity = 1;
    data.lowStock = true;

    await route.fulfill({
      response,
      body: JSON.stringify(data),
    });
  });

  await page.goto('/products/widget-pro');
  await expect(page.getByText('Only 1 remaining')).toBeVisible();
});
```

### Record and Replay (HAR Files)

For complex API sequences (OAuth flows, multi-step wizards):

```typescript
// Recording
test('capture API traffic', async ({ page }) => {
  await page.routeFromHAR('tests/fixtures/admin-panel.har', {
    url: '**/api/**',
    update: true,
  });

  await page.goto('/admin');
  await page.getByRole('tab', { name: 'Reports' }).click();
});

// Replaying
test('admin panel loads with recorded data', async ({ page }) => {
  await page.routeFromHAR('tests/fixtures/admin-panel.har', {
    url: '**/api/**',
    update: false,
  });

  await page.goto('/admin');
  await expect(page.getByRole('heading', { name: 'Reports' })).toBeVisible();
});
```

## Hybrid Approach: Fixture-Based Mock Control

Create fixtures that let individual tests opt into mocking specific services:

```typescript
// tests/fixtures/service-mocks.ts
import { test as base } from '@playwright/test';

type MockConfig = {
  mockPayments: boolean;
  mockNotifications: boolean;
  mockAnalytics: boolean;
};

export const test = base.extend<MockConfig>({
  mockPayments: [true, { option: true }],
  mockNotifications: [true, { option: true }],
  mockAnalytics: [true, { option: true }],

  page: async ({ page, mockPayments, mockNotifications, mockAnalytics }, use) => {
    if (mockPayments) {
      await page.route('**/api/billing/**', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ status: 'paid', id: 'inv_mock_789' }),
        });
      });
    }

    if (mockNotifications) {
      await page.route('**/api/notify', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ delivered: true }),
        });
      });
    }

    if (mockAnalytics) {
      await page.route('**/{segment,mixpanel,amplitude}.**/**', (route) => {
        route.abort();
      });
    }

    await use(page);
  },
});

export { expect } from '@playwright/test';
```

```typescript
// tests/billing.spec.ts
import { test, expect } from './fixtures/service-mocks';

// Uses mocked payments by default
test('subscription renewal sends notification', async ({ page }) => {
  await page.goto('/account/billing');
  await page.getByRole('button', { name: 'Renew Now' }).click();
  await expect(page.getByText('Subscription renewed')).toBeVisible();
});

test.describe('integration suite', () => {
  // Opt out of payments mock for this test
  test.use({ mockPayments: false });

  test('real billing flow against test gateway', async ({ page }) => {
    await page.goto('/account/billing');
    await page.getByRole('button', { name: 'Renew Now' }).click();
    await expect(page.getByText('Subscription renewed')).toBeVisible();
  });
});
```

### Environment-Based Test Projects

```typescript
// playwright.config.ts
export default defineConfig({
  projects: [
    {
      name: 'ci-fast',
      testMatch: '**/*.spec.ts',
      use: { baseURL: 'http://localhost:3000' },
    },
    {
      name: 'nightly-full',
      testMatch: '**/*.integration.spec.ts',
      use: { baseURL: 'https://staging.example.com' },
      timeout: 120_000,
    },
  ],
});
```

## Validating Mock Accuracy

Guard against mock drift from real APIs:

```typescript
test.describe('contract validation', () => {
  test('billing mock matches real API shape', async ({ request }) => {
    const realResponse = await request.post('/api/billing/charge', {
      data: { amount: 5000, currency: 'usd' },
    });
    const realBody = await realResponse.json();

    const mockBody = {
      status: 'paid',
      id: 'inv_mock_789',
    };

    expect(Object.keys(mockBody).sort()).toEqual(Object.keys(realBody).sort());

    for (const key of Object.keys(mockBody)) {
      expect(typeof mockBody[key as keyof typeof mockBody]).toBe(typeof realBody[key]);
    }
  });
});
```

## Mocking Anti-Patterns

| Don't Do This | Problem | Do This Instead |
| --- | --- | --- |
| Mock your own API | Tests pass, app breaks. Zero integration coverage. | Hit your real API. Mock only third-party services. |
| Mock everything for speed | You test a fiction. Frontend and backend may be incompatible. | Mock only external boundaries. |
| Never mock anything | Tests are slow, flaky, fail when third parties have outages. | Mock third-party services. |
| Use outdated mocks | Mock returns different shape than real API. | Run contract validation tests. Re-record HAR files regularly. |
| Mock with `page.evaluate()` to stub fetch | Fragile, doesn't survive navigation. | Use `page.route()` which intercepts at network layer. |
| Copy-paste mocks across files | One API change requires updating many files. | Centralize mocks in fixtures. |
