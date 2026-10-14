-- Replaces a week's active plan in one transaction: if the insert fails, the
-- old plan stays active instead of the week ending up with none. A lock per
-- person and week makes concurrent saves (a double tap on "plan my week")
-- run one after the other rather than collide on the one-active index.
-- Server only.
create or replace function public.save_active_plan(
  p_user uuid,
  p_week date,
  p_plan jsonb,
  p_prefs jsonb
) returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  new_id uuid;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user::text || ':' || p_week::text, 0));
  update public.meal_plans
     set status = 'archived', updated_at = now()
   where user_id = p_user and week_start = p_week and status = 'active';
  insert into public.meal_plans (user_id, week_start, plan, prefs)
       values (p_user, p_week, p_plan, coalesce(p_prefs, '{}'::jsonb))
    returning id into new_id;
  return new_id;
end;
$$;

revoke execute on function public.save_active_plan(uuid, date, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.save_active_plan(uuid, date, jsonb, jsonb) to service_role;
