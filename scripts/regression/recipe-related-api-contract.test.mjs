import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const routeSource = readFileSync('src/app/api/recipes/route.ts', 'utf8');
const mockDataSource = readFileSync('src/lib/mockData.ts', 'utf8');
const apiTypesSource = readFileSync('src/lib/apiTypes.ts', 'utf8');

assert.match(
  routeSource,
  /recipe_related_recipes!recipe_related_recipes_recipe_id_fkey\s*\([\s\S]*?section_key[\s\S]*?related_recipe_id[\s\S]*?reason_label[\s\S]*?sort_order[\s\S]*?\)/,
  '/api/recipes select は親 recipe_id 側 FK を明示して関連レシピの relation-id metadata を取得してください。',
);
assert.doesNotMatch(
  routeSource,
  /[^!]recipe_related_recipes\s*\(\s*section_key/,
  '/api/recipes select で bare recipe_related_recipes(...) embed を使わないでください。',
);
assert.doesNotMatch(
  routeSource,
  /related_recipe\s*:\s*recipes|recipes!recipe_related_recipes_related_recipe_id_fkey/,
  '/api/recipes は関連先 Recipe 全体をネストせず related_recipe_id のみ返してください。',
);
assert.match(
  mockDataSource,
  /export\s+interface\s+RecipeRelatedReference\s*\{[\s\S]*?recipe_id\s*:\s*string[\s\S]*?reason_label\??\s*:\s*string[\s\S]*?sort_order\s*:\s*number[\s\S]*?\}/,
  'RecipeRelatedReference は recipe_id / optional reason_label / sort_order を持つ型にしてください。',
);
assert.match(
  mockDataSource,
  /export\s+interface\s+RecipeRelatedSection\s*\{[\s\S]*?key\s*:\s*RecipeCultureSectionKey[\s\S]*?recipes\s*:\s*RecipeRelatedReference\[\][\s\S]*?\}/,
  'RecipeRelatedSection はタブ key と関連参照配列を持つ型にしてください。',
);
assert.match(
  mockDataSource,
  /interface\s+Recipe\s*\{[\s\S]*?related_sections\s*:\s*RecipeRelatedSection\[\]/,
  'Recipe 型の公開フィールド名は related_sections にしてください。',
);
assert.match(
  apiTypesSource,
  /recipes\s*:\s*Recipe\[\]/,
  'RecipesResponse は related_sections を含む Recipe[] 契約を維持してください。',
);

console.log('recipe related API contract regression checks passed');
