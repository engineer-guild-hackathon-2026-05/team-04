import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

import { createAdminClient, hasSupabaseAdminConfig } from '@/lib/supabase/admin';
import { DEMO_SESSION_HEADER, DEMO_SESSION_STORAGE_KEY } from '@/lib/demoSessionKeys';

export { DEMO_SESSION_HEADER, DEMO_SESSION_STORAGE_KEY };

export type DemoSessionRow = {
  id: string;
  display_number?: number | null;
  display_name: string;
  created_at?: string | null;
  updated_at?: string | null;
};

export type DemoProfileRow = {
  session_id: string;
  name: string;
  preferred_dishes?: string[] | null;
  preferred_cuisines?: string[] | null;
  non_ingredient_restrictions?: string[] | null;
  non_ingredient_restriction_reasons?: unknown;
};

type DemoAdminClient = SupabaseClient;

const DEMO_SESSION_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isDemoSessionId(value?: string | null): value is string {
  return typeof value === 'string' && DEMO_SESSION_ID_PATTERN.test(value);
}

export function isDemoPersistenceConfigured() {
  return hasSupabaseAdminConfig();
}

function getDemoAdminClient(supabase?: DemoAdminClient) {
  return supabase ?? createAdminClient();
}

export async function getDemoSession(sessionId: string, supabase?: DemoAdminClient) {
  if (!isDemoSessionId(sessionId)) return null;

  const admin = getDemoAdminClient(supabase);
  const { data, error } = await admin
    .from('demo_sessions')
    .select('id, display_number, display_name, created_at, updated_at')
    .eq('id', sessionId)
    .maybeSingle();

  if (error) throw error;
  return data as DemoSessionRow | null;
}

export async function createDemoSession(supabase?: DemoAdminClient) {
  const admin = getDemoAdminClient(supabase);
  const { data: session, error: sessionError } = await admin
    .from('demo_sessions')
    .insert({})
    .select('id, display_number, display_name, created_at, updated_at')
    .single();

  if (sessionError) throw sessionError;

  const demoSession = session as DemoSessionRow;
  const { error: profileError } = await admin
    .from('demo_profiles')
    .upsert({
      session_id: demoSession.id,
      name: demoSession.display_name,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'session_id' });

  if (profileError) throw profileError;

  return demoSession;
}

export async function restoreOrCreateDemoSession(sessionId?: string | null, supabase?: DemoAdminClient) {
  const admin = getDemoAdminClient(supabase);
  const existingSession = isDemoSessionId(sessionId) ? await getDemoSession(sessionId, admin) : null;

  if (existingSession) {
    return { session: existingSession, isNew: false };
  }

  const session = await createDemoSession(admin);
  return { session, isNew: true };
}
