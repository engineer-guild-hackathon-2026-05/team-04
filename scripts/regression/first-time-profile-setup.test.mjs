import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const pageSource = readFileSync('src/app/page.tsx', 'utf8');
const routeSource = readFileSync('src/app/api/me/profile/route.ts', 'utf8');
const apiTypes = readFileSync('src/lib/apiTypes.ts', 'utf8');
const profileView = readFileSync('src/app/components/ProfileView.tsx', 'utf8');

assert.match(
  apiTypes,
  /needsProfileSetup\??:\s*boolean/,
  'ProfileResponse は初回プロフィール設定が必要かを表す needsProfileSetup を含めてください。',
);

assert.match(
  routeSource,
  /const\s+needsProfileSetup\s*=\s*!preferencesError\s*&&\s*!preferences/,
  'GET /api/me/profile は user_preferences 行が未作成の認証ユーザーを初回設定対象として判定してください。',
);
assert.match(
  routeSource,
  /needsProfileSetup,[\s\S]*?satisfies ProfileResponse/,
  'GET /api/me/profile のレスポンスには needsProfileSetup を含めてください。',
);
assert.match(
  routeSource,
  /needsProfileSetup:\s*false[\s\S]*?satisfies ProfileResponse/,
  'demo/PUT など設定済みレスポンスでは needsProfileSetup: false を返してください。',
);

const putStart = routeSource.indexOf('export async function PUT');
const replaceIndex = routeSource.indexOf('await replaceRestrictedIngredients', putStart);
const preferencesUpsertIndex = routeSource.indexOf(".from('user_preferences')", putStart);
assert.ok(
  putStart !== -1 && replaceIndex !== -1 && preferencesUpsertIndex !== -1 && replaceIndex < preferencesUpsertIndex,
  'user_preferences は初回設定完了マーカーを兼ねるため、制限食材の永続化が成功した後に最後に upsert してください。',
);

assert.match(
  pageSource,
  /function\s+getAuthenticatedInitialView\(remoteProfile:[\s\S]*?ProfileResponse[\s\S]*?CurrentView[\s\S]*?needsProfileSetup\s*\?\s*'profile'\s*:\s*'list'/,
  '認証済み初期表示は remoteProfile.needsProfileSetup に応じて profile/list を選択してください。',
);
assert.match(
  pageSource,
  /setCurrentView\(getAuthenticatedInitialView\(remoteProfile\)\)/,
  '通常の認証プロフィール同期後は常に list 固定ではなく getAuthenticatedInitialView を使ってください。',
);
assert.match(
  pageSource,
  /const\s+\[isProfileSetupRequired,\s*setIsProfileSetupRequired\]\s*=\s*useState<boolean>\(false\)/,
  '初回設定中はレシピ一覧へ戻る導線を制御する state を保持してください。',
);
assert.match(
  pageSource,
  /isSetupRequired=\{isProfileSetupRequired\}/,
  'ProfileView へ初回設定必須状態を渡してください。',
);
assert.match(
  profileView,
  /isSetupRequired\??:\s*boolean/,
  'ProfileView は初回設定必須状態を受け取れるようにしてください。',
);

assert.match(
  pageSource,
  /const\s+handleNavigateHome\s*=\s*\(\)\s*=>\s*\{[\s\S]*?if\s*\(isProfileSetupRequired\)\s*\{[\s\S]*?setCurrentView\('profile'\)[\s\S]*?return;[\s\S]*?if\s*\(isLoggedIn\)/,
  '初回設定必須中の Navbar/logo ホーム移動はレシピ一覧ではなく profile に留めてください。',
);
assert.match(
  pageSource,
  /currentView\s*===\s*'list'\s*&&\s*!isProfileSetupRequired\s*&&\s*\([\s\S]*?<ListView/,
  '初回設定必須中は state が list になっても ListView を描画しないでください。',
);
assert.match(
  pageSource,
  /\(currentView\s*===\s*'profile'\s*\|\|\s*isProfileSetupRequired\)\s*&&\s*\([\s\S]*?<ProfileView/,
  '初回設定必須中は ProfileView を強制表示してください。',
);

const saveProfileStart = pageSource.indexOf('const handleSaveProfile = async');
const saveProfileEnd = pageSource.indexOf(`  };

  if (authStatus`, saveProfileStart);
assert.ok(saveProfileStart !== -1 && saveProfileEnd > saveProfileStart, 'handleSaveProfile の範囲を検査できません。');
const saveProfileBlock = pageSource.slice(saveProfileStart, saveProfileEnd);
const firstListNavigation = saveProfileBlock.indexOf("setCurrentView('list')");
const setupRequiredGuard = saveProfileBlock.indexOf('if (!isProfileSetupRequired)');
assert.ok(setupRequiredGuard !== -1 && firstListNavigation > setupRequiredGuard, '初回設定必須中は保存開始時に list へ遷移しないでください。');
assert.match(
  saveProfileBlock,
  /if\s*\(!savedProfile\)\s*\{[\s\S]*?if\s*\(isProfileSetupRequired\)\s*\{[\s\S]*?setCurrentView\('profile'\)[\s\S]*?throw new Error[\s\S]*?saveToLocalStorage\(profile\)/,
  '初回設定必須中の 401/null 保存結果は local 完了扱いにせず profile に留めてください。',
);
assert.match(
  saveProfileBlock,
  /dbErr\s+instanceof\s+ProfileSaveValidationError[\s\S]*?throw new Error/,
  'validation error も成功トーストにせず ProfileView へ失敗として返してください。',
);
assert.match(
  saveProfileBlock,
  /catch\s*\(dbErr\)\s*\{[\s\S]*?if\s*\(isProfileSetupRequired\)\s*\{[\s\S]*?setCurrentView\('profile'\)[\s\S]*?throw new Error[\s\S]*?saveToLocalStorage\(profile\)/,
  '初回設定必須中の DB 保存失敗は local fallback で完了扱いにせず profile に留めてください。',
);

assert.match(
  profileView,
  /const\s+handleSubmit\s*=\s*async/,
  'ProfileView は onSaveProfile の完了を待ってから成功表示してください。',
);
assert.match(
  profileView,
  /catch\s*\(error\)[\s\S]*?setSaveError/,
  'ProfileView は保存失敗時に成功扱いにせずエラーを表示してください。',
);
assert.match(
  profileView,
  /save-error-alert/,
  'ProfileView は保存失敗をユーザーに表示してください。',
);
assert.match(
  profileView,
  /<button[^>]*type=\"submit\"[^>]*disabled=\{isSaving\}/,
  'ProfileView は保存中の二重送信を防いでください。',
);

assert.match(
  profileView,
  /!isSetupRequired\s*&&\s*\([\s\S]*?back-to-recipes-btn/,
  '初回設定必須時はプロフィール保存前にレシピ一覧へ戻るボタンを表示しないでください。',
);

const getAuthenticatedInitialView = (remoteProfile) => remoteProfile?.needsProfileSetup ? 'profile' : 'list';
assert.equal(getAuthenticatedInitialView({ needsProfileSetup: true }), 'profile');
assert.equal(getAuthenticatedInitialView({ needsProfileSetup: false }), 'list');
assert.equal(getAuthenticatedInitialView(null), 'list');

const buildNeedsProfileSetup = ({ preferences, preferencesError }) => !preferencesError && !preferences;
assert.equal(buildNeedsProfileSetup({ preferences: null, preferencesError: null }), true);
assert.equal(buildNeedsProfileSetup({ preferences: { preferred_dishes: [] }, preferencesError: null }), false);
assert.equal(buildNeedsProfileSetup({ preferences: null, preferencesError: new Error('read failed') }), false);

console.log('first-time profile setup regression checks passed');
