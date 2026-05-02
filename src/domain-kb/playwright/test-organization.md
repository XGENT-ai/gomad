---
name: test-organization
description: Organize Playwright tests with annotations, tags, steps, and grep-based selective execution in CI.
license: MIT
last_reviewed: 2026-05-02
---

# Test Annotations and Tags

## Skip Annotations

### Basic Skip

```typescript
// Skip unconditionally
test.skip("feature not implemented", async ({ page }) => {
  // This test won't run
});

// Skip with reason
test("payment flow", async ({ page }) => {
  test.skip(true, "Payment gateway in maintenance");
  // Test body won't execute
});
```

### Conditional Skip

```typescript
test("webkit-specific feature", async ({ page, browserName }) => {
  test.skip(browserName !== "webkit", "This feature only works in WebKit");

  await page.goto("/webkit-feature");
});

test("production only", async ({ page }) => {
  test.skip(process.env.ENV !== "production", "Only runs against production");

  await page.goto("/prod-feature");
});
```

### Skip by Platform

```typescript
test("windows-specific", async ({ page }) => {
  test.skip(process.platform !== "win32", "Windows only");
});

test("not on CI", async ({ page }) => {
  test.skip(!!process.env.CI, "Skipped in CI environment");
});
```

### Skip Describe Block

```typescript
test.describe("Admin features", () => {
  test.skip(
    ({ browserName }) => browserName === "firefox",
    "Firefox admin bug",
  );

  test("admin dashboard", async ({ page }) => {
    // Skipped in Firefox
  });

  test("admin settings", async ({ page }) => {
    // Skipped in Firefox
  });
});
```

## Fixme and Fail Annotations

### Fixme — Known Issues

`test.fixme()` skips the test and signals it needs fixing. Use it for known bugs, not for tests that are simply inapplicable.

```typescript
// Mark test as needing fix (skips the test)
test.fixme("broken after refactor", async ({ page }) => {
  // Test won't run but is tracked
});

// Conditional fixme
test("flaky on CI", async ({ page }) => {
  test.fixme(!!process.env.CI, "Investigate CI flakiness - ticket #123");

  await page.goto("/flaky-feature");
});
```

### Fail — Expected Failures

`test.fail()` runs the test and expects it to fail. If it passes, the overall result is failure (bug was fixed, update the test).

```typescript
// Test is expected to fail
test("known bug", async ({ page }) => {
  test.fail();

  await page.goto("/buggy-page");
  await expect(page.getByText("Working")).toBeVisible();
});

// Conditional fail
test("fails on webkit", async ({ page, browserName }) => {
  test.fail(browserName === "webkit", "WebKit rendering bug #456");

  await page.goto("/render-test");
  await expect(page.getByTestId("element")).toHaveCSS("width", "100px");
});
```

### Annotation Comparison

| Annotation | Runs? | Use Case |
| -------------- | ----- | -------------------------------- |
| `test.skip()` | No | Feature not applicable |
| `test.fixme()` | No | Known bug, needs investigation |
| `test.fail()` | Yes | Expected to fail, tracking a bug |

## Slow Tests

### Mark Slow Tests

`test.slow()` triples the default timeout:

```typescript
test("large data import", async ({ page }) => {
  test.slow();

  await page.goto("/import");
  await page.setInputFiles("#file", "large-file.csv");
  await page.getByRole("button", { name: "Import" }).click();

  await expect(page.getByText("Import complete")).toBeVisible();
});

// Conditional slow
test("video processing", async ({ page, browserName }) => {
  test.slow(browserName === "webkit", "WebKit video processing is slow");

  await page.goto("/video-editor");
});
```

### Custom Timeout

```typescript
test("very long operation", async ({ page }) => {
  test.setTimeout(120000); // 2 minutes

  await page.goto("/long-operation");
});

// Timeout for describe block
test.describe("Integration tests", () => {
  test.describe.configure({ timeout: 60000 });

  test("test 1", async ({ page }) => {
    // Has 60 second timeout
  });
});
```

## Test Steps

`test.step()` groups logical actions in the reporter, making failures easier to locate.

### Basic Steps

```typescript
test("checkout flow", async ({ page }) => {
  await test.step("Add item to cart", async () => {
    await page.goto("/products");
    await page.getByRole("button", { name: "Add to Cart" }).click();
  });

  await test.step("Go to checkout", async () => {
    await page.getByRole("link", { name: "Cart" }).click();
    await page.getByRole("button", { name: "Checkout" }).click();
  });

  await test.step("Fill shipping info", async () => {
    await page.getByLabel("Address").fill("123 Test St");
    await page.getByLabel("City").fill("Test City");
  });

  await test.step("Complete payment", async () => {
    await page.getByLabel("Card").fill("4242424242424242");
    await page.getByRole("button", { name: "Pay" }).click();
  });

  await expect(page.getByText("Order confirmed")).toBeVisible();
});
```

### Nested Steps

```typescript
test("user registration", async ({ page }) => {
  await test.step("Fill registration form", async () => {
    await page.goto("/register");

    await test.step("Personal info", async () => {
      await page.getByLabel("Name").fill("John Doe");
      await page.getByLabel("Email").fill("john@example.com");
    });

    await test.step("Security", async () => {
      await page.getByLabel("Password").fill("SecurePass123");
      await page.getByLabel("Confirm Password").fill("SecurePass123");
    });
  });

  await test.step("Submit and verify", async () => {
    await page.getByRole("button", { name: "Register" }).click();
    await expect(page.getByText("Welcome")).toBeVisible();
  });
});
```

### Steps with Return Values

```typescript
test("verify order", async ({ page }) => {
  const orderId = await test.step("Create order", async () => {
    await page.goto("/checkout");
    await page.getByRole("button", { name: "Place Order" }).click();

    return await page.getByTestId("order-id").textContent();
  });

  await test.step("Verify order details", async () => {
    await page.goto(`/orders/${orderId}`);
    await expect(page.getByText(`Order #${orderId}`)).toBeVisible();
  });
});
```

### Steps in Page Objects

```typescript
// pages/checkout.page.ts
export class CheckoutPage {
  async fillShippingInfo(address: string, city: string) {
    await test.step("Fill shipping information", async () => {
      await this.page.getByLabel("Address").fill(address);
      await this.page.getByLabel("City").fill(city);
    });
  }

  async completePayment(cardNumber: string) {
    await test.step("Complete payment", async () => {
      await this.page.getByLabel("Card").fill(cardNumber);
      await this.page.getByRole("button", { name: "Pay" }).click();
    });
  }
}
```

## Custom Annotations

```typescript
test("important feature", async ({ page }, testInfo) => {
  testInfo.annotations.push({
    type: "priority",
    description: "high",
  });

  testInfo.annotations.push({
    type: "ticket",
    description: "JIRA-123",
  });

  await page.goto("/feature");
});
```

### Annotation Fixture

```typescript
// fixtures/annotations.fixture.ts
import { test as base } from "@playwright/test";

type AnnotationFixtures = {
  annotate: {
    ticket: (id: string) => void;
    priority: (level: "low" | "medium" | "high") => void;
    owner: (name: string) => void;
  };
};

export const test = base.extend<AnnotationFixtures>({
  annotate: async ({}, use, testInfo) => {
    await use({
      ticket: (id) => {
        testInfo.annotations.push({ type: "ticket", description: id });
      },
      priority: (level) => {
        testInfo.annotations.push({ type: "priority", description: level });
      },
      owner: (name) => {
        testInfo.annotations.push({ type: "owner", description: name });
      },
    });
  },
});

// Usage
test("critical feature", async ({ page, annotate }) => {
  annotate.ticket("JIRA-456");
  annotate.priority("high");
  annotate.owner("Alice");

  await page.goto("/critical");
});
```

### Conditional Annotation Helpers

```typescript
// helpers/test-annotations.ts
import { test } from "@playwright/test";

export function skipInCI(reason = "Skipped in CI") {
  test.skip(!!process.env.CI, reason);
}

export function skipInBrowser(browser: string, reason: string) {
  test.beforeEach(({ browserName }) => {
    test.skip(browserName === browser, reason);
  });
}

export function onlyInEnv(env: string) {
  test.skip(process.env.ENV !== env, `Only runs in ${env}`);
}
```

```typescript
test("local only feature", async ({ page }) => {
  skipInCI("Uses local resources");
  await page.goto("/local-feature");
});
```

### Describe-Level Conditions

```typescript
test.describe("Mobile features", () => {
  test.beforeEach(({ isMobile }) => {
    test.skip(!isMobile, "Mobile only tests");
  });

  test("touch gestures", async ({ page }) => {
    // Only runs on mobile
  });
});
```

## Annotation Anti-Patterns

| Anti-Pattern | Problem | Solution |
| --------------------------- | ---------------------- | -------------------------------- |
| Skipping without reason | Hard to track why | Always provide description |
| Too many skipped tests | Test debt accumulates | Review and clean up regularly |
| Using skip instead of fixme | Loses intent | Use fixme for bugs, skip for N/A |
| Not using steps | Hard to debug failures | Group logical actions in steps |

---

## Test Tags

Tags enable selective test execution — run only smoke tests on PRs, all tests nightly, or exclude flaky tests in CI.

### Basic Tagging

Prefer the details object over embedding tags in titles:

```typescript
import { test, expect } from "@playwright/test";

// Preferred: tag via details object
test(
  "test login page",
  { tag: "@fast" },
  async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading")).toBeVisible();
  }
);

test(
  "test dashboard",
  { tag: ["@slow", "@critical"] },
  async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByTestId("charts")).toBeVisible();
  }
);

// Avoid: tags in title (hard to parse/filter)
test("test full report @slow", async ({ page }) => { /* ... */ });
```

### Tagging Describe Blocks

```typescript
test.describe(
  "admin features",
  { tag: "@admin" },
  () => {
    test("admin dashboard", async ({ page }) => {
      // Inherits @admin tag
    });

    test(
      "admin settings",
      { tag: ["@slow", "@critical"] },
      async ({ page }) => {
        // Has @admin, @slow, @critical tags
      }
    );
  }
);
```

### Running Tagged Tests

```bash
# Run all @fast tests
npx playwright test --grep @fast

# Exclude @slow tests
npx playwright test --grep-invert @slow

# OR: run @fast OR @smoke
npx playwright test --grep "@fast|@smoke"

# AND: run tests with both @fast AND @critical
npx playwright test --grep "(?=.*@fast)(?=.*@critical)"

# Combined: @api tests excluding @slow
npx playwright test --grep "@api" --grep-invert "@slow"
```

### Configuration-Based Filtering

```typescript
import { defineConfig } from "@playwright/test";

// Global filter
export default defineConfig({
  grep: /@smoke/,
  grepInvert: /@flaky/,
});
```

### Project-Specific Tags

```typescript
import { defineConfig } from "@playwright/test";

export default defineConfig({
  projects: [
    {
      name: "smoke",
      grep: /@smoke/,
    },
    {
      name: "regression",
      grepInvert: /@smoke/,
    },
    {
      name: "critical-only",
      grep: /@critical/,
    },
  ],
});
```

### Environment-Based Filtering

```typescript
import { defineConfig } from "@playwright/test";

const isCI = !!process.env.CI;

export default defineConfig({
  grep: isCI ? /@smoke|@critical/ : undefined,
  grepInvert: isCI ? /@flaky/ : undefined,
});
```

### Tag Organization Patterns

**By test type**:

```typescript
test("homepage loads", { tag: "@smoke" }, async ({ page }) => {});
test("full checkout flow", { tag: "@regression" }, async ({ page }) => {});
test("complete user journey", { tag: "@e2e" }, async ({ page }) => {});
```

**By priority**:

```typescript
test("payment processing", { tag: ["@critical", "@p0"] }, async ({ page }) => {});
test("user preferences", { tag: ["@p1"] }, async ({ page }) => {});
```

**By feature area**:

```typescript
test.describe(
  "authentication",
  { tag: "@auth" },
  () => {
    test("login @smoke", async ({ page }) => {});
    test("logout", async ({ page }) => {});
    test("password reset @slow", async ({ page }) => {});
  }
);
```

### Common Tag Categories

| Category | Tags | Purpose |
| --------------- | --------------------------------------------- | ----------------------------- |
| **Speed** | `@fast`, `@slow` | Execution time classification |
| **Priority** | `@critical`, `@p0`, `@p1`, `@p2` | Business importance |
| **Type** | `@smoke`, `@regression`, `@e2e` | Test suite categorization |
| **Feature** | `@auth`, `@payments`, `@settings` | Feature area grouping |
| **Pipeline** | `@pr`, `@nightly`, `@release` | CI/CD execution timing |
| **Status** | `@flaky`, `@wip`, `@quarantine` | Test health tracking |
| **Environment** | `@local`, `@staging`, `@prod` | Target environment |
| **Team** | `@team-frontend`, `@team-backend`, `@team-qa` | Team assignment |

### Tag Anti-Patterns

| Anti-Pattern | Problem | Solution |
| ------------------------ | ------------------------ | ---------------------------------------------- |
| Too many tags per test | Hard to maintain | Limit to 2-3 relevant tags |
| Inconsistent naming | Confusing filtering | Establish naming conventions |
| Missing `@` prefix | Tags won't match filters | Always prefix with `@` |
| Tags in test title | Hard to parse/filter | Use the details object for tags, not the title |
| Not using tags | Can't selectively run | Tag by type, priority, or feature |
