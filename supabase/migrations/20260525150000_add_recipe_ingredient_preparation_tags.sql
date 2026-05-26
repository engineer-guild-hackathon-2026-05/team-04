-- =============================================
-- Add recipe-side preparation-state tags for conditional restrictions
-- =============================================
-- 食材マスタのアレルゲン判定は食材そのものの属性として残し、
-- 「生・半生の魚介を避ける」など調理状態に依存する制限は
-- レシピ材料側の preparation_tags で判定する。

alter table public.recipe_ingredients
  add column if not exists preparation_tags text[] not null default '{}'::text[];

comment on column public.recipe_ingredients.preparation_tags is
  '生・半生など、レシピ内での調理状態に依存する制限判定用タグ。例: raw, fish, shellfish, seafood';

create index if not exists recipe_ingredients_preparation_tags_idx
  on public.recipe_ingredients using gin (preparation_tags);

-- 刺身用の魚を使う料理は、加熱済み魚介とは別に「生・半生」制限で除外できるようにする。
update public.recipe_ingredients ri
set preparation_tags = (
  select array_agg(distinct tag order by tag)
  from unnest(ri.preparation_tags || array['raw', 'fish', 'seafood']::text[]) as tag
)
from public.recipes r, public.ingredients i
where ri.recipe_id = r.id
  and i.id = ri.ingredient_id
  and (
    (r.title = 'ペルー風セビーチェ' and coalesce(ri.display_name_ja, i.name_ja) like '%刺身用%')
    or (r.title = '寿司' and coalesce(ri.display_name_ja, i.name_ja) like '%刺身用%')
  );

-- 将来の生えび・生かに等の登録にも対応できるよう、既存データに該当があれば甲殻類側もタグ付けする。
update public.recipe_ingredients ri
set preparation_tags = (
  select array_agg(distinct tag order by tag)
  from unnest(ri.preparation_tags || array['raw', 'shellfish', 'seafood']::text[]) as tag
)
from public.recipes r, public.ingredients i
where ri.recipe_id = r.id
  and i.id = ri.ingredient_id
  and (
    coalesce(ri.display_name_ja, i.name_ja) like '%生えび%'
    or coalesce(ri.display_name_ja, i.name_ja) like '%生エビ%'
    or coalesce(ri.display_name_ja, i.name_ja) like '%生かに%'
    or coalesce(ri.display_name_ja, i.name_ja) like '%生ガニ%'
    or coalesce(ri.display_name_ja, i.name_ja) like '%生牡蠣%'
  );
