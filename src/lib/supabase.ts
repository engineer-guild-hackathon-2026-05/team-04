import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// 環境変数が設定されている場合のみ Supabase クライアントを初期化
export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Supabaseが有効かどうかを判定するヘルパー
export const isSupabaseEnabled = (): boolean => {
  return supabase !== null;
};
