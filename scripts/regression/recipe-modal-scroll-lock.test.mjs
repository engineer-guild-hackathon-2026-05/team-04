import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const modalSource = readFileSync('src/app/components/RecipeModal.tsx', 'utf8');
const css = readFileSync('src/app/globals.css', 'utf8');

assert.match(
  modalSource,
  /window\.scrollY|window\.pageYOffset/,
  'RecipeModal は open 時の背景スクロール位置を保存してください。',
);
assert.match(
  modalSource,
  /document\.documentElement\.style\.overflow\s*=\s*['"]hidden['"]|document\.documentElement\.classList\.add\([^)]*modal-scroll-locked/,
  'RecipeModal は body だけでなく html/documentElement 側もスクロールロックしてください。',
);
assert.match(
  modalSource,
  /document\.body\.style\.position\s*=\s*['"]fixed['"]/,
  'モバイルの背景スクロール漏れを防ぐため、modal open 中は body を fixed にしてください。',
);
assert.match(
  modalSource,
  /document\.body\.style\.top\s*=\s*`-\$\{[^}]+\}px`|document\.body\.style\.top\s*=\s*['"]-['"]\s*\+/,
  'body fixed による画面ジャンプを防ぐため、保存した scrollY を top に反映してください。',
);
assert.match(
  modalSource,
  /window\.scrollTo\(\s*0\s*,\s*[^)]*scrollY|window\.scrollTo\(\{[\s\S]*top\s*:/,
  'RecipeModal close 時は保存した背景スクロール位置へ復元してください。',
);
assert.match(
  modalSource,
  /previous\w*Style|original\w*Style|prev\w*Overflow/,
  'RecipeModal の scroll lock cleanup は既存 inline style を復元してください。',
);

assert.match(
  css,
  /\.modal-overlay\s*\{[\s\S]*?overscroll-behavior\s*:\s*(?:contain|none)/,
  'modal overlay は wheel/touch の scroll chaining を背景へ逃がさないでください。',
);
assert.match(
  css,
  /\.modal-card\s*\{[\s\S]*?min-height\s*:\s*0/,
  'modal-card は flex 子の内部スクロールを成立させるため min-height: 0 を持ってください。',
);
assert.match(
  css,
  /\.modal-hero-image-wrapper\s*\{[\s\S]*?flex-shrink\s*:\s*0/,
  'modal hero は本文スクロール領域に高さを渡すため縮まない固定領域にしてください。',
);
assert.match(
  css,
  /\.modal-body-with-tabs\s*\{[\s\S]*?flex\s*:\s*1[\s\S]*?min-height\s*:\s*0/s,
  'modal-body-with-tabs は modal-card 内で残り高さを受け取り、内部スクロール可能にしてください。',
);
assert.match(
  css,
  /\.modal-content\s*\{[\s\S]*?overflow-y\s*:\s*auto[\s\S]*?overscroll-behavior\s*:\s*contain/s,
  'modal-content は背景ではなく本文だけをスクロールさせる scroll container にしてください。',
);
assert.match(
  css,
  /\.modal-content\s*\{[\s\S]*?-webkit-overflow-scrolling\s*:\s*touch/,
  'modal-content はモバイルの慣性スクロールを許可してください。',
);
assert.match(
  css,
  /\.modal-footer\s*\{[\s\S]*?flex-shrink\s*:\s*0/,
  'modal footer は本文スクロール領域に高さを渡すため縮まない固定領域にしてください。',
);

console.log('recipe modal scroll lock regression checks passed');
