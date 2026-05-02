---
name: memory-management
description: Manage heap allocations correctly in Zig using explicit allocators, defer/errdefer, and arenas.
license: MIT
last_reviewed: 2026-05-02
---

# Zig Memory Management

## When to use

Use when writing any function that allocates heap memory, when error paths are leaving resources un-cleaned (leaks on early return), when choosing between allocator types (GeneralPurposeAllocator vs ArenaAllocator vs page_allocator), or when setting up tests that must report leaks. Reach for this before memory-debugging.md — most leaks are a missing errdefer, not mysterious GPA output.

## Core Pattern: Explicit Allocators + errdefer

Pass allocators explicitly to every function that allocates. Never store a global allocator. Place cleanup immediately after acquisition:

```zig
fn createResource(allocator: std.mem.Allocator) !*Resource {
    const resource = try allocator.create(Resource);
    errdefer allocator.destroy(resource);  // runs only if this function returns an error

    resource.* = try initializeResource();  // if this fails, errdefer fires
    return resource;
}
```

`errdefer` vs `defer`:

| | `defer` | `errdefer` |
|---|---|---|
| When it runs | Always, on any return | Only on error return |
| Use for | File handles, connections you always close | Partial allocations that must be freed on failure |

Placing `errdefer` on the line immediately after `try allocator.create(...)` is the rule. If you write other code between the allocation and the `errdefer`, you've created a leak window.

## Arena Allocators for Batch Work

For temporary or batch allocations that live and die together, an arena is simpler and faster than per-object cleanup:

```zig
var arena = std.heap.ArenaAllocator.init(std.heap.page_allocator);
defer arena.deinit();  // frees everything at once
const allocator = arena.allocator();

const items = try allocator.alloc(Item, count);
const names = try allocator.alloc([]u8, count);
// No individual defers needed
```

## Allocator Selection

| Allocator | Use when |
|---|---|
| `std.heap.GeneralPurposeAllocator` | Development/debug; detects leaks and double-frees |
| `std.heap.ArenaAllocator` | Batch work with a clear lifetime (request handling, parsing) |
| `std.heap.page_allocator` | Release builds, simple programs, large single allocations |
| `std.heap.c_allocator` | Heavy C interop; memory must be freed by C code |
| `std.testing.allocator` | Tests only; fails the test on any leak |

## Tests: std.testing.allocator

Always use `std.testing.allocator` in tests — it wraps GPA and fails the test if any allocation escapes:

```zig
test "no leaks" {
    const allocator = std.testing.allocator;
    var list: std.ArrayListUnmanaged(u32) = .empty;
    defer list.deinit(allocator);

    try list.append(allocator, 42);
    // Removing defer list.deinit causes test failure with a stack trace
}
```

## When NOT to Use Heap Allocation

- Single-shot CLI tools — let the OS reclaim memory on exit; no heap cleanup needed.
- Fixed-size data known at compile time — use stack arrays (`[N]T`) or comptime structs.
- Tight loops over short-lived data — prefer stack or arena over per-iteration `alloc`.

## Common Failure Modes

- **Missing `errdefer` after `try allocator.create`** — if any subsequent `try` fails, the allocation leaks. Fix: add `errdefer allocator.destroy(ptr)` on the next line after every allocation.
- **Using `defer` where `errdefer` is needed** — `defer` runs on success too, freeing memory the caller now owns. The caller gets a use-after-free.
- **Mixing allocator instances** — allocating with one allocator and freeing with another is undefined behavior. Pass the allocator through; don't store it in a global.
- **Passing `std.heap.page_allocator` into tests** — leaks are silently ignored. Use `std.testing.allocator` instead.
