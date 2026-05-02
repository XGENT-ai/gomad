---
name: error-handling
description: Wrap, inspect, and define Go errors correctly using fmt.Errorf, errors.Is, and errors.As.
license: MIT
last_reviewed: 2026-05-02
---

# Go Error Handling

## Wrap with `%w`, Not `%v`

Add context to an error without discarding the chain:

```go
out, err := client.Do(ctx, req)
if err != nil {
    return nil, fmt.Errorf("fetch widget: %w", err)
}
```

`%w` preserves the original error so `errors.Is` and `errors.As` can unwrap the chain. `%v` converts the error to a string — the chain is gone and callers cannot inspect the original cause.

**Format convention:** lowercase, no trailing punctuation, colon-space before `%w`. `"fetch widget: %w"` not `"Failed to fetch widget: %w"`. The prefix is context, not prose.

## Sentinel Errors — `var` or `const`?

Use `var` with a dedicated type, not a plain string:

```go
var ErrNotFound = errors.New("not found")

func GetUser(id UserID) (*User, error) {
    if !exists {
        return nil, ErrNotFound
    }
    ...
}

// caller
if errors.Is(err, ErrNotFound) { ... }
```

`errors.Is` compares by identity for values produced by `errors.New`. Two calls to `errors.New("not found")` produce two distinct errors — `errors.Is` will not match them. Define each sentinel once, at the package level, as a `var`.

## Typed Errors for Extra Data

When callers need details beyond the error message, define a struct:

```go
type ValidationError struct {
    Field   string
    Message string
}

func (e *ValidationError) Error() string {
    return fmt.Sprintf("validation failed on %s: %s", e.Field, e.Message)
}

// unwrapping
var ve *ValidationError
if errors.As(err, &ve) {
    log.Warn("invalid input", "field", ve.Field)
}
```

`errors.As` walks the chain and sets `ve` when it finds an error that is assignable to `*ValidationError`. The target must be a pointer to the error type (or interface).

## Wrapping Boundaries

Wrap at abstraction boundaries, not at every call site:

```go
// Good — one wrapping layer adds the operation name
func (r *repo) GetUser(ctx context.Context, id UserID) (*User, error) {
    row := r.db.QueryRowContext(ctx, q, id)
    if err := row.Scan(&u.ID, &u.Email); err != nil {
        return nil, fmt.Errorf("repo.GetUser id=%s: %w", id, err)
    }
    return &u, nil
}
```

If the function above is called by a handler that also wraps `"handle GET /users: %w"`, the chain will have two meaningful context layers. That's fine. What to avoid: wrapping the same error five times through helper functions with redundant messages.

**When NOT to wrap:** when you intentionally want to hide the internal cause from the caller (a public API concealing an implementation detail). Use a new `errors.New` or a typed error instead of `%w`.

## When NOT to Use `errors.Is` / `errors.As`

| Scenario | Preferred approach |
|---|---|
| Checking any non-nil error | Plain `if err != nil` |
| The error came from `fmt.Errorf` with `%v` | `errors.Is` will always return false — fix the wrapping |
| Library error from third party that doesn't export sentinels | String-based check as last resort; file an upstream issue |
| Errors in a hot loop | Profile first; unwrapping is O(chain depth) but rarely the bottleneck |

## Common Failure Modes

- **`%v` instead of `%w`** — `errors.Is(err, ErrNotFound)` returns `false` even though the message contains "not found". Switch to `%w`.
- **Duplicate sentinel per package** — `var ErrNotFound = errors.New("not found")` defined in two packages. `errors.Is` compares identity, not message text. Each package's sentinel is a different value; callers must import the right package.
- **`errors.As` target not a pointer** — `errors.As(err, ValidationError{})` panics. The second argument must be a non-nil pointer to the target type: `errors.As(err, &ve)`.
- **Wrapping a nil error** — `fmt.Errorf("context: %w", nil)` produces a non-nil error whose message is `"context: <nil>"`. Always guard: `if err != nil { return fmt.Errorf(...) }`.
- **Ignoring errors silently** — `_ = f.Close()` on a file being written. Flush/close errors signal data loss. Assign and check, or log at minimum.
