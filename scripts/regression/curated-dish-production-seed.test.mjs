import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';

const seedPath = 'supabase/seed-data/curated-dishes.json';
const migrationPath = 'supabase/migrations/20260525090000_replace_research_seed_with_curated_dishes.sql';
const researchMigrationPath = 'supabase/migrations/20260525073000_replace_mock_with_real_global_dishes.sql';
const displayMigrationPath = 'supabase/migrations/20260525091500_add_recipe_ingredient_display_names.sql';
const apiRoutePath = 'src/app/api/recipes/route.ts';
const mappingPath = 'src/lib/recipeMapping.ts';
const displayBackfillMigrationPath = 'supabase/migrations/20260525093000_backfill_curated_ingredient_display_names.sql';
const mockCleanupMigrationPath = 'supabase/migrations/20260525094500_remove_mock_recipe_ingredients.sql';

const dishes = JSON.parse(readFileSync(seedPath, 'utf8'));
const migrationSource = readFileSync(migrationPath, 'utf8');
const researchMigrationSource = readFileSync(researchMigrationPath, 'utf8');
const dietarySupportMigrationSource = readFileSync('supabase/migrations/20260524000003_add_dietary_support.sql', 'utf8');
const displayMigrationSource = readFileSync(displayMigrationPath, 'utf8');
const apiRouteSource = readFileSync(apiRoutePath, 'utf8');
const mappingSource = readFileSync(mappingPath, 'utf8');
const displayBackfillMigrationSource = readFileSync(displayBackfillMigrationPath, 'utf8');
const mockCleanupMigrationSource = readFileSync(mockCleanupMigrationPath, 'utf8');
const migrationPayload = JSON.parse(migrationSource.match(/\$curated_dishes\$([\s\S]+?)\$curated_dishes\$::jsonb/)?.[1] ?? '[]');
const forbiddenTags = new Set(['実データ', 'Web調査']);

assert.doesNotMatch(
  apiRouteSource,
  /fallbackRecipes|source:\s*['"]fallback['"]|MOCK_RECIPES|Falling back to bundled recipes/,
  'production recipe API は旧 mock recipe fallback を返さないでください。',
);
assert.match(apiRouteSource, /source:\s*['"]database['"]/, 'recipe API は DB primary の source を返してください。');
const appPageSource = readFileSync('src/app/page.tsx', 'utf8');
assert.doesNotMatch(
  appPageSource,
  /useState<Recipe\[\]>\(MOCK_RECIPES\)/,
  '一覧初期表示で旧 mock recipes を production recipe fallback として使わないでください。',
);
const apiTypesSource = readFileSync('src/lib/apiTypes.ts', 'utf8');
assert.match(
  apiTypesSource,
  /export\s+type\s+RecipesResponse\s*=\s*\{[\s\S]*source:\s*['"]database['"][\s\S]*\}/,
  'RecipesResponse は recipe fallback source を公開しないでください。',
);


assert.match(migrationSource, /name_en like 'mock:%:ingredient:%'/i, 'fresh DB replacement migration は mock-only ingredient rows も削除してください。');
assert.match(migrationSource, /category = 'mock料理'/, 'fresh DB replacement migration は mock料理 category も削除対象にしてください。');
assert.match(mockCleanupMigrationSource, /name_en like 'mock:%:ingredient:%'/i, 'already-applied remote DB 用の mock ingredient cleanup migration が必要です。');
assert.match(mockCleanupMigrationSource, /category = 'mock料理'/, 'mock cleanup migration は mock料理 category を削除対象にしてください。');
assert.match(mockCleanupMigrationSource, /not exists[\s\S]*recipe_ingredients/i, 'mock cleanup は参照中 ingredient を削除しない安全条件を持ってください。');

assert.equal(dishes.length, 20, 'curated seed は production 品質の 20 件に絞ってください。');
assert.equal(new Set(dishes.map((dish) => dish.source_ref)).size, dishes.length, 'source_ref は重複させないでください。');
assert.equal(new Set(dishes.map((dish) => dish.title)).size, dishes.length, '料理名は重複させないでください。');
assert.deepEqual(migrationPayload, dishes, 'curated-dishes.json と migration 埋め込み JSON を同期してください。');

const rendang = dishes.find((dish) => dish.source_ref === 'curated:rendang');
assert.ok(rendang, 'ルンダン は curated:rendang として seed に保持してください。');
assert.equal(rendang.title, 'ルンダン', 'curated:rendang の表示名は ルンダン を保持してください。');
assert.equal(rendang.is_vegan, false, 'ルンダン は牛肉を含むため vegan=false にしてください。');
assert.ok(
  rendang.ingredients.some((ingredient) => ingredient.name_ja === '牛肉' && ingredient.master_name_en === 'beef'),
  'ルンダン の牛肉は DB の beef ingredient_code へ紐づけてください。',
);
assert.ok(
  migrationPayload
    .find((dish) => dish.source_ref === 'curated:rendang')
    ?.ingredients.some((ingredient) => ingredient.name_ja === '牛肉' && ingredient.master_name_en === 'beef'),
  'curated migration 埋め込み JSON でも ルンダン の牛肉は beef へ紐づけてください。',
);
assert.match(
  dietarySupportMigrationSource,
  /name_en\s*=\s*'beef'[\s\S]*\{"meat","animal-product"\}|\{"meat","animal-product"\}[\s\S]*name_en\s*=\s*'beef'/,
  'beef ingredient は dietary_tags meat/animal-product を持つため、UI はこの根拠で vegan 不可を説明できます。',
);

const margherita = dishes.find((dish) => dish.source_ref === 'curated:pizza-margherita');
assert.ok(margherita, 'ピッツァ・マルゲリータ は curated:pizza-margherita として seed に保持してください。');
assert.equal(margherita.title, 'ピッツァ・マルゲリータ', 'curated:pizza-margherita の表示名を保持してください。');
assert.equal(margherita.is_gluten_free, false, 'ピッツァ・マルゲリータ は小麦粉を含むため gluten-free=false にしてください。');
assert.ok(
  margherita.ingredients.some((ingredient) => ingredient.name_ja === '小麦粉（ピッツァ生地用）' && ingredient.master_name_en === 'wheat'),
  'ピッツァ・マルゲリータ の小麦粉（ピッツァ生地用）は DB の wheat ingredient_code へ紐づけてください。',
);
assert.ok(
  migrationPayload
    .find((dish) => dish.source_ref === 'curated:pizza-margherita')
    ?.ingredients.some((ingredient) => ingredient.name_ja === '小麦粉（ピッツァ生地用）' && ingredient.master_name_en === 'wheat'),
  'curated migration 埋め込み JSON でも ピッツァ・マルゲリータ の小麦粉は wheat へ紐づけてください。',
);

for (const dish of dishes) {
  assert.match(dish.source_ref, /^curated:[a-z0-9-]+$/, `${dish.title} は curated: の安定 source_ref を使ってください。`);
  assert.match(dish.title, /[ぁ-んァ-ン一-龥]/, `${dish.source_ref} の表示名は日本語にしてください。`);
  assert.ok(!/^[\x00-\x7F\s'-]+$/.test(dish.title), `${dish.source_ref} は英語名だけで表示しないでください。`);
  assert.ok(Array.isArray(dish.tags) && dish.tags.length >= 3, `${dish.title} は production 向けタグを持つ必要があります。`);
  for (const tag of dish.tags) {
    assert.ok(!forbiddenTags.has(tag), `${dish.title} に production 不適切タグ ${tag} を含めないでください。`);
  }

  assert.equal(dish.image_url, `/recipe-images/${dish.slug}.webp`, `${dish.title} はローカル WebP 画像を参照してください。`);
  const imagePath = `public${dish.image_url}`;
  assert.ok(existsSync(imagePath), `${dish.title} の WebP 画像 ${imagePath} が必要です。`);
  const imageSize = statSync(imagePath).size;
  assert.ok(imageSize > 20_000, `${dish.title} の画像は実写真として小さすぎます。`);
  assert.ok(imageSize < 300_000, `${dish.title} の画像は WebP 最適化で 300KB 未満にしてください。`);
  assert.ok(dish.photo_source_url?.startsWith('https://'), `${dish.title} は写真出典 URL を持つ必要があります。`);

  assert.ok(Array.isArray(dish.source_urls) && dish.source_urls.length >= 2, `${dish.title} はレシピ・由来調査の出典を複数持つ必要があります。`);
  assert.ok(Array.isArray(dish.ingredients) && dish.ingredients.length >= 4, `${dish.title} は材料を十分に持つ必要があります。`);
  const supportedAllergenMappings = [
    [/小麦|バゲット|中華麺/, 'wheat'],
    [/乳|牛乳|モッツァレラ|チーズ|ヨーグルト/, 'milk'],
    [/卵/, 'egg'],
    [/えび/, 'shrimp'],
    [/かに/, 'crab'],
    [/落花生/, 'peanut'],
    [/ごま|タヒニ/, 'sesame'],
    [/大豆|豆腐|醤油|豆板醤|豆豉|コチュジャン/, 'soybean'],
    [/牛肉|牛ひき肉|牛骨/, 'beef'],
    [/鶏肉|鶏ガラ|チキンストック/, 'chicken'],
    [/豚肉|豚ひき肉|豚肩肉/, 'pork'],
    [/サーモン/, 'salmon'],
    [/オレンジ/, 'orange'],
  ];
  const mappedMasterNames = new Set(
    dish.ingredients.map((ingredient) => ingredient.master_name_en).filter(Boolean),
  );
  for (const ingredient of dish.ingredients) {
    for (const [pattern, expectedMasterName] of supportedAllergenMappings) {
      if (pattern.test(ingredient.name_ja)) {
        assert.ok(
          mappedMasterNames.has(expectedMasterName),
          `${dish.title} は ${ingredient.name_ja} に対応する ${expectedMasterName} ingredient_code を少なくとも1件紐づけてください。`,
        );
      }
    }
  }
  assert.ok(typeof dish.is_vegan === 'boolean', `${dish.title} は vegan 判定を boolean で持つ必要があります。`);
  assert.ok(typeof dish.is_gluten_free === 'boolean', `${dish.title} は gluten-free 判定を boolean で持つ必要があります。`);

  assert.ok(Array.isArray(dish.steps) && dish.steps.length >= 5, `${dish.title} は具体的な調理手順を5件以上持つ必要があります。`);
  for (const [index, step] of dish.steps.entries()) {
    assert.equal(step.order, index + 1, `${dish.title} の手順 order は連番にしてください。`);
    assert.ok(step.text.length >= 25, `${dish.title} の手順 ${step.order} は具体性が不足しています。`);
  }

  assert.ok(dish.origin_body.length >= 240, `${dish.title} の由来本文は wiki 風の長さが必要です。`);
  assert.ok(dish.culture_body.length >= 240, `${dish.title} の食文化本文は wiki 風の長さが必要です。`);
  assert.match(dish.origin_body, /\n\n/, `${dish.title} の由来本文は複数段落にしてください。`);
  assert.match(dish.culture_body, /\n\n/, `${dish.title} の食文化本文は複数段落にしてください。`);
}

const dishesWithMappedRestrictions = dishes.filter((dish) =>
  dish.ingredients.some((ingredient) => ingredient.master_name_en),
).length;
assert.ok(dishesWithMappedRestrictions >= 16, '主要なアレルゲン・宗教制限食材は既存 ingredient_code にできるだけ紐づけてください。');

assert.match(migrationSource, /source_ref like 'research:%'/i, '旧 100 件 research seed を削除対象にしてください。');
assert.match(migrationSource, /source_ref like 'curated:%'/i, 'curated seed は再実行可能にしてください。');
assert.match(migrationSource, /jsonb_to_recordset\(\$curated_dishes\$/i, '20 件の curated seed を migration に埋め込んでください。');
assert.match(migrationSource, /recipe_research_sources/i, '調査・写真出典を DB に保存してください。');
assert.match(
  migrationSource,
  /deduped_source_seed[\s\S]*group by source_ref, source_url[\s\S]*from deduped_source_seed s/i,
  '同一 URL が調査資料と写真出典に重複しても upsert が cardinality violation を起こさないよう source_seed を重複排除してください。',
);
assert.match(
  researchMigrationSource,
  /select\s+distinct\s+source_ref,\s*'pork'\s+as\s+name_en[\s\S]*where\s+name_ja\s+like\s+'%豚肉%'/i,
  '旧 research seed migration でも豚肉または鶏肉などの混合肉表記で pork 制限を落とさないでください。',
);
assert.match(migrationSource, /display_name_ja/i, 'recipe_ingredients に表示用材料名を保存してください。');
const displayColumnPosition = migrationSource.indexOf('add column if not exists display_name_ja text');
const ingredientInsertPosition = migrationSource.indexOf('insert into public.recipe_ingredients (recipe_id, ingredient_id, quantity, is_optional, display_name_ja)');
assert.ok(displayColumnPosition >= 0 && displayColumnPosition < ingredientInsertPosition, 'fresh DB 用に display_name_ja column は seed insert より前に追加してください。');
assert.match(displayMigrationSource, /add column if not exists display_name_ja text/i, '既存 remote DB 用の display_name_ja 追加 migration を残してください。');
assert.match(displayBackfillMigrationSource, /set display_name_ja = s\.display_name_ja/i, '既存 remote DB の curated 材料表示名を seed から backfill してください。');
assert.match(apiRouteSource, /display_name_ja/i, 'recipes API は表示用材料名を取得してください。');
assert.match(mappingSource, /row\.display_name_ja\?\.trim\(\) \|\| ingredient\.name_ja/, 'API mapper は ingredient_code を保ったまま表示名を優先してください。');
assert.doesNotMatch(migrationSource, /mock\s*(記事|読み物|設定)/i, 'production migration には mock 文言を含めないでください。');
assert.doesNotMatch(migrationSource, /'実データ'|'Web調査'/, 'production migration には不適切タグを含めないでください。');

console.log('curated dish production seed regression checks passed');
