---
name: async-traits
description: Define and implement async trait methods in Rust using native RPITIT or the `async-trait` crate.
license: MIT
last_reviewed: 2026-05-02
---

**When to use:** Reach for this article when writing a trait with `async fn` methods, deciding between native async traits (Rust 1.75+) and the `async-trait` crate, hitting "`async fn` in traits are not object safe" compiler errors, or needing `dyn Trait` with async methods.

# Async traits

Rust 1.75 stabilized return-position `impl Trait` in traits (RPITIT), which enables native `async fn` in traits. The `async-trait` crate is still needed when you need `dyn Trait` (trait objects) with async methods.

## Decision table

| Need | Use |
|---|---|
| Static dispatch only (generics, no `dyn`) | Native `async fn` in trait (Rust 1.75+) |
| Dynamic dispatch (`dyn Trait`, `Box<dyn Trait>`) | `async-trait` crate |
| Library that must support Rust < 1.75 | `async-trait` crate |

## Native async traits (Rust 1.75+)

```rust
trait Repository {
    async fn get(&self, id: &str) -> anyhow::Result<Entity>;
    async fn save(&self, entity: &Entity) -> anyhow::Result<()>;
}

struct PgRepository {
    pool: sqlx::PgPool,
}

impl Repository for PgRepository {
    async fn get(&self, id: &str) -> anyhow::Result<Entity> {
        sqlx::query_as!(Entity, "SELECT * FROM entities WHERE id = $1", id)
            .fetch_one(&self.pool)
            .await
            .map_err(Into::into)
    }

    async fn save(&self, entity: &Entity) -> anyhow::Result<()> {
        sqlx::query!(
            "INSERT INTO entities (id, data) VALUES ($1, $2)
             ON CONFLICT (id) DO UPDATE SET data = $2",
            entity.id, entity.data
        )
        .execute(&self.pool)
        .await?;
        Ok(())
    }
}

// Static dispatch — compiles fine
async fn process<R: Repository>(repo: &R, id: &str) -> anyhow::Result<()> {
    let entity = repo.get(id).await?;
    repo.save(&entity).await
}
```

Native async traits are **not object-safe** by default. Calling through `dyn Repository` fails to compile.

## `async-trait` for dynamic dispatch

```rust
use async_trait::async_trait;

#[async_trait]
trait Repository: Send + Sync {
    async fn get(&self, id: &str) -> anyhow::Result<Entity>;
    async fn save(&self, entity: &Entity) -> anyhow::Result<()>;
    async fn delete(&self, id: &str) -> anyhow::Result<()>;
}

struct PgRepository { pool: sqlx::PgPool }

#[async_trait]
impl Repository for PgRepository {
    async fn get(&self, id: &str) -> anyhow::Result<Entity> {
        // ...
        todo!()
    }
    async fn save(&self, entity: &Entity) -> anyhow::Result<()> { todo!() }
    async fn delete(&self, id: &str) -> anyhow::Result<()> { todo!() }
}

// Dynamic dispatch — enabled by async-trait's Box<dyn Future> desugaring
async fn process(repo: &dyn Repository, id: &str) -> anyhow::Result<()> {
    let entity = repo.get(id).await?;
    repo.save(&entity).await
}

// Store in a struct
struct Service {
    repo: Box<dyn Repository>,
}
```

`async-trait` desugars `async fn get` into `fn get(...) -> Pin<Box<dyn Future<Output = ...> + Send>>`. Each async method call allocates a `Box`. This is the cost of dynamic dispatch — acceptable in non-hot paths.

## Mixing: native trait, `dyn` wrapper

For library code where you want both ergonomic generics AND a boxed dyn version:

```rust
trait Repository {
    async fn get(&self, id: &str) -> anyhow::Result<Entity>;
}

// Blanket impl makes any &T where T: Repository usable as dyn DynRepository
#[async_trait]
trait DynRepository: Send + Sync {
    async fn get(&self, id: &str) -> anyhow::Result<Entity>;
}

#[async_trait]
impl<T: Repository + Send + Sync> DynRepository for T {
    async fn get(&self, id: &str) -> anyhow::Result<Entity> {
        Repository::get(self, id).await
    }
}
```

This pattern adds indirection — reach for it only when you genuinely need both static and dynamic dispatch for the same trait.

## `Send` bounds

Methods on `async-trait` traits default to returning `Box<dyn Future + Send>`. This is correct for multi-threaded Tokio runtimes. Use `#[async_trait(?Send)]` only for single-threaded runtimes (e.g., `tokio::main(flavor = "current_thread")`):

```rust
#[async_trait(?Send)]  // futures are NOT required to be Send
trait LocalRepository { /* ... */ }
```

Getting `Send` wrong shows up as compiler errors on `tokio::spawn` closures that capture the trait object.

## When NOT to apply

- Don't reach for `async-trait` when static dispatch suffices — it adds a heap allocation per call and makes stack traces noisier.
- Don't add `+ Send + Sync` bounds to a trait if you're targeting a `current_thread` runtime exclusively — it rules out non-Send types unnecessarily.
- Don't implement a trait with native `async fn` if you then immediately try to store it as `dyn Trait` — use `async-trait` from the start.

## Common failure modes

- **"`async fn` in trait cannot be a method of a trait object."** Native async traits (Rust 1.75+) are not object-safe. Fix: add `async-trait` to the trait.
- **"`the trait Send is not implemented for dyn Repository`"** when spawning with `async-trait`. The trait is missing `: Send + Sync` supertrait bounds. Add them and ensure all impls satisfy them.
- **Missing `#[async_trait]` on the `impl` block.** The macro must annotate both the trait definition and every `impl` block. Forgetting one gives confusing type-mismatch errors.
- **Heap allocation in a hot loop via `async-trait`.** Each awaited method allocates. If profiling shows this, switch the hot path to generic static dispatch and keep `dyn` only for the cold path (construction, DI setup).
