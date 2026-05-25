import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');
const compact = (source) => source.replace(/\s+/g, ' ');

const middleware = read('src/middleware.ts');
const recipeModal = read('src/app/components/RecipeModal.tsx');
const recipeAi = read('src/lib/recipeAi.ts');
const routeUtils = read('src/lib/server/recipeRouteUtils.ts');
const suggestRoute = read('src/app/api/recipes/suggest/route.ts');
const substituteRoute = read('src/app/api/recipes/[id]/substitute/route.ts');

assert.match(
  middleware,
  /matcher:[\s\S]*\(\?!api\|_next\/static\|_next\/image/,
  'middleware matcher must exclude /api so API route auth checks are not duplicated by middleware.',
);

assert.match(
  recipeModal,
  /primaryRecipeTag[\s\S]*未分類[\s\S]*カテゴリ:[\s\S]*primaryRecipeTag/,
  'RecipeModal must render a Japanese fallback category instead of recipe.tags[0] when tags are empty.',
);
assert.doesNotMatch(
  recipeModal,
  /カテゴリ:[\s\S]*recipe\.tags\[0\]/,
  'RecipeModal must not render recipe.tags[0] directly.',
);

assert.match(
  routeUtils,
  /readRestrictionFactsByCodes[\s\S]*\.in\('ingredient_code',\s*codes\)/,
  'AI routes must resolve client ing-* restriction codes against the DB ingredient table.',
);
assert.doesNotMatch(
  routeUtils,
  /validateKnownRestrictionCodes\(/,
  'AI route restriction parsing must not reject valid DB-only ingredient codes using the static mock master list.',
);
assert.match(
  routeUtils,
  /getRecipeRouteUser[\s\S]*hasDemoAuthCookie/,
  'AI routes must accept demo-cookie authentication through a shared helper after Supabase user lookup.',
);

assert.match(
  recipeAi,
  /RESTRICTION_ALIASES[\s\S]*ing-shrimp[\s\S]*海老/,
  'restriction matching must include known Japanese aliases such as 海老 for shrimp.',
);
assert.match(
  recipeAi,
  /textMatchesToken[\s\S]*\\p\{L\}[\s\S]*includesRestrictedIngredientText/s,
  'restriction matching must use token-aware Latin boundaries instead of raw substring matching.',
);
assert.match(
  recipeAi,
  /ANIMAL_INGREDIENT_PATTERNS[\s\S]*fish sauce[\s\S]*lard/is,
  'dietary filtering must block obvious animal products even when DB dietary_tags are missing.',
);
assert.match(
  recipeAi,
  /isDietaryConflictIngredient[\s\S]*ANIMAL_INGREDIENT_PATTERNS\.(?:meat|seafood|egg|dairy|otherAnimalProduct)/s,
  'dietary conflict detection must consult the shared animal ingredient patterns.',
);
assert.match(
  recipeAi,
  /normalizeIngredientKey[\s\S]*nameEn[\s\S]*seen\.has\(key\)/,
  'AI generated ingredients must deduplicate by normalized English name to match DB uniqueness semantics.',
);
assert.match(
  recipeAi,
  /canonicalIngredientForAiIngredient[\s\S]*INGREDIENT_MASTER[\s\S]*canonicalIngredientIdForAiIngredient[\s\S]*aiRecipeToRecipe/s,
  'immediate AI recipe payloads must map known generated ingredients back to canonical ing-* IDs.',
);

for (const [path, source] of [
  ['src/app/api/recipes/suggest/route.ts', suggestRoute],
  ['src/app/api/recipes/[id]/substitute/route.ts', substituteRoute],
]) {
  assert.match(
    source,
    /includesRestrictedIngredientText/,
    `${path} must use shared token-aware restriction matching.`,
  );
  assert.doesNotMatch(
    compact(source),
    /haystack\.includes\(name\.toLowerCase\(\)\)/,
    `${path} must not use raw substring matching for restrictions.`,
  );
  assert.match(
    source,
    /getRecipeRouteUser/,
    `${path} must share Supabase/demo authentication behavior.`,
  );
}

assert.match(
  suggestRoute,
  /MAX_RECIPE_CANDIDATES_FOR_AI[\s\S]*\.slice\(0,\s*MAX_RECIPE_CANDIDATES_FOR_AI\)/,
  'suggest route must cap filtered candidates before serializing them into the OpenRouter prompt.',
);
assert.match(
  suggestRoute,
  /display_name_ja[\s\S]*preparation_tags[\s\S]*category[\s\S]*is_allergen[\s\S]*dietary_tags/s,
  'suggest route must select full ingredient metadata before mapping candidates to Recipe objects.',
);
assert.match(
  substituteRoute,
  /isDietaryConflictIngredient/,
  'substitute route must filter candidate ingredients with shared tag + name-based diet conflict detection.',
);

console.log('PR22 unresolved review regression checks passed');
