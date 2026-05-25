import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const ingredientCodeSource = readFileSync('src/lib/ingredientCodes.ts', 'utf8');
const profileRouteSource = readFileSync('src/app/api/me/profile/route.ts', 'utf8');

function extractBetween(source, startPattern, endPattern, label) {
  const start = source.search(startPattern);
  assert.notEqual(start, -1, `${label} の開始位置を検査できません。`);

  const rest = source.slice(start);
  const end = endPattern ? rest.search(endPattern) : -1;
  assert.notEqual(endPattern ? end : 0, -1, `${label} の終了位置を検査できません。`);

  return endPattern ? rest.slice(0, end) : rest;
}


const toIngredientCodeFromDbRow = extractBetween(
  ingredientCodeSource,
  /export\s+function\s+toIngredientCodeFromDbRow\s*\(/,
  /export\s+function\s+normalizeIngredientOption\s*\(/,
  'toIngredientCodeFromDbRow',
);
const resolveRestrictedIngredients = extractBetween(
  profileRouteSource,
  /async\s+function\s+resolveRestrictedIngredients\s*\(/,
  /async\s+function\s+replaceRestrictedIngredients\s*\(/,
  'resolveRestrictedIngredients',
);
const replaceRestrictedIngredients = extractBetween(
  profileRouteSource,
  /async\s+function\s+replaceRestrictedIngredients\s*\(/,
  /export\s+async\s+function\s+GET\s*\(/,
  'replaceRestrictedIngredients',
);
const putRoute = extractBetween(
  profileRouteSource,
  /export\s+async\s+function\s+PUT\s*\(/,
  null,
  'PUT',
);

assert.doesNotMatch(
  toIngredientCodeFromDbRow,
  /INGREDIENT_CODE_SET\.has\(row\.ingredient_code\)/,
  'DBから返る ingredient_code は INGREDIENT_MASTER の静的セット/名前変換で絞り込まず、そのまま受け入れてください。',
);

assert.match(
  toIngredientCodeFromDbRow,
  /row\.ingredient_code[\s\S]*return\s+row\.ingredient_code/,
  'DBから返る未知の ingredient_code もプロフィール/食材APIへ返せるようにしてください。',
);

assert.match(
  resolveRestrictedIngredients,
  /\.from\('ingredients'\)[\s\S]*\.in\('ingredient_code',\s*ingredientCodes\)/,
  'profile PUT は候補 ingredient_code を ingredients DB で解決してください。',
);

assert.doesNotMatch(
  `${resolveRestrictedIngredients}\n${replaceRestrictedIngredients}`,
  /filter\(isIngredientCode\)|INGREDIENT_CODE_SET\.has\(|isIngredientCode\(/,
  'profile PUT の保存対象判定は INGREDIENT_MASTER 静的 whitelist ではなく DB 解決結果で行ってください。',
);

assert.doesNotMatch(
  putRoute,
  /filter\(isIngredientCode\)|!isIngredientCode\(|isIngredientCode\(/,
  'profile PUT のレスポンス構築も静的 whitelist ではなく DB 解決済みコードと local-only 制限を使ってください。',
);

console.log('dynamic DB ingredient_code resolution regression checks passed');
