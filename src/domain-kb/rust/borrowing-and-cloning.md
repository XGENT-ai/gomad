---
name: borrowing-and-cloning
description: Choose between `&T`, `&mut T`, owned `T`, `.clone()`, and `Cow<'_, T>` in Rust.
license: MIT
last_reviewed: 2026-05-02
---

**When to use:** Reach for this article when reviewing function signatures that take `String`/`Vec<T>` by value, seeing clippy `redundant_clone` / `clone_on_copy` / `needless_borrow` warnings, diagnosing slow hot paths caused by `.clone()` in a loop or `.map()`, debating `#[derive(Copy)]` on a struct, or asking when ownership should transfer into a function.

# Borrowing, cloning, and ownership

The default in idiomatic Rust is **borrow**. Reach for `.clone()` only when you can name a reason — usually one of: API forces ownership, you need a heap-pointer share (`Arc`/`Rc`), you need a snapshot, or a builder mutates owned state. Every other clone is a smell to clippy.

## Decide what to pass

| Situation | Pass as | Why |
|---|---|---|
| Read-only, callee doesn't store it | `&T` (or `&str`, `&[T]`) | Cheapest. No allocation, no move. |
| Callee mutates in place, no aliasing | `&mut T` | Exclusive access, still no copy. |
| Type implements `Copy` and is small (≤24 bytes) | `T` by value | Cheaper than indirection. |
| Callee must store the value past its scope | `T` (owned) | Make ownership explicit at the call site. |
| Caller may have either owned or borrowed | `Cow<'_, T>` | Avoids forcing the caller to allocate. |
| Shared, multi-reader heap allocation | `Arc<T>` (or `Rc<T>` single-thread) | Cheap clones — ref-count bump, not data copy. |

Function-parameter rules of thumb:

- Prefer `&str` over `&String`. `&String` forces the caller to have a `String`; `&str` accepts everything that derefs to one.
- Prefer `&[T]` over `&Vec<T>` for the same reason.
- If you wrote `fn f(x: &T) { let y = x.clone(); ... }` and you're going to mutate `y`, change the signature to `fn f(x: T)` and let the caller decide.

## When `.clone()` is the right answer

State the reason out loud before writing it. Acceptable reasons:

- **`Arc<T>` / `Rc<T>` clone.** This bumps a ref-count; it does not copy the underlying `T`. Cheap and idiomatic.
- **Snapshot for a diff or comparison.** You need the value as it was, plus the value as it is now.
- **Builder that requires owned mutation.** Some builders are `fn with_x(self, x: X) -> Self`; if you can't change the API, clone at the boundary.
- **Cache that returns `T`.** `fn get_config(&self) -> Config { self.cached.clone() }` is fine when the cache must outlive the borrow.
- **API you don't control demands `T`.** Accept it; don't refactor the world.

## When `.clone()` is the wrong answer

| Smell | Replace with |
|---|---|
| `.map(|x| x.clone())` | `.cloned()` (for `&T` → `T`) or `.copied()` (for `Copy` types) |
| `.clone()` to satisfy a borrow checker error in a trivial case | Adjust the lifetime, or take `&` instead of `T` |
| Cloning a `&T` argument inside the function | Change the signature to `fn f(x: T)` so the caller decides |
| Cloning a `Vec<T>` / `HashMap<K, V>` to read it | Borrow as `&[T]` / `&HashMap<K, V>` |
| `.clone()` because clippy fires on a `Copy` type | This is `clippy::clone_on_copy` — remove the `.clone()` |
| Cloning inside a hot loop to keep ownership simple | Profile first; usually a borrow refactor is cheaper than the clones |

If clippy's `redundant_clone` fires, take it seriously. It only triggers on clones that the analysis can prove are unnecessary.

## `Copy`: when to derive it

`Copy` is opt-in for plain-data types. Implementing it changes move semantics — values are bit-copied instead of moved — which is good for tiny structs and bad for large ones (every assignment becomes a memcpy).

Derive `Copy` only when **all** are true:

- All fields are `Copy` (no `String`, `Vec<T>`, `Box<T>`, `Arc<T>`).
- The type is small. Rule of thumb: ≤ 24 bytes (3 machine words on 64-bit).
- The type represents plain data — no resources, no heap ownership, no `Drop`.

Reference sizes:

| Type | Bytes |
|---|---|
| `bool`, `i8`, `u8` | 1 |
| `i16`, `u16` | 2 |
| `i32`, `u32`, `f32`, `char` | 4 |
| `i64`, `u64`, `f64`, `usize` (64-bit) | 8 |
| `i128`, `u128` | 16 |

Good `Copy` candidate:

```rust
#[derive(Debug, Copy, Clone)]
struct Point {
    x: f32,
    y: f32,
    z: f32,
}
```

Bad — has a non-`Copy` field:

```rust
#[derive(Debug, Clone)] // intentionally NOT Copy
struct User {
    age: i32,
    name: String, // String owns a heap allocation
}
```

Enums follow the same rule, with one extra trap: **the enum's size is the size of its largest variant**. A `Copy` enum with one fat variant copies the fat width on every move.

## `Cow<'_, T>`: maybe-owned data

`Cow` (`Clone-on-Write`) is the right return / parameter type when sometimes the value is borrowed and sometimes it must be allocated:

```rust
use std::borrow::Cow;

fn normalize(input: &str) -> Cow<'_, str> {
    if input.contains(' ') {
        Cow::Owned(input.replace(' ', "_"))
    } else {
        Cow::Borrowed(input) // no allocation
    }
}
```

Use `Cow` when the borrowed case is common and avoiding allocation matters. Don't use `Cow` everywhere — it adds a layer of indirection and a discriminant. For functions that always allocate, just return `String`. For functions that always borrow, return `&str`.

## When NOT to optimize the clone away

- Non-hot code paths. A clone on application startup, or per user request once, is not worth a borrow-checker fight.
- Code clarity wins. If removing a clone requires lifetime annotations that no one on the team will understand, leave the clone and add a comment.
- Tests. Cloning fixtures is fine.

The bias to remember: clippy's `redundant_clone` is for the genuinely-pointless ones. Cloning to model intent (taking `T` to signal "I'm consuming this") is not a smell.

## Common failure modes

- **Cloning a reference argument.** `fn f(x: &T) { let y = x.clone(); ... }` — the function should take `T` (owned) instead, so the caller decides. Cloning inside hides the cost.
- **`Copy` on a stack-allocated array that's actually huge.** `[u8; 65536]` is `Copy` if `u8` is, but copying it on every move is a memcpy of 64 KiB. Box it: `Box<[u8; 65536]>`.
- **`#[derive(Copy)]` on a struct that later grows a `String` field.** The derive silently breaks. Watch for the change in code review.
- **Calling `.iter().map(|x| x.clone())` on a `Copy` type.** Use `.copied()` — clippy will tell you, but the cleaner habit is to think "do I need an owned `T` here? what kind of `T`?"
- **Calling `.clone()` on `Arc` and treating it as a deep copy.** `Arc::clone` bumps a refcount. No data is copied. This is fine — but reviewers sometimes panic on seeing `.clone()` on an `Arc` thinking it's expensive. Prefer the explicit `Arc::clone(&x)` to make intent clear.
