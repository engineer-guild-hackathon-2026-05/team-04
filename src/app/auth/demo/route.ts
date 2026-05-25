import { NextResponse, type NextRequest } from 'next/server';
import { DEMO_AUTH_COOKIE, hasDemoAuthCookie, isDemoModeEnabled } from '@/lib/demoMode';

const DEMO_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

type DemoLoginPayload = {
  email?: string;
};

function clearDemoCookie(response: NextResponse) {
  response.cookies.set(DEMO_AUTH_COOKIE, '', {
    path: '/',
    maxAge: 0,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });
}

function createDisabledResponse() {
  const response = NextResponse.json({ authenticated: false }, { status: 404 });
  clearDemoCookie(response);
  return response;
}

function isSameOriginRequest(request: NextRequest) {
  return request.headers.get('origin') === request.nextUrl.origin;
}

export async function GET(request: NextRequest) {
  if (!isDemoModeEnabled()) {
    return createDisabledResponse();
  }

  if (!hasDemoAuthCookie(request.cookies.get(DEMO_AUTH_COOKIE)?.value)) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  return NextResponse.json({ authenticated: true });
}

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ authenticated: false }, { status: 403 });
  }

  if (!isDemoModeEnabled()) {
    return createDisabledResponse();
  }

  const payload = await request.json().catch((): DemoLoginPayload => ({}));
  const fallbackName = payload.email?.split('@')[0] || 'デモユーザー';
  const response = NextResponse.json({
    authenticated: true,
    userName: fallbackName,
  });

  response.cookies.set(DEMO_AUTH_COOKIE, '1', {
    path: '/',
    httpOnly: true,
    maxAge: DEMO_COOKIE_MAX_AGE_SECONDS,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });

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
