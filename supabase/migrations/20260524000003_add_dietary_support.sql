-- =============================================
-- 原材料マスタに is_allergen・dietary_tags を追加
-- dietary_tags はDBフィルタではなくUI側のプリセット機能で使用する
-- （プリセット選択時にどの材料をデフォルトチェックするかを定義）
-- =============================================

alter table public.ingredients
  add column is_allergen  boolean  not null default false,
  add column dietary_tags text[]   not null default '{}';

-- 既存28品目に is_allergen と dietary_tags を設定
update public.ingredients set is_allergen = true, dietary_tags = '{"shellfish","animal-product"}'   where name_en = 'shrimp';
update public.ingredients set is_allergen = true, dietary_tags = '{"shellfish","animal-product"}'   where name_en = 'crab';
update public.ingredients set is_allergen = true, dietary_tags = '{"gluten"}'                       where name_en = 'wheat';
update public.ingredients set is_allergen = true, dietary_tags = '{}'                               where name_en = 'buckwheat';
update public.ingredients set is_allergen = true, dietary_tags = '{"egg","animal-product"}'         where name_en = 'egg';
update public.ingredients set is_allergen = true, dietary_tags = '{"dairy","animal-product"}'       where name_en = 'milk';
update public.ingredients set is_allergen = true, dietary_tags = '{}'                               where name_en = 'peanut';
update public.ingredients set is_allergen = true, dietary_tags = '{}'                               where name_en = 'walnut';
update public.ingredients set is_allergen = true, dietary_tags = '{}'                               where name_en = 'almond';
update public.ingredients set is_allergen = true, dietary_tags = '{}'                               where name_en = 'cashew nut';
update public.ingredients set is_allergen = true, dietary_tags = '{}'                               where name_en = 'sesame';
update public.ingredients set is_allergen = true, dietary_tags = '{}'                               where name_en = 'soybean';
update public.ingredients set is_allergen = true, dietary_tags = '{"shellfish","animal-product"}'   where name_en = 'abalone';
update public.ingredients set is_allergen = true, dietary_tags = '{"shellfish","animal-product"}'   where name_en = 'squid';
update public.ingredients set is_allergen = true, dietary_tags = '{"fish","animal-product"}'        where name_en = 'salmon roe';
update public.ingredients set is_allergen = true, dietary_tags = '{"fish","animal-product"}'        where name_en = 'salmon';
update public.ingredients set is_allergen = true, dietary_tags = '{"fish","animal-product"}'        where name_en = 'mackerel';
update public.ingredients set is_allergen = true, dietary_tags = '{"meat","animal-product"}'        where name_en = 'beef';
update public.ingredients set is_allergen = true, dietary_tags = '{"meat","animal-product"}'        where name_en = 'chicken';
update public.ingredients set is_allergen = true, dietary_tags = '{"meat","animal-product","pork"}' where name_en = 'pork';
update public.ingredients set is_allergen = true, dietary_tags = '{}'                               where name_en = 'orange';
update public.ingredients set is_allergen = true, dietary_tags = '{}'                               where name_en = 'kiwi fruit';
update public.ingredients set is_allergen = true, dietary_tags = '{}'                               where name_en = 'banana';
update public.ingredients set is_allergen = true, dietary_tags = '{}'                               where name_en = 'peach';
update public.ingredients set is_allergen = true, dietary_tags = '{}'                               where name_en = 'apple';
update public.ingredients set is_allergen = true, dietary_tags = '{}'                               where name_en = 'matsutake';
update public.ingredients set is_allergen = true, dietary_tags = '{}'                               where name_en = 'yam';
update public.ingredients set is_allergen = true, dietary_tags = '{"animal-product"}'               where name_en = 'gelatin';

-- =============================================
-- インデックス
-- =============================================

create index on public.ingredients using gin (dietary_tags);
