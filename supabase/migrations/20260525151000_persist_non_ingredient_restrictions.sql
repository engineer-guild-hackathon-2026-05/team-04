-- =============================================
-- Persist non-ingredient profile restrictions
-- =============================================
-- diet-* や prep-* は ingredients に紐づかないため、user_preferences 側で永続化する。
-- user_restricted_ingredients は実食材 ing-* のFK保存に限定する。

alter table public.user_preferences
  add column if not exists non_ingredient_restrictions text[] not null default '{}'::text[],
  add column if not exists non_ingredient_restriction_reasons jsonb not null default '{}'::jsonb;

comment on column public.user_preferences.non_ingredient_restrictions is
  'ingredients に紐づかないプロフィール制限ID。例: diet-vegan, prep-raw-ing-shrimp';
comment on column public.user_preferences.non_ingredient_restriction_reasons is
  'non_ingredient_restrictions の reason map。例: {"prep-raw-ing-shrimp":"dislike"}';
