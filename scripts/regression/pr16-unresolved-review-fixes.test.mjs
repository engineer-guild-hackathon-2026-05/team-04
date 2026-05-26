import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const serverSource = readFileSync('src/lib/supabase/server.ts', 'utf8');
const callbackSource = readFileSync('src/app/auth/callback/route.ts', 'utf8');
const signoutSource = readFileSync('src/app/auth/signout/route.ts', 'utf8');
const middlewareSource = readFileSync('src/lib/supabase/middleware.ts', 'utf8');

const previousServerConfigBehavior = ({ url, anonKey }) =>
  url && anonKey ? 'create-client' : 'non-null-env-crash';
const fixedServerConfigBehavior = ({ url, anonKey }) =>
  url && anonKey ? 'create-client' : 'supabase-not-configured';

assert.equal(
  previousServerConfigBehavior({ url: undefined, anonKey: undefined }),
  'non-null-env-crash',
  '再現: server Supabase env が欠けていると non-null assertion 経由の不明瞭な crash になります。',
);
assert.equal(
  fixedServerConfigBehavior({ url: undefined, anonKey: undefined }),
  'supabase-not-configured',
  '修正: server Supabase env 欠落は明示的な not configured 状態として扱ってください。',
);
assert.doesNotMatch(
  serverSource,
  /process\.env\.NEXT_PUBLIC_SUPABASE_URL!|process\.env\.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!/,
  'src/lib/supabase/server.ts は env 欠落時に obscure な non-null crash を起こさないでください。',
);
assert.match(
  serverSource,
  /supabase_not_configured|Supabase[^\n]+(?:not configured|configuration is missing)|hasSupabaseConfig|isSupabaseConfigured|requireSupabaseConfig|getSupabaseConfig/,
  'src/lib/supabase/server.ts は Supabase env 欠落を明示的に判定できる形にしてください。',
);

const previousCallbackWithCodeAndMissingEnv = ({ hasCode, hasConfig }) => {
  if (hasCode) return hasConfig ? 'exchange-code' : 'non-null-env-crash';
  return 'redirect:/login?error=auth_callback_failed';
};
const fixedCallbackWithCodeAndMissingEnv = ({ hasCode, hasConfig }) => {
  if (hasCode && !hasConfig) return 'redirect:/login?error=supabase_not_configured';
  if (hasCode) return 'exchange-code';
  return 'redirect:/login?error=auth_callback_failed';
};

assert.equal(
  previousCallbackWithCodeAndMissingEnv({ hasCode: true, hasConfig: false }),
  'non-null-env-crash',
  '再現: code 付き callback で env 欠落時に createClient が crash します。',
);
assert.equal(
  fixedCallbackWithCodeAndMissingEnv({ hasCode: true, hasConfig: false }),
  'redirect:/login?error=supabase_not_configured',
  '修正: code 付き callback で env 欠落時は安全に /login?error=supabase_not_configured へ戻してください。',
);
assert.match(
  callbackSource,
  /supabase_not_configured/,
  'auth callback は Supabase env 欠落時に /login?error=supabase_not_configured へ redirect してください。',
);
{
  const configGuardIndex = callbackSource.search(/NEXT_PUBLIC_SUPABASE_URL[\s\S]*NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY|hasSupabaseConfig|isSupabaseConfigured/);
  const createClientIndex = callbackSource.indexOf('createClient()');
  assert.notEqual(configGuardIndex, -1, 'auth callback は createClient 前に Supabase env 設定を判定してください。');
  assert.ok(
    createClientIndex === -1 || configGuardIndex < createClientIndex,
    'auth callback は Supabase env 欠落を createClient() より前に処理してください。',
  );
}

const previousSignoutWithMissingEnv = ({ hasDemoCookie, hasConfig }) => {
  if (hasDemoCookie) return 'clear-demo-cookie-and-redirect';
  return hasConfig ? 'call-supabase-then-redirect' : 'non-null-env-crash';
};
const fixedSignoutWithMissingEnv = ({ hasDemoCookie, hasConfig }) => {
  if (hasDemoCookie || !hasConfig) return 'clear-demo-cookie-and-redirect';
  return 'call-supabase-then-redirect';
};

assert.equal(
  previousSignoutWithMissingEnv({ hasDemoCookie: false, hasConfig: false }),
  'non-null-env-crash',
  '再現: demo cookie がなく Supabase env もない signout は createClient で crash します。',
);
assert.equal(
  fixedSignoutWithMissingEnv({ hasDemoCookie: false, hasConfig: false }),
  'clear-demo-cookie-and-redirect',
  '修正: signout は env 欠落時も demo cookie 失効を返し、Supabase を呼ばず redirect してください。',
);
{
  const clearCookieIndex = signoutSource.indexOf('response.cookies.set');
  const configGuardIndex = signoutSource.search(/NEXT_PUBLIC_SUPABASE_URL[\s\S]*NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY|hasSupabaseConfig|isSupabaseConfigured/);
  const createClientIndex = signoutSource.indexOf('createClient()');
  assert.ok(clearCookieIndex !== -1, 'signout は demo cookie を失効させてください。');
  assert.notEqual(configGuardIndex, -1, 'signout は Supabase 呼び出し前に env 設定を判定してください。');
  assert.ok(
    clearCookieIndex < createClientIndex,
    'signout は Supabase 呼び出しの有無に関わらず demo cookie を先に失効させてください。',
  );
  assert.ok(
    configGuardIndex < createClientIndex,
    'signout は env 欠落時に createClient() を呼ばないでください。',
  );
}
assert.match(
  signoutSource,
  /if \(!(?:hasSupabaseConfig|isSupabaseConfigured)\(\)\) \{[\s\S]*?return response;[\s\S]*?\}/,
  'signout は Supabase env 欠落時に Supabase を呼ばず、cookie clear 済み response を返してください。',
);

const previousAuthDemoCookieDecision = ({ demoCookieValue, isValidDemoCookie }) => {
  if (demoCookieValue && !isValidDemoCookie) return 'keep-invalid-cookie';
  return 'keep-cookie-state';
};
const fixedAuthDemoCookieDecision = ({ demoCookieValue, isValidDemoCookie, method = 'GET' }) => {
  if (method === 'POST') return 'route-handler-overwrites-cookie';
  if (demoCookieValue && !isValidDemoCookie) return 'clear-cookie';
  return 'keep-cookie-state';
};

assert.equal(
  previousAuthDemoCookieDecision({ demoCookieValue: 'invalid', isValidDemoCookie: false }),
  'keep-invalid-cookie',
  '再現: /auth/demo は invalid guest cookie を消しません。',
);
assert.equal(
  fixedAuthDemoCookieDecision({ demoCookieValue: 'invalid', isValidDemoCookie: false }),
  'clear-cookie',
  '修正: /auth/demo は invalid guest cookie を clear してください。',
);
assert.equal(
  fixedAuthDemoCookieDecision({
    demoCookieValue: 'invalid',
    isValidDemoCookie: false,
    method: 'POST',
  }),
  'route-handler-overwrites-cookie',
  '修正: /auth/demo POST は route handler が有効cookieを発行するため、middlewareの削除cookieを重ねないでください。',
);
assert.match(
  middlewareSource,
  /const shouldClearInvalidDemoCookie = Boolean\(demoCookieValue\) && !isDemoAuthenticated;/,
  'middleware は invalid guest cookie を検出してください。',
);
assert.match(
  middlewareSource,
  /if \(pathname === "\/auth\/demo"\) \{[\s\S]*?request\.method !== "POST" && shouldClearInvalidDemoCookie[\s\S]*?clearDemoCookie\(response\)[\s\S]*?\}/,
  '/auth/demo でも invalid demo cookie を clear しつつ、POST の正常cookie発行を削除cookieで上書きしないでください。',
);

console.log('PR #16 unresolved review fix regression checks passed');
