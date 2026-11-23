create or replace function public.aiw_auto_assign_department_skills()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
 delete from public.aiw_agent_skill_assignments a
 where a.agent_id=new.agent_id and a.assignment_source='auto:department'
 and not exists(select 1 from public.aiw_skill_catalog s where s.skill_key=a.skill_key and s.category=new.department and s.lifecycle_status='active');
 insert into public.aiw_agent_skill_assignments(agent_id,skill_key,priority,proficiency,enabled,assignment_source,agent_specific_guidance)
 select new.agent_id,s.skill_key,s.priority,'working',true,'auto:department',
 'Role: '||new.name||'. Mandate: '||coalesce(new.job_description,'')||' Skill focus: '||s.operating_guidance
 from public.aiw_skill_catalog s where s.category=new.department and s.lifecycle_status='active'
 on conflict(agent_id,skill_key) do update set priority=excluded.priority,enabled=true,
 agent_specific_guidance=excluded.agent_specific_guidance,updated_at=now()
 where public.aiw_agent_skill_assignments.assignment_source='auto:department';
 update public.aiw_agents ag set skills=coalesce((
  select jsonb_agg(s.name order by a.priority,s.skill_key)
  from public.aiw_agent_skill_assignments a join public.aiw_skill_catalog s using(skill_key)
  where a.agent_id=new.agent_id and a.enabled and s.lifecycle_status='active'
 ),'[]'::jsonb) where ag.agent_id=new.agent_id;
 insert into public.aiw_skill_evaluations(agent_id,skill_key,test_name,evaluation_status,notes)
 select a.agent_id,a.skill_key,'baseline-assignment-readiness','not_tested',
  'Automatically registered; live model capability and execution evidence have not yet been evaluated.'
 from public.aiw_agent_skill_assignments a
 where a.agent_id=new.agent_id and a.enabled
 and not exists(select 1 from public.aiw_skill_evaluations e where e.agent_id=a.agent_id and e.skill_key=a.skill_key and e.test_name='baseline-assignment-readiness');
 return new;
end;
$$;
revoke all on function public.aiw_auto_assign_department_skills() from public,anon,authenticated;
insert into public.aiw_skill_evaluations(agent_id,skill_key,test_name,evaluation_status,notes)
select a.agent_id,a.skill_key,'baseline-assignment-readiness','not_tested',
 'Automatically registered; live model capability and execution evidence have not yet been evaluated.'
from public.aiw_agent_skill_assignments a
where a.enabled and not exists(
 select 1 from public.aiw_skill_evaluations e
 where e.agent_id=a.agent_id and e.skill_key=a.skill_key and e.test_name='baseline-assignment-readiness'
);