---
name: type-checkers
description: Choose between ty, pyright, and mypy type checkers for Python CI and editor integration.
license: MIT
last_reviewed: 2026-05-02
---

## Decision Table

| Checker | Speed | Inference | Ecosystem | Stability | Use when |
|---|---|---|---|---|---|
| `ty` | Fastest | Good | Minimal | Early-stage | CI on large codebases; speed is the constraint |
| `pyright` | Fast | Best | Moderate | Stable | IDE integration (VS Code/Pylance); strict inference needed |
| `mypy` | Slow–moderate | Good | Largest | Mature | Project depends on mypy plugins (`django-stubs`, `pydantic.mypy`, `sqlalchemy-stubs`) |

Pick one per project. Commit to it.

## ty

```bash
uvx ty check          # no install, run directly
uvx ty check src/     # check a specific path
```

```toml
# pyproject.toml
[tool.ty]
python-version = "3.12"
```

**Do NOT use** if your codebase relies on mypy plugins or if you need stable, reproducible behavior across CI runs — ty's output may change between patch releases while it's pre-1.0.

## pyright

```bash
pip install pyright
pyright src/
```

```json
// pyrightconfig.json
{
  "pythonVersion": "3.12",
  "typeCheckingMode": "strict"
}
```

Pyright is the reference implementation for VS Code Python type checking (via Pylance). Use `typeCheckingMode: "strict"` for new projects; `"basic"` for brownfield migrations.

## mypy

```bash
pip install mypy
mypy src/
```

```toml
# pyproject.toml
[tool.mypy]
python_version = "3.12"
strict = true
```

Use mypy when you need its plugin ecosystem. `strict = true` enables the full set of flags (`--disallow-untyped-defs`, `--warn-return-any`, etc.). Add plugins in `[tool.mypy] plugins = ["pydantic.mypy"]`.

## When NOT to Use Each

- **ty:** pre-1.0 API churn may break CI on minor releases; no plugin system for ORM type stubs.
- **pyright:** slower than ty; no plugin system — Django/SQLAlchemy stubs are best-effort.
- **mypy:** slowest on large codebases; incremental cache (`--cache-dir`) helps but adds state to manage.

## Common Failure Modes

| Symptom | Cause | Fix |
|---|---|---|
| Checker passes in editor, fails in CI | Different checker in each (Pylance/pyright vs mypy) | Standardize on one checker for both |
| Burst of new errors after switching from mypy to pyright/ty | Stricter inference, different edge-case handling | Fix the errors; avoid `# type: ignore` spray |
| mypy is very slow | No incremental cache, or `follow_imports = "normal"` hitting all deps | Add `--cache-dir .mypy_cache` to CI; use `follow_imports = "skip"` for third-party stubs |
| `# type: ignore` suppresses the wrong error | mypy ignores the whole line; the intended error may be a different one | Use `# type: ignore[specific-code]` to be precise |
