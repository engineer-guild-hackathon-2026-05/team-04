import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const middlewareSource = readFileSync('src/lib/supabase/middleware.ts', 'utf8');
const authDemoRouteSource = readFileSync('src/app/auth/demo/route.ts', 'utf8');
const demoSessionSource = readFileSync('src/lib/demoSession.ts', 'utf8');
const profileRouteSource = readFileSync('src/app/api/me/profile/route.ts', 'utf8');

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

console.log('PR #30 unresolved review regression checks passed');
