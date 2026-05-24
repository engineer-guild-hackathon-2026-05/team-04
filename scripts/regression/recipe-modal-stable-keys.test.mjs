import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const modalSource = readFileSync('src/app/components/RecipeModal.tsx', 'utf8');
const mockSource = readFileSync('src/lib/mockData.ts', 'utf8');

assert.doesNotMatch(
  modalSource,
  /recipe\.ingredients\.map\(\(ing, index\)[\s\S]*?key=\{index\}/,
  'RecipeModal の材料リストは index 単独ではなく、材料内容に基づく安定した key を使ってください。',
);

assert.match(
  modalSource,
  /getIngredientListKey\(recipe\.id, ing\)/,
  'RecipeModal の材料リスト key は recipe id と材料内容から生成してください。',
);

const recipePattern = /\{\n    id: "(rec-[^"]+)",[\s\S]*?ingredients: \[([\s\S]*?)\n    \],[\s\S]*?steps: \[/g;
const recipes = [...mockSource.matchAll(recipePattern)].map((match) => ({
  id: match[1],
  ingredients: [...match[2].matchAll(/\{ id: "([^"]+)", name_ja: "([^"]+)", quantity: "([^"]+)", is_optional: (true|false)/g)]
    .map(([, id, nameJa, quantity]) => ({ id, nameJa, quantity })),
}));

for (const recipe of recipes) {
  const keys = recipe.ingredients.map((ingredient) =>
    [recipe.id, ingredient.id, ingredient.nameJa, ingredient.quantity].join('::'),
  );
  assert.equal(
    new Set(keys).size,
    keys.length,
    `${recipe.id}: 材料内容ベースの key が一意になるよう mockData を保ってください。`,
  );
}

console.log('recipe modal stable key regression checks passed');
