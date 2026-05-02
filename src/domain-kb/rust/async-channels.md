---
name: async-channels
description: Choose and use Tokio async channels — mpsc, broadcast, oneshot, watch — for task communication.
license: MIT
last_reviewed: 2026-05-02
---

**When to use:** Reach for this article when deciding which Tokio channel type fits a communication pattern, implementing a worker-pool with backpressure, distributing events to multiple consumers, returning a single value across a task boundary, or broadcasting a config/state change to multiple subscribers.

# Async channels

Pick by the number of producers and consumers, and whether every consumer needs every message.

| Channel | Producers | Consumers | Each consumer gets every message? | Use case |
|---|---|---|---|---|
| `mpsc` | Many | One | — | Work queue, event funnel |
| `broadcast` | Many | Many | Yes (if subscribed before send) | Event bus, pub/sub |
| `oneshot` | One | One | — | Single response across a task boundary |
| `watch` | One | Many | Only the latest value | Config/state propagation |

## `mpsc` — work queue

```rust
use tokio::sync::mpsc;

async fn run() {
    let (tx, mut rx) = mpsc::channel::<String>(100); // bound = backpressure buffer

    let tx2 = tx.clone();
    tokio::spawn(async move {
        tx2.send("hello".into()).await.unwrap();
    });

    while let Some(msg) = rx.recv().await {
        println!("got: {msg}");
    }
    // rx.recv() returns None when all senders are dropped
}
```

The channel buffer size is the backpressure knob. `send().await` blocks when the buffer is full, slowing producers automatically. Use `try_send` if you want to detect back-pressure without blocking.

## `broadcast` — event bus

```rust
use tokio::sync::broadcast;

async fn run() {
    let (tx, _) = broadcast::channel::<String>(100);

    let mut rx1 = tx.subscribe();
    let mut rx2 = tx.subscribe();

    tx.send("event".into()).unwrap();

    // Both receivers get the same message
    println!("{}", rx1.recv().await.unwrap());
    println!("{}", rx2.recv().await.unwrap());
}
```

Subscribers that fall too far behind receive `RecvError::Lagged(n)` — `n` messages were dropped. Handle it or the subscriber becomes stale silently.

## `oneshot` — single response

```rust
use tokio::sync::oneshot;

async fn run() -> String {
    let (tx, rx) = oneshot::channel::<String>();

    tokio::spawn(async move {
        let result = compute().await;
        let _ = tx.send(result); // ignore if receiver dropped
    });

    rx.await.unwrap_or_default()
}
```

`oneshot` is the cleanest way to get a value back from a spawned task without `JoinHandle`. Use `JoinHandle` instead when you already have the task handle — `oneshot` adds indirection for no gain there.

## `watch` — latest-value propagation

```rust
use tokio::sync::watch;

async fn run() {
    let (tx, mut rx) = watch::channel("initial".to_string());

    tokio::spawn(async move {
        loop {
            rx.changed().await.unwrap();
            println!("new config: {}", rx.borrow().clone());
        }
    });

    tx.send("updated".into()).unwrap();
}
```

`watch` keeps only the latest value. Subscribers that are slow miss intermediate values — this is intentional. Reach for `broadcast` when every intermediate value matters.

## Channel vs shared state

Channels are not always the right answer:

| Situation | Prefer |
|---|---|
| One task updates state, many tasks read it | `watch` or `Arc<RwLock<T>>` |
| Multiple tasks mutate the same data structure | `Arc<Mutex<T>>` |
| Tasks produce items for a single consumer to process in order | `mpsc` |
| Multiple consumers each need every event | `broadcast` |
| Single request-response across a task boundary | `oneshot` |

Don't route all state through channels just because channels feel "more async." Shared state with the right lock is often cleaner and faster for read-heavy access.

## When NOT to apply

- Don't use `broadcast` when only one consumer will ever exist — `mpsc` is sufficient and has no lagging risk.
- Don't use `watch` when the consumer must not miss any intermediate value — use `broadcast` or `mpsc`.
- Don't size `mpsc` channels with buffer=0; Tokio's `mpsc` requires a positive bound. Use `tokio::sync::mpsc::unbounded_channel` only when the producer is naturally bounded by other means — an unbounded channel is an uncapped memory leak under load.
- Don't hold a `watch::Ref` across an `.await` — the ref holds a read lock on the internal `RwLock`.

## Common failure modes

- **`broadcast::RecvError::Lagged`** ignored. A slow subscriber skips messages and never notices. Log or handle the lag error explicitly.
- **All `mpsc` senders dropped without the consumer noticing.** `rx.recv()` returns `None`. This is the normal teardown signal — handle `None` and exit the loop rather than panicking.
- **`oneshot` sender dropped before sending.** `rx.await` returns `Err(RecvError)`. This usually means the spawned task panicked. Check the task result before relying on `oneshot`.
- **`watch` subscriber sees stale value.** Calling `rx.borrow()` without checking `rx.changed()` first gives the last value, which may predate the change you care about. Always `await changed()` before borrowing in a polling loop.
- **Deadlock from synchronous `blocking_send` inside `async` context.** Never call `std::sync::mpsc` or `.blocking_send()` from within a Tokio task — park the executor thread and stall. Use `send().await` or `try_send`.
