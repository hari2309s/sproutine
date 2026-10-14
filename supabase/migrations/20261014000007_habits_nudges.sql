-- Habits, check-ins, Web Push subscriptions, and each person's time zone
-- (nudges fire at local times: no log by 14:00, Sunday 18:00 review).

alter table public.profiles
  add column if not exists timezone text not null default 'Europe/Berlin'
  check (char_length(timezone) between 1 and 64);
grant insert (timezone) on public.profiles to authenticated;
grant update (timezone) on public.profiles to authenticated;

-- Clients set the zone directly. A name the server doesn't know (garbage,
-- or one newer than the server's zone data) becomes Berlin rather than
-- failing, so onboarding never breaks on it.
create or replace function public.check_profile_timezone() returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = new.timezone) then
    new.timezone := 'Europe/Berlin';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_timezone_valid on public.profiles;
create trigger profiles_timezone_valid
  before insert or update of timezone on public.profiles
  for each row execute function public.check_profile_timezone();

create table if not exists public.goals_habits (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text not null check (char_length(title) between 1 and 60),
  period      text not null check (period in ('daily', 'weekly')),
  created_at  timestamptz not null default now(),
  archived_at timestamptz
);
create index if not exists goals_habits_user on public.goals_habits (user_id) where archived_at is null;

create table if not exists public.habit_checkins (
  id         uuid primary key default gen_random_uuid(),
  habit_id   uuid not null references public.goals_habits(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  -- The person's local date of the check-in.
  date       date not null,
  created_at timestamptz not null default now(),
  unique (habit_id, date)
);
create index if not exists habit_checkins_user_date on public.habit_checkins (user_id, date desc);

-- One row per browser/device that allowed notifications.
create table if not exists public.push_subscriptions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  endpoint        text not null unique check (endpoint like 'https://%'),
  p256dh          text not null,
  auth            text not null,
  created_at      timestamptz not null default now(),
  -- At most one push a day per person; the sender checks this.
  last_pushed_on  date
);
create index if not exists push_subscriptions_user on public.push_subscriptions (user_id);

alter table public.goals_habits enable row level security;
alter table public.habit_checkins enable row level security;
alter table public.push_subscriptions enable row level security;

create policy "goals_habits: read own" on public.goals_habits
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "habit_checkins: read own" on public.habit_checkins
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "push_subscriptions: read own" on public.push_subscriptions
  for select to authenticated using ((select auth.uid()) = user_id);

-- Writes go through the server, which computes streaks and sends streak
-- nudges on check-in, and validates push endpoints.
revoke insert, update, delete on public.goals_habits from anon, authenticated;
revoke insert, update, delete on public.habit_checkins from anon, authenticated;
revoke insert, update, delete on public.push_subscriptions from anon, authenticated;
