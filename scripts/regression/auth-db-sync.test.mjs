import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync('src/app/page.tsx', 'utf8');

assert.match(
  source,
  /const localPreferenceRestrictionIds = localProfile\?\.restrictedIngredients[\s\S]*?!id\.startsWith\('ing-'\)/,
  'DB同期時も、DBに保存されない diet-* などの非ingredient制限はlocalStorage由来で維持してください。',
);

assert.match(
  source,
  /setRestrictedIngredients\(syncedRestrictedIngredients\);/,
  '認証後のDB同期では、DBの制限食材とローカルの非ingredient制限を統合したstateで上書きしてください。',
);

assert.doesNotMatch(
  source,
  /databaseRestrictedIngredients\.length\s*>\s*0/,
  'DBの制限食材が0件の場合も古いingredient系localStorage値を残さないため、length guardを再導入しないでください。',
);

const previousBuggySync = (localRestrictedIngredients, databaseRestrictedIngredients) => {
  let restrictedIngredients = [...localRestrictedIngredients];
  if (databaseRestrictedIngredients.length > 0) {
    restrictedIngredients = databaseRestrictedIngredients;
  }
  return restrictedIngredients;
};

const fixedSync = (localRestrictedIngredients, databaseRestrictedIngredients) => [
  ...databaseRestrictedIngredients,
  ...localRestrictedIngredients.filter(
    (id) => !id.startsWith('ing-') && !databaseRestrictedIngredients.includes(id),
  ),
];

assert.deepEqual(
  previousBuggySync(['ing-egg', 'ing-shrimp'], []),
  ['ing-egg', 'ing-shrimp'],
  '再現: 旧実装はDBが空でもlocalStorage由来の古いingredient制限を残します。',
);
assert.deepEqual(
  fixedSync(['ing-egg', 'ing-shrimp'], []),
  [],
  '修正: DBが空ならingredient制限stateも空配列へ上書きします。',
);
assert.deepEqual(
  fixedSync(['ing-egg', 'diet-vegan'], []),
  ['diet-vegan'],
  '修正: DBに保存されないdiet-*制限はlocalStorage由来で維持します。',
);
assert.deepEqual(
  fixedSync(['ing-egg', 'diet-vegan'], ['ing-shrimp']),
  ['ing-shrimp', 'diet-vegan'],
  '修正: ingredient制限はDB値を正とし、非ingredient制限だけを補完します。',
);

console.log('auth-db-sync regression checks passed');
