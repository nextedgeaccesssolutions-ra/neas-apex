# NEAS APEX — Project Board

Last updated: 2026-11-25

## Active work

| Project | State | Scope | Next gate |
|---|---|---|---|
| NEAS APEX holographic voice avatar | Browser-native voice-motion implementation exists; live round-trip acceptance remains pending | Supplied portrait in the gold core; browser-native speech recognition/recording, browser speech synthesis, conversation-state events, tap activation, and speaking waveform. This is distinct from a verified ElevenLabs session. | Complete live preview microphone, speech, interruption, reconnect, image/vision, and specialist handoff tests. |
| NEAS AI CORE model access | Gemini chat route and model candidate fallback exist; production inference is unverified | Server-side Gemini streaming path with environment-configured model candidates. Environment-variable presence is not credential validation. | Run an authenticated, low-cost, server-side inference probe and record provider/model, timestamp, latency, structured response, and sanitized evidence without exposing credentials. |
| NEAS specialist workforce | 12 deterministic instruction profiles and prompt routing exist; agent execution is NOT CONFIGURED | Current Master Brain is a planner only: `executionAllowed: false`, `analysis-and-draft-only`, and `internal-only`. Profiles are not separate agents or durable workers. | Implement an authenticated persistent task/approval/audit system, bounded queue/worker, allowlisted tool contracts, retries/idempotency, cancellation, timeouts, traces, and per-agent acceptance tests. Reconcile historical counts of 24 UI specialists, 21 profile IDs, and 12 discipline profiles before declaring the authoritative workforce size. |
| NEAS runtime security | Fail-closed evidence evaluator exists; complete runtime controls are unverified | `lib/neas-api-security.ts` readiness evaluator requires fresh explicit evidence, but the current rate limiter is process-memory-only. `proxy.ts` defaults unreviewed API routes to 404. | Establish authenticated identity, role/scope authorization, durable distributed rate limiting, append-only audit, tool allowlists, adversarial tests, and safe route allowlisting. |
| NEAS GIIE | Public search and ingestion adapters exist but are disabled; live ingestion and retrieval are NOT CONFIGURED | Search requires `GIIE_PUBLIC_SEARCH_ENABLED=true`, Brave credentials, and the server-to-server connector token. Ingestion additionally requires `GIIE_INGESTION_ENABLED=true`, Supabase URL/service key, and an applied/validated migration. RSS is bounded and host-allowlisted. Embedding provider is not selected. | Validate migrations against staging; configure approved public sources and server-only credentials; add queued/scheduled discovery, normalization, deduplication, evidence/audit, explicit embedding provider/model, populated vectors, and semantic retrieval tests. Keep confidential NEAS data out of public providers. |
| Production release gate | Production deployment is READY for current main code; workforce activation is NOT APPROVED | The readiness evaluator is a gate, not an implementation or live verification. No domain alias reassignment or privileged production configuration is implied by a code deployment. | Preview integration tests, complete acceptance evidence, independent security review, cost/rollback report, then explicit owner sign-off before production activation. |
| SUPER AI commercial platform | Phase 0 architecture baseline created on `feat/super-ai-commercial-foundation`; no commercial runtime implemented or deployed | Independent global AI SaaS built selectively on NEAS APEX; dedicated customer data plane, tenant isolation, billing/metering, governed agent runtime, enterprise/API products | Complete code/data-flow/license audit; provision separate staging data plane; prove tenant authorization before billing implementation. |

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

### AI Gateway live model validation gate — implementation branch

- Added authenticated `GET/POST /api/admin/models/probe` with dedicated `models:read` and `models:validate` scopes.
- The route reads the enabled model route from Supabase and supports Vercel AI Gateway through the installed AI SDK. It uses API-key auth when configured or Vercel OIDC in a Vercel deployment.
- The live probe is disabled unless `NEAS_LIVE_MODEL_VALIDATION_ENABLED=true`; a POST also requires explicit `confirmSpend: true`, uses a 24-token synthetic prompt, a 5–30 second timeout, a one-per-10-minute process-local throttle, and durable audit records.
- The GET endpoint reports configured route metadata and auth mode only. It does not call a model and does not claim live validation.
- No live inference request was made by this implementation; no model spend or secrets were used. A successful probe would validate connectivity only, not specialist quality, fallback behavior, tool execution, or production capacity.

### GIIE source governance and guarded ingestion — implementation branch

- Added an owner-session source registry API: `GET/POST/PATCH /api/admin/giie/sources`.
- New sources are always registered disabled. Enabling requires an explicit owner review note, terms review, robots-policy review, and a positive per-hour quota. Source changes create durable AIW audit events.
- GIIE search and ingest endpoints support either a valid server-to-server connector token or the signed NEAS administrator session with the matching GIIE scope. Their exact routes are allowlisted; unlisted API paths remain default-deny.
- Ingestion requires an enabled, terms-reviewed and robots-reviewed registry entry whose normalized URL and source type match. It applies an hourly database-count quota check, preserves duplicate discoveries, and keeps GIIE data in the public knowledge space.
- Discovery validation rejects malformed objects, unsupported source/evidence/status values, oversized text, invalid dates, credentials in source URLs, malformed arrays, and invalid confidence values.
- Removed stale ElevenLabs API paths from the proxy allowlist because no corresponding route exists in this repository. The website voice bridge uses the official ElevenLabs web component instead.

### Remaining GIIE activation blockers

- The connected Supabase project still has 0 enabled GIIE sources, 0 discoveries, and 0 research jobs. The new registry API does not auto-enable sources.
- `GIIE_PUBLIC_SEARCH_ENABLED` and `GIIE_INGESTION_ENABLED` remain disabled; no Brave API key, connector token, or embedding provider was tested or changed.
- The source quota check is count-based and not transactionally atomic under concurrent ingestion. A database-side atomic quota guard is required before high-volume scheduling.
- No embeddings are generated; semantic retrieval is not live.

### GitHub Actions recovery — 24 November 2026

- Latest main commit: `6001cd9107df9beb7907f2d521844946db051a59`; latest main workflow run #128 completed successfully.
- Run #127 (PR #65) passed all required gates: security regression tests, TypeScript, dependency audit, and Next.js production build.
- Earlier failures are historical and remain visible in Actions: run #118 (main) and run #116 (agent skill registry) failed; run #114 (main) and #113 (task API) also failed before the later authorization-narrowing fix.
- The task API branch gained a separate null-narrowing fix in PR #59. The earlier combined PR #58 was closed without merge. Re-check the current main task API's approval mapping and response behavior before further changes.
- PR #64 is an open voice integration duplicate. PR #63 already merged the widget bridge and its feature-branch and main CI passed. Do not merge the duplicate without reconciliation; this branch contains only minor cleanup from the already merged component.
- Current Actions are green for main runs #121, #123, #125, #128 and the latest PR #65. Historical failed/cancelled attempts are not current production failures.

### Production configuration audit

- Vercel production environment inventory showed `ELEVENLABS_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY` entries configured as sensitive secrets, but encrypted values were not inspected.
- A production alias deployment for the current main SHA reached READY. Browser live verification could not be performed in this session because the connected browser-testing service had no remaining credits. Microphone, interruption, and voice round-trip remain unverified.
- Never claim live model inference or specialist execution from a green CI run or READY deployment. Those require separate runtime evidence.

## GitHub Actions status and next activation blockers — 24 November 2026

Verified against the live repository and connected Supabase project:
- Main is at `6001cd9107df9beb7907f2d521844946db051a59`; workflow run #128 passed. PR #65 run #127 passed the security tests, TypeScript, dependency audit, and Next.js production build. The main run immediately after PR #63 also passed all four gates.
- Older runs #118, #116, #114 and #113 failed during earlier iterations; they are historical failures, not the current main check. Do not delete or rewrite workflow history to make the Actions page appear green.
- Current production deployment for main commit `73f83f2d0550982fc6bd7f71a471c81e754ba1b9` is READY. The latest Actions main SHA `6001cd9` has not yet been independently confirmed as the current production deployment in this audit.
- PR #64 duplicates the already merged #63 voice bridge. Do not merge #64. Its source change is already in main via #63; the follow-on cleanup is in PR #66.
- Live Supabase inventory: 90/90 agent records enabled, 90/90 `runtime_status=not_configured`; 87 `draft_only`, 3 `execute_approved`; all agents have only baseline task-control permissions and no safety/external/financial/production grants. Six schedules exist and zero are enabled.
- The task API persists and audits requests but sets every new task to `blocked` unless explicitly awaiting approval. It contains no worker claim or execution loop. No automated task has been executed.
- Live model route configuration has one enabled route (`openai/gpt-4o-mini` through Vercel AI Gateway); no successful inference probe has been recorded. The new probe endpoint is gated by `NEAS_LIVE_MODEL_VALIDATION_ENABLED=true` and per-request `confirmSpend=true`.
- GIIE tables currently show zero sources, zero discoveries, zero research jobs, and zero embeddings. GIIE feature flags and credentials were not enabled. Source governance is merged, but ingestion and semantic retrieval are not live.
- Security foundation has a signed single-administrator session, scope authorization and default-deny proxy. Remaining gaps include process-local rate limiting, no multi-user RBAC/IdP, no independent security review, and unresolved Supabase security advisor findings (SECURITY DEFINER functions and leaked-password protection).
- Voice agent main branch was updated with NEAS AI Core greeting/prompt identity, domain allowlist, Zero Retention, recording-off, and guardrails. The website widget bridge is in main, but live browser microphone, interruption, and two-way audio tests have not been completed because the browser test service had no credits. The agent has no workforce tools.

Production activation remains blocked until the worker/queue, durable rate limiting, tested model/voice paths, GIIE source approval/provider/embedding setup, independent security review, and timestamped acceptance evidence are all in place.


## SUPER AI commercial platform — 25 November 2026

- Created implementation branch `feat/super-ai-commercial-foundation` from main commit `1b5b3a671524bee69e412b8b31d8694f6c3d8438`.
- Added architecture charter, proposed database schema, billing specification, security specification, implementation roadmap, and task backlog under `docs/projects/super-ai-commercial-platform/`.
- Initial repository audit confirms a Next.js/TypeScript application, Stripe SDK dependency, a documented SQLite application data layer, and separate NEAS Supabase workforce/GIIE migrations. The targeted audit did not confirm an existing commercial subscription, tenant, entitlement, usage ledger, or Stripe webhook implementation.
- No code runtime, Supabase migration, Stripe account, secrets, production environment, or deployment was changed.
- Next gate: complete the detailed route/data/auth/billing audit and reuse/isolate matrix; confirm IP/license ownership; provision a dedicated SUPER AI staging database only after owner-approved access and project selection.
- Implementation documents: `docs/projects/super-ai-commercial-platform/README.md`, `DATABASE_SCHEMA.md`, `BILLING_SPEC.md`, `SECURITY_SPEC.md`, `IMPLEMENTATION_ROADMAP.md`, and `TASKS.md`.
