# SUPER AI — Billing and Monetization Specification

**Status:** Design only. Stripe SDK is present in the repository; no production billing implementation was confirmed in the initial audit.

## Commercial model

Hybrid SaaS: recurring subscription + included usage allowance + metered overage or prepaid credits. Enterprise agreements may use annual commitments and negotiated allowances.

### Proposed pricing hypotheses

| Tier          | Indicative price           | Audience                         |
| ------------- | -------------------------: | -------------------------------- |
| Free          | $0                         | Activation and product discovery |
| Pro           | $29/month                  | Individuals                      |
| Team          | $99/month                  | Small teams                      |
| Business      | $249/month                 | Growing organizations            |
| Enterprise    | Negotiated annual contract | Large organizations              |
| Developer API | Metered                    | Developers and platforms         |

Prices must be validated with customer interviews, competitive research, willingness-to-pay tests, payment processor eligibility, tax review, and unit economics before being published.

## Billing principles

1. Never promise unlimited AI execution at a loss-making fixed price.
2. Display plan limits, included credits, overage rules, and expected costs before execution.
3. Allow organization owners to set daily and monthly hard spending limits.
4. Use preflight estimates and require confirmation when a task may exceed a configured threshold.
5. Pause paid execution when payment status, budget, entitlement, or metering state is uncertain.
6. Keep product subscription charges distinct from variable usage charges.
7. Provide invoices, receipts, cancellation, plan changes, and support/refund workflows.
8. Do not store card numbers or CVC. Use the payment processor's hosted or tokenized components.

## Billing lifecycle

- Checkout: create a pending checkout session on the server after validating plan and customer.
- Webhook: verify signature against raw request body; persist event idempotently before applying state.
- Entitlements: update only from verified processor events or trusted admin operations with audit.
- Renewal: reconcile invoice/payment events and subscription period.
- Failed payment: apply a documented grace period, notify owner, then restrict paid execution without deleting customer data.
- Upgrade/downgrade: define proration and effective dates; show customer confirmation.
- Cancellation: support end-of-period cancellation and immediate cancellation where legally/contractually appropriate.
- Refund: record processor refund event and compensating ledger entry; never erase original charge.
- Reconciliation: scheduled comparison of provider customers, subscriptions, invoices, refunds, and internal state.

## Metering contract

Each billable event records:

- unique event ID and idempotency key
- organization, actor, and run IDs
- product/feature and agent identifier
- provider and model identifier
- metering unit and quantity
- input/output tokens or other measured units where applicable
- provider-reported or explicitly estimated cost
- price-book version and billable amount
- timestamp, currency, and settlement state

Do not bill on estimated tokens alone if actual provider usage is available. Mark estimates as estimates and reconcile later.

## Credit ledger

- Double-entry or append-only debit/credit movements.
- Reservation before execution; settlement after measured usage.
- Reversal/compensation rather than destructive edits.
- Unique idempotency key for every credit movement.
- No negative balance unless an explicitly contracted postpaid account permits it.
- Monthly allowance expiry and rollover rules must be explicit in customer terms.

## Revenue metrics

Report separately:

- MRR and ARR from recurring contracted revenue.
- Usage revenue and recurring usage run-rate.
- Bookings and signed contract value.
- Cash collected and accounts receivable.
- Refunds, discounts, taxes, payment fees and chargebacks.
- Direct AI/infrastructure delivery costs.
- Gross margin, CAC, LTV, churn, expansion, NRR and payback period.

One-time onboarding or implementation fees are not ARR. Do not count free credits as revenue.

## Required tests

- Valid and invalid webhook signatures.
- Duplicate and out-of-order webhook delivery.
- Checkout cancellation and failed payment.
- Renewal, pause, cancel, upgrade and downgrade.
- Refund and chargeback reconciliation.
- Concurrent credit reservation and settlement.
- Retry idempotency and duplicate execution prevention.
- Budget exhaustion and hard-stop behavior.
- Cross-tenant invoice and usage access denial.
- Currency precision and tax display.
