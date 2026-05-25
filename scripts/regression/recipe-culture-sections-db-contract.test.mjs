import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const migrationSource = readdirSync('supabase/migrations')
  .filter((file) => file.endsWith('.sql'))
  .sort()
  .map((file) => `-- ${file}\n${readFileSync(join('supabase/migrations', file), 'utf8')}`)
  .join('\n');

assert.match(
  migrationSource,
  /create\s+table\s+(?:if\s+not\s+exists\s+)?public\.recipe_culture_sections\s*\([\s\S]*?\)/i,
  'recipe_culture_sections テーブルを migration で作成してください。',
);

assert.match(
  migrationSource,
  /id\s+uuid\s+primary\s+key\s+default\s+gen_random_uuid\(\)/i,
  'recipe_culture_sections.id は uuid primary key default gen_random_uuid() にしてください。',
);
assert.match(
  migrationSource,
  /recipe_id\s+uuid\s+not\s+null\s+references\s+public\.recipes\(id\)\s+on\s+delete\s+cascade/i,
  'recipe_culture_sections.recipe_id は public.recipes(id) on delete cascade を参照してください。',
);
assert.match(
  migrationSource,
  /section_key\s+text\s+not\s+null\s+check\s*\([\s\S]*?section_key\s+in\s*\([\s\S]*?'origin'[\s\S]*?'food_culture'[\s\S]*?\)[\s\S]*?\)/i,
  'section_key は origin / food_culture の check constraint を持たせてください。',
);
for (const column of ['label', 'title', 'body']) {
  assert.match(
    migrationSource,
    new RegExp(`${column}\\s+text\\s+not\\s+null`, 'i'),
    `recipe_culture_sections.${column} は text not null にしてください。`,
  );
}
assert.match(
  migrationSource,
  /sort_order\s+int\s+not\s+null/i,
  'recipe_culture_sections.sort_order は int not null にしてください。',
);
assert.match(
  migrationSource,
  /unique\s*\(\s*recipe_id\s*,\s*section_key\s*\)/i,
  'recipe_culture_sections は unique(recipe_id, section_key) を持たせてください。',
);
assert.match(
  migrationSource,
  /create\s+index[\s\S]*recipe_culture_sections[\s\S]*\(\s*recipe_id\s*,\s*sort_order\s*\)/i,
  'recipe_culture_sections は (recipe_id, sort_order) index を持たせてください。',
);
assert.match(
  migrationSource,
  /alter\s+table\s+public\.recipe_culture_sections\s+enable\s+row\s+level\s+security/i,
  'recipe_culture_sections は RLS を有効化してください。',
);
assert.match(
  migrationSource,
  /on\s+public\.recipe_culture_sections\s+for\s+select[\s\S]*exists\s*\([\s\S]*?from\s+public\.recipes\s+r[\s\S]*?r\.id\s*=\s*recipe_id[\s\S]*?r\.is_public\s*=\s*true[\s\S]*?\(\s*select\s+auth\.uid\(\)\s*\)\s*=\s*r\.created_by/i,
  'culture section select policy は親 recipe が public または本人所有の場合だけ許可してください。',
);
assert.match(
  migrationSource,
  /create\s+unique\s+index[\s\S]{0,300}recipes[\s\S]{0,300}source_ref|alter\s+table[\s\S]{0,300}recipes[\s\S]{0,300}unique[\s\S]{0,160}source_ref|on\s+conflict\s*\([^)]*source_ref[^)]*\)/i,
  'mock recipe seed は stable source_ref で再実行可能に attach できる unique/upsert target を用意してください。',
);
for (const sourceRef of ['mock:rec-lobio', 'mock:rec-gadogado', 'mock:rec-dal', 'mock:rec-tacos']) {
  assert.match(
    migrationSource,
    new RegExp(sourceRef.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
    `${sourceRef} を stable source_ref として seed/upsert してください。`,
  );
}
assert.match(
  migrationSource,
  /on\s+conflict\s*\([\s\S]*?recipe_id\s*,\s*section_key[\s\S]*?\)\s+do\s+update/i,
  'recipe_culture_sections seed は unique(recipe_id, section_key) に対して idempotent upsert してください。',
);

console.log('recipe culture sections DB contract regression checks passed');
