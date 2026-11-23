-- Tighten table privileges for the NEAS GIIE public intelligence schema.
-- RLS policies remain the authorization boundary for authenticated users.
-- No anonymous direct access is required; trusted ingestion uses service role server-side.

revoke all privileges on table
  public.giie_sources,
  public.giie_discoveries,
  public.giie_opportunities,
  public.giie_research_jobs
from anon, authenticated;

grant select, insert, update, delete on table
  public.giie_sources,
  public.giie_discoveries,
  public.giie_opportunities,
  public.giie_research_jobs
to authenticated;

alter table public.giie_sources force row level security;
alter table public.giie_discoveries force row level security;
alter table public.giie_opportunities force row level security;
alter table public.giie_research_jobs force row level security;
