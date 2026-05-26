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
  /create\s+table\s+(?:if\s+not\s+exists\s+)?public\.recipe_related_recipes\s*\([\s\S]*?\)/i,
  'recipe_related_recipes テーブルを migration で作成してください。',
);
assert.match(
  migrationSource,
  /constraint\s+recipe_related_recipes_recipe_id_fkey\s+foreign\s+key\s*\(\s*recipe_id\s*\)\s+references\s+public\.recipes\(id\)\s+on\s+delete\s+cascade/i,
  '親 recipe_id FK は recipe_related_recipes_recipe_id_fkey という固定名にしてください。',
);
assert.match(
  migrationSource,
  /constraint\s+recipe_related_recipes_related_recipe_id_fkey\s+foreign\s+key\s*\(\s*related_recipe_id\s*\)\s+references\s+public\.recipes\(id\)\s+on\s+delete\s+cascade/i,
  'related_recipe_id FK は recipe_related_recipes_related_recipe_id_fkey という固定名にしてください。',
);
assert.match(
  migrationSource,
  /section_key\s+text\s+not\s+null\s+check\s*\([\s\S]*?section_key\s+in\s*\([\s\S]*?'origin'[\s\S]*?'food_culture'[\s\S]*?\)[\s\S]*?\)/i,
  'section_key は origin / food_culture のみ許可してください。',
);
assert.match(migrationSource, /reason_label\s+text/i, 'reason_label は任意表示用の text として保持してください。');
assert.match(migrationSource, /sort_order\s+int\s+not\s+null/i, 'sort_order は int not null にしてください。');
assert.match(
  migrationSource,
  /check\s*\(\s*recipe_id\s*<>\s*related_recipe_id\s*\)|constraint\s+[^\n]*no_self[^\n]*check\s*\([\s\S]*?recipe_id\s*<>\s*related_recipe_id[\s\S]*?\)/i,
  '同一レシピを関連先にできない check constraint を追加してください。',
);
assert.match(
  migrationSource,
  /unique\s*\(\s*recipe_id\s*,\s*section_key\s*,\s*related_recipe_id\s*\)/i,
  '同じタブで同一関連レシピを重複登録しない unique 制約を追加してください。',
);
assert.match(
  migrationSource,
  /unique\s*\(\s*recipe_id\s*,\s*section_key\s*,\s*sort_order\s*\)/i,
  'タブ内表示順を安定させる unique(recipe_id, section_key, sort_order) を追加してください。',
);
assert.match(
  migrationSource,
  /create\s+index[\s\S]*recipe_related_recipes[\s\S]*\(\s*recipe_id\s*,\s*section_key\s*,\s*sort_order\s*\)/i,
  'recipe_related_recipes は (recipe_id, section_key, sort_order) index を持たせてください。',
);
assert.match(
  migrationSource,
  /alter\s+table\s+public\.recipe_related_recipes\s+enable\s+row\s+level\s+security/i,
  'recipe_related_recipes は RLS を有効化してください。',
);
assert.match(
  migrationSource,
  /on\s+public\.recipe_related_recipes\s+for\s+select[\s\S]*exists\s*\([\s\S]*?from\s+public\.recipes\s+r[\s\S]*?r\.id\s*=\s*recipe_id[\s\S]*?\)[\s\S]*exists\s*\([\s\S]*?from\s+public\.recipes\s+related[\s\S]*?related\.id\s*=\s*related_recipe_id[\s\S]*?\)/i,
  'select policy は親 recipe と関連先 recipe の両方が閲覧可能な場合だけ許可してください。',
);
assert.match(
  migrationSource,
  /insert\s+into\s+public\.recipe_related_recipes[\s\S]*?on\s+conflict\s*\(\s*recipe_id\s*,\s*section_key\s*,\s*related_recipe_id\s*\)\s+do\s+update/i,
  '関連レシピ seed は idempotent upsert にしてください。',
);

console.log('recipe related recipes DB contract regression checks passed');
