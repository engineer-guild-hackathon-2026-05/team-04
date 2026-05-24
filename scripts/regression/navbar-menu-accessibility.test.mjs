import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync('src/app/components/Navbar.tsx', 'utf8');

const previousAvatarLabel = (userName) => {
  const trimmedName = userName.trim();
  if (!trimmedName) return 'G';
  return trimmedName.slice(0, 1).toUpperCase();
};

const fixedAvatarLabel = (userName) => {
  const trimmedName = userName.trim();
  if (!trimmedName) return 'G';
  return (Array.from(trimmedName)[0] ?? 'G').toLocaleUpperCase('ja-JP');
};

assert.notEqual(
  previousAvatarLabel('🍜ラーメン'),
  '🍜',
  '再現: slice(0, 1) はサロゲートペアの絵文字を壊した1コードユニットだけ返します。',
);
assert.equal(
  fixedAvatarLabel('🍜ラーメン'),
  '🍜',
  '修正: アバターの先頭文字は Unicode code point 単位で取得してください。',
);

assert.doesNotMatch(
  source,
  /\.slice\(0,\s*1\)/,
  'getAvatarLabel に slice(0, 1) を再導入しないでください。絵文字などのサロゲートペアを破壊します。',
);
assert.match(
  source,
  /Array\.from\(trimmedName\)\[0\]/,
  'getAvatarLabel は Array.from(trimmedName)[0] で Unicode-safe に先頭文字を取得してください。',
);

assert.match(
  source,
  /isProfileMenuOpen\s*\?\s*'プロフィールメニューを閉じる'\s*:\s*'プロフィールメニューを開く'/,
  'プロフィールメニューボタンの aria-label は開閉状態に合わせて変更してください。',
);

assert.match(
  source,
  /if \(isProfileMenuOpen\) \{[\s\S]*focusProfileMenuItem\(focusTarget\)/,
  'メニューがすでに開いている状態でも、トリガーキー操作で直接メニュー項目へフォーカス移動してください。',
);
assert.match(
  source,
  /openProfileMenu\('first'\)/,
  'ArrowDown / Enter / Space はプロフィール設定項目へフォーカスする intent を渡してください。',
);
assert.match(
  source,
  /openProfileMenu\('last'\)/,
  'ArrowUp は最後のメニュー項目へフォーカスする intent を渡してください。',
);

console.log('navbar menu accessibility regression checks passed');
