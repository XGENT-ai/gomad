---
name: async-tasks
description: Manage concurrent Tokio tasks with JoinSet, select!, buffer_unordered, and graceful shutdown.
license: MIT
last_reviewed: 2026-05-02
---

**When to use:** Reach for this article when spawning multiple async tasks and needing to collect results, racing futures with a timeout, capping concurrency over a large input set, implementing graceful shutdown with `CancellationToken`, or limiting resource acquisition with `Semaphore`.

# Async tasks and concurrency control

The right primitive depends on whether you need all results, the first result, or a limited-concurrency pipeline.

| Goal | Use |
|---|---|
| Spawn N tasks, collect all results | `JoinSet` |
| Race M futures, take the first winner | `tokio::select!` |
| Process a large collection with a concurrency cap | `StreamExt::buffer_unordered` |
| Cancel a group of tasks cleanly | `CancellationToken` |
| Limit resource acquisition (connections, permits) | `Semaphore` |

## `JoinSet` — spawn and collect

```rust
use tokio::task::JoinSet;
use anyhow::Result;

async fn fetch_all(urls: Vec<String>) -> Vec<String> {
    let mut set = JoinSet::new();

    for url in urls {
        set.spawn(async move { fetch(&url).await });
    }

    let mut results = Vec::new();
    while let Some(res) = set.join_next().await {
        match res {
            Ok(Ok(data)) => results.push(data),
            Ok(Err(e)) => tracing::error!("task failed: {e}"),
            Err(e) => tracing::error!("join error: {e}"),   // task panicked
        }
    }
    results
}
```

`JoinSet::join_next` returns `None` when all tasks complete. Tasks that panic return `Err(JoinError)` — handle it or the panic is silently swallowed.

## `tokio::select!` — racing and timeouts

```rust
use tokio::{select, time::{timeout, Duration}};

// Race two futures; take whichever completes first
async fn race(url1: &str, url2: &str) -> Result<String> {
    select! {
        r = fetch(url1) => r,
        r = fetch(url2) => r,
    }
}

// Timeout a single future
async fn with_timeout(url: &str) -> Result<String> {
    timeout(Duration::from_secs(5), fetch(url))
        .await
        .map_err(|_| anyhow::anyhow!("timed out after 5s"))?
}
```

`select!` cancels all non-winning branches. If a branch does non-idempotent work (writes, sends), guard it carefully — cancellation can leave it partially executed.

## `buffer_unordered` — concurrency-limited pipeline

When the input is large, spawning one task per item exhausts resources. Cap with `buffer_unordered`:

```rust
use futures::stream::{self, StreamExt};

async fn fetch_with_limit(urls: Vec<String>, limit: usize) -> Vec<Result<String>> {
    stream::iter(urls)
        .map(|url| async move { fetch(&url).await })
        .buffer_unordered(limit)
        .collect()
        .await
}
```

`buffer_unordered(n)` keeps at most `n` futures in flight simultaneously. Results arrive in completion order (not input order) — use `buffered(n)` to preserve input order at the cost of head-of-line blocking.

## `CancellationToken` — graceful shutdown

```rust
use tokio_util::sync::CancellationToken;
use tokio::signal;

async fn run() -> anyhow::Result<()> {
    let token = CancellationToken::new();

    let worker_token = token.clone();
    tokio::spawn(async move {
        loop {
            tokio::select! {
                _ = worker_token.cancelled() => break,
                _ = do_work() => {}
            }
        }
        tracing::info!("worker shut down");
    });

    signal::ctrl_c().await?;
    token.cancel();
    tokio::time::sleep(Duration::from_secs(5)).await; // drain window
    Ok(())
}
```

Clone `CancellationToken` freely — all clones share the same cancellation state. Prefer `CancellationToken` over a broadcast channel for shutdown; it handles late subscribers automatically.

## `Semaphore` — resource limiting

Use a `Semaphore` when you need to cap concurrent resource acquisition (DB connections, open files, outbound HTTP):

```rust
use std::sync::Arc;
use tokio::sync::Semaphore;

async fn bounded_fetch(urls: Vec<String>, max_concurrent: usize) -> Vec<String> {
    let sem = Arc::new(Semaphore::new(max_concurrent));
    let mut set = JoinSet::new();

    for url in urls {
        let permit = Arc::clone(&sem).acquire_owned().await.unwrap();
        set.spawn(async move {
            let result = fetch(&url).await.unwrap_or_default();
            drop(permit); // released when task completes
            result
        });
    }

    let mut out = Vec::new();
    while let Some(Ok(r)) = set.join_next().await {
        out.push(r);
    }
    out
}
```

`acquire_owned()` returns a `OwnedSemaphorePermit` that releases on `drop`. Avoid `acquire()` across task boundaries — lifetime ties the permit to the calling scope.

## When NOT to apply

- Don't `tokio::spawn` inside a hot loop without a concurrency cap — you'll exhaust threads and memory.
- Don't use `select!` when you need *all* branches to complete; use `join!` or `JoinSet` instead.
- Don't hold a `Semaphore` permit across a long `await` that could fail; a dropped future leaks the permit only if you use `acquire_owned()` — confirm the `Drop` impl is correct.
- Don't add a `CancellationToken` to code that has no cleanup to do — direct task `abort()` is simpler if you don't need graceful drain.

## Common failure modes

- **Swallowed panics.** `set.join_next().await` returns `Err(JoinError)` for a panicked task. Ignore the `Err` and the panic disappears silently. Always match both arms.
- **`select!` cancellation surprise.** The non-winning branch's future is dropped mid-execution. If it held a lock or sent a partial write, state is corrupt. Use `biased;` or restructure to make branches cancel-safe.
- **`buffer_unordered` ordering.** Results arrive out of input order. If downstream code assumes index alignment, switch to `buffered`.
- **`Semaphore::acquire` across `.await` without `acquire_owned`.** The permit's lifetime is scoped to the block, not the task; the compiler may reject it or you'll see spurious releases.
- **Shutdown window too short.** Tasks that need to flush buffers or commit DB transactions need a realistic drain window. Hard-coding 5 s is a placeholder — measure the P99 of your tasks.
