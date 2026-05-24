import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// ログアウト用エンドポイント。フロントは POST /auth/signout を叩くだけでよい。
// GET は CSRF 経由で意図しないログアウトを誘発できるため受け付けない。
export async function POST(request: Request) {
  const supabase = await createClient();

  // セッションがあるときだけ signOut。未ログインでも 200 を返してフローを単純化。
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    await supabase.auth.signOut();
  }

  const { origin } = new URL(request.url);
  return NextResponse.redirect(`${origin}/login`, { status: 303 });
}
