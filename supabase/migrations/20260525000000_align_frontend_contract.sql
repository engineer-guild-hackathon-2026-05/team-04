-- =============================================
-- Frontend / API contract alignment
-- =============================================

-- フロントエンドは ing-* の安定コードを表示・保存用キーとして扱う。
-- DBのUUID主キーは内部参照に残し、API層で ingredient_code <-> UUID を変換する。
-- AI/APIが後から追加する非選択材料は ingredient_code を持たない可能性があるため nullable にする。
alter table public.ingredients
  add column if not exists ingredient_code text;

update public.ingredients set ingredient_code = 'ing-shrimp'    where name_en = 'shrimp';
update public.ingredients set ingredient_code = 'ing-crab'      where name_en = 'crab';
update public.ingredients set ingredient_code = 'ing-wheat'     where name_en = 'wheat';
update public.ingredients set ingredient_code = 'ing-buckwheat' where name_en = 'buckwheat';
update public.ingredients set ingredient_code = 'ing-egg'       where name_en = 'egg';
update public.ingredients set ingredient_code = 'ing-milk'      where name_en = 'milk';
update public.ingredients set ingredient_code = 'ing-peanut'    where name_en = 'peanut';
update public.ingredients set ingredient_code = 'ing-walnut'    where name_en = 'walnut';
update public.ingredients set ingredient_code = 'ing-almond'    where name_en = 'almond';
update public.ingredients set ingredient_code = 'ing-cashew'    where name_en = 'cashew nut';
update public.ingredients set ingredient_code = 'ing-sesame'    where name_en = 'sesame';
update public.ingredients set ingredient_code = 'ing-soybean'   where name_en = 'soybean';
update public.ingredients set ingredient_code = 'ing-abalone'   where name_en = 'abalone';
update public.ingredients set ingredient_code = 'ing-squid'     where name_en = 'squid';
update public.ingredients set ingredient_code = 'ing-roe'       where name_en = 'salmon roe';
update public.ingredients set ingredient_code = 'ing-salmon'    where name_en = 'salmon';
update public.ingredients set ingredient_code = 'ing-mackerel'  where name_en = 'mackerel';
update public.ingredients set ingredient_code = 'ing-beef'      where name_en = 'beef';
update public.ingredients set ingredient_code = 'ing-chicken'   where name_en = 'chicken';
update public.ingredients set ingredient_code = 'ing-pork'      where name_en = 'pork';
update public.ingredients set ingredient_code = 'ing-orange'    where name_en = 'orange';
update public.ingredients set ingredient_code = 'ing-kiwi'      where name_en = 'kiwi fruit';
update public.ingredients set ingredient_code = 'ing-banana'    where name_en = 'banana';
update public.ingredients set ingredient_code = 'ing-peach'     where name_en = 'peach';
update public.ingredients set ingredient_code = 'ing-apple'     where name_en = 'apple';
update public.ingredients set ingredient_code = 'ing-pistachio' where name_en = 'pistachio';
update public.ingredients set ingredient_code = 'ing-macadamia' where name_en = 'macadamia nut';
update public.ingredients set ingredient_code = 'ing-yam'       where name_en = 'yam';
update public.ingredients set ingredient_code = 'ing-gelatin'   where name_en = 'gelatin';

create unique index if not exists ingredients_ingredient_code_key
  on public.ingredients (ingredient_code)
  where ingredient_code is not null;

-- 料理の好みは、NG材料と分けてユーザー別に保存する。
create table if not exists public.user_preferences (
  user_id            uuid primary key references public.profiles(id) on delete cascade,
  preferred_dishes   text[] not null default '{}',
  preferred_cuisines text[] not null default '{}',
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

alter table public.user_preferences enable row level security;

drop policy if exists "自分の好みを参照できる" on public.user_preferences;
drop policy if exists "自分の好みを作成できる" on public.user_preferences;
drop policy if exists "自分の好みを更新できる" on public.user_preferences;

create policy "自分の好みを参照できる"
  on public.user_preferences for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "自分の好みを作成できる"
  on public.user_preferences for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "自分の好みを更新できる"
  on public.user_preferences for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- レシピ一覧UIが必要とする表示メタ情報。既存の source_type/recipe_ingredients は維持する。
alter table public.recipes
  add column if not exists cuisine text,
  add column if not exists flag text not null default '🌍',
  add column if not exists tags text[] not null default '{}',
  add column if not exists is_vegan boolean not null default false,
  add column if not exists is_gluten_free boolean not null default false;

create index if not exists recipes_tags_gin_idx on public.recipes using gin (tags);
