import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { DEMO_AUTH_COOKIE, hasDemoAuthCookie, isDemoModeEnabled } from "@/lib/demoMode";

// Next.js middleware から呼ばれ、リクエストごとにセッション Cookie を更新する。
// この処理を怠ると Server Component 側で getUser() がスタンプの古いセッションを返す。
function clearDemoCookie(response: NextResponse) {
  response.cookies.set(DEMO_AUTH_COOKIE, "", {
    path: "/",
    maxAge: 0,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  return response;
}

export async function updateSession(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const demoCookieValue = request.cookies.get(DEMO_AUTH_COOKIE)?.value;
  const shouldClearDemoCookie = Boolean(demoCookieValue) && !isDemoModeEnabled();

  if (pathname === "/auth/demo") {
    const response = NextResponse.next({ request });
    return shouldClearDemoCookie ? clearDemoCookie(response) : response;
  }

  const isDemoEnabled = isDemoModeEnabled();
  const isDemoAuthenticated = hasDemoAuthCookie(demoCookieValue);

  if (isDemoAuthenticated) {
    if (pathname === "/login") {
      const url = request.nextUrl.clone();
      url.pathname = "/app";
      url.search = "";
      const response = NextResponse.redirect(url);
      return shouldClearDemoCookie ? clearDemoCookie(response) : response;
    }

    return NextResponse.next({ request });
  }

  if (isDemoEnabled) {
    const response = NextResponse.next({ request });
    if (demoCookieValue) clearDemoCookie(response);

    if (pathname.startsWith("/app")) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.search = "";
      url.searchParams.set("redirect", `${pathname}${request.nextUrl.search}`);
      const redirectResponse = NextResponse.redirect(url);
      return demoCookieValue ? clearDemoCookie(redirectResponse) : redirectResponse;
    }

    return response;
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // getSession ではなく getUser を使う（Auth サーバーで再検証されるため改竄に強い）。
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 未ログインユーザーを保護ルートから /login にリダイレクト。
  // 保護対象ルートはここに集約する。
  const isAuthenticated = Boolean(user);
  const isProtectedRoute = pathname.startsWith("/app");
  if (!isAuthenticated && isProtectedRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("redirect", `${pathname}${request.nextUrl.search}`);
    const response = NextResponse.redirect(url);
    return shouldClearDemoCookie ? clearDemoCookie(response) : response;
  }

  if (isAuthenticated && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/app";
    url.search = "";
    const response = NextResponse.redirect(url);
    return shouldClearDemoCookie ? clearDemoCookie(response) : response;
  }

  return shouldClearDemoCookie ? clearDemoCookie(supabaseResponse) : supabaseResponse;
}
