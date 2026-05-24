-- profiles テーブル
-- auth.users と 1:1 で対応するアプリケーション用プロフィール。
-- auth.users はメール等センシティブな情報を含むため直接 join せず、
-- アプリ側からは profiles を経由して参照する。

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- updated_at を自動更新するトリガ
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row
  execute function public.set_updated_at();

-- 新規ユーザー登録時に profiles 行を自動作成
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'display_name',
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      split_part(new.email, '@', 1)
    )
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- Row Level Security
alter table public.profiles enable row level security;

-- 自分のプロフィールは閲覧可能
create policy "profiles_select_own"
  on public.profiles
  for select
  using (auth.uid() = id);

-- 自分のプロフィールのみ更新可能
create policy "profiles_update_own"
  on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- INSERT / DELETE はアプリから直接行わない（trigger 経由 / cascade delete のみ）。
-- そのため明示的なポリシーは付与せず、anon / authenticated いずれもブロックする。
