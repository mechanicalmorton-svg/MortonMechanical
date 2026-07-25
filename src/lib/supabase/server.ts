import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let adminClient: SupabaseClient | null = null;

export function getSupabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL;
}

function firstDefined(...values: Array<string | undefined>) {
  for (const value of values) {
    if (value?.trim()) return value.trim();
  }
  return undefined;
}

/** Publishable key (new `sb_publishable_...` or legacy anon JWT). */
export function getPublishableKey() {
  const publishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  // Prefer opaque publishable keys when both are present.
  if (publishable?.startsWith("sb_publishable_")) return publishable;
  if (anon?.startsWith("sb_publishable_")) return anon;
  return firstDefined(publishable, anon);
}

/** Secret key (new `sb_secret_...` or legacy service_role JWT). Server only. */
export function getSecretKey() {
  const secret = process.env.SUPABASE_SECRET_KEY?.trim();
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  // Prefer opaque secret keys — legacy service_role JWTs break Auth Admin under ES256.
  if (secret?.startsWith("sb_secret_")) return secret;
  if (serviceRole?.startsWith("sb_secret_")) return serviceRole;
  return firstDefined(secret, serviceRole);
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
