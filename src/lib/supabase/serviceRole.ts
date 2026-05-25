import 'server-only';

import { createClient } from '@supabase/supabase-js';
import { requireSupabaseConfig } from '@/lib/supabase/config';

export class ServiceRoleConfigError extends Error {
  constructor(message = 'SUPABASE_SERVICE_ROLE_KEY is not configured.') {
    super(message);
    this.name = 'ServiceRoleConfigError';
  }
}

export function createServiceRoleClient() {
  const { supabaseUrl } = requireSupabaseConfig();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    throw new ServiceRoleConfigError();
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
