# NEAS APEX — Project Board

Last updated: 2026-11-24

## Active work

| Project | State | Scope | Next gate |
|---|---|---|---|
| NEAS APEX holographic voice avatar | Browser-native voice-motion implementation exists; live round-trip acceptance remains pending | Supplied portrait in the gold core; browser-native speech recognition/recording, browser speech synthesis, conversation-state events, tap activation, and speaking waveform. This is distinct from a verified ElevenLabs session. | Complete live preview microphone, speech, interruption, reconnect, image/vision, and specialist handoff tests. |
| NEAS AI CORE model access | Gemini chat route and model candidate fallback exist; production inference is unverified | Server-side Gemini streaming path with environment-configured model candidates. Environment-variable presence is not credential validation. | Run an authenticated, low-cost, server-side inference probe and record provider/model, timestamp, latency, structured response, and sanitized evidence without exposing credentials. |
| NEAS specialist workforce | 12 deterministic instruction profiles and prompt routing exist; agent execution is NOT CONFIGURED | Current Master Brain is a planner only: `executionAllowed: false`, `analysis-and-draft-only`, and `internal-only`. Profiles are not separate agents or durable workers. | Implement an authenticated persistent task/approval/audit system, bounded queue/worker, allowlisted tool contracts, retries/idempotency, cancellation, timeouts, traces, and per-agent acceptance tests. Reconcile historical counts of 24 UI specialists, 21 profile IDs, and 12 discipline profiles before declaring the authoritative workforce size. |
| NEAS runtime security | Fail-closed evidence evaluator exists; complete runtime controls are unverified | `lib/neas-api-security.ts` readiness evaluator requires fresh explicit evidence, but the current rate limiter is process-memory-only. `proxy.ts` defaults unreviewed API routes to 404. | Establish authenticated identity, role/scope authorization, durable distributed rate limiting, append-only audit, tool allowlists, adversarial tests, and safe route allowlisting. |
| NEAS GIIE | Public search and ingestion adapters exist but are disabled; live ingestion and retrieval are NOT CONFIGURED | Search requires `GIIE_PUBLIC_SEARCH_ENABLED=true`, Brave credentials, and the server-to-server connector token. Ingestion additionally requires `GIIE_INGESTION_ENABLED=true`, Supabase URL/service key, and an applied/validated migration. RSS is bounded and host-allowlisted. Embedding provider is not selected. | Validate migrations against staging; configure approved public sources and server-only credentials; add queued/scheduled discovery, normalization, deduplication, evidence/audit, explicit embedding provider/model, populated vectors, and semantic retrieval tests. Keep confidential NEAS data out of public providers. |
| Production release gate | Production deployment is READY for current main code; workforce activation is NOT APPROVED | The readiness evaluator is a gate, not an implementation or live verification. No domain alias reassignment or privileged production configuration is implied by a code deployment. | Preview integration tests, complete acceptance evidence, independent security review, cost/rollback report, then explicit owner sign-off before production activation. |

## Verified implementation and CI evidence

- [x] Twelve deterministic specialist instruction profiles and chat prompt routing are merged.
- [x] Renewable-energy routing precedence correction is merged.
- [x] Fail-closed runtime readiness evidence evaluator is merged.
- [x] GIIE RSS response memory bound and regression coverage are merged.
- [x] Recent reported CI for PR #49: 12 test files / 61 tests, TypeScript, npm audit, and production build passed on the exact PR head.
- [x] Recent reported CI for PR #50: 11 test files / 56 tests, TypeScript, npm audit, and production build passed on the exact PR head.
- [x] Current production deployment for main commit `07a142ff07cba9cb5d1acc62cbc59350654dd0d3` is READY in Vercel.
- [ ] No live model inference evidence recorded.
- [ ] No complete browser-native or ElevenLabs live voice round-trip acceptance evidence recorded.
- [ ] No durable autonomous specialist task execution evidence recorded.
- [ ] No fully validated identity/authorization/durable rate-limit/audit evidence recorded.
- [ ] No verified staging/production GIIE migration, live discovery, ingestion, embeddings, or semantic retrieval evidence recorded.

## Required activation evidence

The APEX runtime must remain fail-closed until each privileged capability has a fresh, explicit evidence record. Environment-variable presence, successful CI, a READY deployment, deterministic prompt routing, or a static security scan is not proof of live operation.

Required evidence: authenticated identity; role/scope authorization; durable distributed rate limiting; durable append-only audit; persistent task storage; live model authentication and inference; live voice round-trip; specialist task execution and controlled tool contracts; GIIE search; GIIE ingestion; and GIIE semantic retrieval. Each item must be tested in the deployed environment, carry a verification timestamp and evidence reference, and expire after 15 minutes unless the verifier supplies a stricter window.

The readiness evaluator in `lib/neas-api-security.ts` is an evidence gate only. It does not authenticate users, execute agents, validate provider credentials, or replace the underlying controls. New privileged routes remain blocked by `proxy.ts` unless individually reviewed and allowlisted.

## Non-negotiable safety boundary

Keep external communications, customer proposals/quotes, payments, purchases, contracts, business-record mutations, production/security changes, and safety-critical or engineering approvals under human approval. Public research must remain in the separate GIIE knowledge space and comply with source terms, robots directives, copyright, privacy, and rate limits. Do not enable paid provider usage or production ingestion without the owner-approved credentials and budget/configuration.

### Task execution policy foundation

- A pure task-operation policy now defines which bounded internal operations may be queued, which operations require explicit human approval, and which operations are prohibited.
- Task acceptance is fail-closed unless an authenticated principal, durable audit capability, idempotency key, and scoped tool grant are present.
- Safety/engineering approval and arbitrary shell, filesystem, or unrestricted network operations remain denied even when a human approval flag is supplied.
- This policy is not a worker, queue, database, authentication provider, or audit implementation. No API endpoint has been exposed and no task is being executed by this change.


### Workforce authorization foundation — PR #54

- Added `lib/neas-workforce-authz.ts` to derive the current single administrator principal from the verified signed session cookie and expose typed scope checks for server route handlers.
- Added regression tests for missing/forged sessions, principal derivation, fixed cookie lookup, and unauthenticated denial.
- This is not yet route integration, multi-user RBAC, durable identity management, or workforce activation. Admin pages and privileged APIs remain closed until each route is individually guarded and reviewed.
- PR: https://github.com/nextedgeaccesssolutions-ra/neas-apex/pull/54
- CI and independent review are pending; do not treat this foundation as production authorization evidence.

### Authenticated workforce task API — implementation branch

- Added `POST /api/admin/workforce/tasks` and `GET /api/admin/workforce/tasks`, guarded by the signed NEAS administrator session and server-derived workforce scopes.
- The API reads registered agents from Supabase, verifies the configured task-control tool/scope grant, validates inputs, enforces idempotency, and records task events, approval requests, and audit events.
- External communication, quotations, payments, production changes, business-record changes, and commercialization are held for explicit human approval. Safety sign-off and arbitrary shell/filesystem/network operations remain denied.
- Internal tasks are stored as `blocked` until a verified worker claim/execution runtime exists. The route deliberately does not infer worker readiness from an environment flag or agent database status. No model call or external side effect is performed.
- The API route is individually allowlisted in `proxy.ts`; all other API paths remain default-deny.
- The current rate limiter is still process-local; durable distributed rate limiting remains a security blocker.

### Live Supabase workforce inventory — 24 November 2026

Read-only inspection of the connected Supabase project found:
- 90 registered agent records across 9 departments; 54 active skills and 540 enabled department-based skill assignments.
- 87 agents are `draft_only`; 3 are `execute_approved`; all 90 have `runtime_status = not_configured`.
- All 6 schedules are disabled. The task table contains 1 task awaiting approval. There are 53 historical audit events and no audit events in the last 24 hours.
- 3 model routes exist; only the Vercel AI Gateway route (`openai/gpt-4o-mini`) is enabled in configuration. This is configuration evidence, not a successful live inference/health check.
- GIIE has 0 enabled sources, 0 discoveries, and 0 research jobs. No embedding provider is selected and no embeddings exist.
- AIW core tables have RLS enabled and no client policies, which is fail-closed for direct client access; server-side service-role access must remain behind authenticated route handlers.
- Supabase security advisors also report 3 SECURITY DEFINER project helper functions executable by `authenticated`, and leaked-password protection is disabled. These require a separate reviewed security remediation; do not weaken project RLS to resolve them.

This branch provides an authenticated task-registration and audit path only. It does not activate a worker, enable schedules, validate paid model calls, enable GIIE, or deploy production.
