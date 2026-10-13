-- Router counters and call logs are server-only (service role bypasses RLS).
-- Enabling RLS with no policies keeps them unreadable via the anon key.
alter table public.daily_llm_usage enable row level security;
alter table public.eval_logs enable row level security;

revoke execute on function public.increment_llm_usage(date, text) from public, anon, authenticated;
