---
name: tls-handshake-debugging
description: Diagnose TLS handshake failures in Rust gRPC/HTTP clients.
license: MIT
last_reviewed: 2026-05-11
---

# TLS handshake debugging — methodology + recipes

## When to use

Apply this when a TLS connection fails in a Rust client using rustls, tokio-rustls, tonic, or hyper. Common triggers: `"Connection reset by peer"` (errno 54 macOS / errno 104 Linux), `EPIPE` (errno 32), `"transport error"`, SNI/SAN/ALPN negotiation failures, certificate-chain errors, or cert-pinning rejections.

## Why probe before patching

A TLS handshake that fails can break at five different layers: TCP, the network edge (middleboxes, CDNs, jurisdictional filters), the TLS record layer (protocol version / cipher / extension negotiation), the cert chain (trust anchors, SAN/CN, expiry), and the post-handshake protocol (ALPN, h2 framing). Each layer presents differently. Each requires a different fix.

When the only signal is a vague client-side error like `transport error`, the temptation is to start patching the most-recently-touched component (usually the client TLS config). That guesses the layer. Probing with raw tools localizes the layer in under a minute.

The bias to remember: **a connection reset early in the handshake almost always means the bug is not in the TLS state machine of either party**. It means a TCP layer, a middlebox, or an explicit server-side close fired before either side could complete the handshake. No amount of client-side rustls config tuning will fix that.

## Step 1 — Read the full error chain

Most Rust TLS errors arrive wrapped in `Box<dyn Error>` from tonic / hyper / reqwest. The wrapper text (`"transport error"`) is uninformative. Walk the source chain:

```rust
let mut chain = format!("{}", e);
let mut src = e.source();
while let Some(s) = src {
    chain.push_str(&format!(" -> {}", s));
    src = s.source();
}
tracing::debug!(chain = %chain, "error detail");
```

Map error fragments to layers before doing anything else:

| Error fragment | Layer | Implication |
|---|---|---|
| `Connection reset by peer` (errno 54 macOS, errno 104 Linux) early | TCP / network edge | Peer or middlebox closed before TLS progressed. Client patches will not help. |
| `broken pipe` (errno 32) | TCP | Same: peer closed unilaterally. |
| `os error 60` / "Operation timed out" | Network reachability | TCP didn't establish. Firewall, routing, or wrong port. |
| `invalid peer certificate: certificate not valid for name X` | rustls SAN check | Client `ServerName` doesn't match cert SAN. Hostname or cert problem. |
| `UnknownIssuer` / `InvalidCertificate(UnknownIssuer)` | Trust roots | CA chain missing. Add native roots or pin a CA. |
| `BadCertificate` / `expired` / `not yet valid` | Cert lifecycle | Server-side issue. |
| ALPN-related ("h2 not negotiated", "ALPN protocol mismatch") | ALPN | Server didn't offer the protocol the client required. Often a crypto-provider or server-config issue. |
| Tonic `HttpsUriWithoutTlsSupport` | Library config | `connect_with_connector` was called with `https://` but no `ClientTlsConfig` was set. |
| Handshake hangs past `connect_timeout` | Network or middlebox | Run the probe matrix to localize. |

A handshake error that surfaces as `transport error` is a starting point, not a diagnosis.

## Step 2 — Probe matrix

Hold the target constant. Vary one TLS variable per probe. Read the result pattern, not any single line.

```bash
HOST=example.com
PORT=443

# 1. TCP reachability — separate pipe / firewall problems from TLS problems.
timeout 3 bash -c "</dev/tcp/$HOST/$PORT" && echo TCP_OK || echo TCP_FAIL

# 2. Default handshake — what a normal client does.
timeout 5 bash -c "echo | openssl s_client -connect $HOST:$PORT -servername $HOST -alpn h2 -brief 2>&1" | head -10

# 3. Drop ALPN — isolates ALPN as the trigger.
timeout 5 bash -c "echo | openssl s_client -connect $HOST:$PORT -servername $HOST -brief 2>&1" | head -10

# 4. Wrong SNI — isolates SNI-name as the trigger.
timeout 5 bash -c "echo | openssl s_client -connect $HOST:$PORT -servername unrelated.example -brief 2>&1" | head -10

# 5. No SNI at all — isolates SNI-extension as the trigger.
timeout 5 bash -c "echo | openssl s_client -connect $HOST:$PORT -noservername -brief 2>&1" | head -10

# 6. Force TLS version if you suspect version negotiation.
timeout 5 bash -c "echo | openssl s_client -connect $HOST:$PORT -servername $HOST -tls1_2 -brief 2>&1" | head -10
timeout 5 bash -c "echo | openssl s_client -connect $HOST:$PORT -servername $HOST -tls1_3 -brief 2>&1" | head -10

# 7. Run the same #2 with a different client to rule out client-side bugs.
timeout 8 curl -v --connect-timeout 5 https://$HOST:$PORT/ 2>&1 | head -30
timeout 8 gnutls-cli --priority NORMAL $HOST -p $PORT </dev/null 2>&1 | head -20
```

Read the matrix as a truth table. Common patterns:

| #2 default | #3 no ALPN | #4 wrong SNI | #5 no SNI | Conclusion |
|---|---|---|---|---|
| ✗ | ✗ | ✗ | ✗ | TCP reachable but every TLS attempt rejected. Middlebox blocking all TLS, or TLS not actually offered on this port. |
| ✗ | ✗ | ✓ | ✓ | **SNI-name filter**. The hostname triggers the reset. The wire format is identical otherwise. |
| ✗ | ✗ | ✗ | ✓ | **SNI-extension filter**. Any SNI triggers the reset; absence is allowed. Rarer but seen on legacy middleboxes. |
| ✗ | ✓ | ✓ | ✓ | ALPN is the trigger. The server can't, or refuses to, negotiate the requested protocol. |
| ✓ | ✓ | ✓ | ✓ | Server is healthy. The bug is in the client. Look at trust roots, cipher suites, crypto provider, ServerName construction. |
| ✓ in openssl/curl, ✗ only in your client | — | — | — | Client-side bug. Diff the ClientHello (capture with `tcpdump -i any -w out.pcap port $PORT`, open in Wireshark). |

A reset that's conditional on SNI content (#2 fails, #4 succeeds) is the signature of a network operator or hosting-provider filter keyed to the hostname — not a TLS protocol bug.

## Step 3 — Recipes for known patterns

These are illustrative snippets, not drop-in modules. Adapt the names and types to the codebase.

### 3a. SNI-stripped handshake (when the matrix shows SNI is the trigger)

The right long-term fix is server-side (proper hosting-provider filings, fronting with a different CDN, picking a less-blocked hostname). The client-side workaround: send no SNI extension, but still validate the cert SAN against the expected hostname.

In rustls 0.23 the toggle is a public field on `ClientConfig`:

```rust
use std::sync::Arc;
use rustls::pki_types::ServerName;
use rustls::{ClientConfig, RootCertStore};
use tokio_rustls::TlsConnector;

fn build_skip_sni_config(roots: RootCertStore) -> ClientConfig {
    let mut config = ClientConfig::builder_with_provider(Arc::new(
        rustls::crypto::aws_lc_rs::default_provider(),
    ))
    .with_safe_default_protocol_versions()
    .unwrap()
    .with_root_certificates(roots)
    .with_no_client_auth();

    // Suppress the SNI extension. The ServerName below is then used for
    // SAN verification only -- it never goes on the wire.
    config.enable_sni = false;
    config.alpn_protocols = vec![b"h2".to_vec()];
    config
}

// At connect time:
let tls = TlsConnector::from(Arc::new(config))
    .connect(ServerName::try_from(hostname.to_string())?, tcp_stream)
    .await?;
```

Notes worth remembering:
- `ServerName::IpAddress(...)` also suppresses SNI as a side effect — but then the standard verifier checks the cert for IP SANs, which usually fails. Almost always you want `ServerName::DnsName(...)` plus `enable_sni = false`.
- `tonic::transport::ClientTlsConfig::domain_name(...)` couples SNI and SAN-check into one value with no escape hatch in the high-level API. To decouple them, build the rustls config yourself and use `Endpoint::connect_with_connector`.

### 3b. Custom connector for tonic (when you need full control over the TLS stack)

```rust
use std::future::Future;
use std::pin::Pin;
use std::sync::Arc;
use std::task::{Context, Poll};

use hyper_util::rt::TokioIo;
use rustls::pki_types::ServerName;
use rustls::ClientConfig;
use tokio::net::TcpStream;
use tokio_rustls::TlsConnector;
use tonic::codegen::http::Uri;
use tower::Service;

#[derive(Clone)]
struct CustomTlsConnector {
    config: Arc<ClientConfig>,
    server_name: ServerName<'static>,
}

impl Service<Uri> for CustomTlsConnector {
    type Response = TokioIo<tokio_rustls::client::TlsStream<TcpStream>>;
    type Error = Box<dyn std::error::Error + Send + Sync>;
    type Future = Pin<Box<dyn Future<Output = Result<Self::Response, Self::Error>> + Send>>;

    fn poll_ready(&mut self, _cx: &mut Context<'_>) -> Poll<Result<(), Self::Error>> {
        Poll::Ready(Ok(()))
    }

    fn call(&mut self, uri: Uri) -> Self::Future {
        let config = self.config.clone();
        let server_name = self.server_name.clone();
        Box::pin(async move {
            let host = uri.host().ok_or("uri missing host")?.to_string();
            let port = uri.port_u16().unwrap_or(443);
            let tcp = TcpStream::connect((host.as_str(), port)).await?;
            tcp.set_nodelay(true).ok();
            let tls = TlsConnector::from(config).connect(server_name, tcp).await?;
            // Verify ALPN if the upper layer requires it (tonic requires h2).
            let (_, session) = tls.get_ref();
            if session.alpn_protocol() != Some(b"h2") {
                return Err("ALPN h2 not negotiated".into());
            }
            Ok(TokioIo::new(tls))
        })
    }
}

// Wire it into tonic. The URI scheme is `http://` because this connector
// already produces a fully-formed TLS stream -- a `https://` scheme makes
// tonic's connector wrapper try to layer its own TLS and fail with
// `HttpsUriWithoutTlsSupport`.
let endpoint = tonic::transport::Endpoint::from_shared(format!("http://{host}:{port}"))?;
let channel = endpoint.connect_with_connector(connector).await?;
```

The `http://` quirk catches everyone once. It is a tonic 0.14 implementation detail: the connector wrapper checks the scheme and tries to do TLS itself if it sees `https://`.

### 3c. Native trust roots without `tonic`'s `tls-native-roots` feature

```rust
use rustls::RootCertStore;

let mut roots = RootCertStore::empty();
let result = rustls_native_certs::load_native_certs();
if !result.errors.is_empty() {
    tracing::debug!(errors = ?result.errors, "non-fatal native cert load errors");
}
let (added, ignored) = roots.add_parsable_certificates(result.certs);
tracing::debug!(added, ignored, "loaded native trust roots");
```

`rustls-native-certs` is the same crate tonic uses internally for `tls-native-roots`. Adding it as a direct dep is fine when you're building your own `ClientConfig`.

## Step 4 — When NOT to apply SNI suppression

`enable_sni = false` is opt-in for one host, not a global default. Skip it when:

- The server uses **SNI-based virtual hosting** (multiple certs on one IP/port). Without SNI the server can't pick the right cert; you'll get the default one and the SAN check fails.
- The endpoint sits behind a **public CDN with TLS fingerprinting** (Cloudflare, Akamai, Fastly, CloudFront). They sometimes flag or block clients that omit SNI.
- The diagnosis from the probe matrix is **not** SNI-conditional. Disabling SNI to fix an unrelated cert or ALPN issue just makes future debugging harder.
- The user's environment uses **mTLS** with SNI-based client routing on the server side.

Document the workaround as region- or endpoint-specific, behind a config flag, off by default.

## Step 5 — Verify at every protocol layer, not just one

A handshake change can pass the lowest layer and still break upper layers. After any TLS change, confirm three things:

1. **TCP+TLS up**: client logs the equivalent of "connected" — handshake completed.
2. **HTTP/2 framing**: a unary request/response round-trips. ALPN downgrades and h2 framing bugs hide here. Heartbeats, health checks, or simple GETs work for this.
3. **Streaming**: a server-streaming or bidi-streaming RPC stays open and delivers frames. ALPN downgrades that pass unary often surface as immediate stream resets, `FRAME_SIZE_ERROR`, or "connection lost (server went away)".

A handshake that completes but breaks streaming is a real and recurring failure mode. Don't declare victory on the first INFO log.

## Quick checklist when the user reports a TLS bug

1. Get the **full error source chain**. Don't accept the wrapper. Walk `e.source()`.
2. Map the chain fragment to a layer using the table in Step 1. State the suspected layer out loud.
3. **Run the Step 2 probe matrix** from the same network the failure was observed on. Diagnose from the result pattern, not from any single probe.
4. If the matrix points at server- or network-edge filtering, look for an existing workaround in the codebase before writing one.
5. If the bug is genuinely client-side, name the offending file and line before editing.
6. Verify at all three protocol layers (Step 5) before closing out.

The probe matrix takes a minute. Patching the wrong layer takes hours and pollutes the commit history with fixes that didn't fix anything. Probe first.
