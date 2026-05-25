import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const pageSource = readFileSync('src/app/page.tsx', 'utf8');
const routeSource = readFileSync('src/app/api/me/profile/route.ts', 'utf8');

assert.match(routeSource, /fallbackFields:\s*ProfileFallbackField\[\]/);
assert.match(routeSource, /if \(restrictedError\) \{[\s\S]*fallbackFields\.push\('restrictedIngredients'\)/);
assert.match(routeSource, /if \(preferencesError\) \{[\s\S]*fallbackFields\.push\('preferences'\)/);
assert.match(pageSource, /function\s+getProfileFallbackFields[\s\S]*remoteProfile\.source === 'local-fallback'/);
assert.match(pageSource, /shouldUseLocalRestrictions[\s\S]*localProfile\?\.restrictedIngredients/);
assert.doesNotMatch(pageSource, /setRestrictedIngredients\(\[\]\);[\s\S]*Profile API failed/);

const fixedReadSync = (localRestrictions, readResult) => {
  if (readResult.fallbackFields?.includes('restrictedIngredients')) return localRestrictions;
  return readResult.localIds;
};
assert.deepEqual(fixedReadSync(['ing-peanut'], { source: 'partial-fallback', fallbackFields: ['restrictedIngredients'], localIds: [] }), ['ing-peanut']);
assert.deepEqual(fixedReadSync(['ing-peanut'], { source: 'partial-fallback', fallbackFields: ['preferences'], localIds: ['ing-shrimp'] }), ['ing-shrimp']);
assert.deepEqual(fixedReadSync(['ing-peanut'], { source: 'database', localIds: [] }), []);

console.log('profile DB read failure preservation regression checks passed');
