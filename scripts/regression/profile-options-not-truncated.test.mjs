import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const profileView = readFileSync('src/app/components/ProfileView.tsx', 'utf8');

assert.doesNotMatch(
  profileView,
  /visible[A-Za-z]*Options[\s\S]{0,160}\.slice\(0,/,
  'プロフィール設定の候補一覧は未検索時に先頭件数で切り捨てないでください。',
);
assert.doesNotMatch(
  profileView,
  /allergyOptions\.slice\(0,/,
  'アレルギー候補はピスタチオやマカダミアナッツなど後方の項目も初期表示してください。',
);
assert.match(
  profileView,
  /const visibleAllergyOptions = allergyOptions\.filter\(option => matchesOption\(option, allergyQuery\)\);/,
  'アレルギー候補は検索語が空なら matchesOption 経由で全件表示してください。',
);

console.log('profile option list no-truncation regression checks passed');
