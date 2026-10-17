-- Tracking & Insights: weight logs, nutrient goals
-- 2026-10-17

-- ── Weight logs ────────────────────────────────────────────────────────────────
create table public.weight_logs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  weight_kg  numeric(5,1) not null check (weight_kg > 0),
  logged_at  date not null default current_date,
  created_at timestamptz not null default now(),
  unique (user_id, logged_at)
);

create index weight_logs_user_day on public.weight_logs (user_id, logged_at desc);

alter table public.weight_logs enable row level security;

create policy "Users read own weight logs"
  on public.weight_logs for select
  using (auth.uid() = user_id);

create policy "Users insert own weight logs"
  on public.weight_logs for insert
  with check (auth.uid() = user_id);

create policy "Users delete own weight logs"
  on public.weight_logs for delete
  using (auth.uid() = user_id);

create policy "Users update own weight logs"
  on public.weight_logs for update
  using (auth.uid() = user_id);

-- ── Nutrient goal profile fields ───────────────────────────────────────────────
alter table public.profiles
  add column kcal_goal     int,
  add column protein_goal_g int,
  add column carbs_goal_g  int,
  add column fat_goal_g    int;
