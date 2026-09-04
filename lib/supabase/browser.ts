'use client';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null | undefined;

export function getBrowserSupabase(): SupabaseClient | null {
  if (client !== undefined) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    client = null;
    return client;
  }

  client = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return client;
}

export function isBrowserSupabaseConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
