"use client";

import { createClient } from "@supabase/supabase-js";

let browserClient: ReturnType<typeof createClient> | null = null;

export function getSupabaseBrowser() {
  if (typeof window === "undefined") return null;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const key =
    (publishable?.startsWith("sb_publishable_") ? publishable : undefined) ||
    (anon?.startsWith("sb_publishable_") ? anon : undefined) ||
    publishable ||
    anon;
  if (!url || !key) return null;
  if (!browserClient) {
    // Public realtime only — do not persist/verify user JWTs in the browser
    // (ES256 access tokens without a `kid` fail client-side verification).
    browserClient = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
  }
  return browserClient;
}
