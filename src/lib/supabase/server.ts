import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let adminClient: SupabaseClient | null = null;

export function getSupabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL;
}

/** Publishable key (new `sb_publishable_...` or legacy anon JWT). */
export function getPublishableKey() {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

/** Secret key (new `sb_secret_...` or legacy service_role JWT). Server only. */
export function getSecretKey() {
  return process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
}

export function isSupabaseConfigured() {
  return !!(getSupabaseUrl() && getSecretKey());
}

/** True when Supabase Auth (email/password login) can run. */
export function isSupabaseAuthConfigured() {
  return !!(getSupabaseUrl() && getPublishableKey());
}

function warnIfSecretKeyLooksWrong(secret: string) {
  // Prefer new API keys. Legacy service_role JWTs can fail Auth Admin when the project
  // uses ES256 signing keys (especially tokens without a JWT `kid`).
  if (secret.startsWith("sb_secret_")) return;
  if (secret.startsWith("eyJ")) {
    console.warn(
      "[supabase] SUPABASE_SERVICE_ROLE_KEY is a JWT. If you see ES256 kid errors, replace it with SUPABASE_SECRET_KEY=`sb_secret_...` from Dashboard → Settings → API Keys.",
    );
  }
}

/** Server-side client with secret key — use only in API routes and server components. */
export function getSupabaseAdmin() {
  if (!isSupabaseConfigured()) return null;
  if (!adminClient) {
    const secret = getSecretKey()!;
    warnIfSecretKeyLooksWrong(secret);
    adminClient = createClient(getSupabaseUrl()!, secret, {
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
