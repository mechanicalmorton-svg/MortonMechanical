import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { canManageUsers } from "./admin-roles";
import { AUTH_COOKIE, getSessionUser } from "./auth";
import { getSupabaseAuthUser, type AdminUser } from "./supabase/server-auth";
import { isSupabaseAuthConfigured } from "./supabase/server";

export type AuthUser = AdminUser & { role: AdminUser["role"] };

export async function getAuthUser(): Promise<AuthUser | null> {
  if (isSupabaseAuthConfigured()) return getSupabaseAuthUser();
  const jar = await cookies();
  const user = await getSessionUser(jar.get(AUTH_COOKIE)?.value);
  if (!user) return null;
  const role = user.role ?? "owner";
  const isElevated = role === "owner" || role === "admin";
  return {
    id: user.id,
    username: user.username,
    email: user.username,
    name: user.name ?? user.username,
    role,
    roleIds: [role],
    roles: [
      {
        id: role,
        name: role === "owner" ? "Founder" : role,
        color: role === "owner" ? "sky" : role === "admin" ? "violet" : "slate",
      },
    ],
    roleName: role === "owner" ? "Founder" : role,
    roleColor: role === "owner" ? "sky" : role === "admin" ? "violet" : "slate",
    permissions: {
      tabs: isElevated
        ? [
            "dashboard",
            "inventory-all",
            "inventory-low",
            "work-orders",
            "bookings",
            "quotes",
            "users",
            "fleet",
            "routes-manager",
            "routes-today",
            "site-contents",
            "audit-logs",
          ]
        : ["dashboard", "work-orders", "bookings", "routes-today"],
      manageUsers: isElevated,
      editSiteContent: isElevated,
    },
  };
}

const SESSION_ERROR = "Could not verify your session for that request. Refresh the page if this keeps happening.";

export async function requireAuth() {
  const user = await getAuthUser();
  if (!user) return { user: null, error: NextResponse.json({ error: SESSION_ERROR }, { status: 401 }) };
  return { user, error: null };
}

export async function requireOwnerOrAdmin() {
  const { user, error } = await requireAuth();
  if (error || !user) {
    return { user: null, error: error ?? NextResponse.json({ error: SESSION_ERROR }, { status: 401 }) };
  }
  if (
    !(
      user.permissions?.manageUsers ||
      canManageUsers(user.role) ||
      user.roleIds?.includes("owner") ||
      user.roleIds?.includes("admin")
    )
  ) {
    return { user: null, error: NextResponse.json({ error: "You do not have permission for this action." }, { status: 403 }) };
  }
  return { user, error: null };
}
