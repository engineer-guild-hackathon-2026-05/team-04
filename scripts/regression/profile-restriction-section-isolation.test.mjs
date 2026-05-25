import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const profileSource = readFileSync('src/app/components/ProfileView.tsx', 'utf8');

const previousSelectedOptions = (selectedRestricted, options) =>
  options.filter((option) => selectedRestricted.includes(option.id));
const fixedSelectedOptions = (selectedRestricted, reasons, reason, options) =>
  options.filter((option) => selectedRestricted.includes(option.id) && (reasons[option.id] ?? 'allergy') === reason);

const allergyOptions = [{ id: 'ing-shrimp', label: 'えび' }];
const religiousOptions = [{ id: 'ing-shrimp', label: 'えび' }];
assert.deepEqual(
  previousSelectedOptions(['ing-shrimp'], allergyOptions).map((option) => option.label),
  ['えび'],
  '再現: 宗教上の えび だけを選んでも id 共有により allergy section にも表示されます。',
);
assert.deepEqual(
  fixedSelectedOptions(['ing-shrimp'], { 'ing-shrimp': 'religious' }, 'allergy', allergyOptions),
  [],
  '修正: 宗教上の えび は allergy section の選択済みタグへ表示しません。',
);
assert.deepEqual(
  fixedSelectedOptions(['ing-shrimp'], { 'ing-shrimp': 'religious' }, 'religious', religiousOptions).map((option) => option.label),
  ['えび'],
  '修正: 宗教上の えび は religious section の選択済みタグにだけ表示します。',
);

assert.match(
  profileSource,
  /const\s+getRestrictionReason\s*=\s*\(id:\s*string\)\s*=>\s*selectedRestrictionReasons\[id\]\s*\?\?\s*['"]allergy['"]/,
  'ProfileView は既存保存データ互換のため、未設定 reason を allergy として扱う helper を持ってください。',
);
assert.match(
  profileSource,
  /const\s+isRestrictionSelectedForReason\s*=\s*\([\s\S]*?getVisibleRestrictionReason\(id\)\s*===\s*reason/,
  'ProfileView の chip active 判定は id だけでなく section reason と条件制限の既定 reason も確認してください。',
);
assert.match(
  profileSource,
  /const\s+getSelectedOptions\s*=\s*\(options:\s*SelectableOption\[\],\s*reason:\s*RestrictionReason\)[\s\S]*?isRestrictionSelectedForReason\(option\.id,\s*reason\)/,
  'ProfileView の選択済みタグは section reason ごとに分離してください。',
);
assert.match(
  profileSource,
  /currentReason\s*!==\s*nextReason[\s\S]*setSelectedRestrictionReasons/,
  '別 section で同じ ingredient を選び直した場合は、削除ではなく reason を移動してください。',
);
assert.match(
  profileSource,
  /selectedRestricted\.map\(\(id\) => \[id,\s*getVisibleRestrictionReason\(id\)\]\)/,
  'ProfileView の保存 payload は diet-* / prep-* の既定 reason を allergy ではなく dislike として保存してください。',
);
assert.match(
  profileSource,
  /selectedOptions:\s*getSelectedOptions\(allergyOptions,\s*['"]allergy['"]\)/,
  'アレルギー要素の selectedOptions は allergy reason だけを渡してください。',
);
assert.match(
  profileSource,
  /selectedOptions:\s*getSelectedOptions\(RELIGIOUS_RESTRICTION_OPTIONS,\s*['"]religious['"]\)/,
  '宗教上食べられない食品・食材の selectedOptions は religious reason だけを渡してください。',
);

console.log('profile restriction section isolation regression checks passed');
