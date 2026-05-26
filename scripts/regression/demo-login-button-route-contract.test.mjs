import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const loginSource = readFileSync('src/app/login/page.tsx', 'utf8');
const authDemoRoute = readFileSync('src/app/auth/demo/route.ts', 'utf8');
const demoModeSource = readFileSync('src/lib/demoMode.ts', 'utf8');
const envExample = readFileSync('.env.local.example', 'utf8');
const authDocs = readFileSync('docs/auth.md', 'utf8');

assert.match(
  authDemoRoute,
  /export async function POST\(request: NextRequest\)/,
  '/auth/demo は demo login button 用の POST route handler を維持してください。',
);

const disabledRouteReturns404 = /function createDisabledResponse\(\)[\s\S]*status:\s*404/.test(authDemoRoute);
const demoButtonIsPubliclyGated =
  /NEXT_PUBLIC_DEMO_MODE|isDemoLoginEnabled|showDemoLogin/.test(loginSource) &&
  /mode === 'signin'\s*&&\s*isDemoLoginEnabled\s*&&\s*\(/.test(loginSource);

assert.ok(
  !disabledRouteReturns404 || demoButtonIsPubliclyGated,
  'POST /auth/demo が disabled 時に 404 を返す場合、ログイン画面の「デモで体験する」ボタンは公開envで表示制御し、常時クリック可能にしないでください。',
);

assert.match(
  demoModeSource,
  /process\.env\.DEMO_MODE[\s\S]*process\.env\.NEXT_PUBLIC_DEMO_MODE|process\.env\.NEXT_PUBLIC_DEMO_MODE[\s\S]*process\.env\.DEMO_MODE/,
  'server-side demo mode 判定は公開UIフラグと server route フラグの設定ずれを避けられるよう NEXT_PUBLIC_DEMO_MODE も読んでください。',
);
assert.match(
  loginSource,
  /status:\s*'unavailable'[\s\S]*message\?: string/,
  'demo persistence 設定不足は generic failure ではなく unavailable として扱ってください。',
);
assert.match(
  loginSource,
  /if \(response\.status === 503\)[\s\S]*status: 'unavailable'/,
  'POST /auth/demo が 503 の場合は設定不足としてユーザー向けに案内してください。',
);
assert.match(
  loginSource,
  /NEXT_PUBLIC_DEMO_MODE=true[\s\S]*DEMO_MODE=true|DEMO_MODE=true[\s\S]*NEXT_PUBLIC_DEMO_MODE=true/s,
  'login page は demo を有効化するenvの組み合わせを開発者が追跡できる文言を持ってください。',
);
assert.match(
  envExample,
  /NEXT_PUBLIC_DEMO_MODE=false[\s\S]*DEMO_MODE=false|DEMO_MODE=false[\s\S]*NEXT_PUBLIC_DEMO_MODE=false/s,
  '.env.local.example は button 表示用公開フラグと server route 用フラグを併記してください。',
);
assert.match(
  authDocs,
  /NEXT_PUBLIC_DEMO_MODE=true[\s\S]*DEMO_MODE=true|DEMO_MODE=true[\s\S]*NEXT_PUBLIC_DEMO_MODE=true/s,
  'docs/auth.md は demo button 表示と /auth/demo route 有効化に必要なenvを同じセットで説明してください。',
);

console.log('demo login button route contract regression checks passed');
