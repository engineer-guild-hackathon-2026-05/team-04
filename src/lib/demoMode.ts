export const DEMO_AUTH_COOKIE = 'globalbites_demo_auth';

export function isDemoModeEnabled() {
  const value = process.env.DEMO_MODE?.toLowerCase();
  return value === 'true' || value === '1' || value === 'yes' || value === 'on';
}

export function hasDemoAuthCookie(cookieValue?: string) {
  return isDemoModeEnabled() && cookieValue === '1';
}
