---
name: subscription-billing
description: Implement recurring billing state machine, dunning retries, and proration for SaaS subscriptions.
license: MIT
last_reviewed: 2026-05-02
---

# Subscription billing

## When to use

Apply this when building your own billing engine on top of a raw payment processor (Stripe Charges API, Braintree, etc.). If you're using Stripe Billing, Recurly, or Chargebee, most of this is handled for you — use their native subscription objects instead.

## Subscription state machine

```
trial ──► active ──► past_due ──► canceled
                 └──► paused ──► active
```

The transitions that require code:

| Transition | Trigger | Action |
|---|---|---|
| trial → active | `trial_end` reached | Charge immediately; advance period |
| active → past_due | Charge fails | Start dunning; do NOT cancel yet |
| past_due → active | Dunning charge succeeds | Mark invoice paid; restore access |
| past_due → canceled | Dunning exhausted | Hard-cancel; revoke access |
| active → canceled | Customer request | Set `cancel_at_period_end = True`; cancel on next cycle |

```python
from enum import Enum
from datetime import datetime, timedelta

class SubscriptionStatus(Enum):
    TRIAL = "trial"
    ACTIVE = "active"
    PAST_DUE = "past_due"
    CANCELED = "canceled"
    PAUSED = "paused"

class Subscription:
    def activate(self):
        self.status = SubscriptionStatus.ACTIVE
        self.current_period_start = datetime.utcnow()
        self.current_period_end = self._next_billing_date()

    def mark_past_due(self):
        self.status = SubscriptionStatus.PAST_DUE

    def cancel(self, at_period_end=True):
        if at_period_end:
            self.cancel_at_period_end = True
        else:
            self.status = SubscriptionStatus.CANCELED
            self.canceled_at = datetime.utcnow()

    def _next_billing_date(self):
        intervals = {'month': 30, 'year': 365, 'week': 7}
        days = intervals.get(self.plan.interval, 30)
        return self.current_period_start + timedelta(days=days)
```

## Billing cycle processing

```python
class BillingEngine:
    def process_cycle(self, subscription):
        if datetime.utcnow() < subscription.current_period_end:
            return  # Not due yet

        invoice = self._generate_invoice(subscription)
        result = self._charge(subscription.customer_id, invoice.total)

        if result.success:
            invoice.mark_paid()
            subscription.current_period_start = subscription.current_period_end
            subscription.current_period_end = subscription._next_billing_date()
        else:
            subscription.mark_past_due()
            self._start_dunning(subscription, invoice)

    def _generate_invoice(self, subscription):
        invoice = Invoice(subscription.customer_id, subscription.id)
        invoice.add_line_item(subscription.plan.name, subscription.plan.amount)
        if subscription.has_usage_billing:
            invoice.add_line_item("Usage", self._calc_usage(subscription))
        invoice.tax = self._calc_tax(invoice.subtotal, subscription.customer)
        invoice.finalize()
        return invoice
```

## Dunning management

Use a fixed retry schedule: 3 days, 7 days, 14 days, then cancel. Sending emails at each step recovers ~30% of failed payments before the final attempt.

```python
RETRY_SCHEDULE = [
    {'days': 3,  'email': 'payment_failed_first'},
    {'days': 7,  'email': 'payment_failed_reminder'},
    {'days': 14, 'email': 'payment_failed_final'},
]

class DunningManager:
    def start(self, subscription, invoice):
        attempt = DunningAttempt(
            subscription_id=subscription.id,
            invoice_id=invoice.id,
            attempt_number=0,
            next_retry=datetime.utcnow() + timedelta(days=3),
        )
        self._send_email(subscription, 'payment_failed_first')
        attempt.save()

    def retry(self, attempt):
        subscription = Subscription.get(attempt.subscription_id)
        invoice = Invoice.get(attempt.invoice_id)
        result = self._charge(subscription.customer_id, invoice.total)

        if result.success:
            invoice.mark_paid()
            subscription.status = SubscriptionStatus.ACTIVE
            self._send_email(subscription, 'payment_recovered')
            attempt.resolve()
            return

        attempt.attempt_number += 1
        if attempt.attempt_number < len(RETRY_SCHEDULE):
            cfg = RETRY_SCHEDULE[attempt.attempt_number]
            attempt.next_retry = datetime.utcnow() + timedelta(days=cfg['days'])
            self._send_email(subscription, cfg['email'])
        else:
            subscription.cancel(at_period_end=False)
            self._send_email(subscription, 'subscription_canceled')
```

## Proration

Charge the difference when a customer upgrades mid-cycle. Credit unused days on the old plan, charge used days on the new plan.

```python
def calculate_proration(old_plan, new_plan, period_start, period_end, change_date):
    total_days = (period_end - period_start).days
    days_remaining = (period_end - change_date).days

    credit = (old_plan.amount / total_days) * days_remaining
    charge = (new_plan.amount / total_days) * days_remaining
    net = charge - credit

    return {
        'credit': credit,
        'charge': charge,
        'net': net,           # positive = customer owes more, negative = credit
        'days_remaining': days_remaining,
    }
```

For seat changes, only prorate additions — do **not** issue partial refunds when seats are removed mid-cycle.

## Usage-based billing

Track events during the period; aggregate and charge at period end.

```python
def calculate_tiered_charge(total_units, tiers):
    """Tiers: [{'from': 0, 'up_to': 100, 'unit_price': 0.10}, ...]"""
    charge = 0
    remaining = total_units
    for tier in sorted(tiers, key=lambda t: t['from']):
        cap = tier.get('up_to', float('inf'))
        tier_units = min(remaining, cap - tier['from'])
        charge += tier_units * tier['unit_price']
        remaining -= tier_units
        if remaining <= 0:
            break
    return charge
```

## When NOT to use

- **Stripe Billing / Recurly / Chargebee available**: use them. Building your own handles less than 10% of the edge cases they've solved.
- **One-time payments only**: no state machine needed; just create a charge.
- **Free trials with no card**: don't build dunning for a subscription that doesn't require payment info at signup — the drop-off rate makes it not worth it.

## Failure modes

| Problem | Cause | Fix |
|---|---|---|
| Double charge on retry | Dunning cron fires twice concurrently | Lock on `invoice_id` before charging; check `invoice.status == 'open'` |
| Billing on grace period | `process_cycle` runs after `cancel_at_period_end` date | Check cancellation flag before generating invoice |
| Proration rounding drift | Float arithmetic on per-day rate | Store amounts in integer cents; use `round()` only at final display |
| Trial-to-active charge fires too early | Cron frequency vs `trial_end` precision | Store `trial_end` as UTC timestamp; compare with `>=`, not `>` |
| Webhook double-delivery from processor | Processor retries on timeout | Idempotency-key the invoice creation on `(subscription_id, period_start)` |
