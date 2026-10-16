-- Add BLS (Bundeslebensmittelschluessel) as a food source and extend the foods
-- table with provenance columns for proper attribution.

-- 1. Widen the source check to include 'bls'.
alter table public.foods
  drop constraint if exists foods_source_check;
alter table public.foods
  add constraint foods_source_check check (source in ('off', 'usda', 'user', 'bls'));

-- 2. Provenance columns — apply to all sources, not just BLS.
alter table public.foods
  add column if not exists source_version text,
  add column if not exists license text,
  add column if not exists attribution text;

-- 3. Widen quality to include 'flagged' (kcal sanity-check failure on import).
alter table public.foods
  drop constraint if exists foods_quality_check;
alter table public.foods
  add constraint foods_quality_check check (quality in ('ok', 'inconsistent', 'incomplete', 'flagged'));

-- 4. RLS: BLS rows are public-read, like OFF and USDA.
drop policy if exists "foods: read public sources" on public.foods;
create policy "foods: read public sources" on public.foods
  for select to anon, authenticated using (source in ('off', 'usda', 'bls'));

-- 5. Exclude flagged rows from the default search function.
create or replace function public.search_foods(p_query text, p_limit int default 10, p_user uuid default null)
returns setof public.foods
language sql
stable
set search_path = public, extensions
as $$
  select f.*
  from public.foods f
  where (f.source <> 'user' or f.created_by = p_user)
    and f.quality <> 'flagged'
    and (
      f.name % p_query
      or coalesce(f.name_de, '') % p_query
      or f.name ilike '%' || p_query || '%'
      or f.name_de ilike '%' || p_query || '%'
    )
  order by greatest(similarity(f.name, p_query), similarity(coalesce(f.name_de, ''), p_query)) desc
  limit least(greatest(p_limit, 1), 50)
$$;
