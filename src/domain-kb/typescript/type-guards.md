---
name: type-guards
description: Narrow unknown and union types at runtime using TypeScript type predicates and assertion functions.
license: MIT
last_reviewed: 2026-05-02
---

# Type Guards

**When to use:** Apply when you have a value typed as `unknown`, `any`, or a broad union and you need to narrow it to a specific type inside a block. Concrete triggers: parsing external data into a typed structure without Zod, validating items in a `unknown[]` array, or asserting preconditions before a block of code to avoid repeated null checks.

For complex object shapes at system boundaries (API responses, form input), prefer [Zod validation](./zod-validation.md) — it gives you both runtime validation and type inference from a single schema.

## User-defined type predicates

A function whose return type is `value is T` tells TypeScript: "if this returns `true`, narrow `value` to `T` in the caller."

```ts
function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isUser(value: unknown): value is { id: string; name: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    "name" in value
  );
}

const data: unknown = fetchSomething();

if (isUser(data)) {
  console.log(data.name); // Type: string — compiler trusts the guard
}
```

## Generic collection guards

Compose simple guards to validate typed collections.

```ts
function isArrayOf<T>(
  value: unknown,
  guard: (item: unknown) => item is T,
): value is T[] {
  return Array.isArray(value) && value.every(guard);
}

const raw: unknown = JSON.parse(response);

if (isArrayOf(raw, isString)) {
  raw.forEach((s) => s.toUpperCase()); // Type: string[]
}
```

## Assertion functions

An assertion function throws if the condition fails; it narrows the type for all code that follows — not just inside a conditional branch.

```ts
function assertIsString(value: unknown): asserts value is string {
  if (typeof value !== "string") {
    throw new TypeError(`Expected string, got ${typeof value}`);
  }
}

function assertDefined<T>(value: T | null | undefined): asserts value is T {
  if (value == null) throw new Error("Expected defined value");
}

function processInput(value: unknown) {
  assertIsString(value);
  // value is string from here to end of function
  console.log(value.toUpperCase());
}
```

## Decision table

| Situation | Use |
|---|---|
| Narrow once inside a branch | Type predicate: `value is T` |
| Narrow for all code after the call | Assertion function: `asserts value is T` |
| Validate a collection | Generic guard: `isArrayOf(v, isT)` |
| Complex object shape at system boundary | Zod `parse` / `safeParse` (see `zod-validation.md`) |
| Discriminated union narrowing | Plain `if (x.status === "success")` — TypeScript does this automatically |
| `instanceof` checks | Built-in — no custom guard needed |

## When NOT to use

- **For discriminated unions.** TypeScript narrows discriminated unions automatically on `switch`/`if` checks against the discriminant property. A custom type guard there is redundant.
- **As a replacement for Zod at real system boundaries.** A hand-written `isUser` guard does not validate email format, UUID structure, or string lengths. Use Zod when correctness matters, not just shape.
- **To paper over a design flaw.** If you're writing many guards for a type that frequently arrives as `unknown`, consider why the type isn't propagated correctly from the source instead.

## Common failure modes

- **Returning `true` without actually checking.** TypeScript trusts your predicate body without verifying it. `function isString(v: unknown): v is string { return true; }` compiles and silently lies. The body must genuinely check the type.
- **Assertion functions that return instead of throw.** An `asserts value is T` function MUST throw (or otherwise halt execution) on failure. If it just returns, TypeScript will narrow incorrectly and produce a runtime bug. There is no compiler check for this.
- **Type predicates that don't narrow enough.** `value is object` narrows to `object`, which still allows `null` (since `typeof null === "object"`). Always guard `value !== null` explicitly when checking object shapes.
- **Guards not reused across call sites.** Writing `typeof x === "string"` inline is fine for one or two spots. Once you repeat the pattern for a complex type, extract a named guard — duplicated inline checks drift when the type changes.
