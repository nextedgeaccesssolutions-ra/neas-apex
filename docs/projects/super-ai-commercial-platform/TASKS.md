# SUPER AI Commercial Platform — Engineering Backlog

**Status:** Phase 0 started; all build tasks below are unstarted until explicitly checked.  
**Owner:** Product/engineering lead to be assigned.  
**Rule:** Update this file as tasks move; never mark acceptance complete without linked test or review evidence.

## Phase 0 — Audit and decisions

- [ ] Inventory app routes, data stores, auth, and server actions.
- [ ] Inventory Supabase projects, migrations, RLS policies, and service-role usage.
- [ ] Inventory existing AI router, agent registry, task queue, worker, approvals, and audit implementations.
- [ ] Confirm whether any Stripe routes/webhooks/customer portal exist; test mode only.
- [ ] Produce reuse / refactor / isolate / do-not-reuse matrix.
- [ ] Review package licenses, third-party assets, and IP chain of title.
- [ ] Define SUPER AI legal entity, contracting party, domain, and brand clearance workstream.
- [ ] Decide dedicated SUPER AI Supabase project and environments.
- [ ] Document data classification, retention, and cross-border processing requirements.

## Phase 1 — Tenant foundation

- [ ] Create dedicated commercial Supabase staging project.
- [ ] Implement profiles, organizations, memberships, invitations and roles.
- [ ] Implement RLS and private authorization helpers.
- [ ] Add server-side tenant context and route guards.
- [ ] Add audit events and organization administration.
- [ ] Add cross-tenant negative integration tests.
- [ ] Complete staging backup and restore exercise.

## Phase 2 — Billing and metering

- [ ] Define plan catalog, price versions, allowances and overage policy.
- [ ] Create payment provider test account/configuration after owner approval.
- [ ] Implement hosted checkout and customer portal.
- [ ] Implement signed, idempotent webhook processing.
- [ ] Implement subscription lifecycle and entitlement derivation.
- [ ] Implement append-only usage events and credit ledger.
- [ ] Implement transactional reservation/settlement and spending caps.
- [ ] Implement invoice, refund, cancellation and reconciliation views.
- [ ] Add billing, concurrency, replay and cross-tenant tests.

## Phase 3 — AI execution

- [ ] Inventory current provider router and model catalog.
- [ ] Define tenant policy, provider allowlist and budget policy.
- [ ] Implement versioned agent definitions and reviewed tool contracts.
- [ ] Implement durable queue, leases, retries, cancellation and dead-letter handling.
- [ ] Add approval gates and execution receipts.
- [ ] Add per-run provider cost and usage attribution.
- [ ] Validate three specialist workflows with deterministic test fixtures.

## Phase 4 — MVP and launch readiness

- [ ] Build SUPER AI brand shell and onboarding.
- [ ] Implement research intelligence workflow.
- [ ] Implement sales preparation workflow.
- [ ] Implement professional operations workflow.
- [ ] Add customer usage, plan, invoice and security settings.
- [ ] Add support, privacy, terms and documentation pages.
- [ ] Complete accessibility, mobile, performance and security acceptance.

## Phase 5 — Enterprise and API

- [ ] Build scoped API keys and developer portal.
- [ ] Implement API quotas and metering.
- [ ] Add enterprise identity and audit exports.
- [ ] Add white-label tenant configuration.
- [ ] Launch reviewed agent marketplace beta.

## Production release checklist

- [ ] IP/legal/brand clearance.
- [ ] Dedicated production database and verified RLS.
- [ ] Production payment account and signed webhooks.
- [ ] Billing and usage reconciliation.
- [ ] Security review and no critical/high unresolved findings.
- [ ] Backup restore, monitoring and incident response.
- [ ] Customer terms, privacy, DPA and subprocessor disclosures.
- [ ] Explicit owner approval for production activation.
