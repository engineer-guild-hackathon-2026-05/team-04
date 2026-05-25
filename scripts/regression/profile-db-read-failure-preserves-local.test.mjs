import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync('src/app/page.tsx', 'utf8');

const previousReadSync = (localRestrictions, readResult) => {
  const databaseRestrictedIngredients = readResult.ok ? readResult.localIds : [];
  return databaseRestrictedIngredients;
};

const fixedReadSync = (localRestrictions, readResult) => {
  if (!readResult.ok) return localRestrictions;
  return readResult.localIds;
};

assert.deepEqual(
  previousReadSync(['ing-peanut'], { ok: false }),
  [],
  '再現: DB read 失敗を [] に潰すと、local に残っていた制限食材が消えます。',
);
assert.deepEqual(
  fixedReadSync(['ing-peanut'], { ok: false }),
  ['ing-peanut'],
  '修正: DB read 失敗時は local の制限食材を保持してください。',
);
assert.deepEqual(
  fixedReadSync(['ing-peanut'], { ok: true, localIds: [] }),
  [],
  '修正: DB read 成功かつ0件の場合だけ、DBの空結果で ingredient 制限をクリアしてください。',
);

assert.match(
  source,
  /type\s+RestrictedIngredientSyncResult\s*=\s*[\s\S]*\{\s*ok:\s*true;\s*localIds:\s*string\[\]/,
  'DB read は成功した空配列と失敗を区別できる Result 型で返してください。',
);
assert.match(
  source,
  /return\s+\{\s*ok:\s*false/s,
  'fetchRestrictedIngredientLocalIds は Supabase error を [] に潰さず ok:false を返してください。',
);
assert.doesNotMatch(
  source,
  /const\s+databaseRestrictedIngredients\s*=\s*await\s+fetchRestrictedIngredientLocalIds[\s\S]*?setRestrictedIngredients\(databaseRestrictedIngredients\);/,
  'DB read 結果を無条件に setRestrictedIngredients へ代入しないでください。',
);
assert.match(
  source,
  /if\s*\(restrictedIngredientSync\.ok\)\s*\{/,
  'DB read 成功時のみ DB 結果で state/localStorage を同期してください。',
);

console.log('profile DB read failure preservation regression checks passed');
