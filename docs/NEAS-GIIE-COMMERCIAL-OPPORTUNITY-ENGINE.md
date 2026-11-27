# NEAS GIIE — Commercial Opportunity Intelligence

## Purpose

This module turns hourly public-web discovery into a searchable, auditable commercial research queue for Philippine industries. It extends the existing GIIE search connector and admin-session model. It does not create a second AI platform or alter the existing engineering/workforce execution paths.

## Existing integration points

- Search provider: `lib/giie-connectors.ts` (Brave Search public-web adapter).
- Evidence and governance model: `lib/neas-giie.ts`.
- Authentication and permissions: `lib/neas-workforce-authz.ts`.
- Storage: dedicated `giie_commercial_signals` and `giie_commercial_runs` tables, isolated from confidential project, customer, and workforce records.
- Read API: `GET /api/admin/giie/commercial-signals`, protected by the existing NEAS admin session and `giie:public:search` scope.
- Dashboard: /market-intelligence/commercial (the existing static Market Intelligence page is left unchanged).
- Schedule: GitHub Actions hourly cron, with manual dispatch for controlled testing.

## Commercial coverage

Twelve rotating industry groups:

1. Energy and utilities
2. Construction and infrastructure
3. Manufacturing and mining
4. Agriculture and fisheries
5. Tourism and hospitality
6. Transport and logistics
7. Technology and telecommunications
8. Finance and commerce
9. Healthcare and pharmaceuticals
10. Education and workforce
11. Government and procurement
12. Environment and climate

Each hourly run searches two commercial-intent queries for one group. The complete taxonomy rotates every twelve hours. Queries prioritize projects, investments, procurement, tenders, contract awards, facility expansions, maintenance/outages, supplier requirements, and workforce demand.

## Scoring

`commercial_opportunity_priority_v1` is a transparent 0–100 research-triage heuristic:

- Commercial intent: up to 35 points.
- Philippines relevance: up to 15 points.
- Project specificity: up to 15 points.
- Official government-domain signal: up to 15 points.
- Published-date freshness: up to 10 points.
- NEAS service adjacency: up to 10 points.

The score is not a probability of winning, verified demand, project value, market share, or expected revenue. A search result is an unverified lead. The collector does not invent contract values, buyer identities, bid deadlines, search volume, or growth rates.

## Data model and security

The migration adds:

- `giie_commercial_signals`: deduplicated public commercial leads, evidence metadata, score, verification state, recurrence, and publication gate.
- `giie_commercial_runs`: hourly run history and provider warnings.
- `upsert_giie_commercial_signals(jsonb)`: atomic service-role-only upsert that preserves first-seen time and increments recurrence.

Both tables use RLS with FORCE ROW LEVEL SECURITY. Active NEAS users can read signals; run history is admin-readable. Anonymous access is revoked. Authenticated users have read-only grants. The RPC is SECURITY INVOKER, has an empty search path, and is executable only by `service_role`. The service-role key is used only by server-side GitHub Actions and server-side API code; it must never be placed in a public or `NEXT_PUBLIC_` variable.

The current Supabase Data API requires explicit grants for new tables. The migration grants only the required roles; no anonymous access is added.

## Automatic publishing policy

The configured policy is automatic only for low-risk, source-cited informational market summaries after all gates pass:

- Evidence class is `verified-official`.
- At least two independent source domains corroborate the claim.
- Original source citations are retained.
- Content type is `market-summary`.

Company claims, credentials, project references, prices, tenders/bid responses, safety or engineering guidance, and customer communications are never auto-published by this policy.

**CMS boundary:** the inspected NEAS APEX repository contains the Market Intelligence research page and GIIE APIs, but no verified website CMS publishing adapter. This PR therefore implements the publication eligibility gate and records every raw search signal as `blocked_unverified`; it does not pretend to publish to the public NEAS website. A CMS adapter must be connected and tested in a separate change before external auto-publication can be enabled.

## Setup after PR review

Repository Actions secrets required:

- `BRAVE_SEARCH_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Apply `supabase/migrations/202611270010_giie_commercial_intelligence.sql` to the NEAS Supabase project before running the collector. Do not paste service-role credentials into chat or commit them.

The workflow runs:
`npm ci`
`npx tsx scripts/giie-commercial-collector.ts`

After merge and secret configuration, dispatch the workflow manually once. Confirm a successful row in `giie_commercial_runs`, signal records in `giie_commercial_signals`, and the dashboard response at `/api/admin/giie/commercial-signals`.

## Production safety

- This PR adds new files and one additive migration; it does not change existing workforce workers, production routes, or the public website.
- The migration is not applied to the hosted Supabase project by this PR.
- The hourly schedule becomes active only after merge to the default branch and configuration of repository secrets.
- Search results remain unverified; no tender submission, sales outreach, bid response, customer communication, pricing change, or production code action is automated.
