import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const loginSource = readFileSync('src/app/login/page.tsx', 'utf8');
const pageSource = readFileSync('src/app/page.tsx', 'utf8');
const profileSource = readFileSync('src/app/components/ProfileView.tsx', 'utf8');
const profileRouteSource = readFileSync('src/app/api/me/profile/route.ts', 'utf8');
const authDocs = readFileSync('docs/auth.md', 'utf8');

const previousSignInFlow = (demoResult) => {
  if (demoResult === 'authenticated') return 'demo';
  if (demoResult === 'failed') return 'demo-error';
  return 'supabase-password';
};
const fixedSignInFlow = (demoResult) => {
  if (demoResult === 'authenticated') return 'demo';
  return 'supabase-password';
};
assert.equal(
  previousSignInFlow('failed'),
  'demo-error',
  '再現: demo probe failed をログイン失敗扱いにすると通常の password auth に進みません。',
);
assert.equal(
  fixedSignInFlow('failed'),
  'supabase-password',
  '修正: demo probe failed でも Supabase password auth へ fallback してください。',
);
assert.doesNotMatch(
  loginSource,
  /demoSignInResult === 'failed'\) \{[\s\S]*setErrorMessage\('デモログインに失敗しました[\s\S]*return;/,
  'demo probe failed で早期 return して通常ログインを塞がないでください。',
);
assert.match(
  loginSource,
  /Demo login probe failed\. Falling back to Supabase password auth\./,
  'demo probe failed は警告ログに留め、通常ログインへ進めてください。',
);

const previousReasonForInsert = () => 'allergy';
const fixedReasonForInsert = (localId, reasons) => reasons[localId] ?? (localId === 'ing-pork' ? 'religious' : 'allergy');
assert.equal(
  previousReasonForInsert('ing-pork', { 'ing-pork': 'religious' }),
  'allergy',
  '再現: reason 固定だと宗教上の制限が allergy として保存されます。',
);
assert.equal(
  fixedReasonForInsert('ing-pork', { 'ing-pork': 'religious' }),
  'religious',
  '修正: 選択元から渡された restriction reason を DB insert に反映してください。',
);
assert.match(
  profileSource,
  /type RestrictionReason = 'allergy' \| 'dislike' \| 'religious'/,
  'ProfileView は制限の選択元 reason を型として扱ってください。',
);
assert.match(
  profileSource,
  /reason: 'religious'/,
  '宗教上の制限 UI から選んだ項目には religious reason を付与してください。',
);
assert.match(
  pageSource,
  /restrictedIngredientReasons\??: Record<string, RestrictionReason>/,
  '保存フローは restrictedIngredients と別に reason map を受け渡してください。',
);
assert.match(
  profileRouteSource,
  /restrictionReasons: Record<string, RestrictionReason>/,
  'API保存フローは restrictedIngredients と別に reason map を受け取ってください。',
);
assert.match(
  profileRouteSource,
  /reason\s*=\s*code[\s\S]*restrictionReasons\[code\]/,
  'DB insert の reason は allergy 固定ではなく ingredient_code ごとの reason map を使ってください。',
);
assert.doesNotMatch(
  profileRouteSource,
  /reason:\s*'allergy',\n\s*\}\)\);/,
  'replaceRestrictedIngredients に reason: allergy 固定 insert を再導入しないでください。',
);

assert.match(
  profileRouteSource,
  /\.select\('id, ingredient_code, name_ja'\)[\s\S]*\.in\('ingredient_code', ingredientCodes\)/,
  'DB ingredient とフロントの照合は一意キー ingredient_code を基準にしてください。',
);
assert.match(
  profileRouteSource,
  /restrictedIngredientReasons/,
  'プロフィールAPIは保存済み reason map をレスポンスへ返してください。',
);
assert.doesNotMatch(
  profileRouteSource,
  /\.in\('name_ja',/,
  '一意制約のない name_ja で DB ingredient を解決しないでください。',
);

assert.match(
  authDocs,
  /\/auth\/demo` へ `DELETE`[\s\S]*`supabase\.auth\.signOut\(\)`/,
  'docs/auth.md のログアウト手順は現行クライアント実装に合わせてください。',
);
assert.doesNotMatch(
  authDocs,
  /POST で `\/auth\/signout` を叩く。[\s\S]*<form method="post" action="\/auth\/signout">/,
  '未使用の form POST /auth/signout を主要ログアウト手順として案内しないでください。',
);

console.log('PR review follow-up fix regression checks passed');
