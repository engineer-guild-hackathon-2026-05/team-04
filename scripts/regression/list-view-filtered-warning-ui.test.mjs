import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync('src/app/components/ListView.tsx', 'utf8');

assert.match(
  source,
  /const containsRestrictedIngredient = recipe\.ingredients\.some[\s\S]*?restrictedIngredients\.includes\(ingredient\.id\)[\s\S]*?return matchesQuery && !containsRestrictedIngredient;/,
  'ListView は制限食材を含むレシピをカード描画前に除外してください。',
);

assert.doesNotMatch(
  source,
  /getAllergenWarnings|has-allergen-warning|allergen-warning-alert|AlertTriangle/,
  '制限食材を含むレシピは除外済みなので、ListView の到達不能な警告UI/判定を残さないでください。',
);

console.log('list-view filtered warning UI regression checks passed');
