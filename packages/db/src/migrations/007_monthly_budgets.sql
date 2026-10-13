-- Monthly category budgets (one row per user+category; upsert replaces amount)
create table if not exists monthly_budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  category text not null,
  amount numeric not null check (amount > 0),
  created_at timestamptz default now(),
  unique (user_id, category)
);

alter table monthly_budgets enable row level security;

create policy "users see own budgets" on monthly_budgets
  for all using (auth.uid() = user_id);
