import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const modalSource = readFileSync('src/app/components/RecipeModal.tsx', 'utf8');
const routeSource = readFileSync('src/app/api/recipes/route.ts', 'utf8');
const mappingSource = readFileSync('src/lib/recipeMapping.ts', 'utf8');
const mockDataSource = readFileSync('src/lib/mockData.ts', 'utf8');
const dietaryRestrictionsSource = readFileSync('src/lib/dietaryRestrictions.ts', 'utf8');

assert.match(
  mockDataSource,
  /interface\s+RecipeIngredient\s*\{[\s\S]*?dietary_tags\??\s*:\s*string\[\][\s\S]*?\}/s,
  'RecipeIngredient は DB の dietary_tags / is_allergen を UI へ渡せる型にしてください。',
);
assert.match(
  mockDataSource,
  /interface\s+RecipeIngredient\s*\{[\s\S]*?is_allergen\??\s*:\s*boolean[\s\S]*?\}/s,
  'RecipeIngredient は DB の is_allergen を UI へ渡せる型にしてください。',
);

assert.match(
  routeSource,
  /ingredients\s*\([\s\S]*?ingredient_code[\s\S]*?category[\s\S]*?is_allergen[\s\S]*?dietary_tags[\s\S]*?\)/,
  '/api/recipes は ingredients join から category/is_allergen/dietary_tags を取得してください。',
);

assert.match(
  mappingSource,
  /dietary_tags\??\s*:\s*string\[\]\s*\|\s*null[\s\S]*?is_allergen\??\s*:\s*boolean\s*\|\s*null|is_allergen\??\s*:\s*boolean\s*\|\s*null[\s\S]*?dietary_tags\??\s*:\s*string\[\]\s*\|\s*null/s,
  'recipeMapping の join row 型は ingredients.dietary_tags / is_allergen を受け取ってください。',
);

assert.match(
  mappingSource,
  /dietary_tags\s*:\s*ingredient\.dietary_tags\s*\?\?\s*\[\][\s\S]*?is_allergen\s*:\s*ingredient\.is_allergen\s*\?\?\s*false|is_allergen\s*:\s*ingredient\.is_allergen\s*\?\?\s*false[\s\S]*?dietary_tags\s*:\s*ingredient\.dietary_tags\s*\?\?\s*\[\]/s,
  'recipeMapping は DB の dietary_tags / is_allergen を RecipeIngredient に保持してください。',
);

assert.match(
  modalSource,
  /getSelectedDietaryRestrictionIds\(restrictedIngredients\)[\s\S]*?getDietaryConflictingIngredients\(recipe,\s*restrictionId\)/,
  'RecipeModal の食事制限タグは選択された diet 種別ごとに ingredients.dietary_tags を評価してください。',
);

assert.match(
  modalSource,
  /\$\{rule\.conflictLabel\}:\s*\$\{conflictNames\.join\(/,
  '選択 diet に違反する材料がある場合は diet 種別の不可ラベルと材料名を表示してください。',
);

for (const label of ['完全ヴィーガン不可', 'ラクト不可', 'オボ不可', 'ペスカタリアン不可']) {
  assert.match(
    dietaryRestrictionsSource,
    new RegExp(label),
    `dietaryRestrictions は ${label} の段階別不可ラベルを定義してください。`,
  );
}

assert.match(
  dietaryRestrictionsSource,
  /'diet-vegan'[\s\S]*?ANIMAL_PRODUCT_DIETARY_TAG[\s\S]*?'diet-lacto-vegetarian'[\s\S]*?DAIRY_DIETARY_TAG[\s\S]*?'diet-ovo-vegetarian'[\s\S]*?EGG_DIETARY_TAG[\s\S]*?'diet-pescatarian'[\s\S]*?fish[\s\S]*?shellfish/s,
  'dietaryRestrictions は vegan/lacto/ovo/pescatarian をそれぞれ別ルールで判定してください。',
);

assert.match(
  modalSource,
  /動物性含有:\s*\$\{animalProductNames\.join\(/,
  'diet 未選択時は特定の vegan 種別ではなく、動物性含有として材料名を表示してください。',
);

assert.match(
  modalSource,
  /GLUTEN_DIETARY_TAG\s*=\s*['"]gluten['"][\s\S]*?recipe\.ingredients\.filter\([\s\S]*?dietary_tags\?\.includes\(GLUTEN_DIETARY_TAG\)/,
  'RecipeModal のグルテン判定は recipe.is_gluten_free だけでなく材料の dietary_tags(gluten) を確認してください。',
);

assert.match(
  modalSource,
  /glutenIngredientNames\.length\s*>\s*0[\s\S]*?グルテン含有:\s*\$\{glutenIngredientNames\.join\(/,
  'gluten 材料がある料理は グルテン要確認 ではなく、材料名付きの グルテン含有 タグを表示してください。',
);

assert.doesNotMatch(
  modalSource,
  /ヴィーガン不可:\s*\$\{animalProductNames\.join\(/,
  'RecipeModal は diet 種別を無視した汎用 ヴィーガン不可 ラベルを表示しないでください。',
);

assert.doesNotMatch(
  modalSource,
  /recipeRestrictionTags\s*=\s*\[[\s\S]*?recipe\.is_gluten_free\s*\?\s*\{\s*label:\s*['"]グルテンフリー対応['"][\s\S]*?:\s*\{\s*label:\s*['"]グルテン要確認['"]/,
  'RecipeModal で recipe.is_gluten_free=false だけを根拠に グルテン要確認 を即表示しないでください。',
);

console.log('recipe modal dietary tag regression checks passed');
