import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const mockData = readFileSync('src/lib/mockData.ts', 'utf8');
const profileView = readFileSync('src/app/components/ProfileView.tsx', 'utf8');
const ingredientsApi = readFileSync('src/app/api/ingredients/route.ts', 'utf8');
const seedMigration = readFileSync('supabase/migrations/20260524000002_seed_ingredients.sql', 'utf8');
const dietaryMigration = readFileSync('supabase/migrations/20260524000003_add_dietary_support.sql', 'utf8');
const alignMigration = readFileSync('supabase/migrations/20260525000000_align_frontend_contract.sql', 'utf8');
const updateMigration = readFileSync('supabase/migrations/20260525133000_update_allergen_catalog_2026.sql', 'utf8');

const masterBlock = mockData.match(/export const INGREDIENT_MASTER: IngredientMaster\[] = \[([\s\S]*?)\n\];/);
assert.ok(masterBlock, 'INGREDIENT_MASTER を検査できる形式で定義してください。');
const masterIds = [...masterBlock[1].matchAll(/id: "(ing-[^"]+)"/g)].map(([, id]) => id);

assert.equal(new Set(masterIds).size, masterIds.length, 'INGREDIENT_MASTER の ingredient id は重複させないでください。');
assert.equal(masterIds.length, 29, '令和8年4月時点の特定原材料等29品目を fallback master に含めてください。');

for (const id of ['ing-wheat', 'ing-cashew', 'ing-macadamia', 'ing-pistachio']) {
  assert.ok(masterIds.includes(id), `${id} をプロフィールのアレルギー選択肢に含めてください。`);
}
assert.ok(!masterIds.includes('ing-matsutake'), 'まつたけは令和6年3月改正で表示推奨対象から外れたため fallback master から除外してください。');

assert.match(profileView, /ALLERGEN_DISPLAY_ORDER[\s\S]*'ing-wheat'[\s\S]*'ing-pistachio'[\s\S]*'ing-macadamia'/, 'DBの並びに依存せず主要・追加アレルゲンを安定表示してください。');
assert.match(profileView, /'ing-wheat': \[[^\]]*'小麦粉'[^\]]*'wheat flour'[^\]]*'flour'[^\]]*'gluten'/, '小麦粉・flour・gluten 検索で 小麦 を見つけられるようにしてください。');
assert.match(profileView, /placeholder: '小麦粉、卵、えび、ピスタチオなどを検索\.\.\.'/, '検索 placeholder は小麦粉や追加アレルゲンの検索可能性を示してください。');

assert.match(ingredientsApi, /\.eq\('is_allergen',\s*true\)/, '/api/ingredients はアレルゲン選択肢のみ返してください。');

for (const source of [seedMigration, dietaryMigration, alignMigration, updateMigration]) {
  assert.match(source, /macadamia nut|ing-macadamia|マカダミアナッツ/, 'マカダミアナッツをDB初期化・更新経路に含めてください。');
  assert.match(source, /pistachio|ing-pistachio|ピスタチオ/, 'ピスタチオをDB初期化・更新経路に含めてください。');
}

assert.doesNotMatch(seedMigration, /matsutake|まつたけ/, '新規DB seed には削除済みの まつたけ を含めないでください。');
assert.doesNotMatch(dietaryMigration, /name_en = 'matsutake'/, '新規DBのアレルゲン設定では まつたけ を有効化しないでください。');
assert.match(updateMigration, /set is_allergen = false[\s\S]*where name_en = 'matsutake'/, '既存DBでは まつたけ 行を残したままアレルゲン選択肢から外してください。');

console.log('profile allergen catalog regression checks passed');
