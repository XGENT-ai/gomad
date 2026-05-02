---
name: pci-dss-scope
description: Reduce PCI DSS scope using tokenization and hosted fields; pick the right SAQ type.
license: MIT
last_reviewed: 2026-05-02
---

# PCI DSS scope reduction

## When to use

Apply this when building systems that accept payment cards. The goal is to get to SAQ A — the lightest assessment (~20 questions) — by keeping card data entirely off your servers. Anything beyond SAQ A is a choice you're making by handling card data yourself.

## SAQ type selection

| SAQ | What it means | Typical setup |
|---|---|---|
| **A** | You never touch card data — hosted payment page or iFrame does it all | Stripe hosted checkout, PayPal hosted page |
| **A-EP** | You run JavaScript that touches the payment form, even if card data goes to a third party | Stripe Elements / Stripe.js in your DOM |
| **D** | You store, process, or transmit raw card data | Custom card vault, V1 `Charge.create` with card numbers |

**Recommendation**: Use Stripe Checkout (hosted page) → SAQ A. Use Stripe Elements → SAQ A-EP. Build your own card input → SAQ D, which requires 300+ questions and often an onsite audit at scale.

## What you must never store

Even after authorization, these fields are prohibited storage under PCI DSS — no exceptions:

| Field | Why prohibited |
|---|---|
| Full magnetic stripe data (Track 1 / Track 2) | Contains everything needed to clone a card |
| CVV / CVV2 / CVC | Proof of physical card possession; must not persist after auth |
| PIN / PIN block | Direct account access |

You may store (if encrypted at rest):

| Field | Note |
|---|---|
| PAN (card number) | Must be masked when displayed: `4111 11** **** 1111` |
| Cardholder name | |
| Expiration date | |

```python
PROHIBITED_AT_REST = {"cvv", "cvv2", "cvc", "pin", "track_data", "track1", "track2"}

def assert_no_prohibited_fields(data: dict) -> None:
    stored = set(k.lower() for k in data)
    violations = stored & PROHIBITED_AT_REST
    if violations:
        raise ValueError(f"Attempting to store prohibited fields: {violations}")

def mask_pan(pan: str) -> str:
    """Show first 6 and last 4 digits only."""
    return pan[:6] + "*" * (len(pan) - 10) + pan[-4:]

def sanitize_for_log(payload: dict) -> dict:
    safe = payload.copy()
    for field in PROHIBITED_AT_REST:
        safe.pop(field, None)
    if "card_number" in safe:
        safe["card_number"] = mask_pan(safe["card_number"])
    return safe
```

## Tokenization with Stripe.js (recommended)

Card data never touches your server. Stripe tokenizes client-side; your backend only sees the token.

```javascript
// Frontend: collect card data, send token to server
const stripe = Stripe("pk_live_...");
const elements = stripe.elements();
const cardElement = elements.create("card");
cardElement.mount("#card-element");

document.getElementById("pay-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const { paymentMethod, error } = await stripe.createPaymentMethod({
    type: "card",
    card: cardElement,
  });
  if (error) {
    document.getElementById("errors").textContent = error.message;
    return;
  }
  // Send paymentMethod.id to server — never the raw card number
  await fetch("/api/pay", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ payment_method_id: paymentMethod.id }),
  });
});
```

```python
# Backend: charge using the payment method token
import stripe

stripe.api_key = "sk_live_..."

def charge_with_token(payment_method_id: str, amount_cents: int, customer_id: str):
    intent = stripe.PaymentIntent.create(
        amount=amount_cents,
        currency="usd",
        payment_method=payment_method_id,
        customer=customer_id,
        confirm=True,
        automatic_payment_methods={"enabled": True, "allow_redirects": "never"},
    )
    return intent
```

Your server stores `customer_id` and `payment_method_id`. It never sees the card number.

## Custom token vault (if you must store card data)

Only build this if you have a legitimate reason to hold raw PAN — most applications don't. Requires AES-256-GCM and proper key management.

```python
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
import os
import secrets

class CardVault:
    def __init__(self, key: bytes):
        assert len(key) == 32, "Key must be 256 bits"
        self._key = key

    def tokenize(self, pan: str) -> str:
        token = secrets.token_urlsafe(32)
        nonce = os.urandom(12)
        aesgcm = AESGCM(self._key)
        encrypted = aesgcm.encrypt(nonce, pan.encode(), None)
        # Store: token → (nonce + encrypted) in your DB
        self._store(token, nonce + encrypted)
        return token

    def detokenize(self, token: str) -> str:
        blob = self._load(token)
        nonce, ciphertext = blob[:12], blob[12:]
        aesgcm = AESGCM(self._key)
        return aesgcm.decrypt(nonce, ciphertext, None).decode()
```

Key management requirements: store encryption keys in a secrets manager (AWS KMS, HashiCorp Vault), never alongside the encrypted data, and rotate annually.

## Access control

Restrict access to cardholder data to roles that need it. Log every access.

```python
import logging
from datetime import datetime, timezone
from functools import wraps

_audit_log = logging.getLogger("pci.audit")

def require_cardholder_data_access(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        user = current_user()
        if "cardholder_data_read" not in user.roles:
            _audit_log.warning({"event": "access_denied", "user": user.id,
                                "resource": f.__name__, "ts": _now()})
            raise PermissionError("Insufficient role")
        _audit_log.info({"event": "access_granted", "user": user.id,
                         "resource": f.__name__, "ts": _now()})
        return f(*args, **kwargs)
    return wrapper

def _now():
    return datetime.now(timezone.utc).isoformat()
```

Audit logs must be append-only, tamper-evident, and retained for at least 12 months.

## When NOT to use a custom vault

- **If Stripe/Braintree/PayPal tokens satisfy your use case**: use them. Processor tokens are PCI-scoped to SAQ A-EP or better; a custom vault pushes you to SAQ D.
- **If you're not Level 1 or Level 2**: the compliance overhead of a custom vault (quarterly scans, annual ROC/SAQ D) almost never justifies it for < 6 million annual transactions.

## Failure modes

| Problem | Cause | Fix |
|---|---|---|
| CVV logged | Debug logging serializes the full request body | `sanitize_for_log()` before any log call; add a log scrubber |
| Wrong SAQ type | Hosted page replaced with custom JS without audit | Re-assess SAQ whenever checkout UI changes |
| Encryption key in source code | Developer committed `.env` with vault key | Use secrets manager; rotate key immediately if leaked |
| PAN visible in URLs | Card number passed as query param | Never put payment data in URLs |
| Luhn-invalid test numbers in prod DB | Test card used in production | Validate via Luhn before storing; block known test prefixes in prod |
