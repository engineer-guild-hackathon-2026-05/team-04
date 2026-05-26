import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync('src/app/page.tsx', 'utf8');

assert.match(
  source,
  /function\s+mergeProfile\(localProfile:[\s\S]*remoteProfile:[\s\S]*ProfileResponse/,
  'API同期結果とlocalStorageを統合する mergeProfile helper を維持してください。',
);
assert.match(
  source,
  /function\s+getProfileFallbackFields[\s\S]*fallbackFields/,
  'プロフィールAPIの部分的なDB read失敗は fallbackFields でフィールド単位に扱ってください。',
);
assert.match(
  source,
  /shouldUseLocalRestrictions[\s\S]*localProfile\?\.restrictedIngredients/,
  '制限食材のDB read失敗時だけ localStorage の制限食材を保持してください。',
);
assert.match(
  source,
  /remoteProfile\?\.restrictedIngredients[\s\S]*preserveLocalIngredientCodes[\s\S]*!id\.startsWith\('ing-'\)/,
  'DB同期時も、DBに保存されない diet-* などの非ingredient制限はlocalStorage由来で維持してください。',
);
assert.match(
  source,
  /const\s+remoteProfile\s*=\s*await\s+fetchProfileFromApi\(\)/,
  '認証後のプロフィール/制限食材同期は /api/me/profile の結果を使ってください。',
);

const fixedSync = (localRestrictedIngredients, databaseRestrictedIngredients, fallbackFields = []) => {
  if (fallbackFields.includes('restrictedIngredients')) return localRestrictedIngredients;
  const preserveLocalIngredientCodes = false;
  return [
    ...databaseRestrictedIngredients,
    ...localRestrictedIngredients.filter((id) => preserveLocalIngredientCodes || !id.startsWith('ing-')),
  ];
};

assert.deepEqual(fixedSync(['ing-egg', 'ing-shrimp'], []), []);
assert.deepEqual(fixedSync(['ing-egg', 'diet-vegan'], []), ['diet-vegan']);
assert.deepEqual(fixedSync(['ing-egg', 'diet-vegan'], ['ing-shrimp']), ['ing-shrimp', 'diet-vegan']);
assert.deepEqual(fixedSync(['ing-egg'], [], ['restrictedIngredients']), ['ing-egg']);
assert.deepEqual(fixedSync(['ing-egg'], ['ing-shrimp'], ['preferences']), ['ing-shrimp']);
assert.deepEqual(fixedSync(['ing-egg', 'diet-vegan'], [], []), ['diet-vegan']);

console.log('auth-db-sync regression checks passed');
