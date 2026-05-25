import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync('src/app/globals.css', 'utf8');

for (const selector of ['.modal-bookmark-tabs', '.modal-bookmark-tab']) {
  assert.match(
    source,
    new RegExp(selector.replace('.', '\\.') + '\\s*\\{'),
    `${selector} の bookmark tab styling を追加してください。`,
  );
}
assert.match(
  source,
  /\.modal-bookmark-tab(?:\.active|\[aria-selected=['"]true['"]\])|\.modal-bookmark-tab[\s\S]*aria-selected/,
  'active/selected bookmark tab の見た目を定義してください。',
);
assert.match(
  source,
  /\.modal-bookmark-tab:hover,\s*\.modal-bookmark-tab:focus-visible,\s*\.modal-bookmark-tab\.active,\s*\.modal-bookmark-tab\[aria-selected=["']true["']\]\s*\{[\s\S]*?width:\s*104px[\s\S]*?transform:\s*translateX\(-2px\)/,
  '選択中の bookmark tab は hover/focus-visible と同じ伸びた状態を維持してください。',
);
assert.match(
  source,
  /\.modal-bookmark-tab:focus-visible\s*\{[\s\S]*?(?:outline|box-shadow)/,
  'bookmark tab は focus-visible styling を持つ必要があります。',
);
assert.match(
  source,
  /\.modal-culture-article\s*\{[\s\S]*?\}/,
  '由来/食文化の読み物用 .modal-culture-article styling を追加してください。',
);
assert.match(
  source,
  /\.modal-tab-panel\[hidden\],[\s\S]*?\.modal-tab-panel-placeholder\[hidden\][\s\S]*?display:\s*none\s*!important/,
  '非active tabpanel は .modal-content の flex 表示で可視領域を消費しないよう display:none を明示してください。',
);
assert.match(
  source,
  /@media\s*\([^)]*max-width[\s\S]*?\.modal-bookmark-tabs[\s\S]*?(?:flex-direction|position|overflow|grid-template|flex-wrap)/,
  'small screen media block で bookmark tabs が横はみ出ししない responsive layout を定義してください。',
);


const smallScreenBlock = source.match(/@media\s*\([^)]*max-width[\s\S]*?\n\}/)?.[0] ?? '';
const mobileBookmarkTabsDefinitions = smallScreenBlock.match(/\.modal-bookmark-tabs\s*\{/g) ?? [];
assert.equal(
  mobileBookmarkTabsDefinitions.length,
  1,
  'small screen media block 内の .modal-bookmark-tabs 定義は 1 箇所に統合してください。',
);

console.log('recipe modal culture CSS regression checks passed');
