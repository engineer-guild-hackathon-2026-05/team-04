-- =============================================
-- Auth / RLS hardening
-- =============================================

-- auth.users の trigger からのみ使う関数は、REST RPC として公開しない。
revoke execute on function public.handle_new_user() from public;
revoke execute on function public.handle_new_user() from anon;
revoke execute on function public.handle_new_user() from authenticated;

-- RLS policy 内の auth.uid() は initPlan 化して、行ごとの再評価を避ける。
-- 併せて、本人更新 policy には WITH CHECK を明示する。
drop policy if exists "自分のプロフィールを参照できる" on public.profiles;
drop policy if exists "自分のプロフィールを作成できる" on public.profiles;
drop policy if exists "自分のプロフィールを更新できる" on public.profiles;

create policy "自分のプロフィールを参照できる"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

create policy "自分のプロフィールを作成できる"
  on public.profiles for insert
  to authenticated
  with check ((select auth.uid()) = id);

create policy "自分のプロフィールを更新できる"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

drop policy if exists "自分のNG材料を参照できる" on public.user_restricted_ingredients;
drop policy if exists "自分のNG材料を登録できる" on public.user_restricted_ingredients;
drop policy if exists "自分のNG材料を削除できる" on public.user_restricted_ingredients;

create policy "自分のNG材料を参照できる"
  on public.user_restricted_ingredients for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "自分のNG材料を登録できる"
  on public.user_restricted_ingredients for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "自分のNG材料を削除できる"
  on public.user_restricted_ingredients for delete
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "公開レシピは誰でも参照できる" on public.recipes;
drop policy if exists "ユーザーは自分のレシピを作成できる" on public.recipes;

create policy "公開レシピは誰でも参照できる"
  on public.recipes for select
  to public
  using (is_public = true or (select auth.uid()) = created_by);

create policy "ユーザーは自分のレシピを作成できる"
  on public.recipes for insert
  to authenticated
  with check (source_type = 'user' and (select auth.uid()) = created_by);

drop policy if exists "参照できるレシピの材料は参照できる" on public.recipe_ingredients;
drop policy if exists "自分のレシピに材料を登録できる" on public.recipe_ingredients;

create policy "参照できるレシピの材料は参照できる"
  on public.recipe_ingredients for select
  to public
  using (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_id
        and (r.is_public = true or (select auth.uid()) = r.created_by)
    )
  );

create policy "自分のレシピに材料を登録できる"
  on public.recipe_ingredients for insert
  to authenticated
  with check (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_id
        and r.source_type = 'user'
        and (select auth.uid()) = r.created_by
    )
  );
