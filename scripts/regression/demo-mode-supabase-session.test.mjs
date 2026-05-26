import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync('src/lib/supabase/middleware.ts', 'utf8');

const previousModeGatedDecision = ({ isDemoEnabled, hasDemoCookie, hasSupabaseUser, pathname }) => {
  if (hasDemoCookie) return pathname === '/login' ? 'redirect:/app' : 'allow';
  if (isDemoEnabled) {
    if (pathname.startsWith('/app')) return 'redirect:/login';
    return 'allow';
  }
  if (!hasSupabaseUser && pathname.startsWith('/app')) return 'redirect:/login';
  return 'allow';
};

const fixedGuestLoginDecision = ({ isDemoEnabled, hasDemoCookie, hasSupabaseUser, pathname }) => {
  if (hasDemoCookie) return pathname === '/login' ? 'redirect:/app' : 'allow';
  if (hasSupabaseUser) return pathname === '/login' ? 'redirect:/app' : 'allow';
  if ((isDemoEnabled || !hasSupabaseUser) && pathname.startsWith('/app')) return 'redirect:/login';
  return 'allow';
};

const supabaseSignupSessionRequest = {
  isDemoEnabled: true,
  hasDemoCookie: false,
  hasSupabaseUser: true,
  pathname: '/app',
};

assert.equal(
  previousModeGatedDecision(supabaseSignupSessionRequest),
  'redirect:/login',
  '再現: guest login実装前の旧mode分岐は Supabase セッション確認前に /app を /login へ戻します。',
);
assert.equal(
  fixedGuestLoginDecision(supabaseSignupSessionRequest),
  'allow',
  '修正: demo cookie がなくても Supabase セッションが有効なら /app を許可してください。',
);

assert.match(
  source,
  /let\s+supabaseResponse\s*=\s*NextResponse\.next\(\{\s*request\s*\}\)/,
  'middleware は demo-only redirect の前に Supabase セッション確認用 response を準備してください。',
);
assert.match(
  source,
  /const\s+isAuthenticated\s*=\s*Boolean\(user\)/,
  'middleware は demo mode 分岐でも Supabase user の有無を判定できるようにしてください。',
);
assert.doesNotMatch(
  source,
  /if \(isDemoEnabled\) \{[\s\S]*?if \(pathname\.startsWith\("\/app"\)\) \{[\s\S]*?NextResponse\.redirect[\s\S]*?const supabase = createServerClient/,
  'guest loginで Supabase user 確認より前へ /app redirect を戻さないでください。',
);
assert.match(
  source,
  /if \(!isAuthenticated && isProtectedRoute\) \{/,
  '未認証の /app redirect は demo mode と通常 mode の共通認証判定後に行ってください。',
);

console.log('demo mode Supabase session regression checks passed');
