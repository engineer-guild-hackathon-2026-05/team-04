import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');
const compact = (source) => source.replace(/\s+/g, ' ');

const suggestRoute = read('src/app/api/recipes/suggest/route.ts');
const substituteRoute = read('src/app/api/recipes/[id]/substitute/route.ts');
const persistence = read('src/lib/server/recipePersistence.ts');
const recipeAi = read('src/lib/recipeAi.ts');
const openRouter = read('src/lib/server/openRouter.ts');
const migration = read('supabase/migrations/20260525090000_add_ai_recipe_mvp_fields.sql');

assert.match(
  suggestRoute,
  /persistAiRecipes\s*\(/,
  'suggest route must persist generated recipes through one batch call to avoid request-level partial success.',
);
assert.doesNotMatch(
  compact(suggestRoute),
  /for\s*\([^)]*generatedRecipe[^)]*\)[\s\S]*persistAiRecipe\s*\(/,
  'suggest route must not persist generated recipes one-by-one inside a loop.',
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
  openRouter,
  /ラクト・ベジタリアン[\s\S]*オボ・ベジタリアン[\s\S]*ペスカタリアン/,
  'OpenRouter prompt facts must describe every accepted diet constraint in Japanese instead of sending opaque ids only.',
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
