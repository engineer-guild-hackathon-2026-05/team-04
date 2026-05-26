import { NextResponse, type NextRequest } from "next/server";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { DEMO_AUTH_COOKIE } from "@/lib/demoMode";

// サーバー側でセッション cookie を失効させるためのログアウト用エンドポイント。
// GET は CSRF 経由で意図しないログアウトを誘発できるため受け付けない。
export async function POST(request: NextRequest) {
  const { origin } = new URL(request.url);
  const response = NextResponse.redirect(`${origin}/login`, { status: 303 });
  response.cookies.set(DEMO_AUTH_COOKIE, "", {
    path: "/",
    maxAge: 0,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  if (!hasSupabaseConfig()) {
    return response;
  }

  const supabase = await createClient();

  // セッションがあるときだけ signOut。未ログインでも 200 を返してフローを単純化。
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    await supabase.auth.signOut();
  }

  return response;
}
