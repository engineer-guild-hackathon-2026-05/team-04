import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const loginSource = readFileSync('src/app/login/page.tsx', 'utf8');
const configSource = readFileSync('supabase/config.toml', 'utf8');

const previousAdditionalRedirectUrls = ['https://127.0.0.1:3000'];
const fixedAdditionalRedirectUrls = ['http://127.0.0.1:3000/**', 'https://127.0.0.1:3000/**', 'http://localhost:3000/**'];
const localhostSignupRedirect = 'http://localhost:3000/auth/confirm?next=%2Fapp';

const matchesSupabaseGlob = (allowedUrl, redirectUrl) => {
  if (allowedUrl.endsWith('/**')) {
    return redirectUrl.startsWith(allowedUrl.slice(0, -3));
  }
  return redirectUrl === allowedUrl;
};

assert.equal(
  previousAdditionalRedirectUrls.some((allowedUrl) => matchesSupabaseGlob(allowedUrl, localhostSignupRedirect)),
  false,
  '再現: 旧configでは localhost:3000 の signup callback が allowlist にありません。',
);
assert.equal(
  fixedAdditionalRedirectUrls.some((allowedUrl) => matchesSupabaseGlob(allowedUrl, localhostSignupRedirect)),
  true,
  '修正: localhost:3000 の signup callback を local Supabase allowlist で許可します。',
);

assert.match(
  loginSource,
  /emailRedirectTo:\s*`\$\{window\.location\.origin\}\/auth\/confirm\?next=\$\{encodeURIComponent\(redirectTo\)\}`/,
  'signup は現在の Next dev origin から /auth/confirm へ戻す設計です。',
);
assert.match(
  configSource,
  /additional_redirect_urls\s*=\s*\[[^\]]*"http:\/\/localhost:3000\/\*\*"/s,
  'Supabase local config に http://localhost:3000/** を追加してください。',
);
assert.match(
  configSource,
  /additional_redirect_urls\s*=\s*\[[^\]]*"http:\/\/127\.0\.0\.1:3000\/\*\*"/s,
  '127.0.0.1 で開いたlocal callback pathも許可してください。',
);

console.log('local signup redirect allowlist regression checks passed');
