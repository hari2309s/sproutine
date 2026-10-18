-- Calendar feed tokens: one per user, allows public webcal access via token.
create table public.calendar_feed_tokens (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade unique,
  token       text not null unique default encode(gen_random_bytes(32), 'hex'),
  created_at  timestamptz not null default now()
);

alter table public.calendar_feed_tokens enable row level security;
create policy "Users can read own feed token"
  on public.calendar_feed_tokens for select
  to authenticated
  using (auth.uid() = user_id);

-- "On this day" dismissals: tracks when a user dismissed or logged a nostalgia card.
create table public.on_this_day_dismissals (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  shown_at    date not null default current_date,
  meal_log_id uuid references public.meal_logs(id) on delete set null,
  action      text not null check (action in ('logged', 'dismissed')),
  created_at  timestamptz not null default now()
);

alter table public.on_this_day_dismissals enable row level security;
create policy "Users can read own dismissals"
  on public.on_this_day_dismissals for select
  to authenticated
  using (auth.uid() = user_id);

create index on_this_day_user_idx
  on public.on_this_day_dismissals (user_id, shown_at desc);
