# SUPER AI — Proposed Database Schema

**Status:** Design only. No migration has been applied.

## Database boundary

Use a dedicated SUPER AI Supabase project / PostgreSQL database for commercial customer data. The existing NEAS internal Supabase project and its workforce/GIIE data are not a shared customer database. The current repository also documents a SQLite application data layer; SQLite must not be used as the multi-tenant commercial system of record.

All tenant-owned rows carry `organization_id` and are protected by PostgreSQL RLS. The authenticated application derives tenant membership from verified server-side identity and membership records. Never accept an organization ID from the browser as proof of authorization.

## Core tables

| Table | Key fields | Purpose |
|---|---|---|
| profiles | id, display_name, locale, created_at | User profile |
| organizations | id, name, slug, status, created_at | Customer tenant |
| organization_members | organization_id, user_id, role, status | Tenant membership |
| invitations | id, organization_id, email, role, token_hash, expires_at | Controlled invitations |
| plans | id, code, name, interval, active | Product catalog |
| plan_prices | id, plan_id, currency, amount_minor, provider_price_id, active | Versioned regional prices |
| subscriptions | id, organization_id, provider, provider_customer_id, provider_subscription_id, status, period dates | Subscription state |
| entitlements | id, organization_id, feature_key, limit_value, source | Effective feature and usage limits |
| usage_events | id, organization_id, actor_id, run_id, event_key, quantity, unit, occurred_at | Append-only usage facts |
| credit_accounts | id, organization_id, currency, balance_minor, updated_at | Optional prepaid credit account |
| credit_ledger | id, organization_id, event_id, direction, amount_minor, idempotency_key | Append-only credit movements |
| agent_definitions | id, slug, version, risk_level, enabled | Reviewed agent catalog |
| agent_runs | id, organization_id, actor_id, agent_id, status, idempotency_key, started_at, finished_at | Durable execution record |
| tool_connections | id, organization_id, provider, external_account_ref, scopes, status | Customer-authorized integrations |
| approvals | id, organization_id, run_id, action_digest, requested_by, decided_by, status, expires_at | Human approval record |
| provider_cost_events | id, organization_id, run_id, provider, model, input_units, output_units, cost_micros, occurred_at | AI and infrastructure cost attribution |
| billing_events | id, provider, provider_event_id, event_type, processed_at, payload_hash | Webhook idempotency and reconciliation |
| invoices | id, organization_id, provider_invoice_id, status, currency, amount_due_minor, amount_paid_minor | Invoice mirror |
| api_keys | id, organization_id, key_prefix, secret_hash, scopes, expires_at, revoked_at | Hashed developer credentials |
| audit_events | id, organization_id, actor_type, actor_id, action, target, metadata, occurred_at | Security and business audit |

## Data integrity rules

- Use UUID primary keys and UTC timestamps.
- Use integer minor currency units for monetary amounts; never floating point.
- Store provider identifiers with unique constraints scoped to provider.
- Enforce unique `billing_events(provider, provider_event_id)`.
- Enforce unique idempotency keys for billable execution and ledger operations.
- Never update or delete historical usage and ledger entries; append compensating entries.
- Version plans and prices; do not retroactively rewrite historical charges.
- Store webhook payload hashes and minimal sanitized metadata, not unnecessary payment or personal data.
- Do not store raw API secrets. Store only one-way hashes and show secret material once.
- Define retention and deletion policies for personal data, execution logs, prompts, and provider traces.

## RLS and authorization

- Enable RLS on every tenant-owned table.
- Use a private, non-exposed schema for narrowly scoped security helper functions.
- Policies must verify active organization membership and permitted role.
- Service-role operations are server-only and use explicit organization scoping.
- No broad authenticated-user SELECT policy on billing, usage, API key, audit, or provider-cost tables.
- Users may read only their organization's permitted invoices, usage summaries, agent runs, and settings.
- Writes to subscriptions, entitlements, ledger, provider cost records, and billing events are restricted to trusted server-side functions.
- Cross-tenant negative tests are mandatory for every table and RPC.

## Execution and metering transaction

1. Authenticate user and resolve active organization server-side.
2. Verify membership, agent entitlement, tool scopes, and organization budget.
3. Create an idempotent run record and reserve budget/credits transactionally.
4. Execute a bounded job through a durable worker.
5. Append provider usage and cost events.
6. Finalize the run and settle actual usage against reservation.
7. Append a compensating ledger entry for unused reservation or approved refund.
8. Emit an audit event and expose a customer-safe receipt.

A retry must reuse the same logical idempotency key and must not repeat external side effects.

## Migration sequence

1. Identity and organization tables.
2. Plans, prices, subscriptions, entitlements.
3. Usage events, reservations, credit ledger.
4. Agent registry, runs, approvals, tool connections.
5. Provider cost events, billing events, invoices, API keys.
6. RLS policies, private authorization helpers, indexes and constraints.
7. Seed only non-secret plan metadata in staging.

Do not create or apply migrations until the dedicated project, auth model, and existing schema have been inspected and an owner-approved migration plan exists.
