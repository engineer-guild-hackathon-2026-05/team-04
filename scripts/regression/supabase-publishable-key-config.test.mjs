import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const configSource = readFileSync('src/lib/supabase/config.ts', 'utf8');
const clientSource = readFileSync('src/lib/supabase/client.ts', 'utf8');
const ingredientsRoute = readFileSync('src/app/api/ingredients/route.ts', 'utf8');
const recipesRoute = readFileSync('src/app/api/recipes/route.ts', 'utf8');
const profileRoute = readFileSync('src/app/api/me/profile/route.ts', 'utf8');

assert.match(
  configSource,
  /NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY[\s\S]*\?\?[\s\S]*NEXT_PUBLIC_SUPABASE_ANON_KEY/,
  'Supabase config must accept the current publishable key and fall back to the legacy anon key.',
);

assert.match(
  clientSource,
  /requireSupabaseConfig\(\)/,
  'Browser Supabase client must use the shared config resolver instead of reading only the legacy anon env var.',
);

for (const [name, source] of [
  ['ingredients route', ingredientsRoute],
  ['recipes route', recipesRoute],
  ['profile route', profileRoute],
]) {
  assert.match(source, /hasSupabaseConfig\(\)/, `${name} must use shared Supabase config detection.`);
  assert.doesNotMatch(
    source,
    /!process\.env\.NEXT_PUBLIC_SUPABASE_URL\s*\|\|\s*!process\.env\.NEXT_PUBLIC_SUPABASE_ANON_KEY/,
    `${name} must not reject deployments that use NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.`,
  );
}

console.log('Supabase publishable key config regression checks passed');
