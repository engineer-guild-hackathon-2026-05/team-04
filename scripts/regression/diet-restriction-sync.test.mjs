import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const pageSource = readFileSync('src/app/page.tsx', 'utf8');
const profileSource = readFileSync('src/app/components/ProfileView.tsx', 'utf8');
const apiSource = readFileSync('src/app/api/me/profile/route.ts', 'utf8');

assert.match(profileSource, /id:\s*'diet-vegan'/, '再現対象として diet-vegan option が必要です。');
assert.match(pageSource, /preserveLocalIngredientCodes[\s\S]*!id\.startsWith\('ing-'\)/, 'DBに保存しない diet option を local profile 上は保持してください。');
assert.doesNotMatch(apiSource, /requestedRestrictedIngredients\.filter\(isIngredientCode\)|!isIngredientCode\(|INGREDIENT_CODE_SET\.has\(/, 'API保存時は INGREDIENT_MASTER 静的 whitelist ではなく DB 解決で制限食材を同期してください。');
assert.match(apiSource, /localOnlyRestrictions\s*=\s*requestedNonIngredientRestrictions/, 'diet-vegan など対応済みの非 ingredient restriction ID はレスポンスで保持してください。');

console.log('diet restriction sync regression checks passed');
