---
name: stripe-checkout
description: Integrate Stripe Checkout Sessions, subscriptions, and webhooks with idempotent event handling.
license: MIT
last_reviewed: 2026-05-02
---

# Stripe checkout

## When to use

Use this when integrating Stripe into a web or mobile application for one-time payments, subscriptions, or saving payment methods for future charges.

## Checkout Sessions vs Payment Intents

Use **Checkout Sessions** by default. Switch to **Payment Intents** only when you need amount calculations that Checkout can't express (dynamic taxes, multi-currency conversion, complex discounts).

| Criterion | Checkout Session | Payment Intent |
|---|---|---|
| Integration effort | Low — Stripe handles the UI | High — you own the UI and state |
| Maintenance | Stripe updates it automatically | You maintain it across Stripe API versions |
| Built-in features | Line items, tax, shipping, discounts, saved methods | None — you add each |
| Custom UI | `ui_mode='custom'` + Elements | Elements only |
| When it fits | 95% of integrations | Bespoke checkout flows |

## One-time payment (hosted page)

```python
import stripe

stripe.api_key = "sk_live_..."

def create_checkout_session(amount_cents: int, currency: str = "usd") -> str:
    session = stripe.checkout.Session.create(
        line_items=[{
            "price_data": {
                "currency": currency,
                "product_data": {"name": "Order #1234"},
                "unit_amount": amount_cents,
            },
            "quantity": 1,
        }],
        mode="payment",
        success_url="https://example.com/success?session_id={CHECKOUT_SESSION_ID}",
        cancel_url="https://example.com/cancel",
        metadata={"order_id": "1234"},
    )
    return session.url
```

Redirect the user to `session.url`. Stripe handles card input, 3DS, and error display.

## Custom checkout UI (Elements + Checkout Session)

Use `ui_mode='custom'` to embed Stripe's Payment Element in your own page while keeping Checkout Session's built-in line-item and tax logic.

```python
def create_embedded_session(amount_cents: int) -> str:
    session = stripe.checkout.Session.create(
        mode="payment",
        ui_mode="custom",
        line_items=[{
            "price_data": {
                "currency": "usd",
                "product_data": {"name": "Order"},
                "unit_amount": amount_cents,
            },
            "quantity": 1,
        }],
        return_url="https://example.com/complete?session_id={CHECKOUT_SESSION_ID}",
    )
    return session.client_secret  # send to frontend
```

```javascript
const stripe = Stripe("pk_live_...");
const checkout = stripe.initCheckout({ clientSecret });
const actions = (await checkout.loadActions()).actions;

const paymentElement = checkout.createPaymentElement();
paymentElement.mount("#payment-element");

document.getElementById("pay-button").addEventListener("click", async () => {
  const result = await actions.confirm();
  if (result.type === "error") {
    document.getElementById("errors").textContent = result.error.message;
  }
});
```

## Subscription creation

```python
def create_subscription(customer_id: str, price_id: str) -> dict:
    sub = stripe.Subscription.create(
        customer=customer_id,
        items=[{"price": price_id}],
        payment_behavior="default_incomplete",
        payment_settings={"save_default_payment_method": "on_subscription"},
        expand=["latest_invoice.payment_intent"],
    )
    return {
        "subscription_id": sub.id,
        "client_secret": sub.latest_invoice.payment_intent.client_secret,
    }
```

Let the customer confirm payment on the frontend using the `client_secret`. Only provision access after `customer.subscription.updated` with `status = active` comes through the webhook — never on the API response alone.

## Webhook handling

Every webhook handler must do three things: verify the signature, process idempotently, return 200 fast.

```python
from flask import Flask, request
import stripe

app = Flask(__name__)
ENDPOINT_SECRET = "whsec_..."

@app.route("/webhook", methods=["POST"])
def webhook():
    try:
        event = stripe.Webhook.construct_event(
            request.data,
            request.headers["Stripe-Signature"],
            ENDPOINT_SECRET,
        )
    except (ValueError, stripe.error.SignatureVerificationError):
        return "Bad request", 400

    # Idempotency check — Stripe retries on timeout or 5xx
    if is_event_processed(event["id"]):
        return "OK", 200

    handler = {
        "payment_intent.succeeded": handle_payment_succeeded,
        "payment_intent.payment_failed": handle_payment_failed,
        "customer.subscription.updated": handle_subscription_updated,
        "customer.subscription.deleted": handle_subscription_canceled,
        "invoice.payment_succeeded": handle_invoice_paid,
    }.get(event["type"])

    if handler:
        handler(event["data"]["object"])
        mark_event_processed(event["id"])

    return "OK", 200
```

**Critical events to handle:**

| Event | When it fires | What to do |
|---|---|---|
| `payment_intent.succeeded` | One-time payment complete | Fulfill order |
| `invoice.payment_succeeded` | Subscription renewal paid | Extend access |
| `customer.subscription.deleted` | Subscription canceled | Revoke access |
| `payment_intent.payment_failed` | Charge declined | Notify customer |

## Customer portal (self-serve subscription management)

```python
def create_portal_session(customer_id: str) -> str:
    session = stripe.billing_portal.Session.create(
        customer=customer_id,
        return_url="https://example.com/account",
    )
    return session.url
```

Redirect the customer here instead of building your own subscription management UI.

## Testing

```python
TEST_CARDS = {
    "success":            "4242424242424242",
    "declined":           "4000000000000002",
    "3ds_required":       "4000002500003155",
    "insufficient_funds": "4000000000009995",
}

# Test with SDK directly
stripe.api_key = "sk_test_..."
intent = stripe.PaymentIntent.create(amount=1000, currency="usd",
    automatic_payment_methods={"enabled": True})
confirmed = stripe.PaymentIntent.confirm(intent.id,
    payment_method="pm_card_visa")
assert confirmed.status == "succeeded"
```

Use `stripe listen --forward-to localhost:5000/webhook` to receive webhooks locally during development.

## When NOT to use

- **DO NOT** use `stripe.Charge.create` — it's the legacy V1 API. Use Checkout Sessions or Payment Intents.
- **DO NOT** confirm the order from the Checkout Session redirect URL alone. The redirect fires client-side; a user can manipulate it. Confirm only from webhooks.
- **DO NOT** store `client_secret` in server logs — it grants the holder one-time payment confirmation ability.
- **DO NOT** skip `construct_event` signature verification and parse the raw JSON directly — any HTTP client can send fake events.

## Failure modes

| Problem | Cause | Fix |
|---|---|---|
| Order fulfilled twice | Webhook delivered twice on retry | Idempotency-check on `event["id"]` before processing |
| Access granted before payment | Reading Checkout redirect instead of webhook | Only provision on `invoice.payment_succeeded` webhook |
| Webhook handler times out | Slow DB write in handler | Return 200 immediately; process async in a queue |
| 3DS payment stuck | `payment_intent.requires_action` not handled | Listen for this event; redirect to `next_action.redirect_to_url` |
| Subscription not canceling | Canceled via portal but DB not updated | Handle `customer.subscription.deleted` in webhook |
