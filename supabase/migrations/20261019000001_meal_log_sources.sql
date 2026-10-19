-- The app already logs copied meals with source 'copy', which the original
-- check rejected, and food search now logs with source 'search'.
alter table public.meal_logs drop constraint if exists meal_logs_source_check;
alter table public.meal_logs
  add constraint meal_logs_source_check
  check (source in ('text', 'voice', 'photo', 'barcode', 'copy', 'search'));
