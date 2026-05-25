-- =============================================
-- Preserve recipe-specific ingredient display names
-- =============================================

alter table public.recipe_ingredients
  add column if not exists display_name_ja text;

update public.recipe_ingredients ri
set display_name_ja = ing.name_ja
from public.ingredients ing
where ri.ingredient_id = ing.id
  and ri.display_name_ja is null;
