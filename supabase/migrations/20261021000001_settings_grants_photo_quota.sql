-- Settings saves water and nutrient goals straight from the browser, but these
-- columns were added after the original column grants, so every save was
-- rejected. Grant them, with range checks matching the Settings steppers.
grant update (water_goal_ml, water_glass_ml, kcal_goal, protein_goal_g, carbs_goal_g, fat_goal_g)
  on public.profiles to authenticated;

alter table public.profiles
  add constraint profiles_water_goal_range check (water_goal_ml between 500 and 5000) not valid,
  add constraint profiles_water_glass_range check (water_glass_ml between 100 and 1000) not valid,
  add constraint profiles_kcal_goal_range check (kcal_goal is null or kcal_goal between 500 and 10000) not valid,
  add constraint profiles_protein_goal_range check (protein_goal_g is null or protein_goal_g between 0 and 1000) not valid,
  add constraint profiles_carbs_goal_range check (carbs_goal_g is null or carbs_goal_g between 0 and 1000) not valid,
  add constraint profiles_fat_goal_range check (fat_goal_g is null or fat_goal_g between 0 and 1000) not valid;

-- Photo logging (vision models) gets its own daily cap.
alter table public.user_usage drop constraint if exists user_usage_kind_check;
alter table public.user_usage
  add constraint user_usage_kind_check check (kind in ('chat', 'voice', 'food', 'photo'));
