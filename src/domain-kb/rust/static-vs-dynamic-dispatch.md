---
name: static-vs-dynamic-dispatch
description: Choose between generics with `impl Trait` / `<T: Trait>` (static dispatch, monomorphized at compile time) and trait objects with `Box<dyn Trait>` / `&dyn Trait` / `Arc<dyn Trait>` (dynamic dispatch, vtable at runtime) in Rust. Use this whenever the user is debating `fn process<T: Handler>(h: T)` vs `fn process(h: Box<dyn Handler>)`, asks if `dyn Trait` is "slow," wants to store heterogeneous types in a `Vec`, hits "the trait `Foo` cannot be made into an object" (object-safety error), wonders about `&dyn Trait` vs `Box<dyn Trait>`, or asks where to box at API boundaries vs internally. Covers: when generics win (perf-critical, single-implementation, known-at-compile-time), when `dyn Trait` is required (heterogeneous collections, plugin architectures, runtime-chosen impls), the object-safety rules (`no Self: Sized`, no generic methods, only `&self` / `&mut self` / `self`), the trade-off table, and what NOT to do (boxing internally without need, premature `dyn Trait` in struct fields).
source: https://github.com/apollographql/rust-best-practices
license: MIT
last_reviewed: 2026-05-02
---

# Static vs dynamic dispatch

> Static where you can, dynamic where you must.

Rust offers two ways to write polymorphic code. The default — generics — produces specialized machine code per usage and is faster. Trait objects (`dyn Trait`) trade a vtable indirection for the ability to mix concrete types at runtime. Pick by what you actually need.

## Trade-off summary

| | Static (`impl Trait`, `<T: Trait>`) | Dynamic (`dyn Trait`) |
|---|---|---|
| Performance | Inlined, no indirection | Vtable call per method |
| Compile time | Slower (one codegen per type) | Faster (one shared vtable) |
| Binary size | Larger (per-type code) | Smaller |
| Mixed types in one collection | No | Yes |
| Trait method receivers | Any | Must be object-safe |
| Errors | Cleaner; types named in messages | Erased types; harder to diagnose |
| Use in trait return types | Yes (`-> impl Trait`) | Yes (`-> Box<dyn Trait>`) |

The decision rule:

- Do you control all the call sites and want it fast? **Generics.**
- Do you need a `Vec<Box<dyn ...>>` of plugins / handlers / filters? **Dynamic dispatch.**
- Are you exposing an API where the concrete type would leak implementation? **Dynamic dispatch at the boundary, generics inside.**
- Unsure? Start with generics. Switch to `dyn` when flexibility becomes load-bearing.

## Static dispatch — the default

The two equivalent forms:

```rust
// Explicit type parameters
fn specialized_sum<T: MyTrait, I: Iterator<Item = T>>(iter: I) -> T {
    iter.map(|x| x.transform()).sum()
}

// `impl Trait` shorthand — preferred when you don't need a name
fn specialized_sum<T: MyTrait>(iter: impl Iterator<Item = T>) -> T {
    iter.map(|x| x.transform()).sum()
}
```

The compiler emits a separate copy for each `T`/`I` combination at every call site (monomorphization). Inlining and dead-code elimination kick in inside each copy. This is why iterator chains compile to the same machine code as hand-written loops.

When generics shine:

- Tight loops where every method call must inline.
- Single-implementation paths where you control both sides.
- Compile-time-known types.
- Trait methods that return `Self` (which can't go behind a vtable).

## Dynamic dispatch — when you need the runtime flexibility

```rust
trait Animal {
    fn greet(&self) -> String;
}

struct Dog;
impl Animal for Dog {
    fn greet(&self) -> String { "woof".into() }
}

struct Cat;
impl Animal for Cat {
    fn greet(&self) -> String { "meow".into() }
}

fn all_animals_greeting(animals: Vec<Box<dyn Animal>>) {
    for animal in animals {
        println!("{}", animal.greet());
    }
}
```

`Vec<Box<dyn Animal>>` can hold a `Dog` and a `Cat` together. With generics, you'd need a separate `Vec<Dog>` and `Vec<Cat>`.

When `dyn Trait` is the right answer:

- Heterogeneous collections.
- Plugin / hot-swappable component architectures.
- Library APIs that hide internals — caller gets `Box<dyn Trait>`, internals are concrete.
- Trait return positions where `impl Trait` would force a single concrete type and you genuinely need polymorphism.

## Pointer choices for `dyn Trait`

| Pointer | Use |
|---|---|
| `&dyn Trait` | Borrow only. No ownership, no allocation. Default if you don't need to keep the value. |
| `&mut dyn Trait` | Borrow with mutation. Same trade-off, exclusive access. |
| `Box<dyn Trait>` | Own a single instance, drop with the box. |
| `Rc<dyn Trait>` | Shared ownership, single-threaded. |
| `Arc<dyn Trait>` | Shared ownership, multi-threaded. |

The bias: prefer `&dyn Trait` over `Box<dyn Trait>` whenever the function doesn't need to store the value past its scope. Allocating a `Box` just to call one method is wasteful.

## Object safety

You can only build a `dyn Trait` from an object-safe trait. The rules:

- No methods that return `Self`.
- No methods with generic type parameters.
- No methods that require `Self: Sized`.
- All methods take `&self`, `&mut self`, or `self`.

```rust
// Object safe
trait Runnable {
    fn run(&self);
    fn name(&self) -> &str;
}

// NOT object safe — generic method
trait Factory {
    fn create<T>(&self) -> T;
}

// NOT object safe — returns Self
trait Cloneable {
    fn clone_me(&self) -> Self;
}
```

Compiler error: `the trait Factory cannot be made into an object`. Two ways to fix:

1. Change the trait — move the generic method to a separate, sealed trait, or remove it.
2. Don't use `dyn` — switch the consuming code to generics.

## Where to box: at the boundary, not internally

```rust
// Good: generic internally, public API hides the concrete type
struct Renderer<B: Backend> {
    backend: B,
}

impl<B: Backend> Renderer<B> {
    pub fn new_default() -> Renderer<DefaultBackend> { /* ... */ }
}

// Bad: premature boxing inside the struct
struct Renderer {
    backend: Box<dyn Backend>, // every method call goes through the vtable
}
```

If the `Backend` is chosen at compile time, generics give you zero overhead. Only force `dyn` when the choice is genuinely runtime-dependent (config, plugin discovery).

For trait return types, the equivalents:

```rust
// Static: caller knows the concrete iterator type from the impl
fn evens() -> impl Iterator<Item = i32> {
    (0..).step_by(2)
}

// Dynamic: type erased, the caller can only see Iterator<Item = i32>
fn dynamic_evens() -> Box<dyn Iterator<Item = i32>> {
    Box::new((0..).step_by(2))
}
```

`impl Trait` in return position is almost always what you want. Reach for `Box<dyn Trait>` only when the function returns *different* iterator types depending on input — e.g. one branch returns a `.filter` chain, another returns a `.map` chain.

## When NOT to apply

- Don't reach for `dyn Trait` "to keep things simple." Generics with `impl Trait` parameters are usually equally simple syntactically, and faster.
- Don't expose `dyn Trait` in a hot inner loop.
- Don't try to make a trait object-safe by adding `where Self: Sized` to non-conforming methods unless you also understand that those methods become uncallable through the trait object.

## Common failure modes

- **`Box<dyn Trait>` in a struct field that's set once at construction.** Generics work fine and are faster. The `dyn` is overkill.
- **`Arc<dyn Trait>` shared across threads, but the trait is `!Send` or `!Sync`.** Compiler error. Add `+ Send + Sync` to the trait object: `Arc<dyn Trait + Send + Sync>`.
- **Object-safety violation deep in a refactor.** Adding a generic method to an existing trait silently breaks every `dyn Trait` user. Land it as its own commit.
- **Trying to `clone()` a `Box<dyn Trait>`.** `Clone` returns `Self`, so it can't be on a trait object. Use `dyn-clone` crate or model the clone outside the trait.
- **`-> impl Iterator` from a function that returns different iterator types in different branches.** Compiler rejects. Either unify with `.chain` / `.flat_map`, or return `Box<dyn Iterator<Item = T>>`.
