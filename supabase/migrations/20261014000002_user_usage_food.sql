-- Food lookups (search + barcode) get their own per-user daily counter: cache
-- misses reach Open Food Facts, whose per-IP limits all users share.
alter table public.user_usage drop constraint if exists user_usage_kind_check;
alter table public.user_usage
  add constraint user_usage_kind_check check (kind in ('chat', 'voice', 'food'));
