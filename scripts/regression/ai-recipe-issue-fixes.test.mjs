import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');
const compact = (source) => source.replace(/\s+/g, ' ');

const recipesRoute = read('src/app/api/recipes/route.ts');
const suggestRoute = read('src/app/api/recipes/suggest/route.ts');
const substituteRoute = read('src/app/api/recipes/[id]/substitute/route.ts');
const recipeAi = read('src/lib/recipeAi.ts');
const openRouter = read('src/lib/server/openRouter.ts');
const listView = read('src/app/components/ListView.tsx');
const page = read('src/app/page.tsx');
const recipeModal = read('src/app/components/RecipeModal.tsx');
const globalsCss = read('src/app/globals.css');
const migrationFiles = readdirSync('supabase/migrations').filter((file) => file.endsWith('.sql'));
const aiFieldsMigration = read('supabase/migrations/20260525134400_add_ai_recipe_mvp_fields.sql');
const dropWriteRpcMigration = read('supabase/migrations/20260525143000_drop_ai_recipe_write_rpcs.sql');

const migrationVersions = migrationFiles.map((file) => file.match(/^\d{14}/)?.[0]).filter(Boolean);
assert.equal(
  new Set(migrationVersions).size,
  migrationVersions.length,
  'Supabase migration timestamp prefixes must be unique.',
);
assert.doesNotMatch(
  aiFieldsMigration,
  /create\s+or\s+replace\s+function\s+public\.insert_ai_recipes?_mvp/i,
  'AI MVP field migration must not create temporary privileged AI write RPCs.',
);
assert.doesNotMatch(
  aiFieldsMigration,
  /grant\s+execute\s+on\s+function\s+public\.insert_ai_recipes?_mvp/i,
  'AI MVP field migration must not grant service-role access to AI write RPCs.',
);

assert.doesNotMatch(
  compact(suggestRoute),
  /for\s*\([^)]*generatedRecipe[^)]*\)[\s\S]*persistAiRecipe\s*\(/,
  'suggest route must not persist generated recipes one-by-one inside a loop.',
);
assert.doesNotMatch(
  suggestRoute,
  /persistAiRecipes\s*\(/,
  'suggest route must not persist generated recipes because mood suggestions select existing edible recipes.',
);
assert.match(
  suggestRoute,
  /fetchEdibleRecipeCandidates[\s\S]*includesRestrictedIngredient[\s\S]*violatesDietaryConstraints/,
  'suggest route must filter existing recipe candidates server-side before AI selection.',
);
assert.match(
  suggestRoute,
  /selectRecipeIdsWithOpenRouter\s*\(/,
  'suggest route must ask AI to select recipe ids from filtered candidates instead of generating new recipes.',
);
assert.match(
  suggestRoute,
  /selectedRecipeIds[\s\S]*recipesById[\s\S]*NextResponse\.json\(\{\s*recipes,\s*source:\s*['"]ai['"]/,
  'suggest route must return the selected existing recipes in AI-selected order.',
);
assert.ok(
  !existsSync('src/lib/server/recipePersistence.ts'),
  'AI recipe persistence helper must be removed because AI features must not write trusted recipe data.',
);
assert.ok(
  !existsSync('src/lib/supabase/serviceRole.ts'),
  'Supabase service-role helper must be removed because AI runtime writes are forbidden.',
);
assert.match(
  dropWriteRpcMigration,
  /drop\s+function\s+if\s+exists\s+public\.insert_ai_recipes_mvp\(uuid,\s*jsonb\)/i,
  'follow-up migration must drop the batch AI recipe write RPC.',
);
assert.match(
  dropWriteRpcMigration,
  /drop\s+function\s+if\s+exists\s+public\.insert_ai_recipe_mvp\(uuid,\s*uuid,\s*jsonb,\s*jsonb,\s*jsonb\)/i,
  'follow-up migration must drop the single AI recipe write RPC.',
);
assert.match(
  recipesRoute,
  /ingredients!recipe_ingredients_ingredient_id_fkey/i,
  'recipe list embeds must disambiguate the original ingredient FK after substituted_from_ingredient_id is added.',
);
assert.match(
  substituteRoute,
  /ingredients!recipe_ingredients_ingredient_id_fkey/i,
  'substitute route embeds must disambiguate the original ingredient FK after substituted_from_ingredient_id is added.',
);
assert.match(
  substituteRoute,
  /recipe_ingredients\s*\([\s\S]*display_name_ja[\s\S]*ingredients!recipe_ingredients_ingredient_id_fkey/s,
  'substitute route must select recipe_ingredients.display_name_ja for custom rendered ingredient names.',
);
assert.match(
  substituteRoute,
  /row\.display_name_ja\?\.trim\(\)\s*\|\|\s*row\.ingredients\?\.name_ja\?\.trim\(\)/,
  'substitute route must use display_name_ja before falling back to ingredients.name_ja.',
);
assert.match(
  substituteRoute,
  /FETCH_SUBSTITUTE_CANDIDATE_PAGE_SIZE[\s\S]*fetchSubstituteCandidateIngredients[\s\S]*while \(candidateIngredients\.length < MAX_SUBSTITUTE_CANDIDATES_FOR_AI[\s\S]*\.range\(from, to\)[\s\S]*candidateIngredients\.push\(ingredient\)[\s\S]*candidateIngredients\.length >= MAX_SUBSTITUTE_CANDIDATES_FOR_AI/s,
  'substitute route must page ingredient candidates and filter until enough safe replacements are collected.',
);
assert.doesNotMatch(
  substituteRoute,
  /from\('ingredients'\)[\s\S]*\.limit\(MAX_SUBSTITUTE_CANDIDATES_FOR_AI\)[\s\S]*candidateIngredients/s,
  'substitute route must not cap the ingredient query before applying restriction/diet/preparation filters.',
);
assert.match(
  substituteRoute,
  /selectIngredientSubstitutionsWithOpenRouter\([\s\S]*candidates: candidateIngredients/s,
  'substitute route must still cap replacement candidates before serializing them into the OpenRouter prompt.',
);
assert.match(
  substituteRoute,
  /request\.json\(\)\.catch\(\(\)\s*=>\s*null\)[\s\S]*invalid_json/,
  'substitute route must return controlled 400 invalid_json for malformed JSON bodies.',
);

assert.match(
  recipeAi,
  /diet-vegan[\s\S]*!recipe\.is_vegan[\s\S]*hasSeafood[\s\S]*hasEgg[\s\S]*hasDairy/i,
  'diet-vegan must be enforced after generation, not only prompted.',
);
assert.match(
  recipeAi,
  /diet-lacto-vegetarian[\s\S]*hasMeat[\s\S]*hasSeafood[\s\S]*hasEgg[\s\S]*hasOtherAnimal/i,
  'diet-lacto-vegetarian must deterministically reject meat, seafood, eggs, and other animal products.',
);
assert.match(
  recipeAi,
  /diet-ovo-vegetarian[\s\S]*hasMeat[\s\S]*hasSeafood[\s\S]*hasDairy[\s\S]*hasOtherAnimal/i,
  'diet-ovo-vegetarian must deterministically reject meat, seafood, dairy, and other animal products.',
);
assert.match(
  recipeAi,
  /diet-pescatarian[\s\S]*hasMeat[\s\S]*hasOtherAnimal/i,
  'diet-pescatarian must deterministically reject meat and non-fish animal byproducts.',
);
assert.match(
  recipeAi,
  /normalizeAiRecipeCandidate[\s\S]*filter\(\(recipe\): recipe is AiGeneratedRecipe => Boolean\(recipe\)\)/,
  'AI response validation must keep safe candidates instead of failing the whole request because one candidate is unusable.',
);
assert.match(
  substituteRoute,
  /isDietaryConflictIngredient/,
  'substitute route must filter replacement ingredient candidates by diet before sending them to AI.',
);
assert.match(
  openRouter,
  /気分・要望が日本語以外でも意味を解釈/i,
  'OpenRouter prompt must handle non-Japanese mood input while still returning Japanese recipes.',
);
assert.match(
  openRouter,
  /buildSelectionPrompt[\s\S]*候補レシピはサーバー側で食材制限を除外済み[\s\S]*新しいレシピを作らない/,
  'OpenRouter selection prompt must choose from already-filtered existing recipes without inventing new recipes.',
);
assert.match(
  openRouter,
  /parseSelectedRecipeIds[\s\S]*ids\.length === 0[\s\S]*ids\.length > count[\s\S]*allowedIds\.has/,
  'OpenRouter selection must validate 1〜count existing ids from the provided candidate list.',
);
assert.match(
  openRouter,
  /buildIngredientSubstitutionPrompt[\s\S]*候補食材JSON[\s\S]*新しい食材名や候補外の id を作らない/,
  'OpenRouter ingredient substitution prompt must choose only from existing ingredient catalog candidates.',
);
assert.match(
  openRouter,
  /parseIngredientSubstitutionSelections[\s\S]*resolveOriginalIngredientIndex[\s\S]*allowedIngredientIds\.has/,
  'OpenRouter ingredient substitutions must validate original ingredient indexes/names and existing candidate ids.',
);

assert.doesNotMatch(
  listView,
  /新しいAIレシピを一覧に追加しました/,
  'ListView success copy must not say AI created new recipes when suggestions select existing recipes.',
);
assert.match(
  listView,
  /食材制限に合うレシピから選んでいます。/,
  'ListView loading copy must describe selecting from edible recipes, not generating new recipes.',
);

const substituteCompact = compact(substituteRoute);
const readIndex = substituteCompact.search(/from\('recipes'\)/);
const authzIndex = substituteCompact.search(/isAuthorizedRecipe/);
const aiIndex = substituteCompact.search(/selectIngredientSubstitutionsWithOpenRouter\s*\(/);
const persistIndex = substituteCompact.search(/persistAiRecipe\s*\(|persistAiRecipes\s*\(|createServiceRoleClient\s*\(|rpc\s*\(/i);

assert.match(
  substituteRoute,
  /is_public[\s\S]*created_by/,
  'substitute route must select is_public and created_by for explicit public/owner authorization.',
);
assert.ok(readIndex >= 0, 'substitute route must read the target recipe before authorization.');
assert.ok(authzIndex > readIndex, 'substitute route must explicitly authorize the target recipe after reading it.');
assert.ok(aiIndex === -1 || authzIndex < aiIndex, 'substitute route must authorize before calling OpenRouter.');
assert.equal(persistIndex, -1, 'substitute route must not persist AI output or call service-role/RPC writes.');
assert.match(substituteRoute, /from\('ingredients'\)[\s\S]*select\('ingredient_code, name_ja, name_en, category, dietary_tags'\)/, 'substitute route must load replacement candidates from the existing ingredient catalog.');
assert.match(substituteRoute, /NextResponse\.json\(\{\s*substitutions,\s*source:\s*['"]ai['"]/, 'substitute route must return modal-only substitutions, not a persisted recipe.');

assert.match(
  page,
  /substituteCacheKey[\s\S]*restrictedIngredients[\s\S]*cachedSubstitutions[\s\S]*return[\s\S]*fetch\(`\/api\/recipes\/\$\{recipeId\}\/substitute`/,
  'page must reuse modal substitution cache before calling the AI substitute API again when the recipe and restrictions match.',
);
assert.match(
  page,
  /selectedRecipeIdRef[\s\S]*selectedRecipeIdRef\.current\s*!==\s*recipeId[\s\S]*return[\s\S]*setSubstituteSuggestions\(substitutions\)/,
  'page must ignore stale substitute responses when the selected recipe changed or the modal closed.',
);
assert.match(
  page,
  /setSubstituteCache\(\(currentCache\)\s*=>\s*\(\{\s*\.\.\.currentCache,\s*\[substituteCacheKey\]:\s*substitutions\s*\}\)\)/,
  'page must cache the computed substitution mapping by recipe id and current restrictions.',
);
assert.match(
  page,
  /handleCloseRecipeModal[\s\S]*setSelectedRecipe\(null\)[\s\S]*setSubstituteSuggestions\(\[\]\)[\s\S]*setSubstituteStatus\('idle'\)[\s\S]*onClose=\{handleCloseRecipeModal\}/,
  'closing the modal must reset the visible substituted session so reopening starts from the original recipe.',
);
assert.doesNotMatch(
  page,
  /setSubstituteCache\(\{\}\)|setSubstituteCache\(\(\)/,
  'closing the modal must not clear the per-recipe substitution cache.',
);
assert.doesNotMatch(
  page + recipeModal,
  /setSelectedRecipe\(substitutedRecipe\)|setRecipes\([^)]*substitut|recipe\.ingredients\s*=/i,
  'modal substitution must not mutate the selected recipe object or recipe list.',
);
assert.match(
  recipeModal,
  /getBaseIngredientName[\s\S]*replace\(\s*\/\\s\*\[（\(\]\[\^）\)\]\*\[）\)\]\\s\*\$\/[\s\S]*trim\(\)/,
  'RecipeModal must strip both Japanese and half-width trailing parenthetical ingredient notes.',
);
assert.match(
  recipeModal,
  /renderSubstitutedStepText[\s\S]*substituted-step-highlight/,
  'RecipeModal must rewrite matching instruction text only while substitutions are active.',
);
assert.match(
  recipeModal,
  /substituted-original[\s\S]*substituted-replacement[\s\S]*substitution-badge-tag/s,
  'RecipeModal ingredient list must show original and replacement ingredients with a visible badge.',
);
assert.match(
  globalsCss,
  /\.ingredient-item\.is-substituted[\s\S]*\.substituted-step-highlight[\s\S]*\.modal-substitute-btn[\s\S]*var\(--forest-green\)/,
  'substituted ingredients/steps and the substitute button must use the green theme highlight styles.',
);

console.log('AI recipe issue-fix regression checks passed');
