import assert from 'node:assert/strict';

const FIXED_OPENROUTER_MODEL = 'google/gemini-3.1-flash-lite';
const SUPPORTED_DIET_IDS = new Set([
  'diet-vegan',
  'diet-lacto-vegetarian',
  'diet-ovo-vegetarian',
  'diet-pescatarian',
]);
const KNOWN_RESTRICTED_INGREDIENTS = new Map([
  ['ing-shrimp', ['えび', '海老', 'shrimp']],
  ['ing-crab', ['かに', '蟹', 'crab']],
  ['ing-wheat', ['小麦', 'wheat']],
  ['ing-egg', ['卵', '玉子', 'egg']],
  ['ing-milk', ['乳', '牛乳', 'チーズ', 'バター', 'milk', 'cheese', 'butter']],
  ['ing-pork', ['豚肉', 'ポーク', 'pork']],
]);
const VEGAN_BLOCKLIST = /牛肉|豚肉|鶏肉|肉|魚|えび|海老|かに|蟹|卵|玉子|乳|牛乳|チーズ|バター|ヨーグルト|ゼラチン|beef|pork|chicken|fish|shrimp|crab|egg|milk|cheese|butter|gelatin/i;

const normalizeRestrictionIds = (ids) => {
  if (!Array.isArray(ids)) throw new Error('restrictedIngredients must be an array');
  const uniqueIds = [...new Set(ids)];

  for (const id of uniqueIds) {
    if (typeof id !== 'string') throw new Error('restrictedIngredients must contain strings only');
    if (id.startsWith('ing-') || SUPPORTED_DIET_IDS.has(id)) continue;
    throw new Error(`unsupported restriction id: ${id}`);
  }

  return uniqueIds;
};

const parseOpenRouterJson = (payload) => {
  const content = payload?.choices?.[0]?.message?.content;
  if (typeof content !== 'string') throw new Error('OpenRouter response did not include content');
  try {
    return JSON.parse(content);
  } catch {
    throw new Error('OpenRouter content was not valid JSON');
  }
};

const assertGeneratedRecipeIsSafe = (recipe, restrictedIds) => {
  assert.equal(typeof recipe.title, 'string', 'generated recipe requires a title');
  assert.ok(recipe.title.trim().length > 0 && recipe.title.length <= 80, 'title must be non-empty and capped');
  assert.equal(typeof recipe.description, 'string', 'generated recipe requires a description');
  assert.ok(recipe.description.length <= 240, 'description must be capped');
  assert.ok(Array.isArray(recipe.ingredients), 'generated recipe requires ingredients');
  assert.ok(recipe.ingredients.length >= 1 && recipe.ingredients.length <= 12, 'ingredient count must be capped at 12');
  assert.ok(Array.isArray(recipe.steps), 'generated recipe requires steps');
  assert.ok(recipe.steps.length >= 1 && recipe.steps.length <= 10, 'step count must be capped at 10');

  const ingredientText = recipe.ingredients
    .map((ingredient) => `${ingredient.id ?? ''} ${ingredient.name_ja ?? ''} ${ingredient.name_en ?? ''}`)
    .join('\n');

  for (const restrictedId of restrictedIds) {
    if (!restrictedId.startsWith('ing-')) continue;
    const aliases = KNOWN_RESTRICTED_INGREDIENTS.get(restrictedId) ?? [restrictedId];
    assert.equal(
      aliases.some((alias) => ingredientText.toLowerCase().includes(alias.toLowerCase())),
      false,
      `generated recipe must not include restricted ingredient ${restrictedId}`,
    );
  }

  if (restrictedIds.includes('diet-vegan')) {
    assert.equal(recipe.is_vegan, true, 'diet-vegan must force is_vegan=true');
    assert.doesNotMatch(ingredientText, VEGAN_BLOCKLIST, 'diet-vegan output must not contain obvious animal products');
  }
};

const safeOpenRouterPayload = {
  choices: [{
    message: {
      content: JSON.stringify({
        title: '豆腐と野菜のスパイス丼',
        description: 'えびを使わず、香味野菜と豆腐で満足感を出す一皿です。',
        cuisine: '日本',
        cultural_background: '日本の家庭で手に入りやすい豆腐と旬野菜を使う提案です。',
        is_vegan: true,
        is_gluten_free: true,
        ingredients: [
          { name_ja: '木綿豆腐', quantity: '1丁' },
          { name_ja: 'なす', quantity: '1本' },
          { name_ja: '米', quantity: '2膳分' },
        ],
        steps: ['豆腐の水気を切る', '野菜と炒める', 'ご飯に盛る'],
      }),
    },
  }],
};

const unsafeOpenRouterPayload = {
  choices: [{
    message: {
      content: JSON.stringify({
        title: '海老バターカレー',
        description: '制限食材を含む失敗例です。',
        cuisine: 'インド',
        is_vegan: false,
        is_gluten_free: true,
        ingredients: [
          { name_ja: '海老', quantity: '8尾' },
          { name_ja: 'バター', quantity: '20g' },
        ],
        steps: ['炒める'],
      }),
    },
  }],
};

assert.equal(FIXED_OPENROUTER_MODEL, 'google/gemini-3.1-flash-lite', 'approved OpenRouter model must stay exact.');
assert.deepEqual(
  normalizeRestrictionIds(['ing-shrimp', 'diet-vegan', 'ing-shrimp']),
  ['ing-shrimp', 'diet-vegan'],
  'restriction ids are deduplicated without losing supported diet constraints.',
);
assert.throws(
  () => normalizeRestrictionIds(['ing-shrimp', 'diet-halal']),
  /unsupported restriction id: diet-halal/,
  'MVP validation rejects unsupported diet/religion shortcuts instead of silently prompting with them.',
);
assert.throws(
  () => parseOpenRouterJson({ choices: [{ message: { content: '{bad json' } }] }),
  /not valid JSON/,
  'malformed OpenRouter output must produce a controlled validation failure.',
);

const safeRecipe = parseOpenRouterJson(safeOpenRouterPayload);
assertGeneratedRecipeIsSafe(safeRecipe, normalizeRestrictionIds(['ing-shrimp', 'diet-vegan']));

const unsafeRecipe = parseOpenRouterJson(unsafeOpenRouterPayload);
assert.throws(
  () => assertGeneratedRecipeIsSafe(unsafeRecipe, normalizeRestrictionIds(['ing-shrimp', 'diet-vegan'])),
  /restricted ingredient ing-shrimp|diet-vegan/,
  'post-validation must reject LLM output that includes restricted ingredients or violates diet constraints.',
);

console.log('AI recipe validation mock checks passed');
