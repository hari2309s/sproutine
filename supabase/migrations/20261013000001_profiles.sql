-- Personal context injected into every agent call.
create table if not exists public.profiles (
  user_id            uuid primary key references auth.users(id) on delete cascade,
  display_name       text not null check (char_length(display_name) between 1 and 60),
  diet               text not null default 'omnivore'
                       check (diet in ('omnivore', 'vegetarian', 'vegan', 'pescatarian')),
  -- EU-14 allergen codes (see packages/types EU_ALLERGENS)
  allergies          text[] not null default '{}',
  dislikes           text[] not null default '{}',
  budget_weekly_cents int check (budget_weekly_cents is null or budget_weekly_cents >= 0),
  goals              text[] not null default '{}',
  quit_date          date,
  locale             text not null default 'en',
  voice_id           text not null default 'rosie',
  -- Set by the safety gate on eating-disorder signals; hides numbers and targets.
  safety_mode        boolean not null default false,
  -- GDPR Art. 9(2)(a) explicit consent for processing health-related data.
  -- Required: a profile only exists once consent is given. Withdrawing
  -- consent is account deletion, so clients can't clear it (see grants).
  consent_health_at  timestamptz not null,
  -- Sent to LLM providers instead of user id / name / email.
  llm_pseudonym      uuid not null default gen_random_uuid() unique,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

alter table public.profiles enable row level security;

create policy "profiles: read own" on public.profiles
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "profiles: insert own" on public.profiles
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "profiles: update own" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Column-level grants: users may edit their preferences, but never the
-- pseudonym, timestamps or the consent record.
revoke insert, update on public.profiles from anon, authenticated;
grant insert (user_id, display_name, diet, allergies, dislikes, budget_weekly_cents, goals,
              quit_date, locale, voice_id, consent_health_at)
  on public.profiles to authenticated;
grant update (display_name, diet, allergies, dislikes, budget_weekly_cents, goals,
              quit_date, locale, voice_id, safety_mode)
  on public.profiles to authenticated;
