-- NEAS GIIE: hourly Philippine public trend observations and auditable collection runs.
-- Public trend signals only. No NEAS confidential data or personal data is stored here.

create table if not exists public.giie_trend_observations (
  id uuid primary key default gen_random_uuid(),
  signal_key text not null,
  observed_hour timestamptz not null,
  title text not null,
  source_url text not null,
  source_name text not null,
  source_type text not null check (source_type in ('google-trends-rss', 'brave-search')),
  topic_group text not null,
  industry text not null,
  geography text[] not null default array['Philippines']::text[],
  search_rank integer check (search_rank is null or search_rank > 0),
  search_volume_label text,
  discovery_score smallint not null check (discovery_score between 0 and 100),
  score_method text not null,
  score_basis jsonb not null default '{}'::jsonb,
  evidence_excerpt text not null default '',
  published_at timestamptz,
  observed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint giie_trend_observations_signal_hour_unique unique (signal_key, observed_hour)
);

create index if not exists giie_trend_observations_recent_idx
  on public.giie_trend_observations (observed_at desc);
create index if not exists giie_trend_observations_industry_recent_idx
  on public.giie_trend_observations (industry, observed_at desc);
create index if not exists giie_trend_observations_topic_recent_idx
  on public.giie_trend_observations (topic_group, observed_at desc);
create index if not exists giie_trend_observations_source_recent_idx
  on public.giie_trend_observations (source_type, observed_at desc);

create table if not exists public.giie_trend_runs (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'running' check (status in ('running', 'completed', 'partial', 'failed')),
  topic_group text not null,
  queries text[] not null default '{}',
  google_trend_count integer not null default 0 check (google_trend_count >= 0),
  web_result_count integer not null default 0 check (web_result_count >= 0),
  persisted_count integer not null default 0 check (persisted_count >= 0),
  warning_summary text,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists giie_trend_runs_recent_idx
  on public.giie_trend_runs (started_at desc);

alter table public.giie_trend_observations enable row level security;
alter table public.giie_trend_observations force row level security;
alter table public.giie_trend_runs enable row level security;
alter table public.giie_trend_runs force row level security;

revoke all on table public.giie_trend_observations, public.giie_trend_runs from anon, public;
revoke all on table public.giie_trend_observations, public.giie_trend_runs from authenticated;
grant select on table public.giie_trend_observations to authenticated;
grant select on table public.giie_trend_runs to authenticated;
grant select, insert, update, delete on table public.giie_trend_observations, public.giie_trend_runs to service_role;

drop policy if exists giie_trend_observations_read on public.giie_trend_observations;
create policy giie_trend_observations_read on public.giie_trend_observations
  for select to authenticated
  using (
    exists (
      select 1 from public.user_roles r
      where r.user_id = (select auth.uid()) and r.active = true
    )
  );

drop policy if exists giie_trend_runs_admin_read on public.giie_trend_runs;
create policy giie_trend_runs_admin_read on public.giie_trend_runs
  for select to authenticated
  using (
    exists (
      select 1 from public.user_roles r
      where r.user_id = (select auth.uid()) and r.active = true and r.role = 'admin'
    )
  );

comment on table public.giie_trend_observations is
  'Timestamped public Philippine trend signals. Discovery scores are source-specific priorities, not measured search volume.';
comment on table public.giie_trend_runs is
  'Auditable execution history for scheduled public Philippine trend collection.';
