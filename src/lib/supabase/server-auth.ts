import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { User } from "@supabase/supabase-js";
import { getPublishableKey, getSupabaseUrl, getSupabaseAdmin, isSupabaseAuthConfigured } from "./server";
import type { StaffRole } from "../shop-types";

export async function createAuthServerClient() {
  if (!isSupabaseAuthConfigured()) return null;
  const cookieStore = await cookies();

  return createServerClient(getSupabaseUrl()!, getPublishableKey()!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          /* ignored in Server Components */
        }
      },
    },
  });
}

const ALLOWED_EMAIL_DOMAIN = "mortonsmechanical.com";

export function isAllowedAdminEmail(email: string | undefined) {
  if (!email) return false;
  return email.toLowerCase().endsWith(`@${ALLOWED_EMAIL_DOMAIN}`);
}

export type AdminUser = { id: string; username: string; email: string; name: string; role: StaffRole };

function emailToDisplayName(email: string) {
  return email
    .split("@")[0]
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json = Buffer.from(normalized, "base64").toString("utf8");
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

async function loadStaffProfile(userId: string) {
  const admin = getSupabaseAdmin();
  if (!admin) return null;

  const { data: staffById } = await admin.from("staff").select("name, role").eq("id", userId).maybeSingle();
  if (staffById) return staffById;

  const { data: staffByAuth } = await admin
    .from("staff")
    .select("name, role")
    .eq("auth_user_id", userId)
    .maybeSingle();
  return staffByAuth;
}

function buildAdminUser(
  user: { id: string; email: string; user_metadata?: Record<string, unknown> },
  staff?: { name?: string | null; role?: string | null } | null,
): AdminUser | null {
  if (!isAllowedAdminEmail(user.email)) return null;

  let name =
    (typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : undefined) ||
    emailToDisplayName(user.email);
  let role: StaffRole = "mechanic";

  if (staff?.name) name = staff.name;
  if (staff?.role) role = staff.role as StaffRole;

  return {
    id: user.id,
    email: user.email,
    username: user.email.split("@")[0],
    name,
    role,
  };
}

function adminUserFromClaims(claims: Record<string, unknown>, staff?: { name?: string | null; role?: string | null } | null) {
  const email = typeof claims.email === "string" ? claims.email : undefined;
  const userId = typeof claims.sub === "string" ? claims.sub : undefined;
  if (!email || !userId) return null;

  return buildAdminUser(
    {
      id: userId,
      email,
      user_metadata:
        typeof claims.user_metadata === "object" && claims.user_metadata
          ? (claims.user_metadata as Record<string, unknown>)
          : undefined,
    },
    staff,
  );
}

async function adminUserFromAuthUser(user: User) {
  if (!user.email) return null;
  const staff = await loadStaffProfile(user.id);
  return buildAdminUser({ id: user.id, email: user.email, user_metadata: user.user_metadata }, staff);
}

export async function getSupabaseAuthUser(): Promise<AdminUser | null> {
  const supabase = await createAuthServerClient();
  if (!supabase) return null;

  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  if (!claimsError && claimsData?.claims) {
    const userId = typeof claimsData.claims.sub === "string" ? claimsData.claims.sub : null;
    const staff = userId ? await loadStaffProfile(userId) : null;
    return adminUserFromClaims(claimsData.claims as Record<string, unknown>, staff);
  }

  // Some ES256 session tokens lack a JWT `kid` header and fail Auth `/user` verification.
  // Confirm the cookie session via service role instead of local JWT verification.
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) return null;

  const payload = decodeJwtPayload(token);
  const userId = typeof payload?.sub === "string" ? payload.sub : null;
  if (!userId) return null;

  const admin = getSupabaseAdmin();
  if (!admin) return null;

  const { data: { user }, error } = await admin.auth.admin.getUserById(userId);
  if (error || !user) return null;

  return adminUserFromAuthUser(user);
}
