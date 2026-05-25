-- =============================================
-- AI recipe MVP fields and atomic insert RPC
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

create or replace function public.insert_ai_recipe_mvp(
  p_user_id uuid,
  p_parent_recipe_id uuid,
  p_recipe jsonb,
  p_ingredients jsonb,
  p_substitutions jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_recipe_id uuid;
  v_ingredient jsonb;
  v_ingredient_id uuid;
  v_substituted_from uuid;
begin
  if p_user_id is null then
    raise exception 'p_user_id is required';
  end if;

  if not exists (select 1 from public.profiles where id = p_user_id) then
    insert into public.profiles (id, name) values (p_user_id, null)
    on conflict (id) do nothing;
  end if;

  insert into public.recipes (
    title,
    description,
    source_type,
    created_by,
    steps,
    servings,
    cook_time_min,
    image_url,
    is_public,
    cuisine,
    flag,
    tags,
    is_vegan,
    is_gluten_free,
    parent_recipe_id,
    cultural_background
  ) values (
    p_recipe ->> 'title',
    p_recipe ->> 'description',
    'ai',
    p_user_id,
    coalesce(p_recipe -> 'steps', '[]'::jsonb),
    nullif(p_recipe ->> 'servings', '')::int,
    nullif(p_recipe ->> 'cook_time_min', '')::int,
    nullif(p_recipe ->> 'image_url', ''),
    false,
    nullif(p_recipe ->> 'cuisine', ''),
    coalesce(nullif(p_recipe ->> 'flag', ''), '🌍'),
    coalesce(array(select jsonb_array_elements_text(p_recipe -> 'tags')), '{}'),
    coalesce((p_recipe ->> 'is_vegan')::boolean, false),
    coalesce((p_recipe ->> 'is_gluten_free')::boolean, false),
    p_parent_recipe_id,
    nullif(p_recipe ->> 'cultural_background', '')
  ) returning id into v_recipe_id;

  for v_ingredient in select * from jsonb_array_elements(p_ingredients)
  loop
    insert into public.ingredients (name_ja, name_en, category)
    values (
      v_ingredient ->> 'name_ja',
      v_ingredient ->> 'name_en',
      'その他'
    )
    on conflict (name_en) do update
      set name_ja = excluded.name_ja
    returning id into v_ingredient_id;

    select nullif(item ->> 'substitutedFromIngredientId', '')::uuid
      into v_substituted_from
    from jsonb_array_elements(p_substitutions) item
    where item ->> 'ingredientNameJa' = v_ingredient ->> 'name_ja'
    limit 1;

    insert into public.recipe_ingredients (
      recipe_id,
      ingredient_id,
      quantity,
      is_optional,
      substituted_from_ingredient_id
    ) values (
      v_recipe_id,
      v_ingredient_id,
      v_ingredient ->> 'quantity',
      coalesce((v_ingredient ->> 'is_optional')::boolean, false),
      v_substituted_from
    )
    on conflict (recipe_id, ingredient_id) do update
      set quantity = excluded.quantity,
          is_optional = excluded.is_optional,
          substituted_from_ingredient_id = excluded.substituted_from_ingredient_id;
  end loop;

  return v_recipe_id;
end;
$$;

create or replace function public.insert_ai_recipes_mvp(
  p_user_id uuid,
  p_recipes jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item jsonb;
  v_recipe_id uuid;
  v_results jsonb := '[]'::jsonb;
begin
  if p_user_id is null then
    raise exception 'p_user_id is required';
  end if;

  if jsonb_typeof(p_recipes) <> 'array' then
    raise exception 'p_recipes must be an array';
  end if;

  for v_item in select * from jsonb_array_elements(p_recipes)
  loop
    select public.insert_ai_recipe_mvp(
      p_user_id,
      nullif(v_item ->> 'parentRecipeId', '')::uuid,
      coalesce(v_item -> 'recipe', '{}'::jsonb),
      coalesce(v_item -> 'ingredients', '[]'::jsonb),
      coalesce(v_item -> 'substitutions', '[]'::jsonb)
    )
    into v_recipe_id;

    v_results := v_results || jsonb_build_array(jsonb_build_object('recipe_id', v_recipe_id));
  end loop;

  return v_results;
end;
$$;

revoke all on function public.insert_ai_recipe_mvp(uuid, uuid, jsonb, jsonb, jsonb) from public;
revoke all on function public.insert_ai_recipe_mvp(uuid, uuid, jsonb, jsonb, jsonb) from anon;
revoke all on function public.insert_ai_recipe_mvp(uuid, uuid, jsonb, jsonb, jsonb) from authenticated;
grant execute on function public.insert_ai_recipe_mvp(uuid, uuid, jsonb, jsonb, jsonb) to service_role;

revoke all on function public.insert_ai_recipes_mvp(uuid, jsonb) from public;
revoke all on function public.insert_ai_recipes_mvp(uuid, jsonb) from anon;
revoke all on function public.insert_ai_recipes_mvp(uuid, jsonb) from authenticated;
grant execute on function public.insert_ai_recipes_mvp(uuid, jsonb) to service_role;
