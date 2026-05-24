import { createBrowserClient } from "@supabase/ssr";

// ブラウザ（Client Component）から呼び出す Supabase クライアント。
// セッションは Cookie 経由で共有されるため、サーバー側と同一ユーザーで動作する。
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
