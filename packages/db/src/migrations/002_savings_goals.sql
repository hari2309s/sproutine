-- Savings goals
create table if not exists savings_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  target_amount numeric not null,
  saved_amount numeric default 0,
  deadline date,
  emoji text default '🎯',
  created_at timestamptz default now()
);

alter table savings_goals enable row level security;

create policy "users see own goals" on savings_goals
  for all using (auth.uid() = user_id);
