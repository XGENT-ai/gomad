---
name: paypal-checkout
description: Integrate PayPal v2 Checkout, IPN verification, subscriptions, and refunds.
license: MIT
last_reviewed: 2026-05-02
---

# PayPal checkout

## When to use

Use this when PayPal is a required payment option — common for markets where PayPal wallet adoption is high (US, Germany, UK) or when customers expect to pay with a PayPal balance. PayPal is rarely a first choice for new integrations; Stripe supports PayPal as an additional payment method without a separate integration.

## Payment flow

Two steps: create an order server-side, then capture it after the customer approves.

```python
import requests

class PayPalClient:
    def __init__(self, client_id: str, client_secret: str, sandbox: bool = False):
        base = "https://api-m.sandbox.paypal.com" if sandbox else "https://api-m.paypal.com"
        self.base_url = base
        self.token = self._get_token(client_id, client_secret)

    def _get_token(self, client_id, client_secret) -> str:
        resp = requests.post(
            f"{self.base_url}/v1/oauth2/token",
            data={"grant_type": "client_credentials"},
            auth=(client_id, client_secret),
        )
        resp.raise_for_status()
        return resp.json()["access_token"]

    def _headers(self) -> dict:
        return {"Authorization": f"Bearer {self.token}", "Content-Type": "application/json"}

    def create_order(self, amount: float, currency: str = "USD") -> dict:
        resp = requests.post(
            f"{self.base_url}/v2/checkout/orders",
            headers=self._headers(),
            json={"intent": "CAPTURE", "purchase_units": [
                {"amount": {"currency_code": currency, "value": f"{amount:.2f}"}}
            ]},
        )
        resp.raise_for_status()
        return resp.json()

    def capture_order(self, order_id: str) -> dict:
        resp = requests.post(
            f"{self.base_url}/v2/checkout/orders/{order_id}/capture",
            headers=self._headers(),
        )
        resp.raise_for_status()
        return resp.json()
```

Frontend — Smart Payment Buttons handle the approval redirect:

```javascript
paypal.Buttons({
  createOrder() {
    return fetch("/api/paypal/order", { method: "POST" })
      .then(r => r.json()).then(data => data.order_id);
  },
  onApprove(data) {
    return fetch("/api/paypal/capture", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderID: data.orderID }),
    }).then(r => r.json()).then(details => {
      if (details.status === "COMPLETED") window.location = "/success";
    });
  },
}).render("#paypal-button-container");
```

**DO NOT** trust the `onApprove` callback alone — capture must succeed on the server before fulfilling the order.

## IPN verification

PayPal sends IPN (Instant Payment Notification) for async events. Always verify by posting back.

```python
from flask import Flask, request
import requests

app = Flask(__name__)

@app.route("/ipn", methods=["POST"])
def handle_ipn():
    ipn_data = request.form.to_dict()

    # Must verify before acting on any IPN message
    verify_resp = requests.post(
        "https://ipnpb.paypal.com/cgi-bin/webscr",  # use sandbox URL in testing
        data={"cmd": "_notify-validate", **ipn_data},
    )
    if verify_resp.text != "VERIFIED":
        return "Invalid IPN", 400

    txn_id = ipn_data.get("txn_id")
    if is_transaction_processed(txn_id):
        return "OK", 200  # deduplicate

    status = ipn_data.get("payment_status")
    if status == "Completed":
        fulfill_order(ipn_data)
    elif status == "Refunded":
        handle_refund(ipn_data)
    elif status == "Reversed":
        handle_chargeback(ipn_data)

    mark_transaction_processed(txn_id)
    return "OK", 200
```

PayPal will retry IPN delivery if you don't respond 200. Always deduplicate on `txn_id`.

## Subscription plans

```python
def create_plan(client: PayPalClient, name: str, amount: float, interval: str = "MONTH") -> str:
    resp = requests.post(
        f"{client.base_url}/v1/billing/plans",
        headers=client._headers(),
        json={
            "product_id": "PROD_ID",  # create a Product first via /v1/catalogs/products
            "name": name,
            "billing_cycles": [{
                "frequency": {"interval_unit": interval, "interval_count": 1},
                "tenure_type": "REGULAR",
                "sequence": 1,
                "total_cycles": 0,
                "pricing_scheme": {"fixed_price": {"value": f"{amount:.2f}", "currency_code": "USD"}},
            }],
            "payment_preferences": {
                "auto_bill_outstanding": True,
                "payment_failure_threshold": 3,
            },
        },
    )
    resp.raise_for_status()
    return resp.json()["id"]

def create_subscription(client: PayPalClient, plan_id: str, email: str) -> dict:
    resp = requests.post(
        f"{client.base_url}/v1/billing/subscriptions",
        headers=client._headers(),
        json={
            "plan_id": plan_id,
            "subscriber": {"email_address": email},
            "application_context": {
                "return_url": "https://example.com/sub/success",
                "cancel_url": "https://example.com/sub/cancel",
            },
        },
    )
    resp.raise_for_status()
    data = resp.json()
    approval_url = next(l["href"] for l in data["links"] if l["rel"] == "approve")
    return {"subscription_id": data["id"], "approval_url": approval_url}
```

Redirect the customer to `approval_url`. PayPal returns them to `return_url` after approval.

## Refunds

Refunds are issued against a **capture ID**, not an order ID.

```python
def refund_capture(client: PayPalClient, capture_id: str, amount: float = None) -> dict:
    body = {}
    if amount is not None:
        body["amount"] = {"value": f"{amount:.2f}", "currency_code": "USD"}

    resp = requests.post(
        f"{client.base_url}/v2/payments/captures/{capture_id}/refund",
        headers=client._headers(),
        json=body,
    )
    resp.raise_for_status()
    return resp.json()
```

Omit `amount` for a full refund. Store `capture_id` at order fulfillment time — you can't refund without it.

## When NOT to use

- **DO NOT** use PayPal as your only payment method — it has no card-only option without a PayPal account in many regions, and conversion rates vary widely by market.
- **DO NOT** use the V1 Payments API (`/v1/payments/payment`) — it is deprecated. Use V2 Orders API.
- **DO NOT** skip IPN verification — without the POST-back, any HTTP client can fake a payment notification.
- **DO NOT** fulfill an order on `onApprove` alone — the JavaScript callback fires client-side and can be triggered without an actual payment.

## Failure modes

| Problem | Cause | Fix |
|---|---|---|
| Order captured twice | `onApprove` fires twice on slow networks | Idempotency check on `order_id` before capture |
| IPN not received | Sandbox vs. production IPN URL mismatch | Verify URL in PayPal account settings |
| Access token expired mid-request | Token lifetime is ~9 hours | Re-fetch token on 401; cache with expiry |
| Refund fails | Using order ID instead of capture ID | Store `capture_id` from the capture response |
| Subscription not activating | Customer approved but webhook not handled | Listen for `BILLING.SUBSCRIPTION.ACTIVATED` webhook event |
