import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { requireSupabaseConfig } from "@/lib/supabase/config";

// Server Component / Server Action / Route Handler から呼び出す Supabase クライアント。
// Next.js の Cookie ストアを介してセッションを読み書きする。
export async function createClient() {
  const { supabaseUrl, supabaseAnonKey } = requireSupabaseConfig();
  const cookieStore = await cookies();

  return createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Server Component から呼ばれた場合は Cookie の書き込みができないため握りつぶす。
            // middleware 側でセッション refresh が走るので問題ない。
          }
        },
      },
    },
  );
}
