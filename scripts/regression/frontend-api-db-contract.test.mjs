import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const appPageSource = readFileSync('src/app/page.tsx', 'utf8');
const recipeModalSource = readFileSync('src/app/components/RecipeModal.tsx', 'utf8');
const mockDataSource = readFileSync('src/lib/mockData.ts', 'utf8');

const migrationSources = readdirSync('supabase/migrations')
  .filter((file) => file.endsWith('.sql'))
  .map((file) => readFileSync(join('supabase/migrations', file), 'utf8'))
  .join('\n');

assert.match(
  appPageSource,
  /fetch\(\s*['"]\/api\/me\/profile['"]/,
  'src/app/page.tsx はログインユーザーのプロフィール/制限食材同期に /api/me/profile を使ってください。',
);

for (const tableName of ['profiles', 'user_restricted_ingredients', 'ingredients']) {
  assert.doesNotMatch(
    appPageSource,
    new RegExp(`\\.from\\(\\s*['"]${tableName}['"]`),
    `src/app/page.tsx から ${tableName} を直接 Supabase で参照/更新せず、API route 経由にしてください。`,
  );
}

for (const routePath of [
  'src/app/api/ingredients/route.ts',
  'src/app/api/me/profile/route.ts',
  'src/app/api/recipes/route.ts',
]) {
  assert.ok(existsSync(routePath), `${routePath} を API route として維持してください。`);
}

assert.match(
  migrationSources,
  /\bingredient_code\b/,
  'DB migration にはフロント/API が共有できる ingredient_code カラムを含めてください。',
);

assert.match(
  migrationSources,
  /\buser_preferences\b/,
  'DB migration にはプロフィール設定を保持する user_preferences を含めてください。',
);

const recipeStepTypeAllowsStructuredSteps = [
  /steps\s*:\s*(?:Array<\s*)?\(?\s*string\s*\|\s*\{\s*order\s*:\s*number\s*;\s*text\s*:\s*string\s*;?\s*\}/,
  /type\s+\w*RecipeStep\w*\s*=\s*(?:string\s*\|\s*\{[\s\S]*?order\s*:\s*number[\s\S]*?text\s*:\s*string|\{[\s\S]*?order\s*:\s*number[\s\S]*?text\s*:\s*string[\s\S]*?\}\s*\|\s*string)/,
  /interface\s+\w*RecipeStep\w*\s*\{[\s\S]*?order\s*:\s*number[\s\S]*?text\s*:\s*string[\s\S]*?\}/,
].some((pattern) => pattern.test(mockDataSource));

assert.ok(
  recipeStepTypeAllowsStructuredSteps,
  'Recipe.steps の型は string だけでなく { order, text } 形式も受け入れてください。',
);

assert.match(
  recipeModalSource,
  /typeof\s+step\s*===\s*['"]string['"][\s\S]*?step\.text|step\.text[\s\S]*?typeof\s+step\s*===\s*['"]string['"]|(?:normalize|format|get)[A-Za-z0-9]*Step/,
  'RecipeModal は step が string と { order, text } のどちらでも表示できるように正規化してください。',
);

assert.match(
  recipeModalSource,
  /step\.order|order\s*\?\?|order\s*:/,
  'RecipeModal は { order, text } 形式の order を手順番号または安定 key として扱ってください。',
);

console.log('frontend api/db contract regression checks passed');
