import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync('src/app/page.tsx', 'utf8');
const profileSource = readFileSync('src/app/components/ProfileView.tsx', 'utf8');

assert.match(profileSource, /id:\s*'diet-vegan'/, '再現対象として diet-vegan option が必要です。');

const previousSync = (_localRestrictions, databaseIngredientIds) => databaseIngredientIds;
const fixedSync = (localRestrictions, databaseIngredientIds) => [
  ...databaseIngredientIds,
  ...localRestrictions.filter((id) => id.startsWith('diet-')),
];

assert.deepEqual(
  previousSync(['diet-vegan', 'ing-peanut'], ['ing-peanut']),
  ['ing-peanut'],
  '再現: DB ingredient rows だけで上書きすると diet-vegan が消えます。',
);
assert.deepEqual(
  fixedSync(['diet-vegan', 'ing-peanut'], ['ing-peanut']),
  ['ing-peanut', 'diet-vegan'],
  '修正: DBに保存しない diet/religious option も local profile 上は保持してください。',
);

assert.match(
  source,
  /const\s+ingredientMasterIds\s*=\s*new Set/,
  'INGREDIENT_MASTER に存在する ingredient restriction と local-only restriction を区別してください。',
);
assert.match(
  source,
  /function\s+mergeSyncedRestrictedIngredients/,
  'DB ingredient rows と local-only diet options を merge する helper を用意してください。',
);
assert.match(
  source,
  /!ingredientMasterIds\.has\(id\)/,
  'diet-vegan など ingredient master に無い restriction ID を sync 時に保持してください。',
);
assert.match(
  source,
  /writeStoredProfile\([\s\S]*restrictedIngredients:\s*mergedRestrictedIngredients/,
  'DB sync 後も merged restrictions を localStorage に保存し、refresh 後に diet option が消えないようにしてください。',
);

console.log('diet restriction sync regression checks passed');
