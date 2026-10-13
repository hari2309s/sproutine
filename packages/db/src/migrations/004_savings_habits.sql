-- Savings habits
create table if not exists savings_habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  amount numeric not null,
  frequency text not null check (frequency in ('weekly', 'monthly')),
  emoji text default '💰',
  is_active boolean default true,
  created_at timestamptz default now()
);

alter table savings_habits enable row level security;

create policy "users see own habits" on savings_habits
  for all using (auth.uid() = user_id);

-- Habit contributions (one per period per habit)
create table if not exists habit_contributions (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid references savings_habits(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  period text not null, -- 'YYYY-MM' for monthly, 'YYYY-WNN' for weekly
  amount numeric not null,
  logged_at timestamptz default now(),
  unique (habit_id, period)
);

alter table habit_contributions enable row level security;

create policy "users see own contributions" on habit_contributions
  for all using (auth.uid() = user_id);
