---
name: memory-debugging
description: Detect and diagnose memory leaks, use-after-free, and double-free bugs in Zig using GPA.
license: MIT
last_reviewed: 2026-05-02
---

# Zig Memory Debugging

## When to use

Use when you see "memory leak detected" in output, when a program crashes with a suspected use-after-free or double-free, when validating cleanup logic in a system with complex defer/errdefer chains, or when you want tests to fail automatically if any allocation escapes.

## GeneralPurposeAllocator Setup

Wrap your top-level allocator in GPA to get leak reports with stack traces:

```zig
const std = @import("std");

pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer std.debug.assert(gpa.deinit() == .ok);
    const allocator = gpa.allocator();

    const data = try allocator.alloc(u8, 1024);
    defer allocator.free(data);
    // GPA reports any allocation that wasn't freed when deinit() runs
}
```

The `defer std.debug.assert(gpa.deinit() == .ok)` line is load-bearing — if you forget it, the leak report never runs.

## Configuration

```zig
var gpa = std.heap.GeneralPurposeAllocator(.{
    .stack_trace_depth = 16,          // frames to capture (default: 8)
    .enable_memory_limit = true,
    .requested_memory_limit = 1024 * 1024,  // 1 MB hard cap
}){};
```

Increase `stack_trace_depth` when the default 8 frames don't reach the allocation site in deeply nested code.

## Reading Leak Reports

When a leak occurs, GPA prints to stderr:

```
error: memory leak detected
Leak at 0x7f8a1c002a00 (1024 bytes)
    src/server.zig:118:38   <-- allocation site
    src/server.zig:95:12
    src/main.zig:42:5
```

Go to the topmost frame in your own code — that's where the allocation was made and the `errdefer` is missing.

## Tests with Leak Detection

`std.testing.allocator` wraps GPA and fails the test on any leak:

```zig
test "list does not leak" {
    const allocator = std.testing.allocator;
    var list: std.ArrayListUnmanaged(u32) = .empty;
    defer list.deinit(allocator);

    try list.append(allocator, 42);
    // Remove defer list.deinit to see the test fail with a stack trace
}
```

Always use `std.testing.allocator` in tests — never `std.heap.page_allocator`, which silently ignores leaks.

## Allocator Choices by Build Mode

| Situation | Allocator |
|---|---|
| Debug / development | `std.heap.GeneralPurposeAllocator` |
| Unit tests | `std.testing.allocator` |
| Release — general purpose | `std.heap.page_allocator` or `ArenaAllocator` |
| Heavy C interop | `std.heap.c_allocator` |

## When NOT to Use GPA

- Release builds — GPA adds substantial per-allocation overhead. Swap it out before shipping.
- When the bug is a missing `errdefer` — just add the errdefer (see [memory-management.md](memory-management.md)). You don't need GPA to find it.
- When the allocator is passed in from a test harness — `std.testing.allocator` already wraps GPA; don't double-wrap.

## Common Failure Modes

- **Missing `defer gpa.deinit()`** — the leak report never executes. The program exits cleanly with no output, making it look like there are no leaks.
- **`stack_trace_depth` too low** — with default depth 8, deeply nested allocation sites are truncated. Increase to 16–32 when the trace doesn't reach your code.
- **GPA reports a "leak" in library code you don't own** — the library requires you to call a cleanup function. Check the library's documentation for the teardown API.
- **Using GPA in a release binary** — throughput drops significantly because GPA tracks every allocation. This is a performance bug, not a correctness bug, but it's a common one.
