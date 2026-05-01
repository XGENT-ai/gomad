---
name: page-object-model
description: Use this when deciding between Page Object Model (POM), custom fixtures (`test.extend()`), and helper functions in Playwright, or when implementing POM classes. Covers the pattern selection flowchart (5+ interactions → POM, resource lifecycle → fixture, stateless utility → helper), pattern comparison table, page class structure with `readonly` Locator properties, component objects using Locator-scoped selectors, composition patterns (pages composed of components, `BasePage` with abstract `goto()`), factory function alternative to classes, and fixture-wrapped page objects for lifecycle management. Anti-patterns include locator-only page objects (no methods), page objects managing API calls, monolithic fixtures, helpers with module-level state, and over-abstracting single-use code. Use this when structuring test helper code for apps with complex multi-step UI interactions in 3+ test files.
source: https://github.com/currents-dev/playwright-best-practices-skill
license: MIT
last_reviewed: 2026-05-02
---

# Page Object Model and Test Code Organization

## Choosing the Right Pattern

Use all three patterns together. Most projects benefit from a hybrid approach:

- **Page objects** for UI interaction (pages/components with 5+ interactions used in 3+ test files)
- **Custom fixtures** for test infrastructure (auth state, database, API clients, anything with lifecycle)
- **Helper functions** for stateless utilities (generate data, format values, simple waits)

If only using one pattern, choose **custom fixtures** — they handle setup/teardown, compose well, and Playwright is built around them.

## Pattern Comparison

| Aspect | Page Objects | Custom Fixtures | Helper Functions |
|---|---|---|---|
| **Purpose** | Encapsulate UI interactions | Provide resources with setup/teardown | Stateless utilities |
| **Lifecycle** | Manual (constructor/methods) | Built-in (`use()` with automatic teardown) | None |
| **Composability** | Constructor injection or fixture wiring | Depend on other fixtures | Call other functions |
| **Best for** | Pages with many reused interactions | Resources needing setup AND teardown | Simple logic with no side effects |

## Selection Flowchart

```text
What kind of reusable code?
|
+-- Interacts with browser page/component?
|   |
|   +-- Has 5+ interactions (fill, click, navigate, assert)?
|   |   +-- YES: Used in 3+ test files?
|   |   |   +-- YES --> PAGE OBJECT
|   |   |   +-- NO --> Inline or small helper
|   |   +-- NO --> HELPER FUNCTION
|   |
|   +-- Needs setup before AND cleanup after test?
|       +-- YES --> CUSTOM FIXTURE
|       +-- NO --> PAGE OBJECT method or HELPER
|
+-- Manages resource with lifecycle (create/destroy)?
|   +-- Examples: auth state, DB connection, API client, test user
|   +-- YES --> CUSTOM FIXTURE (always)
|
+-- Stateless utility? (no browser, no side effects)
|   +-- Examples: random email, format date, build URL, parse response
|   +-- YES --> HELPER FUNCTION
|
+-- Not sure?
    +-- Start with HELPER FUNCTION
    +-- Promote to PAGE OBJECT when interactions grow
    +-- Promote to FIXTURE when lifecycle needed
```

## Page Object Implementation

### Page Class

```typescript
// pages/login.page.ts
import { Page, Locator, expect } from "@playwright/test";

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByLabel("Email");
    this.passwordInput = page.getByLabel("Password");
    this.submitButton = page.getByRole("button", { name: "Sign in" });
    this.errorMessage = page.getByRole("alert");
  }

  async goto() {
    await this.page.goto("/login");
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  async expectError(message: string) {
    await expect(this.errorMessage).toContainText(message);
  }
}
```

```typescript
// tests/login.spec.ts
import { test, expect } from "@playwright/test";
import { LoginPage } from "../pages/login.page";

test.describe("Login", () => {
  test("successful login redirects to dashboard", async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login("user@example.com", "password123");
    await expect(page).toHaveURL("/dashboard");
  });

  test("shows error for invalid credentials", async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login("invalid@example.com", "wrong");
    await loginPage.expectError("Invalid credentials");
  });
});
```

**Page object principles**:
- One class per logical page/component, not per URL
- Constructor takes `Page`
- Locators as `readonly` properties defined in constructor
- Methods represent user intent (`reserve`, `fillDetails`), not low-level clicks
- Navigation methods (`goto`) belong on the page object

### Component Objects

For reusable UI components shared across pages:

```typescript
// components/navbar.component.ts
import { Page, Locator } from "@playwright/test";

export class NavbarComponent {
  readonly container: Locator;
  readonly logo: Locator;
  readonly searchInput: Locator;
  readonly userMenu: Locator;

  constructor(page: Page) {
    this.container = page.getByRole("navigation");
    this.logo = this.container.getByRole("link", { name: "Home" });
    this.searchInput = this.container.getByRole("searchbox");
    this.userMenu = this.container.getByRole("button", { name: /user menu/i });
  }

  async search(query: string) {
    await this.searchInput.fill(query);
    await this.searchInput.press("Enter");
  }

  async openUserMenu() {
    await this.userMenu.click();
  }
}
```

```typescript
// components/modal.component.ts
import { Locator, expect } from "@playwright/test";

export class ModalComponent {
  readonly container: Locator;
  readonly title: Locator;
  readonly closeButton: Locator;
  readonly confirmButton: Locator;

  constructor(container: Locator) {
    this.container = container;
    this.title = container.getByRole("heading");
    this.closeButton = container.getByRole("button", { name: "Close" });
    this.confirmButton = container.getByRole("button", { name: "Confirm" });
  }

  async expectTitle(title: string) {
    await expect(this.title).toHaveText(title);
  }

  async close() {
    await this.closeButton.click();
  }

  async confirm() {
    await this.confirmButton.click();
  }
}
```

### Page with Components

```typescript
// pages/dashboard.page.ts
import { Page, Locator } from "@playwright/test";
import { NavbarComponent } from "../components/navbar.component";
import { ModalComponent } from "../components/modal.component";

export class DashboardPage {
  readonly page: Page;
  readonly navbar: NavbarComponent;
  readonly newProjectButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.navbar = new NavbarComponent(page);
    this.newProjectButton = page.getByRole("button", { name: "New Project" });
  }

  async goto() {
    await this.page.goto("/dashboard");
  }

  async createProject() {
    await this.newProjectButton.click();
    return new ModalComponent(this.page.getByRole("dialog"));
  }
}
```

### Page Navigation Pattern

Return new page objects when navigation occurs:

```typescript
// pages/base.page.ts
import { Page } from "@playwright/test";

export abstract class BasePage {
  constructor(readonly page: Page) {}

  abstract goto(): Promise<void>;

  async getTitle(): Promise<string> {
    return this.page.title();
  }
}
```

```typescript
// Return new page object on navigation
export class LoginPage extends BasePage {
  async login(email: string, password: string): Promise<DashboardPage> {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
    return new DashboardPage(this.page);
  }
}

// Usage
const loginPage = new LoginPage(page);
await loginPage.goto();
const dashboardPage = await loginPage.login("user@example.com", "pass");
await dashboardPage.expectWelcomeMessage();
```

### Factory Function Alternative

For simpler pages without inheritance needs:

```typescript
// pages/login.page.ts
import { Page } from "@playwright/test";

export function createLoginPage(page: Page) {
  const emailInput = page.getByLabel("Email");
  const passwordInput = page.getByLabel("Password");
  const submitButton = page.getByRole("button", { name: "Sign in" });

  return {
    goto: () => page.goto("/login"),
    login: async (email: string, password: string) => {
      await emailInput.fill(email);
      await passwordInput.fill(password);
      await submitButton.click();
    },
    emailInput,
    passwordInput,
    submitButton,
  };
}
```

## Custom Fixtures

Best for resources needing setup before and teardown after tests — auth state, database connections, API clients, test users.

```typescript
// fixtures/base.fixture.ts
import { test as base, expect } from '@playwright/test';
import { BookingPage } from '../page-objects/booking.page';
import { generateMember } from '../helpers/data';

type Fixtures = {
  bookingPage: BookingPage;
  member: { email: string; password: string; id: string };
  loggedInPage: import('@playwright/test').Page;
};

export const test = base.extend<Fixtures>({
  bookingPage: async ({ page }, use) => {
    await use(new BookingPage(page));
  },

  member: async ({ request }, use) => {
    const data = generateMember();
    const res = await request.post('/api/test/members', { data });
    const member = await res.json();
    await use(member);
    await request.delete(`/api/test/members/${member.id}`);
  },

  loggedInPage: async ({ page, member }, use) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill(member.email);
    await page.getByLabel('Password').fill(member.password);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL('/dashboard');
    await use(page);
  },
});

export { expect } from '@playwright/test';
```

**Fixture principles**:
- Use `test.extend()` — never module-level variables
- `use()` callback separates setup from teardown
- Teardown runs even if the test fails
- Fixtures compose: one can depend on another
- Fixtures are lazy: created only when requested

### Using Fixtures with Page Objects

```typescript
// fixtures/pages.fixture.ts
import { test as base } from "@playwright/test";
import { LoginPage } from "../pages/login.page";
import { DashboardPage } from "../pages/dashboard.page";

type Pages = {
  loginPage: LoginPage;
  dashboardPage: DashboardPage;
};

export const test = base.extend<Pages>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
  dashboardPage: async ({ page }, use) => {
    await use(new DashboardPage(page));
  },
});

// Usage in tests
test("can login", async ({ loginPage }) => {
  await loginPage.goto();
  await loginPage.login("user@example.com", "password");
});
```

## Helper Functions

Best for stateless utilities — generating test data, formatting values, building URLs, parsing responses.

```typescript
// helpers/data.ts
import { randomUUID } from 'node:crypto';

export function generateEmail(prefix = 'user'): string {
  return `${prefix}-${Date.now()}-${randomUUID().slice(0, 8)}@test.local`;
}

export function generateMember(overrides: Partial<Member> = {}): Member {
  return {
    email: generateEmail(),
    password: 'SecurePass456!',
    name: 'Test Member',
    ...overrides,
  };
}

interface Member {
  email: string;
  password: string;
  name: string;
}

export function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}
```

```typescript
// helpers/assertions.ts
import { type Page, expect } from '@playwright/test';

export async function expectNotification(page: Page, message: string): Promise<void> {
  const notification = page.getByRole('alert').filter({ hasText: message });
  await expect(notification).toBeVisible();
  await expect(notification).toBeHidden({ timeout: 10000 });
}
```

**Helper principles**:
- Pure functions with no side effects
- No browser state — take `page` as parameter if needed
- Promote to fixture if setup/teardown needed
- Promote to page object if many page interactions grow

## Directory Structure

```text
tests/
+-- fixtures/
|   +-- auth.fixture.ts
|   +-- db.fixture.ts
|   +-- base.fixture.ts
+-- page-objects/
|   +-- login.page.ts
|   +-- booking.page.ts
|   +-- components/
|       +-- data-table.component.ts
+-- helpers/
|   +-- data.ts
|   +-- assertions.ts
+-- e2e/
|   +-- auth/
|   |   +-- login.spec.ts
|   +-- booking/
|       +-- reservation.spec.ts
playwright.config.ts
```

**Layer responsibilities**:

| Layer | Pattern | Responsibility |
|---|---|---|
| **Test file** | `test()` | Describes behavior, orchestrates layers |
| **Fixtures** | `test.extend()` | Resource lifecycle — setup, provide, teardown |
| **Page objects** | Classes | UI interaction — navigation, actions, locators |
| **Helpers** | Functions | Utilities — data generation, formatting, assertions |

## POM Do's and Don'ts

**Do**:
- Keep locators in page objects — single source of truth
- Return new page objects when navigation occurs
- Expose elements for custom assertions in tests
- Use descriptive method names — `submitOrder()` not `clickButton()`
- Keep methods focused — one action per method

**Don't**:
- Don't include assertions in page methods (usually) — keep in tests
- Don't expose implementation details — hide complex interactions
- Don't make page objects too large — split into components
- Don't share state between page object instances

## Anti-Patterns

### Page object managing resources

```typescript
// BAD: page object handling API calls and database
class LoginPage {
  async createUser() { /* API call */ }
  async deleteUser() { /* API call */ }
  async signIn(email: string, password: string) { /* UI */ }
}
```

Resource lifecycle belongs in fixtures where teardown is guaranteed. Keep only `signIn` in the page object.

### Locator-only page objects

```typescript
// BAD: no methods, just locators
class LoginPage {
  emailInput = this.page.getByLabel('Email');
  passwordInput = this.page.getByLabel('Password');
  submitBtn = this.page.getByRole('button', { name: 'Sign in' });
  constructor(private page: Page) {}
}
```

Add intent-revealing methods or skip the page object entirely.

### Monolithic fixtures

```typescript
// BAD: one fixture doing everything
test.extend({
  everything: async ({ page, request }, use) => {
    const user = await createUser(request);
    const products = await seedProducts(request, 50);
    await setupPayment(request, user.id);
    await page.goto('/dashboard');
    await use({ user, products, page });
    // massive teardown...
  },
});
```

Break into small, composable fixtures. Each fixture does one thing.

### Helpers with side effects

```typescript
// BAD: module-level state
let createdUserId: string;

export async function createTestUser(request: APIRequestContext) {
  const res = await request.post('/api/users', { data: { email: 'test@example.com' } });
  const user = await res.json();
  createdUserId = user.id; // shared across tests!
  return user;
}
```

Module-level state leaks between parallel tests. If it has side effects and needs cleanup, make it a fixture.

### Over-abstracting simple operations

```typescript
// BAD: helper for a one-liner
export async function clickButton(page: Page, name: string) {
  await page.getByRole('button', { name }).click();
}
```

Only abstract when there is real duplication (3+ usages) or complexity (5+ interactions).
