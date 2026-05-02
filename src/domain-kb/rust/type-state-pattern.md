---
name: type-state-pattern
description: Encode state transitions with `PhantomData` markers so invalid calls fail at compile time in Rust.
license: MIT
last_reviewed: 2026-05-02
---

# Type-state pattern

Type-state encodes a state machine in types. Each state is a zero-sized marker; methods exist only on the states where they're valid; transitions consume `self` and return a different state. Invalid sequences become **compile errors**, not runtime panics.

The pattern is verbose. Use it where compile-time enforcement saves real bugs — not for stylistic reasons.

## When to apply

Reach for type-state when:

- The API has clear, sequential states (uninitialized → opened → closed; disconnected → connected → authenticated).
- Calling a method in the wrong state would be a meaningful bug.
- The states have **different methods**, not just different runtime behavior of the same methods.
- A library where users cannot be trusted to read the docs about ordering.
- Builders where some fields are required and the caller currently learns about omissions only at runtime.

## When NOT to apply

- The states have the same methods and only differ in data — use a runtime enum field.
- The state transitions are non-linear with many cross-edges — generic explosion makes the code unreadable.
- The state is short-lived and the runtime check is cheap and obvious — `if connection.is_open() { ... }` is fine.
- You'd be adding `PhantomData` solely to look clever in a small CRUD codebase.

## The core mechanic

```rust
use std::marker::PhantomData;

struct Disconnected;
struct Connected;

struct Client<State> {
    stream: Option<std::net::TcpStream>,
    _state: PhantomData<State>,
}

impl Client<Disconnected> {
    fn connect(addr: &str) -> std::io::Result<Client<Connected>> {
        let stream = std::net::TcpStream::connect(addr)?;
        Ok(Client {
            stream: Some(stream),
            _state: PhantomData,
        })
    }
}

impl Client<Connected> {
    fn send(&mut self, msg: &str) -> std::io::Result<()> {
        use std::io::Write;
        let stream = self.stream.as_mut().expect("connected => stream is Some");
        stream.write_all(msg.as_bytes())
    }
}
```

What this buys you: `client.send(...)` does not compile when `client: Client<Disconnected>`. You cannot accidentally call it before `connect()`.

`PhantomData<State>` is zero-sized — no runtime cost, no extra memory. The state lives only in the type system.

The `Option<TcpStream>` + `expect("...")` pair is the standard escape hatch: structurally the field must be present in `Client<Connected>`, but the type system can't express "this field is `Some` only in this state" without using the same generic on the field. The unreachable-style `expect` documents the invariant.

## File-open state machine

```rust
use std::{io, path::{Path, PathBuf}};

struct FileNotOpened;
struct FileOpened;

struct File<State> {
    path: PathBuf,
    handle: Option<std::fs::File>,
    _state: std::marker::PhantomData<State>,
}

impl File<FileNotOpened> {
    fn open(path: &Path) -> io::Result<File<FileOpened>> {
        let file = std::fs::File::open(path)?;
        Ok(File {
            path: path.to_path_buf(),
            handle: Some(file),
            _state: std::marker::PhantomData,
        })
    }
}

impl File<FileOpened> {
    fn read(&mut self) -> io::Result<String> {
        use io::Read;
        let mut content = String::new();
        let handle = self
            .handle
            .as_mut()
            .expect("invariant: FileOpened => handle is Some");
        handle.read_to_string(&mut content)?;
        Ok(content)
    }

    fn path(&self) -> &PathBuf {
        &self.path
    }
}
```

Notes:

- `open` is the **only constructor**. Users cannot manufacture a `File<FileOpened>` without going through `open`.
- `read` and `path` exist only on the opened state. Calling `read` on `File<FileNotOpened>` is a type error.

## Builder with required fields

The classic application: a builder where some fields must be set and one field is optional. Type-state encodes the requirement:

```rust
use std::marker::PhantomData;

struct MissingName;
struct NameSet;
struct MissingAge;
struct AgeSet;

#[derive(Debug)]
struct Person {
    name: String,
    age: u8,
    email: Option<String>,
}

struct Builder<NameState, AgeState> {
    name: Option<String>,
    age: u8,
    email: Option<String>,
    _name: PhantomData<NameState>,
    _age: PhantomData<AgeState>,
}

impl Builder<MissingName, MissingAge> {
    fn new() -> Self {
        Builder {
            name: None,
            age: 0,
            email: None,
            _name: PhantomData,
            _age: PhantomData,
        }
    }

    fn name(self, name: String) -> Builder<NameSet, MissingAge> {
        Builder {
            name: Some(name),
            age: self.age,
            email: self.email,
            _name: PhantomData,
            _age: PhantomData,
        }
    }

    fn age(self, age: u8) -> Builder<MissingName, AgeSet> {
        Builder {
            name: self.name,
            age,
            email: self.email,
            _name: PhantomData,
            _age: PhantomData,
        }
    }
}

impl Builder<NameSet, MissingAge> {
    fn age(self, age: u8) -> Builder<NameSet, AgeSet> {
        Builder {
            name: self.name,
            age,
            email: self.email,
            _name: PhantomData,
            _age: PhantomData,
        }
    }
}

impl Builder<MissingName, AgeSet> {
    fn name(self, name: String) -> Builder<NameSet, AgeSet> {
        Builder {
            name: Some(name),
            age: self.age,
            email: self.email,
            _name: PhantomData,
            _age: PhantomData,
        }
    }
}

// Optional field — available regardless of required-field state
impl<N, A> Builder<N, A> {
    fn email(mut self, email: String) -> Self {
        self.email = Some(email);
        self
    }
}

impl Builder<NameSet, AgeSet> {
    fn build(self) -> Person {
        Person {
            name: self.name.expect("invariant: NameSet => name is Some"),
            age: self.age,
            email: self.email,
        }
    }
}
```

Usage:

```rust
// OK
let p = Builder::new().name("Alex".into()).age(30).build();
let p = Builder::new().age(30).name("Alex".into()).build();
let p = Builder::new().age(30).email("a@b.com".into()).name("Alex".into()).build();

// Compile errors
let p = Builder::new().build();                        // missing name and age
let p = Builder::new().name("Alex".into()).build();    // missing age
let p = Builder::new().age(30).build();                // missing name
```

Compare with a runtime builder, where the same misuses would compile and panic on `.build()` — or worse, return a `Result` that callers forget to check.

## When the trait-object route is wrong

Type-state is monomorphic by design. You can't `Box<dyn ...>` a `Client<Connected>` and a `Client<Disconnected>` into the same vector — they are distinct types. If you need to store mixed-state instances, type-state is the wrong tool. Use a runtime enum or a trait + dyn.

## When NOT to apply (specific anti-patterns)

- A trivial two-state setup with two methods total. The runtime `enum State { A, B }` is shorter and just as safe in practice.
- States that need to return values whose type depends on the state. The "different methods on different states" model breaks; you end up with `unsafe` or `Result<Either<A, B>>`-style returns.
- Public APIs where simplicity is the product. Every consumer now has to learn `Foo<NameSet, AgeSet>` etc. If your audience is wide, a runtime check with a clear error message is friendlier.

## Common failure modes

- **Generic explosion.** Two state parameters → 4 impl blocks. Three → 8. The boilerplate compounds. Either reduce dimensions, or accept that this API is for a small, expert audience.
- **`expect("invariant: ...")` everywhere.** Each one is a place the type system can't express the invariant. Acceptable, but document each: a comment explaining what state guarantees the unwrap.
- **Trying to share state-mutating methods across all states.** Use a generic `impl<S> Foo<S> { ... }` block — but only for methods that genuinely apply regardless of state. The optional-field setter in the builder example is a typical case.
- **Trying to put a state-erased `Foo<_>` in a struct field.** You can't; type-erase via a trait or a runtime enum if you must.
- **Adding state-specific data to the `Foo<S>` struct.** The data lives on the struct regardless of `S`; the type only gates *methods*. If a connection's session token only exists in `Authenticated`, factor it into a separate `AuthenticatedConnection` struct that the transition method returns.
