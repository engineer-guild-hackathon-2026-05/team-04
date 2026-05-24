import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Next.js middleware から呼ばれ、リクエストごとにセッション Cookie を更新する。
// この処理を怠ると Server Component 側で getUser() がスタンプの古いセッションを返す。
export async function updateSession(request: NextRequest) {
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
  const { pathname } = request.nextUrl;
  const isProtectedRoute = pathname.startsWith("/app");
  const isAuthRoute =
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/auth");

  if (!user && isProtectedRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  if (user && (pathname === "/login" || pathname === "/signup")) {
    const url = request.nextUrl.clone();
    url.pathname = "/app";
    return NextResponse.redirect(url);
  }

  // isAuthRoute は将来の拡張用に変数として保持（現状はリダイレクト判定にのみ利用）。
  void isAuthRoute;

  return supabaseResponse;
}
