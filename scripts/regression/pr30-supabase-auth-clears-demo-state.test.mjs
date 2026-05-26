import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const loginSource = readFileSync('src/app/login/page.tsx', 'utf8');

const previousSupabaseSignInState = ({ hasDemoCookie, supabaseSignInOk }) => ({
  hasDemoCookieAfterRedirect: supabaseSignInOk ? hasDemoCookie : hasDemoCookie,
  activeProfileSource: supabaseSignInOk && hasDemoCookie ? 'demo' : 'supabase',
});
const fixedSupabaseSignInState = ({ hasDemoCookie, supabaseSignInOk }) => ({
  hasDemoCookieAfterRedirect: supabaseSignInOk ? false : hasDemoCookie,
  activeProfileSource: supabaseSignInOk ? 'supabase' : 'unchanged',
});

assert.deepEqual(
  previousSupabaseSignInState({ hasDemoCookie: true, supabaseSignInOk: true }),
  { hasDemoCookieAfterRedirect: true, activeProfileSource: 'demo' },
  '再現: demo cookie が残ったまま Supabase sign-in に成功すると profile API が demo profile を優先します。',
);
assert.deepEqual(
  fixedSupabaseSignInState({ hasDemoCookie: true, supabaseSignInOk: true }),
  { hasDemoCookieAfterRedirect: false, activeProfileSource: 'supabase' },
  '修正: Supabase sign-in 成功時は demo auth state を消して real account profile を使ってください。',
);

assert.match(
  loginSource,
  /async function clearDemoAuthState\(\)[\s\S]*localStorage\.removeItem\(DEMO_SESSION_STORAGE_KEY\)[\s\S]*localStorage\.removeItem\(LEGACY_DEMO_PROFILE_STORAGE_KEY\)[\s\S]*fetch\('\/auth\/demo', \{\s*method: 'DELETE'\s*\}\)\.catch\(\(\) => null\)/,
  'login page は httpOnly demo cookie と localStorage demo hints を消す helper を持ってください。',
);

const signInStart = loginSource.indexOf("if (mode === 'signin')");
assert.notEqual(signInStart, -1, 'signin branch を検査できません。');
const signInBranch = loginSource.slice(signInStart, loginSource.indexOf('const { data, error } = await supabase.auth.signUp', signInStart));
assert.match(
  signInBranch,
  /if \(error\) \{[\s\S]*return;[\s\S]*\}\s*await clearDemoAuthState\(\);\s*router\.replace\(redirectTo\);/,
  'Supabase password sign-in 成功時は redirect 前に demo auth state を clear してください。',
);

const signUpSessionStart = loginSource.indexOf('if (data.session)');
assert.notEqual(signUpSessionStart, -1, 'signup immediate session branch を検査できません。');
const signUpSessionBranch = loginSource.slice(signUpSessionStart, loginSource.indexOf('setErrorMessage', signUpSessionStart));
assert.match(
  signUpSessionBranch,
  /if \(data\.session\) \{\s*await clearDemoAuthState\(\);\s*router\.replace\(redirectTo\);/,
  'Supabase signup が即時 session を返す場合も redirect 前に demo auth state を clear してください。',
);

console.log('PR #30 Supabase auth demo-state clearing regression checks passed');
