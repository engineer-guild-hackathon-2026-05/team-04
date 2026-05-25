import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const dietarySource = readFileSync('src/lib/dietaryRestrictions.ts', 'utf8');
const modalSource = readFileSync('src/app/components/RecipeModal.tsx', 'utf8');
const listSource = readFileSync('src/app/components/ListView.tsx', 'utf8');

for (const id of ['diet-vegan', 'diet-lacto-vegetarian', 'diet-ovo-vegetarian', 'diet-pescatarian']) {
  assert.match(
    dietarySource,
    new RegExp(`['"]${id}['"]`),
    `${id} の判定ルールを dietaryRestrictions に定義してください。`,
  );
}

assert.match(
  dietarySource,
  /'diet-vegan'[\s\S]*?tags\.has\(ANIMAL_PRODUCT_DIETARY_TAG\)/,
  '完全ヴィーガンは animal-product をすべて不可にしてください。',
);
assert.match(
  dietarySource,
  /'diet-lacto-vegetarian'[\s\S]*?DAIRY_DIETARY_TAG[\s\S]*?EGG_DIETARY_TAG[\s\S]*?SEAFOOD_DIETARY_TAGS/s,
  'ラクトは乳を許容し、卵・肉・魚介を不可にしてください。',
);
assert.match(
  dietarySource,
  /'diet-ovo-vegetarian'[\s\S]*?EGG_DIETARY_TAG[\s\S]*?DAIRY_DIETARY_TAG[\s\S]*?SEAFOOD_DIETARY_TAGS/s,
  'オボは卵を許容し、乳・肉・魚介を不可にしてください。',
);
assert.match(
  dietarySource,
  /'diet-pescatarian'[\s\S]*?MEAT_DIETARY_TAGS[\s\S]*?fish[\s\S]*?shellfish/s,
  'ペスカタリアンは肉を不可、魚介を許容として判定してください。',
);

assert.match(
  modalSource,
  /selectedDietaryRestrictionIds\.map\(\(restrictionId\)[\s\S]*?rule\.conflictLabel[\s\S]*?rule\.compatibleLabel/s,
  'RecipeModal は選択された diet 種別ごとに不可/対応タグを表示してください。',
);
assert.doesNotMatch(
  modalSource,
  /ヴィーガン不可:\s*\$\{(?:animalProductNames|conflictNames)\.join\(/,
  'RecipeModal は diet 種別を落とした汎用 ヴィーガン不可 タグを表示しないでください。',
);
assert.match(
  listSource,
  /violatesDietaryRestrictions\(recipe,\s*restrictedIngredients\)/,
  'ListView も diet 種別ルールで不適合レシピを除外してください。',
);

console.log('dietary restriction level regression checks passed');
