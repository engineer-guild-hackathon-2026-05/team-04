import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const seedPath = 'supabase/seed-data/curated-dishes.json';
const migrationPath = 'supabase/migrations/20260525090000_replace_research_seed_with_curated_dishes.sql';
const dietarySupportMigrationPath = 'supabase/migrations/20260524000003_add_dietary_support.sql';

const dishes = JSON.parse(readFileSync(seedPath, 'utf8'));
const migrationSource = readFileSync(migrationPath, 'utf8');
const migrationPayload = JSON.parse(
  migrationSource.match(/\$curated_dishes\$([\s\S]+?)\$curated_dishes\$::jsonb/)?.[1] ?? '[]',
);
const dietarySupportMigrationSource = readFileSync(dietarySupportMigrationPath, 'utf8');

const dietaryTagsByMasterNameEn = new Map(
  [...dietarySupportMigrationSource.matchAll(/dietary_tags\s*=\s*'\{([^}]*)\}'[\s\S]*?where\s+name_en\s*=\s*'([^']+)'/gi)]
    .map(([, rawTags, nameEn]) => [
      nameEn,
      rawTags
        .split(',')
        .map((tag) => tag.replaceAll('"', '').trim())
        .filter(Boolean),
    ]),
);

function dietaryTagsForSeedIngredient(ingredient) {
  return new Set([
    ...(Array.isArray(ingredient.dietary_tags) ? ingredient.dietary_tags : []),
    ...(ingredient.master_name_en ? dietaryTagsByMasterNameEn.get(ingredient.master_name_en) ?? [] : []),
  ]);
}

function assertCevicheFishBlocksVeganFiltering(dish, sourceName) {
  assert.ok(dish, `${sourceName}: curated:ceviche を seed に保持してください。`);
  assert.equal(dish.is_vegan, false, `${sourceName}: セビーチェは魚を含むため vegan=false にしてください。`);

  const fish = dish.ingredients.find((ingredient) => ingredient.name_ja === '刺身用白身魚');
  assert.ok(fish, `${sourceName}: セビーチェにはレビュー対象の 刺身用白身魚 が必要です。`);

  const dietaryTags = dietaryTagsForSeedIngredient(fish);
  assert.ok(
    dietaryTags.has('animal-product'),
    `${sourceName}: セビーチェの 刺身用白身魚 は custom untagged ingredient として seed せず、` +
      'fish 系の canonical ingredient へ master_name_en で紐づけるか、dietary_tags に animal-product を明示してください。',
  );

  return fish;
}

const seedCevicheFish = assertCevicheFishBlocksVeganFiltering(
  dishes.find((dish) => dish.source_ref === 'curated:ceviche'),
  'curated-dishes.json',
);
const migrationCevicheFish = assertCevicheFishBlocksVeganFiltering(
  migrationPayload.find((dish) => dish.source_ref === 'curated:ceviche'),
  'curated migration payload',
);

if (!seedCevicheFish.master_name_en || !migrationCevicheFish.master_name_en) {
  assert.match(
    migrationSource,
    /insert into public\.ingredients \(name_ja, name_en, category, dietary_tags\)[\s\S]*coalesce\(s\.dietary_tags, array\[\]::text\[\]\)/i,
    'fresh DB で custom curated ingredient を使う場合は JSON の dietary_tags を ingredients.dietary_tags へ保存してください。',
  );
}

console.log('ceviche fish dietary tag regression checks passed');
