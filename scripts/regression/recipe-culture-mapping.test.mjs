import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync('src/lib/recipeMapping.ts', 'utf8');

assert.match(
  source,
  /type\s+RecipeCultureSectionJoinRow|recipe_culture_sections\??\s*:/,
  'recipeMapping は recipe_culture_sections join row を受け取れる型/入力を定義してください。',
);
assert.match(
  source,
  /normalize\w*CultureSections\s*\(/,
  'recipeMapping には culture section 正規化関数を追加してください。',
);
assert.match(
  source,
  /section_key[\s\S]*['"]origin['"][\s\S]*['"]food_culture['"]|['"]origin['"][\s\S]*['"]food_culture['"][\s\S]*section_key/,
  'culture section mapper は origin / food_culture の section_key だけを採用してください。',
);
for (const field of ['label', 'title', 'body']) {
  assert.match(
    source,
    new RegExp(`(?:typeof\\s+[^;\n]*${field}[^;\n]*===\\s*['"]string['"][\\s\\S]*?\\.trim\\(\\)|${field}[^;\n]*\\.trim\\(\\)[\\s\\S]*?length|isNonEmptyString\\([^)]*${field}[^)]*\\))`, 'i'),
    `culture section mapper は ${field} が空でない文字列か検証してください。`,
  );
}
assert.match(
  source,
  /typeof\s+[^;\n]*sort_order[^;\n]*===\s*['"]number['"]|Number\.isFinite\([^)]*sort_order[^)]*\)/,
  'culture section mapper は sort_order が number であることを検証してください。',
);
assert.match(
  source,
  /\.sort\s*\(\s*\([^)]*\)\s*=>\s*[^;\n]*sort_order\s*-\s*[^;\n]*sort_order/,
  'culture section mapper は sort_order 昇順に並べ替えてください。',
);
assert.match(
  source,
  /culture_sections\s*:\s*normalize\w*CultureSections\(row\.recipe_culture_sections\)|culture_sections\s*:\s*\[\]/,
  'mapRecipeRowToRecipe は missing 時も culture_sections: [] を返してください。',
);
assert.match(
  source,
  /\.filter\s*\([^)]*section[^)]*\)|\.filter\s*\([^)]*Boolean[^)]*\)/,
  'malformed culture section row は UI に渡さず drop してください。',
);

console.log('recipe culture mapping regression checks passed');
