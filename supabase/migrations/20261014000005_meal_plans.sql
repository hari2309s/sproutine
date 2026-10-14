-- Weekly meal plans. The plan is built and checked on the server (diet,
-- allergens, dislikes) from the seed recipes, so clients read plans but never
-- write them: a client-written plan could skip those checks.
create table if not exists public.meal_plans (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  -- Monday of the planned week.
  week_start  date not null check (extract(isodow from week_start) = 1),
  -- {weekStart, days: [{date, meals: {breakfast, lunch, dinner}}]}, recipe ids
  plan        jsonb not null,
  -- What the person asked for this week ({maxMinutes, avoid, prefer}).
  prefs       jsonb not null default '{}',
  status      text not null default 'active' check (status in ('active', 'archived')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- One active plan per person and week; regenerating archives the old one.
create unique index if not exists meal_plans_one_active
  on public.meal_plans (user_id, week_start) where status = 'active';

-- Each swap or regeneration, for re-planning and debugging.
create table if not exists public.plan_adjustments (
  id          uuid primary key default gen_random_uuid(),
  plan_id     uuid not null references public.meal_plans(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  reason      text not null check (reason in ('swap', 'regenerate')),
  -- {date, slot, from, to}
  diff        jsonb not null,
  created_at  timestamptz not null default now()
);

alter table public.meal_plans enable row level security;
alter table public.plan_adjustments enable row level security;

create policy "meal_plans: read own" on public.meal_plans
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "plan_adjustments: read own" on public.plan_adjustments
  for select to authenticated using ((select auth.uid()) = user_id);

revoke insert, update, delete on public.meal_plans from anon, authenticated;
revoke insert, update, delete on public.plan_adjustments from anon, authenticated;
