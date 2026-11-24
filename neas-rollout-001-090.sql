-- NEAS 90-agent rollout, one by one. Run in Supabase SQL editor.
-- Rule: enqueue N+1 ONLY after N shows status='completed' + task_completed event.
-- Replace <YOUR-ADMIN-USER-ID> once (your auth.users id).

-- ============ 0. BASELINE (run once) ============
select count(*) filter (where enabled) as enabled_agents,
       count(*) filter (where enabled and runtime_status='not_configured') as awaiting_proof,
       count(*) filter (where enabled and runtime_status='idle') as proven_idle,
       count(*) filter (where status = 'x') as placeholder
from aiw_agents;

select agent_id, name, department_code, execution_mode, runtime_status
from aiw_agents
where enabled = true
order by agent_id;

-- ============ 1. AGENT #001 (run now) ============
-- Enqueue exactly one task for the first agent in order.
with cohort as (
  select agent_id, department_code,
         row_number() over (order by agent_id) as n
  from aiw_agents
  where enabled = true
    and execution_mode in ('draft_only', 'execute_approved')
),
pick as (select * from cohort where n = 1)
insert into aiw_tasks (
  title, objective, agent_id, department_code, status, priority, input,
  idempotency_key, created_by, assigned_by,
  attempt_count, max_attempts, max_delegation_depth,
  requires_approval, approval_category, error_message
)
select
  'Pilot internal draft check 001/090',
  'Prepare an internal draft summary for your department. Do not send, publish, spend, approve, or change any record. Internal analysis only.',
  p.agent_id, p.department_code, 'queued', 'low',
  jsonb_build_object('operation','draft_internal','objective','internal draft only','requested_agent',p.agent_id),
  'pilot-20261124-001-' || p.agent_id,
  '<YOUR-ADMIN-USER-ID>', '<YOUR-ADMIN-USER-ID>',
  0, 3, 0, false, null, null
from pick p
returning id, agent_id, status;

-- ============ 2. VERIFY #001 (wait 5-10 min, then run) ============
select id, agent_id, status, completed_at, left(error_message,200) as err
from aiw_tasks where idempotency_key like 'pilot-20261124-001-%';

select e.event_type, e.created_at
from aiw_tasks t join aiw_task_events e on e.task_id = t.id
where t.idempotency_key like 'pilot-20261124-001-%'
order by e.created_at desc limit 5;

-- PROCEED to #002 only if status='completed' AND a task_completed event exists.
-- If running: wait one more cycle. If failed: paste err here and stop the line.

-- ============ 3. TEMPLATE FOR #002..#090 ============
-- Copy this block, change 002 -> 003, 004, ... 090, one at a time.
-- NEVER enqueue two numbers in the same session.
/*
with cohort as (
  select agent_id, department_code,
         row_number() over (order by agent_id) as n
  from aiw_agents
  where enabled = true
    and execution_mode in ('draft_only', 'execute_approved')
),
pick as (select * from cohort where n = 2)
insert into aiw_tasks (
  title, objective, agent_id, department_code, status, priority, input,
  idempotency_key, created_by, assigned_by,
  attempt_count, max_attempts, max_delegation_depth,
  requires_approval, approval_category, error_message
)
select
  'Pilot internal draft check 002/090',
  'Prepare an internal draft summary for your department. Do not send, publish, spend, approve, or change any record. Internal analysis only.',
  p.agent_id, p.department_code, 'queued', 'low',
  jsonb_build_object('operation','draft_internal','objective','internal draft only','requested_agent',p.agent_id),
  'pilot-20261124-002-' || p.agent_id,
  '<YOUR-ADMIN-USER-ID>', '<YOUR-ADMIN-USER-ID>',
  0, 3, 0, false, null, null
from pick p
returning id, agent_id, status;

select id, agent_id, status, completed_at, left(error_message,200) as err
from aiw_tasks where idempotency_key like 'pilot-20261124-002-%';
*/

-- ============ 4. ROLLUP (any time) ============
select substring(idempotency_key from 'pilot-20261124-([0-9]+)-') as pilot_no,
       agent_id, status, completed_at
from aiw_tasks
where idempotency_key like 'pilot-20261124-%'
order by pilot_no;

select status, count(*) from aiw_tasks
where idempotency_key like 'pilot-20261124-%'
group by status;

-- FINISH LINE: 90 rows completed + 90 task_completed events + heartbeat completed>=90.
-- Financial, customer-facing, safety, engineering sign-off, and production
-- actions stay approval-gated for every agent. No bulk status update, ever.
