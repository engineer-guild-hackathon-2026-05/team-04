import 'server-only';

import { createClient } from '@supabase/supabase-js';

import { getSupabaseConfig } from '@/lib/supabase/config';

export type SupabaseAdminConfig = {
  supabaseUrl: string;
  supabaseAdminKey: string;
};

export function getSupabaseAdminConfig(): SupabaseAdminConfig | null {
  const config = getSupabaseConfig();
  const supabaseAdminKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;

  if (!config || !supabaseAdminKey) {
    return null;
  }

  return {
    supabaseUrl: config.supabaseUrl,
    supabaseAdminKey,
  };
}

export function hasSupabaseAdminConfig() {
  return Boolean(getSupabaseAdminConfig());
}

export function createAdminClient() {
  const config = getSupabaseAdminConfig();
  if (!config) {
    throw new Error(
      'Supabase admin configuration is missing. Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY on the server.',
    );
  }

  return createClient(config.supabaseUrl, config.supabaseAdminKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
