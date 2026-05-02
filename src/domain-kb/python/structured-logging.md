---
name: structured-logging
description: Configure module-level logging with `getLogger` and `%`-style lazy format strings in Python.
license: MIT
last_reviewed: 2026-05-02
---

## Module-Level Logger Setup

Declare the logger at module level, once, using the module's dotted name.

```python
import logging

logger = logging.getLogger("myapp.widgets")

def create_widget(name: str) -> Widget:
    logger.debug("creating widget: %s", name)
    widget = Widget(name=name)
    logger.info("created widget id=%s", widget.id)
    return widget
```

Using `__name__` works too and is preferred in library code:

```python
logger = logging.getLogger(__name__)
```

This creates a hierarchy: `myapp.widgets` inherits handlers and level from `myapp`, which inherits from the root logger. You can tune any level independently.

## `%`-Style vs f-String

| Form | When format runs | Use this? |
|---|---|---|
| `logger.debug("val: %s", x)` | Only if record is emitted | Yes |
| `logger.debug(f"val: {x}")` | Always, regardless of level | No |

For expensive `__repr__` or computed values, the difference is meaningful at scale.

## Application-Level Configuration

Libraries must NEVER call `basicConfig` or add handlers. That is the application entrypoint's job.

```python
# main.py or app startup only
import logging

logging.basicConfig(
    level=logging.DEBUG,
    format="%(asctime)s %(name)s %(levelname)s %(message)s",
)
```

For structured (JSON) logs in production, use a formatter like `python-json-logger`:

```python
from pythonjsonlogger import jsonlogger

handler = logging.StreamHandler()
handler.setFormatter(jsonlogger.JsonFormatter())
logging.getLogger().addHandler(handler)
```

## When NOT to Use the Root Logger

`logging.debug(...)` calls the root logger. Its default level is `WARNING` — debug messages silently vanish.

```python
# Wrong — root logger, level WARNING by default
logging.debug("this disappears unless you call basicConfig(level=DEBUG)")

# Correct — named logger inherits from root after basicConfig
logger = logging.getLogger("myapp.foo")
logger.debug("this works once root level is configured")
```

## Common Failure Modes

| Symptom | Cause | Fix |
|---|---|---|
| No log output at all | `basicConfig` never called in the app entrypoint | Call `basicConfig` once at startup |
| Debug messages in production | Root logger level set to `DEBUG` globally | Set the root to `INFO`; enable `DEBUG` per-namespace (`logging.getLogger("myapp.foo").setLevel(logging.DEBUG)`) |
| Duplicate log lines | Handler added to both root and named logger | Remove the named-logger handler; let it propagate |
| Logger inside a function, new one each call | Logger created inside a function body | Move `logger = logging.getLogger(...)` to module level |
| Library output appears in the app's logs | Library added a `StreamHandler` | Remove handlers from library code; raise an issue upstream |
