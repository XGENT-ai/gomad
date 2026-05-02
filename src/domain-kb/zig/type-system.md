---
name: type-system
description: Write type-safe Zig code using tagged unions, explicit error sets, distinct IDs, and comptime.
license: MIT
last_reviewed: 2026-05-02
---

# Zig Type System Patterns

## When to use

Use when modeling mutually exclusive states (idle/loading/success/failure), when multiple nullable struct fields would allow invalid combinations, when you need the compiler to prevent mixing domain ID types (UserId vs OrderId), when you want exact error documentation instead of `anyerror`, or when you want to catch invalid configuration at compile time rather than runtime.

## Tagged Unions for Mutually Exclusive States

When a value can be exactly one of several exclusive states, use `union(enum)` instead of a struct with nullable fields:

```zig
const RequestState = union(enum) {
    idle,
    loading,
    success: []const u8,
    failure: anyerror,
};
```

A struct `{ success: ?[]const u8, failure: ?anyerror }` allows both set simultaneously — an invalid combination the union makes impossible.

## Explicit Error Sets

Name every failure mode. `anyerror` hides what can go wrong and prevents exhaustive handling:

```zig
const ParseError = error{ InvalidSyntax, UnexpectedToken, EndOfInput };
fn parse(input: []const u8) ParseError!Ast { ... }
```

Reserve `anyerror` for system boundaries where errors from C libraries or external allocators must pass through without enumeration.

## Distinct Domain ID Types

Wrap integer IDs in `enum(u64)` to prevent accidental mixing at compile time:

```zig
const UserId = enum(u64) { _ };
const OrderId = enum(u64) { _ };
```

`fn getOrder(id: OrderId)` will refuse to compile if you pass a `UserId`. Cost: serialize/deserialize with `@intFromEnum` / `@enumFromInt`.

## Comptime Validation

Catch invalid configurations at compile time, not runtime:

```zig
fn Buffer(comptime size: usize) type {
    if (size == 0) @compileError("buffer size must be greater than 0");
    return struct { data: [size]u8 = undefined, len: usize = 0 };
}
```

## Exhaustive Switch

Omit `else` on tagged unions and enums so the compiler enforces exhaustiveness when variants are added:

```zig
switch (state) {
    .idle     => {},
    .loading  => {},
    .success  => |data| process(data),
    .failure  => |err| return err,
    // no else — compiler will reject unhandled variants
}
```

Use `else => unreachable` only when an impossible case is guaranteed by an external invariant you control.

## General Idioms

- Prefer `const` over `var` — signals immutability intent, catches accidental mutation.
- Prefer slices (`[]u8`) over raw pointers (`*u8`) — slices carry length, preventing out-of-bounds.

## When NOT to Use

| Pattern | Skip when |
|---|---|
| Tagged union | All fields are always present — use a plain struct |
| Explicit error set | Wrapping C errors where the full set is unknown or unbounded |
| Distinct ID types | Throwaway scripts; `@intFromEnum` casts add noise |
| Comptime `@compileError` | The parameter has only one sensible value — just hardcode it |

## Common Failure Modes

- **`anyerror` in public API** — callers cannot exhaustively handle errors; switch to a named error set.
- **`else =>` in a switch meant to be exhaustive** — adding a new union variant compiles silently and falls into `else`. Remove `else` and let the compiler enforce it.
- **Comptime error at the wrong call site** — `@compileError` inside a generic function fires at the instantiation site, not the definition. The reported location is the caller, not the invalid comptime expression itself.
