import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const pageSource = readFileSync('src/app/page.tsx', 'utf8');
const routeSource = readFileSync('src/app/api/me/profile/route.ts', 'utf8');

assert.match(routeSource, /source:\s*hasReadError\s*\?\s*'local-fallback'\s*:\s*'database'/);
assert.match(routeSource, /if \(restrictedError\) console\.warn/);
assert.match(pageSource, /remoteProfile\?\.source\s*===\s*'local-fallback'[\s\S]*localProfile\?\.restrictedIngredients/);
assert.doesNotMatch(pageSource, /setRestrictedIngredients\(\[\]\);[\s\S]*Profile API failed/);

const fixedReadSync = (localRestrictions, readResult) => {
  if (readResult.source === 'local-fallback') return localRestrictions;
  return readResult.localIds;
};
assert.deepEqual(fixedReadSync(['ing-peanut'], { source: 'local-fallback', localIds: [] }), ['ing-peanut']);
assert.deepEqual(fixedReadSync(['ing-peanut'], { source: 'database', localIds: [] }), []);

console.log('profile DB read failure preservation regression checks passed');
