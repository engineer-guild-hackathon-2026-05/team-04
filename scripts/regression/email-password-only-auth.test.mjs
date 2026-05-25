import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const loginSource = readFileSync('src/app/login/page.tsx', 'utf8');
const docsSource = readFileSync('docs/auth.md', 'utf8');
const configSource = readFileSync('supabase/config.toml', 'utf8');

assert.equal(
  existsSync('src/app/auth/confirm/page.tsx'),
  false,
  'MVP は確認メールリンクを扱う /auth/confirm route を持たないでください。',
);
assert.doesNotMatch(
  loginSource,
  /emailRedirectTo|\/auth\/confirm/,
  'signup で確認メール用 redirect URL を渡さないでください。',
);
assert.doesNotMatch(
  loginSource,
  /確認メールを送信しました|メール内のリンク/,
  'UI は確認メール送信を前提にした案内を出さないでください。',
);
assert.match(
  loginSource,
  /signInWithPassword\(\{\s*email,\s*password\s*\}\)/,
  'ログインはメールアドレス + パスワードで行ってください。',
);
assert.match(
  loginSource,
  /signUp\(\{\s*email,\s*password,\s*options:\s*\{\s*data:\s*\{\s*name\s*\}/s,
  '新規登録はメールアドレス + パスワード + profile metadata のみにしてください。',
);
assert.match(
  loginSource,
  /data\.session[\s\S]*router\.replace\(redirectTo\)/,
  '新規登録成功時は確認メール待ちではなく、返却 session でそのまま遷移してください。',
);
assert.match(
  loginSource,
  /Confirm email をOFF/,
  'session が返らない場合は、メール確認が有効な設定ミスとして案内してください。',
);
assert.match(
  configSource,
  /\[auth\.email\][\s\S]*enable_confirmations\s*=\s*false/,
  'Supabase local config でも email confirmations を無効にしてください。',
);
assert.match(
  docsSource,
  /Confirm email` をOFF/,
  '運用ドキュメントにも実メール送信を使わない Dashboard 設定を明記してください。',
);

console.log('email password only auth regression checks passed');
