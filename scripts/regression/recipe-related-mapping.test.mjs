import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const mappingSource = readFileSync('src/lib/recipeMapping.ts', 'utf8');

assert.match(
  mappingSource,
  /type\s+RecipeRelatedRecipeJoinRow\s*=\s*\{[\s\S]*?section_key\??\s*:\s*string\s*\|\s*null[\s\S]*?related_recipe_id\??\s*:\s*string\s*\|\s*null[\s\S]*?reason_label\??\s*:\s*string\s*\|\s*null[\s\S]*?sort_order\??\s*:\s*number\s*\|\s*null[\s\S]*?\}/,
  'recipeMapping は recipe_related_recipes join row 型を明示してください。',
);
assert.match(
  mappingSource,
  /recipe_related_recipes\??\s*:\s*RecipeRelatedRecipeJoinRow\[\]\s*\|\s*null/,
  'RecipeDbRow は recipe_related_recipes join を受け取れるようにしてください。',
);
assert.match(
  mappingSource,
  /function\s+normalizeRecipeRelatedSections|export\s+function\s+normalizeRecipeRelatedSections/,
  'normalizeRecipeRelatedSections を追加してください。',
);
assert.match(mappingSource, /CULTURE_SECTION_KEYS\.has\(key\s+as\s+RecipeCultureSectionKey\)/, 'section_key は既存の origin / food_culture union で検証してください。');
assert.match(mappingSource, /isNonEmptyString\(row\.related_recipe_id\)/, 'related_recipe_id は空文字を除外してください。');
assert.match(mappingSource, /related_recipe_id\s*[!=]==\s*currentRecipeId|currentRecipeId\s*[!=]==\s*related_recipe_id/, '自分自身への関連参照は mapper で除外してください。');
assert.match(mappingSource, /typeof\s+row\.sort_order\s*===\s*['"]number['"][\s\S]*Number\.isFinite\(row\.sort_order\)/, 'sort_order は finite number のみ受け付けてください。');
assert.match(mappingSource, /sort\s*\([\s\S]*?sort_order[\s\S]*?recipe_id[\s\S]*?\)/, '表示順は sort_order の後に recipe_id で安定化してください。');
assert.match(mappingSource, /slice\s*\(\s*0\s*,\s*3\s*\)/, '各タブの関連候補は mapper 側でも 3 件に制限してください。');
assert.match(mappingSource, /related_sections\s*:\s*normalizeRecipeRelatedSections\(/, 'mapRecipeRowToRecipe は related_sections を常に正規化して返してください。');

console.log('recipe related mapping regression checks passed');
