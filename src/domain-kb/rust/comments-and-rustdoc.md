---
name: comments-and-rustdoc
description: Decide between `//` comments, `///` item docs, and `//!` module/crate docs in Rust — and avoid the "comments as living documentation" trap. Use this whenever the user is reviewing code with multi-paragraph `//` blocks describing what the function does, sees an undocumented public API and asks if it matters, debates `///` vs `//!`, hits clippy `missing_docs` / `missing_panics_doc` / `missing_errors_doc` / `broken_intra_doc_links`, asks where `# Examples` / `# Errors` / `# Panics` / `# Safety` sections go, or wants to enforce doc coverage with `#![deny(missing_docs)]`. Covers: when a comment is right (safety, perf quirks, design rationale, ADR links), when it's wrong (restating the code, obsolete TODOs), the `///` checklist for public items, the `//!` use for crate / module overview, doc-test attributes (`no_run`, `compile_fail`, `should_panic`), and what NOT to do (treat comments as living docs, leave un-issue-linked TODOs, snapshot stale design discussion in code).
source: https://github.com/apollographql/rust-best-practices
license: MIT
last_reviewed: 2026-05-02
---

# Comments and `rustdoc`

Two artifacts; two audiences. `//` comments are for the maintainer reading the source. `///` and `//!` are for the consumer reading `cargo doc --open`. Mixing them up — putting API explanations in `//`, or filling `///` with internal notes — confuses both readers.

## The split

| Purpose | Use | Visible in `cargo doc` |
|---|---|---|
| Why a tricky local choice was made | `//` | No |
| What a public function does and how to call it | `///` | Yes |
| What a module / crate is for | `//!` (top of `mod.rs` / `lib.rs`) | Yes |
| Safety contract for `unsafe` block | `// SAFETY: ...` | No (but linters check it) |
| Reference an ADR / design doc | `//` with the link | No |

## When a `//` comment earns its keep

Use `//` when the code's *what* is obvious but the *why* is not.

```rust
// SAFETY: ptr is non-null and len fits within the allocation. See `Self::checked_buf`.
unsafe { std::ptr::copy_nonoverlapping(src, dst, len); }
```

```rust
// PERF: Generating the root store per subgraph caused high TLS startup latency on macOS.
// See ADR-123 for the caching strategy.
let store = configuration.tls.subgraph.shared_store();
```

```rust
// CONTEXT: legacy clients send the timestamp without timezone. We default to UTC.
let ts = parse_naive(raw)?.and_utc();
```

The naming convention pays off: prefix comments with their kind so a future reader can grep:

- `// SAFETY:` — invariants required for an `unsafe` block.
- `// PERF:` — performance trade-off that drove the structure.
- `// CONTEXT:` — design or business context.
- `// HACK:` — known shortcut, ideally with an issue link.
- `// TODO(#123):` — work to follow up; the issue link is mandatory.

## When a `//` comment is wrong

| Smell | Fix |
|---|---|
| Restates what the code does | Delete. The code says it. |
| Long paragraph explaining a function | Move to `///`, or split the function into smaller named pieces. |
| `// Originally written in 2018 for some old platform` | Delete. `git log` knows. |
| `// TODO: fix this someday` | Either fix it, or open an issue and reference it: `// TODO(#42): ...`. |
| Repeats the function name in different words | Delete. |
| "This works because of X" where X has changed | Verify, then delete or fix. Stale comments mislead. |

A misleading comment is worse than none. If you can't trust a comment after reading the code, no future reader can.

## "Living documentation" is a trap

Treating comments as living docs sounds nice and breaks down in practice:

- Code evolves; comments don't auto-update.
- Readers default to trusting them, then propagate stale information.
- They become wallpaper — large blocks people stop reading.

Three places that scale better than `//` for durable knowledge:

1. **Types and names.** Replace `// We first validate, then decode, then dispatch` with three named functions: `validate_request_headers(...)?; decode_payload(...)?; dispatch(...)`.
2. **Doc comments.** Put the *what* and *how* of public APIs in `///`. They appear in `cargo doc`, run as tests, and stay in code review.
3. **External docs.** Architectural decisions go in ADRs. Performance trade-offs go in design docs. Link from the code with `// See ADR-123`.

## Replace comment blobs with named functions

Bad:

```rust
fn save_user(&self) -> Result<(), MyError> {
    // check if the user is authenticated
    if self.is_authenticated() {
        // serialize the data
        let data = serde_json::to_string(self)?;
        // write to disk
        std::fs::write(self.path(), data)?;
    }
    Ok(())
}
```

Good:

```rust
fn save_user(&self) -> Result<PathBuf, MyError> {
    if !self.is_authenticated() {
        return Err(MyError::UserNotAuthenticated);
    }
    let path = self.path();
    let serialized = serde_json::to_string(self)?;
    std::fs::write(&path, serialized)?;
    Ok(path)
}
```

If a function still needs three subcomments, extract three subfunctions.

## `///` for items: what to include

Every public item gets a `///` doc. Cover:

- One-line summary (mandatory).
- What the function / type does and the role it plays.
- Parameters and return — only if not obvious from the signature.
- `# Errors` if the function returns `Result`. Enumerate the `Err` variants and what they mean.
- `# Panics` if the function can panic.
- `# Safety` if the function is `unsafe`.
- `# Examples` — at least one runnable example.

```rust
/// Loads a [`User`] profile from disk.
///
/// # Errors
/// - [`MyError::FileNotFound`] if the path does not exist.
/// - [`MyError::InvalidJson`] if the file isn't valid JSON.
///
/// # Examples
/// ```
/// # use my_crate::{load_user, User};
/// # let path = std::env::temp_dir().join("user.json");
/// # std::fs::write(&path, r#"{"id":1,"name":"a"}"#).unwrap();
/// let user: User = load_user(&path)?;
/// # assert_eq!(user.id, 1);
/// # Ok::<(), my_crate::MyError>(())
/// ```
pub fn load_user(path: &Path) -> Result<User, MyError> { /* ... */ }
```

Hide setup boilerplate with `# ` prefixes — the reader sees the example body, but `cargo test` runs everything.

## `//!` for modules and crates

Top of `lib.rs`:

```rust
//! A custom chess engine.
//!
//! Handles board state, move generation, and check detection.
//!
//! # Quickstart
//! ```
//! let board = chess::engine::Board::default();
//! assert!(board.is_valid());
//! ```
```

Top of a `mod.rs`:

```rust
//! Tokenizer for the SQL frontend.
//!
//! Splits input into [`Token`]s. Whitespace is preserved as [`Token::Whitespace`]
//! to keep the lexer reversible.
```

Module-level docs explain *purpose* and *invariants*. Don't repeat the docs of every re-exported item.

## Doc-test attributes

```rust
/// ```             // compiles + runs (default)
/// ```ignore       // skipped — usually wrong; prefer `text` for non-Rust blocks
/// ```text         // formatted as text, not Rust
/// ```no_run       // compiles, doesn't run (network calls, side effects)
/// ```compile_fail // expected to fail to compile (showing a misuse)
/// ```should_panic // expected to panic at runtime
```

## Doc lints to enable

| Lint | Effect |
|---|---|
| `#![deny(missing_docs)]` (crate-level) | Public items without `///` fail to compile. |
| `clippy::missing_panics_doc` | Public fn that calls `panic!` / `unwrap` without a `# Panics` section. |
| `clippy::missing_errors_doc` | Public fn returning `Result` without an `# Errors` section. |
| `clippy::missing_safety_doc` | Public `unsafe` fn without a `# Safety` section. |
| `rustdoc::broken_intra_doc_links` | Stale `[Foo]` links after a rename. |
| `clippy::empty_docs` | `///` followed by nothing. |

For libraries: enable all of these. For binaries: lighter — internal items don't need full coverage.

## When NOT to apply

- A toy script or one-off binary doesn't need `///` on every fn.
- Trivial getters where the signature speaks for itself: `pub fn name(&self) -> &str`. A one-line `///` is fine; full sections are overkill.
- Generated code (e.g. from `prost`). Don't fight it; exclude with `#[allow(missing_docs)]` on the generated module.

## Common failure modes

- **`/// TODO: write docs` left in.** Becomes invisible noise. Delete or fill.
- **Empty `# Examples` section because writing one is hard.** Either write one, or delete the heading.
- **Long doc comments that duplicate `# Errors` / `# Panics` content in prose.** Promote to the proper sections.
- **`//!` at the top of a non-module file.** Only `lib.rs` and `mod.rs` (and inline modules) accept `//!`.
- **`///` on a private function.** Allowed but noisy. If you want internal docs, use `//` or move the explanation into the function name.
- **Using `///` on a `use` statement.** Not allowed for re-exports unless the rustdoc you're describing belongs to the re-exported item itself.
- **Forgetting that doc tests don't run under `cargo nextest`.** Run `cargo test --doc` separately.
