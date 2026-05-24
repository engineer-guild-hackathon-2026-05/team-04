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

assert.match(
  source,
  /if \(authStatus === 'checking'\) \{\s*return \([\s\S]*?role="status"[\s\S]*?\);\s*\}\s*return \(/,
  '認証確認中は実際の早期returnでローディング表示し、Navbar/LandingViewを描画しないでください。',
);

assert.match(
  source,
  /authStatus\s*===\s*'unauthenticated'\s*&&\s*currentView\s*===\s*'landing'\s*&&\s*\(\s*<LandingView/,
  'LandingView は認証確認後の未ログイン状態でのみ描画してください。',
);

assert.match(
  source,
  /if \(demoSession === 'authenticated'\) \{[\s\S]*?setIsLoggedIn\(true\);[\s\S]*?setCurrentView\('list'\);[\s\S]*?setAuthStatus\('authenticated'\);[\s\S]*?return;/,
  'デモ認証済み分岐では、ログイン済み/list/authenticated を同じ分岐内で確定してください。',
);

assert.match(
  source,
  /if \(demoSession === 'unauthenticated'\) \{[\s\S]*?setIsLoggedIn\(false\);[\s\S]*?setCurrentView\('landing'\);[\s\S]*?setAuthStatus\('unauthenticated'\);[\s\S]*?return;/,
  'デモ未ログイン分岐では、未ログイン/landing/unauthenticated を同じ分岐内で確定してください。',
);

const failedBlockStart = source.indexOf("if (demoSession === 'failed')");
const supabaseFallbackStart = source.indexOf('const supabase = createClient();', failedBlockStart);
assert.ok(failedBlockStart !== -1 && supabaseFallbackStart !== -1, 'デモ認証チェック失敗時のSupabase fallbackを検査できません。');
const failedBlock = source.slice(failedBlockStart, supabaseFallbackStart);
assert.doesNotMatch(
  failedBlock,
  /setAuthStatus\('unauthenticated'\)|return;/,
  'デモ認証チェック失敗だけで未ログイン確定せず、Supabase セッション確認へフォールバックしてください。',
);
assert.match(
  failedBlock,
  /Falling back to Supabase auth/,
  'デモ認証チェック失敗時はSupabase セッション確認へフォールバックすることを明示してください。',
);
assert.match(
  source.slice(supabaseFallbackStart),
  /const supabase = createClient\(\);[\s\S]*?supabase\.auth\.getSession\(\)/,
  'デモ認証チェック失敗時はSupabase セッション確認へフォールバックしてください。',
);

assert.match(
  source,
  /if \(!session\?\.user\) \{[\s\S]*?setIsLoggedIn\(false\);[\s\S]*?setCurrentView\('landing'\);[\s\S]*?setAuthStatus\('unauthenticated'\);[\s\S]*?return;/,
  'Supabase セッションなし分岐では、未ログイン/landing/unauthenticated を同じ分岐内で確定してください。',
);

assert.match(
  source,
  /setIsLoggedIn\(true\);\s*setCurrentView\('list'\);\s*setAuthStatus\('authenticated'\);/,
  'Supabase セッションあり分岐では、ログイン済み/list/authenticated を連動して確定してください。',
);

assert.match(
  source,
  /catch \(error\) \{[\s\S]*?Auth session sync failed[\s\S]*?setIsLoggedIn\(false\);[\s\S]*?setCurrentView\('landing'\);[\s\S]*?setAuthStatus\('unauthenticated'\);[\s\S]*?\}/,
  '認証同期中の例外でchecking表示に永久停止しないよう、未ログイン状態へフォールバックしてください。',
);

console.log('auth initial view regression checks passed');
