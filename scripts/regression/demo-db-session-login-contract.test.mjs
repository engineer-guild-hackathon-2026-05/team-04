import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const authDemoRoute = readFileSync('src/app/auth/demo/route.ts', 'utf8');
const profileRoute = readFileSync('src/app/api/me/profile/route.ts', 'utf8');
const demoMode = readFileSync('src/lib/demoMode.ts', 'utf8');
const adminClient = readFileSync('src/lib/supabase/admin.ts', 'utf8');
const migration = readFileSync('supabase/migrations/20260525234000_add_demo_sessions.sql', 'utf8');
const authDocs = readFileSync('docs/auth.md', 'utf8');
const envExample = readFileSync('.env.local.example', 'utf8');

assert.match(authDemoRoute, /function isSameOriginRequest\(request: NextRequest\)[\s\S]*origin'\) === request\.nextUrl\.origin/, 'demo login/logout はsame-origin requestだけを受け付けてください。');
assert.match(authDemoRoute, /if \(!isDemoPersistenceConfigured\(\) \|\| !hasDemoSessionSigningSecret\(\)\) \{[\s\S]*createUnavailableResponse\(\)/, 'demo login はDB永続化なしでmock認証へfallbackしないでください。');
assert.match(authDemoRoute, /restoreOrCreateDemoSession\(payload\.sessionId\)/, 'one-click login はlocalStorage session idを復元ヒントとしてDB sessionを再利用してください。');
assert.match(authDemoRoute, /httpOnly:\s*true[\s\S]*sameSite:\s*'lax'/, '権限はlocalStorageではなくhttpOnly署名Cookieで保持してください。');

assert.match(demoMode, /crypto\.subtle\.sign\('HMAC'/, 'demo auth cookie はHMAC署名してください。');
assert.match(demoMode, /timingSafeEqual\(signature, expectedSignature\)/, 'demo auth cookie は署名を検証してください。');
assert.doesNotMatch(demoMode, /localStorage/, 'server-side cookie authority helperへlocalStorage依存を入れないでください。');
assert.doesNotMatch(demoMode, /SUPABASE_SERVICE_ROLE_KEY|SUPABASE_SECRET_KEY/, 'demo auth cookie署名secretはservice role keyから分離してください。');
assert.match(demoMode, /process\.env\.DEMO_SESSION_SECRET/, 'demo auth cookie署名には専用DEMO_SESSION_SECRETを使ってください。');

assert.match(adminClient, /import 'server-only'/, 'service role client はserver-only境界に閉じ込めてください。');
assert.match(adminClient, /SUPABASE_SERVICE_ROLE_KEY\s*\?\?\s*process\.env\.SUPABASE_SECRET_KEY/, 'demo DB access はserver-only admin keyで行ってください。');

assert.match(profileRoute, /getDemoSessionIdForRequest\(request: NextRequest\)[\s\S]*getDemoSessionIdFromAuthCookie/, 'profile API のdemo権限は署名Cookieから解決してください。');
assert.match(profileRoute, /request\.headers\.get\(DEMO_SESSION_HEADER\)[\s\S]*hintedSessionId !== sessionId[\s\S]*return 'mismatch'/, 'localStorage session id hintがCookie権限と不一致なら拒否してください。');
assert.match(profileRoute, /\.from\('demo_profiles'\)[\s\S]*\.upsert/, 'demo profile はDBへ保存してください。');
assert.match(profileRoute, /\.from\('demo_restricted_ingredients'\)/, 'demo ingredient制限はDBへ保存してください。');

assert.match(migration, /create table if not exists public\.demo_sessions/i, 'demo session table を作成してください。');
assert.match(migration, /alter table public\.demo_sessions enable row level security/i, 'demo session table はRLSを有効化してください。');
assert.match(migration, /alter table public\.demo_profiles enable row level security/i, 'demo profile table はRLSを有効化してください。');
assert.match(migration, /alter table public\.demo_restricted_ingredients enable row level security/i, 'demo restricted ingredient table はRLSを有効化してください。');
assert.doesNotMatch(migration, /create policy[\s\S]*(anon|authenticated)/i, 'demo tables にpublic anon/authenticated policyを作らないでください。');

assert.match(authDocs, /## DB-backed デモログイン[\s\S]*globalbites_demo_session_id[\s\S]*globalbites_demo_auth[\s\S]*demo_profiles/, 'docs/auth.md はDB-backed demo loginの権限モデルと保存先を説明してください。');
assert.match(authDocs, /DEMO_SESSION_SECRET/, 'docs/auth.md はdemo cookie署名secretを案内してください。');
assert.match(envExample, /DB-backed guest login[\s\S]*SUPABASE_SERVICE_ROLE_KEY[\s\S]*guest login[\s\S]*DEMO_SESSION_SECRET|SUPABASE_SERVICE_ROLE_KEY[\s\S]*DEMO_SESSION_SECRET[\s\S]*DB-backed guest session/, '.env.local.example はDB-backed guest loginに必要なserver-only envを案内してください。');
assert.doesNotMatch(envExample, /^DEMO_MODE=|NEXT_PUBLIC_DEMO_MODE/m, '.env.local.example はDB-backed guest loginを旧demo mode flagで制御しないでください。');
assert.doesNotMatch(envExample, /任意のメールアドレスとパスワードでログインできます/, '.env.local.example に旧demo password flow説明を残さないでください。');

console.log('demo DB session login contract regression checks passed');
