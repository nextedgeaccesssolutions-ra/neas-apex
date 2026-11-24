-- Agent #003 = accounts-receivable (FIN, draft_only). Idempotent, safe to re-run.
with ins as (
  insert into public.aiw_tasks (
    title, objective, agent_id, department_code, status, priority, input,
    idempotency_key, created_by, assigned_by, attempt_count, max_attempts,
    max_delegation_depth, requires_approval, approval_category, error_message
  )
  select 'Pilot internal draft check 003/090',
         'Draft three safe habits for keeping customer payment records accurate. Fictional examples only; do not contact customers, change records, or send anything.',
         'accounts-receivable', 'FIN', 'blocked', 'low',
         '{"operation":"draft_internal","requested_agent":"accounts-receivable"}'::jsonb,
         'pilot-20261124-003-accounts-receivable', 'sql-console', 'sql-console',
         0, 3, 0, false, null, null
  where not exists (
    select 1 from public.aiw_tasks
    where idempotency_key = 'pilot-20261124-003-accounts-receivable'
  )
  returning id
)
insert into public.aiw_task_events (task_id, event_type, actor_type, actor_id, message, payload)
select id, 'task_submission_recorded', 'human', 'sql-console',
       'Submission recorded via SQL console for pilot 003.',
       '{"operation":"draft_internal","created_via":"sql_console"}'::jsonb
from ins;

insert into public.aiw_audit_events (actor_type, actor_id, action, resource_type, resource_id, outcome, details, request_id)
select 'human', 'sql-console', 'workforce.task.submit', 'aiw_task', t.id, 'pending',
       '{"operation":"draft_internal","agent_id":"accounts-receivable","created_via":"sql_console"}'::jsonb,
       gen_random_uuid()
from public.aiw_tasks t
where t.idempotency_key = 'pilot-20261124-003-accounts-receivable'
  and not exists (select 1 from public.aiw_audit_events a where a.resource_id = t.id);

update public.aiw_tasks
   set status = 'queued', error_message = null, updated_at = now()
 where idempotency_key = 'pilot-20261124-003-accounts-receivable'
   and status = 'blocked';

select id, agent_id, status, attempt_count,
       (select count(*) from public.aiw_task_events e where e.task_id = t.id) as events
from public.aiw_tasks t
where idempotency_key = 'pilot-20261124-003-accounts-receivable';
