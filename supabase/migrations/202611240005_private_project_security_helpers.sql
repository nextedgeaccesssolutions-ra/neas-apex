-- Keep SECURITY DEFINER helpers used by project RLS out of the exposed public API schema.
-- The authenticated role can execute these only as policy helpers; PostgREST should not expose private.

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA private TO authenticated;

CREATE OR REPLACE FUNCTION private.neas_current_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $function$
  SELECT COALESCE(
    (
      SELECT ur.role::text
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.active = true
      LIMIT 1
    ),
    'viewer'
  );
$function$;

CREATE OR REPLACE FUNCTION private.neas_can_manage_project(pid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, auth, private
AS $function$
  SELECT private.neas_current_role() = 'admin'
    OR EXISTS (
      SELECT 1
      FROM public.project_memberships pm
      WHERE pm.project_id = pid
        AND pm.user_id = auth.uid()
        AND pm.project_role IN ('admin', 'project_manager')
    );
$function$;

CREATE OR REPLACE FUNCTION private.neas_is_project_member(pid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, auth, private
AS $function$
  SELECT private.neas_current_role() = 'admin'
    OR EXISTS (
      SELECT 1
      FROM public.project_memberships pm
      WHERE pm.project_id = pid
        AND pm.user_id = auth.uid()
    );
$function$;

REVOKE ALL ON FUNCTION private.neas_current_role() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.neas_can_manage_project(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.neas_is_project_member(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.neas_current_role() TO authenticated;
GRANT EXECUTE ON FUNCTION private.neas_can_manage_project(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.neas_is_project_member(uuid) TO authenticated;

-- Preserve the existing RLS behavior while moving the helpers out of public.
ALTER POLICY memberships_delete_manager ON public.project_memberships
  USING (private.neas_can_manage_project(project_id));
ALTER POLICY memberships_insert_manager ON public.project_memberships
  WITH CHECK (private.neas_can_manage_project(project_id));
ALTER POLICY memberships_select_project ON public.project_memberships
  USING ((user_id = (SELECT auth.uid())) OR private.neas_can_manage_project(project_id));
ALTER POLICY memberships_update_manager ON public.project_memberships
  USING (private.neas_can_manage_project(project_id))
  WITH CHECK (private.neas_can_manage_project(project_id));

ALTER POLICY projects_delete_admin ON public.projects
  USING (private.neas_current_role() = 'admin');
ALTER POLICY projects_insert_manager ON public.projects
  WITH CHECK (
    created_by = (SELECT auth.uid())
    AND private.neas_current_role() = ANY (ARRAY['admin'::text, 'project_manager'::text])
  );
ALTER POLICY projects_select_member ON public.projects
  USING (private.neas_is_project_member(id));
ALTER POLICY projects_update_manager ON public.projects
  USING (private.neas_can_manage_project(id))
  WITH CHECK (private.neas_can_manage_project(id));

-- Retain the old names only for compatibility with migration history; they are no longer callable.
REVOKE ALL ON FUNCTION public.neas_current_role() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.neas_can_manage_project(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.neas_is_project_member(uuid) FROM PUBLIC, anon, authenticated;

COMMENT ON SCHEMA private IS
  'Non-PostgREST schema for tightly scoped security helpers used by RLS policies.';
