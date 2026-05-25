import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync('src/app/components/ListView.tsx', 'utf8');
const styleSource = readFileSync('src/app/globals.css', 'utf8');

assert.match(
  source,
  /const\s+handleRecipeCardKeyDown\s*=\s*\(event:\s*React\.KeyboardEvent<HTMLElement>,\s*recipe:\s*Recipe\)\s*=>/,
  'recipe card を Enter/Space で開く keyboard handler を追加してください。',
);
assert.match(
  source,
  /event\.key\s*===\s*'Enter'[\s\S]*event\.key\s*===\s*' '/,
  'keyboard handler は Enter と Space の両方を activation key として扱ってください。',
);
assert.match(
  source,
  /onSelectRecipe\(recipe\)/,
  'keyboard activation は click と同じ onSelectRecipe(recipe) を呼んでください。',
);

const roleCount = (source.match(/role="button"/g) ?? []).length;
const tabIndexCount = (source.match(/tabIndex=\{0\}/g) ?? []).length;
const keyDownCount = (source.match(/onKeyDown=\{\(event\)\s*=>\s*handleRecipeCardKeyDown\(event,\s*recipe\)\}/g) ?? []).length;
const ariaLabelCount = (source.match(/aria-label=\{`\$\{recipe\.title\}のレシピ詳細を開く`\}/g) ?? []).length;

assert.ok(roleCount >= 2, 'featured と secondary の recipe article は button role を持つ必要があります。');
assert.ok(tabIndexCount >= 2, 'featured と secondary の recipe article は keyboard focus 可能にしてください。');
assert.ok(keyDownCount >= 2, 'featured と secondary の recipe article は Enter/Space handler を接続してください。');
assert.ok(ariaLabelCount >= 2, 'featured と secondary の recipe article は screen reader 用の動的 aria-label を持つ必要があります。');

assert.match(
  styleSource,
  /\.recipe-card:focus-visible\s*\{[\s\S]*outline:/,
  'keyboard focus が視覚的に分かるよう .recipe-card:focus-visible を追加してください。',
);

console.log('recipe card keyboard accessibility regression checks passed');
