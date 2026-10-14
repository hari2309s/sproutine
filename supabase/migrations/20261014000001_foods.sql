-- Cached foods from Open Food Facts and USDA, plus user-corrected entries.
-- Lookups hit this table first so external APIs (OFF: 15 reads/min,
-- 10 searches/min) are only used for foods we've never seen.
create extension if not exists pg_trgm with schema extensions;
create extension if not exists vector with schema extensions;

create table if not exists public.foods (
  id                  uuid primary key default gen_random_uuid(),
  source              text not null check (source in ('off', 'usda', 'user')),
  -- Barcode for OFF, fdcId for USDA, own id for user entries.
  source_id           text not null,
  barcode             text check (barcode is null or barcode ~ '^\d{8}$|^\d{12,14}$'),
  name                text not null check (char_length(name) between 1 and 300),
  name_de             text,
  brand               text,
  -- {kcal, protein, fat, carbs, fiber, sugar, salt} per 100 g; null = unknown.
  per_100g            jsonb not null,
  estimated_nutrients text[] not null default '{}',
  -- false = the source never analysed allergens; an empty list then means
  -- "unknown", not "none", and must be treated as unsafe.
  allergens_known     boolean not null default false,
  allergens           text[] not null default '{}',
  traces              text[] not null default '{}',
  serving_g           numeric check (serving_g is null or serving_g > 0),
  quality             text not null check (quality in ('ok', 'inconsistent', 'incomplete')),
  -- For semantic search later (dev plan: search_food step 2).
  embedding           extensions.vector(768),
  -- Owner of user-corrected entries; null for OFF/USDA rows.
  created_by          uuid references auth.users(id) on delete cascade,
  fetched_at          timestamptz not null default now(),
  unique (source, source_id),
  check ((source = 'user') = (created_by is not null))
);

create index if not exists foods_barcode on public.foods (barcode) where barcode is not null;
create index if not exists foods_name_trgm on public.foods using gin (name extensions.gin_trgm_ops);
create index if not exists foods_name_de_trgm on public.foods using gin (name_de extensions.gin_trgm_ops);

alter table public.foods enable row level security;

-- Source data is public; corrected entries are private to their author.
create policy "foods: read public sources" on public.foods
  for select to anon, authenticated using (source in ('off', 'usda'));
create policy "foods: read own entries" on public.foods
  for select to authenticated using (created_by = (select auth.uid()));
-- No client writes: the server validates and normalises everything first.
revoke insert, update, delete on public.foods from anon, authenticated;

-- Fuzzy name search over English and German names. Security invoker, so RLS
-- applies when called with a user's token; the server passes p_user to
-- include that user's own corrected entries.
create or replace function public.search_foods(p_query text, p_limit int default 10, p_user uuid default null)
returns setof public.foods
language sql
stable
set search_path = public, extensions
as $$
  select f.*
  from public.foods f
  where (f.source <> 'user' or f.created_by = p_user)
    and (
      f.name % p_query
      or coalesce(f.name_de, '') % p_query
      or f.name ilike '%' || p_query || '%'
      or f.name_de ilike '%' || p_query || '%'
    )
  order by greatest(similarity(f.name, p_query), similarity(coalesce(f.name_de, ''), p_query)) desc
  limit least(greatest(p_limit, 1), 50)
$$;
