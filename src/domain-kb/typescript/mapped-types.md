---
name: mapped-types
description: Transform TypeScript object types by remapping keys and filtering properties by value type.
license: MIT
last_reviewed: 2026-05-02
---

# Mapped Types

**When to use:** Apply when you need to derive a new type by transforming every property of an existing type — adding/removing modifiers, renaming keys, or filtering properties by their value type. Concrete triggers: building getter/setter variants of an interface, making all keys optional recursively, or restricting a type to only its numeric/string fields.

Prefer the built-ins (`Partial`, `Required`, `Readonly`, `Pick`, `Omit`, `Record`) when they cover the case. Only write a custom mapped type when the built-ins fall short.

## Syntax

```ts
type Transform<T> = {
  [K in keyof T]: NewValueType;
};
```

## Adding and removing modifiers

```ts
// Add optional and readonly
type Partial<T>  = { [K in keyof T]?: T[K] };
type Readonly<T> = { readonly [K in keyof T]: T[K] };

// Remove optional and readonly (-? and -readonly)
type Required<T>  = { [K in keyof T]-?: T[K] };
type Mutable<T>   = { -readonly [K in keyof T]: T[K] };
```

The `-` prefix strips a modifier. This is how `Required<T>` undoes `Partial<T>`.

## Key remapping with `as`

Remap keys by adding an `as NewKey` clause. Return `never` to drop a key entirely.

```ts
// Generate getter methods from an interface
type Getters<T> = {
  [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K];
};

interface Person { name: string; age: number }
type PersonGetters = Getters<Person>;
// { getName: () => string; getAge: () => number }
```

`string & K` is required because `keyof T` is `string | number | symbol` and `Capitalize` only accepts `string`.

## Filtering properties by value type

Return `never` from the key remapping to exclude unwanted properties.

```ts
type PickByValue<T, V> = {
  [K in keyof T as T[K] extends V ? K : never]: T[K];
};

interface Mixed { id: number; name: string; age: number; active: boolean }

type NumericFields = PickByValue<Mixed, number>;
// { id: number; age: number }

type StringFields = PickByValue<Mixed, string>;
// { name: string }
```

This is more flexible than `Pick<T, K>` because the filter is based on value type, not a known key list.

## Decision table

| Goal | Use |
|---|---|
| All props optional | `Partial<T>` (built-in) |
| All props required | `Required<T>` (built-in) |
| All props readonly | `Readonly<T>` (built-in) |
| Select named keys | `Pick<T, K>` (built-in) |
| Remove named keys | `Omit<T, K>` (built-in) |
| Rename all keys | `[K in keyof T as NewName<K>]: T[K]` |
| Filter by value type | `[K in keyof T as T[K] extends V ? K : never]: T[K]` |
| Deep optional/readonly | `type-fest`'s `PartialDeep` / `ReadonlyDeep` — see `illegal-states.md` |

## When NOT to use

- **When a built-in utility type already does it.** `Partial`, `Pick`, `Omit`, `Readonly` cover the most common cases — prefer them for readability.
- **For deep recursive transforms.** Recursive mapped types hit depth limits quickly. Use [`type-fest`](https://github.com/sindresorhus/type-fest)'s `PartialDeep`/`ReadonlyDeep` instead.
- **When a plain interface is clearer.** If the output type has 3 hand-writable properties, write the interface. A mapped type for 3 props is cleverness over clarity.

## Common failure modes

- **`string & K` missing in `Capitalize`/template literals.** `keyof T` yields `string | number | symbol`. Template literal intrinsics only accept `string`. Always use `string & K` when concatenating keys.
- **Modifier removal on non-optional types.** `-?` on a type with no optional properties is a no-op, but applying `-readonly` to types that aren't readonly is similarly harmless. Neither is an error, so it can mask intent.
- **Returning `never` unintentionally.** If your `as` clause always returns `never`, the entire mapped type is `{}`. Add a test: `type Check = keyof YourMappedType` — if it's `never`, the filter is too aggressive.
- **Using mapped types to replicate discriminated unions.** Mapped types transform shapes; discriminated unions model states. Don't flatten a discriminated union into a mapped type to "simplify" it — you lose the type narrowing.
