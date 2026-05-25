import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const pageSource = readFileSync('src/app/page.tsx', 'utf8');
const profileSource = readFileSync('src/app/components/ProfileView.tsx', 'utf8');
const apiSource = readFileSync('src/app/api/me/profile/route.ts', 'utf8');

assert.match(profileSource, /id:\s*'diet-vegan'/, '再現対象として diet-vegan option が必要です。');
assert.match(pageSource, /filter\(\(id\)\s*=>\s*!id\.startsWith\('ing-'\)\)/, 'DBに保存しない diet option を local profile 上は保持してください。');
assert.match(apiSource, /requestedRestrictedIngredients\.filter\(isIngredientCode\)/, 'API保存時はDB材料コードだけを user_restricted_ingredients に同期してください。');
assert.match(apiSource, /localOnlyRestrictions\s*=\s*requestedRestrictedIngredients\.filter\(\(code\)\s*=>\s*!isIngredientCode\(code\)\)/, 'diet-vegan など ingredient master に無い restriction ID をレスポンスで保持してください。');

console.log('diet restriction sync regression checks passed');
