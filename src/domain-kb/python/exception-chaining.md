---
name: exception-chaining
description: Chain Python exceptions with `raise NewException(...) from err` to preserve tracebacks in Python.
license: MIT
last_reviewed: 2026-05-02
---

## When to Use Exception Chaining

Use `raise B from A` whenever you catch exception `A` and want to surface a higher-level exception `B` without losing the original traceback.

```python
import json

def parse_config(raw: str) -> dict:
    try:
        return json.loads(raw)
    except json.JSONDecodeError as err:
        raise ValueError(f"invalid config JSON: {err}") from err
```

The traceback shows both exceptions, separated by `"The above exception was the direct cause of the following exception"`.

## When NOT to Use

| Situation | Correct form | Reason |
|---|---|---|
| Re-raising the same exception | `raise` (bare) | Already preserves `__context__`; re-raising with `from` is redundant noise |
| Internal retry error that callers don't need | `raise DomainError("...") from None` | `from None` explicitly suppresses chaining — use sparingly and only when the cause is an implementation detail |
| Wrapping and the cause IS the message | `raise ValueError(str(err)) from err` | Include the original exception in the message AND chain it — don't choose one |

## Reading a Chained Traceback

```
json.JSONDecodeError: Expecting value: line 1 column 1 (char 0)

The above exception was the direct cause of the following exception:

Traceback (most recent call last):
  ...
ValueError: invalid config JSON: Expecting value: line 1 column 1 (char 0)
```

The bottom exception is what propagated. The top exception is the root cause via `__cause__`. Access programmatically with `err.__cause__`.

## Common Failure Modes

| Symptom | Cause | Fix |
|---|---|---|
| Production logs show `ValueError` with no context | Bare `raise ValueError(...)` without `from err` | Add `from err` |
| `__cause__` is `None` but `__context__` is set | Exception caught and re-raised without chaining (implicit context, not explicit cause) | Use explicit `from err` to signal intent |
| `from None` used everywhere "to keep logs clean" | Misunderstood semantics — it hides bugs | Only suppress chaining for genuinely irrelevant internal causes |
