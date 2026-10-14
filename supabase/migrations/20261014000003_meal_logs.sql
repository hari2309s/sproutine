-- One confirmed meal. Items carry a snapshot of each food's nutrients at log
-- time, so later corrections to the foods cache never rewrite history.
-- Totals are computed in code from the items, never by a model.
create table if not exists public.meal_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  eaten_at    timestamptz not null default now(),
  meal_slot   text not null check (meal_slot in ('breakfast', 'lunch', 'dinner', 'snack')),
  -- [{source, sourceId, name, brand, grams, nutrients}]
  items       jsonb not null check (jsonb_typeof(items) = 'array' and jsonb_array_length(items) between 1 and 8),
  totals      jsonb not null,
  -- Nutrients some items didn't know, so the total is a lower bound.
  partial     text[] not null default '{}',
  source      text not null check (source in ('text', 'voice', 'photo', 'barcode')),
  is_estimate boolean not null default true,
  -- Langfuse trace of the chat turn that proposed it, for debugging.
  trace_id    text,
  created_at  timestamptz not null default now()
);

create index if not exists meal_logs_user_eaten on public.meal_logs (user_id, eaten_at desc);

alter table public.meal_logs enable row level security;

create policy "meal_logs: read own" on public.meal_logs
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "meal_logs: delete own" on public.meal_logs
  for delete to authenticated using ((select auth.uid()) = user_id);
-- Logs are written by the server, which recomputes nutrients from the foods
-- table; a client could otherwise store any numbers it liked.
revoke insert, update on public.meal_logs from anon, authenticated;
