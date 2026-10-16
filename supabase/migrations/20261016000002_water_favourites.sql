-- Water tracking & meal favourites
-- 2026-10-16

-- ── Water logs ──────────────────────────────────────────────────────────────────
create table public.water_logs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  ml         int  not null check (ml > 0),
  logged_at  timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index water_logs_user_day on public.water_logs (user_id, logged_at);

alter table public.water_logs enable row level security;

create policy "Users read own water logs"
  on public.water_logs for select
  using (auth.uid() = user_id);

create policy "Users insert own water logs"
  on public.water_logs for insert
  with check (auth.uid() = user_id);

create policy "Users delete own water logs"
  on public.water_logs for delete
  using (auth.uid() = user_id);

-- ── Profile water settings ──────────────────────────────────────────────────────
alter table public.profiles
  add column water_goal_ml  int not null default 2000,
  add column water_glass_ml int not null default 250;

-- ── Meal favourites ─────────────────────────────────────────────────────────────
alter table public.meal_logs
  add column is_favourite boolean not null default false;
