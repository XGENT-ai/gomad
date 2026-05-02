---
name: async-streams
description: Process async data sequences with `Stream`, `StreamExt`, and the `async-stream` crate in Rust.
license: MIT
last_reviewed: 2026-05-02
---

**When to use:** Reach for this article when processing a sequence of async events, paginating through API responses lazily, generating values over time with `yield`, applying `filter`/`map`/`chunks` to async data, or choosing between `buffer_unordered` and `buffered` for concurrent stream processing.

# Async streams

`Stream<Item = T>` is the async analogue of `Iterator<Item = T>`. Items arrive over time; the runtime polls the stream rather than pulling items synchronously.

## Creating a stream

### From an iterator or channel

```rust
use futures::stream::{self, StreamExt};

// Wrap a sync iterator as a stream
let s = stream::iter(vec![1u32, 2, 3]);

// From a channel receiver (already a stream via ReceiverStream)
use tokio_stream::wrappers::ReceiverStream;
let (tx, rx) = tokio::sync::mpsc::channel(10);
let s = ReceiverStream::new(rx);
```

### With `async-stream` for `yield`-based generators

```rust
use async_stream::stream;
use futures::Stream;
use tokio::time::{sleep, Duration};

fn tick_stream() -> impl Stream<Item = u32> {
    stream! {
        for i in 0..10 {
            sleep(Duration::from_millis(100)).await;
            yield i;
        }
    }
}
```

The `stream!` macro from `async-stream` is the cleanest way to produce a stream from async code with early returns and yields. No manual `Pin` or `poll_next` implementation needed.

## Consuming a stream

```rust
use futures::StreamExt;

async fn consume() {
    let mut s = tick_stream();

    // Iterate
    while let Some(n) = s.next().await {
        println!("{n}");
    }

    // Collect
    let items: Vec<u32> = tick_stream().collect().await;

    // Map + filter + collect
    let evens: Vec<u32> = tick_stream()
        .filter(|n| futures::future::ready(n % 2 == 0))
        .map(|n| n * 2)
        .collect()
        .await;
}
```

## Chunked processing

```rust
async fn batch() {
    let mut chunks = tick_stream().chunks(3);

    while let Some(chunk) = chunks.next().await {
        println!("batch: {chunk:?}"); // chunk is Vec<u32>
    }
}
```

`chunks(n)` buffers up to `n` items and emits them as a `Vec`. The last chunk may be smaller than `n`.

## Concurrent processing

```rust
use futures::stream::{self, StreamExt};

async fn fetch_all(urls: Vec<String>) -> Vec<String> {
    stream::iter(urls)
        .map(|url| async move { fetch(&url).await.unwrap_or_default() })
        .buffer_unordered(8) // up to 8 in-flight at once; results in completion order
        .collect()
        .await
}
```

| Method | Concurrency | Output order |
|---|---|---|
| `buffer_unordered(n)` | Up to n simultaneous | Completion order |
| `buffered(n)` | Up to n simultaneous | Input order (head-of-line blocking) |
| no buffering | Sequential | Input order |

Use `buffer_unordered` when order doesn't matter (aggregation). Use `buffered` when downstream expects input order (pagination, streaming responses).

## Merging streams

```rust
use futures::stream;

async fn merged() {
    let s1 = tick_stream();
    let s2 = tick_stream();

    // Items from both arrive in interleaved completion order
    let merged = stream::select(s1, s2);

    merged.for_each(|n| async move { println!("{n}") }).await;
}
```

`stream::select` polls both streams fairly. For more than two, use `stream::select_all(vec![...])`.

## When NOT to apply

- Don't create a stream just to immediately `.collect()` a `Vec` — use a regular async function returning `Vec<T>`.
- Don't use `buffer_unordered` for operations that must happen in order (e.g., sequential DB inserts with foreign-key dependencies).
- Don't use `async-stream`'s `stream!` macro for synchronous data — wrap with `stream::iter` instead; `stream!` adds overhead for a trivial case.
- Don't hold a reference into a stream item across a `yield` point inside `stream!` — the borrow checker will reject it.

## Common failure modes

- **Stream never polled.** Like `Future`, `Stream` is lazy. Calling `tick_stream()` does nothing until you call `.next().await` or a consumer like `.collect().await`. A stream assigned to `let s = ...` but never consumed silently does nothing.
- **`chunks` drops final partial chunk.** It doesn't — the partial chunk is yielded when the stream ends. But if the stream errors mid-chunk, the partial chunk is discarded. If partial chunk retention on error matters, handle errors per-item before chunking.
- **`buffer_unordered` out-of-order surprises.** Code that assumes index alignment with the input will produce incorrect results. Either use `buffered` or re-attach the index before processing.
- **`stream::select` starvation.** If one stream produces items much faster than the other, `select` may process them disproportionately. This is a known fairness trade-off; use `select_with_strategy` if strict fairness matters.
- **`ReceiverStream` missing items on startup.** Items sent before `ReceiverStream::new` is created and polled are buffered by the channel, not lost — but only up to the channel capacity. Sends that fill the buffer before the stream is polled will block or fail.
