-- Plans: every account gets a 14-day Pro trial, then Free unless a Stripe
-- subscription is active. Only the server (service role: sign-up trigger and
-- Stripe webhook) writes here; users can read their own row.
create table public.subscriptions (
  user_id                uuid primary key references auth.users(id) on delete cascade,
  trial_ends_at          timestamptz not null default (now() + interval '14 days'),
  stripe_customer_id     text unique,
  stripe_subscription_id text unique,
  -- Stripe's subscription status, kept verbatim (active, past_due, canceled, …).
  status                 text,
  price_interval         text check (price_interval in ('month', 'year')),
  current_period_end     timestamptz,
  cancel_at_period_end   boolean not null default false,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

alter table public.subscriptions enable row level security;

create policy "subscriptions: read own" on public.subscriptions
  for select to authenticated using (auth.uid() = user_id);

revoke insert, update, delete on public.subscriptions from anon, authenticated;

-- Start the trial when an account is created.
create or replace function public.start_pro_trial()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.subscriptions (user_id) values (new.id) on conflict (user_id) do nothing;
  return new;
end;
$$;

revoke execute on function public.start_pro_trial() from public, anon, authenticated;

create trigger on_auth_user_created_start_trial
  after insert on auth.users
  for each row execute function public.start_pro_trial();

-- Existing accounts get the same 14 days, counted from launch.
insert into public.subscriptions (user_id)
select id from auth.users
on conflict (user_id) do nothing;
