---
name: type-safety
description: Make illegal states unrepresentable using frozen dataclasses, NewType, and Protocol in Python.
license: MIT
last_reviewed: 2026-05-02
---

## Frozen Dataclasses for Immutable Domain Models

Use `@dataclass(frozen=True)` for value objects that should never change after construction.

```python
from dataclasses import dataclass
from datetime import datetime

@dataclass(frozen=True)
class User:
    id: str
    email: str
    name: str
    created_at: datetime
```

Mutation raises `FrozenInstanceError` at runtime and is caught statically by mypy/pyright.

**When NOT to use:** objects that accumulate state during a build or pipeline step — use a plain mutable dataclass and freeze a final snapshot at the output boundary.

## Discriminated Unions with Literal

Encode multi-state results as a union of tagged dataclasses, not a single class with optional fields.

```python
from dataclasses import dataclass
from typing import Literal

@dataclass
class Success:
    status: Literal["success"] = "success"
    data: str = ""

@dataclass
class Failure:
    status: Literal["error"] = "error"
    error: Exception = None  # type: ignore[assignment]

RequestState = Success | Failure

def handle(state: RequestState) -> None:
    match state:
        case Success(data=data):
            render(data)
        case Failure(error=err):
            show_error(err)
```

The type checker enforces exhaustiveness — add a new variant and every unhandled `match` becomes an error.

**When NOT to use:** more than ~5 variants with shared fields; prefer a plain class hierarchy with a base type there.

## NewType for Domain Primitives

Prevent mixing same-representation IDs at the type-checker level.

```python
from typing import NewType

UserId = NewType("UserId", str)
OrderId = NewType("OrderId", str)

def get_user(user_id: UserId) -> User: ...

order_id = OrderId("ord-123")
get_user(order_id)  # mypy error: Argument 1 has incompatible type "OrderId"; expected "UserId"
```

`NewType` is a zero-cost abstraction at runtime — the value is still a plain `str`.

**When NOT to use:** types that callers construct from raw strings frequently with no constructor wrapper. The cast boilerplate (`UserId("raw")`) accumulates quickly across a codebase.

## Protocol for Structural Typing

Define capability contracts without requiring inheritance.

```python
from typing import Protocol

class Readable(Protocol):
    def read(self, n: int = -1) -> bytes: ...

def process_input(source: Readable) -> bytes:
    return source.read()
```

Any object with a matching `read` signature satisfies `Readable` — `io.BytesIO`, `socket.socket`, a custom class, a mock. No `ABC`, no registration.

**When NOT to use:** when you need runtime `isinstance` checks. Protocols are structural; `isinstance(obj, Readable)` raises `TypeError` unless you also inherit from `runtime_checkable`.

## Common Failure Modes

| Symptom | Cause | Fix |
|---|---|---|
| `FrozenInstanceError` at runtime | Mutating a frozen dataclass field | Use `dataclasses.replace(obj, field=new_val)` to produce a new instance |
| `match` falls through to `case _` unexpectedly | Literal tag not set as a default, instance created without it | Set the `Literal` field as a proper default or use `__post_init__` validation |
| `NewType` passes type check but wrong ID used at runtime | `NewType` is erased at runtime | Add a named constructor function that validates format if runtime safety matters |
| `Protocol` `isinstance` raises `TypeError` | Protocol not decorated with `@runtime_checkable` | Add `@typing.runtime_checkable` and accept the performance cost of structural checks |
