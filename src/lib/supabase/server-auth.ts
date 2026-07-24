import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getPublishableKey, getSupabaseUrl, isSupabaseAuthConfigured } from "./server";

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

export type AdminUser = { id: string; username: string; email: string };

export async function getSupabaseAuthUser(): Promise<AdminUser | null> {
  const supabase = await createAuthServerClient();
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email || !isAllowedAdminEmail(user.email)) return null;
  return {
    id: user.id,
    email: user.email,
    username: user.email.split("@")[0],
  };
}
