export const DEMO_AUTH_COOKIE = 'globalbites_demo_auth';
export const DEMO_AUTH_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

const DEMO_COOKIE_VERSION = 'v1';

export function isDemoModeEnabled() {
  const value = process.env.DEMO_MODE?.toLowerCase();
  return value === 'true' || value === '1' || value === 'yes' || value === 'on';
}

function getDemoSessionSecret() {
  return process.env.DEMO_SESSION_SECRET
    ?? process.env.SUPABASE_SERVICE_ROLE_KEY
    ?? process.env.SUPABASE_SECRET_KEY
    ?? '';
}

function toBase64Url(bytes: ArrayBuffer) {
  const binary = String.fromCharCode(...new Uint8Array(bytes));
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function signDemoSessionId(sessionId: string) {
  const secret = getDemoSessionSecret();
  if (!secret) return null;

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${DEMO_COOKIE_VERSION}.${sessionId}`));
  return toBase64Url(signature);
}

function timingSafeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;

  let result = 0;
  for (let index = 0; index < left.length; index += 1) {
    result |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return result === 0;
}

export async function createDemoAuthCookieValue(sessionId: string) {
  const signature = await signDemoSessionId(sessionId);
  if (!signature) {
    throw new Error('Demo session signing secret is missing. Set DEMO_SESSION_SECRET or a server-only Supabase admin key.');
  }

  return `${DEMO_COOKIE_VERSION}.${sessionId}.${signature}`;
}

export async function getDemoSessionIdFromAuthCookie(cookieValue?: string) {
  if (!isDemoModeEnabled() || !cookieValue) return null;

  const [version, sessionId, signature] = cookieValue.split('.');
  if (version !== DEMO_COOKIE_VERSION || !sessionId || !signature) return null;

  const expectedSignature = await signDemoSessionId(sessionId);
  if (!expectedSignature || !timingSafeEqual(signature, expectedSignature)) return null;

  return sessionId;
}

export async function hasDemoAuthCookie(cookieValue?: string) {
  return Boolean(await getDemoSessionIdFromAuthCookie(cookieValue));
}
