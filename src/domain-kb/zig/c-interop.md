---
name: c-interop
description: Call C libraries and platform APIs from Zig using @cImport and callconv(.C).
license: MIT
last_reviewed: 2026-05-02
---

# Zig C Interoperability

## When to use

Use when wrapping C libraries (raylib, SDL2, curl, sqlite, openssl), calling platform-specific system APIs (Windows user32, POSIX) without third-party Zig bindings, passing a Zig function as a callback to a C library (curl CURLOPT_WRITEFUNCTION, SDL event handler), or writing a Zig library callable from C.

## Importing C Headers with @cImport

Use `@cImport` to translate C headers into Zig types and call C functions directly:

```zig
const ray = @cImport({
    @cInclude("raylib.h");
});

pub fn main() void {
    ray.InitWindow(800, 450, "window title");
    defer ray.CloseWindow();

    ray.SetTargetFPS(60);
    while (!ray.WindowShouldClose()) {
        ray.BeginDrawing();
        defer ray.EndDrawing();
        ray.ClearBackground(ray.RAYWHITE);
    }
}
```

Configure include paths and link the library in `build.zig`:

```zig
exe.addIncludePath(.{ .cwd_relative = "/usr/local/include" });
exe.linkSystemLibrary("raylib");
exe.linkLibC();  // required when linking any C library
```

## Extern Functions for Platform APIs

Declare C functions without a header using `extern`:

```zig
const win = @import("std").os.windows;

extern "user32" fn MessageBoxA(
    ?win.HWND,
    [*:0]const u8,
    [*:0]const u8,
    u32,
) callconv(.winapi) i32;
```

Use `.winapi` for Windows APIs, `.C` for POSIX / standard C.

## C Callbacks with callconv(.C)

When a C library takes a function pointer (e.g. `curl_easy_setopt(..., CURLOPT_WRITEFUNCTION, fn_ptr)`), mark the Zig function `callconv(.C)`:

```zig
fn writeCallback(
    data: *anyopaque,
    size: c_uint,
    nmemb: c_uint,
    user_data: *anyopaque,
) callconv(.C) c_uint {
    const buffer: *std.ArrayList(u8) = @alignCast(@ptrCast(user_data));
    const bytes: [*]u8 = @ptrCast(data);
    buffer.appendSlice(bytes[0 .. nmemb * size]) catch return 0;
    return nmemb * size;
}
```

Key rules:
- `callconv(.C)` is required — without it, the ABI is wrong and the callback silently corrupts state.
- `*anyopaque` is Zig's `void*`. Recover the original type with `@alignCast(@ptrCast(...))`.
- Zig error returns (`!T`) cannot cross the FFI boundary — return `0` or `null` on failure (C convention).

## C Type Mapping

| C type | Zig type |
|---|---|
| `void*` | `*anyopaque` |
| `const void*` | `*const anyopaque` |
| `char*` (null-terminated) | `[*:0]const u8` |
| `char*` (length-delimited) | `[*]u8` with separate length |
| `size_t` | `usize` |
| `int` | `c_int` |
| `unsigned int` | `c_uint` |
| `long` | `c_long` |
| `NULL` | `null` |

## When NOT to Use

- **Pure Zig codebase** — `@cImport` disables translate-c safety guarantees and couples your build to system headers. If a Zig-native library exists, prefer it.
- **Zig errors propagating through C** — there's no mechanism. C must not call back into Zig code that returns errors unless you translate to C error codes at the boundary.
- **Structs with C bitfields** — `@cImport` translates them, but the layout is platform-dependent and not verified by the Zig compiler. Test on every target.

## Common Failure Modes

- **Missing `callconv(.C)` on a callback** — compiles fine, crashes or silently corrupts at runtime when the C library calls back with the wrong calling convention.
- **Missing `@alignCast` when casting `*anyopaque`** — `@ptrCast` alone doesn't adjust alignment; the resulting pointer is misaligned and triggers undefined behavior. Always `@alignCast(@ptrCast(...))`.
- **Missing `exe.linkLibC()`** — linking any C library requires the C runtime; omitting this causes linker errors (`undefined symbol: memcpy`, etc.).
- **Returning a Zig error through a C callback** — use `catch return 0` or store the error in the user_data struct and check it after the C call returns.
