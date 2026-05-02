---
name: error-handling
description: Design error types and propagate failures idiomatically with `thiserror`/`anyhow` in Rust.
license: MIT
last_reviewed: 2026-05-02
---

**When to use:** Reach for this article when choosing between `thiserror` and `anyhow`, deciding whether to return `Result` or `panic!`, spotting `unwrap()` / `expect()` in non-test code, wiring `#[from]` for nested error enums, questioning `Box<dyn Error>` in a library, or composing `inspect_err` and `map_err`.

# Error handling

Rust forces you to declare fallibility. The handbook decisions are: `Result` over `panic!`, `thiserror` for libraries, `anyhow` for binaries, `?` over `match` chains, and `unwrap` only in tests.

## Return `Result`, not `panic!`

If the function can fail at runtime due to inputs or environment, return `Result<T, E>`:

```rust
fn divide(x: f64, y: f64) -> Result<f64, DivisionError> {
    if y == 0.0 {
        Err(DivisionError::DividedByZero)
    } else {
        Ok(x / y)
    }
}
```

`panic!` is for unrecoverable bugs — broken invariants, impossible states. Three honest substitutes:

| Macro | Meaning |
|---|---|
| `todo!()` | Code intentionally missing. Compiler reminds you. |
| `unimplemented!()` | Block deliberately not implemented (e.g. unused trait method on a type that shouldn't reach it). |
| `unreachable!()` | You've proven the branch can't be reached; you want a panic if it ever is. |

These all panic at runtime, but they document *why*. Use them over a raw `panic!("won't happen")`.

## `thiserror` for library errors

Hand-implementing `Error` is verbose and error-prone. `thiserror` gives you `Display`, `From`, and `Error::source()` from attributes:

```rust
#[derive(Debug, thiserror::Error)]
pub enum MyError {
    #[error("Network Timeout")]
    Timeout,
    #[error("Invalid data: {0}")]
    InvalidData(String),
    #[error(transparent)]
    Serialization(#[from] serde_json::Error),
    #[error("Invalid request: header={headers}, metadata={metadata}")]
    InvalidRequest {
        headers: Headers,
        metadata: Metadata,
    },
}
```

Two patterns to know:

- `#[from] OtherError` auto-derives `From<OtherError> for MyError`, so the `?` operator converts upstream errors into your enum without an explicit `.map_err`.
- `#[error(transparent)]` forwards `Display` and `source()` to the wrapped error, useful for layered systems where you don't want to invent a new message.

### Hierarchies via nested `#[from]`

```rust
use crate::database::DbError;
use crate::external_services::ExternalHttpError;

#[derive(Debug, thiserror::Error)]
pub enum ServiceError {
    #[error("Database error: {0}")]
    Db(#[from] DbError),
    #[error("External service error: {0}")]
    External(#[from] ExternalHttpError),
}
```

Each layer owns its error type; the outer layer wraps the inner via `From`. Callers walk `source()` to get the full chain.

### Single-variant errors as structs

If a module has exactly one failure shape, an enum with one variant is silly. Use a struct:

```rust
#[derive(Debug, thiserror::Error, PartialEq)]
#[error("Request failed with code `{code}`: {message}")]
struct HttpError {
    code: u16,
    message: String,
}
```

## `anyhow` for binaries only

`anyhow::Error` is a type-erased "any error" wrapper with `.context(...)` for breadcrumbs. It's ergonomic — you don't model the error type — but it loses information at the type level.

Use `anyhow` in:

- Binaries (`main.rs`, CLIs).
- Application-level glue code where the caller is the user, not another module.
- Test helpers.

```rust
use anyhow::{Context, Result, anyhow};

fn main() -> Result<()> {
    let content = std::fs::read_to_string("config.json")
        .context("Failed to read config file")?;
    Config::from_str(&content)
        .map_err(|e| anyhow!("Config parsing error: {e}"))?;
    Ok(())
}
```

**Do NOT use `anyhow::Result` in a library.** Callers can't pattern-match on the error variant — they only have a string. Library callers need typed errors so they can handle each case.

## Use `?` to propagate

Don't write `match` chains that just propagate:

```rust
// Bad
fn handle(req: &Request) -> Result<Validated, MyError> {
    let v = match validate_headers(req) {
        Ok(v) => v,
        Err(e) => return Err(e),
    };
    let body = match Body::try_from(req) {
        Ok(b) => b,
        Err(e) => return Err(e.into()),
    };
    // ...
}

// Good
fn handle(req: &Request) -> Result<Validated, MyError> {
    validate_headers(req)?;
    let body = Body::try_from(req)?;
    Validated::try_from((req, body))
}
```

For recovery or logging, use `or_else`, `map_err`, or `inspect_err`:

```rust
result
    .inspect_err(|e| tracing::error!(error = %e, "operation_name"))
    .map_err(|e| MyError::from(("operation_name", e)))?;
```

## `unwrap` / `expect`: tests only

Outside `#[cfg(test)]`, both belong to a tiny set of cases:

- The failure is genuinely impossible (use `unreachable!()` instead).
- A `static`/`OnceLock` initializer where init failure should panic at startup (still rare; usually you want explicit init).

Replacements that don't panic:

| Original | Replacement |
|---|---|
| `let x = foo().unwrap();` (early return is OK) | `let Ok(x) = foo() else { return Err(...); };` |
| `let x = foo().expect("invariant");` (truly impossible) | `let Ok(x) = foo() else { unreachable!("invariant"); };` |
| `cfg.port.unwrap()` (sensible default exists) | `cfg.port.unwrap_or(8080)` |
| `cache.get(k).unwrap()` (in tests) | Fine. Stays in `#[cfg(test)]`. |

`expect("...")` is preferred over `unwrap()` when you do panic, because the message is a breadcrumb. Neither belongs in a hot path.

## Async errors: `Send + Sync + 'static`

Errors that cross `.await` boundaries — task spawns, `tokio::spawn`, `JoinHandle` — must be `Send + Sync + 'static`. `thiserror`-generated enums usually satisfy this if their fields do. Be careful with `Box<dyn Error>` vs `Box<dyn Error + Send + Sync>`:

```rust
#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    // ...
    Ok(())
}
```

In a library, keep concrete error types. `Box<dyn Error>` (without `Send + Sync`) won't go across threads and confuses callers.

## Test the error paths

Errors with `PartialEq`:

```rust
#[test]
fn returns_invalid_input_when_b_is_negative() {
    let err = process(setup_a(), Some(-5)).unwrap_err();
    assert_eq!(err, MyError::InvalidInput);
}
```

Errors without `PartialEq` (most `thiserror` types that wrap third-party errors):

```rust
#[test]
fn returns_division_by_zero() {
    let err = divide(10.0, 0.0).unwrap_err();
    assert_eq!(err.to_string(), "division by zero");
}
```

Stringly-typed asserts are brittle but acceptable when comparing wrapped errors. Prefer matching on the variant if the type allows: `assert!(matches!(err, MyError::DivisionByZero))`.

## When NOT to apply

- **Don't over-thiserror trivial errors.** A single `&'static str` error from a private helper doesn't need a derive.
- **Don't return `Result` for panics.** If a function genuinely cannot fail given its preconditions, returning `Result<T, Infallible>` adds noise. Document the preconditions and don't use `Result`.
- **Don't use `unwrap` in init just because "it's startup."** The user gets a stack trace instead of an actionable message. Surface the failure with a real error.

## Common failure modes

- **`anyhow::Result` leaks into a library.** Callers can't act on the error. Replace with `thiserror`. The migration is mechanical: define an enum, add `#[from]` for the wrapped errors, swap return types.
- **`Box<dyn Error>` from a library function.** Same problem. Swap to a typed error.
- **`unwrap()` in production.** Read the source-chain and replace with `?` or `let-else`.
- **`map_err(|_| ...)` everywhere.** You're throwing away the error context. Use `#[from]` or `map_err(|e| MyError::Wrap(e))`.
- **Forgetting `Send + Sync + 'static` on async errors.** Compiler errors are blunt: "the trait `Send` is not implemented for ...". Usually means a `Rc<...>` snuck in; replace with `Arc<...>`.
- **Eager allocation in error-returning helpers.** `ok_or(MyError::Msg(format!(...)))` formats on every call, including the success path. Switch to `ok_or_else(|| MyError::Msg(format!(...)))`.
