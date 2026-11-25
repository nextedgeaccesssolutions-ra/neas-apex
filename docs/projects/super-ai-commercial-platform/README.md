# SUPER AI — Global Commercial Platform

**Status:** Architecture baseline / Phase 0  
**Business ambition:** $10M annual recurring revenue (ARR)  
**Ownership intent:** Independent global AI company  
**Engineering foundation:** NEAS APEX, subject to IP, dependency-license, and data-separation review  
**Implementation branch:** `feat/super-ai-commercial-foundation`

## Executive decision

SUPER AI is a proposed independent, multi-tenant AI SaaS platform. NEAS APEX is a source-code starting point only; it is not the commercial company, customer identity system, billing account, or data boundary.

The first deliverable is a secure commercial foundation. No production payment processing, customer onboarding, tenant data writes, autonomous external actions, or production configuration changes are authorized by this architecture document.

## Repository audit — 25 November 2026

Verified from the repository:
- Default branch: `main`; audit base commit: `1b5b3a671524bee69e412b8b31d8694f6c3d8438`.
- `package.json` includes Next.js 16.4.6, React 19.2.0, TypeScript, AI SDK, Stripe SDK, Vitest, and Node.js 22 engine declaration.
- The repository's `CLAUDE.md` describes a Next.js application with a SQLite application data layer (`lib/db.ts` / `lib/data.ts`).
- Supabase migrations separately define NEAS workforce, GIIE, and project-security structures.
- The NEAS project board explicitly states that live inference, full specialist execution, and production activation require separate evidence and owner approval.
- No existing commercial subscription, organization/tenant, entitlement, usage-credit ledger, or Stripe webhook implementation was confirmed during this initial targeted audit.

These findings are a bounded audit, not a complete codebase or security review.

## Architecture decisions

1. **Separate commercial data plane.** SUPER AI customer data must live in a dedicated production Supabase project or equivalently isolated PostgreSQL environment. Do not place third-party customer records in the existing NEAS internal production project.
2. **Separate company identity.** SUPER AI needs its own legal entity/contracting arrangements, domain, brand, customer terms, privacy notices, payment account, support processes, and financial reporting. Legal formation and IP assignment require qualified review.
3. **Reuse selectively.** Reuse reviewed UI, AI routing, GIIE patterns, and agent abstractions only after dependency, data-flow, licensing, and security review. Do not couple customer tenants to NEAS internal workforce records.
4. **Tenant isolation is enforced below the model.** Authentication, tenant membership, row-level security, server-side authorization, and scoped tool credentials enforce access. Prompts are not an authorization boundary.
5. **Meter before monetizing.** Every billable execution has a durable, idempotent usage event and a cost record. No unmetered unlimited AI execution.
6. **Fail closed.** Unconfigured payment, model, tool, tenant, or approval capabilities remain unavailable and clearly labelled.
7. **Human approval for material side effects.** External communications, financial transactions, purchases, contracts, destructive changes, production operations, and safety-critical decisions require explicit authorization.

## Target logical architecture

- **Experience:** public marketing site, authenticated application, organization admin, developer portal.
- **Identity:** authentication, organization membership, roles, sessions, API keys.
- **Commercial control plane:** plans, subscriptions, entitlements, billing webhooks, invoices, usage limits, credit ledger.
- **AI control plane:** model catalog, provider router, budgets, policy engine, evaluation and observability.
- **Execution plane:** durable jobs, specialist agent registry, tool gateway, approvals, retries, cancellation, execution receipts.
- **Data plane:** tenant-scoped PostgreSQL, object storage, tenant-scoped knowledge retrieval, immutable audit and usage records.
- **Operations:** support/admin console, metrics, security events, backups, incident response.

## Initial product portfolio

- **SUPER AI Personal:** individual assistant, $29/month proposed starting price.
- **SUPER AI Team:** collaboration and shared workflows, $99/month proposed starting price.
- **SUPER AI Business:** organization workflows, proposed $249/month starting price.
- **SUPER AI Enterprise:** negotiated annual agreements and dedicated controls.
- **SUPER AI Developer Cloud:** metered API and approved agent ecosystem.

Prices are hypotheses for customer validation, not published commitments. Usage allowances, tax treatment, payment fees, and model costs must be validated before launch.

## $10M ARR planning model

| Revenue source | Planning assumption | Annual target |
|---|---:|---:|
| Pro | 7,000 × $29 × 12 | $2,436,000 |
| Business | 1,200 × $249 × 12 | $3,585,600 |
| Enterprise | 30 × $100,000 annual recurring contract | $3,000,000 |
| API / recurring usage | Net recurring usage target | $978,400 |
| **Total** | | **$10,000,000** |

This is a target mix, not a forecast. One-time implementation fees are excluded from ARR. Finance reporting must distinguish ARR, MRR, bookings, cash collected, gross profit, and operating profit.

## Launch strategy

Start with three validated workflows:
1. Global Research Intelligence — source-backed research and reports.
2. AI Sales Workforce — prospect research, qualification, draft outreach and CRM preparation.
3. Professional Operations — structured documents, project plans, and business deliverables.

Engineering, industrial, and renewable-energy workflows are a potential first vertical because the founders have domain experience. The core platform remains industry-neutral.

## Release gates

No production launch until:
- Independent ownership, IP, and licensing review is complete.
- Dedicated commercial infrastructure is provisioned and reviewed.
- Tenant-isolation and authorization tests pass.
- Billing webhooks, idempotency, refunds, cancellation, and reconciliation pass in test mode.
- Usage metering and per-tenant cost attribution are verified.
- Model and tool execution are bounded by policy and budgets.
- Security, privacy, backup, and incident-response reviews are complete.
- Explicit owner approval authorizes production activation.

## Related specifications

- [Database schema](DATABASE_SCHEMA.md)
- [Billing and monetization](BILLING_SPEC.md)
- [Security and governance](SECURITY_SPEC.md)
- [Implementation roadmap](IMPLEMENTATION_ROADMAP.md)
- [Engineering task backlog](TASKS.md)
