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
const page = read('src/app/page.tsx');
const frontendDocs = read('docs/frontend.md');
const databaseDocs = read('docs/database.md');
const authDocs = read('docs/auth.md');

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
  /edibleCandidates\.length\s*<\s*MAX_RECIPE_CANDIDATES_FOR_AI[\s\S]*edibleCandidates\.length\s*>=\s*MAX_RECIPE_CANDIDATES_FOR_AI/,
  'suggest route must cap filtered candidates before serializing them into the OpenRouter prompt.',
);
assert.match(
  suggestRoute,
  /FETCH_RECIPE_CANDIDATE_PAGE_SIZE[\s\S]*edibleCandidates\.length\s*<\s*MAX_RECIPE_CANDIDATES_FOR_AI[\s\S]*\.range\(/s,
  'suggest route must page recipe candidates and filter until enough edible recipes are collected instead of limiting before filtering.',
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

assert.match(
  recipeAi,
  /isPreparationRestrictionId[\s\S]*preparationRestrictions\.add\(item\)/,
  'AI restriction parsing must accept supported prep-* preparation restriction IDs instead of returning invalid_restricted_ingredients.',
);
assert.match(
  routeUtils,
  /preparationRestrictions:\s*parsed\.preparationRestrictions/,
  'AI route restriction context must preserve parsed prep-* restrictions for downstream route behavior.',
);
assert.match(
  suggestRoute,
  /violatesPreparationRestrictions[\s\S]*preparationRestrictions/,
  'AI recipe suggestions must filter candidates with selected prep-* restrictions before prompting OpenRouter.',
);

assert.doesNotMatch(
  page,
  /if\s*\(status\s*===\s*404\)\s*return\s+LOGIN_REQUIRED_RECIPE_MESSAGE/,
  'AI recipe 404 errors must not be replaced with a generic login-required message.',
);
assert.match(
  page,
  /rawMessage[\s\S]*status\s*===\s*404[\s\S]*fallback/,
  'AI recipe 404 errors must prefer the server-provided error/message body before falling back.',
);

for (const [path, source] of [
  ['docs/frontend.md', frontendDocs],
  ['docs/database.md', databaseDocs],
  ['docs/auth.md', authDocs],
]) {
  assert.doesNotMatch(
    source,
    /SUPABASE_SECRET_KEY/,
    `${path} must not require Supabase secret-key setup for the current read-only AI MVP.`,
  );
}
assert.doesNotMatch(
  frontendDocs + databaseDocs,
  /AI\/API由来レシピをDBへ保存する処理だけ|AIレシピ生成・保存|source_type = 'ai'` および `'api'` のレシピはサーバーサイド（Next\.js API Route）からservice roleキーを使って書き込む/,
  'docs must not claim current AI/API recipe persistence uses service role.',
);
assert.match(
  frontendDocs + databaseDocs + authDocs,
  /AI提案\/代替APIは読み取り専用|service role clientを使わない|Supabase secret\/service-role keyは不要/,
  'docs must state the current AI MVP is read-only and does not require Supabase service-role setup.',
);

console.log('PR22 unresolved review regression checks passed');
