import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { AUTH_COOKIE, isSetupComplete, login, logout, setupAdmin } from "@/lib/auth";
import { normalizeRoleIds } from "@/lib/role-definitions";
import { isAllowedAdminEmail } from "@/lib/supabase/server-auth";
import { getPublishableKey, getSupabaseAdmin, getSupabaseUrl, isSupabaseAuthConfigured } from "@/lib/supabase/server";
import { isJwtKeyError, sanitizeAuthError } from "@/lib/auth-errors";
import { auditContextFromRequest, runWithAuditContext } from "@/lib/audit-log";
import { auditAuthEvent } from "@/lib/audit-instrument";

type PendingCookie = {
  name: string;
  value: string;
  options?: Parameters<NextResponse["cookies"]["set"]>[2];
};

type LoginPortal = "admin" | "mechanic" | "dispatcher";

function isAuthTokenCookie(name: string) {
  return /^(sb-.*-auth-token)(?:\.\d+)?$/.test(name) || name === AUTH_COOKIE;
}

function parsePortal(value: unknown): LoginPortal {
  if (value === "mechanic" || value === "dispatcher" || value === "admin") return value;
  return "admin";
}

function portalRoleError(portal: LoginPortal) {
  if (portal === "mechanic") return "This login is for Mechanics only.";
  if (portal === "dispatcher") return "This login is for Dispatchers only.";
  return "You do not have access to this portal.";
}

async function fetchStaffRow(
  admin: NonNullable<ReturnType<typeof getSupabaseAdmin>>,
  column: "id" | "auth_user_id" | "email",
  value: string,
) {
  const withIds = await admin.from("staff").select("role, role_ids").eq(column, value).maybeSingle();
  if (!withIds.error && withIds.data) return withIds.data;
  if (withIds.error?.message?.toLowerCase().includes("role_ids")) {
    const legacy = await admin.from("staff").select("role").eq(column, value).maybeSingle();
    if (!legacy.error && legacy.data) return legacy.data;
  }
  return null;
}

async function loadStaffRoleIds(userId: string, email: string): Promise<string[]> {
  const admin = getSupabaseAdmin();
  if (!admin) return [];

  try {
    const row =
      (await fetchStaffRow(admin, "id", userId)) ||
      (await fetchStaffRow(admin, "auth_user_id", userId)) ||
      (await fetchStaffRow(admin, "email", email));
    if (!row) return [];
    return normalizeRoleIds((row as { role_ids?: string[] }).role_ids, (row as { role?: string }).role);
  } catch {
    /* admin key may be unverifiable */
  }
  return [];
}

function portalAllowsRoles(portal: LoginPortal, roleIds: string[]) {
  if (portal === "admin") return true;
  return roleIds.includes(portal);
}

function rejectedPortalResponse(portal: LoginPortal, cookieNames: string[]) {
  const response = NextResponse.json({ error: portalRoleError(portal) }, { status: 403 });
  for (const name of cookieNames) {
    response.cookies.set(name, "", { path: "/", maxAge: 0 });
  }
  return response;
}

/** Last write wins so clears queued before sign-in cannot wipe the new session cookies. */
function applyPendingCookies(response: NextResponse, pending: PendingCookie[]) {
  const latest = new Map<string, PendingCookie>();
  for (const cookie of pending) latest.set(cookie.name, cookie);
  for (const { name, value, options } of latest.values()) {
    response.cookies.set(name, value, {
      path: "/",
      sameSite: "lax",
      ...options,
    });
  }
}

export async function POST(req: Request) {
  const body = await req.json();
  const portal = parsePortal(body.portal);

  if (isSupabaseAuthConfigured()) {
    const email = (body.email ?? body.username ?? "").trim().toLowerCase();
    const password = body.password ?? "";
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }
    if (!isAllowedAdminEmail(email)) {
      await runWithAuditContext(auditContextFromRequest(req, { email, kind: "anonymous" }), async () => {
        await auditAuthEvent({
          action: "login_denied",
          description: `Staff login denied for ${email} (domain not allowed)`,
          status: "denied",
          actorEmail: email,
          actorKind: "anonymous",
          page: `/admin/login`,
          metadata: { portal },
        });
      });
      return NextResponse.json(
        { error: "Only @mortonsmechanical.com accounts can access this portal." },
        { status: 403 },
      );
    }

    const url = getSupabaseUrl();
    const key = getPublishableKey();
    if (!url || !key) {
      return NextResponse.json({ error: "Auth is not configured." }, { status: 500 });
    }

    const cookieStore = await cookies();
    const pendingCookies: PendingCookie[] = [];

    // Queue clears for stale auth cookies (applied on the response only).
    // Do not mutate the request cookie store mid-flight — that can drop the new session.
    for (const cookie of cookieStore.getAll()) {
      if (!isAuthTokenCookie(cookie.name)) continue;
      pendingCookies.push({ name: cookie.name, value: "", options: { path: "/", maxAge: 0 } });
    }

    const supabase = createServerClient(url, key, {
      cookies: {
        // Empty during sign-in so no unverifiable leftover JWT is attached.
        getAll() {
          return [];
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            pendingCookies.push({ name, value, options });
          });
        },
      },
    });

    // signInWithPassword persists the session via setAll — do not call setSession/getUser
    // (ES256 tokens without a JWT `kid` fail those verification paths).
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user?.email || !data.session) {
      const message = isJwtKeyError(error?.message)
        ? sanitizeAuthError(error?.message, "Sign-in failed due to an auth configuration issue.")
        : "Wrong email or password.";
      await runWithAuditContext(auditContextFromRequest(req, { email, kind: "anonymous" }), async () => {
        await auditAuthEvent({
          action: "login_failed",
          description: `Staff login failed for ${email}`,
          status: "failure",
          actorEmail: email,
          actorKind: "anonymous",
          page: `/${portal === "admin" ? "admin" : portal}/login`,
          metadata: { portal },
        });
      });
      return NextResponse.json({ error: message }, { status: 401 });
    }

    if (data.user.app_metadata?.portal === "client") {
      try {
        await supabase.auth.signOut({ scope: "local" });
      } catch {
        /* still clear cookies below */
      }
      const names = [
        ...new Set([
          ...pendingCookies.filter((c) => isAuthTokenCookie(c.name)).map((c) => c.name),
          ...cookieStore.getAll().filter((c) => isAuthTokenCookie(c.name)).map((c) => c.name),
        ]),
      ];
      const response = NextResponse.json(
        { error: "Client accounts use the customer portal at /client/login." },
        { status: 403 },
      );
      for (const name of names) {
        response.cookies.set(name, "", { path: "/", maxAge: 0 });
      }
      return response;
    }

    if (portal === "mechanic" || portal === "dispatcher") {
      const roleIds = await loadStaffRoleIds(data.user.id, data.user.email.toLowerCase());
      if (!portalAllowsRoles(portal, roleIds)) {
        try {
          await supabase.auth.signOut({ scope: "local" });
        } catch {
          /* still clear cookies below */
        }
        const names = [
          ...new Set([
            ...pendingCookies.filter((c) => isAuthTokenCookie(c.name)).map((c) => c.name),
            ...cookieStore.getAll().filter((c) => isAuthTokenCookie(c.name)).map((c) => c.name),
          ]),
        ];
        return rejectedPortalResponse(portal, names);
      }
    }

    await runWithAuditContext(
      auditContextFromRequest(req, {
        id: data.user.id,
        email: data.user.email,
        name: data.user.email.split("@")[0],
        kind: "staff",
      }),
      async () => {
        await auditAuthEvent({
          action: "login",
          description: `Staff signed in via ${portal} portal`,
          status: "success",
          actorUserId: data.user.id,
          actorEmail: data.user.email!,
          actorName: data.user.email!.split("@")[0],
          actorKind: "staff",
          page: `/${portal === "admin" ? "admin" : portal}/login`,
          metadata: { portal },
        });
      },
    );

    const response = NextResponse.json({
      user: {
        id: data.user.id,
        username: data.user.email.split("@")[0],
        email: data.user.email,
      },
    });

    applyPendingCookies(response, pendingCookies);
    return response;
  }

  if (body.action === "setup") {
    if (await isSetupComplete()) {
      return NextResponse.json({ error: "Setup already completed." }, { status: 400 });
    }
    try {
      await setupAdmin(body.username ?? "", body.password ?? "");
      const result = await login(body.username, body.password);
      if (!result) return NextResponse.json({ error: "Setup failed." }, { status: 500 });
      const res = NextResponse.json({ user: result.user });
      res.cookies.set(AUTH_COOKIE, result.token, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 7 });
      return res;
    } catch (err) {
      return NextResponse.json({ error: err instanceof Error ? err.message : "Setup failed." }, { status: 400 });
    }
  }

  const result = await login(body.username ?? "", body.password ?? "");
  if (!result) return NextResponse.json({ error: "Wrong username or password." }, { status: 401 });

  if (portal === "mechanic" || portal === "dispatcher") {
    const role = (result.user as { role?: string }).role ?? "owner";
    if (!portalAllowsRoles(portal, normalizeRoleIds(undefined, role))) {
      return NextResponse.json({ error: portalRoleError(portal) }, { status: 403 });
    }
  }

  const res = NextResponse.json({ user: result.user });
  res.cookies.set(AUTH_COOKIE, result.token, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 7 });
  return res;
}

export async function DELETE(req: Request) {
  await runWithAuditContext(auditContextFromRequest(req, { kind: "staff" }), async () => {
    await auditAuthEvent({
      action: "logout",
      description: "Staff signed out",
      status: "success",
      actorKind: "staff",
      page: "/admin",
    });
  });

  if (isSupabaseAuthConfigured()) {
    const cookieStore = await cookies();
    const pendingCookies: PendingCookie[] = [];
    const url = getSupabaseUrl();
    const key = getPublishableKey();

    if (url && key) {
      const supabase = createServerClient(url, key, {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              pendingCookies.push({ name, value, options });
              try {
                cookieStore.set(name, value, options);
              } catch {
                /* ignore */
              }
            });
          },
        },
      });
      try {
        await supabase.auth.signOut({ scope: "local" });
      } catch {
        /* clear cookies below even if signOut fails */
      }
    }

    // Always clear auth cookies on logout.
    for (const cookie of cookieStore.getAll()) {
      if (!isAuthTokenCookie(cookie.name)) continue;
      pendingCookies.push({ name: cookie.name, value: "", options: { path: "/", maxAge: 0 } });
    }

    const response = NextResponse.json({ ok: true });
    for (const { name, value, options } of pendingCookies) {
      response.cookies.set(name, value, options);
    }
    return response;
  }

  const jar = await cookies();
  const token = jar.get(AUTH_COOKIE)?.value;
  if (token) await logout(token);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(AUTH_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}
