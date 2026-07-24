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

export type AdminUser = {
  id: string;
  username: string;
  email: string;
  name: string;
  role: StaffRole;
  phone?: string;
  avatarUrl?: string;
};

function emailToDisplayName(email: string) {
  return email
    .split("@")[0]
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function decodeJwtPart(part: string): Record<string, unknown> | null {
  try {
    const normalized = part.replace(/-/g, "+").replace(/_/g, "/");
    const json = Buffer.from(normalized, "base64").toString("utf8");
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const payload = token.split(".")[1];
  if (!payload) return null;
  return decodeJwtPart(payload);
}

function isJwtExpired(payload: Record<string, unknown>) {
  const exp = typeof payload.exp === "number" ? payload.exp : null;
  if (!exp) return false;
  return exp * 1000 <= Date.now();
}

/**
 * ES256 access tokens without a `kid` fail Auth `/user` and `getClaims()` verification.
 * Prefer reading the cookie session and confirming the user via the service-role Admin API.
 */
async function getAccessTokenFromSession() {
  const supabase = await createAuthServerClient();
  if (!supabase) return null;

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  } catch {
    return null;
  }
}

async function loadStaffProfile(userId: string) {
  const admin = getSupabaseAdmin();
  if (!admin) return null;

  const { data: staffById } = await admin
    .from("staff")
    .select("name, role, phone, avatar_url")
    .eq("id", userId)
    .maybeSingle();
  if (staffById) return staffById;

  const { data: staffByAuth } = await admin
    .from("staff")
    .select("name, role, phone, avatar_url")
    .eq("auth_user_id", userId)
    .maybeSingle();
  return staffByAuth;
}

function buildAdminUser(
  user: { id: string; email: string; user_metadata?: Record<string, unknown> },
  staff?: { name?: string | null; role?: string | null; phone?: string | null; avatar_url?: string | null } | null,
): AdminUser | null {
  if (!isAllowedAdminEmail(user.email)) return null;

  let name =
    (typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : undefined) ||
    emailToDisplayName(user.email);
  let role: StaffRole = "mechanic";
  let phone = typeof staff?.phone === "string" ? staff.phone : "";
  let avatarUrl =
    (typeof staff?.avatar_url === "string" ? staff.avatar_url : undefined) ||
    (typeof user.user_metadata?.avatar_url === "string" ? user.user_metadata.avatar_url : undefined);

  if (staff?.name) name = staff.name;
  if (staff?.role) role = staff.role as StaffRole;

  return {
    id: user.id,
    email: user.email,
    username: user.email.split("@")[0],
    name,
    role,
    phone,
    avatarUrl,
  };
}

async function adminUserFromAuthUser(user: User) {
  if (!user.email) return null;
  const staff = await loadStaffProfile(user.id);
  return buildAdminUser({ id: user.id, email: user.email, user_metadata: user.user_metadata }, staff);
}

export async function getSupabaseAuthUser(): Promise<AdminUser | null> {
  const token = await getAccessTokenFromSession();
  if (!token) return null;

  const payload = decodeJwtPayload(token);
  const userId = typeof payload?.sub === "string" ? payload.sub : null;
  if (!userId || !payload || isJwtExpired(payload)) return null;

  const admin = getSupabaseAdmin();
  if (!admin) return null;

  const {
    data: { user },
    error,
  } = await admin.auth.admin.getUserById(userId);
  if (error || !user) return null;

  return adminUserFromAuthUser(user);
}
