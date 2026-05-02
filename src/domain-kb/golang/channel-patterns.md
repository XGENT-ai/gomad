---
name: channel-patterns
description: Implement fan-out/fan-in pipelines, worker pools, and select patterns in Go.
license: MIT
last_reviewed: 2026-05-02
---

# Go Channel Patterns

## Worker Pool

Route a stream of jobs across N concurrent workers:

```go
type Job struct {
    ID   int
    Data string
}

type Result struct {
    JobID  int
    Output string
    Err    error
}

func WorkerPool(ctx context.Context, numWorkers int, jobs <-chan Job) <-chan Result {
    results := make(chan Result, cap(jobs))
    var wg sync.WaitGroup

    for i := 0; i < numWorkers; i++ {
        wg.Add(1)
        go func() {
            defer wg.Done()
            for job := range jobs {
                select {
                case <-ctx.Done():
                    return
                case results <- processJob(job):
                }
            }
        }()
    }

    go func() {
        wg.Wait()
        close(results)
    }()

    return results
}
```

Rules:
- Only the sender closes a channel. The producer of `jobs` closes it; the workers never do.
- Size the results buffer to `cap(jobs)` to prevent workers from blocking while the consumer is slow.
- Always include a `ctx.Done()` case — missing it leaks the goroutine when the context is cancelled.

## Fan-Out / Fan-In Pipeline

Chain processing stages; split a single input across multiple workers, then merge output:

```go
// Stage: transform each value
func square(ctx context.Context, in <-chan int) <-chan int {
    out := make(chan int)
    go func() {
        defer close(out)
        for n := range in {
            select {
            case <-ctx.Done():
                return
            case out <- n * n:
            }
        }
    }()
    return out
}

// Merge multiple channels into one
func merge(ctx context.Context, cs ...<-chan int) <-chan int {
    var wg sync.WaitGroup
    out := make(chan int)

    output := func(c <-chan int) {
        defer wg.Done()
        for n := range c {
            select {
            case <-ctx.Done():
                return
            case out <- n:
            }
        }
    }

    wg.Add(len(cs))
    for _, c := range cs {
        go output(c)
    }

    go func() {
        wg.Wait()
        close(out)
    }()

    return out
}

// Usage
in := generate(ctx, 1, 2, 3, 4, 5)
c1, c2 := square(ctx, in), square(ctx, in) // fan out
for n := range merge(ctx, c1, c2) {        // fan in
    fmt.Println(n)
}
```

Each stage reads one channel and returns another — stages compose without sharing state.

## `select` Patterns

```go
// Timeout: abandon a receive after a deadline
select {
case v := <-ch:
    handle(v)
case <-time.After(time.Second):
    return ErrTimeout
}

// Non-blocking send: drop if the channel is full
select {
case ch <- value:
default:
    metrics.DroppedInc()
}

// Priority: drain high-priority queue first
for {
    select {
    case msg := <-high:
        handleHigh(msg)
    default:
        select {
        case msg := <-high:
            handleHigh(msg)
        case msg := <-low:
            handleLow(msg)
        }
    }
}
```

`select` over multiple ready channels is random — use the nested form only when you need deterministic priority.

## When NOT to Use Channels

| Situation | Better approach |
|---|---|
| Protecting a shared struct field | `sync.Mutex` — less indirection |
| Counting or rate-limiting concurrency | `semaphore.Weighted` from `golang.org/x/sync` |
| One writer, many concurrent readers | `sync.RWMutex` or `sync/atomic` |
| Parallel calls with error collection | `errgroup` |

Channels excel at streaming data between goroutines. When the problem is protecting state rather than passing values, reach for a mutex.

## Common Failure Modes

- **Goroutine leak** — a worker blocks on a channel send/receive with no exit. Always pair a `wg.Add(1)` with `defer wg.Done()` and a `ctx.Done()` case on every blocking select.
- **Closing from the receiver** — `close(ch)` from the consumer panics when the sender writes. Ownership of close belongs to the producer.
- **Receiving on a closed channel without checking `ok`** — a raw `<-ch` returns the zero value silently after close. Use `v, ok := <-ch` or a `range` loop to detect channel exhaustion.
- **Nil channel blocks forever** — a nil channel in a `select` case is permanently skipped, which can be used deliberately to disable a case. Unintentional nil channels cause deadlocks.
- **`time.After` leak in a loop** — `time.After` creates a `*time.Timer` not collected until it fires. In tight loops, use `time.NewTimer` and call `Reset` explicitly.
