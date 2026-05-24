import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync('src/app/page.tsx', 'utf8');

const previousClientAuth = ({ demoSession, hasSupabaseSession }) => {
  if (demoSession === 'authenticated') return 'authenticated';
  if (demoSession === 'unauthenticated' || demoSession === 'failed') return 'unauthenticated';
  return hasSupabaseSession ? 'authenticated' : 'unauthenticated';
};

const fixedClientAuth = ({ demoSession, hasSupabaseSession }) => {
  if (demoSession === 'authenticated') return 'authenticated';
  return hasSupabaseSession ? 'authenticated' : 'unauthenticated';
};

assert.equal(
  previousClientAuth({ demoSession: 'unauthenticated', hasSupabaseSession: true }),
  'unauthenticated',
  '再現: DEMO_MODE 有効・demo cookie なしだと Supabase session 確認前に未ログイン扱いになります。',
);
assert.equal(
  fixedClientAuth({ demoSession: 'unauthenticated', hasSupabaseSession: true }),
  'authenticated',
  '修正: demo cookie が無い場合でも Supabase session があれば authenticated として描画してください。',
);

assert.doesNotMatch(
  source,
  /if\s*\(demoSession\s*===\s*'unauthenticated'\s*\|\|\s*demoSession\s*===\s*'failed'\)\s*\{[\s\S]*?setAuthStatus\('unauthenticated'\);[\s\S]*?return;/,
  'demo unauthenticated/failed だけで return せず、Supabase session 確認へ進んでください。',
);
assert.match(
  source,
  /if\s*\(demoSession\s*===\s*'failed'\)\s*\{[\s\S]*console\.error\(/,
  'demo session check failed はログに残しつつ Supabase auth fallback を続行してください。',
);
assert.match(
  source,
  /const\s+supabase\s*=\s*createClient\(\);[\s\S]*supabase\.auth\.getSession\(\)/,
  'demo cookie が無い/失敗した場合も Supabase session を確認してください。',
);

console.log('demo client Supabase session regression checks passed');
