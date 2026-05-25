import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const listViewSource = readFileSync('src/app/components/ListView.tsx', 'utf8');
const mockDataSource = readFileSync('src/lib/mockData.ts', 'utf8');

assert.match(
  mockDataSource,
  /id:\s*['"]ing-peanut['"]/,
  '再現対象としてピーナッツ制限食材が必要です。',
);
assert.match(
  mockDataSource,
  /id:\s*['"]rec-gadogado['"][\s\S]*id:\s*['"]ing-peanut['"]/,
  '再現: ガドガドはピーナッツを含むため、ing-peanut 制限時に表示してはいけません。',
);

const previousFilter = (recipes, restrictedIngredients, searchQuery = '') => recipes.filter((recipe) => {
  const normalizedQuery = searchQuery.toLowerCase();
  const matchesQuery =
    recipe.title.toLowerCase().includes(normalizedQuery) ||
    recipe.description.toLowerCase().includes(normalizedQuery) ||
    recipe.cuisine.toLowerCase().includes(normalizedQuery) ||
    recipe.ingredients.some((ingredient) => ingredient.name_ja.toLowerCase().includes(normalizedQuery));

  return matchesQuery;
});

const fixedFilter = (recipes, restrictedIngredients, searchQuery = '') => recipes.filter((recipe) => {
  const normalizedQuery = searchQuery.toLowerCase();
  const matchesQuery =
    recipe.title.toLowerCase().includes(normalizedQuery) ||
    recipe.description.toLowerCase().includes(normalizedQuery) ||
    recipe.cuisine.toLowerCase().includes(normalizedQuery) ||
    recipe.ingredients.some((ingredient) => ingredient.name_ja.toLowerCase().includes(normalizedQuery));
  const containsRestrictedIngredient = recipe.ingredients.some((ingredient) =>
    restrictedIngredients.includes(ingredient.id),
  );

  return matchesQuery && !containsRestrictedIngredient;
});

const sampleRecipes = [
  {
    id: 'rec-gadogado',
    title: 'ガドガド',
    description: 'ピーナッツソースのサラダ',
    cuisine: 'インドネシア',
    ingredients: [{ id: 'ing-peanut', name_ja: 'ピーナッツ' }],
  },
  {
    id: 'rec-safe',
    title: '安全なサラダ',
    description: 'ナッツなし',
    cuisine: '日本',
    ingredients: [{ id: 'ing-tomato', name_ja: 'トマト' }],
  },
];

assert.deepEqual(
  previousFilter(sampleRecipes, ['ing-peanut']).map((recipe) => recipe.id),
  ['rec-gadogado', 'rec-safe'],
  '再現: 旧フィルターは制限食材を無視し、ピーナッツ入りレシピを残します。',
);
assert.deepEqual(
  fixedFilter(sampleRecipes, ['ing-peanut']).map((recipe) => recipe.id),
  ['rec-safe'],
  '修正: 制限食材を含むレシピは検索結果とおすすめ候補から除外してください。',
);

assert.match(
  listViewSource,
  /containsRestrictedIngredient\s*=\s*recipe\.ingredients\.some[\s\S]*restrictedIngredients\.includes\(ingredient\.id\)/,
  'ListView は各レシピが制限食材を含むか判定してください。',
);
assert.match(
  listViewSource,
  /return\s+matchesQuery\s*&&\s*!containsRestrictedIngredient/,
  'ListView の filteredRecipes は検索条件に加え、制限食材を含まないことを条件にしてください。',
);
assert.match(
  listViewSource,
  /},\s*\[searchQuery,\s*restrictedIngredients\]\)/,
  'filteredRecipes の useMemo dependency に restrictedIngredients を含めてください。',
);

console.log('restricted recipe filter regression checks passed');
