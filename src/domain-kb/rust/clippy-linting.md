---
name: clippy-linting
description: Configure and enforce clippy in a Rust project with CI-ready lint discipline.
license: MIT
last_reviewed: 2026-05-02
---

**When to use:** Reach for this article when setting up clippy for a new Rust project, wiring `cargo clippy` into CI, debating `#[allow]` vs `#[expect]`, seeing `redundant_clone` / `large_enum_variant` / `needless_collect` / `clone_on_copy` / `manual_ok_or` warnings, enabling `clippy::pedantic` workspace-wide, or investigating why `cargo clippy` is silent in CI.

# Clippy and lint discipline

Clippy is not optional. It catches clones, allocations, and idiom drift that the base compiler ignores. Run it every commit, fail CI on warnings, and resolve — never silence — the high-signal lints.

## The daily-driver command

```bash
cargo clippy --all-targets --all-features --locked -- -D warnings
```

What each flag does:

| Flag | Why |
|---|---|
| `--all-targets` | Lints lib + tests + benches + examples. Without it, your test code is unchecked. |
| `--all-features` | Catches feature-gated code that only compiles with certain combinations. |
| `--locked` | Fails if `Cargo.lock` is out of date. Forces you to commit lock changes deliberately. |
| `-- -D warnings` | Treats every warning as an error. CI will fail; that's the point. |

Optional escalation tiers:

```bash
# Strict: opinionated lints, accept some false positives
cargo clippy --all-targets --all-features -- -D warnings -W clippy::pedantic

# Frontier: lints still in development; useful in libraries you maintain
cargo clippy --all-targets -- -W clippy::nursery
```

Wire the daily-driver command into:

- A pre-commit hook (or `cargo xtask lint` if your repo has an xtask).
- CI, blocking on failure.
- Your editor's on-save action.

If clippy isn't installed: `rustup component add clippy`.

## Lints to never silence

These are the high-signal ones. If they fire, fix them rather than suppress:

| Lint | What it catches | Why it matters |
|---|---|---|
| `redundant_clone` | `.clone()` whose result is immediately dropped or could be a borrow | Direct perf cost. Clippy's analysis already proves it's redundant. |
| `clone_on_copy` | `.clone()` on a `Copy` type | The `Copy` trait already gives you a copy for free. |
| `needless_collect` | `.collect::<Vec<_>>()` only to iterate again | Allocates a vector that exists for one line. |
| `large_enum_variant` | One variant of an enum is much bigger than the others | Every value of the enum carries the largest size. Box the fat variant. |
| `unnecessary_wraps` | Function always returns `Some(...)` / `Ok(...)` | The `Option`/`Result` is dead weight; remove it. |
| `manual_ok_or` | `match` reimplementing `.ok_or(err)` | Use `.ok_or` / `.ok_or_else`. |
| `needless_borrow` | `&` where deref coercion already applies | Pure noise. |
| `map_unwrap_or` / `unnecessary_map_or` / `unnecessary_result_map_or_else` | Verbose `Option`/`Result` chains | The replacement is shorter and clearer. |

## `expect` over `allow`

When clippy is genuinely wrong for a specific line, prefer `#[expect]` to `#[allow]`. `expect` tells the compiler the lint is *expected to fire* — if a future refactor makes the lint stop firing, the compiler now warns you, and the suppression goes away.

```rust
// Faster matching is preferred over size efficiency on this hot path.
#[expect(clippy::large_enum_variant)]
enum Message {
    Code(u8),
    Content([u8; 1024]),
}
```

`#[allow(clippy::lint)]` lets the lint suppression linger forever, even after it stops applying. Use `allow` only when the suppression is fundamental (e.g. inherent to the language version) and you don't want a future warning.

Three rules for any suppression:

1. **Local scope.** Annotate the smallest item — one function, one struct, one statement. Never crate-global.
2. **A justification comment** that explains *why* the lint is wrong here.
3. **Exact lint name.** Don't blanket-allow `clippy::all`.

## `Cargo.toml` `[lints]` config

For a single package:

```toml
[lints.rust]
future-incompatible = "warn"
nonstandard_style = "deny"

[lints.clippy]
all = { level = "deny", priority = 10 }
redundant_clone = { level = "deny", priority = 9 }
manual_while_let_some = { level = "deny", priority = 4 }
pedantic = { level = "warn", priority = 3 }
```

For a workspace:

```toml
[workspace.lints.rust]
future-incompatible = "warn"
nonstandard_style = "deny"

[workspace.lints.clippy]
all = { level = "deny", priority = 10 }
redundant_clone = { level = "deny", priority = 9 }
manual_while_let_some = { level = "deny", priority = 4 }
pedantic = { level = "warn", priority = 3 }
```

Then in each member crate:

```toml
[lints]
workspace = true
```

`priority` resolves conflicts between groups: higher priority wins. The pattern above sets `clippy::all = deny` at priority 10, with specific overrides at lower priorities only when you want to *un-deny* something (rarely).

## When NOT to enable a strict lint group

- `clippy::pedantic` and `clippy::nursery` have known false positives. Enabling them as `deny` workspace-wide produces a stream of suppressions and morale damage. Set them to `warn` and address them gradually, or scope them to libraries you maintain tightly.
- `clippy::cargo` flags `Cargo.toml` issues — useful, but its warnings are noisy in early-stage projects. Tune.
- Don't enable `clippy::restriction` group. It's a menu of stylistic lints that contradict each other on purpose. Pick individual lints from it.

## When to handle a false positive

1. **Refactor.** Often the lint is right but the structure is awkward. A small rewrite removes both the lint and the smell.
2. **Local `expect` with comment.** `#[expect(clippy::lint_name)] // <why>`.
3. **Avoid global config changes.** Crate-level `allow` for one occurrence is overreach. Only flip a workspace lint when the lint truly doesn't fit your project (rare).

## Common failure modes

- **CI passes locally but fails after a clippy version bump.** Clippy gains lints between Rust releases. Pin Rust toolchain in CI (e.g. `rust-toolchain.toml`) and bump deliberately.
- **`cargo clippy` runs but reports nothing.** It's caching old results. Run `cargo clippy --all-targets --all-features` (without `--locked`) once to refresh, or `cargo clean` if all else fails.
- **Hundreds of warnings on a legacy codebase.** Don't chase the count. Set a baseline (`-W warnings` first, fix one lint group at a time), then transition to `-D warnings` once the floor is at zero.
- **Suppressing `redundant_clone` because "it works."** Clippy proved the clone is unused. Suppressing it leaves the perf bug behind and signals that the rule is negotiable. Fix it.
- **Forgetting `--all-targets`.** Tests then drift in style. Either include it in CI or run a separate `cargo clippy --tests` job.
