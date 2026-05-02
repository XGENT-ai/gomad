---
name: concurrency-sync
description: Apply errgroup, sync.Map, semaphore, and graceful shutdown in concurrent Go code.
license: MIT
last_reviewed: 2026-05-02
---

# Go Concurrency Sync Primitives

## `errgroup` for Parallel Calls with Cancellation

Run N tasks concurrently; cancel all on first error:

```go
import "golang.org/x/sync/errgroup"

func fetchAll(ctx context.Context, urls []string) ([]string, error) {
    g, ctx := errgroup.WithContext(ctx)
    results := make([]string, len(urls))

    for i, url := range urls {
        i, url := i, url // capture loop vars
        g.Go(func() error {
            body, err := fetch(ctx, url)
            if err != nil {
                return fmt.Errorf("fetch %s: %w", url, err)
            }
            results[i] = body
            return nil
        })
    }

    if err := g.Wait(); err != nil {
        return nil, err
    }
    return results, nil
}
```

`errgroup.WithContext` cancels the returned `ctx` when any goroutine returns a non-nil error. Use that `ctx` inside every goroutine — not the parent — so cancellation propagates. Use `g.SetLimit(n)` (Go 1.20+) to cap concurrent goroutines when the input set is large.

## `sync.Map` — Read-Heavy Caches Only

```go
var cache sync.Map

cache.Store(key, value)

v, ok := cache.Load(key)

actual, loaded := cache.LoadOrStore(key, value)
```

`sync.Map` is optimised for keys written once and read many times. For write-heavy workloads, use a `sync.RWMutex`-guarded plain map instead:

```go
type SafeMap struct {
    mu sync.RWMutex
    m  map[string]any
}

func (s *SafeMap) Get(k string) (any, bool) {
    s.mu.RLock()
    defer s.mu.RUnlock()
    return s.m[k]
}

func (s *SafeMap) Set(k string, v any) {
    s.mu.Lock()
    defer s.mu.Unlock()
    s.m[k] = v
}
```

## Semaphore for Bounded Concurrency

Limit simultaneous goroutines without a worker-pool channel:

```go
import "golang.org/x/sync/semaphore"

sem := semaphore.NewWeighted(10)

for _, item := range items {
    if err := sem.Acquire(ctx, 1); err != nil {
        return err // context cancelled
    }
    go func(item Item) {
        defer sem.Release(1)
        process(item)
    }(item)
}
```

Channel-based semaphore (zero external dependencies):

```go
type Semaphore chan struct{}

func NewSemaphore(n int) Semaphore { return make(chan struct{}, n) }
func (s Semaphore) Acquire()      { s <- struct{}{} }
func (s Semaphore) Release()      { <-s }
```

Use `semaphore.Weighted` when you need context cancellation on acquire. Use the channel form to avoid the `golang.org/x/sync` dependency.

## Graceful Shutdown

Capture OS signals, propagate via context, drain workers before exit:

```go
func main() {
    ctx, cancel := signal.NotifyContext(context.Background(),
        syscall.SIGINT, syscall.SIGTERM)
    defer cancel()

    var wg sync.WaitGroup
    for i := 0; i < 5; i++ {
        wg.Add(1)
        go func(id int) {
            defer wg.Done()
            runWorker(ctx, id)
        }(i)
    }

    <-ctx.Done()
    cancel() // release signal resources

    done := make(chan struct{})
    go func() { wg.Wait(); close(done) }()

    select {
    case <-done:
    case <-time.After(10 * time.Second):
        log.Println("shutdown timed out, forcing exit")
    }
}
```

`signal.NotifyContext` (Go 1.16+) replaces the verbose `signal.Notify` + channel setup. The `time.After` timeout prevents a misbehaving worker from stalling the process indefinitely.

## Choosing a Primitive

| Need | Primitive |
|---|---|
| N parallel tasks, stop on first error | `errgroup` |
| Limit simultaneous goroutines | `semaphore.Weighted` or channel semaphore |
| Protect a simple counter or flag | `sync/atomic` |
| Map with heavy writes | `sync.RWMutex` + `map` |
| Map with mostly reads | `sync.Map` |
| Wait for all goroutines to finish | `sync.WaitGroup` |

## When NOT to Use These Primitives

- **`sync.Mutex` in a value type** — copying a struct that embeds a `Mutex` is a data race. Always use a pointer receiver on methods that lock.
- **`sync.WaitGroup` passed by value** — `wg.Add(1)` on a copy doesn't affect the original. Pass `*sync.WaitGroup` or close over it.
- **`sync.Once` for fallible init** — `Once` runs the function exactly once and discards errors; a failed init silently becomes a no-op. Use a double-checked lock pattern when initialization can fail.

## Common Failure Modes

- **`errgroup` context not threaded through** — spawning `g, ctx := errgroup.WithContext(parent)` then passing `parent` (not `ctx`) into goroutines. Cancellation doesn't reach the work.
- **Goroutine launched with `go func` instead of `g.Go`** — errors and panics from that goroutine are not collected by `errgroup`.
- **`sync.WaitGroup` reuse race** — calling `wg.Add` after `wg.Wait` returns but before the counter resets. Create a new `WaitGroup` per batch.
- **Semaphore not released on error** — early-return paths that skip `sem.Release(1)`. Always use `defer sem.Release(1)` immediately after a successful `Acquire`.
- **Race detector skipped** — running tests without `-race` misses data races that only manifest under concurrency. Add `go test -race ./...` to CI.
