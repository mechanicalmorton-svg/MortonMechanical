import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { isJwtKeyError } from "../auth-errors";
import { getPublishableKey, getSupabaseUrl, getSupabaseAdmin, isSupabaseAuthConfigured } from "./server";
import type { StaffRole } from "../shop-types";
import {
  resolveUserRoles,
  type RolePermissions,
} from "../role-definitions";

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

/** Route-handler client that writes auth cookies onto the outgoing NextResponse. */
export async function createAuthRouteClient(response: NextResponse) {
  if (!isSupabaseAuthConfigured()) return null;
  const cookieStore = await cookies();

  return createServerClient(getSupabaseUrl()!, getPublishableKey()!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          try {
            cookieStore.set(name, value, options);
          } catch {
            /* cookie store may be read-only in some contexts */
          }
          response.cookies.set(name, value, options);
        });
      },
    },
  });
}

const ALLOWED_EMAIL_DOMAIN = "mortonsmechanical.com";

export function isAllowedAdminEmail(email: string | undefined) {
  if (!email) return false;
  return email.toLowerCase().endsWith(`@${ALLOWED_EMAIL_DOMAIN}`);
}

export type AdminUserRoleSummary = {
  id: string;
  name: string;
  color: string;
};

export type AdminUser = {
  id: string;
  username: string;
  email: string;
  name: string;
  /** Primary role (owner/admin priority, else first). */
  role: StaffRole;
  /** All assigned role ids. */
  roleIds: StaffRole[];
  /** Display summaries for every assigned role. */
  roles: AdminUserRoleSummary[];
  roleName: string;
  roleColor: string;
  permissions: RolePermissions;
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
    const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
    const json = Buffer.from(padded, "base64").toString("utf8");
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
  // 30s clock skew buffer
  return exp * 1000 <= Date.now() - 30_000;
}

function metadataFromClaims(payload: Record<string, unknown>) {
  const meta = payload.user_metadata;
  if (meta && typeof meta === "object") return meta as Record<string, unknown>;
  return undefined;
}

type CookieSession = {
  access_token?: string;
  user?: {
    id?: string;
    email?: string;
    user_metadata?: Record<string, unknown>;
  };
  currentSession?: {
    access_token?: string;
    user?: CookieSession["user"];
  };
};

/**
 * Read session from auth cookies only.
 * Do not call getSession()/getUser()/getClaims() — those re-verify ES256 tokens
 * that may lack a JWT `kid` and break the session.
 */
function parseSessionRaw(rawValue: string): CookieSession | null {
  let raw = rawValue;
  try {
    raw = decodeURIComponent(raw);
  } catch {
    /* keep original */
  }
  if (raw.startsWith("base64-")) raw = raw.slice("base64-".length);

  const attempts = [
    () => {
      const json = Buffer.from(raw.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
      return JSON.parse(json) as CookieSession;
    },
    () => JSON.parse(raw) as CookieSession,
  ];

  for (const attempt of attempts) {
    try {
      const parsed = attempt();
      if (parsed && typeof parsed === "object") return parsed;
    } catch {
      /* try next decode strategy */
    }
  }
  return null;
}

export async function getSessionFromCookies(): Promise<CookieSession | null> {
  try {
    const cookieStore = await cookies();
    const all = cookieStore.getAll();
    const basenames = new Set<string>();
    for (const cookie of all) {
      const match = cookie.name.match(/^(sb-.*-auth-token)(?:\.\d+)?$/);
      if (match?.[1]) basenames.add(match[1]);
    }

    for (const base of basenames) {
      // Prefer numbered chunks only. Mixing a bare cookie with `.0/.1` chunks corrupts JSON
      // and causes intermittent "Not signed in" / login redirects.
      const numbered = all
        .map((cookie) => {
          const match = cookie.name.match(new RegExp(`^${base.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\.(\\d+)$`));
          if (!match) return null;
          return { index: Number(match[1]), value: cookie.value };
        })
        .filter((item): item is { index: number; value: string } => item !== null)
        .sort((a, b) => a.index - b.index);

      const raw = numbered.length
        ? numbered.map((chunk) => chunk.value).join("")
        : all.find((cookie) => cookie.name === base)?.value;

      if (!raw) continue;
      const parsed = parseSessionRaw(raw);
      if (parsed?.access_token || parsed?.currentSession?.access_token || parsed?.user?.email) {
        return parsed;
      }
    }
  } catch {
    return null;
  }

  return null;
}

async function loadStaffProfile(userId: string) {
  const admin = getSupabaseAdmin();
  if (!admin) return null;

  try {
    const { data: staffById, error: byIdError } = await admin
      .from("staff")
      .select("name, email, role, role_ids, phone, avatar_url")
      .eq("id", userId)
      .maybeSingle();
    if (!byIdError && staffById) return staffById;

    // Older DBs may not have role_ids yet — retry without it.
    if (byIdError?.message?.toLowerCase().includes("role_ids")) {
      const { data: staffByIdLegacy, error: legacyError } = await admin
        .from("staff")
        .select("name, email, role, phone, avatar_url")
        .eq("id", userId)
        .maybeSingle();
      if (!legacyError && staffByIdLegacy) return staffByIdLegacy;
    }

    const { data: staffByAuth, error: byAuthError } = await admin
      .from("staff")
      .select("name, email, role, role_ids, phone, avatar_url")
      .eq("auth_user_id", userId)
      .maybeSingle();
    if (!byAuthError && staffByAuth) return staffByAuth;

    if (byAuthError?.message?.toLowerCase().includes("role_ids")) {
      const { data: staffByAuthLegacy, error: legacyAuthError } = await admin
        .from("staff")
        .select("name, email, role, phone, avatar_url")
        .eq("auth_user_id", userId)
        .maybeSingle();
      if (!legacyAuthError && staffByAuthLegacy) return staffByAuthLegacy;
    }
  } catch {
    /* admin key may be unverifiable — continue without staff row */
  }
  return null;
}

async function buildAdminUser(
  user: { id: string; email: string; user_metadata?: Record<string, unknown> },
  staff?: {
    name?: string | null;
    email?: string | null;
    role?: string | null;
    role_ids?: string[] | null;
    phone?: string | null;
    avatar_url?: string | null;
  } | null,
): Promise<AdminUser | null> {
  const email = (user.email || staff?.email || "").toLowerCase();
  if (!isAllowedAdminEmail(email)) return null;

  let name =
    (typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : undefined) ||
    emailToDisplayName(email);
  let phone = typeof staff?.phone === "string" ? staff.phone : "";
  let avatarUrl =
    (typeof staff?.avatar_url === "string" ? staff.avatar_url : undefined) ||
    (typeof user.user_metadata?.avatar_url === "string" ? user.user_metadata.avatar_url : undefined);

  if (staff?.name) name = staff.name;

  let role: StaffRole = "mechanic";
  let roleIds: StaffRole[] = ["mechanic"];
  let roles: AdminUser["roles"] = [{ id: "mechanic", name: "Mechanic", color: "slate" }];
  let roleName = "Mechanic";
  let roleColor = "slate";
  let permissions: RolePermissions = {
    tabs: ["dashboard", "work-orders", "bookings", "routes-today"],
    manageUsers: false,
    editSiteContent: false,
  };

  try {
    // Dynamic import avoids a circular dependency with shop-data/staff-auth.
    const { loadRoleDefinitions } = await import("../shop-data");
    const definitions = await loadRoleDefinitions();
    const resolved = resolveUserRoles(definitions, staff?.role_ids, staff?.role);
    role = resolved.primary.id;
    roleIds = resolved.roleIds;
    roles = resolved.roles.map((item) => ({
      id: item.id,
      name: item.name,
      color: item.color,
    }));
    roleName = resolved.primary.name;
    roleColor = resolved.primary.color;
    permissions = resolved.permissions;
  } catch {
    const fallbackIds = Array.isArray(staff?.role_ids) && staff.role_ids.length
      ? staff.role_ids.map(String)
      : staff?.role
        ? [String(staff.role)]
        : ["mechanic"];
    roleIds = fallbackIds;
    role = (fallbackIds.includes("owner")
      ? "owner"
      : fallbackIds.includes("admin")
        ? "admin"
        : fallbackIds[0] || "mechanic") as StaffRole;
    if (role === "owner" || role === "admin" || fallbackIds.includes("owner") || fallbackIds.includes("admin")) {
      const elevated = role === "owner" || fallbackIds.includes("owner");
      role = elevated ? "owner" : "admin";
      roleName = elevated ? "Founder" : "Admin";
      roleColor = elevated ? "sky" : "violet";
      roles = fallbackIds.map((id) => ({
        id,
        name: id === "owner" ? "Founder" : id === "admin" ? "Admin" : id,
        color: id === "owner" ? "sky" : id === "admin" ? "violet" : "slate",
      }));
      permissions = {
        tabs: [
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
        ],
        manageUsers: true,
        editSiteContent: true,
      };
    } else {
      roles = fallbackIds.map((id) => ({ id, name: id, color: "slate" }));
      roleName = role;
    }
  }

  return {
    id: user.id,
    email,
    username: email.split("@")[0],
    name,
    role,
    roleIds,
    roles,
    roleName,
    roleColor,
    permissions,
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
  const session = await getSessionFromCookies();
  const token = session?.access_token ?? session?.currentSession?.access_token;
  if (!token) return null;

  const payload = decodeJwtPayload(token);
  const cookieUser = session?.user ?? session?.currentSession?.user;
  const userId =
    (typeof payload?.sub === "string" ? payload.sub : null) ||
    (typeof cookieUser?.id === "string" ? cookieUser.id : null);
  if (!userId || !payload || isJwtExpired(payload)) return null;

  const admin = getSupabaseAdmin();
  if (admin) {
    try {
      const {
        data: { user },
        error,
      } = await admin.auth.admin.getUserById(userId);
      if (!error && user) {
        const resolved = await adminUserFromAuthUser(user);
        if (resolved) return resolved;
      }
      if (error && isJwtKeyError(error.message)) {
        console.warn("[server-auth] Auth admin API JWT key error; using session claims.");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      if (isJwtKeyError(message)) {
        console.warn("[server-auth] Auth admin API JWT key error; using session claims.");
      }
    }
  }

  // Prefer cookie/JWT claims when Admin API is unavailable (common with ES256 kid issues).
  const staff = await loadStaffProfile(userId);
  const email =
    (typeof payload.email === "string" ? payload.email : null) ||
    (typeof cookieUser?.email === "string" ? cookieUser.email : null) ||
    (typeof staff?.email === "string" ? staff.email : null);

  if (!email) return null;

  return await buildAdminUser(
    {
      id: userId,
      email,
      user_metadata: cookieUser?.user_metadata ?? metadataFromClaims(payload),
    },
    staff,
  );
}
