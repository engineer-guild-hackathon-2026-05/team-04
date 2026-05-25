import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const seedPath = 'supabase/seed-data/curated-dishes.json';
const southeastAsiaMigrationPath = 'supabase/migrations/20260525101000_add_southeast_asian_curated_dishes.sql';
const backfillMigrationPath = 'supabase/migrations/20260525134500_backfill_southeast_asian_custom_seafood_tags.sql';

const dishes = JSON.parse(readFileSync(seedPath, 'utf8'));
const southeastAsiaMigrationSource = readFileSync(southeastAsiaMigrationPath, 'utf8');
const backfillMigrationSource = readFileSync(backfillMigrationPath, 'utf8');
const southeastAsiaMigrationPayload = JSON.parse(
  southeastAsiaMigrationSource.match(/\$southeast_asian_dishes\$([\s\S]+?)\$southeast_asian_dishes\$::jsonb/)?.[1] ?? '[]',
);

const expectedCustomSeafoodIngredients = [
  { sourceRef: 'curated:banh-xeo', nameJa: 'ヌクチャム', nameEn: 'curated:banh-xeo:ingredient:10', category: '魚介類', tags: ['fish', 'animal-product'] },
  { sourceRef: 'curated:green-curry', nameJa: '魚醤', nameEn: 'curated:green-curry:ingredient:08', category: '魚介類', tags: ['fish', 'animal-product'] },
  { sourceRef: 'curated:laksa-lemak', nameJa: '干しえび', nameEn: 'curated:laksa-lemak:ingredient:03', category: '甲殻類', tags: ['shellfish', 'animal-product'] },
  { sourceRef: 'curated:amok-trey', nameJa: '白身魚', nameEn: 'curated:amok-trey:ingredient:01', category: '魚介類', tags: ['fish', 'animal-product'] },
  { sourceRef: 'curated:amok-trey', nameJa: '魚醤', nameEn: 'curated:amok-trey:ingredient:08', category: '魚介類', tags: ['fish', 'animal-product'] },
  { sourceRef: 'curated:som-tam', nameJa: '魚醤', nameEn: 'curated:som-tam:ingredient:06', category: '魚介類', tags: ['fish', 'animal-product'] },
  { sourceRef: 'curated:larb-gai', nameJa: '魚醤', nameEn: 'curated:larb-gai:ingredient:04', category: '魚介類', tags: ['fish', 'animal-product'] },
  { sourceRef: 'curated:tom-yum-goong', nameJa: 'えびの殻またはだし', nameEn: 'curated:tom-yum-goong:ingredient:02', category: '甲殻類', tags: ['shellfish', 'animal-product'] },
  { sourceRef: 'curated:tom-yum-goong', nameJa: '魚醤', nameEn: 'curated:tom-yum-goong:ingredient:09', category: '魚介類', tags: ['fish', 'animal-product'] },
  { sourceRef: 'curated:com-tam', nameJa: '魚醤', nameEn: 'curated:com-tam:ingredient:05', category: '魚介類', tags: ['fish', 'animal-product'] },
];

function assertCustomSeafoodKeepsDietaryTags(seedDishes, sourceName) {
  for (const expectation of expectedCustomSeafoodIngredients) {
    const dish = seedDishes.find((item) => item.source_ref === expectation.sourceRef);
    assert.ok(dish, `${sourceName}: ${expectation.sourceRef} を保持してください。`);
    const ingredient = dish.ingredients.find((item) => item.name_ja === expectation.nameJa);

    assert.ok(ingredient, `${sourceName}: ${expectation.sourceRef} には ${expectation.nameJa} が必要です。`);
    assert.equal(
      ingredient.master_name_en,
      null,
      `${sourceName}: ${expectation.nameJa} は review 対象の custom ingredient ケースとして master_name_en=null を保持してください。`,
    );
    assert.deepEqual(
      ingredient.dietary_tags,
      expectation.tags,
      `${sourceName}: ${expectation.sourceRef} の ${expectation.nameJa} は dietary restriction filtering 用の ${expectation.tags.join('/')} dietary_tags を保持してください。`,
    );
    assert.equal(
      ingredient.category,
      expectation.category,
      `${sourceName}: ${expectation.sourceRef} の ${expectation.nameJa} は ${expectation.category} category を保持してください。`,
    );
  }
}

assertCustomSeafoodKeepsDietaryTags(dishes, 'curated-dishes.json');
assertCustomSeafoodKeepsDietaryTags(southeastAsiaMigrationPayload, 'southeast Asian migration payload');

assert.match(
  southeastAsiaMigrationSource,
  /insert into public\.ingredients \(name_ja, name_en, category, dietary_tags\)[\s\S]*coalesce\(s\.dietary_tags, array\[\]::text\[\]\)/i,
  '東南アジア追加 migration は master_name_en=null の custom ingredients でも JSON の dietary_tags を ingredients.dietary_tags へ保存してください。',
);

for (const expectation of expectedCustomSeafoodIngredients) {
  assert.ok(
    backfillMigrationSource.includes(expectation.nameEn),
    `既存 remote DB 用に ${expectation.nameEn} の dietary_tags backfill が必要です。`,
  );
}

console.log('southeast Asian custom seafood dietary tag regression checks passed');
