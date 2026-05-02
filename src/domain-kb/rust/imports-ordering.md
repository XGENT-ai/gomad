---
name: imports-ordering
description: Order Rust `use` declarations by group and enforce the layout with `rustfmt`.
license: MIT
last_reviewed: 2026-05-02
---

**When to use:** Reach for this article when reviewing a PR with imports merged across groups, setting up `rustfmt.toml` for `group_imports` / `imports_granularity` / `reorder_imports`, hitting the nightly-only surprise with `cargo fmt`, or deciding where internal-enterprise crates go relative to public dependencies.

# Import ordering and `rustfmt`

Rust's de-facto import order has five groups, in this exact sequence:

1. `std` (also `core`, `alloc`)
2. External crates (the ones in `[dependencies]`)
3. Workspace member crates
4. `super::`
5. `crate::`

One blank line between groups, no blank lines within a group. Stable Rust's `cargo fmt` does not reorder imports automatically — you need either nightly or manual discipline. Configure once, then forget.

## Canonical example

```rust
// std
use std::sync::Arc;

// external crates
use chrono::Utc;
use juniper::{FieldError, FieldResult};
use uuid::Uuid;

// workspace crates (own crates that live in the same Cargo workspace)
use broker::database::PooledConnection;

// super:: / crate::
use super::schema::{Context, Payload};
use super::update::convert_publish_payload;
use crate::models::Event;
```

## `rustfmt.toml` recipe

Drop this in the workspace root:

```toml
reorder_imports = true
imports_granularity = "Crate"
group_imports = "StdExternalCrate"
```

What each does:

- `reorder_imports = true` — sort within each group alphabetically.
- `imports_granularity = "Crate"` — collapse multiple `use foo::a; use foo::b;` into `use foo::{a, b};`.
- `group_imports = "StdExternalCrate"` — apply the std → external → crate grouping.

**As of Rust 1.88, the import-sorting options require nightly rustfmt.** Run formatting with:

```bash
cargo +nightly fmt
```

Add this to CI and to a pre-commit hook. Enforcing on every commit removes the manual-discipline tax.

## Variant: enterprise / monorepo crates

If your org publishes a family of crates (e.g. `acme-*`) you want grouped just after `std` so they read as "trusted internal" before "third party":

```rust
// std
use std::sync::Arc;

// internal / enterprise crates
use acme_logging::tracer;
use acme_metrics::Counter;

// external crates
use chrono::Utc;
use juniper::{FieldError, FieldResult};

// workspace crates
use broker::database::PooledConnection;

// super:: / crate::
use super::schema::{Context, Payload};
use crate::models::Event;
```

`group_imports = "StdExternalCrate"` doesn't auto-detect the internal-enterprise group — you maintain that section manually with blank lines. If your team needs it consistent, write a custom `rustfmt` skip-list or use a project-specific lint script.

## When NOT to apply

- Generated code. Don't fight `prost`, `tonic-build`, `bindgen` output. Add `#[rustfmt::skip]` at the top of generated modules or exclude them via `rustfmt.toml`'s `ignore` list.
- A single-file binary script (Cargo.toml + main.rs, no modules). The grouping value is real but small; the formatter still helps.

## Common failure modes

- **CI fails on a contributor's machine but not yours.** They're running stable `rustfmt`; sorting only happens on nightly. Make `cargo +nightly fmt --check` part of CI.
- **Massive PR diff after running `cargo +nightly fmt` for the first time.** Land it as a single, isolated commit titled `chore: format imports` so reviewers can skip the diff and `git blame` survives.
- **Mixed groups creep back in.** Pre-commit hook or `cargo fmt --check` in CI catches it. Without enforcement, drift is guaranteed.
- **Re-exports (`pub use ...`) between sections.** They follow the same grouping rules. Don't park them at the end of the file unless the whole module is a re-export façade — in which case the file should be mostly `pub use` and very little else.
- **`use super::*;` glob imports.** Allowed inside `#[cfg(test)] mod tests { ... }`. Banned everywhere else — they hide the source of names and make refactors painful.
