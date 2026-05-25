import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync('src/lib/mockData.ts', 'utf8');

const masterEntries = [...source.matchAll(/\{ id: "(ing-[^"]+)", name_ja: "([^"]+)", name_en: "[^"]+", category: "([^"]+)"(?:, dietary_tags: \[[^\]]*\])? \}/g)]
  .map(([, id, nameJa, category]) => ({ id, nameJa, category }));

const masterIds = new Set(masterEntries.map(({ id }) => id));

const recipePattern = /\{\n    id: "(rec-[^"]+)",[\s\S]*?title: "([^"]+)",[\s\S]*?description: "([^"]+)",[\s\S]*?is_vegan: (true|false),\n    is_gluten_free: (true|false),\n    tags: \[([^\]]*)\],\n    ingredients: \[([\s\S]*?)\n    \],\n    (?:culture_sections: \[[\s\S]*?\],\n    )?steps: \[([\s\S]*?)\n    \]\n  \}/g;

const recipes = [...source.matchAll(recipePattern)].map((match) => ({
  id: match[1],
  title: match[2],
  description: match[3],
  isVegan: match[4] === 'true',
  isGlutenFree: match[5] === 'true',
  tags: [...match[6].matchAll(/"([^"]+)"/g)].map(([, tag]) => tag),
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

const declaredRecipeIds = [...source.matchAll(/id: "(rec-[^"]+)"/g)].map(([, id]) => id).sort();
const parsedRecipeIds = recipes.map((recipe) => recipe.id).sort();
assert.deepEqual(
  parsedRecipeIds,
  declaredRecipeIds,
  'MOCK_RECIPES 内の全レシピを regression test が検査できる形式で定義してください。',
);

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
  'ing-pistachio': /ピスタチオ|pistachio/i,
  'ing-macadamia': /マカダミアナッツ|マカデミアナッツ|macadamia/i,
  'ing-yam': /やまいも|yam/i,
  'ing-gelatin': /ゼラチン|gelatin/i,
};

const isKnownNonDairyButter = (ingredientName) => /ピーナッツバター|peanut butter/i.test(ingredientName);
const detectAllergenIds = (ingredientName) => Object.entries(allergenNamePatterns)
  .filter(([id, pattern]) => pattern.test(ingredientName) && !(id === 'ing-milk' && isKnownNonDairyButter(ingredientName)))
  .map(([id]) => id);

const glutenRiskPattern = /小麦粉|薄力粉|強力粉|中力粉|全粒粉|パン粉|麩|セイタン|大麦|ライ麦|麦芽|ルウ|通常の醤油|醤油/;
const glutenSafeContextPattern = /グルテンフリー|たまり|小麦不使用|小麦粉[^。、]*使わず|小麦[^。、]*含まない|小麦[^。、]*不使用/;

const animalDerivedCategories = new Set(['甲殻類', '魚介類', '肉類', '卵・乳']);
const animalDerivedIngredientIds = new Set(
  masterEntries
    .filter(({ category }) => animalDerivedCategories.has(category))
    .map(({ id }) => id),
);

// ゼラチンはカテゴリ上は「その他」だが動物由来のため、vegan 検証では明示的に含める。
if (masterIds.has('ing-gelatin')) animalDerivedIngredientIds.add('ing-gelatin');

assert.ok(
  animalDerivedIngredientIds.has('ing-shrimp') &&
    animalDerivedIngredientIds.has('ing-crab') &&
    animalDerivedIngredientIds.has('ing-salmon'),
  'vegan 検証では甲殻類・魚介類も動物性食材として扱ってください。',
);
assert.ok(
  animalDerivedIngredientIds.has('ing-egg') &&
    animalDerivedIngredientIds.has('ing-milk') &&
    animalDerivedIngredientIds.has('ing-beef') &&
    animalDerivedIngredientIds.has('ing-gelatin'),
  'vegan 検証では卵・乳・肉類・ゼラチンも動物性食材として扱ってください。',
);
assert.ok(
  !animalDerivedIngredientIds.has('ing-soybean'),
  'vegan 検証では植物性の大豆を動物性食材として扱わないでください。',
);

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

  for (const ingredient of recipe.ingredients) {
    const detectedAllergenIds = detectAllergenIds(ingredient.nameJa);
    if (detectedAllergenIds.length === 0) continue;

    assert.ok(
      detectedAllergenIds.includes(ingredient.id),
      `${recipe.id}: ${ingredient.nameJa} looks like ${detectedAllergenIds.join('/')} but is tagged as ${ingredient.id}. Use the matching ing-* id instead of hiding a selectable allergen behind none-*.`,
    );
  }

  const hasVeganTag = recipe.tags.some((tag) => /ヴィーガン|ビーガン/.test(tag));
  const hasGlutenFreeTag = recipe.tags.some((tag) => /グルテンフリー/.test(tag));

  if (recipe.isVegan) {
    assert.ok(hasVeganTag, `${recipe.id}: vegan recipes must include a vegan tag so list chips match modal badges.`);
    const animalIngredients = recipe.ingredients.filter((ingredient) => {
      const detectedAllergenIds = detectAllergenIds(ingredient.nameJa);
      return animalDerivedIngredientIds.has(ingredient.id) ||
        detectedAllergenIds.some((id) => animalDerivedIngredientIds.has(id));
    });
    assert.deepEqual(
      animalIngredients,
      [],
      `${recipe.id}: vegan recipes must not include animal allergen ingredients, even as optional items, because the UI marks the recipe as vegan-compatible.`,
    );
  } else {
    assert.ok(!hasVeganTag, `${recipe.id}: non-vegan recipes must not include a vegan tag.`);
  }

  if (recipe.isGlutenFree) {
    assert.ok(hasGlutenFreeTag, `${recipe.id}: gluten-free recipes must include a gluten-free tag so list chips match modal badges.`);
    const wheatIngredients = recipe.ingredients.filter((ingredient) => ingredient.id === 'ing-wheat');
    assert.deepEqual(
      wheatIngredients,
      [],
      `${recipe.id}: gluten-free recipes must not include wheat ingredients.`,
    );

    for (const ingredient of recipe.ingredients) {
      if (glutenRiskPattern.test(ingredient.nameJa)) {
        assert.match(
          ingredient.nameJa,
          glutenSafeContextPattern,
          `${recipe.id}: gluten-free ingredient wording must avoid gluten-bearing terms unless explicitly marked as gluten-free/safe.`,
        );
      }

      if (ingredient.nameJa.includes('醤油')) {
        assert.match(
          ingredient.nameJa,
          /たまり|グルテンフリー/,
          `${recipe.id}: soy sauce in a gluten-free recipe must be explicitly tamari or gluten-free soy sauce.`,
        );
      }
    }

    for (const text of [recipe.description, ...recipe.steps]) {
      if (glutenRiskPattern.test(text)) {
        assert.match(
          text,
          glutenSafeContextPattern,
          `${recipe.id}: gluten-free text must avoid gluten-bearing terms unless explicitly marked as gluten-free/safe.`,
        );
      }
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
  } else {
    assert.ok(!hasGlutenFreeTag, `${recipe.id}: gluten-containing recipes must not include a gluten-free tag.`);
  }

  if (recipe.tags.some((tag) => tag.includes('9大アレルギーフリー'))) {
    const majorAllergenIds = new Set([
      'ing-shrimp',
      'ing-cashew',
      'ing-crab',
      'ing-wheat',
      'ing-buckwheat',
      'ing-egg',
      'ing-milk',
      'ing-peanut',
      'ing-walnut',
    ]);
    const majorAllergenIngredients = recipe.ingredients.filter((ingredient) =>
      majorAllergenIds.has(ingredient.id) ||
      detectAllergenIds(ingredient.nameJa).some((id) => majorAllergenIds.has(id)),
    );
    assert.deepEqual(
      majorAllergenIngredients,
      [],
      `${recipe.id}: recipes tagged 9大アレルギーフリー must not include any of the 9 mandatory allergens.`,
    );
  }
}

console.log('mock-data consistency regression checks passed');
