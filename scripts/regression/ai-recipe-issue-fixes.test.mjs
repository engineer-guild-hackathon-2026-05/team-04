import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');
const compact = (source) => source.replace(/\s+/g, ' ');

const recipesRoute = read('src/app/api/recipes/route.ts');
const suggestRoute = read('src/app/api/recipes/suggest/route.ts');
const substituteRoute = read('src/app/api/recipes/[id]/substitute/route.ts');
const persistence = read('src/lib/server/recipePersistence.ts');
const recipeAi = read('src/lib/recipeAi.ts');
const openRouter = read('src/lib/server/openRouter.ts');
const listView = read('src/app/components/ListView.tsx');
const migration = read('supabase/migrations/20260525134500_add_ai_recipe_mvp_fields.sql');

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
assert.match(
  persistence,
  /rpc\(\s*['"]insert_ai_recipes_mvp['"]/,
  'persistence layer must call the batch RPC for AI recipe writes.',
);
assert.match(
  migration,
  /create\s+or\s+replace\s+function\s+public\.insert_ai_recipes_mvp\s*\(\s*p_user_id\s+uuid,\s*p_recipes\s+jsonb\s*\)/i,
  'migration must define a batch AI recipe insert RPC.',
);
assert.match(
  migration,
  /for\s+v_item\s+in\s+select\s+\*\s+from\s+jsonb_array_elements\(p_recipes\)/i,
  'batch RPC must iterate over the submitted recipe array inside one Postgres function transaction.',
);
assert.match(
  migration,
  /select\s+public\.insert_ai_recipe_mvp\(/i,
  'batch RPC must reuse the single-recipe insert routine so recipe, ingredients, and substitutions share one rollback boundary.',
);
assert.match(
  migration,
  /revoke\s+all\s+on\s+function\s+public\.insert_ai_recipes_mvp\(uuid,\s*jsonb\)\s+from\s+public/i,
  'batch RPC must revoke default PUBLIC execute privileges.',
);
assert.match(
  migration,
  /grant\s+execute\s+on\s+function\s+public\.insert_ai_recipes_mvp\(uuid,\s*jsonb\)\s+to\s+service_role/i,
  'batch RPC must grant execute only to service_role.',
);
assert.doesNotMatch(
  migration,
  /grant\s+execute\s+on\s+function\s+public\.insert_ai_recipes_mvp\(uuid,\s*jsonb\)\s+to\s+(?:anon|authenticated)/i,
  'batch RPC must not be executable by anon/authenticated roles.',
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
  openRouter,
  /ラクト・ベジタリアン[\s\S]*オボ・ベジタリアン[\s\S]*ペスカタリアン/,
  'OpenRouter prompt facts must describe every accepted diet constraint in Japanese instead of sending opaque ids only.',
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
  /parseSelectedRecipeIds[\s\S]*uniqueIds\.length !== count[\s\S]*allowedIds\.has/,
  'OpenRouter selection must validate exactly three unique ids from the provided candidate list.',
);
assert.match(
  openRouter,
  /requestRecipesFromOpenRouter[\s\S]*catch[\s\S]*OpenRouterResponseError[\s\S]*requestRecipesFromOpenRouter\(input,\s*error\.message\)/,
  'OpenRouter recipe generation must retry once when the first AI response fails validation.',
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
const aiIndex = substituteCompact.search(/generateRecipesWithOpenRouter\s*\(/);
const persistIndex = substituteCompact.search(/persistAiRecipe\s*\(/);

assert.match(
  substituteRoute,
  /is_public[\s\S]*created_by/,
  'substitute route must select is_public and created_by for explicit public/owner authorization.',
);
assert.ok(readIndex >= 0, 'substitute route must read the target recipe before authorization.');
assert.ok(authzIndex > readIndex, 'substitute route must explicitly authorize the target recipe after reading it.');
assert.ok(aiIndex === -1 || authzIndex < aiIndex, 'substitute route must authorize before calling OpenRouter.');
assert.ok(persistIndex === -1 || authzIndex < persistIndex, 'substitute route must authorize before service-role persistence.');

console.log('AI recipe issue-fix regression checks passed');
