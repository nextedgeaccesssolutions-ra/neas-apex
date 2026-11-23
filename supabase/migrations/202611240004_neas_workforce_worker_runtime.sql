-- NEAS APEX durable specialist worker queue
-- Safe internal tasks only; external, financial, safety, production and business mutations remain approval-gated.
alter table public.aiw_tasks
  add column if not exists worker_lease_token uuid,
  add column if not exists worker_lease_expires_at timestamptz,
  add column if not exists worker_started_at timestamptz,
  add column if not exists worker_finished_at timestamptz;

create table if not exists public.aiw_worker_heartbeats (
  worker_id text primary key,
  status text not null check (status in ('healthy','degraded','stopped')),
  last_seen_at timestamptz not null default now(),
  last_task_id uuid null references public.aiw_tasks(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb
);

alter table public.aiw_worker_heartbeats enable row level security;
revoke all on public.aiw_worker_heartbeats from anon, authenticated;
grant select on public.aiw_worker_heartbeats to authenticated;

create or replace function public.neas_claim_workforce_tasks(p_worker_id text, p_limit integer default 3)
returns table (
  task_id uuid,
  lease_token uuid,
  title text,
  objective text,
  agent_id text,
  department_code text,
  task_input jsonb,
  agent_name text,
  agent_system_prompt text,
  agent_job_description text,
  agent_skills jsonb,
  agent_execution_mode text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_worker_id is null or length(trim(p_worker_id)) < 3 then
    raise exception 'Invalid worker identity';
  end if;
  if p_limit < 1 or p_limit > 5 then
    raise exception 'Worker batch limit must be between 1 and 5';
  end if;

  return query
  with candidates as (
    select t.id
    from public.aiw_tasks t
    join public.aiw_agents a on a.agent_id = t.agent_id
    where t.status = 'queued'
      and t.requires_approval = false
      and t.attempt_count < t.max_attempts
      and a.enabled = true
      and a.execution_mode in ('draft_only','execute_approved')
      and coalesce(t.input->>'operation','') in ('summarize_internal','draft_internal','plan_tasks','read_only_check')
      and (t.worker_lease_expires_at is null or t.worker_lease_expires_at < now())
    order by
      case t.priority when 'critical' then 0 when 'high' then 1 when 'normal' then 2 else 3 end,
      t.created_at asc
    for update of t skip locked
    limit p_limit
  ),
  claimed as (
    update public.aiw_tasks t
       set status = 'running',
           worker_lease_token = gen_random_uuid(),
           worker_lease_expires_at = now() + interval '3 minutes',
           worker_started_at = now(),
           started_at = coalesce(t.started_at, now()),
           attempt_count = t.attempt_count + 1,
           updated_at = now(),
           error_message = null
      from candidates c
     where t.id = c.id
    returning t.*
  ),
  agent_runtime as (
    update public.aiw_agents a
       set runtime_status = 'running',
           updated_at = now()
      from claimed c
     where a.agent_id = c.agent_id
    returning a.agent_id
  )
  select c.id, c.worker_lease_token, c.title, c.objective, c.agent_id, c.department_code,
         c.input, a.name, a.system_prompt, a.job_description, a.skills, a.execution_mode
    from claimed c
    join public.aiw_agents a on a.agent_id = c.agent_id
    join agent_runtime ar on ar.agent_id = a.agent_id;
end;
$$;

create or replace function public.neas_finish_workforce_task(
  p_task_id uuid,
  p_lease_token uuid,
  p_output jsonb,
  p_worker_id text
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare v_agent_id text;
begin
  update public.aiw_tasks
     set status = 'completed',
         output = p_output,
         completed_at = now(),
         worker_finished_at = now(),
         worker_lease_token = null,
         worker_lease_expires_at = null,
         updated_at = now(),
         error_message = null
   where id = p_task_id
     and status = 'running'
     and worker_lease_token = p_lease_token
  returning agent_id into v_agent_id;

  if v_agent_id is null then return false; end if;

  update public.aiw_agents
     set runtime_status = 'idle',
         last_execution_at = now(),
         updated_at = now()
   where agent_id = v_agent_id;

  insert into public.aiw_task_events(task_id,event_type,actor_type,actor_id,message,payload)
  values (p_task_id,'task_completed','worker',p_worker_id,'Internal task completed by the NEAS shared worker runtime.',
          jsonb_build_object('worker_id',p_worker_id,'lease_verified',true));

  insert into public.aiw_worker_heartbeats(worker_id,status,last_seen_at,last_task_id,metadata)
  values (p_worker_id,'healthy',now(),p_task_id,jsonb_build_object('last_result','completed'))
  on conflict (worker_id) do update set status='healthy',last_seen_at=now(),last_task_id=excluded.last_task_id,metadata=excluded.metadata;
  return true;
end;
$$;

create or replace function public.neas_fail_workforce_task(
  p_task_id uuid,
  p_lease_token uuid,
  p_error text,
  p_worker_id text
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare v_attempt integer; v_max integer;
begin
  update public.aiw_tasks
     set status = case when attempt_count >= max_attempts then 'failed' else 'queued' end,
         worker_lease_token = null,
         worker_lease_expires_at = null,
         worker_finished_at = now(),
         updated_at = now(),
         error_message = left(coalesce(p_error,'Worker execution failed.'),500)
   where id = p_task_id
     and status = 'running'
     and worker_lease_token = p_lease_token
  returning attempt_count,max_attempts into v_attempt,v_max;

  if v_attempt is null then return false; end if;

  insert into public.aiw_task_events(task_id,event_type,actor_type,actor_id,message,payload)
  values (p_task_id,'task_execution_failed','worker',p_worker_id,'Worker execution failed; task was safely retried or exhausted.',
          jsonb_build_object('worker_id',p_worker_id,'attempt_count',v_attempt,'max_attempts',v_max));
  insert into public.aiw_worker_heartbeats(worker_id,status,last_seen_at,last_task_id,metadata)
  values (p_worker_id,'degraded',now(),p_task_id,jsonb_build_object('last_result','failed'))
  on conflict (worker_id) do update set status='degraded',last_seen_at=now(),last_task_id=excluded.last_task_id,metadata=excluded.metadata;
  return true;
end;
$$;

revoke all on function public.neas_claim_workforce_tasks(text,integer) from public, anon, authenticated;
revoke all on function public.neas_finish_workforce_task(uuid,uuid,jsonb,text) from public, anon, authenticated;
revoke all on function public.neas_fail_workforce_task(uuid,uuid,text,text) from public, anon, authenticated;
grant execute on function public.neas_claim_workforce_tasks(text,integer) to service_role;
grant execute on function public.neas_finish_workforce_task(uuid,uuid,jsonb,text) to service_role;
grant execute on function public.neas_fail_workforce_task(uuid,uuid,text,text) to service_role;
