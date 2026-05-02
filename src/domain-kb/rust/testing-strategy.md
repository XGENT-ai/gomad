---
name: testing-strategy
description: Structure Rust tests with descriptive names, snapshot testing, and parameterized cases.
license: MIT
last_reviewed: 2026-05-02
---

**When to use:** Reach for this article when naming tests like `test_add_happy_path`, packing multiple `assert!` calls into one function, deciding whether a test belongs in the module or under `tests/`, wondering if `cargo test` runs doc tests, or choosing between `cargo insta` and raw `assert_eq!`.

# Testing strategy

Tests are the first place readers look to learn how a function is used. Optimize them for that — descriptive names, one behavior each, simple setup. Reserve fancy tooling (`insta`, `rstest`) for cases where it pays for itself.

## Three test homes

| Home | Path | Sees | Use for |
|---|---|---|---|
| Unit tests | `#[cfg(test)] mod tests { ... }` inside the module under test | Private + `pub(crate)` items | Implementation details, edge cases, error paths |
| Integration tests | `tests/<name>.rs` | Public API only | Component interactions, end-to-end-ish flows, use of the crate as an external user would |
| Doc tests | `///` examples in doc comments | Public API only | Documenting how to use a function; correctness of examples |

Three rules of thumb:

- For binaries, split logic into `src/lib.rs` and the launcher into `src/main.rs`. Tests then sit on `lib.rs` and integration tests can exercise both layers.
- Doc tests run with `cargo test` but **not** with `cargo nextest`. If you switched to `nextest`, run `cargo test --doc` separately.
- Duplicate coverage between unit and doc tests is fine; the audiences differ.

## Naming

The output of `cargo test` should read as a sentence. The pattern that scales:

- The test module name is the function under test.
- The test fn name is the behavior, in the form `<should_X>_<when_Y>` or `<does_X>_<when_Y>`.

```rust
#[cfg(test)]
mod tests {
    mod process {
        use super::super::*;

        #[test]
        fn returns_blob_when_b_larger_than_a() {
            let a = setup_a_to_be_xyz();
            let b = Some(2);
            let expected = MyExpectedStruct { /* ... */ };

            let result = process(a, b).unwrap();

            assert_eq!(result, expected);
        }

        #[test]
        fn returns_invalid_input_error_when_a_and_b_missing() {
            let result = process(None, None).unwrap_err();
            assert_eq!(result, MyError::InvalidInput);
        }
    }
}
```

`cargo test process::` then runs every test for `process`. IDE gutters give you a per-test ▶️ button.

What to avoid:

- `test_add_happy_path()` — happy path of *what* assertion?
- `test1`, `test2`, `case_one` — meaningless.
- `test_add()` containing ten `assert!`s — one failure stops the test; you fix one and re-run; the other nine are still hidden.

## One assertion per test (when feasible)

Multiple asserts in one test means the second failure is invisible until you fix the first. Split into per-behavior tests, or use `rstest` for parameterized cases:

```rust
// Bad — one failure hides the others
#[test]
fn test_valid_inputs() {
    assert!(parse("a").is_ok());
    assert!(parse("ab").is_ok());
    assert!(parse("ba").is_ok());
    assert!(parse("bab").is_ok());
}

// Good — explicit cases with names
#[rstest]
#[case::single("a")]
#[case::first_letter("ab")]
#[case::last_letter("ba")]
#[case::in_the_middle("bab")]
fn parse_accepts_strings_containing_a(#[case] input: &str) {
    assert!(parse(input).is_ok());
}
```

`rstest` trade-offs:

- Pros: zero boilerplate, named cases show in test output.
- Cons: IDE gutter integration is weaker; "expected" comes before "actual" in case attributes which inverts the usual reading.

For tests that legitimately need to assert several things about one outcome (a returned struct, a snapshot), use a snapshot or a multi-field equality on a single struct — that's still one logical assertion.

## Useful `assert!` patterns

`assert!` and `assert_eq!` accept a format string for failure messages:

```rust
assert!(
    Thing::parse("abcd").is_ok(),
    "Thing::parse(\"abcd\") failed: {:?}",
    Thing::parse("abcd").unwrap_err()
);
```

When you don't care about the inner value, use `matches!`:

```rust
assert!(
    matches!(err, MyError::BadInput(_)),
    "Expected MyError::BadInput, got {err:?}"
);
```

Two crates that pay for themselves:

- `pretty_assertions` — overrides `assert_eq!` and `assert_ne!` with colored diffs. Drop in, no other changes.
- `rstest` — parameterized cases (above).

## Snapshot testing with `cargo insta`

When the output is structural — generated code, JSON, HTML, CLI output — comparing against a saved "golden" file beats writing 50 `assert_eq!` calls.

Setup:

```toml
[dev-dependencies]
insta = { version = "1.42", features = ["yaml"] }
```

```bash
cargo install cargo-insta   # for review UX
```

Write a snapshot:

```rust
fn split_words(s: &str) -> Vec<&str> {
    s.split_whitespace().collect()
}

#[test]
fn split_words_handles_simple_input() {
    let words = split_words("hello from the other side");
    insta::assert_yaml_snapshot!(words);
}
```

Workflow:

```bash
cargo insta test    # runs tests, captures snapshots
cargo insta review  # interactively accept / reject diffs
```

YAML snapshots are best for diff review; enable the `yaml` feature.

### Use snapshots for…

- Generated code.
- Serialized data with non-trivial structure.
- Rendered HTML or CLI output.
- API responses (with redactions for unstable fields).

### Don't snapshot…

- Primitives (`assert_eq!(meaning, 42)` is clearer).
- Tiny structs (`assert_eq!` is clearer and reviewable).
- Critical-path logic that needs precise per-field assertions.
- External-resource output without mocks. Snapshot of a live API will flake.

### Naming and redaction

Name your snapshots so the file is searchable:

```rust
insta::assert_snapshot!("app_config_http", whole_app_config.http);
```

Redact volatile fields (timestamps, UUIDs):

```rust
use insta::assert_json_snapshot;

#[test]
fn endpoint_get_user_data() {
    let data = http_client.get_user_data();
    assert_json_snapshot!(
        "endpoints/get_user_data",
        data,
        ".created_at" => "[timestamp]",
        ".id" => "[uuid]",
    );
}
```

Commit `snapshots/` to git. Review diffs deliberately — accepting carelessly defeats the point.

## Doc test attributes

```rust
/// ```             // default: compiles + runs
/// ```ignore       // skipped (rare; usually use `text` for non-Rust blocks)
/// ```no_run       // compiles but doesn't run (side effects, network, etc.)
/// ```compile_fail // expected to fail compilation (demonstrating a misuse)
/// ```should_panic // expected to panic at runtime
/// ```
```

Hide setup lines with leading `# `:

```rust
/// ```
/// # use crate_name::generic_add;
/// # assert_eq!(
/// generic_add(5.2, 4) // => 9.2
/// # , 9.2);
/// ```
```

## When NOT to test

- Trivial wrappers around stdlib. `fn first(v: &[i32]) -> Option<&i32> { v.first() }` doesn't need a test.
- Code that's about to be rewritten.
- The test would essentially repeat the implementation.

## Common failure modes

- **One mega-test with ten asserts.** First failure hides the rest. Split.
- **Snapshot of a primitive.** `assert_eq!` is clearer and reviewers don't have to open a `.snap` file.
- **Snapshot of a giant object.** Diffs become unreviewable. Snapshot subsections instead.
- **Snapshot with timestamps not redacted.** Test goes red on every CI run. Add the redaction.
- **`#[ignore]` left in indefinitely.** If the test is ignored "until X is fixed," file an issue and reference it: `#[ignore = "blocked by #123"]`.
- **`#[should_panic]` used for tests of error returns.** A panic and a `Result::Err` are not the same. Use `unwrap_err()` and assert on the value.
- **Tests sharing mutable global state.** Flaky on parallel runners. Use per-test `tempfile`, isolated DB schemas, or run that suite single-threaded with `--test-threads=1`.
- **Integration tests reaching into private internals.** They can't — that's the boundary. If you need it, the API is wrong; promote a function to `pub(crate)` or split the test.
