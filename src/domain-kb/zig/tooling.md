---
name: tooling
description: Use zigdoc and ziglint for documentation lookup and static analysis in Zig projects.
license: MIT
last_reviewed: 2026-05-02
---

# Zig Tooling

## When to use

Use when looking up a standard library function without opening a browser, when onboarding to a project's dependency APIs (zigdoc @init generates an AGENTS.md with common API patterns), or when adding a linting step to CI with ziglint.

## zigdoc — Browse Docs from the Terminal

```bash
zigdoc std.mem.Allocator   # look up a std library symbol
zigdoc vaxis.Window        # look up a symbol in a project dependency
zigdoc @init               # generate AGENTS.md with API patterns for all project deps
```

`zigdoc @init` is useful when starting work in an unfamiliar codebase — it generates a project-specific reference of the dependency APIs most commonly used.

Requirement: the project must compile successfully. If `zig build` fails, `zigdoc` cannot resolve dependency symbols and will report errors or produce incomplete output.

## ziglint — Static Analysis

```bash
ziglint                    # lint the current directory
ziglint --ignore Z001      # suppress a specific rule for this run
```

Configure persistent rule suppression in `.ziglint.zon` at the project root — don't rely on `--ignore` in CI because suppressed rules won't be visible in source control.

Example `.ziglint.zon`:

```zig
.{
    .ignore = &.{ "Z001" },
}
```

## std.log.scoped — Namespaced Logging

Define a module-level `log` constant scoped to the module name:

```zig
const log = std.log.scoped(.http_server);

fn handleRequest(req: Request) !void {
    log.debug("incoming request: {s}", .{req.path});
    log.err("handler failed: {}", .{err});
}
```

`std.log.scoped` prefixes every message with the scope name, making multi-module logs filterable. Define it once at file scope; don't pass it as a parameter.

## When NOT to Use These Tools

| Tool | Skip when |
|---|---|
| `zigdoc` | Build is broken — fix compilation first |
| `ziglint` | The rule being triggered is a false positive in generated code — add it to `.ziglint.zon`, not `--ignore` in a script |
| `std.log.scoped` | Single-file scripts — just use `std.debug.print` directly |

## Common Failure Modes

- **`zigdoc` returns no output for a dependency symbol** — the dependency may not export that symbol publicly, or the build is stale. Run `zig build` first.
- **`ziglint` suppressed globally in a Makefile with `--ignore`** — new instances of the rule are silently skipped. Move suppression to `.ziglint.zon`.
- **`std.log.scoped` defined inside a function** — scope names must be comptime-known; defining it inside a function body causes a compile error. Define it at file scope.
