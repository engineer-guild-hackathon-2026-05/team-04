import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync('src/app/auth/callback/route.ts', 'utf8');

const previousRedirectOrigin = ({ requestOrigin, protocol, forwardedHost, isLocalEnv }) =>
  forwardedHost && !isLocalEnv ? `${protocol}//${forwardedHost}` : requestOrigin;

const fixedRedirectOrigin = ({ requestOrigin, protocol, forwardedHost, isLocalEnv, allowedOrigins }) => {
  if (!forwardedHost || isLocalEnv) return requestOrigin;
  const forwardedOrigin = `${protocol}//${forwardedHost}`;
  return allowedOrigins.includes(forwardedOrigin) ? forwardedOrigin : requestOrigin;
};

assert.equal(
  previousRedirectOrigin({
    requestOrigin: 'https://globalbites.example',
    protocol: 'https:',
    forwardedHost: 'evil.example',
    isLocalEnv: false,
  }),
  'https://evil.example',
  '再現: 旧実装は未検証の X-Forwarded-Host を成功時リダイレクト先に使います。',
);
assert.equal(
  fixedRedirectOrigin({
    requestOrigin: 'https://globalbites.example',
    protocol: 'https:',
    forwardedHost: 'evil.example',
    isLocalEnv: false,
    allowedOrigins: ['https://globalbites.example'],
  }),
  'https://globalbites.example',
  '修正: allowlist に無い forwarded host は採用しません。',
);
assert.equal(
  fixedRedirectOrigin({
    requestOrigin: 'https://internal.example',
    protocol: 'https:',
    forwardedHost: 'app.globalbites.example',
    isLocalEnv: false,
    allowedOrigins: ['https://app.globalbites.example'],
  }),
  'https://app.globalbites.example',
  '修正: allowlist 済み forwarded host だけを公開originとして採用します。',
);

const previousNextPath = (nextParam) =>
  nextParam?.startsWith('/') && !nextParam.startsWith('//') ? nextParam : '/app';
const fixedNextPath = (nextParam) => {
  if (!nextParam?.startsWith('/') || nextParam.startsWith('//')) return '/app';
  const lowerNext = nextParam.toLowerCase();
  if (nextParam.includes('\\') || lowerNext.startsWith('/%5c') || lowerNext.startsWith('/%2f')) {
    return '/app';
  }
  return nextParam;
};

assert.equal(previousNextPath('/\\evil.example'), '/\\evil.example', '再現: 旧next検証はbackslash始まりを許します。');
assert.equal(fixedNextPath('/\\evil.example'), '/app', '修正: backslash始まりはfallback pathへ戻します。');
assert.equal(fixedNextPath('/%5C%5Cevil.example'), '/app', '修正: encoded backslash始まりもfallback pathへ戻します。');
assert.equal(fixedNextPath('/%2F%2Fevil.example'), '/app', '修正: encoded slash始まりもfallback pathへ戻します。');
assert.equal(fixedNextPath('/profile'), '/profile', '修正: 通常の相対pathは維持します。');

assert.doesNotMatch(
  source,
  /forwardedHost\s*&&\s*!isLocalEnv\s*\?\s*`\$\{requestUrl\.protocol\}\/\/\$\{forwardedHost\}`\s*:\s*origin/,
  'X-Forwarded-Host を allowlist 検証なしで redirectOrigin に使わないでください。',
);
assert.match(
  source,
  /allowedRedirectOrigins\.has\(forwardedOrigin\)/,
  'forwarded origin は configured/request origin allowlist と照合してください。',
);
assert.match(
  source,
  /getSafeRedirectOrigin\(requestUrl,\s*request\.headers\)/,
  '成功/失敗リダイレクトでは安全化済み origin を使ってください。',
);
assert.match(
  source,
  /function\s+getSafeNextPath\(nextParam:\s*string\s*\|\s*null\)/,
  'next parameter は dedicated helper で安全な相対pathへ正規化してください。',
);
assert.match(
  source,
  /nextParam\.includes\("\\\\"\)/,
  'backslash を含む next はブラウザ解釈差で protocol-relative 化し得るため拒否してください。',
);
assert.match(
  source,
  /lowerNext\.startsWith\("\/%5c"\)[\s\S]*lowerNext\.startsWith\("\/%2f"\)/,
  'encoded slash/backslash で始まる next は fallback path にしてください。',
);
assert.match(
  source,
  /NextResponse\.redirect\(new URL\(next,\s*redirectOrigin\)\)/,
  'redirect URL は string concatenation ではなく URL constructor で組み立ててください。',
);
assert.match(
  source,
  /NEXT_PUBLIC_SITE_URL|SITE_URL|VERCEL_URL/,
  'proxy 配下では設定済み public origin を allowlist/default origin として使えるようにしてください。',
);
assert.match(
  source,
  /split\(","\)\[0\]\?\.trim\(\)/,
  'comma-separated forwarded headers は最初の値だけを正規化して検証してください。',
);

console.log('auth callback redirect safety regression checks passed');
