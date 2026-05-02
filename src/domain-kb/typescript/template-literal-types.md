---
name: template-literal-types
description: Build string-pattern types and typed key sets from union strings using TypeScript template literals.
license: MIT
last_reviewed: 2026-05-02
---

# Template Literal Types

**When to use:** Apply when you need to derive a string union that follows a naming convention (event handlers, CSS properties, i18n keys), when you want the compiler to catch typos in string keys, or when building accessor names from an interface. Concrete triggers: you have an `Event` union and want `on${Event}` typed; you have an object interface and want typed dot-notation paths; you're generating getter/setter method name types.

## Expanding unions

A template literal applied to a union produces the Cartesian product.

```ts
type Direction = "top" | "right" | "bottom" | "left";
type Margin = `margin-${Direction}`;
// "margin-top" | "margin-right" | "margin-bottom" | "margin-left"

type EventName = "click" | "focus" | "blur";
type Handler = `on${Capitalize<EventName>}`;
// "onClick" | "onFocus" | "onBlur"
```

Two unions in one template literal produce all combinations:

```ts
type Axis = "x" | "y";
type Scale = "sm" | "md" | "lg";
type SpacingKey = `${Scale}-${Axis}`;
// "sm-x" | "sm-y" | "md-x" | "md-y" | "lg-x" | "lg-y"
```

## Built-in string manipulation types

| Type | Effect | Example |
|---|---|---|
| `Uppercase<S>` | All caps | `Uppercase<"hello">` → `"HELLO"` |
| `Lowercase<S>` | All lower | `Lowercase<"HELLO">` → `"hello"` |
| `Capitalize<S>` | First letter upper | `Capitalize<"foo">` → `"Foo"` |
| `Uncapitalize<S>` | First letter lower | `Uncapitalize<"Foo">` → `"foo"` |

These are intrinsic (compiler-level) and work on string literal types and unions.

## Key remapping in mapped types

Combine template literals with `as` remapping to derive method names from an interface:

```ts
type Getters<T> = {
  [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K];
};

interface Config { host: string; port: number }
type ConfigGetters = Getters<Config>;
// { getHost: () => string; getPort: () => number }
```

`string & K` is required — `keyof T` is `string | number | symbol`; `Capitalize` only accepts `string`.

## Typed dot-notation paths

```ts
type Paths<T> = T extends object ? {
  [K in keyof T]: K extends string
    ? T[K] extends object
      ? `${K}` | `${K}.${Paths<T[K]>}`
      : `${K}`
    : never;
}[keyof T] : never;

interface AppConfig {
  server: { host: string; port: number };
  db: { url: string };
}

type AppPath = Paths<AppConfig>;
// "server" | "db" | "server.host" | "server.port" | "db.url"

declare function get(config: AppConfig, path: AppPath): unknown;
get(config, "server.host");  // OK
get(config, "server.typo");  // Error
```

## When NOT to use

- **Deep object graphs with cycles or large fan-out.** Recursive path types are quadratic in the number of keys × nesting depth. On a 20-key object with 4 levels, the union can exceed TypeScript's complexity limit and produce `Type instantiation is excessively deep`.
- **When a plain string union is already short enough to maintain by hand.** Generating 5 variants is more readable typed manually.
- **As a runtime substitute for string validation.** Template literal types are erased at compile time. A value typed as `on${string}` is still just `string` at runtime — use a type guard or Zod for runtime checks.

## Common failure modes

- **`string & K` omitted in `Capitalize`.** Without `string &`, TypeScript errors: `Type 'string | number | symbol' does not satisfy constraint 'string'`.
- **Combinatorial explosion.** Two 10-member unions in one template produce 100 string literals. TypeScript will compute them all — this slows the type checker and IDE noticeably.
- **Recursive path type on arrays.** Arrays have numeric keys and methods. `Paths<T>` on an array produces a huge union of array indices and method names. Add an `extends object` guard that also excludes `Array`: `T extends object ? T extends any[] ? never : ...`.
- **Assuming template types narrow at runtime.** `"onClick"` satisfies `Handler` at compile time but is still a `string` at runtime. Add an `isHandler` type guard if narrowing matters at runtime.
