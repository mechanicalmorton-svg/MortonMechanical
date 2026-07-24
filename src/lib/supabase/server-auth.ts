import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
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

export async function getSupabaseAuthUser(): Promise<AdminUser | null> {
  const supabase = await createAuthServerClient();
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email || !isAllowedAdminEmail(user.email)) return null;

  let name = (user.user_metadata?.full_name as string | undefined) || emailToDisplayName(user.email);
  let role: StaffRole = "owner";

  const admin = getSupabaseAdmin();
  if (admin) {
    const { data: staff } = await admin.from("staff").select("name, role").eq("id", user.id).maybeSingle();
    if (staff?.name) name = staff.name;
    if (staff?.role) role = staff.role as StaffRole;
  }

  return {
    id: user.id,
    email: user.email,
    username: user.email.split("@")[0],
    name,
    role,
  };
}
