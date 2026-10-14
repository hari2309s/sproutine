-- Per-user daily request counters. The LLM budget in daily_llm_usage is shared
-- by every user, so without this one account could exhaust it for everyone.
create table if not exists public.user_usage (
  user_id  uuid not null references auth.users(id) on delete cascade,
  day      date not null default current_date,
  kind     text not null check (kind in ('chat', 'voice')),
  count    int  not null default 0,
  primary key (user_id, day, kind)
);

-- Server-only (service role bypasses RLS); no policies for clients.
alter table public.user_usage enable row level security;

-- Atomically increments today's counter and reports whether the request is
-- within p_limit. Called by API routes before any LLM work.
create or replace function public.consume_user_quota(p_user uuid, p_kind text, p_limit int)
returns boolean
language plpgsql
set search_path = ''
as $$
declare
  v_count int;
begin
  insert into public.user_usage as u (user_id, day, kind, count)
  values (p_user, current_date, p_kind, 1)
  on conflict (user_id, day, kind) do update set count = u.count + 1
  returning u.count into v_count;
  return v_count <= p_limit;
end;
$$;

revoke execute on function public.consume_user_quota(uuid, text, int) from public, anon, authenticated;
