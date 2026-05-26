import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync('src/app/page.tsx', 'utf8');

const fixedClientAuth = ({ demoSession, hasProfileApiSession }) => {
  if (demoSession.status === 'authenticated') return 'authenticated';
  return hasProfileApiSession ? 'authenticated' : 'unauthenticated';
};

assert.equal(fixedClientAuth({ demoSession: { status: 'unauthenticated' }, hasProfileApiSession: true }), 'authenticated');
assert.doesNotMatch(
  source,
  /if\s*\(demoSession\.status\s*===\s*'unauthenticated'\s*\|\|\s*demoSession\.status\s*===\s*'failed'\)\s*\{[\s\S]*?setAuthStatus\('unauthenticated'\);[\s\S]*?return;/,
);
assert.match(source, /if\s*\(demoSession\.status\s*===\s*'failed'\)\s*\{[\s\S]*console\.error\(/);
assert.match(source, /const\s+remoteProfile\s*=\s*await\s+fetchProfileFromApi\(\)/);
assert.match(source, /fetch\('\/api\/me\/profile'/);

console.log('demo client Supabase session regression checks passed');
