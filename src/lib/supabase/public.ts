import 'server-only';

import { createClient } from '@supabase/supabase-js';

import { requireSupabaseConfig } from '@/lib/supabase/config';

// Public read-only Route Handlers use an anon-key client that is not bound to request cookies.
// This avoids leaking stale/future-issued user session JWTs into public PostgREST reads.
export function createPublicReadClient() {
  const { supabaseUrl, supabaseAnonKey } = requireSupabaseConfig();

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}
