-- Read-only: run in the NEAS production project's Supabase SQL Editor.
-- Returns no task bodies, secrets, or customer data. Does not enqueue any work.
with first_agent as (
  select agent_id from public.aiw_agents
  where enabled and execution_mode in ('draft_only','execute_approved')
  order by agent_id limit 1
), pilot as (
  select t.*, count(*) over () as pilot_count
  from public.aiw_tasks t where idempotency_key like 'pilot-20261124-001-%'
), evidence as (
  select a.agent_id as expected_agent, t.agent_id, t.id as task_id, t.status,
         t.completed_at, t.output->>'model' as model, ev.completed_event_at,
         coalesce(t.pilot_count,0) as pilot_count,
         (coalesce(t.output->>'text','') ~ '[^[:space:]]') as has_output,
         coalesce(t.input->>'operation' = 'draft_internal' and
                  t.output->>'execution_mode' = 'internal_draft_only',false) as internal_draft,
         t.idempotency_key
  from (select (select agent_id from first_agent) as agent_id) a
  left join pilot t on true
  left join lateral (
    select max(e.created_at) as completed_event_at
    from public.aiw_task_events e where e.task_id=t.id
      and e.event_type='task_completed' and e.actor_type='system'
      and e.payload @> '{"lease_verified":true}'::jsonb
  ) ev on true
)
select expected_agent, agent_id, task_id, status, completed_at, model,
       completed_event_at, has_output, internal_draft,
       case when expected_agent is null then 'NO_ELIGIBLE_AGENT'
            when pilot_count=0 then 'NOT_FOUND'
            when pilot_count<>1 then 'REVIEW_DUPLICATES'
            when agent_id=expected_agent and idempotency_key='pilot-20261124-001-'||expected_agent
             and status='completed' and completed_at is not null
             and has_output and internal_draft and completed_event_at is not null then 'VERIFIED'
            else 'NOT_VERIFIED' end as pilot_gate
from evidence;
