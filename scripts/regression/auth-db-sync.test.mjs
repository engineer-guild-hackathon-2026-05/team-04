import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync('src/app/page.tsx', 'utf8');

assert.match(
  source,
  /setRestrictedIngredients\(databaseRestrictedIngredients\);/,
  '認証後のDB同期では、空配列も含めてDBの制限食材リストでstateを上書きしてください。',
);

assert.doesNotMatch(
  source,
  /databaseRestrictedIngredients\.length\s*>\s*0/,
  'DBの制限食材が0件の場合も古いlocalStorage値を残さないため、length guardを再導入しないでください。',
);

const previousBuggySync = (localRestrictedIngredients, databaseRestrictedIngredients) => {
  let restrictedIngredients = [...localRestrictedIngredients];
  if (databaseRestrictedIngredients.length > 0) {
    restrictedIngredients = databaseRestrictedIngredients;
  }
  return restrictedIngredients;
};

const fixedSync = (_localRestrictedIngredients, databaseRestrictedIngredients) => databaseRestrictedIngredients;

assert.deepEqual(
  previousBuggySync(['卵', 'えび'], []),
  ['卵', 'えび'],
  '再現: 旧実装はDBが空でもlocalStorage由来の古い制限食材を残します。',
);
assert.deepEqual(
  fixedSync(['卵', 'えび'], []),
  [],
  '修正: DBが空なら制限食材stateも空配列へ上書きします。',
);

console.log('auth-db-sync regression checks passed');
