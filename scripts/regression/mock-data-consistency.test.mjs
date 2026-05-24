import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync('src/lib/mockData.ts', 'utf8');

const masterIds = new Set(
  [...source.matchAll(/\{ id: "(ing-[^"]+)", name_ja: "[^"]+", name_en: "[^"]+", category: "[^"]+" \}/g)]
    .map(([, id]) => id),
);

const recipePattern = /\{\n    id: "(rec-[^"]+)",[\s\S]*?title: "([^"]+)",[\s\S]*?description: "([^"]+)",[\s\S]*?is_vegan: (true|false),\n    is_gluten_free: (true|false),\n    tags: \[([^\]]*)\],\n    ingredients: \[([\s\S]*?)\n    \],\n    steps: \[([\s\S]*?)\n    \]\n  \}/g;

const recipes = [...source.matchAll(recipePattern)].map((match) => ({
  id: match[1],
  title: match[2],
  description: match[3],
  isVegan: match[4] === 'true',
  isGlutenFree: match[5] === 'true',
  tags: match[6],
  ingredients: [...match[7].matchAll(/\{ id: "([^"]+)", name_ja: "([^"]+)", quantity: "([^"]+)", is_optional: (true|false)/g)]
    .map(([, id, nameJa, quantity, isOptional]) => ({
      id,
      nameJa,
      quantity,
      isOptional: isOptional === 'true',
    })),
  steps: [...match[8].matchAll(/"([^"]+)"/g)].map(([, step]) => step),
}));

assert.ok(recipes.length > 0, 'MOCK_RECIPES を検査できる形式で定義してください。');

const allergenNamePatterns = {
  'ing-shrimp': /えび|海老|shrimp/i,
  'ing-crab': /かに|蟹|crab/i,
  'ing-wheat': /小麦|wheat/i,
  'ing-buckwheat': /そば|蕎麦|buckwheat/i,
  'ing-egg': /卵|玉子|egg/i,
  'ing-milk': /乳|牛乳|チーズ|バター|ヨーグルト|milk|cheese|butter/i,
  'ing-peanut': /落花生|ピーナッツ|peanut/i,
  'ing-walnut': /くるみ|walnut/i,
  'ing-almond': /アーモンド|almond/i,
  'ing-cashew': /カシューナッツ|cashew/i,
  'ing-sesame': /ごま|胡麻|sesame/i,
  'ing-soybean': /大豆|豆腐|厚揚げ|醤油|たまり|ソイ|soy/i,
  'ing-abalone': /あわび|abalone/i,
  'ing-squid': /いか|squid/i,
  'ing-roe': /いくら|roe/i,
  'ing-salmon': /さけ|鮭|salmon/i,
  'ing-mackerel': /さば|鯖|mackerel/i,
  'ing-beef': /牛肉|beef/i,
  'ing-chicken': /鶏肉|chicken/i,
  'ing-pork': /豚肉|pork/i,
  'ing-orange': /オレンジ|orange/i,
  'ing-kiwi': /キウイ|kiwi/i,
  'ing-banana': /バナナ|banana/i,
  'ing-peach': /もも|桃|peach/i,
  'ing-apple': /りんご|apple/i,
  'ing-matsutake': /まつたけ|matsutake/i,
  'ing-yam': /やまいも|yam/i,
  'ing-gelatin': /ゼラチン|gelatin/i,
};

const animalAllergenIds = new Set([
  'ing-egg',
  'ing-milk',
  'ing-beef',
  'ing-chicken',
  'ing-pork',
  'ing-gelatin',
]);

for (const recipe of recipes) {
  assert.ok(recipe.ingredients.length > 0, `${recipe.id}: ingredients must not be empty.`);

  for (const ingredient of recipe.ingredients) {
    if (!ingredient.id.startsWith('ing-')) continue;

    assert.ok(
      masterIds.has(ingredient.id),
      `${recipe.id}: ${ingredient.id} must exist in INGREDIENT_MASTER or use a none-* id.`,
    );

    assert.match(
      ingredient.nameJa,
      allergenNamePatterns[ingredient.id],
      `${recipe.id}: ${ingredient.nameJa} is tagged as ${ingredient.id}, but the ingredient name does not match that selectable restriction.`,
    );
  }

  if (recipe.isVegan) {
    const animalIngredients = recipe.ingredients.filter((ingredient) => animalAllergenIds.has(ingredient.id));
    assert.deepEqual(
      animalIngredients,
      [],
      `${recipe.id}: vegan recipes must not include animal allergen ingredients, even as optional items, because the UI marks the recipe as vegan-compatible.`,
    );
  }

  if (recipe.isGlutenFree) {
    const wheatIngredients = recipe.ingredients.filter((ingredient) => ingredient.id === 'ing-wheat');
    assert.deepEqual(
      wheatIngredients,
      [],
      `${recipe.id}: gluten-free recipes must not include wheat ingredients.`,
    );

    for (const ingredient of recipe.ingredients) {
      if (ingredient.nameJa.includes('醤油')) {
        assert.match(
          ingredient.nameJa,
          /たまり|グルテンフリー/,
          `${recipe.id}: soy sauce in a gluten-free recipe must be explicitly tamari or gluten-free soy sauce.`,
        );
      }
    }

    for (const text of [recipe.description, ...recipe.steps]) {
      if (/(ブレッド|トースト|食パン|パン粉)/.test(text)) {
        assert.match(
          text,
          /グルテンフリー/,
          `${recipe.id}: bread/toast wording in a gluten-free recipe must be explicitly gluten-free.`,
        );
      }
      if (text.includes('醤油')) {
        assert.match(
          text,
          /たまり|グルテンフリー/,
          `${recipe.id}: soy sauce wording in a gluten-free recipe must be explicitly tamari or gluten-free.`,
        );
      }
    }
  }
}

console.log('mock-data consistency regression checks passed');
