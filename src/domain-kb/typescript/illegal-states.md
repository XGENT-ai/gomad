---
name: illegal-states
description: Design TypeScript types to make invalid states unrepresentable at compile time.
license: MIT
last_reviewed: 2026-05-02
---

# Illegal States

**When to use:** Apply when you have boolean flags that combine into invalid combinations (e.g. `{ loading: true, error: Error }`), optional fields that should be mutually exclusive, a need to prevent passing an `OrderId` where a `UserId` is expected, request lifecycle or state machine states to model, a runtime error the compiler should have caught, a new union variant added and you need to find all switch statements that need updating, or deep recursive partial/readonly types where manual mapped types feel necessary. Uses discriminated unions, branded/opaque types (including `type-fest`'s `Opaque`), const assertions, exhaustive switch/never checks, and `type-fest` utilities (`PartialDeep`, `ReadonlyDeep`).

TypeScript's type system is expressive enough to make most invalid states unrepresentable. The cost of not using it: runtime bugs that the compiler would have caught for free.

## Discriminated unions for mutually exclusive states

When a value can be in one of several shapes that don't overlap, a discriminated union beats a struct with optional fields.

```ts
// Good: only valid combinations are possible
type RequestState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: Error };

// Bad: allows invalid combinations like { loading: true, error: Error, data: T }
type RequestState<T> = {
  loading: boolean;
  data?: T;
  error?: Error;
};
```

Typical uses: request lifecycle states, step-by-step wizards, auth states (`unauthenticated | authenticating | authenticated`), editor modes.

## Branded types for domain primitives

Two `string` values with different semantic domains look identical to the compiler. Branding adds a phantom type token the compiler enforces but erases at runtime.

```ts
type UserId = string & { readonly __brand: 'UserId' };
type OrderId = string & { readonly __brand: 'OrderId' };

function getUser(id: UserId): Promise<User> { /* ... */ }

declare const orderId: OrderId;
getUser(orderId); // TS error: Argument of type 'OrderId' is not assignable to parameter of type 'UserId'
```

Create branded values through a constructor that validates the raw value:

```ts
function toUserId(raw: string): UserId {
  if (!raw.startsWith('usr_')) throw new Error(`invalid UserId: ${raw}`);
  return raw as UserId;
}
```

The `as` cast is intentional — the constructor is the trust boundary. Outside it, the brand is enforced by the compiler.

### Cleaner branded types with type-fest

The manual `& { __brand }` pattern works but is noisy in tooltips. [`type-fest`](https://github.com/sindresorhus/type-fest) provides `Opaque<T, Token>`:

```ts
import type { Opaque } from 'type-fest';

type UserId = Opaque<string, 'UserId'>;
type OrderId = Opaque<string, 'OrderId'>;
```

Same compile-time enforcement, cleaner IDE output.

## Const assertions for literal unions

When an array of string literals is both the runtime source of truth and the compile-time union, `as const` keeps them in sync without duplication.

```ts
const ROLES = ['admin', 'user', 'guest'] as const;
type Role = typeof ROLES[number]; // 'admin' | 'user' | 'guest'

function isValidRole(role: string): role is Role {
  return (ROLES as readonly string[]).includes(role);
}
```

Without `as const`, `ROLES` is inferred as `string[]` and `Role` would be `string`.

## Exhaustive switch with never

When you add a union variant and forget to handle it, the `never` trick turns the omission into a compile error.

```ts
type Status = 'active' | 'inactive' | 'suspended';

function processStatus(status: Status): string {
  switch (status) {
    case 'active':   return 'processing';
    case 'inactive': return 'skipped';
    case 'suspended': return 'blocked';
    default: {
      const _exhaustive: never = status;
      throw new Error(`unhandled status: ${_exhaustive}`);
    }
  }
}
```

If you add `'deleted'` to `Status` and don't add a case, the compiler errors on the `never` assignment. The `throw` also guards against runtime surprises if the value arrives from outside TypeScript.

## Deep recursive utilities with type-fest

TypeScript's built-in `Partial<T>` and `Readonly<T>` are shallow — they don't recurse into nested objects. `type-fest` fills the gap:

```ts
import type { PartialDeep, ReadonlyDeep, SetRequired, SetOptional, Simplify } from 'type-fest';

type UserPatch = PartialDeep<User>;       // all fields optional, recursively
type FrozenUser = ReadonlyDeep<User>;     // all fields readonly, recursively
type WithName = SetRequired<User, 'name'>; // make specific fields required
type WithoutAge = SetOptional<User, 'age'>; // make specific fields optional

// Flatten `A & B & C` intersection types into a single object type in IDE tooltips
type Clean = Simplify<PartialDeep<User> & { extra: string }>;
```

Only reach for these when `Partial` / `Readonly` genuinely fall short. Adding a dependency for a one-off case is not worth it.

## Decision table

| Pattern | Use when | Don't use when |
|---|---|---|
| Discriminated union | Multiple shapes with different fields per state | All states share the same shape |
| Branded type | Same primitive type, different semantic domain | Performance is critical — branded constructors add function call overhead |
| Const assertion | Literal array drives both runtime and type | Array values are not literals (computed, dynamic) |
| Exhaustive switch | Union variant set will grow; compiler should enforce coverage | Union has >10 variants — consider a handler map instead |
| type-fest deep utilities | Nested object needs deep `Partial`/`Readonly` | Shallow utility types are enough |

## When NOT to apply

- **Don't brand simple internal values.** If `userId` never mixes with `orderId` in the same function signatures, the brand adds no safety — only noise.
- **Don't discriminate single-state structs.** A union of one variant is just a struct.
- **Don't model every enum as a discriminated union.** If the variants have the same shape, a plain `type Role = 'admin' | 'user' | 'guest'` is simpler.

## Common failure modes

- **Forgetting the `as const` on the literal array.** `typeof ROLES[number]` becomes `string`, not a union literal. Add `as const` and verify the inferred type.
- **Casting to a branded type without a constructor.** `x as UserId` anywhere in calling code defeats the pattern. The cast belongs only inside the constructor function.
- **Switch without the `never` guard.** A `default: return assertNever(status)` function works too — pick one and apply it consistently, or TypeScript won't alert on missing cases.
- **Partial vs PartialDeep confusion.** Passing a deeply-partial object where `Partial<T>` is expected silently accepts it — nested required fields are not checked. Align the types at the boundary.
