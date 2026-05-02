---
name: performance-profiling
description: Profile and optimize Rust code with flamegraph, benchmarks, and perf-clippy.
license: MIT
last_reviewed: 2026-05-02
---

**When to use:** Reach for this article when Rust code is reported slow or slower than another language (often a missing `--release`), deciding where to start profiling, debating `#[inline]` on a function, hitting a stack overflow from a large local array, or asking whether an iterator chain is truly zero-cost.

# Performance: profile, then optimize

Rule one of Rust performance: **don't guess, measure.** Rule two: most "Rust is slow" complaints are a missing `--release` flag. Build the right way, run a profiler, then change code.

## The release reflex

```bash
cargo build --release
cargo run --release
cargo bench   # always optimized, no flag needed
```

A debug build is 10–100× slower for compute-heavy code. If someone says their Rust is slower than their Go / Python / TypeScript, ask first whether they ran `--release`. The discussion ends there 90% of the time.

## Cheap wins before profiling

```bash
cargo clippy --all-targets --all-features -- -D clippy::perf
```

The `clippy::perf` group catches the structural-perf footguns — redundant clones, `Vec` collections that can be slices, `format!` where `to_string` would do, `into_iter` on a `Copy` collection. Clear these before bringing out a profiler.

## Profiling: pick one tool

| Tool | OS | When to use |
|---|---|---|
| `cargo flamegraph` (Linux) | Linux | The default for CPU profiling. Visualizes call stacks. |
| `samply` | macOS / Linux / Windows | Better DX on macOS than `cargo flamegraph`; produces an interactive flamegraph. |
| `criterion` (`cargo bench` with the criterion crate) | All | Statistical micro-benchmarks. Detects regressions across runs. |
| Built-in `cargo bench` | All | Single-run micro-bench; good enough for "did this get faster?" |

Install and run flamegraph:

```bash
cargo install flamegraph

# Profile cargo run --release (default)
cargo flamegraph

# A specific binary
cargo flamegraph --bin=stress2

# A unit test
cargo flamegraph --unit-test -- mymod::test_name

# A benchmark
cargo flamegraph --bench=some_bench --features some_feature -- --bench
```

Always profile with `--release`. The `--dev` flag exists but it produces flamegraphs that don't reflect production behavior — too much time in unoptimized stdlib.

Reading a flamegraph:

- Y-axis is stack depth. `main` near the bottom, deepest leaves at top.
- X-axis is CPU time spent in that function (its own + callees). **Wider = more time.**
- Box colors are random — meaningless.

Look for wide bars at the leaves. That's where the time goes. Fix the widest first.

Run `cargo bench` (or criterion) on your candidate fix. If improvement < ~5%, it's noise. > 5%, ship.

## Stack vs heap rules

Rust types live wherever the type system says they live. The decisions you make:

| Type | Default home | Override with |
|---|---|---|
| Primitives, `Copy` types | Stack | Box only if the struct embedding them is itself heap-allocated. |
| `Vec<T>`, `String`, `HashMap<K,V>` | Stack header + heap data | Already heap. |
| Recursive enums (`enum Tree { Node(T, Box<Tree>) }`) | Heap (forced by recursion) | `Box`, `Rc`, `Arc`. |
| Large arrays (`[u8; 65536]`) | Stack — risk of overflow | `Box<[u8; N]>` or `Box<[u8]>` from `vec![0; N].into_boxed_slice()`. |
| Trait objects | Heap (`Box<dyn Trait>`) | Or stack with generics, for monomorphized dispatch. |

Two recurring traps:

- **`let buffer = Box::new([0u8; 65536])`** allocates the array on the *stack* first, then copies it into the box — risk of stack overflow on the way. For runtime sizes, prefer `vec![0; 65536].into_boxed_slice()`.
- **Owned types in a recursive `enum` or `struct`.** The compiler errors with "recursive type has infinite size." Wrap in `Box<T>` (or `Rc<T>` / `Arc<T>` if shared).

Return rules:

- Small `Copy` types — return by value. `struct Point { x: f32, y: f32 }` is fine to return.
- Large structs (>~512 bytes) — take/return by reference, or place into a caller-allocated buffer.
- Don't pre-allocate just to avoid moves. The Rust compiler is good at NRVO-style return-value copy elision.

## `smallvec` for "small most of the time, occasionally large"

If a `Vec<T>` is almost always small (≤ 8 items), the per-instance heap allocation hurts. The `smallvec` crate gives you an inline-array fallback that promotes to the heap if it grows:

```rust
use smallvec::SmallVec;
let mut buf: SmallVec<[u8; 64]> = SmallVec::new();
buf.extend_from_slice(b"small");
// Inline storage; no heap allocation.
```

Use it when profiling shows the allocation is a hotspot. Don't reach for it preemptively — `Vec` is fine for most cases.

## `#[inline]`: don't sprinkle

The compiler already inlines aggressively in `--release`. Adding `#[inline]` is a hint, not a guarantee, and adds compile-time cost. Add it only when:

- A benchmark shows a measurable improvement.
- The function is in a small, hot call site (typically a tiny accessor).
- You're crossing a crate boundary and the function should be inlinable in the consumer's crate. Use `#[inline]` (default) or `#[inline(always)]` only if you've benchmarked.

Adding `#[inline(always)]` to large functions usually hurts — it bloats the call site and pushes other code out of the i-cache.

## Iterators stay zero-cost — usually

Iterator chains compile to the same loops as the equivalent `for` loop. The cost shows up when:

- You call `.collect()` and don't actually need a collection.
- You build a chain whose compiler-erased type is so deep that the optimizer gives up. Rare, but visible in flamegraphs as opaque closure calls.
- You use `.fold(...)` instead of `.sum()` / `.count()` / `.max()` and the compiler can't recognize the intent.

If a chain is showing in a flamegraph, the fix is usually a structural change — drop a `.collect()`, switch from `into_iter` to `iter`, replace `.fold` with the specialization.

## When NOT to optimize

- Cold-path code. Startup, error formatting, config loading. Wasted effort.
- Code that's about to be rewritten. Profile after the rewrite.
- Without a benchmark. "Should be faster" is vibes.
- To win an argument. Show the flamegraph and the benchmark numbers.

## Common failure modes

- **Profiling a debug build.** Flamegraph is full of stdlib noise; conclusions are wrong. Use `--release`.
- **Stack overflow from a large local array.** `[u8; 1 << 20]` on the stack is the classic. Box it.
- **`#[inline(always)]` everywhere.** Compile times balloon, binary grows, no perf win. Remove until benchmarks justify each one.
- **Cloning to "fix" a borrow checker error in a hot loop.** Profile shows clones at the top. Refactor for borrow, not clone.
- **Forgetting `--release` for `cargo run` while declaring "Rust is slow."** Always check.
- **Optimizing without a benchmark, then declaring victory.** Benchmark before and after; commit both numbers in the PR description.
