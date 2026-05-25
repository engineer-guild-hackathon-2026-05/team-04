import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const listViewSource = readFileSync('src/app/components/ListView.tsx', 'utf8');
const mockDataSource = readFileSync('src/lib/mockData.ts', 'utf8');

assert.match(mockDataSource, /id:\s*['"]ing-peanut['"]/);
assert.match(mockDataSource, /id:\s*['"]rec-gadogado['"][\s\S]*id:\s*['"]ing-peanut['"]/);

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
  { id: 'rec-gadogado', title: 'ガドガド', description: 'ピーナッツソースのサラダ', cuisine: 'インドネシア', ingredients: [{ id: 'ing-peanut', name_ja: 'ピーナッツ' }] },
  { id: 'rec-safe', title: '安全なサラダ', description: 'ナッツなし', cuisine: '日本', ingredients: [{ id: 'ing-tomato', name_ja: 'トマト' }] },
];
assert.deepEqual(fixedFilter(sampleRecipes, ['ing-peanut']).map((recipe) => recipe.id), ['rec-safe']);
assert.match(listViewSource, /containsRestrictedIngredient\s*=\s*recipe\.ingredients\.some[\s\S]*restrictedIngredients\.includes\(ingredient\.id\)/);
assert.match(listViewSource, /return\s+matchesQuery\s*&&\s*!containsRestrictedIngredient/);
assert.match(listViewSource, /},\s*\[[^\]]*searchQuery,\s*restrictedIngredients\]\)/);

console.log('restricted recipe filter regression checks passed');
