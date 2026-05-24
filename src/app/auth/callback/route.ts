import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Supabase Auth が認可後にリダイレクトしてくるエンドポイント。
// メール確認・パスワードリセット・OAuth（Google など）すべてここを経由する。
export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const { searchParams, origin } = requestUrl;
  const code = searchParams.get("code");

  // Open Redirect 防止: 同一オリジン内の相対パスのみ許可。
  const nextParam = searchParams.get("next") ?? "/app";
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/app";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const forwardedHost = request.headers.get("x-forwarded-host");
      const isLocalEnv = process.env.NODE_ENV === "development";
      const redirectOrigin = forwardedHost && !isLocalEnv
        ? `${requestUrl.protocol}//${forwardedHost}`
        : origin;
      return NextResponse.redirect(`${redirectOrigin}${next}`);
    }
  }

  // コード欠落・交換失敗時はエラーページへ。
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
