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
-- 既存ユーザー参照を壊さないよう行は残し、アレルゲン選択肢からのみ外す。
update public.ingredients
set is_allergen = false
where name_en = 'matsutake';
