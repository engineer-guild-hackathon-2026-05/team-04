-- =============================================
-- Recipe culture sections for modal bookmark tabs
-- =============================================

create unique index if not exists recipes_source_type_source_ref_key
  on public.recipes (source_type, source_ref)
  where source_ref is not null;

create table if not exists public.recipe_culture_sections (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  section_key text not null check (section_key in ('origin', 'food_culture')),
  label text not null,
  title text not null,
  body text not null,
  sort_order int not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (recipe_id, section_key)
);

create index if not exists recipe_culture_sections_recipe_sort_idx
  on public.recipe_culture_sections (recipe_id, sort_order);

alter table public.recipe_culture_sections enable row level security;

drop policy if exists "参照できるレシピの文化セクションは参照できる" on public.recipe_culture_sections;

create policy "参照できるレシピの文化セクションは参照できる"
  on public.recipe_culture_sections for select
  to public
  using (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_id
        and (r.is_public = true or (select auth.uid()) = r.created_by)
    )
  );

with mock_recipes (
  source_ref,
  title,
  description,
  cuisine,
  flag,
  image_url,
  cook_time_min,
  servings,
  is_vegan,
  is_gluten_free,
  tags,
  steps
) as (
  values
    (
      'mock:rec-lobio',
      'ロビオ (ジョージア伝統の赤インゲン豆シチュー)',
      'ジョージア（旧グルジア）で古くから愛される、お肉を使わないスパイス豆シチュー。とろっとしたインゲン豆の旨味に、くるみのコクとコリアンダーの香りが絶妙にマッチした絶品スープです。現地では伝統的な粘土の器でサーブされます。',
      'ジョージア',
      '🇬🇪',
      'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&q=80&w=800',
      25,
      2,
      true,
      true,
      array['ヴィーガン', 'グルテンフリー', '温まるシチュー', 'ナッツ使用'],
      '[{"order":1,"text":"玉ねぎと香味野菜を炒め、豆とスパイスを合わせて煮込みます。"},{"order":2,"text":"くるみとビネガーでコクを足し、香草を混ぜて仕上げます。"}]'::jsonb
    ),
    (
      'mock:rec-gadogado',
      'ガドガド (インドネシアの温野菜厚揚げピーナッツサラダ)',
      '「ごちゃ混ぜにする」という意味を持つ、インドネシアの代表的な温野菜料理。茹でたキャベツやもやし、厚揚げ（タフ）に、濃厚でスパイシーなピーナッツソースをたっぷりかけていただきます。動物性食材を使わず、ヴィーガンとして楽しめる一皿です。',
      'インドネシア',
      '🇮🇩',
      'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&q=80&w=800',
      20,
      2,
      true,
      true,
      array['ヴィーガン', 'グルテンフリー対応', '温野菜', 'アジアン'],
      '[{"order":1,"text":"野菜をさっと茹で、厚揚げを香ばしく焼きます。"},{"order":2,"text":"ピーナッツソースを混ぜ、食べる直前に全体へかけます。"}]'::jsonb
    ),
    (
      'mock:rec-dal',
      'レンズ豆のダル (南インドの本格まろやか豆カレー)',
      '小麦粉（ルウ）や動物性食材を使わず、レンズ豆のデンプンとココナッツミルクのまろやかさだけで仕上げる南インドの日常食。スパイスの香りと豆のやさしい甘みを楽しめる、アレルギー特定原材料9品目を含まないレシピです。',
      'インド',
      '🇮🇳',
      'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&q=80&w=800',
      30,
      3,
      true,
      true,
      array['ヴィーガン', 'グルテンフリー', '9大アレルギーフリー', 'スパイス薬膳'],
      '[{"order":1,"text":"香味野菜とスパイスを炒め、豆とトマトを煮込みます。"},{"order":2,"text":"ココナッツミルクでまろやかに整えて仕上げます。"}]'::jsonb
    ),
    (
      'mock:rec-tacos',
      'タコス・デ・ソヤ (メキシコ風大豆ミートのストリートタコス)',
      'メキシコシティの屋台で大人気のエスニックストリートフード。伝統的なタコスは小麦粉ではなく「トウモロコシ粉（マサ）」のトルティーヤを使うため、もともと完全グルテンフリーです。大豆ミート（ソイミート）をスパイスで味付けし、ジューシーでヘルシーに仕上げます。',
      'メキシコ',
      '🇲🇽',
      'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&q=80&w=800',
      20,
      2,
      true,
      true,
      array['ヴィーガン', 'グルテンフリー', 'ピリ辛サルサ', '手づかみフード'],
      '[{"order":1,"text":"大豆ミートを戻し、スパイスと玉ねぎで炒めます。"},{"order":2,"text":"温めたコーントルティーヤに具材とサルサをのせます。"}]'::jsonb
    )
)
insert into public.recipes (
  source_type,
  source_ref,
  title,
  description,
  cuisine,
  flag,
  image_url,
  cook_time_min,
  servings,
  is_public,
  is_vegan,
  is_gluten_free,
  tags,
  steps
)
select
  'api',
  source_ref,
  title,
  description,
  cuisine,
  flag,
  image_url,
  cook_time_min,
  servings,
  true,
  is_vegan,
  is_gluten_free,
  tags,
  steps
from mock_recipes
on conflict (source_type, source_ref) where source_ref is not null do update set
  title = excluded.title,
  description = excluded.description,
  cuisine = excluded.cuisine,
  flag = excluded.flag,
  image_url = excluded.image_url,
  cook_time_min = excluded.cook_time_min,
  servings = excluded.servings,
  is_public = excluded.is_public,
  is_vegan = excluded.is_vegan,
  is_gluten_free = excluded.is_gluten_free,
  tags = excluded.tags,
  steps = excluded.steps;

with mock_ingredient_seed (source_ref, name_en, name_ja, quantity, is_optional) as (
  values
    ('mock:rec-lobio', 'mock:rec-lobio:ingredient:01', '赤インゲン豆', '400g', false),
    ('mock:rec-lobio', 'walnut', 'くるみ', '50g', false),
    ('mock:rec-lobio', 'mock:rec-lobio:ingredient:03', '玉ねぎ', '1個', false),
    ('mock:rec-gadogado', 'peanut', 'ピーナッツバター', '大さじ4', false),
    ('mock:rec-gadogado', 'soybean', '厚揚げ', '1パック', false),
    ('mock:rec-gadogado', 'mock:rec-gadogado:ingredient:03', 'キャベツ', '3〜4枚', false),
    ('mock:rec-dal', 'mock:rec-dal:ingredient:01', '赤レンズ豆', '150g', false),
    ('mock:rec-dal', 'mock:rec-dal:ingredient:02', 'ココナッツミルク', '200ml', false),
    ('mock:rec-dal', 'mock:rec-dal:ingredient:03', 'トマト', '200g', false),
    ('mock:rec-tacos', 'soybean', '大豆ミート', '120g', false),
    ('mock:rec-tacos', 'mock:rec-tacos:ingredient:02', 'コーントルティーヤ', '4枚', false),
    ('mock:rec-tacos', 'mock:rec-tacos:ingredient:03', 'サルサ', '適量', false)
), custom_mock_ingredients as (
  select distinct name_en, name_ja
  from mock_ingredient_seed
  where name_en like 'mock:%'
)
insert into public.ingredients (name_ja, name_en, category)
select name_ja, name_en, 'mock料理'
from custom_mock_ingredients
on conflict (name_en) do update set
  name_ja = excluded.name_ja,
  category = excluded.category;

with mock_ingredient_seed (source_ref, name_en, quantity, is_optional) as (
  values
    ('mock:rec-lobio', 'mock:rec-lobio:ingredient:01', '400g', false),
    ('mock:rec-lobio', 'walnut', '50g', false),
    ('mock:rec-lobio', 'mock:rec-lobio:ingredient:03', '1個', false),
    ('mock:rec-gadogado', 'peanut', '大さじ4', false),
    ('mock:rec-gadogado', 'soybean', '1パック', false),
    ('mock:rec-gadogado', 'mock:rec-gadogado:ingredient:03', '3〜4枚', false),
    ('mock:rec-dal', 'mock:rec-dal:ingredient:01', '150g', false),
    ('mock:rec-dal', 'mock:rec-dal:ingredient:02', '200ml', false),
    ('mock:rec-dal', 'mock:rec-dal:ingredient:03', '200g', false),
    ('mock:rec-tacos', 'soybean', '120g', false),
    ('mock:rec-tacos', 'mock:rec-tacos:ingredient:02', '4枚', false),
    ('mock:rec-tacos', 'mock:rec-tacos:ingredient:03', '適量', false)
)
insert into public.recipe_ingredients (recipe_id, ingredient_id, quantity, is_optional)
select r.id, i.id, s.quantity, s.is_optional
from mock_ingredient_seed s
join public.recipes r
  on r.source_type = 'api'
 and r.source_ref = s.source_ref
join public.ingredients i
  on i.name_en = s.name_en
on conflict (recipe_id, ingredient_id) do update set
  quantity = excluded.quantity,
  is_optional = excluded.is_optional;

with culture_seed (source_ref, section_key, label, title, body, sort_order) as (
  values
    ('mock:rec-lobio', 'origin', '由来', '豆を囲む食卓の読み物', 'ロビオは、豆を主役にした家庭的な煮込みとして親しまれてきた料理という設定の mock 記事です。くるみ、香草、酸味を重ねることで、山あいの食卓にある素朴さと温かさを感じられる一皿として紹介します。', 1),
    ('mock:rec-lobio', 'food_culture', '食文化', '発酵感と香草がつなぐ食文化', 'ジョージア料理のイメージとして、香草、ナッツ、酸味を組み合わせる食文化を mock で表現しています。肉を使わない豆料理でも満足感を作れるため、宗教・嗜好・体調に合わせた食卓に置きやすい読み物として扱います。', 2),
    ('mock:rec-gadogado', 'origin', '由来', '混ぜて楽しむ屋台風サラダ', 'ガドガドは「いろいろな具材を混ぜる」楽しさを伝える料理として、この mock 記事では紹介します。温野菜、豆腐、濃厚なピーナッツソースを一皿にまとめ、日常の軽食にも主菜にもなる柔らかな自由さを描きます。', 1),
    ('mock:rec-gadogado', 'food_culture', '食文化', '甘辛いソースと多様な食卓', 'インドネシアの島々を思わせる多様な食材感を、甘み・辛み・酸味のソースでまとめる mock 読み物です。植物性の具材を中心にしても満足感を出しやすく、食の制限がある人とも分け合いやすい一皿として表現します。', 2),
    ('mock:rec-dal', 'origin', '由来', '毎日の豆カレーという安心感', 'ダルは、豆をやわらかく煮てスパイスで香りを重ねる日常食という設定の mock 記事です。特別なごちそうではなく、体を温める家庭の味として、米やパンと合わせやすい素朴な魅力を伝えます。', 1),
    ('mock:rec-dal', 'food_culture', '食文化', '豆とスパイスが支える食文化', 'インドの食卓をイメージし、豆、香味野菜、スパイスを組み合わせることで、菜食中心でも満足できる構成を mock で説明します。宗教や地域差で食の選択が分かれる場面でも、豆料理が橋渡しになる読み物です。', 2),
    ('mock:rec-tacos', 'origin', '由来', '手で包むストリートフード', 'タコスは、具材をトルティーヤで包んで気軽に食べる楽しさを伝える料理として、この mock 記事では扱います。大豆ミートを使うことで、屋台らしい香ばしさと現代的な軽さを同時に味わえる設定です。', 1),
    ('mock:rec-tacos', 'food_culture', '食文化', 'とうもろこしと共有の食卓', 'メキシコ料理のイメージとして、とうもろこしのトルティーヤを中心に具材を自由に組み合わせる文化を mock で描きます。小麦を避けたい人や植物性を選びたい人にも調整しやすい、開かれた食卓として紹介します。', 2)
)
insert into public.recipe_culture_sections (recipe_id, section_key, label, title, body, sort_order)
select r.id, c.section_key, c.label, c.title, c.body, c.sort_order
from culture_seed c
join public.recipes r
  on r.source_type = 'api'
 and r.source_ref = c.source_ref
on conflict (recipe_id, section_key) do update set
  label = excluded.label,
  title = excluded.title,
  body = excluded.body,
  sort_order = excluded.sort_order,
  updated_at = now();
