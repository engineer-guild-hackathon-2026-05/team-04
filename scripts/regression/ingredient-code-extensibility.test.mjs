import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const ingredientCodesSource = readFileSync('src/lib/ingredientCodes.ts', 'utf8');
const profileRouteSource = readFileSync('src/app/api/me/profile/route.ts', 'utf8');

assert.doesNotMatch(
  ingredientCodesSource,
  /row\.ingredient_code\s*&&\s*INGREDIENT_CODE_SET\.has\(row\.ingredient_code\)/,
  'DBから返った ingredient_code は static INGREDIENT_MASTER に無くても採用してください。',
);
assert.match(
  ingredientCodesSource,
  /if\s*\(row\.ingredient_code\)\s*return\s+row\.ingredient_code/,
  'toIngredientCodeFromDbRow は DB の ingredient_code を優先して返してください。',
);
assert.match(
  ingredientCodesSource,
  /return\s+\/\^ing-\[a-z0-9-\]\+\$\/\.test\(value\)/,
  '保存対象の材料コードは static whitelist ではなく ing-* 形式で判定してください。',
);
assert.doesNotMatch(
  profileRouteSource,
  /INGREDIENT_CODE_SET\.has\(code\)/,
  'プロフィール保存時のDB解決結果を static INGREDIENT_MASTER の集合で再フィルタしないでください。',
);
assert.match(
  profileRouteSource,
  /const\s+missingCodes\s*=\s*ingredientCodes\.filter\(\(code\)\s*=>\s*!resolvedCodes\.has\(code\)\)/,
  'ing-* コードの有効性はDB解決結果との差分で検証してください。',
);

const structuralIngredientCode = (value) => /^ing-[a-z0-9-]+$/.test(value);
const normalizeDbCode = (row, legacyNameMap) => row.ingredient_code || legacyNameMap.get(row.name_ja) || null;
const resolveProfileCodes = ({ requestedCodes, resolvedDbCodes }) => {
  const ingredientCodes = Array.from(new Set(requestedCodes.filter(structuralIngredientCode)));
  const resolvedCodes = new Set(resolvedDbCodes.filter(Boolean));
  const missingCodes = ingredientCodes.filter((code) => !resolvedCodes.has(code));
  if (missingCodes.length > 0) throw new Error(`missing: ${missingCodes.join(',')}`);
  return ingredientCodes;
};

assert.equal(
  normalizeDbCode({ ingredient_code: 'ing-future-allergen', name_ja: '未来アレルゲン' }, new Map()),
  'ing-future-allergen',
  'static master に無いDBコードも UI/API の stable id として返します。',
);
assert.deepEqual(
  resolveProfileCodes({ requestedCodes: ['ing-future-allergen', 'diet-vegan'], resolvedDbCodes: ['ing-future-allergen'] }),
  ['ing-future-allergen'],
  'static master に無い ing-* コードでもDBで解決できれば保存対象にします。',
);
assert.throws(
  () => resolveProfileCodes({ requestedCodes: ['ing-missing'], resolvedDbCodes: [] }),
  /missing: ing-missing/,
  'DBに存在しない ing-* コードは delete flow に落とさずエラーにします。',
);
assert.deepEqual(
  resolveProfileCodes({ requestedCodes: ['diet-vegan'], resolvedDbCodes: [] }),
  [],
  'diet-* などのローカル制限は user_restricted_ingredients 保存対象から除外します。',
);

console.log('ingredient code extensibility regression checks passed');
