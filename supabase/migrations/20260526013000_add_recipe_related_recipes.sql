-- =============================================
-- Curated related recipe cards for culture tabs
-- =============================================

create table if not exists public.recipe_related_recipes (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null,
  related_recipe_id uuid not null,
  section_key text not null check (section_key in ('origin', 'food_culture')),
  reason_label text,
  sort_order int not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint recipe_related_recipes_recipe_id_fkey
    foreign key (recipe_id) references public.recipes(id) on delete cascade,
  constraint recipe_related_recipes_related_recipe_id_fkey
    foreign key (related_recipe_id) references public.recipes(id) on delete cascade,
  constraint recipe_related_recipes_no_self_reference check (recipe_id <> related_recipe_id),
  unique (recipe_id, section_key, related_recipe_id),
  unique (recipe_id, section_key, sort_order)
);

create index if not exists recipe_related_recipes_recipe_section_sort_idx
  on public.recipe_related_recipes (recipe_id, section_key, sort_order);

alter table public.recipe_related_recipes enable row level security;

drop policy if exists "参照できる関連レシピだけ参照できる" on public.recipe_related_recipes;

create policy "参照できる関連レシピだけ参照できる"
  on public.recipe_related_recipes for select
  to public
  using (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_id
        and (r.is_public = true or (select auth.uid()) = r.created_by)
    )
    and exists (
      select 1 from public.recipes related
      where related.id = related_recipe_id
        and (related.is_public = true or (select auth.uid()) = related.created_by)
    )
  );

with relation_seed(source_ref, section_key, related_source_ref, reason_label, sort_order) as (
  values
    -- 由来タブ: 起源・調理形式・食文化の成り立ちが近い料理
    ('curated:paella-valenciana', 'origin', 'curated:biryani', '米料理の祝祭性', 1),
    ('curated:biryani', 'origin', 'curated:paella-valenciana', '米と香りの大皿料理', 1),
    ('curated:bouillabaisse', 'origin', 'curated:amok-trey', '魚介と地域の水辺文化', 1),
    ('curated:amok-trey', 'origin', 'curated:bouillabaisse', '魚を主役にした郷土料理', 1),
    ('curated:hummus', 'origin', 'curated:biryani', '交易と家庭食の広がり', 1),
    ('curated:pizza-margherita', 'origin', 'curated:tacos', '庶民食から世界へ広がった一皿', 1),
    ('curated:tacos', 'origin', 'curated:pizza-margherita', '都市の手軽な粉もの文化', 1),
    ('curated:ceviche', 'origin', 'curated:bouillabaisse', '海辺の魚介文化', 1),

    -- 食文化タブ: 同じ国・地域の別料理
    ('curated:sushi', 'food_culture', 'curated:ramen', '同じ日本の外食文化', 1),
    ('curated:ramen', 'food_culture', 'curated:sushi', '同じ日本の定番料理', 1),
    ('curated:pad-thai', 'food_culture', 'curated:green-curry', '同じタイの香味文化', 1),
    ('curated:pad-thai', 'food_culture', 'curated:som-tam', '屋台で親しまれるタイ料理', 2),
    ('curated:green-curry', 'food_culture', 'curated:tom-yum-goong', 'ハーブと辛味のタイ料理', 1),
    ('curated:green-curry', 'food_culture', 'curated:mango-sticky-rice', '食事と甘味のタイ文化', 2),
    ('curated:som-tam', 'food_culture', 'curated:pad-thai', '同じタイの屋台料理', 1),
    ('curated:tom-yum-goong', 'food_culture', 'curated:green-curry', 'タイの香り高い汁物文化', 1),
    ('curated:mango-sticky-rice', 'food_culture', 'curated:pad-thai', 'タイの主食と甘味', 1),
    ('curated:pho', 'food_culture', 'curated:banh-xeo', '同じベトナムの米文化', 1),
    ('curated:pho', 'food_culture', 'curated:com-tam', '日常に根づくベトナム料理', 2),
    ('curated:banh-xeo', 'food_culture', 'curated:pho', '米粉と香草のベトナム料理', 1),
    ('curated:com-tam', 'food_culture', 'curated:banh-xeo', '同じベトナムの食卓', 1),
    ('curated:rendang', 'food_culture', 'curated:gado-gado', '同じインドネシアの多島海文化', 1),
    ('curated:gado-gado', 'food_culture', 'curated:rendang', '同じインドネシアの定番料理', 1)
), resolved_seed as (
  select
    parent.id as recipe_id,
    s.section_key,
    related.id as related_recipe_id,
    s.reason_label,
    s.sort_order
  from relation_seed s
  join public.recipes parent
    on parent.source_type = 'api'
   and parent.source_ref = s.source_ref
  join public.recipes related
    on related.source_type = 'api'
   and related.source_ref = s.related_source_ref
)
insert into public.recipe_related_recipes (
  recipe_id,
  section_key,
  related_recipe_id,
  reason_label,
  sort_order
)
select
  recipe_id,
  section_key,
  related_recipe_id,
  reason_label,
  sort_order
from resolved_seed
on conflict (recipe_id, section_key, related_recipe_id) do update set
  reason_label = excluded.reason_label,
  sort_order = excluded.sort_order,
  updated_at = now();
