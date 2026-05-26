import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const readIfExists = (path) => (existsSync(path) ? readFileSync(path, 'utf8') : '');
const listFiles = (dir) => (existsSync(dir) ? readdirSync(dir).map((file) => join(dir, file)) : []);
const compact = (source) => source.replace(/\s+/g, ' ');

const envExample = readIfExists('.env.local.example');
const srcClientFiles = [
  'src/app/page.tsx',
  'src/app/components/ListView.tsx',
  'src/app/components/RecipeModal.tsx',
].map((path) => [path, readIfExists(path)]);
const sourceFiles = [
  ...srcClientFiles,
  ['src/lib/apiTypes.ts', readIfExists('src/lib/apiTypes.ts')],
  ['src/lib/recipeMapping.ts', readIfExists('src/lib/recipeMapping.ts')],
  ['src/lib/mockData.ts', readIfExists('src/lib/mockData.ts')],
  ['src/lib/openRouter.ts', readIfExists('src/lib/openRouter.ts')],
  ['src/lib/server/openRouter.ts', readIfExists('src/lib/server/openRouter.ts')],
  ['src/lib/recipeAiValidation.ts', readIfExists('src/lib/recipeAiValidation.ts')],
  ['src/app/api/recipes/suggest/route.ts', readIfExists('src/app/api/recipes/suggest/route.ts')],
  ['src/app/api/recipes/[id]/substitute/route.ts', readIfExists('src/app/api/recipes/[id]/substitute/route.ts')],
];

const migrationFiles = listFiles('supabase/migrations').filter((path) => path.endsWith('.sql'));
const migrationSources = migrationFiles.map((path) => [path, readIfExists(path)]);
const aiMigration = migrationSources.find(([, source]) =>
  /parent_recipe_id|cultural_background|substituted_from_ingredient_id|insert_ai_recipe/i.test(source),
);
const suggestRoute = readIfExists('src/app/api/recipes/suggest/route.ts');
const substituteRoute = readIfExists('src/app/api/recipes/[id]/substitute/route.ts');
const listView = readIfExists('src/app/components/ListView.tsx');
const recipeModal = readIfExists('src/app/components/RecipeModal.tsx');
const apiTypes = readIfExists('src/lib/apiTypes.ts');
const recipeMapping = readIfExists('src/lib/recipeMapping.ts');
const mockData = readIfExists('src/lib/mockData.ts');
const openRouter =
  readIfExists('src/lib/openRouter.ts') || readIfExists('src/lib/server/openRouter.ts');

const hasAiArtifacts = Boolean(
  aiMigration ||
    suggestRoute ||
    substituteRoute ||
    openRouter ||
    /OPENROUTER_API_KEY|OPENROUTER_MODEL/.test(envExample),
);

for (const [path, source] of sourceFiles) {
  assert.doesNotMatch(
    source,
    /NEXT_PUBLIC_OPENROUTER/i,
    `${path}: OpenRouter secrets must never use a NEXT_PUBLIC_ client-visible env var.`,
  );
  if (path === 'src/lib/supabase/config.ts') {
    assert.doesNotMatch(
      source,
      /SUPABASE_SERVICE_ROLE_KEY/,
      `${path}: use current Supabase secret API key variable, not the legacy service-role key name.`,
    );
  } else {
    assert.doesNotMatch(
      source,
      /NEXT_PUBLIC_SUPABASE_ANON_KEY|SUPABASE_SERVICE_ROLE_KEY/,
      `${path}: use current Supabase publishable/secret API key variables, not legacy key names.`,
    );
  }
}

for (const [path, source] of srcClientFiles) {
  assert.doesNotMatch(
    source,
    /OPENROUTER_API_KEY|SUPABASE_SECRET_KEY|serviceRole|createServiceRole/i,
    `${path}: client-facing files must not import/read OpenRouter or secret keys.`,
  );
}

if (hasAiArtifacts) {
  assert.match(
    envExample,
    /OPENROUTER_API_KEY=/,
    '.env.local.example must document the server-only OPENROUTER_API_KEY once AI routes/utilities are present.',
  );
  assert.match(
    envExample,
    /OPENROUTER_MODEL=google\/gemini-3\.1-flash-lite/,
    '.env.local.example must pin OPENROUTER_MODEL to google/gemini-3.1-flash-lite.',
  );
  assert.doesNotMatch(
    envExample,
    /NEXT_PUBLIC_OPENROUTER/i,
    '.env.local.example must not expose OpenRouter config through NEXT_PUBLIC_* variables.',
  );
}

if (aiMigration) {
  const [path, source] = aiMigration;
  assert.match(source, /alter table public\.recipes[\s\S]*parent_recipe_id/i, `${path}: recipes.parent_recipe_id is required.`);
  assert.match(source, /alter table public\.recipes[\s\S]*cultural_background/i, `${path}: recipes.cultural_background is required.`);
  assert.match(
    source,
    /alter table public\.recipe_ingredients[\s\S]*substituted_from_ingredient_id/i,
    `${path}: recipe_ingredients.substituted_from_ingredient_id is required.`,
  );
  assert.match(source, /references public\.recipes\(id\) on delete set null/i, `${path}: parent recipe lineage must be nullable on delete.`);
  assert.match(source, /references public\.ingredients\(id\) on delete set null/i, `${path}: substituted ingredient lineage must point to ingredients.`);
  assert.doesNotMatch(
    source,
    /create table (?!if not exists )?public\.(?:recipe_reviews|recipe_likes|user_actions|recipe_shares|social|notifications)/i,
    `${path}: non-MVP social/action tables are out of scope.`,
  );

  const dropRpcMigration = migrationSources.find(([, migrationSource]) =>
    /drop\s+function\s+if\s+exists\s+public\.insert_ai_recipes_mvp/i.test(migrationSource) &&
    /drop\s+function\s+if\s+exists\s+public\.insert_ai_recipe_mvp/i.test(migrationSource),
  );
  assert.ok(dropRpcMigration, 'AI recipe write RPCs must be dropped after removing DB-mutating AI runtime behavior.');

}

if (openRouter) {
  assert.match(openRouter, /google\/gemini-3\.1-flash-lite/, 'OpenRouter utility must hard-pin google/gemini-3.1-flash-lite.');
  assert.match(openRouter, /OPENROUTER_API_KEY/, 'OpenRouter utility must read OPENROUTER_API_KEY server-side.');
  assert.doesNotMatch(openRouter, /NEXT_PUBLIC_OPENROUTER/i, 'OpenRouter utility must not read client-visible env vars.');
  assert.match(
    openRouter,
    /response_format|json_schema|structured_outputs|application\/json/i,
    'OpenRouter utility must request JSON/structured output and still validate afterward.',
  );
}

assert.doesNotMatch(envExample + openRouter + substituteRoute + suggestRoute, /SUPABASE_SECRET_KEY|createServiceRoleClient|persistAiRecipe|persistAiRecipes/i, 'AI routes must not keep Supabase secret-key or AI persistence paths.');

if (suggestRoute) {
  const route = compact(suggestRoute);
  const authIndex = route.search(/getUser\(|auth\.getUser|isDemoAuthenticated|getRecipeRouteUser/);
  const openRouterIndex = route.search(/selectRecipeIdsWithOpenRouter\s*\(/);
  const serviceRoleIndex = route.search(/persistAiRecipe\s*\(|createServiceRoleClient\s*\(|rpc\(/);

  assert.notEqual(authIndex, -1, 'suggest route must authenticate before AI or DB work.');
  if (openRouterIndex !== -1) {
    assert.ok(authIndex < openRouterIndex, 'suggest route must return 401 before calling OpenRouter.');
  }
  if (serviceRoleIndex !== -1) {
    assert.ok(authIndex < serviceRoleIndex, 'suggest route must authorize before secret-key persistence.');
  }
  assert.match(suggestRoute, /mood/, 'suggest route must validate a mood request field.');
  assert.match(suggestRoute, /restrictedIngredients/, 'suggest route must accept/merge restrictedIngredients.');
  assert.match(suggestRoute, /source:\s*['"]ai['"]/, 'suggest route response must identify source: ai.');
  assert.match(suggestRoute, /apiError\(\s*401|status:\s*401|NextResponse\.json\([\s\S]*401/, 'suggest route must have controlled 401 behavior.');
  assert.match(suggestRoute, /apiError\(\s*400|status:\s*400|NextResponse\.json\([\s\S]*400/, 'suggest route must have controlled 400 validation behavior.');
}

if (substituteRoute) {
  const route = compact(substituteRoute);
  const authIndex = route.search(/getUser\(|auth\.getUser|isDemoAuthenticated|getRecipeRouteUser/);
  const openRouterIndex = route.search(/selectIngredientSubstitutionsWithOpenRouter\s*\(/);
  const serviceRoleIndex = route.search(/persistAiRecipe\s*\(|persistAiRecipes\s*\(|createServiceRoleClient\s*\(|rpc\(/);

  assert.match(
    substituteRoute,
    /[0-9a-f]\{8\}|isUuid|uuid|UUID/i,
    'substitute route must reject non-UUID fallback/mock recipe ids before AI work.',
  );
  assert.notEqual(authIndex, -1, 'substitute route must authenticate before DB/AI work.');
  assert.ok(openRouterIndex === -1 || authIndex < openRouterIndex, 'substitute route must authorize before calling OpenRouter.');
  assert.equal(serviceRoleIndex, -1, 'substitute route must never use service-role, RPC, or persistence writes.');
  assert.match(substituteRoute, /from\('ingredients'\)/, 'substitute route must choose replacement candidates from the existing ingredient DB.');
  assert.match(substituteRoute, /substituteIngredient/, 'substitute route must return substitute ingredient data for modal display.');
  assert.match(substituteRoute, /apiError\(\s*401|status:\s*401|NextResponse\.json\([\s\S]*401/, 'substitute route must have controlled 401 behavior.');
}

if (apiTypes.includes('RecipeSuggest') || suggestRoute) {
  assert.match(apiTypes, /RecipeSuggestRequest/, 'apiTypes must define RecipeSuggestRequest.');
  assert.match(apiTypes, /RecipeSuggestResponse/, 'apiTypes must define RecipeSuggestResponse.');
  assert.match(apiTypes, /RecipeSubstituteRequest/, 'apiTypes must define RecipeSubstituteRequest.');
  assert.match(apiTypes, /RecipeSubstituteResponse/, 'apiTypes must define RecipeSubstituteResponse.');
  assert.match(apiTypes, /IngredientSubstitution/, 'apiTypes must define modal-only IngredientSubstitution.');
  assert.match(apiTypes, /ApiErrorResponse/, 'apiTypes must define controlled ApiErrorResponse.');
}

if (/cultural_background|parent_recipe_id/.test(recipeMapping + mockData)) {
  assert.match(mockData, /cultural_background\??|culturalBackground\??/, 'Recipe type must expose optional cultural background.');
  assert.match(mockData, /parent_recipe_id\??|parentRecipeId\??/, 'Recipe type must expose optional parent recipe id.');
  assert.match(recipeMapping, /cultural_background|culturalBackground/, 'DB mapper must read cultural background.');
  assert.match(recipeMapping, /parent_recipe_id|parentRecipeId/, 'DB mapper must read parent recipe id.');
}

if (/onSuggestRecipes|suggestion|ムード|気分/.test(listView) || suggestRoute) {
  assert.match(listView, /onSuggestRecipes|handleSuggest/i, 'ListView must receive or invoke a suggest callback.');
  assert.match(listView, /気分|ムード|食べたい|AI|提案/, 'ListView mood chat must use Japanese UI copy.');
  assert.match(listView, /aria-label|<label/i, 'ListView mood chat must expose an accessible label.');
  assert.match(listView, /loading|isSuggesting|disabled/i, 'ListView mood chat must prevent duplicate submissions while loading.');
}

if (/onSubstituteRecipe|substitute|再提案|日本の食材/.test(recipeModal) || substituteRoute) {
  assert.match(recipeModal, /onSubstituteRecipe|handleSubstitute/i, 'RecipeModal must receive or invoke a substitute callback.');
  assert.match(recipeModal, /日本の食材で再提案/, 'RecipeModal substitute action must use approved Japanese copy.');
  assert.doesNotMatch(
    recipeModal + substituteRoute,
    /ログイン後の保存済みレシピで利用できます/,
    'RecipeModal/substitute route must not show login-after-copy because recipes are not visible before login.',
  );
  assert.match(recipeModal, /isUuid|uuid|[0-9a-f]\{8\}/i, 'RecipeModal must guard non-UUID fallback/mock recipe ids.');
  assert.match(recipeModal, /substituteSuggestions/, 'RecipeModal must render modal-only ingredient substitutions.');
  assert.doesNotMatch(recipeModal, /setSelectedRecipe\(substitutedRecipe\)|レシピに更新しました/, 'RecipeModal/page copy must not imply persisted recipe replacement.');
}

console.log('AI recipe MVP ratcheting contract checks passed');
