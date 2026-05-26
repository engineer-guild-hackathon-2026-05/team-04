-- =============================================
-- AI recipe MVP read-only metadata fields
-- =============================================

alter table public.recipes
  add column if not exists parent_recipe_id uuid references public.recipes(id) on delete set null,
  add column if not exists cultural_background text;

alter table public.recipe_ingredients
  add column if not exists substituted_from_ingredient_id uuid references public.ingredients(id) on delete set null;

create index if not exists recipes_parent_recipe_id_idx on public.recipes (parent_recipe_id);
create index if not exists recipes_source_type_created_at_idx on public.recipes (source_type, created_at desc);
create index if not exists recipe_ingredients_substituted_from_idx
  on public.recipe_ingredients (substituted_from_ingredient_id)
  where substituted_from_ingredient_id is not null;
