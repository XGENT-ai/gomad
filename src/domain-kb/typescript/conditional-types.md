---
name: conditional-types
description: Use conditional types and infer to extract inner types and filter union members in TypeScript.
license: MIT
last_reviewed: 2026-05-02
---

# Conditional Types

**When to use:** Apply when you need to extract an inner type from a wrapper (Promise, array, function), when a type's shape should depend on another type's structure, or when filtering union members. The three concrete triggers: you're writing `ReturnType`-like utilities, you need to strip `Promise<T>` to get `T`, or you need to produce `never` to exclude union members.

## Syntax

```ts
type Result<T> = T extends Condition ? TrueType : FalseType;
```

## Extracting inner types with `infer`

`infer` declares a type variable inside the `extends` clause. TypeScript binds it to the matched type.

```ts
type UnwrapPromise<T> = T extends Promise<infer U> ? U : T;
type UnwrapArray<T>   = T extends (infer U)[]      ? U : T;
type ReturnType<T>    = T extends (...args: any[]) => infer R ? R : never;
type Parameters<T>    = T extends (...args: infer P) => any   ? P : never;

type A = UnwrapPromise<Promise<string>>; // string
type B = UnwrapArray<number[]>;          // number
type C = ReturnType<() => { id: number }>; // { id: number }
type D = Parameters<(a: string, b: number) => void>; // [string, number]
```

Use `never` as the false branch when the input type is invalid — callers get a compile error rather than a useless type.

## Distributive evaluation over unions

When `T` is a bare type parameter (not wrapped in `[]` or `{}`), conditional types distribute over union members automatically.

```ts
type ToArray<T>   = T extends any ? T[]   : never;
type OnlyString<T> = T extends string ? T : never;

type A = ToArray<string | number>;    // string[] | number[]
type B = OnlyString<string | number>; // string
```

`OnlyString` is effectively a union filter — `number` maps to `never`, which collapses out.

**To disable distribution**, wrap `T` in a tuple:

```ts
type IsUnion<T> = [T] extends [T]
  ? T extends any ? ((...args: [T]) => void) extends (...args: [T]) => void ? false : true : false
  : never;

// Simpler: suppress distribution when you want the whole union checked at once
type IsNever<T> = [T] extends [never] ? true : false;
```

## Nested conditions for type classification

```ts
type TypeName<T> =
  T extends string    ? "string"    :
  T extends number    ? "number"    :
  T extends boolean   ? "boolean"   :
  T extends undefined ? "undefined" :
  T extends Function  ? "function"  :
  "object";

type A = TypeName<string[]>;   // "object"
type B = TypeName<() => void>; // "function"
```

Nested conditions become hard to read past 4 levels. Prefer a decision table approach in prose and keep types shallow.

## Decision table

| Goal | Pattern |
|---|---|
| Unwrap `Promise<T>` | `T extends Promise<infer U> ? U : T` |
| Get function return type | `T extends (...args: any[]) => infer R ? R : never` |
| Filter union members | `T extends Allowed ? T : never` |
| Suppress distribution | `[T] extends [Condition] ? ...` |
| Check for `never` | `[T] extends [never] ? true : false` |

## When NOT to use

- **When a mapped type or utility type suffices.** `Partial<T>`, `Pick<T, K>`, `ReturnType<T>` are already built in — don't reimplement them.
- **For simple type aliases.** `type Name = string` does not need a conditional.
- **In deeply recursive forms without a depth limit.** Recursive conditional types can hit TypeScript's instantiation depth limit (default ~100 levels) and produce `Type instantiation is excessively deep` errors.

## Common failure modes

- **`infer` outside `extends`.** `infer U` only works inside a conditional `extends` clause. Placing it elsewhere is a syntax error.
- **Forgetting `never` collapses in unions.** `string | never` is just `string`. This is usually what you want when filtering, but can surprise you when debugging intermediate types.
- **Non-distributive check surprises.** `string | number extends string` is `false`. But `T extends string` distributes: `string` maps to `true`, `number` maps to `false`, yielding `boolean`. Wrap in `[T]` to get a single boolean.
- **Circular conditional types.** TypeScript resolves these lazily; you can write them, but they often produce `any` or hit depth limits in practice.
