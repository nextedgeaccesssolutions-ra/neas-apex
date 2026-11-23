# NEAS AI Workforce Skills Registry

### Live AI workforce skills registry and assignment automation — 24 November 2026

- Applied Supabase migration `202611240002_aiw_skills_registry_automation` to the connected live project.
- Added a normalized, versioned catalogue of 54 active skills across the nine workforce departments, plus per-agent assignments and skill-evaluation evidence tables.
- Backfilled 540 active assignments: six department-specific skills for each of the 90 registered agents. Each assignment carries the agent's role name, job mandate, skill-specific operating guidance, priority, and working-level proficiency label.
- Enabled the `aiw_agents_auto_assign_department_skills` database trigger. New agents and department changes automatically receive the active skills for their department; the legacy `aiw_agents.skills` JSON array is synchronized for compatibility.
- Enabled RLS on the three new registry tables. Authenticated users have read-only access; writes are reserved for the server-side service role. No service-role credential is exposed to clients.
- Verification: 90/90 agents have six synchronized skills; 540 enabled assignments; 54 active catalogue skills; trigger enabled. No skill evaluations have been recorded yet.
- Runtime boundary: all 90 agents still report `runtime_status=not_configured`. Three records (CEO, Engineering Director, HSEQ Director) have `execution_mode=execute_approved`; the remaining 87 are `draft_only`. This migration did not change those settings, activate model execution, or authorize external actions.
- Migration source: `supabase/migrations/202611240002_aiw_skills_registry_automation.sql`. Implementation PR is pending review and merge.

## Data model

- `aiw_skill_catalog`: canonical skill definition, category, operating guidance, guardrails, version and lifecycle.
- `aiw_agent_skill_assignments`: agent-to-skill mapping, priority, proficiency label, enablement, assignment source and role-specific guidance.
- `aiw_skill_evaluations`: test status, score, evidence reference, notes and evaluation timestamp.

## Assignment automation

The database trigger `aiw_agents_auto_assign_department_skills` runs after agent creation or department changes. It assigns the active skills in the matching department, removes stale automatic assignments from a previous department, preserves manual assignments, and synchronizes the legacy `aiw_agents.skills` JSON array.

## Activation boundary

A catalogue entry and assignment are configuration records, not proof of model capability, certification, or successful execution. Runtime activation requires live model credentials, authenticated execution, scoped tools, durable audit, evaluations, and explicit release evidence. Safety-critical approvals, engineering certification, permits, external communications, purchases, payments, contracts, and production changes remain subject to human approval.
