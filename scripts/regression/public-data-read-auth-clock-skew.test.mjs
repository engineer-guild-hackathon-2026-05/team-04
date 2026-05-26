import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const recipesRoute = readFileSync('src/app/api/recipes/route.ts', 'utf8');
const ingredientsRoute = readFileSync('src/app/api/ingredients/route.ts', 'utf8');
const publicClient = readFileSync('src/lib/supabase/public.ts', 'utf8');

const previousPublicReadAuth = ({ requestHasFutureIssuedJwt }) =>
  requestHasFutureIssuedJwt ? 'user-session-jwt' : 'anon-key';
const fixedPublicReadAuth = () => 'anon-key';

assert.equal(
  previousPublicReadAuth({ requestHasFutureIssuedJwt: true }),
  'user-session-jwt',
  '再現: SSR cookie-bound client で public data を読むと、future-issued user JWT が PostgREST に送られ得ます。',
);
assert.equal(
  fixedPublicReadAuth({ requestHasFutureIssuedJwt: true }),
  'anon-key',
  '修正: public data read は request cookie の user JWT ではなく anon/public read client を使ってください。',
);

for (const [label, source] of [['recipes', recipesRoute], ['ingredients', ingredientsRoute]]) {
  assert.doesNotMatch(
    source,
    /from ['"]@\/lib\/supabase\/server['"]/,
    `/api/${label} は public read なので cookie-bound Supabase SSR client を使わないでください。`,
  );
  assert.doesNotMatch(
    source,
    /const supabase = await createClient\(\)/,
    `/api/${label} は request cookie 由来の auth session を PostgREST に渡さないでください。`,
  );
  assert.match(
    source,
    /createPublicReadClient\(\)/,
    `/api/${label} は public read client でDBを読んでください。`,
  );
}

assert.match(
  publicClient,
  /import 'server-only'/,
  'public read client helper は Route Handler/server 境界に閉じ込めてください。',
);
assert.match(
  publicClient,
  /createClient\(\s*supabaseUrl,\s*supabaseAnonKey[\s\S]*auth:\s*\{[\s\S]*autoRefreshToken:\s*false[\s\S]*persistSession:\s*false[\s\S]*detectSessionInUrl:\s*false/s,
  'public read client は anon key かつ persistSession:false で user cookie JWT を送らないでください。',
);
assert.match(recipesRoute, /\.from\('recipes'\)[\s\S]*\.select\(`/, '/api/recipes は既存の recipes select contract を維持してください。');
assert.match(ingredientsRoute, /\.from\('ingredients'\)[\s\S]*\.select\('ingredient_code, name_ja, name_en, category, dietary_tags'\)/, '/api/ingredients は既存の ingredients select contract を維持してください。');

console.log('public data read auth clock-skew regression checks passed');
