---
name: type-system
description: Write type-safe Go code by making illegal states unrepresentable at compile time.
license: MIT
last_reviewed: 2026-05-02
---

# Go Type System Patterns

## Custom Types for Domain Primitives

Wrap primitive IDs in named types to let the compiler reject mix-ups:

```go
type UserID string
type OrderID string

func GetUser(id UserID) (*User, error) { ... }
func GetOrder(id OrderID) (*Order, error) { ... }
```

Passing an `OrderID` to `GetUser` is a compile error, not a runtime surprise.

Add methods where it sharpens the API:

```go
func (id UserID) String() string { return string(id) }
```

**When NOT to use:** throwaway scripts; protobuf/JSON-generated types where the wire contract is already the source of truth — converting back and forth adds noise without benefit.

## Interfaces — Accept Interfaces, Return Structs

Define the minimal behavior you need, not the concrete type you have:

```go
type UserRepository interface {
    GetByID(ctx context.Context, id UserID) (*User, error)
    Save(ctx context.Context, user *User) error
}

// stdlib example: accept io.Reader, not *os.File
func ProcessInput(r io.Reader) ([]byte, error) {
    return io.ReadAll(r)
}
```

Return concrete structs from constructors so callers can access fields and methods without type assertions. Return an interface only when the implementation will vary at the call site.

**When NOT to use:** don't wrap every struct in a one-method interface "for testability" — mocking a struct that owns no I/O adds ceremony without value. Mock at the I/O boundary (DB, HTTP, filesystem).

## Enums with `iota` + Exhaustive Switch

Start `iota` at `1` so the zero value is unambiguously "unset":

```go
type Status int

const (
    StatusActive  Status = iota + 1
    StatusInactive
    StatusPending
)

func ProcessStatus(s Status) (string, error) {
    switch s {
    case StatusActive:
        return "processing", nil
    case StatusInactive:
        return "skipped", nil
    case StatusPending:
        return "waiting", nil
    default:
        return "", fmt.Errorf("unhandled status: %v", s)
    }
}
```

The `default` returning an error catches values that slip in from deserialization or future additions that weren't updated here. Unlike Zig, Go's switch is not exhaustive by the compiler — the `default` branch is your enforcement point.

**When NOT to use:** a boolean is cleaner than a two-value enum. Use `iota` when you have three or more values that will grow.

## Functional Options for Flexible Construction

Use functional options when a constructor has optional knobs. Avoids a long parameter list and preserves backward-compatibility when adding new options:

```go
type ServerOption func(*Server)

func WithPort(port int) ServerOption {
    return func(s *Server) { s.port = port }
}

func WithTimeout(d time.Duration) ServerOption {
    return func(s *Server) { s.timeout = d }
}

func NewServer(opts ...ServerOption) *Server {
    s := &Server{port: 8080, timeout: 30 * time.Second}
    for _, opt := range opts {
        opt(s)
    }
    return s
}

// Usage
srv := NewServer(WithPort(3000), WithTimeout(time.Minute))
```

**When NOT to use:** one or two config values. A plain `NewServer(port int, timeout time.Duration)` is clearer than wrapping two options. Use functional options when the set of optional parameters is three or more, or when the caller rarely sets most of them.

**Common failure mode:** options that mutate shared state — each `ServerOption` should only touch `*Server`, never capture a pointer to an external variable.

## Struct Embedding for Composition

Embed shared fields instead of copying them:

```go
type Timestamps struct {
    CreatedAt time.Time
    UpdatedAt time.Time
}

type User struct {
    Timestamps   // promoted: user.CreatedAt, user.UpdatedAt
    ID    UserID
    Email string
}
```

The embedded fields are promoted to the outer struct. Use this for cross-cutting concerns (audit fields, soft-delete fields) shared across many domain types.

**When NOT to use:** embedding to share behavior between types that are not conceptually related — prefer explicit fields or composition through an interface instead. Embedding for the wrong reason produces surprising method resolution.

## When NOT to Apply These Patterns

| Pattern | Skip when |
|---|---|
| Custom domain ID type | Wire format (protobuf, JSON) is the real contract; wrapping adds cast noise |
| Interface parameter | The concrete type has only one real implementation and no I/O |
| `iota` enum | Two states — use `bool`; or the values come from an external system as strings |
| Functional options | One or two mandatory fields — just use positional params |
| Struct embedding | Types are not conceptually related; sharing fields via embedding hides the relationship |

## Common Failure Modes

- **`iota` starting at 0** — the zero value of the type is silently a valid status. A zero `Status` passes an `if s != 0` check. Start at `iota + 1` and treat zero as "unset".
- **Interface method added, implementations not updated** — Go interfaces are satisfied implicitly, so adding a method to a `Repository` interface compiles fine until the concrete type fails to compile at the use site. Run `go build ./...` to catch this immediately.
- **Functional option ordering surprises** — if two options set the same field, the last one wins. Document precedence or validate after applying all options.
- **Exported embedded type with unexported field** — embedding an exported struct with unexported fields exposes the struct's methods but not direct field access from outside the package. Check `go vet` for unkeyed struct literals.
