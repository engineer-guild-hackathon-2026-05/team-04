import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const seedPath = 'supabase/seed-data/global-dishes.json';
const migrationPath = 'supabase/migrations/20260525073000_replace_mock_with_real_global_dishes.sql';

const dishes = JSON.parse(readFileSync(seedPath, 'utf8'));
const migrationSource = readFileSync(migrationPath, 'utf8');
const embeddedDishes = JSON.parse(migrationSource.match(/\$global_dishes\$([\s\S]*?)\$global_dishes\$::jsonb/)?.[1] ?? '[]');
const embeddedDishesBySourceRef = new Map(embeddedDishes.map((dish) => [dish.source_ref, dish]));

assert.equal(dishes.length, 100, '実データベース seed は 100 件ちょうどの料理を持つ必要があります。');
assert.equal(
  new Set(dishes.map((dish) => dish.source_ref)).size,
  dishes.length,
  '料理 seed の source_ref は重複させないでください。',
);

const dishesBySourceRef = new Map(dishes.map((dish) => [dish.source_ref, dish]));

assert.equal(
  dishesBySourceRef.get('research:pizza-margherita')?.is_vegan,
  false,
  'Pizza Margherita はモッツァレラを含むため vegan 対応にしないでください。',
);
assert.equal(
  dishesBySourceRef.get('research:mofongo')?.is_vegan,
  false,
  'Mofongo はチチャロンを含むため vegan 対応にしないでください。',
);
assert.equal(
  embeddedDishesBySourceRef.get('research:pizza-margherita')?.is_vegan,
  false,
  'migration に埋め込んだ Pizza Margherita も vegan 対応にしないでください。',
);
assert.equal(
  embeddedDishesBySourceRef.get('research:mofongo')?.is_vegan,
  false,
  'migration に埋め込んだ Mofongo も vegan 対応にしないでください。',
);
for (const dish of dishes) {
  if (!dish.is_vegan) continue;
  const animalIngredients = dish.ingredients.filter((ingredient) =>
    /鶏肉|牛肉|豚肉|羊肉|ウサギ|卵|バター|チーズ|モッツァレラ|パルメザン|ヨーグルト|乳|クリーム|サワークリーム|ベーコン|チチャロン|塩ダラ|白身魚|生魚|小魚|エビ|えび|乾燥エビ|干しエビ/.test(ingredient),
  );
  assert.deepEqual(animalIngredients, [], `${dish.title} は動物性材料を含むため vegan 対応にしないでください。`);
}

for (const dish of dishes) {
  assert.match(dish.source_ref, /^research:[a-z0-9-]+$/, `${dish.title} は research: の安定 source_ref を使ってください。`);
  assert.ok(!dish.source_ref.startsWith('mock:'), `${dish.title} は mock source_ref を使わないでください。`);
  assert.ok(Array.isArray(dish.source_urls) && dish.source_urls.length >= 1, `${dish.title} は調査出典 URL を持つ必要があります。`);
  assert.ok(Array.isArray(dish.ingredients) && dish.ingredients.length >= 5, `${dish.title} は表示用材料を 5 件以上持つ必要があります。`);
  assert.ok(dish.origin_body?.length >= 80, `${dish.title} は由来本文を十分に持つ必要があります。`);
  assert.ok(dish.culture_body?.length >= 70, `${dish.title} は食文化本文を十分に持つ必要があります。`);
}

assert.match(
  migrationSource,
  /create\s+table\s+if\s+not\s+exists\s+public\.recipe_research_sources/i,
  '調査出典を DB に保存する recipe_research_sources table を作成してください。',
);
assert.match(
  migrationSource,
  /source_ref\s+like\s+'mock:rec-%'/i,
  '旧 mock レシピを置き換えるため mock:rec-% を削除対象にしてください。',
);
assert.match(
  migrationSource,
  /source_ref\s+like\s+'research:%'/i,
  '再実行可能にするため既存 research seed を置き換えてください。',
);
assert.match(
  migrationSource,
  /jsonb_to_recordset\(\$global_dishes\$/i,
  '100 件の調査済み料理 seed を migration に埋め込んでください。',
);

assert.match(
  migrationSource,
  /canonical_name_en[\s\S]*小麦粉[\s\S]*'wheat'/i,
  '小麦粉など既存アレルゲン材料は recipe 固有 name_en ではなく canonical wheat ingredient に紐付けてください。',
);
const assertCanonicalAlias = (code, aliases) => {
  for (const alias of aliases) {
    const escapedAlias = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    assert.match(
      migrationSource,
      new RegExp(`when\\s+i\\.ingredient\\s+in\\s*\\([^)]*'${escapedAlias}'[^)]*\\)\\s+then\\s+'${code}'`, 'i'),
      `${alias} は canonical ${code} ingredient に紐付けて安全表示の制限コードを維持してください。`,
    );
  }
};

assertCanonicalAlias('milk', [
  'モッツァレラ',
  'バター',
  'パルメザンチーズ',
  'チーズ',
  'フェタチーズ',
  'アヤブチーズ',
  'ヨーグルト',
  '牛乳',
  'クリーム',
  '生クリーム',
  'サワークリーム',
]);
assert.doesNotMatch(
  migrationSource,
  /when\s+i\.ingredient\s+in\s*\([^)]*'ココナッツミルク'[^)]*\)\s+then\s+'milk'/i,
  'ココナッツミルクは植物性のため canonical milk ingredient に紐付けないでください。',
);
assert.match(
  migrationSource,
  /coalesce\(\s*canonical_name_en\s*,[\s\S]*source_ref\s*\|\|\s*':ingredient:'/i,
  'research ingredient seed は canonical alias がある場合に既存 ingredient を使い、未知材料だけ recipe 固有 name_en を作ってください。',
);

assert.match(
  migrationSource,
  /insert\s+into\s+public\.recipe_culture_sections/i,
  '各料理の文化セクションを recipe_culture_sections に投入してください。',
);
assert.match(
  migrationSource,
  /'origin'::text[\s\S]*'food_culture'::text/i,
  '由来・食文化セクションを両方投入してください。',
);
assert.doesNotMatch(
  migrationSource,
  /mock\s*(記事|読み物|設定)/i,
  '新しい実データ migration には mock 文言を含めないでください。',
);

console.log('global dish research seed regression checks passed');
