---
name: option-and-result-patterns
description: Pattern-match `Option<T>` and `Result<T, E>` idiomatically in Rust — choose between `match`, `if let`, `let ... else`, the `?` operator, and the `*_or` / `*_or_else` family. Use this whenever the user is writing or reviewing code that calls `.unwrap()` / `.expect()` outside tests, has `match` arms that just convert `Result` to `Option`, debates `unwrap_or(...)` vs `unwrap_or_else(...)` for an allocation-heavy default, asks when `let Some(x) = ... else { return }` is preferable to `match`, or wants to know how `.ok_or_else()` / `.map_err()` / `.inspect_err()` compose. Covers: which pattern fits which intent, why `_or_else` matters when the default would allocate, the standard `Result`-conversion helpers (`.ok()`, `.ok_or()`, `.ok_or_else()`), and the common anti-patterns (manual `match` that re-implements `.ok()`, eager allocation in `unwrap_or`, `if let` where `let-else` reads cleaner).
source: https://github.com/apollographql/rust-best-practices
license: MIT
last_reviewed: 2026-05-02
---

# `Option` and `Result` pattern matching

`Option` and `Result` give you four idiomatic shapes: `match`, `if let`, `let ... else`, and the `?` operator. Each has a sweet spot. The wrong choice doesn't break anything — it just produces noisier code that reviewers will rewrite.

## Pick the shape by intent

| Intent | Pattern |
|---|---|
| Branch on every variant, or destructure deeply | `match` |
| Run a block on the happy path, fall through otherwise | `if let Some(x) = ...` |
| Run a block on the happy path, otherwise return / break / continue | `let Some(x) = ... else { ... }` |
| Bubble the error to the caller | `?` |
| Convert `Result<T, E>` → `Option<T>` | `.ok()` |
| Convert `Option<T>` → `Result<T, E>` | `.ok_or(err)` or `.ok_or_else(|| ...)` |
| Provide a default value | `.unwrap_or(default)` or `.unwrap_or_else(|| ...)` |
| Map only the error | `.map_err(|e| ...)` |
| Log without consuming the error | `.inspect_err(|e| ...)` |

## `match` vs `if let` vs `let-else`

Use `match` when you actually pattern-match against multiple inner values:

```rust
match parse(input) {
    Ok(Direction::North) => go_north(),
    Ok(Direction::South) => go_south(),
    Ok(_) => panic!("unexpected direction"),
    Err(ParseError::Empty) => {/* expected */}
    Err(e) => return Err(e.into()),
}
```

Use `let-else` when the failure path leaves the function (or the loop):

```rust
let Some(user) = repo.get(id) else {
    return Err(NotFound);
};
process(user);

for item in &batch {
    let Some(parsed) = parse_item(item) else {
        continue;
    };
    handle(parsed);
}
```

Use `if let` when the failure path runs more code that doesn't diverge:

```rust
if let Some(cached) = self.cache.get(key) {
    return cached.clone();
} else {
    let fresh = self.compute(key);
    self.cache.insert(key.to_string(), fresh.clone());
    fresh
}
```

The decision rule: does the failure branch return / break / continue? If yes, `let-else`. If no, `if let`. If you're matching multiple inner values, `match`.

## `?` is the default for propagation

```rust
fn handle(req: &Request) -> Result<Validated, MyError> {
    validate_headers(req)?;
    validate_body(req)?;
    let body = Body::try_from(req)?;
    Validated::try_from((req, body))
}
```

A chain of `match` statements that all just propagate the error is a code smell — collapse to `?`. Convert error types via `From` (use `thiserror`'s `#[from]`) or with `.map_err(...)?` at the boundary.

## `unwrap()` / `expect()` outside tests

Don't. Replace each with the right idiom:

| Original | Replacement |
|---|---|
| `let v = parse().unwrap();` (early-exit OK) | `let Ok(v) = parse() else { return Err(MyError::BadInput); };` |
| `let v = parse().expect("parsed earlier")` | `?` plus a real error type, OR document with `// SAFETY:` if literally impossible |
| `let v = config.port.unwrap();` | `let v = config.port.unwrap_or(8080);` (concrete default) or return `Err` |
| `cache.get(key).unwrap()` (called in tests) | Fine in `#[cfg(test)]` code. Do not leak it to non-test code. |

`expect("...")` is preferred over `unwrap()` only because the message is a breadcrumb when it eventually does panic. Neither belongs in production paths where a real error type would do.

The three macros that *replace* `panic!` honestly:

- `todo!()` — code is missing; you want the compiler to remind you.
- `unimplemented!()` — block intentionally left blank with a reason.
- `unreachable!()` — you have proven this branch can't be reached; you want a panic if it ever is.

## `_or` vs `_or_else`: avoid eager allocation

Functions like `unwrap_or`, `ok_or`, `map_or` evaluate their default eagerly — even when the happy path is taken. If the default allocates, calls a function, or builds a value, use the `_else` variant:

```rust
let v = some_result.unwrap_or(Vec::new()); // allocates an empty Vec every call
let v = some_result.unwrap_or_else(Vec::new); // allocates only on Err
let v = some_result.unwrap_or_default();      // even better when T: Default

let r = maybe.ok_or(MyError::Missing(format!("key={}", k))); // formats every call
let r = maybe.ok_or_else(|| MyError::Missing(format!("key={}", k))); // formats only on None
```

Trivial defaults — integers, `&'static str`, simple enum variants — are fine with `_or`. The `_else` overhead (a closure call) is only worth it when the default has real cost.

## `Result` ↔ `Option` conversions

Don't reinvent these by hand:

```rust
// Bad
let opt = match res {
    Ok(t) => Some(t),
    Err(_) => None,
};

// Good
let opt = res.ok();
```

```rust
// Bad
let res = match opt {
    Some(t) => Ok(t),
    None => Err(MyError::Missing),
};

// Good
let res = opt.ok_or(MyError::Missing);
// or, with a costly Err
let res = opt.ok_or_else(|| MyError::Missing(format!("key={k}")));
```

clippy's `manual_ok_or` and `unnecessary_result_map_or_else` lints catch these.

## Logging and transforming errors

Log without consuming, and re-shape the error in the same chain:

```rust
serde_json::from_str::<Config>(&raw)
    .inspect_err(|e| tracing::error!(error = %e, "parse_config"))
    .map_err(|e| MyError::ParseConfig(e.to_string()))?;
```

`inspect_err` runs a side effect on the `Err` variant and returns the original `Result` — useful for logging without changing the type. Pair it with `map_err` when you need to convert to your crate's error type.

## When NOT to use these helpers

- Don't use `let-else` purely for terseness when the diverging branch needs the failed value. Use `if let Err(e) = ...` so you can act on `e`.
- Don't chain `.map().filter().and_then().unwrap_or_else(...)` so deep that a `match` would read more clearly. There's a length where prose loses to a table loses to a `match`.
- Don't pre-build a `Result` just to call `.ok()` on it. If the function returns `Option`, return `Option` directly.

## Common failure modes

- **Eager `format!` in `unwrap_or` / `ok_or`.** Hot path now allocates on every call. Use `_else` variants.
- **Ignoring the `Err` value with `if let Err(_) = res { ... }`.** If you don't care about the value, `?` it; if you do care, name the binding.
- **`unwrap()` inside a `lazy_static` / `OnceLock` initializer.** Panics happen at first access from any thread, not at startup. Either return `Result` and surface the failure during init, or ensure the inputs literally cannot fail.
- **`match` arms that fan out to do the same thing.** Collapse with `_` or convert to `.ok()` / `.ok_or()` / `?`.
- **Using `if let` where `let-else` would flatten a function.** A single `let-else` removes one indentation level for the rest of the function — readability win.
