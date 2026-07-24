import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AUTH_COOKIE, getSessionUser } from "./auth";
import { getSupabaseAuthUser } from "./supabase/server-auth";
import { isSupabaseAuthConfigured } from "./supabase/server";

export async function getAuthUser() {
  if (isSupabaseAuthConfigured()) return getSupabaseAuthUser();
  const jar = await cookies();
  return getSessionUser(jar.get(AUTH_COOKIE)?.value);
}

export async function requireAuth() {
  const user = await getAuthUser();
  if (!user) return { user: null, error: NextResponse.json({ error: "Not signed in." }, { status: 401 }) };
  return { user, error: null };
}
