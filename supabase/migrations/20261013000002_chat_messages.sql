create table if not exists public.chat_messages (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  role         text not null check (role in ('user', 'assistant')),
  content      text not null,
  is_proactive boolean not null default false,
  read_at      timestamptz,
  -- Dedup key for proactive nudges, e.g. 'habit-streak:<id>:7'
  nudge_key    text,
  -- Set on templated safety replies so the UI re-renders the safety card
  -- (tappable helplines) after a reload.
  safety       text check (safety in ('crisis', 'ed_risk')),
  created_at   timestamptz not null default now()
);

create index if not exists chat_messages_user_created
  on public.chat_messages (user_id, created_at desc);
create index if not exists chat_messages_unread_proactive
  on public.chat_messages (user_id, is_proactive, read_at)
  where is_proactive = true;
create unique index if not exists chat_messages_nudge_key_unique
  on public.chat_messages (user_id, nudge_key)
  where nudge_key is not null;

alter table public.chat_messages enable row level security;

create policy "chat_messages: read own" on public.chat_messages
  for select to authenticated using ((select auth.uid()) = user_id);
-- Clients may only write their own non-proactive messages; nudges come from
-- the server with the service role.
create policy "chat_messages: insert own" on public.chat_messages
  for insert to authenticated
  with check ((select auth.uid()) = user_id and is_proactive = false and nudge_key is null);
create policy "chat_messages: mark read" on public.chat_messages
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "chat_messages: delete own" on public.chat_messages
  for delete to authenticated using ((select auth.uid()) = user_id);

revoke update on public.chat_messages from anon, authenticated;
grant update (read_at) on public.chat_messages to authenticated;
