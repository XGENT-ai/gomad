---
name: zod-validation
description: Validate and parse untrusted data at TypeScript system boundaries using Zod.
license: MIT
last_reviewed: 2026-05-02
---

# Zod Validation

**When to use:** Apply when parsing API responses, form submissions, environment variables, or external JSON; when deciding whether to write a separate TypeScript type alongside a validation schema; after a runtime crash from an unexpected API shape the compiler didn't catch; when choosing between `safeParse` vs `parse`; when composing schemas from sub-schemas without repeating field definitions; or when normalizing data (trim strings, parse dates) at parse time. Covers `z.infer`, `safeParse` vs `parse`, schema composition with `.extend` / `.pick` / `.omit` / `.merge`, and `.transform` for normalization.

Zod is a runtime validator that also generates TypeScript types. The key invariant: one schema, one type — never both a hand-written `type` and a separate validator for the same shape.

## Schema as single source of truth

```ts
import { z } from 'zod';

const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().min(1),
  createdAt: z.string().transform((s) => new Date(s)),
});

type User = z.infer<typeof UserSchema>;
// { id: string; email: string; name: string; createdAt: Date }
```

The `type` is derived from the schema. If the schema changes, the type updates automatically. Do NOT hand-write a matching `type User = { ... }` alongside it.

## `parse` vs `safeParse`

| Method | Use when | On failure |
|---|---|---|
| `parse(data)` | Trust boundary — invalid data is a bug (API response, DB row) | Throws `ZodError` |
| `safeParse(data)` | User input — failure is expected and handled (form, query param) | Returns `{ success: false, error }` |

```ts
// Trust boundary: a malformed API response is a bug — throw immediately
export async function fetchUser(id: string): Promise<User> {
  const response = await fetch(`/api/users/${id}`);
  if (!response.ok) throw new Error(`fetch user ${id} failed: ${response.status}`);
  return UserSchema.parse(await response.json());
}

// User input: failure is expected — handle gracefully
function handleSubmit(formData: unknown) {
  const result = UserSchema.safeParse(formData);
  if (!result.success) {
    setErrors(result.error.flatten().fieldErrors);
    return;
  }
  submitUser(result.data); // result.data is typed as User
}
```

## Schema composition

Avoid duplicating field definitions when schemas share structure.

```ts
const BaseUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
});

// extend: add fields
const CreateUserSchema = BaseUserSchema.extend({
  password: z.string().min(8),
});

// pick / omit: subset of fields
const PublicUserSchema = BaseUserSchema.pick({ name: true });
const InternalSchema = CreateUserSchema.omit({ password: true });

// merge: combine two objects
const FullSchema = BaseUserSchema.merge(z.object({ id: z.string().uuid() }));
```

## Transforms for normalization

Run normalization at parse time so callers receive clean data without extra steps.

```ts
const SearchParamsSchema = z.object({
  query: z.string().trim().min(1),
  page: z.coerce.number().int().positive().default(1),
  tags: z
    .string()
    .transform((s) => s.split(',').filter(Boolean))
    .default(''),
});

// Parses "?query= hello &page=2&tags=a,b" into { query: "hello", page: 2, tags: ["a", "b"] }
```

`z.coerce` converts the input type before validating (e.g. `"2"` → `2`). Use it for query params and environment variables where everything arrives as a string.

## Environment variable validation

```ts
const EnvSchema = z.object({
  DATABASE_URL: z.string().url(),
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

export const env = EnvSchema.parse(process.env);
```

Parse `process.env` once at startup with `parse` (not `safeParse`). A missing required env var is a deploy bug, not a recoverable condition.

## When NOT to apply

- **Don't add Zod to internal pure functions.** If a function is called from TypeScript-controlled code and takes typed arguments, the compiler already validates the shape at the call site. Runtime validation is redundant and adds overhead.
- **Don't use Zod as a sanitizer.** Zod validates shape and constraints; it does not sanitize HTML or SQL. Use a dedicated sanitizer for security-sensitive content after Zod validates the structure.
- **Don't validate inside tight loops.** Schema parsing allocates. Parse at the boundary (the entry point), not on every element of a large array in hot code.

## Common failure modes

- **Hand-written type alongside a Zod schema.** When the schema evolves and the `type` doesn't, they diverge silently. Delete the hand-written type; derive it with `z.infer`.
- **Using `safeParse` at a trust boundary.** If the API returns a shape that doesn't match the schema, it's a broken contract — the error should surface loudly, not be silently swallowed. Use `parse` there.
- **Using `parse` on user input without a try/catch.** An uncaught `ZodError` from unvalidated form data reaches the user as a 500. Use `safeParse` for anything a user typed.
- **Forgetting `.flatten()` when reading form errors.** `result.error.issues` is a flat array of issues; `result.error.flatten().fieldErrors` groups them by field name, which is what form libraries expect.
- **Transforms hidden inside shared schemas.** A `.transform()` on a base schema changes the inferred output type. When that schema is extended or merged, the output type shifts unexpectedly. Keep transforms close to the boundary they serve; don't embed them in widely-shared base schemas.
