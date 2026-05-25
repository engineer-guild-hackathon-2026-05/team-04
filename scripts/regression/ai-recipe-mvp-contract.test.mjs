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
  ['src/lib/supabase/serviceRole.ts', readIfExists('src/lib/supabase/serviceRole.ts')],
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
const serviceRole = readIfExists('src/lib/supabase/serviceRole.ts');
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
}

for (const [path, source] of srcClientFiles) {
  assert.doesNotMatch(
    source,
    /OPENROUTER_API_KEY|SUPABASE_SERVICE_ROLE_KEY|serviceRole|createServiceRole/i,
    `${path}: client-facing files must not import/read OpenRouter or service-role secrets.`,
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

  const functionMatch = source.match(/create (?:or replace )?function public\.([a-z0-9_]+)/i);
  assert.ok(functionMatch, `${path}: atomic AI recipe insertion must be a Postgres RPC/function.`);
  const functionName = functionMatch[1];
  const escapedFunctionName = functionName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  assert.match(
    source,
    new RegExp(`revoke\\s+(?:all|execute)[\\s\\S]*public\\.${escapedFunctionName}`, 'i'),
    `${path}: AI insert RPC must revoke default PUBLIC execution.`,
  );
  assert.match(
    source,
    new RegExp(`grant\\s+execute[\\s\\S]*public\\.${escapedFunctionName}[\\s\\S]*service_role`, 'i'),
    `${path}: AI insert RPC must grant execute only to service_role.`,
  );
  const unprivilegedGrantLines = source
    .split('\n')
    .filter((line) =>
      new RegExp(`grant\\s+execute\\s+on\\s+function\\s+public\\.${escapedFunctionName}\\s*\\(`, 'i').test(line) &&
      /\b(?:anon|authenticated)\b/i.test(line),
    );
  assert.deepEqual(
    unprivilegedGrantLines,
    [],
    `${path}: AI insert RPC must not grant execute to anon/authenticated.`,
  );
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

if (serviceRole) {
  assert.match(serviceRole, /server-only/, 'service-role Supabase utility must import server-only.');
  assert.match(serviceRole, /SUPABASE_SERVICE_ROLE_KEY/, 'service-role Supabase utility must read SUPABASE_SERVICE_ROLE_KEY.');
  assert.doesNotMatch(serviceRole, /NEXT_PUBLIC_SUPABASE_SERVICE_ROLE/i, 'service-role key must not use NEXT_PUBLIC_.');
}

if (suggestRoute) {
  const route = compact(suggestRoute);
  const authIndex = route.search(/getUser\(|auth\.getUser|isDemoAuthenticated/);
  const openRouterIndex = route.search(/generateRecipesWithOpenRouter\s*\(/);
  const serviceRoleIndex = route.search(/persistAiRecipe\s*\(|createServiceRoleClient\s*\(|rpc\(/);

  assert.notEqual(authIndex, -1, 'suggest route must authenticate before AI or DB work.');
  if (openRouterIndex !== -1) {
    assert.ok(authIndex < openRouterIndex, 'suggest route must return 401 before calling OpenRouter.');
  }
  if (serviceRoleIndex !== -1) {
    assert.ok(authIndex < serviceRoleIndex, 'suggest route must authorize before service-role persistence.');
  }
  assert.match(suggestRoute, /mood/, 'suggest route must validate a mood request field.');
  assert.match(suggestRoute, /restrictedIngredients/, 'suggest route must accept/merge restrictedIngredients.');
  assert.match(suggestRoute, /source:\s*['"]ai['"]/, 'suggest route response must identify source: ai.');
  assert.match(suggestRoute, /apiError\(\s*401|status:\s*401|NextResponse\.json\([\s\S]*401/, 'suggest route must have controlled 401 behavior.');
  assert.match(suggestRoute, /apiError\(\s*400|status:\s*400|NextResponse\.json\([\s\S]*400/, 'suggest route must have controlled 400 validation behavior.');
}

if (substituteRoute) {
  const route = compact(substituteRoute);
  const authIndex = route.search(/getUser\(|auth\.getUser|isDemoAuthenticated/);
  const serviceRoleIndex = route.search(/persistAiRecipe\s*\(|createServiceRoleClient\s*\(|rpc\(/);

  assert.match(
    substituteRoute,
    /[0-9a-f]\{8\}|isUuid|uuid|UUID/i,
    'substitute route must reject non-UUID fallback/mock recipe ids before service-role work.',
  );
  assert.notEqual(authIndex, -1, 'substitute route must authenticate before DB/service-role work.');
  if (serviceRoleIndex !== -1) {
    assert.ok(authIndex < serviceRoleIndex, 'substitute route must authorize before service-role persistence.');
  }
  assert.match(substituteRoute, /parent_recipe_id|parentRecipe/i, 'substitute route must persist parent recipe lineage.');
  assert.match(substituteRoute, /cultural_background|culturalBackground/i, 'substitute route must return cultural background.');
  assert.match(
    substituteRoute,
    /substituted_from_ingredient_id|substitutedFromIngredient/i,
    'substitute route must persist substituted ingredient lineage when available.',
  );
  assert.match(substituteRoute, /apiError\(\s*401|status:\s*401|NextResponse\.json\([\s\S]*401/, 'substitute route must have controlled 401 behavior.');
}

if (apiTypes.includes('RecipeSuggest') || suggestRoute) {
  assert.match(apiTypes, /RecipeSuggestRequest/, 'apiTypes must define RecipeSuggestRequest.');
  assert.match(apiTypes, /RecipeSuggestResponse/, 'apiTypes must define RecipeSuggestResponse.');
  assert.match(apiTypes, /RecipeSubstituteRequest/, 'apiTypes must define RecipeSubstituteRequest.');
  assert.match(apiTypes, /RecipeSubstituteResponse/, 'apiTypes must define RecipeSubstituteResponse.');
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
  assert.match(recipeModal, /ログイン後の保存済みレシピで利用できます/, 'RecipeModal must explain disabled substitute for fallback/mock ids.');
  assert.match(recipeModal, /isUuid|uuid|[0-9a-f]\{8\}/i, 'RecipeModal must guard non-UUID fallback/mock recipe ids.');
  assert.match(recipeModal, /cultural_background|culturalBackground/, 'RecipeModal must render cultural background when present.');
}

console.log('AI recipe MVP ratcheting contract checks passed');
