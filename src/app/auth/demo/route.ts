import { NextResponse, type NextRequest } from 'next/server';
import {
  DEMO_AUTH_COOKIE,
  DEMO_AUTH_COOKIE_MAX_AGE_SECONDS,
  createDemoAuthCookieValue,
  getDemoSessionIdFromAuthCookie,
  hasDemoSessionSigningSecret,
} from '@/lib/demoMode';
import { DEMO_SESSION_STORAGE_KEY, getDemoSession, isDemoPersistenceConfigured, restoreOrCreateDemoSession } from '@/lib/demoSession';

type DemoLoginPayload = {
  sessionId?: string;
};

function clearDemoCookie(response: NextResponse) {
  response.cookies.set(DEMO_AUTH_COOKIE, '', {
    path: '/',
    maxAge: 0,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });
}

function createUnavailableResponse() {
  const response = NextResponse.json({ authenticated: false, error: 'Demo login is not configured.' }, { status: 503 });
  clearDemoCookie(response);
  return response;
}

function createUnauthenticatedResponse({ clearCookie = false } = {}) {
  const response = NextResponse.json({ authenticated: false }, { status: 401 });
  if (clearCookie) clearDemoCookie(response);
  return response;
}

function isSameOriginRequest(request: NextRequest) {
  return request.headers.get('origin') === request.nextUrl.origin;
}

function setDemoCookie(response: NextResponse, cookieValue: string) {
  response.cookies.set(DEMO_AUTH_COOKIE, cookieValue, {
    path: '/',
    httpOnly: true,
    maxAge: DEMO_AUTH_COOKIE_MAX_AGE_SECONDS,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });
}

export async function GET(request: NextRequest) {
  if (!isDemoPersistenceConfigured() || !hasDemoSessionSigningSecret()) {
    return createUnavailableResponse();
  }

  const demoCookieValue = request.cookies.get(DEMO_AUTH_COOKIE)?.value;
  const sessionId = await getDemoSessionIdFromAuthCookie(demoCookieValue);
  if (!sessionId) {
    return createUnauthenticatedResponse({ clearCookie: Boolean(demoCookieValue) });
  }

  const session = await getDemoSession(sessionId);
  if (!session) {
    return createUnauthenticatedResponse({ clearCookie: true });
  }

  return NextResponse.json({
    authenticated: true,
    sessionId: session.id,
    userName: session.display_name,
  });
}

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ authenticated: false }, { status: 403 });
  }

  if (!isDemoPersistenceConfigured() || !hasDemoSessionSigningSecret()) {
    return createUnavailableResponse();
  }

  const payload = await request.json().catch((): DemoLoginPayload => ({}));
  const { session, isNew } = await restoreOrCreateDemoSession(payload.sessionId);
  const cookieValue = await createDemoAuthCookieValue(session.id);
  const response = NextResponse.json({
    authenticated: true,
    sessionId: session.id,
    sessionStorageKey: DEMO_SESSION_STORAGE_KEY,
    userName: session.display_name,
    isNew,
  });

  setDemoCookie(response, cookieValue);
  return response;
}

export async function DELETE(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ authenticated: false }, { status: 403 });
  }

  const response = NextResponse.json({ authenticated: false });
  clearDemoCookie(response);
  return response;
}
