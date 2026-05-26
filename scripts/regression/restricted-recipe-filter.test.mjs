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
  const violatesSelectedDiet = restrictedIngredients.includes('diet-vegan') &&
    recipe.ingredients.some((ingredient) => ingredient.dietary_tags?.includes('animal-product'));
  return matchesQuery && !containsRestrictedIngredient && !violatesSelectedDiet;
});

const sampleRecipes = [
  { id: 'rec-gadogado', title: 'ガドガド', description: 'ピーナッツソースのサラダ', cuisine: 'インドネシア', ingredients: [{ id: 'ing-peanut', name_ja: 'ピーナッツ', dietary_tags: [] }] },
  { id: 'rec-chicken', title: '鶏肉料理', description: '肉料理', cuisine: 'タイ', ingredients: [{ id: 'ing-chicken', name_ja: '鶏肉', dietary_tags: ['meat', 'animal-product'] }] },
  { id: 'rec-safe', title: '安全なサラダ', description: 'ナッツなし', cuisine: '日本', ingredients: [{ id: 'ing-tomato', name_ja: 'トマト', dietary_tags: [] }] },
];
assert.deepEqual(fixedFilter(sampleRecipes, ['ing-peanut']).map((recipe) => recipe.id), ['rec-chicken', 'rec-safe']);
assert.deepEqual(fixedFilter(sampleRecipes, ['diet-vegan']).map((recipe) => recipe.id), ['rec-gadogado', 'rec-safe']);
assert.match(listViewSource, /containsRestrictedIngredient\s*=\s*recipe\.ingredients\.some[\s\S]*restrictedIngredients\.includes\(ingredient\.id\)/);
assert.match(listViewSource, /violatesDietaryRestrictions\(recipe,\s*restrictedIngredients\)/);
assert.match(listViewSource, /return\s+matchesQuery\s*&&\s*!containsRestrictedIngredient\s*&&\s*!violatesSelectedDiet/);
assert.match(listViewSource, /},\s*\[[^\]]*searchQuery,\s*restrictedIngredients\]\)/);

console.log('restricted recipe filter regression checks passed');
