import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const loginSource = readFileSync('src/app/login/page.tsx', 'utf8');
const confirmSource = readFileSync('src/app/auth/confirm/page.tsx', 'utf8');

const previousSanitizeRedirect = (value) => {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/app';
  return value;
};

const fixedSanitizeRedirect = (value) => {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/app';
  const lowerValue = value.toLowerCase();
  if (value.includes('\\\\') || lowerValue.startsWith('/%5c') || lowerValue.startsWith('/%2f')) return '/app';
  return value;
};

const decodedBackslashRedirect = new URLSearchParams('redirect=/%5C%5Cevil.example').get('redirect');
assert.equal(decodedBackslashRedirect, '/\\\\evil.example', 'URLSearchParams は %5C%5C を leading backslashes にdecodeします。');
assert.equal(
  previousSanitizeRedirect(decodedBackslashRedirect),
  '/\\\\evil.example',
  '再現: 旧login/confirm sanitizer はdecode済みleading backslash redirectを許可します。',
);
assert.equal(
  fixedSanitizeRedirect(decodedBackslashRedirect),
  '/app',
  '修正: decode済みleading backslash redirect は /app にfallbackしてください。',
);
assert.equal(fixedSanitizeRedirect('/%5C%5Cevil.example'), '/app', 'encoded backslash path も拒否してください。');
assert.equal(fixedSanitizeRedirect('/%2F%2Fevil.example'), '/app', 'encoded slash path も拒否してください。');
assert.equal(fixedSanitizeRedirect('//evil.example'), '/app', 'protocol-relative redirect は拒否してください。');
assert.equal(fixedSanitizeRedirect('/profile'), '/profile', '通常の相対pathは維持してください。');

assert.doesNotMatch(
  loginSource,
  /function\s+sanitizeRedirect\(value:\s*string\s*\|\s*null\)\s*\{\s*if \(!value \|\| !value\.startsWith\('\/'\) \|\| value\.startsWith\('\/\/'\)\) return '\/app';\s*return value;\s*\}/,
  'login page に危険な旧sanitizeRedirect実装を残さないでください。',
);
assert.doesNotMatch(
  confirmSource,
  /function\s+sanitizeRedirect\(value:\s*string\s*\|\s*null\)\s*\{\s*if \(!value \|\| !value\.startsWith\('\/'\) \|\| value\.startsWith\('\/\/'\)\) return '\/app';\s*return value;\s*\}/,
  'confirm page に危険な旧sanitizeRedirect実装を残さないでください。',
);
assert.match(
  loginSource,
  /sanitizeAuthRedirect\(searchParams\.get\('redirect'\)\)/,
  'login page は共通の安全な auth redirect sanitizer を使ってください。',
);
assert.match(
  confirmSource,
  /sanitizeAuthRedirect\(searchParams\.get\('next'\)\)/,
  'confirm page は共通の安全な auth redirect sanitizer を使ってください。',
);

const helperSource = readFileSync('src/lib/authRedirect.ts', 'utf8');
assert.ok(helperSource.includes("value.includes('\\\\')"), '共通sanitizerはbackslashを拒否してください。');
assert.match(helperSource, /lowerValue\.startsWith\('\/%5c'\)[\s\S]*lowerValue\.startsWith\('\/%2f'\)/, '共通sanitizerはencoded slash/backslash始まりを拒否してください。');

console.log('client auth redirect safety regression checks passed');
