-- GIIE semantic-search foundation. Select a model/dimension before creating ANN indexes.
create extension if not exists vector with schema extensions;

alter table public.giie_discoveries
  add column if not exists embedding extensions.vector,
  add column if not exists embedding_model text,
  add column if not exists embedding_dimension integer,
  add column if not exists embedded_at timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'giie_discoveries_embedding_dimension_positive'
      and conrelid = 'public.giie_discoveries'::regclass
  ) then
    alter table public.giie_discoveries
      add constraint giie_discoveries_embedding_dimension_positive
      check (embedding_dimension is null or embedding_dimension > 0);
  end if;
end $$;

create or replace function public.giie_match_discoveries(
  query_embedding extensions.vector,
  match_count integer default 10,
  minimum_similarity double precision default 0.2
)
returns table (
  id uuid,
  title text,
  source_url text,
  source_name text,
  lawful_summary text,
  evidence_class text,
  confidence numeric,
  similarity double precision,
  published_at timestamptz
)
language sql
stable
security invoker
set search_path = public, extensions
as $$
  select
    d.id, d.title, d.source_url, d.source_name, d.lawful_summary,
    d.evidence_class, d.confidence,
    (1 - (d.embedding <=> query_embedding))::double precision as similarity,
    d.published_at
  from public.giie_discoveries d
  where d.embedding is not null
    and (1 - (d.embedding <=> query_embedding)) >= greatest(0, least(1, minimum_similarity))
  order by d.embedding <=> query_embedding
  limit greatest(1, least(50, match_count));
$$;

revoke all on function public.giie_match_discoveries(extensions.vector, integer, double precision) from public, anon;
grant execute on function public.giie_match_discoveries(extensions.vector, integer, double precision) to authenticated;
comment on function public.giie_match_discoveries(extensions.vector, integer, double precision)
  is 'Cosine similarity retrieval over public GIIE discoveries; SECURITY INVOKER preserves caller RLS.';
