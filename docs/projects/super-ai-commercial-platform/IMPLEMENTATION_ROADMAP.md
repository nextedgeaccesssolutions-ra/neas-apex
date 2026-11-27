# SUPER AI — Implementation Roadmap

**Baseline:** 25 November 2026  
**Planning horizon:** 36 months to the $10M ARR ambition  
**Delivery method:** small reviewed pull requests, feature flags, staging first, explicit production release approval.

## Phase 0 — Architecture and repository audit (Weeks 1–2)

Deliver:

- Codebase and data-flow inventory.
- Reuse / replace / isolate matrix.
- Dependency and license review.
- Commercial Supabase project boundary decision.
- Company/IP/legal workstream.
- Architecture and acceptance baseline.

Exit criteria:

- Existing SQLite app data and NEAS Supabase internal data are not mixed with commercial tenant data.
- Existing authentication, billing, agent, and GIIE code is accurately classified.
- Dedicated commercial infrastructure and ownership requirements are documented.
- No critical architecture ambiguity remains for Phase 1.

## Phase 1 — SaaS identity and tenant foundation (Weeks 3–5)

Deliver:

- Organization and membership model.
- Registration, login, invitations, roles.
- Tenant-scoped PostgreSQL and RLS.
- Account settings and admin surfaces.
- Audit events and security tests.

Exit criteria:

- Two or more test organizations cannot access each other's rows through UI, API, RPC, or direct authenticated database queries.
- Owner/admin/member permissions are enforced server-side.
- No tenant data is exposed through public routes or logs.

## Phase 2 — Billing and metering (Weeks 5–8)

Deliver:

- Plan and price catalog.
- Checkout and customer portal.
- Verified webhook handler.
- Subscription and entitlement lifecycle.
- Append-only usage/credit ledger.
- Budget enforcement and reconciliation.

Exit criteria:

- Test-mode checkout, renewal, failed payment, cancellation, upgrade/downgrade and refund flows pass.
- Duplicate/out-of-order webhooks are safe.
- Usage is idempotent and reconciled.
- Spend caps stop execution before unapproved overage.
- No live charges without separate production approval.

## Phase 3 — AI control plane and durable execution (Weeks 7–12)

Deliver:

- Provider-neutral model router.
- Model catalog and constrained fallback.
- Agent registry and versioned definitions.
- Durable task queue and worker.
- Tool gateway and approval records.
- Cost attribution and evaluation traces.

Exit criteria:

- Three specialist workflows pass deterministic integration tests.
- Retries do not duplicate external side effects.
- All executions are attributable to a tenant and cost center.
- Model and tool usage obey budgets and scopes.
- High-impact operations require approval.

## Phase 4 — Commercial MVP (Weeks 13–16)

Deliver:

- SUPER AI-branded application shell.
- Personal, Team and Business plan experiences.
- Three launch workflows: research intelligence, sales preparation, professional operations.
- Onboarding, documentation, support and analytics.

Exit criteria:

- New customer can register, select a plan in test mode, complete onboarding, run an entitled workflow, view usage, and cancel.
- Workflows produce evidence-backed deliverables.
- Mobile and desktop tests pass.
- Product analytics track activation and retention without collecting unnecessary sensitive content.

## Phase 5 — Enterprise and Developer Cloud (Months 5–8)

Deliver:

- API keys and versioned public API.
- Developer docs, quotas and usage reporting.
- Enterprise SSO / identity options.
- Organization policy controls and audit exports.
- White-label configuration and marketplace beta.

Exit criteria:

- API consumers can authenticate, execute, meter, and inspect usage.
- Tenant and key scopes are tested.
- Enterprise controls are documented and independently reviewed.
- Marketplace agents are reviewed, version-pinned, and disabled by default until approved.

## Phase 6 — International scale (Months 9–36)

Deliver:

- Regional currencies and payment methods.
- Localization.
- Affiliate and partner program.
- Enterprise channel sales.
- Regional privacy and tax operations.
- Capacity, cost and reliability optimization.

Exit criteria:

- Each target region has verified payment availability and legal/tax review.
- Unit economics are positive or have an approved investment rationale.
- Churn, CAC, LTV, gross margin and NRR are measured.
- $10M ARR is treated as an operating target, not a guaranteed outcome.

## Management gates

Every phase requires: reviewed scope, test plan, data migration plan where relevant, security review, cost estimate, rollback plan, and explicit approval for production-impacting changes.

## First 30-day execution order

1. Complete the detailed Phase 0 audit and reuse matrix.
2. Provision and secure a dedicated SUPER AI staging database project.
3. Confirm legal entity, IP ownership, domain and payment-account readiness.
4. Implement identity and organization schema in staging only.
5. Build tenant-isolation tests before customer-facing features.
6. Start billing in payment-provider test mode only after identity and tenant controls pass.
