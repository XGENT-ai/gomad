---
name: pointer-types
description: Choose the right Rust pointer / smart-pointer type — `&T`, `&mut T`, `Box<T>`, `Rc<T>`, `Arc<T>`, `Cell<T>`, `RefCell<T>`, `Mutex<T>`, `RwLock<T>`, `OnceCell<T>` / `OnceLock<T>`, `LazyCell<T>` / `LazyLock<T>`, raw `*const T` / `*mut T` — and understand when each is `Send`, `Sync`, both, or neither. Use this whenever the user is debating `Rc<T>` vs `Arc<T>`, asks "why isn't `Rc` thread-safe", hits "the trait `Send` is not implemented for ..." across a `tokio::spawn`, designs a recursive enum that needs heap indirection, wants shared mutability and isn't sure between `RefCell<T>` and `Mutex<T>`, or wonders when to reach for `OnceLock<T>` / `LazyLock<T>` over `lazy_static!`. Covers: the `Send` / `Sync` rules, the role of each pointer with a one-line use case, the `Arc<Mutex<T>>` and `Arc<RwLock<T>>` patterns, the `*const T` / `*mut T` unsafe boundary, and what NOT to do (`Rc` across threads, `RefCell` borrow-mut while borrowed, `Mutex` nested without lock-ordering, raw pointers when a reference would compile).
source: https://github.com/apollographql/rust-best-practices
license: MIT
last_reviewed: 2026-05-02
---

# Pointer types and thread safety

Rust's pointer landscape is wide because the type system tracks ownership, sharing, and threading at compile time. Pick by the question being asked: who owns it, who sees mutations, and which threads touch it.

## `Send` and `Sync` — the threading axes

`Send` and `Sync` are auto-traits. The compiler tracks them, and they decide what's allowed across threads.

- **`Send`** — the value can be *moved* to another thread. (`T` itself crosses threads.)
- **`Sync`** — the value can be *referenced* from multiple threads. (`&T` is `Send`.)

A pointer is thread-safe only if the data behind it is.

| Pointer | `Send`? | `Sync`? | One-line use |
|---|---|---|---|
| `&T` | If `T: Sync` | If `T: Sync` | Shared, read-only borrow |
| `&mut T` | If `T: Send` | If `T: Sync` | Exclusive, mutable borrow |
| `Box<T>` | If `T: Send` | If `T: Sync` | Single-owner heap allocation |
| `Rc<T>` | No | No | Multiple owners, single thread |
| `Arc<T>` | If `T: Send + Sync` | If `T: Send + Sync` | Multiple owners, multiple threads |
| `Cell<T>` | If `T: Send` | No | Interior mutability for `Copy` types, single thread |
| `RefCell<T>` | If `T: Send` | No | Runtime-checked borrow rules, single thread |
| `Mutex<T>` | If `T: Send` | If `T: Send` | Mutual-exclusion mutability across threads |
| `RwLock<T>` | If `T: Send` | If `T: Send + Sync` | Many readers OR one writer, across threads |
| `OnceCell<T>` | If `T: Send` | No | One-time init, single thread |
| `LazyCell<T, F>` | Restricted | No | Lazy one-time init via closure, single thread |
| `OnceLock<T>` | If `T: Send` | If `T: Send + Sync` | One-time init, multi thread |
| `LazyLock<T, F>` | If `T: Send + Sync` | If `T: Send + Sync` | Lazy one-time init, multi thread |
| `*const T` / `*mut T` | No (auto) | No (auto) | Raw pointers; you uphold safety |

The two predictable surprises:

- **`Rc<T>` is not `Send`.** Cloning increments a non-atomic counter; doing it from two threads is a data race. The compiler will tell you when you try.
- **`RefCell<T>` is not `Sync`.** Its borrow tracking uses a non-atomic counter. Sharing across threads is a data race. Switch to `Mutex<T>` / `RwLock<T>`.

## The everyday choices

### `&T` — shared borrow

The default. Multiple readers, no mutation, no overhead.

```rust
fn print_len(s: &str) {
    println!("{}", s.len());
}
```

### `&mut T` — exclusive mutable borrow

Single writer at a time, statically checked.

```rust
fn append_marker(s: &mut String) {
    s.push_str("_done");
}
```

### `Box<T>` — heap allocation, single owner

For recursive types, large structs, and trait objects:

```rust
enum Tree<T> {
    Leaf(T),
    Branch(Box<Tree<T>>, Box<Tree<T>>),
}

let writer: Box<dyn std::io::Write> = Box::new(std::io::stdout());
```

### `Rc<T>` and `Arc<T>` — shared ownership

`Rc<T>` is single-thread; `Arc<T>` is multi-thread. Pick `Arc<T>` whenever the value might cross a thread boundary — including `tokio::spawn`. The cost: atomic ref-count vs non-atomic. The compiler enforces the choice, so it's hard to get wrong.

```rust
use std::sync::Arc;

let config = Arc::new(load_config());
let c1 = Arc::clone(&config);
tokio::spawn(async move { use_config(&c1) });
```

`Arc::clone(&x)` is preferred over `x.clone()` for clarity — readers see "this is a refcount bump, not a data copy."

### `Mutex<T>` and `RwLock<T>` — interior mutability across threads

Always wrapped in `Arc<...>` when shared:

```rust
use std::sync::{Arc, Mutex};

let counter = Arc::new(Mutex::new(0u64));
let c1 = Arc::clone(&counter);
tokio::spawn(async move {
    let mut n = c1.lock().expect("poisoned");
    *n += 1;
});
```

`RwLock<T>` allows multiple concurrent readers OR one exclusive writer. Use it when reads dominate and contention on `Mutex` shows in profiles. Both poison on panic — `lock()` returns `Result<MutexGuard, PoisonError>`.

### `Cell<T>` and `RefCell<T>` — interior mutability, single-thread

`Cell<T>` is for `Copy` types — `get()` and `set()` only, no borrowing:

```rust
use std::cell::Cell;

struct Node {
    visit_count: Cell<u32>,
}

let n = Node { visit_count: Cell::new(0) };
n.visit_count.set(n.visit_count.get() + 1);
```

`RefCell<T>` works for any type, with runtime-checked borrows that **panic** if violated:

```rust
use std::cell::RefCell;

let rc = RefCell::new(vec![1, 2, 3]);
rc.borrow_mut().push(4); // mutable borrow

let view = rc.borrow();
let _ = rc.borrow_mut(); // PANICS at runtime — already borrowed
drop(view);
let _ = rc.borrow_mut(); // OK now
```

Reach for `RefCell<T>` when the borrow checker can't prove a pattern statically (often in graph-like code) and you're willing to accept runtime checks.

### `OnceCell<T>` / `OnceLock<T>` / `LazyCell<T>` / `LazyLock<T>`

For "compute exactly once":

```rust
use std::sync::OnceLock;

static CONFIG: OnceLock<Config> = OnceLock::new();

fn config() -> &'static Config {
    CONFIG.get_or_init(load_config_from_disk)
}
```

```rust
use std::sync::LazyLock;
use std::collections::HashMap;

static TABLE: LazyLock<HashMap<&'static str, u32>> = LazyLock::new(|| {
    let mut m = HashMap::new();
    m.insert("a", 1);
    m.insert("b", 2);
    m
});

fn lookup(k: &str) -> Option<u32> {
    TABLE.get(k).copied()
}
```

The four-way matrix:

| | Single-thread | Multi-thread |
|---|---|---|
| `set()` once, then `get()` | `OnceCell<T>` | `OnceLock<T>` |
| Closure-driven init | `LazyCell<T, F>` | `LazyLock<T, F>` |

Prefer `OnceLock<T>` / `LazyLock<T>` (stdlib) over the older `lazy_static!` macro for new code.

### `*const T` / `*mut T` — raw pointers

For FFI and unsafe contexts only. They don't carry lifetime or borrow information; you uphold the safety yourself.

```rust
let x = 5;
let p = &x as *const i32;
unsafe {
    println!("PTR is {}", *p);
}
```

If a `&T` or `&mut T` would compile, use that instead. Reach for raw pointers only when you're crossing an FFI boundary or implementing a data structure that the borrow checker can't accept.

## Patterns

```rust
// Many threads, shared mutable state, write-heavy
Arc<Mutex<T>>

// Many threads, shared mutable state, read-heavy
Arc<RwLock<T>>

// Many threads, immutable shared state
Arc<T>

// Many threads, shared lazy-init constant
LazyLock<T>

// One thread, shared mutable state with unusual graph topology
Rc<RefCell<T>>

// Single owner, heap allocation
Box<T>
```

`Arc<Mutex<T>>` clones cheap — the wrapper points to a single allocation containing both the lock and the data.

## When NOT to apply

- Don't reach for `RefCell<T>` to "make the borrow checker happy" without understanding the runtime-panic cost.
- Don't wrap everything in `Arc<Mutex<T>>` "just in case." Each lock is contention; profile shows it.
- Don't use raw pointers when a reference compiles. The borrow checker is doing useful work.
- Don't `Mutex::lock()` and hold the guard across an `.await`. Tokio's runtime can park the task while it holds the lock — use `tokio::sync::Mutex<T>` for async-aware locking.
- Don't use `Rc<T>` and discover at deploy time you needed `Arc<T>`. The compiler usually catches this; when it doesn't (single-threaded apps that grow a thread later), the migration is mechanical but tedious.

## Common failure modes

- **"`Rc` is not `Send`"** when a closure captures an `Rc<T>` and `tokio::spawn` is called. Switch to `Arc<T>`.
- **`RefCell` panic at runtime.** Two `borrow_mut`s held at once, or `borrow` held while `borrow_mut` requested. Reduce the borrow scope (drop the guard early) or restructure to avoid the overlap.
- **Poisoned `Mutex` on every call.** A previous thread panicked while holding the lock. The data may still be valid; `match guard { Ok(g) | Err(g) => ... }` recovers, but you must reason about whether it's safe.
- **Deadlock from nested `Mutex` locks.** Two locks acquired in opposite orders on different threads. Pick a global lock-ordering, or replace with a single `RwLock` / `Mutex` covering both fields.
- **`OnceLock` initializer panic.** First-access thread panics; later threads see a poisoned cell. The fix: make `get_or_init` infallible, or use `get_or_try_init` and handle the error explicitly.
- **`Arc<T>` clone in a hot loop pessimizing performance.** Atomic increments are not free. Hoist the clone out of the loop, or pass `&Arc<T>`.
- **Holding a `std::sync::Mutex` across `.await`.** The lock guard is `!Send` on most platforms; the spawn fails to compile, OR it compiles and you get an actual deadlock at runtime if the guard is `Send`. Use `tokio::sync::Mutex` for async code.
