import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync('src/app/page.tsx', 'utf8');

assert.match(source, /type\s+AuthStatus\s*=\s*'checking'\s*\|\s*'authenticated'\s*\|\s*'unauthenticated'/);
assert.match(source, /useState<AuthStatus>\('checking'\)/);
assert.doesNotMatch(source, /useState<CurrentView>\('landing'\)/);
assert.match(source, /if \(authStatus === 'checking'\) \{\s*return \([\s\S]*?role="status"[\s\S]*?\);\s*\}\s*return \(/);
assert.match(source, /authStatus\s*===\s*'unauthenticated'\s*&&\s*currentView\s*===\s*'landing'\s*&&\s*\(\s*<LandingView/);

const demoBranchStart = source.indexOf("if (demoSession.status === 'authenticated')");
assert.notEqual(demoBranchStart, -1, 'DB-backed demo authenticated branch を検査できません。');
const demoBranch = source.slice(demoBranchStart, source.indexOf("if (demoSession.status === 'failed')", demoBranchStart));
assert.match(demoBranch, /const remoteProfile = await fetchProfileFromApi\(\)/, 'demo session はDB-backed profile APIを読み取ってください。');
assert.match(demoBranch, /const merged = mergeProfile\(null, remoteProfile\)/, 'demo session は通常localStorageを混ぜずDB profileだけで初期化してください。');
assert.match(demoBranch, /setIsLoggedIn\(true\);[\s\S]*setCurrentView\(new URLSearchParams\(window\.location\.search\)\.get\('view'\) === 'profile' \? 'profile' : 'list'\);[\s\S]*setAuthStatus\('authenticated'\);[\s\S]*return;/, 'new demo は /app?view=profile でプロフィール設定へ進めてください。');
assert.doesNotMatch(source, /if \(demoSession\.status === 'unauthenticated'\) \{[\s\S]*?setAuthStatus\('unauthenticated'\);[\s\S]*?return;/);

const failedBlockStart = source.indexOf("if (demoSession.status === 'failed')");
const apiFallbackStart = source.indexOf('const remoteProfile = await fetchProfileFromApi();', failedBlockStart);
assert.ok(failedBlockStart !== -1 && apiFallbackStart !== -1, 'デモ認証チェック失敗時の profile API fallback を検査できません。');
const failedBlock = source.slice(failedBlockStart, apiFallbackStart);
assert.doesNotMatch(failedBlock, /setAuthStatus\('unauthenticated'\)|return;/);
assert.match(failedBlock, /Falling back to profile API/);
assert.match(source.slice(apiFallbackStart), /const remoteProfile = await fetchProfileFromApi\(\)/);
assert.match(source, /if \(!remoteProfile\) \{[\s\S]*?setIsLoggedIn\(false\);[\s\S]*?setCurrentView\('landing'\);[\s\S]*?setAuthStatus\('unauthenticated'\);[\s\S]*?return;/);

const remoteProfileIndex = source.indexOf('const remoteProfile = await fetchProfileFromApi();');
const authenticatedIndex = source.indexOf("setAuthStatus('authenticated')", remoteProfileIndex);
assert.ok(remoteProfileIndex !== -1 && authenticatedIndex > remoteProfileIndex, 'profile API同期後に authenticated を確定してください。');

assert.match(source, /catch \(error\) \{[\s\S]*?Auth\/profile sync failed[\s\S]*?setIsLoggedIn\(false\);[\s\S]*?setCurrentView\('landing'\);[\s\S]*?setAuthStatus\('unauthenticated'\);[\s\S]*?\}/);

const styles = readFileSync('src/app/globals.css', 'utf8');
assert.match(styles, /\.auth-loading-content\s*\{[\s\S]*?padding:\s*0 24px;/);

console.log('auth initial view regression checks passed');
