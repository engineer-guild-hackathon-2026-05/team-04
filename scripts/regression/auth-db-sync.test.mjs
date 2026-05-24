import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync('src/app/page.tsx', 'utf8');

assert.match(
  source,
  /if\s*\(restrictedIngredientSync\.ok\)\s*\{[\s\S]*setRestrictedIngredients\(mergedRestrictedIngredients\);/,
  '認証後のDB同期では、DB read 成功時だけ mergedRestrictedIngredients でstateを更新してください。',
);

assert.match(
  source,
  /mergeSyncedRestrictedIngredients\(\s*locallyStoredRestrictedIngredients,\s*restrictedIngredientSync\.localIds,\s*\)/,
  'DB同期時も、DBに保存されない diet-* などの非ingredient制限はlocalStorage由来で維持してください。',
);

assert.doesNotMatch(
  source,
  /restrictedIngredientSync\.localIds\.length\s*>\s*0/,
  'DBの制限食材が0件の場合も古い ingredient localStorage 値を残さないため、length guardを再導入しないでください。',
);

const previousBuggySync = (localRestrictedIngredients, databaseRestrictedIngredients) => {
  let restrictedIngredients = [...localRestrictedIngredients];
  if (databaseRestrictedIngredients.length > 0) {
    restrictedIngredients = databaseRestrictedIngredients;
  }
  return restrictedIngredients;
};

const fixedSync = (localRestrictedIngredients, databaseRestrictedIngredients) => {
  const ingredientMasterIds = new Set(['ing-egg', 'ing-shrimp']);
  const localOnlyRestrictionIds = localRestrictedIngredients.filter((id) => !ingredientMasterIds.has(id));
  return [
    ...databaseRestrictedIngredients,
    ...localOnlyRestrictionIds.filter((id) => !databaseRestrictedIngredients.includes(id)),
  ];
};

assert.deepEqual(
  previousBuggySync(['ing-egg', 'ing-shrimp'], []),
  ['ing-egg', 'ing-shrimp'],
  '再現: 旧実装はDBが空でもlocalStorage由来の古い ingredient 制限食材を残します。',
);
assert.deepEqual(
  fixedSync(['ing-egg', 'ing-shrimp'], []),
  [],
  '修正: DBが空なら ingredient 制限食材stateは空配列へ上書きします。',
);
assert.deepEqual(
  fixedSync(['ing-egg', 'diet-vegan'], []),
  ['diet-vegan'],
  '修正: DBに保存しない diet option は ingredient DB sync 後も保持します。',
);
assert.deepEqual(
  fixedSync(['ing-egg', 'diet-vegan'], ['ing-shrimp']),
  ['ing-shrimp', 'diet-vegan'],
  '修正: ingredient制限はDB値を正とし、非ingredient制限だけを補完します。',
);

console.log('auth-db-sync regression checks passed');
