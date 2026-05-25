import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const routeSource = readFileSync('src/app/api/recipes/route.ts', 'utf8');
const mockDataSource = readFileSync('src/lib/mockData.ts', 'utf8');
const apiTypesSource = readFileSync('src/lib/apiTypes.ts', 'utf8');

assert.match(
  routeSource,
  /recipe_culture_sections\s*\([\s\S]*?section_key[\s\S]*?label[\s\S]*?title[\s\S]*?body[\s\S]*?sort_order[\s\S]*?\)/,
  '/api/recipes select は recipe_culture_sections(section_key,label,title,body,sort_order) を取得してください。',
);

assert.match(
  mockDataSource,
  /export\s+type\s+RecipeCultureSectionKey\s*=\s*['"]origin['"]\s*\|\s*['"]food_culture['"]|export\s+type\s+RecipeCultureSectionKey\s*=\s*['"]food_culture['"]\s*\|\s*['"]origin['"]/,
  'RecipeCultureSectionKey は origin / food_culture の union として公開してください。',
);
assert.match(
  mockDataSource,
  /export\s+interface\s+RecipeCultureSection\s*\{[\s\S]*?key\s*:\s*RecipeCultureSectionKey[\s\S]*?label\s*:\s*string[\s\S]*?title\s*:\s*string[\s\S]*?body\s*:\s*string[\s\S]*?sort_order\s*:\s*number[\s\S]*?\}/,
  'RecipeCultureSection は key/label/title/body/sort_order を持つ型にしてください。',
);
assert.match(
  mockDataSource,
  /interface\s+Recipe\s*\{[\s\S]*?culture_sections\s*:\s*RecipeCultureSection\[\]/,
  'Recipe 型には culture_sections: RecipeCultureSection[] を追加してください。',
);
assert.match(
  apiTypesSource,
  /import\s+type\s+\{\s*Recipe\s*\}\s+from\s+['"]\.\/mockData['"]|recipes\s*:\s*Recipe\[\]/,
  'RecipesResponse は culture_sections を含む Recipe 型を返す契約を維持してください。',
);

console.log('recipe culture API contract regression checks passed');
