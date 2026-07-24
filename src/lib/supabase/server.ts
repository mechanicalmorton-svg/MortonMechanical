import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let adminClient: SupabaseClient | null = null;

export function getSupabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL;
}

/** Publishable key (new `sb_publishable_...` or legacy anon JWT). */
export function getPublishableKey() {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  );
}

/** Secret key (new `sb_secret_...` or legacy service_role JWT). Server only. */
export function getSecretKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
}

export function isSupabaseConfigured() {
  return !!(getSupabaseUrl() && getSecretKey());
}

/** True when Supabase Auth (email/password login) can run. */
export function isSupabaseAuthConfigured() {
  return !!(getSupabaseUrl() && getPublishableKey());
}

/** Server-side client with secret key — use only in API routes and server components. */
export function getSupabaseAdmin() {
  if (!isSupabaseConfigured()) return null;
  if (!adminClient) {
    adminClient = createClient(getSupabaseUrl()!, getSecretKey()!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return adminClient;
}

/** Public client for read-only website data and realtime subscriptions. */
export function getSupabasePublic() {
  const url = getSupabaseUrl();
  const key = getPublishableKey();
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}
