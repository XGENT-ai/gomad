---
name: generics
description: Implement generic containers in Zig using comptime type parameters and type-returning functions.
license: MIT
last_reviewed: 2026-05-02
---

# Zig Generic Containers

## When to use

Use when building a queue, stack, tree, ring buffer, or other collection parameterized by element type; when wrapping allocations in a type-safe API for a domain-specific container; or when you find yourself duplicating a data structure for different element types.

## Pattern: Type-Returning Function

Return a struct type from a comptime function to create a generic container:

```zig
pub fn Queue(comptime Child: type) type {
    return struct {
        const Self = @This();
        const Node = struct {
            data: Child,
            next: ?*Node,
        };

        allocator: std.mem.Allocator,
        start: ?*Node,
        end: ?*Node,

        pub fn init(allocator: std.mem.Allocator) Self {
            return Self{ .allocator = allocator, .start = null, .end = null };
        }

        pub fn enqueue(self: *Self, value: Child) !void {
            const node = try self.allocator.create(Node);
            node.* = .{ .data = value, .next = null };
            if (self.end) |end| end.next = node else self.start = node;
            self.end = node;
        }

        pub fn dequeue(self: *Self) ?Child {
            const start = self.start orelse return null;
            defer self.allocator.destroy(start);
            if (start.next) |next| self.start = next else {
                self.start = null;
                self.end = null;
            }
            return start.data;
        }
    };
}
```

Usage:

```zig
var queue = Queue(u32).init(allocator);
try queue.enqueue(42);
const val = queue.dequeue(); // ?u32
```

## Key Techniques

- **`@This()`** — returns the enclosing struct type at comptime. Use it to define `Self` so methods can refer to the container's own type. It must appear *inside* the returned struct body, not in the outer function.
- **Nested `Node` struct** — defined inside the returned struct so it's scoped to that instantiation. A `Queue(u32).Node` and `Queue([]u8).Node` are distinct types.
- **Allocator stored at init** — methods need the allocator to create/destroy nodes. Pass it once to `init` and store it as a field.
- **`defer` in dequeue** — `destroy(start)` is deferred after reading `start.data`, ensuring the node is freed even if the caller panics on the returned value.

## `comptime T: type` vs `anytype`

Prefer `comptime Child: type` over `anytype` for container type parameters:

| | `comptime Child: type` | `anytype` |
|---|---|---|
| Error messages | Point to the call site with the wrong type | Point inside the function body |
| Explicit constraints | Can add `if (@typeInfo(Child) != .int) @compileError(...)` | No static enforcement |
| Use when | Container element type | Genuinely polymorphic (callbacks, print-style) |

## When NOT to Use Custom Generics

| Situation | Prefer instead |
|---|---|
| Ordered list of T | `std.ArrayList(T)` or `std.ArrayListUnmanaged(T)` |
| Key-value map | `std.AutoHashMap(K, V)` or `std.StringHashMap(V)` |
| Linked list | `std.DoublyLinkedList(T)` |
| Fixed-size stack | `std.BoundedArray(T, N)` |

Build a custom generic only when the standard library doesn't provide the shape you need.

## Common Failure Modes

- **`@This()` in the outer function, not inside the returned struct** — `@This()` at the function level returns the module type, not the container struct. Move it inside `return struct { const Self = @This(); ... }`.
- **Forgetting to store the allocator** — methods that create or destroy nodes need it; passing it to every call is error-prone. Store it in the struct.
- **Not freeing nodes on dequeue** — nodes are heap-allocated; skipping `defer self.allocator.destroy(start)` leaks one node per dequeue.
- **Using `anytype` instead of `comptime Child: type`** — compile errors become unreadable because they surface inside the generic body rather than at the instantiation site.
