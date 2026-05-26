import { createBrowserClient } from "@supabase/ssr";
import { requireSupabaseConfig } from "@/lib/supabase/config";

// ブラウザ（Client Component）から呼び出す Supabase クライアント。
// セッションは Cookie 経由で共有されるため、サーバー側と同一ユーザーで動作する。
export function createClient() {
  const { supabaseUrl, supabasePublishableKey } = requireSupabaseConfig();

  return createBrowserClient(
    supabaseUrl,
    supabasePublishableKey,
  );
}
