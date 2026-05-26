import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const walkFiles = (dir, predicate = () => true) => {
  if (!existsSync(dir)) return [];
  const out = [];
  const visit = (current) => {
    for (const entry of readdirSync(current)) {
      const path = join(current, entry);
      const stat = statSync(path);
      if (stat.isDirectory()) {
        visit(path);
      } else if (predicate(path)) {
        out.push(path);
      }
    }
  };
  visit(dir);
  return out;
};

const envExample = readFileSync('.env.local.example', 'utf8');
const sourceFiles = walkFiles('src', (path) => /\.(ts|tsx|js|jsx|mjs)$/.test(path));
const sourceTextByPath = new Map(sourceFiles.map((path) => [path, readFileSync(path, 'utf8')]));
const allSourceText = [...sourceTextByPath.values()].join('\n');

assert.match(
  envExample,
  /^OPENROUTER_API_KEY=your-openrouter-api-key-here$/m,
  '.env.local.example must document OPENROUTER_API_KEY as a server-only key.',
);
assert.match(
  envExample,
  /^OPENROUTER_MODEL=google\/gemini-3\.1-flash-lite$/m,
  '.env.local.example must pin the approved OpenRouter model exactly.',
);
assert.match(
  envExample,
  /^NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key-here$/m,
  '.env.local.example must use the current Supabase publishable key variable.',
);
assert.doesNotMatch(
  `${envExample}
${allSourceText}`,
  /SUPABASE_SECRET_KEY|SUPABASE_SERVICE_ROLE_KEY|createServiceRoleClient|persistAiRecipe|persistAiRecipes/i,
  'AI features must not keep any Supabase secret-key/service-role persistence path.',
);
assert.doesNotMatch(
  envExample,
  /NEXT_PUBLIC_SUPABASE_ANON_KEY|SUPABASE_SERVICE_ROLE_KEY|SUPABASE_SECRET_KEY/,
  '.env.local.example must not document Supabase secret/service-role key variables for AI runtime writes.',
);
assert.doesNotMatch(
  `${envExample}\n${allSourceText}`,
  /NEXT_PUBLIC_OPENROUTER/i,
  'OpenRouter secrets/config must never use NEXT_PUBLIC_* or become client-visible.',
);

const openRouterModelMentions = [...`${envExample}\n${allSourceText}`.matchAll(/google\/gemini-[\w.-]+/g)].map(
  (match) => match[0],
);
assert.deepEqual(
  [...new Set(openRouterModelMentions)],
  ['google/gemini-3.1-flash-lite'],
  'The only allowed OpenRouter model literal is google/gemini-3.1-flash-lite.',
);

const clientVisibleFiles = sourceFiles.filter(
  (path) =>
    path.endsWith('.tsx') ||
    path.includes(`${join('src', 'app', 'components')}${'/'.replace('/', '/')}`) ||
    /src\/app\/(?:page|login\/page|app\/page)\.tsx$/.test(path),
);
for (const path of clientVisibleFiles) {
  const source = sourceTextByPath.get(path) ?? '';
  assert.doesNotMatch(
    source,
    /OPENROUTER_API_KEY|SUPABASE_SECRET_KEY|serviceRole|openRouter/i,
    `${relative('.', path)} must not import or reference server-only AI/secret keys.`,
  );
}

const aiRouteFiles = [
  'src/app/api/recipes/suggest/route.ts',
  'src/app/api/recipes/[id]/substitute/route.ts',
];
for (const path of aiRouteFiles) {
  if (!existsSync(path)) continue;
  const source = readFileSync(path, 'utf8');
  const authIndex = source.search(/getUser\s*\(|auth\.getUser\s*\(|requireAuthenticatedUser|getRecipeRouteUser/);
  const privilegedIndex = source.search(/selectRecipeIdsWithOpenRouter\s*\(|selectIngredientSubstitutionsWithOpenRouter\s*\(/i);
  assert.ok(authIndex >= 0, `${path} must authenticate before doing AI or secret-key work.`);
  assert.ok(
    privilegedIndex === -1 || authIndex < privilegedIndex,
    `${path} must perform auth/session checks before OpenRouter or secret-key/RPC work.`,
  );
}

const migrations = walkFiles('supabase/migrations', (path) => path.endsWith('.sql'));
const migrationTextByPath = new Map(migrations.map((path) => [path, readFileSync(path, 'utf8')]));
const aiMigrationEntries = [...migrationTextByPath.entries()].filter(([, source]) =>
  /parent_recipe_id|cultural_background|substituted_from_ingredient_id|insert_ai_recipe/i.test(source),
);

if (aiMigrationEntries.length > 0) {
  const aiMigrationText = aiMigrationEntries.map(([, source]) => source).join('\n');
  for (const requiredColumn of [
    'parent_recipe_id',
    'cultural_background',
    'substituted_from_ingredient_id',
  ]) {
    assert.match(aiMigrationText, new RegExp(`\\b${requiredColumn}\\b`), `AI MVP migration history must include ${requiredColumn}.`);
  }

  for (const nonMvpName of [
    'recipe_comments',
    'recipe_likes',
    'recipe_ratings',
    'recipe_shares',
    'user_follows',
    'external_sendoffs',
  ]) {
    assert.doesNotMatch(
      aiMigrationText,
      new RegExp(`create\\s+table[^;]*\\b${nonMvpName}\\b`, 'i'),
      `Do not add non-MVP table ${nonMvpName}.`,
    );
  }

  const dropRpcMigration = [...migrationTextByPath.values()].find((source) =>
    /drop\s+function\s+if\s+exists\s+public\.insert_ai_recipes_mvp/i.test(source) &&
    /drop\s+function\s+if\s+exists\s+public\.insert_ai_recipe_mvp/i.test(source),
  );
  assert.ok(dropRpcMigration, 'A follow-up migration must drop old AI recipe write RPCs so AI runtime cannot mutate trusted recipe data.');
}

console.log('AI MVP security contract regression checks passed');
