-- =============================================
-- 原材料マスタに is_allergen・dietary_tags を追加
-- =============================================

alter table public.ingredients
  add column is_allergen  boolean  not null default false,
  add column dietary_tags text[]   not null default '{}';

-- 既存28品目に is_allergen と dietary_tags を設定
update public.ingredients set is_allergen = true, dietary_tags = '{"shellfish","animal-product"}'  where name_en = 'shrimp';
update public.ingredients set is_allergen = true, dietary_tags = '{"shellfish","animal-product"}'  where name_en = 'crab';
update public.ingredients set is_allergen = true, dietary_tags = '{"gluten"}'                      where name_en = 'wheat';
update public.ingredients set is_allergen = true, dietary_tags = '{}'                              where name_en = 'buckwheat';
update public.ingredients set is_allergen = true, dietary_tags = '{"egg","animal-product"}'        where name_en = 'egg';
update public.ingredients set is_allergen = true, dietary_tags = '{"dairy","animal-product"}'      where name_en = 'milk';
update public.ingredients set is_allergen = true, dietary_tags = '{}'                              where name_en = 'peanut';
update public.ingredients set is_allergen = true, dietary_tags = '{}'                              where name_en = 'walnut';
update public.ingredients set is_allergen = true, dietary_tags = '{}'                              where name_en = 'almond';
update public.ingredients set is_allergen = true, dietary_tags = '{}'                              where name_en = 'cashew nut';
update public.ingredients set is_allergen = true, dietary_tags = '{}'                              where name_en = 'sesame';
update public.ingredients set is_allergen = true, dietary_tags = '{}'                              where name_en = 'soybean';
update public.ingredients set is_allergen = true, dietary_tags = '{"shellfish","animal-product"}'  where name_en = 'abalone';
update public.ingredients set is_allergen = true, dietary_tags = '{"shellfish","animal-product"}'  where name_en = 'squid';
update public.ingredients set is_allergen = true, dietary_tags = '{"fish","animal-product"}'       where name_en = 'salmon roe';
update public.ingredients set is_allergen = true, dietary_tags = '{"fish","animal-product"}'       where name_en = 'salmon';
update public.ingredients set is_allergen = true, dietary_tags = '{"fish","animal-product"}'       where name_en = 'mackerel';
update public.ingredients set is_allergen = true, dietary_tags = '{"meat","animal-product"}'       where name_en = 'beef';
update public.ingredients set is_allergen = true, dietary_tags = '{"meat","animal-product"}'       where name_en = 'chicken';
update public.ingredients set is_allergen = true, dietary_tags = '{"meat","animal-product","pork"}' where name_en = 'pork';
update public.ingredients set is_allergen = true, dietary_tags = '{}'                              where name_en = 'orange';
update public.ingredients set is_allergen = true, dietary_tags = '{}'                              where name_en = 'kiwi fruit';
update public.ingredients set is_allergen = true, dietary_tags = '{}'                              where name_en = 'banana';
update public.ingredients set is_allergen = true, dietary_tags = '{}'                              where name_en = 'peach';
update public.ingredients set is_allergen = true, dietary_tags = '{}'                              where name_en = 'apple';
update public.ingredients set is_allergen = true, dietary_tags = '{}'                              where name_en = 'matsutake';
update public.ingredients set is_allergen = true, dietary_tags = '{}'                              where name_en = 'yam';
update public.ingredients set is_allergen = true, dietary_tags = '{"animal-product"}'              where name_en = 'gelatin';

-- =============================================
-- 食事制限プリセットテーブル
-- アレルギーではなく思想・生活習慣・健康方針による除外
-- =============================================

create table public.user_dietary_restrictions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  restriction text not null,
  -- 'vegan'        : 動物性食品すべて除外（dietary_tags に animal-product を含む材料）
  -- 'vegetarian'   : 肉・魚を除外（meat / fish / shellfish）
  -- 'pescatarian'  : 肉のみ除外（meat）、魚介は可
  -- 'gluten-free'  : グルテン除外（gluten）
  -- 'halal'        : 豚肉・アルコール除外（pork / alcohol）
  -- 'kosher'       : 豚肉・甲殻類除外（pork / shellfish）
  created_at  timestamptz not null default now(),
  constraint user_dietary_restrictions_unique unique (user_id, restriction)
);

-- =============================================
-- RLS
-- =============================================

alter table public.user_dietary_restrictions enable row level security;

create policy "自分の食事制限を参照できる"
  on public.user_dietary_restrictions for select
  using (auth.uid() = user_id);

create policy "自分の食事制限を登録できる"
  on public.user_dietary_restrictions for insert
  with check (auth.uid() = user_id);

create policy "自分の食事制限を削除できる"
  on public.user_dietary_restrictions for delete
  using (auth.uid() = user_id);

-- =============================================
-- インデックス
-- =============================================

create index on public.user_dietary_restrictions (user_id);
create index on public.ingredients using gin (dietary_tags);
