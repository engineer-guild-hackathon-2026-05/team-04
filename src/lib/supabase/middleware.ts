import { createServerClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { DEMO_AUTH_COOKIE, getDemoSessionIdFromAuthCookie } from "@/lib/demoMode";
import { getSupabaseConfig } from "@/lib/supabase/config";

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
  const demoSessionId = await getDemoSessionIdFromAuthCookie(demoCookieValue);
  const isDemoAuthenticated = Boolean(demoSessionId);
  const shouldClearInvalidDemoCookie = Boolean(demoCookieValue) && !isDemoAuthenticated;

  if (pathname === "/auth/demo") {
    const response = NextResponse.next({ request });
    // POST は route handler が有効な demo cookie を発行するため、middleware では削除 cookie を重ねない。
    const shouldClearAuthDemoCookie =
      request.method !== "POST" && shouldClearInvalidDemoCookie;
    return shouldClearAuthDemoCookie ? clearDemoCookie(response) : response;
  }

  if (isDemoAuthenticated) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });
  let user: User | null = null;
  const supabaseConfig = getSupabaseConfig();

  if (supabaseConfig) {
    const supabase = createServerClient(
      supabaseConfig.supabaseUrl,
      supabaseConfig.supabasePublishableKey,
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
      data: { user: supabaseUser },
    } = await supabase.auth.getUser();
    user = supabaseUser;
  }

  // 未ログインユーザーを保護ルートから /login にリダイレクト。
  // 保護対象ルートはここに集約する。Supabase session とゲストCookieをそれぞれ尊重する。
  const isAuthenticated = Boolean(user);
  const isProtectedRoute = pathname.startsWith("/app");
  if (!isAuthenticated && isProtectedRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("redirect", `${pathname}${request.nextUrl.search}`);
    const response = NextResponse.redirect(url);
    return shouldClearInvalidDemoCookie ? clearDemoCookie(response) : response;
  }

  if (isAuthenticated && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/app";
    url.search = "";
    const response = NextResponse.redirect(url);
    return shouldClearInvalidDemoCookie ? clearDemoCookie(response) : response;
  }

  return shouldClearInvalidDemoCookie ? clearDemoCookie(supabaseResponse) : supabaseResponse;
}
