import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const profileView = readFileSync('src/app/components/ProfileView.tsx', 'utf8');
const preparationRules = readFileSync('src/lib/preparationRestrictions.ts', 'utf8');

assert.match(
  profileView,
  /食材そのものがNGなら「アレルギー要素」、生・半生だけNGなら「調理状態」/,
  'プロフィールフォームは、常時NGと生・半生だけNGの選び分けを説明してください。',
);
assert.match(
  profileView,
  /アレルギー要素（加熱済みも含めて避ける）/,
  'アレルギー要素セクションは、加熱済みも含めて避ける設定だと明示してください。',
);
assert.match(
  profileView,
  /調理状態で避けたいもの（生・半生だけNG）/,
  '調理状態セクションは、生・半生だけNGの設定だと明示してください。',
);
for (const option of [
  '生・半生のえび（加熱済みは可）',
  '生・半生のかに（加熱済みは可）',
  '生・半生のいか（加熱済みは可）',
  '生・半生のさけ（加熱済みは可）',
]) {
  assert.match(profileView, new RegExp(option.replace(/[（）]/g, '.')), `${option} を個別に選べるようにしてください。`);
}
assert.match(
  preparationRules,
  /'prep-raw-ing-shrimp'[\s\S]*?hasRawIngredientConflict\('ing-shrimp'\)/,
  '生・半生のえびは、ing-shrimp かつ raw タグのレシピ材料だけを除外してください。',
);
assert.match(
  preparationRules,
  /'prep-raw-ing-salmon'[\s\S]*?hasRawIngredientConflict\('ing-salmon'\)/,
  '生・半生のさけは、ing-salmon かつ raw タグのレシピ材料だけを除外してください。',
);

console.log('profile raw preparation UX regression checks passed');
