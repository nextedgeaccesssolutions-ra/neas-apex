-- NEAS GIIE Commercial Intelligence.
-- This migration is additive. It does not alter existing GIIE tables or user data.
-- Search results are leads, not verified opportunities or approved public claims.

create table if not exists public.giie_commercial_signals (
  id uuid primary key default gen_random_uuid(),
  signal_key text not null unique,
  title text not null,
  source_url text not null,
  source_name text not null,
  source_provider text not null check (source_provider in ('brave-search')),
  industry text not null,
  signal_type text not null check (signal_type in (
    'tender-procurement','contract-award','project-investment','asset-maintenance',
    'business-expansion','workforce-demand','market-demand','general-commercial'
  )),
  geography text[] not null default array['Philippines']::text[],
  published_at timestamptz,
  discovered_at timestamptz not null default now(),
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  seen_count integer not null default 1 check (seen_count > 0),
  discovery_score smallint not null check (discovery_score between 0 and 100),
  score_method text not null default 'commercial_opportunity_priority_v1',
  score_basis jsonb not null default '{}'::jsonb,
  evidence_excerpt text not null default '',
  verification_status text not null default 'unverified'
    check (verification_status in ('unverified','verification_pending','verified','contradicted')),
  lead_status text not null default 'new'
    check (lead_status in ('new','shortlisted','qualified','dismissed','converted')),
  publication_status text not null default 'blocked_unverified'
    check (publication_status in ('blocked_unverified','approval_required','eligible_for_auto','published','rejected')),
  publication_reason text not null default 'Search-result metadata is an unverified lead.',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists giie_commercial_signals_score_idx
  on public.giie_commercial_signals (discovery_score desc, last_seen_at desc);
create index if not exists giie_commercial_signals_industry_idx
  on public.giie_commercial_signals (industry, last_seen_at desc);
create index if not exists giie_commercial_signals_type_idx
  on public.giie_commercial_signals (signal_type, last_seen_at desc);
create index if not exists giie_commercial_signals_status_idx
  on public.giie_commercial_signals (verification_status, lead_status, last_seen_at desc);

create table if not exists public.giie_commercial_runs (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'running'
    check (status in ('running','completed','partial','failed')),
  topic_group text not null,
  queries text[] not null default '{}',
  result_count integer not null default 0 check (result_count >= 0),
  inserted_or_updated_count integer not null default 0 check (inserted_or_updated_count >= 0),
  warning_summary text,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists giie_commercial_runs_recent_idx
  on public.giie_commercial_runs (started_at desc);

alter table public.giie_commercial_signals enable row level security;
alter table public.giie_commercial_signals force row level security;
alter table public.giie_commercial_runs enable row level security;
alter table public.giie_commercial_runs force row level security;

revoke all on table public.giie_commercial_signals, public.giie_commercial_runs from anon, public;
revoke all on table public.giie_commercial_signals, public.giie_commercial_runs from authenticated;
grant select on table public.giie_commercial_signals to authenticated;
grant select on table public.giie_commercial_runs to authenticated;
grant select, insert, update, delete on table public.giie_commercial_signals, public.giie_commercial_runs to service_role;

drop policy if exists giie_commercial_signals_read on public.giie_commercial_signals;
create policy giie_commercial_signals_read on public.giie_commercial_signals
  for select to authenticated
  using (
    exists (
      select 1 from public.user_roles r
      where r.user_id = (select auth.uid()) and r.active = true
    )
  );

drop policy if exists giie_commercial_runs_admin_read on public.giie_commercial_runs;
create policy giie_commercial_runs_admin_read on public.giie_commercial_runs
  for select to authenticated
  using (
    exists (
      select 1 from public.user_roles r
      where r.user_id = (select auth.uid()) and r.active = true and r.role = 'admin'
    )
  );

-- Atomic, service-role-only upsert preserves first_seen_at and increments recurrence.
create or replace function public.upsert_giie_commercial_signals(p_signals jsonb)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_count integer;
begin
  if jsonb_typeof(p_signals) <> 'array' then
    raise exception 'p_signals must be a JSON array';
  end if;

  insert into public.giie_commercial_signals (
    signal_key, title, source_url, source_name, source_provider, industry, signal_type,
    geography, published_at, discovered_at, first_seen_at, last_seen_at, seen_count,
    discovery_score, score_method, score_basis, evidence_excerpt, verification_status,
    lead_status, publication_status, publication_reason
  )
  select
    x.signal_key, x.title, x.source_url, x.source_name, x.source_provider, x.industry, x.signal_type,
    coalesce(x.geography, array['Philippines']::text[]), x.published_at, x.discovered_at,
    x.discovered_at, x.discovered_at, 1, x.discovery_score, x.score_method,
    coalesce(x.score_basis, '{}'::jsonb), coalesce(x.evidence_excerpt, ''),
    'unverified', 'new', 'blocked_unverified',
    'Search-result metadata is an unverified lead. Public publishing requires source verification, independent corroboration, and a safe informational content classification.'
  from jsonb_to_recordset(p_signals) as x(
    signal_key text, title text, source_url text, source_name text, source_provider text,
    industry text, signal_type text, geography text[], published_at timestamptz,
    discovered_at timestamptz, discovery_score smallint, score_method text,
    score_basis jsonb, evidence_excerpt text
  )
  on conflict (signal_key) do update set
    last_seen_at = greatest(public.giie_commercial_signals.last_seen_at, excluded.last_seen_at),
    seen_count = public.giie_commercial_signals.seen_count + 1,
    discovery_score = greatest(public.giie_commercial_signals.discovery_score, excluded.discovery_score),
    score_basis = excluded.score_basis,
    evidence_excerpt = case when excluded.evidence_excerpt <> '' then excluded.evidence_excerpt else public.giie_commercial_signals.evidence_excerpt end,
    updated_at = now();

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.upsert_giie_commercial_signals(jsonb) from public, anon, authenticated;
grant execute on function public.upsert_giie_commercial_signals(jsonb) to service_role;

comment on table public.giie_commercial_signals is
  'Commercial research leads discovered from public search. Unverified by default; never treat priority score as revenue or win probability.';
comment on table public.giie_commercial_runs is
  'Auditable hourly commercial-intelligence collection history.';
comment on function public.upsert_giie_commercial_signals(jsonb) is
  'Atomic service-role-only upsert for public commercial research leads; preserves first-seen time and increments recurrence.';
