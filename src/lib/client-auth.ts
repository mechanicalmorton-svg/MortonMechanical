import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { AUTH_COOKIE } from "./auth";
import {
  createId,
  getCustomerByAuthUserId,
  getCustomerByEmail,
  upsertCustomer,
} from "./shop-data";
import type { Customer } from "./shop-types";
import { getSessionFromCookies, isAllowedAdminEmail } from "./supabase/server-auth";
import {
  getPublishableKey,
  getSupabaseAdmin,
  getSupabaseUrl,
  isSupabaseAuthConfigured,
} from "./supabase/server";
import { friendlyAuthAdminError } from "./staff-auth";
import { auditAuthEvent } from "./audit-instrument";
import { auditContextFromHeaders, runWithAuditContext } from "./audit-log";

export type ClientUser = {
  id: string;
  email: string;
  name: string;
  phone: string;
  customerId: string;
};

type PendingCookie = {
  name: string;
  value: string;
  options?: Parameters<NextResponse["cookies"]["set"]>[2];
};

function isAuthTokenCookie(name: string) {
  return /^(sb-.*-auth-token)(?:\.\d+)?$/.test(name) || name === AUTH_COOKIE;
}

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

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function assertClientEmailAllowed(email: string) {
  const normalized = normalizeEmail(email);
  if (!isValidEmail(normalized)) {
    throw new Error("Enter a valid email address.");
  }
  if (isAllowedAdminEmail(normalized)) {
    throw new Error("Staff emails use the staff portal. Sign in at /admin/login instead.");
  }
  return normalized;
}

async function staffExistsForAuthUser(userId: string | undefined, email: string) {
  const admin = getSupabaseAdmin();
  if (!admin) return false;
  if (userId) {
    const byId = await admin.from("staff").select("id").eq("id", userId).maybeSingle();
    if (!byId.error && byId.data) return true;
    const byAuth = await admin.from("staff").select("id").eq("auth_user_id", userId).maybeSingle();
    if (!byAuth.error && byAuth.data) return true;
  }
  const byEmail = await admin.from("staff").select("id").eq("email", email).maybeSingle();
  return Boolean(!byEmail.error && byEmail.data);
}

async function ensureCustomerForAuthUser(input: {
  authUserId: string;
  email: string;
  name: string;
  phone?: string;
}): Promise<Customer> {
  const existingByAuth = await getCustomerByAuthUserId(input.authUserId);
  if (existingByAuth) {
    const updated: Customer = {
      ...existingByAuth,
      name: input.name.trim() || existingByAuth.name,
      email: input.email,
      phone: input.phone?.trim() || existingByAuth.phone,
      authUserId: input.authUserId,
      updatedAt: new Date().toISOString(),
    };
    await upsertCustomer(updated);
    return updated;
  }

  const existingByEmail = await getCustomerByEmail(input.email);
  if (existingByEmail) {
    if (existingByEmail.authUserId && existingByEmail.authUserId !== input.authUserId) {
      throw new Error("This email is already linked to another client account.");
    }
    const linked: Customer = {
      ...existingByEmail,
      name: input.name.trim() || existingByEmail.name,
      phone: input.phone?.trim() || existingByEmail.phone,
      email: input.email,
      authUserId: input.authUserId,
      updatedAt: new Date().toISOString(),
    };
    await upsertCustomer(linked);
    return linked;
  }

  const created: Customer = {
    id: createId(),
    name: input.name.trim() || input.email.split("@")[0],
    phone: input.phone?.trim() || "",
    email: input.email,
    authUserId: input.authUserId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await upsertCustomer(created);
  return created;
}

function toClientUser(customer: Customer, authUserId: string, email: string): ClientUser {
  return {
    id: authUserId,
    email,
    name: customer.name,
    phone: customer.phone,
    customerId: customer.id,
  };
}

export async function getClientUser(): Promise<ClientUser | null> {
  if (!isSupabaseAuthConfigured()) return null;

  const session = await getSessionFromCookies();
  const token = session?.access_token ?? session?.currentSession?.access_token;
  const cookieUser = session?.user ?? session?.currentSession?.user;
  if (!token && !cookieUser?.id) return null;

  let userId = typeof cookieUser?.id === "string" ? cookieUser.id : "";
  let email = typeof cookieUser?.email === "string" ? normalizeEmail(cookieUser.email) : "";
  let fullName =
    typeof cookieUser?.user_metadata?.full_name === "string" ? cookieUser.user_metadata.full_name : "";
  let phone = typeof cookieUser?.user_metadata?.phone === "string" ? cookieUser.user_metadata.phone : "";
  let portal =
    typeof (cookieUser as { app_metadata?: { portal?: string } } | undefined)?.app_metadata?.portal === "string"
      ? (cookieUser as { app_metadata?: { portal?: string } }).app_metadata?.portal
      : undefined;

  const admin = getSupabaseAdmin();
  if (admin && (userId || token)) {
    try {
      if (!userId && token) {
        const payloadPart = token.split(".")[1];
        if (payloadPart) {
          const normalized = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
          const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
          const payload = JSON.parse(Buffer.from(padded, "base64").toString("utf8")) as {
            sub?: string;
            email?: string;
            user_metadata?: Record<string, unknown>;
            app_metadata?: { portal?: string };
          };
          if (typeof payload.sub === "string") userId = payload.sub;
          if (!email && typeof payload.email === "string") email = normalizeEmail(payload.email);
          if (!fullName && typeof payload.user_metadata?.full_name === "string") {
            fullName = payload.user_metadata.full_name;
          }
          if (!portal && typeof payload.app_metadata?.portal === "string") {
            portal = payload.app_metadata.portal;
          }
        }
      }

      if (userId) {
        const { data, error } = await admin.auth.admin.getUserById(userId);
        if (!error && data.user) {
          userId = data.user.id;
          email = normalizeEmail(data.user.email || email);
          if (typeof data.user.user_metadata?.full_name === "string") {
            fullName = data.user.user_metadata.full_name;
          }
          if (typeof data.user.user_metadata?.phone === "string") {
            phone = data.user.user_metadata.phone;
          }
          if (typeof data.user.app_metadata?.portal === "string") {
            portal = data.user.app_metadata.portal;
          }
        }
      }
    } catch {
      /* fall through with cookie claims */
    }
  }

  if (!userId || !email) return null;
  if (isAllowedAdminEmail(email) || portal === "staff") return null;

  try {
    if (await staffExistsForAuthUser(userId, email)) return null;
    let customer = await getCustomerByAuthUserId(userId);
    if (!customer) {
      // Auto-link on first portal visit if CRM row exists / create a light profile.
      customer = await ensureCustomerForAuthUser({
        authUserId: userId,
        email,
        name: fullName || email.split("@")[0],
        phone,
      });
    }
    return toClientUser(customer, userId, email);
  } catch {
    return null;
  }
}

export async function registerClientAccount(input: {
  name: string;
  email: string;
  phone?: string;
  password: string;
}) {
  if (!isSupabaseAuthConfigured()) {
    throw new Error("Client accounts require Supabase Auth to be configured.");
  }
  const name = input.name.trim();
  if (!name) throw new Error("Please enter your name.");
  const email = assertClientEmailAllowed(input.email);
  if (!input.password || input.password.length < 8) {
    throw new Error("Password must be at least 8 characters.");
  }

  const admin = getSupabaseAdmin();
  if (!admin) throw new Error("Database is not connected.");

  if (await staffExistsForAuthUser(undefined, email)) {
    throw new Error("Staff emails use the staff portal. Sign in at /admin/login instead.");
  }

  const existingCustomer = await getCustomerByEmail(email);
  if (existingCustomer?.authUserId) {
    throw new Error("An account already exists for this email. Sign in instead.");
  }

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: input.password,
    email_confirm: true,
    user_metadata: { full_name: name, phone: input.phone?.trim() || "" },
    app_metadata: { portal: "client" },
  });
  if (error || !data.user) {
    throw new Error(friendlyAuthAdminError(error?.message, "Could not create your account."));
  }

  const customer = await ensureCustomerForAuthUser({
    authUserId: data.user.id,
    email,
    name,
    phone: input.phone,
  });

  const ctx = await auditContextFromHeaders({
    id: data.user.id,
    name: customer.name,
    email,
    kind: "client",
  });
  void runWithAuditContext(ctx, () =>
    auditAuthEvent({
      action: "register",
      description: `Client registered: ${email}`,
      actorUserId: data.user.id,
      actorName: customer.name,
      actorEmail: email,
      actorKind: "client",
      page: "/client/register",
      metadata: { customerId: customer.id },
    }),
  );

  return { authUserId: data.user.id, email, customer };
}

export async function signInClient(input: {
  email: string;
  password: string;
}): Promise<NextResponse> {
  if (!isSupabaseAuthConfigured()) {
    return NextResponse.json({ error: "Client accounts require Supabase Auth to be configured." }, { status: 503 });
  }

  let email: string;
  try {
    email = assertClientEmailAllowed(input.email);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Invalid email.";
    const denied = msg.toLowerCase().includes("staff");
    const ctx = await auditContextFromHeaders({ email: normalizeEmail(input.email), kind: "anonymous" });
    void runWithAuditContext(ctx, () =>
      auditAuthEvent({
        action: denied ? "login_denied" : "login_failed",
        description: denied
          ? `Client login denied for ${normalizeEmail(input.email)} (staff email)`
          : `Client login failed: invalid email`,
        status: denied ? "denied" : "failure",
        actorEmail: normalizeEmail(input.email),
        actorKind: "anonymous",
        page: "/client/login",
      }),
    );
    return NextResponse.json({ error: msg }, { status: denied ? 403 : 400 });
  }
  const password = input.password ?? "";
  if (!password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  const url = getSupabaseUrl();
  const key = getPublishableKey();
  if (!url || !key) {
    return NextResponse.json({ error: "Auth is not configured." }, { status: 500 });
  }

  const cookieStore = await cookies();
  const pendingCookies: PendingCookie[] = [];

  for (const cookie of cookieStore.getAll()) {
    if (!isAuthTokenCookie(cookie.name)) continue;
    pendingCookies.push({ name: cookie.name, value: "", options: { path: "/", maxAge: 0 } });
  }

  const supabase = createServerClient(url, key, {
    cookies: {
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

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user?.email || !data.session) {
    const ctx = await auditContextFromHeaders({ email, kind: "anonymous" });
    void runWithAuditContext(ctx, () =>
      auditAuthEvent({
        action: "login_failed",
        description: `Client login failed for ${email}`,
        status: "failure",
        actorEmail: email,
        actorKind: "anonymous",
        page: "/client/login",
      }),
    );
    return NextResponse.json({ error: "Wrong email or password." }, { status: 401 });
  }

  const signedEmail = normalizeEmail(data.user.email);
  if (isAllowedAdminEmail(signedEmail) || (await staffExistsForAuthUser(data.user.id, signedEmail))) {
    try {
      await supabase.auth.signOut({ scope: "local" });
    } catch {
      /* clear cookies below */
    }
    const ctx = await auditContextFromHeaders({
      id: data.user.id,
      email: signedEmail,
      kind: "anonymous",
    });
    void runWithAuditContext(ctx, () =>
      auditAuthEvent({
        action: "login_denied",
        description: `Client login denied for ${signedEmail} (wrong portal)`,
        status: "denied",
        actorUserId: data.user.id,
        actorEmail: signedEmail,
        actorKind: "anonymous",
        page: "/client/login",
      }),
    );
    const response = NextResponse.json(
      { error: "Staff accounts use the staff portal at /admin/login." },
      { status: 403 },
    );
    applyPendingCookies(
      response,
      pendingCookies.map((c) => ({ ...c, value: "", options: { path: "/", maxAge: 0 } })),
    );
    return response;
  }

  try {
    const metaName =
      typeof data.user.user_metadata?.full_name === "string"
        ? data.user.user_metadata.full_name
        : signedEmail.split("@")[0];
    const metaPhone = typeof data.user.user_metadata?.phone === "string" ? data.user.user_metadata.phone : "";

    const customer = await ensureCustomerForAuthUser({
      authUserId: data.user.id,
      email: signedEmail,
      name: metaName,
      phone: metaPhone,
    });

    try {
      const admin = getSupabaseAdmin();
      if (admin && data.user.app_metadata?.portal !== "client") {
        await admin.auth.admin.updateUserById(data.user.id, {
          app_metadata: { ...data.user.app_metadata, portal: "client" },
        });
      }
    } catch {
      /* non-fatal */
    }

    const user = toClientUser(customer, data.user.id, signedEmail);
    const ctx = await auditContextFromHeaders({
      id: user.id,
      name: user.name,
      email: user.email,
      kind: "client",
    });
    void runWithAuditContext(ctx, () =>
      auditAuthEvent({
        action: "login",
        description: `Client login: ${user.email}`,
        actorUserId: user.id,
        actorName: user.name,
        actorEmail: user.email,
        actorKind: "client",
        page: "/client/login",
        metadata: { customerId: user.customerId },
      }),
    );
    const response = NextResponse.json({ user });
    applyPendingCookies(response, pendingCookies);
    return response;
  } catch (err) {
    try {
      await supabase.auth.signOut({ scope: "local" });
    } catch {
      /* ignore */
    }
    const response = NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not open your client account." },
      { status: 500 },
    );
    applyPendingCookies(
      response,
      pendingCookies.map((c) => ({ ...c, value: "", options: { path: "/", maxAge: 0 } })),
    );
    return response;
  }
}

export async function signOutClient(): Promise<NextResponse> {
  const cookieStore = await cookies();
  const pendingCookies: PendingCookie[] = [];
  const url = getSupabaseUrl();
  const key = getPublishableKey();
  let actor: ClientUser | null = null;
  try {
    actor = await getClientUser();
  } catch {
    actor = null;
  }

  if (url && key && isSupabaseAuthConfigured()) {
    const supabase = createServerClient(url, key, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            pendingCookies.push({ name, value, options });
          });
        },
      },
    });
    try {
      await supabase.auth.signOut({ scope: "local" });
    } catch {
      /* still clear cookies */
    }
  }

  for (const cookie of cookieStore.getAll()) {
    if (isAuthTokenCookie(cookie.name)) {
      pendingCookies.push({ name: cookie.name, value: "", options: { path: "/", maxAge: 0 } });
    }
  }

  const ctx = await auditContextFromHeaders(
    actor
      ? { id: actor.id, name: actor.name, email: actor.email, kind: "client" }
      : { kind: "client" },
  );
  void runWithAuditContext(ctx, () =>
    auditAuthEvent({
      action: "logout",
      description: actor ? `Client logout: ${actor.email}` : "Client logout",
      actorUserId: actor?.id,
      actorName: actor?.name,
      actorEmail: actor?.email,
      actorKind: "client",
      page: "/client",
    }),
  );

  const response = NextResponse.json({ ok: true });
  applyPendingCookies(response, pendingCookies);
  return response;
}
