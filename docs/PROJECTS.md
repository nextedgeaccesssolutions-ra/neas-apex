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


### Live AI workforce skills registry and assignment automation — 24 November 2026

- Applied Supabase migration `202611240002_aiw_skills_registry_automation` to the connected live project.
- Added a normalized, versioned catalogue of 54 active skills across the nine workforce departments, plus per-agent assignments and skill-evaluation evidence tables.
- Backfilled 540 active assignments: six department-specific skills for each of the 90 registered agents. Each assignment carries the agent's role name, job mandate, skill-specific operating guidance, priority, and working-level proficiency label. A follow-on trigger records a `not_tested` baseline evaluation for every new assignment.
- Enabled the `aiw_agents_auto_assign_department_skills` database trigger. New agents and department changes automatically receive the active skills for their department; the legacy `aiw_agents.skills` JSON array is synchronized for compatibility.
- Enabled RLS on the three new registry tables. Authenticated users have read-only access; writes are reserved for the server-side service role. No service-role credential is exposed to clients.
- Verification: 90/90 agents have six synchronized skills; 540 enabled assignments; 54 active catalogue skills; assignment trigger enabled. A baseline evaluation row exists for each assignment (540 total), all marked `not_tested` until live model tests are run.
- Runtime boundary: all 90 agents still report `runtime_status=not_configured`. Three records (CEO, Engineering Director, HSEQ Director) have `execution_mode=execute_approved`; the remaining 87 are `draft_only`. This migration did not change those settings, activate model execution, or authorize external actions.
- Migration sources: `supabase/migrations/202611240002_aiw_skills_registry_automation.sql` and `supabase/migrations/202611240003_aiw_skill_evaluation_automation.sql`. Implementation PR is pending review and merge.

## Specialist runtime connection — implementation in PR #56

- The Gemini chat route now resolves each of the 12 deterministic specialist profiles to a representative registered workforce agent and loads that agent's active skill assignments from Supabase using a server-only service-role credential.
- The prompt receives the six assigned skill records, role-specific guidance and guardrails as supplementary context. Registry content cannot override system governance, safety rules or approval boundaries.
- Database reads are bounded to 3 seconds and 12 skills. If the private Supabase URL/key is absent or the registry request fails, the route retains the existing deterministic specialist prompt and reports the fallback through response headers rather than failing the chat request.
- Response diagnostics include `X-NEAS-Skills-Source` (`supabase` or `static-fallback`) and `X-NEAS-Skills-Loaded`. These headers are runtime diagnostics, not proof of agent autonomy.
- The mapping is explicitly limited to 12 representative profiles; it does not imply that all 90 workforce records are separate model instances. All 90 records remain `runtime_status=not_configured`; no background workers or external-action permissions are activated.
- To use database-backed skills in deployment, configure `SUPABASE_URL` (or `NEXT_PUBLIC_SUPABASE_URL`) and `SUPABASE_SERVICE_ROLE_KEY` as private server-side Vercel environment variables for the relevant environment. Never expose the service-role key to browser code or use a `NEXT_PUBLIC_` service-key variable.
- Added unit tests for the specialist-to-agent mapping, active-skill normalization, and prompt guardrail preservation. CI and a deployed runtime probe remain pending.

### GIIE source governance and guarded ingestion — implementation branch

- Added an owner-session source registry API: `GET/POST/PATCH /api/admin/giie/sources`.
- New sources are always registered disabled. Enabling requires an explicit owner review note, terms review, robots-policy review, and a positive per-hour quota. Source changes create durable AIW audit events.
- GIIE search and ingest endpoints now support either a valid server-to-server connector token or the signed NEAS administrator session with the matching GIIE scope. Their exact routes are allowlisted; unlisted API paths remain default-deny.
- Ingestion now requires an enabled, terms-reviewed and robots-reviewed registry entry whose normalized URL and source type match. It applies an hourly database-count quota check, preserves duplicate discoveries, and never stores confidential NEAS knowledge in the public GIIE tables.
- Discovery validation rejects malformed objects, unsupported source/evidence/status values, oversized text, invalid dates, credentials in source URLs, malformed arrays, and invalid confidence values.
- Removed stale ElevenLabs API paths from the proxy allowlist because no corresponding route exists in this repository. The current visitor widget uses browser-native speech recognition/synthesis and submits audio to the Gemini chat route; it is not an ElevenLabs live integration.

### Remaining GIIE and voice activation blockers

- The connected Supabase project still has 0 enabled GIIE sources, 0 discoveries, and 0 research jobs. The new registry API does not auto-enable sources.
- `GIIE_PUBLIC_SEARCH_ENABLED` and `GIIE_INGESTION_ENABLED` remain disabled; no Brave API key, connector token, or embedding provider was tested or changed.
- The source quota check is count-based and not transactionally atomic under concurrent ingestion. A database-side atomic quota guard is required before high-volume scheduling.
- No embeddings are generated; semantic retrieval is not live.
- Browser voice has not passed a live microphone/interruption/end-to-end acceptance test in the deployed browser. No ElevenLabs API endpoint is present.
