import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync('src/app/api/me/profile/route.ts', 'utf8');

assert.match(source, /async\s+function\s+replaceRestrictedIngredients/);
const lookupIndex = source.indexOf(".from('ingredients')");
const deleteIndex = source.indexOf(".from('user_restricted_ingredients')\n    .delete()");
assert.ok(lookupIndex !== -1, 'replacement ingredient lookup が必要です。');
assert.ok(deleteIndex !== -1, '既存 user_restricted_ingredients の delete 処理を検査できません。');
assert.ok(lookupIndex < deleteIndex, 'replaceRestrictedIngredients は delete より前に replacement ingredient set を解決してください。');
assert.match(source, /const\s+\{\s*data:\s*existingRows,\s*error:\s*existingError\s*\}/);
assert.match(source, /restoreRestrictedIngredientRows\(/);
assert.match(source, /if\s*\(deleteError\)\s*throw\s+deleteError/);

console.log('profile restriction replace safety regression checks passed');
