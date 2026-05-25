import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const modalSource = readFileSync('src/app/components/RecipeModal.tsx', 'utf8');
const routeSource = readFileSync('src/app/api/recipes/route.ts', 'utf8');
const mappingSource = readFileSync('src/lib/recipeMapping.ts', 'utf8');
const mockDataSource = readFileSync('src/lib/mockData.ts', 'utf8');

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
  /ANIMAL_PRODUCT_DIETARY_TAG\s*=\s*['"]animal-product['"][\s\S]*?recipe\.ingredients\.filter\([\s\S]*?dietary_tags\?\.includes\(ANIMAL_PRODUCT_DIETARY_TAG\)/,
  'RecipeModal のヴィーガン判定は recipe.is_vegan だけでなく材料の dietary_tags(animal-product) を確認してください。',
);

assert.match(
  modalSource,
  /animalProductNames\.length\s*>\s*0[\s\S]*?ヴィーガン不可:\s*\$\{animalProductNames\.join\(/,
  'animal-product 材料がある料理は ヴィーガン要確認 ではなく、材料名付きの ヴィーガン不可 タグを表示してください。',
);

assert.doesNotMatch(
  modalSource,
  /const\s+recipeRestrictionTags\s*=\s*\[\s*recipe\.is_vegan\s*\?/,
  'RecipeModal で recipe.is_vegan=false だけを根拠に ヴィーガン要確認 を即表示しないでください。',
);

console.log('recipe modal dietary tag regression checks passed');
