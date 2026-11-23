# NEAS AI Workforce Skills Registry

### Live AI workforce skills registry and assignment automation — 24 November 2026

- Applied Supabase migration `202611240002_aiw_skills_registry_automation` to the connected live project.
- Added a normalized, versioned catalogue of 54 active skills across the nine workforce departments, plus per-agent assignments and skill-evaluation evidence tables.
- Backfilled 540 active assignments: six department-specific skills for each of the 90 registered agents. Each assignment carries the agent's role name, job mandate, skill-specific operating guidance, priority, and working-level proficiency label.
- Enabled the `aiw_agents_auto_assign_department_skills` database trigger. New agents and department changes automatically receive the active skills for their department; the legacy `aiw_agents.skills` JSON array is synchronized for compatibility.
- Enabled RLS on the three new registry tables. Authenticated users have read-only access; writes are reserved for the server-side service role. No service-role credential is exposed to clients.
- Verification: 90/90 agents have six synchronized skills; 540 enabled assignments; 54 active catalogue skills; trigger enabled. A baseline evaluation row is automatically registered for every assignment with status `not_tested`; 540 such records are present. These are tracking records, not passed tests.
- Runtime boundary: all 90 agents still report `runtime_status=not_configured`. Three records (CEO, Engineering Director, HSEQ Director) have `execution_mode=execute_approved`; the remaining 87 are `draft_only`. This migration did not change those settings, activate model execution, or authorize external actions.
- Migration source: `supabase/migrations/202611240002_aiw_skills_registry_automation.sql`. Implementation PR is pending review and merge.

## Data model

- `aiw_skill_catalog`: canonical skill definition, category, operating guidance, guardrails, version and lifecycle.
- `aiw_agent_skill_assignments`: agent-to-skill mapping, priority, proficiency label, enablement, assignment source and role-specific guidance.
- `aiw_skill_evaluations`: test status, score, evidence reference, notes and evaluation timestamp.

## Assignment automation

The database trigger `aiw_agents_auto_assign_department_skills` runs after agent creation or department changes. It assigns the active skills in the matching department, removes stale automatic assignments from a previous department, preserves manual assignments, synchronizes the legacy `aiw_agents.skills` JSON array, and registers a `not_tested` baseline evaluation record for each new assignment.

## Activation boundary

A catalogue entry and assignment are configuration records, not proof of model capability, certification, or successful execution. Runtime activation requires live model credentials, authenticated execution, scoped tools, durable audit, evaluations, and explicit release evidence. Safety-critical approvals, engineering certification, permits, external communications, purchases, payments, contracts, and production changes remain subject to human approval.


## Migrations

- `202611240002_aiw_skills_registry_automation.sql` — catalogue, assignments, RLS, department assignment trigger and existing-agent backfill.
- `202611240003_aiw_skill_evaluation_automation.sql` — baseline evaluation tracking for existing and future assignments.

## Specialist runtime connection — implementation in PR #56

- The Gemini chat route now resolves each of the 12 deterministic specialist profiles to a representative registered workforce agent and loads that agent's active skill assignments from Supabase using a server-only service-role credential.
- The prompt receives the six assigned skill records, role-specific guidance and guardrails as supplementary context. Registry content cannot override system governance, safety rules or approval boundaries.
- Database reads are bounded to 3 seconds and 12 skills. If the private Supabase URL/key is absent or the registry request fails, the route retains the existing deterministic specialist prompt and reports the fallback through response headers rather than failing the chat request.
- Response diagnostics include `X-NEAS-Skills-Source` (`supabase` or `static-fallback`) and `X-NEAS-Skills-Loaded`. These headers are runtime diagnostics, not proof of agent autonomy.
- The mapping is explicitly limited to 12 representative profiles; it does not imply that all 90 workforce records are separate model instances. All 90 records remain `runtime_status=not_configured`; no background workers or external-action permissions are activated.
- To use database-backed skills in deployment, configure `SUPABASE_URL` (or `NEXT_PUBLIC_SUPABASE_URL`) and `SUPABASE_SERVICE_ROLE_KEY` as private server-side Vercel environment variables for the relevant environment. Never expose the service-role key to browser code or use a `NEXT_PUBLIC_` service-key variable.
- Added unit tests for the specialist-to-agent mapping, active-skill normalization, and prompt guardrail preservation. CI and a deployed runtime probe remain pending.
