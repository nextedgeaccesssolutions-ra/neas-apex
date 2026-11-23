-- GIIE security hardening. Idempotent and additive.
alter table public.giie_sources enable row level security;
alter table public.giie_sources force row level security;
alter table public.giie_discoveries enable row level security;
alter table public.giie_discoveries force row level security;
alter table public.giie_opportunities enable row level security;
alter table public.giie_opportunities force row level security;
alter table public.giie_research_jobs enable row level security;
alter table public.giie_research_jobs force row level security;

revoke all on table public.giie_sources, public.giie_discoveries,
  public.giie_opportunities, public.giie_research_jobs from anon;
revoke all on table public.giie_sources, public.giie_discoveries,
  public.giie_opportunities, public.giie_research_jobs from public;

grant select, insert, update, delete on table public.giie_sources,
  public.giie_discoveries, public.giie_opportunities, public.giie_research_jobs
  to authenticated;

comment on table public.giie_sources is 'Public-source registry for GIIE; access governed by RLS.';
comment on table public.giie_discoveries is 'Public-global-intelligence discoveries only; not confidential NEAS records.';
comment on table public.giie_opportunities is 'Approval-gated NEAS opportunity assessments derived from public discoveries.';
comment on table public.giie_research_jobs is 'Auditable GIIE research job records.';
