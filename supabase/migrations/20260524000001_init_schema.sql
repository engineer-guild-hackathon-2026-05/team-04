-- =============================================
-- テーブル定義
-- =============================================

-- プロフィール（auth.users の拡張）
create table public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  name       text,
  created_at timestamptz not null default now()
);

-- 材料マスタ
create table public.ingredients (
  id         uuid primary key default gen_random_uuid(),
  name_ja    text not null,
  name_en    text not null,
  category   text not null,
  created_at timestamptz not null default now(),
  constraint ingredients_name_en_key unique (name_en)
);

-- ユーザーのNG材料
create table public.user_restricted_ingredients (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  ingredient_id uuid not null references public.ingredients(id) on delete cascade,
  reason        text not null default 'allergy', -- 'allergy' | 'dislike' | 'religious'
  created_at    timestamptz not null default now(),
  constraint user_restricted_ingredients_unique unique (user_id, ingredient_id)
);

-- レシピ（AI生成・API取得・ユーザー投稿を一元管理）
create table public.recipes (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  description     text,
  source_type     text not null check (source_type in ('ai', 'api', 'user')),
  source_ref      text,           -- 外部APIのID（ai/userはnull）
  created_by      uuid references public.profiles(id) on delete set null, -- userのときのみ使用
  steps           jsonb,          -- 手順の配列
  servings        int,
  cook_time_min   int,
  image_url       text,
  is_public       boolean not null default true,
  created_at      timestamptz not null default now()
);

-- レシピ×材料の中間テーブル（NG材料フィルタリングに使用）
create table public.recipe_ingredients (
  id            uuid primary key default gen_random_uuid(),
  recipe_id     uuid not null references public.recipes(id) on delete cascade,
  ingredient_id uuid not null references public.ingredients(id) on delete cascade,
  quantity      text,
  is_optional   boolean not null default false,
  constraint recipe_ingredients_unique unique (recipe_id, ingredient_id)
);

-- =============================================
-- インデックス
-- =============================================

create index on public.user_restricted_ingredients (user_id);
create index on public.recipe_ingredients (recipe_id);
create index on public.recipe_ingredients (ingredient_id);
create index on public.recipes (source_type);

-- =============================================
-- Row Level Security
-- =============================================

alter table public.profiles enable row level security;
alter table public.ingredients enable row level security;
alter table public.user_restricted_ingredients enable row level security;
alter table public.recipes enable row level security;
alter table public.recipe_ingredients enable row level security;

-- profiles: 自分のプロフィールのみ読み書き可
create policy "自分のプロフィールを参照できる"
  on public.profiles for select
  using (auth.uid() = id);

create policy "自分のプロフィールを作成できる"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "自分のプロフィールを更新できる"
  on public.profiles for update
  using (auth.uid() = id);

-- ingredients: 全ユーザーが参照可（マスタデータのため）
create policy "材料マスタは誰でも参照できる"
  on public.ingredients for select
  using (true);

-- user_restricted_ingredients: 自分のNG材料のみ操作可
create policy "自分のNG材料を参照できる"
  on public.user_restricted_ingredients for select
  using (auth.uid() = user_id);

create policy "自分のNG材料を登録できる"
  on public.user_restricted_ingredients for insert
  with check (auth.uid() = user_id);

create policy "自分のNG材料を削除できる"
  on public.user_restricted_ingredients for delete
  using (auth.uid() = user_id);

-- recipes: 公開レシピは全員参照可、自分のレシピは書き込み可
create policy "公開レシピは誰でも参照できる"
  on public.recipes for select
  using (is_public = true or auth.uid() = created_by);

create policy "ユーザーは自分のレシピを作成できる"
  on public.recipes for insert
  with check (source_type = 'user' and auth.uid() = created_by);

-- recipe_ingredients: レシピが参照できるなら材料も参照可
create policy "参照できるレシピの材料は参照できる"
  on public.recipe_ingredients for select
  using (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_id
        and (r.is_public = true or auth.uid() = r.created_by)
    )
  );

-- =============================================
-- auth.users 作成時に profiles を自動生成するトリガー
-- =============================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, name)
  values (new.id, new.raw_user_meta_data ->> 'name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
