import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync('src/app/page.tsx', 'utf8');

const previousReplace = ({ lookupFails }) => {
  const committed = ['delete existing rows'];
  if (lookupFails) return committed;
  committed.push('insert replacement rows');
  return committed;
};

const fixedReplace = ({ lookupFails, insertFails }) => {
  const committed = [];
  if (lookupFails) return committed;
  committed.push('read existing rows', 'delete existing rows');
  if (insertFails) committed.push('restore existing rows');
  else committed.push('insert replacement rows');
  return committed;
};

assert.deepEqual(
  previousReplace({ lookupFails: true }),
  ['delete existing rows'],
  '再現: 旧実装は replacement lookup 失敗前に既存制限を削除済みにします。',
);
assert.deepEqual(
  fixedReplace({ lookupFails: true, insertFails: false }),
  [],
  '修正: replacement set を解決できない場合は既存DB rowsを変更しないでください。',
);
assert.deepEqual(
  fixedReplace({ lookupFails: false, insertFails: true }),
  ['read existing rows', 'delete existing rows', 'restore existing rows'],
  '修正: insert 失敗時は削除済みの既存rowsを復元してください。',
);

const lookupIndex = source.indexOf(".from('ingredients')");
const deleteIndex = source.indexOf(".from('user_restricted_ingredients')\n    .delete()");
assert.ok(lookupIndex !== -1, 'replacement ingredient lookup が必要です。');
assert.ok(deleteIndex !== -1, '既存 user_restricted_ingredients の delete 処理を検査できません。');
assert.ok(
  lookupIndex < deleteIndex,
  'replaceRestrictedIngredients は delete より前に replacement ingredient set を解決してください。',
);
assert.match(
  source,
  /const\s+\{\s*data:\s*existingRows,\s*error:\s*existingError\s*\}/,
  'delete 前に既存 rows を読み、insert 失敗時の復元材料を保持してください。',
);
assert.match(
  source,
  /restoreRestrictedIngredientRows\(/,
  'insert 失敗時の補償として restoreRestrictedIngredientRows を呼んでください。',
);
assert.match(
  source,
  /if\s*\(deleteError\)\s*throw\s+deleteError/,
  'delete の Supabase error を無視しないでください。',
);

console.log('profile restriction replace safety regression checks passed');
