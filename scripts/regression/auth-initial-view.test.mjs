import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync('src/app/page.tsx', 'utf8');

assert.match(
  source,
  /type\s+AuthStatus\s*=\s*'checking'\s*\|\s*'authenticated'\s*\|\s*'unauthenticated'/,
  '認証状態は、未確認(checking)と確認済み(authenticated/unauthenticated)を区別してください。',
);

assert.match(
  source,
  /useState<AuthStatus>\('checking'\)/,
  '初回描画ではログアウト扱いにせず、認証確認中から開始してください。',
);

assert.doesNotMatch(
  source,
  /useState<CurrentView>\('landing'\)/,
  'ログイン済み更新時にLPが一瞬表示されるため、currentView の初期値を landing に戻さないでください。',
);

const authCheckingGuardIndex = source.indexOf("authStatus === 'checking'");
const navbarIndex = source.indexOf('<Navbar');
const landingViewIndex = source.indexOf('<LandingView');

assert.ok(authCheckingGuardIndex !== -1, '認証確認中のローディング表示を追加してください。');
assert.ok(navbarIndex !== -1 && landingViewIndex !== -1, 'Navbar と LandingView の描画位置を検査できません。');
assert.ok(
  authCheckingGuardIndex < navbarIndex && authCheckingGuardIndex < landingViewIndex,
  '認証確認中は Navbar や LandingView より先にローディング表示へ分岐してください。',
);

assert.match(
  source,
  /authStatus\s*===\s*'unauthenticated'\s*&&\s*currentView\s*===\s*'landing'\s*&&\s*\(\s*<LandingView/,
  'LandingView は認証確認後の未ログイン状態でのみ描画してください。',
);

assert.match(
  source,
  /setAuthStatus\('authenticated'\)/,
  '認証済みセッション確定時に authStatus を authenticated にしてください。',
);

assert.match(
  source,
  /setAuthStatus\('unauthenticated'\)/,
  '未ログイン確定時に authStatus を unauthenticated にしてください。',
);


console.log('auth initial view regression checks passed');
