---
name: iterators-vs-loops
description: Choose between iterator chains and `for` loops to avoid allocations in Rust.
license: MIT
last_reviewed: 2026-05-02
---

**When to use:** Reach for this article when reviewing code that calls `.collect()` only to re-iterate, writing a manual `for` loop that builds a `Vec`, debating `.iter()` vs `.into_iter()`, seeing clippy `needless_collect` / `manual_filter_map` / `into_iter_on_ref`, asking when `.fold()` should become `.sum()`, or investigating why an iterator chain "doesn't run."

# Iterators vs `for` loops

Iterators and `for` loops compile to the same machine code in the simple cases — they're equally fast. The decision is about **shape**, not performance: which one expresses the intent more clearly and avoids accidental allocations?

## Pick the shape by intent

| Intent | Use |
|---|---|
| Transform / filter / aggregate a collection into another value | Iterator chain |
| Early-exit on a condition (`break`, `continue`, `return`) | `for` loop |
| Side effect per element (logging, IO, mutation) | `for` loop, or `.for_each` if no early exit |
| Index alongside value | `.enumerate()` |
| Window / chunk over a slice | `.windows(n)` / `.chunks(n)` |
| Sum / product / count / max / min | The dedicated method, not `.fold(...)` |

Same problem in both shapes:

```rust
// for loop: clearer when you need early exits or per-item side effects
let mut sum = 0;
for x in 0..=10 {
    if x % 2 == 0 {
        sum += x + 1;
    }
}

// iterator chain: clearer when you're composing transformations
let sum: i32 = (0..=10)
    .filter(|x| x % 2 == 0)
    .map(|x| x + 1)
    .sum();
```

Both are idiomatic. Pick the one that reads better in context.

## Iterators are lazy — and that bites

Until you call a *consumer* (`.collect()`, `.sum()`, `.for_each()`, `.count()`, `.next()`, `for x in ...`), the chain does nothing. This is the source of two common bugs:

- "My `.map(|x| do_side_effect(x))` doesn't run." It won't, until you consume. Use a `for` loop, or `.for_each(...)`.
- "Why did `iter.find(...).unwrap()` consume my `iter`?" `.find` is a consumer — it advances the iterator until it finds a match.

Use `.for_each` only when the closure has no early exit. If the body needs `break` / `continue` / `return`, write a `for` loop.

## `.iter()` vs `.iter_mut()` vs `.into_iter()`

| Method | Yields | Use when |
|---|---|---|
| `.iter()` | `&T` | Read-only access, you want to keep the collection. |
| `.iter_mut()` | `&mut T` | Mutate elements in place. |
| `.into_iter()` | `T` | You're done with the collection and want owned values. |

Two specific traps:

- **`.into_iter()` on a `Vec<T>` where `T: Copy`.** Use `.iter().copied()` if you don't need the `Vec` consumed; clippy's `into_iter_on_ref` and similar lints flag misuse.
- **`.into_iter()` then `.collect::<Vec<_>>()` — same vec back.** The compiler is good but the intent is muddy. Use `.iter().cloned().collect()` or rethink the pipeline.

## Avoid intermediate `.collect()`

Every `.collect()` allocates. If the next thing you do with the `Vec` is iterate it again, drop the `.collect()` and pass the iterator:

```rust
// Bad: allocates a Vec just to consume it
let doubled: Vec<_> = items.iter().map(|x| x * 2).collect();
process(doubled);

// Good: process takes an iterator
fn process(it: impl Iterator<Item = i32>) { /* ... */ }
process(items.iter().map(|x| x * 2));
```

Cases where a `.collect()` is genuine:

- The consumer is called multiple times.
- You need to know the length before iterating (`Vec::len()` is `O(1)`).
- You need random access (`vec[i]`).
- You need to sort (`.sort()` requires owned and slices, not iterators).
- A trait bound demands a `Vec<T>` / `&[T]` / `HashMap<K, V>`.

clippy's `needless_collect` is the canonical detector.

## `.fold` vs the dedicated specializations

`.fold(0, |acc, x| acc + x)` works, but the compiler treats the closure as a black box. Specializations (`.sum()`, `.product()`, `.count()`, `.min()`, `.max()`) carry intent the optimizer can use:

```rust
// Bad
let total: i32 = nums.iter().fold(0, |acc, x| acc + x);

// Good
let total: i32 = nums.iter().sum();

// Need a starting offset?
let total: i32 = nums.iter().sum::<i32>() + 100;
```

Reach for `.fold` only when the accumulator state is genuinely custom (a struct, a stateful flag, etc.).

## Combining iterators with `for`

You can iterate a chain with a regular `for` loop — useful when the body needs early-exit or side effects but the upstream filtering reads better as iterator methods:

```rust
for (i, v) in vec.iter().enumerate().filter(|(_, v)| **v != 0) {
    if *v > threshold {
        return Some(i); // early exit — keeps the for loop
    }
    log_processed(i, v); // side effect — keeps the for loop
}
```

This is the best of both: declarative filter, imperative body.

## When NOT to chain

- The chain crosses 4–5 lines and a future reader has to mentally evaluate each step. Break it into a `for` loop or extract a helper.
- The closure inside `.map()` mutates external state. That's a `for` loop.
- You're inside a tight performance loop and the chain triggers an allocation per iteration. Profile, then rewrite.
- The compiler's error message points at a closure type — the chain is too clever for the moment.

## Common failure modes

- **Calling `.iter()` on a temporary.** `format!("...").chars().iter().collect::<Vec<_>>()` — the temporary `String` drops at end of statement and you get a borrow-checker error. Bind it first.
- **Forgetting to `.collect::<Vec<_>>()`.** `let v = items.iter().map(...);` is an iterator type, not a `Vec`. The error is usually clear, but the fix is sometimes "do you actually need a `Vec`?"
- **`into_iter` on an `Option`.** `Some(x).into_iter()` is sometimes legitimate (one-element iterator) but often a sign you want `if let Some(x) = ...`.
- **Allocating in a hot loop because of `.cloned()`.** If `T: Copy`, use `.copied()` — same value, no clippy warning, no Clone-trait pessimization.
- **Manually counting with `.fold(0, |n, _| n + 1)`.** That's `.count()`.
- **Manually finding the first `Some`.** That's `.find_map(|x| ...)`.
