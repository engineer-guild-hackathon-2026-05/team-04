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
assert.match(
  source,
  /class\s+UnknownRestrictedIngredientCodesError\s+extends\s+Error/,
  '未解決のing-* codeは汎用Errorではなく、client errorとして識別できる専用Errorで扱ってください。',
);
assert.match(
  source,
  /throw\s+new\s+UnknownRestrictedIngredientCodesError\(missingCodes\)/,
  '未解決のing-* codeはUnknownRestrictedIngredientCodesErrorとしてthrowしてください。',
);
assert.match(
  source,
  /error\s+instanceof\s+UnknownRestrictedIngredientCodesError[\s\S]*NextResponse\.json\([\s\S]*unknownCodes:[\s\S]*status:\s*400/,
  '未解決のing-* codeはHTTP 500ではなく、unknownCodes付きの400応答にしてください。',
);

const putStart = source.indexOf('export async function PUT');
assert.notEqual(putStart, -1, 'PUT /api/me/profile を検査できません。');
const putRoute = source.slice(putStart);
const resolveIndex = putRoute.indexOf('await resolveRestrictedIngredients(');
const profileUpsertIndex = putRoute.indexOf(".from('profiles')");
assert.ok(resolveIndex !== -1, 'DB更新前に制限食材codeの解決処理を実行してください。');
assert.ok(profileUpsertIndex !== -1, 'profiles upsert 処理を検査できません。');
assert.ok(
  resolveIndex < profileUpsertIndex,
  '不正な制限食材codeで400を返す場合、profiles/preferencesを部分更新する前に検出してください。',
);

console.log('profile restriction replace safety regression checks passed');
