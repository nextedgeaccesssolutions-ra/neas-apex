-- Worker audit events use the existing system actor category enforced by aiw_task_events.
-- This keeps task completion/failure updates atomic instead of rolling them back on a check violation.

CREATE OR REPLACE FUNCTION public.neas_finish_workforce_task(
  p_task_id uuid,
  p_lease_token uuid,
  p_output jsonb,
  p_worker_id text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_agent_id text;
BEGIN
  UPDATE public.aiw_tasks
     SET status = 'completed',
         output = p_output,
         completed_at = now(),
         worker_finished_at = now(),
         worker_lease_token = null,
         worker_lease_expires_at = null,
         updated_at = now(),
         error_message = null
   WHERE id = p_task_id
     AND status = 'running'
     AND worker_lease_token = p_lease_token
  RETURNING agent_id INTO v_agent_id;

  IF v_agent_id IS NULL THEN
    RETURN false;
  END IF;

  UPDATE public.aiw_agents a
     SET runtime_status = CASE
           WHEN EXISTS (
             SELECT 1 FROM public.aiw_tasks t
             WHERE t.agent_id = v_agent_id AND t.status = 'running'
           ) THEN 'running'
           ELSE 'idle'
         END,
         last_execution_at = now(),
         updated_at = now()
   WHERE a.agent_id = v_agent_id;

  INSERT INTO public.aiw_task_events(task_id, event_type, actor_type, actor_id, message, payload)
  VALUES (
    p_task_id,
    'task_completed',
    'system',
    p_worker_id,
    'Internal task completed by the NEAS shared worker runtime.',
    jsonb_build_object('worker_id', p_worker_id, 'lease_verified', true)
  );

  INSERT INTO public.aiw_worker_heartbeats(worker_id, status, last_seen_at, last_task_id, metadata)
  VALUES (p_worker_id, 'healthy', now(), p_task_id, jsonb_build_object('last_result', 'completed'))
  ON CONFLICT (worker_id) DO UPDATE
    SET status = 'healthy',
        last_seen_at = now(),
        last_task_id = EXCLUDED.last_task_id,
        metadata = EXCLUDED.metadata;

  RETURN true;
END;
$function$;

CREATE OR REPLACE FUNCTION public.neas_fail_workforce_task(
  p_task_id uuid,
  p_lease_token uuid,
  p_error text,
  p_worker_id text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_attempt integer;
  v_max integer;
  v_agent_id text;
BEGIN
  UPDATE public.aiw_tasks
     SET status = CASE WHEN attempt_count >= max_attempts THEN 'failed' ELSE 'queued' END,
         worker_lease_token = null,
         worker_lease_expires_at = null,
         worker_finished_at = now(),
         updated_at = now(),
         error_message = left(coalesce(p_error, 'Worker execution failed.'), 500)
   WHERE id = p_task_id
     AND status = 'running'
     AND worker_lease_token = p_lease_token
  RETURNING attempt_count, max_attempts, agent_id INTO v_attempt, v_max, v_agent_id;

  IF v_attempt IS NULL THEN
    RETURN false;
  END IF;

  UPDATE public.aiw_agents a
     SET runtime_status = CASE
           WHEN EXISTS (
             SELECT 1 FROM public.aiw_tasks t
             WHERE t.agent_id = v_agent_id AND t.status = 'running'
           ) THEN 'running'
           ELSE 'idle'
         END,
         updated_at = now()
   WHERE a.agent_id = v_agent_id;

  INSERT INTO public.aiw_task_events(task_id, event_type, actor_type, actor_id, message, payload)
  VALUES (
    p_task_id,
    'task_execution_failed',
    'system',
    p_worker_id,
    'Worker execution failed; task was safely retried or exhausted.',
    jsonb_build_object('worker_id', p_worker_id, 'attempt_count', v_attempt, 'max_attempts', v_max)
  );

  INSERT INTO public.aiw_worker_heartbeats(worker_id, status, last_seen_at, last_task_id, metadata)
  VALUES (p_worker_id, 'degraded', now(), p_task_id, jsonb_build_object('last_result', 'failed'))
  ON CONFLICT (worker_id) DO UPDATE
    SET status = 'degraded',
        last_seen_at = now(),
        last_task_id = EXCLUDED.last_task_id,
        metadata = EXCLUDED.metadata;

  RETURN true;
END;
$function$;
