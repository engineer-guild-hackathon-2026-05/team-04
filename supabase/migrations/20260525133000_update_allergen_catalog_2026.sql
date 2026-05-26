-- =============================================
-- 令和8年4月時点の食物アレルギー表示対象品目へ更新
-- =============================================

insert into public.ingredients (name_ja, name_en, category, is_allergen, dietary_tags, ingredient_code) values
  ('マカダミアナッツ', 'macadamia nut', 'ナッツ類', true, '{}', 'ing-macadamia'),
  ('ピスタチオ',       'pistachio',     'ナッツ類', true, '{}', 'ing-pistachio')
on conflict (name_en) do update set
  name_ja = excluded.name_ja,
  category = excluded.category,
  is_allergen = excluded.is_allergen,
  dietary_tags = excluded.dietary_tags,
  ingredient_code = excluded.ingredient_code;

-- まつたけは令和6年3月改正で特定原材料に準ずるものから削除済み。
-- アレルゲン選択肢から非表示になるとプロフィール画面で解除できないため、
-- 既存ユーザーのNG設定からは削除する。材料マスタ行は既存参照を壊さないよう残す。
delete from public.user_restricted_ingredients restricted
using public.ingredients ingredient
where restricted.ingredient_id = ingredient.id
  and ingredient.name_en = 'matsutake';

update public.ingredients
set is_allergen = false
where name_en = 'matsutake';
