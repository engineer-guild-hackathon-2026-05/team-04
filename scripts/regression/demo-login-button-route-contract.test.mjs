import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const loginSource = readFileSync('src/app/login/page.tsx', 'utf8');
const authDemoRoute = readFileSync('src/app/auth/demo/route.ts', 'utf8');
const demoModeSource = readFileSync('src/lib/demoMode.ts', 'utf8');
const middlewareSource = readFileSync('src/lib/supabase/middleware.ts', 'utf8');
const envExample = readFileSync('.env.local.example', 'utf8');
const authDocs = readFileSync('docs/auth.md', 'utf8');

assert.match(
  authDemoRoute,
  /export async function POST\(request: NextRequest\)/,
  '/auth/demo は guest login button 用の POST route handler を維持してください。',
);
assert.doesNotMatch(
  authDemoRoute,
  /createDisabledResponse|status:\s*404|isDemoModeEnabled\(\)/,
  '/auth/demo は旧demo mode flagでguest loginを404無効化しないでください。',
);
assert.match(
  authDemoRoute,
  /if \(!isDemoPersistenceConfigured\(\) \|\| !hasDemoSessionSigningSecret\(\)\) \{[\s\S]*createUnavailableResponse\(\)/,
  '/auth/demo はmodeではなくDB永続化/admin設定不足を503として扱ってください。',
);
assert.match(
  loginSource,
  /mode === 'signin' && \(\s*<div className="auth-demo-box">/,
  'login page は guest login button を旧mode flagなしで表示してください。',
);
assert.doesNotMatch(
  loginSource,
  /NEXT_PUBLIC_DEMO_MODE|isDemoLoginEnabled|showDemoLogin|status:\s*'disabled'/,
  'guest login button は公開demo mode flagやdisabled 404状態に依存しないでください。',
);
assert.match(
  loginSource,
  /if \(response\.status === 503\)[\s\S]*status: 'unavailable'/,
  'POST /auth/demo が 503 の場合は設定不足としてユーザー向けに案内してください。',
);
assert.match(
  loginSource,
  /SUPABASE_SERVICE_ROLE_KEY と DEMO_SESSION_SECRET/,
  'guest login の設定不足は必要なserver-only envを案内してください。',
);
assert.doesNotMatch(
  demoModeSource + middlewareSource,
  /process\.env\.DEMO_MODE|process\.env\.NEXT_PUBLIC_DEMO_MODE|isDemoModeEnabled/,
  'guest login cookie authority とmiddleware は旧demo mode envを参照しないでください。',
);

assert.doesNotMatch(
  demoModeSource,
  /SUPABASE_SERVICE_ROLE_KEY|SUPABASE_SECRET_KEY/,
  'guest login cookie署名はservice role keyをfallback利用せず、DEMO_SESSION_SECRETに分離してください。',
);
assert.match(
  demoModeSource,
  /process\.env\.DEMO_SESSION_SECRET/,
  'guest login cookie署名は専用のDEMO_SESSION_SECRETを使ってください。',
);
assert.match(
  envExample,
  /DB-backed guest session[\s\S]*旧DEMO_MODEでは制御しません[\s\S]*SUPABASE_SERVICE_ROLE_KEYまたはDEMO_SESSION_SECRET/s,
  '.env.local.example はguest loginがmode flagではなくserver-only admin設定で動くことを説明してください。',
);
assert.doesNotMatch(
  envExample,
  /NEXT_PUBLIC_DEMO_MODE|^DEMO_MODE=/m,
  '.env.local.example はguest login用にDEMO_MODE/NEXT_PUBLIC_DEMO_MODEを案内しないでください。',
);
assert.match(
  authDocs,
  /旧 `DEMO_MODE` のような特殊モードではなく、DB-backed guest login/s,
  'docs/auth.md は新guest loginと旧demo mode flagを明確に分離してください。',
);
assert.doesNotMatch(
  authDocs,
  /NEXT_PUBLIC_DEMO_MODE=true|\nDEMO_MODE=true/,
  'docs/auth.md はguest login有効化手順にmode flagを要求しないでください。',
);

console.log('guest login route contract regression checks passed');
