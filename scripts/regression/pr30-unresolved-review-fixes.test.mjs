import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const middlewareSource = readFileSync('src/lib/supabase/middleware.ts', 'utf8');
const authDemoRouteSource = readFileSync('src/app/auth/demo/route.ts', 'utf8');
const demoSessionSource = readFileSync('src/lib/demoSession.ts', 'utf8');
const profileRouteSource = readFileSync('src/app/api/me/profile/route.ts', 'utf8');
const signoutRouteSource = readFileSync('src/app/auth/signout/route.ts', 'utf8');

const previousLoginRedirectDecision = ({ hasSignedDemoCookie, pathname }) => {
  const isDemoAuthenticated = hasSignedDemoCookie;
  if (isDemoAuthenticated && pathname === '/login') return 'redirect:/app';
  if (isDemoAuthenticated) return 'next';
  return 'non-demo-flow';
};

const fixedLoginRedirectDecision = ({ hasSignedDemoCookie, dbSessionExists, pathname }) => {
  const hasUsableDemoSession = hasSignedDemoCookie && dbSessionExists;
  if (hasUsableDemoSession && pathname === '/login') return 'let-standard-login-redirect-handle-real-auth-only';
  if (hasSignedDemoCookie && !dbSessionExists && pathname === '/login') return 'show-login-and-let-auth-demo-clear-cookie';
  if (hasUsableDemoSession) return 'next';
  return 'non-demo-flow';
};

assert.equal(
  previousLoginRedirectDecision({ hasSignedDemoCookie: true, pathname: '/login' }),
  'redirect:/app',
  '再現: DB row が消えた signed demo cookie でも middleware が /login から /app へ redirect していました。',
);
assert.equal(
  fixedLoginRedirectDecision({ hasSignedDemoCookie: true, dbSessionExists: false, pathname: '/login' }),
  'show-login-and-let-auth-demo-clear-cookie',
  '修正: stale signed demo cookie は /login から /app へ redirect せず、/auth/demo の検証で self-heal してください。',
);
const demoMiddlewareBranch = middlewareSource.slice(
  middlewareSource.indexOf('if (isDemoAuthenticated)'),
  middlewareSource.indexOf('let supabaseResponse'),
);
assert.doesNotMatch(
  demoMiddlewareBranch,
  /pathname\s*===\s*["']\/login["'][\s\S]*url\.pathname\s*=\s*["']\/app["']/,
  'middleware は signed demo cookie だけで /login から /app へ redirect しないでください。',
);
assert.match(
  middlewareSource,
  /if\s*\(isDemoAuthenticated\)\s*\{\s*return NextResponse\.next\(\{ request \}\);\s*\}/,
  '有効署名の demo cookie は protected route 通過だけに使い、login redirect は Supabase 実ユーザー分岐へ限定してください。',
);
assert.match(
  authDemoRouteSource,
  /function createUnauthenticatedResponse\(\{ clearCookie = false \} = \{\}\)[\s\S]*if \(clearCookie\) clearDemoCookie\(response\)/,
  '/auth/demo GET は stale cookie を消せる unauthenticated response を持ってください。',
);
assert.match(
  authDemoRouteSource,
  /if \(!sessionId\) \{\s*return createUnauthenticatedResponse\(\{ clearCookie: Boolean\(demoCookieValue\) \}\);\s*\}/,
  '/auth/demo GET は署名検証に失敗した demo cookie を clear してください。',
);
assert.match(
  authDemoRouteSource,
  /const session = await getDemoSession\(sessionId\);\s*if \(!session\) \{\s*return createUnauthenticatedResponse\(\{ clearCookie: true \}\);\s*\}/,
  '/auth/demo GET は signed cookie の DB row がない場合に 401 response へ clear cookie を付けてください。',
);

const previousRestoreDecision = (sessionId) =>
  sessionId ? 'query-demo_sessions-with-raw-session-id' : 'create-new-session';
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const fixedRestoreDecision = (sessionId) =>
  uuidPattern.test(sessionId ?? '') ? 'query-demo_sessions-with-valid-session-id' : 'create-new-session';

assert.equal(
  previousRestoreDecision('not-json-or-not-uuid'),
  'query-demo_sessions-with-raw-session-id',
  '再現: malformed localStorage demo session hint を uuid column lookup に渡すと route が 500 化し得ます。',
);
assert.equal(
  fixedRestoreDecision('not-json-or-not-uuid'),
  'create-new-session',
  '修正: malformed localStorage demo session hint は無視して新規 demo session を作ってください。',
);
assert.match(
  demoSessionSource,
  /const DEMO_SESSION_ID_PATTERN = \/\^\[0-9a-f\]\{8\}-/,
  'demo session restore は UUID 形式検証を持ってください。',
);
assert.match(
  demoSessionSource,
  /export function isDemoSessionId\(value\?: string \| null\): value is string[\s\S]*DEMO_SESSION_ID_PATTERN\.test\(value\)/,
  'demo session id 検証 helper を公開してください。',
);
assert.match(
  demoSessionSource,
  /export async function getDemoSession\(sessionId: string[\s\S]*if \(!isDemoSessionId\(sessionId\)\) return null;/,
  'getDemoSession は未検証の sessionId を DB lookup へ渡さず null 扱いしてください。',
);
assert.doesNotMatch(
  demoSessionSource,
  /const existingSession = sessionId \? await getDemoSession\(sessionId, admin\) : null;/,
  'restoreOrCreateDemoSession は未検証の sessionId をそのまま DB lookup へ渡さないでください。',
);
assert.match(
  demoSessionSource,
  /const existingSession = isDemoSessionId\(sessionId\) \? await getDemoSession\(sessionId, admin\) : null;/,
  'restoreOrCreateDemoSession は UUID 検証済み sessionId だけを DB lookup に使ってください。',
);

const previousDemoPutName = ({ submittedUserName }) =>
  submittedUserName?.trim() ? submittedUserName.trim() : 'デモユーザー';
const fixedDemoPutName = ({ submittedUserName, sessionDisplayName }) =>
  submittedUserName?.trim() ? submittedUserName.trim() : sessionDisplayName;

assert.equal(
  previousDemoPutName({ submittedUserName: '   ', sessionDisplayName: 'demo-user-042' }),
  'デモユーザー',
  '再現: 空の demo profile name PUT が DB-generated display_name ではなく generic デモユーザーを保存していました。',
);
assert.equal(
  fixedDemoPutName({ submittedUserName: '   ', sessionDisplayName: 'demo-user-042' }),
  'demo-user-042',
  '修正: 空の demo profile name PUT は session.display_name を保存してください。',
);
assert.doesNotMatch(
  profileRouteSource,
  /const requestedUserName = submittedUserName \?\? DEMO_PROFILE_NAME;/,
  'demo PUT 前の正規化で空表示名を generic デモユーザーへ変換しないでください。',
);
assert.doesNotMatch(
  profileRouteSource,
  /DEMO_PROFILE_NAME\s*=\s*['"]デモユーザー['"]/,
  'demo profile fallback に generic デモユーザー定数を残さないでください。',
);
assert.match(
  profileRouteSource,
  /saveDemoProfile\(demoSessionId, \{[\s\S]*userName: submittedUserName \?\? ['"]{2}[\s\S]*restrictedIngredients: requestedRestrictedIngredients[\s\S]*preferredCuisines/s,
  'demo PUT は空表示名を saveDemoProfile へ空として渡し、saveDemoProfile 内で session.display_name fallback してください。',
);
assert.match(
  profileRouteSource,
  /const userName = payload\.userName\.trim\(\) \|\| session\.display_name/,
  'saveDemoProfile は空 name を DB-generated session.display_name へfallbackしてください。',
);

assert.match(
  profileRouteSource,
  /function createMissingDemoSessionResponse\(\)[\s\S]*clearDemoCookie\(NextResponse\.json\(\{ error: 'Demo session not found\.' \}, \{ status: 401 \}\)\)/,
  'demo profile API は missing DB row の 401 response で stale demo cookie を clear してください。',
);
assert.match(
  profileRouteSource,
  /if \(!demoProfile\) return createMissingDemoSessionResponse\(\);/,
  'demo profile GET は session row が消えている場合に cookie clear 付き401を返してください。',
);
assert.match(
  profileRouteSource,
  /if \(!demoResponse\) return createMissingDemoSessionResponse\(\);/,
  'demo profile PUT は session row が消えている場合に cookie clear 付き401を返してください。',
);

const previousDemoRestrictionReplaceFailure = ({ previousRows, insertSucceeds }) => {
  const rowsAfterDelete = [...previousRows];
  rowsAfterDelete.splice(0, rowsAfterDelete.length);
  return insertSucceeds ? ['new-row'] : rowsAfterDelete;
};
const fixedDemoRestrictionReplaceFailure = ({ previousRows, insertSucceeds }) => {
  const rowsAfterDelete = [];
  return insertSucceeds ? ['new-row'] : rowsAfterDelete.concat(previousRows);
};

assert.deepEqual(
  previousDemoRestrictionReplaceFailure({ previousRows: ['ing-egg'], insertSucceeds: false }),
  [],
  '再現: demo_restricted_ingredients の再insert失敗時に既存行が復元されず、制限情報が消えていました。',
);
assert.deepEqual(
  fixedDemoRestrictionReplaceFailure({ previousRows: ['ing-egg'], insertSucceeds: false }),
  ['ing-egg'],
  '修正: demo_restricted_ingredients の再insert失敗時は既存行を復元してください。',
);
assert.match(
  profileRouteSource,
  /async function restoreDemoRestrictedIngredientRows\([\s\S]*\.from\('demo_restricted_ingredients'\)\.insert\([\s\S]*session_id: sessionId[\s\S]*ingredient_id: row\.ingredient_id[\s\S]*reason: row\.reason \?\? 'allergy'/,
  'demo制限食材の再insert失敗に備え、既存 demo_restricted_ingredients 行を復元するhelperを持ってください。',
);
assert.match(
  profileRouteSource,
  /const \{ error: insertError \} = await supabase\.from\('demo_restricted_ingredients'\)\.insert\(inserts\);\s*if \(insertError\) \{\s*await restoreDemoRestrictedIngredientRows\(supabase, sessionId, \(existingRows \?\? \[\]\) as RestrictedJoinRow\[\]\);\s*throw insertError;\s*\}/,
  'replaceDemoRestrictedIngredients は insert 失敗時に通常ユーザーpath同様、削除済みの既存行を復元してからthrowしてください。',
);

const previousDemoLoginSessionIdRead = (payload) => payload.sessionId;
const fixedDemoLoginSessionIdRead = (payload) =>
  payload && typeof payload === 'object' && !Array.isArray(payload) && typeof payload.sessionId === 'string'
    ? payload.sessionId
    : undefined;

assert.throws(
  () => previousDemoLoginSessionIdRead(null),
  TypeError,
  '再現: POST /auth/demo は JSON null payload で payload.sessionId 読み取り時に TypeError になっていました。',
);
assert.equal(
  fixedDemoLoginSessionIdRead(null),
  undefined,
  '修正: POST /auth/demo の JSON null payload は sessionId hint なしとして扱ってください。',
);
assert.equal(
  fixedDemoLoginSessionIdRead({ sessionId: 'demo-session-id' }),
  'demo-session-id',
  '修正: 有効な object payload の sessionId hint は保持してください。',
);
assert.match(
  authDemoRouteSource,
  /function getDemoLoginSessionId\(payload: unknown\)[\s\S]*if \(!payload \|\| typeof payload !== 'object' \|\| Array\.isArray\(payload\)\) return undefined;[\s\S]*return typeof sessionId === 'string' \? sessionId : undefined;/,
  'POST /auth/demo は unknown payload を object guard してから sessionId を読む helper を持ってください。',
);
assert.match(
  authDemoRouteSource,
  /const payload = await request\.json\(\)\.catch\(\(\): unknown => \(\{\}\)\);\s*const \{ session, isNew \} = await restoreOrCreateDemoSession\(getDemoLoginSessionId\(payload\)\);/,
  'POST /auth/demo は JSON null / 配列 / 非object を missing sessionId として restoreOrCreateDemoSession へ渡してください。',
);

const previousSignoutDecision = ({ hasDemoCookie, hasSupabaseSession }) => {
  if (hasDemoCookie) return 'clear-demo-cookie-only';
  return hasSupabaseSession ? 'clear-supabase-session' : 'redirect-login';
};
const fixedSignoutDecision = ({ hasDemoCookie, hasSupabaseSession }) => {
  const cleared = ['clear-demo-cookie'];
  if (hasSupabaseSession) cleared.push('clear-supabase-session');
  return hasDemoCookie ? cleared.join('+') : cleared.at(-1);
};

assert.equal(
  previousSignoutDecision({ hasDemoCookie: true, hasSupabaseSession: true }),
  'clear-demo-cookie-only',
  '再現: demo cookie と Supabase session が併存すると、signout が Supabase signOut 前に return していました。',
);
assert.equal(
  fixedSignoutDecision({ hasDemoCookie: true, hasSupabaseSession: true }),
  'clear-demo-cookie+clear-supabase-session',
  '修正: signout は demo cookie を消した後も Supabase session があれば signOut してください。',
);
assert.doesNotMatch(
  signoutRouteSource,
  /hasDemoAuthCookie\([\s\S]*?return response;[\s\S]*?hasSupabaseConfig\(\)/,
  'signout は valid demo cookie だけを理由に Supabase signOut 前に早期returnしないでください。',
);
assert.match(
  signoutRouteSource,
  /response\.cookies\.set\(DEMO_AUTH_COOKIE[\s\S]*if \(!hasSupabaseConfig\(\)\) \{[\s\S]*return response;[\s\S]*const supabase = await createClient\(\);[\s\S]*await supabase\.auth\.signOut\(\);/,
  'signout は常に demo cookie をclearし、Supabase設定がある場合は既存Supabase sessionも失効してください。',
);

const previousProfileAuthPriority = ({ hasDemoCookie, hasSupabaseSession }) => {
  if (hasDemoCookie) return 'demo-profile';
  return hasSupabaseSession ? 'real-profile' : 'unauthenticated';
};
const fixedProfileAuthPriority = ({ hasDemoCookie, hasSupabaseSession }) => {
  if (hasSupabaseSession) return 'real-profile';
  return hasDemoCookie ? 'demo-profile' : 'unauthenticated';
};

assert.equal(
  previousProfileAuthPriority({ hasDemoCookie: true, hasSupabaseSession: true }),
  'demo-profile',
  '再現: demo cookie と Supabase session が併存すると、profile API が real user より demo profile を優先していました。',
);
assert.equal(
  fixedProfileAuthPriority({ hasDemoCookie: true, hasSupabaseSession: true }),
  'real-profile',
  '修正: profile API は Supabase session がある場合、残存 demo cookie より real user profile を優先してください。',
);
{
  const getRouteSource = profileRouteSource.slice(
    profileRouteSource.indexOf('export async function GET'),
    profileRouteSource.indexOf('export async function PUT'),
  );
  const putRouteSource = profileRouteSource.slice(profileRouteSource.indexOf('export async function PUT'));
  const getRealContextIndex = getRouteSource.indexOf('const realUserContext = await getRealUserContext()');
  const getDemoBranchIndex = getRouteSource.indexOf('if (demoSessionId)');
  const putRealContextIndex = putRouteSource.indexOf('const realUserContext = await getRealUserContext()');
  const putDemoBranchIndex = putRouteSource.indexOf('if (demoSessionId)');

  assert.ok(getRealContextIndex !== -1 && getRealContextIndex < getDemoBranchIndex, 'GET /api/me/profile は demo branch より先に Supabase real user session を解決してください。');
  assert.ok(putRealContextIndex !== -1 && putRealContextIndex < putDemoBranchIndex, 'PUT /api/me/profile は demo branch より先に Supabase real user session を解決してください。');
  assert.match(
    getRouteSource,
    /if \(realUserContext\?\.user && !realUserContext\.error\) \{[\s\S]*source,[\s\S]*\} satisfies ProfileResponse\);[\s\S]*if \(demoSessionId\)/,
    'GET /api/me/profile は real user response を返せる場合に返してから demo profile fallback に進んでください。',
  );
  assert.match(
    putRouteSource,
    /if \(realUserContext\?\.user && !realUserContext\.error\) \{[\s\S]*source: 'database'[\s\S]*\} satisfies ProfileResponse\);[\s\S]*if \(demoSessionId\)/,
    'PUT /api/me/profile は real user save を返せる場合に返してから demo save fallback に進んでください。',
  );
}

console.log('PR #30 unresolved review regression checks passed');
