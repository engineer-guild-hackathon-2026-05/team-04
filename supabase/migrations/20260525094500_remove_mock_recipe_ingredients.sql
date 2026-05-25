-- Remove legacy mock recipe ingredient artifacts from the public ingredient catalog.
-- The curated recipe seed is DB-primary; old mock recipe rows are deleted by the
-- replacement migration, but custom mock-only ingredients can remain orphaned on
-- already-migrated remote databases.
delete from public.ingredients i
where (
    i.name_en like 'mock:%:ingredient:%'
    or i.category = 'mock料理'
  )
  and not exists (
    select 1 from public.recipe_ingredients ri where ri.ingredient_id = i.id
  );
