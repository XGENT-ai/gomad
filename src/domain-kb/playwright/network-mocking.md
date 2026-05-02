---
name: network-mocking
description: Intercept and mock network requests in Playwright using page.route(), HAR playback, and CDP.
license: MIT
last_reviewed: 2026-05-02
---

# Network Mocking and Request Interception

## Request Modification

### Modify Request Headers

```typescript
test("add auth header to requests", async ({ page }) => {
  await page.route("**/api/**", (route) => {
    const headers = {
      ...route.request().headers(),
      Authorization: "Bearer test-token",
      "X-Test-Header": "test-value",
    };
    route.continue({ headers });
  });

  await page.goto("/dashboard");
});
```

### Modify Request Body

```typescript
test("modify POST body", async ({ page }) => {
  await page.route("**/api/orders", async (route) => {
    if (route.request().method() === "POST") {
      const postData = route.request().postDataJSON();

      const modifiedData = {
        ...postData,
        testMode: true,
        testTimestamp: Date.now(),
      };

      await route.continue({
        postData: JSON.stringify(modifiedData),
      });
    } else {
      await route.continue();
    }
  });

  await page.goto("/checkout");
  await page.getByRole("button", { name: "Place Order" }).click();
});
```

### Transform Response

Fetch the real response and modify it before the browser sees it:

```typescript
test("modify API response", async ({ page }) => {
  await page.route("**/api/products", async (route) => {
    const response = await route.fetch();
    const json = await response.json();

    const modified = json.map((product: any) => ({
      ...product,
      price: product.price * 0.9, // 10% discount
      testMode: true,
    }));

    await route.fulfill({
      response,
      json: modified,
    });
  });

  await page.goto("/products");
});
```

## GraphQL Mocking

### Mock by Operation Name

All GraphQL requests hit a single endpoint. Discriminate by `operationName` to mock selectively:

```typescript
test("mock GraphQL query", async ({ page }) => {
  await page.route("**/graphql", async (route) => {
    const postData = route.request().postDataJSON();

    if (postData.operationName === "GetUser") {
      return route.fulfill({
        json: {
          data: {
            user: { id: "1", name: "Test User", email: "test@example.com" },
          },
        },
      });
    }

    if (postData.operationName === "GetProducts") {
      return route.fulfill({
        json: {
          data: {
            products: [
              { id: "1", name: "Product A", price: 29.99 },
              { id: "2", name: "Product B", price: 49.99 },
            ],
          },
        },
      });
    }

    // Pass through unmocked operations
    return route.continue();
  });

  await page.goto("/dashboard");
});
```

### GraphQL Mock Fixture

```typescript
// fixtures/graphql.fixture.ts
import { test as base } from "@playwright/test";

type GraphQLMock = {
  operation: string;
  variables?: Record<string, any>;
  response: { data?: any; errors?: any[] };
};

type GraphQLFixtures = {
  mockGraphQL: (mocks: GraphQLMock[]) => Promise<void>;
};

export const test = base.extend<GraphQLFixtures>({
  mockGraphQL: async ({ page }, use) => {
    await use(async (mocks) => {
      await page.route("**/graphql", async (route) => {
        const postData = route.request().postDataJSON();

        const mock = mocks.find((m) => {
          if (m.operation !== postData.operationName) return false;

          if (m.variables) {
            return (
              JSON.stringify(m.variables) === JSON.stringify(postData.variables)
            );
          }
          return true;
        });

        if (mock) {
          return route.fulfill({ json: mock.response });
        }

        return route.continue();
      });
    });
  },
});

// Usage
test("dashboard with mocked GraphQL", async ({ page, mockGraphQL }) => {
  await mockGraphQL([
    {
      operation: "GetDashboardStats",
      response: {
        data: { stats: { users: 100, revenue: 50000 } },
      },
    },
    {
      operation: "GetUser",
      variables: { id: "1" },
      response: {
        data: { user: { id: "1", name: "John" } },
      },
    },
  ]);

  await page.goto("/dashboard");
  await expect(page.getByText("100 users")).toBeVisible();
});
```

### Mock GraphQL Mutations

```typescript
test("mock GraphQL mutation", async ({ page }) => {
  await page.route("**/graphql", async (route) => {
    const postData = route.request().postDataJSON();

    if (postData.operationName === "CreateOrder") {
      const { input } = postData.variables;

      return route.fulfill({
        json: {
          data: {
            createOrder: {
              id: "order-123",
              status: "PENDING",
              items: input.items,
              total: input.items.reduce(
                (sum: number, item: any) => sum + item.price * item.quantity,
                0,
              ),
            },
          },
        },
      });
    }

    return route.continue();
  });

  await page.goto("/checkout");
  await page.getByRole("button", { name: "Place Order" }).click();

  await expect(page.getByText("Order #order-123")).toBeVisible();
});
```

## HAR Recording and Playback

HAR files capture real network traffic so tests can replay it offline or deterministically.

### Record HAR File

```typescript
test("record HAR", async ({ page, context }) => {
  await context.routeFromHAR("./recordings/checkout.har", {
    update: true, // Create/update HAR file
    url: "**/api/**",
  });

  await page.goto("/checkout");
  await page.getByRole("button", { name: "Place Order" }).click();

  // HAR file is saved automatically
});
```

### Playback HAR File

```typescript
test("playback HAR", async ({ page, context }) => {
  await context.routeFromHAR("./recordings/checkout.har", {
    url: "**/api/**",
    update: false, // Don't update, just playback
  });

  await page.goto("/checkout");

  // All API calls served from HAR file
  await expect(page.getByText("Order confirmed")).toBeVisible();
});
```

### HAR with Live Fallback

```typescript
test("HAR with live fallback", async ({ page, context }) => {
  await context.routeFromHAR("./recordings/api.har", {
    url: "**/api/**",
    update: false,
    notFound: "fallback", // Use real network if not in HAR
  });

  await page.goto("/dashboard");
});
```

**HAR maintenance**:
- Record against a known-good staging environment
- Commit `.har` files to version control
- Re-record when APIs change
- Scope HAR to specific URL patterns

## Conditional Mocking

### Mock Based on Request Body

```typescript
test("conditional mock by body", async ({ page }) => {
  await page.route("**/api/search", async (route) => {
    const body = route.request().postDataJSON();

    if (body.query === "error") {
      return route.fulfill({
        status: 500,
        json: { error: "Search failed" },
      });
    }

    if (body.query === "empty") {
      return route.fulfill({
        json: { results: [] },
      });
    }

    // Default response
    return route.fulfill({
      json: {
        results: [{ id: 1, title: `Result for: ${body.query}` }],
      },
    });
  });

  await page.goto("/search");

  await page.getByLabel("Search").fill("error");
  await page.getByLabel("Search").press("Enter");
  await expect(page.getByText("Search failed")).toBeVisible();
});
```

### Mock Nth Request (Retry Testing)

```typescript
test("different response on retry", async ({ page }) => {
  let callCount = 0;

  await page.route("**/api/status", (route) => {
    callCount++;

    if (callCount < 3) {
      return route.fulfill({
        status: 503,
        json: { error: "Service unavailable" },
      });
    }

    // Succeed on 3rd attempt
    return route.fulfill({
      json: { status: "ok" },
    });
  });

  await page.goto("/dashboard");

  // App should retry and eventually succeed
  await expect(page.getByText("Connected")).toBeVisible();
});
```

### Mock with Delay (Loading State Testing)

```typescript
test("slow network simulation", async ({ page }) => {
  await page.route("**/api/data", async (route) => {
    // Simulate 2 second delay
    await new Promise((resolve) => setTimeout(resolve, 2000));

    return route.fulfill({
      json: { data: "loaded" },
    });
  });

  await page.goto("/dashboard");

  // Loading state should appear
  await expect(page.getByText("Loading...")).toBeVisible();

  // Then data appears
  await expect(page.getByText("loaded")).toBeVisible();
});
```

## Network Throttling

### Slow 3G Simulation

Requires a CDP session — only works with Chromium:

```typescript
test("slow network experience", async ({ page, context }) => {
  const client = await context.newCDPSession(page);

  await client.send("Network.emulateNetworkConditions", {
    offline: false,
    downloadThroughput: (500 * 1024) / 8, // 500 Kbps
    uploadThroughput: (500 * 1024) / 8,
    latency: 400, // 400ms
  });

  await page.goto("/");

  // Test loading states appear
  await expect(page.getByTestId("skeleton-loader")).toBeVisible();
});
```

### Network Throttling Fixture

```typescript
// fixtures/network.fixture.ts
import { test as base } from "@playwright/test";

type NetworkCondition = "slow3g" | "fast3g" | "offline";

const conditions = {
  slow3g: { downloadThroughput: 50000, uploadThroughput: 50000, latency: 2000 },
  fast3g: { downloadThroughput: 180000, uploadThroughput: 75000, latency: 150 },
};

type NetworkFixtures = {
  setNetworkCondition: (condition: NetworkCondition) => Promise<void>;
};

export const test = base.extend<NetworkFixtures>({
  setNetworkCondition: async ({ page, context }, use) => {
    const client = await context.newCDPSession(page);

    await use(async (condition) => {
      if (condition === "offline") {
        await context.setOffline(true);
      } else {
        await client.send("Network.emulateNetworkConditions", {
          offline: false,
          ...conditions[condition],
        });
      }
    });

    // Reset
    await context.setOffline(false);
  },
});
```

## Anti-Patterns

| Anti-Pattern | Problem | Solution |
| ------------------------ | ------------------------------ | -------------------------------- |
| Mocking all requests | Tests don't reflect reality | Mock only what's necessary |
| No cleanup of routes | Routes persist across tests | Use fixtures with cleanup |
| Ignoring request method | Mock applies to wrong requests | Check `route.request().method()` |
| Hardcoded mock responses | Brittle, hard to maintain | Use factories for mock data |
