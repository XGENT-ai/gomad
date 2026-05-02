---
name: structured-logging
description: Add structured logging to Go services using log/slog (stdlib since Go 1.21).
license: MIT
last_reviewed: 2026-05-02
---

# Structured Logging with `log/slog`

## Component Loggers via `slog.With`

Create a logger pre-loaded with fixed fields at package or struct initialization time:

```go
import "log/slog"

var log = slog.With("component", "widgets")

func createWidget(name string) (*Widget, error) {
    log.Debug("creating widget", "name", name)
    widget := &Widget{Name: name}
    log.Info("created widget", "id", widget.ID, "name", widget.Name)
    return widget, nil
}
```

Every call on `log` automatically includes `component=widgets`. Callers reading the log output can filter by component without parsing message text.

## Key-Value Argument Conventions

slog accepts alternating string keys and values after the message:

```go
slog.Info("request completed",
    "method", r.Method,
    "path",   r.URL.Path,
    "status", statusCode,
    "dur_ms", time.Since(start).Milliseconds(),
)
```

Rules:
- Keys are lowercase, underscore-separated. Consistent key names across the codebase enable log aggregation queries.
- Pass errors as `slog.Any("err", err)`, not `"err", err.Error()`. `slog.Any` preserves the error type for structured backends that serialize it separately.
- Duration: log milliseconds as an integer (`int64`) rather than a `time.Duration` — most log platforms treat durations as opaque strings.

## Level-Guarded Logging in Hot Paths

`slog.Debug(...)` evaluates all arguments before the level check. In a hot loop, build the record only when needed:

```go
if slog.Default().Enabled(ctx, slog.LevelDebug) {
    slog.Debug("cache miss", "key", key, "size", cache.Len())
}
```

For the common case (service-level handlers, not tight loops), the overhead is negligible — skip the guard.

## Injecting a Logger vs. `slog.Default()`

| Approach | When to use |
|---|---|
| `slog.Default()` / package-level `var log` | Application code where a global logger is acceptable |
| Injected `*slog.Logger` field on a struct | Library code, or when tests need to capture log output |
| Logger in `context.Context` | Request-scoped fields (trace ID, user ID) that should follow the request |

Library code must never call `slog.Default()` — it hijacks the application's logger configuration. Accept a `*slog.Logger` parameter or a `context.Context` that carries one.

## Wiring in an HTTP Handler

```go
type Handler struct {
    log *slog.Logger
}

func NewHandler(log *slog.Logger) *Handler {
    return &Handler{log: log.With("component", "http")}
}

func (h *Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
    start := time.Now()
    // ... handle request ...
    h.log.Info("handled",
        "method", r.Method,
        "path",   r.URL.Path,
        "dur_ms", time.Since(start).Milliseconds(),
    )
}
```

## When NOT to Use `log/slog`

| Scenario | Alternative |
|---|---|
| CLI tool, one-shot script | `fmt.Fprintf(os.Stderr, ...)` is fine |
| Library package | Accept `*slog.Logger` as a parameter; don't import a global |
| Test helper output | `t.Log(...)` — goes to `go test -v`, not the structured log stream |
| Fatal startup error | `log.Fatalf` from the standard `log` package (or `slog.Error` + `os.Exit(1)`) |

## Common Failure Modes

- **Odd number of key-value args** — `slog.Info("msg", "key")` with no value produces a mangled log line. slog logs a `!BADKEY` entry but does not panic. Always pair keys with values.
- **`err.Error()` instead of `slog.Any`** — `"err", err.Error()` logs the string. Structured backends that index error fields won't see it as an error. Use `slog.Any("err", err)`.
- **Calling `slog.Default()` in a library** — the library's log output goes to whatever handler the application last set, which may be a no-op in tests. Accept a logger.
- **Logging in a tight loop at Info level** — even with key evaluation cost set aside, high-volume Info logs can saturate I/O. Use Debug and enable it only during investigation.
- **Discarding the child logger** — `log.With("req_id", id)` returns a new logger; it does not mutate `log`. Assign the result: `reqLog := log.With("req_id", id)`.
