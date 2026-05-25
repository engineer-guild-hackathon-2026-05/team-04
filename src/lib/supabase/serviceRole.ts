import 'server-only';

import { createClient } from '@supabase/supabase-js';
import { requireSupabaseConfig } from '@/lib/supabase/config';

export class ServiceRoleConfigError extends Error {
  constructor(message = 'SUPABASE_SECRET_KEY is not configured.') {
    super(message);
    this.name = 'ServiceRoleConfigError';
  }
}

export function createServiceRoleClient() {
  const { supabaseUrl } = requireSupabaseConfig();
  const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

  if (!supabaseSecretKey) {
    throw new ServiceRoleConfigError();
  }

  return createClient(supabaseUrl, supabaseSecretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
