-- NEAS GIIE public intelligence store.
-- Apply only after explicit database migration approval.
-- Confidential NEAS records are intentionally not stored in these tables.

create table if not exists public.giie_sources (
  id uuid primary key default gen_random_uuid(),
  source_url text not null unique,
  source_name text not null,
  source_type text not null check (source_type in (
    'official-api','rss','public-webpage','government','standards-organization',
    'peer-reviewed-journal','academic-repository','patent-database',
    'open-source-repository','public-tender-portal','industry-publication',
    'public-forum','public-video'
  )),
  enabled boolean not null default false,
  terms_reviewed boolean not null default false,
  robots_reviewed boolean not null default false,
  quota_per_hour integer not null default 0 check (quota_per_hour >= 0),
  last_checked_at timestamptz,
  last_success_at timestamptz,
  last_error text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.giie_discoveries (
  id uuid primary key default gen_random_uuid(),
  knowledge_space text not null default 'public-global-intelligence'
    check (knowledge_space = 'public-global-intelligence'),
  source_id uuid references public.giie_sources(id) on delete set null,
  source_url text not null,
  normalized_url text not null,
  content_fingerprint text,
  title text not null,
  source_name text not null,
  source_type text not null,
  published_at timestamptz,
  discovered_at timestamptz not null default now(),
  author_or_organization text,
  subjects text[] not null default '{}',
  core_concept text not null default '',
  problem text,
  proposed_solution text,
  technology text[] not null default '{}',
  industries text[] not null default '{}',
  geography text[] not null default '{}',
  evidence_class text not null default 'unverified-claim'
    check (evidence_class in ('verified-official','peer-reviewed-research','credible-secondary','industry-opinion','unverified-claim','ai-generated-hypothesis')),
  status text not null default 'discovered'
    check (status in ('discovered','extracted','classified','verification-pending','verified','contradicted','archived')),
  lawful_summary text not null,
  license_notes text,
  corroborating_source_urls text[] not null default '{}',
  contradiction_notes text[] not null default '{}',
  confidence numeric(4,3) not null default 0.250 check (confidence between 0 and 1),
  relevance_score smallint check (relevance_score between 0 and 100),
  freshness_days integer check (freshness_days is null or freshness_days >= 0),
  review_required boolean not null default true,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  search_document tsvector generated always as (
    setweight(to_tsvector('english', coalesce(title,'')), 'A') ||
    setweight(to_tsvector('english', coalesce(core_concept,'')), 'A') ||
    setweight(to_tsvector('english', coalesce(lawful_summary,'')), 'B') ||
    setweight(to_tsvector('english', array_to_string(subjects, ' ')), 'B') ||
    setweight(to_tsvector('english', array_to_string(industries, ' ')), 'C')
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(normalized_url)
);

create index if not exists giie_discoveries_search_idx
  on public.giie_discoveries using gin(search_document);
create index if not exists giie_discoveries_status_idx
  on public.giie_discoveries(status, discovered_at desc);
create index if not exists giie_discoveries_industries_idx
  on public.giie_discoveries using gin(industries);
create index if not exists giie_discoveries_fingerprint_idx
  on public.giie_discoveries(content_fingerprint)
  where content_fingerprint is not null;

create table if not exists public.giie_opportunities (
  id uuid primary key default gen_random_uuid(),
  discovery_id uuid not null references public.giie_discoveries(id) on delete cascade,
  opportunity text not null,
  target_industries text[] not null default '{}',
  target_geographies text[] not null default '{}',
  potential_client_segments text[] not null default '{}',
  required_competencies text[] not null default '{}',
  required_equipment text[] not null default '{}',
  estimated_investment numeric,
  investment_currency text,
  investment_basis text not null default 'unknown',
  investment_confidence text not null default 'unknown'
    check (investment_confidence in ('quoted','estimated','unknown')),
  revenue_model text not null default '',
  commercial_feasibility text not null default 'undetermined'
    check (commercial_feasibility in ('high','medium','low','undetermined')),
  implementation_roadmap jsonb not null default '[]'::jsonb,
  risks jsonb not null default '[]'::jsonb,
  evidence_gaps jsonb not null default '[]'::jsonb,
  recommended_next_action text not null default '',
  approval_status text not null default 'pending'
    check (approval_status in ('pending','approved','rejected','implemented')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.giie_research_jobs (
  id uuid primary key default gen_random_uuid(),
  query text not null,
  research_agent text,
  status text not null default 'queued'
    check (status in ('queued','running','completed','failed','cancelled')),
  source_count integer not null default 0 check (source_count >= 0),
  result_count integer not null default 0 check (result_count >= 0),
  estimated_cost numeric,
  actual_cost numeric,
  error_message text,
  requested_by uuid references auth.users(id) on delete set null,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.giie_sources enable row level security;
alter table public.giie_discoveries enable row level security;
alter table public.giie_opportunities enable row level security;
alter table public.giie_research_jobs enable row level security;

-- Authenticated NEAS users may read public intelligence.
drop policy if exists giie_sources_read on public.giie_sources;
create policy giie_sources_read on public.giie_sources
  for select to authenticated using (
    exists (select 1 from public.user_roles r where r.user_id = auth.uid() and r.active = true)
  );
drop policy if exists giie_discoveries_read on public.giie_discoveries;
create policy giie_discoveries_read on public.giie_discoveries
  for select to authenticated using (
    exists (select 1 from public.user_roles r where r.user_id = auth.uid() and r.active = true)
  );
drop policy if exists giie_opportunities_read on public.giie_opportunities;
create policy giie_opportunities_read on public.giie_opportunities
  for select to authenticated using (
    exists (select 1 from public.user_roles r where r.user_id = auth.uid() and r.active = true)
  );
drop policy if exists giie_jobs_read on public.giie_research_jobs;
create policy giie_jobs_read on public.giie_research_jobs
  for select to authenticated using (
    exists (select 1 from public.user_roles r where r.user_id = auth.uid() and r.active = true)
  );

-- Only active NEAS admins may manage source configuration, review discoveries,
-- manage opportunity assessments, or inspect research jobs.
drop policy if exists giie_sources_admin_all on public.giie_sources;
create policy giie_sources_admin_all on public.giie_sources
  for all to authenticated using (
    exists (select 1 from public.user_roles r where r.user_id = auth.uid() and r.active = true and r.role = 'admin')
  ) with check (
    exists (select 1 from public.user_roles r where r.user_id = auth.uid() and r.active = true and r.role = 'admin')
  );
drop policy if exists giie_discoveries_admin_all on public.giie_discoveries;
create policy giie_discoveries_admin_all on public.giie_discoveries
  for all to authenticated using (
    exists (select 1 from public.user_roles r where r.user_id = auth.uid() and r.active = true and r.role = 'admin')
  ) with check (
    exists (select 1 from public.user_roles r where r.user_id = auth.uid() and r.active = true and r.role = 'admin')
  );
drop policy if exists giie_opportunities_admin_all on public.giie_opportunities;
create policy giie_opportunities_admin_all on public.giie_opportunities
  for all to authenticated using (
    exists (select 1 from public.user_roles r where r.user_id = auth.uid() and r.active = true and r.role = 'admin')
  ) with check (
    exists (select 1 from public.user_roles r where r.user_id = auth.uid() and r.active = true and r.role = 'admin')
  );
drop policy if exists giie_jobs_admin_all on public.giie_research_jobs;
create policy giie_jobs_admin_all on public.giie_research_jobs
  for all to authenticated using (
    exists (select 1 from public.user_roles r where r.user_id = auth.uid() and r.active = true and r.role = 'admin')
  ) with check (
    exists (select 1 from public.user_roles r where r.user_id = auth.uid() and r.active = true and r.role = 'admin')
  );

grant select on public.giie_sources, public.giie_discoveries,
  public.giie_opportunities, public.giie_research_jobs to authenticated;
grant insert, update, delete on public.giie_sources, public.giie_discoveries,
  public.giie_opportunities, public.giie_research_jobs to authenticated;
